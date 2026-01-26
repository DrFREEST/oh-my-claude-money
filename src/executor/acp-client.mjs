/**
 * acp-client.mjs - ACP (Agent Client Protocol) 클라이언트 모듈
 *
 * OpenCode의 ACP 모드를 통한 실시간 양방향 통신을 관리합니다.
 * stdin/stdout 기반 nd-JSON 프로토콜로 복잡한 멀티턴 대화를 지원합니다.
 *
 * 사용 시나리오:
 * - 실시간 양방향 통신
 * - 복잡한 멀티턴 대화
 * - 세밀한 제어가 필요한 경우
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import { wrapWithUlwCommand } from './opencode-executor.mjs';

/**
 * ACP 클라이언트 클래스
 *
 * OpenCode의 ACP 모드와 통신하는 클라이언트입니다.
 * stdin/stdout으로 newline-delimited JSON 메시지를 주고받습니다.
 *
 * @extends EventEmitter
 */
export class ACPClient extends EventEmitter {
  constructor() {
    super();

    /**
     * OpenCode 프로세스
     * @type {ChildProcess|null}
     */
    this.process = null;

    /**
     * 메시지 ID 카운터
     * @type {number}
     */
    this.messageId = 0;

    /**
     * 대기 중인 요청 맵 (messageId -> Promise handlers)
     * @type {Map<number, {resolve: Function, reject: Function, timeout: NodeJS.Timeout}>}
     */
    this.pendingRequests = new Map();

    /**
     * 연결 상태
     * @type {boolean}
     */
    this.connected = false;

    /**
     * readline 인터페이스
     * @type {Interface|null}
     */
    this.readline = null;
  }

  /**
   * ACP 클라이언트 연결
   *
   * opencode acp 프로세스를 시작하고 stdin/stdout 연결을 초기화합니다.
   *
   * @param {Object} options - 연결 옵션
   * @param {string} options.cwd - 작업 디렉토리
   * @param {number} options.timeout - 연결 타임아웃 (ms, 기본: 10초)
   * @returns {Promise<void>}
   */
  async connect(options = {}) {
    if (this.connected) {
      throw new Error('Already connected');
    }

    return new Promise((resolve, reject) => {
      // opencode acp 프로세스 시작
      this.process = spawn('opencode', ['acp'], {
        cwd: options.cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // stdout에서 nd-JSON 메시지 읽기
      this.readline = createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity
      });

      this.readline.on('line', (line) => {
        try {
          const msg = JSON.parse(line);
          this.handleMessage(msg);
        } catch (err) {
          this.emit('error', new Error(`Failed to parse message: ${err.message}\nLine: ${line}`));
        }
      });

      // stderr 로깅
      this.process.stderr.on('data', (data) => {
        this.emit('stderr', data.toString());
      });

      // 프로세스 에러 핸들링
      this.process.on('error', (err) => {
        this.connected = false;
        reject(new Error(`Failed to spawn ACP process: ${err.message}`));
      });

      // 프로세스 종료 핸들링
      this.process.on('close', (code) => {
        this.connected = false;
        this.emit('close', code);

        // 대기 중인 모든 요청 거부
        this.pendingRequests.forEach((pending) => {
          clearTimeout(pending.timeout);
          pending.reject(new Error('ACP process closed'));
        });
        this.pendingRequests.clear();
      });

      // 연결 완료 이벤트 대기
      const connectTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, options.timeout || 10000);

      // 첫 메시지 (ready) 대기
      const onReady = (msg) => {
        if (msg.type === 'ready') {
          clearTimeout(connectTimeout);
          this.connected = true;
          this.removeListener('message', onReady);
          resolve();
        }
      };

      this.on('message', onReady);
    });
  }

  /**
   * 프롬프트 전송
   *
   * @param {string} prompt - 전송할 프롬프트
   * @param {Object} options - 전송 옵션
   * @param {string} options.model - 모델 이름
   * @param {string[]} options.files - 첨부할 파일 경로 목록
   * @param {boolean} options.disableUlw - ulw 모드 비활성화 여부
   * @param {number} options.timeout - 응답 타임아웃 (ms, 기본: 5분)
   * @param {boolean} options.stream - 스트리밍 응답 여부
   * @returns {Promise<Object>} 응답 메시지
   */
  async send(prompt, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    // ULW 모드 래핑
    const ulwPrompt = wrapWithUlwCommand(prompt, options);

    const id = ++this.messageId;
    const message = {
      id,
      type: 'prompt',
      content: ulwPrompt
    };

    // 옵션 추가
    if (options.model) {
      message.model = options.model;
    }

    if (options.files && Array.isArray(options.files)) {
      message.files = options.files;
    }

    if (options.stream) {
      message.stream = true;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out`));
      }, options.timeout || 5 * 60 * 1000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      // 메시지 전송
      try {
        this.process.stdin.write(JSON.stringify(message) + '\n');
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to send message: ${err.message}`));
      }
    });
  }

  /**
   * 메시지 핸들러
   *
   * OpenCode로부터 받은 메시지를 처리합니다.
   *
   * @param {Object} msg - 수신한 메시지
   */
  handleMessage(msg) {
    this.emit('message', msg);

    // 응답 메시지 처리
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const pending = this.pendingRequests.get(msg.id);
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(msg.id);

      if (msg.type === 'response' || msg.type === 'result') {
        pending.resolve(msg);
      } else if (msg.type === 'error') {
        pending.reject(new Error(msg.error || 'Unknown error'));
      }
    }

    // 스트리밍 메시지 처리
    if (msg.type === 'stream') {
      this.emit('stream', msg);
    }
  }

  /**
   * 연결 종료
   *
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.connected) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        this.connected = false;
        resolve();
        return;
      }

      this.process.on('close', () => {
        this.connected = false;
        this.process = null;
        this.readline = null;
        resolve();
      });

      // 정상 종료 메시지 전송
      try {
        this.process.stdin.write(JSON.stringify({ type: 'close' }) + '\n');
        this.process.stdin.end();
      } catch (err) {
        // stdin 쓰기 실패 시 강제 종료
        this.process.kill('SIGTERM');
      }

      // 강제 종료 타임아웃
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
          this.connected = false;
          this.process = null;
          this.readline = null;
        }
        resolve();
      }, 5000);
    });
  }

  /**
   * 연결 상태 조회
   *
   * @returns {boolean} 연결 여부
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 대기 중인 요청 수 조회
   *
   * @returns {number} 대기 중인 요청 수
   */
  getPendingRequestCount() {
    return this.pendingRequests.size;
  }
}

/**
 * ACP 클라이언트 싱글톤 인스턴스
 * @type {ACPClient|null}
 */
let globalClient = null;

/**
 * 글로벌 ACP 클라이언트 가져오기 (싱글톤)
 *
 * @returns {ACPClient} ACP 클라이언트 인스턴스
 */
export function getACPClient() {
  if (!globalClient) {
    globalClient = new ACPClient();
  }
  return globalClient;
}

/**
 * 글로벌 ACP 클라이언트 재설정
 *
 * 기존 클라이언트를 종료하고 새 인스턴스를 생성합니다.
 *
 * @returns {Promise<ACPClient>} 새 ACP 클라이언트 인스턴스
 */
export async function resetACPClient() {
  if (globalClient && globalClient.isConnected()) {
    await globalClient.disconnect();
  }
  globalClient = new ACPClient();
  return globalClient;
}
