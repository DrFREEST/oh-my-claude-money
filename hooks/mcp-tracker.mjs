#!/usr/bin/env node
/**
 * mcp-tracker.mjs - PostToolUse Hook for OMC MCP-Direct call tracking
 *
 * OMC v4.0.6의 mcp__x__ask_codex, mcp__g__ask_gemini 등
 * MCP-Direct 호출을 감지하고 비용을 추적합니다.
 *
 * @version 1.1.0
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, writeSync, closeSync } from 'fs';
import { join } from 'path';
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
 * MCP 추적 상태 업데이트
 */
function updateMcpTracking(classification) {
  ensureOmcmDir();
  var tracking = readJsonFile(MCP_TRACKING_FILE) || {
    totalCalls: 0,
    byProvider: { openai: 0, google: 0, omc: 0 },
    byAction: {},
    codexCalls: 0,
    geminiCalls: 0,
    lastUpdated: null
  };

  tracking.totalCalls++;

  if (classification.provider === 'openai') {
    tracking.byProvider.openai++;
    if (classification.action === 'ask_codex') tracking.codexCalls++;
  } else if (classification.provider === 'google') {
    tracking.byProvider.google++;
    if (classification.action === 'ask_gemini') tracking.geminiCalls++;
  } else if (classification.provider === 'omc') {
    tracking.byProvider.omc++;
  }

  var actionKey = classification.type + '.' + classification.action;
  tracking.byAction[actionKey] = (tracking.byAction[actionKey] || 0) + 1;
  tracking.lastUpdated = new Date().toISOString();

  writeFileSync(MCP_TRACKING_FILE, JSON.stringify(tracking, null, 2));
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
      process.exit(0);
    }

    var sessionId = null;
    try {
      var sessionModule = await import('../src/utils/session-id.mjs');
      sessionId = sessionModule.getSessionIdFromTty();
    } catch (e) {
      // 무시
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

    if (classification.action === 'wait_for_job' && toolOutput) {
      try {
        var outputData = typeof toolOutput === 'string' ? JSON.parse(toolOutput) : toolOutput;
        if (outputData.tokens) logEntry.tokens = outputData.tokens;
      } catch (e) {
        // 파싱 실패 무시
      }
    }

    logMcpCall(logEntry);
    updateMcpTracking(classification);
  } catch (e) {
    // 오류 시 조용히 종료
  }
  process.exit(0);
}

main();
