# Slim CLAUDE.md to ≤50% Lines

## TL;DR

> **Quick Summary**: Replace CLAUDE.md (115 lines) with a condensed version (≤57 lines) preserving all essential rules, checklists, and fusion settings while removing verbose examples and redundant content.
> 
> **Deliverables**: Single file replacement of `/opt/oh-my-claude-money/CLAUDE.md`
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - single atomic task
> **Critical Path**: Task 1 (write) → Task 2 (verify)

---

## Context

### Original Request
Slim CLAUDE.md to ≤50% of current line count (115 → ≤57 lines). Preserve claude-mem-context block exactly, follow user-provided slim structure, remove version examples, reduce SemVer to table, condense sync commands to single rsync, remove docs tree, keep fusion settings.

### Interview Summary
**Key Discussions**:
- User provided explicit constraints: no optional chaining, keep checklists, no new requirements
- Full file replacement approach (not incremental edits)
- Must NOT edit files yet — plan only

**Research Findings**:
- Current file: 115 lines exactly
- claude-mem-context block: lines 1-11 (11 lines, must be byte-identical)
- Remaining budget: ~46 lines for all project content
- SemVer section currently 19 lines, can compress to ~6
- Release checklist currently 20 lines, can compress to ~10
- Doc rules currently 35 lines, can compress to ~8 (remove tree)
- Fusion section: 5 lines, kept as-is

### Metis Review
**Identified Gaps** (addressed):
- Blank lines count toward 57-line budget — incorporated into line budget
- Need markdown rendering validation after condensing — added to acceptance criteria
- Safety valve: doc sync table row can be dropped if at 58 lines — noted as fallback
- Korean phrasing preserved as-is, only structural condensation

---

## Work Objectives

### Core Objective
Replace CLAUDE.md with a condensed version at ≤57 lines total (including blank lines), preserving all essential project rules.

### Concrete Deliverables
- `/opt/oh-my-claude-money/CLAUDE.md` — rewritten file ≤57 lines

### Definition of Done
- [ ] `wc -l CLAUDE.md` outputs ≤ 57
- [ ] First 11 lines are byte-identical to current claude-mem-context
- [ ] All 5 required sections present (Git, SemVer, Release, Docs, Fusion)
- [ ] No optional chaining (`?.`) in file
- [ ] No removed content: "판단 기준", version examples, docs tree, alternative cp commands

### Must Have
- claude-mem-context block (lines 1-11) byte-identical
- Git commit user info
- SemVer table (3 rows, no examples)
- Release checklist (version files + rsync sync)
- Doc sync rules (condensed table)
- Fusion settings (global config reference)

### Must NOT Have (Guardrails)
- Version examples (1.0.0 → 1.1.0 etc.)
- "판단 기준 흐름" decision flow
- Docs directory tree structure
- Alternative sync commands (cp lines)
- Optional chaining (`?.`) in any code
- Any new requirements not in current file
- Changes to section ordering

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A (markdown file, not code)
- **User wants tests**: Manual verification via commands
- **Framework**: N/A

### Automated Verification (ALWAYS include)

```bash
# 1. Line count check
wc -l /opt/oh-my-claude-money/CLAUDE.md
# Assert: ≤ 57

# 2. claude-mem-context preservation (first 11 lines unchanged)
head -11 /opt/oh-my-claude-money/CLAUDE.md | md5sum
# Assert: matches pre-edit md5 (compute before editing)

# 3. All required sections present
grep -c "## Git 설정\|## 버전 관리\|## 릴리즈 체크리스트\|## 문서화 규칙\|## 퓨전 설정" /opt/oh-my-claude-money/CLAUDE.md
# Assert: 5

# 4. Single rsync command present
grep -c "rsync" /opt/oh-my-claude-money/CLAUDE.md
# Assert: 1

# 5. No optional chaining
grep -c '\?\.' /opt/oh-my-claude-money/CLAUDE.md
# Assert: 0

# 6. Removed content is gone
grep -c "판단 기준" /opt/oh-my-claude-money/CLAUDE.md
# Assert: 0
grep -c "1\.0\.0.*→\|1\.1\.0.*→\|1\.2\.0.*→\|2\.0\.0" /opt/oh-my-claude-money/CLAUDE.md
# Assert: 0

# 7. Markdown rendering check (headers not broken)
grep -c "^## " /opt/oh-my-claude-money/CLAUDE.md
# Assert: 5 (exactly 5 h2 sections)
```

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Starting point — compute pre-edit checksum, write file |
| Task 2 | Task 1 | Verification requires file to be written first |

## Parallel Execution Graph

```
Wave 1 (Start immediately):
└── Task 1: Compute checksum + Write CLAUDE.md replacement

Wave 2 (After Wave 1):
└── Task 2: Run all verification checks

Critical Path: Task 1 → Task 2
Parallel Speedup: N/A (sequential, 2 tasks)
```

## Execution Strategy

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | delegate_task(category="quick", load_skills=["git-master"]) |
| 2 | 2 | delegate_task(category="quick", load_skills=[]) |

---

## TODOs

- [ ] 1. Write Condensed CLAUDE.md

  **What to do**:
  1. Compute md5sum of first 11 lines of current CLAUDE.md (preservation baseline)
  2. Write the complete replacement file using the content specification below
  3. The replacement content MUST be exactly this structure (line-counted):

  ```
  Lines 1-11:  <claude-mem-context> block (COPY BYTE-IDENTICAL from current file)
  Line 12:     blank
  Line 13:     # OMCM 프로젝트 규칙
  Line 14:     blank
  Line 15:     ## Git 설정
  Line 16:     blank
  Line 17:     - **커밋 사용자**: `DrFREEST <dalkong@dalkong.kr>`
  Line 18:     blank
  Line 19:     ## 버전 관리 (Semantic Versioning)
  Line 20:     blank
  Line 21:     | 버전 | 기준 |
  Line 22:     |------|------|
  Line 23:     | **a (메이저)** | 하위 호환성이 깨지는 변경 |
  Line 24:     | **b (마이너)** | 새 기능/기능확장 (하위 호환 유지) |
  Line 25:     | **c (패치)** | 버그 수정, 문서, 성능, 리팩토링 |
  Line 26:     blank
  Line 27:     ## 릴리즈 체크리스트
  Line 28:     blank
  Line 29:     - [ ] `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` 버전 동기화
  Line 30:     - [ ] `CHANGELOG.md` 변경사항 기록
  Line 31:     - [ ] 파일 동기화: `rsync -av --exclude='.git' --exclude='.omc' --exclude='.omcm' /opt/oh-my-claude-money/ ~/.claude/marketplaces/omcm/`
  Line 32:     blank
  Line 33:     ## 문서화 규칙
  Line 34:     blank
  Line 35:     | 수정 영역 | 업데이트 문서 |
  Line 36:     |----------|-------------|
  Line 37:     | `src/utils/` | API-REFERENCE.md |
  Line 38:     | `src/router/` | ARCHITECTURE.md |
  Line 39:     | `src/context/`, `src/tracking/` | FEATURES.md |
  Line 40:     | `src/hud/` | CONFIGURATION.md |
  Line 41:     | 새 기능 | CHANGELOG.md + 해당 문서 |
  Line 42:     | 버그 수정 | TROUBLESHOOTING.md |
  Line 43:     blank
  Line 44:     ## 퓨전 설정 (글로벌)
  Line 45:     blank
  Line 46:     - **설정 파일**: `~/.claude/plugins/omcm/config.json`
  Line 47:     - **적용 범위**: 모든 프로젝트/세션에 글로벌 적용
  ```

  **Total: 47 lines** (well under 57 limit, with 10 lines of safety margin)

  **Key changes from current**:
  - Removed line 18 (git config command — redundant, git-master skill handles this)
  - SemVer: removed "형식" line, "판단 기준 흐름", all 5 version examples, "구체적 예시" column
  - Release checklist: merged 3 version files into one checkbox, removed sub-headers, removed file sync sub-items (install.sh, uninstall.sh, hooks/, src/ — covered by rsync), removed warning callout
  - Removed "동기화 명령어" section entirely (rsync is now inline in checklist)
  - Doc rules: removed docs tree structure, removed ko/en dual-path references (simplified to just doc name), removed warning callout
  - Fusion: kept as-is minus "한 번 설정하면 재설정 불필요" line (saves 1 line, obvious fact)

  **Must NOT do**:
  - Do NOT change any Korean wording beyond structural condensation
  - Do NOT reorder sections
  - Do NOT add English translations
  - Do NOT use optional chaining
  - Do NOT modify the claude-mem-context block at all

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file markdown replacement, trivial implementation
  - **Skills**: [`git-master`]
    - `git-master`: Needed for commit after file write
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `typescript-programmer`: No code
    - `prompt-engineer`: No prompt work

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/opt/oh-my-claude-money/CLAUDE.md:1-11` — claude-mem-context block to copy byte-identical
  - `/opt/oh-my-claude-money/CLAUDE.md:17` — Git commit user line to preserve exactly
  - `/opt/oh-my-claude-money/CLAUDE.md:24-28` — SemVer table rows (keep content, drop "구체적 예시" column)
  - `/opt/oh-my-claude-money/CLAUDE.md:48-51` — Version file checklist items (merge into one line)
  - `/opt/oh-my-claude-money/CLAUDE.md:67-68` — rsync command to preserve exactly
  - `/opt/oh-my-claude-money/CLAUDE.md:81-90` — Doc sync table rows (simplify path references)
  - `/opt/oh-my-claude-money/CLAUDE.md:111-115` — Fusion settings (keep as-is minus last line)

  **WHY Each Reference Matters**:
  - Lines 1-11: MUST be byte-identical — this is auto-generated by claude-mem
  - Line 17: Exact git user identity — must not be altered
  - Lines 24-28: Source data for the condensed 2-column table
  - Lines 48-51: Source for the merged single-line version checkbox
  - Lines 67-68: Exact rsync flags/paths to embed inline in checklist
  - Lines 81-90: Source rows for condensed doc sync table
  - Lines 111-115: Fusion config reference to preserve

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  wc -l /opt/oh-my-claude-money/CLAUDE.md
  # Assert: output is ≤ 57

  head -11 /opt/oh-my-claude-money/CLAUDE.md | md5sum
  # Assert: matches pre-edit checksum (computed at start of task)

  grep -c "## Git 설정\|## 버전 관리\|## 릴리즈 체크리스트\|## 문서화 규칙\|## 퓨전 설정" /opt/oh-my-claude-money/CLAUDE.md
  # Assert: 5
  ```

  **Evidence to Capture**:
  - [ ] Pre-edit md5sum of first 11 lines
  - [ ] Post-edit `wc -l` output
  - [ ] Post-edit grep section count

  **Commit**: YES
  - Message: `docs: slim CLAUDE.md from 115 to ~47 lines (59% reduction)`
  - Files: `CLAUDE.md`
  - Pre-commit: `wc -l CLAUDE.md` (verify ≤57)

---

- [ ] 2. Verify Replacement Integrity

  **What to do**:
  1. Run full verification suite (all 7 checks from Verification Strategy)
  2. Confirm markdown renders correctly (no broken tables, headers parse correctly)
  3. Verify no content was accidentally re-introduced

  **Must NOT do**:
  - Do NOT make any edits — verification only
  - Do NOT skip any check

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple command execution and output comparison
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All skills: Pure verification task, no domain expertise needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 1

  **References**:
  - This plan's "Verification Strategy" section — all 7 check commands

  **Acceptance Criteria**:

  ```bash
  # All 7 verification commands pass:
  wc -l /opt/oh-my-claude-money/CLAUDE.md           # ≤ 57
  head -11 /opt/oh-my-claude-money/CLAUDE.md | md5sum # matches baseline
  grep -c "## Git 설정\|## 버전 관리\|## 릴리즈 체크리스트\|## 문서화 규칙\|## 퓨전 설정" /opt/oh-my-claude-money/CLAUDE.md  # 5
  grep -c "rsync" /opt/oh-my-claude-money/CLAUDE.md  # 1
  grep -c '\?\.' /opt/oh-my-claude-money/CLAUDE.md   # 0
  grep -c "판단 기준" /opt/oh-my-claude-money/CLAUDE.md  # 0
  grep -c "^## " /opt/oh-my-claude-money/CLAUDE.md   # 5
  ```

  **Evidence to Capture**:
  - [ ] Terminal output from all 7 verification commands

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `docs: slim CLAUDE.md from 115 to ~47 lines (59% reduction)` | CLAUDE.md | `wc -l CLAUDE.md` ≤ 57 |

---

## Success Criteria

### Verification Commands
```bash
wc -l CLAUDE.md              # Expected: 47 (or ≤57)
head -11 CLAUDE.md | md5sum   # Expected: matches pre-edit hash
grep -c "^## " CLAUDE.md     # Expected: 5
grep -c "rsync" CLAUDE.md    # Expected: 1
grep -c '\?\.' CLAUDE.md     # Expected: 0
```

### Final Checklist
- [ ] Line count ≤ 57 (target: 47)
- [ ] claude-mem-context byte-identical
- [ ] All 5 sections present
- [ ] Single rsync command (no cp alternatives)
- [ ] No version examples
- [ ] No 판단 기준 흐름
- [ ] No docs tree structure
- [ ] No optional chaining
- [ ] Fusion settings preserved
- [ ] No new content added
