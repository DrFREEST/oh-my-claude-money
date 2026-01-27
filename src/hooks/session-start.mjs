#!/usr/bin/env node
/**
 * session-start.mjs - 세션 시작 훅
 *
 * 세션 시작 시 사용량 정보를 로드하고 경고 메시지 표시
 * fusionDefault 활성화 시 서버 풀 자동 시작 (Cold boot 최소화)
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// 유틸리티 로드
// =============================================================================

let getUsageFromCache, getUsageLevel, getUsageSummary, loadConfig;

async function loadUtils() {
  try {
    const utilsPath = join(__dirname, '../utils');
    const usageModule = await import(join(utilsPath, 'usage.mjs'));
    const configModule = await import(join(utilsPath, 'config.mjs'));

    getUsageFromCache = usageModule.getUsageFromCache;
    getUsageLevel = usageModule.getUsageLevel;
    getUsageSummary = usageModule.getUsageSummary;
    loadConfig = configModule.loadConfig;
  } catch (e) {
    // 기본값
    getUsageFromCache = () => null;
    getUsageLevel = () => 'unknown';
    getUsageSummary = () => 'N/A';
    loadConfig = () => ({ notifications: { showOnThreshold: true } });
  }
}

// =============================================================================
// 서버 풀 관리
// =============================================================================

/**
 * 서버 풀이 실행 중인지 확인
 */
function isServerPoolRunning() {
  const pidDir = join(homedir(), '.omcm', 'server-pool');
  const pidFile = join(pidDir, 'server-4096.pid');

  if (!existsSync(pidFile)) {
    return false;
  }

  try {
    const pid = readFileSync(pidFile, 'utf-8').trim();
    // 프로세스 존재 확인
    process.kill(Number(pid), 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 서버 풀 시작 (비동기, 백그라운드)
 */
function startServerPool() {
  // 스크립트 경로 찾기
  const scriptPaths = [
    join(homedir(), '.claude', 'plugins', 'marketplaces', 'omcm', 'scripts', 'start-server-pool.sh'),
    join(homedir(), '.local', 'share', 'omcm', 'scripts', 'start-server-pool.sh'),
    join(__dirname, '..', '..', 'scripts', 'start-server-pool.sh'),
  ];

  let scriptPath = null;
  for (const path of scriptPaths) {
    if (existsSync(path)) {
      scriptPath = path;
      break;
    }
  }

  if (scriptPath) {
    // 조용히 백그라운드로 시작
    const child = spawn(scriptPath, ['quiet'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return true;
  }

  return false;
}

// =============================================================================
// 메인
// =============================================================================

async function main() {
  try {
    await loadUtils();

    const config = loadConfig();
    const usage = getUsageFromCache();
    const level = getUsageLevel();

    // fusionDefault 활성화 시 서버 풀 자동 시작
    if (config.fusionDefault && !isServerPoolRunning()) {
      startServerPool();
    }

    // 알림 비활성화 시 통과
    if (config.notifications && !config.notifications.showOnThreshold) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // 위험 수준일 때만 경고
    if (level === 'critical') {
      const summary = getUsageSummary();

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
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  } catch (e) {
    // 오류 시 정상 통과
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
}

main();
