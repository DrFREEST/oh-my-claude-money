#!/usr/bin/env node
// OMCM PostToolUseFailure Hook
// OMC 4.3.0 호환: 도구 실패를 .omc/state/last-tool-error.json에 기록

import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join, resolve, sep } from 'path';

const RETRY_WINDOW_MS = 60000;
const MAX_ERROR_LENGTH = 500;
const MAX_INPUT_PREVIEW_LENGTH = 200;

function isPathContained(targetPath, basePath) {
  const normalizedTarget = resolve(targetPath);
  const normalizedBase = resolve(basePath);
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}

function truncate(str, maxLen) {
  if (!str) return '';
  const s = String(str);
  return s.length <= maxLen ? s : s.slice(0, maxLen) + '...';
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const cwd = process.cwd();
  const omcDir = join(cwd, '.omc');
  const stateDir = join(omcDir, 'state');

  if (!isPathContained(stateDir, cwd)) process.exit(0);

  try {
    if (!existsSync(omcDir)) mkdirSync(omcDir, { recursive: true });
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
  } catch {
    process.exit(0);
  }

  const errorFile = join(stateDir, 'last-tool-error.json');
  let retryCount = 0;

  if (existsSync(errorFile)) {
    try {
      const prev = JSON.parse(readFileSync(errorFile, 'utf8'));
      const age = Date.now() - (prev.timestamp || 0);
      if (age < RETRY_WINDOW_MS && prev.tool === payload.tool_name) {
        retryCount = (prev.retry_count || 0) + 1;
      }
    } catch {}
  }

  const record = {
    tool: payload.tool_name || '',
    input_preview: truncate(
      typeof payload.tool_input === 'string'
        ? payload.tool_input
        : JSON.stringify(payload.tool_input),
      MAX_INPUT_PREVIEW_LENGTH
    ),
    error: truncate(payload.tool_response || payload.error || '', MAX_ERROR_LENGTH),
    retry_count: retryCount,
    timestamp: Date.now(),
  };

  try {
    const { writeFileSync } = await import('fs');
    writeFileSync(errorFile, JSON.stringify(record, null, 2), 'utf8');
  } catch {}

  process.exit(0);
}

main().catch(() => process.exit(0));
