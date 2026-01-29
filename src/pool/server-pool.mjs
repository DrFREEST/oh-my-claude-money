/**
 * server-pool.mjs - OpenCode 서버 풀 매니저
 *
 * opencode serve 인스턴스를 풀로 관리하여 fusion-router에서 HTTP API로 호출
 *
 * 기능:
 * - 서버 시작/중지 (포트 자동 배정: basePort ~ basePort+maxServers)
 * - acquire/release (유휴 서버 자동 배정)
 * - 오토스케일링 (min~max 범위, 부하에 따라 확장/축소)
 * - 헬스체크 (비정상 서버 교체)
 * - 상태 파일: ~/.omcm/server-pool.json
 */
import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

var HOME = homedir();
var OMCM_DIR = join(HOME, '.omcm');
var POOL_STATE_FILE = join(OMCM_DIR, 'server-pool.json');
var CONFIG_FILE = join(HOME, '.claude', 'plugins', 'omcm', 'config.json');

/** 기본 설정 */
var DEFAULT_CONFIG = {
  minServers: 1,
  maxServers: 4,
  basePort: 4096,
  healthCheckInterval: 30000,
  idleTimeout: 300000,
  requestTimeout: 300000,
  startupTimeout: 15000
};

/**
 * 서버 풀 상태 로드
 * @returns {object} - 서버 풀 상태
 */
function loadPoolState() {
  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }
  if (!existsSync(POOL_STATE_FILE)) {
    return { servers: [], lastUpdated: null };
  }
  try {
    return JSON.parse(readFileSync(POOL_STATE_FILE, 'utf-8'));
  } catch (e) {
    return { servers: [], lastUpdated: null };
  }
}

/**
 * 서버 풀 상태 저장
 * @param {object} state - 서버 풀 상태
 */
function savePoolState(state) {
  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }
  state.lastUpdated = new Date().toISOString();
  writeFileSync(POOL_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * 풀 설정 로드 (config.json의 pool 섹션)
 * @returns {object} - 풀 설정
 */
function loadPoolConfig() {
  var config = DEFAULT_CONFIG;
  try {
    if (existsSync(CONFIG_FILE)) {
      var userConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      if (userConfig && userConfig.pool) {
        var p = userConfig.pool;
        if (typeof p.minServers === 'number') config.minServers = p.minServers;
        if (typeof p.maxServers === 'number') config.maxServers = p.maxServers;
        if (typeof p.basePort === 'number') config.basePort = p.basePort;
        if (typeof p.healthCheckInterval === 'number') config.healthCheckInterval = p.healthCheckInterval;
        if (typeof p.idleTimeout === 'number') config.idleTimeout = p.idleTimeout;
        if (typeof p.requestTimeout === 'number') config.requestTimeout = p.requestTimeout;
        if (typeof p.startupTimeout === 'number') config.startupTimeout = p.startupTimeout;
      }
    }
  } catch (e) {
    // 설정 로드 실패 시 기본값
  }
  return config;
}

/**
 * 프로세스가 살아있는지 확인
 * @param {number} pid - 프로세스 ID
 * @returns {boolean}
 */
function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * HTTP 헬스체크
 * @param {number} port - 서버 포트
 * @param {number} [timeout=3000] - 타임아웃 (ms)
 * @returns {Promise<boolean>}
 */
async function checkHealth(port, timeout) {
  timeout = timeout || 3000;
  try {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    var res = await fetch('http://127.0.0.1:' + port + '/global/health', {
      signal: controller.signal
    });
    clearTimeout(timer);
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * opencode serve 프로세스 시작
 * @param {number} port - 포트
 * @param {number} [startupTimeout=15000] - 시작 타임아웃 (ms)
 * @returns {Promise<object>} - { pid, port, process }
 */
function startServer(port, startupTimeout) {
  startupTimeout = startupTimeout || 15000;
  return new Promise(function(resolve, reject) {
    var child = spawn('opencode', ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      env: Object.assign({}, process.env)
    });

    var output = '';
    var resolved = false;

    var timer = setTimeout(function() {
      if (!resolved) {
        resolved = true;
        // 타임아웃이지만 프로세스는 살아있을 수 있음 - 헬스체크로 확인
        checkHealth(port, 3000).then(function(healthy) {
          if (healthy) {
            child.stdout.removeAllListeners();
            child.stderr.removeAllListeners();
            child.unref();
            resolve({ pid: child.pid, port: port, process: child });
          } else {
            reject(new Error('Server startup timeout on port ' + port));
          }
        });
      }
    }, startupTimeout);

    child.stdout.on('data', function(data) {
      output += data.toString();
      if (output.indexOf('opencode server listening') !== -1 && !resolved) {
        resolved = true;
        clearTimeout(timer);
        child.stdout.removeAllListeners();
        child.stderr.removeAllListeners();
        child.unref();
        resolve({ pid: child.pid, port: port, process: child });
      }
    });

    child.stderr.on('data', function(data) {
      output += data.toString();
    });

    child.on('error', function(err) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on('exit', function(code) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error('Server exited with code ' + code + '. Output: ' + output.slice(0, 500)));
      }
    });
  });
}

/**
 * 포트가 사용 중인지 확인
 * @param {number} port
 * @returns {Promise<boolean>}
 */
async function isPortInUse(port) {
  return await checkHealth(port, 2000);
}

/**
 * 사용 가능한 다음 포트 찾기
 * @param {number} basePort - 시작 포트
 * @param {number} maxServers - 최대 서버 수
 * @param {Array} existingPorts - 이미 사용 중인 포트 목록
 * @returns {number|null} - 사용 가능한 포트
 */
function findAvailablePort(basePort, maxServers, existingPorts) {
  for (var i = 0; i < maxServers; i++) {
    var port = basePort + i;
    var inUse = false;
    for (var j = 0; j < existingPorts.length; j++) {
      if (existingPorts[j] === port) {
        inUse = true;
        break;
      }
    }
    if (!inUse) return port;
  }
  return null;
}

// ============================================================
// ServerPoolManager 클래스
// ============================================================

/**
 * @typedef {object} ServerEntry
 * @property {number} port
 * @property {number} pid
 * @property {'idle'|'busy'|'starting'|'dead'} status
 * @property {number} requestCount - 처리한 요청 수
 * @property {number|null} lastUsed - 마지막 사용 시각 (ms)
 * @property {number} startedAt - 시작 시각 (ms)
 */

var _instance = null;

/**
 * 서버 풀 매니저
 * 싱글톤 패턴 - getInstance()로 획득
 */
function ServerPoolManager() {
  this.config = loadPoolConfig();
  this.servers = [];         // ServerEntry[]
  this._processes = {};      // port -> child process (메모리에만 보관)
  this._initialized = false;
  this._healthTimer = null;
}

/**
 * 싱글톤 인스턴스 획득
 * @returns {ServerPoolManager}
 */
ServerPoolManager.getInstance = function() {
  if (!_instance) {
    _instance = new ServerPoolManager();
  }
  return _instance;
};

/**
 * 풀 초기화 - 기존 서버 복원 + minServers 보장
 * @returns {Promise<void>}
 */
ServerPoolManager.prototype.initialize = async function() {
  if (this._initialized) return;

  this.config = loadPoolConfig();

  // 1. 기존 상태 복원
  var state = loadPoolState();
  if (state.servers && state.servers.length > 0) {
    for (var i = 0; i < state.servers.length; i++) {
      var s = state.servers[i];
      // PID 생존 + 헬스체크
      if (isProcessAlive(s.pid)) {
        var healthy = await checkHealth(s.port, 3000);
        if (healthy) {
          this.servers.push({
            port: s.port,
            pid: s.pid,
            status: 'idle',
            requestCount: s.requestCount || 0,
            lastUsed: s.lastUsed || null,
            startedAt: s.startedAt || Date.now()
          });
          continue;
        }
      }
      // 죽은 서버는 무시 (상태에서 제거)
    }
  }

  // 2. minServers 보장 — 부족하면 새로 시작
  var needed = this.config.minServers - this.servers.length;
  if (needed > 0) {
    var existingPorts = this.servers.map(function(s) { return s.port; });
    for (var j = 0; j < needed; j++) {
      var port = findAvailablePort(this.config.basePort, this.config.maxServers, existingPorts);
      if (port === null) break;

      try {
        var result = await startServer(port, this.config.startupTimeout);
        this.servers.push({
          port: result.port,
          pid: result.pid,
          status: 'idle',
          requestCount: 0,
          lastUsed: null,
          startedAt: Date.now()
        });
        this._processes[result.port] = result.process;
        existingPorts.push(port);
      } catch (e) {
        process.stderr.write('[OMCM Pool] Failed to start server on port ' + port + ': ' + e.message + '\n');
      }
    }
  }

  this._saveState();
  this._initialized = true;

  // 3. 주기적 헬스체크 시작 (장기 실행 시에만 의미)
  // hook은 단발 실행이므로 헬스체크 타이머는 생략
};

/**
 * 유휴 서버 획득 (acquire)
 * 유휴 서버 없으면 오토스케일업 시도
 * @returns {Promise<ServerEntry|null>} - 획득한 서버 (또는 null)
 */
ServerPoolManager.prototype.acquire = async function() {
  if (!this._initialized) {
    await this.initialize();
  }

  // 1. idle 서버 찾기 (최소 사용 횟수 우선)
  var idleServers = [];
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].status === 'idle') {
      // 헬스체크 확인
      var healthy = await checkHealth(this.servers[i].port, 2000);
      if (healthy) {
        idleServers.push(this.servers[i]);
      } else {
        this.servers[i].status = 'dead';
      }
    }
  }

  if (idleServers.length > 0) {
    // 최소 사용 횟수 서버 선택
    idleServers.sort(function(a, b) { return a.requestCount - b.requestCount; });
    var server = idleServers[0];
    server.status = 'busy';
    server.lastUsed = Date.now();
    this._saveState();
    return server;
  }

  // 2. 오토스케일업 시도
  if (this.servers.length < this.config.maxServers) {
    var scaled = await this._scaleUp();
    if (scaled) {
      scaled.status = 'busy';
      scaled.lastUsed = Date.now();
      this._saveState();
      return scaled;
    }
  }

  // 3. 죽은 서버 교체 시도
  var deadIdx = -1;
  for (var j = 0; j < this.servers.length; j++) {
    if (this.servers[j].status === 'dead') {
      deadIdx = j;
      break;
    }
  }
  if (deadIdx !== -1) {
    var replaced = await this._replaceServer(deadIdx);
    if (replaced) {
      replaced.status = 'busy';
      replaced.lastUsed = Date.now();
      this._saveState();
      return replaced;
    }
  }

  // 4. 모두 busy — null 반환 (호출자가 대기 또는 폴백)
  return null;
};

/**
 * 서버 반환 (release)
 * @param {number} port - 반환할 서버 포트
 */
ServerPoolManager.prototype.release = function(port) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].port === port) {
      this.servers[i].status = 'idle';
      this.servers[i].requestCount++;
      this._saveState();
      return;
    }
  }
};

/**
 * 스케일업 - 새 서버 1대 추가
 * @returns {Promise<ServerEntry|null>}
 */
ServerPoolManager.prototype._scaleUp = async function() {
  var existingPorts = this.servers.map(function(s) { return s.port; });
  var port = findAvailablePort(this.config.basePort, this.config.maxServers, existingPorts);
  if (port === null) return null;

  try {
    process.stderr.write('[OMCM Pool] Scaling up: starting server on port ' + port + '\n');
    var result = await startServer(port, this.config.startupTimeout);
    var entry = {
      port: result.port,
      pid: result.pid,
      status: 'idle',
      requestCount: 0,
      lastUsed: null,
      startedAt: Date.now()
    };
    this.servers.push(entry);
    this._processes[result.port] = result.process;
    return entry;
  } catch (e) {
    process.stderr.write('[OMCM Pool] Scale up failed on port ' + port + ': ' + e.message + '\n');
    return null;
  }
};

/**
 * 죽은 서버 교체
 * @param {number} index - 서버 인덱스
 * @returns {Promise<ServerEntry|null>}
 */
ServerPoolManager.prototype._replaceServer = async function(index) {
  var old = this.servers[index];
  var port = old.port;

  // 기존 프로세스 정리
  try {
    if (old.pid && isProcessAlive(old.pid)) {
      process.kill(old.pid, 'SIGTERM');
    }
  } catch (e) { /* ignore */ }

  try {
    process.stderr.write('[OMCM Pool] Replacing dead server on port ' + port + '\n');
    var result = await startServer(port, this.config.startupTimeout);
    var entry = {
      port: result.port,
      pid: result.pid,
      status: 'idle',
      requestCount: 0,
      lastUsed: null,
      startedAt: Date.now()
    };
    this.servers[index] = entry;
    this._processes[result.port] = result.process;
    return entry;
  } catch (e) {
    process.stderr.write('[OMCM Pool] Replace failed on port ' + port + ': ' + e.message + '\n');
    // 다른 포트로 시도
    var existingPorts = this.servers.map(function(s) { return s.port; });
    var newPort = findAvailablePort(this.config.basePort, this.config.maxServers, existingPorts);
    if (newPort === null) return null;

    try {
      var result2 = await startServer(newPort, this.config.startupTimeout);
      var entry2 = {
        port: result2.port,
        pid: result2.pid,
        status: 'idle',
        requestCount: 0,
        lastUsed: null,
        startedAt: Date.now()
      };
      this.servers[index] = entry2;
      this._processes[result2.port] = result2.process;
      return entry2;
    } catch (e2) {
      return null;
    }
  }
};

/**
 * 유휴 서버 축소 (scaleDown) - idleTimeout 초과 서버 종료 (minServers 유지)
 * @returns {number} - 종료한 서버 수
 */
ServerPoolManager.prototype.scaleDown = function() {
  var now = Date.now();
  var removed = 0;

  // idle 상태 + idleTimeout 초과 + minServers 이상일 때만 종료
  for (var i = this.servers.length - 1; i >= 0; i--) {
    if (this.servers.length <= this.config.minServers) break;

    var s = this.servers[i];
    if (s.status !== 'idle') continue;

    var idleTime = s.lastUsed ? (now - s.lastUsed) : (now - s.startedAt);
    if (idleTime > this.config.idleTimeout) {
      // 종료
      try {
        if (s.pid && isProcessAlive(s.pid)) {
          process.kill(s.pid, 'SIGTERM');
        }
      } catch (e) { /* ignore */ }

      delete this._processes[s.port];
      this.servers.splice(i, 1);
      removed++;
      process.stderr.write('[OMCM Pool] Scaled down: stopped server on port ' + s.port + '\n');
    }
  }

  if (removed > 0) {
    this._saveState();
  }
  return removed;
};

/**
 * 전체 헬스체크 실행
 * @returns {Promise<object>} - { total, healthy, dead, replaced }
 */
ServerPoolManager.prototype.healthCheck = async function() {
  var stats = { total: this.servers.length, healthy: 0, dead: 0, replaced: 0 };

  for (var i = 0; i < this.servers.length; i++) {
    var s = this.servers[i];
    if (s.status === 'busy') {
      // busy는 건드리지 않음
      stats.healthy++;
      continue;
    }

    var healthy = isProcessAlive(s.pid) && await checkHealth(s.port, 3000);
    if (healthy) {
      stats.healthy++;
      if (s.status === 'dead') s.status = 'idle';
    } else {
      s.status = 'dead';
      stats.dead++;
    }
  }

  // 죽은 서버 교체
  for (var j = 0; j < this.servers.length; j++) {
    if (this.servers[j].status === 'dead') {
      var replaced = await this._replaceServer(j);
      if (replaced) {
        stats.replaced++;
        stats.dead--;
        stats.healthy++;
      }
    }
  }

  this._saveState();
  return stats;
};

/**
 * 풀 상태 조회
 * @returns {object}
 */
ServerPoolManager.prototype.getStatus = function() {
  var idle = 0;
  var busy = 0;
  var dead = 0;

  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].status === 'idle') idle++;
    else if (this.servers[i].status === 'busy') busy++;
    else if (this.servers[i].status === 'dead') dead++;
  }

  return {
    total: this.servers.length,
    idle: idle,
    busy: busy,
    dead: dead,
    config: this.config,
    servers: this.servers.map(function(s) {
      return {
        port: s.port,
        pid: s.pid,
        status: s.status,
        requestCount: s.requestCount,
        lastUsed: s.lastUsed
      };
    })
  };
};

/**
 * 모든 서버 종료 (shutdown)
 */
ServerPoolManager.prototype.shutdown = function() {
  for (var i = 0; i < this.servers.length; i++) {
    var s = this.servers[i];
    try {
      if (s.pid && isProcessAlive(s.pid)) {
        process.kill(s.pid, 'SIGTERM');
      }
    } catch (e) { /* ignore */ }
  }
  this.servers = [];
  this._processes = {};
  this._saveState();
  process.stderr.write('[OMCM Pool] All servers stopped\n');
};

/**
 * 상태 파일 저장 (내부)
 */
ServerPoolManager.prototype._saveState = function() {
  savePoolState({
    servers: this.servers.map(function(s) {
      return {
        port: s.port,
        pid: s.pid,
        status: s.status,
        requestCount: s.requestCount,
        lastUsed: s.lastUsed,
        startedAt: s.startedAt
      };
    })
  });
};

// ============================================================
// 편의 함수 (hook에서 간단히 사용)
// ============================================================

/**
 * 서버 풀에서 유휴 서버 획득하여 프롬프트 실행
 *
 * @param {object} params
 * @param {string} params.prompt - 프롬프트 텍스트
 * @param {string} [params.providerID] - 프로바이더 ID (예: 'openai', 'google')
 * @param {string} [params.modelID] - 모델 ID (예: 'gpt-5.2', 'gemini-2.5-flash')
 * @param {string} [params.agent] - 에이전트 이름
 * @param {string} [params.system] - 시스템 프롬프트
 * @param {number} [params.timeout] - 요청 타임아웃 (ms)
 * @returns {Promise<object>} - { success, output, tokens, sessionId, error }
 */
async function executeOnPool(params) {
  var pool = ServerPoolManager.getInstance();
  var server = await pool.acquire();

  if (!server) {
    return { success: false, error: 'No available server in pool', tokens: null };
  }

  var baseUrl = 'http://127.0.0.1:' + server.port;
  var timeout = params.timeout || pool.config.requestTimeout;

  try {
    // 1. 세션 생성
    var sesRes = await fetch(baseUrl + '/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!sesRes.ok) {
      throw new Error('Session create failed: ' + sesRes.status);
    }
    var sesData = await sesRes.json();
    var sessionId = sesData.id;

    // 2. 프롬프트 실행 (동기 - POST /session/{id}/message)
    var body = {
      parts: [{ type: 'text', text: params.prompt || '' }]
    };

    if (params.providerID && params.modelID) {
      body.model = { providerID: params.providerID, modelID: params.modelID };
    }
    // NOTE: agent 파라미터는 OpenCode API body에 포함하지 않음
    // /session/{id}/message에 agent를 넣으면 200 + 빈 바디 반환 (API 미지원)
    // OpenCode 에이전트는 서버 설정(opencode.json)으로 결정됨
    if (params.system) {
      body.system = params.system;
    }

    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);

    var promptRes = await fetch(baseUrl + '/session/' + sessionId + '/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!promptRes.ok) {
      var errText = await promptRes.text();
      throw new Error('Prompt failed: ' + promptRes.status + ' ' + errText.slice(0, 200));
    }

    var result = await promptRes.json();

    // 3. 결과 파싱
    var output = '';
    var tokens = null;
    var apiError = null;

    if (result && result.info) {
      tokens = {
        input: (result.info.tokens && result.info.tokens.input) || 0,
        output: (result.info.tokens && result.info.tokens.output) || 0,
        reasoning: (result.info.tokens && result.info.tokens.reasoning) || 0,
        cacheRead: (result.info.tokens && result.info.tokens.cache && result.info.tokens.cache.read) || 0,
        cacheWrite: (result.info.tokens && result.info.tokens.cache && result.info.tokens.cache.write) || 0,
        modelID: result.info.modelID || '',
        providerID: result.info.providerID || '',
        cost: result.info.cost || 0,
        finish: result.info.finish || ''
      };

      // API 에러 확인 (rate limit 등)
      if (result.info.error) {
        var errData = result.info.error.data || {};
        apiError = (result.info.error.name || 'UnknownError') + ': ' + (errData.message || JSON.stringify(errData));
      }
    }

    if (result && result.parts) {
      for (var i = 0; i < result.parts.length; i++) {
        var part = result.parts[i];
        if (part.type === 'text' && part.text) {
          output += part.text;
        }
      }
    }

    // API 에러 시 실패 처리
    if (apiError) {
      pool.release(server.port);
      return {
        success: false,
        error: apiError,
        output: output,
        tokens: tokens,
        sessionId: sessionId,
        serverPort: server.port
      };
    }

    // 4. 서버 반환
    pool.release(server.port);

    return {
      success: true,
      output: output,
      tokens: tokens,
      sessionId: sessionId,
      serverPort: server.port
    };

  } catch (e) {
    // 서버 반환
    pool.release(server.port);

    var errorMsg = e.message || String(e);
    if (e.name === 'AbortError') {
      errorMsg = 'Request timeout after ' + timeout + 'ms';
    }

    return {
      success: false,
      error: errorMsg,
      tokens: null,
      serverPort: server.port
    };
  }
}

/**
 * 이미 실행 중인 opencode serve 프로세스 감지 및 풀에 등록
 * (초기화 시 외부에서 이미 시작된 서버를 자동 감지)
 * @returns {Promise<number>} - 감지된 서버 수
 */
async function discoverExistingServers() {
  var pool = ServerPoolManager.getInstance();
  var config = pool.config;
  var discovered = 0;

  for (var port = config.basePort; port < config.basePort + config.maxServers; port++) {
    // 이미 풀에 있는 포트는 스킵
    var alreadyInPool = false;
    for (var i = 0; i < pool.servers.length; i++) {
      if (pool.servers[i].port === port) {
        alreadyInPool = true;
        break;
      }
    }
    if (alreadyInPool) continue;

    // 헬스체크
    var healthy = await checkHealth(port, 2000);
    if (healthy) {
      // PID 탐색 시도 (ps 출력 기반은 비용이 크므로 0으로 기록)
      pool.servers.push({
        port: port,
        pid: 0,     // 외부 프로세스는 PID 미상
        status: 'idle',
        requestCount: 0,
        lastUsed: null,
        startedAt: Date.now()
      });
      discovered++;
      process.stderr.write('[OMCM Pool] Discovered existing server on port ' + port + '\n');
    }
  }

  if (discovered > 0) {
    pool._saveState();
  }
  return discovered;
}

export {
  ServerPoolManager,
  executeOnPool,
  discoverExistingServers,
  checkHealth,
  loadPoolConfig,
  DEFAULT_CONFIG
};
