/**
 * state-manager.mjs - 중앙화된 상태 관리 유틸리티
 *
 * 모든 상태 파일 읽기/쓰기를 중앙에서 관리합니다.
 * 프로젝트 루트 탐지를 통해 올바른 위치에 상태 파일을 저장합니다.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getStateDir, getStatePath, findProjectRootSync } from './project-root.mjs';

// =============================================================================
// 상태 파일 타입 정의
// =============================================================================

/**
 * 지원되는 상태 파일 타입
 */
export const STATE_FILES = {
  // 모드 상태
  ULTRAWORK: 'ultrawork-state.json',
  ULTRAPILOT: 'ultrapilot-state.json',
  RALPH: 'ralph-state.json',
  AUTOPILOT: 'autopilot-state.json',
  ECOMODE: 'ecomode-state.json',
  SWARM: 'swarm-state.json',
  TEAM: 'team-state.json', // OMC v4.2.6: ultrapilot + swarm 통합
  PIPELINE: 'pipeline-state.json',
  ULTRAQA: 'ultraqa-state.json',

  // 퓨전 상태
  FUSION: 'fusion-state.json',
  FALLBACK: 'fallback-state.json',
  PROVIDER_LIMITS: 'provider-limits.json',

  // 추적/메트릭
  METRICS: 'metrics.json',
  ROUTING_CACHE: 'routing-cache.json',

  // 컨텍스트 복구
  CONTEXT_RECOVERY: 'context-recovery',
};

// =============================================================================
// 핵심 함수
// =============================================================================

/**
 * 상태 파일을 읽습니다.
 *
 * @param {string} stateType - STATE_FILES의 키 또는 파일명
 * @param {Object} options - 옵션
 * @param {string} options.startDir - 프로젝트 루트 탐색 시작 디렉토리
 * @param {*} options.defaultValue - 파일이 없을 때 반환할 기본값
 * @param {boolean} options.global - true면 항상 글로벌 위치 사용
 * @returns {*} 상태 객체 또는 기본값
 */
export function readState(stateType, options = {}) {
  const { startDir = process.cwd(), defaultValue = null, global: useGlobal = false } = options;

  const filename = STATE_FILES[stateType] || stateType;
  const statePath = useGlobal
    ? join(homedir(), '.omcm', 'state', filename)
    : getStatePath(filename, startDir);

  try {
    if (existsSync(statePath)) {
      const content = readFileSync(statePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`[OMCM] 상태 읽기 실패: ${statePath}`, error.message);
  }

  return defaultValue;
}

/**
 * 상태 파일을 씁니다.
 *
 * @param {string} stateType - STATE_FILES의 키 또는 파일명
 * @param {*} data - 저장할 데이터
 * @param {Object} options - 옵션
 * @param {string} options.startDir - 프로젝트 루트 탐색 시작 디렉토리
 * @param {boolean} options.global - true면 항상 글로벌 위치 사용
 * @param {boolean} options.merge - true면 기존 데이터와 병합
 * @returns {string} 저장된 파일 경로
 */
export function writeState(stateType, data, options = {}) {
  const { startDir = process.cwd(), global: useGlobal = false, merge = false } = options;

  const filename = STATE_FILES[stateType] || stateType;
  const stateDir = useGlobal
    ? join(homedir(), '.omcm', 'state')
    : getStateDir(startDir);
  const statePath = join(stateDir, filename);

  try {
    // 디렉토리 생성
    mkdirSync(stateDir, { recursive: true });

    // 병합 옵션
    let finalData = data;
    if (merge) {
      const existing = readState(stateType, { startDir, global: useGlobal, defaultValue: {} });
      finalData = { ...existing, ...data };
    }

    // 타임스탬프 추가
    if (typeof finalData === 'object' && finalData !== null) {
      finalData.lastUpdated = new Date().toISOString();
    }

    writeFileSync(statePath, JSON.stringify(finalData, null, 2), 'utf-8');
    return statePath;
  } catch (error) {
    console.error(`[OMCM] 상태 쓰기 실패: ${statePath}`, error.message);
    throw error;
  }
}

/**
 * 상태 파일을 삭제합니다.
 *
 * @param {string} stateType - STATE_FILES의 키 또는 파일명
 * @param {Object} options - 옵션
 * @returns {boolean} 삭제 성공 여부
 */
export function deleteState(stateType, options = {}) {
  const { startDir = process.cwd(), global: useGlobal = false } = options;

  const filename = STATE_FILES[stateType] || stateType;
  const statePath = useGlobal
    ? join(homedir(), '.omcm', 'state', filename)
    : getStatePath(filename, startDir);

  try {
    if (existsSync(statePath)) {
      unlinkSync(statePath);
      return true;
    }
  } catch (error) {
    console.error(`[OMCM] 상태 삭제 실패: ${statePath}`, error.message);
  }

  return false;
}

/**
 * 상태 파일 존재 여부를 확인합니다.
 *
 * @param {string} stateType - STATE_FILES의 키 또는 파일명
 * @param {Object} options - 옵션
 * @returns {boolean} 존재 여부
 */
export function stateExists(stateType, options = {}) {
  const { startDir = process.cwd(), global: useGlobal = false } = options;

  const filename = STATE_FILES[stateType] || stateType;
  const statePath = useGlobal
    ? join(homedir(), '.omcm', 'state', filename)
    : getStatePath(filename, startDir);

  return existsSync(statePath);
}

// =============================================================================
// 모드 상태 헬퍼
// =============================================================================

/**
 * 활성 모드 목록을 반환합니다.
 *
 * @param {Object} options - 옵션
 * @returns {string[]} 활성 모드 이름 배열
 */
export function getActiveModes(options = {}) {
  const modeTypes = [
    'ULTRAWORK', 'ULTRAPILOT', 'RALPH', 'AUTOPILOT',
    'ECOMODE', 'SWARM', 'TEAM', 'PIPELINE', 'ULTRAQA'
  ];

  const activeModes = [];

  for (const modeType of modeTypes) {
    const state = readState(modeType, { ...options, defaultValue: null });
    if (state && state.active) {
      activeModes.push(modeType.toLowerCase());
    }
  }

  return activeModes;
}

/**
 * 모든 모드 상태를 비활성화합니다.
 *
 * @param {Object} options - 옵션
 * @returns {string[]} 비활성화된 모드 목록
 */
export function deactivateAllModes(options = {}) {
  const modeTypes = [
    'ULTRAWORK', 'ULTRAPILOT', 'RALPH', 'AUTOPILOT',
    'ECOMODE', 'SWARM', 'TEAM', 'PIPELINE', 'ULTRAQA'
  ];

  const deactivated = [];

  for (const modeType of modeTypes) {
    const state = readState(modeType, { ...options, defaultValue: null });
    if (state && state.active) {
      writeState(modeType, { ...state, active: false }, options);
      deactivated.push(modeType.toLowerCase());
    }
  }

  return deactivated;
}

// =============================================================================
// 퓨전 상태 헬퍼
// =============================================================================

/**
 * 퓨전 상태를 읽습니다. (항상 글로벌)
 *
 * @returns {Object} 퓨전 상태
 */
export function getFusionState() {
  return readState('FUSION', {
    global: true,
    defaultValue: {
      enabled: true,
      mode: 'balanced',
      totalTasks: 0,
      routedToOpenCode: 0,
      routingRate: 0,
      estimatedSavedTokens: 0,
      byProvider: { gemini: 0, openai: 0, anthropic: 0 },
    }
  });
}

/**
 * 퓨전 상태를 업데이트합니다. (항상 글로벌)
 *
 * @param {Object} updates - 업데이트할 필드
 * @returns {string} 저장된 파일 경로
 */
export function updateFusionState(updates) {
  return writeState('FUSION', updates, { global: true, merge: true });
}

/**
 * 프로바이더 사용량을 읽습니다. (항상 글로벌)
 *
 * @returns {Object} 프로바이더 사용량
 */
export function getProviderLimits() {
  return readState('PROVIDER_LIMITS', {
    global: true,
    defaultValue: {
      claude: { fiveHour: { used: 0, limit: 100, percent: 0 }, weekly: { used: 0, limit: 100, percent: 0 } },
      openai: { requests: { remaining: null, limit: null, percent: 0 } },
      gemini: { tier: 'free', rpm: { used: 0, limit: 15 } },
    }
  });
}

// =============================================================================
// 디버그/유틸리티
// =============================================================================

/**
 * 상태 디렉토리 정보를 출력합니다.
 *
 * @param {string} startDir - 탐색 시작 디렉토리
 */
export function debugStateInfo(startDir = process.cwd()) {
  const { root, method, isGlobal } = findProjectRootSync(startDir);
  const stateDir = getStateDir(startDir);
  const globalStateDir = join(homedir(), '.omcm', 'state');

  console.log('[OMCM] 상태 디렉토리 정보:');
  console.log(`  시작 디렉토리: ${startDir}`);
  console.log(`  프로젝트 루트: ${root} (${method})`);
  console.log(`  글로벌 여부: ${isGlobal}`);
  console.log(`  상태 디렉토리: ${stateDir}`);
  console.log(`  글로벌 상태: ${globalStateDir}`);
}

// =============================================================================
// 기본 내보내기
// =============================================================================

export default {
  STATE_FILES,
  readState,
  writeState,
  deleteState,
  stateExists,
  getActiveModes,
  deactivateAllModes,
  getFusionState,
  updateFusionState,
  getProviderLimits,
  debugStateInfo,
};
