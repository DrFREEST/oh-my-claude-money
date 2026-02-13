# OMCM v2.1.0 기능 가이드

OMCM (oh-my-claude-money) v2.1.0의 모든 기능에 대한 완전한 기술 참조 문서입니다. API 문서 및 사용 예제를 포함합니다.

## 목차

1. [퓨전 모드](#fusion-mode)
2. [CLI 직접 실행](#cli-direct-execution)
3. [실시간 추적 시스템](#realtime-tracking-system)
4. [컨텍스트 전송 시스템](#context-transfer-system)
5. [멀티 프로바이더 밸런싱](#multi-provider-balancing)
6. [병렬 실행기](#parallel-executor)

---

## 퓨전 모드 (Fusion Mode) {#fusion-mode}

퓨전 모드는 Claude (OMC)와 외부 프로바이더 (GPT, Gemini) 간에 작업을 지능적으로 라우팅하여 품질을 유지하면서 토큰 사용량을 최적화합니다.

### 개요

**주요 이점:**
- 22개 에이전트를 GPT/Gemini로 오프로드하여 62% Claude 토큰 절약
- 사용량 임계값 기반 자동 프로바이더 전환
- `hulw` 및 `ulw` 키워드를 통한 제로 설정 활성화
- 다양한 사용 사례를 위한 3가지 활성화 모드

### 에이전트-프로바이더 매핑 (v1.0.0)

35개 OMC 에이전트 모두 최적의 프로바이더에 지능적으로 매핑됩니다:

| 계층 | 개수 | 기본 모델 | 퓨전 모델 | 토큰 절약 |
|------|------|-----------|-----------|-----------|
| **HIGH** | 13 | Claude Opus 4.5 | Claude Opus 4.5 | - |
| **MEDIUM** | 10 | Claude Sonnet | GPT-5.2-Codex (with thinking) | 40% |
| **LOW** | 12 | Claude Haiku | Gemini 3.0 Flash (with thinking) | 70% |

**계층별 주요 에이전트:**

HIGH (Claude Opus - 변경 없음):
- `architect`, `planner`, `critic`, `analyst`
- `executor-high`, `explore-high`, `designer-high`
- `qa-tester-high`, `security-reviewer`, `code-reviewer`
- `scientist-high`, `researcher-high`, `build-fixer-high`

MEDIUM → GPT-5.2-Codex:
- `architect-medium`, `executor`, `explore-medium`
- `researcher`, `designer`, `vision`, `qa-tester`
- `scientist`, `build-fixer`, `tdd-guide`

LOW → Gemini 3.0 Flash:
- `architect-low`, `executor-low`, `explore`
- `writer`, `designer-low`, `researcher-low`
- `security-reviewer-low`, `build-fixer-low`, `code-reviewer-low`
- `tdd-guide-low`, `scientist-low`, `qa-tester-low`

### API 참조

#### 1. 하이브리드 울트라워크 (hulw)

**최대 병렬성을 가진 항상 활성 퓨전 모드**

```javascript
// 트리거 방법 (모두 동일)
/hulw <작업 설명>
hulw: <작업 설명>
<작업 설명> hulw
<작업 설명> with hulw
```

**특징:**
- 항상 퓨전 라우팅 사용 (사용량 임계값 없음)
- 호환 가능한 하위 작업의 병렬 실행 활성화
- OMC + OpenCode 워커를 동시에 결합
- 최적 사용처: 대규모 리팩토링, 멀티 컴포넌트 빌드

**사용 예제:**

```bash
# 예제 1: 전체 프로젝트 리팩토링
/hulw 개선된 오류 처리로 인증 모듈 리팩토링

# 예제 2: 멀티 컴포넌트 시스템 빌드
hulw: 데이터베이스 마이그레이션과 함께 REST API 생성

# 예제 3: 복잡한 구현
새 대시보드를 구현하자 hulw
```

**내부 동작:**
1. `hulw` 키워드 감지
2. mode='always'로 `fusionRouter` 활성화
3. 병렬 실행기에 작업 디스패치
4. Codex/Gemini CLI 준비 확인
5. 작업 분배: Claude는 아키텍처 처리, Codex/Gemini는 탐색 처리

#### 2. 자동 퓨전 울트라워크 (ulw)

**사용량 기반 자동 퓨전 전환**

```javascript
// 트리거 방법 (모두 동일)
/ulw <작업 설명>
ulw: <작업 설명>
<작업 설명> ulw
<작업 설명> with ultrawork
```

**모드 전환 로직:**
- **< 70% 사용량:** Claude 에이전트만 사용 (최고 품질)
- **70-90% 사용량:** 하이브리드 모드 (점진적 OpenCode 증가)
- **> 90% 사용량:** OpenCode 중심 (비용 최적화)

**사용 예제:**

```bash
# 현재 사용량에 따라 자동 전환됨
/ulw TypeScript 오류 수정

ulw: 메모리 누수 디버그

데이터베이스 쿼리를 최적화하자 with ulw
```

**복구 동작:**
- Claude 사용량이 85% 이하로 떨어질 때: Claude 우선으로 자동 복구
- 부드러운 전환: 활성 작업에 영향 없음

#### 3. 하이브리드 오토파일럿

**선택적 퓨전 지원을 제공하는 완전 자율 실행**

```javascript
// 기본 오토파일럿 (현재 퓨전 설정 사용)
/autopilot <아이디어>
autopilot: <아이디어>

// 명시적 퓨전 오토파일럿
/autopilot hulw <아이디어>
autopilot with fusion <아이디어>
```

**동작:**
- `fusionDefault: true`인 경우: 자동으로 퓨전 라우팅 사용
- `fusionDefault: false`인 경우: Claude 우선 사용, 90%에서 전환
- 계획, 실행, 검증 사이클 포함

**사용 예제:**

```bash
# 퓨전 활성화 (fusionDefault: true인 경우)
/autopilot 인증 기능이 있는 투두 애플리케이션 빌드

# 명시적 퓨전
autopilot hulw 실시간 데이터가 있는 대시보드 생성

# 표준 오토파일럿 (fusionDefault: false인 경우 Claude 우선)
/autopilot 사용자 관리 구현
```

### 설정

**위치:** `~/.claude/plugins/omcm/config.json`

```json
{
  "fusionDefault": false,
  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 3,
    "preferOpencode": ["explore", "researcher", "writer"],
    "preferClaude": ["architect", "executor-high", "critic"],
    "autoDelegate": true
  }
}
```

**주요 설정:**

| 설정 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `fusionDefault` | boolean | false | 모든 작업에 퓨전 활성화 |
| `usageThreshold` | number | 70 | 하이브리드 모드 활성화 % (ulw만 해당) |
| `maxOpencodeWorkers` | number | 3 | 최대 병렬 CLI 호출 수 (1-10 권장) |
| `preferOpencode` | array | [...] | 항상 OpenCode로 라우팅되는 에이전트 |
| `preferClaude` | array | [...] | 항상 Claude로 라우팅되는 에이전트 |
| `autoDelegate` | boolean | true | 작업 타입 기반 자동 라우팅 |

---

## CLI 직접 실행 (CLI Direct Execution) {#cli-direct-execution}

### 개요

OMCM v2.1.0은 Codex/Gemini CLI를 직접 실행하여 간결하고 효율적인 프로바이더 호출을 제공합니다. 서버 풀 오버헤드 없이 stateless 실행 모델을 사용합니다.

**성능 비교:**

| 모드 | 첫 호출 | 후속 호출 | 메모리 사용 |
|------|---------|-----------|------------|
| v1.x 서버 풀 | ~5s | ~1s | ~250MB/서버 |
| **v2.1 CLI 직접 실행** | ~3-5s | ~3-5s | 0 (stateless) |

**아키텍처:**
```
Request Queue
    ↓
CLI Executor (executeViaCLI)
    ↓
Direct CLI Invocation
│
├─ codex run --prompt "..." --model gpt-5.2
├─ gemini run --prompt "..." --model gemini-3.0-flash
└─ Parallel execution via Promise.all()
```

### API 참조

#### executeViaCLI 함수

**위치:** `src/executor/cli-executor.mjs`

##### 기본 사용법

```javascript
import { executeViaCLI } from 'src/executor/cli-executor.mjs';

const result = await executeViaCLI({
  provider: 'openai',      // 'openai' | 'google'
  model: 'gpt-5.2-codex',
  prompt: '코드 분석',
  projectDir: process.cwd(),
  timeout: 300000
});
// 반환: { success: boolean, stdout: string, stderr: string, exitCode: number, duration: number }
```

**옵션:**

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `provider` | string | - | 'openai' 또는 'google' |
| `model` | string | - | 모델 ID (예: 'gpt-5.2-codex') |
| `prompt` | string | - | 실행할 프롬프트 |
| `projectDir` | string | cwd | 작업 디렉토리 |
| `timeout` | number | 300000 | 타임아웃 (ms) |

##### CLI 설치 확인

```javascript
import { detectCLI } from 'src/executor/cli-executor.mjs';

const openaiAvailable = detectCLI('openai');
const googleAvailable = detectCLI('google');

if (openaiAvailable && googleAvailable) {
  console.log('모든 CLI 사용 가능');
}
```

**설치 확인 방법:**
```bash
# OpenAI Codex CLI 확인
which codex || echo "codex CLI 미설치"

# Google Gemini CLI 확인
which gemini || echo "gemini CLI 미설치"
```

### 병렬 실행

CLI는 stateless이므로 제한 없이 병렬 실행 가능:

```javascript
import { executeViaCLI } from 'src/executor/cli-executor.mjs';

const tasks = [
  { provider: 'openai', model: 'gpt-5.2-codex', prompt: '작업 1' },
  { provider: 'google', model: 'gemini-3.0-flash', prompt: '작업 2' },
  { provider: 'openai', model: 'gpt-5.2-codex', prompt: '작업 3' }
];

const results = await Promise.all(
  tasks.map(task => executeViaCLI(task))
);
```

### 사용 예제

```javascript
// 예제: CLI를 사용한 병렬 작업 실행

import { executeViaCLI, detectCLI } from 'src/executor/cli-executor.mjs';

async function parallelProcessing() {
  // CLI 사용 가능 여부 확인
  if (!detectCLI('openai') || !detectCLI('google')) {
    throw new Error('Codex 또는 Gemini CLI가 설치되지 않았습니다');
  }

  // 10개 병렬 작업 제출
  const tasks = [];
  for (var i = 0; i < 10; i++) {
    tasks.push(
      executeViaCLI({
        provider: i % 2 === 0 ? 'openai' : 'google',
        model: i % 2 === 0 ? 'gpt-5.2-codex' : 'gemini-3.0-flash',
        prompt: `파일 ${i}.ts 분석`,
        projectDir: process.cwd()
      })
    );
  }

  const results = await Promise.all(tasks);

  const successCount = results.filter(r => r.success).length;
  console.log(`완료된 작업: ${successCount}/${results.length}개`);

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`평균 응답 시간: ${avgDuration}ms`);
}
```

---

## 실시간 추적 시스템 (Realtime Tracking System) {#realtime-tracking-system}

### 개요

시간 기간(분/시간/일)별 이벤트 집계를 통해 라우팅 결정, 성능 지표 및 프로바이더 사용량을 실시간으로 추적합니다.

**구성 요소:**
- **RealtimeTracker**: 이벤트 스트리밍을 위한 인메모리 링 버퍼
- **MetricsCollector**: 통계 집계 및 비용 계산
- **TimeBucket**: 시간 윈도우 집계

### API 참조

#### RealtimeTracker 클래스

**위치:** `src/tracking/realtime-tracker.mjs`

##### 생성자

```javascript
import { RealtimeTracker } from 'src/tracking/index.mjs';

const tracker = new RealtimeTracker({
  capacity: 10000,        // 링 버퍼 크기
  emitInterval: 60000     // 통계 방출 간격 (ms)
});
```

##### 이벤트 추적

**라우팅 이벤트 기록:**
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

**최근 이벤트 가져오기:**
```javascript
const recent = tracker.getRecentEvents(100);
// 반환: 시간순으로 정렬된 마지막 100개 이벤트 배열
```

**통계 구독:**
```javascript
tracker.on('stats', (stats) => {
  console.log(`시간별 통계:`, stats);
  // {
  //   period: 'hour',
  //   routing: { total: 245, byProvider: {...}, byAgent: {...} },
  //   performance: { avgLatency: 1420, successRate: 0.98 },
  //   cache: { hitRate: 0.34 }
  // }
});
```

#### MetricsCollector 클래스

**위치:** `src/tracking/metrics-collector.mjs`

```javascript
import { MetricsCollector } from 'src/tracking/index.mjs';

const collector = new MetricsCollector();

// 라우팅 결정 기록
collector.recordRouting({
  provider: 'gemini',
  agent: 'writer',
  duration: 890
});

// 집계된 메트릭 가져오기
const metrics = collector.getMetrics('hour');
// 반환: {
//   routingCounts: { claude: 10, openai: 8, gemini: 5 },
//   avgLatencies: { claude: 1200, openai: 980, gemini: 750 },
//   costs: { claude: 0.42, openai: 0.28, gemini: 0.12 },
//   totalCost: 0.82
// }

// 프로바이더별 통계 가져오기
const providerStats = collector.getProviderStats('openai');
// 반환: {
//   requestCount: 23,
//   errorCount: 1,
//   avgLatency: 980,
//   totalTokens: 45600,
//   estimatedCost: 0.28
// }
```

### 사용 예제

```javascript
// 예제: 실시간 모니터링 대시보드

import { RealtimeTracker, MetricsCollector } from 'src/tracking/index.mjs';

const tracker = new RealtimeTracker({ capacity: 5000 });
const collector = new MetricsCollector();

// 추적 시작
tracker.on('stats', (stats) => {
  const metrics = collector.getMetrics('hour');

  console.log('=== 실시간 통계 ===');
  console.log(`총 라우팅: ${metrics.routingCounts.total}`);
  console.log(`성공률: ${(stats.performance.successRate * 100).toFixed(1)}%`);
  console.log(`캐시 적중률: ${(stats.cache.hitRate * 100).toFixed(1)}%`);
  console.log(`비용: $${metrics.totalCost.toFixed(2)}`);
});

// 요청 시뮬레이션
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

## 컨텍스트 전송 시스템 (Context Transfer System) {#context-transfer-system}

### 개요

세션 상태를 자동으로 캡처하고 Claude Code와 OpenCode 프로바이더 간 원활한 핸드오프를 가능하게 합니다.

**캡처되는 컨텍스트:**
- 현재 작업 설명
- 최근 수정된 파일
- 대기 중인 TODO 항목
- 세션 결정 사항 및 학습 내용
- Claude 사용량 지표

### API 참조

#### buildContext()

**위치:** `src/context/context-builder.mjs`

```javascript
import { buildContext } from 'src/context/index.mjs';

const context = buildContext({
  sessionId: 'session-abc123',
  projectPath: '/project',
  startTime: new Date().toISOString(),
  claudeUsage: { fiveHourUsage: 75, weeklyUsage: 45 },
  task: {
    description: '사용자 인증 구현',
    goal: '로그인 및 회원가입 페이지 추가',
    constraints: ['JWT 사용', 'SQLite DB']
  }
});

// 구조화된 컨텍스트 객체 반환
// {
//   task: { description, goal, constraints },
//   files: { modified: [...], referenced: [...] },
//   todos: { pending: [...], inProgress: [...], completed: [...] },
//   decisions: { recent: [...], learnings: [...] },
//   meta: { sessionId, startTime, buildTime, claudeUsage }
// }
```

#### ContextSerializer

**위치:** `src/context/context-serializer.mjs`

```javascript
import { serializeContextToMarkdown, serializeContextToJSON } from 'src/context/index.mjs';

// 사람이 읽을 수 있도록 마크다운으로 변환
const markdown = serializeContextToMarkdown(context);
// 생성: # 작업 핸드오프 컨텍스트
//       ## 세션 정보
//       ## 현재 작업
//       ...

// 프로그래밍 사용을 위해 JSON으로 변환
const json = serializeContextToJSON(context);
```

#### ContextSynchronizer

**위치:** `src/context/context-sync.mjs`

```javascript
import { ContextSynchronizer } from 'src/context/index.mjs';

const sync = new ContextSynchronizer({
  localPath: '/project/.omcm',
  remotePath: 'opencode://context'
});

// OpenCode로 컨텍스트 푸시
await sync.pushContext(context);

// OpenCode에서 업데이트 풀
const updated = await sync.pullContext();

// 변경사항 구독
sync.on('contextChanged', (newContext) => {
  console.log('컨텍스트 업데이트됨:', newContext);
});
```

### 핸드오프 파일 형식

**위치:** `.omcm/handoff/context.md`

```markdown
# 작업 핸드오프 컨텍스트

> Claude Code에서 OpenCode로 전환됨
> 생성 시간: 2026-01-28T15:30:00+09:00

---

## 세션 정보
| 항목 | 값 |
|------|-----|
| 프로젝트 경로 | `/opt/my-project` |
| 시간 | 2026-01-28T15:30:00+09:00 |
| 사용량 | 5시간: 87%, 주간: 45% |

## 현재 작업
로그인 기능 구현 중

## 미완료 TODO
- [ ] 비밀번호 검증 로직 추가
- [ ] 세션 관리 구현

## 최근 수정 파일
- src/auth/login.ts
- src/auth/signup.ts
- src/middleware/auth.ts

## 결정 사항
1. JWT 토큰 기반 인증 선택
2. Redis 사용 for 세션 관리

## 세션 학습
- bcrypt로 비밀번호 해싱
- CORS 설정 필수
```

### 사용 예제

```javascript
// 예제: 핸드오프 전 자동 컨텍스트 캡처

import { buildContext, serializeContextToMarkdown } from 'src/context/index.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function handoffToOpenCode() {
  // 현재 컨텍스트 빌드
  const context = buildContext({
    sessionId: crypto.randomUUID(),
    projectPath: process.cwd(),
    task: {
      description: '인증 모듈 리팩토링'
    }
  });

  // 마크다운으로 직렬화
  const markdown = serializeContextToMarkdown(context);

  // 핸드오프 파일 저장
  const handoffDir = join(process.cwd(), '.omcm', 'handoff');
  mkdirSync(handoffDir, { recursive: true });
  writeFileSync(
    join(handoffDir, 'context.md'),
    markdown,
    'utf-8'
  );

  console.log('컨텍스트가 .omcm/handoff/context.md에 저장되었습니다');
  console.log('OpenCode 핸드오프 준비 완료');
}
```

---

## 멀티 프로바이더 밸런싱 (Multi-Provider Balancing) {#multi-provider-balancing}

### 개요

4가지 설정 가능한 전략을 사용하여 Claude, GPT, Gemini 간 지능적 부하 분산을 수행합니다.

**전략:**
- **Round-Robin**: 공정한 분산 (균등한 워크로드에 적합)
- **Weighted**: 우선순위 기반 (claude:3, openai:2, gemini:2)
- **Latency**: 응답 시간 기반 (가장 빠른 프로바이더 사용)
- **Usage**: 비용/토큰 기반 (사용 가능한 용량에 따라 분산)

### API 참조

#### ProviderBalancer 클래스

**위치:** `src/router/balancer.mjs`

##### 생성자

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

**기본 설정:**
```javascript
{
  claude:  { weight: 3, priority: 1 },  // 최고 우선순위
  openai:  { weight: 2, priority: 2 },
  gemini:  { weight: 2, priority: 2 }
}
```

##### 밸런싱 메서드

**Round-Robin:**
```javascript
// 프로바이더를 순차적으로 순환
const provider = balancer.selectRoundRobin(['claude', 'openai', 'gemini']);
// 반환: 'claude', 그 다음 'openai', 그 다음 'gemini', 다시 'claude'...
```

**Weighted:**
```javascript
// 가중치에 따른 확률적 선택
// 가중치 분포: claude (3), openai (2), gemini (2)
// 확률: claude 42.8%, openai 28.6%, gemini 28.6%

const provider = balancer.selectWeighted(['claude', 'openai', 'gemini']);
// 반환: 42.8% 확률로 'claude'
```

**Latency-based:**
```javascript
// 평균 응답 시간이 가장 낮은 프로바이더 선택
balancer.recordLatency('claude', 1200);   // ms
balancer.recordLatency('openai', 980);
balancer.recordLatency('gemini', 750);

const provider = balancer.selectByLatency(['claude', 'openai', 'gemini']);
// 반환: 'gemini' (가장 빠름)
```

**Usage-based:**
```javascript
// 현재 토큰 사용량이 가장 낮은 프로바이더 선택
balancer.updateTokenUsage('claude', 45000);
balancer.updateTokenUsage('openai', 12000);
balancer.updateTokenUsage('gemini', 8000);

const provider = balancer.selectByUsage(['claude', 'openai', 'gemini']);
// 반환: 'gemini' (사용량 최소 = 용량 최대)
```

#### Selection Context

```javascript
// 고급: 컨텍스트 인식 선택
const context = {
  taskType: 'analysis',      // 'analysis' | 'execution' | 'creative'
  agentType: 'architect',
  tokenEstimate: 5000,
  excludeProviders: ['gemini']  // 이 작업에서 gemini 제외
};

const provider = balancer.selectWithContext(context);
// 반환: 'claude' 또는 'openai' (gemini 제외됨)
```

### 설정 (agent-mapping.json)

**위치:** `~/.claude/plugins/omcm/agent-mapping.json`

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
      "models": ["gpt-5.2", "gpt-5.2-codex"]
    },
    "gemini": {
      "weight": 2,
      "priority": 2,
      "models": ["gemini-3.0-pro", "gemini-3.0-flash"]
    }
  }
}
```

### 사용 예제

```javascript
// 예제: 스마트 프로바이더 선택

import { ProviderBalancer } from 'src/router/balancer.mjs';

const balancer = new ProviderBalancer({ strategy: 'latency' });

// 시간 경과에 따른 성능 추적
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

// 가장 빠른 프로바이더 선택
const nextProvider = balancer.selectByLatency(
  ['claude', 'openai', 'gemini']
);
console.log(`선택됨: ${nextProvider}`);  // 'gemini' 또는 'openai'

// 밸런서 통계 가져오기
const stats = balancer.getStats();
console.log(`평균 지연 시간:`, stats.latencies);
```

---

## 병렬 실행기 (Parallel Executor) {#parallel-executor}

### 개요

의존성 및 파일 충돌을 존중하면서 여러 작업을 병렬로 실행합니다. 작업을 최적의 프로바이더(Claude 또는 OpenCode)로 자동 라우팅합니다.

**기능:**
- 독립적인 작업의 병렬 실행
- 의존성 해결 및 위상 정렬
- 파일 충돌 감지 및 방지
- 작업별 자동 프로바이더 라우팅
- 실행 전략 선택 (run/serve/acp)

### API 참조

#### ParallelExecutor 클래스

**위치:** `src/orchestrator/parallel-executor.mjs`

##### 작업 정의

```javascript
// 단일 작업 구조
{
  id: 'task-1',
  description: '로그인 컨트롤러 구현',
  type: 'implementation',        // 'analysis' | 'implementation' | 'test' | 'review'
  files: [                       // 이 작업이 수정할 파일
    'src/auth/login.ts',
    'src/auth/login.test.ts'
  ],
  dependsOn: [],                 // 이 작업이 의존하는 작업 ID
  provider: 'auto',              // 'claude' | 'openai' | 'gemini' | 'auto'
  agent: 'executor',             // 라우팅을 위한 에이전트 타입
  timeout: 30000                 // ms
}
```

##### 병렬 실행

```javascript
import { ParallelExecutor, canRunInParallel } from 'src/orchestrator/parallel-executor.mjs';

const tasks = [
  {
    id: 'task-1',
    description: '사용자 서비스 구현',
    type: 'implementation',
    files: ['src/services/user.ts']
  },
  {
    id: 'task-2',
    description: '인증 서비스 구현',
    type: 'implementation',
    files: ['src/services/auth.ts']
  },
  {
    id: 'task-3',
    description: '통합 테스트 작성',
    type: 'test',
    files: ['src/__tests__/integration.test.ts'],
    dependsOn: ['task-1', 'task-2']  // 두 서비스에 의존
  }
];

// 병렬 실행 가능 여부 확인
const check = canRunInParallel(tasks);
console.log(check);
// {
//   canParallel: false,
//   reason: '작업 간 의존성이 존재합니다',
//   conflicts: []
// }

// 적절한 순서로 실행
const executor = new ParallelExecutor({
  maxConcurrent: 3,
  strategy: 'hybrid'  // 'parallel' | 'sequential' | 'hybrid'
});

const results = await executor.executeTasks(tasks);
// Task 1과 2가 병렬로 실행됨
// Task 3는 둘 다 완료되기를 기다린 후 실행됨
```

##### 파일 충돌 감지

```javascript
// 충돌하는 작업 감지
const conflictingTasks = [
  {
    id: 'refactor-1',
    files: ['src/auth.ts']
  },
  {
    id: 'refactor-2',
    files: ['src/auth.ts']  // 같은 파일!
  }
];

const check = canRunInParallel(conflictingTasks);
console.log(check);
// {
//   canParallel: false,
//   reason: '파일 충돌이 감지되었습니다',
//   conflicts: [
//     { file: 'src/auth.ts', tasks: [0, 1] }
//   ]
// }
```

#### 실행 전략

**위치:** `src/orchestrator/execution-strategy.mjs`

```javascript
import { selectStrategy, analyzeTask } from 'src/orchestrator/execution-strategy.mjs';

const task = {
  type: 'implementation',
  description: '데이터베이스 스키마 마이그레이션 추가',
  agent: 'executor'
};

// 작업을 분석하여 최상의 실행 접근법 결정
const analysis = analyzeTask(task);
// {
//   inferredType: 'implementation',
//   complexity: 'medium',
//   estimatedDuration: 8000
// }

// 실행 전략 선택
const strategy = selectStrategy(task);
console.log(strategy);
// {
//   mode: 'run',              // 'run' | 'serve' | 'acp'
//   parallelizable: true,
//   routeToOpenCode: false,
//   options: { ... }
// }
```

**실행 모드:**

| 모드 | 사용 사례 | 프로바이더 | 속도 |
|------|----------|------------|------|
| `run` | 일회성 명령 | Claude/OpenCode | 빠름 |
| `serve` | 장기 실행 서비스 | OpenCode | 느린 시작, 지속적 |
| `acp` | 에이전트-프로바이더 프로토콜 | OpenCode | 유연하고 기능 풍부 |

### 사용 예제

```javascript
// 예제: 병렬 프로젝트 리팩토링

import { ParallelExecutor } from 'src/orchestrator/parallel-executor.mjs';

async function refactorProject() {
  const tasks = [
    {
      id: 'refactor-auth',
      description: '인증 모듈 리팩토링',
      files: ['src/auth/**/*.ts'],
      type: 'refactoring'
    },
    {
      id: 'refactor-api',
      description: 'API 라우트 리팩토링',
      files: ['src/api/**/*.ts'],
      type: 'refactoring'
    },
    {
      id: 'refactor-db',
      description: '데이터베이스 레이어 리팩토링',
      files: ['src/db/**/*.ts'],
      type: 'refactoring'
    },
    {
      id: 'run-tests',
      description: '모든 테스트 실행',
      files: [],
      dependsOn: ['refactor-auth', 'refactor-api', 'refactor-db'],
      type: 'test'
    }
  ];

  const executor = new ParallelExecutor({
    maxConcurrent: 3,
    strategy: 'hybrid'
  });

  console.log('병렬 리팩토링 시작...');
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

  console.log(`\n완료됨: ${passCount}/${results.length} 작업`);
}
```

---

## 통합 예제

### 전체 워크플로우: 퓨전을 사용한 병렬 프로젝트 빌드

```javascript
/**
 * 전체 예제: 모든 OMCM 기능을 사용하여 멀티 컴포넌트 시스템 빌드
 */

import { ParallelExecutor } from 'src/orchestrator/parallel-executor.mjs';
import { executeViaCLI, detectCLI } from 'src/executor/cli-executor.mjs';
import { buildContext } from 'src/context/index.mjs';
import { RealtimeTracker, MetricsCollector } from 'src/tracking/index.mjs';

async function buildComplexSystem() {
  // 1. 추적 초기화
  const tracker = new RealtimeTracker();
  const collector = new MetricsCollector();

  // 2. CLI 사용 가능 여부 확인
  if (!detectCLI('openai') || !detectCLI('google')) {
    throw new Error('Codex 또는 Gemini CLI가 설치되지 않았습니다');
  }

  // 3. 잠재적 핸드오프를 위한 컨텍스트 캡처
  const context = buildContext({
    projectPath: process.cwd(),
    task: {
      description: '마이크로서비스 플랫폼 빌드',
      constraints: ['Docker', 'Kubernetes']
    }
  });

  // 4. 병렬 작업 정의
  const tasks = [
    {
      id: 'backend-api',
      description: 'REST API 구현',
      files: ['src/api/**'],
      type: 'implementation',
      agent: 'executor'
    },
    {
      id: 'frontend-ui',
      description: 'React 대시보드 빌드',
      files: ['src/ui/**'],
      type: 'implementation',
      agent: 'designer'  // OpenCode (Gemini)로 라우팅됨
    },
    {
      id: 'devops-docker',
      description: 'Docker 컨테이너 설정',
      files: ['docker/**', '.dockerignore'],
      type: 'implementation',
      agent: 'architect'  // 높은 복잡도 → Claude
    },
    {
      id: 'tests',
      description: '통합 테스트 작성',
      files: ['src/__tests__/**'],
      type: 'test',
      dependsOn: ['backend-api', 'frontend-ui']
    }
  ];

  // 5. 병렬 실행기로 실행
  const executor = new ParallelExecutor({
    maxConcurrent: 3,
    strategy: 'hybrid'
  });

  console.log('시스템 빌드 중...');
  const results = await executor.executeTasks(tasks);

  // 6. 메트릭 수집
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

  // 7. 결과 보고
  const metrics = collector.getMetrics('hour');
  console.log('=== 빌드 완료 ===');
  console.log(`작업: ${results.filter(r => r.success).length}/${results.length} ✓`);
  console.log(`비용: $${metrics.totalCost.toFixed(2)}`);
  console.log(`평균 지연 시간: ${metrics.avgLatencies}ms`);
}

// 퓨전 모드로 실행
buildComplexSystem().catch(console.error);
```

---

## 성능 벤치마크

### 토큰 절약

**기준선:** 표준 Claude 전용 작업

| 작업 | Claude 전용 | 퓨전 사용 | 절약 |
|------|-------------|-----------|------|
| 코드 탐색 (10개 파일) | 450 tokens | 180 tokens | 60% |
| UI 컴포넌트 검토 | 320 tokens | 95 tokens | 70% |
| 코드 리팩토링 (5개 파일) | 1200 tokens | 480 tokens | 60% |
| **100개 작업 평균** | - | - | **62%** |

### 실행 속도

| 모드 | 첫 호출 | 후속 호출 | 총 10개 작업 |
|------|---------|-----------|--------------|
| CLI (풀 없음) | 12s | 11s | 122s |
| **서버 풀 (1개 서버)** | 4s | 1.2s | 16s |
| **서버 풀 (5개 서버)** | 5s | 작업당 1.1s | 6s |

**병렬 속도 향상:** 5개 서버 = 독립적인 작업에 대해 약 20배 더 빠름

---

## 버전 호환성

**v2.1.0 기능:**
- ✅ CLI 직접 실행 (v2.1.0 신규)
- ✅ 실시간 추적 (v1.0.0+)
- ✅ 컨텍스트 전송 (v1.0.0+)
- ✅ 멀티 프로바이더 밸런싱 (v1.0.0+)
- ✅ 병렬 실행기 (v1.0.0+)
- ✅ 퓨전 모드 (v0.3.0+)
- ✅ 에이전트 매핑 (v0.5.0+)
- ✅ 동적 라우팅 (v0.8.0+)

**주요 변경 사항 (v2.1.0):**
- 서버 풀 제거, CLI 직접 실행으로 전환
- 메모리 사용량 감소 (stateless 모델)
- 무제한 병렬 처리 지원

**마이그레이션:**
- `OpenCodeServerPool` → `executeViaCLI` 함수로 교체
- `opencode-server.sh` 스크립트 더 이상 사용하지 않음
- Codex/Gemini CLI 설치 필요 (`which codex`, `which gemini`로 확인)

### v2.1.3 호환성 업데이트

**새로운 기능:**
- **z.ai 프로바이더 지원**: ANTHROPIC_BASE_URL이 z.ai 호스트를 가리킬 때 GLM API를 통해 사용량 조회
- **Monthly 사용량 표시**: HUD에 `mo:XX%` 형식으로 월간 사용량 표시 (OMC v4.2.6+)
- **provider-limits monthly 필드**: updateClaudeLimits()에 monthlyPercent 3번째 인자 추가

**호환 버전:**
- OMC v4.2.6 이상 (monthly 사용량 표시 지원)
- z.ai API 프로바이더 지원

---

## 더 보기

- [README.md](../../README.md) - 프로젝트 개요 및 빠른 시작
- [CHANGELOG.md](../../CHANGELOG.md) - 버전 히스토리 및 릴리즈 노트
- [설정 가이드](../CONFIG.md) - 상세한 설정 옵션
- [API 레퍼런스](../API.md) - 완전한 API 문서
