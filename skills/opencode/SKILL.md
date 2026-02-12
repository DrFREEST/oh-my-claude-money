---
name: opencode
description: "[Deprecated] MCP-First Architecture v3.0으로 대체됨"
deprecated: true
triggers:
  - "opencode"
  - "전환"
  - "handoff"
  - "오픈코드"
---

# OpenCode 전환 (Deprecated)

## Deprecated

이 스킬은 **MCP-First Architecture v3.0**으로 대체되었습니다.

### 대신 사용하세요

**직접 MCP 도구 사용** (권장):

```
# 분석/계획/리뷰 작업
ask_codex(
  agent_role="architect",  # or planner, code-reviewer, analyst
  prompt_file="...",
  output_file="..."
)

# 디자인/문서 작업
ask_gemini(
  agent_role="designer",  # or writer, ux-researcher
  prompt_file="...",
  output_file="..."
)
```

### 변경 사항

| 이전 (OpenCode) | 현재 (MCP-First) |
|----------------|-----------------|
| OpenCode 프로세스 전환 | ask_codex/ask_gemini MCP 직접 호출 |
| 컨텍스트 파일 저장 필요 | 프롬프트 파일로 직접 전달 |
| 프로세스 교체 (exec) | 같은 프로세스 내 MCP 호출 |

### 참고 문서

- `~/.claude/docs/omc-ref.md` - MCP-First 패턴 설명
- `/opt/oh-my-claude-money/docs/ko/FEATURES.md` - OMCM MCP 퓨전 가이드
