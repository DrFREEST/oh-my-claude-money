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

var getUsageLevel, getUsageSummary, loadConfig;
var generateSessionId, registerSession, cleanupOldSessions, initializeSession;
var findProjectRootSync;

async function loadUtils() {
  var utilsPath = join(__dirname, '../utils');

  try {
    var usageModule = await import(join(utilsPath, 'usage.mjs'));
    var configModule = await import(join(utilsPath, 'config.mjs'));

    getUsageLevel = usageModule.getUsageLevel;
    getUsageSummary = usageModule.getUsageSummary;
    loadConfig = configModule.loadConfig;

    // 세션 ID 유틸리티 로드
    try {
      var sessionModule = await import(join(utilsPath, 'session-id.mjs'));
      generateSessionId = sessionModule.generateSessionId;
      registerSession = sessionModule.registerSession;
      cleanupOldSessions = sessionModule.cleanupOldSessions;
      initializeSession = sessionModule.initializeSession;
    } catch (e) {
      // 세션 ID 유틸리티 없으면 기본값
      generateSessionId = function() { return null; };
      registerSession = function() {};
      cleanupOldSessions = function() {};
      initializeSession = function() {};
    }
  } catch (e) {
    // 기본값
    getUsageLevel = function() { return 'unknown'; };
    getUsageSummary = function() { return 'N/A'; };
    loadConfig = function() { return { notifications: { showOnThreshold: true } }; };
    generateSessionId = function() { return null; };
    registerSession = function() {};
    cleanupOldSessions = function() {};
    initializeSession = function() {};
    findProjectRootSync = null;
  }

  // AGENTS.md 주입을 위한 프로젝트 루트 탐색 유틸
  try {
    var projectRootModule = await import(join(utilsPath, 'project-root.mjs'));
    findProjectRootSync = projectRootModule.findProjectRootSync;
  } catch (e) {
    if (!findProjectRootSync) {
      findProjectRootSync = null;
    }
  }
}

// =============================================================================
// AGENTS.md 주입
// =============================================================================

function readRootAgentsContext() {
  try {
    if (!findProjectRootSync) return null;

    var rootInfo = findProjectRootSync(process.cwd(), { useGlobal: true });
    var projectRoot = rootInfo && rootInfo.root ? rootInfo.root : process.cwd();
    var agentsPath = join(projectRoot, 'AGENTS.md');

    if (!existsSync(agentsPath)) return null;

    var content = readFileSync(agentsPath, 'utf-8');
    if (!content || !content.trim()) return null;

    if (content.length > 20000) {
      return content.slice(0, 20000) + '\n\n[AGENTS.md 본문이 너무 길어 20,000자까지만 주입합니다.]';
    }

    return content;
  } catch (e) {
    return null;
  }
}

function buildSessionStartOutput(message, agentsContext, suppressOutput) {
  var output = { continue: true };

  if (message) {
    output.message = message;
  }

  if (agentsContext) {
    output.hookSpecificOutput = {
      hookEventName: 'SessionStart',
      additionalContext: '[AGENTS.md]\n\n' + agentsContext
    };
  }

  if (suppressOutput && !message && !agentsContext) {
    output.suppressOutput = true;
  }

  return output;
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
    var home = homedir();
    var omcPluginJson = join(home, '.claude', 'plugins', 'marketplaces', 'omc', '.claude-plugin', 'plugin.json');
    var updateCheckPath = join(home, '.claude', '.omc', 'update-check.json');

    if (!existsSync(omcPluginJson)) return;

    var pluginData = JSON.parse(readFileSync(omcPluginJson, 'utf-8'));
    var actualVersion = pluginData.version;
    if (!actualVersion) return;

    // 현재 update-check.json 읽기
    var currentVersion = null;
    if (existsSync(updateCheckPath)) {
      try {
        var checkData = JSON.parse(readFileSync(updateCheckPath, 'utf-8'));
        currentVersion = checkData.currentVersion;
      } catch (e) {
        // 파싱 실패 시 갱신 진행
      }
    }

    // 버전 불일치 시 자동 갱신
    if (currentVersion !== actualVersion) {
      var omcDir = dirname(updateCheckPath);
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
  var scriptPaths = [
    join(homedir(), '.claude', 'plugins', 'marketplaces', 'omcm', 'scripts', 'auto-update-all.sh'),
    join(__dirname, '..', '..', 'scripts', 'auto-update-all.sh'),
  ];

  var scriptPath = null;
  for (var i = 0; i < scriptPaths.length; i++) {
    if (existsSync(scriptPaths[i])) {
      scriptPath = scriptPaths[i];
      break;
    }
  }

  if (scriptPath) {
    var child = spawn('bash', [scriptPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }
}

// =============================================================================
// 메인
// =============================================================================

// stdout 버퍼 flush 후 안전하게 종료하는 헬퍼
function safeOutput(data) {
  var output = JSON.stringify(data) + '\n';
  process.stdout.write(output, function() { process.exit(0); });
}

async function main() {
  // 안전 타임아웃: 7초 내에 완료 못하면 자동 통과
  var safetyTimer = setTimeout(function() {
    safeOutput({ continue: true, suppressOutput: true });
  }, 7000);

  try {
    await loadUtils();

    var config = loadConfig();
    var level = getUsageLevel();

    // 세션 ID 생성 및 등록
    try {
      var sessionId = generateSessionId();
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

    var agentsContext = readRootAgentsContext();

    // 알림 비활성화 시 통과
    if (config.notifications && config.notifications.showOnThreshold === false) {
      clearTimeout(safetyTimer);
      safeOutput(buildSessionStartOutput('', agentsContext, true));
      return;
    }

    // MCP-First 모드 상태 표시
    var mcpConfig = null;
    try {
      var configPaths = [
        join(homedir(), '.claude', 'marketplaces', 'omcm', 'config.json'),
        join(homedir(), '.claude', 'plugins', 'omcm', 'config.json'),
      ];
      for (var c = 0; c < configPaths.length; c++) {
        if (existsSync(configPaths[c])) {
          mcpConfig = JSON.parse(readFileSync(configPaths[c], 'utf-8'));
          break;
        }
      }
    } catch (e) { /* ignore */ }

    var mcpFirstMessage = '';
    if (mcpConfig && mcpConfig.mcpFirst) {
      var modeLabel = (mcpConfig.mcpFirstMode === 'enforce') ? 'enforce' : 'suggest';
      mcpFirstMessage = '\n\n🔧 **MCP-First: ' + modeLabel + '** | 분석→ask_codex, 디자인→ask_gemini';
    }

    // 위험 수준일 때만 경고
    if (level === 'critical') {
      var summary = getUsageSummary();

      clearTimeout(safetyTimer);
      safeOutput(buildSessionStartOutput(
        '⚠️ **사용량 경고**\n\n현재 사용량이 높습니다: ' + summary + '\n\n작업 연속성을 위해 MCP-First 모드로 Codex/Gemini를 활용하세요.' + mcpFirstMessage,
        agentsContext
      ));
      return;
    }

    // MCP-First 활성 시 정상 통과에도 메시지 표시
    if (mcpFirstMessage) {
      clearTimeout(safetyTimer);
      safeOutput(buildSessionStartOutput(mcpFirstMessage.trim(), agentsContext));
      return;
    }

    // 정상 통과
    clearTimeout(safetyTimer);

    // 비필수 작업: 메인 출력 후 비동기 실행
    syncOmcVersion();
    runAutoUpdate();

    safeOutput(buildSessionStartOutput('', agentsContext, true));
  } catch (e) {
    // 오류 시 정상 통과
    clearTimeout(safetyTimer);
    safeOutput(buildSessionStartOutput('', null, true));
  }
}

main();
