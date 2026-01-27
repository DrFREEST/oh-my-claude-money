/**
 * balancer.test.mjs - v1.0.0 프로바이더 밸런서 테스트
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  selectRoundRobin,
  selectWeighted,
  selectByLatency,
  selectByUsage,
  ProviderBalancer,
  getBalancer,
  resetBalancer
} from '../../src/router/balancer.mjs';

describe('라운드 로빈 선택 테스트', () => {
  test('selectRoundRobin() - 기본 동작', () => {
    const providers = ['claude', 'openai', 'gemini'];
    const state = { lastIndex: -1 };

    const result = selectRoundRobin(providers, state);

    assert.strictEqual(result.provider, 'claude');
    assert.strictEqual(result.newIndex, 0);
  });

  test('selectRoundRobin() - 순차 선택', () => {
    const providers = ['claude', 'openai', 'gemini'];
    let state = { lastIndex: -1 };

    // 첫 번째
    let result = selectRoundRobin(providers, state);
    assert.strictEqual(result.provider, 'claude');
    state.lastIndex = result.newIndex;

    // 두 번째
    result = selectRoundRobin(providers, state);
    assert.strictEqual(result.provider, 'openai');
    state.lastIndex = result.newIndex;

    // 세 번째
    result = selectRoundRobin(providers, state);
    assert.strictEqual(result.provider, 'gemini');
    state.lastIndex = result.newIndex;

    // 다시 처음으로
    result = selectRoundRobin(providers, state);
    assert.strictEqual(result.provider, 'claude');
  });

  test('selectRoundRobin() - 빈 배열은 null 반환', () => {
    const result = selectRoundRobin([], { lastIndex: 0 });

    assert.strictEqual(result.provider, null);
    assert.strictEqual(result.newIndex, 0);
  });

  test('selectRoundRobin() - state 없이 호출', () => {
    const providers = ['claude', 'openai'];
    const result = selectRoundRobin(providers, null);

    assert.strictEqual(result.provider, 'claude');
  });

  test('selectRoundRobin() - 단일 프로바이더', () => {
    const providers = ['claude'];
    const state = { lastIndex: 0 };

    const result = selectRoundRobin(providers, state);

    assert.strictEqual(result.provider, 'claude');
    assert.strictEqual(result.newIndex, 0);
  });
});

describe('가중치 기반 선택 테스트', () => {
  test('selectWeighted() - 기본 동작', () => {
    const providers = ['claude', 'openai', 'gemini'];
    const weights = { claude: 3, openai: 2, gemini: 1 };

    const result = selectWeighted(providers, weights);

    assert.ok(providers.includes(result));
  });

  test('selectWeighted() - 가중치 없으면 균등 분배', () => {
    const providers = ['claude', 'openai'];

    const result = selectWeighted(providers, {});

    assert.ok(providers.includes(result));
  });

  test('selectWeighted() - 빈 배열은 null 반환', () => {
    const result = selectWeighted([], { claude: 1 });

    assert.strictEqual(result, null);
  });

  test('selectWeighted() - 가중치 분포 확인 (통계적 테스트)', () => {
    const providers = ['claude', 'openai'];
    const weights = { claude: 9, openai: 1 };
    const counts = { claude: 0, openai: 0 };

    // 100번 선택하여 분포 확인
    for (let i = 0; i < 100; i++) {
      const result = selectWeighted(providers, weights);
      counts[result]++;
    }

    // claude가 더 많이 선택되어야 함 (통계적으로 70% 이상)
    assert.ok(counts.claude > counts.openai);
  });

  test('selectWeighted() - 가중치가 0인 경우', () => {
    const providers = ['claude', 'openai'];
    const weights = { claude: 0, openai: 5 };

    // 가중치 0도 1로 취급되어 선택 가능
    const result = selectWeighted(providers, weights);

    assert.ok(providers.includes(result));
  });
});

describe('지연시간 기반 선택 테스트', () => {
  test('selectByLatency() - 가장 빠른 프로바이더 선택', () => {
    const providers = ['claude', 'openai', 'gemini'];
    const latencies = { claude: 500, openai: 200, gemini: 800 };

    const result = selectByLatency(providers, latencies);

    assert.strictEqual(result, 'openai');
  });

  test('selectByLatency() - 지연시간 정보 없으면 첫 번째 반환', () => {
    const providers = ['claude', 'openai'];

    const result = selectByLatency(providers, {});

    assert.strictEqual(result, 'claude');
  });

  test('selectByLatency() - 일부 프로바이더만 지연시간 정보 있음', () => {
    const providers = ['claude', 'openai', 'gemini'];
    const latencies = { openai: 300 };

    const result = selectByLatency(providers, latencies);

    // 지연시간 정보가 있는 openai 선택
    assert.strictEqual(result, 'openai');
  });

  test('selectByLatency() - 빈 배열은 null 반환', () => {
    const result = selectByLatency([], { claude: 100 });

    assert.strictEqual(result, null);
  });

  test('selectByLatency() - 동일한 지연시간일 때', () => {
    const providers = ['claude', 'openai'];
    const latencies = { claude: 300, openai: 300 };

    const result = selectByLatency(providers, latencies);

    // 첫 번째로 만난 것 선택
    assert.strictEqual(result, 'claude');
  });
});

describe('사용량 기반 선택 테스트', () => {
  test('selectByUsage() - 가장 적게 사용된 프로바이더 선택', () => {
    const providers = ['claude', 'openai', 'gemini'];
    const usages = { claude: 5000, openai: 1000, gemini: 8000 };

    const result = selectByUsage(providers, usages);

    assert.strictEqual(result, 'openai');
  });

  test('selectByUsage() - 사용량 정보 없으면 첫 번째 반환', () => {
    const providers = ['claude', 'openai'];

    const result = selectByUsage(providers, {});

    assert.strictEqual(result, 'claude');
  });

  test('selectByUsage() - 사용량이 0인 프로바이더 우선', () => {
    const providers = ['claude', 'openai', 'gemini'];
    const usages = { claude: 5000, openai: 0, gemini: 3000 };

    const result = selectByUsage(providers, usages);

    assert.strictEqual(result, 'openai');
  });

  test('selectByUsage() - 빈 배열은 null 반환', () => {
    const result = selectByUsage([], { claude: 100 });

    assert.strictEqual(result, null);
  });

  test('selectByUsage() - 일부 프로바이더만 사용량 정보 있음', () => {
    const providers = ['claude', 'openai', 'gemini'];
    const usages = { claude: 5000 };

    const result = selectByUsage(providers, usages);

    // 사용량 정보가 없는 것들은 0으로 취급되어 우선 선택
    assert.ok(result === 'openai' || result === 'gemini');
  });
});

describe('ProviderBalancer 클래스 테스트', () => {
  let balancer;

  beforeEach(() => {
    balancer = new ProviderBalancer({
      providers: {
        claude: { weight: 3, priority: 1 },
        openai: { weight: 2, priority: 2 },
        gemini: { weight: 2, priority: 3 }
      },
      defaultStrategy: 'round-robin'
    });
  });

  test('생성자 - 기본 프로바이더 등록', () => {
    assert.ok(balancer);
    const active = balancer.getActiveProviders();
    assert.strictEqual(active.length, 3);
  });

  test('registerProvider() - 새 프로바이더 등록', () => {
    balancer.registerProvider('anthropic', { weight: 5, priority: 1 });

    const active = balancer.getActiveProviders();
    assert.ok(active.includes('anthropic'));
  });

  test('disableProvider() / enableProvider() - 활성화/비활성화', () => {
    balancer.disableProvider('openai');

    let active = balancer.getActiveProviders();
    assert.ok(!active.includes('openai'));

    balancer.enableProvider('openai');

    active = balancer.getActiveProviders();
    assert.ok(active.includes('openai'));
  });

  test('getActiveProviders() - 우선순위 순 정렬', () => {
    const active = balancer.getActiveProviders();

    assert.strictEqual(active[0], 'claude');
    assert.strictEqual(active[1], 'openai');
    assert.strictEqual(active[2], 'gemini');
  });

  test('getActiveProviders() - 제외 목록 적용', () => {
    const active = balancer.getActiveProviders(['claude']);

    assert.ok(!active.includes('claude'));
    assert.strictEqual(active.length, 2);
  });

  test('selectProvider() - round-robin 전략', () => {
    const result1 = balancer.selectProvider('round-robin');
    assert.strictEqual(result1.provider, 'claude');

    const result2 = balancer.selectProvider('round-robin');
    assert.strictEqual(result2.provider, 'openai');

    const result3 = balancer.selectProvider('round-robin');
    assert.strictEqual(result3.provider, 'gemini');

    const result4 = balancer.selectProvider('round-robin');
    assert.strictEqual(result4.provider, 'claude');
  });

  test('selectProvider() - weighted 전략', () => {
    const result = balancer.selectProvider('weighted');

    assert.ok(result.provider);
    assert.ok(['claude', 'openai', 'gemini'].includes(result.provider));
  });

  test('selectProvider() - latency 전략', () => {
    balancer.recordLatency('openai', 200);
    balancer.recordLatency('claude', 500);
    balancer.recordLatency('gemini', 800);

    const result = balancer.selectProvider('latency');

    assert.strictEqual(result.provider, 'openai');
  });

  test('selectProvider() - usage 전략', () => {
    balancer.recordUsage('openai', 5000);
    balancer.recordUsage('claude', 1000);
    balancer.recordUsage('gemini', 8000);

    const result = balancer.selectProvider('usage');

    assert.strictEqual(result.provider, 'claude');
  });

  test('selectProvider() - 활성 프로바이더가 없으면 null', () => {
    balancer.disableProvider('claude');
    balancer.disableProvider('openai');
    balancer.disableProvider('gemini');

    const result = balancer.selectProvider('round-robin');

    assert.strictEqual(result.provider, null);
    assert.ok(result.reason.includes('No active providers'));
  });

  test('selectProvider() - 하나만 활성화된 경우', () => {
    balancer.disableProvider('openai');
    balancer.disableProvider('gemini');

    const result = balancer.selectProvider('round-robin');

    assert.strictEqual(result.provider, 'claude');
    assert.ok(result.reason.includes('Only one provider'));
  });

  test('recordLatency() - 지연시간 기록', () => {
    balancer.recordLatency('claude', 300);

    const stats = balancer.getProviderStats('claude');

    assert.strictEqual(stats.latencyAvg, 300);
    assert.strictEqual(stats.lastLatency, 300);
    assert.strictEqual(stats.requestCount, 1);
  });

  test('recordLatency() - 지수 이동 평균 계산', () => {
    balancer.recordLatency('claude', 300);
    balancer.recordLatency('claude', 500);

    const stats = balancer.getProviderStats('claude');

    // EMA로 계산되어 단순 평균과 다름
    assert.ok(stats.latencyAvg > 300 && stats.latencyAvg < 500);
  });

  test('recordUsage() - 토큰 사용량 기록', () => {
    balancer.recordUsage('openai', 1000);
    balancer.recordUsage('openai', 500);

    const stats = balancer.getProviderStats('openai');

    assert.strictEqual(stats.usageTokens, 1500);
  });

  test('recordError() - 에러 기록', () => {
    balancer.recordError('gemini');
    balancer.recordError('gemini');

    const stats = balancer.getProviderStats('gemini');

    assert.strictEqual(stats.errorCount, 2);
  });

  test('setWeight() - 가중치 변경', () => {
    balancer.setWeight('openai', 5);

    const weights = balancer.getWeights();

    assert.strictEqual(weights.openai, 5);
  });

  test('setWeight() - 등록되지 않은 프로바이더는 에러', () => {
    assert.throws(() => {
      balancer.setWeight('unknown', 3);
    }, Error);
  });

  test('getStats() - 전체 통계 조회', () => {
    balancer.recordLatency('claude', 300);
    balancer.recordUsage('openai', 1000);
    balancer.recordError('gemini');

    const stats = balancer.getStats();

    assert.ok(stats.providers);
    assert.ok(stats.summary);
    assert.ok(stats.weights);
    assert.strictEqual(stats.defaultStrategy, 'round-robin');
  });

  test('getStats() - summary 계산', () => {
    balancer.recordLatency('claude', 300);
    balancer.recordUsage('claude', 1000);

    const stats = balancer.getStats();

    assert.strictEqual(stats.summary.totalProviders, 3);
    assert.strictEqual(stats.summary.activeProviders, 3);
    assert.strictEqual(stats.summary.totalRequests, 1);
    assert.strictEqual(stats.summary.totalTokens, 1000);
  });

  test('resetStats() - 통계 초기화', () => {
    balancer.recordLatency('claude', 300);
    balancer.recordUsage('claude', 1000);

    balancer.resetStats();

    const stats = balancer.getProviderStats('claude');

    assert.strictEqual(stats.latencyAvg, 0);
    assert.strictEqual(stats.usageTokens, 0);
    assert.strictEqual(stats.requestCount, 0);
  });

  test('getProviderStats() - 특정 프로바이더 통계', () => {
    balancer.recordLatency('openai', 200);
    balancer.recordUsage('openai', 500);

    const stats = balancer.getProviderStats('openai');

    assert.strictEqual(stats.latencyAvg, 200);
    assert.strictEqual(stats.usageTokens, 500);
    assert.strictEqual(stats.requestCount, 1);
    assert.strictEqual(stats.errorCount, 0);
  });

  test('getProviderStats() - 등록되지 않은 프로바이더는 null', () => {
    const stats = balancer.getProviderStats('unknown');

    assert.strictEqual(stats, null);
  });
});

describe('싱글톤 밸런서 테스트', () => {
  beforeEach(() => {
    resetBalancer();
  });

  test('getBalancer() - 싱글톤 인스턴스 반환', () => {
    const balancer1 = getBalancer();
    const balancer2 = getBalancer();

    assert.strictEqual(balancer1, balancer2);
  });

  test('getBalancer() - 초기화 옵션 적용', () => {
    const balancer = getBalancer({
      defaultStrategy: 'weighted'
    });

    const stats = balancer.getStats();

    assert.strictEqual(stats.defaultStrategy, 'weighted');
  });

  test('resetBalancer() - 싱글톤 초기화', () => {
    const balancer1 = getBalancer();
    resetBalancer();
    const balancer2 = getBalancer();

    assert.notStrictEqual(balancer1, balancer2);
  });
});

console.log('✓ balancer.test.mjs 로드 완료');
