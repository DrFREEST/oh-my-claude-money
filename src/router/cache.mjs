/**
 * cache.mjs - 라우팅 결정 LRU 캐시 v0.8.0
 *
 * 동일 에이전트 반복 라우팅 시 재계산을 방지합니다.
 *
 * @since v0.8.0
 */

// =============================================================================
// LRU 캐시 구현
// =============================================================================

class LRUCache {
  constructor(options = {}) {
    this.max = options.max || 100;
    this.ttl = options.ttl || 5 * 60 * 1000; // 5분 기본값
    this.cache = new Map();
    this.timestamps = new Map();
  }

  /**
   * 값 조회
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const timestamp = this.timestamps.get(key);
    const now = Date.now();

    // TTL 만료 확인
    if (now - timestamp > this.ttl) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return undefined;
    }

    // LRU 업데이트 (가장 최근 사용)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * 값 저장
   */
  set(key, value) {
    // 기존 항목 제거 (LRU 순서 갱신)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 최대 크기 초과 시 가장 오래된 항목 제거
    if (this.cache.size >= this.max) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.timestamps.delete(oldestKey);
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  /**
   * 항목 삭제
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  /**
   * 전체 캐시 클리어
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * 캐시 크기
   */
  get size() {
    return this.cache.size;
  }

  /**
   * 캐시 항목 존재 여부
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const timestamp = this.timestamps.get(key);
    const now = Date.now();

    if (now - timestamp > this.ttl) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 만료된 항목 정리
   */
  prune() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, timestamp] of this.timestamps) {
      if (now - timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.timestamps.delete(key);
    }

    return expiredKeys.length;
  }

  /**
   * 캐시 통계
   */
  stats() {
    return {
      size: this.cache.size,
      max: this.max,
      ttl: this.ttl,
      utilization: (this.cache.size / this.max) * 100,
    };
  }
}

// =============================================================================
// 라우팅 캐시 인스턴스
// =============================================================================

const routingCache = new LRUCache({
  max: 100,
  ttl: 5 * 60 * 1000, // 5분
});

// 캐시 통계
let cacheHits = 0;
let cacheMisses = 0;

// =============================================================================
// 컨텍스트 해시 생성
// =============================================================================

/**
 * 라우팅 컨텍스트를 해시 가능한 키로 변환
 *
 * @param {object} context - 라우팅 컨텍스트
 * @returns {string} 해시 키
 */
function hashContext(context) {
  // 라우팅에 영향을 주는 주요 필드만 추출
  const relevantFields = {
    usage5h: Math.floor((context.usage && context.usage.fiveHour) || 0 / 10) * 10, // 10% 단위로 버킷팅
    usageWk: Math.floor((context.usage && context.usage.weekly) || 0 / 10) * 10,
    ecomode: (context.mode && context.mode.ecomode) || false,
    ralph: (context.mode && context.mode.ralph) || false,
    taskComplexity: (context.task && context.task.complexity) || 'medium',
  };

  return JSON.stringify(relevantFields);
}

// =============================================================================
// 캐시된 라우팅 조회
// =============================================================================

/**
 * 캐시에서 라우팅 결정 조회
 *
 * @param {string} agentType - 에이전트 타입
 * @param {object} context - 라우팅 컨텍스트
 * @returns {object|undefined} 캐시된 라우팅 결정 또는 undefined
 */
export function getCachedRoute(agentType, context) {
  const contextHash = hashContext(context);
  const key = `${agentType}:${contextHash}`;

  const cached = routingCache.get(key);

  if (cached) {
    cacheHits++;
    return cached;
  }

  cacheMisses++;
  return undefined;
}

// =============================================================================
// 라우팅 결정 캐싱
// =============================================================================

/**
 * 라우팅 결정 캐시에 저장
 *
 * @param {string} agentType - 에이전트 타입
 * @param {object} context - 라우팅 컨텍스트
 * @param {object} decision - 라우팅 결정
 */
export function cacheRoute(agentType, context, decision) {
  const contextHash = hashContext(context);
  const key = `${agentType}:${contextHash}`;

  routingCache.set(key, {
    ...decision,
    cachedAt: Date.now(),
  });
}

// =============================================================================
// 캐시 무효화
// =============================================================================

/**
 * 특정 에이전트의 캐시 무효화
 *
 * @param {string} agentType - 에이전트 타입
 */
export function invalidateAgentCache(agentType) {
  // 해당 에이전트 관련 모든 캐시 항목 삭제
  const keysToDelete = [];

  for (const key of routingCache.cache.keys()) {
    if (key.startsWith(`${agentType}:`)) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    routingCache.delete(key);
  }
}

/**
 * 전체 라우팅 캐시 무효화
 */
export function invalidateAllCache() {
  routingCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

// =============================================================================
// 캐시 통계
// =============================================================================

/**
 * 캐시 통계 조회
 */
export function getCacheStats() {
  const total = cacheHits + cacheMisses;

  return {
    ...routingCache.stats(),
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? (cacheHits / total) * 100 : 0,
  };
}

// =============================================================================
// 캐시 정리 (만료 항목 제거)
// =============================================================================

export function pruneCache() {
  return routingCache.prune();
}

// =============================================================================
// 내보내기
// =============================================================================

export { LRUCache };
