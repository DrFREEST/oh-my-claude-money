/**
 * servers/fusion/index.mjs - True Multi-model Fusion MCP tools
 *
 * Registers 3 MCP tools:
 *   omcm_fusion_analyze     - Parallel Codex + Gemini analysis with synthesis
 *   omcm_fusion_ask_codex   - Single Codex CLI call
 *   omcm_fusion_ask_gemini  - Single Gemini CLI call
 */
import { z } from 'zod';
import { runCLI } from '../../shared/cli-runner.mjs';
import { buildCodexPrompt, buildGeminiPrompt, mergeResults } from './merger.mjs';

/**
 * Register all fusion tools on the MCP server instance.
 *
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function registerFusionTools(server) {
  // ─────────────────────────────────────────────
  // Tool 1: omcm_fusion_analyze
  // ─────────────────────────────────────────────
  server.tool(
    'omcm_fusion_analyze',
    'Run Codex and Gemini in parallel on the same query with specialized sub-prompts (Codex=code/security/performance, Gemini=design/alternatives/maintainability), then return a structured synthesis.',
    {
      query: z.string().describe('The analysis query or question'),
      context: z.string().optional().describe('Optional code snippet, file content, or additional context'),
      focus: z.enum(['code', 'design', 'both']).optional().default('both').describe('Analysis focus: code (logic/security/perf), design (patterns/alternatives), or both'),
      timeout: z.number().optional().default(30000).describe('Per-model timeout in milliseconds (default: 30000)')
    },
    async ({ query, context, focus, timeout }) => {
      var totalStart = Date.now();
      var focusValue = focus || 'both';
      var timeoutMs = timeout || 30000;

      var codexPrompt = buildCodexPrompt(query, context, focusValue);
      var geminiPrompt = buildGeminiPrompt(query, context, focusValue);

      // Run both CLIs in parallel; allow individual failures
      var [codexSettled, geminiSettled] = await Promise.allSettled([
        runCLI({ prompt: codexPrompt, provider: 'openai', timeout: timeoutMs }),
        runCLI({ prompt: geminiPrompt, provider: 'google', timeout: timeoutMs })
      ]);

      var codexResult = codexSettled.status === 'fulfilled'
        ? codexSettled.value
        : { success: false, output: '', error: String(codexSettled.reason), duration: 0 };

      var geminiResult = geminiSettled.status === 'fulfilled'
        ? geminiSettled.value
        : { success: false, output: '', error: String(geminiSettled.reason), duration: 0 };

      var synthesis = mergeResults(codexResult, geminiResult, query);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              codex: {
                analysis: codexResult.output || '',
                success: codexResult.success
              },
              gemini: {
                analysis: geminiResult.output || '',
                success: geminiResult.success
              },
              synthesis: synthesis,
              duration: {
                codex: codexResult.duration || 0,
                gemini: geminiResult.duration || 0,
                total: Date.now() - totalStart
              }
            }, null, 2)
          }
        ]
      };
    }
  );

  // ─────────────────────────────────────────────
  // Tool 2: omcm_fusion_ask_codex
  // ─────────────────────────────────────────────
  server.tool(
    'omcm_fusion_ask_codex',
    'Send a query directly to Codex CLI. Use role="oracle" for open-ended analysis, role="build" for build/fix tasks.',
    {
      query: z.string().describe('The question or task for Codex'),
      context: z.string().optional().describe('Optional additional context or code'),
      role: z.enum(['oracle', 'build']).optional().default('oracle').describe('oracle=analysis mode, build=code generation/fix mode')
    },
    async ({ query, context, role }) => {
      var startTime = Date.now();
      var rolePrefix = role === 'build'
        ? 'You are a code generation and build expert. Produce working, correct code or fixes.\n\n'
        : 'You are a code analysis oracle. Provide detailed, accurate technical analysis.\n\n';

      var parts = [rolePrefix + 'Query: ' + query];
      if (context && context.trim()) {
        parts.push('\nContext:\n' + context.trim());
      }
      var prompt = parts.join('');

      var result = await runCLI({ prompt: prompt, provider: 'openai' });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              response: result.output || '',
              success: result.success,
              duration: result.duration || (Date.now() - startTime),
              error: result.error || null
            }, null, 2)
          }
        ]
      };
    }
  );

  // ─────────────────────────────────────────────
  // Tool 3: omcm_fusion_ask_gemini
  // ─────────────────────────────────────────────
  server.tool(
    'omcm_fusion_ask_gemini',
    'Send a query directly to Gemini CLI. Best for design, documentation, UX, and creative analysis.',
    {
      query: z.string().describe('The question or task for Gemini'),
      context: z.string().optional().describe('Optional additional context or content')
    },
    async ({ query, context }) => {
      var startTime = Date.now();

      var parts = ['Query: ' + query];
      if (context && context.trim()) {
        parts.push('\nContext:\n' + context.trim());
      }
      var prompt = parts.join('');

      var result = await runCLI({ prompt: prompt, provider: 'google' });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              response: result.output || '',
              success: result.success,
              duration: result.duration || (Date.now() - startTime),
              error: result.error || null
            }, null, 2)
          }
        ]
      };
    }
  );
}
