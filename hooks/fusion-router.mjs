#!/usr/bin/env node
/**
 * fusion-router.mjs - PreToolUse Hook for FULL Task routing
 *
 * When fallback is active, intercepts Task calls and routes to OpenCode
 */

import { spawn } from 'child_process';
import {
  shouldRouteToOpenCode,
  mapAgentToOpenCode,
  wrapWithUlwCommand,
  updateFusionState,
  logRouting
} from '../src/hooks/fusion-router-logic.mjs';

/**
 * OpenCode를 통해 작업 실행
 */
function executeViaOpenCode(toolInput, decision) {
  return new Promise(function(resolve) {
    var prompt = toolInput.prompt || '';
    var agent = decision.opencodeAgent || 'Codex';

    // /ulw 커맨드 래핑으로 ULW 모드 활성화
    prompt = wrapWithUlwCommand(prompt);

    console.error('[OMCM] Routing to OpenCode agent: ' + agent);
    console.error('[OMCM] Prompt wrapped with /ulw command');
    console.error('[OMCM] Reason: ' + decision.reason);

    // 'run' 서브커맨드 사용 + --agent 플래그 + 프롬프트를 인자로 전달
    var args = ['run', '--agent', agent, prompt];

    var child = spawn('opencode', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: Object.assign({}, process.env, { OPENCODE_NON_INTERACTIVE: '1' })
    });

    var stdout = '';
    var stderr = '';

    child.stdout.on('data', function(data) {
      stdout += data.toString();
      // 출력 스트리밍
      process.stderr.write(data);
    });

    child.stderr.on('data', function(data) {
      stderr += data.toString();
    });

    child.on('close', function(code) {
      if (code === 0) {
        resolve({ success: true, output: stdout, stderr: stderr });
      } else {
        resolve({ success: false, error: 'Exit code ' + code, output: stdout, stderr: stderr });
      }
    });

    child.on('error', function(err) {
      resolve({ success: false, error: err.message });
    });

    // 5분 타임아웃
    setTimeout(function() {
      child.kill('SIGTERM');
      resolve({ success: false, error: 'Timeout after 5 minutes' });
    }, 5 * 60 * 1000);
  });
}

/**
 * 메인 훅 핸들러
 */
async function main() {
  // stdin 읽기
  var input = '';
  for await (var chunk of process.stdin) {
    input += chunk;
  }

  try {
    var data = JSON.parse(input);
    var toolName = data.tool_name || '';
    var toolInput = data.tool_input || {};

    // Task 도구만 처리
    if (toolName !== 'Task') {
      console.log(JSON.stringify({ allow: true }));
      return;
    }

    // 라우팅 결정 확인
    var decision = shouldRouteToOpenCode(toolInput);

    // 결정 로깅
    logRouting({
      toolName: toolName,
      subagentType: toolInput.subagent_type,
      decision: decision.route ? 'opencode' : 'claude',
      reason: decision.reason,
      target: decision.targetModel ? decision.targetModel.id : 'claude'
    });

    if (decision.route) {
      console.error('[OMCM Fusion] Routing Task to OpenCode');
      var targetName = decision.targetModel && decision.targetModel.name
        ? decision.targetModel.name
        : 'OpenCode';
      console.error('[OMCM Fusion] Target: ' + targetName);
      console.error('[OMCM Fusion] Agent: ' + decision.opencodeAgent);
      console.error('[OMCM Fusion] Reason: ' + decision.reason);

      // OpenCode를 통해 실행
      var result = await executeViaOpenCode(toolInput, decision);

      // 퓨전 상태 업데이트
      updateFusionState(decision, result);

      if (result.success) {
        // 원래 Task 호출 차단 - OpenCode를 통해 처리됨
        var outputPreview = result.output ? result.output.slice(0, 500) : 'Completed';
        console.log(JSON.stringify({
          allow: false,
          reason: 'Task executed via OpenCode (' + decision.opencodeAgent + '). Result: Success',
          message: outputPreview
        }));
      } else {
        // OpenCode 실패 - Claude로 폴스루
        console.error('[OMCM Fusion] OpenCode failed: ' + result.error);
        console.error('[OMCM Fusion] Falling through to Claude');
        updateFusionState({ route: false }, null);
        console.log(JSON.stringify({ allow: true }));
      }
    } else {
      // Claude 실행을 위한 상태 업데이트
      updateFusionState(decision, null);
      console.log(JSON.stringify({ allow: true }));
    }
  } catch (e) {
    console.error('[OMCM Fusion] Error: ' + e.message);
    console.log(JSON.stringify({ allow: true }));
  }
}

main();
