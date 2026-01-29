/**
 * call-logger.mjs - OpenCode 호출 세션별 로깅
 *
 * fusion-router에서 OpenCode로 라우팅 시 호출 정보를 세션별로 기록
 * JSONL 형식으로 효율적 저장
 */
import { existsSync, readFileSync, mkdirSync, openSync, writeSync, closeSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSIONS_DIR = join(homedir(), '.omcm', 'sessions');

/**
 * OpenCode 호출 로깅
 * @param {string} sessionId - 세션 ID
 * @param {object} callData - 호출 데이터
 * @param {string} callData.provider - 프로바이더 (openai, gemini)
 * @param {string} callData.model - 모델 ID
 * @param {string} callData.agent - 에이전트 이름
 * @param {number} [callData.estimatedInputTokens] - 추정 입력 토큰 (레거시)
 * @param {number} [callData.estimatedOutputTokens] - 추정 출력 토큰 (레거시)
 * @param {number} [callData.inputTokens] - 실제 입력 토큰 (서버 풀 API)
 * @param {number} [callData.outputTokens] - 실제 출력 토큰 (서버 풀 API)
 * @param {number} [callData.reasoningTokens] - 추론 토큰 (서버 풀 API)
 * @param {number} [callData.cost] - 비용 (서버 풀 API)
 * @param {string} [callData.actualModelID] - 실제 사용된 모델 ID
 * @param {string} [callData.actualProviderID] - 실제 사용된 프로바이더 ID
 * @param {number} [callData.duration] - 실행 시간 (ms)
 * @param {boolean} [callData.success] - 성공 여부
 * @param {string} [callData.source] - 호출 출처 (fusion-router, direct, wrapper)
 * @param {number} [callData.serverPort] - 서버 풀 포트
 */
export function logOpenCodeCall(sessionId, callData) {
  if (!sessionId) return;

  const sessionDir = join(SESSIONS_DIR, sessionId);
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  const logFile = join(sessionDir, 'opencode-calls.jsonl');
  const entry = {
    timestamp: new Date().toISOString(),
    provider: callData.provider || 'unknown',
    model: callData.model || '',
    agent: callData.agent || '',
    // 실제 토큰 데이터 (서버 풀 HTTP API에서 획득, 우선)
    inputTokens: callData.inputTokens || callData.estimatedInputTokens || 0,
    outputTokens: callData.outputTokens || callData.estimatedOutputTokens || 0,
    reasoningTokens: callData.reasoningTokens || 0,
    cost: callData.cost || 0,
    // 실제 사용된 모델/프로바이더 (서버 응답 기준)
    actualModelID: callData.actualModelID || '',
    actualProviderID: callData.actualProviderID || '',
    // 레거시 호환
    estimatedInputTokens: callData.estimatedInputTokens || 0,
    estimatedOutputTokens: callData.estimatedOutputTokens || 0,
    duration: callData.duration || 0,
    success: callData.success !== false,
    source: callData.source || 'fusion-router',
    serverPort: callData.serverPort || 0
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    const fd = openSync(logFile, 'a');
    writeSync(fd, line);
    closeSync(fd);
  } catch (e) {
    // 로깅 실패 무시
  }
}

/**
 * 세션별 호출 조회
 * @param {string} sessionId - 세션 ID
 * @param {number} [since] - 이 시간(ms) 이후 호출만
 * @returns {object} - { openai: number, gemini: number, anthropic: number, total: number, calls: Array }
 */
export function getSessionCalls(sessionId, since) {
  const result = { openai: 0, gemini: 0, anthropic: 0, total: 0, calls: [] };
  if (!sessionId) return result;

  const logFile = join(SESSIONS_DIR, sessionId, 'opencode-calls.jsonl');
  if (!existsSync(logFile)) return result;

  try {
    const content = readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n').filter(function(l) { return l.length > 0; });

    for (var i = 0; i < lines.length; i++) {
      try {
        var entry = JSON.parse(lines[i]);

        // 시간 필터
        if (since) {
          var entryTime = new Date(entry.timestamp).getTime();
          if (entryTime < since) continue;
        }

        result.calls.push(entry);
        result.total++;

        var provider = entry.provider || '';
        if (provider === 'openai' || provider === 'gpt') {
          result.openai++;
        } else if (provider === 'gemini' || provider === 'google') {
          result.gemini++;
        } else if (provider === 'anthropic' || provider === 'claude') {
          result.anthropic++;
        }
      } catch (e) {
        // 개별 라인 파싱 실패 무시
      }
    }
  } catch (e) {
    // 파일 읽기 실패
  }

  return result;
}

/**
 * 세션별 토큰 집계
 * @param {string} sessionId - 세션 ID
 * @returns {object} - { openai: { input, output, reasoning, cost, count }, gemini: { input, output, reasoning, cost, count } }
 */
export function aggregateSessionTokens(sessionId) {
  const result = {
    openai: { input: 0, output: 0, reasoning: 0, cost: 0, count: 0 },
    gemini: { input: 0, output: 0, reasoning: 0, cost: 0, count: 0 }
  };

  if (!sessionId) return null;

  const calls = getSessionCalls(sessionId);
  if (calls.total === 0) return null;

  for (var i = 0; i < calls.calls.length; i++) {
    var call = calls.calls[i];
    var provider = call.provider || '';

    // 실제 토큰 데이터 우선, 레거시 추정값 폴백
    var inputT = call.inputTokens || call.estimatedInputTokens || 0;
    var outputT = call.outputTokens || call.estimatedOutputTokens || 0;
    var reasoningT = call.reasoningTokens || 0;
    var costT = call.cost || 0;

    if (provider === 'openai' || provider === 'gpt') {
      result.openai.input += inputT;
      result.openai.output += outputT;
      result.openai.reasoning += reasoningT;
      result.openai.cost += costT;
      result.openai.count++;
    } else if (provider === 'gemini' || provider === 'google') {
      result.gemini.input += inputT;
      result.gemini.output += outputT;
      result.gemini.reasoning += reasoningT;
      result.gemini.cost += costT;
      result.gemini.count++;
    }
  }

  return result;
}

export { SESSIONS_DIR };
