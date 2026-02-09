# Draft: OMC Provider Authentication Analysis

## Requirements (confirmed)
- **Scope**: Analysis only, NO implementation
- **Target files**: 
  - `~/.claude/plugins/marketplaces/omc/src/hud/usage-api.ts` ✅ READ
  - `~/.claude/.credentials.json` ✅ READ
  - macOS Keychain access logic ✅ IDENTIFIED

## Research Findings

### 1. Credentials.json Structure (CONFIRMED)

**Exact schema discovered:**
```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",      // OAuth access token
    "refreshToken": "sk-ant-ort01-...",     // OAuth refresh token  
    "expiresAt": 1769578686500,             // Unix timestamp (milliseconds)
    "scopes": ["user:inference", "user:mcp_servers", "user:profile", "user:sessions:claude_code"],
    "subscriptionType": "max",              // User's subscription tier
    "rateLimitTier": "default_claude_max_20x"
  },
  "mcpOAuth": {
    "plugin:sentry:sentry|800cb29a3ac61727": {
      "serverName": "plugin:sentry:sentry",
      "serverUrl": "https://mcp.sentry.dev/mcp",
      "clientId": "...",
      "accessToken": "",                    // May be empty if not authed
      "expiresAt": 0
    },
    // ... other MCP OAuth entries
  }
}
```

### 2. Multi-Provider Support (CONFIRMED)

**Anthropic (Claude)**: YES - Full OAuth support via `claudeAiOauth`
**OpenAI**: NO - Not stored in credentials.json  
**Google**: NO - Not stored in credentials.json

**MCP OAuth providers stored:**
- Sentry MCP
- Linear MCP  
- Supabase MCP (includes clientSecret!)

### 3. Token Refresh Mechanism

**FROM CODE ANALYSIS** (usage-api.ts):
- `expiresAt` field checked in `validateCredentials()` (line 186-194)
- If expired, credentials are rejected
- **NO refresh logic found in usage-api.ts** - only validation
- Refresh must happen elsewhere (Claude Code itself, not OMC)

### 4. macOS Keychain Access Logic

**Command used** (line 119-121):
```bash
/usr/bin/security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null
```

**Flow**:
1. `getCredentials()` calls `readKeychainCredentials()` first (macOS only)
2. Falls back to `readFileCredentials()` if Keychain fails
3. Both methods handle nested `claudeAiOauth` wrapper

### 5. Usage Tracking Feasibility

**API Endpoint**: `api.anthropic.com/api/oauth/usage`
**Required Header**: `anthropic-beta: oauth-2025-04-20`
**Auth**: Bearer token from accessToken

**Response structure**:
```json
{
  "five_hour": { "utilization": number, "resets_at": string },
  "seven_day": { "utilization": number, "resets_at": string },
  "seven_day_sonnet": { "utilization": number, "resets_at": string },
  "seven_day_opus": { "utilization": number, "resets_at": string }
}
```

## Open Questions
- Does Claude Code handle token refresh internally?
- Where are OpenAI/Google keys stored if user has them?
- Is the Supabase clientSecret storage a security concern?

## Scope Boundaries
- INCLUDE: Auth flow analysis, credential structure, keychain access
- EXCLUDE: Code modification, security fixes, implementation
