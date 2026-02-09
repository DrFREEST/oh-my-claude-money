# Draft: strategy-analysis.tsx Edits

## Requirements (confirmed)
- Add 3 new props: `workflow`, `trades`, `onRegenerateStrategy`
- Expand `handleAnalyze` payload with `workflow` and `trades` (max 50)
- Rewrite `handleApply` to generate Korean prompt from parameterChanges and call `onRegenerateStrategy`
- Add inline scores to grade card under summary
- Change improvement button text: "반영" → "전략에 반영", "반영됨" → "반영 완료"
- Replace `<p>` content rendering with `<div>` + newline splitting
- Add description line above strengths list
- Add "전체 반영" bulk-apply button in improvements card header

## Technical Decisions
- Single file modification only: `strategy-analysis.tsx`
- No optional chaining (`?.`) — use explicit `&&` guards
- Korean comments following existing style
- ArrowRight already imported (line 8) — no new import needed

## Scope Boundaries
- INCLUDE: All 8 changes above in `strategy-analysis.tsx`
- EXCLUDE: Consumer files (`backtest/page.tsx`, `backtest/[id]/page.tsx`) — out of scope
