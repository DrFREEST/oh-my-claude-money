/**
 * fusion-orchestrator.mjs - OMC ↔ MCP 퓨전 오케스트레이터
 *
 * 메인 오케스트레이터가 OMC와 MCP(ask_codex/ask_gemini)를 통합 관리하여
 * Claude 토큰 사용량을 최적화하면서 작업 품질 유지
 *
 * v4.0: OpenCode CLI 제거 → MCP-First(ask_codex/ask_gemini 직접 호출) 전환
 */

import { FUSION_MAP, getFusionInfo, getTokenSavingAgents, estimateBatchSavings, buildMcpCallDescriptor } from './agent-fusion-map.mjs';
import { getUsageFromCache, getUsageLevel, checkThreshold } from '../utils/usage.mjs';
import { loadConfig } from '../utils/config.mjs';
import { recordRouting, setFusionMode as updateFusionMode } from '../utils/fusion-tracker.mjs';
import { getFallbackOrchestrator } from './fallback-orchestrator.mjs';
import { recordGeminiRequest } from '../utils/provider-limits.mjs';

// =============================================================================
// 퓨전 오케스트레이터
// =============================================================================

export class FusionOrchestrator {
  constructor(options = {}) {
    this.projectDir = options.projectDir || process.cwd();
    this.config = loadConfig();
    this.mcpAvailable = true; // MCP 도구는 항상 사용 가능 (직접 호출)
    this.fallbackOrchestrator = null;
    this.mode = 'balanced'; // 'save-tokens' | 'balanced' | 'quality-first'
    this.stats = {
      totalTasks: 0,
      omcTasks: 0,
      mcpTasks: 0,
      estimatedSavedTokens: 0,
      byAgent: {},
    };
  }

  /**
   * 오케스트레이터 초기화
   */
  async initialize() {
    const usage = getUsageFromCache();
    const usageLevel = getUsageLevel();

    // 사용량에 따른 자동 모드 설정
    if (usageLevel === 'critical') {
      this.mode = 'save-tokens';
    } else if (usageLevel === 'warning') {
      this.mode = 'balanced';
    } else {
      this.mode = 'quality-first';
    }

    // Fallback 오케스트레이터 초기화
    try {
      this.fallbackOrchestrator = getFallbackOrchestrator();
    } catch (e) {
      this.fallbackOrchestrator = null;
    }

    return {
      initialized: true,
      mode: this.mode,
      mcpAvailable: this.mcpAvailable,
      fallbackAvailable: this.fallbackOrchestrator !== null,
      usage: usage,
      usageLevel: usageLevel,
      tokenSavingAgents: getTokenSavingAgents(),
    };
  }

  /**
   * 모드 변경
   * @param {'save-tokens' | 'balanced' | 'quality-first'} mode
   */
  setMode(mode) {
    this.mode = mode;
    updateFusionMode(mode);
    return { mode: this.mode };
  }

  /**
   * 단일 작업 라우팅 결정
   * @param {Object} task - { type: 'architect', prompt: '...', priority: 1 }
   * @returns {Object} 라우팅 결정
   */
  routeTask(task) {
    const fusion = getFusionInfo(task.type);
    const usage = getUsageFromCache();
    const currentUsage = usage ? Math.max(usage.fiveHour, usage.weekly) : 0;

    // 퓨전 정보 없으면 OMC 기본
    if (!fusion) {
      return {
        target: 'omc',
        agent: task.type,
        reason: '퓨전 매핑 없음, OMC 기본 사용',
        savesTokens: false,
      };
    }

    // 모드별 라우팅 전략
    switch (this.mode) {
      case 'save-tokens':
        // 토큰 절약 모드: 가능하면 무조건 MCP
        if (fusion.model.savesClaudeTokens) {
          return {
            target: 'mcp',
            agent: task.type,
            mcpTool: this._getMcpTool(fusion),
            reason: `토큰 절약 모드: ${fusion.reason}`,
            savesTokens: true,
          };
        }
        // 절약 안 되어도 MCP 우선 (사용량 분산)
        if (!fusion.fallbackToOMC || currentUsage > 80) {
          return {
            target: 'mcp',
            agent: task.type,
            mcpTool: this._getMcpTool(fusion),
            reason: '사용량 분산',
            savesTokens: false,
          };
        }
        break;

      case 'balanced':
        // 균형 모드: 토큰 절약 + 품질 고려
        if (fusion.model.savesClaudeTokens && !fusion.fallbackToOMC) {
          return {
            target: 'mcp',
            agent: task.type,
            mcpTool: this._getMcpTool(fusion),
            reason: `균형 모드: ${fusion.reason}`,
            savesTokens: true,
          };
        }
        // 사용량 높으면 MCP
        if (currentUsage > 70 && !fusion.fallbackToOMC) {
          return {
            target: 'mcp',
            agent: task.type,
            mcpTool: this._getMcpTool(fusion),
            reason: `사용량 ${currentUsage}%, MCP 우선`,
            savesTokens: fusion.model.savesClaudeTokens,
          };
        }
        break;

      case 'quality-first':
        // 품질 우선 모드: fallbackToOMC면 OMC 사용
        if (fusion.fallbackToOMC) {
          return {
            target: 'omc',
            agent: task.type,
            reason: '품질 우선 모드',
            savesTokens: false,
          };
        }
        // 토큰 절약 가능하면 MCP
        if (fusion.model.savesClaudeTokens) {
          return {
            target: 'mcp',
            agent: task.type,
            mcpTool: this._getMcpTool(fusion),
            reason: `품질 동등 + 토큰 절약: ${fusion.reason}`,
            savesTokens: true,
          };
        }
        break;
    }

    // 기본: OMC 사용
    return {
      target: 'omc',
      agent: task.type,
      reason: '기본 OMC 사용',
      savesTokens: false,
    };
  }

  /**
   * 작업 배치 라우팅
   * @param {Array} tasks - [{ type, prompt, priority }]
   * @returns {Object} { omcTasks, mcpTasks, stats }
   */
  routeBatch(tasks) {
    const omcTasks = [];
    const mcpTasks = [];

    for (const task of tasks) {
      const routing = this.routeTask(task);

      if (routing.target === 'mcp') {
        mcpTasks.push({
          ...task,
          routing,
        });
      } else {
        omcTasks.push({
          ...task,
          routing,
        });
      }
    }

    const savings = estimateBatchSavings(tasks);

    return {
      omcTasks,
      mcpTasks,
      summary: {
        total: tasks.length,
        omc: omcTasks.length,
        mcp: mcpTasks.length,
        omcPercent: Math.round((omcTasks.length / tasks.length) * 100),
        mcpPercent: Math.round((mcpTasks.length / tasks.length) * 100),
      },
      savings,
    };
  }

  /**
   * 작업 실행
   * @param {Object} task - 단일 작업
   * @param {Function} omcExecutor - OMC 작업 실행 함수
   * @returns {Promise<Object>} 실행 결과
   */
  async executeTask(task, omcExecutor) {
    const routing = this.routeTask(task);

    this.stats.totalTasks++;
    this.stats.byAgent[task.type] = (this.stats.byAgent[task.type] || 0) + 1;

    if (routing.target === 'mcp') {
      this.stats.mcpTasks++;
      if (routing.savesTokens) {
        this.stats.estimatedSavedTokens += task.estimatedTokens || 1000;
      }

      // Record to fusion state file for HUD
      var provider = this._getProviderFromAgent(task.type);
      recordRouting('mcp', provider, task.estimatedTokens || 1000);

      // MCP-First: ask_codex/ask_gemini 호출 디스크립터 반환
      // 실제 MCP 호출은 호출 측(Claude)이 수행
      var mcpDescriptor = buildMcpCallDescriptor(task.type, task.prompt || '', {});

      return {
        task,
        routing,
        result: mcpDescriptor,
        source: 'mcp',
      };
    } else {
      this.stats.omcTasks++;

      // Record to fusion state file for HUD
      recordRouting('omc', 'anthropic', 0);

      // OMC 실행 (콜백)
      const result = await omcExecutor(task);

      return {
        task,
        routing,
        result,
        source: 'omc',
      };
    }
  }

  /**
   * 배치 실행 (병렬)
   */
  async executeBatch(tasks, omcExecutor) {
    const { omcTasks, mcpTasks, summary, savings } = this.routeBatch(tasks);
    const results = [];

    // 병렬 실행
    const promises = [];

    // OMC 작업
    for (const task of omcTasks) {
      promises.push(
        this.executeTask(task, omcExecutor).catch((e) => ({
          task,
          error: e.message,
          source: 'omc',
        }))
      );
    }

    // MCP 작업
    for (const task of mcpTasks) {
      promises.push(
        this.executeTask(task, omcExecutor).catch((e) => ({
          task,
          error: e.message,
          source: 'mcp',
        }))
      );
    }

    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const errorMsg = result.reason && result.reason.message ? result.reason.message : 'Unknown error';
        results.push({ error: errorMsg });
      }
    }

    return {
      results,
      summary,
      savings,
      stats: this.stats,
    };
  }

  /**
   * Get MCP tool name from fusion info
   * @private
   */
  _getMcpTool(fusion) {
    if (!fusion || !fusion.model) return 'ask_codex';
    return (fusion.model.provider === 'google') ? 'ask_gemini' : 'ask_codex';
  }

  /**
   * Get provider name from OMC agent type
   * @private
   */
  _getProviderFromAgent(agentType) {
    var fusion = FUSION_MAP[agentType];
    if (!fusion || !fusion.model) return 'unknown';

    var provider = fusion.model.provider || '';
    if (provider === 'google') return 'gemini';
    if (provider === 'openai') return 'openai';
    return 'unknown';
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      mode: this.mode,
      savingsPercent:
        this.stats.totalTasks > 0
          ? Math.round((this.stats.estimatedSavedTokens / (this.stats.totalTasks * 1000)) * 100)
          : 0,
    };
  }

  /**
   * 종료
   */
  async shutdown() {
    return {
      finalStats: this.getStats(),
      message: `퓨전 오케스트레이터 종료: OMC ${this.stats.omcTasks}개, MCP ${this.stats.mcpTasks}개, 절약 ~${this.stats.estimatedSavedTokens} 토큰`,
    };
  }
}

// =============================================================================
// 편의 함수
// =============================================================================

/**
 * 퓨전 오케스트레이터 생성
 */
export async function createFusionOrchestrator(options = {}) {
  const orchestrator = new FusionOrchestrator(options);
  await orchestrator.initialize();
  return orchestrator;
}

/**
 * 라우팅 미리보기 (실행 없이)
 */
export function previewRouting(tasks) {
  const orchestrator = new FusionOrchestrator();
  return orchestrator.routeBatch(tasks);
}

/**
 * 현재 사용량 기반 권장 모드
 */
export function getRecommendedMode() {
  const level = getUsageLevel();

  switch (level) {
    case 'critical':
      return { mode: 'save-tokens', reason: '사용량 위험 수준 - 최대 절약 권장' };
    case 'warning':
      return { mode: 'balanced', reason: '사용량 경고 - 균형 모드 권장' };
    default:
      return { mode: 'quality-first', reason: '사용량 정상 - 품질 우선 권장' };
  }
}

// =============================================================================
// Fallback-Aware Execution (폴백 인식 실행)
// =============================================================================

/**
 * 폴백을 체크하고 필요시 전환 후 작업 실행
 *
 * @param {Object} task - 실행할 작업
 * @param {Function} omcExecutor - OMC 작업 실행 함수
 * @param {FusionOrchestrator} orchestrator - 오케스트레이터 인스턴스
 * @returns {Promise<Object>} 실행 결과
 */
export async function executeWithFallbackCheck(task, omcExecutor, orchestrator) {
  // Fallback 오케스트레이터 가져오기
  const fallback = getFallbackOrchestrator();

  // 폴백 체크 및 필요시 전환
  const fallbackResult = await fallback.checkAndFallback();

  if (fallbackResult.action === 'fallback') {
    // 폴백 발생 알림
    console.error('[OMCM] Switching to ' + fallbackResult.to.name + ' (Claude limit: ' + fallbackResult.claudeLimit.max + '%)');
  } else if (fallbackResult.action === 'recover') {
    // 복구 알림
    console.error('[OMCM] Recovered to ' + fallbackResult.to.name);
  }

  // 현재 오케스트레이터 상태 확인
  const current = fallback.getCurrentOrchestrator();

  if (current.fallbackActive) {
    // 폴백 모드: MCP로 실행 (ask_codex/ask_gemini 디스크립터 반환)
    return executeViaMcp(task, current.model, orchestrator);
  } else {
    // 정상 모드: 일반 퓨전 실행
    return orchestrator.executeTask(task, omcExecutor);
  }
}

/**
 * MCP를 통해 작업 실행 (폴백 모델 사용)
 *
 * @param {Object} task - 실행할 작업
 * @param {Object} model - 사용할 모델 정보
 * @param {FusionOrchestrator} orchestrator - 오케스트레이터 인스턴스
 * @returns {Promise<Object>} 실행 결과
 */
async function executeViaMcp(task, model, orchestrator) {
  // Gemini 계열이면 ask_gemini, 그 외 ask_codex
  var mcpTool = (model.provider === 'google') ? 'ask_gemini' : 'ask_codex';

  var prompt = buildFallbackPrompt(task, model);

  // Gemini provider limit 추적
  if (model.provider === 'google') {
    var estimatedTokens = task.estimatedTokens || 500;
    recordGeminiRequest(estimatedTokens);
  }

  return {
    task,
    routing: {
      target: 'mcp',
      mcpTool: mcpTool,
      agent: model.id,
      reason: 'Fallback execution via ' + model.name,
      savesTokens: true,
    },
    result: {
      mcpTool,
      agentRole: task.type || 'executor',
      prompt,
      model: model.id,
    },
    source: 'mcp-fallback',
    fallbackModel: model,
  };
}

/**
 * 폴백 실행용 프롬프트 빌드
 */
function buildFallbackPrompt(task, model) {
  let prompt = '## Fallback Task Execution\n\n';
  prompt += '**Using Model:** ' + model.name + '\n\n';

  if (task.context) {
    prompt += '### Context\n' + task.context + '\n\n';
  }

  prompt += '### Instruction\n' + task.prompt + '\n';

  return prompt;
}

/**
 * 모든 프로바이더 리밋 상태 조회 (디버깅용)
 */
export function getProviderLimitStatus() {
  const fallback = getFallbackOrchestrator();
  return {
    fallback: fallback.getCurrentOrchestrator(),
    limits: fallback.getAllLimits(),
    chain: fallback.getFallbackChain(),
  };
}
