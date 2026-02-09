# Tool Counter + Read/Bash Optimizer Hooks

## TL;DR

> **Quick Summary**: Verify the existing tool-counter module at `src/utils/tool-counter.mjs`, the Read/Bash PreToolUse hook entry points at `hooks/read-optimizer.mjs` and `hooks/bash-optimizer.mjs`, and the hooks.json PreToolUse entries for Read + Bash after the Task entry. All 3 files and the hooks.json update already exist in the repo (committed). This plan validates correctness.
> 
> **Deliverables**:
> - `src/utils/tool-counter.mjs` — Shared tool counting module (EXISTS — verify)
> - `hooks/read-optimizer.mjs` — Read PreToolUse hook entry point (EXISTS — verify)
> - `hooks/bash-optimizer.mjs` — Bash PreToolUse hook entry point (EXISTS — verify)
> - `hooks/hooks.json` — Contains Read + Bash PreToolUse entries after Task (EXISTS — verify)
> 
> **Estimated Effort**: Short (~15 min agent work)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (verify files) ∥ Task 2 (verify hooks.json) → Task 3 (lsp diagnostics + regression)

---

## Context

### Original Request
Add tool counter + Read/Bash optimizer PreToolUse hooks and update hooks.json. Produce a precise plan with parallel task graph, verification (lsp diagnostics), and success criteria.

### Current State (Discovered During Planning)
**All files already exist and are committed** (commit `54114eb`). No file creation or editing is needed. The plan scope is **verification only**.

| File | Status | Lines |
|------|--------|-------|
| `src/utils/tool-counter.mjs` | Committed, 122 lines | Shared counter: session-based, `var` style, Korean JSDoc |
| `hooks/read-optimizer.mjs` | Committed, 76 lines | PreToolUse Read hook, imports `../src/utils/tool-counter.mjs` |
| `hooks/bash-optimizer.mjs` | Committed, 76 lines | PreToolUse Bash hook, imports `../src/utils/tool-counter.mjs` |
| `hooks/hooks.json` | Committed, 87 lines | 3 PreToolUse entries (Task, Read, Bash) + PostToolUse section added |

### User Decisions (Resolved)
1. **3 separate files**: `src/utils/tool-counter.mjs` (shared module), `hooks/read-optimizer.mjs`, `hooks/bash-optimizer.mjs`
2. **Timeout**: `5` seconds for Read and Bash hooks
3. **Allowed directories**: `src/utils/` and `hooks/` ONLY
4. **Excluded**: install.sh, uninstall.sh, docs, CHANGELOG, version bump — all OUT of scope

### Key Architecture Findings

**File Relationships:**
```
hooks/read-optimizer.mjs ──import──→ src/utils/tool-counter.mjs
hooks/bash-optimizer.mjs ──import──→ src/utils/tool-counter.mjs
hooks/read-optimizer.mjs ──import──→ src/utils/session-id.mjs (existing)
hooks/bash-optimizer.mjs ──import──→ src/utils/session-id.mjs (existing)
```

**Import Paths (relative from hooks/):**
- `'../src/utils/tool-counter.mjs'` — Counter module
- `'../src/utils/session-id.mjs'` — Session ID utility (pre-existing)

**hooks.json Structure (87 lines, 5 sections):**
```
PreToolUse[0] → Task  → fusion-router.mjs  (timeout: 120)
PreToolUse[1] → Read  → read-optimizer.mjs  (timeout: 5)
PreToolUse[2] → Bash  → bash-optimizer.mjs  (timeout: 5)
UserPromptSubmit → detect-handoff.mjs
SessionStart     → session-start.mjs
Stop             → persistent-mode.mjs
PostToolUse      → tool-tracker.mjs        (NEW — also discovered)
```

**Code Style (verified against existing files):**
- `src/utils/tool-counter.mjs`: `var` bindings, `function` declarations, Korean JSDoc, no optional chaining — ✅ matches project pattern for utility modules
- `hooks/read-optimizer.mjs`: `var` bindings, `function(resolve)` callback style, no optional chaining, shebang — ✅ matches `hooks/` entry point pattern
- `hooks/bash-optimizer.mjs`: Identical structure to read-optimizer — ✅ consistent

---

## Work Objectives

### Core Objective
Verify that the tool counter module and Read/Bash optimizer hooks are correctly implemented, properly wired in hooks.json, and pass lsp diagnostics with zero errors.

### Concrete Deliverables
1. Verification report for `src/utils/tool-counter.mjs` (lsp diagnostics + pattern compliance)
2. Verification report for `hooks/read-optimizer.mjs` (lsp diagnostics + pattern compliance)
3. Verification report for `hooks/bash-optimizer.mjs` (lsp diagnostics + pattern compliance)
4. Verification report for `hooks/hooks.json` (structure, entry order, timeouts)

### Definition of Done
- [ ] `hooks/hooks.json` is valid JSON with exactly 3 PreToolUse entries: Task, Read, Bash (in order)
- [ ] `src/utils/tool-counter.mjs` passes `node --check` and lsp_diagnostics with zero errors
- [ ] `hooks/read-optimizer.mjs` passes `node --check` and lsp_diagnostics with zero errors
- [ ] `hooks/bash-optimizer.mjs` passes `node --check` and lsp_diagnostics with zero errors
- [ ] `hooks/hooks.json` passes lsp_diagnostics with zero errors
- [ ] Read + Bash hooks import `../src/utils/tool-counter.mjs` (correct relative path)
- [ ] Read + Bash hooks have `timeout: 5` in hooks.json
- [ ] No optional chaining (`?.`) in any of the 3 .mjs files
- [ ] `hooks/fusion-router.mjs` is untouched (byte-identical to pre-plan state)
- [ ] Existing tests pass: `node --test tests/**/*.test.mjs`

### Must Have
- Zero lsp_diagnostics errors on all 4 files
- Correct import path from `hooks/*.mjs` → `src/utils/tool-counter.mjs`
- hooks.json Task entry unchanged at index 0
- hooks.json Read at index 1, Bash at index 2
- Graceful error handling: all hooks output `{ "allow": true }` on any error

### Must NOT Have (Guardrails)
- ❌ NO modification to any file (this is a verification-only plan)
- ❌ NO changes to `hooks/fusion-router.mjs`
- ❌ NO changes to `install.sh` or `uninstall.sh`
- ❌ NO changes outside `src/utils/` and `hooks/`
- ❌ NO CHANGELOG.md, docs/, or version bump

---

## Verification Strategy

### Approach
- **lsp_diagnostics** on all 4 target files (3 `.mjs` + 1 `.json`)
- **Automated command verification** for JSON validity, structure, syntax, and import paths
- **Regression test suite** to confirm no breakage
- **Pattern compliance check**: `var` bindings, no optional chaining, Korean comments, shebangs

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all independent):
├── Task 1: Verify 3 .mjs files (syntax, patterns, imports, lsp_diagnostics)
└── Task 2: Verify hooks.json structure (entries, order, timeouts, sections)

Wave 2 (After Wave 1):
└── Task 3: Regression tests + scope check + final lsp_diagnostics summary

Critical Path: Task 1 → Task 3
               Task 2 → Task 3
Parallel Speedup: Tasks 1 and 2 run simultaneously
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | None | None (final gate) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1, 2 | Two parallel `delegate_task(category="quick")` — independent verification |
| 2 | 3 | Single `delegate_task(category="quick")` — regression + summary |

---

## TODOs

- [ ] 1. Verify 3 New .mjs Files (Syntax, Patterns, Imports, lsp_diagnostics)

  **What to do**:
  - Run `node --check` on each of the 3 files
  - Run lsp_diagnostics on each file (severity="error")
  - Verify pattern compliance:
    - `var` bindings (not `const`/`let`) in hook entry points
    - No optional chaining (`?.`)
    - Korean JSDoc comments present
    - `#!/usr/bin/env node` shebang on hook entry points
    - try/catch with `{ "allow": true }` fallback in hooks
  - Verify import paths:
    - `hooks/read-optimizer.mjs` line 52: `import('../src/utils/tool-counter.mjs')` — path correct
    - `hooks/bash-optimizer.mjs` line 52: `import('../src/utils/tool-counter.mjs')` — path correct
    - `hooks/read-optimizer.mjs` line 43: `import('../src/utils/session-id.mjs')` — path correct
    - `hooks/bash-optimizer.mjs` line 43: `import('../src/utils/session-id.mjs')` — path correct
  - Verify `src/utils/tool-counter.mjs` exports:
    - `readCounters`, `writeCounters`, `recordToolCall`, `resetCounters` — all exported

  **Must NOT do**:
  - Do not modify any file
  - Do not create any file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read-only verification — syntax checks and lsp diagnostics
  - **Skills**: []
    - No specialized skills needed for running diagnostics
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Files to Verify**:
  - `src/utils/tool-counter.mjs:1-122` — Full file (shared counter module, 122 lines)
  - `hooks/read-optimizer.mjs:1-76` — Full file (Read PreToolUse hook, 76 lines)
  - `hooks/bash-optimizer.mjs:1-76` — Full file (Bash PreToolUse hook, 76 lines)

  **Pattern References** (style to verify against):
  - `hooks/fusion-router.mjs:1` — Shebang: `#!/usr/bin/env node`
  - `hooks/fusion-router.mjs:28-36` — `var` binding pattern
  - `hooks/fusion-router.mjs:206-209` — try/catch graceful fallback pattern
  - `src/utils/config.mjs` — Existing `src/utils/` module style (for tool-counter comparison)

  **Import Path Verification**:
  - From `hooks/read-optimizer.mjs`, the path `'../src/utils/tool-counter.mjs'` resolves to `<repo>/src/utils/tool-counter.mjs` — ✅ correct
  - From `hooks/bash-optimizer.mjs`, same path — ✅ correct

  **Acceptance Criteria**:

  ```bash
  # A1. Syntax valid for all 3 files
  node --check src/utils/tool-counter.mjs && echo "tool-counter:OK"
  node --check hooks/read-optimizer.mjs && echo "read-optimizer:OK"
  node --check hooks/bash-optimizer.mjs && echo "bash-optimizer:OK"
  # Assert: all 3 print "OK"

  # A2. Shebangs on hook entry points
  head -1 hooks/read-optimizer.mjs
  head -1 hooks/bash-optimizer.mjs
  # Assert: both output "#!/usr/bin/env node"
  # Note: src/utils/tool-counter.mjs is a library module — shebang NOT required

  # A3. No optional chaining in any file
  grep -n '\?\.' src/utils/tool-counter.mjs hooks/read-optimizer.mjs hooks/bash-optimizer.mjs || echo "NO_OPTIONAL_CHAINING:OK"
  # Assert: outputs "NO_OPTIONAL_CHAINING:OK"

  # A4. Import paths to tool-counter.mjs are correct
  grep -n "tool-counter" hooks/read-optimizer.mjs hooks/bash-optimizer.mjs
  # Assert: both show '../src/utils/tool-counter.mjs'

  # A5. tool-counter.mjs exports exist
  node -e "import('./src/utils/tool-counter.mjs').then(function(m){console.log(Object.keys(m).sort().join(','))})"
  # Assert: outputs "readCounters,recordToolCall,resetCounters,writeCounters"

  # A6. Korean comments present
  grep -c '한\|카운터\|세션\|호출\|리셋\|위임\|도구' src/utils/tool-counter.mjs
  # Assert: >= 5 (multiple Korean comment lines)
  ```

  **lsp_diagnostics Verification**:
  ```
  lsp_diagnostics(file="src/utils/tool-counter.mjs", severity="error")   → 0 errors
  lsp_diagnostics(file="hooks/read-optimizer.mjs", severity="error")     → 0 errors
  lsp_diagnostics(file="hooks/bash-optimizer.mjs", severity="error")     → 0 errors
  ```

  **Commit**: NO (verification only — no changes to commit)

---

- [ ] 2. Verify hooks.json Structure (Entries, Order, Timeouts, Sections)

  **What to do**:
  - Read `hooks/hooks.json` and validate:
    - Valid JSON
    - PreToolUse array has exactly 3 entries
    - Entry order: Task (index 0), Read (index 1), Bash (index 2)
    - Task entry: `matcher: "Task"`, `timeout: 120`, command → `fusion-router.mjs`
    - Read entry: `matcher: "Read"`, `timeout: 5`, command → `read-optimizer.mjs`
    - Bash entry: `matcher: "Bash"`, `timeout: 5`, command → `bash-optimizer.mjs`
    - All command paths use `${CLAUDE_PLUGIN_ROOT}`
    - All 5 hook sections present: PreToolUse, UserPromptSubmit, SessionStart, Stop, PostToolUse
  - Run lsp_diagnostics on hooks.json

  **Must NOT do**:
  - Do not modify hooks.json
  - Do not modify any other file

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read-only JSON validation
  - **Skills**: []
    - No specialized skills for JSON checks
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **File to Verify**:
  - `hooks/hooks.json:1-87` — Full file (87 lines, 5 hook sections)

  **Expected Structure**:
  ```
  hooks.PreToolUse[0].matcher === "Task"   → fusion-router.mjs   (timeout: 120)
  hooks.PreToolUse[1].matcher === "Read"   → read-optimizer.mjs   (timeout: 5)
  hooks.PreToolUse[2].matcher === "Bash"   → bash-optimizer.mjs   (timeout: 5)
  hooks.UserPromptSubmit      → detect-handoff.mjs
  hooks.SessionStart          → session-start.mjs
  hooks.Stop                  → persistent-mode.mjs
  hooks.PostToolUse           → tool-tracker.mjs
  ```

  **Acceptance Criteria**:

  ```bash
  # B1. Valid JSON
  node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('JSON:OK')"
  # Assert: outputs "JSON:OK", exit code 0

  # B2. PreToolUse has exactly 3 entries in correct order
  node -e "var h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); var m=h.hooks.PreToolUse.map(function(e){return e.matcher}); console.log('count=' + m.length + ' order=' + m.join(','))"
  # Assert: "count=3 order=Task,Read,Bash"

  # B3. Task entry unchanged
  node -e "var h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); var t=h.hooks.PreToolUse[0]; console.log(t.matcher + '|' + t.hooks[0].timeout + '|' + t.hooks[0].command)"
  # Assert: "Task|120|node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs"

  # B4. Read timeout = 5
  node -e "var h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log(h.hooks.PreToolUse[1].hooks[0].timeout)"
  # Assert: "5"

  # B5. Bash timeout = 5
  node -e "var h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log(h.hooks.PreToolUse[2].hooks[0].timeout)"
  # Assert: "5"

  # B6. All 5 hook sections present
  node -e "var h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log(Object.keys(h.hooks).sort().join(','))"
  # Assert: "PostToolUse,PreToolUse,SessionStart,Stop,UserPromptSubmit"

  # B7. All PreToolUse commands use ${CLAUDE_PLUGIN_ROOT}
  grep -c 'CLAUDE_PLUGIN_ROOT' hooks/hooks.json
  # Assert: >= 3 (at least one per PreToolUse entry; also in other sections)

  # B8. Read entry points to correct file
  node -e "var h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log(h.hooks.PreToolUse[1].hooks[0].command)"
  # Assert: "node ${CLAUDE_PLUGIN_ROOT}/hooks/read-optimizer.mjs"

  # B9. Bash entry points to correct file
  node -e "var h=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log(h.hooks.PreToolUse[2].hooks[0].command)"
  # Assert: "node ${CLAUDE_PLUGIN_ROOT}/hooks/bash-optimizer.mjs"
  ```

  **lsp_diagnostics Verification**:
  ```
  lsp_diagnostics(file="hooks/hooks.json", severity="error") → 0 errors
  ```

  **Commit**: NO (verification only — no changes to commit)

---

- [ ] 3. Regression Tests + Scope Check + Final lsp_diagnostics Summary

  **What to do**:
  - Run existing test suite to confirm no regressions
  - Verify no unintended modifications to other files
  - Compile lsp_diagnostics results from Tasks 1 and 2 into summary
  - Verify `hooks/fusion-router.mjs` was NOT modified
  - Verify no files outside `src/utils/` and `hooks/` were modified

  **Must NOT do**:
  - Do not modify any file
  - Do not fix issues — report them and STOP

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Command execution + output comparison only
  - **Skills**: []
    - No specialized skills for regression checks
  - **Skills Evaluated but Omitted**:
    - `git-master`: Git commands here are read-only (diff, status)

  **Parallelization**:
  - **Can Run In Parallel**: NO (final gate — requires Tasks 1 and 2 complete)
  - **Parallel Group**: Wave 2 (solo)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Test Infrastructure**:
  - `package.json:22` — Test script: `"test": "node --test tests/**/*.test.mjs"`

  **Scope Boundary Files** (must NOT be modified):
  - `hooks/fusion-router.mjs` — Existing hook, must be untouched
  - `install.sh` — Excluded from scope
  - `uninstall.sh` — Excluded from scope

  **Acceptance Criteria**:

  ```bash
  # C1. Existing test suite passes
  node --test tests/**/*.test.mjs
  # Assert: all tests pass, 0 failures

  # C2. fusion-router.mjs untouched
  git diff hooks/fusion-router.mjs
  # Assert: empty output (no changes)

  # C3. No uncommitted changes anywhere (all already committed)
  git status --porcelain
  # Assert: only untracked files (like .sisyphus/), no M or A entries for src/ or hooks/

  # C4. lsp_diagnostics summary (run all 4)
  # lsp_diagnostics(file="src/utils/tool-counter.mjs", severity="error")   → 0 errors
  # lsp_diagnostics(file="hooks/read-optimizer.mjs", severity="error")     → 0 errors
  # lsp_diagnostics(file="hooks/bash-optimizer.mjs", severity="error")     → 0 errors
  # lsp_diagnostics(file="hooks/hooks.json", severity="error")             → 0 errors
  # Total: 4 files, 0 errors

  # C5. Scope check: only allowed directories contain new files
  git log --oneline -1 --name-only
  # Assert: changed files are only in hooks/ and src/utils/
  ```

  **Final Summary Output**:
  ```
  VERIFICATION REPORT
  ═══════════════════
  Files Verified: 4
  ├── src/utils/tool-counter.mjs  → [PASS/FAIL] syntax, lsp, patterns
  ├── hooks/read-optimizer.mjs    → [PASS/FAIL] syntax, lsp, patterns, import
  ├── hooks/bash-optimizer.mjs    → [PASS/FAIL] syntax, lsp, patterns, import
  └── hooks/hooks.json            → [PASS/FAIL] structure, entries, timeouts
  
  Regression: [PASS/FAIL] (N tests, 0 failures)
  Scope:      [PASS/FAIL] (changes in src/utils/ + hooks/ only)
  
  Overall: [PASS/FAIL]
  ```

  **Commit**: NO (verification only — no changes needed)

---

## Risks and File Conflicts

### Risk Matrix

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| R1 | **lsp_diagnostics reports errors in existing committed files** | MEDIUM | Low | Report findings; may need follow-up remediation plan |
| R2 | **Import path `../src/utils/tool-counter.mjs` fails at runtime** | HIGH | Very Low | Path verified: from `hooks/` → `../src/utils/` = `<repo>/src/utils/`. Syntax confirmed via grep. |
| R3 | **session-id.mjs getSessionId export missing** | MEDIUM | Low | hooks import `sessionModule.getSessionId()` — verify this function exists in session-id.mjs |
| R4 | **hooks.json PostToolUse section unexpected** | LOW | None | Discovered during planning. Not part of our scope but doesn't affect PreToolUse. |
| R5 | **Read/Bash hooks missing statusMessage** | LOW | Medium | hooks.json Read/Bash entries have no `statusMessage` field (Task entry has one). Not a bug — optional field. |

### File Conflict Analysis

| File | Operation | Conflict Risk |
|------|-----------|---------------|
| `src/utils/tool-counter.mjs` | READ ONLY (verify) | **ZERO** — no modification |
| `hooks/read-optimizer.mjs` | READ ONLY (verify) | **ZERO** — no modification |
| `hooks/bash-optimizer.mjs` | READ ONLY (verify) | **ZERO** — no modification |
| `hooks/hooks.json` | READ ONLY (verify) | **ZERO** — no modification |
| `hooks/fusion-router.mjs` | MUST NOT TOUCH | **ZERO** — guardrail: verify untouched |

---

## Success Criteria

### Final Verification Commands
```bash
# All must pass:
node --check src/utils/tool-counter.mjs && echo "tool-counter:OK"
node --check hooks/read-optimizer.mjs && echo "read-optimizer:OK"
node --check hooks/bash-optimizer.mjs && echo "bash-optimizer:OK"
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('JSON:OK')"
node --test tests/**/*.test.mjs
git diff hooks/fusion-router.mjs  # must be empty
```

### lsp_diagnostics Checklist
```
lsp_diagnostics(file="src/utils/tool-counter.mjs", severity="error")   → 0 errors
lsp_diagnostics(file="hooks/read-optimizer.mjs", severity="error")     → 0 errors
lsp_diagnostics(file="hooks/bash-optimizer.mjs", severity="error")     → 0 errors
lsp_diagnostics(file="hooks/hooks.json", severity="error")             → 0 errors
```

### Final Checklist
- [ ] `src/utils/tool-counter.mjs` passes `node --check` (zero syntax errors)
- [ ] `src/utils/tool-counter.mjs` passes lsp_diagnostics (zero errors)
- [ ] `hooks/read-optimizer.mjs` passes `node --check` (zero syntax errors)
- [ ] `hooks/read-optimizer.mjs` passes lsp_diagnostics (zero errors)
- [ ] `hooks/read-optimizer.mjs` has `#!/usr/bin/env node` shebang
- [ ] `hooks/bash-optimizer.mjs` passes `node --check` (zero syntax errors)
- [ ] `hooks/bash-optimizer.mjs` passes lsp_diagnostics (zero errors)
- [ ] `hooks/bash-optimizer.mjs` has `#!/usr/bin/env node` shebang
- [ ] `hooks/hooks.json` is valid JSON
- [ ] `hooks/hooks.json` passes lsp_diagnostics (zero errors)
- [ ] `hooks/hooks.json` PreToolUse has 3 entries: Task, Read, Bash (in order)
- [ ] `hooks/hooks.json` Task entry unchanged (matcher, timeout=120, command→fusion-router.mjs)
- [ ] `hooks/hooks.json` Read entry has timeout=5, command→read-optimizer.mjs
- [ ] `hooks/hooks.json` Bash entry has timeout=5, command→bash-optimizer.mjs
- [ ] Import paths correct: `../src/utils/tool-counter.mjs` from both hooks
- [ ] No optional chaining (`?.`) in any of the 3 .mjs files
- [ ] `hooks/fusion-router.mjs` untouched (git diff empty)
- [ ] Existing tests pass (zero failures)
- [ ] No modifications outside `src/utils/` and `hooks/`
