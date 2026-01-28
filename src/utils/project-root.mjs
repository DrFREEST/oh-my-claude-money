/**
 * project-root.mjs - 프로젝트 루트 탐지 유틸리티
 *
 * 다단계 Fallback 전략으로 프로젝트 루트를 탐지합니다:
 * 1. Git 루트 (.git 폴더)
 * 2. 프로젝트 마커 (package.json, Cargo.toml 등)
 * 3. Claude 마커 (CLAUDE.md, AGENTS.md)
 * 4. 환경변수 (PROJECT_ROOT, OMCM_ROOT)
 * 5. 글로벌 Fallback (~/.omcm/)
 */

import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

// =============================================================================
// 프로젝트 마커 정의
// =============================================================================

/**
 * 프로젝트 루트를 나타내는 마커 파일들 (우선순위 순)
 */
const PROJECT_MARKERS = [
  // Git
  '.git',

  // JavaScript/TypeScript
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',

  // Rust
  'Cargo.toml',
  'Cargo.lock',

  // Go
  'go.mod',
  'go.sum',

  // Python
  'pyproject.toml',
  'setup.py',
  'requirements.txt',
  'Pipfile',

  // Java/Kotlin
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',

  // Ruby
  'Gemfile',

  // PHP
  'composer.json',

  // .NET
  '*.csproj',
  '*.sln',

  // General
  'Makefile',
  'CMakeLists.txt',

  // Claude/AI 마커
  'CLAUDE.md',
  'AGENTS.md',
  '.claude',
];

// =============================================================================
// 핵심 함수
// =============================================================================

/**
 * 프로젝트 루트 디렉토리를 탐지합니다.
 *
 * @param {string} startDir - 탐색 시작 디렉토리 (기본: process.cwd())
 * @param {Object} options - 옵션
 * @param {boolean} options.useGlobal - 탐지 실패 시 글로벌 fallback 사용 (기본: true)
 * @param {string[]} options.additionalMarkers - 추가 마커 파일들
 * @returns {{ root: string, method: string, isGlobal: boolean }}
 */
export function findProjectRoot(startDir = process.cwd(), options = {}) {
  const { useGlobal = true, additionalMarkers = [] } = options;
  const markers = [...PROJECT_MARKERS, ...additionalMarkers];

  let dir = startDir;
  const root = '/';

  // 1. 디렉토리 트리 상향 탐색
  while (dir !== root) {
    // Git 먼저 체크 (가장 신뢰할 수 있음)
    if (existsSync(join(dir, '.git'))) {
      return { root: dir, method: 'git', isGlobal: false };
    }

    // 다른 마커 체크
    for (const marker of markers) {
      if (marker === '.git') continue; // 이미 체크함

      // 와일드카드 패턴 처리 (*.csproj 등)
      if (marker.includes('*')) {
        // 간단한 확장자 체크
        const ext = marker.replace('*', '');
        try {
          const files = readdirSync(dir);
          if (files.some(f => f.endsWith(ext))) {
            return { root: dir, method: `marker:${marker}`, isGlobal: false };
          }
        } catch {
          // 읽기 실패 시 무시
        }
      } else if (existsSync(join(dir, marker))) {
        return { root: dir, method: `marker:${marker}`, isGlobal: false };
      }
    }

    dir = dirname(dir);
  }

  // 2. 환경변수 체크
  const envRoot = process.env.PROJECT_ROOT || process.env.OMCM_ROOT || process.env.OMCM_STATE_DIR;
  if (envRoot && existsSync(envRoot)) {
    return { root: envRoot, method: 'env', isGlobal: false };
  }

  // 3. 글로벌 Fallback
  if (useGlobal) {
    const globalRoot = join(homedir(), '.omcm');
    return { root: globalRoot, method: 'global', isGlobal: true };
  }

  // 4. 시작 디렉토리 반환 (fallback 비활성화 시)
  return { root: startDir, method: 'cwd', isGlobal: false };
}

/**
 * 동기 버전의 findProjectRoot
 */
export function findProjectRootSync(startDir = process.cwd(), options = {}) {
  const { useGlobal = true, additionalMarkers = [] } = options;
  const markers = [...PROJECT_MARKERS, ...additionalMarkers];

  let dir = startDir;
  const root = '/';

  while (dir !== root) {
    for (const marker of markers) {
      // 와일드카드 패턴 무시 (동기 버전에서는 간단히 처리)
      if (marker.includes('*')) continue;

      if (existsSync(join(dir, marker))) {
        const method = marker === '.git' ? 'git' : `marker:${marker}`;
        return { root: dir, method, isGlobal: false };
      }
    }

    dir = dirname(dir);
  }

  // 환경변수 체크
  const envRoot = process.env.PROJECT_ROOT || process.env.OMCM_ROOT || process.env.OMCM_STATE_DIR;
  if (envRoot && existsSync(envRoot)) {
    return { root: envRoot, method: 'env', isGlobal: false };
  }

  // 글로벌 Fallback
  if (useGlobal) {
    const globalRoot = join(homedir(), '.omcm');
    return { root: globalRoot, method: 'global', isGlobal: true };
  }

  return { root: startDir, method: 'cwd', isGlobal: false };
}

// =============================================================================
// 상태 디렉토리 유틸리티
// =============================================================================

/**
 * 상태 파일 디렉토리를 반환합니다.
 * 프로젝트 루트를 탐지하고 .omcm/state/ 경로를 반환합니다.
 *
 * @param {string} startDir - 탐색 시작 디렉토리
 * @returns {string} 상태 디렉토리 경로
 */
export function getStateDir(startDir = process.cwd()) {
  const { root, isGlobal } = findProjectRootSync(startDir);

  if (isGlobal) {
    // 글로벌: ~/.omcm/state/
    return join(root, 'state');
  }

  // 프로젝트: {projectRoot}/.omcm/state/
  return join(root, '.omcm', 'state');
}

/**
 * 특정 상태 파일의 전체 경로를 반환합니다.
 *
 * @param {string} filename - 상태 파일명 (예: 'ultrawork-state.json')
 * @param {string} startDir - 탐색 시작 디렉토리
 * @returns {string} 상태 파일 전체 경로
 */
export function getStatePath(filename, startDir = process.cwd()) {
  return join(getStateDir(startDir), filename);
}

/**
 * 상태 디렉토리를 생성합니다 (없으면).
 *
 * @param {string} startDir - 탐색 시작 디렉토리
 * @returns {string} 생성된 상태 디렉토리 경로
 */
export function ensureStateDir(startDir = process.cwd()) {
  const stateDir = getStateDir(startDir);
  mkdirSync(stateDir, { recursive: true });
  return stateDir;
}

// =============================================================================
// 디버그/정보 함수
// =============================================================================

/**
 * 현재 프로젝트 루트 정보를 반환합니다.
 *
 * @param {string} startDir - 탐색 시작 디렉토리
 * @returns {Object} 프로젝트 루트 정보
 */
export function getProjectInfo(startDir = process.cwd()) {
  const result = findProjectRootSync(startDir);

  return {
    ...result,
    stateDir: getStateDir(startDir),
    startDir,
    home: homedir(),
  };
}

// =============================================================================
// Named export
// =============================================================================

export { PROJECT_MARKERS };

// =============================================================================
// 기본 내보내기
// =============================================================================

export default {
  findProjectRoot,
  findProjectRootSync,
  getStateDir,
  getStatePath,
  ensureStateDir,
  getProjectInfo,
  PROJECT_MARKERS,
};
