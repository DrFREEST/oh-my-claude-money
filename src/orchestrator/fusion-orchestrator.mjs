/**
 * fusion-orchestrator.mjs - OMC ↔ OpenCode 퓨전 오케스트레이터
 *
 * 메인 오케스트레이터(Opus 4.5)가 OMC와 OpenCode 에이전트를 통합 관리하여
 * Claude 토큰 사용량을 최적화하면서 작업 품질 유지
 */

import { FUSION_MAP, OPENCODE_AGENTS, getFusionInfo, getTokenSavingAgents, estimateBatchSavings } from './agent-fusion-map.mjs';
import { executeOnPool, discoverExistingServers, ServerPoolManager } from '../pool/server-pool.mjs';
import { logOpenCodeCall } from '../tracking/call-logger.mjs';
import { getSessionIdFromTty } from '../utils/session-id.mjs';
import { getUsageFromCache, getUsageLevel } from '../utils/usage.mjs';
import { loadConfig } from '../utils/config.mjs';
import { recordRouting, setFusionMode as updateFusionMode } from '../utils/fusion-tracker.mjs';
import { getFallbackOrchestrator } from './fallback-orchestrator.mjs';
import { updateOpenAILimitsFromHeaders, recordGeminiRequest } from '../utils/provider-limits.mjs';

// =============================================================================
// 퓨전 오케스트레이터
// =============================================================================

export class FusionOrchestrator {
  constructor(options = {}) {
    this.projectDir = options.projectDir || process.cwd();
    this.config = loadConfig();
    this.poolAvailable = false;
    this.fallbackOrchestrator = null;
    this.mode = 'balanced'; // 'save-tokens' | 'balanced' | 'quality-first'
    this.stats = {
      totalTasks: 0,
      omcTasks: 0,
      opencodeTasks: 0,
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

    // OpenCode 서버 풀 초기화 (REST API 기반)
    try {
      await discoverExistingServers();
      var pool = ServerPoolManager.getInstance();
      var status = pool.getStatus();
      this.poolAvailable = status.total > 0;
    } catch (e) {
      this.poolAvailable = false;
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
      opencodeAvailable: this.poolAvailable,
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

    // OpenCode 미설치면 OMC 사용
    if (!this.poolAvailable) {
      return {
        target: 'omc',
        agent: task.type,
        reason: 'OpenCode 미설치',
        savesTokens: false,
      };
    }

    // 모드별 라우팅 전략
    switch (this.mode) {
      case 'save-tokens':
        // 토큰 절약 모드: 가능하면 무조건 OpenCode
        if (fusion.savesTokens) {
          return {
            target: 'opencode',
            agent: fusion.opencode,
            reason: `토큰 절약 모드: ${fusion.reason}`,
            savesTokens: true,
          };
        }
        // 절약 안 되어도 OpenCode 우선 (사용량 분산)
        if (!fusion.fallbackToOMC || currentUsage > 80) {
          return {
            target: 'opencode',
            agent: fusion.opencode,
            reason: '사용량 분산',
            savesTokens: false,
          };
        }
        break;

      case 'balanced':
        // 균형 모드: 토큰 절약 + 품질 고려
        if (fusion.savesTokens && !fusion.fallbackToOMC) {
          return {
            target: 'opencode',
            agent: fusion.opencode,
            reason: `균형 모드: ${fusion.reason}`,
            savesTokens: true,
          };
        }
        // 사용량 높으면 OpenCode
        if (currentUsage > 70 && !fusion.fallbackToOMC) {
          return {
            target: 'opencode',
            agent: fusion.opencode,
            reason: `사용량 ${currentUsage}%, OpenCode 우선`,
            savesTokens: fusion.savesTokens,
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
        // 토큰 절약 가능하면 OpenCode
        if (fusion.savesTokens) {
          return {
            target: 'opencode',
            agent: fusion.opencode,
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
   * @returns {Object} { omcTasks, opencodeTasks, stats }
   */
  routeBatch(tasks) {
    const omcTasks = [];
    const opencodeTasks = [];

    for (const task of tasks) {
      const routing = this.routeTask(task);

      if (routing.target === 'opencode') {
        opencodeTasks.push({
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
      opencodeTasks,
      summary: {
        total: tasks.length,
        omc: omcTasks.length,
        opencode: opencodeTasks.length,
        omcPercent: Math.round((omcTasks.length / tasks.length) * 100),
        opencodePercent: Math.round((opencodeTasks.length / tasks.length) * 100),
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

    if (routing.target === 'opencode' && this.poolAvailable) {
      this.stats.opencodeTasks++;
      if (routing.savesTokens) {
        this.stats.estimatedSavedTokens += task.estimatedTokens || 1000;
      }

      // Record to fusion state file for HUD
      const provider = this._getProviderFromAgent(routing.agent);
      recordRouting('opencode', provider, task.estimatedTokens || 1000);

      // OpenCode REST API를 통한 실행
      const { providerID, modelID } = this._getOpenCodeModel(routing.agent);
      const prompt = this._buildOpenCodePrompt(task, routing);

      await discoverExistingServers();
      const result = await executeOnPool({
        prompt: prompt,
        providerID: providerID,
        modelID: modelID,
        timeout: 5 * 60 * 1000
      });

      // 실제 토큰 데이터를 세션별 로깅
      let sessionId = null;
      try { sessionId = getSessionIdFromTty(); } catch (e) {}

      if (sessionId && result.tokens) {
        logOpenCodeCall(sessionId, {
          provider: result.tokens.providerID || providerID,
          model: result.tokens.modelID || modelID,
          agent: routing.agent,
          inputTokens: result.tokens.input || 0,
          outputTokens: result.tokens.output || 0,
          reasoningTokens: result.tokens.reasoning || 0,
          cost: result.tokens.cost || 0,
          actualModelID: result.tokens.modelID || '',
          actualProviderID: result.tokens.providerID || '',
          success: result.success,
          source: 'fusion-orchestrator',
          duration: 0,
          serverPort: result.serverPort || 0
        });
      }

      return {
        task,
        routing,
        result: {
          success: result.success,
          output: result.output,
          tokens: result.tokens,
          serverPort: result.serverPort
        },
        source: 'opencode',
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
    const { omcTasks, opencodeTasks, summary, savings } = this.routeBatch(tasks);
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

    // OpenCode 작업
    for (const task of opencodeTasks) {
      promises.push(
        this.executeTask(task, omcExecutor).catch((e) => ({
          task,
          error: e.message,
          source: 'opencode',
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
   * Get provider name from OpenCode agent
   */
  _getProviderFromAgent(agentName) {
    const agent = OPENCODE_AGENTS[agentName];
    if (!agent) return 'unknown';

    const model = (agent.model || '').toLowerCase();
    if (model.includes('gemini') || model.includes('google')) {
      return 'gemini';
    }
    if (model.includes('gpt') || model.includes('openai')) {
      return 'openai';
    }
    if (model.includes('kimi') || model.includes('moonshot')) {
      return 'kimi';
    }
    if (model.includes('claude') || model.includes('anthropic')) {
      return 'anthropic';
    }
    return 'unknown';
  }

  /**
   * OpenCode 모델 정보 추출 (fusion-map → server-pool providerID/modelID)
   */
  _getOpenCodeModel(agentName) {
    const fusion = FUSION_MAP[agentName];
    if (!fusion || !fusion.model) return { providerID: 'openai', modelID: 'gpt-5.2-codex' };

    const provider = fusion.model.provider || 'openai';
    const model = fusion.model.model || 'gpt-5.2-codex';

    // provider → providerID 매핑
    const providerMap = {
      'openai': 'openai',
      'google': 'google',
      'anthropic': 'anthropic'
    };

    // model → OpenCode modelID 매핑 (opencode.json에 등록된 실제 모델명)
    const modelMap = {
      'gpt-5.2-codex': 'gpt-5.2-codex',
      'gpt-5.2': 'gpt-5.2',
      'gemini-3.0-flash': 'antigravity-gemini-3-flash',
      'claude-opus-4-5-20251101': 'claude-opus-4-5-20251101'
    };

    return {
      providerID: providerMap[provider] || 'openai',
      modelID: modelMap[model] || model
    };
  }

  /**
   * OpenCode 프롬프트 빌드
   */
  _buildOpenCodePrompt(task, routing) {
    const opencodeAgent = OPENCODE_AGENTS[routing.agent];

    let prompt = `## Task for ${routing.agent}\n\n`;

    if (task.context) {
      prompt += `### Context\n${task.context}\n\n`;
    }

    prompt += `### Instruction\n${task.prompt}\n`;

    // 에이전트 힌트
    if (opencodeAgent) {
      prompt += `\n### Agent Hint\nPrefer using ${routing.agent} (${opencodeAgent.role})`;
    }

    return prompt;
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
    // 서버풀은 글로벌 싱글톤이므로 개별 종료하지 않음

    return {
      finalStats: this.getStats(),
      message: `퓨전 오케스트레이터 종료: OMC ${this.stats.omcTasks}개, OpenCode ${this.stats.opencodeTasks}개, 절약 ~${this.stats.estimatedSavedTokens} 토큰`,
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
    // 폴백 모드: OpenCode로 실행
    return executeViaOpenCode(task, current.model, orchestrator);
  } else {
    // 정상 모드: 일반 퓨전 실행
    return orchestrator.executeTask(task, omcExecutor);
  }
}

/**
 * OpenCode를 통해 작업 실행 (폴백 모델 사용)
 *
 * @param {Object} task - 실행할 작업
 * @param {Object} model - 사용할 모델 정보
 * @param {FusionOrchestrator} orchestrator - 오케스트레이터 인스턴스
 * @returns {Promise<Object>} 실행 결과
 */
async function executeViaOpenCode(task, model, orchestrator) {
  if (!orchestrator.poolAvailable) {
    throw new Error('OpenCode not available for fallback execution');
  }

  const prompt = buildFallbackPrompt(task, model);

  // provider → providerID/modelID 변환
  var providerID = 'openai';
  var modelID = 'gpt-5.2-codex';
  if (model.provider === 'google') {
    providerID = 'google';
    modelID = 'antigravity-gemini-3-flash';
  }

  await discoverExistingServers();
  const result = await executeOnPool({
    prompt: prompt,
    providerID: providerID,
    modelID: modelID,
    timeout: 5 * 60 * 1000
  });

  // Provider limit 추적
  if (model.provider === 'openai' && result && result.tokens) {
    updateOpenAILimitsFromHeaders({});
  } else if (model.provider === 'google') {
    const estimatedTokens = task.estimatedTokens || 500;
    recordGeminiRequest(estimatedTokens);
  }

  return {
    task,
    routing: {
      target: 'opencode',
      agent: model.opencodeAgent,
      reason: 'Fallback execution via ' + model.name,
      savesTokens: true,
    },
    result: {
      success: result.success,
      output: result.output,
      tokens: result.tokens,
      serverPort: result.serverPort
    },
    source: 'opencode-fallback',
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
