# 퓨전 모드 가이드 - OMCM v2.1.5

> **버전 기준 (OMC 4.2.15):** 본 문서는 `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, `gemini-3-pro`를 기본으로 설명합니다. `researcher`, `tdd-guide`, `*-low`/`*-medium` 표기는 하위호환(legacy) 맥락에서만 유지됩니다.

**Claude Code ↔ OpenCode 지능형 토큰 최적화 완전 가이드**

---

## 목차

1. [퓨전 모드란?](#퓨전-모드란)
2. [퓨전 명령어](#퓨전-명령어)
3. [에이전트 매핑](#에이전트-매핑)
4. [사용 시나리오](#사용-시나리오)
5. [베스트 프랙티스](#베스트-프랙티스)
6. [문제 해결](#문제-해결)
7. [고급 주제](#고급-주제)

---

## 퓨전 모드란?

### 개요

퓨전 모드는 Claude Code의 35개 OMC(oh-my-claudecode) 에이전트를 OpenCode의 OMO(oh-my-opencode) 에이전트와 통합하여 **Claude 토큰을 62% 절약**하면서도 최상의 작업 품질을 유지합니다.

### 토큰 절약 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│              사용자 요청 (아이디어 / 작업)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌──────────────────────────────┐
         │  퓨전 라우터 (Conductor)      │
         │ "어떤 LLM이 최적인가?"          │
         └──────────────────────────────┘
              ↓                    ↓
    ┌─────────────────┐  ┌────────────────────┐
    │ Claude Opus     │  │ OpenCode Agents    │
    │ (HIGH TIER)     │  │ (LOW/MEDIUM TIER)  │
    │                 │  │                    │
    │ • planner       │  │ • build (GPT/Gem)  │
    │ • critic        │  │ • explore (Gem)    │
    │ • architect     │  │ • general (GPT/Gem)│
    └─────────────────┘  └────────────────────┘
         ✓ 높은 품질      ✓ 토큰 절약!
```

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **품질 우선** | 중요한 작업(전략/조율)은 Claude Opus 사용 |
| **비용 최적화** | 분석/탐색은 GPT/Gemini로 위임 (62% 절약) |
| **자동 라우팅** | 작업 유형과 사용량 기반 지능형 분배 |
| **매끄러운 컨텍스트** | 프로바이더 전환 시 작업 상태 자동 전달 |

### 토큰 절약 내역

**22개 에이전트 (62%)가 OpenCode로 오프로드:**

| 티어 | 원래 모델 | 퓨전 모드 모델 | 절약 |
|------|---------|---------------|------|
| **HIGH** | Claude Opus | Claude Opus | - |
| **MEDIUM** | Claude Sonnet | GPT-5.3-Codex | ✅ |
| **LOW** | Claude Haiku | Gemini 3 Flash | ✅ |

**예시 프로젝트**:
- 일반 작업 (Claude만): 100k tokens
- 퓨전 모드: 38k tokens (62% 절약)

---

## 퓨전 명령어

### 1. `hulw` - 하이브리드 울트라워크 (항상 퓨전)

**특징**: OpenCode 퓨전을 항상 활성화하여 Claude 토큰을 최대로 절약합니다.

```bash
# 다음 중 어느 것이든 인식됩니다:
/hulw 이 프로젝트 리팩토링해줘
이 프로젝트 리팩토링해줘 hulw
hulw로 빠르게 처리
hulw: 로그인 기능 구현
```

**언제 사용하는가?**
- Claude 토큰이 제한적일 때
- 최고 속도를 원할 때 (병렬 처리)
- 토큰 절약이 최우선일 때

**동작 흐름:**

```
hulw 명령어 감지
     ↓
작업 분석 (Task 호출)
     ↓
OMCM이 자동으로 OMO로 라우팅
     ↓
OpenCode ULW 모드로 병렬 실행
     ↓
결과 통합 & 응답
```

**예시:**

```
사용자: hulw: REST API 프로젝트 생성해줘
        - 경로 설계
        - 컨트롤러 구현
        - 테스트 작성

OMCM의 자동 라우팅:
├─ 경로 설계 → explore (Gemini 3 Flash) ✅
├─ 컨트롤러 구현 → executor (GPT-5.3-Codex) ✅
└─ 테스트 작성 → executor (GPT-5.3-Codex) ✅

결과: 62% 토큰 절약 + 병렬 처리
```

### 2. `ulw` - 자동 퓨전 울트라워크 (사용량 기반)

**특징**: 사용량에 따라 자동으로 퓨전 모드를 결정합니다.

```bash
/ulw 버그 수정해줘
버그 수정해줘 ulw
ulw로 진행
울트라워크 모드로 작업
```

**사용량별 동작:**

| 사용량 | 모드 | 동작 |
|--------|------|------|
| **< 70%** | 일반 ULW | Claude 에이전트 사용 (최고 품질) |
| **70-90%** | 하이브리드 | 일부 작업 OpenCode로 오프로드 |
| **> 90%** | OpenCode 중심 | 대부분 OpenCode로 위임 |

**언제 사용하는가?**
- 일반적인 작업 (기본 추천)
- 사용량을 효율적으로 관리하고 싶을 때
- 자동으로 최적의 모드를 원할 때

**예시:**

```
사용량이 65%일 때:
/ulw 코드 리뷰해줘
→ 일반 ULW 모드 (Claude 사용) ✓ 최고 품질

사용량이 80%일 때:
/ulw 코드 리뷰해줘
→ 자동으로 하이브리드 전환 ✓ 일부 OpenCode 사용

사용량이 95%일 때:
/ulw 코드 리뷰해줘
→ OpenCode 중심 모드 ✓ 최대 토큰 절약
```

### 3. `autopilot` - 하이브리드 오토파일럿 (자율 실행 + 퓨전)

**특징**: 아이디어부터 완성까지 자동으로 처리하면서 퓨전 지원.

```bash
/autopilot REST API 만들어줘
autopilot으로 대시보드 구현
build me a todo app
만들어줘 autopilot
I want a login system
```

**오토파일럿 워크플로우:**

```
1. 요구사항 분석 (analyst) → Claude Opus (HIGH - fallback)
2. 계획 수립 (planner) → Claude Opus (HIGH - 전략 수립)
3. 코드 탐색 (explore) → OMO explore (Gemini 3 Flash)
4. 구현 (executor) → OMO build (GPT-5.3-Codex)
5. 검증 (architect) → Claude Opus (HIGH - fallback)
6. 완료 보고
```

**명시적 하이브리드 요청:**

```bash
autopilot hulw 대시보드 만들어줘
hybrid autopilot으로 진행
퓨전 오토파일럿 모드로
```

**언제 사용하는가?**
- 프로젝트 전체 구현이 필요할 때
- 아이디어 → 실행까지 자동으로 처리하고 싶을 때
- 토큰 절약 + 속도가 모두 중요할 때

### 4. 설정 명령어

#### 퓨전 기본값 활성화

```bash
/omcm:fusion-default-on
```

**효과**: 모든 작업에서 퓨전 라우팅을 기본으로 적용

| 명령어 | 일반 작업 | `ulw` | `hulw` | `autopilot` |
|--------|---------|-------|--------|------------|
| 기본값 OFF | Claude | 사용량 기반 | 퓨전 | 사용량 기반 |
| **기본값 ON** | **퓨전** | **퓨전** | **퓨전** | **퓨전** |

#### 퓨전 기본값 비활성화

```bash
/omcm:fusion-default-off
```

**효과**: 사용량 기반 자동 전환으로 복구 (기본값)

---

## 에이전트 매핑

### 전체 라우팅 테이블

OMCM이 자동으로 처리하는 에이전트 라우팅:

| OMC 에이전트 | 티어 | 기본 라우팅 | 퓨전 모드 라우팅 | 모델 | 절약 |
|-------------|------|-----------|-----------------|------|------|
| **architect** | HIGH | Claude | Claude (fallback) | Opus | - |
| **executor-high** | HIGH | Claude | Claude (fallback) | Opus | - |
| **explore-high** | HIGH | Claude | Claude (fallback) | Opus | - |
| **planner** | HIGH | Claude | Claude (fallback) | Opus | - |
| **critic** | HIGH | Claude | Claude (fallback) | Opus | - |
| **analyst** | HIGH | Claude | Claude (fallback) | Opus | - |
| **qa-tester-high** | HIGH | Claude | Claude (fallback) | Opus | - |
| **security-reviewer** | HIGH | Claude | Claude (fallback) | Opus | - |
| **code-reviewer** | HIGH | Claude | Claude (fallback) | Opus | - |
| **scientist-high** | HIGH | Claude | Claude (fallback) | Opus | - |
| **designer-high** | HIGH | Claude | Claude (fallback) | Opus | - |
| **researcher-high** | HIGH | Claude | Claude (fallback) | Opus | - |
| **build-fixer-high** | HIGH | Claude | Claude (fallback) | Opus | - |
| **architect-medium** | MED | Claude | OMO build | GPT-5.3-Codex | ✅ |
| **executor** | MED | Claude | OMO build | GPT-5.3-Codex | ✅ |
| **explore-medium** | MED | Claude | OMO explore | GPT-5.3-Codex | ✅ |
| **researcher** | MED | Claude | OMO general | GPT-5.3-Codex | ✅ |
| **designer** | MED | Claude | OMO build | GPT-5.3-Codex | ✅ |
| **vision** | MED | Claude | OMO general | GPT-5.3-Codex | ✅ |
| **qa-tester** | MED | Claude | OMO build | GPT-5.3-Codex | ✅ |
| **build-fixer** | MED | Claude | OMO build | GPT-5.3-Codex | ✅ |
| **tdd-guide** | MED | Claude | OMO build | GPT-5.3-Codex | ✅ |
| **scientist** | MED | Claude | OMO build | GPT-5.3-Codex | ✅ |
| **architect-low** | LOW | Claude | OMO explore | Gemini 3 Flash | ✅ |
| **executor-low** | LOW | Claude | OMO build | Gemini 3 Flash | ✅ |
| **explore** | LOW | Claude | OMO explore | Gemini 3 Flash | ✅ |
| **researcher-low** | LOW | Claude | OMO general | Gemini 3 Flash | ✅ |
| **designer-low** | LOW | Claude | OMO build | Gemini 3 Flash | ✅ |
| **writer** | LOW | Claude | OMO general | Gemini 3 Flash | ✅ |
| **security-reviewer-low** | LOW | Claude | OMO build | Gemini 3 Flash | ✅ |
| **build-fixer-low** | LOW | Claude | OMO build | Gemini 3 Flash | ✅ |
| **tdd-guide-low** | LOW | Claude | OMO build | Gemini 3 Flash | ✅ |
| **code-reviewer-low** | LOW | Claude | OMO build | Gemini 3 Flash | ✅ |
| **scientist-low** | LOW | Claude | OMO build | Gemini 3 Flash | ✅ |
| **qa-tester-low** | LOW | Claude | OMO build | Gemini 3 Flash | ✅ |

### 라우팅 규칙

**퓨전 모드에서의 자동 라우팅 규칙:**

```javascript
// 1. HIGH TIER (Opus) - 퓨전 미적용 (fallbackToOMC: true)
if (tier === 'HIGH') {
  return 'Claude Opus'; // 모든 HIGH 에이전트는 Claude 유지
}

// 2. MEDIUM TIER (Sonnet) - 퓨전 적용 (GPT-5.3-Codex)
if (tier === 'MEDIUM') {
  return 'OMO Agent (GPT-5.3-Codex)'; // 토큰 절약!
}

// 3. LOW TIER (Haiku) - 퓨전 적용 (Gemini 3 Flash)
if (tier === 'LOW') {
  return 'OMO Agent (Gemini 3 Flash)'; // 최대 절약
}
```

### 모델 선택

퓨전 모드에서 모델 선택 기준:

| 작업 유형 | 선택 모델 | 이유 |
|----------|---------|------|
| 복잡한 분석/전략 | Claude Opus | HIGH 에이전트 - 품질 최우선 |
| 코드 구현 (표준) | GPT-5.3-Codex | MEDIUM 에이전트 - 코딩 특화 |
| UI/프론트엔드 | GPT-5.3-Codex | MEDIUM 에이전트 - 구현 작업 |
| 빠른 탐색 | Gemini 3 Flash | LOW 에이전트 - 빠른 응답, 저비용 |
| 데이터 분석 | GPT-5.3-Codex | MEDIUM 에이전트 - 분석 능력 |
| 보안 검토 | Claude Opus | HIGH 에이전트 - 보안 전문성 |

---

## 사용 시나리오

### 시나리오 1: 일반 개발

**상황**: 일반적인 개발 작업, Claude 토큰이 충분할 때

```bash
# 기본 ULW (사용량 기반 자동 전환)
/ulw 버그 수정해줘
/ulw 테스트 코드 작성
/ulw 코드 리뷰
```

**라우팅 결과** (사용량 65%):
- 모든 작업 → Claude 사용 (일반 ULW 모드)
- 토큰 절약: 0% (품질 우선)

### 시나리오 2: 높은 사용량

**상황**: 5시간 사용량 85%, 토큰 절약 필요

```bash
# ULW가 자동으로 하이브리드 모드 전환
/ulw 전체 프로젝트 리팩토링
```

**라우팅 결과** (사용량 85%):
- 코드 탐색 → OMO explore (Gemini 3 Flash) ✅
- 아키텍처 분석 → OMO build (GPT-5.3-Codex) ✅
- UI 작업 → OMO build (GPT-5.3-Codex) ✅
- 복잡한 구현 → Claude Opus ✓ (품질 필요)
- 토큰 절약: 약 45%

### 시나리오 3: 긴급 토큰 절약

**상황**: 5시간 사용량 95%, 즉시 토큰 절약 필요

```bash
# 명시적 hulw로 최대 절약
/hulw 새 기능 구현
```

**라우팅 결과** (사용량 95%):
- 모든 분석/탐색 → OpenCode
- 모든 구현 → OMO build (GPT-5.3-Codex 또는 Gemini 3 Flash)
- Claude는 필수 조율만 사용
- 토큰 절약: 약 62%

### 시나리오 4: 전체 프로젝트 개발

**상황**: 새 프로젝트 전체 구현 필요

```bash
# 하이브리드 오토파일럿
autopilot hulw 완전한 REST API 서버 만들어줘
```

**워크플로우:**

```
1. 요구사항 분석
   → Task(analyst) → Claude Opus (HIGH - fallback)

2. 계획 수립
   → Task(planner) → Claude Opus (HIGH - 품질 필수)

3. 디렉토리 구조 설계
   → Task(explore) → OMO explore (Gemini 3 Flash)

4. 컨트롤러 구현
   → Task(executor) → OMO build (GPT-5.3-Codex)

5. 미들웨어 구현
   → Task(executor) → OMO build (GPT-5.3-Codex)

6. 테스트 작성
   → Task(qa-tester) → OMO build (GPT-5.3-Codex)

7. 최종 검증
   → Task(architect) → Claude Opus (HIGH - fallback)

8. 완료 보고
```

**결과:**
- 병렬 처리: 5개 작업 동시 실행
- 토큰 절약: 약 58%
- 속도: 순차 처리 대비 ~60% 단축

### 시나리오 5: 검색/리서치 작업

**상황**: 코드베이스 분석, 리서치 필요

```bash
# 탐색 중심 작업 (OpenCode 최적)
/ulw 이 프로젝트의 인증 시스템 구조 분석해줘
```

**라우팅 결과:**
- Task(explore-high) → Claude Opus (HIGH - fallback)
- Task(researcher) → OMO general (GPT-5.3-Codex) ✅
- Task(architect) → Claude Opus (HIGH - fallback)
- 토큰 절약: 약 70% (탐색 중심이므로 높음)

---

## 베스트 프랙티스

### 1. 모드 선택

**선택 기준:**

```
┌─────────────────────────────────────────────────┐
│              Mode Selection Chart               │
├─────────────────────────────────────────────────┤
│ 사용량 < 70%?                                   │
│ └─ YES → ulw (자동 전환)                        │
│ └─ NO → hulw (최대 절약) 또는 autopilot         │
│                                                 │
│ 속도가 최우선?                                   │
│ └─ YES → hulw + 병렬 Task 호출                   │
│ └─ NO → ulw (사용량 기반)                       │
│                                                 │
│ 전체 프로젝트 구현?                              │
│ └─ YES → autopilot hulw                        │
│ └─ NO → ulw 또는 hulw                          │
└─────────────────────────────────────────────────┘
```

### 2. 컨텍스트 핸드오프

프로바이더 전환 시 자동으로 처리되지만, 수동으로도 가능합니다:

```bash
# 컨텍스트 저장 + OpenCode 전환
~/.local/share/omcm/scripts/handoff-to-opencode.sh

# 컨텍스트만 저장
~/.local/share/omcm/scripts/export-context.sh
```

**생성되는 컨텍스트** (`.omcm/handoff/context.md`):

```markdown
# 작업 핸드오프 컨텍스트

> Claude Code에서 OpenCode로 전환됨

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

### 3. CLI 설치 관리

퓨전 모드는 Codex/Gemini CLI를 직접 실행하여 간결하고 효율적인 프로바이더 호출을 제공합니다:

**성능 비교:**

| 모드 | 첫 호출 | 이후 호출 | 메모리 사용 |
|------|--------|----------|------------|
| v1.x 서버 풀 | ~5초 | ~1초 | ~250-300MB/서버 |
| **v2.1 CLI 직접 실행** | ~3-5초 | ~3-5초 | 0 (stateless) |

**CLI 설치 확인:**

```bash
# Codex CLI 확인
which codex || echo "Codex CLI 미설치"

# Gemini CLI 확인
which gemini || echo "Gemini CLI 미설치"

# 버전 확인
codex --version
gemini --version
```

**설정 옵션** (`~/.claude/plugins/omcm/config.json`):

```json
{
  "routing": {
    "maxOpencodeWorkers": 10,       // 최대 병렬 작업 수 (제한 없음, 참고용)
    "cliTimeout": 300000,           // CLI 타임아웃 (ms)
    "enableParallel": true          // 병렬 실행 활성화
  }
}
```

**리소스 사용량:**
- CLI 실행당: 일시적 프로세스 (완료 후 종료)
- 메모리: stateless (서버 유지 불필요)
- 병렬 제한: 시스템 리소스에 따라 자동 조정

### 4. 병렬 Task 실행

퓨전 모드에서 성능을 최대화하려면 **독립적인 작업을 반드시 병렬로 호출** 해야 합니다:

**올바른 예:**

```javascript
// 한 메시지에 여러 Task 동시 호출 (병렬 처리!)
Task(
  subagent_type="oh-my-claudecode:explore",
  prompt="모듈 A 분석"
)

Task(
  subagent_type="oh-my-claudecode:explore",
  prompt="모듈 B 분석"
)

Task(
  subagent_type="oh-my-claudecode:researcher",
  prompt="라이브러리 리서치"
)
```

**잘못된 예:**

```javascript
// ❌ 순차 호출 (느림!)
Task(...) // 완료 대기
Task(...) // 완료 대기
```

### 5. 설정 베스트 프랙티스

**기본 설정** (`~/.claude/plugins/omcm/config.json`):

```json
{
  "fusionDefault": false,           // 사용량 기반 (권장)
  "threshold": 90,                  // 90% 이상 전환 알림
  "autoHandoff": false,             // 수동 전환

  "routing": {
    "enabled": true,
    "usageThreshold": 70,           // 70% 이상 하이브리드
    "maxOpencodeWorkers": 3,        // 초기 3개 CLI 호출, 필요시 증가
    "autoDelegate": true
  },

  "context": {
    "includeRecentFiles": true,
    "recentFilesLimit": 10,
    "includeTodos": true,
    "maxContextLength": 50000
  },

  "notifications": {
    "showOnThreshold": true,        // 90% 알림
    "showOnKeyword": true,          // "opencode" 키워드 감지
    "quietMode": false
  }
}
```

### 6. 프로바이더 인증

퓨전 모드가 제대로 작동하려면 OpenCode 프로바이더 인증이 필수입니다:

```bash
# OpenAI 인증
opencode auth login openai

# Google (Gemini) 인증
opencode auth login google

# Anthropic 인증 (선택)
opencode auth login anthropic

# 인증 상태 확인
opencode auth status
```

**또는 환경 변수**:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

---

## 문제 해결

### 이슈 1: 퓨전 라우팅이 느림

**증상**: 퓨전 라우팅이 10초 이상 걸림

**원인**: CLI 미설치 또는 인증 실패

**해결책:**

```bash
# 1. CLI 설치 확인
which codex || echo "Codex CLI 미설치"
which gemini || echo "Gemini CLI 미설치"

# 2. CLI 버전 확인
codex --version
gemini --version

# 3. 인증 상태 확인
codex auth status
gemini auth status

# 4. 재인증 (필요시)
codex auth login
gemini auth login
```

**예방책:**
- 세션 시작 전 CLI 설치 및 인증 확인
- `cliTimeout` 값을 네트워크 환경에 맞게 조정

### 이슈 2: 프로바이더 인증 실패

**증상**: "OpenAI 인증 실패" 또는 "Google 인증 실패"

**원인**: 프로바이더 API 키 미설정 또는 만료

**해결책:**

```bash
# 1. 인증 상태 확인
opencode auth status

# 2. 미인증 프로바이더 재인증
opencode auth login openai      # OpenAI 재인증
opencode auth login google      # Google 재인증

# 3. API 키 유효성 확인
# OpenAI: https://platform.openai.com/account/api-keys
# Google: https://aistudio.google.com/apikey

# 4. 환경 변수로 설정 (이전 방법)
export OPENAI_API_KEY="새로운_키"
opencode auth status  # 확인
```

### 이슈 3: CLI 실행 실패

**증상**: "CLI 실행 오류" 또는 "명령을 찾을 수 없음"

**원인**: CLI 경로 문제 또는 권한 부족

**해결책:**

```bash
# 1. PATH 환경변수 확인
echo $PATH | grep -o "[^:]*codex[^:]*"
echo $PATH | grep -o "[^:]*gemini[^:]*"

# 2. CLI 실행 권한 확인
ls -l $(which codex)
ls -l $(which gemini)

# 3. 수동 실행 테스트
codex run --prompt "test" --model gpt-5.3
gemini run --prompt "test" --model gemini-3-flash

# 4. 재설치 (필요시)
# Codex CLI 재설치
# Gemini CLI 재설치
```

### 이슈 4: 핸드오프 컨텍스트 미전달

**증상**: OpenCode로 전환했는데 이전 작업 컨텍스트가 없음

**원인**: 컨텍스트 파일 생성 실패 또는 경로 오류

**해결책:**

```bash
# 1. 컨텍스트 수동 생성
~/.local/share/omcm/scripts/export-context.sh

# 2. 컨텍스트 파일 확인
cat ~/.omcm/handoff/context.md

# 3. 컨텍스트 경로 확인
echo $OMCM_CONTEXT_PATH

# 4. 수동 전환
~/.local/share/omcm/scripts/handoff-to-opencode.sh
```

### 이슈 5: HUD에 퓨전 메트릭 미표시

**증상**: 상태 표시줄에 퓨전 메트릭이 표시되지 않음

**원인**: HUD 렌더러가 로드되지 않음

**해결책:**

```bash
# 1. HUD 파일 확인
cat ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

# 2. settings.json 확인
cat ~/.claude/settings.json | grep statusLine

# 3. HUD 캐시 초기화
rm -rf ~/.claude/.omc/hud-cache
rm -rf ~/.omcm/hud-cache

# 4. Claude Code 재시작
exit    # Claude 종료
claude  # 재시작
```

### 이슈 6: 잘못된 프로바이더로 Task 라우팅

**증상**: 낮은 우선순위 작업이 Claude로 라우팅됨

**원인**: 라우팅 규칙 충돌 또는 `fusionDefault` 설정 오류

**해결책:**

```bash
# 1. fusionDefault 확인
cat ~/.claude/plugins/omcm/config.json | grep fusionDefault

# 2. 항상 퓨전 활성화 (테스트용)
/omcm:fusion-default-on

# 3. 라우팅 규칙 확인
cat ~/.local/share/omcm/src/router/rules.mjs

# 4. 사용량 확인
# HUD에서 "C:" (Claude 사용량) 확인
# 사용량 > 90%이면 자동 오프로드

# 5. 로그 확인
tail -f ~/.omcm/logs/fusion-router.log
```

### 이슈 7: 과도한 병렬 실행으로 인한 시스템 부하

**증상**: 병렬 작업 실행 시 시스템이 느려지거나 응답 없음

**원인**: 동시 CLI 프로세스가 너무 많음

**해결책:**

```bash
# 1. 병렬 작업 수 제한
# ~/.claude/plugins/omcm/config.json:
{
  "routing": {
    "maxOpencodeWorkers": 5  // 적절한 값으로 조정
  }
}

# 2. 실행 중인 CLI 프로세스 확인
ps aux | grep -E 'codex|gemini' | grep -v grep

# 3. 필요시 프로세스 종료
pkill -f 'codex run'
pkill -f 'gemini run'

# 4. 시스템 리소스 모니터링
top -o %CPU | grep -E 'codex|gemini'
```

### 이슈 8: Autopilot 취소 실패

**증상**: "stop" 명령어로 autopilot을 중단해도 계속 실행됨

**원인**: Task 도구가 백그라운드에서 실행 중

**해결책:**

```bash
# 1. 명시적 중단 명령어 사용
/omcm:cancel-autopilot

# 2. 모든 활성 Task 강제 종료
ps aux | grep "claude\|opencode" | grep -v grep | awk '{print $2}' | xargs kill -9

# 3. Claude 재시작
exit
claude
```

### 빠른 진단 스크립트

```bash
#!/bin/bash
# ~/diagnose-fusion.sh

echo "=== OMCM Fusion Mode Diagnostics ==="
echo ""

echo "1. Claude Code CLI"
claude --version && echo "✅" || echo "❌"

echo "2. OpenCode CLI"
opencode --version && echo "✅" || echo "❌"

echo "3. OMC 설정"
grep -q "oh-my-claudecode" ~/.claude/CLAUDE.md && echo "✅" || echo "❌"

echo "4. Fusion 설정"
[ -f ~/.claude/plugins/omcm/config.json ] && echo "✅" || echo "❌"

echo "5. HUD 설정"
grep -q "statusLine" ~/.claude/settings.json && echo "✅" || echo "❌"

echo "6. OpenCode 인증"
opencode auth status | grep -q "authenticated" && echo "✅" || echo "❌"

echo "7. CLI 설치 상태"
which codex > /dev/null && echo "✅ Codex installed" || echo "❌ Codex not found"
which gemini > /dev/null && echo "✅ Gemini installed" || echo "❌ Gemini not found"

echo "8. 컨텍스트 디렉토리"
[ -d ~/.omcm ] && echo "✅" || echo "❌"

echo ""
echo "문제 있는 항목을 확인하세요."
```

---

## 고급 주제

### 커스텀 에이전트 라우팅

기본 라우팅을 커스터마이징할 수 있습니다:

**파일**: `~/.claude/plugins/omcm/config.json`

```json
{
  "routing": {
    "preferOpencode": [
      "explore",
      "explore-medium",
      "researcher",
      "writer"
    ],
    "preferClaude": [
      "architect",
      "executor-high",
      "planner",
      "critic"
    ]
  }
}
```

### CLI 실행 튜닝

**고성능 설정** (많은 병렬 작업):

```json
{
  "routing": {
    "maxOpencodeWorkers": 20,
    "cliTimeout": 600000,
    "enableParallel": true
  }
}
```

**저리소스 설정** (시스템 부하 제한):

```json
{
  "routing": {
    "maxOpencodeWorkers": 3,
    "cliTimeout": 300000,
    "enableParallel": true
  }
}
```

### 토큰 사용량 분석

퓨전 모드 사용량 추적:

```bash
# 실시간 사용량 확인 (HUD)
# "C: 1.2k↓ 567↑|O: 25.8k↓ 9↑|G: 165.3k↓ 1.4k↑"
#  ↑ Claude    ↑ OpenAI    ↑ Gemini

# 상세 로그 확인
tail -f ~/.omcm/logs/metrics.log
```

---

## 지원 및 자료

| 자료 | URL |
|-----|-----|
| **GitHub Issues** | https://github.com/DrFREEST/oh-my-claude-money/issues |
| **Discussions** | https://github.com/DrFREEST/oh-my-claude-money/discussions |
| **OpenCode Docs** | https://opencode.ai/docs |
| **OMC Docs** | https://github.com/Yeachan-Heo/oh-my-claudecode |

---

**마지막 업데이트**: 2026-02-15
**버전**: 1.0.0
**라이선스**: MIT
