/**
 * fusion-router-main.mjs - PreToolUse Hook 메인 로직
 *
 * fusion-router.mjs (thin shim)에서 stdin을 읽고 env var로 전달한 뒤
 * 이 파일을 동적 import합니다. static import가 stdin을 소비하는 문제를 방지하기 위한 구조.
 *
 * v1.1.0: spawn('opencode', ['run']) → 서버 풀 HTTP API 방식으로 전환
 * v1.4.5: thin shim 분리 — stdin 소비 버그 수정
 * v2.0.0: OpenCode 서버 풀 → Codex/Gemini CLI 직접 spawn 전환
 */

import {
  shouldRouteToOpenCode,
  updateFusionState,
  logRouting,
  applyGeminiFallbackToDecision
} from '../src/hooks/fusion-router-logic.mjs';
import { getSessionIdFromTty } from '../src/utils/session-id.mjs';
import { logOpenCodeCall } from '../src/tracking/call-logger.mjs';
import { executeViaCLI } from '../src/executor/cli-executor.mjs';

/**
 * OMC 4.0.8+ flow-tracer 동적 로드 (best-effort)
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
 * 내부 모델 ID에서 CLI provider를 결정
 * Gemini 계열 → 'google', 나머지 → 'openai'
 * 실제 모델명은 CLI 기본값에 위임 (내장 폴백 체인 사용)
 *
 * @param {string} modelId - 내부 모델 ID (예: 'gemini-3-pro', 'gpt-5.3-codex')
 * @returns {string} - 'google' 또는 'openai'
 */
function resolveProvider(modelId) {
  if (modelId && (modelId.indexOf('gemini') !== -1 || modelId.indexOf('flash') !== -1)) {
    return 'google';
  }
  return 'openai';
}

/**
 * Codex/Gemini CLI를 통해 작업 실행
 * @param {object} toolInput - 도구 입력
 * @param {object} decision - 라우팅 결정
 * @returns {Promise<object>} - { success, output, tokens, error, duration, provider }
 */
async function executeFusionCLI(toolInput, decision) {
  var prompt = toolInput.prompt || '';
  var agent = decision.opencodeAgent || 'Codex';

  // 모델 결정
  var internalModelId = decision.targetModel && decision.targetModel.id
    ? decision.targetModel.id
    : 'gpt-5.3-codex';
  var provider = resolveProvider(internalModelId);

  console.error('[OMCM] Routing to CLI (' + provider + ')');
  console.error('[OMCM] Model hint: ' + internalModelId);
  console.error('[OMCM] Agent: ' + agent);
  console.error('[OMCM] Reason: ' + decision.reason);

  // CLI 직접 실행 (모델은 CLI 기본값에 위임)
  var result = await executeViaCLI({
    prompt: prompt,
    provider: provider,
    agent: agent,
    timeout: 5 * 60 * 1000,  // 5분 타임아웃
    cwd: process.cwd()
  });

  if (result.success) {
    console.error('[OMCM] CLI completed (' + result.provider + ')');
    if (result.tokens) {
      console.error('[OMCM] Tokens: input=' + result.tokens.input + ' output=' + result.tokens.output);
    }
  } else {
    console.error('[OMCM] CLI failed: ' + result.error);
  }

  return result;
}

/**
 * 메인 훅 핸들러
 */
async function main() {
  var hookStartTime = Date.now();

  // stdin은 shim(fusion-router.mjs)에서 환경변수로 전달됨
  var input = process.env.__OMCM_FUSION_STDIN || '';

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
      console.error('[OMCM Fusion] Routing Task to CLI');
      var targetName = decision.targetModel && decision.targetModel.name
        ? decision.targetModel.name
        : 'CLI';
      console.error('[OMCM Fusion] Target: ' + targetName);
      console.error('[OMCM Fusion] Agent: ' + decision.opencodeAgent);
      console.error('[OMCM Fusion] Reason: ' + decision.reason);

      // Codex/Gemini CLI 직접 실행
      var result = await executeFusionCLI(toolInput, decision);

      // 세션별 호출 로깅 (실제 토큰 데이터 포함)
      if (sessionId) {
        var logProvider = result.provider || 'openai';
        var targetModelId = decision.targetModel && decision.targetModel.id
          ? decision.targetModel.id
          : '';

        var callData = {
          provider: logProvider,
          model: targetModelId,
          agent: decision.opencodeAgent || '',
          success: result.success,
          source: 'fusion-cli',
          duration: result.duration || 0
        };

        // 실제 토큰 데이터가 있으면 사용 (CLI stdout JSONL에서 파싱)
        if (result.tokens) {
          callData.inputTokens = result.tokens.input || 0;
          callData.outputTokens = result.tokens.output || 0;
          callData.reasoningTokens = result.tokens.reasoning || 0;
          callData.cacheReadTokens = result.tokens.cacheRead || 0;
        }

        logOpenCodeCall(sessionId, callData);
      }

      // 퓨전 상태 업데이트
      updateFusionState(decision, result, sessionId);

      if (result.success) {
        // 원래 Task 호출 차단 - CLI를 통해 처리됨
        var outputPreview = result.output ? result.output.slice(0, 500) : 'Completed';
        console.log(JSON.stringify({
          allow: false,
          reason: 'Task executed via CLI (' + decision.opencodeAgent + '). Result: Success',
          message: outputPreview
        }));
      } else {
        // CLI 실패 - Claude로 폴스루
        console.error('[OMCM Fusion] CLI failed: ' + result.error);
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
