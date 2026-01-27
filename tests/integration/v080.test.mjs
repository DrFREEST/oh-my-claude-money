/**
 * v080.test.mjs - v0.8.0 통합 테스트
 *
 * shouldRouteToOpenCodeV2 함수의 통합 동작 테스트
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// 테스트 대상 모듈
import {
  shouldRouteToOpenCode,
  shouldRouteToOpenCodeV2,
  mapAgentToOpenCode,
  getModelInfoForAgent,
  FUSION_STATE_FILE,
  FALLBACK_STATE_FILE,
  PROVIDER_LIMITS_FILE,
  CONFIG_FILE,
} from '../../src/hooks/fusion-router-logic.mjs';
import { invalidateAllCache } from '../../src/router/cache.mjs';
import { invalidateRulesCache } from '../../src/router/rules.mjs';
import { invalidateMappingCache } from '../../src/router/mapping.mjs';

describe('mapAgentToOpenCode', () => {
  test('architect → Oracle', () => {
    assert.strictEqual(mapAgentToOpenCode('architect'), 'Oracle');
  });

  test('explore → Flash', () => {
    assert.strictEqual(mapAgentToOpenCode('explore'), 'Flash');
  });

  test('designer → Flash', () => {
    assert.strictEqual(mapAgentToOpenCode('designer'), 'Flash');
  });

  test('executor → Codex', () => {
    assert.strictEqual(mapAgentToOpenCode('executor'), 'Codex');
  });

  test('unknown → Codex (기본값)', () => {
    assert.strictEqual(mapAgentToOpenCode('unknown-agent'), 'Codex');
  });
});

describe('getModelInfoForAgent', () => {
  test('Oracle → GPT 5.2', () => {
    const info = getModelInfoForAgent('Oracle');
    assert.strictEqual(info.id, 'gpt-5.2');
  });

  test('explore → Gemini Flash', () => {
    const info = getModelInfoForAgent('explore');
    assert.strictEqual(info.id, 'gemini-flash');
  });

  test('Codex → GPT 5.2 Codex', () => {
    const info = getModelInfoForAgent('Codex');
    assert.strictEqual(info.id, 'gpt-5.2-codex');
  });

  test('frontend-ui-ux-engineer → Gemini Pro', () => {
    const info = getModelInfoForAgent('frontend-ui-ux-engineer');
    assert.strictEqual(info.id, 'gemini-pro');
  });
});

describe('shouldRouteToOpenCode (v0.7.0 호환)', () => {
  beforeEach(() => {
    invalidateAllCache();
    invalidateRulesCache();
    invalidateMappingCache();
  });

  test('fusion 비활성화 시 라우팅 안함', () => {
    const toolInput = { subagent_type: 'oh-my-claudecode:architect' };
    const options = {
      fusion: { enabled: false },
      fallback: null,
      limits: null,
      config: { fusionDefault: false },
    };

    const result = shouldRouteToOpenCode(toolInput, options);
    assert.strictEqual(result.route, false);
    assert.strictEqual(result.reason, 'fusion-disabled');
  });

  test('fallback 활성화 시 라우팅', () => {
    const toolInput = { subagent_type: 'oh-my-claudecode:architect' };
    const options = {
      fusion: { enabled: true },
      fallback: {
        fallbackActive: true,
        currentModel: { id: 'gpt-5.2', opencodeAgent: 'Oracle' },
      },
      limits: null,
      config: null,
    };

    const result = shouldRouteToOpenCode(toolInput, options);
    assert.strictEqual(result.route, true);
    assert.strictEqual(result.reason, 'fallback-active');
  });

  test('Claude 90% 이상 시 라우팅', () => {
    const toolInput = { subagent_type: 'oh-my-claudecode:explorer' };
    const options = {
      fusion: { enabled: true },
      fallback: null,
      limits: {
        claude: {
          fiveHour: { percent: 95 },
          weekly: { percent: 50 },
        },
      },
      config: null,
    };

    const result = shouldRouteToOpenCode(toolInput, options);
    assert.strictEqual(result.route, true);
    assert.ok(result.reason.includes('claude-limit'));
  });

  test('fusionDefault=true 시 planner 제외 라우팅', () => {
    const toolInput = { subagent_type: 'oh-my-claudecode:architect' };
    const options = {
      fusion: null,
      fallback: null,
      limits: null,
      config: { fusionDefault: true },
    };

    const result = shouldRouteToOpenCode(toolInput, options);
    assert.strictEqual(result.route, true);
    assert.ok(result.reason.includes('fusion-default'));
  });

  test('fusionDefault=true 시 planner는 라우팅 안함', () => {
    const toolInput = { subagent_type: 'oh-my-claudecode:planner' };
    const options = {
      fusion: null,
      fallback: null,
      limits: null,
      config: { fusionDefault: true },
    };

    const result = shouldRouteToOpenCode(toolInput, options);
    assert.strictEqual(result.route, false);
  });
});

describe('shouldRouteToOpenCodeV2 (v0.8.0 신규)', () => {
  beforeEach(() => {
    invalidateAllCache();
    invalidateRulesCache();
    invalidateMappingCache();
  });

  test('에이전트 타입 없으면 라우팅 안함', () => {
    const toolInput = {};
    const context = {};

    const result = shouldRouteToOpenCodeV2(toolInput, context);
    assert.strictEqual(result.route, false);
    assert.strictEqual(result.reason, 'no-agent-type');
  });

  test('캐시된 결과 반환', () => {
    const toolInput = { subagent_type: 'oh-my-claudecode:architect' };
    const context = { usage: { fiveHour: 50 }, mode: {} };
    const options = { config: { fusionDefault: true } };

    // 첫 번째 호출 (캐시 미스)
    const result1 = shouldRouteToOpenCodeV2(toolInput, context, options);
    assert.strictEqual(result1.fromCache, undefined);

    // 두 번째 호출 (캐시 히트)
    const result2 = shouldRouteToOpenCodeV2(toolInput, context, options);
    assert.strictEqual(result2.fromCache, true);
  });

  test('규칙 엔진 - ecomode 활성화 시 OpenCode 선호', () => {
    const toolInput = { subagent_type: 'oh-my-claudecode:architect' };
    const context = {
      usage: { fiveHour: 50, weekly: 50 },
      mode: { ecomode: true },
      task: {},
    };
    const options = { config: { fusionDefault: false } };

    invalidateAllCache(); // 캐시 무효화

    const result = shouldRouteToOpenCodeV2(toolInput, context, options);
    // 규칙 매칭되면 라우팅
    assert.strictEqual(result.matched || result.route, true);
  });

  test('규칙 엔진 - 고사용량 시 OpenCode 선호', () => {
    const toolInput = { subagent_type: 'oh-my-claudecode:executor' };
    const context = {
      usage: { fiveHour: 95, weekly: 50 },
      mode: {},
      task: {},
    };
    const options = { config: { fusionDefault: false } };

    invalidateAllCache();

    const result = shouldRouteToOpenCodeV2(toolInput, context, options);
    assert.strictEqual(result.matched || result.route, true);
  });
});

describe('전체 라우팅 흐름', () => {
  test('캐시 → 규칙 → 기본 로직 순서', () => {
    invalidateAllCache();
    invalidateRulesCache();

    const toolInput = { subagent_type: 'oh-my-claudecode:designer' };

    // 첫 번째: 캐시 미스, 규칙 또는 기본 로직 사용
    const context1 = { usage: { fiveHour: 30 }, mode: {}, task: {} };
    const result1 = shouldRouteToOpenCodeV2(toolInput, context1, { config: { fusionDefault: true } });

    // 같은 컨텍스트로 두 번째: 캐시 히트
    const result2 = shouldRouteToOpenCodeV2(toolInput, context1, { config: { fusionDefault: true } });
    assert.strictEqual(result2.fromCache, true);

    // 다른 컨텍스트: 캐시 미스
    const context2 = { usage: { fiveHour: 95 }, mode: {}, task: {} };
    const result3 = shouldRouteToOpenCodeV2(toolInput, context2, { config: { fusionDefault: true } });
    assert.strictEqual(result3.fromCache, undefined);
  });
});

console.log('v080.test.mjs 로드 완료');
