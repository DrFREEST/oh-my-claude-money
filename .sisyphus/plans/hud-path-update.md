# HUD Path Update: ~/.claude/hud → ~/.claude/plugins/omcm/src/hud

## TL;DR

> **Quick Summary**: Migrate all OMCM HUD path references from `~/.claude/hud/omcm-hud.mjs` (copy-based) to `~/.claude/plugins/omcm/src/hud/omcm-hud.mjs` (direct plugin path) across 4 files. Eliminates the copy-to-hud-dir install pattern; statusLine points directly to plugin source.
>
> **Deliverables**:
> - `install.sh`: Copy logic removed, statusLine uses plugin path
> - `uninstall.sh`: HUD file deletion removed, statusLine restore preserved
> - `commands/fusion-setup.md`: All 3 path references updated
> - `src/hud/omcm-hud-wrapper.mjs`: Header comment updated
>
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Tasks 1-4 (parallel) → Task 5 (verification)

---

## Context

### Original Request
Update OMCM HUD path usage from `~/.claude/hud/omcm-hud.mjs` to `~/.claude/plugins/omcm/src/hud/omcm-hud.mjs` across install.sh, uninstall.sh, commands/fusion-setup.md, and src/hud/omcm-hud-wrapper.mjs. Remove HUD copy logic; update statusLine command path; adjust uninstall to not delete HUD file; include `node --check` / `bash -n` verification.

### Research Findings
- **34 matches across 10 files** for old path — user explicitly scoped to 4 files only
- `install.sh:660-686`: `install_hud_files()` copies wrapper → `~/.claude/hud/`, sets statusLine
- `uninstall.sh:27,107-139`: Defines `OMCM_HUD_FILE`, deletes it, restores OMC HUD + statusLine
- `fusion-setup.md:384,420,432`: Inline heredoc creating wrapper + chmod + statusLine JSON
- `omcm-hud-wrapper.mjs:5`: Comment referencing old install path

### Metis Review
**Identified Gaps** (addressed):
- Function fate of `install_hud_files()` → Keep function, remove copy logic, retain statusLine setup
- `mkdir -p "$hud_dir"` no longer needed → Remove (OMCM no longer writes to `~/.claude/hud/`)
- Uninstall OMC HUD restore logic → Keep statusLine restore, remove only the `rm` of HUD file
- fusion-setup.md heredoc intent → Keep heredoc as manual fallback, retarget paths
- chmod in fusion-setup.md → Retarget to new path (plugin source needs +x)
- Line number drift risk → Plan uses content patterns, not bare line numbers

---

## Work Objectives

### Core Objective
Replace all references to `~/.claude/hud/omcm-hud.mjs` with `~/.claude/plugins/omcm/src/hud/omcm-hud.mjs` in 4 files, eliminating the copy-based HUD install pattern.

### Concrete Deliverables
- Modified `install.sh` — no copy, direct plugin path in statusLine
- Modified `uninstall.sh` — no HUD file deletion, statusLine restore preserved
- Modified `commands/fusion-setup.md` — 3 path references updated
- Modified `src/hud/omcm-hud-wrapper.mjs` — comment updated

### Definition of Done
- [ ] `grep -r "~/.claude/hud/omcm-hud" install.sh uninstall.sh commands/fusion-setup.md src/hud/omcm-hud-wrapper.mjs` → **0 matches**
- [ ] `grep -c "plugins/omcm/src/hud/omcm-hud" install.sh` → **≥ 1**
- [ ] `grep -c "plugins/omcm/src/hud/omcm-hud" commands/fusion-setup.md` → **≥ 1**
- [ ] `bash -n install.sh` → exit 0
- [ ] `bash -n uninstall.sh` → exit 0
- [ ] `node --check src/hud/omcm-hud-wrapper.mjs` → exit 0
- [ ] `grep -c "statusLine" uninstall.sh` → **≥ 1** (restore logic preserved)
- [ ] `grep "rm.*omcm-hud" uninstall.sh` → **0 matches** (file deletion removed)

### Must Have
- Old path `~/.claude/hud/omcm-hud.mjs` completely absent from all 4 files
- statusLine in install.sh uses `node ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs`
- uninstall.sh does NOT delete HUD file
- uninstall.sh STILL restores statusLine to OMC HUD on uninstall
- All 4 files pass syntax validation

### Must NOT Have (Guardrails)
- **NO changes to any file outside the 4 listed** (especially CHANGELOG.md, docs/ko/*, docs/en/*, scripts/*)
- **NO restructuring** of functions, heredocs, or control flow beyond the path changes
- **NO git operations** (no commits, no pushes)
- **NO running** install.sh or uninstall.sh — syntax check only
- **NO docs updates** beyond what's specified (fusion-setup.md is a command file, not a docs file)
- **NO functional changes** to omcm-hud-wrapper.mjs (only the comment on line 5)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (node, bash available)
- **User wants tests**: Manual verification (syntax checks + grep assertions)
- **Framework**: bash -n, node --check, grep

### Automated Verification (agent-executable)

```bash
# 1. Syntax validation
bash -n install.sh && echo "PASS: install.sh syntax" || echo "FAIL: install.sh syntax"
bash -n uninstall.sh && echo "PASS: uninstall.sh syntax" || echo "FAIL: uninstall.sh syntax"
node --check src/hud/omcm-hud-wrapper.mjs && echo "PASS: wrapper.mjs syntax" || echo "FAIL: wrapper.mjs syntax"

# 2. Old path absent (should return 0 matches)
OLD_COUNT=$(grep -rc "~/.claude/hud/omcm-hud" install.sh uninstall.sh commands/fusion-setup.md src/hud/omcm-hud-wrapper.mjs 2>/dev/null | awk -F: '{sum+=$2} END{print sum}')
[ "$OLD_COUNT" -eq 0 ] && echo "PASS: old path removed" || echo "FAIL: $OLD_COUNT old path references remain"

# 3. New path present where expected
grep -q "plugins/omcm/src/hud/omcm-hud" install.sh && echo "PASS: install.sh has new path" || echo "FAIL: install.sh missing new path"
grep -q "plugins/omcm/src/hud/omcm-hud" commands/fusion-setup.md && echo "PASS: fusion-setup.md has new path" || echo "FAIL: fusion-setup.md missing new path"

# 4. Uninstall does NOT delete HUD file
! grep -q "rm.*omcm-hud" uninstall.sh && echo "PASS: uninstall no longer deletes HUD" || echo "FAIL: uninstall still deletes HUD"

# 5. Uninstall STILL has statusLine restore
grep -q "statusLine" uninstall.sh && echo "PASS: statusLine restore preserved" || echo "FAIL: statusLine restore missing"
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start immediately - all independent file edits):
├── Task 1: install.sh (no dependencies)
├── Task 2: uninstall.sh (no dependencies)
├── Task 3: commands/fusion-setup.md (no dependencies)
└── Task 4: src/hud/omcm-hud-wrapper.mjs (no dependencies)

Wave 2 (After Wave 1 completes):
└── Task 5: Verification across all files

Critical Path: Any Wave 1 task → Task 5
Parallel Speedup: ~75% faster than sequential (4 tasks in parallel)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 5 | 2, 3, 4 |
| 2 | None | 5 | 1, 3, 4 |
| 3 | None | 5 | 1, 2, 4 |
| 4 | None | 5 | 1, 2, 3 |
| 5 | 1, 2, 3, 4 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|----------|-------------------|
| 1 | 1, 2, 3, 4 | `delegate_task(category="quick", load_skills=["git-master"], run_in_background=true)` × 4 |
| 2 | 5 | `delegate_task(category="quick", load_skills=["git-master"], run_in_background=false)` |

---

## TODOs

- [ ] 1. Update install.sh — Remove HUD copy logic, update statusLine path

  **What to do**:
  - In function `install_hud_files()` (starts ~line 661):
    - Remove `local hud_dir="$HOME/.claude/hud"` variable
    - Remove `mkdir -p "$hud_dir"`
    - Remove the `if [[ -f "$source_dir/src/hud/omcm-hud-wrapper.mjs" ]]; then ... fi` block (lines 671-677) that copies wrapper to `$hud_dir`
    - Update the statusLine jq command (line 682) from:
      ```
      "node ~/.claude/hud/omcm-hud.mjs"
      ```
      to:
      ```
      "node ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs"
      ```
  - Keep the function definition, the `local source_dir="$1"` param, and the statusLine setup block intact

  **Must NOT do**:
  - Do NOT remove the `install_hud_files()` function entirely
  - Do NOT change the jq structure or settings_file logic
  - Do NOT modify any other function in install.sh
  - Do NOT touch the call site at line 876

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file edit with clear, localized changes (remove ~10 lines, modify 1 string)
  - **Skills**: [`git-master`]
    - `git-master`: Needed for careful file editing awareness, though no commits in this plan

  **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not applicable — bash script
    - `frontend-ui-ux`: No UI work
    - `python-programmer`: Not applicable

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `install.sh:660-686` — Full `install_hud_files()` function; lines 668-677 are the copy block to remove, line 682 is the statusLine to update

  **Acceptance Criteria**:

  ```bash
  # Syntax check
  bash -n install.sh
  # Assert: exit code 0

  # Old path gone
  grep -c "~/.claude/hud/omcm-hud" install.sh
  # Assert: 0

  # New path present
  grep -c "plugins/omcm/src/hud/omcm-hud" install.sh
  # Assert: >= 1

  # Function still exists
  grep -c "install_hud_files" install.sh
  # Assert: >= 2 (definition + call site)

  # No cp to hud dir
  grep "cp.*hud-wrapper.*hud_dir" install.sh
  # Assert: 0 matches
  ```

  **Commit**: YES — group with Task 2, 3, 4
  - Message: `fix(hud): update HUD path to direct plugin reference`
  - Files: `install.sh`, `uninstall.sh`, `commands/fusion-setup.md`, `src/hud/omcm-hud-wrapper.mjs`
  - Pre-commit: `bash -n install.sh && bash -n uninstall.sh && node --check src/hud/omcm-hud-wrapper.mjs`

---

- [ ] 2. Update uninstall.sh — Remove HUD file deletion, preserve statusLine restore

  **What to do**:
  - Update constant `OMCM_HUD_FILE` (line 27) from `"$HOME/.claude/hud/omcm-hud.mjs"` to `"$HOME/.claude/plugins/omcm/src/hud/omcm-hud.mjs"` (or remove if no longer referenced meaningfully)
  - In section `# 3. HUD 파일 제거` (lines 107-139):
    - Remove the `if [[ -f "$OMCM_HUD_FILE" ]]; then rm "$OMCM_HUD_FILE"` block (lines 109-111) — OMCM should NOT delete its own plugin source
    - Keep the OMC HUD backup restore logic (lines 113-122) — this restores OMC's own HUD, which is still valid
    - Keep the statusLine restore logic (lines 124-136) — this reverts settings.json to OMC's HUD
    - Update the `statusLine.includes('omcm-hud')` check (line 130) if needed — this should still detect OMCM's statusLine and restore it to OMC's
    - Update the section comment from "HUD 파일 제거" to something like "HUD 설정 복원" since we're no longer removing a file
  - The `else` block at line 137-138 ("OMCM HUD 파일 없음") should be removed or rephrased since we're no longer checking for file existence

  **Must NOT do**:
  - Do NOT remove the statusLine restore logic (lines 124-136)
  - Do NOT remove the OMC HUD backup restore (lines 113-122)
  - Do NOT change any other section (1, 2, 4, 5, 6)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file edit, surgical removal of one conditional block + minor comment update
  - **Skills**: [`git-master`]
    - `git-master`: Careful diff awareness

  **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not applicable — bash script

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `uninstall.sh:27` — `OMCM_HUD_FILE` constant definition
  - `uninstall.sh:107-139` — Full HUD section: file deletion (remove), backup restore (keep), statusLine restore (keep)
  - `uninstall.sh:109-111` — The specific `rm "$OMCM_HUD_FILE"` block to remove
  - `uninstall.sh:124-136` — statusLine restore logic to PRESERVE

  **Acceptance Criteria**:

  ```bash
  # Syntax check
  bash -n uninstall.sh
  # Assert: exit code 0

  # No rm of omcm-hud file
  grep "rm.*omcm-hud" uninstall.sh
  # Assert: 0 matches

  # statusLine restore still present
  grep -c "statusLine" uninstall.sh
  # Assert: >= 1

  # OMC HUD restore still present
  grep -c "omc-hud" uninstall.sh
  # Assert: >= 1
  ```

  **Commit**: YES — grouped with Task 1, 3, 4 (see Task 1 commit details)

---

- [ ] 3. Update commands/fusion-setup.md — Update 3 path references

  **What to do**:
  - Line 384: Change `cat > ~/.claude/hud/omcm-hud.mjs << 'EOF'` to `cat > ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs << 'EOF'`
  - Line 420: Change `chmod +x ~/.claude/hud/omcm-hud.mjs` to `chmod +x ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs`
  - Line 432: Change `"command": "node ~/.claude/hud/omcm-hud.mjs"` to `"command": "node ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs"`

  **Must NOT do**:
  - Do NOT restructure the heredoc or bash script logic
  - Do NOT change any other lines in fusion-setup.md
  - Do NOT modify the surrounding markdown prose

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3 simple string replacements in a single markdown file
  - **Skills**: [`git-master`]
    - `git-master`: Precise text replacement

  **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not UI work
    - `typescript-programmer`: Markdown file

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `commands/fusion-setup.md:384` — `cat > ~/.claude/hud/omcm-hud.mjs << 'EOF'` (heredoc target path)
  - `commands/fusion-setup.md:420` — `chmod +x ~/.claude/hud/omcm-hud.mjs`
  - `commands/fusion-setup.md:432` — `"command": "node ~/.claude/hud/omcm-hud.mjs"` (statusLine JSON)

  **Acceptance Criteria**:

  ```bash
  # Old path gone
  grep -c "~/.claude/hud/omcm-hud" commands/fusion-setup.md
  # Assert: 0

  # New path present (3 occurrences)
  grep -c "plugins/omcm/src/hud/omcm-hud" commands/fusion-setup.md
  # Assert: 3
  ```

  **Commit**: YES — grouped with Task 1, 2, 4 (see Task 1 commit details)

---

- [ ] 4. Update src/hud/omcm-hud-wrapper.mjs — Fix header comment

  **What to do**:
  - Line 5: Change `* 이 파일을 ~/.claude/hud/omcm-hud.mjs 로 설치합니다.` to `* 이 파일은 ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs 경로에서 직접 실행됩니다.`
    - Note: The verb changes from "설치합니다" (install to) to "실행됩니다" (runs from) because we no longer copy this file

  **Must NOT do**:
  - Do NOT change any code logic — comment only
  - Do NOT modify any import, function, or export
  - Do NOT touch lines beyond the header comment block (lines 1-18)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line comment change in a single file
  - **Skills**: [`git-master`]
    - `git-master`: Precise text replacement

  **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Only a comment change, no code logic
    - `frontend-ui-ux`: Not UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud-wrapper.mjs:5` — Comment: `* 이 파일을 ~/.claude/hud/omcm-hud.mjs 로 설치합니다.`

  **Acceptance Criteria**:

  ```bash
  # Syntax check
  node --check src/hud/omcm-hud-wrapper.mjs
  # Assert: exit code 0

  # Old path gone from file
  grep -c "~/.claude/hud/omcm-hud" src/hud/omcm-hud-wrapper.mjs
  # Assert: 0

  # New path present
  grep -c "plugins/omcm/src/hud/omcm-hud" src/hud/omcm-hud-wrapper.mjs
  # Assert: 1
  ```

  **Commit**: YES — grouped with Task 1, 2, 3 (see Task 1 commit details)

---

- [ ] 5. Cross-file verification — Run all acceptance criteria

  **What to do**:
  - Run the full verification suite across all 4 files
  - Execute each command and capture output
  - Report pass/fail for every assertion

  **Verification script**:
  ```bash
  echo "=== SYNTAX CHECKS ==="
  bash -n install.sh && echo "PASS: install.sh" || echo "FAIL: install.sh"
  bash -n uninstall.sh && echo "PASS: uninstall.sh" || echo "FAIL: uninstall.sh"
  node --check src/hud/omcm-hud-wrapper.mjs && echo "PASS: wrapper.mjs" || echo "FAIL: wrapper.mjs"

  echo ""
  echo "=== OLD PATH REMOVAL ==="
  OLD=$(grep -rc "~/.claude/hud/omcm-hud" install.sh uninstall.sh commands/fusion-setup.md src/hud/omcm-hud-wrapper.mjs 2>/dev/null | awk -F: '{sum+=$2} END{print sum}')
  [ "$OLD" -eq 0 ] && echo "PASS: 0 old path refs" || echo "FAIL: $OLD old path refs remain"

  echo ""
  echo "=== NEW PATH PRESENCE ==="
  grep -c "plugins/omcm/src/hud/omcm-hud" install.sh | xargs -I{} echo "install.sh: {} matches"
  grep -c "plugins/omcm/src/hud/omcm-hud" commands/fusion-setup.md | xargs -I{} echo "fusion-setup.md: {} matches (expect 3)"
  grep -c "plugins/omcm/src/hud/omcm-hud" src/hud/omcm-hud-wrapper.mjs | xargs -I{} echo "wrapper.mjs: {} matches (expect 1)"

  echo ""
  echo "=== UNINSTALL SAFETY ==="
  ! grep -q "rm.*omcm-hud" uninstall.sh && echo "PASS: no rm of HUD file" || echo "FAIL: still deletes HUD"
  grep -q "statusLine" uninstall.sh && echo "PASS: statusLine restore present" || echo "FAIL: statusLine restore missing"
  grep -q "omc-hud" uninstall.sh && echo "PASS: OMC HUD restore present" || echo "FAIL: OMC HUD restore missing"

  echo ""
  echo "=== INSTALL FUNCTION ==="
  grep -c "install_hud_files" install.sh | xargs -I{} echo "Function refs: {} (expect >=2)"
  ! grep -q "cp.*hud-wrapper.*hud" install.sh && echo "PASS: no copy logic" || echo "FAIL: copy logic remains"
  ```

  **Must NOT do**:
  - Do NOT edit any files in this task
  - Do NOT run install.sh or uninstall.sh (only syntax check)
  - Do NOT make git commits

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Execute verification commands and report results
  - **Skills**: [`git-master`]
    - `git-master`: Output interpretation

  **Skills Evaluated but Omitted**:
    - All others: Pure shell verification task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3, 4

  **References**:
  - All 4 target files post-edit

  **Acceptance Criteria**:
  - All PASS, zero FAIL in verification output

  **Commit**: NO — verification only

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: install.sh | None | Independent file edit |
| Task 2: uninstall.sh | None | Independent file edit |
| Task 3: fusion-setup.md | None | Independent file edit |
| Task 4: wrapper.mjs | None | Independent file edit |
| Task 5: Verification | Tasks 1-4 | Needs all edits complete to validate |

## Parallel Execution Graph

```
Wave 1 (Start immediately):
├── Task 1: install.sh - remove copy, update statusLine
├── Task 2: uninstall.sh - remove rm, preserve restore
├── Task 3: fusion-setup.md - update 3 path refs
└── Task 4: wrapper.mjs - update comment

Wave 2 (After Wave 1):
└── Task 5: Cross-file verification

Critical Path: Any Wave 1 → Task 5
Parallel Speedup: ~75% (4 independent edits in parallel)
```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1+2+3+4 (grouped) | `fix(hud): update HUD path to direct plugin reference` | install.sh, uninstall.sh, commands/fusion-setup.md, src/hud/omcm-hud-wrapper.mjs | `bash -n install.sh && bash -n uninstall.sh && node --check src/hud/omcm-hud-wrapper.mjs` |

---

## Success Criteria

### Verification Commands
```bash
bash -n install.sh                    # Expected: exit 0
bash -n uninstall.sh                  # Expected: exit 0
node --check src/hud/omcm-hud-wrapper.mjs  # Expected: exit 0
grep -rc "~/.claude/hud/omcm-hud" install.sh uninstall.sh commands/fusion-setup.md src/hud/omcm-hud-wrapper.mjs
# Expected: all lines show :0
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All syntax checks pass
- [ ] Old path absent from all 4 files
- [ ] New path present where expected
- [ ] Uninstall does NOT delete HUD file
- [ ] Uninstall DOES restore statusLine
