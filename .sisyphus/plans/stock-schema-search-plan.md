# Stock Price / Quote / OHLCV DB Schema Search Plan

## TL;DR

> **Quick Summary**: Exhaustive read-only search of `/opt/coffeetree` for every DB schema/table/ORM definition related to stock prices, quotes, candles, and OHLCV data. No file modifications — search, extract, report.
>
> **Deliverables**:
> - Complete inventory of all schema definitions (SQL tables, ORM models, type definitions) for stock price/quote/OHLCV data
> - Per-file extraction: table name, columns, indexes, hypertable status, relationships
> - Cross-reference map: which files define the same logical table
>
> **Estimated Effort**: Short (read-only search)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Wave 1 (all independent searches) → Wave 2 (read matched files) → Wave 3 (synthesize report)

---

## Context

### Repository Structure (Confirmed)

```
/opt/coffeetree/
├── apps/
│   ├── bridge/           # Backend bridge service
│   └── web/              # Frontend web app
├── docker/
│   ├── timescaledb/
│   │   ├── init.sql      ← KNOWN: ohlcv/ticks tables
│   │   └── dev-seed.sql
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
├── packages/
│   └── shared/           # Shared package
├── supabase/
│   └── migrations/       ← KNOWN: 10 SQL migration files (001-010)
│       ├── 001_users.sql
│       ├── 002_strategies.sql
│       ├── 003_trades.sql
│       ├── 004_portfolios.sql
│       ├── 005_backtest_results.sql
│       ├── 006_notification_settings.sql
│       ├── 007_rls_policies.sql
│       ├── 008_orders_positions.sql
│       ├── 009_auth_users_sync.sql
│       └── 010_signals.sql
└── docs/
```

### ORM Status (Confirmed)

| ORM/Schema Tool | Present? |
|-----------------|----------|
| Prisma (`schema.prisma`) | NOT found |
| Drizzle (`drizzle.config.*`) | NOT found |
| TypeORM (`*.entity.ts`, `ormconfig*`) | NOT found |
| Raw SQL (Supabase migrations) | YES |
| Raw SQL (TimescaleDB init) | YES |
| TypeScript type definitions | TO SEARCH |

---

## Work Objectives

### Core Objective
Find and extract **every** database schema definition for stock price / quote / candle / OHLCV data across the entire `/opt/coffeetree` codebase.

### Definition of Done
- [ ] All SQL `CREATE TABLE` statements for price/quote/OHLCV tables identified
- [ ] All TypeScript/JS type/interface definitions mirroring those tables identified
- [ ] All references to these table names in application code cataloged
- [ ] Cross-reference map produced (SQL definition → TS type → app usage)

### Must Have
- Every file that defines or references stock price/OHLCV schema
- Column-level detail for each table found
- Hypertable / TimescaleDB-specific features noted

### Must NOT Have (Guardrails)
- NO file modifications of any kind
- NO code execution (no `npm`, `bun`, `node`)
- NO creation of source files
- Tools allowed: `glob`, `grep`, `read` ONLY

---

## Search Strategy

### Domain Keyword Matrix

These are the search terms, organized by category:

| Category | Grep Patterns (regex) |
|----------|----------------------|
| **Table names** | `ohlcv`, `candle`, `tick`, `quote`, `stock_price`, `price_history`, `market_data`, `bar_data` |
| **SQL DDL** | `CREATE TABLE.*(?:ohlcv\|candle\|tick\|quote\|price\|market_data)`, `CREATE.*HYPERTABLE` |
| **Column names** | `open\b.*high\b.*low\b.*close`, `volume`, `ohlcv`, `bid_price`, `ask_price`, `last_price` |
| **ORM decorators** | `@Entity`, `@Column`, `@Table`, `@PrimaryGeneratedColumn` |
| **TS types** | `interface.*(?:OHLCV\|Candle\|Tick\|Quote\|Price\|Bar)`, `type.*(?:OHLCV\|Candle\|Tick\|Quote\|Price\|Bar)` |
| **Prisma fallback** | `model.*(?:Ohlcv\|Candle\|Tick\|Quote\|Price\|Bar)` |
| **Drizzle fallback** | `pgTable\(.*(?:ohlcv\|candle\|tick\|quote\|price\|bar)` |

### File Type Targets

| File Pattern | Why |
|-------------|-----|
| `*.sql` | Raw SQL migrations, init scripts, seeds |
| `*.ts` | TypeScript types, ORM entities, Drizzle schemas |
| `*.tsx` | Possible inline type defs in React components |
| `*.js` | Legacy or compiled JS |
| `*.prisma` | Prisma schema (fallback — not found, but check anyway) |
| `*.json` | Possible JSON schema definitions |
| `*.yaml` / `*.yml` | Docker / config that may reference table names |

### Directory Priority

| Priority | Directory | Rationale |
|----------|-----------|-----------|
| HIGH | `docker/timescaledb/` | Known OHLCV init.sql |
| HIGH | `supabase/migrations/` | Known SQL migrations |
| MEDIUM | `packages/shared/` | Likely shared types/interfaces |
| MEDIUM | `apps/bridge/` | Backend — likely DB access layer |
| LOW | `apps/web/` | Frontend — may have TS type mirrors |
| LOW | `docs/` | May document schema |
| SKIP | `node_modules/` | Third-party, irrelevant |

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| T1: Grep SQL files for price/OHLCV keywords | None | Independent search |
| T2: Grep TS/JS files for type/interface defs | None | Independent search |
| T3: Grep all files for table name references | None | Independent search |
| T4: Glob for ORM config files (fallback) | None | Independent search |
| T5: Read & extract matched SQL files | T1 | Needs T1 file list |
| T6: Read & extract matched TS/JS files | T2 | Needs T2 file list |
| T7: Read & extract table-reference files | T3 | Needs T3 file list |
| T8: Synthesize cross-reference report | T5, T6, T7 | Needs all extractions |

## Parallel Execution Graph

```
Wave 1 (Start immediately — ALL independent):
├── T1: grep SQL files for price/OHLCV DDL patterns
├── T2: grep TS/JS files for type/interface/ORM patterns
├── T3: grep ALL files for table-name references (ohlcv, candle, tick, quote)
└── T4: glob fallback for ORM config files (prisma, drizzle, typeorm)

Wave 2 (After Wave 1 — read matched files):
├── T5: read each SQL file from T1 hits → extract CREATE TABLE + columns
├── T6: read each TS/JS file from T2 hits → extract type/interface defs
└── T7: read each file from T3 hits → extract usage context

Wave 3 (After Wave 2 — synthesize):
└── T8: produce final cross-reference report

Critical Path: T1 → T5 → T8
Parallel Speedup: ~60% faster than sequential (Wave 1 is fully parallel)
```

---

## TODOs

### Wave 1: Parallel Search (ALL independent)

- [ ] 1. **Grep SQL files for stock/price/OHLCV DDL patterns**

  **What to do**:
  Run these grep searches in parallel:
  ```
  grep pattern="(?i)(ohlcv|candle|tick[s]?|quote|stock.?price|price.?history|market.?data|bar.?data)" include="*.sql" path="/opt/coffeetree"
  grep pattern="(?i)CREATE\s+TABLE.*(?:ohlcv|candle|tick|quote|price|market|bar)" include="*.sql" path="/opt/coffeetree"
  grep pattern="(?i)create_hypertable" include="*.sql" path="/opt/coffeetree"
  ```

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT run SQL commands

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple grep-based search, no reasoning needed
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands TS project structure, can navigate monorepo
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `docker/timescaledb/init.sql` — Known to contain OHLCV table definitions
  - `docker/timescaledb/dev-seed.sql` — May contain seed data with table references
  - `supabase/migrations/001_users.sql` through `010_signals.sql` — All migration files to scan

  **Acceptance Criteria**:
  ```bash
  # Agent runs grep tool and collects:
  # - List of files with matches
  # - Line numbers and matched content
  # Output: structured list of {file, line, match} tuples
  ```

  **Commit**: NO

---

- [ ] 2. **Grep TypeScript/JavaScript files for type/interface/ORM definitions**

  **What to do**:
  Run these grep searches:
  ```
  grep pattern="(?i)(interface|type)\s+\w*(OHLCV|Candle|Tick|Quote|Price|Bar|MarketData)\w*" include="*.{ts,tsx,js,jsx}" path="/opt/coffeetree" (exclude node_modules)
  grep pattern="(?i)@Entity|@Table|@Column.*(?:ohlcv|price|quote|candle)" include="*.{ts,tsx}" path="/opt/coffeetree"
  grep pattern="(?i)pgTable\s*\(" include="*.{ts,tsx}" path="/opt/coffeetree"
  grep pattern="(?i)model\s+(?:Ohlcv|Candle|Tick|Quote|Price|Bar)" include="*.prisma" path="/opt/coffeetree"
  ```

  **Must NOT do**:
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple grep-based search, no reasoning needed
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Knows TS type syntax, ORM patterns
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `data-scientist`: No data analysis

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - `packages/shared/` — Most likely location for shared TS types
  - `apps/bridge/` — Backend likely has DB-facing type definitions

  **Acceptance Criteria**:
  ```bash
  # Output: list of {file, line, match} for every type/interface/ORM definition found
  # OR: explicit "NO MATCHES" if none found (important negative result)
  ```

  **Commit**: NO

---

- [ ] 3. **Grep ALL files for table-name references (broad sweep)**

  **What to do**:
  Broad search across all non-node_modules files:
  ```
  grep pattern="(?i)\b(ohlcv|candles?|ticks?|stock_?quotes?|price_?history)\b" path="/opt/coffeetree" (exclude node_modules)
  grep pattern="(?i)\b(open|high|low|close|volume)\b.*\b(open|high|low|close|volume)\b" include="*.{ts,tsx,js,sql}" path="/opt/coffeetree"
  ```
  This catches:
  - SQL queries in application code (`SELECT * FROM ohlcv`)
  - Table name constants (`const TABLE = 'ohlcv'`)
  - API references, documentation, configs

  **Must NOT do**:
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple grep-based search
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Recognizes code patterns in results
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - All directories in `/opt/coffeetree` except `node_modules/`

  **Acceptance Criteria**:
  ```bash
  # Output: deduplicated list of {file, line, context} for all table-name references
  # Categorized by: SQL definition / TS type / App usage / Config / Docs
  ```

  **Commit**: NO

---

- [ ] 4. **Glob fallback: scan for any ORM config or schema files missed**

  **What to do**:
  Run glob patterns to catch ANY schema-related files regardless of content:
  ```
  glob pattern="**/*.prisma"            path="/opt/coffeetree"
  glob pattern="**/drizzle.config.*"    path="/opt/coffeetree"
  glob pattern="**/ormconfig*"          path="/opt/coffeetree"
  glob pattern="**/*.entity.ts"         path="/opt/coffeetree"
  glob pattern="**/schema.ts"           path="/opt/coffeetree"
  glob pattern="**/schema.js"           path="/opt/coffeetree"
  glob pattern="**/models/**"           path="/opt/coffeetree"
  glob pattern="**/entities/**"         path="/opt/coffeetree"
  glob pattern="**/migrations/**/*.ts"  path="/opt/coffeetree"
  glob pattern="**/*migration*"         path="/opt/coffeetree"
  glob pattern="**/knexfile*"           path="/opt/coffeetree"
  glob pattern="**/mikro-orm.config*"   path="/opt/coffeetree"
  glob pattern="**/sequelize*"          path="/opt/coffeetree"
  ```

  **Must NOT do**:
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple glob-based file discovery
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Recognizes ORM file conventions
  - **Skills Evaluated but Omitted**:
    - All other skills: No domain overlap with file discovery

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 5, 6 (if new files found)
  - **Blocked By**: None

  **Acceptance Criteria**:
  ```bash
  # Output: list of ALL ORM/schema/migration files found (or "NONE" per pattern)
  # Any NEW files not already caught by Tasks 1-3 flagged as "NEW DISCOVERY"
  ```

  **Commit**: NO

---

### Wave 2: Read & Extract (depends on Wave 1)

- [ ] 5. **Read and extract SQL schema definitions**

  **What to do**:
  For each SQL file identified in Task 1:
  1. `read` the full file
  2. Extract every `CREATE TABLE` block related to stock/price/OHLCV
  3. For each table, record:
     - Table name
     - All columns with types
     - Primary key
     - Indexes
     - Foreign keys
     - `create_hypertable` calls (TimescaleDB)
     - Constraints
     - Any `PARTITION BY` or retention policies

  **Known files to read** (pre-identified):
  - `/opt/coffeetree/docker/timescaledb/init.sql`
  - `/opt/coffeetree/docker/timescaledb/dev-seed.sql`
  - All 10 files in `/opt/coffeetree/supabase/migrations/`

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT execute SQL

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Needs to parse SQL carefully, moderate reasoning
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands project structure for cross-referencing
  - **Skills Evaluated but Omitted**:
    - `data-scientist`: Not data analysis, just schema extraction
    - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  - `docker/timescaledb/init.sql` — Primary source for TimescaleDB hypertables
  - `supabase/migrations/*` — Supabase-managed schema definitions
  - Task 1 output — Additional SQL files discovered by grep

  **Acceptance Criteria**:
  ```
  # Output per table found:
  # - File path + line range
  # - Full CREATE TABLE statement (verbatim)
  # - Column inventory: name, type, nullable, default
  # - Indexes list
  # - Hypertable status: YES/NO + config
  # - Foreign key relationships
  ```

  **Commit**: NO

---

- [ ] 6. **Read and extract TypeScript/JS type definitions**

  **What to do**:
  For each TS/JS file identified in Task 2:
  1. `read` the file (or relevant section)
  2. Extract every `interface`, `type`, `class`, `enum` related to stock/price/OHLCV
  3. For each definition, record:
     - Type name
     - All properties with types
     - Extends/implements relationships
     - Export status
     - Zod schema if present

  **Must NOT do**:
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Needs TS parsing, moderate reasoning
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Native TS type understanding
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not building UI
    - `data-scientist`: Not analyzing data

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 2

  **References**:
  - Task 2 output — Files discovered by grep
  - `packages/shared/` — Expected location for shared types

  **Acceptance Criteria**:
  ```
  # Output per type found:
  # - File path + line range
  # - Full type/interface definition (verbatim)
  # - Property inventory: name, TS type, optional?
  # - Relationship to SQL table (if determinable)
  ```

  **Commit**: NO

---

- [ ] 7. **Read and extract application-code table references**

  **What to do**:
  For each file identified in Task 3 (that is NOT already covered by T5/T6):
  1. `read` surrounding context (+/-10 lines around match)
  2. Classify the reference:
     - SQL query (SELECT/INSERT/UPDATE from table)
     - Table name constant/config
     - API endpoint referencing table
     - Documentation mention
  3. Record the reference pattern

  **Must NOT do**:
  - Do NOT modify any files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Context extraction, light classification
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Recognizes query patterns in TS code
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `data-scientist`: Not analyzing data

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:
  - Task 3 output — Files discovered by broad grep
  - `apps/bridge/` — Expected location for DB queries

  **Acceptance Criteria**:
  ```
  # Output per reference:
  # - File path + line
  # - Reference type: QUERY / CONSTANT / API / DOC / OTHER
  # - Context snippet (surrounding code)
  ```

  **Commit**: NO

---

### Wave 3: Synthesize (depends on Wave 2)

- [ ] 8. **Synthesize cross-reference report**

  **What to do**:
  Combine all findings from Tasks 5, 6, 7 into a structured report using the Final Report Template below. Output directly to user (no file creation).

  **Must NOT do**:
  - Do NOT create any files (output to user conversation only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Synthesis and formatting, moderate reasoning
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understands schema-to-type relationships
  - **Skills Evaluated but Omitted**:
    - `prompt-engineer`: Not writing prompts
    - `data-scientist`: Not statistical analysis

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (alone, final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 5, 6, 7

  **Acceptance Criteria**:
  ```
  # Report follows the Final Report Template exactly
  # Every discovered table has at least: name, columns, source file
  # Cross-reference map links SQL ↔ TS ↔ App code
  # Summary statistics included
  # Missing/gaps section identifies orphaned types or untyped tables
  ```

  **Commit**: NO

---

## Final Report Template

The executor MUST produce output in this exact format:

```markdown
# Stock Price / OHLCV Schema — Search Results

## Summary Statistics
- **Total SQL tables found**: N
- **Total TS types found**: N
- **Total app-code references**: N
- **ORM framework detected**: [None / Prisma / Drizzle / TypeORM / ...]
- **TimescaleDB hypertables**: N

## 1. SQL Table Definitions

### Table: `{table_name}`
- **Source**: `{file_path}:{start_line}-{end_line}`
- **Type**: [Regular table / Hypertable / Materialized view]
- **Columns**:
  | Column | Type | Nullable | Default | Notes |
  |--------|------|----------|---------|-------|
  | ... | ... | ... | ... | ... |
- **Primary Key**: ...
- **Indexes**: ...
- **Hypertable Config**: [chunk_time_interval, etc.]
- **Foreign Keys**: ...
- **Retention Policy**: [if any]

(repeat for each table)

## 2. TypeScript Type Definitions

### Type: `{TypeName}`
- **Source**: `{file_path}:{line}`
- **Kind**: [interface / type alias / class / enum / Zod schema]
- **Exported**: YES / NO
- **Properties**:
  | Property | Type | Optional | Maps to SQL Column |
  |----------|------|----------|--------------------|
  | ... | ... | ... | ... |

(repeat for each type)

## 3. Application Code References

| File | Line | Type | Context |
|------|------|------|---------|
| `path` | N | QUERY/CONST/API/DOC | snippet |

## 4. Cross-Reference Map

| Logical Entity | SQL Table | TS Type | App References |
|----------------|-----------|---------|----------------|
| OHLCV Candle | `ohlcv` in init.sql:L42 | `OHLCVData` in types.ts:L15 | bridge/src/db.ts:L88 |

## 5. Missing / Gaps
- [Any expected schema not found]
- [Any orphaned types with no SQL backing]
- [Any SQL tables with no TS type mirror]
```

---

## Commit Strategy

No commits. This is a read-only search plan.

---

## Success Criteria

### Final Checklist
- [ ] All SQL files in `docker/timescaledb/` scanned
- [ ] All SQL files in `supabase/migrations/` scanned
- [ ] All TS/JS files in `apps/` and `packages/` scanned
- [ ] All YAML/JSON config files scanned for table references
- [ ] ORM fallback patterns checked (Prisma, Drizzle, TypeORM, Knex, Sequelize, MikroORM)
- [ ] No files modified
- [ ] Report follows the template exactly
- [ ] Cross-reference map links SQL <-> TS <-> App code
- [ ] Missing/gaps section completed
