# UI: Conditional Comparator Description + Handle Size Increase

## TL;DR

> **Quick Summary**: Two targeted UI changes in the strategy flow builder — make the comparator description text dynamic based on the selected operation, and increase node handle size for better usability.
> 
> **Deliverables**:
> - Conditional operation-specific description text in the property panel comparator section
> - Larger handle size (w-5 h-5) on all base node handles
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves (tasks are independent)
> **Critical Path**: Task 1 and Task 2 are independent → Wave 1 only

---

## Context

### Original Request
Two UI updates:
1. Comparator description text in `property-panel.tsx` should be conditional on the selected `operation` value (currently static)
2. Handle size in `base-node.tsx` should increase from `w-3 h-3` to `w-5 h-5`

### Interview Summary
**Key Discussions**:
- Current static text at line 336-338: `"입력 A와 입력 B를 비교합니다"` — must show operation-specific descriptions
- 8 comparison operations exist in `operators.ts` with pre-defined Korean descriptions
- Handle size at line 152 applies to all handles (source + target) — both should grow

**Research Findings**:
- `COMPARISON_OPERATORS` array in `operators.ts` contains `{ value, label, symbol, description }` for all 8 operations
- `currentNode.nodeData.operation` holds the operation value string (e.g., `'GREATER_THAN'`)
- The description section is already inside a block conditioned on `operatorType === 'comparison'`
- `operators.ts` exports `COMPARISON_OPERATORS` — needs to be imported in `property-panel.tsx`

### Metis Review
**Identified Gaps** (addressed):
- **Fallback text**: When `operation` is undefined/null or doesn't match, fall back to the original static text
- **Import needed**: `COMPARISON_OPERATORS` must be imported from `operators.ts` into `property-panel.tsx`
- **Scope guard**: Only change `w-3 h-3` → `w-5 h-5`, touch nothing else in that className

---

## Work Objectives

### Core Objective
Make the property panel show operation-aware descriptions and enlarge node handles for better UX.

### Concrete Deliverables
- Modified `property-panel.tsx`: conditional description text based on `currentNode.nodeData.operation`
- Modified `base-node.tsx`: handle size `w-5 h-5` instead of `w-3 h-3`

### Definition of Done
- [ ] Build passes with zero errors
- [ ] `property-panel.tsx` shows operation-specific descriptions
- [ ] `base-node.tsx` handles are `w-5 h-5`
- [ ] No regressions in other node types

### Must Have
- Fallback to original static text when operation is unknown/undefined
- Import of `COMPARISON_OPERATORS` from `operators.ts`
- Only width/height change on handles — no other style changes

### Must NOT Have (Guardrails)
- Do NOT create new files, components, or utility functions
- Do NOT modify `operators.ts`
- Do NOT refactor the surrounding conditional rendering structure
- Do NOT change handle colors, borders, or other styles beyond w/h
- Do NOT add i18n/translation layers
- Do NOT add tooltips, hover states, or animations to the description
- Do NOT create a reusable `getOperatorDescription()` utility

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: Not assessed (out of scope per user)
- **User wants tests**: Manual-only (UI change)
- **Framework**: N/A

### Automated Verification (Agent-Executable)

**For both tasks (using Bash):**
```bash
# 1. Build passes
cd /opt/coffeetree && bun run build 2>&1 | tail -10
# Assert: zero errors

# 2. Old handle size removed
grep -n 'w-3 h-3' /opt/coffeetree/apps/web/components/strategy/flow/nodes/base-node.tsx
# Assert: zero matches

# 3. New handle size present
grep -n 'w-5 h-5' /opt/coffeetree/apps/web/components/strategy/flow/nodes/base-node.tsx
# Assert: at least one match

# 4. LSP diagnostics clean
# Run lsp_diagnostics on property-panel.tsx → zero type errors
# Run lsp_diagnostics on base-node.tsx → zero type errors
```

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Independent — property-panel.tsx only |
| Task 2 | None | Independent — base-node.tsx only |

## Parallel Execution Graph

```
Wave 1 (Start immediately — both independent):
├── Task 1: Conditional comparator description (property-panel.tsx)
└── Task 2: Handle size increase (base-node.tsx)

Critical Path: None (both are leaf tasks)
Parallel Speedup: 2x vs sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | None | 2 |
| 2 | None | None | 1 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | delegate_task(category="quick", load_skills=["frontend-ui-ux"], run_in_background=true) × 2 |

---

## TODOs

- [ ] 1. Conditional comparator description text

  **What to do**:
  1. Add import for `COMPARISON_OPERATORS` from `@/lib/strategy/operators` at the top of `property-panel.tsx`
  2. Replace the static `<p>` tag at lines 336-338 with conditional JSX:
     - Look up `currentNode.nodeData.operation` in `COMPARISON_OPERATORS`
     - Display the matching `description` field
     - Fall back to `'입력 A와 입력 B를 비교합니다'` when no match
  3. Specifically, replace:
     ```tsx
     <p className="text-gray-400 mt-1">
       입력 A와 입력 B를 비교합니다
     </p>
     ```
     With:
     ```tsx
     <p className="text-gray-400 mt-1">
       {COMPARISON_OPERATORS.find(op => op.value === currentNode.nodeData?.operation)?.description ?? '입력 A와 입력 B를 비교합니다'}
     </p>
     ```

  **Must NOT do**:
  - Do NOT create helper functions or new files
  - Do NOT restructure the surrounding conditional block
  - Do NOT modify `operators.ts`
  - Do NOT add i18n, tooltips, or hover effects

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, single-line change + one import — trivial scope
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React JSX pattern for conditional rendering in UI
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not needed — no complex type logic, just a `.find()` call
    - `git-master`: Commit handled in commit strategy section

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `/opt/coffeetree/apps/web/components/strategy/flow/panels/property-panel.tsx:336-338` — Current static description text to replace. This `<p>` tag sits inside the comparison operator info block.
  - `/opt/coffeetree/apps/web/components/strategy/flow/panels/property-panel.tsx:299` — The conditional block `currentNode.nodeData.operatorType === 'comparison'` that wraps this section. Do NOT modify this condition.
  - `/opt/coffeetree/apps/web/components/strategy/flow/panels/property-panel.tsx:8-28` — Existing import block. Add the new import here.

  **API/Type References** (contracts to implement against):
  - `/opt/coffeetree/apps/web/lib/strategy/operators.ts:30-79` — `COMPARISON_OPERATORS` array with `{ value, label, symbol, description }` objects for all 8 operations. The `value` field matches `currentNode.nodeData.operation`. The `description` field is the Korean text to display.

  **Documentation References**:
  - `/opt/coffeetree/apps/web/components/strategy/flow/nodes/README.md` — Operator node data structure shows `operation` field in node data

  **WHY Each Reference Matters**:
  - `property-panel.tsx:336-338`: This is the EXACT line to replace — executor must match this string precisely for the Edit operation
  - `operators.ts:30-79`: Source of truth for operation descriptions — executor uses `.find()` to look up by `value`
  - `property-panel.tsx:299`: Context for understanding the conditional nesting — executor must NOT change this wrapping condition

  **Acceptance Criteria**:

  **Automated Verification:**
  ```bash
  # Build must pass
  cd /opt/coffeetree && bun run build 2>&1 | tail -10
  # Assert: zero errors

  # Static text no longer hardcoded as the only option
  grep -c 'COMPARISON_OPERATORS' /opt/coffeetree/apps/web/components/strategy/flow/panels/property-panel.tsx
  # Assert: at least 1 (import exists)
  ```

  ```
  # LSP diagnostics:
  lsp_diagnostics on /opt/coffeetree/apps/web/components/strategy/flow/panels/property-panel.tsx
  # Assert: zero type errors
  ```

  **Evidence to Capture:**
  - [ ] Build output showing zero errors
  - [ ] LSP diagnostics output showing zero errors on property-panel.tsx

  **Commit**: YES (groups with Task 2)
  - Message: `fix(strategy): conditional comparator description and larger handles`
  - Files: `apps/web/components/strategy/flow/panels/property-panel.tsx`
  - Pre-commit: `bun run build`

---

- [ ] 2. Increase handle size from w-3 h-3 to w-5 h-5

  **What to do**:
  1. In `base-node.tsx` at line 152, change the Handle className from `'w-3 h-3 rounded-full border-2'` to `'w-5 h-5 rounded-full border-2'`
  2. Only change `w-3 h-3` → `w-5 h-5`. Do NOT touch `rounded-full`, `border-2`, or any conditional classes.

  **Must NOT do**:
  - Do NOT change handle colors (`bg-blue-500 border-blue-600` / `bg-gray-400 border-gray-500`)
  - Do NOT add animations or transitions
  - Do NOT modify any other line in the file
  - Do NOT change handle label positioning

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single CSS class substitution in one line — trivial
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Understanding of Tailwind sizing classes for UI elements
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No TypeScript logic involved — pure CSS class change
    - `git-master`: Commit handled in commit strategy section

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `/opt/coffeetree/apps/web/components/strategy/flow/nodes/base-node.tsx:151-156` — The Handle component's className prop. Line 152 has the `'w-3 h-3 rounded-full border-2'` string. This is the EXACT oldString for the Edit operation.

  **Documentation References**:
  - `/opt/coffeetree/apps/web/components/strategy/flow/nodes/README.md` — BaseNode component docs confirm Handle rendering structure

  **WHY Each Reference Matters**:
  - `base-node.tsx:151-156`: Executor must precisely identify this className string to perform the Edit. The `cn()` utility wraps it, so the exact string match within the template literal is critical.

  **Acceptance Criteria**:

  **Automated Verification:**
  ```bash
  # Old size gone
  grep -c 'w-3 h-3' /opt/coffeetree/apps/web/components/strategy/flow/nodes/base-node.tsx
  # Assert: 0 matches

  # New size present
  grep -c 'w-5 h-5' /opt/coffeetree/apps/web/components/strategy/flow/nodes/base-node.tsx
  # Assert: at least 1 match

  # Build passes
  cd /opt/coffeetree && bun run build 2>&1 | tail -10
  # Assert: zero errors
  ```

  ```
  # LSP diagnostics:
  lsp_diagnostics on /opt/coffeetree/apps/web/components/strategy/flow/nodes/base-node.tsx
  # Assert: zero type errors
  ```

  **Evidence to Capture:**
  - [ ] grep output confirming `w-3 h-3` absent and `w-5 h-5` present
  - [ ] Build output showing zero errors

  **Commit**: YES (groups with Task 1)
  - Message: `fix(strategy): conditional comparator description and larger handles`
  - Files: `apps/web/components/strategy/flow/nodes/base-node.tsx`
  - Pre-commit: `bun run build`

---

## Commit Strategy

| After Tasks | Message | Files | Verification |
|-------------|---------|-------|--------------|
| 1 + 2 | `fix(strategy): conditional comparator description and larger handles` | `apps/web/components/strategy/flow/panels/property-panel.tsx`, `apps/web/components/strategy/flow/nodes/base-node.tsx` | `bun run build` |

---

## Success Criteria

### Verification Commands
```bash
# Build passes
cd /opt/coffeetree && bun run build
# Expected: zero errors

# Handle size updated
grep 'w-5 h-5' apps/web/components/strategy/flow/nodes/base-node.tsx
# Expected: at least 1 match

# Old handle size removed
grep 'w-3 h-3' apps/web/components/strategy/flow/nodes/base-node.tsx
# Expected: 0 matches

# COMPARISON_OPERATORS imported
grep 'COMPARISON_OPERATORS' apps/web/components/strategy/flow/panels/property-panel.tsx
# Expected: at least 1 match (import line)
```

### Final Checklist
- [ ] Comparator description shows operation-specific text
- [ ] Fallback to static text when operation is unknown
- [ ] `COMPARISON_OPERATORS` imported from `operators.ts`
- [ ] Handle size is `w-5 h-5` (was `w-3 h-3`)
- [ ] No other styles changed on handles
- [ ] No new files created
- [ ] `operators.ts` not modified
- [ ] Build passes with zero errors
- [ ] LSP diagnostics clean on both files
