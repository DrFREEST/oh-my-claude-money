/**
 * metrics-collector.mjs - Metrics collection for fusion system
 * 
 * Collects and aggregates:
 * - Provider usage (claude, openai, gemini, kimi)
 * - Agent routing counts
 * - Token savings estimation
 * - Error rate tracking
 */

/**
 * Default metrics structure
 * @returns {Object} Default metrics object
 */
function getDefaultMetrics() {
  return {
    // Provider usage
    providers: {
      claude: { calls: 0, errors: 0, totalDuration: 0, estimatedTokens: 0 },
      openai: { calls: 0, errors: 0, totalDuration: 0, estimatedTokens: 0 },
      gemini: { calls: 0, errors: 0, totalDuration: 0, estimatedTokens: 0 },
      kimi: { calls: 0, errors: 0, totalDuration: 0, estimatedTokens: 0 }
    },
    
    // Agent routing
    agents: {},
    
    // Token savings
    tokenSavings: {
      estimated: 0,
      byProvider: { openai: 0, gemini: 0, kimi: 0 }
    },
    
    // Error tracking
    errors: {
      total: 0,
      byProvider: { claude: 0, openai: 0, gemini: 0, kimi: 0 },
      byType: {}
    },
    
    // Session info
    session: {
      startTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalCalls: 0
    }
  };
}

/**
 * Normalize provider name to standard format
 * @param {string} provider - Raw provider name
 * @returns {string} Normalized provider name
 */
function normalizeProvider(provider) {
  if (!provider) return 'claude';
  
  const lower = provider.toLowerCase();
  
  if (lower === 'anthropic' || lower === 'claude') return 'claude';
  if (lower === 'openai' || lower === 'gpt') return 'openai';
  if (lower === 'google' || lower === 'gemini') return 'gemini';
  if (lower === 'kimi' || lower === 'kimi-for-coding' || lower === 'moonshot') return 'kimi';

  return 'claude';
}

/**
 * Estimate token savings when routing away from Claude
 * @param {string} provider - Target provider
 * @param {number} estimatedTokens - Estimated tokens for the call
 * @returns {number} Estimated saved Claude tokens
 */
function estimateTokenSavings(provider, estimatedTokens) {
  const normalized = normalizeProvider(provider);
  
  // Only count savings for non-Claude providers
  if (normalized === 'claude') {
    return 0;
  }
  
  // Assume the same operation would have used similar tokens on Claude
  return estimatedTokens || 0;
}

/**
 * MetricsCollector class for tracking fusion system metrics
 */
export class MetricsCollector {
  /**
   * Create a new MetricsCollector
   */
  constructor() {
    /** @type {Object} */
    this.metrics = getDefaultMetrics();
  }

  /**
   * Record a routing event
   * @param {string} provider - Provider name (claude, openai, gemini, kimi)
   * @param {string} agent - Agent name
   * @param {boolean} success - Whether the operation succeeded
   * @param {number} duration - Duration in milliseconds
   * @returns {Object} Updated metrics
   */
  recordRouting(provider, agent, success, duration) {
    const normalizedProvider = normalizeProvider(provider);
    const dur = duration || 0;
    const succeeded = success !== false;
    
    // Update provider metrics
    const providerMetrics = this.metrics.providers[normalizedProvider];
    if (providerMetrics) {
      providerMetrics.calls++;
      providerMetrics.totalDuration += dur;
      
      if (!succeeded) {
        providerMetrics.errors++;
        this.metrics.errors.total++;
        this.metrics.errors.byProvider[normalizedProvider]++;
      }
    }
    
    // Update agent metrics
    if (agent) {
      if (!this.metrics.agents[agent]) {
        this.metrics.agents[agent] = {
          calls: 0,
          errors: 0,
          totalDuration: 0,
          providers: { claude: 0, openai: 0, gemini: 0, kimi: 0 }
        };
      }
      
      const agentMetrics = this.metrics.agents[agent];
      agentMetrics.calls++;
      agentMetrics.totalDuration += dur;
      
      if (agentMetrics.providers[normalizedProvider] !== undefined) {
        agentMetrics.providers[normalizedProvider]++;
      }
      
      if (!succeeded) {
        agentMetrics.errors++;
      }
    }
    
    // Update session info
    this.metrics.session.totalCalls++;
    this.metrics.session.lastUpdated = new Date().toISOString();
    
    return this.metrics;
  }

  /**
   * Record token usage and calculate savings
   * @param {string} provider - Provider name
   * @param {number} estimated - Estimated token count
   * @returns {Object} Updated metrics
   */
  recordTokens(provider, estimated) {
    const normalizedProvider = normalizeProvider(provider);
    const tokens = estimated || 0;
    
    // Update provider token count
    const providerMetrics = this.metrics.providers[normalizedProvider];
    if (providerMetrics) {
      providerMetrics.estimatedTokens += tokens;
    }
    
    // Calculate savings (tokens saved from Claude by using other providers)
    const savings = estimateTokenSavings(provider, tokens);
    if (savings > 0) {
      this.metrics.tokenSavings.estimated += savings;
      
      if (this.metrics.tokenSavings.byProvider[normalizedProvider] !== undefined) {
        this.metrics.tokenSavings.byProvider[normalizedProvider] += savings;
      }
    }
    
    this.metrics.session.lastUpdated = new Date().toISOString();
    
    return this.metrics;
  }

  /**
   * Record an error
   * @param {string} provider - Provider name
   * @param {string} errorType - Type of error
   * @param {string} [message] - Error message
   * @returns {Object} Updated metrics
   */
  recordError(provider, errorType, message) {
    const normalizedProvider = normalizeProvider(provider);
    const type = errorType || 'unknown';
    
    // Update error counts
    this.metrics.errors.total++;
    
    if (this.metrics.errors.byProvider[normalizedProvider] !== undefined) {
      this.metrics.errors.byProvider[normalizedProvider]++;
    }
    
    if (!this.metrics.errors.byType[type]) {
      this.metrics.errors.byType[type] = { count: 0, lastMessage: null };
    }
    this.metrics.errors.byType[type].count++;
    this.metrics.errors.byType[type].lastMessage = message || null;
    
    this.metrics.session.lastUpdated = new Date().toISOString();
    
    return this.metrics;
  }

  /**
   * Get all metrics
   * @returns {Object} Current metrics snapshot
   */
  getMetrics() {
    // Calculate derived metrics
    const metrics = JSON.parse(JSON.stringify(this.metrics));
    
    // Calculate success rates
    for (const provider of Object.keys(metrics.providers)) {
      const pm = metrics.providers[provider];
      pm.successRate = pm.calls > 0
        ? Math.round(((pm.calls - pm.errors) / pm.calls) * 100)
        : 100;
      pm.avgDuration = pm.calls > 0
        ? Math.round(pm.totalDuration / pm.calls)
        : 0;
    }
    
    // Calculate agent success rates
    for (const agent of Object.keys(metrics.agents)) {
      const am = metrics.agents[agent];
      am.successRate = am.calls > 0
        ? Math.round(((am.calls - am.errors) / am.calls) * 100)
        : 100;
      am.avgDuration = am.calls > 0
        ? Math.round(am.totalDuration / am.calls)
        : 0;
    }
    
    // Calculate overall error rate
    metrics.errors.rate = metrics.session.totalCalls > 0
      ? Math.round((metrics.errors.total / metrics.session.totalCalls) * 100)
      : 0;
    
    // Calculate fusion ratio (non-Claude calls / total calls)
    const claudeCalls = metrics.providers.claude.calls;
    const totalCalls = metrics.session.totalCalls;
    const fusedCalls = totalCalls - claudeCalls;
    metrics.session.fusionRatio = totalCalls > 0
      ? Math.round((fusedCalls / totalCalls) * 100)
      : 0;
    
    return metrics;
  }

  /**
   * Get a summary of key metrics
   * @returns {Object} Key metrics summary
   */
  getSummary() {
    const metrics = this.getMetrics();
    
    return {
      totalCalls: metrics.session.totalCalls,
      fusionRatio: metrics.session.fusionRatio + '%',
      tokenSavings: metrics.tokenSavings.estimated,
      errorRate: metrics.errors.rate + '%',
      byProvider: {
        claude: metrics.providers.claude.calls,
        openai: metrics.providers.openai.calls,
        gemini: metrics.providers.gemini.calls,
        kimi: metrics.providers.kimi.calls
      },
      topAgents: this._getTopAgents(5)
    };
  }

  /**
   * Get top N agents by call count
   * @private
   * @param {number} n - Number of agents
   * @returns {Array} Top agents
   */
  _getTopAgents(n) {
    const agents = Object.entries(this.metrics.agents)
      .map(function(entry) {
        return { name: entry[0], calls: entry[1].calls };
      })
      .sort(function(a, b) {
        return b.calls - a.calls;
      })
      .slice(0, n);
    
    return agents;
  }

  /**
   * Reset all metrics
   * @returns {MetricsCollector} This instance for chaining
   */
  resetMetrics() {
    this.metrics = getDefaultMetrics();
    return this;
  }

  /**
   * Export metrics as JSON string
   * @returns {string} JSON string of metrics
   */
  toJSON() {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Import metrics from JSON string
   * @param {string} json - JSON string of metrics
   * @returns {MetricsCollector} This instance for chaining
   */
  fromJSON(json) {
    try {
      const parsed = JSON.parse(json);
      // Validate structure
      if (parsed && parsed.providers && parsed.session) {
        this.metrics = parsed;
      }
    } catch (e) {
      // Ignore invalid JSON
    }
    return this;
  }
}

/**
 * Create a new MetricsCollector instance
 * @returns {MetricsCollector} New collector instance
 */
export function createMetricsCollector() {
  return new MetricsCollector();
}

// Default export
export default MetricsCollector;
