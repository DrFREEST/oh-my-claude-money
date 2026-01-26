---
description: 하이브리드 울트라워크 - Claude + OpenCode 퓨전 병렬 실행
aliases: [hybrid-ultrawork, 하이브리드]
---

# Hybrid Ultrawork (hulw)

[HULW - HYBRID ULTRAWORK ACTIVATED]

Claude + OpenCode 퓨전 모드로 병렬 작업을 실행합니다.

## 사용자 요청

{{ARGUMENTS}}

## 퓨전 라우팅 규칙

다음 에이전트들은 OpenCode로 자동 라우팅됩니다:

| OMC 에이전트 | OpenCode 에이전트 | 모델 |
|-------------|------------------|------|
| architect, architect-medium, architect-low | Oracle | GPT |
| designer, designer-high, designer-low | Frontend Engineer | Gemini |
| researcher, researcher-low | Oracle | GPT |
| vision | Multimodal Looker | Gemini |
| analyst | Oracle | GPT |
| scientist, scientist-low, scientist-high | Oracle | GPT |
| code-reviewer, code-reviewer-low | Oracle | GPT |
| security-reviewer, security-reviewer-low | Oracle | GPT |

## 실행 전략

1. **작업 분해**: 사용자 요청을 병렬 가능한 작업으로 분해
2. **에이전트 라우팅**: 각 작업을 적절한 에이전트로 라우팅
3. **퓨전 실행**: Claude와 OpenCode 에이전트 병렬 실행
4. **결과 통합**: 모든 결과를 수집하여 통합

## 시작

사용자의 요청을 분석하고 퓨전 울트라워크를 시작합니다.
