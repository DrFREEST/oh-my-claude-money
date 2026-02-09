# OMO Upstream Impact Analysis on OMCM

## TL;DR

> **Quick Summary**: Analyze 6 upstream oh-my-opencode (OMO) change areas across ~20 commits and classify their impact on oh-my-claude-money (OMCM) as BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION. Analysis-only — no implementation.
>
> **Deliverables**:
> - Categorized impact report (markdown) with per-area findings
> - Summary decision matrix mapping each upstream area → OMCM subsystem → severity
> - List of specific OMCM files requiring future changes
>
> **Estimated Effort**: Medium (6 parallel investigation tracks)
> **Parallel Execution**: YES — 6 waves (Wave 1: 6 parallel tracks → Wave 2: synthesis)
> **Critical Path**: All 6 tracks → Synthesis → Report

---

## Context

### Original Request

Analyze specific upstream OMO commits and decide which OMCM updates are required. Cover: model/provider additions (kimi-k2.5, kimi-for-coding), `requiresModel` agent activation, model-resolver changes, MCP OAuth/vscode-jsonrpc migration, logging/background/tmux DI/start-work changes. Map each to OMCM router/token aggregation/agent mapping/categories. Output structured report with 4 severity tiers.

### Key Context

- **OMO reference repo**: `/opt/@references/oh-my-opencode/`
- **OMCM repo**: `/opt/oh-my-claude-money/`
- **OMCM reads session data from**: `~/.local/share/opencode/storage/message/` using `msg.providerID` and `msg.model.modelID`
- **Provider normalization** in HUD at `omcm-hud.mjs:563-574` — currently NO kimi/moonshot branch

### Metis Review

**Identified Gaps (addressed in plan)**:

| Gap | Resolution |
|-----|-----------|
| Kimi model string collision: `includes('pro')` could misclassify kimi as Google | Added to Track A acceptance criteria — must check exact kimi model ID strings |
| `requiresModel` blocking: OMO might silently refuse agents if availability not passed | Added as explicit check item in Track B |
| Server pool error handling for unknown providers | Added to Track C — check `result.info.providerID` behavior |
| Two kimi providers (kimi-k2.5 vs kimi-for-coding) — same or different? | Added as explicit question in Track A |
| Fallback chain model ID mismatch (`gemini-2.5-flash` vs `gemini-3.0-flash`) | Noted as pre-existing issue; Track C checks if resolver changes worsen it |
| Assumption: OMCM never imports OMO modules directly | Validation step added to Track 0 (preflight) |

### Classification Definitions (Guardrails)

| Tier | Definition |
|------|-----------|
| **BREAKING** | OMCM will **malfunction or produce incorrect results** without changes |
| **IMPORTANT** | OMCM will **miss functionality or degrade quality** but won't break |
| **NICE-TO-HAVE** | OMCM could benefit but works fine without changes |
| **NO-ACTION** | No OMCM surface area affected; upstream-internal change |

### Scope Guardrails (from Metis)

- **MUST**: Output is a markdown report only. No code changes.
- **MUST**: Each finding includes specific upstream commit hash AND OMCM file:line affected.
- **MUST NOT**: Include implementation code, patches, or effort estimates.
- **MUST NOT**: Redesign fallback chains, add kimi support, or scope new features.
- **MUST**: Note findings that imply future work, but don't design solutions.

---

## Work Objectives

### Core Objective
Produce a structured impact report classifying each upstream OMO change area's effect on OMCM.

### Concrete Deliverables
- Single markdown report file: `.sisyphus/reports/omo-impact-report.md`
- Contains: summary table + 6 detailed sections + assumption validations

### Definition of Done
- [ ] All 6 upstream areas have a classification (BREAKING/IMPORTANT/NICE-TO-HAVE/NO-ACTION)
- [ ] Zero "TBD" or "needs further investigation" entries
- [ ] Every classification has a 1-sentence justification + affected OMCM files list
- [ ] Summary table at top of report

### Must Have
- Per-area analysis with exact commit hashes verified
- OMCM grep results for each affected surface area
- Classification with justification

### Must NOT Have (Guardrails)
- Implementation code or patches
- Effort estimates or priority rankings beyond 4-tier classification
- "While we're at it" feature additions
- Fallback chain redesign proposals
- New kimi support implementation

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: N/A (analysis task)
- **User wants tests**: Manual verification only
- **QA approach**: Automated grep-based completeness checks

### Automated Verification

```bash
# After report is generated, verify completeness:

# 1. All 6 areas classified
grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" .sisyphus/reports/omo-impact-report.md
# Assert: count >= 6

# 2. No TBD entries
grep -c "TODO\|TBD\|FIXME\|needs.*investigation" .sisyphus/reports/omo-impact-report.md
# Assert: count == 0

# 3. All 6 section headers present
grep -c "Track A\|Track B\|Track C\|Track D\|Track E\|Track F" .sisyphus/reports/omo-impact-report.md
# Assert: count == 6
```

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 0 (Preflight) | None | Validates assumptions before any analysis begins |
| Task A (Kimi models) | Task 0 | Needs validated assumptions about OMCM↔OMO interface |
| Task B (requiresModel) | Task 0 | Needs validated assumptions |
| Task C (Model resolver) | Task 0 | Needs validated assumptions |
| Task D (MCP OAuth) | Task 0 | Needs validated assumptions |
| Task E (vscode-jsonrpc) | Task 0 | Needs validated assumptions |
| Task F (Logging/DI) | Task 0 | Needs validated assumptions |
| Task G (Synthesis) | A, B, C, D, E, F | Merges all findings into final report |

## Parallel Execution Graph

```
Wave 0 (Start immediately):
└── Task 0: Preflight validation (quick, ~30s)

Wave 1 (After Wave 0, ALL in parallel):
├── Task A: Kimi model/provider additions
├── Task B: requiresModel agent activation
├── Task C: Model-resolver changes
├── Task D: MCP OAuth 2.1
├── Task E: vscode-jsonrpc LSP migration
└── Task F: Logging/background/tmux DI/start-work

Wave 2 (After Wave 1):
└── Task G: Synthesize report

Critical Path: Task 0 → Any Track → Task G
Parallel Speedup: ~70% faster than sequential (6 tracks run concurrently)
```

### Agent Dispatch Summary

| Wave | Tasks | Dispatch |
|------|-------|---------|
| 0 | Task 0 | `delegate_task(category="quick", load_skills=[], run_in_background=false)` |
| 1 | A–F | `delegate_task(category="quick", load_skills=[], run_in_background=true)` × 6 |
| 2 | G | `delegate_task(category="unspecified-low", load_skills=[], run_in_background=false)` |

---

## TODOs

### Task 0: Preflight — Validate OMCM↔OMO Interface Assumptions

**What to do**:
1. Verify OMCM never imports OMO modules directly:
   ```bash
   cd /opt/oh-my-claude-money
   grep -r "from.*opencode" src/ || echo "CLEAN: No direct imports"
   grep -r "require.*opencode" src/ || echo "CLEAN: No direct requires"
   ```
2. Verify session storage path is still valid:
   ```bash
   ls ~/.local/share/opencode/storage/message/ | head -5
   ```
3. Verify OMO API response contract (`providerID`/`modelID` in responses) is unchanged by checking if any of the target commits touch API handler or response types:
   ```bash
   cd /opt/@references/oh-my-opencode
   git show --stat d2d8d1a b1b4578 9d20a5b 0dbec08 baefd16 2c74f60 0c3fbd7 80ee52f | grep -i "api\|handler\|response\|route" || echo "NONE: API handlers untouched"
   ```
4. Check if new provider IDs (e.g., `moonshot`, `kimi-for-coding`) appear in OMO's provider registry:
   ```bash
   cd /opt/@references/oh-my-opencode
   git diff d2d8d1a~1..0dbec08 -- "*.ts" | grep -i "providerID\|providerId" | head -20
   ```
5. Document: Record findings as JSON object `{ directImports: bool, storagePath: "valid"|"changed", apiContract: "unchanged"|"changed", newProviderIDs: [...] }`

**Must NOT do**:
- Modify any files
- Clone or fetch repos

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Simple grep/ls verification, ~30 seconds total
- **Skills**: `[]`
  - No specialized skills needed — basic bash/grep

**Parallelization**:
- **Can Run In Parallel**: NO (must complete before Wave 1)
- **Parallel Group**: Wave 0 (sequential prerequisite)
- **Blocks**: Tasks A, B, C, D, E, F
- **Blocked By**: None

**References**:
- `/opt/oh-my-claude-money/src/pool/server-pool.mjs:690-691` — Where OMCM sends `{ providerID, modelID }`
- `/opt/oh-my-claude-money/src/hud/omcm-hud.mjs:556-557` — Where OMCM reads `msg.providerID` / `msg.model.modelID`
- `/opt/@references/oh-my-opencode/` — Upstream reference repo (read-only)

**Acceptance Criteria**:
```bash
# Agent outputs a JSON summary. Verify:
# - directImports field exists and is false
# - storagePath field exists
# - apiContract field exists
# - newProviderIDs field exists and is an array
```

**Commit**: NO

---

### Task A: Kimi Model/Provider Additions — Impact on OMCM

**What to do**:

**Step 1 — Extract upstream changes**:
```bash
cd /opt/@references/oh-my-opencode

# Read each kimi commit in detail
git show d2d8d1a  # kimi-k2.5 to fallback chains + model catalog
git show b1b4578  # kimi-k2.5-free fallback, prioritize kimi for atlas
git show 9d20a5b  # kimi-for-coding provider in installer, model ID k2p5
git show 0dbec08  # kimi-for-coding in model fallback
```

**Step 2 — Extract exact model ID strings and provider IDs**:
```bash
cd /opt/@references/oh-my-opencode
git diff d2d8d1a~1..0dbec08 -- "*.ts" | grep -E "(kimi|moonshot|k2p5|kimi-for-coding)" | head -40
```

**Step 3 — Check OMCM surface area**:
```bash
cd /opt/oh-my-claude-money

# HUD provider normalization — does it handle kimi?
grep -n "kimi\|moonshot\|k2p5" src/hud/omcm-hud.mjs || echo "NOT FOUND"

# Agent fusion map — is kimi defined as a model option?
grep -n "kimi\|moonshot" src/orchestrator/agent-fusion-map.mjs || echo "NOT FOUND"

# Server pool — does it know about kimi provider?
grep -n "kimi\|moonshot" src/pool/server-pool.mjs || echo "NOT FOUND"

# Balancer — provider list
grep -n "kimi\|moonshot" src/router/balancer.mjs || echo "NOT FOUND"

# Tracking — metrics for kimi?
grep -n "kimi\|moonshot" src/tracking/ -r || echo "NOT FOUND"
```

**Step 4 — Check for model string collision (Metis edge case E1)**:
```bash
# The HUD checks includes('pro') for Google. Do any kimi model IDs contain 'pro'?
# Extract exact model ID strings from upstream and check against HUD logic
```

**Step 5 — Determine: are kimi-k2.5 and kimi-for-coding the same provider?**
```bash
cd /opt/@references/oh-my-opencode
grep -n "kimi-for-coding\|kimi-k2.5\|moonshot" src/cli/types.ts src/cli/install.ts src/shared/model-requirements.ts | head -20
```

**Step 6 — Classify**:
- If kimi model tokens flow through OMCM's HUD and get misclassified → **BREAKING** or **IMPORTANT**
- If kimi is only used in OMO-internal fallback chains → **NICE-TO-HAVE** or **NO-ACTION**
- Key question: When OMO uses kimi-k2.5, does the session message have `providerID: "kimi-for-coding"` or `providerID: "opencode"`? This determines if OMCM HUD sees kimi data at all.

**Step 7 — Document findings**:
Write section for report with: commits analyzed, OMCM files checked, classification, justification, affected files list.

**Must NOT do**:
- Add kimi support to OMCM
- Redesign fallback chains
- Edit any source files

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Read-only git/grep investigation
- **Skills**: `[]`
  - No specialized skills needed
- **Skills Evaluated but Omitted**:
  - `git-master`: Not needed — read-only git show/diff, no commits
  - `typescript-programmer`: Not needed — no code changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks B, C, D, E, F)
- **Blocks**: Task G (synthesis)
- **Blocked By**: Task 0

**References**:

**Pattern References** (OMCM files to inspect):
- `/opt/oh-my-claude-money/src/hud/omcm-hud.mjs:556-574` — Provider normalization logic. Currently handles `opencode→google|openai|anthropic`. Kimi falls through to `openai` default. CHECK if kimi model IDs contain 'pro' (would misclassify as Google).
- `/opt/oh-my-claude-money/src/orchestrator/agent-fusion-map.mjs:17-44` — Only 3 models: OPUS/CODEX/FLASH. No kimi option. CHECK if kimi should be added as KIMI_K2P5.
- `/opt/oh-my-claude-money/src/pool/server-pool.mjs:654-691` — Sends `{ providerID, modelID }` to OMO. CHECK if OMCM ever requests kimi models.
- `/opt/oh-my-claude-money/src/router/balancer.mjs` — Provider balancing. CHECK if kimi needs a weight entry.
- `/opt/oh-my-claude-money/src/tracking/metrics-collector.mjs` — Metrics by provider. CHECK if kimi needs a counter.

**Upstream References** (commits to analyze):
- `d2d8d1a` — Adds kimi-k2.5 to agent fallback chains and model catalog. Contains `model-requirements.ts` and `model-resolver.ts` changes.
- `b1b4578` — Adds `opencode/kimi-k2.5-free` fallback. Touches `model-requirements.ts` and `keyword-detector/constants.ts`.
- `9d20a5b` — Adds kimi-for-coding provider to installer. Touches `install.ts`, `config-manager.ts`, `types.ts`.
- `0dbec08` — Adds kimi-for-coding to model fallback. Touches `model-fallback.ts`.

**Acceptance Criteria**:
```bash
# Agent produces a section with:
# 1. Exact kimi model ID strings extracted (e.g., "kimi-k2.5", "k2p5", etc.)
# 2. Exact kimi provider ID strings (e.g., "moonshot", "kimi-for-coding")
# 3. Whether kimi model IDs contain 'pro' (collision check)
# 4. Whether kimi-k2.5 and kimi-for-coding are same or different providers
# 5. Classification (one of: BREAKING/IMPORTANT/NICE-TO-HAVE/NO-ACTION)
# 6. List of affected OMCM files (or "none")
# 7. 1-sentence justification
```

**Commit**: NO

---

### Task B: `requiresModel` Agent Activation — Impact on OMCM

**What to do**:

**Step 1 — Extract upstream changes**:
```bash
cd /opt/@references/oh-my-opencode

git show baefd16  # Add requiresModel field + isModelAvailable helper
git show 2c74f60  # Check requiresModel for conditional agent activation
git show 0188d69  # Tests for requiresModel
```

**Step 2 — Understand the mechanism**:
```bash
cd /opt/@references/oh-my-opencode
# What does requiresModel do? How does it block agent activation?
cat src/shared/model-availability.ts
cat src/shared/model-requirements.ts | head -60
# How does delegate-task check it?
git diff 2c74f60~1..2c74f60 -- src/tools/delegate-task/tools.ts
git diff 2c74f60~1..2c74f60 -- src/agents/utils.ts
```

**Step 3 — Determine if OMCM is affected**:
```bash
cd /opt/oh-my-claude-money

# Does OMCM interact with agent activation?
grep -rn "requiresModel\|isModelAvailable\|model-availability\|model-requirements" src/ || echo "NOT FOUND"

# Does OMCM's server-pool or executor pass model availability info?
grep -n "available\|activation\|requires" src/pool/server-pool.mjs src/executor/opencode-executor.mjs | head -20

# Does OMCM request specific agents from OMO?
grep -n "agent\|--agent" src/executor/opencode-executor.mjs src/pool/server-pool.mjs | head -20
```

**Step 4 — Check Metis edge case E3**:
- If OMO now silently refuses agents when `requiresModel` conditions aren't met, does OMCM detect this?
- Check: Does OMCM handle empty/error responses from OMO agent requests?

**Step 5 — Classify and document**.

**Must NOT do**:
- Implement requiresModel support in OMCM
- Modify agent activation logic

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Read-only investigation
- **Skills**: `[]`

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with A, C, D, E, F)
- **Blocks**: Task G
- **Blocked By**: Task 0

**References**:

**Upstream References**:
- `baefd16` — `model-availability.ts` (new file), `model-requirements.ts` updates
- `2c74f60` — `delegate-task/tools.ts` and `agents/utils.ts` — where requiresModel is checked
- `0188d69` — Tests showing expected behavior

**OMCM References**:
- `/opt/oh-my-claude-money/src/pool/server-pool.mjs` — How OMCM requests OMO sessions (does it pass agent params?)
- `/opt/oh-my-claude-money/src/executor/opencode-executor.mjs` — CLI-mode execution
- `/opt/oh-my-claude-money/src/orchestrator/task-router.mjs` — Where OMCM decides which agent to request

**Acceptance Criteria**:
```bash
# Agent produces:
# 1. Explanation of how requiresModel works in OMO (1-2 sentences)
# 2. Whether OMCM ever triggers requiresModel checks (yes/no + evidence)
# 3. Whether OMCM handles silent agent refusal (yes/no + evidence)
# 4. Classification + justification + affected files
```

**Commit**: NO

---

### Task C: Model-Resolver Changes — Impact on OMCM

**What to do**:

**Step 1 — Extract upstream changes**:
```bash
cd /opt/@references/oh-my-opencode

git show 0c3fbd7  # UI model selection priority in agent init
git show 80ee52f  # Client API fallback, explicit model passing, fuzzy matching
git show 1187a02  # Atlas respects fallbackChain, refresh provider-models cache
```

**Step 2 — Understand resolution priority change**:
```bash
cd /opt/@references/oh-my-opencode
# New priority: UI Selection → Config Override → Fallback → System Default
cat src/shared/model-resolver.ts
# Fuzzy matching for cross-provider models
git diff d2d8d1a~1..d2d8d1a -- src/shared/model-resolver.ts
```

**Step 3 — Check if OMCM's model strings still resolve correctly**:
```bash
cd /opt/oh-my-claude-money
# What model strings does OMCM send to OMO?
grep -n "model.*:" src/orchestrator/agent-fusion-map.mjs | head -10
# These are: 'claude-opus-4-5-20251101', 'gpt-5.2-codex', 'gemini-3.0-flash'
# Check if fuzzy matching or priority changes affect these

# Does OMCM pass model via server-pool?
grep -n "model" src/pool/server-pool.mjs | head -20
```

**Step 4 — Check Metis edge case E2 (server pool response)**:
```bash
cd /opt/oh-my-claude-money
# How does OMCM read the response model info?
grep -n "result.info\|providerID\|modelID" src/pool/server-pool.mjs | head -10
# If resolver now returns different providerID/modelID in response, HUD token counting breaks
```

**Step 5 — Check Metis edge case E4 (model ID mismatch)**:
```bash
# Pre-existing inconsistency check:
grep -n "gemini" src/orchestrator/agent-fusion-map.mjs src/orchestrator/fallback-orchestrator.mjs | head -10
# agent-fusion-map uses 'gemini-3.0-flash', fallback-orchestrator may use different version
```

**Step 6 — Classify and document**.

**Must NOT do**:
- Change model resolution logic
- Update model strings

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Read-only git/grep investigation
- **Skills**: `[]`

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with A, B, D, E, F)
- **Blocks**: Task G
- **Blocked By**: Task 0

**References**:

**Upstream References**:
- `0c3fbd7` — `model-resolver.ts`, `config-handler.ts` — new resolution priority
- `80ee52f` — `model-availability.ts` (3-tier fallback: cache → models.json → client API), `look-at/tools.ts` (explicit model passing)
- `1187a02` — Atlas fallback chain behavior change

**OMCM References**:
- `/opt/oh-my-claude-money/src/orchestrator/agent-fusion-map.mjs:17-44` — Model strings OMCM sends: `claude-opus-4-5-20251101`, `gpt-5.2-codex`, `gemini-3.0-flash`
- `/opt/oh-my-claude-money/src/pool/server-pool.mjs:690-691` — Where `{ providerID, modelID }` is constructed
- `/opt/oh-my-claude-money/src/pool/server-pool.mjs:730-731` — Where response `providerID`/`modelID` is read
- `/opt/oh-my-claude-money/src/orchestrator/fallback-orchestrator.mjs` — Check model ID consistency

**Acceptance Criteria**:
```bash
# Agent produces:
# 1. Summary of new resolution priority (1-2 sentences)
# 2. Whether OMCM's 3 model strings still resolve correctly (yes/no per model)
# 3. Whether response providerID/modelID format changed (yes/no + evidence)
# 4. Whether model ID mismatch (gemini versions) is worsened (yes/no)
# 5. Classification + justification + affected files
```

**Commit**: NO

---

### Task D: MCP OAuth 2.1 Authentication — Impact on OMCM

**What to do**:

**Step 1 — Extract upstream changes**:
```bash
cd /opt/@references/oh-my-opencode
git show --stat dcda876  # Full MCP OAuth 2.1 implementation
# Focus on: what does this ADD, and does it CHANGE existing behavior?
git diff dcda876~1..dcda876 -- src/features/claude-code-mcp-loader/types.ts
```

**Step 2 — Determine if OMCM uses MCP server features affected**:
```bash
cd /opt/oh-my-claude-money
# Does OMCM register as an MCP server or use MCP OAuth?
grep -rn "mcp\|oauth\|MCP\|OAuth" src/ | head -20
grep -rn "claude-code-mcp\|skill-mcp\|mcp-loader" src/ | head -10

# Does OMCM connect to OMO via MCP protocol?
grep -rn "mcp.*server\|mcp.*client\|json-rpc" src/ | head -10
```

**Step 3 — Check if MCP OAuth changes any existing API contract**:
```bash
cd /opt/@references/oh-my-opencode
# Does the MCP OAuth commit modify any existing handler or type used by OMCM?
git diff dcda876~1..dcda876 --name-only | grep -v "mcp-oauth\|doctor\|cli/mcp"
# If ALL changes are in new mcp-oauth/ directory → NO-ACTION for OMCM
```

**Step 4 — Classify and document**.

**Must NOT do**:
- Scope MCP OAuth support for OMCM
- Investigate MCP OAuth implementation details beyond impact assessment

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Likely NO-ACTION — quick verification
- **Skills**: `[]`

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with A, B, C, E, F)
- **Blocks**: Task G
- **Blocked By**: Task 0

**References**:

**Upstream References**:
- `dcda876` — Massive commit (22+ new files). Key question: does it modify ANY existing file that OMCM interacts with?
- `/opt/@references/oh-my-opencode/src/features/claude-code-mcp-loader/types.ts` — Adds `oauth` field to `ClaudeCodeMcpServer` schema. CHECK if OMCM reads this type.

**OMCM References**:
- `/opt/oh-my-claude-money/src/` — Full source tree. Grep for any MCP/OAuth references.

**Acceptance Criteria**:
```bash
# Agent produces:
# 1. Whether MCP OAuth is additive-only or modifies existing behavior (additive/breaking)
# 2. Whether OMCM uses any file modified by dcda876 outside mcp-oauth/ (yes/no)
# 3. Classification + justification
```

**Commit**: NO

---

### Task E: vscode-jsonrpc LSP Migration — Impact on OMCM

**What to do**:

**Step 1 — Extract upstream change**:
```bash
cd /opt/@references/oh-my-opencode
git show a94fbad  # Migrate LSP client to vscode-jsonrpc
```

**Step 2 — Check if OMCM has LSP dependencies**:
```bash
cd /opt/oh-my-claude-money
grep -rn "lsp\|json-rpc\|jsonrpc\|language.server\|vscode" src/ || echo "NOT FOUND"
grep -rn "lsp\|jsonrpc" package.json || echo "NOT FOUND"
```

**Step 3 — Confirm this is internal-only**:
```bash
cd /opt/@references/oh-my-opencode
# Only file changed: src/tools/lsp/client.ts + deps
git diff a94fbad~1..a94fbad --name-only
# If only lsp/client.ts + package.json/bun.lock → NO-ACTION
```

**Step 4 — Classify and document**.

**Must NOT do**:
- Investigate vscode-jsonrpc internals

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Almost certainly NO-ACTION — fastest possible verification
- **Skills**: `[]`

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with A, B, C, D, F)
- **Blocks**: Task G
- **Blocked By**: Task 0

**References**:

**Upstream References**:
- `a94fbad` — `src/tools/lsp/client.ts`, `package.json`, `bun.lock`. Internal refactor.

**OMCM References**:
- `/opt/oh-my-claude-money/src/` — Verify zero LSP/jsonrpc references.

**Acceptance Criteria**:
```bash
# Agent produces:
# 1. Confirmation that OMCM has zero vscode-jsonrpc/LSP dependency (yes/no)
# 2. Classification (expected: NO-ACTION)
# 3. 1-sentence justification
```

**Commit**: NO

---

### Task F: Logging/Background/Tmux DI/Start-Work Changes — Impact on OMCM

**What to do**:

**Step 1 — Extract upstream changes**:
```bash
cd /opt/@references/oh-my-opencode

git show ae8a6c5  # console.log → file-based log() for silent logging
git show d3e2b36  # tmux-subagent DI for testability
git show b497395  # background-agent: abort sessions on shutdown, prevent zombies
git show faca80c  # start-work: prevent overwriting session agent, inherit model, add variant to StoredMessage
```

**Step 2 — Check `faca80c` carefully (StoredMessage schema change)**:
```bash
cd /opt/@references/oh-my-opencode
# This commit adds 'variant' to model structure in StoredMessage
# OMCM reads StoredMessage from session storage!
git diff faca80c~1..faca80c -- src/features/hook-message-injector/types.ts
git diff faca80c~1..faca80c -- src/features/hook-message-injector/injector.ts
```

**Step 3 — Check OMCM's session message parsing**:
```bash
cd /opt/oh-my-claude-money
# How does OMCM read session messages?
grep -n "variant\|model\.\|modelID\|providerID" src/hud/omcm-hud.mjs | head -20
# Does OMCM read 'variant' field? If not, is it backward-compatible (additive field)?
```

**Step 4 — Check logging changes impact**:
```bash
cd /opt/oh-my-claude-money
# Does OMCM parse OMO's stdout/stderr?
grep -n "stdout\|stderr\|console\|output" src/executor/opencode-executor.mjs | head -20
grep -n "stdout\|stderr" src/pool/server-pool.mjs | head -20
# If OMCM relies on console output from OMO, the logging refactor breaks it
```

**Step 5 — Check background-agent shutdown behavior**:
```bash
cd /opt/oh-my-claude-money
# Does OMCM manage OMO background processes?
grep -rn "abort\|shutdown\|zombie\|cleanup\|background" src/pool/ src/executor/ | head -20
# If OMCM's server pool doesn't handle OMO's new abort-on-shutdown, could get stale connections
```

**Step 6 — Classify each sub-change separately and document**.

**Must NOT do**:
- Adopt DI patterns from OMO
- Implement logging changes
- Modify background process management

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Read-only investigation, but more files to check than D/E
- **Skills**: `[]`

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with A, B, C, D, E)
- **Blocks**: Task G
- **Blocked By**: Task 0

**References**:

**Upstream References**:
- `ae8a6c5` — 6 files changed: `console.*` → `log()`. If OMCM parses OMO stdout, this is impactful.
- `d3e2b36` — `tmux-subagent/manager.ts` DI refactor. Internal testability change.
- `b497395` — `background-agent/manager.ts` + `index.ts` — New shutdown/abort behavior. CHECK if OMCM server pool needs to handle this.
- `faca80c` — **CRITICAL**: Adds `variant` to `StoredMessage.model` structure. OMCM reads this data for HUD. CHECK backward compatibility.

**OMCM References**:
- `/opt/oh-my-claude-money/src/hud/omcm-hud.mjs:548-595` — Session message parsing. Reads `msg.model.modelID` and `msg.providerID`. CHECK if adding `variant` field is backward-compatible.
- `/opt/oh-my-claude-money/src/executor/opencode-executor.mjs` — How OMCM invokes OMO CLI. CHECK if it parses stdout.
- `/opt/oh-my-claude-money/src/pool/server-pool.mjs` — Server pool HTTP communication. CHECK if it parses stdout or relies on console output.

**Acceptance Criteria**:
```bash
# Agent produces:
# 1. Whether OMCM parses OMO stdout/stderr (yes/no + evidence)
# 2. Whether 'variant' field addition is backward-compatible for OMCM (yes/no)
# 3. Whether OMCM server pool handles OMO shutdown/abort (yes/no)
# 4. Per-sub-change classification (4 sub-classifications)
# 5. Overall classification for this track + justification + affected files
```

**Commit**: NO

---

### Task G: Synthesize Final Report

**What to do**:

1. Collect findings from Tasks A–F
2. Create `.sisyphus/reports/omo-impact-report.md` with this structure:

```markdown
# OMO Upstream Impact Analysis Report

## Summary Matrix

| # | Upstream Area | Classification | Affected OMCM Files | Justification |
|---|--------------|---------------|---------------------|---------------|
| A | Kimi model/provider | ? | ? | ? |
| B | requiresModel | ? | ? | ? |
| C | Model-resolver | ? | ? | ? |
| D | MCP OAuth 2.1 | ? | ? | ? |
| E | vscode-jsonrpc | ? | ? | ? |
| F | Logging/DI/start-work | ? | ? | ? |

## Preflight Validation Results
[From Task 0]

## Track A: Kimi Model/Provider Additions
[From Task A findings]

## Track B: requiresModel Agent Activation
[From Task B findings]

## Track C: Model-Resolver Changes
[From Task C findings]

## Track D: MCP OAuth 2.1
[From Task D findings]

## Track E: vscode-jsonrpc LSP Migration
[From Task E findings]

## Track F: Logging/Background/Tmux DI/Start-Work
[From Task F findings]

## Pre-Existing Issues Discovered
[Any issues found during analysis that pre-date these commits]

## Assumptions Validated
[From Task 0 results]
```

3. Run completeness verification:
```bash
grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" .sisyphus/reports/omo-impact-report.md
# Assert: >= 6
grep -c "TODO\|TBD\|FIXME\|needs.*investigation" .sisyphus/reports/omo-impact-report.md
# Assert: 0
grep -c "Track A\|Track B\|Track C\|Track D\|Track E\|Track F" .sisyphus/reports/omo-impact-report.md
# Assert: 6
```

**Must NOT do**:
- Add implementation recommendations beyond 1-sentence "nature of change needed"
- Include effort estimates
- Scope follow-up work

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: Synthesis task requiring structured writing from multiple inputs
- **Skills**: `[]`
  - No specialized skills — markdown assembly from structured data

**Parallelization**:
- **Can Run In Parallel**: NO (final synthesis)
- **Parallel Group**: Wave 2 (sequential, after all Wave 1 tracks)
- **Blocks**: None (final deliverable)
- **Blocked By**: Tasks A, B, C, D, E, F

**References**:

**Input References** (all findings from Wave 1):
- Task 0 output: Preflight validation JSON
- Task A output: Kimi model/provider findings
- Task B output: requiresModel findings
- Task C output: Model-resolver findings
- Task D output: MCP OAuth findings
- Task E output: vscode-jsonrpc findings
- Task F output: Logging/DI/start-work findings

**Template Reference**:
- Report structure defined above in Step 2

**Acceptance Criteria**:
```bash
# Verify report completeness:
test -f .sisyphus/reports/omo-impact-report.md && echo "EXISTS" || echo "MISSING"

# All 6 tracks classified
grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" .sisyphus/reports/omo-impact-report.md
# Assert: >= 6

# No TBD entries
grep -c "TODO\|TBD\|FIXME" .sisyphus/reports/omo-impact-report.md
# Assert: 0

# Summary matrix present
grep -c "Summary Matrix" .sisyphus/reports/omo-impact-report.md
# Assert: 1

# All track headers present
grep -c "Track [A-F]" .sisyphus/reports/omo-impact-report.md
# Assert: 6
```

**Commit**: YES
- Message: `docs: add OMO upstream impact analysis report`
- Files: `.sisyphus/reports/omo-impact-report.md`
- Pre-commit: Completeness verification grep commands above

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| G | `docs: add OMO upstream impact analysis report` | `.sisyphus/reports/omo-impact-report.md` | grep completeness checks |

---

## Success Criteria

### Verification Commands
```bash
# Report exists
test -f .sisyphus/reports/omo-impact-report.md

# All 6 areas classified
grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" .sisyphus/reports/omo-impact-report.md
# Expected: >= 6

# Zero TBD entries
grep -c "TODO\|TBD\|FIXME\|needs.*investigation" .sisyphus/reports/omo-impact-report.md
# Expected: 0

# Summary matrix present
grep "Summary Matrix" .sisyphus/reports/omo-impact-report.md
# Expected: match found
```

### Final Checklist
- [ ] All 6 upstream areas analyzed (A–F)
- [ ] Each has BREAKING/IMPORTANT/NICE-TO-HAVE/NO-ACTION classification
- [ ] Each has affected OMCM files listed
- [ ] Summary matrix at top of report
- [ ] Preflight assumptions validated
- [ ] No implementation code or patches in report
- [ ] Pre-existing issues documented (if any)
