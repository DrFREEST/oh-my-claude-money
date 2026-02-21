/**
 * hybrid-ultrawork.mjs - 하이브리드 울트라워크 오케스트레이터
 *
 * OMC의 ultrawork 모드에서 Claude Code와 MCP(ask_codex/ask_gemini)를 함께 활용하여
 * 토큰 사용량을 최적화하면서 병렬 처리 수행
 *
 * v4.0: OpenCode CLI 제거 → MCP-First(ask_codex/ask_gemini 직접 호출) 전환
 */

import { planParallelDistribution, getRoutingSummary } from './task-router.mjs';
import { getUsageFromCache, getUsageLevel } from '../utils/usage.mjs';
import { loadConfig } from '../utils/config.mjs';
import { buildMcpCallDescriptor } from './agent-fusion-map.mjs';
import {
  isContextLimitError,
  savePartialResult,
  compressPrompt,
  _updateStats,
} from './context-limit-handler.mjs';

// =============================================================================
// 하이브리드 울트라워크 클래스
// =============================================================================

export class HybridUltrawork {
  constructor(options = {}) {
    this.projectDir = options.projectDir || process.cwd();
    this.config = loadConfig();
    this.mcpAvailable = true; // MCP 도구는 항상 사용 가능 (직접 호출)
    this.stats = {
      claudeTasks: 0,
      mcpTasks: 0,
      totalTasks: 0,
      savedTokens: 0, // 추정 절감 토큰
    };
  }

  /**
   * 하이브리드 울트라워크 세션 시작
   */
  async start() {
    return {
      started: true,
      mcpAvailable: this.mcpAvailable,
      usage: getUsageFromCache(),
    };
  }

  /**
   * 작업 분배 및 실행 계획 생성
   * @param {Array} tasks - [{ type, prompt, priority, context }]
   * @returns {Object} 실행 계획
   */
  planExecution(tasks) {
    const distribution = planParallelDistribution(tasks);
    const summary = getRoutingSummary(distribution);

    return {
      distribution,
      summary,
      estimatedSavings: this._estimateTokenSavings(distribution),
    };
  }

  /**
   * 계획된 작업 실행
   * @param {Object} plan - planExecution()의 결과
   * @param {Object} claudeExecutor - Claude Code 작업 실행 콜백
   * @returns {Promise<Object>} 통합 결과
   */
  async executeplan(plan, claudeExecutor) {
    const { distribution } = plan;
    const results = {
      claude: [],
      mcp: [],
      errors: [],
    };

    // 병렬 실행 준비
    const claudePromises = [];
    const mcpPromises = [];

    // Claude Code 작업 실행
    for (const task of distribution.claudeTasks) {
      claudePromises.push(
        (async () => {
          try {
            const result = await claudeExecutor(task);
            this.stats.claudeTasks++;
            return { success: true, task, result };
          } catch (error) {
            // 컨텍스트 제한 감지 → MCP 폴백 시도
            if (isContextLimitError(error.message, '')) {
              _updateStats('detected');
              const taskId = task.id || `hulw-claude-${Date.now()}`;
              savePartialResult(taskId, {
                partialOutput: error.partialOutput || '',
                completionEstimate: 0,
                task,
                errorMsg: error.message,
              });

              // MCP 폴백: ask_codex/ask_gemini 디스크립터 반환
              try {
                var compressedPrompt = compressPrompt(this._buildMcpPrompt(task), { maxLength: 6000 });
                var mcpDescriptor = buildMcpCallDescriptor(task.type || 'executor', compressedPrompt, {});
                if (mcpDescriptor) {
                  this.stats.mcpTasks++;
                  _updateStats('recovered');
                  return {
                    success: true,
                    task,
                    result: mcpDescriptor,
                    recovered: true,
                    recoveryMethod: 'mcp-fallback',
                  };
                }
              } catch (fallbackErr) {
                _updateStats('failed');
              }

              results.errors.push({ task, error: error.message, contextLimitHit: true });
              return { success: false, task, error: error.message, contextLimitHit: true };
            }

            results.errors.push({ task, error: error.message });
            return { success: false, task, error: error.message };
          }
        })()
      );
    }

    // MCP 작업 실행 (ask_codex/ask_gemini 디스크립터 생성)
    if (distribution.mcpTasks && distribution.mcpTasks.length > 0) {
      var self = this;
      mcpPromises.push(
        (async () => {
          try {
            var descriptors = distribution.mcpTasks.map(function(task) {
              var prompt = self._buildMcpPrompt(task);
              return buildMcpCallDescriptor(task.type || 'executor', prompt, {}) || {
                mcpTool: 'ask_codex',
                agentRole: task.type || 'executor',
                prompt: prompt,
              };
            });
            self.stats.mcpTasks += descriptors.length;
            return descriptors.map(function(descriptor, index) {
              return {
                task: distribution.mcpTasks[index],
                success: true,
                result: descriptor,
                source: 'mcp',
              };
            });
          } catch (error) {
            return distribution.mcpTasks.map(function(task) {
              return {
                success: false,
                task: task,
                error: error.message,
              };
            });
          }
        })()
      );
    }

    // 모든 작업 병렬 실행
    const [claudeResults, mcpResults] = await Promise.all([
      Promise.allSettled(claudePromises),
      Promise.allSettled(mcpPromises),
    ]);

    // 결과 정리
    for (const result of claudeResults) {
      if (result.status === 'fulfilled') {
        results.claude.push(result.value);
      } else {
        results.errors.push({ error: (result.reason && result.reason.message) });
      }
    }

    for (const result of mcpResults) {
      if (result.status === 'fulfilled') {
        results.mcp.push(...(Array.isArray(result.value) ? result.value : [result.value]));
      } else {
        results.errors.push({ error: (result.reason && result.reason.message) });
      }
    }

    this.stats.totalTasks = this.stats.claudeTasks + this.stats.mcpTasks;

    return {
      results,
      stats: this.stats,
      summary: {
        total: results.claude.length + results.mcp.length,
        successful:
          results.claude.filter((r) => r.success).length + results.mcp.filter((r) => r.success).length,
        failed: results.errors.length,
      },
    };
  }

  /**
   * 단일 작업을 최적 대상으로 라우팅하여 실행
   */
  async routeAndExecute(task, claudeExecutor) {
    const plan = this.planExecution([task]);
    return this.executeplan(plan, claudeExecutor);
  }

  /**
   * MCP 프롬프트 빌드
   * @private
   */
  _buildMcpPrompt(task) {
    const parts = [];

    // 컨텍스트 추가
    if (task.context) {
      parts.push(`## Context\n${task.context}`);
    }

    // 작업 지시
    parts.push(`## Task\n${task.prompt}`);

    return parts.join('\n\n');
  }

  /**
   * 토큰 절감량 추정
   * @private
   */
  _estimateTokenSavings(distribution) {
    // 대략적인 추정 (MCP 작업당 평균 1000 토큰 절감 가정)
    const estimatedSavingsPerTask = 1000;
    const mcpTaskCount = (distribution.mcpTasks || []).length;
    const savedTokens = mcpTaskCount * estimatedSavingsPerTask;

    return {
      estimatedSavedTokens: savedTokens,
      mcpTasks: mcpTaskCount,
      claudeTasks: distribution.claudeTasks.length,
    };
  }

  /**
   * 세션 종료
   */
  async shutdown() {
    return {
      stats: this.stats,
      message: `하이브리드 울트라워크 종료: Claude ${this.stats.claudeTasks}개, MCP ${this.stats.mcpTasks}개 작업 완료`,
    };
  }
}

// =============================================================================
// 편의 함수
// =============================================================================

/**
 * 하이브리드 울트라워크 세션 생성
 */
export function createHybridUltrawork(options = {}) {
  return new HybridUltrawork(options);
}

/**
 * 작업 라우팅 정보 조회 (planning용)
 */
export function getRoutingInfo(tasks) {
  const distribution = planParallelDistribution(tasks);
  const summary = getRoutingSummary(distribution);
  const usage = getUsageFromCache();

  return {
    distribution,
    summary,
    usage,
    recommendation: getRoutingRecommendation(summary, usage),
  };
}

/**
 * 라우팅 권장사항 생성
 */
function getRoutingRecommendation(summary, usage) {
  if (!usage) {
    return '사용량 정보 없음 - 기본 라우팅 규칙 적용됩니다.';
  }

  const currentUsage = Math.max(usage.fiveHour, usage.weekly);

  if (currentUsage >= 90) {
    return `⚠️ 사용량 위험(${currentUsage}%) - 최대한 MCP(ask_codex/ask_gemini)로 위임합니다.`;
  } else if (currentUsage >= 70) {
    return `📊 사용량 높음(${currentUsage}%) - MCP ${summary.mcpPercent}% 분배`;
  } else {
    return `✅ 사용량 정상(${currentUsage}%) - 최적화된 분배 적용`;
  }
}
