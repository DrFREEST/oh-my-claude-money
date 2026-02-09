# Stock Quote API Discovery Report

## TL;DR

> **Quick Summary**: Systematically search the entire `/opt/coffeetree` monorepo (Python bridge + Next.js web + shared packages) to discover and document all API endpoints, services, and integrations related to stock price/quote fetching. Produce a structured markdown report.
> 
> **Deliverables**:
> - `/opt/coffeetree/docs/STOCK_API_REPORT.md` — Structured report grouped into 4 categories
> 
> **Estimated Effort**: Short (~20 min)
> **Parallel Execution**: YES — 4 independent search waves + 1 synthesis
> **Critical Path**: Wave 1 (all searches) → Task 5 (synthesis) → Task 6 (verification)

---

## Context

### Original Request
Find all API endpoints/services in /opt/coffeetree that fetch stock prices/quotes. Produce a structured report grouped by:
1. API routes related to stock, price, candle, market, quote
2. External quote API integrations (Yahoo Finance, KRX, KIS, Kiwoom etc.)
3. Fetcher/service/repository functions that fetch quote data
4. `.env` files and env vars related to quote APIs

Constraints: read-only, no edits, no network calls. List env keys but NOT values.

### Interview Summary
**Key Discussions**: No interview needed — user provided complete specification.

**Research Findings** (from initial exploration):
- **Monorepo structure**: `apps/bridge/` (Python/FastAPI), `apps/web/` (Next.js/TypeScript), `packages/shared/` (TypeScript types)
- **API routes directory**: `apps/bridge/api/routes/` contains `market.py`, `kis.py`, `indices.py` (likely quote-related), plus `health.py`, `backtest.py`, `paper.py`, `risk.py`, `strategies.py`, `notifications.py`, `llm.py`
- **Data sources**: `apps/bridge/data/sources/yahoo.py`, `apps/bridge/data/sources/kis.py`
- **KIS broker integration**: `apps/bridge/kis/` — `client.py`, `realtime.py`, `auth.py`, `account.py`, `order.py`, `rate_limiter.py`, `constants.py`
- **Data collection**: `apps/bridge/data/collector.py`, `apps/bridge/data/scheduler.py`, `apps/bridge/data/batch/` (history_collector.py, stock_list.py, etc.)
- **Caching**: `apps/bridge/cache/price_cache.py`
- **WebSocket**: `apps/bridge/websocket/realtime_handler.py`
- **Web hooks**: `apps/web/hooks/use-realtime-price.ts`, `apps/web/hooks/use-websocket.ts`
- **Web components** (render-layer, may reference price fetch): `price-ticker.tsx`, `trade-chart.tsx`, `market-summary.tsx`
- **Env files found**: `.env.example`, `apps/bridge/.env`, `apps/web/.env.local`, `docker/.env.example`, `docker/.env`

### Metis Review
**Identified Gaps** (addressed):
- `packages/shared/` must also be searched for quote/price type definitions or API wrappers → Added to Task 3
- `apps/web/` Next.js API routes (`app/api/`) must be checked for proxy routes → Added to Task 1
- All 5+ env files must be scanned, not just the obvious 3 → Added to Task 4
- Scope guardrails needed to prevent including non-quote files like `backtest.py`, `llm.py` → Guardrails section added
- Acceptance criteria for report completeness and no-secret-leak validation → Added

---

## Work Objectives

### Core Objective
Produce a comprehensive, structured markdown report documenting every file in `/opt/coffeetree` that is involved in fetching, serving, caching, or proxying stock price/quote data.

### Concrete Deliverables
- `/opt/coffeetree/docs/STOCK_API_REPORT.md` — Single markdown file with 4 sections matching user's categories

### Definition of Done
- [ ] Report exists at `/opt/coffeetree/docs/STOCK_API_REPORT.md` and is non-empty
- [ ] Report contains all 4 required section headings
- [ ] Every file path in report exists on disk (verifiable)
- [ ] Zero secret/env values leaked — only key names appear
- [ ] Report covers bridge API routes, data sources, fetcher services, env vars, AND web-side price hooks

### Must Have
- All 4 groupings the user specified
- File paths relative to project root
- Per-file notes: what it does, provider (if applicable), main functions, route paths (if applicable)
- Env var key names only (never values)

### Must NOT Have (Guardrails)
- **No secret values**: Even if values look non-sensitive, omit ALL env values
- **No network calls**: No curl, no pip install, no npm run, no API hitting
- **No file mutations** (except creating the report file itself)
- **No non-quote files**: Do NOT include `backtest.py`, `strategies.py`, `llm.py`, `notifications.py`, `health.py` UNLESS they directly contain stock-price-fetching logic (confirmed via grep)
- **No frontend render components**: Only include web hooks/services that **fetch** price data, not components that display it (e.g., exclude `price-ticker.tsx` unless it contains fetch logic)
- **No database schema analysis**: Focus on fetch/serve layer, not storage schema
- **No WebSocket protocol reverse-engineering**: Note WebSocket exists, but don't deep-dive the message format

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: N/A (no code changes)
- **User wants tests**: Manual-only (read-only research task)
- **Framework**: N/A

### Automated Verification

```bash
# 1. Report file exists and is non-empty
test -s /opt/coffeetree/docs/STOCK_API_REPORT.md && echo "PASS: report exists" || echo "FAIL: report missing"

# 2. Report contains all 4 required sections
SECTIONS=$(grep -cE "^## [1-4]\." /opt/coffeetree/docs/STOCK_API_REPORT.md || grep -cE "^## .*(Route|API Route|External|Fetcher|Env)" /opt/coffeetree/docs/STOCK_API_REPORT.md)
echo "Section count: $SECTIONS (expect >= 4)"

# 3. No secret values leaked (no KEY=VALUE with actual values)
LEAKS=$(grep -cP '=\s*[A-Za-z0-9_]{8,}' /opt/coffeetree/docs/STOCK_API_REPORT.md || echo 0)
echo "Potential secret leaks: $LEAKS (expect 0)"

# 4. Every file path mentioned actually exists
grep -oP '`[^`]*\.(py|ts|tsx|env[^`]*)`' /opt/coffeetree/docs/STOCK_API_REPORT.md | tr -d '`' | while read f; do
  test -e "/opt/coffeetree/$f" || echo "MISSING: $f"
done
echo "Path verification complete"
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all independent searches):
├── Task 1: Search API routes for quote-related endpoints
├── Task 2: Search external quote API integrations
├── Task 3: Search fetcher/service/repository functions
└── Task 4: Search env files for quote API keys

Wave 2 (After Wave 1):
└── Task 5: Synthesize all findings into structured report

Wave 3 (After Wave 2):
└── Task 6: Verify report completeness and no-secret-leak

Critical Path: Wave 1 → Task 5 → Task 6
Parallel Speedup: ~60% faster than sequential (4 searches run simultaneously)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 5 | 2, 3, 4 |
| 2 | None | 5 | 1, 3, 4 |
| 3 | None | 5 | 1, 2, 4 |
| 4 | None | 5 | 1, 2, 3 |
| 5 | 1, 2, 3, 4 | 6 | None |
| 6 | 5 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3, 4 | `delegate_task(category="quick", load_skills=["python-programmer"], run_in_background=true)` x 4 |
| 2 | 5 | `delegate_task(category="writing", load_skills=["python-programmer"])` |
| 3 | 6 | `delegate_task(category="quick", load_skills=[])` |

---

## TODOs

- [ ] 1. Search API Routes for Stock/Quote Endpoints

  **What to do**:
  - Grep all files under `apps/bridge/api/routes/` for stock/price/quote patterns
  - Also check `apps/web/` for Next.js API routes (`app/api/` directories)
  - Also check `apps/bridge/apps/bridge/api/routes/` (nested duplicate found in structure)
  - For each match: read the file, extract route decorators (`@router.get`, `@router.post`), function names, and docstrings
  - Record: file path, route path, HTTP method, what data it returns, which provider it calls

  **Exact search commands**:
  ```bash
  # Primary: Bridge API routes
  grep -rnl -E 'stock|price|candle|market|quote|ohlcv|ticker|current_price|get_price' /opt/coffeetree/apps/bridge/api/routes/ --include="*.py"

  # Secondary: Next.js API routes (if any)
  find /opt/coffeetree/apps/web -path "*/api/*" -name "*.ts" -o -name "*.tsx" | head -20

  # Tertiary: Nested bridge API (apps/bridge/apps/bridge/api/)
  find /opt/coffeetree/apps/bridge/apps -name "*.py" -path "*/api/*" | head -20
  ```

  - For EACH file found, read it fully and extract:
    - Route path (e.g., `/api/market/price/{symbol}`)
    - HTTP method (GET/POST)
    - Function name
    - What service/module it calls
    - Brief description

  **Must NOT do**:
  - Do NOT include routes unrelated to stock quotes (health, notifications, llm)
  - Do NOT include routes UNLESS grep confirms quote-related content
  - Do NOT execute any API endpoints

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read-only file search, no complex reasoning needed
  - **Skills**: [`python-programmer`]
    - `python-programmer`: Understands FastAPI route decorators and Python module structure
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — only checking if web API routes exist, not UI
    - `git-master`: No git operations
    - `dev-browser`: No browser needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References** (files to search):
  - `apps/bridge/api/routes/market.py` — Most likely to contain market data endpoints
  - `apps/bridge/api/routes/kis.py` — KIS broker-specific API endpoints
  - `apps/bridge/api/routes/indices.py` — Market index data endpoints
  - `apps/bridge/api/routes/__init__.py` — Router registration (shows all mounted routes)

  **Stop Conditions**:
  - Stop if grep returns no matches for a file — skip it
  - Include a file ONLY if it contains at least one of: `stock|price|candle|market|quote|ohlcv|ticker`

  **Acceptance Criteria**:
  ```bash
  # Agent captures grep output and file reads as structured notes
  # Output format per file: {path, routes: [{method, path, function, description}]}
  # All discovered route files are read and documented
  grep -rnl -E 'stock|price|candle|market|quote|ohlcv|ticker' /opt/coffeetree/apps/bridge/api/routes/ --include="*.py" | wc -l
  # Assert: output > 0 (at minimum market.py, kis.py should match)
  ```

  **Commit**: NO (read-only task, no file changes)

---

- [ ] 2. Search External Quote API Integrations

  **What to do**:
  - Identify all external data provider integrations (Yahoo Finance, KRX, KIS, Kiwoom, etc.)
  - Search `apps/bridge/data/sources/` (all files), `apps/bridge/kis/` (all files)
  - Also grep entire repo for provider-specific imports/URLs
  - For each integration: record provider name, file path, main class/functions, what data it fetches, authentication method

  **Exact search commands**:
  ```bash
  # Known data source files
  ls -la /opt/coffeetree/apps/bridge/data/sources/

  # Known KIS integration files
  ls -la /opt/coffeetree/apps/bridge/kis/

  # Grep for provider-specific patterns across entire codebase
  grep -rnl -E 'yahoo|yfinance|finance\.yahoo|krx|한국거래소|한국투자|kis_developer|kiwoom|키움|open_api|efinance|naver\.finance|alpha.?vantage|polygon\.io|finnhub|twelvedata' /opt/coffeetree/ --include="*.py" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=__pycache__

  # Grep for HTTP client calls that might fetch external data
  grep -rnl -E 'httpx|aiohttp|requests\.get|fetch\(|axios' /opt/coffeetree/apps/bridge/ --include="*.py"
  ```

  - For EACH discovered file, read and extract:
    - Provider name (Yahoo, KIS, KRX, etc.)
    - Base URL / API endpoint (the URL string, not secret keys)
    - Main class name and key methods
    - What data it returns (price, OHLCV, real-time, etc.)
    - Auth method (API key, OAuth, token refresh, etc.) — name the method, NOT the secret

  **Must NOT do**:
  - Do NOT include internal service-to-service calls
  - Do NOT include notification providers (Telegram, Slack, etc.)
  - Do NOT expose API keys or tokens — only note auth method exists

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File search + read, straightforward pattern matching
  - **Skills**: [`python-programmer`]
    - `python-programmer`: Understands Python HTTP client patterns, class structures
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Unlikely to find TS-based external integrations in bridge
    - `dev-browser`: No browser needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References** (known files to read):
  - `apps/bridge/data/sources/yahoo.py` — Yahoo Finance integration
  - `apps/bridge/data/sources/kis.py` — KIS data source adapter
  - `apps/bridge/kis/client.py` — KIS API client (likely HTTP calls)
  - `apps/bridge/kis/realtime.py` — KIS WebSocket realtime data
  - `apps/bridge/kis/auth.py` — KIS authentication/token management
  - `apps/bridge/kis/constants.py` — API URLs, endpoints

  **Stop Conditions**:
  - After reading all files in `data/sources/` and `kis/`, stop expanding search
  - Only follow grep hits for additional files outside those directories
  - Max scope: `apps/bridge/` + `packages/shared/` (not `apps/web/` for external integrations)

  **Acceptance Criteria**:
  ```bash
  # At minimum, yahoo.py and kis/ files are documented
  ls /opt/coffeetree/apps/bridge/data/sources/*.py | wc -l
  # Assert: >= 2 (yahoo.py, kis.py, __init__.py)
  ls /opt/coffeetree/apps/bridge/kis/*.py | wc -l
  # Assert: >= 5 (client, realtime, auth, constants, etc.)
  ```

  **Commit**: NO (read-only)

---

- [ ] 3. Search Fetcher/Service/Repository Functions

  **What to do**:
  - Find all Python/TypeScript functions whose primary purpose is fetching, collecting, caching, or serving quote/price data
  - Search: `apps/bridge/data/` (collector, scheduler, batch/), `apps/bridge/cache/price_cache.py`, `apps/bridge/websocket/`, `apps/bridge/database/` (for repository-pattern query functions), `packages/shared/`, `apps/web/hooks/`
  - For each: record file path, function/class names, what it does, what provider it wraps

  **Exact search commands**:
  ```bash
  # Data collection layer
  grep -rnl -E 'fetch|collect|price|quote|ohlcv|candle|get_.*price|get_.*quote|current_price' /opt/coffeetree/apps/bridge/data/ --include="*.py"

  # Cache layer
  grep -rn -E 'price|quote|cache' /opt/coffeetree/apps/bridge/cache/ --include="*.py"

  # WebSocket / realtime
  grep -rn -E 'price|quote|tick|realtime|subscribe' /opt/coffeetree/apps/bridge/websocket/ --include="*.py"

  # Database repository layer (functions that query stored price data)
  grep -rnl -E 'price|ohlcv|candle|quote|stock' /opt/coffeetree/apps/bridge/database/ --include="*.py"

  # Shared packages (type defs or client wrappers)
  grep -rnl -E 'price|quote|stock|candle|ohlcv|market' /opt/coffeetree/packages/ --include="*.ts" --exclude-dir=node_modules

  # Web hooks (frontend fetch layer)
  grep -rnl -E 'price|quote|stock|realtime|websocket|fetch' /opt/coffeetree/apps/web/hooks/ --include="*.ts"

  # Scheduler/batch layer
  grep -rnl -E 'price|quote|collect|fetch|ohlcv' /opt/coffeetree/apps/bridge/data/batch/ --include="*.py"
  grep -rnl -E 'price|quote|collect|fetch|ohlcv' /opt/coffeetree/apps/bridge/schedulers/ --include="*.py"
  ```

  - For EACH file, read and extract:
    - Class/function names relevant to quote fetching
    - What data it handles (realtime price, historical OHLCV, etc.)
    - What provider/source it wraps or calls
    - Brief note on the pattern (scheduler, cache, repository, hook, etc.)

  **Must NOT do**:
  - Do NOT include indicator calculation files (`apps/bridge/indicators/`) — they consume prices, not fetch them
  - Do NOT include strategy/backtest/risk files unless they directly fetch quotes
  - Do NOT include frontend render components (only hooks that fetch)
  - Do NOT deep-dive DB schema models — only repository functions that query price data

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pattern search + file reads, no complex logic
  - **Skills**: [`python-programmer`]
    - `python-programmer`: Understands async Python patterns, class methods, decorators
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: Minor TS involvement (hooks, shared types) but Python dominates
    - `data-scientist`: Not analyzing data, just finding fetch functions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References** (files to read):
  - `apps/bridge/data/collector.py` — Main data collection orchestrator
  - `apps/bridge/data/scheduler.py` — Scheduled data fetching
  - `apps/bridge/data/batch/history_collector.py` — Historical data batch fetcher
  - `apps/bridge/data/batch/stock_list.py` — Stock list management
  - `apps/bridge/cache/price_cache.py` — Price caching layer
  - `apps/bridge/websocket/realtime_handler.py` — WebSocket realtime price handler
  - `apps/bridge/database/models/ohlcv.py` — OHLCV data model (check for query methods)
  - `apps/bridge/database/timescale.py` — TimescaleDB queries (may have price queries)
  - `apps/web/hooks/use-realtime-price.ts` — Frontend realtime price hook
  - `apps/web/hooks/use-websocket.ts` — Frontend WebSocket hook
  - `packages/shared/src/types/` — Shared type definitions

  **Stop Conditions**:
  - Read each matched file once; don't chase transitive imports beyond 1 level
  - If a file's primary purpose is NOT quote fetching (e.g., order execution, risk calc), skip even if it mentions "price"

  **Acceptance Criteria**:
  ```bash
  # Key files must be documented
  for f in apps/bridge/data/collector.py apps/bridge/cache/price_cache.py apps/bridge/websocket/realtime_handler.py; do
    test -f "/opt/coffeetree/$f" && echo "EXISTS: $f" || echo "MISSING: $f"
  done
  # Assert: all exist
  ```

  **Commit**: NO (read-only)

---

- [ ] 4. Search Env Files for Quote API Configuration

  **What to do**:
  - Read ALL env files and `.env.example` files
  - Extract ONLY key names (left side of `=`), NEVER values
  - Filter for keys related to quote/market data APIs
  - For each key: note which provider it belongs to, what it's used for (API key, secret, URL, etc.)

  **Exact search commands**:
  ```bash
  # List all env files
  find /opt/coffeetree -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*"

  # Read .env.example files (safe to show fully - they contain placeholders):
  cat /opt/coffeetree/.env.example
  cat /opt/coffeetree/docker/.env.example

  # For actual .env files: extract KEY NAMES ONLY (left of =):
  grep -E '^[A-Z_]+=|^[a-z_]+=' /opt/coffeetree/apps/bridge/.env | cut -d= -f1
  grep -E '^[A-Z_]+=|^[a-z_]+=' /opt/coffeetree/apps/web/.env.local | cut -d= -f1
  grep -E '^[A-Z_]+=|^[a-z_]+=' /opt/coffeetree/docker/.env | cut -d= -f1

  # Also check for env var references in code
  grep -rn -E 'os\.environ|os\.getenv|env\.|process\.env\.' /opt/coffeetree/apps/bridge/ --include="*.py" | grep -iE 'kis|yahoo|api_key|api_secret|app_key|app_secret|token|stock|market|krx'
  ```

  - Group discovered keys by provider:
    - KIS/한국투자증권: `KIS_*`, `APPKEY`, `APPSECRET`, `CANO`, etc.
    - Yahoo Finance: `YAHOO_*`, `YFINANCE_*`
    - Supabase (data storage): `SUPABASE_*`
    - Redis (cache): `REDIS_*`
    - Other providers as discovered

  **Must NOT do**:
  - **NEVER** include values — only key names
  - Do NOT include env vars unrelated to stock/quote (e.g., `TELEGRAM_BOT_TOKEN`, `SMTP_*`)
  - Do NOT include `.env` files from `node_modules/`
  - Exception: `.env.example` files CAN be shown fully since they contain placeholder values

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file reads and text extraction
  - **Skills**: [`python-programmer`]
    - `python-programmer`: Understands Python os.environ patterns
  - **Skills Evaluated but Omitted**:
    - All other skills: Not relevant for env file scanning

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References** (files to read):
  - `.env.example` — Root example file (safe to show fully)
  - `apps/bridge/.env` — Bridge app config (KEYS ONLY)
  - `apps/web/.env.local` — Web app config (KEYS ONLY)
  - `docker/.env.example` — Docker config example (safe to show fully)
  - `docker/.env` — Docker runtime config (KEYS ONLY)
  - `apps/bridge/kis/auth.py` — Where KIS env vars are consumed (reference for key usage)
  - `apps/bridge/kis/constants.py` — May define default URLs/env var names

  **Stop Conditions**:
  - After reading all 5-6 env files and grepping code for env references, stop
  - Do NOT search for env vars in `node_modules/` or `.git/`

  **Acceptance Criteria**:
  ```bash
  # All env files were scanned
  find /opt/coffeetree -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l
  # Assert: matches count of env files documented in report

  # Agent must self-verify: output contains key names like KIS_APP_KEY but NOT actual values
  ```

  **Commit**: NO (read-only)

---

- [ ] 5. Synthesize Findings into Structured Report

  **What to do**:
  - Collect outputs from Tasks 1-4
  - Assemble into a single markdown file at `/opt/coffeetree/docs/STOCK_API_REPORT.md`
  - Structure with 4 main sections matching user's categories
  - Each entry: file path (relative to project root), brief description, provider, main functions, route paths
  - Add a TL;DR section at top summarizing providers found and key counts

  **Report structure template**:
  ```markdown
  # Stock Quote API Discovery Report
  
  ## TL;DR
  - Providers found: [list]
  - API routes: N endpoints
  - External integrations: N providers
  - Fetcher services: N files
  - Env vars: N keys across M files
  
  ## 1. API Routes (Stock/Price/Quote Endpoints)
  | File | Route | Method | Description | Provider |
  |------|-------|--------|-------------|----------|
  
  ## 2. External Quote API Integrations
  ### Yahoo Finance
  | File | Main Class/Functions | Data Type | Auth |
  ...
  
  ### KIS (한국투자증권)
  ...
  
  ## 3. Fetcher/Service/Repository Functions
  | File | Function/Class | Purpose | Wraps |
  ...
  
  ## 4. Environment Variables (Quote API Config)
  | Env File | Key Name | Provider | Purpose |
  ...
  
  (values intentionally omitted for security)
  ```

  **Must NOT do**:
  - Do NOT invent files that weren't found in Tasks 1-4
  - Do NOT include secret values anywhere in the report
  - Do NOT include files whose connection to stock quotes is speculative

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Synthesizing structured documentation from research findings
  - **Skills**: [`python-programmer`]
    - `python-programmer`: Understanding code context for accurate descriptions
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not relevant for markdown report writing
    - `git-master`: No commits in this task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (Sequential after Wave 1)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2, 3, 4

  **References**:
  - Outputs from Tasks 1-4 (passed via session context)
  - User's original grouping specification (4 categories)

  **Acceptance Criteria**:
  ```bash
  # Report exists
  test -s /opt/coffeetree/docs/STOCK_API_REPORT.md && echo "PASS"

  # Has all 4 sections
  grep -c "^## [1-4]\." /opt/coffeetree/docs/STOCK_API_REPORT.md
  # Assert: 4

  # Has TL;DR
  grep -c "TL;DR" /opt/coffeetree/docs/STOCK_API_REPORT.md
  # Assert: >= 1
  ```

  **Commit**: YES
  - Message: `docs: add stock quote API discovery report`
  - Files: `docs/STOCK_API_REPORT.md`
  - Pre-commit: Verification in Task 6

---

- [ ] 6. Verify Report Completeness and No-Secret-Leak

  **What to do**:
  - Run all verification commands from the Verification Strategy section
  - Check every file path in report exists on disk
  - Check no secret values are present
  - Check all 4 sections are present and non-empty

  **Exact verification commands**:
  ```bash
  # 1. Report exists
  test -s /opt/coffeetree/docs/STOCK_API_REPORT.md && echo "PASS: exists" || echo "FAIL"

  # 2. All 4 sections
  grep -cE "^## [1-4]\." /opt/coffeetree/docs/STOCK_API_REPORT.md

  # 3. No secrets (no KEY=VALUE with real values in the report)
  grep -cP '=\s*[A-Za-z0-9_-]{8,}' /opt/coffeetree/docs/STOCK_API_REPORT.md
  # Assert: 0

  # 4. File path validation
  grep -oP '`[^`]*\.(py|ts|tsx|env[^`]*)`' /opt/coffeetree/docs/STOCK_API_REPORT.md | tr -d '`' | while read f; do
    test -e "/opt/coffeetree/$f" || echo "MISSING: $f"
  done

  # 5. Tables are non-empty (each section has at least 1 data row)
  awk '/^## 1\./,/^## 2\./' /opt/coffeetree/docs/STOCK_API_REPORT.md | grep -c '|.*|.*|'
  # Assert: > 2 (header + separator + at least 1 data row)
  ```

  **Must NOT do**:
  - Do NOT modify the report — only verify
  - If issues found, report them back for Task 5 to fix

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running verification commands only
  - **Skills**: []
    - No specialized skills needed for bash verification
  - **Skills Evaluated but Omitted**:
    - All: Not relevant for verification scripts

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (Sequential, final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 5

  **References**:
  - `/opt/coffeetree/docs/STOCK_API_REPORT.md` — The report to verify

  **Acceptance Criteria**:
  ```bash
  # All 5 verification checks pass with expected values
  echo "All verifications passed"
  ```

  **Commit**: NO (verification only)

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Independent search: API routes |
| Task 2 | None | Independent search: External integrations |
| Task 3 | None | Independent search: Fetcher services |
| Task 4 | None | Independent search: Env vars |
| Task 5 | Tasks 1, 2, 3, 4 | Needs ALL search results to synthesize report |
| Task 6 | Task 5 | Needs completed report to verify |

## Parallel Execution Graph

```
Wave 1 (Start immediately — all independent):
├── Task 1: Search API routes for quote endpoints
├── Task 2: Search external quote API integrations
├── Task 3: Search fetcher/service/repository functions
└── Task 4: Search env files for quote API keys

Wave 2 (After Wave 1 completes):
└── Task 5: Synthesize all findings into docs/STOCK_API_REPORT.md

Wave 3 (After Wave 2):
└── Task 6: Verify report completeness and no-secret-leak

Critical Path: Wave 1 (longest search) → Task 5 → Task 6
Estimated Parallel Speedup: ~60% vs sequential
```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 5 | `docs: add stock quote API discovery report` | `docs/STOCK_API_REPORT.md` | Task 6 verification |

---

## Success Criteria

### Verification Commands
```bash
test -s /opt/coffeetree/docs/STOCK_API_REPORT.md && echo "PASS"  # Report exists
grep -cE "^## [1-4]\." /opt/coffeetree/docs/STOCK_API_REPORT.md  # Expected: 4
grep -cP '=\s*[A-Za-z0-9_-]{8,}' /opt/coffeetree/docs/STOCK_API_REPORT.md  # Expected: 0
```

### Final Checklist
- [ ] All "Must Have" present (4 categories, file paths, per-file notes)
- [ ] All "Must NOT Have" absent (no secrets, no network calls, no non-quote files)
- [ ] Report file paths all exist on disk
- [ ] Report committed with proper message
