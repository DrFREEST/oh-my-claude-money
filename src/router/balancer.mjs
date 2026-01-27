/**
 * balancer.mjs - 다중 프로바이더 밸런싱 v0.8.0
 *
 * 라운드 로빈, 가중치, 지연시간, 사용량 기반 전략으로
 * 프로바이더를 동적으로 선택합니다.
 *
 * @since v0.8.0
 */

// =============================================================================
// 기본 프로바이더 설정
// =============================================================================

const DEFAULT_PROVIDERS = {
  claude: { weight: 3, priority: 1 },
  openai: { weight: 2, priority: 2 },
  gemini: { weight: 2, priority: 2 }
};

// =============================================================================
// 전략 타입
// =============================================================================

/**
 * @typedef {'round-robin' | 'weighted' | 'latency' | 'usage'} BalancingStrategy
 */

/**
 * @typedef {Object} ProviderConfig
 * @property {number} weight - 가중치 (1-10)
 * @property {number} priority - 우선순위 (낮을수록 높음)
 * @property {boolean} [enabled=true] - 활성화 여부
 */

/**
 * @typedef {Object} ProviderStats
 * @property {number} latencyAvg - 평균 지연시간 (ms)
 * @property {number} usageTokens - 누적 토큰 사용량
 * @property {number} requestCount - 요청 횟수
 * @property {number} errorCount - 에러 횟수
 * @property {number} lastLatency - 마지막 지연시간
 * @property {number} lastUpdated - 마지막 업데이트 타임스탬프
 */

/**
 * @typedef {Object} SelectionContext
 * @property {string} [taskType] - 작업 유형 (예: 'analysis', 'execution')
 * @property {string} [agentType] - 에이전트 타입
 * @property {number} [tokenEstimate] - 예상 토큰 수
 * @property {string[]} [excludeProviders] - 제외할 프로바이더 목록
 */

// =============================================================================
// 지수 이동 평균 상수
// =============================================================================

const LATENCY_EMA_ALPHA = 0.3;  // 지수 이동 평균 가중치 (최근 데이터에 더 많은 가중치)
const MAX_LATENCY_SAMPLES = 100; // 최대 샘플 수

// =============================================================================
// 싱글톤 인스턴스
// =============================================================================

let balancerInstance = null;

// =============================================================================
// 라운드 로빈 선택
// =============================================================================

/**
 * 라운드 로빈 방식으로 프로바이더 선택
 *
 * @param {string[]} providers - 사용 가능한 프로바이더 목록
 * @param {Object} state - 라운드 로빈 상태 { lastIndex: number }
 * @returns {{ provider: string, newIndex: number }} 선택된 프로바이더와 새 인덱스
 */
export function selectRoundRobin(providers, state) {
  if (!providers || providers.length === 0) {
    return { provider: null, newIndex: 0 };
  }

  const currentIndex = state && typeof state.lastIndex === 'number' ? state.lastIndex : -1;
  const nextIndex = (currentIndex + 1) % providers.length;

  return {
    provider: providers[nextIndex],
    newIndex: nextIndex
  };
}

// =============================================================================
// 가중치 기반 선택
// =============================================================================

/**
 * 가중치 기반으로 프로바이더 선택 (확률적)
 *
 * @param {string[]} providers - 사용 가능한 프로바이더 목록
 * @param {Object<string, number>} weights - 프로바이더별 가중치 맵
 * @returns {string|null} 선택된 프로바이더
 */
export function selectWeighted(providers, weights) {
  if (!providers || providers.length === 0) {
    return null;
  }

  if (!weights || Object.keys(weights).length === 0) {
    // 가중치가 없으면 균등 분배
    const randomIndex = Math.floor(Math.random() * providers.length);
    return providers[randomIndex];
  }

  // 총 가중치 계산
  let totalWeight = 0;
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const weight = weights[provider];
    totalWeight += typeof weight === 'number' && weight > 0 ? weight : 1;
  }

  // 랜덤 값으로 선택
  let random = Math.random() * totalWeight;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const weight = weights[provider];
    const providerWeight = typeof weight === 'number' && weight > 0 ? weight : 1;

    random -= providerWeight;
    if (random <= 0) {
      return provider;
    }
  }

  // 폴백: 마지막 프로바이더 반환
  return providers[providers.length - 1];
}

// =============================================================================
// 지연시간 기반 선택
// =============================================================================

/**
 * 지연시간 기반으로 프로바이더 선택 (가장 빠른 프로바이더)
 *
 * @param {string[]} providers - 사용 가능한 프로바이더 목록
 * @param {Object<string, number>} latencies - 프로바이더별 평균 지연시간 (ms)
 * @returns {string|null} 선택된 프로바이더
 */
export function selectByLatency(providers, latencies) {
  if (!providers || providers.length === 0) {
    return null;
  }

  if (!latencies || Object.keys(latencies).length === 0) {
    // 지연시간 정보 없으면 첫 번째 반환
    return providers[0];
  }

  let bestProvider = null;
  let lowestLatency = Infinity;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const latency = latencies[provider];

    // 지연시간 정보가 없는 프로바이더는 기본값 사용
    const effectiveLatency = typeof latency === 'number' && latency > 0 ? latency : Infinity;

    if (effectiveLatency < lowestLatency) {
      lowestLatency = effectiveLatency;
      bestProvider = provider;
    }
  }

  return bestProvider || providers[0];
}

// =============================================================================
// 사용량 기반 선택
// =============================================================================

/**
 * 사용량 기반으로 프로바이더 선택 (가장 적게 사용된 프로바이더)
 *
 * @param {string[]} providers - 사용 가능한 프로바이더 목록
 * @param {Object<string, number>} usages - 프로바이더별 사용량 (토큰 수)
 * @returns {string|null} 선택된 프로바이더
 */
export function selectByUsage(providers, usages) {
  if (!providers || providers.length === 0) {
    return null;
  }

  if (!usages || Object.keys(usages).length === 0) {
    // 사용량 정보 없으면 첫 번째 반환
    return providers[0];
  }

  let bestProvider = null;
  let lowestUsage = Infinity;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const usage = usages[provider];

    // 사용량 정보가 없는 프로바이더는 0으로 취급 (우선 선택)
    const effectiveUsage = typeof usage === 'number' && usage >= 0 ? usage : 0;

    if (effectiveUsage < lowestUsage) {
      lowestUsage = effectiveUsage;
      bestProvider = provider;
    }
  }

  return bestProvider || providers[0];
}

// =============================================================================
// ProviderBalancer 클래스
// =============================================================================

/**
 * 프로바이더 밸런서
 *
 * @class
 */
export class ProviderBalancer {
  /**
   * @param {Object} options - 옵션
   * @param {Object<string, ProviderConfig>} [options.providers] - 초기 프로바이더 설정
   * @param {BalancingStrategy} [options.defaultStrategy='round-robin'] - 기본 전략
   */
  constructor(options) {
    const opts = options || {};

    /** @type {Object<string, ProviderConfig>} */
    this._providers = {};

    /** @type {Object<string, ProviderStats>} */
    this._stats = {};

    /** @type {Object<string, number>} */
    this._weights = {};

    /** @type {number} */
    this._roundRobinIndex = -1;

    /** @type {BalancingStrategy} */
    this._defaultStrategy = opts.defaultStrategy || 'round-robin';

    // 초기 프로바이더 등록
    const initialProviders = opts.providers || DEFAULT_PROVIDERS;
    const providerNames = Object.keys(initialProviders);

    for (let i = 0; i < providerNames.length; i++) {
      const name = providerNames[i];
      this.registerProvider(name, initialProviders[name]);
    }
  }

  // ===========================================================================
  // 프로바이더 관리
  // ===========================================================================

  /**
   * 프로바이더 등록
   *
   * @param {string} name - 프로바이더 이름
   * @param {ProviderConfig} config - 프로바이더 설정
   */
  registerProvider(name, config) {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }

    const cfg = config || {};

    this._providers[name] = {
      weight: typeof cfg.weight === 'number' ? cfg.weight : 1,
      priority: typeof cfg.priority === 'number' ? cfg.priority : 10,
      enabled: cfg.enabled !== false
    };

    this._weights[name] = this._providers[name].weight;

    // 통계 초기화 (존재하지 않는 경우만)
    if (!this._stats[name]) {
      this._stats[name] = {
        latencyAvg: 0,
        usageTokens: 0,
        requestCount: 0,
        errorCount: 0,
        lastLatency: 0,
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * 프로바이더 비활성화
   *
   * @param {string} name - 프로바이더 이름
   */
  disableProvider(name) {
    if (this._providers[name]) {
      this._providers[name].enabled = false;
    }
  }

  /**
   * 프로바이더 활성화
   *
   * @param {string} name - 프로바이더 이름
   */
  enableProvider(name) {
    if (this._providers[name]) {
      this._providers[name].enabled = true;
    }
  }

  /**
   * 활성화된 프로바이더 목록 반환
   *
   * @param {string[]} [excludeList] - 제외할 프로바이더 목록
   * @returns {string[]} 활성 프로바이더 목록
   */
  getActiveProviders(excludeList) {
    const exclude = excludeList || [];
    const active = [];
    const names = Object.keys(this._providers);

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const provider = this._providers[name];

      if (provider.enabled && exclude.indexOf(name) === -1) {
        active.push(name);
      }
    }

    // 우선순위로 정렬
    active.sort(function(a, b) {
      var providerA = this._providers[a];
      var providerB = this._providers[b];
      return (providerA.priority || 10) - (providerB.priority || 10);
    }.bind(this));

    return active;
  }

  // ===========================================================================
  // 프로바이더 선택
  // ===========================================================================

  /**
   * 전략에 따라 프로바이더 선택
   *
   * @param {BalancingStrategy} [strategy] - 선택 전략
   * @param {SelectionContext} [context] - 선택 컨텍스트
   * @returns {{ provider: string|null, reason: string }} 선택 결과
   */
  selectProvider(strategy, context) {
    const strat = strategy || this._defaultStrategy;
    const ctx = context || {};
    const excludeProviders = ctx.excludeProviders || [];

    const activeProviders = this.getActiveProviders(excludeProviders);

    if (activeProviders.length === 0) {
      return {
        provider: null,
        reason: 'No active providers available'
      };
    }

    if (activeProviders.length === 1) {
      return {
        provider: activeProviders[0],
        reason: 'Only one provider available'
      };
    }

    var selected = null;
    var reason = '';

    switch (strat) {
      case 'round-robin':
        var result = selectRoundRobin(activeProviders, { lastIndex: this._roundRobinIndex });
        selected = result.provider;
        this._roundRobinIndex = result.newIndex;
        reason = 'Round-robin selection (index: ' + result.newIndex + ')';
        break;

      case 'weighted':
        selected = selectWeighted(activeProviders, this._weights);
        reason = 'Weighted selection (weight: ' + (this._weights[selected] || 1) + ')';
        break;

      case 'latency':
        var latencies = this._getLatencyMap();
        selected = selectByLatency(activeProviders, latencies);
        reason = 'Latency-based selection (latency: ' + (latencies[selected] || 'unknown') + 'ms)';
        break;

      case 'usage':
        var usages = this._getUsageMap();
        selected = selectByUsage(activeProviders, usages);
        reason = 'Usage-based selection (tokens: ' + (usages[selected] || 0) + ')';
        break;

      default:
        // 기본: 라운드 로빈
        var defaultResult = selectRoundRobin(activeProviders, { lastIndex: this._roundRobinIndex });
        selected = defaultResult.provider;
        this._roundRobinIndex = defaultResult.newIndex;
        reason = 'Default round-robin selection';
    }

    return {
      provider: selected,
      reason: reason
    };
  }

  /**
   * 지연시간 맵 생성
   *
   * @private
   * @returns {Object<string, number>}
   */
  _getLatencyMap() {
    var latencies = {};
    var names = Object.keys(this._stats);

    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      latencies[name] = this._stats[name].latencyAvg || 0;
    }

    return latencies;
  }

  /**
   * 사용량 맵 생성
   *
   * @private
   * @returns {Object<string, number>}
   */
  _getUsageMap() {
    var usages = {};
    var names = Object.keys(this._stats);

    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      usages[name] = this._stats[name].usageTokens || 0;
    }

    return usages;
  }

  // ===========================================================================
  // 성능 기록
  // ===========================================================================

  /**
   * 지연시간 기록 (지수 이동 평균 사용)
   *
   * @param {string} provider - 프로바이더 이름
   * @param {number} latencyMs - 지연시간 (ms)
   */
  recordLatency(provider, latencyMs) {
    if (!this._stats[provider]) {
      this._stats[provider] = {
        latencyAvg: 0,
        usageTokens: 0,
        requestCount: 0,
        errorCount: 0,
        lastLatency: 0,
        lastUpdated: Date.now()
      };
    }

    var stats = this._stats[provider];
    var latency = typeof latencyMs === 'number' && latencyMs >= 0 ? latencyMs : 0;

    // 지수 이동 평균 계산
    if (stats.requestCount === 0 || stats.latencyAvg === 0) {
      stats.latencyAvg = latency;
    } else {
      stats.latencyAvg = LATENCY_EMA_ALPHA * latency + (1 - LATENCY_EMA_ALPHA) * stats.latencyAvg;
    }

    stats.lastLatency = latency;
    stats.requestCount++;
    stats.lastUpdated = Date.now();
  }

  /**
   * 토큰 사용량 기록
   *
   * @param {string} provider - 프로바이더 이름
   * @param {number} tokens - 사용한 토큰 수
   */
  recordUsage(provider, tokens) {
    if (!this._stats[provider]) {
      this._stats[provider] = {
        latencyAvg: 0,
        usageTokens: 0,
        requestCount: 0,
        errorCount: 0,
        lastLatency: 0,
        lastUpdated: Date.now()
      };
    }

    var stats = this._stats[provider];
    var tokenCount = typeof tokens === 'number' && tokens >= 0 ? tokens : 0;

    stats.usageTokens += tokenCount;
    stats.lastUpdated = Date.now();
  }

  /**
   * 에러 기록
   *
   * @param {string} provider - 프로바이더 이름
   */
  recordError(provider) {
    if (!this._stats[provider]) {
      this._stats[provider] = {
        latencyAvg: 0,
        usageTokens: 0,
        requestCount: 0,
        errorCount: 0,
        lastLatency: 0,
        lastUpdated: Date.now()
      };
    }

    this._stats[provider].errorCount++;
    this._stats[provider].lastUpdated = Date.now();
  }

  // ===========================================================================
  // 가중치 관리
  // ===========================================================================

  /**
   * 프로바이더 가중치 설정
   *
   * @param {string} provider - 프로바이더 이름
   * @param {number} weight - 새 가중치 (1-10)
   */
  setWeight(provider, weight) {
    if (!this._providers[provider]) {
      throw new Error('Provider not registered: ' + provider);
    }

    var w = typeof weight === 'number' ? weight : 1;
    w = Math.max(1, Math.min(10, w)); // 1-10 범위로 제한

    this._providers[provider].weight = w;
    this._weights[provider] = w;
  }

  /**
   * 모든 프로바이더 가중치 조회
   *
   * @returns {Object<string, number>} 프로바이더별 가중치 맵
   */
  getWeights() {
    var weights = {};
    var names = Object.keys(this._weights);

    for (var i = 0; i < names.length; i++) {
      weights[names[i]] = this._weights[names[i]];
    }

    return weights;
  }

  // ===========================================================================
  // 통계
  // ===========================================================================

  /**
   * 밸런서 통계 조회
   *
   * @returns {Object} 통계 정보
   */
  getStats() {
    var providerStats = {};
    var totalRequests = 0;
    var totalErrors = 0;
    var totalTokens = 0;
    var names = Object.keys(this._stats);

    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var stats = this._stats[name];

      providerStats[name] = {
        latencyAvg: Math.round(stats.latencyAvg * 100) / 100,
        lastLatency: stats.lastLatency,
        usageTokens: stats.usageTokens,
        requestCount: stats.requestCount,
        errorCount: stats.errorCount,
        errorRate: stats.requestCount > 0
          ? Math.round((stats.errorCount / stats.requestCount) * 100 * 100) / 100
          : 0,
        lastUpdated: stats.lastUpdated
      };

      totalRequests += stats.requestCount;
      totalErrors += stats.errorCount;
      totalTokens += stats.usageTokens;
    }

    return {
      providers: providerStats,
      summary: {
        totalProviders: names.length,
        activeProviders: this.getActiveProviders().length,
        totalRequests: totalRequests,
        totalErrors: totalErrors,
        totalTokens: totalTokens,
        overallErrorRate: totalRequests > 0
          ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100
          : 0
      },
      weights: this.getWeights(),
      defaultStrategy: this._defaultStrategy,
      roundRobinIndex: this._roundRobinIndex
    };
  }

  /**
   * 통계 초기화
   */
  resetStats() {
    var names = Object.keys(this._stats);

    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      this._stats[name] = {
        latencyAvg: 0,
        usageTokens: 0,
        requestCount: 0,
        errorCount: 0,
        lastLatency: 0,
        lastUpdated: Date.now()
      };
    }

    this._roundRobinIndex = -1;
  }

  /**
   * 특정 프로바이더 통계 조회
   *
   * @param {string} provider - 프로바이더 이름
   * @returns {ProviderStats|null} 통계 정보
   */
  getProviderStats(provider) {
    if (!this._stats[provider]) {
      return null;
    }

    var stats = this._stats[provider];

    return {
      latencyAvg: Math.round(stats.latencyAvg * 100) / 100,
      lastLatency: stats.lastLatency,
      usageTokens: stats.usageTokens,
      requestCount: stats.requestCount,
      errorCount: stats.errorCount,
      errorRate: stats.requestCount > 0
        ? Math.round((stats.errorCount / stats.requestCount) * 100 * 100) / 100
        : 0,
      lastUpdated: stats.lastUpdated
    };
  }
}

// =============================================================================
// 싱글톤 인스턴스
// =============================================================================

/**
 * 싱글톤 밸런서 인스턴스 반환
 *
 * @param {Object} [options] - 초기화 옵션 (첫 호출 시만 적용)
 * @returns {ProviderBalancer} 밸런서 인스턴스
 */
export function getBalancer(options) {
  if (!balancerInstance) {
    balancerInstance = new ProviderBalancer(options);
  }

  return balancerInstance;
}

/**
 * 싱글톤 인스턴스 초기화 (테스트용)
 */
export function resetBalancer() {
  balancerInstance = null;
}

// =============================================================================
// 편의 함수
// =============================================================================

/**
 * 기본 밸런서로 프로바이더 선택
 *
 * @param {BalancingStrategy} [strategy] - 선택 전략
 * @param {SelectionContext} [context] - 선택 컨텍스트
 * @returns {{ provider: string|null, reason: string }} 선택 결과
 */
export function selectProviderDefault(strategy, context) {
  return getBalancer().selectProvider(strategy, context);
}

/**
 * 기본 밸런서에 지연시간 기록
 *
 * @param {string} provider - 프로바이더 이름
 * @param {number} latencyMs - 지연시간 (ms)
 */
export function recordProviderLatency(provider, latencyMs) {
  getBalancer().recordLatency(provider, latencyMs);
}

/**
 * 기본 밸런서에 사용량 기록
 *
 * @param {string} provider - 프로바이더 이름
 * @param {number} tokens - 토큰 수
 */
export function recordProviderUsage(provider, tokens) {
  getBalancer().recordUsage(provider, tokens);
}

/**
 * 기본 밸런서 통계 조회
 *
 * @returns {Object} 통계 정보
 */
export function getBalancerStats() {
  return getBalancer().getStats();
}

// =============================================================================
// 기본 프로바이더 설정 내보내기
// =============================================================================

export { DEFAULT_PROVIDERS };
