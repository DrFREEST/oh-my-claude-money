# Rewrite `run_opencode()` to Use REST API

## TL;DR

> **Quick Summary**: Replace all `opencode run` CLI invocations in `run_opencode()` (lines 237-291 of `scripts/fusion-bridge.sh`) with REST API calls via `curl` + `jq` to the running `opencode serve` server.
> 
> **Deliverables**:
> - Rewritten `run_opencode()` function using REST API (session create → prompt → poll → extract output)
> - Helper functions: `create_session()`, `send_prompt()`, `wait_for_completion()`, `extract_response()`
> - Error handling with `set -e` compatible curl patterns
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential (single function rewrite, tightly coupled steps)
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

---

## Context

### Original Request
Rewrite `run_opencode()` in `scripts/fusion-bridge.sh` to use OpenCode REST API instead of `opencode run` CLI.

### Research Findings

**OpenCode REST API Endpoints** (from `sst/opencode-sdk-go` and harbor wiki):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST /session` | Create new session | `{"directory": "...", "title": "..."}` → returns `Session` with `id` |
| `POST /session/{id}/message` | Send prompt (Prompt) | `{"parts": [{"type": "text", "text": "..."}], "agent": "...", "model": {...}}` |
| `GET /session/{id}` | Get session status | Check session state |
| `GET /session/{id}/message` | List messages | Get all messages in session |
| `GET /event` | SSE event stream | Real-time events (session.idle, session.updated, etc.) |
| `POST /session/{id}/abort` | Abort session | Cancel running prompt |
| `DELETE /session/{id}` | Delete session | Cleanup |

**Key API Details:**
- Base URL: `http://localhost:{port}` (no `/api/` prefix based on SDK paths)
- Session creation: `POST /session?directory={dir}` with JSON body `{"title": "..."}` 
- Prompt sending: `POST /session/{id}/message` with body containing `parts` array and optional `agent`, `model`
- Model param shape: `{"id": "model-id", "provider": "provider-name"}`
- Completion detection: Poll `GET /session/{id}` until session state shows idle, OR use SSE stream at `GET /event`
- Response extraction: `GET /session/{id}/message` → find last assistant message → extract text parts
- OpenAPI docs available at `/doc` on running server

**Current Implementation** (lines 237-291):
- Uses `opencode run --attach "http://localhost:${server_port}" --agent --model` for server pool
- Falls back to `opencode run --agent --model` for direct execution
- Pipes through `tee` to capture output
- Returns 0 on success, 1 on failure

**Functions to KEEP unchanged**:
- `check_server_health()` (line 149) — still needed for health checks
- `find_available_server()` (line 161) — still needed for server pool discovery
- `update_pool_state_request()` (line 212) — still needed for request tracking
- All functions outside `run_opencode()` remain untouched

### Constraints (User Requirements, Verbatim)
1. **No optional chaining** — bash doesn't have `?.`; use explicit null checks with `[[ -z "$var" ]]`
2. **Korean comments** — 모든 주석은 한국어로 작성
3. **jq for JSON parsing** — already a dependency in the codebase
4. **`set -e` with curl error handling** — use `|| true` pattern or capture exit codes for non-fatal curl failures; let fatal errors propagate
5. **Remove ALL `opencode run` CLI invocations** — no CLI calls remain
6. **Preserve function signature** — `run_opencode(opencode_agent, model, prompt)` and return codes (0/1)

---

## Work Objectives

### Core Objective
Replace CLI-based `opencode run` invocations with REST API calls (curl + jq) to the already-running `opencode serve` server, maintaining the same function interface and server pool integration.

### Concrete Deliverables
- Rewritten `run_opencode()` function in `scripts/fusion-bridge.sh`
- Helper functions for REST API interaction
- Updated `check_opencode()` to verify server availability instead of CLI binary

### Definition of Done
- [ ] `run_opencode()` makes zero `opencode run` calls
- [ ] All API interactions use `curl` + `jq`
- [ ] Korean comments throughout
- [ ] Function returns 0 on success, 1 on failure
- [ ] `set -e` does not cause premature exit on expected error paths
- [ ] Server pool integration (find_available_server, update_pool_state_request) still works
- [ ] Output is still captured and displayed to user

### Must Have
- Session lifecycle: create → prompt → wait → extract → (optional) cleanup
- Proper error handling for: connection refused, timeout, malformed JSON, API errors
- Fallback behavior when no server pool server is available (graceful error, NOT CLI fallback)
- Timeout for polling/waiting (configurable, default 300s matching existing opencode.timeout)

### Must NOT Have (Guardrails)
- No `opencode run` CLI calls anywhere in the rewritten function
- No optional chaining or bashisms that aren't POSIX-compatible in the critical path
- No hardcoded port numbers (use existing `$POOL_BASE_PORT` / `find_available_server`)
- No English comments (Korean only)
- No silent failures — all errors must be logged via existing `log_error`/`log_warn`

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (bash script, no test framework)
- **User wants tests**: Manual-only
- **Framework**: none
- **QA approach**: Manual verification via bash execution + curl inspection

### Automated Verification (Agent-Executable)

**For each task, verification is via Bash commands:**

```bash
# 1. 문법 검사: bash -n으로 구문 검증
bash -n scripts/fusion-bridge.sh
# Assert: Exit code 0, no output

# 2. opencode run 제거 확인
grep -c 'opencode run' scripts/fusion-bridge.sh
# Assert: Output is "0"

# 3. curl 호출 존재 확인
grep -c 'curl' scripts/fusion-bridge.sh
# Assert: Output is > 0

# 4. jq 호출 존재 확인  
grep -c 'jq' scripts/fusion-bridge.sh
# Assert: Output is > 0

# 5. 한국어 주석 확인 (ASCII-only 주석이 없음)
grep -P '^\s*#\s*[a-zA-Z]' scripts/fusion-bridge.sh | grep -v '#!/bin/bash' | grep -v 'shellcheck' | head -5
# Assert: No English-only comment lines (ideally 0 matches)

# 6. 함수 시그니처 유지 확인
grep 'run_opencode()' scripts/fusion-bridge.sh
# Assert: Function exists

# 7. set -e 유지 확인
head -15 scripts/fusion-bridge.sh | grep 'set -e'
# Assert: Found
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Sequential - all tasks depend on previous):
Task 1: Add REST API helper functions
  ↓
Task 2: Rewrite run_opencode() core logic
  ↓
Task 3: Update check_opencode() to verify server
  ↓
Task 4: Error handling hardening
  ↓
Task 5: Verification and cleanup
```

All tasks are sequential because each builds on the previous.

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 3 | None |
| 3 | 2 | 4 | None |
| 4 | 3 | 5 | None |
| 5 | 4 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1-5 (sequential) | Single agent, category `unspecified-low` with no special skills needed |

---

## TODOs

- [ ] 1. REST API 헬퍼 함수 추가 (Add REST API helper functions)

  **What to do**:
  - `run_opencode()` 위에 다음 헬퍼 함수들을 추가:
  
  1. **`create_session()`** — 세션 생성
     ```bash
     create_session() {
         local port="$1"
         local directory="$2"
         local title="${3:-fusion-bridge}"
         # POST /session?directory={dir} 
         # Body: {"title": "..."}
         # jq로 .id 추출
         # 실패 시 빈 문자열 반환
     }
     ```
  
  2. **`send_prompt()`** — 프롬프트 전송
     ```bash
     send_prompt() {
         local port="$1"
         local session_id="$2"
         local prompt="$3"
         local agent="${4:-}"
         local model="${5:-}"
         # POST /session/{id}/message
         # Body: {"parts": [{"type": "text", "text": "..."}], "agent": "...", "model": {"id": "..."}}
         # 성공 시 0, 실패 시 1 반환
     }
     ```
  
  3. **`wait_for_completion()`** — 완료 대기 (polling)
     ```bash
     wait_for_completion() {
         local port="$1"
         local session_id="$2"
         local timeout="${3:-300}"
         # GET /session/{id} 반복 폴링
         # session.idle 이벤트 또는 마지막 메시지 완료 확인
         # 타임아웃 시 1 반환
     }
     ```
  
  4. **`extract_response()`** — 응답 텍스트 추출
     ```bash
     extract_response() {
         local port="$1"
         local session_id="$2"
         # GET /session/{id}/message
         # 마지막 assistant 메시지에서 text 파트 추출
         # jq로 파싱
     }
     ```

  5. **`cleanup_session()`** — 세션 정리 (선택적)
     ```bash
     cleanup_session() {
         local port="$1"
         local session_id="$2"
         # DELETE /session/{id}
         # 실패해도 무시 (|| true)
     }
     ```

  **Must NOT do**:
  - `opencode run` 사용 금지
  - 영어 주석 사용 금지
  - 하드코딩된 포트 번호 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard bash function writing, no complex reasoning needed
  - **Skills**: [] (none needed)
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: bash script, not TS
    - `python-programmer`: bash script, not Python

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `scripts/fusion-bridge.sh:149-158` — `check_server_health()` 패턴: curl + grep을 사용하는 헬스체크 패턴 참고
  - `scripts/fusion-bridge.sh:105-132` — `get_mapping()` 패턴: jq 사용한 JSON 파싱 패턴 참고
  - `scripts/fusion-bridge.sh:35-52` — 로깅 함수: `log_info`, `log_error` 등 기존 로깅 패턴 사용

  **API/Type References** (contracts to implement against):
  - OpenCode SDK `session.go` endpoints:
    - `POST /session` — `SessionNewParams{Directory, Title}` → `Session{id}`
    - `POST /session/{id}/message` — `SessionPromptParams{Parts[], Agent, Model}` → response
    - `GET /session/{id}` — returns `Session` with state info
    - `GET /session/{id}/message` — returns `[]Message` (user + assistant)
  - `scripts/agent-mapping.json` — model names and agent names used in prompt params

  **External References**:
  - OpenCode SDK Go: `github.com/sst/opencode-sdk-go/session.go` — 전체 API 엔드포인트 참조
  - OpenAPI docs: `http://localhost:{port}/doc` — 실행 중인 서버에서 확인 가능

  **Acceptance Criteria**:
  ```bash
  # 헬퍼 함수 존재 확인
  grep -c 'create_session()' scripts/fusion-bridge.sh    # Assert: 1
  grep -c 'send_prompt()' scripts/fusion-bridge.sh       # Assert: 1
  grep -c 'wait_for_completion()' scripts/fusion-bridge.sh  # Assert: 1
  grep -c 'extract_response()' scripts/fusion-bridge.sh  # Assert: 1
  grep -c 'cleanup_session()' scripts/fusion-bridge.sh   # Assert: 1
  
  # 구문 검증
  bash -n scripts/fusion-bridge.sh  # Assert: exit code 0
  ```

  **Commit**: YES
  - Message: `refactor(fusion-bridge): REST API 헬퍼 함수 추가`
  - Files: `scripts/fusion-bridge.sh`
  - Pre-commit: `bash -n scripts/fusion-bridge.sh`

---

- [ ] 2. `run_opencode()` 핵심 로직 REST API로 재작성

  **What to do**:
  - 기존 `run_opencode()` 함수 본문(lines 237-291)을 완전히 교체
  - 새로운 흐름:

  ```
  run_opencode(opencode_agent, model, prompt):
    1. find_available_server()로 서버 포트 찾기
    2. 서버가 없으면 에러 반환 (CLI fallback 없음)
    3. update_pool_state_request()로 요청 카운트 증가
    4. create_session(port, PROJECT_DIR, "fusion-bridge-{agent}")
    5. send_prompt(port, session_id, prompt, opencode_agent, model)
    6. wait_for_completion(port, session_id, TIMEOUT)
    7. extract_response(port, session_id) → stdout 출력
    8. cleanup_session(port, session_id)
    9. 성공 시 0, 실패 시 1 반환
  ```

  - `result_file`과 `tee` 대신 `extract_response()`의 출력을 stdout으로 직접 전달
  - 각 단계에서 실패 시 적절한 에러 메시지 + cleanup + return 1

  **Must NOT do**:
  - `opencode run` 사용 절대 금지
  - Fallback으로 CLI 직접 실행 금지 — 서버 없으면 에러 반환
  - 영어 주석 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward bash rewrite with clear requirements
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `scripts/fusion-bridge.sh:237-291` — 현재 `run_opencode()` 구현: 교체 대상, 함수 시그니처와 로깅 패턴 유지
  - `scripts/fusion-bridge.sh:247-272` — 서버풀 연동 패턴: `find_available_server()` + `update_pool_state_request()` 호출 방식 유지
  - `scripts/fusion-bridge.sh:138-141` — 서버풀 설정 변수: `POOL_BASE_PORT`, `POOL_MAX_PORT`, `POOL_STATE_DIR` 참조

  **API/Type References**:
  - Task 1에서 작성한 헬퍼 함수들
  - `scripts/fusion-bridge.sh:341` — main()에서의 호출: `run_opencode "$opencode_agent" "$model" "$PROMPT"` — 시그니처 유지 필수

  **Acceptance Criteria**:
  ```bash
  # opencode run 완전 제거 확인
  grep -c 'opencode run' scripts/fusion-bridge.sh  # Assert: 0
  
  # REST API 호출 존재 확인
  grep -c 'create_session' scripts/fusion-bridge.sh   # Assert: >= 1 (in run_opencode body)
  grep -c 'send_prompt' scripts/fusion-bridge.sh      # Assert: >= 1
  grep -c 'wait_for_completion' scripts/fusion-bridge.sh  # Assert: >= 1
  grep -c 'extract_response' scripts/fusion-bridge.sh # Assert: >= 1
  
  # 함수 시그니처 유지
  grep 'run_opencode()' scripts/fusion-bridge.sh  # Assert: found
  
  # 구문 검증
  bash -n scripts/fusion-bridge.sh  # Assert: exit code 0
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `refactor(fusion-bridge): run_opencode를 REST API 기반으로 재작성`
  - Files: `scripts/fusion-bridge.sh`
  - Pre-commit: `bash -n scripts/fusion-bridge.sh`

---

- [ ] 3. `check_opencode()` 업데이트 — 서버 가용성 확인으로 변경

  **What to do**:
  - 기존 `check_opencode()` (line 92-99)는 `command -v opencode`로 CLI 바이너리 존재를 확인
  - REST API 전환 후에는 CLI 바이너리가 불필요할 수 있으므로:
    - **Option A**: `command -v opencode` 유지 + 서버 가용성 확인 추가 (opencode 바이너리는 서버 시작에 여전히 필요)
    - **Option B**: 서버 가용성만 확인 (서버가 이미 실행 중이라고 가정)
  - **추천: Option A** — `opencode` 바이너리 존재 확인 유지 + `find_available_server()` 호출하여 서버 가용성 사전 확인 + 경고 메시지 추가

  **Must NOT do**:
  - 영어 주석 사용 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 작은 함수 하나 수정, 5줄 이내 변경
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - `scripts/fusion-bridge.sh:92-99` — 현재 `check_opencode()` 구현
  - `scripts/fusion-bridge.sh:161-209` — `find_available_server()` 함수: 서버 검색 로직

  **Acceptance Criteria**:
  ```bash
  # check_opencode 함수 존재 확인
  grep -c 'check_opencode()' scripts/fusion-bridge.sh  # Assert: 1
  
  # 서버 가용성 확인 로직 존재
  grep -A 10 'check_opencode()' scripts/fusion-bridge.sh | grep -c 'find_available_server\|서버'
  # Assert: >= 1
  
  # 구문 검증
  bash -n scripts/fusion-bridge.sh  # Assert: exit code 0
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `refactor(fusion-bridge): check_opencode 서버 가용성 확인 추가`
  - Files: `scripts/fusion-bridge.sh`
  - Pre-commit: `bash -n scripts/fusion-bridge.sh`

---

- [ ] 4. 에러 처리 강화 (`set -e` 호환)

  **What to do**:
  - 모든 curl 호출에서 `set -e` 호환 에러 처리 패턴 적용:
  
  ```bash
  # 패턴 1: 실패 허용 (non-fatal)
  local response
  response=$(curl -sf --max-time 10 "http://localhost:${port}/session" \
      -H "Content-Type: application/json" \
      -d '{"title":"..."}' 2>/dev/null) || {
      log_error "세션 생성 실패: 서버 연결 오류"
      return 1
  }
  
  # 패턴 2: HTTP 상태코드 확인
  local http_code
  http_code=$(curl -s -o /tmp/response.json -w "%{http_code}" ...) || {
      log_error "요청 실패"
      return 1
  }
  if [[ "$http_code" != "200" ]] && [[ "$http_code" != "201" ]]; then
      log_error "API 오류: HTTP ${http_code}"
      return 1
  fi
  ```
  
  - 타임아웃 처리:
    - 개별 curl: `--max-time 30`
    - 폴링 전체: configurable timeout (기본 300초, `OMCM_TIMEOUT` 환경변수)
  
  - jq 파싱 에러 처리:
    ```bash
    local session_id
    session_id=$(echo "$response" | jq -r '.id // empty') || {
        log_error "응답 파싱 실패"
        return 1
    }
    if [[ -z "$session_id" ]]; then
        log_error "세션 ID를 받지 못했습니다"
        return 1
    fi
    ```
  
  - cleanup 보장: 실패 시에도 세션 정리
    ```bash
    # trap 또는 명시적 cleanup
    cleanup_session "$port" "$session_id" 2>/dev/null || true
    ```

  **Must NOT do**:
  - `set +e` / `set -e` 토글 사용 금지 (위험)
  - 영어 주석 사용 금지
  - 에러 무시 (silent failure) 금지 — 모든 에러는 로깅

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Error handling patterns require care but not complex reasoning
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References**:
  - `scripts/fusion-bridge.sh:10` — `set -e` 선언 위치
  - `scripts/fusion-bridge.sh:149-158` — `check_server_health()`: curl + `|| return 1` 에러 패턴 참고
  - `scripts/fusion-bridge.sh:35-49` — 로깅 함수들: 에러 로깅에 사용

  **Acceptance Criteria**:
  ```bash
  # set -e 유지 확인
  head -15 scripts/fusion-bridge.sh | grep 'set -e'  # Assert: found
  
  # curl에 --max-time 옵션 확인
  grep 'curl.*--max-time' scripts/fusion-bridge.sh | wc -l  # Assert: >= 3
  
  # jq 파싱 에러 처리 확인 (|| 패턴)
  grep 'jq.*||' scripts/fusion-bridge.sh | wc -l  # Assert: >= 1
  
  # 구문 검증
  bash -n scripts/fusion-bridge.sh  # Assert: exit code 0
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `refactor(fusion-bridge): curl/jq 에러 처리 강화`
  - Files: `scripts/fusion-bridge.sh`
  - Pre-commit: `bash -n scripts/fusion-bridge.sh`

---

- [ ] 5. 최종 검증 및 정리

  **What to do**:
  - 전체 스크립트 문법 검증: `bash -n scripts/fusion-bridge.sh`
  - `opencode run` 완전 제거 확인: `grep 'opencode run' scripts/fusion-bridge.sh` → 0 결과
  - 한국어 주석 확인: 영어-only 주석이 없는지 검증
  - 함수 목록 확인:
    - 유지: `log_info`, `log_success`, `log_warn`, `log_error`, `log_route`, `usage`, `check_opencode`, `get_mapping`, `check_server_health`, `find_available_server`, `update_pool_state_request`, `main`
    - 수정: `run_opencode`, `check_opencode`
    - 신규: `create_session`, `send_prompt`, `wait_for_completion`, `extract_response`, `cleanup_session`
  - ShellCheck (가능하다면): `shellcheck scripts/fusion-bridge.sh`

  **Must NOT do**:
  - 코드 변경 없이 검증만 수행

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 검증 명령어만 실행, 코드 변경 없음
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final)
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References**:
  - 전체 `scripts/fusion-bridge.sh` 파일

  **Acceptance Criteria**:
  ```bash
  # 1. 구문 검증
  bash -n scripts/fusion-bridge.sh
  # Assert: exit code 0
  
  # 2. opencode run 완전 제거
  grep -c 'opencode run' scripts/fusion-bridge.sh
  # Assert: 0
  
  # 3. REST API 호출 존재
  grep -c 'curl' scripts/fusion-bridge.sh
  # Assert: > 0
  
  # 4. jq 파싱 존재
  grep -c 'jq' scripts/fusion-bridge.sh
  # Assert: > 0
  
  # 5. 주요 함수 존재 확인
  for func in create_session send_prompt wait_for_completion extract_response cleanup_session run_opencode check_opencode; do
      grep -c "${func}()" scripts/fusion-bridge.sh
  done
  # Assert: all return >= 1
  
  # 6. ShellCheck (선택적)
  shellcheck scripts/fusion-bridge.sh 2>&1 | grep -c 'error'
  # Assert: 0 (또는 shellcheck 미설치 시 skip)
  ```

  **Commit**: NO (검증만)

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | 헬퍼 함수 추가, 독립 작업 |
| Task 2 | Task 1 | 헬퍼 함수를 호출하는 run_opencode 재작성 |
| Task 3 | Task 2 | run_opencode가 서버 의존으로 변경된 후 check_opencode 업데이트 |
| Task 4 | Task 3 | 전체 함수 구현 완료 후 에러 처리 강화 |
| Task 5 | Task 4 | 모든 변경 완료 후 최종 검증 |

## Parallel Execution Graph

```
Wave 1 (Sequential - single file, tightly coupled):
Task 1 → Task 2 → Task 3 → Task 4 → Task 5

Critical Path: All tasks are on critical path
Parallel Speedup: N/A (single file, single function rewrite)
```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1+2+3+4 | `refactor(fusion-bridge): run_opencode를 REST API 기반으로 전환` | `scripts/fusion-bridge.sh` | `bash -n scripts/fusion-bridge.sh && grep -c 'opencode run' scripts/fusion-bridge.sh` |

**Note**: Tasks 1-4 should be committed together as a single atomic change since they all modify the same function and are tightly coupled.

---

## Success Criteria

### Verification Commands
```bash
# 구문 검증
bash -n scripts/fusion-bridge.sh  # Expected: exit code 0

# opencode run 제거 확인
grep -c 'opencode run' scripts/fusion-bridge.sh  # Expected: 0

# REST API 호출 확인
grep -c 'curl.*localhost' scripts/fusion-bridge.sh  # Expected: >= 5

# 함수 존재 확인
grep -c 'create_session\|send_prompt\|wait_for_completion\|extract_response\|cleanup_session' scripts/fusion-bridge.sh
# Expected: >= 5
```

### Final Checklist
- [ ] All "Must Have" present (session lifecycle, error handling, timeout, output capture)
- [ ] All "Must NOT Have" absent (no opencode run, no English comments, no hardcoded ports)
- [ ] `bash -n` passes
- [ ] Korean comments throughout new code
- [ ] Function signature preserved: `run_opencode(agent, model, prompt)`
- [ ] Return codes preserved: 0=success, 1=failure

---

## Open Design Notes

### Polling vs SSE for Completion Detection

**Polling approach (recommended for bash):**
- Simple: `while` loop with `sleep` + `GET /session/{id}`
- Check if last message has `time.completed` set (non-null)
- Pro: Easy in bash, no WebSocket dependency
- Con: Slightly higher latency (poll interval)

**SSE approach (alternative):**
- Use `curl` with SSE: `curl -N http://localhost:{port}/event`
- Watch for `session.idle` event matching session ID
- Pro: Real-time, no wasted polls
- Con: Parsing SSE in bash is fragile; need background process + pipe

**Decision: Use polling** — simpler, more robust in bash, 2-3 second poll interval is acceptable.

### Model Parameter Format

From SDK: `SessionPromptParams.Model` has `id` and `provider` fields:
```json
{
  "parts": [{"type": "text", "text": "..."}],
  "agent": "build",
  "model": {
    "id": "openai/gpt-5.2-codex"
  }
}
```

The `model` string from agent-mapping.json (e.g., `"openai/gpt-5.2-codex"`) maps directly to `model.id`.

### No CLI Fallback

The current code has a fallback from server pool to direct `opencode run`. In the REST API version:
- If no server is found → `log_error` + return 1
- The caller (OMC) should handle this error appropriately
- Rationale: REST API requires a running server; there's no "direct" mode without a server
