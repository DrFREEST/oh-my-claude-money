#!/usr/bin/env node
/**
 * OMCM HUD Wrapper - Delegates to oh-my-claude-money HUD
 *
 * Version-agnostic wrapper that finds the installed OMCM plugin
 * and delegates HUD rendering to it.
 *
 * This file should be copied to ~/.claude/hud/omcm-hud.mjs during installation.
 */
import { spawn } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const HOME = process.env.HOME || '';

/**
 * Find OMCM HUD path in plugin cache (version-agnostic)
 */
function findOmcmHudPath() {
  const cacheDir = join(HOME, '.claude', 'plugins', 'cache', 'omcm', 'omcm');

  if (!existsSync(cacheDir)) {
    return null;
  }

  try {
    // Find latest version directory
    const versions = readdirSync(cacheDir)
      .filter(f => /^\d+\.\d+\.\d+$/.test(f))
      .sort((a, b) => {
        const [aMaj, aMin, aPat] = a.split('.').map(Number);
        const [bMaj, bMin, bPat] = b.split('.').map(Number);
        return (bMaj - aMaj) || (bMin - aMin) || (bPat - aPat);
      });

    if (versions.length > 0) {
      const latestVersion = versions[0];
      const hudPath = join(cacheDir, latestVersion, 'src', 'hud', 'omcm-hud.mjs');

      if (existsSync(hudPath)) {
        return hudPath;
      }
    }
  } catch (e) {
    // Fallback
  }

  // Try marketplaces path as fallback
  const marketplacePath = join(HOME, '.claude', 'plugins', 'marketplaces', 'omcm', 'src', 'hud', 'omcm-hud.mjs');
  if (existsSync(marketplacePath)) {
    return marketplacePath;
  }

  return null;
}

const OMCM_HUD_PATH = findOmcmHudPath();

if (!OMCM_HUD_PATH) {
  console.log('[OMCM] HUD not found - run /omcm:fusion-setup');
  process.exit(0);
}

// Read stdin and pass to child
let stdinData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    stdinData += chunk;
  }
});

process.stdin.on('end', () => {
  const child = spawn('node', [OMCM_HUD_PATH], {
    stdio: ['pipe', 'inherit', 'inherit'],
    env: { ...process.env }
  });

  if (stdinData) {
    child.stdin.write(stdinData);
  }
  child.stdin.end();

  child.on('exit', (code) => process.exit(code || 0));
});

// Timeout fallback
setTimeout(() => {
  const child = spawn('node', [OMCM_HUD_PATH], {
    stdio: ['pipe', 'inherit', 'inherit'],
    env: { ...process.env }
  });

  if (stdinData) {
    child.stdin.write(stdinData);
  }
  child.stdin.end();

  child.on('exit', (code) => process.exit(code || 0));
}, 500);
