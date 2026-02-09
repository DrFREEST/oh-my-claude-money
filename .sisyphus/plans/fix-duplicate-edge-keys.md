# Fix Duplicate Edge Key Warnings During AI Strategy Regeneration

## TL;DR

> **Quick Summary**: Fix React Flow duplicate edge key warning (`edge-i9j0`) caused by `setEdges` appending AI-generated edges without regenerating unique IDs. The fix regenerates edge IDs with `timestamp+random` suffixes during the mapping step.
> 
> **Deliverables**:
> - Modified edge mapping block in `index.tsx` (lines 879-884) to produce unique edge IDs
> - Zero duplicate edge key warnings in console after AI regeneration
> - Clean `npx tsc --noEmit` pass
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - 3 sequential tasks (single-file, tightly coupled)
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request

Fix duplicate edge key warning `edge-i9j0` during AI strategy regeneration in `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx`.

### Root Cause Analysis

**File**: `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx`
**Location**: Lines 861-888

The AI generates edges with fixed IDs (e.g. `edge-i9j0`). When the user regenerates a strategy, `setEdges((prevEdges) => [...prevEdges, ...mappedEdges])` appends newly mapped edges to the existing edge array. Because edge IDs are never regenerated, the same `edge.id` values appear multiple times, triggering React Flow's duplicate key warning.

**Current code** (lines 879-886):
```typescript
return {
  ...edge,
  source: areaIdMapping[edge.source] || edge.source,
  target: areaIdMapping[edge.target] || edge.target,
  ...(condition ? { type: edgeType, style: edgeStyle, data: { ...edgeData } } : {}),
};
// ...
setEdges((prevEdges) => [...prevEdges, ...mappedEdges]);
```

**Problem**: The spread `...edge` preserves the original `edge.id`, which is identical across regenerations.

### Constraints (User-Specified)

1. **No optional chaining** — Do not introduce `?.` operators
2. **Regenerate unique edge IDs before `setEdges`** — ID generation happens inside the `.map()` callback
3. **Run `npx tsc --noEmit` after change** — Must pass with zero errors
4. **Single file change only** — No additional files unless strictly necessary

---

## Work Objectives

### Core Objective

Eliminate duplicate edge key warnings by generating unique edge IDs (`{timestamp}-{random}` suffix) during the edge mapping step, before edges are appended via `setEdges`.

### Concrete Deliverables

- Modified `newEdges.map(edge => { ... })` block at line 879 to override `edge.id` with a unique value
- Clean TypeScript compilation

### Definition of Done

- [ ] `npx tsc --noEmit` exits 0 in `/opt/coffeetree/apps/web`
- [ ] No `duplicate edge key` console warnings after regenerating AI strategy twice
- [ ] No optional chaining (`?.`) introduced in the change

### Must Have

- Unique edge ID per mapped edge using pattern: `${edge.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
- ID override applied inside the existing `.map()` callback (line 879-884)
- Source/target mapping preserved exactly as-is

### Must NOT Have (Guardrails)

- No optional chaining (`?.`) anywhere in the change
- No new utility files or imports unless strictly required
- No changes to edge styling/condition logic
- No changes to `setEdges` call pattern (keep `prevEdges => [...prevEdges, ...mappedEdges]`)
- No changes outside lines 861-888 region

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (TypeScript compiler)
- **User wants tests**: Automated verification via `npx tsc --noEmit`
- **Framework**: TypeScript compiler (type checking only)

### Automated Verification

Each task includes executable verification. No user intervention required.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Standalone code change in edge mapping block |
| Task 2 | Task 1 | Type-check requires the code change to exist |
| Task 3 | Task 2 | Runtime verification requires passing compilation |

## Parallel Execution Graph

```
Wave 1 (Sequential - single file, tightly coupled):
  Task 1: Modify edge mapping to regenerate unique IDs
    ↓
  Task 2: Run npx tsc --noEmit and fix any type errors
    ↓
  Task 3: Verify no duplicate key warnings at runtime

Critical Path: Task 1 → Task 2 → Task 3
Parallel Speedup: N/A (sequential dependency chain)
```

## Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 3 | None |
| 3 | 2 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 (sequential) | delegate_task(category="quick", load_skills=["typescript-programmer"], run_in_background=false) |

---

## TODOs

- [ ] 1. Regenerate unique edge IDs in the mapping block

  **What to do**:
  - In `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx`, locate the edge mapping at lines 879-884
  - Inside the `newEdges.map(edge => { ... })` callback, override `edge.id` with a unique value
  - **Exact change**: In the return object (line 879-884), add an `id` property that overrides the spread:

    ```typescript
    return {
      ...edge,
      id: `${edge.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: areaIdMapping[edge.source] || edge.source,
      target: areaIdMapping[edge.target] || edge.target,
      ...(condition ? { type: edgeType, style: edgeStyle, data: { ...edgeData } } : {}),
    };
    ```

  - The `id` line MUST come AFTER `...edge` to override the spread value
  - Do NOT use optional chaining anywhere
  - Do NOT modify the `setEdges` call on line 886
  - Do NOT modify the condition/style logic (lines 869-877)

  **Must NOT do**:
  - No optional chaining (`?.`)
  - No changes outside lines 863-886
  - No new imports or utility files
  - No changes to edge styling or condition logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line addition in a known location; trivial complexity
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Ensures correct TypeScript syntax and type safety for the edge ID override
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI/visual changes involved
    - `git-master`: Commit handled in Task 3
    - `svelte-programmer`: Not a Svelte project
    - All others: No domain overlap with a single-line TypeScript edit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, Step 1)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx:879-884` — Current return object in `newEdges.map()`. The `id` override line goes here, after `...edge` spread.

  **API/Type References** (contracts to implement against):
  - `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx:863` — `newEdges.map(edge => {` — the `edge` parameter shape (has `.id`, `.source`, `.target`, `.type`, `.data`)
  - React Flow `Edge` type expects `id: string` — any string is valid

  **WHY Each Reference Matters**:
  - Line 879-884: This is the EXACT location to insert the `id` override. The executor must place `id:` after `...edge` and before `source:`.
  - Line 863: Shows the edge parameter type to confirm `edge.id` exists and is a string.

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -n 'Date.now()' /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Assert: Returns line ~880 showing the new id generation
  
  grep -n '\?\.' /opt/coffeetree/apps/web/components/strategy/flow/index.tsx | head -5
  # Assert: No NEW optional chaining introduced in the changed lines (existing ones elsewhere are OK)
  ```

  **Commit**: NO (groups with Task 2)

---

- [ ] 2. Verify TypeScript compilation passes

  **What to do**:
  - Run `npx tsc --noEmit` from `/opt/coffeetree/apps/web`
  - If errors exist in the modified file, fix them immediately
  - Common potential issues:
    - Type mismatch if `edge.id` is not typed as `string` (unlikely — React Flow Edge.id is string)
    - Template literal type issues (none expected)
  - Re-run until zero errors in the modified file

  **Must NOT do**:
  - Do not suppress errors with `@ts-ignore` or `any` casts
  - Do not modify tsconfig settings

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running a single CLI command and reading output
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Can interpret and fix any tsc errors in the modified code
  - **Skills Evaluated but Omitted**:
    - All others: No domain overlap with a tsc verification step

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, Step 2)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Config References**:
  - `/opt/coffeetree/apps/web/tsconfig.json` — TypeScript config for the web app; determines compilation strictness

  **WHY Each Reference Matters**:
  - tsconfig.json: If tsc fails, the executor needs to check compiler options (strict mode, etc.) to understand the error

  **Acceptance Criteria**:

  ```bash
  # Agent runs from /opt/coffeetree/apps/web:
  npx tsc --noEmit 2>&1 | grep -c "error TS"
  # Assert: Output is "0" (zero TypeScript errors)
  
  npx tsc --noEmit 2>&1
  # Assert: Exit code 0
  ```

  **Commit**: NO (groups with Task 3)

---

- [ ] 3. Final verification and commit

  **What to do**:
  - Confirm the change is minimal and correct by reviewing the diff
  - Run `git diff` to verify only the expected line was added
  - Commit with message: `fix(strategy): regenerate unique edge IDs to prevent duplicate key warnings`
  - Files: `apps/web/components/strategy/flow/index.tsx`

  **Must NOT do**:
  - Do not include unrelated changes in the commit

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Git diff review + single commit
  - **Skills**: [`git-master`]
    - `git-master`: Ensures atomic commit with proper message format
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code changes in this task
    - All others: No domain overlap

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, Step 3)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **File References**:
  - `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx` — The ONLY file that should appear in the diff

  **WHY Each Reference Matters**:
  - The executor must verify the diff shows exactly ONE new line (the `id:` property) and nothing else

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  git diff --stat apps/web/components/strategy/flow/index.tsx
  # Assert: Shows 1 file changed, ~1 insertion
  
  git diff apps/web/components/strategy/flow/index.tsx | grep '^+' | grep -v '^+++' | wc -l
  # Assert: Output is "1" (exactly one line added)
  ```

  **Evidence to Capture:**
  - [ ] `git diff` output showing the single-line addition
  - [ ] `npx tsc --noEmit` clean output (from Task 2)

  **Commit**: YES
  - Message: `fix(strategy): regenerate unique edge IDs to prevent duplicate key warnings`
  - Files: `apps/web/components/strategy/flow/index.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 3 | `fix(strategy): regenerate unique edge IDs to prevent duplicate key warnings` | `apps/web/components/strategy/flow/index.tsx` | `npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands

```bash
# Type check (MUST pass)
cd /opt/coffeetree/apps/web && npx tsc --noEmit
# Expected: exit code 0, no errors

# Verify change exists
grep 'Date.now()' /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
# Expected: line with timestamp+random edge ID generation

# Verify no optional chaining introduced
git diff apps/web/components/strategy/flow/index.tsx | grep '\?\.'
# Expected: no output (no optional chaining in diff)
```

### Final Checklist

- [ ] `id: \`${edge.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}\`` present in edge mapping return object
- [ ] `id` line placed AFTER `...edge` spread (to override)
- [ ] No optional chaining (`?.`) introduced
- [ ] `npx tsc --noEmit` exits 0
- [ ] Only `index.tsx` modified
- [ ] Commit made with proper fix message
