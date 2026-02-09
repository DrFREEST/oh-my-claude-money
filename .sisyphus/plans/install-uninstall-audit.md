# Audit Plan: install.sh / uninstall.sh Completeness Analysis

## TL;DR

> **Quick Summary**: Comprehensive gap analysis of OMCM's `install.sh` and `uninstall.sh` to verify every installed artifact has a corresponding uninstall action, and every hook/registration declared in the plugin manifest is properly handled by both scripts.
>
> **Deliverables**:
> - Complete artifact-to-action mapping table with gap annotations
> - Hook registration coverage matrix (5 hook events)
> - Plugin registration symmetry analysis
> - Directory/file lifecycle traceability
>
> **Estimated Effort**: Medium (analysis only, no code changes)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (artifact inventory) → Task 4 (gap matrix) → Task 6 (final report)

---

## Context

### Original Request
Produce a detailed, step-by-step audit plan for OMCM `install.sh` and `uninstall.sh` completeness. The audit must explicitly cover hooks registration (all 5 events), plugin registration, directories, and produce a parallel task graph with a checklist mapping: repo artifacts → expected installed locations → install.sh actions → uninstall.sh actions → gaps.

### Research Findings

**Source files analyzed:**
- `install.sh` (883 lines) — main installer
- `uninstall.sh` (216 lines) — main uninstaller
- `hooks/hooks.json` (87 lines) — plugin hook manifest declaring **5 hook events**
- `.claude-plugin/plugin.json` — plugin metadata
- `.claude-plugin/marketplace.json` — marketplace metadata
- `scripts/install-hud.sh` (57 lines) — standalone HUD installer
- `scripts/uninstall-hud.sh` (39 lines) — standalone HUD uninstaller
- `src/hud/omcm-hud-wrapper.mjs` (78 lines) — HUD wrapper source
- `src/hooks/session-start.mjs` — SessionStart hook handler
- `src/hooks/detect-handoff.mjs` — UserPromptSubmit hook handler
- `src/hooks/persistent-mode.mjs` — Stop hook handler

---

## Preliminary Findings (Evidence-Based)

### A. Hook Registration Gap Summary

**`hooks/hooks.json` declares 5 hook events with 7 entries:**

| # | Hook Event | Matcher | Handler File | Declared in hooks.json | install.sh registers | uninstall.sh removes |
|---|-----------|---------|-------------|----------------------|---------------------|---------------------|
| 1 | `PreToolUse` | `Task` | `hooks/fusion-router.mjs` | YES | YES (line 430) | YES (grep-based removal line 53) |
| 2 | `PreToolUse` | `Read` | `hooks/read-optimizer.mjs` | YES | YES (line 434) | YES (grep-based removal) |
| 3 | `PreToolUse` | `Bash` | `hooks/bash-optimizer.mjs` | YES | YES (line 438) | YES (grep-based removal) |
| 4 | `PostToolUse` | `Read\|Edit\|Bash\|...` | `hooks/tool-tracker.mjs` | YES | YES (line 441-446) | YES (grep-based removal) |
| 5 | `UserPromptSubmit` | (any) | `src/hooks/detect-handoff.mjs` | YES | **NO — NOT REGISTERED** | **NO — NOT REMOVED** |
| 6 | `SessionStart` | (any) | `src/hooks/session-start.mjs` | YES | **NO — NOT REGISTERED** | **NO — NOT REMOVED** |
| 7 | `Stop` | (any) | `src/hooks/persistent-mode.mjs` | YES | **NO — NOT REGISTERED** | **NO — NOT REMOVED** |

**CRITICAL Finding**: `install.sh:setup_claude_hooks()` (lines 389-451) only registers `PreToolUse` and `PostToolUse` hooks. It **completely misses** `UserPromptSubmit`, `SessionStart`, and `Stop` hooks declared in `hooks/hooks.json`.

**NOTE**: These 3 missing hooks may rely on Claude Code's native plugin hook loading from `hooks/hooks.json` (if Claude reads `hooks.json` directly from the plugin directory at runtime). However, `install.sh` also writes hardcoded hooks into `~/.claude/settings.json`, which creates a dual-source inconsistency.

### B. Plugin Registration Gap Summary

| Registration Target | install.sh Action | uninstall.sh Action | Gap? |
|--------------------|-------------------|---------------------|------|
| `settings.json` → `enabledPlugins["oh-my-claude-money@local"]` | YES (line 564) | **NO — NOT REMOVED** | **GAP** |
| `~/.claude/plugins/installed_plugins.json` → `plugins["oh-my-claude-money@local"]` | YES (line 600-628) | **NO — NOT REMOVED** | **GAP** |

**CRITICAL Finding**: `uninstall.sh` never touches `enabledPlugins` or `installed_plugins.json`. After uninstall, Claude Code still thinks the plugin is installed and enabled but its files are gone → potential runtime errors.

### C. Directory/File Lifecycle Summary

| Artifact | install.sh creates | uninstall.sh removes | Gap? |
|----------|-------------------|---------------------|------|
| `~/.claude/plugins/local/oh-my-claude-money` (symlink) | YES (line 375) | YES (line 40-41) | OK |
| `~/.claude/plugins/marketplaces/omcm/` | NO (not by install.sh) | YES (line 161-163) | OK (cleanup) |
| `~/.claude/plugins/omcm/` | NO (referenced in hook paths but NOT created) | YES (line 167-169) | **WARNING** |
| `~/.claude/hud/omcm-hud.mjs` | YES (line 644) | YES (line 88-89) | OK |
| `~/.claude/hud/` directory | YES mkdir (line 551, 640) | NO (not removed — OK, shared dir) | OK |
| `~/.omcm/` | YES mkdir (line 458) | YES rm -rf (line 127-129) | OK |
| `~/.omcm/handoff/` | YES mkdir (line 458) | YES (removed with parent) | OK |
| `~/.omcm/fusion-state.json` | YES (line 462-478) | YES (removed with parent) | OK |
| `~/.omcm/fallback-state.json` | YES (line 481-496) | YES (removed with parent) | OK |
| `~/.omcm/provider-limits.json` | YES (line 499-523) | YES (removed with parent) | OK |
| `~/.claude/fusion-state.json` (legacy) | NO | YES (line 136-137) | OK (legacy cleanup) |
| `~/.claude/fallback-state.json` (legacy) | NO | YES (line 136-137) | OK (legacy cleanup) |
| `~/.claude/provider-limits.json` (legacy) | NO | YES (line 136-137) | OK (legacy cleanup) |
| `~/.config/opencode/oh-my-opencode.json` | YES (line 297) | **NO — NOT REMOVED** | **GAP** |
| `settings.json.backup.<timestamp>` | YES (line 397) | **NO — NOT CLEANED** | **WARNING** |
| `~/.local/share/oh-my-claude-money/` (cloned source) | YES (line 354) | **NO** (only script_dir offered) | **GAP** |

### D. statusLine (HUD) Registration Asymmetry

| Action | install.sh | uninstall.sh |
|--------|-----------|-------------|
| Copy HUD wrapper to `~/.claude/hud/omcm-hud.mjs` | YES (line 644) | YES removes it (line 88-89) |
| Set `settings.json.statusLine` to OMCM HUD | **NO — NOT DONE** | YES restores to OMC HUD (line 104-114) |
| `scripts/install-hud.sh` sets statusLine | YES (standalone, line 47-48) | N/A |

**WARNING**: `install.sh` copies the wrapper file but does NOT update `settings.json.statusLine`. The standalone `scripts/install-hud.sh` does update it, but `install.sh` never calls it. The uninstall.sh conversely DOES restore statusLine — asymmetric.

### E. Hook Path Inconsistency

`install.sh` uses **two different hardcoded absolute paths** for hooks:

| Source | Path Pattern | Example |
|--------|-------------|---------|
| `hooks/hooks.json` | `${CLAUDE_PLUGIN_ROOT}/hooks/...` | `node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs` |
| `install.sh` line 415 | `~/.claude/plugins/marketplaces/omcm/hooks/...` | `node ~/.claude/plugins/marketplaces/omcm/hooks/fusion-router.mjs` |
| `install.sh` line 418 | `$HOME/.claude/plugins/omcm/hooks/...` | `node $HOME/.claude/plugins/omcm/hooks/read-optimizer.mjs` |

**Finding**: `install.sh` writes hooks pointing to `~/.claude/plugins/omcm/hooks/` but this directory is **never created by install.sh**. The symlink goes to `~/.claude/plugins/local/oh-my-claude-money`, not to `~/.claude/plugins/omcm/`.

---

## Work Objectives

### Core Objective
Produce a complete audit mapping every repo artifact to its install/uninstall lifecycle, identifying all gaps.

### Concrete Deliverables
1. Artifact inventory table (repo files that get installed somewhere)
2. Hook event coverage matrix (5 events × 3 checks: declared, installed, uninstalled)
3. Plugin registration symmetry table
4. Directory lifecycle table
5. Gap classification (CRITICAL / WARNING / INFO)
6. Consolidated findings report

### Definition of Done
- [ ] Every file in `hooks/`, `src/hooks/`, `src/hud/` is traced to its installation target
- [ ] All 5 hook events from `hooks.json` are checked against both scripts
- [ ] `enabledPlugins` and `installed_plugins.json` are verified in both scripts
- [ ] All `mkdir -p` / file creation in install.sh has a matching rm in uninstall.sh (or documented exception)
- [ ] Gap severity classified

### Must Have
- All 5 hook events (SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop) audited
- Plugin registration symmetry (enabledPlugins + installed_plugins.json)
- All required directories covered
- Severity classification for every gap

### Must NOT Have (Guardrails)
- No code edits or patches proposed
- No modifications to any file
- Analysis and documentation only

---

## Verification Strategy

### Automated Verification (Agent-Executable)

All verification is grep/read-based — no code execution needed.

**Verification commands per task:**
```bash
# Verify hook event coverage in install.sh
grep -c "SessionStart\|UserPromptSubmit\|Stop\|PreToolUse\|PostToolUse" install.sh
# Expected: 2 (PreToolUse, PostToolUse only)

# Verify hook event coverage in uninstall.sh
grep -c "SessionStart\|UserPromptSubmit\|Stop\|PreToolUse\|PostToolUse" uninstall.sh
# Expected: 2 (PreToolUse, PostToolUse only)

# Verify plugin registration in install.sh
grep -c "enabledPlugins\|installed_plugins" install.sh
# Expected: >0 (present)

# Verify plugin deregistration in uninstall.sh
grep -c "enabledPlugins\|installed_plugins" uninstall.sh
# Expected: 0 (MISSING — confirms gap)

# Verify directory operations balance
grep -c "mkdir\|rm -rf\|rm " install.sh
grep -c "mkdir\|rm -rf\|rm " uninstall.sh
```

### Test Decision
- **Infrastructure exists**: N/A (analysis task)
- **User wants tests**: N/A
- **QA approach**: Automated grep verification only

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Starting point — enumerate all repo files that get installed |
| Task 2 | None | Independent — cross-check hooks.json vs both scripts |
| Task 3 | None | Independent — check enabledPlugins + installed_plugins.json |
| Task 4 | Task 1 | Needs artifact inventory to trace each file |
| Task 5 | Task 2 | Needs hook audit to compare path styles |
| Task 6 | Tasks 2, 3, 4, 5 | Synthesizes all findings into severity-classified report |

## Parallel Execution Graph

```
Wave 1 (Start immediately — independent audits):
├── Task 1: Artifact Inventory (enumerate repo → installed-location mapping)
├── Task 2: Hook Event Coverage Audit (5 events × declared/installed/uninstalled)
└── Task 3: Plugin Registration Symmetry Audit (enabledPlugins + installed_plugins.json)

Wave 2 (After Wave 1):
├── Task 4: Directory/File Lifecycle Matrix (depends: Task 1)
└── Task 5: Hook Path Consistency Check (depends: Task 2)

Wave 3 (After Wave 2):
└── Task 6: Gap Classification & Consolidated Report (depends: Tasks 2, 3, 4, 5)

Critical Path: Task 1 → Task 4 → Task 6
Parallel Speedup: ~40% faster than sequential
```

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | `delegate_task(category="quick", load_skills=[], run_in_background=true)` × 3 |
| 2 | 4, 5 | `delegate_task(category="unspecified-low", load_skills=[], run_in_background=true)` × 2 |
| 3 | 6 | `delegate_task(category="unspecified-low", load_skills=[], run_in_background=false)` × 1 |

---

## TODOs

- [ ] 1. Artifact Inventory — Enumerate All Installable Repo Files

  **What to do**:
  - Scan repo directories: `hooks/`, `src/hooks/`, `src/hud/`, `.claude-plugin/`, `scripts/`
  - For each file, determine its expected installation target path
  - Create a table: `Repo Source → Expected Target → Purpose`
  - Include: hook scripts, HUD files, plugin metadata, config templates, state files

  **Must NOT do**:
  - Do not edit any files
  - Do not propose code changes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File enumeration and table creation, straightforward search task
  - **Skills**: []
    - No specialized skills needed for file listing

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: No UI work
  - `typescript-programmer`: No code writing
  - `git-master`: No git operations
  - `python-programmer`: No code writing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `hooks/hooks.json:1-87` — Canonical list of all hook handlers and their relative paths under `${CLAUDE_PLUGIN_ROOT}`

  **File scan targets**:
  - `hooks/*.mjs` — 4 hook handler files: `fusion-router.mjs`, `read-optimizer.mjs`, `bash-optimizer.mjs`, `tool-tracker.mjs`
  - `src/hooks/*.mjs` — 3 hook handler files: `session-start.mjs`, `detect-handoff.mjs`, `persistent-mode.mjs`
  - `src/hud/*.mjs` — 3 HUD files: `omcm-hud.mjs`, `fusion-renderer.mjs`, `omcm-hud-wrapper.mjs`
  - `.claude-plugin/*.json` — 2 plugin metadata files: `plugin.json`, `marketplace.json`
  - `scripts/*.sh` — 10 utility scripts including `install-hud.sh`, `uninstall-hud.sh`

  **install.sh relevant functions** (trace copy/link/create operations):
  - `install_omcm()` lines 329-386 — symlink creation
  - `setup_claude_hooks()` lines 389-451 — hook registration
  - `register_plugin_to_claude()` lines 542-631 — plugin JSON registration
  - `setup_handoff_directory()` lines 454-526 — state file creation
  - `install_hud_files()` lines 634-650 — HUD wrapper copy

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -n "cp\|ln -s\|cat >" /opt/oh-my-claude-money/install.sh | wc -l
  # Assert: Count matches number of rows in artifact table
  ```

  - [ ] Table contains ALL files from `hooks/`, `src/hooks/`, `src/hud/`
  - [ ] Each entry has: repo path, expected target path, purpose
  - [ ] Copy/link operations in install.sh are exhaustively traced

  **Commit**: NO (analysis only)

---

- [ ] 2. Hook Event Coverage Audit — All 5 Events × 3 Checks

  **What to do**:
  - Cross-reference `hooks/hooks.json` (canonical source) against:
    - `install.sh:setup_claude_hooks()` (lines 389-451)
    - `uninstall.sh` hook removal (lines 49-82)
  - For each of the 5 hook events (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `Stop`):
    - Check: Is it declared in hooks.json? → Expected YES for all 5
    - Check: Does install.sh register it in `~/.claude/settings.json`?
    - Check: Does uninstall.sh remove it from `~/.claude/settings.json`?
  - Document each hook entry's matcher, command, timeout
  - Note the dual-source question: do these 3 missing hooks still work via Claude's native plugin hook loading from `hooks.json`?

  **Must NOT do**:
  - Do not modify any hook files or scripts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: grep-based cross-referencing of 3 files
  - **Skills**: []
    - No specialized skills needed for grep/read analysis

  **Skills Evaluated but Omitted**:
  - All skills: No overlap with grep-based analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Primary source of truth**:
  - `hooks/hooks.json:1-87` — Complete hook declaration with all 5 events, 7 hook entries

  **install.sh hook registration logic**:
  - `install.sh:389-451` (`setup_claude_hooks()`) — Uses jq to write hooks into `~/.claude/settings.json`
  - Lines 427-440: PreToolUse array with 3 matchers (Task, Read, Bash)
  - Lines 441-446: PostToolUse array with 1 matcher (Read|Edit|Bash|Grep|Glob|Task)
  - **ABSENT from install.sh**: No code for SessionStart (hooks.json line 49), UserPromptSubmit (hooks.json line 37), or Stop (hooks.json line 61)

  **uninstall.sh hook removal logic**:
  - `uninstall.sh:49-82` — Node.js inline script
  - Line 53: grep detection pattern `"fusion-router|omcm|read-optimizer|bash-optimizer|tool-tracker"`
  - Lines 61-66: `for (const event of ['PreToolUse', 'PostToolUse'])` — **only iterates 2 events**
  - Line 59: `isOmcm()` filter checks `JSON.stringify(entry).includes('omcm')` — would catch any OMCM hook IF it existed in those events
  - **KEY**: Even if SessionStart/UserPromptSubmit/Stop hooks WERE registered, uninstall.sh only loops `PreToolUse`+`PostToolUse`, so it would miss them

  **Hook handler source files** (verify existence):
  - `hooks/fusion-router.mjs` — PreToolUse Task ✅ exists
  - `hooks/read-optimizer.mjs` — PreToolUse Read ✅ exists
  - `hooks/bash-optimizer.mjs` — PreToolUse Bash ✅ exists
  - `hooks/tool-tracker.mjs` — PostToolUse tracker ✅ exists
  - `src/hooks/detect-handoff.mjs` — UserPromptSubmit ✅ exists (NOT in install.sh)
  - `src/hooks/session-start.mjs` — SessionStart ✅ exists (NOT in install.sh)
  - `src/hooks/persistent-mode.mjs` — Stop ✅ exists (NOT in install.sh)

  **Acceptance Criteria**:

  ```bash
  # Agent runs to confirm gaps:
  grep -c "SessionStart" /opt/oh-my-claude-money/install.sh
  # Assert: Output is "0" (confirms SessionStart not registered)

  grep -c "UserPromptSubmit" /opt/oh-my-claude-money/install.sh
  # Assert: Output is "0" (confirms UserPromptSubmit not registered)

  grep -c "Stop" /opt/oh-my-claude-money/install.sh
  # Assert: Output is "0" or only in comments (confirms Stop not registered)

  grep -c "SessionStart\|UserPromptSubmit" /opt/oh-my-claude-money/uninstall.sh
  # Assert: Output is "0" (confirms not in uninstall either)
  ```

  - [ ] Matrix covers all 5 hook events with YES/NO for: declared, installed, uninstalled
  - [ ] Each hook entry includes: event name, matcher, handler file, command path
  - [ ] Gaps explicitly annotated with severity
  - [ ] Note on whether Claude's native plugin system loads hooks.json directly (mitigating factor)

  **Commit**: NO (analysis only)

---

- [ ] 3. Plugin Registration Symmetry Audit

  **What to do**:
  - Verify `install.sh:register_plugin_to_claude()` (lines 542-631) registers:
    - `settings.json` → `enabledPlugins["oh-my-claude-money@local"]`
    - `installed_plugins.json` → `plugins["oh-my-claude-money@local"]`
  - Verify `uninstall.sh` removes both registrations
  - Produce table: registration target × install action × uninstall action × gap

  **Must NOT do**:
  - Do not modify any JSON files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Targeted grep across 2 files
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - All skills: No overlap with JSON/grep analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 6
  - **Blocked By**: None (can start immediately)

  **References**:

  **install.sh plugin registration**:
  - `install.sh:542-631` (`register_plugin_to_claude()`) — Two-part registration
  - Part 1 (lines 553-586): `settings.json.enabledPlugins["oh-my-claude-money@local"] = true`
  - Part 2 (lines 588-631): `installed_plugins.json.plugins["oh-my-claude-money@local"]` with scope/installPath/version/dates
  - Uses jq with sed fallback
  - Creates files from scratch if absent

  **uninstall.sh deregistration evidence**:
  - `grep -c "enabledPlugins\|installed_plugins" uninstall.sh` → **0 matches**
  - Neither `enabledPlugins` nor `installed_plugins` appears anywhere in uninstall.sh
  - Conclusion: **NEITHER registration is undone**

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -c "enabledPlugins" /opt/oh-my-claude-money/uninstall.sh
  # Assert: Output is "0" (confirms gap)

  grep -c "installed_plugins" /opt/oh-my-claude-money/uninstall.sh
  # Assert: Output is "0" (confirms gap)
  ```

  - [ ] Table shows: registration target, install.sh action, uninstall.sh action, gap status
  - [ ] Both enabledPlugins and installed_plugins.json covered
  - [ ] Gap severity: CRITICAL (orphaned plugin registration causes runtime errors)

  **Commit**: NO (analysis only)

---

- [ ] 4. Directory/File Lifecycle Matrix

  **What to do**:
  - For every `mkdir -p`, `cp`, `ln`, `cat >` in `install.sh`: find matching removal in `uninstall.sh`
  - For every `rm` in `uninstall.sh`: find matching creation in `install.sh`
  - Include ALL paths from user requirements:
    - `~/.claude/plugins/local/oh-my-claude-money`
    - `~/.claude/plugins/marketplaces/omcm`
    - `~/.claude/plugins/omcm`
    - `~/.claude/hud/omcm-hud.mjs`
    - `~/.omcm/*`
  - Also include discovered paths:
    - `~/.config/opencode/oh-my-opencode.json`
    - `~/.local/share/oh-my-claude-money/`
    - `settings.json.backup.*`

  **Must NOT do**:
  - Do not create or delete any directories

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate analysis requiring cross-file correlation of ~20 paths
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - All skills: No overlap with path-tracing analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **install.sh directory/file operations** (exhaustive line references):
  - Line 196: `mkdir -p "$HOME/.claude/plugins/local/"` (parent for symlink)
  - Line 294: `mkdir -p "$config_dir"` where `config_dir="$HOME/.config/opencode"`
  - Lines 297-323: `cat > "$omo_config"` → `~/.config/opencode/oh-my-opencode.json`
  - Lines 347-364: `git clone` or `tar` → `~/.local/share/oh-my-claude-money/`
  - Line 368: `mkdir -p "$(dirname "$plugin_dir")"` → `~/.claude/plugins/local/`
  - Line 375: `ln -sf "$source_dir" "$plugin_dir"` → `~/.claude/plugins/local/oh-my-claude-money`
  - Line 397: `cp "$settings_file" "$settings_file.backup.$(date +%s)"` → backup creation
  - Line 458: `mkdir -p "$HOME/.omcm/handoff"`
  - Lines 462-478: `cat > "$HOME/.omcm/fusion-state.json"`
  - Lines 481-496: `cat > "$HOME/.omcm/fallback-state.json"`
  - Lines 499-523: `cat > "$HOME/.omcm/provider-limits.json"`
  - Lines 550-551: `mkdir -p "$HOME/.claude/plugins"` and `mkdir -p "$HOME/.claude/hud"`
  - Line 644: `cp "$source_dir/src/hud/omcm-hud-wrapper.mjs" "$hud_dir/omcm-hud.mjs"`

  **uninstall.sh removal operations** (exhaustive line references):
  - Line 28: `OMCM_PLUGIN_LINK="$HOME/.claude/plugins/local/oh-my-claude-money"`
  - Lines 40-41: `rm "$OMCM_PLUGIN_LINK"` (symlink)
  - Lines 88-89: `rm "$OMCM_HUD_FILE"` → `~/.claude/hud/omcm-hud.mjs`
  - Lines 127-129: `rm -rf "$OMCM_DATA_DIR"` → `~/.omcm/`
  - Lines 134-144: `rm` individual legacy state files in `~/.claude/`
  - Lines 161-163: `rm -rf "$OMCM_MARKETPLACE_DIR"` → `~/.claude/plugins/marketplaces/omcm/`
  - Lines 167-169: `rm -rf "$OMCM_CACHE_DIR"` → `~/.claude/plugins/omcm/`
  - Lines 182-195: Optional source code removal via interactive prompt

  **Items NOT removed by uninstall.sh**:
  - `~/.config/opencode/oh-my-opencode.json` (created by install_omo, line 297)
  - `~/.local/share/oh-my-claude-money/` (created at line 354; only `$SCRIPT_DIR` is offered for removal)
  - `settings.json.backup.*` files (created at line 397)

  **Acceptance Criteria**:

  ```bash
  # Verify install operations count
  grep -n "mkdir\|cp \|ln -s\|cat >" /opt/oh-my-claude-money/install.sh | grep -v "^#\|echo\|log_" | wc -l
  # Assert: matches row count in table

  # Verify uninstall operations count
  grep -n "rm \|rm -rf" /opt/oh-my-claude-money/uninstall.sh | grep -v "^#\|echo" | wc -l
  # Assert: matches row count in table
  ```

  - [ ] Every mkdir/cp/ln/cat in install.sh has a corresponding row
  - [ ] Every rm in uninstall.sh has a corresponding row
  - [ ] Unmatched entries marked as gaps with severity

  **Commit**: NO (analysis only)

---

- [ ] 5. Hook Path Consistency Check

  **What to do**:
  - Compare hook command paths across three sources:
    1. `hooks/hooks.json` — uses `${CLAUDE_PLUGIN_ROOT}/hooks/...` and `${CLAUDE_PLUGIN_ROOT}/src/hooks/...`
    2. `install.sh` line 415 — uses `~/.claude/plugins/marketplaces/omcm/hooks/fusion-router.mjs`
    3. `install.sh` line 418 — uses `$HOME/.claude/plugins/omcm/hooks/...` for other hooks
  - Check if `~/.claude/plugins/omcm/` is ever created by install.sh
  - Check if the symlink at `~/.claude/plugins/local/oh-my-claude-money` is what Claude resolves as `CLAUDE_PLUGIN_ROOT`
  - Document all path mismatches

  **Must NOT do**:
  - Do not modify hook paths

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Path string comparison across 2 files
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - All skills: Simple string comparison task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2

  **References**:

  **hooks.json paths** (all use `${CLAUDE_PLUGIN_ROOT}`):
  - Line 10: `node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs`
  - Line 22: `node ${CLAUDE_PLUGIN_ROOT}/hooks/read-optimizer.mjs`
  - Line 30: `node ${CLAUDE_PLUGIN_ROOT}/hooks/bash-optimizer.mjs`
  - Line 43: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/detect-handoff.mjs`
  - Line 54: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/session-start.mjs`
  - Line 66: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/persistent-mode.mjs`
  - Line 79: `node ${CLAUDE_PLUGIN_ROOT}/hooks/tool-tracker.mjs`

  **install.sh paths** (hardcoded, two different directories):
  - Line 415: `$hook_command` = `"node ~/.claude/plugins/marketplaces/omcm/hooks/fusion-router.mjs"` (marketplace path)
  - Line 418: `$plugin_hooks_dir` = `"$HOME/.claude/plugins/omcm/hooks"` (cache path — used for read-optimizer, bash-optimizer, tool-tracker)

  **Key findings pre-identified**:
  - `~/.claude/plugins/omcm/` — **referenced but never created** by install.sh
  - install.sh uses TWO different base directories for hooks in the same function
  - hooks.json uses a single consistent `${CLAUDE_PLUGIN_ROOT}` variable

  **Acceptance Criteria**:

  ```bash
  # Check if install.sh ever creates plugins/omcm directory
  grep "plugins/omcm" /opt/oh-my-claude-money/install.sh | grep -v "marketplaces"
  # Assert: No mkdir found for this path

  # Check path inconsistency
  grep "marketplaces/omcm" /opt/oh-my-claude-money/install.sh
  # Assert: Found only for fusion-router hook command
  ```

  - [ ] Table: source file, path template, resolved path, directory exists?
  - [ ] Identify broken path references
  - [ ] Identify `mkdir` gaps for referenced directories

  **Commit**: NO (analysis only)

---

- [ ] 6. Gap Classification & Consolidated Report

  **What to do**:
  - Synthesize findings from Tasks 1-5
  - Classify each gap by severity:
    - **CRITICAL**: Broken functionality — feature won't work or uninstall leaves dangling references that cause runtime errors
    - **WARNING**: Orphaned artifacts — leftover files, missing cleanup, inconsistency that doesn't break functionality
    - **INFO**: Minor observations — stylistic, defensive-coding, best-practice suggestions
  - Produce THE deliverable: consolidated mapping table:

  ```
  Repo Artifact → Expected Location → install.sh Action → uninstall.sh Action → Gap → Severity
  ```

  - Include full hook event matrix in the report
  - Enumerate all known gaps with explanations

  **Pre-identified gaps to classify** (10 items):

  | # | Gap Description | Preliminary Severity |
  |---|----------------|---------------------|
  | 1 | 3 hook events not registered by install.sh (SessionStart, UserPromptSubmit, Stop) | CRITICAL or INFO (depends on whether Claude loads hooks.json natively) |
  | 2 | `enabledPlugins` entry not removed by uninstall.sh | CRITICAL |
  | 3 | `installed_plugins.json` entry not removed by uninstall.sh | CRITICAL |
  | 4 | `~/.config/opencode/oh-my-opencode.json` not removed by uninstall.sh | WARNING |
  | 5 | `~/.local/share/oh-my-claude-money/` not removed by uninstall.sh | WARNING |
  | 6 | `statusLine` not set by install.sh (only file copied) | WARNING |
  | 7 | `~/.claude/plugins/omcm/` referenced in hook paths but never created | CRITICAL |
  | 8 | Hook paths in install.sh use two different base directories | WARNING |
  | 9 | `settings.json.backup.*` files never cleaned by uninstall.sh | INFO |
  | 10 | uninstall.sh hook removal only iterates PreToolUse/PostToolUse (hardcoded event list) | WARNING |

  **Must NOT do**:
  - Do not propose patches or code edits
  - Do not modify any files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Synthesis and classification of pre-gathered evidence
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - All skills: Synthesis task, no specialized domain

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final, sequential)
  - **Blocks**: None (final deliverable)
  - **Blocked By**: Tasks 2, 3, 4, 5

  **References**:
  - All prior task outputs (Tasks 1-5)
  - This plan's "Preliminary Findings" section (Sections A-E above)

  **Acceptance Criteria**:

  ```bash
  # Verify report completeness by checking all required paths are mentioned
  for path in "plugins/local/oh-my-claude-money" "plugins/marketplaces/omcm" "plugins/omcm" "hud/omcm-hud.mjs" ".omcm"; do
    grep -c "$path" report.md
  done
  # Assert: All counts > 0

  # Verify all 5 hook events mentioned
  for event in "SessionStart" "PreToolUse" "PostToolUse" "UserPromptSubmit" "Stop"; do
    grep -c "$event" report.md
  done
  # Assert: All counts > 0
  ```

  - [ ] Final table has one row per artifact
  - [ ] Every gap has a severity classification
  - [ ] Hook matrix covers all 5 events
  - [ ] Report is self-contained (readable without referring to individual tasks)
  - [ ] All 10 pre-identified gaps are addressed

  **Commit**: NO (analysis only)

---

## Commit Strategy

N/A — This is an analysis-only audit. No code changes, no commits.

---

## Success Criteria

### Final Checklist
- [ ] All 5 hook events (SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop) audited
- [ ] Plugin registration (enabledPlugins, installed_plugins.json) symmetry checked
- [ ] All directories from user requirements covered:
  - [ ] `~/.claude/plugins/local/oh-my-claude-money`
  - [ ] `~/.claude/plugins/marketplaces/omcm`
  - [ ] `~/.claude/plugins/omcm`
  - [ ] `~/.claude/hud/omcm-hud.mjs`
  - [ ] `~/.omcm/*`
- [ ] Gap severity classified for every finding
- [ ] No code edits proposed (analysis only)
- [ ] Consolidated mapping table delivered
- [ ] Parallel execution graph with 3 waves documented
