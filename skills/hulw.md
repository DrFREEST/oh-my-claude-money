---
name: hulw
description: 하이브리드 울트라워크 - Claude + OpenCode 퓨전 모드. 키워드 "hulw", "/hulw" 감지 시 자동 활성화
triggers:
  - hulw
  - /hulw
  - hybrid ultrawork
  - 하이브리드 울트라워크
---

# Hybrid Ultrawork (hulw) - 퓨전 모드

## 트리거 감지

다음 패턴 중 하나라도 프롬프트에 포함되면 이 스킬이 활성화됩니다:
- `hulw` (어디든 포함)
- `/hulw`
- `hybrid ultrawork`
- `하이브리드 울트라워크`

예시:
- "/hulw 이 프로젝트 리팩토링해줘"
- "이 프로젝트 리팩토링해줘 hulw"
- "hulw로 빠르게 처리해줘"

## 동작 방식

하이브리드 울트라워크는 **Claude 토큰을 절약**하면서 작업을 수행합니다:

1. **작업 분석**: 작업 유형 파악
2. **라우팅 결정**:
   - 분석/탐색 작업 → OpenCode (Oracle/GPT)
   - UI/프론트엔드 → OpenCode (Frontend Engineer/Gemini)
   - 복잡한 구현 → Claude (Opus)
3. **병렬 실행**: 가능한 작업은 동시 실행
4. **결과 통합**: 모든 결과를 통합하여 응답

## 에이전트 라우팅 맵

| 작업 유형 | 라우팅 | 모델 | 절약 |
|----------|--------|------|------|
| 아키텍처 분석 | OpenCode Oracle | GPT | ✅ |
| 코드 탐색 | OpenCode Librarian | - | ✅ |
| UI 작업 | OpenCode Frontend | Gemini | ✅ |
| 리서치 | OpenCode Oracle | GPT | ✅ |
| 복잡한 구현 | Claude executor | Opus | - |
| 전략적 계획 | Claude planner | Opus | - |

## 활성화 시 행동

이 스킬이 활성화되면:

1. 먼저 사용자에게 알림:
   > "**hulw 모드 활성화** - Claude + OpenCode 퓨전으로 토큰을 절약하면서 작업합니다."

2. 작업을 분석하고 최적의 에이전트 조합 결정

3. 가능한 작업은 OpenCode 에이전트로 위임하여 Claude 토큰 절약

4. 결과를 통합하여 최종 응답 제공

## 사용량 기반 자동 전환

- 5시간/주간 사용량 70% 이상 → 자동으로 hulw 모드 권장
- 90% 이상 → OpenCode 중심 모드로 강제 전환

## 주의사항

- OpenCode 프로바이더 인증이 필요합니다 (OPENAI_API_KEY, GOOGLE_API_KEY)
- 인증되지 않은 프로바이더는 Claude로 폴백됩니다
