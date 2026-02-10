#!/usr/bin/env node
/**
 * session-start.mjs - 세션 시작 훅
 *
 * 세션 시작 시 사용량 정보를 로드하고 경고 메시지 표시
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// 유틸리티 로드
// =============================================================================

let getUsageLevel, getUsageSummary, loadConfig;
let generateSessionId, registerSession, cleanupOldSessions, initializeSession;

async function loadUtils() {
  try {
    const utilsPath = join(__dirname, '../utils');
    const usageModule = await import(join(utilsPath, 'usage.mjs'));
    const configModule = await import(join(utilsPath, 'config.mjs'));

    getUsageLevel = usageModule.getUsageLevel;
    getUsageSummary = usageModule.getUsageSummary;
    loadConfig = configModule.loadConfig;

    // 세션 ID 유틸리티 로드
    try {
      const sessionModule = await import(join(utilsPath, 'session-id.mjs'));
      generateSessionId = sessionModule.generateSessionId;
      registerSession = sessionModule.registerSession;
      cleanupOldSessions = sessionModule.cleanupOldSessions;
      initializeSession = sessionModule.initializeSession;
    } catch (e) {
      // 세션 ID 유틸리티 없으면 기본값
      generateSessionId = () => null;
      registerSession = () => {};
      cleanupOldSessions = () => {};
    }
  } catch (e) {
    // 기본값
    getUsageLevel = () => 'unknown';
    getUsageSummary = () => 'N/A';
    loadConfig = () => ({ notifications: { showOnThreshold: true } });
    generateSessionId = () => null;
    registerSession = () => {};
    cleanupOldSessions = () => {};
  }
}

// =============================================================================
// OMC 버전 자동 동기화
// =============================================================================

/**
 * OMC 마켓플레이스의 실제 버전을 읽어 update-check.json 자동 갱신
 * 하드코딩 방지 — source of truth는 마켓플레이스 plugin.json
 */
function syncOmcVersion() {
  try {
    const home = homedir();
    const omcPluginJson = join(home, '.claude', 'plugins', 'marketplaces', 'omc', '.claude-plugin', 'plugin.json');
    const updateCheckPath = join(home, '.claude', '.omc', 'update-check.json');

    if (!existsSync(omcPluginJson)) return;

    const pluginData = JSON.parse(readFileSync(omcPluginJson, 'utf-8'));
    const actualVersion = pluginData.version;
    if (!actualVersion) return;

    // 현재 update-check.json 읽기
    let currentVersion = null;
    if (existsSync(updateCheckPath)) {
      try {
        const checkData = JSON.parse(readFileSync(updateCheckPath, 'utf-8'));
        currentVersion = checkData.currentVersion;
      } catch (e) {
        // 파싱 실패 시 갱신 진행
      }
    }

    // 버전 불일치 시 자동 갱신
    if (currentVersion !== actualVersion) {
      const omcDir = dirname(updateCheckPath);
      if (!existsSync(omcDir)) {
        mkdirSync(omcDir, { recursive: true });
      }
      writeFileSync(updateCheckPath, JSON.stringify({
        timestamp: Date.now(),
        latestVersion: actualVersion,
        currentVersion: actualVersion,
        updateAvailable: false
      }));
    }
  } catch (e) {
    // 실패 시 무시 — 기존 기능에 영향 없음
  }
}

// =============================================================================
// 자동 최신화 (백그라운드)
// =============================================================================

/**
 * omc, omcm, omo, 플러그인 마켓플레이스 자동 업데이트
 * 24시간 쿨다운 내장, detached 백그라운드 실행
 */
function runAutoUpdate() {
  const scriptPaths = [
    join(homedir(), '.claude', 'plugins', 'marketplaces', 'omcm', 'scripts', 'auto-update-all.sh'),
    join(__dirname, '..', '..', 'scripts', 'auto-update-all.sh'),
  ];

  let scriptPath = null;
  for (const p of scriptPaths) {
    if (existsSync(p)) {
      scriptPath = p;
      break;
    }
  }

  if (scriptPath) {
    const child = spawn('bash', [scriptPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }
}

// =============================================================================
// 메인
// =============================================================================

async function main() {
  // 안전 타임아웃: 7초 내에 완료 못하면 자동 통과
  const safetyTimer = setTimeout(() => {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }, 7000);

  try {
    await loadUtils();

    const config = loadConfig();
    const level = getUsageLevel();

    // 세션 ID 생성 및 등록
    try {
      const sessionId = generateSessionId();
      if (sessionId) {
        registerSession(sessionId);
        if (initializeSession) {
          initializeSession(sessionId);
        }
        cleanupOldSessions(7);
      }
    } catch (e) {
      // 세션 초기화 실패 시 무시 (기존 기능에 영향 없음)
    }

    // 알림 비활성화 시 통과
    if (config.notifications && !config.notifications.showOnThreshold) {
      clearTimeout(safetyTimer);
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // 위험 수준일 때만 경고
    if (level === 'critical') {
      const summary = getUsageSummary();

      clearTimeout(safetyTimer);
      console.log(
        JSON.stringify({
          continue: true,
          message: `⚠️ **사용량 경고**

현재 사용량이 높습니다: ${summary}

작업 연속성을 위해 OpenCode 전환을 고려하세요.
"opencode로 전환" 또는 "/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh" 사용`,
        })
      );
      process.exit(0);
    }

    // 정상 통과
    clearTimeout(safetyTimer);
    console.log(JSON.stringify({ continue: true }));

    // 비필수 작업: 메인 출력 후 비동기 실행
    syncOmcVersion();
    runAutoUpdate();

    process.exit(0);
  } catch (e) {
    // 오류 시 정상 통과
    clearTimeout(safetyTimer);
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
}

main();
