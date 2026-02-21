/**
 * SQLite shared utilities for omcm-mcp servers.
 * Provides DB path resolution and common helpers.
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Resolve the base omcm data directory, creating it if needed.
 * @returns {string} Absolute path to ~/.omcm
 */
export function getOmcmDataDir() {
  const dir = join(homedir(), '.omcm');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 * @param {string} dirPath
 */
export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate a short deterministic hash for a project path.
 * Uses a simple djb2-style algorithm suitable for directory naming.
 * @param {string} input
 * @returns {string} 8-char hex string
 */
export function hashPath(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Format a Date (or now) as ISO 8601 string.
 * @param {Date} [date]
 * @returns {string}
 */
export function nowISO(date) {
  return (date || new Date()).toISOString();
}
