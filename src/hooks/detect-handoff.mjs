#!/usr/bin/env node
/**
 * detect-handoff.mjs - OpenCode 전환 감지 훅
 *
 * UserPromptSubmit 훅에서 실행됨
 * - 키워드 감지: "opencode", "전환", "handoff" 등
 * - 사용량 임계치 감지: HUD 캐시에서 90% 이상 확인
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 모듈 경로 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 유틸리티 임포트 (상대 경로)
const utilsPath = join(__dirname, '../utils');

// 동적 임포트를 위한 설정
let getUsageFromCache, checkThreshold, loadConfig;

async function loadUtils() {
  try {
    const usageModule = await import(join(utilsPath, 'usage.mjs'));
    const configModule = await import(join(utilsPath, 'config.mjs'));

    getUsageFromCache = usageModule.getUsageFromCache;
    checkThreshold = usageModule.checkThreshold;
    loadConfig = configModule.loadConfig;
  } catch (e) {
    // 유틸리티 로드 실패 시 기본값 사용
    getUsageFromCache = () => null;
    checkThreshold = () => ({ exceeded: false });
    loadConfig = () => ({
      threshold: 90,
      keywords: ['opencode', 'handoff', '전환', 'opencode로', '오픈코드'],
      modeKeywords: {
        ecomode: ['eco:', 'ecomode:', 'eco ', '효율', '절약', 'budget', 'save-tokens'],
        ralph: ['ralph:', 'ralph ', "don't stop", 'must complete', '끝까지', '완료할때까지', '멈추지마'],
        cancel: ['cancelomc', 'stopomc', 'cancel', 'stop', 'abort', '취소', '중지'],
      },
    });
  }
}

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

    // 타임아웃 방지
    setTimeout(() => {
      resolve(data);
    }, 2000);
  });
}

// =============================================================================
// 프롬프트 추출
// =============================================================================

function extractPrompt(input) {
  const paths = [
    'prompt',
    'message',
    'content',
    'text',
    'tool_input.prompt',
    'tool_input.message',
  ];

  for (const path of paths) {
    const parts = path.split('.');
    let value = input;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        value = undefined;
        break;
      }
    }

    if (typeof value === 'string') {
      return value;
    }
  }

  return JSON.stringify(input);
}

// =============================================================================
// 키워드 감지
// =============================================================================

function detectKeyword(prompt, keywords) {
  if (!prompt) return null;

  const lowerPrompt = prompt.toLowerCase();

  for (const kw of keywords) {
    if (lowerPrompt.includes(kw.toLowerCase())) {
      return kw;
    }
  }

  return null;
}

// =============================================================================
// 모드 키워드 감지 (ecomode, ralph, cancel)
// =============================================================================

function detectModeKeyword(prompt, modeKeywords) {
  if (!prompt) return null;

  const lowerPrompt = prompt.toLowerCase();

  for (const [mode, keywords] of Object.entries(modeKeywords)) {
    for (const kw of keywords) {
      if (lowerPrompt.includes(kw.toLowerCase())) {
        return { mode, keyword: kw };
      }
    }
  }

  return null;
}

// =============================================================================
// 모드 상태 저장
// =============================================================================

function saveModeState(mode, projectDir) {
  const stateDir = join(homedir(), '.omc/state');

  try {
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    const stateFile = join(stateDir, `${mode}-state.json`);
    const state = {
      active: mode !== 'cancel',
      startedAt: new Date().toISOString(),
      projectDir,
      iterations: 0,
    };

    // cancel 모드의 경우 모든 상태 파일 비활성화
    if (mode === 'cancel') {
      const modes = ['ralph', 'autopilot', 'ultrawork', 'ecomode', 'hulw', 'swarm', 'pipeline', 'ultrapilot', 'ultraqa'];
      for (const m of modes) {
        const modeFile = join(stateDir, `${m}-state.json`);
        if (existsSync(modeFile)) {
          try {
            const modeState = JSON.parse(readFileSync(modeFile, 'utf-8'));
            modeState.active = false;
            modeState.cancelledAt = new Date().toISOString();
            writeFileSync(modeFile, JSON.stringify(modeState, null, 2));
          } catch (e) {
            // 무시
          }
        }
      }
      return;
    }

    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (e) {
    // 저장 실패 시 무시
  }
}

// =============================================================================
// 핸드오프 상태 저장
// =============================================================================

function saveHandoffState(reason, usage, projectDir) {
  const handoffDir = join(projectDir || process.cwd(), '.omcm/handoff');

  try {
    if (!existsSync(handoffDir)) {
      mkdirSync(handoffDir, { recursive: true });
    }

    const stateFile = join(handoffDir, 'pending-handoff.json');
    const state = {
      timestamp: new Date().toISOString(),
      reason,
      usage,
      triggered: true,
    };

    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (e) {
    // 저장 실패 시 무시
  }
}

// =============================================================================
// 세션 토큰 정보 읽기
// =============================================================================

/**
 * 세션 토큰 정보 읽기 (fusion-state.json에서)
 * @returns {number} 세션 누적 입력 토큰 (없으면 0)
 */
function getSessionInputTokens() {
  try {
    var fusionStatePath = join(homedir(), '.omcm', 'fusion-state.json');
    if (!existsSync(fusionStatePath)) return 0;

    var state = JSON.parse(readFileSync(fusionStatePath, 'utf-8'));
    if (state && state.actualTokens && state.actualTokens.claude) {
      return state.actualTokens.claude.input || 0;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

// =============================================================================
// 작업 패턴 감지
// =============================================================================

/**
 * 작업 패턴 감지 - 위임 가능한 작업 유형 판별
 * @param {string} prompt - 사용자 프롬프트
 * @returns {object|null} - { type: string, suggestion: string } 또는 null
 */
function detectDelegationPattern(prompt) {
  if (!prompt) return null;

  var lowerPrompt = prompt.toLowerCase();

  // 탐색/검색 패턴
  var explorePatterns = ['찾아줘', '검색해', '어디에', '어디서', 'find ', 'search ', 'where is', 'look for', 'grep '];
  for (var i = 0; i < explorePatterns.length; i++) {
    if (lowerPrompt.indexOf(explorePatterns[i]) !== -1) {
      return { type: 'explore', suggestion: '탐색 작업은 explore 에이전트에 위임하면 효율적입니다.' };
    }
  }

  // 분석/조사 패턴
  var analyzePatterns = ['분석해', '분석하', '조사해', '조사하', 'analyze', 'investigate', 'debug', '디버그', '원인'];
  for (var j = 0; j < analyzePatterns.length; j++) {
    if (lowerPrompt.indexOf(analyzePatterns[j]) !== -1) {
      return { type: 'architect', suggestion: '분석/조사 작업은 architect 에이전트에 위임하면 효율적입니다.' };
    }
  }

  // 리팩토링/수정 패턴
  var executorPatterns = ['리팩토링', '리팩터링', '수정해', '변경해', '구현해', 'refactor', 'implement', 'modify', 'change'];
  for (var k = 0; k < executorPatterns.length; k++) {
    if (lowerPrompt.indexOf(executorPatterns[k]) !== -1) {
      return { type: 'executor', suggestion: '구현/수정 작업은 executor 에이전트에 위임하면 효율적입니다.' };
    }
  }

  // 리서치/문서 패턴
  var researchPatterns = ['알려줘', '설명해', '문서', 'explain', 'document', 'research', '연구'];
  for (var l = 0; l < researchPatterns.length; l++) {
    if (lowerPrompt.indexOf(researchPatterns[l]) !== -1) {
      return { type: 'researcher', suggestion: '리서치/문서 작업은 researcher 에이전트에 위임하면 효율적입니다.' };
    }
  }

  return null;
}

// =============================================================================
// 메인
// =============================================================================

async function main() {
  try {
    await loadUtils();

    const rawInput = await readStdin();

    if (!rawInput.trim()) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    const input = JSON.parse(rawInput);
    const prompt = extractPrompt(input);
    const projectDir = input.directory || process.cwd();

    const config = loadConfig();
    const keywords = config.keywords || ['opencode', 'handoff', '전환'];
    const threshold = config.threshold || 90;

    // 0. 모드 키워드 감지 (ecomode, ralph, cancel)
    const modeKeywords = config.modeKeywords || {};
    const detectedMode = detectModeKeyword(prompt, modeKeywords);
    if (detectedMode) {
      saveModeState(detectedMode.mode, projectDir);

      console.log(
        JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: `🎯 **${detectedMode.mode.toUpperCase()} 모드 감지**

키워드 "${detectedMode.keyword}"로 ${detectedMode.mode} 모드가 활성화됩니다.`
          },
        })
      );
      process.exit(0);
    }

    // 0.5. 위임 유도 (세션 토큰 5M 이상일 때)
    var sessionInputTokens = getSessionInputTokens();
    if (sessionInputTokens >= 5000000) {
      var delegationPattern = detectDelegationPattern(prompt);

      if (delegationPattern) {
        // 작업 패턴 감지 시 구체적 위임 권유
        console.log(
          JSON.stringify({
            continue: true,
            hookSpecificOutput: {
              hookEventName: "UserPromptSubmit",
              additionalContext: '[OMCM 토큰 절약 모드] 세션 입력 토큰 ' + Math.round(sessionInputTokens / 1000000) + 'M. ' + delegationPattern.suggestion + ' Task(subagent_type="oh-my-claudecode:' + delegationPattern.type + '")로 위임을 검토하세요.'
            }
          })
        );
        process.exit(0);
      }

      // 패턴 감지 없어도 일반 위임 힌트 (10M 이상)
      if (sessionInputTokens >= 10000000) {
        console.log(
          JSON.stringify({
            continue: true,
            hookSpecificOutput: {
              hookEventName: "UserPromptSubmit",
              additionalContext: '[OMCM 토큰 절약 모드] 세션 입력 토큰 ' + Math.round(sessionInputTokens / 1000000) + 'M. 코드 탐색/분석/리서치 작업은 Task 에이전트에 위임하여 컨텍스트를 절약하세요.'
            }
          })
        );
        process.exit(0);
      }
    }

    // 1. 핸드오프 키워드 감지
    const detectedKeyword = detectKeyword(prompt, keywords);
    if (detectedKeyword) {
      const usage = getUsageFromCache();
      saveHandoffState('keyword', usage, projectDir);

      const usageStr = usage
        ? `5시간: ${usage.fiveHour}%, 주간: ${usage.weekly}%`
        : 'N/A';

      console.log(
        JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: `🔄 **OpenCode 전환 감지**

키워드 "${detectedKeyword}"가 감지되었습니다.

현재 사용량: ${usageStr}

전환을 진행하려면 터미널에서:
\`\`\`bash
cd ${projectDir} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh
\`\`\`

또는 컨텍스트만 저장:
\`\`\`bash
/opt/oh-my-claude-money/scripts/export-context.sh
\`\`\``
          },
        })
      );
      process.exit(0);
    }

    // 2. 사용량 임계치 감지
    const thresholdCheck = checkThreshold(threshold);
    if (thresholdCheck.exceeded) {
      const usage = getUsageFromCache();
      saveHandoffState('usage_threshold', usage, projectDir);

      const typeLabel = thresholdCheck.type === 'fiveHour' ? '5시간' : '주간';

      console.log(
        JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: `⚠️ **사용량 임계치 도달**

${typeLabel} 사용량이 **${thresholdCheck.percent}%**에 도달했습니다.

작업 연속성을 위해 OpenCode로 전환을 권장합니다:
\`\`\`bash
cd ${projectDir} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh
\`\`\`

계속 사용하시려면 이 메시지를 무시하세요.`
          },
        })
      );
      process.exit(0);
    }

    // 조건 미충족 - 정상 통과
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  } catch (e) {
    // 오류 시 정상 통과
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
}

main();
