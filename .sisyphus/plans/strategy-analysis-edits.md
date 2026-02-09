# Strategy Analysis Component — 8 Edits Plan

## TL;DR

> **Quick Summary**: Apply 8 surgical edits to `strategy-analysis.tsx` — expand the props/types layer (3 new optional props), enhance the logic layer (payload & handleApply), and refine the UI layer (grade scores, button text, content rendering, strengths description, bulk-apply button).
>
> **Deliverables**:
> - Updated `StrategyAnalysisProps` interface with `workflow`, `trades`, `onRegenerateStrategy`
> - Enhanced `handleAnalyze` payload forwarding new data
> - Rewritten `handleApply` with Korean prompt generation + `onRegenerateStrategy` callback
> - 5 discrete UI refinements in the rendered output
>
> **Estimated Effort**: Short (~25 min mechanical editing)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3,4 (parallel) → Tasks 5,6,7,8,9 (parallel)

---

## Context

### Original Request
Apply 8 exact, snippet-specified edits to `/opt/coffeetree/apps/web/components/backtest/strategy-analysis.tsx`. No other files modified.

### Target File Anatomy (462 lines)
| Region | Lines | Purpose |
|--------|-------|---------|
| Imports | 1–8 | React, UI primitives, icons |
| `AnalysisResult` type | 10–37 | AI response shape |
| `BacktestMetrics` type | 39–58 | Input metrics shape |
| `StrategyAnalysisProps` | 60–66 | Component props ← **EDIT** |
| Constants | 71–100 | Grade/priority color maps |
| `ScoreBar` | 105–127 | Helper component |
| `StrategyAnalysis` | 133–461 | Main component |
| — destructuring | 133–139 | Props ← **EDIT** |
| — `handleAnalyze` | 149–181 | API call ← **EDIT** |
| — `handleApply` | 186–195 | Apply handler ← **EDIT** |
| — pre-analysis UI | 198–228 | Empty state |
| — loading UI | 231–247 | Spinner |
| — grade card | 253–277 | Grade badge + summary ← **EDIT** |
| — score gauges | 280–292 | ScoreBar trio |
| — detail tabs | 294–329 | Tab content ← **EDIT** |
| — improvements | 331–404 | Suggestion cards ← **EDIT** (header + buttons) |
| — strengths | 406–424 | Strengths list ← **EDIT** |
| — market fit | 426–458 | Market conditions |

### Constraints
- **No optional chaining** (`?.` forbidden) — use explicit `&&` guards
- **Korean comments** only when clarifying intent, matching existing style
- **Single file** modification — consumer files out of scope
- **All new props are optional** — no consumer breakage

---

## Work Objectives

### Core Objective
Extend `StrategyAnalysis` with workflow/trade context for richer AI analysis and prompt-based strategy regeneration, plus 5 UI polish changes.

### Concrete Deliverables
- 3 new optional props wired end-to-end (type → destructure → usage)
- `handleAnalyze` sends enriched payload
- `handleApply` generates Korean improvement prompt and fires callback
- Grade card shows inline section scores
- Improvement buttons updated with icons and new Korean labels
- Tab content renders paragraphs instead of preformatted block
- Strengths section gains helper description
- "전체 반영" bulk-apply button in improvements header

### Definition of Done
- [ ] `tsc --noEmit` passes on target file (zero type errors)
- [ ] No `?.` in any edited/added code
- [ ] All 8 snippet changes present and exact
- [ ] Visual diff shows only intended changes

### Must NOT Have (Guardrails)
- No optional chaining anywhere in new/edited code
- No changes to `AnalysisResult`, `BacktestMetrics`, constants, `ScoreBar`, or market-fit section
- No new imports (all icons already imported on line 8)
- No modifications to consumer files
- No English-only comments on new Korean-facing logic

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: Not assessed (out of scope — this is a plan for a single-file UI component edit)
- **User wants tests**: NO (user explicitly said "do not implement")
- **QA approach**: Manual verification via `tsc --noEmit` + visual diff

### Automated Verification

```bash
# Type-check the file in isolation
npx tsc --noEmit apps/web/components/backtest/strategy-analysis.tsx

# Verify no optional chaining introduced
grep -n '\?\.' apps/web/components/backtest/strategy-analysis.tsx
# Expected: zero matches (or only pre-existing — verify none exist currently: confirmed zero)

# Verify all 8 marker strings are present
grep -c 'onRegenerateStrategy' apps/web/components/backtest/strategy-analysis.tsx  # Expected: ≥3
grep -c '전략에 반영' apps/web/components/backtest/strategy-analysis.tsx           # Expected: ≥1
grep -c '전체 반영' apps/web/components/backtest/strategy-analysis.tsx             # Expected: ≥1
grep -c 'trades.slice(0, 50)' apps/web/components/backtest/strategy-analysis.tsx  # Expected: 1
grep -c '반영 완료' apps/web/components/backtest/strategy-analysis.tsx            # Expected: ≥1
grep -c '이 전략의 핵심 장점을 유지하세요' apps/web/components/backtest/strategy-analysis.tsx  # Expected: 1
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — MUST be sequential internally):
├── Task 1: Props interface expansion (lines 60-66)
└── Task 2: Component destructuring update (lines 133-139)
    ↳ BLOCKED BY Task 1 (new types must exist before destructuring)

Wave 2 (Logic + UI — parallel after Wave 1):
├── Task 3: handleAnalyze payload (lines 157-161) [uses: workflow, trades]
├── Task 4: handleApply rewrite (lines 186-195) [uses: onRegenerateStrategy]
├── Task 5: Grade card inline scores (after line 265)
├── Task 6: Improvement button text (lines 380-398)
├── Task 7: Detail content rendering (lines 325-328)
├── Task 8: Strengths description (after line 413)
└── Task 9: "전체 반영" button (lines 333-339)
    ↳ DEPENDS ON Task 4 (calls handleApply)

Critical Path: Task 1 → Task 2 → Task 4 → Task 9
Parallel Speedup: Tasks 3,5,6,7,8 are fully independent after Wave 1
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2,3,4 | None |
| 2 | 1 | 3,4,5,6,7,8,9 | None |
| 3 | 2 | None | 4,5,6,7,8 |
| 4 | 2 | 9 | 3,5,6,7,8 |
| 5 | 2 | None | 3,4,6,7,8 |
| 6 | 2 | None | 3,4,5,7,8 |
| 7 | 2 | None | 3,4,5,6,8 |
| 8 | 2 | None | 3,4,5,6,7 |
| 9 | 4 | None | 3,5,6,7,8 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended |
|------|-------|-------------|
| 1 | 1, 2 | Single executor — sequential, 2 small edits in one pass |
| 2 | 3–9 | Single executor — all edits in one pass (same file, no conflicts) |

> **Practical note**: Since all edits target the same file, the optimal execution is a **single executor pass** applying all 9 tasks top-to-bottom. The wave/dependency graph exists to enforce correctness if tasks are reviewed individually.

---

## TODOs

- [ ] 1. Expand `StrategyAnalysisProps` interface

  **What to do**:
  - At lines 60–66, replace the existing interface with the expanded version
  - Add three new optional properties after `onApplyImprovement`:
    - `workflow?: { nodes: Array<{id: string; type: string; data: Record<string, unknown>; parentId?: string}>; edges: Array<{source: string; target: string}> }`
    - `trades?: Array<{date: string; type: 'BUY' | 'SELL'; price: number; quantity: number; symbol?: string; profit?: number; profitPercent?: number}>`
    - `onRegenerateStrategy?: (prompt: string) => void`
  - Keep `className?: string` as the last property

  **Must NOT do**:
  - Do not use optional chaining in type definitions
  - Do not modify `AnalysisResult` or `BacktestMetrics` interfaces
  - Do not add default values in the interface

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit after completion

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (sequential with Task 2)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7, 8, 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:60-66` — Current `StrategyAnalysisProps` to replace

  **Exact Snippet** (verbatim from user):
  ```ts
  interface StrategyAnalysisProps {
    metrics: BacktestMetrics;
    strategyName?: string;
    period?: string;
    onApplyImprovement?: (improvement: AnalysisResult['improvements'][0]) => void;
    workflow?: {
      nodes: Array<{ id: string; type: string; data: Record<string, unknown>; parentId?: string; }>;
      edges: Array<{ source: string; target: string; }>;
    };
    trades?: Array<{ date: string; type: 'BUY' | 'SELL'; price: number; quantity: number; symbol?: string; profit?: number; profitPercent?: number; }>;
    onRegenerateStrategy?: (prompt: string) => void;
    className?: string;
  }
  ```

  **Acceptance Criteria**:
  - [ ] `grep -c 'onRegenerateStrategy' strategy-analysis.tsx` → ≥1
  - [ ] `grep -c 'workflow?' strategy-analysis.tsx` → ≥1
  - [ ] `grep -c 'trades?' strategy-analysis.tsx` → ≥1
  - [ ] `tsc --noEmit` passes

  **Commit**: NO (groups with Task 2)

---

- [ ] 2. Update component destructuring to include new props

  **What to do**:
  - At lines 133–139, add `workflow`, `trades`, `onRegenerateStrategy` to the destructured props
  - Place them after `onApplyImprovement` and before `className`

  **Must NOT do**:
  - Do not add default values for the new props (they are optional/undefined by default)
  - Do not reorder existing props

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 8, 9
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:133-139` — Current destructuring block

  **Target state** (lines 133–141 after edit):
  ```tsx
  export function StrategyAnalysis({
    metrics,
    strategyName,
    period,
    onApplyImprovement,
    workflow,
    trades,
    onRegenerateStrategy,
    className = '',
  }: StrategyAnalysisProps) {
  ```

  **Acceptance Criteria**:
  - [ ] All 8 prop names appear in destructuring
  - [ ] `tsc --noEmit` passes (no unused-variable if props used in later tasks)

  **Commit**: NO (groups with remaining tasks)

---

- [ ] 3. Expand `handleAnalyze` payload with `workflow` and `trades`

  **What to do**:
  - At lines 157–161 inside `handleAnalyze`, replace the `body: JSON.stringify(...)` call
  - Add `workflow: workflow || undefined` and `trades: trades ? trades.slice(0, 50) : undefined`

  **Must NOT do**:
  - Do not use optional chaining (`trades?.slice(...)` is forbidden)
  - Do not change the API endpoint URL or method
  - Do not remove existing `metrics`, `strategyName`, `period` fields

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:156-161` — Current `fetch` body

  **Exact Snippet** (body only):
  ```ts
  body: JSON.stringify({
    metrics,
    strategyName: strategyName || '미지정',
    period: period || '미지정',
    workflow: workflow || undefined,
    trades: trades ? trades.slice(0, 50) : undefined,
  }),
  ```

  **Acceptance Criteria**:
  - [ ] `grep -c 'trades.slice(0, 50)' strategy-analysis.tsx` → 1
  - [ ] `grep -c 'workflow || undefined' strategy-analysis.tsx` → 1
  - [ ] Zero `?.` in the `handleAnalyze` function
  - [ ] `tsc --noEmit` passes

  **Commit**: NO (groups with all tasks)

---

- [ ] 4. Rewrite `handleApply` with prompt generation

  **What to do**:
  - Replace entire `handleApply` function (lines 186–195) with the expanded version
  - New order: (1) `setAppliedIds`, (2) `onApplyImprovement` callback, (3) prompt generation + `onRegenerateStrategy`
  - Prompt generation: map `parameterChanges` into Korean sentence, call `onRegenerateStrategy(prompt)`

  **Must NOT do**:
  - Do not use optional chaining — use `&&` guard chains: `onRegenerateStrategy && improvement.parameterChanges && improvement.parameterChanges.length > 0`
  - Do not change the `AnalysisResult['improvements'][0]` parameter type

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5, 6, 7, 8)
  - **Blocks**: Task 9 (전체 반영 button calls handleApply)
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:186-195` — Current `handleApply` function to replace

  **Exact Snippet**:
  ```ts
  const handleApply = (improvement: AnalysisResult['improvements'][0]) => {
    setAppliedIds((prev) => {
      const next = new Set(prev);
      next.add(improvement.id);
      return next;
    });
    if (onApplyImprovement) {
      onApplyImprovement(improvement);
    }
    if (onRegenerateStrategy && improvement.parameterChanges && improvement.parameterChanges.length > 0) {
      const changes = improvement.parameterChanges
        .map(c => `${c.parameter}을(를) ${c.currentValue}에서 ${c.suggestedValue}로 변경`)
        .join(', ');
      const prompt = `현재 전략에서 다음 개선사항을 반영해주세요: ${changes}. 기존 전략 구조를 유지하면서 해당 파라미터만 조정하세요.`;
      onRegenerateStrategy(prompt);
    }
  };
  ```

  **Key behavioral change**: `setAppliedIds` now runs BEFORE `onApplyImprovement` (was after in original).

  **Acceptance Criteria**:
  - [ ] `grep -c 'onRegenerateStrategy' strategy-analysis.tsx` → ≥3 (interface + destructure + usage)
  - [ ] `grep '?\.' strategy-analysis.tsx` in handleApply region → zero matches
  - [ ] Prompt string contains `을(를)`, `에서`, `로 변경`
  - [ ] `tsc --noEmit` passes

  **Commit**: NO (groups with all tasks)

---

- [ ] 5. Add inline section scores to grade card

  **What to do**:
  - Inside the grade card (after `<p className="text-zinc-300 mt-1">{analysis.summary}</p>` at line 265), insert the scores `<div>` block
  - Shows profitability/risk/efficiency scores using `GRADE_TEXT_COLORS`

  **Must NOT do**:
  - Do not modify the grade badge or "재분석" button
  - Do not change the card's outer structure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: UI layout insertion

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 6, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:263-266` — The `<div className="flex-1">` block where scores insert after `<p>` summary
  - `strategy-analysis.tsx:79-85` — `GRADE_TEXT_COLORS` constant used for score colors

  **Exact Snippet** (insert after line 265):
  ```tsx
  <div className="flex items-center gap-4 mt-3">
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">수익성</span>
      <span className={cn('text-sm font-semibold', GRADE_TEXT_COLORS[analysis.grade] || 'text-zinc-400')}>
        {analysis.sections.profitability.score}점
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">위험관리</span>
      <span className={cn('text-sm font-semibold', GRADE_TEXT_COLORS[analysis.grade] || 'text-zinc-400')}>
        {analysis.sections.risk.score}점
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">효율성</span>
      <span className={cn('text-sm font-semibold', GRADE_TEXT_COLORS[analysis.grade] || 'text-zinc-400')}>
        {analysis.sections.efficiency.score}점
      </span>
    </div>
  </div>
  ```

  **Acceptance Criteria**:
  - [ ] Three `점</span>` entries visible inside grade card
  - [ ] Uses `GRADE_TEXT_COLORS[analysis.grade]` (not hardcoded colors)
  - [ ] `tsc --noEmit` passes

  **Commit**: NO (groups with all tasks)

---

- [ ] 6. Update improvement button text and add icon

  **What to do**:
  - At lines 380–398 (the `<Button>` inside each improvement card), replace the button content
  - Unapplied state: "반영" → `<ArrowRight icon /> 전략에 반영`
  - Applied state: "반영됨" → `<CheckCircle icon /> 반영 완료`

  **Must NOT do**:
  - Do not change button variant, size, className, onClick, or disabled logic
  - Do not change `CheckCircle` to any other icon (already imported)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:390-397` — Current button content (ternary inside `<Button>`)
  - `strategy-analysis.tsx:8` — `ArrowRight` already imported

  **Exact Snippet** (replace inner content of Button):
  ```tsx
  {isApplied ? (
    <>
      <CheckCircle className="w-4 h-4 mr-1" />
      반영 완료
    </>
  ) : (
    <>
      <ArrowRight className="w-4 h-4 mr-1" />
      전략에 반영
    </>
  )}
  ```

  **Acceptance Criteria**:
  - [ ] `grep -c '전략에 반영' strategy-analysis.tsx` → ≥1
  - [ ] `grep -c '반영 완료' strategy-analysis.tsx` → ≥1
  - [ ] Unapplied button shows `ArrowRight` icon
  - [ ] Applied button shows `CheckCircle` icon (unchanged from original)

  **Commit**: NO (groups with all tasks)

---

- [ ] 7. Replace content rendering with paragraph splitting

  **What to do**:
  - At lines 325–328, replace the `<p>` tag with a `<div>` that splits content on newlines
  - Each non-empty paragraph becomes its own `<p key={idx}>`; empty lines become `null`

  **Must NOT do**:
  - Do not change the tab buttons or `CardHeader` of this section
  - Do not add markdown rendering or any external library

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5, 6, 8)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:324-328` — Current `<CardContent>` with single `<p>` tag

  **Exact Snippet** (replace lines 325-327):
  ```tsx
  <div className="text-sm text-zinc-300 leading-relaxed space-y-2">
    {analysis.sections[activeTab].content.split('\n').map((paragraph, idx) => (
      paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
    ))}
  </div>
  ```

  **Acceptance Criteria**:
  - [ ] No `<p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">` remains
  - [ ] `grep -c "split('\\\\n')" strategy-analysis.tsx` → 1
  - [ ] `tsc --noEmit` passes (map return type is valid)

  **Commit**: NO (groups with all tasks)

---

- [ ] 8. Add description line above strengths list

  **What to do**:
  - Inside the strengths `<CardContent>` (line 414), insert a `<p>` description before the `<ul>`
  - Text: "이 전략의 핵심 장점을 유지하세요"

  **Must NOT do**:
  - Do not modify the strengths list rendering
  - Do not change CardHeader or CardTitle

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5, 6, 7)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:414-415` — `<CardContent>` opening followed immediately by `<ul>`

  **Exact Snippet** (insert between `<CardContent>` and `<ul>`):
  ```tsx
  <p className="text-xs text-zinc-500 mb-3">이 전략의 핵심 장점을 유지하세요</p>
  ```

  **Acceptance Criteria**:
  - [ ] `grep -c '핵심 장점을 유지하세요' strategy-analysis.tsx` → 1
  - [ ] The `<p>` appears before `<ul>` inside strengths CardContent

  **Commit**: NO (groups with all tasks)

---

- [ ] 9. Add "전체 반영" bulk-apply button in improvements header

  **What to do**:
  - Replace the improvements section `<CardHeader>` (lines 333–339) with an expanded version
  - Add `className="flex flex-row items-center justify-between"` to `<CardHeader>`
  - Add a conditional `<Button>` that appears when there are unapplied improvements
  - Button calls `analysis.improvements.forEach(imp => handleApply(imp))`

  **Must NOT do**:
  - Do not use optional chaining
  - Do not change `<CardTitle>` content (icon, text, badge remain identical)
  - Do not add a new state variable — reuse `appliedIds` for the conditional

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Layout change (header becomes flex-row justify-between)

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 4)
  - **Parallel Group**: Wave 2 (with Tasks 3, 5, 6, 7, 8 — but sequenced after Task 4)
  - **Blocks**: None
  - **Blocked By**: Task 4 (button calls `handleApply` which must be rewritten first)

  **References**:

  **Pattern References**:
  - `strategy-analysis.tsx:333-339` — Current `<CardHeader>` to replace
  - `strategy-analysis.tsx:186-195` → Task 4's rewritten `handleApply` (called by this button)

  **Exact Snippet** (replace lines 333-339):
  ```tsx
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle className="text-base flex items-center gap-2">
      <Lightbulb className="w-5 h-5 text-yellow-400" />
      개선 제안
      <Badge variant="outline" className="ml-2">{analysis.improvements.length}개</Badge>
    </CardTitle>
    {analysis.improvements.length > 0 && appliedIds.size < analysis.improvements.length && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => { analysis.improvements.forEach(imp => handleApply(imp)); }}
        className="text-xs hover:bg-purple-500/10 hover:border-purple-500/50"
      >
        전체 반영
      </Button>
    )}
  </CardHeader>
  ```

  **Acceptance Criteria**:
  - [ ] `grep -c '전체 반영' strategy-analysis.tsx` → 1
  - [ ] Button only shows when `appliedIds.size < analysis.improvements.length`
  - [ ] Clicking calls `handleApply` for every improvement
  - [ ] No optional chaining in the conditional
  - [ ] `tsc --noEmit` passes

  **Commit**: YES (all 9 tasks complete)
  - Message: `feat(backtest): enhance strategy analysis with workflow/trades props, prompt generation, and bulk-apply`
  - Files: `apps/web/components/backtest/strategy-analysis.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 9 (all done) | `feat(backtest): enhance strategy analysis with workflow/trades props, prompt generation, and bulk-apply` | `apps/web/components/backtest/strategy-analysis.tsx` | `npx tsc --noEmit` + grep checks |

---

## Success Criteria

### Verification Commands
```bash
# Type safety
npx tsc --noEmit apps/web/components/backtest/strategy-analysis.tsx
# Expected: no errors

# No optional chaining
grep -n '\?\.' apps/web/components/backtest/strategy-analysis.tsx
# Expected: zero matches

# All 8 features present
grep -c 'onRegenerateStrategy' apps/web/components/backtest/strategy-analysis.tsx   # ≥3
grep -c '전략에 반영' apps/web/components/backtest/strategy-analysis.tsx              # ≥1
grep -c '전체 반영' apps/web/components/backtest/strategy-analysis.tsx               # 1
grep -c 'trades.slice(0, 50)' apps/web/components/backtest/strategy-analysis.tsx    # 1
grep -c '반영 완료' apps/web/components/backtest/strategy-analysis.tsx               # ≥1
grep -c '핵심 장점을 유지하세요' apps/web/components/backtest/strategy-analysis.tsx    # 1
grep -c "split(" apps/web/components/backtest/strategy-analysis.tsx                 # 1
grep -c '수익성.*점' apps/web/components/backtest/strategy-analysis.tsx              # ≥1
```

### Final Checklist
- [ ] All 9 TODOs complete
- [ ] Zero `?.` in file
- [ ] Zero type errors
- [ ] No new imports added (all icons pre-exist on line 8)
- [ ] No consumer files modified
- [ ] Korean prompt string in `handleApply` is grammatically correct
- [ ] "전체 반영" button conditionally hidden when all applied
