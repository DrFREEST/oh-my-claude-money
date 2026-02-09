# P1-5 to P1-8: detect-handoff.mjs & persistent-mode.mjs Edits

## TL;DR

> **Quick Summary**: Apply 4 targeted edits (P1-5 through P1-8) to two hook files — updating cancel keywords, adding context-limit stop detection with early return, aligning state directory/file naming, and adding reinforcement counting with escape hatch (MAX=50).
> 
> **Deliverables**:
> - Updated cancel keywords in detect-handoff.mjs (adds `cancelomc`, `stopomc` at front)
> - New `isContextLimitStop(input)` function + early return in detect-handoff.mjs
> - State dir path `.omcm/state` → `.omc/state` in detect-handoff.mjs `saveModeState()`
> - Aligned STATE_FILES naming in persistent-mode.mjs to `*-state.json` + `swarm-summary.json`
> - State dir path `.omcm/state` → `.omc/state` in persistent-mode.mjs `STATE_DIR`
> - Added `writeFileSync`/`mkdirSync` imports in persistent-mode.mjs
> - Reinforcement count (MAX=50) + auto-deactivate escape hatch in persistent-mode.mjs
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves (file-level independence)
> **Critical Path**: Agent A (Tasks 1→2→3) ‖ Agent B (Tasks 4→5→6) → Task 7 (verify)

---

## Context

### Original Request
Apply user-specified edits P1-5 through P1-8 to `detect-handoff.mjs` and `persistent-mode.mjs`. All edits use the Edit tool (not apply_patch). No additional scope.

### File Targets
| File | Path | Lines |
|------|------|-------|
| detect-handoff.mjs | `/opt/oh-my-claude-money/src/hooks/detect-handoff.mjs` | 430 |
| persistent-mode.mjs | `/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs` | 190 |

### Research Findings (verified ground truth)
1. **Cancel keywords** (line 43): Currently `['cancel', 'stop', 'abort', '취소', '중지']`
2. **detect-handoff.mjs** already imports `writeFileSync`/`mkdirSync` (line 10) — no import change needed
3. **detect-handoff.mjs `saveModeState()`**: Filenames ALREADY use `*-state.json` (lines 161, 173). But state dir path is `.omcm/state` (line 154) — needs change to `.omc/state`
4. **persistent-mode.mjs** (line 11): Only imports `{ readFileSync, existsSync }` — needs `writeFileSync`, `mkdirSync`
5. **persistent-mode.mjs STATE_FILES** (lines 21-31): Uses OLD naming (`ralph.json`, `autopilot.json`, etc.)
6. **persistent-mode.mjs STATE_DIR** (line 19): Uses `.omcm/state` — needs change to `.omc/state` for consistency
7. **`swarm-summary.json`**: Does NOT exist anywhere in codebase yet — forward-declared per user request
8. **`reinforcement_count`** field: Read by `mode-detector.mjs` (line 236) using snake_case

### Metis Review
**Identified Gaps** (all resolved):
- **State dir path mismatch**: Both files write/read `.omcm/state`; user wants `.omc/state` — RESOLVED: change both
- **Filename naming already done in detect-handoff.mjs**: Lines 161/173 already use `*-state.json` — RESOLVED: only path change needed there
- **swarm-summary.json orphan**: User explicitly wants it as forward-declaration — RESOLVED: include
- **Snake_case field name**: `reinforcement_count` must match mode-detector.mjs — ENFORCED
- **Import style**: Must use `'fs'` (not `'node:fs'`) — ENFORCED

### All Decisions Resolved

| # | Decision | Resolution |
|---|----------|------------|
| 1 | P1-5 cancel keywords | `['cancelomc', 'stopomc', 'cancel', 'stop', 'abort', '취소', '중지']` — specific keywords first |
| 2 | P1-6 function details | `isContextLimitStop(input)` — checks `stop_reason`/`reason` for 6 trigger strings; early return immediately after `readStdin()` |
| 3 | P1-7 detect-handoff.mjs scope | Change `.omcm/state` → `.omc/state` in `saveModeState()`. Filenames already correct. |
| 4 | P1-7 swarm-summary.json | Include as `swarmSummary: 'swarm-summary.json'` in STATE_FILES |
| 5 | P1-8 reinforcement details | MAX=50, increment per active mode in `main()`, auto-deactivate: `active=false, deactivatedReason='max_reinforcements_exceeded', deactivatedAt=ISO` |

### Defaults Applied (auto-resolved)
- **persistent-mode.mjs STATE_DIR path**: Also changed `.omcm/state` → `.omc/state` to match detect-handoff.mjs. Without this, persistent-mode.mjs reads from `.omcm/state` while detect-handoff.mjs writes to `.omc/state` — complete desync. Override if this is not desired.

---

## Work Objectives

### Core Objective
Apply exactly 4 edits (P1-5 through P1-8) to two files, preserving all existing behavior.

### Concrete Deliverables
- detect-handoff.mjs: Updated cancel keywords list (P1-5)
- detect-handoff.mjs: New `isContextLimitStop(input)` function + early return in `main()` (P1-6)
- detect-handoff.mjs: State dir path `.omcm/state` → `.omc/state` in `saveModeState()` (P1-7)
- persistent-mode.mjs: STATE_DIR path `.omcm/state` → `.omc/state` (P1-7)
- persistent-mode.mjs: STATE_FILES values renamed to `*-state.json` + `swarmSummary` entry (P1-7)
- persistent-mode.mjs: `writeFileSync`/`mkdirSync` added to imports (P1-8)
- persistent-mode.mjs: Reinforcement count + escape hatch in `main()` (P1-8)

### Definition of Done
- [ ] `node --check detect-handoff.mjs` → exit 0
- [ ] `node --check persistent-mode.mjs` → exit 0
- [ ] `npm test` → all tests pass
- [ ] `grep -c '\-state\.json' persistent-mode.mjs` → ≥ 9
- [ ] `grep 'writeFileSync' persistent-mode.mjs` → found in import line
- [ ] `grep 'reinforcement_count' persistent-mode.mjs` → found
- [ ] `grep 'cancelomc' detect-handoff.mjs` → found
- [ ] `grep 'isContextLimitStop' detect-handoff.mjs` → found
- [ ] `grep '.omc/state' detect-handoff.mjs` → found (not `.omcm/state`)
- [ ] `grep '.omc/state' persistent-mode.mjs` → found (not `.omcm/state`)

### Must Have
- All edits applied using Edit tool (not Write/apply_patch)
- Existing functionality preserved
- Field name `reinforcement_count` (snake_case) matching mode-detector.mjs
- MAX_REINFORCEMENTS = 50
- Cancel keywords in exact order: `['cancelomc', 'stopomc', 'cancel', 'stop', 'abort', '취소', '중지']`

### Must NOT Have (Guardrails)
- ❌ No changes to files other than the two targets
- ❌ No "while we're here" refactoring of surrounding code
- ❌ No added error logging (preserve silent catch pattern)
- ❌ No added validation/type-checking beyond existing patterns
- ❌ No new JSDoc comments unless part of the user's spec
- ❌ No `'node:fs'` — use `'fs'` per existing import style
- ❌ No camelCase `reinforcementCount` — must be snake_case `reinforcement_count`

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (npm test, 361+ tests)
- **User wants tests**: NO (hook files without dedicated unit tests)
- **QA approach**: Automated syntax check + grep assertions + regression test suite

### Automated Verification

```bash
# 1. Syntax check both files
node --check /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
# Assert: exit code 0

node --check /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
# Assert: exit code 0

# 2. P1-5: Cancel keywords updated
grep "'cancelomc'" /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
# Assert: Found

# 3. P1-6: isContextLimitStop function exists
grep -c 'isContextLimitStop' /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
# Assert: ≥2 (definition + call in main)

# 4. P1-7: State dir path changed
grep "\.omc/state" /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs | grep -v "\.omcm"
# Assert: Found
grep "\.omc/state" /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs | grep -v "\.omcm"
# Assert: Found

# 5. P1-7: State file naming aligned in persistent-mode.mjs
grep -c '\-state\.json' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
# Assert: ≥9

# 6. P1-7: No old-style names remain in persistent-mode.mjs STATE_FILES
node -e "
  const fs = require('fs');
  const c = fs.readFileSync('/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs','utf-8');
  const old = c.match(/: '(ralph|autopilot|ultrawork|ecomode|hulw|pipeline|ultrapilot|ultraqa)\.json'/g);
  console.log('Old-style remaining:', old ? old.length : 0);
"
# Assert: 0

# 7. P1-7: swarm-summary.json present
grep 'swarm-summary' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
# Assert: Found

# 8. P1-8: Imports present
head -15 /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs | grep 'writeFileSync'
# Assert: Found
head -15 /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs | grep 'mkdirSync'
# Assert: Found

# 9. P1-8: reinforcement_count (snake_case, NOT camelCase)
grep 'reinforcement_count' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
# Assert: ≥1 match
grep 'reinforcementCount' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
# Assert: 0 matches

# 10. P1-8: MAX_REINFORCEMENTS constant
grep 'MAX_REINFORCEMENTS.*50\|50.*MAX_REINFORCEMENTS' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
# Assert: Found

# 11. Regression: Full test suite
cd /opt/oh-my-claude-money && npm test
# Assert: All existing tests pass
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 2 agents, 1 per file):
├── Agent A (detect-handoff.mjs): Tasks 1 → 2 → 3 (sequential, same file)
└── Agent B (persistent-mode.mjs): Tasks 4 → 5 → 6 (sequential, same file)

Wave 2 (After Wave 1):
└── Task 7: Verification (syntax + grep + npm test)

Critical Path: Max(Agent A, Agent B) → Task 7
Parallel Speedup: ~50% (2 files edited simultaneously)
```

### Dependency Matrix

| Task | File | Depends On | Blocks | Parallelize With |
|------|------|------------|--------|------------------|
| 1 (P1-5) | detect-handoff.mjs | None | 7 | 4, 5, 6 |
| 2 (P1-6) | detect-handoff.mjs | After 1 (same file) | 7 | 4, 5, 6 |
| 3 (P1-7a) | detect-handoff.mjs | After 2 (same file) | 7 | 4, 5, 6 |
| 4 (P1-7b) | persistent-mode.mjs | None | 7 | 1, 2, 3 |
| 5 (P1-7c) | persistent-mode.mjs | After 4 (same file) | 7 | 1, 2, 3 |
| 6 (P1-8) | persistent-mode.mjs | After 5 (same file) | 7 | 1, 2, 3 |
| 7 (Verify) | Both | 1-6 all | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Agent |
|------|-------|-------|
| 1A | 1, 2, 3 | `delegate_task(category="quick")` for detect-handoff.mjs |
| 1B | 4, 5, 6 | `delegate_task(category="quick")` for persistent-mode.mjs |
| 2 | 7 | `delegate_task(category="quick")` for verification |

---

## TODOs

### Agent A: detect-handoff.mjs (Tasks 1, 2, 3)

---

- [ ] 1. P1-5: Update cancel keywords in detect-handoff.mjs

  **What to do**:
  - Use Edit tool on `/opt/oh-my-claude-money/src/hooks/detect-handoff.mjs`
  - In the `loadUtils()` fallback config (line 43), replace the cancel keywords array
  - **oldString**: `cancel: ['cancel', 'stop', 'abort', '취소', '중지'],`
  - **newString**: `cancel: ['cancelomc', 'stopomc', 'cancel', 'stop', 'abort', '취소', '중지'],`

  **Must NOT do**:
  - Do not change any other keyword arrays (ecomode line 41, ralph line 42)
  - Do not touch the `keywords` array at line 39 (handoff keywords — different purpose)
  - Do not reformat surrounding code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line array replacement, trivial edit
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: Commit happens at end of Agent A work, not per-task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6)
  - **Parallel Group**: Wave 1A — first task in Agent A sequence
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `src/hooks/detect-handoff.mjs:37-46` — The `loadUtils()` fallback config block. Lines 41-44 contain the `modeKeywords` object. Line 43 is the EXACT edit target: `cancel: ['cancel', 'stop', 'abort', '취소', '중지']`. The executor should match the FULL line including trailing comma for a clean Edit.
  - `src/hooks/detect-handoff.mjs:133-147` — `detectModeKeyword()` function that consumes the cancel keywords. It iterates `modeKeywords` entries and does case-insensitive `includes()` matching. No change needed here, but executor should understand that keyword ORDER matters for first-match behavior — specific keywords (`cancelomc`, `stopomc`) must come before their substrings (`cancel`, `stop`).

  **WHY Each Reference Matters**:
  - Line 43 reference: The executor needs the exact string to construct the Edit `oldString`. Getting even one character wrong (e.g., missing comma) will cause Edit tool failure.
  - Lines 133-147 reference: Understanding the consumption pattern confirms keyword ordering matters — `cancel` is a substring of `cancelomc`, so if `cancel` appeared first, `cancelomc` would never be matched distinctly. The user's specified order (specific-first) is correct.

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep "cancelomc" /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: Found (new keyword present)

  grep "stopomc" /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: Found (new keyword present)

  node --check /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: exit code 0
  ```

  **Commit**: NO (groups with Tasks 2+3 at end of Agent A)

---

- [ ] 2. P1-6: Add `isContextLimitStop(input)` function + early return in detect-handoff.mjs

  **What to do**:
  Two Edit operations on `/opt/oh-my-claude-money/src/hooks/detect-handoff.mjs`:

  **Edit 2a — Add new function** (after `detectDelegationPattern()`, before `main()`):
  - Insert new function between the end of `detectDelegationPattern()` (line 290: `return null;` + closing `}`) and the `// 메인` section comment (line 292-294)
  - **oldString** (the seam between functions):
    ```
    // =============================================================================
    // 메인
    // =============================================================================
    ```
  - **newString** — insert the new function BEFORE the main comment block:
    ```
    // =============================================================================
    // 컨텍스트 리밋 정지 감지 (교착 상태 방지)
    // =============================================================================

    /**
     * Stop 이벤트에서 context limit으로 인한 정지인지 감지
     * @param {object} input - stdin에서 읽은 JSON
     * @returns {boolean} context limit 정지 여부
     */
    function isContextLimitStop(input) {
      if (!input) return false;

      const stopReasons = ['context_limit', 'context_window', 'token_limit', 'max_tokens', 'compaction', 'context_exhausted'];
      const reason = (input.stop_reason || input.reason || '').toLowerCase();

      return stopReasons.some(r => reason.includes(r));
    }

    // =============================================================================
    // 메인
    // =============================================================================
    ```

  **Edit 2b — Add early return in `main()`**:
  - Insert immediately AFTER `readStdin()` and the empty-input check, BEFORE JSON parsing
  - **oldString** (lines 300-307 in main):
    ```
        const rawInput = await readStdin();

        if (!rawInput.trim()) {
          console.log(JSON.stringify({ continue: true }));
          process.exit(0);
        }

        const input = JSON.parse(rawInput);
    ```
  - **newString**:
    ```
        const rawInput = await readStdin();

        if (!rawInput.trim()) {
          console.log(JSON.stringify({ continue: true }));
          process.exit(0);
        }

        const input = JSON.parse(rawInput);

        // 컨텍스트 리밋 정지 시 즉시 통과 (교착 상태 방지)
        if (isContextLimitStop(input)) {
          console.log(JSON.stringify({ continue: true }));
          process.exit(0);
        }
    ```

  **Must NOT do**:
  - Do not reorder existing checks in `main()` beyond inserting the early return
  - Do not modify `detectModeKeyword()`, `detectKeyword()`, or `detectDelegationPattern()`
  - Do not add new imports (detect-handoff.mjs already has all needed imports at line 10)
  - Do not add error logging in the new function (follow existing silent pattern)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Add one function definition + one guard clause; well-defined edits
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6)
  - **Parallel Group**: Wave 1A — second task in Agent A sequence
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: Task 1 (same file, sequential)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/hooks/detect-handoff.mjs:252-290` — `detectDelegationPattern()` function. The new `isContextLimitStop()` should be placed AFTER this function and BEFORE the `// 메인` comment. Shows the pattern: function takes input, returns a result, uses simple string matching.
  - `src/hooks/detect-handoff.mjs:292-294` — The `// 메인` section comment block. This is the seam where the new function is inserted (Edit 2a oldString target).
  - `src/hooks/detect-handoff.mjs:300-307` — The `readStdin()` call and empty-input guard in `main()`. The early return is inserted AFTER `JSON.parse(rawInput)` (Edit 2b). The pattern follows the existing early-exit style: `console.log(JSON.stringify({ continue: true })); process.exit(0);`
  - `src/hooks/detect-handoff.mjs:228-241` — `getSessionInputTokens()` as style reference for a small utility function with a try/catch and default return.

  **Cross-Reference** (related but DO NOT modify):
  - `src/orchestrator/context-limit-handler.mjs` — Worker-level context limit recovery (DIFFERENT concern). P1-6 is hook-level stop detection. Do not confuse or merge.

  **WHY Each Reference Matters**:
  - Lines 292-294: The EXACT `oldString` for Edit 2a. The executor must match this comment block character-for-character.
  - Lines 300-307: The EXACT `oldString` for Edit 2b. The executor needs the full block from `const rawInput` through `const input = JSON.parse(rawInput);` to anchor the edit correctly.
  - `detectDelegationPattern()` pattern: Shows the coding style for helper functions — `var` for internal variables, simple string matching, null/false returns.

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -c 'isContextLimitStop' /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: ≥ 2 (function definition + call in main)

  grep 'context_limit' /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: Found (trigger string in function body)

  grep 'context_exhausted' /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: Found (last trigger string present — confirms full list)

  node --check /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: exit code 0
  ```

  **Commit**: NO (groups with Tasks 1+3 at end of Agent A)

---

- [ ] 3. P1-7a: Change state dir path in detect-handoff.mjs `saveModeState()`

  **What to do**:
  - Use Edit tool on `/opt/oh-my-claude-money/src/hooks/detect-handoff.mjs`
  - **oldString**: `const stateDir = join(homedir(), '.omcm/state');`
  - **newString**: `const stateDir = join(homedir(), '.omc/state');`
  - NOTE: The filename convention (`*-state.json`) is ALREADY correct on lines 161 and 173. Only the directory path changes.

  **Must NOT do**:
  - Do not change the filenames on lines 161 or 173 (they already use `*-state.json`)
  - Do not change any other path in the file (e.g., the `fusionStatePath` on line 230 uses `.omcm` and is a different concern — fusion state, not mode state)
  - Do not change the `handoffDir` path on line 199

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single string replacement
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5, 6)
  - **Parallel Group**: Wave 1A — third task in Agent A sequence
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: Task 2 (same file, sequential)

  **References**:

  **Pattern References**:
  - `src/hooks/detect-handoff.mjs:154` — EXACT edit target: `const stateDir = join(homedir(), '.omcm/state');`
  - `src/hooks/detect-handoff.mjs:161` — `${mode}-state.json` — confirm this is ALREADY correct (do not touch)
  - `src/hooks/detect-handoff.mjs:173` — `${m}-state.json` — confirm this is ALREADY correct (do not touch)
  - `src/hooks/detect-handoff.mjs:230` — `fusionStatePath` using `.omcm` — this is a DIFFERENT state file for fusion tracking, do NOT change

  **AMBIGUITY FLAG**:
  - `src/hooks/detect-handoff.mjs:230` uses `'.omcm', 'fusion-state.json'` for a completely different purpose (fusion state tracking). The user's directive applies only to mode state (`saveModeState`), not fusion state. If executor is unsure, leave line 230 untouched.

  **WHY Each Reference Matters**:
  - Line 154: The exact oldString. Only one occurrence of `.omcm/state` in `saveModeState()`, so this is unambiguous.
  - Lines 161/173: Executor must verify these are already `*-state.json` and NOT edit them. Prevents duplicate work.
  - Line 230: Explicitly called out as a DO-NOT-TOUCH to prevent scope creep. The executor might see `.omcm` and think "fix this too" — NO.

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep "\.omc/state" /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs | head -1
  # Assert: Found (new path present in saveModeState)

  # Verify fusion-state path NOT changed
  grep "\.omcm.*fusion-state" /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: Still found (line 230 untouched)

  node --check /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
  # Assert: exit code 0
  ```

  **Commit**: YES (Agent A final commit for Tasks 1+2+3)
  - Message: `fix(hooks): update cancel keywords, add context-limit stop detection, align state dir path`
  - Files: `src/hooks/detect-handoff.mjs`
  - Pre-commit: `node --check src/hooks/detect-handoff.mjs`

---

### Agent B: persistent-mode.mjs (Tasks 4, 5, 6)

---

- [ ] 4. P1-7b: Change STATE_DIR path in persistent-mode.mjs

  **What to do**:
  - Use Edit tool on `/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs`
  - **oldString**: `const STATE_DIR = join(homedir(), '.omcm/state');`
  - **newString**: `const STATE_DIR = join(homedir(), '.omc/state');`

  **Must NOT do**:
  - Do not change any other paths in the file
  - Do not modify `checkActiveStates()` function logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single string replacement
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 3)
  - **Parallel Group**: Wave 1B — first task in Agent B sequence
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/hooks/persistent-mode.mjs:19` — EXACT edit target: `const STATE_DIR = join(homedir(), '.omcm/state');`
  - `src/hooks/detect-handoff.mjs:154` — Task 3 changes this to `.omc/state` too; confirms consistency

  **WHY Each Reference Matters**:
  - Line 19: The exact oldString for Edit. Unambiguous — only one `STATE_DIR` definition.
  - detect-handoff.mjs:154: Cross-reference to confirm both files will use the same path after edits.

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep "\.omc/state" /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: Found

  grep "\.omcm/state" /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: NOT found (old path removed)

  node --check /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: exit code 0
  ```

  **Commit**: NO (groups with Tasks 5+6 at end of Agent B)

---

- [ ] 5. P1-7c: Align STATE_FILES naming to `*-state.json` + add `swarm-summary.json`

  **What to do**:
  - Use Edit tool on `/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs`
  - Replace the ENTIRE `STATE_FILES` object (lines 21-31)
  - **oldString**:
    ```
    const STATE_FILES = {
      ralph: 'ralph.json',
      autopilot: 'autopilot.json',
      ultrawork: 'ultrawork.json',
      ecomode: 'ecomode.json',
      hulw: 'hulw.json',
      swarm: 'swarm.json',
      pipeline: 'pipeline.json',
      ultrapilot: 'ultrapilot.json',
      ultraqa: 'ultraqa.json',
    };
    ```
  - **newString**:
    ```
    const STATE_FILES = {
      ralph: 'ralph-state.json',
      autopilot: 'autopilot-state.json',
      ultrawork: 'ultrawork-state.json',
      ecomode: 'ecomode-state.json',
      hulw: 'hulw-state.json',
      swarm: 'swarm-state.json',
      swarmSummary: 'swarm-summary.json',
      pipeline: 'pipeline-state.json',
      ultrapilot: 'ultrapilot-state.json',
      ultraqa: 'ultraqa-state.json',
    };
    ```

  **Must NOT do**:
  - Do not change `STATE_DIR` (handled by Task 4)
  - Do not modify `checkActiveStates()` logic (it iterates `STATE_FILES` — the iteration still works)
  - Do not modify `checkVerificationStatus()`
  - Do not add modes not in the current list (beyond `swarmSummary`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Object literal value replacement, mechanical edit
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 3)
  - **Parallel Group**: Wave 1B — second task in Agent B sequence
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: Task 4 (same file, sequential)

  **References**:

  **Pattern References**:
  - `src/hooks/persistent-mode.mjs:21-31` — EXACT edit target: the full STATE_FILES object. The executor must match the ENTIRE object block for a clean single Edit.
  - `src/utils/state-manager.mjs:22-29` — **Canonical naming convention** to match:
    ```
    ULTRAWORK: 'ultrawork-state.json',
    RALPH: 'ralph-state.json',
    AUTOPILOT: 'autopilot-state.json',
    ECOMODE: 'ecomode-state.json',
    SWARM: 'swarm-state.json',
    PIPELINE: 'pipeline-state.json',
    ULTRAQA: 'ultraqa-state.json',
    ```
    Note: `hulw` and `ultrapilot` appear in persistent-mode but NOT in state-manager. Use the `-state.json` pattern consistently.
  - `src/hud/mode-detector.mjs:41-90` — Also uses `*-state.json` naming. Confirms convention.

  **WHY Each Reference Matters**:
  - Lines 21-31: The full oldString block. Executor must include the opening `const STATE_FILES = {` and closing `};` for a clean replacement.
  - state-manager.mjs: Confirms the exact filenames to use. Executor should NOT invent names — match this source.
  - mode-detector.mjs: Secondary confirmation that `-state.json` is the universal convention.

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -c '\-state\.json' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: ≥ 9

  # No old-style names
  node -e "
    const fs = require('fs');
    const c = fs.readFileSync('/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs','utf-8');
    const old = c.match(/: '(ralph|autopilot|ultrawork|ecomode|hulw|pipeline|ultrapilot|ultraqa)\.json'/g);
    console.log('Old-style:', old ? old.length : 0);
  "
  # Assert: "Old-style: 0"

  grep 'swarm-summary' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: Found

  node --check /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: exit code 0
  ```

  **Commit**: NO (groups with Tasks 4+6 at end of Agent B)

---

- [ ] 6. P1-8: Add fs imports + reinforcement count with escape hatch in persistent-mode.mjs

  **What to do**:
  Two Edit operations on `/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs`:

  **Edit 6a — Add imports** (line 11):
  - **oldString**: `import { readFileSync, existsSync } from 'fs';`
  - **newString**: `import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';`

  **Edit 6b — Add reinforcement logic in `main()`**:
  - Insert reinforcement counting + escape hatch logic in `main()`, AFTER `activeModes` is computed (after line 123: `const activeModes = checkActiveStates();`) and BEFORE the early-exit check (`if (activeModes.length === 0)`)
  - **oldString** (lines 123-129):
    ```
        const activeModes = checkActiveStates();

        // 활성 모드가 없으면 정상 종료 허용
        if (activeModes.length === 0) {
          console.log(JSON.stringify({ continue: true }));
          process.exit(0);
        }
    ```
  - **newString**:
    ```
        const activeModes = checkActiveStates();

        // 강화 카운트 증가 + 탈출 해치 (MAX_REINFORCEMENTS = 50)
        const MAX_REINFORCEMENTS = 50;
        for (const am of activeModes) {
          try {
            const statePath = join(STATE_DIR, STATE_FILES[am.mode]);
            if (statePath && existsSync(statePath)) {
              const current = JSON.parse(readFileSync(statePath, 'utf-8'));
              current.reinforcement_count = (current.reinforcement_count || 0) + 1;
              if (current.reinforcement_count > MAX_REINFORCEMENTS) {
                current.active = false;
                current.deactivatedReason = 'max_reinforcements_exceeded';
                current.deactivatedAt = new Date().toISOString();
              }
              writeFileSync(statePath, JSON.stringify(current, null, 2));
            }
          } catch (e) {
            // 무시
          }
        }

        // 탈출 해치 후 활성 모드 재확인
        const stillActiveModes = checkActiveStates();

        // 활성 모드가 없으면 정상 종료 허용
        if (stillActiveModes.length === 0) {
          console.log(JSON.stringify({ continue: true }));
          process.exit(0);
        }
    ```
  - NOTE: After the reinforcement loop, some modes may have been deactivated. Must re-check active states before the early-exit. The rest of the function (ralph check, other modes) should then use `stillActiveModes` instead of `activeModes`.

  **Edit 6c — Update remaining references from `activeModes` to `stillActiveModes`**:
  - After Edit 6b, the `main()` function still references `activeModes` in the ralph check and other-modes section. These must change to `stillActiveModes`:
  - **oldString** (line 132, after Edit 6b has been applied):
    ```
        // ralph 모드 검사 (가장 중요)
        const ralphMode = activeModes.find((m) => m.mode === 'ralph');
    ```
  - **newString**:
    ```
        // ralph 모드 검사 (가장 중요)
        const ralphMode = stillActiveModes.find((m) => m.mode === 'ralph');
    ```

  - **oldString** (line 160, after edits):
    ```
        // 다른 활성 모드들에 대한 알림
        const otherModes = activeModes.filter((m) => m.mode !== 'ralph');
    ```
  - **newString**:
    ```
        // 다른 활성 모드들에 대한 알림
        const otherModes = stillActiveModes.filter((m) => m.mode !== 'ralph');
    ```

  **Must NOT do**:
  - Do not use `'node:fs'` — must use `'fs'`
  - Do not use camelCase `reinforcementCount` — must be snake_case `reinforcement_count`
  - Do not add error logging beyond the silent `catch (e) { // 무시 }` pattern
  - Do not modify `checkVerificationStatus()` logic
  - Do not modify `checkActiveStates()` function (the reinforcement logic goes in `main()`)
  - Do not change the ralph-specific or other-modes message formatting

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Import edit + scoped logic insertion, well-defined
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 3)
  - **Parallel Group**: Wave 1B — third task in Agent B sequence
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: Task 5 (same file, sequential)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/hooks/persistent-mode.mjs:11` — EXACT import edit target for Edit 6a. Currently `import { readFileSync, existsSync } from 'fs';`
  - `src/hooks/detect-handoff.mjs:10` — Reference for correct expanded import style: `import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';`
  - `src/hooks/persistent-mode.mjs:118-129` — `main()` function start through `checkActiveStates()` and early-exit check. This is the Edit 6b oldString region.
  - `src/hooks/persistent-mode.mjs:63-88` — `checkActiveStates()` function. Reads state files and builds `activeModes` array with `{ mode, state, startedAt, iterations }`. The reinforcement logic operates on the same state objects and writes back to the same files.
  - `src/hooks/persistent-mode.mjs:66-67` — `for (const [mode, filename] of Object.entries(STATE_FILES))` — shows how STATE_FILES keys map to filenames. The reinforcement loop uses `STATE_FILES[am.mode]` to resolve the filename.
  - `src/hooks/persistent-mode.mjs:132` — `const ralphMode = activeModes.find(...)` — Edit 6c target, change to `stillActiveModes`
  - `src/hooks/persistent-mode.mjs:160` — `const otherModes = activeModes.filter(...)` — Edit 6c target, change to `stillActiveModes`

  **Cross-Reference (must match field name)**:
  - `src/hud/mode-detector.mjs:236` — Reads `state.reinforcement_count` (snake_case). P1-8 writes this exact field name.

  **WHY Each Reference Matters**:
  - Line 11: Exact oldString for Edit 6a. Must match precisely.
  - Lines 118-129: Exact oldString for Edit 6b. The executor needs the full block from `const activeModes` through the early-exit `process.exit(0)` + closing `}`.
  - Lines 63-88: Shows `checkActiveStates()` return shape — the reinforcement loop's `am.mode` must exist in the returned objects.
  - Lines 66-67: Confirms `STATE_FILES[am.mode]` will resolve correctly since `am.mode` matches STATE_FILES keys (ralph, autopilot, etc.).
  - Lines 132 and 160: Edit 6c targets. After inserting the reinforcement loop, the downstream code must use `stillActiveModes` instead of `activeModes` to reflect any deactivations.
  - mode-detector.mjs:236: Proves the field name MUST be `reinforcement_count` (snake_case). If the executor uses camelCase, mode-detector will not read the value.

  **Acceptance Criteria**:

  ```bash
  # Agent runs:

  # Verify imports
  head -15 /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs | grep 'writeFileSync'
  # Assert: Found
  head -15 /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs | grep 'mkdirSync'
  # Assert: Found

  # Verify reinforcement_count (snake_case)
  grep 'reinforcement_count' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: ≥ 2 matches (read + write)

  # Verify NO camelCase variant
  grep 'reinforcementCount' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: 0 matches

  # Verify MAX_REINFORCEMENTS = 50
  grep 'MAX_REINFORCEMENTS.*50' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: Found

  # Verify deactivation fields
  grep 'max_reinforcements_exceeded' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: Found
  grep 'deactivatedAt' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: Found

  # Verify stillActiveModes used downstream
  grep 'stillActiveModes' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: ≥ 3 matches (definition + ralph find + otherModes filter)

  node --check /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
  # Assert: exit code 0
  ```

  **Commit**: YES (Agent B final commit for Tasks 4+5+6)
  - Message: `fix(hooks): align state paths and file naming, add reinforcement escape hatch (MAX=50)`
  - Files: `src/hooks/persistent-mode.mjs`
  - Pre-commit: `node --check src/hooks/persistent-mode.mjs`

---

### Wave 2: Verification

---

- [ ] 7. Verification: Full syntax check + grep assertions + regression test

  **What to do**:
  - Run ALL acceptance criteria from Tasks 1-6
  - Run `node --check` on both files
  - Run `npm test` for full regression

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Run verification commands only
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all prior tasks)
  - **Parallel Group**: Wave 2
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6

  **References**: None (verification only)

  **Acceptance Criteria**:

  ```bash
  # === SYNTAX ===
  node --check /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs && echo "PASS" || echo "FAIL"
  node --check /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs && echo "PASS" || echo "FAIL"

  # === P1-5: Cancel keywords ===
  grep "'cancelomc'" /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs && echo "P1-5 PASS" || echo "P1-5 FAIL"

  # === P1-6: Context limit function ===
  COUNT=$(grep -c 'isContextLimitStop' /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs)
  [ "$COUNT" -ge 2 ] && echo "P1-6 PASS ($COUNT)" || echo "P1-6 FAIL ($COUNT)"

  # === P1-7: State paths ===
  grep "\.omc/state" /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs | grep -v "\.omcm" && echo "P1-7a PASS" || echo "P1-7a FAIL"
  grep "\.omc/state" /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs | grep -v "\.omcm" && echo "P1-7b PASS" || echo "P1-7b FAIL"

  # === P1-7: State file naming ===
  STATE_COUNT=$(grep -c '\-state\.json' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs)
  [ "$STATE_COUNT" -ge 9 ] && echo "P1-7c PASS ($STATE_COUNT)" || echo "P1-7c FAIL ($STATE_COUNT)"
  grep 'swarm-summary' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs && echo "P1-7d PASS" || echo "P1-7d FAIL"

  # === P1-8: Imports ===
  head -15 /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs | grep 'writeFileSync.*mkdirSync\|mkdirSync.*writeFileSync' && echo "P1-8a PASS" || echo "P1-8a FAIL"

  # === P1-8: Reinforcement ===
  grep 'reinforcement_count' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs && echo "P1-8b PASS" || echo "P1-8b FAIL"
  grep 'MAX_REINFORCEMENTS.*50' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs && echo "P1-8c PASS" || echo "P1-8c FAIL"
  grep 'max_reinforcements_exceeded' /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs && echo "P1-8d PASS" || echo "P1-8d FAIL"

  # === REGRESSION ===
  cd /opt/oh-my-claude-money && npm test
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Tasks | Message | Files | Pre-commit |
|-------------|---------|-------|------------|
| 1 + 2 + 3 | `fix(hooks): update cancel keywords, add context-limit stop detection, align state dir path` | `src/hooks/detect-handoff.mjs` | `node --check src/hooks/detect-handoff.mjs` |
| 4 + 5 + 6 | `fix(hooks): align state paths and file naming, add reinforcement escape hatch (MAX=50)` | `src/hooks/persistent-mode.mjs` | `node --check src/hooks/persistent-mode.mjs` |

---

## Success Criteria

### Final Checklist
- [ ] All "Must Have" present (all P1-5 through P1-8 edits applied)
- [ ] All "Must NOT Have" absent (no scope creep, no wrong patterns)
- [ ] Both files parse cleanly (`node --check`)
- [ ] All tests pass (`npm test`)
- [ ] All 5 DECISIONS resolved ✅
