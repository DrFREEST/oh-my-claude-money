# OMCM v2.1.5 Features Guide

> **Version Baseline (OMC 4.2.15):** This document uses `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, and `gemini-3-pro` as defaults. Legacy aliases such as `researcher`, `tdd-guide`, and `*-low`/`*-medium` appear only for backward compatibility.

Complete technical reference for all OMCM (oh-my-claude-money) v2.1.5 features with API documentation and usage examples.

## Table of Contents

1. [Fusion Mode](#fusion-mode)
2. [CLI Execution](#cli-execution)
3. [Realtime Tracking System](#realtime-tracking-system)
4. [Context Transfer System](#context-transfer-system)
5. [Multi-Provider Balancing](#multi-provider-balancing)
6. [Parallel Executor](#parallel-executor)

---

## Fusion Mode

Fusion Mode intelligently routes work between Claude (OMC) and external providers (GPT, Gemini) to optimize token usage while maintaining quality.

### Overview

**Key Benefits:**
- 62% Claude token savings by offloading 18 agents to GPT/Gemini
- Automatic provider switching based on usage thresholds
- Zero-configuration activation via `hulw` and `ulw` keywords
- Three activation modes for different use cases

### Agent-Provider Mapping (v2.1.5)

All 32 OMC agents are intelligently mapped to optimal providers:

| Tier | Count | Original Model | Fusion Model | Token Savings |
|------|-------|---|---|---|
| **HIGH** | 11 | Claude Opus 4.6 | Claude Opus 4.6 | - |
| **MEDIUM** | 10 | Claude Sonnet | GPT-5.3-Codex (with thinking) | 40% |
| **LOW** | 8 | Claude Haiku | Gemini 3 Flash (with thinking) | 70% |

**Key agents by tier:**

HIGH (Claude Opus - Retained, 11 agents):
- `architect`, `planner`, `critic`, `analyst`
- `executor-high`, `explore-high`, `designer-high`
- `qa-tester-high`, `security-reviewer`, `code-reviewer`
- `scientist-high`

MEDIUM → GPT-5.3-Codex (10 agents):
- `architect-medium`, `executor`, `explore-medium`
- `researcher`, `designer`, `vision`
- `qa-tester`, `build-fixer`, `tdd-guide`
- `scientist`

LOW → Gemini 3 Flash (8+ agents):
- `architect-low`, `executor-low`, `explore`
- `writer`, `designer-low`, `researcher-low`
- `security-reviewer-low`, `build-fixer-low`
- `tdd-guide-low`, `code-reviewer-low`, `scientist-low`

### API Reference

#### 1. Hybrid Ultrawork (hulw)

**Always active fusion mode with maximum parallelism.**

```javascript
// Trigger methods (all equivalent)
/hulw <task description>
hulw: <task description>
<task description> hulw
<task description> with hulw
```

**Characteristics:**
- Always uses fusion routing (no usage threshold)
- Enables parallel execution of compatible subtasks
- Combines OMC + MCP(Codex/Gemini CLI) workers simultaneously
- Best for: Large refactoring, multi-component builds

**Usage Examples:**

```bash
# Example 1: Refactor entire project
/hulw Refactor authentication module with improved error handling

# Example 2: Build multi-component system
hulw: Create REST API with database migrations

# Example 3: Complex implementation
Let's implement a new dashboard hulw
```

**What happens internally:**
1. Detects `hulw` keyword
2. Enables `fusionRouter` with mode='always'
3. Dispatches tasks to parallel executor
4. Verifies Codex/Gemini CLI availability
5. Distributes work: Claude handles architecture, MCP CLI handles exploration

#### 2. Auto Fusion Ultrawork (ulw)

**Usage-based automatic fusion switching.**

```javascript
// Trigger methods (all equivalent)
/ulw <task description>
ulw: <task description>
<task description> ulw
<task description> with ultrawork
```

**Mode Switching Logic:**
- **< 70% usage:** Claude agents only (highest quality)
- **70-90% usage:** Hybrid mode (gradual MCP CLI increase)
- **> 90% usage:** MCP CLI-heavy (cost optimization)

**Usage Examples:**

```bash
# Will automatically switch based on current usage
/ulw Fix TypeScript errors

ulw: Debug memory leak

Let's optimize database queries with ulw
```

**Recovery Behavior:**
- When Claude drops below 85%: Automatic recovery to Claude-first
- Smooth transition: No disruption to active tasks

#### 3. Hybrid Autopilot

**Full autonomous execution with optional fusion support.**

```javascript
// Basic autopilot (uses current fusion setting)
/autopilot <idea>
autopilot: <idea>

// Explicit fusion autopilot
/autopilot hulw <idea>
autopilot with fusion <idea>
```

**Behavior:**
- If `fusionDefault: true`: Uses fusion routing automatically
- If `fusionDefault: false`: Uses Claude-first, switches at 90%
- Includes planning, execution, verification cycles

**Usage Examples:**

```bash
# With fusion enabled (if fusionDefault: true)
/autopilot Build a todo application with authentication

# Explicit fusion
autopilot hulw Create a dashboard with real-time data

# Standard autopilot (Claude-first if fusionDefault: false)
/autopilot Implement user management
```

### Configuration

**Location:** `~/.claude/plugins/omcm/config.json`

```json
{
  "fusionDefault": false,
  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxMcpWorkers": 3,
    "preferMcp": ["explore", "researcher", "writer"],
    "preferClaude": ["architect", "executor-high", "critic"],
    "autoDelegate": true
  }
}
```

**Key Settings:**

| Setting | Type | Default | Description |
|---------|------|---------|---|
| `fusionDefault` | boolean | false | Enable fusion for all operations |
| `usageThreshold` | number | 70 | % at which hybrid mode activates (ulw only) |
| `maxMcpWorkers` | number | 3 | Max parallel CLI calls (1-10 recommended) |
| `preferMcp` | array | [...] | Agents always route to MCP CLI |
| `preferClaude` | array | [...] | Agents always route to Claude |
| `autoDelegate` | boolean | true | Auto-route based on task type |

---

## CLI Direct Execution

### Overview

CLI Direct Execution eliminates server pool overhead by executing Codex and Gemini CLIs directly.

**Performance:**

| Mode | Execution Time |
|------|---|
| **CLI Direct Execution** | ~2-5s (stateless) |

**Architecture:**
```
Request arrives
    ↓
CLI Executor (executeViaCLI)
    ↓
Detect available CLI
    ├─ Codex CLI → codex exec --json --full-auto
    └─ Gemini CLI → gemini -p=. --yolo
    ↓
Parse output (JSONL or text)
    ↓
Extract tokens and return
```

### API Reference

#### executeViaCLI Function

**Location:** `src/executor/cli-executor.mjs`

##### Function Signature

```javascript
import { executeViaCLI } from 'src/executor/cli-executor.mjs';

var result = await executeViaCLI({
  prompt: 'task instructions',
  provider: 'openai',     // or 'google'
  model: 'gpt-5.3-codex', // optional
  agent: 'oracle',        // for logging
  timeout: 300000,        // 5min default
  cwd: '/path/to/project'
});
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|---|
| `prompt` | string | required | Task instructions |
| `provider` | string | 'openai' | 'openai' or 'google' |
| `model` | string | auto | Model name (optional) |
| `agent` | string | 'default' | Agent name for logging |
| `timeout` | number | 300000 | Timeout in milliseconds |
| `cwd` | string | process.cwd() | Working directory |

##### Return Value

```javascript
// Returns:
{
  success: boolean,
  output: string,
  tokens: {
    input: number,
    output: number,
    reasoning: number,  // Codex only
    cacheRead: number   // Codex only
  },
  error: string,        // if failed
  duration: number,     // milliseconds
  provider: string      // 'openai' or 'google'
}
```

##### CLI Detection

```javascript
import { detectCLI } from 'src/executor/cli-executor.mjs';

// Check if CLI is available
var hasCodex = detectCLI('codex');   // boolean
var hasGemini = detectCLI('gemini'); // boolean

// Auto-fallback: If Gemini CLI not installed, uses Codex
```

### CLI Execution Flow

**Codex CLI (OpenAI):**
```javascript
// Command: codex exec -m gpt-5.3-codex --json --full-auto
// Output: JSONL format with token counts
// Parsing: Extract tokens from JSON lines
```

**Gemini CLI (Google):**
```javascript
// Command: gemini -p=. --yolo
// Output: Raw text
// Parsing: Infer token usage from text length
// Fallback: Uses Codex if not installed
```

### Usage Example

```javascript
// Example: Parallel task execution with CLI

import { executeViaCLI } from 'src/executor/cli-executor.mjs';

async function parallelProcessing() {
  var tasks = [];

  // Submit 10 parallel tasks
  for (var i = 0; i < 10; i++) {
    tasks.push(
      executeViaCLI({
        prompt: `Analyze file ${i}.ts`,
        provider: 'openai',
        agent: 'oracle'
      })
    );
  }

  var results = await Promise.all(tasks);

  var successCount = results.filter(r => r.success).length;
  console.log(`Completed ${successCount}/${results.length} tasks`);

  var totalTokens = results.reduce((sum, r) => sum + r.tokens.input + r.tokens.output, 0);
  console.log(`Total tokens: ${totalTokens}`);
}
```

---

## Realtime Tracking System

### Overview

Track routing decisions, performance metrics, and provider usage in real-time with event aggregation by time periods (minute/hour/day).

**Components:**
- **RealtimeTracker**: In-memory ring buffer for event streaming
- **MetricsCollector**: Aggregate statistics and cost calculation
- **TimeBucket**: Time-windowed aggregation

### API Reference

#### RealtimeTracker Class

**Location:** `src/tracking/realtime-tracker.mjs`

##### Constructor

```javascript
import { RealtimeTracker } from 'src/tracking/index.mjs';

const tracker = new RealtimeTracker({
  capacity: 10000,        // Ring buffer size
  emitInterval: 60000     // Stats emission (ms)
});
```

##### Event Tracking

**Record routing event:**
```javascript
tracker.recordRouting({
  provider: 'openai',     // 'claude' | 'openai' | 'gemini'
  agent: 'explorer',
  duration: 1250,         // ms
  success: true,
  cacheHit: false,
  tokenCount: { input: 150, output: 280 }
});
```

**Get recent events:**
```javascript
const recent = tracker.getRecentEvents(100);
// Returns: Array of last 100 events in chronological order
```

**Subscribe to stats:**
```javascript
tracker.on('stats', (stats) => {
  console.log(`Hour stats:`, stats);
  // {
  //   period: 'hour',
  //   routing: { total: 245, byProvider: {...}, byAgent: {...} },
  //   performance: { avgLatency: 1420, successRate: 0.98 },
  //   cache: { hitRate: 0.34 }
  // }
});
```

#### MetricsCollector Class

**Location:** `src/tracking/metrics-collector.mjs`

```javascript
import { MetricsCollector } from 'src/tracking/index.mjs';

const collector = new MetricsCollector();

// Record routing decision
collector.recordRouting({
  provider: 'gemini',
  agent: 'writer',
  duration: 890
});

// Get aggregated metrics
const metrics = collector.getMetrics('hour');
// Returns: {
//   routingCounts: { claude: 10, openai: 8, gemini: 5 },
//   avgLatencies: { claude: 1200, openai: 980, gemini: 750 },
//   costs: { claude: 0.42, openai: 0.28, gemini: 0.12 },
//   totalCost: 0.82
// }

// Get provider-specific stats
const providerStats = collector.getProviderStats('openai');
// Returns: {
//   requestCount: 23,
//   errorCount: 1,
//   avgLatency: 980,
//   totalTokens: 45600,
//   estimatedCost: 0.28
// }
```

### Usage Example

```javascript
// Example: Real-time monitoring dashboard

import { RealtimeTracker, MetricsCollector } from 'src/tracking/index.mjs';

const tracker = new RealtimeTracker({ capacity: 5000 });
const collector = new MetricsCollector();

// Start tracking
tracker.on('stats', (stats) => {
  const metrics = collector.getMetrics('hour');

  console.log('=== Realtime Stats ===');
  console.log(`Total routing: ${metrics.routingCounts.total}`);
  console.log(`Success rate: ${(stats.performance.successRate * 100).toFixed(1)}%`);
  console.log(`Cache hit rate: ${(stats.cache.hitRate * 100).toFixed(1)}%`);
  console.log(`Cost: $${metrics.totalCost.toFixed(2)}`);
});

// Simulate requests
setInterval(() => {
  const providers = ['claude', 'openai', 'gemini'];
  const agents = ['explorer', 'executor', 'architect'];

  const provider = providers[Math.floor(Math.random() * 3)];
  const agent = agents[Math.floor(Math.random() * 3)];
  const duration = 500 + Math.random() * 2000;

  tracker.recordRouting({
    provider,
    agent,
    duration,
    success: Math.random() > 0.05,
    cacheHit: Math.random() > 0.7
  });

  collector.recordRouting({ provider, agent, duration });
}, 100);
```

---

## Context Transfer System

### Overview

Automatically captures session state and enables seamless handoffs between Claude Code and MCP(Codex/Gemini CLI) providers.

**Captured Context:**
- Current task description
- Recent modified files
- Pending TODO items
- Session decisions and learnings
- Claude usage metrics

### API Reference

#### buildContext()

**Location:** `src/context/context-builder.mjs`

```javascript
import { buildContext } from 'src/context/index.mjs';

const context = buildContext({
  sessionId: 'session-abc123',
  projectPath: '/project',
  startTime: new Date().toISOString(),
  claudeUsage: { fiveHourUsage: 75, weeklyUsage: 45 },
  task: {
    description: 'Implement user authentication',
    goal: 'Add login and signup pages',
    constraints: ['Use JWT', 'SQLite DB']
  }
});

// Returns structured context object
// {
//   task: { description, goal, constraints },
//   files: { modified: [...], referenced: [...] },
//   todos: { pending: [...], inProgress: [...], completed: [...] },
//   decisions: { recent: [...], learnings: [...] },
//   meta: { sessionId, startTime, buildTime, claudeUsage }
// }
```

#### ContextSerializer

**Location:** `src/context/context-serializer.mjs`

```javascript
import { serializeContextToMarkdown, serializeContextToJSON } from 'src/context/index.mjs';

// Convert to markdown for human readability
const markdown = serializeContextToMarkdown(context);
// Generates: # Task Handoff Context
//            ## Session Information
//            ## Current Task
//            ...

// Convert to JSON for programmatic use
const json = serializeContextToJSON(context);
```

#### ContextSynchronizer

**Location:** `src/context/context-sync.mjs`

```javascript
import { ContextSynchronizer } from 'src/context/index.mjs';

const sync = new ContextSynchronizer({
  localPath: '/project/.omcm',
  remotePath: 'mcp://context'
});

// Push context to MCP CLI
await sync.pushContext(context);

// Pull updates from MCP CLI
const updated = await sync.pullContext();

// Subscribe to changes
sync.on('contextChanged', (newContext) => {
  console.log('Context updated:', newContext);
});
```

### Handoff File Format

**Location:** `.omcm/handoff/context.md`

```markdown
# Task Handoff Context

> Switched from Claude Code to MCP CLI (Codex/Gemini)
> Generated: 2026-01-28T15:30:00+09:00

---

## Session Information
| Item | Value |
|------|-----|
| Project Path | `/opt/my-project` |
| Timestamp | 2026-01-28T15:30:00+09:00 |
| Usage | 5-hour: 87%, Weekly: 45% |

## Current Task
Implementing login functionality

## Pending TODOs
- [ ] Add password validation logic
- [ ] Implement session management

## Recently Modified Files
- src/auth/login.ts
- src/auth/signup.ts
- src/middleware/auth.ts

## Decisions
1. JWT token-based authentication selected
2. Using Redis for session management

## Session Learnings
- Password hashing with bcrypt
- CORS configuration required
```

### Usage Example

```javascript
// Example: Automatic context capture before handoff

import { buildContext, serializeContextToMarkdown } from 'src/context/index.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function handoffToMcp() {
  // Build current context
  const context = buildContext({
    sessionId: crypto.randomUUID(),
    projectPath: process.cwd(),
    task: {
      description: 'Refactor authentication module'
    }
  });

  // Serialize to markdown
  const markdown = serializeContextToMarkdown(context);

  // Save handoff file
  const handoffDir = join(process.cwd(), '.omcm', 'handoff');
  mkdirSync(handoffDir, { recursive: true });
  writeFileSync(
    join(handoffDir, 'context.md'),
    markdown,
    'utf-8'
  );

  console.log('Context saved to .omcm/handoff/context.md');
  console.log('Ready for MCP CLI handoff');
}
```

---

## Multi-Provider Balancing

### Overview

Intelligent load distribution across Claude, GPT, and Gemini using 4 configurable strategies.

**Strategies:**
- **Round-Robin**: Fair distribution (good for even workloads)
- **Weighted**: Priority-based (claude:3, openai:2, gemini:2)
- **Latency**: Response time-based (use fastest provider)
- **Usage**: Cost/token-based (distribute by available capacity)

### API Reference

#### ProviderBalancer Class

**Location:** `src/router/balancer.mjs`

##### Constructor

```javascript
import { ProviderBalancer } from 'src/router/balancer.mjs';

const balancer = new ProviderBalancer({
  strategy: 'weighted',  // 'round-robin' | 'weighted' | 'latency' | 'usage'
  providers: {
    claude: { weight: 3, priority: 1, enabled: true },
    openai: { weight: 2, priority: 2, enabled: true },
    gemini: { weight: 2, priority: 2, enabled: true }
  }
});
```

**Default Configuration:**
```javascript
{
  claude:  { weight: 3, priority: 1 },  // Highest priority
  openai:  { weight: 2, priority: 2 },
  gemini:  { weight: 2, priority: 2 }
}
```

##### Balancing Methods

**Round-Robin:**
```javascript
// Sequential cycling through providers
const provider = balancer.selectRoundRobin(['claude', 'openai', 'gemini']);
// Returns: 'claude', then 'openai', then 'gemini', then 'claude'...
```

**Weighted:**
```javascript
// Probabilistic selection by weight
// Weight distribution: claude (3), openai (2), gemini (2)
// Probability: claude 42.8%, openai 28.6%, gemini 28.6%

const provider = balancer.selectWeighted(['claude', 'openai', 'gemini']);
// Returns: 'claude' with 42.8% probability
```

**Latency-based:**
```javascript
// Select provider with lowest average response time
balancer.recordLatency('claude', 1200);   // ms
balancer.recordLatency('openai', 980);
balancer.recordLatency('gemini', 750);

const provider = balancer.selectByLatency(['claude', 'openai', 'gemini']);
// Returns: 'gemini' (fastest)
```

**Usage-based:**
```javascript
// Select provider with lowest current token usage
balancer.updateTokenUsage('claude', 45000);
balancer.updateTokenUsage('openai', 12000);
balancer.updateTokenUsage('gemini', 8000);

const provider = balancer.selectByUsage(['claude', 'openai', 'gemini']);
// Returns: 'gemini' (lowest usage = most capacity)
```

#### Selection Context

```javascript
// Advanced: Context-aware selection
const context = {
  taskType: 'analysis',      // 'analysis' | 'execution' | 'creative'
  agentType: 'architect',
  tokenEstimate: 5000,
  excludeProviders: ['gemini']  // Skip gemini for this task
};

const provider = balancer.selectWithContext(context);
// Returns: 'claude' or 'openai' (gemini excluded)
```

### Configuration (agent-mapping.json)

**Location:** `~/.claude/plugins/omcm/agent-mapping.json`

```json
{
  "balancingStrategy": "weighted",
  "providers": {
    "claude": {
      "weight": 3,
      "priority": 1,
      "models": ["opus", "sonnet", "haiku"]
    },
    "openai": {
      "weight": 2,
      "priority": 2,
      "models": ["gpt-5.3", "gpt-5.3-codex"]
    },
    "gemini": {
      "weight": 2,
      "priority": 2,
      "models": ["gemini-3-pro", "gemini-3-flash"]
    }
  }
}
```

### Usage Example

```javascript
// Example: Smart provider selection

import { ProviderBalancer } from 'src/router/balancer.mjs';

const balancer = new ProviderBalancer({ strategy: 'latency' });

// Track performance over time
const requests = [
  { provider: 'claude', latency: 1200 },
  { provider: 'openai', latency: 950 },
  { provider: 'gemini', latency: 800 },
  { provider: 'claude', latency: 1100 },
  { provider: 'openai', latency: 920 }
];

requests.forEach(req => {
  balancer.recordLatency(req.provider, req.latency);
});

// Select fastest provider
const nextProvider = balancer.selectByLatency(
  ['claude', 'openai', 'gemini']
);
console.log(`Selected: ${nextProvider}`);  // 'gemini' or 'openai'

// Get balancer stats
const stats = balancer.getStats();
console.log(`Average latencies:`, stats.latencies);
```

---

## Parallel Executor

### Overview

Execute multiple tasks in parallel while respecting dependencies and file conflicts. Automatically routes tasks to optimal providers (Claude or MCP CLI).

**Features:**
- Parallel execution for independent tasks
- Dependency resolution and topological sorting
- File conflict detection and prevention
- Automatic provider routing per task
- Execution strategy selection (run/serve/acp)

### API Reference

#### ParallelExecutor Class

**Location:** `src/orchestrator/parallel-executor.mjs`

##### Task Definition

```javascript
// Single task structure
{
  id: 'task-1',
  description: 'Implement login controller',
  type: 'implementation',        // 'analysis' | 'implementation' | 'test' | 'review'
  files: [                       // Files this task will modify
    'src/auth/login.ts',
    'src/auth/login.test.ts'
  ],
  dependsOn: [],                 // Task IDs this depends on
  provider: 'auto',              // 'claude' | 'openai' | 'gemini' | 'auto'
  agent: 'executor',             // Agent type for routing
  timeout: 30000                 // ms
}
```

##### Parallel Execution

```javascript
import { ParallelExecutor, canRunInParallel } from 'src/orchestrator/parallel-executor.mjs';

const tasks = [
  {
    id: 'task-1',
    description: 'Implement user service',
    type: 'implementation',
    files: ['src/services/user.ts']
  },
  {
    id: 'task-2',
    description: 'Implement auth service',
    type: 'implementation',
    files: ['src/services/auth.ts']
  },
  {
    id: 'task-3',
    description: 'Write integration tests',
    type: 'test',
    files: ['src/__tests__/integration.test.ts'],
    dependsOn: ['task-1', 'task-2']  // Depends on both services
  }
];

// Check if parallel execution is possible
const check = canRunInParallel(tasks);
console.log(check);
// {
//   canParallel: false,
//   reason: 'Dependencies exist between tasks',
//   conflicts: []
// }

// Execute with proper ordering
const executor = new ParallelExecutor({
  maxConcurrent: 3,
  strategy: 'hybrid'  // 'parallel' | 'sequential' | 'hybrid'
});

const results = await executor.executeTasks(tasks);
// Task 1 and 2 run in parallel
// Task 3 waits for both to complete, then runs
```

##### File Conflict Detection

```javascript
// Detect conflicting tasks
const conflictingTasks = [
  {
    id: 'refactor-1',
    files: ['src/auth.ts']
  },
  {
    id: 'refactor-2',
    files: ['src/auth.ts']  // Same file!
  }
];

const check = canRunInParallel(conflictingTasks);
console.log(check);
// {
//   canParallel: false,
//   reason: 'File conflicts detected',
//   conflicts: [
//     { file: 'src/auth.ts', tasks: [0, 1] }
//   ]
// }
```

#### Execution Strategy

**Location:** `src/orchestrator/execution-strategy.mjs`

```javascript
import { selectStrategy, analyzeTask } from 'src/orchestrator/execution-strategy.mjs';

const task = {
  type: 'implementation',
  description: 'Add database schema migration',
  agent: 'executor'
};

// Analyze task to determine best execution approach
const analysis = analyzeTask(task);
// {
//   inferredType: 'implementation',
//   complexity: 'medium',
//   estimatedDuration: 8000
// }

// Select execution strategy
const strategy = selectStrategy(task);
console.log(strategy);
// {
//   mode: 'run',              // 'run' | 'serve' | 'acp'
//   parallelizable: true,
//   routeToMcp: false,
//   options: { ... }
// }
```

**Execution Modes:**

| Mode | Use Case | Provider | Speed |
|------|----------|----------|-------|
| `run` | One-off commands | Claude/MCP CLI | Fast |
| `serve` | Long-running services | MCP CLI | Slower start, persistent |
| `acp` | Agent-to-provider protocol | MCP CLI | Flexible, feature-rich |

### Usage Example

```javascript
// Example: Parallel project refactoring

import { ParallelExecutor } from 'src/orchestrator/parallel-executor.mjs';

async function refactorProject() {
  const tasks = [
    {
      id: 'refactor-auth',
      description: 'Refactor authentication module',
      files: ['src/auth/**/*.ts'],
      type: 'refactoring'
    },
    {
      id: 'refactor-api',
      description: 'Refactor API routes',
      files: ['src/api/**/*.ts'],
      type: 'refactoring'
    },
    {
      id: 'refactor-db',
      description: 'Refactor database layer',
      files: ['src/db/**/*.ts'],
      type: 'refactoring'
    },
    {
      id: 'run-tests',
      description: 'Run all tests',
      files: [],
      dependsOn: ['refactor-auth', 'refactor-api', 'refactor-db'],
      type: 'test'
    }
  ];

  const executor = new ParallelExecutor({
    maxConcurrent: 3,
    strategy: 'hybrid'
  });

  console.log('Starting parallel refactoring...');
  const results = await executor.executeTasks(tasks);

  let passCount = 0;
  results.forEach(result => {
    if (result.success) {
      passCount++;
      console.log(`✓ ${result.taskId}`);
    } else {
      console.log(`✗ ${result.taskId}: ${result.error}`);
    }
  });

  console.log(`\nCompleted: ${passCount}/${results.length} tasks`);
}
```

---

## Integration Example

### Full Workflow: Parallel Project Build with Fusion

```javascript
/**
 * Complete example: Build multi-component system using all OMCM features
 */

import { ParallelExecutor } from 'src/orchestrator/parallel-executor.mjs';
import { executeViaCLI, detectCLI } from 'src/executor/cli-executor.mjs';
import { buildContext } from 'src/context/index.mjs';
import { RealtimeTracker, MetricsCollector } from 'src/tracking/index.mjs';

async function buildComplexSystem() {
  // 1. Initialize tracking
  const tracker = new RealtimeTracker();
  const collector = new MetricsCollector();

  // 2. Verify CLI availability
  if (!detectCLI('codex') && !detectCLI('gemini')) {
    throw new Error('No CLI available - install codex or gemini');
  }

  // 3. Capture context for potential handoff
  const context = buildContext({
    projectPath: process.cwd(),
    task: {
      description: 'Build microservices platform',
      constraints: ['Docker', 'Kubernetes']
    }
  });

  // 4. Define parallel tasks
  const tasks = [
    {
      id: 'backend-api',
      description: 'Implement REST API',
      files: ['src/api/**'],
      type: 'implementation',
      agent: 'executor'
    },
    {
      id: 'frontend-ui',
      description: 'Build React dashboard',
      files: ['src/ui/**'],
      type: 'implementation',
      agent: 'designer'  // Will route to MCP (ask_gemini, Gemini)
    },
    {
      id: 'devops-docker',
      description: 'Setup Docker containers',
      files: ['docker/**', '.dockerignore'],
      type: 'implementation',
      agent: 'architect'  // High complexity → Claude
    },
    {
      id: 'tests',
      description: 'Write integration tests',
      files: ['src/__tests__/**'],
      type: 'test',
      dependsOn: ['backend-api', 'frontend-ui']
    }
  ];

  // 5. Execute with parallel executor
  const executor = new ParallelExecutor({
    maxConcurrent: 3,
    strategy: 'hybrid'
  });

  console.log('Building system...');
  const results = await executor.executeTasks(tasks);

  // 6. Collect metrics
  results.forEach(result => {
    tracker.recordRouting({
      provider: result.provider,
      agent: result.agent,
      duration: result.executionTime,
      success: result.success
    });

    collector.recordRouting({
      provider: result.provider,
      agent: result.agent,
      duration: result.executionTime
    });
  });

  // 7. Report results
  const metrics = collector.getMetrics('hour');
  console.log('=== Build Complete ===');
  console.log(`Tasks: ${results.filter(r => r.success).length}/${results.length} ✓`);
  console.log(`Cost: $${metrics.totalCost.toFixed(2)}`);
  console.log(`Avg Latency: ${metrics.avgLatencies}ms`);

  // 8. Cleanup (stateless, no shutdown needed)
}

// Run with fusion mode
buildComplexSystem().catch(console.error);
```

---

## Performance Benchmarks

### Token Savings

**Baseline:** Standard Claude-only operation

| Operation | Claude Only | With Fusion | Savings |
|-----------|---|---|---|
| Code exploration (10 files) | 450 tokens | 180 tokens | 60% |
| UI component review | 320 tokens | 95 tokens | 70% |
| Code refactoring (5 files) | 1200 tokens | 480 tokens | 60% |
| **Average across 100 tasks** | - | - | **62%** |

### Execution Speed

| Mode | Single Task | Parallel (4 tasks) |
|------|---|---|
| **CLI Direct Execution** | ~2-5s | ~5-8s (concurrent) |

**Parallel speedup:** Concurrent CLI calls enable true parallelism

---

## Version Compatibility

**v2.1.0 Features:**
- ✅ CLI Direct Execution (v2.1.0 new)
- ✅ Realtime Tracking (v2.1.5)
- ✅ Context Transfer (v2.1.5)
- ✅ Multi-Provider Balancing (v2.1.5)
- ✅ Parallel Executor (v2.1.5)
- ✅ Fusion Mode (v0.3.0+)
- ✅ Agent Mapping (v0.5.0+)
- ✅ Dynamic Routing (v0.8.0+)

**Breaking Changes:** None. v2.1.5 is fully backward compatible with v0.8.0.

**Migration:** No migration needed. Existing setups work unchanged.

### v2.1.3 Compatibility Update

**New Features:**
- **z.ai Provider Support**: When ANTHROPIC_BASE_URL points to a z.ai host, usage is retrieved via GLM API
- **Monthly Usage Display**: HUD shows monthly usage in `mo:XX%` format (OMC v4.2.15+)
- **provider-limits monthly field**: Added monthlyPercent as 3rd argument to updateClaudeLimits()

**Compatible Versions:**
- OMC v4.2.15 or higher (monthly usage display support)
- z.ai API provider support

---

## See Also

- [README.md](../../README.md) - Project overview and quick start
- [CHANGELOG.md](../../CHANGELOG.md) - Version history and release notes
- [Configuration Guide](./CONFIGURATION.md) - Detailed configuration options
- [API Reference](./API-REFERENCE.md) - Complete API documentation
