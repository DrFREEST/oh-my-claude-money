# OMCM API 레퍼런스

OMCM(Oh My Claude Money)의 모든 공개 API와 모듈을 문서화합니다.

**목차**
- [사용량 추적 (Usage Tracking)](#사용량-추적-usage-tracking)
- [프로바이더 밸런싱 (Provider Balancing)](#프로바이더-밸런싱-provider-balancing)
- [컨텍스트 관리 (Context Management)](#컨텍스트-관리-context-management)
- [병렬 실행기 (Parallel Executor)](#병렬-실행기-parallel-executor)
- [작업 라우팅 (Task Routing)](#작업-라우팅-task-routing)
- [OpenCode 워커 (OpenCode Worker)](#opencode-워커-opencode-worker)
- [OpenCode 서버 풀 (Server Pool)](#opencode-서버-풀-server-pool)
- [ACP 클라이언트 (Agent Client Protocol)](#acp-클라이언트-agent-client-protocol)
- [실시간 추적 (Realtime Tracker)](#실시간-추적-realtime-tracker)

---

## 사용량 추적 (Usage Tracking)

### 모듈 위치
`src/utils/usage.mjs`

### 주요 함수

#### `getUsageFromCache()`

HUD 캐시에서 사용량 데이터를 읽습니다.

```javascript
import { getUsageFromCache } from 'src/utils/usage.mjs';

const usage = getUsageFromCache();
// Returns:
// {
//   fiveHour: number,        // 5시간 사용량 (%)
//   weekly: number,          // 주간 사용량 (%)
//   fiveHourResetsAt: Date,  // 5시간 카운터 리셋 시간
//   weeklyResetsAt: Date,    // 주간 카운터 리셋 시간
//   timestamp: string,       // 마지막 업데이트 시간
//   error: boolean           // 에러 발생 여부
// }
// 또는 null (캐시 없음)
```

#### `checkThreshold(threshold = 90)`

사용량이 임계치를 초과했는지 확인합니다.

```javascript
import { checkThreshold } from 'src/utils/usage.mjs';

const result = checkThreshold(75);
// Returns:
// {
//   exceeded: boolean,  // 임계치 초과 여부
//   type: string,       // 'fiveHour' | 'weekly' | null
//   percent: number     // 현재 최대 사용량 (%)
// }

// 사용 예
if (checkThreshold(80).exceeded) {
  console.log('사용량 주의!');
  // OpenCode로 작업 위임
}
```

#### `getUsageLevel()`

현재 사용량 상태를 레벨로 반환합니다.

```javascript
import { getUsageLevel } from 'src/utils/usage.mjs';

const level = getUsageLevel();
// Returns: 'critical' | 'warning' | 'normal' | 'unknown'

switch (getUsageLevel()) {
  case 'critical':
    // 80% 이상: 강제로 OpenCode 우선
    break;
  case 'warning':
    // 70-80%: OpenCode 비중 증가
    break;
  case 'normal':
    // 70% 미만: 일반 작업 진행
    break;
}
```

#### `formatTimeUntilReset(resetDate)`

리셋 시간까지 남은 시간을 포맷합니다.

```javascript
import { formatTimeUntilReset, getUsageFromCache } from 'src/utils/usage.mjs';

const usage = getUsageFromCache();
const remaining = formatTimeUntilReset(usage.fiveHourResetsAt);
console.log(remaining); // "2시간 30분" 또는 "1일 5시간"
```

#### `getUsageSummary()`

사용량 요약을 문자열로 반환합니다.

```javascript
import { getUsageSummary } from 'src/utils/usage.mjs';

const summary = getUsageSummary();
// Returns: "5시간: 65% (리셋: 2시간 30분), 주간: 45% (리셋: 2일 5시간)"
```

### 상수

```javascript
export const DEFAULT_THRESHOLD = 90;   // 기본 임계치 (%)
export const WARNING_THRESHOLD = 70;   // 경고 임계치 (%)
export const HUD_CACHE_PATH = // ~/.claude/plugins/oh-my-claudecode/.usage-cache.json
```

---

## 프로바이더 밸런싱 (Provider Balancing)

### 모듈 위치
`src/router/balancer.mjs`

### 전략 (Strategies)

4가지 밸런싱 전략을 지원합니다:

- `'round-robin'`: 순차적으로 프로바이더 선택 (기본값)
- `'weighted'`: 가중치에 따라 확률적 선택
- `'latency'`: 가장 빠른 프로바이더 선택
- `'usage'`: 사용량이 가장 적은 프로바이더 선택

### ProviderBalancer 클래스

#### 생성자

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

새 프로바이더를 등록합니다.

```javascript
balancer.registerProvider('cohere', {
  weight: 1,      // 상대적 가중치 (1-10)
  priority: 3,    // 우선순위 (낮을수록 높음)
  enabled: true   // 활성화 여부
});
```

#### `selectProvider(strategy, context)`

전략에 따라 프로바이더를 선택합니다.

```javascript
const result = balancer.selectProvider('weighted', {
  taskType: 'analysis',
  excludeProviders: ['gemini']
});
// Returns: { provider: 'claude', reason: 'Weighted selection (weight: 3)' }

// 라운드로빈 선택
const roundRobin = balancer.selectProvider('round-robin');

// 지연시간 기반 선택
const fast = balancer.selectProvider('latency');

// 사용량 기반 선택
const balanced = balancer.selectProvider('usage');
```

#### `recordLatency(provider, latencyMs)`

프로바이더의 지연시간을 기록합니다.

```javascript
const startTime = Date.now();
// ... 작업 수행 ...
const duration = Date.now() - startTime;

balancer.recordLatency('claude', duration);
```

#### `recordUsage(provider, tokens)`

프로바이더의 토큰 사용량을 기록합니다.

```javascript
balancer.recordUsage('claude', 2500);  // 2500 토큰 사용
```

#### `recordError(provider)`

프로바이더의 에러를 기록합니다.

```javascript
try {
  // ... 작업 수행 ...
} catch (err) {
  balancer.recordError('claude');
}
```

#### `getStats()`

모든 프로바이더의 통계를 조회합니다.

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

프로바이더의 가중치를 조정합니다.

```javascript
balancer.setWeight('claude', 5);  // 가중치를 5로 설정 (범위: 1-10)
```

#### `disableProvider(name)` / `enableProvider(name)`

프로바이더를 비활성화/활성화합니다.

```javascript
balancer.disableProvider('gemini');  // Gemini 비활성화
balancer.enableProvider('gemini');   // Gemini 활성화
```

#### `getActiveProviders(excludeList)`

활성화된 프로바이더 목록을 반환합니다.

```javascript
const active = balancer.getActiveProviders();
// Returns: ['claude', 'openai', 'gemini']

const filtered = balancer.getActiveProviders(['gemini']);
// Returns: ['claude', 'openai']
```

### 편의 함수

```javascript
import {
  getBalancer,
  selectProviderDefault,
  recordProviderLatency,
  recordProviderUsage,
  getBalancerStats
} from 'src/router/balancer.mjs';

// 싱글톤 인스턴스 가져오기
const balancer = getBalancer();

// 기본 밸런서로 선택
const { provider } = selectProviderDefault('weighted');

// 기본 밸런서에 지연시간 기록
recordProviderLatency('claude', 250);

// 기본 밸런서에 사용량 기록
recordProviderUsage('claude', 2500);

// 기본 밸런서 통계 조회
const stats = getBalancerStats();
```

---

## 컨텍스트 관리 (Context Management)

### 모듈 위치
`src/context/index.mjs`

### Context Builder

#### `buildContext(session)`

세션 컨텍스트를 생성합니다.

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

최근 수정한 파일 목록을 반환합니다.

```javascript
import { getRecentModifiedFiles } from 'src/context/context-builder.mjs';

const files = getRecentModifiedFiles(10, '/path/to/project');
// Returns: [{ path: string, size: number, mtime: number }, ...]
```

#### `getTodosByStatus(status, projectPath)`

상태별 TODO를 조회합니다.

```javascript
import { getTodosByStatus } from 'src/context/context-builder.mjs';

const pending = getTodosByStatus('pending', '/path/to/project');
const inProgress = getTodosByStatus('in_progress', '/path/to/project');
const completed = getTodosByStatus('completed', '/path/to/project');
```

### Context Serializer

#### `serializeForOpenCode(context)`

OpenCode용으로 컨텍스트를 직렬화합니다.

```javascript
import { serializeForOpenCode } from 'src/context/context-serializer.mjs';

const serialized = serializeForOpenCode(context);
// 문자열 형식으로 반환되어 OpenCode에 전달 가능
```

#### `serializeForJson(context)`

JSON 형식으로 직렬화합니다.

```javascript
import { serializeForJson } from 'src/context/context-serializer.mjs';

const json = serializeForJson(context);
// Returns: JSON 문자열
```

#### `deserializeContext(data)`

직렬화된 데이터를 역직렬화합니다.

```javascript
import { deserializeContext } from 'src/context/context-serializer.mjs';

const context = deserializeContext(jsonString);
// 원본 컨텍스트 객체로 복원
```

### Context Synchronizer

#### ContextSynchronizer 클래스

```javascript
import { ContextSynchronizer } from 'src/context/context-sync.mjs';

const syncer = new ContextSynchronizer({
  projectPath: '/path/to/project',
  syncInterval: 5000
});

// 동기화 시작
await syncer.start();

// 현재 컨텍스트 조회
const context = syncer.getContext();

// 동기화 중지
await syncer.stop();
```

---

## 병렬 실행기 (Parallel Executor)

### 모듈 위치
`src/orchestrator/parallel-executor.mjs`

### ParallelExecutor 클래스

#### 생성자

```javascript
import { ParallelExecutor } from 'src/orchestrator/parallel-executor.mjs';

const executor = new ParallelExecutor({
  maxWorkers: 3,           // 최대 워커 수
  autoRoute: true,         // 자동 라우팅 활성화
  enableServer: true,      // OpenCode 서버 활성화
  onTaskStart: (task) => { /* 작업 시작 콜백 */ },
  onTaskComplete: (task, result) => { /* 작업 완료 콜백 */ },
  onError: (task, error) => { /* 에러 콜백 */ }
});
```

#### `executeParallel(tasks, maxWorkers)`

작업들을 병렬로 실행합니다.

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

작업들을 순차적으로 실행합니다.

```javascript
const result = await executor.executeSequential([
  { type: 'executor', prompt: 'Step 1', dependsOn: [] },
  { type: 'executor', prompt: 'Step 2', dependsOn: [0] }
]);
```

#### `executeHybrid(tasks)`

의존성이 있는 작업은 순차, 독립적인 작업은 병렬로 실행합니다.

```javascript
const result = await executor.executeHybrid(tasks);
// 작업의 dependsOn 필드를 기반으로 자동으로 전략 선택
```

#### `executeTask(task)`

단일 작업을 실행합니다.

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

작업들이 병렬 실행 가능한지 확인합니다.

```javascript
import { canRunInParallel } from 'src/orchestrator/parallel-executor.mjs';

const check = canRunInParallel(tasks);
if (check.canParallel) {
  console.log('병렬 실행 가능');
} else {
  console.log('사유:', check.reason);
  if (check.conflicts) {
    console.log('파일 충돌:', check.conflicts);
  }
}
```

#### 상태 조회

```javascript
// 현재 상태 조회
const status = executor.getStatus();
// Returns: { running, completed, failed, total, progress }

// 통계 조회
const stats = executor.getStats();
// Returns: { total, completed, failed, successRate, duration, avgTaskDuration }

// 실행 취소
executor.cancel();

// 정리 (서버 풀 종료)
await executor.cleanup();
```

### 편의 함수

```javascript
import {
  executeParallelTasks,
  executeSequentialTasks,
  executeHybridTasks
} from 'src/orchestrator/parallel-executor.mjs';

// 병렬 실행
const result = await executeParallelTasks(tasks);

// 순차 실행
const result = await executeSequentialTasks(tasks);

// 하이브리드 실행
const result = await executeHybridTasks(tasks);
```

---

## 작업 라우팅 (Task Routing)

### 모듈 위치
`src/orchestrator/task-router.mjs`

### 라우팅 결정

#### `routeTask(taskType, options)`

작업 유형에 따라 Claude 또는 OpenCode로 라우팅합니다.

```javascript
import { routeTask } from 'src/orchestrator/task-router.mjs';

const routing = routeTask('executor', { priority: 'high' });
// Returns:
// {
//   target: 'claude' | 'opencode',
//   reason: string,
//   agent: string
// }

// Claude 선호 작업
routeTask('architect');   // 복잡한 분석
routeTask('critic');      // 계획 검토
routeTask('planner');     // 전략 계획

// OpenCode 선호 작업
routeTask('explore');     // 코드 탐색
routeTask('researcher');  // 문서 조사
routeTask('writer');      // 문서 작성

// 사용량에 따라 결정
routeTask('executor');    // 현재 사용량에 따라 결정
routeTask('designer');    // UI 작업
```

#### `planParallelDistribution(tasks)`

여러 작업을 Claude와 OpenCode에 최적으로 분배합니다.

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

// 사용량이 90% 이상이면 OpenCode 비중 80%
// 사용량이 70-90%면 OpenCode 비중 50%
// 사용량이 50-70%면 OpenCode 비중 30%
// 사용량이 50% 미만이면 OpenCode 비중 10%
```

#### `isOpenCodeAvailable()`

OpenCode 설치 여부를 확인합니다.

```javascript
import { isOpenCodeAvailable } from 'src/orchestrator/task-router.mjs';

if (isOpenCodeAvailable()) {
  console.log('OpenCode 사용 가능');
} else {
  console.log('OpenCode 미설치');
}
```

#### `getRoutingSummary(distribution)`

분배 결과를 요약합니다.

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

### 상수

```javascript
export const TASK_ROUTING_PREFERENCES = {
  // Claude 선호
  architect: 'claude',
  'executor-high': 'claude',
  critic: 'claude',
  planner: 'claude',

  // OpenCode 선호
  explore: 'opencode',
  'explore-medium': 'opencode',
  researcher: 'opencode',
  writer: 'opencode',
  'designer-low': 'opencode',

  // 사용량에 따라 결정
  executor: 'any',
  'executor-low': 'any',
  designer: 'any',
  'build-fixer': 'any'
};

// OMO 에이전트 매핑 (agent-fusion-map.mjs 기반)
// OMO 에이전트는 4종: build, explore, plan, general
export const OPENCODE_AGENT_MAPPING = {
  explore: 'explore',           // LOW → Gemini 3.0 Flash
  'explore-medium': 'explore',  // MEDIUM → GPT-5.2-Codex
  researcher: 'general',        // MEDIUM → GPT-5.2-Codex
  'researcher-low': 'general',  // LOW → Gemini 3.0 Flash
  writer: 'general',            // LOW → Gemini 3.0 Flash
  designer: 'build',            // MEDIUM → GPT-5.2-Codex
  executor: 'build',            // MEDIUM → GPT-5.2-Codex
  'executor-low': 'build',      // LOW → Gemini 3.0 Flash
  vision: 'general',            // MEDIUM → GPT-5.2-Codex
  'architect-medium': 'build',  // MEDIUM → GPT-5.2-Codex
  'architect-low': 'explore'    // LOW → Gemini 3.0 Flash
};
```

---

## OpenCode 워커 (OpenCode Worker)

### 모듈 위치
`src/orchestrator/opencode-worker.mjs`

### OpenCodeWorker 클래스

#### 생성자

```javascript
import { OpenCodeWorker } from 'src/orchestrator/opencode-worker.mjs';

const worker = new OpenCodeWorker({
  projectDir: process.cwd(),
  timeout: 300000,           // 5분 기본 타임아웃
  quiet: true,               // 조용한 모드
  outputFormat: 'text'       // 또는 'json'
});
```

#### `execute(prompt, options)`

프롬프트를 실행합니다.

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

#### 속성

```javascript
worker.status;      // 'idle', 'running', 'completed', 'failed'
worker.result;      // 실행 결과
worker.error;       // 에러 메시지
worker.startTime;   // 시작 시간
worker.endTime;     // 종료 시간
```

### OpenCodeWorkerPool 클래스

#### 생성자

```javascript
import { OpenCodeWorkerPool } from 'src/orchestrator/opencode-worker.mjs';

const pool = new OpenCodeWorkerPool({
  maxWorkers: 5,
  projectDir: process.cwd()
});
```

#### `submit(prompt, options)`

단일 작업을 제출합니다.

```javascript
const result = await pool.submit('Implement feature X', {
  enableUltrawork: true
});
```

#### `submitBatch(tasks)`

여러 작업을 병렬 제출합니다.

```javascript
const results = await pool.submitBatch([
  { prompt: 'Task 1', options: { enableUltrawork: true } },
  { prompt: 'Task 2', options: { enableUltrawork: true } }
]);

// Returns: [ { success, workerId, output, duration }, ... ]
```

#### `getStatus()`

풀 상태를 조회합니다.

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

풀을 종료합니다.

```javascript
await pool.shutdown();
```

### 편의 함수

```javascript
import {
  runOpenCodeTask,
  runOpenCodeTasks,
  runOpenCodeUltrawork
} from 'src/orchestrator/opencode-worker.mjs';

// 단일 작업 실행
const result = await runOpenCodeTask('Implement feature X');

// 여러 작업 병렬 실행
const results = await runOpenCodeTasks([
  { prompt: 'Task 1' },
  { prompt: 'Task 2' }
]);

// ultrawork 모드로 실행
const result = await runOpenCodeUltrawork('Complex task');
```

---

## OpenCode 서버 풀 (Server Pool)

### 모듈 위치
`src/executor/opencode-server-pool.mjs`

### OpenCodeServerPool 클래스

#### 생성자

```javascript
import { OpenCodeServerPool } from 'src/executor/opencode-server-pool.mjs';

const pool = new OpenCodeServerPool({
  minServers: 1,           // 최소 서버 수
  maxServers: 5,           // 최대 서버 수
  basePort: 4096,          // 시작 포트
  autoScale: true,         // 자동 스케일링
  projectDir: process.cwd()
});
```

#### `initialize()`

풀을 초기화하고 최소 서버 수만큼 시작합니다.

```javascript
await pool.initialize();
// minServers 개의 OpenCode 서버를 포트 basePort부터 시작
```

#### `execute(prompt, options)`

프롬프트를 실행합니다.

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

여러 프롬프트를 병렬 실행합니다.

```javascript
const results = await pool.executeBatch([
  { prompt: 'Task 1', options: {} },
  { prompt: 'Task 2', options: {} },
  { prompt: 'Task 3', options: {} }
]);

// Returns: [ result1, result2, result3 ]
// 성공한 작업은 { status: 'fulfilled', value: result }
// 실패한 작업은 { status: 'rejected', reason: error }
```

#### `getStatus()`

풀의 상태를 조회합니다.

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

서버 수를 수동으로 조정합니다.

```javascript
await pool.scale(3);  // 3개의 서버로 스케일
```

#### `shutdown()`

풀을 완전히 종료합니다.

```javascript
await pool.shutdown();
// 모든 서버 프로세스 종료
```

### 자동 스케일링

- **스케일 업**: 사용률 >= 80% 또는 대기 작업 있음
- **스케일 다운**: 사용률 < 30% && 대기 작업 없음 (1분 지연)

### 이벤트

```javascript
pool.on('initialized', (status) => {
  console.log('풀 초기화됨');
});

pool.on('serverStarted', ({ port }) => {
  console.log(`서버 시작: ${port}`);
});

pool.on('serverError', ({ port, error }) => {
  console.log(`서버 에러: ${port} - ${error}`);
});

pool.on('scaleUp', ({ newSize, port }) => {
  console.log(`스케일 업: ${newSize}개 서버`);
});

pool.on('scaleDown', ({ newSize, port }) => {
  console.log(`스케일 다운: ${newSize}개 서버`);
});

pool.on('shutdown', () => {
  console.log('풀 종료됨');
});
```

### 편의 함수

```javascript
import {
  getDefaultPool,
  executeWithPool,
  executeBatchWithPool,
  shutdownDefaultPool
} from 'src/executor/opencode-server-pool.mjs';

// 기본 풀 가져오기/생성
const pool = getDefaultPool({
  minServers: 2,
  maxServers: 10
});

// 기본 풀로 실행
const result = await executeWithPool('Task prompt');

// 기본 풀로 배치 실행
const results = await executeBatchWithPool([
  { prompt: 'Task 1' },
  { prompt: 'Task 2' }
]);

// 기본 풀 종료
await shutdownDefaultPool();
```

---

## ACP 클라이언트 (Agent Client Protocol)

### 모듈 위치
`src/executor/acp-client.mjs`

### ACPClient 클래스

#### 생성자

```javascript
import { ACPClient } from 'src/executor/acp-client.mjs';

const client = new ACPClient();
```

#### `connect(options)`

OpenCode ACP 서버에 연결합니다.

```javascript
await client.connect({
  cwd: '/path/to/project',
  timeout: 10000  // 10초 타임아웃
});
```

#### `send(prompt, options)`

프롬프트를 전송하고 응답을 기다립니다.

```javascript
const response = await client.send('Analyze this error', {
  model: 'claude-opus',
  files: ['src/error.log'],
  disableUlw: false,
  timeout: 5 * 60 * 1000,  // 5분
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

연결을 종료합니다.

```javascript
await client.disconnect();
```

#### 속성 및 메서드

```javascript
client.isConnected();             // 연결 상태 (boolean)
client.getPendingRequestCount();  // 대기 중인 요청 수 (number)
```

### 이벤트

```javascript
client.on('message', (msg) => {
  console.log('메시지 수신:', msg);
});

client.on('stream', (msg) => {
  console.log('스트리밍:', msg.data);
});

client.on('error', (err) => {
  console.log('에러:', err.message);
});

client.on('close', (code) => {
  console.log('연결 종료:', code);
});

client.on('stderr', (data) => {
  console.log('OpenCode stderr:', data.toString());
});
```

### 사용 예제

```javascript
import { ACPClient } from 'src/executor/acp-client.mjs';

async function example() {
  const client = new ACPClient();

  try {
    // 연결
    await client.connect({ cwd: process.cwd() });
    console.log('연결됨');

    // 작업 실행
    const response = await client.send('Implement login feature', {
      model: 'claude-opus'
    });
    console.log('응답:', response.content);

    // 여러 작업 실행
    const responses = await Promise.all([
      client.send('Task 1'),
      client.send('Task 2'),
      client.send('Task 3')
    ]);

  } finally {
    // 정리
    await client.disconnect();
  }
}

await example();
```

### 싱글톤 인스턴스

```javascript
import { getACPClient, resetACPClient } from 'src/executor/acp-client.mjs';

// 글로벌 인스턴스 가져오기
const client = getACPClient();
await client.connect();

// ... 작업 수행 ...

// 글로벌 인스턴스 재설정
const newClient = await resetACPClient();
```

---

## 실시간 추적 (Realtime Tracker)

### 모듈 위치
`src/tracking/realtime-tracker.mjs`

### RealtimeTracker 클래스

#### 생성자

```javascript
import { RealtimeTracker } from 'src/tracking/realtime-tracker.mjs';

const tracker = new RealtimeTracker({
  eventBufferSize: 1000,        // 이벤트 링 버퍼 크기
  aggregationInterval: 60000    // 1분마다 집계
});
```

#### `trackRouting(event)`

라우팅 이벤트를 기록합니다.

```javascript
tracker.trackRouting({
  provider: 'claude',
  agent: 'executor',
  task: 'Fix authentication',
  fusionEnabled: true
});
```

#### `trackPerformance(event)`

성능 이벤트를 기록합니다.

```javascript
const startTime = Date.now();
// ... 작업 수행 ...
const duration = Date.now() - startTime;

tracker.trackPerformance({
  duration: duration,
  success: true,
  provider: 'claude',
  agent: 'executor',
  error: null
});

// 실패한 경우
tracker.trackPerformance({
  duration: 5000,
  success: false,
  provider: 'openai',
  agent: 'explorer',
  error: 'Timeout'
});
```

#### `trackCache(event)`

캐시 이벤트를 기록합니다.

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

집계 통계를 조회합니다.

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

// 시간 범위
tracker.getStats('minute');  // 분 단위
tracker.getStats('hour');    // 시간 단위 (기본값)
tracker.getStats('day');     // 일 단위
```

#### `getRecentEvents(limit)`

최근 이벤트를 조회합니다.

```javascript
const events = tracker.getRecentEvents(50);
// Returns: [
//   { type, timestamp, provider, agent, task, ... },
//   ...
// ]
```

#### `startAggregation()` / `stopAggregation()`

주기적 집계를 시작/중지합니다.

```javascript
tracker.startAggregation();  // 주기적 집계 시작
// ... 추적 진행 ...
tracker.stopAggregation();   // 주기적 집계 중지
```

#### `getSummary()`

현재 추적 상태를 요약합니다.

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

모든 추적 데이터를 초기화합니다.

```javascript
tracker.reset();
```

### 이벤트

```javascript
tracker.on('routing', (event) => {
  console.log('라우팅:', event.provider, event.agent);
});

tracker.on('performance', (event) => {
  console.log('성능:', event.duration, 'ms', event.success ? '성공' : '실패');
});

tracker.on('cache', (event) => {
  console.log('캐시:', event.hit ? '히트' : '미스');
});

tracker.on('event', (event) => {
  console.log('모든 이벤트:', event);
});

tracker.on('aggregation', (data) => {
  console.log('집계 완료:', data.stats);
});

tracker.on('started', () => {
  console.log('추적 시작됨');
});

tracker.on('stopped', () => {
  console.log('추적 중지됨');
});

tracker.on('reset', () => {
  console.log('추적 초기화됨');
});
```

### 사용 예제

```javascript
import { RealtimeTracker } from 'src/tracking/realtime-tracker.mjs';

const tracker = new RealtimeTracker();

// 주기적 집계 시작
tracker.startAggregation();

// 작업 추적
tracker.trackRouting({ provider: 'claude', agent: 'executor' });

// 성능 추적
const start = Date.now();
// ... 작업 ...
tracker.trackPerformance({
  duration: Date.now() - start,
  success: true,
  provider: 'claude'
});

// 1시간 통계 조회
const hourStats = tracker.getStats('hour');
console.log('성공률:', hourStats.performance.successRate + '%');

// 정리
tracker.stopAggregation();
```

### 편의 함수

```javascript
import { createTracker } from 'src/tracking/realtime-tracker.mjs';

const tracker = createTracker({
  eventBufferSize: 2000,
  aggregationInterval: 30000
});
```

---

## 모듈 간 의존성 다이어그램

```
OpenCode 실행:
  parallel-executor.mjs
    ├─ task-router.mjs (작업 라우팅)
    ├─ opencode-server-pool.mjs (서버 풀)
    ├─ opencode-executor.mjs (실행)
    └─ execution-strategy.mjs (전략 선택)

프로바이더 관리:
  balancer.mjs (밸런싱)
    ├─ provider-limits.mjs (제한)
    └─ realtime-tracker.mjs (추적)

컨텍스트 전달:
  context/ (컨텍스트)
    ├─ context-builder.mjs
    ├─ context-serializer.mjs
    └─ context-sync.mjs

작업 추적:
  realtime-tracker.mjs
    ├─ RingBuffer (이벤트 버퍼)
    └─ TimeBucketManager (시간 단위 집계)

추적 및 사용량:
  usage.mjs (사용량)
  metrics-collector.mjs (메트릭)
  fusion-tracker.mjs (퓨전 추적)
```

---

## 빠른 시작 예제

### 예제 1: 병렬 작업 실행

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

console.log('결과:', results);
```

### 예제 2: 사용량 기반 라우팅

```javascript
import {
  checkThreshold,
  getUsageLevel
} from 'src/utils/usage.mjs';
import { routeTask } from 'src/orchestrator/task-router.mjs';

if (checkThreshold(75).exceeded) {
  console.log('사용량 주의:', getUsageLevel());

  // 작업을 OpenCode로 라우팅
  const routing = routeTask('executor');
  console.log('라우팅:', routing.target, '-', routing.reason);
}
```

### 예제 3: 서버 풀 사용

```javascript
import { getDefaultPool } from 'src/executor/opencode-server-pool.mjs';

const pool = getDefaultPool({
  minServers: 2,
  maxServers: 5
});

await pool.initialize();

const result = await pool.execute('Implement feature X');
console.log('결과:', result);

await pool.shutdown();
```

### 예제 4: ACP 클라이언트

```javascript
import { getACPClient } from 'src/executor/acp-client.mjs';

const client = getACPClient();

try {
  await client.connect({ cwd: process.cwd() });

  const response = await client.send('Fix the bug');
  console.log('응답:', response.content);
} finally {
  await client.disconnect();
}
```

### 예제 5: 실시간 추적

```javascript
import { RealtimeTracker } from 'src/tracking/realtime-tracker.mjs';

const tracker = new RealtimeTracker();
tracker.startAggregation();

// 작업 추적
tracker.trackRouting({ provider: 'claude', agent: 'executor' });
tracker.trackPerformance({ duration: 2500, success: true, provider: 'claude' });
tracker.trackCache({ hit: true, key: 'file:utils.js' });

// 통계 조회
const stats = tracker.getStats('hour');
console.log('성공률:', stats.performance.successRate + '%');
console.log('캐시 히트율:', stats.cache.hitRate + '%');

tracker.stopAggregation();
```

---

## 프로젝트 루트 탐지 (Project Root)

### 모듈 위치
`src/utils/project-root.mjs`

### 개요
다단계 Fallback 전략으로 프로젝트 루트를 탐지하여 상태 파일을 올바른 위치에 저장합니다.

### 탐지 우선순위

| 순서 | 방법 | 탐지 기준 |
|------|------|----------|
| 1 | Git 루트 | `.git/` 폴더 존재 |
| 2 | 프로젝트 마커 | `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml` 등 |
| 3 | Claude 마커 | `CLAUDE.md`, `AGENTS.md`, `.claude/` |
| 4 | 환경변수 | `$PROJECT_ROOT`, `$OMCM_ROOT` |
| 5 | 글로벌 Fallback | `~/.omcm/` |

### 함수

```javascript
import {
  findProjectRootSync,
  getStateDir,
  getStatePath,
  ensureStateDir,
  getProjectInfo,
  PROJECT_MARKERS
} from 'src/utils/project-root.mjs';

// 프로젝트 루트 탐지
const result = findProjectRootSync('/path/to/subdir');
// { root: '/path/to/project', method: 'git', isGlobal: false }

// 상태 디렉토리 경로
const stateDir = getStateDir();
// '/path/to/project/.omcm/state/'

// 특정 상태 파일 경로
const statePath = getStatePath('ultrawork-state.json');
// '/path/to/project/.omcm/state/ultrawork-state.json'

// 상태 디렉토리 생성
ensureStateDir();

// 전체 정보
const info = getProjectInfo();
// { root, method, isGlobal, stateDir, startDir, home }
```

---

## 상태 관리자 (State Manager)

### 모듈 위치
`src/utils/state-manager.mjs`

### 개요
중앙화된 상태 파일 읽기/쓰기를 제공합니다. 프로젝트 루트 탐지를 통해 서브디렉토리에서 호출해도 프로젝트 루트에 상태를 저장합니다.

### 상태 파일 타입

```javascript
import { STATE_FILES } from 'src/utils/state-manager.mjs';

// STATE_FILES = {
//   ULTRAWORK: 'ultrawork-state.json',
//   ULTRAPILOT: 'ultrapilot-state.json',
//   RALPH: 'ralph-state.json',
//   AUTOPILOT: 'autopilot-state.json',
//   ECOMODE: 'ecomode-state.json',
//   SWARM: 'swarm-state.json',
//   PIPELINE: 'pipeline-state.json',
//   ULTRAQA: 'ultraqa-state.json',
//   FUSION: 'fusion-state.json',
//   FALLBACK: 'fallback-state.json',
//   PROVIDER_LIMITS: 'provider-limits.json',
//   METRICS: 'metrics.json',
//   ROUTING_CACHE: 'routing-cache.json'
// }
```

### 핵심 함수

```javascript
import {
  readState,
  writeState,
  deleteState,
  stateExists,
  getActiveModes,
  deactivateAllModes,
  getFusionState,
  updateFusionState
} from 'src/utils/state-manager.mjs';

// 상태 읽기
const state = readState('ULTRAWORK', {
  startDir: process.cwd(),
  defaultValue: { active: false }
});

// 상태 쓰기 (프로젝트 루트에 저장)
writeState('ULTRAWORK', { active: true, count: 5 }, {
  startDir: process.cwd(),
  merge: true  // 기존 데이터와 병합
});

// 글로벌 위치에 저장
writeState('FUSION', { enabled: true }, { global: true });

// 상태 삭제
deleteState('ULTRAWORK');

// 상태 존재 확인
if (stateExists('RALPH')) { /* ... */ }

// 활성 모드 목록
const modes = getActiveModes();
// ['ultrawork', 'ralph']

// 모든 모드 비활성화
deactivateAllModes();

// 퓨전 상태 헬퍼 (항상 글로벌)
const fusion = getFusionState();
updateFusionState({ totalTasks: fusion.totalTasks + 1 });
```

### 예제: 서브디렉토리에서 상태 저장

```javascript
// docs/components/에서 실행해도
// 프로젝트 루트(package.json 위치)에 저장됨

import { writeState } from 'src/utils/state-manager.mjs';

// /project/docs/components/ 에서 실행
writeState('ULTRAWORK', { active: true });

// 결과: /project/.omcm/state/ultrawork-state.json 에 저장
// (NOT /project/docs/components/.omcm/state/)
```

---

## 에러 처리

모든 모듈은 표준 JavaScript 에러를 발생시킵니다.

```javascript
try {
  const result = await executor.executeTask(task);
} catch (err) {
  console.error('작업 실패:', err.message);
  // err.code: 'TIMEOUT' | 'CONNECTION_ERROR' | 'INVALID_TASK'
}
```

---

## 버전 정보

- 최소 Node.js 버전: 18.0.0
- 모듈 타입: ESM (ES6 modules)

---

## 라이선스

MIT
