#!/usr/bin/env node
/**
 * OMCM - Claude Usage API
 *
 * Fetches rate limit usage from Anthropic's OAuth API.
 * Ported from OMC usage-api.ts to pure ESM JavaScript.
 *
 * Authentication:
 * - macOS: Reads from Keychain "Claude Code-credentials"
 * - Linux/fallback: Reads from ~/.claude/.credentials.json
 *
 * API: api.anthropic.com/api/oauth/usage
 * Response: { five_hour: { utilization }, seven_day: { utilization } }
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import https from 'https';

// Cache configuration
const CACHE_TTL_SUCCESS_MS = 30 * 1000; // 30 seconds for successful responses
const CACHE_TTL_FAILURE_MS = 15 * 1000; // 15 seconds for failures
const API_TIMEOUT_MS = 10000;

/**
 * Get the cache file path
 * @returns {string}
 */
function getCachePath() {
  return join(homedir(), '.claude/plugins/omcm/.usage-cache.json');
}

/**
 * Read cached usage data
 * @returns {Object|null}
 */
function readCache() {
  try {
    const cachePath = getCachePath();
    if (!existsSync(cachePath)) return null;

    const content = readFileSync(cachePath, 'utf-8');
    const cache = JSON.parse(content);

    // Re-hydrate Date objects from JSON strings
    if (cache.data) {
      if (cache.data.fiveHourResetsAt) {
        cache.data.fiveHourResetsAt = new Date(cache.data.fiveHourResetsAt);
      }
      if (cache.data.weeklyResetsAt) {
        cache.data.weeklyResetsAt = new Date(cache.data.weeklyResetsAt);
      }
      if (cache.data.sonnetWeeklyResetsAt) {
        cache.data.sonnetWeeklyResetsAt = new Date(cache.data.sonnetWeeklyResetsAt);
      }
      if (cache.data.opusWeeklyResetsAt) {
        cache.data.opusWeeklyResetsAt = new Date(cache.data.opusWeeklyResetsAt);
      }
      if (cache.data.monthlyResetsAt) {
        cache.data.monthlyResetsAt = new Date(cache.data.monthlyResetsAt);
      }
    }

    return cache;
  } catch {
    return null;
  }
}

/**
 * Write usage data to cache
 * @param {Object|null} data
 * @param {boolean} error
 * @param {string} source
 */
function writeCache(data, error = false, source) {
  try {
    const cachePath = getCachePath();
    const cacheDir = dirname(cachePath);

    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const cache = {
      timestamp: Date.now(),
      data,
      error,
      source,
    };

    writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Check if cache is still valid
 * @param {Object} cache
 * @returns {boolean}
 */
function isCacheValid(cache) {
  const ttl = cache.error ? CACHE_TTL_FAILURE_MS : CACHE_TTL_SUCCESS_MS;
  return Date.now() - cache.timestamp < ttl;
}

/**
 * Read OAuth credentials from macOS Keychain
 * Note: Uses execSync with fixed command string (no user input) - safe from injection
 * @returns {Object|null}
 */
function readKeychainCredentials() {
  if (process.platform !== 'darwin') return null;

  try {
    // Fixed command - no user input, safe to use execSync
    const result = execSync(
      '/usr/bin/security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
      { encoding: 'utf-8', timeout: 2000 }
    ).trim();

    if (!result) return null;

    const parsed = JSON.parse(result);

    // Handle nested structure (claudeAiOauth wrapper)
    const creds = parsed.claudeAiOauth || parsed;

    if (creds.accessToken) {
      return {
        accessToken: creds.accessToken,
        expiresAt: creds.expiresAt,
        refreshToken: creds.refreshToken,
      };
    }
  } catch {
    // Keychain access failed
  }

  return null;
}

/**
 * Read OAuth credentials from file fallback
 * @returns {Object|null}
 */
function readFileCredentials() {
  try {
    const credPath = join(homedir(), '.claude/.credentials.json');
    if (!existsSync(credPath)) return null;

    const content = readFileSync(credPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Handle nested structure (claudeAiOauth wrapper)
    const creds = parsed.claudeAiOauth || parsed;

    if (creds.accessToken) {
      return {
        accessToken: creds.accessToken,
        expiresAt: creds.expiresAt,
        refreshToken: creds.refreshToken,
      };
    }
  } catch {
    // File read failed
  }

  return null;
}

/**
 * Get OAuth credentials (Keychain first, then file fallback)
 * @returns {Object|null}
 */
function getCredentials() {
  // Try Keychain first (macOS)
  const keychainCreds = readKeychainCredentials();
  if (keychainCreds) return keychainCreds;

  // Fall back to file
  return readFileCredentials();
}

/**
 * Validate credentials are not expired
 * @param {Object} creds
 * @returns {boolean}
 */
function validateCredentials(creds) {
  if (!creds.accessToken) return false;

  if (creds.expiresAt != null) {
    const now = Date.now();
    if (creds.expiresAt <= now) return false;
  }

  return true;
}

/**
 * Fetch usage from Anthropic API
 * @param {string} accessToken
 * @returns {Promise<Object|null>}
 */
function fetchUsageFromApi(accessToken) {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/api/oauth/usage',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'anthropic-beta': 'oauth-2025-04-20',
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT_MS,
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      }
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Parse API response into usage data
 * @param {Object} response - API response
 * @returns {Object|null}
 */
function parseUsageResponse(response) {
  const fiveHour = response.five_hour?.utilization;
  const sevenDay = response.seven_day?.utilization;

  // Need at least one valid value
  if (fiveHour == null && sevenDay == null) return null;

  // Clamp values to 0-100 and filter invalid
  const clamp = (v) => {
    if (v == null || !isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
  };

  // Parse ISO 8601 date strings to Date objects
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Per-model quotas are at the top level (flat structure)
  const sonnetSevenDay = response.seven_day_sonnet?.utilization;
  const sonnetResetsAt = response.seven_day_sonnet?.resets_at;

  const result = {
    fiveHourPercent: clamp(fiveHour),
    weeklyPercent: clamp(sevenDay),
    fiveHourResetsAt: parseDate(response.five_hour?.resets_at),
    weeklyResetsAt: parseDate(response.seven_day?.resets_at),
  };

  // Add Sonnet-specific quota if available from API
  if (sonnetSevenDay != null) {
    result.sonnetWeeklyPercent = clamp(sonnetSevenDay);
    result.sonnetWeeklyResetsAt = parseDate(sonnetResetsAt);
  }

  var opusSevenDay = response.seven_day_opus && response.seven_day_opus.utilization;
  var opusResetsAt = response.seven_day_opus && response.seven_day_opus.resets_at;
  if (opusSevenDay != null) {
    result.opusWeeklyPercent = clamp(opusSevenDay);
    result.opusWeeklyResetsAt = parseDate(opusResetsAt);
  }

  return result;
}

/**
 * Format remaining time until reset
 * @param {Date|null} resetDate
 * @returns {string|null}
 */
export function formatTimeUntilReset(resetDate) {
  if (!resetDate) return null;

  const now = Date.now();
  const resetTime = resetDate.getTime();
  const diffMs = resetTime - now;

  if (diffMs <= 0) return '0m';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h${minutes}m`;
  }

  return `${minutes}m`;
}

var DEFAULT_OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

function refreshAccessToken(refreshToken) {
  return new Promise((resolve) => {
    var clientId = process.env.CLAUDE_CODE_OAUTH_CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID;
    var body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }).toString();
    var req = https.request({
      hostname: 'platform.claude.com',
      path: '/v1/oauth/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      timeout: API_TIMEOUT_MS,
    }, (res) => {
      var data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            var parsed = JSON.parse(data);
            if (parsed.access_token) {
              resolve({ accessToken: parsed.access_token, refreshToken: parsed.refresh_token || refreshToken, expiresAt: parsed.expires_in ? Date.now() + parsed.expires_in * 1000 : parsed.expires_at });
              return;
            }
          } catch { }
        }
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end(body);
  });
}

function writeBackCredentials(creds) {
  try {
    var credPath = join(homedir(), '.claude/.credentials.json');
    if (!existsSync(credPath)) return;
    var content = readFileSync(credPath, 'utf-8');
    var parsed = JSON.parse(content);
    if (parsed.claudeAiOauth) {
      parsed.claudeAiOauth.accessToken = creds.accessToken;
      if (creds.expiresAt != null) parsed.claudeAiOauth.expiresAt = creds.expiresAt;
      if (creds.refreshToken) parsed.claudeAiOauth.refreshToken = creds.refreshToken;
    } else {
      parsed.accessToken = creds.accessToken;
      if (creds.expiresAt != null) parsed.expiresAt = creds.expiresAt;
      if (creds.refreshToken) parsed.refreshToken = creds.refreshToken;
    }
    writeFileSync(credPath, JSON.stringify(parsed, null, 2));
  } catch { }
}

/**
 * Check if ANTHROPIC_BASE_URL points to z.ai
 */
function isZaiHost(urlString) {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    return hostname === 'z.ai' || hostname.endsWith('.z.ai');
  } catch {
    return false;
  }
}

/**
 * Fetch usage from z.ai GLM API
 */
function fetchUsageFromZai() {
  return new Promise((resolve) => {
    const baseUrl = process.env.ANTHROPIC_BASE_URL;
    const authToken = process.env.ANTHROPIC_AUTH_TOKEN;

    if (!baseUrl || !authToken) {
      resolve(null);
      return;
    }

    try {
      const url = new URL(baseUrl);
      const baseDomain = `${url.protocol}//${url.host}`;
      const quotaLimitUrl = `${baseDomain}/api/monitor/usage/quota/limit`;
      const urlObj = new URL(quotaLimitUrl);

      const req = https.request(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname,
          method: 'GET',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json',
            'Accept-Language': 'en-US,en',
          },
          timeout: API_TIMEOUT_MS,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data));
              } catch {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          });
        }
      );

      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    } catch {
      resolve(null);
    }
  });
}

/**
 * Parse z.ai API response into usage data
 */
function parseZaiResponse(response) {
  var limits = response && response.data && response.data.limits;
  if (!limits || limits.length === 0) return null;

  var tokensLimit = null;
  var timeLimit = null;
  for (var i = 0; i < limits.length; i++) {
    if (limits[i].type === 'TOKENS_LIMIT') tokensLimit = limits[i];
    if (limits[i].type === 'TIME_LIMIT') timeLimit = limits[i];
  }

  if (!tokensLimit && !timeLimit) return null;

  var clamp = function(v) {
    if (v == null || !isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
  };

  var parseResetTime = function(timestamp) {
    if (!timestamp) return null;
    try {
      var date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  return {
    fiveHourPercent: tokensLimit ? clamp(tokensLimit.percentage) : 0,
    fiveHourResetsAt: tokensLimit ? parseResetTime(tokensLimit.nextResetTime) : null,
    // z.ai has no weekly quota
    monthlyPercent: timeLimit ? clamp(timeLimit.percentage) : undefined,
    monthlyResetsAt: timeLimit ? (parseResetTime(timeLimit.nextResetTime) || null) : undefined,
  };
}

/**
 * Get usage data (with caching)
 *
 * Returns null if:
 * - No OAuth credentials available (API users)
 * - Credentials expired
 * - API call failed
 *
 * @returns {Promise<Object|null>}
 */
export async function getClaudeUsage() {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const isZai = baseUrl != null && isZaiHost(baseUrl);
  const currentSource = isZai && authToken ? 'zai' : 'anthropic';

  // Check cache first (source must match)
  const cache = readCache();
  if (cache && isCacheValid(cache) && cache.source === currentSource) {
    return cache.data;
  }

  // z.ai path
  if (isZai && authToken) {
    const response = await fetchUsageFromZai();
    if (!response) {
      writeCache(null, true, 'zai');
      return null;
    }
    const usage = parseZaiResponse(response);
    writeCache(usage, !usage, 'zai');
    return usage;
  }

  // Anthropic OAuth path
  // Get credentials
  var creds = getCredentials();
  if (!creds) {
    writeCache(null, true, 'anthropic');
    return null;
  }
  if (!validateCredentials(creds)) {
    if (creds.refreshToken) {
      var refreshed = await refreshAccessToken(creds.refreshToken);
      if (refreshed) {
        creds = Object.assign({}, creds, refreshed);
        writeBackCredentials(creds);
      } else {
        writeCache(null, true, 'anthropic');
        return null;
      }
    } else {
      writeCache(null, true, 'anthropic');
      return null;
    }
  }

  // Fetch from API
  const response = await fetchUsageFromApi(creds.accessToken);
  if (!response) {
    writeCache(null, true, 'anthropic');
    return null;
  }

  // Parse response
  const usage = parseUsageResponse(response);
  writeCache(usage, !usage, 'anthropic');

  return usage;
}

/**
 * Check if OAuth credentials are available
 * @returns {boolean}
 */
export function hasClaudeCredentials() {
  const creds = getCredentials();
  return creds && validateCredentials(creds);
}
