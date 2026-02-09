# Tool Usage Tracking Hook & Logger

## TL;DR

> **Quick Summary**: Add a `PostToolUse` hook that captures every tool invocation (tool name, input, result) and logs it as JSONL per session, plus a reusable logger module in `src/tracking/`.
> 
> **Deliverables**:
> - `hooks/tool-tracker.mjs` — PostToolUse hook entry point
> - `src/tracking/tool-tracker-logger.mjs` — JSONL logger module
> - `hooks/hooks.json` — PostToolUse block added after Stop
> - `src/tracking/index.mjs` — Re-export new logger
> - `tests/v100/tool-tracker.test.mjs` — Unit tests
> 
> **Estimated Effort**: Short (~1-2 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 3 → Task 4 → Task 5

---

## Context

### Original Request
Add tool usage tracking via a new `PostToolUse` hook in hooks.json (inserted after the existing `Stop` block) and a corresponding logger at `src/tracking/tool-tracker-logger.mjs`. Hook entry point at `hooks/tool-tracker.mjs`. Must use ESM, no optional chaining (`?.`), Korean comments.

### Interview Summary
**Key Discussions**:
- Follow the exact pattern of `hooks/fusion-router.mjs` for the hook stdin/stdout contract
- Follow the exact pattern of `src/tracking/call-logger.mjs` for JSONL file writing (sync fs)
- Session ID obtained via `getSessionIdFromTty()` from `src/utils/session-id.mjs`
- Log destination: `~/.omcm/sessions/{sessionId}/tool-usage.jsonl`
- PostToolUse stdin provides `{ tool_name, tool_input, tool_result }`

**Research Findings**:
- `hooks/fusion-router.mjs` reads stdin as async iterator, parses JSON, outputs `{ allow: true }` or `{ allow: false, reason }` (PreToolUse)
- `src/tracking/call-logger.mjs` uses `openSync('a') / writeSync / closeSync` for atomic-like JSONL appends
- PostToolUse hooks receive `tool_name`, `tool_input`, and `tool_result` from stdin; they do NOT return allow/deny — they are observation-only hooks
- Existing test framework: `node:test` with `assert`, tests at `tests/**/*.test.mjs`
- All hook commands use `node ${CLAUDE_PLUGIN_ROOT}/hooks/...` pattern in hooks.json

### Metis Review
**Identified Gaps** (addressed):
- **tool_result truncation**: Large tool results (e.g., file reads) could bloat logs → truncate at 5000 chars
- **Null sessionId**: `getSessionIdFromTty()` may return null in non-TTY contexts → skip logging silently
- **Sensitive data**: No filtering needed for MVP; tool_input is structural, not credential-bearing
- **Error isolation**: Hook must never crash or exit non-zero → top-level try-catch with stderr logging
- **Timeout**: Set 5s timeout in hooks.json (consistent with other non-routing hooks)

---

## Work Objectives

### Core Objective
Capture every tool invocation in a session as structured JSONL for post-session analysis and debugging.

### Concrete Deliverables
- `hooks/tool-tracker.mjs` — PostToolUse hook (reads stdin, calls logger, exits cleanly)
- `src/tracking/tool-tracker-logger.mjs` — `logToolUsage(sessionId, data)` + `getToolUsageLog(sessionId)` functions
- `hooks/hooks.json` — New `PostToolUse` block after `Stop` block (lines 52-53)
- `src/tracking/index.mjs` — Re-export `logToolUsage`, `getToolUsageLog`
- `tests/v100/tool-tracker.test.mjs` — Unit tests for logger + hook behavior

### Definition of Done
- [ ] `node hooks/tool-tracker.mjs` accepts valid PostToolUse JSON on stdin without error
- [ ] JSONL entries written to `~/.omcm/sessions/{id}/tool-usage.jsonl`
- [ ] `node --test tests/v100/tool-tracker.test.mjs` passes
- [ ] `hooks/hooks.json` is valid JSON with PostToolUse block after Stop
- [ ] No optional chaining (`?.`) anywhere in new code
- [ ] Korean comments in all new files

### Must Have
- JSONL format with one JSON object per line
- Fields: `timestamp`, `tool_name`, `tool_input` (truncated), `tool_result` (truncated at 5000 chars), `duration_hint`
- Silent failure on logging errors (no user-facing disruption)
- Session directory auto-creation (`mkdirSync({ recursive: true })`)
- `var` declarations where existing patterns use `var` (hook file); `const` acceptable in logger module (matches call-logger.mjs)

### Must NOT Have (Guardrails)
- No optional chaining (`?.`) — use `x && x.y` pattern
- No HUD integration in this task (future scope)
- No log rotation logic (sessions are cleaned by existing `cleanupOldSessions`)
- No PreToolUse hook (only PostToolUse)
- No `let` in hook file (follow `fusion-router.mjs` `var` pattern)
- No async file I/O in logger (use sync writes like `call-logger.mjs`)
- No process exit with non-zero code from hook

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (`node --test tests/**/*.test.mjs`)
- **User wants tests**: YES (Tests-after)
- **Framework**: `node:test` with `node:assert`

### Automated Verification

Each TODO includes executable verification. All verification is agent-executable.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Create `src/tracking/tool-tracker-logger.mjs` | None | Core logger module, no dependencies |
| Task 2: Update `src/tracking/index.mjs` | Task 1 | Needs the logger module to exist for re-exports |
| Task 3: Create `hooks/tool-tracker.mjs` | Task 1 | Hook imports from the logger module |
| Task 4: Update `hooks/hooks.json` | Task 3 | Registers the hook; must point to existing file |
| Task 5: Create `tests/v100/tool-tracker.test.mjs` | Task 1, Task 3 | Tests both logger and hook logic |

## Parallel Execution Graph

```
Wave 1 (Start immediately):
└── Task 1: Create src/tracking/tool-tracker-logger.mjs (no dependencies)

Wave 2 (After Wave 1):
├── Task 2: Update src/tracking/index.mjs (depends: Task 1)
├── Task 3: Create hooks/tool-tracker.mjs (depends: Task 1)

Wave 3 (After Wave 2):
├── Task 4: Update hooks/hooks.json (depends: Task 3)
└── Task 5: Create tests/v100/tool-tracker.test.mjs (depends: Task 1, Task 3)

Critical Path: Task 1 → Task 3 → Task 4
Parallel Speedup: ~30% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 5 | None (first) |
| 2 | 1 | None | 3 |
| 3 | 1 | 4, 5 | 2 |
| 4 | 3 | None | 5 |
| 5 | 1, 3 | None | 4 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | delegate_task(category="quick", load_skills=["typescript-programmer"]) |
| 2 | 2, 3 | Two parallel delegate_task(category="quick", load_skills=["typescript-programmer"]) |
| 3 | 4, 5 | Two parallel delegate_task(category="quick", ...) |

---

## TODOs

- [ ] 1. Create `src/tracking/tool-tracker-logger.mjs`

  **What to do**:
  - Create the logger module following the exact pattern of `src/tracking/call-logger.mjs`
  - Export `logToolUsage(sessionId, toolData)` function:
    - If `!sessionId` → return immediately
    - Create session dir: `join(SESSIONS_DIR, sessionId)` with `mkdirSync({ recursive: true })`
    - Build entry object: `{ timestamp, tool_name, tool_input (truncated to 2000 chars via JSON.stringify), tool_result (truncated to 5000 chars), duration_hint }`
    - Write as JSONL: `openSync(logFile, 'a')` → `writeSync` → `closeSync`
    - Wrap in try-catch, silently ignore errors
  - Export `getToolUsageLog(sessionId, options)` function:
    - Read `tool-usage.jsonl`, parse each line, return array of entries
    - Support optional `since` timestamp filter (same pattern as `getSessionCalls`)
    - Support optional `toolName` filter
  - Export `TOOL_USAGE_FILE = 'tool-usage.jsonl'` constant
  - Use `const` for declarations (matches call-logger.mjs convention)
  - Korean JSDoc comments (follow call-logger.mjs style: `@param`, `@returns` with Korean descriptions)
  - SESSIONS_DIR = `join(homedir(), '.omcm', 'sessions')`

  **Must NOT do**:
  - No optional chaining (`?.`)
  - No `let` (use `const` or `var`)
  - No async file I/O
  - No log rotation logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file creation following an existing pattern, straightforward implementation
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: ESM/JS module writing expertise, JSDoc patterns
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `git-master`: Not committing yet
    - `data-scientist`: Not data analysis

  **Parallelization**:
  - **Can Run In Parallel**: NO (first task)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2, 3, 5
  - **Blocked By**: None

  **References** (CRITICAL):

  **Pattern References**:
  - `src/tracking/call-logger.mjs:1-73` — **Primary template**: Follow the exact structure (imports, SESSIONS_DIR const, sync file write with openSync/writeSync/closeSync, try-catch silence pattern)
  - `src/tracking/call-logger.mjs:33-73` — `logOpenCodeCall()` function: Mirror this for `logToolUsage()` (parameter structure, entry building, JSONL write)
  - `src/tracking/call-logger.mjs:81-122` — `getSessionCalls()` function: Mirror this for `getToolUsageLog()` (file reading, line parsing, filtering)

  **API/Type References**:
  - `src/utils/session-id.mjs` — `getSessionIdFromTty()` returns string or null
  - Node.js `fs`: `existsSync`, `readFileSync`, `mkdirSync`, `openSync`, `writeSync`, `closeSync`

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  node -e "
    import { logToolUsage, getToolUsageLog } from './src/tracking/tool-tracker-logger.mjs';
    console.log(typeof logToolUsage);
    console.log(typeof getToolUsageLog);
  "
  # Assert: Output is "function\nfunction"
  ```

  ```bash
  # Verify no optional chaining:
  grep -c '\?\.' src/tracking/tool-tracker-logger.mjs
  # Assert: Output is "0"
  ```

  ```bash
  # Verify Korean comments exist:
  grep -c '/**' src/tracking/tool-tracker-logger.mjs
  # Assert: Output is >= 2
  ```

  **Commit**: YES (group with Task 2)
  - Message: `feat(tracking): 도구 사용 추적 로거 모듈 추가`
  - Files: `src/tracking/tool-tracker-logger.mjs`, `src/tracking/index.mjs`
  - Pre-commit: `node -e "import './src/tracking/tool-tracker-logger.mjs'"`

---

- [ ] 2. Update `src/tracking/index.mjs` exports

  **What to do**:
  - Add re-exports from `./tool-tracker-logger.mjs` to the existing index file
  - Add block after the existing MetricsCollector exports (after line 17):
    ```javascript
    // 도구 사용 추적 로거
    export {
      logToolUsage,
      getToolUsageLog
    } from './tool-tracker-logger.mjs';
    ```

  **Must NOT do**:
  - Do not modify existing exports
  - Do not add default export

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding 5 lines to an existing file
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: ESM export patterns
  - **Skills Evaluated but Omitted**:
    - All others: Trivial edit

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/tracking/index.mjs:1-18` — Current file structure: Two export blocks (RealtimeTracker, MetricsCollector). Add third block in same style.

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  node -e "
    import { logToolUsage, getToolUsageLog, RealtimeTracker, MetricsCollector } from './src/tracking/index.mjs';
    console.log(typeof logToolUsage, typeof getToolUsageLog, typeof RealtimeTracker, typeof MetricsCollector);
  "
  # Assert: Output is "function function function function"
  ```

  **Commit**: YES (grouped with Task 1)
  - Message: `feat(tracking): 도구 사용 추적 로거 모듈 추가`
  - Files: `src/tracking/tool-tracker-logger.mjs`, `src/tracking/index.mjs`

---

- [ ] 3. Create `hooks/tool-tracker.mjs`

  **What to do**:
  - Create PostToolUse hook entry point following `hooks/fusion-router.mjs` pattern
  - Shebang: `#!/usr/bin/env node`
  - Korean JSDoc header comment block describing purpose
  - Import `logToolUsage` from `'../src/tracking/tool-tracker-logger.mjs'`
  - Import `getSessionIdFromTty` from `'../src/utils/session-id.mjs'`
  - `async function main()`:
    1. Read stdin using `for await (var chunk of process.stdin)` pattern (same as fusion-router.mjs:100)
    2. Parse JSON: `var data = JSON.parse(input)`
    3. Extract: `var toolName = data.tool_name || ''`
    4. Extract: `var toolInput = data.tool_input || {}`
    5. Extract: `var toolResult = data.tool_result || ''`
    6. Get session ID: `var sessionId = null; try { sessionId = getSessionIdFromTty(); } catch (e) {}`
    7. Call `logToolUsage(sessionId, { tool_name: toolName, tool_input: toolInput, tool_result: toolResult })`
    8. PostToolUse hooks output nothing (observation-only) or output empty JSON `{}`
  - Top-level try-catch wrapping everything, `console.error('[OMCM] Tool tracker error: ' + e.message)` on failure
  - Use `var` for all declarations (matches fusion-router.mjs convention)

  **Must NOT do**:
  - No optional chaining (`?.`)
  - No `let` (use `var` only in hook file)
  - No `allow`/`deny` output (PostToolUse is observation-only, unlike PreToolUse)
  - No process.exit with non-zero code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, following existing hook pattern closely
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: ESM patterns, stdin handling
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not UI
    - `git-master`: Not committing yet

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `hooks/fusion-router.mjs:1-22` — Shebang, JSDoc header, import pattern
  - `hooks/fusion-router.mjs:97-210` — `async function main()` structure: stdin reading (lines 99-102), JSON parsing (line 105), try-catch wrapping (lines 104-209), error handling pattern (lines 206-208)
  - `hooks/fusion-router.mjs:109-115` — Session ID retrieval with try-catch fallback

  **API/Type References**:
  - `src/tracking/tool-tracker-logger.mjs` — `logToolUsage(sessionId, toolData)` (created in Task 1)
  - `src/utils/session-id.mjs` — `getSessionIdFromTty()` returns string or null

  **Acceptance Criteria**:

  ```bash
  # Agent runs (simulate PostToolUse stdin):
  echo '{"tool_name":"Read","tool_input":{"filePath":"/tmp/test.txt"},"tool_result":"file contents"}' | node hooks/tool-tracker.mjs
  # Assert: Exit code 0, no stdout errors
  echo $?
  # Assert: Output is "0"
  ```

  ```bash
  # Verify no optional chaining:
  grep -c '\?\.' hooks/tool-tracker.mjs
  # Assert: Output is "0"
  ```

  ```bash
  # Verify var usage (no let):
  grep -c '\blet\b' hooks/tool-tracker.mjs
  # Assert: Output is "0"
  ```

  **Commit**: YES
  - Message: `feat(hooks): PostToolUse 도구 사용 추적 훅 추가`
  - Files: `hooks/tool-tracker.mjs`
  - Pre-commit: `echo '{}' | node hooks/tool-tracker.mjs`

---

- [ ] 4. Update `hooks/hooks.json` — Add PostToolUse block

  **What to do**:
  - Add `PostToolUse` array after the `Stop` block (after line 52, before the closing `}` braces)
  - Insert location: Between the closing `]` of Stop (line 52) and the closing `}` of hooks (line 53)
  - Add comma after Stop's `]` on line 52
  - New block:
    ```json
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/tool-tracker.mjs",
            "timeout": 5,
            "statusMessage": "도구 사용 기록 중..."
          }
        ]
      }
    ]
    ```
  - Validate resulting JSON is valid

  **Must NOT do**:
  - Do not add a `matcher` field (track ALL tools, not just specific ones)
  - Do not modify any existing hook blocks
  - Do not change timeout values of other hooks

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding a JSON block to an existing config file
  - **Skills**: []
    - No special skills needed for JSON editing
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not code, just JSON config

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `hooks/hooks.json:1-54` — Full file. The PostToolUse block goes after line 52 (`]` closing Stop). Follow the exact structure of existing blocks (PreToolUse on lines 4-16 for format reference).
  - `hooks/hooks.json:41-52` — Stop block: The new PostToolUse block is inserted immediately after this block's closing `]`, with a comma separator.

  **Documentation References**:
  - Claude Code hooks documentation: PostToolUse receives `{ tool_name, tool_input, tool_result }` on stdin

  **Acceptance Criteria**:

  ```bash
  # Validate JSON syntax:
  node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json', 'utf-8')); console.log('VALID')"
  # Assert: Output is "VALID"
  ```

  ```bash
  # Verify PostToolUse block exists:
  node -e "
    var h = JSON.parse(require('fs').readFileSync('hooks/hooks.json', 'utf-8'));
    console.log(Array.isArray(h.hooks.PostToolUse));
    console.log(h.hooks.PostToolUse[0].hooks[0].command.includes('tool-tracker.mjs'));
  "
  # Assert: Output is "true\ntrue"
  ```

  ```bash
  # Verify PostToolUse comes after Stop in file order:
  node -e "
    var content = require('fs').readFileSync('hooks/hooks.json', 'utf-8');
    var stopIdx = content.indexOf('\"Stop\"');
    var postIdx = content.indexOf('\"PostToolUse\"');
    console.log(postIdx > stopIdx);
  "
  # Assert: Output is "true"
  ```

  ```bash
  # Verify all existing blocks still present:
  node -e "
    var h = JSON.parse(require('fs').readFileSync('hooks/hooks.json', 'utf-8'));
    console.log('PreToolUse' in h.hooks);
    console.log('UserPromptSubmit' in h.hooks);
    console.log('SessionStart' in h.hooks);
    console.log('Stop' in h.hooks);
    console.log('PostToolUse' in h.hooks);
  "
  # Assert: All five lines are "true"
  ```

  **Commit**: YES
  - Message: `feat(hooks): hooks.json에 PostToolUse 도구 추적 훅 등록`
  - Files: `hooks/hooks.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf-8'))"`

---

- [ ] 5. Create `tests/v100/tool-tracker.test.mjs`

  **What to do**:
  - Create test file following `tests/v100/tracking.test.mjs` conventions
  - Use `node:test` (`test`, `describe`, `beforeEach`) and `node:assert`
  - Test suites:
    1. **`logToolUsage` tests**:
       - Skips logging when sessionId is null
       - Creates session directory if not exists
       - Writes valid JSONL entry with all expected fields
       - Truncates tool_result at 5000 chars
       - Truncates tool_input at 2000 chars
       - Silently handles write errors
    2. **`getToolUsageLog` tests**:
       - Returns empty array for non-existent session
       - Returns parsed entries from JSONL file
       - Filters by `since` timestamp
       - Filters by `toolName`
    3. **Hook contract tests** (if feasible with mock stdin):
       - Validates exit code 0 on valid input
       - Validates exit code 0 on malformed input (graceful error handling)
  - Use `tmpdir` from `os` for test file paths (avoid polluting real sessions)
  - Korean test descriptions following repo convention

  **Must NOT do**:
  - No optional chaining in test file
  - No external test dependencies (only node:test, node:assert, node:fs, node:os, node:path)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test file following established patterns
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Test patterns, ESM assertions
  - **Skills Evaluated but Omitted**:
    - `data-scientist`: Not data analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 4)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 3

  **References**:

  **Pattern References**:
  - `tests/v100/tracking.test.mjs:1-50` — Test file structure: imports, describe blocks, mock patterns
  - `tests/v100/tracking.test.mjs:6` — Import pattern: `import { test, describe, beforeEach, mock } from 'node:test'`

  **Test References**:
  - `tests/v100/tracking.test.mjs` — Overall test structure and assertion patterns
  - `src/tracking/call-logger.mjs:81-122` — `getSessionCalls` behavior to mirror in `getToolUsageLog` tests

  **Acceptance Criteria**:

  ```bash
  # Run tests:
  node --test tests/v100/tool-tracker.test.mjs
  # Assert: All tests pass (exit code 0)
  ```

  **Commit**: YES
  - Message: `test(tracking): 도구 사용 추적 유닛 테스트 추가`
  - Files: `tests/v100/tool-tracker.test.mjs`
  - Pre-commit: `node --test tests/v100/tool-tracker.test.mjs`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 + 2 | `feat(tracking): 도구 사용 추적 로거 모듈 추가` | `src/tracking/tool-tracker-logger.mjs`, `src/tracking/index.mjs` | `node -e "import './src/tracking/index.mjs'"` |
| 3 | `feat(hooks): PostToolUse 도구 사용 추적 훅 추가` | `hooks/tool-tracker.mjs` | `echo '{}' \| node hooks/tool-tracker.mjs` |
| 4 | `feat(hooks): hooks.json에 PostToolUse 도구 추적 훅 등록` | `hooks/hooks.json` | `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf-8'))"` |
| 5 | `test(tracking): 도구 사용 추적 유닛 테스트 추가` | `tests/v100/tool-tracker.test.mjs` | `node --test tests/v100/tool-tracker.test.mjs` |

---

## Success Criteria

### Verification Commands
```bash
# 1. All new files exist
ls -la hooks/tool-tracker.mjs src/tracking/tool-tracker-logger.mjs tests/v100/tool-tracker.test.mjs

# 2. hooks.json is valid and has PostToolUse
node -e "var h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf-8')); console.log(Object.keys(h.hooks).join(','))"
# Expected: PreToolUse,UserPromptSubmit,SessionStart,Stop,PostToolUse

# 3. Index re-exports work
node -e "import { logToolUsage, getToolUsageLog } from './src/tracking/index.mjs'; console.log('OK')"
# Expected: OK

# 4. Hook runs without error
echo '{"tool_name":"Bash","tool_input":{"command":"ls"},"tool_result":"file1\nfile2"}' | node hooks/tool-tracker.mjs
# Expected: exit code 0

# 5. Tests pass
node --test tests/v100/tool-tracker.test.mjs
# Expected: All pass

# 6. No optional chaining in any new file
grep -r '\?\.' hooks/tool-tracker.mjs src/tracking/tool-tracker-logger.mjs tests/v100/tool-tracker.test.mjs || echo "CLEAN"
# Expected: CLEAN
```

### Final Checklist
- [ ] All "Must Have" present (JSONL format, truncation, silent errors, Korean comments, var/const)
- [ ] All "Must NOT Have" absent (no `?.`, no `let` in hook, no HUD, no rotation, no non-zero exit)
- [ ] All tests pass
- [ ] hooks.json valid JSON with PostToolUse after Stop
- [ ] 4 atomic commits in correct dependency order
