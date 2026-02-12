#!/usr/bin/env node
/**
 * fusion-router.mjs - PreToolUse Hook 진입점 (Thin Shim)
 *
 * ESM에서 static import는 모든 top-level 코드보다 먼저 실행됩니다.
 * 따라서 static import 체인 중 하나라도 stdin을 소비하면 hook이 실패합니다.
 * (flow-tracer CJS 동적 로드, cli-executor 등의 모듈 초기화)
 *
 * 해결: 이 파일은 `fs`만 static import하고 stdin을 동기적으로 먼저 읽은 뒤
 * 환경변수로 전달하고, 메인 로직을 동적 import합니다.
 *
 * 패턴 출처: omcm-hud-wrapper.mjs (동일 문제 해결)
 *
 * v1.4.5: thin shim 분리 — stdin 소비 버그 수정
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// stdin을 동기적으로 먼저 읽음 (static import는 fs/url/path뿐이므로 안전)
try {
  process.env.__OMCM_FUSION_STDIN = readFileSync(0, 'utf-8');
} catch (e) {
  process.env.__OMCM_FUSION_STDIN = '';
}

// 메인 로직 동적 import (static import 없이 stdin 보호)
var __dir = dirname(fileURLToPath(import.meta.url));
import(join(__dir, 'fusion-router-main.mjs')).catch(function(e) {
  console.error('[OMCM Fusion] Failed to load main: ' + e.message);
  console.log(JSON.stringify({ allow: true, suppressOutput: true }));
});
