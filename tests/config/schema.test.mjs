/**
 * schema.test.mjs - 설정 파일 스키마 검증 단위 테스트
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  validateAgentMapping,
  validateRoutingRules,
  validateConfig,
  formatValidationResult,
  schemas,
} from '../../src/config/schema.mjs';

describe('validateAgentMapping', () => {
  test('유효한 agent-mapping', () => {
    const config = {
      mappings: [
        {
          source: ['architect', 'debugger', 'quality-reviewer'],
          target: 'Oracle',
          provider: 'opencode',
          model: 'gpt-4',
          tier: 'HIGH',
        },
      ],
      fallback: {
        provider: 'claude',
        model: 'sonnet',
      },
    };

    const result = validateAgentMapping(config);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  test('mappings 필수', () => {
    const config = {};

    const result = validateAgentMapping(config);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('mappings')));
  });

  test('mappings가 배열이어야 함', () => {
    const config = { mappings: 'not-array' };

    const result = validateAgentMapping(config);
    assert.strictEqual(result.valid, false);
  });

  test('source가 배열이어야 함', () => {
    const config = {
      mappings: [
        {
          source: 'not-array',
          target: 'Oracle',
        },
      ],
    };

    const result = validateAgentMapping(config);
    assert.strictEqual(result.valid, false);
  });

  test('target 필수', () => {
    const config = {
      mappings: [
        {
          source: ['architect'],
        },
      ],
    };

    const result = validateAgentMapping(config);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('target')));
  });

  test('유효한 provider enum', () => {
    const config = {
      mappings: [
        {
          source: ['architect'],
          target: 'Oracle',
          provider: 'invalid-provider',
        },
      ],
    };

    const result = validateAgentMapping(config);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('provider')));
  });

  test('유효한 tier enum', () => {
    const config = {
      mappings: [
        {
          source: ['architect'],
          target: 'Oracle',
          tier: 'INVALID',
        },
      ],
    };

    const result = validateAgentMapping(config);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('tier')));
  });
});

describe('validateRoutingRules', () => {
  test('유효한 routing-rules', () => {
    const config = {
      rules: [
        {
          id: 'test-rule',
          condition: 'usage.fiveHour > 90',
          action: 'prefer_opencode',
          priority: 100,
        },
      ],
    };

    const result = validateRoutingRules(config);
    assert.strictEqual(result.valid, true);
  });

  test('rules 필수', () => {
    const config = {};

    const result = validateRoutingRules(config);
    assert.strictEqual(result.valid, false);
  });

  test('id 필수', () => {
    const config = {
      rules: [
        {
          condition: 'true',
          action: 'prefer_opencode',
        },
      ],
    };

    const result = validateRoutingRules(config);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('id')));
  });

  test('condition 필수', () => {
    const config = {
      rules: [
        {
          id: 'test',
          action: 'prefer_opencode',
        },
      ],
    };

    const result = validateRoutingRules(config);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('condition')));
  });

  test('action 필수', () => {
    const config = {
      rules: [
        {
          id: 'test',
          condition: 'true',
        },
      ],
    };

    const result = validateRoutingRules(config);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('action')));
  });

  test('유효한 action enum', () => {
    const config = {
      rules: [
        {
          id: 'test',
          condition: 'true',
          action: 'invalid_action',
        },
      ],
    };

    const result = validateRoutingRules(config);
    assert.strictEqual(result.valid, false);
  });
});

describe('validateConfig', () => {
  test('유효한 config', () => {
    const config = {
      threshold: 90,
      keywords: ['opencode', 'handoff'],
      fusionDefault: true,
      routing: [
        {
          from: 'architect',
          to: 'Oracle',
          provider: 'opencode',
        },
      ],
    };

    const result = validateConfig(config);
    assert.strictEqual(result.valid, true);
  });

  test('threshold 범위 검증', () => {
    const config = { threshold: 150 };

    const result = validateConfig(config);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('threshold')));
  });

  test('빈 config도 유효', () => {
    const config = {};

    const result = validateConfig(config);
    assert.strictEqual(result.valid, true);
  });
});

describe('formatValidationResult', () => {
  test('유효한 결과 포맷', () => {
    const result = { valid: true, errors: [] };
    const formatted = formatValidationResult(result);
    assert.ok(formatted.includes('✅'));
  });

  test('오류 결과 포맷', () => {
    const result = {
      valid: false,
      errors: ['Error 1', 'Error 2'],
    };
    const formatted = formatValidationResult(result);
    assert.ok(formatted.includes('❌'));
    assert.ok(formatted.includes('Error 1'));
    assert.ok(formatted.includes('Error 2'));
  });
});

describe('schemas 내보내기', () => {
  test('스키마 객체들 존재', () => {
    assert.ok(schemas.agentMapping);
    assert.ok(schemas.routingRules);
    assert.ok(schemas.config);
  });
});

console.log('schema.test.mjs 로드 완료');
