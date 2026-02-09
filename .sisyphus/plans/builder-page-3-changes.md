# Strategy Builder Page — 3 Change Sets

## TL;DR

> **Quick Summary**: Implement three distinct enhancements to the visual strategy builder page: (1) add a collapsible Trading Environment settings section between sections 2 and 3, (2) pipe its state into the backtest config payload, and (3) wire the AI Analysis section (section 4) to the existing `/api/ai/analyze-backtest` endpoint with loading/error states.
>
> **Deliverables**:
> - Trading Environment UI section with `Settings` icon, initial capital / commission / slippage controls
> - Backtest config object enriched with those values (replacing hardcoded ones)
> - AI Analysis section calls `/api/ai/analyze-backtest` after backtest completes, renders `interpretation` and `suggestions` from API
> - All `useCallback` dependency arrays updated to include new state
>
> **Estimated Effort**: Medium (single file, ~150–200 lines net change)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (state) → Task 2 (UI) + Task 3 (config) in parallel → Task 4 (AI integration) → Task 5 (dep arrays)

---

## Context

### Target File
`/opt/coffeetree/apps/web/app/(dashboard)/strategies/builder/page.tsx` (1002 lines)

### Existing API Contract
`/api/ai/analyze-backtest` already exists and returns:
```ts
{ success: boolean; data?: { interpretation: string; suggestions: string }; error?: string }
```
Request body expects `{ metrics, trades, config }` matching `AnalyzeBacktestRequest` (see `app/api/ai/analyze-backtest/route.ts`).

### Key Constraints
| # | Constraint | Rationale |
|---|-----------|-----------|
| 1 | **No optional chaining** (`?.`) | Project convention — use explicit null checks (`x && x.prop`) as file already does (lines 704, 847, 861, 865) |
| 2 | **Keep existing Tailwind + lucide patterns** | Match `bg-white dark:bg-gray-800`, `text-sm font-semibold`, `w-4 h-4` icon sizing |
| 3 | **Add `Settings` import** | From `lucide-react`, for Trading Environment section header icon |
| 4 | **Use `RefreshCw` for loading spinners** | Already imported (line 15) and used with `animate-spin` throughout file |
| 5 | **No new npm dependencies** | Only use already-available components/icons |
| 6 | **Do not change unrelated logic** | Preserve all existing behavior |

---

## Task Graph (Dependency DAG)

```
Wave 1 (Atomic foundation — must go first):
└── Task 1: Add state declarations + Settings import

Wave 2 (Independent of each other, depend on Task 1):
├── Task 2: Insert Trading Environment UI section
└── Task 3: Update backtest config object

Wave 3 (Depends on Tasks 1+3):
├── Task 4: AI Analysis API integration (fetch + render)
└── Task 5: Update all affected useCallback dependency arrays

Critical Path: T1 → T3 → T4 → T5
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|-----------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | None |
| 2 | 1 | None | 3 |
| 3 | 1 | 4 | 2 |
| 4 | 1, 3 | 5 | None |
| 5 | 1, 3, 4 | None | None (final) |

---

## TODOs

---

### Task 1: Add State Declarations + `Settings` Import

**What to do**:

1. **Import `Settings`** — Add `Settings` to the lucide-react import block (line 11–21).
   - Insert `Settings,` alphabetically in the icon list (after `Search,`).
   - Result: `Search, Settings, X, Play, RefreshCw, ...`

2. **Add Trading Environment state** — Insert after the rebalancing state block (after line 130), add:
   ```ts
   // 거래 환경 설정 상태
   const [initialCapital, setInitialCapital] = useState(10000000);  // 1,000만원
   const [commission, setCommission] = useState(0.015);             // 0.015%
   const [slippage, setSlippage] = useState(0.05);                  // 0.05%
   const [showTradingEnv, setShowTradingEnv] = useState(false);     // 섹션 접기/펼치기
   ```

3. **Add AI Analysis API state** — Insert after the `showAIAnalysis` state (after line 137), add:
   ```ts
   // AI 분석 API 상태
   const [aiLoading, setAiLoading] = useState(false);
   const [aiInterpretation, setAiInterpretation] = useState('');
   const [aiSuggestions, setAiSuggestions] = useState('');
   const [aiError, setAiError] = useState('');
   ```

**Exact insertion points**:
- Import: line 12, add `Settings,` after `Search,`
- Trading env state: after line 130 (after `rebalancingPeriod` state)
- AI state: after line 137 (after `showAIAnalysis` state)

**Must NOT do**:
- Do not remove any existing imports
- Do not rename existing state variables
- Do not use `useReducer` or any new hook pattern

**References**:
- `page.tsx:11-21` — existing lucide import block (follow alphabetical-ish convention)
- `page.tsx:121-137` — existing state declarations pattern (follow `useState` naming)
- `page.tsx:149-153` — backtest state pattern (same naming convention)

**Acceptance Criteria**:
- [ ] `Settings` appears in lucide-react import
- [ ] 4 trading environment states: `initialCapital`, `commission`, `slippage`, `showTradingEnv`
- [ ] 4 AI states: `aiLoading`, `aiInterpretation`, `aiSuggestions`, `aiError`
- [ ] `bun run lint` passes with no new errors on this file

**Commit**: YES (group with all tasks)
- Message: `feat(builder): add trading environment and AI analysis state`

---

### Task 2: Insert Trading Environment UI Section

**What to do**:

Insert a new collapsible section **between section 2 (거래 대상 선택, ends ~line 611) and section 3 (차트 + 시뮬레이션, starts ~line 616)**.

**UI Structure** (follow existing section patterns from lines 441-611 and 616-820):

```tsx
{/* =============================================== */}
{/* 2.5단: 거래 환경 설정 */}
{/* =============================================== */}
<div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
  <button
    onClick={() => setShowTradingEnv(!showTradingEnv)}
    className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
  >
    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
      <Settings className="w-4 h-4" />
      거래 환경 설정
    </h2>
    <span className="text-xs text-gray-500">
      {showTradingEnv ? '접기' : '펼치기'}
    </span>
  </button>
  {showTradingEnv && (
    <div className="px-4 pb-4 grid grid-cols-3 gap-4">
      {/* 초기 자본금 */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-600 dark:text-gray-400">초기 자본금 (원)</Label>
        <Input
          type="number"
          min={1000000}
          step={1000000}
          value={initialCapital}
          onChange={(e) => setInitialCapital(Number(e.target.value))}
          className="h-8 text-sm"
        />
      </div>
      {/* 수수료 */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-600 dark:text-gray-400">수수료 (%)</Label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.001}
          value={commission}
          onChange={(e) => setCommission(Number(e.target.value))}
          className="h-8 text-sm"
        />
      </div>
      {/* 슬리피지 */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-600 dark:text-gray-400">슬리피지 (%)</Label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={slippage}
          onChange={(e) => setSlippage(Number(e.target.value))}
          className="h-8 text-sm"
        />
      </div>
    </div>
  )}
</div>
```

**Exact insertion point**: After line 611 (`</div>` closing section 2), before line 613 (`{/* 3단 comment */}`).

**Must NOT do**:
- Do not add Textarea, Select, or any component not already imported
- Do not add new `useCallback` handlers — inline `onChange` is fine for simple setters
- Do not change the grid layout of section 2 or section 3

**References**:
- `page.tsx:441-462` — Section 2 header pattern (icon + title + controls layout)
- `page.tsx:616-681` — Section 3 header pattern (same visual style)
- `page.tsx:448-459` — Switch/Label pattern for reference

**Acceptance Criteria**:
- [ ] New section appears between sections 2 and 3 in the DOM
- [ ] `Settings` icon renders in header
- [ ] Section is collapsed by default (`showTradingEnv` initial = `false`)
- [ ] Click toggles visibility; 3 inputs appear in a `grid-cols-3` layout
- [ ] All inputs use existing `Input`, `Label` components with Tailwind classes matching adjacent sections
- [ ] No optional chaining used

**Commit**: YES (group)
- Message: `feat(builder): add trading environment settings section`

---

### Task 3: Update Backtest Config Object

**What to do**:

Replace the hardcoded values in the `config` object inside `handleRunBacktest` (lines 338-350) with state-driven values:

**Current** (lines 338-350):
```ts
const config = {
  startDate: startDateObj.toISOString().split('T')[0],
  endDate: today.toISOString().split('T')[0],
  initialCapital: 10000000,         // ← hardcoded
  commission: 0.00015,              // ← hardcoded
  slippage: 0.0005,                 // ← hardcoded
  symbol: selectedStocks[0].code,
  symbols: selectedStocks.map(s => ({...})),
};
```

**New**:
```ts
const config = {
  startDate: startDateObj.toISOString().split('T')[0],
  endDate: today.toISOString().split('T')[0],
  initialCapital: initialCapital,
  commission: commission / 100,     // UI is %, API expects decimal
  slippage: slippage / 100,         // UI is %, API expects decimal
  symbol: selectedStocks[0].code,
  symbols: selectedStocks.map(s => ({
    code: s.code,
    name: s.name,
    positionSize: s.positionSize,
  })),
};
```

**Key detail**: The UI stores commission/slippage as **percentages** (e.g., `0.015` meaning 0.015%), while the API expects **decimals** (e.g., `0.00015`). The conversion `/ 100` converts percent → decimal ratio.

**Exact lines to change**: Lines 341-343 inside the `config` object literal.

**Must NOT do**:
- Do not change `startDate`/`endDate` calculation logic
- Do not alter `symbol`/`symbols` structure
- Do not modify the `switch` statement for backtestPeriod

**References**:
- `page.tsx:338-350` — existing config object
- `route.ts:27-34` (API) — `config` schema expected by the API: `{ startDate, endDate, initialCapital, commission, slippage, symbols }`

**Acceptance Criteria**:
- [ ] `initialCapital` reads from `initialCapital` state (not hardcoded `10000000`)
- [ ] `commission` reads from `commission` state, divided by 100
- [ ] `slippage` reads from `slippage` state, divided by 100
- [ ] API contract still satisfied (decimals, not percentages)

**Commit**: YES (group)
- Message: `feat(builder): wire trading environment state into backtest config`

---

### Task 4: AI Analysis API Integration

**What to do**:

1. **Add `fetchAIAnalysis` callback** — Insert a new `useCallback` after `handleRunBacktest` (after line 421):

```ts
/**
 * AI 분석 API 호출
 */
const fetchAIAnalysis = useCallback(async (results: BacktestResult) => {
  setAiLoading(true);
  setAiError('');
  setAiInterpretation('');
  setAiSuggestions('');

  try {
    const response = await fetch('/api/ai/analyze-backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics: results.metrics,
        trades: results.trades,
        config: {
          startDate: '', // filled below
          endDate: '',
          initialCapital: initialCapital,
          commission: commission / 100,
          slippage: slippage / 100,
          symbols: selectedStocks.map(s => ({
            code: s.code,
            name: s.name,
            positionSize: s.positionSize,
          })),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI 분석 요청 실패');
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('잘못된 AI 분석 응답');
    }

    setAiInterpretation(data.data.interpretation);
    setAiSuggestions(data.data.suggestions);
  } catch (err) {
    console.error('AI 분석 실패:', err);
    setAiError(err instanceof Error ? err.message : '알 수 없는 오류');
  } finally {
    setAiLoading(false);
  }
}, [initialCapital, commission, slippage, selectedStocks]);
```

> **Note on `startDate`/`endDate`**: These should be computed the same way as in `handleRunBacktest`. Two options:
> - **(Preferred)** Extract them from `backtestResults` if it stores them, OR
> - Pass them as parameters to `fetchAIAnalysis`.
> Since `BacktestResult` may not carry dates, the simplest approach: make `fetchAIAnalysis` accept a `configPayload` parameter that is the same `config` object built in `handleRunBacktest`. This avoids duplicating date logic.
>
> **Refined approach**: Change signature to `fetchAIAnalysis(results: BacktestResult, configPayload: typeof config)` and call it from inside `handleRunBacktest` right after receiving results.

2. **Call `fetchAIAnalysis` after backtest success** — Inside `handleRunBacktest`, after line 411-413 where results are set:

```ts
// existing:
setBacktestResults(responseData.data as BacktestResult);
setBacktestStatus('완료');
setShowAIAnalysis(true);

// ADD:
fetchAIAnalysis(responseData.data as BacktestResult, config);
```

This calls the AI analysis immediately after backtest completes successfully.

3. **Update AI Analysis section UI** (lines 838-964) — Replace the static rule-based content in both cards:

**Left card (백테스트 결과 해석, lines 858-907)**: Replace `CardContent` children with:
```tsx
<CardContent>
  {aiLoading ? (
    <div className="h-32 flex items-center justify-center">
      <div className="text-center text-purple-500">
        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
        <p className="text-sm">AI가 분석 중입니다...</p>
      </div>
    </div>
  ) : aiError ? (
    <div className="h-32 flex items-center justify-center text-red-500 text-sm">
      <div className="text-center">
        <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
        <p>{aiError}</p>
      </div>
    </div>
  ) : aiInterpretation ? (
    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
      {aiInterpretation}
    </div>
  ) : (
    <div className="h-32 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
      <div className="text-center">
        <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p>백테스트 실행 후</p>
        <p>AI가 결과를 분석합니다</p>
      </div>
    </div>
  )}
</CardContent>
```

**Right card (전략 개선 제안, lines 918-961)**: Same pattern but uses `aiSuggestions` instead of `aiInterpretation`. The existing rule-based suggestions (lines 919-951) are fully replaced.

**Must NOT do**:
- Do not use optional chaining (`?.`)
- Do not import new components — use existing `RefreshCw`, `AlertTriangle`, `Sparkles`
- Do not remove the card headers / CardHeader / CardTitle structures
- Do not change the `grid grid-cols-2` layout of the AI section

**References**:
- `page.tsx:826-965` — current AI Analysis section (section 4)
- `page.tsx:686-698` — loading state pattern with `RefreshCw animate-spin` (reuse this pattern)
- `route.ts:41-48` — API response shape: `{ success, data: { interpretation, suggestions } }`
- `route.ts:7-36` — API request shape (what to send)
- `page.tsx:386-394` — existing `fetch` pattern for API calls

**Acceptance Criteria**:
- [ ] `fetchAIAnalysis` callback exists and calls `/api/ai/analyze-backtest`
- [ ] Called automatically after backtest success
- [ ] Loading state shows `RefreshCw` with `animate-spin` in both cards
- [ ] Error state shows `AlertTriangle` icon + error message
- [ ] Success state renders `aiInterpretation` in left card, `aiSuggestions` in right card
- [ ] `whitespace-pre-wrap` preserves paragraph formatting from API
- [ ] Empty/initial state shows the "백테스트 실행 후" placeholder (same as current)
- [ ] No optional chaining used anywhere

**Commit**: YES (group)
- Message: `feat(builder): integrate AI analysis API with loading/error states`

---

### Task 5: Update All `useCallback` Dependency Arrays

**What to do**:

After all state and logic changes are in place, verify and update dependency arrays:

1. **`handleRunBacktest`** (currently line 421):
   ```ts
   // CURRENT:
   }, [backtestRunning, selectedStocks, rebalancingEnabled, backtestPeriod]);
   
   // NEW — add trading env state + fetchAIAnalysis:
   }, [backtestRunning, selectedStocks, rebalancingEnabled, backtestPeriod, initialCapital, commission, slippage, fetchAIAnalysis]);
   ```
   - `initialCapital`, `commission`, `slippage` → used in config object
   - `fetchAIAnalysis` → called after backtest success

2. **`fetchAIAnalysis`** (new, from Task 4):
   ```ts
   }, [initialCapital, commission, slippage, selectedStocks]);
   ```
   Already specified in Task 4 — verify it's correct.

3. **All other `useCallback`s** — Verify no change needed:
   - `handleSave` (line 117-119): no deps → no change ✓
   - `handleWorkflowChange` (line 145-147): no deps → no change ✓
   - `handleRemoveStock` (line 161-163): no deps → no change ✓
   - `handlePositionSizeChange` (line 168-172): no deps → no change ✓
   - `handleSearch` (line 177-197): `[searchQuery, marketFilter]` → no change ✓
   - `handleAddStock` (line 202-214): `[selectedStocks]` → no change ✓
   - `calculateDrawdownData` (line 219-226): no deps → no change ✓
   - `convertTradesToTableFormat` (line 232-275): no deps → no change ✓

**Must NOT do**:
- Do not add deps to callbacks that don't reference the new state
- Do not remove any existing dependencies
- Do not change callback logic

**References**:
- `page.tsx:421` — `handleRunBacktest` dep array
- React docs: exhaustive-deps rule

**Acceptance Criteria**:
- [ ] `handleRunBacktest` dep array includes: `backtestRunning`, `selectedStocks`, `rebalancingEnabled`, `backtestPeriod`, `initialCapital`, `commission`, `slippage`, `fetchAIAnalysis`
- [ ] `fetchAIAnalysis` dep array includes: `initialCapital`, `commission`, `slippage`, `selectedStocks`
- [ ] No ESLint `react-hooks/exhaustive-deps` warnings
- [ ] All other callbacks unchanged

**Commit**: YES (single commit for all 5 tasks)
- Message: `feat(builder): add trading env settings, wire config, integrate AI analysis API`

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Circular dependency** between `handleRunBacktest` ↔ `fetchAIAnalysis` | Medium | Stale closure | `fetchAIAnalysis` must be declared BEFORE `handleRunBacktest` so it's in scope. React `useCallback` handles the reference. |
| **Commission/slippage unit mismatch** | High | Wrong backtest results | UI stores as percentage (0.015 = 0.015%), divide by 100 to get decimal (0.00015) for API. Document clearly in code comments. |
| **AI API failure blocks UX** | Low | Bad UX | AI fetch is fire-and-forget after backtest — errors show in AI section only, don't affect backtest results display. |
| **Optional chaining sneaking in** | Medium | Violates constraint | Explicit check: all new code must use `&&` guard pattern, not `?.`. Reviewer should grep for `?.` in diff. |
| **`fetchAIAnalysis` missing from `handleRunBacktest` deps** | High | Stale closure, AI called with old config | Task 5 explicitly adds `fetchAIAnalysis` to the dep array. |
| **Declaration order** | Medium | `fetchAIAnalysis` not in scope | `fetchAIAnalysis` must be declared ABOVE `handleRunBacktest` in the file (insert between existing callbacks and `handleRunBacktest`). |

---

## Execution Order Summary

```
Step 1: Task 1 — Add imports + all new state declarations
Step 2: Task 2 + Task 3 — (parallel) Insert UI section + Update config object
Step 3: Task 4 — Add fetchAIAnalysis callback + call site + replace AI section UI
Step 4: Task 5 — Verify and update all dependency arrays
Step 5: Single commit with all changes
```

---

## Success Criteria

### Verification Commands
```bash
# Type check
bunx tsc --noEmit

# Lint
bun run lint

# Grep for forbidden optional chaining in diff
git diff --unified=0 | grep '\?\.'   # Should return empty
```

### Final Checklist
- [ ] `Settings` imported from lucide-react
- [ ] Trading Environment section renders between sections 2 and 3
- [ ] Section is collapsible (default: collapsed)
- [ ] Config uses state values (not hardcoded)
- [ ] Commission/slippage converted from % to decimal in config
- [ ] AI Analysis calls `/api/ai/analyze-backtest` automatically after backtest
- [ ] Loading spinner uses `RefreshCw animate-spin`
- [ ] Error state uses `AlertTriangle`
- [ ] `whitespace-pre-wrap` on AI text output
- [ ] All `useCallback` dep arrays correct
- [ ] Zero optional chaining (`?.`) in new code
- [ ] Zero new npm dependencies
- [ ] All existing functionality preserved
