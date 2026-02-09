# Ultra* Fusion-Mode Matching Audit Plan

## TL;DR

> **Quick Summary**: Read-only audit validating that all ultra* fusion-mode features (ultrawork, ultrapilot, ultraqa, hulw, ulw, autopilot) are consistently wired across 6 integration points: skills, fusion-router, agent-fusion-map, HUD mode-detector, OMC skill linkage, and hooks Task matcher.
>
> **Deliverables**:
> - Table 1: Ultra* Feature x 6 Integration Areas matrix (PASS/FAIL per cell)
> - Table 2: Missing/mismatch items with file:line evidence and recommended actions
> - Bonus Table 3: Dual-mapping-system consistency audit (fusion-router-logic.mjs vs agent-fusion-map.mjs)
>
> **Estimated Effort**: Medium (read-only analysis, no code changes)
> **Parallel Execution**: YES - 7 waves (6 area audits + 1 cross-ref, all parallel; then 1 synthesis)
> **Critical Path**: All area tasks (parallel) -> Synthesis (sequential)

---

## Context

### Original Request
Produce a precise, step-by-step audit plan for validating ultra* fusion-mode matching. NO code changes. Include explicit success criteria for: skills presence, fusion-router matching, agent-fusion-map mapping, HUD mode detector display, OMC skill linkage, hooks Task matcher support. Output two tables: (1) Feature vs matching status; (2) Missing/mismatch items with recommended actions.

### Interview Summary
**Key Discussions**: N/A - requirements fully specified in request.

**Research Findings**:
- **Dual mapping systems discovered**: `mapAgentToOpenCode()` in fusion-router-logic.mjs (string-based: Oracle/Flash/Codex) vs `FUSION_MAP` in agent-fusion-map.mjs (object-based: OPUS/CODEX/FLASH). These can silently diverge.
- **`hulw` NOT in mode-detector**: mode-detector.mjs detects 8 modes but `hulw`/`hybrid-ultrawork` is absent. May be by-design (hulw activates `ultrawork` internally).
- **`hybrid-ultrawork` skill is alias for `hulw`**: Three skill directories exist (hulw/, ulw/, hybrid-ultrawork/) but hybrid-ultrawork/SKILL.md says "이 스킬은 hulw 스킬과 동일합니다".
- **`analyst` agent inconsistency**: Missing from both `TOKEN_SAVING_AGENTS` and `CLAUDE_ONLY_AGENTS` but present in `getRoutingLevel()` L4 list.

### Metis Review
**Identified Gaps** (addressed):
- Dual-mapping consistency check added as Task 7
- hulw-not-in-mode-detector classified as known edge case in Task 4
- `analyst` agent gap flagged in Task 7 acceptance criteria
- Read-only enforcement guardrail added to all tasks
- Table column schemas frozen before execution

---

## Work Objectives

### Core Objective
Verify end-to-end consistency of ultra* fusion-mode features across all 6 integration surfaces in the OMCM codebase, producing structured pass/fail evidence tables.

### Concrete Deliverables
- `Table 1`: 6-row x 7-column matrix (6 features x 6 areas + Overall status)
- `Table 2`: N-row table of all FAIL items with file:line evidence and recommended actions
- `Table 3`: Agent-level consistency audit between dual mapping systems

### Definition of Done
- [ ] Every cell in Table 1 is PASS or FAIL (no blanks, no "needs review")
- [ ] Every FAIL has a file:line reference in Table 2
- [ ] Every row in Table 2 has a 1-sentence recommended action
- [ ] Table 3 lists every agent appearing in either mapping system

### Must Have
- PASS/FAIL status for all 36 cells (6 features x 6 areas)
- File:line evidence for every finding
- Dual-mapping consistency report

### Must NOT Have (Guardrails)
- NO code changes - read-only audit only
- NO Bash tool calls - only Read, Glob, Grep
- NO scope expansion to ecomode, ralph, swarm, pipeline (these are not ultra* features)
- NO "partial pass" or "needs review" status - strict PASS/FAIL only
- NO code quality commentary or refactoring suggestions
- NO runtime verification - static analysis only
- ONLY files under `/opt/oh-my-claude-money/` (no external paths)

---

## Frozen Scope: Ultra* Features

| ID | Feature | Skills Directory | Aliases | Notes |
|----|---------|-----------------|---------|-------|
| F1 | `ultrawork` | N/A (OMC-native) | ulw, /ulw | OMC's parallel execution mode |
| F2 | `ultrapilot` | N/A (OMC-native) | N/A | Parallel autopilot (OMC 3.4) |
| F3 | `ultraqa` | N/A (OMC-native) | N/A | QA cycling (OMC 3.4) |
| F4 | `hulw` | `skills/hulw/` | hybrid ultrawork, hybrid-ultrawork | OMCM hybrid ultrawork |
| F5 | `ulw` | `skills/ulw/` | ultrawork | OMCM auto-fusion ultrawork |
| F6 | `autopilot` | `skills/autopilot/` | hybrid autopilot | OMCM hybrid autopilot |

**Note**: `skills/hybrid-ultrawork/` is an alias for `hulw` (confirmed in SKILL.md line 16). Counted once under F4.

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (node:test framework, 361 tests)
- **User wants tests**: NO (audit-only, no code changes)
- **Framework**: N/A

### Automated Verification (Agent-Executable)

All verification is via static file analysis using Read, Glob, Grep tools:

| Verification Type | Tool | Method |
|-------------------|------|--------|
| File existence | `Glob` | Pattern match for expected paths |
| Keyword presence | `Grep` | Regex search in target files |
| Cross-reference | `Read` | Read specific line ranges, compare values |
| Structural check | `Read` | Parse JSON/JS exports, verify completeness |

**Evidence Requirements:**
- Every PASS/FAIL includes the exact file path and line number(s) checked
- For FAIL: quote the expected content and what was actually found (or "NOT FOUND")

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - ALL parallel):
├── Task 1: Area 1 - Skills Presence Audit
├── Task 2: Area 2 - Fusion-Router Matching Audit
├── Task 3: Area 3 - Agent-Fusion-Map Mapping Audit
├── Task 4: Area 4 - HUD Mode Detector Display Audit
├── Task 5: Area 5 - OMC Skill Linkage Audit
├── Task 6: Area 6 - Hooks Task Matcher Support Audit
└── Task 7: Cross-Ref - Dual Mapping System Consistency

Wave 2 (After Wave 1):
└── Task 8: Synthesis - Build Final Tables

No Critical Path bottleneck: 7 tasks parallel -> 1 merge
Parallel Speedup: ~85% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 8 | 2, 3, 4, 5, 6, 7 |
| 2 | None | 8 | 1, 3, 4, 5, 6, 7 |
| 3 | None | 8 | 1, 2, 4, 5, 6, 7 |
| 4 | None | 8 | 1, 2, 3, 5, 6, 7 |
| 5 | None | 8 | 1, 2, 3, 4, 6, 7 |
| 6 | None | 8 | 1, 2, 3, 4, 5, 7 |
| 7 | None | 8 | 1, 2, 3, 4, 5, 6 |
| 8 | 1-7 | None | None (final) |

### Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Independent file existence checks |
| Task 2 | None | Independent grep/read of router logic |
| Task 3 | None | Independent read of agent-fusion-map |
| Task 4 | None | Independent read of mode-detector |
| Task 5 | None | Independent read of skill files |
| Task 6 | None | Independent read of hooks.json |
| Task 7 | None | Independent cross-reference read |
| Task 8 | Tasks 1-7 | Merges all area findings into tables |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1-7 | `delegate_task(category="quick", load_skills=[], run_in_background=true)` x7 |
| 2 | 8 | `delegate_task(category="writing", load_skills=[], run_in_background=false)` |

---

## TODOs

- [ ] 1. Area 1 - Skills Presence Audit

  **What to do**:
  - For each of the 6 ultra* features (F1-F6), check if a SKILL.md file exists under `skills/`
  - Verify `.claude-plugin/plugin.json` contains `"skills": "./skills"` (global registration)
  - For F1 (ultrawork), F2 (ultrapilot), F3 (ultraqa): These are OMC-native. Check if OMCM has any corresponding skill file OR document their absence as "OMC-native, no OMCM skill expected"
  - For F4 (hulw): Verify `skills/hulw/SKILL.md` exists and contains triggers: `hulw`, `/hulw`
  - For F5 (ulw): Verify `skills/ulw/SKILL.md` exists and contains triggers: `ulw`, `/ulw`, `ultrawork`
  - For F6 (autopilot): Verify `skills/autopilot/SKILL.md` exists and contains triggers: `autopilot`, `/autopilot`
  - Check `skills/hybrid-ultrawork/SKILL.md` references hulw as alias (not a separate feature)

  **Must NOT do**:
  - Do NOT use Bash tool
  - Do NOT check OMC's skill files outside `/opt/oh-my-claude-money/`
  - Do NOT create or modify any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file existence and keyword checks
  - **Skills**: [] (no specialized skill needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: Task 8 (synthesis)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `skills/hulw/SKILL.md:1-9` - YAML frontmatter with name, description, triggers
  - `skills/ulw/SKILL.md:1-9` - Same structure
  - `skills/autopilot/SKILL.md:1-12` - Same structure, more triggers
  - `skills/hybrid-ultrawork/SKILL.md:1-12` - Should reference hulw as alias (line 16)

  **API/Type References**:
  - `.claude-plugin/plugin.json:5` - `"skills": "./skills"` registration

  **Acceptance Criteria**:
  ```
  For each feature F1-F6:
  1. Glob: skills/{feature-name}/SKILL.md
  2. If found → Read first 15 lines, verify 'triggers:' section contains expected keywords
  3. If NOT found → Check if OMC-native (F1-F3 expected absent)

  Read .claude-plugin/plugin.json → verify "skills": "./skills" present

  Output structured results:
  | Feature | Skill File Exists | Triggers Valid | plugin.json | Status |
  ```

  **Commit**: NO

---

- [ ] 2. Area 2 - Fusion-Router Matching Audit

  **What to do**:
  - Verify `hooks/fusion-router.mjs` intercepts `Task` tool calls (check `toolName !== 'Task'` guard)
  - Verify `shouldRouteToOpenCode()` handles fusion state for ultra* modes:
    - `hulw` → `fusionState.hulwMode` check in `shouldUseFusionMapping()` (agent-fusion-map.mjs:468)
    - `ulw` → triggers via `shouldRouteToOpenCode()` save-tokens or fusionDefault modes
    - `autopilot` → check if autopilot activates fusion state
  - Verify `wrapWithUlwCommand()` prepends `/ulw` to prompts routed to OpenCode
  - Check `shouldRouteToOpenCode()` decision paths cover:
    - `fusion-disabled` path
    - `fallback-active` path
    - `claude-limit-N%` path
    - `large-task-*` path
    - `session-token-*` path
    - `fusion-default-*` path
    - `token-saving-agent-*` path
  - For F1 (ultrawork), F2 (ultrapilot), F3 (ultraqa): Check if router has any specific handling (expected: no, these are OMC-native execution modes, router handles Task delegation generically)

  **Must NOT do**:
  - Do NOT use Bash tool
  - Do NOT modify files
  - Do NOT execute the router

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Targeted grep and read operations
  - **Skills**: [] (no specialized skill needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-7)
  - **Blocks**: Task 8 (synthesis)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `hooks/fusion-router.mjs:117-121` - Task tool guard: `if (toolName !== 'Task')`
  - `hooks/fusion-router.mjs:124` - `shouldRouteToOpenCode(toolInput)` call
  - `src/hooks/fusion-router-logic.mjs:194-397` - `shouldRouteToOpenCode()` full decision tree
  - `src/hooks/fusion-router-logic.mjs:404-410` - `wrapWithUlwCommand()` /ulw prepend
  - `src/orchestrator/agent-fusion-map.mjs:454-473` - `shouldUseFusionMapping()` with hulwMode check

  **Acceptance Criteria**:
  ```
  1. Read hooks/fusion-router.mjs:117-121 → Verify Task guard present
  2. Grep fusion-router-logic.mjs for 'hulw' → Verify hulwMode handling exists (via shouldUseFusionMapping import)
  3. Read fusion-router-logic.mjs:404-410 → Verify /ulw wrapping logic
  4. Read fusion-router-logic.mjs:194-397 → Catalog all decision paths, verify 7 paths documented above exist
  5. For F1-F3 (OMC-native): Grep for 'ultrawork|ultrapilot|ultraqa' in fusion-router-logic.mjs → Expected: NOT found as specific handlers (generic Task routing covers them)

  Output:
  | Feature | Router Entry | Decision Path | ULW Wrap | Status |
  ```

  **Commit**: NO

---

- [ ] 3. Area 3 - Agent-Fusion-Map Mapping Audit

  **What to do**:
  - Read `src/orchestrator/agent-fusion-map.mjs` FUSION_MAP export
  - Count total agents mapped (header says 29, v0.7.0 added 2 = 31+)
  - Verify all 32 OMC agents from CLAUDE.md are present in FUSION_MAP
  - For each agent, verify tier assignment (HIGH/MEDIUM/LOW) matches documented model:
    - HIGH → OPUS (claude-opus-4-5)
    - MEDIUM → CODEX (gpt-5.2-codex)
    - LOW → FLASH (gemini-3.0-flash)
  - Check `shouldUseFusionMapping()` handles 3 activation modes: save-tokens, fallbackActive, hulwMode
  - Verify `buildOpenCodeCommand()` correctly prepends `/ulw` for thinking models
  - Cross-reference: Are there agents in FUSION_MAP not in OMC's 32-agent list? (e.g., `orchestrator`)

  **Must NOT do**:
  - Do NOT use Bash
  - Do NOT modify files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Structured read and count operations
  - **Skills**: [] (no specialized skill needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-7)
  - **Blocks**: Task 8 (synthesis)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `src/orchestrator/agent-fusion-map.mjs:73-334` - FUSION_MAP complete listing
  - `src/orchestrator/agent-fusion-map.mjs:17-44` - MODELS definition (OPUS/CODEX/FLASH)
  - `src/orchestrator/agent-fusion-map.mjs:454-473` - shouldUseFusionMapping()
  - `src/orchestrator/agent-fusion-map.mjs:398-418` - buildOpenCodeCommand()

  **Documentation References**:
  - CLAUDE.md OMC "All 32 Agents" table - canonical agent list

  **Acceptance Criteria**:
  ```
  1. Read agent-fusion-map.mjs:73-334 → Count FUSION_MAP keys
  2. List all agents in FUSION_MAP, compare against OMC 32-agent list:
     architect, architect-medium, architect-low, executor, executor-low, executor-high,
     explore, explore-medium, explore-high, researcher, researcher-low,
     designer, designer-low, designer-high, writer, vision, planner, critic, analyst,
     qa-tester, qa-tester-high, security-reviewer, security-reviewer-low,
     code-reviewer, code-reviewer-low, build-fixer, build-fixer-low,
     tdd-guide, tdd-guide-low, scientist, scientist-low, scientist-high
  3. For each agent: verify tier matches expected (HIGH=Opus agents, MEDIUM=Sonnet agents, LOW=Haiku agents)
  4. Read shouldUseFusionMapping() → verify 3 activation modes
  5. Flag any agents in FUSION_MAP not in OMC 32-agent list

  Output:
  | Agent | In FUSION_MAP | Tier | Expected Tier | Match | Notes |
  ```

  **Commit**: NO

---

- [ ] 4. Area 4 - HUD Mode Detector Display Audit

  **What to do**:
  - Read `src/hud/mode-detector.mjs` MODE_DEFINITIONS array (lines 37-93)
  - For each ultra* feature (F1-F6), check if a corresponding entry exists in MODE_DEFINITIONS
  - Verify each entry has: name, abbrev, files (state file names), activeKey, color
  - Check for expected state file names:
    - F1 ultrawork → `ultrawork-state.json`
    - F2 ultrapilot → `ultrapilot-state.json`
    - F3 ultraqa → `ultraqa-state.json`
    - F4 hulw → ???  (KNOWN EDGE CASE: hulw may not have own entry, delegates to ultrawork)
    - F5 ulw → ??? (alias for ultrawork mode, may not have own entry)
    - F6 autopilot → `autopilot-state.json`
  - Verify `renderModeStatus()` produces correct abbreviations (ULW, UPT, UQA, APT)
  - Check `src/hud/omcm-hud.mjs` calls `renderModeStatus()` (line 747) and `renderFusionMetrics()` (line 782)
  - Verify `src/hud/fusion-renderer.mjs` `renderFusionMetrics()` handles routing level display (L1-L4)

  **KNOWN EDGE CASE**: `hulw` and `ulw` are NOT expected in MODE_DEFINITIONS. They activate `ultrawork` mode internally. Document this as PASS with note "delegates to ultrawork", not FAIL.

  **Must NOT do**:
  - Do NOT use Bash
  - Do NOT modify files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Targeted read of specific line ranges
  - **Skills**: [] (no specialized skill needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-7)
  - **Blocks**: Task 8 (synthesis)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `src/hud/mode-detector.mjs:37-93` - MODE_DEFINITIONS array with 8 entries
  - `src/hud/mode-detector.mjs:262-292` - renderModeStatus() producing abbreviations
  - `src/hud/omcm-hud.mjs:747` - `renderModeStatus()` call in independent HUD
  - `src/hud/omcm-hud.mjs:782` - `renderFusionMetrics()` call
  - `src/hud/fusion-renderer.mjs:65-112` - renderFusionMetrics() with L1-L4 routing levels
  - `src/hud/fusion-renderer.mjs:88-103` - Routing level color coding (L1=DIM, L2=CYAN, L3=YELLOW, L4=RED)

  **Acceptance Criteria**:
  ```
  1. Read mode-detector.mjs:37-93 → List all MODE_DEFINITIONS entries
  2. For each F1-F6:
     - F1 ultrawork: Verify { name: 'ultrawork', abbrev: 'ULW', files: ['ultrawork-state.json'] }
     - F2 ultrapilot: Verify { name: 'ultrapilot', abbrev: 'UPT', files: ['ultrapilot-state.json'] }
     - F3 ultraqa: Verify { name: 'ultraqa', abbrev: 'UQA', files: ['ultraqa-state.json'] }
     - F4 hulw: Expected NOT in MODE_DEFINITIONS → PASS (delegates to ultrawork)
     - F5 ulw: Expected NOT in MODE_DEFINITIONS → PASS (alias for ultrawork)
     - F6 autopilot: Verify { name: 'autopilot', abbrev: 'APT', files: ['autopilot-state.json'] }
  3. Read omcm-hud.mjs → Verify renderModeStatus() and renderFusionMetrics() are called
  4. Read fusion-renderer.mjs:88-103 → Verify L1-L4 routing level display exists

  Output:
  | Feature | In MODE_DEFINITIONS | Abbrev | State File | HUD Render | Status |
  ```

  **Commit**: NO

---

- [ ] 5. Area 5 - OMC Skill Linkage Audit

  **What to do**:
  - For each OMCM skill (F4 hulw, F5 ulw, F6 autopilot), read the full SKILL.md
  - Verify each skill references or delegates to corresponding OMC functionality:
    - F4 hulw: Must reference fusion mode activation, Task delegation pattern, OpenCode routing
    - F5 ulw: Must reference usage-based mode switching (< 70%, 70-90%, > 90%)
    - F6 autopilot: Must reference autonomous execution + fusion support
  - Verify each skill's triggers section matches keywords documented in CLAUDE.md/README.md
  - Check `skills/hybrid-ultrawork/SKILL.md` explicitly says it's an alias for hulw (line 16)
  - Cross-reference: Do trigger keywords match what CLAUDE.md "Mandatory Skill Invocation" table expects?
    - CLAUDE.md says `"autopilot", "build me", "I want a"` → check autopilot triggers
    - CLAUDE.md says `"ulw", "ultrawork"` → check ulw triggers
    - CLAUDE.md says `"hulw"` is NOT in CLAUDE.md's table (it's OMCM-specific)

  **Must NOT do**:
  - Do NOT use Bash
  - Do NOT modify files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read and compare text content
  - **Skills**: [] (no specialized skill needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-7)
  - **Blocks**: Task 8 (synthesis)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `skills/hulw/SKILL.md` - Full file, focus on triggers (lines 1-9) and delegation pattern
  - `skills/ulw/SKILL.md` - Full file, focus on usage thresholds
  - `skills/autopilot/SKILL.md` - Full file, focus on triggers and parallel Task pattern
  - `skills/hybrid-ultrawork/SKILL.md:16` - Alias declaration "이 스킬은 hulw 스킬과 동일합니다"

  **Documentation References**:
  - CLAUDE.md "Mandatory Skill Invocation" table - expected trigger keywords
  - README.md "키워드 요약" table - expected keyword→action mapping

  **Acceptance Criteria**:
  ```
  1. Read each SKILL.md fully
  2. For F4 hulw:
     - Verify triggers include: hulw, /hulw, hybrid ultrawork
     - Verify body references Task delegation and OpenCode routing
  3. For F5 ulw:
     - Verify triggers include: ulw, /ulw, ultrawork
     - Verify body references usage-based switching (70%, 90% thresholds)
  4. For F6 autopilot:
     - Verify triggers include: autopilot, /autopilot, build me, 만들어줘, I want a
     - Verify body references parallel Task invocation
  5. Verify hybrid-ultrawork SKILL.md line 16 contains alias declaration
  6. For F1-F3 (OMC-native): PASS with note "OMC-native, no OMCM skill linkage expected"

  Output:
  | Feature | Skill Exists | Triggers Match | OMC Linkage | Alias Handled | Status |
  ```

  **Commit**: NO

---

- [ ] 6. Area 6 - Hooks Task Matcher Support Audit

  **What to do**:
  - Read `hooks/hooks.json` completely
  - Verify `PreToolUse` section contains a `Task` matcher (line 7)
  - Verify `Task` matcher invokes `fusion-router.mjs` via `command` field
  - Verify timeout is reasonable (120 seconds, line 11)
  - Check that `fusion-router.mjs` is the ONLY entry point for fusion routing (no other hooks call routing logic)
  - Verify `PostToolUse` `Task` matcher exists in `Read|Edit|Bash|Grep|Glob|Task` pattern (line 76) for tool tracking
  - Cross-reference: Does `hooks.json` reference any ultra*-specific hook? (Expected: NO, ultra* is handled generically via Task)
  - Verify no `UserPromptSubmit` hook handles ultra* keywords directly (detect-handoff.mjs handles usage/keyword detection separately)

  **Must NOT do**:
  - Do NOT use Bash
  - Do NOT modify files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file read and verification
  - **Skills**: [] (no specialized skill needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7)
  - **Blocks**: Task 8 (synthesis)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `hooks/hooks.json:4-15` - PreToolUse → Task matcher → fusion-router.mjs
  - `hooks/hooks.json:73-84` - PostToolUse → Read|Edit|Bash|Grep|Glob|Task → tool-tracker.mjs
  - `hooks/hooks.json:37-48` - UserPromptSubmit → detect-handoff.mjs

  **Acceptance Criteria**:
  ```
  1. Read hooks/hooks.json fully
  2. Verify PreToolUse[0].matcher === "Task"
  3. Verify PreToolUse[0].hooks[0].command includes "fusion-router.mjs"
  4. Verify timeout === 120
  5. Grep hooks.json for 'ultra|hulw|ultrapilot|ultraqa' → Expected: NOT found (generic Task routing)
  6. Verify PostToolUse matcher includes "Task" in its pattern
  7. Verify no other hook file calls shouldRouteToOpenCode()

  Output:
  | Feature | Task Matcher | fusion-router.mjs | Timeout OK | Generic (no ultra-specific) | Status |
  ```

  **Commit**: NO

---

- [ ] 7. Cross-Ref - Dual Mapping System Consistency Audit

  **What to do**:
  - Read BOTH mapping systems side-by-side:
    1. `src/hooks/fusion-router-logic.mjs:82-143` - `mapAgentToOpenCode()` (string-based: Oracle/Flash/Codex)
    2. `src/orchestrator/agent-fusion-map.mjs:73-334` - `FUSION_MAP` (object-based: MODELS.OPUS/CODEX/FLASH)
  - For EVERY agent appearing in either system, create a comparison row
  - Check tier consistency:
    - Oracle (GPT) in router-logic ↔ MODELS.OPUS or MODELS.CODEX in agent-fusion-map?
    - Flash (Gemini) in router-logic ↔ MODELS.FLASH in agent-fusion-map?
    - Codex (GPT) in router-logic ↔ MODELS.CODEX in agent-fusion-map?
  - Flag specific known inconsistencies from Metis review:
    - `orchestrator` agent: in mapAgentToOpenCode() but NOT in OMC 32-agent list
    - `analyst` agent: missing from TOKEN_SAVING_AGENTS AND CLAUDE_ONLY_AGENTS but in getRoutingLevel() L4
    - `critic` agent: in CLAUDE_ONLY_AGENTS but NOT in mapAgentToOpenCode() explicit mapping
    - `qa-tester-low` agent: in agent-fusion-map.mjs but check if in fusion-router-logic.mjs
    - `researcher-high`, `build-fixer-high`: in agent-fusion-map.mjs v0.7.0 section, check router-logic
  - Also check `src/orchestrator/task-router.mjs:21-43` TASK_ROUTING_PREFERENCES and `49-59` OPENCODE_AGENT_MAPPING for a THIRD mapping surface

  **Must NOT do**:
  - Do NOT use Bash
  - Do NOT modify files
  - Do NOT attempt to "fix" inconsistencies

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: More complex cross-referencing logic, needs careful comparison
  - **Skills**: [] (no specialized skill needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-6)
  - **Blocks**: Task 8 (synthesis)
  - **Blocked By**: None

  **References**:
  **Pattern References**:
  - `src/hooks/fusion-router-logic.mjs:82-143` - mapAgentToOpenCode() string mapping
  - `src/hooks/fusion-router-logic.mjs:514-530` - TOKEN_SAVING_AGENTS list
  - `src/hooks/fusion-router-logic.mjs:537-541` - CLAUDE_ONLY_AGENTS list
  - `src/hooks/fusion-router-logic.mjs:674-745` - getRoutingLevel() L2/L3/L4 agent lists
  - `src/orchestrator/agent-fusion-map.mjs:73-334` - FUSION_MAP complete
  - `src/orchestrator/task-router.mjs:21-43` - TASK_ROUTING_PREFERENCES
  - `src/orchestrator/task-router.mjs:49-59` - OPENCODE_AGENT_MAPPING

  **Acceptance Criteria**:
  ```
  For EVERY agent across all 3 mapping systems:
  1. Read mapAgentToOpenCode() → extract { agent: omoAgent } pairs
  2. Read FUSION_MAP → extract { agent: { omoAgent, model.tier } } tuples
  3. Read TASK_ROUTING_PREFERENCES → extract { agent: preference } pairs
  4. Read OPENCODE_AGENT_MAPPING → extract { agent: opencodeAgent } pairs
  5. Merge into unified table, flag mismatches:
     - Agent in one system but not another
     - Tier/model inconsistency across systems
     - Preference conflicts (e.g., 'claude' preference but routed to opencode)

  Output:
  | Agent | In router-logic | Router Target | In fusion-map | FM Tier | In task-router | TR Pref | Consistent |
  ```

  **Commit**: NO

---

- [ ] 8. Synthesis - Build Final Tables

  **What to do**:
  - Collect outputs from Tasks 1-7
  - Build Table 1: Ultra* Feature x Integration Area Matrix
  - Build Table 2: All FAIL items with evidence and recommended actions
  - Build Table 3: Dual-mapping consistency report from Task 7
  - Validate completeness: every cell in Table 1 must be PASS or FAIL
  - Add summary statistics:
    - Total PASS / FAIL counts
    - Areas with most failures
    - Highest-risk findings

  **Must NOT do**:
  - Do NOT use Bash
  - Do NOT modify source files
  - Do NOT leave any cell blank in Table 1

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Document synthesis and table formatting
  - **Skills**: [] (no specialized skill needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential, after all Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1-7

  **References**:
  All outputs from Tasks 1-7.

  **Acceptance Criteria**:
  ```
  Table 1 Format:
  | Feature | Skills (A1) | Router (A2) | Map (A3) | HUD (A4) | Linkage (A5) | Hooks (A6) | Overall |
  |---------|-------------|-------------|----------|----------|--------------|------------|---------|
  | ultrawork | ... | ... | ... | ... | ... | ... | PASS/FAIL |
  | ultrapilot | ... | ... | ... | ... | ... | ... | PASS/FAIL |
  | ultraqa | ... | ... | ... | ... | ... | ... | PASS/FAIL |
  | hulw | ... | ... | ... | ... | ... | ... | PASS/FAIL |
  | ulw | ... | ... | ... | ... | ... | ... | PASS/FAIL |
  | autopilot | ... | ... | ... | ... | ... | ... | PASS/FAIL |

  Table 2 Format:
  | # | Feature | Area | File:Line | Expected | Actual | Gap | Recommended Action |

  Table 3 Format:
  | Agent | router-logic | fusion-map | task-router | Consistent | Notes |

  Validation:
  - 36 cells in Table 1 (6x6) all populated
  - Table 2 has entry for every FAIL in Table 1
  - Table 3 covers all agents from all 3 mapping systems
  - Summary stats at bottom
  ```

  **Commit**: NO

---

## Commit Strategy

N/A - This is a read-only audit. No code changes, no commits.

---

## Success Criteria

### Verification Commands
```
# N/A - read-only audit, no commands to run
# Success is determined by completeness of output tables
```

### Final Checklist
- [ ] Table 1 has 36 cells, all PASS or FAIL (no blanks)
- [ ] Table 2 has file:line evidence for every FAIL
- [ ] Table 2 has 1-sentence recommended action for every row
- [ ] Table 3 covers all agents across all 3 mapping systems
- [ ] No scope expansion beyond frozen ultra* features
- [ ] No code changes made
- [ ] No Bash tool used
