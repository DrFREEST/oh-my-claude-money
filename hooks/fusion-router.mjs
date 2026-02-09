#!/usr/bin/env node
/**
 * fusion-router.mjs - PreToolUse Hook for FULL Task routing
 *
 * When fallback is active, intercepts Task calls and routes to OpenCode
 * via server pool (HTTP API) instead of spawning new processes.
 *
 * v1.1.0: spawn('opencode', ['run']) → 서버 풀 HTTP API 방식으로 전환
 *         실제 토큰 사용량 기록 (input/output tokens)
 */

import {
  shouldRouteToOpenCode,
  mapAgentToOpenCode,
  wrapWithUlwCommand,
  updateFusionState,
  logRouting,
  applyGeminiFallbackToDecision
} from '../src/hooks/fusion-router-logic.mjs';
import { getSessionIdFromTty } from '../src/utils/session-id.mjs';
import { logOpenCodeCall } from '../src/tracking/call-logger.mjs';
import { executeOnPool, discoverExistingServers } from '../src/pool/server-pool.mjs';

/**
 * OMC 4.0.8 flow-tracer 동적 로드 (best-effort)
 */
var flowTracer = null;
try {
  var HOME = process.env.HOME || '';
  var omcCacheDir = HOME + '/.claude/plugins/cache/omc/oh-my-claudecode';
  var fs = await import('fs');
  var path = await import('path');
  if (fs.existsSync(omcCacheDir)) {
    var versions = fs.readdirSync(omcCacheDir)
      .filter(function(f) { return /^\d+\.\d+\.\d+$/.test(f); })
      .sort()
      .reverse();
    for (var i = 0; i < versions.length; i++) {
      var tracerPath = path.join(omcCacheDir, versions[i], 'dist', 'hooks', 'subagent-tracker', 'flow-tracer.js');
      if (fs.existsSync(tracerPath)) {
        flowTracer = await import(tracerPath);
        break;
      }
    }
  }
} catch (e) {
  // flow-tracer 사용 불가 — 무시
}

/**
 * 내부 모델 ID를 OpenCode providerID/modelID로 변환
 * @param {string} modelId - 내부 모델 ID (예: 'gemini-flash', 'gpt-5.2')
 * @returns {object} - { providerID, modelID }
 */
function toOpenCodeProvider(modelId) {
  var mapping = {
    // v1.1.0 신규 모델 (OMC v4.0.6 호환)
    'gpt-5.3-codex': { providerID: 'openai', modelID: 'gpt-5.3-codex' },
    'gpt-5.3': { providerID: 'openai', modelID: 'gpt-5.3' },
    'gemini-3-pro': { providerID: 'google', modelID: 'antigravity-gemini-3-pro-high' },
    'gemini-3-flash': { providerID: 'google', modelID: 'antigravity-gemini-3-flash' },
    // 하위 호환 (OMO < 3.4.0)
    'gemini-3-pro-preview': { providerID: 'google', modelID: 'antigravity-gemini-3-pro-high' },
    'gemini-3-flash-preview': { providerID: 'google', modelID: 'antigravity-gemini-3-flash' },
    // 하위 호환
    'gemini-flash': { providerID: 'google', modelID: 'antigravity-gemini-3-flash' },
    'gemini-pro': { providerID: 'google', modelID: 'antigravity-gemini-3-pro-high' },
    'gpt-5.2': { providerID: 'openai', modelID: 'gpt-5.2' },
    'gpt-5.2-codex': { providerID: 'openai', modelID: 'gpt-5.2-codex' }
  };
  return mapping[modelId] || { providerID: 'openai', modelID: 'gpt-5.3-codex' };
}

/**
 * OpenCode 서버 풀을 통해 작업 실행 (HTTP API 방식)
 * @param {object} toolInput - 도구 입력
 * @param {object} decision - 라우팅 결정
 * @returns {Promise<object>} - { success, output, tokens, error }
 */
async function executeViaOpenCode(toolInput, decision) {
  var prompt = toolInput.prompt || '';
  var agent = decision.opencodeAgent || 'Codex';

  // 모델 결정
  var internalModelId = decision.targetModel && decision.targetModel.id
    ? decision.targetModel.id
    : 'gpt-5.3-codex';
  var provider = toOpenCodeProvider(internalModelId);

  // /ulw 커맨드 래핑
  prompt = wrapWithUlwCommand(prompt);

  console.error('[OMCM] Routing to OpenCode (Server Pool)');
  console.error('[OMCM] Provider: ' + provider.providerID + '/' + provider.modelID);
  console.error('[OMCM] Agent: ' + agent);
  console.error('[OMCM] Reason: ' + decision.reason);

  var startTime = Date.now();

  // 서버 풀에서 실행
  var result = await executeOnPool({
    prompt: prompt,
    providerID: provider.providerID,
    modelID: provider.modelID,
    agent: agent,
    timeout: 5 * 60 * 1000  // 5분 타임아웃
  });

  var duration = Date.now() - startTime;

  if (result.success) {
    console.error('[OMCM] OpenCode completed via pool (port ' + result.serverPort + ')');
    if (result.tokens) {
      console.error('[OMCM] Tokens: input=' + result.tokens.input + ' output=' + result.tokens.output);
    }
  } else {
    console.error('[OMCM] OpenCode failed: ' + result.error);
  }

  return {
    success: result.success,
    output: result.output || '',
    tokens: result.tokens || null,
    error: result.error || null,
    duration: duration,
    serverPort: result.serverPort || 0
  };
}

/**
 * 메인 훅 핸들러
 */
async function main() {
  var hookStartTime = Date.now();

  // stdin 읽기
  var input = '';
  for await (var chunk of process.stdin) {
    input += chunk;
  }

  try {
    var data = JSON.parse(input);
    var toolName = data.tool_name || data.toolName || '';
    var toolInput = data.tool_input || data.toolInput || {};

    // 세션 ID 획득
    var sessionId = null;
    try {
      sessionId = getSessionIdFromTty();
    } catch (e) {
      // 세션 ID 획득 실패 시 글로벌 모드
    }

    // flow-tracer: hook fire 기록
    if (flowTracer) {
      try {
        var cwd = process.cwd();
        flowTracer.recordHookFire(cwd, sessionId, 'omcm-fusion-router', 'PreToolUse');
      } catch (e) {
        // 무시
      }
    }

    // Task 도구만 처리
    if (toolName !== 'Task') {
      console.log(JSON.stringify({ allow: true }));
      return;
    }

    // 라우팅 결정 확인
    var decision = shouldRouteToOpenCode(toolInput);

    // Gemini rate limit 폴백 적용 (Gemini → OpenAI 자동 대체)
    if (decision.route) {
      decision = applyGeminiFallbackToDecision(decision);
      if (decision.geminiRateLimit && decision.geminiRateLimit.fallbackApplied) {
        var resetTime = decision.geminiRateLimit.earliestReset
          ? new Date(decision.geminiRateLimit.earliestReset).toISOString()
          : 'unknown';
        console.error('[OMCM Fusion] Gemini rate-limited → OpenAI fallback applied');
        console.error('[OMCM Fusion] Original: ' + (decision.originalAgent || '?') + ' → Fallback: ' + decision.opencodeAgent);
        console.error('[OMCM Fusion] Gemini reset at: ' + resetTime);
      }
    }

    // 결정 로깅
    logRouting({
      toolName: toolName,
      subagentType: toolInput.subagent_type,
      decision: decision.route ? 'opencode' : 'claude',
      reason: decision.reason,
      target: decision.targetModel ? decision.targetModel.id : 'claude'
    });

    // flow-tracer: hook result 기록
    if (flowTracer) {
      try {
        var cwd = process.cwd();
        var hookDuration = Date.now() - hookStartTime;
        var routingInfo = decision.route
          ? 'routed:opencode:' + (decision.opencodeAgent || 'unknown')
          : 'passed:claude';
        flowTracer.recordHookResult(cwd, sessionId, 'omcm-fusion-router', 'PreToolUse', hookDuration, true, routingInfo.length);
      } catch (e) {
        // 무시
      }
    }

    if (decision.route) {
      console.error('[OMCM Fusion] Routing Task to OpenCode');
      var targetName = decision.targetModel && decision.targetModel.name
        ? decision.targetModel.name
        : 'OpenCode';
      console.error('[OMCM Fusion] Target: ' + targetName);
      console.error('[OMCM Fusion] Agent: ' + decision.opencodeAgent);
      console.error('[OMCM Fusion] Reason: ' + decision.reason);

      // 기존 서버 자동 감지 (이미 실행 중인 opencode serve)
      await discoverExistingServers();

      // OpenCode 서버 풀을 통해 실행
      var result = await executeViaOpenCode(toolInput, decision);

      // 세션별 호출 로깅 (실제 토큰 데이터 포함)
      if (sessionId) {
        var provider = 'openai';
        var targetModelId = decision.targetModel && decision.targetModel.id
          ? decision.targetModel.id
          : '';
        // 폴백 적용되지 않은 경우에만 Gemini로 분류
        // (폴백 적용 시 targetModel이 이미 OpenAI로 변경됨)
        var isFallbackApplied = decision.geminiRateLimit && decision.geminiRateLimit.fallbackApplied;
        if (!isFallbackApplied && (targetModelId.indexOf('gemini') !== -1 || targetModelId.indexOf('flash') !== -1 || targetModelId.indexOf('pro') !== -1)) {
          provider = 'gemini';
        }

        var callData = {
          provider: provider,
          model: targetModelId,
          agent: decision.opencodeAgent || '',
          success: result.success,
          source: 'fusion-router',
          duration: result.duration || 0,
          serverPort: result.serverPort || 0
        };

        // 실제 토큰 데이터가 있으면 사용 (서버 풀 HTTP 응답에서 획득)
        if (result.tokens) {
          callData.inputTokens = result.tokens.input || 0;
          callData.outputTokens = result.tokens.output || 0;
          callData.reasoningTokens = result.tokens.reasoning || 0;
          callData.cost = result.tokens.cost || 0;
          callData.actualModelID = result.tokens.modelID || '';
          callData.actualProviderID = result.tokens.providerID || '';
        }

        logOpenCodeCall(sessionId, callData);
      }

      // 퓨전 상태 업데이트
      updateFusionState(decision, result, sessionId);

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
        updateFusionState({ route: false }, null, sessionId);
        console.log(JSON.stringify({ allow: true }));
      }
    } else {
      // Claude 실행을 위한 상태 업데이트
      updateFusionState(decision, null, sessionId);
      console.log(JSON.stringify({ allow: true }));
    }
  } catch (e) {
    console.error('[OMCM Fusion] Error: ' + e.message);
    console.log(JSON.stringify({ allow: true }));
  }
}

main();
