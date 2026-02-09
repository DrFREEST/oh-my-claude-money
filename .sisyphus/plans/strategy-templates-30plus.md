# 30+ Trading Strategy Node Templates Document

## TL;DR

> **Quick Summary**: Research, verify, and produce a structured Markdown document listing 30+ trading/investment strategies as node-based templates for the CoffeeTree visual strategy builder. Each strategy is defined using the existing indicator/operator/signal node system with full metadata. Organized into Basic/Advanced/Pro tiers (10+ each).
>
> **Deliverables**:
> - One comprehensive Markdown document with 30+ strategy templates
> - Each template: Name (KR+EN), Category, Origin/Creator, Principle, Entry/Exit node notation, Required Indicators, Required Operators, Default Params, Historical Performance, Market Conditions, Risk Management
> - "Missing Nodes Summary" appendix listing nodes not yet in the system
> - Verification citations for origin/creator and performance claims
>
> **Estimated Effort**: Large (research-intensive, 30+ strategy entries)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3/4/5 (parallel) → Task 6 → Task 7 → Task 8

---

## Context

### Original Request
User wants 30+ strategies as node templates for their visual strategy builder, using existing indicators (RSI, MACD, SMA/EMA, Bollinger, Stochastic, ADX, SuperTrend, Ichimoku, CCI, OBV, MFI, VWAP, ATR, Williams %R, PSAR) and operators (GREATER_THAN, LESS_THAN, CROSSES_ABOVE, CROSSES_BELOW, AND, OR).

Must include: Golden/Death Cross, RSI OB/OS, MACD crossover, Bollinger squeeze/breakout, Stochastic crossover, ADX trend strength, Turtle (Donchian), Dual Momentum, Mean Reversion (Bollinger), Ichimoku, VWAP strategies, Larry Williams, Jesse Livermore, CANSLIM adaptation, Weinstein stage, Elder triple screen, Keltner breakout.

### System Architecture (from codebase exploration)

**Project**: `/opt/coffeetree/apps/web`
**Node types**: `indicator`, `operator`, `signal`
**Signal outputs**: `BUY`, `SELL`, `PASS`

**Available Indicator Nodes (72 total)**:
- **Basic (9)**: PRICE, HIGH, LOW, OPEN, CLOSE, HL2, HLC3, OHLC4, CONSTANT
- **Trend (19)**: SMA, EMA, WMA, DEMA, TEMA, KAMA, VWMA, HMA, SMMA, ZLEMA, ADX, PLUS_DI, MINUS_DI, AROON_UP, AROON_DOWN, AROON_OSC, SUPERTREND, ICHIMOKU_TENKAN, ICHIMOKU_KIJUN, PSAR
- **Momentum (15)**: RSI, MACD, MACD_SIGNAL, MACD_HISTOGRAM, STOCHASTIC, CCI, MOM, ROC, WILLIAMS_R, STOCH_RSI, ULTIMATE_OSC, TSI, AO, AC, PPO, DPO
- **Volatility (14)**: BOLLINGER_BANDS, ATR, NATR, TR, KELTNER_UPPER, KELTNER_MIDDLE, KELTNER_LOWER, DC_UPPER, DC_MIDDLE, DC_LOWER, BB_UPPER, BB_LOWER, BB_WIDTH, BB_PERCENT, STDDEV
- **Volume (12)**: VOLUME, OBV, AD, ADL, CMF, MFI, VWAP, PVT, NVI, PVI, VOLUME_SMA, VOLUME_EMA

**Available Operators (13 total)**:
- **Comparison (8)**: GREATER_THAN, LESS_THAN, EQUAL, NOT_EQUAL, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, CROSSES_ABOVE, CROSSES_BELOW
- **Logical (5)**: AND, OR, NOT, TRUE, FALSE

**Key Source Files**:
- `/opt/coffeetree/apps/web/lib/strategy/condition-types.ts` — IndicatorType enum (72 types)
- `/opt/coffeetree/apps/web/lib/strategy/indicators.ts` — IndicatorMetadata array with params
- `/opt/coffeetree/apps/web/lib/strategy/operators.ts` — Comparison + Logical operator definitions
- `/opt/coffeetree/apps/web/lib/strategy/workflow-types.ts` — Workflow data types

### Metis Review

**Identified Gaps (addressed in plan)**:
- **Node notation format undefined** → Task 1 defines this upfront before any strategy writing
- **"Verified" meaning ambiguous** → Resolved: cite academic/practitioner origin, qualitative performance description (no specific return %s)
- **Missing Ichimoku components** → SENKOU_SPAN_A, SENKOU_SPAN_B, CHIKOU_SPAN flagged as NEW_REQUIRED
- **Multi-timeframe strategies** → Elder Triple Screen flagged as requiring multi-timeframe support
- **Discretionary strategies** → CANSLIM, Jesse Livermore: automate quantifiable elements, flag subjective parts
- **Document purpose** → Human-readable developer reference for building node templates (not machine-parsed)
- **Legal disclaimer** → Add "not investment advice" disclaimer in document header

**Guardrails from Metis**:
- No backtesting code in the document
- No new node type interface design (only FLAG gaps)
- No specific return percentages
- No strategy invention — every entry must cite a real source
- Cap at 35 strategies max
- Use exact codebase type names (e.g., `BB_UPPER` not `BOLLINGER_UPPER`)

---

## Work Objectives

### Core Objective
Produce a comprehensive strategy reference document that maps 30+ well-known trading strategies to the CoffeeTree visual builder's node system, enabling developers to implement strategy templates with verified indicator/operator/signal configurations.

### Concrete Deliverables
- Main document: `.sisyphus/plans/strategy-templates-document.md` (or path decided by user)
- Contains 30+ strategy entries in standardized format
- Missing Nodes Summary appendix

### Definition of Done
- [ ] Document contains exactly 3 tiers: Basic, Advanced, Pro
- [ ] Each tier contains ≥10 strategies
- [ ] Total strategies ≥ 30, ≤ 35
- [ ] All 17 user-specified strategies present
- [ ] Every indicator reference matches a type in `condition-types.ts` OR is flagged NEW_REQUIRED
- [ ] Every operator reference matches a type in `operators.ts`
- [ ] Signal outputs are only BUY, SELL, or PASS
- [ ] Missing Nodes Summary lists all NEW_REQUIRED items
- [ ] Each strategy cites origin/creator with verifiable source

### Must Have
- All 17 user-specified strategies
- Standardized node notation format (defined in Task 1)
- Korean + English names for every strategy
- Cross-reference against codebase types

### Must NOT Have (Guardrails)
- **No code implementation** — document only
- **No new node type interface design** — only flag as NEW_REQUIRED
- **No specific return percentages** — qualitative performance descriptions only
- **No strategy invention** — every entry cites a real source
- **No more than 35 strategies** — quality over quantity
- **No machine-parseable format requirement** — human-readable Markdown

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A (document task)
- **User wants tests**: NO — automated grep/wc verification
- **Framework**: N/A
- **QA approach**: Content verification via grep commands + manual review

### Automated Verification (Agent-Executable)

```bash
# 1. Count strategy entries (each starts with "### Strategy N:")
grep -c "^### Strategy" /path/to/output.md
# Assert: ≥ 30

# 2. Count per tier
grep -c "## Basic Tier" /path/to/output.md  # Assert: 1
grep -c "## Advanced Tier" /path/to/output.md  # Assert: 1
grep -c "## Pro Tier" /path/to/output.md  # Assert: 1

# 3. All 17 required strategies present
for s in "Golden Cross" "Death Cross" "RSI" "MACD" "Bollinger" "Stochastic" "ADX" "Turtle" "Dual Momentum" "Mean Reversion" "Ichimoku" "VWAP" "Larry Williams" "Jesse Livermore" "CANSLIM" "Weinstein" "Elder" "Keltner"; do
  grep -l "$s" /path/to/output.md || echo "MISSING: $s"
done
# Assert: No "MISSING" lines

# 4. Missing nodes flagged
grep -c "NEW_REQUIRED" /path/to/output.md
# Assert: ≥ 1 (at minimum Ichimoku Senkou Span components)

# 5. Entry/Exit completeness
grep -c "**Entry" /path/to/output.md  # Assert: ≥ 30
grep -c "**Exit" /path/to/output.md   # Assert: ≥ 30

# 6. No specific return percentages (anti-pattern check)
grep -c "% return\|% profit\|annualized return" /path/to/output.md
# Assert: 0
```

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Define Node Notation Format | None | Foundation — all strategies use this format |
| Task 2: Research & Verify Required Strategies | None | Independent research can start immediately |
| Task 3: Write Basic Tier (10+ strategies) | Task 1, Task 2 | Needs format + verified research |
| Task 4: Write Advanced Tier (10+ strategies) | Task 1, Task 2 | Needs format + verified research |
| Task 5: Write Pro Tier (10+ strategies) | Task 1, Task 2 | Needs format + verified research |
| Task 6: Cross-Reference Node Types | Tasks 3, 4, 5 | Must check all written strategies against codebase |
| Task 7: Missing Nodes Summary + Final Assembly | Task 6 | Needs cross-reference results |
| Task 8: Verification & QA | Task 7 | Final automated checks on assembled document |

---

## Parallel Execution Graph

```
Wave 1 (Start immediately — PARALLEL):
├── Task 1: Define Node Notation Format
└── Task 2: Research & Verify All 30+ Strategies (origins, creators, citations)

Wave 2 (After Wave 1 — PARALLEL, 3 writers simultaneously):
├── Task 3: Write Basic Tier (10+ strategies)
├── Task 4: Write Advanced Tier (10+ strategies)
└── Task 5: Write Pro Tier (10+ strategies)

Wave 3 (After Wave 2 — SEQUENTIAL):
└── Task 6: Cross-Reference All Node Types Against Codebase

Wave 4 (After Wave 3 — SEQUENTIAL):
├── Task 7: Compile Missing Nodes Summary + Final Assembly
└── Task 8: Automated Verification & QA

Critical Path: Task 1 → Task 3 → Task 6 → Task 7 → Task 8
Parallel Speedup: ~60% (Wave 2 runs 3 parallel writers)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5 | 2 |
| 2 | None | 3, 4, 5 | 1 |
| 3 | 1, 2 | 6 | 4, 5 |
| 4 | 1, 2 | 6 | 3, 5 |
| 5 | 1, 2 | 6 | 3, 4 |
| 6 | 3, 4, 5 | 7 | None |
| 7 | 6 | 8 | None |
| 8 | 7 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | Task 1: `category="writing"`, Task 2: `category="unspecified-high"` (research-intensive) |
| 2 | 3, 4, 5 | All: `category="writing"`, `load_skills=[]`, `run_in_background=true` |
| 3 | 6 | `category="quick"` (grep/comparison task) |
| 4 | 7, 8 | Task 7: `category="writing"`, Task 8: `category="quick"` |

---

## Strategy Tier Assignment (Pre-Planned)

### Basic Tier (10+ strategies) — Single indicator, simple conditions

| # | Strategy | Required Indicators | Complexity |
|---|----------|-------------------|------------|
| 1 | Golden Cross (골든 크로스) | SMA(50), SMA(200) | Low |
| 2 | Death Cross (데스 크로스) | SMA(50), SMA(200) | Low |
| 3 | RSI Overbought/Oversold (RSI 과매수/과매도) | RSI(14), CONSTANT | Low |
| 4 | MACD Crossover (MACD 크로스오버) | MACD, MACD_SIGNAL | Low |
| 5 | Bollinger Band Bounce (볼린저 밴드 바운스) | BB_LOWER, BB_UPPER, PRICE | Low |
| 6 | Stochastic Crossover (스토캐스틱 크로스오버) | STOCHASTIC | Low |
| 7 | SuperTrend Following (슈퍼트렌드 추세추종) | SUPERTREND, PRICE | Low |
| 8 | OBV Trend Confirmation (OBV 추세 확인) | OBV, SMA(OBV) | Low |
| 9 | Williams %R Reversal (윌리엄스 %R 반전) | WILLIAMS_R, CONSTANT | Low |
| 10 | CCI Momentum (CCI 모멘텀) | CCI, CONSTANT | Low |
| 11 | PSAR Trend Following (파라볼릭 SAR 추세추종) | PSAR, PRICE | Low |

### Advanced Tier (10+ strategies) — Multi-indicator, combined conditions

| # | Strategy | Required Indicators | Complexity |
|---|----------|-------------------|------------|
| 12 | Bollinger Squeeze Breakout (볼린저 스퀴즈 돌파) | BB_WIDTH, BB_UPPER, BB_LOWER, PRICE | Medium |
| 13 | ADX Trend Strength Filter (ADX 추세 강도 필터) | ADX, PLUS_DI, MINUS_DI, CONSTANT | Medium |
| 14 | MACD Histogram Divergence (MACD 히스토그램 다이버전스) | MACD_HISTOGRAM, CONSTANT | Medium |
| 15 | Mean Reversion Bollinger (볼린저 평균회귀) | BB_PERCENT, BB_UPPER, BB_LOWER, SMA | Medium |
| 16 | Keltner Channel Breakout (켈트너 채널 돌파) | KELTNER_UPPER, KELTNER_LOWER, PRICE, ATR | Medium |
| 17 | Dual Moving Average + RSI (이중 이동평균 + RSI) | EMA(12), EMA(26), RSI(14) | Medium |
| 18 | VWAP Reversion (VWAP 회귀) | VWAP, PRICE, ATR | Medium |
| 19 | VWAP Breakout (VWAP 돌파) | VWAP, VOLUME, VOLUME_SMA, PRICE | Medium |
| 20 | Stochastic RSI Combo (스토캐스틱 RSI 콤보) | STOCH_RSI, RSI, CONSTANT | Medium |
| 21 | MFI + RSI Divergence (MFI + RSI 다이버전스) | MFI, RSI, CONSTANT | Medium |
| 22 | Aroon Trend System (아룬 추세 시스템) | AROON_UP, AROON_DOWN, CONSTANT | Medium |
| 23 | Larry Williams %R Strategy (래리 윌리엄스 %R 전략) | WILLIAMS_R, SMA, CONSTANT | Medium |

### Pro Tier (10+ strategies) — Multi-indicator systems, named strategies

| # | Strategy | Required Indicators | Complexity |
|---|----------|-------------------|------------|
| 24 | Turtle Trading / Donchian Breakout (터틀 트레이딩) | DC_UPPER, DC_LOWER, ATR, PRICE | High |
| 25 | Dual Momentum (듀얼 모멘텀) | ROC, SMA, PRICE | High |
| 26 | Ichimoku Cloud System (일목균형표 구름 시스템) | ICHIMOKU_TENKAN, ICHIMOKU_KIJUN, PRICE [+NEW_REQUIRED] | High |
| 27 | Elder Triple Screen (엘더 트리플 스크린) | EMA(13), MACD_HISTOGRAM, STOCHASTIC [+MULTI_TIMEFRAME_REQUIRED] | High |
| 28 | Jesse Livermore Pivot (제시 리버모어 피봇) | HIGH, LOW, PRICE, SMA [+PARTIAL_DISCRETIONARY] | High |
| 29 | CANSLIM Adaptation (캔슬림 적응) | EMA(50), EMA(200), ROC, VOLUME, VOLUME_SMA [+PARTIAL_DISCRETIONARY] | High |
| 30 | Weinstein Stage Analysis (와인스타인 스테이지) | SMA(30), SMA(150), VOLUME, VOLUME_SMA [+PARTIAL_DISCRETIONARY] | High |
| 31 | Triple EMA Crossover System (삼중 EMA 크로스 시스템) | EMA(5), EMA(13), EMA(34), ADX | High |
| 32 | Ichimoku-MACD Fusion (일목-MACD 퓨전) | ICHIMOKU_TENKAN, ICHIMOKU_KIJUN, MACD, MACD_SIGNAL [+NEW_REQUIRED] | High |
| 33 | Keltner-Bollinger Squeeze (켈트너-볼린저 스퀴즈) | KELTNER_UPPER, KELTNER_LOWER, BB_UPPER, BB_LOWER, MOM | High |

---

## Node Notation Format (to be finalized in Task 1)

### Proposed Format

Each strategy's entry/exit conditions use this pseudocode notation mapping directly to node types:

```
ENTRY:
  [Indicator1(params)] CROSSES_ABOVE [Indicator2(params)]  → Signal: BUY
  AND
  [Indicator3(params)] GREATER_THAN [CONSTANT(value)]       → Condition filter

EXIT:
  [Indicator1(params)] CROSSES_BELOW [Indicator2(params)]  → Signal: SELL
  OR
  [Indicator3(params)] LESS_THAN [CONSTANT(value)]          → Condition filter
```

**Rules**:
- Indicator names use EXACT `IndicatorType` values from `condition-types.ts`
- Operator names use EXACT values from `operators.ts`
- Parameters shown in parentheses with key=value notation
- `CONSTANT(value)` for static numeric thresholds
- `AND`/`OR` combine multiple conditions
- `NEW_REQUIRED: NodeName` flags missing node types
- `MULTI_TIMEFRAME_REQUIRED` flags strategies needing multi-timeframe support
- `PARTIAL_DISCRETIONARY` flags strategies with subjective elements that cannot be fully automated

### Example (Golden Cross):

```
Strategy: Golden Cross (골든 크로스)

ENTRY:
  SMA(period=50, field=close) CROSSES_ABOVE SMA(period=200, field=close) → BUY

EXIT:
  SMA(period=50, field=close) CROSSES_BELOW SMA(period=200, field=close) → SELL

Required Indicators: SMA
Required Operators: CROSSES_ABOVE, CROSSES_BELOW
Default Params: { shortPeriod: 50, longPeriod: 200, field: 'close' }
```

---

## Missing Nodes Preliminary Assessment

Based on the 17 required strategies vs. current system:

| Missing Node | Needed For | Type |
|-------------|-----------|------|
| `ICHIMOKU_SENKOU_SPAN_A` | Ichimoku Cloud System | Trend indicator |
| `ICHIMOKU_SENKOU_SPAN_B` | Ichimoku Cloud System | Trend indicator |
| `ICHIMOKU_CHIKOU` | Ichimoku Cloud System | Trend indicator |
| (Multi-timeframe support) | Elder Triple Screen | System capability |
| (Pivot point logic) | Jesse Livermore | Derived indicator |
| (Fundamental data nodes) | CANSLIM | External data |

**Nodes that ARE available** (initially might seem missing):
- Donchian Channels: `DC_UPPER`, `DC_MIDDLE`, `DC_LOWER` ✅ (sufficient for Turtle Trading)
- Keltner Channels: `KELTNER_UPPER`, `KELTNER_MIDDLE`, `KELTNER_LOWER` ✅
- VWAP: `VWAP` ✅
- ATR: `ATR` ✅
- Williams %R: `WILLIAMS_R` ✅
- PSAR: `PSAR` ✅

---

## TODOs

- [ ] 1. Define Node Notation Format & Document Template

  **What to do**:
  1. Create the document header with:
     - Title, purpose, disclaimer ("not investment advice")
     - Node notation format specification with 2-3 examples
     - Strategy template structure (all required fields)
     - Tier definitions (Basic/Advanced/Pro criteria)
     - Legend for flags: `NEW_REQUIRED`, `MULTI_TIMEFRAME_REQUIRED`, `PARTIAL_DISCRETIONARY`
  2. Write 2-3 example strategies using the notation to validate the format:
     - Golden Cross (simplest possible)
     - Bollinger Squeeze (multi-indicator)
     - Ichimoku (demonstrates NEW_REQUIRED flag)
  3. Document must reference exact type names from:
     - `condition-types.ts`: IndicatorType enum
     - `operators.ts`: ComparisonOperator + LogicalOperator

  **Must NOT do**:
  - Do NOT write all 30+ strategies — only the format definition + examples
  - Do NOT design node type interfaces for missing nodes
  - Do NOT include specific return percentages in examples

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Technical writing task — defining a format specification with examples
  - **Skills**: []
    - No specialized skills needed — this is pure documentation
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not writing code
    - `frontend-ui-ux`: No UI work
    - `data-scientist`: No data analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/opt/coffeetree/apps/web/lib/strategy/condition-types.ts:29-106` — Complete IndicatorType enum. Use EXACT names from this file for all indicator references in the notation.
  - `/opt/coffeetree/apps/web/lib/strategy/operators.ts:30-79` — COMPARISON_OPERATORS array. Use EXACT `value` field strings for operator references.
  - `/opt/coffeetree/apps/web/lib/strategy/operators.ts:84-115` — LOGICAL_OPERATORS array. Use EXACT `value` field strings.
  - `/opt/coffeetree/apps/web/lib/strategy/indicators.ts:56-end` — INDICATORS array with full metadata including defaultParams. Use these as defaults in strategy templates.

  **API/Type References**:
  - `/opt/coffeetree/apps/web/lib/strategy/condition-types.ts:116-257` — Parameter interfaces (MovingAverageParams, RSIParams, MACDParams, etc.) showing valid parameter names and types.

  **WHY Each Reference Matters**:
  - `condition-types.ts` IndicatorType: Source of truth for ALL valid indicator names. Any name not in this enum is NEW_REQUIRED.
  - `operators.ts` arrays: Source of truth for ALL valid operator names.
  - `indicators.ts` INDICATORS: Provides default parameter values that should be used in strategy templates.

  **Acceptance Criteria**:

  ```bash
  # Document header exists with disclaimer
  grep -c "not investment advice\|투자 조언이 아닙니다" /path/to/output.md
  # Assert: ≥ 1

  # Node notation format defined
  grep -c "Node Notation Format\|노드 표기법" /path/to/output.md
  # Assert: ≥ 1

  # At least 2 example strategies
  grep -c "^### Strategy" /path/to/output.md
  # Assert: ≥ 2

  # Tier definitions exist
  grep -c "Basic Tier\|Advanced Tier\|Pro Tier" /path/to/output.md
  # Assert: ≥ 3
  ```

  **Commit**: NO (intermediate output — document is assembled in Task 7)

---

- [ ] 2. Research & Verify All Strategy Origins, Creators, and Performance Claims

  **What to do**:
  1. For each of the 30+ planned strategies, research and document:
     - **Origin/Creator**: Who invented or popularized it? (name, year, publication/book)
     - **Source citation**: Specific book, paper, or well-known practitioner source
     - **Historical performance context**: Qualitative description of when/where this strategy works
     - **Market conditions**: Trending, ranging, volatile, specific asset classes
  2. **Mandatory strategies to research** (user-specified):
     - Golden Cross / Death Cross — Origin in technical analysis (Edwards & Magee, 1948?)
     - RSI — J. Welles Wilder Jr., "New Concepts in Technical Trading Systems" (1978)
     - MACD — Gerald Appel (1979)
     - Bollinger Bands — John Bollinger, "Bollinger on Bollinger Bands" (2001)
     - Stochastic Oscillator — George Lane (1950s)
     - ADX — J. Welles Wilder Jr. (1978)
     - Turtle Trading — Richard Dennis & William Eckhardt (1983), documented by Curtis Faith
     - Dual Momentum — Gary Antonacci, "Dual Momentum Investing" (2014)
     - Mean Reversion — Academic concept, Bollinger Band application
     - Ichimoku — Goichi Hosoda (1968), published 1969
     - VWAP — Institutional trading concept
     - Larry Williams %R — Larry Williams, "How I Made One Million Dollars" (1973)
     - Jesse Livermore — "Reminiscences of a Stock Operator" (Edwin Lefèvre, 1923)
     - CANSLIM — William O'Neil, "How to Make Money in Stocks" (1988)
     - Weinstein Stage — Stan Weinstein, "Secrets for Profiting in Bull and Bear Markets" (1988)
     - Elder Triple Screen — Alexander Elder, "Trading for a Living" (1993)
     - Keltner Channel — Chester Keltner (1960), modernized by Linda Raschke

  3. **Verification standards**:
     - Creator attribution must be traceable to a published work (book, paper, recognized platform)
     - If a strategy is a "folk" technique with no single creator, state "Traditional Technical Analysis"
     - Performance claims must be qualitative: "effective in trending markets" not "returns 15% annually"

  **Must NOT do**:
  - Do NOT invent strategies or attribute strategies incorrectly
  - Do NOT provide specific numerical performance data (no "X% return")
  - Do NOT include strategies without at least one citable source
  - Do NOT spend more than ~2 paragraphs of research per strategy

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Deep research task requiring accuracy on 30+ historical facts. High-quality model needed to avoid hallucinating attributions.
  - **Skills**: []
    - No code skills needed
  - **Skills Evaluated but Omitted**:
    - `data-scientist`: Not analyzing data
    - `typescript-programmer`: Not writing code

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Documentation References**:
  - Strategy tier assignment table in this plan (Context section) — defines which strategies go in which tier
  - This plan's "Missing Nodes Preliminary Assessment" section — identifies which strategies need NEW_REQUIRED flags

  **WHY Each Reference Matters**:
  - Tier assignment: Determines which strategies this task needs to research
  - Missing nodes assessment: Researcher should note if any strategy requires nodes not listed

  **Acceptance Criteria**:

  ```bash
  # Research output file exists with all 17 required strategies
  for s in "Golden Cross" "Death Cross" "RSI" "MACD" "Bollinger" "Stochastic" "ADX" "Turtle" "Dual Momentum" "Mean Reversion" "Ichimoku" "VWAP" "Williams" "Livermore" "CANSLIM" "Weinstein" "Elder Triple" "Keltner"; do
    grep -l "$s" /path/to/research-output.md || echo "MISSING: $s"
  done
  # Assert: No "MISSING" lines

  # Each entry has an origin/creator citation
  grep -c "Origin\|Creator\|출처\|개발자" /path/to/research-output.md
  # Assert: ≥ 30

  # No specific return percentages
  grep -c "% return\|% profit\|annualized\|annual return\|수익률 [0-9]" /path/to/research-output.md
  # Assert: 0
  ```

  **Commit**: NO (intermediate research output)

---

- [ ] 3. Write Basic Tier Strategies (11 entries)

  **What to do**:
  Using the format from Task 1 and research from Task 2, write complete strategy entries for the Basic Tier:

  1. Golden Cross (골든 크로스)
  2. Death Cross (데스 크로스)
  3. RSI Overbought/Oversold (RSI 과매수/과매도)
  4. MACD Crossover (MACD 크로스오버)
  5. Bollinger Band Bounce (볼린저 밴드 바운스)
  6. Stochastic Crossover (스토캐스틱 크로스오버)
  7. SuperTrend Following (슈퍼트렌드 추세추종)
  8. OBV Trend Confirmation (OBV 추세 확인)
  9. Williams %R Reversal (윌리엄스 %R 반전)
  10. CCI Momentum (CCI 모멘텀)
  11. PSAR Trend Following (파라볼릭 SAR 추세추종)

  **Each entry MUST include ALL fields**:
  - Name (Korean + English)
  - Category: trend | momentum | volatility | volume | mean-reversion
  - Origin/Creator (from Task 2 research)
  - Principle (2-3 sentences)
  - Entry conditions in node notation
  - Exit conditions in node notation
  - Required Indicators (exact IndicatorType names)
  - Required Operators (exact operator names)
  - Default Parameters (with values from `indicators.ts`)
  - Historical Performance (qualitative, from Task 2)
  - Best Market Conditions
  - Risk Management (SL/TP approach)

  **Basic Tier criteria**: Single indicator or simple dual-indicator comparison, straightforward entry/exit, no complex condition chaining.

  **Must NOT do**:
  - Do NOT use indicator names not in `condition-types.ts` IndicatorType enum
  - Do NOT use operator names not in `operators.ts`
  - Do NOT provide specific return percentages
  - Do NOT add strategies beyond the assigned 11

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Structured technical writing with consistent format
  - **Skills**: []
    - No code skills needed
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not writing code
    - `data-scientist`: Not analyzing data

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - Task 1 output — Node notation format and document template (must follow exactly)
  - Task 2 output — Research data for each strategy (origin, performance, conditions)
  - `/opt/coffeetree/apps/web/lib/strategy/indicators.ts` — INDICATORS array with defaultParams for each indicator type
  - `/opt/coffeetree/apps/web/lib/strategy/condition-types.ts:29-106` — IndicatorType enum for valid names

  **WHY Each Reference Matters**:
  - Task 1 output: Defines the format — every strategy must match it exactly
  - Task 2 output: Provides verified origin/creator/performance data
  - `indicators.ts`: Provides default parameter values to use in templates
  - `condition-types.ts`: Source of truth for valid indicator type names

  **Acceptance Criteria**:

  ```bash
  # 11 strategy entries
  grep -c "^### Strategy" /path/to/basic-tier.md
  # Assert: 11

  # All have Entry and Exit sections
  grep -c "**Entry" /path/to/basic-tier.md  # Assert: 11
  grep -c "**Exit" /path/to/basic-tier.md   # Assert: 11

  # All required Basic strategies present
  for s in "Golden Cross" "Death Cross" "RSI" "MACD" "Bollinger" "Stochastic" "SuperTrend" "OBV" "Williams" "CCI" "PSAR"; do
    grep -l "$s" /path/to/basic-tier.md || echo "MISSING: $s"
  done
  # Assert: No "MISSING" lines
  ```

  **Commit**: NO (intermediate output — assembled in Task 7)

---

- [ ] 4. Write Advanced Tier Strategies (12 entries)

  **What to do**:
  Using the format from Task 1 and research from Task 2, write complete strategy entries for the Advanced Tier:

  12. Bollinger Squeeze Breakout (볼린저 스퀴즈 돌파)
  13. ADX Trend Strength Filter (ADX 추세 강도 필터)
  14. MACD Histogram Divergence (MACD 히스토그램 다이버전스)
  15. Mean Reversion Bollinger (볼린저 평균회귀)
  16. Keltner Channel Breakout (켈트너 채널 돌파)
  17. Dual Moving Average + RSI (이중 이동평균 + RSI)
  18. VWAP Reversion (VWAP 회귀)
  19. VWAP Breakout (VWAP 돌파)
  20. Stochastic RSI Combo (스토캐스틱 RSI 콤보)
  21. MFI + RSI Divergence (MFI + RSI 다이버전스)
  22. Aroon Trend System (아룬 추세 시스템)
  23. Larry Williams %R Strategy (래리 윌리엄스 %R 전략)

  **Advanced Tier criteria**: Multi-indicator combinations, conditional logic with AND/OR, requires understanding indicator interactions.

  **Same field requirements as Task 3.**

  **Must NOT do**: Same guardrails as Task 3.

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Structured technical writing, more complex strategy conditions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**: Same as Task 3 plus:
  - `/opt/coffeetree/apps/web/lib/strategy/operators.ts:84-115` — LOGICAL_OPERATORS for AND/OR combinations used in Advanced tier

  **Acceptance Criteria**:

  ```bash
  grep -c "^### Strategy" /path/to/advanced-tier.md  # Assert: 12
  grep -c "**Entry" /path/to/advanced-tier.md  # Assert: 12
  grep -c "**Exit" /path/to/advanced-tier.md   # Assert: 12

  for s in "Bollinger Squeeze" "ADX" "MACD Histogram" "Mean Reversion" "Keltner" "VWAP" "Stochastic RSI" "MFI" "Aroon" "Larry Williams"; do
    grep -l "$s" /path/to/advanced-tier.md || echo "MISSING: $s"
  done
  # Assert: No "MISSING" lines
  ```

  **Commit**: NO (intermediate output)

---

- [ ] 5. Write Pro Tier Strategies (10 entries)

  **What to do**:
  Using the format from Task 1 and research from Task 2, write complete strategy entries for the Pro Tier:

  24. Turtle Trading / Donchian Breakout (터틀 트레이딩)
  25. Dual Momentum (듀얼 모멘텀)
  26. Ichimoku Cloud System (일목균형표 구름 시스템) [+NEW_REQUIRED]
  27. Elder Triple Screen (엘더 트리플 스크린) [+MULTI_TIMEFRAME_REQUIRED]
  28. Jesse Livermore Pivot (제시 리버모어 피봇) [+PARTIAL_DISCRETIONARY]
  29. CANSLIM Adaptation (캔슬림 적응) [+PARTIAL_DISCRETIONARY]
  30. Weinstein Stage Analysis (와인스타인 스테이지) [+PARTIAL_DISCRETIONARY]
  31. Triple EMA Crossover System (삼중 EMA 크로스 시스템)
  32. Ichimoku-MACD Fusion (일목-MACD 퓨전) [+NEW_REQUIRED]
  33. Keltner-Bollinger Squeeze (켈트너-볼린저 스퀴즈)

  **Pro Tier criteria**: Named strategies from recognized practitioners, complex multi-indicator systems, may require capabilities beyond current node system. Each Pro strategy includes special flags where applicable.

  **Special handling for flagged strategies**:
  - `NEW_REQUIRED`: List the specific missing node types (e.g., ICHIMOKU_SENKOU_SPAN_A)
  - `MULTI_TIMEFRAME_REQUIRED`: Describe what multi-timeframe support is needed
  - `PARTIAL_DISCRETIONARY`: Clearly separate automatable elements from subjective ones

  **Must NOT do**: Same guardrails as Task 3, plus:
  - Do NOT design interfaces for NEW_REQUIRED nodes
  - Do NOT propose implementation for multi-timeframe support
  - Do NOT claim discretionary elements can be fully automated

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Pro tier requires nuanced understanding of complex trading systems and careful handling of discretionary/missing elements
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**: Same as Task 3 plus:
  - This plan's "Missing Nodes Preliminary Assessment" section — pre-identified gaps for Ichimoku, Elder, etc.
  - This plan's "Strategy Tier Assignment" Pro Tier table — defines which strategies have which flags

  **Acceptance Criteria**:

  ```bash
  grep -c "^### Strategy" /path/to/pro-tier.md  # Assert: 10
  grep -c "**Entry" /path/to/pro-tier.md  # Assert: 10
  grep -c "**Exit" /path/to/pro-tier.md   # Assert: 10

  # NEW_REQUIRED flags present for Ichimoku strategies
  grep -c "NEW_REQUIRED" /path/to/pro-tier.md  # Assert: ≥ 2

  for s in "Turtle" "Dual Momentum" "Ichimoku" "Elder" "Livermore" "CANSLIM" "Weinstein" "Triple EMA" "Keltner-Bollinger"; do
    grep -l "$s" /path/to/pro-tier.md || echo "MISSING: $s"
  done
  # Assert: No "MISSING" lines
  ```

  **Commit**: NO (intermediate output)

---

- [ ] 6. Cross-Reference All Node Types Against Codebase

  **What to do**:
  1. Read all three tier outputs (Tasks 3, 4, 5)
  2. Extract every unique indicator name referenced across all strategies
  3. Compare against the complete `IndicatorType` enum in `condition-types.ts`
  4. Extract every unique operator name referenced
  5. Compare against `ComparisonOperator` and `LogicalOperator` types
  6. Produce a report:
     - **Valid references**: Indicator/operator names that exist in codebase ✅
     - **Invalid references**: Names that don't match any type (ERRORS to fix) ❌
     - **NEW_REQUIRED references**: Intentionally flagged missing nodes (OK) ⚠️
  7. If any INVALID references found, list exact strategy + line for correction

  **Must NOT do**:
  - Do NOT modify the strategy documents — only report findings
  - Do NOT add or remove nodes from the codebase
  - Do NOT implement missing node types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical cross-referencing task — extract, compare, report
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Reading TypeScript type definitions accurately
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3, 4, 5

  **References**:
  - `/opt/coffeetree/apps/web/lib/strategy/condition-types.ts:29-106` — IndicatorType enum (source of truth)
  - `/opt/coffeetree/apps/web/lib/strategy/operators.ts:16,24` — ComparisonOperator type + LogicalOperator type
  - Task 3, 4, 5 outputs — Documents to cross-reference

  **Acceptance Criteria**:

  ```bash
  # Cross-reference report exists
  grep -c "VALID\|INVALID\|NEW_REQUIRED" /path/to/cross-ref-report.md
  # Assert: > 0

  # Zero INVALID references (all typos/misnames caught)
  grep -c "INVALID" /path/to/cross-ref-report.md
  # Assert: 0 (if > 0, strategies need correction before Task 7)
  ```

  **Commit**: NO (report only)

---

- [ ] 7. Compile Missing Nodes Summary + Final Assembly

  **What to do**:
  1. Assemble the final document by concatenating:
     - Document header + format spec (from Task 1)
     - Basic Tier (from Task 3)
     - Advanced Tier (from Task 4)
     - Pro Tier (from Task 5)
  2. Apply corrections from Task 6 cross-reference (if any INVALID references were found)
  3. Compile the **Missing Nodes Summary** appendix:
     - List every `NEW_REQUIRED` node type across all strategies
     - For each: node name, which strategy requires it, proposed category (trend/momentum/etc.)
     - List every `MULTI_TIMEFRAME_REQUIRED` flag
     - List every `PARTIAL_DISCRETIONARY` flag with specific discretionary elements
  4. Add final sections:
     - Strategy Count Summary table (per tier)
     - Complete list of all indicators used across all strategies (for quick reference)
     - Complete list of all operators used

  **Must NOT do**:
  - Do NOT add new strategies beyond what was written in Tasks 3-5
  - Do NOT design missing node interfaces
  - Do NOT modify strategy content except for cross-reference corrections

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Document assembly and appendix compilation — structured writing
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Not writing code
    - `git-master`: Commit handled separately

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 8
  - **Blocked By**: Task 6

  **References**:
  - Task 1, 3, 4, 5, 6 outputs — All content to assemble
  - This plan's "Missing Nodes Preliminary Assessment" section — Pre-identified gaps to verify

  **Acceptance Criteria**:

  ```bash
  # Final document exists
  test -f /path/to/final-strategy-templates.md && echo "EXISTS" || echo "MISSING"
  # Assert: EXISTS

  # Strategy count
  grep -c "^### Strategy" /path/to/final.md  # Assert: ≥ 30, ≤ 35

  # All 3 tiers present
  grep -c "## Basic Tier\|## Advanced Tier\|## Pro Tier" /path/to/final.md  # Assert: 3

  # Missing Nodes Summary exists
  grep -c "Missing Nodes Summary\|누락 노드 요약" /path/to/final.md  # Assert: ≥ 1

  # Disclaimer present
  grep -c "not investment advice\|투자 조언이 아닙니다" /path/to/final.md  # Assert: ≥ 1
  ```

  **Commit**: YES
  - Message: `docs(strategy): add 30+ strategy node template reference document`
  - Files: `path/to/final-strategy-templates.md`
  - Pre-commit: Verification (Task 8)

---

- [ ] 8. Automated Verification & QA

  **What to do**:
  Run all verification commands against the final assembled document:

  1. **Structural checks**: Count strategies, tiers, entry/exit sections
  2. **Required strategy presence**: Verify all 17 user-specified strategies
  3. **Anti-pattern checks**: No specific return percentages
  4. **NEW_REQUIRED flag count**: At least Ichimoku components
  5. **Completeness**: Every strategy has all required fields

  **Must NOT do**:
  - Do NOT modify the document — only verify and report
  - Do NOT add "user manually checks" criteria

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Automated grep/wc verification — mechanical task
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All omitted — pure shell verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Task 7)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 7

  **Acceptance Criteria**:

  ```bash
  # Full verification suite (all must pass):

  # 1. Total strategies ≥ 30
  COUNT=$(grep -c "^### Strategy" /path/to/final.md)
  [ "$COUNT" -ge 30 ] && echo "PASS: $COUNT strategies" || echo "FAIL: only $COUNT strategies"

  # 2. Each tier has ≥ 10
  BASIC=$(grep -A1000 "## Basic Tier" /path/to/final.md | grep -c "^### Strategy")
  ADVANCED=$(grep -A1000 "## Advanced Tier" /path/to/final.md | grep -c "^### Strategy")
  PRO=$(grep -A1000 "## Pro Tier" /path/to/final.md | grep -c "^### Strategy")

  # 3. All 17 required strategies
  REQUIRED=("Golden Cross" "Death Cross" "RSI" "MACD Crossover" "Bollinger" "Stochastic" "ADX" "Turtle" "Dual Momentum" "Mean Reversion" "Ichimoku" "VWAP" "Williams" "Livermore" "CANSLIM" "Weinstein" "Elder" "Keltner")
  for s in "${REQUIRED[@]}"; do
    grep -q "$s" /path/to/final.md || echo "FAIL: Missing $s"
  done

  # 4. No specific return percentages
  grep -c "% return\|% profit\|annualized return\|연간 수익률" /path/to/final.md
  # Assert: 0

  # 5. NEW_REQUIRED flags exist
  grep -c "NEW_REQUIRED" /path/to/final.md
  # Assert: ≥ 1

  # 6. Entry/Exit completeness matches strategy count
  ENTRY_COUNT=$(grep -c "**Entry" /path/to/final.md)
  EXIT_COUNT=$(grep -c "**Exit" /path/to/final.md)
  [ "$ENTRY_COUNT" -eq "$COUNT" ] && echo "PASS: Entry complete" || echo "FAIL: Entry count mismatch"
  [ "$EXIT_COUNT" -eq "$COUNT" ] && echo "PASS: Exit complete" || echo "FAIL: Exit count mismatch"
  ```

  **Commit**: NO (verification only — commit was in Task 7)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 7 | `docs(strategy): add 30+ strategy node template reference document` | Final assembled .md file | Task 8 automated checks |

---

## Success Criteria

### Verification Commands
```bash
# Total strategy count
grep -c "^### Strategy" /path/to/final.md
# Expected: ≥ 30, ≤ 35

# Tier count
grep -c "## Basic Tier\|## Advanced Tier\|## Pro Tier" /path/to/final.md
# Expected: 3

# All required strategies present (spot check)
grep "Golden Cross" /path/to/final.md && echo "✅"
grep "Turtle" /path/to/final.md && echo "✅"
grep "Ichimoku" /path/to/final.md && echo "✅"
grep "Elder" /path/to/final.md && echo "✅"
grep "CANSLIM" /path/to/final.md && echo "✅"

# Missing nodes flagged
grep "NEW_REQUIRED" /path/to/final.md
# Expected: At minimum ICHIMOKU_SENKOU_SPAN_A, ICHIMOKU_SENKOU_SPAN_B, ICHIMOKU_CHIKOU

# No forbidden content
grep -c "% return\|% profit" /path/to/final.md
# Expected: 0
```

### Final Checklist
- [ ] All 17 user-specified strategies present
- [ ] 3 tiers with ≥ 10 each
- [ ] Total ≥ 30, ≤ 35
- [ ] Every indicator reference valid (in codebase OR flagged NEW_REQUIRED)
- [ ] Every operator reference valid
- [ ] No specific return percentages
- [ ] Each strategy has complete metadata (all required fields)
- [ ] Missing Nodes Summary appendix present
- [ ] Disclaimer included
- [ ] Node notation format defined and consistently used
