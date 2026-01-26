---
name: ulw
description: 울트라워크 with 자동 퓨전 - 사용량 높을 때 자동으로 OpenCode 퓨전. 키워드 "ulw", "/ulw" 감지 시 활성화
triggers:
  - ulw
  - /ulw
  - ultrawork
  - 울트라워크
---

# Ultrawork with Auto-Fusion (ulw)

## 트리거 감지

다음 패턴 중 하나라도 프롬프트에 포함되면 이 스킬이 활성화됩니다:
- `ulw` (어디든 포함)
- `/ulw`
- `ultrawork`
- `울트라워크`

예시:
- "/ulw 버그 수정해줘"
- "이거 ulw로 빠르게"
- "울트라워크 모드로 진행"

## 동작 방식

ulw는 **사용량에 따라 자동으로 퓨전 모드를 결정**합니다:

### 사용량 < 70%: 일반 울트라워크
- oh-my-claudecode의 기본 ultrawork 사용
- Claude 에이전트들로 병렬 실행

### 사용량 70-90%: 하이브리드 모드 (자동 전환)
- hulw 모드로 자동 전환
- 일부 작업을 OpenCode로 오프로드
- Claude 토큰 절약

### 사용량 > 90%: OpenCode 중심 모드
- 대부분의 작업을 OpenCode로 위임
- Claude는 최종 통합/검증만 담당
- 최대 토큰 절약

## 사용량 확인

HUD 캐시에서 실시간 사용량 확인:
- `~/.claude/plugins/oh-my-claudecode/.usage-cache.json`

```json
{
  "fiveHourPercent": 45,
  "weeklyPercent": 30
}
```

## 활성화 시 행동

1. 사용량 확인
2. 적절한 모드 선택:
   - 낮음 → "**ulw 모드** - Claude 에이전트로 병렬 실행"
   - 중간 → "**ulw → hulw 자동 전환** - 토큰 절약을 위해 퓨전 모드로 전환"
   - 높음 → "**ulw → OpenCode 중심** - 사용량이 높아 OpenCode 위주로 진행"

3. 선택된 모드로 작업 실행

## ulw vs hulw 차이

| 항목 | ulw | hulw |
|------|-----|------|
| 기본 동작 | Claude 우선 | OpenCode 퓨전 |
| 사용량 기반 | 자동 전환 | 항상 퓨전 |
| 토큰 절약 | 조건부 | 항상 |
| 적합한 상황 | 일반 작업 | 토큰 절약 필요 시 |
