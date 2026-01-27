#!/usr/bin/env node
/**
 * persistent-mode.mjs - Stop 이벤트 핸들러
 *
 * ralph 모드 등 완료까지 지속해야 하는 모드가 활성화된 상태에서
 * 세션 종료 시도 시 미완료 작업을 확인하고 경고합니다.
 *
 * @since v0.7.0
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// =============================================================================
// 상태 파일 경로 정의
// =============================================================================

const STATE_DIR = join(homedir(), '.omcm/state');

const STATE_FILES = {
  ralph: 'ralph.json',
  autopilot: 'autopilot.json',
  ultrawork: 'ultrawork.json',
  ecomode: 'ecomode.json',
  hulw: 'hulw.json',
  swarm: 'swarm.json',
  pipeline: 'pipeline.json',
  ultrapilot: 'ultrapilot.json',
  ultraqa: 'ultraqa.json',
};

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
// 활성 모드 확인
// =============================================================================

function checkActiveStates() {
  const activeModes = [];

  for (const [mode, filename] of Object.entries(STATE_FILES)) {
    const statePath = join(STATE_DIR, filename);

    if (existsSync(statePath)) {
      try {
        const state = JSON.parse(readFileSync(statePath, 'utf-8'));

        if (state.active) {
          activeModes.push({
            mode,
            state,
            startedAt: state.startedAt,
            iterations: state.iterations || 0,
          });
        }
      } catch (e) {
        // 파싱 실패 시 무시
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
    const rawInput = await readStdin();
    // Stop 이벤트는 input이 없을 수 있음

    const activeModes = checkActiveStates();

    // 활성 모드가 없으면 정상 종료 허용
    if (activeModes.length === 0) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    // ralph 모드 검사 (가장 중요)
    const ralphMode = activeModes.find((m) => m.mode === 'ralph');

    if (ralphMode) {
      const verification = checkVerificationStatus(ralphMode.state);

      if (!verification.complete) {
        const blockers = ralphMode.state.blockers || [];
        const blockersStr =
          blockers.length > 0 ? `\n\n**Blockers**:\n${blockers.map((b) => `- ${b}`).join('\n')}` : '';

        console.log(
          JSON.stringify({
            continue: true,
            message: `⚠️ **Ralph 모드 활성화 상태**

작업이 아직 완료되지 않았습니다.

**미완료 검증 항목**: ${verification.missing.join(', ')}
**반복 횟수**: ${ralphMode.iterations || 0}회${blockersStr}

작업을 계속하시겠습니까? 강제 종료: \`cancel --force\``,
          })
        );
        process.exit(0);
      }
    }

    // 다른 활성 모드들에 대한 알림
    const otherModes = activeModes.filter((m) => m.mode !== 'ralph');

    if (otherModes.length > 0) {
      const modeList = otherModes.map((m) => `- **${m.mode}** (시작: ${m.startedAt || 'N/A'})`).join('\n');

      console.log(
        JSON.stringify({
          continue: true,
          message: `ℹ️ **활성 모드 감지**

다음 모드가 활성화되어 있습니다:
${modeList}

종료하려면 \`cancel\` 명령을 사용하세요.`,
        })
      );
      process.exit(0);
    }

    // 모든 검증 완료 - 정상 종료 허용
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  } catch (e) {
    // 오류 시 정상 통과
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
}

main();
