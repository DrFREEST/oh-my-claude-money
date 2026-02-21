# OMCM 스킬 레퍼런스 가이드

> **버전 기준 (OMC 4.2.15):** 본 문서는 `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, `gemini-3-pro`를 기본으로 설명합니다. `researcher`, `tdd-guide`, `*-low`/`*-medium` 표기는 하위호환(legacy) 맥락에서만 유지됩니다.

이 문서는 oh-my-claude-money(OMCM)의 모든 스킬을 상세히 설명합니다. 각 스킬의 트리거, 사용 방법, 동작 방식을 한눈에 파악할 수 있습니다.

---

## 목차

1. [autopilot (하이브리드 오토파일럿)](#1-autopilot-하이브리드-오토파일럿)
2. [ulw (울트라워크 with 자동 퓨전)](#2-ulw-울트라워크-with-자동-퓨전)
3. [hulw (하이브리드 울트라워크)](#3-hulw-하이브리드-울트라워크)
4. [ralph (완료까지 지속 실행)](#4-ralph-완료까지-지속-실행)
5. [opencode (OpenCode 전환)](#5-opencode-opencode-전환)
6. [cancel (통합 취소)](#6-cancel-통합-취소)
8. [스킬 조합 및 최적 사용법](#스킬-조합-및-최적-사용법)

---

## 1. autopilot (하이브리드 오토파일럿)

### 설명

아이디어부터 완성까지 **완전 자율 실행**하는 모드입니다. Claude + OpenCode 퓨전을 지원하여 토큰 절약과 성능을 동시에 추구합니다.

### 트리거 키워드

| 키워드 | 예시 |
|--------|------|
| `autopilot` | "autopilot: REST API 만들어줘" |
| `/autopilot` | "/autopilot React 대시보드 구현" |
| `오토파일럿` | "오토파일럿으로 챗봇 만들어줘" |
| `build me` | "build me a todo app" |
| `만들어줘` | "자동 배포 시스템 만들어줘" |
| `I want a` | "I want a CLI tool" |

### 사용 예시

```
autopilot: 사용자 인증 기능을 구현해줘
```

또는

```
build me a payment processing system
```

### 동작 흐름

```
1. 알림 출력
   ↓
2. Task 도구로 에이전트 위임 (플래너 또는 분석가)
   ↓
3. 자동 워크플로우 실행
   - 요구사항 분석 (architect/analyst)
   - 계획 수립 (planner)
   - 코드 탐색 (explore)
   - 구현 (executor)
   - 최종 검증 (architect)
   ↓
4. 완료 보고
```

### 에이전트 라우팅 (자동 처리)

OMCM이 자동으로 다음과 같이 라우팅합니다:

| 단계 | OMC 에이전트 | → | OMO 에이전트 | 모델 |
|------|-------------|---|-------------|------|
| 요구사항 분석 | analyst | → | Claude (fallback) | Opus |
| 코드 탐색 | explore | → | explore | Gemini 3 Flash |
| UI 구현 | designer | → | build | GPT-5.3-Codex |
| 리서치 | researcher | → | general | GPT-5.3-Codex |
| 실행/구현 | executor | → | build | GPT-5.3-Codex |
| 최종 검증 | architect | → | Claude (fallback) | Opus |

### 중요: 병렬 처리 규칙

**autopilot 활성화 시 반드시 병렬로 Task 호출해야 합니다!**

```xml
❌ 잘못된 예 (순차 호출)
Task(...) // 완료 대기
Task(...) // 완료 대기

✅ 올바른 예 (병렬 호출)
<function_calls>
<invoke name="Task">...</invoke>
<invoke name="Task">...</invoke>
</function_calls>
```

### 활성화 조건

- **자동 하이브리드 전환**: `fusionDefault: true` 설정 또는 사용량 70% 이상
- **명시적 요청**: "autopilot hulw", "hybrid autopilot"

### 중단 방법

- `stop`, `cancel`, `중단` 키워드 사용
- `/omcm:cancel-autopilot` 명령

---

## 2. ulw (울트라워크 with 자동 퓨전)

### 설명

**사용량에 따라 자동으로 모드를 결정**합니다. 낮은 사용량에서는 Claude 에이전트로, 높은 사용량에서는 OpenCode로 자동 전환됩니다.

### 트리거 키워드

| 키워드 | 예시 |
|--------|------|
| `ulw` | "ulw: 이 프로젝트 리팩토링해줘" |
| `/ulw` | "/ulw 모든 에러 수정" |
| `ultrawork` | "ultrawork로 빠르게 처리" |
| `울트라워크` | "울트라워크 시작" |

### 동작 방식

| 사용량 | 모드 | 동작 |
|--------|------|------|
| < 70% | 일반 울트라워크 | Claude 에이전트로 병렬 실행 |
| 70-90% | 하이브리드 | 일부 작업을 OpenCode로 오프로드 |
| > 90% | OpenCode 중심 | 대부분 OpenCode로 위임 |

### 사용 예시

```
ulw: 이 버그 빠르게 수정해줘
```

```
ulw로 전체 테스트 스위트 리팩토링
```

### 에이전트 라우팅 매핑

OMCM이 사용량과 설정에 따라 자동 처리:

| OMC 에이전트 | → | OMO 에이전트 | 모델 |
|-------------|---|-------------|------|
| explore | → | explore | Gemini 3 Flash |
| explore-medium | → | explore | GPT-5.3-Codex |
| explore-high | → | Claude (fallback) | Opus |
| architect | → | Claude (fallback) | Opus |
| architect-medium | → | build | GPT-5.3-Codex |
| architect-low | → | explore | Gemini 3 Flash |
| researcher | → | general | GPT-5.3-Codex |
| researcher-low | → | general | Gemini 3 Flash |
| designer | → | build | GPT-5.3-Codex |
| designer-low | → | build | Gemini 3 Flash |
| writer | → | general | Gemini 3 Flash |
| vision | → | general | GPT-5.3-Codex |
| executor | → | build | GPT-5.3-Codex |
| executor-low | → | build | Gemini 3 Flash |

### 알림 메시지

사용량에 따라 다른 알림을 받게 됩니다:

- **낮음** → "**ulw 모드** - Claude 에이전트로 병렬 실행"
- **중간** → "**ulw → hulw 자동 전환** - 토큰 절약을 위해 퓨전 모드로 전환"
- **높음** → "**ulw → OpenCode 중심** - 사용량이 높아 OpenCode 위주로 진행"

### ulw vs hulw 차이

| 항목 | ulw | hulw |
|------|-----|------|
| 기본 동작 | 사용량 기반 자동 결정 | 항상 OpenCode 퓨전 |
| 토큰 절약 | 조건부 | 항상 |
| 적합한 상황 | 일반 작업 | 토큰 절약이 항상 필요할 때 |

---

## 3. hulw (하이브리드 울트라워크)

### 설명

Claude와 OpenCode를 함께 활용하여 **토큰 사용량을 최적화**하면서 병렬 처리를 수행합니다. 항상 퓨전 모드로 작동합니다.

### 트리거 키워드

| 키워드 | 예시 |
|--------|------|
| `hulw` | "hulw: 이 프로젝트 리팩토링해줘" |
| `/hulw` | "/hulw 모든 에러 수정" |
| `hybrid ultrawork` | "hybrid ultrawork로 시작" |
| `하이브리드 울트라워크` | "하이브리드 울트라워크 모드" |

### 사용 예시

```
hulw: 데이터베이스 스키마 마이그레이션 구현
```

```
이 프로젝트 완전히 리팩토링해줘 hulw
```

### 동작 방식

```
1. 작업 분석
   ↓
2. 라우팅 결정
   - 분석/탐색 작업 → OMO explore/general (GPT-5.3-Codex/Gemini 3 Flash)
   - UI/프론트엔드 → OMO build (GPT-5.3-Codex)
   - 복잡한 구현 → Claude (Opus)
   ↓
3. 병렬 실행
   ↓
4. 결과 통합
```

### 에이전트 라우팅 맵

| 작업 유형 | 라우팅 | 모델 | 절약 |
|----------|--------|------|------|
| 아키텍처 분석 | Claude (fallback) | Opus | - |
| 코드 탐색 | OMO explore | Gemini 3 Flash | ✅ |
| UI 작업 | OMO build | GPT-5.3-Codex | ✅ |
| 리서치 | OMO general | GPT-5.3-Codex | ✅ |
| 복잡한 구현 | Claude executor-high | Opus | - |
| 전략적 계획 | Claude planner | Opus | - |

### 설정

`~/.claude/plugins/omcm/config.json`:

```json
{
  "fusionDefault": true,
  "threshold": 90,
  "autoHandoff": false
}
```

### 주의사항

- OpenCode 프로바이더 인증이 필요합니다 (OPENAI_API_KEY, GOOGLE_API_KEY)
- 인증되지 않은 프로바이더는 Claude로 폴백됩니다

---

## 4. ralph (완료까지 지속 실행)

### 설명

시시포스처럼 작업이 **완전히 완료되고 검증될 때까지 멈추지 않습니다**. 검증 통과할 때까지 자기참조 루프를 반복합니다.

### 핵심 철학

> "HUMAN IN THE LOOP = BOTTLENECK"
> 사용자 개입 없이 완료까지 자율 실행

### 트리거 키워드

| 키워드 | 예시 |
|--------|------|
| `ralph` | "ralph: 이 기능 완벽하게 구현" |
| `don't stop` | "don't stop until it works" |
| `must complete` | "must complete this task" |
| `끝까지` | "이 버그 끝까지 수정해줘" |
| `완료할때까지` | "완료할때까지 멈추지마" |
| `멈추지마` | "멈추지마고 계속해줘" |
| `/ralph` | "/ralph" |

### 사용 예시

```
ralph: 이 복잡한 기능 완벽하게 구현해줘
```

```
don't stop until all tests pass
```

### Ralph 루프 구조

```
시작
  ↓
작업 실행
  ↓
검증 (Architect)
  ↓
통과? ─No→ 수정 → 작업 실행 (반복)
  │
  Yes
  ↓
완료 선언
```

### 검증 기준 (5가지 필수)

1. **BUILD**: 빌드 성공 (에러 0개)
2. **TEST**: 모든 테스트 통과
3. **LINT**: 린트 에러 없음
4. **FUNCTIONALITY**: 요청 기능 동작 확인
5. **TODO**: 모든 태스크 완료

### 상태 관리

```json
// ~/.omcm/state/ralph.json
{
  "active": true,
  "startedAt": "2026-01-27T10:00:00Z",
  "iterations": 3,
  "lastVerification": {
    "build": true,
    "test": false,
    "lint": true,
    "functionality": "pending",
    "todo": false
  },
  "blockers": ["test failure in auth.test.ts"]
}
```

### 퓨전 모드 통합

Ralph와 퓨전 모드를 조합할 수 있습니다:

```
ralph hulw: 하이브리드 울트라워크로 완료까지
```

### 안전장치

#### 최대 반복 횟수
- 기본: 10회
- 설정: `ralph --max-iterations 20`

#### 타임아웃
- 기본: 30분
- 설정: `ralph --timeout 60`

#### 에스컬레이션
- 3회 연속 동일 오류 → 사용자에게 도움 요청
- 5회 연속 실패 → 자동 중단 + 상태 보고

### 완료 조건

다음 **모두** 충족 시 완료:
- [ ] 모든 TODO 태스크 완료
- [ ] 빌드 성공
- [ ] 테스트 통과
- [ ] Architect 검증 승인
- [ ] 기능 동작 확인

### 취소 방법

- `cancel` - 현재 반복 완료 후 중단
- `cancel --force` - 즉시 중단
- `stop` - cancel과 동일

---

## 5. opencode (OpenCode 전환)

### 설명

현재 작업 컨텍스트를 저장하고 **OpenCode로 자연스럽게 전환**합니다.

### 트리거 키워드

| 키워드 | 예시 |
|--------|------|
| `opencode` | "opencode로 전환해줘" |
| `전환` | "OpenCode로 전환" |
| `handoff` | "handoff to opencode" |
| `오픈코드` | "오픈코드로 이어서" |

### 사용 예시

```
이 작업을 opencode로 이어서 진행해줘
```

```
opencode로 전환: 나머지 구현 마무리
```

### 전환 프로세스

```
1. 컨텍스트 수집
   - 현재 작업 상태
   - TODO 리스트
   - 최근 수정 파일
   - 결정 사항
   ↓
2. 컨텍스트 저장
   - ~/.omcm/handoff/context.md에 마크다운 형식으로 저장
   ↓
3. 프로세스 교체
   - exec로 Claude Code → OpenCode 자연스럽게 전환
```

### 스크립트

자동 실행:
```bash
/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh "$(pwd)"
```

수동 실행 (터미널):
```bash
/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh
```

컨텍스트만 저장 (전환 없이):
```bash
/opt/oh-my-claude-money/scripts/export-context.sh "$(pwd)"
```

### 참고사항

- 전환 후 Claude Code 프로세스는 종료됩니다 (exec 방식)
- 다시 Claude Code로 돌아가려면 터미널에서 `claude` 명령 실행
- 컨텍스트는 `~/.omcm/handoff/context.md`에 저장됨

---

## 6. cancel (통합 취소)

### 설명

모든 활성화된 OMCM 모드를 자동으로 감지하고 취소합니다.

### 트리거 키워드

| 키워드 | 예시 |
|--------|------|
| `cancel` | "cancel" |
| `stop` | "stop" |
| `abort` | "abort" |
| `취소` | "취소해줘" |
| `중지` | "중지" |
| `/cancel` | "/cancel" |

### 취소 대상 모드

| 모드 | 상태 파일 | 취소 동작 |
|------|----------|----------|
| autopilot | `~/.omcm/state/autopilot.json` | 세션 종료, 상태 초기화 |
| ralph | `~/.omcm/state/ralph.json` | 루프 중단, 상태 초기화 |
| ultrawork | `~/.omcm/state/ultrawork.json` | 병렬 작업 중단 |
| hulw | `~/.omcm/state/hulw.json` | 하이브리드 모드 해제 |
| swarm | `~/.omcm/state/swarm.json` | 에이전트 풀 해제 |
| pipeline | `~/.omcm/state/pipeline.json` | 파이프라인 중단 |

### 사용 방법

#### 기본 취소

```
cancel
```

또는

```
stop
```

#### 강제 전체 취소

```
cancel --force
```

또는

```
cancel --all
```

### 취소 후 동작

- 모든 백그라운드 에이전트 종료
- 상태 파일 초기화 (`active: false`)
- 사용자에게 취소 완료 메시지 출력
- TodoList 상태는 유지 (작업 기록 보존)

### 주의사항

- 진행 중인 파일 수정은 완료 후 취소됨
- 커밋되지 않은 변경사항은 유지됨
- 취소 후 동일 모드 재시작 가능

---

## 스킬 조합 및 최적 사용법

### 스킬 조합 가이드

#### 1. 빠른 구현 (속도 우선)

```
ulw: React 컴포넌트 빠르게 구현해줘
```

**최적**: 사용량 낮거나 중간일 때 빠른 개발

#### 2. 토큰 절약 (효율 우선)

```
save-tokens: TypeScript 타입 오류 모두 수정
```

**최적**: 토큰 사용량 높을 때

#### 3. 완료 보장 (신뢰성 우선)

```
ralph: 이 버그 완벽하게 수정해줘
```

**최적**: 중요한 기능 구현이나 버그 수정

#### 4. 하이브리드 퓨전 (균형)

```
hulw: 데이터베이스 스키마 마이그레이션
```

**최적**: 대규모 프로젝트 리팩토링

#### 5. 완전 자율 (아이디어부터 완성까지)

```
autopilot: REST API 서버 구축하고 배포까지 해줘
```

**최적**: 새로운 프로젝트 초기 구현

### 조합 예시

#### 병렬 + 퓨전

```
hulw ulw: 빠르게 리팩토링해줘
```

동작:
- 울트라워크 병렬 처리
- 사용량 기반 자동 라우팅

#### 최고 성능

```
ralph hulw: 핵심 기능 완벽하게 구현해줘
```

동작:
- Claude + OpenCode 퓨전
- 완료까지 지속 보장

### 사용량별 권장 스킬

| 사용량 | 권장 모드 | 이유 |
|--------|----------|------|
| 0-50% | ulw, autopilot | Claude 충분, 속도 우선 |
| 50-70% | hulw, save-tokens | 토큰 절약 시작 |
| 90%+ | save-tokens, opencode 전환 | OpenCode 위주 |

### 상황별 최적 선택

#### 새로운 프로젝트 구현

```
autopilot: 요구사항을 자세히 설명하면
전체 구현부터 테스트까지 자동으로 처리
```

#### 긴급 버그 수정

```
ralph: 버그를 설명하면 찾고 수정하고
검증까지 자동으로 완료
```

#### 토큰 부족 상황

```
save-tokens: 효율적으로 처리하되,
품질이 중요하면 save-tokens + 특정 에이전트명
```

#### 대규모 리팩토링

```
hulw: Claude와 OpenCode의 장점을 활용하여
효율적으로 처리
```

#### 단순 질문/조사

```
일반 모드 사용 (스킬 미활성화)
```

---

## 자동 활성화 규칙

### 자동 모드 전환

OMCM은 다음 조건에서 자동으로 모드를 제안합니다:

| 사용량 | 자동 제안 |
|--------|----------|
| 70% 이상 | hulw 또는 save-tokens 권장 |
| 90% 이상 | OpenCode 중심 모드 전환 권장 |

### 설정 기반 자동 활성화

`~/.claude/plugins/omcm/config.json`:

```json
{
  "defaultExecutionMode": "ultrawork",  // 기본값
  "fusionDefault": false,               // 퓨전 기본 활성화 여부
  "ecoDefaultThreshold": 70,            // Eco 자동 제안 임계값
  "autoHandoff": false                  // 90%+ 자동 전환 여부
}
```

---

## 트러블슈팅

### 문제: 스킬이 활성화되지 않음

**확인 사항**:
1. 키워드가 정확하게 포함되어 있는가?
2. OMCM이 설치되고 활성화되어 있는가?
3. `~/.claude/plugins/omcm/` 디렉토리가 있는가?

**해결책**:
```bash
# OMCM 설치 확인
ls ~/.claude/plugins/omcm/

# 플러그인 재설정
/oh-my-claudecode:omc-setup
```

### 문제: Task 호출 시 라우팅 오류

**원인**: OpenCode 인증 정보 누락

**해결책**:
```bash
# 환경변수 확인
echo $OPENAI_API_KEY
echo $GOOGLE_API_KEY

# 설정 파일 확인
cat ~/.claude/plugins/omcm/config.json
```

### 문제: Ralph 루프가 무한 반복

**원인**: 버그가 고칠 수 없는 구조적 문제

**해결책**:
```
cancel --force
```

그 후 문제를 분석하고 새로 시작

### 문제: 토큰 절약이 예상보다 적음

**원인**: 복잡한 작업으로 Opus 모델 사용

**개선책**:
1. 더 구체적인 지시사항 제공
2. 작업을 더 작은 단위로 분해
3. `save-tokens` 스킬로 명시적 절약 요청

---

## 참고 자료

- [OMCM 메인 문서](/opt/oh-my-claude-money/README.md)
- [OMCM 설정 가이드](/opt/oh-my-claude-money/docs/CONFIGURATION.md)
- [OMCM 아키텍처](/opt/oh-my-claude-money/docs/ARCHITECTURE.md)
