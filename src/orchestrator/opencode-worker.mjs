/**
 * opencode-worker.mjs - OpenCode 워커 관리
 *
 * OpenCode 인스턴스를 프로그래밍 방식으로 실행하고 결과를 수집
 */

import { spawn, execFileSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { randomUUID } from 'crypto';

// =============================================================================
// 상수
// =============================================================================

const OPENCODE_TIMEOUT = 300000; // 5분 기본 타임아웃
const MAX_CONCURRENT_WORKERS = 5;
const WORK_DIR = join(tmpdir(), 'omc-opencode-workers');

// =============================================================================
// 워커 클래스
// =============================================================================

export class OpenCodeWorker {
  constructor(options = {}) {
    this.id = randomUUID().slice(0, 8);
    this.projectDir = options.projectDir || process.cwd();
    this.timeout = options.timeout || OPENCODE_TIMEOUT;
    this.quiet = options.quiet !== false;
    this.outputFormat = options.outputFormat || 'text';
    this.status = 'idle';
    this.result = null;
    this.error = null;
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * 작업 실행
   * @param {string} prompt - OpenCode에 전달할 프롬프트
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object>} 실행 결과
   */
  async execute(prompt, options = {}) {
    this.status = 'running';
    this.startTime = Date.now();

    // 작업 디렉토리 생성
    if (!existsSync(WORK_DIR)) {
      mkdirSync(WORK_DIR, { recursive: true });
    }

    const outputFile = join(WORK_DIR, `${this.id}-output.txt`);

    try {
      // OpenCode 실행 (비대화형 모드)
      const args = ['-c', this.projectDir, '-p', prompt];

      if (this.quiet) {
        args.push('-q');
      }

      if (this.outputFormat === 'json') {
        args.push('-f', 'json');
      }

      // ulw 키워드를 프롬프트에 추가하여 ultrawork 모드 활성화
      const ulwPrompt = options.enableUltrawork ? `ulw: ${prompt}` : prompt;
      args[3] = ulwPrompt;

      const result = await this._runOpenCode(args, outputFile);

      this.status = 'completed';
      this.result = result;
      this.endTime = Date.now();

      return {
        success: true,
        workerId: this.id,
        output: result,
        duration: this.endTime - this.startTime,
      };
    } catch (error) {
      this.status = 'failed';
      this.error = error.message;
      this.endTime = Date.now();

      return {
        success: false,
        workerId: this.id,
        error: error.message,
        partialOutput: error.partialOutput || '',
        isTimeout: error.isTimeout || false,
        contextLimitHit: /context.*(limit|length|window)|token limit/i.test(error.message),
        duration: this.endTime - this.startTime,
      };
    } finally {
      // 임시 파일 정리
      try {
        if (existsSync(outputFile)) {
          unlinkSync(outputFile);
        }
      } catch {}
    }
  }

  /**
   * OpenCode 프로세스 실행
   */
  _runOpenCode(args, outputFile) {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn('opencode', args, {
        cwd: this.projectDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeout,
      });

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          const err = new Error(`OpenCode exited with code ${code}: ${stderr}`);
          err.partialOutput = stdout.trim();
          reject(err);
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });

      // 타임아웃 처리
      setTimeout(() => {
        try {
          proc.kill('SIGTERM');
        } catch {}
        const err = new Error(`OpenCode timeout after ${this.timeout}ms`);
        err.partialOutput = stdout.trim();
        err.isTimeout = true;
        reject(err);
      }, this.timeout);
    });
  }
}

// =============================================================================
// 워커 풀
// =============================================================================

export class OpenCodeWorkerPool {
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || MAX_CONCURRENT_WORKERS;
    this.projectDir = options.projectDir || process.cwd();
    this.workers = new Map();
    this.queue = [];
    this.results = new Map();
  }

  /**
   * 단일 작업 제출
   */
  async submit(prompt, options = {}) {
    const worker = new OpenCodeWorker({
      projectDir: this.projectDir,
      ...options,
    });

    this.workers.set(worker.id, worker);

    try {
      const result = await worker.execute(prompt, options);
      this.results.set(worker.id, result);
      return result;
    } finally {
      this.workers.delete(worker.id);
    }
  }

  /**
   * 여러 작업 병렬 실행
   * @param {Array} tasks - [{ prompt, options }]
   * @returns {Promise<Array>} 결과 배열
   */
  async submitBatch(tasks) {
    // 동시 실행 제한을 위한 청크 분할
    const results = [];

    for (let i = 0; i < tasks.length; i += this.maxWorkers) {
      const chunk = tasks.slice(i, i + this.maxWorkers);

      const chunkPromises = chunk.map((task) =>
        this.submit(task.prompt, {
          ...task.options,
          enableUltrawork: task.enableUltrawork ?? true,
        })
      );

      const chunkResults = await Promise.allSettled(chunkPromises);

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      }
    }

    return results;
  }

  /**
   * 현재 상태 조회
   */
  getStatus() {
    return {
      activeWorkers: this.workers.size,
      maxWorkers: this.maxWorkers,
      queuedTasks: this.queue.length,
      completedTasks: this.results.size,
    };
  }

  /**
   * 모든 워커 종료
   */
  async shutdown() {
    for (const worker of this.workers.values()) {
      worker.status = 'cancelled';
    }
    this.workers.clear();
    this.queue = [];
  }
}

// =============================================================================
// 편의 함수
// =============================================================================

/**
 * 단일 OpenCode 작업 실행
 */
export async function runOpenCodeTask(prompt, options = {}) {
  const worker = new OpenCodeWorker(options);
  return worker.execute(prompt, options);
}

/**
 * 병렬 OpenCode 작업 실행
 */
export async function runOpenCodeTasks(tasks, options = {}) {
  const pool = new OpenCodeWorkerPool(options);
  return pool.submitBatch(tasks);
}

/**
 * OpenCode ultrawork 모드로 작업 실행
 */
export async function runOpenCodeUltrawork(prompt, options = {}) {
  return runOpenCodeTask(prompt, {
    ...options,
    enableUltrawork: true,
  });
}
