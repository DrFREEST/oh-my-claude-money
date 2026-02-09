# Korean Documentation Correction — Align 8 docs/ko/ Files to Source Code

## TL;DR

> **Quick Summary**: Update 8 Korean documentation files under `docs/ko/` to correct mappings (agent count from 29 to actual), ports (8000→4096), hook references, and v1.0.0 phase feature coverage. No version bump, no English docs, no code changes.
>
> **Deliverables**:
> - 8 corrected Korean doc files in `docs/ko/`
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 0 (shared reference build) → Tasks 1-8 (parallel edits) → Task 9 (cross-doc consistency verify)

---

## Context

### Original Request

Correct the 8 Korean documentation files (`docs/ko/*.md`) to match the current source code. Scope is strictly: agent mappings, port numbers, hook references, and v1.0.0 phase feature coverage. No version bump. No `docs/en/` updates. No optional chaining (`?.`) in code examples. Preserve existing Korean formatting style.

### Source Code Truth (Verified)

**Agent Mappings** (`src/orchestrator/agent-fusion-map.mjs`):
- **35 total agents** in FUSION_MAP
- HIGH Tier: **13 agents** (original 11 + v0.7.0: `researcher-high`, `build-fixer-high`)
- MEDIUM Tier: **10 agents** (unchanged)
- LOW Tier: **12 agents** (original 8 + v0.7.0: `qa-tester-low` + `tdd-guide-low`, `code-reviewer-low`, `scientist-low` already counted)
- Token-saving agents (MEDIUM+LOW): **22 out of 35 = 62.9%**
- Models: OPUS=`claude-opus-4-5-20251101`, CODEX=`gpt-5.2-codex`, FLASH=`gemini-3.0-flash`

**Port Numbers** (`src/pool/server-pool.mjs`, `src/executor/opencode-server-pool.mjs`):
- `basePort: 4096` in both files
- No reference to port 8000 anywhere in source code
- Port range: 4096–4096+maxServers (default max: 4 in pool, 5 in executor)

**Hooks** (`src/hooks/` — 4 files):
- `detect-handoff.mjs` — UserPromptSubmit: keyword/threshold/mode detection + delegation patterns
- `fusion-router-logic.mjs` — PreToolUse: fusion routing decisions
- `persistent-mode.mjs` — Stop: active mode warning on session exit
- `session-start.mjs` — SessionStart: usage warning + auto server pool start

**v1.0.0 Phase Features** (CHANGELOG + source):
1. Realtime tracking system (`src/tracking/`)
2. Multi-provider balancing (`src/router/balancer.mjs`)
3. Context transfer system (`src/context/`)
4. Parallel executor (`src/orchestrator/parallel-executor.mjs`)
5. ACP client (`src/executor/acp-client.mjs`)
6. Serve mode integration (`src/executor/opencode-server.mjs`)
7. Server pool management (`src/pool/server-pool.mjs`, `src/executor/opencode-server-pool.mjs`)
8. Fusion router (`src/hooks/fusion-router-logic.mjs`)

### Metis Review

**Identified Gaps (addressed)**:
- Agent count discrepancy needed exact recount → Done: 13 HIGH + 10 MEDIUM + 12 LOW = 35 total
- Port 8000 origin unclear → Confirmed: source code only has 4096
- "Phase 1-5" refers to OMC phases, but user wants OMCM v1.0.0 features covered → Scoped to 8 OMCM-native v1.0.0 features
- No optional chaining constraint → Applies to any code examples in docs

---

## Work Objectives

### Core Objective

Correct all factual inaccuracies in 8 Korean docs regarding agent mappings, port numbers, hook system, and v1.0.0 feature coverage.

### Concrete Deliverables

- 8 updated files in `docs/ko/`

### Definition of Done

- [ ] All agent count references updated to match source (35 total, with correct tier counts)
- [ ] All port references corrected to 4096 (no 8000 references remain)
- [ ] Hook references match actual 4 hook files in `src/hooks/`
- [ ] v1.0.0 features mentioned in relevant docs where appropriate
- [ ] No optional chaining (`?.`) in any code examples
- [ ] Existing Korean style preserved

### Must Have

- Correct agent count (35, with tier breakdown: 13 HIGH, 10 MEDIUM, 12 LOW)
- Correct port number (4096)
- Correct hook file list (4 files in src/hooks/)
- v1.0.0 feature references in FEATURES, ARCHITECTURE, and API-REFERENCE docs

### Must NOT Have (Guardrails)

- ❌ No `docs/en/` changes
- ❌ No version bump (keep v1.0.0)
- ❌ No optional chaining (`?.`) in code examples
- ❌ No scope expansion beyond mappings/ports/hooks/phase features
- ❌ No new sections or major restructuring — corrections only
- ❌ No README.md changes

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (node --test)
- **User wants tests**: NO — automated grep verification
- **QA approach**: grep-based post-edit verification

### Automated Verification

After all edits, run:
```bash
# Verify no "29개" agent references remain
grep -rn "29개" docs/ko/
# Assert: 0 matches

# Verify no port 8000 references remain
grep -rn "8000" docs/ko/
# Assert: 0 matches (or only contextually correct ones)

# Verify 4096 is referenced where server pool is discussed
grep -rn "4096" docs/ko/
# Assert: >= 1 match

# Verify no optional chaining in code examples
grep -rnP '\?\.' docs/ko/
# Assert: 0 matches in code blocks

# Verify new agents documented
grep -rn "qa-tester-low\|researcher-high\|build-fixer-high" docs/ko/
# Assert: >= 3 matches
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Start Immediately):
└── Task 0: Build shared reference table (ground truth from source code)
             No dependencies. Creates the canonical agent/port/hook reference.

Wave 1 (After Wave 0 — ALL 8 IN PARALLEL):
├── Task 1: Update ARCHITECTURE.md
├── Task 2: Update FEATURES.md
├── Task 3: Update API-REFERENCE.md
├── Task 4: Update CONFIGURATION.md
├── Task 5: Update INSTALLATION.md
├── Task 6: Update FUSION-GUIDE.md
├── Task 7: Update SKILLS-REFERENCE.md
└── Task 8: Update TROUBLESHOOTING.md

Wave 2 (After ALL of Wave 1):
└── Task 9: Cross-doc consistency verify + final grep checks
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 0 | None | 1-8 | None |
| 1 | 0 | 9 | 2, 3, 4, 5, 6, 7, 8 |
| 2 | 0 | 9 | 1, 3, 4, 5, 6, 7, 8 |
| 3 | 0 | 9 | 1, 2, 4, 5, 6, 7, 8 |
| 4 | 0 | 9 | 1, 2, 3, 5, 6, 7, 8 |
| 5 | 0 | 9 | 1, 2, 3, 4, 6, 7, 8 |
| 6 | 0 | 9 | 1, 2, 3, 4, 5, 7, 8 |
| 7 | 0 | 9 | 1, 2, 3, 4, 5, 6, 8 |
| 8 | 0 | 9 | 1, 2, 3, 4, 5, 6, 7 |
| 9 | 1-8 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 0 | T0 | `delegate_task(category="quick", load_skills=[], run_in_background=false)` |
| 1 | T1-T8 | `delegate_task(category="writing", load_skills=[], run_in_background=true)` × 8 |
| 2 | T9 | `delegate_task(category="quick", load_skills=[], run_in_background=false)` |

---

## TODOs

- [ ] 0. **Build Shared Reference Table**

  **What to do**:
  - Read `src/orchestrator/agent-fusion-map.mjs` and count exact agents per tier
  - Read `src/pool/server-pool.mjs` and `src/executor/opencode-server-pool.mjs` for port defaults
  - Read all 4 `src/hooks/*.mjs` files for hook event types
  - Read `hooks/hooks.json` for hook definitions
  - Compile the canonical reference table (agent list, port numbers, hook list)
  - Save to `.sisyphus/evidence/ko-docs-ground-truth.md`

  **Must NOT do**:
  - Modify any source code
  - Edit any documentation files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file reading and counting
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All: No domain skill needed for reading/counting

  **Parallelization**:
  - **Can Run In Parallel**: NO (prerequisite)
  - **Parallel Group**: Wave 0 (solo)
  - **Blocks**: Tasks 1-8
  - **Blocked By**: None

  **References**:
  - `src/orchestrator/agent-fusion-map.mjs` — FUSION_MAP with all agents per tier
  - `src/pool/server-pool.mjs:24-31` — DEFAULT_CONFIG with basePort: 4096
  - `src/executor/opencode-server-pool.mjs:21` — DEFAULT_BASE_PORT = 4096
  - `src/hooks/detect-handoff.mjs:1-8` — UserPromptSubmit event
  - `src/hooks/fusion-router-logic.mjs:1-5` — PreToolUse event
  - `src/hooks/persistent-mode.mjs:1-9` — Stop event
  - `src/hooks/session-start.mjs:1-7` — SessionStart event
  - `hooks/hooks.json` — hook event definitions

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/ko-docs-ground-truth.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  grep -c "HIGH\|MEDIUM\|LOW" .sisyphus/evidence/ko-docs-ground-truth.md
  # Assert: >= 3
  ```

  **Commit**: NO

---

- [ ] 1. **Update ARCHITECTURE.md**

  **What to do**:
  - Read `docs/ko/ARCHITECTURE.md` and find all references to:
    - Agent count ("29개" or "29 agents" → correct to actual count from ground truth)
    - Port numbers (any "8000" references → "4096")
    - Hook file list (ensure all 4 `src/hooks/` files are listed correctly)
    - v1.0.0 architecture components (ensure tracking, context, balancer, parallel executor mentioned if already present)
  - Edit each incorrect reference using the Edit tool
  - Preserve existing Korean formatting, headings, and style
  - Ensure no optional chaining (`?.`) in any code examples

  **Must NOT do**:
  - Add new major sections or restructure the document
  - Change `docs/en/` files
  - Use optional chaining (`?.`) in examples
  - Expand beyond mappings/ports/hooks/phase features

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation editing with style preservation
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a UI task
    - `git-master`: Commit handled at batch level

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 0

  **References**:
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical agent/port/hook reference table
  - `src/orchestrator/agent-fusion-map.mjs:73-334` — FUSION_MAP with all agents and tiers
  - `src/pool/server-pool.mjs:24-31` — `basePort: 4096`
  - `src/executor/opencode-server-pool.mjs:21` — `DEFAULT_BASE_PORT = 4096`
  - `src/hooks/detect-handoff.mjs` — UserPromptSubmit hook
  - `src/hooks/fusion-router-logic.mjs` — PreToolUse hook
  - `src/hooks/persistent-mode.mjs` — Stop hook
  - `src/hooks/session-start.mjs` — SessionStart hook

  **Target file**: `docs/ko/ARCHITECTURE.md` (909 lines)

  **Acceptance Criteria**:
  ```bash
  grep -c "29개" docs/ko/ARCHITECTURE.md
  # Assert: 0
  grep -c "8000" docs/ko/ARCHITECTURE.md
  # Assert: 0
  grep -c "4096" docs/ko/ARCHITECTURE.md
  # Assert: >= 1
  grep -cP '\?\.' docs/ko/ARCHITECTURE.md
  # Assert: 0
  ```

  **Commit**: YES (batch with Tasks 2-8)
  - Message: `docs(ko): correct agent count, port, hooks in ARCHITECTURE.md`
  - Files: `docs/ko/ARCHITECTURE.md`

---

- [ ] 2. **Update FEATURES.md**

  **What to do**:
  - Read `docs/ko/FEATURES.md` and find all references to:
    - Agent count ("29개" → actual count)
    - Token savings percentage ("62%", "18개 에이전트" → recalculate from ground truth)
    - Tier breakdown (HIGH=11→13, LOW=8→12)
    - Agent mapping table (add 3 v0.7.0 agents: `qa-tester-low`, `researcher-high`, `build-fixer-high`)
    - Port numbers (any "8000"→"4096")
    - v1.0.0 features coverage (verify all 8 listed)
  - Add the 3 missing agents to the mapping table in their correct tier positions
  - Preserve existing Korean formatting

  **Must NOT do**:
  - Restructure the document
  - Use optional chaining
  - Expand scope

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation editing with table updates
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 0

  **References**:
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical reference
  - `src/orchestrator/agent-fusion-map.mjs:73-334` — full FUSION_MAP
  - `src/pool/server-pool.mjs:24-31` — port defaults
  - `CHANGELOG.md:21-44` — v1.0.0 feature list

  **Target file**: `docs/ko/FEATURES.md` (1,211 lines)

  **Acceptance Criteria**:
  ```bash
  grep -c "29개" docs/ko/FEATURES.md
  # Assert: 0
  grep -c "18개 에이전트" docs/ko/FEATURES.md
  # Assert: 0
  grep -c "qa-tester-low\|researcher-high\|build-fixer-high" docs/ko/FEATURES.md
  # Assert: >= 3
  grep -c "8000" docs/ko/FEATURES.md
  # Assert: 0
  ```

  **Commit**: YES (batch)
  - Message: `docs(ko): correct agent mappings, port, features in FEATURES.md`
  - Files: `docs/ko/FEATURES.md`

---

- [ ] 3. **Update API-REFERENCE.md**

  **What to do**:
  - Read `docs/ko/API-REFERENCE.md` and find:
    - Agent mapping API references (update count/table if present)
    - Port number references ("8000"→"4096")
    - Hook function signatures (ensure they match actual exports)
    - v1.0.0 API additions (tracking, context, balancer APIs)
  - Edit each incorrect reference
  - Ensure exported function signatures match actual code

  **Must NOT do**:
  - Restructure API sections
  - Use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: API documentation with signature verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: Task 0

  **References**:
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical reference
  - `src/utils/usage.mjs` — getUsageFromCache(), checkThreshold() signatures
  - `src/router/balancer.mjs` — ProviderBalancer API
  - `src/context/context-builder.mjs` — buildContext() signature
  - `src/tracking/realtime-tracker.mjs` — RealtimeTracker API
  - `src/tracking/metrics-collector.mjs` — MetricsCollector API
  - `src/orchestrator/parallel-executor.mjs` — ParallelExecutor API
  - `src/config/schema.mjs` — validateAgentMapping(), validateRoutingRules(), validateConfig()

  **Target file**: `docs/ko/API-REFERENCE.md` (1,738 lines)

  **Acceptance Criteria**:
  ```bash
  grep -c "8000" docs/ko/API-REFERENCE.md
  # Assert: 0
  grep -cP '\?\.' docs/ko/API-REFERENCE.md
  # Assert: 0
  ```

  **Commit**: YES (batch)
  - Message: `docs(ko): correct API signatures, port in API-REFERENCE.md`
  - Files: `docs/ko/API-REFERENCE.md`

---

- [ ] 4. **Update CONFIGURATION.md**

  **What to do**:
  - Read `docs/ko/CONFIGURATION.md` and find:
    - Port references (any "OMCM_BASE_PORT=8000" or "8000" → "4096")
    - Config schema references (match actual `schema.mjs`)
    - Hook configuration (hooks.json structure)
    - maxOpencodeWorkers default (verify: source says 5 in executor, 4 in pool)
  - Edit each incorrect reference

  **Must NOT do**:
  - Add config options not in source
  - Use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: Task 0

  **References**:
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical reference
  - `src/utils/config.mjs` — DEFAULT_CONFIG, config file path
  - `src/config/schema.mjs` — CONFIG_SCHEMA structure
  - `src/pool/server-pool.mjs:24-31` — pool defaults (maxServers: 4, basePort: 4096)
  - `src/executor/opencode-server-pool.mjs:21-28` — executor defaults (maxServers: 5, basePort: 4096)
  - `hooks/hooks.json` — hook event definitions

  **Target file**: `docs/ko/CONFIGURATION.md` (1,207 lines)

  **Acceptance Criteria**:
  ```bash
  grep -c "8000" docs/ko/CONFIGURATION.md
  # Assert: 0
  grep -c "4096" docs/ko/CONFIGURATION.md
  # Assert: >= 1
  ```

  **Commit**: YES (batch)
  - Message: `docs(ko): correct port, config schema in CONFIGURATION.md`
  - Files: `docs/ko/CONFIGURATION.md`

---

- [ ] 5. **Update INSTALLATION.md**

  **What to do**:
  - Read `docs/ko/INSTALLATION.md` and find:
    - Port references (any "8000"→"4096")
    - Hook references (ensure accuracy)
    - Any agent count mentions ("29"→correct)
  - Edit each incorrect reference
  - INSTALLATION.md likely has fewer changes since it focuses on setup

  **Must NOT do**:
  - Change install steps unless they reference wrong ports/paths
  - Use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Likely fewer changes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: Task 0

  **References**:
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical reference
  - `install.sh` — actual installation script
  - `package.json` — project metadata

  **Target file**: `docs/ko/INSTALLATION.md` (833 lines)

  **Acceptance Criteria**:
  ```bash
  grep -c "8000" docs/ko/INSTALLATION.md
  # Assert: 0
  ```

  **Commit**: YES (batch)
  - Message: `docs(ko): correct port references in INSTALLATION.md`
  - Files: `docs/ko/INSTALLATION.md`

---

- [ ] 6. **Update FUSION-GUIDE.md**

  **What to do**:
  - Read `docs/ko/FUSION-GUIDE.md` and find:
    - Agent count ("29"→correct), token savings ("62%"→recalculate)
    - Tier breakdown (update HIGH/MEDIUM/LOW counts)
    - Agent mapping table (add 3 v0.7.0 agents)
    - Port references ("8000"→"4096")
    - Hook references (verify fusion routing hooks)
  - This doc likely has the most agent mapping detail to update

  **Must NOT do**:
  - Restructure fusion guide sections
  - Use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Largest number of table edits expected
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: Task 0

  **References**:
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical reference
  - `src/orchestrator/agent-fusion-map.mjs` — full FUSION_MAP (35 agents)
  - `src/hooks/fusion-router-logic.mjs` — shouldRouteToOpenCode(), TOKEN_SAVING_AGENTS, CLAUDE_ONLY_AGENTS
  - `src/orchestrator/fusion-orchestrator.mjs` — fusion orchestration logic
  - `commands/hulw.md`, `commands/ulw.md`, `commands/autopilot.md` — command definitions

  **Target file**: `docs/ko/FUSION-GUIDE.md` (928 lines)

  **Acceptance Criteria**:
  ```bash
  grep -c "29개" docs/ko/FUSION-GUIDE.md
  # Assert: 0
  grep -c "8000" docs/ko/FUSION-GUIDE.md
  # Assert: 0
  grep -c "qa-tester-low\|researcher-high\|build-fixer-high" docs/ko/FUSION-GUIDE.md
  # Assert: >= 3
  ```

  **Commit**: YES (batch)
  - Message: `docs(ko): correct agent mappings, port in FUSION-GUIDE.md`
  - Files: `docs/ko/FUSION-GUIDE.md`

---

- [ ] 7. **Update SKILLS-REFERENCE.md**

  **What to do**:
  - Read `docs/ko/SKILLS-REFERENCE.md` and find:
    - Hook references (verify hooks match actual 4 files in `src/hooks/`)
    - Agent count references (if any, update to correct count)
    - Mode state files (verify STATE_FILES list matches `state-manager.mjs`)
  - Edit each incorrect reference

  **Must NOT do**:
  - Add new skill entries
  - Use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Likely fewer changes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: Task 0

  **References**:
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical reference
  - `commands/*.md` (8 files) — command definitions
  - `src/utils/state-manager.mjs` — STATE_FILES constants

  **Target file**: `docs/ko/SKILLS-REFERENCE.md` (799 lines)

  **Acceptance Criteria**:
  ```bash
  grep -c "8000" docs/ko/SKILLS-REFERENCE.md
  # Assert: 0
  ```

  **Commit**: YES (batch)
  - Message: `docs(ko): correct hook/state references in SKILLS-REFERENCE.md`
  - Files: `docs/ko/SKILLS-REFERENCE.md`

---

- [ ] 8. **Update TROUBLESHOOTING.md**

  **What to do**:
  - Read `docs/ko/TROUBLESHOOTING.md` and find:
    - Port references ("OMCM_BASE_PORT=8000"→"4096", server pool port range)
    - Hook troubleshooting (verify hook file paths match actual)
    - Agent mapping troubleshooting (update count if referenced)
    - Server pool diagnostics (verify file paths, PID file location: `~/.omcm/server-pool/server-4096.pid`)
  - Edit each incorrect reference

  **Must NOT do**:
  - Add new troubleshooting entries
  - Use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Troubleshooting needs careful path/command verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 9
  - **Blocked By**: Task 0

  **References**:
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical reference
  - `src/pool/server-pool.mjs:19-20` — POOL_STATE_FILE path (`~/.omcm/server-pool.json`)
  - `src/hooks/session-start.mjs:70` — PID file path (`~/.omcm/server-pool/server-4096.pid`)
  - `scripts/opencode-server.sh` — server management commands
  - `src/hooks/fusion-router-logic.mjs:14-17` — state file paths

  **Target file**: `docs/ko/TROUBLESHOOTING.md` (1,058 lines)

  **Acceptance Criteria**:
  ```bash
  grep -c "8000" docs/ko/TROUBLESHOOTING.md
  # Assert: 0
  grep -c "4096" docs/ko/TROUBLESHOOTING.md
  # Assert: >= 1
  ```

  **Commit**: YES (batch)
  - Message: `docs(ko): correct port, paths in TROUBLESHOOTING.md`
  - Files: `docs/ko/TROUBLESHOOTING.md`

---

- [ ] 9. **Cross-Doc Consistency Verify + Final Checks**

  **What to do**:
  - Run all verification grep commands from the Verification Strategy section
  - Verify consistent agent count across all 8 docs (same number everywhere)
  - Verify consistent port number across all 8 docs (4096 everywhere)
  - Verify no optional chaining in any doc
  - Report any remaining inconsistencies
  - If all checks pass, commit all 8 files in a single batch

  **Must NOT do**:
  - Expand scope
  - Edit docs/en/

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple grep-based verification
  - **Skills**: [`git-master`]
    - `git-master`: Needed for final batch commit

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs all Wave 1 complete)
  - **Parallel Group**: Wave 2 (solo)
  - **Blocks**: None (final)
  - **Blocked By**: Tasks 1-8

  **References**:
  - All 8 `docs/ko/*.md` files — targets of verification
  - `.sisyphus/evidence/ko-docs-ground-truth.md` — canonical reference

  **Acceptance Criteria**:
  ```bash
  # No port 8000 in any Korean doc
  grep -rn "8000" docs/ko/
  # Assert: 0 matches

  # No "29개" in any Korean doc
  grep -rn "29개" docs/ko/
  # Assert: 0 matches

  # No optional chaining
  grep -rnP '\?\.' docs/ko/
  # Assert: 0 matches

  # Port 4096 referenced
  grep -rn "4096" docs/ko/
  # Assert: >= 2 matches

  # New agents documented
  grep -rn "qa-tester-low\|researcher-high\|build-fixer-high" docs/ko/
  # Assert: >= 3 matches
  ```

  **Commit**: YES
  - Message: `docs(ko): align 8 Korean docs to source code (mappings, ports, hooks, features)`
  - Files: `docs/ko/*.md` (8 files)
  - Pre-commit: All grep checks above pass

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 9 (batch) | `docs(ko): align 8 Korean docs to source code (mappings, ports, hooks, features)` | `docs/ko/*.md` (8 files) | All grep checks pass |

> All 8 doc edits are committed in a single batch commit after Task 9 verification passes.

---

## Success Criteria

### Verification Commands
```bash
# No stale agent count
grep -rn "29개" docs/ko/
# Expected: 0 matches

# No wrong port
grep -rn "8000" docs/ko/
# Expected: 0 matches

# Correct port present
grep -rn "4096" docs/ko/
# Expected: >= 2 matches

# No optional chaining
grep -rnP '\?\.' docs/ko/
# Expected: 0 matches

# New agents documented
grep -rn "qa-tester-low\|researcher-high\|build-fixer-high" docs/ko/
# Expected: >= 3 matches
```

### Final Checklist
- [ ] All agent count references updated to match source (35 total: 13H + 10M + 12L)
- [ ] All port references corrected to 4096
- [ ] Hook references match actual `src/hooks/` files (4 files)
- [ ] v1.0.0 features mentioned in ARCHITECTURE, FEATURES, API-REFERENCE
- [ ] No optional chaining in code examples
- [ ] Existing Korean style preserved
- [ ] No `docs/en/` files modified
- [ ] No version bump applied
- [ ] Single batch commit after verification
