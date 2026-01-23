# oh-my-claude-money

**oh-my-claudecode ↔ oh-my-opencode 퓨전 오케스트레이터**

## 개요

Claude Code의 28개 OMC 에이전트를 OpenCode의 멀티 프로바이더 에이전트로 **퓨전**하여:
- **Claude 토큰 39% 절약**: 12개 에이전트를 GPT/Gemini로 오프로드
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
│     │ • planner (Opus) │  │ • Oracle (GPT)   │ ← 토큰 절약!       │
│     │ • critic (Opus)  │  │ • Frontend (Gem) │ ← 토큰 절약!       │
│     │ • executor       │  │ • Librarian      │                    │
│     └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 핵심 기능

### 1. 🔀 에이전트 퓨전 (핵심!)

OMC 28개 에이전트 → OpenCode 에이전트 매핑으로 **Claude 토큰 절약**:

| OMC 에이전트 | OpenCode 에이전트 | 모델 | 절약 |
|-------------|------------------|------|------|
| architect | Oracle | GPT 5.2 | ✅ 100% |
| designer (all) | Frontend Engineer | Gemini 3 Pro | ✅ 100% |
| researcher | Oracle | GPT 5.2 | ✅ 100% |
| vision | Multimodal Looker | Gemini 3 Pro | ✅ 100% |
| analyst | Oracle | GPT 5.2 | ✅ 100% |
| scientist | Oracle | GPT 5.2 | ✅ 100% |
| code-reviewer | Oracle | GPT 5.2 | ✅ 100% |
| security-reviewer | Oracle | GPT 5.2 | ✅ 100% |
| planner | Prometheus | Claude Opus | - |
| executor | Sisyphus | Claude Opus | - |

**12개 에이전트 (39%)** 가 GPT/Gemini로 대체되어 Claude 토큰 절약!

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
| 아키텍처 분석 | Claude | 높은 정확도 필요 |
| 코드 탐색 | OpenCode (Librarian) | 빠른 검색 |
| API 조사 | OpenCode (Oracle/GPT) | 비용 효율적 |
| UI 작업 | OpenCode (Gemini) | 특화 모델 |
| 복잡한 구현 | Claude | 품질 우선 |

### 4. 🚨 자동 전환 감지
- **키워드 감지**: "opencode", "전환", "handoff" 입력 시 알림
- **사용량 임계치**: 5시간/주간 90% 도달 시 경고

### 5. 📋 상세 컨텍스트 전달
- 현재 작업 상태 + TODO + 최근 수정 파일 + 결정 사항

### 6. 🔗 OMC HUD 연동
- oh-my-claudecode HUD 캐시 활용 (추가 API 호출 없음)

## 설치 및 셋업 (필독!)

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
│  Step 4: Claude Code에서 /oh-my-claude-money:fusion-setup   │
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

#### 방법 A: OpenCode OAuth 로그인 (권장)

```bash
opencode auth login anthropic
opencode auth login openai
opencode auth login google
```

> ⚠️ **참고:** 일부 환경에서 `fetch() URL is invalid` 에러가 발생할 수 있습니다.
> 이 경우 방법 B(환경 변수)를 사용하세요.
> [관련 이슈](https://github.com/sst/opencode/issues/3335)

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
/oh-my-claude-money:fusion-setup
```

안내에 따라 `~/.claude/CLAUDE.md`에 퓨전 지시사항을 추가하면 **설치 완료**입니다!

---

### (선택) 수동 설치

스크립트 없이 직접 설치하려면:

```bash
# 1. oh-my-claude-money 클론
git clone https://github.com/DrFREEST/oh-my-claude-money.git ~/.local/share/oh-my-claude-money

# 2. 플러그인 심볼릭 링크
ln -sf ~/.local/share/oh-my-claude-money ~/.claude/plugins/local/oh-my-claude-money

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
/oh-my-claude-money:hulw 작업내용
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
/oh-my-claude-money:cancel-autopilot
```

### 키워드 요약

| 키워드 | 동작 | 토큰 절약 |
|--------|------|----------|
| `hulw`, `/hulw` | 항상 퓨전 모드 | ✅ 항상 |
| `ulw`, `/ulw` | 사용량 기반 자동 전환 | 조건부 |
| `autopilot`, `만들어줘` | 자율 실행 (퓨전 지원) | 조건부 |
| `autopilot hulw` | 퓨전 오토파일럿 | ✅ 항상 |

### 자동 전환 감지 (훅 기반)

설치 후 자동으로 작동합니다:
- 사용량 90% 도달 시 OpenCode 전환 권장
- "opencode", "전환", "handoff" 입력 시 전환 안내

### 수동 전환

```bash
# 컨텍스트 저장 + OpenCode 실행
/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh

# 컨텍스트만 저장
/opt/oh-my-claude-money/scripts/export-context.sh
```

### 전체 명령어 목록

| 명령어 | 설명 |
|--------|------|
| `/oh-my-claude-money:fusion-setup` | 퓨전 플러그인 초기 셋업 |
| `/oh-my-claude-money:hulw` | 하이브리드 울트라워크 |
| `/oh-my-claude-money:ulw` | 자동 퓨전 울트라워크 |
| `/oh-my-claude-money:autopilot` | 하이브리드 오토파일럿 |
| `/oh-my-claude-money:cancel-autopilot` | 오토파일럿 중단 |
| `/opencode` | OpenCode로 명시적 전환 |

## 설정

설정 파일: `~/.claude/plugins/oh-my-claude-money/config.json`

```json
{
  "threshold": 90,
  "autoHandoff": false,
  "keywords": ["opencode", "handoff", "전환", "switch to opencode"],

  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 3,
    "preferOpencode": ["explore", "researcher", "writer"],
    "preferClaude": ["architect", "executor-high", "critic"],
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
| `threshold` | 전환 알림 임계치 (%) | 90 |
| `autoHandoff` | 자동 전환 활성화 | false |
| `keywords` | 감지할 키워드 목록 | ["opencode", "handoff", "전환", ...] |
| **라우팅 설정** | | |
| `routing.enabled` | 하이브리드 라우팅 활성화 | true |
| `routing.usageThreshold` | OpenCode 분배 증가 임계치 | 70 |
| `routing.maxOpencodeWorkers` | 동시 OpenCode 워커 수 | 3 |
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
│   └── plugin.json               # 플러그인 메타데이터
├── hooks/
│   └── hooks.json                # 훅 정의
├── src/
│   ├── hooks/
│   │   ├── detect-handoff.mjs    # 키워드/임계치 감지
│   │   └── session-start.mjs     # 세션 시작 경고
│   ├── orchestrator/             # 🆕 하이브리드 오케스트레이터
│   │   ├── index.mjs             # 모듈 내보내기
│   │   ├── task-router.mjs       # 작업 라우팅 결정
│   │   ├── opencode-worker.mjs   # OpenCode 워커 관리
│   │   └── hybrid-ultrawork.mjs  # 하이브리드 울트라워크
│   └── utils/
│       ├── usage.mjs             # HUD 사용량 유틸리티
│       ├── config.mjs            # 설정 관리
│       └── context.mjs           # 컨텍스트 내보내기
├── scripts/
│   ├── export-context.sh         # 컨텍스트 내보내기
│   └── handoff-to-opencode.sh    # OpenCode 전환
├── commands/
│   ├── opencode.md               # /opencode 명령어
│   ├── fusion-setup.md           # /fusion-setup 초기 셋업
│   └── cancel-autopilot.md       # /cancel-autopilot 중단
├── skills/
│   ├── hulw.md                   # 하이브리드 울트라워크
│   ├── ulw.md                    # 자동 퓨전 울트라워크
│   └── autopilot.md              # 하이브리드 오토파일럿
├── agents/
│   └── opencode-delegator.json   # 🆕 위임 에이전트
├── package.json
└── README.md
```

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

전환 시 생성되는 컨텍스트 파일 (`.omc/handoff/context.md`):

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

## 라이선스

MIT

## 기여

이슈 및 PR 환영합니다.
