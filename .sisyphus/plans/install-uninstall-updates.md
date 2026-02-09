# install.sh, uninstall.sh, package.json Updates

## TL;DR

> **Quick Summary**: Update install.sh to register all 5 hook events (adding SessionStart/UserPromptSubmit/Stop), unify hook paths to `~/.claude/plugins/local/oh-my-claude-money/...`, add statusLine and omcm symlink setup. Update uninstall.sh to clean enabledPlugins, installed_plugins.json, oh-my-opencode.json, omcm symlink, and expand hook removal to all 5 events. Fix package.json metadata.
>
> **Deliverables**:
> - `install.sh` — 3 function modifications (setup_claude_hooks, install_hud_files, install_omcm)
> - `uninstall.sh` — 3 new sections + 2 existing section modifications, renumbered [1/8]–[8/8]
> - `package.json` — repository URL + author field updates
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves (files are independent)
> **Critical Path**: All changes independent → single wave possible

---

## Context

### Original Request

Add missing hook registrations, unify paths, add cleanup steps to uninstall, and fix package.json metadata.

### Interview Summary

**Key Discussions**:
- Section numbering: Renumber uninstall.sh to `[1/8]`–`[8/8]`
- Author field: Exactly `"DrFREEST"` (no email)

### Constraints

- **Optional chaining (`?.`) forbidden** in all bash/node inline scripts
- **Bash style**: `[[ ]]` tests, `$()` subshells, `local` only inside functions, robust error handling with fallbacks
- **Read-only analysis complete**: All file positions verified via grep/read

---

## Work Objectives

### Core Objective

Bring install.sh and uninstall.sh into full parity with `hooks/hooks.json` (all 5 hook events), unify all hook paths to `~/.claude/plugins/local/oh-my-claude-money/...` (including `src/hooks/`), add missing install/uninstall cleanup steps, and fix package.json metadata.

### Concrete Deliverables

- `install.sh`: setup_claude_hooks registers SessionStart + UserPromptSubmit + Stop; all paths unified; install_hud_files sets statusLine; install_omcm creates omcm symlink
- `uninstall.sh`: removes enabledPlugins entries matching omcm|oh-my-claude-money; deletes oh-my-claude-money@local from installed_plugins.json; removes ~/.config/opencode/oh-my-opencode.json; removes ~/.claude/plugins/omcm symlink; hooks removal covers all 5 events; sections renumbered [1/8]–[8/8]
- `package.json`: repository URL → DrFREEST, author → "DrFREEST"

### Definition of Done

- [ ] `bash -n install.sh` passes (syntax valid)
- [ ] `bash -n uninstall.sh` passes (syntax valid)
- [ ] `node -e "require('./package.json')"` passes (valid JSON)
- [ ] `grep -c '\?\.' install.sh uninstall.sh` returns 0 (no optional chaining)
- [ ] All 5 hook events present in setup_claude_hooks jq filter
- [ ] All hook paths use `~/.claude/plugins/local/oh-my-claude-money/...`
- [ ] Uninstall sections numbered [1/8] through [8/8]

### Must Have

- SessionStart, UserPromptSubmit, Stop hooks in setup_claude_hooks
- Unified path prefix: `~/.claude/plugins/local/oh-my-claude-money/`
- statusLine jq block at end of install_hud_files
- omcm symlink creation at end of install_omcm
- enabledPlugins cleanup (regex: omcm|oh-my-claude-money)
- installed_plugins.json oh-my-claude-money@local deletion
- oh-my-opencode.json removal
- omcm symlink removal in uninstall
- All 5 hook events in uninstall hooks removal loop
- isOmcm filter matches both "omcm" and "oh-my-claude-money"
- package.json author = "DrFREEST", repository url = DrFREEST org

### Must NOT Have (Guardrails)

- No optional chaining (`?.`) anywhere in .sh files or inline node scripts
- No `local` keyword outside of bash functions (uninstall.sh is flat)
- No backtick subshells — use `$()`
- No `[ ]` single-bracket tests — use `[[ ]]`
- No scope changes beyond what is specified
- No removal of existing functionality

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: NO (shell scripts, not a test framework)
- **User wants tests**: Manual verification
- **Framework**: bash -n syntax check + jq filter unit tests

### Automated Verification

Each TODO includes executable verification commands the agent can run directly.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (All independent — separate files/functions):
├── Task 1: package.json metadata update
├── Task 2: install_omcm() add omcm symlink
├── Task 3: install_hud_files() add statusLine block
├── Task 4: setup_claude_hooks() add 3 hooks + unify paths
└── Task 5: uninstall.sh all changes (enabledPlugins, installed_plugins, hooks expansion, oh-my-opencode, omcm symlink, renumbering)

Wave 2 (After all edits):
└── Task 6: Full verification pass

Critical Path: Tasks 1-5 → Task 6
Parallel Speedup: ~80% — all substantive work in Wave 1
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 6 | 2, 3, 4, 5 |
| 2 | None | 6 | 1, 3, 4, 5 |
| 3 | None | 6 | 1, 2, 4, 5 |
| 4 | None | 6 | 1, 2, 3, 5 |
| 5 | None | 6 | 1, 2, 3, 4 |
| 6 | 1, 2, 3, 4, 5 | None | None (final) |

---

## TODOs

- [ ] 1. Update package.json: repository URL and author

  **What to do**:
  - Change line 5: `"author": "user"` → `"author": "DrFREEST"`
  - Change line 19: `"url": "https://github.com/user/oh-my-claude-money.git"` → `"url": "https://github.com/DrFREEST/oh-my-claude-money.git"`

  **Must NOT do**:
  - Do not change any other fields
  - Do not add email to author field

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two-line metadata change, trivial
  - **Skills**: [`git-master`]
    - `git-master`: Commit after edit

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `package.json:5` — current `"author": "user"` line to replace
  - `package.json:18-19` — current repository block to update

  **Consistency References**:
  - `install.sh:354` — already uses `DrFREEST/oh-my-claude-money` (confirms correct org name)
  - `CLAUDE.md` git config section — confirms commit user is `DrFREEST`

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  node -e "const p = require('./package.json'); console.log(p.author === 'DrFREEST' && p.repository.url === 'https://github.com/DrFREEST/oh-my-claude-money.git')"
  # Assert: Output is "true"
  ```

  **Commit**: YES (group with all tasks)
  - Message: `fix(meta): update package.json author and repository URL`
  - Files: `package.json`

---

- [ ] 2. install_omcm(): Add ~/.claude/plugins/omcm symlink at end

  **What to do**:
  - In `install.sh`, inside the `install_omcm()` function, after line 385 (`log_info "  플러그인: $plugin_dir"`), add a block to create `~/.claude/plugins/omcm` as a symlink to `$source_dir`
  - Guard: remove existing link/dir before creating, use `ln -sf`
  - Add `log_success` message

  Exact code to insert after line 385:
  ```bash

      # omcm 심볼릭 링크 생성 (설정 파일 경로 호환용)
      local omcm_shortcut="$HOME/.claude/plugins/omcm"
      if [[ -L "$omcm_shortcut" ]] || [[ -d "$omcm_shortcut" ]]; then
          rm -rf "$omcm_shortcut"
      fi
      ln -sf "$source_dir" "$omcm_shortcut"
      log_success "omcm 심볼릭 링크 생성: $omcm_shortcut"
  ```

  **Must NOT do**:
  - Do not modify the existing symlink logic for `~/.claude/plugins/local/oh-my-claude-money`
  - Do not use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single block insertion into a function
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `install.sh:367-375` — existing symlink pattern for `plugin_dir` (follow same guard + `ln -sf` style)
  - `src/hooks/fusion-router-logic.mjs:18` — `CONFIG_FILE = join(HOME, '.claude', 'plugins', 'omcm', 'config.json')` confirms this path is expected

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -c "omcm_shortcut" install.sh
  # Assert: Output >= 3 (variable definition + guard + ln + log)

  grep "ln -sf.*omcm_shortcut" install.sh
  # Assert: Match found

  bash -n install.sh
  # Assert: Exit code 0
  ```

  **Commit**: YES (group with all tasks)
  - Message: `feat(install): add omcm symlink in install_omcm`
  - Files: `install.sh`

---

- [ ] 3. install_hud_files(): Add statusLine jq block at end

  **What to do**:
  - In `install.sh`, inside `install_hud_files()`, after the existing `log_warn` / `fi` block (line 649), before the function's closing `}`, insert a statusLine configuration block
  - Use jq to set `.statusLine` in `settings.json`
  - Guard: only if `settings.json` exists AND jq is available

  Exact code to insert after line 649 (after the `fi` that closes the wrapper-file check):
  ```bash

      # statusLine 설정 추가 (settings.json)
      local settings_file="$HOME/.claude/settings.json"
      if [[ -f "$settings_file" ]] && command -v jq &> /dev/null; then
          local tmp_file
          tmp_file=$(mktemp)
          if jq --arg hud_cmd "node $hud_dir/omcm-hud.mjs" \
            '.statusLine = {"type": "command", "command": $hud_cmd}' \
            "$settings_file" > "$tmp_file"; then
              mv "$tmp_file" "$settings_file"
              log_success "statusLine 설정 완료 (OMCM HUD)"
          else
              rm -f "$tmp_file"
              log_warn "statusLine 설정 실패"
          fi
      fi
  ```

  **Must NOT do**:
  - Do not remove existing HUD wrapper copy logic
  - Do not use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single block insertion
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `scripts/install-hud.sh:47-49` — existing statusLine jq pattern (follow same `.statusLine = {"type": "command", "command": ...}` shape)
  - `install.sh:634-650` — current `install_hud_files()` function to modify

  **API/Type References**:
  - `uninstall.sh:109` — confirms settings.json uses `settings.statusLine` key with string matching 'omcm-hud'

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -c "statusLine" install.sh
  # Assert: Output >= 2

  grep "jq.*statusLine" install.sh
  # Assert: Match found

  bash -n install.sh
  # Assert: Exit code 0
  ```

  **Commit**: YES (group with all tasks)
  - Message: `feat(install): add statusLine jq config in install_hud_files`
  - Files: `install.sh`

---

- [ ] 4. setup_claude_hooks(): Add SessionStart/UserPromptSubmit/Stop hooks + unify paths

  **What to do**:
  This is the most complex change. In `install.sh`, modify `setup_claude_hooks()` (lines 388–451):

  **Step 4a — Unify hook paths** (2 line edits):
  - Line 415: Change `"node ~/.claude/plugins/marketplaces/omcm/hooks/fusion-router.mjs"` → `"node ~/.claude/plugins/local/oh-my-claude-money/hooks/fusion-router.mjs"`
  - Line 418: Change `"$HOME/.claude/plugins/omcm/hooks"` → `"$HOME/.claude/plugins/local/oh-my-claude-money/hooks"`

  **Step 4b — Add 3 new jq --arg variables** (insert after existing `--arg tracker_cmd` on line 424):
  ```
      --arg session_cmd "node $HOME/.claude/plugins/local/oh-my-claude-money/src/hooks/session-start.mjs" \
      --arg handoff_cmd "node $HOME/.claude/plugins/local/oh-my-claude-money/src/hooks/detect-handoff.mjs" \
      --arg stop_cmd "node $HOME/.claude/plugins/local/oh-my-claude-money/src/hooks/persistent-mode.mjs" \
  ```

  **Step 4c — Add 3 new hook event blocks** in the jq filter. After the PostToolUse block (after `] | unique_by(.matcher))` on line 446), add:
  ```jq
   |
      .hooks.SessionStart = ((.hooks.SessionStart // []) + [
        {
          "hooks": [{"type": "command", "command": $session_cmd, "timeout": 3, "statusMessage": "사용량 정보 로드 중..."}]
        }
      ]) |
      .hooks.UserPromptSubmit = ((.hooks.UserPromptSubmit // []) + [
        {
          "hooks": [{"type": "command", "command": $handoff_cmd, "timeout": 5, "statusMessage": "사용량 확인 중..."}]
        }
      ]) |
      .hooks.Stop = ((.hooks.Stop // []) + [
        {
          "hooks": [{"type": "command", "command": $stop_cmd, "timeout": 5, "statusMessage": "활성 모드 확인 중..."}]
        }
      ])
  ```

  **Step 4d — Update log message** (line 450):
  - Change `"PreToolUse + PostToolUse hooks 설정 완료"` → `"PreToolUse + PostToolUse + SessionStart + UserPromptSubmit + Stop hooks 설정 완료"`

  **Must NOT do**:
  - Do not remove existing PreToolUse or PostToolUse hook entries
  - Do not change the timeout values
  - Do not use optional chaining
  - Do not break existing jq filter logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex jq filter modification with multiple insertion points; high risk of syntax error
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed for code editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `hooks/hooks.json:37-71` — **Canonical source of truth** for SessionStart (line 49–60), UserPromptSubmit (line 37–48), and Stop (line 61–71) hook definitions. Match these structures exactly.
  - `install.sh:420-447` — Existing jq filter block for PreToolUse + PostToolUse (follow same pattern for new events)
  - `install.sh:413-424` — Existing `--arg` declarations (add new ones in same style)

  **API/Type References**:
  - `src/hooks/session-start.mjs` — SessionStart hook handler (outputs `{ continue: true }` JSON)
  - `src/hooks/detect-handoff.mjs` — UserPromptSubmit hook handler (reads stdin JSON, outputs `{ continue: true, message?: string }`)
  - `src/hooks/persistent-mode.mjs` — Stop hook handler (reads stdin JSON, outputs `{ continue: true, message?: string }`)

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  # Verify all 5 events are in the jq filter
  grep -c "SessionStart\|UserPromptSubmit\|\.Stop" install.sh
  # Assert: Output >= 3 (one each for SessionStart, UserPromptSubmit, Stop)

  # Verify unified paths — no more marketplaces/omcm or plugins/omcm/hooks
  grep -c "marketplaces/omcm" install.sh
  # Assert: Output is 0

  grep -c "plugins/omcm/hooks" install.sh
  # Assert: Output is 0

  # Verify new paths use local/oh-my-claude-money
  grep -c "plugins/local/oh-my-claude-money" install.sh
  # Assert: Output >= 6 (existing + new references)

  # Verify 3 new --arg variables
  grep -c "session_cmd\|handoff_cmd\|stop_cmd" install.sh
  # Assert: Output >= 6 (definition + usage for each)

  # Syntax check
  bash -n install.sh
  # Assert: Exit code 0

  # jq filter unit test — extract and test the filter alone
  echo '{}' | jq \
    --arg fusion_cmd "test" \
    --arg read_cmd "test" \
    --arg bash_cmd "test" \
    --arg tracker_cmd "test" \
    --arg session_cmd "test" \
    --arg handoff_cmd "test" \
    --arg stop_cmd "test" \
    '.hooks = (.hooks // {}) | .hooks.PreToolUse = [] | .hooks.PostToolUse = [] | .hooks.SessionStart = ((.hooks.SessionStart // []) + [{"hooks": [{"type": "command", "command": $session_cmd}]}]) | .hooks.UserPromptSubmit = ((.hooks.UserPromptSubmit // []) + [{"hooks": [{"type": "command", "command": $handoff_cmd}]}]) | .hooks.Stop = ((.hooks.Stop // []) + [{"hooks": [{"type": "command", "command": $stop_cmd}]}])'
  # Assert: Exit code 0, output contains SessionStart/UserPromptSubmit/Stop keys
  ```

  **Commit**: YES (group with all tasks)
  - Message: `feat(install): register SessionStart/UserPromptSubmit/Stop hooks + unify paths`
  - Files: `install.sh`

---

- [ ] 5. uninstall.sh: Add enabledPlugins cleanup, installed_plugins.json cleanup, expand hooks removal, add oh-my-opencode.json + omcm symlink removal, renumber sections

  **What to do**:
  This task covers all uninstall.sh changes. Apply in order from top to bottom of file:

  **Step 5a — Renumber section 1 header** (line 39):
  - Change `[1/6]` → `[1/8]`

  **Step 5b — Insert new section 2: enabledPlugins removal** (after line 45, before the old section 2 header):
  ```bash

  # ============================================================================
  # 2. enabledPlugins 항목 제거
  # ============================================================================
  echo -e "${BLUE}[2/8]${NC} enabledPlugins 항목 제거..."
  if [[ -f "$SETTINGS_FILE" ]] && command -v jq &> /dev/null; then
      if jq -e '.enabledPlugins' "$SETTINGS_FILE" >/dev/null 2>&1; then
          tmp_file=$(mktemp)
          if jq 'if .enabledPlugins then .enabledPlugins |= with_entries(select(.key | test("omcm|oh-my-claude-money") | not)) else . end' \
              "$SETTINGS_FILE" > "$tmp_file"; then
              mv "$tmp_file" "$SETTINGS_FILE"
              echo -e "  ${GREEN}✓${NC} enabledPlugins에서 omcm/oh-my-claude-money 항목 제거됨"
          else
              rm -f "$tmp_file"
              echo -e "  ${YELLOW}!${NC} enabledPlugins 수정 실패"
          fi
      else
          echo -e "  ${YELLOW}-${NC} enabledPlugins 섹션 없음"
      fi
  else
      echo -e "  ${YELLOW}-${NC} settings.json 없거나 jq 없음"
  fi
  ```

  **Step 5c — Insert new section 3: installed_plugins.json cleanup** (after section 2 above):
  ```bash

  # ============================================================================
  # 3. installed_plugins.json 정리
  # ============================================================================
  echo -e "${BLUE}[3/8]${NC} installed_plugins.json 정리..."
  INSTALLED_FILE="$HOME/.claude/plugins/installed_plugins.json"
  if [[ -f "$INSTALLED_FILE" ]] && command -v jq &> /dev/null; then
      if jq -e '.plugins["oh-my-claude-money@local"]' "$INSTALLED_FILE" >/dev/null 2>&1; then
          tmp_file=$(mktemp)
          if jq 'del(.plugins["oh-my-claude-money@local"])' "$INSTALLED_FILE" > "$tmp_file"; then
              mv "$tmp_file" "$INSTALLED_FILE"
              echo -e "  ${GREEN}✓${NC} installed_plugins.json에서 oh-my-claude-money@local 제거됨"
          else
              rm -f "$tmp_file"
              echo -e "  ${YELLOW}!${NC} installed_plugins.json 수정 실패"
          fi
      else
          echo -e "  ${YELLOW}-${NC} oh-my-claude-money@local 항목 없음"
      fi
  else
      echo -e "  ${YELLOW}-${NC} installed_plugins.json 없거나 jq 없음"
  fi
  ```

  **Step 5d — Update old section 2 → section 4: Hooks removal** (original lines 48–82):
  - Change header `[2/6]` → `[4/8]`
  - In the node inline script (line 61), change:
    `for (const event of ['PreToolUse', 'PostToolUse']) {`
    → `for (const event of ['PreToolUse', 'PostToolUse', 'SessionStart', 'UserPromptSubmit', 'Stop']) {`
  - In the node inline script (line 59), change:
    `const isOmcm = (entry) => JSON.stringify(entry).includes('omcm');`
    → `const isOmcm = (entry) => { const s = JSON.stringify(entry); return s.includes('omcm') || s.includes('oh-my-claude-money'); };`
  - Update log message (line 75): `"PreToolUse + PostToolUse hooks에서 OMCM 항목 제거됨"` → `"모든 hooks에서 OMCM 항목 제거됨"`

  **Step 5e — Update old section 3 → section 5** (original lines 86–118):
  - Change `[3/6]` → `[5/8]`

  **Step 5f — Update old section 4 → section 6 + add oh-my-opencode.json removal** (original lines 121–153):
  - Change `[4/6]` → `[6/8]`
  - After the `.omc/state` manual removal note (line 152–153), add:
    ```bash

        # oh-my-opencode 설정 파일 제거
        OMO_CONFIG="$HOME/.config/opencode/oh-my-opencode.json"
        if [[ -f "$OMO_CONFIG" ]]; then
            rm "$OMO_CONFIG"
            echo -e "  ${GREEN}✓${NC} oh-my-opencode.json 제거됨"
            ((REMOVED_FILES++))
        fi
    ```

  **Step 5g — Update old section 5 → section 7 + add omcm symlink removal** (original lines 156–175):
  - Change `[5/6]` → `[7/8]`
  - After the `OMCM_CACHE_DIR` removal block (line 170), add:
    ```bash

        # omcm 심볼릭 링크 제거
        OMCM_SYMLINK="$HOME/.claude/plugins/omcm"
        if [[ -L "$OMCM_SYMLINK" ]]; then
            rm "$OMCM_SYMLINK"
            echo -e "  ${GREEN}✓${NC} omcm 심볼릭 링크 제거됨"
            ((CACHE_REMOVED++))
        fi
    ```

  **Step 5h — Update old section 6 → section 8** (original lines 179–198):
  - Change `[6/6]` → `[8/8]`

  **Must NOT do**:
  - Do not use `local` keyword (script is flat, not inside functions)
  - Do not use optional chaining (`?.`)
  - Do not remove existing removal logic
  - Do not alter the source-code removal prompt (section 8)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Many insertion points across file; section renumbering requires careful positioning; inline node script modification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `uninstall.sh:36-45` — Section 1 pattern (existing section structure with `# ====` headers, `echo -e` progress markers)
  - `uninstall.sh:48-82` — Section 2 (hooks) pattern: node inline `-e` script with `fs.readFileSync`/`fs.writeFileSync`
  - `uninstall.sh:54-74` — Current node inline script to modify (isOmcm function + for loop)
  - `install.sh:556-574` — enabledPlugins structure in settings.json (shows key format: `"oh-my-claude-money@local": true`)
  - `install.sh:592-630` — installed_plugins.json structure (shows key format: `"oh-my-claude-money@local": [...]`)
  - `install.sh:297-323` — oh-my-opencode.json creation (confirms path: `$HOME/.config/opencode/oh-my-opencode.json`)

  **API/Type References**:
  - `hooks/hooks.json` — Canonical list of all 5 hook events with exact command paths

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  # Verify section renumbering
  grep -c '\[1/8\]\|\[2/8\]\|\[3/8\]\|\[4/8\]\|\[5/8\]\|\[6/8\]\|\[7/8\]\|\[8/8\]' uninstall.sh
  # Assert: Output is 8

  # Verify no old section numbering remains
  grep -c '\[./6\]' uninstall.sh
  # Assert: Output is 0

  # Verify enabledPlugins removal section exists
  grep -c 'enabledPlugins' uninstall.sh
  # Assert: Output >= 3

  # Verify installed_plugins.json cleanup section exists
  grep -c 'installed_plugins.json' uninstall.sh
  # Assert: Output >= 2

  # Verify all 5 hook events in removal loop
  grep "SessionStart.*UserPromptSubmit.*Stop" uninstall.sh
  # Assert: Match found (all in the same for-loop line)

  # Verify isOmcm matches oh-my-claude-money too
  grep "oh-my-claude-money" uninstall.sh | grep -c "isOmcm\|includes"
  # Assert: Output >= 1

  # Verify oh-my-opencode.json removal
  grep -c "oh-my-opencode.json" uninstall.sh
  # Assert: Output >= 1

  # Verify omcm symlink removal
  grep -c "plugins/omcm" uninstall.sh
  # Assert: Output >= 2 (variable definition + removal)

  # Verify no optional chaining
  grep -c '\?\.' uninstall.sh
  # Assert: Output is 0

  # Syntax check
  bash -n uninstall.sh
  # Assert: Exit code 0
  ```

  **Commit**: YES (group with all tasks)
  - Message: `feat(uninstall): add enabledPlugins/installed_plugins cleanup, expand hooks to 5 events, add oh-my-opencode + omcm symlink removal`
  - Files: `uninstall.sh`

---

- [ ] 6. Full verification pass

  **What to do**:
  - Run all acceptance criteria commands from Tasks 1–5
  - Verify cross-file consistency: paths in install.sh match removal paths in uninstall.sh

  **Must NOT do**:
  - Do not make any edits in this task

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read-only verification commands
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3, 4, 5

  **References**:

  **Pattern References**:
  - All acceptance criteria from Tasks 1–5

  **Acceptance Criteria**:

  ```bash
  # Syntax validation
  bash -n install.sh && echo "install.sh: OK" || echo "install.sh: FAIL"
  bash -n uninstall.sh && echo "uninstall.sh: OK" || echo "uninstall.sh: FAIL"
  node -e "require('./package.json'); console.log('package.json: OK')"

  # No optional chaining in shell files
  count=$(grep -c '\?\.' install.sh uninstall.sh 2>/dev/null || echo 0)
  echo "Optional chaining occurrences: $count"
  # Assert: 0

  # Cross-file consistency: paths installed = paths uninstalled
  # install creates ~/.claude/plugins/omcm → uninstall removes it
  grep -q "plugins/omcm" install.sh && grep -q "plugins/omcm" uninstall.sh && echo "omcm symlink: consistent" || echo "omcm symlink: MISMATCH"

  # install registers SessionStart/UserPromptSubmit/Stop → uninstall removes them
  for event in SessionStart UserPromptSubmit Stop; do
    i=$(grep -c "$event" install.sh)
    u=$(grep -c "$event" uninstall.sh)
    echo "$event: install=$i, uninstall=$u"
  done
  # Assert: All counts >= 1
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1–5 (grouped) | `feat(scripts): update install/uninstall hooks, paths, cleanup + fix package.json metadata` | `install.sh`, `uninstall.sh`, `package.json` | Task 6 verification pass |

**Alternative**: If preferred, split into 3 commits (one per file):
1. `fix(meta): update package.json author and repository URL` — `package.json`
2. `feat(install): add SessionStart/UserPromptSubmit/Stop hooks, unify paths, add statusLine + omcm symlink` — `install.sh`
3. `feat(uninstall): add enabledPlugins/installed_plugins cleanup, expand hooks removal, add oh-my-opencode + omcm symlink removal, renumber sections` — `uninstall.sh`

---

## Success Criteria

### Verification Commands
```bash
bash -n install.sh       # Expected: exit 0
bash -n uninstall.sh     # Expected: exit 0
node -e "require('./package.json')"  # Expected: no error
grep -c '\?\.' install.sh uninstall.sh  # Expected: 0
```

### Final Checklist
- [ ] All "Must Have" items present
- [ ] All "Must NOT Have" items absent
- [ ] All 6 tasks completed
- [ ] Cross-file path consistency verified
