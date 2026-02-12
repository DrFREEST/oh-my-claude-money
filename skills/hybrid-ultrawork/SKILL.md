---
name: hybrid-ultrawork
description: Claude Code + MCP 퓨전 (Codex/Gemini) 하이브리드 울트라워크 모드 활성화
aliases:
  - hulw
  - hybrid
triggers:
  - "hybrid ultrawork"
  - "hybrid ulw"
  - "claude mcp 같이"
  - "토큰 최적화"
---

# 하이브리드 울트라워크 모드

> **참고**: 이 스킬은 `hulw` 스킬과 동일합니다. `/omcm:hulw`를 권장합니다.

Claude Code와 MCP 퓨전 (Codex/Gemini)을 함께 활용하여 **토큰 사용량을 최적화**하면서 병렬 처리를 수행합니다.

## 활성화 시 행동 (CRITICAL - 반드시 따를 것!)

이 스킬이 활성화되면 **반드시** 다음 단계를 수행하세요:

1. **알림 출력**:
   > "**hulw 모드 활성화** - Claude + MCP 퓨전 (Codex/Gemini)으로 토큰을 절약하면서 작업합니다."

2. **CRITICAL: MCP 직접 호출 우선, 필요 시 Task 위임**

   **MCP-First 패턴** - 분석/리뷰/디자인은 MCP 직접 호출:

   ```
   # 분석/계획 작업
   ask_codex(agent_role="architect", prompt_file="...", output_file="...")

   # 디자인/문서 작업
   ask_gemini(agent_role="designer", prompt_file="...", output_file="...")

   # 코드 수정 (도구 접근 필요)
   Task(subagent_type="oh-my-claudecode:executor", prompt="...")
   ```

   **OMCM이 자동으로 MCP 우선 라우팅:**
   - PreToolUse hook이 Task 호출 감지
   - MCP 가능한 역할 → ask_codex/ask_gemini 직접 호출
   - 도구 필요한 작업만 Claude Task로 실행

3. **자동 라우팅 매핑** (OMCM MCP-First v3.0):

   | 작업 유형 | 라우팅 | 모델 |
   |----------|--------|------|
   | 분석/계획/리뷰 | ask_codex MCP | GPT 5.3 |
   | 디자인/문서 | ask_gemini MCP | Gemini Pro/Flash |
   | 코드 수정/탐색 | Claude Task | Opus/Sonnet |

4. **결과 통합**: MCP 결과를 받아 최종 응답 제공

## 사용량 기반 동적 라우팅

OMCM이 자동으로 처리:
- **90%+**: 대부분 MCP로 라우팅
- **70-90%**: 하이브리드 라우팅
- **50-70%**: 일부 MCP 라우팅
- **50% 미만**: 최소 MCP 라우팅

## 설정

`~/.claude/plugins/omcm/config.json`:

```json
{
  "fusionDefault": true,  // 항상 퓨전 모드
  "threshold": 90,
  "autoHandoff": false
}
```

**핵심**: MCP 직접 호출로 Task 스폰 없이 즉시 실행되어 토큰 절약 극대화!
