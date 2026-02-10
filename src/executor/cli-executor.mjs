/**
 * cli-executor.mjs - Codex/Gemini CLI 직접 실행 엔진
 *
 * OpenCode 서버 풀(server-pool.mjs)을 대체합니다.
 * OMC의 codex-core.ts / gemini-core.ts와 동일한 패턴으로
 * CLI 바이너리를 spawn하여 작업을 실행합니다.
 *
 * v2.0.0: OpenCode 서버 풀 → CLI 직접 spawn 전환
 */
import { spawn, spawnSync } from 'child_process';

/** 타임아웃 기본값 (5분) */
var DEFAULT_TIMEOUT = 5 * 60 * 1000;

/** 모델명 유효성 검사 (shell injection 방지) */
var MODEL_NAME_REGEX = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

function validateModelName(model) {
  if (model && !MODEL_NAME_REGEX.test(model)) {
    throw new Error('Invalid model name: ' + model);
  }
}

/**
 * CLI 설치 여부 확인
 * @param {string} name - CLI 이름 ('codex' 또는 'gemini')
 * @returns {boolean}
 */
export function detectCLI(name) {
  var result = spawnSync('which', [name], { stdio: 'pipe' });
  return result.status === 0;
}

/**
 * Codex CLI JSONL 출력에서 텍스트 추출
 * @param {string} output - JSONL stdout
 * @returns {string} - 추출된 텍스트
 */
function parseCodexText(output) {
  var lines = output.trim().split('\n').filter(function(l) { return l.trim(); });
  var messages = [];

  for (var i = 0; i < lines.length; i++) {
    try {
      var event = JSON.parse(lines[i]);

      // item.completed → agent_message (Codex v0.98.0 형식)
      if (event.type === 'item.completed' && event.item) {
        if (event.item.type === 'agent_message' && event.item.text) {
          messages.push(event.item.text);
        }
      }

      // message 이벤트 (대체 형식)
      if (event.type === 'message' && event.content) {
        if (typeof event.content === 'string') {
          messages.push(event.content);
        } else if (Array.isArray(event.content)) {
          for (var j = 0; j < event.content.length; j++) {
            if (event.content[j].type === 'text' && event.content[j].text) {
              messages.push(event.content[j].text);
            }
          }
        }
      }

      // output_text 이벤트 (대체 형식)
      if (event.type === 'output_text' && event.text) {
        messages.push(event.text);
      }
    } catch (e) {
      // JSON이 아닌 줄은 무시
    }
  }

  return messages.join('\n') || output;
}

/**
 * Codex CLI JSONL 출력에서 토큰 사용량 추출
 * turn.completed 이벤트의 usage 필드에서 추출
 * @param {string} output - JSONL stdout
 * @returns {object|null} - { input, output, reasoning, cacheRead }
 */
function parseCodexTokens(output) {
  var lines = output.trim().split('\n').filter(function(l) { return l.trim(); });

  for (var i = lines.length - 1; i >= 0; i--) {
    try {
      var event = JSON.parse(lines[i]);
      if (event.type === 'turn.completed' && event.usage) {
        return {
          input: event.usage.input_tokens || 0,
          output: event.usage.output_tokens || 0,
          reasoning: event.usage.reasoning_tokens || 0,
          cacheRead: event.usage.cached_input_tokens || 0
        };
      }
    } catch (e) {
      // 무시
    }
  }

  return null;
}

/**
 * Codex CLI 실행
 * @param {object} params - { prompt, model, timeout, cwd }
 * @returns {Promise<object>} - { success, output, tokens, error }
 */
function executeCodex(params) {
  return new Promise(function(resolve) {
    var model = params.model || 'gpt-5.2-codex';
    var timeout = params.timeout || DEFAULT_TIMEOUT;
    var cwd = params.cwd || process.cwd();

    validateModelName(model);

    var settled = false;
    var args = ['exec', '-m', model, '--json', '--full-auto'];

    var child = spawn('codex', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: cwd
    });

    var timeoutHandle = setTimeout(function() {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        resolve({ success: false, output: '', tokens: null, error: 'Codex timed out after ' + timeout + 'ms' });
      }
    }, timeout);

    var stdout = '';
    var stderr = '';

    child.stdout.on('data', function(data) { stdout += data.toString(); });
    child.stderr.on('data', function(data) { stderr += data.toString(); });

    child.on('close', function(code) {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutHandle);

        if (code === 0 || stdout.trim()) {
          var text = parseCodexText(stdout);
          var tokens = parseCodexTokens(stdout);
          resolve({
            success: true,
            output: text,
            tokens: tokens,
            error: null
          });
        } else {
          resolve({
            success: false,
            output: '',
            tokens: null,
            error: 'Codex exited with code ' + code + ': ' + (stderr || 'No output').slice(0, 500)
          });
        }
      }
    });

    child.on('error', function(err) {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({ success: false, output: '', tokens: null, error: 'Failed to spawn Codex CLI: ' + err.message });
      }
    });

    child.stdin.on('error', function() {
      // stdin 쓰기 에러 무시 (프로세스가 이미 종료된 경우)
    });

    child.stdin.write(params.prompt || '');
    child.stdin.end();
  });
}

/**
 * Gemini CLI 실행
 * @param {object} params - { prompt, model, timeout, cwd }
 * @returns {Promise<object>} - { success, output, tokens, error }
 */
function executeGemini(params) {
  return new Promise(function(resolve) {
    var model = params.model || '';
    var timeout = params.timeout || DEFAULT_TIMEOUT;
    var cwd = params.cwd || process.cwd();

    if (model) validateModelName(model);

    var settled = false;
    var args = ['-p=.', '--yolo'];
    if (model) {
      args.push('--model', model);
    }

    var child = spawn('gemini', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: cwd
    });

    var timeoutHandle = setTimeout(function() {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        resolve({ success: false, output: '', tokens: null, error: 'Gemini timed out after ' + timeout + 'ms' });
      }
    }, timeout);

    var stdout = '';
    var stderr = '';

    child.stdout.on('data', function(data) { stdout += data.toString(); });
    child.stderr.on('data', function(data) { stderr += data.toString(); });

    child.on('close', function(code) {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutHandle);

        if (code === 0 || stdout.trim()) {
          // Gemini CLI는 토큰을 직접 반환하지 않음 → 추정
          var promptLen = (params.prompt || '').length;
          var outputLen = stdout.length;
          resolve({
            success: true,
            output: stdout.trim(),
            tokens: {
              input: Math.ceil(promptLen / 4),
              output: Math.ceil(outputLen / 4),
              reasoning: 0,
              cacheRead: 0
            },
            error: null
          });
        } else {
          resolve({
            success: false,
            output: '',
            tokens: null,
            error: 'Gemini exited with code ' + code + ': ' + (stderr || 'No output').slice(0, 500)
          });
        }
      }
    });

    child.on('error', function(err) {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({ success: false, output: '', tokens: null, error: 'Failed to spawn Gemini CLI: ' + err.message });
      }
    });

    child.stdin.on('error', function() {
      // stdin 쓰기 에러 무시
    });

    child.stdin.write(params.prompt || '');
    child.stdin.end();
  });
}

/**
 * CLI를 통해 작업 실행 (메인 인터페이스)
 *
 * @param {object} params
 * @param {string} params.prompt - 프롬프트 텍스트
 * @param {string} params.provider - 'openai'|'gpt'|'google'|'gemini'
 * @param {string} [params.model] - 모델 ID (CLI 기본값 사용 시 생략)
 * @param {string} [params.agent] - 에이전트 이름 (로깅용)
 * @param {number} [params.timeout] - 타임아웃 (ms)
 * @param {string} [params.cwd] - 작업 디렉토리
 * @returns {Promise<object>} - { success, output, tokens, error, duration, provider }
 */
export async function executeViaCLI(params) {
  var provider = params.provider || 'openai';
  var startTime = Date.now();
  var result;

  var isGemini = provider === 'google' || provider === 'gemini';

  if (isGemini) {
    // Gemini CLI 존재 확인
    if (!detectCLI('gemini')) {
      // Gemini 미설치 → Codex로 폴백
      console.error('[OMCM CLI] Gemini CLI not found, falling back to Codex');
      result = await executeCodex({
        prompt: params.prompt,
        model: params.model || 'gpt-5.2-codex',
        timeout: params.timeout,
        cwd: params.cwd
      });
      result.fallbackProvider = 'codex';
    } else {
      result = await executeGemini({
        prompt: params.prompt,
        model: params.model,
        timeout: params.timeout,
        cwd: params.cwd
      });
    }
  } else {
    // Codex CLI 존재 확인
    if (!detectCLI('codex')) {
      return {
        success: false,
        output: '',
        tokens: null,
        error: 'Codex CLI not installed',
        duration: Date.now() - startTime,
        provider: provider
      };
    }

    result = await executeCodex({
      prompt: params.prompt,
      model: params.model,
      timeout: params.timeout,
      cwd: params.cwd
    });
  }

  return {
    success: result.success,
    output: result.output || '',
    tokens: result.tokens || null,
    error: result.error || null,
    duration: Date.now() - startTime,
    provider: result.fallbackProvider || provider
  };
}
