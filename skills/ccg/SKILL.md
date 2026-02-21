---
name: ccg
description: OMC v4.2.15 호환 래퍼 - Claude-Codex-Gemini 트리-모델 오케스트레이션 (백엔드→Codex, 프론트엔드→Gemini 병렬 팬아웃)
---

# CCG 스킬 (OMC v4.2.15 호환 래퍼)

이 스킬은 OMC v4.2.15의 CCG(Claude-Codex-Gemini) 트리-모델 오케스트레이션 스킬의 OMCM 호환 래퍼입니다.

## 원본 스킬로 위임

OMC CCG 스킬을 직접 호출합니다:

<invoke_skill>oh-my-claudecode:ccg</invoke_skill>

## OMCM MCP-First 참고사항

OMCM 환경에서 CCG는 자동으로 MCP-First 아키텍처를 활용합니다:
- **Codex 작업** → `ask_codex` MCP 도구 (architect/executor 역할)
- **Gemini 작업** → `ask_gemini` MCP 도구 (designer/writer 역할)
- **합성** → Claude 직접 처리

## 트리거

`ccg` 또는 `claude-codex-gemini` 키워드로 활성화됩니다.
