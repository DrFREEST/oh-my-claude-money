# OMC v3.7.3→v3.8.13 Upgrade Audit & OMCM Impact Report

## TL;DR

> **Quick Summary**: Systematically audit all 16 key commits in OMC v3.7.3→v3.8.13, assess their impact on the 4 OMCM integration surfaces (hooks, HUD, mode-detector, orchestrator), and produce a structured report classifying each change as BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION.
>
> **Deliverables**:
> - Impact matrix: 16 commits × 4 OMCM components
> - Structured report with 4-tier classification
> - Concrete remediation tasks for BREAKING/IMPORTANT items
>
> **Estimated Effort**: Medium (4-6 hours analysis)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7

---

## Context

### Original Request

Compare OMC v3.7.3→v3.8.13 with OMCM integration. Produce a parallel task graph and structured report matching BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION categories. Include the 16 key commits and all 4 OMCM components.

### Source Repositories

| Repo | Path | Role |
|------|------|------|
| **OMC** (oh-my-claudecode) | `/opt/@references/oh-my-claudecode/` | Upstream plugin being upgraded |
| **OMCM** (oh-my-claude-money) | `/opt/oh-my-claude-money/` | Downstream fusion orchestrator |

### The 16 Key OMC Commits (v3.7.3→v3.8.13)

These are the non-release, non-cosmetic commits that may affect OMCM:

| # | Hash | Summary | Risk Area |
|---|------|---------|-----------|
| 1 | `cd0bb24` | feat(hooks): add support for Claude Code's new Task system (#198) | hooks |
| 2 | `5d547c3` | feat(hooks): replace magic keyword messages with skill invocations (#203)(#204) | hooks |
| 3 | `a478a87` | feat(hooks): implement adaptive /clear suggestions system | hooks |
| 4 | `f49f819` | fix(hooks): use hookSpecificOutput.additionalContext instead of invalid message field | hooks |
| 5 | `489577c` | fix(hooks): use systemMessage instead of hookSpecificOutput for PreCompact (#177) | hooks |
| 6 | `ef2723e` | fix(hooks): use Node.js hooks by default, fix issue #205 | hooks |
| 7 | `cd7ab56` | fix(hooks): simplify stop hook, add all mode support | hooks |
| 8 | `a15fc46` | fix(hooks): prevent context-limit deadlock, fix cancel false positives (#213) | hooks |
| 9 | `c7b29de` | fix(hooks): always continue in ultrawork/ecomode, fix all stop hook gaps (#213) | hooks |
| 10 | `8dbd0e9` | fix(hooks): convert stop enforcement to soft nudge (continue:true+message) | hooks |
| 11 | `091954a` | feat(hooks): support multi-keyword skill invocation | hooks |
| 12 | `8b143a8` | fix(hooks): prevent pkill self-termination, tighten abort detection, remove clear-suggestions (#210) | hooks |
| 13 | `58a9be2` | chore: remove dead .sh hook scripts, clean installer infrastructure | hooks/installer |
| 14 | `b43d6a8` | refactor(agents): migrate prompts to markdown, deprecate coordinator, clean up dead refs (#216) | agents |
| 15 | `fef7d18` | fix(hooks): gracefully handle missing .sh templates | hooks |
| 16 | `cd71b8a` | feat: make agent prompts language-agnostic (#176) | agents |

### The 4 OMCM Integration Surfaces

| Component | Key Files | Integration Point |
|-----------|-----------|-------------------|
| **Hooks** | `hooks/fusion-router.mjs`, `hooks/hooks.json`, `src/hooks/detect-handoff.mjs`, `src/hooks/persistent-mode.mjs`, `src/hooks/session-start.mjs` | Intercepts `PreToolUse(Task)`, `UserPromptSubmit`, `Stop`, `PostToolUse`, `SessionStart` - runs alongside OMC hooks |
| **HUD** | `src/hud/omcm-hud.mjs`, `src/hud/fusion-renderer.mjs`, `src/hud/index.mjs` | Reads OMC HUD cache, renders fusion status |
| **Mode Detector** | `src/hud/mode-detector.mjs` | Reads `.omc/state/` files written by OMC modes (ultrawork, ralph, ecomode, etc.) |
| **Orchestrator** | `src/orchestrator/fusion-orchestrator.mjs`, `src/orchestrator/agent-fusion-map.mjs`, `src/orchestrator/task-router.mjs` | Maps OMC 32-agent taxonomy to fusion model routing |

### Pass/Fail Criteria for "Breaking Change"

A change is **BREAKING** if ANY of these are true:

| Criterion | Test |
|-----------|------|
| **Hook output schema changed** | OMC hook now returns different JSON shape that OMCM hooks parse |
| **Hook lifecycle event removed/renamed** | OMC no longer fires an event OMCM listens to |
| **State file path/format changed** | `.omc/state/*.json` files that mode-detector reads are moved or restructured |
| **Agent name/taxonomy changed** | Agent IDs that `agent-fusion-map.mjs` maps are renamed/removed |
| **HUD cache format changed** | OMC HUD writes different cache structure that OMCM reads |
| **Hook execution order changed** | OMC hooks now run in an order that conflicts with OMCM hooks |
| **API contract violation** | `hookSpecificOutput` fields, `continue` semantics, or `message` field behavior changed |

A change is **IMPORTANT** (non-breaking but requires attention) if:
- New OMC feature that OMCM could/should leverage
- Deprecated API that OMCM still uses (works now, will break later)
- New hook events OMCM should register for
- Performance or reliability improvements OMCM should adopt

A change is **NICE-TO-HAVE** if:
- Cosmetic or UX improvement OMCM could optionally adopt
- New agent capabilities that don't affect routing

A change is **NO-ACTION** if:
- Internal OMC change with no OMCM surface area
- Test/doc changes

---

## Work Objectives

### Core Objective
Produce a comprehensive, evidence-based audit of all OMC changes between v3.7.3 and v3.8.13, classified by impact on OMCM integration.

### Concrete Deliverables
1. **Impact Matrix**: `.sisyphus/reports/omc-upgrade-impact-matrix.md` — 16×4 grid (commits × components)
2. **Structured Report**: `.sisyphus/reports/omc-v3.8.13-upgrade-report.md` — 4-tier classification with evidence
3. **Remediation Checklist**: Embedded in report — concrete TODO items for BREAKING/IMPORTANT changes

### Definition of Done
- [ ] All 16 commits analyzed with specific file-level evidence
- [ ] All 4 OMCM components assessed against each commit
- [ ] Every BREAKING classification has a concrete failing scenario
- [ ] Every IMPORTANT classification has a recommended action
- [ ] Report follows BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION structure
- [ ] Verification commands listed for each BREAKING item

### Must Have
- Exact git diff evidence for every classification decision
- OMCM file references showing which code is affected
- Pass/fail criteria applied consistently

### Must NOT Have (Guardrails)
- No code edits to OMCM or OMC
- No assumptions without git evidence
- No vague "might affect" without specifying HOW
- No classifications without citing the specific OMC file + OMCM file involved

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: N/A (analysis task, not code)
- **User wants tests**: NO (report generation)
- **QA approach**: Manual verification of report completeness

### Automated Verification

Each task produces markdown files. Verification = completeness check:

```bash
# Verify all 16 commits are covered in the matrix
grep -c "^|" .sisyphus/reports/omc-upgrade-impact-matrix.md
# Expected: ≥16 data rows

# Verify all 4 categories present in report
grep -c "^## BREAKING\|^## IMPORTANT\|^## NICE-TO-HAVE\|^## NO-ACTION" .sisyphus/reports/omc-v3.8.13-upgrade-report.md
# Expected: 4

# Verify every BREAKING item has a remediation
grep -A2 "BREAKING" .sisyphus/reports/omc-v3.8.13-upgrade-report.md | grep -c "Remediation"
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Evidence Collection):
├── Task 1: Collect OMC hook system diffs (all 16 commits)
├── Task 2: Snapshot OMCM integration surfaces (current state)
└── Task 3: Collect OMC agent/state/HUD diffs

Wave 2 (After Wave 1 - Cross-Reference Analysis):
├── Task 4: Hook compatibility analysis (commits × OMCM hooks)
├── Task 5: Agent/state/HUD compatibility analysis (commits × OMCM)
└── Task 6: Hook output schema & lifecycle audit

Wave 3 (After Wave 2 - Report Generation):
└── Task 7: Generate final structured report + impact matrix

Critical Path: Task 1 → Task 4 → Task 7
Parallel Speedup: ~50% faster than sequential
```

### Task Dependency Graph

| Task | Depends On | Blocks | Reason |
|------|------------|--------|--------|
| 1 | None | 4, 6 | Provides OMC hook diffs for analysis |
| 2 | None | 4, 5, 6 | Provides OMCM baseline for comparison |
| 3 | None | 5 | Provides OMC agent/state/HUD diffs |
| 4 | 1, 2 | 7 | Cross-references hook diffs against OMCM hooks |
| 5 | 2, 3 | 7 | Cross-references agent/state/HUD diffs against OMCM |
| 6 | 1, 2 | 7 | Deep-dives into hook API contract changes |
| 7 | 4, 5, 6 | None | Synthesizes all analyses into final report |

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 6 | 2, 3 |
| 2 | None | 4, 5, 6 | 1, 3 |
| 3 | None | 5 | 1, 2 |
| 4 | 1, 2 | 7 | 5, 6 |
| 5 | 2, 3 | 7 | 4, 6 |
| 6 | 1, 2 | 7 | 4, 5 |
| 7 | 4, 5, 6 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1, 2, 3 | 3× explore agents in parallel (background) |
| 2 | 4, 5, 6 | 3× architect-medium agents in parallel (background) |
| 3 | 7 | 1× writer agent (foreground) |

---

## TODOs

- [ ] 1. Collect OMC Hook System Diffs (All 16 Commits)

  **What to do**:
  - For each of the 16 commits, extract the full diff touching `hooks/`, `scripts/`, and `src/hooks/`:
    ```bash
    cd /opt/@references/oh-my-claudecode
    # Per-commit diffs for hook-related files
    for hash in cd0bb24 5d547c3 a478a87 f49f819 489577c ef2723e cd7ab56 a15fc46 c7b29de 8dbd0e9 091954a 8b143a8 58a9be2 b43d6a8 fef7d18 cd71b8a; do
      echo "=== $hash ==="
      git show $hash --stat
      git diff $hash^..$hash -- hooks/ scripts/ src/hooks/ src/installer/
    done
    ```
  - Save structured output to `.sisyphus/evidence/omc-hook-diffs.md`
  - Specifically capture:
    - `hooks/hooks.json` changes (hook lifecycle events)
    - `scripts/keyword-detector.mjs` → `scripts/skill-injector.mjs` transition
    - `scripts/persistent-mode.mjs` (Stop hook behavior)
    - `scripts/pre-tool-enforcer.mjs` (PreToolUse changes)
    - Deleted `.sh` files: `hooks/keyword-detector.sh`, `hooks/persistent-mode.sh`, `hooks/session-start.sh`, `hooks/stop-continuation.sh`

  **Must NOT do**:
  - Do not edit any files
  - Do not interpret yet — just collect raw evidence

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure git command execution, no reasoning needed
  - **Skills**: [`git-master`]
    - `git-master`: Expert at git log/diff/show commands
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code writing involved
    - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/opt/@references/oh-my-claudecode/hooks/hooks.json` — Current OMC hook definitions (v3.8.13)
  - `/opt/@references/oh-my-claudecode/scripts/` — All 15 hook script files

  **Evidence Collection Commands**:
  ```bash
  cd /opt/@references/oh-my-claudecode
  git diff v3.7.3..v3.8.13 -- hooks/
  git diff v3.7.3..v3.8.13 -- scripts/
  git diff v3.7.3..v3.8.13 -- src/hooks/
  git diff v3.7.3..v3.8.13 -- src/installer/
  git log --oneline v3.7.3..v3.8.13 -- hooks/ scripts/
  ```

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/omc-hook-diffs.md
  # Assert: file exists
  grep -c "^=== " .sisyphus/evidence/omc-hook-diffs.md
  # Assert: ≥16 (one section per commit)
  grep -c "hooks.json\|keyword-detector\|persistent-mode\|skill-injector\|pre-tool-enforcer" .sisyphus/evidence/omc-hook-diffs.md
  # Assert: ≥5 (key files mentioned)
  ```

  **Evidence to Capture:**
  - [ ] Raw diff output for all 16 commits
  - [ ] File deletion list (`.sh` scripts removed)
  - [ ] `hooks.json` before/after comparison

  **Commit**: NO

---

- [ ] 2. Snapshot OMCM Integration Surfaces (Current State)

  **What to do**:
  - Catalog the EXACT current state of all OMCM files that interface with OMC:
    ```bash
    # Hooks integration surface
    cat /opt/oh-my-claude-money/hooks/hooks.json
    cat /opt/oh-my-claude-money/hooks/fusion-router.mjs
    cat /opt/oh-my-claude-money/src/hooks/detect-handoff.mjs
    cat /opt/oh-my-claude-money/src/hooks/persistent-mode.mjs
    cat /opt/oh-my-claude-money/src/hooks/session-start.mjs

    # HUD integration surface
    cat /opt/oh-my-claude-money/src/hud/omcm-hud.mjs
    cat /opt/oh-my-claude-money/src/hud/mode-detector.mjs
    cat /opt/oh-my-claude-money/src/hud/fusion-renderer.mjs

    # Orchestrator integration surface
    cat /opt/oh-my-claude-money/src/orchestrator/agent-fusion-map.mjs
    cat /opt/oh-my-claude-money/src/orchestrator/fusion-orchestrator.mjs
    cat /opt/oh-my-claude-money/src/orchestrator/task-router.mjs
    ```
  - For each file, extract:
    1. What OMC APIs/interfaces it consumes (imports, state file reads, hook output parsing)
    2. What OMC agent names it references
    3. What OMC state file paths it reads
    4. What hook event names it registers for
  - Save to `.sisyphus/evidence/omcm-integration-surface.md`

  **Must NOT do**:
  - Do not edit any files
  - Do not assess compatibility yet — just document current state

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Code reading + structured extraction, moderate complexity
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding JS/MJS module patterns, imports, and API usage
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations needed
    - `frontend-ui-ux`: No UI analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/opt/oh-my-claude-money/hooks/hooks.json:1-87` — OMCM hook definitions showing which events are intercepted
  - `/opt/oh-my-claude-money/src/hooks/fusion-router-logic.mjs:1-40` — Core routing logic with state file paths
  - `/opt/oh-my-claude-money/src/hud/mode-detector.mjs:1-40` — State file locations and mode detection patterns

  **Key OMCM Files to Catalog** (exhaustive list):
  - `hooks/hooks.json` — Hook event registrations
  - `hooks/fusion-router.mjs` — PreToolUse(Task) interceptor
  - `hooks/bash-optimizer.mjs` — PreToolUse(Bash)
  - `hooks/read-optimizer.mjs` — PreToolUse(Read)
  - `hooks/tool-tracker.mjs` — PostToolUse tracker
  - `src/hooks/detect-handoff.mjs` — UserPromptSubmit handler
  - `src/hooks/persistent-mode.mjs` — Stop hook handler
  - `src/hooks/session-start.mjs` — SessionStart handler
  - `src/hud/mode-detector.mjs` — OMC state file reader
  - `src/hud/omcm-hud.mjs` — HUD integration
  - `src/orchestrator/agent-fusion-map.mjs` — Agent taxonomy mapping
  - `src/orchestrator/task-router.mjs` — Task routing decisions

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/omcm-integration-surface.md
  # Assert: file exists
  grep -c "hooks/fusion-router\|mode-detector\|agent-fusion-map\|persistent-mode\|detect-handoff\|session-start\|omcm-hud\|task-router" .sisyphus/evidence/omcm-integration-surface.md
  # Assert: ≥8 (all key files documented)
  grep -c "Hook Event\|State File\|Agent Name\|Import" .sisyphus/evidence/omcm-integration-surface.md
  # Assert: ≥4 (all integration categories covered)
  ```

  **Evidence to Capture:**
  - [ ] Full list of OMC APIs consumed by each OMCM file
  - [ ] Agent name references in agent-fusion-map.mjs
  - [ ] State file paths in mode-detector.mjs
  - [ ] Hook event registrations in hooks.json

  **Commit**: NO

---

- [ ] 3. Collect OMC Agent/State/HUD Diffs

  **What to do**:
  - Extract diffs for non-hook OMC changes that affect OMCM:
    ```bash
    cd /opt/@references/oh-my-claudecode
    # Agent prompt changes
    git diff v3.7.3..v3.8.13 -- agents/
    # HUD changes
    git diff v3.7.3..v3.8.13 -- src/hud/
    # State management changes
    git diff v3.7.3..v3.8.13 -- src/hooks/todo-continuation/
    # Installer changes (affects hook deployment)
    git diff v3.7.3..v3.8.13 -- src/installer/
    ```
  - Focus on commit `b43d6a8` (agent migration to markdown) — this is the highest-risk non-hook change
  - Focus on commit `cd71b8a` (language-agnostic prompts) — may affect agent name references
  - Catalog which agent `.md` files were renamed/restructured
  - Save to `.sisyphus/evidence/omc-agent-state-hud-diffs.md`

  **Must NOT do**:
  - Do not edit any files
  - Do not analyze hook changes (that's Task 1)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure git diff collection
  - **Skills**: [`git-master`]
    - `git-master`: Git diff/log expertise
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code analysis yet

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Evidence Collection Commands**:
  ```bash
  cd /opt/@references/oh-my-claudecode
  git diff v3.7.3..v3.8.13 --stat -- agents/
  git diff v3.7.3..v3.8.13 -- agents/AGENTS.md
  git show b43d6a8 --stat  # Agent migration commit
  git show cd71b8a --stat  # Language-agnostic commit
  git diff v3.7.3..v3.8.13 -- src/hud/
  git diff v3.7.3..v3.8.13 -- src/installer/
  ```

  **Key Questions to Answer**:
  - Were any agent IDs (e.g., `architect`, `executor-low`) renamed?
  - Did `src/hud/state.ts` or `src/hud/omc-state.ts` change format?
  - Did the installer change how hooks are deployed?

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/omc-agent-state-hud-diffs.md
  grep -c "b43d6a8\|cd71b8a" .sisyphus/evidence/omc-agent-state-hud-diffs.md
  # Assert: ≥2 (both key commits covered)
  grep -c "agents/" .sisyphus/evidence/omc-agent-state-hud-diffs.md
  # Assert: ≥5 (agent files documented)
  ```

  **Evidence to Capture:**
  - [ ] Agent file rename/restructure list
  - [ ] HUD state format changes (if any)
  - [ ] Installer hook deployment changes

  **Commit**: NO

---

- [ ] 4. Hook Compatibility Analysis (Commits × OMCM Hooks)

  **What to do**:
  - Cross-reference Task 1 evidence (OMC hook diffs) with Task 2 evidence (OMCM integration surface)
  - For EACH of the 16 commits, assess impact on each OMCM hook file:

  **Analysis Matrix** (fill in for each cell):

  | Commit | `fusion-router.mjs` | `detect-handoff.mjs` | `persistent-mode.mjs` | `session-start.mjs` | `hooks.json` |
  |--------|---------------------|----------------------|-----------------------|---------------------|--------------|
  | cd0bb24 (Task system) | ? | ? | ? | ? | ? |
  | 5d547c3 (keyword→skill) | ? | ? | ? | ? | ? |
  | ... | ... | ... | ... | ... | ... |

  - For each cell, determine: BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION
  - Apply the pass/fail criteria from Context section above

  **Specific High-Risk Areas to Investigate**:

  1. **`hookSpecificOutput` schema changes** (commits `f49f819`, `489577c`):
     - OMC switched from `message` to `additionalContext` field
     - Does OMCM's fusion-router return `message` in its output? If yes → BREAKING
     - Does OMCM's persistent-mode use `hookSpecificOutput`? Check format

  2. **Stop hook behavior changes** (commits `cd7ab56`, `c7b29de`, `8dbd0e9`):
     - OMC's Stop hook evolved from enforcement to soft nudge
     - OMCM's `src/hooks/persistent-mode.mjs` is a Stop hook
     - Check if OMCM still returns compatible `continue` semantics

  3. **Keyword→Skill migration** (commits `5d547c3`, `091954a`):
     - OMC replaced `keyword-detector.sh` with `skill-injector.mjs`
     - OMCM's `detect-handoff.mjs` runs on UserPromptSubmit — does it conflict?
     - Does OMCM rely on keyword detection that OMC now handles differently?

  4. **New hook events** (commit `cd0bb24` — Task system):
     - OMC added `SubagentStart`, `SubagentStop` events
     - OMCM doesn't register for these — should it? (IMPORTANT if yes)

  5. **Removed .sh scripts** (commit `58a9be2`):
     - `keyword-detector.sh`, `persistent-mode.sh`, `session-start.sh`, `stop-continuation.sh` deleted
     - OMCM never referenced these (it uses its own `.mjs` scripts) — likely NO-ACTION

  **Must NOT do**:
  - Do not edit any files
  - Do not make BREAKING calls without specific code evidence

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex cross-referencing of two codebases, needs deep reasoning
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding hook output schemas, JS module patterns
  - **Skills Evaluated but Omitted**:
    - `git-master`: Evidence already collected in Task 1
    - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Input Evidence**:
  - `.sisyphus/evidence/omc-hook-diffs.md` — from Task 1
  - `.sisyphus/evidence/omcm-integration-surface.md` — from Task 2

  **OMCM Files to Cross-Reference**:
  - `/opt/oh-my-claude-money/hooks/fusion-router.mjs` — What hook output format does it return?
  - `/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs` — How does it handle Stop event?
  - `/opt/oh-my-claude-money/src/hooks/detect-handoff.mjs` — What does it do on UserPromptSubmit?
  - `/opt/oh-my-claude-money/hooks/hooks.json` — Current event registrations

  **OMC Files to Cross-Reference**:
  - `/opt/@references/oh-my-claudecode/hooks/hooks.json` — New hook event structure
  - `/opt/@references/oh-my-claudecode/scripts/persistent-mode.mjs` — New Stop hook behavior
  - `/opt/@references/oh-my-claudecode/scripts/keyword-detector.mjs` — Keyword→skill migration
  - `/opt/@references/oh-my-claudecode/scripts/skill-injector.mjs` — New skill injection system

  **Pass/Fail Criteria Reference**:
  - See "Pass/Fail Criteria for Breaking Change" in Context section

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/hook-compatibility-analysis.md
  # Verify all 16 commits assessed
  grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" .sisyphus/evidence/hook-compatibility-analysis.md
  # Assert: ≥16 (at least one classification per commit)
  # Verify high-risk areas specifically addressed
  grep -c "hookSpecificOutput\|additionalContext\|Stop.*nudge\|keyword.*skill\|SubagentStart" .sisyphus/evidence/hook-compatibility-analysis.md
  # Assert: ≥4 (all high-risk areas covered)
  ```

  **Evidence to Capture:**
  - [ ] Classification for each commit × each OMCM hook file
  - [ ] Specific code snippets showing compatibility/incompatibility
  - [ ] Remediation steps for any BREAKING items

  **Commit**: NO

---

- [ ] 5. Agent/State/HUD Compatibility Analysis

  **What to do**:
  - Cross-reference Task 3 evidence (OMC agent/state/HUD diffs) with Task 2 evidence (OMCM integration surface)
  - Focus areas:

  **5a. Agent Taxonomy Audit**:
  - Read `/opt/oh-my-claude-money/src/orchestrator/agent-fusion-map.mjs`
  - List every OMC agent ID referenced (e.g., `architect`, `executor-low`, `explore-medium`)
  - Check commit `b43d6a8` (agent migration) — were any agent IDs changed?
  - Check commit `cd71b8a` (language-agnostic) — were agent prompt formats changed?
  - If agent IDs unchanged → NO-ACTION for agent-fusion-map
  - If prompt structure changed → assess if OMCM parses agent prompts (likely doesn't → NO-ACTION)

  **5b. State File Format Audit**:
  - Read `/opt/oh-my-claude-money/src/hud/mode-detector.mjs` completely
  - List every state file path it reads (e.g., `.omc/state/ultrawork-state.json`)
  - Compare against OMC v3.8.13 state file locations
  - Check if any state file schemas changed

  **5c. HUD Cache Compatibility**:
  - Read `/opt/oh-my-claude-money/src/hud/omcm-hud.mjs`
  - Identify what OMC HUD data it reads
  - Check OMC `src/hud/` diffs for format changes

  **Must NOT do**:
  - Do not edit any files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-codebase analysis requiring careful reasoning about compatibility
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding module exports, import chains, JSON schema patterns
  - **Skills Evaluated but Omitted**:
    - `git-master`: Evidence already collected in Task 3
    - `data-scientist`: Not statistical analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Input Evidence**:
  - `.sisyphus/evidence/omc-agent-state-hud-diffs.md` — from Task 3
  - `.sisyphus/evidence/omcm-integration-surface.md` — from Task 2

  **OMCM Files to Analyze**:
  - `/opt/oh-my-claude-money/src/orchestrator/agent-fusion-map.mjs` — Full agent ID mapping
  - `/opt/oh-my-claude-money/src/hud/mode-detector.mjs` — State file paths and formats
  - `/opt/oh-my-claude-money/src/hud/omcm-hud.mjs` — HUD cache consumption
  - `/opt/oh-my-claude-money/src/orchestrator/task-router.mjs` — Task routing decisions

  **OMC Files to Compare Against**:
  - `/opt/@references/oh-my-claudecode/agents/*.md` — Current agent definitions (v3.8.13)
  - `/opt/@references/oh-my-claudecode/src/hud/state.ts` — HUD state format
  - `/opt/@references/oh-my-claudecode/src/hud/omc-state.ts` — OMC state structure

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/agent-state-hud-analysis.md
  grep -c "agent-fusion-map\|mode-detector\|omcm-hud\|task-router" .sisyphus/evidence/agent-state-hud-analysis.md
  # Assert: ≥4 (all OMCM components covered)
  grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" .sisyphus/evidence/agent-state-hud-analysis.md
  # Assert: ≥3 (classifications present)
  ```

  **Evidence to Capture:**
  - [ ] Agent ID comparison (OMCM references vs OMC v3.8.13 definitions)
  - [ ] State file path comparison
  - [ ] HUD cache format comparison

  **Commit**: NO

---

- [ ] 6. Hook Output Schema & Lifecycle Deep Audit

  **What to do**:
  - Deep-dive into the most dangerous changes — hook API contract evolution:

  **6a. `hookSpecificOutput` Field Migration**:
  - Trace the evolution across commits:
    - `489577c`: `hookSpecificOutput` → `systemMessage` for PreCompact
    - `f49f819`: `message` field → `hookSpecificOutput.additionalContext`
    - `8dbd0e9`: Stop enforcement → soft nudge (`continue: true` + message)
  - For EACH change, check if OMCM hooks return/parse the affected fields
  - Produce a "before/after" table of hook output schemas

  **6b. Hook Lifecycle Event Audit**:
  - Compare OMC v3.7.3 `hooks.json` events vs v3.8.13
  - New events in v3.8.13: `SubagentStart`, `SubagentStop`, `Setup`, `PermissionRequest`
  - Removed events: None (check!)
  - Verify OMCM `hooks.json` only registers for events that still exist

  **6c. Hook Execution Order & Conflict Analysis**:
  - Both OMC and OMCM register for `PreToolUse`, `UserPromptSubmit`, `Stop`, `PostToolUse`, `SessionStart`
  - Check if OMC's hooks and OMCM's hooks can conflict (e.g., both trying to modify the same tool call)
  - Specific risk: OMC's `pre-tool-enforcer.mjs` on `PreToolUse(*)` vs OMCM's `fusion-router.mjs` on `PreToolUse(Task)`

  **Must NOT do**:
  - Do not edit any files

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Most critical analysis — API contract evolution requires precise reasoning
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Hook output JSON schemas, Node.js process communication patterns
  - **Skills Evaluated but Omitted**:
    - `git-master`: Evidence already in Task 1

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Input Evidence**:
  - `.sisyphus/evidence/omc-hook-diffs.md` — from Task 1
  - `.sisyphus/evidence/omcm-integration-surface.md` — from Task 2

  **Critical OMC Files**:
  - `/opt/@references/oh-my-claudecode/scripts/persistent-mode.mjs` — Stop hook, shows `continue`/`message` output format
  - `/opt/@references/oh-my-claudecode/scripts/pre-tool-enforcer.mjs` — PreToolUse hook, shows `hookSpecificOutput` format
  - `/opt/@references/oh-my-claudecode/scripts/keyword-detector.mjs` — UserPromptSubmit, shows skill invocation format
  - `/opt/@references/oh-my-claudecode/scripts/pre-compact.mjs` — PreCompact, shows `systemMessage` format

  **Critical OMCM Files**:
  - `/opt/oh-my-claude-money/hooks/fusion-router.mjs` — What JSON does it output from PreToolUse?
  - `/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs` — What JSON does it output from Stop?
  - `/opt/oh-my-claude-money/src/hooks/detect-handoff.mjs` — What JSON does it output from UserPromptSubmit?

  **Claude Code Hooks Documentation**:
  - Official hook output schema: `{ "decision": "block"|"approve"|"skip", "reason": "...", "hookSpecificOutput": {...} }`
  - `continue: true/false` semantics for Stop hooks

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/hook-schema-lifecycle-audit.md
  grep -c "hookSpecificOutput\|additionalContext\|systemMessage\|continue:" .sisyphus/evidence/hook-schema-lifecycle-audit.md
  # Assert: ≥4 (all schema fields covered)
  grep -c "before.*after\|v3.7.3.*v3.8.13\|changed.*from.*to" .sisyphus/evidence/hook-schema-lifecycle-audit.md
  # Assert: ≥2 (before/after comparisons present)
  grep -c "SubagentStart\|SubagentStop\|Setup\|PermissionRequest" .sisyphus/evidence/hook-schema-lifecycle-audit.md
  # Assert: ≥2 (new lifecycle events documented)
  ```

  **Evidence to Capture:**
  - [ ] Hook output schema before/after table
  - [ ] New lifecycle events list
  - [ ] Conflict analysis for shared hook events

  **Commit**: NO

---

- [ ] 7. Generate Final Structured Report & Impact Matrix

  **What to do**:
  - Synthesize all evidence from Tasks 4, 5, 6 into two final deliverables:

  **7a. Impact Matrix** → `.sisyphus/reports/omc-upgrade-impact-matrix.md`:

  ```markdown
  # OMC v3.7.3→v3.8.13 Impact Matrix

  | # | Commit | Summary | Hooks | HUD | Mode Detector | Orchestrator | Classification |
  |---|--------|---------|-------|-----|---------------|--------------|----------------|
  | 1 | cd0bb24 | Task system | ... | ... | ... | ... | ... |
  | 2 | 5d547c3 | keyword→skill | ... | ... | ... | ... | ... |
  | ... | ... | ... | ... | ... | ... | ... | ... |
  ```

  Each cell contains: ✅ (no impact), ⚠️ (IMPORTANT), 🔴 (BREAKING), 💡 (NICE-TO-HAVE)

  **7b. Structured Report** → `.sisyphus/reports/omc-v3.8.13-upgrade-report.md`:

  ```markdown
  # OMC v3.8.13 Upgrade Report for OMCM

  ## Executive Summary
  - X BREAKING changes requiring immediate action
  - Y IMPORTANT changes requiring attention
  - Z NICE-TO-HAVE opportunities
  - W NO-ACTION items

  ## BREAKING
  ### [Change Title]
  - **Commit**: [hash] — [message]
  - **OMC Change**: [what changed, with file:line]
  - **OMCM Impact**: [which OMCM file is affected]
  - **Evidence**: [specific code showing incompatibility]
  - **Failing Scenario**: [how this breaks at runtime]
  - **Remediation**: [exact fix needed in OMCM]
  - **Priority**: P0/P1

  ## IMPORTANT
  ### [Change Title]
  - **Commit**: [hash]
  - **What**: [description]
  - **Why It Matters**: [why OMCM should care]
  - **Recommended Action**: [what to do]
  - **Priority**: P1/P2

  ## NICE-TO-HAVE
  ### [Change Title]
  - **Commit**: [hash]
  - **Opportunity**: [what OMCM could gain]
  - **Effort**: Low/Medium/High

  ## NO-ACTION
  | Commit | Summary | Reason |
  |--------|---------|--------|
  | ... | ... | Internal OMC change, no OMCM surface |
  ```

  **Must NOT do**:
  - Do not edit any source code files
  - Do not invent findings — only report what evidence supports
  - Do not classify anything as NO-ACTION without explaining why

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Report generation with structured markdown formatting
  - **Skills**: []
    - No specialized skills needed — this is synthesis and writing
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code analysis (already done)
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, final task)
  - **Blocks**: None (final deliverable)
  - **Blocked By**: Tasks 4, 5, 6

  **References**:

  **Input Evidence (ALL required)**:
  - `.sisyphus/evidence/hook-compatibility-analysis.md` — from Task 4
  - `.sisyphus/evidence/agent-state-hud-analysis.md` — from Task 5
  - `.sisyphus/evidence/hook-schema-lifecycle-audit.md` — from Task 6

  **Report Structure Reference**:
  - BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION (as specified by user)
  - Each BREAKING must have: commit, change, impact, evidence, failing scenario, remediation
  - Each IMPORTANT must have: commit, description, why it matters, recommended action

  **Acceptance Criteria**:
  ```bash
  # Both report files exist
  test -f .sisyphus/reports/omc-upgrade-impact-matrix.md
  test -f .sisyphus/reports/omc-v3.8.13-upgrade-report.md

  # Matrix covers all 16 commits
  grep -c "^|" .sisyphus/reports/omc-upgrade-impact-matrix.md
  # Assert: ≥18 (header + 16 data rows + separator)

  # Report has all 4 sections
  grep -c "^## BREAKING\|^## IMPORTANT\|^## NICE-TO-HAVE\|^## NO-ACTION" .sisyphus/reports/omc-v3.8.13-upgrade-report.md
  # Assert: 4

  # Every BREAKING has remediation
  grep -A5 "^### " .sisyphus/reports/omc-v3.8.13-upgrade-report.md | grep -c "Remediation"
  # Assert: matches number of BREAKING items

  # Executive summary present
  grep -c "Executive Summary" .sisyphus/reports/omc-v3.8.13-upgrade-report.md
  # Assert: 1
  ```

  **Evidence to Capture:**
  - [ ] Completed impact matrix (16×4+classification)
  - [ ] Full structured report with all 4 tiers
  - [ ] Remediation checklist for BREAKING/IMPORTANT items

  **Commit**: YES (report files only)
  - Message: `docs(audit): OMC v3.7.3→v3.8.13 upgrade impact report for OMCM`
  - Files: `.sisyphus/reports/omc-upgrade-impact-matrix.md`, `.sisyphus/reports/omc-v3.8.13-upgrade-report.md`
  - Pre-commit: N/A (markdown only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-6 | No commit (evidence files) | `.sisyphus/evidence/*.md` | File existence |
| 7 | `docs(audit): OMC v3.7.3→v3.8.13 upgrade impact report for OMCM` | `.sisyphus/reports/*.md` | Section count check |

---

## Success Criteria

### Verification Commands
```bash
# All evidence files exist
ls .sisyphus/evidence/omc-hook-diffs.md
ls .sisyphus/evidence/omcm-integration-surface.md
ls .sisyphus/evidence/omc-agent-state-hud-diffs.md
ls .sisyphus/evidence/hook-compatibility-analysis.md
ls .sisyphus/evidence/agent-state-hud-analysis.md
ls .sisyphus/evidence/hook-schema-lifecycle-audit.md

# Final reports exist
ls .sisyphus/reports/omc-upgrade-impact-matrix.md
ls .sisyphus/reports/omc-v3.8.13-upgrade-report.md

# All 16 commits covered
grep -c "cd0bb24\|5d547c3\|a478a87\|f49f819\|489577c\|ef2723e\|cd7ab56\|a15fc46\|c7b29de\|8dbd0e9\|091954a\|8b143a8\|58a9be2\|b43d6a8\|fef7d18\|cd71b8a" .sisyphus/reports/omc-upgrade-impact-matrix.md
# Expected: ≥16

# All 4 report sections exist
grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" .sisyphus/reports/omc-v3.8.13-upgrade-report.md
# Expected: ≥4
```

### Final Checklist
- [ ] All 16 commits analyzed with file-level evidence
- [ ] All 4 OMCM components assessed (hooks, HUD, mode-detector, orchestrator)
- [ ] Every BREAKING item has commit + evidence + failing scenario + remediation
- [ ] Every IMPORTANT item has commit + description + recommended action
- [ ] Impact matrix is complete (16 rows × 4 component columns)
- [ ] Report follows BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION structure
- [ ] Pass/fail criteria consistently applied
- [ ] No assumptions without git evidence
