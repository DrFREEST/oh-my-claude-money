/**
 * indexer.mjs — Project indexing engine for omcm Semantic Code Index (무기 2).
 *
 * Exports:
 *   indexProject({ projectPath, patterns, exclude }) → { indexed_files, indexed_symbols, duration_ms }
 *   updateIndex({ projectPath, changedFiles })       → { updated }
 *   getIndexStatus({ projectPath })                  → { indexed, last_updated, file_count, stale_files }
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { randomUUID } from 'crypto';
import { glob } from 'glob';
import Database from 'better-sqlite3';
import { getOmcmDataDir, ensureDir, hashPath, nowISO } from '../../shared/sqlite.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PATTERNS = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs', '**/*.py', '**/*.go'];
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS symbols (
  id           TEXT PRIMARY KEY,
  file         TEXT NOT NULL,
  line         INTEGER,
  name         TEXT NOT NULL,
  type         TEXT,
  signature    TEXT,
  docstring    TEXT,
  project_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_symbols_project ON symbols(project_hash);
CREATE INDEX IF NOT EXISTS idx_symbols_name    ON symbols(name);
CREATE INDEX IF NOT EXISTS idx_symbols_file    ON symbols(file);

CREATE VIRTUAL TABLE IF NOT EXISTS symbols_fts USING fts5(
  name,
  signature,
  docstring,
  file,
  content=symbols,
  tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS symbols_ai AFTER INSERT ON symbols BEGIN
  INSERT INTO symbols_fts(rowid, name, signature, docstring, file)
  VALUES (new.rowid, new.name, COALESCE(new.signature,''), COALESCE(new.docstring,''), new.file);
END;

CREATE TRIGGER IF NOT EXISTS symbols_ad AFTER DELETE ON symbols BEGIN
  INSERT INTO symbols_fts(symbols_fts, rowid, name, signature, docstring, file)
  VALUES ('delete', old.rowid, old.name, COALESCE(old.signature,''), COALESCE(old.docstring,''), old.file);
END;

CREATE TRIGGER IF NOT EXISTS symbols_au AFTER UPDATE ON symbols BEGIN
  INSERT INTO symbols_fts(symbols_fts, rowid, name, signature, docstring, file)
  VALUES ('delete', old.rowid, old.name, COALESCE(old.signature,''), COALESCE(old.docstring,''), old.file);
  INSERT INTO symbols_fts(rowid, name, signature, docstring, file)
  VALUES (new.rowid, new.name, COALESCE(new.signature,''), COALESCE(new.docstring,''), new.file);
END;

CREATE TABLE IF NOT EXISTS index_meta (
  project_hash TEXT PRIMARY KEY,
  project_path TEXT,
  last_updated TEXT,
  file_count   INTEGER
);
`;

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function getDbPath(projectPath) {
  const hash = hashPath(projectPath);
  const dir = join(getOmcmDataDir(), 'indexes', hash);
  ensureDir(dir);
  return join(dir, 'index.db');
}

function openDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}

// ---------------------------------------------------------------------------
// Symbol extraction (regex MVP)
// ---------------------------------------------------------------------------

/**
 * Extract symbols from a single file's content.
 * @param {string} content  File source text
 * @param {string} ext      File extension (e.g. '.ts', '.py', '.go')
 * @returns {Array<{line: number, name: string, type: string, signature: string}>}
 */
function extractSymbols(content, ext) {
  const symbols = [];
  const lines = content.split('\n');

  // Language-specific patterns
  const patterns = [];

  if (['.ts', '.tsx', '.js', '.mjs', '.jsx'].includes(ext)) {
    // export function foo(...) / async function foo(...)
    patterns.push({
      re: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(\([^)]*\))/,
      type: 'function',
    });
    // export class Bar / class Bar
    patterns.push({
      re: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
      type: 'class',
    });
    // export const foo = / export let foo =
    patterns.push({
      re: /^export\s+(?:const|let|var)\s+(\w+)/,
      type: 'variable',
    });
    // export interface Foo / export type Foo
    patterns.push({
      re: /^export\s+(?:interface|type)\s+(\w+)/,
      type: 'type',
    });
    // export default function / export default class
    patterns.push({
      re: /^export\s+default\s+(?:async\s+)?(?:function|class)\s+(\w+)/,
      type: 'function',
    });
    // Arrow function: export const foo = (...) =>
    patterns.push({
      re: /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/,
      type: 'function',
    });
  }

  if (ext === '.py') {
    patterns.push({ re: /^def\s+(\w+)\s*(\([^)]*\))/, type: 'function' });
    patterns.push({ re: /^class\s+(\w+)/, type: 'class' });
    // Indented methods
    patterns.push({ re: /^\s{4}def\s+(\w+)\s*(\([^)]*\))/, type: 'method' });
  }

  if (ext === '.go') {
    patterns.push({ re: /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*(\([^)]*\))/, type: 'function' });
    patterns.push({ re: /^type\s+(\w+)\s+struct/, type: 'struct' });
    patterns.push({ re: /^type\s+(\w+)\s+interface/, type: 'interface' });
  }

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    for (const { re, type } of patterns) {
      const m = lineText.match(re);
      if (m) {
        const name = m[1];
        const signature = m[2] ? `${name}${m[2]}` : name;
        symbols.push({
          line: i + 1, // 1-based
          name,
          type,
          signature: lineText.trim().slice(0, 200), // store raw line as signature
        });
        break; // one symbol per line
      }
    }
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// File indexing
// ---------------------------------------------------------------------------

/**
 * Index a single file and upsert its symbols into the DB.
 * Deletes all existing symbols for this file first.
 * @param {import('better-sqlite3').Database} db
 * @param {string} absoluteFilePath
 * @param {string} relativeFilePath
 * @param {string} projectHash
 * @returns {number} count of symbols indexed
 */
function indexFile(db, absoluteFilePath, relativeFilePath, projectHash) {
  let content;
  try {
    content = readFileSync(absoluteFilePath, 'utf8');
  } catch {
    return 0;
  }

  const ext = absoluteFilePath.match(/(\.\w+)$/)?.[1] || '';
  const symbols = extractSymbols(content, ext);

  // Delete old symbols for this file
  db.prepare('DELETE FROM symbols WHERE file = ? AND project_hash = ?').run(relativeFilePath, projectHash);

  const insert = db.prepare(`
    INSERT INTO symbols (id, file, line, name, type, signature, docstring, project_hash)
    VALUES (@id, @file, @line, @name, @type, @signature, @docstring, @project_hash)
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });

  const rows = symbols.map(s => ({
    id: randomUUID(),
    file: relativeFilePath,
    line: s.line,
    name: s.name,
    type: s.type,
    signature: s.signature,
    docstring: null,
    project_hash: projectHash,
  }));

  insertMany(rows);
  return symbols.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Full index of a project directory.
 *
 * @param {{
 *   projectPath: string,
 *   patterns?: string[],
 *   exclude?: string[]
 * }} opts
 * @returns {Promise<{ indexed_files: number, indexed_symbols: number, duration_ms: number }>}
 */
export async function indexProject({ projectPath, patterns, exclude }) {
  const start = Date.now();
  const resolvedPatterns = patterns?.length ? patterns : DEFAULT_PATTERNS;
  const resolvedExclude = exclude?.length ? exclude : DEFAULT_EXCLUDE;
  const projectHash = hashPath(projectPath);
  const dbPath = getDbPath(projectPath);
  const db = openDb(dbPath);

  // Clear existing symbols for this project
  db.prepare('DELETE FROM symbols WHERE project_hash = ?').run(projectHash);

  // Collect files
  const files = await glob(resolvedPatterns, {
    cwd: projectPath,
    ignore: resolvedExclude,
    nodir: true,
    absolute: false,
  });

  let totalSymbols = 0;

  const indexAll = db.transaction(() => {
    for (const relFile of files) {
      const absFile = join(projectPath, relFile);
      totalSymbols += indexFile(db, absFile, relFile, projectHash);
    }
  });

  indexAll();

  // Update meta
  db.prepare(`
    INSERT INTO index_meta (project_hash, project_path, last_updated, file_count)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(project_hash) DO UPDATE SET
      project_path = excluded.project_path,
      last_updated = excluded.last_updated,
      file_count   = excluded.file_count
  `).run(projectHash, projectPath, nowISO(), files.length);

  db.close();

  return {
    indexed_files: files.length,
    indexed_symbols: totalSymbols,
    duration_ms: Date.now() - start,
  };
}

/**
 * Incrementally re-index only changed files.
 *
 * @param {{
 *   projectPath: string,
 *   changedFiles: string[]
 * }} opts
 * @returns {{ updated: number }}
 */
export function updateIndex({ projectPath, changedFiles }) {
  const projectHash = hashPath(projectPath);
  const dbPath = getDbPath(projectPath);

  if (!existsSync(dbPath)) {
    throw new Error(`Project not indexed yet. Run omcm_index_build first for: ${projectPath}`);
  }

  const db = openDb(dbPath);
  let updated = 0;

  const updateAll = db.transaction(() => {
    for (const relFile of changedFiles) {
      const absFile = join(projectPath, relFile);
      if (existsSync(absFile)) {
        indexFile(db, absFile, relFile, projectHash);
        updated++;
      } else {
        // File deleted — remove its symbols
        db.prepare('DELETE FROM symbols WHERE file = ? AND project_hash = ?').run(relFile, projectHash);
      }
    }
  });

  updateAll();

  // Refresh meta timestamp
  const meta = db.prepare('SELECT file_count FROM index_meta WHERE project_hash = ?').get(projectHash);
  db.prepare(`
    UPDATE index_meta SET last_updated = ? WHERE project_hash = ?
  `).run(nowISO(), projectHash);

  db.close();
  return { updated };
}

/**
 * Return index freshness info for a project (synchronous).
 *
 * @param {{ projectPath: string }} opts
 * @returns {{
 *   indexed: boolean,
 *   last_updated: string|null,
 *   file_count: number,
 *   stale_files: string[]
 * }}
 */
export function getIndexStatus({ projectPath }) {
  const projectHash = hashPath(projectPath);
  const dbPath = getDbPath(projectPath);

  if (!existsSync(dbPath)) {
    return { indexed: false, last_updated: null, file_count: 0, stale_files: [] };
  }

  const db = new Database(dbPath, { readonly: true });
  db.pragma('journal_mode = WAL');

  const meta = db.prepare('SELECT * FROM index_meta WHERE project_hash = ?').get(projectHash);

  if (!meta) {
    db.close();
    return { indexed: false, last_updated: null, file_count: 0, stale_files: [] };
  }

  // Detect stale files: files in DB whose mtime > last_updated
  const lastUpdated = new Date(meta.last_updated);
  const indexedFiles = db
    .prepare('SELECT DISTINCT file FROM symbols WHERE project_hash = ?')
    .all(projectHash)
    .map(r => r.file);

  const staleFiles = [];
  for (const relFile of indexedFiles) {
    const absFile = join(projectPath, relFile);
    try {
      const mtime = statSync(absFile).mtime;
      if (mtime > lastUpdated) {
        staleFiles.push(relFile);
      }
    } catch {
      staleFiles.push(relFile); // file deleted — stale
    }
  }

  db.close();

  return {
    indexed: true,
    last_updated: meta.last_updated,
    file_count: meta.file_count,
    stale_files: staleFiles,
  };
}
