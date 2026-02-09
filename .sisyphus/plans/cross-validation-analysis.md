# Cross-Validation Analysis: Features vs Scripts vs Docs

## TL;DR

> **Quick Summary**: Systematically cross-validate every implemented feature in `src/`, `hooks/`, `skills/` against what `install.sh`/`uninstall.sh` handle, what `package.json`/`.claude-plugin/` declare, and what documentation covers — producing four definitive audit tables.
>
> **Deliverables**:
> - **Table A** — Feature ↔ Install/Uninstall Coverage Matrix
> - **Table B** — Feature ↔ Documentation Coverage Matrix
> - **Table C** — Orphan & Ghost Artifact Report
> - **Table D** — Consistency Verdict Summary
>
> **Estimated Effort**: Medium (analysis-only, no code changes)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 4 → Task 7 → Task 8

---

## Context

### Original Request
Produce a precise analysis plan for cross-validating implemented features against install/uninstall scripts and documentation. Output must include Table A, B, C, D definitions and how to populate them. Analysis-only — no code changes.

### Target Inventory (confirmed via codebase exploration)

| Target Zone | Files | Count |
|-------------|-------|-------|
| **src/** | `src/**/*.mjs` + `src/**/*.cjs` | 49 files across 8 subdirs |
| **hooks/** | `hooks/*.mjs` + `hooks.json` | 5 files |
| **skills/** | `skills/*/SKILL.md` | 8 skill definitions |
| **scripts/** | `scripts/*.sh` + `scripts/*.json` | 11 files |
| **install.sh** | Root `install.sh` | 1 file |
| **uninstall.sh** | Root `uninstall.sh` | 1 file |
| **package.json** | Root `package.json` | 1 file |
| **.claude-plugin/** | `plugin.json`, `marketplace.json` | 2 files |
| **README.md** | Root `README.md` | 1 file |
| **CHANGELOG.md** | Root + `docs/CHANGELOG.md` | 2 files |
| **docs/** | `docs/en/*.md` + `docs/ko/*.md` + `docs/README.md` | 18 files |

### Scope Boundaries
- **IN**: All targets listed above; analysis and inventory only
- **OUT**: `opencode-upstream/` (vendored dependency — not authored code); any code modification

---

## Output Schema: Tables A–D

### Table A — Feature ↔ Install/Uninstall Coverage Matrix

Cross-references each discrete feature (from `src/`, `hooks/`, `skills/`) against install.sh and uninstall.sh.

| Column | Type | Description |
|--------|------|-------------|
| `feature_id` | string | Unique ID: `{zone}/{module}` (e.g. `src/router/balancer`) |
| `feature_name` | string | Human-readable name |
| `source_files` | string[] | List of implementing files |
| `install_handled` | ✅/❌/⚠️ | Is it set up by install.sh? (✅ = yes, ❌ = missing, ⚠️ = partial) |
| `install_evidence` | string | Line range or action in install.sh that handles it |
| `uninstall_handled` | ✅/❌/⚠️ | Is it cleaned up by uninstall.sh? |
| `uninstall_evidence` | string | Line range or action in uninstall.sh that handles it |
| `pkg_json_declared` | ✅/❌ | Referenced in package.json (bin, scripts, files, dependencies)? |
| `plugin_json_declared` | ✅/❌ | Referenced in .claude-plugin/plugin.json? |
| `verdict` | COVERED / GAP / PARTIAL | Overall install lifecycle coverage |

**How to Populate**:
1. **Extract features**: Parse `src/` subdirectory structure into logical modules (router, orchestrator, hud, executor, context, tracking, hooks, config, pool, utils). Each subdirectory = one feature group. Individual files within = sub-features.
2. **Extract skills**: Each `skills/*/SKILL.md` = one feature.
3. **Extract hooks**: Each `hooks/*.mjs` = one feature. `hooks.json` = registry.
4. **Scan install.sh**: For each feature, grep for file copy/symlink/mkdir/config-write operations referencing that feature's files or directories.
5. **Scan uninstall.sh**: Same, but look for rm/unlink/cleanup operations.
6. **Scan package.json**: Check `bin`, `files`, `scripts`, `dependencies` fields.
7. **Scan plugin.json**: Check `hooks`, `skills`, `scripts` declarations.
8. **Assign verdict**: COVERED = both install+uninstall handle it; GAP = neither; PARTIAL = one or other missing.

---

### Table B — Feature ↔ Documentation Coverage Matrix

Cross-references each feature against all documentation sources.

| Column | Type | Description |
|--------|------|-------------|
| `feature_id` | string | Same ID as Table A |
| `feature_name` | string | Human-readable name |
| `readme_mentioned` | ✅/❌ | Mentioned in root README.md? |
| `docs_en_covered` | string/❌ | Which docs/en/ file covers it (or ❌) |
| `docs_ko_covered` | string/❌ | Which docs/ko/ file covers it (or ❌) |
| `changelog_mentioned` | ✅/❌ | Appears in any CHANGELOG.md? |
| `architecture_doc` | ✅/❌ | Covered in ARCHITECTURE.md? |
| `features_doc` | ✅/❌ | Covered in FEATURES.md? |
| `api_reference_doc` | ✅/❌ | Covered in API-REFERENCE.md? |
| `skills_reference_doc` | ✅/❌ | Covered in SKILLS-REFERENCE.md? |
| `i18n_parity` | ✅/❌ | docs/en and docs/ko have equivalent coverage? |
| `verdict` | DOCUMENTED / UNDOCUMENTED / PARTIAL | Overall documentation coverage |

**How to Populate**:
1. **Reuse feature list** from Table A step 1–3.
2. **For each feature**: Search (grep/regex) each documentation file for the feature name, module name, key function names, and related keywords.
3. **i18n parity check**: For each docs/en/ file, confirm matching docs/ko/ file exists AND covers the same features.
4. **Assign verdict**: DOCUMENTED = ≥3 doc sources mention it; UNDOCUMENTED = 0 sources; PARTIAL = 1–2 sources.

---

### Table C — Orphan & Ghost Artifact Report

Identifies artifacts that exist in one domain but are missing from others.

| Column | Type | Description |
|--------|------|-------------|
| `artifact` | string | File path or feature name |
| `anomaly_type` | enum | `ORPHAN_CODE` / `GHOST_INSTALL` / `GHOST_DOC` / `GHOST_SKILL` / `STALE_SCRIPT` |
| `exists_in` | string[] | Where this artifact IS found |
| `missing_from` | string[] | Where this artifact SHOULD be but ISN'T |
| `severity` | HIGH/MEDIUM/LOW | Impact severity |
| `detail` | string | Explanation |

**Anomaly Type Definitions**:
- **ORPHAN_CODE**: File in `src/`/`hooks/` not referenced by install.sh, package.json, OR plugin.json
- **GHOST_INSTALL**: install.sh references a file/path that doesn't exist in source
- **GHOST_DOC**: Documentation mentions a feature/file that doesn't exist in source
- **GHOST_SKILL**: skills/ SKILL.md references capabilities not implemented in src/
- **STALE_SCRIPT**: scripts/*.sh file not referenced by install.sh, uninstall.sh, or package.json

**How to Populate**:
1. **Orphan detection**: For each src file, check if ANY of {install.sh, package.json, plugin.json, hooks.json} references it. If none → ORPHAN_CODE.
2. **Ghost install detection**: Extract every file path from install.sh. Verify each path exists in repo. Missing → GHOST_INSTALL.
3. **Ghost doc detection**: Extract feature/module names from docs. Verify each has corresponding source. Missing → GHOST_DOC.
4. **Ghost skill detection**: Parse each SKILL.md for referenced src modules/functions. Verify existence. Missing → GHOST_SKILL.
5. **Stale script detection**: For each scripts/*.sh, check if referenced by install/uninstall/package.json. If not → STALE_SCRIPT.

---

### Table D — Consistency Verdict Summary

High-level scorecard aggregating Tables A–C.

| Column | Type | Description |
|--------|------|-------------|
| `dimension` | string | What's being measured |
| `total_items` | number | Total items in that dimension |
| `covered` | number | Items fully covered |
| `partial` | number | Items partially covered |
| `gaps` | number | Items with no coverage |
| `coverage_pct` | number | `covered / total_items * 100` |
| `health` | 🟢/🟡/🔴 | ≥90% = 🟢, 60-89% = 🟡, <60% = 🔴 |

**Dimensions (rows)**:
1. `Install Coverage` — Features handled by install.sh (from Table A)
2. `Uninstall Coverage` — Features handled by uninstall.sh (from Table A)
3. `Package.json Declarations` — Features in package.json (from Table A)
4. `Plugin.json Declarations` — Features in plugin.json (from Table A)
5. `Documentation Coverage` — Features documented anywhere (from Table B)
6. `i18n Parity` — en↔ko doc parity (from Table B)
7. `Orphan-Free Code` — src files that ARE referenced somewhere (inverse of Table C ORPHAN_CODE)
8. `Ghost-Free References` — References that DO point to real artifacts (inverse of Table C GHOST_*)
9. `Script Utilization` — scripts/ files that ARE used (inverse of Table C STALE_SCRIPT)

**How to Populate**:
1. Count totals and verdicts from Tables A, B, C.
2. Compute percentages.
3. Assign health colors per threshold.

---

## Work Objectives

### Core Objective
Produce Tables A, B, C, D as defined above — a complete cross-validation audit of implemented features vs install/uninstall lifecycle vs documentation.

### Concrete Deliverables
- One analysis output file (markdown) containing all four tables
- Saved to `.sisyphus/evidence/cross-validation-report.md`

### Definition of Done
- [ ] Table A has a row for every feature module (≥15 rows covering all src/ subdirs, hooks, skills)
- [ ] Table B has a row for every feature from Table A
- [ ] Table C lists every detected anomaly (may be 0 — that's valid)
- [ ] Table D has exactly 9 dimension rows with computed percentages
- [ ] No source code was modified

### Must Have
- Every `src/` subdirectory represented as a feature group
- Every `skills/*/SKILL.md` represented
- Every `hooks/*.mjs` represented
- Every `scripts/*.sh` checked for staleness
- Bidirectional checking (source→script AND script→source)

### Must NOT Have (Guardrails)
- ❌ No code changes, refactoring, or fixes — analysis ONLY
- ❌ No modifications to install.sh or uninstall.sh
- ❌ No doc edits — only report gaps
- ❌ No scanning of `opencode-upstream/` (out of scope)
- ❌ No creating test files

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: N/A (analysis task)
- **User wants tests**: NO — analysis only
- **QA approach**: Manual verification of table completeness

### Automated Verification

Each task's output is verified by checking:
```bash
# Verify report file exists and has content
wc -l .sisyphus/evidence/cross-validation-report.md
# Should be >100 lines

# Verify all 4 tables present
grep -c "## Table [ABCD]" .sisyphus/evidence/cross-validation-report.md
# Should output: 4
```

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Extract Feature Registry | None | Starting point — builds master feature list |
| Task 2: Analyze install.sh | None | Independent parse of install script |
| Task 3: Analyze uninstall.sh | None | Independent parse of uninstall script |
| Task 4: Analyze package.json + plugin.json | None | Independent parse of declarations |
| Task 5: Analyze Documentation Corpus | None | Independent scan of all docs |
| Task 6: Analyze scripts/ Utilization | Task 2, 3 | Needs install/uninstall refs to check staleness |
| Task 7: Generate Tables A & C (partial) | Task 1, 2, 3, 4 | Needs feature list + all install/pkg analysis |
| Task 8: Generate Table B & C (remainder) | Task 1, 5 | Needs feature list + doc analysis |
| Task 9: Generate Table D & Final Report | Task 7, 8, 6 | Aggregates everything |

## Parallel Execution Graph

```
Wave 1 (Start immediately — all independent):
├── Task 1: Extract Feature Registry from src/, hooks/, skills/
├── Task 2: Analyze install.sh — extract all file ops + targets
├── Task 3: Analyze uninstall.sh — extract all cleanup ops + targets
├── Task 4: Analyze package.json + plugin.json declarations
└── Task 5: Analyze Documentation Corpus (README, docs/**, CHANGELOG)

Wave 2 (After Wave 1 completes):
├── Task 6: Analyze scripts/ utilization (needs: Task 2, 3)
├── Task 7: Generate Table A + partial Table C (needs: Task 1, 2, 3, 4)
└── Task 8: Generate Table B + remainder Table C (needs: Task 1, 5)

Wave 3 (After Wave 2 completes):
└── Task 9: Generate Table D + assemble final report (needs: Task 6, 7, 8)

Critical Path: Task 1 → Task 7 → Task 9
Parallel Speedup: ~55% faster than sequential (5 tasks in Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 7, 8 | 2, 3, 4, 5 |
| 2 | None | 6, 7 | 1, 3, 4, 5 |
| 3 | None | 6, 7 | 1, 2, 4, 5 |
| 4 | None | 7 | 1, 2, 3, 5 |
| 5 | None | 8 | 1, 2, 3, 4 |
| 6 | 2, 3 | 9 | 7, 8 |
| 7 | 1, 2, 3, 4 | 9 | 6, 8 |
| 8 | 1, 5 | 9 | 6, 7 |
| 9 | 6, 7, 8 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Dispatch |
|------|-------|---------------------|
| 1 | 1, 2, 3, 4, 5 | 5× parallel `explore` agents (background) |
| 2 | 6, 7, 8 | 3× parallel `explore-medium` agents (background) |
| 3 | 9 | 1× `architect-low` agent (foreground, final assembly) |

---

## TODOs

- [ ] 1. Extract Feature Registry

  **What to do**:
  - Enumerate every `src/` subdirectory as a feature group: `router`, `orchestrator`, `hud`, `executor`, `context`, `tracking`, `config`, `pool`, `utils`
  - Within each group, list every `.mjs`/`.cjs` file as a sub-feature
  - List every `hooks/*.mjs` as a hook feature
  - List every `skills/*/SKILL.md` as a skill feature
  - Produce a structured registry: `{ feature_id, feature_name, source_files[], zone }`
  - Save intermediate output to `.sisyphus/evidence/feature-registry.md`

  **Must NOT do**:
  - Do not read file contents deeply — only names and directory structure
  - Do not include anything from `opencode-upstream/`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure filesystem enumeration, no reasoning needed
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands .mjs/.cjs module conventions for accurate naming
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `git-master`: No git operations
    - `data-scientist`: No data analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: None

  **References**:
  - `src/` — 49 files across 8+ subdirectories (router, orchestrator, hud, executor, context, tracking, config, pool, utils)
  - `hooks/` — 5 files including hooks.json registry
  - `skills/` — 8 SKILL.md files (ralph, ecomode, cancel, autopilot, ulw, hulw, hybrid-ultrawork, opencode)

  **Acceptance Criteria**:
  ```bash
  # Verify registry exists
  test -f .sisyphus/evidence/feature-registry.md && echo "EXISTS"
  # Should output: EXISTS

  # Verify minimum feature count (at least 15 features)
  grep -c "^|" .sisyphus/evidence/feature-registry.md | head -1
  # Should be >= 15
  ```

  **Commit**: NO

---

- [ ] 2. Analyze install.sh

  **What to do**:
  - Read `install.sh` line by line
  - Extract every operation that copies, symlinks, creates, configures, or references a source file/directory
  - For each operation record: `{ line_range, operation_type (cp/ln/mkdir/write/chmod), target_path, source_ref }`
  - Save to `.sisyphus/evidence/install-analysis.md`

  **Must NOT do**:
  - Do not modify install.sh
  - Do not execute install.sh

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file read + extraction, straightforward
  - **Skills**: []
    - No specialized skills needed for bash script reading
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not TS code
    - `git-master`: No git ops

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: None

  **References**:
  - `/opt/oh-my-claude-money/install.sh` — the install script to analyze

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/install-analysis.md && echo "EXISTS"
  # Should output: EXISTS
  ```

  **Commit**: NO

---

- [ ] 3. Analyze uninstall.sh

  **What to do**:
  - Read `uninstall.sh` line by line
  - Extract every cleanup operation: rm, unlink, rmdir, config removal
  - For each operation record: `{ line_range, operation_type (rm/unlink/rmdir), target_path }`
  - Save to `.sisyphus/evidence/uninstall-analysis.md`

  **Must NOT do**:
  - Do not modify or execute uninstall.sh

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file read + extraction
  - **Skills**: []
  - **Skills Evaluated but Omitted**: Same as Task 2

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: None

  **References**:
  - `/opt/oh-my-claude-money/uninstall.sh` — the uninstall script to analyze

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/uninstall-analysis.md && echo "EXISTS"
  ```

  **Commit**: NO

---

- [ ] 4. Analyze package.json + plugin.json Declarations

  **What to do**:
  - Read `/opt/oh-my-claude-money/package.json`: extract `bin`, `files`, `scripts`, `dependencies`, `devDependencies` fields
  - Read `.claude-plugin/plugin.json`: extract `hooks`, `skills`, `scripts`, file references
  - Read `.claude-plugin/marketplace.json`: extract any feature declarations
  - For each declared item, record: `{ source_field, declared_name, referenced_path }`
  - Save to `.sisyphus/evidence/declarations-analysis.md`

  **Must NOT do**:
  - Do not modify any JSON files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Reading 3 small JSON files
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands Node.js package.json semantics
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI
    - `data-scientist`: No data

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `/opt/oh-my-claude-money/package.json`
  - `/opt/oh-my-claude-money/.claude-plugin/plugin.json`
  - `/opt/oh-my-claude-money/.claude-plugin/marketplace.json`

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/declarations-analysis.md && echo "EXISTS"
  ```

  **Commit**: NO

---

- [ ] 5. Analyze Documentation Corpus

  **What to do**:
  - Read every documentation file and extract the feature names / module names mentioned:
    - `README.md` (root)
    - `docs/README.md`
    - `docs/en/ARCHITECTURE.md`, `FEATURES.md`, `API-REFERENCE.md`, `SKILLS-REFERENCE.md`, `CONFIGURATION.md`, `INSTALLATION.md`, `FUSION-GUIDE.md`, `TROUBLESHOOTING.md`
    - `docs/ko/` — all matching files
    - `CHANGELOG.md` (root) + `docs/CHANGELOG.md`
  - For each doc, record: `{ doc_path, features_mentioned[], modules_mentioned[] }`
  - Check i18n parity: for each `docs/en/X.md`, confirm `docs/ko/X.md` exists and covers same features
  - Save to `.sisyphus/evidence/docs-analysis.md`

  **Must NOT do**:
  - Do not modify any documentation
  - Do not scan `opencode-upstream/` READMEs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 18 files to scan with keyword extraction — moderate effort
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not code files
    - `prompt-engineer`: Not prompt work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `/opt/oh-my-claude-money/README.md`
  - `/opt/oh-my-claude-money/docs/` — 18 files (see inventory above)
  - `/opt/oh-my-claude-money/CHANGELOG.md`

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/docs-analysis.md && echo "EXISTS"
  # Verify all doc files were checked
  grep -c "docs/" .sisyphus/evidence/docs-analysis.md
  # Should be >= 18
  ```

  **Commit**: NO

---

- [ ] 6. Analyze scripts/ Utilization

  **What to do**:
  - List all 11 files in `scripts/`
  - For each, check if it's referenced by:
    - install.sh (from Task 2 output)
    - uninstall.sh (from Task 3 output)
    - package.json scripts field
    - Any src/ file (grep for script name)
  - Classify each as: UTILIZED / STALE
  - Save to `.sisyphus/evidence/scripts-utilization.md`

  **Must NOT do**:
  - Do not execute any scripts
  - Do not modify any scripts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Cross-referencing ~11 filenames against known outputs
  - **Skills**: []
  - **Skills Evaluated but Omitted**: All — pure text cross-reference

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `/opt/oh-my-claude-money/scripts/` — 11 files
  - `.sisyphus/evidence/install-analysis.md` (from Task 2)
  - `.sisyphus/evidence/uninstall-analysis.md` (from Task 3)

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/scripts-utilization.md && echo "EXISTS"
  grep -cE "UTILIZED|STALE" .sisyphus/evidence/scripts-utilization.md
  # Should be >= 11 (one verdict per script)
  ```

  **Commit**: NO

---

- [ ] 7. Generate Table A + Partial Table C

  **What to do**:
  - Load outputs from Tasks 1, 2, 3, 4
  - For each feature in the registry (Task 1):
    - Check install.sh analysis (Task 2) for matching operations → `install_handled` + `install_evidence`
    - Check uninstall.sh analysis (Task 3) for matching operations → `uninstall_handled` + `uninstall_evidence`
    - Check declarations analysis (Task 4) for matching refs → `pkg_json_declared` + `plugin_json_declared`
    - Compute `verdict`: COVERED / GAP / PARTIAL
  - Build Table A in markdown format
  - For Table C: identify ORPHAN_CODE (src files with no install/pkg/plugin ref) and GHOST_INSTALL (install.sh refs to non-existent files)
  - Save to `.sisyphus/evidence/table-a.md` and append to `.sisyphus/evidence/table-c-partial.md`

  **Must NOT do**:
  - Do not modify source files
  - Do not guess — if evidence is unclear, mark as ⚠️

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Cross-referencing multiple data sources, moderate reasoning
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `data-scientist`: Tempting but overkill for tabular cross-referencing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 2, 3, 4

  **References**:
  - `.sisyphus/evidence/feature-registry.md` (from Task 1)
  - `.sisyphus/evidence/install-analysis.md` (from Task 2)
  - `.sisyphus/evidence/uninstall-analysis.md` (from Task 3)
  - `.sisyphus/evidence/declarations-analysis.md` (from Task 4)
  - Table A schema defined in this plan's "Output Schema" section

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/table-a.md && echo "TABLE_A_EXISTS"
  test -f .sisyphus/evidence/table-c-partial.md && echo "TABLE_C_PARTIAL_EXISTS"
  # Verify Table A has header + data rows
  grep -c "|" .sisyphus/evidence/table-a.md
  # Should be >= 16 (1 header + 15+ features)
  ```

  **Commit**: NO

---

- [ ] 8. Generate Table B + Remainder Table C

  **What to do**:
  - Load outputs from Tasks 1, 5
  - For each feature in the registry (Task 1):
    - Check docs analysis (Task 5) for each documentation source
    - Fill columns: `readme_mentioned`, `docs_en_covered`, `docs_ko_covered`, `changelog_mentioned`, `architecture_doc`, `features_doc`, `api_reference_doc`, `skills_reference_doc`, `i18n_parity`
    - Compute `verdict`: DOCUMENTED / UNDOCUMENTED / PARTIAL
  - Build Table B in markdown format
  - For Table C remainder: identify GHOST_DOC (docs mention non-existent features) and GHOST_SKILL (SKILL.md refs non-existent modules)
  - Save to `.sisyphus/evidence/table-b.md` and `.sisyphus/evidence/table-c-remainder.md`

  **Must NOT do**:
  - Do not modify any documentation files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Cross-referencing feature registry against doc corpus, moderate reasoning
  - **Skills**: []
  - **Skills Evaluated but Omitted**: Same as Task 7

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 5

  **References**:
  - `.sisyphus/evidence/feature-registry.md` (from Task 1)
  - `.sisyphus/evidence/docs-analysis.md` (from Task 5)
  - Table B schema defined in this plan's "Output Schema" section

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/table-b.md && echo "TABLE_B_EXISTS"
  test -f .sisyphus/evidence/table-c-remainder.md && echo "TABLE_C_REMAINDER_EXISTS"
  grep -c "|" .sisyphus/evidence/table-b.md
  # Should be >= 16
  ```

  **Commit**: NO

---

- [ ] 9. Generate Table D + Assemble Final Report

  **What to do**:
  - Load all intermediate outputs (Tasks 6, 7, 8)
  - Merge `table-c-partial.md` + `table-c-remainder.md` + scripts staleness (Task 6) into unified Table C
  - Compute Table D aggregations:
    - Count COVERED/GAP/PARTIAL from Table A for install, uninstall, pkg, plugin dimensions
    - Count DOCUMENTED/UNDOCUMENTED/PARTIAL from Table B for doc dimensions
    - Count i18n parity from Table B
    - Count orphan-free and ghost-free from Table C
    - Count script utilization from Task 6
    - Compute percentages and assign health colors
  - Assemble final report: `.sisyphus/evidence/cross-validation-report.md` containing:
    - Executive summary
    - Table A (full)
    - Table B (full)
    - Table C (merged)
    - Table D (computed)
    - Key findings / top-3 risks

  **Must NOT do**:
  - Do not suggest fixes — only report findings
  - Do not modify any source files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Data assembly and arithmetic — moderate effort, clear structure
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `data-scientist`: Overkill — simple counts and percentages

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential — final assembly)
  - **Blocks**: None (terminal task)
  - **Blocked By**: Tasks 6, 7, 8

  **References**:
  - `.sisyphus/evidence/table-a.md` (from Task 7)
  - `.sisyphus/evidence/table-b.md` (from Task 8)
  - `.sisyphus/evidence/table-c-partial.md` (from Task 7)
  - `.sisyphus/evidence/table-c-remainder.md` (from Task 8)
  - `.sisyphus/evidence/scripts-utilization.md` (from Task 6)
  - Table D schema defined in this plan's "Output Schema" section

  **Acceptance Criteria**:
  ```bash
  # Final report exists
  test -f .sisyphus/evidence/cross-validation-report.md && echo "REPORT_EXISTS"

  # All 4 tables present
  grep -c "## Table" .sisyphus/evidence/cross-validation-report.md
  # Should be >= 4

  # Report has substantial content
  wc -l < .sisyphus/evidence/cross-validation-report.md
  # Should be >= 100

  # Table D has all 9 dimensions
  grep -cE "Install Coverage|Uninstall Coverage|Package.json|Plugin.json|Documentation Coverage|i18n Parity|Orphan-Free|Ghost-Free|Script Utilization" .sisyphus/evidence/cross-validation-report.md
  # Should be 9
  ```

  **Commit**: YES
  - Message: `audit(cross-validation): add feature vs install/docs coverage analysis`
  - Files: `.sisyphus/evidence/cross-validation-report.md`
  - Pre-commit: Verify report has all 4 tables

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 9 (final) | `audit(cross-validation): add feature vs install/docs coverage analysis` | `.sisyphus/evidence/cross-validation-report.md` | `grep -c "## Table" report.md` = 4 |

Note: Intermediate evidence files (Tasks 1–8) are working artifacts. Only the final assembled report is committed.

---

## Success Criteria

### Verification Commands
```bash
# 1. Report exists and has all tables
grep -c "## Table" .sisyphus/evidence/cross-validation-report.md
# Expected: 4

# 2. Table A has feature rows
grep -c "src/" .sisyphus/evidence/cross-validation-report.md
# Expected: >= 10

# 3. Table D has all 9 dimensions
grep -cE "🟢|🟡|🔴" .sisyphus/evidence/cross-validation-report.md
# Expected: 9

# 4. No source files were modified
git diff --name-only
# Expected: only .sisyphus/ files
```

### Final Checklist
- [ ] Table A covers ALL feature groups from src/, hooks/, skills/
- [ ] Table B covers same feature set against ALL documentation files
- [ ] Table C identifies ALL orphans and ghosts (bidirectional checking)
- [ ] Table D has exactly 9 dimensions with computed health scores
- [ ] No source code modified (git diff clean except .sisyphus/)
- [ ] Report saved to `.sisyphus/evidence/cross-validation-report.md`
