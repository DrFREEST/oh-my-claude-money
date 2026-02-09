---
name: ralph
description: 완료까지 지속 실행 - 검증 통과할 때까지 멈추지 않는 자기참조 루프
triggers:
  - ralph
  - don't stop
  - must complete
  - 끝까지
  - 완료할때까지
  - 멈추지마
  - /ralph
---

# OMCM Ralph - 완료까지 지속 실행

시시포스처럼 작업이 완전히 완료되고 검증될 때까지 멈추지 않습니다.

## 핵심 철학

> "HUMAN IN THE LOOP = BOTTLENECK"
> 사용자 개입 없이 완료까지 자율 실행

## Ralph 루프 구조

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

## 검증 기준 (5가지 필수)

1. **BUILD**: 빌드 성공 (에러 0개)
2. **TEST**: 모든 테스트 통과
3. **LINT**: 린트 에러 없음
4. **FUNCTIONALITY**: 요청 기능 동작 확인
5. **TODO**: 모든 태스크 완료

## 활성화 방법

### 명시적 활성화
```
ralph: 이 기능 완벽하게 구현해줘
```

### 키워드 트리거
```
don't stop until this is done
끝까지 해줘
완료할때까지 멈추지마
must complete this task
```

## 상태 관리

```json
// .omc/state/ralph-state.json
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

## 퓨전 모드 통합

Ralph + 퓨전 모드 조합:
- `ralph hulw:` - 하이브리드 울트라워크 + 완료 보장
- `ralph eco:` - 토큰 절약하면서 완료 보장

## Stop 훅 통합

Ralph 모드가 활성화되면 `persistent-mode` 훅이 작동:
- 세션 종료 시도 시 미완료 작업 체크
- 검증 미통과 시 자동 재시작 프롬프트 주입
- 강제 종료는 `cancel --force`로만 가능

## 컨텍스트 가드 규칙 (CRITICAL)

각 반복(iteration)에서 서브에이전트의 컨텍스트 한도 초과를 방지하기 위한 규칙:

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
- 반복 간 이전 결과를 전체 포함하지 않고 요약만 전달

## 컨텍스트 제한 복구

ralph 루프에서 워커가 컨텍스트 리밋에 도달하면 자동 복구가 동작합니다:

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

## 안전장치

### 최대 반복 횟수
- 기본: 10회
- 설정 가능: `ralph --max-iterations 20`

### 타임아웃
- 기본: 30분
- 설정 가능: `ralph --timeout 60`

### 에스컬레이션
- 3회 연속 동일 오류 → 사용자에게 도움 요청
- 5회 연속 실패 → 자동 중단 + 상태 보고

## 완료 조건

다음 **모두** 충족 시 완료:
- [ ] 모든 TODO 태스크 완료
- [ ] 빌드 성공
- [ ] 테스트 통과
- [ ] Architect 검증 승인
- [ ] 기능 동작 확인

## 취소 방법

- `cancel` - 현재 반복 완료 후 중단
- `cancel --force` - 즉시 중단
- `stop` - cancel과 동일
