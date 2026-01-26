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
    // 분석 계층
    'architect': 'Oracle',
    'architect-low': 'Flash',
    'architect-medium': 'Oracle',

    // 실행 계층
    'executor': 'Codex',
    'executor-low': 'Flash',
    'executor-high': 'Codex',

    // 탐색 계층
    'explore': 'Flash',
    'explore-medium': 'Oracle',
    'explore-high': 'Oracle',

    // 연구 계층
    'researcher': 'Oracle',
    'researcher-low': 'Flash',

    // 프론트엔드 계층
    'designer': 'Flash',
    'designer-low': 'Flash',
    'designer-high': 'Codex',

    // 기타
    'writer': 'Flash',
    'scientist': 'Oracle',
    'scientist-low': 'Flash',
    'scientist-high': 'Oracle',
    'qa-tester': 'Codex',
    'qa-tester-high': 'Codex',
    'security-reviewer': 'Oracle',
    'build-fixer': 'Codex',
    'tdd-guide': 'Codex',
    'code-reviewer': 'Oracle',
    'planner': 'Oracle',
    'critic': 'Oracle',
    'analyst': 'Oracle',
    'vision': 'Flash'
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

  // 에이전트 타입별 예상 Claude 토큰 절약량
  var savings = {
    'architect': 2000,
    'executor': 1500,
    'executor-high': 3000,
    'explore': 500,
    'researcher': 1500,
    'designer': 1000,
    'writer': 800,
    'scientist': 1500,
    'qa-tester': 1000,
    'planner': 2500,
    'critic': 1500
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
