# Draft: BB_PERCENT Reorder + signalType Mapping Fix

## Requirements (confirmed)
- **Task A**: Move `BB_PERCENT` block (lines 776-788 in `indicators.ts`) to immediately after the `BOLLINGER_BANDS` block (which ends at line 239)
- **Task B**: Update `signalType` assignment in `index.tsx` line 571 so `signalType = nodeItem.id` (BUY|SELL|PASS), default case line 577 becomes `signalType: 'BUY'`

## Files
- `indicators.ts`: `/opt/coffeetree/apps/web/lib/strategy/indicators.ts`
- `index.tsx`: `/opt/coffeetree/apps/web/components/strategy/flow/index.tsx`

## Technical Decisions
- Tasks are independent (different files) → fully parallelizable
- Both are simple surgical edits → `quick` category
- No tests/builds per user constraint → LSP diagnostics only

## Scope
- INCLUDE: Two code edits + diagnostics verification
- EXCLUDE: No tests, no builds, no git
