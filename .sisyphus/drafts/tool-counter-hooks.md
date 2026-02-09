# Draft: Tool Counter Utility + Read/Bash Optimizer Hooks

## Requirements (confirmed)
- **3 new files to create**: `src/utils/tool-counter.mjs`, `hooks/read-optimizer.mjs`, `hooks/bash-optimizer.mjs`
- **1 file to modify**: `hooks/hooks.json` (PreToolUse section only)
- **All files**: `.mjs` extension
- **No optional chaining** (`?.`) — use explicit null checks (project convention in `hooks/` and `fusion-router-logic.mjs`)
- **Korean comments** — match existing codebase style (모든 JSDoc/주석 한국어)
- **Hook additions**: New hooks MUST be placed AFTER the existing `Task` matcher in hooks.json PreToolUse array

## Technical Decisions
- **Hook API**: PreToolUse hooks receive `{ tool_name, tool_input }` via stdin JSON, output `{ allow: true/false, reason?, message? }` to stdout
- **Coding style**: Uses `var` not `const/let` in hooks (see fusion-router.mjs), but `const/let` in src/utils (see usage.mjs, config.mjs)
- **Test framework**: Node.js built-in `node:test` with `node:assert` — pattern: `tests/**/*.test.mjs`
- **No optional chaining in hooks dir** (fusion-router.mjs uses `&&` patterns)
- **Nullish coalescing `??` IS used** in src/utils/ (usage.mjs, config.mjs) — BUT NOT optional chaining `?.`

## Research Findings
- **hooks.json structure**: `PreToolUse` array has matchers with tool names. Currently only `Task` matcher exists.
- **Hook execution**: `node ${CLAUDE_PLUGIN_ROOT}/hooks/<file>.mjs` with timeout
- **Existing utils**: `state-manager.mjs`, `fusion-tracker.mjs`, `call-logger.mjs` — all use JSONL/JSON file-based persistence
- **Session tracking**: Uses `getSessionIdFromTty()` from `src/utils/session-id.mjs`

## Open Questions
- What exactly should tool-counter count? (All tool calls? Per-session? Cumulative?)
- What should read-optimizer do? (Cache repeated reads? Warn on large files? Limit frequency?)
- What should bash-optimizer do? (Block dangerous commands? Warn on long-running? Optimize patterns?)
- Should counters persist across sessions or be session-scoped?
- What thresholds/limits should optimizers enforce?

## Scope Boundaries
- INCLUDE: 3 new files, hooks.json modification, tests
- EXCLUDE: No changes to existing hooks, no changes to fusion-router
