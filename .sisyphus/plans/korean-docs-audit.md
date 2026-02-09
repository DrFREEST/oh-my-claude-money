# Korean Documentation Audit Plan

## TL;DR

> **Quick Summary**: Static cross-check of all 8 Korean docs (`docs/ko/*.md`) against the actual repo codebase to classify every documented claim as OK, OUTDATED, MISSING, PHANTOM, or WRONG. No code changes — investigation only.
>
> **Deliverables**:
> - Per-doc findings table (8 tables, one per doc)
> - Cross-doc consistency report
> - Aggregate summary with counts by classification × severity
> - Phase 1-5 feature coverage matrix
>
> **Estimated Effort**: Medium (8 parallel audit tasks + synthesis)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 0 (Inventory) → Tasks 1-8 (parallel audits) → Task 9 (cross-doc) → Task 10 (synthesis)

---

## Context

### Original Request

Produce a precise audit plan for cross-checking 8 Korean docs under `docs/ko/` against the current repo. Include parallel task graph with waves and dependencies, evidence checklists per doc, issue classification taxonomy, and output table formatting. Phase 1-5 new features are mandatory cross-check points. No code changes — investigation only.

### Metis Review

**Identified Gaps (addressed)**:
- `src/` directory was initially missed (searched `.ts` instead of `.mjs`). **Fixed**: Full inventory of 49 `.mjs` + 1 `.cjs` files now incorporated.
- Phase 1-5 features are oh-my-claudecode features, not all are OMCM-native. **Resolved**: Audit checks whether docs *claim* to cover them; absence is only flagged if doc explicitly scopes itself to include them.
- `src/pool/` and `src/config/` have no CLAUDE.md doc-mapping. **Resolved**: Added as explicit "orphan" check items.
- Classification boundary between OUTDATED and WRONG was ambiguous. **Resolved**: See taxonomy below.

### Complete Code Artifact Inventory

#### `src/` (49 .mjs + 1 .cjs = 50 files)

| Subdirectory | Count | Key Modules |
|---|---|---|
| `src/orchestrator/` | 9 | parallel-executor, fusion-orchestrator, hybrid-ultrawork, task-router, agent-fusion-map, fallback-orchestrator, opencode-worker, execution-strategy, index |
| `src/utils/` | 9 | config, context, usage, handoff-context, fusion-tracker, provider-limits, state-manager, tool-counter, project-root, session-id |
| `src/hud/` | 6 | omcm-hud, fusion-renderer, mode-detector, claude-usage-api, omcm-hud-wrapper, omcm-hud-entry.cjs, index |
| `src/hooks/` | 4 | detect-handoff, session-start, fusion-router-logic, persistent-mode |
| `src/executor/` | 4 | opencode-executor, opencode-server-pool, opencode-server, acp-client |
| `src/context/` | 4 | context-builder, context-sync, context-serializer, index |
| `src/tracking/` | 5 | realtime-tracker, metrics-collector, call-logger, tool-tracker-logger, index |
| `src/router/` | 4 | balancer, rules, cache, mapping |
| `src/config/` | 1 | schema |
| `src/pool/` | 1 | server-pool |

#### Other Code Artifacts

| Directory | Count | Files |
|---|---|---|
| `hooks/` (top-level) | 5 | hooks.json, bash-optimizer.mjs, read-optimizer.mjs, tool-tracker.mjs, fusion-router.mjs |
| `skills/` | 8 | ralph, ecomode, cancel, autopilot, ulw, hulw, hybrid-ultrawork, opencode (each with SKILL.md) |
| `scripts/` | 11 | start-server-pool.sh, fusion-setup.sh, opencode-server.sh, agent-mapping.json, fusion.sh, handoff-to-opencode.sh, export-context.sh, migrate-to-omcm.sh, uninstall-hud.sh, install-hud.sh, fusion-bridge.sh |
| `commands/` | 8 | fusion-setup.md, fusion-default-off.md, fusion-default-on.md, ulw.md, opencode.md, hulw.md, cancel-autopilot.md, autopilot.md |
| `agents/` | 1 | opencode-delegator.json |
| `examples/` | 2 | routing-rules.json, agent-mapping.json |
| Root | 3 | install.sh, uninstall.sh, package.json |
| `.claude-plugin/` | 2 | plugin.json, marketplace.json |

---

## Work Objectives

### Core Objective

Systematically compare every claim in every section of all 8 Korean docs against the actual repo, producing a machine-parseable findings table and summary statistics.

### Concrete Deliverables

1. **Per-doc findings tables** — 8 markdown tables, one per doc
2. **Cross-doc consistency report** — identifies conflicting claims between docs
3. **Aggregate summary** — classification counts per doc, per severity
4. **Phase 1-5 feature matrix** — which OMCM-scoped features are documented where
5. **Orphan code report** — code with no doc coverage at all

### Definition of Done

- [ ] Every section of every Korean doc has at least one classification row
- [ ] Every `src/` subdirectory is mapped to at least one audit task
- [ ] Zero unclassified doc sections remain
- [ ] Summary statistics are computable via `grep -c` on output tables

### Must Have

- Classification for every doc section
- Evidence (exact quotes + file:line) for every non-OK finding
- Severity rating for every non-OK finding
- Phase 1-5 feature coverage check

### Must NOT Have (Guardrails)

- **NO code changes** — this is read-only investigation
- **NO fix suggestions** — agents must NOT output "should be changed to..."
- **NO code execution** — no `node`, `npm test`, `bun run`, etc. Static text comparison only
- **NO English doc audit** — `docs/en/` is out of scope
- **NO README.md audit** — out of scope (note as follow-up recommendation)
- **NO CHANGELOG.md audit** — reference only, not audited
- **NO CLAUDE.md audit** — project rules file, not user documentation
- **NO ko↔en parity check** — separate audit concern, out of scope

---

## Issue Classification Taxonomy

### Classification Definitions

| Code | Name | Definition | Example |
|---|---|---|---|
| **OK** | Accurate | Doc claim matches current code behavior/structure | Doc says "config.mjs exports loadConfig()" → file exists, function exported |
| **OUTDATED** | Stale | Doc describes something that **was once true** but code has since changed | Doc says "3 HUD modules" → now 6 exist |
| **MISSING** | Undocumented | Code/feature exists but doc **does not mention it** | `src/pool/server-pool.mjs` exists, no doc references it |
| **PHANTOM** | Non-existent Reference | Doc references code/file/feature that **does not exist** in repo | Doc mentions `src/index.mjs` → file not found |
| **WRONG** | Contradictory | Doc makes a claim that **contradicts** current code (was never true, or inverts logic) | Doc says "defaults to false" → code shows `default: true` |

### Distinguishing Rules

| Ambiguity | Resolution |
|---|---|
| OUTDATED vs WRONG | OUTDATED = *was* true at some point (evidence: git history or plausible past state). WRONG = *never* true or logically contradicts code. When in doubt, classify as WRONG (more conservative). |
| MISSING vs OK | MISSING = functionality exists with zero doc coverage. If doc mentions the concept but not the specific file, classify as **OK** (concept-level) with a note. |
| PHANTOM vs OUTDATED | PHANTOM = referenced entity *does not exist now*. If it previously existed (renamed/deleted), add note "likely OUTDATED+PHANTOM". |

### Severity Levels

| Severity | Code | Criteria |
|---|---|---|
| **P0-Critical** | 🔴 | PHANTOM or WRONG that would cause user to fail (wrong file path, wrong API, wrong install command) |
| **P1-High** | 🟠 | MISSING for significant functionality, OUTDATED that changes behavior understanding |
| **P2-Medium** | 🟡 | MISSING for minor features, OUTDATED cosmetic details, partial WRONG (doc is imprecise) |
| **P3-Low** | 🟢 | Naming convention drifts, file count discrepancies, style inconsistencies |

---

## Output Table Format

### Per-Doc Findings Table

```markdown
## Findings: {DOC_NAME}

| # | Section | Classification | Severity | Doc Evidence (quote) | Code Evidence (file:line or "not found") | Notes |
|---|---------|---------------|----------|---------------------|------------------------------------------|-------|
| 1 | "설치 방법" | PHANTOM | P0 🔴 | "src/index.mjs를 실행" | `src/index.mjs` not found in repo | Entry point may have moved |
| 2 | "HUD 구성" | OUTDATED | P1 🟠 | "HUD는 3개 모듈로 구성" | `src/hud/` contains 6 modules | Count doubled since doc written |
| 3 | "라우터 설정" | OK | — | "router/ 디렉토리에서 설정" | `src/router/` exists with 4 files | Accurate |
```

### Cross-Doc Consistency Table

```markdown
## Cross-Doc Consistency

| # | Claim | Doc A (section) | Doc B (section) | Conflict | Severity |
|---|-------|----------------|-----------------|----------|----------|
| 1 | Agent count | ARCHITECTURE "32 agents" | FEATURES "30 agents" | Number mismatch | P1 🟠 |
```

### Aggregate Summary Table

```markdown
## Summary

| Document | OK | OUTDATED | MISSING | PHANTOM | WRONG | Total Findings | P0 | P1 | P2 | P3 |
|----------|---|---------|---------|---------|-------|---------------|---|---|---|---|
| ARCHITECTURE.md | 12 | 3 | 2 | 1 | 0 | 18 | 1 | 2 | 2 | 0 |
| FEATURES.md | ... | | | | | | | | | |
| ... | | | | | | | | | | |
| **TOTAL** | | | | | | | | | | |
```

### Phase 1-5 Feature Matrix

```markdown
## Phase 1-5 Feature Coverage

| Feature | Source (CLAUDE.md Section) | OMCM Code Exists? | Documented In | Classification |
|---------|--------------------------|-------------------|---------------|---------------|
| Notepad Wisdom System | Part 4: v3.1-v3.4 | Check `.omc/notepads/` | ? | ? |
| Delegation Categories | Part 4: v3.1-v3.4 | Check src/orchestrator/ | ? | ? |
| Directory Diagnostics | Part 4: v3.1-v3.4 | Check lsp tooling | ? | ? |
| Session Resume | Part 4: v3.1-v3.4 | Check resume-session | ? | ? |
| Ultrapilot | Part 4: v3.4 | Check skills/autopilot/ | ? | ? |
| Swarm | Part 4: v3.4 | Check commands/ | ? | ? |
| Pipeline | Part 4: v3.4 | Check commands/ | ? | ? |
| Unified Cancel | Part 4: v3.4 | Check skills/cancel/ | ? | ? |
| Verification Module | Part 4: v3.4 | Check src/ | ? | ? |
| State Management | Part 4: v3.4 | Check src/utils/state-manager.mjs | ? | ? |
```

---

## Doc → Code Mapping (Bounded Scope Per Task)

Each audit task receives an **explicit file scope** — the agent MUST NOT explore beyond this list.

### ARCHITECTURE.md → Code Scope

```
Primary:
  src/orchestrator/**    (9 files — core architecture)
  src/router/**          (4 files — routing layer)
  src/executor/**        (4 files — execution layer)
  src/context/**         (4 files — context management)
  src/pool/**            (1 file — server pooling)
  agents/opencode-delegator.json

Secondary (check if referenced):
  hooks/hooks.json       (hook architecture)
  src/hooks/**           (4 files)
```

### FEATURES.md → Code Scope

```
Primary:
  src/context/**         (4 files — context/tracking features)
  src/tracking/**        (5 files — metrics, logging)
  src/utils/state-manager.mjs   (state management feature)
  src/utils/fusion-tracker.mjs  (fusion tracking feature)
  skills/**/SKILL.md     (8 files — feature definitions)
  commands/*.md          (8 files — user-facing commands)

Secondary:
  src/orchestrator/hybrid-ultrawork.mjs  (if HULW feature mentioned)
  src/orchestrator/parallel-executor.mjs (if parallelism mentioned)
```

### API-REFERENCE.md → Code Scope

```
Primary:
  src/utils/**           (9 files — exported utility APIs)
  src/config/schema.mjs  (config API)
  src/router/mapping.mjs (mapping API)
  src/orchestrator/agent-fusion-map.mjs (agent mapping)

Secondary:
  scripts/agent-mapping.json
  examples/routing-rules.json
  examples/agent-mapping.json
```

### CONFIGURATION.md → Code Scope

```
Primary:
  src/hud/**             (6 files — HUD configuration)
  src/config/schema.mjs  (config schema)
  src/utils/config.mjs   (config loading)
  hooks/hooks.json       (hook configuration)
  .claude-plugin/*.json  (plugin config)
  package.json           (project config)

Secondary:
  scripts/install-hud.sh
  scripts/uninstall-hud.sh
```

### INSTALLATION.md → Code Scope

```
Primary:
  install.sh
  uninstall.sh
  package.json
  .claude-plugin/plugin.json
  .claude-plugin/marketplace.json

Secondary:
  scripts/fusion-setup.sh
  scripts/migrate-to-omcm.sh
```

### SKILLS-REFERENCE.md → Code Scope

```
Primary:
  skills/ralph/SKILL.md
  skills/ecomode/SKILL.md
  skills/cancel/SKILL.md
  skills/autopilot/SKILL.md
  skills/ulw/SKILL.md
  skills/hulw/SKILL.md
  skills/hybrid-ultrawork/SKILL.md
  skills/opencode/SKILL.md
  commands/*.md          (8 files — command definitions for skills)
```

### FUSION-GUIDE.md → Code Scope

```
Primary:
  src/orchestrator/fusion-orchestrator.mjs
  src/orchestrator/agent-fusion-map.mjs
  src/orchestrator/fallback-orchestrator.mjs
  src/router/**          (4 files)
  src/utils/fusion-tracker.mjs
  src/hud/fusion-renderer.mjs
  src/hooks/fusion-router-logic.mjs
  hooks/fusion-router.mjs
  scripts/fusion-setup.sh
  scripts/fusion.sh
  scripts/fusion-bridge.sh
  scripts/agent-mapping.json
  commands/fusion-setup.md
  commands/fusion-default-on.md
  commands/fusion-default-off.md
  agents/opencode-delegator.json
  examples/routing-rules.json
  examples/agent-mapping.json
```

### TROUBLESHOOTING.md → Code Scope

```
Primary (verify referenced paths/commands exist):
  install.sh
  uninstall.sh
  ALL src/** files mentioned in doc
  ALL scripts/** mentioned in doc
  ALL hooks/** mentioned in doc

Note: Scope is reactive — read doc first, extract every
file path / command / function name mentioned, then verify
each reference exists in repo.
```

---

## Task Dependency Graph

| Task | Depends On | Reason | Blocks |
|---|---|---|---|
| **T0**: Build code inventory & doc-code mapping | None | Foundation — all audits need this | T1-T8 |
| **T1**: Audit ARCHITECTURE.md | T0 | Needs inventory | T9 |
| **T2**: Audit FEATURES.md | T0 | Needs inventory | T9 |
| **T3**: Audit API-REFERENCE.md | T0 | Needs inventory | T9 |
| **T4**: Audit CONFIGURATION.md | T0 | Needs inventory | T9 |
| **T5**: Audit INSTALLATION.md | T0 | Needs inventory | T9 |
| **T6**: Audit SKILLS-REFERENCE.md | T0 | Needs inventory | T9 |
| **T7**: Audit FUSION-GUIDE.md | T0 | Needs inventory | T9 |
| **T8**: Audit TROUBLESHOOTING.md | T0 | Needs inventory | T9 |
| **T9**: Cross-doc consistency check | T1-T8 | Needs all individual audit outputs | T10 |
| **T10**: Synthesis & final tables | T9 | Needs cross-doc report | None (terminal) |

---

## Parallel Execution Graph

```
Wave 0 (Start immediately):
└── T0: Build code inventory & validate doc-code mapping
         No dependencies. Creates the scoped file lists each audit needs.

Wave 1 (After Wave 0 — ALL 8 IN PARALLEL):
├── T1: Audit ARCHITECTURE.md      (depends: T0)
├── T2: Audit FEATURES.md          (depends: T0)
├── T3: Audit API-REFERENCE.md     (depends: T0)
├── T4: Audit CONFIGURATION.md     (depends: T0)
├── T5: Audit INSTALLATION.md      (depends: T0)
├── T6: Audit SKILLS-REFERENCE.md  (depends: T0)
├── T7: Audit FUSION-GUIDE.md      (depends: T0)
└── T8: Audit TROUBLESHOOTING.md   (depends: T0)

Wave 2 (After ALL of Wave 1):
└── T9: Cross-doc consistency check (depends: T1-T8)
         Compares findings across docs for conflicting claims.

Wave 3 (After Wave 2):
└── T10: Synthesis — aggregate tables, summary stats, final report
          (depends: T9)

Critical Path: T0 → T1 (longest doc?) → T9 → T10
Parallel Speedup: Wave 1 runs 8 tasks simultaneously → ~75% faster than sequential
```

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|---|---|---|
| 0 | T0 | `delegate_task(category="quick", load_skills=[], run_in_background=false)` |
| 1 | T1-T8 | `delegate_task(category="unspecified-low", load_skills=[], run_in_background=true)` × 8 |
| 2 | T9 | `delegate_task(category="unspecified-low", load_skills=[], run_in_background=false)` |
| 3 | T10 | `delegate_task(category="quick", load_skills=[], run_in_background=false)` |

---

## Evidence Checklist Per Doc (Audit Procedure)

Every doc audit task follows this exact procedure:

### Step 1: Section Inventory

```
Read the Korean doc top-to-bottom.
List every H2 (##) and H3 (###) section heading.
This becomes the row index for the findings table.
```

### Step 2: Claim Extraction

For each section, extract:
- **File paths** mentioned (e.g., `src/hud/omcm-hud.mjs`)
- **Function/export names** mentioned (e.g., `loadConfig()`)
- **Count claims** (e.g., "5개 모듈로 구성")
- **Behavior claims** (e.g., "자동으로 퓨전 모드 활성화")
- **Config option names** (e.g., `fusionMode: true`)
- **Command names** (e.g., `/fusion-setup`)
- **Install/setup steps** (e.g., `npm install`)

### Step 3: Evidence Collection Per Claim

| Claim Type | Evidence Method | Tool |
|---|---|---|
| File path exists | `glob` for the exact path | Glob |
| Function/export exists | `grep` for export + name in target file | Grep |
| Count claim (N modules) | `glob` the directory, count results | Glob |
| Behavior claim | `read` the referenced code, verify logic | Read |
| Config option exists | `grep` in schema.mjs / config.mjs | Grep |
| Command exists | Check `commands/{name}.md` exists | Glob |
| Install step works | Verify referenced file/path exists (NO execution) | Glob/Read |

### Step 4: Classification

Apply the taxonomy from above to each claim. Record evidence from both sides.

### Step 5: Phase 1-5 Feature Cross-Check (MANDATORY)

For each doc, additionally check:

| Feature | What to Look For |
|---|---|
| **Notepad Wisdom** | References to `.omc/notepads/`, `addLearning()`, `addDecision()`, etc. |
| **Delegation Categories** | References to `visual-engineering`, `ultrabrain`, `artistry`, `quick`, etc. |
| **Directory Diagnostics** | References to `lsp_diagnostics_directory`, `tsc --noEmit` |
| **Session Resume** | References to `resume-session`, session_id continuation |
| **Ultrapilot** | References to parallel autopilot, `ultrapilot-state.json` |
| **Swarm** | References to N-agent coordination, task claiming |
| **Pipeline** | References to sequential chaining, presets (`review`, `implement`, etc.) |
| **Unified Cancel** | References to `/cancel`, multi-mode detection |
| **Verification Module** | References to BUILD/TEST/LINT checks, evidence validation |
| **State Management** | References to `.omc/state/`, standardized paths, `state-manager.mjs` |

**Rule**: Only classify as MISSING if the doc's stated scope includes the feature. Do NOT flag absence of oh-my-claudecode features that OMCM docs never claimed to cover.

### Step 6: Output

Produce the findings table in the exact format specified in "Output Table Format" above.

---

## TODOs

- [ ] 0. **Build Code Inventory & Doc-Code Mapping**

  **What to do**:
  - Enumerate all files under `src/`, `hooks/`, `skills/`, `scripts/`, `commands/`, `agents/`, `examples/`, root (`install.sh`, `uninstall.sh`, `package.json`, `.claude-plugin/`)
  - Verify `package.json` `main` field points to an existing file
  - Confirm the doc-code mapping from this plan matches reality
  - Identify any "orphan" code files not covered by ANY doc's audit scope
  - Output: validated inventory + orphan list

  **Must NOT do**:
  - Execute any code
  - Modify any file

  **Recommended Agent Profile**:
  - **Category**: `quick` — simple file enumeration task
    - Reason: No complex reasoning, just listing and comparing
  - **Skills**: `[]` — no domain skill needed
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code to write
    - All others: No domain overlap

  **Parallelization**:
  - **Can Run In Parallel**: NO (prerequisite for all others)
  - **Parallel Group**: Wave 0 (solo)
  - **Blocks**: T1, T2, T3, T4, T5, T6, T7, T8
  - **Blocked By**: None

  **References**:
  - `package.json` — check `main` field for entry point existence
  - Inventory tables in this plan's Context section — validate against actual repo

  **Acceptance Criteria**:
  - [ ] Complete file listing produced
  - [ ] `package.json` `main` field verified (exists or PHANTOM)
  - [ ] Orphan files listed (code with zero doc coverage)
  - [ ] Output is structured markdown table

  **Commit**: NO

---

- [ ] 1. **Audit ARCHITECTURE.md (Korean)**

  **What to do**:
  - Read `docs/ko/ARCHITECTURE.md` top-to-bottom
  - Extract all sections, claims, file references, diagrams, count claims
  - For each claim, gather evidence from scoped code files (see Doc-Code Mapping: ARCHITECTURE)
  - Classify each finding: OK / OUTDATED / MISSING / PHANTOM / WRONG
  - Assign severity: P0 / P1 / P2 / P3
  - Run Phase 1-5 feature cross-check
  - Output findings table in prescribed format

  **Must NOT do**:
  - Suggest fixes or improvements
  - Execute code or run tests
  - Read files outside the bounded scope
  - Audit the English version

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — moderate analysis, reading + comparing multiple files
    - Reason: Needs to read ~25 files and cross-reference against doc claims
  - **Skills**: `[]` — no domain skill needed (read-only comparison)
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code to write
    - `frontend-ui-ux`: Not a UI task
    - All others: No domain overlap

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2-T8)
  - **Blocks**: T9
  - **Blocked By**: T0

  **References**:
  - `docs/ko/ARCHITECTURE.md` — the doc under audit
  - `src/orchestrator/**` (9 files) — core architecture code
  - `src/router/**` (4 files) — routing layer code
  - `src/executor/**` (4 files) — execution layer
  - `src/context/**` (4 files) — context management
  - `src/pool/**` (1 file) — server pooling
  - `agents/opencode-delegator.json` — agent config
  - `hooks/hooks.json` — hook architecture
  - `src/hooks/**` (4 files) — hook implementations

  **Acceptance Criteria**:
  - [ ] Every H2/H3 section of ARCHITECTURE.md has at least one findings row
  - [ ] All file paths mentioned in doc are verified (exist or PHANTOM)
  - [ ] Phase 1-5 cross-check completed
  - [ ] Output is markdown table with all 7 columns filled

  **Commit**: NO

---

- [ ] 2. **Audit FEATURES.md (Korean)**

  **What to do**:
  - Same procedure as T1, scoped to FEATURES.md
  - Pay special attention to: feature lists, skill references, command references
  - Phase 1-5 cross-check is especially critical here (features doc most likely to reference new features)

  **Must NOT do**: Same constraints as T1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3-T8)
  - **Blocks**: T9
  - **Blocked By**: T0

  **References**:
  - `docs/ko/FEATURES.md` — the doc under audit
  - `src/context/**` (4 files) — context features
  - `src/tracking/**` (5 files) — tracking features
  - `src/utils/state-manager.mjs` — state management
  - `src/utils/fusion-tracker.mjs` — fusion tracking
  - `skills/**/SKILL.md` (8 files) — skill definitions
  - `commands/*.md` (8 files) — command definitions
  - `src/orchestrator/hybrid-ultrawork.mjs` — HULW feature
  - `src/orchestrator/parallel-executor.mjs` — parallelism

  **Acceptance Criteria**: Same structure as T1, adapted for FEATURES.md

  **Commit**: NO

---

- [ ] 3. **Audit API-REFERENCE.md (Korean)**

  **What to do**:
  - Same procedure, focused on: exported function names, parameter signatures, return types, module paths
  - Every documented API must be verified against actual exports in code

  **Must NOT do**: Same constraints as T1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9
  - **Blocked By**: T0

  **References**:
  - `docs/ko/API-REFERENCE.md` — the doc under audit
  - `src/utils/**` (9 files) — utility APIs
  - `src/config/schema.mjs` — config API
  - `src/router/mapping.mjs` — mapping API
  - `src/orchestrator/agent-fusion-map.mjs` — agent mapping
  - `scripts/agent-mapping.json` — agent mapping data
  - `examples/routing-rules.json`, `examples/agent-mapping.json` — example data

  **Acceptance Criteria**: Same structure as T1, adapted for API-REFERENCE.md

  **Commit**: NO

---

- [ ] 4. **Audit CONFIGURATION.md (Korean)**

  **What to do**:
  - Same procedure, focused on: config keys, default values, file paths, HUD options
  - Cross-check config keys against `src/config/schema.mjs` exports

  **Must NOT do**: Same constraints as T1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9
  - **Blocked By**: T0

  **References**:
  - `docs/ko/CONFIGURATION.md` — the doc under audit
  - `src/hud/**` (6 files) — HUD config
  - `src/config/schema.mjs` — config schema
  - `src/utils/config.mjs` — config loading
  - `hooks/hooks.json` — hook config
  - `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — plugin config
  - `package.json` — project config
  - `scripts/install-hud.sh`, `scripts/uninstall-hud.sh` — HUD scripts

  **Acceptance Criteria**: Same structure as T1, adapted for CONFIGURATION.md

  **Commit**: NO

---

- [ ] 5. **Audit INSTALLATION.md (Korean)**

  **What to do**:
  - Same procedure, focused on: install steps, file paths, prerequisites, commands
  - Every referenced path and command must be verified to exist
  - Special attention to `install.sh` and `uninstall.sh` — verify doc steps match script content

  **Must NOT do**: Same constraints as T1. **Especially: do NOT run install.sh**

  **Recommended Agent Profile**:
  - **Category**: `quick` — smaller scope (5 primary files)
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9
  - **Blocked By**: T0

  **References**:
  - `docs/ko/INSTALLATION.md` — the doc under audit
  - `install.sh` — install script
  - `uninstall.sh` — uninstall script
  - `package.json` — project metadata
  - `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — plugin metadata
  - `scripts/fusion-setup.sh`, `scripts/migrate-to-omcm.sh` — setup scripts

  **Acceptance Criteria**: Same structure as T1, adapted for INSTALLATION.md

  **Commit**: NO

---

- [ ] 6. **Audit SKILLS-REFERENCE.md (Korean)**

  **What to do**:
  - Same procedure, focused on: skill names, trigger keywords, behavior descriptions
  - 1:1 cross-check every documented skill against its `skills/*/SKILL.md` file
  - Verify every documented command against `commands/*.md`
  - Flag skills that exist in `skills/` but are absent from doc (MISSING)
  - Flag skills documented but absent from `skills/` (PHANTOM)

  **Must NOT do**: Same constraints as T1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9
  - **Blocked By**: T0

  **References**:
  - `docs/ko/SKILLS-REFERENCE.md` — the doc under audit
  - `skills/ralph/SKILL.md` — ralph skill definition
  - `skills/ecomode/SKILL.md` — ecomode skill definition
  - `skills/cancel/SKILL.md` — cancel skill definition
  - `skills/autopilot/SKILL.md` — autopilot skill definition
  - `skills/ulw/SKILL.md` — ultrawork skill definition
  - `skills/hulw/SKILL.md` — hulw skill definition
  - `skills/hybrid-ultrawork/SKILL.md` — hybrid-ultrawork definition
  - `skills/opencode/SKILL.md` — opencode skill definition
  - `commands/*.md` (8 files) — command definitions

  **Acceptance Criteria**: Same structure as T1, adapted for SKILLS-REFERENCE.md

  **Commit**: NO

---

- [ ] 7. **Audit FUSION-GUIDE.md (Korean)**

  **What to do**:
  - Same procedure, focused on: fusion architecture, routing rules, agent mapping, setup steps
  - Largest code scope (16+ files) — most likely to have drift
  - Cross-check routing rules against `src/router/**`
  - Cross-check agent mapping against `src/orchestrator/agent-fusion-map.mjs` and `scripts/agent-mapping.json`

  **Must NOT do**: Same constraints as T1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9
  - **Blocked By**: T0

  **References**:
  - `docs/ko/FUSION-GUIDE.md` — the doc under audit
  - `src/orchestrator/fusion-orchestrator.mjs` — fusion core
  - `src/orchestrator/agent-fusion-map.mjs` — agent mapping logic
  - `src/orchestrator/fallback-orchestrator.mjs` — fallback logic
  - `src/router/**` (4 files) — routing layer
  - `src/utils/fusion-tracker.mjs` — fusion tracking
  - `src/hud/fusion-renderer.mjs` — fusion HUD
  - `src/hooks/fusion-router-logic.mjs` — fusion hook logic
  - `hooks/fusion-router.mjs` — top-level fusion hook
  - `scripts/fusion-setup.sh`, `scripts/fusion.sh`, `scripts/fusion-bridge.sh` — fusion scripts
  - `scripts/agent-mapping.json` — agent mapping data
  - `commands/fusion-setup.md`, `commands/fusion-default-on.md`, `commands/fusion-default-off.md`
  - `agents/opencode-delegator.json` — agent config
  - `examples/routing-rules.json`, `examples/agent-mapping.json` — examples

  **Acceptance Criteria**: Same structure as T1, adapted for FUSION-GUIDE.md

  **Commit**: NO

---

- [ ] 8. **Audit TROUBLESHOOTING.md (Korean)**

  **What to do**:
  - Different approach: scope is **reactive** (read doc, extract all references, then verify each)
  - Extract every file path, command, error message, and workaround mentioned
  - Verify each reference exists in repo
  - Check if troubleshooting steps reference correct file locations

  **Must NOT do**: Same constraints as T1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9
  - **Blocked By**: T0

  **References**:
  - `docs/ko/TROUBLESHOOTING.md` — the doc under audit
  - `install.sh`, `uninstall.sh` — frequently referenced in troubleshooting
  - All `src/**`, `scripts/**`, `hooks/**` files — as referenced by doc content

  **Acceptance Criteria**: Same structure as T1, adapted for TROUBLESHOOTING.md

  **Commit**: NO

---

- [ ] 9. **Cross-Doc Consistency Check**

  **What to do**:
  - Collect all 8 findings tables from T1-T8
  - Identify claims that appear in multiple docs
  - Check for contradictions (e.g., ARCHITECTURE says X agents, FEATURES says Y agents)
  - Check for version/count mismatches across docs
  - Output: Cross-Doc Consistency Table (format above)

  **Must NOT do**:
  - Suggest fixes
  - Re-audit individual docs (use existing findings only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — moderate reasoning to compare across docs
    - Reason: Needs to synthesize 8 separate outputs
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs all Wave 1 outputs)
  - **Parallel Group**: Wave 2 (solo)
  - **Blocks**: T10
  - **Blocked By**: T1, T2, T3, T4, T5, T6, T7, T8

  **References**:
  - All 8 findings tables from T1-T8 (passed as input)

  **Acceptance Criteria**:
  - [ ] Every claim appearing in 2+ docs is checked for consistency
  - [ ] Output is Cross-Doc Consistency Table with all 6 columns
  - [ ] Zero findings without evidence from both docs

  **Commit**: NO

---

- [ ] 10. **Synthesis & Final Report**

  **What to do**:
  - Combine all 8 per-doc findings tables into single document
  - Add cross-doc consistency table from T9
  - Generate aggregate summary table (counts by classification × severity × doc)
  - Generate Phase 1-5 feature coverage matrix (consolidated from all doc audits)
  - Add orphan code report from T0
  - Format all tables consistently
  - Add follow-up recommendations section (NOT fixes — just "areas to investigate further")

  **Must NOT do**:
  - Suggest code changes
  - Re-run any audits

  **Recommended Agent Profile**:
  - **Category**: `quick` — aggregation and formatting only
    - Reason: No analysis, just combining existing outputs
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (terminal task)
  - **Parallel Group**: Wave 3 (solo)
  - **Blocks**: None (final deliverable)
  - **Blocked By**: T9

  **References**:
  - All outputs from T0-T9

  **Acceptance Criteria**:
  - [ ] Single markdown file with all tables
  - [ ] Summary row totals are correct (sum of individual doc counts)
  - [ ] Phase 1-5 matrix has all 10 features with classification
  - [ ] Orphan code list included
  - [ ] `grep -c "^|" output.md` returns expected row count
  - [ ] No "TBD", "TODO", or placeholder text remains

  **Commit**: NO

---

## Commit Strategy

No commits. This is an investigation-only audit. Output is an evidence report, not code changes.

---

## Success Criteria

### Final Checklist

- [ ] All 8 Korean docs audited (zero sections left unclassified)
- [ ] All 50 `src/` files appear in at least one audit scope
- [ ] Phase 1-5 feature matrix complete (10 features × classification)
- [ ] Cross-doc consistency checked
- [ ] Orphan code identified
- [ ] All findings have evidence (no vague claims)
- [ ] Output tables are machine-parseable markdown
- [ ] Zero code changes made
- [ ] Zero fix suggestions in output

### Follow-Up Recommendations (Out of Scope, Note for Future)

- README.md `파일 구조` section likely stale (~15 files missing)
- English docs (`docs/en/`) need same audit
- ko↔en parity check needed
- CHANGELOG.md cross-reference against feature claims
