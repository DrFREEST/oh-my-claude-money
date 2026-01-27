#!/usr/bin/env node
/**
 * fusion-router.mjs - PreToolUse Hook for FULL Task routing
 *
 * When fallback is active, intercepts Task calls and routes to OpenCode
 */

import {
  shouldRouteToOpenCode,
  mapAgentToOpenCode,
  updateFusionState,
  logRouting
} from '../src/hooks/fusion-router-logic.mjs';
import { runWithServer } from '../src/executor/opencode-server.mjs';

/**
 * OpenCode를 통해 작업 실행 (서버 모드)
 */
async function executeViaOpenCode(toolInput, decision) {
  var prompt = toolInput.prompt || '';
  var agent = decision.opencodeAgent || 'Codex';

  console.error('[OMCM] Routing to OpenCode agent: ' + agent);
  console.error('[OMCM] Using serve mode for faster execution');
  console.error('[OMCM] Reason: ' + decision.reason);

  try {
    var result = await runWithServer(prompt, {
      agent: agent,
      timeout: 5 * 60 * 1000
    });

    return {
      success: true,
      output: result.stdout || JSON.stringify(result.result || result),
      stderr: result.stderr || ''
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
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
