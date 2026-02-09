/**
 * OMC State Bridge
 *
 * Integrates OMCM fusion state with OMC v4.0.5+/v4.1.7 state management system.
 * Syncs OMCM state to {worktree}/.omc/state/ for compatibility with OMC cancel skill
 * and other OMC state tools.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

var OMC_STATE_DIR = '.omc/state';
var OMCM_STATE_FILE = 'omcm-fusion-state.json';
var OMCM_MODE_NAME = 'omcm-fusion';

/**
 * Find git worktree root by walking up directory tree
 * @param {string} startPath - Starting path
 * @returns {string|null} Git worktree root or null if not found
 */
function findGitRoot(startPath) {
  var currentPath = resolve(startPath);
  var rootPath = resolve('/');

  while (currentPath !== rootPath) {
    var gitPath = join(currentPath, '.git');
    if (existsSync(gitPath)) {
      return currentPath;
    }
    currentPath = resolve(currentPath, '..');
  }

  return null;
}

/**
 * Find OMC state directory in git worktree root or cwd
 * @returns {string|null} Path to .omc/state directory, or null if failed
 */
export function findOmcStateDir() {
  try {
    var worktreeRoot = findGitRoot(process.cwd());

    if (!worktreeRoot) {
      worktreeRoot = process.cwd();
    }

    var omcStateDir = join(worktreeRoot, OMC_STATE_DIR);

    // Create directory if it doesn't exist
    if (!existsSync(omcStateDir)) {
      mkdirSync(omcStateDir, { recursive: true });
    }

    return omcStateDir;
  } catch (error) {
    return null;
  }
}

/**
 * Sync OMCM fusion state to OMC state directory
 * @param {Object} omcmState - OMCM fusion state object
 * @returns {boolean} True if sync successful, false otherwise
 */
export function syncToOmcState(omcmState) {
  try {
    var omcStateDir = findOmcStateDir();
    if (!omcStateDir) {
      return false;
    }

    var stateFilePath = join(omcStateDir, OMCM_STATE_FILE);

    // Build OMC-compatible state structure
    var omcState = {
      active: true,
      mode: OMCM_MODE_NAME,
      fusionEnabled: omcmState.fusionEnabled || false,
      routingMode: omcmState.routingMode || 'balanced',
      savedTokens: omcmState.savedTokens || 0,
      routedToOpenCode: omcmState.routedToOpenCode || 0,
      totalTasks: omcmState.totalTasks || 0,
      mcpTracking: omcmState.mcpTracking || {},
      lastUpdated: new Date().toISOString()
    };

    writeFileSync(stateFilePath, JSON.stringify(omcState, null, 2), 'utf8');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Read OMC state for a specific mode
 * @param {string} [modeName='omcm-fusion'] - Mode name to read
 * @returns {Object|null} State object or null if not found
 */
export function readOmcState(modeName) {
  if (!modeName) {
    modeName = OMCM_MODE_NAME;
  }

  try {
    var omcStateDir = findOmcStateDir();
    if (!omcStateDir) {
      return null;
    }

    var stateFilePath = join(omcStateDir, modeName + '-state.json');

    if (!existsSync(stateFilePath)) {
      return null;
    }

    var stateContent = readFileSync(stateFilePath, 'utf8');
    return JSON.parse(stateContent);
  } catch (error) {
    return null;
  }
}

/**
 * Clear OMCM state in OMC (set active: false)
 * @returns {boolean} True if cleared successfully, false otherwise
 */
export function clearOmcState() {
  try {
    var omcStateDir = findOmcStateDir();
    if (!omcStateDir) {
      return false;
    }

    var stateFilePath = join(omcStateDir, OMCM_STATE_FILE);

    if (!existsSync(stateFilePath)) {
      return true; // Already cleared
    }

    var currentState = JSON.parse(readFileSync(stateFilePath, 'utf8'));
    currentState.active = false;
    currentState.lastUpdated = new Date().toISOString();

    writeFileSync(stateFilePath, JSON.stringify(currentState, null, 2), 'utf8');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all active OMC modes
 * @returns {Array<Object>} Array of {mode, active} objects
 */
export function getOmcActiveModes() {
  try {
    var omcStateDir = findOmcStateDir();
    if (!omcStateDir) {
      return [];
    }

    if (!existsSync(omcStateDir)) {
      return [];
    }

    var files = readdirSync(omcStateDir);
    var activeModes = [];

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (file.endsWith('-state.json')) {
        var modeName = file.replace('-state.json', '');
        var statePath = join(omcStateDir, file);

        try {
          var stateContent = readFileSync(statePath, 'utf8');
          var state = JSON.parse(stateContent);

          activeModes.push({
            mode: modeName,
            active: state.active || false
          });
        } catch (parseError) {
          // Skip invalid state files
          continue;
        }
      }
    }

    return activeModes;
  } catch (error) {
    return [];
  }
}

/**
 * Check if a specific OMC mode is active
 * @param {string} modeName - Mode name to check
 * @returns {boolean} True if mode is active, false otherwise
 */
export function isOmcModeActive(modeName) {
  try {
    var state = readOmcState(modeName);
    if (!state) {
      return false;
    }

    return state.active || false;
  } catch (error) {
    return false;
  }
}

/**
 * Get compatibility info for OMC cancel skill
 * @returns {Object} Cancel compatibility information
 */
export function getOmcCancelCompatInfo() {
  return {
    modeName: OMCM_MODE_NAME,
    stateFile: OMCM_STATE_FILE,
    cancelAction: 'set active=false'
  };
}
