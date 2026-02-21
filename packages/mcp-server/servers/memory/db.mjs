/**
 * SQLite + FTS5 database layer for Cross-session Learning (무기 3).
 *
 * DB location: ~/.omcm/knowledge/knowledge.db
 *
 * Schema:
 *   knowledge       — main knowledge rows
 *   knowledge_fts   — FTS5 virtual table mirroring key/content/tags
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getOmcmDataDir, ensureDir, nowISO } from '../../shared/sqlite.mjs';

const DEFAULT_DB_PATH = join(getOmcmDataDir(), 'knowledge', 'knowledge.db');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS knowledge (
  id           TEXT PRIMARY KEY,
  key          TEXT NOT NULL,
  content      TEXT NOT NULL,
  category     TEXT,
  scope        TEXT NOT NULL,
  tags         TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  accessed_at  TEXT,
  access_count INTEGER DEFAULT 0,
  expires_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_scope_key      ON knowledge(scope, key);
CREATE INDEX IF NOT EXISTS idx_scope_accessed ON knowledge(scope, accessed_at);
CREATE INDEX IF NOT EXISTS idx_category       ON knowledge(category);

CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
  key,
  content,
  tags,
  content=knowledge,
  tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge BEGIN
  INSERT INTO knowledge_fts(rowid, key, content, tags)
  VALUES (new.rowid, new.key, new.content, COALESCE(new.tags, ''));
END;

CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge BEGIN
  INSERT INTO knowledge_fts(knowledge_fts, rowid, key, content, tags)
  VALUES ('delete', old.rowid, old.key, old.content, COALESCE(old.tags, ''));
END;

CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE ON knowledge BEGIN
  INSERT INTO knowledge_fts(knowledge_fts, rowid, key, content, tags)
  VALUES ('delete', old.rowid, old.key, old.content, COALESCE(old.tags, ''));
  INSERT INTO knowledge_fts(rowid, key, content, tags)
  VALUES (new.rowid, new.key, new.content, COALESCE(new.tags, ''));
END;
`;

/**
 * Initialize the knowledge database.
 * Creates the DB file and schema if they don't exist.
 *
 * @param {string} [dbPath] - defaults to ~/.omcm/knowledge/knowledge.db
 * @returns {import('better-sqlite3').Database}
 */
export function initDb(dbPath) {
  const resolvedPath = dbPath || DEFAULT_DB_PATH;
  ensureDir(join(resolvedPath, '..'));
  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return db;
}

/**
 * Insert or replace a knowledge item.
 * If a row with the same (key, scope) exists it is replaced in-place.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   key: string,
 *   content: string,
 *   category?: string,
 *   scope: string,
 *   tags?: string[],
 *   expires_at?: string
 * }} item
 * @returns {{ id: string, created_at: string }}
 */
export function insertKnowledge(db, item) {
  const now = nowISO();

  const existing = db
    .prepare('SELECT id, created_at FROM knowledge WHERE key = ? AND scope = ?')
    .get(item.key, item.scope);

  const id = existing ? existing.id : randomUUID();
  const created_at = existing ? existing.created_at : now;

  if (existing) {
    db.prepare(`
      UPDATE knowledge
         SET content      = @content,
             category     = @category,
             tags         = @tags,
             updated_at   = @updated_at,
             expires_at   = @expires_at
       WHERE id = @id
    `).run({
      content: item.content,
      category: item.category || null,
      tags: item.tags ? JSON.stringify(item.tags) : null,
      updated_at: now,
      expires_at: item.expires_at || null,
      id,
    });
  } else {
    db.prepare(`
      INSERT INTO knowledge (id, key, content, category, scope, tags, created_at, updated_at, expires_at)
      VALUES (@id, @key, @content, @category, @scope, @tags, @created_at, @updated_at, @expires_at)
    `).run({
      id,
      key: item.key,
      content: item.content,
      category: item.category || null,
      scope: item.scope,
      tags: item.tags ? JSON.stringify(item.tags) : null,
      created_at,
      updated_at: now,
      expires_at: item.expires_at || null,
    });
  }

  return { id, created_at };
}

/**
 * Full-text search using FTS5. Falls back to LIKE search on query parse errors.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} query
 * @param {string|null} scope
 * @param {number} limit
 * @returns {Array<Object>}
 */
export function searchKnowledge(db, query, scope, limit) {
  const resolvedScope = scope || null;
  const resolvedLimit = limit || 10;
  const ftsQuery = query.replace(/"/g, '""');
  const now = nowISO();

  let sql = `
    SELECT k.id, k.key, k.content, k.category, k.scope, k.tags,
           k.created_at, k.updated_at, k.accessed_at, k.access_count,
           k.expires_at,
           fts.rank AS rank
      FROM knowledge_fts fts
      JOIN knowledge k ON k.rowid = fts.rowid
     WHERE knowledge_fts MATCH ?
       AND (k.expires_at IS NULL OR k.expires_at > ?)
  `;
  const params = [ftsQuery, now];

  if (resolvedScope) {
    sql += ' AND k.scope = ?';
    params.push(resolvedScope);
  }

  sql += ' ORDER BY rank LIMIT ?';
  params.push(resolvedLimit);

  try {
    return db.prepare(sql).all(...params);
  } catch (_err) {
    return _likeSearch(db, query, resolvedScope, resolvedLimit, now);
  }
}

function _likeSearch(db, query, scope, limit, now) {
  const like = '%' + query + '%';
  let sql = `
    SELECT *, NULL AS rank
      FROM knowledge
     WHERE (key LIKE ? OR content LIKE ? OR tags LIKE ?)
       AND (expires_at IS NULL OR expires_at > ?)
  `;
  const params = [like, like, like, now];
  if (scope) {
    sql += ' AND scope = ?';
    params.push(scope);
  }
  sql += ' ORDER BY accessed_at DESC LIMIT ?';
  params.push(limit);
  return db.prepare(sql).all(...params);
}

/**
 * Retrieve a specific knowledge item by key and scope.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} key
 * @param {string} scope
 * @returns {Object|undefined}
 */
export function getKnowledge(db, key, scope) {
  return db
    .prepare('SELECT * FROM knowledge WHERE key = ? AND scope = ?')
    .get(key, scope);
}

/**
 * Delete knowledge items matching the given criteria.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string|null} key
 * @param {string|null} olderThan - ISO date string
 * @param {string|null} scope
 * @returns {{ deleted: number }}
 */
export function deleteKnowledge(db, key, olderThan, scope) {
  const resolvedKey = key || null;
  const resolvedOlderThan = olderThan || null;
  const resolvedScope = scope || null;

  const conditions = [];
  const params = [];

  if (resolvedKey) {
    conditions.push('key = ?');
    params.push(resolvedKey);
  }
  if (resolvedOlderThan) {
    conditions.push('updated_at < ?');
    params.push(resolvedOlderThan);
  }
  if (resolvedScope) {
    conditions.push('scope = ?');
    params.push(resolvedScope);
  }

  if (conditions.length === 0) {
    return { deleted: 0 };
  }

  const where = conditions.join(' AND ');
  const result = db.prepare('DELETE FROM knowledge WHERE ' + where).run(...params);
  return { deleted: result.changes };
}

/**
 * List knowledge items, optionally filtered by scope and/or category.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string|null} scope
 * @param {string|null} category
 * @returns {Array<Object>}
 */
export function listKnowledge(db, scope, category) {
  const resolvedScope = scope || null;
  const resolvedCategory = category || null;
  const conditions = ['(expires_at IS NULL OR expires_at > ?)'];
  const params = [nowISO()];

  if (resolvedScope) {
    conditions.push('scope = ?');
    params.push(resolvedScope);
  }
  if (resolvedCategory) {
    conditions.push('category = ?');
    params.push(resolvedCategory);
  }

  const where = conditions.join(' AND ');
  return db
    .prepare('SELECT * FROM knowledge WHERE ' + where + ' ORDER BY updated_at DESC')
    .all(...params);
}

/**
 * Update accessed_at and increment access_count for a knowledge item.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} id
 */
export function updateAccess(db, id) {
  db.prepare(`
    UPDATE knowledge
       SET accessed_at  = ?,
           access_count = access_count + 1
     WHERE id = ?
  `).run(nowISO(), id);
}
