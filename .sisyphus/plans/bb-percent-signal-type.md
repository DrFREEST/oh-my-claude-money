# BB_PERCENT Relocation & signalType Mapping Fix

## TL;DR

> **Quick Summary**: Two surgical edits — relocate the `BB_PERCENT` indicator block to sit immediately after `BOLLINGER_BANDS` in `indicators.ts`, and change the signal-node `signalType` assignment in `index.tsx` to use `nodeItem.id` with a `'BUY'` default.
>
> **Deliverables**:
> - `indicators.ts`: `BB_PERCENT` block moved from lines ~776-788 to immediately after line ~239 (end of `BOLLINGER_BANDS` block)
> - `index.tsx`: signal-node branch sets `signalType: nodeItem.id` with fallback `'BUY'`
>
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 independent file edits (Wave 1), then 1 shared verification (Wave 2)
> **Critical Path**: Task 1 | Task 2 -> Task 3 (verify)

---

## Context

### Original Request
Two explicit edits requested by the user:

1. **Move BB_PERCENT**: Relocate the entire indicator metadata block (type `'BB_PERCENT'`, lines ~776-788 of `indicators.ts`) to immediately after the `BOLLINGER_BANDS` block (which ends at line ~239), so all Bollinger-Band-family indicators are grouped together.
2. **Fix signalType mapping**: In `index.tsx`, the signal-node creation branch (lines ~567-572) currently hard-codes `signalType: nodeItem.id === 'BUY' ? 'entry' : 'exit'`. Change this to `signalType: nodeItem.id` (pass-through) with a default of `'BUY'`.

### Key File Locations

| File | Absolute Path |
|------|--------------|
| indicators.ts | `/opt/coffeetree/apps/web/lib/strategy/indicators.ts` |
| index.tsx | `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx` |

### Relevant Type Constraint

`workflow-types.ts:56` defines `signalType: 'entry' | 'exit'`. The user instruction says to set `signalType = nodeItem.id` with default `'BUY'`.

**NOTE to executor**: The new value `'BUY'` diverges from the existing `'entry'|'exit'` type. The user explicitly requested this. Apply it exactly as specified — the user owns the type-compatibility decision.

---

## Work Objectives

### Core Objective
Group BB-family indicators together and make signal-node type assignment data-driven instead of hard-coded.

### Concrete Deliverables
1. `indicators.ts` — BB_PERCENT block relocated (no content change, position-only move)
2. `index.tsx` — signal branch signalType assignment changed

### Definition of Done
- [ ] BB_PERCENT block appears immediately after BOLLINGER_BANDS block in indicators.ts
- [ ] BB_PERCENT block is fully removed from its old position (lines ~776-788)
- [ ] Signal-node branch in index.tsx reads `signalType: nodeItem.id` with `'BUY'` default
- [ ] LSP diagnostics show zero new errors on both files

### Must Have
- Exact block content preserved during move (all 13 lines of the BB_PERCENT object)
- Default value `'BUY'` for signalType when nodeItem.id is falsy
- No other code changes

### Must NOT Have (Guardrails)
- Do NOT modify any other indicator block in indicators.ts
- Do NOT reorder any indicators besides BB_PERCENT
- Do NOT change workflow-types.ts or any other file
- Do NOT add/remove imports
- Do NOT modify the else/default branch at lines 573-578 beyond changing its signalType value

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: Not assessed (out of scope)
- **User wants tests**: NO — LSP diagnostics only
- **QA approach**: Automated LSP diagnostics on both changed files

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - independent edits):
+-- Task 1: Move BB_PERCENT block in indicators.ts
+-- Task 2: Update signalType mapping in index.tsx

Wave 2 (After Wave 1):
+-- Task 3: LSP diagnostics verification on both files
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1, 2 | `delegate_task(category="quick", load_skills=[], run_in_background=true)` x2 |
| 2 | 3 | `delegate_task(category="quick", load_skills=[], run_in_background=false)` |

---

## TODOs

- [ ] 1. Move BB_PERCENT block in indicators.ts

  **What to do**:
  1. CUT the entire BB_PERCENT object block from its current position. The block spans from the opening `  {` (line ~776) through the closing `  },` (line ~788) inclusive — that is the object starting with `type: 'BB_PERCENT'` and ending with the closing brace+comma of its outer object.
  2. PASTE it immediately after the closing `},` of the BOLLINGER_BANDS block (line ~239). Insert it before the VOLUME block (line ~240). No extra blank line needed — follow the existing pattern between adjacent entries.
  3. Ensure the old location (lines ~776-788) is cleanly removed with no leftover blank lines beyond what existed between neighbors.

  **Exact old text to remove** (from indicators.ts lines 776-788):
  ```
    {
      type: 'BB_PERCENT',
      label: '볼린저 밴드 %B',
      shortLabel: '%B',
      description: '볼린저 밴드 내 위치 (0-1)',
      category: 'volatility',
      defaultParams: { period: 20, stdDev: 2, field: 'close' },
      paramFields: [
        { key: 'period', label: '기간', type: 'number', defaultValue: 20, min: 2, max: 100, step: 1 },
        { key: 'stdDev', label: '표준편차 배수', type: 'number', defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
        { key: 'field', label: '가격 필드', type: 'select', defaultValue: 'close', options: PRICE_FIELD_OPTIONS },
      ],
    },
  ```

  **Exact insert location**: Immediately after line 239 (closing `},` of BOLLINGER_BANDS block), before line 240 (opening `{` of VOLUME block).

  **Must NOT do**:
  - Do not alter any field values inside the BB_PERCENT block
  - Do not change indentation style (2-space indent)
  - Do not reorder any other indicator

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file, mechanical cut-paste operation with no logic changes
  - **Skills**: `[]` (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `indicators.ts:201-239` — BOLLINGER_BANDS block (insert target: immediately after line 239)
  - `indicators.ts:240-248` — VOLUME block (will shift down after insert)
  - `indicators.ts:776-788` — BB_PERCENT block (source to cut)
  - `indicators.ts:763-775` — BB_WIDTH block (current predecessor — after move, its successor becomes STDDEV)
  - `indicators.ts:789-800` — STDDEV block (current successor — becomes direct successor of BB_WIDTH after cut)

  **WHY Each Reference Matters**:
  - Lines 201-239: Executor finds insertion point — the closing `},` of BOLLINGER_BANDS
  - Lines 776-788: Executor identifies block to cut — match on `type: 'BB_PERCENT'`
  - Lines 763-775 and 789-800: Executor verifies no gap or duplicate remains after cut

  **Acceptance Criteria**:

  ```bash
  # 1. LSP diagnostics clean:
  # lsp_diagnostics on /opt/coffeetree/apps/web/lib/strategy/indicators.ts
  # Assert: zero errors

  # 2. Block position check:
  grep -n "BB_PERCENT\|BOLLINGER_BANDS\|VOLUME" /opt/coffeetree/apps/web/lib/strategy/indicators.ts
  # Assert: BB_PERCENT line number is BETWEEN BOLLINGER_BANDS and VOLUME line numbers

  # 3. No duplicate:
  grep -c "BB_PERCENT" /opt/coffeetree/apps/web/lib/strategy/indicators.ts
  # Assert: output is exactly "1"
  ```

  **Commit**: YES (group with Task 2)
  - Message: `refactor(strategy): group BB_PERCENT with BOLLINGER_BANDS and use dynamic signalType`
  - Files: `apps/web/lib/strategy/indicators.ts`

---

- [ ] 2. Update signalType mapping in index.tsx

  **What to do**:
  1. In the handleAddNode callback, locate the signal-node branch (lines ~567-572).
  2. Replace the current signalType assignment on line ~571:
     **Old**: `signalType: nodeItem.id === 'BUY' ? 'entry' : 'exit',`
     **New**: `signalType: nodeItem.id || 'BUY',`
  3. In the else/default branch (lines ~573-578), replace the signalType on line ~577:
     **Old**: `signalType: 'entry',`
     **New**: `signalType: 'BUY',`

  **Must NOT do**:
  - Do not change label, operatorType, operation, or any other field in these branches
  - Do not modify imports or any other function
  - Do not touch workflow-types.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two-line replacement in a single file, no logic complexity
  - **Skills**: `[]` (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `index.tsx:567-572` — Signal branch with current ternary signalType assignment
  - `index.tsx:573-579` — Default/else branch with current `signalType: 'entry'`

  **Type References**:
  - `workflow-types.ts:56` — `signalType: 'entry' | 'exit'` type (NOT to be changed; executor should be aware new value 'BUY' diverges — user's explicit instruction)

  **WHY Each Reference Matters**:
  - Lines 567-572: Exact location of the primary edit
  - Lines 573-579: Exact location of the secondary edit
  - workflow-types.ts:56: TypeScript may flag a type error — expected and accepted per user instruction

  **Acceptance Criteria**:

  ```bash
  # 1. LSP diagnostics:
  # lsp_diagnostics on /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Note: Type errors on signalType are EXPECTED and ACCEPTED per user instruction
  # Assert: no NEW errors unrelated to signalType type mismatch

  # 2. Verify the change:
  grep -n "signalType" /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Assert: contains "nodeItem.id || 'BUY'" (signal branch)
  # Assert: contains "'BUY'" (default branch)
  # Assert: does NOT contain "'entry'" or "'exit'" in signalType assignments within handleAddNode
  ```

  **Commit**: YES (group with Task 1)
  - Message: `refactor(strategy): group BB_PERCENT with BOLLINGER_BANDS and use dynamic signalType`
  - Files: `apps/web/components/strategy/flow/index.tsx`

---

- [ ] 3. Verify both changes with LSP diagnostics

  **What to do**:
  1. Run lsp_diagnostics on indicators.ts — expect zero errors.
  2. Run lsp_diagnostics on index.tsx — note any errors. Type mismatch on signalType is expected and accepted.
  3. Optionally run `tsc --noEmit` on the project to catch transitive breakage.

  **Must NOT do**:
  - Do not make any code changes in this task
  - Do not "fix" the expected type error on signalType

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read-only diagnostic check, no code changes
  - **Skills**: `[]` (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2

  **Acceptance Criteria**:

  ```bash
  # indicators.ts: zero errors
  # lsp_diagnostics -> 0 errors

  # index.tsx: only expected signalType type-mismatch errors (if any)
  # lsp_diagnostics -> no errors OTHER than signalType type assignment
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Tasks | Message | Files | Verification |
|-------------|---------|-------|--------------|
| 1 + 2 (single commit) | `refactor(strategy): group BB_PERCENT with BOLLINGER_BANDS and use dynamic signalType` | `indicators.ts`, `index.tsx` | LSP diagnostics (Task 3) |

---

## Success Criteria

### Verification Commands
```bash
# 1. BB_PERCENT position check
grep -n "type: 'BB_PERCENT'\|type: 'BOLLINGER_BANDS'\|type: 'VOLUME'" apps/web/lib/strategy/indicators.ts
# Expected: BB_PERCENT line between BOLLINGER_BANDS and VOLUME

# 2. No duplicate BB_PERCENT
grep -c "BB_PERCENT" apps/web/lib/strategy/indicators.ts
# Expected: 1

# 3. signalType uses nodeItem.id
grep "signalType" apps/web/components/strategy/flow/index.tsx
# Expected: "nodeItem.id || 'BUY'" and "'BUY'" — no "entry" or "exit"

# 4. LSP clean (indicators.ts) -> 0 errors
# 5. LSP check (index.tsx) -> only accepted type-mismatch if any
```

### Final Checklist
- [ ] BB_PERCENT immediately follows BOLLINGER_BANDS in indicators.ts
- [ ] BB_PERCENT removed from old position (~line 776)
- [ ] No duplicate BB_PERCENT entries
- [ ] signalType in signal branch = `nodeItem.id || 'BUY'`
- [ ] signalType in default branch = `'BUY'`
- [ ] No unrelated changes in either file
- [ ] LSP diagnostics reviewed
