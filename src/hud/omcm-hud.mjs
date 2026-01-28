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
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { renderFusionMetrics, renderProviderLimits, renderProviderCounts, renderFallbackStatus, renderProviderTokens } from './fusion-renderer.mjs';
import { readFusionState, updateSavingsFromTokens } from '../utils/fusion-tracker.mjs';
import { getLimitsForHUD, updateClaudeLimits } from '../utils/provider-limits.mjs';
import { getFallbackOrchestrator } from '../orchestrator/fallback-orchestrator.mjs';
import { getClaudeUsage, formatTimeUntilReset, hasClaudeCredentials } from './claude-usage-api.mjs';
import { renderModeStatus, detectActiveModes } from './mode-detector.mjs';

// ANSI color codes
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

/**
 * ANSI color code removal
 */
function stripAnsi(str) {
  if (!str) return str;
  return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\033\[[0-9;]*m/g, '');
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
 */
function parseClaudeTokensFromStdin(stdinData) {
  const result = { input: 0, output: 0, count: 0 };

  if (!stdinData) {
    return result;
  }

  try {
    const data = JSON.parse(stdinData);

    // Primary: context_window session cumulative tokens
    if (data.context_window) {
      if (data.context_window.total_input_tokens !== undefined) {
        result.input = data.context_window.total_input_tokens || 0;
        result.output = data.context_window.total_output_tokens || 0;
      } else if (data.context_window.current_usage) {
        const usage = data.context_window.current_usage;
        const cacheRead = usage.cache_read_input_tokens || 0;
        result.input = (usage.input_tokens || 0) + cacheRead;
        result.output = usage.output_tokens || 0;
      }
    }

    // Parse request count
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

    // Fallback token structures
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

    if (data.conversation && data.conversation.tokens) {
      result.input += data.conversation.tokens.input || 0;
      result.output += data.conversation.tokens.output || 0;
    }

    if (data.session) {
      if (data.session.inputTokens) {
        result.input = data.session.inputTokens;
      }
      if (data.session.outputTokens) {
        result.output = data.session.outputTokens;
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
const CACHE_TTL_MS = 30000;

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
    anthropic: { input: 0, output: 0, count: 0 },
  };

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

    const oneHourAgo = now - (60 * 60 * 1000);
    const activeSessions = sessionDirs.filter((s) => s.mtime >= oneHourAgo);

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
            const content = readFileSync(msgPath, 'utf-8');
            const msg = JSON.parse(content);

            let providerID = msg.providerID || (msg.model && msg.model.providerID);
            let modelID = (msg.model && msg.model.modelID) || '';

            if (!providerID) {
              continue;
            }

            let normalizedProvider = providerID;
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
              const cacheRead = (tokens.cache && tokens.cache.read) || 0;
              inputTokens = (tokens.input || 0) + cacheRead;
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
  const parts = [];

  // 1. Claude usage (5h/wk) - direct API call
  const usageOutput = await renderClaudeUsage();
  if (usageOutput) {
    parts.push(usageOutput);
  }

  // 2. Mode status (ultrawork, ralph, etc.)
  const modeOutput = renderModeStatus();
  if (modeOutput) {
    parts.push(modeOutput);
  }

  // 3. Token usage
  const claudeTokens = parseClaudeTokensFromStdin(stdinData);
  const openCodeTokens = aggregateOpenCodeTokens();

  // 실제 토큰 기반 절약율 업데이트
  updateSavingsFromTokens(claudeTokens, openCodeTokens.openai, openCodeTokens.gemini);

  const tokenData = {
    claude: claudeTokens,
    openai: openCodeTokens.openai,
    gemini: openCodeTokens.gemini,
  };

  const tokenOutput = renderProviderTokens(tokenData);
  if (tokenOutput) {
    parts.push(tokenOutput);
  }

  // 4. Fusion metrics (업데이트된 값 반영)
  const fusionState = readFusionState();
  const fusionOutput = renderFusionMetrics(fusionState);
  if (fusionOutput) {
    parts.push(fusionOutput);
  }

  // 5. Provider counts
  const claudeCount = claudeTokens.count > 0 ? claudeTokens.count : openCodeTokens.anthropic.count;
  const sessionCounts = {
    byProvider: {
      anthropic: claudeCount,
      openai: openCodeTokens.openai.count,
      gemini: openCodeTokens.gemini.count,
    }
  };
  const countsOutput = renderProviderCounts(sessionCounts);
  if (countsOutput) {
    parts.push(countsOutput);
  }

  // 6. Fallback status
  let fallbackOutput = null;
  try {
    const fallback = getFallbackOrchestrator();
    const fallbackState = fallback.getCurrentOrchestrator();
    fallbackOutput = renderFallbackStatus(fallbackState);
  } catch (e) {
    // No fallback info
  }
  if (fallbackOutput) {
    parts.push(fallbackOutput);
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

  if (parts.length === 0) {
    return '[OMCM] run /fusion-setup to configure';
  }

  return '[OMCM] ' + parts.join(' | ');
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
        const openCodeTokens = aggregateOpenCodeTokens();

        // 실제 토큰 기반 절약율 업데이트
        updateSavingsFromTokens(claudeTokens, openCodeTokens.openai, openCodeTokens.gemini);

        const tokenData = {
          claude: claudeTokens,
          openai: openCodeTokens.openai,
          gemini: openCodeTokens.gemini,
        };

        const tokenOutput = renderProviderTokens(tokenData);
        const fusionState = readFusionState();
        const fusionOutput = renderFusionMetrics(fusionState);

        const claudeCount = claudeTokens.count > 0 ? claudeTokens.count : openCodeTokens.anthropic.count;
        const sessionCounts = {
          byProvider: {
            anthropic: claudeCount,
            openai: openCodeTokens.openai.count,
            gemini: openCodeTokens.gemini.count,
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

        const extraParts = [];
        if (tokenOutput) extraParts.push(tokenOutput);
        if (fusionOutput) extraParts.push(fusionOutput);
        if (countsOutput) extraParts.push(countsOutput);
        if (fallbackOutput) extraParts.push(fallbackOutput);

        const extras = extraParts.join(' | ');

        let finalOutput = '';
        if (extras) {
          finalOutput = omcOutput.replace(
            /(\[OMC\])(\s*\|)?/,
            '$1 | ' + extras + '$2'
          );
        } else {
          finalOutput = omcOutput;
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
