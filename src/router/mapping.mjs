/**
 * mapping.mjs - 동적 에이전트 매핑 로더 v0.8.0
 *
 * JSON 설정 파일 기반으로 에이전트 매핑을 동적 로드합니다.
 * 하드코딩된 agent-fusion-map.mjs를 보완하는 확장 레이어입니다.
 *
 * @since v0.8.0
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// =============================================================================
// 설정 파일 경로
// =============================================================================

const CONFIG_PATHS = [
  join(homedir(), '.claude/plugins/omcm/agent-mapping.json'),
  join(homedir(), '.omcm/agent-mapping.json'),
  join(process.cwd(), '.omcm/agent-mapping.json'),
];

// =============================================================================
// 캐시
// =============================================================================

let cachedMapping = null;
let cacheTimestamp = 0;
let cacheFilePath = null;

const CACHE_TTL = 5 * 60 * 1000; // 5분

// =============================================================================
// 기본 매핑 (agent-fusion-map.mjs 폴백용)
// =============================================================================

const DEFAULT_FALLBACK = {
  provider: 'claude',
  model: 'sonnet',
};

// =============================================================================
// 매핑 파일 찾기
// =============================================================================

function findMappingFile() {
  for (const path of CONFIG_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

// =============================================================================
// 매핑 파일 로드
// =============================================================================

function loadMappingFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    // 기본 구조 검증
    if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
      console.error('[OMCM] Invalid mapping file: missing mappings array');
      return null;
    }

    return parsed;
  } catch (e) {
    console.error(`[OMCM] Failed to load mapping file: ${e.message}`);
    return null;
  }
}

// =============================================================================
// 캐시된 매핑 가져오기
// =============================================================================

export function getDynamicMapping() {
  const now = Date.now();

  // 캐시 유효성 확인
  if (cachedMapping && now - cacheTimestamp < CACHE_TTL) {
    // 파일 변경 확인 (mtime 기반)
    if (cacheFilePath && existsSync(cacheFilePath)) {
      const stat = statSync(cacheFilePath);
      if (stat.mtimeMs <= cacheTimestamp) {
        return cachedMapping;
      }
    } else if (!cacheFilePath) {
      return cachedMapping;
    }
  }

  // 매핑 파일 로드
  const filePath = findMappingFile();

  if (!filePath) {
    // 파일 없음 - 빈 매핑 반환 (agent-fusion-map.mjs 사용)
    cachedMapping = { mappings: [], fallback: DEFAULT_FALLBACK };
    cacheTimestamp = now;
    cacheFilePath = null;
    return cachedMapping;
  }

  const mapping = loadMappingFile(filePath);

  if (!mapping) {
    cachedMapping = { mappings: [], fallback: DEFAULT_FALLBACK };
    cacheTimestamp = now;
    cacheFilePath = null;
    return cachedMapping;
  }

  cachedMapping = mapping;
  cacheTimestamp = now;
  cacheFilePath = filePath;

  return cachedMapping;
}

// =============================================================================
// 에이전트 매핑 조회
// =============================================================================

/**
 * 소스 에이전트에 대한 타겟 매핑 조회
 *
 * @param {string} sourceAgent - OMC 에이전트명 (예: 'architect', 'designer')
 * @returns {object|null} 매핑 정보 또는 null (기본 매핑 사용)
 */
export function getAgentMapping(sourceAgent) {
  const mapping = getDynamicMapping();

  if (!mapping || !mapping.mappings) {
    return null;
  }

  for (const rule of mapping.mappings) {
    if (!rule.source || !Array.isArray(rule.source)) {
      continue;
    }

    if (rule.source.includes(sourceAgent)) {
      return {
        target: rule.target,
        provider: rule.provider || 'opencode',
        model: rule.model || 'gpt-4',
        tier: rule.tier || 'MEDIUM',
        reason: rule.reason || 'Dynamic mapping',
      };
    }
  }

  return null; // 동적 매핑 없음 - agent-fusion-map.mjs 폴백
}

// =============================================================================
// 폴백 설정 조회
// =============================================================================

export function getFallbackConfig() {
  const mapping = getDynamicMapping();
  return mapping.fallback || DEFAULT_FALLBACK;
}

// =============================================================================
// 전체 매핑 통계
// =============================================================================

export function getMappingStats() {
  const mapping = getDynamicMapping();

  if (!mapping || !mapping.mappings) {
    return {
      totalRules: 0,
      totalAgents: 0,
      byProvider: {},
      byTier: {},
      source: 'none',
    };
  }

  const byProvider = {};
  const byTier = {};
  let totalAgents = 0;

  for (const rule of mapping.mappings) {
    if (!rule.source) continue;

    const count = rule.source.length;
    totalAgents += count;

    const provider = rule.provider || 'opencode';
    byProvider[provider] = (byProvider[provider] || 0) + count;

    const tier = rule.tier || 'MEDIUM';
    byTier[tier] = (byTier[tier] || 0) + count;
  }

  return {
    totalRules: mapping.mappings.length,
    totalAgents,
    byProvider,
    byTier,
    source: cacheFilePath || 'default',
  };
}

// =============================================================================
// 캐시 무효화
// =============================================================================

export function invalidateMappingCache() {
  cachedMapping = null;
  cacheTimestamp = 0;
  cacheFilePath = null;
}

// =============================================================================
// 매핑 파일 검증
// =============================================================================

export function validateMappingFile(filePath) {
  if (!existsSync(filePath)) {
    return { valid: false, error: 'File not found' };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    const errors = [];

    // mappings 배열 확인
    if (!parsed.mappings) {
      errors.push('Missing "mappings" array');
    } else if (!Array.isArray(parsed.mappings)) {
      errors.push('"mappings" must be an array');
    } else {
      // 각 매핑 규칙 검증
      parsed.mappings.forEach((rule, index) => {
        if (!rule.source || !Array.isArray(rule.source)) {
          errors.push(`Rule ${index}: missing or invalid "source" array`);
        }
        if (!rule.target) {
          errors.push(`Rule ${index}: missing "target"`);
        }
      });
    }

    // fallback 확인 (선택적)
    if (parsed.fallback && typeof parsed.fallback !== 'object') {
      errors.push('"fallback" must be an object');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, mappings: parsed.mappings.length };
  } catch (e) {
    return { valid: false, error: `JSON parse error: ${e.message}` };
  }
}
