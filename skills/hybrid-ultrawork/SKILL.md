---
name: hybrid-ultrawork
description: Claude Code + OpenCode 하이브리드 울트라워크 모드 활성화
aliases:
  - hulw
  - hybrid
triggers:
  - "hybrid ultrawork"
  - "hybrid ulw"
  - "claude opencode 같이"
  - "토큰 최적화"
---

# 하이브리드 울트라워크 모드

> **참고**: 이 스킬은 `hulw` 스킬과 동일합니다. `/omcm:hulw`를 권장합니다.

Claude Code와 OpenCode를 함께 활용하여 **토큰 사용량을 최적화**하면서 병렬 처리를 수행합니다.

## 활성화 시 행동 (CRITICAL - 반드시 따를 것!)

이 스킬이 활성화되면 **반드시** 다음 단계를 수행하세요:

1. **알림 출력**:
   > "**hulw 모드 활성화** - Claude + OpenCode 퓨전으로 토큰을 절약하면서 작업합니다."

2. **CRITICAL: Task 도구로 에이전트 위임**

   **절대 직접 작업하지 마세요!** 반드시 Task 도구를 사용하여 에이전트에게 위임하세요.

   ```
   Task(
     subagent_type="oh-my-claudecode:explore",  // OMC 에이전트 지정
     prompt="사용자 요청 내용"
   )
   ```

   **OMCM이 자동으로 OpenCode(OMO)로 라우팅합니다:**
   - PreToolUse hook이 Task 호출 감지
   - OMC 에이전트 → OMO 에이전트 자동 매핑
   - OpenCode ULW 모드로 실행

3. **자동 라우팅 매핑** (OMCM이 처리 - OMC 4.1.7 → OMO 3.4.0):

   | OMC 에이전트 | → | OMO 에이전트 | 모델 |
   |-------------|---|-------------|------|
   | explore | → | explore | Gemini Flash |
   | architect, debugger | → | oracle | GPT 5.3 |
   | dependency-expert | → | oracle | GPT 5.3 |
   | designer, vision | → | metis | Gemini Pro |
   | writer, style-reviewer, ux-researcher | → | momus | Gemini Flash |
   | executor, deep-executor | → | build | GPT 5.3 Codex |
   | scientist, verifier | → | oracle | GPT 5.3 |
   | analyst, critic, product-analyst | → | oracle | GPT 5.3 |
   | product-manager, information-architect | → | oracle | GPT 5.3 |
   | qa-tester, test-engineer | → | hephaestus | GPT 5.3 Codex |
   | code-reviewer, quality-reviewer | → | oracle | GPT 5.3 |

4. **결과 통합**: OpenCode 결과를 받아 최종 응답 제공

## 사용량 기반 동적 라우팅

OMCM이 자동으로 처리:
- **90%+**: 대부분 OpenCode로 라우팅
- **70-90%**: 하이브리드 라우팅
- **50-70%**: 일부 OpenCode 라우팅
- **50% 미만**: 최소 OpenCode 라우팅

## 설정

`~/.claude/plugins/omcm/config.json`:

```json
{
  "fusionDefault": true,  // 항상 퓨전 모드
  "threshold": 90,
  "autoHandoff": false
}
```

**핵심**: Task를 호출하기만 하면 OMCM이 자동으로 OpenCode로 라우팅합니다!
