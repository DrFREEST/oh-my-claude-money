# Changelog / 변경 이력

모든 주요 변경 사항은 이 파일에 기록됩니다.
All notable changes to this project will be documented in this file.

버전 형식: `a.b.c`
- `a` (Major): 대규모 변경 (하위 호환성 최대한 유지, 불가피한 경우 마이그레이션 가이드 제공)
- `b` (Minor): 기능 추가/개선 (c는 0으로 초기화)
- `c` (Patch): 버그 수정

**하위 호환성 정책 / Backward Compatibility Policy:**
- 메이저 버전 업데이트 시에도 기존 설정 및 API와의 호환성을 최대한 유지합니다
- 호환성 파괴가 불가피한 경우, 마이그레이션 스크립트 또는 가이드를 제공합니다
- Deprecated 기능은 최소 1개 Minor 버전 동안 유지 후 제거됩니다
- Major version updates will maintain maximum backward compatibility
- When breaking changes are unavoidable, migration scripts or guides will be provided
- Deprecated features will be maintained for at least 1 minor version before removal

---

## [2.1.0] - 2026-02-10

### 변경 (Changed)
- **오케스트레이터 3종 CLI 마이그레이션: 서버 풀 → CLI 직접 실행**
  - `hybrid-ultrawork.mjs`: `OpenCodeServerPool` → `executeViaCLI()` 전환
  - `fusion-orchestrator.mjs`: `pool.submit()` → `executeViaCLI()` 전환
  - `parallel-executor.mjs`: `getDefaultPool()/shutdownDefaultPool()` → `executeViaCLI()` 전환
  - 서버 풀 생명주기 관리(initialize/shutdown) 제거 — CLI는 stateless
  - `_resolveProvider()` 메서드 추가: 에이전트명 기반 provider 자동 결정

### 삭제 (Removed)
- `src/executor/opencode-server-pool.mjs` (~720줄) — OpenCodeServerPool 클래스
- `src/executor/opencode-server-pool.mjs.deprecated` — deprecated 버전
- `src/pool/server-pool.mjs` (~850줄) — 서버 풀 매니저
- `scripts/start-server-pool.sh` — 서버 풀 시작 스크립트
- `session-start.mjs`에서 서버 풀 자동 시작 로직 제거 (`isServerPoolRunning`, `startServerPool`)

### 수정 (Fixed)
- Optional chaining(`?.`) 사용 → `&&` 패턴으로 교체 (프로젝트 규칙 준수)

---

## [2.0.0] - 2026-02-10

### 변경 (Changed)
- **퓨전 라우터: OpenCode 서버 풀 → Codex/Gemini CLI 직접 spawn 전환**
  - `executeOnPool()` (HTTP API) → `executeViaCLI()` (child_process.spawn) 교체
  - OpenCode 서버 풀(`opencode serve`) 상시 실행 불필요
  - Codex CLI: `codex exec -m MODEL --json --full-auto` → JSONL stdout 파싱
  - Gemini CLI: `gemini -p=. --yolo` → raw text 수집
  - CLI 내장 모델 폴백 체인 활용 (수동 gpt-5.3→5.2 매핑 불필요)

### 추가 (Added)
- **`src/executor/cli-executor.mjs`** — Codex/Gemini CLI 직접 실행 엔진
  - `executeViaCLI()`: provider 기반 CLI 자동 분기 (openai→Codex, google→Gemini)
  - `detectCLI()`: CLI 설치 여부 확인 (`which` 기반)
  - `parseCodexText()`: Codex JSONL에서 agent_message 텍스트 추출
  - `parseCodexTokens()`: `turn.completed` 이벤트에서 실제 토큰 사용량 추출
  - Gemini CLI 미설치 시 자동 Codex 폴백
- **`resolveProvider()`** — 내부 모델 ID에서 CLI provider 결정 (gemini/flash→google, 나머지→openai)

### 제거 (Removed)
- `toOpenCodeProvider()` — OpenCode antigravity-* 프록시 모델 매핑 (불필요)
- `executeViaOpenCode()` — 서버 풀 HTTP API 호출 (CLI로 대체)
- `wrapWithUlwCommand()` import — CLI에서 불필요
- `discoverExistingServers()` 호출 — 서버 풀 자동 감지 (불필요)
- `server-pool.mjs` import — fusion-router에서 제거

### 토큰 추적 (Token Tracking)
- call-logger `source` 필드: `'fusion-router'` → `'fusion-cli'`
- Codex: JSONL `turn.completed.usage`에서 실제 `input_tokens`/`output_tokens`/`cached_input_tokens` 추출
- Gemini: 프롬프트/출력 길이 기반 추정 (`length / 4`)

### 호환성 (Compatibility)
- **OMC**: v4.1.7
- **Codex CLI**: v0.98.0+
- **Gemini CLI**: 선택적 (미설치 시 Codex 폴백)
- 서버 풀 코드는 오케스트레이터(`hybrid-ultrawork`, `fusion-orchestrator`)용으로 유지 (향후 v2.1에서 마이그레이션 예정)

### 마이그레이션 (Migration)
- `opencode serve` 프로세스 상시 실행 불필요 (자동으로 CLI 사용)
- 기존 설정 파일(`config.json`) 변경 없음
- 오케스트레이터 스킬(`hulw`, `autopilot`)은 서버 풀 계속 사용 (호환 유지)

---

## [1.4.5] - 2026-02-10

### 수정 (Fixed)
- **퓨전 라우터 stdin 소비 버그 수정** — ESM static import 체인이 stdin을 소비하여 모든 Task 라우팅이 실패하던 치명적 버그 해결
  - `fusion-router.mjs`를 thin shim으로 분리: built-in 모듈(`fs`, `url`, `path`)만 static import
  - 메인 로직을 `fusion-router-main.mjs`로 이동하여 dynamic `import()`로 로드
  - stdin을 `readFileSync(0)`으로 동기 읽기 후 `__OMCM_FUSION_STDIN` 환경변수로 전달
  - HUD wrapper(`omcm-hud-wrapper.mjs`)와 동일한 검증된 패턴 적용

---

## [1.4.4] - 2026-02-10

### 변경 (Changed)
- **OMC v4.1.7 호환** — v4.1.5~v4.1.7 전체 대응
  - Team-first 오케스트레이션: `ultrapilot`/`swarm` → `team` 모드 통합 인식
  - `team-state.json` 상태 관리 추가 (`state-manager.mjs`, `mode-detector.mjs`)
  - 에이전트 매핑 코멘트 v4.1.7 기준으로 업데이트
  - 취소 스킬에 `team` 모드 추가 (레거시 `ultrapilot`/`swarm` 호환 유지)
- **퓨전 라우터 CONFIG_FILE 경로 수정** — `CLAUDE_PLUGIN_ROOT` → `marketplaces` → `plugins` 순 폴백 체인으로 변경 (plugins/omcm 삭제 후에도 설정 읽기 가능)
- **HUD 레이아웃 3줄 변경** — 첫 줄을 CC 시스템 메시지 전용 빈 공간으로 배정하여 스크롤 깜빡임 감소
- 17개 파일의 OMC 버전 참조 v4.1.4 → v4.1.7 일괄 업데이트

### 호환성 (Compatibility)
- **OMC**: v4.1.7
- **OMO**: v3.4.0

---

## [1.4.3] - 2026-02-09

### 수정 (Fixed)
- **SessionStart 훅 중복 실행 버그 수정** — `~/.claude/plugins/omcm/` (구버전)과 `~/.claude/marketplaces/omcm/` (최신) 이중 등록으로 인한 훅 2회 실행 문제 해결
- **SessionStart 훅 타임아웃 에러 수정** — timeout 3초 → 8초 증가, 안전 타임아웃 메커니즘 추가 (7초 안전망)
- **session-start.mjs 최적화** — 비필수 작업(syncOmcVersion, runAutoUpdate)을 메인 출력 이후로 지연 실행
- 미사용 변수(`getUsageFromCache`, `usage`) 제거

### 호환성 (Compatibility)
- **OMC**: v4.1.4
- **OMO**: v3.4.0

---

## [1.4.2] - 2026-02-09

### 변경 (Changed)
- OMC 호환 버전 v4.1.3 → v4.1.4 업데이트 (MCP 서버 크래시 수정 패치, OMCM 기능 변경 없음)

### 호환성 (Compatibility)
- **OMC**: v4.1.4
- **OMO**: v3.4.0

---

## [1.4.1] - 2026-02-09

### 추가 (Added)
- **OMC v4.1.3 delegationRouting 감지** — `shouldRouteToOpenCode()`에 OMC delegation routing 활성화 여부 확인 로직 추가
  - delegationRouting 활성 시 OMCM 퓨전 자동 비활성화 (충돌 방지)
  - `fusionMode: 'always'` 설정 시 OMCM 우선 라우팅 유지
  - 4개 테스트 케이스 통과 확인

### 변경 (Changed)
- 전체 코드베이스 OMC 버전 참조 v4.1.2 → v4.1.3 업데이트 (코멘트, 메타데이터, 스킬 문서)
- plugin.json 호환 표기 `OMC v4.1.3 + OMO v3.4.0`

### 호환성 (Compatibility)
- **OMC**: v4.1.3
- **OMO**: v3.4.0
- **하위 호환**: delegationRouting 미활성 시 기존 동작 유지

---

## [1.4.0] - 2026-02-09

### 추가 (Added)
- **OMO v3.4.0 에이전트 정규화** — 소문자 에이전트명 전면 적용
  - Oracle→oracle, Codex→build, Flash→explore 매핑 업데이트
  - hephaestus 신규 에이전트 매핑 (build-fixer→hephaestus)
  - metis (frontend-ui-ux-engineer 대체), momus (document-writer 대체) 반영
- **Gemini 모델 ID 정규화** — `-preview` 접미사 제거
  - `gemini-3-pro-preview` → `gemini-3-pro`, `gemini-3-flash-preview` → `gemini-3-flash`
  - model-advisor 비용 테이블 및 다운그레이드 체인 업데이트
  - fusion-router 하위 호환 엔트리 유지 (OMO < 3.4.0 지원)
- **OMC v4.1.2 team 모드 HUD 지원** — mode-detector에 team 모드 추가
- **GPT 모델 버전 업데이트** — GPT 5.2 → 5.3 전체 반영

### 변경 (Changed)
- fallback-orchestrator opencodeAgent 값 소문자 정규화 (Codex→build, Flash→explore, Oracle→oracle)
- agent-fusion-map 전체 모델 ID 및 에이전트 참조 업데이트
- 스킬 8개 파일 버전 참조 OMC 4.1.2 / OMO 3.4.0으로 통일
- 상태 경로 `.omcm/state/` → `.omc/state/` 전체 정리 (ecomode, ralph, opencode 등)
- plugin.json 호환 표기 업데이트

### 호환성 (Compatibility)
- **OMC**: v4.1.2
- **OMO**: v3.4.0
- **하위 호환**: OMO < 3.4.0 gemini-3-*-preview 키 유지

---

## [1.3.0] - 2026-02-06

### 추가 (Added)
- **OMC v4.1.2 에이전트 매핑** (`scripts/agent-mapping.json` v4.0.0)
  - 28개 에이전트 + 2개 backward-compat alias (researcher→dependency-expert, tdd-guide→test-engineer)
  - 13개 신규 에이전트 매핑: debugger, verifier, style-reviewer, quality-reviewer, api-reviewer, performance-reviewer, dependency-expert, test-engineer, quality-strategist, product-manager, ux-researcher, information-architect, product-analyst
  - Lane 기반 분류: Build/Analysis(7), Review(6), Testing(2), Domain(6), Product(5)
  - 16개 제거된 티어 에이전트 정리 (architect-low/medium, executor-low/high, designer-low/high 등)
- **세션 격리 지원** (`src/hooks/persistent-mode.mjs`)
  - OMC 4.1.2 세션별 상태 경로 탐색 (`.omc/state/sessions/{sessionId}/`)
  - 프로젝트 상대 경로 + homedir 레거시 폴백
- **team 모드 지원** (`persistent-mode.mjs`, `detect-handoff.mjs`)
  - OMC 4.1.2의 team 모드 (swarm 대체) 상태 감지 및 cancel 지원

### 변경 (Changed)
- **상태 경로 수정** (`persistent-mode.mjs`, `detect-handoff.mjs`)
  - `~/.omc/state/` → 프로젝트 상대 `.omc/state/` (OMC 4.1.2 호환)
  - cancel 시 프로젝트 경로 + homedir 레거시 경로 모두 정리
- **위임 패턴 업데이트** (`detect-handoff.mjs`)
  - 리서치 위임: researcher → dependency-expert (OMC 4.1.2 에이전트명 변경 반영)

---

## [1.2.1] - 2026-02-06

### 추가 (Added)
- **버전 자동매칭 스크립트** (`scripts/omc-version-sync.sh`)
  - OMC 업데이트 시 캐시 버전 자동 복사 + gap 방지
  - `agent-mapping.json`, `plugin.json` 버전 자동 갱신
  - 마켓플레이스/플러그인 동기화까지 원커맨드 실행
- **세션 시작 자동 최신화** (`scripts/auto-update-all.sh`, `src/hooks/session-start.mjs`)
  - 새 세션 시작 시 omc, omcm, omo, 플러그인 마켓플레이스 자동 업데이트
  - 24시간 쿨다운 (하루 1회), detached 백그라운드 실행
  - `known_marketplaces.json` autoUpdate: true인 리포만 대상
  - 로그: `~/.omcm/update.log`

### 수정 (Fixed)
- **Stop 훅 JSON validation 오류** (`src/hooks/persistent-mode.mjs`)
  - `hookSpecificOutput`(hookEventName: "Stop") → `reason` 필드로 변경
  - Stop 훅 스키마에 `hookSpecificOutput` 미지원으로 validation 실패하던 버그 수정

### 변경 (Changed)
- **OMC 4.0.9 호환** (`scripts/agent-mapping.json`, `.claude-plugin/plugin.json`)
  - `metadata.omc_version`: 4.0.8 → 4.0.9
  - OMC 4.0.9 Codex/Gemini headless 실행 개선 대응
  - JSON 포맷팅 정리 (fallbackChain 배열 멀티라인)
- **OMC 4.0.10 버전 참조 업데이트** (`src/utils/prompt-file.mjs`, `hooks/mcp-tracker.mjs`)
  - output_file에 항상 parsed JSONL 응답 기록 변경사항 반영 (OMCM 코드 변경 불필요)

---

## [1.2.0] - 2026-02-06

### 추가 (Added)
- **MCP-Direct 토큰 추적** (`hooks/mcp-tracker.mjs`)
  - ask_codex/ask_gemini PostToolUse에서 Response File 토큰 데이터 자동 추출
  - `~/.omcm/mcp-tracking.json`에 프로바이더별 토큰/비용 집계
  - `~/.omcm/mcp-calls.jsonl` 상세 호출 로그 (토큰 포함)
  - wait_for_job/check_job_status 완료 시 status file 토큰 추출
- **HUD MCP 토큰 통합 표시** (`src/hud/omcm-hud.mjs`, `src/hud/fusion-renderer.mjs`)
  - `readMcpTracking()` 5초 캐시 읽기
  - MCP 비용 요약 렌더러 토큰 포함 표시 (`cx(3)12k↑3k↓$0.24`)
  - Independent/Wrapping 양쪽 모드에서 MCP 메트릭 표시
- **Flow Tracer 통합** (`hooks/fusion-router.mjs`, `hooks/mcp-tracker.mjs`)
  - OMC flow-tracer 동적 import (best-effort)
  - `recordHookFire()` / `recordHookResult()` 연동
  - `/trace` 명령에서 fusion-router 라우팅 결정 표시

### 변경 (Changed)
- **OMC 4.0.8 호환** (`src/utils/prompt-file.mjs`)
  - `output_file` 필수 파라미터 지원 (Breaking Change 대응)
  - `writePromptFile()` 반환값에 `outputFile` 추가
- **모델 폴백 체인** (`scripts/agent-mapping.json`)
  - `codex_fallback_chain`: gpt-5.3-codex → gpt-5.3 → gpt-5.2-codex → gpt-5.2
  - `gemini_fallback_chain`: gemini-3-pro-preview → gemini-3-flash-preview → gemini-2.5-pro → gemini-2.5-flash
  - `metadata.omc_version`: 4.0.8

---

## [1.1.0] - 2026-02-06

### 추가 (Added)
- **HUD MCP 비용 통합 표시** (`src/hud/index.mjs`)
  - MCP 호출 비용을 HUD 두 번째 줄에 표시
- **자동 전환 고도화** (SWITCH_TRIGGERS)
  - 사용량 임계치 기반 OpenCode 자동 전환 로직
- **OMC 상태 관리 통합**
  - OMC 상태 파일 브릿지로 양방향 상태 동기화

---

## [1.0.0] - 2026-01-28 🎉 첫 정식 릴리즈

### 추가 (Added)
- 실시간 사용량 추적 시스템
- 다중 프로바이더 밸런싱
- 컨텍스트 전달 시스템
- 병렬 실행기
- ACP 클라이언트
- Serve 모드 통합
- 서버 풀 관리
- 퓨전 라우터

### 스킬 (Skills)
- hulw (하이브리드 울트라워크)
- ulw (울트라워크)
- autopilot
- opencode
- cancel

### 마이그레이션 가이드
- v0.8.0에서 v1.0.0으로 업그레이드 시 추가 작업 불필요
- 신규 기능은 선택적 사용 (기존 API 100% 호환)
- 추천: 컨텍스트 전달 시스템으로 핸드오프 품질 향상

---

## [0.8.0] - 2026-01-27

### 추가 (Added)
- **동적 에이전트 매핑 로더** (`src/router/mapping.mjs`)
  - JSON 설정 파일 기반 에이전트 매핑 동적 로드
  - 설정 파일 경로: `~/.claude/plugins/omcm/agent-mapping.json`
  - mtime 기반 캐시로 성능 최적화
  - 하드코딩된 agent-fusion-map.mjs 보완
- **조건부 라우팅 규칙 엔진** (`src/router/rules.mjs`)
  - 사용량, 작업 복잡도, 모드 기반 조건부 라우팅
  - 설정 파일: `~/.claude/plugins/omcm/routing-rules.json`
  - 5개 기본 규칙 제공 (high-usage, weekly-limit, ecomode, complex-task, security)
  - 우선순위 기반 규칙 평가
- **LRU 라우팅 캐시** (`src/router/cache.mjs`)
  - 동일 에이전트 반복 라우팅 시 재계산 방지
  - 100개 항목, 5분 TTL 기본값
  - 캐시 히트율 통계 제공
- **설정 파일 스키마 검증** (`src/config/schema.mjs`)
  - agent-mapping.json, routing-rules.json 유효성 검증
  - 상세한 에러 메시지 제공
- **예제 설정 파일**
  - `examples/agent-mapping.json` - 동적 매핑 예제
  - `examples/routing-rules.json` - 라우팅 규칙 예제

### 개선 (Improved)
- **fusion-router-logic.mjs 통합**
  - `shouldRouteToOpenCodeV2()` 함수 추가 (v0.8.0 모듈 통합)
  - `getRoutingStats()` 함수 추가 (통합 통계)
- **라우터 아키텍처 개선**
  - 캐시 → 규칙 → 동적 매핑 → 기본 로직 순서로 평가
  - 레이어드 아키텍처로 확장성 향상

### 마이그레이션 가이드
- v0.7.0에서 v0.8.0으로 업그레이드 시 추가 작업 불필요
- 동적 매핑/규칙은 선택적 기능 (설정 파일 없으면 기본 로직 사용)
- 커스텀 매핑 원하면 `examples/` 폴더의 예제 참조

---

## [0.7.0] - 2026-01-27

### 추가 (Added)
- **에이전트 매핑 확장**: 3개 에이전트 추가 (OMC 33개 중 32개 커버)
  - `qa-tester-low`: Gemini Flash - 빠른 QA 테스트
  - `researcher-high`: Claude Opus - 심층 연구 및 복잡한 문서 분석
  - `build-fixer-high`: Claude Opus - 복잡한 빌드/컴파일 오류 해결
- **cancel 스킬**: 모든 활성 OMCM 모드 통합 취소
  - 지원 모드: autopilot, ralph, ultrawork, ecomode, hulw, swarm, pipeline, ultrapilot, ultraqa
  - 트리거: cancel, stop, abort, 취소, 중지
- **ecomode 스킬**: 토큰 효율 병렬 실행 모드
  - Haiku/Flash 우선 라우팅으로 30-50% 토큰 절약
  - 트리거: eco, ecomode, efficient, budget, save-tokens, 절약, 효율
- **ralph 스킬**: 완료까지 지속 실행 모드
  - 5가지 검증 기준 (BUILD, TEST, LINT, FUNCTIONALITY, TODO) 충족까지 자기참조 루프
  - 트리거: ralph, don't stop, must complete, 끝까지, 완료할때까지, 멈추지마
- **persistent-mode 훅**: Stop 이벤트 핸들러
  - ralph 등 활성 모드에서 세션 종료 시 미완료 작업 경고
  - hooks.json에 Stop 이벤트 등록
- **키워드 감지 확장**: detect-handoff.mjs에 모드 키워드 추가
  - ecomode, ralph, cancel 키워드 자동 감지 및 모드 활성화

### 개선 (Improved)
- **훅 시스템 확장**: PreToolUse, UserPromptSubmit, SessionStart → Stop 이벤트 추가 (4개 이벤트)
- **상태 관리 개선**: `~/.omcm/state/` 디렉토리에 모드별 상태 파일 저장
- **OMC 3.6.0 대비 커버리지 향상**:
  - 에이전트: 87.9% → 97.0% (29/33 → 32/33)
  - 스킬: 13.9% → 22.2% (5/36 → 8/36)
  - 훅 이벤트: 50% → 66.7% (3/6 → 4/6)

---

## [0.6.0] - 2026-01-27

### 추가 (Added)
- **fusion-setup 자동화 스크립트**: `scripts/fusion-setup.sh`
  - config.json 자동 생성 (fusionDefault: true)
  - CLAUDE.md 퓨전 지시사항 자동 추가
  - OpenCode 프로바이더 인증 상태 확인
  - OpenCode 서버 상태 확인
- **프로젝트 규칙 문서화**: CLAUDE.md에 버전 관리 및 동기화 규칙 추가
  - Semantic Versioning (a.b.c) 방법론
  - 릴리즈 체크리스트
  - 동기화 명령어

### 변경 (Changed)
- **Google 프로바이더 모델 변경**: Antigravity 모델로 업그레이드
  - `gemini-flash` → `google/antigravity-gemini-3-flash`
  - `gemini-pro` → `google/antigravity-gemini-3-pro-high`
- **fusion-router.mjs**: OpenCode 실행 시 `-m` 옵션으로 모델 명시

### 개선 (Improved)
- **퓨전 설정 글로벌 적용**: 한 번 설정하면 모든 프로젝트/세션에서 자동 적용
- **HUD O/G 카운트 정상화**: OpenCode 세션에서 프로바이더별 토큰 집계 수정

---

## [0.5.0] - 2026-01-27

### 추가 (Added)
- **에이전트 퓨전 매핑 v2.0**: OMC 29개 에이전트 → OMO 에이전트 티어별 매핑
  - HIGH (11개): Claude Opus 유지 (architect, planner, critic 등)
  - MEDIUM (10개): **gpt-5.2-codex** (thinking) - executor, researcher, designer 등
  - LOW (8개): **gemini-3.0-flash** (thinking) - explore, writer, *-low 에이전트들
- **Claude 토큰 절약률 62%**: 기존 39%에서 대폭 향상
- **Thinking 모드 기본 활성화**: 모든 외부 모델에서 thinking 모드 사용

### 변경 (Changed)
- **agent-mapping.json**: v2.0으로 전면 재작성
  - 티어별 모델 정의 (opus/sonnet/haiku)
  - 29개 에이전트별 OMO 에이전트 + 모델 매핑
- **agent-fusion-map.mjs**: 새 MODELS/FUSION_MAP 구조로 리팩토링
  - `buildOpenCodeCommand()` 함수 추가 (OpenCode 명령어 생성)
  - `shouldUseFusionMapping()` 함수 추가 (퓨전 모드 활성화 체크)

### 개선 (Improved)
- **기본 모드 분리**: 퓨전/폴백 모드에서만 외부 모델 사용, 기본 모드는 Claude만 사용
- **통계 함수 개선**: `getFusionStats()`, `getAgentsByTier()` 함수 추가

---

## [0.4.0] - 2026-01-27

### 추가 (Added)
- **HUD 토큰 표시**: 프로바이더별 input/output 토큰 실시간 표시
  - Claude: stdin JSON에서 파싱 (`context_window.current_usage`)
  - OpenAI/Gemini: OpenCode 세션 파일 집계 (`~/.local/share/opencode/storage/message/`)
  - 표시 형식: `C:1.2k↓ 567↑|O:25.8k↓ 9↑|G:165.3k↓ 1.4k↑`
- **MCP 서버 연동**: `nosolosoft/opencode-mcp` 통합
  - 6개 도구: `opencode_run`, `opencode_get_status` 등
  - Claude Code에서 OpenCode CLI 직접 호출 가능
- **fusion-router 테스트**: 63개 테스트 케이스 추가
  - shouldRouteToOpenCode(), mapAgentToOpenCode(), wrapWithUlwCommand() 등

### 개선 (Improved)
- **mtime 캐싱**: provider-limits.mjs에 이미 구현됨 확인 (성능 최적화)
- **HUD 가독성**: 토큰 표시 간격 개선 (`↓ ↑` 공백 추가)
- **토큰 계산 정확도**: OpenCode cache.read 토큰 포함

### 수정 (Fixed)
- **HUD 중복 제거**: renderFusionMetrics의 O:x|G:y 중복 출력 제거

---

## [0.3.8] - 2026-01-26

### 수정 (Fixed)
- **[P0] OpenCode CLI 호출 방식 수정**: 라우팅된 작업이 실제로 OpenCode에서 실행되지 않던 문제 해결
  - 이전: `opencode -a Codex` (잘못된 플래그)
  - 변경: `opencode run --agent Codex prompt` (올바른 서브커맨드 및 플래그)
- **프롬프트 전달 방식 개선**: stdin 대신 positional argument로 전달
- **Hook 파일 동기화**: 개발 버전과 설치된 버전 불일치 문제 해결
- **[P0] Gemini Flash 라우팅 수정**: Claude 90%+ 시에도 에이전트 매핑 존중
  - 이전: Claude 리밋 도달 시 모든 에이전트가 무조건 Codex로 라우팅
  - 변경: explore → Flash, architect → Oracle 등 에이전트별 매핑 유지
- **HUD 표시 개선**: API 사용량(%) 대신 라우팅 카운트 표시
  - 이전: `CL:100% OAI:0% GEM:~0%` (업데이트 안됨)
  - 변경: `CL:7 OAI:8 GEM:1` (실제 라우팅 카운트)

### 추가 (Added)
- **SQLite 마이그레이션 스키마**: `migrations/001-add-aggregation-tables.sql` (v1.1.0 준비)
- **README 영문 섹션**: 국제 사용자를 위한 영문 문서 추가
- **데이터 관리 설계서**: `docs/SQLITE-DATA-MANAGEMENT.md`

---

## [0.3.7] - 2026-01-26

### 수정 (Fixed)
- **[P0] fusionDefault 라우팅 버그 수정**: `fusionDefault: true` 설정 시 실제 라우팅이 발생하지 않던 문제 해결
  - 이전: `shouldRouteToOpenCode()`가 `~/.claude/plugins/omcm/config.json`의 `fusionDefault` 설정을 읽지 않음
  - 변경: `fusionDefault: true`일 때 자동으로 에이전트 기반 라우팅 수행
  - 영향: HUD의 퓨전 메트릭(⚡50% 3.0k↗ O:3)이 정상 업데이트됨
- **라우팅 대상 에이전트 확장**: 더 많은 에이전트 타입이 OpenCode로 라우팅됨
  - 추가: `architect-low`, `architect-medium`, `explore-medium`, `explore-high`, `designer-high`, `scientist-high`, `writer`, `vision`, `code-reviewer`, `code-reviewer-low`, `security-reviewer`, `security-reviewer-low`

### 변경 (Changed)
- **fusion-default-on.md**: `~/.omcm/fusion-state.json`도 함께 업데이트하도록 개선

---

## [0.3.6] - 2026-01-26

### 수정 (Fixed)
- **HUD 2중 출력 버그 수정**: wrapper에서 setTimeout/stdin 중복 실행 제거
- **사용량 동기화 버그 수정**: ANSI 색상 코드 제거 후 파싱하도록 개선
  - 이전: `5h:[33m6%[0m` 형태로 인해 regex 매칭 실패
  - 변경: `stripAnsi()` 함수로 색상 코드 제거 후 파싱
- **wrapper 단순화**: spawn 대신 동적 import 사용으로 안정성 향상
- **README 파일 구조 현행화**: 실제 프로젝트 구조와 동기화
- **README 설정 옵션 현행화**: keywords, routing 배열 실제 값과 동기화
- **설정 경로 통일**: fusion-default-on/off 명령어의 경로를 `~/.claude/plugins/omcm/`으로 통일

### 추가 (Added)
- **fusionDefault 설정**: config.mjs에 `fusionDefault: false` 기본값 추가
  - fusion-default-on/off 명령어와 연동
- **버전 동기화**: package.json, plugin.json, marketplace.json 버전 통일

---

## [0.3.5] - 2026-01-26

### 수정 (Fixed)
- **commands 디렉토리 누락 파일 추가**: `/omcm:hulw`, `/omcm:ulw`, `/omcm:autopilot`, `/omcm:opencode` 커맨드 파일 추가
  - 이전: skills 디렉토리에만 존재하여 슬래시 명령어로 인식 안됨
  - 변경: commands 디렉토리에도 추가하여 `/omcm:*` 형태로 호출 가능
- **HUD wrapper 경로 수정**: 플러그인 캐시 경로를 동적으로 찾도록 개선
  - 이전: 하드코딩된 `/opt/oh-my-claude-money` 경로 사용
  - 변경: `~/.claude/plugins/cache/omcm/omcm/{version}` 경로 자동 탐색
- **설정 파일 경로 통일**: 모든 파일에서 `~/.claude/plugins/omcm/config.json` 경로 사용

### 추가 (Added)
- **HUD wrapper 파일**: `src/hud/omcm-hud-wrapper.mjs` 추가 (설치 시 복사용)

### 참고 (Notes)
- 플러그인 재설치 필요: `claude plugins uninstall omcm && claude plugins install omcm`
- HUD wrapper 수동 복사: `cp ~/.claude/plugins/cache/omcm/omcm/0.3.5/src/hud/omcm-hud-wrapper.mjs ~/.claude/hud/omcm-hud.mjs`

---

## [0.3.4] - 2026-01-26

### 수정 (Fixed)
- **스킬 디렉토리 구조 수정**: Claude Code 플러그인 표준 형식으로 변환
  - 기존: `skills/autopilot.md` (단일 파일)
  - 변경: `skills/autopilot/SKILL.md` (폴더 구조)
  - 이로 인해 `/omcm:*` 커맨드가 정상 인식됨
- **커맨드 frontmatter 수정**: `name` 필드 제거 (파일명에서 자동 추론)

### 참고 (Notes)
- 플러그인 재설치 필요: `claude plugins uninstall omcm && claude plugins install omcm`

---

## [0.3.3] - 2026-01-26

### 수정 (Fixed)
- **README 명령어 통일**: 모든 `/oh-my-claude-money:*` → `/omcm:*`로 변경
- **HUD 싱크 버그 수정**: `updateClaudeLimits` null 체크 추가로 OMC HUD 값과 동기화 정확도 개선
- **설정 파일 경로**: `~/.claude/plugins/omcm/config.json`으로 통일
- **수동 설치 경로**: `~/.local/share/omcm`으로 통일

### 추가 (Added)
- **참고 소스 추가**: Claude Code Hooks 가이드, CodeSyncer 링크

---

## [0.3.2] - 2026-01-26

### 변경 (Changed)
- **플러그인 이름 단축**: `oh-my-claude-money` → `omcm`
  - 기존: `/oh-my-claude-money:autopilot`
  - 변경: `/omcm:autopilot`
  - 모든 스킬 커맨드가 더 짧고 편리하게 사용 가능

---

## [0.3.1] - 2026-01-26

### 수정 (Fixed)
- **HUD 사용량 동기화**: OMC HUD 출력에서 Claude 사용량(5h/wk)을 파싱하여 provider-limits.json 자동 동기화
  - 기존: 정적 파일만 참조하여 실제 사용량과 1~2% 오차 발생
  - 수정: HUD 렌더링 시마다 OMC 출력에서 실시간 값 추출하여 동기화
- **핸드오프 UX 개선**: `exec` 명령으로 프로세스 교체 방식 적용
  - 기존: 새 프로세스로 OpenCode 실행 (두 CLI 동시 존재)
  - 수정: 같은 터미널에서 Claude Code → OpenCode 자연스럽게 전환

---

## [0.3.0] - 2026-01-26

### 추가 (Added)
- **독립 HUD 래퍼**: OMC HUD를 수정하지 않고 퓨전 메트릭 표시
- **프로바이더 리밋 추적**: Claude(OAuth), OpenAI(헤더), Gemini(로컬 카운팅) 실시간 추적
- **자동 폴백 오케스트레이터**: Claude 90% 도달 시 GPT-5.2-Codex로 자동 전환
- **Handoff 컨텍스트**: 프로바이더 전환 시 `~/.omcm/handoff/context.md` 자동 생성
- **PreToolUse Hook**: Claude Code Task 호출 자동 라우팅
- **OpenCode 자동 실행**: 폴백 활성화 시 실제 OpenCode로 작업 실행
- **독립 디렉토리 구조**: `~/.omcm/` 폴더로 OMC와 완전 분리

### 변경 (Changed)
- 상태 파일 위치: `~/.omc/` → `~/.omcm/`로 이전
- 폴백 임계값: 100% → 90%로 변경
- 복구 임계값: 95% → 85%로 변경

### 수정 (Fixed)
- 퓨전 모드가 실제로 OpenCode로 Task를 라우팅하지 않던 문제
- 프로바이더 전환 시 handoff/context.md가 생성되지 않던 문제

---

## [0.3.0] - 2026-01-26 (English)

### Added
- **Independent HUD Wrapper**: Display fusion metrics without modifying OMC HUD
- **Provider Rate Limit Tracking**: Real-time tracking for Claude (OAuth), OpenAI (headers), Gemini (local counting)
- **Automatic Fallback Orchestrator**: Auto-switch to GPT-5.2-Codex when Claude reaches 90%
- **Handoff Context**: Auto-generate `~/.omcm/handoff/context.md` on provider switch
- **PreToolUse Hook**: Automatic routing of Claude Code Task calls
- **OpenCode Auto-Execution**: Execute tasks via OpenCode when fallback is active
- **Independent Directory Structure**: Fully separated from OMC using `~/.omcm/`

### Changed
- State file location: `~/.omc/` → `~/.omcm/`
- Fallback threshold: 100% → 90%
- Recovery threshold: 95% → 85%

### Fixed
- Fusion mode now actually routes tasks to OpenCode
- Handoff context.md creation on provider switch

---

## [0.2.0] - 2026-01-24

### 추가 (Added)
- 초기 퓨전 오케스트레이터 구현
- OpenCode 워커 풀
- 에이전트 퓨전 맵 (OMC → OpenCode 매핑)
- 기본 설치 스크립트

### Added (English)
- Initial fusion orchestrator implementation
- OpenCode worker pool
- Agent fusion map (OMC → OpenCode mapping)
- Basic installation script

---

## [0.1.0] - 2026-01-23

### 추가 (Added)
- 프로젝트 초기 설정
- 플러그인 기본 구조
- README 및 문서

### Added (English)
- Initial project setup
- Plugin basic structure
- README and documentation
