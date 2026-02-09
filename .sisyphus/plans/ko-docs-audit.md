# Korean Docs Audit — 8 문서 vs 코드베이스 정합성 감사

## TL;DR

> **Quick Summary**: `docs/ko/` 아래 8개 한국어 문서가 현재 코드베이스(v1.0.0, 49개 `src/` 파일)와 정확히 일치하는지 체계적으로 감사한다. 문서에 기술된 함수명·경로·설정값·동작 설명을 소스 코드와 1:1 대조하여 불일치 목록을 생성한다.
>
> **Deliverables**:
> - 문서별 감사 테이블 8개 (5-column 표준 형식)
> - 종합 불일치 리포트 1건 (`.sisyphus/evidence/ko-docs-audit-report.md`)
> - v1.0.0 신규 기능 커버리지 매트릭스 1건
>
> **Estimated Effort**: Medium (8 parallel tasks + 1 synthesis)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Wave 1 (8 parallel audits) → Wave 2 (synthesis)

---

## Context

### Original Request
`docs/ko/` 아래 8개 한국어 문서(INSTALLATION, ARCHITECTURE, FEATURES, API-REFERENCE, CONFIGURATION, FUSION-GUIDE, SKILLS-REFERENCE, TROUBLESHOOTING)를 현재 코드베이스와 대조 감사하라. 병렬 실행 그래프, 문서별 증거 체크리스트를 포함한 실행 계획을 생성하라.

### Research Findings

**코드베이스 구조** (49 source files):
```
src/
├── config/       schema.mjs
├── context/      context-builder.mjs, context-serializer.mjs, context-sync.mjs, index.mjs
├── executor/     acp-client.mjs, opencode-executor.mjs, opencode-server.mjs, opencode-server-pool.mjs
├── hooks/        detect-handoff.mjs, fusion-router-logic.mjs, persistent-mode.mjs, session-start.mjs
├── hud/          claude-usage-api.mjs, fusion-renderer.mjs, index.mjs, mode-detector.mjs, omcm-hud.mjs, omcm-hud-entry.cjs, omcm-hud-wrapper.mjs
├── orchestrator/ agent-fusion-map.mjs, execution-strategy.mjs, fallback-orchestrator.mjs, fusion-orchestrator.mjs, hybrid-ultrawork.mjs, index.mjs, opencode-worker.mjs, parallel-executor.mjs, task-router.mjs
├── pool/         server-pool.mjs
├── router/       balancer.mjs, cache.mjs, mapping.mjs, rules.mjs
├── tracking/     call-logger.mjs, index.mjs, metrics-collector.mjs, realtime-tracker.mjs, tool-tracker-logger.mjs
└── utils/        config.mjs, context.mjs, fusion-tracker.mjs, handoff-context.mjs, project-root.mjs, provider-limits.mjs, session-id.mjs, state-manager.mjs, tool-counter.mjs, usage.mjs
```

**추가 에셋**: `commands/` (8 md), `hooks/` (hooks.json + fusion-router.mjs), `scripts/` (8 files), `agents/` (opencode-delegator.json)

**v1.0.0 신규 기능 목록** (CHANGELOG 기준):
1. 실시간 사용량 추적 시스템 (`src/tracking/`)
2. 다중 프로바이더 밸런싱 (`src/router/balancer.mjs`)
3. 컨텍스트 전달 시스템 (`src/context/`)
4. 병렬 실행기 (`src/orchestrator/parallel-executor.mjs`)
5. ACP 클라이언트 (`src/executor/acp-client.mjs`)
6. Serve 모드 통합 (`src/executor/opencode-server.mjs`)
7. 서버 풀 관리 (`src/pool/server-pool.mjs`, `src/executor/opencode-server-pool.mjs`)
8. 퓨전 라우터 (`src/hooks/fusion-router-logic.mjs`)

---

## Work Objectives

### Core Objective
8개 한국어 문서 각각에 대해 코드베이스와의 불일치를 빠짐없이 식별하고, 표준 테이블 형식으로 문서화한다.

### Concrete Deliverables
- `.sisyphus/evidence/audit-{N}-{doc-name}.md` — 문서별 감사 결과 (8건)
- `.sisyphus/evidence/ko-docs-audit-report.md` — 종합 리포트 (1건)

### Definition of Done
- [ ] 8개 문서 모두에 대해 5-column 감사 테이블 생성 완료
- [ ] v1.0.0 신규 기능 8개 항목이 최소 1개 문서에서 커버되는지 확인
- [ ] 종합 리포트에 심각도별 분류 통계 포함

### Must Have
- **표준 출력 형식** (아래 정의)
- **문제 유형 분류 체계** (아래 정의)
- v1.0.0 신규 기능 커버리지 매트릭스

### Must NOT Have (Guardrails)
- ❌ 코드 수정 제안이나 구현
- ❌ 영문 docs/en/ 문서 변경
- ❌ 문서 내용의 직접 수정
- ❌ 감사 범위 밖 파일(tests/, examples/) 분석

---

## 표준 출력 형식 (Required Output Format)

모든 감사 태스크는 아래 테이블 형식을 사용한다:

```markdown
| # | 항목 | 문서 내용 | 실제 상태 | 문제 유형 | 조치 |
|---|------|----------|----------|----------|------|
| 1 | [검증 대상] | [문서에 기술된 내용] | [코드에서 확인된 실제 상태] | [분류 코드] | [권장 조치] |
```

### 문제 유형 분류 체계 (Problem Type Taxonomy)

| 코드 | 문제 유형 | 설명 | 심각도 |
|------|----------|------|--------|
| `PATH` | 경로 불일치 | 문서의 파일 경로가 실제와 다름 | 🔴 High |
| `API` | API 불일치 | 함수 시그니처·반환값·매개변수가 다름 | 🔴 High |
| `MISSING` | 미문서화 | 코드에 존재하나 문서에 없음 | 🟡 Medium |
| `PHANTOM` | 유령 문서 | 문서에 있으나 코드에 없음 | 🔴 High |
| `STALE` | 구버전 정보 | 과거 버전의 정보가 그대로 남아있음 | 🟡 Medium |
| `CONFIG` | 설정 불일치 | 기본값·옵션명·스키마가 다름 | 🟡 Medium |
| `BEHAVIOR` | 동작 불일치 | 설명된 동작과 실제 로직이 다름 | 🔴 High |
| `TYPO` | 오탈자/포맷 | 사소한 텍스트 오류 | 🟢 Low |
| `COVERAGE` | 커버리지 부족 | 신규 기능이 문서에 반영되지 않음 | 🟡 Medium |

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: N/A (감사 작업, 코드 변경 없음)
- **User wants tests**: Manual-only
- **QA approach**: 자동화된 증거 수집 (grep, ast-grep, file existence checks)

### Automated Verification

각 태스크의 감사 항목은 아래 도구로 검증한다:

| 검증 대상 | 도구 | 자동화 방법 |
|----------|------|------------|
| 파일 경로 존재 여부 | `glob`, `ls` | 문서에 언급된 모든 경로를 glob으로 확인 |
| 함수/클래스 존재 | `ast_grep_search` | 문서에 기술된 export 함수를 AST 검색 |
| 설정 키/기본값 | `grep` | 문서의 config 키를 소스에서 검색 |
| 에이전트 매핑 테이블 | `Read` + `grep` | `agent-fusion-map.mjs`와 문서 테이블 대조 |
| 훅/커맨드 목록 | `glob` | `commands/*.md`, `hooks/hooks.json` 비교 |
| 모듈 export | `ast_grep_search` | `export { ... }` 패턴으로 실제 공개 API 확인 |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 8 parallel tasks):
├── Task 1: Audit INSTALLATION.md        (no dependencies)
├── Task 2: Audit ARCHITECTURE.md        (no dependencies)
├── Task 3: Audit FEATURES.md            (no dependencies)
├── Task 4: Audit API-REFERENCE.md       (no dependencies)
├── Task 5: Audit CONFIGURATION.md       (no dependencies)
├── Task 6: Audit FUSION-GUIDE.md        (no dependencies)
├── Task 7: Audit SKILLS-REFERENCE.md    (no dependencies)
└── Task 8: Audit TROUBLESHOOTING.md     (no dependencies)

Wave 2 (After Wave 1 — sequential):
└── Task 9: Synthesize audit report + v1.0.0 coverage matrix
                                          (depends: 1-8)

Critical Path: Any single Task (1-8) → Task 9
Parallel Speedup: ~85% faster than sequential (8→1 wave)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 9 | 2, 3, 4, 5, 6, 7, 8 |
| 2 | None | 9 | 1, 3, 4, 5, 6, 7, 8 |
| 3 | None | 9 | 1, 2, 4, 5, 6, 7, 8 |
| 4 | None | 9 | 1, 2, 3, 5, 6, 7, 8 |
| 5 | None | 9 | 1, 2, 3, 4, 6, 7, 8 |
| 6 | None | 9 | 1, 2, 3, 4, 5, 7, 8 |
| 7 | None | 9 | 1, 2, 3, 4, 5, 6, 8 |
| 8 | None | 9 | 1, 2, 3, 4, 5, 6, 7 |
| 9 | 1-8 | None | None (final synthesis) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1–8 | `delegate_task(category="quick", load_skills=[], run_in_background=true)` × 8 |
| 2 | 9 | `delegate_task(category="writing", load_skills=[], run_in_background=false)` × 1 |

---

## TODOs

---

### Task 1: Audit `INSTALLATION.md`

- [ ] 1. 설치 가이드 감사

  **What to do**:
  - `docs/ko/INSTALLATION.md`의 모든 검증 항목을 아래 체크리스트로 대조
  - 결과를 `.sisyphus/evidence/audit-1-installation.md`에 5-column 테이블로 저장

  **감사 체크리스트 (Evidence to Collect)**:

  | # | 검증 항목 | 대조 소스 | 검증 방법 |
  |---|----------|----------|----------|
  | 1.1 | 사전 요구사항 (Node 18+) | `package.json` → `engines.node` | Read package.json |
  | 1.2 | Claude Code 설치 명령어 (`npm install -g @anthropic-ai/claude-code`) | 실제 패키지명 유효성 | npm registry 확인 또는 문서 비교 |
  | 1.3 | OpenCode 설치 명령어 | 공식 URL 유효성 | URL 형식 확인 |
  | 1.4 | `install.sh` 스크립트 존재 여부 및 경로 | `install.sh` 파일 존재 | `glob install.sh` |
  | 1.5 | 4단계 설치 흐름 (Step 1-4) 정확성 | 실제 scripts/, commands/ 파일 | glob으로 각 단계의 타깃 파일 확인 |
  | 1.6 | `/omcm:fusion-setup` 명령어 존재 | `commands/fusion-setup.md` | glob 확인 |
  | 1.7 | `/oh-my-claudecode:omc-setup` 명령어 참조 정확성 | 외부 플러그인 (OMC) | 문서 내 설명만 확인 |
  | 1.8 | `opencode auth login` 명령어 설명 | OpenCode CLI 문서 | 문서 내 설명 일관성 |
  | 1.9 | 환경 변수명 (ANTHROPIC_API_KEY 등) | 코드 내 참조 여부 | grep `ANTHROPIC_API_KEY` in src/ |
  | 1.10 | 수동 설치 경로 (`~/.local/share/omcm`, `~/.claude/plugins/local/omcm`) | scripts/, config 경로 | grep/read 확인 |
  | 1.11 | `uninstall.sh` 존재 | 파일 존재 | glob 확인 |
  | 1.12 | 설치 확인 명령어의 실제 동작 | scripts/ 내 스크립트 | read 확인 |

  **Must NOT do**:
  - 설치 스크립트 수정
  - 외부 URL 접속 테스트

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 파일 존재 확인 + 텍스트 대조, 복잡한 추론 불필요
  - **Skills**: [] (없음)
    - 도메인 특화 스킬 불필요, 기본 탐색/읽기로 충분
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: 코드 작성이 아닌 감사 작업
    - `frontend-ui-ux`: UI 관련 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-8)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `docs/ko/INSTALLATION.md` — 감사 대상 문서 전체
  - `package.json:29` — `engines.node` 필드로 Node.js 버전 요구사항 확인
  - `install.sh` — 설치 스크립트 실제 동작 확인
  - `commands/fusion-setup.md` — Step 4 커맨드 존재 확인
  - `scripts/handoff-to-opencode.sh` — 수동 전환 스크립트 경로 확인

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  test -f .sisyphus/evidence/audit-1-installation.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "| " .sisyphus/evidence/audit-1-installation.md
  # Assert: >= 12 (header + 12 rows minimum)
  
  grep -c "문제 유형" .sisyphus/evidence/audit-1-installation.md
  # Assert: >= 1 (table header present)
  ```

  **Commit**: NO (audit evidence only)

---

### Task 2: Audit `ARCHITECTURE.md`

- [ ] 2. 아키텍처 문서 감사

  **What to do**:
  - `docs/ko/ARCHITECTURE.md` 전체를 읽고 기술된 모든 구성요소·경로·함수를 소스와 대조
  - 결과를 `.sisyphus/evidence/audit-2-architecture.md`에 저장

  **감사 체크리스트 (Evidence to Collect)**:

  | # | 검증 항목 | 대조 소스 | 검증 방법 |
  |---|----------|----------|----------|
  | 2.1 | 퓨전 라우터 경로 (`src/hooks/fusion-router-logic.mjs`) | 실제 파일 | glob 확인 |
  | 2.2 | `shouldRouteToOpenCode()` 함수 시그니처/반환 형태 | 소스 코드 | ast_grep + read |
  | 2.3 | 4단계 의사결정 트리 (폴백→리밋→퓨전→기본) | `fusion-router-logic.mjs` 로직 | read 함수 본문 |
  | 2.4 | 에이전트 매핑 테이블 (29개) | `src/orchestrator/agent-fusion-map.mjs` | read + 항목 대조 |
  | 2.5 | 서버 풀 포트 범위 (4096-4100) | `src/pool/server-pool.mjs` 또는 `opencode-server-pool.mjs` | grep 포트번호 |
  | 2.6 | 모듈별 파일 경로 (router/, orchestrator/, context/ 등) | 실제 디렉토리 구조 | glob `src/**/*.mjs` |
  | 2.7 | 폴백 체인 설명 (Opus→Codex→Flash→GPT) | `src/orchestrator/fallback-orchestrator.mjs` | read 로직 |
  | 2.8 | HUD 통합 설명 | `src/hud/` 파일들 | glob + read |
  | 2.9 | 데이터 흐름도 (ASCII art)의 구성요소 일치 | 전체 src/ 구조 | 시각적 대조 |
  | 2.10 | `shouldRouteToOpenCodeV2()` 언급 여부 (v0.8.0) | 소스 코드 | ast_grep |
  | 2.11 | 라우팅 우선순위 순서 정확성 | `fusion-router-logic.mjs` 코드 분기 | read |
  | 2.12 | `task-router.mjs` 역할 설명 | 소스 코드 | read |

  **Must NOT do**:
  - 아키텍처 다이어그램 재작성
  - 코드 리팩토링 제안

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 경로/함수 존재 확인 + 텍스트 대조
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: 읽기 전용 감사

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-8)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `docs/ko/ARCHITECTURE.md` — 감사 대상 문서 전체
  - `src/hooks/fusion-router-logic.mjs` — 핵심 라우팅 엔진, `shouldRouteToOpenCode()` 시그니처 확인
  - `src/orchestrator/agent-fusion-map.mjs` — 29개 에이전트 매핑 테이블의 진본(ground truth)
  - `src/orchestrator/fallback-orchestrator.mjs` — 폴백 체인 로직 확인
  - `src/pool/server-pool.mjs` — 서버 풀 포트 범위 확인
  - `src/orchestrator/task-router.mjs` — 태스크 라우터 역할 확인

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/audit-2-architecture.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "| " .sisyphus/evidence/audit-2-architecture.md
  # Assert: >= 12
  ```

  **Commit**: NO

---

### Task 3: Audit `FEATURES.md`

- [ ] 3. 기능 가이드 감사

  **What to do**:
  - `docs/ko/FEATURES.md` 전체를 읽고 기술된 모든 기능·API·동작을 소스와 대조
  - **v1.0.0 신규 기능 8가지가 모두 문서화되었는지 반드시 확인**
  - 결과를 `.sisyphus/evidence/audit-3-features.md`에 저장

  **감사 체크리스트 (Evidence to Collect)**:

  | # | 검증 항목 | 대조 소스 | 검증 방법 |
  |---|----------|----------|----------|
  | 3.1 | 퓨전 모드 3가지(hulw/ulw/autopilot) 트리거 키워드 | `commands/*.md`, skill files | glob + read |
  | 3.2 | 에이전트-프로바이더 매핑 테이블 (티어별 개수: HIGH=11, MED=10, LOW=8) | `agent-fusion-map.mjs` | 실제 개수 세기 |
  | 3.3 | hulw API 코드 예제 (트리거 방법) | `commands/hulw.md` | read 대조 |
  | 3.4 | ulw 동작 흐름 (사용량 <70%, 70-90%, >90%) | `src/orchestrator/hybrid-ultrawork.mjs` | read 임계값 |
  | 3.5 | 서버 풀 성능 수치 (cold boot ~10-15s, 이후 ~1s) | `src/pool/server-pool.mjs` 또는 `src/executor/opencode-server-pool.mjs` | read/grep |
  | 3.6 | 서버 풀 특징 (동적 스케일링 1-5개, ~250-300MB) | 소스 코드 | read 설정값 |
  | **v1.0.0 신규 기능 커버리지** | | |
  | 3.7 | 실시간 추적: RealtimeTracker, RingBuffer, MetricsCollector, TimeBucket | `src/tracking/*.mjs` | ast_grep export 확인 |
  | 3.8 | 컨텍스트 전달: buildContext(), ContextSynchronizer | `src/context/*.mjs` | ast_grep 함수 존재 |
  | 3.9 | 밸런싱: 4가지 전략 (round-robin, weighted, latency, usage) | `src/router/balancer.mjs` | read 전략 이름 |
  | 3.10 | 병렬 실행기: ParallelExecutor 3가지 모드 (병렬/순차/하이브리드) | `src/orchestrator/parallel-executor.mjs` | read |
  | 3.11 | ACP 클라이언트 문서화 여부 | `src/executor/acp-client.mjs` | 문서 내 키워드 검색 |
  | 3.12 | Serve 모드 문서화 여부 | `src/executor/opencode-server.mjs` | 문서 내 키워드 검색 |
  | 3.13 | 서버 풀 관리 문서화 | `src/pool/server-pool.mjs` | 문서 내 섹션 확인 |
  | 3.14 | 퓨전 라우터 문서화 | `src/hooks/fusion-router-logic.mjs` | 문서 내 섹션 확인 |

  **Must NOT do**:
  - 기능 추가/수정 제안
  - README와의 교차 검증 (범위 외)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: v1.0.0 기능 커버리지 확인에 중간 수준의 분석력 필요
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: 읽기 전용 감사

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-8)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `docs/ko/FEATURES.md` — 감사 대상 문서 전체
  - `src/tracking/realtime-tracker.mjs` — RealtimeTracker, RingBuffer 클래스 존재 확인
  - `src/tracking/metrics-collector.mjs` — MetricsCollector 클래스 확인
  - `src/context/context-builder.mjs` — `buildContext()` 함수 시그니처 확인
  - `src/context/context-sync.mjs` — ContextSynchronizer 클래스 확인
  - `src/router/balancer.mjs` — 4가지 밸런싱 전략 이름 확인
  - `src/orchestrator/parallel-executor.mjs` — 3가지 실행 모드 확인
  - `src/executor/acp-client.mjs` — ACP 클라이언트 공개 API 확인
  - `CHANGELOG.md:21-44` — v1.0.0 신규 기능 목록 (ground truth)

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/audit-3-features.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "v1.0.0" .sisyphus/evidence/audit-3-features.md
  # Assert: >= 1 (v1.0.0 coverage section present)
  
  grep -c "COVERAGE" .sisyphus/evidence/audit-3-features.md
  # Assert: >= 0 (tracks missing coverage items if any)
  ```

  **Commit**: NO

---

### Task 4: Audit `API-REFERENCE.md`

- [ ] 4. API 레퍼런스 감사

  **What to do**:
  - `docs/ko/API-REFERENCE.md`에 기술된 모든 모듈·함수·시그니처·반환값을 소스와 1:1 대조
  - 결과를 `.sisyphus/evidence/audit-4-api-reference.md`에 저장

  **감사 체크리스트 (Evidence to Collect)**:

  | # | 검증 항목 | 대조 소스 | 검증 방법 |
  |---|----------|----------|----------|
  | 4.1 | 모듈 위치 (`src/utils/usage.mjs` 등) | 실제 파일 경로 | glob 확인 |
  | 4.2 | `getUsageFromCache()` 시그니처 + 반환 타입 | `src/utils/usage.mjs` | read + ast_grep |
  | 4.3 | `checkThreshold()` 시그니처 + 기본값 (90) | `src/utils/usage.mjs` | read |
  | 4.4 | ProviderBalancer API | `src/router/balancer.mjs` | read export |
  | 4.5 | 밸런싱 전략 4가지 이름 | `src/router/balancer.mjs` | grep 전략명 |
  | 4.6 | `buildContext()` 시그니처 + 반환 타입 | `src/context/context-builder.mjs` | read |
  | 4.7 | ContextSynchronizer API | `src/context/context-sync.mjs` | read |
  | 4.8 | ParallelExecutor API | `src/orchestrator/parallel-executor.mjs` | read |
  | 4.9 | TaskRouter API | `src/orchestrator/task-router.mjs` | read |
  | 4.10 | OpenCodeWorker API | `src/orchestrator/opencode-worker.mjs` | read |
  | 4.11 | ServerPool API | `src/pool/server-pool.mjs` 또는 `src/executor/opencode-server-pool.mjs` | read |
  | 4.12 | ACP Client API | `src/executor/acp-client.mjs` | read |
  | 4.13 | RealtimeTracker API | `src/tracking/realtime-tracker.mjs` | read |
  | 4.14 | MetricsCollector API | `src/tracking/metrics-collector.mjs` | read |
  | 4.15 | 문서 목차(TOC)의 모든 섹션이 실제 모듈과 매핑 | 전체 src/ | glob 교차 확인 |
  | 4.16 | import 경로 정확성 (예: `from 'src/utils/usage.mjs'`) | 실제 import 방식 | read 확인 |

  **Must NOT do**:
  - API 수정/확장 제안
  - JSDoc 생성

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 다수의 함수 시그니처 대조 필요, 중간 난이도
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: 읽기 전용 감사 (mjs 파일이므로 TS 아님)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-8)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `docs/ko/API-REFERENCE.md` — 감사 대상 문서 전체
  - `src/utils/usage.mjs` — `getUsageFromCache()`, `checkThreshold()` 실제 구현
  - `src/router/balancer.mjs` — ProviderBalancer 클래스 + 전략 enum
  - `src/context/context-builder.mjs` — `buildContext()` 실제 시그니처
  - `src/context/context-sync.mjs` — ContextSynchronizer 실제 메서드
  - `src/orchestrator/parallel-executor.mjs` — ParallelExecutor 공개 API
  - `src/orchestrator/task-router.mjs` — TaskRouter 공개 API
  - `src/pool/server-pool.mjs` — ServerPool 공개 API
  - `src/executor/acp-client.mjs` — ACP Client 공개 API
  - `src/tracking/realtime-tracker.mjs` — RealtimeTracker 공개 API

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/audit-4-api-reference.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "| " .sisyphus/evidence/audit-4-api-reference.md
  # Assert: >= 16
  ```

  **Commit**: NO

---

### Task 5: Audit `CONFIGURATION.md`

- [ ] 5. 설정 가이드 감사

  **What to do**:
  - `docs/ko/CONFIGURATION.md`의 모든 설정 키·기본값·경로·스키마를 소스와 대조
  - 결과를 `.sisyphus/evidence/audit-5-configuration.md`에 저장

  **감사 체크리스트 (Evidence to Collect)**:

  | # | 검증 항목 | 대조 소스 | 검증 방법 |
  |---|----------|----------|----------|
  | 5.1 | 메인 설정 경로 (`~/.claude/plugins/omcm/config.json`) | `src/utils/config.mjs` | grep 경로 |
  | 5.2 | 프로바이더 제한 경로 (`~/.omcm/provider-limits.json`) | `src/utils/provider-limits.mjs` | grep 경로 |
  | 5.3 | DEFAULT_CONFIG 전체 키 목록 | `src/utils/config.mjs` | read default config |
  | 5.4 | 각 설정 키의 기본값 (fusionDefault=false, threshold=90 등) | `src/utils/config.mjs` | read |
  | 5.5 | routing 섹션 키 (enabled, usageThreshold, maxOpencodeWorkers 등) | `src/utils/config.mjs` | read |
  | 5.6 | context 섹션 키 (includeRecentFiles, recentFilesLimit 등) | `src/utils/config.mjs` | read |
  | 5.7 | opencode 섹션 키 (command, timeout 등) | `src/utils/config.mjs` | read |
  | 5.8 | notifications 섹션 키 | `src/utils/config.mjs` | read |
  | 5.9 | 에이전트 매핑 설정 (`~/.claude/plugins/omcm/agent-mapping.json`) | `src/router/mapping.mjs` | grep 경로 |
  | 5.10 | 라우팅 규칙 설정 (`~/.claude/plugins/omcm/routing-rules.json`) | `src/router/rules.mjs` | grep 경로 |
  | 5.11 | LRU 캐시 설정 (100 항목, 5분 TTL) | `src/router/cache.mjs` | read 기본값 |
  | 5.12 | 설정 스키마 검증 (`src/config/schema.mjs`) | `src/config/schema.mjs` | read |
  | 5.13 | hooks.json 구조 | `hooks/hooks.json` | read |
  | 5.14 | 환경 변수 목록 | 소스 코드 전체 | grep `process.env` |
  | 5.15 | maxOpencodeWorkers 범위 (문서: 1-25 권장) | 소스 내 validation | read |

  **Must NOT do**:
  - 설정 파일 생성/수정
  - 스키마 변경 제안

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 설정 키/값 문자열 대조, 패턴 검색
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: 읽기 전용

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-8)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `docs/ko/CONFIGURATION.md` — 감사 대상 문서 전체
  - `src/utils/config.mjs` — DEFAULT_CONFIG 객체, 설정 로드 로직, 경로 정의
  - `src/utils/provider-limits.mjs` — 프로바이더 제한 파일 경로 + 구조
  - `src/router/mapping.mjs` — 동적 매핑 설정 파일 경로
  - `src/router/rules.mjs` — 라우팅 규칙 설정 파일 경로
  - `src/router/cache.mjs` — LRU 캐시 기본값 (항목 수, TTL)
  - `src/config/schema.mjs` — 설정 스키마 검증 로직
  - `hooks/hooks.json` — 훅 정의 구조

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/audit-5-configuration.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "CONFIG\|기본값\|default" .sisyphus/evidence/audit-5-configuration.md
  # Assert: >= 5 (config-specific findings)
  ```

  **Commit**: NO

---

### Task 6: Audit `FUSION-GUIDE.md`

- [ ] 6. 퓨전 가이드 감사

  **What to do**:
  - `docs/ko/FUSION-GUIDE.md`의 모든 퓨전 관련 설명·키워드·매핑·시나리오를 소스와 대조
  - 결과를 `.sisyphus/evidence/audit-6-fusion-guide.md`에 저장

  **감사 체크리스트 (Evidence to Collect)**:

  | # | 검증 항목 | 대조 소스 | 검증 방법 |
  |---|----------|----------|----------|
  | 6.1 | 퓨전 모드 개요 (62% 절약, 18개 에이전트 오프로드) | `agent-fusion-map.mjs` | 실제 매핑 개수 세기 |
  | 6.2 | 토큰 절약 아키텍처 다이어그램 정확성 | 전체 구조 | 논리적 대조 |
  | 6.3 | 핵심 원칙 (HIGH→Claude, MED→GPT, LOW→Gemini) | `agent-fusion-map.mjs` | read 매핑 |
  | 6.4 | hulw/ulw/autopilot 키워드 인식 정확성 | `commands/*.md`, 소스 감지 로직 | read + grep |
  | 6.5 | 퓨전 명령어 목록 (/hulw, /ulw, /autopilot 등) | `commands/` 디렉토리 | glob 대조 |
  | 6.6 | `fusionDefault` on/off 동작 설명 | `src/hooks/fusion-router-logic.mjs` | read 분기 로직 |
  | 6.7 | 사용 시나리오별 동작 (사용량 <70%, 70-90%, >90%) | `src/orchestrator/hybrid-ultrawork.mjs` | read 임계값 |
  | 6.8 | 베스트 프랙티스 실행 가능성 | 소스 코드 전반 | 논리적 검증 |
  | 6.9 | 고급 주제 (서버 풀, 병렬 확장) | `src/pool/`, `src/orchestrator/` | read |
  | 6.10 | 에이전트별 매핑 테이블 (FEATURES.md와 일관성) | `agent-fusion-map.mjs` | cross-ref |

  **Must NOT do**:
  - 퓨전 로직 수정 제안
  - 새로운 사용 시나리오 작성

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 키워드/매핑 대조 위주
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI 관련 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7-8)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `docs/ko/FUSION-GUIDE.md` — 감사 대상 문서 전체
  - `src/orchestrator/agent-fusion-map.mjs` — 에이전트 매핑의 진본(ground truth)
  - `src/hooks/fusion-router-logic.mjs` — fusionDefault 분기 로직
  - `src/orchestrator/hybrid-ultrawork.mjs` — ulw 사용량 임계값 로직
  - `commands/hulw.md` — hulw 커맨드 정의
  - `commands/ulw.md` — ulw 커맨드 정의
  - `commands/autopilot.md` — autopilot 커맨드 정의

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/audit-6-fusion-guide.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "| " .sisyphus/evidence/audit-6-fusion-guide.md
  # Assert: >= 10
  ```

  **Commit**: NO

---

### Task 7: Audit `SKILLS-REFERENCE.md`

- [ ] 7. 스킬 레퍼런스 감사

  **What to do**:
  - `docs/ko/SKILLS-REFERENCE.md`의 모든 스킬·트리거·커맨드·동작 흐름을 소스와 대조
  - 결과를 `.sisyphus/evidence/audit-7-skills-reference.md`에 저장

  **감사 체크리스트 (Evidence to Collect)**:

  | # | 검증 항목 | 대조 소스 | 검증 방법 |
  |---|----------|----------|----------|
  | 7.1 | 스킬 목록 완전성 (문서 vs commands/) | `commands/*.md` 파일 목록 | glob 대조 |
  | 7.2 | autopilot 트리거 키워드 ("autopilot", "만들어줘", "build me" 등) | `commands/autopilot.md` | read |
  | 7.3 | ulw 트리거 키워드 ("ulw", "울트라워크" 등) | `commands/ulw.md` | read |
  | 7.4 | hulw 트리거 키워드 | `commands/hulw.md` | read |
  | 7.5 | ecomode 스킬 존재 여부 | `commands/` 내 해당 파일 | glob |
  | 7.6 | ralph 스킬 존재 여부 | `commands/` 내 해당 파일 | glob |
  | 7.7 | opencode 스킬 동작 | `commands/opencode.md` | read |
  | 7.8 | cancel 스킬 동작 | `commands/cancel-autopilot.md` | read |
  | 7.9 | 각 스킬의 동작 흐름 설명 정확성 | 해당 command md + 소스 | read |
  | 7.10 | 스킬 조합 규칙 (예: "autopilot hulw") | 소스 내 키워드 감지 로직 | read |
  | 7.11 | 문서에 있으나 commands/에 없는 스킬 (PHANTOM) | commands/ glob | 교차 확인 |
  | 7.12 | commands/에 있으나 문서에 없는 스킬 (MISSING) | 문서 내 키워드 검색 | grep |

  **Must NOT do**:
  - 스킬 추가/수정 제안
  - 새로운 조합 규칙 제안

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 파일 목록 대조 + 키워드 검색
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: 읽기 전용

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-6, 8)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `docs/ko/SKILLS-REFERENCE.md` — 감사 대상 문서 전체
  - `commands/autopilot.md` — autopilot 스킬 정의 + 트리거
  - `commands/ulw.md` — ulw 스킬 정의 + 트리거
  - `commands/hulw.md` — hulw 스킬 정의 + 트리거
  - `commands/opencode.md` — opencode 스킬 정의
  - `commands/cancel-autopilot.md` — cancel 스킬 정의
  - `commands/fusion-setup.md` — fusion-setup 커맨드
  - `commands/fusion-default-on.md` — 퓨전 기본값 on
  - `commands/fusion-default-off.md` — 퓨전 기본값 off

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/audit-7-skills-reference.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "PHANTOM\|MISSING" .sisyphus/evidence/audit-7-skills-reference.md
  # Assert: >= 0 (tracks phantom/missing items)
  ```

  **Commit**: NO

---

### Task 8: Audit `TROUBLESHOOTING.md`

- [ ] 8. 문제 해결 가이드 감사

  **What to do**:
  - `docs/ko/TROUBLESHOOTING.md`의 모든 증상·해결책·명령어·경로를 소스와 대조
  - 결과를 `.sisyphus/evidence/audit-8-troubleshooting.md`에 저장

  **감사 체크리스트 (Evidence to Collect)**:

  | # | 검증 항목 | 대조 소스 | 검증 방법 |
  |---|----------|----------|----------|
  | 8.1 | 설치 관련 문제의 명령어 정확성 (npm, claude 등) | 공식 문서 / 문서 내 일관성 | read |
  | 8.2 | OpenCode 연결 문제 해결책 | `src/executor/opencode-executor.mjs` | read 에러 핸들링 |
  | 8.3 | 퓨전 라우팅 문제 해결책 | `src/hooks/fusion-router-logic.mjs` | read |
  | 8.4 | HUD 문제 해결책 | `src/hud/*.mjs`, `scripts/install-hud.sh` | read |
  | 8.5 | 서버 풀 문제 해결책 | `src/pool/server-pool.mjs`, `scripts/opencode-server.sh` | read |
  | 8.6 | 설정/훅 문제 해결책 | `hooks/hooks.json`, `src/utils/config.mjs` | read |
  | 8.7 | 성능 최적화 조언의 실행 가능성 | 소스 코드 전반 | 논리적 검증 |
  | 8.8 | 진단 도구 사용법 | 스크립트 파일들 | glob + read |
  | 8.9 | 에러 메시지 사전의 에러 코드 정확성 | 소스 코드 에러 throw | grep 에러 메시지 |
  | 8.10 | FAQ 답변의 기술적 정확성 | 관련 소스 | 교차 확인 |
  | 8.11 | `scripts/opencode-server.sh` 명령어 (start/stop/status/logs) | 스크립트 존재 + 내용 | read |
  | 8.12 | v1.0.0 신규 기능 관련 트러블슈팅 존재 여부 | 전체 문서 | 키워드 검색 |

  **Must NOT do**:
  - 해결책 수정/보완 제안
  - 새로운 트러블슈팅 항목 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 경로/명령어 존재 확인 + 텍스트 대조
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: 읽기 전용 감사

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-7)
  - **Blocks**: Task 9
  - **Blocked By**: None

  **References**:
  - `docs/ko/TROUBLESHOOTING.md` — 감사 대상 문서 전체
  - `src/executor/opencode-executor.mjs` — OpenCode 실행 에러 패턴
  - `src/hooks/fusion-router-logic.mjs` — 라우팅 실패 조건
  - `src/hud/omcm-hud.mjs` — HUD 렌더링 로직
  - `scripts/install-hud.sh` — HUD 설치 스크립트
  - `scripts/opencode-server.sh` — 서버 관리 스크립트
  - `src/pool/server-pool.mjs` — 서버 풀 에러 핸들링
  - `hooks/hooks.json` — 훅 정의 구조

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/audit-8-troubleshooting.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "| " .sisyphus/evidence/audit-8-troubleshooting.md
  # Assert: >= 12
  ```

  **Commit**: NO

---

### Task 9: Synthesize Audit Report + v1.0.0 Coverage Matrix

- [ ] 9. 종합 감사 리포트 작성

  **What to do**:
  - Task 1-8의 결과를 통합하여 종합 리포트 작성
  - v1.0.0 신규 기능 커버리지 매트릭스 생성
  - 결과를 `.sisyphus/evidence/ko-docs-audit-report.md`에 저장

  **작성 항목**:

  1. **종합 통계 테이블**:
     ```markdown
     | 문서 | 검증 항목 수 | ✅ 정확 | ⚠️ 불일치 | 🔴 High | 🟡 Medium | 🟢 Low |
     |------|------------|--------|----------|---------|-----------|--------|
     | INSTALLATION | N | ... | ... | ... | ... | ... |
     | ... | | | | | | |
     | **합계** | **N** | ... | ... | ... | ... | ... |
     ```

  2. **v1.0.0 신규 기능 커버리지 매트릭스**:
     ```markdown
     | 신규 기능 | INSTALL | ARCH | FEAT | API | CONFIG | FUSION | SKILLS | TROUBLE | 상태 |
     |----------|---------|------|------|-----|--------|--------|--------|---------|------|
     | 실시간 추적 | - | ✅ | ✅ | ✅ | - | - | - | ❌ | 부분 |
     | 밸런싱 | - | ✅ | ✅ | ✅ | ✅ | - | - | ❌ | 부분 |
     | 컨텍스트 전달 | - | ✅ | ✅ | ✅ | - | - | - | ❌ | 부분 |
     | 병렬 실행기 | - | ✅ | ✅ | ✅ | - | - | - | ❌ | 부분 |
     | ACP 클라이언트 | - | - | ? | ✅ | - | - | - | - | ? |
     | Serve 모드 | - | ? | ? | ? | - | - | - | - | ? |
     | 서버 풀 | - | ✅ | ✅ | ✅ | - | ✅ | - | ✅ | 양호 |
     | 퓨전 라우터 | - | ✅ | ✅ | - | ✅ | ✅ | - | ✅ | 양호 |
     ```

  3. **심각도별 불일치 목록** (High → Medium → Low 순 정렬)

  4. **문제 유형별 분포**:
     ```markdown
     | 문제 유형 | 건수 | 비율 |
     |----------|------|------|
     | PATH | N | X% |
     | API | N | X% |
     | ... | | |
     ```

  5. **권장 우선순위 목록** (High 심각도 항목 우선)

  **Must NOT do**:
  - 문서 수정 PR 생성
  - 코드 변경 제안

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 8개 감사 결과를 통합 분석하여 구조화된 리포트 작성
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `data-scientist`: 단순 집계이므로 불필요
    - `typescript-programmer`: 코드 작성 아님

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential, after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6, 7, 8

  **References**:
  - `.sisyphus/evidence/audit-1-installation.md` — Task 1 결과
  - `.sisyphus/evidence/audit-2-architecture.md` — Task 2 결과
  - `.sisyphus/evidence/audit-3-features.md` — Task 3 결과
  - `.sisyphus/evidence/audit-4-api-reference.md` — Task 4 결과
  - `.sisyphus/evidence/audit-5-configuration.md` — Task 5 결과
  - `.sisyphus/evidence/audit-6-fusion-guide.md` — Task 6 결과
  - `.sisyphus/evidence/audit-7-skills-reference.md` — Task 7 결과
  - `.sisyphus/evidence/audit-8-troubleshooting.md` — Task 8 결과
  - `CHANGELOG.md:21-44` — v1.0.0 신규 기능 목록 (ground truth for coverage matrix)

  **Acceptance Criteria**:
  ```bash
  test -f .sisyphus/evidence/ko-docs-audit-report.md && echo "EXISTS" || echo "MISSING"
  # Assert: "EXISTS"
  
  grep -c "v1.0.0" .sisyphus/evidence/ko-docs-audit-report.md
  # Assert: >= 3 (coverage matrix present)
  
  grep -c "합계\|Total" .sisyphus/evidence/ko-docs-audit-report.md
  # Assert: >= 1 (summary statistics present)
  
  grep -c "🔴\|High" .sisyphus/evidence/ko-docs-audit-report.md
  # Assert: >= 0 (severity tracking present)
  ```

  **Commit**: NO

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| N/A | N/A | N/A | N/A |

> 이 플랜은 감사 전용(audit-only)이므로 커밋이 필요하지 않습니다. 모든 결과물은 `.sisyphus/evidence/`에 저장됩니다.

---

## Success Criteria

### Verification Commands
```bash
# 모든 감사 결과 파일 존재 확인
ls -la .sisyphus/evidence/audit-*.md | wc -l
# Expected: 8

# 종합 리포트 존재 확인
test -f .sisyphus/evidence/ko-docs-audit-report.md && echo "PASS" || echo "FAIL"
# Expected: PASS

# v1.0.0 커버리지 매트릭스 포함 확인
grep -c "신규 기능" .sisyphus/evidence/ko-docs-audit-report.md
# Expected: >= 1

# 문제 유형 분류 사용 확인 (최소 3가지 유형)
grep -cE "PATH|API|MISSING|PHANTOM|STALE|CONFIG|BEHAVIOR|TYPO|COVERAGE" .sisyphus/evidence/ko-docs-audit-report.md
# Expected: >= 3
```

### Final Checklist
- [ ] 8개 문서 모두 감사 완료 (audit-1 ~ audit-8)
- [ ] 모든 감사 테이블이 5-column 표준 형식 사용
- [ ] v1.0.0 신규 기능 8개 항목 커버리지 확인
- [ ] 종합 리포트에 심각도별 통계 포함
- [ ] 종합 리포트에 문제 유형별 분포 포함
- [ ] 종합 리포트에 권장 우선순위 목록 포함
- [ ] `.sisyphus/evidence/` 내 9개 파일 모두 존재
