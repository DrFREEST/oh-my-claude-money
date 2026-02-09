# OMCM Feature Inventory & Cross-Validation Audit

## TL;DR

> **Quick Summary**: Read-only audit that derives a complete feature inventory from source code, then cross-validates it against install/uninstall scripts, all documentation, and plugin metadata/versioning. Outputs four canonical tables (A-D) plus an anomaly report.
>
> **Deliverables**: Single Markdown report containing:
> - Table A: Code-Derived Feature Inventory
> - Table B: Install/Uninstall Coverage Matrix
> - Table C: Documentation Coverage Matrix
> - Table D: Version Consistency Matrix
> - Anomaly Summary with all discrepancies
>
> **Estimated Effort**: Medium (analysis-only, no code changes)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Wave 0 (taxonomy) -> Wave 1 (4 parallel scans) -> Wave 2 (2 parallel cross-validations) -> Wave 3 (synthesis)

---

## Context

### Original Request
Derive a full implemented feature inventory from code, then cross-validate against install.sh/uninstall.sh and README/docs/CHANGELOG/plugin metadata/package.json versions. Output maps directly to final tables A-D. Analysis-only — zero code changes.

### Repository Structure
```
/opt/oh-my-claude-money/
├── src/
│   ├── orchestrator/    — fusion-orchestrator.mjs, hybrid-ultrawork.mjs, parallel-executor.mjs
│   ├── router/          — balancer.mjs, rules engine, cache
│   ├── tracking/        — realtime-tracker.mjs
│   ├── context/         — context-builder.mjs
│   ├── executor/        — opencode-server-pool.mjs, acp-client.mjs
│   ├── hooks/           — fusion-router-logic, detect-handoff, tool tracking (internal logic)
│   ├── hud/             — HUD integration
│   └── config/          — schema, defaults
├── hooks/               — PreToolUse/PostToolUse Claude hook entry points (DISTINCT from src/hooks/)
├── skills/              — SKILL.md declarative definitions (hulw, autopilot, etc.)
├── tests/               — unit, router, config, integration
├── install.sh           — 882-line lifecycle installer
├── uninstall.sh         — 215-line lifecycle uninstaller
├── package.json         — v1.0.0
├── .claude-plugin/
│   ├── plugin.json      — v1.0.0
│   └── marketplace.json — v1.0.0
├── README.md
├── CHANGELOG.md         — v0.3.x through v1.0.0
└── docs/
    ├── en/              — FEATURES, ARCHITECTURE, CONFIGURATION, FUSION-GUIDE, etc.
    └── ko/              — Mirror (Korean)
```

### Metis Review
**Identified Gaps (all addressed in plan)**:
- **Feature granularity undefined** -> Resolved: Wave 0 defines 2-level taxonomy (Module > Feature) with shared schema
- **Two CHANGELOG files may exist** -> Resolved: Task 1B checks both root and docs/ CHANGELOGs for divergence
- **Doc scope was incomplete** -> Resolved: Table C expanded to all 8 doc types
- **Barrel/index.mjs files inflate count** -> Resolved: Guardrail G-BARREL excludes re-export files
- **skills/ vs src/ overlap risk** -> Resolved: Guardrail G-DEDUP links skills to their src/ implementations
- **hooks/ (root) vs src/hooks/ conflation** -> Resolved: Guardrail G-HOOKS distinguishes entry points from logic
- **install.sh needs operation tracing, not keyword grep** -> Resolved: Task 1B instructions specify tracing cp/ln/mkdir/rsync/chmod ops
- **No acceptance criteria** -> Resolved: AC1-AC7 defined below

---

## Work Objectives

### Core Objective
Produce a machine-parseable, complete feature audit report for OMCM that maps every implemented capability to its install/uninstall handling, documentation coverage, and version consistency.

### Concrete Deliverables
- `.sisyphus/evidence/omcm-audit-report.md` — Single Markdown file with Tables A-D + Anomaly Summary

### Definition of Done
- [ ] Table A covers every `.mjs` source module and every `SKILL.md` skill
- [ ] Tables B and C have identical feature sets to Table A (set equality verified)
- [ ] Table D covers every file containing a version string
- [ ] Zero blank cells in any table (every cell is `Y`, `N`, `Partial`, `N/A`, or a version string)
- [ ] Anomaly Summary lists every `N` and `Partial` entry with one-line explanation

### Must Have
- All four tables in a single output file
- Feature granularity at the 2-level Module > Feature taxonomy
- Distinction between hooks/ (entry points) and src/hooks/ (internal logic)
- Distinction between skills/ (declarative) and src/ (runtime code)
- Cross-validation proving set equality between tables

### Must NOT Have (Guardrails)
- **G-READONLY**: NO file modifications, code changes, or destructive commands. Read-only analysis ONLY.
- **G-NO-OPINIONS**: NO code quality commentary, recommendations, or fix suggestions. Anomalies only.
- **G-NO-SCOPE-CREEP**: NO test coverage analysis, dependency audit, or config schema validation.
- **G-BARREL**: Barrel/index.mjs re-export files are NOT features. Exclude from Table A.
- **G-DEDUP**: A skill (skills/X/SKILL.md) and its implementation (src/Y/X.mjs) are ONE feature, not two.
- **G-HOOKS**: Root `hooks/` = Claude hook entry points. `src/hooks/` = internal logic modules. Different categories.
- **G-NO-BILINGUAL**: Bilingual parity (en/ vs ko/) is OUT OF SCOPE unless user explicitly adds it.
- **G-NO-DEPRECATED**: CHANGELOG features marked as removed/deprecated are noted separately, NOT flagged as "missing from source."

---

## Shared Taxonomy & Output Schema (Wave 0 — CRITICAL)

### Feature Granularity Definition

Every feature is classified at two levels:

| Level | Definition | Example |
|-------|-----------|---------|
| **Module** | Directory-level grouping in `src/` or top-level category | `orchestrator`, `router`, `hooks-entry`, `skills` |
| **Feature** | Distinct exported capability, class, or named behavior | `FusionOrchestrator`, `MultiProviderBalancer`, `hulw-skill` |

**Rules for Feature Identification:**
1. Each non-barrel `.mjs` file in `src/` contributes >=1 feature (its primary export)
2. Each `SKILL.md` in `skills/` is ONE feature (linked to src/ implementation if one exists via G-DEDUP)
3. Each root `hooks/*.mjs` file is ONE feature (hook entry point)
4. `hooks.json` is configuration metadata, NOT a feature
5. Files like `constants.mjs`, `utils.mjs`, `index.mjs` are infrastructure, NOT features

### Mandatory Output Schema for All Wave 1 Agents

**Table A rows (emitted by Task 1A):**
```
| Module | Feature ID | Feature Name | Source File(s) | Type | Description |
```
- **Module**: Directory-level group (e.g., `orchestrator`, `router`, `skills`)
- **Feature ID**: Slugified unique key (e.g., `fusion-orchestrator`, `hulw-skill`)
- **Feature Name**: Human-readable name
- **Source File(s)**: Comma-separated relative paths
- **Type**: `runtime` | `skill` | `hook-entry` | `config`
- **Description**: One-line functional summary

**Table B rows (emitted by Task 1B):**
```
| Feature ID | Installed By | Install Method | Uninstalled By | Uninstall Method | Symmetric |
```
- **Installed By**: File:line or `N/A`
- **Install Method**: `cp`, `ln -s`, `mkdir`, `rsync`, `hook-inject`, `npm`, `N/A`
- **Uninstalled By**: File:line or `N/A`
- **Symmetric**: `Y` | `N` | `Partial`

**Table C rows (emitted by Task 1C):**
```
| Feature ID | README | FEATURES | ARCH | CONFIG | FUSION-GUIDE | CHANGELOG | SKILLS-REF | API-REF | INSTALL-DOC | TROUBLESHOOT |
```
- Each cell: `Y` | `N` | `Partial` | `N/A`

**Table D rows (emitted by Task 1D):**
```
| File | Declared Version | Matches package.json | Notes |
```

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (361+ tests in tests/)
- **User wants tests**: NO — this is analysis-only, no code to test
- **QA approach**: Automated verification via command output inspection

### Automated Verification (per acceptance criterion)

| AC | Criterion | Verification Command |
|----|-----------|---------------------|
| AC1 | Table A has row for every non-barrel .mjs in src/ and every SKILL.md in skills/ | `grep -c '|' audit-report.md` section A >= count of `find src -name '*.mjs' ! -name 'index.mjs'` + `find skills -name 'SKILL.md'` |
| AC2 | Table B features == Table A features | Extract Feature ID columns from A and B, diff them. Diff must be empty. |
| AC3 | Table C features == Table A features | Extract Feature ID columns from A and C, diff them. Diff must be empty. |
| AC4 | Table D has all version-bearing files | `grep -rl '"version"' package.json .claude-plugin/ CHANGELOG.md install.sh` count matches Table D rows |
| AC5 | Zero blank cells | `grep -P '\| \s*\|' audit-report.md` returns 0 matches |
| AC6 | Anomaly Summary lists all N/Partial entries | Count of N/Partial in Tables B+C == count of items in Anomaly Summary |
| AC7 | Single parseable Markdown with 4 delimited tables | File exists at `.sisyphus/evidence/omcm-audit-report.md`, contains `## Table A`, `## Table B`, `## Table C`, `## Table D`, `## Anomaly Summary` headers |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Sequential — Foundation):
└── Task 0: Define & emit shared taxonomy + output schema

Wave 1 (Fully Parallel — 4 agents):
├── Task 1A: Source Code Feature Extraction        [no deps beyond Wave 0]
├── Task 1B: Install/Uninstall Operation Tracing   [no deps beyond Wave 0]
├── Task 1C: Documentation Coverage Scan           [no deps beyond Wave 0]
└── Task 1D: Version String Inventory              [no deps beyond Wave 0]

Wave 2 (Parallel — 2 agents):
├── Task 2A: Cross-validate Table A vs Table B     [depends: 1A, 1B]
└── Task 2B: Cross-validate Table A vs Table C     [depends: 1A, 1C]

Wave 3 (Sequential — Synthesis):
└── Task 3: Assemble final report + anomaly summary [depends: ALL]
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 0 | None | 1A, 1B, 1C, 1D | None (must be first) |
| 1A | 0 | 2A, 2B, 3 | 1B, 1C, 1D |
| 1B | 0 | 2A, 3 | 1A, 1C, 1D |
| 1C | 0 | 2B, 3 | 1A, 1B, 1D |
| 1D | 0 | 3 | 1A, 1B, 1C |
| 2A | 1A, 1B | 3 | 2B |
| 2B | 1A, 1C | 3 | 2A |
| 3 | 2A, 2B, 1D | None (final) | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 0 | 0 | `delegate_task(category="quick", load_skills=[])` — taxonomy definition only |
| 1 | 1A, 1B, 1C, 1D | `delegate_task(category="unspecified-high", load_skills=[], run_in_background=true)` x4 |
| 2 | 2A, 2B | `delegate_task(category="unspecified-high", load_skills=[], run_in_background=true)` x2 |
| 3 | 3 | `delegate_task(category="unspecified-high", load_skills=[])` — blocking, produces final output |

---

## TODOs

- [ ] 0. Define Shared Feature Taxonomy & Emit Schema

  **What to do**:
  - Read the repo directory structure: `find src -name '*.mjs'`, `find skills -name 'SKILL.md'`, `find hooks -name '*.mjs'`
  - Identify barrel/index.mjs files and mark them as EXCLUDED
  - Identify utility/infrastructure files (constants, utils) and mark as EXCLUDED
  - Identify skill-to-source overlaps (e.g., `skills/hybrid-ultrawork/SKILL.md` <-> `src/orchestrator/hybrid-ultrawork.mjs`) and record as DEDUP pairs
  - Emit a taxonomy reference file at `.sisyphus/evidence/taxonomy.md` listing:
    - All Modules (directory groups)
    - All candidate Feature IDs with source file paths
    - EXCLUDED files with reason
    - DEDUP pairs
  - This file is the SHARED CONTRACT for all Wave 1 agents

  **Must NOT do**:
  - Do NOT read file contents beyond what's needed for export identification
  - Do NOT produce Table A (that's Task 1A's job)
  - Do NOT modify any source files (G-READONLY)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Structural listing only, no deep analysis
  - **Skills**: `[]`
    - No specialized skills needed; uses Glob, Grep, Read
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not applicable (no UI work)
    - `git-master`: Not applicable (no git operations)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (must complete before Wave 1)
  - **Blocks**: 1A, 1B, 1C, 1D
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/orchestrator/index.mjs` — Example barrel file to EXCLUDE (re-exports only)
  - `src/orchestrator/fusion-orchestrator.mjs` — Example feature file to INCLUDE (primary export)
  - `skills/hulw/SKILL.md` — Example skill declaration to INCLUDE

  **Structural References**:
  - `hooks/` (root) — Claude hook entry points (4 scripts + hooks.json)
  - `src/hooks/` — Internal logic modules (different category)
  - `skills/` — Declarative SKILL.md files (link to src/ counterparts)

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  cat .sisyphus/evidence/taxonomy.md | head -5
  # Assert: Contains "## Modules" header
  
  grep -c "EXCLUDED" .sisyphus/evidence/taxonomy.md
  # Assert: >= 3 (at least barrel files excluded)
  
  grep -c "DEDUP" .sisyphus/evidence/taxonomy.md
  # Assert: >= 1 (at least hybrid-ultrawork pair)
  
  grep -c "Feature ID" .sisyphus/evidence/taxonomy.md
  # Assert: >= 15 (reasonable feature count for this codebase)
  ```

  **Commit**: NO

---

- [ ] 1A. Source Code Feature Extraction (-> Table A)

  **What to do**:
  - Read `.sisyphus/evidence/taxonomy.md` for the shared taxonomy contract
  - For each non-excluded `.mjs` file in `src/`:
    - Read the file
    - Identify primary exported functions, classes, or objects using `ast_grep_search` patterns:
      - `export function $NAME($$$) { $$$ }`
      - `export class $NAME { $$$ }`
      - `export default $EXPR`
      - `export const $NAME = $VALUE`
    - Record: Module, Feature ID, Feature Name, Source File, Type=`runtime`, Description
  - For each `SKILL.md` in `skills/`:
    - Read the file
    - Extract skill name, purpose, trigger keywords
    - Check DEDUP pairs from taxonomy — if src/ counterpart exists, list BOTH files in Source File(s) column
    - Record: Module=`skills`, Feature ID=`{name}-skill`, Type=`skill`
  - For each `.mjs` in root `hooks/`:
    - Read the file
    - Extract hook type (PreToolUse/PostToolUse) and purpose
    - Record: Module=`hooks-entry`, Type=`hook-entry`
  - Emit complete Table A to `.sisyphus/evidence/table-a.md`

  **Must NOT do**:
  - Do NOT include barrel/index.mjs files (G-BARREL)
  - Do NOT count a skill and its src/ implementation as two features (G-DEDUP)
  - Do NOT include hooks.json as a feature (it's a manifest)
  - Do NOT comment on code quality (G-NO-OPINIONS)
  - Do NOT modify any files (G-READONLY)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Needs to read ~50 source files, parse exports, apply taxonomy rules — substantial analysis work
  - **Skills**: `[]`
    - Uses Read, Grep, ast_grep_search — no specialized skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 1B, 1C, 1D)
  - **Blocks**: 2A, 2B, 3
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `.sisyphus/evidence/taxonomy.md` — SHARED CONTRACT: feature list, exclusions, dedup pairs (READ THIS FIRST)
  - `src/orchestrator/fusion-orchestrator.mjs` — Core orchestrator; expect `export class FusionOrchestrator` or similar
  - `src/router/balancer.mjs` — Multi-provider balancer; expect exported balancing strategies
  - `src/tracking/realtime-tracker.mjs` — Metrics collector; uses RingBuffer/TimeBucket patterns
  - `src/executor/opencode-server-pool.mjs` — Server pool manager; expect port management logic
  - `src/executor/acp-client.mjs` — ACP protocol client
  - `src/context/context-builder.mjs` — Handoff context serializer
  - `src/hud/` — HUD display integration files
  - `src/hooks/fusion-router-logic.mjs` — Internal routing logic (NOT a hook entry point)

  **Skill References**:
  - `skills/hulw/SKILL.md` — Hybrid Ultrawork skill definition
  - `skills/` — All subdirectories contain SKILL.md files to enumerate

  **Hook Entry References**:
  - `hooks/` — Root directory contains PreToolUse/PostToolUse hook scripts
  - `hooks/hooks.json` — Manifest file (NOT a feature, configuration only)

  **AST Search Patterns to Use**:
  ```
  ast_grep_search(pattern="export function $NAME($$$) { $$$ }", lang="javascript", path="src/")
  ast_grep_search(pattern="export class $NAME { $$$ }", lang="javascript", path="src/")
  ast_grep_search(pattern="export const $NAME = $VALUE", lang="javascript", path="src/")
  ast_grep_search(pattern="export default $EXPR", lang="javascript", path="src/")
  ```

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/table-a.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  grep -c "|" .sisyphus/evidence/table-a.md
  # Assert: >= 20 (header + feature rows)
  
  # Verify no barrel files snuck in:
  grep "index.mjs" .sisyphus/evidence/table-a.md | wc -l
  # Assert: 0
  
  # Verify Feature ID column is populated in every row:
  grep -P '^\|[^|]*\|\s*\|' .sisyphus/evidence/table-a.md | wc -l
  # Assert: 0 (no blank Feature ID cells)
  ```

  **Commit**: NO

---

- [ ] 1B. Install/Uninstall Operation Tracing (-> Table B)

  **What to do**:
  - Read `.sisyphus/evidence/taxonomy.md` for the shared feature list
  - Read `install.sh` (882 lines) COMPLETELY — trace every filesystem operation:
    - `cp` / `rsync` — file copy operations
    - `ln -s` — symlink creation
    - `mkdir -p` — directory creation
    - `chmod` — permission changes
    - `npm install` / `bun install` — package installation
    - Hook injection into `settings.json` (node -e inline scripts)
    - Any `cat <<EOF > file` heredoc file creation
    - Conditional branches (`if/else/fi`) — note which features are conditionally installed
  - Read `uninstall.sh` (215 lines) COMPLETELY — trace every removal operation:
    - `rm` / `rm -rf` — file/directory deletion
    - `unlink` — symlink removal
    - Node.js JSON manipulation (settings.json hook removal)
    - Any cleanup operations
  - For EACH feature in the taxonomy:
    - Determine if install.sh handles it (and HOW: method + line number)
    - Determine if uninstall.sh handles it (and HOW: method + line number)
    - Determine symmetry (is uninstall the inverse of install for this feature?)
  - Note: Some features are source-code-only (not installed separately). These get `N/A` for both install and uninstall, Symmetric=`N/A`
  - Emit complete Table B to `.sisyphus/evidence/table-b.md`

  **Must NOT do**:
  - Do NOT just grep for keywords — TRACE actual operations and their targets (G-NO-OPINIONS)
  - Do NOT modify install.sh or uninstall.sh (G-READONLY)
  - Do NOT execute install.sh or uninstall.sh
  - Do NOT assess quality of the scripts

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 882-line bash script with conditional logic requires careful line-by-line tracing
  - **Skills**: `[]`
    - Uses Read, Grep for bash operation patterns
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations
    - `playwright`: No browser work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 1A, 1C, 1D)
  - **Blocks**: 2A, 3
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `.sisyphus/evidence/taxonomy.md` — SHARED CONTRACT (READ THIS FIRST)
  - `install.sh` — Full 882-line installer; trace ALL filesystem operations
  - `uninstall.sh` — Full 215-line uninstaller; trace ALL removal operations

  **Key Paths Referenced by install.sh** (from exploration):
  - `~/.claude/settings.json` — Hook injection target
  - `~/.claude/plugins/installed_plugins.json` — Plugin registry
  - `~/.claude/plugins/local/oh-my-claude-money` — Plugin symlink
  - `~/.claude/hud/omcm-hud.mjs` — HUD wrapper
  - `~/.config/opencode/oh-my-opencode.json` — OpenCode config
  - `~/.omcm/` — State directory (handoff/, fusion-state.json, fallback-state.json, provider-limits.json)

  **Grep Patterns for Operation Extraction**:
  ```
  Grep(pattern="^\\s*(cp|rsync|ln|mkdir|chmod|rm|cat.*<<)", path="install.sh")
  Grep(pattern="^\\s*(cp|rsync|ln|mkdir|chmod|rm|unlink|cat.*<<)", path="uninstall.sh")
  Grep(pattern="node.*-e", path="install.sh")  # inline Node.js JSON manipulation
  Grep(pattern="node.*-e", path="uninstall.sh")
  ```

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/table-b.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  # Verify Symmetric column has no blank cells:
  grep -P '\|\s*\|$' .sisyphus/evidence/table-b.md | wc -l
  # Assert: 0
  
  # Verify install.sh line references are present:
  grep -c "install.sh:" .sisyphus/evidence/table-b.md
  # Assert: >= 5 (multiple features are installed)
  ```

  **Commit**: NO

---

- [ ] 1C. Documentation Coverage Scan (-> Table C)

  **What to do**:
  - Read `.sisyphus/evidence/taxonomy.md` for the shared feature list
  - For EACH of the following documents, scan for mentions of each feature:
    1. `README.md` (root)
    2. `docs/en/FEATURES.md`
    3. `docs/en/ARCHITECTURE.md`
    4. `docs/en/CONFIGURATION.md`
    5. `docs/en/FUSION-GUIDE.md`
    6. `CHANGELOG.md` (root) — also check if `docs/CHANGELOG.md` exists and diverges
    7. `docs/en/SKILLS-REFERENCE.md` (if exists)
    8. `docs/en/API-REFERENCE.md` (if exists)
    9. `docs/en/INSTALLATION.md` (if exists)
    10. `docs/en/TROUBLESHOOTING.md` (if exists)
  - For each Feature ID x Document cell:
    - `Y` = Feature is described with functional detail
    - `Partial` = Feature is mentioned by name but not explained
    - `N` = Feature is not mentioned at all
    - `N/A` = Document doesn't exist or doesn't cover this category
  - Special handling: CHANGELOG features marked as "removed" or "deprecated" should be noted with `(removed vX.Y)` annotation, NOT flagged as missing from source (G-NO-DEPRECATED)
  - Check if `docs/CHANGELOG.md` exists separately from root `CHANGELOG.md` — if both exist, note any divergence
  - Emit complete Table C to `.sisyphus/evidence/table-c.md`

  **Must NOT do**:
  - Do NOT scan `docs/ko/` (G-NO-BILINGUAL — out of scope)
  - Do NOT produce recommendations for missing documentation (G-NO-OPINIONS)
  - Do NOT modify any documentation files (G-READONLY)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Must read 8-10 documentation files and cross-reference each feature — substantial text analysis
  - **Skills**: `[]`
    - Uses Read, Grep for feature name search across docs
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 1A, 1B, 1D)
  - **Blocks**: 2B, 3
  - **Blocked By**: Task 0

  **References**:

  **Pattern References**:
  - `.sisyphus/evidence/taxonomy.md` — SHARED CONTRACT (READ THIS FIRST)

  **Documentation Files to Scan (exhaustive list)**:
  - `README.md` — Project overview, may be thin pointer to docs/
  - `CHANGELOG.md` — Version history v0.3.x through v1.0.0
  - `docs/en/FEATURES.md` — Technical feature reference
  - `docs/en/ARCHITECTURE.md` — System architecture, component flow
  - `docs/en/CONFIGURATION.md` — Config schema, HUD settings
  - `docs/en/FUSION-GUIDE.md` — Fusion orchestration guide
  - `docs/en/SKILLS-REFERENCE.md` — Skills catalog (if exists)
  - `docs/en/API-REFERENCE.md` — API documentation (if exists)
  - `docs/en/INSTALLATION.md` — Install guide (if exists)
  - `docs/en/TROUBLESHOOTING.md` — Known issues (if exists)
  - `docs/CHANGELOG.md` — Potential duplicate of root CHANGELOG (check for divergence)

  **Search Strategy**:
  - For each feature, search by Feature ID, Feature Name, and source filename
  - Example: For `fusion-orchestrator`, search: "fusion orchestrator", "FusionOrchestrator", "fusion-orchestrator.mjs"

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/table-c.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  # Verify column count matches doc count:
  head -2 .sisyphus/evidence/table-c.md | tail -1 | grep -o '|' | wc -l
  # Assert: >= 8 (Feature ID + at least 7 doc columns + trailing pipe)
  
  # Verify no blank cells:
  grep -P '\|\s*\|' .sisyphus/evidence/table-c.md | wc -l
  # Assert: 0
  ```

  **Commit**: NO

---

- [ ] 1D. Version String Inventory (-> Table D)

  **What to do**:
  - Scan ALL files in the repository for version strings using these patterns:
    - `"version": "X.Y.Z"` in JSON files
    - `VERSION=` or `version=` in shell scripts
    - Version headers in CHANGELOG.md (`## v1.0.0`, `## [1.0.0]`, etc.)
    - Any hardcoded version constants in `.mjs` source files
  - Files to definitely check:
    - `package.json` — canonical version source
    - `.claude-plugin/plugin.json`
    - `.claude-plugin/marketplace.json`
    - `CHANGELOG.md` — latest version header
    - `install.sh` — any version references
    - `uninstall.sh` — any version references
    - `src/**/*.mjs` — any `VERSION` constants
  - For each file containing a version:
    - Record: File path, Declared Version, Whether it matches `package.json` version
    - If mismatch: note the discrepancy
  - Emit complete Table D to `.sisyphus/evidence/table-d.md`

  **Must NOT do**:
  - Do NOT modify any files to fix version mismatches (G-READONLY)
  - Do NOT check npm registry or external sources (G-NO-SCOPE-CREEP)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Grep-based scan for version strings across known files — straightforward
  - **Skills**: `[]`
    - Uses Grep, Read — no specialized skills needed
  - **Skills Evaluated but Omitted**:
    - All skills: Not applicable for version string scanning

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 1A, 1B, 1C)
  - **Blocks**: 3
  - **Blocked By**: Task 0

  **References**:

  **Files to Scan**:
  - `package.json` — Canonical version: `1.0.0`
  - `.claude-plugin/plugin.json` — Plugin version
  - `.claude-plugin/marketplace.json` — Marketplace version
  - `CHANGELOG.md` — Latest version header
  - `install.sh` — Any `VERSION=` or version echo
  - `uninstall.sh` — Any version references
  - `src/**/*.mjs` — Any `const VERSION` or similar

  **Grep Patterns**:
  ```
  Grep(pattern='"version"', path="/opt/oh-my-claude-money", include="*.json")
  Grep(pattern="VERSION|version", path="/opt/oh-my-claude-money", include="*.sh")
  Grep(pattern="VERSION|version.*=", path="/opt/oh-my-claude-money/src", include="*.mjs")
  Grep(pattern="^## .*[0-9]+\\.[0-9]+\\.[0-9]+", path="/opt/oh-my-claude-money/CHANGELOG.md")
  ```

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/table-d.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  # At minimum, these 3 JSON files must appear:
  grep -c "package.json\|plugin.json\|marketplace.json" .sisyphus/evidence/table-d.md
  # Assert: >= 3
  
  # Verify Matches column has no blanks:
  grep -P '\|\s*\|$' .sisyphus/evidence/table-d.md | wc -l
  # Assert: 0
  ```

  **Commit**: NO

---

- [ ] 2A. Cross-Validate Table A vs Table B (Install/Uninstall Coverage)

  **What to do**:
  - Read `.sisyphus/evidence/table-a.md` (Code Feature Inventory)
  - Read `.sisyphus/evidence/table-b.md` (Install/Uninstall Matrix)
  - Extract Feature ID sets from both tables
  - Verify SET EQUALITY: every Feature ID in A must appear in B, and vice versa
  - For any Feature ID in A but missing from B: add it to B with all cells = `N/A` and note as gap
  - For any Feature ID in B but missing from A: flag as anomaly ("installed but not in source inventory")
  - Emit corrected Table B to `.sisyphus/evidence/table-b-validated.md`
  - Emit cross-validation log to `.sisyphus/evidence/xval-a-vs-b.md`

  **Must NOT do**:
  - Do NOT modify original table-a.md or table-b.md
  - Do NOT re-scan source code or scripts (use only the table outputs)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Set comparison with gap analysis requires careful attention
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: All — pure table comparison work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 2B)
  - **Blocks**: 3
  - **Blocked By**: 1A, 1B

  **References**:
  - `.sisyphus/evidence/table-a.md` — Source of truth for Feature IDs
  - `.sisyphus/evidence/table-b.md` — Install/uninstall data to validate

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/table-b-validated.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  test -f .sisyphus/evidence/xval-a-vs-b.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  # Feature ID sets must match (diff must be empty or explicitly noted):
  grep "SET EQUALITY" .sisyphus/evidence/xval-a-vs-b.md
  # Assert: Contains "VERIFIED" or lists all gaps
  ```

  **Commit**: NO

---

- [ ] 2B. Cross-Validate Table A vs Table C (Documentation Coverage)

  **What to do**:
  - Read `.sisyphus/evidence/table-a.md` (Code Feature Inventory)
  - Read `.sisyphus/evidence/table-c.md` (Documentation Matrix)
  - Extract Feature ID sets from both tables
  - Verify SET EQUALITY: every Feature ID in A must appear in C, and vice versa
  - For any Feature ID in A but missing from C: add it to C with all cells = `N` and note as gap
  - For any Feature ID in C but missing from A: flag as anomaly ("documented but not in source inventory")
  - Emit corrected Table C to `.sisyphus/evidence/table-c-validated.md`
  - Emit cross-validation log to `.sisyphus/evidence/xval-a-vs-c.md`

  **Must NOT do**:
  - Do NOT modify original table-a.md or table-c.md
  - Do NOT re-scan documentation files (use only the table outputs)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Set comparison with gap analysis requires careful attention
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: All — pure table comparison work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with 2A)
  - **Blocks**: 3
  - **Blocked By**: 1A, 1C

  **References**:
  - `.sisyphus/evidence/table-a.md` — Source of truth for Feature IDs
  - `.sisyphus/evidence/table-c.md` — Documentation data to validate

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/table-c-validated.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  test -f .sisyphus/evidence/xval-a-vs-c.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  # Feature ID sets must match:
  grep "SET EQUALITY" .sisyphus/evidence/xval-a-vs-c.md
  # Assert: Contains "VERIFIED" or lists all gaps
  ```

  **Commit**: NO

---

- [ ] 3. Assemble Final Audit Report + Anomaly Summary

  **What to do**:
  - Read all validated evidence files:
    - `.sisyphus/evidence/taxonomy.md`
    - `.sisyphus/evidence/table-a.md`
    - `.sisyphus/evidence/table-b-validated.md`
    - `.sisyphus/evidence/table-c-validated.md`
    - `.sisyphus/evidence/table-d.md`
    - `.sisyphus/evidence/xval-a-vs-b.md`
    - `.sisyphus/evidence/xval-a-vs-c.md`
  - Assemble into single report `.sisyphus/evidence/omcm-audit-report.md` with structure:
    ```
    # OMCM Feature Inventory & Cross-Validation Audit Report
    
    ## Executive Summary
    - Total features inventoried: N
    - Install/Uninstall symmetry rate: X%
    - Documentation coverage rate: Y%
    - Version consistency: PASS/FAIL
    - Anomalies found: Z
    
    ## Table A: Code-Derived Feature Inventory
    [Full table]
    
    ## Table B: Install/Uninstall Coverage Matrix
    [Validated table]
    
    ## Table C: Documentation Coverage Matrix
    [Validated table]
    
    ## Table D: Version Consistency Matrix
    [Full table]
    
    ## Anomaly Summary
    ### Install/Uninstall Anomalies
    - [Each N or Partial from Table B with one-line explanation]
    
    ### Documentation Gaps
    - [Each N from Table C with one-line explanation]
    
    ### Version Mismatches
    - [Each mismatch from Table D]
    
    ### Cross-Validation Findings
    - [Any set mismatches from xval reports]
    ```
  - Compute summary statistics:
    - Count of features per module
    - Percentage of features with symmetric install/uninstall
    - Percentage of features documented in at least 1 doc
    - Version match rate
  - Run acceptance criteria checks inline and report results

  **Must NOT do**:
  - Do NOT re-analyze source code, scripts, or docs — use only evidence files
  - Do NOT add recommendations or fix suggestions (G-NO-OPINIONS)
  - Do NOT modify any project files (G-READONLY)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Final synthesis task combining 7 evidence files into formatted report with statistics
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: All — pure report assembly

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3, final task)
  - **Blocks**: None (terminal task)
  - **Blocked By**: 2A, 2B, 1D

  **References**:
  - `.sisyphus/evidence/taxonomy.md` — Feature taxonomy (for reference)
  - `.sisyphus/evidence/table-a.md` — Code feature inventory
  - `.sisyphus/evidence/table-b-validated.md` — Validated install/uninstall matrix
  - `.sisyphus/evidence/table-c-validated.md` — Validated documentation matrix
  - `.sisyphus/evidence/table-d.md` — Version consistency matrix
  - `.sisyphus/evidence/xval-a-vs-b.md` — Cross-validation log A vs B
  - `.sisyphus/evidence/xval-a-vs-c.md` — Cross-validation log A vs C

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/omcm-audit-report.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS
  
  # Verify all 4 tables + anomaly summary present:
  grep -c "^## Table" .sisyphus/evidence/omcm-audit-report.md
  # Assert: 4
  
  grep -c "^## Anomaly Summary" .sisyphus/evidence/omcm-audit-report.md
  # Assert: 1
  
  grep -c "^## Executive Summary" .sisyphus/evidence/omcm-audit-report.md
  # Assert: 1
  
  # Verify no blank cells in any table (pipe-pipe with only whitespace):
  grep -P '\|\s*\|' .sisyphus/evidence/omcm-audit-report.md | grep -v "^##\|^|.*---" | wc -l
  # Assert: 0
  
  # Verify executive summary has statistics:
  grep "Total features" .sisyphus/evidence/omcm-audit-report.md
  # Assert: matches
  ```

  **Commit**: NO

---

## Commit Strategy

No commits. This is a read-only analysis audit. All output goes to `.sisyphus/evidence/`.

---

## Success Criteria

### Verification Commands
```bash
# 1. All evidence files exist:
ls -la .sisyphus/evidence/taxonomy.md \
       .sisyphus/evidence/table-a.md \
       .sisyphus/evidence/table-b-validated.md \
       .sisyphus/evidence/table-c-validated.md \
       .sisyphus/evidence/table-d.md \
       .sisyphus/evidence/xval-a-vs-b.md \
       .sisyphus/evidence/xval-a-vs-c.md \
       .sisyphus/evidence/omcm-audit-report.md
# Expected: all 8 files exist

# 2. Final report has all sections:
grep "^## " .sisyphus/evidence/omcm-audit-report.md
# Expected: Executive Summary, Table A, Table B, Table C, Table D, Anomaly Summary

# 3. Feature count sanity check:
grep -c "^|" .sisyphus/evidence/table-a.md
# Expected: >= 20 (features + header rows)

# 4. Set equality verified:
grep "SET EQUALITY" .sisyphus/evidence/xval-a-vs-b.md .sisyphus/evidence/xval-a-vs-c.md
# Expected: Both contain verification results

# 5. No project files modified:
git status --porcelain | grep -v ".sisyphus/"
# Expected: empty (only .sisyphus/ files created)

# 6. Zero blank cells:
grep -P '\|\s+\|' .sisyphus/evidence/omcm-audit-report.md | grep -v "^|.*---" | head -5
# Expected: no output (zero matches)
```

### Final Checklist
- [ ] All "Must Have" present (4 tables, single file, 2-level taxonomy, hook distinction, skill distinction, cross-validation)
- [ ] All "Must NOT Have" absent (no code changes, no opinions, no scope creep, no barrel files, no dedup violations)
- [ ] All acceptance criteria pass
- [ ] git status shows only .sisyphus/ changes
