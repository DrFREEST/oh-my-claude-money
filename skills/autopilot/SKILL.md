---
name: autopilot
description: 하이브리드 오토파일럿 - 아이디어부터 완성까지 자율 실행 + OpenCode 퓨전 지원. 키워드 "autopilot", "/autopilot" 감지 시 활성화
triggers:
  - autopilot
  - /autopilot
  - 오토파일럿
  - auto pilot
  - build me
  - 만들어줘
  - I want a
---

# Hybrid Autopilot - 퓨전 오토파일럿

## 트리거 감지

다음 패턴 중 하나라도 프롬프트에 포함되면 이 스킬이 활성화됩니다:
- `autopilot` (어디든 포함)
- `/autopilot`
- `오토파일럿`
- `build me`
- `만들어줘`
- `I want a`

예시:
- "/autopilot REST API 만들어줘"
- "autopilot으로 대시보드 구현"
- "build me a todo app"
- "로그인 기능 만들어줘"

## 하이브리드 오토파일럿

oh-my-claude-money의 autopilot은 **퓨전 모드를 지원**합니다:

### 일반 오토파일럿 (사용량 낮을 때)
- Claude 에이전트들로 자율 실행
- 계획 → 구현 → 테스트 → 검증 자동화

### 하이브리드 오토파일럿 (사용량 높거나 명시적 요청)
- OpenCode 에이전트 활용으로 토큰 절약
- Claude는 핵심 의사결정만 담당

## 활성화 조건

### 자동 하이브리드 전환
- 5시간/주간 사용량 70% 이상
- "hulw", "hybrid", "퓨전" 키워드 함께 사용

### 명시적 하이브리드 요청
- "autopilot hulw"
- "hybrid autopilot"
- "퓨전 오토파일럿"

## 오토파일럿 워크플로우

```
┌─────────────────────────────────────────────────────────────┐
│  1. 요구사항 분석                                            │
│     └─ 사용량 체크 → 퓨전 모드 결정                          │
│                         ↓                                   │
│  2. 자동 계획 수립                                           │
│     └─ 일반: Claude planner                                 │
│     └─ 퓨전: OpenCode Oracle + Claude 검증                  │
│                         ↓                                   │
│  3. 병렬 구현                                                │
│     └─ 일반: Claude executor 병렬                           │
│     └─ 퓨전: OpenCode + Claude 혼합                         │
│                         ↓                                   │
│  4. 자동 테스트 & 검증                                       │
│     └─ Claude architect 최종 검증                           │
│                         ↓                                   │
│  5. 완료 보고                                                │
└─────────────────────────────────────────────────────────────┘
```

## 퓨전 모드 에이전트 분배

| 단계 | 일반 모드 | 퓨전 모드 |
|------|----------|----------|
| 요구사항 분석 | Claude analyst | OpenCode Oracle |
| 코드 탐색 | Claude explore | OpenCode Librarian |
| 계획 수립 | Claude planner | Claude planner |
| UI 구현 | Claude designer | OpenCode Frontend |
| 백엔드 구현 | Claude executor | Claude executor |
| 리서치 | Claude researcher | OpenCode Oracle |
| 최종 검증 | Claude architect | Claude architect |

## 활성화 시 행동

1. 사용량 확인 및 모드 결정:
   > "**autopilot 활성화** - [일반/하이브리드] 모드로 자율 실행합니다."

2. 요구사항 분석 및 계획 수립

3. 작업 분해 및 병렬 실행

4. 지속적 검증 및 자동 수정

5. 완료 보고:
   > "**autopilot 완료** - [작업 요약] / 토큰 절약: [X]%"

## 중단 방법

- "stop", "cancel", "중단" 키워드
- `/oh-my-claude-money:cancel-autopilot`

## 주의사항

- 복잡한 프로젝트는 중간 확인을 위해 인터랙티브 모드 권장
- 민감한 작업(배포, 삭제 등)은 사용자 확인 요청
- OpenCode 프로바이더 미인증 시 Claude로 폴백
