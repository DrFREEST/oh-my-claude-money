#!/usr/bin/env node
/**
 * OMCM HUD Entry Point (CommonJS)
 * Captures stdin synchronously before ESM module loads
 */
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// Capture stdin SYNCHRONOUSLY
let stdinData = '';
try {
  if (!process.stdin.isTTY) {
    stdinData = fs.readFileSync(0, 'utf-8');
  }
} catch {
  // stdin not available
}

// Store in environment for ESM module to access
process.env.__OMCM_STDIN_DATA = stdinData;

// Now load the ESM module
const hudPath = path.join(__dirname, 'omcm-hud.mjs');

// Use dynamic import
import(hudPath).catch((err) => {
  console.error('[OMCM] Error:', err.message);
  process.exit(1);
});
