/**
 * config.mjs - 플러그인 설정 관리
 *
 * 플러그인 설정을 로드하고 관리하는 유틸리티
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

// 설정 파일 경로
export const CONFIG_DIR = join(homedir(), '.claude/plugins/omcm');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

// 기본 설정
export const DEFAULT_CONFIG = {
  // 퓨전 모드 기본값
  fusionDefault: false, // true: 항상 퓨전 모드, false: 사용량 기반 자동 전환

  // 자동 전환 설정
  threshold: 90,
  autoHandoff: false, // true: 자동 전환, false: 알림만

  // 키워드 설정
  keywords: [
    'handoff',
    '전환',
  ],

  // 하이브리드 라우팅 설정
  routing: {
    enabled: true, // 하이브리드 라우팅 활성화
    usageThreshold: 70, // 이 사용량 이상이면 MCP 분배 증가
    maxMcpWorkers: 3, // 동시 MCP 워커 수
    preferMcp: ['explore', 'dependency-expert', 'researcher', 'writer', 'document-specialist', 'style-reviewer', 'ux-researcher'], // MCP 선호 작업
    preferClaude: ['architect', 'deep-executor', 'critic', 'planner', 'debugger'], // Claude 선호 작업
    autoDelegate: true, // 자동 위임 활성화
  },

  // 컨텍스트 내보내기 설정
  context: {
    includeRecentFiles: true,
    recentFilesLimit: 10,
    includeTodos: true,
    includeDecisions: true,
    maxContextLength: 50000,
  },

  // 알림 설정
  notifications: {
    showOnThreshold: true,
    showOnKeyword: true,
    quietMode: false,
  },
};

/**
 * 설정 로드
 * @returns {Object} 설정 객체 (기본값과 병합됨)
 */
export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const userConfig = JSON.parse(content);

    // 깊은 병합
    return deepMerge(DEFAULT_CONFIG, userConfig);
  } catch (e) {
    console.error('설정 로드 실패:', e.message);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 설정 저장
 * @param {Object} config - 저장할 설정
 */
export function saveConfig(config) {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('설정 저장 실패:', e.message);
  }
}

/**
 * 특정 설정 값 가져오기
 * @param {string} key - 설정 키 (점 표기법 지원: "context.recentFilesLimit")
 * @param {any} defaultValue - 기본값
 * @returns {any} 설정 값
 */
export function getConfigValue(key, defaultValue = undefined) {
  const config = loadConfig();
  const keys = key.split('.');

  let value = config;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue;
    }
  }

  return value ?? defaultValue;
}

/**
 * 특정 설정 값 업데이트
 * @param {string} key - 설정 키
 * @param {any} value - 새 값
 */
export function setConfigValue(key, value) {
  const config = loadConfig();
  const keys = key.split('.');

  let current = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }

  current[keys[keys.length - 1]] = value;
  saveConfig(config);
}

/**
 * 깊은 객체 병합
 * @param {Object} target - 대상 객체
 * @param {Object} source - 소스 객체
 * @returns {Object} 병합된 객체
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}
