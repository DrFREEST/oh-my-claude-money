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
 */
function writeCache(data, error = false) {
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
  // Check cache first
  const cache = readCache();
  if (cache && isCacheValid(cache)) {
    return cache.data;
  }

  // Get credentials
  const creds = getCredentials();
  if (!creds || !validateCredentials(creds)) {
    writeCache(null, true);
    return null;
  }

  // Fetch from API
  const response = await fetchUsageFromApi(creds.accessToken);
  if (!response) {
    writeCache(null, true);
    return null;
  }

  // Parse response
  const usage = parseUsageResponse(response);
  writeCache(usage, !usage);

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
