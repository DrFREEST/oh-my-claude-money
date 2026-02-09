# HUD Output Fixes: fusion-renderer.mjs

## TL;DR

> **Quick Summary**: Fix two functions in `src/hud/fusion-renderer.mjs` so that (1) `renderProviderTokens` always shows O/G providers (even when 0) and shows Claude only when tokens > 0, and (2) `renderFusionMetrics` defaults `routingLevel` to `L1` when `state.actualTokens` is missing, simplifying the conditional logic.
>
> **Deliverables**:
> - Modified `renderProviderTokens` function (lines 277-310)
> - Modified `renderFusionMetrics` function (lines 65-112)
>
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves (tasks are independent)
> **Critical Path**: Task 1 and Task 2 are independent; Task 3 depends on both

---

## Context

### Original Request

Fix HUD output rendering in `fusion-renderer.mjs`:
1. `renderProviderTokens`: Always display O (OpenAI) and G (Gemini) even when token counts are 0; only show C (Claude) when its tokens are > 0.
2. `renderFusionMetrics`: Default `routingLevel` to `L1` when `state.actualTokens` is missing; simplify the routing level push logic.

### Constraints (User-Specified)
- **No optional chaining** (`?.`) — must use explicit null/existence checks
- **ANSI patterns preserved** — keep using existing `RED`, `YELLOW`, `CYAN`, `GREEN`, `DIM`, `RESET` constants
- **Nullish coalescing OK** (`??` is permitted)

### Current Behavior Analysis

**`renderProviderTokens` (lines 277-310):**
- Lines 285, 292, 299: Each provider (C/O/G) is only rendered when `tokenData.{provider}` exists AND `input > 0 || output > 0`
- **Problem**: O and G should always render (even `0↑ 0↓`); C should only render when tokens > 0

**`renderFusionMetrics` (lines 65-112):**
- Lines 91-103: `routingLevel` is only computed when `state.actualTokens && state.actualTokens.claude` exists
- Lines 105-109: If `routingLevel` is empty string, mode is displayed without level
- **Problem**: When `actualTokens` is missing, no level is shown at all. Should default to `L1` (DIM colored).

---

## Work Objectives

### Core Objective
Make HUD output consistently display provider tokens and routing level regardless of data availability.

### Concrete Deliverables
- `renderProviderTokens`: O/G always visible; C conditionally visible
- `renderFusionMetrics`: routing level always visible (defaults to L1)

### Definition of Done
- [ ] `renderProviderTokens({})` returns string containing `O:` and `G:` but NOT `C:`
- [ ] `renderProviderTokens({ openai: { input: 0, output: 0 }, gemini: { input: 0, output: 0 } })` returns string with `O:0↑ 0↓` and `G:0↑ 0↓`
- [ ] `renderProviderTokens({ claude: { input: 100, output: 50 }, openai: { input: 0, output: 0 }, gemini: { input: 0, output: 0 } })` returns string with all three
- [ ] `renderFusionMetrics({ enabled: true, mode: 'balanced' })` output contains `bal` AND `L1`
- [ ] `renderFusionMetrics({ enabled: true, mode: 'balanced', actualTokens: { claude: { input: 50000000 } } })` output contains `L4`
- [ ] No optional chaining (`?.`) anywhere in changed code
- [ ] ANSI color constants used consistently
- [ ] `npm test` passes

### Must NOT Have (Guardrails)
- No optional chaining (`?.`)
- No changes to function signatures
- No changes to other functions in the file
- No new dependencies or imports
- No changes to ANSI color constant definitions

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (`npm test` with bun)
- **User wants tests**: Not explicitly requested for this patch
- **Framework**: bun test
- **QA approach**: Automated verification via node REPL + existing test suite

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Independent function edit |
| Task 2 | None | Independent function edit |
| Task 3 | Task 1, Task 2 | Verification requires both edits complete |

## Parallel Execution Graph

```
Wave 1 (Start immediately):
├── Task 1: Fix renderProviderTokens (no dependencies)
└── Task 2: Fix renderFusionMetrics (no dependencies)

Wave 2 (After Wave 1):
└── Task 3: Verify all changes (depends: Task 1, Task 2)

Critical Path: Either Task 1 or 2 → Task 3
Parallel Speedup: ~30% faster than sequential
```

---

## TODOs

- [ ] 1. Fix `renderProviderTokens` — always show O/G, conditionally show C

  **What to do**:

  Edit `src/hud/fusion-renderer.mjs` lines 277-310.

  **Current code (lines 282-309):**
  ```javascript
  var parts = [];

  // Claude (C:)
  if (tokenData.claude && (tokenData.claude.input > 0 || tokenData.claude.output > 0)) {
    var cInput = formatTokens(tokenData.claude.input || 0);
    var cOutput = formatTokens(tokenData.claude.output || 0);
    parts.push(CYAN + 'C' + RESET + ':' + cInput + '\u2191 ' + cOutput + '\u2193');
  }

  // OpenAI (O:)
  if (tokenData.openai && (tokenData.openai.input > 0 || tokenData.openai.output > 0)) {
    var oInput = formatTokens(tokenData.openai.input || 0);
    var oOutput = formatTokens(tokenData.openai.output || 0);
    parts.push(GREEN + 'O' + RESET + ':' + oInput + '\u2191 ' + oOutput + '\u2193');
  }

  // Gemini (G:)
  if (tokenData.gemini && (tokenData.gemini.input > 0 || tokenData.gemini.output > 0)) {
    var gInput = formatTokens(tokenData.gemini.input || 0);
    var gOutput = formatTokens(tokenData.gemini.output || 0);
    parts.push(YELLOW + 'G' + RESET + ':' + gInput + '\u2191 ' + gOutput + '\u2193');
  }

  if (parts.length === 0) {
    return null;
  }
  ```

  **Replace with:**
  ```javascript
  var parts = [];

  // Claude (C:) — only when tokens > 0
  if (tokenData.claude && (tokenData.claude.input > 0 || tokenData.claude.output > 0)) {
    var cInput = formatTokens(tokenData.claude.input || 0);
    var cOutput = formatTokens(tokenData.claude.output || 0);
    parts.push(CYAN + 'C' + RESET + ':' + cInput + '\u2191 ' + cOutput + '\u2193');
  }

  // OpenAI (O:) — always display, even when 0
  var oData = tokenData.openai ?? {};
  var oInput = formatTokens(oData.input ?? 0);
  var oOutput = formatTokens(oData.output ?? 0);
  parts.push(GREEN + 'O' + RESET + ':' + oInput + '\u2191 ' + oOutput + '\u2193');

  // Gemini (G:) — always display, even when 0
  var gData = tokenData.gemini ?? {};
  var gInput = formatTokens(gData.input ?? 0);
  var gOutput = formatTokens(gData.output ?? 0);
  parts.push(YELLOW + 'G' + RESET + ':' + gInput + '\u2191 ' + gOutput + '\u2193');
  ```

  **Key changes:**
  - **Claude (C:)**: Unchanged — still conditionally shown only when `input > 0 || output > 0`
  - **OpenAI (O:)**: Removed `if` guard. Uses `tokenData.openai ?? {}` then `oData.input ?? 0`. Always pushes to `parts`.
  - **Gemini (G:)**: Same treatment as OpenAI.
  - **Removed** `if (parts.length === 0) return null;` — O and G always present so `parts` is never empty (but keep the final `return parts.join(...)` unchanged).

  **Must NOT do**:
  - Do NOT use optional chaining (`tokenData.openai?.input`)
  - Do NOT change the ANSI color assignments (GREEN for O, YELLOW for G, CYAN for C)
  - Do NOT alter function signature or the initial `if (!tokenData) return null;` guard

  **Recommended Agent Profile**:
  - **Category**: `quick` — single function, ~15 lines changed, straightforward logic
  - **Skills**: [`typescript-programmer`] — .mjs file with ES module syntax, needs precise editing
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not UI work, just data formatting
    - `git-master`: Commit is handled in Task 3

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/hud/fusion-renderer.mjs:282-309` — Current `renderProviderTokens` body (the exact code to edit)
  - `src/hud/fusion-renderer.mjs:18-26` — `formatTokens()` helper (called for each value)

  **API/Type References**:
  - `src/hud/fusion-renderer.mjs:271-276` — JSDoc showing `tokenData` shape: `{ claude: {input, output}, openai: {input, output}, gemini: {input, output} }`

  **Consumer References**:
  - `src/hud/omcm-hud.mjs:775` — `renderProviderTokens(tokenData)` call site
  - `src/hud/omcm-hud.mjs:885` — Second call site

  **WHY Each Reference Matters**:
  - Lines 282-309: This IS the code to replace — executor must match exact oldString for Edit tool
  - Lines 18-26: `formatTokens` is used for all values; executor needs to know it handles 0 correctly (returns `"0"`)
  - Lines 271-276: JSDoc confirms all three provider keys are optional in the input object
  - omcm-hud.mjs call sites: Confirms no caller expects `null` when O/G data missing (they handle null upstream)

  **Acceptance Criteria**:

  ```bash
  # Verify O/G always present, C absent when no claude tokens
  node -e "
    import { renderProviderTokens } from './src/hud/fusion-renderer.mjs';
    var r1 = renderProviderTokens({});
    console.assert(r1 !== null, 'should not be null for empty object');
    console.assert(r1.includes('O:'), 'should contain O:');
    console.assert(r1.includes('G:'), 'should contain G:');
    console.assert(!r1.includes('C:'), 'should NOT contain C: when no claude data');
    console.log('PASS: O/G always shown, C hidden when 0');

    var r2 = renderProviderTokens({ claude: { input: 100, output: 50 }, openai: { input: 0, output: 0 }, gemini: { input: 0, output: 0 } });
    console.assert(r2.includes('C:'), 'should contain C: when claude has tokens');
    console.assert(r2.includes('O:'), 'should contain O:');
    console.assert(r2.includes('G:'), 'should contain G:');
    console.log('PASS: All three shown when claude has tokens');
    console.log('ALL TESTS PASSED');
  "
  ```
  - Assert: Output contains `ALL TESTS PASSED`
  - Assert: No optional chaining in changed lines (grep check)

  **Commit**: YES (groups with Task 2)
  - Message: `fix(hud): always show O/G tokens, show Claude only when >0`
  - Files: `src/hud/fusion-renderer.mjs`
  - Pre-commit: `npm test`

---

- [ ] 2. Fix `renderFusionMetrics` — default routingLevel to L1 when actualTokens missing

  **What to do**:

  Edit `src/hud/fusion-renderer.mjs` lines 88-109.

  **Current code (lines 88-109):**
  ```javascript
  var modeAbbrev = getModeAbbrev(state.mode);

  // 라우팅 레벨이 있으면 표시 (L1/L2/L3/L4)
  var routingLevel = '';
  if (state.actualTokens && state.actualTokens.claude) {
    var sessionInput = state.actualTokens.claude.input || 0;
    if (sessionInput >= 40000000) {
      routingLevel = RED + 'L4' + RESET;
    } else if (sessionInput >= 20000000) {
      routingLevel = YELLOW + 'L3' + RESET;
    } else if (sessionInput >= 5000000) {
      routingLevel = CYAN + 'L2' + RESET;
    } else {
      routingLevel = DIM + 'L1' + RESET;
    }
  }

  if (routingLevel) {
    parts.push(DIM + modeAbbrev + RESET + ' ' + routingLevel);
  } else {
    parts.push(DIM + modeAbbrev + RESET);
  }
  ```

  **Replace with:**
  ```javascript
  var modeAbbrev = getModeAbbrev(state.mode);

  // 라우팅 레벨 표시 (L1/L2/L3/L4) — actualTokens 없으면 L1 기본값
  var routingLevel = DIM + 'L1' + RESET;
  if (state.actualTokens && state.actualTokens.claude) {
    var sessionInput = state.actualTokens.claude.input || 0;
    if (sessionInput >= 40000000) {
      routingLevel = RED + 'L4' + RESET;
    } else if (sessionInput >= 20000000) {
      routingLevel = YELLOW + 'L3' + RESET;
    } else if (sessionInput >= 5000000) {
      routingLevel = CYAN + 'L2' + RESET;
    }
    // else: routingLevel stays as default L1
  }

  parts.push(DIM + modeAbbrev + RESET + ' ' + routingLevel);
  ```

  **Key changes:**
  1. **Default `routingLevel`** initialized to `DIM + 'L1' + RESET` instead of `''`
  2. **Inside the if-block**: Removed the `else { routingLevel = DIM + 'L1' + RESET; }` branch — it's now the default, so only L2/L3/L4 need explicit assignment
  3. **Simplified push**: Removed the `if (routingLevel) / else` fork. Since `routingLevel` always has a value, always push `modeAbbrev + ' ' + routingLevel`. This removes 4 lines and the conditional.

  **Must NOT do**:
  - Do NOT use optional chaining (`state.actualTokens?.claude`)
  - Do NOT change the threshold values (5M, 20M, 40M)
  - Do NOT change color assignments per level
  - Do NOT alter `getModeAbbrev` or anything above line 88

  **Recommended Agent Profile**:
  - **Category**: `quick` — single function, ~10 lines changed
  - **Skills**: [`typescript-programmer`] — precise .mjs editing
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not UI, just logic simplification
    - `git-master`: Commit handled together with Task 1

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/hud/fusion-renderer.mjs:88-109` — Current code block to replace (exact lines)
  - `src/hud/fusion-renderer.mjs:31-42` — `getModeAbbrev()` function (returns mode abbreviation like 'bal')
  - `src/hud/fusion-renderer.mjs:8-13` — ANSI constants (DIM, RED, YELLOW, CYAN, RESET used in level coloring)

  **Consumer References**:
  - `src/hud/omcm-hud.mjs:782` — `renderFusionMetrics(fusionState)` call site
  - `src/hud/omcm-hud.mjs:887` — Second call site

  **WHY Each Reference Matters**:
  - Lines 88-109: Exact code to replace — executor needs the precise oldString
  - Lines 31-42: getModeAbbrev already defaults to 'bal' for falsy mode, so no concern about undefined there
  - Lines 8-13: ANSI constants must be used exactly as-is
  - omcm-hud.mjs call sites: Confirms consumers display the result directly; always having a level is expected

  **Acceptance Criteria**:

  ```bash
  # Verify L1 default when no actualTokens
  node -e "
    import { renderFusionMetrics } from './src/hud/fusion-renderer.mjs';
    var r1 = renderFusionMetrics({ enabled: true, mode: 'balanced' });
    console.assert(r1 !== null, 'should not be null');
    console.assert(r1.includes('L1'), 'should contain L1 as default');
    console.assert(r1.includes('bal'), 'should contain bal mode');
    console.log('PASS: L1 default when no actualTokens');

    var r2 = renderFusionMetrics({ enabled: true, mode: 'balanced', actualTokens: { claude: { input: 50000000 } } });
    console.assert(r2.includes('L4'), 'should contain L4 for 50M input');
    console.log('PASS: L4 for high usage');

    var r3 = renderFusionMetrics({ enabled: true, mode: 'balanced', actualTokens: { claude: { input: 1000 } } });
    console.assert(r3.includes('L1'), 'should contain L1 for low usage');
    console.log('PASS: L1 for low usage with actualTokens present');
    console.log('ALL TESTS PASSED');
  "
  ```
  - Assert: Output contains `ALL TESTS PASSED`

  **Commit**: YES (combined with Task 1)
  - Message: `fix(hud): always show O/G tokens, default routingLevel to L1`
  - Files: `src/hud/fusion-renderer.mjs`
  - Pre-commit: `npm test`

---

- [ ] 3. Final verification and commit

  **What to do**:
  - Run `npm test` to confirm no regressions
  - Run acceptance criteria scripts from Tasks 1 and 2
  - Verify no optional chaining was introduced: `grep -n '\?\.' src/hud/fusion-renderer.mjs` should return empty
  - Commit with message: `fix(hud): always show O/G tokens, default routingLevel to L1`

  **Must NOT do**:
  - Do NOT change any other files
  - Do NOT introduce new test files (unless existing tests fail and need updating)

  **Recommended Agent Profile**:
  - **Category**: `quick` — verification only
  - **Skills**: [`git-master`] — atomic commit with pre-commit verification
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code to write, only verify
    - `frontend-ui-ux`: Not applicable

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential, after Tasks 1 and 2)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `package.json` — `test` script definition for `npm test`
  - Tasks 1 and 2 acceptance criteria — verification scripts to execute

  **Acceptance Criteria**:
  ```bash
  npm test
  # Assert: all tests pass, exit code 0

  grep -n '\?\.' src/hud/fusion-renderer.mjs
  # Assert: no output (no optional chaining)

  git diff --stat
  # Assert: only src/hud/fusion-renderer.mjs changed
  ```

  **Commit**: YES
  - Message: `fix(hud): always show O/G tokens, default routingLevel to L1`
  - Files: `src/hud/fusion-renderer.mjs`
  - Pre-commit: `npm test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 3 (after both edits verified) | `fix(hud): always show O/G tokens, default routingLevel to L1` | `src/hud/fusion-renderer.mjs` | `npm test` + acceptance scripts |

Single atomic commit after both functions are fixed and verified.

---

## Success Criteria

### Verification Commands
```bash
npm test                                    # Expected: all pass
grep -n '\?\.' src/hud/fusion-renderer.mjs  # Expected: no output
```

### Final Checklist
- [ ] O/G always displayed in `renderProviderTokens` (even with 0 tokens)
- [ ] C only displayed when tokens > 0
- [ ] `routingLevel` defaults to L1 when `actualTokens` missing
- [ ] Simplified `parts.push` — no more if/else fork for routingLevel
- [ ] No optional chaining in file
- [ ] ANSI color patterns preserved
- [ ] `npm test` passes
- [ ] Single atomic commit
