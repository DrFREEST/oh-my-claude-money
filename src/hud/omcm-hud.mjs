#!/usr/bin/env node
/**
 * OMCM HUD - Independent HUD wrapper for oh-my-claude-money
 *
 * Wraps OMC HUD output and adds fusion mode metrics.
 * This keeps OMCM independent from OMC for clean uninstallation.
 */

import { spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { renderFusionMetrics, renderProviderLimits, renderProviderCounts, renderFallbackStatus, renderProviderTokens } from './fusion-renderer.mjs';
import { readFusionState } from '../utils/fusion-tracker.mjs';
import { getLimitsForHUD, updateClaudeLimits } from '../utils/provider-limits.mjs';
import { getFallbackOrchestrator } from '../orchestrator/fallback-orchestrator.mjs';

/**
 * ANSI 색상 코드 제거
 */
function stripAnsi(str) {
  if (!str) return str;
  // ANSI escape sequences: \x1b[...m or \033[...m
  return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\033\[[0-9;]*m/g, '');
}

/**
 * OMC HUD 출력에서 Claude 사용량 파싱 및 동기화
 * 패턴: "5h:28%(1h41m) wk:96%(13h41m)"
 */
function syncClaudeUsageFromOmcOutput(omcOutput) {
  if (!omcOutput) return;

  try {
    // ANSI 색상 코드 제거 후 파싱
    const cleanOutput = stripAnsi(omcOutput);

    // 5시간 사용량 파싱: "5h:28%" 또는 "5h:28%(..."
    const fiveHourMatch = cleanOutput.match(/5h:(\d+)%/);
    // 주간 사용량 파싱: "wk:96%" 또는 "wk:96%(..."
    const weeklyMatch = cleanOutput.match(/wk:(\d+)%/);

    if (fiveHourMatch || weeklyMatch) {
      const fiveHourPercent = fiveHourMatch ? parseInt(fiveHourMatch[1], 10) : null;
      const weeklyPercent = weeklyMatch ? parseInt(weeklyMatch[1], 10) : null;

      // provider-limits.json 업데이트
      updateClaudeLimits(fiveHourPercent, weeklyPercent);
    }
  } catch (e) {
    // 파싱 실패 시 무시 (HUD 출력에 영향 없도록)
  }
}

/**
 * Parse Claude token usage and request count from stdin JSON
 * Claude Code passes JSON with token data to HUD via stdin
 *
 * Expected structure:
 * {
 *   "context_window": {
 *     "current_usage": {
 *       "input_tokens": 12345,
 *       "output_tokens": 6789
 *     }
 *   },
 *   "conversation": {
 *     "num_turns": 42
 *   }
 * }
 *
 * @param {string} stdinData - Raw stdin data (JSON string)
 * @returns {Object} - { input: number, output: number, count: number }
 */
function parseClaudeTokensFromStdin(stdinData) {
  const result = { input: 0, output: 0, count: 0 };

  if (!stdinData) {
    return result;
  }

  try {
    const data = JSON.parse(stdinData);

    // Primary: context_window 세션 누적 토큰 (total_input/output_tokens)
    if (data.context_window) {
      // 세션 누적치 우선 사용
      if (data.context_window.total_input_tokens !== undefined) {
        result.input = data.context_window.total_input_tokens || 0;
        result.output = data.context_window.total_output_tokens || 0;
      } else if (data.context_window.current_usage) {
        // fallback: current_usage (현재 요청만)
        const usage = data.context_window.current_usage;
        // input = input_tokens + cache_read_input_tokens (캐시 포함)
        const cacheRead = usage.cache_read_input_tokens || 0;
        result.input = (usage.input_tokens || 0) + cacheRead;
        result.output = usage.output_tokens || 0;
      }
    }

    // Parse request count - 현재 세션 턴/요청 수
    // Try various possible field names
    if (data.conversation) {
      result.count = data.conversation.num_turns ||
                     data.conversation.turn_count ||
                     data.conversation.turns ||
                     data.conversation.requestCount ||
                     data.conversation.request_count || 0;
    }
    if (result.count === 0 && data.context_window) {
      result.count = data.context_window.num_turns ||
                     data.context_window.turn_count ||
                     data.context_window.request_count || 0;
    }
    if (result.count === 0 && data.session) {
      result.count = data.session.num_turns ||
                     data.session.turn_count ||
                     data.session.requestCount || 0;
    }
    if (result.count === 0 && data.num_turns !== undefined) {
      result.count = data.num_turns || 0;
    }
    if (result.count === 0 && data.turn_count !== undefined) {
      result.count = data.turn_count || 0;
    }

    // Fallback: Look for token data in various possible structures
    if (result.input === 0 && result.output === 0) {
      if (data.tokens) {
        result.input = data.tokens.input || data.tokens.inputTokens || 0;
        result.output = data.tokens.output || data.tokens.outputTokens || 0;
      } else if (data.inputTokens !== undefined) {
        result.input = data.inputTokens || 0;
        result.output = data.outputTokens || 0;
      } else if (data.usage) {
        result.input = data.usage.input_tokens || data.usage.prompt_tokens || 0;
        result.output = data.usage.output_tokens || data.usage.completion_tokens || 0;
      }
    }

    // Also check for session/conversation level totals (additive)
    if (data.conversation && data.conversation.tokens) {
      result.input += data.conversation.tokens.input || 0;
      result.output += data.conversation.tokens.output || 0;
    }

    // Check for session totals (override)
    if (data.session) {
      if (data.session.inputTokens) {
        result.input = data.session.inputTokens;
      }
      if (data.session.outputTokens) {
        result.output = data.session.outputTokens;
      }
    }
  } catch (e) {
    // JSON 파싱 실패 - 무시
  }

  return result;
}

/**
 * Token cache for OpenCode files
 * Prevents reading all files on every HUD refresh
 */
let openCodeTokenCache = null;
let openCodeCacheTime = 0;
const CACHE_TTL_MS = 30000; // 30초 캐시

/**
 * Aggregate token usage from OpenCode session files
 * Only reads the MOST RECENT session (current session)
 *
 * @returns {Object} - { openai: { input, output }, gemini: { input, output } }
 */
function aggregateOpenCodeTokens() {
  // 캐시 체크
  const now = Date.now();
  if (openCodeTokenCache && (now - openCodeCacheTime) < CACHE_TTL_MS) {
    return openCodeTokenCache;
  }

  const result = {
    openai: { input: 0, output: 0, count: 0 },
    gemini: { input: 0, output: 0, count: 0 },
    anthropic: { input: 0, output: 0, count: 0 },  // OpenCode를 통한 Anthropic 사용량도 집계
  };

  try {
    const messageDir = join(homedir(), '.local', 'share', 'opencode', 'storage', 'message');

    if (!existsSync(messageDir)) {
      openCodeTokenCache = result;
      openCodeCacheTime = now;
      return result;
    }

    // 세션 디렉토리들 - mtime 기준 정렬하여 가장 최근 세션만 사용
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
      .sort((a, b) => b.mtime - a.mtime); // 가장 최근 세션이 먼저

    // 가장 최근 세션 1개만 사용 (현재 세션)
    const currentSession = sessionDirs[0];
    if (!currentSession) {
      openCodeTokenCache = result;
      openCodeCacheTime = now;
      return result;
    }

    // 현재 세션이 1시간 이내에 수정되었는지 확인 (활성 세션 판별)
    const oneHourAgo = now - (60 * 60 * 1000);
    if (currentSession.mtime < oneHourAgo) {
      // 1시간 이상 수정 없으면 비활성 세션으로 간주 - 빈 결과 반환
      openCodeTokenCache = result;
      openCodeCacheTime = now;
      return result;
    }

    const sessionPath = currentSession.path;

    try {
      // 메시지 파일들 읽기
      const msgFiles = readdirSync(sessionPath).filter((f) => f.startsWith('msg_') && f.endsWith('.json'));

      for (const msgFile of msgFiles) {
        const msgPath = join(sessionPath, msgFile);

        try {
          const content = readFileSync(msgPath, 'utf-8');
          const msg = JSON.parse(content);

          // providerID 체크
          const providerID = msg.providerID || (msg.model && msg.model.providerID);
          if (!providerID) {
            continue;
          }

          // tokens 체크
          const tokens = msg.tokens;
          if (!tokens) {
            continue;
          }

          // input = tokens.input + cache.read (캐시 포함 전체 입력)
          const cacheRead = (tokens.cache && tokens.cache.read) || 0;
          const inputTokens = (tokens.input || 0) + cacheRead;
          const outputTokens = tokens.output || 0;

          // 프로바이더별 집계 (토큰 + 카운트)
          if (providerID === 'openai') {
            result.openai.input += inputTokens;
            result.openai.output += outputTokens;
            result.openai.count++;
          } else if (providerID === 'google') {
            result.gemini.input += inputTokens;
            result.gemini.output += outputTokens;
            result.gemini.count++;
          } else if (providerID === 'anthropic') {
            result.anthropic.input += inputTokens;
            result.anthropic.output += outputTokens;
            result.anthropic.count++;
          }
        } catch (e) {
          // 개별 파일 읽기 실패 - 무시
        }
      }
    } catch (e) {
      // 세션 디렉토리 읽기 실패 - 무시
    }
  } catch (e) {
    // 전체 실패 - graceful하게 빈 결과 반환
  }

  openCodeTokenCache = result;
  openCodeCacheTime = now;
  return result;
}

// Find OMC HUD path
function findOmcHudPath() {
  const homeDir = process.env.HOME || '';

  // Check standard locations
  const locations = [
    join(homeDir, '.claude', 'hud', 'omc-hud.mjs'),
    join(homeDir, '.claude', 'plugins', 'cache', 'omc', 'oh-my-claudecode'),
  ];

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc;
    }
  }

  // Find in plugin cache (version agnostic)
  const cacheDir = join(homeDir, '.claude', 'plugins', 'cache', 'omc', 'oh-my-claudecode');
  if (existsSync(cacheDir)) {
    // Return the wrapper which handles versioning
    return join(homeDir, '.claude', 'hud', 'omc-hud.mjs');
  }

  return null;
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
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
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

    // Pass stdin to child
    if (stdinData) {
      child.stdin.write(stdinData);
    }
    child.stdin.end();

    // Timeout after 3 seconds
    setTimeout(() => {
      child.kill();
      resolve(null);
    }, 3000);
  });
}

/**
 * Read stdin from Claude Code
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    // Timeout
    setTimeout(() => {
      resolve(data);
    }, 1000);
  });
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Read stdin
    const stdinData = await readStdin();

    // Get OMC HUD output
    const omcOutput = await getOmcHudOutput(stdinData);

    // OMC 출력에서 Claude 사용량 파싱하여 동기화
    syncClaudeUsageFromOmcOutput(omcOutput);

    // Parse Claude tokens from stdin
    const claudeTokens = parseClaudeTokensFromStdin(stdinData);

    // Aggregate OpenCode tokens (OpenAI, Gemini, etc.)
    const openCodeTokens = aggregateOpenCodeTokens();

    // Combine all token data for rendering
    const tokenData = {
      claude: claudeTokens,
      openai: openCodeTokens.openai,
      gemini: openCodeTokens.gemini,
    };

    // Render token usage: C:1.2k↓0.5k↑|O:3.4k↓1.2k↑|G:0.8k↓0.3k↑
    const tokenOutput = renderProviderTokens(tokenData);

    // Read fusion state
    const fusionState = readFusionState();

    // Render fusion metrics
    const fusionOutput = renderFusionMetrics(fusionState);

    // Get provider routing counts
    // Claude count: stdin JSON에서 현재 세션 턴 수 (없으면 OpenCode anthropic 사용)
    // OpenAI/Gemini: OpenCode 세션 파일에서 현재 세션 카운트
    const claudeCount = claudeTokens.count > 0 ? claudeTokens.count : openCodeTokens.anthropic.count;
    const sessionCounts = {
      byProvider: {
        anthropic: claudeCount,
        openai: openCodeTokens.openai.count,
        gemini: openCodeTokens.gemini.count,
      }
    };
    const countsOutput = renderProviderCounts(sessionCounts);

    // Get fallback status
    let fallbackOutput = null;
    try {
      const fallback = getFallbackOrchestrator();
      const fallbackState = fallback.getCurrentOrchestrator();
      fallbackOutput = renderFallbackStatus(fallbackState);
    } catch (e) {
      // 폴백 정보 없음
    }

    // Combine all outputs
    const extraParts = [];

    // Token usage first (most important)
    if (tokenOutput) {
      extraParts.push(tokenOutput);
    }

    if (fusionOutput) {
      extraParts.push(fusionOutput);
    }
    if (countsOutput) {
      extraParts.push(countsOutput);
    }
    if (fallbackOutput) {
      extraParts.push(fallbackOutput);
    }

    const extras = extraParts.join(' | ');

    // Final output assembly
    let finalOutput = '';

    if (omcOutput && extras) {
      // Insert extras after [OMC] label
      finalOutput = omcOutput.replace(
        /(\[OMC\])(\s*\|)?/,
        '$1 | ' + extras + '$2'
      );
    } else if (omcOutput) {
      finalOutput = omcOutput;
    } else if (extras) {
      finalOutput = '[OMCM] | ' + extras;
    } else {
      finalOutput = '[OMCM] run /fusion-setup to configure';
    }

    console.log(finalOutput);
  } catch (error) {
    console.log('[OMCM] error');
  }
}

main();
