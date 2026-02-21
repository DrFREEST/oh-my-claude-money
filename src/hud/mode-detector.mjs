#!/usr/bin/env node
/**
 * OMCM - Mode Detector
 *
 * Detects active OMC/OMCM work modes by reading state files.
 * Independent implementation for OMCM HUD.
 *
 * Detectable modes:
 * - ultrawork: Maximum parallel execution
 * - ralph: Persistence mode
 * - autopilot: Full autonomous execution
 * - ultrapilot: Parallel autopilot
 * - ultraqa: QA cycling
 * - swarm: N coordinated agents
 * - pipeline: Sequential agent chaining
 * - team: Team coordination system
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// State file locations (multiple paths for compatibility)
const STATE_PATHS = {
  // OMC state locations
  omcGlobal: join(homedir(), '.claude'),
  omcPlugin: join(homedir(), '.claude/plugins/oh-my-claudecode'),
  omcSisyphus: '.sisyphus',
  omcState: '.omc/state',

  // OMCM state locations
  omcmLocal: '.omc',
  omcmState: '.omc/state',
};

// Mode definitions with their state file patterns
const MODE_DEFINITIONS = [
  {
    name: 'ultrawork',
    abbrev: 'ULW',
    files: ['ultrawork-state.json'],
    activeKey: 'active',
    color: '\x1b[35m', // Magenta
  },
  {
    name: 'ralph',
    abbrev: 'RLP',
    files: ['ralph-state.json', 'ralph-plan-state.json'],
    activeKey: 'active',
    color: '\x1b[33m', // Yellow
  },
  {
    name: 'autopilot',
    abbrev: 'APT',
    files: ['autopilot-state.json'],
    activeKey: 'active',
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'ultrapilot',
    abbrev: 'UPT',
    files: ['ultrapilot-state.json'],
    activeKey: 'active',
    color: '\x1b[34m', // Blue
  },
  {
    name: 'ultraqa',
    abbrev: 'UQA',
    files: ['ultraqa-state.json'],
    activeKey: 'active',
    color: '\x1b[32m', // Green
  },
  {
    name: 'swarm',
    abbrev: 'SWM',
    files: ['swarm-summary.json', 'swarm-state.json'],
    activeKey: 'active',
    color: '\x1b[34m', // Blue
  },
  {
    name: 'pipeline',
    abbrev: 'PIP',
    files: ['pipeline-state.json'],
    activeKey: 'active',
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'team',
    abbrev: 'TEM',
    files: ['team-state.json'],
    activeKey: 'active',
    color: '\x1b[33m', // Yellow
  },
];

/**
 * Try to read a JSON state file
 * @param {string} filePath
 * @returns {Object|null}
 */
function readStateFile(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Check if a state file indicates active mode
 * @param {Object} state - Parsed state object
 * @param {string} activeKey - Key to check for active status
 * @returns {boolean}
 */
function isStateActive(state, activeKey) {
  if (!state) return false;
  return state[activeKey] === true;
}

/**
 * Get all potential state file locations
 * @param {string} cwd - Current working directory
 * @returns {string[]}
 */
function getStateSearchPaths(cwd) {
  const paths = [];

  // Global OMC paths
  paths.push(STATE_PATHS.omcGlobal);
  paths.push(STATE_PATHS.omcPlugin);

  // Local project paths
  if (cwd) {
    paths.push(join(cwd, STATE_PATHS.omcSisyphus));
    paths.push(join(cwd, STATE_PATHS.omcState));
    paths.push(join(cwd, STATE_PATHS.omcmLocal));
    paths.push(join(cwd, STATE_PATHS.omcmState));
  }

  // Also check OMC plugin cache versions
  const cacheDir = join(homedir(), '.claude/plugins/cache/omc/oh-my-claudecode');
  if (existsSync(cacheDir)) {
    try {
      const versions = readdirSync(cacheDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort()
        .reverse(); // Latest version first

      for (const version of versions.slice(0, 3)) { // Check last 3 versions
        paths.push(join(cacheDir, version, '.sisyphus'));
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return paths;
}

/**
 * Find and read state for a specific mode
 * @param {Object} modeDef - Mode definition
 * @param {string[]} searchPaths - Paths to search
 * @returns {Object|null} - State if active, null otherwise
 */
function findModeState(modeDef, searchPaths) {
  for (const basePath of searchPaths) {
    for (const fileName of modeDef.files) {
      const filePath = join(basePath, fileName);
      const state = readStateFile(filePath);

      if (state && isStateActive(state, modeDef.activeKey)) {
        return {
          ...state,
          _sourcePath: filePath,
        };
      }
    }
  }
  return null;
}

/**
 * Calculate mode duration from started_at
 * @param {string|Date} startedAt
 * @returns {string|null}
 */
function calculateDuration(startedAt) {
  if (!startedAt) return null;

  try {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const diffMs = now - start;

    if (diffMs < 0) return null;

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h${minutes % 60}m`;
    }
    return `${minutes}m`;
  } catch {
    return null;
  }
}

/**
 * Detect all active modes
 * @param {string} cwd - Current working directory (optional)
 * @returns {Object[]} - Array of active modes with details
 */
export function detectActiveModes(cwd = process.cwd()) {
  const searchPaths = getStateSearchPaths(cwd);
  const activeModes = [];

  for (const modeDef of MODE_DEFINITIONS) {
    const state = findModeState(modeDef, searchPaths);

    if (state) {
      activeModes.push({
        name: modeDef.name,
        abbrev: modeDef.abbrev,
        color: modeDef.color,
        state: state,
        duration: calculateDuration(state.started_at),
        reinforcementCount: state.reinforcement_count || 0,
        iteration: state.iteration || null,
        maxIterations: state.max_iterations || null,
      });
    }
  }

  return activeModes;
}

/**
 * Get primary active mode (first found)
 * @param {string} cwd - Current working directory (optional)
 * @returns {Object|null}
 */
export function getPrimaryMode(cwd = process.cwd()) {
  const modes = detectActiveModes(cwd);
  return modes.length > 0 ? modes[0] : null;
}

/**
 * Render mode status for HUD
 * Format: [ULW 2h15m] or [RLP i3/5]
 * @param {string} cwd - Current working directory (optional)
 * @returns {string|null}
 */
export function renderModeStatus(cwd = process.cwd()) {
  const modes = detectActiveModes(cwd);

  if (modes.length === 0) {
    return null;
  }

  const RESET = '\x1b[0m';
  const parts = [];

  for (const mode of modes) {
    let detail = '';

    // Add duration or iteration info
    if (mode.iteration && mode.maxIterations) {
      detail = `i${mode.iteration}/${mode.maxIterations}`;
    } else if (mode.duration) {
      detail = mode.duration;
    } else if (mode.reinforcementCount > 0) {
      detail = `r${mode.reinforcementCount}`;
    }

    const modeStr = detail
      ? `${mode.color}${mode.abbrev}${RESET} ${detail}`
      : `${mode.color}${mode.abbrev}${RESET}`;

    parts.push(modeStr);
  }

  return `[${parts.join('|')}]`;
}

/**
 * Check if any work mode is active
 * @param {string} cwd - Current working directory (optional)
 * @returns {boolean}
 */
export function isAnyModeActive(cwd = process.cwd()) {
  return detectActiveModes(cwd).length > 0;
}
