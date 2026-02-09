# Investigation Plan: Backtest "No Strategy Nodes" Bug

## TL;DR

> **Symptom**: After AI generates a strategy, running backtest still errors: "워크플로우에 전략 노드(지표/연산자/시그널)가 없어 거래가 발생하지 않았습니다"
>
> **User's prior fix**: Changed `backtest-engine.ts:1067-1072` to match `signalType: 'BUY'/'SELL'` — error persists, suggesting nodes never reach the engine at all.
>
> **Root Cause Hypothesis**: The workflow data flowing into the backtest engine has zero `indicator`/`operator`/`signal` nodes. The UI error message (page.tsx line 910) fires when `trades.length === 0`, but the deeper cause is `hasStrategyLogic === false` at engine line 1338/1737.
>
> **Project**: `/opt/coffeetree/apps/web`
> **Estimated Effort**: Short (2-3 hours investigation)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 4 → Task 6 → Task 7

---

## Context

### Architecture Summary (from exploration)

The data flow is:

```
AI Prompt → /api/ai/generate-strategy (Claude API)
         → returns { nodes: WorkflowNode[], edges: WorkflowEdge[] }
         → prompt-bar.tsx onSubmit callback
         → flow/index.tsx setNodes()/setEdges() (ReactFlow state)
         → useEffect[nodes, edges] fires onWorkflowChange({ nodes, edges })
         → builder/page.tsx handleWorkflowChange stores to workflowRef.current
         → User clicks "Run Backtest"
         → handleRunBacktest reads workflowRef.current
         → Serializes to { nodes: [{id, type, data}], edges: [{id, source, target, data}] }
         → POST /api/backtest with { workflow, config }
         → route.ts calls runBacktest(workflow, config)
         → backtest-engine.ts checks hasStrategyLogic = workflow.nodes.some(n => n.type === 'indicator' || ...)
```

### Key Files

| File | Role |
|------|------|
| `components/strategy/flow/panels/prompt-bar.tsx` | AI strategy generation (calls `/api/ai/generate-strategy`) |
| `components/strategy/flow/index.tsx` | VisualStrategyBuilder — manages ReactFlow nodes/edges state, fires `onWorkflowChange` |
| `app/(dashboard)/strategies/builder/page.tsx` | Builder page — receives `onWorkflowChange`, stores to `workflowRef`, runs backtest |
| `app/api/ai/generate-strategy/route.ts` | Claude API call to generate strategy nodes |
| `app/api/backtest/route.ts` | Backtest API — receives workflow from client, calls `runBacktest()` |
| `lib/strategy/backtest-engine.ts` | Core engine — `hasStrategyLogic` check at lines 1338, 1737 |

### Critical Code Points

1. **`hasStrategyLogic` check** (engine lines 1338-1340, 1737-1739):
   ```ts
   const hasStrategyLogic = workflow.nodes.some(
     n => n.type === 'indicator' || n.type === 'operator' || n.type === 'signal'
   );
   ```
   If this is `false`, the engine skips ALL trade logic → 0 trades → UI shows error.

2. **Serialization in builder** (page.tsx lines 414-427):
   ```ts
   const workflow = {
     nodes: workflowRef.current.nodes.map((node: Record<string, unknown>) => ({
       id: String(node.id || ''),
       type: String(node.type || ''),
       data: (node.data || {}) as Record<string, unknown>,
     })),
     ...
   };
   ```
   This reads from `workflowRef.current` which is set by `handleWorkflowChange`.

3. **`onWorkflowChange` propagation** (flow/index.tsx lines 112-117):
   ```ts
   useEffect(() => {
     if (onWorkflowChange && isInitialized) {
       onWorkflowChange({ nodes, edges });
     }
   }, [nodes, edges, isInitialized]);
   ```

4. **`handleWorkflowChange` storage** (page.tsx lines 154-156):
   ```ts
   const handleWorkflowChange = useCallback((workflow) => {
     workflowRef.current = workflow;
   }, []);
   ```

---

## Hypotheses

### H1: `onWorkflowChange` fires BEFORE AI nodes are added to ReactFlow state (TIMING)

**Theory**: The `useEffect` on `[nodes, edges, isInitialized]` fires with the OLD nodes before `setNodes` has propagated the new AI-generated nodes. By the time the user clicks "Run Backtest", `workflowRef.current` might still hold the pre-AI state (only `area` nodes).

**Evidence needed**: Add `console.log` in `handleWorkflowChange` showing `workflow.nodes.map(n => n.type)` and compare with what's sent to `/api/backtest`.

**Falsification**: If `workflowRef.current` at backtest-time contains indicator/operator/signal nodes, H1 is false.

---

### H2: Node `type` field is lost during ReactFlow state management

**Theory**: ReactFlow's `useNodesState` may strip or transform the `type` field. The nodes stored in `workflowRef.current` may have `type: undefined` or a ReactFlow-internal type instead of `'indicator'`/`'operator'`/`'signal'`.

**Evidence needed**: Inspect the actual `node.type` values in `workflowRef.current.nodes` at backtest time.

**Falsification**: If `node.type` matches expected values (`indicator`, `operator`, `signal`), H2 is false.

---

### H3: Serialization strips `type` (builder page.tsx line 418)

**Theory**: `String(node.type || '')` — if `node.type` is somehow falsy (undefined, null), it becomes `''` which won't match `'indicator'`/`'operator'`/`'signal'`.

**Evidence needed**: Log the serialized workflow just before `fetch('/api/backtest', ...)`.

**Falsification**: If serialized `type` values are correct, H3 is false.

---

### H4: `isInitialized` flag blocks `onWorkflowChange` from firing after AI node addition

**Theory**: If `isInitialized` is `false` when AI nodes are added (or gets reset), the `useEffect` guard `if (onWorkflowChange && isInitialized)` prevents propagation.

**Evidence needed**: Check when `isInitialized` becomes `true` and whether it stays `true` after AI nodes are added.

**Falsification**: If `isInitialized` is `true` when AI nodes are set, H4 is false.

---

### H5: AI-generated nodes have `type` set on a nested property, not the top-level ReactFlow `type`

**Theory**: The AI API returns nodes with `type: 'indicator'` etc., but when merged into ReactFlow via `setNodes`, the `type` field may be overwritten by ReactFlow's node type system (e.g., custom node type registration). ReactFlow expects `type` to match registered custom node components, and if `'indicator'` isn't registered as a custom node type, ReactFlow might default it.

**Evidence needed**: Check if custom node types are registered in ReactFlow. Check `nodeTypes` prop on `<ReactFlow>`.

**Falsification**: If `nodeTypes` includes `indicator`, `operator`, `signal` mappings, H5 is less likely (but still check actual runtime values).

---

### H6: The `workflowRef.current` only contains `area` nodes (the default empty workflow)

**Theory**: `createEmptyWorkflow()` (line 78) initializes with area-only nodes. If `onWorkflowChange` never fires with updated nodes (due to H1 or H4), the ref always contains area-only nodes. Since `hasStrategyLogic` checks for `indicator`/`operator`/`signal` and areas are not in that list → always `false`.

**Evidence needed**: Log `workflowRef.current.nodes.length` and their types at backtest time.

**Falsification**: If nodes beyond areas exist in the ref, H6 is false.

---

## Investigation Tasks

### Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Console logging at key checkpoints — foundational |
| Task 2 | None | Inspect ReactFlow node type registration — independent check |
| Task 3 | None | Inspect AI API response — independent check |
| Task 4 | Task 1 | Analyze console output from Task 1's logs |
| Task 5 | Task 2, Task 3 | Compare AI output types vs ReactFlow types |
| Task 6 | Task 4, Task 5 | Narrow to root cause |
| Task 7 | Task 6 | Write investigation report |

### Parallel Execution Graph

```
Wave 1 (Start immediately — all independent):
├── Task 1: Add diagnostic console.log statements
├── Task 2: Inspect ReactFlow nodeTypes registration
└── Task 3: Test AI API response directly

Wave 2 (After Wave 1):
├── Task 4: Run reproduction scenario and collect logs (depends: Task 1)
└── Task 5: Cross-reference AI types vs ReactFlow types (depends: Task 2, 3)

Wave 3 (After Wave 2):
├── Task 6: Root cause determination (depends: Task 4, 5)
└── Task 7: Write investigation report (depends: Task 6)

Critical Path: Task 1 → Task 4 → Task 6 → Task 7
```

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | `category="quick"` with `load_skills=["typescript-programmer"]` |
| 2 | 4, 5 | Task 4: `category="quick"`, `load_skills=["dev-browser"]`; Task 5: `category="quick"`, `load_skills=["typescript-programmer"]` |
| 3 | 6, 7 | `category="unspecified-low"`, `load_skills=["typescript-programmer"]` |

---

## TODOs

- [ ] 1. Add diagnostic `console.log` at 5 checkpoint locations

  **What to do**:
  Add temporary `console.log` statements at these exact locations to trace node data through the pipeline:

  **Checkpoint A** — `components/strategy/flow/index.tsx` line ~744 (onSubmit callback):
  ```ts
  console.log('[DIAG-A] AI nodes received in onSubmit:', {
    newNodesTypes: newNodes?.map(n => ({ id: n.id, type: n.type })),
    newNodesCount: newNodes?.length,
  });
  ```

  **Checkpoint B** — `components/strategy/flow/index.tsx` line ~113 (onWorkflowChange useEffect):
  ```ts
  console.log('[DIAG-B] onWorkflowChange firing:', {
    nodeTypes: nodes.map(n => ({ id: n.id, type: n.type })),
    totalNodes: nodes.length,
    nonAreaNodes: nodes.filter(n => n.type !== 'area').length,
    isInitialized,
  });
  ```

  **Checkpoint C** — `app/(dashboard)/strategies/builder/page.tsx` line ~155 (handleWorkflowChange):
  ```ts
  console.log('[DIAG-C] workflowRef updated:', {
    nodeTypes: workflow.nodes.map((n: any) => ({ id: n.id, type: n.type })),
    totalNodes: workflow.nodes.length,
  });
  ```

  **Checkpoint D** — `app/(dashboard)/strategies/builder/page.tsx` line ~415 (handleRunBacktest, before serialization):
  ```ts
  console.log('[DIAG-D] Backtest workflow pre-serialization:', {
    rawNodes: workflowRef.current.nodes.map((n: any) => ({ id: n.id, type: n.type })),
    rawCount: workflowRef.current.nodes.length,
  });
  ```

  **Checkpoint E** — `app/(dashboard)/strategies/builder/page.tsx` line ~446 (before fetch):
  ```ts
  console.log('[DIAG-E] Backtest payload:', {
    serializedNodes: workflow.nodes.map(n => ({ id: n.id, type: n.type })),
    serializedCount: workflow.nodes.length,
  });
  ```

  **Must NOT do**:
  - Do not change any logic
  - Do not add more than simple console.log

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Need TypeScript expertise for correct type annotations in log statements

  **Skills Evaluated but Omitted**:
  - `dev-browser`: Not needed — only adding code, not running browser
  - `frontend-ui-ux`: No UI changes
  - `git-master`: No commits in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/web/components/strategy/flow/index.tsx:744` — onSubmit callback where AI nodes arrive. Insert DIAG-A right after line 745 (`console.log('AI 프롬프트:', prompt);`)
  - `apps/web/components/strategy/flow/index.tsx:112-117` — useEffect that calls onWorkflowChange. Insert DIAG-B before line 114 (`onWorkflowChange({ nodes, edges });`)
  - `apps/web/app/(dashboard)/strategies/builder/page.tsx:154-156` — handleWorkflowChange stores to ref. Insert DIAG-C before line 155 (`workflowRef.current = workflow;`)
  - `apps/web/app/(dashboard)/strategies/builder/page.tsx:414-427` — handleRunBacktest serialization. Insert DIAG-D before line 415
  - `apps/web/app/(dashboard)/strategies/builder/page.tsx:446-449` — fetch call. Insert DIAG-E before line 446

  **Acceptance Criteria**:
  - [ ] 5 console.log statements added at exact locations described above
  - [ ] No logic changes — only logging
  - [ ] TypeScript compilation succeeds (no type errors introduced)

  **Commit**: NO (diagnostic only, will be removed later)

---

- [ ] 2. Inspect ReactFlow `nodeTypes` registration

  **What to do**:
  - Find where `<ReactFlow>` is rendered (likely in `flow/canvas.tsx` or `flow/index.tsx`)
  - Check the `nodeTypes` prop — does it include `indicator`, `operator`, `signal`?
  - If custom node types are NOT registered, ReactFlow may override `node.type` to `'default'`
  - Check ReactFlow v12 docs: does `useNodesState` preserve custom `type` values even if not registered?

  **Must NOT do**:
  - Do not change any code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding ReactFlow TypeScript typings

  **Skills Evaluated but Omitted**:
  - `dev-browser`: Not running browser
  - `frontend-ui-ux`: Not designing UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `apps/web/components/strategy/flow/index.tsx` — Main builder component with ReactFlow
  - `apps/web/components/strategy/flow/canvas.tsx` — Canvas component (likely renders `<ReactFlow>`)
  - `@xyflow/react` v12 — nodeTypes documentation

  **Acceptance Criteria**:
  - [ ] Report: What `nodeTypes` are registered in `<ReactFlow>`?
  - [ ] Report: Does ReactFlow v12 `useNodesState` preserve custom `type` values for unregistered types?
  - [ ] Verdict: Is H5 plausible? YES/NO with evidence

  **Commit**: NO

---

- [ ] 3. Test AI API response directly

  **What to do**:
  - Send a test request to `/api/ai/generate-strategy` via `curl` with a simple strategy prompt
  - Inspect the response JSON: do nodes have correct `type` values (`indicator`, `operator`, `signal`)?
  - Check if `signalType` is `'BUY'`/`'SELL'` (matching what engine expects at line 1068)

  ```bash
  curl -s -X POST http://localhost:3000/api/ai/generate-strategy \
    -H "Content-Type: application/json" \
    -d '{"prompt": "RSI가 30 이하이면 매수, 70 이상이면 매도하는 전략"}' \
    | jq '.nodes[] | {id, type, signalType: .data.signalType, indicatorType: .data.indicatorType}'
  ```

  **Must NOT do**:
  - Do not change API code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding expected TypeScript interfaces for node types

  **Skills Evaluated but Omitted**:
  - `dev-browser`: curl is sufficient, no browser needed
  - `data-scientist`: Not analyzing data

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `apps/web/app/api/ai/generate-strategy/route.ts` — API endpoint
  - `apps/web/app/api/ai/generate-strategy/route.ts:7-42` — WorkflowNode interface showing expected types
  - `apps/web/lib/strategy/backtest-engine.ts:1067-1072` — signalType matching logic

  **Acceptance Criteria**:
  - [ ] Raw API response captured and saved
  - [ ] Report: Node types match expected values (`indicator`, `operator`, `signal`)? YES/NO
  - [ ] Report: signalType uses `BUY`/`SELL` (not `entry`/`exit`)? YES/NO

  **Commit**: NO

---

- [ ] 4. Run full reproduction and collect diagnostic logs

  **What to do**:
  1. Open browser at the strategy builder page
  2. Type a strategy prompt (e.g., "RSI 30 이하 매수, 70 이상 매도")
  3. Wait for AI nodes to appear on canvas
  4. Select a stock
  5. Click "Run Backtest"
  6. Open browser DevTools Console
  7. Capture ALL `[DIAG-*]` log messages in sequence
  8. Record the exact sequence: A → B → C → D → E

  **Key questions to answer from logs**:
  - Does DIAG-A show the AI nodes with correct types?
  - Does DIAG-B fire AFTER the AI nodes are added? (check `nonAreaNodes > 0`)
  - Does DIAG-C show the updated nodes in the ref?
  - Does DIAG-D at backtest time show strategy nodes or only areas?
  - Does DIAG-E show correct serialized types?

  **Must NOT do**:
  - Do not change code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`dev-browser`]
    - `dev-browser`: Browser automation to reproduce the scenario and capture console logs

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not editing code
  - `frontend-ui-ux`: Not designing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - Checkpoint logs defined in Task 1

  **Acceptance Criteria**:
  - [ ] Full console output captured with all DIAG-A through DIAG-E messages
  - [ ] Sequence of events documented
  - [ ] Key finding: At which checkpoint do strategy nodes disappear (or do they all show correctly)?

  **Commit**: NO

---

- [ ] 5. Cross-reference AI output types vs ReactFlow stored types

  **What to do**:
  - Compare Task 3 results (AI API types) with Task 2 findings (ReactFlow nodeTypes)
  - If AI returns `type: 'indicator'` but ReactFlow doesn't register `indicator` as a nodeType:
    - Check if ReactFlow still preserves the `type` string
    - Or if it normalizes to `'default'`
  - Check `flow/index.tsx` `setNodes` call at line ~770: does it spread the AI node correctly including `type`?

  **Must NOT do**:
  - Do not change code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding ReactFlow's type handling

  **Skills Evaluated but Omitted**:
  - `dev-browser`: Pure code analysis, no browser needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/web/components/strategy/flow/index.tsx:770-855` — setNodes callback that merges AI nodes
  - ReactFlow v12 nodeTypes documentation

  **Acceptance Criteria**:
  - [ ] Report: Do AI node types survive the setNodes merge? YES/NO
  - [ ] If NO: Identify where type is lost
  - [ ] Verdict: Is H2 or H5 the root cause? With evidence

  **Commit**: NO

---

- [ ] 6. Root cause determination

  **What to do**:
  Synthesize findings from Tasks 4 and 5 to determine the single root cause:

  **Decision matrix**:

  | Finding | Root Cause | Fix Direction |
  |---------|-----------|---------------|
  | DIAG-A correct, DIAG-B/C only areas | `onWorkflowChange` fires before `setNodes` propagates (H1/H4) | Fix timing — ensure ref is updated after React state settles |
  | DIAG-B correct, DIAG-D only areas | `workflowRef` gets overwritten between AI gen and backtest | Find what resets workflowRef |
  | DIAG-D correct, DIAG-E empty types | Serialization bug (H3) | Fix `String(node.type)` logic |
  | AI API returns wrong types | AI prompt/response parsing issue | Fix API or system prompt |
  | ReactFlow strips type field | H5 confirmed | Register custom nodeTypes or store type in `data` |
  | All checkpoints correct but engine fails | Server-side deserialization issue | Check API route parsing |

  **Must NOT do**:
  - Do not propose code fixes (yet) — only determine root cause

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding TypeScript type flow across the system

  **Skills Evaluated but Omitted**:
  - `dev-browser`: Analysis task, no browser needed
  - `git-master`: No commits

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 4, 5

  **Acceptance Criteria**:
  - [ ] Single root cause identified with evidence
  - [ ] Each hypothesis (H1-H6) marked CONFIRMED or FALSIFIED with specific evidence
  - [ ] Fix direction documented (but NOT implemented)

  **Commit**: NO

---

- [ ] 7. Write investigation report and clean up diagnostic logs

  **What to do**:
  1. Remove all `[DIAG-*]` console.log statements added in Task 1
  2. Write investigation report documenting:
     - Root cause (from Task 6)
     - Evidence chain (DIAG logs)
     - Recommended fix approach
     - Estimated fix effort
  3. If root cause is clear, optionally create a follow-up implementation plan

  **Must NOT do**:
  - Do not implement the fix

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript-programmer`, `git-master`]
    - `typescript-programmer`: Correctly removing log statements
    - `git-master`: Creating clean commit

  **Skills Evaluated but Omitted**:
  - `dev-browser`: No browser interaction
  - `frontend-ui-ux`: No UI changes

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 6)
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:
  - All files modified in Task 1

  **Acceptance Criteria**:
  - [ ] All diagnostic logs removed
  - [ ] TypeScript compilation succeeds
  - [ ] Investigation report written with root cause + evidence + fix direction

  **Commit**: YES
  - Message: `chore(strategy): remove diagnostic logs from backtest investigation`
  - Files: `apps/web/components/strategy/flow/index.tsx`, `apps/web/app/(dashboard)/strategies/builder/page.tsx`
  - Pre-commit: TypeScript compilation check

---

## Additional High-Signal Checks (Bonus — incorporate into Wave 1 tasks)

### Check A: `createEmptyWorkflow()` default nodes
- **File**: Find `createEmptyWorkflow` definition (referenced at `flow/index.tsx:78`)
- **Question**: What nodes does it create? Only `area` types?
- **Why**: If the initial workflow has only area nodes, and AI nodes fail to merge, the engine only sees areas → `hasStrategyLogic = false`.

### Check B: ReactFlow `onNodesChange` vs `setNodes`
- **File**: `flow/index.tsx:79` — `const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(workflow.nodes);`
- **Question**: Does `setNodes` correctly trigger the `useEffect` at line 112 that calls `onWorkflowChange`?
- **Why**: If `setNodes` batches updates differently than expected, the effect might fire with stale data.

### Check C: Backend logging of received workflow
- **File**: `app/api/backtest/route.ts:157`
- **Suggested**: Add server-side `console.log(JSON.stringify(workflow.nodes.map(n => ({ id: n.id, type: n.type }))))` to see what actually arrives at the server.
- **Why**: Eliminates client vs server serialization issues.

### Check D: Multiple `handleWorkflowChange` firings
- **Question**: After AI generation, does `onWorkflowChange` fire multiple times (once per React render batch)? Does a later firing with stale/intermediate data overwrite the correct data?
- **Why**: React batching might cause intermediate states to propagate.

### Check E: `workflowRef.current` type coercion
- **File**: `builder/page.tsx:149` — `const workflowRef = useRef<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }>({ nodes: [], edges: [] });`
- **Question**: The ref type is `Record<string, unknown>[]`. When ReactFlow nodes (which are `Node<WorkflowNode>`) are stored, does the `type` property survive the type widening to `Record<string, unknown>`?
- **Why**: `Record<string, unknown>` should preserve all properties at runtime, but worth verifying the actual runtime shape.

---

## Success Criteria for Investigation

The investigation is COMPLETE when:

1. **Root cause identified**: Exactly ONE hypothesis is confirmed with log evidence showing where strategy nodes are lost in the pipeline.
2. **Evidence chain documented**: DIAG-A → DIAG-E sequence shows the exact point of failure.
3. **All hypotheses resolved**: Each of H1-H6 is marked CONFIRMED or FALSIFIED with specific evidence.
4. **Fix direction clear**: A concrete approach to fix the bug is documented (but NOT implemented).
5. **Diagnostic code removed**: All temporary `console.log` statements are cleaned up.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 7 | `chore(strategy): remove diagnostic logs from backtest investigation` | `flow/index.tsx`, `builder/page.tsx` | TypeScript compilation passes |

No other commits — this is a pure investigation.
