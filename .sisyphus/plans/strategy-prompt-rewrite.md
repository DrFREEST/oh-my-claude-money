# Strategy Template Prompt Rewrite Plan

## TL;DR

> **Quick Summary**: Rewrite the `prompt` field for all 32 strategy templates in `strategy-templates.ts`. Eight strategies get full verbatim replacements from user-supplied text; four get extra sentences plus a common suffix; the remaining twenty get the common suffix appended (with explicit AND/OR wording inserted where composite conditions exist).
>
> **Deliverables**:
> - Updated `prompt` strings for all 32 `StrategyTemplate` entries
> - Zero changes to any other field (`id`, `name`, `indicators`, `operators`, `defaultParams`, etc.)
> - File passes `lsp_diagnostics` with zero errors
>
> **Estimated Effort**: Medium (single file, 32 targeted string edits)
> **Parallel Execution**: YES — 5 waves (grouped by edit type within a single file)
> **Critical Path**: Wave 1–4 (edits) → Wave 5 (verification) → Wave 6 (commit)

---

## Context

### Original Request

Update `prompt` fields in `/opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts` for all 32 strategies so that each prompt explicitly specifies:
- Buy/sell conditions with indicator names and numeric constants
- AND/OR operators spelled out as `AND 논리 연산자` / `OR 논리 연산자`
- A common suffix directing BUY/SELL signal node placement and edge wiring

### Common Suffix (Verbatim — Append to Every Prompt)

```
buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.
```

### Strategy Classification (32 Total)

Every strategy is assigned to exactly ONE edit group:

| Group | Edit Type | Count | Strategy IDs |
|-------|-----------|-------|-------------|
| **A** | Full verbatim replacement (user-supplied prompt) | 8 | basic-stochastic, basic-adx-strength, advanced-bb-squeeze, advanced-macd-rsi, advanced-elder-triple, advanced-obv-divergence, pro-dual-momentum, pro-smart-money-divergence |
| **B** | Extra sentences + common suffix (exact text provided) | 4 | basic-rsi-reversal, basic-golden-cross, basic-williams-r, basic-cci-zero |
| **C1** | Current prompt text preserved + common suffix appended (no AND/OR needed) | 10 | basic-macd-signal, basic-psar, basic-ema-crossover, basic-vwap-deviation, basic-supertrend, advanced-turtle, advanced-bb-mean-reversion, advanced-keltner, advanced-ichimoku, advanced-mfi-reversal |
| **C2** | Current prompt text preserved + explicit AND sentence inserted + common suffix appended | 8 | advanced-ma-ribbon, advanced-triple-ema, pro-weinstein-stage, pro-livermore-pivot, pro-canslim-breakout, pro-tema-vwma-momentum, pro-atr-volatility, pro-adaptive-atr-channel |
| **C3** | Current prompt text preserved + explicit AND **and** OR sentences inserted + common suffix appended | 2 | pro-multi-tf-macd-rsi, pro-ichimoku-vwap |

---

## Work Objectives

### Core Objective
Modify ONLY the `prompt` string value of each of the 32 `StrategyTemplate` objects so that every prompt contains explicit buy/sell logic wording, explicit AND/OR operator names for composite conditions, and the common suffix directing BUY/SELL signal node wiring.

### Concrete Deliverables
- 32 updated `prompt` string values in `/opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts`
- Zero regressions in TypeScript compilation

### Definition of Done
- [ ] All 32 `prompt` fields updated per group rules
- [ ] Common suffix present at end of every prompt
- [ ] All composite-condition prompts contain explicit `AND 논리 연산자` / `OR 논리 연산자` wording
- [ ] No fields other than `prompt` were modified
- [ ] No optional chaining (`?.`) introduced anywhere
- [ ] All Korean comments preserved verbatim
- [ ] `lsp_diagnostics` on the file returns zero errors

### Must Have
- Exact verbatim user-supplied replacement for Group A strategies
- Common suffix appended to every prompt (all 32)
- Explicit AND/OR operator naming for Groups A, B, C2, C3

### Must NOT Have (Guardrails)
- ❌ Changes to `id`, `name`, `nameEn`, `tier`, `category`, `creator`, `year`, `principle`, `entryRules`, `exitRules`, `indicators`, `operators`, `defaultParams`, `performance`, `tags`, `implementable`, `requiredNewNodes` fields
- ❌ Optional chaining (`?.`) anywhere in the file
- ❌ Modification of Korean comments (lines starting with `//` or `/** */` blocks)
- ❌ Modification of exported functions, types, interfaces, or constants outside the template array
- ❌ Any structural refactoring or field additions
- ❌ Scope reduction (all 32 strategies MUST be updated)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: Not applicable (no unit tests for static data)
- **User wants tests**: Manual-only (lsp_diagnostics)
- **Framework**: N/A

### Automated Verification (lsp_diagnostics)

```bash
# Agent runs lsp_diagnostics on the target file
lsp_diagnostics("/opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts", severity="error")
# Assert: zero errors returned
```

### Manual Verification (Agent Self-Check)

For each of the 32 strategies, the agent MUST verify:
1. **Suffix present**: The prompt ends with the common suffix text
2. **AND/OR explicit**: If `operators` array contains `AND` or `OR`, the prompt body contains `AND 논리 연산자` or `OR 논리 연산자` respectively
3. **No field bleed**: Only the `prompt:` line was changed (use `git diff` to confirm)

```bash
# After all edits, verify no non-prompt fields changed
git diff --unified=0 apps/web/lib/strategy/templates/strategy-templates.ts | grep "^[+-]" | grep -v "^[+-][+-][+-]" | grep -v "prompt:"
# Assert: empty output (only prompt lines changed)
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — independent edits by strategy ID):
├── TODO 1: Group A — 8 full verbatim replacements
└── TODO 2: Group B — 4 extra sentences + suffix

Wave 2 (Can start in parallel with Wave 1):
└── TODO 3: Group C1 — 10 suffix-only appends

Wave 3 (Can start in parallel with Wave 1–2):
├── TODO 4: Group C2 — 8 AND-sentence + suffix appends
└── TODO 5: Group C3 — 2 AND+OR sentences + suffix appends

Wave 4 (After ALL edits complete):
└── TODO 6: Verification — lsp_diagnostics + git diff audit

Wave 5 (After verification passes):
└── TODO 7: Final commit
```

> **Note on parallelism**: Because all changes target one file, true parallel execution
> requires either (a) non-overlapping line ranges with a merge step, or (b) sequential
> execution within one agent. The recommended approach is **one agent editing sequentially
> through Waves 1–3**, treating the wave grouping as logical organization rather than
> literal parallel dispatch. Wave 4–5 are strictly sequential after Waves 1–3.

### Dependency Matrix

| TODO | Depends On | Blocks | Can Parallelize With |
|------|-----------|--------|---------------------|
| 1 (Group A) | None (needs user-supplied text) | 6 | 3, 4, 5 |
| 2 (Group B) | None | 6 | 1, 3, 4, 5 |
| 3 (Group C1) | None | 6 | 1, 4, 5 |
| 4 (Group C2) | None | 6 | 1, 3, 5 |
| 5 (Group C3) | None | 6 | 1, 3, 4 |
| 6 (Verify) | 1, 2, 3, 4, 5 | 7 | None |
| 7 (Commit) | 6 | None | None |

### Agent Dispatch Summary

| Wave | TODOs | Recommended Agent |
|------|-------|-------------------|
| 1–3 | 1, 2, 3, 4, 5 | Single `executor` agent (sequential edits in one file) |
| 4 | 6 | Same agent or `architect-low` for verification |
| 5 | 7 | Same agent with `git-master` skill |

---

## TODOs

---

### TODO 1: Group A — Full Verbatim Prompt Replacement (8 strategies)

- [ ] 1. Replace `prompt` fields for 8 strategies with user-supplied exact text

  **What to do**:
  For each strategy below, replace the ENTIRE `prompt` string value with the user-provided verbatim text. The user-supplied text already includes the common suffix and explicit AND/OR wording.

  **Strategies and line locations** (line numbers from current file):

  | # | Strategy ID | Current Line | Current `prompt` starts with... |
  |---|------------|-------------|-------------------------------|
  | 1a | `basic-stochastic` | 173 | `'스토캐스틱(14,3) %K가 20 아래...'` |
  | 1b | `basic-adx-strength` | 211 | `'ADX(14)가 25 이상이고 +DI가...'` |
  | 1c | `advanced-bb-squeeze` | 326 | `'볼린저 밴드 폭(BB_WIDTH)이...'` |
  | 1d | `advanced-macd-rsi` | 344 | `'MACD(12,26,9)가 시그널 라인을...'` |
  | 1e | `advanced-elder-triple` | 420 | `'MACD(12,26,9) 히스토그램이...'` |
  | 1f | `advanced-obv-divergence` | 439 | `'OBV가 OBV의 20일 이동평균을...'` |
  | 1g | `pro-dual-momentum` | 535 | `'ROC(12)가 0보다 크고(절대...'` |
  | 1h | `pro-smart-money-divergence` | 700 | `'OBV가 SMA(OBV, 20) 위에 있고...'` |

  **Edit procedure for each**:
  1. Locate the strategy by `id` field value (not line number — lines may shift during editing)
  2. Find the `prompt:` key within that object
  3. Replace the entire string value (between quotes) with the user-supplied verbatim text
  4. Ensure the replacement string is properly quoted (single-quote `'...'` matching existing style)
  5. Verify no trailing/leading whitespace issues

  **Must NOT do**:
  - Do NOT modify any field other than `prompt`
  - Do NOT add optional chaining (`?.`)
  - Do NOT infer or compose prompt text — use ONLY the exact verbatim replacement the user provided
  - Do NOT change quote style (keep single quotes `'...'` consistent with file)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical find-and-replace of string values; no reasoning needed beyond exact substitution
  - **Skills**: [`git-master`]
    - `git-master`: Needed for final commit with atomic message
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work involved
    - `tdd`: No test infrastructure; static data edits

  **Parallelization**:
  - **Can Run In Parallel**: YES (with TODOs 3, 4, 5 — but since same file, recommended sequential)
  - **Parallel Group**: Wave 1 (logical group)
  - **Blocks**: TODO 6 (verification)
  - **Blocked By**: None (user-supplied text assumed available at execution time)

  **References**:

  **Pattern References**:
  - `strategy-templates.ts:106-310` — All basic-tier templates showing `prompt` field structure
  - `strategy-templates.ts:315-519` — All advanced-tier templates
  - `strategy-templates.ts:524-707` — All pro-tier templates
  - Note: Every `prompt` is a single-quoted Korean string on one line

  **API/Type References**:
  - `strategy-templates.ts:33` — `prompt: string` type definition in `StrategyTemplate` interface
  - The `prompt` field is a plain `string` — no template literal, no interpolation

  **Acceptance Criteria**:

  ```bash
  # Agent runs after completing all 8 replacements:
  grep -c "prompt:" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts
  # Assert: returns 33 (32 template prompts + 1 interface definition line)

  # Verify each strategy's prompt was changed (spot-check):
  grep -A1 "id: 'basic-stochastic'" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts | head -20
  # Assert: prompt field contains user-supplied text, NOT the old text
  ```

  **Commit**: NO (groups with TODO 7)

---

### TODO 2: Group B — Extra Sentences + Common Suffix (4 strategies)

- [ ] 2. Add extra sentences and common suffix to 4 basic strategies

  **What to do**:
  For each strategy below:
  1. Keep the current `prompt` text as the base
  2. Insert the user-specified extra sentence **after** the existing prompt text (before the closing quote)
  3. Append the common suffix at the very end

  **Strategies with exact extra sentences and resulting prompts**:

  ---

  **2a. `basic-rsi-reversal`** (line 117)

  Extra sentence: `"RSI와 비교할 30, 70 값은 CONSTANT indicator 노드로 생성하세요."`

  Current prompt:
  ```
  'RSI(14)가 30 아래로 내려가면 매수하고, RSI(14)가 70 위로 올라가면 매도하는 역추세 전략을 만들어주세요. 손절은 -5%, 익절은 +10%로 설정해주세요.'
  ```

  New prompt (= current + extra sentence + common suffix):
  ```
  'RSI(14)가 30 아래로 내려가면 매수하고, RSI(14)가 70 위로 올라가면 매도하는 역추세 전략을 만들어주세요. 손절은 -5%, 익절은 +10%로 설정해주세요. RSI와 비교할 30, 70 값은 CONSTANT indicator 노드로 생성하세요. buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.'
  ```

  ---

  **2b. `basic-golden-cross`** (line 135)

  Extra sentence: `"SMA(50)과 SMA(200) 두 개의 EMA indicator 노드를 각각 생성하고, 매수는 CROSSES_ABOVE, 매도는 CROSSES_BELOW operator를 사용하세요."`

  Current prompt:
  ```
  '50일 이동평균선이 200일 이동평균선을 상향 돌파하면 매수, 하향 돌파하면 매도하는 골든크로스/데드크로스 전략을 만들어주세요.'
  ```

  New prompt:
  ```
  '50일 이동평균선이 200일 이동평균선을 상향 돌파하면 매수, 하향 돌파하면 매도하는 골든크로스/데드크로스 전략을 만들어주세요. SMA(50)과 SMA(200) 두 개의 EMA indicator 노드를 각각 생성하고, 매수는 CROSSES_ABOVE, 매도는 CROSSES_BELOW operator를 사용하세요. buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.'
  ```

  ---

  **2c. `basic-williams-r`** (line 230)

  Extra sentence: `"Williams %R과 비교할 -80, -20 값은 CONSTANT indicator 노드로 생성하세요."`

  Current prompt:
  ```
  '윌리엄스 %R(14)이 -80 아래로 내려갔다가 -80을 상향 돌파하면 매수, -20 위로 올라갔다가 -20을 하향 돌파하면 매도하는 전략을 만들어주세요.'
  ```

  New prompt:
  ```
  '윌리엄스 %R(14)이 -80 아래로 내려갔다가 -80을 상향 돌파하면 매수, -20 위로 올라갔다가 -20을 하향 돌파하면 매도하는 전략을 만들어주세요. Williams %R과 비교할 -80, -20 값은 CONSTANT indicator 노드로 생성하세요. buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.'
  ```

  ---

  **2d. `basic-cci-zero`** (line 249)

  Extra sentence: `"CCI와 비교할 0 값은 CONSTANT indicator 노드로 생성하세요."`

  Current prompt:
  ```
  'CCI(20)가 0을 상향 돌파하면 매수, 0을 하향 돌파하면 매도하는 제로라인 크로스 전략을 만들어주세요.'
  ```

  New prompt:
  ```
  'CCI(20)가 0을 상향 돌파하면 매수, 0을 하향 돌파하면 매도하는 제로라인 크로스 전략을 만들어주세요. CCI와 비교할 0 값은 CONSTANT indicator 노드로 생성하세요. buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.'
  ```

  ---

  **Note**: None of these 4 have `AND` or `OR` in their `operators` array, so no AND/OR explicit sentence is needed.

  **Must NOT do**:
  - Do NOT modify the extra sentences — use EXACTLY as specified above
  - Do NOT modify fields other than `prompt`
  - Do NOT add optional chaining

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical string append once text is known
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: Commit handled in TODO 7

  **Parallelization**:
  - **Can Run In Parallel**: YES (with TODOs 1, 3, 4, 5 — logically; sequential in practice)
  - **Parallel Group**: Wave 1
  - **Blocks**: TODO 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `strategy-templates.ts:117` — `basic-rsi-reversal` current prompt (example of single-condition prompt style)
  - `strategy-templates.ts:135` — `basic-golden-cross` current prompt
  - `strategy-templates.ts:230` — `basic-williams-r` current prompt
  - `strategy-templates.ts:249` — `basic-cci-zero` current prompt

  **API/Type References**:
  - `strategy-templates.ts:33` — `prompt: string` type constraint

  **Acceptance Criteria**:

  ```bash
  # After edit, verify each prompt ends with common suffix:
  for id in basic-rsi-reversal basic-golden-cross basic-williams-r basic-cci-zero; do
    grep -A20 "id: '$id'" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts \
      | grep "prompt:" | grep -c "SELL signal로 엣지를 연결하세요"
  done
  # Assert: each returns 1
  ```

  **Commit**: NO (groups with TODO 7)

---

### TODO 3: Group C1 — Suffix-Only Append (10 strategies, no AND/OR needed)

- [ ] 3. Append common suffix to 10 strategies that use only simple conditions

  **What to do**:
  For each strategy below, append a space + the common suffix text to the END of the existing `prompt` string. Do NOT modify the existing prompt text preceding the suffix.

  **Common suffix to append** (preceded by a space):
  ```
   buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.
  ```

  **Strategies** (all have simple operators — NO `AND`/`OR` in their `operators` array):

  | # | Strategy ID | Line | Operators |
  |---|------------|------|-----------|
  | 3a | `basic-macd-signal` | 154 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3b | `basic-psar` | 192 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3c | `basic-ema-crossover` | 267 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3d | `basic-vwap-deviation` | 285 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3e | `basic-supertrend` | 303 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3f | `advanced-turtle` | 363 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3g | `advanced-bb-mean-reversion` | 382 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3h | `advanced-keltner` | 401 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3i | `advanced-ichimoku` | 458 | CROSSES_ABOVE, CROSSES_BELOW |
  | 3j | `advanced-mfi-reversal` | 476 | CROSSES_ABOVE, CROSSES_BELOW |

  **Edit procedure for each**:
  1. Locate strategy by `id` field
  2. Find the `prompt:` value string
  3. Before the closing quote (`'`), insert a space followed by the common suffix text
  4. Ensure no double-space or missing space at join point

  **Must NOT do**:
  - Do NOT rewrite or rephrase any existing prompt text
  - Do NOT add AND/OR wording (these strategies don't use composite operators)
  - Do NOT modify any field other than `prompt`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Repetitive append operation; no reasoning required
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES (with TODOs 1, 4, 5 logically)
  - **Parallel Group**: Wave 2
  - **Blocks**: TODO 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `strategy-templates.ts:154` — `basic-macd-signal` prompt (example: simple crossover, no AND/OR)
  - `strategy-templates.ts:192` — `basic-psar` prompt (example: price vs indicator crossover)
  - Each prompt is a single-line single-quoted string ending with `'`

  **API/Type References**:
  - `strategy-templates.ts:33` — `prompt: string`

  **Acceptance Criteria**:

  ```bash
  # Verify all 10 prompts end with the suffix:
  for id in basic-macd-signal basic-psar basic-ema-crossover basic-vwap-deviation basic-supertrend advanced-turtle advanced-bb-mean-reversion advanced-keltner advanced-ichimoku advanced-mfi-reversal; do
    grep -A20 "id: '$id'" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts \
      | grep "prompt:" | grep -c "SELL signal로 엣지를 연결하세요"
  done
  # Assert: each returns 1 (total 10 matches)
  ```

  **Commit**: NO (groups with TODO 7)

---

### TODO 4: Group C2 — Insert AND Sentence + Append Suffix (8 strategies)

- [ ] 4. Insert explicit AND operator sentence and append suffix for 8 composite-AND strategies

  **What to do**:
  For each strategy below:
  1. Identify where the buy condition uses implicit Korean conjunctions (`~하고`, `~이고`, `~이며`, `~있으며`) that represent an AND relationship
  2. Insert an explicit sentence near that conjunction: **"두 조건을 AND 논리 연산자로 결합하세요."** (or for 3+ conditions: **"모든 매수 조건을 AND 논리 연산자로 결합하세요."**)
  3. Similarly for sell conditions if they use implicit AND
  4. Append the common suffix at the end

  **Strategies and their AND condition locations**:

  | # | Strategy ID | Line | Buy-side AND location | # Buy Conditions | Sell-side AND? |
  |---|------------|------|-----------------------|-----------------|---------------|
  | 4a | `advanced-ma-ribbon` | 494 | `"상향 돌파하고 중기 EMA(21)가 장기 EMA(55) 위에 있을 때"` — joined by `하고` | 2 | NO (single) |
  | 4b | `advanced-triple-ema` | 512 | `"EMA(5)가 EMA(13) 위에 있고 EMA(13)이 EMA(34) 위에 있을 때"` — joined by `있고` | 2 | NO (single) |
  | 4c | `pro-weinstein-stage` | 554 | `"상향 돌파하고 거래량이...위에 있으며 ADX(14)가 20 이상"` — joined by `하고...있으며` | 3 | NO (single) |
  | 4d | `pro-livermore-pivot` | 573 | `"돌파하고 거래량이 VOLUME_SMA(20)의 1.5배 이상"` — joined by `하고` | 2 | NO (single) |
  | 4e | `pro-canslim-breakout` | 592 | `"돌파하고 EMA(50) 위에 있으며 거래량이..."` — joined by `하고...있으며` | 3 | NO (single) |
  | 4f | `pro-tema-vwma-momentum` | 610 | `"상향 돌파하고 ADX(14)가 25 이상"` — joined by `하고` | 2 | NO (single) |
  | 4g | `pro-atr-volatility` | 628 | `"상향 돌파하고 ADX(14)가 20 이상"` — joined by `하고` | 2 | NO (single) |
  | 4h | `pro-adaptive-atr-channel` | 682 | `"위에 있고 켈트너 채널 상단...돌파하며 RSI(14)가 50 이상"` — joined by `있고...돌파하며` | 3 | NO (single) |

  **Insertion pattern** (example for `pro-tema-vwma-momentum`, 2 buy conditions):

  Before:
  ```
  'TEMA(10)가 VWMA(20)를 상향 돌파하고 ADX(14)가 25 이상일 때 매수, TEMA가 VWMA를 하향 돌파하면 매도하는 모멘텀 전략을 만들어주세요.'
  ```

  After:
  ```
  'TEMA(10)가 VWMA(20)를 상향 돌파하고 ADX(14)가 25 이상일 때 매수합니다. 두 매수 조건을 AND 논리 연산자로 결합하세요. TEMA가 VWMA를 하향 돌파하면 매도합니다. buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.'
  ```

  **Insertion pattern** (example for `pro-weinstein-stage`, 3 buy conditions):

  Before:
  ```
  '가격이 SMA(150)을 상향 돌파하고 거래량이 VOLUME_SMA(50) 위에 있으며 ADX(14)가 20 이상일 때 매수, 가격이 SMA(150) 아래로 하향 돌파하면 매도하는 와인스타인 스테이지 분석 전략을 만들어주세요.'
  ```

  After:
  ```
  '가격이 SMA(150)을 상향 돌파하고 거래량이 VOLUME_SMA(50) 위에 있으며 ADX(14)가 20 이상일 때 매수합니다. 세 매수 조건을 AND 논리 연산자로 결합하세요. 가격이 SMA(150) 아래로 하향 돌파하면 매도합니다. buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.'
  ```

  **Rules for AND sentence**:
  - 2 buy conditions → `"두 매수 조건을 AND 논리 연산자로 결합하세요."`
  - 3 buy conditions → `"세 매수 조건을 AND 논리 연산자로 결합하세요."`
  - Insert AFTER the buy condition clause, BEFORE the sell condition clause
  - Restructure ending: change `~매수, ~매도하는 ~전략을 만들어주세요.` to `~매수합니다. [AND sentence] ~매도합니다. [suffix]`
  - Do NOT change the condition descriptions themselves — only the sentence structure around them

  **Must NOT do**:
  - Do NOT rewrite the logical content of conditions
  - Do NOT change implicit Korean conjunctions themselves (keep `하고`, `이며`, etc.)
  - Just ADD the explicit AND sentence as a separate instruction sentence
  - Do NOT modify fields other than `prompt`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pattern-based insertion; requires careful reading but no complex reasoning
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with TODOs 1, 3, 5 logically)
  - **Parallel Group**: Wave 3
  - **Blocks**: TODO 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `strategy-templates.ts:213` — `basic-adx-strength` operators array includes `AND` (Group A strategy for format reference)
  - `strategy-templates.ts:346` — `advanced-macd-rsi` operators array includes `AND`, `OR` (Group A for reference on how AND/OR appears in operators)
  - `strategy-templates.ts:494-500` — `advanced-ma-ribbon` full template (edit target)
  - `strategy-templates.ts:510-518` — `advanced-triple-ema` full template
  - `strategy-templates.ts:552-560` — `pro-weinstein-stage` full template
  - `strategy-templates.ts:571-579` — `pro-livermore-pivot` full template
  - `strategy-templates.ts:590-598` — `pro-canslim-breakout` full template
  - `strategy-templates.ts:608-616` — `pro-tema-vwma-momentum` full template
  - `strategy-templates.ts:626-634` — `pro-atr-volatility` full template
  - `strategy-templates.ts:680-688` — `pro-adaptive-atr-channel` full template

  **Acceptance Criteria**:

  ```bash
  # Verify AND sentence present in all 8:
  for id in advanced-ma-ribbon advanced-triple-ema pro-weinstein-stage pro-livermore-pivot pro-canslim-breakout pro-tema-vwma-momentum pro-atr-volatility pro-adaptive-atr-channel; do
    grep -A20 "id: '$id'" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts \
      | grep "prompt:" | grep -c "AND 논리 연산자"
  done
  # Assert: each returns 1

  # Verify suffix also present:
  for id in advanced-ma-ribbon advanced-triple-ema pro-weinstein-stage pro-livermore-pivot pro-canslim-breakout pro-tema-vwma-momentum pro-atr-volatility pro-adaptive-atr-channel; do
    grep -A20 "id: '$id'" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts \
      | grep "prompt:" | grep -c "SELL signal로 엣지를 연결하세요"
  done
  # Assert: each returns 1
  ```

  **Commit**: NO (groups with TODO 7)

---

### TODO 5: Group C3 — Insert AND + OR Sentences + Append Suffix (2 strategies)

- [ ] 5. Insert explicit AND and OR operator sentences and append suffix for 2 strategies

  **What to do**:
  For each strategy below:
  1. Identify buy-side conditions joined by AND (implicit Korean `~이고`, `~이며`)
  2. Identify sell-side conditions joined by OR (implicit Korean `~하거나`)
  3. Insert AND sentence after buy conditions
  4. Insert OR sentence after sell conditions
  5. Append common suffix at end

  **Strategies**:

  | # | Strategy ID | Line | Buy-side | Sell-side |
  |---|------------|------|----------|-----------|
  | 5a | `pro-multi-tf-macd-rsi` | 646 | 3 conditions: MACD>0 AND RSI<35 AND ADX>25 (joined by `있고...이며`) | 2 conditions: RSI>75 OR MACD<0 (joined by `초과하거나`) |
  | 5b | `pro-ichimoku-vwap` | 664 | 3 conditions: TENKAN>KIJUN AND CLOSE>VWAP AND ADX>20 (joined by `있고...있으며`) | 2 conditions: TENKAN<KIJUN OR CLOSE<VWAP (joined by `하락하거나`) |

  **Insertion pattern** (example for `pro-multi-tf-macd-rsi`):

  Before:
  ```
  'MACD(12,26,9)가 0 위에 있고(상승추세), RSI(14)가 35 이하(과매도)이며, ADX(14)가 25 이상(강한 추세)일 때 매수. RSI가 75를 초과하거나 MACD가 0 아래로 떨어지면 매도하는 멀티 필터 전략을 만들어주세요.'
  ```

  After:
  ```
  'MACD(12,26,9)가 0 위에 있고(상승추세), RSI(14)가 35 이하(과매도)이며, ADX(14)가 25 이상(강한 추세)일 때 매수합니다. 세 매수 조건을 AND 논리 연산자로 결합하세요. RSI가 75를 초과하거나 MACD가 0 아래로 떨어지면 매도합니다. 두 매도 조건을 OR 논리 연산자로 결합하세요. buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.'
  ```

  **Insertion pattern** (example for `pro-ichimoku-vwap`):

  Before:
  ```
  '일목균형표 전환선(ICHIMOKU_TENKAN)이 기준선(ICHIMOKU_KIJUN) 위에 있고, 가격이 VWAP 위에 있으며, ADX(14)가 20 이상일 때 매수. 전환선이 기준선 아래로 하락하거나 가격이 VWAP 아래로 떨어지면 매도하는 기관 전략을 만들어주세요.'
  ```

  After:
  ```
  '일목균형표 전환선(ICHIMOKU_TENKAN)이 기준선(ICHIMOKU_KIJUN) 위에 있고, 가격이 VWAP 위에 있으며, ADX(14)가 20 이상일 때 매수합니다. 세 매수 조건을 AND 논리 연산자로 결합하세요. 전환선이 기준선 아래로 하락하거나 가격이 VWAP 아래로 떨어지면 매도합니다. 두 매도 조건을 OR 논리 연산자로 결합하세요. buy_condition 영역에 매수 로직을, sell_condition 영역에 매도 로직을 배치하고, signal_output 영역에 반드시 BUY signal 노드와 SELL signal 노드를 포함하세요. 매수 조건의 최종 operator에서 BUY signal로, 매도 조건의 최종 operator에서 SELL signal로 엣지를 연결하세요.'
  ```

  **Must NOT do**:
  - Same guardrails as TODO 4
  - Do NOT miss the OR sentence for sell conditions — these are the only 2 strategies needing it

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Same insertion pattern as TODO 4, with additional OR sentence
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with TODOs 1, 3, 4 logically)
  - **Parallel Group**: Wave 3
  - **Blocks**: TODO 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `strategy-templates.ts:644-652` — `pro-multi-tf-macd-rsi` full template (operators: `GREATER_THAN, LESS_THAN, AND, OR`)
  - `strategy-templates.ts:662-670` — `pro-ichimoku-vwap` full template (operators: `GREATER_THAN, LESS_THAN, CROSSES_BELOW, AND, OR`)
  - TODO 4's insertion pattern — same approach but with added OR sentence

  **Acceptance Criteria**:

  ```bash
  # Verify AND sentence:
  for id in pro-multi-tf-macd-rsi pro-ichimoku-vwap; do
    grep -A20 "id: '$id'" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts \
      | grep "prompt:" | grep -c "AND 논리 연산자"
  done
  # Assert: each returns 1

  # Verify OR sentence:
  for id in pro-multi-tf-macd-rsi pro-ichimoku-vwap; do
    grep -A20 "id: '$id'" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts \
      | grep "prompt:" | grep -c "OR 논리 연산자"
  done
  # Assert: each returns 1

  # Verify suffix:
  for id in pro-multi-tf-macd-rsi pro-ichimoku-vwap; do
    grep -A20 "id: '$id'" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts \
      | grep "prompt:" | grep -c "SELL signal로 엣지를 연결하세요"
  done
  # Assert: each returns 1
  ```

  **Commit**: NO (groups with TODO 7)

---

### TODO 6: Verification — lsp_diagnostics + Diff Audit

- [ ] 6. Run lsp_diagnostics and audit git diff to confirm only `prompt` fields changed

  **What to do**:
  1. Run `lsp_diagnostics` on the target file
  2. Run `git diff` audit to confirm only prompt lines changed
  3. Count total prompts containing the common suffix (should be 32)
  4. Count prompts with AND/OR sentence (should match expected counts)

  **Verification commands**:

  ```bash
  # Step 1: TypeScript diagnostics — ZERO errors expected
  lsp_diagnostics("/opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts", severity="error")
  # Assert: zero errors

  # Step 2: Diff audit — ONLY prompt lines should differ
  git diff --unified=0 apps/web/lib/strategy/templates/strategy-templates.ts \
    | grep "^[+-]" | grep -v "^[+-][+-][+-]" | grep -v "prompt:"
  # Assert: empty output (no non-prompt changes)

  # Step 3: All 32 prompts have common suffix
  grep -c "SELL signal로 엣지를 연결하세요" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts
  # Assert: returns 32

  # Step 4: AND 논리 연산자 count
  grep -c "AND 논리 연산자" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts
  # Assert: ≥10 (8 from C2 + 2 from C3 = 10 minimum from these TODOs;
  #         Group A verbatim texts may add more)

  # Step 5: OR 논리 연산자 count
  grep -c "OR 논리 연산자" /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts
  # Assert: ≥2 (2 from C3; Group A verbatim texts may add more)

  # Step 6: No optional chaining introduced
  grep -c '?\.' /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts
  # Assert: 0

  # Step 7: Korean comments preserved (count // comment lines before and after)
  grep -c '^  //' /opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts
  # Assert: same count as before edits (baseline: 6 section comment lines)
  ```

  **Must NOT do**:
  - Do NOT skip any verification step
  - Do NOT proceed to commit if ANY assertion fails — fix first

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running diagnostic commands and reading output
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (must wait for ALL edits)
  - **Parallel Group**: Wave 4 (sequential after Waves 1–3)
  - **Blocks**: TODO 7
  - **Blocked By**: TODOs 1, 2, 3, 4, 5

  **References**:
  - Target file: `/opt/coffeetree/apps/web/lib/strategy/templates/strategy-templates.ts`

  **Acceptance Criteria**:
  - All 7 verification steps pass their assertions
  - Zero errors from lsp_diagnostics
  - Git diff shows only `prompt:` lines changed

  **Commit**: NO (this is verification only)

---

### TODO 7: Commit

- [ ] 7. Create atomic commit for all prompt changes

  **What to do**:
  1. Stage only the single changed file
  2. Commit with descriptive message

  ```bash
  git add apps/web/lib/strategy/templates/strategy-templates.ts
  git commit --author="DrFREEST <dalkong@dalkong.kr>" \
    -m "fix(strategy-templates): rewrite prompt fields with explicit BUY/SELL signal wiring and AND/OR operators

  - Replace prompt text for 8 strategies with user-supplied verbatim content
  - Add extra sentences + common suffix to 4 basic strategies
  - Append common suffix (BUY/SELL signal node wiring) to all 32 strategy prompts
  - Insert explicit AND/OR 논리 연산자 wording for composite-condition strategies
  - No changes to any other template fields"
  ```

  **Must NOT do**:
  - Do NOT commit if TODO 6 verification failed
  - Do NOT stage any other files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single git commit
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit with proper author and message format

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final)
  - **Blocks**: None
  - **Blocked By**: TODO 6

  **Acceptance Criteria**:

  ```bash
  git log -1 --oneline
  # Assert: shows the commit message above

  git status
  # Assert: working tree clean
  ```

  **Commit**: YES (this IS the commit task)
  - Message: `fix(strategy-templates): rewrite prompt fields with explicit BUY/SELL signal wiring and AND/OR operators`
  - Files: `apps/web/lib/strategy/templates/strategy-templates.ts`
  - Pre-commit: TODO 6 verification must have passed

---

## Commit Strategy

| After TODO | Message | Files | Verification |
|-----------|---------|-------|-------------|
| 7 (final) | `fix(strategy-templates): rewrite prompt fields with explicit BUY/SELL signal wiring and AND/OR operators` | `strategy-templates.ts` | lsp_diagnostics + git diff audit (TODO 6) |

---

## Success Criteria

### Verification Commands

```bash
# 1. Zero TypeScript errors
lsp_diagnostics("strategy-templates.ts")  # → 0 errors

# 2. All 32 prompts have suffix
grep -c "SELL signal로 엣지를 연결하세요" strategy-templates.ts  # → 32

# 3. Only prompt fields changed
git diff --stat  # → 1 file changed

# 4. No optional chaining
grep -c '?\.' strategy-templates.ts  # → 0
```

### Final Checklist
- [ ] All 32 `prompt` fields updated per group assignment
- [ ] 8 Group A strategies: exact verbatim user-supplied text
- [ ] 4 Group B strategies: extra sentences + suffix (exact new prompts specified in TODO 2)
- [ ] 10 Group C1 strategies: current text + suffix only
- [ ] 8 Group C2 strategies: current text + AND sentence + suffix
- [ ] 2 Group C3 strategies: current text + AND sentence + OR sentence + suffix
- [ ] No non-`prompt` field modifications
- [ ] No optional chaining (`?.`) anywhere
- [ ] All Korean comments preserved
- [ ] lsp_diagnostics: zero errors
- [ ] Git diff audit: only `prompt:` lines changed
- [ ] Single atomic commit with proper author
