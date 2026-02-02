#!/usr/bin/env node
/**
 * OMCM HUD - Independent HUD for oh-my-claude-money
 *
 * Features:
 * - Claude 5h/wk usage (direct API call, no OMC dependency)
 * - Mode detection (ultrawork, ralph, autopilot, etc.)
 * - Fusion metrics and provider token tracking
 * - Falls back to OMC HUD if available, otherwise runs independently
 */

// Read stdin from environment (set by wrapper) or try direct read
let __stdinData = process.env.__OMCM_STDIN_DATA || '';

// If not set by CJS entry, try direct capture (fallback for direct execution)
if (!__stdinData) {
  try {
    const { readFileSync } = await import('fs');
    if (!process.stdin.isTTY) {
      __stdinData = readFileSync(0, 'utf-8');
    }
  } catch {
    // stdin not available or empty
  }
}

import { spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { renderFusionMetrics, renderProviderLimits, renderProviderCounts, renderFallbackStatus, renderProviderTokens } from './fusion-renderer.mjs';
import { readFusionState, updateSavingsFromTokens, resetFusionStats } from '../utils/fusion-tracker.mjs';
import { getLimitsForHUD, updateClaudeLimits } from '../utils/provider-limits.mjs';
import { getFallbackOrchestrator } from '../orchestrator/fallback-orchestrator.mjs';
import { getClaudeUsage, formatTimeUntilReset, hasClaudeCredentials } from './claude-usage-api.mjs';
import { renderModeStatus, detectActiveModes } from './mode-detector.mjs';
import { getSessionId } from '../utils/session-id.mjs';
import { getSessionCalls } from '../tracking/call-logger.mjs';
import { getToolUsageStats } from '../tracking/tool-tracker-logger.mjs';

// ANSI color codes
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

/**
 * 세션 시작 시간 관리
 * - 파일에 저장하여 HUD 재실행 시에도 유지
 * - Claude 세션과 OpenCode 토큰 집계 시간 동기화
 * - num_turns == 1이면 새 세션으로 판단하여 자동 리셋
 */
const SESSION_START_FILE = join(homedir(), '.omcm', 'session-start.json');
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24시간 후 리셋

function getSessionStartTime() {
  try {
    if (existsSync(SESSION_START_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_START_FILE, 'utf-8'));
      const startTime = data.startTime;
      const now = Date.now();

      // 24시간 이내면 기존 세션 시작 시간 사용
      if (startTime && (now - startTime) < SESSION_MAX_AGE_MS) {
        return startTime;
      }
    }
  } catch (e) {
    // 파일 읽기 실패 시 무시
  }

  return resetSessionStartTime();
}

/**
 * 세션 시작 시간 리셋 (새 세션 시작 시 호출)
 */
function resetSessionStartTime() {
  const newStartTime = Date.now();
  try {
    mkdirSync(join(homedir(), '.omcm'), { recursive: true });
    writeFileSync(SESSION_START_FILE, JSON.stringify({ startTime: newStartTime }));
  } catch (e) {
    // 저장 실패 시 무시
  }
  return newStartTime;
}

/**
 * OpenCode 토큰 캐시 무효화 (세션 리셋 시 호출)
 */
function invalidateOpenCodeCache() {
  openCodeTokenCache = null;
  openCodeCacheTime = 0;
}

/**
 * Claude 세션 변경 감지 및 자동 리셋
 * - num_turns == 1이면 새 세션 (첫 턴)
 * - num_turns가 이전보다 작아지면 /clear로 세션 재시작된 것
 * - num_turns == 0은 "데이터 없음"으로 판단하여 리셋하지 않음
 * - fusion-state.json도 함께 초기화
 */
function checkAndResetSessionIfNeeded(numTurns) {
  // num_turns = 0은 stdin에 턴 수가 없는 경우 → 리셋 판단 불가, 무시
  if (numTurns === 0) return;

  const shouldReset =
    numTurns === 1 ||
    (previousNumTurns > 0 && numTurns < previousNumTurns);

  if (shouldReset) {
    hudSessionStartTime = resetSessionStartTime();
    invalidateOpenCodeCache();
    resetFusionStatsOnClear();
  }

  previousNumTurns = numTurns;
}

/**
 * 세션 클리어 시 fusion stats 초기화 (동기적)
 */
function resetFusionStatsOnClear() {
  try {
    let sessionId = null;
    try {
      sessionId = getSessionId();
    } catch (e) { /* 무시 */ }

    // 세션 ID가 없으면 글로벌 fusion-state 리셋 방지
    // (TTY 탐지 실패 시 다른 세션 데이터 보호)
    if (!sessionId) return;

    resetFusionStats(sessionId);
  } catch (e) {
    // 초기화 실패 시 무시
  }
}

/**
 * Transcript 토큰/턴 캐시
 */
let transcriptCache = null;
let transcriptCacheTime = 0;
let transcriptCachePath = '';
const TRANSCRIPT_CACHE_TTL_MS = 3000; // 3초

/**
 * Transcript JSONL에서 실제 누적 토큰 사용량 + 대화 턴 수 집계
 *
 * Rate limit에 영향을 주는 토큰 기준 (Anthropic):
 * - input: input_tokens + cache_read_input_tokens + cache_creation_input_tokens
 * - output: output_tokens
 *
 * 턴 수: user 타입 메시지 수 (실제 사용자 대화 턴)
 *
 * @param {string} transcriptPath - JSONL 파일 경로
 * @returns {object} { input, output, cacheRead, cacheCreate, turns }
 */
function aggregateClaudeFromTranscript(transcriptPath) {
  var empty = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0, turns: 0 };
  if (!transcriptPath) return empty;

  // 캐시 확인
  var now = Date.now();
  if (transcriptCache && transcriptCachePath === transcriptPath && (now - transcriptCacheTime) < TRANSCRIPT_CACHE_TTL_MS) {
    return transcriptCache;
  }

  try {
    if (!existsSync(transcriptPath)) return empty;

    var content = readFileSync(transcriptPath, 'utf-8');
    var lines = content.split('\n');
    var result = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0, turns: 0 };

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.length === 0) continue;

      try {
        // 빠른 문자열 검사로 파싱 대상 필터링
        if (line.indexOf('"type":"user"') !== -1) {
          result.turns++;
          continue;
        }

        if (line.indexOf('"type":"assistant"') === -1) continue;
        if (line.indexOf('"usage"') === -1) continue;

        // assistant + usage가 있는 줄만 JSON 파싱
        var entry = JSON.parse(line);
        var msg = entry.message;
        if (!msg) continue;
        var usage = msg.usage;
        if (!usage) continue;

        result.input += usage.input_tokens || 0;
        result.output += usage.output_tokens || 0;
        result.cacheRead += usage.cache_read_input_tokens || 0;
        result.cacheCreate += usage.cache_creation_input_tokens || 0;
      } catch (e) {
        // 개별 줄 파싱 실패 무시
      }
    }

    // 캐시 저장
    transcriptCache = result;
    transcriptCacheTime = now;
    transcriptCachePath = transcriptPath;

    return result;
  } catch (e) {
    return empty;
  }
}

let hudSessionStartTime = getSessionStartTime();
let previousNumTurns = -1;  // 이전 턴 수 추적

/**
 * ANSI color code removal
 */
function stripAnsi(str) {
  if (!str) return str;
  return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\033\[[0-9;]*m/g, '');
}

/**
 * 세션 분할 경고 렌더링
 * @param {number} inputTokens - 세션 누적 입력 토큰
 * @returns {string|null}
 */
function renderSplitWarning(inputTokens) {
  if (inputTokens >= 30000000) {
    return RED + '🔴SPLIT!' + RESET;
  }
  if (inputTokens >= 10000000) {
    return YELLOW + '⚠️SPLIT' + RESET;
  }
  return null;
}

/**
 * 도구 사용 통계 렌더링
 * Format: R:45 E:12 B:23 T:3
 * @param {string|null} sessionId - 세션 ID
 * @returns {string|null}
 */
function renderToolStats(sessionId) {
  if (!sessionId) return null;

  try {
    var stats = getToolUsageStats(sessionId);
    if (!stats || stats.total === 0) return null;

    var r = stats.Read || 0;
    var e = stats.Edit || 0;
    var b = stats.Bash || 0;
    var t = stats.Task || 0;
    var total = r + e + b + t;

    if (total === 0) return null;

    // Task 비율이 10% 미만이면 경고색
    var taskRatio = total > 0 ? (t / total) * 100 : 0;
    var taskColor = taskRatio < 10 ? YELLOW : GREEN;

    return DIM + 'R:' + r + ' E:' + e + ' B:' + b + RESET + ' ' + taskColor + 'T:' + t + RESET;
  } catch (e) {
    return null;
  }
}

/**
 * Parse Claude usage from OMC HUD output and sync
 * Pattern: "5h:28%(1h41m) wk:96%(13h41m)"
 */
function syncClaudeUsageFromOmcOutput(omcOutput) {
  if (!omcOutput) return;

  try {
    const cleanOutput = stripAnsi(omcOutput);
    const fiveHourMatch = cleanOutput.match(/5h:(\d+)%/);
    const weeklyMatch = cleanOutput.match(/wk:(\d+)%/);

    if (fiveHourMatch || weeklyMatch) {
      const fiveHourPercent = fiveHourMatch ? parseInt(fiveHourMatch[1], 10) : null;
      const weeklyPercent = weeklyMatch ? parseInt(weeklyMatch[1], 10) : null;
      updateClaudeLimits(fiveHourPercent, weeklyPercent);
    }
  } catch (e) {
    // Ignore parsing failures
  }
}

/**
 * Get color based on usage percentage
 */
function getUsageColor(percent) {
  if (percent >= 90) return RED;
  if (percent >= 70) return YELLOW;
  return GREEN;
}

/**
 * Render Claude usage (independent, no OMC dependency)
 * Format: 5h:28%(1h41m) wk:16%(5d12h)
 * @returns {Promise<string|null>}
 */
async function renderClaudeUsage() {
  try {
    const usage = await getClaudeUsage();
    if (!usage) return null;

    const parts = [];

    // 5-hour usage
    if (usage.fiveHourPercent != null) {
      const color = getUsageColor(usage.fiveHourPercent);
      const resetTime = formatTimeUntilReset(usage.fiveHourResetsAt);
      const timeStr = resetTime ? `(${resetTime})` : '';
      parts.push(`5h:${color}${usage.fiveHourPercent}%${RESET}${DIM}${timeStr}${RESET}`);
    }

    // Weekly usage
    if (usage.weeklyPercent != null) {
      const color = getUsageColor(usage.weeklyPercent);
      const resetTime = formatTimeUntilReset(usage.weeklyResetsAt);
      const timeStr = resetTime ? `(${resetTime})` : '';
      parts.push(`wk:${color}${usage.weeklyPercent}%${RESET}${DIM}${timeStr}${RESET}`);
    }

    if (parts.length === 0) return null;

    return parts.join(' ');
  } catch {
    return null;
  }
}

/**
 * Parse Claude token usage and request count from stdin JSON
 *
 * Claude Code HUD stdin 실제 구조:
 * {
 *   session_id: "uuid",
 *   transcript_path: "/path/to/session.jsonl",
 *   model: { id: "claude-opus-4-5-...", display_name: "Opus 4.5" },
 *   cost: { total_cost_usd, total_duration_ms, ... },
 *   context_window: {
 *     total_input_tokens, total_output_tokens,
 *     context_window_size, used_percentage, remaining_percentage,
 *     current_usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }
 *   }
 * }
 *
 * 주의: num_turns 필드는 제공되지 않음 → transcript 파일에서 카운트
 */
function parseClaudeTokensFromStdin(stdinData) {
  var result = { input: 0, output: 0, count: 0, claudeSessionId: null, transcriptPath: null };

  if (!stdinData) {
    return result;
  }

  try {
    var data = JSON.parse(stdinData);

    // Claude Code 세션 ID (OMCM 세션 ID와 별도)
    if (data.session_id) {
      result.claudeSessionId = data.session_id;
    }

    // transcript 경로
    if (data.transcript_path) {
      result.transcriptPath = data.transcript_path;
    }

    // Primary: transcript에서 실제 누적 토큰 집계 (rate limit 기준)
    // context_window.total_input_tokens는 현재 윈도우 크기이므로 부정확
    if (result.transcriptPath) {
      var transcriptData = aggregateClaudeFromTranscript(result.transcriptPath);
      // rate limit에 영향을 주는 input = input + cache_read + cache_create
      result.input = transcriptData.input + transcriptData.cacheRead + transcriptData.cacheCreate;
      result.output = transcriptData.output;
      result.count = transcriptData.turns;
    }

    // Fallback: transcript이 없으면 stdin의 context_window 사용
    if (result.input === 0 && result.output === 0) {
      if (data.context_window) {
        if (data.context_window.current_usage) {
          var usage = data.context_window.current_usage;
          var cacheRead = usage.cache_read_input_tokens || 0;
          var cacheCreate = usage.cache_creation_input_tokens || 0;
          result.input = (usage.input_tokens || 0) + cacheRead + cacheCreate;
          result.output = usage.output_tokens || 0;
        } else if (data.context_window.total_input_tokens !== undefined) {
          result.input = data.context_window.total_input_tokens || 0;
          result.output = data.context_window.total_output_tokens || 0;
        }
      }
    }

    // Fallback: 턴 수가 없으면 기존 필드 탐색
    if (result.count === 0) {
      if (data.conversation) {
        result.count = data.conversation.num_turns ||
                       data.conversation.turn_count ||
                       data.conversation.turns || 0;
      }
      if (result.count === 0 && data.num_turns !== undefined) {
        result.count = data.num_turns || 0;
      }
    }
  } catch (e) {
    // JSON parse failure - ignore
  }

  return result;
}

/**
 * Token cache for OpenCode files
 */
let openCodeTokenCache = null;
let openCodeCacheTime = 0;
const CACHE_TTL_MS = 5000; // 5초로 단축 (세션 변경 빠른 반영)

/**
 * Aggregate token usage from OpenCode session files
 */
function aggregateOpenCodeTokens() {
  const now = Date.now();
  if (openCodeTokenCache && (now - openCodeCacheTime) < CACHE_TTL_MS) {
    return openCodeTokenCache;
  }

  const result = {
    openai: { input: 0, output: 0, count: 0 },
    gemini: { input: 0, output: 0, count: 0 },
    kimi: { input: 0, output: 0, count: 0 },
    anthropic: { input: 0, output: 0, count: 0 },
  };

  // 세션 격리: 세션 ID가 있으면 call-logger의 세션별 로그 우선 사용
  let currentSessionId = null;
  try {
    currentSessionId = getSessionId();
  } catch (e) {
    // getSessionId 실패 시 기존 방식 폴백
  }

  if (currentSessionId) {
    // 세션 ID가 있으면 call-logger만 사용 (레거시 폴백 안 함)
    // 데이터가 없어도 0으로 반환하여 다른 세션 데이터 오염 방지
    try {
      const sessionCalls = getSessionCalls(currentSessionId);
      if (sessionCalls && sessionCalls.total > 0) {
        for (var i = 0; i < sessionCalls.calls.length; i++) {
          var call = sessionCalls.calls[i];
          var provider = call.provider || '';
          // 실제 토큰 데이터 우선 (서버 풀 API), 레거시 추정값 폴백
          var inputTokens = call.inputTokens || call.estimatedInputTokens || 0;
          var outputTokens = call.outputTokens || call.estimatedOutputTokens || 0;

          if (provider === 'openai' || provider === 'gpt') {
            result.openai.input += inputTokens;
            result.openai.output += outputTokens;
            result.openai.count++;
          } else if (provider === 'gemini' || provider === 'google') {
            result.gemini.input += inputTokens;
            result.gemini.output += outputTokens;
            result.gemini.count++;
          } else if (provider === 'kimi' || provider === 'kimi-for-coding' || provider === 'moonshot') {
            result.kimi.input += inputTokens;
            result.kimi.output += outputTokens;
            result.kimi.count++;
          } else if (provider === 'anthropic' || provider === 'claude') {
            result.anthropic.input += inputTokens;
            result.anthropic.output += outputTokens;
            result.anthropic.count++;
          }
        }
      }
      // 데이터가 없어도 세션 격리된 빈 결과 반환 (레거시 폴백 안 함)
    } catch (e) {
      // 세션 로그 조회 실패해도 빈 결과 반환 (레거시 폴백 안 함)
    }
    openCodeTokenCache = result;
    openCodeCacheTime = now;
    return result;
  }

  // 세션 ID가 없을 때만: OpenCode 메시지 디렉토리에서 시간 기반 집계 (레거시 폴백)
  try {
    const messageDir = join(homedir(), '.local', 'share', 'opencode', 'storage', 'message');

    if (!existsSync(messageDir)) {
      openCodeTokenCache = result;
      openCodeCacheTime = now;
      return result;
    }

    const sessionDirs = readdirSync(messageDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('ses_'))
      .map((d) => {
        const sessionPath = join(messageDir, d.name);
        try {
          const stat = statSync(sessionPath);
          return { name: d.name, path: sessionPath, mtime: stat.mtimeMs };
        } catch (e) {
          return null;
        }
      })
      .filter((d) => d !== null)
      .sort((a, b) => b.mtime - a.mtime);

    // 세션 시작 시간 또는 최근 8시간 중 더 오래된 시간 기준
    // (세션 리셋 버그 방지: 세션 시작 시간이 너무 오래되었을 수 있음)
    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
    // 매번 파일에서 최신 세션 시작 시간 읽기 (다른 터미널과 동기화)
    const latestSessionStart = getSessionStartTime();
    const filterStartTime = Math.max(latestSessionStart, now - EIGHT_HOURS_MS);
    const activeSessions = sessionDirs.filter((s) => s.mtime >= filterStartTime);

    if (activeSessions.length === 0) {
      openCodeTokenCache = result;
      openCodeCacheTime = now;
      return result;
    }

    for (const activeSession of activeSessions) {
      const sessionPath = activeSession.path;

      try {
        const msgFiles = readdirSync(sessionPath).filter((f) => f.startsWith('msg_') && f.endsWith('.json'));

        for (const msgFile of msgFiles) {
          const msgPath = join(sessionPath, msgFile);

          try {
            // 세션 시작 이후 메시지만 집계 (8시간 제한 적용)
            const msgStat = statSync(msgPath);
            if (msgStat.mtimeMs < filterStartTime) {
              continue;
            }

            const content = readFileSync(msgPath, 'utf-8');
            const msg = JSON.parse(content);

            // 에러 응답 또는 스트리밍 중인 메시지는 스킵
            if (msg.error) {
              continue;
            }

            let providerID = msg.providerID || (msg.model && msg.model.providerID);
            let modelID = (msg.model && msg.model.modelID) || '';

            if (!providerID) {
              continue;
            }

            let normalizedProvider = providerID;
            if (providerID === 'kimi-for-coding' || providerID === 'kimi' || providerID === 'moonshot') {
              normalizedProvider = 'kimi';
            }
            if (providerID === 'opencode') {
              const modelLower = modelID.toLowerCase();
              if (modelLower.includes('gemini') || modelLower.includes('flash') || modelLower.includes('pro')) {
                normalizedProvider = 'google';
              } else if (modelLower.includes('gpt') || modelLower.includes('o1') || modelLower.includes('codex')) {
                normalizedProvider = 'openai';
              } else if (modelLower.includes('claude') || modelLower.includes('sonnet') || modelLower.includes('opus') || modelLower.includes('haiku')) {
                normalizedProvider = 'anthropic';
              } else {
                normalizedProvider = 'openai';
              }
            }

            const tokens = msg.tokens;
            let inputTokens = 0;
            let outputTokens = 0;

            if (tokens) {
              let cacheRead = 0;
              let cacheCreate = 0;
              if (tokens.cache) {
                cacheRead = tokens.cache.read || 0;
                cacheCreate = tokens.cache.create || tokens.cache.write || 0;
              }
              inputTokens = (tokens.input || 0) + cacheRead + cacheCreate;
              outputTokens = tokens.output || 0;
            }

            if (normalizedProvider === 'openai') {
              result.openai.input += inputTokens;
              result.openai.output += outputTokens;
              result.openai.count++;
            } else if (normalizedProvider === 'google') {
              result.gemini.input += inputTokens;
              result.gemini.output += outputTokens;
              result.gemini.count++;
            } else if (normalizedProvider === 'kimi') {
              result.kimi.input += inputTokens;
              result.kimi.output += outputTokens;
              result.kimi.count++;
            } else if (normalizedProvider === 'anthropic') {
              result.anthropic.input += inputTokens;
              result.anthropic.output += outputTokens;
              result.anthropic.count++;
            }
          } catch (e) {
            // Individual file read failure - ignore
          }
        }
      } catch (e) {
        // Session directory read failure - continue
      }
    }
  } catch (e) {
    // Overall failure - return empty result
  }

  openCodeTokenCache = result;
  openCodeCacheTime = now;
  return result;
}

/**
 * Find OMC HUD path
 */
function findOmcHudPath() {
  const homeDir = process.env.HOME || '';

  const locations = [
    join(homeDir, '.claude', 'hud', 'omc-hud.mjs'),
    join(homeDir, '.claude', 'plugins', 'cache', 'omc', 'oh-my-claudecode'),
  ];

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc;
    }
  }

  const cacheDir = join(homeDir, '.claude', 'plugins', 'cache', 'omc', 'oh-my-claudecode');
  if (existsSync(cacheDir)) {
    return join(homeDir, '.claude', 'hud', 'omc-hud.mjs');
  }

  return null;
}

/**
 * Check if OMC HUD is properly installed (not just wrapper exists)
 */
function isOmcHudAvailable() {
  const homeDir = process.env.HOME || '';

  // Check if OMC plugin is actually built
  const cacheDir = join(homeDir, '.claude', 'plugins', 'cache', 'omc', 'oh-my-claudecode');
  if (existsSync(cacheDir)) {
    try {
      const versions = readdirSync(cacheDir);
      if (versions.length > 0) {
        const latestVersion = versions.sort().reverse()[0];
        const builtPath = join(cacheDir, latestVersion, 'dist', 'hud', 'index.js');
        if (existsSync(builtPath)) {
          return true;
        }
      }
    } catch {
      // continue
    }
  }

  // Check development paths
  const devPaths = [
    join(homeDir, 'Workspace/oh-my-claudecode/dist/hud/index.js'),
    join(homeDir, 'workspace/oh-my-claudecode/dist/hud/index.js'),
  ];

  for (const devPath of devPaths) {
    if (existsSync(devPath)) {
      return true;
    }
  }

  // OMC not properly installed - use independent mode
  return false;
}

/**
 * Execute OMC HUD and get output
 */
async function getOmcHudOutput(stdinData) {
  const omcHudPath = findOmcHudPath();

  if (!omcHudPath || !existsSync(omcHudPath)) {
    return null;
  }

  return new Promise((resolve) => {
    const child = spawn('node', [omcHudPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 && stdout) {
        resolve(stdout.trim());
      } else {
        resolve(null);
      }
    });

    child.on('error', () => {
      resolve(null);
    });

    if (stdinData) {
      child.stdin.write(stdinData);
    }
    child.stdin.end();

    setTimeout(() => {
      child.kill();
      resolve(null);
    }, 3000);
  });
}

/**
 * Read stdin from Claude Code
 * Uses pre-captured __stdinData from module initialization
 */
async function readStdin() {
  return __stdinData;
}

/**
 * Build independent HUD output (no OMC dependency)
 */
async function buildIndependentHud(stdinData) {
  // 1. Claude usage (5h/wk) - direct API call
  const usageOutput = await renderClaudeUsage();

  // 2. Mode status (ultrawork, ralph, etc.)
  const modeOutput = renderModeStatus();

  // 3. Token usage
  const claudeTokens = parseClaudeTokensFromStdin(stdinData);

  // Claude 세션 변경 감지 및 OpenCode 필터 시간 동기화
  checkAndResetSessionIfNeeded(claudeTokens.count);

  const openCodeTokens = aggregateOpenCodeTokens();

  // 세션 ID 획득 (fusion-tracker에 전달)
  let currentSessionId = null;
  try {
    currentSessionId = getSessionId();
  } catch (e) { /* 무시 */ }

  // 실제 토큰 기반 절약율 업데이트
  updateSavingsFromTokens(claudeTokens, openCodeTokens.openai, openCodeTokens.gemini, openCodeTokens.kimi, currentSessionId);

  const tokenData = {
    claude: claudeTokens,
    openai: openCodeTokens.openai,
    gemini: openCodeTokens.gemini,
    kimi: openCodeTokens.kimi,
  };

  const tokenOutput = renderProviderTokens(tokenData);

  // 4. Fusion metrics
  const fusionState = readFusionState(currentSessionId);
  const fusionOutput = renderFusionMetrics(fusionState);

  // 5. 세션 분할 경고
  const splitWarning = renderSplitWarning(claudeTokens.input);

  // 6. 도구 사용 통계
  var toolStatsOutput = renderToolStats(currentSessionId);

  // 7. Provider counts
  const claudeCount = claudeTokens.count > 0 ? claudeTokens.count : openCodeTokens.anthropic.count;
  const sessionCounts = {
    byProvider: {
      anthropic: claudeCount,
      openai: openCodeTokens.openai.count,
      gemini: openCodeTokens.gemini.count,
      kimi: openCodeTokens.kimi.count,
    }
  };
  const countsOutput = renderProviderCounts(sessionCounts);

  // 8. Fallback status
  let fallbackOutput = null;
  try {
    const fallback = getFallbackOrchestrator();
    const fallbackState = fallback.getCurrentOrchestrator();
    fallbackOutput = renderFallbackStatus(fallbackState);
  } catch (e) {
    // No fallback info
  }

  // Sync Claude usage to provider-limits
  if (usageOutput) {
    const cleanOutput = stripAnsi(usageOutput);
    const fiveHourMatch = cleanOutput.match(/5h:(\d+)%/);
    const weeklyMatch = cleanOutput.match(/wk:(\d+)%/);
    if (fiveHourMatch || weeklyMatch) {
      const fiveHourPercent = fiveHourMatch ? parseInt(fiveHourMatch[1], 10) : null;
      const weeklyPercent = weeklyMatch ? parseInt(weeklyMatch[1], 10) : null;
      updateClaudeLimits(fiveHourPercent, weeklyPercent);
    }
  }

  // 2줄 출력: Line1=상태, Line2=메트릭 (화면 깜빡임 방지)
  const statusParts = [];  // 사용량, 모드, 퓨전, 폴백, 분할경고
  const metricParts = [];  // 토큰, 카운트, 도구통계

  if (usageOutput) statusParts.push(usageOutput);
  if (modeOutput) statusParts.push(modeOutput);
  if (fusionOutput) statusParts.push(fusionOutput);
  if (fallbackOutput) statusParts.push(fallbackOutput);
  if (splitWarning) statusParts.push(splitWarning);

  if (tokenOutput) metricParts.push(tokenOutput);
  if (countsOutput) metricParts.push(countsOutput);
  if (toolStatsOutput) metricParts.push(toolStatsOutput);

  if (statusParts.length === 0 && metricParts.length === 0) {
    return '[OMCM] run /fusion-setup to configure';
  }

  const line1 = '[OMCM] ' + (statusParts.length > 0 ? statusParts.join(' | ') : 'ready');
  if (metricParts.length > 0) {
    return line1 + '\n' + '       ' + metricParts.join(' | ');
  }
  return line1;
}

/**
 * Main entry point
 */
async function main() {
  try {
    const stdinData = await readStdin();

    // Check if OMC HUD is available
    const omcAvailable = isOmcHudAvailable();

    if (omcAvailable) {
      // OMC available: wrap OMC output with OMCM extras
      const omcOutput = await getOmcHudOutput(stdinData);

      if (omcOutput) {
        syncClaudeUsageFromOmcOutput(omcOutput);

        // Parse tokens and build extras
        const claudeTokens = parseClaudeTokensFromStdin(stdinData);

        // Claude 세션 변경 감지 및 OpenCode 필터 시간 동기화
        checkAndResetSessionIfNeeded(claudeTokens.count);

        const openCodeTokens = aggregateOpenCodeTokens();

        // 세션 ID 획득 (fusion-tracker에 전달)
        let currentSessionId = null;
        try {
          currentSessionId = getSessionId();
        } catch (e) { /* 무시 */ }

        // 실제 토큰 기반 절약율 업데이트
        updateSavingsFromTokens(claudeTokens, openCodeTokens.openai, openCodeTokens.gemini, openCodeTokens.kimi, currentSessionId);

        const tokenData = {
          claude: claudeTokens,
          openai: openCodeTokens.openai,
          gemini: openCodeTokens.gemini,
          kimi: openCodeTokens.kimi,
        };

        const tokenOutput = renderProviderTokens(tokenData);
        const fusionState = readFusionState(currentSessionId);
        const fusionOutput = renderFusionMetrics(fusionState);

        const claudeCount = claudeTokens.count > 0 ? claudeTokens.count : openCodeTokens.anthropic.count;
        const sessionCounts = {
          byProvider: {
            anthropic: claudeCount,
            openai: openCodeTokens.openai.count,
            gemini: openCodeTokens.gemini.count,
            kimi: openCodeTokens.kimi.count,
          }
        };
        const countsOutput = renderProviderCounts(sessionCounts);

        let fallbackOutput = null;
        try {
          const fallback = getFallbackOrchestrator();
          const fallbackState = fallback.getCurrentOrchestrator();
          fallbackOutput = renderFallbackStatus(fallbackState);
        } catch (e) {
          // No fallback info
        }

        // 세션 분할 경고
        const splitWarning = renderSplitWarning(claudeTokens.input);

        // 도구 사용 통계
        var toolStatsOutput = renderToolStats(currentSessionId);

        // 2줄 출력: Line1=OMC+상태, Line2=메트릭 (화면 깜빡임 방지)
        const statusExtras = [];
        if (fusionOutput) statusExtras.push(fusionOutput);
        if (fallbackOutput) statusExtras.push(fallbackOutput);
        if (splitWarning) statusExtras.push(splitWarning);

        const metricExtras = [];
        if (tokenOutput) metricExtras.push(tokenOutput);
        if (countsOutput) metricExtras.push(countsOutput);
        if (toolStatsOutput) metricExtras.push(toolStatsOutput);

        let finalOutput = omcOutput;
        if (statusExtras.length > 0) {
          finalOutput = omcOutput.replace(
            /(\[OMC\])(\s*\|)?/,
            '$1 | ' + statusExtras.join(' | ') + '$2'
          );
        }

        if (metricExtras.length > 0) {
          finalOutput += '\n       ' + metricExtras.join(' | ');
        }

        console.log(finalOutput);
        return;
      }
    }

    // OMC not available or failed: run independently
    const independentOutput = await buildIndependentHud(stdinData);
    console.log(independentOutput);

  } catch (error) {
    console.log('[OMCM] error');
  }
}

main();
