/**
 * rules.test.mjs - 조건부 라우팅 규칙 엔진 단위 테스트
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  getRules,
  evaluateRouting,
  interpretAction,
  validateRule,
  listRules,
  invalidateRulesCache,
} from '../../src/router/rules.mjs';

describe('기본 규칙', () => {
  test('기본 규칙 5개 로드', () => {
    invalidateRulesCache();
    const rules = getRules();
    assert.ok(rules.length >= 5, '최소 5개 기본 규칙 필요');

    const ruleIds = rules.map((r) => r.id);
    assert.ok(ruleIds.includes('high-usage-opencode'));
    assert.ok(ruleIds.includes('weekly-limit-opencode'));
    assert.ok(ruleIds.includes('complex-task-claude'));
    assert.ok(ruleIds.includes('security-claude'));
    assert.ok(ruleIds.includes('ecomode-opencode'));
  });

  test('규칙은 우선순위 순으로 정렬', () => {
    const rules = getRules();

    for (let i = 1; i < rules.length; i++) {
      const prev = rules[i - 1].priority || 0;
      const curr = rules[i].priority || 0;
      assert.ok(prev >= curr, '우선순위 내림차순 정렬 필요');
    }
  });
});

describe('규칙 평가', () => {
  test('usage.fiveHour > 90 - OpenCode 라우팅', () => {
    const context = {
      usage: { fiveHour: 95, weekly: 50 },
      mode: {},
      task: {},
      agent: { type: 'executor' },
    };

    const result = evaluateRouting(context);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.action, 'prefer_opencode');
  });

  test('usage.weekly > 85 - OpenCode 라우팅', () => {
    const context = {
      usage: { fiveHour: 50, weekly: 90 },
      mode: {},
      task: {},
      agent: { type: 'executor' },
    };

    const result = evaluateRouting(context);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.action, 'prefer_opencode');
  });

  test('mode.ecomode == true - OpenCode 라우팅', () => {
    const context = {
      usage: { fiveHour: 30, weekly: 30 },
      mode: { ecomode: true },
      task: {},
      agent: { type: 'executor' },
    };

    const result = evaluateRouting(context);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.action, 'prefer_opencode');
  });

  test('task.complexity == "high" - Claude 선호', () => {
    const context = {
      usage: { fiveHour: 30, weekly: 30 },
      mode: {},
      task: { complexity: 'high' },
      agent: { type: 'executor' },
    };

    const result = evaluateRouting(context);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.action, 'prefer_claude');
  });

  test('agent.type == "security-reviewer" - Claude 선호', () => {
    const context = {
      usage: { fiveHour: 30, weekly: 30 },
      mode: {},
      task: {},
      agent: { type: 'security-reviewer' },
    };

    const result = evaluateRouting(context);
    assert.strictEqual(result.matched, true);
    assert.strictEqual(result.action, 'prefer_claude');
  });

  test('조건 미충족 - 기본 동작', () => {
    const context = {
      usage: { fiveHour: 30, weekly: 30 },
      mode: {},
      task: { complexity: 'low' },
      agent: { type: 'executor' },
    };

    const result = evaluateRouting(context);
    assert.strictEqual(result.matched, false);
    assert.strictEqual(result.action, 'default');
  });
});

describe('액션 해석', () => {
  test('prefer_opencode', () => {
    const action = interpretAction('prefer_opencode');
    assert.strictEqual(action.preferredProvider, 'opencode');
    assert.strictEqual(action.forceProvider, false);
  });

  test('force_opencode', () => {
    const action = interpretAction('force_opencode');
    assert.strictEqual(action.preferredProvider, 'opencode');
    assert.strictEqual(action.forceProvider, true);
  });

  test('prefer_claude', () => {
    const action = interpretAction('prefer_claude');
    assert.strictEqual(action.preferredProvider, 'claude');
    assert.strictEqual(action.forceProvider, false);
  });

  test('force_claude', () => {
    const action = interpretAction('force_claude');
    assert.strictEqual(action.preferredProvider, 'claude');
    assert.strictEqual(action.forceProvider, true);
  });

  test('block', () => {
    const action = interpretAction('block');
    assert.strictEqual(action.blocked, true);
  });
});

describe('규칙 검증', () => {
  test('유효한 규칙', () => {
    const rule = {
      id: 'test-rule',
      condition: 'usage.fiveHour > 80',
      action: 'prefer_opencode',
      priority: 50,
    };

    const result = validateRule(rule);
    assert.strictEqual(result.valid, true);
  });

  test('필수 필드 누락', () => {
    const rule = { id: 'test' };
    const result = validateRule(rule);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  test('잘못된 액션', () => {
    const rule = {
      id: 'test',
      condition: 'true',
      action: 'invalid_action',
    };

    const result = validateRule(rule);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('Invalid action')));
  });
});

describe('listRules', () => {
  test('규칙 목록 반환', () => {
    const list = listRules();
    assert.ok(Array.isArray(list));
    assert.ok(list.length > 0);

    const first = list[0];
    assert.ok('id' in first);
    assert.ok('condition' in first);
    assert.ok('action' in first);
    assert.ok('priority' in first);
  });
});

console.log('rules.test.mjs 로드 완료');
