#!/usr/bin/env node
/**
 * persistent-mode.mjs - Stop 이벤트 핸들러
 *
 * ralph 모드 등 완료까지 지속해야 하는 모드가 활성화된 상태에서
 * 세션 종료 시도 시 미완료 작업을 확인하고 경고합니다.
 *
 * @since v0.7.0
 */

import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// =============================================================================
// 상태 파일 경로 정의
// =============================================================================

// OMC 4.2.6: 프로젝트 상대 경로 사용 (homedir 아님)
// 세션 격리: .omc/state/sessions/{sessionId}/ 우선, 레거시 .omc/state/ 폴백
const PROJECT_DIR = process.env.PWD || process.cwd();
const STATE_DIR = join(PROJECT_DIR, '.omc/state');

const STATE_FILES = {
  ralph: 'ralph-state.json',
  autopilot: 'autopilot-state.json',
  ultrawork: 'ultrawork-state.json',
  team: 'team-state.json',
  swarm: 'swarm-summary.json',
  pipeline: 'pipeline-state.json',
  ultrapilot: 'ultrapilot-state.json',
  ultraqa: 'ultraqa-state.json',
};

const MAX_REINFORCEMENTS = 50; // OMC v3.8+ 기준 탈출 장치

// =============================================================================
// stdin에서 JSON 읽기
// =============================================================================

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');

    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    setTimeout(() => {
      resolve(data);
    }, 2000);
  });
}

// =============================================================================
// Context-Limit 감지 (교착 방지)
// =============================================================================

function isContextLimitStop(input) {
  if (!input) return false;

  try {
    var data = typeof input === 'string' ? JSON.parse(input) : input;
    var reason = (data.stop_reason || data.reason || '').toLowerCase();

    var contextPatterns = ['context_limit', 'context_window', 'token_limit', 'max_tokens', 'compaction', 'context_exhausted'];
    for (var i = 0; i < contextPatterns.length; i++) {
      if (reason.indexOf(contextPatterns[i]) !== -1) {
        return true;
      }
    }
  } catch (e) {
    // parse failure
  }
  return false;
}

// =============================================================================
// 활성 모드 확인
// =============================================================================

function checkActiveStates() {
  const activeModes = [];

  // OMC 4.2.6 세션 격리: 세션별 경로 우선 탐색
  const sessionDirsPath = join(STATE_DIR, 'sessions');
  const searchPaths = [STATE_DIR];

  // 세션별 디렉토리가 있으면 모든 세션 경로도 탐색
  if (existsSync(sessionDirsPath)) {
    try {
      const sessions = readdirSync(sessionDirsPath);
      for (const sid of sessions) {
        const sessionPath = join(sessionDirsPath, sid);
        try {
          if (statSync(sessionPath).isDirectory()) {
            searchPaths.unshift(sessionPath); // 세션 경로 우선
          }
        } catch (e) {
          // 무시
        }
      }
    } catch (e) {
      // 무시
    }
  }

  // homedir 레거시 경로도 폴백으로 포함
  const legacyDir = join(homedir(), '.omc/state');
  if (legacyDir !== STATE_DIR && existsSync(legacyDir)) {
    searchPaths.push(legacyDir);
  }

  const seenModes = new Set();

  for (const searchDir of searchPaths) {
    for (const [mode, filename] of Object.entries(STATE_FILES)) {
      if (seenModes.has(mode)) continue; // 이미 발견된 모드 건너뜀

      const statePath = join(searchDir, filename);

      if (existsSync(statePath)) {
        try {
          const state = JSON.parse(readFileSync(statePath, 'utf-8'));

          if (state.active) {
            activeModes.push({
              mode,
              state,
              startedAt: state.startedAt || state.started_at,
              iterations: state.iterations || 0,
            });
            seenModes.add(mode);
          }
        } catch (e) {
          // 파싱 실패 시 무시
        }
      }
    }
  }

  return activeModes;
}

// =============================================================================
// 검증 상태 확인 (ralph 모드용)
// =============================================================================

function checkVerificationStatus(state) {
  if (!state.lastVerification) {
    return { complete: false, missing: ['모든 항목'] };
  }

  const v = state.lastVerification;
  const missing = [];

  if (!v.build) missing.push('BUILD');
  if (!v.test) missing.push('TEST');
  if (!v.lint) missing.push('LINT');
  if (v.functionality !== true) missing.push('FUNCTIONALITY');
  if (!v.todo) missing.push('TODO');

  return {
    complete: missing.length === 0,
    missing,
  };
}

// =============================================================================
// 메인
// =============================================================================

async function main() {
  try {
    var rawInput = await readStdin();
    // Stop 이벤트는 input이 없을 수 있음

    // Invalid JSON early return (issue #319)
    var parsedInput = null;
    if (rawInput && rawInput.trim()) {
      try {
        parsedInput = JSON.parse(rawInput);
      } catch (_e) {
        process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
        process.exit(0);
        return;
      }
    }

    // Context-limit 감지 시 즉시 통과 (교착 방지)
    if (isContextLimitStop(parsedInput || rawInput)) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      process.exit(0);
    }

    var activeModes = checkActiveStates();

    // 활성 모드가 없으면 정상 종료 허용
    if (activeModes.length === 0) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      process.exit(0);
    }

    // 강화 카운트 업데이트 및 탈출 장치
    for (var i = 0; i < activeModes.length; i++) {
      var activeMode = activeModes[i];
      var stateFile = join(STATE_DIR, STATE_FILES[activeMode.mode]);
      if (existsSync(stateFile)) {
        try {
          var state = JSON.parse(readFileSync(stateFile, 'utf-8'));
          state.reinforcement_count = (state.reinforcement_count || 0) + 1;

          // 탈출 장치: MAX_REINFORCEMENTS 초과 시 자동 비활성화
          if (state.reinforcement_count > MAX_REINFORCEMENTS) {
            state.active = false;
            state.deactivatedReason = 'max_reinforcements_exceeded';
            state.deactivatedAt = new Date().toISOString();
          }

          writeFileSync(stateFile, JSON.stringify(state, null, 2));
        } catch (e) {
          // 무시
        }
      }
    }

    // ralph 모드 검사 (가장 중요)
    var ralphMode = activeModes.find(function(m) { return m.mode === 'ralph'; });

    if (ralphMode) {
      var verification = checkVerificationStatus(ralphMode.state);

      if (!verification.complete) {
        var blockers = ralphMode.state.blockers || [];
        var blockersStr =
          blockers.length > 0 ? `\n\n**Blockers**:\n${blockers.map(function(b) { return `- ${b}`; }).join('\n')}` : '';

        console.log(
          JSON.stringify({
            continue: true,
            reason: `⚠️ Ralph 모드 활성화 상태 — 미완료 검증: ${verification.missing.join(', ')} | 반복: ${ralphMode.iterations || 0}회${blockersStr ? ' | Blockers: ' + (ralphMode.state.blockers || []).join(', ') : ''} | 강제 종료: cancel --force`,
          })
        );
        process.exit(0);
      }
    }

    // 다른 활성 모드들에 대한 알림
    var otherModes = activeModes.filter(function(m) { return m.mode !== 'ralph'; });

    if (otherModes.length > 0) {
      console.log(
        JSON.stringify({
          continue: true,
          reason: `ℹ️ 활성 모드 감지: ${otherModes.map(function(m) { return m.mode; }).join(', ')} | 종료하려면 cancel 명령을 사용하세요.`,
        })
      );
      process.exit(0);
    }

    // 모든 검증 완료 - 정상 종료 허용
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  } catch (e) {
    // 오류 시 정상 통과 (issue #319: EPIPE 방지)
    try {
      process.stderr.write('[persistent-mode] Error: ' + (e && e.message || e) + '\n');
    } catch (_e) {
      // stderr 에러 무시
    }
    try {
      process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    } catch (_e) {
      process.exit(0);
    }
  }
}

// Global error handlers (issue #319 - OMC 4.2.6 포트)
process.on('uncaughtException', function(error) {
  try {
    process.stderr.write('[persistent-mode] Uncaught exception: ' + (error && error.message || error) + '\n');
  } catch (_e) {
    // 무시
  }
  try {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
  } catch (_e) {
    // 쓰기 실패 시 종료
  }
  process.exit(0);
});

process.on('unhandledRejection', function(error) {
  try {
    process.stderr.write('[persistent-mode] Unhandled rejection: ' + (error && error.message || error) + '\n');
  } catch (_e) {
    // 무시
  }
  try {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
  } catch (_e) {
    // 쓰기 실패 시 종료
  }
  process.exit(0);
});

// Safety timeout: 10초 내 미완료 시 강제 종료 (issue #319)
var safetyTimeout = setTimeout(function() {
  try {
    process.stderr.write('[persistent-mode] Safety timeout reached, forcing exit\n');
  } catch (_e) {
    // 무시
  }
  try {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
  } catch (_e) {
    // 쓰기 실패 시 종료
  }
  process.exit(0);
}, 10000);

main().finally(function() {
  clearTimeout(safetyTimeout);
});
