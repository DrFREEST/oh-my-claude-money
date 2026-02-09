# OMC v3.7.3..v3.8.13 Compatibility Audit Plan for OMCM

## TL;DR

> **Quick Summary**: Systematically analyze 16 key OMC commits (v3.7.3→v3.8.13) against 4 OMCM integration surfaces (hooks, HUD, mode-detector, orchestrator routing) to produce a BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION classification for each change.
>
> **Deliverables**:
> - Filled-in compatibility report (one row per commit × touchpoint)
> - Annotated evidence log (command outputs, file snippets)
> - Prioritized action list for OMCM maintainers
>
> **Estimated Effort**: Medium (3-4 hours of read-only analysis)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (inventory) → Task 3-6 (per-surface audits) → Task 7 (synthesis)

---

## Context

### Original Request
Produce an analysis plan comparing OMC v3.7.3..v3.8.13 against OMCM integration points (hooks, HUD, mode-detector, orchestrator routing). Read-only analysis; no code edits; no implementation recommendations yet.

### Repos
- **OMC**: `/opt/@references/oh-my-claudecode` (upstream oh-my-claudecode)
- **OMCM**: `/opt/oh-my-claude-money` (fusion orchestrator wrapping OMC+OpenCode)

### OMCM Integration Surfaces (4)

| Surface | Key OMCM Files | What it depends on from OMC |
|---------|----------------|---------------------------|
| **Hooks** | `hooks/hooks.json`, `hooks/fusion-router.mjs`, `src/hooks/fusion-router-logic.mjs`, `src/hooks/persistent-mode.mjs`, `src/hooks/detect-handoff.mjs`, `src/hooks/session-start.mjs` | Hook JSON contract (`continue`/`message`/`reason` fields), `tool_input.subagent_type` schema, Stop hook semantics |
| **HUD** | `src/hud/omcm-hud.mjs`, `src/hud/fusion-renderer.mjs`, `src/hud/mode-detector.mjs`, `src/hud/index.mjs` | State file locations (`*.json` in `.omc/state/`), HUD rendering API, analytics display contract |
| **Mode Detector** | `src/hud/mode-detector.mjs` | State file names (`ultrawork-state.json`, `ralph-state.json`, etc.), `active` key semantics, file search paths |
| **Orchestrator Routing** | `src/orchestrator/agent-fusion-map.mjs`, `src/orchestrator/task-router.mjs`, `src/orchestrator/fusion-orchestrator.mjs` | Agent name registry (32 agents), `subagent_type` string format, agent tier assignments, `tool_input` schema |

### The 16 Key Commits (Non-Release)

| # | Hash | Title | Primary OMC Area |
|---|------|-------|-----------------|
| 1 | `8b143a8` | fix(hooks): prevent pkill self-termination, tighten abort detection, remove clear-suggestions | hooks/bridge.ts, persistent-mode |
| 2 | `8dbd0e9` | fix(hooks): convert stop enforcement to soft nudge (continue:true+message) | Stop hook contract |
| 3 | `091954a` | feat(hooks): support multi-keyword skill invocation | keyword-detector, bridge |
| 4 | `c7b29de` | fix(hooks): always continue in ultrawork/ecomode, fix all stop hook gaps | Stop hook + mode state |
| 5 | `a15fc46` | fix(hooks): prevent context-limit deadlock, fix cancel false positives | keyword-detector, persistent-mode |
| 6 | `cd7ab56` | fix(hooks): simplify stop hook, add all mode support | persistent-mode templates |
| 7 | `ef2723e` | fix(hooks): use Node.js hooks by default, fix issue #205 | installer, hook format |
| 8 | `f49f819` | fix(hooks): use hookSpecificOutput.additionalContext instead of invalid message field | Hook output schema |
| 9 | `5d547c3` | feat(hooks): replace magic keyword messages with skill invocations | keyword-detector, bridge |
| 10 | `a478a87` | feat(hooks): implement adaptive /clear suggestions system | clear-suggestions module |
| 11 | `cd0bb24` | feat(hooks): add support for Claude Code's new Task system | persistent-mode, todo-continuation |
| 12 | `b43d6a8` | refactor(agents): migrate prompts to markdown, deprecate coordinator | agents/, definitions.ts |
| 13 | `a9f5d45` | fix(hud): remove duplicate tokens display and wire up top agents | HUD analytics |
| 14 | `58a9be2` | chore: remove dead .sh hook scripts, clean installer infrastructure | .sh file removal |
| 15 | `489577c` | fix(hooks): use systemMessage instead of hookSpecificOutput for PreCompact | PreCompact hook |
| 16 | `cd71b8a` | feat: make agent prompts language-agnostic | agent definitions |

---

## Work Objectives

### Core Objective
Map each of the 16 commits to OMCM touchpoints and determine: does this OMC change break, degrade, improve, or have no effect on OMCM?

### Concrete Deliverables
1. A filled **Commit × Touchpoint Matrix** (16 rows × 4 columns)
2. An **Evidence Log** with actual command outputs and file snippets
3. A **Prioritized Action List** classified as BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION

### Definition of Done
- [ ] Every commit has been inspected with `git show <hash>` and cross-referenced against OMCM files
- [ ] Every OMCM integration file has been checked for hardcoded assumptions about OMC internals
- [ ] Report template is filled with evidence, not assumptions
- [ ] Zero cells in the matrix are marked "unknown" or "TBD"

### Must Have
- Concrete git commands for evidence gathering (not vague "check the diff")
- Explicit mapping of commit → OMCM file → specific risk

### Must NOT Have (Guardrails)
- No implementation recommendations (analysis only)
- No code edits to either repo
- No assumptions without evidence — mark genuinely unknowable items as "NEEDS_RUNTIME_TEST"

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (OMCM has 361 tests via `npm test`)
- **User wants tests**: NO (this is read-only analysis)
- **QA approach**: Manual verification via git commands and file reads

### Automated Verification

Each task produces a markdown artifact. Verification = the artifact exists and contains no "TBD" cells.

```bash
# After all tasks complete:
cat .sisyphus/evidence/audit-report.md | grep -c 'TBD'
# Assert: Output is "0"
```

---

## Commit × Touchpoint Pre-Mapping (Hypothesis to Verify)

This is the **starting hypothesis**. Each task will CONFIRM or REFUTE these mappings with evidence.

| # | Commit | Hooks | HUD | Mode Detector | Orchestrator Routing |
|---|--------|-------|-----|---------------|---------------------|
| 1 | `8b143a8` pkill fix | **HIGH** - bridge.ts changed, pkill guard added | LOW | LOW | LOW |
| 2 | `8dbd0e9` stop→soft nudge | **CRITICAL** - stop now returns `continue:true` always | LOW | LOW | LOW |
| 3 | `091954a` multi-keyword | **HIGH** - keyword-detector API changed (`getAllKeywords`) | LOW | LOW | LOW |
| 4 | `c7b29de` always-continue | **CRITICAL** - stop hook semantics changed for ULW/eco | LOW | **MEDIUM** - mode state files touched | LOW |
| 5 | `a15fc46` context-limit fix | **HIGH** - persistent-mode changed | LOW | LOW | LOW |
| 6 | `cd7ab56` simplify stop | **HIGH** - persistent-mode template rewritten | LOW | LOW | LOW |
| 7 | `ef2723e` Node.js hooks default | **CRITICAL** - installer now writes .mjs hooks only | LOW | LOW | LOW |
| 8 | `f49f819` additionalContext field | **CRITICAL** - hook output schema change | LOW | LOW | LOW |
| 9 | `5d547c3` skill invocations | **HIGH** - keyword messages replaced with skill calls | LOW | LOW | LOW |
| 10 | `a478a87` /clear suggestions | MEDIUM - new PostToolUse behavior | LOW | LOW | LOW |
| 11 | `cd0bb24` Task system support | **HIGH** - persistent-mode now checks Task tool | LOW | **MEDIUM** - new state file patterns? | LOW |
| 12 | `b43d6a8` agents→markdown | LOW | LOW | LOW | **HIGH** - coordinator deprecated, agent names may change |
| 13 | `a9f5d45` HUD analytics fix | LOW | **HIGH** - HUD rendering contract changed | LOW | LOW |
| 14 | `58a9be2` remove .sh scripts | MEDIUM - OMCM may reference .sh paths | LOW | LOW | LOW |
| 15 | `489577c` PreCompact fix | LOW - OMCM doesn't use PreCompact | LOW | LOW | LOW |
| 16 | `cd71b8a` language-agnostic | LOW | LOW | LOW | **MEDIUM** - agent definition format changed |

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Build Inventory | None | Foundation - maps all integration surfaces |
| Task 2: Extract OMC Diffs | None | Raw data - all 16 commit diffs |
| Task 3: Audit Hooks Surface | Task 1, Task 2 | Needs inventory + diffs to cross-reference |
| Task 4: Audit HUD Surface | Task 1, Task 2 | Needs inventory + diffs to cross-reference |
| Task 5: Audit Mode Detector | Task 1, Task 2 | Needs inventory + diffs to cross-reference |
| Task 6: Audit Orchestrator Routing | Task 1, Task 2 | Needs inventory + diffs to cross-reference |
| Task 7: Synthesize Report | Task 3, 4, 5, 6 | Combines all surface audits into final report |

## Parallel Execution Graph

```
Wave 1 (Start immediately):
├── Task 1: Build OMCM Integration Inventory (no dependencies)
└── Task 2: Extract all 16 OMC commit diffs (no dependencies)

Wave 2 (After Wave 1 completes):
├── Task 3: Audit Hooks Surface (depends: 1, 2)
├── Task 4: Audit HUD Surface (depends: 1, 2)
├── Task 5: Audit Mode Detector Surface (depends: 1, 2)
└── Task 6: Audit Orchestrator Routing Surface (depends: 1, 2)

Wave 3 (After Wave 2 completes):
└── Task 7: Synthesize Final Report (depends: 3, 4, 5, 6)

Critical Path: Task 1 → Task 3 → Task 7
Parallel Speedup: ~50% faster than sequential (4 parallel audits in Wave 2)
```

## Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5, 6 | 2 |
| 2 | None | 3, 4, 5, 6 | 1 |
| 3 | 1, 2 | 7 | 4, 5, 6 |
| 4 | 1, 2 | 7 | 3, 5, 6 |
| 5 | 1, 2 | 7 | 3, 4, 6 |
| 6 | 1, 2 | 7 | 3, 4, 5 |
| 7 | 3, 4, 5, 6 | None | None (final) |

## Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1, 2 | `explore` (haiku) - read-only file inventory + git commands |
| 2 | 3, 4, 5, 6 | `explore-medium` (sonnet) - cross-referencing diffs against OMCM code |
| 3 | 7 | `architect-medium` (sonnet) - synthesis and classification |

---

## TODOs

- [ ] 1. Build OMCM Integration Inventory

  **What to do**:
  - For each OMCM integration surface, catalog every hardcoded reference to OMC internals:
    - Agent name strings (e.g. `'architect'`, `'executor-low'`)
    - State file paths (e.g. `ultrawork-state.json`)
    - Hook output field names (e.g. `continue`, `message`, `reason`)
    - Import paths or OMC module references
    - HUD cache file paths
  - Output: `evidence/01-omcm-inventory.md` with table format

  **Evidence gathering commands**:
  ```bash
  # In OMCM repo (/opt/oh-my-claude-money):

  # 1. All OMC agent name references
  grep -rn "oh-my-claudecode:" src/ hooks/ --include="*.mjs" --include="*.js"
  grep -rn "'architect\|'executor\|'explore\|'designer\|'researcher\|'writer\|'vision\|'critic\|'analyst\|'planner\|'qa-tester\|'build-fixer\|'tdd-guide\|'scientist\|'security-reviewer\|'code-reviewer" src/orchestrator/ src/hooks/ hooks/

  # 2. State file path references
  grep -rn "state\.json\|state-file\|STATE_FILE\|state_dir\|STATE_DIR\|\.omc/state\|\.omc/" src/hud/ hooks/

  # 3. Hook output schema usage
  grep -rn "continue\|message\|reason\|hookSpecificOutput\|additionalContext\|systemMessage" hooks/ src/hooks/ --include="*.mjs"

  # 4. HUD import/cache references
  grep -rn "omc-hud\|hud-cache\|analytics\|token-tracker" src/hud/ --include="*.mjs"
  ```

  **Must NOT do**:
  - Do not modify any files
  - Do not follow import chains into OMC itself (stay within OMCM)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple grep/read operations, no reasoning needed
  - **Skills**: [`git-master`]
    - `git-master`: File search and grep patterns

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: No code writing needed
  - `frontend-ui-ux`: Not a UI task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `hooks/hooks.json` - OMCM hook definitions, shows which hook events are used
  - `hooks/fusion-router.mjs` - Main PreToolUse hook, imports from OMC subagent_type
  - `src/hooks/fusion-router-logic.mjs:82-143` - `mapAgentToOpenCode()` contains hardcoded agent name list
  - `src/hooks/fusion-router-logic.mjs:514-541` - `TOKEN_SAVING_AGENTS` and `CLAUDE_ONLY_AGENTS` lists
  - `src/orchestrator/agent-fusion-map.mjs:73-334` - `FUSION_MAP` with all 31 agent entries
  - `src/orchestrator/task-router.mjs:21-43` - `TASK_ROUTING_PREFERENCES` agent list
  - `src/hud/mode-detector.mjs:24-93` - `STATE_PATHS` and `MODE_DEFINITIONS` with state file names

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  cat .sisyphus/evidence/01-omcm-inventory.md | wc -l
  # Assert: > 50 lines (substantial inventory)
  cat .sisyphus/evidence/01-omcm-inventory.md | grep -c 'agent\|state\|hook\|hud'
  # Assert: > 20 (covers all surface types)
  ```

  **Commit**: NO

---

- [ ] 2. Extract All 16 OMC Commit Diffs

  **What to do**:
  - For each of the 16 commits, extract the full diff and summary
  - Focus on: files changed, functions modified, API contracts altered
  - Output: `evidence/02-omc-diffs.md` with per-commit sections

  **Evidence gathering commands**:
  ```bash
  # In OMC repo (/opt/@references/oh-my-claudecode):

  # For each commit:
  for hash in 8b143a8 8dbd0e9 091954a c7b29de a15fc46 cd7ab56 ef2723e f49f819 5d547c3 a478a87 cd0bb24 b43d6a8 a9f5d45 58a9be2 489577c cd71b8a; do
    echo "========================================"
    echo "COMMIT: $hash"
    echo "========================================"
    git log -1 --format="%H%n%s%n%b" $hash
    echo "--- FILES ---"
    git diff-tree --no-commit-id --name-status -r $hash
    echo "--- DIFF (hook-relevant files only) ---"
    git show $hash -- 'src/hooks/**' 'templates/hooks/**' 'scripts/*.mjs' 'src/hud/**' 'src/agents/definitions.ts' 'src/agents/index.ts' '.claude-plugin/plugin.json' 2>/dev/null | head -300
    echo ""
  done
  ```

  **Must NOT do**:
  - Do not modify any files
  - Do not run full `git show` without filtering (too much noise)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical git command execution
  - **Skills**: [`git-master`]
    - `git-master`: Git history navigation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3, 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - OMC repo at `/opt/@references/oh-my-claudecode`
  - Tag range: `v3.7.3..v3.8.13`
  - The 16 commit hashes listed in Context section above

  **Acceptance Criteria**:
  ```bash
  cat .sisyphus/evidence/02-omc-diffs.md | grep -c "^COMMIT:"
  # Assert: 16 (all commits covered)
  ```

  **Commit**: NO

---

- [ ] 3. Audit HOOKS Surface

  **What to do**:
  Cross-reference each of the 16 commits against OMCM hook files. For each commit, determine:

  1. **Does it change the hook JSON contract?** (fields like `continue`, `message`, `reason`, `allow`)
  2. **Does it change `tool_input` / `subagent_type` schema?**
  3. **Does it change Stop hook behavior?** (OMCM has its own Stop hook at `src/hooks/persistent-mode.mjs`)
  4. **Does it change keyword detection?** (OMCM's `detect-handoff.mjs` may overlap)
  5. **Does it remove/rename files OMCM imports or references?**

  **Specific commit-to-touchpoint questions**:

  | Commit | Question to Answer | OMCM File to Check |
  |--------|-------------------|---------------------|
  | `8b143a8` | Does the pkill guard in bridge.ts affect OMCM's fusion-router.mjs (which doesn't use bridge.ts)? | `hooks/fusion-router.mjs` |
  | `8dbd0e9` | Stop now returns `continue:true` always in OMC. OMCM's `persistent-mode.mjs` also returns `continue:true`. Conflict or compatible? | `src/hooks/persistent-mode.mjs` |
  | `091954a` | `getAllKeywords()` replaces `detectKeywordsWithType()`. Does OMCM call either function? | `src/hooks/detect-handoff.mjs`, grep for `detectKeywords` |
  | `c7b29de` | Stop hook always continues in ultrawork/ecomode. OMCM's Stop hook independently checks its own state files. Do they conflict? | `src/hooks/persistent-mode.mjs` |
  | `a15fc46` | Cancel false-positive fix in keyword-detector. Does OMCM's handoff-detection overlap with cancel keywords? | `src/hooks/detect-handoff.mjs` |
  | `cd7ab56` | Simplified persistent-mode template. Does OMCM reference the OMC template or have its own? | `src/hooks/persistent-mode.mjs` (OMCM's own) |
  | `ef2723e` | OMC now installs .mjs hooks by default. OMCM has its own `hooks.json`. Does OMC installer overwrite OMCM hooks? | `hooks/hooks.json` |
  | `f49f819` | Hook output now uses `hookSpecificOutput.additionalContext` instead of `message`. Does OMCM output `message`? | All hooks/*.mjs files |
  | `5d547c3` | Keyword messages replaced with skill invocations. OMCM detects keywords separately. Any overlap? | `src/hooks/detect-handoff.mjs` |
  | `a478a87` | New /clear suggestions in PostToolUse. OMCM has its own PostToolUse (tool-tracker.mjs). Conflict? | `hooks/tool-tracker.mjs` |
  | `cd0bb24` | Persistent-mode now handles Task tool stops. Does OMCM's persistent-mode handle Task? | `src/hooks/persistent-mode.mjs` |
  | `14:58a9be2` | Removed .sh hook scripts from OMC. Does OMCM reference any OMC .sh files? | grep for `.sh` in OMCM |
  | `15:489577c` | PreCompact hook changed. Does OMCM have a PreCompact hook? | `hooks/hooks.json` |

  **Evidence gathering commands**:
  ```bash
  # In OMCM repo:
  # Q: Does OMCM import anything from OMC's hook modules?
  grep -rn "oh-my-claudecode\|omc/hooks\|omc/src" hooks/ src/hooks/ --include="*.mjs"

  # Q: Does OMCM use the `message` field in hook output?
  grep -rn '"message"' hooks/ src/hooks/ --include="*.mjs"

  # Q: Does OMCM reference any .sh scripts?
  grep -rn '\.sh"' hooks/ src/hooks/ src/orchestrator/ --include="*.mjs"

  # Q: Does OMCM have a PreCompact hook?
  cat hooks/hooks.json | grep -i "compact"

  # In OMC repo:
  # Q: What does the new hook output schema look like?
  git show f49f819 -- scripts/keyword-detector.mjs | grep -A5 "additionalContext\|hookSpecificOutput"

  # Q: What changed in the Stop hook contract?
  git diff 8dbd0e9^..8dbd0e9 -- src/hooks/persistent-mode/index.ts templates/hooks/persistent-mode.mjs
  ```

  **Output**: `evidence/03-hooks-audit.md` - per-commit row with:
  - `IMPACT`: BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION
  - `EVIDENCE`: command output or file snippet
  - `OMCM_FILES_AFFECTED`: list of OMCM files
  - `NEEDS_RUNTIME_TEST`: yes/no

  **Must NOT do**:
  - Do not assume OMC and OMCM hooks share code — they are independent
  - Do not skip any of the 16 commits

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex cross-referencing between two codebases requires careful analysis
  - **Skills**: [`git-master`]
    - `git-master`: Git diff reading and history navigation

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: No code writing, only reading
  - `frontend-ui-ux`: Not a UI task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `hooks/hooks.json` - OMCM hook definitions (5 hook events: PreToolUse, UserPromptSubmit, SessionStart, Stop, PostToolUse)
  - `hooks/fusion-router.mjs:98-229` - Main hook logic; parses stdin JSON, reads `tool_name`, `tool_input`
  - `src/hooks/persistent-mode.mjs:63-87` - OMCM's own Stop handler with `checkActiveStates()`
  - `src/hooks/detect-handoff.mjs` - OMCM's UserPromptSubmit handler
  - `src/hooks/fusion-router-logic.mjs:194-397` - `shouldRouteToOpenCode()` reads `toolInput.subagent_type`

  **OMC References (to diff against)**:
  - OMC `src/hooks/bridge.ts` - Changed in commits 1,2,3,4,5,8,9
  - OMC `src/hooks/persistent-mode/index.ts` - Changed in commits 2,4,6,11
  - OMC `src/hooks/keyword-detector/index.ts` - Changed in commits 3,5,9
  - OMC `templates/hooks/persistent-mode.mjs` - Changed in commits 2,4,5,6,11

  **Acceptance Criteria**:
  ```bash
  cat .sisyphus/evidence/03-hooks-audit.md | grep -c "IMPACT:"
  # Assert: >= 16 (one per commit)
  cat .sisyphus/evidence/03-hooks-audit.md | grep -c "NO-ACTION\|BREAKING\|IMPORTANT\|NICE-TO-HAVE"
  # Assert: >= 16 (all classified)
  ```

  **Commit**: NO

---

- [ ] 4. Audit HUD Surface

  **What to do**:
  Cross-reference each commit against OMCM HUD files. Key questions:

  1. Did OMC's HUD rendering API change? (`src/hud/index.ts`)
  2. Did analytics/token display change? (commit `a9f5d45`)
  3. Did HUD state file format change?
  4. Does OMCM HUD depend on OMC HUD cache files?

  **Specific commit focus**:

  | Commit | HUD Question | Evidence Command |
  |--------|-------------|------------------|
  | `a9f5d45` | What changed in OMC HUD analytics? Does OMCM read the same cache? | `git show a9f5d45 -- src/hud/index.ts src/hud/analytics-display.ts` |
  | `b43d6a8` | Agent name changes → does OMCM HUD display agent names? | `grep -n "agent" /opt/oh-my-claude-money/src/hud/*.mjs` |
  | All others | Any HUD state file path changes? | `git diff v3.7.3..v3.8.13 -- src/hud/state.ts src/hud/omc-state.ts` |

  **Evidence gathering commands**:
  ```bash
  # In OMC repo:
  git diff v3.7.3..v3.8.13 -- src/hud/index.ts src/hud/state.ts src/hud/omc-state.ts src/hud/analytics-display.ts

  # In OMCM repo:
  grep -rn "omc.*hud\|hud.*cache\|analytics\|token-tracker\|top-agents" src/hud/ --include="*.mjs"
  grep -rn "readFileSync\|existsSync" src/hud/ --include="*.mjs" | grep -v node_modules
  ```

  **Output**: `evidence/04-hud-audit.md`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Fewer touchpoints, mostly confirming no-action
  - **Skills**: [`git-master`]
    - `git-master`: Diff analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs` - OMCM's HUD renderer
  - `src/hud/fusion-renderer.mjs` - Fusion-specific HUD sections
  - `src/hud/mode-detector.mjs` - Mode detection (shared concern with OMC HUD)
  - `src/hud/claude-usage-api.mjs` - Usage data fetching

  **Acceptance Criteria**:
  ```bash
  cat .sisyphus/evidence/04-hud-audit.md | grep -c "IMPACT:"
  # Assert: >= 3 (at least the HUD-relevant commits)
  ```

  **Commit**: NO

---

- [ ] 5. Audit Mode Detector Surface

  **What to do**:
  The mode detector (`src/hud/mode-detector.mjs`) reads OMC state files to display active modes. Key questions:

  1. Did any state file NAMES change? (e.g. `ultrawork-state.json` → something else)
  2. Did the `active` key semantic change?
  3. Did state file LOCATIONS change? (`.omc/state/` paths)
  4. Were new modes added that OMCM doesn't know about?

  **Specific commit focus**:

  | Commit | Mode Detector Question | Evidence Command |
  |--------|----------------------|------------------|
  | `c7b29de` | Did mode state files get renamed or relocated? | `git show c7b29de -- src/hooks/persistent-mode/index.ts` + check for state file writes |
  | `cd0bb24` | New Task system — does it introduce new state files? | `git show cd0bb24 -- src/hooks/todo-continuation/index.ts` |
  | `8dbd0e9` | Stop hook softened — does it still write state? | `git show 8dbd0e9 -- templates/hooks/persistent-mode.mjs` |
  | `cd7ab56` | All-mode support — new mode names? | `git show cd7ab56 -- scripts/persistent-mode.mjs` |

  **Evidence gathering commands**:
  ```bash
  # In OMC repo - check state file patterns:
  git diff v3.7.3..v3.8.13 -- src/features/state-manager/ src/hud/omc-state.ts src/hud/state.ts

  # In OMCM repo - current mode detector state expectations:
  grep -n "files:\|activeKey:\|name:" /opt/oh-my-claude-money/src/hud/mode-detector.mjs

  # Cross-check: OMC state file write locations
  grep -rn "writeFileSync\|writeFile" /opt/@references/oh-my-claudecode/src/hooks/ --include="*.ts" | grep "state"
  ```

  **Output**: `evidence/05-mode-detector-audit.md`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused scope, few files to check
  - **Skills**: [`git-master`]
    - `git-master`: File search across versions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `src/hud/mode-detector.mjs:37-93` - MODE_DEFINITIONS array (8 modes, each with file names)
  - `src/hud/mode-detector.mjs:24-34` - STATE_PATHS (search paths for state files)
  - `src/hud/mode-detector.mjs:127-161` - `getStateSearchPaths()` with cache version scanning

  **Acceptance Criteria**:
  ```bash
  cat .sisyphus/evidence/05-mode-detector-audit.md | grep -c "IMPACT:"
  # Assert: >= 4 (at least the mode-related commits)
  ```

  **Commit**: NO

---

- [ ] 6. Audit Orchestrator Routing Surface

  **What to do**:
  The orchestrator routing maps OMC agent names to OpenCode agents/models. Key questions:

  1. Were any OMC agent names ADDED, REMOVED, or RENAMED? (critical for FUSION_MAP)
  2. Did `subagent_type` format change? (OMCM strips `oh-my-claudecode:` prefix)
  3. Was the `coordinator` agent actually removed? (OMCM maps it in fusion-router-logic.mjs:138)
  4. Were agent definitions changed in ways that affect routing decisions?

  **Specific commit focus**:

  | Commit | Routing Question | Evidence Command |
  |--------|-----------------|------------------|
  | `b43d6a8` | Coordinator deprecated — is `orchestrator` agent still valid? | `git show b43d6a8 -- src/agents/index.ts src/agents/definitions.ts` |
  | `cd71b8a` | Language-agnostic agents — any name changes? | `git show cd71b8a -- src/agents/definitions.ts` |
  | `9b11f94` | LSP/AST tools wired — any new agent types? | `git show 9b11f94 -- src/agents/definitions.ts src/agents/index.ts` |
  | `b43d6a8` | Agent prompt migration to markdown — does prompt format affect OMCM? | `git show b43d6a8 -- agents/*.md` (check frontmatter format) |

  **Evidence gathering commands**:
  ```bash
  # In OMC repo:
  # Compare agent registry before and after
  git show v3.7.3:src/agents/definitions.ts | grep "export\|const.*Agent\|type:" | head -40
  git show v3.8.13:src/agents/definitions.ts | grep "export\|const.*Agent\|type:" | head -40

  # Check if coordinator still exists
  git show v3.8.13:src/agents/index.ts | grep -i "coordinator"

  # In OMCM repo:
  # All agent name references
  grep -c "orchestrator\|coordinator" /opt/oh-my-claude-money/src/hooks/fusion-router-logic.mjs
  grep -n "orchestrator\|coordinator" /opt/oh-my-claude-money/src/orchestrator/agent-fusion-map.mjs
  ```

  **Output**: `evidence/06-orchestrator-audit.md`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate complexity, comparing agent registries across versions
  - **Skills**: [`git-master`]
    - `git-master`: Cross-version file comparison

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Reading only, not writing
  - `python-programmer`: Not a Python task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `src/orchestrator/agent-fusion-map.mjs:73-334` - FUSION_MAP (31 agent entries with tiers)
  - `src/hooks/fusion-router-logic.mjs:82-143` - `mapAgentToOpenCode()` (32 agent entries including `orchestrator`)
  - `src/orchestrator/task-router.mjs:21-59` - `TASK_ROUTING_PREFERENCES` and `OPENCODE_AGENT_MAPPING`

  **OMC References**:
  - OMC `src/agents/definitions.ts` - Agent type registry
  - OMC `src/agents/index.ts` - Agent exports
  - OMC `src/agents/coordinator.ts` → `coordinator-deprecated.ts` (renamed in b43d6a8)

  **Acceptance Criteria**:
  ```bash
  cat .sisyphus/evidence/06-orchestrator-audit.md | grep -c "IMPACT:"
  # Assert: >= 4 (at least the routing-relevant commits)
  ```

  **Commit**: NO

---

- [ ] 7. Synthesize Final Report

  **What to do**:
  Combine all 4 surface audits into a single report with:

  1. **Executive Summary** - How many BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION
  2. **Commit × Touchpoint Matrix** (filled in, replacing the hypothesis from this plan)
  3. **Prioritized Action List** - What OMCM maintainers need to do, ordered by severity
  4. **Risk Assessment** - Items marked NEEDS_RUNTIME_TEST

  **Report Template**:
  ```markdown
  # OMC v3.7.3→v3.8.13 OMCM Compatibility Report

  ## Executive Summary
  - BREAKING: N items
  - IMPORTANT: N items
  - NICE-TO-HAVE: N items
  - NO-ACTION: N items

  ## Commit × Touchpoint Matrix

  | # | Commit | Summary | Hooks | HUD | Mode Det. | Routing | Overall |
  |---|--------|---------|-------|-----|-----------|---------|---------|
  | 1 | 8b143a8 | pkill fix | [class] | [class] | [class] | [class] | [highest class] |
  | ... | ... | ... | ... | ... | ... | ... | ... |

  ## Prioritized Actions

  ### BREAKING (Must fix before OMC upgrade)
  1. [Action item with file references]

  ### IMPORTANT (Should fix soon after upgrade)
  1. [Action item with file references]

  ### NICE-TO-HAVE (Opportunistic improvements)
  1. [Action item with file references]

  ### NO-ACTION (Confirmed safe)
  1. [Commit]: [Why no action needed]

  ## Runtime Test Requirements
  - [Item needing live testing with evidence of why static analysis is insufficient]
  ```

  **Must NOT do**:
  - Do not make implementation recommendations (just identify what needs attention)
  - Do not create any code changes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Synthesis from 4 inputs into structured report
  - **Skills**: []
    - No specialized skills needed, just structured writing

  **Skills Evaluated but Omitted**:
  - `git-master`: No git operations in synthesis
  - `typescript-programmer`: No code writing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, final task)
  - **Blocks**: None (final)
  - **Blocked By**: Tasks 3, 4, 5, 6

  **References**:

  **Input References** (outputs from prior tasks):
  - `evidence/01-omcm-inventory.md` - OMCM integration inventory
  - `evidence/02-omc-diffs.md` - All 16 commit diffs
  - `evidence/03-hooks-audit.md` - Hooks surface audit
  - `evidence/04-hud-audit.md` - HUD surface audit
  - `evidence/05-mode-detector-audit.md` - Mode detector audit
  - `evidence/06-orchestrator-audit.md` - Orchestrator routing audit

  **Acceptance Criteria**:
  ```bash
  # Report exists and is complete:
  cat .sisyphus/evidence/audit-report.md | grep -c "^| "
  # Assert: >= 18 (header + 16 rows + separator)

  cat .sisyphus/evidence/audit-report.md | grep -c "TBD\|TODO\|UNKNOWN"
  # Assert: 0 (no unfilled cells)

  cat .sisyphus/evidence/audit-report.md | grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION"
  # Assert: >= 16 (every commit classified)
  ```

  **Commit**: NO

---

## Commit Strategy

No commits are made during this analysis. All outputs are evidence artifacts saved to `.sisyphus/evidence/`.

---

## Success Criteria

### Verification Commands
```bash
# All evidence files exist:
ls .sisyphus/evidence/0{1,2,3,4,5,6}-*.md .sisyphus/evidence/audit-report.md
# Expected: 7 files listed

# Final report has no gaps:
grep -c "TBD" .sisyphus/evidence/audit-report.md
# Expected: 0

# All 16 commits classified:
grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" .sisyphus/evidence/audit-report.md
# Expected: >= 16
```

### Final Checklist
- [ ] All 16 commits mapped to OMCM touchpoints with evidence
- [ ] All 4 OMCM integration surfaces audited
- [ ] Every cell in Commit × Touchpoint matrix filled (no TBD)
- [ ] Prioritized action list generated with severity classifications
- [ ] No code changes made to either repo
- [ ] No implementation recommendations (analysis only)
