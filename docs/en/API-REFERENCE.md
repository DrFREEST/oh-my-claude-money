# OMCM API Reference

Complete documentation of all public APIs and modules in OMCM (Oh My Claude Money).

**Table of Contents**
- [Usage Tracking](#usage-tracking)
- [Provider Balancing](#provider-balancing)
- [Context Management](#context-management)
- [Parallel Executor](#parallel-executor)
- [Task Routing](#task-routing)
- [OpenCode Worker](#opencode-worker)
- [OpenCode Server Pool](#opencode-server-pool)
- [ACP Client (Agent Client Protocol)](#acp-client-agent-client-protocol)
- [Realtime Tracker](#realtime-tracker)

---

## Usage Tracking

### Module Location
`src/utils/usage.mjs`

### Key Functions

#### `getUsageFromCache()`

Reads usage data from HUD cache.

```javascript
import { getUsageFromCache } from 'src/utils/usage.mjs';

const usage = getUsageFromCache();
// Returns:
// {
//   fiveHour: number,        // 5-hour usage (%)
//   weekly: number,          // Weekly usage (%)
//   fiveHourResetsAt: Date,  // 5-hour counter reset time
//   weeklyResetsAt: Date,    // Weekly counter reset time
//   timestamp: string,       // Last update timestamp
//   error: boolean           // Error occurred flag
// }
// or null (no cache)
```

#### `checkThreshold(threshold = 90)`

Checks if usage exceeds the specified threshold.

```javascript
import { checkThreshold } from 'src/utils/usage.mjs';

const result = checkThreshold(75);
// Returns:
// {
//   exceeded: boolean,  // Whether threshold is exceeded
//   type: string,       // 'fiveHour' | 'weekly' | null
//   percent: number     // Current maximum usage (%)
// }

// Usage example
if (checkThreshold(80).exceeded) {
  console.log('Usage warning!');
  // Delegate work to OpenCode
}
```

#### `getUsageLevel()`

Returns current usage status as a level.

```javascript
import { getUsageLevel } from 'src/utils/usage.mjs';

const level = getUsageLevel();
// Returns: 'critical' | 'warning' | 'normal' | 'unknown'

switch (getUsageLevel()) {
  case 'critical':
    // 80%+: Force OpenCode priority
    break;
  case 'warning':
    // 70-80%: Increase OpenCode ratio
    break;
  case 'normal':
    // <70%: Proceed with normal work
    break;
}
```

#### `formatTimeUntilReset(resetDate)`

Formats remaining time until reset.

```javascript
import { formatTimeUntilReset, getUsageFromCache } from 'src/utils/usage.mjs';

const usage = getUsageFromCache();
const remaining = formatTimeUntilReset(usage.fiveHourResetsAt);
console.log(remaining); // "2h 30m" or "1d 5h"
```

#### `getUsageSummary()`

Returns usage summary as a string.

```javascript
import { getUsageSummary } from 'src/utils/usage.mjs';

const summary = getUsageSummary();
// Returns: "5-hour: 65% (resets in 2h 30m), Weekly: 45% (resets in 2d 5h)"
```

### Constants

```javascript
export const DEFAULT_THRESHOLD = 90;   // Default threshold (%)
export const WARNING_THRESHOLD = 70;   // Warning threshold (%)
export const HUD_CACHE_PATH = // ~/.claude/plugins/oh-my-claudecode/.usage-cache.json
```

---

## Provider Balancing

### Module Location
`src/router/balancer.mjs`

### Strategies

Supports 4 balancing strategies:

- `'round-robin'`: Sequential provider selection (default)
- `'weighted'`: Probabilistic selection based on weights
- `'latency'`: Selects fastest provider
- `'usage'`: Selects provider with lowest usage

### ProviderBalancer Class

#### Constructor

```javascript
import { ProviderBalancer } from 'src/router/balancer.mjs';

const balancer = new ProviderBalancer({
  providers: {
    claude: { weight: 3, priority: 1, enabled: true },
    openai: { weight: 2, priority: 2 },
    gemini: { weight: 2, priority: 2 }
  },
  defaultStrategy: 'round-robin'
});
```

#### `registerProvider(name, config)`

Registers a new provider.

```javascript
balancer.registerProvider('cohere', {
  weight: 1,      // Relative weight (1-10)
  priority: 3,    // Priority (lower is higher)
  enabled: true   // Enabled status
});
```

#### `selectProvider(strategy, context)`

Selects a provider based on the strategy.

```javascript
const result = balancer.selectProvider('weighted', {
  taskType: 'analysis',
  excludeProviders: ['gemini']
});
// Returns: { provider: 'claude', reason: 'Weighted selection (weight: 3)' }

// Round-robin selection
const roundRobin = balancer.selectProvider('round-robin');

// Latency-based selection
const fast = balancer.selectProvider('latency');

// Usage-based selection
const balanced = balancer.selectProvider('usage');
```

#### `recordLatency(provider, latencyMs)`

Records provider latency.

```javascript
const startTime = Date.now();
// ... perform work ...
const duration = Date.now() - startTime;

balancer.recordLatency('claude', duration);
```

#### `recordUsage(provider, tokens)`

Records provider token usage.

```javascript
balancer.recordUsage('claude', 2500);  // 2500 tokens used
```

#### `recordError(provider)`

Records provider errors.

```javascript
try {
  // ... perform work ...
} catch (err) {
  balancer.recordError('claude');
}
```

#### `getStats()`

Retrieves statistics for all providers.

```javascript
const stats = balancer.getStats();
// Returns:
// {
//   providers: {
//     claude: {
//       latencyAvg: 250.5,
//       lastLatency: 275,
//       usageTokens: 15000,
//       requestCount: 42,
//       errorCount: 1,
//       errorRate: 2.38,
//       lastUpdated: 1234567890
//     },
//     openai: { ... }
//   },
//   summary: {
//     totalProviders: 3,
//     activeProviders: 3,
//     totalRequests: 100,
//     totalErrors: 2,
//     totalTokens: 45000,
//     overallErrorRate: 2.0
//   },
//   weights: { claude: 3, openai: 2, gemini: 2 },
//   defaultStrategy: 'round-robin',
//   roundRobinIndex: 2
// }
```

#### `setWeight(provider, weight)`

Adjusts provider weight.

```javascript
balancer.setWeight('claude', 5);  // Set weight to 5 (range: 1-10)
```

#### `disableProvider(name)` / `enableProvider(name)`

Disables/enables providers.

```javascript
balancer.disableProvider('gemini');  // Disable Gemini
balancer.enableProvider('gemini');   // Enable Gemini
```

#### `getActiveProviders(excludeList)`

Returns list of active providers.

```javascript
const active = balancer.getActiveProviders();
// Returns: ['claude', 'openai', 'gemini']

const filtered = balancer.getActiveProviders(['gemini']);
// Returns: ['claude', 'openai']
```

### Convenience Functions

```javascript
import {
  getBalancer,
  selectProviderDefault,
  recordProviderLatency,
  recordProviderUsage,
  getBalancerStats
} from 'src/router/balancer.mjs';

// Get singleton instance
const balancer = getBalancer();

// Select with default balancer
const { provider } = selectProviderDefault('weighted');

// Record latency to default balancer
recordProviderLatency('claude', 250);

// Record usage to default balancer
recordProviderUsage('claude', 2500);

// Get default balancer stats
const stats = getBalancerStats();
```

---

## Context Management

### Module Location
`src/context/index.mjs`

### Context Builder

#### `buildContext(session)`

Builds session context.

```javascript
import { buildContext } from 'src/context/context-builder.mjs';

const context = buildContext({
  sessionId: 'session-123',
  projectPath: '/path/to/project',
  startTime: new Date().toISOString(),
  claudeUsage: {
    fiveHour: 65,
    weekly: 45
  },
  task: {
    description: 'Fix authentication bug',
    goal: 'Complete within 30 minutes',
    constraints: ['No breaking changes']
  }
});

// Returns:
// {
//   task: {
//     description: string,
//     goal: string,
//     constraints: string[]
//   },
//   files: {
//     modified: [ { path, size, mtime }, ... ],
//     referenced: [ ... ]
//   },
//   todos: {
//     pending: [ ... ],
//     inProgress: [ ... ],
//     completed: [ ... ]
//   },
//   decisions: {
//     recent: [ ... ],
//     learnings: [ ... ]
//   },
//   meta: {
//     sessionId: string,
//     startTime: string,
//     claudeUsage: { ... },
//     projectPath: string,
//     buildTime: string
//   }
// }
```

#### `getRecentModifiedFiles(limit, projectPath)`

Returns list of recently modified files.

```javascript
import { getRecentModifiedFiles } from 'src/context/context-builder.mjs';

const files = getRecentModifiedFiles(10, '/path/to/project');
// Returns: [{ path: string, size: number, mtime: number }, ...]
```

#### `getTodosByStatus(status, projectPath)`

Retrieves TODOs by status.

```javascript
import { getTodosByStatus } from 'src/context/context-builder.mjs';

const pending = getTodosByStatus('pending', '/path/to/project');
const inProgress = getTodosByStatus('in_progress', '/path/to/project');
const completed = getTodosByStatus('completed', '/path/to/project');
```

### Context Serializer

#### `serializeForOpenCode(context)`

Serializes context for OpenCode.

```javascript
import { serializeForOpenCode } from 'src/context/context-serializer.mjs';

const serialized = serializeForOpenCode(context);
// Returns as string format, ready to pass to OpenCode
```

#### `serializeForJson(context)`

Serializes to JSON format.

```javascript
import { serializeForJson } from 'src/context/context-serializer.mjs';

const json = serializeForJson(context);
// Returns: JSON string
```

#### `deserializeContext(data)`

Deserializes serialized data.

```javascript
import { deserializeContext } from 'src/context/context-serializer.mjs';

const context = deserializeContext(jsonString);
// Restores original context object
```

### Context Synchronizer

#### ContextSynchronizer Class

```javascript
import { ContextSynchronizer } from 'src/context/context-sync.mjs';

const syncer = new ContextSynchronizer({
  projectPath: '/path/to/project',
  syncInterval: 5000
});

// Start synchronization
await syncer.start();

// Get current context
const context = syncer.getContext();

// Stop synchronization
await syncer.stop();
```

---

## Parallel Executor

### Module Location
`src/orchestrator/parallel-executor.mjs`

### ParallelExecutor Class

#### Constructor

```javascript
import { ParallelExecutor } from 'src/orchestrator/parallel-executor.mjs';

const executor = new ParallelExecutor({
  maxWorkers: 3,           // Maximum workers
  autoRoute: true,         // Enable auto-routing
  enableServer: true,      // Enable OpenCode server
  onTaskStart: (task) => { /* Task start callback */ },
  onTaskComplete: (task, result) => { /* Task complete callback */ },
  onError: (task, error) => { /* Error callback */ }
});
```

#### `executeParallel(tasks, maxWorkers)`

Executes tasks in parallel.

```javascript
const result = await executor.executeParallel([
  {
    type: 'executor',
    prompt: 'Fix typo in auth.js',
    files: ['src/auth.js']
  },
  {
    type: 'executor',
    prompt: 'Add error handling to logger',
    files: ['src/logger.js']
  }
]);

// Returns:
// {
//   success: boolean,
//   results: [ { success, output, error, duration, route, agent }, ... ],
//   errors: [ ... ],
//   stats: {
//     total: 2,
//     completed: 2,
//     failed: 0,
//     successRate: 100,
//     duration: 5000,
//     avgTaskDuration: 2500
//   },
//   duration: 5000
// }
```

#### `executeSequential(tasks)`

Executes tasks sequentially.

```javascript
const result = await executor.executeSequential([
  { type: 'executor', prompt: 'Step 1', dependsOn: [] },
  { type: 'executor', prompt: 'Step 2', dependsOn: [0] }
]);
```

#### `executeHybrid(tasks)`

Executes dependent tasks sequentially, independent tasks in parallel.

```javascript
const result = await executor.executeHybrid(tasks);
// Automatically selects strategy based on task dependsOn fields
```

#### `executeTask(task)`

Executes a single task.

```javascript
const result = await executor.executeTask({
  type: 'executor',
  prompt: 'Implement feature X',
  files: ['src/feature.js']
});

// Returns:
// {
//   success: boolean,
//   output: string,
//   error: string,
//   duration: number,
//   route: 'opencode' | 'claude',
//   agent: string,
//   strategy: string
// }
```

#### `canRunInParallel(tasks)`

Checks if tasks can run in parallel.

```javascript
import { canRunInParallel } from 'src/orchestrator/parallel-executor.mjs';

const check = canRunInParallel(tasks);
if (check.canParallel) {
  console.log('Can run in parallel');
} else {
  console.log('Reason:', check.reason);
  if (check.conflicts) {
    console.log('File conflicts:', check.conflicts);
  }
}
```

#### Status Queries

```javascript
// Get current status
const status = executor.getStatus();
// Returns: { running, completed, failed, total, progress }

// Get statistics
const stats = executor.getStats();
// Returns: { total, completed, failed, successRate, duration, avgTaskDuration }

// Cancel execution
executor.cancel();

// Cleanup (shutdown server pool)
await executor.cleanup();
```

### Convenience Functions

```javascript
import {
  executeParallelTasks,
  executeSequentialTasks,
  executeHybridTasks
} from 'src/orchestrator/parallel-executor.mjs';

// Parallel execution
const result = await executeParallelTasks(tasks);

// Sequential execution
const result = await executeSequentialTasks(tasks);

// Hybrid execution
const result = await executeHybridTasks(tasks);
```

---

## Task Routing

### Module Location
`src/orchestrator/task-router.mjs`

### Routing Decisions

#### `routeTask(taskType, options)`

Routes to Claude or OpenCode based on task type.

```javascript
import { routeTask } from 'src/orchestrator/task-router.mjs';

const routing = routeTask('executor', { priority: 'high' });
// Returns:
// {
//   target: 'claude' | 'opencode',
//   reason: string,
//   agent: string
// }

// Claude-preferred tasks
routeTask('architect');   // Complex analysis
routeTask('critic');      // Plan review
routeTask('planner');     // Strategic planning

// OpenCode-preferred tasks
routeTask('explore');     // Code exploration
routeTask('researcher');  // Documentation research
routeTask('writer');      // Documentation writing

// Usage-based decision
routeTask('executor');    // Decided by current usage
routeTask('designer');    // UI work
```

#### `planParallelDistribution(tasks)`

Optimally distributes multiple tasks between Claude and OpenCode.

```javascript
import { planParallelDistribution } from 'src/orchestrator/task-router.mjs';

const distribution = planParallelDistribution([
  { type: 'executor', prompt: 'Task 1', priority: 1 },
  { type: 'explorer', prompt: 'Task 2', priority: 2 },
  { type: 'architect', prompt: 'Task 3', priority: 3 }
]);

// Returns:
// {
//   claudeTasks: [
//     { type, prompt, priority, reason }
//   ],
//   opencodeTasks: [
//     { type, prompt, priority, opencodeAgent, reason }
//   ]
// }

// Usage 90%+: 80% OpenCode ratio
// Usage 70-90%: 50% OpenCode ratio
// Usage 50-70%: 30% OpenCode ratio
// Usage <50%: 10% OpenCode ratio
```

#### `isOpenCodeAvailable()`

Checks if OpenCode is installed.

```javascript
import { isOpenCodeAvailable } from 'src/orchestrator/task-router.mjs';

if (isOpenCodeAvailable()) {
  console.log('OpenCode available');
} else {
  console.log('OpenCode not installed');
}
```

#### `getRoutingSummary(distribution)`

Summarizes distribution results.

```javascript
import { getRoutingSummary } from 'src/orchestrator/task-router.mjs';

const summary = getRoutingSummary(distribution);
// Returns:
// {
//   total: 100,
//   claude: 60,
//   opencode: 40,
//   claudePercent: 60,
//   opencodePercent: 40
// }
```

### Constants

```javascript
export const TASK_ROUTING_PREFERENCES = {
  // Claude-preferred
  architect: 'claude',
  'executor-high': 'claude',
  critic: 'claude',
  planner: 'claude',

  // OpenCode-preferred
  explore: 'opencode',
  'explore-medium': 'opencode',
  researcher: 'opencode',
  writer: 'opencode',
  'designer-low': 'opencode',

  // Usage-based decision
  executor: 'any',
  'executor-low': 'any',
  designer: 'any',
  'build-fixer': 'any'
};

export const OPENCODE_AGENT_MAPPING = {
  explore: 'Librarian',
  'explore-medium': 'Explore',
  researcher: 'Oracle',
  writer: 'Librarian',
  designer: 'Frontend Engineer',
  executor: 'Sisyphus'
};
```

---

## OpenCode Worker

### Module Location
`src/orchestrator/opencode-worker.mjs`

### OpenCodeWorker Class

#### Constructor

```javascript
import { OpenCodeWorker } from 'src/orchestrator/opencode-worker.mjs';

const worker = new OpenCodeWorker({
  projectDir: process.cwd(),
  timeout: 300000,           // 5 minute default timeout
  quiet: true,               // Quiet mode
  outputFormat: 'text'       // or 'json'
});
```

#### `execute(prompt, options)`

Executes a prompt.

```javascript
const result = await worker.execute('Fix the bug in auth.js', {
  enableUltrawork: true
});

// Returns:
// {
//   success: boolean,
//   workerId: string,
//   output: string,
//   duration: number,
//   error?: string
// }
```

#### Properties

```javascript
worker.status;      // 'idle', 'running', 'completed', 'failed'
worker.result;      // Execution result
worker.error;       // Error message
worker.startTime;   // Start time
worker.endTime;     // End time
```

### OpenCodeWorkerPool Class

#### Constructor

```javascript
import { OpenCodeWorkerPool } from 'src/orchestrator/opencode-worker.mjs';

const pool = new OpenCodeWorkerPool({
  maxWorkers: 5,
  projectDir: process.cwd()
});
```

#### `submit(prompt, options)`

Submits a single task.

```javascript
const result = await pool.submit('Implement feature X', {
  enableUltrawork: true
});
```

#### `submitBatch(tasks)`

Submits multiple tasks in parallel.

```javascript
const results = await pool.submitBatch([
  { prompt: 'Task 1', options: { enableUltrawork: true } },
  { prompt: 'Task 2', options: { enableUltrawork: true } }
]);

// Returns: [ { success, workerId, output, duration }, ... ]
```

#### `getStatus()`

Queries pool status.

```javascript
const status = pool.getStatus();
// Returns:
// {
//   activeWorkers: number,
//   maxWorkers: number,
//   queuedTasks: number,
//   completedTasks: number
// }
```

#### `shutdown()`

Shuts down the pool.

```javascript
await pool.shutdown();
```

### Convenience Functions

```javascript
import {
  runOpenCodeTask,
  runOpenCodeTasks,
  runOpenCodeUltrawork
} from 'src/orchestrator/opencode-worker.mjs';

// Execute single task
const result = await runOpenCodeTask('Implement feature X');

// Execute multiple tasks in parallel
const results = await runOpenCodeTasks([
  { prompt: 'Task 1' },
  { prompt: 'Task 2' }
]);

// Execute in ultrawork mode
const result = await runOpenCodeUltrawork('Complex task');
```

---

## OpenCode Server Pool

### Module Location
`src/executor/opencode-server-pool.mjs`

### OpenCodeServerPool Class

#### Constructor

```javascript
import { OpenCodeServerPool } from 'src/executor/opencode-server-pool.mjs';

const pool = new OpenCodeServerPool({
  minServers: 1,           // Minimum servers
  maxServers: 5,           // Maximum servers
  basePort: 4096,          // Starting port
  autoScale: true,         // Auto-scaling
  projectDir: process.cwd()
});
```

#### `initialize()`

Initializes pool and starts minimum number of servers.

```javascript
await pool.initialize();
// Starts minServers OpenCode servers from basePort
```

#### `execute(prompt, options)`

Executes a prompt.

```javascript
const result = await pool.execute('Fix authentication bug', {
  model: 'claude-opus',
  agent: 'architect',
  timeout: 300000
});

// Returns:
// {
//   success: boolean,
//   result: { ... },
//   serverPort: number,
//   duration: number
// }
```

#### `executeBatch(prompts)`

Executes multiple prompts in parallel.

```javascript
const results = await pool.executeBatch([
  { prompt: 'Task 1', options: {} },
  { prompt: 'Task 2', options: {} },
  { prompt: 'Task 3', options: {} }
]);

// Returns: [ result1, result2, result3 ]
// Successful: { status: 'fulfilled', value: result }
// Failed: { status: 'rejected', reason: error }
```

#### `getStatus()`

Queries pool status.

```javascript
const status = pool.getStatus();
// Returns:
// {
//   initialized: boolean,
//   minServers: number,
//   maxServers: number,
//   currentServers: number,
//   idleServers: number,
//   busyServers: number,
//   servers: [
//     {
//       port: number,
//       status: 'idle' | 'busy' | 'starting' | 'stopping' | 'error',
//       busyCount: number,
//       lastUsed: timestamp,
//       uptime: number
//     }
//   ],
//   stats: {
//     totalRequests: number,
//     completedRequests: number,
//     failedRequests: number,
//     averageResponseTime: number,
//     peakServers: number
//   },
//   autoScale: boolean
// }
```

#### `scale(targetSize)`

Manually adjusts server count.

```javascript
await pool.scale(3);  // Scale to 3 servers
```

#### `shutdown()`

Completely shuts down the pool.

```javascript
await pool.shutdown();
// Terminates all server processes
```

### Auto-Scaling

- **Scale Up**: Utilization >= 80% or queued tasks exist
- **Scale Down**: Utilization < 30% && no queued tasks (1 minute delay)

### Events

```javascript
pool.on('initialized', (status) => {
  console.log('Pool initialized');
});

pool.on('serverStarted', ({ port }) => {
  console.log(`Server started: ${port}`);
});

pool.on('serverError', ({ port, error }) => {
  console.log(`Server error: ${port} - ${error}`);
});

pool.on('scaleUp', ({ newSize, port }) => {
  console.log(`Scaled up: ${newSize} servers`);
});

pool.on('scaleDown', ({ newSize, port }) => {
  console.log(`Scaled down: ${newSize} servers`);
});

pool.on('shutdown', () => {
  console.log('Pool shutdown');
});
```

### Convenience Functions

```javascript
import {
  getDefaultPool,
  executeWithPool,
  executeBatchWithPool,
  shutdownDefaultPool
} from 'src/executor/opencode-server-pool.mjs';

// Get/create default pool
const pool = getDefaultPool({
  minServers: 2,
  maxServers: 10
});

// Execute with default pool
const result = await executeWithPool('Task prompt');

// Batch execute with default pool
const results = await executeBatchWithPool([
  { prompt: 'Task 1' },
  { prompt: 'Task 2' }
]);

// Shutdown default pool
await shutdownDefaultPool();
```

---

## ACP Client (Agent Client Protocol)

### Module Location
`src/executor/acp-client.mjs`

### ACPClient Class

#### Constructor

```javascript
import { ACPClient } from 'src/executor/acp-client.mjs';

const client = new ACPClient();
```

#### `connect(options)`

Connects to OpenCode ACP server.

```javascript
await client.connect({
  cwd: '/path/to/project',
  timeout: 10000  // 10 second timeout
});
```

#### `send(prompt, options)`

Sends a prompt and waits for response.

```javascript
const response = await client.send('Analyze this error', {
  model: 'claude-opus',
  files: ['src/error.log'],
  disableUlw: false,
  timeout: 5 * 60 * 1000,  // 5 minutes
  stream: false
});

// Returns:
// {
//   id: number,
//   type: 'response' | 'result' | 'error',
//   content: string,
//   error?: string
// }
```

#### `disconnect()`

Closes the connection.

```javascript
await client.disconnect();
```

#### Properties and Methods

```javascript
client.isConnected();             // Connection status (boolean)
client.getPendingRequestCount();  // Pending request count (number)
```

### Events

```javascript
client.on('message', (msg) => {
  console.log('Message received:', msg);
});

client.on('stream', (msg) => {
  console.log('Streaming:', msg.data);
});

client.on('error', (err) => {
  console.log('Error:', err.message);
});

client.on('close', (code) => {
  console.log('Connection closed:', code);
});

client.on('stderr', (data) => {
  console.log('OpenCode stderr:', data.toString());
});
```

### Usage Example

```javascript
import { ACPClient } from 'src/executor/acp-client.mjs';

async function example() {
  const client = new ACPClient();

  try {
    // Connect
    await client.connect({ cwd: process.cwd() });
    console.log('Connected');

    // Execute task
    const response = await client.send('Implement login feature', {
      model: 'claude-opus'
    });
    console.log('Response:', response.content);

    // Execute multiple tasks
    const responses = await Promise.all([
      client.send('Task 1'),
      client.send('Task 2'),
      client.send('Task 3')
    ]);

  } finally {
    // Cleanup
    await client.disconnect();
  }
}

await example();
```

### Singleton Instance

```javascript
import { getACPClient, resetACPClient } from 'src/executor/acp-client.mjs';

// Get global instance
const client = getACPClient();
await client.connect();

// ... perform work ...

// Reset global instance
const newClient = await resetACPClient();
```

---

## Realtime Tracker

### Module Location
`src/tracking/realtime-tracker.mjs`

### RealtimeTracker Class

#### Constructor

```javascript
import { RealtimeTracker } from 'src/tracking/realtime-tracker.mjs';

const tracker = new RealtimeTracker({
  eventBufferSize: 1000,        // Event ring buffer size
  aggregationInterval: 60000    // Aggregate every 1 minute
});
```

#### `trackRouting(event)`

Records routing events.

```javascript
tracker.trackRouting({
  provider: 'claude',
  agent: 'executor',
  task: 'Fix authentication',
  fusionEnabled: true
});
```

#### `trackPerformance(event)`

Records performance events.

```javascript
const startTime = Date.now();
// ... perform work ...
const duration = Date.now() - startTime;

tracker.trackPerformance({
  duration: duration,
  success: true,
  provider: 'claude',
  agent: 'executor',
  error: null
});

// On failure
tracker.trackPerformance({
  duration: 5000,
  success: false,
  provider: 'openai',
  agent: 'explorer',
  error: 'Timeout'
});
```

#### `trackCache(event)`

Records cache events.

```javascript
tracker.trackCache({
  hit: true,
  key: 'file:src/utils.js'
});

tracker.trackCache({
  hit: false,
  key: 'file:src/index.js'
});
```

#### `getStats(timeRange)`

Queries aggregated statistics.

```javascript
const stats = tracker.getStats('hour');
// Returns:
// {
//   routing: {
//     total: 100,
//     byProvider: { claude: 60, openai: 30, gemini: 10 },
//     byAgent: { executor: 50, explorer: 30, ... }
//   },
//   performance: {
//     avgDuration: 2500,
//     successRate: 98,
//     totalCalls: 100,
//     successes: 98,
//     failures: 2
//   },
//   cache: {
//     hits: 60,
//     misses: 40,
//     hitRate: 60
//   }
// }

// Time ranges
tracker.getStats('minute');  // Minute granularity
tracker.getStats('hour');    // Hour granularity (default)
tracker.getStats('day');     // Day granularity
```

#### `getRecentEvents(limit)`

Queries recent events.

```javascript
const events = tracker.getRecentEvents(50);
// Returns: [
//   { type, timestamp, provider, agent, task, ... },
//   ...
// ]
```

#### `startAggregation()` / `stopAggregation()`

Starts/stops periodic aggregation.

```javascript
tracker.startAggregation();  // Start periodic aggregation
// ... tracking in progress ...
tracker.stopAggregation();   // Stop periodic aggregation
```

#### `getSummary()`

Summarizes current tracking state.

```javascript
const summary = tracker.getSummary();
// Returns:
// {
//   isRunning: boolean,
//   eventCount: number,
//   stats: {
//     minute: { ... },
//     hour: { ... },
//     day: { ... }
//   }
// }
```

#### `reset()`

Resets all tracking data.

```javascript
tracker.reset();
```

### Events

```javascript
tracker.on('routing', (event) => {
  console.log('Routing:', event.provider, event.agent);
});

tracker.on('performance', (event) => {
  console.log('Performance:', event.duration, 'ms', event.success ? 'success' : 'failed');
});

tracker.on('cache', (event) => {
  console.log('Cache:', event.hit ? 'hit' : 'miss');
});

tracker.on('event', (event) => {
  console.log('All events:', event);
});

tracker.on('aggregation', (data) => {
  console.log('Aggregation complete:', data.stats);
});

tracker.on('started', () => {
  console.log('Tracking started');
});

tracker.on('stopped', () => {
  console.log('Tracking stopped');
});

tracker.on('reset', () => {
  console.log('Tracking reset');
});
```

### Usage Example

```javascript
import { RealtimeTracker } from 'src/tracking/realtime-tracker.mjs';

const tracker = new RealtimeTracker();

// Start periodic aggregation
tracker.startAggregation();

// Track work
tracker.trackRouting({ provider: 'claude', agent: 'executor' });

// Track performance
const start = Date.now();
// ... work ...
tracker.trackPerformance({
  duration: Date.now() - start,
  success: true,
  provider: 'claude'
});

// Query 1-hour stats
const hourStats = tracker.getStats('hour');
console.log('Success rate:', hourStats.performance.successRate + '%');

// Cleanup
tracker.stopAggregation();
```

### Convenience Functions

```javascript
import { createTracker } from 'src/tracking/realtime-tracker.mjs';

const tracker = createTracker({
  eventBufferSize: 2000,
  aggregationInterval: 30000
});
```

---

## Module Dependency Diagram

```
OpenCode Execution:
  parallel-executor.mjs
    ├─ task-router.mjs (task routing)
    ├─ opencode-server-pool.mjs (server pool)
    ├─ opencode-executor.mjs (execution)
    └─ execution-strategy.mjs (strategy selection)

Provider Management:
  balancer.mjs (balancing)
    ├─ provider-limits.mjs (limits)
    └─ realtime-tracker.mjs (tracking)

Context Passing:
  context/ (context)
    ├─ context-builder.mjs
    ├─ context-serializer.mjs
    └─ context-sync.mjs

Work Tracking:
  realtime-tracker.mjs
    ├─ RingBuffer (event buffer)
    └─ TimeBucketManager (time-based aggregation)

Tracking and Usage:
  usage.mjs (usage)
  metrics-collector.mjs (metrics)
  fusion-tracker.mjs (fusion tracking)
```

---

## Quick Start Examples

### Example 1: Parallel Task Execution

```javascript
import { executeParallelTasks } from 'src/orchestrator/parallel-executor.mjs';

const results = await executeParallelTasks([
  {
    type: 'executor',
    prompt: 'Fix bug in auth.js',
    files: ['src/auth.js'],
    priority: 1
  },
  {
    type: 'executor',
    prompt: 'Add validation to logger',
    files: ['src/logger.js'],
    priority: 1
  }
], {
  maxWorkers: 2,
  autoRoute: true
});

console.log('Results:', results);
```

### Example 2: Usage-Based Routing

```javascript
import {
  checkThreshold,
  getUsageLevel
} from 'src/utils/usage.mjs';
import { routeTask } from 'src/orchestrator/task-router.mjs';

if (checkThreshold(75).exceeded) {
  console.log('Usage warning:', getUsageLevel());

  // Route task to OpenCode
  const routing = routeTask('executor');
  console.log('Routing:', routing.target, '-', routing.reason);
}
```

### Example 3: Server Pool Usage

```javascript
import { getDefaultPool } from 'src/executor/opencode-server-pool.mjs';

const pool = getDefaultPool({
  minServers: 2,
  maxServers: 5
});

await pool.initialize();

const result = await pool.execute('Implement feature X');
console.log('Result:', result);

await pool.shutdown();
```

### Example 4: ACP Client

```javascript
import { getACPClient } from 'src/executor/acp-client.mjs';

const client = getACPClient();

try {
  await client.connect({ cwd: process.cwd() });

  const response = await client.send('Fix the bug');
  console.log('Response:', response.content);
} finally {
  await client.disconnect();
}
```

### Example 5: Realtime Tracking

```javascript
import { RealtimeTracker } from 'src/tracking/realtime-tracker.mjs';

const tracker = new RealtimeTracker();
tracker.startAggregation();

// Track work
tracker.trackRouting({ provider: 'claude', agent: 'executor' });
tracker.trackPerformance({ duration: 2500, success: true, provider: 'claude' });
tracker.trackCache({ hit: true, key: 'file:utils.js' });

// Query statistics
const stats = tracker.getStats('hour');
console.log('Success rate:', stats.performance.successRate + '%');
console.log('Cache hit rate:', stats.cache.hitRate + '%');

tracker.stopAggregation();
```

---

## Error Handling

All modules throw standard JavaScript errors.

```javascript
try {
  const result = await executor.executeTask(task);
} catch (err) {
  console.error('Task failed:', err.message);
  // err.code: 'TIMEOUT' | 'CONNECTION_ERROR' | 'INVALID_TASK'
}
```

---

## Version Information

- Minimum Node.js version: 18.0.0
- Module type: ESM (ES6 modules)

---

## License

MIT
