# Issue 3 & 4: Flow 빌더 — Swap 버튼 배선 + connectedEdges id 추가 + SYSTEM_PROMPT 업데이트

## TL;DR

> **Quick Summary**: property-panel.tsx에 이미 구현된 swap 버튼과 connectedEdges `id` 타입을 flow/index.tsx에서 실제로 배선(wiring)하고, route.ts의 SYSTEM_PROMPT에 CONSTANT 노드 규칙과 RSI 예시를 업데이트한다.
> 
> **Deliverables**:
> - flow/index.tsx: `handleSwapEdgeSources` 콜백 + `onSwapEdgeSources` prop 전달 + `connectedEdges` 매핑에 `id` 필드 추가
> - route.ts: SYSTEM_PROMPT 텍스트에 CONSTANT 노드 규칙 추가 + RSI 예시 업데이트
> - property-panel.tsx: 변경 없음 확인 (이미 완료)
> 
> **Estimated Effort**: Short (1~2시간)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (flow/index.tsx) + Task 2 (route.ts) 병렬 → Task 3 (검증)

---

## Context

### Original Request
Issue 3과 Issue 4의 변경사항을 3개 파일에 적용:
- swap 버튼 배선 (flow/index.tsx ↔ property-panel.tsx)
- connectedEdges 매핑에 `id` 필드 추가
- SYSTEM_PROMPT에 CONSTANT 노드 규칙 및 RSI 예시 업데이트

### Interview Summary
**Key Discussions**:
- optional chaining(`?.`) 사용 금지 — 명시적 `&&` 체크 사용
- 백엔드 로직 변경 불가 — SYSTEM_PROMPT 텍스트만 수정
- property-panel.tsx는 이미 모든 인터페이스, import, UI가 완료됨

**Research Findings**:
- `property-panel.tsx` (594줄): Button import(L27), onSwapEdgeSources prop(L54), connectedEdges에 id 타입(L52), swap 버튼 UI(L340-355) — 모두 이미 존재
- `flow/index.tsx` (1125줄): connectedEdges 매핑 2곳(L1032-1041, L1062-1071)에 `id` 누락, `onSwapEdgeSources` prop 미전달, `handleSwapEdgeSources` 콜백 미정의
- `route.ts` (554줄): SYSTEM_PROMPT(L79-409)에 CONSTANT 노드 관련 규칙 없음

### Metis Review
**Identified Gaps** (addressed):
- handleSwapEdgeSources 구현 로직 명확화 → 두 엣지의 source 필드를 교환하는 setEdges 호출로 구현
- PropertyPanel 렌더 사이트 정확한 수 → 3곳 (단일 노드 L1013, 다중 선택 L1049, 선택 없음 L1077)
- CONSTANT 노드 규칙 텍스트 → 아래 태스크에서 명시
- optional chaining 규칙 → 새로 작성하는 코드에만 적용 (기존 코드 리팩토링 불가)

---

## Work Objectives

### Core Objective
property-panel.tsx에 이미 준비된 swap 기능을 flow/index.tsx에서 배선하고, AI 전략 생성의 SYSTEM_PROMPT를 개선한다.

### Concrete Deliverables
1. `flow/index.tsx`: handleSwapEdgeSources 콜백 + prop 전달 + connectedEdges id 추가
2. `route.ts`: SYSTEM_PROMPT CONSTANT 규칙 + RSI 예시 업데이트

### Definition of Done
- [ ] `npx tsc --noEmit` — 새로운 타입 에러 0개
- [ ] `onSwapEdgeSources` prop이 모든 PropertyPanel 인스턴스에 전달됨
- [ ] `connectedEdges` 매핑 2곳 모두 `id: e.id` 포함
- [ ] 새 코드에 `?.` (optional chaining) 없음
- [ ] SYSTEM_PROMPT에 CONSTANT 노드 규칙 존재

### Must Have
- handleSwapEdgeSources: 두 엣지의 source를 교환하는 콜백
- connectedEdges 매핑에 `id` 필드 추가 (2곳)
- onSwapEdgeSources prop을 모든 PropertyPanel에 전달
- CONSTANT 노드 규칙을 SYSTEM_PROMPT에 추가
- RSI 예시에 CONSTANT 노드 활용 패턴 추가

### Must NOT Have (Guardrails)
- ❌ optional chaining (`?.`) 사용 금지 — `&&` 명시적 체크만
- ❌ property-panel.tsx 인터페이스, import, swap 버튼 UI 변경 금지 (이미 완료)
- ❌ route.ts의 백엔드 로직 (API 호출, JSON 파싱 등) 변경 금지
- ❌ 3개 파일 외 다른 파일 수정 금지
- ❌ 테스트, 에러 핸들링, UX 개선 추가 금지
- ❌ 기존 코드 리팩토링 금지 (배선 작업만)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (tsc --noEmit)
- **User wants tests**: NO
- **Framework**: TypeScript compiler check only
- **QA approach**: Manual verification via grep + tsc

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 (flow/index.tsx) | None | 독립적 파일 수정 |
| Task 2 (route.ts) | None | 독립적 파일 수정 |
| Task 3 (검증) | Task 1, Task 2 | 모든 변경 완료 후 전체 검증 |

## Parallel Execution Graph

```
Wave 1 (Start immediately):
├── Task 1: flow/index.tsx — handleSwapEdgeSources + connectedEdges id + prop 전달
└── Task 2: route.ts — SYSTEM_PROMPT CONSTANT 규칙 + RSI 예시 업데이트

Wave 2 (After Wave 1 completes):
└── Task 3: 전체 검증 (tsc + grep)

Critical Path: Task 1 → Task 3
Parallel Speedup: ~50% (Task 1과 Task 2 동시 실행)
```

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | Task 1, Task 2 | delegate_task(category="quick", load_skills=["typescript-programmer"], run_in_background=true) × 2 |
| 2 | Task 3 | delegate_task(category="quick", load_skills=["typescript-programmer"], run_in_background=false) |

---

## TODOs

- [ ] 1. flow/index.tsx — handleSwapEdgeSources 콜백 추가 + connectedEdges id 추가 + onSwapEdgeSources prop 전달

  **What to do**:
  
  ### Step 1-A: `handleSwapEdgeSources` 콜백 정의
  
  `handleEdgeConditionUpdate` (L287-305) 뒤에 새 콜백을 추가:
  
  ```typescript
  /**
   * 엣지 소스 스위칭 (operator 노드의 입력 A,B 교환)
   */
  const handleSwapEdgeSources = useCallback(
    (nodeId: string, edgeIds: [string, string]) => {
      setEdges((eds) => {
        const edge0 = eds.find((e) => e.id === edgeIds[0]);
        const edge1 = eds.find((e) => e.id === edgeIds[1]);
        if (!edge0 || !edge1) return eds;
        
        const source0 = edge0.source;
        const sourceHandle0 = edge0.sourceHandle;
        const source1 = edge1.source;
        const sourceHandle1 = edge1.sourceHandle;
        
        return eds.map((e) => {
          if (e.id === edgeIds[0]) {
            return { ...e, source: source1, sourceHandle: sourceHandle1 };
          }
          if (e.id === edgeIds[1]) {
            return { ...e, source: source0, sourceHandle: sourceHandle0 };
          }
          return e;
        });
      });
    },
    [setEdges]
  );
  ```
  
  **⚠️ optional chaining 금지**: `edge0?.source` 대신 `if (!edge0 || !edge1) return eds;` 가드 사용
  
  ### Step 1-B: connectedEdges 매핑에 `id` 필드 추가 (2곳)
  
  **사이트 1 — 단일 노드 선택 (L1032-1041)**:
  현재:
  ```typescript
  connectedEdges={edges.filter(e => e.target === selectedNodes[0] || e.source === selectedNodes[0]).map(e => {
    const sourceNode = nodes.find(n => n.id === e.source);
    const targetNode = nodes.find(n => n.id === e.target);
    return {
      source: e.source,
      target: e.target,
      sourceLabel: sourceNode && sourceNode.data ? String((sourceNode.data as Record<string, unknown>).label || sourceNode.id) : e.source,
      targetLabel: targetNode && targetNode.data ? String((targetNode.data as Record<string, unknown>).label || targetNode.id) : e.target,
    };
  })}
  ```
  
  변경 후 (`id: e.id` 추가):
  ```typescript
  connectedEdges={edges.filter(e => e.target === selectedNodes[0] || e.source === selectedNodes[0]).map(e => {
    const sourceNode = nodes.find(n => n.id === e.source);
    const targetNode = nodes.find(n => n.id === e.target);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceLabel: sourceNode && sourceNode.data ? String((sourceNode.data as Record<string, unknown>).label || sourceNode.id) : e.source,
      targetLabel: targetNode && targetNode.data ? String((targetNode.data as Record<string, unknown>).label || targetNode.id) : e.target,
    };
  })}
  ```
  
  **사이트 2 — 다중 노드 선택 (L1062-1071)**:
  동일하게 `id: e.id` 추가 (같은 패턴)
  
  ### Step 1-C: onSwapEdgeSources prop을 모든 PropertyPanel 인스턴스에 전달
  
  **PropertyPanel 렌더 사이트 3곳**:
  
  1. **단일 노드 선택 (L1013)** — `<PropertyPanel selectedNode={{...}} ...>`
     추가할 prop: `onSwapEdgeSources={handleSwapEdgeSources}`
  
  2. **다중 노드 선택 (L1049)** — `<PropertyPanel selectedNodes={selectedNodeData} ...>`
     추가할 prop: `onSwapEdgeSources={handleSwapEdgeSources}`
  
  3. **선택 없음 (L1077)** — `<PropertyPanel selectedNode={null} />`
     여기는 선택된 노드가 없으므로 prop 전달 불필요 (swap 버튼이 렌더되지 않음)
     → 그래도 일관성을 위해 추가 가능하나, 필수 아님

  **Must NOT do**:
  - property-panel.tsx의 인터페이스, UI, import 수정
  - 기존 코드 리팩토링
  - optional chaining 사용

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일, 명확한 3단계 수정 — 저복잡도
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: TypeScript React 코드 수정에 특화
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI 변경 없음, 배선만
    - `git-master`: 커밋은 별도 단계

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3 (검증)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `flow/index.tsx:287-305` — `handleEdgeConditionUpdate` 콜백 패턴 (useCallback + setEdges). 동일 패턴으로 handleSwapEdgeSources 구현
  - `flow/index.tsx:1013-1043` — 단일 노드 PropertyPanel 렌더 사이트. 여기에 `onSwapEdgeSources={handleSwapEdgeSources}` prop 추가
  - `flow/index.tsx:1049-1073` — 다중 노드 PropertyPanel 렌더 사이트. 동일하게 prop 추가
  - `flow/index.tsx:1032-1041` — connectedEdges 매핑 사이트 1. `id: e.id` 추가 위치
  - `flow/index.tsx:1062-1071` — connectedEdges 매핑 사이트 2. `id: e.id` 추가 위치

  **API/Type References**:
  - `property-panel.tsx:40-55` — `PropertyPanelProps` 인터페이스. `onSwapEdgeSources` 시그니처: `(nodeId: string, edgeIds: [string, string]) => void`
  - `property-panel.tsx:52` — `connectedEdges` 타입: `Array<{ id: string; source: string; target: string; sourceLabel?: string; targetLabel?: string }>`

  **WHY Each Reference Matters**:
  - L287-305: handleSwapEdgeSources의 코딩 패턴 (useCallback + setEdges)을 이 기존 콜백에서 복사
  - L1013/1049: prop을 추가할 정확한 JSX 위치
  - L1032/1062: `id: e.id`를 추가할 정확한 매핑 위치
  - property-panel.tsx:40-55: 타입 호환성 검증용 — 전달하는 콜백이 이 시그니처와 일치해야 함

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -n 'handleSwapEdgeSources' /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Assert: 최소 4줄 출력 (정의 1 + 사이트 2 + dependency array 1)
  
  grep -n 'onSwapEdgeSources' /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Assert: 최소 2줄 출력 (PropertyPanel prop 전달 2곳)
  
  grep -n 'id: e.id' /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Assert: 최소 2줄 출력 (connectedEdges 매핑 2곳)
  
  grep -c '\?\.' /opt/coffeetree/apps/web/components/strategy/flow/index.tsx
  # Assert: 변경 전과 동일한 수 (새 optional chaining 없음)
  ```

  **Commit**: YES
  - Message: `feat(flow): wire handleSwapEdgeSources callback and add edge id to connectedEdges`
  - Files: `apps/web/components/strategy/flow/index.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 2. route.ts — SYSTEM_PROMPT에 CONSTANT 노드 규칙 추가 + RSI 예시 업데이트

  **What to do**:
  
  ### Step 2-A: CONSTANT 노드 규칙 추가
  
  SYSTEM_PROMPT의 **기본 지표 (basic)** 섹션(L91 근처) 뒤에 CONSTANT 노드 사용법 설명 추가:
  
  ```
  **CONSTANT 노드 사용법:**
  CONSTANT 노드는 고정 숫자 값을 나타냅니다. 임계값(threshold) 비교 시 operator의 data.value 대신 CONSTANT 노드를 사용하여 더 명시적인 워크플로우를 구성할 수 있습니다.
  
  예시: RSI > 70 조건을 CONSTANT 노드로 표현
  - CONSTANT indicator (params: { value: 70 }) + RSI indicator → GREATER_THAN operator
  - 이 방식은 비교 대상 값을 시각적으로 명확하게 표현합니다.
  
  CONSTANT indicator 예시:
  {
    "id": "indicator-const70-a1b2",
    "type": "indicator",
    "parentId": "area-buy-condition-c4m1",
    "position": { "x": 200, "y": 50 },
    "data": { "label": "70", "indicatorType": "CONSTANT", "params": { "value": 70 } }
  }
  ```
  
  ### Step 2-B: RSI 예시 업데이트
  
  기존 RSI 과매도 매수 전략 예시(L219-277)에서 operator의 `value: 30` 방식 대신 CONSTANT 노드를 활용하는 대안 패턴을 추가하거나, 기존 예시에 CONSTANT 노드 변형을 보충:
  
  RSI 예시의 operator 노드 부분에 주석 또는 설명 추가:
  ```
  ⚠️ 대안: operator의 value 속성 대신 CONSTANT 노드를 사용할 수도 있습니다:
  - CONSTANT(value=30) indicator를 추가하고
  - RSI → LESS_THAN ← CONSTANT(30) 으로 연결
  - 이 경우 operator에는 value 속성이 불필요합니다
  ```
  
  ### Step 2-C: 핵심 규칙에 CONSTANT 관련 보충
  
  L333-346의 핵심 규칙 섹션에 추가:
  ```
  13. ✅ **CONSTANT 노드로 임계값 표현 가능** - operator의 data.value 외에도 CONSTANT indicator(params.value)를 사용하여 비교 대상 값을 별도 노드로 시각화할 수 있음
  ```

  **Must NOT do**:
  - API 엔드포인트 로직, JSON 파싱, 에러 핸들링 변경
  - Claude 모델 변경, max_tokens 변경
  - SYSTEM_PROMPT 이외의 코드 수정

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일의 문자열 리터럴만 수정 — 매우 저복잡도
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: TypeScript 파일 내 문자열 수정
  - **Skills Evaluated but Omitted**:
    - `prompt-engineer`: AI 프롬프트이긴 하나 내용이 이미 명시됨
    - `frontend-ui-ux`: 프론트엔드 아님

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3 (검증)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `route.ts:79-409` — 전체 SYSTEM_PROMPT 문자열. 수정 대상
  - `route.ts:91` — 기본 지표 (basic) 목록. CONSTANT 노드가 여기 나열되어 있으나 사용법 설명 없음
  - `route.ts:219-277` — RSI 과매도 매수 전략 예시. CONSTANT 노드 활용 패턴 보충 위치
  - `route.ts:333-346` — 핵심 규칙 12개. 13번 규칙 추가 위치

  **WHY Each Reference Matters**:
  - L79-409: 수정 범위의 전체 경계. 이 문자열 밖의 코드는 절대 건드리지 않음
  - L91: CONSTANT가 이미 indicatorType에 포함됨 확인 — 규칙만 추가하면 됨
  - L219-277: 기존 예시에 CONSTANT 대안 패턴 보충
  - L333-346: 규칙 13번 추가 위치

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  grep -c 'CONSTANT' /opt/coffeetree/apps/web/app/api/ai/generate-strategy/route.ts
  # Assert: 기존 수보다 증가 (새 규칙 추가됨)
  
  grep -n 'CONSTANT 노드' /opt/coffeetree/apps/web/app/api/ai/generate-strategy/route.ts
  # Assert: 최소 2줄 출력 (사용법 설명 + 핵심 규칙)
  
  grep -n 'indicatorType.*CONSTANT' /opt/coffeetree/apps/web/app/api/ai/generate-strategy/route.ts
  # Assert: CONSTANT 지표 예시 존재
  ```

  **Commit**: YES
  - Message: `docs(ai): add CONSTANT node rules and usage examples to SYSTEM_PROMPT`
  - Files: `apps/web/app/api/ai/generate-strategy/route.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 3. 전체 검증

  **What to do**:
  
  ### Step 3-A: TypeScript 컴파일 검증
  ```bash
  cd /opt/coffeetree && npx tsc --noEmit
  # Assert: 새로운 에러 0개
  ```
  
  ### Step 3-B: 배선 완성도 검증
  ```bash
  # handleSwapEdgeSources 정의 확인
  grep -n 'handleSwapEdgeSources' apps/web/components/strategy/flow/index.tsx
  
  # onSwapEdgeSources prop 전달 확인
  grep -n 'onSwapEdgeSources' apps/web/components/strategy/flow/index.tsx
  
  # connectedEdges id 필드 확인
  grep -n 'id: e.id' apps/web/components/strategy/flow/index.tsx
  ```
  
  ### Step 3-C: optional chaining 미사용 검증
  ```bash
  # 변경 전후 optional chaining 수 비교
  grep -c '\?\.' apps/web/components/strategy/flow/index.tsx
  grep -c '\?\.' apps/web/app/api/ai/generate-strategy/route.ts
  # Assert: 증가하지 않음
  ```
  
  ### Step 3-D: CONSTANT 규칙 검증
  ```bash
  grep -n 'CONSTANT 노드' apps/web/app/api/ai/generate-strategy/route.ts
  # Assert: 출력 있음
  ```

  **Must NOT do**:
  - 검증 실패 시 직접 수정하지 말 것 — 이전 태스크 재실행

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 검증 명령어 실행만 — 매우 저복잡도
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: tsc 결과 해석
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 검증 단계이므로 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `property-panel.tsx:40-55` — PropertyPanelProps 타입 정의. 타입 호환성 검증의 기준
  - `flow/index.tsx` 전체 — 변경 대상 확인

  **Acceptance Criteria**:
  ```bash
  # Final gate
  cd /opt/coffeetree && npx tsc --noEmit 2>&1 | tail -5
  # Assert: "Found 0 errors" 또는 에러 없이 종료
  ```

  **Commit**: NO (검증 단계)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(flow): wire handleSwapEdgeSources callback and add edge id to connectedEdges` | `apps/web/components/strategy/flow/index.tsx` | `npx tsc --noEmit` |
| 2 | `docs(ai): add CONSTANT node rules and usage examples to SYSTEM_PROMPT` | `apps/web/app/api/ai/generate-strategy/route.ts` | `npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript 컴파일
cd /opt/coffeetree && npx tsc --noEmit
# Expected: 0 errors

# handleSwapEdgeSources 배선 확인
grep -c 'handleSwapEdgeSources' apps/web/components/strategy/flow/index.tsx
# Expected: >= 4

# connectedEdges id 확인
grep -c 'id: e.id' apps/web/components/strategy/flow/index.tsx
# Expected: >= 2

# onSwapEdgeSources prop 전달 확인
grep -c 'onSwapEdgeSources' apps/web/components/strategy/flow/index.tsx
# Expected: >= 2

# CONSTANT 규칙 확인
grep -c 'CONSTANT 노드' apps/web/app/api/ai/generate-strategy/route.ts
# Expected: >= 2

# optional chaining 미증가 확인
grep -c '\?\.' apps/web/components/strategy/flow/index.tsx
# Expected: 변경 전과 동일
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] TypeScript 컴파일 pass
- [ ] optional chaining 미증가
