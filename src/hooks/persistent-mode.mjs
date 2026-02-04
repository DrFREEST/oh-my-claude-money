#!/usr/bin/env node
/**
 * persistent-mode.mjs - Stop 이벤트 핸들러
 *
 * ralph 모드 등 완료까지 지속해야 하는 모드가 활성화된 상태에서
 * 세션 종료 시도 시 미완료 작업을 확인하고 경고합니다.
 *
 * @since v0.7.0
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// =============================================================================
// 안전 출력 유틸리티 (EPIPE 등 출력 오류 대비)
// =============================================================================

let hasOutput = false;

function safeWrite(payload) {
  if (hasOutput) return;

  try {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    process.stdout.write(text + '\n');
    hasOutput = true;
    return;
  } catch (e) {
    // stdout 오류(EPIPE 등) 시 console.log로 마지막 시도
  }

  try {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    console.log(text);
    hasOutput = true;
  } catch (e) {
    // 모든 출력 실패 시 무시
  }
}

function safeContinueAndExit() {
  safeWrite({ continue: true });
  process.exit(0);
}

process.on('uncaughtException', () => {
  safeContinueAndExit();
});

process.on('unhandledRejection', () => {
  safeContinueAndExit();
});

// =============================================================================
// 상태 파일 경로 정의 (OMC v3.9.8+ 호환)
// =============================================================================

// 프로젝트 로컬 우선, 글로벌 폴백 (OMC v3.9.8 프로젝트 격리 지원)
function getStateDir(projectDir) {
  const localDir = join(projectDir || process.cwd(), '.omc', 'state');
  if (existsSync(localDir)) return localDir;
  return join(homedir(), '.omc/state'); // 레거시 폴백
}

// 경로 정규화 (Windows 호환)
function normalizePath(p) {
  if (!p) return '';
  return p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

// project_path 검증 (OMC v3.9.8+ 프로젝트 격리)
function isStateForCurrentProject(state, currentDirectory, isGlobalState = false) {
  if (!state) return true;
  if (!state.project_path) {
    if (isGlobalState) return false; // 글로벌 상태는 project_path 필수
    return true; // 로컬 상태의 레거시 허용 (하위 호환성)
  }
  return normalizePath(state.project_path) === normalizePath(currentDirectory);
}

const STATE_FILES = {
  ralph: 'ralph-state.json',
  autopilot: 'autopilot-state.json',
  ultrawork: 'ultrawork-state.json',
  ecomode: 'ecomode-state.json',
  hulw: 'hulw-state.json',
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

  var data = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (e) {
      return false;
    }
  }

  var reason = (data.stop_reason || data.stopReason || data.reason || '').toLowerCase();
  var contextPatterns = ['context_limit', 'context_window', 'token_limit', 'max_tokens', 'compaction', 'context_exhausted'];

  for (var i = 0; i < contextPatterns.length; i++) {
    if (reason.indexOf(contextPatterns[i]) !== -1) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// 활성 모드 확인
// =============================================================================

function checkActiveStates(projectDir) {
  const activeModes = [];
  const cwd = projectDir || process.cwd();

  // 로컬 + 글로벌 경로 모두 검색
  const searchDirs = [
    join(cwd, '.omc', 'state'),           // 프로젝트 로컬 (우선)
    join(homedir(), '.omc/state'),         // 글로벌 (폴백)
  ];

  for (const [mode, filename] of Object.entries(STATE_FILES)) {
    for (let i = 0; i < searchDirs.length; i++) {
      const stateDir = searchDirs[i];
      const statePath = join(stateDir, filename);
      const isGlobalState = i === 1; // 두 번째가 글로벌

      if (existsSync(statePath)) {
        try {
          const state = JSON.parse(readFileSync(statePath, 'utf-8'));

          // OMC v3.9.8+ project_path 검증
          if (state.active && isStateForCurrentProject(state, cwd, isGlobalState)) {
            activeModes.push({
              mode,
              state,
              startedAt: state.startedAt || state.started_at,
              iterations: state.iterations || state.iteration || 0,
            });
            break; // 로컬에서 찾으면 글로벌 검색 스킵
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
    const failSafe = setTimeout(() => {
      safeContinueAndExit();
    }, 10000);

    const rawInput = await readStdin();
    let parsedInput = null;

    if (rawInput && rawInput.trim().length > 0) {
      try {
        parsedInput = JSON.parse(rawInput);
      } catch (e) {
        // 입력 JSON 파싱 실패 시 즉시 통과
        safeContinueAndExit();
        return;
      }
    } else {
      parsedInput = {};
    }

    // Context-limit 감지 시 즉시 통과 (교착 방지)
    if (isContextLimitStop(parsedInput)) {
      safeContinueAndExit();
      return;
    }

    // 프로젝트 디렉터리 추출
    const projectDir = parsedInput?.directory || process.cwd();
    const activeModes = checkActiveStates(projectDir);

    // 활성 모드가 없으면 정상 종료 허용
    if (activeModes.length === 0) {
      safeContinueAndExit();
      return;
    }

    // 강화 카운트 업데이트 및 탈출 장치
    for (const activeMode of activeModes) {
      const stateDir = getStateDir(projectDir);
      const stateFile = join(stateDir, STATE_FILES[activeMode.mode]);
      if (existsSync(stateFile)) {
        try {
          const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
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
    const ralphMode = activeModes.find((m) => m.mode === 'ralph');

    if (ralphMode) {
      const verification = checkVerificationStatus(ralphMode.state);

      if (!verification.complete) {
        const blockers = ralphMode.state.blockers || [];
        const blockersStr =
          blockers.length > 0 ? `\n\n**Blockers**:\n${blockers.map((b) => `- ${b}`).join('\n')}` : '';

        clearTimeout(failSafe);
        safeWrite({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "Stop",
            additionalContext: `⚠️ **Ralph 모드 활성화 상태**

작업이 아직 완료되지 않았습니다.

**미완료 검증 항목**: ${verification.missing.join(', ')}
**반복 횟수**: ${ralphMode.iterations || 0}회${blockersStr}

작업을 계속하시겠습니까? 강제 종료: \`cancel --force\``
          },
        });
        process.exit(0);
      }
    }

    // 다른 활성 모드들에 대한 알림
    const otherModes = activeModes.filter((m) => m.mode !== 'ralph');

    if (otherModes.length > 0) {
      const modeList = otherModes.map((m) => `- **${m.mode}** (시작: ${m.startedAt || 'N/A'})`).join('\n');

      clearTimeout(failSafe);
      safeWrite({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "Stop",
          additionalContext: `ℹ️ **활성 모드 감지**

다음 모드가 활성화되어 있습니다:
${modeList}

종료하려면 \`cancel\` 명령을 사용하세요.`
        },
      });
      process.exit(0);
    }

    // 모든 검증 완료 - 정상 종료 허용
    safeContinueAndExit();
  } catch (e) {
    // 오류 시 정상 통과
    safeContinueAndExit();
  }
}

main();
