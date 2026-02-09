/**
 * opencode-executor.mjs - OpenCode CLI 실행 모듈
 *
 * OpenCode CLI를 통한 작업 실행을 관리합니다.
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const OMCM_DIR = join(process.env.HOME || '', '.omcm');

/**
 * OpenCode ULW 모드 프롬프트 래핑
 * 핵심: 모든 OpenCode 호출에 /ulw 커맨드를 포함시켜 최대 성능 모드 활성화
 *
 * @param {string} prompt - 원본 프롬프트
 * @param {Object} options - 옵션
 * @param {boolean} options.disableUlw - true면 ulw 래핑 비활성화
 * @returns {string} /ulw가 포함된 프롬프트
 */
export function wrapWithUlwCommand(prompt, options) {
  options = options || {};

  // ulw 모드 비활성화 옵션이 있으면 원본 반환
  if (options.disableUlw) {
    return prompt;
  }

  // 이미 /ulw 또는 /ultrawork가 포함되어 있으면 그대로 사용
  if (prompt.includes('/ulw') || prompt.includes('/ultrawork')) {
    return prompt;
  }

  // /ulw 커맨드를 프롬프트 앞에 추가
  return '/ulw ' + prompt;
}

/**
 * OMCM 디렉토리 존재 확인 및 생성
 */
function ensureOmcmDir() {
  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }
}

/**
 * OpenCode 설치 및 인증 상태 확인
 */
export async function checkOpenCodeStatus() {
  return new Promise(function(resolve) {
    var child = spawn('opencode', ['auth', 'status'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    var stdout = '';
    child.stdout.on('data', function(data) {
      stdout += data.toString();
    });

    child.on('close', function(code) {
      resolve({
        installed: true,
        authenticated: code === 0,
        output: stdout
      });
    });

    child.on('error', function() {
      resolve({
        installed: false,
        authenticated: false,
        output: ''
      });
    });
  });
}

/**
 * OpenCode를 통해 프롬프트 실행
 *
 * @param {Object} options - 실행 옵션
 * @param {string} options.prompt - 실행할 프롬프트
 * @param {string} options.agent - OpenCode 에이전트 이름 (기본: 'Codex')
 * @param {string} options.cwd - 작업 디렉토리 (기본: process.cwd())
 * @param {number} options.timeout - 타임아웃 (기본: 5분)
 * @param {Function} options.onOutput - 출력 콜백
 * @returns {Promise<Object>} 실행 결과
 */
export async function executeOpenCode(options) {
  var prompt = options.prompt;
  var agent = options.agent || 'Codex';
  var cwd = options.cwd || process.cwd();
  var timeout = options.timeout || 5 * 60 * 1000;  // 5분 기본
  var onOutput = options.onOutput;
  var enableUlw = options.enableUlw !== false;  // 기본 활성화

  // ⭐ 핵심: ULW 모드 활성화를 위한 커맨드 래핑
  if (enableUlw) {
    prompt = wrapWithUlwCommand(prompt, { disableUlw: options.disableUlw });
  }

  return new Promise(function(resolve) {
    var args = ['-a', agent];

    var child = spawn('opencode', args, {
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: Object.assign({}, process.env, {
        OPENCODE_NON_INTERACTIVE: '1',
        OPENCODE_AGENT: agent
      })
    });

    var stdout = '';
    var stderr = '';
    var startTime = Date.now();

    child.stdout.on('data', function(data) {
      var chunk = data.toString();
      stdout += chunk;
      if (onOutput) {
        onOutput(chunk);
      }
    });

    child.stderr.on('data', function(data) {
      stderr += data.toString();
    });

    child.on('close', function(code) {
      var duration = Date.now() - startTime;
      resolve({
        success: code === 0,
        exitCode: code,
        stdout: stdout,
        stderr: stderr,
        duration: duration,
        agent: agent
      });
    });

    child.on('error', function(err) {
      resolve({
        success: false,
        error: err.message,
        stdout: stdout,
        stderr: stderr,
        duration: Date.now() - startTime,
        agent: agent
      });
    });

    // 프롬프트 전송
    child.stdin.write(prompt);
    child.stdin.end();

    // 타임아웃 처리
    var timeoutId = setTimeout(function() {
      child.kill('SIGTERM');
    }, timeout);

    child.on('close', function() {
      clearTimeout(timeoutId);
    });
  });
}

/**
 * OMC 서브에이전트 타입을 OpenCode 에이전트로 매핑
 *
 * @param {string} subagentType - OMC 서브에이전트 타입
 * @returns {string} OpenCode 에이전트 이름
 */
export function mapToOpenCodeAgent(subagentType) {
  var type = subagentType.replace('oh-my-claudecode:', '');

  var mapping = {
    // Build/Analysis Lane
    'architect': 'Oracle',
    'executor': 'Codex',
    'explore': 'Flash',
    'debugger': 'Oracle',
    'verifier': 'Codex',
    'deep-executor': 'Codex',
    'git-master': 'Codex',

    // Review Lane
    'security-reviewer': 'Oracle',
    'code-reviewer': 'Oracle',
    'style-reviewer': 'Flash',
    'quality-reviewer': 'Oracle',
    'api-reviewer': 'Oracle',
    'performance-reviewer': 'Oracle',

    // Testing Lane
    'qa-tester': 'Codex',
    'test-engineer': 'Codex',

    // Domain Lane
    'scientist': 'Oracle',
    'dependency-expert': 'Oracle',
    'designer': 'Flash',
    'writer': 'Flash',
    'vision': 'Flash',
    'quality-strategist': 'Oracle',

    // Product Lane
    'planner': 'Oracle',
    'critic': 'Oracle',
    'analyst': 'Oracle',
    'product-manager': 'Oracle',
    'ux-researcher': 'Flash',
    'information-architect': 'Oracle',
    'product-analyst': 'Oracle',

    // Backward-compat aliases
    'researcher': 'Oracle',
    'tdd-guide': 'Codex',
  };

  return mapping[type] || 'Codex';
}

/**
 * 에이전트 타입별 예상 토큰 절약량 조회
 *
 * @param {string} subagentType - OMC 서브에이전트 타입
 * @returns {number} 예상 절약 토큰 수
 */
export function getTokenSavings(subagentType) {
  var type = subagentType.replace('oh-my-claudecode:', '');

  // 에이전트 타입별 예상 Claude 토큰 절약량 (OMC 4.1.7)
  var savings = {
    'architect': 2000,
    'executor': 1500,
    'deep-executor': 3000,
    'explore': 500,
    'dependency-expert': 1500,
    'researcher': 1500,
    'designer': 1000,
    'writer': 800,
    'scientist': 1500,
    'qa-tester': 1000,
    'planner': 2500,
    'critic': 1500,
    'debugger': 2000,
    'verifier': 1000,
    'test-engineer': 1000,
    'code-reviewer': 1500,
    'security-reviewer': 1500
  };

  return savings[type] || 1000;
}

/**
 * 라우팅 로그 기록
 *
 * @param {Object} decision - 라우팅 결정 정보
 */
export function logRouting(decision) {
  ensureOmcmDir();

  var routingLogFile = join(OMCM_DIR, 'routing-log.jsonl');
  var entry = {
    timestamp: new Date().toISOString(),
    toolName: decision.toolName,
    subagentType: decision.subagentType,
    decision: decision.decision,
    reason: decision.reason,
    target: decision.target
  };

  var line = JSON.stringify(entry) + '\n';

  try {
    var fs = require('fs');
    var fd = fs.openSync(routingLogFile, 'a');
    fs.writeSync(fd, line);
    fs.closeSync(fd);
  } catch (e) {
    // 로깅 실패 무시
  }
}

export { OMCM_DIR };
