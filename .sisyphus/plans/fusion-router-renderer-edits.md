# Fusion Router & Renderer — Constraint Compliance & Style Cleanup

## TL;DR

> **Quick Summary**: All four requested code blocks (getRoutingLevel, prompt-based routing, session-token routing, routing-level HUD display) are **already implemented** in the codebase. The remaining work is **constraint compliance cleanup**: removing `??` (nullish coalescing) operators from `fusion-renderer.mjs` and ensuring `const`→`var` consistency in the affected function.
>
> **Deliverables**:
> - Remove 2× `??` operators in `fusion-renderer.mjs` (lines 77, 127), replacing with explicit ternary/fallback
> - No changes needed in `fusion-router-logic.mjs` (already compliant)
>
> **Estimated Effort**: Quick (< 5 min implementation)
> **Parallel Execution**: NO — sequential (2 edits in same file)
> **Critical Path**: Edit line 77 → Edit line 127 → `node --check` verify

---

## Context

### Original Request

Add four code blocks across two files:
1. `getRoutingLevel(sessionInputTokens)` at bottom of `fusion-router-logic.mjs` after `getRoutingStats()`
2. Prompt-based routing block (large task keywords) before session-token routing in `shouldRouteToOpenCode()`
3. Session-token routing block before mode routing (`fusionDefault`/`save-tokens`) in `shouldRouteToOpenCode()`
4. Replace `modeAbbrev` rendering in `renderFusionMetrics()` in `fusion-renderer.mjs` with routing level display

### Gap Analysis (COMPLETED)

| Requested Change | File | Status | Evidence |
|-----------------|------|--------|----------|
| `getRoutingLevel()` at file end | `fusion-router-logic.mjs:674-745` | ✅ **ALREADY EXISTS** | Lines 674-745, exported, L1-L4 thresholds at 5M/20M/40M |
| Prompt-based routing (large task keywords) | `fusion-router-logic.mjs:256-287` | ✅ **ALREADY EXISTS** | Lines 256-287, checks `largeTaskKeywords`, 500-char threshold, `mapAgentToOpenCode` used |
| Session-token routing | `fusion-router-logic.mjs:289-324` | ✅ **ALREADY EXISTS** | Lines 289-324, reads `fusion.actualTokens.claude.input`, calls `getRoutingLevel()` |
| Routing level HUD display | `fusion-renderer.mjs:87-109` | ✅ **ALREADY EXISTS** | Lines 87-109, color-coded L1-L4 with RED/YELLOW/CYAN/DIM |

### Constraint Violations Found

| Constraint | File | Line(s) | Violation | Fix Needed |
|-----------|------|---------|-----------|------------|
| No optional chaining (`?.`) | Both files | — | ✅ CLEAN | None |
| No `??` (nullish coalescing) | `fusion-renderer.mjs` | 77, 127 | ❌ VIOLATION | Replace with explicit ternary |
| Korean comments | Both files | — | ✅ CLEAN | None |
| `var` style (new code) | `fusion-renderer.mjs` | 88, 91-102 | ✅ Uses `var` | None |
| `var` style (old code) | `fusion-renderer.mjs` | 74, 77-78, 82 | `const` (pre-existing) | Not in scope (existing code, not part of requested changes) |
| Syntax validity | Both files | — | ✅ `node --check` passes | None |

---

## Work Objectives

### Core Objective

Replace 2 instances of `??` (nullish coalescing operator) in `fusion-renderer.mjs` to comply with the "no optional chaining" constraint family.

### Concrete Deliverables

- `src/hud/fusion-renderer.mjs` line 77: `state.savingsRate ?? state.routingRate ?? 0` → explicit fallback
- `src/hud/fusion-renderer.mjs` line 127: same pattern in `renderFusionCompact()`

### Definition of Done

- [ ] Zero `??` operators in `fusion-renderer.mjs`
- [ ] Zero `?.` operators in `fusion-renderer.mjs` (already clean)
- [ ] `node --check src/hud/fusion-renderer.mjs` exits 0
- [ ] `renderFusionMetrics()` produces identical output for all input states
- [ ] `renderFusionCompact()` produces identical output for all input states

### Must Have

- Behavioral equivalence: `??` → ternary must handle `null`, `undefined` identically (NOT falsy-coercion with `||`)
- Korean comments on replaced lines

### Must NOT Have

- No `||` operator (changes semantics: `0` and `''` are falsy but valid values)
- No changes to `fusion-router-logic.mjs` (already fully compliant)
- No changes to any logic, exports, or function signatures

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (npm test, 361 tests)
- **Approach**: Automated verification via `node --check` + existing test suite
- **No new tests needed** (behavioral equivalence, no new features)

---

## Execution Strategy

### Sequential Execution (Single File, 2 Edits)

```
Step 1: Edit line 77 in fusion-renderer.mjs
    ↓
Step 2: Edit line 127 in fusion-renderer.mjs
    ↓
Step 3: node --check verification
    ↓
Step 4: npm test (existing tests confirm no regression)
```

No parallelization needed — both edits are in the same file and take < 1 minute total.

---

## TODOs

- [ ] 1. Replace `??` on line 77 of `fusion-renderer.mjs` (renderFusionMetrics)

  **What to do**:
  - Replace line 77:
    ```js
    const rate = state.savingsRate ?? state.routingRate ?? 0;
    ```
    With (semantically equivalent, no `??`):
    ```js
    // savingsRate 우선, routingRate 폴백, 기본값 0
    var savingsRate = state.savingsRate;
    var rate = (savingsRate !== null && savingsRate !== undefined) ? savingsRate : ((state.routingRate !== null && state.routingRate !== undefined) ? state.routingRate : 0);
    ```
    **NOTE**: Using `!== null && !== undefined` (not `||`) preserves `??` semantics where `0` is a valid non-null value.

  **Must NOT do**:
  - Do NOT use `||` (would coerce `0` to falsy → wrong for 0% rate)
  - Do NOT change `const` to `var` for pre-existing variables on adjacent lines (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`] (for atomic commit)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential Step 1
  - **Blocks**: Task 2 (same file region)
  - **Blocked By**: None

  **References**:
  - `src/hud/fusion-renderer.mjs:65-112` — `renderFusionMetrics()` function
  - `src/hud/fusion-renderer.mjs:77` — exact line to edit
  - `src/hooks/fusion-router-logic.mjs:196` — shows `var x = (options.x !== undefined) ? options.x : fallback` pattern already used in codebase

  **Acceptance Criteria**:
  ```bash
  # 1. No ?? operators remain
  grep -c '??' src/hud/fusion-renderer.mjs
  # Assert: output is "0"

  # 2. Syntax valid
  node --check src/hud/fusion-renderer.mjs
  # Assert: exit code 0
  ```

  **Commit**: YES (group with Task 2)
  - Message: `fix(hud): ?? 연산자 제거 — 제약조건 준수 (no optional chaining)`
  - Files: `src/hud/fusion-renderer.mjs`

---

- [ ] 2. Replace `??` on line 127 of `fusion-renderer.mjs` (renderFusionCompact)

  **What to do**:
  - Replace line 127:
    ```js
    const rate = state.savingsRate ?? state.routingRate ?? 0;
    ```
    With (same pattern as Task 1):
    ```js
    // savingsRate 우선, routingRate 폴백, 기본값 0
    var savingsRate = state.savingsRate;
    var rate = (savingsRate !== null && savingsRate !== undefined) ? savingsRate : ((state.routingRate !== null && state.routingRate !== undefined) ? state.routingRate : 0);
    ```

  **Must NOT do**:
  - Same constraints as Task 1

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential Step 2
  - **Blocks**: Task 3 (verification)
  - **Blocked By**: Task 1 (same file)

  **References**:
  - `src/hud/fusion-renderer.mjs:118-130` — `renderFusionCompact()` function
  - `src/hud/fusion-renderer.mjs:127` — exact line to edit

  **Acceptance Criteria**:
  ```bash
  # 1. No ?? operators remain in entire file
  grep -c '??' src/hud/fusion-renderer.mjs
  # Assert: output is "0"

  # 2. Syntax valid
  node --check src/hud/fusion-renderer.mjs
  # Assert: exit code 0
  ```

  **Commit**: YES (same commit as Task 1)
  - Message: `fix(hud): ?? 연산자 제거 — 제약조건 준수 (no optional chaining)`
  - Files: `src/hud/fusion-renderer.mjs`

---

- [ ] 3. Verification — syntax + tests

  **What to do**:
  - Run `node --check src/hud/fusion-renderer.mjs` — must exit 0
  - Run `node --check src/hooks/fusion-router-logic.mjs` — must exit 0 (confirm untouched)
  - Run `npm test` — all 361+ tests must pass
  - Run `grep -rn '??' src/hud/fusion-renderer.mjs` — must return empty
  - Run `grep -rn '?.' src/hud/fusion-renderer.mjs` — must return empty

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential Step 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 2

  **Acceptance Criteria**:
  ```bash
  node --check src/hud/fusion-renderer.mjs && echo "PASS" || echo "FAIL"
  # Assert: PASS

  node --check src/hooks/fusion-router-logic.mjs && echo "PASS" || echo "FAIL"
  # Assert: PASS

  npm test 2>&1 | tail -5
  # Assert: all tests pass, 0 failures

  grep -c '\?\?' src/hud/fusion-renderer.mjs
  # Assert: 0

  grep -c '\?\.' src/hud/fusion-renderer.mjs
  # Assert: 0
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 + 2 (combined) | `fix(hud): ?? 연산자 제거 — 제약조건 준수 (no optional chaining)` | `src/hud/fusion-renderer.mjs` | `node --check` + `npm test` |

---

## Success Criteria

### Verification Commands
```bash
# Syntax checks
node --check src/hud/fusion-renderer.mjs  # Expected: exit 0
node --check src/hooks/fusion-router-logic.mjs  # Expected: exit 0

# Constraint compliance
grep -c '\?\?' src/hud/fusion-renderer.mjs  # Expected: 0
grep -c '\?\.' src/hud/fusion-renderer.mjs  # Expected: 0
grep -c '\?\?' src/hooks/fusion-router-logic.mjs  # Expected: 0
grep -c '\?\.' src/hooks/fusion-router-logic.mjs  # Expected: 0

# Test suite
npm test  # Expected: all pass
```

### Final Checklist
- [ ] All `??` operators removed from `fusion-renderer.mjs`
- [ ] No `?.` operators in either file
- [ ] `node --check` passes on both files
- [ ] All existing tests pass
- [ ] No behavioral change (0 is still a valid rate value, not coerced to falsy)
- [ ] Korean comments present on replacement lines
