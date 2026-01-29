/**
 * tool-counter.mjs - 세션별 도구 호출 카운터
 *
 * Read/Bash 연속 호출 횟수 추적
 * Task 호출 시 카운터 리셋
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

var SESSIONS_DIR = join(homedir(), '.omcm', 'sessions');

/**
 * 카운터 파일 경로
 * @param {string|null} sessionId
 * @returns {string}
 */
function getCounterFile(sessionId) {
  if (sessionId) {
    return join(SESSIONS_DIR, sessionId, 'tool-counters.json');
  }
  return join(homedir(), '.omcm', 'tool-counters.json');
}

/**
 * 카운터 읽기
 * @param {string|null} sessionId
 * @returns {object} { consecutiveRead: n, consecutiveBash: n, lastTool: string }
 */
export function readCounters(sessionId) {
  var defaultCounters = { consecutiveRead: 0, consecutiveBash: 0, lastTool: '' };
  var filepath = getCounterFile(sessionId);

  if (!existsSync(filepath)) return defaultCounters;

  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return defaultCounters;
  }
}

/**
 * 카운터 저장
 * @param {string|null} sessionId
 * @param {object} counters
 */
export function writeCounters(sessionId, counters) {
  var filepath = getCounterFile(sessionId);
  var dir = sessionId ? join(SESSIONS_DIR, sessionId) : join(homedir(), '.omcm');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    writeFileSync(filepath, JSON.stringify(counters));
  } catch (e) {
    // 저장 실패 무시
  }
}

/**
 * 도구 호출 기록 및 연속 카운트 반환
 * @param {string|null} sessionId
 * @param {string} toolName - Read, Bash, Task 등
 * @returns {object} { consecutiveRead: n, consecutiveBash: n, shouldSuggestDelegation: boolean, suggestion: string|null }
 */
export function recordToolCall(sessionId, toolName) {
  var counters = readCounters(sessionId);

  // Task 호출 시 카운터 리셋
  if (toolName === 'Task') {
    counters.consecutiveRead = 0;
    counters.consecutiveBash = 0;
    counters.lastTool = 'Task';
    writeCounters(sessionId, counters);
    return { consecutiveRead: 0, consecutiveBash: 0, shouldSuggestDelegation: false, suggestion: null };
  }

  // Read 연속 카운트
  if (toolName === 'Read') {
    counters.consecutiveRead++;
    counters.consecutiveBash = 0;  // 다른 도구는 리셋
  } else if (toolName === 'Bash') {
    counters.consecutiveBash++;
    counters.consecutiveRead = 0;
  } else {
    // Read/Bash 외 도구는 카운터 유지 (Grep, Glob 등은 탐색의 일부)
  }

  counters.lastTool = toolName;
  writeCounters(sessionId, counters);

  // 위임 제안 판단
  var shouldSuggest = false;
  var suggestion = null;

  if (counters.consecutiveRead >= 5) {
    shouldSuggest = true;
    suggestion = '여러 파일을 읽고 있습니다. explore 에이전트에 위임하면 컨텍스트를 절약할 수 있습니다.';
  } else if (counters.consecutiveBash >= 3) {
    shouldSuggest = true;
    suggestion = '여러 명령을 실행하고 있습니다. Task 에이전트에 위임하면 효율적입니다.';
  }

  return {
    consecutiveRead: counters.consecutiveRead,
    consecutiveBash: counters.consecutiveBash,
    shouldSuggestDelegation: shouldSuggest,
    suggestion: suggestion
  };
}

/**
 * 카운터 초기화
 * @param {string|null} sessionId
 */
export function resetCounters(sessionId) {
  writeCounters(sessionId, { consecutiveRead: 0, consecutiveBash: 0, lastTool: '' });
}
