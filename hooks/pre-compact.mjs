#!/usr/bin/env node
/**
 * pre-compact.mjs - PreCompact 이벤트 안전 패스스루
 *
 * compaction 직전 이벤트를 최소 로깅/상태 저장한 뒤 항상 continue 처리합니다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, writeSync, closeSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

var EVENT_NAME = 'PreCompact';
var HOOKS_DIR = join(homedir(), '.omcm', 'hooks');
var STATE_FILE = join(HOOKS_DIR, 'lifecycle-state.json');
var LOG_FILE = join(HOOKS_DIR, 'lifecycle-events.jsonl');

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

function ensureHooksDir() {
  if (!existsSync(HOOKS_DIR)) {
    mkdirSync(HOOKS_DIR, { recursive: true });
  }
}

function safeParseJson(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawInput);
  } catch (_e) {
    return {};
  }
}

function safeReadState() {
  if (!existsSync(STATE_FILE)) {
    return {
      updatedAt: null,
      counters: {},
      lastEventByType: {}
    };
  }

  try {
    var parsed = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('invalid state');
    }

    if (!parsed.counters || typeof parsed.counters !== 'object') {
      parsed.counters = {};
    }
    if (!parsed.lastEventByType || typeof parsed.lastEventByType !== 'object') {
      parsed.lastEventByType = {};
    }

    return parsed;
  } catch (_e) {
    return {
      updatedAt: null,
      counters: {},
      lastEventByType: {}
    };
  }
}

function truncateText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }

  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength) + '...';
}

function getSessionId(input) {
  if (input && input.session_id) {
    return input.session_id;
  }
  if (input && input.sessionId) {
    return input.sessionId;
  }
  return null;
}

function getCwd(input) {
  if (input && input.cwd) {
    return input.cwd;
  }
  if (input && input.working_directory) {
    return input.working_directory;
  }
  if (input && input.workingDirectory) {
    return input.workingDirectory;
  }
  return null;
}

function getReason(input) {
  if (input && typeof input.reason === 'string') {
    return input.reason;
  }
  if (input && typeof input.trigger === 'string') {
    return input.trigger;
  }
  if (input && typeof input.compaction_reason === 'string') {
    return input.compaction_reason;
  }
  if (input && typeof input.compactionReason === 'string') {
    return input.compactionReason;
  }
  return '';
}

function hasInputData(input) {
  if (!input || typeof input !== 'object') {
    return false;
  }
  return Object.keys(input).length > 0;
}

function appendLog(entry) {
  var fd = null;
  try {
    var line = JSON.stringify(entry) + '\n';
    fd = openSync(LOG_FILE, 'a');
    writeSync(fd, line);
  } catch (_e) {
    // 로깅 실패는 무시
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch (_e2) {
        // no-op
      }
    }
  }
}

function updateState(entry) {
  try {
    var state = safeReadState();

    if (typeof state.counters[EVENT_NAME] !== 'number') {
      state.counters[EVENT_NAME] = 0;
    }

    state.counters[EVENT_NAME] += 1;
    state.lastEventByType[EVENT_NAME] = entry;
    state.updatedAt = entry.timestamp;

    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (_e) {
    // 상태 저장 실패 무시
  }
}

function buildEvent(input) {
  return {
    event: EVENT_NAME,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(input),
    cwd: getCwd(input),
    reason: truncateText(getReason(input), 160)
  };
}

function safeOutput(payload) {
  try {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } catch (_e) {
    // EPIPE 등 무시
  }
}

async function main() {
  try {
    var rawInput = await readStdin();
    var input = safeParseJson(rawInput);

    if (hasInputData(input)) {
      ensureHooksDir();
      var entry = buildEvent(input);
      appendLog(entry);
      updateState(entry);
    }
  } catch (_e) {
    // 실패해도 pass-through
  }

  safeOutput({ continue: true, suppressOutput: true });
}

main();
