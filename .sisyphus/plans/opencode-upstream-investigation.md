# Investigation: OpenCode Upstream Changes v1.1.38→v1.1.45 Affecting OMCM HUD

## TL;DR

> **Quick Summary**: Investigate 124 upstream OpenCode commits (v1.1.38→v1.1.45) to identify changes to message storage format, token fields, and provider/model detection that may break or degrade OMCM HUD token aggregation and provider counting.
>
> **Deliverables**:
> - Message storage schema diff report (v1.1.38 vs v1.1.45)
> - Token field compatibility matrix (upstream fields vs OMCM expectations)
> - Provider/model ID enumeration (including custom providers)
> - Risk assessment with specific OMCM code locations affected
>
> **Estimated Effort**: Medium (investigation only, no code changes)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 4 → Task 6

---

## Context

### Original Request
Produce an investigation plan to analyze upstream OpenCode changes (v1.1.38→v1.1.45) that may affect OMCM HUD token aggregation and provider/model detection. Investigation only — no code edits.

### Key Findings from Pre-Research

**Upstream Commit Range**: 124 commits total, 14 relevant (token/provider/model/message/storage/custom keywords).

**Critical Commits Identified**:
| Commit | Message | Files | Risk |
|--------|---------|-------|------|
| `f40bdd1ac3` | `feat(cli): include cache tokens in stats (#10582)` | `packages/opencode/src/cli/cmd/stats.ts` | HIGH — adds `cache.read`/`cache.write` to stats aggregation |
| `bdfd8f8b0f` | `feat(app): custom provider` | `packages/app/src/components/dialog-custom-provider.tsx` + 2 | MEDIUM — new custom providers may emit unknown `providerID` values |
| `b937fe9450` | `fix(provider): include providerID in SDK cache key` | `packages/opencode/src/provider/provider.ts` | LOW — internal SDK change, no message format impact |
| `2125dc11c7` | `fix: show all provider models when no providers connected` | (app UI) | LOW — UI only |

**Current OMCM Token Reading** (`src/hud/omcm-hud.mjs:577-585`):
```javascript
const tokens = msg.tokens;
if (tokens) {
  const cacheRead = (tokens.cache && tokens.cache.read) || 0;
  inputTokens = (tokens.input || 0) + cacheRead;
  outputTokens = tokens.output || 0;
}
```

**Actual Upstream Message Schema** (from `packages/opencode/src/session/message.ts` at v1.1.45):
```typescript
tokens: z.object({
  input: z.number(),
  output: z.number(),
  reasoning: z.number(),    // ← OMCM ignores this
  cache: z.object({
    read: z.number(),
    write: z.number(),       // ← OMCM ignores this
  }),
})
```

**Actual JSON on Disk** (verified from `~/.local/share/opencode/storage/message/`):
```json
{
  "tokens": {
    "input": 9431,
    "output": 1778,
    "reasoning": 931,        // ← Present but OMCM ignores
    "cache": {
      "read": 4736,
      "write": 0              // ← Present but OMCM ignores
    }
  }
}
```

**Provider Detection** (`src/hud/omcm-hud.mjs:556-574`):
- Reads `msg.providerID` (top-level, assistant messages)
- Falls back to `msg.model.providerID` (user messages)
- Normalizes `providerID === 'opencode'` by inspecting `modelID` string for keywords
- Only maps to: `openai`, `google`, `anthropic`
- **Unknown providers silently dropped** (no `else` catch-all)

### Metis Review Findings
1. `tokens.reasoning` field exists upstream but OMCM ignores it — investigation needed to determine if this affects rate-limit-relevant token counting
2. `cache.write` exists but OMCM only reads `cache.read` — same concern
3. Custom providers (`bdfd8f8b0`) are UI-only (app package) but may produce new `providerID` values in messages that OMCM's normalization logic won't recognize
4. The `source: "custom"` field in provider config could lead to arbitrary providerID strings

---

## Work Objectives

### Core Objective
Catalog every upstream change (v1.1.38→v1.1.45) that touches message persistence format, token field semantics, or provider/model identification, and map each to specific OMCM code that may be affected.

### Concrete Deliverables
- Investigation report: `.sisyphus/drafts/opencode-upstream-findings.md`
- No code changes to OMCM

### Definition of Done
- [ ] All 14 relevant commits fully analyzed with patch diffs reviewed
- [ ] Token field compatibility matrix completed (all fields in upstream schema vs OMCM expectations)
- [ ] Provider ID enumeration completed (built-in + custom provider paths)
- [ ] Risk assessment for each finding (BREAKING / DEGRADED / SAFE)

### Must Have
- Specific OMCM file:line references for every affected code path
- Commands to reproduce/validate each finding
- Analysis of `f40bdd1ac` (cache tokens in stats) impact on OMCM
- Analysis of `bdfd8f8b0` (custom provider) impact on OMCM provider detection

### Must NOT Have (Guardrails)
- No code changes to any OMCM source files
- No implementation suggestions (investigation only)
- No changes to package.json, config, or any non-markdown files

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: N/A (investigation-only plan)
- **User wants tests**: Manual verification via commands
- **Framework**: N/A

### Automated Verification (per task)

All verification is via read-only commands:
- `gh api` to fetch upstream patches
- `cat` / `python3 -m json.tool` to inspect local message JSON files
- `grep` to search OMCM source for field references

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Schema Diff | None | Starting point — establishes baseline |
| Task 2: Token Stats Commit | None | Independent commit analysis |
| Task 3: Custom Provider Commit | None | Independent commit analysis |
| Task 4: Token Compatibility Matrix | Task 1, Task 2 | Needs schema + stats change data |
| Task 5: Provider ID Enumeration | Task 3 | Needs custom provider understanding |
| Task 6: Risk Assessment Report | Task 4, Task 5 | Synthesizes all findings |

## Parallel Execution Graph

```
Wave 1 (Start immediately — independent research):
├── Task 1: Message schema diff (v1.1.38 vs v1.1.45)
├── Task 2: Analyze f40bdd1ac (cache tokens in stats)
└── Task 3: Analyze bdfd8f8b0 (custom provider) + provider enumeration

Wave 2 (After Wave 1):
├── Task 4: Token field compatibility matrix (depends: 1, 2)
└── Task 5: Provider/Model ID impact analysis (depends: 3)

Wave 3 (After Wave 2):
└── Task 6: Consolidated risk assessment report (depends: 4, 5)

Critical Path: Task 1 → Task 4 → Task 6
Parallel Speedup: ~40% faster than sequential
```

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1, 2, 3 | 3× `explore` in parallel (read-only codebase + GitHub API) |
| 2 | 4, 5 | 2× `explore-medium` (synthesis from Wave 1 findings) |
| 3 | 6 | 1× `architect-medium` (risk assessment requires judgment) |

---

## TODOs

- [ ] 1. Message Storage Schema Diff (v1.1.38 vs v1.1.45)

  **What to do**:
  - Fetch `packages/opencode/src/session/message.ts` at both tags via GitHub API
  - Diff the `Info` / `metadata.assistant` schema definitions
  - Document every field addition, removal, or type change
  - Check `packages/opencode/src/storage/storage.ts` for persistence logic changes
  - Inspect 5+ actual message JSON files on disk to confirm current format

  **Must NOT do**:
  - Do not edit any files
  - Do not draw conclusions about OMCM impact (that's Task 4)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read-only GitHub API fetches and file inspection, no complex reasoning needed
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Needed to understand Zod schema definitions
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed — using GitHub API, not local git operations
    - `frontend-ui-ux`: No UI analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4 (Token Compatibility Matrix)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs:577-585` — Current OMCM token field reading (to know what fields OMCM expects)
  - `src/hud/omcm-hud.mjs:556-558` — Current OMCM providerID/modelID reading

  **API/Type References**:
  - `packages/opencode/src/session/message.ts` (upstream) — The Zod schema defining `Message.Info`
  - `packages/opencode/src/storage/storage.ts` (upstream) — Storage migration and persistence logic

  **Commands to Execute**:
  ```bash
  # Fetch message.ts at v1.1.38
  gh api "repos/sst/opencode/contents/packages/opencode/src/session/message.ts?ref=v1.1.38" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); print(base64.b64decode(d['content']).decode())" \
    > /tmp/message-v1.1.38.ts

  # Fetch message.ts at v1.1.45
  gh api "repos/sst/opencode/contents/packages/opencode/src/session/message.ts?ref=v1.1.45" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); print(base64.b64decode(d['content']).decode())" \
    > /tmp/message-v1.1.45.ts

  # Diff schemas
  diff /tmp/message-v1.1.38.ts /tmp/message-v1.1.45.ts

  # Fetch storage.ts at both versions and diff
  gh api "repos/sst/opencode/contents/packages/opencode/src/storage/storage.ts?ref=v1.1.38" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); print(base64.b64decode(d['content']).decode())" \
    > /tmp/storage-v1.1.38.ts
  gh api "repos/sst/opencode/contents/packages/opencode/src/storage/storage.ts?ref=v1.1.45" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); print(base64.b64decode(d['content']).decode())" \
    > /tmp/storage-v1.1.45.ts
  diff /tmp/storage-v1.1.38.ts /tmp/storage-v1.1.45.ts

  # Inspect actual message JSON files on disk (5 samples)
  for ses in $(ls ~/.local/share/opencode/storage/message/ | head -3); do
    for msg in $(ls ~/.local/share/opencode/storage/message/$ses/ | head -2); do
      echo "=== $ses/$msg ==="
      python3 -m json.tool ~/.local/share/opencode/storage/message/$ses/$msg
    done
  done
  ```

  **Acceptance Criteria**:
  - [ ] Schema diff report produced showing all field changes between v1.1.38 and v1.1.45
  - [ ] Storage persistence logic diff reviewed (any migration changes?)
  - [ ] At least 5 actual message JSON files inspected, fields documented
  - [ ] Output: list of all fields in `metadata.assistant` / top-level message with types

  **Commit**: NO

---

- [ ] 2. Analyze Commit f40bdd1ac (Cache Tokens in Stats)

  **What to do**:
  - Fetch full patch of `f40bdd1ac3` via GitHub API
  - Document exactly what `cache.read` and `cache.write` fields are added to stats aggregation
  - Trace where `message.info.tokens.cache?.read` and `.write` originate (message schema)
  - Determine if this commit changes how tokens are **stored** in message JSON (it likely doesn't — it only changes CLI stats aggregation)
  - Verify whether `tokens.cache.read` and `tokens.cache.write` were already present in message JSON before this commit

  **Must NOT do**:
  - Do not modify any files
  - Do not assess OMCM impact (Task 4 does that)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single commit analysis, read-only GitHub API
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Needed to trace TypeScript type flows
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not doing local git ops

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs:581-584` — OMCM reads `tokens.cache.read` but NOT `tokens.cache.write` or `tokens.reasoning`

  **Upstream References**:
  - `packages/opencode/src/cli/cmd/stats.ts` — The file changed by f40bdd1ac
  - `packages/opencode/src/session/message.ts:metadata.assistant.tokens` — Token schema definition

  **Commands to Execute**:
  ```bash
  # Full commit details
  gh api repos/sst/opencode/commits/f40bdd1ac3 --jq '{
    message: .commit.message,
    date: .commit.committer.date,
    files: [.files[] | {filename, status, additions, deletions}],
    patch: .files[0].patch
  }'

  # Check if cache fields existed in message.ts BEFORE this commit
  gh api "repos/sst/opencode/contents/packages/opencode/src/session/message.ts?ref=f40bdd1ac3~1" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); c=base64.b64decode(d['content']).decode(); print('cache' in c, 'reasoning' in c)"

  # Check if cache fields exist at v1.1.38
  gh api "repos/sst/opencode/contents/packages/opencode/src/session/message.ts?ref=v1.1.38" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); c=base64.b64decode(d['content']).decode(); [print(l.strip()) for l in c.split('\n') if 'cache' in l.lower() or 'reasoning' in l.lower()]"
  ```

  **Acceptance Criteria**:
  - [ ] Full patch documented with before/after for `stats.ts`
  - [ ] Confirmed whether `cache.read`/`cache.write` were already in message schema at v1.1.38
  - [ ] Confirmed this commit is CLI stats-only (doesn't change message storage format)
  - [ ] Documented the `sessionTotalTokens` formula change: `input + output + reasoning + cache.read + cache.write`

  **Commit**: NO

---

- [ ] 3. Analyze Commit bdfd8f8b0 (Custom Provider) + Provider Enumeration

  **What to do**:
  - Fetch full patch of `bdfd8f8b0f` (custom provider feature)
  - Analyze `packages/app/src/components/dialog-custom-provider.tsx` for how custom providers are created
  - Determine what `providerID` values custom providers produce in messages
  - Enumerate ALL built-in providerID values from `packages/opencode/src/provider/provider.ts`
  - Check `packages/opencode/src/provider/models.ts` for model database and providerID assignments
  - Also analyze `b937fe9450` (providerID in SDK cache key) for any downstream effects

  **Must NOT do**:
  - Do not modify any files
  - Do not suggest OMCM changes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Multiple files to analyze, moderate complexity understanding custom provider flow
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: TypeScript component and provider system analysis
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not analyzing UI design, just data flow

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs:556-575` — OMCM provider normalization logic (opencode→google/openai/anthropic)
  - `src/hud/omcm-hud.mjs:564-574` — Keyword-based modelID sniffing for `providerID === 'opencode'`

  **Upstream References**:
  - `packages/app/src/components/dialog-custom-provider.tsx` — Custom provider creation UI (added in bdfd8f8b0)
  - `packages/opencode/src/provider/provider.ts:586` — `source: z.enum(["env", "config", "custom", "api"])`
  - `packages/opencode/src/provider/provider.ts:667` — `source: "custom"` assignment
  - `packages/opencode/src/provider/provider.ts:690` — `providers: { [providerID: string]: Info }` map
  - `packages/opencode/src/provider/models.ts` — Built-in model database with providerID assignments

  **Commands to Execute**:
  ```bash
  # Custom provider commit full patch
  gh api repos/sst/opencode/commits/bdfd8f8b0f --jq '.files[] | {filename, patch}' 

  # providerID SDK cache key commit
  gh api repos/sst/opencode/commits/b937fe9450 --jq '.files[] | {filename, patch}'

  # List ALL built-in provider IDs from models.ts
  gh api "repos/sst/opencode/contents/packages/opencode/src/provider/models.ts?ref=v1.1.45" \
    | python3 -c "import sys,json,base64,re; d=json.load(sys.stdin); c=base64.b64decode(d['content']).decode(); [print(m) for m in sorted(set(re.findall(r'providerID:\s*[\"'\'']([\w-]+)[\"'\'']', c)))]"

  # List provider IDs from provider.ts database
  gh api "repos/sst/opencode/contents/packages/opencode/src/provider/provider.ts?ref=v1.1.45" \
    | python3 -c "import sys,json,base64,re; d=json.load(sys.stdin); c=base64.b64decode(d['content']).decode(); [print(m) for m in sorted(set(re.findall(r'providerID:\s*[\"'\'']([\w-]+)[\"'\'']', c)))]"

  # Check how custom providers set providerID in messages
  gh api "repos/sst/opencode/contents/packages/opencode/src/provider/provider.ts?ref=v1.1.45" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); c=base64.b64decode(d['content']).decode(); [print(f'{i+1}: {l.rstrip()}') for i,l in enumerate(c.split('\n')) if 'custom' in l.lower() or 'providerID' in l]" | head -30
  ```

  **Acceptance Criteria**:
  - [ ] Full enumeration of built-in providerID values at v1.1.45
  - [ ] Custom provider `providerID` assignment mechanism documented
  - [ ] Confirmed whether custom providers can produce arbitrary `providerID` strings
  - [ ] SDK cache key change (b937fe9450) impact assessed

  **Commit**: NO

---

- [ ] 4. Token Field Compatibility Matrix

  **What to do**:
  - Using findings from Tasks 1 and 2, build a complete matrix of:
    - Every token-related field in upstream message schema (v1.1.45)
    - Whether OMCM reads it, ignores it, or mishandles it
    - Whether the field existed at v1.1.38 or is new
  - Specific fields to analyze:
    - `tokens.input` — OMCM reads ✓
    - `tokens.output` — OMCM reads ✓
    - `tokens.reasoning` — **OMCM ignores** ← investigate
    - `tokens.cache.read` — OMCM reads ✓
    - `tokens.cache.write` — **OMCM ignores** ← investigate
  - Determine if ignoring `reasoning` and `cache.write` causes incorrect token aggregation
  - Cross-reference with OMCM's `aggregateOpenCodeTokens()` function

  **Must NOT do**:
  - Do not edit OMCM source
  - Do not propose fixes (findings only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Synthesis of prior findings into structured matrix, moderate reasoning
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding TypeScript types and field semantics
  - **Skills Evaluated but Omitted**:
    - `data-scientist`: Not statistical analysis, just field mapping

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1, Task 2

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs:437-615` — `aggregateOpenCodeTokens()` full function
  - `src/hud/omcm-hud.mjs:577-585` — Token field extraction from message JSON
  - `src/hud/omcm-hud.mjs:163-219` — `aggregateClaudeFromTranscript()` for comparison (Claude path uses `cache_read_input_tokens`)

  **Upstream References**:
  - `packages/opencode/src/session/message.ts` — Token schema (from Task 1)
  - `packages/opencode/src/cli/cmd/stats.ts` — How upstream itself aggregates (from Task 2)

  **Commands to Execute**:
  ```bash
  # Verify OMCM token field access patterns
  grep -n "tokens\." src/hud/omcm-hud.mjs

  # Verify all token-related field access in OMCM
  grep -rn "tokens\.\|\.input\|\.output\|\.reasoning\|cache\.\|cacheRead\|cacheWrite\|cacheCreate" src/hud/

  # Check if tokens.reasoning appears anywhere in OMCM
  grep -rn "reasoning" src/

  # Check actual token values in recent messages to see if reasoning/cache.write are non-zero
  for ses in $(ls ~/.local/share/opencode/storage/message/ | tail -3); do
    for msg in $(ls ~/.local/share/opencode/storage/message/$ses/ | tail -5); do
      python3 -c "
import json, sys
with open('$HOME/.local/share/opencode/storage/message/$ses/$msg') as f:
    d = json.load(f)
    t = d.get('tokens', {})
    if t.get('reasoning', 0) > 0 or (t.get('cache', {}).get('write', 0) > 0):
        print(f'$ses/$msg: reasoning={t.get(\"reasoning\",0)}, cache.write={t.get(\"cache\",{}).get(\"write\",0)}')
" 2>/dev/null
    done
  done
  ```

  **Acceptance Criteria**:
  - [ ] Complete matrix: field | upstream schema | OMCM reads? | existed at v1.1.38? | non-zero in practice?
  - [ ] Quantified impact of ignoring `tokens.reasoning` (how many tokens missed per session)
  - [ ] Quantified impact of ignoring `tokens.cache.write` (how many tokens missed per session)
  - [ ] Determination: does OMCM under-count, over-count, or correctly count tokens?

  **Commit**: NO

---

- [ ] 5. Provider/Model ID Impact Analysis

  **What to do**:
  - Using findings from Task 3, analyze impact on OMCM provider detection
  - Map all providerID values (built-in + custom) against OMCM normalization logic
  - Identify providerIDs that would be silently dropped by OMCM
  - Check if `providerID === 'opencode'` normalization path is still valid in v1.1.45
  - Check for any new provider IDs added between v1.1.38 and v1.1.45

  **Must NOT do**:
  - Do not modify OMCM code
  - Do not propose fixes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Pattern matching between upstream provider list and OMCM normalization rules
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Provider system understanding
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involvement

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `src/hud/omcm-hud.mjs:556-575` — OMCM provider normalization (the code under investigation)
  - `src/hud/omcm-hud.mjs:443-447` — Result buckets: only `openai`, `gemini`, `anthropic`

  **Upstream References**:
  - `packages/opencode/src/provider/provider.ts` — Provider database and custom provider registration
  - `packages/opencode/src/provider/models.ts` — Model database with providerID assignments

  **Commands to Execute**:
  ```bash
  # Get unique providerID values from actual message files on disk
  find ~/.local/share/opencode/storage/message -name '*.json' -exec python3 -c "
import json,sys
for f in sys.argv[1:]:
    try:
        d = json.load(open(f))
        pid = d.get('providerID') or (d.get('model',{}).get('providerID',''))
        mid = d.get('modelID') or (d.get('model',{}).get('modelID',''))
        if pid: print(f'{pid}\t{mid}')
    except: pass
" {} + | sort -u

  # Cross-reference OMCM normalization logic
  grep -n "providerID\|normalizedProvider\|opencode\|openai\|google\|anthropic" src/hud/omcm-hud.mjs

  # Check if 'opencode' providerID still exists in v1.1.45
  gh api "repos/sst/opencode/contents/packages/opencode/src/provider/provider.ts?ref=v1.1.45" \
    | python3 -c "import sys,json,base64; d=json.load(sys.stdin); c=base64.b64decode(d['content']).decode(); print('opencode providerID found:', 'opencode' in c)"
  ```

  **Acceptance Criteria**:
  - [ ] Complete list of providerID values that can appear in messages at v1.1.45
  - [ ] For each providerID: OMCM handles? → YES (which bucket) / NO (silently dropped)
  - [ ] Custom provider providerID format documented
  - [ ] Assessment: are any tokens from valid providers being silently lost?

  **Commit**: NO

---

- [ ] 6. Consolidated Risk Assessment Report

  **What to do**:
  - Synthesize findings from Tasks 1-5 into a single risk assessment
  - For each finding, classify as: BREAKING / DEGRADED / SAFE
  - Provide specific OMCM file:line references for every affected code path
  - Organize by priority (highest risk first)
  - Write findings to `.sisyphus/drafts/opencode-upstream-findings.md`

  **Must NOT do**:
  - Do not propose code changes
  - Do not implement fixes
  - Do not edit any non-markdown files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Report synthesis from structured findings
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Accurate TypeScript reference interpretation
  - **Skills Evaluated but Omitted**:
    - `prompt-engineer`: Not prompt work
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, final task)
  - **Blocks**: None (final deliverable)
  - **Blocked By**: Task 4, Task 5

  **References**:

  **All Prior Task Outputs** (from Tasks 1-5)

  **OMCM Code Map**:
  - `src/hud/omcm-hud.mjs:437-615` — `aggregateOpenCodeTokens()` — primary investigation target
  - `src/hud/omcm-hud.mjs:556-575` — Provider normalization logic
  - `src/hud/omcm-hud.mjs:577-585` — Token field extraction
  - `src/hud/omcm-hud.mjs:443-447` — Result structure (only 3 provider buckets)
  - `src/hud/fusion-renderer.mjs` — Token rendering (may need investigation for display format)
  - `src/utils/fusion-tracker.mjs` — Savings calculation (uses token data)

  **Report Structure**:
  ```markdown
  # OpenCode Upstream Investigation: Findings

  ## Executive Summary
  [1-paragraph overview]

  ## Finding 1: [Title] — RISK LEVEL
  - **Upstream Change**: [what changed]
  - **OMCM Impact**: [specific effect]
  - **OMCM Code**: [file:line]
  - **Evidence**: [command output / JSON sample]

  ## Token Compatibility Matrix
  | Field | Upstream | OMCM Reads | Since v1.1.38 | Non-Zero? | Risk |
  |-------|----------|------------|---------------|-----------|------|

  ## Provider Compatibility Matrix
  | providerID | Source | OMCM Bucket | Risk |
  |------------|--------|-------------|------|
  ```

  **Acceptance Criteria**:
  - [ ] Risk assessment written to `.sisyphus/drafts/opencode-upstream-findings.md`
  - [ ] Every finding has: upstream change + OMCM file:line + risk level + evidence
  - [ ] Token compatibility matrix complete
  - [ ] Provider compatibility matrix complete
  - [ ] No code suggestions included (investigation only)

  **Commit**: NO

---

## Commit Strategy

No commits. This is an investigation-only plan. All outputs are markdown files in `.sisyphus/drafts/`.

---

## Success Criteria

### Verification Commands
```bash
# Report exists and has content
test -s .sisyphus/drafts/opencode-upstream-findings.md && echo "PASS" || echo "FAIL"

# Report contains required sections
grep -c "Token Compatibility Matrix\|Provider Compatibility Matrix\|Risk" .sisyphus/drafts/opencode-upstream-findings.md
# Expected: >= 3

# No source files were modified
git diff --name-only src/
# Expected: empty output
```

### Final Checklist
- [ ] All 14 relevant upstream commits analyzed
- [ ] Token field compatibility matrix produced
- [ ] Provider/model ID enumeration produced
- [ ] f40bdd1ac (cache tokens) specifically analyzed
- [ ] bdfd8f8b0 (custom provider) specifically analyzed
- [ ] `packages/opencode/src/session/message.ts` schema diffed
- [ ] Risk assessment with OMCM file:line references
- [ ] Zero OMCM source files modified
