/**
 * cli-runner.mjs - Simplified CLI spawn utility for fusion MCP server
 *
 * Simplified version of src/executor/cli-executor.mjs.
 * Spawns Codex (openai) or Gemini (google) CLI and returns text output.
 */
import { spawn, spawnSync } from 'child_process';

/** Default timeout: 30 seconds */
var DEFAULT_TIMEOUT = 30 * 1000;

/** Model name validation (prevent shell injection) */
var MODEL_NAME_REGEX = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

function validateModelName(model) {
  if (model && !MODEL_NAME_REGEX.test(model)) {
    throw new Error('Invalid model name: ' + model);
  }
}

/**
 * Check if a CLI binary is available in PATH
 * @param {string} name - CLI name ('codex' or 'gemini')
 * @returns {boolean}
 */
export function detectCLI(name) {
  var result = spawnSync('which', [name], { stdio: 'pipe' });
  return result.status === 0;
}

/**
 * Parse JSONL output from Codex CLI and extract text content
 * @param {string} output - JSONL stdout
 * @returns {string}
 */
function parseCodexText(output) {
  var lines = output.trim().split('\n').filter(function(l) { return l.trim(); });
  var messages = [];

  for (var i = 0; i < lines.length; i++) {
    try {
      var event = JSON.parse(lines[i]);

      if (event.type === 'item.completed' && event.item) {
        if (event.item.type === 'agent_message' && event.item.text) {
          messages.push(event.item.text);
        }
      }

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

      if (event.type === 'output_text' && event.text) {
        messages.push(event.text);
      }
    } catch (e) {
      // Non-JSON lines are ignored
    }
  }

  return messages.join('\n') || output;
}

/**
 * Spawn Codex CLI with a prompt
 * @param {string} prompt
 * @param {string|undefined} model
 * @param {number} timeout
 * @returns {Promise<{success: boolean, output: string, error: string|null}>}
 */
function spawnCodex(prompt, model, timeout) {
  return new Promise(function(resolve) {
    var settled = false;
    var args = ['exec', '-m', model || 'gpt-5.2-codex', '--json', '--full-auto'];

    var child = spawn('codex', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    var timeoutHandle = setTimeout(function() {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        resolve({ success: false, output: '', error: 'Codex timed out after ' + timeout + 'ms' });
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
          resolve({ success: true, output: parseCodexText(stdout), error: null });
        } else {
          resolve({ success: false, output: '', error: 'Codex exited with code ' + code + ': ' + (stderr || 'No output').slice(0, 500) });
        }
      }
    });

    child.on('error', function(err) {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({ success: false, output: '', error: 'Failed to spawn Codex CLI: ' + err.message });
      }
    });

    child.stdin.on('error', function() {});
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Spawn Gemini CLI with a prompt
 * @param {string} prompt
 * @param {string|undefined} model
 * @param {number} timeout
 * @returns {Promise<{success: boolean, output: string, error: string|null}>}
 */
function spawnGemini(prompt, model, timeout) {
  return new Promise(function(resolve) {
    var settled = false;
    var args = ['-p=.', '--yolo'];
    if (model) {
      validateModelName(model);
      args.push('--model', model);
    }

    var child = spawn('gemini', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    var timeoutHandle = setTimeout(function() {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        resolve({ success: false, output: '', error: 'Gemini timed out after ' + timeout + 'ms' });
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
          resolve({ success: true, output: stdout.trim(), error: null });
        } else {
          resolve({ success: false, output: '', error: 'Gemini exited with code ' + code + ': ' + (stderr || 'No output').slice(0, 500) });
        }
      }
    });

    child.on('error', function(err) {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({ success: false, output: '', error: 'Failed to spawn Gemini CLI: ' + err.message });
      }
    });

    child.stdin.on('error', function() {});
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Run a CLI provider with a given prompt.
 *
 * @param {object} params
 * @param {string} params.prompt - The prompt text to send
 * @param {'openai'|'google'} params.provider - Which CLI to use
 * @param {string} [params.model] - Model ID (uses CLI default if omitted)
 * @param {number} [params.timeout] - Timeout in ms (default: 30000)
 * @returns {Promise<{success: boolean, output: string, error: string|null, duration: number}>}
 */
export async function runCLI({ prompt, provider, model, timeout }) {
  var startTime = Date.now();
  var ms = timeout || DEFAULT_TIMEOUT;
  var result;

  if (provider === 'google') {
    if (!detectCLI('gemini')) {
      return { success: false, output: '', error: 'Gemini CLI not installed', duration: Date.now() - startTime };
    }
    result = await spawnGemini(prompt, model, ms);
  } else {
    if (!detectCLI('codex')) {
      return { success: false, output: '', error: 'Codex CLI not installed', duration: Date.now() - startTime };
    }
    if (model) validateModelName(model);
    result = await spawnCodex(prompt, model, ms);
  }

  return {
    success: result.success,
    output: result.output || '',
    error: result.error || null,
    duration: Date.now() - startTime
  };
}
