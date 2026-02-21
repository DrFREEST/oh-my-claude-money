/**
 * MCP tool registration for Cross-session Learning (무기 3).
 *
 * Registers 5 tools:
 *   omcm_memory_remember
 *   omcm_memory_recall
 *   omcm_memory_forget
 *   omcm_memory_summarize_session
 *   omcm_memory_project_knowledge
 */

import { z } from 'zod';
import { hashPath } from '../../shared/sqlite.mjs';
import {
  initDb,
  insertKnowledge,
  searchKnowledge,
  deleteKnowledge,
  listKnowledge,
  updateAccess,
} from './db.mjs';

// Lazily initialized singleton DB connection
let _db = null;

function getDb() {
  if (!_db) {
    _db = initDb();
  }
  return _db;
}

/**
 * Resolve scope string from user-facing parameters.
 * - scope='global'   -> 'global'
 * - scope='session'  -> 'session'
 * - scope='project' + project_path -> 'project:{hash}'
 * - default          -> 'project:{hash}' if project_path provided, else 'global'
 *
 * @param {string|undefined} scope
 * @param {string|undefined} project_path
 * @returns {string}
 */
function resolveScope(scope, project_path) {
  if (scope === 'global') return 'global';
  if (scope === 'session') return 'session';
  if (project_path) {
    return 'project:' + hashPath(project_path);
  }
  return 'global';
}

/**
 * Derive expires_at for session-scoped items (24h TTL).
 * @param {string} scope
 * @returns {string|null}
 */
function sessionExpiresAt(scope) {
  if (scope === 'session') {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toISOString();
  }
  return null;
}

/**
 * Auto-classify content lines into knowledge items.
 * Looks for simple heuristic markers in the session summary.
 *
 * @param {string} text
 * @param {string} scope
 * @returns {Array<{key: string, content: string, category: string, scope: string}>}
 */
function autoExtractItems(text, scope) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];

  const categoryPatterns = [
    { re: /^(pattern|패턴)[:\s]+(.+)/i,   category: 'pattern' },
    { re: /^(decision|결정|선택)[:\s]+(.+)/i, category: 'decision' },
    { re: /^(solution|해결|fix)[:\s]+(.+)/i, category: 'solution' },
    { re: /^(prefer|선호)[:\s]+(.+)/i,    category: 'preference' },
  ];

  lines.forEach((line, idx) => {
    for (const { re, category } of categoryPatterns) {
      const m = line.match(re);
      if (m) {
        const content = m[2].trim();
        const key = category + ':' + idx + ':' + content.slice(0, 40).replace(/\s+/g, '-');
        items.push({ key, content, category, scope });
        return;
      }
    }
  });

  // If no patterns matched, store the whole summary as a single 'decision' item
  if (items.length === 0 && text.trim()) {
    const key = 'session-summary:' + Date.now();
    items.push({ key, content: text.trim(), category: 'decision', scope });
  }

  return items;
}

/**
 * Register all omcm_memory_* tools onto the MCP server.
 *
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function registerMemoryTools(server) {

  // ── omcm_memory_remember ──────────────────────────────────────────────────
  server.tool(
    'omcm_memory_remember',
    'Store a knowledge item that persists across sessions. Use scope="global" for user-wide preferences, scope="project" with project_path for project-specific knowledge, scope="session" for temporary (24h) context.',
    {
      key:          z.string().describe('Unique key for this knowledge item (overwritten if same key+scope exists)'),
      content:      z.string().describe('The knowledge content to store'),
      category:     z.enum(['pattern', 'decision', 'solution', 'preference']).optional()
                     .describe('Classification: pattern|decision|solution|preference'),
      scope:        z.enum(['global', 'project', 'session']).optional()
                     .describe('Storage scope: global|project|session (default: project if project_path given, else global)'),
      project_path: z.string().optional().describe('Absolute project path (required when scope=project)'),
      tags:         z.array(z.string()).optional().describe('Search tags'),
    },
    async ({ key, content, category, scope, project_path, tags }) => {
      const db = getDb();
      const resolvedScope = resolveScope(scope, project_path);
      const expires_at = sessionExpiresAt(resolvedScope);

      const result = insertKnowledge(db, {
        key,
        content,
        category,
        scope: resolvedScope,
        tags,
        expires_at,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ id: result.id, created_at: result.created_at, scope: resolvedScope }),
        }],
      };
    }
  );

  // ── omcm_memory_recall ────────────────────────────────────────────────────
  server.tool(
    'omcm_memory_recall',
    'Search stored knowledge using full-text search. Returns best matches sorted by relevance.',
    {
      query:        z.string().describe('Natural language or keyword search query'),
      scope:        z.enum(['all', 'global', 'project', 'session']).optional()
                     .describe('Scope filter: all|global|project|session'),
      project_path: z.string().optional().describe('Project path (used when scope=project)'),
      limit:        z.number().int().min(1).max(50).optional().default(5)
                     .describe('Max results to return (default: 5)'),
      min_score:    z.number().min(0).max(1).optional()
                     .describe('Minimum relevance score 0-1 (optional)'),
    },
    async ({ query, scope, project_path, limit, min_score }) => {
      const db = getDb();

      let resolvedScope = null;
      if (scope && scope !== 'all') {
        resolvedScope = resolveScope(scope, project_path);
      }

      const rows = searchKnowledge(db, query, resolvedScope, limit || 5);

      // Update access tracking for returned rows
      for (const row of rows) {
        updateAccess(db, row.id);
      }

      const results = rows.map(row => ({
        key:           row.key,
        content:       row.content,
        category:      row.category,
        scope:         row.scope,
        score:         row.rank !== null ? Math.abs(row.rank) : null,
        created_at:    row.created_at,
        last_accessed: row.accessed_at,
        access_count:  row.access_count,
        tags:          row.tags ? JSON.parse(row.tags) : [],
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ results, total: results.length }),
        }],
      };
    }
  );

  // ── omcm_memory_forget ────────────────────────────────────────────────────
  server.tool(
    'omcm_memory_forget',
    'Delete knowledge items. Specify key for exact deletion, older_than for date-based cleanup, and/or scope to limit the deletion.',
    {
      key:        z.string().optional().describe('Exact key to delete'),
      older_than: z.string().optional().describe('ISO 8601 date — delete items updated before this date'),
      scope:      z.string().optional().describe('Limit deletion to this scope (e.g. "global", "project:{hash}", "session")'),
    },
    async ({ key, older_than, scope }) => {
      const db = getDb();
      const result = deleteKnowledge(db, key || null, older_than || null, scope || null);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ deleted: result.deleted }),
        }],
      };
    }
  );

  // ── omcm_memory_summarize_session ─────────────────────────────────────────
  server.tool(
    'omcm_memory_summarize_session',
    'Save key learnings from the current session. When auto_extract=true the server classifies lines prefixed with "pattern:", "decision:", "solution:", or "preference:" into the appropriate categories automatically.',
    {
      session_summary: z.string().describe('Free-form session summary text'),
      project_path:    z.string().optional().describe('Project path for scoping saved items'),
      auto_extract:    z.boolean().optional().default(true)
                        .describe('Auto-classify and extract structured items from the summary (default: true)'),
    },
    async ({ session_summary, project_path, auto_extract }) => {
      const db = getDb();
      const scope = resolveScope('project', project_path);

      let saved = 0;
      const items = [];

      if (auto_extract !== false) {
        const extracted = autoExtractItems(session_summary, scope);
        for (const item of extracted) {
          insertKnowledge(db, item);
          items.push(item.key);
          saved++;
        }
      } else {
        // Store as a single summary item
        const key = 'session-summary:' + Date.now();
        insertKnowledge(db, {
          key,
          content: session_summary,
          category: 'decision',
          scope,
        });
        items.push(key);
        saved = 1;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ saved, items }),
        }],
      };
    }
  );

  // ── omcm_memory_project_knowledge ─────────────────────────────────────────
  server.tool(
    'omcm_memory_project_knowledge',
    'Retrieve all stored knowledge for a project, optionally filtered by category.',
    {
      project_path: z.string().describe('Absolute path to the project'),
      category:     z.enum(['pattern', 'decision', 'solution', 'preference']).optional()
                     .describe('Filter by category'),
    },
    async ({ project_path, category }) => {
      const db = getDb();
      const scope = 'project:' + hashPath(project_path);

      const rows = listKnowledge(db, scope, category || null);

      // Update access for all returned rows
      for (const row of rows) {
        updateAccess(db, row.id);
      }

      const knowledge = rows.map(row => ({
        id:           row.id,
        key:          row.key,
        content:      row.content,
        category:     row.category,
        scope:        row.scope,
        tags:         row.tags ? JSON.parse(row.tags) : [],
        created_at:   row.created_at,
        updated_at:   row.updated_at,
        accessed_at:  row.accessed_at,
        access_count: row.access_count,
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ knowledge, total: knowledge.length }),
        }],
      };
    }
  );
}
