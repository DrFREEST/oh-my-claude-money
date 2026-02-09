# Tool Counter Utility + Read/Bash Optimizer Hooks

## TL;DR

> **Quick Summary**: Add a shared tool-counter utility that tracks consecutive Read/Bash calls per session, plus two PreToolUse optimizer hooks that emit systemMessage suggestions when consecutive thresholds are exceeded (Read 5+, Bash 3+). Update hooks.json to register both new hooks after the existing Task matcher.
> 
> **Deliverables**:
> - `src/utils/tool-counter.mjs` — 세션별 연속 도구 호출 카운터 유틸리티
> - `hooks/read-optimizer.mjs` — Read 도구 연속 5회 감지 시 제안 훅
> - `hooks/bash-optimizer.mjs` — Bash 도구 연속 3회 감지 시 제안 훅
> - `hooks/hooks.json` — PreToolUse에 Read/Bash 매처 추가
> - `tests/unit/tool-counter.test.mjs` — 카운터 유틸리티 단위 테스트
> - `tests/unit/hooks/read-optimizer.test.mjs` — Read 옵티마이저 훅 테스트
> - `tests/unit/hooks/bash-optimizer.test.mjs` — Bash 옵티마이저 훅 테스트
> 
> **Estimated Effort**: Medium (3 new modules + 1 modification + 3 test files)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (tool-counter) → Tasks 2+3 (hooks, parallel) → Task 4 (hooks.json) → Task 5 (tests)

---

## Context

### Original Request
Add a tool-counter utility plus read/bash optimizer hooks. Update hooks.json PreToolUse only. 3 new files to create, 1 to modify.

### Interview Summary
**Key Discussions**:
- tool-counter counts consecutive Read/Bash calls per session; resets when any non-Read/non-Bash tool is seen (including Task)
- Persistence: `~/.omcm/sessions/<sessionId>/tool-counters.json` with fallback `~/.omcm/tool-counters.json`
- read-optimizer: Emit systemMessage at exactly 5 consecutive Reads
- bash-optimizer: Emit systemMessage at exactly 3 consecutive Bash calls
- All hooks non-blocking (always `{ allow: true }`)
- hooks.json: New matchers placed AFTER the existing Task matcher in PreToolUse

**Research Findings**:
- Existing hook pattern: `hooks/fusion-router.mjs` — stdin JSON, stdout JSON, `var` style, no optional chaining
- Existing util pattern: `src/utils/` — `const/let`, allows `??` but not `?.`
- Test framework: `node:test` + `node:assert`, files at `tests/**/*.test.mjs`
- Session ID: `getSessionIdFromTty()` from `src/utils/session-id.mjs`
- Persistence pattern: `fusion-tracker.mjs` uses `writeFileSync` for JSON state

### Metis Review
**Identified Gaps** (all addressed):
- Reset trigger: Self-reset inside tool-counter when tool_name is not Read/Bash (no fusion-router.mjs modification needed)
- Suggestion frequency: Emit only at exact threshold (count == 5 or count == 3), not on every subsequent call
- Localization: Korean messages (matches codebase convention)
- Atomic persistence: writeFileSync pattern (matches fusion-tracker.mjs)
- Hook latency: Synchronous I/O (matches fusion-router.mjs)
- Race conditions: Claude Code runs hooks serially — no concern

---

## Work Objectives

### Core Objective
Add tool-usage optimization infrastructure that detects excessive consecutive Read/Bash calls and provides actionable suggestions via systemMessage, without blocking any tool execution.

### Concrete Deliverables
- `src/utils/tool-counter.mjs` — 카운터 유틸리티 (increment, reset, read, persist)
- `hooks/read-optimizer.mjs` — PreToolUse Read 훅
- `hooks/bash-optimizer.mjs` — PreToolUse Bash 훅
- `hooks/hooks.json` — 2개 매처 추가 (기존 Task 매처 이후)
- `tests/unit/tool-counter.test.mjs` — 카운터 테스트
- `tests/unit/hooks/read-optimizer.test.mjs` — Read 훅 테스트
- `tests/unit/hooks/bash-optimizer.test.mjs` — Bash 훅 테스트

### Definition of Done
- [ ] `node --test tests/unit/tool-counter.test.mjs` → PASS
- [ ] `node --test tests/unit/hooks/read-optimizer.test.mjs` → PASS
- [ ] `node --test tests/unit/hooks/bash-optimizer.test.mjs` → PASS
- [ ] `node --test tests/**/*.test.mjs` → ALL 기존 테스트 + 신규 테스트 PASS
- [ ] `hooks/hooks.json` 유효한 JSON (파싱 가능)
- [ ] PreToolUse 배열에서 Task 매처가 첫번째, Read/Bash 매처가 이후에 위치
- [ ] 모든 `.mjs` 파일에 `?.` (optional chaining) 없음
- [ ] 모든 주석/JSDoc 한국어

### Must Have
- 연속 Read 5회 시 systemMessage 제안 (정확히 5회 시점에만)
- 연속 Bash 3회 시 systemMessage 제안 (정확히 3회 시점에만)
- Task 포함 비-Read/비-Bash 도구 호출 시 카운터 리셋
- 세션별 JSON 파일 영속화
- sessionId 없을 때 글로벌 fallback 경로
- 모든 훅은 항상 `{ allow: true }` 반환 (비차단)

### Must NOT Have (Guardrails)
- `?.` (optional chaining) 사용 금지 — 명시적 null 체크 사용
- 영문 주석 금지 — 한국어만 사용
- 기존 `fusion-router.mjs` 수정 금지
- Read/Bash 이외의 도구 매처 추가 금지
- 자동 배치 또는 도구 차단 로직 금지 (제안만)
- HUD 연동 또는 고급 분석 기능 추가 금지
- 임계값 초과 후 매 호출마다 제안 반복 금지 (정확히 임계값 도달 시 1회만)
- `.ts`, `.js` 확장자 사용 금지 — `.mjs`만
- PreToolUse에서 Task 매처보다 앞에 배치 금지

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (node:test, 15 existing test files)
- **User wants tests**: YES (Tests-after — utility first, then tests)
- **Framework**: `node --test` (Node.js built-in)

### Automated Verification

Each TODO includes executable verification. All verification is agent-executable.

**By Deliverable Type:**

| Type | Verification Tool | Procedure |
|------|------------------|-----------|
| Utility module | `node -e` via Bash | Import, call functions, assert return values |
| Hook scripts | `echo '...' | node hook.mjs` via Bash | Pipe JSON stdin, capture stdout, validate JSON output |
| JSON config | `node -e 'JSON.parse(...)'` via Bash | Parse hooks.json, validate structure |
| Tests | `node --test` via Bash | Run test suites, check exit code 0 |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: src/utils/tool-counter.mjs (기반 유틸리티, 의존성 없음)

Wave 2 (After Wave 1):
├── Task 2: hooks/read-optimizer.mjs (depends: Task 1)
└── Task 3: hooks/bash-optimizer.mjs (depends: Task 1)

Wave 3 (After Wave 2):
└── Task 4: hooks/hooks.json 수정 (depends: Tasks 2, 3)

Wave 4 (After Wave 3):
└── Task 5: 전체 테스트 작성 + 실행 (depends: Tasks 1-4)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None (foundation) |
| 2 | 1 | 4 | 3 |
| 3 | 1 | 4 | 2 |
| 4 | 2, 3 | 5 | None |
| 5 | 1, 2, 3, 4 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1 | executor (sonnet) — utility module creation |
| 2 | 2, 3 | 2x executor-low (haiku) — simple hook scripts, parallel |
| 3 | 4 | executor-low (haiku) — JSON edit only |
| 4 | 5 | executor (sonnet) — test creation + execution |

---

## TODOs

- [ ] 1. `src/utils/tool-counter.mjs` — 세션별 연속 도구 호출 카운터 유틸리티 생성

  **What to do**:
  - 새 파일 `src/utils/tool-counter.mjs` 생성
  - ES module (`export function ...`), `const/let` 스타일, `??` 허용하되 `?.` 금지
  - 모든 JSDoc/주석 한국어
  - 구현할 함수:
    1. `getCounterFilePath(sessionId)` — 카운터 파일 경로 반환
       - sessionId 있으면: `~/.omcm/sessions/<sessionId>/tool-counters.json`
       - sessionId 없으면: `~/.omcm/tool-counters.json`
    2. `readCounters(sessionId)` — JSON 파일에서 카운터 상태 읽기
       - 반환 스키마: `{ read: number, bash: number, lastTool: string, lastUpdated: string }`
       - 파일 없으면 기본값: `{ read: 0, bash: 0, lastTool: '', lastUpdated: '' }`
    3. `writeCounters(sessionId, counters)` — 카운터 상태를 JSON 파일에 저장
       - 디렉토리 없으면 `mkdirSync({ recursive: true })` 생성
       - `writeFileSync`로 저장 (fusion-tracker.mjs 패턴)
    4. `incrementAndCheck(toolName, sessionId)` — 핵심 로직
       - `toolName === 'Read'`: read 카운터 증가, bash 리셋 → `{ count: N, exceeded: N === 5 }` 반환
       - `toolName === 'Bash'`: bash 카운터 증가, read 리셋 → `{ count: N, exceeded: N === 3 }` 반환
       - 그 외 (Task 포함): 모든 카운터 리셋 → `{ count: 0, exceeded: false }` 반환
       - 매 호출 시 파일 영속화
       - `exceeded`는 정확히 임계값 도달 시에만 `true` (이후 false)
    5. `resetCounters(sessionId)` — 명시적 리셋 (카운터를 0으로)
  - import: `fs` (`existsSync`, `readFileSync`, `writeFileSync`, `mkdirSync`), `path` (`join`, `dirname`), `os` (`homedir`)

  **Must NOT do**:
  - `?.` (optional chaining) 사용 금지
  - 영문 주석 금지
  - HUD 연동 금지
  - 세션 ID 생성 로직 포함 금지 (외부에서 주입)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 유틸리티 모듈, 기존 패턴(fusion-tracker.mjs) 복제 + 카운터 로직 추가
  - **Skills**: [`git-master`]
    - `git-master`: 커밋 시 사용
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI 작업 아님
    - `tdd`: 테스트는 별도 태스크에서 작성

  **Parallelization**:
  - **Can Run In Parallel**: NO (기반 유틸리티)
  - **Parallel Group**: Wave 1 (단독)
  - **Blocks**: Tasks 2, 3, 5
  - **Blocked By**: None

  **References** (CRITICAL):

  **Pattern References** (기존 코드 패턴):
  - `src/utils/fusion-tracker.mjs:1-50` — JSON 파일 기반 상태 관리 패턴 (readFusionState/writeFusionState). getDefaultState() 패턴을 동일하게 따를 것.
  - `src/utils/fusion-tracker.mjs:14-24` — getStateFile(sessionId) 패턴: sessionId 여부에 따른 경로 분기 로직. 이 패턴을 getCounterFilePath에 적용.
  - `src/tracking/call-logger.mjs:33-73` — mkdirSync + writeSync 패턴, 디렉토리 생성 후 파일 쓰기.
  - `src/utils/session-id.mjs` — getSessionIdFromTty() 함수 시그니처. tool-counter는 이 함수를 직접 import하지 않지만, 호출자(hooks)가 sessionId를 주입.

  **API/Type References**:
  - 반환 스키마: `{ read: number, bash: number, lastTool: string, lastUpdated: string }`
  - incrementAndCheck 반환: `{ count: number, exceeded: boolean }`

  **Acceptance Criteria**:

  ```bash
  # 1. 파일 존재 확인
  test -f src/utils/tool-counter.mjs && echo "PASS: file exists"

  # 2. ES module import 가능 확인
  node -e "
    import { incrementAndCheck, readCounters, resetCounters } from './src/utils/tool-counter.mjs';
    console.log('PASS: module imports');
  "

  # 3. optional chaining 부재 확인
  ! grep -q '\?\.' src/utils/tool-counter.mjs && echo "PASS: no optional chaining"

  # 4. 한국어 주석 확인
  grep -c '\/\*\*' src/utils/tool-counter.mjs | xargs -I{} test {} -ge 3 && echo "PASS: Korean JSDoc present"

  # 5. incrementAndCheck 기본 동작 확인
  node -e "
    import { incrementAndCheck } from './src/utils/tool-counter.mjs';
    var r1 = incrementAndCheck('Read', null);
    console.log('count=' + r1.count + ' exceeded=' + r1.exceeded);
    // Expected: count=1 exceeded=false
  "
  ```

  **Commit**: YES
  - Message: `feat(utils): 세션별 연속 도구 호출 카운터 유틸리티 추가`
  - Files: `src/utils/tool-counter.mjs`
  - Pre-commit: `node -e "import('./src/utils/tool-counter.mjs')"`

---

- [ ] 2. `hooks/read-optimizer.mjs` — Read 도구 연속 5회 감지 시 제안 PreToolUse 훅 생성

  **What to do**:
  - 새 파일 `hooks/read-optimizer.mjs` 생성
  - `hooks/` 디렉토리 스타일: `var` 사용, `?.` 금지, `??` 금지 (fusion-router.mjs 패턴)
  - 모든 주석 한국어
  - 구현:
    1. `#!/usr/bin/env node` shebang
    2. `import { incrementAndCheck } from '../src/utils/tool-counter.mjs';`
    3. `import { getSessionIdFromTty } from '../src/utils/session-id.mjs';`
    4. stdin에서 JSON 읽기 (`process.stdin` async iteration — fusion-router.mjs:99-102 패턴)
    5. `data.tool_name`이 `'Read'`인지 확인 (아닐 경우 `{ allow: true }` 반환)
    6. sessionId 획득: `try { sessionId = getSessionIdFromTty(); } catch (e) { sessionId = null; }`
    7. `incrementAndCheck('Read', sessionId)` 호출
    8. `exceeded === true`이면: systemMessage 포함 응답
       ```json
       {
         "allow": true,
         "systemMessage": "연속 Read 호출이 5회 감지되었습니다. Glob이나 Grep 도구를 사용하면 더 효율적으로 파일을 탐색할 수 있습니다."
       }
       ```
    9. 그 외: `{ allow: true }` 반환
    10. 에러 발생 시: `console.error`로 로깅 후 `{ allow: true }` 반환 (비차단)

  **Must NOT do**:
  - `?.` 또는 `??` 사용 금지 (hooks/ 디렉토리 컨벤션)
  - `const`/`let` 사용 금지 — `var`만 (hooks/ 디렉토리 컨벤션)
  - `{ allow: false }` 반환 금지 — 항상 `true`
  - 임계값 초과 후 매번 제안 반복 금지 (정확히 5회 시점에만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 훅 스크립트, fusion-router.mjs 패턴 복제 + 카운터 호출
  - **Skills**: [`git-master`]
    - `git-master`: 커밋 시 사용
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI 아님

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References** (CRITICAL):

  **Pattern References**:
  - `hooks/fusion-router.mjs:97-121` — main() 함수 구조: stdin 읽기 → JSON 파싱 → tool_name 확인 → 결과 출력. **이 구조를 그대로 복제**.
  - `hooks/fusion-router.mjs:99-102` — stdin async iteration 패턴: `var input = ''; for await (var chunk of process.stdin) { input += chunk; }`
  - `hooks/fusion-router.mjs:109-111` — sessionId 획득 패턴: try/catch로 getSessionIdFromTty 호출
  - `hooks/fusion-router.mjs:118-121` — 비-Task 도구 조기 반환 패턴: `if (toolName !== 'Task') { console.log(JSON.stringify({ allow: true })); return; }`

  **API/Type References**:
  - tool-counter.mjs의 `incrementAndCheck('Read', sessionId)` → `{ count: number, exceeded: boolean }`
  - 출력 JSON: `{ allow: true }` 또는 `{ allow: true, systemMessage: string }`

  **Acceptance Criteria**:

  ```bash
  # 1. 파일 존재 확인
  test -f hooks/read-optimizer.mjs && echo "PASS: file exists"

  # 2. optional chaining / nullish coalescing 부재 확인
  ! grep -qE '\?\.|(\?\?)' hooks/read-optimizer.mjs && echo "PASS: no ?. or ??"

  # 3. var 사용 확인 (const/let 없음)
  ! grep -qE '^\s*(const|let)\s' hooks/read-optimizer.mjs && echo "PASS: uses var only"

  # 4. Non-Read 도구 → allow: true
  echo '{"tool_name":"Bash","tool_input":{}}' | node hooks/read-optimizer.mjs
  # Expected: {"allow":true}

  # 5. Read 도구 5회 연속 → systemMessage 포함
  # (연속 5회 호출 후 확인 — 테스트 파일에서 상세 검증)
  ```

  **Commit**: NO (groups with Task 3)

---

- [ ] 3. `hooks/bash-optimizer.mjs` — Bash 도구 연속 3회 감지 시 제안 PreToolUse 훅 생성

  **What to do**:
  - 새 파일 `hooks/bash-optimizer.mjs` 생성
  - Task 2와 동일한 구조, 단 Bash 전용
  - `hooks/` 디렉토리 스타일: `var` 사용, `?.` 금지, `??` 금지
  - 모든 주석 한국어
  - 구현:
    1. `#!/usr/bin/env node` shebang
    2. `import { incrementAndCheck } from '../src/utils/tool-counter.mjs';`
    3. `import { getSessionIdFromTty } from '../src/utils/session-id.mjs';`
    4. stdin JSON 읽기 (fusion-router.mjs 패턴)
    5. `data.tool_name`이 `'Bash'`인지 확인 (아닐 경우 `{ allow: true }`)
    6. sessionId 획득 (try/catch)
    7. `incrementAndCheck('Bash', sessionId)` 호출
    8. `exceeded === true`이면:
       ```json
       {
         "allow": true,
         "systemMessage": "연속 Bash 호출이 3회 감지되었습니다. 여러 명령어를 하나의 Bash 호출로 결합하거나 스크립트 파일 실행을 고려해보세요."
       }
       ```
    9. 그 외: `{ allow: true }`
    10. 에러 시: `console.error` → `{ allow: true }`

  **Must NOT do**:
  - `?.` 또는 `??` 사용 금지
  - `const`/`let` 사용 금지 — `var`만
  - `{ allow: false }` 반환 금지
  - 임계값 초과 후 매번 제안 반복 금지 (정확히 3회 시점에만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Task 2와 거의 동일한 구조, 임계값/메시지만 다름
  - **Skills**: [`git-master`]
    - `git-master`: 커밋 시 사용

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References** (CRITICAL):

  **Pattern References**:
  - `hooks/fusion-router.mjs:97-121` — main() 함수 구조 (Task 2와 동일)
  - `hooks/read-optimizer.mjs` — Task 2에서 생성된 파일. 구조를 복제하되 도구명/임계값/메시지만 변경.

  **API/Type References**:
  - tool-counter.mjs의 `incrementAndCheck('Bash', sessionId)` → `{ count: number, exceeded: boolean }`

  **Acceptance Criteria**:

  ```bash
  # 1. 파일 존재 확인
  test -f hooks/bash-optimizer.mjs && echo "PASS: file exists"

  # 2. optional chaining / nullish coalescing 부재 확인
  ! grep -qE '\?\.|(\?\?)' hooks/bash-optimizer.mjs && echo "PASS: no ?. or ??"

  # 3. var 사용 확인
  ! grep -qE '^\s*(const|let)\s' hooks/bash-optimizer.mjs && echo "PASS: uses var only"

  # 4. Non-Bash 도구 → allow: true
  echo '{"tool_name":"Read","tool_input":{}}' | node hooks/bash-optimizer.mjs
  # Expected: {"allow":true}
  ```

  **Commit**: YES (groups Tasks 2+3)
  - Message: `feat(hooks): Read/Bash 연속 호출 감지 옵티마이저 훅 추가`
  - Files: `hooks/read-optimizer.mjs`, `hooks/bash-optimizer.mjs`
  - Pre-commit: `echo '{"tool_name":"Read","tool_input":{}}' | node hooks/read-optimizer.mjs && echo '{"tool_name":"Bash","tool_input":{}}' | node hooks/bash-optimizer.mjs`

---

- [ ] 4. `hooks/hooks.json` — PreToolUse에 Read/Bash 매처 추가

  **What to do**:
  - `hooks/hooks.json` 수정 (기존 파일)
  - `PreToolUse` 배열에 2개 매처 추가 — **반드시 기존 Task 매처 뒤에 배치**
  - 추가할 항목:
    ```json
    {
      "matcher": "Read",
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/read-optimizer.mjs",
          "timeout": 5,
          "statusMessage": "Read 최적화 확인 중..."
        }
      ]
    },
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/bash-optimizer.mjs",
          "timeout": 5,
          "statusMessage": "Bash 최적화 확인 중..."
        }
      ]
    }
    ```
  - timeout: 5초 (훅이 가벼우므로 fusion-router의 120초 대비 짧게)
  - statusMessage: 한국어
  - 기존 UserPromptSubmit, SessionStart, Stop 섹션은 변경 금지

  **Must NOT do**:
  - 기존 Task 매처 수정 금지
  - Task 매처보다 앞에 배치 금지
  - UserPromptSubmit/SessionStart/Stop 섹션 수정 금지
  - 유효하지 않은 JSON 생성 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON 파일 한 곳에 2개 항목 삽입
  - **Skills**: [`git-master`]
    - `git-master`: 커밋 시 사용

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (단독)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 2, 3

  **References** (CRITICAL):

  **Pattern References**:
  - `hooks/hooks.json:1-54` — 전체 파일. 현재 PreToolUse에 Task 매처만 존재 (라인 4-16). 라인 16 (닫는 `}`) 뒤에 새 매처 2개 추가.
  - `hooks/hooks.json:4-16` — Task 매처 구조. 새 매처는 이 구조를 동일하게 따름 (matcher, hooks 배열, type/command/timeout/statusMessage).

  **Acceptance Criteria**:

  ```bash
  # 1. JSON 유효성 확인
  node -e "
    var fs = require('fs');
    var data = JSON.parse(fs.readFileSync('hooks/hooks.json', 'utf-8'));
    console.log('PASS: valid JSON');
  "

  # 2. PreToolUse 배열 길이 확인 (기존 1 + 신규 2 = 3)
  node -e "
    var fs = require('fs');
    var data = JSON.parse(fs.readFileSync('hooks/hooks.json', 'utf-8'));
    var count = data.hooks.PreToolUse.length;
    if (count === 3) console.log('PASS: 3 PreToolUse matchers');
    else console.log('FAIL: expected 3, got ' + count);
  "

  # 3. 매처 순서 확인 (Task → Read → Bash)
  node -e "
    var fs = require('fs');
    var data = JSON.parse(fs.readFileSync('hooks/hooks.json', 'utf-8'));
    var matchers = data.hooks.PreToolUse.map(function(m) { return m.matcher; });
    if (matchers[0] === 'Task' && matchers[1] === 'Read' && matchers[2] === 'Bash') {
      console.log('PASS: correct order Task → Read → Bash');
    } else {
      console.log('FAIL: order is ' + matchers.join(' → '));
    }
  "

  # 4. 기존 섹션 보존 확인
  node -e "
    var fs = require('fs');
    var data = JSON.parse(fs.readFileSync('hooks/hooks.json', 'utf-8'));
    var keys = Object.keys(data.hooks);
    if (keys.indexOf('UserPromptSubmit') !== -1 && keys.indexOf('SessionStart') !== -1 && keys.indexOf('Stop') !== -1) {
      console.log('PASS: existing sections preserved');
    } else {
      console.log('FAIL: missing sections');
    }
  "
  ```

  **Commit**: YES
  - Message: `feat(hooks): hooks.json에 Read/Bash 옵티마이저 매처 등록`
  - Files: `hooks/hooks.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf-8'))"`

---

- [ ] 5. 전체 테스트 작성 및 실행

  **What to do**:
  - 3개 테스트 파일 생성:
    1. `tests/unit/tool-counter.test.mjs` — tool-counter 유틸리티 단위 테스트
    2. `tests/unit/hooks/read-optimizer.test.mjs` — read-optimizer 훅 테스트
    3. `tests/unit/hooks/bash-optimizer.test.mjs` — bash-optimizer 훅 테스트
  - 테스트 프레임워크: `node:test` + `node:assert` (기존 패턴)
  - 모든 테스트 설명 한국어

  **tool-counter.test.mjs 테스트 케이스**:
  - `describe('tool-counter')`:
    - `readCounters()` — 파일 없으면 기본값 반환
    - `writeCounters()` — 파일 생성 및 내용 확인
    - `incrementAndCheck('Read', null)` — 1회 호출: count=1, exceeded=false
    - `incrementAndCheck('Read', null)` x5 — 5회 연속: count=5, exceeded=true
    - `incrementAndCheck('Read', null)` x6 — 6회: count=6, exceeded=false (임계값 초과 후 false)
    - `incrementAndCheck('Bash', null)` — Read 카운터 리셋 확인
    - `incrementAndCheck('Bash', null)` x3 — 3회 연속: count=3, exceeded=true
    - `incrementAndCheck('Task', null)` — 모든 카운터 리셋
    - `incrementAndCheck('Read', null)` 후 `incrementAndCheck('Bash', null)` — Read 리셋 확인
    - `resetCounters(null)` — 명시적 리셋
    - sessionId 지정 시 세션별 파일 경로 사용 확인

  **read-optimizer.test.mjs 테스트 케이스**:
  - `describe('read-optimizer hook')`:
    - Non-Read 도구 입력 시 `{ allow: true }` 반환 (systemMessage 없음)
    - Read 도구 1회 → `{ allow: true }` (systemMessage 없음)
    - Read 도구 5회 연속 → `{ allow: true, systemMessage: '...' }` (systemMessage 있음)
    - 잘못된 JSON 입력 시 `{ allow: true }` 반환 (에러 처리)

  **bash-optimizer.test.mjs 테스트 케이스**:
  - `describe('bash-optimizer hook')`:
    - Non-Bash 도구 입력 시 `{ allow: true }` 반환
    - Bash 도구 1회 → `{ allow: true }` (systemMessage 없음)
    - Bash 도구 3회 연속 → `{ allow: true, systemMessage: '...' }` (systemMessage 있음)
    - 잘못된 JSON 입력 시 `{ allow: true }` 반환

  **테스트 환경**:
  - `before()`/`after()`에서 테스트용 임시 디렉토리 설정/정리
  - 훅 테스트: `child_process.execSync`로 `echo '...' | node hooks/xxx.mjs` 실행하여 stdout 검증
  - `HOME` 환경 변수를 테스트 디렉토리로 오버라이드하여 실제 파일 오염 방지

  **Must NOT do**:
  - 기존 테스트 파일 수정 금지
  - 실제 `~/.omcm/` 디렉토리에 테스트 데이터 쓰기 금지 (임시 디렉토리 사용)
  - 영문 테스트 설명 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 테스트 코드 작성 + 실행, 기존 패턴(fusion-tracker.test.mjs) 복제
  - **Skills**: [`git-master`]
    - `git-master`: 커밋 시 사용

  **Parallelization**:
  - **Can Run In Parallel**: NO (최종 검증)
  - **Parallel Group**: Wave 4 (단독)
  - **Blocks**: None (최종)
  - **Blocked By**: Tasks 1, 2, 3, 4

  **References** (CRITICAL):

  **Pattern References**:
  - `tests/unit/fusion-tracker.test.mjs:1-50` — 테스트 구조 패턴: import, describe, before/after cleanup, it() 블록, assert.strictEqual. **이 구조를 복제**.
  - `tests/unit/fusion-tracker.test.mjs:20-31` — before/after 파일 정리 패턴: 디렉토리 생성 및 파일 삭제.

  **Test References**:
  - `tests/unit/fusion-router.test.mjs` — shouldRouteToOpenCode 함수 테스트 패턴 (의존성 주입)
  - `tests/unit/fusion-tracker.test.mjs` — 상태 파일 기반 유틸리티 테스트 패턴

  **Acceptance Criteria**:

  ```bash
  # 1. 테스트 파일 존재 확인
  test -f tests/unit/tool-counter.test.mjs && echo "PASS"
  test -f tests/unit/hooks/read-optimizer.test.mjs && echo "PASS"
  test -f tests/unit/hooks/bash-optimizer.test.mjs && echo "PASS"

  # 2. 개별 테스트 실행
  node --test tests/unit/tool-counter.test.mjs
  # Expected: PASS (11+ tests, 0 failures)

  node --test tests/unit/hooks/read-optimizer.test.mjs
  # Expected: PASS (4+ tests, 0 failures)

  node --test tests/unit/hooks/bash-optimizer.test.mjs
  # Expected: PASS (4+ tests, 0 failures)

  # 3. 전체 테스트 스위트 실행 (기존 + 신규)
  node --test tests/**/*.test.mjs
  # Expected: ALL PASS (기존 361개 + 신규 ~19개)

  # 4. optional chaining 부재 전체 확인
  ! grep -rE '\?\.' src/utils/tool-counter.mjs hooks/read-optimizer.mjs hooks/bash-optimizer.mjs && echo "PASS: no optional chaining anywhere"
  ```

  **Commit**: YES
  - Message: `test: tool-counter 유틸리티 및 Read/Bash 옵티마이저 훅 테스트 추가`
  - Files: `tests/unit/tool-counter.test.mjs`, `tests/unit/hooks/read-optimizer.test.mjs`, `tests/unit/hooks/bash-optimizer.test.mjs`
  - Pre-commit: `node --test tests/unit/tool-counter.test.mjs && node --test tests/unit/hooks/read-optimizer.test.mjs && node --test tests/unit/hooks/bash-optimizer.test.mjs`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(utils): 세션별 연속 도구 호출 카운터 유틸리티 추가` | `src/utils/tool-counter.mjs` | `node -e "import('./src/utils/tool-counter.mjs')"` |
| 2+3 | `feat(hooks): Read/Bash 연속 호출 감지 옵티마이저 훅 추가` | `hooks/read-optimizer.mjs`, `hooks/bash-optimizer.mjs` | pipe test |
| 4 | `feat(hooks): hooks.json에 Read/Bash 옵티마이저 매처 등록` | `hooks/hooks.json` | JSON parse |
| 5 | `test: tool-counter 유틸리티 및 Read/Bash 옵티마이저 훅 테스트 추가` | `tests/unit/tool-counter.test.mjs`, `tests/unit/hooks/*.test.mjs` | `node --test` |

---

## Success Criteria

### Verification Commands
```bash
# 전체 테스트 통과
node --test tests/**/*.test.mjs
# Expected: ALL PASS

# hooks.json 유효성
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf-8'))"
# Expected: no error

# PreToolUse 매처 순서
node -e "
  var d = JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf-8'));
  console.log(d.hooks.PreToolUse.map(function(m){return m.matcher}).join(' → '));
"
# Expected: Task → Read → Bash

# optional chaining 부재
! grep -rE '\?\.' src/utils/tool-counter.mjs hooks/read-optimizer.mjs hooks/bash-optimizer.mjs
# Expected: no output (no matches)

# 한국어 주석 존재
grep -l '\/\*\*' src/utils/tool-counter.mjs hooks/read-optimizer.mjs hooks/bash-optimizer.mjs | wc -l
# Expected: 3
```

### Final Checklist
- [ ] All "Must Have" present (연속 카운터, 임계값 감지, 세션 영속화, 비차단)
- [ ] All "Must NOT Have" absent (no `?.`, no English comments, no blocking, no fusion-router changes)
- [ ] All tests pass (기존 361 + 신규 ~19)
- [ ] hooks.json valid and correctly ordered
