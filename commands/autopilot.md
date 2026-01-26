---
description: 하이브리드 오토파일럿 - 아이디어부터 완성까지 자율 실행
aliases: [ap, auto, 오토파일럿]
---

# Hybrid Autopilot

[HYBRID AUTOPILOT ACTIVATED - AUTONOMOUS FUSION EXECUTION]

아이디어부터 완성까지 Claude + OpenCode 퓨전으로 자율 실행합니다.

## 사용자 아이디어

{{ARGUMENTS}}

## 퓨전 오토파일럿 단계

### Phase 1: 분석 (Analysis)
- **Oracle (GPT)**: 요구사항 분석 및 기술 스펙 작성
- **Claude**: 아키텍처 설계 및 검증

### Phase 2: 계획 (Planning)
- **Oracle (GPT)**: 구현 계획 초안 작성
- **Claude Critic**: 계획 리뷰 및 개선

### Phase 3: 실행 (Execution)
- **Claude Executor**: 핵심 로직 구현
- **Frontend Engineer (Gemini)**: UI/프론트엔드 작업
- **Oracle (GPT)**: 코드 리뷰 및 문서화

### Phase 4: QA
- **Claude QA**: 테스트 실행 및 버그 수정
- **Oracle (GPT)**: 보안 리뷰

### Phase 5: 완료 (Completion)
- **Claude Architect**: 최종 검증
- 사용자에게 결과 보고

## 중단 방법

```
/omcm:cancel-autopilot
```
또는 "stop", "cancel", "중단" 키워드 사용

## 시작

아이디어를 분석하고 하이브리드 오토파일럿을 시작합니다.
