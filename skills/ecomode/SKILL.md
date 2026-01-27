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
- explore, explore-medium → explore (Flash)
- researcher, researcher-low → general (Flash)
- writer → general (Flash)
- designer-low → build (Flash)
- executor-low → build (Flash)

### 강제 MEDIUM 티어 (GPT Codex)
- architect, architect-medium → build (Codex)
- executor → build (Codex)
- designer → build (Codex)

### Opus 유지 (품질 필수)
- planner, critic, analyst → 원래 티어 유지
- security-reviewer → 보안은 타협 불가
- executor-high → 복잡한 구현은 품질 우선

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
// ~/.omcm/state/ecomode.json
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

## 종료 조건

- `cancel` 또는 `stop` 명령
- 세션 종료
- 명시적 `ecomode off`
