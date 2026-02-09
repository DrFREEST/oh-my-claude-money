# HUD: Split Warning + Tool Stats 추가

## TL;DR

> **Quick Summary**: `omcm-hud.mjs`에 두 개의 새 HUD 섹션을 추가한다: (1) 컨텍스트 윈도우 분할 임박 경고 (`renderSplitWarning`), (2) 세션 도구 사용 통계 (`renderToolStats`). 데이터 소스로 새 모듈 `src/tracking/tool-tracker-logger.mjs`를 생성한다.
>
> **Deliverables**:
> - 새 파일: `src/tracking/tool-tracker-logger.mjs` (getToolUsageStats 함수 export)
> - 수정 파일: `src/hud/omcm-hud.mjs` (import 추가, 두 render 함수 추가, buildIndependentHud + main 양쪽에 삽입)
>
> **Estimated Effort**: Short (~1-2시간)
> **Parallel Execution**: NO — sequential (파일 간 의존성)
> **Critical Path**: TODO 1 → TODO 2 → TODO 3 → TODO 4

---

## Context

### Original Request
`omcm-hud.mjs`에 split warning과 tool stats를 추가하라. `getToolUsageStats`는 `../tracking/tool-tracker-logger.mjs`에서 import. try/catch 가드 필수. optional chaining 사용 금지. 주석은 한국어.

### Research Findings

**CRITICAL FINDING: `src/tracking/tool-tracker-logger.mjs` 파일이 존재하지 않음.**
- `src/tracking/` 디렉토리에는 `call-logger.mjs`, `realtime-tracker.mjs`, `metrics-collector.mjs`, `index.mjs` 4개 파일만 존재
- `getToolUsageStats`, `renderSplitWarning`, `renderToolStats` 함수는 코드베이스 어디에도 없음
- **결론: 새로 생성해야 함**

**기존 패턴 분석 (omcm-hud.mjs, 882줄):**
- 모든 render 함수는 `string | null` 반환 패턴
- `buildIndependentHud()` (line 690): 6개 섹션을 `parts[]`에 push → `'[OMCM] ' + parts.join(' | ')` 출력
- `main()` OMC wrapping (line 789): `extraParts[]`에 push → OMC 출력에 regex inject
- optional chaining 미사용 (기존 코드가 `&&`, `||`, ternary 사용)
- ANSI 색상: RED, YELLOW, GREEN, CYAN, DIM, RESET 상수 (line 41-46)
- import는 `from 'fs'`, `from 'path'` 등 Node.js 내장 + 상대 경로 사용

**데이터 소스 분석:**
- `parseClaudeTokensFromStdin()` (line 316)이 stdin JSON 파싱 → `context_window.used_percentage` 필드 존재
- `call-logger.mjs`의 `getSessionCalls()` 가 세션별 호출 목록 반환 (`.agent` 필드 포함)
- `aggregateOpenCodeTokens()` (line 390)이 이미 세션별 호출 수 집계

### Assumptions Applied (사용자 확인 필요 시 수정 가능)

| 항목 | 적용된 기본값 | 근거 |
|------|-------------|------|
| **renderSplitWarning 트리거** | stdin의 `context_window.used_percentage >= 80` | Claude Code가 stdin으로 해당 필드 제공 (line 307-312) |
| **renderSplitWarning 출력 형식** | `⚠CTX:85%` (80% 이상 YELLOW, 90% 이상 RED) | 기존 usage color 패턴 (line 256-260) 따름 |
| **renderToolStats 데이터** | 세션의 총 도구/에이전트 호출 수 | `call-logger.mjs`의 `getSessionCalls()` 활용 |
| **renderToolStats 출력 형식** | `🔧15` (총 호출 수) | 간결한 HUD 스타일 유지 |
| **HUD 위치 (splitWarning)** | buildIndependentHud 섹션 1.5 (Claude usage 직후, mode 직전) | 경고는 눈에 띄어야 하지만 usage 이후 |
| **HUD 위치 (toolStats)** | buildIndependentHud 섹션 5.5 (provider counts 직후, fallback 직전) | 통계 정보는 후반부 |

---

## Work Objectives

### Core Objective
HUD에 컨텍스트 분할 경고와 도구 사용 통계 두 가지 렌더 함수를 추가하여, 사용자가 컨텍스트 윈도우 소진 상태와 세션 도구 활용도를 실시간으로 확인할 수 있게 한다.

### Concrete Deliverables
1. `src/tracking/tool-tracker-logger.mjs` — `getToolUsageStats(sessionId)` export
2. `src/hud/omcm-hud.mjs` — `renderSplitWarning(stdinData)`, `renderToolStats(sessionId)` 함수 추가 및 두 출력 경로(independent + OMC wrapping)에 삽입

### Definition of Done
- [ ] `node src/hud/omcm-hud.mjs` 실행 시 에러 없음 (exit code 0)
- [ ] HUD 출력에 컨텍스트 80%+ 시 `⚠CTX:` 경고 포함
- [ ] HUD 출력에 `🔧` 도구 통계 포함 (호출이 있을 때)
- [ ] `lsp_diagnostics` 에러 없음

### Must Have
- `getToolUsageStats` 는 `src/tracking/tool-tracker-logger.mjs`에서 import
- 모든 새 함수는 try/catch 가드
- 주석은 한국어
- optional chaining (`?.`) 사용 금지
- `buildIndependentHud()` 와 `main()` OMC wrapping 양쪽 모두에 삽입

### Must NOT Have (Guardrails)
- optional chaining (`?.`, `??`) 사용 금지 — 기존 코드에서도 `renderFusionMetrics`의 `??` 1곳 외 미사용. 새 코드에서는 `||`와 `&&`만 사용
- 기존 HUD 섹션 순서 변경 금지
- 기존 render 함수 시그니처 변경 금지
- 새 npm 의존성 추가 금지
- `renderSplitWarning`/`renderToolStats`가 데이터 없을 때 null이 아닌 빈 문자열 반환 금지 (반드시 `null` 반환)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (프로젝트에 361개 테스트 존재)
- **User wants tests**: 명시되지 않음 → Manual verification + lsp_diagnostics
- **Framework**: bun test (기존 인프라)

### Automated Verification (Agent-Executable)

```bash
# 1. 구문 에러 체크
node --check src/tracking/tool-tracker-logger.mjs
# Assert: exit code 0, no output

# 2. 구문 에러 체크
node --check src/hud/omcm-hud.mjs
# Assert: exit code 0, no output

# 3. HUD 실행 (stdin 없이)
echo '{}' | node src/hud/omcm-hud.mjs
# Assert: exit code 0, 출력에 '[OMCM]' 포함

# 4. HUD 실행 (context_window 데이터 포함)
echo '{"context_window":{"used_percentage":85}}' | __OMCM_STDIN_DATA='{"context_window":{"used_percentage":85}}' node src/hud/omcm-hud.mjs
# Assert: exit code 0

# 5. lsp_diagnostics (수정된 파일)
# lsp_diagnostics("src/hud/omcm-hud.mjs") → 에러 0개
# lsp_diagnostics("src/tracking/tool-tracker-logger.mjs") → 에러 0개
```

---

## Execution Strategy

### Sequential Execution (의존성 체인)

```
TODO 1: tool-tracker-logger.mjs 생성 (의존성 없음)
    ↓
TODO 2: omcm-hud.mjs에 import + renderSplitWarning 추가
    ↓
TODO 3: omcm-hud.mjs에 renderToolStats + buildIndependentHud 삽입
    ↓
TODO 4: omcm-hud.mjs main() OMC wrapping에 양쪽 삽입 + 검증
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | None | 2, 3 |
| 2 | 1 | 4 |
| 3 | 1, 2 | 4 |
| 4 | 2, 3 | None (final) |

---

## TODOs

- [ ] 1. `src/tracking/tool-tracker-logger.mjs` 생성

  **What to do**:
  - 새 파일 `src/tracking/tool-tracker-logger.mjs` 생성
  - `getToolUsageStats(sessionId)` 함수를 named export
  - 기존 `call-logger.mjs`의 `getSessionCalls(sessionId)` 를 import하여 데이터 획득
  - 반환 형식:
    ```javascript
    {
      totalCalls: number,       // 총 도구/에이전트 호출 수
      byAgent: { [agent]: count }, // 에이전트별 호출 수
      byProvider: { [provider]: count } // 프로바이더별 호출 수
    }
    ```
  - sessionId가 없거나 데이터 없으면 `{ totalCalls: 0, byAgent: {}, byProvider: {} }` 반환
  - 전체를 try/catch로 감싸서 에러 시 빈 결과 반환
  - 주석은 한국어로 작성
  - optional chaining 사용 금지

  **Must NOT do**:
  - optional chaining (`?.`) 사용
  - 영문 주석 작성
  - 새 npm 패키지 import

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 생성, 기존 패턴을 따르는 간단한 유틸 모듈
  - **Skills**: [`git-master`]
    - `git-master`: 커밋 시 사용

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (first)
  - **Blocks**: TODO 2, 3
  - **Blocked By**: None

  **References**:

  **Pattern References** (기존 코드 패턴):
  - `src/tracking/call-logger.mjs:33-60` — `logOpenCodeCall` 함수의 데이터 구조. `getToolUsageStats`가 소비할 데이터 스키마 (provider, model, agent, inputTokens, outputTokens 등 필드)
  - `src/tracking/call-logger.mjs:60+` — `getSessionCalls(sessionId)` 함수 시그니처와 반환 형식 (`{ total, calls: [...] }`)을 import하여 사용

  **Acceptance Criteria**:

  ```bash
  # 파일 존재 확인
  test -f src/tracking/tool-tracker-logger.mjs && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS

  # 구문 에러 체크
  node --check src/tracking/tool-tracker-logger.mjs
  # Assert: exit code 0

  # export 확인
  node -e "import('./src/tracking/tool-tracker-logger.mjs').then(m => console.log(typeof m.getToolUsageStats))"
  # Assert: "function"

  # optional chaining 미사용 확인
  grep -c '?\.' src/tracking/tool-tracker-logger.mjs
  # Assert: 0 (또는 grep exit code 1)

  # 한국어 주석 존재 확인
  grep -c '// ' src/tracking/tool-tracker-logger.mjs
  # Assert: > 0 (주석이 존재)
  ```

  **Commit**: YES
  - Message: `feat(tracking): tool-tracker-logger 모듈 추가 - getToolUsageStats 함수`
  - Files: `src/tracking/tool-tracker-logger.mjs`

---

- [ ] 2. `omcm-hud.mjs`에 import 추가 + `renderSplitWarning` 함수 정의

  **What to do**:

  **Step 2a: import 추가** (line 38 직후, line 39 이전)

  현재 마지막 import (line 38):
  ```javascript
  import { getSessionCalls } from '../tracking/call-logger.mjs';
  ```

  이 줄 **직후**에 추가:
  ```javascript
  import { getToolUsageStats } from '../tracking/tool-tracker-logger.mjs';
  ```

  **삽입 위치**: line 38 (`import { getSessionCalls }...`) 다음, line 40 (`const RED = ...`) 이전.

  **Step 2b: `renderSplitWarning` 함수 정의** (line 296 직후 — `renderClaudeUsage` 함수 끝과 `parseClaudeTokensFromStdin` 함수 시작 사이)

  현재 line 296:
  ```javascript
  }  // end of renderClaudeUsage
  ```

  현재 line 298-299:
  ```javascript
  /**
   * Parse Claude token usage and request count from stdin JSON
  ```

  **삽입 위치**: line 296 (`}` of renderClaudeUsage) 이후, line 298 (`/** Parse Claude token...`) 이전에 새 함수 삽입.

  함수 내용:
  ```javascript
  /**
   * 컨텍스트 윈도우 분할 경고 렌더링
   * context_window.used_percentage >= 80이면 경고 표시
   * @param {string} stdinData - stdin JSON 문자열
   * @returns {string|null} - 경고 문자열 또는 null
   */
  function renderSplitWarning(stdinData) {
    try {
      if (!stdinData) return null;

      var data = JSON.parse(stdinData);
      var ctx = data && data.context_window;
      if (!ctx) return null;

      var usedPct = ctx.used_percentage;
      if (usedPct == null || usedPct < 80) return null;

      var color = usedPct >= 90 ? RED : YELLOW;
      return color + '\u26a0CTX:' + usedPct + '%' + RESET;
    } catch (e) {
      // 파싱 실패 시 무시
      return null;
    }
  }
  ```

  **핵심 규칙**:
  - `data?.context_window` ❌ → `data && data.context_window` ✅
  - `ctx?.used_percentage` ❌ → 먼저 `if (!ctx) return null` 후 `ctx.used_percentage` ✅
  - `usedPct == null` (loose equality)로 null/undefined 체크 (기존 코드 line 275 패턴)

  **Must NOT do**:
  - optional chaining 사용
  - 기존 함수 수정
  - renderClaudeUsage 또는 parseClaudeTokensFromStdin 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 내 2곳 삽입, 명확한 위치 지정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (second)
  - **Blocks**: TODO 3, 4
  - **Blocked By**: TODO 1

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs:267-296` — `renderClaudeUsage()` 함수. `renderSplitWarning`이 바로 뒤에 위치할 함수. 반환 패턴 (`string | null`) 동일하게 따름
  - `src/hud/omcm-hud.mjs:256-260` — `getUsageColor()` 함수. RED/YELLOW/GREEN 색상 분기 패턴 참고
  - `src/hud/omcm-hud.mjs:316-378` — `parseClaudeTokensFromStdin()` 함수. stdin JSON 파싱 패턴 참고. `var data = JSON.parse(stdinData)` + 필드 접근 방식 동일하게 따름
  - `src/hud/omcm-hud.mjs:275` — `usage.fiveHourPercent != null` 패턴. loose equality null 체크 패턴

  **API/Type References**:
  - `src/hud/omcm-hud.mjs:298-314` — stdin JSON 구조 JSDoc. `context_window.used_percentage` 필드 문서화 (line 310: `used_percentage, remaining_percentage`)

  **Acceptance Criteria**:

  ```bash
  # import 존재 확인
  grep -n "import.*getToolUsageStats.*from.*tool-tracker-logger" src/hud/omcm-hud.mjs
  # Assert: 1줄 매칭, line ~39

  # renderSplitWarning 함수 존재 확인
  grep -n "function renderSplitWarning" src/hud/omcm-hud.mjs
  # Assert: 1줄 매칭

  # optional chaining 미사용 확인 (새로 추가된 코드에서)
  grep -n '?\.' src/hud/omcm-hud.mjs
  # Assert: 0줄 (기존 코드에도 없으므로 0이어야 함)
  # 주의: renderFusionMetrics의 ?? 는 fusion-renderer.mjs에 있으므로 이 파일에는 없음

  # 구문 에러 체크
  node --check src/hud/omcm-hud.mjs
  # Assert: exit code 0
  ```

  **Commit**: NO (TODO 4에서 일괄 커밋)

---

- [ ] 3. `omcm-hud.mjs`에 `renderToolStats` 함수 정의 + `buildIndependentHud` 삽입

  **What to do**:

  **Step 3a: `renderToolStats` 함수 정의** (`renderSplitWarning` 직후에 삽입)

  `renderSplitWarning` 함수 닫는 `}` 직후, `parseClaudeTokensFromStdin` JSDoc 직전에 삽입:

  ```javascript
  /**
   * 세션 도구 사용 통계 렌더링
   * 세션 내 총 도구/에이전트 호출 수 표시
   * @param {string|null} sessionId - 세션 ID
   * @returns {string|null} - 통계 문자열 또는 null
   */
  function renderToolStats(sessionId) {
    try {
      if (!sessionId) return null;

      var stats = getToolUsageStats(sessionId);
      if (!stats || stats.totalCalls === 0) return null;

      return DIM + '\ud83d\udd27' + stats.totalCalls + RESET;
    } catch (e) {
      // 통계 조회 실패 시 무시
      return null;
    }
  }
  ```

  **Step 3b: `buildIndependentHud()` 에 삽입 (2곳)**

  **삽입 위치 ①: renderSplitWarning — 섹션 1.5 (Claude usage 직후)**

  현재 코드 (line 694-697):
  ```javascript
    // 1. Claude usage (5h/wk) - direct API call
    const usageOutput = await renderClaudeUsage();
    if (usageOutput) {
      parts.push(usageOutput);
    }
  ```

  이 블록 **직후**, 현재 line 699 (`// 2. Mode status`) **직전**에 삽입:
  ```javascript
    // 1.5 컨텍스트 윈도우 분할 경고
    var splitWarning = renderSplitWarning(stdinData);
    if (splitWarning) {
      parts.push(splitWarning);
    }
  ```

  **삽입 위치 ②: renderToolStats — 섹션 5.5 (provider counts 직후)**

  현재 코드 (line 749-752):
  ```javascript
    const countsOutput = renderProviderCounts(sessionCounts);
    if (countsOutput) {
      parts.push(countsOutput);
    }
  ```

  이 블록 **직후**, 현재 line 754 (`// 6. Fallback status`) **직전**에 삽입:
  ```javascript
    // 5.5 도구 사용 통계
    var toolStatsOutput = renderToolStats(currentSessionId);
    if (toolStatsOutput) {
      parts.push(toolStatsOutput);
    }
  ```

  **주의**: `currentSessionId` 변수는 line 714-717에서 이미 선언되어 있으므로 그대로 사용 가능.

  **Must NOT do**:
  - 기존 섹션 순서 (1→2→3→4→5→6) 변경
  - `parts.push()` 호출 순서를 기존 것과 섞어 배치
  - optional chaining 사용

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 내 3곳 삽입, 정확한 위치 매핑 완료
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (third)
  - **Blocks**: TODO 4
  - **Blocked By**: TODO 1, 2

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs:690-783` — `buildIndependentHud()` 전체 함수. 6개 섹션 구조와 `parts.push()` 패턴. 새 섹션은 이 패턴을 정확히 따름
  - `src/hud/omcm-hud.mjs:694-697` — 섹션 1 (Claude usage). `renderSplitWarning` 삽입 직전 위치
  - `src/hud/omcm-hud.mjs:749-752` — 섹션 5 (Provider counts). `renderToolStats` 삽입 직전 위치
  - `src/hud/omcm-hud.mjs:714-717` — `currentSessionId` 변수 선언. `renderToolStats`가 이 변수를 인자로 사용

  **Acceptance Criteria**:

  ```bash
  # renderToolStats 함수 존재 확인
  grep -n "function renderToolStats" src/hud/omcm-hud.mjs
  # Assert: 1줄 매칭

  # buildIndependentHud에 splitWarning 삽입 확인
  grep -n "renderSplitWarning" src/hud/omcm-hud.mjs
  # Assert: 최소 2줄 (함수 정의 + 호출)

  # buildIndependentHud에 toolStats 삽입 확인
  grep -n "renderToolStats" src/hud/omcm-hud.mjs
  # Assert: 최소 2줄 (함수 정의 + 호출. TODO 4에서 추가 호출 추가)

  # 구문 에러 체크
  node --check src/hud/omcm-hud.mjs
  # Assert: exit code 0
  ```

  **Commit**: NO (TODO 4에서 일괄 커밋)

---

- [ ] 4. `omcm-hud.mjs` main() OMC wrapping에 삽입 + 최종 검증

  **What to do**:

  **Step 4a: main()의 OMC wrapping 섹션에 splitWarning 삽입**

  현재 코드 (line 798-801):
  ```javascript
      if (omcOutput) {
        syncClaudeUsageFromOmcOutput(omcOutput);

        // Parse tokens and build extras
  ```

  `syncClaudeUsageFromOmcOutput(omcOutput);` (line 801) 직후, `// Parse tokens and build extras` (line 803) 직전에 삽입:
  ```javascript
        // 컨텍스트 윈도우 분할 경고 (OMC 래핑 모드)
        var splitWarningOmc = renderSplitWarning(stdinData);
  ```

  **Step 4b: main()의 extraParts 배열에 splitWarning 추가**

  현재 코드 (line 849-853):
  ```javascript
        const extraParts = [];
        if (tokenOutput) extraParts.push(tokenOutput);
        if (fusionOutput) extraParts.push(fusionOutput);
        if (countsOutput) extraParts.push(countsOutput);
        if (fallbackOutput) extraParts.push(fallbackOutput);
  ```

  **이 블록을 다음으로 교체** (splitWarning을 맨 앞, toolStats를 counts 뒤에):
  ```javascript
        const extraParts = [];
        if (splitWarningOmc) extraParts.push(splitWarningOmc);
        if (tokenOutput) extraParts.push(tokenOutput);
        if (fusionOutput) extraParts.push(fusionOutput);
        if (countsOutput) extraParts.push(countsOutput);
        // 도구 사용 통계 (OMC 래핑 모드)
        var toolStatsOmc = renderToolStats(currentSessionId);
        if (toolStatsOmc) extraParts.push(toolStatsOmc);
        if (fallbackOutput) extraParts.push(fallbackOutput);
  ```

  **주의**: `currentSessionId`는 line 812-815에서 이미 선언 (`main()` 내 OMC wrapping 블록).

  **Step 4c: 최종 검증 실행**

  ```bash
  # 1. 구문 체크
  node --check src/hud/omcm-hud.mjs
  node --check src/tracking/tool-tracker-logger.mjs

  # 2. HUD 실행 (빈 stdin)
  echo '{}' | node src/hud/omcm-hud.mjs

  # 3. HUD 실행 (context window 데이터)
  echo '{"context_window":{"used_percentage":85}}' | node src/hud/omcm-hud.mjs

  # 4. lsp_diagnostics (가능하면)
  # lsp_diagnostics("src/hud/omcm-hud.mjs", severity="error")
  # lsp_diagnostics("src/tracking/tool-tracker-logger.mjs", severity="error")
  ```

  **Must NOT do**:
  - `extraParts` 배열 이름 변경
  - omcOutput regex 패턴 (line 859) 변경
  - fallbackOutput 위치를 extraParts 마지막이 아닌 곳에 배치

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 내 정확한 위치 수정 + 검증 커맨드 실행
  - **Skills**: [`git-master`]
    - `git-master`: 최종 커밋 생성

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final)
  - **Blocks**: None
  - **Blocked By**: TODO 2, 3

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs:789-879` — `main()` 함수 전체. OMC available 분기와 independent 분기 이해 필수
  - `src/hud/omcm-hud.mjs:796-869` — OMC wrapping 블록. `omcOutput` 존재 시의 extras 빌드 로직
  - `src/hud/omcm-hud.mjs:849-853` — `extraParts[]` 빌드. 이 부분을 수정해야 함
  - `src/hud/omcm-hud.mjs:857-865` — `finalOutput` 생성 로직. regex 치환으로 extras를 OMC 출력에 inject. **이 로직은 변경하지 않음**
  - `src/hud/omcm-hud.mjs:812-815` — `currentSessionId` 변수 (main 내부). renderToolStats 인자로 사용

  **Acceptance Criteria**:

  ```bash
  # main()에 splitWarning 호출 존재
  grep -n "splitWarningOmc" src/hud/omcm-hud.mjs
  # Assert: 최소 2줄 (선언 + push)

  # main()에 toolStatsOmc 호출 존재
  grep -n "toolStatsOmc" src/hud/omcm-hud.mjs
  # Assert: 최소 2줄 (선언 + push)

  # extraParts 순서 확인 (splitWarning이 가장 먼저)
  grep -A8 "const extraParts = \[\]" src/hud/omcm-hud.mjs | head -10
  # Assert: splitWarningOmc가 tokenOutput보다 앞

  # 전체 구문 체크
  node --check src/hud/omcm-hud.mjs
  # Assert: exit code 0

  # HUD 실행 (에러 없음 확인)
  echo '{}' | node src/hud/omcm-hud.mjs
  # Assert: exit code 0, 출력에 '[OMCM]' 포함

  # optional chaining 전체 파일 부재 확인
  grep -c '?\.' src/hud/omcm-hud.mjs
  # Assert: 0

  # lsp_diagnostics 실행 (가능 시)
  # lsp_diagnostics("src/hud/omcm-hud.mjs") → 에러 0개
  ```

  **Commit**: YES (일괄)
  - Message: `feat(hud): 컨텍스트 분할 경고 + 도구 사용 통계 HUD 추가`
  - Files: `src/tracking/tool-tracker-logger.mjs`, `src/hud/omcm-hud.mjs`
  - Pre-commit: `node --check src/hud/omcm-hud.mjs && node --check src/tracking/tool-tracker-logger.mjs`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(tracking): tool-tracker-logger 모듈 추가` | `src/tracking/tool-tracker-logger.mjs` | `node --check` |
| 4 | `feat(hud): 컨텍스트 분할 경고 + 도구 사용 통계 HUD 추가` | `src/hud/omcm-hud.mjs` | `node --check` 양쪽 + HUD 실행 |

---

## Success Criteria

### Verification Commands
```bash
node --check src/tracking/tool-tracker-logger.mjs    # Expected: exit 0
node --check src/hud/omcm-hud.mjs                   # Expected: exit 0
echo '{}' | node src/hud/omcm-hud.mjs               # Expected: [OMCM] output, exit 0
grep -c '?\.' src/hud/omcm-hud.mjs                  # Expected: 0
grep -c '?\.' src/tracking/tool-tracker-logger.mjs   # Expected: 0
```

### Final Checklist
- [ ] `tool-tracker-logger.mjs` 생성됨, `getToolUsageStats` export
- [ ] `renderSplitWarning` 함수 정의됨, try/catch 가드
- [ ] `renderToolStats` 함수 정의됨, try/catch 가드
- [ ] `buildIndependentHud()`에 양쪽 삽입 (섹션 1.5 + 5.5)
- [ ] `main()` OMC wrapping에 양쪽 삽입 (extraParts 배열)
- [ ] optional chaining 없음
- [ ] 한국어 주석
- [ ] `node --check` 통과
- [ ] HUD 실행 시 에러 없음
