# OMO Change Analysis → OMCM Impact Mapping

## TL;DR

> **Quick Summary**: Analyze ~60 recent oh-my-opencode (OMO) commits (v3.1.3..HEAD) and produce a structured impact report mapping every change to what OMCM must update. Analysis only — zero code modifications.
>
> **Deliverables**:
> - Per-area gap reports (7 files) in `.sisyphus/reports/omo-audit/`
> - Master commit classification table (BREAKING/IMPORTANT/NICE-TO-HAVE/NO-ACTION)
> - Executive summary with prioritized action list
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-8 (parallel) → Task 9

---

## Context

### Original Request
Produce a precise work plan to analyze OMO changes (listed commits) and map required OMCM updates. Parallel task graph with waves + dependencies. Structured TODO list oriented to analysis/reporting only. Incorporate user's checklists (breaking/important/nice/no-action; provider/model changes; agent system; model resolution; MCP/OAuth; infra). Must include explicit commands/paths to inspect.

### Research Findings

**OMCM's Current State (Hardcoded Values)**:
- `src/orchestrator/agent-fusion-map.mjs` — 3 models: opus (`claude-opus-4-5-20251101`), codex (`gpt-5.2-codex`), flash (`gemini-3.0-flash`)
- `src/orchestrator/fallback-orchestrator.mjs` — 4-model chain: `claude-opus-4-5`, `gpt-5.2-codex`, `gemini-2.5-flash`, `gpt-5.2`
- `src/tracking/metrics-collector.mjs` — 3 providers: `claude`, `openai`, `gemini`
- `src/orchestrator/agent-fusion-map.mjs` — 4 OMO agents: `build`, `explore`, `plan`, `general`

**OMO's Current State (Post v3.1.3)**:
- 6+ providers: `anthropic`, `openai`, `google`, `kimi-for-coding`, `zai-coding-plan`, `github-copilot`, `opencode`
- 12+ models: adds `kimi-k2.5`, `k2p5`, `glm-4.7`, `glm-4.7-free`, `glm-4.6v`, `gemini-3-pro`, `gemini-3-flash`, `gpt-5.2`, `claude-sonnet-4-5`, `claude-haiku-4-5`, `gpt-5-mini`, `gpt-5-nano`, `kimi-k2.5-free`
- 8 builtin agents: `sisyphus`, `oracle`, `librarian`, `explore`, `multimodal-looker`, `metis`, `momus`, `atlas`
- Per-agent and per-category fallback chains with `requiresModel`, `variant`, and `FallbackEntry[]`
- New connected-providers-cache system for runtime model availability
- Full MCP OAuth 2.1 (37 files, commit dcda876)

### Metis Review — Addressed Gaps

| Gap | Resolution |
|-----|-----------|
| OMO agent name mapping unclear (old build/plan/general → new names?) | Added Task 4 to inspect OMO agent registry and map old↔new names |
| opencode-executor.mjs invocation method unknown | Added to Task 1 (assumption validation) |
| `variant` field on fallback entries not addressed | Added to Task 6 (model resolution analysis) |
| connected-providers-cache impact unknown | Added to Task 6 |
| Commit range not locked | Locked to `966cc90..80ee52f` (v3.1.3..HEAD) in Task 1 |
| Reverted/superseded commits | Task 2 triage must identify net-effect |
| Report structure undefined | Locked 7 report files in acceptance criteria |
| Classification schema undefined | Locked 4 categories with precise definitions |

---

## Work Objectives

### Core Objective
Audit every OMO commit in range `966cc90..80ee52f` against 8 critical OMCM files and produce a classified impact report.

### Concrete Deliverables
- `.sisyphus/reports/omo-audit/00-assumptions.md` — Validated assumptions
- `.sisyphus/reports/omo-audit/01-commit-triage.md` — All commits bucketed into 6 areas
- `.sisyphus/reports/omo-audit/02-provider-model-gap.md`
- `.sisyphus/reports/omo-audit/03-agent-system-gap.md`
- `.sisyphus/reports/omo-audit/04-fallback-chain-gap.md`
- `.sisyphus/reports/omo-audit/05-model-resolution-gap.md`
- `.sisyphus/reports/omo-audit/06-mcp-oauth-assessment.md`
- `.sisyphus/reports/omo-audit/07-infra-changes.md`
- `.sisyphus/reports/omo-audit/08-commit-classification.md` — Master table
- `.sisyphus/reports/omo-audit/09-executive-summary.md`

### Definition of Done
- [ ] Every commit in range appears in 08-commit-classification.md with exactly one of: BREAKING, IMPORTANT, NICE-TO-HAVE, NO-ACTION
- [ ] Every BREAKING/IMPORTANT entry references at least one OMCM file path
- [ ] All 10 report files exist in `.sisyphus/reports/omo-audit/`
- [ ] No source files modified in either repository

### Must Have
- Exact `git show`/`git diff` commands for every claim
- OMCM file:line references for every identified gap
- 4-category classification (BREAKING/IMPORTANT/NICE-TO-HAVE/NO-ACTION)
- User's 6 checklist areas all covered (provider/model, agent system, model resolution, MCP/OAuth, infra, categories)

### Must NOT Have (Guardrails)
- **NO code modifications** — reports only
- **NO implementation recommendations** — report WHAT changed, not HOW to fix
- **NO scope expansion** beyond the locked commit range or 8 OMCM files
- **NO test coverage analysis** of either repo
- **NO OMO UI/console/frontend commit analysis** (irrelevant to OMCM)
- **NO deep-dive into OMO internal implementation** — only public interface changes matter

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A (analysis task)
- **User wants tests**: NO
- **Framework**: N/A

### Automated Verification (Agent-Executable)

Each task produces a markdown report. Verification = file existence + structure check.

```bash
# All report files exist
ls -la .sisyphus/reports/omo-audit/
# Assert: 10 files (00- through 09-)

# Every commit classified
cd /opt/@references/oh-my-opencode
TOTAL=$(git log 966cc90..80ee52f --oneline --no-merges | grep -cvE "signed the CLA")
CLASSIFIED=$(grep -c "^|" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/08-commit-classification.md | tail -1)
echo "Total meaningful commits: $TOTAL, Classified: $CLASSIFIED"
# Assert: CLASSIFIED >= TOTAL

# No unclassified rows
grep -E "^\|.*\|$" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/08-commit-classification.md | \
  grep -cvE "(BREAKING|IMPORTANT|NICE-TO-HAVE|NO-ACTION|Commit)"
# Assert: Output is 0

# BREAKING items reference OMCM files
grep "BREAKING" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/08-commit-classification.md | \
  grep -c "\.mjs"
# Assert: > 0 (every BREAKING references an OMCM file)
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Validate assumptions & lock commit range

Wave 2 (After Wave 1):
└── Task 2: Triage all commits into 6 buckets

Wave 3 (After Wave 2 — ALL PARALLEL):
├── Task 3: Provider & Model gap analysis
├── Task 4: Agent system gap analysis
├── Task 5: Fallback chain gap analysis
├── Task 6: Model resolution & cache gap analysis
├── Task 7: MCP/OAuth assessment
└── Task 8: Infrastructure changes audit

Wave 4 (After Wave 3):
└── Task 9: Synthesize master classification + executive summary

Critical Path: Task 1 → Task 2 → Task 3 (longest gap area) → Task 9
Parallel Speedup: ~60% faster than sequential (Wave 3 has 6 parallel tasks)
```

### Task Dependency Graph

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None (foundation) |
| 2 | 1 | 3,4,5,6,7,8 | None |
| 3 | 2 | 9 | 4,5,6,7,8 |
| 4 | 2 | 9 | 3,5,6,7,8 |
| 5 | 2 | 9 | 3,4,6,7,8 |
| 6 | 2 | 9 | 3,4,5,7,8 |
| 7 | 2 | 9 | 3,4,5,6,8 |
| 8 | 2 | 9 | 3,4,5,6,7 |
| 9 | 3,4,5,6,7,8 | None | None (final synthesis) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Dispatch |
|------|-------|---------------------|
| 1 | 1 | `delegate_task(category="quick", load_skills=[], run_in_background=false)` |
| 2 | 2 | `delegate_task(category="unspecified-low", load_skills=["git-master"], run_in_background=false)` |
| 3 | 3,4,5,6,7,8 | All `delegate_task(..., run_in_background=true)` in parallel |
| 4 | 9 | `delegate_task(category="unspecified-high", load_skills=[], run_in_background=false)` |

---

## Classification Schema (Locked)

| Category | Definition | Example |
|----------|-----------|---------|
| **BREAKING** | OMCM will malfunction, produce wrong results, or crash without addressing this change | Provider normalization silently drops kimi calls |
| **IMPORTANT** | OMCM works but misses significant capability or has degraded behavior | New model kimi-k2.5 available but OMCM can't route to it |
| **NICE-TO-HAVE** | Improvement that doesn't affect correctness | Updated category description text |
| **NO-ACTION** | OMO change doesn't affect OMCM at all | CI/CD, CLA signatures, test-only fixes |

---

## OMCM Files to Inspect (Locked - 8 Files)

| # | File Path | What It Contains |
|---|-----------|-----------------|
| F1 | `src/orchestrator/agent-fusion-map.mjs` | MODELS object, OMO_AGENTS, FUSION_MAP (29 entries), buildOpenCodeCommand() |
| F2 | `src/orchestrator/fallback-orchestrator.mjs` | FALLBACK_CHAIN (4 models), FallbackOrchestrator class |
| F3 | `src/orchestrator/fusion-orchestrator.mjs` | executeViaOpenCode(), provider detection from agent model name |
| F4 | `src/orchestrator/task-router.mjs` | Task routing decisions |
| F5 | `src/tracking/metrics-collector.mjs` | normalizeProvider() with 3 buckets, provider metrics |
| F6 | `src/tracking/realtime-tracker.mjs` | _normalizeProvider() with 3 buckets |
| F7 | `src/utils/provider-limits.mjs` | OpenAI/Gemini limit tracking |
| F8 | `src/executor/opencode-executor.mjs` | CLI invocation: how OMCM calls OpenCode |

---

## TODOs

- [ ] 1. Validate Assumptions & Lock Commit Range

  **What to do**:
  - Run `git log 966cc90..80ee52f --oneline --no-merges | wc -l` in `/opt/@references/oh-my-opencode` to confirm commit count
  - Run `git log 966cc90..80ee52f --oneline --no-merges | grep -cvE "signed the CLA"` to get meaningful commit count
  - Validate assumption A1 (CLI invocation): Read `/opt/oh-my-claude-money/src/executor/opencode-executor.mjs` — find the actual command invocation (look for `spawn`, `exec`, `child_process`, or ACP protocol calls). Document whether OMCM passes `--agent` and `--model` flags.
  - Validate assumption A2 (agent name mapping): Run `grep -n "agent" /opt/@references/oh-my-opencode/src/agents/index.ts` and check if old agent names (`build`, `explore`, `plan`, `general`) still exist or are aliases.
  - Validate assumption A3 (gemini-2.5-flash): Run `grep -r "gemini-2.5" /opt/@references/oh-my-opencode/src/ --include="*.ts"` to see if this model name appears anywhere.
  - Validate assumption A5 (opencode-upstream): Run `ls /opt/oh-my-claude-money/opencode-upstream/ 2>/dev/null && cat /opt/oh-my-claude-money/opencode-upstream/package.json 2>/dev/null | head -5` to determine if it exists and what it is.
  - Write report to `.sisyphus/reports/omo-audit/00-assumptions.md`

  **Must NOT do**:
  - Modify any files
  - Expand commit range

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple git/grep commands, fast validation
  - **Skills**: [`git-master`]
    - `git-master`: Git log analysis and range validation

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not writing code
  - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/opt/oh-my-claude-money/src/executor/opencode-executor.mjs` — Check how OMCM invokes OpenCode (spawn/exec/ACP)
  - `/opt/@references/oh-my-opencode/src/agents/index.ts` — Agent registry (what names are exported)

  **Inspection Commands**:
  ```bash
  # Lock commit range
  cd /opt/@references/oh-my-opencode
  git log 966cc90..80ee52f --oneline --no-merges | wc -l
  git log 966cc90..80ee52f --oneline --no-merges | grep -cvE "signed the CLA"

  # A1: How does OMCM invoke OpenCode?
  grep -n "spawn\|exec\|child_process\|fetch\|acp\|--agent\|--model" /opt/oh-my-claude-money/src/executor/opencode-executor.mjs

  # A2: Do old agent names still exist?
  cat /opt/@references/oh-my-opencode/src/agents/index.ts
  grep -rn "build\|general\|plan" /opt/@references/oh-my-opencode/src/agents/ --include="*.ts" | head -20

  # A3: Is gemini-2.5-flash still referenced?
  grep -r "gemini-2.5\|gemini-2\.5" /opt/@references/oh-my-opencode/src/ --include="*.ts"

  # A5: What is opencode-upstream?
  ls /opt/oh-my-claude-money/opencode-upstream/ 2>/dev/null
  ```

  **Acceptance Criteria**:
  ```bash
  # Report file exists
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/00-assumptions.md
  # Assert: exit code 0

  # Contains all 5 assumption validations
  grep -c "^### A[1-5]" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/00-assumptions.md
  # Assert: Output is 5
  ```

  **Commit**: NO

---

- [ ] 2. Triage All Commits Into 6 Buckets

  **What to do**:
  - List all meaningful commits: `git log 966cc90..80ee52f --oneline --no-merges` in OMO repo
  - Filter out CLA signatures and pure CI/CD commits (mark them NO-ACTION immediately)
  - For each remaining commit, run `git show --stat <sha>` to see files changed
  - Assign each commit to ONE primary bucket:
    1. **PROVIDERS & MODELS**: Commits touching model names, provider names, model catalogs
    2. **AGENT SYSTEM**: Commits touching agent definitions, agent types, agent dispatch
    3. **FALLBACK CHAINS**: Commits touching model-requirements.ts, fallbackChain entries
    4. **MODEL RESOLUTION**: Commits touching model-resolver.ts, model-availability.ts, connected-providers-cache.ts
    5. **MCP/OAUTH**: Commits touching features/mcp-oauth/, skill-mcp-manager/
    6. **INFRA/OTHER**: Logging, CI, tests, docs, tmux, zombie prevention
  - Note commits that touch MULTIPLE areas (tag with primary + secondary)
  - Identify reverted/superseded commits and mark net-effect
  - Write results to `.sisyphus/reports/omo-audit/01-commit-triage.md`

  **Must NOT do**:
  - Deeply analyze any single commit (that's Wave 3)
  - Modify files
  - Skip any commit (even NO-ACTION ones must be listed)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate effort, systematic commit classification
  - **Skills**: [`git-master`]
    - `git-master`: Git log navigation, commit stat analysis

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not writing code, just reading commit stats
  - `data-scientist`: Not statistical analysis

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (solo)
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - Task 1 output: `/opt/oh-my-claude-money/.sisyphus/reports/omo-audit/00-assumptions.md` — Use validated commit count and range
  - OMO commit log: `git log 966cc90..80ee52f --oneline --no-merges` at `/opt/@references/oh-my-opencode`

  **Inspection Commands**:
  ```bash
  cd /opt/@references/oh-my-opencode

  # Full commit list with stats
  git log 966cc90..80ee52f --oneline --stat --no-merges

  # Quick file-path scan per commit
  for sha in $(git log 966cc90..80ee52f --format="%h" --no-merges); do
    echo "=== $sha: $(git log -1 --format="%s" $sha) ==="
    git show --stat --format="" $sha | head -5
    echo ""
  done
  ```

  **Report Template**:
  ```markdown
  # 01 - Commit Triage

  ## Summary
  - Total commits in range: N
  - Meaningful (non-CLA/CI): M
  - Reverted/superseded: K (net-effect noted)

  ## Bucket Assignments

  ### 1. PROVIDERS & MODELS (N commits)
  | SHA | Message | Primary | Secondary | Files |
  |-----|---------|---------|-----------|-------|

  ### 2. AGENT SYSTEM (N commits)
  ...

  ### 6. INFRA/OTHER (N commits) — Likely NO-ACTION
  ...
  ```

  **Acceptance Criteria**:
  ```bash
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/01-commit-triage.md
  # Assert: exit 0

  # Every meaningful commit appears in report
  cd /opt/@references/oh-my-opencode
  MEANINGFUL=$(git log 966cc90..80ee52f --oneline --no-merges | grep -cvE "signed the CLA")
  IN_REPORT=$(grep -c "^|" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/01-commit-triage.md)
  echo "Meaningful: $MEANINGFUL, In report: $IN_REPORT"
  # Assert: IN_REPORT >= MEANINGFUL
  ```

  **Commit**: NO

---

- [ ] 3. Provider & Model Gap Analysis

  **What to do**:
  - From Task 2's bucket #1 (PROVIDERS & MODELS), deep-analyze each commit
  - For each commit, run `git show <sha>` to see exact changes
  - Cross-reference against OMCM's hardcoded values:
    - **MODELS object** in `agent-fusion-map.mjs:17-43` — Currently: opus, codex, flash
    - **FALLBACK_CHAIN** in `fallback-orchestrator.mjs:12-41` — Currently: 4 models including `gemini-2.5-flash`
    - **normalizeProvider()** in `metrics-collector.mjs:54-66` — Currently: claude, openai, gemini (3 buckets)
    - **_normalizeProvider()** in `realtime-tracker.mjs:191-194` — Same 3 buckets
    - **MODELS** constants in `agent-fusion-map.mjs:17-43` — Outdated model IDs
  - For each new provider/model in OMO, determine:
    - Does OMCM's normalizeProvider() handle it? (grep for the provider name)
    - Is the model in OMCM's MODELS or FALLBACK_CHAIN?
    - What happens if OMCM encounters this provider/model? (silent drop? error? misroute?)
  - Classify each finding: BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION
  - Write report to `.sisyphus/reports/omo-audit/02-provider-model-gap.md`

  **Must NOT do**:
  - Suggest implementation fixes
  - Analyze commits not in bucket #1
  - Modify any files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Systematic cross-referencing, moderate complexity
  - **Skills**: [`git-master`]
    - `git-master`: `git show` for commit details

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Reading .mjs files, not writing TypeScript

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4,5,6,7,8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:

  **OMCM Files to Inspect**:
  - `src/orchestrator/agent-fusion-map.mjs:17-43` — MODELS object (3 hardcoded models)
  - `src/orchestrator/fallback-orchestrator.mjs:12-41` — FALLBACK_CHAIN (4 models, includes `gemini-2.5-flash`)
  - `src/tracking/metrics-collector.mjs:54-66` — normalizeProvider() (3 buckets)
  - `src/tracking/realtime-tracker.mjs:191-194` — _normalizeProvider() (3 buckets)
  - `src/utils/provider-limits.mjs` — Provider limit tracking functions

  **OMO Files Changed**:
  - `src/shared/model-requirements.ts:1-153` — Full provider/model catalog with `kimi-for-coding`, `zai-coding-plan`, etc.
  - `src/shared/model-availability.ts` — Fuzzy model matching

  **Key Commits to Inspect**:
  ```bash
  cd /opt/@references/oh-my-opencode
  git show d2d8d1a  # feat: add kimi-k2.5 to agent fallback chains
  git show 9d20a5b  # feat: add kimi-for-coding provider
  git show b1b4578  # feat: add opencode/kimi-k2.5-free fallback
  git show 0dbec08  # feat: add kimi-for-coding to model fallback
  git show 67aeb9c  # chore: replace big-pickle with glm-4.7-free
  git show 5f243e2  # chore: add glm-4.7 to visual-engineering fallback
  git show b731399  # chore: prioritize gemini-3-pro over opus in oracle
  ```

  **Acceptance Criteria**:
  ```bash
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/02-provider-model-gap.md
  # Assert: exit 0

  # Report contains new provider names
  grep -c "kimi-for-coding\|zai-coding-plan\|github-copilot" \
    /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/02-provider-model-gap.md
  # Assert: > 0

  # Report contains classification
  grep -cE "(BREAKING|IMPORTANT|NICE-TO-HAVE|NO-ACTION)" \
    /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/02-provider-model-gap.md
  # Assert: > 0
  ```

  **Commit**: NO

---

- [ ] 4. Agent System Gap Analysis

  **What to do**:
  - From Task 2's bucket #2 (AGENT SYSTEM), deep-analyze each commit
  - Map OMO's current agent names against OMCM's OMO_AGENTS and FUSION_MAP:
    - Read `/opt/@references/oh-my-opencode/src/agents/index.ts` for current agent exports
    - Read `/opt/@references/oh-my-opencode/src/agents/types.ts` for AgentMode, AgentFactory, BuiltinAgentName
    - Compare against OMCM's `OMO_AGENTS` object (agent-fusion-map.mjs:50-67): `build`, `explore`, `plan`, `general`
    - Compare against OMCM's `FUSION_MAP` (agent-fusion-map.mjs:73-334): 29 entries mapping to `omoAgent` field
  - Check if OMO's agent names still match what OMCM passes via `--agent`:
    - `buildOpenCodeCommand()` in agent-fusion-map.mjs:398-418 uses `fusion.omoAgent`
    - Does OpenCode accept `build`, `explore`, `plan`, `general` as valid agent names?
  - Check `requiresModel` and `isModelAvailable` features:
    - `git show baefd16` — feat(shared): add requiresModel field
    - `git show 2c74f60` — feat(delegate-task): check requiresModel
    - Does OMCM need to check model availability before routing?
  - Check AgentMode (primary vs subagent):
    - `git show 3b5d18e` — exclude subagents from UI model selection
    - Does this affect OMCM's model passing?
  - Classify each finding
  - Write report to `.sisyphus/reports/omo-audit/03-agent-system-gap.md`

  **Must NOT do**:
  - Suggest new agent mappings
  - Analyze commits not in bucket #2

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Cross-referencing two codebases, moderate complexity
  - **Skills**: [`git-master`]
    - `git-master`: Commit inspection

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 3,5,6,7,8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:

  **OMCM Files to Inspect**:
  - `src/orchestrator/agent-fusion-map.mjs:50-67` — OMO_AGENTS (4 agents: build, explore, plan, general)
  - `src/orchestrator/agent-fusion-map.mjs:73-334` — FUSION_MAP (29 entries, `omoAgent` field)
  - `src/orchestrator/agent-fusion-map.mjs:398-418` — buildOpenCodeCommand() passes `fusion.omoAgent` as `--agent`

  **OMO Files to Inspect**:
  - `src/agents/index.ts` — Agent registry exports
  - `src/agents/types.ts:73-94` — BuiltinAgentName type (`sisyphus`, `oracle`, `librarian`, `explore`, `multimodal-looker`, `metis`, `momus`, `atlas`)
  - `src/shared/model-requirements.ts:13-90` — AGENT_MODEL_REQUIREMENTS (per-agent fallback chains)

  **Key Commits to Inspect**:
  ```bash
  cd /opt/@references/oh-my-opencode
  git show baefd16  # feat(shared): add requiresModel field and isModelAvailable
  git show 2c74f60  # feat(delegate-task): check requiresModel
  git show 3b5d18e  # fix(agents): exclude subagents from UI model selection
  git show 691fa8b  # refactor(sisyphus-junior): extract MODE constant
  git show 71b2f15  # chore(agents): unify agent description format
  ```

  **Acceptance Criteria**:
  ```bash
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/03-agent-system-gap.md
  # Assert: exit 0

  # Contains agent name mapping table
  grep -c "sisyphus\|oracle\|librarian\|atlas" \
    /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/03-agent-system-gap.md
  # Assert: > 0

  # Contains OMCM file references
  grep -c "agent-fusion-map.mjs" \
    /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/03-agent-system-gap.md
  # Assert: > 0
  ```

  **Commit**: NO

---

- [ ] 5. Fallback Chain Gap Analysis

  **What to do**:
  - From Task 2's bucket #3 (FALLBACK CHAINS), deep-analyze each commit
  - Compare OMO's per-agent fallback chains (model-requirements.ts) against OMCM's structures:
    - **OMCM fallback-orchestrator.mjs:12-41**: Fixed 4-model chain (opus→codex→gemini-2.5-flash→gpt-5.2)
    - **OMO model-requirements.ts:13-90**: Per-agent chains (sisyphus has 6 entries, oracle has 3, etc.)
    - **OMO model-requirements.ts:92-152**: Per-category chains (visual-engineering, ultrabrain, deep, artistry, quick, etc.)
  - Map specific drift:
    - `gemini-2.5-flash` in OMCM vs `gemini-3-flash`/`gemini-3-pro` in OMO
    - OMCM has no per-agent differentiation; OMO does
    - OMO has `variant` field (max, high, medium, xhigh) on fallback entries; OMCM has none
    - OMO has `requiresModel` on certain categories (deep requires gpt-5.2-codex, artistry requires gemini-3-pro)
  - Determine: Does OMCM's flat 4-model fallback chain still produce correct behavior, or is it functionally broken?
  - Classify each drift
  - Write report to `.sisyphus/reports/omo-audit/04-fallback-chain-gap.md`

  **Must NOT do**:
  - Propose new fallback chain configurations
  - Modify files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Systematic comparison of two data structures
  - **Skills**: []
    - No special skills needed; pure read + compare

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 3,4,6,7,8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:

  **OMCM Files to Inspect**:
  - `src/orchestrator/fallback-orchestrator.mjs:12-41` — FALLBACK_CHAIN array (4 entries)
  - `src/orchestrator/agent-fusion-map.mjs:17-43` — MODELS (3 tier-based models)
  - `src/orchestrator/fusion-orchestrator.mjs:481-537` — executeViaOpenCode() uses model.opencodeAgent

  **OMO Files to Inspect**:
  - `src/shared/model-requirements.ts` — AGENT_MODEL_REQUIREMENTS + CATEGORY_MODEL_REQUIREMENTS (full file, 153 lines)

  **Key Commits to Inspect**:
  ```bash
  cd /opt/@references/oh-my-opencode
  git show 6e9cb7e  # chore: add variant max to momus opus-4-5
  git show b731399  # chore: prioritize gemini-3-pro over opus in oracle
  git show e08904a  # feat: add artistry category to ultrawork-mode
  git show 1187a02  # fix: Atlas respects fallbackChain
  git show ad95880  # fix(start-work): restore atlas agent and fallback chain
  git show a424f81  # docs: update Sisyphus fallback chain
  git show c06f386  # refactor: revamp ultrabrain category
  ```

  **Acceptance Criteria**:
  ```bash
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/04-fallback-chain-gap.md
  # Assert: exit 0

  # Contains comparison of old vs new chains
  grep -c "gemini-2.5-flash\|gemini-3-pro\|gemini-3-flash" \
    /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/04-fallback-chain-gap.md
  # Assert: >= 2 (both old and new mentioned)
  ```

  **Commit**: NO

---

- [ ] 6. Model Resolution & Cache Gap Analysis

  **What to do**:
  - From Task 2's bucket #4 (MODEL RESOLUTION), deep-analyze each commit
  - Understand OMO's new model resolution pipeline:
    - `model-resolver.ts` — resolveModelWithFallback() with ExtendedModelResolutionInput
    - `model-availability.ts` — fuzzyMatchModel() for flexible model name matching
    - `connected-providers-cache.ts` — Runtime cache of which providers/models are actually available
  - Determine OMCM impact:
    - Does OMCM need to read the connected-providers-cache? (currently it doesn't)
    - Does OMCM's `buildOpenCodeCommand()` pass model names that OMO's fuzzy matcher will handle?
    - Does the `variant` field in resolution affect what model OpenCode actually uses?
    - Does `resolveModelWithFallback()` change what model a session actually runs?
  - Check model name format: OMO uses `provider/model` (e.g., `anthropic/claude-opus-4-5`). OMCM uses `provider/model` in buildOpenCodeCommand (line 404). Verify format compatibility.
  - Classify each finding
  - Write report to `.sisyphus/reports/omo-audit/05-model-resolution-gap.md`

  **Must NOT do**:
  - Modify files
  - Deep-dive into OMO's internal resolution algorithm (only public interface)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Reading TypeScript type definitions, moderate analysis
  - **Skills**: [`git-master`]
    - `git-master`: Commit inspection

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 3,4,5,7,8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:

  **OMCM Files to Inspect**:
  - `src/orchestrator/agent-fusion-map.mjs:398-418` — buildOpenCodeCommand() model format
  - `src/orchestrator/fusion-orchestrator.mjs:481-537` — executeViaOpenCode()

  **OMO Files to Inspect**:
  - `src/shared/model-resolver.ts` — ModelResolutionInput, resolveModelWithFallback()
  - `src/shared/model-availability.ts` — fuzzyMatchModel()
  - `src/shared/connected-providers-cache.ts` — Provider/model cache system
  - `src/shared/model-requirements.ts:1-11` — FallbackEntry type with `variant` field

  **Key Commits to Inspect**:
  ```bash
  cd /opt/@references/oh-my-opencode
  git show 80ee52f  # fix: improve model resolution with client API fallback
  git show 0c3fbd7  # fix(model-resolver): respect UI model selection
  git show bffa1ad  # fix(model-resolver): use connected providers cache when empty
  git show 8a9d966  # fix(model-resolver): skip fallback chain when no cache
  git show ca93d2f  # fix(model-resolver): skip fallback when unavailable
  git show c905e1c  # fix(delegate-task): restore resolved.model to category chain
  git show 34aaef2  # fix(delegate-task): pass registered agent model explicitly
  git show faca80c  # fix(start-work): inherit parent model for subagent types
  ```

  **Acceptance Criteria**:
  ```bash
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/05-model-resolution-gap.md
  # Assert: exit 0

  # Contains analysis of cache system
  grep -c "connected-providers-cache\|fuzzyMatch\|resolveModel" \
    /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/05-model-resolution-gap.md
  # Assert: > 0
  ```

  **Commit**: NO

---

- [ ] 7. MCP/OAuth Assessment

  **What to do**:
  - From Task 2's bucket #5 (MCP/OAUTH), deep-analyze the commits
  - Primary commit: `dcda876` — feat(mcp-oauth): add full OAuth 2.1 (37 files, 3221 insertions)
  - Determine scope of impact:
    - Run `git show --stat dcda876` to list all files
    - Categorize files: schema changes, new features, CLI commands, doctor checks
    - Focus on: Does this change any PUBLIC interface that OMCM interacts with?
  - Check if OMCM's MCP interaction is affected:
    - OMCM has `opencode-executor.mjs` and `opencode-server-pool.mjs` — do these use MCP?
    - Does OMCM need to handle OAuth tokens when connecting to MCP servers?
    - Is the `src/features/claude-code-mcp-loader/types.ts` schema change (new `oauth` field) relevant to OMCM?
  - Determine: Is this entirely internal to OMO (NO-ACTION), or does OMCM need awareness?
  - Write report to `.sisyphus/reports/omo-audit/06-mcp-oauth-assessment.md`

  **Must NOT do**:
  - Analyze OAuth protocol implementation details
  - Suggest OAuth integration
  - Read all 37 files — focus on interface/schema changes only

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Scoped assessment, likely NO-ACTION or NICE-TO-HAVE
  - **Skills**: [`git-master`]
    - `git-master`: `git show --stat` for file list

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 3,4,5,6,8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:

  **OMCM Files to Inspect**:
  - `src/executor/opencode-executor.mjs` — Does OMCM use MCP to talk to OpenCode?
  - `src/executor/opencode-server-pool.mjs` — Server pool connection method

  **OMO Files Changed**:
  - `src/features/mcp-oauth/` — All new (provider, storage, discovery, DCR, callback-server, step-up, schema, resource-indicator)
  - `src/features/claude-code-mcp-loader/types.ts` — Schema change (new `oauth` field)
  - `src/features/skill-mcp-manager/manager.ts` — OAuth integration in skill MCP
  - `src/cli/mcp-oauth/` — New CLI commands

  **Key Commits**:
  ```bash
  cd /opt/@references/oh-my-opencode
  git show --stat dcda876  # Full OAuth implementation file list
  git show dcda876 -- src/features/claude-code-mcp-loader/types.ts  # Schema change
  ```

  **Acceptance Criteria**:
  ```bash
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/06-mcp-oauth-assessment.md
  # Assert: exit 0

  # Contains clear verdict
  grep -cE "(BREAKING|IMPORTANT|NICE-TO-HAVE|NO-ACTION)" \
    /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/06-mcp-oauth-assessment.md
  # Assert: > 0
  ```

  **Commit**: NO

---

- [ ] 8. Infrastructure Changes Audit

  **What to do**:
  - From Task 2's bucket #6 (INFRA/OTHER), review all commits
  - Focus areas:
    - **Silent logging**: `ae8a6c5` — replace console.log/warn/error with file-based log()
    - **Tmux DI**: `d3e2b36` — dependency injection for tmux-subagent
    - **Zombie prevention**: `b497395` — abort sessions on shutdown
    - **LSP migration**: `a94fbad` — vscode-jsonrpc for stability
    - **Config changes**: `76f8c50` — add 'dev-browser' to BrowserAutomationProviderSchema
    - **Override/category**: `23b49c4` — expand override.category and reasoningEffort
  - For each, determine:
    - Does OMCM call any affected API? (e.g., does OMCM use console.log from OMO?)
    - Does OMCM spawn tmux subagents?
    - Does OMCM handle session shutdown?
    - Does the config schema change affect OMCM's config reading?
  - Most infra changes are likely NO-ACTION, but verify each
  - Write report to `.sisyphus/reports/omo-audit/07-infra-changes.md`

  **Must NOT do**:
  - Deep-dive into CI/CD pipeline changes
  - Analyze test infrastructure changes
  - Modify files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Most items are NO-ACTION, quick assessment
  - **Skills**: [`git-master`]
    - `git-master`: Quick commit inspection

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 3,4,5,6,7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:

  **OMCM Files to Inspect**:
  - `src/executor/opencode-executor.mjs` — Does it depend on OMO's logging behavior?
  - `src/executor/opencode-server-pool.mjs` — Session shutdown handling?
  - `src/config/schema.mjs` — Config schema compatibility

  **Key Commits**:
  ```bash
  cd /opt/@references/oh-my-opencode
  git show ae8a6c5  # refactor: replace console.log with file-based log()
  git show d3e2b36  # refactor(tmux-subagent): DI for testability
  git show b497395  # fix(background-agent): prevent zombie processes
  git show a94fbad  # Migrate LSP client to vscode-jsonrpc
  git show 76f8c50  # fix(config): add 'dev-browser' to schema
  git show 23b49c4  # fix: expand override.category and reasoningEffort
  ```

  **Acceptance Criteria**:
  ```bash
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/07-infra-changes.md
  # Assert: exit 0
  ```

  **Commit**: NO

---

- [ ] 9. Synthesize Master Classification & Executive Summary

  **What to do**:
  - Read ALL gap reports from Tasks 3-8 (files 02 through 07)
  - Build the master commit classification table:
    - Every commit gets exactly ONE classification: BREAKING / IMPORTANT / NICE-TO-HAVE / NO-ACTION
    - Classify by PRIMARY area impact from the gap reports
    - For BREAKING/IMPORTANT: include the affected OMCM file(s)
  - Write `.sisyphus/reports/omo-audit/08-commit-classification.md`:
    ```markdown
    | SHA | Message | Classification | Primary Area | OMCM Files Affected |
    |-----|---------|---------------|-------------|-------------------|
    ```
  - Write `.sisyphus/reports/omo-audit/09-executive-summary.md`:
    - Total commits analyzed
    - Breakdown: N BREAKING, M IMPORTANT, K NICE-TO-HAVE, J NO-ACTION
    - Top 5 most critical findings (ranked)
    - OMCM files ranked by number of BREAKING/IMPORTANT findings
    - Summary of each checklist area (1 paragraph each)
    - **NO recommendations** — only findings

  **Must NOT do**:
  - Re-analyze commits (use existing reports)
  - Propose fixes or implementation
  - Add findings not supported by gap reports

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Synthesis of 6 reports into coherent classification + executive summary requires strong reasoning
  - **Skills**: []
    - No special skills needed; reading markdown + synthesizing

  **Skills Evaluated but Omitted**:
  - `git-master`: No git operations needed (reading existing reports)
  - `data-scientist`: Not statistical analysis

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (solo, final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 3, 4, 5, 6, 7, 8

  **References**:

  **Input Files (all from previous tasks)**:
  - `.sisyphus/reports/omo-audit/02-provider-model-gap.md` — Provider/model findings
  - `.sisyphus/reports/omo-audit/03-agent-system-gap.md` — Agent system findings
  - `.sisyphus/reports/omo-audit/04-fallback-chain-gap.md` — Fallback chain findings
  - `.sisyphus/reports/omo-audit/05-model-resolution-gap.md` — Model resolution findings
  - `.sisyphus/reports/omo-audit/06-mcp-oauth-assessment.md` — MCP/OAuth findings
  - `.sisyphus/reports/omo-audit/07-infra-changes.md` — Infrastructure findings

  **Acceptance Criteria**:
  ```bash
  # Both synthesis files exist
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/08-commit-classification.md && \
  test -f /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/09-executive-summary.md
  # Assert: exit 0

  # Every meaningful commit is classified
  cd /opt/@references/oh-my-opencode
  MEANINGFUL=$(git log 966cc90..80ee52f --oneline --no-merges | grep -cvE "signed the CLA")
  CLASSIFIED=$(grep -c "^|" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/08-commit-classification.md)
  echo "Meaningful: $MEANINGFUL, Classified: $CLASSIFIED"
  # Assert: CLASSIFIED >= MEANINGFUL

  # All 4 classification categories are used
  grep -cE "BREAKING" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/08-commit-classification.md
  grep -cE "IMPORTANT" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/08-commit-classification.md
  grep -cE "NO-ACTION" /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/08-commit-classification.md
  # Assert: All > 0

  # Executive summary has breakdown section
  grep -c "BREAKING\|IMPORTANT\|NICE-TO-HAVE\|NO-ACTION" \
    /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/09-executive-summary.md
  # Assert: >= 4

  # No source files were modified
  cd /opt/oh-my-claude-money
  git diff --name-only | grep -v ".sisyphus/"
  # Assert: empty output
  ```

  **Commit**: NO

---

## Commit Strategy

**No commits.** This is a read-only analysis plan. All outputs are report files in `.sisyphus/reports/omo-audit/`.

---

## Success Criteria

### Verification Commands
```bash
# All 10 report files exist
ls /opt/oh-my-claude-money/.sisyphus/reports/omo-audit/*.md | wc -l
# Expected: 10

# No source files modified
cd /opt/oh-my-claude-money
git status --porcelain | grep -v ".sisyphus/"
# Expected: empty

# Classification completeness
cd /opt/@references/oh-my-opencode
TOTAL=$(git log 966cc90..80ee52f --oneline --no-merges | grep -cvE "signed the CLA")
echo "Total meaningful commits to classify: $TOTAL"
```

### Final Checklist
- [ ] All 10 report files exist in `.sisyphus/reports/omo-audit/`
- [ ] Every meaningful commit is classified in 08-commit-classification.md
- [ ] Every BREAKING/IMPORTANT entry references OMCM file paths
- [ ] All 6 checklist areas covered (provider/model, agent, fallback, model-resolution, MCP/OAuth, infra)
- [ ] No source files modified in either repository
- [ ] Executive summary includes top-5 critical findings
