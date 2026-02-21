/**
 * searcher.mjs — FTS5-based search engine for omcm Semantic Code Index (무기 2).
 *
 * Performs full-text search over indexed symbols and returns ranked results
 * with optional code snippets.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { getOmcmDataDir, ensureDir, hashPath } from '../../shared/sqlite.mjs';

// ---------------------------------------------------------------------------
// DB helpers (mirrors indexer — kept local to avoid circular import)
// ---------------------------------------------------------------------------

function getDbPath(projectPath) {
  const hash = hashPath(projectPath);
  const dir = join(getOmcmDataDir(), 'indexes', hash);
  ensureDir(dir);
  return join(dir, 'index.db');
}

function openDb(dbPath) {
  const db = new Database(dbPath, { readonly: true });
  db.pragma('journal_mode = WAL');
  return db;
}

// ---------------------------------------------------------------------------
// Snippet extraction
// ---------------------------------------------------------------------------

/**
 * Extract a code snippet around a given line number (1-based).
 * Returns up to 3 lines: the line itself plus 1 line of context on each side.
 * @param {string} filePath  absolute path
 * @param {number} lineNumber  1-based
 * @returns {string}
 */
function extractSnippet(filePath, lineNumber) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const idx = lineNumber - 1; // 0-based
    const start = Math.max(0, idx - 1);
    const end = Math.min(lines.length - 1, idx + 1);
    return lines.slice(start, end + 1).join('\n');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Scoring / ranking
// ---------------------------------------------------------------------------

/**
 * Simple Reciprocal Rank Fusion score for a result at rank `r` (1-based).
 * k=60 is the standard RRF constant.
 */
function rrfScore(rank, k = 60) {
  return 1 / (k + rank);
}

/**
 * Merge FTS results and name-prefix results using RRF, return top `limit`.
 * @param {Array<{id:string, name:string, file:string, line:number, type:string, signature:string}>} ftsResults
 * @param {Array<{id:string, name:string, file:string, line:number, type:string, signature:string}>} prefixResults
 * @param {number} limit
 * @returns {Array<{id:string, score:number}>}
 */
function mergeRRF(ftsResults, prefixResults, limit) {
  const scores = new Map();

  const addScores = (results) => {
    results.forEach((r, i) => {
      const prev = scores.get(r.id) || { row: r, score: 0 };
      prev.score += rrfScore(i + 1);
      scores.set(r.id, { row: r, score: prev.score });
    });
  };

  addScores(ftsResults);
  addScores(prefixResults);

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search the code index using FTS5 + name-prefix matching with RRF ranking.
 *
 * @param {{
 *   query: string,
 *   projectPath?: string,
 *   limit?: number,
 *   includeContext?: boolean
 * }} opts
 * @returns {{results: Array<{file:string, line:number, symbol?:string, snippet:string, score:number}>}}
 */
export async function searchCode({ query, projectPath, limit = 10, includeContext = true }) {
  const resolvedPath = projectPath || process.cwd();
  const projectHash = hashPath(resolvedPath);
  const dbPath = getDbPath(resolvedPath);

  if (!existsSync(dbPath)) {
    return { results: [] };
  }

  const db = openDb(dbPath);

  // Verify index has data for this project
  const meta = db.prepare('SELECT project_path FROM index_meta WHERE project_hash = ?').get(projectHash);
  if (!meta) {
    db.close();
    return { results: [] };
  }

  const actualProjectPath = meta.project_path;

  // --- FTS5 full-text search ---
  // Escape special FTS5 characters in the query
  const escapedQuery = query.replace(/['"*()]/g, ' ').trim();
  let ftsResults = [];
  if (escapedQuery) {
    try {
      // FTS5 MATCH with prefix on each token
      const ftsQuery = escapedQuery
        .split(/\s+/)
        .filter(Boolean)
        .map(t => `${t}*`)
        .join(' ');

      ftsResults = db.prepare(`
        SELECT s.id, s.file, s.line, s.name, s.type, s.signature, s.docstring,
               rank AS fts_rank
        FROM symbols_fts
        JOIN symbols s ON symbols_fts.rowid = s.rowid
        WHERE symbols_fts MATCH ? AND s.project_hash = ?
        ORDER BY rank
        LIMIT ?
      `).all(ftsQuery, projectHash, limit * 2);
    } catch {
      // FTS5 syntax error fallback — do plain LIKE search
      ftsResults = [];
    }
  }

  // --- Name prefix / substring search (catches exact identifiers) ---
  const likePattern = `%${escapedQuery}%`;
  const prefixResults = db.prepare(`
    SELECT id, file, line, name, type, signature, docstring
    FROM symbols
    WHERE project_hash = ? AND (name LIKE ? OR signature LIKE ?)
    ORDER BY
      CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
      length(name)
    LIMIT ?
  `).all(projectHash, likePattern, likePattern, `${escapedQuery}%`, limit * 2);

  // --- RRF merge ---
  const merged = mergeRRF(ftsResults, prefixResults, limit);

  // --- Build result objects ---
  const results = merged.map(({ row, score }) => {
    const absFile = join(actualProjectPath, row.file);
    const snippet = includeContext ? extractSnippet(absFile, row.line) : row.signature;

    return {
      file: row.file,
      line: row.line,
      symbol: row.name || undefined,
      snippet: snippet || row.signature || '',
      score: Math.round(score * 10000) / 10000, // 4 decimal places
    };
  });

  db.close();
  return { results };
}
