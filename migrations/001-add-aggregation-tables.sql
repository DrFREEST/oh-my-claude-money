-- OMCM SQLite Schema Migration 001
-- 집계 테이블 추가 (v1.1.0-alpha)

-- 일별 집계 테이블 (90일 보존)
CREATE TABLE IF NOT EXISTS routing_events_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  decision TEXT NOT NULL,
  tool_name TEXT,
  count INTEGER DEFAULT 0,
  avg_duration_ms REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, decision, tool_name)
);

-- 주별 집계 테이블 (1년 보존)
CREATE TABLE IF NOT EXISTS routing_events_weekly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year TEXT NOT NULL,
  week TEXT NOT NULL,
  decision TEXT NOT NULL,
  tool_name TEXT,
  count INTEGER DEFAULT 0,
  avg_duration_ms REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year, week, decision, tool_name)
);

-- 월별 집계 테이블 (영구 보존)
CREATE TABLE IF NOT EXISTS routing_events_monthly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year TEXT NOT NULL,
  month TEXT NOT NULL,
  decision TEXT NOT NULL,
  tool_name TEXT,
  count INTEGER DEFAULT 0,
  avg_duration_ms REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year, month, decision, tool_name)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_date ON routing_events_daily(date);
CREATE INDEX IF NOT EXISTS idx_weekly_year_week ON routing_events_weekly(year, week);
CREATE INDEX IF NOT EXISTS idx_monthly_year_month ON routing_events_monthly(year, month);

-- 마이그레이션 버전 추적
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
