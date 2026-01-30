/**
 * parallel-executor.mjs - 병렬 작업 실행기
 *
 * 여러 작업을 병렬 또는 순차적으로 실행하는 오케스트레이터입니다.
 * OpenCode와 Claude 간 작업 분배 및 실행 전략 선택을 담당합니다.
 */

import { routeTask, planParallelDistribution } from './task-router.mjs';
import { selectStrategy, buildExecutionOptions, analyzeTask } from './execution-strategy.mjs';
import { executeOpenCode } from '../executor/opencode-executor.mjs';
import { OpenCodeServerPool, getDefaultPool, shutdownDefaultPool } from '../executor/opencode-server-pool.mjs';
import {
  isContextLimitError,
  attemptContextLimitRecovery,
  _updateStats,
} from './context-limit-handler.mjs';

// =============================================================================
// 병렬 실행 가능 여부 판단
// =============================================================================

/**
 * 작업 간 파일 충돌 검사
 *
 * @param {Array} tasks - 작업 목록
 * @returns {Object} 충돌 정보 { hasConflict: boolean, conflicts: Array }
 */
function checkFileConflicts(tasks) {
  var fileMap = {}; // 파일명 → 작업 인덱스 매핑
  var conflicts = [];

  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];
    var files = task.files || [];

    for (var j = 0; j < files.length; j++) {
      var file = files[j];

      if (fileMap[file] !== undefined) {
        // 충돌 발견
        conflicts.push({
          file: file,
          tasks: [fileMap[file], i]
        });
      } else {
        fileMap[file] = i;
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts: conflicts
  };
}

/**
 * 작업 간 의존성 검사
 *
 * @param {Array} tasks - 작업 목록
 * @returns {boolean} 의존성 존재 여부
 */
function checkDependencies(tasks) {
  // 간단한 휴리스틱: 순서 지정이 있거나 의존성 정보가 있으면 true
  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];

    if (task.dependsOn && task.dependsOn.length > 0) {
      return true;
    }

    if (task.order !== undefined && task.order !== null) {
      return true;
    }
  }

  return false;
}

/**
 * 병렬 실행 가능 여부 판단
 *
 * @param {Array} tasks - 작업 목록
 * @returns {Object} 판단 결과 { canParallel: boolean, reason: string, conflicts?: Array }
 */
export function canRunInParallel(tasks) {
  if (!tasks || tasks.length < 2) {
    return {
      canParallel: false,
      reason: '작업이 2개 미만입니다'
    };
  }

  // 1. 의존성 검사
  if (checkDependencies(tasks)) {
    return {
      canParallel: false,
      reason: '작업 간 의존성이 존재합니다'
    };
  }

  // 2. 파일 충돌 검사
  var conflictCheck = checkFileConflicts(tasks);
  if (conflictCheck.hasConflict) {
    return {
      canParallel: false,
      reason: '작업 간 파일 충돌이 존재합니다',
      conflicts: conflictCheck.conflicts
    };
  }

  // 3. 병렬 실행 가능
  return {
    canParallel: true,
    reason: '독립적인 작업들로 병렬 실행 가능합니다'
  };
}

// =============================================================================
// ParallelExecutor 클래스
// =============================================================================

/**
 * 병렬 작업 실행기
 */
export class ParallelExecutor {
  /**
   * @param {Object} options - 실행기 옵션
   * @param {number} [options.maxWorkers=3] - 최대 워커 수
   * @param {boolean} [options.autoRoute=true] - 자동 라우팅 활성화
   * @param {boolean} [options.enableServer=true] - OpenCode 서버 활성화
   * @param {Function} [options.onTaskStart] - 작업 시작 콜백
   * @param {Function} [options.onTaskComplete] - 작업 완료 콜백
   * @param {Function} [options.onError] - 오류 콜백
   */
  constructor(options) {
    options = options || {};

    this.maxWorkers = options.maxWorkers || 3;
    this.autoRoute = options.autoRoute !== false;
    this.enableServer = options.enableServer !== false;

    this.onTaskStart = options.onTaskStart;
    this.onTaskComplete = options.onTaskComplete;
    this.onError = options.onError;

    this.status = {
      running: false,
      completed: 0,
      failed: 0,
      total: 0,
      startTime: null,
      endTime: null
    };

    this.results = [];
    this.errors = [];
    this.cancelled = false;

    // 컨텍스트 제한 복구
    this.contextLimitRecovery = options.contextLimitRecovery !== false;
    this.recoveryStats = { detected: 0, recovered: 0, failed: 0 };

    // 서버 풀 (Cold boot 최소화)
    this.serverPool = null;
  }

  /**
   * 병렬 실행
   *
   * @param {Array} tasks - 작업 목록
   * @param {number} [maxWorkers] - 최대 워커 수 (기본: this.maxWorkers)
   * @returns {Promise<Object>} 실행 결과
   */
  async executeParallel(tasks, maxWorkers) {
    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        results: [],
        duration: 0
      };
    }

    maxWorkers = maxWorkers || this.maxWorkers;

    // 상태 초기화
    this.status.running = true;
    this.status.total = tasks.length;
    this.status.completed = 0;
    this.status.failed = 0;
    this.status.startTime = Date.now();
    this.results = [];
    this.errors = [];
    this.cancelled = false;

    // OpenCode 서버 풀 초기화 (필요 시)
    if (this.enableServer) {
      try {
        this.serverPool = getDefaultPool();
        await this.serverPool.initialize();
      } catch (err) {
        // 서버 풀 초기화 실패는 무시 (run 모드로 폴백)
        this.serverPool = null;
      }
    }

    // 작업 라우팅
    var routedTasks = tasks;
    if (this.autoRoute) {
      var distribution = planParallelDistribution(tasks);
      routedTasks = distribution.claudeTasks.concat(distribution.opencodeTasks);
    }

    // 워커 풀 실행
    var results = await this._executeWithPool(routedTasks, maxWorkers);

    // 상태 업데이트
    this.status.running = false;
    this.status.endTime = Date.now();

    return {
      success: this.status.failed === 0,
      results: results,
      errors: this.errors,
      stats: this.getStats(),
      duration: this.status.endTime - this.status.startTime
    };
  }

  /**
   * 순차 실행
   *
   * @param {Array} tasks - 작업 목록
   * @returns {Promise<Object>} 실행 결과
   */
  async executeSequential(tasks) {
    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        results: [],
        duration: 0
      };
    }

    // 상태 초기화
    this.status.running = true;
    this.status.total = tasks.length;
    this.status.completed = 0;
    this.status.failed = 0;
    this.status.startTime = Date.now();
    this.results = [];
    this.errors = [];
    this.cancelled = false;

    // OpenCode 서버 풀 초기화 (필요 시)
    if (this.enableServer) {
      try {
        this.serverPool = getDefaultPool();
        await this.serverPool.initialize();
      } catch (err) {
        this.serverPool = null;
      }
    }

    // 순차 실행
    var results = [];
    for (var i = 0; i < tasks.length; i++) {
      if (this.cancelled) {
        break;
      }

      var task = tasks[i];
      try {
        var result = await this.executeTask(task);
        results.push(result);
      } catch (err) {
        var errorResult = {
          success: false,
          error: err.message,
          task: task
        };
        results.push(errorResult);
        this.errors.push(errorResult);
      }
    }

    // 상태 업데이트
    this.status.running = false;
    this.status.endTime = Date.now();

    return {
      success: this.status.failed === 0,
      results: results,
      errors: this.errors,
      stats: this.getStats(),
      duration: this.status.endTime - this.status.startTime
    };
  }

  /**
   * 하이브리드 실행 (병렬 + 순차)
   *
   * 의존성이 있는 작업 그룹은 순차 실행,
   * 독립적인 작업 그룹은 병렬 실행합니다.
   *
   * @param {Array} tasks - 작업 목록
   * @returns {Promise<Object>} 실행 결과
   */
  async executeHybrid(tasks) {
    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        results: [],
        duration: 0
      };
    }

    // 작업 그룹화 (의존성 기반)
    var groups = this._groupTasksByDependency(tasks);

    // 상태 초기화
    this.status.running = true;
    this.status.total = tasks.length;
    this.status.completed = 0;
    this.status.failed = 0;
    this.status.startTime = Date.now();
    this.results = [];
    this.errors = [];
    this.cancelled = false;

    // OpenCode 서버 풀 초기화 (필요 시)
    if (this.enableServer) {
      try {
        this.serverPool = getDefaultPool();
        await this.serverPool.initialize();
      } catch (err) {
        this.serverPool = null;
      }
    }

    // 그룹별 실행 (순차)
    var allResults = [];
    for (var i = 0; i < groups.length; i++) {
      if (this.cancelled) {
        break;
      }

      var group = groups[i];

      // 그룹 내에서 병렬 실행 가능 여부 판단
      var parallelCheck = canRunInParallel(group.tasks);

      var groupResults;
      if (parallelCheck.canParallel && group.tasks.length > 1) {
        // 병렬 실행
        var parallelResult = await this._executeWithPool(group.tasks, this.maxWorkers);
        groupResults = parallelResult;
      } else {
        // 순차 실행
        groupResults = [];
        for (var j = 0; j < group.tasks.length; j++) {
          if (this.cancelled) {
            break;
          }

          var task = group.tasks[j];
          try {
            var result = await this.executeTask(task);
            groupResults.push(result);
          } catch (err) {
            var errorResult = {
              success: false,
              error: err.message,
              task: task
            };
            groupResults.push(errorResult);
            this.errors.push(errorResult);
          }
        }
      }

      allResults = allResults.concat(groupResults);
    }

    // 상태 업데이트
    this.status.running = false;
    this.status.endTime = Date.now();

    return {
      success: this.status.failed === 0,
      results: allResults,
      errors: this.errors,
      stats: this.getStats(),
      duration: this.status.endTime - this.status.startTime
    };
  }

  /**
   * 단일 작업 실행
   *
   * @param {Object} task - 작업 정보
   * @returns {Promise<Object>} 실행 결과
   */
  async executeTask(task) {
    // 작업 시작 콜백
    if (this.onTaskStart) {
      this.onTaskStart(task);
    }

    try {
      // 라우팅 결정
      var routing = routeTask(task.type || 'executor');

      var result;
      if (routing.target === 'opencode') {
        // OpenCode 실행
        result = await this._executeOpenCodeTask(task, routing);
      } else {
        // Claude 실행 (위임)
        result = await this._executeClaudeTask(task);
      }

      // 성공 처리
      this.status.completed++;
      this.results.push(result);

      if (this.onTaskComplete) {
        this.onTaskComplete(task, result);
      }

      return result;

    } catch (err) {
      // 컨텍스트 제한 복구 시도
      if (this.contextLimitRecovery && isContextLimitError(err.message, err.partialOutput)) {
        this.recoveryStats.detected++;
        _updateStats('detected');

        try {
          var self = this;
          var recoveryResult = await attemptContextLimitRecovery(
            {
              task: task,
              errorMsg: err.message,
              output: err.partialOutput || '',
            },
            function(retryTask) {
              return self._executeRetryTask(retryTask);
            }
          );

          if (recoveryResult.recovered) {
            this.recoveryStats.recovered++;
            _updateStats('recovered');
            this.status.completed++;

            var successResult = {
              success: true,
              output: recoveryResult.result,
              route: 'recovered',
              recoveryMethod: recoveryResult.recoveryMethod,
              task: task
            };

            this.results.push(successResult);

            if (this.onTaskComplete) {
              this.onTaskComplete(task, successResult);
            }

            return successResult;
          }
        } catch (recoveryErr) {
          // 복구 자체가 실패 → 아래 기존 에러 처리로 이동
        }

        this.recoveryStats.failed++;
        _updateStats('failed');
      }

      // 실패 처리
      this.status.failed++;

      var errorResult = {
        success: false,
        error: err.message,
        task: task
      };

      this.errors.push(errorResult);

      if (this.onError) {
        this.onError(task, err);
      }

      throw err;
    }
  }

  /**
   * OpenCode 작업 실행
   *
   * @private
   */
  async _executeOpenCodeTask(task, routing) {
    // 전략 선택
    var context = {
      serverRunning: this.serverPool !== null && this.serverPool.isInitialized(),
      acpAvailable: false // 현재 미지원
    };

    var strategy = selectStrategy(task, context);
    var options = buildExecutionOptions(strategy, task);

    // 전략별 실행
    var result;
    switch (strategy) {
      case 'serve':
        if (this.serverPool && this.serverPool.isInitialized()) {
          // 서버 풀을 통해 실행
          result = await this.serverPool.execute(task.prompt, options);
        } else {
          // 서버 풀 없으면 run 모드로 폴백
          result = await executeOpenCode(options);
        }
        break;

      case 'run':
      default:
        result = await executeOpenCode(options);
        break;
    }

    return {
      success: result.success || false,
      output: result.stdout || result.result || '',
      error: result.stderr || result.error,
      duration: result.duration || 0,
      route: 'opencode',
      agent: routing.agent,
      strategy: strategy
    };
  }

  /**
   * Claude 작업 실행 (위임)
   *
   * @private
   */
  async _executeClaudeTask(task) {
    // Claude로 위임하는 경우 Task tool을 통해 실행
    // 여기서는 간단히 성공 응답 반환
    return {
      success: true,
      output: 'Claude로 위임됨',
      route: 'claude',
      agent: task.type
    };
  }

  /**
   * 복구용 재시도 작업 실행
   *
   * @private
   */
  async _executeRetryTask(retryTask) {
    var routing = routeTask(retryTask.type || 'executor');

    if (routing.target === 'opencode') {
      return await this._executeOpenCodeTask(retryTask, routing);
    } else {
      return await this._executeClaudeTask(retryTask);
    }
  }

  /**
   * 워커 풀 기반 병렬 실행
   *
   * @private
   */
  async _executeWithPool(tasks, maxWorkers) {
    var queue = tasks.slice(); // 복사
    var activeWorkers = 0;
    var results = [];

    return new Promise(function(resolve, reject) {
      var self = this;

      function processNext() {
        // 취소되었으면 중단
        if (self.cancelled) {
          resolve(results);
          return;
        }

        // 큐가 비었고 워커도 없으면 완료
        if (queue.length === 0 && activeWorkers === 0) {
          resolve(results);
          return;
        }

        // 워커 슬롯이 있고 큐에 작업이 있으면 시작
        while (activeWorkers < maxWorkers && queue.length > 0) {
          var task = queue.shift();
          activeWorkers++;

          self.executeTask(task)
            .then(function(result) {
              results.push(result);
              activeWorkers--;
              processNext();
            })
            .catch(function(err) {
              results.push({
                success: false,
                error: err.message,
                task: task
              });
              activeWorkers--;
              processNext();
            });
        }
      }

      processNext();
    }.bind(this));
  }

  /**
   * 의존성 기반 작업 그룹화
   *
   * @private
   */
  _groupTasksByDependency(tasks) {
    var groups = [];
    var visited = {};

    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      var taskId = task.id || i;

      if (visited[taskId]) {
        continue;
      }

      // 의존성 있는 작업들을 하나의 그룹으로 묶음
      var group = {
        tasks: [task]
      };

      visited[taskId] = true;

      // 의존하는 작업 찾기
      if (task.dependsOn && Array.isArray(task.dependsOn)) {
        for (var j = 0; j < task.dependsOn.length; j++) {
          var depId = task.dependsOn[j];

          for (var k = 0; k < tasks.length; k++) {
            var otherTask = tasks[k];
            var otherId = otherTask.id || k;

            if (otherId === depId && !visited[otherId]) {
              group.tasks.push(otherTask);
              visited[otherId] = true;
            }
          }
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * 실행 상태 조회
   *
   * @returns {Object} 현재 상태
   */
  getStatus() {
    return {
      running: this.status.running,
      completed: this.status.completed,
      failed: this.status.failed,
      total: this.status.total,
      progress: this.status.total > 0
        ? Math.round((this.status.completed / this.status.total) * 100)
        : 0
    };
  }

  /**
   * 통계 조회
   *
   * @returns {Object} 실행 통계
   */
  getStats() {
    var duration = this.status.endTime
      ? this.status.endTime - this.status.startTime
      : Date.now() - this.status.startTime;

    return {
      total: this.status.total,
      completed: this.status.completed,
      failed: this.status.failed,
      successRate: this.status.total > 0
        ? Math.round((this.status.completed / this.status.total) * 100)
        : 0,
      duration: duration,
      avgTaskDuration: this.status.completed > 0
        ? Math.round(duration / this.status.completed)
        : 0,
      recoveryStats: this.recoveryStats
    };
  }

  /**
   * 실행 취소
   */
  cancel() {
    this.cancelled = true;
    this.status.running = false;
  }

  /**
   * 정리 (서버 풀 종료)
   */
  async cleanup() {
    if (this.enableServer && this.serverPool) {
      // 기본 풀은 shutdownDefaultPool로 종료
      await shutdownDefaultPool();
      this.serverPool = null;
    }
  }
}

// =============================================================================
// 편의 함수
// =============================================================================

/**
 * 작업 목록 병렬 실행 (간편 API)
 *
 * @param {Array} tasks - 작업 목록
 * @param {Object} options - 실행기 옵션
 * @returns {Promise<Object>} 실행 결과
 */
export async function executeParallelTasks(tasks, options) {
  var executor = new ParallelExecutor(options);
  try {
    var result = await executor.executeParallel(tasks);
    return result;
  } finally {
    await executor.cleanup();
  }
}

/**
 * 작업 목록 순차 실행 (간편 API)
 *
 * @param {Array} tasks - 작업 목록
 * @param {Object} options - 실행기 옵션
 * @returns {Promise<Object>} 실행 결과
 */
export async function executeSequentialTasks(tasks, options) {
  var executor = new ParallelExecutor(options);
  try {
    var result = await executor.executeSequential(tasks);
    return result;
  } finally {
    await executor.cleanup();
  }
}

/**
 * 작업 목록 하이브리드 실행 (간편 API)
 *
 * @param {Array} tasks - 작업 목록
 * @param {Object} options - 실행기 옵션
 * @returns {Promise<Object>} 실행 결과
 */
export async function executeHybridTasks(tasks, options) {
  var executor = new ParallelExecutor(options);
  try {
    var result = await executor.executeHybrid(tasks);
    return result;
  } finally {
    await executor.cleanup();
  }
}
