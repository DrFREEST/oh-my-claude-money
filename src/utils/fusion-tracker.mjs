/**
 * fusion-tracker.mjs - Fusion 상태 추적 및 파일 저장
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getSessionDir } from './session-id.mjs';

const STATE_FILE = join(process.env.HOME || '', '.omcm', 'fusion-state.json');

/**
 * 세션별 상태 파일 경로 반환
 * @param {string|null} sessionId - 세션 ID (null이면 글로벌)
 * @returns {string} 상태 파일 경로
 */
export function getStateFile(sessionId) {
  if (sessionId) {
    const dir = getSessionDir(sessionId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return join(dir, 'fusion-state.json');
  }
  return STATE_FILE;
}

/**
 * 기본 상태
 */
function getDefaultState() {
  return {
    enabled: true,
    mode: 'balanced',
    totalTasks: 0,
    routedToOpenCode: 0,
    routingRate: 0,
    estimatedSavedTokens: 0,
    actualTokens: {
      claude: { input: 0, output: 0 },
      openai: { input: 0, output: 0 },
      gemini: { input: 0, output: 0 },
      kimi: { input: 0, output: 0 }
    },
    savingsRate: 0,
    byProvider: {
      gemini: 0,
      openai: 0,
      anthropic: 0,
      kimi: 0
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * 상태 파일 읽기
 * @param {string|null} sessionId - 세션 ID (선택적, null이면 글로벌)
 * @returns {object|null}
 */
export function readFusionState(sessionId = null) {
  const stateFile = getStateFile(sessionId);
  if (!existsSync(stateFile)) {
    return null;
  }

  try {
    const content = readFileSync(stateFile, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * 상태 파일 저장
 * @param {object} state - 저장할 상태
 * @param {string|null} sessionId - 세션 ID (선택적, null이면 글로벌)
 * @returns {void}
 */
export function writeFusionState(state, sessionId = null) {
  const stateFile = getStateFile(sessionId);
  const dir = dirname(stateFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  state.lastUpdated = new Date().toISOString();
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

/**
 * 작업 라우팅 기록
 * @param {string} target - 라우팅 대상 ('opencode' 또는 'claude')
 * @param {string} provider - 프로바이더 ('gemini', 'openai', 'anthropic', 'kimi')
 * @param {number} savedTokens - 절약된 토큰 수
 * @param {string|null} sessionId - 세션 ID (선택적)
 * @returns {object} 업데이트된 상태
 */
export function recordRouting(target, provider, savedTokens, sessionId = null) {
  let state = readFusionState(sessionId);
  if (!state) {
    state = getDefaultState();
  }

  if (!state.byProvider) {
    state.byProvider = { gemini: 0, openai: 0, anthropic: 0, kimi: 0 };
  }
  if (typeof state.byProvider.gemini !== 'number') state.byProvider.gemini = 0;
  if (typeof state.byProvider.openai !== 'number') state.byProvider.openai = 0;
  if (typeof state.byProvider.anthropic !== 'number') state.byProvider.anthropic = 0;
  if (typeof state.byProvider.kimi !== 'number') state.byProvider.kimi = 0;

  state.totalTasks++;

  if (target === 'opencode') {
    state.routedToOpenCode++;
    state.estimatedSavedTokens += (savedTokens || 0);

    if (provider === 'gemini' || provider === 'google') {
      state.byProvider.gemini++;
    } else if (provider === 'openai' || provider === 'gpt') {
      state.byProvider.openai++;
    } else if (provider === 'kimi' || provider === 'kimi-for-coding' || provider === 'moonshot') {
      state.byProvider.kimi++;
    } else if (provider === 'anthropic' || provider === 'claude') {
      state.byProvider.anthropic++;
    } else {
      state.byProvider.openai++;
    }
  } else {
    state.byProvider.anthropic++;
  }

  state.routingRate = state.totalTasks > 0
    ? Math.round((state.routedToOpenCode / state.totalTasks) * 100)
    : 0;

  writeFusionState(state, sessionId);
  return state;
}

/**
 * 모드 변경 기록
 * @param {string} mode - 퓨전 모드
 * @param {string|null} sessionId - 세션 ID (선택적)
 * @returns {object} 업데이트된 상태
 */
export function setFusionMode(mode, sessionId = null) {
  let state = readFusionState(sessionId);
  if (!state) {
    state = getDefaultState();
  }

  state.mode = mode;
  writeFusionState(state, sessionId);
  return state;
}

/**
 * 퓨전 활성화/비활성화
 * @param {boolean} enabled - 활성화 여부
 * @param {string|null} sessionId - 세션 ID (선택적)
 * @returns {object} 업데이트된 상태
 */
export function setFusionEnabled(enabled, sessionId = null) {
  let state = readFusionState(sessionId);
  if (!state) {
    state = getDefaultState();
  }

  state.enabled = enabled;
  writeFusionState(state, sessionId);
  return state;
}

/**
 * 실제 토큰 사용량 기반 절약 계산
 *
 * @param {Object} claudeTokens - { input: number, output: number }
 * @param {Object} openaiTokens - { input: number, output: number }
 * @param {Object} geminiTokens - { input: number, output: number }
 * @param {Object} kimiTokens - { input: number, output: number }
 * @param {string|null} sessionId - 세션 ID (선택적)
 * @returns {Object} 업데이트된 상태
 */
export function updateSavingsFromTokens(claudeTokens, openaiTokens, geminiTokens, kimiTokens, sessionId = null) {
  // 레거시 시그니처 호환: (claude, openai, gemini, sessionId)
  let actualSessionId = sessionId;
  let actualKimiTokens = kimiTokens;
  if (actualSessionId === null && typeof kimiTokens === 'string') {
    actualSessionId = kimiTokens;
    actualKimiTokens = null;
  }

  let state = readFusionState(actualSessionId);
  if (!state) {
    state = getDefaultState();
  }

  // 기존 상태 파일 마이그레이션: actualTokens 필드가 없으면 초기화
  if (!state.actualTokens) {
    state.actualTokens = {
      claude: { input: 0, output: 0 },
      openai: { input: 0, output: 0 },
      gemini: { input: 0, output: 0 },
      kimi: { input: 0, output: 0 }
    };
  }
  if (!state.actualTokens.claude) {
    state.actualTokens.claude = { input: 0, output: 0 };
  }
  if (!state.actualTokens.openai) {
    state.actualTokens.openai = { input: 0, output: 0 };
  }
  if (!state.actualTokens.gemini) {
    state.actualTokens.gemini = { input: 0, output: 0 };
  }
  if (!state.actualTokens.kimi) {
    state.actualTokens.kimi = { input: 0, output: 0 };
  }

  // 현재 세션 토큰으로 대체 (누적 X, 세션 값 그대로)
  // Claude: stdin에서 현재 세션 누적값
  // OpenCode: 세션 시작 이후 집계값
  state.actualTokens.claude.input = Number(claudeTokens && claudeTokens.input) || 0;
  state.actualTokens.claude.output = Number(claudeTokens && claudeTokens.output) || 0;
  state.actualTokens.openai.input = Number(openaiTokens && openaiTokens.input) || 0;
  state.actualTokens.openai.output = Number(openaiTokens && openaiTokens.output) || 0;
  state.actualTokens.gemini.input = Number(geminiTokens && geminiTokens.input) || 0;
  state.actualTokens.gemini.output = Number(geminiTokens && geminiTokens.output) || 0;
  state.actualTokens.kimi.input = Number(actualKimiTokens && actualKimiTokens.input) || 0;
  state.actualTokens.kimi.output = Number(actualKimiTokens && actualKimiTokens.output) || 0;

  // 절약 토큰 계산 (OpenCode 사용량 = Claude 대신 사용된 양)
  const totalOpenCode =
    state.actualTokens.openai.input + state.actualTokens.openai.output +
    state.actualTokens.gemini.input + state.actualTokens.gemini.output +
    state.actualTokens.kimi.input + state.actualTokens.kimi.output;

  const totalClaude =
    state.actualTokens.claude.input + state.actualTokens.claude.output;

  const total = totalClaude + totalOpenCode;

  state.estimatedSavedTokens = totalOpenCode;
  state.savingsRate = total > 0 ? Math.round((totalOpenCode / total) * 100) : 0;

  writeFusionState(state, actualSessionId);
  return state;
}

/**
 * 세션 통계 초기화 (새 세션 시작 시)
 * @param {string|null} sessionId - 세션 ID (선택적)
 * @returns {object} 초기화된 상태
 */
export function resetFusionStats(sessionId = null) {
  const state = getDefaultState();
  writeFusionState(state, sessionId);
  return state;
}

export { STATE_FILE };
