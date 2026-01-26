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

4. **퓨전 모드 에이전트 라우팅** (OMCM이 자동 처리):

   | 단계 | OMC 에이전트 | → | OMO 에이전트 |
   |------|-------------|---|-------------|
   | 요구사항 분석 | analyst | → | Oracle (GPT) |
   | 코드 탐색 | explore | → | Flash (Gemini) |
   | UI 구현 | designer | → | Flash (Gemini) |
   | 리서치 | researcher | → | Oracle (GPT) |
   | 계획 수립 | planner | → | Claude (유지) |
   | 최종 검증 | architect | → | Claude (유지) |

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

**핵심**: Task를 호출하기만 하면 OMCM이 자동으로 OpenCode로 라우팅합니다!
