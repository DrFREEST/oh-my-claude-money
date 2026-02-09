# OMCM English Documentation Audit — Work Plan

## TL;DR

> **Quick Summary**: Audit all 10 English-facing documentation files against the actual OMCM codebase. Produce per-doc verification tables classifying every factual claim, plus ko/en sync comparison, version consistency, and link/path validity reports. Analysis-only — zero file modifications.
>
> **Deliverables**:
> - 10 per-doc audit tables (item / doc content / actual status / issue type / action)
> - 8 ko/en sync comparison tables
> - 1 version consistency table
> - 1 link/path validity table
> - 1 summary statistics dashboard
>
> **Estimated Effort**: Large (10 docs × ~30-80 claims each)
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: Task 0 (baseline) → Tasks 1-10 (parallel doc audits) → Tasks 11-12 (sync/version) → Task 13 (links) → Task 14 (consolidation)

---

## Context

### Original Request
Produce a precise work plan to audit OMCM English docs vs code (analysis-only, no code changes). Cover all target docs (README.md + docs/en 8 docs + docs/README.md). Include Phase 1-5 features cross-check. Include ko/en sync check, version consistency, link/path validity, code snippet/API accuracy. Output: per-doc table with columns (item, doc content, actual status, issue type, action) + final ko/en sync table.

### Codebase Structure (Verified)

```
/opt/oh-my-claude-money/
├── README.md                          # ~600+ lines, bilingual (ko+en)
├── CHANGELOG.md
├── package.json                       # version source
├── install.sh                         # installer
├── .claude-plugin/
│   ├── plugin.json                    # version source
│   └── marketplace.json               # version source
├── docs/
│   ├── README.md                      # index page (~25 lines)
│   ├── CHANGELOG.md                   # potential duplicate of root
│   ├── en/                            # 8 target docs
│   │   ├── INSTALLATION.md
│   │   ├── ARCHITECTURE.md
│   │   ├── FEATURES.md
│   │   ├── API-REFERENCE.md
│   │   ├── CONFIGURATION.md
│   │   ├── FUSION-GUIDE.md
│   │   ├── SKILLS-REFERENCE.md
│   │   └── TROUBLESHOOTING.md
│   └── ko/                            # 8 mirror docs (sync targets)
│       ├── INSTALLATION.md
│       ├── ARCHITECTURE.md
│       ├── FEATURES.md
│       ├── API-REFERENCE.md
│       ├── CONFIGURATION.md
│       ├── FUSION-GUIDE.md
│       ├── SKILLS-REFERENCE.md
│       └── TROUBLESHOOTING.md
├── hooks/                             # 5 files (top-level hooks)
│   ├── hooks.json
│   ├── fusion-router.mjs
│   ├── read-optimizer.mjs
│   ├── bash-optimizer.mjs
│   └── tool-tracker.mjs
├── src/                               # 49 .mjs files
│   ├── config/schema.mjs
│   ├── context/{index,context-sync,context-serializer,context-builder}.mjs
│   ├── executor/{opencode-server-pool,opencode-server,opencode-executor,acp-client}.mjs
│   ├── hooks/{detect-handoff,fusion-router-logic,session-start,persistent-mode}.mjs
│   ├── hud/{omcm-hud,fusion-renderer,omcm-hud-wrapper,omcm-hud-entry.cjs,mode-detector,claude-usage-api,index}.mjs
│   ├── orchestrator/{parallel-executor,hybrid-ultrawork,fusion-orchestrator,execution-strategy,agent-fusion-map,fallback-orchestrator,index,opencode-worker,task-router}.mjs
│   ├── pool/server-pool.mjs
│   ├── router/{balancer,rules,cache,mapping}.mjs
│   ├── tracking/{tool-tracker-logger,call-logger,index,metrics-collector,realtime-tracker}.mjs
│   └── utils/{tool-counter,session-id,fusion-tracker,project-root,state-manager,provider-limits,config,context,handoff-context,usage}.mjs
├── skills/                            # 8 skill folders
│   ├── autopilot/SKILL.md
│   ├── cancel/SKILL.md
│   ├── ecomode/SKILL.md
│   ├── hulw/SKILL.md
│   ├── hybrid-ultrawork/SKILL.md
│   ├── opencode/SKILL.md
│   ├── ralph/SKILL.md
│   └── ulw/SKILL.md
├── scripts/                           # 11 files
│   ├── start-server-pool.sh
│   ├── fusion-setup.sh
│   ├── opencode-server.sh
│   ├── agent-mapping.json
│   ├── fusion.sh
│   ├── handoff-to-opencode.sh
│   ├── export-context.sh
│   ├── migrate-to-omcm.sh
│   ├── uninstall-hud.sh
│   ├── install-hud.sh
│   └── fusion-bridge.sh
└── commands/                          # 8 slash-command definitions (reference material)
    └── *.md
```

### Metis Review — Key Findings Incorporated
1. **Structural baseline first**: README file tree must be audited FIRST — it's the canonical structure all docs reference
2. **`commands/*.md` and `skills/*/SKILL.md`**: Used as reference material to verify SKILLS-REFERENCE.md and FEATURES.md claims — NOT standalone audit targets
3. **`hooks/` vs `src/hooks/`**: Two distinct directories — docs must be checked for which they reference
4. **`docs/CHANGELOG.md` vs root `CHANGELOG.md`**: Identity/divergence check added to link/path task
5. **Depth limit**: Medium depth — verify existence + exported API shape. Do NOT trace execution logic
6. **Added issue type**: `UNVERIFIABLE` — for performance claims, percentages, test counts that cannot be checked via static analysis
7. **README bilingual handling**: Audit EN section against code; Korean section covered only by ko/en sync

---

## Work Objectives

### Core Objective
Systematically verify every factual claim in the 10 English-facing documentation files against the actual codebase, producing structured diagnostic tables that classify each finding.

### Concrete Deliverables
1. **10 per-doc audit tables** — each row: `(item, doc content, actual status, issue type, action)`
2. **8 ko/en sync tables** — each row: `(section, EN status, KO status, diff type, detail)`
3. **1 version consistency table** — `package.json` vs `plugin.json` vs `marketplace.json` vs doc-mentioned versions
4. **1 link/path validity table** — all `[text](path)` internal references checked
5. **1 summary statistics block** — `Total: N | OK: N | OUTDATED: N | MISSING: N | PHANTOM: N | WRONG: N | SYNC_DIFF: N | UNVERIFIABLE: N`

### Definition of Done
- [ ] All 10 docs audited with complete tables (no blank cells)
- [ ] Every "Actual Status" cell cites `file:line` evidence or explicit "NOT FOUND" with search commands attempted
- [ ] All 8 ko/en pairs compared
- [ ] Version strings checked across all 3 version-bearing files + docs
- [ ] All internal markdown links validated
- [ ] Summary statistics computed and presented

### Must Have
- Evidence-based findings (grep hits, glob results, file reads with line numbers)
- Issue type classification for every item
- Both `hooks/` (top-level) and `src/hooks/` distinguished in path checks
- `commands/*.md` and `skills/*/SKILL.md` used as cross-reference sources

### Must NOT Have (Guardrails)
- ❌ NO file modifications of any kind
- ❌ NO code quality commentary or refactoring suggestions
- ❌ NO fix proposals in the "Action" column — only issue classification
- ❌ NO standalone audit tables for `commands/*.md` or `skills/*/SKILL.md`
- ❌ NO external URL validation (don't fetch GitHub/npm links)
- ❌ NO command execution (`npm test`, `node`, etc.) — static analysis only
- ❌ NO auditing the Korean section of root README.md against code
- ❌ NO speculation — if grep/glob can't find it, mark as NOT FOUND with search command attempted

---

## Issue Type Definitions (Locked)

| Type | Definition | Example |
|------|-----------|---------|
| `OK` | Doc claim is accurate and not misleading | Doc says "hooks/ has fusion-router.mjs" → file exists |
| `OUTDATED` | Was true at some point, no longer accurate | Doc says "4 hook files" → now 5 |
| `MISSING` | Code feature exists but doc doesn't mention it | `src/pool/` exists but no doc references it |
| `PHANTOM` | Doc describes something that doesn't exist in code | Doc references `src/utils/logger.mjs` → no such file |
| `WRONG` | Doc claim contradicts actual code behavior/structure | Doc says "exports `LRUCache`" → actually exports `createCache()` |
| `SYNC_DIFF` | Ko/en docs differ in content, structure, or version | EN has 45 lines in section, KO has 52 with extra content |
| `UNVERIFIABLE` | Claim cannot be verified via static analysis | "62% token savings", "~90% latency reduction" |

### "Item" Definition
An **item** is any verifiable factual claim about the codebase: file paths, directory structures, function/export names, module purposes, configuration keys, command names, feature descriptions tied to specific code, version numbers, file counts, hook names, skill names.

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A — this is an analysis task, not code
- **User wants tests**: N/A
- **Framework**: N/A

### Automated Verification (Agent-Executable)

All verification is via **read-only tools**:

| Claim Type | Verification Tool | Method |
|------------|------------------|--------|
| File/dir exists | `glob` | Pattern match, confirm path |
| Export name | `grep` | Search for `export` + name in file |
| Function signature | `read` + line numbers | Read file, find function definition |
| Config key | `grep` | Search key in `src/config/schema.mjs` and `src/utils/config.mjs` |
| File count | `glob` + count | Pattern match, count results |
| Module structure | `glob` + `read` | List directory, read `index.mjs` |
| Version string | `read` specific files | Read `package.json`, `plugin.json`, `marketplace.json` |
| Internal link | `glob` | Check if target path exists |
| Ko/en section match | `read` both files | Compare section headings and content |

### Evidence Requirements
- Every "Actual Status" cell must include: `✅ file:line` or `❌ NOT FOUND (searched: <command>)`
- No blank cells — every row fully populated
- `UNVERIFIABLE` items must explain WHY they can't be checked statically

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Baseline — MUST complete first):
└── Task 0: README.md file tree + structural baseline audit

Wave 1 (Fan-out — all independent, after Wave 0):
├── Task 1: docs/en/INSTALLATION.md audit
├── Task 2: docs/en/ARCHITECTURE.md audit
├── Task 3: docs/en/FEATURES.md audit
├── Task 4: docs/en/API-REFERENCE.md audit
├── Task 5: docs/en/CONFIGURATION.md audit
├── Task 6: docs/en/FUSION-GUIDE.md audit
├── Task 7: docs/en/SKILLS-REFERENCE.md audit
└── Task 8: docs/en/TROUBLESHOOTING.md audit

Wave 2 (After Wave 0, parallel with Wave 1):
├── Task 9:  docs/README.md audit (small — index page)
└── Task 10: Root README.md EN-section audit (large)

Wave 3 (After Waves 1+2 complete):
├── Task 11: Ko/En sync comparison (all 8 pairs)
├── Task 12: Version consistency check
└── Task 13: Link/path validity check

Wave 4 (Final):
└── Task 14: Consolidation + summary statistics
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|-----------|--------|---------------------|
| 0 | None | 1-13 (provides baseline) | None (must be first) |
| 1 | 0 | 11, 14 | 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| 2 | 0 | 11, 14 | 1, 3, 4, 5, 6, 7, 8, 9, 10 |
| 3 | 0 | 11, 14 | 1, 2, 4, 5, 6, 7, 8, 9, 10 |
| 4 | 0 | 11, 14 | 1, 2, 3, 5, 6, 7, 8, 9, 10 |
| 5 | 0 | 11, 14 | 1, 2, 3, 4, 6, 7, 8, 9, 10 |
| 6 | 0 | 11, 14 | 1, 2, 3, 4, 5, 7, 8, 9, 10 |
| 7 | 0 | 11, 14 | 1, 2, 3, 4, 5, 6, 8, 9, 10 |
| 8 | 0 | 11, 14 | 1, 2, 3, 4, 5, 6, 7, 9, 10 |
| 9 | 0 | 14 | 1-8, 10 |
| 10 | 0 | 11, 14 | 1-9 |
| 11 | 1-8, 10 | 14 | 12, 13 |
| 12 | 0 | 14 | 11, 13 |
| 13 | 0 | 14 | 11, 12 |
| 14 | 11, 12, 13 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 0 | Task 0 | `delegate_task(category="unspecified-high", load_skills=[], run_in_background=false)` |
| 1 | Tasks 1-8 | `delegate_task(category="unspecified-low", load_skills=[], run_in_background=true)` × 8 |
| 2 | Tasks 9-10 | `delegate_task(category="quick", ...)` + `delegate_task(category="unspecified-low", ...)` |
| 3 | Tasks 11-13 | `delegate_task(category="unspecified-low", ..., run_in_background=true)` × 3 |
| 4 | Task 14 | `delegate_task(category="unspecified-low", load_skills=[], run_in_background=false)` |

---

## TODOs

---

### TASK 0: Structural Baseline — README.md File Tree Audit

- [ ] 0. Structural Baseline — README.md File Tree Audit

  **What to do**:
  1. Read `README.md` and extract the file/directory tree diagram (the canonical structure claim)
  2. For every path listed in the tree, run `glob` or `ls` to verify existence
  3. For every directory listed, verify its contents match the tree's listed children
  4. Check for files/directories that EXIST in the repo but are NOT in the README tree (MISSING)
  5. Check for files/directories in the README tree that DON'T exist (PHANTOM)
  6. Record as structured baseline that subsequent tasks can reference

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT audit non-structural claims (features, APIs) — that's for later tasks
  - Do NOT follow external links

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: This is the critical-path baseline that gates all other tasks. Must be thorough and precise. High reasoning needed for structural comparison.
  - **Skills**: (none required — pure glob/read/grep analysis)
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code writing involved
    - `frontend-ui-ux`: No UI work
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO (must complete first)
  - **Parallel Group**: Wave 0 (solo)
  - **Blocks**: Tasks 1-13
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `README.md` — The file tree diagram section listing all directories and files

  **Source of Truth References** (what to compare against):
  - `hooks/` — 5 files: `hooks.json`, `fusion-router.mjs`, `read-optimizer.mjs`, `bash-optimizer.mjs`, `tool-tracker.mjs`
  - `src/` — 49 `.mjs` files across 9 subdirectories: `config/`, `context/`, `executor/`, `hooks/`, `hud/`, `orchestrator/`, `pool/`, `router/`, `tracking/`, `utils/`
  - `skills/` — 8 folders: `autopilot/`, `cancel/`, `ecomode/`, `hulw/`, `hybrid-ultrawork/`, `opencode/`, `ralph/`, `ulw/`
  - `scripts/` — 11 files (see Context section for full list)
  - `commands/` — 8 `.md` files (to be discovered via glob)
  - `.claude-plugin/` — `plugin.json`, `marketplace.json`
  - `docs/` — `README.md`, `CHANGELOG.md`, `en/` (8 files), `ko/` (8 files)

  **IMPORTANT**: Distinguish `hooks/` (top-level, 5 files) from `src/hooks/` (4 files). Both are real directories.

  **Acceptance Criteria**:

  ```bash
  # Agent verifies by running:
  # 1. Read README.md, extract every path from the file tree
  # 2. For each path, glob/ls to check existence
  # 3. For each directory, compare listed children vs actual children
  # 4. Glob for top-level dirs NOT in tree: ls -d */ to find unlisted dirs
  ```

  **Output format**:
  ```markdown
  ## Baseline: README.md File Tree Audit

  | # | Path (from README) | Exists? | Children Match? | Issue Type | Detail |
  |---|-------------------|---------|-----------------|------------|--------|
  | 1 | hooks/fusion-router.mjs | ✅ | N/A (file) | OK | — |
  | 2 | src/nonexistent/ | ❌ | N/A | PHANTOM | Not found via glob |
  
  ### Unlisted Items (MISSING from README tree)
  | # | Actual Path | Issue Type | Detail |
  |---|------------|------------|--------|
  | 1 | commands/ | MISSING | Directory exists but not in README tree |
  ```

  **Evidence to Capture:**
  - [ ] Full table of README tree paths vs actual filesystem
  - [ ] List of MISSING items (exist but not documented)
  - [ ] List of PHANTOM items (documented but don't exist)

  **Commit**: NO (analysis-only)

---

### TASK 1: Audit docs/en/INSTALLATION.md

- [ ] 1. Audit docs/en/INSTALLATION.md

  **What to do**:
  1. Read `docs/en/INSTALLATION.md` in full
  2. Extract every verifiable factual claim (file paths, command names, script references, prerequisites, config paths)
  3. For each claim, verify against actual codebase:
     - File path claims → `glob` to verify existence
     - Script references → verify `install.sh`, `scripts/fusion-setup.sh`, etc. exist and export what's claimed
     - Config path claims → `grep` in config files
     - Command/CLI claims → verify in `commands/*.md` or `install.sh`
     - Prerequisites (Node.js version, Claude Code, etc.) → check `package.json` engines field
  4. Produce audit table

  **Must NOT do**:
  - Do NOT run `install.sh` or any installation commands
  - Do NOT modify any files
  - Do NOT validate external URLs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate effort — single doc audit, standard read/grep/glob operations
  - **Skills**: (none required)
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code writing
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-8)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/en/INSTALLATION.md` — Full file read required

  **Code references to verify against**:
  - `install.sh` — Main installer script; verify all documented install steps exist as code
  - `scripts/fusion-setup.sh` — Fusion setup; verify documented setup commands
  - `scripts/install-hud.sh` — HUD installer
  - `scripts/uninstall-hud.sh` — HUD uninstaller
  - `package.json` — Check `engines` field for Node.js version requirements
  - `.claude-plugin/plugin.json` — Plugin registration
  - `hooks/hooks.json` — Hook configuration; verify documented hook setup
  - Task 0 output — Structural baseline for path verification

  **Acceptance Criteria**:

  ```bash
  # Agent executes:
  # 1. read docs/en/INSTALLATION.md (full file)
  # 2. For each file path claim: glob <path>
  # 3. For each script reference: read <script> | grep <claimed_function_or_step>
  # 4. For package.json claims: read package.json | check engines field
  # 5. Produce table with all 5 columns filled, zero blanks
  ```

  **Output format**:
  ```markdown
  ## Audit: INSTALLATION.md

  | # | Item | Doc Content | Actual Status | Issue Type | Action |
  |---|------|-------------|---------------|------------|--------|
  ```

  **Evidence to Capture:**
  - [ ] Complete audit table — every claim verified
  - [ ] File:line citations for all findings

  **Commit**: NO (analysis-only)

---

### TASK 2: Audit docs/en/ARCHITECTURE.md

- [ ] 2. Audit docs/en/ARCHITECTURE.md

  **What to do**:
  1. Read `docs/en/ARCHITECTURE.md` in full
  2. Extract every verifiable claim: directory structure, module relationships, data flow descriptions, component names, file paths, architectural patterns
  3. For each claim, verify:
     - Directory/file structure claims → `glob` against actual structure + Task 0 baseline
     - Module dependency claims → `grep` for `import` statements in relevant files
     - Component names → verify exports exist in claimed files
     - Layer descriptions (hooks layer, router layer, orchestrator layer, etc.) → verify directories/files match
     - `hooks/` vs `src/hooks/` — verify doc correctly distinguishes them
  4. Produce audit table

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT evaluate architecture quality
  - Do NOT suggest improvements

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard doc audit, read/grep/glob operations
  - **Skills**: (none required)
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code writing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-8)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/en/ARCHITECTURE.md` — Full file read required

  **Code references to verify against**:
  - `src/` directory structure — All 9 subdirectories and their contents
  - `hooks/` (top-level) — 5 files: the hook entry points
  - `src/hooks/` — 4 files: hook logic implementations
  - `src/orchestrator/` — 9 files: orchestration layer
  - `src/router/` — 4 files: routing layer (balancer, rules, cache, mapping)
  - `src/context/` — 4 files: context layer
  - `src/tracking/` — 5 files: tracking/metrics layer
  - `src/hud/` — 7 files: HUD display layer
  - `src/executor/` — 4 files: execution layer
  - `src/config/schema.mjs` — Config schema
  - `src/utils/` — 10 files: shared utilities
  - Task 0 output — Structural baseline

  **Acceptance Criteria**:

  ```bash
  # Agent executes:
  # 1. read docs/en/ARCHITECTURE.md
  # 2. For each structural claim: glob to verify
  # 3. For each module relationship: grep for imports in source files
  # 4. For each layer description: verify directory + key files exist
  # 5. Verify hooks/ vs src/hooks/ distinction
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 3: Audit docs/en/FEATURES.md

- [ ] 3. Audit docs/en/FEATURES.md

  **What to do**:
  1. Read `docs/en/FEATURES.md` in full
  2. Extract every verifiable claim about features:
     - **Phase 1-5 features cross-check** (CRITICAL): For each documented phase/feature, verify the implementing code exists
     - Hook features → verify in `hooks/` files
     - Fusion features → verify in `src/orchestrator/fusion-orchestrator.mjs`, `src/router/`, `hooks/fusion-router.mjs`
     - HUD features → verify in `src/hud/` files
     - Tracking features → verify in `src/tracking/` files
     - Skill features → cross-reference with `skills/*/SKILL.md` (reference material)
     - Command features → cross-reference with `commands/*.md` (reference material)
  3. Mark performance claims (token savings %, latency reduction) as `UNVERIFIABLE`
  4. Produce audit table

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT audit `commands/*.md` or `skills/*/SKILL.md` independently
  - Do NOT validate performance numbers

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large doc, many cross-references, Phase 1-5 feature verification requires deep analysis across multiple source directories
  - **Skills**: (none required)
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code writing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-8)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/en/FEATURES.md` — Full file read required

  **Code references to verify against**:
  - `hooks/fusion-router.mjs` — Fusion routing hook
  - `hooks/read-optimizer.mjs` — Read optimization hook
  - `hooks/bash-optimizer.mjs` — Bash optimization hook
  - `hooks/tool-tracker.mjs` — Tool tracking hook
  - `src/orchestrator/fusion-orchestrator.mjs` — Fusion orchestration
  - `src/orchestrator/hybrid-ultrawork.mjs` — Hybrid ultrawork
  - `src/orchestrator/parallel-executor.mjs` — Parallel execution
  - `src/orchestrator/agent-fusion-map.mjs` — Agent mapping for fusion
  - `src/hud/omcm-hud.mjs` — HUD implementation
  - `src/hud/fusion-renderer.mjs` — Fusion HUD rendering
  - `src/tracking/realtime-tracker.mjs` — Real-time tracking
  - `src/tracking/metrics-collector.mjs` — Metrics collection
  - `src/context/context-sync.mjs` — Context synchronization
  - `src/router/` — All 4 files (balancer, rules, cache, mapping)
  - `skills/*/SKILL.md` — Cross-reference only (8 files)
  - `commands/*.md` — Cross-reference only

  **Phase 1-5 Cross-Check Protocol**:
  For each documented phase:
  1. List the features claimed for that phase
  2. For each feature, identify the implementing file(s) via grep
  3. Verify the export/function exists
  4. Mark: OK (exists), PHANTOM (doesn't exist), OUTDATED (partially exists), WRONG (exists but contradicts)

  **Acceptance Criteria**:

  ```bash
  # Agent executes:
  # 1. read docs/en/FEATURES.md
  # 2. Extract Phase 1-5 feature lists
  # 3. For each feature: grep across src/ for implementing code
  # 4. Cross-reference skills/ and commands/ when features reference them
  # 5. Mark performance claims as UNVERIFIABLE
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 4: Audit docs/en/API-REFERENCE.md

- [ ] 4. Audit docs/en/API-REFERENCE.md

  **What to do**:
  1. Read `docs/en/API-REFERENCE.md` in full
  2. Extract every verifiable API claim:
     - Function names → `grep` for `export` + function name in source
     - Parameter signatures → `read` the actual function definition and compare
     - Return types/shapes → `read` the implementation
     - Module paths (import locations) → verify file exists at claimed path
     - Configuration API keys → `grep` in `src/config/schema.mjs` and `src/utils/config.mjs`
  3. For each documented function/export:
     - Verify it exists in the claimed file
     - Verify the parameter list matches (names, count)
     - Verify the described behavior is not contradicted by the code signature
  4. Produce audit table

  **Must NOT do**:
  - Do NOT trace execution logic (medium depth only: existence + signature)
  - Do NOT modify any files
  - Do NOT evaluate API design quality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API verification requires precise signature matching — high attention to detail needed
  - **Skills**: (none required)
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code writing — only reading

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-8)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/en/API-REFERENCE.md` — Full file read required

  **Code references to verify against**:
  - `src/utils/config.mjs` — Config API
  - `src/utils/context.mjs` — Context utility API
  - `src/utils/session-id.mjs` — Session ID API
  - `src/utils/state-manager.mjs` — State manager API
  - `src/utils/tool-counter.mjs` — Tool counter API
  - `src/utils/fusion-tracker.mjs` — Fusion tracker API
  - `src/utils/provider-limits.mjs` — Provider limits API
  - `src/utils/usage.mjs` — Usage API
  - `src/utils/project-root.mjs` — Project root API
  - `src/utils/handoff-context.mjs` — Handoff context API
  - `src/config/schema.mjs` — Config schema definition
  - `src/context/index.mjs` — Context module exports
  - `src/tracking/index.mjs` — Tracking module exports
  - `src/orchestrator/index.mjs` — Orchestrator module exports
  - `src/hud/index.mjs` — HUD module exports
  - Any file referenced in API-REFERENCE.md not listed above

  **Acceptance Criteria**:

  ```bash
  # Agent executes:
  # 1. read docs/en/API-REFERENCE.md
  # 2. For each documented function: grep "export.*functionName" src/**/*.mjs
  # 3. For each documented parameter: read <file> and compare signature
  # 4. For each import path: glob to verify file exists
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 5: Audit docs/en/CONFIGURATION.md

- [ ] 5. Audit docs/en/CONFIGURATION.md

  **What to do**:
  1. Read `docs/en/CONFIGURATION.md` in full
  2. Extract every verifiable claim:
     - Config file paths → verify existence via `glob`
     - Config key names → `grep` in `src/config/schema.mjs` and `src/utils/config.mjs`
     - Default values → `read` the schema/config source to compare
     - Config file format (JSON structure) → verify against actual schema
     - Environment variable references → `grep` across `src/` for `process.env`
     - HUD config → verify in `src/hud/` files
  3. Produce audit table

  **Must NOT do**:
  - Do NOT modify config files
  - Do NOT evaluate config design

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard doc audit, focused on config verification
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-8)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/en/CONFIGURATION.md` — Full file read required

  **Code references to verify against**:
  - `src/config/schema.mjs` — Config schema definition (primary source of truth)
  - `src/utils/config.mjs` — Config loading/reading logic
  - `src/hud/omcm-hud.mjs` — HUD configuration consumption
  - `src/hud/mode-detector.mjs` — Mode detection config
  - `hooks/hooks.json` — Hook configuration structure
  - `src/utils/provider-limits.mjs` — Provider-specific config
  - `scripts/fusion-setup.sh` — Setup-time configuration
  - All `src/**/*.mjs` — for `process.env` grep (env var verification)

  **Acceptance Criteria**:

  ```bash
  # 1. read docs/en/CONFIGURATION.md
  # 2. For each config key: grep "key_name" src/config/schema.mjs src/utils/config.mjs
  # 3. For each default value: read source, compare
  # 4. For each config file path: glob to verify
  # 5. grep -r "process.env" src/ to find all env vars, compare with documented ones
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 6: Audit docs/en/FUSION-GUIDE.md

- [ ] 6. Audit docs/en/FUSION-GUIDE.md

  **What to do**:
  1. Read `docs/en/FUSION-GUIDE.md` in full
  2. Extract every verifiable claim about the Fusion system:
     - Fusion architecture components → verify in `src/orchestrator/fusion-orchestrator.mjs`, `src/orchestrator/agent-fusion-map.mjs`
     - Agent mapping claims → verify in `scripts/agent-mapping.json` and `src/orchestrator/agent-fusion-map.mjs`
     - Router logic → verify in `src/router/` files and `hooks/fusion-router.mjs`, `src/hooks/fusion-router-logic.mjs`
     - Setup steps → verify in `scripts/fusion-setup.sh`, `scripts/fusion.sh`, `scripts/fusion-bridge.sh`
     - Handoff logic → verify in `src/hooks/detect-handoff.mjs`, `src/utils/handoff-context.mjs`, `scripts/handoff-to-opencode.sh`
     - Provider/model references → verify in `src/utils/provider-limits.mjs`
  3. Produce audit table

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT evaluate fusion architecture quality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard doc audit, focused on fusion system verification
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7-8)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/en/FUSION-GUIDE.md` — Full file read required

  **Code references to verify against**:
  - `src/orchestrator/fusion-orchestrator.mjs` — Main fusion orchestrator
  - `src/orchestrator/agent-fusion-map.mjs` — Agent-to-model mapping
  - `src/orchestrator/fallback-orchestrator.mjs` — Fallback handling
  - `hooks/fusion-router.mjs` — Top-level fusion router hook
  - `src/hooks/fusion-router-logic.mjs` — Fusion routing logic
  - `src/hooks/detect-handoff.mjs` — Handoff detection
  - `src/router/balancer.mjs` — Load balancing
  - `src/router/rules.mjs` — Routing rules
  - `src/router/mapping.mjs` — Route mapping
  - `src/router/cache.mjs` — Route caching
  - `scripts/agent-mapping.json` — Agent mapping config (JSON source of truth)
  - `scripts/fusion-setup.sh` — Fusion setup script
  - `scripts/fusion.sh` — Fusion runner
  - `scripts/fusion-bridge.sh` — Bridge to external providers
  - `scripts/handoff-to-opencode.sh` — Handoff script
  - `src/utils/handoff-context.mjs` — Handoff context builder
  - `src/utils/provider-limits.mjs` — Provider limits data

  **Acceptance Criteria**:

  ```bash
  # 1. read docs/en/FUSION-GUIDE.md
  # 2. For each agent mapping claim: read scripts/agent-mapping.json, compare
  # 3. For each routing rule: grep in src/router/rules.mjs
  # 4. For each setup step: verify script and command exist
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 7: Audit docs/en/SKILLS-REFERENCE.md

- [ ] 7. Audit docs/en/SKILLS-REFERENCE.md

  **What to do**:
  1. Read `docs/en/SKILLS-REFERENCE.md` in full
  2. Extract every verifiable claim about skills:
     - Skill names → verify matching directory exists in `skills/`
     - Skill descriptions → cross-reference with `skills/*/SKILL.md` content
     - Skill commands/triggers → verify in `commands/*.md`
     - Skill file paths → `glob` to verify
     - Skill counts (e.g., "8 skills") → count actual `skills/` directories
  3. Check for MISSING skills (exist in `skills/` but not documented)
  4. Check for PHANTOM skills (documented but no `skills/` directory)
  5. Produce audit table

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT create standalone audit tables for individual SKILL.md files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard doc audit with cross-referencing
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-6, 8)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/en/SKILLS-REFERENCE.md` — Full file read required

  **Cross-reference material** (read but don't audit independently):
  - `skills/autopilot/SKILL.md` — Autopilot skill definition
  - `skills/cancel/SKILL.md` — Cancel skill definition
  - `skills/ecomode/SKILL.md` — Ecomode skill definition
  - `skills/hulw/SKILL.md` — HULW skill definition
  - `skills/hybrid-ultrawork/SKILL.md` — Hybrid ultrawork skill definition
  - `skills/opencode/SKILL.md` — OpenCode skill definition
  - `skills/ralph/SKILL.md` — Ralph skill definition
  - `skills/ulw/SKILL.md` — ULW skill definition
  - `commands/*.md` — Command definitions (all 8 files)

  **Acceptance Criteria**:

  ```bash
  # 1. read docs/en/SKILLS-REFERENCE.md
  # 2. glob skills/*/SKILL.md to get actual skill list
  # 3. Compare documented skills vs actual skills
  # 4. For each documented skill: read skills/<name>/SKILL.md and compare description
  # 5. glob commands/*.md to verify command references
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 8: Audit docs/en/TROUBLESHOOTING.md

- [ ] 8. Audit docs/en/TROUBLESHOOTING.md

  **What to do**:
  1. Read `docs/en/TROUBLESHOOTING.md` in full
  2. Extract every verifiable claim:
     - Error messages → `grep` in source code for matching strings
     - Fix commands/steps → verify referenced files/scripts exist
     - Config paths mentioned → verify via `glob`
     - Log file locations → verify in `src/tracking/` files
     - Common issues tied to specific components → verify components exist
  3. Produce audit table

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT test if troubleshooting steps actually work (static analysis only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard doc audit
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-7)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/en/TROUBLESHOOTING.md` — Full file read required

  **Code references to verify against**:
  - All source files referenced in troubleshooting steps
  - `src/tracking/` — Log/metrics files
  - `src/utils/config.mjs` — Config-related troubleshooting
  - `hooks/hooks.json` — Hook configuration issues
  - `install.sh` — Installation troubleshooting
  - `scripts/` — Script-related fixes

  **Acceptance Criteria**:

  ```bash
  # 1. read docs/en/TROUBLESHOOTING.md
  # 2. For each error message: grep -r "error string" src/ hooks/ scripts/
  # 3. For each fix step: verify referenced file/command exists
  # 4. For each config path: glob to verify
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 9: Audit docs/README.md

- [ ] 9. Audit docs/README.md (Index Page)

  **What to do**:
  1. Read `docs/README.md` (small file, ~25 lines — index/navigation page)
  2. Verify every internal link points to an existing file
  3. Verify section organization matches actual docs/ structure
  4. Check if any docs/en/ or docs/ko/ files are NOT linked from this index
  5. Produce audit table

  **Must NOT do**:
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Very small file (~25 lines), simple link verification
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 10)
  - **Blocks**: Task 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `docs/README.md` — Full file read required

  **Code references to verify against**:
  - `docs/en/*.md` — All 8 files (link targets)
  - `docs/ko/*.md` — All 8 files (link targets)
  - `docs/CHANGELOG.md` — Potential link target

  **Acceptance Criteria**:

  ```bash
  # 1. read docs/README.md
  # 2. Extract all [text](path) links
  # 3. For each link: glob target path
  # 4. Check for unlisted docs/en/ or docs/ko/ files
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 10: Audit Root README.md (EN Section)

- [ ] 10. Audit Root README.md (EN Section)

  **What to do**:
  1. Read `README.md` (large file, ~600+ lines, bilingual)
  2. Identify the English section(s) — may be interleaved or separate
  3. Extract every verifiable claim from the EN section:
     - File tree diagram → compare with Task 0 baseline (reference, don't re-audit)
     - Feature claims → cross-reference with Task 3 findings if available, or verify independently
     - Agent counts, skill counts → verify via `glob`
     - Code snippets → verify against actual source
     - Version references → note for Task 12
     - Performance claims → mark as `UNVERIFIABLE`
     - Installation instructions → cross-reference with Task 1 findings if available
  4. Produce audit table

  **Must NOT do**:
  - Do NOT audit the Korean section against code (that's covered by ko/en sync)
  - Do NOT re-audit the file tree (reference Task 0)
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Very large file (~600+ lines), bilingual content to parse, many cross-references
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 9)
  - **Blocks**: Tasks 11, 14
  - **Blocked By**: Task 0

  **References**:

  **Primary audit target**:
  - `README.md` — Full file read required (EN sections only)

  **Code references to verify against**:
  - Task 0 output — Structural baseline (do NOT re-audit tree, reference it)
  - All `src/` directories and files — for feature verification
  - `skills/` — 8 directories (count verification)
  - `hooks/` — 5 files (count verification)
  - `scripts/` — 11 files
  - `commands/` — for command references
  - `package.json` — Version, metadata
  - `.claude-plugin/plugin.json` — Plugin metadata
  - `.claude-plugin/marketplace.json` — Marketplace metadata

  **Acceptance Criteria**:

  ```bash
  # 1. read README.md (full)
  # 2. Identify EN vs KO sections
  # 3. For each EN claim: verify against code
  # 4. Reference Task 0 for file tree instead of re-auditing
  # 5. Mark performance/percentage claims as UNVERIFIABLE
  ```

  **Output format**: Same per-doc audit table format

  **Commit**: NO (analysis-only)

---

### TASK 11: Ko/En Sync Comparison

- [ ] 11. Ko/En Sync Comparison (All 8 Doc Pairs)

  **What to do**:
  1. For each of the 8 doc pairs (`docs/en/<name>.md` ↔ `docs/ko/<name>.md`):
     a. Read both files
     b. Compare section headings (H1, H2, H3) — are they structurally equivalent?
     c. Compare content within each section:
        - Same number of items/claims?
        - Same code snippets?
        - Same file path references?
        - Same version references?
     d. Identify sections present in one but missing in the other
     e. Identify content that differs beyond translation (extra content, removed content, different examples)
  2. Also compare: `docs/CHANGELOG.md` vs root `CHANGELOG.md` — are they identical, divergent, or is one a subset?
  3. Produce sync table per doc pair (8 tables)

  **Must NOT do**:
  - Do NOT audit Korean content against code (that's the EN audit's job)
  - Do NOT evaluate translation quality
  - Do NOT flag formatting-only differences (whitespace, markdown style)
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 8 doc pairs × 2 files each = 16 files to compare structurally. Requires systematic section-by-section comparison. High attention to detail.
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 1-8, 10

  **References**:

  **Primary comparison targets** (all 8 pairs):
  - `docs/en/INSTALLATION.md` ↔ `docs/ko/INSTALLATION.md`
  - `docs/en/ARCHITECTURE.md` ↔ `docs/ko/ARCHITECTURE.md`
  - `docs/en/FEATURES.md` ↔ `docs/ko/FEATURES.md`
  - `docs/en/API-REFERENCE.md` ↔ `docs/ko/API-REFERENCE.md`
  - `docs/en/CONFIGURATION.md` ↔ `docs/ko/CONFIGURATION.md`
  - `docs/en/FUSION-GUIDE.md` ↔ `docs/ko/FUSION-GUIDE.md`
  - `docs/en/SKILLS-REFERENCE.md` ↔ `docs/ko/SKILLS-REFERENCE.md`
  - `docs/en/TROUBLESHOOTING.md` ↔ `docs/ko/TROUBLESHOOTING.md`

  **Additional sync check**:
  - `docs/CHANGELOG.md` ↔ `CHANGELOG.md` (root) — identity/divergence

  **Acceptance Criteria**:

  ```bash
  # For each pair:
  # 1. read docs/en/<name>.md — extract section headings
  # 2. read docs/ko/<name>.md — extract section headings
  # 3. Compare heading lists for structural parity
  # 4. For each section: compare claim counts, code snippets, path references
  # 5. Flag SYNC_DIFF for any meaningful divergence
  ```

  **Output format**:
  ```markdown
  ## Ko/En Sync: <name>.md

  | # | Section | EN Status | KO Status | Diff Type | Detail |
  |---|---------|-----------|-----------|-----------|--------|
  | 1 | Installation Steps | 5 items | 5 items | OK | Match |
  | 2 | Prerequisites | 3 items | 4 items | SYNC_DIFF | KO has extra "수동 설치" |
  ```

  **Evidence to Capture:**
  - [ ] 8 sync tables (one per doc pair)
  - [ ] 1 CHANGELOG identity check
  - [ ] Section-level granularity (not just "files differ")

  **Commit**: NO (analysis-only)

---

### TASK 12: Version Consistency Check

- [ ] 12. Version Consistency Check

  **What to do**:
  1. Read version strings from:
     - `package.json` → `version` field
     - `.claude-plugin/plugin.json` → version field
     - `.claude-plugin/marketplace.json` → version field
  2. Search for version strings in all 10 target docs:
     - `grep` for version patterns (semver like `\d+\.\d+\.\d+`) in each doc
  3. Compare all found versions — are they consistent?
  4. Produce version consistency table

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT change version numbers

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused task — read 3 JSON files, grep 10 docs
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13)
  - **Blocks**: Task 14
  - **Blocked By**: Task 0

  **References**:

  **Version source files**:
  - `package.json` — `"version": "..."` field
  - `.claude-plugin/plugin.json` — version field
  - `.claude-plugin/marketplace.json` — version field

  **Docs to search**:
  - All 10 target docs (README.md, 8 docs/en/*.md, docs/README.md)

  **Acceptance Criteria**:

  ```bash
  # 1. read package.json | extract version
  # 2. read .claude-plugin/plugin.json | extract version
  # 3. read .claude-plugin/marketplace.json | extract version
  # 4. grep -E "[0-9]+\.[0-9]+\.[0-9]+" in each doc
  # 5. Compare all versions found
  ```

  **Output format**:
  ```markdown
  ## Version Consistency

  | Source | Version | Consistent? | Detail |
  |--------|---------|-------------|--------|
  | package.json | 1.2.3 | ✅ | — |
  | plugin.json | 1.2.3 | ✅ | — |
  | marketplace.json | 1.2.3 | ✅ | — |
  | docs/en/INSTALLATION.md line 15 | 1.2.0 | ❌ OUTDATED | Was 1.2.0, now 1.2.3 |
  ```

  **Commit**: NO (analysis-only)

---

### TASK 13: Link/Path Validity Check

- [ ] 13. Link/Path Validity Check

  **What to do**:
  1. For each of the 10 target docs:
     a. Extract all internal markdown links: `[text](path)` patterns
     b. Classify each link:
        - Relative file path → `glob` to verify target exists
        - Anchor link (`#section`) → verify section heading exists in target file
        - External URL → mark as `SKIPPED` (not in scope)
     c. Check for broken internal links
  2. Also check `docs/CHANGELOG.md` vs root `CHANGELOG.md`:
     - Are they identical files? (compare line count + first/last lines)
     - Is one a symlink?
  3. Produce link validity table

  **Must NOT do**:
  - Do NOT follow external URLs
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Systematic link extraction and verification across 10 files
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12)
  - **Blocks**: Task 14
  - **Blocked By**: Task 0

  **References**:

  **Files to scan**:
  - All 10 target docs
  - `docs/CHANGELOG.md` and `CHANGELOG.md` (root) — identity check

  **Acceptance Criteria**:

  ```bash
  # 1. For each doc: grep -oE '\[.*?\]\(.*?\)' to extract links
  # 2. For each internal link: glob target path
  # 3. For anchor links: grep for heading in target file
  # 4. For docs/CHANGELOG.md vs CHANGELOG.md: wc -l both, diff first 5 lines
  ```

  **Output format**:
  ```markdown
  ## Link/Path Validity

  | # | Source Doc | Link Text | Target Path | Valid? | Issue Type | Detail |
  |---|-----------|-----------|-------------|--------|------------|--------|
  | 1 | INSTALLATION.md | "install script" | ../install.sh | ✅ | OK | — |
  | 2 | ARCHITECTURE.md | "router module" | ../../src/router/ | ❌ | PHANTOM | Directory exists but link path wrong |
  ```

  **Commit**: NO (analysis-only)

---

### TASK 14: Consolidation + Summary Statistics

- [ ] 14. Consolidation + Summary Statistics

  **What to do**:
  1. Collect all outputs from Tasks 0-13
  2. Produce a single consolidated markdown document containing:
     a. **Summary Statistics Dashboard** at the top:
        ```
        Total items checked: N
        OK: N | OUTDATED: N | MISSING: N | PHANTOM: N | WRONG: N | SYNC_DIFF: N | UNVERIFIABLE: N
        ```
     b. All 10 per-doc audit tables (Tasks 0-10)
     c. All 8 ko/en sync tables (Task 11)
     d. Version consistency table (Task 12)
     e. Link/path validity table (Task 13)
  3. Compute summary statistics by counting issue types across all tables
  4. Flag the top issues: which docs have the most problems? Which issue type is most common?

  **Must NOT do**:
  - Do NOT modify any source files
  - Do NOT propose fixes or rewrites
  - Do NOT add editorial commentary

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Aggregation and formatting task — assembling existing outputs
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: NO (final aggregation)
  - **Parallel Group**: Wave 4 (solo)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 11, 12, 13

  **References**:
  - All outputs from Tasks 0-13

  **Acceptance Criteria**:

  ```
  # Verify:
  # 1. Single consolidated document exists
  # 2. Summary statistics at top with all 7 issue types counted
  # 3. All 10 doc audit tables present
  # 4. All 8 ko/en sync tables present
  # 5. Version table present
  # 6. Link validity table present
  # 7. Zero blank cells in any table
  ```

  **Output format**: Single markdown document with all tables and summary

  **Commit**: NO (analysis-only)

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| Task 0 | None | Structural baseline — first task, no prerequisites |
| Task 1 | Task 0 | Needs baseline for path verification |
| Task 2 | Task 0 | Needs baseline for structural claims |
| Task 3 | Task 0 | Needs baseline for Phase 1-5 feature locations |
| Task 4 | Task 0 | Needs baseline for API file path verification |
| Task 5 | Task 0 | Needs baseline for config path verification |
| Task 6 | Task 0 | Needs baseline for fusion component paths |
| Task 7 | Task 0 | Needs baseline for skill directory verification |
| Task 8 | Task 0 | Needs baseline for troubleshooting path references |
| Task 9 | Task 0 | Needs baseline for link target verification |
| Task 10 | Task 0 | Needs baseline (references file tree) |
| Task 11 | Tasks 1-8, 10 | Needs EN audit findings for context; reads same files |
| Task 12 | Task 0 | Needs baseline for version locations |
| Task 13 | Task 0 | Needs baseline for path resolution |
| Task 14 | Tasks 11, 12, 13 | Aggregates ALL outputs into final report |

## Parallel Execution Graph

```
Wave 0 (Start immediately — BLOCKING):
└── Task 0: Structural Baseline (README file tree)

Wave 1 (After Wave 0 — fan out 8 parallel agents):
├── Task 1: INSTALLATION.md audit
├── Task 2: ARCHITECTURE.md audit
├── Task 3: FEATURES.md audit
├── Task 4: API-REFERENCE.md audit
├── Task 5: CONFIGURATION.md audit
├── Task 6: FUSION-GUIDE.md audit
├── Task 7: SKILLS-REFERENCE.md audit
└── Task 8: TROUBLESHOOTING.md audit

Wave 2 (After Wave 0, parallel with Wave 1):
├── Task 9:  docs/README.md audit (small)
└── Task 10: Root README.md EN-section audit (large)

Wave 3 (After Waves 1+2 complete):
├── Task 11: Ko/En sync comparison (8 pairs)
├── Task 12: Version consistency check
└── Task 13: Link/path validity check

Wave 4 (Final — after Wave 3):
└── Task 14: Consolidation + summary statistics

Critical Path: Task 0 → Task 3 (largest Wave 1 task) → Task 11 → Task 14
Parallel Speedup: ~65% faster than sequential (10 tasks in Wave 1+2 run simultaneously)
```

---

## Commit Strategy

**No commits.** This is a read-only analysis task. Zero files are modified.

---

## Success Criteria

### Final Checklist
- [ ] All 10 docs have complete audit tables (no blank cells)
- [ ] All 8 ko/en pairs have sync comparison tables
- [ ] Version consistency table covers package.json + plugin.json + marketplace.json + doc mentions
- [ ] Link/path validity table covers all internal links in all 10 docs
- [ ] Summary statistics computed: total + per-issue-type counts
- [ ] Every finding cites evidence (file:line or search command attempted)
- [ ] Zero files modified in the entire process
- [ ] `hooks/` (top-level) and `src/hooks/` correctly distinguished throughout
- [ ] Phase 1-5 features explicitly cross-checked in FEATURES.md audit
- [ ] Performance/percentage claims marked UNVERIFIABLE (not OK or WRONG)
