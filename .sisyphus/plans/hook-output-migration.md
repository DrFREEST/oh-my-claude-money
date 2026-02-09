# Hook Output Migration to OMC v3.8+ hookSpecificOutput API

## TL;DR

> **Quick Summary**: Migrate three OMCM hook files from deprecated `{continue:true, message/systemMessage}` output format to the official `hookSpecificOutput.additionalContext` API, preserving all message content verbatim.
> 
> **Deliverables**:
> - Updated `src/hooks/detect-handoff.mjs` (4 output sites, hookEventName: `UserPromptSubmit`)
> - Updated `src/hooks/persistent-mode.mjs` (2 output sites, hookEventName: `Stop` → see risk note)
> - Updated `hooks/bash-optimizer.mjs` (1 output site, hookEventName: `PreToolUse`)
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 3 waves (all files independent → verification)
> **Critical Path**: Task 1/2/3 (parallel) → Task 4 (verification)

---

## Context

### Original Request
Update hook output objects across three files to use the OMC v3.8+ `hookSpecificOutput` API. Replace `{continue:true, message:...}` and `{allow:true, systemMessage:...}` patterns with the proper `hookSpecificOutput` wrapper. Preserve all message content exactly. Use template literals for multiline strings in detect-handoff.mjs. Use file-specific `hookEventName` values.

### API Reference (Authoritative Source)

From `@anthropic-ai/claude-agent-sdk` (`coreTypes.d.ts` lines 261-293):

```typescript
hookSpecificOutput?: {
    hookEventName: 'PreToolUse';
    permissionDecision?: 'allow' | 'deny' | 'ask';
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
} | {
    hookEventName: 'UserPromptSubmit';
    additionalContext?: string;
} | {
    hookEventName: 'SessionStart';
    additionalContext?: string;
} | {
    hookEventName: 'PostToolUse';
    additionalContext?: string;
    updatedMCPToolOutput?: unknown;
} | ...
```

**Key finding**: The SDK type union does NOT include `hookEventName: 'Stop'`. See Risk section.

### Reference Implementation

From `omc/scripts/keyword-detector.mjs` (lines 199-207):
```javascript
function createHookOutput(additionalContext) {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext
    }
  };
}
```

### Hook Event Mapping (from hooks.json)

| File | Hook Event | hookEventName |
|------|-----------|---------------|
| `src/hooks/detect-handoff.mjs` | `UserPromptSubmit` | `'UserPromptSubmit'` |
| `src/hooks/persistent-mode.mjs` | `Stop` | **See Risk** |
| `hooks/bash-optimizer.mjs` | `PreToolUse` (matcher: `Bash`) | `'PreToolUse'` |

---

## Work Objectives

### Core Objective
Replace all legacy `message` / `systemMessage` fields in hook JSON output with `hookSpecificOutput.additionalContext`, matching the OMC v3.8+ API contract.

### Concrete Deliverables
- 3 files edited with exact output format changes
- Zero logic changes (flow, conditions, exit codes unchanged)
- All message content preserved verbatim

### Definition of Done
- [ ] All `message:` and `systemMessage:` fields removed from hook JSON output
- [ ] All outputs use `hookSpecificOutput` wrapper with correct `hookEventName`
- [ ] `lsp_diagnostics` clean on all 3 files
- [ ] `node --check` passes on all 3 files

### Must Have
- Exact message content preservation (character-for-character)
- Correct `hookEventName` per file's hook event type
- Template literals for multiline strings in `detect-handoff.mjs`
- `continue: true` / `allow: true` preserved in all outputs

### Must NOT Have (Guardrails)
- NO logic changes (conditions, flow, error handling)
- NO changes to `{continue: true}` passthrough outputs (lines with no message)
- NO changes to stdin reading, prompt extraction, or any other functionality
- NO changes to `fusion-router.mjs` outputs (different pattern: `allow: false` with `reason`)
- NO modification of files beyond the three specified

---

## Risks

### CRITICAL: `Stop` hook event not in SDK type union

The SDK `hookSpecificOutput` type does NOT include `hookEventName: 'Stop'`. The valid values are:
- `PreToolUse`, `UserPromptSubmit`, `SessionStart`, `SubagentStart`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`

**For `persistent-mode.mjs` (Stop hook):**
- OMC CHANGELOG notes: "Removed `hookSpecificOutput` with unrecognized `SessionEnd` event" — confirming unrecognized events are stripped.
- **Decision needed from user**: For `persistent-mode.mjs`, should we:
  - **(A)** Use `hookSpecificOutput` with the closest matching `hookEventName` (e.g. `'UserPromptSubmit'`), accepting it may not be recognized by the Stop handler?
  - **(B)** Keep the legacy `message` field for this file only, since `Stop` has no `hookSpecificOutput` variant?
  - **(C)** Use `hookSpecificOutput` with `hookEventName: 'Stop'` anyway, hoping future SDK versions add support?

**Recommendation**: Option (B) — keep `message` for `persistent-mode.mjs` since the SDK has no `Stop` variant. This avoids silent message loss.

### LOW: Template literal conversion in detect-handoff.mjs
The existing code already uses template literals (backtick strings) for multiline messages. The migration preserves them; the content moves from `message:` to `additionalContext:` with no string format changes.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (node --test)
- **User wants tests**: Manual verification (no existing tests for these files)
- **Framework**: `node --test`
- **QA approach**: LSP diagnostics + syntax check + manual output verification

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 (detect-handoff.mjs) | None | Independent file |
| Task 2 (persistent-mode.mjs) | None | Independent file (pending risk decision) |
| Task 3 (bash-optimizer.mjs) | None | Independent file |
| Task 4 (Verification) | Tasks 1, 2, 3 | Must verify all edits |

## Parallel Execution Graph

```
Wave 1 (Start immediately — all independent):
├── Task 1: detect-handoff.mjs (4 output sites)
├── Task 2: persistent-mode.mjs (2 output sites) [pending risk decision]
└── Task 3: bash-optimizer.mjs (1 output site)

Wave 2 (After Wave 1):
└── Task 4: Verification (lsp_diagnostics + node --check)

Critical Path: Any Wave-1 task → Task 4
Parallel Speedup: ~66% (3 parallel vs sequential)
```

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1, 2, 3 | delegate_task(category="quick", load_skills=["typescript-programmer"], run_in_background=true) × 3 |
| 2 | 4 | delegate_task(category="quick", run_in_background=false) |

---

## TODOs

- [ ] 1. Migrate detect-handoff.mjs outputs to hookSpecificOutput

  **What to do**:
  
  Replace 4 output sites that use `message:` or `systemMessage:` with `hookSpecificOutput` wrapper. Keep `continue: true`. Use `hookEventName: 'UserPromptSubmit'`. Preserve all message content verbatim using template literals.

  **Edit Site 1 — Lines 321-328 (mode keyword detection)**:
  
  OLD:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      message: `🎯 **${detectedMode.mode.toUpperCase()} 모드 감지**\n\n키워드 "${detectedMode.keyword}"로 ${detectedMode.mode} 모드가 활성화됩니다.`,
    })
  );
  ```
  
  NEW:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `🎯 **${detectedMode.mode.toUpperCase()} 모드 감지**\n\n키워드 "${detectedMode.keyword}"로 ${detectedMode.mode} 모드가 활성화됩니다.`
      }
    })
  );
  ```

  **Edit Site 2 — Lines 339-346 (delegation pattern, sessionInputTokens >= 5M)**:
  
  OLD:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      systemMessage: '[OMCM 토큰 절약 모드] 세션 입력 토큰 ' + Math.round(sessionInputTokens / 1000000) + 'M. ' + delegationPattern.suggestion + ' Task(subagent_type="oh-my-claudecode:' + delegationPattern.type + '")로 위임을 검토하세요.'
    })
  );
  ```
  
  NEW:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `[OMCM 토큰 절약 모드] 세션 입력 토큰 ${Math.round(sessionInputTokens / 1000000)}M. ${delegationPattern.suggestion} Task(subagent_type="oh-my-claudecode:${delegationPattern.type}")로 위임을 검토하세요.`
      }
    })
  );
  ```

  **Edit Site 3 — Lines 350-356 (general delegation hint, sessionInputTokens >= 10M)**:
  
  OLD:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      systemMessage: '[OMCM 토큰 절약 모드] 세션 입력 토큰 ' + Math.round(sessionInputTokens / 1000000) + 'M. 코드 탐색/분석/리서치 작업은 Task 에이전트에 위임하여 컨텍스트를 절약하세요.'
    })
  );
  ```
  
  NEW:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `[OMCM 토큰 절약 모드] 세션 입력 토큰 ${Math.round(sessionInputTokens / 1000000)}M. 코드 탐색/분석/리서치 작업은 Task 에이전트에 위임하여 컨텍스트를 절약하세요.`
      }
    })
  );
  ```

  **Edit Site 4 — Lines 370-389 (handoff keyword detection)**:
  
  OLD:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      message: `🔄 **OpenCode 전환 감지**\n\n키워드 "${detectedKeyword}"가 감지되었습니다.\n\n현재 사용량: ${usageStr}\n\n전환을 진행하려면 터미널에서:\n\`\`\`bash\ncd ${projectDir} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh\n\`\`\`\n\n또는 컨텍스트만 저장:\n\`\`\`bash\n/opt/oh-my-claude-money/scripts/export-context.sh\n\`\`\``,
    })
  );
  ```
  
  NEW:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `🔄 **OpenCode 전환 감지**\n\n키워드 "${detectedKeyword}"가 감지되었습니다.\n\n현재 사용량: ${usageStr}\n\n전환을 진행하려면 터미널에서:\n\`\`\`bash\ncd ${projectDir} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh\n\`\`\`\n\n또는 컨텍스트만 저장:\n\`\`\`bash\n/opt/oh-my-claude-money/scripts/export-context.sh\n\`\`\``
      }
    })
  );
  ```

  **Edit Site 5 — Lines 401-416 (usage threshold detection)**:
  
  OLD:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      message: `⚠️ **사용량 임계치 도달**\n\n${typeLabel} 사용량이 **${thresholdCheck.percent}%**에 도달했습니다.\n\n작업 연속성을 위해 OpenCode로 전환을 권장합니다:\n\`\`\`bash\ncd ${projectDir} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh\n\`\`\`\n\n계속 사용하시려면 이 메시지를 무시하세요.`,
    })
  );
  ```
  
  NEW:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `⚠️ **사용량 임계치 도달**\n\n${typeLabel} 사용량이 **${thresholdCheck.percent}%**에 도달했습니다.\n\n작업 연속성을 위해 OpenCode로 전환을 권장합니다:\n\`\`\`bash\ncd ${projectDir} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh\n\`\`\`\n\n계속 사용하시려면 이 메시지를 무시하세요.`
      }
    })
  );
  ```

  **Must NOT do**:
  - Do not change `{ continue: true }` passthrough outputs (lines 303, 420, 424)
  - Do not change any logic, conditions, imports, or function signatures
  - Do not modify string content (preserve exact emoji, newlines, backtick fences)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical text replacement in a single file; no complex reasoning
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands JS/MJS module syntax, template literals, JSON.stringify patterns

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: No UI work
  - `git-master`: Commit handled separately
  - `python-programmer`: Not Python

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:
  - `src/hooks/detect-handoff.mjs:296-427` — Full main() function containing all 5 edit sites
  - `hooks/hooks.json:37-48` — Confirms this hook runs on `UserPromptSubmit` event
  - `@anthropic-ai/claude-agent-sdk coreTypes.d.ts:267-268` — SDK type: `{hookEventName: 'UserPromptSubmit', additionalContext?: string}`
  - `omc/scripts/keyword-detector.mjs:199-207` — Reference implementation of `createHookOutput()` helper

  **Acceptance Criteria**:

  ```bash
  # Syntax check
  node --check src/hooks/detect-handoff.mjs
  # Assert: exit code 0, no output
  ```

  ```bash
  # Verify no remaining legacy fields
  grep -n '"message":' src/hooks/detect-handoff.mjs
  grep -n 'systemMessage' src/hooks/detect-handoff.mjs
  # Assert: No matches (exit code 1 from grep = good)
  ```

  ```bash
  # Verify hookSpecificOutput present (5 sites)
  grep -c 'hookSpecificOutput' src/hooks/detect-handoff.mjs
  # Assert: output is "5"
  ```

  ```bash
  # Verify hookEventName
  grep -c "hookEventName: 'UserPromptSubmit'" src/hooks/detect-handoff.mjs
  # Assert: output is "5"
  ```

  ```
  # LSP diagnostics
  lsp_diagnostics(file="src/hooks/detect-handoff.mjs", severity="error")
  # Assert: 0 errors
  ```

  **Commit**: YES (groups with 2, 3)
  - Message: `fix(hooks): migrate hook outputs to hookSpecificOutput API`
  - Files: `src/hooks/detect-handoff.mjs`, `src/hooks/persistent-mode.mjs`, `hooks/bash-optimizer.mjs`
  - Pre-commit: `node --check src/hooks/detect-handoff.mjs && node --check src/hooks/persistent-mode.mjs && node --check hooks/bash-optimizer.mjs`

---

- [ ] 2. Migrate persistent-mode.mjs outputs to hookSpecificOutput

  **What to do**:
  
  Replace 2 output sites that use `message:` with `hookSpecificOutput` wrapper. Keep `continue: true`. 
  
  **⚠️ RISK: hookEventName for Stop hooks** — The SDK type union does NOT include `'Stop'`. User must decide approach. The plan assumes user will provide direction; default recommendation is to keep `message` for now (Option B from Risks section).

  **IF user chooses to migrate (Option A or C):**

  **Edit Site 1 — Lines 142-155 (ralph mode active, incomplete verification)**:
  
  OLD:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      message: `⚠️ **Ralph 모드 활성화 상태**\n\n작업이 아직 완료되지 않았습니다.\n\n**미완료 검증 항목**: ${verification.missing.join(', ')}\n**반복 횟수**: ${ralphMode.iterations || 0}회${blockersStr}\n\n작업을 계속하시겠습니까? 강제 종료: \`cancel --force\``,
    })
  );
  ```
  
  NEW (if migrating):
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext: `⚠️ **Ralph 모드 활성화 상태**\n\n작업이 아직 완료되지 않았습니다.\n\n**미완료 검증 항목**: ${verification.missing.join(', ')}\n**반복 횟수**: ${ralphMode.iterations || 0}회${blockersStr}\n\n작업을 계속하시겠습니까? 강제 종료: \`cancel --force\``
      }
    })
  );
  ```

  **Edit Site 2 — Lines 165-176 (other active modes notification)**:
  
  OLD:
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      message: `ℹ️ **활성 모드 감지**\n\n다음 모드가 활성화되어 있습니다:\n${modeList}\n\n종료하려면 \`cancel\` 명령을 사용하세요.`,
    })
  );
  ```
  
  NEW (if migrating):
  ```javascript
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext: `ℹ️ **활성 모드 감지**\n\n다음 모드가 활성화되어 있습니다:\n${modeList}\n\n종료하려면 \`cancel\` 명령을 사용하세요.`
      }
    })
  );
  ```

  **Must NOT do**:
  - Do not change `{ continue: true }` passthrough outputs (lines 127, 180, 184)
  - Do not change checkActiveStates(), checkVerificationStatus(), or any logic
  - Do not modify string content

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical text replacement, single file, 2 sites
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: JS/MJS syntax awareness

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: No UI work
  - `git-master`: Commit grouped with Task 1

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None (but execution depends on user risk decision)

  **References**:
  - `src/hooks/persistent-mode.mjs:118-186` — Full main() function with both edit sites
  - `hooks/hooks.json:61-71` — Confirms this hook runs on `Stop` event
  - `@anthropic-ai/claude-agent-sdk coreTypes.d.ts:261-293` — SDK types (NOTE: no `Stop` variant)
  - OMC CHANGELOG: "Removed `hookSpecificOutput` with unrecognized `SessionEnd` event" — precedent for unrecognized events being stripped

  **Acceptance Criteria**:

  ```bash
  # Syntax check
  node --check src/hooks/persistent-mode.mjs
  # Assert: exit code 0
  ```

  ```bash
  # If migrated: verify no remaining legacy fields
  grep -n '"message":' src/hooks/persistent-mode.mjs
  # Assert: No matches (exit code 1)
  ```

  ```bash
  # If migrated: verify hookSpecificOutput present
  grep -c 'hookSpecificOutput' src/hooks/persistent-mode.mjs
  # Assert: output is "2"
  ```

  ```
  # LSP diagnostics
  lsp_diagnostics(file="src/hooks/persistent-mode.mjs", severity="error")
  # Assert: 0 errors
  ```

  **Commit**: YES (groups with 1, 3)
  - Message: grouped with Task 1
  - Files: `src/hooks/persistent-mode.mjs`

---

- [ ] 3. Migrate bash-optimizer.mjs output to hookSpecificOutput

  **What to do**:
  
  Replace 1 output site that uses `systemMessage:` with `hookSpecificOutput` wrapper. Keep `allow: true`. Use `hookEventName: 'PreToolUse'`.

  **Edit Site 1 — Lines 61-64 (delegation suggestion)**:
  
  OLD:
  ```javascript
  console.log(JSON.stringify({
    allow: true,
    systemMessage: '[OMCM 토큰 절약 힌트] ' + result.suggestion
  }));
  ```
  
  NEW:
  ```javascript
  console.log(JSON.stringify({
    allow: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: '[OMCM 토큰 절약 힌트] ' + result.suggestion
    }
  }));
  ```

  **NOTE**: This file uses string concatenation (not template literals) — preserve as-is. The user's template literal requirement is specific to detect-handoff.mjs.

  **Must NOT do**:
  - Do not change `{ allow: true }` passthrough outputs (lines 36, 55, 66, 70)
  - Do not change session ID acquisition, counter module, or any logic
  - Do not modify string content

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single edit site, mechanical replacement
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: JS/MJS syntax

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: No UI
  - `git-master`: Commit grouped with Task 1

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:
  - `hooks/bash-optimizer.mjs:32-73` — Full main() function with edit site
  - `hooks/hooks.json:26-35` — Confirms this hook runs on `PreToolUse` event with `Bash` matcher
  - `@anthropic-ai/claude-agent-sdk coreTypes.d.ts:261-265` — SDK type: `{hookEventName: 'PreToolUse', permissionDecision?, updatedInput?}`
  - `hooks/read-optimizer.mjs:59-67` — Sibling hook with identical pattern (also needs migration, but NOT in scope)
  - `omc/scripts/pre-tool-enforcer.mjs:118-119` — OMC reference using `hookEventName: 'PreToolUse'` with `additionalContext`

  **NOTE on PreToolUse type**: The SDK type for `PreToolUse` uses `permissionDecision` / `updatedInput`, not `additionalContext`. However, the OMC reference implementation (`pre-tool-enforcer.mjs`) uses `additionalContext` on PreToolUse. This suggests the SDK types may be incomplete or `additionalContext` works as a generic field. The OMC pattern should be followed.

  **Acceptance Criteria**:

  ```bash
  # Syntax check
  node --check hooks/bash-optimizer.mjs
  # Assert: exit code 0
  ```

  ```bash
  # Verify no remaining legacy field
  grep -n 'systemMessage' hooks/bash-optimizer.mjs
  # Assert: No matches (exit code 1)
  ```

  ```bash
  # Verify hookSpecificOutput present
  grep -c 'hookSpecificOutput' hooks/bash-optimizer.mjs
  # Assert: output is "1"
  ```

  ```
  # LSP diagnostics
  lsp_diagnostics(file="hooks/bash-optimizer.mjs", severity="error")
  # Assert: 0 errors
  ```

  **Commit**: YES (groups with 1, 2)
  - Message: grouped with Task 1
  - Files: `hooks/bash-optimizer.mjs`

---

- [ ] 4. Verification across all files

  **What to do**:
  After all edits complete, run comprehensive verification.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running verification commands only
  - **Skills**: []
    - No special skills needed for running commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after all Wave 1 tasks)
  - **Blocks**: None (final)
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - All three target files (post-edit)

  **Acceptance Criteria**:

  ```bash
  # Syntax check all 3 files
  node --check src/hooks/detect-handoff.mjs && \
  node --check src/hooks/persistent-mode.mjs && \
  node --check hooks/bash-optimizer.mjs
  # Assert: exit code 0
  ```

  ```bash
  # Run existing test suite to verify no regressions
  node --test tests/**/*.test.mjs
  # Assert: All tests pass
  ```

  ```bash
  # Verify zero legacy message/systemMessage in modified files
  grep -rn '"message":' src/hooks/detect-handoff.mjs src/hooks/persistent-mode.mjs hooks/bash-optimizer.mjs
  grep -rn 'systemMessage' src/hooks/detect-handoff.mjs hooks/bash-optimizer.mjs
  # Assert: No matches (or only persistent-mode.mjs if user chose Option B)
  ```

  ```
  # LSP diagnostics on all files
  lsp_diagnostics_directory(directory="/opt/oh-my-claude-money", strategy="auto")
  # Assert: 0 new errors introduced
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1+2+3 | `fix(hooks): migrate hook outputs to hookSpecificOutput API` | `src/hooks/detect-handoff.mjs`, `src/hooks/persistent-mode.mjs`, `hooks/bash-optimizer.mjs` | `node --check` on all 3 files |

**Rationale for single commit**: All three files are part of the same API migration. They form one atomic change — reverting any one file alone would leave an inconsistent state.

---

## Success Criteria

### Verification Commands
```bash
node --check src/hooks/detect-handoff.mjs   # Expected: exit 0
node --check src/hooks/persistent-mode.mjs  # Expected: exit 0
node --check hooks/bash-optimizer.mjs       # Expected: exit 0
node --test tests/**/*.test.mjs             # Expected: all pass
```

### Final Checklist
- [ ] All "Must Have" present (hookSpecificOutput with correct hookEventName)
- [ ] All "Must NOT Have" absent (no logic changes, no extra files modified)
- [ ] All message content character-identical to original
- [ ] Template literals used in detect-handoff.mjs (including converted systemMessage sites)
- [ ] Risk decision for persistent-mode.mjs documented and implemented
