# Trading Strategy Templates: 30+ Verified Strategies as Node-Based Templates

## TL;DR

> **Quick Summary**: Compile 33 verified trading strategies into structured node-based templates using the existing indicator/operator/signal vocabulary, organized into 3 tiers (Beginner/Intermediate/Advanced, 11 each), with Korean+English names, default parameters, entry/exit rules expressed as operator chains, and cited historical performance (or explicit "no canonical study" annotations).
> 
> **Deliverables**:
> - A single structured catalog document (JSON + companion Markdown) containing all 33 strategy templates
> - Each template includes: metadata, indicator nodes, operator-based entry/exit rules, default parameters, cited performance, market conditions
> - A separate "New Node Types Required" appendix listing strategies that need operators/indicators beyond the current vocabulary
> - A "Strategy Template Schema" section defining all required fields
> 
> **Estimated Effort**: Medium (research-intensive, no code changes)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7

---

## Context

### Original Request
Compile 30+ VERIFIED trading strategies into node-based templates with 3 tiers and required metadata. Include: parallel task graph, structured document template, verification approach (cite sources or state "no canonical win rate"), and a list of strategies needing new node types. Express Entry/Exit rules using operators (GREATER_THAN, LESS_THAN, CROSSES_ABOVE, CROSSES_BELOW, AND, OR). Include Korean+English names. Propose default parameters. Do not fabricate performance metrics.

### Research Findings

**Academic Sources Identified**:
- Gatev, Goetzmann & Rouwenhorst (1999) — Pairs Trading, NBER Working Paper 7032: avg annualized excess return ~12%
- Moskowitz, Ooi & Pedersen (2012) — Time Series Momentum, Journal of Financial Economics: positive returns across 58 instruments
- Chong, Ng & Liew (2014) — MACD(12,26,0) and RSI(21,50) generate significant abnormal returns on Milan/TSX indices
- Brock, Lakonishok & LeBaron (1992) — Technical Trading Rules, Journal of Finance: MA rules profitable on DJIA 1897-1986
- Chan, Jegadeesh & Lakonishok (1996) — Momentum Strategies, Journal of Finance: price+earnings momentum predict returns
- Connors & Alvarez — Bollinger Bands %b strategies: win rates 65-75% (in-sample 2006-2012)
- Quantstock.org SPY backtest (2018-2023): BB strategy win rate 63.5%, Sharpe 1.05

**Node-Based Builder Patterns Referenced**:
- Pineify (TradingView condition editor)
- SharkIndicators BloodHound (logic templates with Crossover, Comparison nodes)
- Superalgos (trading strategy signal node definitions)
- Blockunity (35+ indicators, 80+ strategies, flowchart-based)

**Existing System Architecture** (from coffeetree project):
- ReactFlow-based visual strategy builder
- Node types: `indicator`, `operator`, `signal`
- Backtest engine checks `hasStrategyLogic` via `workflow.nodes.some(n => n.type === 'indicator' || n.type === 'operator' || n.type === 'signal')`

### Metis Review — Gaps Addressed

| Gap | Classification | Resolution |
|-----|---------------|------------|
| Output format unclear | **Default Applied** | JSON catalog + companion Markdown. User can override. |
| "Verified" definition ambiguous | **Default Applied** | Strategy logic correctly expressed in node vocabulary AND either has academic citation or explicit "no canonical study" note. |
| Combination strategy deduplication | **Guardrail** | One unique entry/exit logic pair = one strategy. Variants noted in `variants` field. |
| Parameter specificity | **Default Applied** | One canonical parameter set per strategy. Variants noted, not separately templated. |
| Exit logic completeness | **Guardrail** | Every strategy MUST have both entry AND exit rules. Stop-loss/take-profit included only if expressible in current operators. |
| Tier assignment criteria | **Default Applied** | Beginner = single indicator; Intermediate = 2 indicators combined; Advanced = 3+ indicators or complex multi-condition logic. |
| Korean+English scope | **Default Applied** | Strategy names in both languages. Descriptions in English only (Korean descriptions would double the work for marginal value). |
| Indicator-to-indicator comparison | **Edge Case** | Current operators compare indicator-to-value. Strategies needing indicator-to-indicator (e.g., RSI > Stochastic) flagged for new operator type. |
| Time-based conditions ("for N bars") | **Edge Case** | Cannot express with current operators. Flagged in New Node Types list. |
| Same indicator different params (SMA 50 vs SMA 200) | **Default Applied** | Template uses instance labels: `SMA_50`, `SMA_200` referencing same indicator type with different period parameter. |
| Ichimoku sub-components | **Default Applied** | Treated as one indicator node with 5 named outputs (Tenkan, Kijun, SenkouA, SenkouB, Chikou). Entry rules reference sub-outputs. |

---

## Work Objectives

### Core Objective
Research, verify, and document 33 trading strategies as node-based templates with structured metadata, organized into 3 tiers of 11 each, using the existing indicator/operator vocabulary.

### Concrete Deliverables
1. **Strategy Catalog** — Structured document containing all 33 strategy templates
2. **Strategy Template Schema** — Formal field definitions for the template format
3. **New Node Types Required** — Appendix listing strategies that need indicators or operators beyond the current vocabulary
4. **Citation Registry** — All academic/book sources referenced, with full bibliographic entries

### Definition of Done
- [ ] 33 strategies documented (11 per tier)
- [ ] Every strategy has Korean + English names
- [ ] Every strategy has both entry AND exit rules using allowed operators
- [ ] Every strategy has default parameter values
- [ ] Zero fabricated performance metrics
- [ ] Every quantitative claim has author/year/source citation
- [ ] Strategies needing new nodes are flagged and listed separately
- [ ] All operators used are from: {GREATER_THAN, LESS_THAN, CROSSES_ABOVE, CROSSES_BELOW, AND, OR}

### Must Have
- 33 strategies total, 11 per tier (Beginner/Intermediate/Advanced)
- Entry/exit rules expressed purely in the operator vocabulary
- Default parameters for every indicator used
- Korean + English strategy names
- Historical performance with citations or explicit "no canonical study found" annotation
- Separate "New Node Types" list for strategies requiring unsupported indicators/operators

### Must NOT Have (Guardrails)
- **G1**: No fabricated win rates, Sharpe ratios, or backtest numbers. Citation required or "No canonical study found. Widely used in practice."
- **G2**: No operators beyond: GREATER_THAN, LESS_THAN, CROSSES_ABOVE, CROSSES_BELOW, AND, OR. If needed, flag for new node types.
- **G3**: No indicators beyond the available set. If needed, flag for new node types.
- **G4**: Cap at exactly 33 strategies (11 × 3 tiers). No scope expansion.
- **G5**: One canonical parameter set per strategy. Variants in a `variants` field only.
- **G6**: No code, no Pine Script, no implementation. Documentation only.
- **G7**: No educational content beyond 2-sentence descriptions per strategy.
- **G8**: No risk management/position sizing content. Stop-loss only if expressible in current operators.
- **G9**: No per-timeframe parameter variants. One `recommendedTimeframes` array.

---

## Strategy Template Schema

Every strategy template MUST contain these fields:

```json
{
  "id": "strategy-rsi-mean-reversion",
  "nameEn": "RSI Mean Reversion",
  "nameKo": "RSI 평균 회귀",
  "tier": "beginner",
  "description": "Identifies overbought/oversold conditions using RSI and trades the reversion to the mean.",
  "marketCondition": "ranging",
  "recommendedTimeframes": ["1H", "4H", "1D"],
  
  "indicators": [
    {
      "id": "rsi_1",
      "type": "RSI",
      "defaultParameters": { "period": 14 }
    }
  ],
  
  "entryRules": {
    "long": {
      "operator": "CROSSES_ABOVE",
      "left": { "indicator": "rsi_1", "output": "value" },
      "right": { "constant": 30 },
      "description": "Buy when RSI crosses above 30 (leaving oversold zone)"
    },
    "short": {
      "operator": "CROSSES_BELOW",
      "left": { "indicator": "rsi_1", "output": "value" },
      "right": { "constant": 70 },
      "description": "Sell when RSI crosses below 70 (leaving overbought zone)"
    }
  },
  
  "exitRules": {
    "longExit": {
      "operator": "GREATER_THAN",
      "left": { "indicator": "rsi_1", "output": "value" },
      "right": { "constant": 70 },
      "description": "Exit long when RSI exceeds 70"
    },
    "shortExit": {
      "operator": "LESS_THAN",
      "left": { "indicator": "rsi_1", "output": "value" },
      "right": { "constant": 30 },
      "description": "Exit short when RSI drops below 30"
    }
  },
  
  "historicalPerformance": {
    "summary": "MACD and RSI rules generate significant abnormal returns on multiple indices.",
    "citation": "Chong, T.T.L., Ng, W.K., Liew, V.K.S. (2014). Revisiting the Performance of MACD and RSI Oscillators. Journal of Risk and Financial Management, 7(1), 1-12.",
    "metrics": null,
    "note": "Study covers RSI(21,50) on Milan/TSX indices. This template uses standard RSI(14,30/70)."
  },
  
  "variants": [
    { "name": "Conservative RSI", "changes": { "overbought": 80, "oversold": 20 } },
    { "name": "Aggressive RSI", "changes": { "overbought": 60, "oversold": 40 } }
  ],
  
  "newNodeTypesRequired": [],
  "tags": ["mean-reversion", "oscillator", "single-indicator"]
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | YES | Unique kebab-case identifier |
| `nameEn` | string | YES | English strategy name |
| `nameKo` | string | YES | Korean strategy name |
| `tier` | enum | YES | `"beginner"` / `"intermediate"` / `"advanced"` |
| `description` | string | YES | Max 2 sentences describing the strategy logic |
| `marketCondition` | enum | YES | `"trending"` / `"ranging"` / `"volatile"` / `"any"` |
| `recommendedTimeframes` | string[] | YES | e.g., `["1H","4H","1D"]` |
| `indicators` | array | YES | List of indicator nodes with id, type, defaultParameters |
| `entryRules` | object | YES | `long` and/or `short` entry conditions using operators |
| `exitRules` | object | YES | `longExit` and/or `shortExit` conditions using operators |
| `historicalPerformance` | object | YES | `summary`, `citation` (null if none), `metrics` (null if unverified), `note` |
| `variants` | array | NO | Parameter variations (noted, not separately templated) |
| `newNodeTypesRequired` | string[] | YES | Empty array if none; lists needed operators/indicators |
| `tags` | string[] | YES | Categorization tags |

### Operator Vocabulary

| Operator | Semantics | Example |
|----------|-----------|---------|
| `GREATER_THAN` | left > right | RSI value > 70 |
| `LESS_THAN` | left < right | RSI value < 30 |
| `CROSSES_ABOVE` | left crosses from below to above right | SMA_50 crosses above SMA_200 |
| `CROSSES_BELOW` | left crosses from below to above right (inverse) | SMA_50 crosses below SMA_200 |
| `AND` | Both conditions must be true | ADX > 25 AND price > SMA_200 |
| `OR` | Either condition must be true | RSI > 70 OR Stochastic > 80 |

### Compound Rule Expression

For multi-condition entry/exit rules, use nested AND/OR:

```json
{
  "operator": "AND",
  "conditions": [
    {
      "operator": "GREATER_THAN",
      "left": { "indicator": "adx_1", "output": "value" },
      "right": { "constant": 25 }
    },
    {
      "operator": "CROSSES_ABOVE",
      "left": { "indicator": "macd_1", "output": "histogram" },
      "right": { "constant": 0 }
    }
  ]
}
```

### Indicator Instance Naming Convention

When a strategy uses the same indicator type with different parameters:
- `SMA_50` — SMA with period=50
- `SMA_200` — SMA with period=200
- `stoch_fast` — Stochastic(5,3,3)
- `stoch_slow` — Stochastic(14,3,3)

---

## Available Indicators (Current Vocabulary)

| Indicator | Default Parameters | Outputs |
|-----------|-------------------|---------|
| RSI | period: 14 | value |
| MACD | fast: 12, slow: 26, signal: 9 | macd, signal, histogram |
| SMA | period: 20 | value |
| EMA | period: 20 | value |
| Bollinger Bands | period: 20, stdDev: 2 | upper, middle, lower, percentB |
| Stochastic | kPeriod: 14, dPeriod: 3, smooth: 3 | k, d |
| ADX | period: 14 | value, plusDI, minusDI |
| Supertrend | period: 10, multiplier: 3 | value, direction |
| Ichimoku | tenkan: 9, kijun: 26, senkou: 52 | tenkan, kijun, senkouA, senkouB, chikou |
| CCI | period: 20 | value |
| OBV | (cumulative) | value |
| MFI | period: 14 | value |
| VWAP | anchor: session | value |
| ATR | period: 14 | value |
| Williams %R | period: 14 | value |
| PSAR | step: 0.02, max: 0.2 | value, direction |

---

## Strategy Master List (33 Strategies)

### Tier 1: Beginner (11 strategies) — Single Indicator

| # | ID | English Name | Korean Name | Primary Indicator |
|---|-----|-------------|-------------|-------------------|
| 1 | `rsi-mean-reversion` | RSI Mean Reversion | RSI 평균 회귀 | RSI |
| 2 | `sma-crossover` | SMA Golden/Death Cross | SMA 골든/데드 크로스 | SMA(50), SMA(200) |
| 3 | `ema-crossover` | EMA Crossover | EMA 크로스오버 | EMA(9), EMA(21) |
| 4 | `bb-mean-reversion` | Bollinger Bands Mean Reversion | 볼린저 밴드 평균 회귀 | Bollinger Bands |
| 5 | `macd-signal-cross` | MACD Signal Line Cross | MACD 시그널 크로스 | MACD |
| 6 | `stochastic-ob-os` | Stochastic Overbought/Oversold | 스토캐스틱 과매수/과매도 | Stochastic |
| 7 | `supertrend-follow` | Supertrend Trend Follower | 슈퍼트렌드 추세 추종 | Supertrend |
| 8 | `psar-trend-flip` | Parabolic SAR Trend Flip | PSAR 추세 전환 | PSAR |
| 9 | `cci-zero-cross` | CCI Zero-Line Cross | CCI 제로라인 크로스 | CCI |
| 10 | `williams-r-reversal` | Williams %R Reversal | 윌리엄스 %R 반전 | Williams %R |
| 11 | `vwap-mean-reversion` | VWAP Mean Reversion | VWAP 평균 회귀 | VWAP |

### Tier 2: Intermediate (11 strategies) — 2 Indicator Combinations

| # | ID | English Name | Korean Name | Indicators |
|---|-----|-------------|-------------|------------|
| 12 | `rsi-bb-squeeze` | RSI + Bollinger Band Squeeze | RSI + 볼린저 밴드 스퀴즈 | RSI, BB |
| 13 | `macd-rsi-confirm` | MACD + RSI Confirmation | MACD + RSI 확인 | MACD, RSI |
| 14 | `supertrend-stoch-pullback` | Supertrend + Stochastic Pullback | 슈퍼트렌드 + 스토캐스틱 풀백 | Supertrend, Stochastic |
| 15 | `adx-cci-momentum` | ADX + CCI Momentum Burst | ADX + CCI 모멘텀 버스트 | ADX, CCI |
| 16 | `vwap-psar-intraday` | VWAP + PSAR Intraday Trend | VWAP + PSAR 장중 추세 | VWAP, PSAR |
| 17 | `ema-adx-trend` | EMA + ADX Trend Strength | EMA + ADX 추세 강도 | EMA, ADX |
| 18 | `bb-macd-divergence` | Bollinger + MACD Divergence | 볼린저 + MACD 다이버전스 | BB, MACD |
| 19 | `obv-adx-flow` | OBV + ADX Institutional Flow | OBV + ADX 기관 흐름 | OBV, ADX |
| 20 | `atr-supertrend-volatility` | ATR + Supertrend Volatility Filter | ATR + 슈퍼트렌드 변동성 필터 | ATR, Supertrend |
| 21 | `mfi-bb-volume-price` | MFI + Bollinger Volume-Price | MFI + 볼린저 거래량-가격 | MFI, BB |
| 22 | `stoch-williams-double-momentum` | Stochastic + Williams %R Double Momentum | 스토캐스틱 + 윌리엄스 이중 모멘텀 | Stochastic, Williams %R |

### Tier 3: Advanced (11 strategies) — 3+ Indicators / Complex Logic

| # | ID | English Name | Korean Name | Indicators |
|---|-----|-------------|-------------|------------|
| 23 | `ichimoku-cloud-breakout` | Ichimoku Cloud Breakout | 이치모쿠 구름 돌파 | Ichimoku |
| 24 | `triple-ema-adx-rsi` | Triple Screen (EMA + ADX + RSI) | 트리플 스크린 (EMA + ADX + RSI) | EMA, ADX, RSI |
| 25 | `vwap-supertrend-stoch` | VWAP + Supertrend + Stochastic Day Trading | VWAP + 슈퍼트렌드 + 스토캐스틱 데이트레이딩 | VWAP, Supertrend, Stochastic |
| 26 | `atr-adx-williams-squeeze` | Volatility Squeeze Breakout | 변동성 스퀴즈 돌파 | ATR, ADX, Williams %R |
| 27 | `obv-cci-stoch-reversal` | Volume-Price Reversal | 거래량-가격 반전 | OBV, CCI, Stochastic |
| 28 | `psar-cci-supertrend-momentum` | Parabolic Momentum | 파라볼릭 모멘텀 | PSAR, CCI, Supertrend |
| 29 | `vwap-williams-adx-pullback` | Institutional Pullback | 기관 풀백 | VWAP, Williams %R, ADX |
| 30 | `supertrend-adx-obv-lazy` | Lazy Trader Trend Follow | 레이지 트레이더 추세 추종 | Supertrend, ADX, OBV |
| 31 | `williams-stoch-atr-exhaust` | Exhaustion Reversal | 소진 반전 | Williams %R, Stochastic, ATR |
| 32 | `adx-psar-obv-confluence` | Trend Confluence | 추세 합류 | ADX, PSAR, OBV |
| 33 | `ichimoku-macd-bb-system` | Ichimoku + MACD + Bollinger System | 이치모쿠 + MACD + 볼린저 시스템 | Ichimoku, MACD, BB |

---

## Verification Strategy (MANDATORY)

### Historical Performance Handling Protocol

**CRITICAL RULE**: Every strategy's `historicalPerformance` field MUST follow this protocol:

| Scenario | Action | Example Output |
|----------|--------|----------------|
| Academic study exists with quantitative results | Cite with full bibliographic entry + specific metrics | `"citation": "Brock et al. (1992)..."`, `"metrics": { "excessReturn": "..." }` |
| Book/practitioner source exists without formal metrics | Cite the source, describe qualitative findings | `"citation": "Connors & Alvarez, Short Term Trading Strategies That Work"`, `"metrics": null` |
| Strategy is widely used but no formal study found | State explicitly | `"summary": "No canonical study found. Widely used in practice among retail and institutional traders."`, `"citation": null` |
| Strategy is a novel combination | State explicitly | `"summary": "Novel combination without independent study. Component indicators individually studied."`, `"citation": null` |

**NEVER**:
- Fabricate a win rate (e.g., "65% win rate" without citation)
- Fabricate a Sharpe ratio
- Fabricate backtest return numbers
- Use weasel language like "typically achieves" without a source

### Citation Registry (Known Sources)

These are the verified academic/book sources to reference. Each strategy task MUST check this list first:

| Citation Key | Full Reference | Relevant To |
|-------------|---------------|-------------|
| `brock1992` | Brock, W., Lakonishok, J., LeBaron, B. (1992). Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. Journal of Finance, 47(5), 1731-1764. | MA Crossover strategies |
| `chong2014` | Chong, T.T.L., Ng, W.K., Liew, V.K.S. (2014). Revisiting the Performance of MACD and RSI Oscillators. Journal of Risk and Financial Management, 7(1), 1-12. | MACD, RSI strategies |
| `moskowitz2012` | Moskowitz, T.J., Ooi, Y.H., Pedersen, L.H. (2012). Time Series Momentum. Journal of Financial Economics, 104(2), 228-250. | Momentum/trend-following strategies |
| `chan1996` | Chan, L.K.C., Jegadeesh, N., Lakonishok, J. (1996). Momentum Strategies. Journal of Finance, 51(5), 1681-1713. | Price momentum strategies |
| `gatev1999` | Gatev, E., Goetzmann, W.N., Rouwenhorst, K.G. (2006). Pairs Trading: Performance of a Relative-Value Arbitrage Rule. Review of Financial Studies, 19(3), 797-827. | Pairs/mean-reversion strategies |
| `connors2008` | Connors, L., Alvarez, C. (2008). Short Term Trading Strategies That Work. TradingMarkets. | Bollinger Bands, RSI, mean reversion |
| `elder1993` | Elder, A. (1993). Trading for a Living. John Wiley & Sons. | Triple Screen strategy, general TA |
| `appel2005` | Appel, G. (2005). Technical Analysis: Power Tools for Active Investors. FT Press. | MACD (original creator) |
| `wilder1978` | Wilder, J.W. (1978). New Concepts in Technical Trading Systems. Trend Research. | RSI, ATR, PSAR, ADX (original creator) |
| `bollinger2001` | Bollinger, J. (2001). Bollinger on Bollinger Bands. McGraw-Hill. | Bollinger Bands (original creator) |
| `hosoda1969` | Hosoda, G. (1969). Ichimoku Kinko Hyo. (Original Japanese publication) | Ichimoku (original creator) |
| `quantstock2023` | QuantStock.org (2023). Bollinger Bands Trading Strategy Guide. SPY ETF backtest 2018-2023. | BB: Win Rate 63.5%, Sharpe 1.05 |

### Feasibility Assessment: Operator Vocabulary Sufficiency

**Strategies expressible with current operators** (estimate: ~27/33):
- All single-indicator strategies: ✅ (threshold comparisons + crosses)
- Most dual-indicator strategies: ✅ (AND/OR combinations)
- Ichimoku: ✅ (multiple sub-output comparisons with AND)

**Strategies likely needing NEW node types** (flagged for appendix):
- **MACD Divergence** (Strategy #5 variant, #18): Needs `DIVERGENCE_BULLISH` / `DIVERGENCE_BEARISH` operators
- **Bollinger Band Squeeze** (#12): Needs `BANDWIDTH_LESS_THAN` or `IS_NARROWING` operator
- **Exhaustion Reversal** (#31): Needs comparison of candle range vs ATR value (indicator-to-indicator comparison)
- **OBV Breakout** (component of #19, #27, #30, #32): Needs `HIGHER_THAN_PREVIOUS_PEAK` operator
- **Time-based conditions** ("for N bars"): Multiple strategies would benefit but can be approximated

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — Independent):
├── Task 1: Define final template schema + write 5 sample strategies (feasibility validation)
├── Task 2: Compile complete citation registry from academic sources
└── (Both independent, can run in parallel)

Wave 2 (After Wave 1 — Parallel per tier):
├── Task 3: Research + document Tier 1 (Beginner) — 11 strategies
├── Task 4: Research + document Tier 2 (Intermediate) — 11 strategies
└── Task 5: Research + document Tier 3 (Advanced) — 11 strategies

Wave 3 (After Wave 2 — Sequential):
├── Task 6: Compile "New Node Types Required" appendix
└── Task 7: Validation pass — run all acceptance criteria

Critical Path: Task 1 → Task 3/4/5 → Task 7
Parallel Speedup: ~50% faster than sequential (Wave 2 runs 3 parallel tracks)
```

### Task Dependency Graph

| Task | Depends On | Blocks | Reason |
|------|------------|--------|--------|
| Task 1 | None | 3, 4, 5 | Schema must be validated before bulk research |
| Task 2 | None | 3, 4, 5 | Citation registry needed by all tier tasks |
| Task 3 | 1, 2 | 6, 7 | Uses validated schema + citations |
| Task 4 | 1, 2 | 6, 7 | Uses validated schema + citations |
| Task 5 | 1, 2 | 6, 7 | Uses validated schema + citations |
| Task 6 | 3, 4, 5 | 7 | Needs all strategies to identify gaps |
| Task 7 | 6 | None | Final validation after everything |

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5 | 2 |
| 2 | None | 3, 4, 5 | 1 |
| 3 | 1, 2 | 6, 7 | 4, 5 |
| 4 | 1, 2 | 6, 7 | 3, 5 |
| 5 | 1, 2 | 6, 7 | 3, 4 |
| 6 | 3, 4, 5 | 7 | None |
| 7 | 6 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | `category="writing"` with `load_skills=[]` (research + documentation) |
| 2 | 3, 4, 5 | `category="writing"` with `load_skills=[]`, `run_in_background=true` (parallel) |
| 3 | 6, 7 | `category="quick"` with `load_skills=[]` (validation/compilation) |

---

## TODOs

- [ ] 1. Define template schema + validate with 5 sample strategies

  **What to do**:
  1. Finalize the JSON template schema (as defined in the Schema section above)
  2. Write 5 diverse sample strategies to validate the operator vocabulary is sufficient:
     - 1 Beginner: `rsi-mean-reversion` (single indicator, simple threshold)
     - 1 Beginner: `sma-crossover` (same indicator type with different params, CROSSES_ABOVE/BELOW)
     - 1 Intermediate: `macd-rsi-confirm` (two indicators, AND combination)
     - 1 Advanced: `ichimoku-cloud-breakout` (complex multi-output indicator)
     - 1 Advanced: `vwap-supertrend-stoch` (three indicators, nested AND)
  3. For each sample, attempt to express entry/exit rules using ONLY the allowed operators
  4. Document any cases where the operator vocabulary is insufficient
  5. Report: What percentage of logic is expressible? If <60%, flag to user immediately.

  **Must NOT do**:
  - Do not write all 33 strategies — just 5 for validation
  - Do not fabricate any performance data
  - Do not write implementation code
  - Do not expand the schema beyond what's defined

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation/research task requiring structured output, not code
  - **Skills**: []
    - No programming skills needed — this is pure document authoring

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: No code to write
  - `frontend-ui-ux`: No UI work
  - `data-scientist`: No data analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:
  - Strategy Template Schema section in this plan (the full JSON schema definition)
  - Available Indicators table in this plan
  - Operator Vocabulary table in this plan
  - Strategy Master List (pick the 5 specified strategies)

  **External References**:
  - Wilder, J.W. (1978) — RSI original parameters
  - Brock et al. (1992) — SMA crossover rules
  - Hosoda (1969) — Ichimoku default parameters
  - Chong et al. (2014) — MACD + RSI performance

  **Acceptance Criteria**:
  - [ ] JSON schema finalized with all required fields
  - [ ] 5 sample strategies written in full template format
  - [ ] Each sample has entry AND exit rules using only allowed operators
  - [ ] Feasibility report: % of logic expressible with current operators
  - [ ] List of any operator/indicator gaps discovered during samples

  **Automated Verification**:
  ```bash
  # Verify 5 samples exist and have required fields
  cat output.json | jq '.sampleStrategies | length'
  # Assert: 5
  
  cat output.json | jq '[.sampleStrategies[] | select(.nameKo == null or .nameEn == null)] | length'
  # Assert: 0
  
  cat output.json | jq '[.sampleStrategies[] | select((.entryRules | length) == 0)] | length'
  # Assert: 0
  ```

  **Commit**: NO (intermediate deliverable)

---

- [ ] 2. Compile complete citation registry from academic sources

  **What to do**:
  1. Search for academic papers, books, and credible practitioner sources for each of the 33 strategies in the master list
  2. For each source found, record: author(s), year, title, journal/publisher, specific finding relevant to the strategy
  3. For strategies with NO credible source, explicitly mark as "No canonical study found"
  4. Organize into a lookup table by strategy ID
  5. Web search is REQUIRED — use `mcp_websearch_web_search_exa` and `mcp_google_search` to find academic papers on SSRN, NBER, JSTOR, ScienceDirect

  **Must NOT do**:
  - Do not fabricate citations (no made-up author names, journals, or dates)
  - Do not cite blog posts as academic sources (cite them separately as "practitioner source")
  - Do not spend more than 5 minutes per strategy on citation search — if not found quickly, mark "no canonical study"

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Research + documentation task
  - **Skills**: []
    - No programming skills needed

  **Skills Evaluated but Omitted**:
  - `data-scientist`: Not analyzing data, just finding citations
  - `typescript-programmer`: No code

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None

  **References**:
  - Citation Registry section in this plan (known sources as starting point)
  - Strategy Master List (all 33 strategy IDs to search for)
  - Known citation keys: brock1992, chong2014, moskowitz2012, chan1996, gatev1999, connors2008, elder1993, appel2005, wilder1978, bollinger2001, hosoda1969, quantstock2023

  **External References**:
  - SSRN: https://papers.ssrn.com/ — search for each strategy type
  - NBER: https://www.nber.org/papers — working papers on trading strategies
  - Google Scholar — general academic search
  - Wilder (1978) — RSI, ATR, PSAR, ADX original source
  - Appel (2005) — MACD original source

  **Acceptance Criteria**:
  - [ ] Citation registry covers all 33 strategies
  - [ ] Every entry has either: full bibliographic citation OR explicit "No canonical study found"
  - [ ] No fabricated citations
  - [ ] At least 12 strategies have academic/book citations (realistic target based on available literature)

  **Automated Verification**:
  ```bash
  # Verify all 33 strategies covered
  cat citations.json | jq '.citations | length'
  # Assert: 33
  
  # Verify no citation has empty author AND empty note
  cat citations.json | jq '[.citations[] | select(.citation == null and .note == null)] | length'
  # Assert: 0
  ```

  **Commit**: NO (intermediate deliverable)

---

- [ ] 3. Research + document Tier 1 (Beginner) — 11 strategies

  **What to do**:
  1. For each of the 11 Beginner strategies (IDs 1-11 from master list), create a full template following the validated schema from Task 1
  2. Each strategy MUST include:
     - `id`, `nameEn`, `nameKo`, `tier: "beginner"`
     - `description` (max 2 sentences)
     - `marketCondition` (trending/ranging/volatile/any)
     - `recommendedTimeframes`
     - `indicators` with `defaultParameters`
     - `entryRules` (long and/or short) using allowed operators
     - `exitRules` (longExit and/or shortExit) using allowed operators
     - `historicalPerformance` using citation from Task 2's registry
     - `newNodeTypesRequired` (empty array if none)
     - `tags`
  3. For entry/exit rules, express ALL conditions using ONLY: GREATER_THAN, LESS_THAN, CROSSES_ABOVE, CROSSES_BELOW, AND, OR
  4. If a strategy's logic CANNOT be fully expressed, document what's missing in `newNodeTypesRequired`

  **Must NOT do**:
  - Do not fabricate performance metrics (G1)
  - Do not use operators beyond the allowed set (G2)
  - Do not add educational content beyond 2 sentences (G7)
  - Do not add more than 11 strategies to this tier

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Structured documentation from research
  - **Skills**: []
    - Pure documentation task

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: No code
  - `data-scientist`: No data analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - Validated schema from Task 1 output
  - Citation registry from Task 2 output
  - Strategy Master List — Tier 1 rows (IDs 1-11)
  - Available Indicators table in this plan
  - Operator Vocabulary table in this plan

  **Strategy-Specific References**:
  - #1 RSI Mean Reversion: Wilder (1978) for RSI defaults, Chong et al. (2014) for performance
  - #2 SMA Crossover: Brock et al. (1992) for MA trading rules performance
  - #3 EMA Crossover: Similar to #2, faster response variant
  - #4 BB Mean Reversion: Bollinger (2001), Connors & Alvarez (2008), QuantStock (2023)
  - #5 MACD Signal Cross: Appel (2005) original, Chong et al. (2014) performance
  - #6 Stochastic OB/OS: Lane (1984) for stochastic oscillator original
  - #7 Supertrend: No known canonical academic study — mark accordingly
  - #8 PSAR Trend Flip: Wilder (1978) original
  - #9 CCI Zero-Cross: Lambert (1980) original
  - #10 Williams %R: Williams (1979) original
  - #11 VWAP Mean Reversion: Institutional practice — no single canonical study

  **Acceptance Criteria**:
  - [ ] 11 strategies in valid template format
  - [ ] All have Korean + English names
  - [ ] All have entry AND exit rules
  - [ ] All operators are from allowed set
  - [ ] All historicalPerformance fields follow the citation protocol
  - [ ] No fabricated metrics

  **Automated Verification**:
  ```bash
  cat tier1.json | jq '.strategies | length'
  # Assert: 11
  
  cat tier1.json | jq '[.strategies[] | select(.tier != "beginner")] | length'
  # Assert: 0
  
  cat tier1.json | jq '[.strategies[] | select(.nameKo == null)] | length'
  # Assert: 0
  ```

  **Commit**: NO (intermediate deliverable)

---

- [ ] 4. Research + document Tier 2 (Intermediate) — 11 strategies

  **What to do**:
  Identical process to Task 3, but for the 11 Intermediate strategies (IDs 12-22 from master list). Each strategy combines 2 indicators.

  Special attention for this tier:
  - Entry rules will typically use AND to combine two indicator conditions
  - Exit rules may use OR (exit when EITHER indicator signals)
  - Some strategies may need indicator-to-indicator comparison (flag as new node type)

  **Must NOT do**: Same guardrails as Task 3 (G1-G9)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Structured documentation from research
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - Same as Task 3

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - Validated schema from Task 1
  - Citation registry from Task 2
  - Strategy Master List — Tier 2 rows (IDs 12-22)
  - All indicator/operator tables from this plan

  **Strategy-Specific References**:
  - #12 RSI + BB Squeeze: Connors & Alvarez (2008) for BB %b + RSI combination
  - #13 MACD + RSI: Chong et al. (2014) for MACD+RSI on multiple markets
  - #14 Supertrend + Stochastic: No canonical study — widely used in crypto trading
  - #15 ADX + CCI: Wilder (1978) for ADX, Lambert (1980) for CCI
  - #16 VWAP + PSAR: Institutional intraday — no canonical study
  - #17 EMA + ADX: Wilder (1978) for ADX, standard EMA practice
  - #18 BB + MACD Divergence: May need DIVERGENCE operator — flag
  - #19 OBV + ADX: Granville (1963) for OBV original, Wilder (1978) for ADX
  - #20 ATR + Supertrend: Wilder (1978) for ATR
  - #21 MFI + BB: Quong & Soudack for MFI original, Bollinger (2001)
  - #22 Stochastic + Williams %R: Both momentum oscillators — no combined study

  **Acceptance Criteria**:
  - [ ] 11 strategies in valid template format
  - [ ] All have 2 indicators in `indicators` array
  - [ ] All entry rules use AND/OR to combine indicator conditions
  - [ ] All Korean + English names present
  - [ ] Citation protocol followed (no fabrication)

  **Automated Verification**:
  ```bash
  cat tier2.json | jq '.strategies | length'
  # Assert: 11
  
  cat tier2.json | jq '[.strategies[] | select(.indicators | length < 2)] | length'
  # Assert: 0
  ```

  **Commit**: NO (intermediate deliverable)

---

- [ ] 5. Research + document Tier 3 (Advanced) — 11 strategies

  **What to do**:
  Identical process to Task 3, but for the 11 Advanced strategies (IDs 23-33 from master list). Each strategy uses 3+ indicators or complex multi-condition logic.

  Special attention for this tier:
  - Entry rules will use nested AND/OR with 3+ conditions
  - Ichimoku (#23, #33) uses 5 sub-outputs — reference as `ichimoku_1.tenkan`, `ichimoku_1.kijun`, etc.
  - More strategies likely need new node types — document thoroughly
  - Exhaustion Reversal (#31) needs indicator-to-indicator comparison (candle range vs ATR) — flag

  **Must NOT do**: Same guardrails as Task 3 (G1-G9)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Most complex documentation requiring careful nested operator expression
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - Same as Task 3

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - Validated schema from Task 1
  - Citation registry from Task 2
  - Strategy Master List — Tier 3 rows (IDs 23-33)
  - All indicator/operator tables from this plan
  - Compound Rule Expression example from schema section

  **Strategy-Specific References**:
  - #23 Ichimoku: Hosoda (1969), treat as single indicator with 5 outputs
  - #24 Triple Screen: Elder (1993) — the original Triple Screen system
  - #25 VWAP+Supertrend+Stoch: No canonical study for this combination
  - #26 Volatility Squeeze: Bollinger (2001) for squeeze concept, Wilder (1978) for ADX/ATR
  - #27 Volume-Price Reversal: Granville (1963) for OBV, Lambert (1980) for CCI
  - #28 Parabolic Momentum: Wilder (1978) for PSAR, Lambert (1980) for CCI
  - #29 Institutional Pullback: No canonical study — institutional practice
  - #30 Lazy Trader: No canonical study — combination practice
  - #31 Exhaustion Reversal: Needs indicator-to-indicator comparison — FLAG
  - #32 Trend Confluence: Wilder (1978) for ADX/PSAR, Granville (1963) for OBV
  - #33 Ichimoku+MACD+BB: Complex system — no canonical study for combination

  **Acceptance Criteria**:
  - [ ] 11 strategies in valid template format
  - [ ] All have 3+ indicators in `indicators` array (or Ichimoku with complex multi-output logic)
  - [ ] Entry rules use nested AND/OR for 3+ conditions
  - [ ] `newNodeTypesRequired` populated where applicable
  - [ ] Citation protocol followed

  **Automated Verification**:
  ```bash
  cat tier3.json | jq '.strategies | length'
  # Assert: 11
  
  cat tier3.json | jq '[.strategies[] | select(.tier != "advanced")] | length'
  # Assert: 0
  ```

  **Commit**: NO (intermediate deliverable)

---

- [ ] 6. Compile "New Node Types Required" appendix

  **What to do**:
  1. Collect all `newNodeTypesRequired` entries from Tasks 3, 4, 5
  2. Deduplicate and categorize into:
     - **New Operators needed** (e.g., DIVERGENCE, BETWEEN, FOR_N_BARS, INDICATOR_COMPARE)
     - **New Indicators needed** (if any strategies reference indicators not in the available list)
  3. For each new node type, document:
     - Name and semantics
     - Which strategies require it
     - Priority (how many strategies are affected)
     - Suggested implementation approach (brief)
  4. Compile into a standalone appendix

  **Must NOT do**:
  - Do not implement any new node types
  - Do not propose code changes
  - Do not change any existing strategies to avoid needing new nodes (preserve accuracy)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Compilation/aggregation task, not research
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - All programming skills: No code to write

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3, 4, 5

  **References**:
  - Output from Tasks 3, 4, 5 (`newNodeTypesRequired` fields)
  - Feasibility Assessment section in this plan (pre-identified gaps)

  **Acceptance Criteria**:
  - [ ] All new node types from all 33 strategies collected
  - [ ] Each new node type has: name, semantics, affected strategies, priority
  - [ ] Categorized into operators vs indicators
  - [ ] No duplicates

  **Commit**: NO (intermediate deliverable)

---

- [ ] 7. Final validation pass + assemble complete catalog

  **What to do**:
  1. Merge all outputs from Tasks 1-6 into a single catalog document
  2. Run acceptance criteria AC1-AC11:
     - AC1: Each tier has >= 10 strategies, total >= 30 and <= 35
     - AC2: No quantitative performance claims without citations
     - AC3: All operators from allowed set {GREATER_THAN, LESS_THAN, CROSSES_ABOVE, CROSSES_BELOW, AND, OR}
     - AC4: All indicators from available list OR flagged in newNodeTypes
     - AC5: Every strategy has Korean AND English names
     - AC6: Every strategy has both entry AND exit rules (non-empty)
     - AC7: newNodeTypesRequired appendix exists
     - AC8: Every defaultParameters object is non-empty
     - AC9: No duplicate strategy names
     - AC10: marketCondition is valid enum value
     - AC11: Every citation has author(s), year, and source title
  3. Fix any validation failures
  4. Write final summary with counts and statistics

  **Must NOT do**:
  - Do not add new strategies (total capped at 33)
  - Do not fabricate data to pass validation
  - Do not change the schema

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Validation and assembly task
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - All programming skills: No code

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final task)
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:
  - All outputs from Tasks 1-6
  - Acceptance Criteria list in this section
  - Guardrails G1-G9

  **Acceptance Criteria**:
  - [ ] AC1-AC11 all pass
  - [ ] Single unified catalog document produced
  - [ ] Summary statistics: total strategies, per-tier count, strategies with citations vs without, strategies needing new nodes
  - [ ] Zero fabricated metrics

  **Automated Verification**:
  ```bash
  # Comprehensive validation
  cat catalog.json | jq '.strategies | length'
  # Assert: 33
  
  cat catalog.json | jq '[.strategies[] | .tier] | group_by(.) | map({tier: .[0], count: length})'
  # Assert: Each tier has 11
  
  cat catalog.json | jq '[.strategies[] | select(.nameKo == null or .nameEn == null)] | length'
  # Assert: 0
  
  cat catalog.json | jq '.newNodeTypesRequired | length >= 0'
  # Assert: true (field exists)
  ```

  **Commit**: YES
  - Message: `docs(strategy): add 33 verified trading strategy templates catalog`
  - Files: `catalog.json`, `catalog.md`, `new-node-types.md`
  - Pre-commit: JSON validation

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 7 (final) | `docs(strategy): add 33 verified trading strategy templates catalog` | Strategy catalog (JSON + MD), New Node Types appendix | AC1-AC11 all pass |

No intermediate commits — this is a documentation compilation task. Single final commit after validation.

---

## Success Criteria

### Final Checklist
- [ ] 33 strategies documented (11 per tier)
- [ ] Every strategy has Korean + English names
- [ ] Every strategy has entry AND exit rules using only allowed operators
- [ ] Every strategy has default parameter values for all indicators
- [ ] Zero fabricated performance metrics
- [ ] Every quantitative claim has full bibliographic citation
- [ ] Strategies needing new nodes are flagged and listed in appendix
- [ ] Template schema is validated with 5 diverse samples
- [ ] New Node Types appendix is complete with priorities
- [ ] All guardrails G1-G9 respected
- [ ] AC1-AC11 acceptance criteria pass
