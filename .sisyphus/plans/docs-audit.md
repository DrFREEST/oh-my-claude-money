# OMCM English Documentation Audit Plan

## TL;DR

> **Quick Summary**: Systematic audit of all 10 English-facing documentation files against the actual OMCM codebase, checking for outdated, missing, phantom, wrong, and sync-diff issues, plus ko/en parity verification.
>
> **Deliverables**:
> - Per-document audit tables (10 tables)
> - ko/en structural sync comparison table
> - Version consistency check table
> - Link/path validity check table
> - Feature-claim verification checklist
>
> **Estimated Effort**: Medium (8–12 tasks, ~2–4 hours total agent time)
> **Parallel Execution**: YES – 4 waves
> **Critical Path**: Task 1 (inventory) → Tasks 2-9 (per-doc audits, parallel) → Task 10 (ko/en sync) → Task 11 (final report)

---

## Context

### Original Request
Produce a precise, step-by-step audit plan for cross-validating OMCM English docs against the current codebase, including ko/en sync comparison. Output must use the problem-type taxonomy: `OUTDATED | MISSING | PHANTOM | WRONG | SYNC_DIFF | OK`.

### Codebase Inventory (Verified)

**Source Code** (`src/` — 49 .mjs files):

| Module | Files | Key Exports to Verify |
|--------|-------|----------------------|
| `src/tracking/` | `realtime-tracker.mjs`, `metrics-collector.mjs`, `call-logger.mjs`, `tool-tracker-logger.mjs`, `index.mjs` | RealtimeTracker, MetricsCollector, TimeBucket |
| `src/context/` | `context-builder.mjs`, `context-sync.mjs`, `context-serializer.mjs`, `index.mjs` | buildContext(), ContextSynchronizer |
| `src/router/` | `balancer.mjs`, `cache.mjs`, `mapping.mjs`, `rules.mjs` | ProviderBalancer, 4 strategies |
| `src/orchestrator/` | `parallel-executor.mjs`, `execution-strategy.mjs`, `agent-fusion-map.mjs`, `fallback-orchestrator.mjs`, `fusion-orchestrator.mjs`, `hybrid-ultrawork.mjs`, `opencode-worker.mjs`, `task-router.mjs`, `index.mjs` | ParallelExecutor, ExecutionStrategy |
| `src/executor/` | `opencode-executor.mjs`, `opencode-server.mjs`, `opencode-server-pool.mjs`, `acp-client.mjs` | ServerPool class |
| `src/hooks/` | `detect-handoff.mjs`, `session-start.mjs`, `persistent-mode.mjs`, `fusion-router-logic.mjs` | Hook implementations |
| `src/hud/` | `omcm-hud.mjs`, `omcm-hud-wrapper.mjs`, `omcm-hud-entry.cjs`, `fusion-renderer.mjs`, `mode-detector.mjs`, `claude-usage-api.mjs`, `index.mjs` | HUD rendering |
| `src/utils/` | `config.mjs`, `context.mjs`, `fusion-tracker.mjs`, `handoff-context.mjs`, `provider-limits.mjs`, `usage.mjs`, `tool-counter.mjs`, `session-id.mjs`, `project-root.mjs`, `state-manager.mjs` | Config, utilities |
| `src/pool/` | `server-pool.mjs` | Server pool |
| `src/config/` | `schema.mjs` | Config schema |

**Hooks** (`hooks/` — 5 files):
`hooks.json`, `bash-optimizer.mjs`, `read-optimizer.mjs`, `tool-tracker.mjs`, `fusion-router.mjs`

**Skills** (`skills/` — 8 directories):
`ralph/`, `ecomode/`, `cancel/`, `autopilot/`, `ulw/`, `hulw/`, `hybrid-ultrawork/`, `opencode/`

**Commands** (`commands/` — 8 files):
`fusion-setup.md`, `fusion-default-off.md`, `fusion-default-on.md`, `ulw.md`, `opencode.md`, `hulw.md`, `cancel-autopilot.md`, `autopilot.md`

**Scripts** (`scripts/` — 11 files):
`start-server-pool.sh`, `fusion-setup.sh`, `opencode-server.sh`, `agent-mapping.json`, `fusion.sh`, `handoff-to-opencode.sh`, `export-context.sh`, `migrate-to-omcm.sh`, `uninstall-hud.sh`, `install-hud.sh`, `fusion-bridge.sh`

**Agents** (`agents/` — 1 file):
`opencode-delegator.json`

**Tests** (`tests/` — 16 files):
Integration + v1.0.0 + unit + config + router tests

**Version Manifests**:
- `package.json` → `1.0.0`
- `.claude-plugin/plugin.json` → `1.0.0`
- `.claude-plugin/marketplace.json` → `1.0.0`

---

## Problem-Type Taxonomy

| Code | Meaning | Severity |
|------|---------|----------|
| `OUTDATED` | Info was once correct but code has changed | HIGH |
| `MISSING` | Feature/file/API exists in code but not documented | HIGH |
| `PHANTOM` | Doc references something that doesn't exist in code | HIGH |
| `WRONG` | Factual error (wrong path, wrong signature, wrong behavior) | CRITICAL |
| `SYNC_DIFF` | ko/ and en/ versions disagree on content | MEDIUM |
| `OK` | Verified correct | — |

---

## Work Objectives

### Core Objective
Audit every claim, path, reference, and feature in the 10 English-facing documentation files against the actual codebase, producing per-document tables and a final ko/en sync diff.

### Concrete Deliverables
1. **10 per-document audit tables** (one for each target doc)
2. **1 ko/en sync comparison table** (structural + content parity)
3. **1 version consistency table** (3 manifests)
4. **1 link/path validity table** (all referenced paths and URLs)
5. **1 "Phase 1-5 신규 기능" verification checklist**

### Definition of Done
- [ ] Every file path referenced in docs is verified to exist (or flagged PHANTOM)
- [ ] Every feature claim is cross-referenced with actual code (or flagged MISSING/WRONG)
- [ ] Every version mention matches manifests (or flagged OUTDATED)
- [ ] ko/en structural parity checked (or flagged SYNC_DIFF)
- [ ] All internal links resolve (or flagged WRONG)
- [ ] All external URLs are noted for manual verification

### Must Have
- Per-document table with row-level findings and problem-type codes
- "Phase 1-5 신규 기능" items verified as mandatory items

### Must NOT Have (Guardrails)
- ❌ No code changes or patches
- ❌ No invented repo conventions
- ❌ No assumptions about undocumented features

---

## "Phase 1-5 신규 기능" Mandatory Verification Items

These features are claimed in the README and MUST be individually verified against code:

| # | Feature Claim | Code Location to Verify | Check |
|---|--------------|------------------------|-------|
| F1 | RealtimeTracker (RingBuffer-based) | `src/tracking/realtime-tracker.mjs` | Class exists, has RingBuffer |
| F2 | MetricsCollector (per-provider metrics) | `src/tracking/metrics-collector.mjs` | Class exists, collects by provider |
| F3 | TimeBucket (time-range aggregation) | `src/tracking/` (any file) | Class/function exists |
| F4 | buildContext() auto-builds context | `src/context/context-builder.mjs` | Function exported |
| F5 | ContextSynchronizer (realtime sync) | `src/context/context-sync.mjs` | Class exported |
| F6 | Handoff history tracking | `src/context/` | Implementation exists |
| F7 | ProviderBalancer (4 strategies) | `src/router/balancer.mjs` | round-robin, weighted, latency, usage |
| F8 | ParallelExecutor (parallel/sequential/hybrid) | `src/orchestrator/parallel-executor.mjs` | Class with 3 modes |
| F9 | ExecutionStrategy (run/serve/acp) | `src/orchestrator/execution-strategy.mjs` | 3 strategy types |
| F10 | File conflict auto-detection | `src/orchestrator/parallel-executor.mjs` | Conflict check logic |
| F11 | Dependency-based task grouping | `src/orchestrator/parallel-executor.mjs` | Grouping logic |
| F12 | Auto provider routing | `src/orchestrator/parallel-executor.mjs` | Provider selection |
| F13 | ServerPool (flexible server pool) | `src/executor/opencode-server-pool.mjs` OR `src/pool/server-pool.mjs` | Class exists |
| F14 | HUD token display (C:↓↑ O:↓↑ G:↓↑) | `src/hud/omcm-hud.mjs` + `src/hud/fusion-renderer.mjs` | Renders provider tokens |
| F15 | MCP server integration (4 tools) | `src/executor/` or config | opencode_run, opencode_get_status, opencode_list_models, opencode_export_session |

---

## Verification Strategy

### Approach: Manual/Automated Audit (No TDD)

This is a documentation audit plan, not a code implementation. Verification is performed by:

1. **File existence check**: `ls -la <path>` or glob
2. **Export verification**: Read file, check for `export` statements matching documented names
3. **Grep for references**: Search code for specific strings/identifiers
4. **Line count comparison**: `wc -l docs/en/*.md` vs `wc -l docs/ko/*.md`
5. **Link validation**: Extract markdown links, check internal paths resolve
6. **Version grep**: `grep -r "version" package.json .claude-plugin/`

### Output Template (Per-Document)

```markdown
## Audit: docs/en/{FILENAME}.md

| # | Section/Claim | Evidence Source | Status | Notes |
|---|---------------|----------------|--------|-------|
| 1 | [specific claim or reference] | [file:line or command] | OK/OUTDATED/MISSING/PHANTOM/WRONG | [details] |
| 2 | ... | ... | ... | ... |
```

### Output Template (ko/en Sync)

```markdown
## ko/en Sync Comparison

| Document | ko Lines | en Lines | Δ | Sections Match | Status | Notes |
|----------|----------|----------|---|----------------|--------|-------|
| ARCHITECTURE.md | N | M | ±K | YES/NO | OK/SYNC_DIFF | [specifics] |
| FEATURES.md | ... | ... | ... | ... | ... | ... |
```

### Output Template (Version Consistency)

```markdown
## Version Consistency

| File | Version | Matches package.json? | Status |
|------|---------|----------------------|--------|
| package.json | 1.0.0 | — (baseline) | OK |
| .claude-plugin/plugin.json | X.Y.Z | YES/NO | OK/WRONG |
| .claude-plugin/marketplace.json | X.Y.Z | YES/NO | OK/WRONG |
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start immediately — inventory & infrastructure):
├── Task 1: Build master inventory + evidence baseline
└── Task 2: Version consistency check (3 manifests)

Wave 2 (After Wave 1 — parallel per-doc audits):
├── Task 3: Audit README.md (root)
├── Task 4: Audit docs/README.md (index)
├── Task 5: Audit docs/en/INSTALLATION.md
├── Task 6: Audit docs/en/ARCHITECTURE.md
├── Task 7: Audit docs/en/FEATURES.md
├── Task 8: Audit docs/en/API-REFERENCE.md
├── Task 9: Audit docs/en/CONFIGURATION.md
├── Task 10: Audit docs/en/FUSION-GUIDE.md
├── Task 11: Audit docs/en/SKILLS-REFERENCE.md
└── Task 12: Audit docs/en/TROUBLESHOOTING.md

Wave 3 (After Wave 2 — requires all per-doc results):
└── Task 13: ko/en Sync Comparison (all 8 paired docs)

Wave 4 (After Wave 3 — final assembly):
└── Task 14: Compile Final Audit Report

Critical Path: Task 1 → Tasks 3-12 → Task 13 → Task 14
Parallel Speedup: ~60% faster than sequential (10 audits run in parallel)
```

### Task Dependency Graph

| Task | Depends On | Blocks | Reason |
|------|------------|--------|--------|
| 1 | None | 3-12 | Inventory needed for all audits |
| 2 | None | 14 | Version check is independent |
| 3 | 1 | 13, 14 | Needs inventory to verify claims |
| 4 | 1 | 14 | Needs inventory |
| 5 | 1 | 13, 14 | Needs inventory |
| 6 | 1 | 13, 14 | Needs inventory |
| 7 | 1 | 13, 14 | Needs inventory |
| 8 | 1 | 13, 14 | Needs inventory |
| 9 | 1 | 13, 14 | Needs inventory |
| 10 | 1 | 13, 14 | Needs inventory |
| 11 | 1 | 13, 14 | Needs inventory |
| 12 | 1 | 13, 14 | Needs inventory |
| 13 | 3-12 | 14 | Needs en/ audit results to compare with ko/ |
| 14 | 2, 3-12, 13 | None | Final assembly of all results |

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3-12 | 2 |
| 2 | None | 14 | 1 |
| 3 | 1 | 13, 14 | 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| 4 | 1 | 14 | 3, 5, 6, 7, 8, 9, 10, 11, 12 |
| 5 | 1 | 13, 14 | 3, 4, 6, 7, 8, 9, 10, 11, 12 |
| 6 | 1 | 13, 14 | 3, 4, 5, 7, 8, 9, 10, 11, 12 |
| 7 | 1 | 13, 14 | 3, 4, 5, 6, 8, 9, 10, 11, 12 |
| 8 | 1 | 13, 14 | 3, 4, 5, 6, 7, 9, 10, 11, 12 |
| 9 | 1 | 13, 14 | 3, 4, 5, 6, 7, 8, 10, 11, 12 |
| 10 | 1 | 13, 14 | 3, 4, 5, 6, 7, 8, 9, 11, 12 |
| 11 | 1 | 13, 14 | 3, 4, 5, 6, 7, 8, 9, 10, 12 |
| 12 | 1 | 13, 14 | 3, 4, 5, 6, 7, 8, 9, 10, 11 |
| 13 | 3-12 | 14 | None |
| 14 | 2, 13 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | explore (inventory), explore (version grep) |
| 2 | 3-12 | 10× explore agents in parallel |
| 3 | 13 | explore-medium (ko/en comparison) |
| 4 | 14 | writer (report assembly) |

---

## TODOs

### Wave 1: Foundation

- [ ] 1. Build Master Codebase Inventory

  **What to do**:
  - Enumerate ALL files in `src/`, `hooks/`, `skills/`, `scripts/`, `commands/`, `agents/`, `tests/`
  - For each `src/` module, extract exported symbols (class names, function names) using grep for `export`
  - Build a lookup table: `{ filePath → [exportedSymbols] }`
  - Extract all internal markdown links from every doc file (regex: `\[.*?\]\(.*?\)`)
  - Extract all file paths referenced in every doc file
  - Save to `.sisyphus/evidence/codebase-inventory.md`

  **Must NOT do**:
  - Do not modify any files
  - Do not run tests or builds

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File enumeration and grep are fast, low-complexity tasks
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands JS/MJS module exports syntax
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work involved
    - `git-master`: No git operations needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3-12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/tracking/index.mjs` — Module re-export pattern (check for `export { X } from './y.mjs'`)
  - `src/context/index.mjs` — Same pattern
  - `src/orchestrator/index.mjs` — Same pattern

  **Evidence Commands**:
  ```bash
  # List all source files
  find src/ -name '*.mjs' -o -name '*.cjs' | sort
  
  # Extract exports from all files
  grep -rn "^export" src/ --include="*.mjs"
  
  # Extract all markdown links from docs
  grep -oP '\[.*?\]\(.*?\)' docs/en/*.md README.md docs/README.md
  
  # Extract all file paths mentioned in docs
  grep -oP '`[a-zA-Z0-9_./-]+\.(mjs|js|sh|json|md|cjs)`' docs/en/*.md README.md
  ```

  **Acceptance Criteria**:
  - [ ] Inventory file created with every src/ export cataloged
  - [ ] All markdown links extracted and listed
  - [ ] All file-path references extracted from docs

  **Commit**: NO

---

- [ ] 2. Version Consistency Check

  **What to do**:
  - Read version from `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
  - Compare all three
  - Check if README.md mentions any version numbers and whether they match
  - Check CHANGELOG.md top entry matches current version
  - Produce version consistency table

  **Must NOT do**:
  - Do not change any version numbers

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file reads and string comparison
  - **Skills**: []
    - No specialized skills needed
  - **Skills Evaluated but Omitted**:
    - All: task is pure file-reading

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 14
  - **Blocked By**: None

  **References**:
  - `package.json:3` — `"version": "1.0.0"`
  - `.claude-plugin/plugin.json:3` — `"version": "1.0.0"`
  - `.claude-plugin/marketplace.json:13` — `"version": "1.0.0"`
  - `CHANGELOG.md` — Top entry should match
  - `docs/CHANGELOG.md` — Also check

  **Evidence Commands**:
  ```bash
  grep '"version"' package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
  head -20 CHANGELOG.md
  ```

  **Output Table**:
  ```markdown
  | File | Version | Matches package.json? | Status |
  |------|---------|----------------------|--------|
  | package.json | 1.0.0 | — (baseline) | OK |
  | .claude-plugin/plugin.json | ? | ? | ? |
  | .claude-plugin/marketplace.json | ? | ? | ? |
  | CHANGELOG.md (top entry) | ? | ? | ? |
  | README.md (version mentions) | ? | ? | ? |
  ```

  **Acceptance Criteria**:
  - [ ] All 3 manifest versions compared
  - [ ] CHANGELOG top entry checked
  - [ ] Version consistency table produced

  **Commit**: NO

---

### Wave 2: Per-Document Audits (All Parallel)

Each task below follows the SAME audit procedure:

**Standard Audit Procedure (for Tasks 3-12)**:

For each document:
1. **Read the doc** completely
2. **For every file path** referenced → verify it exists via `ls` or glob
3. **For every feature/capability claim** → find evidence in code (export, class, function)
4. **For every code example** → verify syntax matches actual API
5. **For every config key** → check `src/config/schema.mjs` or actual config structure
6. **For every external URL** → note for manual check (don't fetch)
7. **For every internal link** → verify target file exists
8. **For every version mention** → compare with manifest baseline
9. **Cross-reference "Phase 1-5 신규 기능" items** if they appear in this doc (F1-F15 from checklist above)
10. **Produce per-document audit table** using the template

---

- [ ] 3. Audit README.md (Root)

  **What to do**:
  - Read `/opt/oh-my-claude-money/README.md`
  - The README is bilingual (English + Korean). Audit the ENGLISH section specifically
  - Verify: Quick Start commands, prerequisites, "How It Works" flow diagram, Server Pool section, Config reference, file structure tree
  - **Special focus**: File structure tree (line-by-line verify every listed file/dir exists)
  - **Special focus**: Test count claims ("361개 테스트")
  - **Special focus**: All "Phase 1-5 신규 기능" items (F1-F15) appear in Korean section

  **Must NOT do**:
  - Do not fix any issues found

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate complexity reading + cross-referencing
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding module structure references

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4-12)
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `/opt/oh-my-claude-money/README.md` — Full file (target)
  - Task 1 output — codebase inventory for cross-reference
  - "Phase 1-5 신규 기능" checklist (F1-F15 above)

  **Evidence to Collect**:
  ```bash
  # Verify file structure tree
  # For each path in README's "파일 구조" section, run:
  ls -la <path>
  
  # Verify test count
  npm test 2>&1 | tail -5
  # OR
  find tests/ -name '*.test.mjs' | wc -l
  ```

  **Output Table**:
  ```markdown
  ## Audit: README.md (English Section)

  | # | Section/Claim | Evidence Source | Status | Notes |
  |---|---------------|----------------|--------|-------|
  | 1 | Quick Start install command | install.sh existence | ? | |
  | 2 | /plugin marketplace add URL | GitHub URL reachable | ? | |
  | 3 | File structure: .claude-plugin/ | ls .claude-plugin/ | ? | |
  | 4 | File structure: agents/opencode-delegator.json | ls agents/ | ? | |
  | ... | ... | ... | ... | ... |
  ```

  **Acceptance Criteria**:
  - [ ] Every file in the file-structure tree verified
  - [ ] All "Phase 1-5" feature claims cross-referenced (F1-F15)
  - [ ] All commands/URLs noted
  - [ ] Audit table produced

  **Commit**: NO

---

- [ ] 4. Audit docs/README.md (Index)

  **What to do**:
  - Read `docs/README.md`
  - Verify every link target exists (8 ko/ links + 8 en/ links + CHANGELOG link)
  - Check for completeness: any doc files that exist but aren't linked?

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5-12)
  - **Blocks**: Task 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/README.md` — Target (25 lines, already read)
  - `docs/en/*.md` — 8 files confirmed
  - `docs/ko/*.md` — 8 files confirmed
  - `CHANGELOG.md` — Exists at root and `docs/CHANGELOG.md`

  **Evidence**:
  ```bash
  ls docs/en/ docs/ko/ CHANGELOG.md docs/CHANGELOG.md
  ```

  **Known Issue to Check**: Link `../CHANGELOG.md` — does it resolve correctly from `docs/` directory?

  **Acceptance Criteria**:
  - [ ] All 17 links verified (8 ko + 8 en + 1 CHANGELOG)
  - [ ] Missing link targets flagged as PHANTOM
  - [ ] Unlinked docs flagged as MISSING

  **Commit**: NO

---

- [ ] 5. Audit docs/en/INSTALLATION.md

  **What to do**:
  - Read full document
  - Verify: install.sh URL, curl command syntax, git clone URL, step-by-step flow diagram
  - Verify: `opencode auth login` command exists in OpenCode
  - Verify: environment variable names (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY)
  - Verify: `/omcm:fusion-setup` command exists in `commands/`
  - Verify: `/oh-my-claudecode:omc-setup` referenced correctly
  - Verify: manual install path `~/.local/share/omcm` is mentioned consistently

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/en/INSTALLATION.md` — Target
  - `install.sh` — Exists at root
  - `commands/fusion-setup.md` — Exists
  - Task 1 output — commands inventory

  **Acceptance Criteria**:
  - [ ] All install commands syntactically verified
  - [ ] All referenced paths exist
  - [ ] External URLs noted
  - [ ] Audit table produced

  **Commit**: NO

---

- [ ] 6. Audit docs/en/ARCHITECTURE.md

  **What to do**:
  - Read full document
  - Verify: Architecture diagrams reference real modules
  - Verify: Module descriptions match actual file contents
  - Cross-reference every `src/` path mentioned
  - Check: hook descriptions match actual hooks/ files
  - Check: claimed data flows match code (e.g., fusion router → orchestrator → executor)
  - Verify: agent mapping table matches `scripts/agent-mapping.json` and `src/orchestrator/agent-fusion-map.mjs`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Needs to understand architectural relationships
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/en/ARCHITECTURE.md` — Target
  - `src/orchestrator/agent-fusion-map.mjs` — Agent mapping source of truth
  - `scripts/agent-mapping.json` — Alternative mapping source
  - `hooks/hooks.json` — Hook definitions
  - All `src/` modules listed in inventory

  **Acceptance Criteria**:
  - [ ] Every module reference verified against actual files
  - [ ] Agent mapping cross-checked with code
  - [ ] Architecture flow validated against code imports
  - [ ] Audit table produced

  **Commit**: NO

---

- [ ] 7. Audit docs/en/FEATURES.md

  **What to do**:
  - Read full document
  - **CRITICAL**: This is where "Phase 1-5 신규 기능" items MUST be verified
  - For EACH feature claim: find the actual code that implements it
  - Verify F1-F15 checklist items (see "Phase 1-5" section above)
  - Check: feature descriptions match actual behavior
  - Check: version tags (v0.4.0, v0.8.0, v1.0.0) are attributed to correct features

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Deepest cross-reference work — must verify 15+ feature claims against code
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/en/FEATURES.md` — Target
  - F1-F15 checklist — Mandatory items
  - `src/tracking/` — F1, F2, F3
  - `src/context/` — F4, F5, F6
  - `src/router/balancer.mjs` — F7
  - `src/orchestrator/parallel-executor.mjs` — F8, F10, F11, F12
  - `src/orchestrator/execution-strategy.mjs` — F9
  - `src/executor/opencode-server-pool.mjs`, `src/pool/server-pool.mjs` — F13
  - `src/hud/` — F14
  - MCP config or executor — F15

  **Acceptance Criteria**:
  - [ ] ALL 15 feature items (F1-F15) individually verified
  - [ ] Each feature has evidence (file:line reference or PHANTOM flag)
  - [ ] Version attributions checked
  - [ ] Audit table produced with F1-F15 rows

  **Commit**: NO

---

- [ ] 8. Audit docs/en/API-REFERENCE.md

  **What to do**:
  - Read full document
  - For EVERY function/class/method documented: verify it exists with matching signature
  - Check parameter names, types, return values
  - Verify module paths (import statements)
  - Check: are there undocumented public exports? (MISSING)
  - Check: are there documented functions that don't exist? (PHANTOM)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Must verify function signatures against actual code
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/en/API-REFERENCE.md` — Target
  - Task 1 output — export inventory (master reference)
  - All `src/` files with exports

  **Evidence Commands**:
  ```bash
  # For each documented function, verify:
  grep -n "export.*functionName" src/module/file.mjs
  # Check signature matches
  ```

  **Acceptance Criteria**:
  - [ ] Every documented API verified against code
  - [ ] Undocumented exports flagged as MISSING
  - [ ] Non-existent documented APIs flagged as PHANTOM
  - [ ] Signature mismatches flagged as WRONG
  - [ ] Audit table produced

  **Commit**: NO

---

- [ ] 9. Audit docs/en/CONFIGURATION.md

  **What to do**:
  - Read full document
  - Cross-reference every config key against `src/config/schema.mjs`
  - Verify default values match code defaults
  - Check: config file path (`~/.claude/plugins/omcm/config.json`) — is this consistent with README?
  - Check: are there config keys in code not documented? (MISSING)
  - Check: are there documented keys not in code? (PHANTOM)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/en/CONFIGURATION.md` — Target
  - `src/config/schema.mjs` — Config schema source of truth
  - `src/utils/config.mjs` — Config loading logic
  - README.md config section — Cross-reference

  **Acceptance Criteria**:
  - [ ] Every documented config key verified in schema
  - [ ] Default values compared
  - [ ] Undocumented keys flagged
  - [ ] Audit table produced

  **Commit**: NO

---

- [ ] 10. Audit docs/en/FUSION-GUIDE.md

  **What to do**:
  - Read full document
  - Verify: agent fusion mapping table against `src/orchestrator/agent-fusion-map.mjs` and `scripts/agent-mapping.json`
  - Verify: model names (gpt-5.2-codex, gemini-3.0-flash, etc.) match code constants
  - Verify: tier assignments (HIGH/MEDIUM/LOW) match code
  - Verify: fusion mode keywords (hulw, ulw, etc.) match `skills/` and `commands/`
  - Verify: fallback chain description matches `src/orchestrator/fallback-orchestrator.mjs`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/en/FUSION-GUIDE.md` — Target
  - `src/orchestrator/agent-fusion-map.mjs` — Agent mapping
  - `scripts/agent-mapping.json` — JSON mapping
  - `src/orchestrator/fallback-orchestrator.mjs` — Fallback logic
  - `skills/hulw/SKILL.md`, `skills/ulw/SKILL.md` — Skill definitions

  **Acceptance Criteria**:
  - [ ] Agent mapping table verified row-by-row
  - [ ] Model names verified against code
  - [ ] Fallback chain verified
  - [ ] Audit table produced

  **Commit**: NO

---

- [ ] 11. Audit docs/en/SKILLS-REFERENCE.md

  **What to do**:
  - Read full document
  - Verify: every skill listed exists as a `skills/*/SKILL.md` directory OR `commands/*.md`
  - Verify: skill descriptions match actual SKILL.md content
  - Check: are there skills in the filesystem not documented? (MISSING) — 8 skill dirs exist
  - Check: are there documented skills that don't exist? (PHANTOM)
  - Verify: command names (`/omcm:*`) match `commands/` directory

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/en/SKILLS-REFERENCE.md` — Target
  - `skills/` — 8 directories: ralph, ecomode, cancel, autopilot, ulw, hulw, hybrid-ultrawork, opencode
  - `commands/` — 8 files: fusion-setup, fusion-default-off, fusion-default-on, ulw, opencode, hulw, cancel-autopilot, autopilot

  **Acceptance Criteria**:
  - [ ] Every documented skill verified
  - [ ] Every filesystem skill checked for documentation
  - [ ] Command names verified
  - [ ] Audit table produced

  **Commit**: NO

---

- [ ] 12. Audit docs/en/TROUBLESHOOTING.md

  **What to do**:
  - Read full document
  - Verify: every error message or scenario references real code behavior
  - Verify: suggested fix commands are syntactically correct
  - Verify: file paths in troubleshooting steps exist
  - Check: do the referenced scripts exist? (`scripts/fusion-bridge.sh`, etc.)
  - Check: are there common issues from test failures or code TODOs not covered?

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `docs/en/TROUBLESHOOTING.md` — Target
  - `scripts/` — All 11 scripts
  - `hooks/` — Hook files
  - Task 1 output — file inventory

  **Acceptance Criteria**:
  - [ ] All referenced paths/commands verified
  - [ ] Fix suggestions are plausible
  - [ ] Audit table produced

  **Commit**: NO

---

### Wave 3: Cross-Language Sync

- [ ] 13. ko/en Sync Comparison

  **What to do**:
  - For each of the 8 paired documents (ARCHITECTURE, FEATURES, INSTALLATION, CONFIGURATION, FUSION-GUIDE, API-REFERENCE, SKILLS-REFERENCE, TROUBLESHOOTING):
    1. Compare line counts (`wc -l`)
    2. Compare section headings (H1/H2/H3 structure)
    3. Identify sections present in ko/ but missing in en/ (or vice versa)
    4. Compare code block counts
    5. Compare table row counts for key tables (agent mapping, config options)
    6. Flag any SYNC_DIFF items
  - Note: This is STRUCTURAL comparison, not translation quality

  **Must NOT do**:
  - Do not evaluate translation quality
  - Do not modify either language's files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Structural comparison across 16 files requires moderate effort
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 3-12 (needs audit results for context)

  **References**:
  - `docs/en/*.md` — All 8 English docs
  - `docs/ko/*.md` — All 8 Korean docs
  - Tasks 5-12 outputs — Per-doc findings to compare

  **Evidence Commands**:
  ```bash
  # Line counts
  wc -l docs/en/*.md docs/ko/*.md
  
  # Section heading extraction
  grep -n "^#" docs/en/FEATURES.md
  grep -n "^#" docs/ko/FEATURES.md
  # (repeat for each pair)
  
  # Code block counts
  grep -c '```' docs/en/FEATURES.md docs/ko/FEATURES.md
  ```

  **Output Table**:
  ```markdown
  ## ko/en Sync Comparison

  | Document | ko Lines | en Lines | Δ | ko Sections | en Sections | Sections Match | Code Blocks ko | Code Blocks en | Status | Notes |
  |----------|----------|----------|---|-------------|-------------|----------------|----------------|----------------|--------|-------|
  | ARCHITECTURE.md | ? | ? | ? | ? | ? | ? | ? | ? | ? | |
  | FEATURES.md | ? | ? | ? | ? | ? | ? | ? | ? | ? | |
  | INSTALLATION.md | ? | ? | ? | ? | ? | ? | ? | ? | ? | |
  | CONFIGURATION.md | ? | ? | ? | ? | ? | ? | ? | ? | ? | |
  | FUSION-GUIDE.md | ? | ? | ? | ? | ? | ? | ? | ? | ? | |
  | API-REFERENCE.md | ? | ? | ? | ? | ? | ? | ? | ? | ? | |
  | SKILLS-REFERENCE.md | ? | ? | ? | ? | ? | ? | ? | ? | ? | |
  | TROUBLESHOOTING.md | ? | ? | ? | ? | ? | ? | ? | ? | ? | |
  ```

  **Acceptance Criteria**:
  - [ ] All 8 document pairs compared
  - [ ] Structural differences flagged as SYNC_DIFF
  - [ ] Missing sections identified per-pair
  - [ ] Sync comparison table produced

  **Commit**: NO

---

### Wave 4: Final Assembly

- [ ] 14. Compile Final Audit Report

  **What to do**:
  - Assemble all per-document audit tables (Tasks 3-12)
  - Add version consistency table (Task 2)
  - Add ko/en sync table (Task 13)
  - Add "Phase 1-5 신규 기능" verification summary
  - Add link/path validity summary (aggregated from all tasks)
  - Produce executive summary with counts: N × OK, N × OUTDATED, N × MISSING, N × PHANTOM, N × WRONG, N × SYNC_DIFF
  - Save to `.sisyphus/evidence/docs-audit-report.md`

  **Must NOT do**:
  - Do not propose fixes
  - Do not modify any docs

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Report assembly and formatting
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3-12, 13

  **References**:
  - All Task outputs (2-13)
  - Problem-type taxonomy (this plan)

  **Output Structure**:
  ```markdown
  # OMCM Documentation Audit Report
  
  ## Executive Summary
  | Status | Count |
  |--------|-------|
  | OK | N |
  | OUTDATED | N |
  | MISSING | N |
  | PHANTOM | N |
  | WRONG | N |
  | SYNC_DIFF | N |
  
  ## Version Consistency
  [Table from Task 2]
  
  ## Phase 1-5 Feature Verification
  [F1-F15 results from Task 7]
  
  ## Per-Document Audits
  ### README.md
  [Table from Task 3]
  ### docs/README.md
  [Table from Task 4]
  ### docs/en/INSTALLATION.md
  [Table from Task 5]
  ... (etc.)
  
  ## ko/en Sync Comparison
  [Table from Task 13]
  
  ## Link/Path Validity (Aggregated)
  [Combined from all tasks]
  ```

  **Acceptance Criteria**:
  - [ ] All sub-tables assembled
  - [ ] Executive summary with accurate counts
  - [ ] Report saved to evidence directory
  - [ ] No fix proposals included (audit only)

  **Commit**: NO

---

## Commit Strategy

No commits — this is a read-only audit plan. All output goes to `.sisyphus/evidence/`.

---

## Success Criteria

### Verification
- [ ] 10 per-document audit tables produced
- [ ] 1 ko/en sync table produced
- [ ] 1 version consistency table produced
- [ ] F1-F15 all individually verified
- [ ] All file paths in docs checked for existence
- [ ] Zero code modifications made

### Final Checklist
- [ ] Every doc-by-doc table uses the required column format: `# | Section/Claim | Evidence Source | Status | Notes`
- [ ] Status column uses ONLY: `OK | OUTDATED | MISSING | PHANTOM | WRONG | SYNC_DIFF`
- [ ] ko/en sync table uses the required format
- [ ] "Phase 1-5 신규 기능" items F1-F15 all have explicit verdicts
- [ ] Report is saved, not printed ephemerally
