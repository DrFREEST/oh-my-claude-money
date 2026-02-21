/**
 * tracking.test.mjs - v1.0.0 Real-time Tracking System Tests
 * 
 * Tests for RealtimeTracker and MetricsCollector classes
 */
import { test, describe, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Mock Implementations (since actual implementations don't exist yet)
// =============================================================================

/**
 * Mock RealtimeTracker class
 * Tracks routing events, performance metrics, and provides statistics
 */
class RealtimeTracker {
  constructor() {
    this.events = [];
    this.performanceData = [];
  }

  /**
   * Track a routing event
   * @param {Object} event - { target, provider, agent, timestamp }
   */
  trackRouting(event) {
    const record = {
      type: 'routing',
      target: event.target,
      provider: event.provider,
      agent: event.agent,
      timestamp: event.timestamp || Date.now(),
    };
    this.events.push(record);
    return record;
  }

  /**
   * Track performance metric
   * @param {Object} metric - { operation, duration, success, tokens }
   */
  trackPerformance(metric) {
    const record = {
      type: 'performance',
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success !== false,
      tokens: metric.tokens || 0,
      timestamp: metric.timestamp || Date.now(),
    };
    this.performanceData.push(record);
    return record;
  }

  /**
   * Get statistics for a time window
   * @param {'minute' | 'hour' | 'day'} window - Time window
   */
  getStats(window = 'hour') {
    const now = Date.now();
    const windowMs = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };

    const cutoff = now - (windowMs[window] || windowMs.hour);
    
    const recentEvents = this.events.filter(e => e.timestamp >= cutoff);
    const recentPerf = this.performanceData.filter(p => p.timestamp >= cutoff);

    const routingStats = {
      total: recentEvents.length,
      byTarget: {},
      byProvider: {},
    };

    for (const event of recentEvents) {
      routingStats.byTarget[event.target] = (routingStats.byTarget[event.target] || 0) + 1;
      routingStats.byProvider[event.provider] = (routingStats.byProvider[event.provider] || 0) + 1;
    }

    const perfStats = {
      total: recentPerf.length,
      successRate: recentPerf.length > 0
        ? (recentPerf.filter(p => p.success).length / recentPerf.length) * 100
        : 0,
      avgDuration: recentPerf.length > 0
        ? recentPerf.reduce((sum, p) => sum + p.duration, 0) / recentPerf.length
        : 0,
      totalTokens: recentPerf.reduce((sum, p) => sum + p.tokens, 0),
    };

    return {
      window,
      routing: routingStats,
      performance: perfStats,
    };
  }

  /**
   * Get recent events (last N events)
   * @param {number} limit - Maximum events to return
   */
  getRecentEvents(limit = 10) {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Clear all tracked data
   */
  reset() {
    this.events = [];
    this.performanceData = [];
  }
}

/**
 * Mock MetricsCollector class
 * Collects routing and token metrics
 */
class MetricsCollector {
  constructor() {
    this.routingMetrics = [];
    this.tokenMetrics = [];
  }

  /**
   * Record a routing decision
   * @param {Object} routing - { source, target, provider, reason }
   */
  recordRouting(routing) {
    const record = {
      source: routing.source,
      target: routing.target,
      provider: routing.provider,
      reason: routing.reason || 'default',
      timestamp: Date.now(),
    };
    this.routingMetrics.push(record);
    return record;
  }

  /**
   * Record token usage
   * @param {Object} tokens - { provider, input, output, cost }
   */
  recordTokens(tokens) {
    const record = {
      provider: tokens.provider,
      input: tokens.input || 0,
      output: tokens.output || 0,
      cost: tokens.cost || 0,
      timestamp: Date.now(),
    };
    this.tokenMetrics.push(record);
    return record;
  }

  /**
   * Get aggregated metrics
   */
  getMetrics() {
    const byProvider = {};

    for (const t of this.tokenMetrics) {
      if (!byProvider[t.provider]) {
        byProvider[t.provider] = { input: 0, output: 0, cost: 0, count: 0 };
      }
      byProvider[t.provider].input += t.input;
      byProvider[t.provider].output += t.output;
      byProvider[t.provider].cost += t.cost;
      byProvider[t.provider].count += 1;
    }

    const routingByTarget = {};
    for (const r of this.routingMetrics) {
      routingByTarget[r.target] = (routingByTarget[r.target] || 0) + 1;
    }

    return {
      routing: {
        total: this.routingMetrics.length,
        byTarget: routingByTarget,
      },
      tokens: {
        byProvider,
        totalInput: this.tokenMetrics.reduce((sum, t) => sum + t.input, 0),
        totalOutput: this.tokenMetrics.reduce((sum, t) => sum + t.output, 0),
        totalCost: this.tokenMetrics.reduce((sum, t) => sum + t.cost, 0),
      },
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.routingMetrics = [];
    this.tokenMetrics = [];
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('RealtimeTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new RealtimeTracker();
  });

  describe('trackRouting()', () => {
    test('records routing event with all fields', () => {
      const event = {
        target: 'mcp',
        provider: 'gemini',
        agent: 'explore',
        timestamp: Date.now(),
      };

      const result = tracker.trackRouting(event);

      assert.strictEqual(result.type, 'routing');
      assert.strictEqual(result.target, 'mcp');
      assert.strictEqual(result.provider, 'gemini');
      assert.strictEqual(result.agent, 'explore');
      assert.ok(result.timestamp);
    });

    test('auto-generates timestamp if not provided', () => {
      const before = Date.now();
      const result = tracker.trackRouting({ target: 'omc', provider: 'anthropic' });
      const after = Date.now();

      assert.ok(result.timestamp >= before);
      assert.ok(result.timestamp <= after);
    });

    test('stores event in events array', () => {
      tracker.trackRouting({ target: 'mcp', provider: 'openai' });
      tracker.trackRouting({ target: 'omc', provider: 'anthropic' });

      assert.strictEqual(tracker.events.length, 2);
    });
  });

  describe('trackPerformance()', () => {
    test('records performance metric with all fields', () => {
      const metric = {
        operation: 'execute',
        duration: 1500,
        success: true,
        tokens: 500,
      };

      const result = tracker.trackPerformance(metric);

      assert.strictEqual(result.type, 'performance');
      assert.strictEqual(result.operation, 'execute');
      assert.strictEqual(result.duration, 1500);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.tokens, 500);
    });

    test('defaults success to true if not specified', () => {
      const result = tracker.trackPerformance({ operation: 'query', duration: 100 });
      assert.strictEqual(result.success, true);
    });

    test('defaults tokens to 0 if not specified', () => {
      const result = tracker.trackPerformance({ operation: 'query', duration: 100 });
      assert.strictEqual(result.tokens, 0);
    });

    test('stores in performanceData array', () => {
      tracker.trackPerformance({ operation: 'op1', duration: 100 });
      tracker.trackPerformance({ operation: 'op2', duration: 200 });

      assert.strictEqual(tracker.performanceData.length, 2);
    });
  });

  describe('getStats()', () => {
    test('returns stats for minute window', () => {
      tracker.trackRouting({ target: 'mcp', provider: 'gemini' });
      tracker.trackRouting({ target: 'mcp', provider: 'openai' });
      tracker.trackRouting({ target: 'omc', provider: 'anthropic' });

      const stats = tracker.getStats('minute');

      assert.strictEqual(stats.window, 'minute');
      assert.strictEqual(stats.routing.total, 3);
      assert.strictEqual(stats.routing.byTarget.mcp, 2);
      assert.strictEqual(stats.routing.byTarget.omc, 1);
    });

    test('returns stats for hour window', () => {
      tracker.trackRouting({ target: 'mcp', provider: 'gemini' });
      
      const stats = tracker.getStats('hour');

      assert.strictEqual(stats.window, 'hour');
      assert.strictEqual(stats.routing.total, 1);
    });

    test('returns stats for day window', () => {
      tracker.trackRouting({ target: 'omc', provider: 'anthropic' });
      
      const stats = tracker.getStats('day');

      assert.strictEqual(stats.window, 'day');
      assert.strictEqual(stats.routing.total, 1);
    });

    test('calculates performance success rate', () => {
      tracker.trackPerformance({ operation: 'op1', duration: 100, success: true });
      tracker.trackPerformance({ operation: 'op2', duration: 200, success: true });
      tracker.trackPerformance({ operation: 'op3', duration: 150, success: false });

      const stats = tracker.getStats('hour');

      // 2 out of 3 = ~66.67%
      assert.ok(stats.performance.successRate > 66);
      assert.ok(stats.performance.successRate < 67);
    });

    test('calculates average duration', () => {
      tracker.trackPerformance({ operation: 'op1', duration: 100 });
      tracker.trackPerformance({ operation: 'op2', duration: 200 });
      tracker.trackPerformance({ operation: 'op3', duration: 300 });

      const stats = tracker.getStats('hour');

      assert.strictEqual(stats.performance.avgDuration, 200);
    });

    test('sums total tokens', () => {
      tracker.trackPerformance({ operation: 'op1', duration: 100, tokens: 500 });
      tracker.trackPerformance({ operation: 'op2', duration: 200, tokens: 1000 });

      const stats = tracker.getStats('hour');

      assert.strictEqual(stats.performance.totalTokens, 1500);
    });

    test('returns zeros for empty data', () => {
      const stats = tracker.getStats('hour');

      assert.strictEqual(stats.routing.total, 0);
      assert.strictEqual(stats.performance.total, 0);
      assert.strictEqual(stats.performance.successRate, 0);
      assert.strictEqual(stats.performance.avgDuration, 0);
    });

    test('groups by provider correctly', () => {
      tracker.trackRouting({ target: 'mcp', provider: 'gemini' });
      tracker.trackRouting({ target: 'mcp', provider: 'gemini' });
      tracker.trackRouting({ target: 'mcp', provider: 'openai' });

      const stats = tracker.getStats('hour');

      assert.strictEqual(stats.routing.byProvider.gemini, 2);
      assert.strictEqual(stats.routing.byProvider.openai, 1);
    });
  });

  describe('getRecentEvents()', () => {
    test('returns last N events in reverse order', () => {
      tracker.trackRouting({ target: 'a', provider: 'p1' });
      tracker.trackRouting({ target: 'b', provider: 'p2' });
      tracker.trackRouting({ target: 'c', provider: 'p3' });

      const recent = tracker.getRecentEvents(2);

      assert.strictEqual(recent.length, 2);
      assert.strictEqual(recent[0].target, 'c'); // Most recent first
      assert.strictEqual(recent[1].target, 'b');
    });

    test('returns all events if limit exceeds count', () => {
      tracker.trackRouting({ target: 'a', provider: 'p1' });
      tracker.trackRouting({ target: 'b', provider: 'p2' });

      const recent = tracker.getRecentEvents(10);

      assert.strictEqual(recent.length, 2);
    });

    test('defaults to 10 events', () => {
      for (let i = 0; i < 15; i++) {
        tracker.trackRouting({ target: `t${i}`, provider: 'p' });
      }

      const recent = tracker.getRecentEvents();

      assert.strictEqual(recent.length, 10);
    });

    test('returns empty array when no events', () => {
      const recent = tracker.getRecentEvents();
      assert.deepStrictEqual(recent, []);
    });
  });

  describe('reset()', () => {
    test('clears all events and performance data', () => {
      tracker.trackRouting({ target: 'a', provider: 'p' });
      tracker.trackPerformance({ operation: 'op', duration: 100 });

      tracker.reset();

      assert.strictEqual(tracker.events.length, 0);
      assert.strictEqual(tracker.performanceData.length, 0);
    });
  });
});

describe('MetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('recordRouting()', () => {
    test('records routing with all fields', () => {
      const routing = {
        source: 'architect',
        target: 'mcp',
        provider: 'gemini',
        reason: 'token_saving',
      };

      const result = collector.recordRouting(routing);

      assert.strictEqual(result.source, 'architect');
      assert.strictEqual(result.target, 'mcp');
      assert.strictEqual(result.provider, 'gemini');
      assert.strictEqual(result.reason, 'token_saving');
      assert.ok(result.timestamp);
    });

    test('defaults reason to "default"', () => {
      const result = collector.recordRouting({
        source: 'executor',
        target: 'omc',
        provider: 'anthropic',
      });

      assert.strictEqual(result.reason, 'default');
    });

    test('stores in routingMetrics array', () => {
      collector.recordRouting({ source: 's1', target: 't1', provider: 'p1' });
      collector.recordRouting({ source: 's2', target: 't2', provider: 'p2' });

      assert.strictEqual(collector.routingMetrics.length, 2);
    });
  });

  describe('recordTokens()', () => {
    test('records token usage with all fields', () => {
      const tokens = {
        provider: 'openai',
        input: 1000,
        output: 500,
        cost: 0.015,
      };

      const result = collector.recordTokens(tokens);

      assert.strictEqual(result.provider, 'openai');
      assert.strictEqual(result.input, 1000);
      assert.strictEqual(result.output, 500);
      assert.strictEqual(result.cost, 0.015);
      assert.ok(result.timestamp);
    });

    test('defaults to zeros for missing values', () => {
      const result = collector.recordTokens({ provider: 'gemini' });

      assert.strictEqual(result.input, 0);
      assert.strictEqual(result.output, 0);
      assert.strictEqual(result.cost, 0);
    });

    test('stores in tokenMetrics array', () => {
      collector.recordTokens({ provider: 'p1', input: 100 });
      collector.recordTokens({ provider: 'p2', input: 200 });

      assert.strictEqual(collector.tokenMetrics.length, 2);
    });
  });

  describe('getMetrics()', () => {
    test('returns aggregated routing metrics', () => {
      collector.recordRouting({ source: 's1', target: 'mcp', provider: 'p1' });
      collector.recordRouting({ source: 's2', target: 'mcp', provider: 'p2' });
      collector.recordRouting({ source: 's3', target: 'omc', provider: 'p3' });

      const metrics = collector.getMetrics();

      assert.strictEqual(metrics.routing.total, 3);
      assert.strictEqual(metrics.routing.byTarget.mcp, 2);
      assert.strictEqual(metrics.routing.byTarget.omc, 1);
    });

    test('aggregates tokens by provider', () => {
      collector.recordTokens({ provider: 'openai', input: 1000, output: 500, cost: 0.01 });
      collector.recordTokens({ provider: 'openai', input: 2000, output: 1000, cost: 0.02 });
      collector.recordTokens({ provider: 'gemini', input: 500, output: 250, cost: 0.005 });

      const metrics = collector.getMetrics();

      assert.strictEqual(metrics.tokens.byProvider.openai.input, 3000);
      assert.strictEqual(metrics.tokens.byProvider.openai.output, 1500);
      assert.strictEqual(metrics.tokens.byProvider.openai.cost, 0.03);
      assert.strictEqual(metrics.tokens.byProvider.openai.count, 2);

      assert.strictEqual(metrics.tokens.byProvider.gemini.input, 500);
      assert.strictEqual(metrics.tokens.byProvider.gemini.count, 1);
    });

    test('calculates total tokens', () => {
      collector.recordTokens({ provider: 'p1', input: 1000, output: 500 });
      collector.recordTokens({ provider: 'p2', input: 2000, output: 1000 });

      const metrics = collector.getMetrics();

      assert.strictEqual(metrics.tokens.totalInput, 3000);
      assert.strictEqual(metrics.tokens.totalOutput, 1500);
    });

    test('calculates total cost', () => {
      collector.recordTokens({ provider: 'p1', cost: 0.01 });
      collector.recordTokens({ provider: 'p2', cost: 0.02 });
      collector.recordTokens({ provider: 'p3', cost: 0.005 });

      const metrics = collector.getMetrics();

      // 부동소수점 정밀도 문제로 근사값 비교 사용
      assert.ok(
        Math.abs(metrics.tokens.totalCost - 0.035) < 0.0001,
        `Expected ~0.035, got ${metrics.tokens.totalCost}`
      );
    });

    test('returns zeros for empty collectors', () => {
      const metrics = collector.getMetrics();

      assert.strictEqual(metrics.routing.total, 0);
      assert.deepStrictEqual(metrics.routing.byTarget, {});
      assert.strictEqual(metrics.tokens.totalInput, 0);
      assert.strictEqual(metrics.tokens.totalOutput, 0);
      assert.strictEqual(metrics.tokens.totalCost, 0);
    });
  });

  describe('reset()', () => {
    test('clears all metrics', () => {
      collector.recordRouting({ source: 's', target: 't', provider: 'p' });
      collector.recordTokens({ provider: 'p', input: 100 });

      collector.reset();

      assert.strictEqual(collector.routingMetrics.length, 0);
      assert.strictEqual(collector.tokenMetrics.length, 0);
    });
  });
});

console.log('[v100/tracking.test.mjs] Tests loaded successfully');
