# Backtest API Route: Add OHLCV Fetch from Python Bridge

## TL;DR

> **Quick Summary**: Update the Next.js backtest API route to fetch real OHLCV market data from the Python Bridge service *before* calling `runBacktest`, falling back gracefully to simulated data on failure.
>
> **Deliverables**:
> - `CandleData` type import added
> - `fetchOHLCVFromBridge` helper function added
> - OHLCV fetch block inserted between `backtestConfig` construction and `runBacktest` call
> - `backtestConfig` enriched with `externalCandles` / `externalCandlesRecord` properties
>
> **Estimated Effort**: Quick (single file, ~80 lines of additions)
> **Parallel Execution**: NO - sequential (single file, 4 ordered edits)
> **Critical Path**: Task 1 > Task 2 > Task 3 > Task 4

---

## Context

### Original Request

Update `/opt/coffeetree/apps/web/app/api/backtest/route.ts` to fetch OHLCV candle data from the Python Bridge HTTP service before calling `runBacktest`. The user provided exact helper function code and fetch logic to insert.

### Baseline File State (User-Verified)

The file currently:
- **Imports**: `NextRequest`, `NextResponse`, `runBacktest`, `BacktestConfig`, `SerializedWorkflow`, `BacktestResult` — **NO `CandleData`**
- **Has**: `BacktestRequestBody` interface, `validateRequest` function, `POST` handler
- **POST handler flow**: parse body > validate > build `backtestConfig` (const) > call `runBacktest(workflow, backtestConfig)` > return JSON
- **Does NOT have**: `fetchOHLCVFromBridge` helper, any OHLCV fetch block, any `externalCandles` property assignment

### Research Findings

| Finding | Source | Implication |
|---------|--------|-------------|
| `CandleData` exported from `backtest-engine.ts:52` | grep | Import is valid; type has `date`, `open`, `high`, `low`, `close`, `volume` |
| `BacktestConfig` has `externalCandles?: CandleData[]` and `externalCandlesRecord?: Record<string, CandleData[]>` | `backtest-engine.ts:43-46` | These optional properties exist on the type so assigning them to `const backtestConfig` is type-safe |
| `PYTHON_BRIDGE_URL` env var pattern used in 6 files | market.ts, trading.ts, risk.ts, strategy.ts, backtest.ts | Established codebase convention: `process.env.PYTHON_BRIDGE_URL \|\| 'http://localhost:8000'` |
| OHLCV endpoint URL pattern | `market.ts:200-201` | `GET /api/market/ohlcv/{symbol}?timeframe=&start_date=&end_date=&limit=` |
| Bridge error handling convention | codebase-wide | `console.warn` + graceful fallback, never throw |

### Metis Review (Self-Applied)

| Gap | Resolution |
|-----|------------|
| No test infrastructure in file | Manual verification via LSP diagnostics + build check (user did not request tests) |
| `backtestConfig` is `const` but we mutate properties | TypeScript allows property assignment on `const` object references |
| No optional chaining constraint | All code uses explicit `if` checks and `&&` guards, never `?.` |
| Multi-symbol vs single-symbol branching | Handled via `symbols && symbols.length > 1` for multi, else single-symbol path |

---

## Work Objectives

### Core Objective

Enable the backtest API route to fetch real OHLCV market data from the Python Bridge before running the backtest engine, so backtests use actual price history instead of simulated data.

### Concrete Deliverables

1. `type CandleData` added to the import block from `@/lib/strategy/backtest-engine`
2. `fetchOHLCVFromBridge` async helper function defined after the `BacktestRequestBody` interface
3. OHLCV fetch block inserted inside `POST` handler between `backtestConfig` construction and `runBacktest` call
4. `backtestConfig.externalCandles` or `backtestConfig.externalCandlesRecord` assigned when fetch succeeds

### Definition of Done

- [ ] `npx tsc --noEmit` passes with zero errors on the project
- [ ] LSP diagnostics for `route.ts` returns zero errors
- [ ] No `?.` (optional chaining) anywhere in the file
- [ ] `validateRequest` function is byte-identical to baseline
- [ ] `backtestConfig` is still declared with `const`
- [ ] Outer try/catch error handler in POST is unchanged
- [ ] `fetchOHLCVFromBridge` returns `CandleData[]` (never throws to caller)

### Must Have

- `CandleData` type import
- Helper function with JSDoc
- Graceful fallback: fetch failure then `console.warn` then continue with simulated data
- Multi-symbol parallel fetch via `Promise.all`
- Single-symbol fetch for non-`SIMULATED` symbols
- Inner `try/catch` around the entire fetch block

### Must NOT Have (Guardrails)

- **NO optional chaining (`?.`)** anywhere in the file
- **NO modification** to `validateRequest` function
- **NO modification** to the outer `catch` block in POST handler
- **NO reassignment** of `backtestConfig` (`const` must stay)
- **NO new dependencies** — only `fetch` (global) and existing imports
- **NO `throw`** inside `fetchOHLCVFromBridge` — return empty array on failure

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: NO (no test file for this route)
- **User wants tests**: NO (not requested)
- **QA approach**: Automated verification via TypeScript compiler + LSP diagnostics

### Automated Verification Procedures

After EACH task, run:
```bash
# 1. LSP diagnostics (zero errors expected)
# Use lsp_diagnostics tool on: /opt/coffeetree/apps/web/app/api/backtest/route.ts

# 2. Full project type check
cd /opt/coffeetree/apps/web && npx tsc --noEmit
```

After ALL tasks, run constraint checks:
```bash
# 3. No optional chaining
grep -c '?\.' /opt/coffeetree/apps/web/app/api/backtest/route.ts
# Expected: 0

# 4. backtestConfig is const
grep 'const backtestConfig' /opt/coffeetree/apps/web/app/api/backtest/route.ts
# Expected: exactly 1 match

# 5. CandleData in imports
grep 'CandleData' /opt/coffeetree/apps/web/app/api/backtest/route.ts
# Expected: >=2 matches (import + usage)

# 6. fetchOHLCVFromBridge defined
grep 'async function fetchOHLCVFromBridge' /opt/coffeetree/apps/web/app/api/backtest/route.ts
# Expected: exactly 1 match

# 7. externalCandles assigned
grep 'externalCandles' /opt/coffeetree/apps/web/app/api/backtest/route.ts
# Expected: >=1 match
```

---

## Execution Strategy

### Sequential Execution (Single File)

```
Task 1: Add CandleData import
   |
Task 2: Add fetchOHLCVFromBridge helper function
   |
Task 3: Add OHLCV fetch block in POST handler
   |
Task 4: Run full verification suite
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 3 | None |
| 3 | 1, 2 | 4 | None |
| 4 | 1, 2, 3 | None (final) | None |

---

## TODOs

- [ ] 1. Add `CandleData` to the import statement

  **What to do**:
  - In the import block from `@/lib/strategy/backtest-engine` (currently importing `runBacktest`, `BacktestConfig`, `SerializedWorkflow`, `BacktestResult`), add `type CandleData` to the named imports.
  - The import should become:
    ```typescript
    import {
      runBacktest,
      type BacktestConfig,
      type SerializedWorkflow,
      type BacktestResult,
      type CandleData,
    } from '@/lib/strategy/backtest-engine';
    ```

  **Must NOT do**:
  - Do NOT reorder existing imports
  - Do NOT change the module path
  - Do NOT remove any existing import

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:
  - `apps/web/app/api/backtest/route.ts:13-20` — Current import block (add `CandleData` here)
  - `apps/web/lib/strategy/backtest-engine.ts:52-65` — `CandleData` interface definition (confirms export exists with fields: `date`, `open`, `high`, `low`, `close`, `volume`)

  **Acceptance Criteria**:
  ```bash
  grep 'type CandleData' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: Output contains "type CandleData"
  # Agent runs lsp_diagnostics on route.ts -> Zero errors
  ```

  **Commit**: NO (group with Task 3)

---

- [ ] 2. Add `fetchOHLCVFromBridge` helper function

  **What to do**:
  - Insert the function AFTER the `BacktestRequestBody` interface block and BEFORE the `validateRequest` function.
  - The function must be `async`, return `Promise<CandleData[]>`, accept `symbol`, `startDate`, `endDate`, `timeframe = '1d'`
  - Use `process.env.PYTHON_BRIDGE_URL || 'http://localhost:8000'` (codebase convention)
  - Build `URLSearchParams` with `timeframe`, `start_date`, `end_date`, `limit: '10000'`
  - `GET ${bridgeUrl}/api/market/ohlcv/${symbol}?${params.toString()}`
  - On non-ok response: `console.warn(...)` and return `[]`
  - Parse JSON: `result.data || result || []`; if not array return `[]`
  - Map each bar to `CandleData` shape using `Number()` coercion and `String()` for date
  - Include full JSDoc comment block
  - **CRITICAL**: No optional chaining. Use `||` for fallback, explicit `if` for null checks.

  **Exact code to insert**:
  ```typescript
  /**
   * Python Bridge에서 종목의 OHLCV 데이터를 가져옴
   *
   * @param symbol - 종목 코드
   * @param startDate - 시작일 (YYYY-MM-DD)
   * @param endDate - 종료일 (YYYY-MM-DD)
   * @param timeframe - 타임프레임 (기본값: '1d')
   * @returns OHLCV 데이터 배열
   */
  async function fetchOHLCVFromBridge(
    symbol: string,
    startDate: string,
    endDate: string,
    timeframe: string = '1d'
  ): Promise<CandleData[]> {
    const bridgeUrl = process.env.PYTHON_BRIDGE_URL || 'http://localhost:8000';
    const params = new URLSearchParams({
      timeframe,
      start_date: startDate,
      end_date: endDate,
      limit: '10000',
    });

    const response = await fetch(
      `${bridgeUrl}/api/market/ohlcv/${symbol}?${params.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      console.warn(`OHLCV fetch failed for ${symbol}: ${response.statusText}`);
      return [];
    }

    const result = await response.json();
    const data = result.data || result || [];

    if (!Array.isArray(data)) return [];

    return data.map((bar: Record<string, unknown>) => ({
      date: String(bar.timestamp || bar.date || '').split('T')[0],
      open: Number(bar.open) || 0,
      high: Number(bar.high) || 0,
      low: Number(bar.low) || 0,
      close: Number(bar.close) || 0,
      volume: Number(bar.volume) || 0,
    }));
  }
  ```

  **Must NOT do**:
  - Do NOT use optional chaining (`?.`)
  - Do NOT throw errors — always return `[]` on failure
  - Do NOT modify `validateRequest` or any existing code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `apps/web/app/api/backtest/route.ts:25-30` — `BacktestRequestBody` interface (insert AFTER this closing brace)
  - `apps/web/app/api/backtest/route.ts` — `validateRequest` function (insert BEFORE; do NOT touch)
  - `apps/web/lib/trpc/routers/market.ts:180-220` — Existing OHLCV fetch pattern (same URL structure and error handling)
  - `apps/web/lib/strategy/backtest-engine.ts:52-65` — `CandleData` interface shape (map output must conform)

  **Acceptance Criteria**:
  ```bash
  grep -c 'async function fetchOHLCVFromBridge' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: "1"
  grep -c '?\.' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: "0"
  # Agent runs lsp_diagnostics on route.ts -> Zero errors
  ```

  **Commit**: NO (group with Task 3)

---

- [ ] 3. Add OHLCV fetch block in POST handler before `runBacktest`

  **What to do**:
  - Inside `POST`, AFTER the `backtestConfig` const declaration block (ends with `};`) and BEFORE the `const result: BacktestResult = runBacktest(...)` line, insert fetch block.
  - Two branches wrapped in inner `try/catch`:
    - **Multi-symbol** (`if backtestConfig.symbols && backtestConfig.symbols.length > 1`): parallel fetch via `Promise.all`, assign `backtestConfig.externalCandlesRecord`
    - **Single-symbol** (else): fetch if not `'SIMULATED'`, assign `backtestConfig.externalCandles`
    - **Catch**: `console.warn(...)` and continue silently

  **Exact code to insert**:
  ```typescript
      // 실제 시세 데이터 fetch 시도
      try {
        if (backtestConfig.symbols && backtestConfig.symbols.length > 1) {
          // 다중 종목: 종목별 병렬 fetch
          const candlesRecord: Record<string, CandleData[]> = {};
          const fetchPromises = backtestConfig.symbols.map(async (sym) => {
            const candles = await fetchOHLCVFromBridge(
              sym.code,
              backtestConfig.startDate,
              backtestConfig.endDate
            );
            if (candles.length > 0) {
              candlesRecord[sym.code] = candles;
            }
          });
          await Promise.all(fetchPromises);

          // 모든 종목에 데이터가 있을 때만 실제 데이터 사용
          const allHaveData = backtestConfig.symbols.every(
            (sym) => candlesRecord[sym.code] && candlesRecord[sym.code].length > 0
          );
          if (allHaveData) {
            backtestConfig.externalCandlesRecord = candlesRecord;
          }
        } else {
          // 단일 종목
          const symbolCode = backtestConfig.symbol || 'SIMULATED';
          if (symbolCode !== 'SIMULATED') {
            const candles = await fetchOHLCVFromBridge(
              symbolCode,
              backtestConfig.startDate,
              backtestConfig.endDate
            );
            if (candles.length > 0) {
              backtestConfig.externalCandles = candles;
            }
          }
        }
      } catch (fetchError) {
        console.warn('실제 시세 데이터 fetch 실패, 시뮬레이션 데이터로 대체:', fetchError);
        // 실패 시 시뮬레이션 데이터로 계속 진행
      }
  ```

  **Must NOT do**:
  - Do NOT use optional chaining (`?.`)
  - Do NOT reassign `backtestConfig` (only assign properties on it)
  - Do NOT modify `validateRequest`, outer `catch`, `runBacktest` call, or response block

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 4
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `apps/web/app/api/backtest/route.ts` — POST handler: `backtestConfig` block (insert AFTER) and `runBacktest` call (insert BEFORE)
  - `apps/web/lib/strategy/backtest-engine.ts:43-46` — `BacktestConfig.externalCandles` and `externalCandlesRecord` optional properties
  - `apps/web/lib/strategy/backtest-engine.ts:1499` — `runBacktest` signature (confirms it consumes these properties)

  **Acceptance Criteria**:
  ```bash
  grep -c 'externalCandles' /opt/coffeetree/apps/web/app/api/backtest/route.ts      # >=1
  grep -c 'externalCandlesRecord' /opt/coffeetree/apps/web/app/api/backtest/route.ts # >=1
  grep -c 'fetchOHLCVFromBridge' /opt/coffeetree/apps/web/app/api/backtest/route.ts  # >=3
  grep 'const backtestConfig' /opt/coffeetree/apps/web/app/api/backtest/route.ts     # match found
  # Agent runs lsp_diagnostics on route.ts -> Zero errors
  ```

  **Commit**: YES
  - Message: `feat(backtest): fetch OHLCV from Python Bridge before runBacktest`
  - Files: `apps/web/app/api/backtest/route.ts`
  - Pre-commit: `cd /opt/coffeetree/apps/web && npx tsc --noEmit`

---

- [ ] 4. Full verification suite

  **What to do**: Run ALL verification checks to confirm every constraint is satisfied.

  **Verification commands (agent executes all)**:
  ```bash
  # 1. TypeScript project type check
  cd /opt/coffeetree/apps/web && npx tsc --noEmit
  # Assert: Exit code 0

  # 2. No optional chaining
  grep -c '?\.' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: "0"

  # 3. CandleData imported
  grep 'type CandleData' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match

  # 4. Helper exists
  grep -c 'async function fetchOHLCVFromBridge' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: "1"

  # 5. backtestConfig is const
  grep 'const backtestConfig: BacktestConfig' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match

  # 6. externalCandles assigned
  grep 'backtestConfig.externalCandles' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: >=1
  grep 'backtestConfig.externalCandlesRecord' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: >=1

  # 7. Inner try/catch
  grep -c 'catch (fetchError)' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: "1"

  # 8. validateRequest preserved
  grep 'function validateRequest(body: unknown): string | null' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match

  # 9. Outer error handler preserved
  grep '백테스트 실행 실패:' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match

  # 10. runBacktest call present
  grep 'runBacktest(workflow, backtestConfig)' /opt/coffeetree/apps/web/app/api/backtest/route.ts
  # Assert: match
  ```

  **Must NOT do**: Do NOT modify any files. Do NOT skip any check.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None (terminal)
  - **Blocked By**: Tasks 1, 2, 3

  **Acceptance Criteria**: ALL 10 checks pass. Zero TypeScript errors. Zero LSP errors.

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 3 (covers 1-3) | `feat(backtest): fetch OHLCV from Python Bridge before runBacktest` | `apps/web/app/api/backtest/route.ts` | `npx tsc --noEmit` + Task 4 full suite |

---

## Success Criteria

### Final Checklist
- [ ] `CandleData` type imported from `backtest-engine`
- [ ] `fetchOHLCVFromBridge` helper defined with JSDoc, returns `CandleData[]`, never throws
- [ ] OHLCV fetch block between `backtestConfig` and `runBacktest`, with inner try/catch
- [ ] Multi-symbol parallel fetch + single-symbol fetch paths both present
- [ ] `backtestConfig` remains `const` — only property assignment, no reassignment
- [ ] Zero optional chaining (`?.`) in file
- [ ] `validateRequest` function unchanged
- [ ] Outer POST catch block unchanged
- [ ] `npx tsc --noEmit` passes
- [ ] LSP diagnostics: zero errors
