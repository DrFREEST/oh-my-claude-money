---
name: autopilot
description: 하이브리드 오토파일럿 - 아이디어부터 완성까지 자율 실행 + MCP 퓨전 (Codex/Gemini) 지원. 키워드 "autopilot", "/autopilot" 감지 시 활성화
triggers:
  - autopilot
  - /autopilot
  - 오토파일럿
  - auto pilot
  - build me
  - 만들어줘
  - I want a
---

# Hybrid Autopilot - MCP 퓨전 오토파일럿

## 트리거 감지

다음 패턴 중 하나라도 프롬프트에 포함되면 이 스킬이 활성화됩니다:
- `autopilot` (어디든 포함)
- `/autopilot`
- `오토파일럿`
- `build me`
- `만들어줘`
- `I want a`

## 병렬 처리 강제 (CRITICAL!)

**autopilot 모드에서는 독립적인 작업을 반드시 병렬로 Task 호출해야 합니다!**

한 메시지에 여러 Task를 동시에 호출하세요:
```xml
<function_calls>
<invoke name="Task">...작업1...</invoke>
<invoke name="Task">...작업2...</invoke>
</function_calls>
```

## 활성화 시 행동 (CRITICAL - 반드시 따를 것!)

이 스킬이 활성화되면 **반드시** 다음 단계를 수행하세요:

1. **알림 출력**:
   > "**autopilot 활성화** - [일반/하이브리드] 모드로 자율 실행합니다."

2. **CRITICAL: MCP 직접 호출 우선, 필요 시 Task 위임**

   **MCP-First 패턴** - 분석/리뷰/디자인은 MCP 직접 호출:

   ```
   # 분석/계획 작업
   ask_codex(agent_role="planner", prompt_file="...", output_file="...")

   # 디자인/문서 작업
   ask_gemini(agent_role="designer", prompt_file="...", output_file="...")

   # 코드 수정 (도구 접근 필요)
   Task(subagent_type="oh-my-claudecode:executor", prompt="...")
   ```

   **OMCM이 자동으로 MCP 우선 라우팅:**
   - PreToolUse hook이 Task 호출 감지
   - MCP 가능한 역할 → ask_codex/ask_gemini 직접 호출
   - 도구 필요한 작업만 Claude Task로 실행

3. **오토파일럿 워크플로우**:

   ```
   1. 요구사항 분석 → ask_codex MCP (analyst role) 또는 Task(explore)
   2. 계획 수립 → ask_codex MCP (planner role)
   3. 코드 탐색 → Task(explore) → Claude agent
   4. 구현 → Task(executor) → Claude agent (도구 접근)
   5. 검증 → ask_codex MCP (architect role)
   6. 완료 보고
   ```

### MCP-First 패턴 (v3.0)

**자동 라우팅 우선순위** (OMCM hook이 자동 처리):

1. **MCP 직접 호출** (최우선) - 분석/리뷰/디자인 작업
   - ask_codex: architect, planner, code-reviewer, verifier
   - ask_gemini: designer, writer, ux-researcher
2. **Claude Task** (도구 필요 시) - 실행/탐색 작업
   - executor, explore, build-fixer, qa-tester, git-master

이 패턴으로 **토큰 절약 + 속도 향상** 동시 달성.

4. **퓨전 모드 에이전트 라우팅** (OMCM MCP-First v3.0):

   | 단계 | 라우팅 | 모델 |
   |------|--------|------|
   | 요구사항 분석 | ask_codex MCP (analyst) | GPT 5.3 |
   | 코드 탐색 | Claude Task (explore) | Sonnet |
   | UI 구현 | ask_gemini MCP (designer) | Gemini Pro |
   | 리서치 | ask_codex MCP (analyst) | GPT 5.3 |
   | 실행/구현 | Claude Task (executor) | Opus |
   | 계획 수립 | ask_codex MCP (planner) | GPT 5.3 |
   | 최종 검증 | ask_codex MCP (architect) | GPT 5.3 |

5. **완료 보고**:
   > "**autopilot 완료** - [작업 요약] / 토큰 절약: [X]%"

## 활성화 조건

### 자동 하이브리드 전환
- fusionDefault: true 설정 시
- 5시간/주간 사용량 70% 이상

### 명시적 하이브리드 요청
- "autopilot hulw"
- "hybrid autopilot"
- "퓨전 오토파일럿"

## 중단 방법

- "stop", "cancel", "중단" 키워드
- `/omcm:cancel-autopilot`

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

## 컨텍스트 제한 복구

autopilot 모드에서 워커가 컨텍스트 리밋에 도달하면 자동 복구가 동작합니다:

### 감지 패턴

다음 에러 메시지가 감지되면 복구 시작:
- `context limit reached`, `context window exceeded`
- `maximum context length`, `token limit exceeded`
- `conversation is too long`, `context_length_exceeded`

### 복구 흐름

```
실패 감지 → 부분 결과 저장 (.omc/state/context-recovery/)
  → Phase 1: 프롬프트 축소 + 재시도 (최대 2회, 60% → 45% 압축)
  → Phase 2: 작업 분할 + 서브태스크 개별 실행
  → 최종: 부분 결과만이라도 반환 (데이터 손실 없음)
```

### 결과 확인

- 복구 성공 시: 결과에 `recoveryMethod` 필드 포함
- 부분 결과: `.omc/state/context-recovery/{taskId}.json`에 저장
- 통계: `getStats()` 반환값에 `recoveryStats` 포함

**핵심**: MCP 직접 호출로 Task 스폰 없이 즉시 실행되어 토큰 절약 극대화!
