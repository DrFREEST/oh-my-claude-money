/**
 * audit-reader.mjs - OMC v4.2.6 감사 로그 리더
 *
 * OMC의 .omc/prompts/ 디렉토리에 저장된 감사 로그를 읽어
 * MCP 호출 통계와 비용을 분석합니다.
 *
 * @version 1.1.0
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * .omc/prompts/ 디렉토리에서 감사 로그 읽기
 */
export function readAuditTrail(baseDir) {
  var promptsDir = baseDir || join(process.cwd(), '.omc', 'prompts');

  if (!existsSync(promptsDir)) {
    return { entries: [], stats: { total: 0, byProvider: {}, byAgent: {} } };
  }

  var files;
  try {
    files = readdirSync(promptsDir);
  } catch (e) {
    return { entries: [], stats: { total: 0, byProvider: {}, byAgent: {} } };
  }

  var entries = [];
  var stats = {
    total: 0,
    byProvider: { codex: 0, gemini: 0 },
    byAgent: {},
    byModel: {},
    byStatus: { completed: 0, failed: 0, timeout: 0, running: 0, spawned: 0 }
  };

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (!file.endsWith('.json')) continue;
    if (file.indexOf('-status-') === -1) continue;

    try {
      var data = JSON.parse(readFileSync(join(promptsDir, file), 'utf-8'));
      var entry = {
        file: file,
        provider: data.provider || 'unknown',
        model: data.model || 'unknown',
        agent: data.agent || data.agent_role || 'unknown',
        status: data.status || 'unknown',
        createdAt: data.createdAt || data.timestamp || null,
        completedAt: data.completedAt || null,
        pid: data.pid || null
      };

      entries.push(entry);
      stats.total++;

      if (file.indexOf('codex-') === 0) stats.byProvider.codex++;
      else if (file.indexOf('gemini-') === 0) stats.byProvider.gemini++;

      var agentKey = entry.agent;
      stats.byAgent[agentKey] = (stats.byAgent[agentKey] || 0) + 1;
      var modelKey = entry.model;
      stats.byModel[modelKey] = (stats.byModel[modelKey] || 0) + 1;
      if (stats.byStatus[entry.status] !== undefined) stats.byStatus[entry.status]++;
    } catch (e) {
      // 파싱 실패 무시
    }
  }

  entries.sort(function(a, b) {
    var ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    var tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return { entries: entries, stats: stats };
}

/**
 * 세션별 MCP 호출 요약
 */
export function getSessionMcpSummary(baseDir) {
  var result = readAuditTrail(baseDir);
  return {
    codex: {
      calls: result.stats.byProvider.codex,
      models: Object.keys(result.stats.byModel).filter(function(m) { return m.indexOf('gpt') !== -1; })
    },
    gemini: {
      calls: result.stats.byProvider.gemini,
      models: Object.keys(result.stats.byModel).filter(function(m) { return m.indexOf('gemini') !== -1; })
    },
    total: result.stats.total,
    byAgent: result.stats.byAgent,
    byStatus: result.stats.byStatus
  };
}

/**
 * 활성 작업(running/spawned) 확인
 */
export function getActiveJobs(baseDir) {
  var result = readAuditTrail(baseDir);
  return result.entries.filter(function(e) {
    return e.status === 'running' || e.status === 'spawned';
  });
}
