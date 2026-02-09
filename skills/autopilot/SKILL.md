---
name: autopilot
description: 하이브리드 오토파일럿 - 아이디어부터 완성까지 자율 실행 + OpenCode 퓨전 지원. 키워드 "autopilot", "/autopilot" 감지 시 활성화
triggers:
  - autopilot
  - /autopilot
  - 오토파일럿
  - auto pilot
  - build me
  - 만들어줘
  - I want a
---

# Hybrid Autopilot - 퓨전 오토파일럿

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

2. **CRITICAL: Task 도구로 에이전트 위임**

   **절대 직접 작업하지 마세요!** 반드시 Task 도구를 사용하여 에이전트에게 위임하세요.

   ```
   Task(
     subagent_type="oh-my-claudecode:planner",  // 또는 적절한 에이전트
     prompt="사용자 요청 내용"
   )
   ```

   **OMCM이 자동으로 처리합니다:**
   - fusionDefault: true 설정 시 → OpenCode로 라우팅
   - OMC 에이전트 → OMO 에이전트 자동 매핑
   - OpenCode ULW 모드로 실행

3. **오토파일럿 워크플로우**:

   ```
   1. 요구사항 분석 → Task(architect 또는 analyst)
   2. 계획 수립 → Task(planner)
   3. 코드 탐색 → Task(explore) → OMCM이 OpenCode로 라우팅
   4. 구현 → Task(executor) → OMCM이 라우팅 결정
   5. 검증 → Task(architect)
   6. 완료 보고
   ```

4. **퓨전 모드 에이전트 라우팅** (OMCM 자동 처리 - OMC 4.1.7 → OMO 3.4.0):

   | 단계 | OMC 에이전트 | → | OMO 에이전트 | 모델 |
   |------|-------------|---|-------------|------|
   | 요구사항 분석 | analyst | → | oracle | GPT 5.3 |
   | 코드 탐색 | explore | → | explore | Gemini Flash |
   | UI 구현 | designer | → | metis | Gemini Pro |
   | 리서치 | dependency-expert | → | oracle | GPT 5.3 |
   | 실행/구현 | executor | → | build | GPT 5.3 Codex |
   | 계획 수립 | planner | → | Claude (유지) | - |
   | 최종 검증 | architect | → | oracle | GPT 5.3 |

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

**핵심**: Task를 호출하기만 하면 OMCM이 자동으로 OpenCode로 라우팅합니다!
