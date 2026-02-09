# Hooks & Plugin Architecture Research Plan

## TL;DR

> **Quick Summary**: Systematically investigate the OMCM hooks system (`hooks/`, `src/hooks/`), hook types, server-pool mechanism, and `plugin.json` to produce a complete architectural map with file:line citations — informing a future token optimization plan.
>
> **Deliverables**:
> - Architectural findings document with line-numbered citations for every claim
> - Hook lifecycle diagram (textual)
> - Server-pool analysis with entry points and flow
> - plugin.json schema analysis
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 + Task 2 (parallel) → Task 3 + Task 4 (parallel) → Task 5 (synthesis)

---

## Context

### Original Request
User wants a structured research plan to understand the hooks system, src/hooks, hook types, server-pool, and plugin.json architecture in the OMCM project. This research will inform a future token optimization plan. All findings must include file path + line number citations. No implementation — read-only research.

### Interview Summary
**Key Discussions**:
- Scope: `hooks/`, `src/hooks/`, server-pool, `plugin.json`
- Output: Cited architectural map
- Constraint: No code changes, no implementation

---

## Work Objectives

### Core Objective
Produce a comprehensive, cited architectural understanding of the OMCM hook system and plugin infrastructure.

### Concrete Deliverables
- Research findings file (`.sisyphus/drafts/hooks-architecture-findings.md`) containing:
  - Hook file inventory with purposes
  - Hook type taxonomy
  - Server-pool mechanism analysis
  - plugin.json schema breakdown
  - ALL claims backed by `file:line` citations

### Definition of Done
- [ ] Every hook file in `hooks/` catalogued with purpose and entry point (file:line)
- [ ] Every module in `src/hooks/` catalogued with purpose and exports (file:line)
- [ ] Hook types enumerated with registration mechanism documented (file:line)
- [ ] Server-pool flow documented from init to dispatch (file:line)
- [ ] plugin.json schema fully documented with field meanings (file:line)
- [ ] Cross-references between hooks/, src/hooks/, server-pool, and plugin.json mapped

### Must Have
- File path + line number for EVERY architectural claim
- Clear distinction between hook types (pre/post, system/user, etc.)
- Server-pool lifecycle: initialization, assignment, teardown

### Must NOT Have (Guardrails)
- NO code changes or file modifications
- NO implementation suggestions (pure research)
- NO assumptions without citations — if uncertain, mark as `[UNVERIFIED]`
- NO summarizing without reading actual source

---

## Verification Strategy (MANDATORY)

### Research Verification Approach
Since this is research (not implementation), verification means **completeness and accuracy**:

| Criterion | How to Verify |
|-----------|---------------|
| All hook files catalogued | `glob hooks/**/*` count matches findings count |
| All src/hooks modules catalogued | `glob src/hooks/**/*` count matches findings count |
| Citations valid | Spot-check 5 random citations: `read file:line` confirms claim |
| Server-pool documented | Entry point function name + file:line provided |
| plugin.json documented | Every top-level key explained with file:line |

---

## Task Dependency Graph

| Task | Depends On | Reason | Blocks |
|------|------------|--------|--------|
| Task 1: Inventory hooks/ | None | Starting point, enumerate files | Task 3, Task 5 |
| Task 2: Inventory src/hooks/ | None | Starting point, enumerate files | Task 3, Task 5 |
| Task 3: Analyze hook types & lifecycle | Task 1, Task 2 | Needs file inventory to classify types | Task 5 |
| Task 4: Analyze server-pool + plugin.json | None | Independent subsystem | Task 5 |
| Task 5: Synthesize findings | Task 3, Task 4 | Needs all research complete | None (final) |

---

## Parallel Execution Graph

```
Wave 1 (Start immediately - independent exploration):
├── Task 1: Inventory hooks/ directory (enumerate all hook files, read each)
├── Task 2: Inventory src/hooks/ directory (enumerate all modules, read each)
└── Task 4: Analyze server-pool + plugin.json (independent subsystem)

Wave 2 (After Wave 1 completes):
└── Task 3: Classify hook types & document lifecycle (needs Task 1 + 2 results)

Wave 3 (After Wave 2 completes):
└── Task 5: Synthesize cross-cutting findings document

Critical Path: Task 1 → Task 3 → Task 5
Parallel Speedup: ~50% faster than sequential (Wave 1 runs 3 tasks in parallel)
```

---

## Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1, 2, 4 | 3x `explore` agents in parallel (background=true) |
| 2 | 3 | 1x `explore-medium` agent (needs synthesis from Wave 1) |
| 3 | 5 | 1x `architect-low` or `writer` agent (documentation synthesis) |

---

## TODOs

- [ ] 1. Inventory hooks/ Directory

  **What to do**:
  - Enumerate ALL files in `hooks/` directory (including subdirectories)
  - For EACH file: read contents, document:
    - File name and path
    - What hook event it handles (pre-commit, post-response, etc.)
    - Export signature (function name, parameters, return type)
    - Line numbers for key definitions
  - Report format: table with columns `File | Hook Event | Entry Function | Line | Purpose`

  **Must NOT do**:
  - Do not modify any files
  - Do not skip any files — even if they look trivial

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File enumeration and reading is straightforward exploration
  - **Skills**: []
    - No specialized skills needed for file reading
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not implementing, just reading
    - `frontend-ui-ux`: Not UI-related

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4)
  - **Blocks**: Task 3, Task 5
  - **Blocked By**: None

  **References**:
  - `hooks/` directory — enumerate all `.mjs`, `.js`, `.ts` files
  - Look for `export default`, `export function`, `module.exports` patterns

  **Acceptance Criteria**:
  - [ ] Every file in `hooks/` listed with file:line citation
  - [ ] Each hook's event trigger identified (e.g., "runs on PreToolUse")
  - [ ] Entry function signature documented with line number
  - [ ] Verification: `glob hooks/**/*` file count == documented file count

  **Commit**: NO (research only)

---

- [ ] 2. Inventory src/hooks/ Directory

  **What to do**:
  - Enumerate ALL files in `src/hooks/` directory
  - For EACH module: read contents, document:
    - File name and path
    - Exported functions/classes/types
    - What each export does (1-line summary)
    - Line numbers for all exports
    - Dependencies (imports from other src/ modules)
  - Report format: table with columns `File | Exports | Line | Dependencies | Purpose`

  **Must NOT do**:
  - Do not modify any files
  - Do not skip utility/helper files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File enumeration and reading is straightforward
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Reading only, not writing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4)
  - **Blocks**: Task 3, Task 5
  - **Blocked By**: None

  **References**:
  - `src/hooks/` directory — enumerate all source files
  - Look for `export`, `import` statements to map dependencies

  **Acceptance Criteria**:
  - [ ] Every file in `src/hooks/` listed with file:line citations
  - [ ] All exports documented per file
  - [ ] Import/dependency graph sketched (which src/hooks file imports what)
  - [ ] Verification: `glob src/hooks/**/*` file count == documented file count

  **Commit**: NO (research only)

---

- [ ] 3. Classify Hook Types & Document Lifecycle

  **What to do**:
  - Using results from Task 1 and Task 2, classify ALL hooks into types:
    - By timing: pre-hook vs post-hook
    - By target: tool-use hooks, response hooks, session hooks, etc.
    - By registration: static (config) vs dynamic (runtime)
  - Document the hook lifecycle:
    - How hooks are registered (what code reads hook files?)
    - How hooks are invoked (what triggers them?)
    - What data flows through hooks (parameters, return values)?
    - How hook results affect execution (blocking vs advisory)?
  - Trace the registration chain: `plugin.json` → loader → hook registry → invocation
  - ALL claims must have `file:line` citations

  **Must NOT do**:
  - Do not speculate without evidence — mark unknowns as `[UNVERIFIED]`
  - Do not implement anything

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Requires synthesis and cross-referencing, moderate complexity
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Helps understand TypeScript patterns in hook registration/invocation code
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Hooks are backend/system, not UI
    - `git-master`: No git operations needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential, needs Wave 1)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1, Task 2

  **References**:
  - Results from Task 1 (hooks/ inventory)
  - Results from Task 2 (src/hooks/ inventory)
  - Search for hook registration: `grep` for `register`, `addHook`, `loadHook` patterns
  - Search for hook invocation: `grep` for `runHook`, `executeHook`, `triggerHook` patterns
  - `plugin.json` — look for `hooks` key or similar configuration

  **Acceptance Criteria**:
  - [ ] Hook type taxonomy table produced with ≥2 classification axes
  - [ ] Hook lifecycle documented: registration → trigger → execution → result handling
  - [ ] Each lifecycle step has file:line citation
  - [ ] Registration chain traced end-to-end with citations
  - [ ] Any unverified claims explicitly marked `[UNVERIFIED]`

  **Commit**: NO (research only)

---

- [ ] 4. Analyze Server-Pool & plugin.json

  **What to do**:
  - **Server-pool**:
    - Find server-pool implementation (search for `server-pool`, `serverPool`, `pool` in src/)
    - Document: initialization, how servers are added/removed, dispatch logic
    - Document: relationship to hooks (does server-pool use hooks? vice versa?)
    - All findings with file:line citations
  - **plugin.json**:
    - Read `.claude-plugin/plugin.json` completely
    - Document every top-level key and its purpose
    - Document nested structures (hooks config, server references, metadata)
    - Cross-reference with actual code that reads plugin.json
    - All findings with file:line citations

  **Must NOT do**:
  - Do not modify any files
  - Do not guess field meanings — trace to code that reads them

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused file reading and grep search
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Primarily reading JSON and tracing references

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `.claude-plugin/plugin.json` — primary target
  - Search `src/` for `plugin.json` imports/reads to find consumer code
  - Search for `server-pool`, `serverPool`, `ServerPool` across codebase
  - Search for `pool.get`, `pool.acquire`, `pool.release` patterns

  **Acceptance Criteria**:
  - [ ] Server-pool entry point identified with file:line
  - [ ] Server-pool lifecycle documented: init → acquire → release → teardown
  - [ ] plugin.json fully documented: every key explained with purpose
  - [ ] Cross-reference: which code reads plugin.json (file:line of import/require)
  - [ ] Relationship between server-pool and hooks documented (or confirmed as "none")

  **Commit**: NO (research only)

---

- [ ] 5. Synthesize Findings Document

  **What to do**:
  - Combine results from Tasks 1-4 into a single findings document
  - Structure:
    1. **Hook File Inventory** (from Task 1 + 2)
    2. **Hook Type Taxonomy** (from Task 3)
    3. **Hook Lifecycle** (from Task 3)
    4. **Server-Pool Architecture** (from Task 4)
    5. **plugin.json Schema** (from Task 4)
    6. **Cross-Cutting Concerns** (relationships between all components)
    7. **Token Optimization Opportunities** (areas where hooks/plugin infra could be optimized)
  - Every claim must retain its original file:line citation
  - Output to: `.sisyphus/drafts/hooks-architecture-findings.md`

  **Must NOT do**:
  - Do not drop citations during synthesis
  - Do not add implementation recommendations (just identify opportunities)
  - Do not modify source files

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation synthesis from research inputs
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Synthesis, not code reading
    - `prompt-engineer`: Not prompt-related

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, needs all prior waves)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 3, Task 4

  **References**:
  - All outputs from Tasks 1-4
  - Original user request for token optimization context

  **Acceptance Criteria**:
  - [ ] Findings document written to `.sisyphus/drafts/hooks-architecture-findings.md`
  - [ ] All 7 sections present
  - [ ] ≥80% of claims have file:line citations
  - [ ] Zero `[UNVERIFIED]` items remaining (or explicitly acknowledged with reason)
  - [ ] Token optimization opportunities section identifies ≥3 concrete areas

  **Commit**: NO (research only)

---

## Success Criteria

### Final Checklist
- [ ] All files in `hooks/` catalogued
- [ ] All files in `src/hooks/` catalogued
- [ ] Hook types classified with lifecycle documented
- [ ] Server-pool architecture mapped
- [ ] plugin.json schema fully documented
- [ ] ALL claims have file:line citations
- [ ] Findings document produced at `.sisyphus/drafts/hooks-architecture-findings.md`
- [ ] Zero source files modified
