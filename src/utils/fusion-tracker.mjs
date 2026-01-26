/**
 * fusion-tracker.mjs - Fusion 상태 추적 및 파일 저장
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const STATE_FILE = join(process.env.HOME || '', '.omcm', 'fusion-state.json');

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
    byProvider: {
      gemini: 0,
      openai: 0,
      anthropic: 0
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * 상태 파일 읽기
 */
export function readFusionState() {
  if (!existsSync(STATE_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * 상태 파일 저장
 */
export function writeFusionState(state) {
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  state.lastUpdated = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * 작업 라우팅 기록
 */
export function recordRouting(target, provider, savedTokens) {
  let state = readFusionState();
  if (!state) {
    state = getDefaultState();
  }

  state.totalTasks++;

  if (target === 'opencode') {
    state.routedToOpenCode++;
    state.estimatedSavedTokens += (savedTokens || 0);

    if (provider === 'gemini' || provider === 'google') {
      state.byProvider.gemini++;
    } else if (provider === 'openai' || provider === 'gpt') {
      state.byProvider.openai++;
    }
  } else {
    state.byProvider.anthropic++;
  }

  state.routingRate = state.totalTasks > 0
    ? Math.round((state.routedToOpenCode / state.totalTasks) * 100)
    : 0;

  writeFusionState(state);
  return state;
}

/**
 * 모드 변경 기록
 */
export function setFusionMode(mode) {
  let state = readFusionState();
  if (!state) {
    state = getDefaultState();
  }

  state.mode = mode;
  writeFusionState(state);
  return state;
}

/**
 * 퓨전 활성화/비활성화
 */
export function setFusionEnabled(enabled) {
  let state = readFusionState();
  if (!state) {
    state = getDefaultState();
  }

  state.enabled = enabled;
  writeFusionState(state);
  return state;
}

/**
 * 세션 통계 초기화 (새 세션 시작 시)
 */
export function resetFusionStats() {
  const state = getDefaultState();
  writeFusionState(state);
  return state;
}

export { STATE_FILE };
