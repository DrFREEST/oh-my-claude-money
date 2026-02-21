/**
 * tool-tracker-logger.mjs - 도구 사용 JSONL 로거
 *
 * 세션별로 도구 호출을 JSONL 형식으로 기록
 * 통계 조회 기능 제공
 */
import { existsSync, readFileSync, mkdirSync, openSync, writeSync, closeSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

var SESSIONS_DIR = join(homedir(), '.omcm', 'sessions');

/**
 * 도구 사용 로깅
 * @param {string|null} sessionId - 세션 ID (null이면 글로벌 디렉토리)
 * @param {string} toolName - 도구 이름 (Read, Edit, Bash, Grep, Glob, Task 등)
 */
export function logToolUsage(sessionId, toolName) {
  if (!toolName) return;

  var logDir;
  if (sessionId) {
    logDir = join(SESSIONS_DIR, sessionId);
  } else {
    logDir = join(homedir(), '.omcm');
  }

  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  var logFile = join(logDir, 'tool-usage.jsonl');
  var entry = {
    timestamp: new Date().toISOString(),
    tool_name: toolName,
    session_id: sessionId || 'global'
  };

  var line = JSON.stringify(entry) + '\n';

  try {
    var fd = openSync(logFile, 'a');
    writeSync(fd, line);
    closeSync(fd);
  } catch (e) {
    // 로깅 실패 무시
  }
}

/**
 * 세션별 도구 사용 통계 조회
 * @param {string} sessionId - 세션 ID
 * @returns {object|null} - { Read: n, Edit: n, Bash: n, Grep: n, Glob: n, Task: n, total: n }
 */
export function getToolUsageStats(sessionId) {
  if (!sessionId) return null;

  var logFile = join(SESSIONS_DIR, sessionId, 'tool-usage.jsonl');
  if (!existsSync(logFile)) return null;

  var result = { Read: 0, Edit: 0, Bash: 0, Grep: 0, Glob: 0, Task: 0, OmcmMcp: 0, total: 0 };

  try {
    var content = readFileSync(logFile, 'utf-8');
    var lines = content.trim().split('\n');

    for (var i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      try {
        var entry = JSON.parse(lines[i]);
        var name = entry.tool_name || '';

        if (name.startsWith('mcp__omcm-mcp__')) {
          result.OmcmMcp++;
        } else if (result[name] !== undefined) {
          result[name]++;
        }
        result.total++;
      } catch (e) {
        // 개별 라인 파싱 실패 무시
      }
    }
  } catch (e) {
    return null;
  }

  return result;
}

export { SESSIONS_DIR };
