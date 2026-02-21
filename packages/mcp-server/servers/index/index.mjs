/**
 * index.mjs — MCP tool registration for Semantic Code Index (무기 2).
 *
 * Registers 4 tools:
 *   omcm_index_build   — index a project
 *   omcm_index_search  — search indexed symbols
 *   omcm_index_update  — incremental re-index of changed files
 *   omcm_index_status  — check index freshness
 */

import { z } from 'zod';
import { indexProject, updateIndex, getIndexStatus } from './indexer.mjs';
import { searchCode } from './searcher.mjs';

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

/**
 * Register all Semantic Code Index tools on an McpServer instance.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function registerIndexTools(server) {

  // -------------------------------------------------------------------------
  // omcm_index_build
  // -------------------------------------------------------------------------
  server.tool(
    'omcm_index_build',
    'Index a project codebase for semantic code search. Call this once per project (or after large changes). Returns count of indexed files and symbols.',
    {
      project_path: z.string().describe('Absolute path to the project root to index'),
      patterns: z.array(z.string()).optional().describe(
        "Glob patterns for files to include. Defaults to ['**/*.ts','**/*.js','**/*.mjs','**/*.py','**/*.go']"
      ),
      exclude: z.array(z.string()).optional().describe(
        "Glob patterns to exclude. Defaults to node_modules, .git, dist, build"
      ),
    },
    async ({ project_path, patterns, exclude }) => {
      try {
        const result = await indexProject({
          projectPath: project_path,
          patterns,
          exclude,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // omcm_index_search
  // -------------------------------------------------------------------------
  server.tool(
    'omcm_index_search',
    'Search indexed code symbols using full-text and name matching. Returns file locations, symbol names, and code snippets ranked by relevance.',
    {
      query: z.string().describe('Search query — can be a symbol name, keyword, or natural language description'),
      project_path: z.string().optional().describe('Absolute path to project root. Defaults to current working directory.'),
      limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results to return (default: 10)'),
      include_context: z.boolean().optional().describe('Include surrounding code lines as snippet (default: true)'),
    },
    async ({ query, project_path, limit, include_context }) => {
      try {
        const result = await searchCode({
          query,
          projectPath: project_path,
          limit: limit ?? 10,
          includeContext: include_context ?? true,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // omcm_index_update
  // -------------------------------------------------------------------------
  server.tool(
    'omcm_index_update',
    'Incrementally re-index only changed files in an already-indexed project. Much faster than a full rebuild.',
    {
      project_path: z.string().describe('Absolute path to the project root'),
      changed_files: z.array(z.string()).describe('List of file paths (relative to project_path) that have changed'),
    },
    async ({ project_path, changed_files }) => {
      try {
        const result = await updateIndex({
          projectPath: project_path,
          changedFiles: changed_files,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // omcm_index_status
  // -------------------------------------------------------------------------
  server.tool(
    'omcm_index_status',
    'Check whether a project has been indexed and how fresh the index is. Returns stale file list so you know what needs updating.',
    {
      project_path: z.string().optional().describe('Absolute path to project root. Defaults to current working directory.'),
    },
    ({ project_path }) => {
      try {
        const result = getIndexStatus({
          projectPath: project_path || process.cwd(),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: err.message }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
