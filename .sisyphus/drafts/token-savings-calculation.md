# Draft: Token Savings Calculation Update

## Requirements (confirmed)

- **New Function**: `updateSavingsFromTokens(claudeTokens, openaiTokens, geminiTokens)`
- **State Schema Extension**: Add `actualTokens` and `savingsRate` fields
- **Calculation**: `estimatedSavedTokens` computed from actual totals and `savingsRate`

## Technical Decisions

- Target file: `src/utils/fusion-tracker.mjs`
- State file location: `~/.omcm/fusion-state.json`

## Research Findings

### Current State Schema (line 12-27)
```javascript
{
  enabled: true,
  mode: 'balanced',
  totalTasks: 0,
  routedToOpenCode: 0,
  routingRate: 0,
  estimatedSavedTokens: 0,  // Currently: simple accumulation
  byProvider: {
    gemini: 0,
    openai: 0,
    anthropic: 0
  },
  lastUpdated: ISO timestamp
}
```

### Current Consumers of `estimatedSavedTokens`
1. `src/hud/fusion-renderer.mjs:82` - Displays saved tokens in HUD
2. `src/hooks/fusion-router-logic.mjs:368,539` - Adds fixed 1000 tokens per task
3. `src/orchestrator/fusion-orchestrator.mjs:256,392,407` - Stats tracking
4. `src/orchestrator/hybrid-ultrawork.mjs:209` - Reports saved tokens
5. Tests in `tests/unit/fusion-tracker.test.mjs`

### Current `estimatedSavedTokens` Behavior
- Accumulated via `recordRouting()` with `savedTokens` parameter
- Line 71: `state.estimatedSavedTokens += (savedTokens || 0);`
- Simple additive model, not based on actual token counts

## Open Questions

1. **savingsRate calculation**: How should `savingsRate` be computed?
   - Option A: Ratio of Claude tokens saved vs total tokens used
   - Option B: Fixed rate based on routing percentage
   - Option C: User-defined constant

2. **actualTokens structure**: Should it be:
   - Option A: Single total `{ claude, openai, gemini }`
   - Option B: Input/output split `{ claude: { input, output }, ... }`

3. **Backward compatibility**: Should existing `recordRouting()` behavior change?

## Scope Boundaries

- INCLUDE: `src/utils/fusion-tracker.mjs` modifications
- INCLUDE: New function `updateSavingsFromTokens()`
- INCLUDE: State schema extension
- INCLUDE: Unit tests for new function
- EXCLUDE: Changes to HUD rendering (separate task if needed)
- EXCLUDE: Changes to other orchestrator files

## Assumptions Made

1. `actualTokens` will be a simple object with provider totals
2. `savingsRate` is a percentage (0-100 or 0-1 decimal)
3. Formula: `estimatedSavedTokens = claudeTokens * savingsRate` (Claude tokens represent what would have been used if not offloaded)
