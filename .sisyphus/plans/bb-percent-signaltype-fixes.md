# BB_PERCENT Reorder + signalType Mapping Fix

## TL;DR

> **Quick Summary**: Two independent, surgical code edits — (A) reorder `BB_PERCENT` indicator block in `indicators.ts` to immediately follow its parent `BOLLINGER_BANDS` block, and (B) fix the `signalType` assignment in `index.tsx` to use direct `nodeItem.id` values (`BUY`|`SELL`|`PASS`) instead of legacy `entry`/`exit` mapping.
>
> **Deliverables**:
> - `indicators.ts` with `BB_PERCENT` block relocated from line 776–788 to immediately after line 239
> - `index.tsx` with corrected `signalType` assignment logic and default
>
> **Estimated Effort**: Quick
> **Parallel Execution**: YES — 2 waves (Wave 1 parallel edits, Wave 2 sequential diagnostics)
> **Critical Path**: Task 1 + Task 2 (parallel) → Task 3 (diagnostics)

---

## Context

### Original Request

Two code edits:
1. **indicators.ts**: Move `BB_PERCENT` block (lines 776–788) to immediately after `BOLLINGER_BANDS` block (ends at line 239).
2. **index.tsx**: Update `signalType` assignment — for signal nodes `signalType = nodeItem.id` (BUY|SELL|PASS), default fallback from `'entry'` to `'BUY'`.

### Interview Summary

**Key Discussions**:
- Files confirmed via filesystem search; exact line numbers verified by reading source
- Both tasks are in different files → fully parallelizable
- User constraints: NO file editing (plan only), NO tests/builds, NO git operations
- Verification limited to LSP diagnostics

**Research Findings**:
- `indicators.ts` path: `/opt/coffeetree/apps/web/lib/strategy/indicators.ts`
- `index.tsx` path: `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx`
- BB_PERCENT block (lines 776–788) is 13 lines, currently after BB_WIDTH (lines 763–775)
- BOLLINGER_BANDS ends at line 239; next block (VOLUME) starts at line 240
- Current `signalType` logic at line 571: `signalType: nodeItem.id === 'BUY' ? 'entry' : 'exit'`
- Current default at line 577: `signalType: 'entry'`
- **CRITICAL DOWNSTREAM FINDING**: `signal-node.tsx:17` defines `SignalType = 'BUY' | 'SELL' | 'PASS'` — the new mapping aligns `index.tsx` with this correct type
- **KNOWN INCONSISTENCY (OUT OF SCOPE)**: `workflow-types.ts:56` still defines `signalType: 'entry' | 'exit'` and `backtest-engine.ts:1068-1071` reads `'entry'`/`'exit'` — these are pre-existing mismatches that the user's change makes visible but does NOT address

### Metis Review

**Identified Gaps** (addressed):
- **Dedup behavior**: Line 793 compares `signalType` values — old: BUY→entry, SELL→exit, PASS→exit (SELL+PASS dedup). New: each gets its own value (no false dedup). This is the correct/intended behavior per the `SignalType` definition.
- **Trailing comma safety**: After removing BB_PERCENT at lines 776–788, the preceding block (BB_WIDTH, ending line 775 with `},`) already has a trailing comma, so the array remains valid. At the insertion point after line 239, the BOLLINGER_BANDS block also ends with `},` — inserting after it is safe.
- **Content-anchored edits**: Plan specifies content matches (not just line numbers) to be resilient to minor line shifts.

**Flagged (OUT OF SCOPE)**:
- `workflow-types.ts:56` type definition mismatch (`'entry' | 'exit'` vs `'BUY' | 'SELL' | 'PASS'`)
- `backtest-engine.ts:1068-1071` reading old `entry`/`exit` values
- These are separate bugs that should be addressed in a follow-up plan

---

## Work Objectives

### Core Objective
Fix two code consistency issues: reorder BB_PERCENT to its logical position near BOLLINGER_BANDS, and align signalType assignment with the canonical `SignalType = 'BUY' | 'SELL' | 'PASS'` type.

### Concrete Deliverables
- `indicators.ts`: BB_PERCENT block at lines ~240–252 (after BOLLINGER_BANDS, before VOLUME)
- `index.tsx`: Line ~571 uses `signalType: nodeItem.id`, line ~577 uses `signalType: 'BUY'`

### Definition of Done
- [ ] `BB_PERCENT` immediately follows `BOLLINGER_BANDS` in indicators.ts
- [ ] No empty gap or artifact at the old location (lines 776–788)
- [ ] `signalType` for signal nodes is `nodeItem.id` (not a ternary mapping)
- [ ] Default `signalType` is `'BUY'` (not `'entry'`)
- [ ] LSP diagnostics show 0 new errors in both files

### Must Have
- BB_PERCENT block content is unchanged (only location changes)
- Indentation preserved exactly (2-space indent within array)
- Comma structure valid at both insertion and removal sites

### Must NOT Have (Guardrails)
- **Do NOT** modify any lines other than the BB_PERCENT block location (Task A)
- **Do NOT** modify any other indicator blocks or their ordering
- **Do NOT** change the BB_PERCENT block content (params, labels, etc.)
- **Do NOT** modify line 793 (dedup logic) or any other signalType consumer
- **Do NOT** update `workflow-types.ts` or `backtest-engine.ts` (out of scope)
- **Do NOT** add TypeScript type annotations or imports
- **Do NOT** run tests, builds, or git commands

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: Not assessed (user constraint: no tests/builds)
- **User wants tests**: NO — diagnostics only
- **Framework**: N/A
- **QA approach**: LSP diagnostics + grep assertions

### Automated Verification (Agent-Executable)

Each task includes grep-based assertions and LSP diagnostics checks. No user intervention required.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Move BB_PERCENT | None | Independent file edit (indicators.ts) |
| Task 2: Fix signalType | None | Independent file edit (index.tsx) |
| Task 3: Diagnostics | Task 1, Task 2 | Must verify after both edits complete |

---

## Parallel Execution Graph

```
Wave 1 (Start immediately — PARALLEL):
├── Task 1: Move BB_PERCENT block in indicators.ts
└── Task 2: Fix signalType mapping in index.tsx

Wave 2 (After Wave 1 completes — SEQUENTIAL):
└── Task 3: Run LSP diagnostics on both modified files

Critical Path: Task 1 → Task 3 (or Task 2 → Task 3)
Parallel Speedup: ~50% faster than sequential (Wave 1 tasks run simultaneously)
```

---

## TODOs

- [ ] 1. Move BB_PERCENT block in indicators.ts

  **What to do**:
  1. Open `/opt/coffeetree/apps/web/lib/strategy/indicators.ts`
  2. **CUT** the BB_PERCENT block — match on content anchor:
     ```typescript
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
     This block is currently at approximately lines 776–788 (after BB_WIDTH block).
  3. **DELETE** the block at its current location. Ensure no blank lines or artifacts remain — the `STDDEV` block (starting with `type: 'STDDEV'`) should immediately follow the `BB_WIDTH` block's closing `},`.
  4. **INSERT** the block immediately after the `BOLLINGER_BANDS` block's closing `},` (currently line 239). The insertion goes between line 239 (`},` closing BOLLINGER_BANDS) and line 240 (`{` opening VOLUME). After insertion, the order becomes: BOLLINGER_BANDS → BB_PERCENT → VOLUME.
  5. Ensure indentation is exactly 2 spaces for the outer object (matching surrounding blocks).

  **Must NOT do**:
  - Do NOT modify BB_PERCENT block content (params, labels, description)
  - Do NOT reorder any other indicator blocks
  - Do NOT change BB_WIDTH or BOLLINGER_BANDS blocks
  - Do NOT leave empty lines or duplicate commas at the removal site

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file, mechanical cut-and-paste operation with no logic changes
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands TypeScript array-of-objects structure and comma syntax

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: No UI changes involved
  - `git-master`: No git operations per user constraint
  - `agent-browser`: No browser interaction needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3 (diagnostics depends on this completing)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `/opt/coffeetree/apps/web/lib/strategy/indicators.ts:202-239` — BOLLINGER_BANDS block structure. BB_PERCENT must be inserted immediately after this block's closing `},` on line 239. This is the **insertion target**.
  - `/opt/coffeetree/apps/web/lib/strategy/indicators.ts:240-248` — VOLUME block. After insertion, BB_PERCENT sits between BOLLINGER_BANDS and VOLUME.
  - `/opt/coffeetree/apps/web/lib/strategy/indicators.ts:763-775` — BB_WIDTH block. After BB_PERCENT removal, STDDEV (line 789+) should follow BB_WIDTH directly.
  - `/opt/coffeetree/apps/web/lib/strategy/indicators.ts:776-788` — BB_PERCENT block to be moved. This is the **source content to cut**.
  - `/opt/coffeetree/apps/web/lib/strategy/indicators.ts:789-800` — STDDEV block. After removal, this should immediately follow BB_WIDTH.

  **Acceptance Criteria**:

  ```bash
  # Agent runs after edit:

  # 1. Verify BB_PERCENT is now near line 240 (after BOLLINGER_BANDS)
  grep -n "BB_PERCENT" /opt/coffeetree/apps/web/lib/strategy/indicators.ts
  # Assert: Line number is between 240 and 260
  # Assert: Only ONE occurrence of BB_PERCENT exists

  # 2. Verify ordering: BOLLINGER_BANDS → BB_PERCENT → VOLUME
  grep -n "type: 'BOLLINGER_BANDS'\|type: 'BB_PERCENT'\|type: 'VOLUME'" /opt/coffeetree/apps/web/lib/strategy/indicators.ts
  # Assert: BOLLINGER_BANDS line < BB_PERCENT line < VOLUME line

  # 3. Verify no artifact at old location (~line 776)
  sed -n '770,795p' /opt/coffeetree/apps/web/lib/strategy/indicators.ts
  # Assert: BB_WIDTH closing }, is followed directly by STDDEV opening {
  # Assert: No blank gap, no BB_PERCENT remnant

  # 4. LSP diagnostics (Task 3)
  ```

  **Commit**: YES (groups with Task 2 in a single commit)
  - Message: `fix(strategy): BB_PERCENT 블록 순서 정리 및 signalType 매핑 수정`
  - Files: `apps/web/lib/strategy/indicators.ts`, `apps/web/components/strategy/flow/index.tsx`
  - Pre-commit: LSP diagnostics clean

---

- [ ] 2. Fix signalType mapping in index.tsx

  **What to do**:
  1. Open `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx`
  2. **CHANGE line 571** — match on content anchor:
     ```typescript
     // BEFORE (line 571):
               signalType: nodeItem.id === 'BUY' ? 'entry' : 'exit',
     // AFTER:
               signalType: nodeItem.id,
     ```
     Replace the ternary expression `nodeItem.id === 'BUY' ? 'entry' : 'exit'` with simply `nodeItem.id`. This means `signalType` will be the raw node ID: `'BUY'`, `'SELL'`, or `'PASS'`.
  3. **CHANGE line 577** — match on content anchor:
     ```typescript
     // BEFORE (line 577):
               signalType: 'entry',
     // AFTER:
               signalType: 'BUY',
     ```
     Change the default/fallback signalType from `'entry'` to `'BUY'`.
  4. Do NOT modify any other lines in this file.

  **Must NOT do**:
  - Do NOT modify line 793 (dedup logic `existingData.signalType === newData.signalType`)
  - Do NOT add imports or type annotations
  - Do NOT change the `handleAddNodeByType` function's default signal (`id: 'BUY'` at line 676)
  - Do NOT modify `workflow-types.ts` or `backtest-engine.ts` (known out-of-scope inconsistencies)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two single-line edits in one file, no logic design needed
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands TypeScript expression replacement and type implications

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: No visual/UI changes
  - `git-master`: No git operations per user constraint
  - `agent-browser`: No browser interaction needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3 (diagnostics depends on this completing)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx:567-579` — The signal/default branches being modified. Lines 571 and 577 are the exact edit targets.
  - `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx:675-681` — Default signal node definition showing `id: 'BUY'`. Confirms that `nodeItem.id` for signal nodes is a string like `'BUY'`.
  - `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx:792-793` — Dedup check: `existingData.signalType === newData.signalType`. NOT modified, but executor should know it exists. After the change, dedup compares `'BUY'` vs `'BUY'` (not `'entry'` vs `'entry'`).

  **API/Type References** (contracts):
  - `/opt/coffeetree/apps/web/components/strategy/flow/nodes/signal-node.tsx:17` — `export type SignalType = 'BUY' | 'SELL' | 'PASS'` — the canonical type definition. The new `nodeItem.id` value aligns with this type.
  - `/opt/coffeetree/apps/web/components/strategy/flow/nodes/signal-node.tsx:26` — `signalType: SignalType` — the signal node data interface expects `BUY|SELL|PASS`, NOT `entry|exit`.
  - `/opt/coffeetree/apps/web/components/strategy/flow/nodes/signal-node.tsx:93` — `signalConfig[data.signalType] || signalConfig.PASS` — reads signalType as `BUY|SELL|PASS` key.

  **Documentation References** (specs confirming intent):
  - `/opt/coffeetree/apps/web/app/api/ai/generate-strategy/route.ts:40` — `signalType?: 'BUY' | 'SELL' | 'PASS'` — API route also defines signalType as BUY/SELL/PASS.
  - `/opt/coffeetree/apps/web/app/api/ai/generate-strategy/route.ts:375` — `signalType은 BUY, SELL, PASS (entry, exit 같은 값 금지)` — Explicit instruction that entry/exit is forbidden.

  **Known Out-of-Scope Inconsistencies** (DO NOT FIX, just be aware):
  - `/opt/coffeetree/apps/web/lib/strategy/workflow-types.ts:56` — `signalType: 'entry' | 'exit'` — still uses old enum. Separate fix needed.
  - `/opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts:1068-1071` — reads `=== 'entry'` and `=== 'exit'`. Separate fix needed.

  **Acceptance Criteria**:

  ```bash
  # Agent runs after edit:

  # 1. Verify signalType assignment changed
  grep -n "signalType" /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Assert: Line ~571 contains "signalType: nodeItem.id" (NO ternary, NO 'entry', NO 'exit')
  # Assert: Line ~577 contains "signalType: 'BUY'" (NOT 'entry')
  # Assert: Line ~793 is UNCHANGED (still has existingData.signalType === newData.signalType)

  # 2. Verify no leftover old values in the assignment lines
  grep -n "'entry'\|'exit'" /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Assert: No matches on lines 571 or 577 (other occurrences elsewhere are fine)

  # 3. LSP diagnostics (Task 3)
  ```

  **Commit**: YES (groups with Task 1 in a single commit)
  - Message: `fix(strategy): BB_PERCENT 블록 순서 정리 및 signalType 매핑 수정`
  - Files: `apps/web/lib/strategy/indicators.ts`, `apps/web/components/strategy/flow/index.tsx`
  - Pre-commit: LSP diagnostics clean

---

- [ ] 3. Run LSP diagnostics on both modified files

  **What to do**:
  1. Run LSP diagnostics (errors only) on `/opt/coffeetree/apps/web/lib/strategy/indicators.ts`
  2. Run LSP diagnostics (errors only) on `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx`
  3. If any NEW errors are introduced by the edits, report them. Pre-existing errors are acceptable.
  4. Both diagnostics can be run in parallel within this task.

  **Must NOT do**:
  - Do NOT run `tsc`, `npm test`, `npm build`, or any CLI build tools
  - Do NOT fix any errors found — only report them
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two LSP diagnostic calls, read-only verification
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Can interpret TypeScript diagnostic messages

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: No UI work
  - `git-master`: No git operations
  - `agent-browser`: No browser work

  **Parallelization**:
  - **Can Run In Parallel**: NO (must wait for Wave 1)
  - **Parallel Group**: Wave 2 (sequential after Task 1 + Task 2)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `/opt/coffeetree/apps/web/lib/strategy/indicators.ts` — File to check diagnostics on (Task 1 output)
  - `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx` — File to check diagnostics on (Task 2 output)

  **Acceptance Criteria**:

  ```bash
  # Agent runs lsp_diagnostics tool:
  lsp_diagnostics(file="/opt/coffeetree/apps/web/lib/strategy/indicators.ts", severity="error")
  # Assert: 0 new errors (pre-existing errors acceptable)

  lsp_diagnostics(file="/opt/coffeetree/apps/web/components/strategy/flow/index.tsx", severity="error")
  # Assert: 0 new errors (pre-existing errors acceptable)
  ```

  **Commit**: NO (read-only verification task)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 + 2 (grouped) | `fix(strategy): BB_PERCENT 블록 순서 정리 및 signalType 매핑 수정` | `apps/web/lib/strategy/indicators.ts`, `apps/web/components/strategy/flow/index.tsx` | LSP diagnostics (Task 3) |

---

## Success Criteria

### Verification Commands
```bash
# 1. BB_PERCENT ordering
grep -n "type: 'BOLLINGER_BANDS'\|type: 'BB_PERCENT'\|type: 'VOLUME'" /opt/coffeetree/apps/web/lib/strategy/indicators.ts
# Expected: BOLLINGER_BANDS < BB_PERCENT < VOLUME (line order)

# 2. No BB_PERCENT at old location
grep -c "BB_PERCENT" /opt/coffeetree/apps/web/lib/strategy/indicators.ts
# Expected: 1 (exactly one occurrence)

# 3. signalType uses nodeItem.id
grep "signalType" /opt/coffeetree/apps/web/components/strategy/flow/index.tsx | head -3
# Expected: Line ~571: signalType: nodeItem.id
# Expected: Line ~577: signalType: 'BUY'
# Expected: Line ~793: unchanged

# 4. No 'entry'/'exit' in signalType assignments
grep -n "signalType.*entry\|signalType.*exit" /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
# Expected: No matches (old values eliminated from assignment lines)
```

### Final Checklist
- [ ] BB_PERCENT immediately follows BOLLINGER_BANDS
- [ ] No artifact at old BB_PERCENT location
- [ ] signalType for signal nodes = nodeItem.id
- [ ] Default signalType = 'BUY'
- [ ] Dedup logic (line 793) untouched
- [ ] LSP diagnostics: 0 new errors in both files
- [ ] All "Must NOT Have" guardrails respected
