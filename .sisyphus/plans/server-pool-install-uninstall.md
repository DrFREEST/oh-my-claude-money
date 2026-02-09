# Server Pool Install/Uninstall Integration

## TL;DR

> **Quick Summary**: install.sh와 uninstall.sh에 서버 풀 라이프사이클 관리를 통합하고, 상태 파일 경로 불일치를 수정하며, package.json DX를 개선한다.
>
> **Deliverables**:
> - `install.sh`: `setup_server_pool()` 함수 추가 (디렉토리 + pool-state.json 초기화)
> - `uninstall.sh`: Step 0 서버 풀 중지 로직 추가
> - `package.json`: server-pool 관련 npm scripts 추가
> - `src/pool/server-pool.mjs`: 상태 파일 경로 통일 (critical bugfix)
>
> **Estimated Effort**: Short (~30분)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (경로 통일) → Task 2, 3 (install/uninstall) → Task 4 (package.json)

---

## Context

### Original Request
install.sh에 서버 풀 디렉토리 초기화 추가, uninstall.sh에 서버 풀 중지 로직 추가, package.json 스크립트 개선.

### Interview Summary
**Key Discussions**:
- 사용자 선택: Option A+B (디렉토리 생성 + pool-state.json 초기화)
- 사용자 선택: uninstall.sh 가장 먼저 서버 풀 중지
- 테스트 전략: lsp_diagnostics 기반 검증

**Research Findings**:
- **경로 불일치 발견 (Critical)**: `src/pool/server-pool.mjs`는 `~/.omcm/server-pool.json`을, `scripts/start-server-pool.sh` + `scripts/fusion-bridge.sh`는 `~/.omcm/server-pool/pool-state.json`을 사용. 반드시 통일 필요.
- `scripts/start-server-pool.sh`는 이미 `start|stop|status|restart|quiet|autoscale|rebalance|health` 지원
- `src/hooks/session-start.mjs`가 `~/.omcm/server-pool/` PID 디렉토리를 직접 참조 (line 69)
- `scripts/fusion-bridge.sh`가 `~/.omcm/server-pool/pool-state.json`을 읽고 씀 (line 140-141)
- `uninstall.sh`에 `local` 키워드가 함수 외부에서 사용됨 (lines 94, 96, 114, 161) - 기존 이슈, 이번 범위 아님

### Metis Review
**Identified Gaps** (addressed):
- 상태 파일 경로 불일치: Task 1로 해결
- 멱등성: pool-state.json 이미 존재 시 덮어쓰지 않음
- PID 유령 파일: uninstall.sh에서 PID 파일도 정리
- 포트 충돌: 설치 시점에는 서버를 시작하지 않으므로 해당 없음

---

## Work Objectives

### Core Objective
OMCM의 서버 풀 라이프사이클(설치/제거)을 설치 스크립트에 통합하고, 상태 파일 경로를 통일한다.

### Concrete Deliverables
- `install.sh`: `setup_server_pool()` 함수 추가
- `uninstall.sh`: Step 0 서버 풀 중지 로직
- `package.json`: 4개 npm script 추가
- `src/pool/server-pool.mjs`: `POOL_STATE_FILE` 경로 수정

### Definition of Done
- [ ] `install.sh -y` 실행 후 `~/.omcm/server-pool/` 및 `~/.omcm/logs/` 디렉토리 존재
- [ ] `install.sh -y` 실행 후 `~/.omcm/server-pool/pool-state.json` 파일 존재
- [ ] `uninstall.sh` 실행 시 서버 풀 프로세스 정상 종료
- [ ] `src/pool/server-pool.mjs`가 `~/.omcm/server-pool/pool-state.json` 경로 사용
- [ ] lsp_diagnostics에서 에러 없음

### Must Have
- 멱등성: 재실행해도 기존 pool-state.json 보존
- 서버 풀 프로세스 정리 후 파일 제거 순서

### Must NOT Have (Guardrails)
- install.sh에서 서버 풀 자동 시작하지 않음 (디렉토리/상태파일 초기화만)
- 기존 함수 시그니처 변경하지 않음
- `local` 키워드 버그 수정 (기존 이슈, 이번 범위 아님)
- 로그 로테이션 로직 (범위 밖)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (node --test)
- **User wants tests**: Manual verification + lsp_diagnostics
- **Framework**: node --test (기존)

### Automated Verification

각 TODO의 수락 기준은 Bash 명령어로 에이전트가 직접 검증 가능.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: server-pool.mjs 경로 수정 (독립)
└── Task 4: package.json 스크립트 추가 (독립)

Wave 2 (After Wave 1):
├── Task 2: install.sh setup_server_pool 추가 (depends: Task 1의 경로 결정)
└── Task 3: uninstall.sh 서버 풀 중지 추가 (독립, but logically after Task 1)

Wave 3 (After Wave 2):
└── Task 5: 전체 lsp_diagnostics 검증
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | 4 |
| 2 | 1 | 5 | 3 |
| 3 | 1 | 5 | 2 |
| 4 | None | 5 | 1 |
| 5 | 2, 3, 4 | None | None (final) |

---

## TODOs

- [ ] 1. **server-pool.mjs 상태 파일 경로 통일 (Critical Bugfix)**

  **What to do**:
  - `src/pool/server-pool.mjs` 줄 20의 `POOL_STATE_FILE` 경로를 `~/.omcm/server-pool/pool-state.json`으로 변경
  - 줄 11의 주석도 업데이트
  - `loadPoolState()` 함수에서 디렉토리 생성 로직이 `~/.omcm/server-pool/`도 포함하는지 확인

  **구체적 변경**:
  ```javascript
  // 변경 전 (줄 20):
  var POOL_STATE_FILE = join(OMCM_DIR, 'server-pool.json');

  // 변경 후:
  var POOL_DIR = join(OMCM_DIR, 'server-pool');
  var POOL_STATE_FILE = join(POOL_DIR, 'pool-state.json');
  ```

  `loadPoolState()` 함수 수정:
  ```javascript
  // 변경 전 (줄 39):
  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }

  // 변경 후:
  if (!existsSync(POOL_DIR)) {
    mkdirSync(POOL_DIR, { recursive: true });
  }
  ```

  `savePoolState()` 함수 수정:
  ```javascript
  // 변경 전 (줄 57):
  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }

  // 변경 후:
  if (!existsSync(POOL_DIR)) {
    mkdirSync(POOL_DIR, { recursive: true });
  }
  ```

  **Must NOT do**:
  - 다른 함수 시그니처 변경
  - ServerPoolManager 클래스 구조 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 경로 상수 변경 3곳, 복잡도 낮음
  - **Skills**: [`git-master`]
    - `git-master`: 단일 파일 원자적 커밋

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/pool/server-pool.mjs:18-21` - 현재 OMCM_DIR, POOL_STATE_FILE 정의. `POOL_DIR` 중간 변수를 추가해야 함
  - `src/pool/server-pool.mjs:38-49` - `loadPoolState()` 함수. 디렉토리 존재 확인 로직을 POOL_DIR로 변경
  - `src/pool/server-pool.mjs:56-62` - `savePoolState()` 함수. 동일하게 POOL_DIR로 변경

  **일관성 참조 (이 경로를 이미 사용하는 파일들)**:
  - `scripts/start-server-pool.sh:16` - `PID_DIR="$HOME/.omcm/server-pool"` (이미 올바른 경로)
  - `scripts/fusion-bridge.sh:140-141` - `POOL_STATE_DIR="$HOME/.omcm/server-pool"`, `POOL_STATE_FILE="$POOL_STATE_DIR/pool-state.json"` (이미 올바른 경로)
  - `src/hooks/session-start.mjs:69` - `const pidDir = join(homedir(), '.omcm', 'server-pool');` (이미 올바른 경로)

  **Acceptance Criteria**:

  ```bash
  # 에이전트 실행:
  grep -n 'POOL_STATE_FILE' /opt/oh-my-claude-money/src/pool/server-pool.mjs
  # Assert: 출력에 'server-pool/pool-state.json' 포함 (server-pool.json이 아님)

  grep -n 'POOL_DIR' /opt/oh-my-claude-money/src/pool/server-pool.mjs
  # Assert: POOL_DIR 변수 정의 존재

  grep -n 'OMCM_DIR' /opt/oh-my-claude-money/src/pool/server-pool.mjs | grep -v '//'
  # Assert: loadPoolState/savePoolState에서 OMCM_DIR 대신 POOL_DIR 사용
  ```

  ```bash
  # lsp_diagnostics 검증:
  # lsp_diagnostics("/opt/oh-my-claude-money/src/pool/server-pool.mjs") → 에러 0건
  ```

  **Commit**: YES
  - Message: `fix(pool): unify pool state file path to ~/.omcm/server-pool/pool-state.json`
  - Files: `src/pool/server-pool.mjs`
  - Pre-commit: `node --test tests/**/*.test.mjs 2>/dev/null || true`

---

- [ ] 2. **install.sh에 setup_server_pool() 함수 추가**

  **What to do**:
  - `setup_handoff_directory()` 함수 뒤(줄 553 이후)에 `setup_server_pool()` 함수 추가
  - `main()` 함수에서 `setup_handoff_directory` 호출 직후 `setup_server_pool` 호출 추가

  **구체적 변경 - 새 함수 (줄 554 이후 삽입)**:
  ```bash
  # 서버 풀 디렉토리 및 상태 파일 초기화
  setup_server_pool() {
      log_step "서버 풀 초기화"

      # 디렉토리 생성
      mkdir -p "$HOME/.omcm/server-pool"
      mkdir -p "$HOME/.omcm/logs"

      log_success "서버 풀 디렉토리 생성 완료"

      # pool-state.json 초기화 (이미 존재하면 보존 - 멱등성)
      if [[ ! -f "$HOME/.omcm/server-pool/pool-state.json" ]]; then
          cat > "$HOME/.omcm/server-pool/pool-state.json" << 'POOL_EOF'
  {
    "servers": [],
    "lastUpdated": null
  }
  POOL_EOF
          log_success "pool-state.json 초기화 완료"
      else
          log_info "pool-state.json 이미 존재 (보존됨)"
      fi

      log_success "서버 풀 초기화 완료"
  }
  ```

  **main() 함수 수정 (줄 870 이후)**:
  ```bash
  # 변경 전 (줄 870):
      setup_handoff_directory
      check_codesyncer

  # 변경 후:
      setup_handoff_directory
      setup_server_pool
      check_codesyncer
  ```

  **Must NOT do**:
  - 서버 풀 자동 시작 (서버를 실행하지 않음)
  - 기존 `setup_handoff_directory` 함수 수정
  - 기존 pool-state.json 덮어쓰기

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 새 함수 1개 삽입 + main에 1줄 추가
  - **Skills**: [`git-master`]
    - `git-master`: 원자적 커밋

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `install.sh:481-553` - `setup_handoff_directory()` 함수. 동일한 패턴(log_step, mkdir, cat heredoc, log_success)을 따라야 함
  - `install.sh:863-871` - `main()` 함수의 설치 단계 순서. `setup_handoff_directory` 직후에 삽입

  **일관성 참조**:
  - `scripts/start-server-pool.sh:16-17` - `PID_DIR="$HOME/.omcm/server-pool"`, `LOG_DIR="$HOME/.omcm/logs"` (동일 경로 사용 확인)
  - `src/pool/server-pool.mjs:20` - Task 1 수정 후 `POOL_STATE_FILE`이 `~/.omcm/server-pool/pool-state.json` (일치 확인)

  **Acceptance Criteria**:

  ```bash
  # 에이전트 실행:
  grep -n 'setup_server_pool' /opt/oh-my-claude-money/install.sh
  # Assert: 함수 정의 + main에서 호출, 최소 2줄 출력

  grep -c 'pool-state.json' /opt/oh-my-claude-money/install.sh
  # Assert: 최소 2 (조건문 + heredoc)

  # 문법 검사:
  bash -n /opt/oh-my-claude-money/install.sh
  # Assert: 종료 코드 0 (문법 에러 없음)
  ```

  **Commit**: YES (Task 3과 함께 그룹)
  - Message: `feat(install): add server pool directory and state file initialization`
  - Files: `install.sh`
  - Pre-commit: `bash -n install.sh`

---

- [ ] 3. **uninstall.sh에 서버 풀 중지 로직 추가 (Step 0)**

  **What to do**:
  - 기존 Step [1/6] 전에 Step [0/7] 서버 풀 중지 로직 삽입
  - 기존 6단계를 7단계로 번호 업데이트
  - `scripts/start-server-pool.sh stop` 호출 + PID 파일 정리

  **구체적 변경 - Step 0 삽입 (줄 34 이후, 기존 Step 1 이전)**:
  ```bash
  # ============================================================================
  # 0. 서버 풀 중지 (가장 먼저 - 프로세스 정리 후 파일 제거)
  # ============================================================================
  echo -e "${BLUE}[0/7]${NC} 서버 풀 중지..."
  SCRIPT_DIR_FOR_POOL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  POOL_SCRIPT="$SCRIPT_DIR_FOR_POOL/scripts/start-server-pool.sh"

  if [[ -x "$POOL_SCRIPT" ]]; then
      "$POOL_SCRIPT" stop 2>/dev/null && \
          echo -e "  ${GREEN}✓${NC} 서버 풀 중지됨" || \
          echo -e "  ${YELLOW}!${NC} 서버 풀 중지 실패 (이미 중지되었을 수 있음)"
  else
      echo -e "  ${YELLOW}-${NC} start-server-pool.sh 없음 (건너뜀)"
  fi

  # 잔여 PID 파일 정리
  if [[ -d "$HOME/.omcm/server-pool" ]]; then
      rm -f "$HOME/.omcm/server-pool"/server-*.pid 2>/dev/null
      echo -e "  ${GREEN}✓${NC} PID 파일 정리됨"
  fi
  ```

  **기존 단계 번호 업데이트**:
  ```
  [1/6] → [1/7]
  [2/6] → [2/7]
  [3/6] → [3/7]
  [4/6] → [4/7]
  [5/6] → [5/7]
  [6/6] → [6/7]
  ```

  **추가: Step [4/7] 상태 파일 제거에 server-pool 파일 포함 (줄 148 부근)**:
  기존 for 루프에 추가:
  ```bash
      "$HOME/.omcm/server-pool/pool-state.json"
  ```

  **Must NOT do**:
  - `uninstall.sh`의 `local` 키워드 버그 수정 (기존 이슈, 이번 범위 아님)
  - 기존 제거 로직 변경 (추가만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 쉘 스크립트에 블록 삽입 + 번호 치환
  - **Skills**: [`git-master`]
    - `git-master`: 원자적 커밋

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `uninstall.sh:35-44` - 기존 Step [1/6] 패턴. 동일한 echo/if 패턴 따라야 함
  - `uninstall.sh:173-190` - Step [5/6] PID/상태 파일 정리 패턴

  **스크립트 참조**:
  - `scripts/start-server-pool.sh:173-190` - `stop_pool()` 함수. PID 파일 순회 후 kill하는 로직
  - `scripts/start-server-pool.sh:16` - `PID_DIR="$HOME/.omcm/server-pool"` (PID 파일 경로)

  **Acceptance Criteria**:

  ```bash
  # 에이전트 실행:
  grep -n '\[0/7\]' /opt/oh-my-claude-money/uninstall.sh
  # Assert: Step 0 존재

  grep -c '/7\]' /opt/oh-my-claude-money/uninstall.sh
  # Assert: 7 (0~6, 총 7개 단계)

  grep 'start-server-pool.sh stop' /opt/oh-my-claude-money/uninstall.sh
  # Assert: 존재

  grep 'server-\*.pid' /opt/oh-my-claude-money/uninstall.sh
  # Assert: PID 파일 정리 로직 존재

  # 문법 검사:
  bash -n /opt/oh-my-claude-money/uninstall.sh
  # Assert: 종료 코드 0
  ```

  **Commit**: YES (Task 2와 함께 그룹)
  - Message: `feat(uninstall): stop server pool before removal (Step 0/7)`
  - Files: `uninstall.sh`
  - Pre-commit: `bash -n uninstall.sh`

---

- [ ] 4. **package.json에 서버 풀 npm scripts 추가**

  **What to do**:
  - `scripts` 섹션에 4개 서버 풀 관련 스크립트 추가

  **구체적 변경**:
  ```json
  {
    "scripts": {
      "test": "node --test tests/**/*.test.mjs",
      "lint": "eslint src/",
      "install-local": "claude plugins install --local .",
      "export-context": "bash scripts/export-context.sh",
      "handoff": "bash scripts/handoff-to-opencode.sh",
      "server-pool:start": "bash scripts/start-server-pool.sh start",
      "server-pool:stop": "bash scripts/start-server-pool.sh stop",
      "server-pool:status": "bash scripts/start-server-pool.sh status",
      "server-pool:health": "bash scripts/start-server-pool.sh health"
    }
  }
  ```

  **Must NOT do**:
  - 기존 scripts 항목 수정/삭제
  - devDependencies나 다른 필드 변경

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON 파일에 4줄 추가
  - **Skills**: [`git-master`]
    - `git-master`: 원자적 커밋

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `package.json:21-27` - 기존 scripts 섹션. `"handoff"` 뒤에 추가
  - `scripts/start-server-pool.sh:695-737` - case문에서 지원하는 명령어 목록 (start|stop|status|restart|quiet|autoscale|rebalance|health)

  **Acceptance Criteria**:

  ```bash
  # 에이전트 실행:
  node -e "const p = require('/opt/oh-my-claude-money/package.json'); console.log(Object.keys(p.scripts).filter(k => k.startsWith('server-pool')).join(','))"
  # Assert: "server-pool:start,server-pool:stop,server-pool:status,server-pool:health"

  # JSON 유효성:
  node -e "JSON.parse(require('fs').readFileSync('/opt/oh-my-claude-money/package.json', 'utf-8')); console.log('valid')"
  # Assert: "valid" 출력
  ```

  **Commit**: YES
  - Message: `feat(dx): add server-pool npm scripts for start/stop/status/health`
  - Files: `package.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf-8'))"`

---

- [ ] 5. **전체 lsp_diagnostics 검증**

  **What to do**:
  - 수정된 모든 파일에 대해 lsp_diagnostics 실행
  - server-pool.mjs의 import chain 검증 (opencode-server-pool.mjs가 server-pool.mjs를 import)

  **Must NOT do**:
  - 새 코드 작성
  - 테스트 실패 시 다른 파일 수정 (리포트만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 도구 실행 + 결과 확인
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: Task 1, 2, 3, 4

  **References**:
  - `src/pool/server-pool.mjs` - Task 1에서 수정됨
  - `src/executor/opencode-server-pool.mjs:17` - `import { executeOnPool, discoverExistingServers, ServerPoolManager } from '../pool/server-pool.mjs';` (import chain 확인)

  **Acceptance Criteria**:

  ```bash
  # 에이전트가 lsp_diagnostics 도구 실행:
  # lsp_diagnostics("/opt/oh-my-claude-money/src/pool/server-pool.mjs", severity="error") → 0건
  # lsp_diagnostics("/opt/oh-my-claude-money/src/executor/opencode-server-pool.mjs", severity="error") → 0건

  # bash 문법 검사:
  bash -n /opt/oh-my-claude-money/install.sh && echo "install.sh OK"
  bash -n /opt/oh-my-claude-money/uninstall.sh && echo "uninstall.sh OK"
  # Assert: 둘 다 OK 출력
  ```

  **Commit**: NO (검증 단계)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(pool): unify pool state file path to ~/.omcm/server-pool/pool-state.json` | `src/pool/server-pool.mjs` | grep POOL_STATE_FILE |
| 2 | `feat(install): add server pool directory and state file initialization` | `install.sh` | `bash -n install.sh` |
| 3 | `feat(uninstall): stop server pool before removal (Step 0/7)` | `uninstall.sh` | `bash -n uninstall.sh` |
| 4 | `feat(dx): add server-pool npm scripts for start/stop/status/health` | `package.json` | `node -e "JSON.parse(...)"` |

---

## Success Criteria

### Verification Commands
```bash
# 1. server-pool.mjs 경로 통일 확인
grep 'server-pool/pool-state.json' src/pool/server-pool.mjs  # Expected: 존재

# 2. install.sh 함수 존재 확인
grep 'setup_server_pool' install.sh  # Expected: 함수 정의 + 호출

# 3. uninstall.sh Step 0 확인
grep '\[0/7\]' uninstall.sh  # Expected: 존재
grep 'start-server-pool.sh stop' uninstall.sh  # Expected: 존재

# 4. package.json scripts 확인
node -e "const p=require('./package.json');console.log(p.scripts['server-pool:start'])"
# Expected: "bash scripts/start-server-pool.sh start"

# 5. 문법/타입 에러 없음
bash -n install.sh && bash -n uninstall.sh && echo "All syntax OK"
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] lsp_diagnostics clean (0 errors)
- [ ] bash -n passes for both shell scripts
- [ ] package.json is valid JSON
