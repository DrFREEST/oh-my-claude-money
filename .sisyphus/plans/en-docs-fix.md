# OMCM English Documentation Fix Plan

## TL;DR

> **Quick Summary**: Fix all English documentation files to match source code truth. Corrects agent counts, OMO agent names, port numbers, routing tables, and expands SKILLS-REFERENCE.md. Based on exhaustive analysis from prior audit sessions.
>
> **Deliverables**:
> - 10 updated English documentation files aligned with source code
> - Unified agent routing tables across all docs
> - Expanded SKILLS-REFERENCE.md (8 skills fully documented)
> - All code examples verified (no optional chaining `?.`)
>
> **Estimated Effort**: Large (10 files, ~200+ individual edits)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 0 (golden reference) → Tasks 1-6 (parallel doc fixes) → Tasks 7-9 (cross-doc + expansion) → Task 10 (final verification)

---

## Context

### Original Request
Update all 10 English-facing documentation files to match source code reality. Fix agent counts, OMO agent names, port numbers, routing tables, expand thin docs, and ensure cross-doc consistency.

### Source of Truth Files

| File | Role |
|------|------|
| `src/orchestrator/agent-fusion-map.mjs` | **Primary**: All agent mappings, tiers, models, OMO agents |
| `src/executor/opencode-server-pool.mjs` | Port numbers (`DEFAULT_BASE_PORT = 4096`) |
| `src/orchestrator/task-router.mjs` | Task routing logic |
| `skills/*/SKILL.md` (8 files) | Skill triggers, workflows, descriptions |
| `package.json` | Version number |

### Critical Findings (From Prior Analysis)

#### Finding 1: Agent Count is Wrong Everywhere
**Source code truth** (`agent-fusion-map.mjs` FUSION_MAP):
- HIGH tier: **13** agents (11 base + 2 from v0.7.0: researcher-high, build-fixer-high)
- MEDIUM tier: **10** agents
- LOW tier: **12** agents (code comment says "8개" but 12 actually exist: qa-tester-low, tdd-guide-low, code-reviewer-low, scientist-low were added)
- **TOTAL: 35 agents** mapped
- Token-saving (MEDIUM + LOW): **22 agents (63%)**

**Docs currently say**: "29 agents", "18 agents (62%) save tokens"

**Files affected**: README.md, FEATURES.md, FUSION-GUIDE.md, ARCHITECTURE.md

#### Finding 2: OMO Agent Names — Fictional vs Real

**Source code truth** (`OMO_AGENTS` in agent-fusion-map.mjs lines 50-67):
The ONLY real OMO agent names are: `build`, `explore`, `plan`, `general`

**Fictional names used in skill files and docs**:
"Oracle", "Librarian", "Frontend Engineer", "Codex", "frontend-ui-ux-engineer", "document-writer", "multimodal-looker"

**Decision (DEFAULT APPLIED — override if needed)**: Docs will use the REAL OMO agent names (`build`, `explore`, `plan`, `general`) since those are what the code actually routes to. Routing tables will show: `architect → build (Claude Opus)` format — real agent name with model for clarity. NOT `architect → Oracle (GPT)`.

**Rationale**: Source code truth trumps human-friendly aliases. Developers reading both code and docs won't be confused by names that don't exist in the codebase. The fictional names in skill SKILL.md files are a SEPARATE issue (not in scope).

**Alternative if user disagrees**: Could use `build (Oracle)` format showing both, or keep fictional names for readability. User can override this default.

#### Finding 3: Port Numbers
**Correct**: `DEFAULT_BASE_PORT = 4096`
**Wrong in docs**: CONFIGURATION.md says `OMCM_BASE_PORT=8000`, TROUBLESHOOTING.md references 8000 in multiple places.

#### Finding 4: Routing Tables Diverge Across Docs
At least 5 different routing tables exist across docs. They need to be unified to match agent-fusion-map.mjs.

#### Finding 5: SKILLS-REFERENCE.md is Thin
Only 272 lines for 8 skills. The agent routing tables in this file use fictional OMO names. Content from the 8 SKILL.md files should be incorporated.

#### Finding 6: Optional Chaining Audit
Code examples must not use `?.` syntax. Need to scan all doc code blocks.

#### Finding 7: LOW Tier Agent List Incomplete in Docs
Docs list only 8 LOW agents. There are 12. Missing: qa-tester-low, tdd-guide-low, code-reviewer-low, scientist-low.

### Korean Docs — OUT OF SCOPE
`docs/ko/*.md` mirrors exist but updating them is a separate task. This plan should note it as a mandatory follow-up per CLAUDE.md rules.

---

## Work Objectives

### Core Objective
Fix all 10 English documentation files to accurately reflect source code, with unified tables and expanded content.

### Concrete Deliverables
- 10 corrected English doc files
- Consistent agent count (35 total, 22 token-saving, 63%) across all docs
- Correct OMO agent names (build/explore/plan/general) in all routing tables
- Correct port numbers (4096) everywhere
- Expanded SKILLS-REFERENCE.md covering all 8 skills with full detail

### Definition of Done
- [ ] `grep -rn "29 agents\|29개\|18 agents\|18개" docs/en/` returns 0 results
- [ ] `grep -rn "8000" docs/en/CONFIGURATION.md docs/en/TROUBLESHOOTING.md` returns 0 results for port contexts
- [ ] `grep -rn "Oracle\|Librarian\|Frontend Engineer\|frontend-ui-ux-engineer\|document-writer\|multimodal-looker\|Codex" docs/en/` returns 0 results (fictional OMO names removed from EN docs)
- [ ] All routing tables match `agent-fusion-map.mjs` FUSION_MAP exactly
- [ ] SKILLS-REFERENCE.md exceeds 500 lines
- [ ] `grep -rn '\?\.' docs/en/` returns 0 results in code blocks
- [ ] All files validate as clean markdown (no broken links, tables, etc.)

### Must Have
- Every number/name/table matches source code exactly
- Cross-doc consistency (same table appears the same way everywhere)
- Line-level references for every edit

### Must NOT Have (Guardrails)
- ❌ NO changes to Korean docs (separate follow-up plan)
- ❌ NO changes to source code files
- ❌ NO changes to skill SKILL.md files (they have their own inconsistencies but are out of scope)
- ❌ NO adding features or content that doesn't exist in source code
- ❌ NO optional chaining (`?.`) in any code examples
- ❌ NO inventing new agent names or descriptions — use source code verbatim
- ❌ NO changing the Korean section of README.md (only EN section ~lines 30-123)
- ❌ NO rewriting entire documents — surgical edits only where facts are wrong

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A — documentation edits
- **User wants tests**: Manual verification via grep/read
- **Framework**: N/A

### Automated Verification

Each TODO includes grep-based verification commands that confirm correctness:

| Verification | Command |
|-------------|---------|
| Agent count | `grep -rn "35 agents\|35개" docs/en/` should find updated references |
| Port number | `grep -rn "4096" docs/en/CONFIGURATION.md` confirms correct port |
| Fictional names gone | `grep -rn "Oracle\|Librarian\|Codex" docs/en/` returns 0 |
| Optional chaining | `grep -Pn '\?\.' docs/en/*.md` returns 0 in code blocks |
| SKILLS-REFERENCE size | `wc -l docs/en/SKILLS-REFERENCE.md` > 500 |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Prerequisite — Sequential):
└── Task 0: Create golden reference tables from source code

Wave 1 (After Wave 0 — Parallel):
├── Task 1: Fix README.md (EN section)
├── Task 2: Fix ARCHITECTURE.md
├── Task 3: Fix FEATURES.md
├── Task 4: Fix FUSION-GUIDE.md
├── Task 5: Fix CONFIGURATION.md
└── Task 6: Fix TROUBLESHOOTING.md

Wave 2 (After Wave 1 — Parallel):
├── Task 7: Expand SKILLS-REFERENCE.md
├── Task 8: Fix API-REFERENCE.md
└── Task 9: Fix INSTALLATION.md + docs/README.md

Wave 3 (After Wave 2 — Sequential):
└── Task 10: Cross-doc consistency verification + optional chaining audit
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 0 | None | 1-9 | None |
| 1 | 0 | 10 | 2, 3, 4, 5, 6 |
| 2 | 0 | 10 | 1, 3, 4, 5, 6 |
| 3 | 0 | 10 | 1, 2, 4, 5, 6 |
| 4 | 0 | 10 | 1, 2, 3, 5, 6 |
| 5 | 0 | 10 | 1, 2, 3, 4, 6 |
| 6 | 0 | 10 | 1, 2, 3, 4, 5 |
| 7 | 0 | 10 | 8, 9 |
| 8 | 0 | 10 | 7, 9 |
| 9 | 0 | 10 | 7, 8 |
| 10 | 1-9 | None | None (final) |

---

## TODOs

### Task 0: Create Golden Reference Tables

**What to do**:
- Read `src/orchestrator/agent-fusion-map.mjs` and extract:
  1. Complete FUSION_MAP with all 35 agents, their OMO agent, model, tier
  2. Stats: 13 HIGH, 10 MEDIUM, 12 LOW, 35 total, 22 token-saving (63%)
  3. Tier-by-model summary table
- Produce a canonical markdown snippet for each table variant needed across docs:
  - **Full mapping table**: All 35 OMC → OMO agent + model + tier + savings
  - **Tier summary table**: HIGH/MEDIUM/LOW counts + models
  - **Routing summary table**: Task type → target provider
- Store these in `.sisyphus/drafts/golden-tables.md` for reference by all other tasks

**Must NOT do**:
- Do not edit any doc files in this task
- Do not invent data — extract verbatim from source

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Read-only extraction from a single source file
- **Skills**: [`git-master`]
  - `git-master`: Not needed, skip

**Parallelization**:
- **Can Run In Parallel**: NO — prerequisite for all others
- **Parallel Group**: Wave 0 (solo)
- **Blocks**: Tasks 1-9
- **Blocked By**: None

**References**:
- `src/orchestrator/agent-fusion-map.mjs:50-67` — OMO_AGENTS definition (build, explore, plan, general)
- `src/orchestrator/agent-fusion-map.mjs:73-334` — Complete FUSION_MAP (all 35 agents)
- `src/orchestrator/agent-fusion-map.mjs:378-393` — getFusionStats() function confirming calculation logic

**Acceptance Criteria**:
- [ ] `.sisyphus/drafts/golden-tables.md` exists
- [ ] Contains exactly 35 agent rows in full mapping table
- [ ] Tier counts: HIGH=13, MEDIUM=10, LOW=12
- [ ] Token-saving count: 22 (63%)
- [ ] Uses ONLY real OMO agent names: build, explore, plan, general

**Commit**: NO (draft file only)

---

### Task 1: Fix README.md (English Section Only)

**What to do**:
- Edit ONLY the English section (~lines 30-123)
- Fix agent count: "32 agents" → "35 agents" (and any "29" references)
- Fix token savings: "18 agents offloaded" → "22 agents offloaded"
- Fix savings percentage if mentioned: "62%" → "63%"
- Verify "How It Works" diagram uses correct routing description
- Do NOT touch Korean section (line ~130 onwards)
- Do NOT change the ASCII art banner

**Must NOT do**:
- Do not edit Korean section
- Do not restructure the EN section — keep existing flow
- Do not add new sections

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Small, targeted edits in a well-understood file
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2-6)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `README.md:30-123` — English section to edit
- `.sisyphus/drafts/golden-tables.md` — Golden reference tables from Task 0
- `src/orchestrator/agent-fusion-map.mjs:378-393` — Stats function for verification

**Acceptance Criteria**:
```bash
# Verify no "29" or "32" agent count in EN section
sed -n '30,123p' README.md | grep -c "29 agents\|32 agents\|29개\|32개"
# Assert: 0

# Verify "35" appears for agent count
sed -n '30,123p' README.md | grep -c "35"
# Assert: >= 1

# Verify "22" appears for token-saving count
sed -n '30,123p' README.md | grep -c "22"
# Assert: >= 1
```

**Commit**: YES (group with Tasks 2-6)
- Message: `docs(en): fix agent counts, port numbers, and routing tables across EN docs`
- Files: `README.md`

---

### Task 2: Fix ARCHITECTURE.md

**What to do**:
- Fix agent routing table (~lines 79-90): Replace fictional OMO names with real names (build/explore/plan/general)
- Fix tier summary (~lines 25-28): Update counts to HIGH=13, MEDIUM=10, LOW=12
- Fix any "29 agents" references → "35 agents"
- Fix port references if any (check for 8000 → 4096)
- Ensure file tree / directory structure matches actual codebase

**Must NOT do**:
- Do not rewrite architecture descriptions — only fix factual errors
- Do not add new architecture sections

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Targeted factual corrections in known locations
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3-6)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `docs/en/ARCHITECTURE.md:25-28` — Tier summary section
- `docs/en/ARCHITECTURE.md:79-90` — Agent routing table
- `.sisyphus/drafts/golden-tables.md` — Golden reference tables from Task 0
- `src/orchestrator/agent-fusion-map.mjs:50-67` — Real OMO agent names

**Acceptance Criteria**:
```bash
grep -c "Oracle\|Librarian\|Frontend Engineer\|Codex\|frontend-ui-ux-engineer" docs/en/ARCHITECTURE.md
# Assert: 0

grep -c "35" docs/en/ARCHITECTURE.md
# Assert: >= 1 (agent count)
```

**Commit**: YES (group with Task 1)
- Files: `docs/en/ARCHITECTURE.md`

---

### Task 3: Fix FEATURES.md

**What to do**:
- Fix agent fusion mapping table (~lines 30-53): Update to match all 35 agents from FUSION_MAP
- Fix tier model distribution table: Verify HIGH/MEDIUM/LOW models match source
- Fix agent count references: "29개" → "35" (document is in English but may have Korean remnants)
- Fix token-saving count: "18 agents (62%)" → "22 agents (63%)"
- Update LOW tier agent list to include all 12 (add qa-tester-low, tdd-guide-low, code-reviewer-low, scientist-low)
- Update HIGH tier to include researcher-high, build-fixer-high (v0.7.0 additions)
- Replace fictional OMO agent names with real ones

**Must NOT do**:
- Do not rewrite feature descriptions
- Do not add features not in source code

**Recommended Agent Profile**:
- **Category**: `writing`
  - Reason: Substantial table updates requiring careful formatting
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2, 4-6)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `docs/en/FEATURES.md:30-53` — Main agent mapping table
- `.sisyphus/drafts/golden-tables.md` — Golden reference tables from Task 0
- `src/orchestrator/agent-fusion-map.mjs:73-334` — Complete FUSION_MAP

**Acceptance Criteria**:
```bash
grep -c "Oracle\|Librarian\|Frontend Engineer\|Codex" docs/en/FEATURES.md
# Assert: 0

grep -c "qa-tester-low\|tdd-guide-low\|code-reviewer-low\|scientist-low" docs/en/FEATURES.md
# Assert: >= 1 (newly added LOW agents)

grep -c "researcher-high\|build-fixer-high" docs/en/FEATURES.md
# Assert: >= 1 (v0.7.0 HIGH agents)
```

**Commit**: YES (group with Task 1)
- Files: `docs/en/FEATURES.md`

---

### Task 4: Fix FUSION-GUIDE.md

**What to do**:
- Fix main routing table (~lines 229-261): Replace all fictional OMO names with real names
- Fix agent routing map (~lines 41-44): Update to real OMO names
- Fix agent count: "29" → "35"
- Fix token-saving count: "18 (62%)" → "22 (63%)"
- Update tier summaries with correct counts
- Verify all model names match source (gpt-5.2-codex, gemini-3.0-flash, claude-opus-4-5)

**Must NOT do**:
- Do not change fusion mode explanations (hulw/ulw mechanics are correct conceptually)
- Do not add new fusion modes

**Recommended Agent Profile**:
- **Category**: `writing`
  - Reason: Multiple table rewrites requiring precision
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1-3, 5-6)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `docs/en/FUSION-GUIDE.md:41-44` — Agent routing map header
- `docs/en/FUSION-GUIDE.md:229-261` — Main routing table
- `.sisyphus/drafts/golden-tables.md` — Golden reference tables
- `src/orchestrator/agent-fusion-map.mjs:17-44` — Model definitions (OPUS, CODEX, FLASH)

**Acceptance Criteria**:
```bash
grep -c "Oracle\|Librarian\|Frontend Engineer\|Codex\|frontend-ui-ux-engineer\|document-writer\|multimodal-looker" docs/en/FUSION-GUIDE.md
# Assert: 0

grep -c "35" docs/en/FUSION-GUIDE.md
# Assert: >= 1
```

**Commit**: YES (group with Task 1)
- Files: `docs/en/FUSION-GUIDE.md`

---

### Task 5: Fix CONFIGURATION.md

**What to do**:
- Fix port number: `OMCM_BASE_PORT=8000` → `OMCM_BASE_PORT=4096` (or remove if env var doesn't exist in source)
- Verify all configuration keys match `src/utils/config.mjs` and `src/config/schema.mjs`
- Fix any agent count references
- Verify `maxOpencodeWorkers` default and description match source code
- Check all code examples for optional chaining (`?.`)

**Must NOT do**:
- Do not add configuration options that don't exist in source
- Do not remove valid configuration descriptions

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Targeted port fix + config key verification
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1-4, 6)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `docs/en/CONFIGURATION.md` — Full file, search for "8000" and "BASE_PORT"
- `src/executor/opencode-server-pool.mjs:1-50` — `DEFAULT_BASE_PORT = 4096`
- `src/utils/config.mjs` — Configuration loading logic
- `src/config/schema.mjs` — Config schema definition

**Acceptance Criteria**:
```bash
grep -c "8000" docs/en/CONFIGURATION.md
# Assert: 0 (in port-related contexts)

grep -c "4096" docs/en/CONFIGURATION.md
# Assert: >= 1 (correct port)
```

**Commit**: YES (group with Task 1)
- Files: `docs/en/CONFIGURATION.md`

---

### Task 6: Fix TROUBLESHOOTING.md

**What to do**:
- Fix all port 8000 references → 4096 (sections 2.4, 5.1, 7.2 and anywhere else)
- Fix any agent count references
- Fix any fictional OMO agent name references (~lines 863-872)
- Verify troubleshooting commands reference correct file paths
- Check code examples for optional chaining (`?.`)

**Must NOT do**:
- Do not rewrite troubleshooting procedures
- Do not add new troubleshooting sections

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Search-and-replace for known wrong values
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1-5)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `docs/en/TROUBLESHOOTING.md` — Full file, search for "8000"
- `docs/en/TROUBLESHOOTING.md:863-872` — Agent name references
- `src/executor/opencode-server-pool.mjs` — Correct port (4096)

**Acceptance Criteria**:
```bash
grep -c "8000" docs/en/TROUBLESHOOTING.md
# Assert: 0 (in port-related contexts)

grep -c "Oracle\|Librarian\|Frontend Engineer" docs/en/TROUBLESHOOTING.md
# Assert: 0
```

**Commit**: YES (group with Task 1)
- Message: `docs(en): fix agent counts, port numbers, and routing tables across EN docs`
- Files: `docs/en/TROUBLESHOOTING.md`

---

### Task 7: Expand SKILLS-REFERENCE.md

**What to do**:
- Expand from 272 lines to 500+ lines covering all 8 skills comprehensively
- For each skill, add from SKILL.md source files:
  - Full trigger keyword list
  - Detailed workflow description
  - State management details (state file paths, JSON structure)
  - Configuration options
  - Safety features (timeouts, max iterations for ralph)
  - Fusion mode integration details
- Fix all OMO agent routing tables in this file (lines 60-67, 109-117): Replace fictional names with real OMO names (build/explore/plan/general)
- Add `hybrid-ultrawork` as noted alias for `hulw`
- Ensure `ecomode` section includes routing strategy table (forced LOW/MEDIUM/Opus-retain)
- Ensure `ralph` section includes verification criteria (5-point), safety limits, escalation rules
- Ensure `cancel` section includes all 7 cancellable modes with state file paths

**Must NOT do**:
- Do not copy Korean text from SKILL.md files — translate to English
- Do not add skills that don't exist in `skills/` directory
- Do not invent workflow details not in source SKILL.md files

**Recommended Agent Profile**:
- **Category**: `writing`
  - Reason: Major content expansion requiring careful translation and formatting
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 8, 9)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `docs/en/SKILLS-REFERENCE.md` — Current file (272 lines)
- `skills/autopilot/SKILL.md` — 105 lines, Korean, has routing table + workflow
- `skills/ralph/SKILL.md` — 122 lines, Korean, has verification criteria + safety
- `skills/ulw/SKILL.md` — 94 lines, Korean, has usage-based mode switching
- `skills/hulw/SKILL.md` — 113 lines, Korean, has routing map + usage thresholds
- `skills/hybrid-ultrawork/SKILL.md` — 81 lines, Korean, alias for hulw
- `skills/opencode/SKILL.md` — 50 lines, Korean, handoff process
- `skills/ecomode/SKILL.md` — 103 lines, Korean, has routing strategy + savings table
- `skills/cancel/SKILL.md` — 82 lines, Korean, has mode detection + cancellation
- `.sisyphus/drafts/golden-tables.md` — For correct OMO agent names in routing tables

**Acceptance Criteria**:
```bash
wc -l docs/en/SKILLS-REFERENCE.md
# Assert: >= 500 lines

# All 8 skills mentioned
for skill in autopilot ralph ulw hulw ecomode opencode cancel hybrid-ultrawork; do
  grep -c "$skill" docs/en/SKILLS-REFERENCE.md
done
# Assert: each >= 1

# No fictional OMO names
grep -c "Oracle\|Librarian\|Frontend Engineer\|Codex\|frontend-ui-ux-engineer\|document-writer\|multimodal-looker" docs/en/SKILLS-REFERENCE.md
# Assert: 0
```

**Commit**: YES (separate commit)
- Message: `docs(en): expand SKILLS-REFERENCE with all 8 skills and fix routing tables`
- Files: `docs/en/SKILLS-REFERENCE.md`

---

### Task 8: Fix API-REFERENCE.md

**What to do**:
- Verify all exported function signatures match source code
- Fix any agent count references
- Fix any port number references
- Verify `getFusionStats()` return values documented match source (total: 35, etc.)
- Check `buildOpenCodeCommand()` documentation matches source signature
- Verify `OMO_AGENTS` export is documented with correct 4 agents (build, explore, plan, general)
- Check all code examples for optional chaining (`?.`)

**Must NOT do**:
- Do not add APIs that don't exist in source
- Do not change API descriptions unless factually wrong

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Cross-referencing function signatures — mechanical verification
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 7, 9)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `docs/en/API-REFERENCE.md` — Full file (1738 lines)
- `src/orchestrator/agent-fusion-map.mjs:343-443` — All exported functions
- `src/utils/config.mjs` — Config utility exports
- `src/context/context-builder.mjs` — buildContext() function
- `src/tracking/realtime-tracker.mjs` — Tracker exports

**Acceptance Criteria**:
```bash
# Verify no optional chaining in code blocks
grep -Pn '\?\.' docs/en/API-REFERENCE.md | grep -v '^\s*#\|^\s*-\|^\s*\|' | head
# Assert: 0 matches in code blocks

# Verify real OMO agents documented
grep -c "build.*explore.*plan.*general" docs/en/API-REFERENCE.md
# Assert: >= 1
```

**Commit**: YES (group with Task 7)
- Files: `docs/en/API-REFERENCE.md`

---

### Task 9: Fix INSTALLATION.md + docs/README.md

**What to do**:
- **INSTALLATION.md**:
  - Verify port references use 4096 (already mostly correct based on prior analysis)
  - Verify prerequisite list is accurate
  - Check install commands match actual `install.sh` behavior
  - Verify file paths referenced exist
- **docs/README.md**:
  - This is just the doc index (25 lines) — verify all links point to existing files
  - No agent count or routing changes expected here

**Must NOT do**:
- Do not rewrite installation procedures unless factually wrong
- Do not add new installation steps

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Mostly verification with minimal expected changes
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 7, 8)
- **Blocks**: Task 10
- **Blocked By**: Task 0

**References**:
- `docs/en/INSTALLATION.md` — Full file (833 lines)
- `docs/README.md` — Doc index (25 lines)
- `install.sh` — Actual installer script
- `src/executor/opencode-server-pool.mjs` — Port verification

**Acceptance Criteria**:
```bash
# All links in docs/README.md resolve
grep -oP '\(.*?\.md\)' docs/README.md | tr -d '()' | while read f; do
  test -f "docs/$f" || echo "BROKEN: $f"
done
# Assert: no BROKEN output
```

**Commit**: YES (group with Task 7 if changes, skip if no changes needed)
- Files: `docs/en/INSTALLATION.md`, `docs/README.md`

---

### Task 10: Cross-Doc Consistency Verification + Optional Chaining Audit

**What to do**:
- Run grep across ALL 10 files for:
  1. Remaining fictional OMO names: `Oracle|Librarian|Frontend Engineer|Codex|frontend-ui-ux-engineer|document-writer|multimodal-looker`
  2. Wrong agent counts: `29 agents|29개|18 agents|18개`
  3. Wrong port: `8000` in port contexts
  4. Optional chaining: `?.` in code blocks
- If any found, fix them
- Verify all routing tables across docs use identical format and data
- Produce a brief verification report as a commit message body

**Must NOT do**:
- Do not make cosmetic changes
- Do not restructure any document

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Automated grep verification + spot fixes
- **Skills**: None needed

**Parallelization**:
- **Can Run In Parallel**: NO — final verification
- **Parallel Group**: Wave 3 (solo)
- **Blocks**: None (final task)
- **Blocked By**: Tasks 1-9

**References**:
- All 10 target files
- `.sisyphus/drafts/golden-tables.md` — For comparison

**Acceptance Criteria**:
```bash
# Zero fictional OMO names
grep -rn "Oracle\|Librarian\|Frontend Engineer\|frontend-ui-ux-engineer\|document-writer\|multimodal-looker\|Codex" docs/en/ README.md
# Assert: 0

# Zero wrong counts
grep -rn "29 agents\|29개\|18 agents\|18개" docs/en/ README.md
# Assert: 0

# Zero wrong ports (in port context)
grep -rn "PORT.*8000\|port.*8000\|8000.*port" docs/en/
# Assert: 0

# Optional chaining in code blocks
grep -Pn '\?\.' docs/en/*.md README.md
# Assert: 0 matches inside code blocks
```

**Commit**: YES (final commit if fixes needed)
- Message: `docs(en): final cross-doc consistency fixes`
- Pre-commit: Run all grep assertions above

---

## Commit Strategy

| After Task(s) | Message | Files | Verification |
|---------------|---------|-------|--------------|
| 0 | No commit (draft only) | `.sisyphus/drafts/golden-tables.md` | File exists |
| 1-6 | `docs(en): fix agent counts, port numbers, and routing tables across EN docs` | README.md, 5 docs/en/*.md | grep assertions |
| 7 | `docs(en): expand SKILLS-REFERENCE with all 8 skills and fix routing tables` | docs/en/SKILLS-REFERENCE.md | wc -l >= 500 |
| 8-9 | `docs(en): fix API-REFERENCE and INSTALLATION accuracy` | docs/en/API-REFERENCE.md, docs/en/INSTALLATION.md, docs/README.md | grep assertions |
| 10 | `docs(en): final cross-doc consistency fixes` (if needed) | Any remaining | All grep assertions pass |

---

## Success Criteria

### Verification Commands
```bash
# 1. No fictional OMO names in EN docs
grep -rnc "Oracle\|Librarian\|Frontend Engineer\|frontend-ui-ux-engineer\|document-writer\|multimodal-looker\|Codex" docs/en/ README.md
# Expected: all 0

# 2. No wrong agent counts
grep -rn "29 agents\|18 agents" docs/en/ README.md
# Expected: 0 matches

# 3. No wrong port numbers
grep -rn "BASE_PORT.*8000\|port.*8000" docs/en/
# Expected: 0 matches

# 4. SKILLS-REFERENCE expanded
wc -l docs/en/SKILLS-REFERENCE.md
# Expected: >= 500

# 5. No optional chaining in code examples
grep -Pn '\?\.' docs/en/*.md
# Expected: 0 matches in code blocks
```

### Final Checklist
- [ ] All 35 agents listed correctly in FEATURES.md, FUSION-GUIDE.md
- [ ] All routing tables unified across docs
- [ ] Port 4096 used consistently
- [ ] SKILLS-REFERENCE.md expanded with all 8 skills
- [ ] No fictional OMO agent names remain
- [ ] No optional chaining in code examples
- [ ] Korean docs update noted as mandatory follow-up

---

## Follow-Up (Out of Scope)

### MANDATORY: Korean Docs Update
Per CLAUDE.md rules: `src/ 수정 시 docs/ko/ + docs/en/ 관련 문서 동시 업데이트 필수`

While this plan covers only EN docs (no src/ changes), the Korean docs have the same issues. A separate follow-up plan should be created to:
1. Mirror all EN fixes to `docs/ko/*.md`
2. Update Korean README section (~lines 130-875)

### OPTIONAL: Skill SKILL.md File Fixes
The 8 `skills/*/SKILL.md` files also use fictional OMO agent names ("Oracle", "Librarian", etc.). These are separate from the EN docs and could be fixed in a follow-up.

### OPTIONAL: Source Code Comment Fix
`agent-fusion-map.mjs` line 230 says "LOW Tier (8개)" but there are 12 LOW agents. This is a code comment bug.
