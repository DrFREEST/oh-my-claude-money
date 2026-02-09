---
name: ecomode
description: 토큰 효율 병렬 실행 모드 - Haiku/Flash 우선 라우팅으로 30-50% 토큰 절약
triggers:
  - eco
  - ecomode
  - efficient
  - budget
  - save-tokens
  - 절약
  - 효율
  - /eco
  - /ecomode
---

# OMCM Ecomode - 토큰 효율 모드

Claude 토큰을 최대한 절약하면서 작업을 수행하는 모드입니다.

## 핵심 원칙

1. **Haiku/Flash 우선**: 가능한 모든 작업을 저비용 모델로 라우팅
2. **병렬 처리 유지**: 속도는 유지하면서 비용만 절감
3. **품질 임계값**: 최소 품질 기준 미달 시 상위 모델로 에스컬레이션

## 라우팅 전략

### 강제 LOW 티어 (Gemini Flash)
- explore → explore (Flash)
- writer, style-reviewer, ux-researcher → general (Flash)

### 강제 MEDIUM 티어 (GPT Codex)
- architect, debugger → build (Codex)
- executor, dependency-expert → build (Codex)
- designer, vision → build (Codex)
- scientist, verifier → build (Codex)
- qa-tester, build-fixer, test-engineer → build (Codex)

### Opus 유지 (품질 필수)
- planner, critic, analyst → 원래 레인 유지
- security-reviewer, code-reviewer, quality-reviewer → 보안/품질은 타협 불가
- deep-executor → 복잡한 구현은 품질 우선
- product-manager, information-architect → 전략적 작업은 품질 우선

## 예상 절약률

| 작업 유형 | 기본 모드 | Ecomode | 절약률 |
|----------|----------|---------|-------|
| 탐색/검색 | Sonnet | Flash | ~70% |
| 표준 구현 | Sonnet | Codex | ~40% |
| 문서 작성 | Sonnet | Flash | ~70% |
| 코드 리뷰 | Opus | Codex | ~50% |
| 복잡한 분석 | Opus | Opus | 0% |

**평균 절약률**: 30-50%

## 활성화 방법

### 명시적 활성화
```
eco: 이 프로젝트의 모든 컴포넌트 리팩토링해줘
```

### 키워드 트리거
```
효율적으로 작업해줘
budget 모드로 진행
토큰 절약하면서 구현해줘
```

## 상태 관리

```json
// .omc/state/ecomode-state.json
{
  "active": true,
  "startedAt": "2026-01-27T10:00:00Z",
  "tokensSaved": 15000,
  "tasksCompleted": 12,
  "escalations": 2
}
```

## Ecomode + Ultrawork 조합

`eco ulw:` 또는 `ecomode ultrawork:` 형태로 조합 가능:
- 병렬 처리의 속도
- 저비용 모델의 경제성
- 최적의 가성비 달성

## 품질 모니터링

에스컬레이션 조건:
- 동일 작업 2회 실패
- 명시적 품질 요구 ("정확하게", "꼼꼼히")
- 보안/인증 관련 작업

## 컨텍스트 가드 규칙 (CRITICAL)

서브에이전트의 컨텍스트 한도 초과를 방지하기 위해 다음 규칙을 반드시 준수하세요:

### 파티션 크기 상한
- **에이전트당 최대 6개 파일** (절대 초과 금지)
- 6개 초과 시 반드시 추가 에이전트로 분할
- 예: 18개 파일 → 3개 에이전트 (6개씩)

### max_turns 설정 (필수)
Task 호출 시 반드시 `max_turns` 파라미터를 설정하세요:

| 파일 수 | max_turns |
|---------|-----------|
| 1-3개 | 15 |
| 4-6개 | 25 |
| 7개+ | 분할 필수 |

```
Task(
  subagent_type="oh-my-claudecode:executor",
  max_turns=25,
  prompt="..."
)
```

### 프롬프트 최적화
- 변경할 파일 목록과 구체적 변경 내용만 전달
- 전체 파일 내용을 프롬프트에 포함하지 않기 (에이전트가 직접 Read)
- 불필요한 배경 설명 최소화

## 컨텍스트 제한 복구

ecomode에서 워커가 컨텍스트 리밋에 도달하면 자동 복구가 동작합니다:

### 감지 패턴

다음 에러 메시지가 감지되면 복구 시작:
- `context limit reached`, `context window exceeded`
- `maximum context length`, `token limit exceeded`
- `conversation is too long`, `context_length_exceeded`

### 복구 흐름

```
실패 감지 → 부분 결과 저장 (.omc/state/context-recovery/)
  → Phase 1: 프롬프트 축소 + 재시도 (최대 2회, 60% → 45% 압축)
  → Phase 2: 작업 분할 + 서브태스크 개별 실행
  → 최종: 부분 결과만이라도 반환 (데이터 손실 없음)
```

### 결과 확인

- 복구 성공 시: 결과에 `recoveryMethod` 필드 포함
- 부분 결과: `.omc/state/context-recovery/{taskId}.json`에 저장
- 통계: `getStats()` 반환값에 `recoveryStats` 포함

## 종료 조건

- `cancel` 또는 `stop` 명령
- 세션 종료
- 명시적 `ecomode off`
