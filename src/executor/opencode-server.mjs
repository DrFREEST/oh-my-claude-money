/**
 * opencode-server.mjs - OpenCode serve 모드 관리 모듈
 *
 * OpenCode의 serve 모드를 통한 세션 유지형 실행을 관리합니다.
 * 연속적인 작업에서 MCP 서버 재사용 및 컨텍스트 유지를 위해 사용됩니다.
 *
 * 사용 시나리오:
 * - 연속적인 작업 (같은 컨텍스트 유지)
 * - MCP 서버 cold boot 회피
 * - 긴 세션 작업
 */

import { spawn } from 'child_process';
import { wrapWithUlwCommand } from './opencode-executor.mjs';

/**
 * OpenCode 서버 프로세스 전역 상태
 */
let serverProcess = null;
let serverPort = 4096;
let serverUrl = null;

/**
 * 서버 헬스체크 대기
 *
 * @param {number} port - 서버 포트
 * @param {number} timeout - 타임아웃 (ms, 기본: 10초)
 * @returns {Promise<void>}
 */
async function waitForServer(port, timeout = 10000) {
  const startTime = Date.now();
  const checkInterval = 500;

  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
       try {
         // HTTP GET 요청으로 서버 상태 확인
         const http = await import('http');
         const req = http.request({
           hostname: 'localhost',
           port: port,
           path: '/global/health',
           method: 'GET',
           timeout: 1000
         }, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            // 404도 서버 응답으로 간주 (health 엔드포인트 없을 수 있음)
            clearInterval(intervalId);
            resolve();
          }
        });

        req.on('error', () => {
          // 에러는 무시하고 계속 대기
        });

        req.end();

        // 타임아웃 체크
        if (Date.now() - startTime > timeout) {
          clearInterval(intervalId);
          reject(new Error(`Server did not respond within ${timeout}ms`));
        }
      } catch (err) {
        // fetch 에러는 무시하고 계속 대기
      }
    }, checkInterval);
  });
}

/**
 * OpenCode 서버 시작 또는 재사용
 *
 * 이미 실행 중인 서버가 있으면 재사용하고,
 * 없으면 새로 시작합니다.
 *
 * @param {Object} options - 서버 옵션
 * @param {number} options.port - 서버 포트 (기본: 4096)
 * @param {boolean} options.force - 강제 재시작 여부
 * @returns {Promise<string>} 서버 URL (http://localhost:PORT)
 */
export async function ensureServer(options = {}) {
  const port = options.port || serverPort;
  const force = options.force || false;

  // 기존 서버가 있고 force가 아니면 재사용
  if (serverProcess && !force && serverUrl) {
    return serverUrl;
  }

  // 기존 서버 종료
  if (serverProcess && force) {
    await stopServer();
  }

  // 새 서버 시작
  return new Promise((resolve, reject) => {
    serverProcess = spawn('opencode', ['serve', '--port', String(port)], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverPort = port;
    serverUrl = `http://localhost:${port}`;

    let stdout = '';
    let stderr = '';

    serverProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    serverProcess.on('error', (err) => {
      reject(new Error(`Failed to start OpenCode server: ${err.message}`));
    });

    // 서버 시작 대기
    waitForServer(port)
      .then(() => {
        // detached 모드로 실행하여 부모 프로세스와 독립
        serverProcess.unref();
        resolve(serverUrl);
      })
      .catch((err) => {
        reject(new Error(`Server health check failed: ${err.message}\nstdout: ${stdout}\nstderr: ${stderr}`));
      });
  });
}

/**
 * serve 모드를 통한 프롬프트 실행
 *
 * 서버가 없으면 자동으로 시작하고,
 * --attach 옵션으로 서버에 연결하여 실행합니다.
 *
 * @param {string} prompt - 실행할 프롬프트
 * @param {Object} options - 실행 옵션
 * @param {string} options.model - 모델 이름
 * @param {string} options.agent - OpenCode 에이전트 이름
 * @param {string[]} options.files - 첨부할 파일 경로 목록
 * @param {boolean} options.disableUlw - ulw 모드 비활성화 여부
 * @param {number} options.timeout - 타임아웃 (ms, 기본: 5분)
 * @returns {Promise<Object>} 실행 결과
 */
export async function runWithServer(prompt, options = {}) {
  // 서버 확인/시작
  const url = await ensureServer({ port: options.port });

  // ULW 모드 래핑
  const ulwPrompt = wrapWithUlwCommand(prompt, options);

  // 실행 인자 구성
  const args = [
    'run',
    '--attach', url,
    '--format', 'json'
  ];

  if (options.model) {
    args.push('--model', options.model);
  }

  if (options.agent) {
    args.push('--agent', options.agent);
  }

  if (options.files && Array.isArray(options.files)) {
    options.files.forEach(file => {
      args.push('--file', file);
    });
  }

  args.push(ulwPrompt);

  // 실행
  return new Promise((resolve, reject) => {
    const child = spawn('opencode', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const startTime = Date.now();

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;

      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve({
            success: true,
            result,
            duration,
            serverUrl: url
          });
        } catch (err) {
          resolve({
            success: true,
            stdout,
            stderr,
            duration,
            serverUrl: url
          });
        }
      } else {
        reject(new Error(`OpenCode exited with code ${code}\nstderr: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to execute: ${err.message}`));
    });

    // 타임아웃 처리
    const timeout = options.timeout || 5 * 60 * 1000;
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Execution timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', () => {
      clearTimeout(timeoutId);
    });
  });
}

/**
 * OpenCode 서버 종료
 *
 * @returns {Promise<void>}
 */
export async function stopServer() {
  if (!serverProcess) {
    return;
  }

  return new Promise((resolve) => {
    serverProcess.on('close', () => {
      serverProcess = null;
      serverUrl = null;
      resolve();
    });

    serverProcess.kill('SIGTERM');

    // 강제 종료 타임아웃
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL');
        serverProcess = null;
        serverUrl = null;
      }
      resolve();
    }, 5000);
  });
}

/**
 * 서버 상태 조회
 *
 * @returns {Object} 서버 상태 정보
 */
export function getServerStatus() {
  return {
    running: serverProcess !== null,
    port: serverPort,
    url: serverUrl,
    pid: serverProcess ? serverProcess.pid : null
  };
}
