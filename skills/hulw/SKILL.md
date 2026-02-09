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

3. **자동 라우팅 매핑** (OMCM이 처리 - OMC 4.1.4 → OMO 3.4.0):

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

**핵심**: Task를 호출하기만 하면 OMCM이 자동으로 OpenCode로 라우팅합니다.
Claude 토큰을 최대한 절약하면서 OpenCode+OMO의 성능을 활용합니다!

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
- 90% 이상 → OpenCode 중심 모드로 강제 전환

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
  → Phase 2: OpenCode 폴백 (Claude에서 실패 시)
  → Phase 3: 작업 분할 + 서브태스크 개별 실행
  → 최종: 부분 결과만이라도 반환 (데이터 손실 없음)
```

### 결과 확인

- 복구 성공 시: `recovered: true`, `recoveryMethod` 필드 포함
- 부분 결과: `.omc/state/context-recovery/{taskId}.json`에 저장
- 통계: `getRecoveryStats()` → `{ detected, recovered, failed }`

## 주의사항

- OpenCode 프로바이더 인증이 필요합니다 (OPENAI_API_KEY, GOOGLE_API_KEY)
- 인증되지 않은 프로바이더는 Claude로 폴백됩니다
