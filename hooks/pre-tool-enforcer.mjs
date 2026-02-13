#!/usr/bin/env node
/**
 * pre-tool-enforcer.mjs - AskUserQuestion 알림 훅
 *
 * OMC 4.2.7 호환: AskUserQuestion 알림 타이밍을 PostToolUse에서
 * PreToolUse로 선제 전환
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

function safeOutput(payload) {
  try {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } catch (_e) {
    // no-op
  }
}

async function main() {
  try {
    var rawInput = await readStdin();
    if (!rawInput || !rawInput.trim()) {
      safeOutput({ allow: true, suppressOutput: true });
      return;
    }

    var input = JSON.parse(rawInput);
    var toolName = input.tool_name || input.toolName || '';

    if (toolName !== 'AskUserQuestion') {
      safeOutput({ allow: true, suppressOutput: true });
      return;
    }

    var question = '';
    if (input.tool_input && input.tool_input.question) {
      question = input.tool_input.question;
    } else if (input.tool_input && input.tool_input.prompt) {
      question = input.tool_input.prompt;
    }

    if (question && question.length > 220) {
      question = question.slice(0, 220) + '...';
    }

    safeOutput({
      allow: true,
      message: question
        ? '[OMCM AskUserQuestion] 사용자 질문: ' + question
        : '[OMCM AskUserQuestion] 사용자 확인이 필요합니다.'
    });
  } catch (e) {
    safeOutput({ allow: true, suppressOutput: true });
  }
}

main();
