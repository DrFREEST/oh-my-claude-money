#!/usr/bin/env node
/**
 * bash-optimizer.mjs - PreToolUse Bash 반복 감지 hook
 *
 * 연속 Bash 3회 이상 시 Task 에이전트 위임 권유
 * 차단하지 않음 (항상 allow: true)
 */

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
      try { process.stdout.write(JSON.stringify({ allow: true, suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
      process.exit(0);
    }

    // 세션 ID 획득
    var sessionId = null;
    try {
      var sessionModule = await import('../src/utils/session-id.mjs');
      sessionId = sessionModule.getSessionId();
    } catch (e) {
      // 세션 ID 획득 실패
    }

    // 카운터에 Bash 호출 기록
    var result;
    try {
      var counterModule = await import('../src/utils/tool-counter.mjs');
      result = counterModule.recordToolCall(sessionId, 'Bash');
    } catch (e) {
      try { process.stdout.write(JSON.stringify({ allow: true, suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
      process.exit(0);
    }

    // 위임 제안이 있으면 hookSpecificOutput에 추가
    if (result && result.shouldSuggestDelegation && result.suggestion) {
      try { process.stdout.write(JSON.stringify({
        allow: true,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: '[OMCM 토큰 절약 힌트] ' + result.suggestion
        }
      }) + '\n'); } catch (_e) { /* EPIPE */ }
    } else {
      try { process.stdout.write(JSON.stringify({ allow: true, suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
    }

  } catch (e) {
    try { process.stdout.write(JSON.stringify({ allow: true, suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
  }
  process.exit(0);
}

main();
