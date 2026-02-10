/**
 * hybrid-ultrawork.mjs - 하이브리드 울트라워크 오케스트레이터
 *
 * OMC의 ultrawork 모드에서 Claude Code와 Codex/Gemini CLI를 함께 활용하여
 * 토큰 사용량을 최적화하면서 병렬 처리 수행
 *
 * v2.1.0: OpenCode 서버 풀 → CLI 직접 실행 전환
 */

import { planParallelDistribution, getRoutingSummary, isOpenCodeAvailable } from './task-router.mjs';
import { executeViaCLI, detectCLI } from '../executor/cli-executor.mjs';
import { getUsageFromCache, getUsageLevel } from '../utils/usage.mjs';
import { loadConfig } from '../utils/config.mjs';
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
    this.cliAvailable = false;
    this.stats = {
      claudeTasks: 0,
      opencodeTasks: 0,
      totalTasks: 0,
      savedTokens: 0, // 추정 절감 토큰
    };
  }

  /**
   * 하이브리드 울트라워크 세션 시작
   */
  async start() {
    var codexAvailable = detectCLI('codex');
    var geminiAvailable = detectCLI('gemini');
    this.cliAvailable = codexAvailable || geminiAvailable;

    return {
      started: true,
      cliAvailable: this.cliAvailable,
      codex: codexAvailable,
      gemini: geminiAvailable,
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
      opencode: [],
      errors: [],
    };

    // 병렬 실행 준비
    const claudePromises = [];
    const opencodePromises = [];

    // Claude Code 작업 실행
    for (const task of distribution.claudeTasks) {
      claudePromises.push(
        (async () => {
          try {
            const result = await claudeExecutor(task);
            this.stats.claudeTasks++;
            return { success: true, task, result };
          } catch (error) {
            // 컨텍스트 제한 감지 → OpenCode 폴백 시도
            if (isContextLimitError(error.message, '')) {
              _updateStats('detected');
              const taskId = task.id || `hulw-claude-${Date.now()}`;
              savePartialResult(taskId, {
                partialOutput: error.partialOutput || '',
                completionEstimate: 0,
                task,
                errorMsg: error.message,
              });

              // CLI 폴백
              if (this.cliAvailable) {
                try {
                  var compressed = compressPrompt(this._buildOpenCodePrompt(task), { maxLength: 6000 });
                  var fallbackResult = await executeViaCLI({
                    prompt: compressed,
                    provider: this._resolveProvider(task),
                    agent: task.opencodeAgent || 'oracle',
                    cwd: this.projectDir,
                  });
                  this.stats.opencodeTasks++;
                  _updateStats('recovered');
                  return {
                    success: true,
                    task,
                    result: fallbackResult,
                    recovered: true,
                    recoveryMethod: 'cli-fallback',
                  };
                } catch (fallbackErr) {
                  _updateStats('failed');
                  // 폴백도 실패 → 아래 기존 에러 처리
                }
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

    // CLI 작업 실행
    if (this.cliAvailable && distribution.opencodeTasks.length > 0) {
      var self = this;
      opencodePromises.push(
        (async () => {
          try {
            var cliPromises = distribution.opencodeTasks.map(function(task) {
              return executeViaCLI({
                prompt: self._buildOpenCodePrompt(task),
                provider: self._resolveProvider(task),
                agent: task.opencodeAgent || 'oracle',
                cwd: self.projectDir,
              });
            });
            var cliResults = await Promise.all(cliPromises);
            self.stats.opencodeTasks += cliResults.length;
            return cliResults.map(function(result, index) {
              return {
                task: distribution.opencodeTasks[index],
                success: result.success,
                output: result.output,
                tokens: result.tokens,
              };
            });
          } catch (error) {
            return distribution.opencodeTasks.map(function(task) {
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
    const [claudeResults, opencodeResults] = await Promise.all([
      Promise.allSettled(claudePromises),
      Promise.allSettled(opencodePromises),
    ]);

    // 결과 정리
    for (const result of claudeResults) {
      if (result.status === 'fulfilled') {
        results.claude.push(result.value);
      } else {
        results.errors.push({ error: (result.reason && result.reason.message) });
      }
    }

    for (const result of opencodeResults) {
      if (result.status === 'fulfilled') {
        results.opencode.push(...(Array.isArray(result.value) ? result.value : [result.value]));
      } else {
        results.errors.push({ error: (result.reason && result.reason.message) });
      }
    }

    this.stats.totalTasks = this.stats.claudeTasks + this.stats.opencodeTasks;

    return {
      results,
      stats: this.stats,
      summary: {
        total: results.claude.length + results.opencode.length,
        successful:
          results.claude.filter((r) => r.success).length + results.opencode.filter((r) => r.success).length,
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
   * 에이전트 기반 provider 결정
   */
  _resolveProvider(task) {
    var agent = (task.opencodeAgent || '').toLowerCase();
    if (agent.indexOf('gemini') >= 0 || agent.indexOf('flash') >= 0 || agent === 'frontend-engineer') {
      return 'google';
    }
    return 'openai';
  }

  /**
   * OpenCode 프롬프트 빌드
   */
  _buildOpenCodePrompt(task) {
    const parts = [];

    // 컨텍스트 추가
    if (task.context) {
      parts.push(`## Context\n${task.context}`);
    }

    // 작업 지시
    parts.push(`## Task\n${task.prompt}`);

    // 에이전트 힌트
    if (task.opencodeAgent) {
      parts.push(`\nPreferred agent: ${task.opencodeAgent}`);
    }

    return parts.join('\n\n');
  }

  /**
   * 토큰 절감량 추정
   */
  _estimateTokenSavings(distribution) {
    // 대략적인 추정 (OpenCode 작업당 평균 1000 토큰 절감 가정)
    const estimatedSavingsPerTask = 1000;
    const savedTokens = distribution.opencodeTasks.length * estimatedSavingsPerTask;

    return {
      estimatedSavedTokens: savedTokens,
      opencodeTasks: distribution.opencodeTasks.length,
      claudeTasks: distribution.claudeTasks.length,
    };
  }

  /**
   * 세션 종료
   */
  async shutdown() {
    return {
      stats: this.stats,
      message: `하이브리드 울트라워크 종료: Claude ${this.stats.claudeTasks}개, CLI ${this.stats.opencodeTasks}개 작업 완료`,
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
  if (!isOpenCodeAvailable()) {
    return 'OpenCode 미설치 - 모든 작업을 Claude Code로 처리합니다.';
  }

  if (!usage) {
    return '사용량 정보 없음 - 기본 라우팅 규칙 적용됩니다.';
  }

  const currentUsage = Math.max(usage.fiveHour, usage.weekly);

  if (currentUsage >= 90) {
    return `⚠️ 사용량 위험(${currentUsage}%) - 최대한 OpenCode로 위임합니다.`;
  } else if (currentUsage >= 70) {
    return `📊 사용량 높음(${currentUsage}%) - OpenCode ${summary.opencodePercent}% 분배`;
  } else {
    return `✅ 사용량 정상(${currentUsage}%) - 최적화된 분배 적용`;
  }
}
