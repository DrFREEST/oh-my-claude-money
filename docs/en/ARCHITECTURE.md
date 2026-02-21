# OMCM (oh-my-claude-money) v2.1.5 Architecture

> **Version Baseline (OMC 4.2.15):** This document uses `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, and `gemini-3-pro` as defaults. Legacy aliases such as `researcher`, `tdd-guide`, and `*-low`/`*-medium` appear only for backward compatibility.

## Overview

OMCM is a Fusion Orchestrator that integrates Claude Code and OpenCode. A single Meta-Orchestrator (Claude Opus 4.6) analyzes tasks and routes them to either 32 OMC Agents or OpenCode's Multi-Provider Agents.

**Core Goals**: 62% Claude Token Saving + Parallel Processing Performance + Auto Fallback System

```
┌─────────────────────────────────────────────────────────────────────┐
│              Meta-Orchestrator (Claude Opus 4.6)                    │
│                     "Conductor Role"                                │
├─────────────────────────────────────────────────────────────────────┤
│                              ↓                                      │
│              ┌────────────────────────────┐                        │
│              │    Fusion Router Logic     │                        │
│              │ "Which LLM is optimal?"    │                        │
│              │ (1. Fallback 2. Limit 3. Mode) │                   │
│              └────────────────────────────┘                        │
│                    ↓              ↓                                 │
│     ┌──────────────────┐ ┌────────────────────────┐               │
│     │ oh-my-claudecode │ │  CLI Direct Execution  │               │
│     │ (Claude tokens)  │ │   (Other LLMs)         │               │
│     │                  │ │                        │               │
│     │ • planner        │ │ • Codex CLI (GPT)      │               │
│     │ • executor       │ │ • Gemini CLI (Google)  │               │
│     │ • critic         │ │ • Stateless execution  │               │
│     └──────────────────┘ └────────────────────────┘               │
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
    id: 'gpt-5.3-codex',
    name: 'GPT-5.3 Codex'
  },
  opencodeAgent: 'build'           // OpenCode mapped agent (build/explore/general/plan)
}
```

#### Agent Mapping (29 Routing Targets)

**HIGH Tier (Claude Opus -- retained, 11 agents):**
- architect, planner, critic, analyst, executor-high, explore-high
- designer-high, qa-tester-high, security-reviewer, code-reviewer, scientist-high

**MEDIUM Tier (OpenCode CODEX -- 10 agents):**

| OMC Agent | OpenCode Agent | Model |
|-----------|----------------|-------|
| architect-medium | build | GPT-5.3-Codex |
| executor | build | GPT-5.3-Codex |
| explore-medium | explore | GPT-5.3-Codex |
| designer, researcher, vision | build/general | GPT-5.3-Codex |
| qa-tester, build-fixer, tdd-guide, scientist | build | GPT-5.3-Codex |

**LOW Tier (OpenCode FLASH -- 8+ agents):**

| OMC Agent | OpenCode Agent | Model |
|-----------|----------------|-------|
| architect-low, executor-low | build | Gemini 3 Flash |
| explore | explore | Gemini 3 Flash |
| designer-low, researcher-low, writer | build/general | Gemini 3 Flash |
| security-reviewer-low, build-fixer-low, tdd-guide-low | build | Gemini 3 Flash |
| code-reviewer-low, scientist-low | build | Gemini 3 Flash |

### 1.2 CLI Execution Engine (src/executor/cli-executor.mjs)

Direct CLI execution eliminates server pool overhead and cold boot delays.

#### Direct Execution Architecture

```
Request arrives
    ↓
┌─────────────────────────────┐
│    CLI Executor              │
│  executeViaCLI()             │
├─────────────────────────────┤
│                              │
│  ┌────────────────────┐     │
│  │ Codex CLI          │     │
│  │ codex exec --json  │     │
│  │ --full-auto        │     │
│  └────────────────────┘     │
│           or                 │
│  ┌────────────────────┐     │
│  │ Gemini CLI         │     │
│  │ gemini --yolo      │     │
│  └────────────────────┘     │
│                              │
└──────────────────────────────┘
    ↓
  [Parse Output]
    ↓
  Return { success, output, tokens, duration }
```

#### Configuration Options

```javascript
var result = await executeViaCLI({
  prompt: 'task instructions',
  provider: 'openai',     // or 'google'
  model: 'gpt-5.3-codex', // optional
  agent: 'oracle',        // for logging
  timeout: 300000,        // 5min default
  cwd: '/path/to/project'
});
```

#### CLI Detection & Fallback

```javascript
// Auto-detect CLI availability
detectCLI('codex');   // boolean
detectCLI('gemini');  // boolean

// Auto-fallback: Gemini CLI not installed → use Codex
```

#### Token Extraction

- Codex CLI: Parses JSONL output with token counts
- Gemini CLI: Infers token usage from text length
- Unified response format with detailed token breakdown

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
   │  └─ Delegate to OpenCode CLI
   │     ├─ Detect available CLI (codex/gemini)
   │     ├─ Execute via executeViaCLI()
   │     └─ Parse output and extract tokens
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
├─ CLI Executor Setup
│  └─ Initialize CLI executor (maxWorkers=3)
│
├─ Group 1: Sequential Execution
│  ├─ Execute T1 via CLI (wait for completion)
│  └─ Execute T2 via CLI (after T1)
│
├─ Group 2: Parallel Execution
│  ├─ W1: Execute T3 via CLI
│  ├─ W2: Execute T4 via CLI
│  └─ W3: Execute T5 via CLI
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
   ├─ Set currentModel = GPT-5.3-Codex
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

#### hooks.json Definitions (7 hooks, 5 events)

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Task", "hooks": [{ "command": "hooks/fusion-router.mjs", "timeout": 120 }] },
      { "matcher": "Read", "hooks": [{ "command": "hooks/read-optimizer.mjs", "timeout": 5 }] },
      { "matcher": "Bash", "hooks": [{ "command": "hooks/bash-optimizer.mjs", "timeout": 5 }] }
    ],
    "PostToolUse": [
      { "matcher": "Read|Edit|Bash|Grep|Glob|Task", "hooks": [{ "command": "hooks/tool-tracker.mjs", "timeout": 5 }] }
    ],
    "UserPromptSubmit": [{ "hooks": [{ "command": "src/hooks/detect-handoff.mjs", "timeout": 5 }] }],
    "SessionStart": [{ "hooks": [{ "command": "src/hooks/session-start.mjs", "timeout": 3 }] }],
    "Stop": [{ "hooks": [{ "command": "src/hooks/persistent-mode.mjs", "timeout": 5 }] }]
  }
}
```

#### Hook Execution Order

```
User Prompt → UserPromptSubmit (detect-handoff)
                └─ Keyword/Threshold check

Tool Call → PreToolUse (fusion-router / read-optimizer / bash-optimizer)
              ├─ Task call: Execute Fusion Router Logic
              ├─ Read call: Optimize read patterns
              └─ Bash call: Optimize bash commands

Tool Done → PostToolUse (tool-tracker)
              └─ Record tool usage for analytics

Session Start → SessionStart (session-start)
                  └─ Load usage information

Stop → Stop (persistent-mode)
         └─ Save active mode state
```

### 4.2 OMC Agent Delegation Structure

```
Claude Opus 4.6 (Main Orchestrator)
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
  │  └─ Direct CLI execution (stateless)
  │
  ├─ type = 'serve' (deprecated)
  │  └─ Fallback to 'run' (CLI execution)
  │
  └─ type = 'acp' (ACP protocol)
     ├─ acpAvailable? → 'acp'
     └─ !acpAvailable? → 'run' (fallback)
```

#### Strategy Characteristics

| Strategy | Protocol | Overhead | Use Case | Advantage |
|----------|----------|----------|----------|-----------|
| **run** | CLI | ~2-5s | All tasks | Stateless, simple |
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
│   ├── context/                  # v2.1.5 Context transfer system
│   │   ├── context-builder.mjs       # Context building
│   │   ├── context-serializer.mjs    # JSON serialization
│   │   ├── context-sync.mjs          # Synchronization
│   │   └── index.mjs                 # Module exports
│   │
│   ├── tracking/                 # v2.1.5 Real-time tracking system
│   │   ├── realtime-tracker.mjs      # RingBuffer-based tracking
│   │   ├── metrics-collector.mjs     # Metric aggregation
│   │   └── index.mjs                 # Module exports
│   │
│   ├── router/                   # Routing engine
│   │   ├── balancer.mjs              # v2.1.5 Provider balancing
│   │   ├── mapping.mjs               # Dynamic agent mapping
│   │   ├── cache.mjs                 # LRU cache
│   │   └── rules.mjs                 # Rules engine
│   │
│   ├── orchestrator/              # Orchestration
│   │   ├── parallel-executor.mjs      # v2.1.5 Parallel executor
│   │   ├── execution-strategy.mjs     # v2.1.5 Execution strategy
│   │   ├── task-router.mjs            # Task routing
│   │   ├── agent-fusion-map.mjs       # Agent mapping
│   │   ├── fallback-orchestrator.mjs  # Fallback orchestrator
│   │   └── hybrid-ultrawork.mjs       # Hybrid ultrawork
│   │
│   ├── executor/                  # Executors
│   │   ├── opencode-executor.mjs      # OpenCode CLI wrapper
│   │   ├── cli-executor.mjs           # v2.1.0 CLI direct execution
│   │   └── acp-client.mjs             # ACP client
│   │
│   ├── hooks/                     # Claude Code hook handlers
│   │   ├── detect-handoff.mjs         # Keyword detection
│   │   ├── persistent-mode.mjs        # Mode persistence on Stop
│   │   ├── session-start.mjs          # Session initialization
│   │   └── token-savings.mjs          # Token savings calculation
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
│   ├── bash-optimizer.mjs             # PreToolUse: Bash optimization
│   ├── fusion-router.mjs             # PreToolUse: Fusion routing
│   ├── hooks.json                     # Hook definitions (7 hooks)
│   ├── read-optimizer.mjs             # PreToolUse: Read optimization
│   └── tool-tracker.mjs              # PostToolUse: Tool usage tracking
│
├── commands/
│   ├── fusion-setup.md                # Initial setup
│   ├── fusion-default-on.md           # Enable fusion
│   ├── fusion-default-off.md          # Disable fusion
│   └── cancel-autopilot.md            # Cancel
│
├── skills/
│   ├── autopilot/SKILL.md             # Hybrid autopilot
│   ├── cancel/SKILL.md                # Unified cancel
│   ├── hulw/SKILL.md                  # Hybrid ultrawork
│   ├── hybrid-ultrawork/SKILL.md      # Hybrid ultrawork (alias)
│   ├── opencode/SKILL.md              # OpenCode handoff
│   ├── ralph/SKILL.md                 # Persistent execution
│   └── ulw/SKILL.md                   # Auto fusion ultrawork
│
├── scripts/
│   ├── agent-mapping.json             # Agent mapping data
│   ├── export-context.sh              # Context export
│   ├── fusion-bridge.sh               # Fusion bridge
│   ├── fusion-setup.sh                # Fusion setup
│   ├── fusion.sh                      # Fusion operations
│   ├── handoff-to-opencode.sh         # Switch script
│   ├── install-hud.sh                 # HUD installation
│   ├── migrate-to-omcm.sh            # Migration script
│   └── uninstall-hud.sh              # HUD removal
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

### 8.1 CLI Direct Execution Performance

```
CLI Direct Execution (v2.1.0):
Request → codex exec --full-auto → parse JSONL → return
       └────────── stateless, no server overhead ─────────┘

Codex CLI: ~2-5 seconds (with thinking tokens)
Gemini CLI: ~1-3 seconds (fast response)
       └─────────────── Cold boot eliminated ──────────┘
```

### 8.2 Memory Efficiency

```
RingBuffer (max 1000 events):
Memory usage = ~100KB (1000 × 100 bytes/event)

CLI Direct Execution (stateless):
Memory usage ≈ per-call overhead only (~50MB during execution)

Total OMCM (including state files):
Memory usage ≈ 200MB (Recommended: 1GB+)
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

### 9.2 CLI Execution Failure

```javascript
// CLI detection failure
detectCLI('codex') → false, detectCLI('gemini') → false
  └─ Fallback: route to Claude (default fallback)
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

**Version**: v2.1.5
**Created**: 2026-01-28
**Target Audience**: OMCM developers and maintainers
**Language**: English
