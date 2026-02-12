---
name: ulw
description: 울트라워크 with 자동 퓨전 - 사용량 높을 때 자동으로 MCP 퓨전 (Codex/Gemini). 키워드 "ulw", "/ulw" 감지 시 활성화
triggers:
  - ulw
  - /ulw
  - ultrawork
  - 울트라워크
---

# Ultrawork with Auto-Fusion (ulw)

## 트리거 감지

다음 패턴 중 하나라도 프롬프트에 포함되면 이 스킬이 활성화됩니다:
- `ulw` (어디든 포함)
- `/ulw`
- `ultrawork`
- `울트라워크`

## 동작 방식

ulw는 **사용량에 따라 자동으로 퓨전 모드를 결정**합니다:

| 사용량 | 모드 | 동작 |
|--------|------|------|
| < 70% | 일반 울트라워크 | Claude 에이전트로 병렬 실행 |
| 70-90% | 하이브리드 | 일부 작업을 Codex/Gemini MCP로 오프로드 |
| > 90% | MCP 중심 | 대부분 Codex/Gemini MCP로 위임 |

## 병렬 처리 강제 (CRITICAL!)

**ulw 모드에서는 독립적인 작업을 반드시 병렬로 Task 호출해야 합니다!**

한 메시지에 여러 Task를 동시에 호출하세요:
```xml
<function_calls>
<invoke name="Task">...작업1...</invoke>
<invoke name="Task">...작업2...</invoke>
</function_calls>
```

## 활성화 시 행동 (CRITICAL - 반드시 따를 것!)

이 스킬이 활성화되면 **반드시** 다음 단계를 수행하세요:

1. **알림 출력** (사용량에 따라):
   - 낮음 → "**ulw 모드** - Claude 에이전트로 병렬 실행"
   - 중간 → "**ulw → hulw 자동 전환** - 토큰 절약을 위해 MCP 퓨전 모드로 전환"
   - 높음 → "**ulw → MCP 중심** - 사용량이 높아 Codex/Gemini MCP 위주로 진행"

2. **CRITICAL: Task 도구로 에이전트 위임**

   **절대 직접 작업하지 마세요!** 반드시 Task 도구를 사용하여 에이전트에게 위임하세요.

   ```
   Task(
     subagent_type="oh-my-claudecode:explore",  // OMC 에이전트 지정
     prompt="사용자 요청 내용"
   )
   ```

   **OMCM이 자동으로 MCP 우선 라우팅:**
   - fusionDefault: true 설정 시 → 항상 MCP로 라우팅
   - 사용량 90%+ 시 → 자동으로 MCP로 라우팅
   - MCP 가능한 역할 → ask_codex/ask_gemini 직접 호출

3. **자동 라우팅 매핑** (OMCM MCP-First v3.0):

   | 작업 유형 | 라우팅 | 모델 |
   |----------|--------|------|
   | 분석/계획/리뷰 | ask_codex MCP | GPT 5.3 |
   | 디자인/문서 | ask_gemini MCP | Gemini Pro/Flash |
   | 코드 수정/탐색 | Claude Task | Opus/Sonnet |

4. **결과 통합**: MCP 결과를 받아 최종 응답 제공

## ulw vs hulw 차이

| 항목 | ulw | hulw |
|------|-----|------|
| 기본 동작 | 사용량 기반 자동 결정 | 항상 MCP 퓨전 |
| 토큰 절약 | 조건부 | 항상 |
| 적합한 상황 | 일반 작업 | 토큰 절약이 항상 필요할 때 |

**핵심**: OMCM이 사용량과 설정에 따라 자동으로 MCP 우선 라우팅합니다!

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

ulw 모드에서 병렬 워커가 컨텍스트 리밋에 도달하면 자동 복구가 동작합니다:

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
