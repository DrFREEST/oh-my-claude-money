# Context Limit Recovery System 구현 계획

## TL;DR

> **요약**: 병렬/하이브리드 실행 중 컨텍스트 한도 오류를 감지하고, 2단계 복구(컨텍스트 축소 → 작업 분할)를 시도하며, 부분 결과를 `.omcm/state/context-recovery/{taskId}.json`에 저장하는 시스템.
>
> **산출물**:
> - `src/orchestrator/context-limit-recovery.mjs` (신규 모듈)
> - `src/orchestrator/parallel-executor.mjs` (통합)
> - `src/orchestrator/hybrid-ultrawork.mjs` (통합)
> - `src/orchestrator/opencode-worker.mjs` (통합)
> - `src/orchestrator/index.mjs` (export 추가)
> - `skills/hulw/SKILL.md` (문서 갱신)
> - `skills/ulw/SKILL.md` (문서 갱신)
>
> **예상 규모**: Medium
> **병렬 실행**: YES - 4 waves
> **크리티컬 패스**: Task 1 → Task 2/3/4/5 → Task 6 → Task 7

---

## Context

### 원본 요청

OMCM의 병렬 실행기(ParallelExecutor), 하이브리드 울트라워크(HybridUltrawork), OpenCode 워커(OpenCodeWorker)에서 컨텍스트 한도 오류 발생 시 자동 복구하는 시스템 구현.

### Metis 리뷰 반영

**식별된 갭 (해결됨)**:
- 실제 오류 문자열 확인 필요 → 패턴을 정규식 기반으로 유연하게 설계
- Phase 2 분할 전략 미정 → "프롬프트 50% 줄바꿈 기준 절단" 전략으로 확정
- 상태 파일 경로 패턴 → `getStateDir()` + `context-recovery/` 사용 (project-root.mjs 패턴)
- 워커 풀 내 복구 시 슬롯 차지 → 허용된 동작으로 문서화
- 상태 파일 무한 축적 → 24시간 TTL 정리 로직 포함
- optional chaining 정정 → `parallel-executor.mjs`에서만 금지, 다른 파일은 기존 사용 현황 유지

**가드레일 (Metis 권고)**:
- 기존 함수 시그니처 변경 금지
- `_executeWithPool` 수정 금지 — 복구는 `executeTask` 내에서만
- 범용 재시도 라이브러리 만들지 않음 — 컨텍스트 한도 전용
- 콜백/메트릭/텔레메트리 추가 금지
- optional chaining은 `parallel-executor.mjs`에서만 금지

---

## Work Objectives

### 핵심 목표
컨텍스트 한도 오류 발생 시 자동 2단계 복구로 작업 성공률을 높이고, 복구 불가 시 부분 결과를 보존한다.

### 구체적 산출물
1. `src/orchestrator/context-limit-recovery.mjs` — 감지 + 복구 + 상태 저장 모듈
2. `ParallelExecutor.executeTask` 통합 — 복구 래핑
3. `HybridUltrawork.executeplan` 통합 — 개별 작업 catch 블록에 복구 삽입
4. `OpenCodeWorker.execute` 통합 — 복구 래핑
5. `src/orchestrator/index.mjs` — 새 모듈 export 추가
6. `skills/hulw/SKILL.md` / `skills/ulw/SKILL.md` — 감지+복구 흐름 문서화

### 완료 정의
- [ ] 모든 수정 파일 `node --check` 통과
- [ ] `npm test` 361+ 테스트 전체 통과
- [ ] `import('./src/orchestrator/context-limit-recovery.mjs')` 성공
- [ ] `new ParallelExecutor({ contextLimitRecovery: true })` 생성 성공
- [ ] `import('./src/orchestrator/index.mjs')` 순환참조 없이 성공

### Must Have
- 2단계 복구 (컨텍스트 축소 → 작업 분할)
- 최대 2회 재시도
- 3종 감지 패턴 ('Context limit reached', 'context window exceeded', 타임아웃+부분출력)
- `.omcm/state/context-recovery/{taskId}.json` 상태 파일 저장
- `contextLimitRecovery` 옵션 (ParallelExecutor 생성자)
- 코드 스타일 준수 (parallel-executor: var, 나머지: const/let + arrow)
- 모든 주석 한국어

### Must NOT Have (가드레일)
- 기존 함수 시그니처 변경
- `_executeWithPool` 메서드 수정
- optional chaining in `parallel-executor.mjs`
- 범용 재시도/백오프 라이브러리
- 콜백/메트릭/텔레메트리 추가
- 지수 백오프 (즉시 재시도)
- 설정 가능한 오류 패턴 (하드코딩)
- 컨텍스트 한도 외 다른 오류 유형 복구
- 기존 에러 처리 흐름 구조 변경 (래핑만)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (npm test, 361+ 테스트)
- **User wants tests**: NO (명시적으로 "Do not implement code")
- **QA approach**: 자동화 검증 (node --check, npm test, import 확인)

### 자동화 검증 (구현 후)

```bash
# 1. 문법 검증
node --check src/orchestrator/context-limit-recovery.mjs
node --check src/orchestrator/parallel-executor.mjs
node --check src/orchestrator/hybrid-ultrawork.mjs
node --check src/orchestrator/opencode-worker.mjs

# 2. 모듈 로드 검증
node -e "import('./src/orchestrator/context-limit-recovery.mjs').then(m => console.log(Object.keys(m)))"

# 3. 순환참조 검증
node -e "import('./src/orchestrator/index.mjs').then(() => console.log('OK'))"

# 4. 생성자 옵션 검증
node -e "import('./src/orchestrator/parallel-executor.mjs').then(m => { const pe = new m.ParallelExecutor({ contextLimitRecovery: true }); console.log('OK'); })"

# 5. 감지 함수 검증
node -e "
import('./src/orchestrator/context-limit-recovery.mjs').then(m => {
  console.log(m.isContextLimitError(new Error('Context limit reached')));
  console.log(m.isContextLimitError(new Error('random error')));
  console.log(m.isContextLimitError(new Error('context window exceeded')));
});
"
# 기대: true, false, true

# 6. 기존 테스트 통과
npm test
```

---

## 새 파일 구조 & Export

### `src/orchestrator/context-limit-recovery.mjs`

```
/**
 * context-limit-recovery.mjs - 컨텍스트 한도 오류 복구
 *
 * 병렬/하이브리드 실행 중 컨텍스트 한도 초과 시
 * 2단계 복구를 수행합니다:
 *   Phase 1: 컨텍스트 축소 후 재시도
 *   Phase 2: 작업 분할 후 재시도
 */
```

**Import**:
```javascript
import { existsSync, writeFileSync, readFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { ensureStateDir } from '../utils/project-root.mjs';
```

**Export 목록**:

| Export | 타입 | 설명 |
|--------|------|------|
| `isContextLimitError(error)` | function | 오류가 컨텍스트 한도 관련인지 판별 |
| `isTimeoutWithPartialOutput(result)` | function | 타임아웃이면서 부분 출력이 있는지 판별 |
| `attemptContextRecovery(task, error, executeFn, options)` | async function | 2단계 복구 시도 |
| `reduceTaskContext(task)` | function | Phase 1: 작업 컨텍스트 축소 |
| `splitTask(task)` | function | Phase 2: 작업 분할 (프롬프트 50% 절단) |
| `saveRecoveryState(taskId, state)` | function | 복구 상태 저장 |
| `loadRecoveryState(taskId)` | function | 복구 상태 로드 |
| `cleanupStaleStates(maxAgeMs)` | function | 만료된 상태 파일 정리 |
| `CONTEXT_LIMIT_PATTERNS` | const Array | 감지 패턴 목록 |
| `MAX_RECOVERY_RETRIES` | const number | 최대 재시도 횟수 (2) |

---

## 함수 시그니처 상세

### `isContextLimitError(error)`
```javascript
/**
 * 컨텍스트 한도 오류 여부 판별
 *
 * @param {Error|Object} error - 오류 객체 또는 { message: string }
 * @returns {boolean} 컨텍스트 한도 오류이면 true
 */
```
**로직**: `error.message`를 `CONTEXT_LIMIT_PATTERNS` 배열의 각 정규식과 매칭. 하나라도 일치하면 `true`.

**패턴 목록**:
```javascript
const CONTEXT_LIMIT_PATTERNS = [
  /context limit reached/i,
  /context window exceeded/i,
  /maximum context length/i,
  /token limit exceeded/i
];
```

### `isTimeoutWithPartialOutput(result)`
```javascript
/**
 * 타임아웃 + 부분 출력 감지
 *
 * @param {Object} result - 실행 결과 { success, error, output }
 * @returns {boolean} 타임아웃이면서 부분 출력이 있으면 true
 */
```
**로직**: `result.success === false` && `result.error`에 'timeout' 포함 && `result.output`이 truthy이고 길이 > 0.

### `attemptContextRecovery(task, error, executeFn, options)`
```javascript
/**
 * 2단계 컨텍스트 복구 시도
 *
 * Phase 1: 컨텍스트 축소 후 executeFn으로 재실행
 * Phase 2: 작업 분할 후 executeFn으로 재실행
 *
 * @param {Object} task - 원본 작업 { id, prompt, type, context, files, ... }
 * @param {Error} error - 발생한 오류
 * @param {Function} executeFn - 재실행 함수 (async, task를 받아 result 반환)
 * @param {Object} options - 옵션
 * @param {string} [options.taskId] - 작업 ID (상태 저장용, 없으면 자동 생성)
 * @param {boolean} [options.saveState=true] - 상태 저장 여부
 * @returns {Promise<Object>} { recovered: boolean, result, phase, retries, partialResults }
 */
```
**로직**:
1. `taskId` 결정 (`options.taskId` || `task.id` || `randomUUID().slice(0, 8)`)
2. Phase 1 시도: `reduceTaskContext(task)` → `executeFn(reducedTask)` → 성공 시 반환
3. Phase 1 실패 시 Phase 2: `splitTask(task)` → `executeFn(splitTask)` → 성공 시 반환
4. 양쪽 실패 시 `{ recovered: false, partialResults }` 반환
5. 각 단계에서 `saveRecoveryState()` 호출

### `reduceTaskContext(task)`
```javascript
/**
 * Phase 1: 작업 컨텍스트 축소
 *
 * task.prompt의 컨텍스트 부분을 50%로 절단하고
 * task.context가 있으면 제거합니다.
 *
 * @param {Object} task - 원본 작업
 * @returns {Object} 축소된 작업 (새 객체, 원본 불변)
 */
```
**로직**:
1. task를 얕은 복사 (`Object.assign({}, task)`)
2. `task.context`가 있으면 제거 (빈 문자열)
3. `task.prompt` 길이가 2000자 초과면 앞 50%만 유지 + "\n\n(컨텍스트 축소됨)" 추가
4. `task._recoveryPhase = 1` 표시

### `splitTask(task)`
```javascript
/**
 * Phase 2: 작업 분할 (프롬프트 절단 방식)
 *
 * 프롬프트를 50% 지점에서 절단하여 핵심 지시만 남깁니다.
 * 줄바꿈 기준으로 절단하여 문장 중간 절단을 방지합니다.
 *
 * @param {Object} task - 원본 작업
 * @returns {Object} 분할된 작업 (새 객체, 원본 불변)
 */
```
**로직**:
1. task를 얕은 복사
2. prompt를 줄바꿈(`\n`)으로 분리
3. 전체 줄 수의 50% 지점까지만 유지
4. `task._recoveryPhase = 2` 표시
5. context, files 모두 제거

### `saveRecoveryState(taskId, state)`
```javascript
/**
 * 복구 상태 파일 저장
 *
 * @param {string} taskId - 작업 ID
 * @param {Object} state - 저장할 상태
 * @returns {string} 저장된 파일 경로
 */
```
**로직**: `ensureStateDir()` + `context-recovery/` 디렉토리 생성 → JSON.stringify(state, null, 2) → writeFileSync.

### `loadRecoveryState(taskId)`
```javascript
/**
 * 복구 상태 파일 로드
 *
 * @param {string} taskId - 작업 ID
 * @returns {Object|null} 상태 객체 또는 null
 */
```

### `cleanupStaleStates(maxAgeMs)`
```javascript
/**
 * 만료된 복구 상태 파일 정리
 *
 * @param {number} [maxAgeMs=86400000] - 최대 보존 기간 (기본: 24시간)
 * @returns {number} 삭제된 파일 수
 */
```

---

## 상태 파일 형식

**경로**: `.omcm/state/context-recovery/{taskId}.json`

```json
{
  "taskId": "abc12345",
  "originalTask": {
    "id": "task-1",
    "prompt": "원본 프롬프트 (처음 500자)...",
    "type": "executor",
    "hasContext": true,
    "hasFiles": true,
    "promptLength": 15000
  },
  "error": {
    "message": "Context limit reached",
    "pattern": "context limit reached"
  },
  "recovery": {
    "phase1": {
      "attempted": true,
      "success": false,
      "reducedPromptLength": 7500,
      "error": "context window exceeded"
    },
    "phase2": {
      "attempted": true,
      "success": true,
      "splitPromptLength": 3750,
      "result": { "success": true, "output": "..." }
    }
  },
  "recovered": true,
  "finalPhase": 2,
  "totalRetries": 2,
  "partialResults": [],
  "timestamps": {
    "started": "2026-01-30T12:00:00.000Z",
    "phase1Start": "2026-01-30T12:00:01.000Z",
    "phase1End": "2026-01-30T12:01:00.000Z",
    "phase2Start": "2026-01-30T12:01:01.000Z",
    "phase2End": "2026-01-30T12:02:00.000Z",
    "completed": "2026-01-30T12:02:00.000Z"
  }
}
```

---

## 복구 흐름도

```
작업 실행 시도
     │
     ▼
 ┌────────┐
 │ 실행   │
 └──┬─────┘
    │
    ▼
 성공? ──YES──▶ 정상 결과 반환
    │
   NO (오류 발생)
    │
    ▼
 ┌──────────────────────┐
 │ isContextLimitError() │
 │ 또는                   │
 │ isTimeoutWithPartial() │
 └──┬───────────────────┘
    │
    ▼
 컨텍스트 한도 오류? ──NO──▶ 기존 에러 처리 흐름 (변경 없음)
    │
   YES
    │
    ▼
 contextLimitRecovery 활성화? ──NO──▶ 기존 에러 처리 흐름
    │
   YES
    │
    ▼
 ┌─────────────────────────┐
 │ Phase 1: 컨텍스트 축소   │
 │ reduceTaskContext(task)  │
 │ → executeFn(reducedTask) │
 └──┬──────────────────────┘
    │
    ▼
 성공? ──YES──▶ 복구 결과 반환 (phase=1)
    │                    ↓
   NO               saveRecoveryState()
    │
    ▼
 ┌─────────────────────────┐
 │ Phase 2: 작업 분할       │
 │ splitTask(task)          │
 │ → executeFn(splitTask)   │
 └──┬──────────────────────┘
    │
    ▼
 성공? ──YES──▶ 복구 결과 반환 (phase=2)
    │                    ↓
   NO               saveRecoveryState()
    │
    ▼
 복구 실패 → saveRecoveryState()
           → 기존 에러 처리 흐름 계속
           → 부분 결과 보존
```

---

## 통합 포인트 상세 (줄 번호 포함)

### 통합 1: `parallel-executor.mjs` — `constructor` (L131-157)

**변경**: `contextLimitRecovery` 옵션 수용

```javascript
// 기존 코드 (L132-136)
options = options || {};
this.maxWorkers = options.maxWorkers || 3;
this.autoRoute = options.autoRoute !== false;
this.enableServer = options.enableServer !== false;

// 추가할 코드 (L136 뒤)
this.contextLimitRecovery = options.contextLimitRecovery || false;
```

**스타일**: optional chaining 금지. 프로퍼티 할당.

### 통합 2: `parallel-executor.mjs` — `executeTask` (L395-442)

**변경**: catch 블록(L424-441)에서 컨텍스트 한도 오류 감지 시 복구 시도

**Import 추가 위치**: L11 뒤
```javascript
import { isContextLimitError, attemptContextRecovery } from './context-limit-recovery.mjs';
```

**현재 코드** (L424-441):
```javascript
    } catch (err) {
      // 실패 처리
      this.status.failed++;
      var errorResult = {
        success: false,
        error: err.message,
        task: task
      };
      this.errors.push(errorResult);
      if (this.onError) {
        this.onError(task, err);
      }
      throw err;
    }
```

**변경 후** (var 스타일, function 키워드, optional chaining 금지):
```javascript
    } catch (err) {
      // 컨텍스트 한도 복구 시도
      if (this.contextLimitRecovery && isContextLimitError(err)) {
        var self = this;
        try {
          var recoveryResult = await attemptContextRecovery(
            task,
            err,
            function(reducedTask) {
              return self._executeOpenCodeTask(
                reducedTask,
                routeTask(reducedTask.type || 'executor')
              );
            },
            { taskId: task.id }
          );
          if (recoveryResult.recovered) {
            self.status.completed++;
            self.results.push(recoveryResult.result);
            if (self.onTaskComplete) {
              self.onTaskComplete(task, recoveryResult.result);
            }
            return recoveryResult.result;
          }
        } catch (recoveryErr) {
          // 복구 자체가 실패 — 원래 에러 처리로 계속
        }
      }

      // 실패 처리 (기존 코드 그대로)
      this.status.failed++;
      var errorResult = {
        success: false,
        error: err.message,
        task: task
      };
      this.errors.push(errorResult);
      if (this.onError) {
        this.onError(task, err);
      }
      throw err;
    }
```

**주의**: `routing` 변수(L403)는 catch 밖에서 선언되므로 catch 내에서 `routeTask()` 재호출.

### 통합 3: `hybrid-ultrawork.mjs` — `executeplan` (L78-168)

**Import 추가 위치**: L11 뒤
```javascript
import { isContextLimitError, attemptContextRecovery } from './context-limit-recovery.mjs';
```

**변경 위치 A**: Claude 작업 catch 블록 (L98-101)

현재:
```javascript
          } catch (error) {
            results.errors.push({ task, error: error.message });
            return { success: false, task, error: error.message };
          }
```

변경 후 (const/let + arrow 허용):
```javascript
          } catch (error) {
            // 컨텍스트 한도 복구 시도
            if (isContextLimitError(error)) {
              try {
                const recoveryResult = await attemptContextRecovery(
                  task,
                  error,
                  (reducedTask) => claudeExecutor(reducedTask),
                  { taskId: task.id || `claude-${Date.now()}` }
                );
                if (recoveryResult.recovered) {
                  this.stats.claudeTasks++;
                  return { success: true, task, result: recoveryResult.result };
                }
              } catch (recoveryErr) {
                // 복구 실패 — 기존 에러 처리로 계속
              }
            }
            // 기존 코드 유지
            results.errors.push({ task, error: error.message });
            return { success: false, task, error: error.message };
          }
```

**변경 위치 B**: OpenCode 작업 catch 블록 (L122-128)

현재:
```javascript
          } catch (error) {
            return distribution.opencodeTasks.map((task) => ({
              success: false,
              task,
              error: error.message,
            }));
          }
```

변경 후 (배치 레벨 복구는 불가하므로, 감지 플래그만 추가):
```javascript
          } catch (error) {
            // 배치 실패 — 개별 재시도 불가, 감지 플래그 추가
            return distribution.opencodeTasks.map((task) => ({
              success: false,
              task,
              error: error.message,
              contextLimitError: isContextLimitError(error),
            }));
          }
```

### 통합 4: `opencode-worker.mjs` — `OpenCodeWorker.execute` (L45-103)

**Import 추가 위치**: L11 뒤
```javascript
import { isContextLimitError, attemptContextRecovery } from './context-limit-recovery.mjs';
```

**변경**: catch 블록(L84-94)에서 복구 시도

현재 (L84-94):
```javascript
    } catch (error) {
      this.status = 'failed';
      this.error = error.message;
      this.endTime = Date.now();

      return {
        success: false,
        workerId: this.id,
        error: error.message,
        duration: this.endTime - this.startTime,
      };
    }
```

변경 후 (const/let + arrow 허용):
```javascript
    } catch (error) {
      // 컨텍스트 한도 복구 시도
      if (isContextLimitError(error)) {
        try {
          const recoveryResult = await attemptContextRecovery(
            { prompt, id: this.id },
            error,
            async (reducedTask) => {
              const retryArgs = ['-c', this.projectDir, '-p', reducedTask.prompt];
              if (this.quiet) {
                retryArgs.push('-q');
              }
              const retryOutputFile = join(WORK_DIR, `${this.id}-retry-output.txt`);
              const retryOutput = await this._runOpenCode(retryArgs, retryOutputFile);
              return { success: true, output: retryOutput };
            },
            { taskId: this.id }
          );
          if (recoveryResult.recovered) {
            this.status = 'completed';
            this.result = recoveryResult.result.output;
            this.endTime = Date.now();
            return {
              success: true,
              workerId: this.id,
              output: recoveryResult.result.output,
              duration: this.endTime - this.startTime,
              recovered: true,
            };
          }
        } catch (recoveryErr) {
          // 복구 실패 — 기존 에러 처리로 계속
        }
      }

      // 기존 실패 처리 (변경 없음)
      this.status = 'failed';
      this.error = error.message;
      this.endTime = Date.now();
      return {
        success: false,
        workerId: this.id,
        error: error.message,
        duration: this.endTime - this.startTime,
      };
    }
```

**추가 변경**: `_runOpenCode` 타임아웃 reject (L140-145)에 `partialOutput` 속성 추가

현재:
```javascript
      setTimeout(() => {
        try {
          proc.kill('SIGTERM');
        } catch {}
        reject(new Error(`OpenCode timeout after ${this.timeout}ms`));
      }, this.timeout);
```

변경 후:
```javascript
      setTimeout(() => {
        try {
          proc.kill('SIGTERM');
        } catch {}
        const timeoutError = new Error(`OpenCode timeout after ${this.timeout}ms`);
        timeoutError.partialOutput = stdout;
        reject(timeoutError);
      }, this.timeout);
```

### 통합 5: `src/orchestrator/index.mjs`

**추가 위치**: L21 뒤 (파일 끝)
```javascript

// 컨텍스트 한도 복구
export * from './context-limit-recovery.mjs';
```

---

## SKILL.md 갱신 내용

### `skills/hulw/SKILL.md` — 추가 섹션 (L108 뒤, 파일 끝 전)

```markdown

## 컨텍스트 한도 오류 감지 및 복구

hulw 병렬 실행 중 컨텍스트 한도 오류가 발생하면 자동으로 2단계 복구를 시도합니다:

### 감지 패턴
- `Context limit reached`
- `context window exceeded`
- `maximum context length`
- `token limit exceeded`
- 타임아웃 + 부분 출력 (timeout with partial output)

### 복구 흐름
1. **Phase 1 - 컨텍스트 축소**: 부가 컨텍스트 제거, 프롬프트 50% 절단 후 재시도
2. **Phase 2 - 작업 분할**: 프롬프트를 핵심 지시만 남기고 재시도
3. **복구 실패**: 부분 결과를 `.omcm/state/context-recovery/` 에 저장

### 재시도 제한
- 최대 2회 (Phase 1 + Phase 2 각 1회)
- 즉시 재시도 (대기 없음)
- 복구 상태는 `.omcm/state/context-recovery/{taskId}.json`에 저장
```

### `skills/ulw/SKILL.md` — 동일 섹션 추가 (L93 뒤, 파일 끝 전)

(hulw와 동일한 내용)

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | 독립 모듈, 다른 파일에 의존하지 않음 |
| Task 2 | Task 1 | context-limit-recovery.mjs를 import |
| Task 3 | Task 1 | context-limit-recovery.mjs를 import |
| Task 4 | Task 1 | context-limit-recovery.mjs를 import |
| Task 5 | Task 1 | 새 모듈 export 추가 |
| Task 6 | Task 2, 3, 4, 5 | 통합 완료 후 문서화 |
| Task 7 | Task 1-6 | 전체 검증 |

## Parallel Execution Graph

```
Wave 1 (즉시 시작):
└── Task 1: context-limit-recovery.mjs 신규 모듈 생성

Wave 2 (Wave 1 완료 후):
├── Task 2: parallel-executor.mjs 통합
├── Task 3: hybrid-ultrawork.mjs 통합
├── Task 4: opencode-worker.mjs + index.mjs 통합
└── Task 5: index.mjs export 추가

Wave 3 (Wave 2 완료 후):
└── Task 6: SKILL.md 갱신 (hulw + ulw)

Wave 4 (Wave 3 완료 후):
└── Task 7: 전체 검증

Critical Path: Task 1 → Task 2 → Task 7
Parallel Speedup: ~30% (Wave 2에서 4개 병렬)
```

### Agent Dispatch Summary

| Wave | Tasks | Recommended Dispatch |
|------|-------|---------------------|
| 1 | Task 1 | `delegate_task(category="unspecified-low", load_skills=["typescript-programmer"])` |
| 2 | Tasks 2-5 | 4x `delegate_task(category="quick", load_skills=["typescript-programmer"], run_in_background=true)` |
| 3 | Task 6 | `delegate_task(category="writing", load_skills=[])` |
| 4 | Task 7 | `delegate_task(category="quick", load_skills=["typescript-programmer"])` |

---

## TODOs

- [ ] 1. `src/orchestrator/context-limit-recovery.mjs` 신규 모듈 생성

  **What to do**:
  - 위 "함수 시그니처 상세" 섹션의 모든 함수 구현 (10개 export)
  - `CONTEXT_LIMIT_PATTERNS` 정규식 배열 정의
  - `MAX_RECOVERY_RETRIES = 2` 상수 정의
  - `ensureStateDir()` + `context-recovery/` 경로로 상태 저장/로드
  - `cleanupStaleStates()` 구현 (24시간 TTL)
  - import: `{ existsSync, writeFileSync, readFileSync, mkdirSync, readdirSync, unlinkSync, statSync }` from `'fs'`, `{ join }` from `'path'`, `{ randomUUID }` from `'crypto'`, `{ ensureStateDir }` from `'../utils/project-root.mjs'`

  **스타일**: `const/let` + arrow functions. 주석 전부 한국어. optional chaining 사용 가능하되 보수적으로.

  **Must NOT do**:
  - 범용 재시도 라이브러리 만들지 않음
  - 지수 백오프 없음
  - 콜백/메트릭 없음
  - 실행기(parallel-executor 등)로부터 import 금지 (단방향: 실행기→복구)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 새 모듈 생성이지만 로직이 단순하고 패턴이 명확
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: JS/MJS 파일 작성에 적합한 코드 작성 능력

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: UI 관련 아님
  - `git-master`: 커밋 단계 아님

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (단독)
  - **Blocks**: Task 2, 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/orchestrator/fallback-orchestrator.mjs:59-94` — loadState/saveState JSON 패턴 (mkdirSync recursive, writeFileSync, readFileSync)
  - `src/orchestrator/fallback-orchestrator.mjs:74-82` — getDefaultState() 기본 상태 객체 패턴
  - `src/utils/project-root.mjs:189-222` — `getStateDir()`, `ensureStateDir()` 사용법

  **API/Type References**:
  - `src/utils/context.mjs:262-275` — `truncateContext()` 절단 로직 참조 (context 길이 제한 패턴)

  **Import 패턴 References**:
  - `src/orchestrator/opencode-worker.mjs:7-11` — fs, path, crypto import 패턴

  **WHY Each Reference Matters**:
  - `fallback-orchestrator.mjs:59-94`: 상태 파일 저장/로드의 정확한 패턴 (existsSync 체크 → mkdirSync → writeFileSync)
  - `project-root.mjs:189-222`: `.omcm/state/` 기본 경로 결정 로직 — 이 위에 `context-recovery/` 하위 디렉토리 생성
  - `context.mjs:262-275`: 컨텍스트 절단 시 헤더 추가 + 나머지 슬라이스 패턴

  **Acceptance Criteria**:
  ```bash
  node --check src/orchestrator/context-limit-recovery.mjs
  # Exit 0

  node -e "import('./src/orchestrator/context-limit-recovery.mjs').then(m => {
    const keys = Object.keys(m);
    console.log('exports:', keys.length >= 8 ? 'OK' : 'FAIL');
    console.log('detect:', m.isContextLimitError(new Error('Context limit reached')) === true ? 'OK' : 'FAIL');
    console.log('negative:', m.isContextLimitError(new Error('random')) === false ? 'OK' : 'FAIL');
    console.log('timeout:', m.isTimeoutWithPartialOutput({success:false, error:'timeout', output:'partial'}) === true ? 'OK' : 'FAIL');
  })"
  # All OK
  ```

  **Commit**: YES
  - Message: `feat(orchestrator): 컨텍스트 한도 복구 모듈 추가`
  - Files: `src/orchestrator/context-limit-recovery.mjs`
  - Pre-commit: `node --check src/orchestrator/context-limit-recovery.mjs`

---

- [ ] 2. `src/orchestrator/parallel-executor.mjs` 통합

  **What to do**:
  - L11 뒤에 import 추가: `import { isContextLimitError, attemptContextRecovery } from './context-limit-recovery.mjs';`
  - L136 뒤에 `this.contextLimitRecovery = options.contextLimitRecovery || false;` 추가
  - L424-441 catch 블록에서 위 "통합 2" 섹션대로 복구 로직 삽입
  - 복구 성공 시 `this.status.completed++`, `this.results.push()`, `onTaskComplete` 콜백 호출 후 정상 반환
  - 복구 실패 시 기존 에러 흐름 유지 (변경 없음)

  **스타일**: `var` 사용. `function(){}` 사용 (arrow 금지). optional chaining 금지. 주석 한국어.

  **Must NOT do**:
  - `_executeWithPool` 수정 금지
  - 기존 함수 시그니처 변경 금지
  - `const/let` 사용 금지 (이 파일에서)
  - arrow function 사용 금지 (이 파일에서)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 파일에 소량 추가
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3, 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `src/orchestrator/parallel-executor.mjs:131-157` — constructor (L136에 프로퍼티 추가 지점)
  - `src/orchestrator/parallel-executor.mjs:395-442` — executeTask catch 블록 (L424가 통합 지점)
  - `src/orchestrator/parallel-executor.mjs:8-11` — import 영역
  - `src/orchestrator/parallel-executor.mjs:510-556` — `_executeWithPool`의 `var self = this` + `function(){}` 패턴 참조
  - `src/orchestrator/parallel-executor.mjs:23-49` — `checkFileConflicts`의 var 스타일 for 루프 참조

  **WHY Each Reference Matters**:
  - L131-157: 정확한 프로퍼티 삽입 위치 (L136 뒤)
  - L395-442: catch 블록 래핑의 정확한 위치와 기존 변수 (`err`, `errorResult`)
  - L510-556: `var self = this` 패턴 — 이 파일에서 `this` 접근 시 필수 패턴

  **Acceptance Criteria**:
  ```bash
  node --check src/orchestrator/parallel-executor.mjs
  # Exit 0

  node -e "import('./src/orchestrator/parallel-executor.mjs').then(m => {
    var pe = new m.ParallelExecutor({ contextLimitRecovery: true });
    console.log('opt:', pe.contextLimitRecovery === true ? 'OK' : 'FAIL');
    var pe2 = new m.ParallelExecutor({});
    console.log('default:', pe2.contextLimitRecovery === false ? 'OK' : 'FAIL');
  })"
  # All OK
  ```

  **Commit**: YES (group with Task 3, 4, 5)
  - Message: `feat(orchestrator): 컨텍스트 한도 복구를 ParallelExecutor에 통합`
  - Files: `src/orchestrator/parallel-executor.mjs`
  - Pre-commit: `node --check src/orchestrator/parallel-executor.mjs`

---

- [ ] 3. `src/orchestrator/hybrid-ultrawork.mjs` 통합

  **What to do**:
  - L11 뒤에 import 추가: `import { isContextLimitError, attemptContextRecovery } from './context-limit-recovery.mjs';`
  - L98-101 Claude 작업 catch 블록에 복구 로직 삽입 (위 "통합 3 변경 위치 A" 참조)
  - L122-128 OpenCode 배치 catch 블록에 감지 플래그 추가 (위 "통합 3 변경 위치 B" 참조)

  **스타일**: `const/let` + arrow functions. 주석 한국어.

  **Must NOT do**:
  - `executeplan` 함수 시그니처 변경 금지
  - Promise.allSettled 패턴 변경 금지
  - OpenCode 배치 경로에 개별 복구 시도 금지 (배치는 개별 재시도 불가)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 catch 블록에 조건부 래핑 추가
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2, 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `src/orchestrator/hybrid-ultrawork.mjs:8-11` — import 영역
  - `src/orchestrator/hybrid-ultrawork.mjs:91-103` — Claude 작업 IIFE + catch (L98이 통합 지점 A)
  - `src/orchestrator/hybrid-ultrawork.mjs:107-131` — OpenCode 배치 + catch (L122가 통합 지점 B)
  - `src/orchestrator/hybrid-ultrawork.mjs:78-168` — executeplan 전체 흐름 이해

  **WHY Each Reference Matters**:
  - L91-103: Claude 작업의 async IIFE 패턴 안에서 recovery 호출이 가능한 위치 확인
  - L107-131: OpenCode 배치는 submitBatch로 여러 작업을 한꺼번에 보내므로 개별 복구 불가 — 플래그만 추가

  **Acceptance Criteria**:
  ```bash
  node --check src/orchestrator/hybrid-ultrawork.mjs
  # Exit 0

  grep -q "isContextLimitError" src/orchestrator/hybrid-ultrawork.mjs
  # Exit 0 (import + 사용 존재)
  ```

  **Commit**: YES (group with Task 2, 4, 5)
  - Message: `feat(orchestrator): 컨텍스트 한도 복구를 HybridUltrawork에 통합`
  - Files: `src/orchestrator/hybrid-ultrawork.mjs`
  - Pre-commit: `node --check src/orchestrator/hybrid-ultrawork.mjs`

---

- [ ] 4. `src/orchestrator/opencode-worker.mjs` 통합 + `index.mjs` export

  **What to do**:
  - **opencode-worker.mjs**:
    - L11 뒤에 import 추가: `import { isContextLimitError, attemptContextRecovery } from './context-limit-recovery.mjs';`
    - L84-94 execute() catch 블록에 복구 로직 삽입 (위 "통합 4" 참조)
    - L140-145 `_runOpenCode` 타임아웃 reject에 `partialOutput` 속성 추가
  - **index.mjs**:
    - L21 뒤에 추가: `// 컨텍스트 한도 복구` + `export * from './context-limit-recovery.mjs';`

  **스타일**: `const/let` + arrow functions. 주석 한국어.

  **Must NOT do**:
  - `execute()` 함수 시그니처 변경 금지
  - `_runOpenCode()` 시그니처 변경 금지
  - `OpenCodeWorkerPool` 수정 금지
  - `submitBatch` 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 catch 블록 래핑 + 타임아웃 에러 속성 추가 + 1줄 export
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2, 3, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `src/orchestrator/opencode-worker.mjs:7-11` — import 영역
  - `src/orchestrator/opencode-worker.mjs:45-103` — execute() 메서드 (L84가 통합 지점)
  - `src/orchestrator/opencode-worker.mjs:108-147` — _runOpenCode() (L140-145가 타임아웃 수정 지점)
  - `src/orchestrator/opencode-worker.mjs:19` — WORK_DIR 경로 (재시도 시 임시파일 경로)
  - `src/orchestrator/opencode-worker.mjs:25-37` — constructor 패턴 (복구 시 새 워커 생성 참조)
  - `src/orchestrator/index.mjs:1-22` — 전체 파일 (L21이 추가 지점)

  **WHY Each Reference Matters**:
  - L45-103: catch 블록에서 새 워커를 생성하여 재시도하는 패턴 — 실패한 워커 재사용 금지
  - L108-147: 타임아웃 시 `stdout` 변수에 부분 출력이 축적되어 있으므로 `timeoutError.partialOutput = stdout` 가능
  - L19: WORK_DIR — 재시도 시 임시 파일 경로 구성에 필요
  - index.mjs: append-only, 기존 export 순서 변경 금지

  **Acceptance Criteria**:
  ```bash
  node --check src/orchestrator/opencode-worker.mjs
  # Exit 0

  node -e "import('./src/orchestrator/index.mjs').then(() => console.log('OK'))"
  # OK (순환참조 없음)

  grep -q "context-limit-recovery" src/orchestrator/index.mjs
  # Exit 0
  ```

  **Commit**: YES (group with Task 2, 3)
  - Message: `feat(orchestrator): 컨텍스트 한도 복구를 OpenCodeWorker에 통합`
  - Files: `src/orchestrator/opencode-worker.mjs`, `src/orchestrator/index.mjs`
  - Pre-commit: `node --check src/orchestrator/opencode-worker.mjs`

---

- [ ] 5. (Task 4에 통합됨 — index.mjs export는 Task 4에서 처리)

  **Status**: Task 4에 병합. 별도 실행 불필요.

---

- [ ] 6. SKILL.md 갱신

  **What to do**:
  - `skills/hulw/SKILL.md` L108 뒤에 "컨텍스트 한도 오류 감지 및 복구" 섹션 추가 (위 내용 참조)
  - `skills/ulw/SKILL.md` L93 뒤에 동일 섹션 추가

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 문서 작성 작업
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (단독)
  - **Blocks**: Task 7
  - **Blocked By**: Task 2, 3, 4

  **References**:
  - `skills/hulw/SKILL.md:108-113` — 마지막 섹션 (추가 지점)
  - `skills/ulw/SKILL.md:93-94` — 마지막 줄 (추가 지점)

  **Acceptance Criteria**:
  ```bash
  grep -c '컨텍스트 한도' skills/hulw/SKILL.md
  # >= 1

  grep -c '컨텍스트 한도' skills/ulw/SKILL.md
  # >= 1

  grep -c 'Phase 1' skills/hulw/SKILL.md
  # >= 1
  ```

  **Commit**: YES
  - Message: `docs(skills): hulw/ulw SKILL.md에 컨텍스트 한도 복구 흐름 추가`
  - Files: `skills/hulw/SKILL.md`, `skills/ulw/SKILL.md`

---

- [ ] 7. 전체 검증

  **What to do**:
  - 모든 수정 파일 `node --check` 실행
  - `npm test` 전체 테스트 통과 확인
  - 모듈 import 확인 (순환참조 없음)
  - ParallelExecutor 생성자 옵션 확인
  - 감지 함수 동작 확인
  - 스타일 준수 확인

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript-programmer`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (최종)
  - **Blocks**: None
  - **Blocked By**: Task 1-6

  **References**:
  - 위 "Verification Strategy" 섹션의 모든 검증 명령어

  **Acceptance Criteria**:
  ```bash
  # 전체 검증 스크립트
  node --check src/orchestrator/context-limit-recovery.mjs && \
  node --check src/orchestrator/parallel-executor.mjs && \
  node --check src/orchestrator/hybrid-ultrawork.mjs && \
  node --check src/orchestrator/opencode-worker.mjs && \
  echo "=== 문법 검증 통과 ===" && \
  node -e "import('./src/orchestrator/index.mjs').then(() => console.log('import OK'))" && \
  node -e "import('./src/orchestrator/parallel-executor.mjs').then(m => { new m.ParallelExecutor({ contextLimitRecovery: true }); console.log('constructor OK') })" && \
  npm test
  ```

  **Commit**: NO (검증만)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(orchestrator): 컨텍스트 한도 복구 모듈 추가` | `context-limit-recovery.mjs` | `node --check` |
| 2+3+4 | `feat(orchestrator): 컨텍스트 한도 복구를 실행기들에 통합` | `parallel-executor.mjs`, `hybrid-ultrawork.mjs`, `opencode-worker.mjs`, `index.mjs` | `node --check` × 4 |
| 6 | `docs(skills): hulw/ulw SKILL.md에 컨텍스트 한도 복구 흐름 추가` | `skills/hulw/SKILL.md`, `skills/ulw/SKILL.md` | `grep` |
| 7 | (커밋 없음 — 검증만) | — | `npm test` |

---

## Success Criteria

### 검증 명령어
```bash
node --check src/orchestrator/context-limit-recovery.mjs  # Exit 0
node --check src/orchestrator/parallel-executor.mjs       # Exit 0
node --check src/orchestrator/hybrid-ultrawork.mjs        # Exit 0
node --check src/orchestrator/opencode-worker.mjs         # Exit 0
npm test                                                  # 361+ tests pass
```

### 최종 체크리스트
- [ ] 모든 "Must Have" 항목 구현됨
- [ ] 모든 "Must NOT Have" 항목 부재 확인
- [ ] `var` 스타일: parallel-executor.mjs 추가 코드에 `const/let` 없음
- [ ] `const/let` + arrow: hybrid-ultrawork.mjs, opencode-worker.mjs, context-limit-recovery.mjs 추가 코드
- [ ] 모든 주석 한국어
- [ ] optional chaining: parallel-executor.mjs에서 사용 안 함
- [ ] 기존 함수 시그니처 변경 없음
- [ ] `_executeWithPool` 수정 없음
- [ ] 기존 361+ 테스트 전부 통과
- [ ] 순환참조 없음 (index.mjs import 성공)
