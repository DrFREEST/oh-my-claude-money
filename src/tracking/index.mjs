/**
 * tracking/index.mjs - Real-time tracking module exports
 * 
 * Provides real-time usage tracking and metrics collection for the fusion system.
 */

// Real-time tracker (EventEmitter-based)
export {
  RealtimeTracker,
  createTracker
} from './realtime-tracker.mjs';

// Metrics collector
export {
  MetricsCollector,
  createMetricsCollector
} from './metrics-collector.mjs';
