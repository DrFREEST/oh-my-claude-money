#!/usr/bin/env node
/**
 * tool-tracker.mjs - PostToolUse 도구 사용 추적 hook
 *
 * Claude가 도구를 사용할 때마다 호출됨
 * 도구별 호출 횟수를 세션별 JSONL로 기록
 */

import { logToolUsage } from '../src/tracking/tool-tracker-logger.mjs';

// stdin에서 JSON 읽기
function readStdin() {
  return new Promise(function(resolve) {
    var data = '';
    process.stdin.setEncoding('utf-8');

    process.stdin.on('readable', function() {
      var chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on('end', function() {
      resolve(data);
    });

    setTimeout(function() {
      resolve(data);
    }, 3000);
  });
}

async function main() {
  try {
    var rawInput = await readStdin();
    if (!rawInput || !rawInput.trim()) {
      try { process.stdout.write(JSON.stringify({ suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
      process.exit(0);
    }

    var input;
    try {
      input = JSON.parse(rawInput);
    } catch (_e) {
      try { process.stdout.write('{}' + '\n'); } catch (_e2) { /* EPIPE */ }
      process.exit(0);
    }

    // PostToolUse hook의 stdin 구조:
    // { tool_name: "Read", tool_input: {...}, tool_output: "..." }
    var toolName = input.tool_name || input.toolName || '';
    if (!toolName) {
      try { process.stdout.write(JSON.stringify({ suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
      process.exit(0);
    }

    // 세션 ID 획득
    var sessionId = null;
    try {
      var sessionModule = await import('../src/utils/session-id.mjs');
      sessionId = sessionModule.getSessionId();
    } catch (e) {
      // 세션 ID 획득 실패 시 무시
    }

    // 도구 사용 기록
    logToolUsage(sessionId, toolName);

  } catch (e) {
    // 오류 시 조용히 종료
  }
  try { process.stdout.write(JSON.stringify({ suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
  process.exit(0);
}

main();
