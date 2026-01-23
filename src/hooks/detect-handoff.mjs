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
// 핸드오프 상태 저장
// =============================================================================

function saveHandoffState(reason, usage, projectDir) {
  const handoffDir = join(projectDir || process.cwd(), '.omc/handoff');

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

    // 1. 키워드 감지
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
          message: `🔄 **OpenCode 전환 감지**

키워드 "${detectedKeyword}"가 감지되었습니다.

현재 사용량: ${usageStr}

전환을 진행하려면 터미널에서:
\`\`\`bash
cd ${projectDir} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh
\`\`\`

또는 컨텍스트만 저장:
\`\`\`bash
/opt/oh-my-claude-money/scripts/export-context.sh
\`\`\``,
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
          message: `⚠️ **사용량 임계치 도달**

${typeLabel} 사용량이 **${thresholdCheck.percent}%**에 도달했습니다.

작업 연속성을 위해 OpenCode로 전환을 권장합니다:
\`\`\`bash
cd ${projectDir} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh
\`\`\`

계속 사용하시려면 이 메시지를 무시하세요.`,
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
