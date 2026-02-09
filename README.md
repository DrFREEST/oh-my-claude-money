```
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║    ██████╗ ██╗  ██╗    ███╗   ███╗██╗   ██╗                   ║
  ║   ██╔═══██╗██║  ██║    ████╗ ████║╚██╗ ██╔╝                   ║
  ║   ██║   ██║███████║    ██╔████╔██║ ╚████╔╝                    ║
  ║   ██║   ██║██╔══██║    ██║╚██╔╝██║  ╚██╔╝                     ║
  ║   ╚██████╔╝██║  ██║    ██║ ╚═╝ ██║   ██║                      ║
  ║    ╚═════╝ ╚═╝  ╚═╝    ╚═╝     ╚═╝   ╚═╝                      ║
  ║                                                               ║
  ║    ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗           ║
  ║   ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝           ║
  ║   ██║     ██║     ███████║██║   ██║██║  ██║█████╗             ║
  ║   ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝             ║
  ║   ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗           ║
  ║    ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝           ║
  ║                                                               ║
  ║   ███╗   ███╗ ██████╗ ███╗   ██╗███████╗██╗   ██╗             ║
  ║   ████╗ ████║██╔═══██╗████╗  ██║██╔════╝╚██╗ ██╔╝             ║
  ║   ██╔████╔██║██║   ██║██╔██╗ ██║█████╗   ╚████╔╝              ║
  ║   ██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══╝    ╚██╔╝               ║
  ║   ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║███████╗   ██║                ║
  ║   ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝                ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
```

---

## English

# oh-my-claude-money (OMCM)

**Claude Code ↔ OpenCode Fusion Orchestrator** for intelligent cost optimization and multi-provider integration.

### What is OMCM?

OMCM fuses 32 Claude Code agents with OpenCode's multi-provider agents, enabling **62% token savings** by intelligently routing tasks to the optimal LLM (Claude, GPT, or Gemini).

### Key Features

1. **Automatic Fallback (90% threshold)** - Seamlessly switches to OpenCode when Claude reaches rate limits
2. **Smart Agent Routing** - Analysis agents → OpenCode (GPT/Gemini), execution agents → Claude
3. **Real-time Tracking** - HUD integration shows usage and fusion status
4. **Hybrid Ultrawork (`hulw`)** - Instant fusion mode with maximum parallelism
5. **Token Savings** - 18 agents offloaded to other providers automatically

### Quick Start

```bash
# Install
/plugin marketplace add https://github.com/DrFREEST/oh-my-claude-money
/plugin install omcm

# Setup
/omcm:fusion-setup
```

Then use these commands:
- `/hulw` - Hybrid ultrawork (always fusion mode)
- `/ulw` - Auto fusion based on usage
- `/autopilot hulw` - Full autonomous execution with fusion

### Prerequisites

- **OpenCode CLI** installed
- **oh-my-claudecode** plugin active
- Provider API keys configured (OpenAI, Google Anthropic)

### How It Works

```
User Request
    ↓
Claude Opus 4.5 (Conductor)
    ↓
├─→ Analysis task? → Route to OpenCode (GPT/Gemini) ✅ Save tokens
├─→ Execution task? → Route to Claude (high quality)
└─→ Usage > 90%? → Automatic fallback to OpenCode
```

### OpenCode Server Pool (Performance)

OMCM uses a **flexible server pool** to reduce **routing call latency by ~90%** compared to CLI mode:

```bash
# Server pool is managed automatically in parallel modes (ultrapilot, ultrawork)
# Manual server control is still available:
./scripts/opencode-server.sh start
```

**Performance Comparison:**

| Mode | First Call | Subsequent Calls |
|------|------------|------------------|
| CLI Mode (no server) | ~10-15s (cold boot) | ~10-15s |
| **Server Pool Mode** | ~5s (pool start) | **~1s** |

**Server Pool Features:**
- **Dynamic Scaling**: 1-4 servers based on load (configurable via `maxOpencodeWorkers`)
- **Auto-Recovery**: Failed servers are automatically restarted
- **Load Balancing**: Round-robin distribution across idle servers
- **Resource Usage**: ~250-300MB per server instance (~1.2GB for 4 servers)

**Server Management:**
```bash
./scripts/opencode-server.sh start   # Start server
./scripts/opencode-server.sh stop    # Stop server
./scripts/opencode-server.sh status  # Check status
./scripts/opencode-server.sh logs    # View logs
```

### Configuration

See `~/.claude/plugins/omcm/config.json` for detailed options:
- Fusion mode defaults
- Usage thresholds
- Context handling
- Provider preferences

### Full Documentation

See sections below for complete setup guide, configuration, and troubleshooting.

---

## 한국어

# oh-my-claude-money

**Claude Code ↔ OpenCode 퓨전 오케스트레이터** | 토큰 절약 & 멀티 프로바이더 통합

## 개요

Claude Code의 32개 OMC 에이전트를 OpenCode의 멀티 프로바이더 에이전트로 **퓨전**하여:
- **Claude 토큰 62% 절약**: 18개 에이전트를 GPT/Gemini로 오프로드
- **메인 오케스트레이터**: Opus 4.5가 지휘, 서브 에이전트는 최적 LLM으로 분배
- **자동 라우팅**: 사용량/작업 유형 기반 지능형 분배

```
┌─────────────────────────────────────────────────────────────────────┐
│              Meta-Orchestrator (Claude Opus 4.5)                    │
│                     "지휘자 역할"                                    │
├─────────────────────────────────────────────────────────────────────┤
│                              ↓                                      │
│              ┌────────────────────────────┐                        │
│              │    Fusion Router           │                        │
│              │ "어떤 LLM이 최적인가?"       │                        │
│              └────────────────────────────┘                        │
│                    ↓              ↓                                │
│     ┌──────────────────┐  ┌──────────────────┐                    │
│     │ oh-my-claudecode │  │ oh-my-opencode   │                    │
│     │ (Claude 토큰)    │  │ (다른 LLM 토큰)  │                    │
│     │                  │  │                  │                    │
│     │ • planner (Opus) │  │ • build (Codex)  │ ← 토큰 절약!       │
│     │ • critic (Opus)  │  │ • explore (Flash)│ ← 토큰 절약!       │
│     │ • executor       │  │ • general (GPT)  │                    │
│     └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 핵심 기능

### 1. 🔀 에이전트 퓨전 (핵심!)

OMC 32개 에이전트 → OMO 에이전트 + 외부 모델 매핑으로 **Claude 토큰 62% 절약**:

**티어별 모델 분배 (퓨전/폴백 모드):**

| 티어 | 원래 모델 | 퓨전 모드 모델 | Thinking |
|------|----------|---------------|----------|
| **HIGH** | Claude Opus | Claude Opus (유지) | ✅ |
| **MEDIUM** | Claude Sonnet | **gpt-5.2-codex** | ✅ |
| **LOW** | Claude Haiku | **gemini-3.0-flash** | ✅ |

**에이전트별 매핑 (28개):**

| OMC 에이전트 | Lane | OMO 에이전트 | 퓨전 모델 | 절약 |
|-------------|------|-------------|----------|------|
| architect, deep-executor, debugger | HIGH | build | Claude Opus | - |
| planner, critic, analyst | HIGH | plan | Claude Opus | - |
| security-reviewer, code-reviewer, quality-reviewer | HIGH | build | Claude Opus | - |
| product-manager, information-architect | HIGH | plan/build | Claude Opus | - |
| executor, dependency-expert | MEDIUM | build | **gpt-5.2-codex** | ✅ |
| designer, vision | MEDIUM | general/build | **gemini-3.0-pro** | ✅ |
| qa-tester, build-fixer, test-engineer | MEDIUM | build | **gpt-5.2-codex** | ✅ |
| scientist, git-master, verifier | MEDIUM | build | **gpt-5.2-codex** | ✅ |
| api-reviewer, performance-reviewer, quality-strategist | MEDIUM | build | **gpt-5.2-codex** | ✅ |
| product-analyst | MEDIUM | general | **gpt-5.2-codex** | ✅ |
| explore, writer, style-reviewer, ux-researcher | LOW | explore/general | **gemini-3.0-flash** | ✅ |

**18개 에이전트 (62%)** 가 GPT/Gemini로 대체되어 Claude 토큰 절약!

### 2. 🔄 하이브리드 울트라워크

프롬프트 **어디에든** `hulw` 키워드를 포함하면 자동 인식:

```
/hulw 이 프로젝트 리팩토링해줘
이 프로젝트 리팩토링해줘 hulw
hulw로 빠르게 처리
```

- **퓨전 라우팅**: 작업 유형에 따라 최적 LLM 자동 선택
- **사용량 기반 모드**: 사용량 높으면 'save-tokens' 모드 자동 전환
- **병렬 처리**: OMC + OpenCode 동시 실행

### 3. 📊 스마트 작업 라우팅

| 작업 유형 | 라우팅 대상 | 이유 |
|----------|------------|------|
| 아키텍처 분석 | Claude (HIGH tier) | 높은 정확도 필요 |
| 코드 탐색 | OpenCode explore (Flash) | 빠른 검색 |
| API 조사 | OpenCode general (Codex) | 비용 효율적 |
| UI 작업 | OpenCode build (Codex) | 병렬 처리 |
| 복잡한 구현 | Claude (HIGH tier) | 품질 우선 |

### 4. 🚨 자동 폴백 시스템 (v2.1+)

Claude 리밋에 따른 자동 전환:

| 상태 | 임계값 | 동작 |
|------|--------|------|
| **폴백 활성화** | Claude >= 90% | GPT-5.2-Codex로 자동 전환 |
| **복구** | Claude < 85% | Claude Opus 4.5로 자동 복귀 |

**폴백 체인:**
1. Claude Opus 4.5 (기본)
2. GPT-5.2-Codex (1차 폴백)
3. Gemini 2.5 Flash (2차 폴백)
4. GPT-5.2 (3차 폴백)

**핸드오프 컨텍스트:**
전환 시 `.omcm/handoff/context.md` 파일이 생성되어 작업 상태를 새 모델에 전달합니다.

### 5. 🔍 키워드/임계치 감지
- **키워드 감지**: "opencode", "전환", "handoff" 입력 시 알림
- **사용량 임계치**: 5시간/주간 90% 도달 시 경고

### 6. 📋 상세 컨텍스트 전달
- 현재 작업 상태 + TODO + 최근 수정 파일 + 결정 사항

### 7. 🔗 OMC HUD 연동
- oh-my-claudecode HUD 캐시 활용 (추가 API 호출 없음)

### 8. 📊 HUD 토큰 표시 (v0.4.0+)

프로바이더별 실시간 토큰 사용량을 HUD에 표시합니다.

```
C:1.2k↓ 567↑|O:25.8k↓ 9↑|G:165.3k↓ 1.4k↑
```

| 기호 | 의미 |
|------|------|
| `C:` | Claude (Cyan) |
| `O:` | OpenAI (Green) |
| `G:` | Gemini (Yellow) |
| `↓` | Input tokens |
| `↑` | Output tokens |
| `k` | ×1000 |

### 9. 🔌 MCP 서버 연동 (v0.4.0+)

Claude Code에서 OpenCode를 MCP로 호출할 수 있습니다.

**설정 위치**: `~/.claude/mcp-config.json`

**사용 가능한 도구**:
- `opencode_run` - 간단한 실행
- `opencode_get_status` - 상태 확인
- `opencode_list_models` - 모델 목록
- `opencode_export_session` - 세션 내보내기

### 10. 🚀 v1.0.0 신규 기능

#### 실시간 추적 시스템 (`src/tracking/`)
- **RealtimeTracker**: RingBuffer 기반 이벤트 실시간 추적
- **MetricsCollector**: 프로바이더별 라우팅/토큰/에러 메트릭 수집
- **TimeBucket**: 시간 범위별 통계 집계 (분/시간/일)

#### 컨텍스트 전달 시스템 (`src/context/`)
- **buildContext()**: 현재 작업 컨텍스트 자동 빌드
  - 최근 수정 파일, TODO 상태, 세션 학습 사항 수집
- **ContextSynchronizer**: OpenCode와 실시간 컨텍스트 동기화
- **핸드오프 히스토리 관리**: 프로바이더 전환 기록 추적

#### 다중 프로바이더 밸런싱 (`src/router/balancer.mjs`)
- **4가지 밸런싱 전략**:
  - `round-robin`: 순차 순환
  - `weighted`: 가중치 기반 (claude:3, openai:2, gemini:2)
  - `latency`: 응답 시간 기반 선택
  - `usage`: 사용량 기반 부하 분산
- **ProviderBalancer**: 통합 밸런서 인터페이스

#### 병렬 실행기 (`src/orchestrator/`)
- **ParallelExecutor**: 병렬/순차/하이브리드 실행 모드
  - 파일 충돌 자동 검사
  - 의존성 기반 작업 그룹화
  - 자동 프로바이더 라우팅
- **ExecutionStrategy**: 작업 유형별 전략 선택 (run/serve/acp)

## 빠른 시작 (30초)

**Claude Code 내에서 설치** (권장):

```
/plugin marketplace add https://github.com/DrFREEST/oh-my-claude-money
/plugin install omcm
```

그 다음 셋업:

```
/omcm:fusion-setup
```

끝! 이제 `hulw` 키워드로 퓨전 모드를 사용할 수 있습니다.

> **사전 요구사항**: [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)와 [OpenCode](https://github.com/sst/opencode)가 설치되어 있어야 합니다.

---

## 설치 및 셋업 (상세)

### 전체 설치 순서

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: install.sh 실행                                    │
│    └─ Claude Code, OMC, OpenCode, OMO, 퓨전 플러그인 설치    │
│                         ↓                                   │
│  Step 2: Claude Code에서 /oh-my-claudecode:omc-setup        │
│    └─ oh-my-claudecode 기본 설정                            │
│                         ↓                                   │
│  Step 3: OpenCode 프로바이더 인증                            │
│    └─ Anthropic, OpenAI, Google API 키 설정                 │
│                         ↓                                   │
│  Step 4: Claude Code에서 /omcm:fusion-setup   │
│    └─ 퓨전 오케스트레이터 활성화                              │
│                         ↓                                   │
│  ✅ 설치 완료! hulw: 명령어로 퓨전 모드 사용 가능             │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 1: 설치 스크립트 실행

```bash
# 원클릭 설치 (자동 확인)
curl -fsSL https://raw.githubusercontent.com/DrFREEST/oh-my-claude-money/main/install.sh | bash -s -- --yes

# 또는 수동 확인 모드
curl -fsSL https://raw.githubusercontent.com/DrFREEST/oh-my-claude-money/main/install.sh | bash
```

또는 로컬에서:

```bash
git clone https://github.com/DrFREEST/oh-my-claude-money.git
cd oh-my-claude-money
./install.sh
```

이 스크립트는 다음을 자동으로 설치합니다:
- ✅ Claude Code CLI + oh-my-claudecode
- ✅ OpenCode CLI + oh-my-opencode
- ✅ oh-my-claude-money 퓨전 플러그인

---

### Step 2: oh-my-claudecode 셋업

**새 터미널**을 열고 Claude Code를 실행합니다:

```bash
claude
```

Claude Code 프롬프트에서 다음 명령어 입력:

```
/oh-my-claudecode:omc-setup
```

이 과정에서 `~/.claude/CLAUDE.md`에 OMC 지시사항이 설정됩니다.

---

### Step 3: OpenCode 프로바이더 인증

OpenCode에서 GPT/Gemini를 사용하려면 프로바이더 인증이 필요합니다.

#### 방법 A: 대화형 로그인 (권장)

```bash
opencode auth login
```

**인증 과정:**
1. `opencode auth login` 실행
2. 대화형 메뉴에서 프로바이더 선택:
   - `OpenAI` - GPT-5.2, GPT-5.2-Codex 사용
   - `Google` - Gemini 2.5 Pro/Flash 사용
   - `Anthropic` - Claude 모델 사용
3. 각 프로바이더별로 API 키 입력 또는 OAuth 로그인
4. 여러 프로바이더를 사용하려면 각각 개별 로그인 필요

```bash
# 인증 상태 확인
opencode auth status
```

#### 방법 B: 환경 변수

```bash
# API 키 발급 후 환경 변수 설정
export ANTHROPIC_API_KEY="sk-ant-..."   # https://console.anthropic.com/settings/keys
export OPENAI_API_KEY="sk-..."          # https://platform.openai.com/api-keys
export GOOGLE_API_KEY="..."             # https://aistudio.google.com/apikey

# 영구 저장 (선택)
echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.bashrc
echo 'export OPENAI_API_KEY="your-key"' >> ~/.bashrc
echo 'export GOOGLE_API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc
```

#### 인증 확인

```bash
opencode auth status
```

---

### Step 4: 퓨전 플러그인 셋업

다시 Claude Code를 실행합니다:

```bash
claude
```

Claude Code 프롬프트에서 다음 명령어 입력:

```
/omcm:fusion-setup
```

안내에 따라 `~/.claude/CLAUDE.md`에 퓨전 지시사항을 추가하면 **설치 완료**입니다!

---

### (선택) 수동 설치

스크립트 없이 직접 설치하려면:

```bash
# 1. omcm 클론
git clone https://github.com/DrFREEST/oh-my-claude-money.git ~/.local/share/omcm

# 2. 플러그인 심볼릭 링크
ln -sf ~/.local/share/omcm ~/.claude/plugins/local/omcm

# 3. 이후 Step 2~4 진행
```

## 사용법

### 퓨전 모드 (키워드 & 슬래시 명령어)

프롬프트 **어디에든** 키워드를 포함하면 자동으로 인식됩니다:

#### 🚀 hulw (하이브리드 울트라워크)

항상 OpenCode 퓨전 모드로 실행하여 **Claude 토큰 절약**:

```
# 모두 동일하게 인식됨
/hulw 이 프로젝트 리팩토링해줘
이 프로젝트 리팩토링해줘 hulw
hulw로 빠르게 처리해줘
/omcm:hulw 작업내용
```

#### ⚡ ulw (자동 퓨전 울트라워크)

사용량에 따라 **자동으로 퓨전 모드 전환**:
- 사용량 < 70%: Claude 에이전트 사용
- 사용량 70-90%: 하이브리드 모드 (자동 전환)
- 사용량 > 90%: OpenCode 중심 모드

```
# 모두 동일하게 인식됨
/ulw 버그 수정해줘
버그 수정해줘 ulw
ulw로 진행
울트라워크 모드로 작업
```

#### 🤖 autopilot (하이브리드 오토파일럿)

아이디어부터 완성까지 **자율 실행 + 퓨전 지원**:

```
# 모두 동일하게 인식됨
/autopilot REST API 만들어줘
autopilot으로 대시보드 구현
build me a todo app
로그인 기능 만들어줘
```

**하이브리드 오토파일럿** 명시적 요청:
```
autopilot hulw 이 프로젝트 전체 리팩토링
hybrid autopilot으로 진행
퓨전 오토파일럿 모드
```

#### 🛑 중단 키워드

진행 중인 작업을 중단하려면:
```
stop
cancel
abort
중단
취소
```

또는 명시적 명령어:
```
/omcm:cancel-autopilot
```

### 키워드 요약

| 키워드 | 동작 | 토큰 절약 |
|--------|------|----------|
| `hulw`, `/hulw` | 항상 퓨전 모드 | ✅ 항상 |
| `ulw`, `/ulw` | 사용량 기반 자동 전환 | 조건부 |
| `autopilot`, `만들어줘` | 자율 실행 (퓨전 지원) | 조건부 |
| `autopilot hulw` | 퓨전 오토파일럿 | ✅ 항상 |
| `stop`, `cancel`, `중단`, `취소` | 진행 중인 작업 중단 | - |

### 🔧 퓨전 기본값 설정

퓨전 모드를 항상 사용하거나 사용량 기반 자동 전환으로 설정할 수 있습니다.

#### 항상 퓨전 모드 활성화
```
/omcm:fusion-default-on
```

#### 사용량 기반 자동 전환 (기본값)
```
/omcm:fusion-default-off
```

#### 동작 차이

| 명령어/상황 | OFF (기본) | ON |
|-------------|------------|-----|
| **일반 작업** | Claude만 사용 | 퓨전 라우팅 |
| **`ulw`** | 사용량 기반 전환 | 항상 퓨전 |
| **`hulw`** | 항상 퓨전 | 항상 퓨전 |
| **`autopilot`** | 사용량 기반 | 항상 하이브리드 |

**권장 시나리오:**
- **OFF**: 최고 품질 결과가 필요하거나 Claude 토큰 여유가 충분할 때
- **ON**: Claude 토큰을 최대한 절약하고 싶거나 빠른 처리가 중요할 때

### 자동 전환 감지 (훅 기반)

설치 후 자동으로 작동합니다:
- 사용량 90% 도달 시 OpenCode 전환 권장
- "opencode", "전환", "handoff" 입력 시 전환 안내

### 수동 전환

```bash
# 컨텍스트 저장 + OpenCode 실행
~/.claude/plugins/local/oh-my-claude-money/scripts/handoff-to-opencode.sh

# 컨텍스트만 저장
~/.claude/plugins/local/oh-my-claude-money/scripts/export-context.sh
```

### 전체 명령어 목록

| 명령어 | 설명 |
|--------|------|
| `/omcm:fusion-setup` | 퓨전 플러그인 초기 셋업 |
| `/omcm:fusion-default-on` | 항상 퓨전 모드 활성화 |
| `/omcm:fusion-default-off` | 퓨전 모드 기본값 비활성화 (사용량 기반 전환) |
| `/omcm:hulw` | 하이브리드 울트라워크 |
| `/omcm:ulw` | 자동 퓨전 울트라워크 |
| `/omcm:autopilot` | 하이브리드 오토파일럿 |
| `/omcm:cancel-autopilot` | 오토파일럿 중단 |
| `/omcm:opencode` | OpenCode로 명시적 전환 |

### OpenCode 서버 풀 (성능 최적화)

OMCM은 **플렉서블 서버 풀**을 사용하여 CLI 모드 대비 **라우팅 호출 대기 시간을 ~90% 단축**합니다:

```bash
# 서버 풀은 병렬 모드(ultrapilot, ultrawork)에서 자동 관리됩니다
# 수동 서버 제어도 가능:
./scripts/opencode-server.sh start
```

**성능 비교:**

| 모드 | 첫 호출 | 이후 호출 |
|------|--------|----------|
| CLI 모드 (서버 없음) | ~10-15초 (cold boot) | ~10-15초 |
| **서버 풀 모드** | ~5초 (풀 시작) | **~1초** |

**서버 풀 특징:**
- **동적 스케일링**: 부하에 따라 1~4개 서버 자동 조절 (`maxOpencodeWorkers`로 설정)
- **자동 복구**: 실패한 서버 자동 재시작
- **로드 밸런싱**: 라운드로빈 방식으로 idle 서버에 분배
- **리소스 사용량**: 서버당 ~250-300MB (4개 서버 ≈ 1.2GB)

**대규모 병렬 시나리오:**
```
퓨전 울트라파일럿
└─ 메인 오케스트레이터 (5개 병렬 워커)
   └─ 각 워커가 ulw 활성화 → 5개 하위 작업
      = 총 25개 동시 작업 처리 가능
```

25개 이상 동시 작업 시 `maxOpencodeWorkers` 조정 권장 (메모리 고려: 25개 ≈ 6.25GB)

**서버 관리:**
```bash
./scripts/opencode-server.sh start   # 서버 시작
./scripts/opencode-server.sh stop    # 서버 중지
./scripts/opencode-server.sh status  # 상태 확인
./scripts/opencode-server.sh logs    # 로그 확인
```

## 설정

설정 파일: `~/.claude/plugins/omcm/config.json`

```json
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false,
  "keywords": ["opencode", "handoff", "전환", "switch to opencode", "opencode로", "오픈코드"],

  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 3,
    "preferOpencode": ["explore", "dependency-expert", "writer", "style-reviewer", "ux-researcher"],
    "preferClaude": ["architect", "deep-executor", "critic", "planner", "debugger"],
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

### 설정 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `fusionDefault` | 항상 퓨전 모드 사용 | false |
| `threshold` | 전환 알림 임계치 (%) | 90 |
| `autoHandoff` | 자동 전환 활성화 | false |
| `keywords` | 감지할 키워드 목록 | ["opencode", "handoff", "전환", "switch to opencode", "opencode로", "오픈코드"] |
| **라우팅 설정** | | |
| `routing.enabled` | 하이브리드 라우팅 활성화 | true |
| `routing.usageThreshold` | OpenCode 분배 증가 임계치 | 70 |
| `routing.maxOpencodeWorkers` | 서버 풀 최대 서버 수 (1~25 권장, 메모리 고려) | 4 |
| `routing.autoDelegate` | 자동 위임 활성화 | true |
| **컨텍스트 설정** | | |
| `context.includeRecentFiles` | 최근 수정 파일 포함 | true |
| `context.recentFilesLimit` | 최근 파일 최대 개수 | 10 |
| `context.includeTodos` | TODO 항목 포함 | true |
| `context.includeDecisions` | 결정 사항 포함 | true |
| `context.maxContextLength` | 최대 컨텍스트 길이 | 50000 |
| **OpenCode 설정** | | |
| `opencode.ultraworkByDefault` | ulw 자동 활성화 | true |
| `opencode.timeout` | 타임아웃 (ms) | 300000 |
| **알림 설정** | | |
| `notifications.showOnThreshold` | 임계치 알림 표시 | true |
| `notifications.showOnKeyword` | 키워드 알림 표시 | true |
| `notifications.quietMode` | 조용한 모드 | false |

## 파일 구조

```
oh-my-claude-money/
├── .claude-plugin/
│   ├── marketplace.json          # 마켓플레이스 메타데이터
│   └── plugin.json               # 플러그인 메타데이터
├── agents/
│   └── opencode-delegator.json   # 위임 에이전트
├── commands/
│   ├── cancel-autopilot.md       # /cancel-autopilot 중단
│   ├── fusion-default-off.md     # 퓨전 모드 기본 비활성화
│   ├── fusion-default-on.md      # 퓨전 모드 기본 활성화
│   └── fusion-setup.md           # /fusion-setup 초기 셋업
├── hooks/
│   ├── bash-optimizer.mjs        # PreToolUse: Bash 최적화
│   ├── fusion-router.mjs         # PreToolUse: 퓨전 라우터 훅
│   ├── hooks.json                # 훅 정의 (7개 훅)
│   ├── read-optimizer.mjs        # PreToolUse: Read 최적화
│   └── tool-tracker.mjs          # PostToolUse: 도구 사용 추적
├── scripts/
│   ├── agent-mapping.json        # 에이전트 매핑 정보
│   ├── export-context.sh         # 컨텍스트 내보내기
│   ├── fusion-bridge.sh          # 퓨전 브릿지
│   ├── fusion.sh                 # 퓨전 실행 스크립트
│   ├── handoff-to-opencode.sh    # OpenCode 전환
│   ├── install-hud.sh            # HUD 설치
│   ├── migrate-to-omcm.sh        # OMCM 마이그레이션
│   └── uninstall-hud.sh          # HUD 제거
├── skills/
│   ├── autopilot/SKILL.md        # 하이브리드 오토파일럿
│   ├── cancel/SKILL.md           # 통합 취소
│   ├── ecomode/SKILL.md          # 토큰 효율 모드
│   ├── hulw/SKILL.md             # 하이브리드 울트라워크
│   ├── hybrid-ultrawork/SKILL.md # 하이브리드 울트라워크 (별칭)
│   ├── opencode/SKILL.md         # OpenCode 전환 스킬
│   ├── ralph/SKILL.md            # 지속 실행 모드
│   └── ulw/SKILL.md              # 자동 퓨전 울트라워크
├── src/
│   ├── context/                    # v1.0.0 컨텍스트 전달
│   │   ├── context-builder.mjs     # 컨텍스트 빌드
│   │   ├── context-serializer.mjs  # 직렬화
│   │   ├── context-sync.mjs        # 동기화
│   │   └── index.mjs               # 모듈 익스포트
│   ├── tracking/                   # v1.0.0 실시간 추적
│   │   ├── realtime-tracker.mjs    # 이벤트 추적
│   │   ├── metrics-collector.mjs   # 메트릭 수집
│   │   └── index.mjs               # 모듈 익스포트
│   ├── router/
│   │   ├── balancer.mjs            # v1.0.0 프로바이더 밸런싱
│   │   ├── cache.mjs               # v0.8.0 LRU 캐시
│   │   ├── mapping.mjs             # v0.8.0 동적 매핑
│   │   └── rules.mjs               # v0.8.0 규칙 엔진
│   ├── orchestrator/
│   │   ├── parallel-executor.mjs   # v1.0.0 병렬 실행기
│   │   ├── execution-strategy.mjs  # v1.0.0 실행 전략
│   │   ├── agent-fusion-map.mjs    # 에이전트 퓨전 매핑
│   │   ├── fallback-orchestrator.mjs # 폴백 오케스트레이터
│   │   ├── fusion-orchestrator.mjs   # 퓨전 오케스트레이터
│   │   ├── hybrid-ultrawork.mjs    # 하이브리드 울트라워크
│   │   ├── index.mjs               # 모듈 내보내기
│   │   ├── opencode-worker.mjs     # OpenCode 워커 관리
│   │   └── task-router.mjs         # 작업 라우팅 결정
│   ├── executor/
│   │   ├── opencode-executor.mjs   # OpenCode CLI 실행기
│   │   └── opencode-server-pool.mjs # v1.0.0 플렉서블 서버 풀
│   ├── hooks/
│   │   ├── detect-handoff.mjs      # 키워드/임계치 감지
│   │   └── session-start.mjs       # 세션 시작 경고
│   ├── hud/
│   │   ├── fusion-renderer.mjs     # 퓨전 렌더러
│   │   ├── index.mjs               # HUD 모듈 내보내기
│   │   └── omcm-hud.mjs            # OMCM HUD
│   └── utils/
│       ├── config.mjs              # 설정 관리
│       ├── context.mjs             # 컨텍스트 내보내기
│       ├── fusion-tracker.mjs      # 퓨전 추적
│       ├── handoff-context.mjs     # 핸드오프 컨텍스트
│       ├── provider-limits.mjs     # 프로바이더 제한 관리
│       └── usage.mjs               # HUD 사용량 유틸리티
├── install.sh                    # 설치 스크립트
├── uninstall.sh                  # 제거 스크립트
├── package.json
├── CHANGELOG.md                  # 변경 이력
└── README.md
```

## 테스트

```bash
npm test
```

**커버리지**:
- 전체: **361개 테스트** (100% PASS)
- v0.8.0 통합 테스트: 19개
- v1.0.0 테스트: 342개
  - tracking: 32개
  - context: 26개
  - balancer: 49개
  - parallel-executor: 19개
  - server-pool: 신규
  - orchestrator: 신규

## 의존성

- **Node.js** 18+
- **oh-my-claudecode** (HUD 사용량 데이터 사용)
- **OpenCode** (전환 대상)

### OpenCode 설치

```bash
curl -fsSL https://opencode.ai/install | bash
```

또는 [GitHub](https://github.com/sst/opencode)에서 다운로드

## 컨텍스트 파일 형식

전환 시 생성되는 컨텍스트 파일 (`.omcm/handoff/context.md`):

```markdown
# 작업 핸드오프 컨텍스트

> Claude Code에서 OpenCode로 전환됨
> 생성 시간: 2026-01-23T21:00:00+09:00

---

## 세션 정보
| 항목 | 값 |
|------|-----|
| 프로젝트 경로 | `/opt/my-project` |
| 시간 | 2026-01-23T21:00:00+09:00 |
| 사용량 | 5시간: 87%, 주간: 45% |

## 현재 작업
로그인 기능 구현 중

## 미완료 TODO
- [ ] 비밀번호 검증 로직 추가
- [ ] 세션 관리 구현

## 최근 수정 파일
[git diff --stat 출력]
```

## 참고 소스

| 프로젝트 | 설명 | URL |
|----------|------|-----|
| **Claude Code** | Anthropic 공식 CLI | [anthropic.com/claude-code](https://www.anthropic.com/claude-code) |
| **oh-my-claudecode** | Claude Code 멀티에이전트 플러그인 | [github.com/Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) |
| **OpenCode** | 오픈소스 AI 코딩 에이전트 | [github.com/sst/opencode](https://github.com/sst/opencode) |
| **OpenCode Docs** | OpenCode 공식 문서 | [opencode.ai/docs](https://opencode.ai/docs/) |
| **Claude Code Hooks 가이드** | 훅 시스템 완벽 가이드 | [dev.to - Claude Code Hooks](https://dev.to/kiwibreaksme/claude-code-hooks-wanbyeog-gaideu-aiga-maennal-ggameogneun-iyuwa-haegyeolbeob-4n03) |
| **CodeSyncer** | 코드베이스 태그 동기화 | [github.com/bitjaru/codesyncer](https://github.com/bitjaru/codesyncer) |

## 라이선스

MIT

## 기여

이슈 및 PR 환영합니다.
