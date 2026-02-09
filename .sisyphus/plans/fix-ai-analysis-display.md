# Fix AI Analysis Result Display: Align Workflow Shapes & Add Null Safety

## TL;DR

> **Quick Summary**: The mock backtest data in `page.tsx` produces workflow nodes and trade objects with shapes that don't match what the API route and `StrategyAnalysis` component expect, causing the AI analysis to receive empty/wrong data and potentially crash. Fix by aligning the mock shapes to match the declared TypeScript interfaces and adding explicit `&&` null guards in the API route's workflow parser.
>
> **Deliverables**:
> - Mock workflow in `page.tsx` aligned to `AnalyzeBacktestRequest.workflow` shape
> - Mock trades in `page.tsx` converted from LONG/SHORT format to BUY/SELL format matching `StrategyAnalysisProps.trades`
> - Null-safe workflow parsing in `route.ts` using `&&` guards (no optional chaining)
> - Zero TypeScript errors on `next build`
>
> **Estimated Effort**: Short (1-2 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (mock workflow) + Task 2 (mock trades) → Task 3 (route null guards) → Task 4 (verification)

---

## Context

### Original Request
Fix AI analysis result display by aligning workflow shapes and adding safe null checks. Two files are the primary targets:
- `/opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts`
- `/opt/coffeetree/apps/web/app/(dashboard)/backtest/page.tsx`

A third file is relevant for understanding the expected type contract:
- `/opt/coffeetree/apps/web/components/backtest/strategy-analysis.tsx`

### Root Cause Analysis

**Three shape mismatches exist:**

1. **Mock workflow nodes** (`page.tsx:542-561`) produce `{id, type, name, config}` but the API route (`route.ts:278-295`) and `StrategyAnalysisProps` (`strategy-analysis.tsx:66-77`) expect `{id, type, data: Record<string,unknown>, parentId?}`. The mock also lacks an `edges` array entirely.

2. **Mock workflow node types** only include `'indicator'` and `'logic'`, but `route.ts:278-295` filters for `'indicator'`, `'operator'`, and `'area'`. The `'logic'` type is never matched.

3. **Mock trade shape** (`page.tsx:474-485`) uses `{entryDate, exitDate, side: 'LONG'|'SHORT', entryPrice, exitPrice, quantity, profit, profitPercent}` but `StrategyAnalysisProps.trades` (`strategy-analysis.tsx:79-87`) expects `{date: string, type: 'BUY'|'SELL', price: number, quantity: number, symbol?, profit?, profitPercent?}`.

### Metis Review
**Identified Gaps** (addressed):
- Path confirmation: Files are at `/opt/coffeetree/`, not `/opt/oh-my-claude-money/` — confirmed and referenced correctly
- Optional chaining convention: Verified — zero `?.` in target files; convention is `&&` guards
- Trade conversion semantics (LONG/SHORT → BUY/SELL): Resolved — see Trade Conversion Note in Task 2
- Mock `config` → `data` mapping: Confirmed — `config` content should move into `data` field
- No test infrastructure exists: Confirmed — no test files or test runner in package.json
- `edges` array: Empty `[]` is sufficient; `StrategyAnalysis` passes it through to API but no component renders edges directly

---

## Work Objectives

### Core Objective
Align mock data shapes to match the TypeScript interfaces consumed by the API route and StrategyAnalysis component, and add defensive null guards in the API route's workflow parser.

### Concrete Deliverables
- Updated `generateMockResults()` in `page.tsx` with correct workflow and trade shapes
- Updated `route.ts` workflow parsing with `&&` null guards on all `n.data.*` accesses
- Clean `next build` and zero LSP diagnostics

### Definition of Done
- [ ] `next build` completes with zero errors
- [ ] `lsp_diagnostics` on all 3 files returns zero errors
- [ ] No `?.` (optional chaining) introduced in any modified file
- [ ] `git diff --stat` shows exactly 2 files modified, 0 files created

### Must Have
- Mock workflow nodes use `{id, type, data: Record<string,unknown>}` shape
- Mock workflow has `edges: [{source, target}]` array
- Mock trades use `{date, type: 'BUY'|'SELL', price, quantity}` shape
- All `n.data.*` accesses in `route.ts` guarded with `&&` checks
- All `n.data.params.*` nested accesses in `route.ts` guarded with `&&` checks

### Must NOT Have (Guardrails)
- No optional chaining (`?.`) anywhere — use `x && x.prop && x.prop.nested` pattern
- No modification to `AnalyzeBacktestRequest` interface in `route.ts`
- No modification to `StrategyAnalysisProps` interface in `strategy-analysis.tsx`
- No modification to `AnalysisResult` interface in either file
- No new files created
- No new dependencies added
- No refactoring of component rendering logic in `strategy-analysis.tsx`
- No touching the AI prompt or Claude API call logic
- No mock data "improvements" beyond shape alignment (keep existing values)
- No extraction of mock data into separate files

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (zero test files, no test runner in package.json scripts)
- **User wants tests**: Manual verification only
- **Framework**: none
- **QA approach**: Automated verification via LSP diagnostics + `next build`

### Automated Verification (Agent-Executable)

**For each modified file** (using Bash + LSP):
```bash
# 1. LSP diagnostics - zero errors on each file
# Run lsp_diagnostics on:
#   /opt/coffeetree/apps/web/app/(dashboard)/backtest/page.tsx
#   /opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts
# Assert: 0 errors each

# 2. Full project build
cd /opt/coffeetree/apps/web && npx next build 2>&1 | tail -10
# Assert: "✓ Compiled successfully" or equivalent, zero error lines

# 3. No optional chaining introduced
grep -c '\?\.' /opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts
grep -c '\?\.' /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
# Assert: both return 0

# 4. Only expected files changed
cd /opt/coffeetree && git diff --stat
# Assert: only page.tsx and route.ts modified, 0 new files
```

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Fix mock workflow shape | None | Independent data-shape fix in `page.tsx` |
| Task 2: Fix mock trades shape | None | Independent data-shape fix in `page.tsx` (different function section) |
| Task 3: Add null guards to route.ts | None | Independent from mock fixes, but logically complementary |
| Task 4: Final verification | Tasks 1, 2, 3 | Build + LSP checks require all changes in place |

## Parallel Execution Graph

```
Wave 1 (Start Immediately):
├── Task 1: Fix mock workflow shape in page.tsx (no dependencies)
├── Task 2: Fix mock trades shape in page.tsx (no dependencies)
└── Task 3: Add null guards to route.ts workflow parsing (no dependencies)

Wave 2 (After Wave 1):
└── Task 4: Full verification (depends: Tasks 1, 2, 3)

Critical Path: Any of Tasks 1/2/3 → Task 4
Parallel Speedup: ~60% faster than sequential (3 tasks collapse to 1 wave)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4 | 2, 3 |
| 2 | None | 4 | 1, 3 |
| 3 | None | 4 | 1, 2 |
| 4 | 1, 2, 3 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | Tasks 1+2 can share one agent (same file); Task 3 separate agent |
| 2 | 4 | Single verification agent |

---

## TODOs

- [ ] 1. Fix mock workflow shape in `page.tsx`

  **What to do**:
  - In `generateMockResults()` at `page.tsx:537-562`, replace the current mock workflow object
  - Change each node from `{id, type, name, config: {...}}` to `{id, type, data: {...}, parentId?: undefined}`
  - Move the contents of `config` INTO `data`, AND add the type-specific keys the API route expects:
    - For `type: 'indicator'` nodes: `data: { indicatorType: 'RSI', params: { period: 14 }, period: 14 }`
    - For operator-like nodes (rename `'logic'` → `'operator'`): `data: { operatorType: 'condition', operator: 'AND', operation: 'compare' }`
  - Add an `edges` array connecting the nodes: `edges: [{ source: 'node-1', target: 'node-3' }, { source: 'node-2', target: 'node-3' }]`
  - Remove top-level `name`, `description`, `version` fields from mock workflow (they don't exist in `AnalyzeBacktestRequest.workflow`)
  - Keep `id` on the mock workflow object is harmless (not in the interface, but won't cause TS errors since it's passed loosely)

  **Must NOT do**:
  - Do not modify the `AnalyzeBacktestRequest` interface
  - Do not modify `StrategyAnalysisProps.workflow` type
  - Do not add new node types beyond what `route.ts` already handles (`indicator`, `operator`, `area`)
  - Do not use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file, focused data-shape change with clear before/after
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Needed for precise TypeScript object literal editing with strict mode compliance
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI changes, just data shapes
    - `git-master`: Commit is a separate concern (Task 4)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2 in same agent since same file; with Task 3 in parallel agent)
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `route.ts:31-41` — `AnalyzeBacktestRequest.workflow` interface: the AUTHORITATIVE shape that mock must match (`nodes: [{id, type, data: Record<string,unknown>, parentId?}], edges: [{source, target}]`)
  - `strategy-analysis.tsx:66-77` — `StrategyAnalysisProps.workflow` type: identical shape, confirms consistency
  - `route.ts:278-295` — How the API route consumes workflow: filters by `n.type === 'indicator'`, reads `n.data.indicatorType`, `n.data.params`, `n.data.period`; filters by `n.type === 'operator'`, reads `n.data.operatorType`, `n.data.operator`, `n.data.operation`; filters by `n.type === 'area'`, reads `n.data.areaType`

  **API/Type References**:
  - `route.ts:7-52` — Full `AnalyzeBacktestRequest` interface definition
  - `strategy-analysis.tsx:60-91` — Full `StrategyAnalysisProps` interface definition

  **WHY Each Reference Matters**:
  - `route.ts:31-41`: This is THE contract. The mock MUST produce this exact shape or the API route receives garbage
  - `route.ts:278-295`: Shows what `.data.*` fields the route actually reads — the mock must populate these fields or the AI prompt receives empty strings
  - `strategy-analysis.tsx:66-77`: Confirms the component prop type matches the API request type — consistency proof

  **Acceptance Criteria**:

  ```bash
  # Agent runs lsp_diagnostics on page.tsx
  # Assert: 0 errors

  # Agent verifies structurally:
  grep -A 5 "type: 'indicator'" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx | grep "data:"
  # Assert: match found (data field exists on indicator nodes)

  grep "edges:" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
  # Assert: match found (edges array exists)

  grep "indicatorType" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
  # Assert: match found (data contains indicatorType key)
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `fix: align mock workflow shape to AnalyzeBacktestRequest interface`
  - Files: `apps/web/app/(dashboard)/backtest/page.tsx`
  - Pre-commit: `lsp_diagnostics` clean on page.tsx

---

- [ ] 2. Fix mock trades shape and add trade conversion note in `page.tsx`

  **What to do**:
  - In `generateMockResults()` at `page.tsx:453-486`, the mock trades currently produce:
    ```
    { id, symbol, entryDate, exitDate, side: 'LONG'|'SHORT', entryPrice, exitPrice, quantity, profit, profitPercent }
    ```
  - The `StrategyAnalysisProps.trades` expects:
    ```
    { date: string, type: 'BUY'|'SELL', price: number, quantity: number, symbol?, profit?, profitPercent? }
    ```
  - **Trade Conversion Note**: Each mock trade represents a round-trip (entry+exit). The API route and StrategyAnalysis expect individual trade legs. For simplicity in the mock, produce **two entries per round-trip trade**: one BUY-leg and one SELL-leg. For `side === 'LONG'`: entry is BUY, exit is SELL. For `side === 'SHORT'`: entry is SELL, exit is BUY.
  - Transform the mock loop to produce TWO objects per iteration:
    ```
    // For LONG:
    { date: entryDate, type: 'BUY',  price: entryPrice, quantity, symbol }
    { date: exitDate,  type: 'SELL', price: exitPrice,  quantity, symbol, profit, profitPercent }
    // For SHORT:
    { date: entryDate, type: 'SELL', price: entryPrice, quantity, symbol }
    { date: exitDate,  type: 'BUY',  price: exitPrice,  quantity, symbol, profit, profitPercent }
    ```
  - **IMPORTANT**: The `results.trades` is also used in JSX at `page.tsx:99,120,253` for `.length` — this is fine, the array just doubles in size.
  - The `results.trades` is also passed to `<TradeTable>` at line 333 — **check if TradeTable expects the old shape or the new shape**. If TradeTable expects the old shape (entryPrice/exitPrice/side), keep a SEPARATE `rawTrades` array for TradeTable and a converted `trades` array for StrategyAnalysis. However, since `results` is typed as `any`, both can coexist.
  - **Simplest approach**: Keep the existing trade generation loop producing the old shape in a local array, then `.flatMap()` to produce the BUY/SELL format for the `trades` field. Pass the original array to `TradeTable` if needed.

  **Must NOT do**:
  - Do not modify `StrategyAnalysisProps.trades` type definition
  - Do not modify the metrics calculations (they use the raw trade data)
  - Do not use optional chaining
  - Do not change trade generation logic/randomization (only the output shape)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused data transformation in a single function
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Precise array transformation with TypeScript compatibility
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI changes
    - `data-scientist`: Not data analysis, just shape transformation

  **Parallelization**:
  - **Can Run In Parallel**: YES (same file as Task 1 — best to run sequentially with Task 1 in same agent to avoid file conflicts)
  - **Parallel Group**: Wave 1 (sequential with Task 1 in one agent)
  - **Blocks**: Task 4
  - **Blocked By**: None (but should be sequenced with Task 1 to avoid file conflict)

  **References**:

  **Pattern References**:
  - `page.tsx:453-486` — Current mock trade generation loop: produces `{id, symbol, entryDate, exitDate, side, entryPrice, exitPrice, quantity, profit, profitPercent}`
  - `page.tsx:488-534` — Metrics calculation block: uses `trades.filter(t => t.profit > 0)` etc. — must not break these accesses
  - `page.tsx:99,120,253` — JSX references to `results.trades.length` — shape-agnostic, safe
  - `page.tsx:333` — `<TradeTable trades={results.trades} />` — may need the old shape; check TradeTable component

  **API/Type References**:
  - `strategy-analysis.tsx:79-87` — `StrategyAnalysisProps.trades` type: `{date, type: 'BUY'|'SELL', price, quantity, symbol?, profit?, profitPercent?}`
  - `route.ts:43-51` — `AnalyzeBacktestRequest.trades` type: `{date, type: 'BUY'|'SELL', price, quantity, symbol?, profit?, profitPercent?}` — identical

  **WHY Each Reference Matters**:
  - `strategy-analysis.tsx:79-87`: THE target contract. Trades must match this exactly or the component crashes/displays wrong data
  - `page.tsx:488-534`: Metrics calculation reads `.profit`, `.profitPercent` from trades — must remain intact or metrics break
  - `page.tsx:333`: TradeTable may expect old format — need to check and potentially keep both formats

  **Acceptance Criteria**:

  ```bash
  # Agent runs lsp_diagnostics on page.tsx
  # Assert: 0 errors

  # Structural verification:
  grep "'BUY'" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
  # Assert: match found

  grep "'SELL'" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
  # Assert: match found

  # Verify no LONG/SHORT in the final trades output:
  # (LONG/SHORT may still exist in intermediate generation — that's fine)
  # The key check is that `results.trades` items have `type: 'BUY'|'SELL'`
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `fix: convert mock trades to BUY/SELL format matching StrategyAnalysis contract`
  - Files: `apps/web/app/(dashboard)/backtest/page.tsx`
  - Pre-commit: `lsp_diagnostics` clean on page.tsx

---

- [ ] 3. Add `&&` null guards to workflow parsing in `route.ts`

  **What to do**:
  - In `route.ts:277-304`, the workflow parsing section accesses `n.data.*` properties without null guards
  - Add explicit `&&` null-check guards to prevent crashes when nodes have missing/undefined `data`
  
  **Specific lines to guard:**
  
  Line 279 filter: `n.type === 'indicator'` — safe (type is a direct property)
  
  Line 280-285 map function:
  ```typescript
  // BEFORE (current):
  .map((n: { data: Record<string, unknown> }) => {
    const iType = String(n.data.indicatorType || 'UNKNOWN');
    const params = (n.data.params as Record<string, unknown>) || {};
    const period = n.data.period || params.period || '';
    return period ? `${iType}(${period})` : iType;
  });
  ```
  ```typescript
  // AFTER (with && guards):
  .map((n: { data: Record<string, unknown> }) => {
    const d = n.data || {};
    const iType = String(d.indicatorType || 'UNKNOWN');
    const params = (d.params && typeof d.params === 'object' ? d.params : {}) as Record<string, unknown>;
    const period = d.period || (params && params.period) || '';
    return period ? `${iType}(${period})` : iType;
  });
  ```

  Line 287-291 operator map:
  ```typescript
  // BEFORE:
  .map((n: { data: Record<string, unknown> }) => {
    const opType = String(n.data.operatorType || '');
    const op = String(n.data.operator || n.data.operation || '');
    return `${opType}/${op}`;
  });
  ```
  ```typescript
  // AFTER:
  .map((n: { data: Record<string, unknown> }) => {
    const d = n.data || {};
    const opType = String(d.operatorType || '');
    const op = String(d.operator || d.operation || '');
    return `${opType}/${op}`;
  });
  ```

  Line 293-295 area map:
  ```typescript
  // BEFORE:
  .map((n: { data: Record<string, unknown> }) => String(n.data.areaType || ''));
  ```
  ```typescript
  // AFTER:
  .map((n: { data: Record<string, unknown> }) => {
    const d = n.data || {};
    return String(d.areaType || '');
  });
  ```

  Also guard the top-level check at line 277:
  ```typescript
  // BEFORE:
  if (workflow && workflow.nodes) {
  ```
  ```typescript
  // AFTER (add edges guard too):
  if (workflow && workflow.nodes && Array.isArray(workflow.nodes)) {
  ```

  And guard `workflow.edges.length` at line 304:
  ```typescript
  // BEFORE:
  엣지 수: ${workflow.edges.length}개
  // AFTER:
  엣지 수: ${workflow.edges && Array.isArray(workflow.edges) ? workflow.edges.length : 0}개
  ```

  **Must NOT do**:
  - Do not use `?.` optional chaining
  - Do not modify the `AnalyzeBacktestRequest` interface
  - Do not restructure the filter/map logic
  - Do not add handling for new node types (e.g., `'logic'`)
  - Do not change the prompt template text

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Surgical null-guard additions in a single file section
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: TypeScript null-safety patterns with strict mode
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Backend API route, no UI
    - `git-master`: Commit handling is in Task 4

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1+2)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `route.ts:277-304` — The entire workflow parsing block to be guarded
  - `strategy-analysis.tsx:261-295` — The `handleAnalyze` function's `ensuredData` block: shows the project's established pattern for null-safe data construction using `(x && x.y && x.y.z) || fallback` — follow this EXACT pattern

  **API/Type References**:
  - `route.ts:29-41` — `AnalyzeBacktestRequest.workflow` type: `nodes[].data` is `Record<string, unknown>` — meaning any key could be undefined at runtime even though the type allows access
  - `route.ts:246-250` — The `safe()` helper function: shows existing project pattern for defensive value handling

  **WHY Each Reference Matters**:
  - `route.ts:277-304`: These are the exact lines to modify. Every `n.data.*` access is a potential null-pointer if a node has `data: undefined` or `data: {}`
  - `strategy-analysis.tsx:261-295`: The `ensuredData` block is the project's null-guard TEMPLATE. It uses `(raw.sections && raw.sections.profitability && raw.sections.profitability.title) || fallback`. Follow this exact style for consistency.
  - `route.ts:246-250`: The `safe()` helper confirms the project prefers explicit fallback patterns over optional chaining

  **Acceptance Criteria**:

  ```bash
  # Agent runs lsp_diagnostics on route.ts
  # Assert: 0 errors

  # No optional chaining introduced:
  grep -c '\?\.' /opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts
  # Assert: 0

  # Guards exist:
  grep "n.data || {}" /opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts
  # Assert: 3 matches (one per map function: indicator, operator, area)

  grep "Array.isArray" /opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts
  # Assert: at least 1 match (for nodes or edges check)
  ```

  **Commit**: YES
  - Message: `fix: add null-safe guards to workflow parsing in analyze-backtest route`
  - Files: `apps/web/app/api/ai/analyze-backtest/route.ts`
  - Pre-commit: `lsp_diagnostics` clean on route.ts

---

- [ ] 4. Full verification pass

  **What to do**:
  - Run `lsp_diagnostics` on all three files
  - Run `next build` to confirm zero TypeScript errors
  - Grep for `?.` in modified files to confirm no optional chaining
  - Run `git diff --stat` to confirm only expected files changed

  **Must NOT do**:
  - Do not create test files
  - Do not modify any code in this task

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification-only, no code changes
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands TypeScript build output and diagnostics
  - **Skills Evaluated but Omitted**:
    - All others: No code changes, no UI, no git operations needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - All three target files for diagnostics:
    - `/opt/coffeetree/apps/web/app/(dashboard)/backtest/page.tsx`
    - `/opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts`
    - `/opt/coffeetree/apps/web/components/backtest/strategy-analysis.tsx`
  - `/opt/coffeetree/apps/web/tsconfig.json` — confirms `strict: true` (line 8), so build will catch type errors

  **WHY Each Reference Matters**:
  - `tsconfig.json` strict mode: Ensures the build will fail on any shape mismatch we missed
  - All three files: Need diagnostics on the component too to confirm it still compiles with no downstream issues

  **Acceptance Criteria**:

  ```bash
  # 1. LSP diagnostics on each file
  # lsp_diagnostics("/opt/coffeetree/apps/web/app/(dashboard)/backtest/page.tsx")
  # Assert: 0 errors

  # lsp_diagnostics("/opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts")
  # Assert: 0 errors

  # lsp_diagnostics("/opt/coffeetree/apps/web/components/backtest/strategy-analysis.tsx")
  # Assert: 0 errors

  # 2. Full build
  cd /opt/coffeetree/apps/web && npx next build 2>&1 | tail -10
  # Assert: contains "Compiled successfully" or similar success indicator
  # Assert: zero lines containing "error" or "Error" (case-insensitive grep)

  # 3. No optional chaining
  grep -rn '\?\.' /opt/coffeetree/apps/web/app/api/ai/analyze-backtest/route.ts /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
  # Assert: 0 matches

  # 4. Only expected files changed
  cd /opt/coffeetree && git diff --stat
  # Assert: shows page.tsx and route.ts only (2 files changed)
  # Assert: no new files (git status --short | grep '^?' returns empty)
  ```

  **Evidence to Capture:**
  - [ ] `next build` terminal output (last 10 lines)
  - [ ] `lsp_diagnostics` output for each file
  - [ ] `grep` output confirming no optional chaining
  - [ ] `git diff --stat` output

  **Commit**: NO (verification only, no changes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 + 2 (combined) | `fix: align mock workflow and trade shapes to match AI analysis interfaces` | `apps/web/app/(dashboard)/backtest/page.tsx` | `lsp_diagnostics` clean |
| 3 | `fix: add null-safe guards to workflow parsing in analyze-backtest route` | `apps/web/app/api/ai/analyze-backtest/route.ts` | `lsp_diagnostics` clean |
| 4 | (no commit — verification only) | — | `next build` success |

---

## Risk Notes

| Risk | Impact | Mitigation |
|------|--------|------------|
| `<TradeTable>` expects old trade shape (`entryPrice/exitPrice/side`) | TradeTable breaks at render | Keep original trade array for TradeTable; pass converted array only to StrategyAnalysis. Check TradeTable props before committing. |
| Metrics calculation in `page.tsx:488-534` depends on `.profit`, `.profitPercent` on trades | Metrics display wrong values | Compute metrics from raw trades BEFORE conversion; only convert the final `trades` field in the returned object |
| `next build` may reveal pre-existing errors unrelated to this fix | False positive blocking verification | Check `git stash` to compare with pre-change build |
| Mock `edges` array with actual connections may not match real workflow topology | Minor: AI gets slightly misleading workflow info | Acceptable for mock data — edges primarily affect AI prompt text, not rendering |

---

## Success Criteria

### Verification Commands
```bash
# Zero TypeScript errors
cd /opt/coffeetree/apps/web && npx next build 2>&1 | grep -iE "error" | wc -l
# Expected: 0

# Zero LSP diagnostics errors
# (run via lsp_diagnostics tool on each file)

# No optional chaining
grep -c '\?\.' apps/web/app/api/ai/analyze-backtest/route.ts apps/web/app/\(dashboard\)/backtest/page.tsx
# Expected: 0 for both files

# Only 2 files modified
git diff --name-only | wc -l
# Expected: 2
```

### Final Checklist
- [ ] All "Must Have" items present (workflow shape, trades shape, null guards)
- [ ] All "Must NOT Have" items absent (no `?.`, no interface changes, no new files, no new deps)
- [ ] `next build` passes with zero errors
- [ ] `lsp_diagnostics` clean on all 3 files
- [ ] `git diff --stat` shows only `page.tsx` and `route.ts`
