---
name: hulw
description: 하이브리드 울트라워크 - Claude + MCP 퓨전 모드 (Codex/Gemini). 키워드 "hulw", "/hulw" 감지 시 자동 활성화
triggers:
  - hulw
  - /hulw
  - hybrid ultrawork
  - 하이브리드 울트라워크
---

# Hybrid Ultrawork (hulw) - MCP 퓨전 모드

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
   - 분석/탐색 작업 → Codex MCP (architect/analyst role)
   - UI/프론트엔드 → Gemini MCP (designer role)
   - 복잡한 구현 → Claude (Opus)
3. **병렬 실행**: 가능한 작업은 동시 실행
4. **결과 통합**: 모든 결과를 통합하여 응답

### MCP-First 패턴 (v3.0)

**생각은 O/G, 실행만 Claude** - OMCM hook이 자동으로 MCP 우선 라우팅 수행:

- **분석/계획 단계**: ask_codex MCP 사용 (architect, planner role)
- **리뷰/검증 단계**: ask_codex MCP 사용 (code-reviewer, verifier role)
- **디자인/문서 단계**: ask_gemini MCP 사용 (designer, writer role)
- **코드 수정 단계**: Task(executor) Claude agent 사용 (도구 접근 필요)

MCP 직접 호출 시 Task 스폰 없이 즉시 실행되어 토큰 절약 극대화.

## 에이전트 라우팅 맵

| 작업 유형 | 라우팅 | 모델 | 절약 |
|----------|--------|------|------|
| 아키텍처 분석 | ask_codex MCP (architect) | GPT | ✅ |
| 코드 탐색 | Task(explore) | Claude | - |
| UI 작업 | ask_gemini MCP (designer) | Gemini | ✅ |
| 리서치 | ask_codex MCP (analyst) | GPT | ✅ |
| 복잡한 구현 | Claude executor | Opus | - |
| 전략적 계획 | Claude planner | Opus | - |

## 병렬 처리 강제 (CRITICAL!)

**hulw 모드에서는 독립적인 작업을 반드시 병렬로 Task 호출해야 합니다!**

```
❌ 잘못된 예 (순차 호출):
Task(explore, "분석1")  // 완료 대기
Task(explore, "분석2")  // 완료 대기

✅ 올바른 예 (병렬 호출 - 한 메시지에 여러 Task):
<function_calls>
<invoke name="Task">...분석1...</invoke>
<invoke name="Task">...분석2...</invoke>

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

**핵심**: MCP 직접 호출로 Task 스폰 없이 즉시 실행되어 토큰 절약 극대화!

## 컨텍스트 가드 규칙 (CRITICAL)

서브에이전트의 컨텍스트 한도 초과를 방지하기 위해 다음 규칙을 반드시 준수하세요:

### 파티션 크기 상한
- **에이전트당 최대 6개 파일** (절대 초과 금지)
- 6개 초과 시 반드시 추가 에이전트로 분할
- 예: 18개 파일 → 3개 에이전트 (6개씩)

### max_turns 설정 (필수)
Task 호출 시 반드시 `max_turns` 파라미터를 설정하세요:

| 파일 수 | max_turns |
|---------|-----------|
| 1-3개 | 15 |
| 4-6개 | 25 |
| 7개+ | 분할 필수 |

```
Task(
  subagent_type="oh-my-claudecode:executor",
  max_turns=25,
  prompt="..."
)
```

### 프롬프트 최적화
- 변경할 파일 목록과 구체적 변경 내용만 전달
- 전체 파일 내용을 프롬프트에 포함하지 않기 (에이전트가 직접 Read)
- 불필요한 배경 설명 최소화
- 각 에이전트에는 해당 파티션의 작업만 설명

## 사용량 기반 자동 전환

- 5시간/주간 사용량 70% 이상 → 자동으로 hulw 모드 권장
- 90% 이상 → MCP 중심 모드로 강제 전환

## 컨텍스트 제한 복구

hulw 모드에서 워커가 컨텍스트 리밋에 도달하면 자동 복구가 동작합니다:

### 감지 패턴

다음 에러 메시지가 감지되면 복구 시작:
- `context limit reached`, `context window exceeded`
- `maximum context length`, `token limit exceeded`
- `conversation is too long`, `context_length_exceeded`

### 복구 흐름

```
실패 감지 → 부분 결과 저장 (.omc/state/context-recovery/)
  → Phase 1: 프롬프트 축소 + 같은 에이전트로 재시도 (최대 2회)
  → Phase 2: MCP 폴백 (Claude에서 실패 시 Codex/Gemini MCP로)
  → Phase 3: 작업 분할 + 서브태스크 개별 실행
  → 최종: 부분 결과만이라도 반환 (데이터 손실 없음)
```

### 결과 확인

- 복구 성공 시: `recovered: true`, `recoveryMethod` 필드 포함
- 부분 결과: `.omc/state/context-recovery/{taskId}.json`에 저장
- 통계: `getRecoveryStats()` → `{ detected, recovered, failed }`

## 주의사항

- MCP 사용을 위해 Codex CLI / Gemini CLI 설치 필요
- Codex/Gemini CLI 인증이 필요합니다 (OPENAI_API_KEY, GOOGLE_API_KEY)
- MCP 미설치/인증 실패 시 Claude로 폴백됩니다
