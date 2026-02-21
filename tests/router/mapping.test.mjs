/**
 * mapping.test.mjs - 동적 에이전트 매핑 로더 단위 테스트
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  getDynamicMapping,
  getAgentMapping,
  getFallbackConfig,
  getMappingStats,
  invalidateMappingCache,
  validateMappingFile,
} from '../../src/router/mapping.mjs';

// 테스트용 설정 디렉토리
const TEST_CONFIG_DIR = join(homedir(), '.omcm-test');
const TEST_MAPPING_FILE = join(TEST_CONFIG_DIR, 'agent-mapping.json');

describe('동적 매핑 - 파일 없음', () => {
  test('매핑 파일 없으면 빈 매핑 반환', () => {
    invalidateMappingCache();

    const mapping = getDynamicMapping();
    assert.ok(mapping);
    assert.ok(Array.isArray(mapping.mappings));
  });

  test('getAgentMapping - 파일 없으면 null 반환', () => {
    invalidateMappingCache();

    const result = getAgentMapping('architect');
    assert.strictEqual(result, null);
  });

  test('getFallbackConfig - 기본 폴백 반환', () => {
    invalidateMappingCache();

    const fallback = getFallbackConfig();
    assert.strictEqual(fallback.provider, 'claude');
    assert.strictEqual(fallback.model, 'sonnet');
  });
});

describe('getMappingStats', () => {
  test('통계 구조 확인', () => {
    invalidateMappingCache();

    const stats = getMappingStats();
    assert.ok('totalRules' in stats);
    assert.ok('totalAgents' in stats);
    assert.ok('byProvider' in stats);
    assert.ok('byTier' in stats);
    assert.ok('source' in stats);
  });
});

describe('validateMappingFile', () => {
  const testFile = '/tmp/test-mapping.json';

  test('파일 없으면 오류', () => {
    const result = validateMappingFile('/nonexistent/file.json');
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('not found'));
  });

  test('유효한 매핑 파일', () => {
    const validMapping = {
      mappings: [
        {
          source: ['architect'],
          target: 'Oracle',
          provider: 'mcp',
        },
      ],
    };

    writeFileSync(testFile, JSON.stringify(validMapping));

    const result = validateMappingFile(testFile);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.mappings, 1);

    rmSync(testFile);
  });

  test('mappings 배열 누락', () => {
    writeFileSync(testFile, JSON.stringify({ foo: 'bar' }));

    const result = validateMappingFile(testFile);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('mappings')));

    rmSync(testFile);
  });

  test('source 배열 누락', () => {
    const invalidMapping = {
      mappings: [{ target: 'Oracle' }],
    };

    writeFileSync(testFile, JSON.stringify(invalidMapping));

    const result = validateMappingFile(testFile);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('source')));

    rmSync(testFile);
  });

  test('target 누락', () => {
    const invalidMapping = {
      mappings: [{ source: ['architect'] }],
    };

    writeFileSync(testFile, JSON.stringify(invalidMapping));

    const result = validateMappingFile(testFile);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('target')));

    rmSync(testFile);
  });

  test('JSON 파싱 오류', () => {
    writeFileSync(testFile, '{ invalid json }');

    const result = validateMappingFile(testFile);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('JSON parse error'));

    rmSync(testFile);
  });
});

describe('캐시 무효화', () => {
  test('invalidateMappingCache - 캐시 클리어', () => {
    // 캐시에 뭔가 있는 상태에서
    getDynamicMapping();

    // 무효화
    invalidateMappingCache();

    // 다시 호출하면 새로 로드
    const mapping = getDynamicMapping();
    assert.ok(mapping);
  });
});

console.log('mapping.test.mjs 로드 완료');
