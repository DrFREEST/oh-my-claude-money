#!/usr/bin/env node
/**
 * OMCM HUD Wrapper - Dynamic delegation to marketplace HUD
 *
 * 이 파일을 ~/.claude/hud/omcm-hud.mjs 로 설치합니다.
 * 실제 HUD 소스는 마켓플레이스 디렉토리에서 동적 import하여
 * 상대 경로 모듈(utils/, tracking/ 등)이 올바르게 해석됩니다.
 *
 * stdin 처리:
 * - Claude Code가 HUD에 전달하는 stdin JSON을 먼저 읽고
 * - __OMCM_STDIN_DATA 환경변수로 설정한 후
 * - 실제 HUD를 동적 import (stdin 이중 읽기 방지)
 *
 * 탐색 순서:
 * 1. 플러그인 캐시 (최신 버전)
 * 2. ~/.claude/marketplaces/omcm/ (rsync 동기화 경로)
 * 3. ~/.claude/plugins/marketplaces/omcm/ (플러그인 설치 경로)
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

var HOME = process.env.HOME || '';

// stdin을 먼저 읽어서 환경변수로 전달 (동적 import 전에 실행)
try {
  if (!process.stdin.isTTY) {
    process.env.__OMCM_STDIN_DATA = readFileSync(0, 'utf-8');
  }
} catch (e) {
  // stdin 읽기 실패 시 빈 문자열
}

function findOmcmHudPath() {
  // 1. 플러그인 캐시 (버전별 최신)
  var cacheDir = join(HOME, '.claude', 'plugins', 'cache', 'omcm', 'omcm');
  if (existsSync(cacheDir)) {
    try {
      var versions = readdirSync(cacheDir)
        .filter(function(f) { return /^\d+\.\d+\.\d+$/.test(f); })
        .sort(function(a, b) {
          var ap = a.split('.').map(Number);
          var bp = b.split('.').map(Number);
          return (bp[0] - ap[0]) || (bp[1] - ap[1]) || (bp[2] - ap[2]);
        });

      if (versions.length > 0) {
        var hudPath = join(cacheDir, versions[0], 'src', 'hud', 'omcm-hud.mjs');
        if (existsSync(hudPath)) return hudPath;
      }
    } catch (e) {
      // 캐시 탐색 실패 시 다음으로
    }
  }

  // 2. 마켓플레이스 동기화 경로
  var marketplacePath = join(HOME, '.claude', 'marketplaces', 'omcm', 'src', 'hud', 'omcm-hud.mjs');
  if (existsSync(marketplacePath)) return marketplacePath;

  // 3. 플러그인 설치 경로
  var pluginPath = join(HOME, '.claude', 'plugins', 'marketplaces', 'omcm', 'src', 'hud', 'omcm-hud.mjs');
  if (existsSync(pluginPath)) return pluginPath;

  return null;
}

var hudPath = findOmcmHudPath();

if (!hudPath) {
  console.log('[OMCM] HUD not found');
  process.exit(0);
}

// 동적 import - stdin은 이미 환경변수로 전달됨
import(hudPath).catch(function(e) {
  console.log('[OMCM] HUD load error');
  process.stderr.write('[OMCM] ' + e.message + '\n');
});
