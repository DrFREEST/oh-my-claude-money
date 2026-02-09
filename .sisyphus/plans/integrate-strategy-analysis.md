# Integrate StrategyAnalysis into Two Backtest Pages

## TL;DR

> **Quick Summary**: Add the `StrategyAnalysis` AI analysis component to two backtest pages — the main backtest page and the detail `[id]` page — with proper imports, toast integration, and Korean comments.
>
> **Deliverables**:
> - Modified `backtest/page.tsx` with StrategyAnalysis inserted above `{/* 성과 지표 */}`
> - Modified `backtest/[id]/page.tsx` with StrategyAnalysis + useToast/Toaster plumbing
>
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves (both files are independent)
> **Critical Path**: Task 1 and Task 2 can run simultaneously

---

## Context

### Original Request
User wants to integrate `StrategyAnalysis` component (from `@/components/backtest/strategy-analysis`) into two backtest pages with specific insertion points and prop configurations.

### Constraints (CRITICAL - enforce these)
- **No optional chaining** (`?.`) — use explicit null checks
- **Korean comments** — all comments must be in Korean
- **Exact insertion points** — component goes directly above `{/* 성과 지표 */}` in both files
- **No path assumptions** — use only the verified paths below

### Verified Files (all exist)
| File | Path | Status |
|------|------|--------|
| StrategyAnalysis component | `/opt/coffeetree/apps/web/components/backtest/strategy-analysis.tsx` | EXISTS |
| useToast hook | `/opt/coffeetree/apps/web/hooks/use-toast.ts` | EXISTS |
| Toaster component | `/opt/coffeetree/apps/web/components/ui/toaster.tsx` | EXISTS |
| Main backtest page | `/opt/coffeetree/apps/web/app/(dashboard)/backtest/page.tsx` | EXISTS (514 lines) |
| Detail backtest page | `/opt/coffeetree/apps/web/app/(dashboard)/backtest/[id]/page.tsx` | EXISTS (345 lines) |

### StrategyAnalysis Props Interface (from source)
```typescript
interface StrategyAnalysisProps {
  metrics: BacktestMetrics;
  strategyName?: string;
  period?: string;
  onApplyImprovement?: (improvement: AnalysisResult['improvements'][0]) => void;
  className?: string;
}
```

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Independent file edit |
| Task 2 | None | Independent file edit |

## Parallel Execution Graph

```
Wave 1 (Start immediately - both independent):
├── Task 1: backtest/page.tsx (import + JSX insertion)
└── Task 2: backtest/[id]/page.tsx (imports + toast hook + Toaster + JSX insertion)

Critical Path: None (fully parallel)
Estimated Parallel Speedup: 50% (2 tasks → 1 wave)
```

---

## TODOs

- [ ] 1. Add StrategyAnalysis to `backtest/page.tsx`

  **What to do**:

  ### Step 1: Add import (line 11, after TradeTable import)

  **Current state at line 10-11**:
  ```tsx
  import { TradeTable } from '@/components/backtest/trade-table';
  import { ResponsiveChartWrapper } from '@/components/charts/responsive-chart-wrapper';
  ```

  **Insert AFTER line 10** (between TradeTable and ResponsiveChartWrapper):
  ```tsx
  import { StrategyAnalysis } from '@/components/backtest/strategy-analysis';
  ```

  **Result**:
  ```tsx
  import { TradeTable } from '@/components/backtest/trade-table';
  import { StrategyAnalysis } from '@/components/backtest/strategy-analysis';
  import { ResponsiveChartWrapper } from '@/components/charts/responsive-chart-wrapper';
  ```

  ### Step 2: Insert StrategyAnalysis JSX above `{/* 성과 지표 */}` (line 253)

  **Current state at lines 251-254**:
  ```tsx
            </div>
  
            {/* 성과 지표 */}
            <PerformanceMetrics metrics={results.metrics} />
  ```

  **Insert between line 251 (`</div>`) and line 253 (`{/* 성과 지표 */}`)**:
  ```tsx
            {/* AI 전략 분석 */}
            <StrategyAnalysis
              metrics={results.metrics}
              onApplyImprovement={(improvement) => {
                toast({
                  title: '개선 제안 반영',
                  description: `"${improvement.title}" 제안이 반영되었습니다. 백테스트를 다시 실행해주세요.`,
                  variant: 'default',
                  duration: 5000,
                });
              }}
            />
  ```

  **Must NOT do**:
  - Do NOT use optional chaining (`?.`) anywhere
  - Do NOT change any existing lines
  - Do NOT add any new imports for useToast/Toaster (they ALREADY exist at lines 14-15)
  - Do NOT add `const { toast } = useToast()` (ALREADY exists at line 30)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, two surgical insertions, no logic changes
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: TSX/React import and JSX patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `backtest/page.tsx:10-11` — Import insertion point (between TradeTable and ResponsiveChartWrapper)
  - `backtest/page.tsx:14-15` — useToast and Toaster already imported (DO NOT re-add)
  - `backtest/page.tsx:30` — `const { toast } = useToast()` already exists (DO NOT re-add)
  - `backtest/page.tsx:251-254` — JSX insertion point (above `{/* 성과 지표 */}`)
  - `strategy-analysis.tsx:60-66` — Props interface for StrategyAnalysis
  - `strategy-analysis.tsx:133-139` — Component signature showing all props

  **Acceptance Criteria**:
  ```bash
  # 1. 파일에 StrategyAnalysis import 존재 확인
  grep -n "import { StrategyAnalysis }" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
  # Assert: 출력이 있어야 함 (import 줄 번호 표시)

  # 2. JSX에 StrategyAnalysis 컴포넌트 존재 확인
  grep -n "StrategyAnalysis" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx | wc -l
  # Assert: 최소 2줄 (import 1줄 + JSX 1줄 이상)

  # 3. optional chaining 미사용 확인
  grep -n '\?\.' /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
  # Assert: 0 matches (없어야 함)

  # 4. 한국어 주석 존재 확인
  grep -n "AI 전략 분석" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx
  # Assert: 1 match

  # 5. TypeScript 컴파일 확인
  cd /opt/coffeetree && npx tsc --noEmit --pretty 2>&1 | grep "backtest/page.tsx" || echo "NO_ERRORS"
  # Assert: NO_ERRORS
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `feat(backtest): StrategyAnalysis AI 분석 컴포넌트 통합`
  - Files: `apps/web/app/(dashboard)/backtest/page.tsx`, `apps/web/app/(dashboard)/backtest/[id]/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 2. Add StrategyAnalysis to `backtest/[id]/page.tsx`

  **What to do**:

  ### Step 1: Add 3 imports (after existing imports, line 12)

  **Current state at lines 11-12**:
  ```tsx
  import { TradeTable } from '@/components/backtest/trade-table';
  import { ResponsiveChartWrapper } from '@/components/charts/responsive-chart-wrapper';
  ```

  **Insert AFTER line 12** (after ResponsiveChartWrapper import):
  ```tsx
  import { StrategyAnalysis } from '@/components/backtest/strategy-analysis';
  import { useToast } from '@/hooks/use-toast';
  import { Toaster } from '@/components/ui/toaster';
  ```

  **Result**:
  ```tsx
  import { TradeTable } from '@/components/backtest/trade-table';
  import { ResponsiveChartWrapper } from '@/components/charts/responsive-chart-wrapper';
  import { StrategyAnalysis } from '@/components/backtest/strategy-analysis';
  import { useToast } from '@/hooks/use-toast';
  import { Toaster } from '@/components/ui/toaster';
  ```

  ### Step 2: Add toast hook (inside component, after existing state declarations)

  **Current state at lines 23-25**:
  ```tsx
    const [loading, setLoading] = React.useState(true);
    const [results, setResults] = React.useState<any>(null);
    const [error, setError] = React.useState<string | null>(null);
  ```

  **Insert AFTER line 25** (after the `error` state):
  ```tsx
    const { toast } = useToast();
  ```

  ### Step 3: Add `<Toaster />` inside the return JSX

  **Current state at line 88**:
  ```tsx
      <div className="container mx-auto p-6 space-y-6">
  ```

  **Insert AFTER line 88** (as first child of the top-level div):
  ```tsx
        <Toaster />
  ```

  ### Step 4: Insert StrategyAnalysis JSX above `{/* 성과 지표 */}` (line 144)

  **Current state at lines 142-145**:
  ```tsx
          </CardContent>
        </Card>
  
        {/* 성과 지표 */}
  ```

  **Insert between line 143 (`</Card>`) and line 144 (empty line before `{/* 성과 지표 */}`)**:
  ```tsx
        {/* AI 전략 분석 */}
        <StrategyAnalysis
          metrics={results.metrics}
          strategyName={results.info.strategyId}
          period={`${results.info.startDate} ~ ${results.info.endDate}`}
          onApplyImprovement={(improvement) => {
            toast({
              title: '개선 제안 반영',
              description: `"${improvement.title}" 제안이 반영되었습니다. 백테스트를 다시 실행해주세요.`,
              variant: 'default',
              duration: 5000,
            });
          }}
        />
  ```

  **Must NOT do**:
  - Do NOT use optional chaining (`?.`) anywhere
  - Do NOT change any existing lines
  - Do NOT reorder existing imports

  **Key difference from Task 1**: This file does NOT currently have useToast/Toaster, so all 3 imports + hook + Toaster JSX are NEW. Also, this file passes `strategyName` and `period` props (Task 1 does not).

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, four surgical insertions, no logic changes
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: TSX/React import and JSX patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `backtest/[id]/page.tsx:11-12` — Import insertion point (after TradeTable and ResponsiveChartWrapper)
  - `backtest/[id]/page.tsx:23-25` — State declarations where `const { toast } = useToast()` goes after
  - `backtest/[id]/page.tsx:88` — Top-level div where `<Toaster />` goes as first child
  - `backtest/[id]/page.tsx:142-145` — JSX insertion point (above `{/* 성과 지표 */}`)
  - `backtest/[id]/page.tsx:119-125` — `results.info.strategyId` and `.initialCapital` usage pattern (proves `results.info` shape)
  - `backtest/[id]/page.tsx:96` — `results.info.startDate` / `.endDate` usage (used in period prop)
  - `strategy-analysis.tsx:60-66` — Props interface for StrategyAnalysis

  **Acceptance Criteria**:
  ```bash
  # 1. 3개 새 import 존재 확인
  grep -c "import { StrategyAnalysis }" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
  # Assert: 1

  grep -c "import { useToast }" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
  # Assert: 1

  grep -c "import { Toaster }" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
  # Assert: 1

  # 2. toast hook 존재 확인
  grep -n "const { toast } = useToast()" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
  # Assert: 1 match

  # 3. Toaster JSX 존재 확인
  grep -n "<Toaster />" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
  # Assert: 1 match

  # 4. StrategyAnalysis JSX에 strategyName과 period props 존재 확인
  grep -n "strategyName=" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
  # Assert: 1 match

  grep -n "period=" /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
  # Assert: 1 match

  # 5. optional chaining 미사용 확인
  grep -n '\?\.' /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
  # Assert: 0 matches

  # 6. TypeScript 컴파일 확인
  cd /opt/coffeetree && npx tsc --noEmit --pretty 2>&1 | grep "\[id\]/page.tsx" || echo "NO_ERRORS"
  # Assert: NO_ERRORS
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `feat(backtest): StrategyAnalysis AI 분석 컴포넌트 통합`
  - Files: `apps/web/app/(dashboard)/backtest/page.tsx`, `apps/web/app/(dashboard)/backtest/[id]/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Commit Strategy

| After Tasks | Message | Files | Verification |
|-------------|---------|-------|--------------|
| 1 + 2 (single commit) | `feat(backtest): StrategyAnalysis AI 분석 컴포넌트 통합` | `apps/web/app/(dashboard)/backtest/page.tsx`, `apps/web/app/(dashboard)/backtest/[id]/page.tsx` | `npx tsc --noEmit` |

---

## Ambiguities & Decisions

### Resolved (no user input needed)

| Item | Decision | Rationale |
|------|----------|-----------|
| `page.tsx` already has useToast/Toaster | Do NOT re-add imports or hook | Lines 14-15, 30 confirm they exist |
| `[id]/page.tsx` lacks useToast/Toaster | Add all 3: import + hook + JSX | File has no toast infrastructure |
| `page.tsx` StrategyAnalysis props | Only `metrics` + `onApplyImprovement` | User's verbatim request; no strategyName/period available in this page's context |
| `[id]/page.tsx` StrategyAnalysis props | `metrics` + `strategyName` + `period` + `onApplyImprovement` | Detail page has `results.info` with strategyId, startDate, endDate |

### Potential Ambiguity (flagged but not blocking)

| Item | Question | Default Applied |
|------|----------|-----------------|
| `page.tsx` could pass `strategyName` from `formData` | Should it? User request only shows `metrics` + `onApplyImprovement` for this page | Follow user's verbatim request — do NOT add extra props |
| Toast `variant: 'default'` | User specified this literally; `useToast` may accept other values | Use exactly `'default'` as specified |

---

## Success Criteria

### Verification Commands
```bash
# 전체 TypeScript 컴파일 확인
cd /opt/coffeetree && npx tsc --noEmit
# Expected: 0 errors

# 두 파일 모두 StrategyAnalysis 포함 확인
grep -l "StrategyAnalysis" \
  /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx \
  /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
# Expected: 두 파일 경로 모두 출력

# optional chaining 미사용 확인 (두 파일 모두)
grep -rn '\?\.' \
  /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/page.tsx \
  /opt/coffeetree/apps/web/app/\(dashboard\)/backtest/\[id\]/page.tsx
# Expected: 0 matches
```

### Final Checklist
- [ ] `backtest/page.tsx`: StrategyAnalysis import added
- [ ] `backtest/page.tsx`: StrategyAnalysis JSX above `{/* 성과 지표 */}`
- [ ] `backtest/[id]/page.tsx`: 3 new imports added (StrategyAnalysis, useToast, Toaster)
- [ ] `backtest/[id]/page.tsx`: `const { toast } = useToast()` added
- [ ] `backtest/[id]/page.tsx`: `<Toaster />` added as first child of top div
- [ ] `backtest/[id]/page.tsx`: StrategyAnalysis JSX above `{/* 성과 지표 */}`
- [ ] Zero optional chaining (`?.`) in both files
- [ ] All comments in Korean
- [ ] TypeScript compiles with zero errors
