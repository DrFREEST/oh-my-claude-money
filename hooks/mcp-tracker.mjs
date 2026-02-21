#!/usr/bin/env node
/**
 * mcp-tracker.mjs - PostToolUse Hook for OMC MCP-Direct call tracking
 *
 * OMC v4.0.10의 mcp__x__ask_codex, mcp__g__ask_gemini 등
 * MCP-Direct 호출을 감지하고 토큰/비용을 추적합니다.
 *
 * @version 1.2.0
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, writeSync, closeSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

var HOME = homedir();
var OMCM_DIR = join(HOME, '.omcm');
var MCP_TRACKING_FILE = join(OMCM_DIR, 'mcp-tracking.json');
var MCP_LOG_FILE = join(OMCM_DIR, 'mcp-calls.jsonl');

function ensureOmcmDir() {
  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }
}

function readJsonFile(filepath) {
  if (!existsSync(filepath)) return null;
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * MCP 호출 유형 판별
 */
function classifyMcpCall(toolName) {
  if (!toolName) return null;

  // OMC 4.1.0+ 형식: mcp__plugin_oh-my-claudecode_x__ask_codex
  if (toolName.indexOf('mcp__plugin_oh-my-claudecode_x__') === 0) {
    return { provider: 'openai', type: 'codex', action: toolName.replace('mcp__plugin_oh-my-claudecode_x__', '') };
  }
  if (toolName.indexOf('mcp__plugin_oh-my-claudecode_g__') === 0) {
    return { provider: 'google', type: 'gemini', action: toolName.replace('mcp__plugin_oh-my-claudecode_g__', '') };
  }
  // 레거시 형식 (OMC 4.0.10 이하): mcp__x__ask_codex
  if (toolName.indexOf('mcp__x__') === 0) {
    return { provider: 'openai', type: 'codex', action: toolName.replace('mcp__x__', '') };
  }
  if (toolName.indexOf('mcp__g__') === 0) {
    return { provider: 'google', type: 'gemini', action: toolName.replace('mcp__g__', '') };
  }
  if (toolName.indexOf('mcp__t__') === 0) {
    return { provider: 'omc', type: 'tools', action: toolName.replace('mcp__t__', '') };
  }
  return null;
}

/**
 * MCP 호출 로깅 (JSONL append)
 */
function logMcpCall(entry) {
  ensureOmcmDir();
  var line = JSON.stringify(entry) + '\n';
  try {
    var fd = openSync(MCP_LOG_FILE, 'a');
    writeSync(fd, line);
    closeSync(fd);
  } catch (e) {
    // 로깅 실패 무시
  }
}

/**
 * Response File 경로에서 Status File 경로 추출
 */
function extractStatusFilePath(responseFilePath) {
  if (!responseFilePath) return null;
  var dir = dirname(responseFilePath);
  var filename = responseFilePath.split('/').pop();

  if (filename.indexOf('codex-response-') === 0) {
    return join(dir, filename.replace('codex-response-', 'codex-status-').replace('.md', '.json'));
  }
  if (filename.indexOf('gemini-response-') === 0) {
    return join(dir, filename.replace('gemini-response-', 'gemini-status-').replace('.md', '.json'));
  }
  return null;
}

/**
 * tool_output에서 파일 경로 추출
 */
function extractFilePathFromOutput(toolOutput, marker) {
  if (!toolOutput || typeof toolOutput !== 'string') return null;
  var markerIndex = toolOutput.indexOf(marker);
  if (markerIndex === -1) return null;

  var afterMarker = toolOutput.substring(markerIndex + marker.length);
  var lines = afterMarker.split('\n');
  if (lines.length === 0) return null;

  var pathLine = lines[0].trim();
  return pathLine || null;
}

/**
 * Status File에서 토큰 데이터 읽기
 */
function readTokensFromStatusFile(statusFilePath) {
  if (!statusFilePath || !existsSync(statusFilePath)) return null;

  var statusData = readJsonFile(statusFilePath);
  if (!statusData) return null;

  var result = {};
  if (statusData.tokens) {
    if (statusData.tokens.input) result.inputTokens = statusData.tokens.input;
    if (statusData.tokens.output) result.outputTokens = statusData.tokens.output;
    if (statusData.tokens.reasoning) result.reasoningTokens = statusData.tokens.reasoning;
  }
  if (statusData.cost) result.cost = statusData.cost;
  if (statusData.modelID) result.model = statusData.modelID;

  return result;
}

/**
 * job_id로 Status File 탐색
 */
function findStatusFileByJobId(jobId, workingDir) {
  if (!jobId || !workingDir) return null;

  var promptsDir = join(workingDir, '.omc', 'prompts');
  if (!existsSync(promptsDir)) return null;

  try {
    var files = readdirSync(promptsDir);
    var statusFiles = files.filter(function(f) {
      return f.indexOf('-status-') !== -1 && f.indexOf('.json') !== -1;
    });

    for (var i = 0; i < statusFiles.length; i++) {
      var filepath = join(promptsDir, statusFiles[i]);
      var data = readJsonFile(filepath);
      if (data && data.jobId === jobId) {
        return filepath;
      }
    }
  } catch (e) {
    // 무시
  }

  return null;
}

/**
 * 최근 Status File 탐색 (fallback)
 */
function findRecentStatusFile(workingDir, provider) {
  if (!workingDir) return null;

  var promptsDir = join(workingDir, '.omc', 'prompts');
  if (!existsSync(promptsDir)) return null;

  try {
    var prefix = provider === 'openai' ? 'codex-status-' : 'gemini-status-';
    var files = readdirSync(promptsDir);
    var statusFiles = files.filter(function(f) {
      return f.indexOf(prefix) === 0 && f.indexOf('.json') !== -1;
    });

    if (statusFiles.length === 0) return null;

    var sorted = statusFiles.map(function(f) {
      var filepath = join(promptsDir, f);
      return { path: filepath, mtime: statSync(filepath).mtime.getTime() };
    }).sort(function(a, b) {
      return b.mtime - a.mtime;
    });

    return sorted[0].path;
  } catch (e) {
    return null;
  }
}

/**
 * MCP-First 메트릭 업데이트
 */
function updateMcpFirstMetrics() {
  var fusionStatePath = join(HOME, '.omcm', 'fusion-state.json');
  try {
    var state = {};
    if (existsSync(fusionStatePath)) {
      state = JSON.parse(readFileSync(fusionStatePath, 'utf-8'));
    }
    if (!state.mcpFirst) {
      state.mcpFirst = {
        totalEligible: 0,
        actualMcpCalls: 0,
        blockedAndRedirected: 0,
        leakedToTask: 0,
        utilizationRate: 0
      };
    }
    state.mcpFirst.actualMcpCalls++;
    if (state.mcpFirst.totalEligible > 0) {
      state.mcpFirst.utilizationRate = Math.round(
        (state.mcpFirst.actualMcpCalls / state.mcpFirst.totalEligible) * 100
      );
    }
    writeFileSync(fusionStatePath, JSON.stringify(state, null, 2));
  } catch (e) {
    // 메트릭 업데이트 실패 무시
  }
}

/**
 * MCP 추적 상태 업데이트
 */
function updateMcpTracking(classification, tokenData) {
  ensureOmcmDir();
  var tracking = readJsonFile(MCP_TRACKING_FILE) || {
    totalCalls: 0,
    byProvider: {
      openai: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      google: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      omc: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 }
    },
    byAction: {},
    codexCalls: 0,
    geminiCalls: 0,
    lastUpdated: null
  };

  // 이전 버전 호환성
  if (typeof tracking.byProvider.openai === 'number') {
    tracking.byProvider = {
      openai: { calls: tracking.byProvider.openai || 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      google: { calls: tracking.byProvider.google || 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      omc: { calls: tracking.byProvider.omc || 0, inputTokens: 0, outputTokens: 0, cost: 0 }
    };
  }

  tracking.totalCalls++;

  var providerData = tracking.byProvider[classification.provider];
  providerData.calls++;

  if (tokenData) {
    if (tokenData.inputTokens) providerData.inputTokens += tokenData.inputTokens;
    if (tokenData.outputTokens) providerData.outputTokens += tokenData.outputTokens;
    if (tokenData.cost) providerData.cost += tokenData.cost;
  }

  if (classification.provider === 'openai' && classification.action === 'ask_codex') {
    tracking.codexCalls++;
  }
  if (classification.provider === 'google' && classification.action === 'ask_gemini') {
    tracking.geminiCalls++;
  }

  var actionKey = classification.type + '.' + classification.action;
  tracking.byAction[actionKey] = (tracking.byAction[actionKey] || 0) + 1;
  tracking.lastUpdated = new Date().toISOString();

  writeFileSync(MCP_TRACKING_FILE, JSON.stringify(tracking, null, 2));

  // MCP-First 메트릭 업데이트 (ask_codex/ask_gemini 호출 시)
  if (classification.action === 'ask_codex' || classification.action === 'ask_gemini') {
    updateMcpFirstMetrics();
  }
}

async function main() {
  var input = '';
  for await (var chunk of process.stdin) {
    input += chunk;
  }

  try {
    var data = JSON.parse(input);
    var toolName = data.tool_name || data.toolName || '';
    var toolInput = data.tool_input || data.toolInput || {};
    var toolOutput = data.tool_output || data.toolOutput || '';

    var classification = classifyMcpCall(toolName);
    if (!classification) {
      try { process.stdout.write(JSON.stringify({ suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
      process.exit(0);
    }

    // Flow Tracer 통합 (best-effort)
    var flowTracer = null;
    try {
      flowTracer = await import('../src/orchestration/flow-tracer.mjs');
      if (flowTracer && flowTracer.recordHookFire) {
        flowTracer.recordHookFire('mcp-tracker', 'PostToolUse', { tool: toolName });
      }
    } catch (e) {
      // 무시
    }

    var sessionId = null;
    try {
      var sessionModule = await import('../src/utils/session-id.mjs');
      sessionId = sessionModule.getSessionIdFromTty();
    } catch (e) {
      // 무시
    }

    var workingDir = process.env.PWD || process.cwd();
    var tokenData = null;

    // 토큰 추출 로직
    if (classification.action === 'ask_codex' || classification.action === 'ask_gemini') {
      // 1. Status File 경로 직접 추출 시도
      var statusFilePath = extractFilePathFromOutput(toolOutput, '**Status File:**');

      // 2. Response File에서 Status File 경로 변환
      if (!statusFilePath) {
        var responseFilePath = extractFilePathFromOutput(toolOutput, '**Response File:**');
        statusFilePath = extractStatusFilePath(responseFilePath);
      }

      // 3. Status File 읽기
      if (statusFilePath) {
        tokenData = readTokensFromStatusFile(statusFilePath);
      }

      // 4. Fallback: 최근 파일 탐색
      if (!tokenData) {
        var recentStatusFile = findRecentStatusFile(workingDir, classification.provider);
        if (recentStatusFile) {
          tokenData = readTokensFromStatusFile(recentStatusFile);
        }
      }
    }

    // wait_for_job에서 토큰 추출
    if (classification.action === 'wait_for_job' && toolOutput) {
      try {
        var outputData = typeof toolOutput === 'string' ? JSON.parse(toolOutput) : toolOutput;

        if (outputData.tokens) {
          tokenData = {
            inputTokens: outputData.tokens.input || 0,
            outputTokens: outputData.tokens.output || 0,
            reasoningTokens: outputData.tokens.reasoning || 0,
            cost: outputData.cost || 0
          };
        } else if (outputData.jobId) {
          // job_id로 Status File 탐색
          var statusFilePath = findStatusFileByJobId(outputData.jobId, workingDir);
          if (statusFilePath) {
            tokenData = readTokensFromStatusFile(statusFilePath);
          }
        }
      } catch (e) {
        // 파싱 실패 무시
      }
    }

    var logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      tool: toolName,
      provider: classification.provider,
      type: classification.type,
      action: classification.action
    };

    if (classification.action === 'ask_codex' || classification.action === 'ask_gemini') {
      if (toolInput.model) logEntry.model = toolInput.model;
      if (toolInput.agent_role) logEntry.agentRole = toolInput.agent_role;
      if (toolInput.background) logEntry.background = true;
    }

    if (tokenData) {
      logEntry.tokens = tokenData;
    }

    logMcpCall(logEntry);
    updateMcpTracking(classification, tokenData);

    // Flow Tracer 결과 기록
    if (flowTracer && flowTracer.recordHookResult) {
      flowTracer.recordHookResult('mcp-tracker', 'PostToolUse', {
        tool: toolName,
        provider: classification.provider,
        tokensExtracted: !!tokenData
      });
    }
  } catch (e) {
    // 오류 시 조용히 종료
  }
  try { process.stdout.write(JSON.stringify({ suppressOutput: true }) + '\n'); } catch (_e) { /* EPIPE */ }
  process.exit(0);
}

main();
