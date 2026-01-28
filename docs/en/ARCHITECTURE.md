# OMCM (oh-my-claude-money) v1.0.0 Architecture

## Overview

OMCM is a Fusion Orchestrator that integrates Claude Code and OpenCode. A single Meta-Orchestrator (Claude Opus 4.5) analyzes tasks and routes them to either 32 OMC Agents or OpenCode's Multi-Provider Agents.

**Core Goals**: 62% Claude Token Saving + Parallel Processing Performance + Auto Fallback System

```
┌─────────────────────────────────────────────────────────────────────┐
│              Meta-Orchestrator (Claude Opus 4.5)                    │
│                     "Conductor Role"                                │
├─────────────────────────────────────────────────────────────────────┤
│                              ↓                                      │
│              ┌────────────────────────────┐                        │
│              │    Fusion Router Logic     │                        │
│              │ "Which LLM is optimal?"    │                        │
│              │ (1. Fallback 2. Limit 3. Mode) │                   │
│              └────────────────────────────┘                        │
│                    ↓              ↓              ↓                  │
│     ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐        │
│     │ oh-my-claudecode │ │  OpenCode    │ │   Server Pool │       │
│     │ (Claude tokens)  │ │ (Other LLMs) │ │   (Parallel)  │       │
│     │                  │ │              │ │              │        │
│     │ • planner        │ │ • Oracle     │ │ HTTP ports   │        │
│     │ • executor       │ │ • Codex      │ │ 4096-4100    │        │
│     │ • critic         │ │ • Flash      │ │              │        │
│     └──────────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Core Components

### 1.1 Fusion Router (src/hooks/fusion-router-logic.mjs)

The Fusion Routing Decision Engine routes each task to the optimal provider through a 4-stage decision tree.

#### Routing Priority (Decision Order)

```
1. Check Fallback Active State
   └─ fallbackActive === true → Force routing to OpenCode

2. Check Claude Limit
   └─ Either 5-hour/weekly ≥ 90% → Route to OpenCode

3. Check Fusion Mode
   ├─ fusionDefault === true → All agents except planner to OpenCode
   └─ save-tokens mode → Only 18 token-saving agents to OpenCode

4. Default → Execute on Claude
```

#### Core Function

```javascript
shouldRouteToOpenCode(toolInput, options)
```

**Input**: `{ subagent_type: 'oh-my-claudecode:architect', ... }`

**Output**:
```javascript
{
  route: true,                      // Whether to route
  reason: 'claude-limit-92%',       // Decision reason
  targetModel: {
    id: 'gpt-5.2-codex',
    name: 'GPT-5.2 Codex'
  },
  opencodeAgent: 'Oracle'          // OpenCode mapped agent
}
```

#### Agent Mapping (29 Routing Targets)

| OMC Agent | Routing Target | Model | Reason |
|-----------|----------------|-------|--------|
| architect-low | OpenCode Flash | Gemini 3 Flash | Fast Analysis |
| architect-medium | OpenCode Oracle | GPT-5.2 | Medium Complexity |
| researcher | OpenCode Oracle | GPT-5.2 | Cost Efficiency |
| explore, explore-medium | OpenCode Flash/Oracle | Gemini/GPT | Search Tasks |
| designer | OpenCode Flash | Gemini 3 | UI Tasks |
| writer | OpenCode Flash | Gemini 3 Flash | Documentation |
| vision | OpenCode Flash | Gemini 3 Flash | Image Analysis |
| code-reviewer-low | OpenCode Flash | Gemini 3 Flash | Simple Review |
| security-reviewer-low | OpenCode Flash | Gemini 3 Flash | Quick Scan |
| **planner, executor, critic** | Claude (retained) | Claude Opus | High Quality |

### 1.2 Server Pool (src/executor/opencode-server-pool.mjs)

A Flexible Server Pool that reduces OpenCode's routing latency by ~90%.

#### Dynamic Scaling Architecture

```
Request arrives
    ↓
┌─────────────────────────────┐
│ Port 4096 (IDLE)            │ → Selected (available)
│ Port 4097 (BUSY) ┐          │
│ Port 4098 (BUSY) ├─ Already in use
│ (maxServers reached)│        │
└─────────────────────────────┘
    ↓
  [Execute]
    ↓
Check utilization
├─ ≥80% → Scale up (start new port 4099)
└─ <30% & idle → Scale down (after 1 minute)
```

#### Configuration Options

```javascript
const pool = new OpenCodeServerPool({
  minServers: 1,      // Minimum servers to maintain
  maxServers: 5,      // Maximum servers (Memory: 250-300MB/server)
  basePort: 4096,     // Base port
  autoScale: true     // Enable auto scaling
});
```

#### Round-Robin Load Balancing

```javascript
// Cycle through ports 4096, 4097, 4098
Server 1 (idle) → selected → changed to busy
Server 2 (busy) → skip
Server 3 (idle) → next selection
```

#### Health Check & Recovery

- Check all server status every 30 seconds
- Auto restart ERROR state servers
- Force shutdown timeout: 5 seconds

### 1.3 Parallel Executor (src/orchestrator/parallel-executor.mjs)

Executes multiple tasks in parallel, sequential, or hybrid mode.

#### Execution Modes

```
ParallelExecutor
  ├─ executeParallel(tasks, maxWorkers)
  │  └─ Execute independent tasks concurrently with worker pool
  │
  ├─ executeSequential(tasks)
  │  └─ Execute tasks in order
  │
  └─ executeHybrid(tasks)
     └─ Group by dependency + execute each group in parallel
```

#### Can Run in Parallel Determination

```javascript
canRunInParallel(tasks)
// Checks:
// 1. 2+ tasks?
// 2. No dependencies between tasks?
// 3. No file conflicts?
```

#### File Conflict Detection

```javascript
Task 1: files: ['src/auth.js', 'src/db.js']
Task 2: files: ['src/auth.js']  // ← Conflict! Switch to sequential execution

Result:
{
  canParallel: false,
  reason: 'File conflicts exist between tasks',
  conflicts: [
    { file: 'src/auth.js', tasks: [0, 1] }
  ]
}
```

#### Worker Pool Implementation

```
Task Queue: [T1, T2, T3, T4, T5]
Max Workers: 3

Initial State:
W1: T1 in progress   W2: T2 in progress   W3: T3 in progress   [T4, T5] pending

When W1 Completes:
W1: Start T4     W2: T2 in progress   W3: T3 in progress   [T5] pending

All Tasks Done → Return Results
```

### 1.4 Context System (src/context/)

Automatically collects and passes task context when switching providers.

#### Context Builder

```javascript
buildContext(session)
// Collects:
// ├─ task: current task description/goals/constraints
// ├─ files: 10 recent modified files + referenced files
// ├─ todos: categorized by pending/in-progress/complete
// ├─ decisions: recent decisions + learnings
// └─ meta: session ID, time, usage, build time
```

#### Handoff File Generation

```markdown
# Task Handoff Context

> Switched from Claude Code to OpenCode
> Generated: 2026-01-23T21:00:00+09:00

## Session Info
| Item | Value |
|------|-------|
| Project Path | `/opt/my-project` |
| Usage | 5-hour: 92%, Weekly: 67% |

## Current Task
Implementing Login Feature

## Pending TODOs
- [ ] Password Validation Logic
- [ ] Session Timeout Handling

## Recently Modified Files
src/auth/login.ts
src/session/manager.ts
```

**Save Path**: `.omcm/handoff/context.md`

### 1.5 Tracking System (src/tracking/)

Tracks real-time usage, routing, and performance metrics.

#### RealtimeTracker (RingBuffer-based)

```javascript
// Memory-efficient circular buffer (maintains only N events max)
tracker.recordEvent({
  type: 'routing',
  timestamp: Date.now(),
  agent: 'architect',
  provider: 'opencode',
  responseTime: 245   // ms
});

// Keep only 100 recent events in memory
tracker.getRecent(10)  // Return 10 most recent
```

#### MetricsCollector (Time-based Aggregation)

```
Per Minute:
├─ routing.total: 50
├─ routing.byProvider: { claude: 30, openai: 15, gemini: 5 }
└─ routing.byAgent: { architect: 10, executor: 20, ... }

Per Hour:
└─ [Same structure] × 60 minutes

Per Day:
└─ [Same structure] × 24 hours

Performance:
├─ totalDuration: 12500 (ms)
├─ count: 50
├─ successes: 48
├─ failures: 2
└─ cache.hits: 35
```

---

## 2. Data Flow

### 2.1 From Request to Execution

```
1. User Request (prompt input)
   │
   ├─ Detect /hulw, /ulw, autopilot keywords
   ├─ Activate fusion mode
   │
2. Execute Fusion Router Logic
   │
   ├─ Read FUSION_STATE_FILE
   ├─ Read FALLBACK_STATE_FILE
   ├─ Read PROVIDER_LIMITS_FILE (Claude usage)
   ├─ Read CONFIG_FILE (user settings)
   │
3. Routing Decision
   │
   ├─ Call shouldRouteToOpenCode()
   │  ├─ Fallback active? → Force OpenCode
   │  ├─ Claude limit ≥ 90%? → Route to OpenCode
   │  ├─ save-tokens mode? → Route token-saving agents
   │  └─ Default → Retain Claude
   │
4. Decision Logging
   │
   └─ Record in ROUTING_LOG_FILE (JSON Lines format)
      {
        "timestamp": "2026-01-28T...",
        "toolName": "oh-my-claudecode:architect",
        "subagentType": "architect-medium",
        "decision": "route",
        "reason": "claude-limit-92%",
        "target": "opencode"
      }

5. Task Execution
   │
   ├─ route === true
   │  └─ Delegate to OpenCode worker
   │     ├─ Initialize Server Pool (if needed)
   │     ├─ Select idle server from ports 4096-4100
   │     └─ Execute prompt
   │
   └─ route === false
      └─ Execute directly on Claude
```

### 2.2 Parallel Execution Flow

```
ParallelExecutor.executeParallel([T1, T2, T3, T4, T5])
│
├─ File Conflict Check
│  ├─ T1, T2 conflict → Sequential execution group
│  ├─ T3, T4 independent → Parallelizable
│  └─ T5 independent → Parallelizable
│
├─ Dependency-Based Grouping
│  ├─ [T1, T2] group (Sequential)
│  ├─ [T3, T4, T5] group (Parallelizable)
│
├─ Worker Pool Initialization
│  └─ OpenCodeServerPool.initialize() (maxWorkers=3)
│
├─ Group 1: Sequential Execution
│  ├─ Execute T1 (wait for completion)
│  └─ Execute T2 (after T1)
│
├─ Group 2: Parallel Execution
│  ├─ W1: Execute T3
│  ├─ W2: Execute T4
│  └─ W3: Execute T5
│     (all concurrent)
│
└─ Merge Results and Return
```

### 2.3 Fallback System Flow

```
Claude Limit Check (5-hour/weekly usage)
│
├─ < 70% → Normal mode (Claude priority)
├─ 70~90% → Warning (suggest save-tokens mode)
│  └─ No auto-switch (requires user confirmation)
│
└─ ≥ 90% → Activate fallback
   │
   ├─ Set fallbackActive = true
   ├─ Set currentModel = GPT-5.2-Codex
   │
   └─ All subsequent requests
      └─ shouldRouteToOpenCode() → Force OpenCode
```

---

## 3. Provider Balancing

### 3.1 Balancer Strategies (src/router/balancer.mjs)

Dynamically distributes providers using 4 selection strategies.

#### Strategy Comparison

| Strategy | Pros | Cons | Use Case |
|----------|------|------|----------|
| **round-robin** | Fair Distribution | Ignores Performance | Default |
| **weighted** | Priority-Aware | Static Weights | Claude:3, OpenAI:2, Gemini:2 |
| **latency** | Response Speed Priority | Tracking Overhead | Real-time Tasks |
| **usage** | Load Balancing | Requires Initialization | Token-Saving Mode |

#### Round-Robin Implementation

```javascript
providers = ['claude', 'openai', 'gemini']
index = 0

Request 1 → index = (0+1) % 3 = 1 → select openai
Request 2 → index = (1+1) % 3 = 2 → select gemini
Request 3 → index = (2+1) % 3 = 0 → select claude
```

#### Weighted Selection (Probabilistic)

```javascript
weights = {
  claude: 3,   // 60% probability
  openai: 2,   // 40% probability
  gemini: 1    // 20% probability
}

Total Weight = 6

Request:
rand = 0.5 × 6 = 3
├─ claude weight 3: 3 > 3 → pass, rand -= 3 → 0
└─ 0 ≤ 0 → select claude (50% probability)
```

#### Latency-Based Selection (Exponential Moving Average)

```javascript
// Apply weight to new sample as it arrives
EMA_ALPHA = 0.3  // 30% weight to recent data

New Measurement = 200ms
Previous EMA = 150ms

New EMA = 0.3 × 200 + 0.7 × 150
        = 60 + 105
        = 165ms  // Smoother transition
```

### 3.2 ProviderBalancer Class

```javascript
const balancer = new ProviderBalancer({
  providers: {
    claude: { weight: 3, priority: 1, enabled: true },
    openai: { weight: 2, priority: 2, enabled: true },
    gemini: { weight: 2, priority: 2, enabled: true }
  },
  defaultStrategy: 'weighted'
});

// Selection
const result = balancer.selectProvider('latency', {
  taskType: 'analysis',
  agentType: 'architect',
  excludeProviders: ['claude']  // Exclude Claude
});
// → { provider: 'openai', reason: 'Latency-based...' }

// Record performance
balancer.recordLatency('openai', 245);    // 245ms
balancer.recordUsage('gemini', 1500);     // 1500 tokens
balancer.recordError('gemini');           // Error count

// Query statistics
const stats = balancer.getStats();
// {
//   providers: {
//     openai: { latencyAvg: 245.2, usageTokens: 5000, ... },
//     gemini: { errorRate: 2.5, ... }
//   },
//   summary: { ... }
// }
```

---

## 4. Integration with OMC

### 4.1 Hook System (src/hooks/)

Automatically integrates through Claude Code's hook system.

#### hooks.json Definitions

```json
{
  "hooks": [
    {
      "id": "fusion-router-hook",
      "event": "tool:before",
      "handler": "src/hooks/fusion-router-logic.mjs",
      "priority": 1,
      "description": "Execute before routing decision"
    },
    {
      "id": "detect-handoff",
      "event": "message:after",
      "handler": "src/hooks/detect-handoff.mjs",
      "description": "Detect keywords/thresholds"
    }
  ]
}
```

#### Hook Execution Order

```
User Request → tool:before (fusion-router-hook)
              ├─ Execute Fusion Router Logic
              ├─ shouldRouteToOpenCode() decision
              └─ Return routing decision
           → Execute on Claude or OpenCode
           → message:after (detect-handoff)
              └─ Keyword/Threshold check
```

### 4.2 OMC Agent Delegation Structure

```
Claude Opus 4.5 (Main Orchestrator)
│
├─ Agent invocation
│  └─ Task(subagent_type='oh-my-claudecode:architect')
│     │
│     └─ Execute fusion-router-hook
│        ├─ Call shouldRouteToOpenCode()
│        │  ├─ Routing decision
│        │  └─ Logging
│        │
│        └─ Routing result
│           ├─ route=true → Delegate to OpenCode
│           │  └─ executeOpenCode(...)
│           └─ route=false → Retain Claude
│              └─ Direct OMC agent call
```

### 4.3 HUD Integration (src/hud/)

Displays fusion status in oh-my-claudecode HUD.

#### HUD Display Format

```
C:1.2k↓ 567↑|O:25.8k↓ 9↑|G:165.3k↓ 1.4k↑
└─────────────────────────────────────────
  C: Claude      O: OpenAI      G: Gemini
  ↓: Input       ↑: Output      k: ×1000
```

#### Data Collection

```
FUSION_STATE_FILE (updated every 5 seconds)
├─ routedToOpenCode: count of previous requests routed to OpenCode
├─ byProvider: { gemini: 15, openai: 8, anthropic: 25 }
└─ estimatedSavedTokens: 18000

Metric calculation:
- Gemini: Flash usage count in recent requests × average tokens
- OpenAI: Codex usage count in recent requests × average tokens
- Claude: Remainder
```

---

## 5. Configuration

### 5.1 Configuration File Location

```
~/.claude/plugins/omcm/config.json
```

### 5.2 Configuration Options

```json
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false,
  "keywords": ["opencode", "handoff", "전환"],

  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 3,
    "preferOpencode": ["explore", "researcher", "writer"],
    "preferClaude": ["architect", "executor-high", "planner"],
    "autoDelegate": true
  },

  "context": {
    "includeRecentFiles": true,
    "recentFilesLimit": 10,
    "includeTodos": true,
    "includeDecisions": true,
    "maxContextLength": 50000
  },

  "opencode": {
    "command": "opencode",
    "args": [],
    "ultraworkByDefault": true,
    "timeout": 300000
  },

  "notifications": {
    "showOnThreshold": true,
    "showOnKeyword": true,
    "quietMode": false
  }
}
```

### 5.3 State Files

```
~/.omcm/
├─ fusion-state.json          # Fusion routing statistics
├─ fallback-state.json        # Fallback activation state
├─ provider-limits.json       # Provider limit information
├─ routing-log.jsonl          # Routing decision log
└─ handoff/
   └─ context.md              # Handoff context
```

---

## 6. Execution Strategies

### 6.1 ExecutionStrategy (src/orchestrator/execution-strategy.mjs)

Selects optimal execution strategy by task type.

#### Strategy Selection Logic

```
Task analysis
  ├─ type = 'run' (general execution)
  │  ├─ <30 seconds → 'run' (direct CLI execution)
  │  └─ ≥30 seconds → 'serve' (server pool)
  │
  ├─ type = 'serve' (requires server)
  │  ├─ serverRunning? → 'serve'
  │  └─ !serverRunning? → 'run' (fallback)
  │
  └─ type = 'acp' (ACP protocol)
     ├─ acpAvailable? → 'acp'
     └─ !acpAvailable? → 'serve' (fallback)
```

#### Strategy Characteristics

| Strategy | Protocol | Overhead | Use Case | Advantage |
|----------|----------|----------|----------|-----------|
| **run** | CLI | ~10-15s | Single tasks | Simple implementation |
| **serve** | HTTP | ~1-2s | Parallel tasks | Fast response |
| **acp** | ACP | <100ms | Real-time interaction | Very fast |

### 6.2 TaskRouter (src/orchestrator/task-router.mjs)

Routes tasks to Claude or OpenCode based on task characteristics.

```javascript
routeTask(type)
// Input: task type (e.g., 'analyzer', 'executor', 'explorer')
// Output: {
//   target: 'claude' | 'opencode',
//   agent: 'agent name',
//   strategy: 'run' | 'serve' | 'acp'
// }
```

---

## 7. File Structure

```
oh-my-claude-money/
├── .claude-plugin/
│   ├── marketplace.json          # Marketplace metadata
│   └── plugin.json               # Plugin definition
│
├── src/
│   ├── context/                  # v1.0.0 Context transfer system
│   │   ├── context-builder.mjs       # Context building
│   │   ├── context-serializer.mjs    # JSON serialization
│   │   ├── context-sync.mjs          # Synchronization
│   │   └── index.mjs                 # Module exports
│   │
│   ├── tracking/                 # v1.0.0 Real-time tracking system
│   │   ├── realtime-tracker.mjs      # RingBuffer-based tracking
│   │   ├── metrics-collector.mjs     # Metric aggregation
│   │   └── index.mjs                 # Module exports
│   │
│   ├── router/                   # Routing engine
│   │   ├── balancer.mjs              # v1.0.0 Provider balancing
│   │   ├── mapping.mjs               # Dynamic agent mapping
│   │   ├── cache.mjs                 # LRU cache
│   │   └── rules.mjs                 # Rules engine
│   │
│   ├── orchestrator/              # Orchestration
│   │   ├── parallel-executor.mjs      # v1.0.0 Parallel executor
│   │   ├── execution-strategy.mjs     # v1.0.0 Execution strategy
│   │   ├── task-router.mjs            # Task routing
│   │   ├── agent-fusion-map.mjs       # Agent mapping
│   │   ├── fallback-orchestrator.mjs  # Fallback orchestrator
│   │   └── hybrid-ultrawork.mjs       # Hybrid ultrawork
│   │
│   ├── executor/                  # Executors
│   │   ├── opencode-executor.mjs      # OpenCode CLI wrapper
│   │   ├── opencode-server-pool.mjs   # v1.0.0 Server pool
│   │   └── acp-client.mjs             # ACP client
│   │
│   ├── hooks/                     # Claude Code hooks
│   │   ├── fusion-router-logic.mjs    # Routing logic
│   │   ├── detect-handoff.mjs         # Keyword detection
│   │   └── session-start.mjs          # Session initialization
│   │
│   ├── hud/                       # HUD rendering
│   │   ├── fusion-renderer.mjs        # Fusion state render
│   │   ├── omcm-hud.mjs               # HUD main
│   │   └── claude-usage-api.mjs       # Usage collection
│   │
│   └── utils/
│       ├── config.mjs                 # Config loader
│       ├── context.mjs                # Context utilities
│       ├── fusion-tracker.mjs         # Fusion state tracking
│       ├── handoff-context.mjs        # Handoff generation
│       ├── provider-limits.mjs        # Limit management
│       └── usage.mjs                  # Usage calculation
│
├── hooks/
│   ├── fusion-router.mjs             # Hook entry point
│   └── hooks.json                     # Hook definitions
│
├── commands/
│   ├── fusion-setup.md                # Initial setup
│   ├── fusion-default-on.md           # Enable fusion
│   ├── fusion-default-off.md          # Disable fusion
│   └── cancel-autopilot.md            # Cancel
│
├── skills/
│   ├── autopilot.md                   # Auto execution
│   ├── hulw.md                        # Hybrid ultrawork
│   ├── ulw.md                         # Auto fusion
│   └── opencode.md                    # OpenCode switch
│
├── scripts/
│   ├── opencode-server.sh             # Server management
│   ├── export-context.sh              # Context export
│   ├── handoff-to-opencode.sh         # Switch script
│   └── install.sh                     # Installation script
│
├── docs/
│   ├── ARCHITECTURE.md                # This file
│   ├── API.md                         # API reference
│   └── EXAMPLES.md                    # Examples
│
├── tests/                             # Test suite (361 tests)
│   ├── tracking/
│   ├── context/
│   ├── router/
│   ├── orchestrator/
│   └── ...
│
├── package.json
├── README.md
└── CHANGELOG.md
```

---

## 8. Performance Considerations

### 8.1 Minimize Cold Boot

```
CLI Mode (no server):
Request → start opencode process → initialize → execute → terminate
       └────────────────── ~10-15 seconds ──────────────┘

Server Pool Mode:
Server start (pre-started): ~5 seconds
Request 1: HTTP call → execute → response (~1 second)
Request 2: HTTP call → execute → response (~1 second)
Request 3: HTTP call → execute → response (~1 second)
       └─────────────── 90% reduction ──────────┘
```

### 8.2 Memory Efficiency

```
RingBuffer (max 1000 events):
Memory usage = ~100KB (1000 × 100 bytes/event)

Server Pool (5 servers):
Memory usage ≈ 250-300MB × 5 = 1.5GB

Total OMCM (including state files):
Memory usage ≈ 2GB (Recommended: 4GB+)
```

### 8.3 Network Optimization

```
Bandwidth for parallel execution:
- 5 concurrent requests × average 50KB/request = 250KB download
- Worst case: ~2 second overhead in 1Mbps environment

RingBuffer queries:
- Memory access (O(1)) vs no file I/O
- Recent 100 events: <1ms
```

### 8.4 CPU Optimization

```
Balancer selection (per call):
- round-robin: O(1)
- weighted: O(n) (n=number of providers)
- latency: O(n)
- usage: O(n)

Caching:
- Same agent: cache hit → O(1)
- New agent: routing calculation → O(n)
```

---

## 9. Error Handling

### 9.1 Routing Decision Failure

```javascript
// Fallback mechanism
shouldRouteToOpenCode() → error → JSON parsing failure
  └─ Default: route=false (retain Claude)
```

### 9.2 Server Pool Failure

```javascript
// Server start failure
_startServer() → error → timeoutMet(30 seconds)
  └─ Fallback: switch to CLI mode (run strategy)
```

### 9.3 Provider Error

```javascript
recordError('openai')
errorCount++

On getStats():
errorRate = (errorCount / requestCount) × 100

High error rate → balancer weights auto-decrease (optional)
```

---

## 10. Testing Strategy

### 10.1 Test Coverage (361 tests)

```
tracking/       32 tests    → RingBuffer, TimeBucket, metrics
context/        26 tests    → Context building, serialization
router/         49 tests    → Routing decisions, cache, rules
orchestrator/   19 tests    → Parallel execution, conflict detection
executor/       new         → Server pool, CLI wrapper
utils/          new         → Config, context utilities
```

### 10.2 Test Execution

```bash
npm test                    # Run all tests
npm test -- --grep "router"  # Router tests only
npm test -- --grep "parallel" # Parallel execution tests only
```

---

## 11. Future Enhancements

- [ ] Distributed tracing
- [ ] ML-based dynamic weight adjustment
- [ ] More provider support (Claude.ai, etc.)
- [ ] WebSocket-based real-time HUD updates
- [ ] Prometheus metrics export
- [ ] Advanced dependency graph (DAG) optimization

---

## Document Information

**Version**: v1.0.0
**Created**: 2026-01-28
**Target Audience**: OMCM developers and maintainers
**Language**: English
