/**
 * opencode-server-pool.mjs - 플렉서블 OpenCode 서버 풀
 *
 * 동적으로 서버 인스턴스를 관리하여 병렬 처리 성능을 최적화합니다.
 *
 * 특징:
 * - 동적 스케일링 (minServers ~ maxServers)
 * - 서버 상태 관리 (idle/busy/starting/error)
 * - 자동 헬스체크 및 복구
 * - 라운드로빈 로드밸런싱
 * - Cold boot 최소화
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// =============================================================================
// 상수
// =============================================================================

const DEFAULT_BASE_PORT = 4096;
const DEFAULT_MIN_SERVERS = 1;
const DEFAULT_MAX_SERVERS = 5;
const SERVER_START_TIMEOUT = 30000;  // 30초
const HEALTH_CHECK_INTERVAL = 30000; // 30초
const SCALE_UP_THRESHOLD = 0.8;      // 80% 사용 시 스케일업
const SCALE_DOWN_THRESHOLD = 0.3;    // 30% 미만 시 스케일다운
const SCALE_DOWN_DELAY = 60000;      // 1분 대기 후 스케일다운

// =============================================================================
// 서버 상태 열거형
// =============================================================================

const ServerStatus = {
  STARTING: 'starting',
  IDLE: 'idle',
  BUSY: 'busy',
  ERROR: 'error',
  STOPPING: 'stopping'
};

// =============================================================================
// OpenCodeServerPool 클래스
// =============================================================================

export class OpenCodeServerPool extends EventEmitter {
  /**
   * @param {Object} options - 풀 옵션
   * @param {number} [options.minServers=1] - 최소 서버 수
   * @param {number} [options.maxServers=5] - 최대 서버 수
   * @param {number} [options.basePort=4096] - 시작 포트 번호
   * @param {boolean} [options.autoScale=true] - 자동 스케일링 활성화
   * @param {string} [options.projectDir] - 프로젝트 디렉토리
   */
  constructor(options = {}) {
    super();

    this.minServers = options.minServers || DEFAULT_MIN_SERVERS;
    this.maxServers = options.maxServers || DEFAULT_MAX_SERVERS;
    this.basePort = options.basePort || DEFAULT_BASE_PORT;
    this.autoScale = options.autoScale !== false;
    this.projectDir = options.projectDir || process.cwd();

    // 서버 맵: port -> { process, status, busyCount, lastUsed, startTime }
    this.servers = new Map();

    // 요청 큐
    this.requestQueue = [];

    // 라운드로빈 인덱스
    this.nextServerIndex = 0;

    // 통계
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      peakServers: 0
    };

    // 헬스체크 인터벌
    this.healthCheckInterval = null;

    // 스케일다운 타이머
    this.scaleDownTimer = null;

    // 초기화 상태
    this.initialized = false;
  }

  /**
   * 풀 초기화 - 최소 서버 수만큼 시작
   */
  async initialize() {
    if (this.initialized) {
      return this.getStatus();
    }

    const startPromises = [];
    for (let i = 0; i < this.minServers; i++) {
      startPromises.push(this._startServer(this.basePort + i));
    }

    await Promise.all(startPromises);

    // 헬스체크 시작
    this._startHealthCheck();

    this.initialized = true;
    this.emit('initialized', this.getStatus());

    return this.getStatus();
  }

  /**
   * 서버 시작
   * @private
   */
  async _startServer(port) {
    if (this.servers.has(port)) {
      const existing = this.servers.get(port);
      if (existing.status !== ServerStatus.ERROR) {
        return existing;
      }
      // 에러 상태면 재시작
      await this._stopServer(port);
    }

    return new Promise((resolve, reject) => {
      const serverInfo = {
        port,
        process: null,
        status: ServerStatus.STARTING,
        busyCount: 0,
        lastUsed: null,
        startTime: Date.now(),
        url: `http://localhost:${port}`
      };

      this.servers.set(port, serverInfo);

      try {
        const proc = spawn('opencode', ['serve', '--port', String(port)], {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: this.projectDir
        });

        serverInfo.process = proc;

        proc.on('error', (err) => {
          serverInfo.status = ServerStatus.ERROR;
          this.emit('serverError', { port, error: err.message });
          reject(err);
        });

        proc.on('exit', (code) => {
          if (serverInfo.status !== ServerStatus.STOPPING) {
            serverInfo.status = ServerStatus.ERROR;
            this.emit('serverExit', { port, code });
          }
        });

        // 서버 준비 대기
        this._waitForServer(port)
          .then(() => {
            serverInfo.status = ServerStatus.IDLE;
            proc.unref();
            this.emit('serverStarted', { port });
            resolve(serverInfo);
          })
          .catch((err) => {
            serverInfo.status = ServerStatus.ERROR;
            reject(err);
          });

      } catch (err) {
        serverInfo.status = ServerStatus.ERROR;
        reject(err);
      }
    });
  }

  /**
   * 서버 준비 대기
   * @private
   */
  async _waitForServer(port, timeout = SERVER_START_TIMEOUT) {
    const startTime = Date.now();
    const checkInterval = 500;

    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        try {
          const http = await import('http');
          const req = http.request({
            hostname: 'localhost',
            port: port,
            path: '/health',
            method: 'GET',
            timeout: 1000
          }, (res) => {
            clearInterval(intervalId);
            resolve();
          });

          req.on('error', () => {
            // 계속 대기
          });

          req.end();

          if (Date.now() - startTime > timeout) {
            clearInterval(intervalId);
            reject(new Error(`Server on port ${port} did not start within ${timeout}ms`));
          }
        } catch (err) {
          // 계속 대기
        }
      }, checkInterval);
    });
  }

  /**
   * 서버 중지
   * @private
   */
  async _stopServer(port) {
    const serverInfo = this.servers.get(port);
    if (!serverInfo) {
      return;
    }

    serverInfo.status = ServerStatus.STOPPING;

    return new Promise((resolve) => {
      if (serverInfo.process) {
        serverInfo.process.on('close', () => {
          this.servers.delete(port);
          this.emit('serverStopped', { port });
          resolve();
        });

        serverInfo.process.kill('SIGTERM');

        // 강제 종료 타임아웃
        setTimeout(() => {
          if (this.servers.has(port)) {
            try {
              serverInfo.process.kill('SIGKILL');
            } catch {}
            this.servers.delete(port);
            resolve();
          }
        }, 5000);
      } else {
        this.servers.delete(port);
        resolve();
      }
    });
  }

  /**
   * 사용 가능한 서버 선택 (라운드로빈 + 상태 기반)
   * @private
   */
  _selectServer() {
    const idleServers = [];
    const allServers = [];

    for (const [port, info] of this.servers) {
      if (info.status === ServerStatus.IDLE) {
        idleServers.push(info);
      }
      if (info.status === ServerStatus.IDLE || info.status === ServerStatus.BUSY) {
        allServers.push(info);
      }
    }

    // idle 서버가 있으면 우선 선택
    if (idleServers.length > 0) {
      const idx = this.nextServerIndex % idleServers.length;
      this.nextServerIndex++;
      return idleServers[idx];
    }

    // 없으면 가장 덜 바쁜 서버 선택
    if (allServers.length > 0) {
      allServers.sort((a, b) => a.busyCount - b.busyCount);
      return allServers[0];
    }

    return null;
  }

  /**
   * 스케일업 필요 여부 확인
   * @private
   */
  _shouldScaleUp() {
    if (!this.autoScale) return false;
    if (this.servers.size >= this.maxServers) return false;

    const busyCount = Array.from(this.servers.values())
      .filter(s => s.status === ServerStatus.BUSY).length;
    const utilization = busyCount / this.servers.size;

    return utilization >= SCALE_UP_THRESHOLD || this.requestQueue.length > 0;
  }

  /**
   * 스케일다운 필요 여부 확인
   * @private
   */
  _shouldScaleDown() {
    if (!this.autoScale) return false;
    if (this.servers.size <= this.minServers) return false;

    const busyCount = Array.from(this.servers.values())
      .filter(s => s.status === ServerStatus.BUSY).length;
    const utilization = busyCount / this.servers.size;

    return utilization < SCALE_DOWN_THRESHOLD && this.requestQueue.length === 0;
  }

  /**
   * 스케일업 실행
   * @private
   */
  async _scaleUp() {
    if (this.servers.size >= this.maxServers) return;

    // 사용 가능한 포트 찾기
    let newPort = this.basePort;
    while (this.servers.has(newPort) && newPort < this.basePort + this.maxServers) {
      newPort++;
    }

    if (newPort >= this.basePort + this.maxServers) return;

    try {
      await this._startServer(newPort);
      this.stats.peakServers = Math.max(this.stats.peakServers, this.servers.size);
      this.emit('scaleUp', { newSize: this.servers.size, port: newPort });
    } catch (err) {
      this.emit('scaleError', { action: 'up', error: err.message });
    }
  }

  /**
   * 스케일다운 실행
   * @private
   */
  async _scaleDown() {
    if (this.servers.size <= this.minServers) return;

    // 가장 오래 idle인 서버 선택
    let oldestIdle = null;
    let oldestTime = Date.now();

    for (const [port, info] of this.servers) {
      if (info.status === ServerStatus.IDLE && info.lastUsed && info.lastUsed < oldestTime) {
        oldestTime = info.lastUsed;
        oldestIdle = port;
      }
    }

    if (oldestIdle) {
      await this._stopServer(oldestIdle);
      this.emit('scaleDown', { newSize: this.servers.size, port: oldestIdle });
    }
  }

  /**
   * 헬스체크 시작
   * @private
   */
  _startHealthCheck() {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      for (const [port, info] of this.servers) {
        if (info.status === ServerStatus.ERROR) {
          // 에러 서버 재시작 시도
          try {
            await this._startServer(port);
          } catch {}
        }
      }

      // 스케일링 체크
      if (this._shouldScaleUp()) {
        await this._scaleUp();
      } else if (this._shouldScaleDown()) {
        // 스케일다운은 지연 적용
        if (!this.scaleDownTimer) {
          this.scaleDownTimer = setTimeout(async () => {
            if (this._shouldScaleDown()) {
              await this._scaleDown();
            }
            this.scaleDownTimer = null;
          }, SCALE_DOWN_DELAY);
        }
      } else {
        // 스케일다운 조건 해제
        if (this.scaleDownTimer) {
          clearTimeout(this.scaleDownTimer);
          this.scaleDownTimer = null;
        }
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * 프롬프트 실행
   *
   * @param {string} prompt - 실행할 프롬프트
   * @param {Object} options - 실행 옵션
   * @returns {Promise<Object>} 실행 결과
   */
  async execute(prompt, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    this.stats.totalRequests++;

    // 스케일업 체크
    if (this._shouldScaleUp()) {
      this._scaleUp().catch(() => {}); // 비동기로 스케일업
    }

    // 서버 선택
    let server = this._selectServer();

    if (!server) {
      // 서버가 없으면 새로 시작
      const newPort = this.basePort + this.servers.size;
      if (newPort < this.basePort + this.maxServers) {
        try {
          server = await this._startServer(newPort);
        } catch (err) {
          this.stats.failedRequests++;
          throw new Error(`No available server: ${err.message}`);
        }
      } else {
        this.stats.failedRequests++;
        throw new Error('All servers are busy and max limit reached');
      }
    }

    // 서버 상태 업데이트
    server.status = ServerStatus.BUSY;
    server.busyCount++;

    const startTime = Date.now();

    try {
      const result = await this._executeOnServer(server, prompt, options);

      // 통계 업데이트
      const responseTime = Date.now() - startTime;
      this.stats.completedRequests++;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.completedRequests - 1) + responseTime)
        / this.stats.completedRequests;

      return result;
    } catch (err) {
      this.stats.failedRequests++;
      throw err;
    } finally {
      server.busyCount--;
      server.lastUsed = Date.now();
      if (server.busyCount === 0) {
        server.status = ServerStatus.IDLE;
      }
    }
  }

  /**
   * 특정 서버에서 실행
   * @private
   */
  async _executeOnServer(server, prompt, options = {}) {
    const args = [
      'run',
      '--attach', server.url,
      '--format', 'json'
    ];

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.agent) {
      args.push('--agent', options.agent);
    }

    // ulw 모드 래핑
    const finalPrompt = options.disableUlw ? prompt : `ulw: ${prompt}`;
    args.push(finalPrompt);

    return new Promise((resolve, reject) => {
      const child = spawn('opencode', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.projectDir
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({
              success: true,
              result,
              serverPort: server.port
            });
          } catch {
            resolve({
              success: true,
              stdout,
              serverPort: server.port
            });
          }
        } else {
          reject(new Error(`Execution failed (code ${code}): ${stderr}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });

      // 타임아웃
      const timeout = options.timeout || 5 * 60 * 1000;
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 여러 프롬프트 병렬 실행
   *
   * @param {Array} prompts - [{ prompt, options }]
   * @returns {Promise<Array>} 결과 배열
   */
  async executeBatch(prompts) {
    if (!this.initialized) {
      await this.initialize();
    }

    // 필요한 만큼 스케일업
    const neededServers = Math.min(prompts.length, this.maxServers);
    while (this.servers.size < neededServers) {
      const newPort = this.basePort + this.servers.size;
      try {
        await this._startServer(newPort);
      } catch {
        break;
      }
    }

    // 병렬 실행
    const promises = prompts.map(item =>
      this.execute(item.prompt, item.options || {})
        .then(result => ({ status: 'fulfilled', value: result }))
        .catch(error => ({ status: 'rejected', reason: error.message }))
    );

    return Promise.all(promises);
  }

  /**
   * 초기화 여부 확인
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * 풀 상태 조회
   */
  getStatus() {
    const serverList = [];
    for (const [port, info] of this.servers) {
      serverList.push({
        port,
        status: info.status,
        busyCount: info.busyCount,
        lastUsed: info.lastUsed,
        uptime: info.startTime ? Date.now() - info.startTime : 0
      });
    }

    return {
      initialized: this.initialized,
      minServers: this.minServers,
      maxServers: this.maxServers,
      currentServers: this.servers.size,
      idleServers: serverList.filter(s => s.status === ServerStatus.IDLE).length,
      busyServers: serverList.filter(s => s.status === ServerStatus.BUSY).length,
      servers: serverList,
      stats: { ...this.stats },
      autoScale: this.autoScale
    };
  }

  /**
   * 풀 종료
   */
  async shutdown() {
    // 헬스체크 중지
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.scaleDownTimer) {
      clearTimeout(this.scaleDownTimer);
      this.scaleDownTimer = null;
    }

    // 모든 서버 종료
    const stopPromises = [];
    for (const port of this.servers.keys()) {
      stopPromises.push(this._stopServer(port));
    }

    await Promise.all(stopPromises);

    this.initialized = false;
    this.emit('shutdown');
  }

  /**
   * 수동 스케일 조정
   *
   * @param {number} targetSize - 목표 서버 수
   */
  async scale(targetSize) {
    targetSize = Math.max(this.minServers, Math.min(this.maxServers, targetSize));

    while (this.servers.size < targetSize) {
      const newPort = this.basePort + this.servers.size;
      await this._startServer(newPort);
    }

    while (this.servers.size > targetSize) {
      await this._scaleDown();
    }

    return this.getStatus();
  }
}

// =============================================================================
// 편의 함수
// =============================================================================

// 싱글톤 풀 인스턴스
let defaultPool = null;

/**
 * 기본 풀 가져오기/생성
 */
export function getDefaultPool(options = {}) {
  if (!defaultPool) {
    defaultPool = new OpenCodeServerPool(options);
  }
  return defaultPool;
}

/**
 * 기본 풀로 실행
 */
export async function executeWithPool(prompt, options = {}) {
  const pool = getDefaultPool(options.poolOptions);
  return pool.execute(prompt, options);
}

/**
 * 기본 풀로 배치 실행
 */
export async function executeBatchWithPool(prompts, options = {}) {
  const pool = getDefaultPool(options.poolOptions);
  return pool.executeBatch(prompts);
}

/**
 * 기본 풀 종료
 */
export async function shutdownDefaultPool() {
  if (defaultPool) {
    await defaultPool.shutdown();
    defaultPool = null;
  }
}

// =============================================================================
// 내보내기
// =============================================================================

export { ServerStatus };
