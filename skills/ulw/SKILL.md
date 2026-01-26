---
name: ulw
description: 울트라워크 with 자동 퓨전 - 사용량 높을 때 자동으로 OpenCode 퓨전. 키워드 "ulw", "/ulw" 감지 시 활성화
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
| 70-90% | 하이브리드 | 일부 작업을 OpenCode로 오프로드 |
| > 90% | OpenCode 중심 | 대부분 OpenCode로 위임 |

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
   - 중간 → "**ulw → hulw 자동 전환** - 토큰 절약을 위해 퓨전 모드로 전환"
   - 높음 → "**ulw → OpenCode 중심** - 사용량이 높아 OpenCode 위주로 진행"

2. **CRITICAL: Task 도구로 에이전트 위임**

   **절대 직접 작업하지 마세요!** 반드시 Task 도구를 사용하여 에이전트에게 위임하세요.

   ```
   Task(
     subagent_type="oh-my-claudecode:explore",  // OMC 에이전트 지정
     prompt="사용자 요청 내용"
   )
   ```

   **OMCM이 자동으로 처리합니다:**
   - fusionDefault: true 설정 시 → 항상 OpenCode로 라우팅
   - 사용량 90%+ 시 → 자동으로 OpenCode로 라우팅
   - OMC 에이전트 → OMO 에이전트 자동 매핑

3. **자동 라우팅 매핑** (OMCM이 처리 - OMC 3.6.0 → OMO 3.1.0):

   | OMC 에이전트 | → | OMO 에이전트 | 모델 |
   |-------------|---|-------------|------|
   | explore, explore-* | → | explore | Gemini Flash |
   | architect, architect-* | → | Oracle | GPT 5.2 |
   | researcher | → | Oracle | GPT 5.2 |
   | researcher-low | → | librarian | GLM |
   | designer, designer-* | → | frontend-ui-ux-engineer | Gemini Pro |
   | writer | → | document-writer | Gemini Flash |
   | vision | → | multimodal-looker | Gemini Flash |
   | executor, executor-* | → | Codex | GPT 5.2 Codex |
   | orchestrator | → | Oracle | GPT 5.2 |
   | analyst, critic | → | Oracle | GPT 5.2 |

4. **결과 통합**: OpenCode 결과를 받아 최종 응답 제공

## ulw vs hulw 차이

| 항목 | ulw | hulw |
|------|-----|------|
| 기본 동작 | 사용량 기반 자동 결정 | 항상 OpenCode 퓨전 |
| 토큰 절약 | 조건부 | 항상 |
| 적합한 상황 | 일반 작업 | 토큰 절약이 항상 필요할 때 |

**핵심**: Task를 호출하기만 하면 OMCM이 사용량과 설정에 따라 자동으로 라우팅합니다!
