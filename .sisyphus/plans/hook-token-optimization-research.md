# Claude Code Hook System Research for Token Optimization

## TL;DR

> **Quick Summary**: Systematically document the Claude Code hook system's capabilities — matchers, stdin/stdout schemas, blocking behavior, and output interception — to produce a definitive capability matrix informing token optimization strategies.
>
> **Deliverables**:
> - Capability matrix: hook type × capability × confirmed/unconfirmed
> - Complete stdin/stdout JSON schema per hook event type
> - Empirical validation of 5 critical assumptions via test hooks
> - Token optimization opportunity map with estimated savings
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (document known) → Task 2+3 (validate unknowns in parallel) → Task 4 (synthesize) → Task 5 (opportunity map)

---

## Context

### Original Request
Research Claude Code hook system for token optimization. Specific needs:
1. Hook matchers available — tool name matching (Read, Bash, Edit, Grep, Glob, Write, Task, etc.)
2. PreToolUse blocking behavior on `{decision:block}` / `{allow:false}`
3. Full documentation of hook capabilities: intercept output, modify input, stdin/stdout schema
4. Registration format in plugin.json and hooks.json
5. Hook specifications in ~/.claude/plugins/ and project docs

### Research Already Completed (Pre-Plan Evidence)

**Files read with full evidence:**

| File | Key Finding |
|------|-------------|
| `/opt/oh-my-claude-money/hooks/hooks.json` (55 lines) | OMCM hook registration: PreToolUse→Task, UserPromptSubmit, SessionStart, Stop |
| `/opt/oh-my-claude-money/hooks/fusion-router.mjs` (213 lines) | PreToolUse handler: reads stdin JSON, returns `{allow:false, reason, message}` to block |
| `/opt/oh-my-claude-money/src/hooks/detect-handoff.mjs` (330 lines) | UserPromptSubmit handler: reads stdin, returns `{continue:true, message}` |
| `/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs` (190 lines) | Stop handler: reads stdin, returns `{continue:true, message}` |
| `/opt/oh-my-claude-money/src/hooks/session-start.mjs` (185 lines) | SessionStart handler: no stdin needed, returns `{continue:true, message}` |
| `/opt/oh-my-claude-money/src/hooks/fusion-router-logic.mjs` (592 lines) | Core routing logic, shouldRouteToOpenCode(), agent mapping |
| `/opt/oh-my-claude-money/.claude-plugin/plugin.json` (7 lines) | Minimal: name, version, description, skills path — no hooks here |
| `/root/.claude/settings.json` (101 lines) | Live hook configuration with PreToolUse, PostToolUse, PreCompact, Notification, SessionStart |
| `/root/.claude/plugins/marketplaces/omc/hooks/hooks.json` (153 lines) | OMC hooks: 11 event types including SubagentStart/Stop, Setup, PermissionRequest |
| `/root/.claude/plugins/marketplaces/omc/examples/hooks.json` (95 lines) | Example hooks with `$schema` reference, `type: "block"`, `type: "message"` patterns |

### Metis Review Findings

**Critical gaps identified:**
1. PostToolUse output interception — can hooks modify what Claude sees? (highest-value for token optimization)
2. SubagentStart/Stop hook capabilities — can they modify prompts or intercept responses?
3. Hook failure modes (crash, timeout, invalid JSON)
4. Can PreToolUse return modified `tool_input`? Or strictly allow/block?
5. PreCompact hook — can it influence what gets compacted?

**Assumptions requiring empirical validation:**
- `message` in PreToolUse block response IS injected as tool output to Claude
- PostToolUse hooks can modify what Claude receives (not just fire-and-forget)
- Matchers are exact tool name match or `|`-separated, not regex/glob
- Hooks receive full `tool_input` on stdin (not truncated)

---

## Work Objectives

### Core Objective
Produce a complete, empirically-validated capability matrix of Claude Code hooks, focused on token optimization opportunities.

### Concrete Deliverables
- `.sisyphus/drafts/hook-capability-matrix.md` — definitive reference document

### Definition of Done
- [ ] All 12 hook event types documented with stdin/stdout schemas
- [ ] 5 critical assumptions empirically validated via test hooks
- [ ] Capability matrix completed with CONFIRMED/UNCONFIRMED status per cell
- [ ] Token optimization opportunities identified with estimated savings per strategy
- [ ] All claims backed by file:line citations or empirical test results

### Must Have
- Exact JSON schemas for stdin/stdout per hook event type (with field types)
- Confirmed behavior for: PreToolUse block, PostToolUse output mutation, matcher syntax
- Evidence for every claim (file path or test result)

### Must NOT Have (Guardrails)
- NO implementation of optimization hooks (research only)
- NO modification to production hook files
- NO "hook framework" design — only capability documentation
- NO unbounded exploration of all 12 event types equally — prioritize token-relevant hooks
- NO assumptions marked as confirmed without empirical test

---

## Verification Strategy (MANDATORY)

### Research Verification Approach
This is research, so verification = accuracy + completeness:

| Criterion | How to Verify |
|-----------|---------------|
| Schema accuracy | Test hooks that log stdin, compare with documented schema |
| Blocking behavior | Test hook that blocks Read, observe Claude's response |
| Output interception | PostToolUse hook returning modified content, check Claude's behavior |
| Matcher syntax | Test partial match "Rea" vs exact "Read" — confirm behavior |
| Capability matrix complete | Every cell marked CONFIRMED, UNCONFIRMED, or N/A |

### Automated Verification

```bash
# Verify test hook outputs exist
ls -la /tmp/hook-test-results/
# Each test should produce a JSON log file
cat /tmp/hook-test-results/test-*.json
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start immediately):
└── Task 1: Document all KNOWN hook capabilities from evidence already gathered

Wave 2 (After Wave 1, parallel):
├── Task 2: Empirical validation — PreToolUse (block, modify, matcher syntax)
└── Task 3: Empirical validation — PostToolUse (output interception, SubagentStop)

Wave 3 (After Wave 2):
├── Task 4: Synthesize capability matrix
└── Task 5: Token optimization opportunity map

Critical Path: Task 1 → Task 2 → Task 4 → Task 5
Parallel Speedup: ~30% (Wave 2 runs 2 tests in parallel)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4 | 3 |
| 3 | 1 | 4 | 2 |
| 4 | 2, 3 | 5 | None |
| 5 | 4 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1 | `delegate_task(category="quick", load_skills=[])` |
| 2 | 2, 3 | 2x `delegate_task(category="unspecified-high", load_skills=[], run_in_background=true)` |
| 3 | 4, 5 | `delegate_task(category="writing", load_skills=[])` then `delegate_task(category="unspecified-low", load_skills=[])` |

---

## TODOs

- [ ] 1. Document Known Hook Capabilities (from pre-gathered evidence)

  **What to do**:
  - Compile ALL evidence from the research phase into a structured document
  - For each of 12 hook event types, document:
    - Registration format in hooks.json
    - Matcher syntax and semantics
    - stdin JSON schema (with field types and examples)
    - stdout JSON schema (with field types and examples)
    - Known behavior (blocking, advisory, fire-and-forget)
  - Mark capabilities as CONFIRMED (have file evidence) or NEEDS_VALIDATION
  - Create initial capability matrix skeleton

  **Token-relevant hook types to prioritize** (per Metis):
  - PreToolUse (can block/replace tool calls)
  - PostToolUse (can intercept output?)
  - SubagentStart/Stop (can modify agent prompts/responses?)
  - PreCompact (can influence compaction?)
  - UserPromptSubmit (can modify user input?)

  **Must NOT do**:
  - Do not modify any files except the output document
  - Do not mark assumptions as CONFIRMED without file evidence

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Compiling already-gathered evidence, no new research needed
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO (first task, provides foundation)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References** (CRITICAL - All pre-gathered):

  **Hook Registration Formats:**
  - `/opt/oh-my-claude-money/hooks/hooks.json` — OMCM plugin hooks registration (PreToolUse:Task, UserPromptSubmit, SessionStart, Stop)
  - `/root/.claude/settings.json:2-68` — Live system hooks (PreToolUse:Edit|Write, PreToolUse:Task, PostToolUse:Write, PreCompact, Notification, SessionStart)
  - `/root/.claude/plugins/marketplaces/omc/hooks/hooks.json` — OMC hooks (11 event types: UserPromptSubmit, SessionStart, Setup, PreToolUse, PermissionRequest, PostToolUse, SubagentStart, SubagentStop, PreCompact, Stop, SessionEnd)
  - `/root/.claude/plugins/marketplaces/omc/examples/hooks.json` — Example hooks with `$schema`, `type: "block"`, `type: "message"` patterns
  - `/root/.claude/plugins/marketplaces/claude-plugins-official/plugins/hookify/hooks/hooks.json` — Hookify plugin format (PreToolUse, PostToolUse, Stop, UserPromptSubmit — no matchers)
  - `/root/.claude/plugins/marketplaces/claude-plugins-official/plugins/security-guidance/hooks/hooks.json` — Security plugin (PreToolUse: "Edit|Write|MultiEdit")

  **stdin/stdout Schema Evidence:**
  - `/opt/oh-my-claude-money/hooks/fusion-router.mjs:99-121` — PreToolUse stdin: `{ tool_name: string, tool_input: object }`; stdout: `{ allow: boolean, reason?: string, message?: string }`
  - `/opt/oh-my-claude-money/src/hooks/detect-handoff.mjs:53-73,224-291` — UserPromptSubmit stdin: `{ prompt|message|content|text: string, directory: string }`; stdout: `{ continue: boolean, message?: string }`
  - `/opt/oh-my-claude-money/src/hooks/persistent-mode.mjs:37-57,118-186` — Stop stdin: optional JSON; stdout: `{ continue: boolean, message?: string }`
  - `/opt/oh-my-claude-money/src/hooks/session-start.mjs:122-176` — SessionStart: no stdin required; stdout: `{ continue: boolean, message?: string }`

  **Blocking Behavior Evidence:**
  - `/opt/oh-my-claude-money/hooks/fusion-router.mjs:186-199` — `{ allow: false, reason: "Task executed via OpenCode...", message: outputPreview }` → tool call IS skipped, custom result injected via `message`
  - `/root/.claude/plugins/marketplaces/omc/examples/hooks.json:48-62` — `type: "block"` with `message` field as alternative hook type
  - `/root/.claude/settings.json:17-22` — Shell-based PreToolUse that uses `exit 1` to block (alternative blocking mechanism)

  **Matcher Syntax Evidence:**
  - Exact names: `"Task"`, `"Bash"`, `"Write"` (multiple files)
  - OR syntax: `"Edit|Write"` (`settings.json:16`), `"Edit|Write|MultiEdit"` (security plugin)
  - Wildcard: `"*"` (OMC hooks.json, multiple entries)
  - Empty string: `""` (`settings.json:5` — matches all)
  - Multi-value: `"startup|resume|clear|compact"` (superpowers plugin)
  - Named events: `"init"`, `"maintenance"` (OMC Setup hooks)

  **Acceptance Criteria**:

  ```bash
  # Agent verifies document was created
  test -f /opt/oh-my-claude-money/.sisyphus/drafts/hook-capability-matrix.md && echo "PASS" || echo "FAIL"
  # Verify all 12 event types documented
  grep -c "^###" /opt/oh-my-claude-money/.sisyphus/drafts/hook-capability-matrix.md
  # Should be >= 12
  ```

  - [ ] All 12 hook event types have a section
  - [ ] Each section has: registration format, matcher syntax, stdin schema, stdout schema, behavior
  - [ ] CONFIRMED vs NEEDS_VALIDATION clearly marked per capability
  - [ ] Capability matrix table at end of document

  **Commit**: NO (research output)

---

- [ ] 2. Empirical Validation: PreToolUse Capabilities

  **What to do**:
  - Write minimal test hooks to validate 3 critical PreToolUse assumptions:

  **Test 2A: Block + Custom Message Injection**
  - Create temporary PreToolUse hook on "Read" that returns `{ allow: false, message: "HOOK_INJECTED_RESULT" }`
  - Trigger a Read tool call
  - Observe: Does Claude receive "HOOK_INJECTED_RESULT" as if it were the file content?
  - Log results to `/tmp/hook-test-results/test-2a.json`

  **Test 2B: Matcher Syntax Validation**
  - Test matchers: `"Read"` (exact), `"Rea"` (partial), `"Read|Write"` (OR), `"read"` (case), `"*"` (wildcard)
  - For each: does the hook fire?
  - Log results to `/tmp/hook-test-results/test-2b.json`

  **Test 2C: Can PreToolUse Modify tool_input?**
  - Return `{ allow: true, tool_input: { ...modified } }` from PreToolUse
  - Check if the tool receives the modified input
  - Log results to `/tmp/hook-test-results/test-2c.json`

  **IMPORTANT**: All test hooks must be temporary. Remove after testing. Use `/tmp/` for test scripts.

  **Must NOT do**:
  - Do not modify production hooks
  - Do not leave test hooks installed after validation
  - Do not block safety-critical tools

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires careful hook scripting, observation, and interpretation
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not browser testing
    - `git-master`: No commits needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References (how existing hooks work):**
  - `/opt/oh-my-claude-money/hooks/fusion-router.mjs:97-121` — stdin reading pattern: `for await (var chunk of process.stdin) { input += chunk; }`
  - `/opt/oh-my-claude-money/hooks/fusion-router.mjs:186-199` — Blocking response pattern: `{ allow: false, reason, message }`
  - `/opt/oh-my-claude-money/hooks/fusion-router.mjs:204` — Allow response pattern: `{ allow: true }`
  - `/root/.claude/settings.json:14-34` — How hooks are registered in settings.json format
  - `/root/.claude/plugins/marketplaces/omc/examples/hooks.json:36-61` — Example PreToolUse with "Write" matcher and `type: "block"` alternative

  **Acceptance Criteria**:

  ```bash
  # Agent runs after tests complete:
  ls /tmp/hook-test-results/test-2*.json
  # Expected: test-2a.json, test-2b.json, test-2c.json exist
  
  cat /tmp/hook-test-results/test-2a.json | jq '.messageInjected'
  # Expected: true or false (empirical result)
  
  cat /tmp/hook-test-results/test-2b.json | jq '.matcherResults'
  # Expected: object with exact/partial/or/case/wildcard results
  ```

  - [ ] 3 test scripts created in /tmp/, executed, results logged
  - [ ] Each test has clear CONFIRMED or REJECTED conclusion
  - [ ] All temporary hooks removed after testing
  - [ ] Results documented in JSON format

  **Commit**: NO (research only, temp files)

---

- [ ] 3. Empirical Validation: PostToolUse & Subagent Hooks

  **What to do**:
  - Write minimal test hooks to validate PostToolUse and SubagentStart/Stop capabilities:

  **Test 3A: PostToolUse Output Interception**
  - Create PostToolUse hook on "Read" that logs the complete stdin it receives
  - Trigger a Read tool call
  - Examine: Does stdin include the tool's output? What's the full schema?
  - Log stdin to `/tmp/hook-test-results/test-3a-stdin.json`

  **Test 3B: PostToolUse Output Modification**
  - Create PostToolUse hook that returns modified content on stdout
  - Check: Does Claude see the original or modified output?
  - Log results to `/tmp/hook-test-results/test-3b.json`

  **Test 3C: SubagentStart stdin Schema**
  - Create SubagentStart hook that logs stdin
  - Trigger a Task/subagent call
  - Document the full stdin schema (does it include prompt, agent type, etc.?)
  - Log to `/tmp/hook-test-results/test-3c-stdin.json`

  **Test 3D: Hook Failure Behavior**
  - Create a hook that: (a) exits with code 1, (b) outputs invalid JSON, (c) exceeds timeout
  - For each: does the tool proceed (fail-open) or block (fail-closed)?
  - Log to `/tmp/hook-test-results/test-3d.json`

  **IMPORTANT**: Remove all test hooks after validation.

  **Must NOT do**:
  - Do not modify production hooks
  - Do not leave test hooks installed
  - Do not break active session

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex hook testing with observation and interpretation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **PostToolUse patterns:**
  - `/root/.claude/settings.json:36-45` — PostToolUse:Write hook that runs prettier
  - `/root/.claude/plugins/marketplaces/omc/hooks/hooks.json:79-141` — OMC PostToolUse hooks with `"*"` matcher

  **SubagentStart/Stop patterns:**
  - `/root/.claude/plugins/marketplaces/omc/hooks/hooks.json:91-114` — SubagentStart/Stop hooks: `subagent-tracker.mjs start|stop`

  **Environment variables:**
  - `$CLAUDE_TOOL_INPUT` — used in `settings.json:20` for inline hook scripts
  - `$CLAUDE_PLUGIN_ROOT` — used in plugin hooks.json for script paths
  - `$CLAUDE_NOTIFICATION` — used in `settings.json:64` for notifications
  - `$FILE_PATH` — referenced in example hooks

  **Acceptance Criteria**:

  ```bash
  ls /tmp/hook-test-results/test-3*.json
  # Expected: test-3a-stdin.json, test-3b.json, test-3c-stdin.json, test-3d.json
  
  cat /tmp/hook-test-results/test-3a-stdin.json | jq 'keys'
  # Expected: shows PostToolUse stdin schema fields
  
  cat /tmp/hook-test-results/test-3d.json | jq '.failureMode'
  # Expected: "fail-open" or "fail-closed"
  ```

  - [ ] 4 test scripts created, executed, results logged
  - [ ] PostToolUse stdin schema fully documented
  - [ ] Output interception capability confirmed or rejected
  - [ ] SubagentStart stdin schema documented
  - [ ] Failure modes documented (exit 1, bad JSON, timeout)
  - [ ] All temporary hooks removed

  **Commit**: NO (research only)

---

- [ ] 4. Synthesize Complete Capability Matrix

  **What to do**:
  - Combine Task 1 (documented capabilities) + Task 2 (PreToolUse validation) + Task 3 (PostToolUse/Subagent validation)
  - Produce the definitive capability matrix:

  ```
  | Hook Event Type     | Can Block? | Can Inject Custom Result? | Can Modify Input? | Can Intercept Output? | Matcher Syntax | Confirmed? |
  |---------------------|-----------|--------------------------|-------------------|----------------------|---------------|------------|
  | PreToolUse          | ?         | ?                        | ?                 | N/A                  | exact|OR|*    | ?          |
  | PostToolUse         | N/A       | ?                        | N/A               | ?                    | ?             | ?          |
  | UserPromptSubmit    | ?         | ?                        | ?                 | N/A                  | ?             | ?          |
  | ...                 | ...       | ...                      | ...               | ...                  | ...           | ...        |
  ```

  - Fill every `?` with CONFIRMED, REJECTED, or UNCONFIRMED (with reason)
  - Include complete stdin/stdout JSON schemas per hook type
  - Include matcher syntax reference table
  - Write to `.sisyphus/drafts/hook-capability-matrix.md`

  **Must NOT do**:
  - Do not drop any test results
  - Do not mark UNCONFIRMED as CONFIRMED
  - Do not add implementation recommendations (save for Task 5)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation synthesis from research inputs
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, needs Wave 2)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2, Task 3

  **References**:
  - Task 1 output: initial capability document
  - Task 2 results: `/tmp/hook-test-results/test-2*.json`
  - Task 3 results: `/tmp/hook-test-results/test-3*.json`
  - All file references from Task 1

  **Acceptance Criteria**:

  ```bash
  # Document exists
  test -f /opt/oh-my-claude-money/.sisyphus/drafts/hook-capability-matrix.md && echo "PASS"
  
  # Matrix table exists with all 12 event types
  grep -c "^|" /opt/oh-my-claude-money/.sisyphus/drafts/hook-capability-matrix.md
  # Expected: >= 14 (header + separator + 12 rows)
  
  # No unresolved placeholders
  grep -c "?" /opt/oh-my-claude-money/.sisyphus/drafts/hook-capability-matrix.md
  # Expected: 0 (all resolved to CONFIRMED/REJECTED/UNCONFIRMED)
  ```

  - [ ] Matrix covers all 12 hook event types
  - [ ] Every capability cell resolved (no `?` remaining)
  - [ ] Complete stdin/stdout schema per event type
  - [ ] Matcher syntax reference table included
  - [ ] All evidence cited (file:line or test result)

  **Commit**: NO (research output)

---

- [ ] 5. Token Optimization Opportunity Map

  **What to do**:
  - Using the capability matrix from Task 4, identify concrete token optimization strategies
  - For each strategy:
    - Which hook event type(s) involved
    - What the hook would do
    - Estimated token savings (rough: low/medium/high)
    - Implementation complexity (low/medium/high)
    - Risk assessment (what could go wrong)
  - Prioritize by: savings/complexity ratio
  - Append as "## Token Optimization Opportunities" section in the capability matrix document

  **Strategies to evaluate** (from Metis analysis + evidence):
  1. **PreToolUse Read blocking**: Intercept large file reads, return summarized content
  2. **PostToolUse output trimming**: Truncate verbose tool outputs before Claude processes them
  3. **SubagentStart prompt optimization**: Trim redundant context from subagent prompts
  4. **PreCompact hook**: Influence what gets preserved during context compaction
  5. **PreToolUse Task routing**: Route subagent calls to cheaper models (OMCM already does this — document as baseline)
  6. **PostToolUse Grep/Glob trimming**: Reduce large search result sets

  **Must NOT do**:
  - Do not implement any hooks
  - Do not claim savings without capability matrix evidence
  - Do not recommend strategies for REJECTED/UNCONFIRMED capabilities

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Analysis and strategy evaluation, moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 4)
  - **Blocks**: None (final)
  - **Blocked By**: Task 4

  **References**:
  - Task 4 output: capability matrix
  - `/opt/oh-my-claude-money/hooks/fusion-router.mjs` — existing PreToolUse:Task routing (baseline for strategy 5)
  - `/opt/oh-my-claude-money/src/hooks/fusion-router-logic.mjs:194-327` — shouldRouteToOpenCode() logic showing current token-saving approach

  **Acceptance Criteria**:

  ```bash
  # Opportunities section exists
  grep -c "Token Optimization" /opt/oh-my-claude-money/.sisyphus/drafts/hook-capability-matrix.md
  # Expected: >= 1
  
  # At least 3 strategies documented
  grep -c "^### Strategy" /opt/oh-my-claude-money/.sisyphus/drafts/hook-capability-matrix.md
  # Expected: >= 3
  ```

  - [ ] >= 3 strategies documented with savings/complexity/risk
  - [ ] Each strategy cites specific capability matrix evidence
  - [ ] No strategies based on REJECTED capabilities
  - [ ] Priority ranking included
  - [ ] Existing OMCM fusion routing documented as baseline

  **Commit**: NO (research output)

---

## Commit Strategy

No commits — this is pure research. All outputs go to `.sisyphus/drafts/hook-capability-matrix.md`.

---

## Success Criteria

### Final Checklist
- [ ] All 12 hook event types documented with schemas
- [ ] 5+ critical assumptions empirically validated
- [ ] Capability matrix complete (zero `?` cells)
- [ ] Token optimization opportunity map with >= 3 strategies
- [ ] All claims backed by file:line citation or test evidence
- [ ] Zero production files modified
- [ ] All test hooks removed after validation
- [ ] Findings document at `.sisyphus/drafts/hook-capability-matrix.md`
