#!/usr/bin/env node
/**
 * OMCM HUD Wrapper - Simple delegation to actual HUD
 *
 * Copy this file to ~/.claude/hud/omcm-hud.mjs during installation.
 */
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const HOME = process.env.HOME || '';

function findOmcmHudPath() {
  const cacheDir = join(HOME, '.claude', 'plugins', 'cache', 'omcm', 'omcm');

  if (!existsSync(cacheDir)) {
    // Fallback to marketplaces
    const marketplacePath = join(HOME, '.claude', 'plugins', 'marketplaces', 'omcm', 'src', 'hud', 'omcm-hud.mjs');
    return existsSync(marketplacePath) ? marketplacePath : null;
  }

  try {
    const versions = readdirSync(cacheDir)
      .filter(f => /^\d+\.\d+\.\d+$/.test(f))
      .sort((a, b) => {
        const [aMaj, aMin, aPat] = a.split('.').map(Number);
        const [bMaj, bMin, bPat] = b.split('.').map(Number);
        return (bMaj - aMaj) || (bMin - aMin) || (bPat - aPat);
      });

    if (versions.length > 0) {
      const hudPath = join(cacheDir, versions[0], 'src', 'hud', 'omcm-hud.mjs');
      if (existsSync(hudPath)) return hudPath;
    }
  } catch {}

  return null;
}

const hudPath = findOmcmHudPath();

if (!hudPath) {
  console.log('[OMCM] HUD not found');
  process.exit(0);
}

// Direct import and run
import(hudPath).catch(() => {
  console.log('[OMCM] HUD error');
});
