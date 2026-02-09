# Investigation Plan: AI-Generated Strategy → Backtest "No Trade" Bug

## TL;DR

> **Quick Summary**: Investigate why AI natural-language strategy generation followed by backtest shows "워크플로우에 전략 노드(지표/연산자/시그널)가 없어 거래가 발생하지 않았습니다" even when the canvas visually contains strategy nodes. Two competing hypotheses: (H1) stale `workflowRef` race condition, (H2) misleading UI message masking legitimate no-trade results.
>
> **Deliverables**: Root cause identification with logged evidence at each pipeline stage
>
> **Estimated Effort**: Medium (investigation only, no code changes)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Wave 1 (all parallel) → Wave 2 (synthesis)

---

## Context

### Original Request
User reports that after using the AI prompt bar to generate a natural-language strategy (which visually populates the canvas with indicator/operator/signal nodes), clicking "backtest" produces the warning message implying no strategy nodes exist.

### Data Flow Under Investigation

```
[PromptBar AI submit]
    → setNodes/setEdges (React state in flow/index.tsx:770,890)
        → useEffect([nodes, edges, isInitialized]) (flow/index.tsx:112-117)
            → onWorkflowChange({ nodes, edges }) callback
                → handleWorkflowChange (page.tsx:154-155)
                    → workflowRef.current = workflow
                        → [USER CLICKS BACKTEST]
                            → handleRunBacktest reads workflowRef.current (page.tsx:416-427)
                                → serializes: { id, type, data } per node
                                    → POST /api/backtest with { workflow, config }
                                        → runBacktest(workflow, backtestConfig)
                                            → hasStrategyLogic = nodes.some(n.type in ['indicator','operator','signal'])
                                                → if false → empty trades → UI shows warning
```

### Suspected Failure Points

| ID | Location | Hypothesis | Likelihood |
|----|----------|------------|------------|
| **FP-1** | `workflowRef.current` at backtest time | Stale ref: `onWorkflowChange` hasn't fired yet when user clicks backtest (race between React state batch and ref update) | HIGH |
| **FP-2** | Serialization in `handleRunBacktest` (page.tsx:416-419) | `node.type` reads empty string via `String(node.type || '')` fallback — React Flow node's `type` might be stored differently than plain `.type` | MEDIUM |
| **FP-3** | `isInitialized` guard (flow/index.tsx:113) | After AI adds nodes, `isInitialized` might be `false` during certain flows, blocking `onWorkflowChange` from firing | MEDIUM |
| **FP-4** | `hasStrategyLogic` check (backtest-engine.ts:1338,1737) | Check is correct but strategy produces no signals — `evaluateWorkflowSignal` returns `{ shouldBuy: false, shouldSell: false }` for all candles | MEDIUM |
| **FP-5** | UI message at page.tsx:902-913 | Message condition is `trades.length === 0` regardless of cause — misleading when nodes exist but simply no trade was triggered | HIGH (design issue) |

---

## Work Objectives

### Core Objective
Determine which of FP-1 through FP-5 (or combination) produces the observed behavior, with logged evidence at each stage.

### Definition of Done
- [ ] Each failure point has PASS/FAIL verdict with captured evidence
- [ ] Root cause conclusively identified with reproduction scenario
- [ ] False-positive message scenario (FP-5) confirmed or excluded

### Must NOT Do
- No code changes, no patches, no refactoring
- No new files except temporary console.log additions for investigation (to be noted as "what to add" in verification steps, not actually added)

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 (workflowRef timing) | None | Independent: inspect ref update chain |
| Task 2 (serialization fidelity) | None | Independent: inspect node.type mapping |
| Task 3 (isInitialized gate) | None | Independent: inspect initialization flow |
| Task 4 (backtest-engine logic) | None | Independent: inspect engine-side behavior |
| Task 5 (UI message accuracy) | None | Independent: inspect conditional rendering |
| Task 6 (synthesis) | Tasks 1-5 | Combines all verdicts into root cause |

## Parallel Execution Graph

```
Wave 1 (Start immediately — all independent):
├── Task 1: workflowRef timing analysis
├── Task 2: serialization type-fidelity audit
├── Task 3: isInitialized gate analysis
├── Task 4: backtest-engine hasStrategyLogic + evaluateWorkflowSignal audit
└── Task 5: UI message condition accuracy audit

Wave 2 (After Wave 1):
└── Task 6: Synthesis — combine verdicts, declare root cause

Critical Path: Any Wave-1 task → Task 6
```

---

## TODOs

### Task 1: workflowRef Timing Analysis (Race Condition Check)

**What to investigate**:
Determine if `workflowRef.current` can be stale when `handleRunBacktest` reads it.

**Verification Steps**:

1. **Inspect the update chain timing**:
   - `flow/index.tsx:112-117`: The `useEffect([nodes, edges, isInitialized])` fires asynchronously AFTER React commit phase. When AI adds nodes via `setNodes` (line 770), React batches the state update. The `useEffect` runs in a microtask after paint.
   - `page.tsx:154-155`: `handleWorkflowChange` is `useCallback([], [])` with empty deps — stable reference ✓
   - `page.tsx:416`: `workflowRef.current.nodes` is read synchronously in the click handler.

2. **Specific check — log injection points** (describe, don't implement):
   ```
   // In flow/index.tsx useEffect (line 112):
   console.log('[PROBE-1a] onWorkflowChange firing', { 
     nodeCount: nodes.length, 
     types: nodes.map(n => n.type),
     timestamp: Date.now() 
   });
   
   // In page.tsx handleRunBacktest (line 341):
   console.log('[PROBE-1b] workflowRef at backtest time', {
     nodeCount: workflowRef.current.nodes.length,
     types: workflowRef.current.nodes.map(n => n.type),
     timestamp: Date.now()
   });
   ```

3. **Reproduce scenario**: 
   - Use AI prompt to generate strategy → wait 0s → immediately click backtest
   - Use AI prompt to generate strategy → wait 2s → click backtest
   - Compare PROBE-1a vs PROBE-1b timestamps and node counts

**Pass/Fail Criteria**:
| Result | Verdict |
|--------|---------|
| PROBE-1b shows `nodeCount: 0` or only `area` types while PROBE-1a hasn't fired yet | **FAIL → FP-1 CONFIRMED** (race condition) |
| PROBE-1b shows correct node types matching canvas AND PROBE-1a timestamp < PROBE-1b | **PASS → FP-1 ruled out** |
| Intermittent: sometimes stale, sometimes correct | **FAIL → FP-1 CONFIRMED** (timing-dependent race) |

**Recommended Agent Profile**:
- **Category**: `ultrabrain` — Requires reasoning about React lifecycle timing
- **Skills**: [`typescript-programmer`, `frontend-ui-ux`]
  - `typescript-programmer`: Understanding React hooks execution order
  - `frontend-ui-ux`: React Flow component lifecycle knowledge

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 6
- **Blocked By**: None

**References**:
- `components/strategy/flow/index.tsx:112-117` — useEffect that fires onWorkflowChange (the PRODUCER side of the ref)
- `app/(dashboard)/strategies/builder/page.tsx:149-156` — workflowRef declaration + handleWorkflowChange (the CONSUMER side)
- `app/(dashboard)/strategies/builder/page.tsx:334-427` — handleRunBacktest that reads workflowRef.current (the READER)
- `components/strategy/flow/index.tsx:770-890` — AI node insertion via setNodes/setEdges (the TRIGGER)

**Acceptance Criteria**:
- [ ] Documented whether PROBE-1a always precedes PROBE-1b for the AI-generation flow
- [ ] Verdict: CONFIRMED or RULED OUT with timestamp evidence

---

### Task 2: Serialization Type-Fidelity Audit

**What to investigate**:
Verify that `node.type` survives the serialization chain from React Flow state → workflowRef → API payload → backtest engine intact, specifically for AI-generated nodes.

**Verification Steps**:

1. **Trace the type field through each transformation**:

   | Stage | Code Location | Transform | Risk |
   |-------|--------------|-----------|------|
   | React Flow internal | `useNodesState` returns `Node<T>` | `.type` is React Flow's node type string | None — RF stores type |
   | onWorkflowChange | `flow/index.tsx:114` | Passes `{ nodes, edges }` directly — no mapping | None |
   | workflowRef assign | `page.tsx:155` | Direct assignment `workflowRef.current = workflow` | None |
   | Serialization | `page.tsx:416-419` | `String(node.type \|\| '')` | **RISK**: If RF stores type elsewhere (e.g., `node.data.nodeType`) this maps to `''` |
   | API validation | `route.ts:99` | Only checks `Array.isArray(workflow.nodes)` | No type validation |
   | Engine check | `backtest-engine.ts:1338-1340` | `n.type === 'indicator' \|\| n.type === 'operator' \|\| n.type === 'signal'` | Exact string match |

2. **Critical question**: When AI generates nodes in `flow/index.tsx:770-800`, the `newNodes` already have `type: 'indicator'` etc. as WorkflowNode. But `workflowRef` is typed as `{ nodes: Record<string, unknown>[] }` (page.tsx:149). The serialization at page.tsx:416 does `String(node.type || '')`. 
   
   **Check**: Does React Flow's `useNodesState` store `type` as a top-level `.type` property or nested differently?

3. **Log injection point**:
   ```
   // In page.tsx handleRunBacktest, after serialization (line 427):
   console.log('[PROBE-2] serialized workflow', JSON.stringify(workflow, null, 2));
   ```

4. **Also verify API received payload**:
   ```
   // In route.ts POST handler (after line 157):
   console.log('[PROBE-2-API] received workflow nodes types:', 
     workflow.nodes.map(n => ({ id: n.id, type: n.type })));
   ```

**Pass/Fail Criteria**:
| Result | Verdict |
|--------|---------|
| Serialized nodes have `type: 'indicator'`, `type: 'operator'`, `type: 'signal'` correctly | **PASS** |
| Serialized nodes have `type: ''` or `type: 'area'` only | **FAIL → FP-2 CONFIRMED** (type lost in serialization) |
| Some nodes correct, some empty | **FAIL → FP-2 PARTIAL** (selective type loss) |

**Recommended Agent Profile**:
- **Category**: `quick` — Straightforward data-tracing
- **Skills**: [`typescript-programmer`]
  - `typescript-programmer`: TypeScript type narrowing and React Flow types

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 6
- **Blocked By**: None

**References**:
- `app/(dashboard)/strategies/builder/page.tsx:149` — workflowRef type declaration (`Record<string, unknown>[]` loses type info)
- `app/(dashboard)/strategies/builder/page.tsx:414-427` — serialization mapping with `String(node.type || '')`
- `lib/strategy/backtest-engine.ts:140-143` — `SerializedNode.type: string` target type
- `lib/strategy/backtest-engine.ts:1338-1340` — the `hasStrategyLogic` consumer

**Acceptance Criteria**:
- [ ] Confirmed whether `.type` property exists on nodes at workflowRef read time
- [ ] Logged serialized payload shows correct or incorrect types
- [ ] Verdict: CONFIRMED or RULED OUT

---

### Task 3: isInitialized Gate Analysis

**What to investigate**:
Determine if `isInitialized` can block `onWorkflowChange` from firing after AI node insertion.

**Verification Steps**:

1. **Trace isInitialized lifecycle**:
   - `flow/index.tsx:100`: `const [isInitialized, setIsInitialized] = useState(false)`
   - `flow/index.tsx:124-150`: The initialization `useEffect` sets `isInitialized = true` after auto-layout on first render
   - `flow/index.tsx:113`: Guard: `if (onWorkflowChange && isInitialized)`

2. **Question**: Can a user interact with the AI prompt bar BEFORE `isInitialized` becomes `true`?
   - Check if the PromptBar is rendered regardless of `isInitialized`
   - Check if auto-layout effect (line 124) can be delayed or skipped

3. **Log injection point**:
   ```
   // In flow/index.tsx useEffect (line 112):
   console.log('[PROBE-3] onWorkflowChange guard', { 
     isInitialized, 
     hasCallback: !!onWorkflowChange,
     nodeCount: nodes.length 
   });
   ```

4. **Edge case**: If AI prompt bar triggers DURING initialization (component mounted but auto-layout not yet done), the guard blocks the callback → `workflowRef` stays at `{ nodes: [], edges: [] }`.

**Pass/Fail Criteria**:
| Result | Verdict |
|--------|---------|
| `isInitialized` is always `true` before AI can add nodes (PromptBar blocked or init is synchronous) | **PASS** |
| `isInitialized` can be `false` when AI nodes arrive → callback blocked | **FAIL → FP-3 CONFIRMED** |

**Recommended Agent Profile**:
- **Category**: `quick` — Focused lifecycle trace
- **Skills**: [`typescript-programmer`, `frontend-ui-ux`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 6
- **Blocked By**: None

**References**:
- `components/strategy/flow/index.tsx:100` — `isInitialized` state declaration
- `components/strategy/flow/index.tsx:112-117` — The guarded useEffect
- `components/strategy/flow/index.tsx:124-150` — Initialization effect that sets `isInitialized = true`
- `components/strategy/flow/index.tsx:741-904` — PromptBar render position (is it gated by isInitialized?)

**Acceptance Criteria**:
- [ ] Determined ordering guarantee between initialization and AI prompt availability
- [ ] Verdict: CONFIRMED or RULED OUT

---

### Task 4: Backtest-Engine Logic Audit (hasStrategyLogic + evaluateWorkflowSignal)

**What to investigate**:
Even if nodes arrive correctly, verify whether `evaluateWorkflowSignal` can produce zero trades for a valid strategy (making the UI message misleading rather than the pipeline broken).

**Verification Steps**:

1. **Audit `hasStrategyLogic` at two locations**:
   - `backtest-engine.ts:1338-1340` (multi-symbol path)
   - `backtest-engine.ts:1737-1739` (single-symbol path)
   - Both check: `n.type === 'indicator' || n.type === 'operator' || n.type === 'signal'`
   - **Check**: Are there any code paths where `hasStrategyLogic = true` but all signal evaluations return `{ shouldBuy: false, shouldSell: false }`?

2. **Audit `evaluateWorkflowSignal` (line 914-)**:
   - Inspect how signal nodes are found: `nodes.filter(n => n.type === 'signal')` (verify this exists)
   - What happens when edges are present but don't form a complete graph? (e.g., indicator exists but no edge to operator)
   - What happens when operator has < 2 incoming edges? (line 986: `if (incomingEdges.length >= 2)`)
   - **Edge case**: AI-generated nodes might not have proper edge connections → signal always false

3. **Log injection points**:
   ```
   // In evaluateWorkflowSignal (after line 920):
   console.log('[PROBE-4] evaluateWorkflowSignal', {
     nodeTypes: nodes.map(n => n.type),
     edgeCount: edges.length,
     signalNodes: nodes.filter(n => n.type === 'signal').map(n => n.id)
   });
   ```

4. **Also check**: Does the engine return `trades: []` (empty array) when `hasStrategyLogic` is false? Or does it return a different structure? Trace what happens in the `!hasStrategyLogic` branch.

**Pass/Fail Criteria**:
| Result | Verdict |
|--------|---------|
| `hasStrategyLogic` correctly evaluates to `true` for properly typed nodes AND `evaluateWorkflowSignal` returns signals for connected graphs | **PASS — engine logic is sound** |
| `hasStrategyLogic` is `true` but signals are always `{false, false}` due to incomplete graph/edges | **FAIL → FP-4 CONFIRMED** (valid nodes but broken graph = no trades) |
| Engine never reaches `hasStrategyLogic` check due to earlier bailout | **FAIL → different FP** |

**Recommended Agent Profile**:
- **Category**: `ultrabrain` — Complex control flow analysis
- **Skills**: [`typescript-programmer`]
  - `typescript-programmer`: Tracing graph evaluation logic

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 6
- **Blocked By**: None

**References**:
- `lib/strategy/backtest-engine.ts:1338-1340` — hasStrategyLogic check (multi-symbol)
- `lib/strategy/backtest-engine.ts:1737-1739` — hasStrategyLogic check (single-symbol)
- `lib/strategy/backtest-engine.ts:914-1000+` — evaluateWorkflowSignal full implementation
- `lib/strategy/backtest-engine.ts:1350-1380` — what happens inside `if (hasStrategyLogic)` block
- `lib/strategy/backtest-engine.ts:1749-1800` — single-symbol signal evaluation and trade execution

**Acceptance Criteria**:
- [ ] Documented all code paths where `trades` array stays empty
- [ ] Determined if incomplete graph (nodes exist, edges missing/wrong) produces empty trades
- [ ] Verdict: CONFIRMED or RULED OUT

---

### Task 5: UI Message Condition Accuracy Audit

**What to investigate**:
The warning message at `page.tsx:902-913` is shown when `backtestResults.trades.length === 0`. This condition conflates "no strategy nodes" with "strategy exists but generated no trades". Determine if this is the actual observed scenario.

**Verification Steps**:

1. **Read the exact condition** (page.tsx:902):
   ```tsx
   {backtestResults.trades.length > 0 ? (
     <TradeTable ... />
   ) : (
     <div>워크플로우에 전략 노드(지표/연산자/시그널)가 없어 거래가 발생하지 않았습니다.</div>
   )}
   ```
   This ALWAYS shows the "no strategy nodes" message for ANY zero-trade result.

2. **Enumerate all causes of `trades.length === 0`**:
   | Cause | Is "No Strategy Nodes" Accurate? |
   |-------|----------------------------------|
   | `hasStrategyLogic = false` (no indicator/operator/signal nodes) | YES — message is correct |
   | `hasStrategyLogic = true` but signals never trigger buy | NO — nodes exist, just no trades |
   | `hasStrategyLogic = true` but data is too short for indicators (e.g., RSI needs 14 periods) | NO — data issue, not node issue |
   | `hasStrategyLogic = true` but edges don't connect properly | NO — graph issue, not node absence |
   | stale workflowRef with empty nodes | YES — but misleading about root cause |

3. **Key insight**: The API response `BacktestResult` does NOT include `hasStrategyLogic` flag. The client has NO WAY to distinguish between "no nodes" and "nodes but no trades". The message hardcodes the "no nodes" explanation for ALL zero-trade scenarios.

**Pass/Fail Criteria**:
| Result | Verdict |
|--------|---------|
| The message correctly identifies the ACTUAL cause (nodes truly absent from payload) | **PASS — message is accurate for the failure** |
| The message is shown even when nodes ARE present in the payload but just didn't generate trades | **FAIL → FP-5 CONFIRMED** (misleading message) |

**Recommended Agent Profile**:
- **Category**: `quick` — Direct code reading
- **Skills**: [`typescript-programmer`, `frontend-ui-ux`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 6
- **Blocked By**: None

**References**:
- `app/(dashboard)/strategies/builder/page.tsx:902-914` — The conditional rendering with the message
- `lib/strategy/backtest-engine.ts:1338-1340` — hasStrategyLogic determines if trades can be generated
- `app/api/backtest/route.ts:217-222` — Response shape (`result` passed through without adding metadata)

**Acceptance Criteria**:
- [ ] Enumerated all zero-trade causes
- [ ] Determined if BacktestResult contains enough info to differentiate
- [ ] Verdict: CONFIRMED or RULED OUT as contributing to user confusion

---

### Task 6: Synthesis — Root Cause Declaration

**What to do**:
Combine verdicts from Tasks 1-5 and declare root cause(s).

**Decision Matrix**:

| Scenario | Root Cause | Fix Category |
|----------|-----------|--------------|
| FP-1 only | Race condition: ref stale at click time | Sync fix (read from state, not ref) |
| FP-2 only | Type lost in serialization | Serialization fix |
| FP-3 only | Init guard blocks callback | Lifecycle fix |
| FP-4 only | Engine correct, but signal never triggers | Strategy validation / user feedback |
| FP-5 only | Message misleading | UX copy fix + add engine metadata |
| FP-1 + FP-5 | Race condition + misleading message | Both fixes needed |
| FP-4 + FP-5 | Valid no-trade + misleading message | Message must differentiate causes |

**Recommended Agent Profile**:
- **Category**: `ultrabrain` — Multi-factor synthesis
- **Skills**: [`typescript-programmer`, `frontend-ui-ux`]

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2 (sequential after all Wave 1)
- **Blocks**: None (final task)
- **Blocked By**: Tasks 1, 2, 3, 4, 5

**Acceptance Criteria**:
- [ ] Single root-cause statement with supporting evidence from each task
- [ ] Recommended fix category (not implementation) identified

---

## Preliminary Static Analysis (Pre-Investigation Findings)

Based on code reading during plan creation, the following are **already observable** without runtime probes:

### Finding A: FP-5 is CONFIRMED statically
The condition at `page.tsx:902` is `backtestResults.trades.length > 0`. The message "워크플로우에 전략 노드가 없어..." is shown for ALL zero-trade results regardless of cause. The `BacktestResult` type returned from the API does not include a `hasStrategyLogic` or `noTradeReason` field. **This is a confirmed UX defect** — the message is misleading when strategy nodes exist but produce no trades.

### Finding B: FP-1 is HIGHLY PROBABLE
The data flow is: `setNodes()` (async React state) → `useEffect` (fires after paint) → `onWorkflowChange` → `workflowRef.current = workflow`. If a user clicks "backtest" in the same event loop tick as AI node generation, `workflowRef.current` will still hold the previous value (`{ nodes: [], edges: [] }` for initial state). This is a classic React stale-ref-via-useEffect pattern.

### Finding C: FP-2 requires runtime verification
The serialization `String(node.type || '')` at page.tsx:417 depends on React Flow's internal node structure. React Flow v12 `Node<T>` has `.type` as a top-level string property, so this SHOULD work. But verification needed because `workflowRef` types nodes as `Record<string, unknown>[]`, losing type safety.

### Finding D: FP-3 is LOW probability
The `isInitialized` flag is set in a `useEffect` that runs on mount. The PromptBar is rendered inside the same component (line 741). By the time a user types a prompt and AI responds, the component will have been mounted for seconds — `isInitialized` should be `true`. Only possible if the component remounts.

---

## Commit Strategy

N/A — Investigation only. No code changes.

---

## Success Criteria

### Final Checklist
- [ ] All 5 failure points have PASS/FAIL verdicts with evidence
- [ ] Root cause declared with confidence level
- [ ] Reproduction steps documented (exact user actions to trigger)
- [ ] Misleading message scenario (FP-5) separately confirmed/denied from pipeline failure
- [ ] Clear recommendation for which failure point(s) to fix first
