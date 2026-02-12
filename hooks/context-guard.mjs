#!/usr/bin/env node
/**
 * context-guard.mjs - PreToolUse Hook for Context Limit Prevention
 *
 * Task 도구 호출 시 프롬프트를 분석하여:
 * 1. 파일 경로 수를 카운트
 * 2. 6개 초과 시 분할 경고를 additional context로 주입
 * 3. max_turns 권장값을 주입
 *
 * 항상 allow: true (차단하지 않음, 가이드만 제공)
 */

async function main() {
  var input = '';
  for await (var chunk of process.stdin) {
    input += chunk;
  }

  try {
    var data = JSON.parse(input);
    var toolName = data.tool_name || data.toolName || '';
    var toolInput = data.tool_input || data.toolInput || {};

    if (toolName !== 'Task') {
      console.log(JSON.stringify({ allow: true, suppressOutput: true }));
      return;
    }

    var prompt = toolInput.prompt || '';

    var filePathPattern = /(?:^|\s|["'`(,])([a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|c|cpp|h|hpp|md|json|yaml|yml|toml|css|scss|html|vue|svelte|sh))\b/g;

    var matches = new Set();
    var match;
    while ((match = filePathPattern.exec(prompt)) !== null) {
      var filePath = match[1].trim();
      if (filePath.length > 4) {
        matches.add(filePath);
      }
    }

    var globPattern = /(?:^|\s|["'`(,])([a-zA-Z0-9_./]+\*\*?[a-zA-Z0-9_./*]*)/g;
    var globCount = 0;
    while ((match = globPattern.exec(prompt)) !== null) {
      globCount++;
    }

    var fileCount = matches.size + (globCount * 3);

    var recommendedMaxTurns;
    if (fileCount <= 3) {
      recommendedMaxTurns = 15;
    } else if (fileCount <= 6) {
      recommendedMaxTurns = 25;
    } else {
      recommendedMaxTurns = null;
    }

    if (fileCount > 6) {
      var warning = '[CONTEXT GUARD] ⚠️ 이 에이전트에 ' + fileCount + '개 파일이 감지됨 (권장 상한: 6개). ' +
        '컨텍스트 한도 초과 방지를 위해 에이전트를 분할하세요. ' +
        '각 에이전트에 최대 6개 파일, max_turns=25를 설정하세요. ' +
        '파일 목록: ' + Array.from(matches).slice(0, 10).join(', ') +
        (matches.size > 10 ? ' 외 ' + (matches.size - 10) + '개' : '');

      console.error('[OMCM Context Guard] File count: ' + fileCount + ' (threshold: 6)');
      console.error('[OMCM Context Guard] Injecting split warning');

      console.log(JSON.stringify({
        allow: true,
        message: warning
      }));
    } else if (fileCount > 0 && !toolInput.max_turns) {
      var guidance = '[CONTEXT GUARD] max_turns=' + recommendedMaxTurns + ' 설정을 권장합니다 (감지된 파일: ' + fileCount + '개).';

      console.error('[OMCM Context Guard] File count: ' + fileCount + ', recommending max_turns=' + recommendedMaxTurns);

      console.log(JSON.stringify({
        allow: true,
        message: guidance
      }));
    } else {
      console.log(JSON.stringify({ allow: true, suppressOutput: true }));
    }
  } catch (e) {
    console.error('[OMCM Context Guard] Error: ' + e.message);
    console.log(JSON.stringify({ allow: true, suppressOutput: true }));
  }
}

main();
