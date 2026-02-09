# Draft: HUD & Tracking System Analysis

## Analysis Complete - All Files Read

### src/hud/ Directory Structure & Roles

| File | Role | Lines |
|------|------|-------|
| `index.mjs` | Module exports: re-exports fusion-renderer functions | 12 |
| `omcm-hud.mjs` | **Main HUD**: Orchestrates all HUD rendering (965 lines) |
| `omcm-hud-wrapper.mjs` | Dynamic delegation: finds marketplace HUD path, handles stdin | 78 |
| `omcm-hud-entry.cjs` | CJS entry point: captures stdin synchronously before ESM loads | 31 |
| `fusion-renderer.mjs` | Rendering functions for fusion metrics, tokens, provider stats | 325 |
| `mode-detector.mjs` | Detects active modes (ultrawork, ralph, autopilot, etc.) | 302 |
| `claude-usage-api.mjs` | Anthropic OAuth API for rate limit usage (5h/wk) | 369 |

### src/tracking/ Directory Structure & Roles

| File | Role | Lines |
|------|------|-------|
| `index.mjs` | Module exports: RealtimeTracker, MetricsCollector | 18 |
| `call-logger.mjs` | Session-scoped OpenCode call logging (JSONL), token aggregation | 211 |
| `metrics-collector.mjs` | Provider usage, agent routing, token savings, error tracking | 348 |
| `realtime-tracker.mjs` | EventEmitter + RingBuffer + TimeBucket aggregation (min/hr/day) | 575 |
| `tool-tracker-logger.mjs` | Tool usage tracking (Read/Edit/Bash/Task counts per session) | 89 |

---

## Evidence: What the HUD Shows

### 1. Token Usage - YES
- **Claude tokens**: Parsed from stdin JSON (transcript JSONL aggregation)
  - `parseClaudeTokensFromStdin()` → input/output/cacheRead/cacheCreate
  - `aggregateClaudeFromTranscript()` → parses session JSONL for rate-limit-relevant tokens
- **OpenCode tokens**: Per-provider aggregation
  - `aggregateOpenCodeTokens()` → { openai, gemini, kimi, anthropic } each with { input, output, count }
  - Sources: session call-logger (primary) or OpenCode message dirs (legacy fallback)
- **Rendered by**: `renderProviderTokens()` → `C:1.2k↑0.5k↓|O:3.4k↑1.2k↓|G:0.8k↑0.3k↓`

### 2. Call Counts - YES
- **Provider counts**: `renderProviderCounts()` → `C:7|O:8|G:1|K:2`
- **Data source**: Combines Claude turns (from transcript) + OpenCode provider counts
- **Tool usage stats**: `renderToolStats()` → `R:45 E:12 B:23 T:3` (Read/Edit/Bash/Task)

### 3. Provider-Level Stats - YES
- **Claude 5h/weekly usage %**: `renderClaudeUsage()` → `5h:28%(1h41m) wk:16%(5d12h)`
  - Uses Anthropic OAuth API via `claude-usage-api.mjs`
- **Provider limits**: `renderProviderLimits()` → `C:45% O:85% G:~60%`
- **Fallback status**: `renderFallbackStatus()` → `🔄GPT-5.2-Codex`
- **Session split warning**: `renderSplitWarning()` → `⚠️SPLIT` at 10M tokens, `🔴SPLIT!` at 30M

### 4. Fusion-Related Stats - YES
- **Fusion metrics**: `renderFusionMetrics()` → `⚡53% 12.5k↗ eco L2`
  - Savings rate %, saved tokens, mode abbreviation, routing level (L1-L4)
- **Fusion state**: Read from `fusion-tracker.mjs` (sessionId-scoped)
- **Savings calculation**: `updateSavingsFromTokens()` called every HUD render
- **Routing levels**: L1 (< 5M), L2 (5-20M), L3 (20-40M), L4 (>40M) based on Claude input tokens

---

## Key Functions Summary

### omcm-hud.mjs (Main Orchestrator)
- `main()` - Entry point, delegates to OMC-wrapped or independent mode
- `buildIndependentHud()` - Full HUD without OMC dependency
- `parseClaudeTokensFromStdin()` - Parse Claude Code stdin JSON
- `aggregateClaudeFromTranscript()` - JSONL transcript token aggregation
- `aggregateOpenCodeTokens()` - Multi-provider token aggregation
- `renderClaudeUsage()` - 5h/wk usage from Anthropic API
- `renderSplitWarning()` - Session split warning at 10M/30M tokens
- `renderToolStats()` - Tool usage breakdown (R/E/B/T)
- `checkAndResetSessionIfNeeded()` - Session boundary detection

### fusion-renderer.mjs
- `renderFusionMetrics()` - Savings %, saved tokens, mode, routing level
- `renderFusionCompact()` - Minimal `⚡53%`
- `renderProviderLimits()` - Provider limit percentages
- `renderProviderCounts()` - Provider routing counts
- `renderProviderTokens()` - Per-provider input/output token display
- `renderFallbackStatus()` - Active fallback indicator
- `renderProviderInfo()` - Combined limits + fallback

### claude-usage-api.mjs
- `getClaudeUsage()` - Fetch from Anthropic OAuth API (cached 30s)
- `hasClaudeCredentials()` - Check credential availability
- `formatTimeUntilReset()` - Human-readable reset countdown

### mode-detector.mjs
- `detectActiveModes()` - Scan state files for active modes
- `renderModeStatus()` - Format: `[ULW 2h15m]`, `[RLP i3/5]`
- `getPrimaryMode()` - First active mode
- `isAnyModeActive()` - Boolean check

### call-logger.mjs (tracking/)
- `logOpenCodeCall()` - Log individual OpenCode call with tokens/provider/model
- `getSessionCalls()` - Retrieve calls for a session (with time filter)
- `aggregateSessionTokens()` - Per-provider token totals for session

### metrics-collector.mjs (tracking/)
- `MetricsCollector.recordRouting()` - Record provider+agent routing event
- `MetricsCollector.recordTokens()` - Record token usage + calculate savings
- `MetricsCollector.recordError()` - Record error by provider/type
- `MetricsCollector.getMetrics()` - Derived metrics (success rates, fusion ratio)
- `MetricsCollector.getSummary()` - Key metrics summary

### realtime-tracker.mjs (tracking/)
- `RealtimeTracker.trackRouting()` - Real-time routing event
- `RealtimeTracker.trackPerformance()` - Duration/success tracking
- `RealtimeTracker.trackCache()` - Cache hit/miss tracking
- `RealtimeTracker.getStats()` - Aggregated stats by time range
- `RingBuffer` - Fixed-capacity circular buffer
- `TimeBucket` - Time-windowed aggregation (minute/hour/day)

### tool-tracker-logger.mjs (tracking/)
- `logToolUsage()` - Log tool call (Read/Edit/Bash/Task etc.)
- `getToolUsageStats()` - Per-session tool usage breakdown
