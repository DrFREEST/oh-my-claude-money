#!/usr/bin/env node
/**
 * fusion-router.mjs - PreToolUse Hook for FULL Task routing
 *
 * When fallback is active, intercepts Task calls and routes to OpenCode
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, openSync, writeSync, closeSync } from 'fs';
import { join, dirname } from 'path';

const HOME = process.env.HOME || '';
const OMCM_DIR = join(HOME, '.omcm');
const FUSION_STATE_FILE = join(OMCM_DIR, 'fusion-state.json');
const FALLBACK_STATE_FILE = join(OMCM_DIR, 'fallback-state.json');
const PROVIDER_LIMITS_FILE = join(OMCM_DIR, 'provider-limits.json');
const ROUTING_LOG_FILE = join(OMCM_DIR, 'routing-log.jsonl');

/**
 * OMCM 디렉토리 존재 확인 및 생성
 */
function ensureOmcmDir() {
  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }
}

/**
 * JSON 파일 안전 읽기
 */
function readJsonFile(filepath) {
  if (!existsSync(filepath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * 라우팅 결정 로그 기록
 */
function logRouting(decision) {
  ensureOmcmDir();
  var entry = {
    timestamp: new Date().toISOString(),
    toolName: decision.toolName,
    subagentType: decision.subagentType,
    decision: decision.decision,
    reason: decision.reason,
    target: decision.target
  };
  var line = JSON.stringify(entry) + '\n';

  try {
    var fd = openSync(ROUTING_LOG_FILE, 'a');
    writeSync(fd, line);
    closeSync(fd);
  } catch (e) {
    // 로깅 실패 무시
  }
}

/**
 * OMC 에이전트를 OpenCode 에이전트로 매핑
 */
function mapAgentToOpenCode(agentType) {
  var mapping = {
    'architect': 'Oracle',
    'architect-low': 'Flash',
    'architect-medium': 'Oracle',
    'researcher': 'Oracle',
    'researcher-low': 'Flash',
    'designer': 'Flash',
    'designer-low': 'Flash',
    'designer-high': 'Codex',
    'explore': 'Flash',
    'explore-medium': 'Oracle',
    'explore-high': 'Oracle',
    'scientist': 'Oracle',
    'scientist-low': 'Flash',
    'scientist-high': 'Oracle',
    'executor': 'Codex',
    'executor-low': 'Flash',
    'executor-high': 'Codex',
    'writer': 'Flash',
    'planner': 'Oracle',
    'critic': 'Oracle',
    'analyst': 'Oracle',
    'vision': 'Flash',
    'qa-tester': 'Codex',
    'qa-tester-high': 'Codex',
    'security-reviewer': 'Oracle',
    'security-reviewer-low': 'Flash',
    'build-fixer': 'Codex',
    'build-fixer-low': 'Flash',
    'tdd-guide': 'Codex',
    'tdd-guide-low': 'Flash',
    'code-reviewer': 'Oracle',
    'code-reviewer-low': 'Flash'
  };
  return mapping[agentType] || 'Codex';
}

/**
 * OpenCode로 라우팅해야 하는지 확인
 */
function shouldRouteToOpenCode(toolInput) {
  var fusion = readJsonFile(FUSION_STATE_FILE);
  var fallback = readJsonFile(FALLBACK_STATE_FILE);
  var limits = readJsonFile(PROVIDER_LIMITS_FILE);

  // 퓨전 비활성화 상태
  if (!fusion || fusion.enabled === false) {
    return { route: false, reason: 'fusion-disabled' };
  }

  // 폴백 활성화 상태 - 반드시 OpenCode로 라우팅
  if (fallback && fallback.fallbackActive) {
    var currentModel = fallback.currentModel;
    var opencodeAgent = 'Codex';
    if (currentModel && currentModel.opencodeAgent) {
      opencodeAgent = currentModel.opencodeAgent;
    }
    return {
      route: true,
      reason: 'fallback-active',
      targetModel: currentModel,
      opencodeAgent: opencodeAgent
    };
  }

  // Claude 리밋 체크 (90% 임계값)
  if (limits && limits.claude) {
    var fiveHourPercent = 0;
    var weeklyPercent = 0;

    if (limits.claude.fiveHour && typeof limits.claude.fiveHour.percent === 'number') {
      fiveHourPercent = limits.claude.fiveHour.percent;
    }
    if (limits.claude.weekly && typeof limits.claude.weekly.percent === 'number') {
      weeklyPercent = limits.claude.weekly.percent;
    }

    var maxPercent = Math.max(fiveHourPercent, weeklyPercent);

    if (maxPercent >= 90) {
      return {
        route: true,
        reason: 'claude-limit-' + maxPercent + '%',
        targetModel: { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
        opencodeAgent: 'Codex'
      };
    }
  }

  // 토큰 절약 모드에서 특정 에이전트 타입 라우팅
  if (toolInput && toolInput.subagent_type && fusion.mode === 'save-tokens') {
    var agentType = toolInput.subagent_type.replace('oh-my-claudecode:', '');
    var tokenSavingAgents = ['architect', 'researcher', 'designer', 'explore', 'scientist'];

    var shouldSave = false;
    for (var i = 0; i < tokenSavingAgents.length; i++) {
      if (agentType === tokenSavingAgents[i]) {
        shouldSave = true;
        break;
      }
    }

    if (shouldSave) {
      return {
        route: true,
        reason: 'token-saving-agent-' + agentType,
        targetModel: { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
        opencodeAgent: mapAgentToOpenCode(agentType)
      };
    }
  }

  return { route: false, reason: 'no-routing-needed' };
}

/**
 * OpenCode를 통해 작업 실행
 */
function executeViaOpenCode(toolInput, decision) {
  return new Promise(function(resolve) {
    var prompt = toolInput.prompt || '';
    var agent = decision.opencodeAgent || 'Codex';

    console.error('[OMCM] Routing to OpenCode agent: ' + agent);
    console.error('[OMCM] Reason: ' + decision.reason);

    var args = ['-a', agent];

    var child = spawn('opencode', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
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

    // 프롬프트 전송
    child.stdin.write(prompt);
    child.stdin.end();

    // 5분 타임아웃
    setTimeout(function() {
      child.kill('SIGTERM');
      resolve({ success: false, error: 'Timeout after 5 minutes' });
    }, 5 * 60 * 1000);
  });
}

/**
 * 퓨전 상태 업데이트
 */
function updateFusionState(decision, result) {
  ensureOmcmDir();

  var state = readJsonFile(FUSION_STATE_FILE);
  if (!state) {
    state = {
      enabled: true,
      mode: 'balanced',
      totalTasks: 0,
      routedToOpenCode: 0,
      routingRate: 0,
      estimatedSavedTokens: 0,
      byProvider: { gemini: 0, openai: 0, anthropic: 0 }
    };
  }

  state.totalTasks++;

  if (decision.route) {
    state.routedToOpenCode++;
    state.estimatedSavedTokens += 1000; // 작업당 약 1000 토큰 절약 추정

    // 프로바이더별 추적
    var model = decision.targetModel ? decision.targetModel.id : '';
    var agent = decision.opencodeAgent || '';

    if (model.indexOf('gemini') !== -1 || agent === 'Flash') {
      state.byProvider.gemini++;
    } else if (model.indexOf('gpt') !== -1 || model.indexOf('codex') !== -1) {
      state.byProvider.openai++;
    }
  } else {
    state.byProvider.anthropic++;
  }

  state.routingRate = state.totalTasks > 0
    ? Math.round((state.routedToOpenCode / state.totalTasks) * 100)
    : 0;
  state.lastUpdated = new Date().toISOString();

  writeFileSync(FUSION_STATE_FILE, JSON.stringify(state, null, 2));
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
