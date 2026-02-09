# Fusion Server-Pool Routing Fix

## TL;DR

> **Quick Summary**: Add pool-aware server attachment to `fusion-bridge.sh` (`find_available_server` + `opencode run --attach` fallback) and add `autoscale`/`rebalance`/`health` subcommands to `start-server-pool.sh` with a `pool-state.json` least-connections state file.
>
> **Deliverables**:
> - `scripts/fusion-bridge.sh` — new `find_available_server()` function, `run_opencode()` rewritten for attach-first flow
> - `scripts/start-server-pool.sh` — new `autoscale`, `rebalance`, `health` subcommands; `pool-state.json` R/W functions; least-connections allocation
> - `$HOME/.omcm/server-pool/pool-state.json` — new structured state file
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (state file helpers) → Task 2 + Task 3 (parallel) → Task 4 (integration verify)

---

## Context

### Original Request

Fix OMCM fusion server-pool routing so that:
1. `fusion-bridge.sh` `run_opencode()` attaches to an existing `opencode serve` from the pool (ports 4096..4100) before falling back to `opencode run`.
2. `start-server-pool.sh` gains `autoscale`/`rebalance`/`health` subcommands with `pool-state.json` least-connections state.

### Existing Architecture

**Key files and their roles:**

| File | Role | Current State |
|------|------|---------------|
| `scripts/fusion-bridge.sh` (226 lines) | Routes OMC agent calls to OpenCode CLI | Uses `opencode run` directly, no pool awareness |
| `scripts/start-server-pool.sh` (237 lines) | Manages OpenCode server pool lifecycle | Has `start/stop/status/restart/quiet` but no autoscale/rebalance/health; no JSON state file; uses PID files only |
| `src/pool/server-pool.mjs` (846 lines) | Node.js ServerPoolManager used by hooks | Full pool manager with acquire/release, health check via `fetch('/global/health')`, state at `~/.omcm/server-pool.json` — **this is the canonical pool logic** |
| `src/executor/opencode-server-pool.mjs` (720 lines) | Older Node.js pool class | Round-robin + EventEmitter pattern, used by orchestrator modules |
| `hooks/fusion-router.mjs` (230 lines) | PreToolUse hook | Imports from `src/pool/server-pool.mjs`, calls `executeOnPool()` + `discoverExistingServers()` |
| `scripts/opencode-server.sh` (163 lines) | Single-server management | Separate from pool; manages single PID/port |

**State file reference** (`src/pool/server-pool.mjs`):
- Path: `$HOME/.omcm/server-pool.json` (current, flat)
- Fields per server entry: `{ port, pid, status, requestCount, lastUsed, startedAt }`

**Health check endpoint** (`src/pool/server-pool.mjs:116`):
```javascript
fetch('http://127.0.0.1:' + port + '/global/health')
```
Note: User says `opencode serve` is a SPA, so health check returns HTML not JSON. `checkHealth()` in server-pool.mjs just checks `res.ok` (HTTP 200), which works for HTML responses.

**Color codes in use** (both scripts share identical set):
```bash
RED='\033[0;31m'   GREEN='\033[0;32m'   YELLOW='\033[1;33m'
BLUE='\033[0;34m'  CYAN='\033[0;36m'    MAGENTA='\033[0;35m'  NC='\033[0m'
```

### Constraints (from user)
- `set -e` must be preserved in both scripts
- Korean comments only
- Reuse existing color code variables (RED, GREEN, YELLOW, BLUE, CYAN, MAGENTA, NC)
- No optional chaining (`?.`) — not applicable to bash but means: no `jq` expressions with `//`, always guard with explicit `if`/`test`
- Minimize new files (all changes go into the two existing scripts + new state file)
- No tests to run; no scope reductions

---

## Work Objectives

### Core Objective
Make the bash-level server pool scripts match the capabilities of the Node.js `ServerPoolManager` (`src/pool/server-pool.mjs`): structured JSON state, least-connections allocation, health checks, autoscale, and rebalance — then wire `fusion-bridge.sh` to prefer attaching to a pool server before spawning `opencode run`.

### Concrete Deliverables
1. **`scripts/start-server-pool.sh`** — rewritten with:
   - `read_pool_state()` / `write_pool_state()` — JSON R/W via jq or python3
   - `pool-state.json` structured state file at `$HOME/.omcm/server-pool/pool-state.json`
   - `health` subcommand — curl each server, update status, restart dead ones
   - `autoscale` subcommand — scale up if all busy, scale down if idle > MIN
   - `rebalance` subcommand — redistribute load (stop highest-request servers if above MIN, restart on least-used ports)
   - Least-connections server selection function
2. **`scripts/fusion-bridge.sh`** — rewritten `run_opencode()` with:
   - `find_available_server()` — reads `pool-state.json`, picks least-connections idle server, runs health check via curl
   - Attach flow: `opencode run --attach http://localhost:$PORT ...`
   - Fallback: if no pool server available, `opencode run` directly (existing behavior)
   - State update: increment `requests`, update `last_used` after use
3. **`$HOME/.omcm/server-pool/pool-state.json`** — schema:
   ```json
   {
     "version": 1,
     "lastUpdated": "2026-02-02T12:00:00Z",
     "config": {
       "basePort": 4096,
       "minServers": 1,
       "maxServers": 5
     },
     "servers": [
       {
         "port": 4096,
         "pid": 12345,
         "status": "idle",
         "requests": 0,
         "last_used": null,
         "config": {
           "startedAt": "2026-02-02T12:00:00Z"
         }
       }
     ]
   }
   ```

### Definition of Done
- [ ] `start-server-pool.sh health` reports per-server health with status updates in pool-state.json
- [ ] `start-server-pool.sh autoscale` scales up when all busy, scales down when idle > MIN_SERVERS
- [ ] `start-server-pool.sh rebalance` stops excess idle servers, restarts on lower ports if gaps
- [ ] `fusion-bridge.sh` `run_opencode()` attaches to least-connections pool server on ports 4096–4100
- [ ] `fusion-bridge.sh` falls back to `opencode run` if no pool server is available
- [ ] `pool-state.json` is written/read correctly with all specified fields
- [ ] `set -e` preserved in both scripts; all comments in Korean; existing color codes reused

### Must Have
- `find_available_server()` in `fusion-bridge.sh` with health check via curl
- Attach flow using `opencode run --attach http://localhost:$PORT`
- `autoscale`, `rebalance`, `health` subcommands in `start-server-pool.sh`
- `pool-state.json` with `{ port, pid, status, requests, last_used, config }` per server entry
- Least-connections allocation (pick server with lowest `requests` count among idle)
- Settings: `BASE_PORT=4096`, `MIN_SERVERS=1`, `MAX_SERVERS=5`

### Must NOT Have (Guardrails)
- No optional chaining patterns — every jq/python field access must be guarded
- No new script files — all logic goes into the two existing scripts
- No removal of `set -e`
- No English comments in code (Korean only)
- No changes to `src/pool/server-pool.mjs` or any `.mjs` files
- No breaking of existing `start/stop/status/restart/quiet` subcommands
- No modification of `scripts/opencode-server.sh`

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (npm test — 365 tests)
- **User wants tests**: NO (manual verification only per user constraint)
- **QA approach**: Automated bash verification

### Automated Verification

For each task, verification is via shell commands:

**State file verification:**
```bash
# pool-state.json 구조 확인
cat $HOME/.omcm/server-pool/pool-state.json | jq '.servers[0] | keys' 
# Assert: ["config","last_used","pid","port","requests","status"]

cat $HOME/.omcm/server-pool/pool-state.json | jq '.version'
# Assert: 1
```

**Health subcommand:**
```bash
./scripts/start-server-pool.sh health
# Assert: 출력에 "포트 4096" 포함, exit 0
```

**Autoscale subcommand:**
```bash
./scripts/start-server-pool.sh autoscale
# Assert: exit 0, pool-state.json 업데이트됨
```

**Fusion-bridge attach flow:**
```bash
# 서버 풀 시작 후
./scripts/start-server-pool.sh start
# fusion-bridge가 attach 사용하는지 확인
./scripts/fusion-bridge.sh architect "test" /tmp 2>&1 | grep -q "풀 서버"
# Assert: "풀 서버" 또는 attach 관련 로그 출력
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Add pool-state.json R/W helpers + schema to start-server-pool.sh
└── Task 2: Add find_available_server() to fusion-bridge.sh (can stub state reading)

Wave 2 (After Wave 1):
├── Task 3: Add health/autoscale/rebalance subcommands to start-server-pool.sh
└── Task 4: Rewrite run_opencode() attach flow in fusion-bridge.sh

Wave 3 (After Wave 2):
└── Task 5: Integration verification + edge cases
```

### Task Dependency Graph

| Task | Depends On | Reason | Blocks |
|------|------------|--------|--------|
| Task 1 | None | Foundation: JSON state R/W functions needed by all others | 2, 3, 4 |
| Task 2 | Task 1 | Reads pool-state.json (needs helpers from Task 1 pattern) | 4 |
| Task 3 | Task 1 | Uses read/write state helpers; adds subcommands that manipulate state | 5 |
| Task 4 | Task 1, Task 2 | Uses find_available_server + state update functions | 5 |
| Task 5 | Task 3, Task 4 | Final integration verification across both scripts | None |

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4 | None (foundation) |
| 2 | 1 | 4 | 3 |
| 3 | 1 | 5 | 2 |
| 4 | 1, 2 | 5 | 3 |
| 5 | 3, 4 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | category=quick, skills=[] |
| 2 | 2, 3 | category=unspecified-low, parallel |
| 3 | 4 | category=unspecified-low |
| 4 | 5 | category=quick (verification only) |

---

## TODOs

- [ ] 1. Add pool-state.json R/W helpers and schema initialization to `start-server-pool.sh`

  **What to do**:
  - Add `POOL_STATE_FILE="$PID_DIR/pool-state.json"` constant (reuses existing `PID_DIR="$HOME/.omcm/server-pool"`)
  - Add `read_pool_state()` function — reads JSON via jq (primary) or python3 (fallback); returns full JSON
  - Add `write_pool_state()` function — takes JSON string, writes atomically (write to .tmp, mv)
  - Add `init_pool_state()` function — creates initial state if file doesn't exist:
    ```json
    {
      "version": 1,
      "lastUpdated": "<ISO timestamp>",
      "config": { "basePort": 4096, "minServers": 1, "maxServers": 5 },
      "servers": []
    }
    ```
  - Add `update_server_in_state()` function — updates a single server entry by port; upserts
  - Add `get_server_from_state()` function — gets server entry by port
  - Add `remove_server_from_state()` function — removes server entry by port
  - Modify `start_server()` to also call `update_server_in_state` after successful start, writing `{ port, pid, status:"idle", requests:0, last_used:null, config:{ startedAt:"<ISO>" } }`
  - Modify `stop_pool()` to reset pool-state.json servers array to `[]`
  - Call `init_pool_state` in `start_pool()` before the loop

  **Must NOT do**:
  - Do not use optional chaining or `jq` `//` operator — use explicit `if`/`test` guards
  - Do not change existing function signatures
  - Do not remove any existing subcommands
  - English comments forbidden

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard bash editing, moderate complexity
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit after task completion

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not relevant (bash script)
  - `frontend-ui-ux`: No UI work
  - `python-programmer`: Not primary (bash with jq)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo — foundation)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/pool/server-pool.mjs:38-62` — `loadPoolState()` / `savePoolState()` pattern: atomic read/write JSON with `lastUpdated` field
  - `src/pool/server-pool.mjs:230-252` — `ServerEntry` typedef: `{ port, pid, status, requestCount, lastUsed, startedAt }` — map to new schema `{ port, pid, status, requests, last_used, config.startedAt }`
  - `scripts/start-server-pool.sh:10-14` — Existing settings block (`BASE_PORT`, `MIN_SERVERS`, `MAX_SERVERS`, `PID_DIR`) to extend
  - `scripts/start-server-pool.sh:59-92` — `start_server()` function to modify (add state update call)

  **API/Type References**:
  - New state schema fields: `port` (int), `pid` (int), `status` ("idle"|"busy"|"starting"|"dead"), `requests` (int), `last_used` (ISO string|null), `config` (object with `startedAt` ISO string)

  **WHY Each Reference Matters**:
  - `server-pool.mjs:38-62`: Shows the JSON schema pattern the bash version must be compatible with; the Node.js hooks read `~/.omcm/server-pool.json` (flat file) but the bash scripts will use `~/.omcm/server-pool/pool-state.json` (in PID_DIR). Both must coexist.
  - `start-server-pool.sh:10-14`: These are the constants the new functions will reference; must extend, not replace.
  - `start-server-pool.sh:59-92`: `start_server()` currently writes PID files only; must add JSON state write.

  **Acceptance Criteria**:
  - [ ] `POOL_STATE_FILE` variable defined at script top
  - [ ] `read_pool_state` function exists and returns valid JSON (or empty state)
  - [ ] `write_pool_state` function writes atomically (tmp + mv)
  - [ ] `init_pool_state` creates valid initial JSON with version=1
  - [ ] `start_server()` updates pool-state.json with new server entry after PID write
  - [ ] `stop_pool()` clears servers array in pool-state.json
  - [ ] All comments in Korean
  - [ ] `set -e` preserved at top
  - [ ] `jq` used for JSON manipulation with python3 fallback

  ```bash
  # 검증 명령
  bash -n scripts/start-server-pool.sh  # 구문 검사
  # Assert: exit 0 (no syntax errors)

  grep -c 'pool-state.json' scripts/start-server-pool.sh
  # Assert: >= 3 (referenced in multiple functions)

  grep -c 'read_pool_state\|write_pool_state\|init_pool_state' scripts/start-server-pool.sh
  # Assert: >= 6 (definitions + calls)
  ```

  **Commit**: YES
  - Message: `feat(scripts): pool-state.json R/W 헬퍼 함수 추가`
  - Files: `scripts/start-server-pool.sh`
  - Pre-commit: `bash -n scripts/start-server-pool.sh`

---

- [ ] 2. Add `find_available_server()` to `fusion-bridge.sh`

  **What to do**:
  - Add constants near top:
    ```bash
    POOL_STATE_FILE="$HOME/.omcm/server-pool/pool-state.json"
    BASE_PORT=4096
    MAX_SERVERS=5
    ```
  - Add `find_available_server()` function that:
    1. Checks if `$POOL_STATE_FILE` exists; if not, falls back to port scan
    2. Reads pool-state.json via jq (or python3 fallback)
    3. Filters servers where `status == "idle"`
    4. Sorts by `requests` ascending (least-connections)
    5. For the top candidate, runs health check: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" --max-time 2` — expects 200 (SPA returns HTML)
    6. If health check passes, echoes port number; if fails, tries next candidate
    7. Fallback: scan ports 4096..4100 directly with curl if no state file or all state entries unhealthy
    8. Returns empty string if no server found
  - Add `update_pool_state_after_use()` helper:
    1. Reads state, increments `requests` for the used port, sets `last_used` to current ISO timestamp, sets `status` to "busy"
    2. Writes state back
  - Add `release_pool_server()` helper:
    1. Sets server status back to "idle" in pool-state.json

  **Must NOT do**:
  - No optional chaining — guard every jq field read
  - No changes to `get_mapping()`, `check_opencode()`, `usage()` functions
  - No English comments

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate bash complexity; JSON parsing + HTTP health check
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - `git-master`: Commit handled in Task 4 (combined commit)
  - `typescript-programmer`: Bash only
  - `frontend-ui-ux`: No UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1 (needs state file schema knowledge)

  **References**:

  **Pattern References**:
  - `src/pool/server-pool.mjs:336-396` — `ServerPoolManager.prototype.acquire()` — the Node.js equivalent: finds idle server with least requestCount, health-checks, marks busy. **This is THE reference implementation** for `find_available_server()`.
  - `src/pool/server-pool.mjs:111-124` — `checkHealth()` — uses `fetch('/global/health')` checking `res.ok`. Bash equivalent: `curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/global/health --max-time 2`
  - `scripts/fusion-bridge.sh:138-172` — Current `run_opencode()` function to understand existing call pattern
  - `scripts/fusion-bridge.sh:22-29` — Color code variables to reuse in log output
  - `scripts/start-server-pool.sh:34-57` — `is_server_running()` — PID + port-check pattern, partially reusable
  - `src/pool/server-pool.mjs:402-411` — `release()` — sets status to idle, increments requestCount

  **WHY Each Reference Matters**:
  - `server-pool.mjs:336-396`: Direct algorithmic blueprint — sort idle servers by requestCount, health-check top candidate, fallback to scale-up. Bash version mirrors this.
  - `server-pool.mjs:111-124`: Health check endpoint is `/global/health` (not `/health` as in the older scripts). Must use correct path.
  - `fusion-bridge.sh:138-172`: The function being replaced; understand its signature and output contract.

  **Acceptance Criteria**:
  - [ ] `find_available_server` function exists and echoes a port number or empty
  - [ ] Function reads pool-state.json and sorts by `requests` (least-connections)
  - [ ] Function runs curl health check on `/global/health` endpoint
  - [ ] Function falls back to port-scan 4096..4100 if no state file
  - [ ] `update_pool_state_after_use` increments requests count
  - [ ] All Korean comments

  ```bash
  # 검증 명령
  bash -n scripts/fusion-bridge.sh
  # Assert: exit 0

  grep -c 'find_available_server' scripts/fusion-bridge.sh
  # Assert: >= 2 (definition + call)

  grep 'global/health' scripts/fusion-bridge.sh
  # Assert: found (correct health endpoint)

  grep 'requests' scripts/fusion-bridge.sh
  # Assert: found (least-connections field)
  ```

  **Commit**: NO (groups with Task 4)

---

- [ ] 3. Add `health`, `autoscale`, `rebalance` subcommands to `start-server-pool.sh`

  **What to do**:

  **3a. `health` subcommand** (`health_check_pool` function):
  1. Read pool-state.json
  2. For each server entry:
     - Check PID alive: `kill -0 $pid 2>/dev/null`
     - Check HTTP health: `curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/global/health --max-time 3`
     - If both pass → status="idle" (or keep "busy" if currently busy)
     - If fail → status="dead", attempt restart via existing `start_server()`
     - Update pool-state.json entry
  3. Print summary: healthy/dead/restarted counts
  4. Also check for orphaned servers (running on pool ports but not in state) — add them

  **3b. `autoscale` subcommand** (`autoscale_pool` function):
  1. Read pool-state.json
  2. Count statuses: idle, busy, dead
  3. **Scale UP condition**: all servers are busy AND `total < MAX_SERVERS`
     - Find next available port (basePort + i not in current servers)
     - Call `start_server $port`
     - Add entry to pool-state.json
     - Log: `"${GREEN}오토스케일: 포트 $port 서버 추가${NC}"`
  4. **Scale DOWN condition**: idle count > MIN_SERVERS AND no busy servers
     - Pick server with highest `requests` among idle (most used = least valuable to keep)
     - Kill PID, remove from state
     - Log: `"${YELLOW}오토스케일: 포트 $port 서버 축소${NC}"`
  5. **Dead server recovery**: if any dead, restart them
     - Attempt `start_server` on same port; if fail, try next available port

  **3c. `rebalance` subcommand** (`rebalance_pool` function):
  1. Read pool-state.json
  2. Identify port gaps (e.g., 4096 dead, 4097 running, 4098 running → gap at 4096)
  3. If idle servers exist on higher ports and gaps at lower ports:
     - Stop the high-port idle server
     - Start new server on the gap port
     - Transfer requestCount to maintain continuity
  4. Reset `requests` counters on all servers to 0 (load rebalance)
  5. Print before/after status

  **3d. Wire into case statement**:
  Add `health|autoscale|rebalance` to the existing `case` block at bottom.

  **Must NOT do**:
  - Do not break existing `start|stop|status|restart|quiet` commands
  - Do not use optional chaining in jq
  - English comments forbidden

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate bash logic; multiple subcommands
  - **Skills**: []

  **Skills Evaluated but Omitted**:
  - `git-master`: Commit is separate
  - `typescript-programmer`: Bash only

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/pool/server-pool.mjs:539-574` — `ServerPoolManager.prototype.healthCheck()` — Node.js equivalent: checks PID alive + HTTP health, replaces dead servers. **Direct blueprint for `health_check_pool()`**
  - `src/pool/server-pool.mjs:417-440` — `_scaleUp()` — Finds available port, starts server, pushes to array. Blueprint for autoscale up.
  - `src/pool/server-pool.mjs:502-533` — `scaleDown()` — Removes idle servers exceeding idleTimeout. Blueprint for autoscale down.
  - `scripts/start-server-pool.sh:127-168` — Existing `status_pool()` — iterates PID files + port scan; reference for health output format
  - `scripts/start-server-pool.sh:59-92` — `start_server()` — reuse for restart logic in health/autoscale
  - `scripts/start-server-pool.sh:214-236` — Existing case statement to extend

  **API/Type References**:
  - Health endpoint: `GET http://localhost:$port/global/health` — returns HTML (SPA), HTTP 200 = healthy
  - `pool-state.json` server entry: `{ port, pid, status, requests, last_used, config }`

  **WHY Each Reference Matters**:
  - `server-pool.mjs:539-574`: Exact algorithm to replicate in bash — iterate servers, check PID + HTTP, mark dead, replace.
  - `server-pool.mjs:417-440`: Port-finding logic — iterate `basePort..basePort+maxServers`, skip used ports.
  - `start-server-pool.sh:214-236`: The case statement being extended; must preserve all existing cases.

  **Acceptance Criteria**:
  - [ ] `health` subcommand: iterates all pool servers, prints per-server health, updates pool-state.json
  - [ ] `autoscale` subcommand: scales up when all busy + room, scales down when idle > MIN_SERVERS
  - [ ] `rebalance` subcommand: fills port gaps, resets request counters
  - [ ] All three wired into case statement
  - [ ] Existing subcommands (`start|stop|status|restart|quiet`) still work unchanged
  - [ ] Korean comments; set -e preserved

  ```bash
  # 검증 명령
  bash -n scripts/start-server-pool.sh
  # Assert: exit 0

  grep -c 'health_check_pool\|autoscale_pool\|rebalance_pool' scripts/start-server-pool.sh
  # Assert: >= 6 (3 definitions + 3 case entries)

  grep 'autoscale)' scripts/start-server-pool.sh
  # Assert: found

  grep 'rebalance)' scripts/start-server-pool.sh
  # Assert: found

  grep 'health)' scripts/start-server-pool.sh
  # Assert: found
  ```

  **Commit**: YES
  - Message: `feat(scripts): start-server-pool에 health/autoscale/rebalance 서브커맨드 추가`
  - Files: `scripts/start-server-pool.sh`
  - Pre-commit: `bash -n scripts/start-server-pool.sh`

---

- [ ] 4. Rewrite `run_opencode()` attach flow in `fusion-bridge.sh`

  **What to do**:
  - Rewrite `run_opencode()` function (lines 138-172) to:
    1. Call `find_available_server` to get an available port
    2. If port found:
       - `log_info "풀 서버 포트 $port에 연결 중..."` 
       - Run: `opencode run --attach "http://localhost:$port" --agent "$opencode_agent" --model "$model" "$prompt"`
       - Call `update_pool_state_after_use "$port"` before execution
       - Call `release_pool_server "$port"` after execution (in trap or finally block)
       - On success: log `log_success "풀 서버 통해 완료 (포트 $port)"`
    3. If no port found (empty string from find_available_server):
       - `log_warn "풀 서버 없음 - opencode run 직접 실행"`
       - Fall back to existing `opencode run` behavior (no --attach)
    4. Error handling: if `opencode run --attach` fails, retry once with direct `opencode run`

  **Must NOT do**:
  - Do not change function signature (`run_opencode "$opencode_agent" "$model" "$prompt"`)
  - Do not modify `main()` function
  - English comments forbidden
  - Do not use optional chaining

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Rewriting single function with branching logic
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for this change

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Bash only
  - `frontend-ui-ux`: No UI

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Tasks 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1, Task 2

  **References**:

  **Pattern References**:
  - `scripts/fusion-bridge.sh:138-172` — Current `run_opencode()` — understand exactly what to preserve (logging, result file, return codes)
  - `src/executor/opencode-server-pool.mjs:486-554` — `_executeOnServer()` — Node.js pattern: uses `opencode run --attach <url>`, `--format json`, `--model`, `--agent`. **Key reference for the `--attach` flag usage.**
  - `src/pool/server-pool.mjs:661-792` — `executeOnPool()` — Full flow: acquire server → execute → release → handle errors. Blueprint for the bash version.
  - `scripts/fusion-bridge.sh:35-53` — Log utility functions (`log_info`, `log_success`, `log_warn`, `log_error`, `log_route`) to use

  **WHY Each Reference Matters**:
  - `opencode-server-pool.mjs:486-554`: Shows exact CLI args: `opencode run --attach <server.url> --format json --model <model> --agent <agent> <prompt>`. Must replicate in bash.
  - `server-pool.mjs:661-792`: The full acquire→execute→release lifecycle that the bash version must mirror.
  - `fusion-bridge.sh:138-172`: Current code being replaced — preserve exit code contract, log format, result file pattern.

  **Acceptance Criteria**:
  - [ ] `run_opencode()` tries pool server first via `find_available_server`
  - [ ] Uses `opencode run --attach http://localhost:$port` when server available
  - [ ] Falls back to `opencode run` (no --attach) when no server available
  - [ ] State updated: requests incremented, last_used set, status transitions
  - [ ] Error retry: attach failure → direct run fallback
  - [ ] Korean log messages using existing color codes
  - [ ] Function signature unchanged

  ```bash
  # 검증 명령
  bash -n scripts/fusion-bridge.sh
  # Assert: exit 0

  grep 'attach' scripts/fusion-bridge.sh
  # Assert: found (--attach flag in opencode run)

  grep 'find_available_server' scripts/fusion-bridge.sh
  # Assert: found (called in run_opencode)

  grep '풀 서버' scripts/fusion-bridge.sh
  # Assert: found (Korean log about pool server)
  ```

  **Commit**: YES
  - Message: `feat(scripts): fusion-bridge에 서버 풀 연결 플로우 추가`
  - Files: `scripts/fusion-bridge.sh`
  - Pre-commit: `bash -n scripts/fusion-bridge.sh`

---

- [ ] 5. Integration verification and edge-case hardening

  **What to do**:
  - Verify both scripts pass `bash -n` syntax check
  - Verify `set -e` is in both scripts
  - Verify all comments are Korean
  - Verify pool-state.json is created correctly by `start_pool`
  - Verify `health` subcommand handles: empty pool, all dead, mixed states
  - Verify `autoscale` handles: already at MAX, already at MIN, all busy, all idle
  - Verify `find_available_server` handles: no state file, empty servers array, all dead, mixed
  - Verify `run_opencode` handles: no servers → fallback, attach failure → retry
  - Add `set +e` / `set -e` guards around health check curl calls (curl returns non-zero on timeout — would kill script under set -e)
  - Ensure jq absence fallback to python3 works in all JSON helpers

  **Must NOT do**:
  - No new files
  - No English comments
  - No scope reduction

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification pass, minor fixes
  - **Skills**: [`git-master`]
    - `git-master`: Final commit if fixes needed

  **Skills Evaluated but Omitted**:
  - All others: Not relevant for verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None
  - **Blocked By**: Task 3, Task 4

  **References**:

  **Pattern References**:
  - `scripts/opencode-server.sh:7` — `set -e` pattern reference
  - `scripts/start-server-pool.sh:48` — `lsof` / `ss` port check pattern for edge cases
  - `src/pool/server-pool.mjs:95-103` — `isProcessAlive()` — error handling pattern for PID checks

  **Acceptance Criteria**:
  - [ ] `bash -n scripts/fusion-bridge.sh` → exit 0
  - [ ] `bash -n scripts/start-server-pool.sh` → exit 0
  - [ ] `grep -c 'set -e' scripts/fusion-bridge.sh` → 1
  - [ ] `grep -c 'set -e' scripts/start-server-pool.sh` → 1
  - [ ] No English comments (grep for common English patterns returns 0)
  - [ ] curl calls wrapped in `set +e` / `set -e` blocks to prevent script exit on HTTP failure

  ```bash
  bash -n scripts/fusion-bridge.sh && bash -n scripts/start-server-pool.sh
  # Assert: exit 0

  grep -c 'set -e' scripts/fusion-bridge.sh scripts/start-server-pool.sh
  # Assert: both >= 1
  ```

  **Commit**: YES (if fixes made)
  - Message: `fix(scripts): 엣지 케이스 핸들링 및 set -e 호환성 수정`
  - Files: `scripts/fusion-bridge.sh`, `scripts/start-server-pool.sh`
  - Pre-commit: `bash -n scripts/fusion-bridge.sh && bash -n scripts/start-server-pool.sh`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(scripts): pool-state.json R/W 헬퍼 함수 추가` | start-server-pool.sh | `bash -n` |
| 3 | `feat(scripts): start-server-pool에 health/autoscale/rebalance 서브커맨드 추가` | start-server-pool.sh | `bash -n` |
| 4 | `feat(scripts): fusion-bridge에 서버 풀 연결 플로우 추가` | fusion-bridge.sh | `bash -n` |
| 5 | `fix(scripts): 엣지 케이스 핸들링 및 set -e 호환성 수정` | both scripts | `bash -n` both |

---

## Success Criteria

### Verification Commands
```bash
# 1. 구문 검사
bash -n scripts/fusion-bridge.sh          # exit 0
bash -n scripts/start-server-pool.sh      # exit 0

# 2. 새 함수 존재 확인
grep 'find_available_server' scripts/fusion-bridge.sh    # found
grep 'health_check_pool' scripts/start-server-pool.sh    # found
grep 'autoscale_pool' scripts/start-server-pool.sh       # found
grep 'rebalance_pool' scripts/start-server-pool.sh       # found

# 3. pool-state.json 참조 확인
grep 'pool-state.json' scripts/start-server-pool.sh      # found (3+ times)
grep 'pool-state.json' scripts/fusion-bridge.sh           # found

# 4. 서브커맨드 와이어링 확인
grep -E 'health\)|autoscale\)|rebalance\)' scripts/start-server-pool.sh  # 3 matches

# 5. attach 플래그 확인
grep '\-\-attach' scripts/fusion-bridge.sh                # found

# 6. least-connections (requests 정렬) 확인
grep 'requests' scripts/fusion-bridge.sh                  # found (sort by requests)

# 7. 한국어 코멘트만 존재 확인 (영어 코멘트 없음)
grep -P '^\s*#\s*[A-Z][a-z]' scripts/fusion-bridge.sh scripts/start-server-pool.sh | grep -v 'OMCM\|OpenCode\|PID\|JSON\|HTTP\|URL\|ISO\|SPA\|BASE_PORT\|MIN_SERVERS\|MAX_SERVERS\|POOL_STATE' | wc -l
# Assert: 0 (no English-only comments)

# 8. set -e 보존 확인
head -5 scripts/fusion-bridge.sh | grep 'set -e'          # found
grep 'set -e' scripts/start-server-pool.sh                # found (may not be at top currently - add if missing)
```

### Final Checklist
- [ ] All "Must Have" present (find_available_server, attach flow, autoscale/rebalance/health, pool-state.json, least-connections)
- [ ] All "Must NOT Have" absent (no optional chaining, no English comments, no new files, set -e preserved)
- [ ] Both scripts pass `bash -n` syntax validation
- [ ] 4 atomic commits created
