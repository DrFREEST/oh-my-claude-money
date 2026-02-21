# OMCM (oh-my-claude-money) v2.1.5 아키텍처

> **버전 기준 (OMC 4.2.15):** 본 문서는 `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, `gemini-3-pro`를 기본으로 설명합니다. `researcher`, `tdd-guide`, `*-low`/`*-medium` 표기는 하위호환(legacy) 맥락에서만 유지됩니다.

## 개요

OMCM은 Claude Code와 OpenCode를 통합하는 퓨전 오케스트레이터입니다. 단일 메타 오케스트레이터(Claude Opus 4.6)가 작업을 분석하여 35개의 OMC 에이전트 또는 OpenCode의 다중 프로바이더 에이전트로 라우팅합니다.

**핵심 목표**: Claude 토큰 62% 절약 + 병렬 처리 성능 향상 + 자동 폴백 시스템

```
┌─────────────────────────────────────────────────────────────────────┐
│              메타 오케스트레이터 (Claude Opus 4.6)                    │
│                     "지휘자 역할"                                    │
├─────────────────────────────────────────────────────────────────────┤
│                              ↓                                      │
│              ┌────────────────────────────┐                        │
│              │    퓨전 라우터 로직        │                        │
│              │ "어떤 LLM이 최적인가?"      │                        │
│              │ (1. 폴백 2. 리밋 3. 모드)  │                        │
│              └────────────────────────────┘                        │
│                    ↓              ↓                                 │
│     ┌──────────────────┐ ┌──────────────────────────┐             │
│     │ oh-my-claudecode │ │  Codex/Gemini CLI        │             │
│     │ (Claude 토큰)    │ │ (직접 실행)              │             │
│     │                  │ │                          │             │
│     │ • planner        │ │ • codex exec --json      │             │
│     │ • executor       │ │ • gemini -p=. --yolo     │             │
│     │ • critic         │ │ • Stateless 실행         │             │
│     └──────────────────┘ └──────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. 핵심 구성요소

### 1.1 퓨전 라우터 (src/hooks/fusion-router-logic.mjs)

퓨전 라우팅 결정 엔진입니다. 4단계 의사결정 트리를 통해 각 작업을 최적의 프로바이더로 라우팅합니다.

#### 라우팅 우선순위 (의사결정 순서)

```
1. 폴백 활성화 상태 체크
   └─ fallbackActive === true → OpenCode로 강제 라우팅

2. Claude 리밋 체크
   └─ 5시간/주간 중 하나라도 ≥ 90% → OpenCode 라우팅

3. 퓨전 모드 체크
   ├─ fusionDefault === true → planner 제외 모든 에이전트 OpenCode
   └─ save-tokens 모드 → 토큰 절약 에이전트 22개만 OpenCode

4. 기본값 → Claude에서 실행
```

#### 핵심 함수

```javascript
shouldRouteToOpenCode(toolInput, options)
```

**입력**: `{ subagent_type: 'oh-my-claudecode:architect', ... }`

**출력**:
```javascript
{
  route: true,                      // 라우팅 여부
  reason: 'claude-limit-92%',       // 결정 사유
  targetModel: {
    id: 'gpt-5.3-codex',
    name: 'GPT-5.3 Codex'
  },
  opencodeAgent: 'build'           // OpenCode 매핑 에이전트 (OMO: build/explore/plan/general)
}
```

#### 에이전트 매핑 (35개 라우팅)

| OMC 에이전트 | 라우팅 대상 | 모델 | 이유 |
|-------------|-----------|------|------|
| architect-low | OMO explore | Gemini 3 Flash | 빠른 분석 |
| architect-medium | OMO build | GPT-5.3-Codex | 중간 복잡도 |
| researcher | OMO general | GPT-5.3-Codex | 비용 효율 |
| explore | OMO explore | Gemini 3 Flash | 빠른 탐색 |
| explore-medium | OMO explore | GPT-5.3-Codex | 깊은 탐색 |
| designer | OMO build | GPT-5.3-Codex | UI 작업 |
| writer | OMO general | Gemini 3 Flash | 문서 작성 |
| vision | OMO general | GPT-5.3-Codex | 이미지 분석 |
| code-reviewer-low | OMO build | Gemini 3 Flash | 간단한 리뷰 |
| security-reviewer-low | OMO build | Gemini 3 Flash | 빠른 검사 |
| **HIGH 13개** (architect, planner, critic 등) | Claude (유지) | Claude Opus | 높은 품질 (fallbackToOMC) |

### 1.2 CLI 직접 실행 엔진 (src/executor/cli-executor.mjs)

Codex/Gemini CLI를 직접 호출하여 상태 없는(stateless) 실행을 제공합니다.

#### CLI 실행 아키텍처

```
요청 도착
    ↓
┌─────────────────────────────┐
│ CLI 감지 (detectCLI)        │
│ - codex: 설치 확인          │
│ - gemini: 설치 확인         │
└─────────────────────────────┘
    ↓
executeViaCLI()
    ↓
┌─────────────────────────────┐
│ Codex CLI 실행              │
│ codex exec -m MODEL         │
│   --json --full-auto        │
└─────────────────────────────┘
    또는
┌─────────────────────────────┐
│ Gemini CLI 실행             │
│ gemini -p=. --yolo          │
│ (Codex 미설치 시 폴백)      │
└─────────────────────────────┘
    ↓
결과 반환 (JSONL 또는 텍스트)
```

#### 인터페이스

```javascript
import { executeViaCLI, detectCLI } from '../executor/cli-executor.mjs';

// CLI 존재 확인
var hasCodex = detectCLI('codex');
var hasGemini = detectCLI('gemini');

// 실행
var result = await executeViaCLI({
  prompt: 'task instructions',
  provider: 'openai',  // 또는 'google'
  model: 'gpt-5.3-codex',  // optional
  agent: 'oracle',
  timeout: 300000,
  cwd: '/path/to/project'
});
// 결과: { success, output, tokens: {...}, error, duration, provider }
```

#### 특징

- **Stateless**: 각 호출마다 새 프로세스 (서버 유지 불필요)
- **자동 폴백**: Gemini 미설치 시 Codex로 자동 전환
- **JSONL 파싱**: Codex stdout을 실시간 파싱
- **타임아웃**: 기본 5분, 설정 가능

### 1.3 병렬 실행기 (src/orchestrator/parallel-executor.mjs)

여러 작업을 병렬, 순차, 또는 하이브리드 방식으로 실행합니다.

#### 실행 모드

```
ParallelExecutor
  ├─ executeParallel(tasks, maxWorkers)
  │  └─ 워커 풀로 독립적인 작업 동시 실행
  │
  ├─ executeSequential(tasks)
  │  └─ 작업을 순서대로 실행
  │
  └─ executeHybrid(tasks)
     └─ 의존성별로 그룹화 + 각 그룹 병렬 실행
```

#### 병렬 실행 가능 판단

```javascript
canRunInParallel(tasks)
// 체크 항목:
// 1. 작업 2개 이상?
// 2. 작업 간 의존성 없음?
// 3. 파일 충돌 없음?
```

#### 파일 충돌 감지

```javascript
Task 1: files: ['src/auth.js', 'src/db.js']
Task 2: files: ['src/auth.js']  // ← 충돌! 순차 실행으로 변경

결과:
{
  canParallel: false,
  reason: '작업 간 파일 충돌이 존재합니다',
  conflicts: [
    { file: 'src/auth.js', tasks: [0, 1] }
  ]
}
```

#### 워커 풀 구현

```
작업 큐: [T1, T2, T3, T4, T5]
최대 워커: 3

초기 상태:
W1: T1 진행 중   W2: T2 진행 중   W3: T3 진행 중   [T4, T5] 대기

W1 완료 시:
W1: T4 시작     W2: T2 진행 중   W3: T3 진행 중   [T5] 대기

모든 작업 완료 → 결과 반환
```

### 1.4 컨텍스트 시스템 (src/context/)

프로바이더 전환 시 작업 컨텍스트를 자동으로 수집 및 전달합니다.

#### 컨텍스트 빌더

```javascript
buildContext(session)
// 수집 항목:
// ├─ task: 현재 작업 설명/목표/제약사항
// ├─ files: 최근 수정 파일 10개 + 참조 파일
// ├─ todos: 미완료/진행중/완료 상태별 분류
// ├─ decisions: 최근 결정사항 + 학습 내용
// └─ meta: 세션 ID, 시간, 사용량, 빌드 시간
```

#### 핸드오프 파일 생성

```markdown
# 작업 핸드오프 컨텍스트

> Claude Code에서 OpenCode로 전환됨
> 생성 시간: 2026-01-23T21:00:00+09:00

## 세션 정보
| 항목 | 값 |
|------|-----|
| 프로젝트 경로 | `/opt/my-project` |
| 사용량 | 5시간: 92%, 주간: 67% |

## 현재 작업
로그인 기능 구현 중

## 미완료 TODO
- [ ] 비밀번호 검증 로직
- [ ] 세션 타임아웃 처리

## 최근 수정 파일
src/auth/login.ts
src/session/manager.ts
```

**저장 경로**: `.omcm/handoff/context.md`

### 1.5 추적 시스템 (src/tracking/)

실시간 사용량, 라우팅, 성능 메트릭을 추적합니다.

#### 실시간 추적기 (RealtimeTracker, RingBuffer 기반)

```javascript
// 메모리 효율적인 순환 버퍼 (최대 N개 이벤트만 유지)
tracker.recordEvent({
  type: 'routing',
  timestamp: Date.now(),
  agent: 'architect',
  provider: 'opencode',
  responseTime: 245   // ms
});

// 최근 100개 이벤트만 메모리에 유지
tracker.getRecent(10)  // 최근 10개 반환
```

#### 메트릭 수집기 (MetricsCollector, 시간별 집계)

```
분 단위:
├─ routing.total: 50
├─ routing.byProvider: { claude: 30, openai: 15, gemini: 5 }
└─ routing.byAgent: { architect: 10, executor: 20, ... }

시간 단위:
└─ [위와 동일한 구조] × 60분

일 단위:
└─ [위와 동일한 구조] × 24시간

성능:
├─ totalDuration: 12500 (ms)
├─ count: 50
├─ successes: 48
├─ failures: 2
└─ cache.hits: 35
```

---

## 2. v2.3.0 독립 MCP 서버 레이어

기존 훅 기반 아키텍처에 독립 MCP 서버 레이어 추가:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Claude Code (사용자)                        │
├─────────────────────────────────────────────────────────────────┤
│  기존 레이어 (훅 기반)          │  새 레이어 (MCP 서버)            │
│  • fusion-router (Task 차단)   │  • omcm_fusion_analyze          │
│  • HUD (사용량 추적)            │  • omcm_index_build/search      │
│  • 스킬/에이전트 래퍼           │  • omcm_memory_remember/recall   │
│                                │  (글로벌: ~/.claude/mcp-config) │
└─────────────────────────────────────────────────────────────────┘
         ↓                              ↓
  Codex/Gemini CLI              SQLite FTS5 (로컬)
  (ask_codex/ask_gemini)        (~/.omcm/index.db, memory.db)
```

### 데이터 흐름 (MCP 서버)

```
사용자 → omcm_fusion_analyze
       → merger.mjs (buildCodexPrompt + buildGeminiPrompt)
       → cli-runner.mjs (Promise.allSettled 병렬)
           ├→ codex exec (OpenAI)
           └→ gemini CLI (Google)
       → mergeResults() → 합성 응답

사용자 → omcm_index_search
       → indexer.mjs → SQLite FTS5 쿼리
       → 파일 위치 + 코드 스니펫 반환

사용자 → omcm_memory_remember
       → db.mjs → ~/.omcm/memory.db 저장
       → 다음 세션에서 omcm_memory_recall로 복원
```

### 스택

| 컴포넌트 | 기술 |
|----------|------|
| MCP 프로토콜 | `@modelcontextprotocol/sdk ^1.26.0` |
| 데이터 저장 | `better-sqlite3` + FTS5 |
| 검증 | `zod ^3.24.0` |
| 임베딩 | FTS5 (현재) → `@huggingface/transformers v3.x` (예정) |

---

## 3. 데이터 흐름

### 2.1 작업 요청부터 실행까지

```
1. 사용자 요청 (프롬프트 입력)
   │
   ├─ /hulw, /ulw, autopilot 키워드 감지
   ├─ 퓨전 모드 활성화
   │
2. Fusion Router Logic 실행
   │
   ├─ FUSION_STATE_FILE 읽음
   ├─ FALLBACK_STATE_FILE 읽음
   ├─ PROVIDER_LIMITS_FILE 읽음 (Claude 사용량)
   ├─ CONFIG_FILE 읽음 (사용자 설정)
   │
3. 라우팅 결정
   │
   ├─ shouldRouteToOpenCode() 호출
   │  ├─ 폴백 활성화? → OpenCode 강제
   │  ├─ Claude 리밋 ≥ 90%? → OpenCode 라우팅
   │  ├─ save-tokens 모드? → 토큰 절약 에이전트 라우팅
   │  └─ 기본값 → Claude 유지
   │
4. 결정 로깅
   │
   └─ ROUTING_LOG_FILE에 기록 (JSON Lines 형식)
      {
        "timestamp": "2026-01-28T...",
        "toolName": "oh-my-claudecode:architect",
        "subagentType": "architect-medium",
        "decision": "route",
        "reason": "claude-limit-92%",
        "target": "opencode"
      }

5. 작업 실행
   │
   ├─ route === true
   │  └─ Codex/Gemini CLI로 위임
   │     ├─ CLI 감지 (detectCLI)
   │     ├─ executeViaCLI() 호출
   │     └─ 프롬프트 실행 (stateless)
   │
   └─ route === false
      └─ Claude에서 직접 실행
```

### 2.2 병렬 실행 흐름

```
ParallelExecutor.executeParallel([T1, T2, T3, T4, T5])
│
├─ 파일 충돌 검사
│  ├─ T1, T2 충돌 → 순차 실행 그룹
│  ├─ T3, T4 독립 → 병렬 실행 가능
│  └─ T5 독립 → 병렬 실행 가능
│
├─ 의존성 기반 그룹화
│  ├─ [T1, T2] 그룹 (순차)
│  ├─ [T3, T4, T5] 그룹 (병렬 가능)
│
├─ CLI 실행 환경 확인
│  └─ detectCLI('codex') / detectCLI('gemini')
│
├─ 그룹 1: 순차 실행
│  ├─ T1 실행 (완료 대기)
│  └─ T2 실행 (T1 완료 후)
│
├─ 그룹 2: 병렬 실행
│  ├─ W1: T3 실행
│  ├─ W2: T4 실행
│  └─ W3: T5 실행
│     (모두 동시)
│
└─ 결과 통합 및 반환
```

### 2.3 폴백 시스템 흐름

```
Claude 리밋 체크 (5시간/주간 사용량)
│
├─ < 70% → 정상 모드 (Claude 우선)
├─ 70~90% → 경고 (save-tokens 모드 제안)
│  └─ 자동 전환 안 함 (사용자 확인 필수)
│
└─ ≥ 90% → 폴백 활성화
   │
   ├─ fallbackActive = true 설정
   ├─ currentModel = GPT-5.3-Codex 설정
   │
   └─ 이후 모든 요청
      └─ shouldRouteToOpenCode() → OpenCode 강제
```

---

## 4. 프로바이더 밸런싱

### 3.1 밸런서 전략 (src/router/balancer.mjs)

4가지 선택 전략으로 프로바이더를 동적으로 분배합니다.

#### 전략 비교

| 전략 | 장점 | 단점 | 사용 사례 |
|------|------|------|----------|
| **round-robin** | 공평한 분배 | 성능 차이 무시 | 기본값 |
| **weighted** | 우선순위 고려 | 동적 조정 불가 | Claude:3, OpenAI:2, Gemini:2 |
| **latency** | 응답 속도 우선 | 오버헤드 추적 | 실시간 작업 |
| **usage** | 부하 분산 | 초기화 필요 | 토큰 절약 모드 |

#### 라운드로빈 구현

```javascript
providers = ['claude', 'openai', 'gemini']
index = 0

요청 1 → index = (0+1) % 3 = 1 → openai 선택
요청 2 → index = (1+1) % 3 = 2 → gemini 선택
요청 3 → index = (2+1) % 3 = 0 → claude 선택
```

#### 가중치 기반 선택 (확률적)

```javascript
weights = {
  claude: 3,   // 60% 확률
  openai: 2,   // 40% 확률
  gemini: 1    // 20% 확률
}

총 가중치 = 6

요청:
rand = 0.5 × 6 = 3
├─ claude 가중치 3: 3 > 3 → 통과, rand -= 3 → 0
└─ 0 ≤ 0 → claude 선택 (확률 50%)
```

#### 지연시간 기반 선택 (지수 이동 평균 EMA)

```javascript
// 새 샘플이 들어올 때마다 가중치 적용
EMA_ALPHA = 0.3  // 최근 데이터에 30% 가중치

새 측정값 = 200ms
이전 EMA = 150ms

새 EMA = 0.3 × 200 + 0.7 × 150
       = 60 + 105
       = 165ms  // 더 부드러운 변화
```

### 3.2 프로바이더 밸런서 클래스

```javascript
const balancer = new ProviderBalancer({
  providers: {
    claude: { weight: 3, priority: 1, enabled: true },
    openai: { weight: 2, priority: 2, enabled: true },
    gemini: { weight: 2, priority: 2, enabled: true }
  },
  defaultStrategy: 'weighted'
});

// 선택
const result = balancer.selectProvider('latency', {
  taskType: 'analysis',
  agentType: 'architect',
  excludeProviders: ['claude']  // Claude 제외
});
// → { provider: 'openai', reason: 'Latency-based...' }

// 성능 기록
balancer.recordLatency('openai', 245);    // 245ms
balancer.recordUsage('gemini', 1500);     // 1500 토큰
balancer.recordError('gemini');           // 오류 카운트

// 통계 조회
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

## 5. OMC 통합

### 4.1 훅 시스템 (src/hooks/)

Claude Code의 훅 시스템을 통해 자동으로 통합됩니다.

#### hooks.json 정의

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs", "timeout": 120 }]
      },
      {
        "matcher": "Read",
        "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/read-optimizer.mjs", "timeout": 5 }]
      },
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/bash-optimizer.mjs", "timeout": 5 }]
      }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/detect-handoff.mjs", "timeout": 5 }] }
    ],
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/session-start.mjs", "timeout": 3 }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/persistent-mode.mjs", "timeout": 5 }] }
    ],
    "PostToolUse": [
      {
        "matcher": "Read|Edit|Bash|Grep|Glob|Task",
        "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/tool-tracker.mjs", "timeout": 5 }]
      }
    ]
  }
}
```

#### 훅 동작 순서

```
세션 시작 → SessionStart (session-start.mjs)
              └─ 사용량 정보 로드

사용자 프롬프트 → UserPromptSubmit (detect-handoff.mjs)
                   └─ 키워드/임계치 체크

도구 호출 전 → PreToolUse
              ├─ Task → fusion-router.mjs (퓨전 라우팅 결정)
              ├─ Read → read-optimizer.mjs (읽기 최적화)
              └─ Bash → bash-optimizer.mjs (명령어 최적화)

도구 호출 후 → PostToolUse (tool-tracker.mjs)
              └─ 도구 사용 추적

세션 종료 → Stop (persistent-mode.mjs)
              └─ 활성 모드 확인
```

### 4.2 OMC 에이전트 위임 구조

```
Claude Opus 4.6 (메인 오케스트레이터)
│
├─ 에이전트 호출
│  └─ Task(subagent_type='oh-my-claudecode:architect')
│     │
│     └─ fusion-router-hook 실행
│        ├─ shouldRouteToOpenCode() 호출
│        │  ├─ 라우팅 결정
│        │  └─ logging
│        │
│        └─ 라우팅 결과
│           ├─ route=true → OpenCode 위임
│           │  └─ executeOpenCode(...)
│           └─ route=false → Claude 유지
│              └─ OMC 에이전트 직접 호출
```

### 4.3 HUD 연동 (src/hud/)

oh-my-claudecode HUD에 퓨전 상태를 표시합니다.

#### HUD 표시 포맷

```
C:1.2k↓ 567↑|O:25.8k↓ 9↑|G:165.3k↓ 1.4k↑
└─────────────────────────────────────────
  C: Claude      O: OpenAI      G: Gemini
  ↓: 입력        ↑: 출력        k: ×1000
```

#### 데이터 수집

```
FUSION_STATE_FILE (5초마다 갱신)
├─ routedToOpenCode: 이전 요청 중 OpenCode로 간 개수
├─ byProvider: { gemini: 15, openai: 8, anthropic: 25 }
└─ estimatedSavedTokens: 18000

메트릭 계산:
- Gemini: 최근 요청 중 Flash 사용 개수 × 평균 토큰
- OpenAI: 최근 요청 중 Codex 사용 개수 × 평균 토큰
- Claude: 나머지
```

---

## 6. 설정

### 5.1 설정 파일 위치

```
~/.claude/plugins/omcm/config.json
```

### 5.2 설정 옵션

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

### 5.3 상태 파일

```
~/.omcm/
├─ fusion-state.json          # 퓨전 라우팅 통계
├─ fallback-state.json        # 폴백 활성화 상태
├─ provider-limits.json       # 프로바이더 리밋 정보
├─ routing-log.jsonl          # 라우팅 결정 로그
└─ handoff/
   └─ context.md              # 핸드오프 컨텍스트
```

---

## 7. 실행 전략

### 6.1 ExecutionStrategy (src/orchestrator/execution-strategy.mjs)

작업 유형별로 최적의 실행 전략을 선택합니다.

#### 전략 선택 로직

```
Task 분석
  ├─ type = 'run' (CLI 직접 실행)
  │  └─ executeViaCLI() 호출
  │
  └─ type = 'cli' (기본값)
     └─ Codex/Gemini CLI로 stateless 실행
```

#### 각 전략의 특징

| 전략 | 프로토콜 | 초기화 시간 | 사용 사례 | 장점 |
|------|---------|------------|----------|------|
| **cli** | CLI 직접 호출 | 즉시 | 모든 작업 | Stateless, 간단 |
| **run** | CLI 직접 호출 | 즉시 | 단발성 작업 | 리소스 효율적 |

### 6.2 TaskRouter (src/orchestrator/task-router.mjs)

작업 특성에 따라 Claude 또는 OpenCode로 라우팅합니다.

```javascript
routeTask(type)
// 입력: task type (예: 'analyzer', 'executor', 'explorer')
// 출력: {
//   target: 'claude' | 'opencode',
//   agent: '에이전트명',
//   strategy: 'run' | 'serve' | 'acp'
// }
```

---

## 8. 파일 구조

```
oh-my-claude-money/
├── .claude-plugin/
│   ├── marketplace.json          # 마켓플레이스 메타
│   └── plugin.json               # 플러그인 정의
│
├── src/
│   ├── context/                  # v2.1.5 컨텍스트 전달 시스템
│   │   ├── context-builder.mjs       # 컨텍스트 빌드
│   │   ├── context-serializer.mjs    # JSON 직렬화
│   │   ├── context-sync.mjs          # 동기화
│   │   └── index.mjs                 # 모듈 내보내기
│   │
│   ├── tracking/                 # v2.1.5 실시간 추적 시스템
│   │   ├── realtime-tracker.mjs      # RingBuffer 기반 추적
│   │   ├── metrics-collector.mjs     # 메트릭 집계
│   │   └── index.mjs                 # 모듈 내보내기
│   │
│   ├── router/                   # 라우팅 엔진
│   │   ├── balancer.mjs              # v2.1.5 프로바이더 밸런싱
│   │   ├── mapping.mjs               # 동적 에이전트 매핑
│   │   ├── cache.mjs                 # LRU 캐시
│   │   └── rules.mjs                 # 규칙 엔진
│   │
│   ├── orchestrator/              # 오케스트레이션
│   │   ├── parallel-executor.mjs      # v2.1.5 병렬 실행기
│   │   ├── execution-strategy.mjs     # v2.1.5 실행 전략
│   │   ├── task-router.mjs            # 작업 라우팅
│   │   ├── agent-fusion-map.mjs       # 에이전트 매핑
│   │   ├── fallback-orchestrator.mjs  # 폴백 오케스트레이터
│   │   └── hybrid-ultrawork.mjs       # 하이브리드 울트라워크
│   │
│   ├── executor/                  # 실행기
│   │   ├── cli-executor.mjs            # Codex/Gemini CLI 실행기
│   │   └── acp-client.mjs             # ACP 클라이언트
│   │
│   ├── hooks/                     # Claude Code 훅 (src/)
│   │   ├── detect-handoff.mjs         # 키워드/임계치 감지
│   │   ├── session-start.mjs          # 세션 초기화
│   │   └── persistent-mode.mjs        # 활성 모드 확인
│   │
│   ├── hud/                       # HUD 렌더링
│   │   ├── fusion-renderer.mjs        # 퓨전 상태 렌더
│   │   ├── omcm-hud.mjs               # HUD 메인
│   │   └── claude-usage-api.mjs       # 사용량 수집
│   │
│   └── utils/
│       ├── config.mjs                 # 설정 로더
│       ├── context.mjs                # 컨텍스트 유틸
│       ├── fusion-tracker.mjs         # 퓨전 상태 추적
│       ├── handoff-context.mjs        # 핸드오프 생성
│       ├── provider-limits.mjs        # 리밋 관리
│       └── usage.mjs                  # 사용량 계산
│
├── hooks/
│   ├── fusion-router.mjs             # 퓨전 라우팅 훅 (PreToolUse:Task)
│   ├── read-optimizer.mjs            # 읽기 최적화 훅 (PreToolUse:Read)
│   ├── bash-optimizer.mjs            # 명령어 최적화 훅 (PreToolUse:Bash)
│   ├── tool-tracker.mjs              # 도구 사용 추적 훅 (PostToolUse)
│   └── hooks.json                     # 훅 정의
│
├── commands/
│   ├── fusion-setup.md                # 초기 셋업
│   ├── fusion-default-on.md           # 퓨전 활성화
│   ├── fusion-default-off.md          # 퓨전 비활성화
│   └── cancel-autopilot.md            # 취소
│
├── skills/
│   ├── autopilot.md                   # 자동 실행
│   ├── hulw.md                        # 하이브리드 울트라워크
│   ├── ulw.md                         # 자동 퓨전
│   └── opencode.md                    # OpenCode 전환
│
├── scripts/
│   ├── fusion-setup.sh                # 퓨전 셋업
│   ├── export-context.sh              # 컨텍스트 내보내기
│   ├── handoff-to-opencode.sh         # 전환 스크립트
│   └── install.sh                     # 설치 스크립트
│
├── docs/
│   ├── ARCHITECTURE.md                # 이 파일
│   ├── API.md                         # API 레퍼런스
│   └── EXAMPLES.md                    # 예제
│
├── tests/                             # 테스트 스위트 (361개)
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

## 9. 성능 고려사항

### 8.1 Cold Boot 최소화

```
CLI 모드 (서버 없음):
요청 → opencode 프로세스 시작 → 초기화 → 실행 → 종료
       └────────────────── ~10-15초 ──────────────┘

Server Pool 모드:
서버 시작 (사전): ~5초
요청 1: HTTP 호출 → 실행 → 응답 (~1초)
요청 2: HTTP 호출 → 실행 → 응답 (~1초)
요청 3: HTTP 호출 → 실행 → 응답 (~1초)
       └─────────────── 90% 단축 ──────────┘
```

### 8.2 메모리 효율성

```
RingBuffer (최대 1000개 이벤트):
메모리 사용 = ~100KB (1000개 × 100바이트/이벤트)

Server Pool (5개 서버):
메모리 사용 ≈ 250-300MB × 5 = 1.5GB

전체 OMCM (상태 파일 포함):
메모리 사용 ≈ 2GB (권장: 4GB 이상)
```

### 8.3 네트워크 최적화

```
병렬 실행 시 대역폭:
- 5개 동시 요청 × 평균 50KB/요청 = 250KB 다운로드
- 최악의 경우: 1Mbps 환경에서 ~2초 오버헤드

RingBuffer 조회:
- 메모리 접근 (O(1)) vs 파일 I/O 없음
- 최신 100개 이벤트: <1ms
```

### 8.4 CPU 최적화

```
Balancer 선택 (각 호출 시):
- round-robin: O(1)
- weighted: O(n) (n=프로바이더 수)
- latency: O(n)
- usage: O(n)

캐싱:
- 같은 에이전트: 캐시 히트 → O(1)
- 새 에이전트: 라우팅 계산 → O(n)
```

---

## 10. 오류 처리

### 9.1 라우팅 결정 실패

```javascript
// 폴백 메커니즘
shouldRouteToOpenCode() → 오류 → JSON 파싱 실패
  └─ 기본값: route=false (Claude 유지)
```

### 9.2 Server Pool 실패

```javascript
// 서버 시작 실패
_startServer() → 오류 → timeoutMet(30초)
  └─ 폴백: CLI 모드 (run 전략)로 전환
```

### 9.3 프로바이더 오류

```javascript
recordError('openai')
errorCount++

getStats() 시:
errorRate = (errorCount / requestCount) × 100

높은 에러율 → balancer 가중치 자동 감소 (선택적)
```

---

## 11. 테스트 전략

### 10.1 테스트 범위 (361개 테스트)

```
tracking/       32개    → RingBuffer, TimeBucket, 메트릭
context/        26개    → 컨텍스트 빌드, 직렬화
router/         49개    → 라우팅 결정, 캐시, 규칙
orchestrator/   19개    → 병렬 실행, 충돌 감지
executor/       신규    → CLI 직접 실행 (Codex/Gemini)
utils/          신규    → 설정, 컨텍스트 유틸
```

### 10.2 테스트 실행

```bash
npm test                    # 모든 테스트 실행
npm test -- --grep "router"  # router 테스트만
npm test -- --grep "parallel" # 병렬 실행 테스트만
```

---

## 12. 향후 개선사항

- [ ] 분산 추적 (Distributed tracing)
- [ ] ML 기반 동적 가중치 조정
- [ ] 더 많은 프로바이더 지원 (Claude.ai 등)
- [ ] WebSocket 기반 실시간 HUD 업데이트
- [ ] Prometheus 메트릭 내보내기
- [ ] 고급 의존성 그래프 (DAG) 기반 최적화

---

## 문서 정보

**버전**: v2.1.5
**작성**: 2026-01-28
**대상**: OMCM 개발자 및 유지보수자
**언어**: 한국어
