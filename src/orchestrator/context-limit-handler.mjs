/**
 * context-limit-handler.mjs - 컨텍스트 제한 복구 시스템
 *
 * 워커 에이전트가 컨텍스트 리밋에 도달했을 때:
 * 1. 부분 결과를 보존하고
 * 2. 컨텍스트 축소 후 재시도하고
 * 3. 실패 시 작업을 분할하여 재시도하는 복구 시스템
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getStateDir } from '../utils/project-root.mjs';

// =============================================================================
// 상수
// =============================================================================

const RECOVERY_SUBDIR = 'context-recovery';
const MAX_COMPRESS_RETRIES = 2;

/**
 * 컨텍스트 제한 에러 감지 패턴
 */
const CONTEXT_LIMIT_PATTERNS = [
  /context limit reached/i,
  /context window exceeded/i,
  /maximum context length/i,
  /token limit exceeded/i,
  /conversation is too long/i,
  /context_length_exceeded/i,
];

// =============================================================================
// 감지
// =============================================================================

/**
 * 에러 메시지 또는 출력에서 컨텍스트 제한 에러를 감지합니다.
 *
 * @param {string} errorMsg - 에러 메시지
 * @param {string} [output] - 작업 출력
 * @returns {boolean} 컨텍스트 제한 에러 여부
 */
export function isContextLimitError(errorMsg, output) {
  const textToCheck = [errorMsg || '', output || ''].join(' ');
  for (let i = 0; i < CONTEXT_LIMIT_PATTERNS.length; i++) {
    if (CONTEXT_LIMIT_PATTERNS[i].test(textToCheck)) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// 부분 결과 보존
// =============================================================================

/**
 * 에러 발생 전까지의 부분 결과를 추출합니다.
 *
 * @param {string} output - 전체 출력
 * @param {string} errorMsg - 에러 메시지
 * @returns {{ partialOutput: string, completionEstimate: number }} 부분 결과와 완료율 추정
 */
export function extractPartialResult(output, errorMsg) {
  const partialOutput = (output || '').trim();

  // 완료율 추정: 출력 라인 수 기반 휴리스틱
  const lines = partialOutput.split('\n').filter((l) => l.trim().length > 0);
  let completionEstimate = 0;

  if (lines.length > 0) {
    // 에러 메시지에서 진행률 추출 시도
    const progressMatch = (errorMsg || '').match(/(\d+)%/);
    if (progressMatch) {
      completionEstimate = parseInt(progressMatch[1], 10);
    } else {
      // 출력이 있으면 최소 10%는 진행된 것으로 간주
      completionEstimate = Math.min(90, Math.max(10, lines.length * 5));
    }
  }

  return {
    partialOutput,
    completionEstimate,
  };
}

/**
 * 부분 결과를 상태 파일로 저장합니다.
 *
 * @param {string} taskId - 작업 식별자
 * @param {Object} data - 저장할 데이터
 * @param {string} data.partialOutput - 부분 출력
 * @param {number} data.completionEstimate - 완료율 추정
 * @param {Object} [data.task] - 원본 작업 정보
 * @param {string} [data.errorMsg] - 에러 메시지
 * @returns {string} 저장된 파일 경로
 */
export function savePartialResult(taskId, data) {
  const stateDir = getStateDir(process.cwd());
  const recoveryDir = join(stateDir, RECOVERY_SUBDIR);

  mkdirSync(recoveryDir, { recursive: true });

  const filePath = join(recoveryDir, `${taskId}.json`);
  const record = {
    taskId,
    savedAt: new Date().toISOString(),
    partialOutput: data.partialOutput || '',
    completionEstimate: data.completionEstimate || 0,
    task: data.task || null,
    errorMsg: data.errorMsg || '',
  };

  writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
  return filePath;
}

/**
 * 저장된 부분 결과를 로드합니다.
 *
 * @param {string} taskId - 작업 식별자
 * @returns {Object|null} 저장된 데이터 또는 null
 */
export function loadPartialResult(taskId) {
  const stateDir = getStateDir(process.cwd());
  const filePath = join(stateDir, RECOVERY_SUBDIR, `${taskId}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

// =============================================================================
// 프롬프트 압축
// =============================================================================

/**
 * 프롬프트를 축소합니다.
 * - 불필요한 공백/반복 제거
 * - 이전 부분 결과를 요약으로 대체
 * - 최대 길이 제한 적용
 *
 * @param {string} prompt - 원본 프롬프트
 * @param {Object} [options] - 옵션
 * @param {number} [options.maxLength=8000] - 최대 문자 수
 * @param {string} [options.partialResult] - 포함할 부분 결과 요약
 * @returns {string} 축소된 프롬프트
 */
export function compressPrompt(prompt, options) {
  const opts = options || {};
  const maxLength = opts.maxLength || 8000;

  let compressed = prompt || '';

  // 1. 연속 빈 줄 제거 (2줄 이상 → 1줄)
  compressed = compressed.replace(/\n{3,}/g, '\n\n');

  // 2. 줄 끝 공백 제거
  compressed = compressed.replace(/[ \t]+$/gm, '');

  // 3. 코드 블록 내 주석 축약 (// 주석 라인 50% 제거)
  const codeBlockRegex = /```[\s\S]*?```/g;
  compressed = compressed.replace(codeBlockRegex, (block) => {
    const lines = block.split('\n');
    const filtered = [];
    let commentSkipCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
        commentSkipCount++;
        // 짝수번째 주석만 유지
        if (commentSkipCount % 2 === 0) {
          continue;
        }
      }
      filtered.push(lines[i]);
    }

    return filtered.join('\n');
  });

  // 4. 부분 결과 요약 삽입
  if (opts.partialResult) {
    const summary = `\n\n[이전 진행 결과 요약]\n${opts.partialResult}\n\n위 결과를 이어서 나머지 작업을 완료하세요.\n`;
    compressed = summary + compressed;
  }

  // 5. 최대 길이 제한
  if (compressed.length > maxLength) {
    // 앞부분(지시사항)과 뒷부분(최근 컨텍스트)을 보존, 중간 축약
    const headSize = Math.floor(maxLength * 0.4);
    const tailSize = Math.floor(maxLength * 0.4);
    const head = compressed.slice(0, headSize);
    const tail = compressed.slice(compressed.length - tailSize);
    const omitted = compressed.length - headSize - tailSize;

    compressed = head + `\n\n... (${omitted}자 생략) ...\n\n` + tail;
  }

  return compressed;
}

// =============================================================================
// 작업 분할
// =============================================================================

/**
 * 실패한 작업을 작은 서브태스크로 분할합니다.
 *
 * @param {Object} task - 원본 작업
 * @param {string} task.prompt - 작업 프롬프트
 * @param {Array} [task.files] - 관련 파일 목록
 * @param {string} [task.type] - 작업 유형
 * @returns {Array<Object>} 서브태스크 배열
 */
export function splitTask(task) {
  const subtasks = [];
  const prompt = task.prompt || '';
  const files = task.files || [];

  // 전략 1: 파일 기반 분할 (파일이 2개 이상)
  if (files.length >= 2) {
    // 파일을 절반으로 나눠서 2개의 서브태스크 생성
    const mid = Math.ceil(files.length / 2);
    const firstHalf = files.slice(0, mid);
    const secondHalf = files.slice(mid);

    subtasks.push({
      prompt: `다음 파일만 대상으로 작업하세요: ${firstHalf.join(', ')}\n\n${prompt}`,
      files: firstHalf,
      type: task.type,
      isSubtask: true,
      parentPrompt: prompt,
    });

    subtasks.push({
      prompt: `다음 파일만 대상으로 작업하세요: ${secondHalf.join(', ')}\n\n${prompt}`,
      files: secondHalf,
      type: task.type,
      isSubtask: true,
      parentPrompt: prompt,
    });

    return subtasks;
  }

  // 전략 2: 프롬프트 라인 기반 분할
  const lines = prompt.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length >= 4) {
    const mid = Math.ceil(lines.length / 2);
    const firstHalf = lines.slice(0, mid).join('\n');
    const secondHalf = lines.slice(mid).join('\n');

    subtasks.push({
      prompt: firstHalf,
      files: files,
      type: task.type,
      isSubtask: true,
      parentPrompt: prompt,
    });

    subtasks.push({
      prompt: secondHalf,
      files: files,
      type: task.type,
      isSubtask: true,
      parentPrompt: prompt,
    });

    return subtasks;
  }

  // 분할 불가: 원본 반환 (축소만 적용)
  subtasks.push({
    prompt: compressPrompt(prompt, { maxLength: 4000 }),
    files: files,
    type: task.type,
    isSubtask: true,
    parentPrompt: prompt,
  });

  return subtasks;
}

// =============================================================================
// 복구 오케스트레이션
// =============================================================================

/**
 * 컨텍스트 제한 복구를 시도합니다.
 *
 * @param {Object} failed - 실패 정보
 * @param {Object} failed.task - 실패한 작업
 * @param {string} failed.errorMsg - 에러 메시지
 * @param {string} [failed.output] - 부분 출력
 * @param {Function} execFn - 작업 실행 함수 (task) => Promise<result>
 * @param {Object} [opts] - 옵션
 * @param {number} [opts.maxRetries=2] - 최대 압축 재시도 횟수
 * @returns {Promise<Object>} 복구 결과
 */
export async function attemptContextLimitRecovery(failed, execFn, opts) {
  const options = opts || {};
  const maxRetries = options.maxRetries || MAX_COMPRESS_RETRIES;
  const task = failed.task;
  const taskId = task.id || `recovery-${Date.now()}`;

  // 1. 부분 결과 보존
  const partial = extractPartialResult(failed.output, failed.errorMsg);
  savePartialResult(taskId, {
    ...partial,
    task: task,
    errorMsg: failed.errorMsg,
  });

  // 2. Phase 1: 프롬프트 축소 + 재시도
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const compressionRatio = 0.6 - attempt * 0.15; // 60%, 45%
    const maxLength = Math.floor((task.prompt || '').length * compressionRatio);

    const compressedPrompt = compressPrompt(task.prompt, {
      maxLength: Math.max(maxLength, 2000),
      partialResult: partial.partialOutput
        ? partial.partialOutput.slice(0, 500)
        : undefined,
    });

    const retryTask = {
      ...task,
      prompt: compressedPrompt,
      _recoveryAttempt: attempt + 1,
      _recoveryPhase: 'compress',
    };

    try {
      const result = await execFn(retryTask);

      // 성공: 부분 결과와 새 결과 병합
      return {
        recovered: true,
        recoveryMethod: 'compress-retry',
        attempts: attempt + 1,
        result: _mergeResults(partial.partialOutput, result),
        partialPreserved: true,
      };
    } catch (retryError) {
      // 같은 컨텍스트 에러면 다음 시도
      if (!isContextLimitError(retryError.message, '')) {
        // 다른 에러면 복구 포기
        return {
          recovered: false,
          recoveryMethod: 'compress-retry',
          attempts: attempt + 1,
          error: retryError.message,
          partialOutput: partial.partialOutput,
          partialPreserved: true,
        };
      }
    }
  }

  // 3. Phase 2: 작업 분할 + 개별 실행
  const subtasks = splitTask(task);

  if (subtasks.length > 1) {
    const subtaskResults = [];
    let allSuccess = true;

    for (let i = 0; i < subtasks.length; i++) {
      try {
        const subResult = await execFn(subtasks[i]);
        subtaskResults.push(subResult);
      } catch (subError) {
        allSuccess = false;
        subtaskResults.push({
          success: false,
          error: subError.message,
        });
      }
    }

    if (allSuccess || subtaskResults.some((r) => r && r.success !== false)) {
      // 하나라도 성공하면 부분 성공으로 간주
      const mergedOutput = subtaskResults
        .map((r) => {
          if (typeof r === 'string') return r;
          if (r && r.output) return r.output;
          if (r && r.result) return typeof r.result === 'string' ? r.result : JSON.stringify(r.result);
          return '';
        })
        .filter((s) => s.length > 0)
        .join('\n\n---\n\n');

      return {
        recovered: true,
        recoveryMethod: 'split-tasks',
        subtaskCount: subtasks.length,
        result: _mergeResults(partial.partialOutput, mergedOutput),
        partialPreserved: true,
      };
    }
  }

  // 4. 모든 복구 실패 → 부분 결과만이라도 반환
  return {
    recovered: false,
    recoveryMethod: 'exhausted',
    error: '모든 복구 전략이 실패했습니다',
    partialOutput: partial.partialOutput,
    completionEstimate: partial.completionEstimate,
    partialPreserved: partial.partialOutput.length > 0,
  };
}

// =============================================================================
// 통계
// =============================================================================

/**
 * 복구 통계를 반환합니다. (인메모리)
 *
 * @returns {Object} 통계 객체
 */
const _stats = { detected: 0, recovered: 0, failed: 0 };

export function getRecoveryStats() {
  return { ..._stats };
}

/**
 * 통계 업데이트 (내부용)
 *
 * @param {'detected'|'recovered'|'failed'} key
 */
export function _updateStats(key) {
  if (_stats[key] !== undefined) {
    _stats[key]++;
  }
}

// =============================================================================
// 내부 헬퍼
// =============================================================================

/**
 * 부분 결과와 새 결과를 병합합니다.
 *
 * @param {string} partialOutput - 이전 부분 결과
 * @param {*} newResult - 새 결과
 * @returns {*} 병합된 결과
 */
function _mergeResults(partialOutput, newResult) {
  if (!partialOutput) {
    return newResult;
  }

  // 새 결과가 문자열이면 연결
  if (typeof newResult === 'string') {
    return partialOutput + '\n\n' + newResult;
  }

  // 새 결과가 객체이고 output 필드가 있으면
  if (newResult && typeof newResult === 'object') {
    const output = newResult.output || newResult.result || '';
    if (typeof output === 'string') {
      return {
        ...newResult,
        output: partialOutput + '\n\n' + output,
        _mergedWithPartial: true,
      };
    }
    return {
      ...newResult,
      _partialOutput: partialOutput,
      _mergedWithPartial: true,
    };
  }

  return newResult;
}

// =============================================================================
// 기본 내보내기
// =============================================================================

export default {
  isContextLimitError,
  extractPartialResult,
  savePartialResult,
  loadPartialResult,
  compressPrompt,
  splitTask,
  attemptContextLimitRecovery,
  getRecoveryStats,
  CONTEXT_LIMIT_PATTERNS,
};
