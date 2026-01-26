#!/usr/bin/env node
/**
 * OMCM HUD - Independent HUD wrapper for oh-my-claude-money
 *
 * Wraps OMC HUD output and adds fusion mode metrics.
 * This keeps OMCM independent from OMC for clean uninstallation.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { renderFusionMetrics, renderProviderLimits, renderFallbackStatus } from './fusion-renderer.mjs';
import { readFusionState } from '../utils/fusion-tracker.mjs';
import { getLimitsForHUD, updateClaudeLimits } from '../utils/provider-limits.mjs';
import { getFallbackOrchestrator } from '../orchestrator/fallback-orchestrator.mjs';

/**
 * OMC HUD 출력에서 Claude 사용량 파싱 및 동기화
 * 패턴: "5h:28%(1h41m) wk:96%(13h41m)"
 */
function syncClaudeUsageFromOmcOutput(omcOutput) {
  if (!omcOutput) return;

  try {
    // 5시간 사용량 파싱: "5h:28%" 또는 "5h:28%(..."
    const fiveHourMatch = omcOutput.match(/5h:(\d+)%/);
    // 주간 사용량 파싱: "wk:96%" 또는 "wk:96%(..."
    const weeklyMatch = omcOutput.match(/wk:(\d+)%/);

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

    // Read fusion state
    const fusionState = readFusionState();

    // Render fusion metrics
    const fusionOutput = renderFusionMetrics(fusionState);

    // Get provider limits for HUD
    let providerLimits = null;
    try {
      providerLimits = getLimitsForHUD();
    } catch (e) {
      // 리밋 정보 없음
    }
    const limitsOutput = renderProviderLimits(providerLimits);

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
    if (fusionOutput) {
      extraParts.push(fusionOutput);
    }
    if (limitsOutput) {
      extraParts.push(limitsOutput);
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
