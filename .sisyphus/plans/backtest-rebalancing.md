# Backtest Rebalancing Config + Logic

## TL;DR

> **Quick Summary**: Add rebalancing configuration fields to `BacktestConfig`, insert calendar-based rebalancing logic (sell overweight / buy underweight with 2% threshold) into `runMultiStockBacktest`'s main day-loop, and pass the new config values from the API route.
>
> **Deliverables**:
> - 3 new optional fields on `BacktestConfig` interface
> - Calendar-based rebalancing logic block in `runMultiStockBacktest` main loop (after strategy, before equity calc)
> - 3 new properties in the API route `backtestConfig` object
>
> **Estimated Effort**: Quick (2 files, ~140 lines of additions)
> **Parallel Execution**: NO — sequential (ordered edits across 2 files, then verify)
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request

Add rebalancing support to the multi-stock backtest engine:
1. Extend `BacktestConfig` with rebalancing fields after `externalCandlesRecord`.
2. Insert the user-provided rebalancing logic block into `runMultiStockBacktest` after the `hasStrategyLogic` block, before equity calculation.
3. Pass the new config values from the API route `backtestConfig` object.

### Baseline File State (Verified via Read)

**`backtest-engine.ts`** (`apps/web/lib/strategy/backtest-engine.ts`):
- `BacktestConfig` interface (lines 24–47). Last field is `externalCandlesRecord` (line 46), closing `}` at line 47.
- `runMultiStockBacktest` main loop (line 1337 onward). Strategy logic block:
  - `if (hasStrategyLogic) {` at line 1344
  - Inner `for (const sym of symbols)` loop: lines 1346–1441
  - Closing `}` of `for` at line 1441, closing `}` of `if (hasStrategyLogic)` at line 1442
  - Blank line 1443
  - `// 종합 자산 평가 (현금 + 모든 종목 포지션)` at line 1444
- No rebalancing fields or logic exist in baseline.

**`route.ts`** (`apps/web/app/api/backtest/route.ts`):
- `backtestConfig` object (lines 160–168). Last field is `symbols` (line 167), closing `};` at line 168.
- No rebalancing fields exist in baseline.

**`workflow.ts`** (`packages/shared/src/types/workflow.ts`):
- `ModuleSettings.rebalancing: boolean` (line 81) — UI toggle; defaults `false` (line 207). Orthogonal to engine config; NOT touched.

### Constraints (NON-NEGOTIABLE)

| Constraint | Rationale |
|-----------|-----------|
| **NO optional chaining (`?.`)** | Project-wide ban; use `&&` guards and `\|\|` fallbacks |
| **Preserve existing formatting** | Indentation, comment style, spacing must match surrounding code |
| **Minimal edits only** | Insert new code at precise locations; do NOT rewrite surrounding code |
| **`backtestConfig` stays `const`** | Only property assignment, never reassignment |
| **Do NOT modify** `validateRequest`, outer `catch`, `runBacktest` signature, or equity calc block | Guardrails from prior plans |

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Calendar-based schedule, NOT fixed-day-count** | `weekly` = Monday (getDay()===1), `monthly` = month change, `quarterly` = month change + Jan/Apr/Jul/Oct |
| **Sell overweight then buy underweight, NOT sell-all** | Minimizes unnecessary trades and transaction costs; only adjusts positions that deviate >2% from target |
| **2% threshold** | Prevents rebalancing on trivial deviations; uses `totalPortfolioValue * 0.02` |
| **Trades marked `(리밸런싱)`** | Distinguishes rebalancing trades from strategy trades in output |
| **Average entry price update on partial buy** | When buying into existing position, computes weighted average entry price |

---

## Work Objectives

### Core Objective

Enable periodic calendar-based portfolio rebalancing in multi-stock backtests that selectively sells overweight and buys underweight positions using a 2% deviation threshold.

### Concrete Deliverables

1. `BacktestConfig` gains 3 optional fields: `rebalancingEnabled`, `rebalancingPeriod`, `timeframe`
2. `runMultiStockBacktest` gains a ~130-line rebalancing block between strategy logic and equity calc
3. API route `backtestConfig` passes 3 new values from request body

### Definition of Done

- [ ] `lsp_diagnostics` on `backtest-engine.ts` → zero errors
- [ ] `lsp_diagnostics` on `route.ts` → zero errors
- [ ] `npx tsc --noEmit` in `apps/web` → exit 0
- [ ] No `?.` in either modified file
- [ ] `backtestConfig` remains `const` in route.ts
- [ ] Existing code around insertion points is byte-identical to baseline

### Must NOT Have (Guardrails)

- **NO optional chaining (`?.`)** in either file
- **NO sell-all approach** — only sell overweight, buy underweight
- **NO fixed trading-day intervals** (dayIdx % N) — use calendar dates
- **NO modification** to `validateRequest` function
- **NO modification** to outer `catch` block in POST handler
- **NO modification** to the equity calculation block (starts at `// 종합 자산 평가`)
- **NO modification** to `runBacktest` export function signature
- **NO reassignment** of `backtestConfig` (only property assignment)
- **NO new imports** needed (all types are in-file)

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: NO (no test files for backtest engine)
- **User wants tests**: NO (not requested)
- **QA approach**: LSP diagnostics + TypeScript compiler check

### Automated Verification Procedures

After EACH task, run:
```bash
# Use lsp_diagnostics tool on both files
# 1. backtest-engine.ts → zero errors
# 2. route.ts → zero errors
```

After ALL tasks:
```bash
# Full project type check
cd /opt/coffeetree/apps/web && npx tsc --noEmit
# Assert: Exit code 0

# No optional chaining in either file
grep -c '?\.' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
# Assert: "0"
grep -c '?\.' /opt/coffeetree/apps/web/app/api/backtest/route.ts
# Assert: "0"
```

---

## Execution Strategy

### Sequential Execution

```
Task 1: Add 3 fields to BacktestConfig interface
   ↓
Task 2: Insert rebalancing logic block in runMultiStockBacktest
   ↓
Task 3: Add 3 config values in API route backtestConfig
   ↓
Task 4: Full verification suite
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|-----------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4 | None |
| 3 | 1 | 4 | 2 (but same-file risk with task 1 resolved) |
| 4 | 1, 2, 3 | None (terminal) | None |

---

## TODOs

- [ ] 1. Add rebalancing fields to `BacktestConfig` interface

  **What to do**:
  - In `backtest-engine.ts`, inside the `BacktestConfig` interface, insert 3 new optional fields AFTER the `externalCandlesRecord` field (line 46) and BEFORE the closing `}` (line 47).
  - The new fields must match the existing JSDoc comment style (Korean `/** ... */`).

  **Exact code to insert** (between line 46 and current line 47 `}`):
  ```typescript
    /** 리밸런싱 활성화 여부 */
    rebalancingEnabled?: boolean;
    /** 리밸런싱 주기 ('weekly' | 'monthly' | 'quarterly') */
    rebalancingPeriod?: 'weekly' | 'monthly' | 'quarterly';
    /** 캔들 타임프레임 ('1d' | '1w' | '1M') */
    timeframe?: string;
  ```

  **Insertion point** (use Edit tool):
  - `oldString`:
    ```
      /** 다중 종목: 종목별 외부 캔들 데이터 (JSON 직렬화 가능) */
      externalCandlesRecord?: Record<string, CandleData[]>;
    }
    ```
  - `newString`:
    ```
      /** 다중 종목: 종목별 외부 캔들 데이터 (JSON 직렬화 가능) */
      externalCandlesRecord?: Record<string, CandleData[]>;
      /** 리밸런싱 활성화 여부 */
      rebalancingEnabled?: boolean;
      /** 리밸런싱 주기 ('weekly' | 'monthly' | 'quarterly') */
      rebalancingPeriod?: 'weekly' | 'monthly' | 'quarterly';
      /** 캔들 타임프레임 ('1d' | '1w' | '1M') */
      timeframe?: string;
    }
    ```

  **Must NOT do**:
  - Do NOT reorder or modify existing fields
  - Do NOT change the interface name or export
  - Do NOT use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - No special skills needed for a simple interface extension.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/web/lib/strategy/backtest-engine.ts:24-47` — Current `BacktestConfig` interface. New fields go after line 46 (`externalCandlesRecord`), before closing `}`. Follow the existing `/** Korean comment */` + `fieldName?: Type;` pattern with 2-space indent.

  **Type References**:
  - `packages/shared/src/types/workflow.ts:81` — `rebalancing: boolean` in `ModuleSettings`. This is the UI toggle; the engine config uses `rebalancingEnabled` (boolean) + `rebalancingPeriod` (union type) for richer semantics.

  **Acceptance Criteria**:
  ```bash
  grep 'rebalancingEnabled' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: match (field definition)
  grep 'rebalancingPeriod' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: match (field definition with union type)
  grep "timeframe" /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=1 match (new field)
  # Agent runs lsp_diagnostics on backtest-engine.ts → Zero errors
  ```

  **Commit**: NO (group with Task 3)

---

- [ ] 2. Insert rebalancing logic block in `runMultiStockBacktest` main loop

  **What to do**:
  - In `backtest-engine.ts`, inside the `runMultiStockBacktest` function's main day-loop, insert the rebalancing logic block.
  - **Insertion point**: AFTER the `if (hasStrategyLogic)` block closing `}` (line 1448) and BEFORE the equity calculation comment (line 1450: `// 종합 자산 평가`).
  - Currently there is a blank line between these two blocks.

  **Rebalancing schedule** (calendar-based, NOT fixed-day-count):
  - `weekly`: Monday — `currentDate.getDay() === 1`
  - `monthly`: first trading day of new month — `currentDate.getMonth() !== prevDate.getMonth()`
  - `quarterly`: first trading day of Jan/Apr/Jul/Oct — month change AND `[0, 3, 6, 9].includes(currentDate.getMonth())`

  **Rebalancing strategy** (threshold-based partial adjustment, NOT sell-all):
  - Step 1: Calculate `totalPortfolioValue` (cash + all holdings at current close)
  - Step 2: Sell overweight — for each stock, if `currentValue - targetValue > totalPortfolioValue * 0.02`, sell the excess quantity
  - Step 3: Buy underweight — for each stock, if `targetValue - currentValue > totalPortfolioValue * 0.02`, buy the deficit quantity
  - All trades marked with `(리밸런싱)` suffix in symbol name
  - Average entry price updated on partial buy into existing position

  **Exact code to insert**:
  ```typescript

      // 리밸런싱 실행
      if (config.rebalancingEnabled && hasStrategyLogic && dayIdx > 0) {
        const currentDate = new Date(dateStr);
        const prevDate = new Date(allDates[dayIdx - 1]);
        let isRebalanceDay = false;

        switch (config.rebalancingPeriod) {
          case 'weekly':
            // 매주 월요일
            isRebalanceDay = currentDate.getDay() === 1;
            break;
          case 'monthly':
            // 매월 첫 거래일
            isRebalanceDay = currentDate.getMonth() !== prevDate.getMonth();
            break;
          case 'quarterly':
            // 분기 첫 거래일 (1,4,7,10월)
            isRebalanceDay = currentDate.getMonth() !== prevDate.getMonth() &&
              [0, 3, 6, 9].includes(currentDate.getMonth());
            break;
        }

        if (isRebalanceDay) {
          // 현재 포트폴리오 총 가치 계산
          let totalPortfolioValue = cashBalance;
          for (const sym of symbols) {
            const pos = positions.get(sym.code);
            if (pos && pos.quantity > 0) {
              const candleDateMap = stockCandleByDate.get(sym.code);
              if (candleDateMap) {
                const todayCandle = candleDateMap.get(dateStr);
                if (todayCandle) {
                  totalPortfolioValue += pos.quantity * todayCandle.close;
                }
              }
            }
          }

          // 1단계: 초과 비중 종목 매도 (현금 확보)
          for (const sym of symbols) {
            const pos = positions.get(sym.code);
            if (!pos) continue;

            const candleDateMap = stockCandleByDate.get(sym.code);
            if (!candleDateMap) continue;
            const todayCandle = candleDateMap.get(dateStr);
            if (!todayCandle) continue;

            const currentValue = pos.quantity * todayCandle.close;
            const targetValue = totalPortfolioValue * (sym.positionSize / 100);
            const diff = currentValue - targetValue;

            // 초과 비중이면 매도 (임계값: 총 포트폴리오의 2% 이상 차이)
            if (diff > totalPortfolioValue * 0.02 && pos.quantity > 0) {
              const sellQuantity = Math.floor(diff / todayCandle.close);
              if (sellQuantity > 0) {
                const actualSellQty = Math.min(sellQuantity, pos.quantity);
                const sellPrice = todayCandle.close * (1 - config.slippage);
                const revenue = sellPrice * actualSellQty;
                const commissionCost = revenue * config.commission;
                const pnl = (sellPrice - pos.entryPrice) * actualSellQty - commissionCost;
                cashBalance += (revenue - commissionCost);

                trades.push({
                  date: dateStr,
                  type: 'SELL',
                  price: Math.round(sellPrice),
                  quantity: actualSellQty,
                  commission: Math.round(commissionCost),
                  pnl: Math.round(pnl),
                  balance: Math.round(cashBalance),
                  symbol: `${sym.name} (리밸런싱)`,
                });

                pos.quantity -= actualSellQty;
                if (pos.quantity === 0) {
                  pos.entryPrice = 0;
                }
              }
            }
          }

          // 2단계: 미달 비중 종목 매수
          for (const sym of symbols) {
            const pos = positions.get(sym.code);
            if (!pos) continue;

            const candleDateMap = stockCandleByDate.get(sym.code);
            if (!candleDateMap) continue;
            const todayCandle = candleDateMap.get(dateStr);
            if (!todayCandle) continue;

            const currentValue = pos.quantity * todayCandle.close;
            const targetValue = totalPortfolioValue * (sym.positionSize / 100);
            const diff = targetValue - currentValue;

            // 미달 비중이면 매수 (임계값: 총 포트폴리오의 2% 이상 차이)
            if (diff > totalPortfolioValue * 0.02 && cashBalance > 0) {
              const buyPrice = todayCandle.close * (1 + config.slippage);
              const buyQuantity = Math.floor(Math.min(diff, cashBalance) / (buyPrice * (1 + config.commission)));
              if (buyQuantity > 0) {
                const cost = buyPrice * buyQuantity;
                const commissionCost = cost * config.commission;
                cashBalance -= (cost + commissionCost);

                // 기존 포지션이 있으면 평균 진입가 업데이트
                if (pos.quantity > 0) {
                  const totalCost = pos.entryPrice * pos.quantity + buyPrice * buyQuantity;
                  pos.entryPrice = totalCost / (pos.quantity + buyQuantity);
                } else {
                  pos.entryPrice = buyPrice;
                }
                pos.quantity += buyQuantity;

                trades.push({
                  date: dateStr,
                  type: 'BUY',
                  price: Math.round(buyPrice),
                  quantity: buyQuantity,
                  commission: Math.round(commissionCost),
                  pnl: 0,
                  balance: Math.round(cashBalance),
                  symbol: `${sym.name} (리밸런싱)`,
                });
              }
            }
          }
        }
      }
  ```

  **Insertion point** (use Edit tool):
  - `oldString` (unique context spanning the gap between strategy block and equity calc):
    ```
        }
      }

      // 종합 자산 평가 (현금 + 모든 종목 포지션)
    ```
    NOTE: The first `}` closes the `for (const sym of symbols)` loop inside `hasStrategyLogic`. The second `}` closes the `if (hasStrategyLogic)` block. Blank line follows. Then the equity comment.

  - `newString`: Same opening lines + rebalancing block + same closing comment:
    ```
        }
      }

      // 리밸런싱 실행
      if (config.rebalancingEnabled && hasStrategyLogic && dayIdx > 0) {
        ... [full block as above] ...
      }

      // 종합 자산 평가 (현금 + 모든 종목 포지션)
    ```

  **Must NOT do**:
  - Do NOT use optional chaining (`?.`)
  - Do NOT use sell-all approach (only sell overweight, buy underweight)
  - Do NOT use fixed-day-count intervals (dayIdx % N); use calendar dates
  - Do NOT modify the strategy logic block above
  - Do NOT modify the equity calculation block below
  - Do NOT change indentation (4-space indent for top-level block body, matching surrounding code)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Code insertion at a known location with provided exact block.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 4
  - **Blocked By**: Task 1 (needs new fields on `BacktestConfig` to type-check)

  **References**:

  **Pattern References**:
  - `apps/web/lib/strategy/backtest-engine.ts:1371-1441` — Buy/sell execution pattern in strategy logic. The rebalancing block follows the same pattern for `positions.get()`, `stockCandleByDate.get()`, `trades.push()`, slippage/commission math. Key difference: rebalancing uses partial sell (overweight) and partial buy (underweight) instead of full position changes.
  - `apps/web/lib/strategy/backtest-engine.ts:1310-1324` — `StockPosition` interface and `positions` Map initialization. Rebalancing block reads/writes `pos.quantity`, `pos.entryPrice`, `pos.allocatedRatio`.
  - `apps/web/lib/strategy/backtest-engine.ts:1326-1330` — `cashBalance`, `trades`, `equity` variables. Rebalancing block mutates `cashBalance` and pushes to `trades`.
  - `apps/web/lib/strategy/backtest-engine.ts:1292` — `allDates` array, used for `allDates[dayIdx - 1]` to get previous date.

  **API/Type References**:
  - `apps/web/lib/strategy/backtest-engine.ts:24-53` (after Task 1) — `BacktestConfig.rebalancingEnabled`, `.rebalancingPeriod`. The block reads `config.rebalancingEnabled` and `config.rebalancingPeriod`, guards with `hasStrategyLogic && dayIdx > 0`.

  **WHY Each Reference Matters**:
  - Strategy logic pattern: Executor must follow identical slippage/commission math and `trades.push()` shape, but with `(리밸런싱)` suffix and partial quantity logic.
  - `StockPosition`: Rebalancing modifies `pos.quantity` incrementally (not reset-to-zero) and updates `pos.entryPrice` via weighted average.
  - `allDates`: Previous date comparison (`allDates[dayIdx - 1]`) determines calendar-based schedule; `dayIdx > 0` guard prevents out-of-bounds.

  **Acceptance Criteria**:
  ```bash
  grep -c 'rebalancingEnabled' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=2 (interface field + usage in loop)
  grep -c '리밸런싱 실행' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: "1"
  grep -c 'isRebalanceDay' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=5 (declaration + 3 case assignments + if usage)
  grep -c 'totalPortfolioValue' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=4 (declaration + accumulation + 2x threshold checks)
  grep '리밸런싱' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: matches include '(리밸런싱)' in trade symbols
  grep 'getDay() === 1' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: match (weekly = Monday)
  grep 'getMonth()' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=3 matches (monthly + quarterly date comparisons)
  grep -c '?\.' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: "0"
  # Agent runs lsp_diagnostics on backtest-engine.ts → Zero errors
  ```

  **Commit**: NO (group with Task 3)

---

- [ ] 3. Add rebalancing config values to API route `backtestConfig` object

  **What to do**:
  - In `route.ts`, inside the `backtestConfig` object literal (lines 160–168), add 3 new properties AFTER the `symbols` line (line 167) and BEFORE the closing `};` (line 168).

  **Exact code to insert**:
  ```typescript
        rebalancingEnabled: !!config.rebalancingEnabled,
        rebalancingPeriod: config.rebalancingPeriod as BacktestConfig['rebalancingPeriod'],
        timeframe: config.timeframe as string,
  ```

  **Insertion point** (use Edit tool):
  - `oldString`:
    ```
          symbols: Array.isArray(config.symbols) ? config.symbols as BacktestConfig['symbols'] : undefined,
        };
    ```
  - `newString`:
    ```
          symbols: Array.isArray(config.symbols) ? config.symbols as BacktestConfig['symbols'] : undefined,
          rebalancingEnabled: !!config.rebalancingEnabled,
          rebalancingPeriod: config.rebalancingPeriod as BacktestConfig['rebalancingPeriod'],
          timeframe: config.timeframe as string,
        };
    ```

  **Must NOT do**:
  - Do NOT use optional chaining (`?.`)
  - Do NOT reassign `backtestConfig` (`const` must stay)
  - Do NOT modify other properties in the object
  - Do NOT modify `validateRequest`, outer catch, or OHLCV fetch blocks

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: Commit after this task groups Tasks 1–3.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 4
  - **Blocked By**: Task 1 (needs new fields on `BacktestConfig` to type-check)

  **References**:

  **Pattern References**:
  - `apps/web/app/api/backtest/route.ts:160-168` — Current `backtestConfig` object. New properties go after `symbols` (line 167), before `};` (line 168). Follow existing pattern: 6-space indent, `key: value,` format.

  **API/Type References**:
  - `apps/web/lib/strategy/backtest-engine.ts:24-53` (after Task 1) — `BacktestConfig` with new fields. The `as BacktestConfig['rebalancingPeriod']` cast ensures type safety for the union type. `!!config.rebalancingEnabled` coerces truthy/falsy to boolean. `config.timeframe as string` passes through raw.

  **Acceptance Criteria**:
  ```bash
  grep 'rebalancingEnabled' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match
  grep 'rebalancingPeriod' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match
  grep 'timeframe' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match
  grep 'const backtestConfig' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match (still const)
  grep -c '?\.' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: "0"
  # Agent runs lsp_diagnostics on route.ts → Zero errors
  ```

  **Commit**: YES
  - Message: `feat(backtest): add calendar-based rebalancing config and threshold logic`
  - Files: `apps/web/lib/strategy/backtest-engine.ts`, `apps/web/app/api/backtest/route.ts`
  - Pre-commit: `cd /opt/coffeetree/apps/web && npx tsc --noEmit`

---

- [ ] 4. Full verification suite

  **What to do**: Run ALL verification checks to confirm every constraint is satisfied.

  **Verification commands (agent executes all)**:
  ```bash
  # 1. TypeScript project type check
  cd /opt/coffeetree/apps/web && npx tsc --noEmit
  # Assert: Exit code 0

  # 2. No optional chaining in backtest-engine.ts
  grep -c '?\.' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: "0"

  # 3. No optional chaining in route.ts
  grep -c '?\.' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: "0"

  # 4. BacktestConfig has new fields
  grep 'rebalancingEnabled' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=2 matches (interface field + loop usage)
  grep 'rebalancingPeriod' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=2 matches (interface field + loop usage)
  grep 'timeframe' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=1 match

  # 5. Calendar-based rebalancing logic present (NOT fixed-day-count)
  grep 'isRebalanceDay' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=5 matches
  grep 'getDay() === 1' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: match (weekly = Monday)
  grep 'getMonth()' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=3 matches (monthly + quarterly)
  grep '\[0, 3, 6, 9\]' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: match (quarterly months)

  # 6. Threshold-based partial adjustment (NOT sell-all)
  grep 'totalPortfolioValue \* 0.02' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=2 matches (sell threshold + buy threshold)
  grep '초과 비중' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: match (step 1 comment)
  grep '미달 비중' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: match (step 2 comment)

  # 7. Trades marked with (리밸런싱)
  grep '리밸런싱' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=2 matches (SELL symbol + BUY symbol)

  # 8. API route has new config values
  grep 'rebalancingEnabled' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match
  grep 'rebalancingPeriod' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match

  # 9. backtestConfig still const
  grep 'const backtestConfig: BacktestConfig' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match

  # 10. Preserved blocks unchanged
  grep 'function validateRequest(body: unknown): string | null' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match
  grep '종합 자산 평가' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: match
  grep 'hasStrategyLogic' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: >=2 matches (declaration + if usage)

  # 11. Negative checks — must NOT have sell-all or fixed intervals
  grep 'shouldRebalance' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: "0" matches (old plan variable name NOT present)
  grep 'dayIdx % 5' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: "0" matches (fixed-day-count NOT present)
  grep 'dayIdx % 21' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: "0" matches (fixed-day-count NOT present)
  grep 'dayIdx % 63' /opt/coffeetree/apps/web/lib/strategy/backtest-engine.ts
  # Assert: "0" matches (fixed-day-count NOT present)
  ```

  **Must NOT do**: Do NOT modify any files. Do NOT skip any check.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None (terminal)
  - **Blocked By**: Tasks 1, 2, 3

  **Acceptance Criteria**: ALL 11 check groups pass. Zero TypeScript errors. Zero LSP errors.

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|-----------|---------|-------|-------------|
| 3 (covers 1–3) | `feat(backtest): add calendar-based rebalancing config and threshold logic` | `apps/web/lib/strategy/backtest-engine.ts`, `apps/web/app/api/backtest/route.ts` | `npx tsc --noEmit` + Task 4 full suite |

---

## File Touch List

| File | Tasks | Change Type |
|------|-------|-------------|
| `apps/web/lib/strategy/backtest-engine.ts` | 1, 2 | Add 3 fields to `BacktestConfig` (Task 1); Insert ~130-line calendar-based rebalancing block in main loop (Task 2) |
| `apps/web/app/api/backtest/route.ts` | 3 | Add 3 lines to `backtestConfig` object (Task 3) |

**Files NOT touched** (guardrails):
- `packages/shared/src/types/workflow.ts` — `ModuleSettings.rebalancing` is unchanged; it's the UI toggle, orthogonal to engine config.

---

## Success Criteria

### Final Checklist
- [ ] `BacktestConfig` has `rebalancingEnabled?: boolean`, `rebalancingPeriod?: 'weekly' | 'monthly' | 'quarterly'`, `timeframe?: string`
- [ ] Rebalancing block in `runMultiStockBacktest` between strategy and equity blocks
- [ ] Schedule is calendar-based: weekly=Monday, monthly=month change, quarterly=month change + Jan/Apr/Jul/Oct
- [ ] Threshold-based partial adjustment: sell overweight >2%, buy underweight >2%
- [ ] NO sell-all approach; NO fixed trading-day intervals (dayIdx % N)
- [ ] Trades marked with `(리밸런싱)` suffix in symbol field
- [ ] Average entry price updated on partial buy into existing position
- [ ] API route passes `rebalancingEnabled`, `rebalancingPeriod`, `timeframe` from request
- [ ] Zero optional chaining in either file
- [ ] `backtestConfig` remains `const`
- [ ] `npx tsc --noEmit` passes
- [ ] LSP diagnostics: zero errors on both files
