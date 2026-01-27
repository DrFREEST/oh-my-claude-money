/**
 * cache.test.mjs - LRU 캐시 단위 테스트
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  LRUCache,
  getCachedRoute,
  cacheRoute,
  invalidateAllCache,
  getCacheStats,
  pruneCache,
} from '../../src/router/cache.mjs';

describe('LRUCache', () => {
  test('기본 get/set 동작', () => {
    const cache = new LRUCache({ max: 3, ttl: 60000 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    assert.strictEqual(cache.get('a'), 1);
    assert.strictEqual(cache.get('b'), 2);
    assert.strictEqual(cache.get('c'), 3);
    assert.strictEqual(cache.size, 3);
  });

  test('최대 크기 초과 시 가장 오래된 항목 제거', () => {
    const cache = new LRUCache({ max: 3, ttl: 60000 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // 'a' 제거됨

    assert.strictEqual(cache.get('a'), undefined);
    assert.strictEqual(cache.get('b'), 2);
    assert.strictEqual(cache.get('c'), 3);
    assert.strictEqual(cache.get('d'), 4);
  });

  test('TTL 만료 항목 반환 안함', async () => {
    const cache = new LRUCache({ max: 10, ttl: 50 }); // 50ms TTL

    cache.set('key', 'value');
    assert.strictEqual(cache.get('key'), 'value');

    // TTL 대기
    await new Promise((r) => setTimeout(r, 100));

    assert.strictEqual(cache.get('key'), undefined);
  });

  test('has() - 존재 여부 확인', () => {
    const cache = new LRUCache({ max: 10, ttl: 60000 });

    cache.set('key', 'value');
    assert.strictEqual(cache.has('key'), true);
    assert.strictEqual(cache.has('nonexistent'), false);
  });

  test('delete() - 항목 삭제', () => {
    const cache = new LRUCache({ max: 10, ttl: 60000 });

    cache.set('key', 'value');
    cache.delete('key');
    assert.strictEqual(cache.get('key'), undefined);
  });

  test('clear() - 전체 삭제', () => {
    const cache = new LRUCache({ max: 10, ttl: 60000 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    assert.strictEqual(cache.size, 0);
  });

  test('prune() - 만료 항목 정리', async () => {
    const cache = new LRUCache({ max: 10, ttl: 50 });

    cache.set('a', 1);
    cache.set('b', 2);

    await new Promise((r) => setTimeout(r, 100));

    const pruned = cache.prune();
    assert.strictEqual(pruned, 2);
    assert.strictEqual(cache.size, 0);
  });

  test('stats() - 통계 반환', () => {
    const cache = new LRUCache({ max: 100, ttl: 60000 });

    cache.set('a', 1);
    cache.set('b', 2);

    const stats = cache.stats();
    assert.strictEqual(stats.size, 2);
    assert.strictEqual(stats.max, 100);
    assert.strictEqual(stats.utilization, 2);
  });
});

describe('라우팅 캐시 API', () => {
  test('cacheRoute/getCachedRoute - 캐싱 동작', () => {
    invalidateAllCache();

    const context = { usage: { fiveHour: 50 }, mode: {} };
    const decision = { route: true, reason: 'test' };

    cacheRoute('architect', context, decision);

    const cached = getCachedRoute('architect', context);
    assert.strictEqual(cached.route, true);
    assert.strictEqual(cached.reason, 'test');
  });

  test('getCacheStats - 히트율 계산', () => {
    invalidateAllCache();

    const context = { usage: { fiveHour: 60 }, mode: {} };
    cacheRoute('explore', context, { route: false });

    // 히트
    getCachedRoute('explore', context);
    // 미스
    getCachedRoute('nonexistent', context);

    const stats = getCacheStats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
    assert.strictEqual(stats.hitRate, 50);
  });
});

console.log('cache.test.mjs 로드 완료');
