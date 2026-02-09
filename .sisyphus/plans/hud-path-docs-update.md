# HUD Path Documentation Update

## TL;DR

> **Quick Summary**: Update all 6 documentation files (EN + KO) to replace the old HUD path `~/.claude/hud/omcm-hud.mjs` with the plugin-managed path `~/.claude/plugins/omcm/src/hud/omcm-hud.mjs`. Remove manual file creation/permission/deletion instructions and replace with plugin lifecycle guidance.
> 
> **Deliverables**:
> - 6 updated documentation files with correct HUD paths
> - 28 occurrences across 4 edit categories resolved
> - No more manual `cat > EOF`, `chmod +x`, or `rm` instructions for HUD
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Wave 1 (EN TROUBLESHOOTING + KO TROUBLESHOOTING) → Wave 2 (EN INSTALLATION + KO INSTALLATION) → Wave 3 (EN FUSION-GUIDE + KO FUSION-GUIDE)

---

## Context

### Original Request
Update docs to replace `~/.claude/hud/omcm-hud.mjs` with `~/.claude/plugins/omcm/src/hud/omcm-hud.mjs`. Remove file creation blocks (`cat > ... << 'EOF'`), `chmod +x` instructions, and `rm` instructions. Replace with guidance that the plugin handles these automatically.

### Research Findings
- **28 total occurrences** across 6 files confirmed via `grep`
- EN and KO files are exact mirrors (same line numbers for TROUBLESHOOTING, offset for INSTALLATION)
- 4 additional `mkdir -p ~/.claude/hud` lines must also be removed (part of the `cat > EOF` blocks)
- The `statusLine.command` JSON at line 463 (both TROUBLESHOOTING files) references the old path and must be updated

---

## Work Objectives

### Core Objective
Replace all references to the old HUD path with the new plugin-managed path, and remove manual file management instructions that are now handled by plugin installation/removal lifecycle.

### Concrete Deliverables
- `docs/en/TROUBLESHOOTING.md` — 7 edits
- `docs/en/INSTALLATION.md` — 6 edits
- `docs/en/FUSION-GUIDE.md` — 1 edit
- `docs/ko/TROUBLESHOOTING.md` — 7 edits
- `docs/ko/INSTALLATION.md` — 6 edits
- `docs/ko/FUSION-GUIDE.md` — 1 edit

### Definition of Done
- [ ] Zero occurrences of `~/.claude/hud/omcm-hud.mjs` in any docs file
- [ ] Zero occurrences of `mkdir -p ~/.claude/hud` in any docs file
- [ ] All `ls -la` commands reference new path
- [ ] All `statusLine.command` references use new path
- [ ] All `cat > ... << 'EOF'` HUD creation blocks replaced with plugin guidance
- [ ] All `chmod +x` HUD lines removed
- [ ] All `rm ... omcm-hud.mjs` lines replaced with plugin removal guidance
- [ ] Doc tone preserved (EN=English, KO=Korean)

### Must Have
- Exact path replacement: `~/.claude/hud/omcm-hud.mjs` → `~/.claude/plugins/omcm/src/hud/omcm-hud.mjs`
- Plugin lifecycle guidance in both EN and KO
- Consistent tone with surrounding documentation

### Must NOT Have (Guardrails)
- Do NOT change any code outside the specific referenced lines
- Do NOT modify `statusLine.enabled` or other settings — only the `command` path
- Do NOT add new sections or explanations beyond replacement text
- Do NOT change the bash code block fence structure (keep `\`\`\`bash ... \`\`\``)
- Do NOT translate EN text into KO or vice versa

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A (documentation-only change)
- **User wants tests**: Manual verification
- **Framework**: grep-based verification

### Verification Procedure

```bash
# Verify zero old path references remain
grep -rn "~/.claude/hud/omcm-hud" docs/

# Verify new path is present
grep -rn "~/.claude/plugins/omcm/src/hud/omcm-hud" docs/

# Verify no leftover mkdir for old dir
grep -rn "mkdir -p ~/.claude/hud" docs/

# Verify no leftover chmod for old path
grep -rn "chmod +x ~/.claude/hud" docs/
```

---

## Edit Categories Reference

### Category A: Path Replacement (`ls -la`, `cat`, `statusLine.command`)

**Old**: `~/.claude/hud/omcm-hud.mjs`
**New**: `~/.claude/plugins/omcm/src/hud/omcm-hud.mjs`

Applies to simple path references in `ls -la` commands, `cat` inspection commands, and `statusLine.command` JSON values.

### Category B: Remove File Creation Blocks (`cat > ... << 'EOF' ... EOF`)

Remove the entire `mkdir -p` + `cat > ... << 'EOF' ... EOF` code block (approx. 30 lines each) and replace with:

**EN replacement text:**
```
# HUD file is automatically installed with the OMCM plugin.
# Verify it exists:
ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

# If missing, reinstall the plugin:
# /plugin install omcm
```

**KO replacement text:**
```
# HUD 파일은 OMCM 플러그인 설치 시 자동으로 설정됩니다.
# 존재 여부 확인:
ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

# 파일이 없으면 플러그인을 재설치하세요:
# /plugin install omcm
```

### Category C: Remove `chmod +x` Lines

Delete the `chmod +x ~/.claude/hud/omcm-hud.mjs` line entirely. No replacement needed — plugin files have correct permissions by default.

### Category D: Replace `rm` Instructions

Replace `rm ~/.claude/hud/omcm-hud.mjs` with plugin removal guidance:

**EN replacement:**
```
# HUD is automatically removed when uninstalling the OMCM plugin.
# /plugin uninstall omcm
```

**KO replacement:**
```
# HUD는 OMCM 플러그인 제거 시 자동으로 삭제됩니다.
# /plugin uninstall omcm
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start immediately — largest files, most edits):
├── Task 1: docs/en/TROUBLESHOOTING.md (7 edits)
└── Task 2: docs/ko/TROUBLESHOOTING.md (7 edits)

Wave 2 (After Wave 1 — second-largest):
├── Task 3: docs/en/INSTALLATION.md (6 edits)
└── Task 4: docs/ko/INSTALLATION.md (6 edits)

Wave 3 (After Wave 2 — single edit each):
├── Task 5: docs/en/FUSION-GUIDE.md (1 edit)
└── Task 6: docs/ko/FUSION-GUIDE.md (1 edit)

Wave 4 (After Wave 3):
└── Task 7: Final verification across all files

Critical Path: Task 1 → Task 3 → Task 5 → Task 7
Parallel Speedup: ~50% (3 pairs run concurrently)
```

### Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Independent file |
| Task 2 | None | Independent file |
| Task 3 | None | Independent file |
| Task 4 | None | Independent file |
| Task 5 | None | Independent file |
| Task 6 | None | Independent file |
| Task 7 | 1-6 | Verification requires all edits complete |

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 7 | 2, 3, 4, 5, 6 |
| 2 | None | 7 | 1, 3, 4, 5, 6 |
| 3 | None | 7 | 1, 2, 4, 5, 6 |
| 4 | None | 7 | 1, 2, 3, 5, 6 |
| 5 | None | 7 | 1, 2, 3, 4, 6 |
| 6 | None | 7 | 1, 2, 3, 4, 5 |
| 7 | 1-6 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | `quick` category, no skills needed |
| 2 | 3, 4 | `quick` category, no skills needed |
| 3 | 5, 6 | `quick` category, no skills needed |
| 4 | 7 | `quick` category, no skills needed |

> Note: All 6 file-edit tasks are fully independent and CAN run in a single parallel wave. Waves are shown for logical grouping only. The executor may dispatch all 6 simultaneously.

---

## TODOs

- [ ] 1. Update `docs/en/TROUBLESHOOTING.md` (7 edits)

  **What to do**:

  **Edit 1a** — Line 413 (Category A: path replacement):
  ```
  OLD: ls -la ~/.claude/hud/omcm-hud.mjs
  NEW: ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
  ```

  **Edit 1b** — Lines 415-447 (Category B: remove creation block):
  Remove the entire block from line 415 (`# If file doesn't exist, create it`) through line 447 (`EOF`), including `mkdir -p ~/.claude/hud` (line 416) and the full `cat > ... << 'EOF' ... EOF` code block (lines 417-447). Replace with:
  ```bash
  # HUD file is automatically installed with the OMCM plugin.
  # Verify it exists:
  ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

  # If missing, reinstall the plugin:
  # /plugin install omcm
  ```

  **Edit 1c** — Line 449 (Category C: remove chmod):
  Delete the line `chmod +x ~/.claude/hud/omcm-hud.mjs` entirely.

  **Edit 1d** — Line 463 (Category A: statusLine command path):
  ```
  OLD: "command": "node ~/.claude/hud/omcm-hud.mjs"
  NEW: "command": "node ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs"
  ```

  **Edit 1e** — Line 509 (Category C: remove chmod):
  Delete the line `chmod +x ~/.claude/hud/omcm-hud.mjs` and its comment `# Step 1: Check HUD file permissions`.

  **Edit 1f** — Line 512 (Category D: replace rm):
  Replace `rm ~/.claude/hud/omcm-hud.mjs` and surrounding regeneration instructions (lines 511-513) with:
  ```bash
  # HUD is automatically managed by the OMCM plugin.
  # To regenerate, reinstall: /plugin install omcm
  ```

  **Edit 1g** — Line 989 (Category D: replace rm):
  Replace `rm ~/.claude/hud/omcm-hud.mjs` with:
  ```bash
  # HUD is automatically removed when uninstalling the OMCM plugin.
  # /plugin uninstall omcm
  ```

  **Must NOT do**:
  - Do not change surrounding English prose or headings
  - Do not modify the `statusLine.enabled` value
  - Do not remove the `settings.json` check section (lines 452-467), only update the path within it

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file text replacements, no logic required
  - **Skills**: [`git-master`]
    - `git-master`: Needed for atomic commit after edits
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code logic involved
    - `frontend-ui-ux`: Not UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `docs/en/TROUBLESHOOTING.md:409-467` — HUD troubleshooting section with file check + creation block + settings.json
  - `docs/en/TROUBLESHOOTING.md:505-518` — "HUD Showing Stale Data" solution block
  - `docs/en/TROUBLESHOOTING.md:985-993` — Uninstallation section with `rm` commands

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -n "~/.claude/hud/omcm-hud" docs/en/TROUBLESHOOTING.md
  # Assert: No output (zero matches)

  grep -n "~/.claude/plugins/omcm/src/hud/omcm-hud" docs/en/TROUBLESHOOTING.md
  # Assert: Multiple matches at updated lines

  grep -n "chmod +x ~/.claude/hud" docs/en/TROUBLESHOOTING.md
  # Assert: No output (zero matches)

  grep -n "mkdir -p ~/.claude/hud" docs/en/TROUBLESHOOTING.md
  # Assert: No output (zero matches)
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `docs: update HUD path references in TROUBLESHOOTING (en+ko)`
  - Files: `docs/en/TROUBLESHOOTING.md`, `docs/ko/TROUBLESHOOTING.md`
  - Pre-commit: `grep -rn "~/.claude/hud/omcm-hud" docs/en/TROUBLESHOOTING.md docs/ko/TROUBLESHOOTING.md` → no output

---

- [ ] 2. Update `docs/ko/TROUBLESHOOTING.md` (7 edits)

  **What to do**:

  **Edit 2a** — Line 413 (Category A: path replacement):
  ```
  OLD: ls -la ~/.claude/hud/omcm-hud.mjs
  NEW: ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
  ```

  **Edit 2b** — Lines 415-447 (Category B: remove creation block):
  Remove the entire block from line 415 (`# 파일이 없으면 생성`) through line 447 (`EOF`), including `mkdir -p ~/.claude/hud` (line 416) and the full `cat > ... << 'EOF' ... EOF` code block (lines 417-447). Replace with:
  ```bash
  # HUD 파일은 OMCM 플러그인 설치 시 자동으로 설정됩니다.
  # 존재 여부 확인:
  ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

  # 파일이 없으면 플러그인을 재설치하세요:
  # /plugin install omcm
  ```

  **Edit 2c** — Line 449 (Category C: remove chmod):
  Delete the line `chmod +x ~/.claude/hud/omcm-hud.mjs` entirely.

  **Edit 2d** — Line 463 (Category A: statusLine command path):
  ```
  OLD: "command": "node ~/.claude/hud/omcm-hud.mjs"
  NEW: "command": "node ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs"
  ```

  **Edit 2e** — Line 509 (Category C: remove chmod):
  Delete the line `chmod +x ~/.claude/hud/omcm-hud.mjs` and its comment `# 1단계: HUD 파일 권한 확인`.

  **Edit 2f** — Line 512 (Category D: replace rm):
  Replace `rm ~/.claude/hud/omcm-hud.mjs` and surrounding instructions (lines 511-513) with:
  ```bash
  # HUD는 OMCM 플러그인에서 자동 관리됩니다.
  # 재생성하려면 재설치: /plugin install omcm
  ```

  **Edit 2g** — Line 989 (Category D: replace rm):
  Replace `rm ~/.claude/hud/omcm-hud.mjs` with:
  ```bash
  # HUD는 OMCM 플러그인 제거 시 자동으로 삭제됩니다.
  # /plugin uninstall omcm
  ```

  **Must NOT do**:
  - Do not change surrounding Korean prose or headings
  - Do not modify the `statusLine.enabled` value

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Identical structure to Task 1, just Korean language
  - **Skills**: [`git-master`]
    - `git-master`: Needed for atomic commit
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code logic involved

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `docs/ko/TROUBLESHOOTING.md:409-467` — HUD 문제 해결 섹션
  - `docs/ko/TROUBLESHOOTING.md:505-518` — "HUD 데이터 갱신 안됨" 해결 블록
  - `docs/ko/TROUBLESHOOTING.md:985-993` — 삭제 섹션

  **Acceptance Criteria**:

  ```bash
  grep -n "~/.claude/hud/omcm-hud" docs/ko/TROUBLESHOOTING.md
  # Assert: No output (zero matches)

  grep -n "~/.claude/plugins/omcm/src/hud/omcm-hud" docs/ko/TROUBLESHOOTING.md
  # Assert: Multiple matches at updated lines
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `docs: update HUD path references in TROUBLESHOOTING (en+ko)`
  - Files: `docs/en/TROUBLESHOOTING.md`, `docs/ko/TROUBLESHOOTING.md`

---

- [ ] 3. Update `docs/en/INSTALLATION.md` (6 edits)

  **What to do**:

  **Edit 3a** — Line 468 (Category A: path replacement):
  ```
  OLD: ls -la ~/.claude/hud/omcm-hud.mjs
  NEW: ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
  ```

  **Edit 3b** — Line 597 (Category A: path replacement):
  ```
  OLD: ls -la ~/.claude/hud/omcm-hud.mjs
  NEW: ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
  ```

  **Edit 3c** — Line 600 (Category C: remove chmod):
  Delete the line `chmod +x ~/.claude/hud/omcm-hud.mjs` and its comment `# Check permissions`.

  **Edit 3d** — Lines 609-646 (Category B: remove creation block):
  Remove the text "If HUD file is missing, create manually:" (line 609) and the entire block from `mkdir -p ~/.claude/hud` (line 612) through `chmod +x ~/.claude/hud/omcm-hud.mjs` (line 646). Replace with:
  ```
  If HUD file is missing, reinstall the OMCM plugin:

  ```bash
  # HUD file is automatically installed with the OMCM plugin.
  # Verify it exists:
  ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

  # If missing, reinstall the plugin:
  # /plugin install omcm
  ```

  **Edit 3e** — Line 646 (Category C: remove chmod):
  Already covered by Edit 3d (part of the removed creation block).

  **Edit 3f** — Line 746 (Category D: replace rm):
  Replace `rm ~/.claude/hud/omcm-hud.mjs` with:
  ```bash
  # HUD is automatically removed when uninstalling the OMCM plugin.
  # /plugin uninstall omcm
  ```

  **Must NOT do**:
  - Do not change surrounding verification steps or other `ls -la` commands
  - Do not remove the "OMC plugin not built" section (starts line 649)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file text replacements
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `docs/en/INSTALLATION.md:464-469` — Verification section HUD file check
  - `docs/en/INSTALLATION.md:593-647` — "HUD not displayed" troubleshooting with full creation block
  - `docs/en/INSTALLATION.md:742-750` — Uninstallation section

  **Acceptance Criteria**:

  ```bash
  grep -n "~/.claude/hud/omcm-hud" docs/en/INSTALLATION.md
  # Assert: No output (zero matches)

  grep -n "mkdir -p ~/.claude/hud" docs/en/INSTALLATION.md
  # Assert: No output (zero matches)
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `docs: update HUD path references in INSTALLATION (en+ko)`
  - Files: `docs/en/INSTALLATION.md`, `docs/ko/INSTALLATION.md`

---

- [ ] 4. Update `docs/ko/INSTALLATION.md` (6 edits)

  **What to do**:

  **Edit 4a** — Line 536 (Category A: path replacement):
  ```
  OLD: ls -la ~/.claude/hud/omcm-hud.mjs
  NEW: ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
  ```

  **Edit 4b** — Line 665 (Category A: path replacement):
  ```
  OLD: ls -la ~/.claude/hud/omcm-hud.mjs
  NEW: ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
  ```

  **Edit 4c** — Line 668 (Category C: remove chmod):
  Delete the line `chmod +x ~/.claude/hud/omcm-hud.mjs` and its comment `# 권한 확인`.

  **Edit 4d** — Lines 677-714 (Category B: remove creation block):
  Remove "HUD 파일이 없으면 수동 생성:" (line 677) and the entire block from `mkdir -p ~/.claude/hud` (line 680) through `chmod +x ~/.claude/hud/omcm-hud.mjs` (line 714). Replace with:
  ```
  HUD 파일이 없으면 OMCM 플러그인을 재설치하세요:

  ```bash
  # HUD 파일은 OMCM 플러그인 설치 시 자동으로 설정됩니다.
  # 존재 여부 확인:
  ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

  # 파일이 없으면 플러그인을 재설치하세요:
  # /plugin install omcm
  ```

  **Edit 4e** — Line 714 (Category C: remove chmod):
  Already covered by Edit 4d (part of removed creation block).

  **Edit 4f** — Line 814 (Category D: replace rm):
  Replace `rm ~/.claude/hud/omcm-hud.mjs` with:
  ```bash
  # HUD는 OMCM 플러그인 제거 시 자동으로 삭제됩니다.
  # /plugin uninstall omcm
  ```

  **Must NOT do**:
  - Do not change Korean prose around edits
  - Do not remove the "OMC 플러그인 미빌드" section

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Identical structure to Task 3, Korean language
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `docs/ko/INSTALLATION.md:532-537` — 검증 섹션 HUD 파일 확인
  - `docs/ko/INSTALLATION.md:661-715` — "HUD가 표시되지 않음" 문제 해결
  - `docs/ko/INSTALLATION.md:810-818` — 삭제 섹션

  **Acceptance Criteria**:

  ```bash
  grep -n "~/.claude/hud/omcm-hud" docs/ko/INSTALLATION.md
  # Assert: No output (zero matches)

  grep -n "mkdir -p ~/.claude/hud" docs/ko/INSTALLATION.md
  # Assert: No output (zero matches)
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `docs: update HUD path references in INSTALLATION (en+ko)`
  - Files: `docs/en/INSTALLATION.md`, `docs/ko/INSTALLATION.md`

---

- [ ] 5. Update `docs/en/FUSION-GUIDE.md` (1 edit)

  **What to do**:

  **Edit 5a** — Line 724 (Category A: path replacement):
  ```
  OLD: cat ~/.claude/hud/omcm-hud.mjs
  NEW: cat ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
  ```

  **Must NOT do**:
  - Do not change surrounding `settings.json` check or HUD cache clear instructions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line replacement
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `docs/en/FUSION-GUIDE.md:720-728` — HUD troubleshooting section with `cat` command to inspect wrapper

  **Acceptance Criteria**:

  ```bash
  grep -n "~/.claude/hud/omcm-hud" docs/en/FUSION-GUIDE.md
  # Assert: No output (zero matches)

  grep -n "~/.claude/plugins/omcm/src/hud/omcm-hud" docs/en/FUSION-GUIDE.md
  # Assert: 1 match
  ```

  **Commit**: YES (groups with Task 6)
  - Message: `docs: update HUD path references in FUSION-GUIDE (en+ko)`
  - Files: `docs/en/FUSION-GUIDE.md`, `docs/ko/FUSION-GUIDE.md`

---

- [ ] 6. Update `docs/ko/FUSION-GUIDE.md` (1 edit)

  **What to do**:

  **Edit 6a** — Line 717 (Category A: path replacement):
  ```
  OLD: cat ~/.claude/hud/omcm-hud.mjs
  NEW: cat ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
  ```

  **Must NOT do**:
  - Do not change surrounding Korean prose

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line replacement
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: No code logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `docs/ko/FUSION-GUIDE.md:713-722` — HUD 문제 해결 섹션

  **Acceptance Criteria**:

  ```bash
  grep -n "~/.claude/hud/omcm-hud" docs/ko/FUSION-GUIDE.md
  # Assert: No output (zero matches)
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `docs: update HUD path references in FUSION-GUIDE (en+ko)`
  - Files: `docs/en/FUSION-GUIDE.md`, `docs/ko/FUSION-GUIDE.md`

---

- [ ] 7. Final Verification (all files)

  **What to do**:
  Run comprehensive grep checks to confirm zero remaining old references across the entire docs directory.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification-only, no edits
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All skills: Only grep verification needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 1-6

  **References**: N/A (verification only)

  **Acceptance Criteria**:

  ```bash
  # MUST return zero results:
  grep -rn "~/.claude/hud/omcm-hud" docs/
  # Assert: No output

  grep -rn "mkdir -p ~/.claude/hud" docs/
  # Assert: No output

  grep -rn "chmod +x ~/.claude/hud" docs/
  # Assert: No output

  # MUST return results (new path present):
  grep -rn "~/.claude/plugins/omcm/src/hud/omcm-hud" docs/
  # Assert: Multiple matches across all 6 files
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Tasks | Message | Files | Verification |
|-------------|---------|-------|--------------|
| 1 + 2 | `docs: update HUD path references in TROUBLESHOOTING (en+ko)` | `docs/en/TROUBLESHOOTING.md`, `docs/ko/TROUBLESHOOTING.md` | `grep -rn "~/.claude/hud/omcm-hud" docs/*/TROUBLESHOOTING.md` → no output |
| 3 + 4 | `docs: update HUD path references in INSTALLATION (en+ko)` | `docs/en/INSTALLATION.md`, `docs/ko/INSTALLATION.md` | `grep -rn "~/.claude/hud/omcm-hud" docs/*/INSTALLATION.md` → no output |
| 5 + 6 | `docs: update HUD path references in FUSION-GUIDE (en+ko)` | `docs/en/FUSION-GUIDE.md`, `docs/ko/FUSION-GUIDE.md` | `grep -rn "~/.claude/hud/omcm-hud" docs/*/FUSION-GUIDE.md` → no output |

---

## Success Criteria

### Verification Commands
```bash
# Zero old references
grep -rn "~/.claude/hud/omcm-hud" docs/          # Expected: no output
grep -rn "mkdir -p ~/.claude/hud" docs/            # Expected: no output
grep -rn "chmod +x ~/.claude/hud" docs/            # Expected: no output

# New references present
grep -rn "~/.claude/plugins/omcm/src/hud/omcm-hud" docs/ | wc -l  # Expected: > 0

# Specifically 6+ new references (ls-la, cat, statusLine paths)
grep -c "plugins/omcm/src/hud/omcm-hud" docs/en/TROUBLESHOOTING.md  # Expected: >= 2
grep -c "plugins/omcm/src/hud/omcm-hud" docs/ko/TROUBLESHOOTING.md  # Expected: >= 2
grep -c "plugins/omcm/src/hud/omcm-hud" docs/en/INSTALLATION.md     # Expected: >= 2
grep -c "plugins/omcm/src/hud/omcm-hud" docs/ko/INSTALLATION.md     # Expected: >= 2
grep -c "plugins/omcm/src/hud/omcm-hud" docs/en/FUSION-GUIDE.md     # Expected: >= 1
grep -c "plugins/omcm/src/hud/omcm-hud" docs/ko/FUSION-GUIDE.md     # Expected: >= 1
```

### Final Checklist
- [ ] All "Must Have" present (new paths in all 6 files)
- [ ] All "Must NOT Have" absent (zero old paths, zero chmod, zero mkdir old)
- [ ] EN and KO files are consistent (same edit types in mirrored locations)
- [ ] 3 atomic commits created (one per file pair)
- [ ] Doc tone preserved (EN=English, KO=Korean)
