# CoffeeTree 32개 전략 백테스트 성과 보고서 생성

## TL;DR

> **Quick Summary**: 사용자가 제공한 32개 전략 JSON 데이터를 파싱하여 한국어 마크다운 성과 보고서(`/tmp/strategy-performance-report.md`)를 생성한다. 8개 섹션(제목, 테스트 조건, 요약 통계, 수익률 순위, 샤프비율 순위, 티어별 평균, 손실 전략 분석, GENERATION_FAILED 주석)을 포함하며, N/A 처리·정렬·필터링 규칙을 정확히 준수한다.
>
> **Deliverables**:
> - `/tmp/strategy-performance-report.md` — 완성된 보고서 파일 (Korean markdown)
>
> **Estimated Effort**: Short (단일 스크립트 실행으로 완료)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request
사용자가 인라인 JSON으로 32개 CoffeeTree 전략 템플릿 백테스트 결과를 제공하고, 이를 정해진 8개 섹션의 한국어 마크다운 보고서로 변환하도록 요청했다.

### Interview Summary
**Key Discussions**:
- JSON 데이터: 인라인 제공, 외부 파일/API 없음 → 스크립트에 직접 임베드
- 8개 섹션: 사용자 명시 구조 그대로 사용 (아래 Work Objectives 참조)
- GENERATION_FAILED: 1개 전략, 메인 테이블에 N/A로 포함(32개 유지), 수치 계산에서 제외, §8에 별도 주석
- 정렬: §4 totalReturn 내림차순, §5 sharpeRatio 내림차순
- 요약 통계: PASS/FAIL 카운트, 평균 totalReturn (numeric만), best/worst by totalReturn, 평균 sharpeRatio (numeric만)
- 검증: 파일 존재+비어있지 않음, 8개 섹션 존재, 메인 테이블 32행, 정렬 검증, 손실 분석 필터 검증

### Metis Review
**Identified Gaps** (addressed):
- 티어(tier) 분류 기준: JSON에 tier 필드가 있다고 가정. 없으면 전략 이름에서 추론하거나 단일 "미분류" 그룹으로 처리 → **Guardrail**: 실행자가 JSON 스키마를 먼저 확인하고, tier 필드 없으면 "tier 없음" 단일 그룹 처리
- 소수점 자릿수: 사용자 미명시 → **Default**: totalReturn은 소수점 2자리 (%), sharpeRatio는 소수점 4자리
- 마크다운 테이블 열 구성: 사용자 미명시 → **Default**: 전략명, totalReturn, sharpeRatio, maxDrawdown, winRate (가용 필드에 따라 조정)

---

## Work Objectives

### Core Objective
인라인 JSON 32개 전략 데이터를 파싱하여 `/tmp/strategy-performance-report.md`에 정확한 8-섹션 한국어 보고서를 생성한다.

### Report Structure (8 Sections — EXACT)

| # | 섹션 제목 (Korean) | 내용 |
|---|---------------------|------|
| 1 | **제목** | `# CoffeeTree 32개 전략 템플릿 백테스트 성과 보고서` + 생성 일시 |
| 2 | **테스트 조건 요약** | JSON에서 추출한 백테스트 공통 조건 (기간, 초기자본, 수수료 등) |
| 3 | **전체 요약 통계** | PASS/FAIL 카운트, 평균 totalReturn (numeric), best/worst 전략, 평균 sharpeRatio (numeric) |
| 4 | **수익률 순위 테이블** | 32개 전략 테이블, totalReturn 내림차순, GENERATION_FAILED는 N/A |
| 5 | **샤프비율 순위 테이블** | 32개 전략 테이블, sharpeRatio 내림차순, GENERATION_FAILED는 N/A |
| 6 | **티어별 평균 성과** | tier 그룹별 평균 totalReturn, sharpeRatio 등 |
| 7 | **손실 전략 분석** | totalReturn < 0인 전략만 (GENERATION_FAILED 제외) |
| 8 | **GENERATION_FAILED 전략 주석** | 1개 실패 전략의 name/id, 실패 사유, 수치 계산 제외 안내 |

### Concrete Deliverables
- `/tmp/strategy-performance-report.md` — 완전한 8-섹션 마크다운 보고서

### Definition of Done
- [ ] `/tmp/strategy-performance-report.md` 파일 존재 & 비어있지 않음
- [ ] 8개 섹션 헤더 모두 존재
- [ ] 수익률 순위 테이블에 정확히 32개 행
- [ ] 샤프비율 순위 테이블에 정확히 32개 행
- [ ] 수익률 테이블이 totalReturn 내림차순 정렬
- [ ] 샤프비율 테이블이 sharpeRatio 내림차순 정렬
- [ ] GENERATION_FAILED 전략이 메인 테이블에 N/A로 표시
- [ ] 손실 분석에 totalReturn < 0인 전략만 포함 (GENERATION_FAILED 제외)
- [ ] §8에 GENERATION_FAILED 전략 명시적 주석

### Must Have
- 모든 텍스트/헤더/주석은 한국어
- 32개 전략 전부 누락 없이 포함
- GENERATION_FAILED 전략은 수치 계산(평균, best/worst)에서 제외
- 정렬 규칙 정확히 준수

### Must NOT Have (Guardrails)
- JSON에 없는 데이터를 임의로 생성하지 말 것
- N/A 필드에 0이나 빈 문자열 대신 반드시 `N/A` 리터럴 사용
- GENERATION_FAILED 전략을 수치 평균/best/worst 계산에 포함하지 말 것
- 32개 미만 또는 초과 행으로 테이블 생성하지 말 것
- 영어 섹션 헤더 사용 금지 — 모두 한국어

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A (보고서 생성 작업, 단위 테스트 불필요)
- **User wants tests**: Manual-only (자동 검증 스크립트로 대체)
- **Framework**: none (bash + grep/wc 기반 자동 검증)

### Automated Verification (ALWAYS include)

모든 검증은 bash 명령어로 에이전트가 직접 실행합니다.

```bash
# V1: 파일 존재 & 비어있지 않음
test -s /tmp/strategy-performance-report.md && echo "PASS: file exists and non-empty" || echo "FAIL"

# V2: 8개 섹션 헤더 확인 (## 또는 # 레벨)
SECTION_COUNT=$(grep -cE '^#{1,2} ' /tmp/strategy-performance-report.md)
[ "$SECTION_COUNT" -ge 8 ] && echo "PASS: $SECTION_COUNT sections found" || echo "FAIL: only $SECTION_COUNT sections"

# V3: 수익률 순위 테이블 행 수 (헤더/구분선 제외, 데이터 행만)
RETURN_ROWS=$(sed -n '/수익률 순위/,/^## /p' /tmp/strategy-performance-report.md | grep -c '^|[^-]' )
DATA_ROWS=$((RETURN_ROWS - 1))
[ "$DATA_ROWS" -eq 32 ] && echo "PASS: 32 strategy rows in return table" || echo "FAIL: $DATA_ROWS rows"

# V4: 샤프비율 순위 테이블 행 수
SHARPE_ROWS=$(sed -n '/샤프비율 순위/,/^## /p' /tmp/strategy-performance-report.md | grep -c '^|[^-]')
SHARPE_DATA=$((SHARPE_ROWS - 1))
[ "$SHARPE_DATA" -eq 32 ] && echo "PASS: 32 strategy rows in sharpe table" || echo "FAIL: $SHARPE_DATA rows"

# V5: 수익률 테이블 내림차순 정렬 검증
# totalReturn 열 추출 → N/A 제외 → 원본 순서 vs sort -rn 비교
ORIGINAL=$(sed -n '/수익률 순위/,/^## /p' /tmp/strategy-performance-report.md \
  | grep '^|' | grep -v '^|[-—]' | tail -n +2 \
  | awk -F'|' '{gsub(/[ %]/, "", $4); if($4 != "N/A" && $4 != "") print $4}')
SORTED=$(echo "$ORIGINAL" | sort -rn)
[ "$ORIGINAL" = "$SORTED" ] && echo "PASS: return table sorted DESC" || echo "FAIL: return table NOT sorted DESC"

# V6: 샤프비율 테이블 내림차순 정렬 검증
ORIG_SHARPE=$(sed -n '/샤프비율 순위/,/^## /p' /tmp/strategy-performance-report.md \
  | grep '^|' | grep -v '^|[-—]' | tail -n +2 \
  | awk -F'|' '{gsub(/[ ]/, "", $4); if($4 != "N/A" && $4 != "") print $4}')
SORT_SHARPE=$(echo "$ORIG_SHARPE" | sort -rn)
[ "$ORIG_SHARPE" = "$SORT_SHARPE" ] && echo "PASS: sharpe table sorted DESC" || echo "FAIL: sharpe table NOT sorted DESC"

# V7: 손실 분석에 GENERATION_FAILED 없는지
LOSS_SECTION=$(sed -n '/손실 전략 분석/,/^## /p' /tmp/strategy-performance-report.md)
echo "$LOSS_SECTION" | grep -qi 'generation.failed' && echo "FAIL: GENERATION_FAILED in loss section" || echo "PASS: no GENERATION_FAILED in loss section"

# V8: GENERATION_FAILED 주석 섹션 존재
grep -q 'GENERATION_FAILED' /tmp/strategy-performance-report.md && echo "PASS: GENERATION_FAILED note exists" || echo "FAIL: missing GENERATION_FAILED note"
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: JSON 스키마 분석 & 데이터 구조 확인 (빠른 탐색)
└── (no parallel peer — single fast task)

Wave 2 (After Wave 1):
└── Task 2: 보고서 생성 스크립트 작성 & 실행

Wave 3 (After Wave 2):
└── Task 3: 자동 검증 스크립트 실행

Wave 4 (After Wave 3 if needed):
└── Task 4: 검증 실패 시 수정 & 재검증
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 3 | None |
| 3 | 2 | 4 | None |
| 4 | 3 (conditional) | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `explore` (haiku) — JSON 스키마 확인 |
| 2 | 2 | `executor` (sonnet) — 스크립트 작성+실행 |
| 3 | 3 | `executor-low` (haiku) — 검증 명령 실행 |
| 4 | 4 | `executor` (sonnet) — 수정 (조건부) |

---

## TODOs

- [ ] 1. JSON 데이터 스키마 분석 & 필드 매핑

  **What to do**:
  - 사용자가 제공한 인라인 JSON의 전체 구조를 확인
  - 32개 전략 객체의 공통 필드 목록 추출: `name`, `id`, `status`, `totalReturn`, `sharpeRatio`, `maxDrawdown`, `winRate`, `tier` 등
  - `status === "GENERATION_FAILED"` 인 전략 1개 식별 (name/id 기록)
  - `tier` 필드 존재 여부 확인 → 없으면 대체 분류 방법 결정
  - 테스트 조건 관련 필드 확인 (기간, 초기자본, 수수료, 벤치마크 등)
  - 모든 수치 필드의 타입(number/string/null) 확인

  **Must NOT do**:
  - JSON에 없는 필드를 가정하지 말 것
  - 데이터를 수정하지 말 것 — 읽기 전용 분석만

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 데이터 구조 읽기 작업, 복잡한 추론 불필요
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: NO (첫 번째 작업)
  - **Parallel Group**: Wave 1 (단독)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Data Source**:
  - 사용자 메시지의 인라인 JSON — 전체 32개 전략 배열 (이전 대화에서 사용자가 제공)

  **WHY Each Reference Matters**:
  - 인라인 JSON이 유일한 데이터 소스. 실행자는 이전 대화 컨텍스트에서 JSON을 가져와야 함

  **Acceptance Criteria**:

  **Automated Verification:**
  ```bash
  # 에이전트가 JSON 필드 목록을 확인했음을 출력으로 검증
  # 최소: status=GENERATION_FAILED인 전략 1개 식별 완료
  echo "Schema analysis complete. Proceeding to report generation."
  ```

  **Evidence to Capture:**
  - [ ] 32개 전략의 공통 필드 목록
  - [ ] GENERATION_FAILED 전략의 name/id
  - [ ] tier 필드 존재 여부
  - [ ] 테스트 조건 필드 목록

  **Commit**: NO (분석만, 파일 생성 없음)

---

- [ ] 2. 보고서 생성 스크립트 작성 및 실행

  **What to do**:

  **2-A. 계산 로직 (스크립트 내 구현)**:

  아래 요약 통계를 JSON 데이터에서 계산:

  | 통계 | 계산 방법 | 비고 |
  |------|-----------|------|
  | PASS 카운트 | `strategies.filter(s => s.status !== "GENERATION_FAILED").length` | |
  | FAIL 카운트 | `strategies.filter(s => s.status === "GENERATION_FAILED").length` | 1이어야 함 |
  | 평균 totalReturn | `numericStrategies.reduce(sum) / numericStrategies.length` | GENERATION_FAILED 제외 |
  | Best 전략 (totalReturn) | `max(numericStrategies, by totalReturn)` | name + 값 |
  | Worst 전략 (totalReturn) | `min(numericStrategies, by totalReturn)` | name + 값 |
  | 평균 sharpeRatio | `numericStrategies.reduce(sum) / numericStrategies.length` | GENERATION_FAILED 제외 |

  여기서 `numericStrategies = strategies.filter(s => s.status !== "GENERATION_FAILED")`

  **2-B. 정렬 로직**:

  | 테이블 | 정렬 필드 | 방향 | N/A 위치 |
  |--------|-----------|------|----------|
  | §4 수익률 순위 | totalReturn | 내림차순 | 맨 하단 |
  | §5 샤프비율 순위 | sharpeRatio | 내림차순 | 맨 하단 |

  GENERATION_FAILED 전략은 수치가 없으므로 정렬 시 맨 하단 배치, 모든 지표 열에 `N/A` 표시.

  **2-C. 마크다운 생성 (섹션별)**:

  ```
  섹션 1: # CoffeeTree 32개 전략 템플릿 백테스트 성과 보고서
         > 생성일시: YYYY-MM-DD HH:mm:ss

  섹션 2: ## 테스트 조건 요약
         | 항목 | 값 |
         |------|-----|
         | 테스트 기간 | ... |
         | 초기 자본 | ... |
         | 수수료 | ... |
         (JSON에서 추출 가능한 공통 조건)

  섹션 3: ## 전체 요약 통계
         | 항목 | 값 |
         |------|-----|
         | 총 전략 수 | 32 |
         | 성공 (PASS) | {PASS_COUNT} |
         | 실패 (GENERATION_FAILED) | {FAIL_COUNT} |
         | 평균 수익률 (PASS만) | {AVG_RETURN}% |
         | 최고 수익률 전략 | {BEST_NAME} ({BEST_RETURN}%) |
         | 최저 수익률 전략 | {WORST_NAME} ({WORST_RETURN}%) |
         | 평균 샤프비율 (PASS만) | {AVG_SHARPE} |

  섹션 4: ## 수익률 순위 테이블
         | 순위 | 전략명 | 총수익률(%) | 샤프비율 | 최대낙폭(%) | 승률(%) |
         totalReturn DESC, GENERATION_FAILED는 맨 하단 N/A

  섹션 5: ## 샤프비율 순위 테이블
         | 순위 | 전략명 | 샤프비율 | 총수익률(%) | 최대낙폭(%) | 승률(%) |
         sharpeRatio DESC, GENERATION_FAILED는 맨 하단 N/A

  섹션 6: ## 티어별 평균 성과
         | 티어 | 전략 수 | 평균 수익률(%) | 평균 샤프비율 | 평균 최대낙폭(%) |
         tier별 그룹화 → 각 그룹 평균 (GENERATION_FAILED 제외)

  섹션 7: ## 손실 전략 분석
         | 전략명 | 총수익률(%) | 샤프비율 | 최대낙폭(%) |
         WHERE totalReturn < 0 AND status !== "GENERATION_FAILED"

  섹션 8: ## GENERATION_FAILED 전략 주석
         > ⚠️ 다음 전략은 백테스트 생성에 실패하여 성과 데이터가 없습니다.
         > - **전략명**: {FAILED_STRATEGY_NAME}
         > - **전략 ID**: {FAILED_STRATEGY_ID}
         > - **상태**: GENERATION_FAILED
         >
         > 해당 전략은 수익률 순위(§4), 샤프비율 순위(§5) 테이블에 N/A로 표시되며,
         > 전체 요약 통계(§3), 티어별 평균(§6), 손실 분석(§7)의 수치 계산에서 제외되었습니다.
  ```

  **2-D. 파일 쓰기**:
  - 생성된 마크다운을 `/tmp/strategy-performance-report.md`에 저장
  - UTF-8 인코딩

  **Must NOT do**:
  - JSON에 없는 값을 임의 생성하지 말 것
  - 테이블 열 이름을 영어로 작성하지 말 것
  - GENERATION_FAILED 전략의 수치를 0으로 치환하지 말 것 — 반드시 `N/A`
  - GENERATION_FAILED를 §3 평균, §6 티어 평균, §7 손실 분석에 포함하지 말 것

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 복잡한 데이터 변환 + 정확한 마크다운 생성 필요, 계산 정확성 중요
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (단독)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - Task 1의 출력 — JSON 스키마 분석 결과 (필드명, 타입, tier 존재 여부)

  **Data Source**:
  - 사용자 대화에서 제공한 인라인 JSON (32개 전략 배열)

  **WHY Each Reference Matters**:
  - Task 1 결과가 테이블 열 구성과 tier 그룹핑 전략을 결정
  - 인라인 JSON이 유일한 데이터 소스이므로 스크립트에 직접 임베드해야 함

  **Acceptance Criteria**:

  **Automated Verification:**
  ```bash
  # 파일 존재 + 비어있지 않음
  test -s /tmp/strategy-performance-report.md && echo "PASS: file created" || echo "FAIL: file missing"

  # 파일 크기 (최소 2KB 이상이어야 32개 전략 테이블 포함 가능)
  SIZE=$(wc -c < /tmp/strategy-performance-report.md)
  [ "$SIZE" -gt 2000 ] && echo "PASS: size=$SIZE bytes" || echo "FAIL: too small ($SIZE bytes)"

  # 제목 확인
  head -1 /tmp/strategy-performance-report.md | grep -q 'CoffeeTree' && echo "PASS: title" || echo "FAIL: title"
  ```

  **Evidence to Capture:**
  - [ ] `/tmp/strategy-performance-report.md` 파일 존재 확인
  - [ ] 파일 크기 (bytes)
  - [ ] head -20 출력 (상위 20줄)

  **Commit**: NO (보고서는 /tmp/ 에 생성, 프로젝트 파일 아님)

---

- [ ] 3. 자동 검증 — 8개 항목 전수 검사

  **What to do**:
  아래 8개 검증 항목을 bash 명령어로 순차 실행하고 결과를 기록:

  | # | 검증 항목 | 명령어 개요 | 기대값 |
  |---|-----------|-------------|--------|
  | V1 | 파일 존재 & 비어있지 않음 | `test -s /tmp/strategy-performance-report.md` | PASS |
  | V2 | 8개 섹션 헤더 존재 | `grep -cE '^#{1,2} '` ≥ 8 | ≥ 8 |
  | V3 | 수익률 테이블 32행 | sed+grep 파이프라인 | 32 데이터 행 |
  | V4 | 샤프비율 테이블 32행 | sed+grep 파이프라인 | 32 데이터 행 |
  | V5 | 수익률 테이블 내림차순 | awk 열 추출 → sort -rn 비교 | 일치 |
  | V6 | 샤프비율 테이블 내림차순 | awk 열 추출 → sort -rn 비교 | 일치 |
  | V7 | 손실 분석에 GENERATION_FAILED 미포함 | grep 체크 | 미발견 |
  | V8 | §8 GENERATION_FAILED 주석 존재 | grep 체크 | 발견 |

  **Must NOT do**:
  - 검증 실패를 무시하지 말 것 — 실패 항목을 명확히 기록
  - 파일을 수정하지 말 것 — 읽기 전용 검증만

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: bash 명령어 실행만, 간단한 패턴 매칭
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (단독)
  - **Blocks**: Task 4 (조건부)
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - 이 플랜의 "Verification Strategy" 섹션 — 검증 bash 스크립트 전문

  **WHY Each Reference Matters**:
  - 검증 명령어가 이미 이 플랜에 정의되어 있으므로 실행자가 그대로 사용

  **Acceptance Criteria**:

  **Automated Verification:**
  ```bash
  # 모든 8개 검증 항목 실행 결과를 터미널에 출력
  # 각 항목별 PASS/FAIL 확인
  # 최종 요약: "8/8 PASS" 또는 "N/8 PASS, M FAIL"
  PASS_COUNT=0; FAIL_COUNT=0
  for result in V1 V2 V3 V4 V5 V6 V7 V8; do
    echo "$result: [PASS or FAIL]"
  done
  echo "Total: $PASS_COUNT/8 PASS"
  ```

  **Evidence to Capture:**
  - [ ] 8개 검증 항목 각각의 PASS/FAIL 결과
  - [ ] 실패 항목이 있으면 구체적 오류 메시지

  **Commit**: NO

---

- [ ] 4. (조건부) 검증 실패 항목 수정 및 재검증

  **What to do**:
  - Task 3에서 FAIL이 1개 이상이면 실행
  - FAIL 원인 분석 후 `/tmp/strategy-performance-report.md` 수정
  - Task 3의 검증을 다시 실행하여 8/8 PASS 확인
  - 수정 루프는 최대 3회 반복 후 실패 항목을 사용자에게 보고

  **Must NOT do**:
  - 검증을 우회하지 말 것
  - FAIL 항목을 "minor"로 무시하지 말 것

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 검증 실패 원인을 정확히 분석하고 수정해야 함
  - **Skills**: 없음

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (조건부, Task 3 FAIL 시에만)
  - **Blocks**: None (최종 작업)
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - Task 3의 검증 결과 출력 — 어떤 항목이 FAIL인지 확인
  - Task 2의 생성 로직 — 어떤 로직이 잘못되었는지 추적

  **WHY Each Reference Matters**:
  - FAIL 원인을 추적하려면 생성 로직과 검증 결과 모두 필요

  **Acceptance Criteria**:

  **Automated Verification:**
  ```bash
  # Task 3의 전체 검증을 재실행
  # 기대: 8/8 PASS
  echo "=== Re-verification after fix ==="
  # (Task 3의 동일한 검증 스크립트 재실행)
  ```

  **Evidence to Capture:**
  - [ ] 수정 전 FAIL 항목 목록
  - [ ] 수정 내용 설명
  - [ ] 재검증 결과: 8/8 PASS

  **Commit**: NO

---

## Commit Strategy

이 작업은 `/tmp/` 경로에 보고서를 생성하므로 **git 커밋 불필요**. 프로젝트 소스 파일에 대한 변경 없음.

---

## Success Criteria

### Verification Commands
```bash
# 최종 확인 — 한 줄 요약
test -s /tmp/strategy-performance-report.md && echo "✅ Report generated" || echo "❌ Missing"

# 섹션 카운트
grep -cE '^#{1,2} ' /tmp/strategy-performance-report.md  # Expected: ≥ 8

# 테이블 행 확인 (수익률 테이블)
sed -n '/수익률 순위/,/^## /p' /tmp/strategy-performance-report.md | grep -c '^|[^-]'  # Expected: 33 (header + 32 data)

# GENERATION_FAILED 주석 존재
grep -c 'GENERATION_FAILED' /tmp/strategy-performance-report.md  # Expected: ≥ 1
```

### Final Checklist
- [ ] All "Must Have" present (Korean text, 32 strategies, N/A handling, sort order, excluded GENERATION_FAILED from numerics)
- [ ] All "Must NOT Have" absent (no fabricated data, no English headers, no 0 instead of N/A)
- [ ] All 8 verification checks pass (V1–V8)
