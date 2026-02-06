/**
 * prompt-file.mjs - OMC v4.0.10 Prompt-file 시스템 호환 유틸리티
 *
 * OMCM이 OpenCode로 라우팅할 때도 prompt-file 시스템을 활용하여
 * OMC의 감사 추적과 호환되는 프롬프트 파일을 생성합니다.
 *
 * OMC 4.0.8+ Breaking Changes:
 * - output_file 파라미터 필수화
 * - prompt 파라미터 제거 (prompt_file만 사용)
 * OMC 4.0.10: output_file에 항상 parsed JSONL 응답 기록 (mtime 감지 제거)
 *
 * @version 1.2.0
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 프롬프트 파일 작성 (OMC 감사 추적 호환)
 *
 * @param {string} baseDir - 기본 디렉토리 (.omc/prompts/ 또는 ~/.omcm/prompts/)
 * @param {string} prompt - 프롬프트 내용
 * @param {object} metadata - 메타데이터
 * @returns {object} - { promptFile, outputFile, responseFile, statusFile }
 */
export function writePromptFile(baseDir, prompt, metadata) {
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  var timestamp = new Date().toISOString();
  var slug = (metadata.agent || 'unknown').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  var prefix = metadata.provider === 'google' ? 'gemini' :
               metadata.provider === 'openai' ? 'codex' : 'omcm';

  var promptFileName = prefix + '-prompt-' + slug + '-' + id + '.md';
  var outputFileName = prefix + '-summary-' + slug + '-' + id + '.md';
  var responseFileName = prefix + '-response-' + slug + '-' + id + '.md';
  var statusFileName = prefix + '-status-' + slug + '-' + id + '.json';

  var frontmatter = [
    '---',
    'provider: ' + (metadata.provider || 'unknown'),
    'model: ' + (metadata.model || 'unknown'),
    'agent: ' + (metadata.agent || 'unknown'),
    'agent_role: ' + (metadata.agentRole || ''),
    'timestamp: ' + timestamp,
    'source: omcm',
    'files: ' + (metadata.contextFiles ? metadata.contextFiles.length : 0),
  ];

  if (metadata.contextFiles && metadata.contextFiles.length > 0) {
    frontmatter.push('context_files:');
    for (var i = 0; i < metadata.contextFiles.length; i++) {
      frontmatter.push('  - ' + metadata.contextFiles[i]);
    }
  }

  frontmatter.push('---');
  frontmatter.push('');

  var content = frontmatter.join('\n') + prompt;
  var promptFile = join(baseDir, promptFileName);
  writeFileSync(promptFile, content, 'utf-8');

  var outputFile = join(baseDir, outputFileName);
  var statusFile = join(baseDir, statusFileName);
  writeFileSync(statusFile, JSON.stringify({
    status: 'spawned',
    provider: metadata.provider,
    model: metadata.model,
    agent: metadata.agent,
    promptFile: promptFile,
    outputFile: outputFile,
    responseFile: join(baseDir, responseFileName),
    createdAt: timestamp
  }, null, 2));

  return {
    promptFile: promptFile,
    outputFile: outputFile,
    responseFile: join(baseDir, responseFileName),
    statusFile: statusFile
  };
}

/**
 * 응답 파일 읽기
 */
export function readResponseFile(responseFile) {
  if (!existsSync(responseFile)) return null;

  try {
    var raw = readFileSync(responseFile, 'utf-8');
    var metadata = {};
    var content = raw;

    if (raw.startsWith('---')) {
      var endIdx = raw.indexOf('---', 3);
      if (endIdx !== -1) {
        var frontmatterRaw = raw.slice(3, endIdx).trim();
        content = raw.slice(endIdx + 3).trim();
        var lines = frontmatterRaw.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var colonIdx = lines[i].indexOf(':');
          if (colonIdx !== -1) {
            var key = lines[i].slice(0, colonIdx).trim();
            var val = lines[i].slice(colonIdx + 1).trim();
            metadata[key] = val;
          }
        }
      }
    }
    return { content: content, metadata: metadata };
  } catch (e) {
    return null;
  }
}

/**
 * 상태 파일 업데이트
 */
export function updateStatusFile(statusFile, status, extra) {
  if (!existsSync(statusFile)) return;
  try {
    var data = JSON.parse(readFileSync(statusFile, 'utf-8'));
    data.status = status;
    data.updatedAt = new Date().toISOString();
    if (extra) {
      var keys = Object.keys(extra);
      for (var i = 0; i < keys.length; i++) {
        data[keys[i]] = extra[keys[i]];
      }
    }
    writeFileSync(statusFile, JSON.stringify(data, null, 2));
  } catch (e) {
    // 업데이트 실패 무시
  }
}
