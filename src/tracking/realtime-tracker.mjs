/**
 * realtime-tracker.mjs - Real-time usage tracking system
 * 
 * EventEmitter-based real-time tracking with:
 * - Routing event aggregation (minute/hour/day)
 * - Performance statistics (response time, success rate)
 * - Cache hit rate tracking
 * - In-memory ring buffer for recent N events
 */
import { EventEmitter } from 'events';

/**
 * Ring buffer for storing recent events with fixed capacity
 */
class RingBuffer {
  /**
   * @param {number} capacity - Maximum number of items
   */
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = [];
    this.head = 0;
  }

  /**
   * Add an item to the buffer
   * @param {*} item - Item to add
   */
  push(item) {
    if (this.buffer.length < this.capacity) {
      this.buffer.push(item);
    } else {
      this.buffer[this.head] = item;
    }
    this.head = (this.head + 1) % this.capacity;
  }

  /**
   * Get all items in order (oldest to newest)
   * @returns {Array} All items
   */
  toArray() {
    if (this.buffer.length < this.capacity) {
      return this.buffer.slice();
    }
    return this.buffer.slice(this.head).concat(this.buffer.slice(0, this.head));
  }

  /**
   * Get the most recent N items
   * @param {number} n - Number of items
   * @returns {Array} Recent items
   */
  getRecent(n) {
    const all = this.toArray();
    return all.slice(-n);
  }

  /**
   * Get buffer size
   * @returns {number} Current size
   */
  size() {
    return this.buffer.length;
  }

  /**
   * Clear the buffer
   */
  clear() {
    this.buffer = [];
    this.head = 0;
  }
}

/**
 * Time bucket for aggregating events by time period
 */
class TimeBucket {
  constructor() {
    this.routing = {
      total: 0,
      byProvider: { claude: 0, openai: 0, gemini: 0, kimi: 0 },
      byAgent: {}
    };
    this.performance = {
      totalDuration: 0,
      count: 0,
      successes: 0,
      failures: 0
    };
    this.cache = {
      hits: 0,
      misses: 0
    };
  }

  /**
   * Record a routing event
   * @param {string} provider - Provider name
   * @param {string} agent - Agent name
   */
  recordRouting(provider, agent) {
    this.routing.total++;
    
    const normalizedProvider = this._normalizeProvider(provider);
    if (this.routing.byProvider[normalizedProvider] !== undefined) {
      this.routing.byProvider[normalizedProvider]++;
    }
    
    if (agent) {
      if (!this.routing.byAgent[agent]) {
        this.routing.byAgent[agent] = 0;
      }
      this.routing.byAgent[agent]++;
    }
  }

  /**
   * Record a performance event
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} success - Whether the operation succeeded
   */
  recordPerformance(duration, success) {
    this.performance.count++;
    this.performance.totalDuration += duration;
    
    if (success) {
      this.performance.successes++;
    } else {
      this.performance.failures++;
    }
  }

  /**
   * Record a cache event
   * @param {boolean} hit - Whether it was a cache hit
   */
  recordCache(hit) {
    if (hit) {
      this.cache.hits++;
    } else {
      this.cache.misses++;
    }
  }

  /**
   * Get statistics for this bucket
   * @returns {Object} Statistics
   */
  getStats() {
    const avgDuration = this.performance.count > 0
      ? Math.round(this.performance.totalDuration / this.performance.count)
      : 0;
    
    const successRate = this.performance.count > 0
      ? Math.round((this.performance.successes / this.performance.count) * 100)
      : 100;
    
    const cacheHitRate = (this.cache.hits + this.cache.misses) > 0
      ? Math.round((this.cache.hits / (this.cache.hits + this.cache.misses)) * 100)
      : 0;

    return {
      routing: {
        total: this.routing.total,
        byProvider: Object.assign({}, this.routing.byProvider),
        byAgent: Object.assign({}, this.routing.byAgent)
      },
      performance: {
        avgDuration: avgDuration,
        successRate: successRate,
        totalCalls: this.performance.count,
        successes: this.performance.successes,
        failures: this.performance.failures
      },
      cache: {
        hits: this.cache.hits,
        misses: this.cache.misses,
        hitRate: cacheHitRate
      }
    };
  }

  /**
   * Normalize provider name
   * @private
   * @param {string} provider - Raw provider name
   * @returns {string} Normalized provider name
   */
  _normalizeProvider(provider) {
    if (!provider) return 'claude';
    
    const lower = provider.toLowerCase();
    if (lower === 'anthropic' || lower === 'claude') return 'claude';
    if (lower === 'openai' || lower === 'gpt') return 'openai';
    if (lower === 'google' || lower === 'gemini') return 'gemini';
    if (lower === 'kimi' || lower === 'kimi-for-coding' || lower === 'moonshot') return 'kimi';

    return lower;
  }
}

/**
 * Time bucket manager for different time ranges
 */
class TimeBucketManager {
  constructor() {
    /** @type {Map<string, TimeBucket>} */
    this.minuteBuckets = new Map();
    /** @type {Map<string, TimeBucket>} */
    this.hourBuckets = new Map();
    /** @type {Map<string, TimeBucket>} */
    this.dayBuckets = new Map();
    
    // Retention limits
    this.maxMinuteBuckets = 60;  // Last 60 minutes
    this.maxHourBuckets = 24;    // Last 24 hours
    this.maxDayBuckets = 30;     // Last 30 days
  }

  /**
   * Get bucket keys for current time
   * @returns {Object} Bucket keys for minute, hour, day
   */
  getCurrentKeys() {
    const now = new Date();
    return {
      minute: now.toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
      hour: now.toISOString().slice(0, 13),   // YYYY-MM-DDTHH
      day: now.toISOString().slice(0, 10)     // YYYY-MM-DD
    };
  }

  /**
   * Get or create a bucket
   * @param {Map} bucketMap - Bucket map
   * @param {string} key - Bucket key
   * @param {number} maxBuckets - Maximum buckets to retain
   * @returns {TimeBucket} The bucket
   */
  getOrCreateBucket(bucketMap, key, maxBuckets) {
    if (!bucketMap.has(key)) {
      bucketMap.set(key, new TimeBucket());
      
      // Clean up old buckets
      if (bucketMap.size > maxBuckets) {
        const keys = Array.from(bucketMap.keys()).sort();
        const toDelete = keys.slice(0, keys.length - maxBuckets);
        for (const k of toDelete) {
          bucketMap.delete(k);
        }
      }
    }
    return bucketMap.get(key);
  }

  /**
   * Record an event to all relevant buckets
   * @param {string} type - Event type ('routing', 'performance', 'cache')
   * @param {Object} data - Event data
   */
  record(type, data) {
    const keys = this.getCurrentKeys();
    
    const minuteBucket = this.getOrCreateBucket(this.minuteBuckets, keys.minute, this.maxMinuteBuckets);
    const hourBucket = this.getOrCreateBucket(this.hourBuckets, keys.hour, this.maxHourBuckets);
    const dayBucket = this.getOrCreateBucket(this.dayBuckets, keys.day, this.maxDayBuckets);
    
    const buckets = [minuteBucket, hourBucket, dayBucket];
    
    for (const bucket of buckets) {
      if (type === 'routing') {
        bucket.recordRouting(data.provider, data.agent);
      } else if (type === 'performance') {
        bucket.recordPerformance(data.duration, data.success);
      } else if (type === 'cache') {
        bucket.recordCache(data.hit);
      }
    }
  }

  /**
   * Get aggregated stats for a time range
   * @param {string} range - Time range ('minute', 'hour', 'day')
   * @returns {Object} Aggregated statistics
   */
  getStats(range) {
    let bucketMap;
    
    if (range === 'minute') {
      bucketMap = this.minuteBuckets;
    } else if (range === 'hour') {
      bucketMap = this.hourBuckets;
    } else {
      bucketMap = this.dayBuckets;
    }
    
    // Aggregate all buckets
    const aggregated = new TimeBucket();
    
    for (const bucket of bucketMap.values()) {
      const stats = bucket.getStats();
      
      // Aggregate routing
      aggregated.routing.total += stats.routing.total;
      for (const provider of Object.keys(stats.routing.byProvider)) {
        if (!aggregated.routing.byProvider[provider]) {
          aggregated.routing.byProvider[provider] = 0;
        }
        aggregated.routing.byProvider[provider] += stats.routing.byProvider[provider];
      }
      for (const agent of Object.keys(stats.routing.byAgent)) {
        if (!aggregated.routing.byAgent[agent]) {
          aggregated.routing.byAgent[agent] = 0;
        }
        aggregated.routing.byAgent[agent] += stats.routing.byAgent[agent];
      }
      
      // Aggregate performance
      aggregated.performance.count += stats.performance.totalCalls;
      aggregated.performance.totalDuration += stats.performance.avgDuration * stats.performance.totalCalls;
      aggregated.performance.successes += stats.performance.successes;
      aggregated.performance.failures += stats.performance.failures;
      
      // Aggregate cache
      aggregated.cache.hits += stats.cache.hits;
      aggregated.cache.misses += stats.cache.misses;
    }
    
    return aggregated.getStats();
  }

  /**
   * Clear all buckets
   */
  clear() {
    this.minuteBuckets.clear();
    this.hourBuckets.clear();
    this.dayBuckets.clear();
  }
}

/**
 * Real-time tracker with EventEmitter-based event system
 * @extends EventEmitter
 */
export class RealtimeTracker extends EventEmitter {
  /**
   * Create a new RealtimeTracker
   * @param {Object} options - Configuration options
   * @param {number} [options.eventBufferSize=1000] - Size of the event ring buffer
   * @param {number} [options.aggregationInterval=60000] - Aggregation interval in ms (default 1 minute)
   */
  constructor(options) {
    super();
    
    const opts = options || {};
    
    /** @type {number} */
    this.eventBufferSize = opts.eventBufferSize || 1000;
    
    /** @type {number} */
    this.aggregationInterval = opts.aggregationInterval || 60000;
    
    /** @type {RingBuffer} */
    this.eventBuffer = new RingBuffer(this.eventBufferSize);
    
    /** @type {TimeBucketManager} */
    this.bucketManager = new TimeBucketManager();
    
    /** @type {NodeJS.Timer|null} */
    this.aggregationTimer = null;
    
    /** @type {boolean} */
    this.isRunning = false;
  }

  /**
   * Track a routing event
   * @param {Object} event - Routing event data
   * @param {string} event.provider - Provider name (claude, openai, gemini)
   * @param {string} event.agent - Agent name
   * @param {string} [event.task] - Task description
   * @param {boolean} [event.fusionEnabled] - Whether fusion was enabled
   * @returns {Object} The recorded event
   */
  trackRouting(event) {
    const fullEvent = {
      type: 'routing',
      timestamp: new Date().toISOString(),
      provider: event.provider || 'claude',
      agent: event.agent || 'unknown',
      task: event.task || '',
      fusionEnabled: event.fusionEnabled !== false
    };
    
    this.eventBuffer.push(fullEvent);
    this.bucketManager.record('routing', fullEvent);
    
    this.emit('routing', fullEvent);
    this.emit('event', fullEvent);
    
    return fullEvent;
  }

  /**
   * Track a performance event
   * @param {Object} event - Performance event data
   * @param {number} event.duration - Duration in milliseconds
   * @param {boolean} event.success - Whether the operation succeeded
   * @param {string} [event.provider] - Provider name
   * @param {string} [event.agent] - Agent name
   * @param {string} [event.error] - Error message if failed
   * @returns {Object} The recorded event
   */
  trackPerformance(event) {
    const fullEvent = {
      type: 'performance',
      timestamp: new Date().toISOString(),
      duration: event.duration || 0,
      success: event.success !== false,
      provider: event.provider || 'unknown',
      agent: event.agent || 'unknown',
      error: event.error || null
    };
    
    this.eventBuffer.push(fullEvent);
    this.bucketManager.record('performance', fullEvent);
    
    this.emit('performance', fullEvent);
    this.emit('event', fullEvent);
    
    return fullEvent;
  }

  /**
   * Track a cache event
   * @param {Object} event - Cache event data
   * @param {boolean} event.hit - Whether it was a cache hit
   * @param {string} [event.key] - Cache key
   * @returns {Object} The recorded event
   */
  trackCache(event) {
    const fullEvent = {
      type: 'cache',
      timestamp: new Date().toISOString(),
      hit: event.hit === true,
      key: event.key || ''
    };
    
    this.eventBuffer.push(fullEvent);
    this.bucketManager.record('cache', fullEvent);
    
    this.emit('cache', fullEvent);
    this.emit('event', fullEvent);
    
    return fullEvent;
  }

  /**
   * Get statistics for a time range
   * @param {string} timeRange - Time range ('minute', 'hour', 'day')
   * @returns {Object} Statistics for the time range
   */
  getStats(timeRange) {
    const range = timeRange || 'hour';
    return this.bucketManager.getStats(range);
  }

  /**
   * Get recent events from the buffer
   * @param {number} [limit=100] - Maximum number of events to return
   * @returns {Array} Recent events
   */
  getRecentEvents(limit) {
    const n = limit || 100;
    return this.eventBuffer.getRecent(n);
  }

  /**
   * Start periodic aggregation
   * @returns {RealtimeTracker} This instance for chaining
   */
  startAggregation() {
    if (this.isRunning) {
      return this;
    }
    
    this.isRunning = true;
    
    this.aggregationTimer = setInterval(function() {
      this.emit('aggregation', {
        timestamp: new Date().toISOString(),
        stats: {
          minute: this.getStats('minute'),
          hour: this.getStats('hour'),
          day: this.getStats('day')
        }
      });
    }.bind(this), this.aggregationInterval);
    
    // Don't prevent process exit
    if (this.aggregationTimer.unref) {
      this.aggregationTimer.unref();
    }
    
    this.emit('started', { timestamp: new Date().toISOString() });
    
    return this;
  }

  /**
   * Stop periodic aggregation
   * @returns {RealtimeTracker} This instance for chaining
   */
  stopAggregation() {
    if (!this.isRunning) {
      return this;
    }
    
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    
    this.isRunning = false;
    
    this.emit('stopped', { timestamp: new Date().toISOString() });
    
    return this;
  }

  /**
   * Reset all tracked data
   * @returns {RealtimeTracker} This instance for chaining
   */
  reset() {
    this.eventBuffer.clear();
    this.bucketManager.clear();
    
    this.emit('reset', { timestamp: new Date().toISOString() });
    
    return this;
  }

  /**
   * Get a summary of current tracking state
   * @returns {Object} Summary object
   */
  getSummary() {
    return {
      isRunning: this.isRunning,
      eventCount: this.eventBuffer.size(),
      stats: {
        minute: this.getStats('minute'),
        hour: this.getStats('hour'),
        day: this.getStats('day')
      }
    };
  }
}

/**
 * Create a new RealtimeTracker instance
 * @param {Object} [options] - Configuration options
 * @returns {RealtimeTracker} New tracker instance
 */
export function createTracker(options) {
  return new RealtimeTracker(options);
}

// Default export
export default RealtimeTracker;
