# Draft: ultra* Feature Fusion-Mode Verification Analysis Plan

## Objective

Produce a read-only, cross-system consistency audit of every `ultra*` feature
(`ulw`, `hulw`, `hybrid-ultrawork`, `ultrawork`, `ultrapilot`, `ultraqa`, `ecomode`)
across all five OMCM subsystems, outputting two tables:

| Table | Purpose |
|-------|---------|
| **Table 1 - Feature x System Status Matrix** | For each ultra* feature, record whether each subsystem recognizes it (`YES / NO / PARTIAL`) |
| **Table 2 - Mismatch Register** | Every concrete inconsistency found, with file:line evidence and severity |

---

## Subsystems Under Audit (6 Verification Items)

| # | Subsystem | Concrete Files to Inspect | What to Extract |
|---|-----------|--------------------------|-----------------|
| V1 | **Skills Definitions** | `skills/ulw/SKILL.md`, `skills/hulw/SKILL.md`, `skills/hybrid-ultrawork/SKILL.md`, `skills/autopilot/SKILL.md`, `skills/ecomode/SKILL.md`, `skills/cancel/SKILL.md`, `skills/ralph/SKILL.md` | Frontmatter `triggers:` arrays, `name:`, `aliases:`, prose trigger lists |
| V2 | **Fusion Router Logic** | `src/hooks/fusion-router-logic.mjs` (core), `hooks/fusion-router.mjs` (entry) | `shouldRouteToOpenCode()` conditions, `CLAUDE_ONLY_AGENTS[]`, `TOKEN_SAVING_AGENTS[]`, `wrapWithUlwCommand()`, `getRoutingLevel()` |
| V3 | **Agent Fusion Map** | `src/orchestrator/agent-fusion-map.mjs`, `scripts/agent-mapping.json`, `examples/agent-mapping.json` | `FUSION_MAP{}` keys (all 29+ agents), `MODELS{}`, `shouldUseFusionMapping()` conditions, `buildOpenCodeCommand()` /ulw prefix logic |
| V4 | **HUD Mode Detector / Renderer** | `src/hud/fusion-renderer.mjs`, `src/utils/fusion-tracker.mjs` | `getModeAbbrev()` switch cases, `renderFusionMetrics()` routing-level thresholds, `readFusionState()` / `getDefaultState()` mode values |
| V5 | **hooks.json Task Matcher** | `hooks/hooks.json` | `PreToolUse` matcher value (currently `"Task"`), `UserPromptSubmit` hook commands |
| V6 | **Handoff / Mode Detector Hook** | `src/hooks/detect-handoff.mjs` | `modeKeywords` map (ecomode, ralph, cancel), `saveModeState()` cancel list, `detectDelegationPattern()` agent type strings |

---

## Step-by-Step Checklist

### Phase A: Extract Canonical Feature Set

**Goal:** Build the master list of ultra* features the codebase claims to support.

- [ ] A1. From each skill SKILL.md frontmatter, extract: `name`, `triggers[]`, `aliases[]`
- [ ] A2. From `detect-handoff.mjs:modeKeywords`, extract all mode keys and their keyword arrays
- [ ] A3. From `cancel/SKILL.md` + `detect-handoff.mjs:saveModeState()`, extract the exhaustive cancel-target list
- [ ] A4. Cross-reference A1, A2, A3 to produce the **Master Feature List**

**Evidence locations:**
| Feature | Skill file | detect-handoff keyword? | cancel target? |
|---------|-----------|------------------------|----------------|
| `ulw` | `skills/ulw/SKILL.md` triggers: `[ulw, /ulw, ultrawork, ...]` | NO (not in modeKeywords) | `ultrawork` in cancel list (line 171) |
| `hulw` | `skills/hulw/SKILL.md` triggers: `[hulw, /hulw, hybrid ultrawork, ...]` | NO (not in modeKeywords) | `hulw` in cancel list (line 171) |
| `hybrid-ultrawork` | `skills/hybrid-ultrawork/SKILL.md` aliases: `[hulw, hybrid]` | NO | (same as hulw) |
| `ecomode` | `skills/ecomode/SKILL.md` triggers: `[eco, ecomode, efficient, budget, save-tokens, ...]` | YES (line 41) | `ecomode` in cancel list |
| `ralph` | `skills/ralph/SKILL.md` triggers: `[ralph, don't stop, must complete, ...]` | YES (line 43) | `ralph` in cancel list |
| `autopilot` | `skills/autopilot/SKILL.md` triggers: `[autopilot, /autopilot, build me, ...]` | NO (not in modeKeywords) | `autopilot` in cancel list |
| `ultrapilot` | **NO skill file found** | NO | `ultrapilot` in cancel list (line 171) |
| `ultraqa` | **NO skill file found** | NO | `ultraqa` in cancel list (line 171) |

---

### Phase B: Verify Skills <-> Fusion Router Consistency

**Goal:** For each ultra* mode, verify the fusion-router-logic.mjs honors the mode.

- [ ] B1. Check `shouldRouteToOpenCode()` for `fusionDefault` path (line 201-207, 326-354)
- [ ] B2. Check `save-tokens` mode path (line 357-393) - which agents are routed
- [ ] B3. Check `wrapWithUlwCommand()` (line 404-410) - does it inject `/ulw` for all fusion calls?
- [ ] B4. Verify `CLAUDE_ONLY_AGENTS[]` (line 537-541) matches skills' descriptions of Claude-only routing
- [ ] B5. Verify `TOKEN_SAVING_AGENTS[]` (line 514-530) completeness against `FUSION_MAP{}` keys
- [ ] B6. Check `shouldRouteToOpenCodeV2()` (line 564-640) integrates dynamic mapping + rules + cache

**Key consistency checks:**
| Check | What to compare | Where |
|-------|----------------|-------|
| B4a | `CLAUDE_ONLY_AGENTS` includes `planner, critic, executor*, qa-tester*, build-fixer*, tdd-guide*` | `fusion-router-logic.mjs:537-541` |
| B4b | But `mapAgentToOpenCode()` maps ALL of these (including executor, qa-tester, etc.) to OpenCode agents | `fusion-router-logic.mjs:82-143` |
| B4c | Resolve: `CLAUDE_ONLY_AGENTS` is only used in `save-tokens` mode description; in `fusionDefault` mode only `planner` is excluded (line 334) | Potential mismatch if save-tokens list diverges from fusionDefault list |

---

### Phase C: Verify Agent Fusion Map Consistency

**Goal:** Cross-check the three agent mapping sources.

- [ ] C1. Count agents in `FUSION_MAP{}` in `agent-fusion-map.mjs` → expect 29+ (actual: 31 entries including qa-tester-low, researcher-high, build-fixer-high)
- [ ] C2. Count agents in `scripts/agent-mapping.json` mappings → expect 29
- [ ] C3. Count agents in `mapAgentToOpenCode()` in `fusion-router-logic.mjs` → count mapping keys
- [ ] C4. Compare C1 vs C2 vs C3 for missing/extra agents
- [ ] C5. Compare OMO agent names (e.g., `Oracle` vs `build` vs `Flash` vs `Codex`) across all three

**Known divergences to verify:**
| Agent | `agent-fusion-map.mjs` | `fusion-router-logic.mjs:mapAgentToOpenCode()` | `scripts/agent-mapping.json` | `skills/*.md` routing tables |
|-------|----------------------|------------------------------------------------|-----------------------------|-----------------------------|
| `designer` | omoAgent: `build`, CODEX | `Flash` | `frontend-engineer` | `frontend-ui-ux-engineer` |
| `designer-high` | omoAgent: `build`, OPUS | `Codex` | N/A | `frontend-ui-ux-engineer` |
| `researcher-low` | omoAgent: `general`, FLASH | `Flash` | (in researcher group) | `librarian` (skills), `Flash` (router) |
| `vision` | omoAgent: `general`, CODEX | `Flash` | `multimodal-looker` | `multimodal-looker` |
| `architect-low` | omoAgent: `explore`, FLASH | `Flash` | (in architect group as Oracle) | Skills say `Oracle` |
| `explore` | omoAgent: `explore`, FLASH | `Flash` | `explore` | Skills say `Gemini Flash` |

---

### Phase D: Verify HUD Mode Detector

**Goal:** Ensure HUD renders all ultra* modes correctly.

- [ ] D1. `getModeAbbrev()` switch cases: `save-tokens` -> `eco`, `balanced` -> `bal`, `quality-first` -> `qlt`
  - **Missing**: No case for `hulw`, `ulw`, `ultrawork`, `ralph`, `autopilot` modes
  - Falls to `default: mode.slice(0,3)` which would produce `hul`, `ulw`, `ult`, `ral`, `aut`
- [ ] D2. `renderFusionMetrics()` reads `state.mode` - verify all modes produce valid HUD output
- [ ] D3. Routing level display (L1-L4) thresholds match `getRoutingLevel()` in fusion-router-logic.mjs
  - fusion-renderer.mjs: L4 >= 40M, L3 >= 20M, L2 >= 5M, L1 < 5M
  - fusion-router-logic.mjs: identical thresholds (lines 675-744)
  - **Status**: MATCH

---

### Phase E: Verify hooks.json Task Matcher

**Goal:** Confirm the hook system catches all relevant tool calls.

- [ ] E1. `PreToolUse` matcher is `"Task"` - only Task calls trigger fusion routing
  - Other matchers: `"Read"` (read-optimizer), `"Bash"` (bash-optimizer)
  - **Question**: Should `"Bash"` calls also be routed in fusion mode? (currently NO)
- [ ] E2. `UserPromptSubmit` hook runs `detect-handoff.mjs` for keyword detection
- [ ] E3. `PostToolUse` matcher is `"Read|Edit|Bash|Grep|Glob|Task"` for tool-tracker
- [ ] E4. `Stop` hook runs `persistent-mode.mjs` - verify it knows about all ultra* modes
- [ ] E5. No `PreToolUse` hook for `Write` or `Edit` - confirm this is intentional

---

### Phase F: Verify Handoff / Mode Detector (detect-handoff.mjs)

**Goal:** Confirm mode detection completeness.

- [ ] F1. `modeKeywords` map covers: `ecomode`, `ralph`, `cancel` (3 modes)
  - **Missing from modeKeywords**: `ulw`, `hulw`, `ultrawork`, `autopilot`, `ultrapilot`, `ultraqa`
  - These are handled by OMC's skill system instead, NOT by OMCM's hook
- [ ] F2. `saveModeState('cancel')` target list: `ralph, autopilot, ultrawork, ecomode, hulw, swarm, pipeline, ultrapilot, ultraqa` (9 modes)
  - **Missing**: `ulw` is not in the cancel list (separate from `ultrawork`?)
  - **Present but no skill file**: `ultrapilot`, `ultraqa`, `swarm`, `pipeline`
- [ ] F3. `detectDelegationPattern()` returns agent types: `explore`, `architect`, `executor`, `researcher`
  - These map correctly to fusion-router-logic.mjs agent names

---

## Output Templates

### Table 1: Feature x System Status Matrix

| Feature | V1: Skill Defined? | V2: Router Handles? | V3: Fusion Map? | V4: HUD Renders? | V5: Hook Catches? | V6: Mode Detected? |
|---------|-------------------|--------------------|-----------------|-----------------|--------------------|-------------------|
| `ulw` | YES (skill/ulw) | YES (wrapWithUlwCommand) | YES (buildOpenCodeCommand /ulw) | PARTIAL (default slice) | YES (Task matcher) | NO (not in modeKeywords) |
| `hulw` | YES (skill/hulw) | YES (fusionDefault path) | YES (shouldUseFusionMapping hulwMode) | PARTIAL (default slice) | YES (Task matcher) | NO (not in modeKeywords) |
| `hybrid-ultrawork` | YES (alias of hulw) | (same as hulw) | (same as hulw) | (same as hulw) | (same as hulw) | NO |
| `ultrawork` | NO (OMC skill, not OMCM) | YES (trigger for ulw) | YES (via /ulw wrap) | PARTIAL | YES (Task matcher) | NO |
| `ecomode` | YES (skill/ecomode) | YES (save-tokens mode) | YES (TOKEN_SAVING_AGENTS) | YES (`eco` abbrev) | YES (Task matcher) | YES (modeKeywords) |
| `ralph` | YES (skill/ralph) | NO (no special path) | NO (no special path) | NO (default slice `ral`) | YES (Task matcher) | YES (modeKeywords) |
| `autopilot` | YES (skill/autopilot) | YES (delegates Tasks) | YES (via Task routing) | PARTIAL (default slice `aut`) | YES (Task matcher) | NO (not in modeKeywords) |
| `ultrapilot` | NO SKILL FILE | UNKNOWN | UNKNOWN | NO | YES (Task matcher) | NO |
| `ultraqa` | NO SKILL FILE | UNKNOWN | UNKNOWN | NO | YES (Task matcher) | NO |

### Table 2: Mismatch Register

| # | Severity | Subsystem A | Subsystem B | Description | Evidence (file:line) |
|---|----------|-------------|-------------|-------------|----------------------|
| M1 | MEDIUM | V3: agent-fusion-map.mjs | V2: fusion-router-logic.mjs | `designer` mapped to `build/CODEX` in fusion-map but `Flash` in router's mapAgentToOpenCode() | agent-fusion-map.mjs:188-192 vs fusion-router-logic.mjs:106 |
| M2 | MEDIUM | V3: agent-fusion-map.mjs | V2: fusion-router-logic.mjs | `vision` mapped to `general/CODEX` in fusion-map but `Flash` in router | agent-fusion-map.mjs:195-199 vs fusion-router-logic.mjs:114 |
| M3 | MEDIUM | V3: agent-fusion-map.mjs | V2: fusion-router-logic.mjs | `designer-high` mapped to `build/OPUS` in fusion-map but `Codex` in router | agent-fusion-map.mjs:149-153 vs fusion-router-logic.mjs:108 |
| M4 | LOW | V1: skills/*.md | V2: fusion-router-logic.mjs | Skills describe `researcher-low` -> `librarian/GLM` but router maps to `Flash` and fusion-map maps to `general/FLASH` | skills/ulw:75, fusion-router-logic.mjs:93, agent-fusion-map.mjs:254-258 |
| M5 | LOW | V3: scripts/agent-mapping.json | V3: agent-fusion-map.mjs | `architect-low` mapped to `Oracle/gpt-4` in scripts/agent-mapping.json but `explore/FLASH` in agent-fusion-map.mjs | scripts/agent-mapping.json:6 vs agent-fusion-map.mjs:233-238 |
| M6 | LOW | V3: scripts/agent-mapping.json | All others | scripts/agent-mapping.json uses outdated model names (`gpt-4`, `gemini-pro`) vs current (`gpt-5.2-codex`, `gemini-3.0-flash`) | scripts/agent-mapping.json throughout |
| M7 | HIGH | V6: detect-handoff.mjs | V1: skills/cancel | Cancel target list includes `ultrapilot`, `ultraqa` but no SKILL.md files exist for these | detect-handoff.mjs:171, skills/ directory |
| M8 | MEDIUM | V6: detect-handoff.mjs | V1: skills/ | `ulw`, `hulw`, `autopilot`, `ultrapilot`, `ultraqa` are NOT in modeKeywords - detection relies entirely on OMC skill system, not OMCM hooks | detect-handoff.mjs:40-44 |
| M9 | LOW | V4: fusion-renderer.mjs | V1: skills/ | `getModeAbbrev()` only handles `save-tokens`, `balanced`, `quality-first`; all ultra* modes fall to `.slice(0,3)` default producing unclear abbreviations | fusion-renderer.mjs:31-42 |
| M10 | MEDIUM | V2: fusion-router-logic.mjs | V3: agent-fusion-map.mjs | `FUSION_MAP` has 31 agents (incl. `qa-tester-low`, `researcher-high`, `build-fixer-high`) but `mapAgentToOpenCode()` is missing `qa-tester-low` (falls to default `Codex`) | agent-fusion-map.mjs:310-315 vs fusion-router-logic.mjs:82-143 (no qa-tester-low entry) |
| M11 | LOW | V2: fusion-router-logic.mjs | V2: fusion-router-logic.mjs | `CLAUDE_ONLY_AGENTS` includes `executor, executor-low, executor-high, qa-tester, qa-tester-high, build-fixer, build-fixer-low, tdd-guide, tdd-guide-low` but `fusionDefault` mode only excludes `planner` - these agents ARE routed in fusionDefault | fusion-router-logic.mjs:537-541 vs :334 |
| M12 | INFO | V3: examples/agent-mapping.json | V3: agent-fusion-map.mjs | Example file uses different target names (`frontend-engineer` vs `build`, `Oracle` vs `build`) and old models (`gpt-4`) - clearly a stale example | examples/agent-mapping.json throughout |

---

## Summary of Evidence Sources

| File | Role | Key Symbols |
|------|------|-------------|
| `skills/ulw/SKILL.md` | ulw skill definition | triggers, routing table |
| `skills/hulw/SKILL.md` | hulw skill definition | triggers, routing table |
| `skills/hybrid-ultrawork/SKILL.md` | hybrid-ultrawork alias | aliases, triggers |
| `skills/autopilot/SKILL.md` | autopilot skill | triggers, workflow steps |
| `skills/ecomode/SKILL.md` | ecomode skill | triggers, routing strategy |
| `skills/cancel/SKILL.md` | cancel skill | cancel target modes |
| `skills/ralph/SKILL.md` | ralph skill | triggers |
| `hooks/hooks.json` | Hook registration | PreToolUse/Task matcher |
| `hooks/fusion-router.mjs` | Hook entry point | main(), executeViaOpenCode() |
| `src/hooks/fusion-router-logic.mjs` | Core routing logic | shouldRouteToOpenCode(), mapAgentToOpenCode(), CLAUDE_ONLY_AGENTS, TOKEN_SAVING_AGENTS, getRoutingLevel() |
| `src/hooks/detect-handoff.mjs` | Mode/keyword detector | modeKeywords, saveModeState(), detectDelegationPattern() |
| `src/orchestrator/agent-fusion-map.mjs` | Agent fusion map v2 | FUSION_MAP{}, MODELS{}, shouldUseFusionMapping(), buildOpenCodeCommand() |
| `scripts/agent-mapping.json` | Static agent mapping | mappings[] (potentially stale) |
| `examples/agent-mapping.json` | Example mapping | (stale example, different schema) |
| `src/hud/fusion-renderer.mjs` | HUD renderer | getModeAbbrev(), renderFusionMetrics(), routing level thresholds |
| `src/utils/fusion-tracker.mjs` | State tracker | readFusionState(), getDefaultState(), mode values |
