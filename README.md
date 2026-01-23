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

```
hulw: 이 프로젝트 전체 리팩토링해줘
```

- **퓨전 라우팅**: 작업 유형에 따라 최적 LLM 자동 선택
- **사용량 기반 모드**: 사용량 높으면 'save-tokens' 모드 자동 전환
- **병렬 처리**: OMC + OpenCode 동시 실행

### 2. 📊 스마트 작업 라우팅

| 작업 유형 | 라우팅 대상 | 이유 |
|----------|------------|------|
| 아키텍처 분석 | Claude | 높은 정확도 필요 |
| 코드 탐색 | OpenCode (Librarian) | 빠른 검색 |
| API 조사 | OpenCode (Oracle/GPT) | 비용 효율적 |
| UI 작업 | OpenCode (Gemini) | 특화 모델 |
| 복잡한 구현 | Claude | 품질 우선 |

### 3. 🚨 자동 전환 감지
- **키워드 감지**: "opencode", "전환", "handoff" 입력 시 알림
- **사용량 임계치**: 5시간/주간 90% 도달 시 경고

### 4. 📋 상세 컨텍스트 전달
- 현재 작업 상태 + TODO + 최근 수정 파일 + 결정 사항

### 5. 🔗 OMC HUD 연동
- oh-my-claudecode HUD 캐시 활용 (추가 API 호출 없음)

## 설치

### 방법 1: 원클릭 설치 (권장)

```bash
# 모든 것을 자동으로 설치
curl -fsSL https://raw.githubusercontent.com/DrFREEST/oh-my-claude-money/main/install.sh | bash
```

또는 로컬에서:

```bash
./install.sh
```

이 스크립트는 다음을 자동으로 설치/설정합니다:
- ✅ Claude Code CLI + oh-my-claudecode
- ✅ OpenCode CLI + oh-my-opencode
- ✅ oh-my-claude-money 퓨전 플러그인
- ✅ 멀티 프로바이더 API 키 설정 (Anthropic, OpenAI, Google)

### 방법 2: 수동 설치

```bash
# 플러그인 디렉토리로 심볼릭 링크 생성
ln -sf /opt/oh-my-claude-money ~/.claude/plugins/local/oh-my-claude-money
```

### 방법 3: hooks 직접 등록

`~/.claude/settings.json`에 훅 추가:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs",
            "timeout": 5
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /opt/oh-my-claude-money/src/hooks/session-start.mjs",
            "timeout": 3
          }
        ]
      }
    ]
  }
}
```

## 사용법

### 자동 감지 (훅 기반)

설치 후 자동으로 작동합니다:
- 키워드 입력 시 전환 안내 메시지 표시
- 사용량 임계치 도달 시 경고 메시지 표시

### 수동 전환

```bash
# 컨텍스트 저장 + OpenCode 실행
/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh

# 컨텍스트만 저장
/opt/oh-my-claude-money/scripts/export-context.sh
```

### 슬래시 명령어

Claude Code에서 `/opencode` 명령어 사용 (플러그인 활성화 필요)

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
│   └── hybrid-ultrawork.md       # 🆕 /hulw 명령어
├── skills/
│   └── hybrid-ultrawork.md       # 🆕 하이브리드 스킬
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

또는 [GitHub](https://github.com/opencode-ai/opencode)에서 다운로드

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
### 최근 커밋 변경 파일
```
 src/auth/login.ts | 45 +++++++
 src/auth/session.ts | 23 ++++
```

## 다음 단계 지시
위의 컨텍스트를 바탕으로 작업을 이어서 진행해주세요.
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
