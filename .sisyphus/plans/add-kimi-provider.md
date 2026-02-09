# Add kimi/kimi-for-coding as 4th Tracked Provider (Strict Scope)

## TL;DR

> **Quick Summary**: Add `kimi` as the 4th provider in exactly 4 source files (metrics-collector, realtime-tracker, call-logger, omcm-hud) plus the mandatory documentation updates required by repo rules.
>
> **Deliverables**:
> - 4 source files edited via Edit tool
> - 5 documentation files updated per CLAUDE.md rules
>
> **Files IN scope** (exhaustive):
> 1. `src/tracking/metrics-collector.mjs`
> 2. `src/tracking/realtime-tracker.mjs`
> 3. `src/tracking/call-logger.mjs`
> 4. `src/hud/omcm-hud.mjs`
> 5. `docs/ko/FEATURES.md` (required: src/tracking/ change)
> 6. `docs/en/FEATURES.md` (required: src/tracking/ change)
> 7. `docs/ko/CONFIGURATION.md` (required: src/hud/ change)
> 8. `docs/en/CONFIGURATION.md` (required: src/hud/ change)
> 9. `docs/CHANGELOG.md` (required: new feature)
>
> **Files explicitly OUT of scope**:
> - `src/utils/fusion-tracker.mjs` — NOT touched
> - `src/utils/provider-limits.mjs` — NOT touched
> - `src/router/balancer.mjs` — NOT touched
> - `src/hud/fusion-renderer.mjs` — NOT touched
> - All test files — NOT touched
> - No new files created
>
> **Estimated Effort**: Small-Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (tracking) -> Task 2 (HUD) -> Task 3 (docs)

---

## Context

### Original Request
Add `kimi/kimi-for-coding` as a 4th tracked provider. User explicitly specified 4 files:
metrics-collector.mjs, realtime-tracker.mjs, call-logger.mjs, omcm-hud.mjs.

### Repo Rules (from CLAUDE.md)
| Modified area | Required doc update |
|---|---|
| `src/tracking/` | `docs/ko/FEATURES.md` + `docs/en/FEATURES.md` |
| `src/hud/` | `docs/ko/CONFIGURATION.md` + `docs/en/CONFIGURATION.md` |
| New feature | `docs/CHANGELOG.md` + relevant docs |

### Known Limitations (out-of-scope dependencies)
These are **acknowledged but intentionally not addressed** per strict scope:
- `fusion-tracker.mjs`: `updateSavingsFromTokens()` signature unchanged; kimi tokens passed from omcm-hud but savings calc will not include kimi until that file is updated separately.
- `fusion-renderer.mjs`: `renderProviderTokens()` / `renderProviderCounts()` will receive kimi data from omcm-hud but will not render it until that file is updated separately.
- `provider-limits.mjs`: No kimi entry in `getDefaultLimits()` or `getLimitsForHUD()`.
- `balancer.mjs`: No kimi in `DEFAULT_PROVIDERS`.
- All test files: No new test cases.

---

## Work Objectives

### Core Objective
Add kimi provider recognition and data tracking to the 4 user-specified files using the Edit tool exclusively for all source changes.

### Must Have
- `normalizeProvider()` in metrics-collector.mjs and realtime-tracker.mjs recognizes `'kimi'` and `'moonshot'`
- Provider data structures in all 4 files include kimi fields
- Inline provider checks in call-logger.mjs and omcm-hud.mjs recognize kimi
- omcm-hud.mjs aggregates kimi tokens in both code paths (session-based + legacy)
- Documentation updated per repo rules

### Must NOT Have (Guardrails)
- Do NOT edit any file outside the 9 listed above
- Do NOT create new files
- Do NOT refactor provider patterns into dynamic/configurable systems
- Do NOT change existing function signatures
- Do NOT modify existing fallback/default behavior for unknown providers
- All changes via Edit tool (not Write)

### Normalization Rule (used in every normalizeProvider site)
```javascript
if (lower === 'kimi' || lower === 'moonshot') return 'kimi';
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: src/tracking/ (3 files, independent)
└── Task 2: src/hud/omcm-hud.mjs (independent of tracking internals)

Wave 2 (After Wave 1):
└── Task 3: Documentation (5 files, reflects final source state)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | None | None |

---

## TODOs

- [ ] 1. Add kimi to tracking modules (metrics-collector.mjs, realtime-tracker.mjs, call-logger.mjs)

  **What to do — all edits via Edit tool**:

  ### File: `src/tracking/metrics-collector.mjs`

  **Edit 1a** — JSDoc header (line 5):
  ```
  oldString: " * - Provider usage (claude, openai, gemini)"
  newString: " * - Provider usage (claude, openai, gemini, kimi)"
  ```

  **Edit 1b** — `getDefaultMetrics().providers` (lines 18-22): add kimi entry after gemini:
  ```
  oldString: "      gemini: { calls: 0, errors: 0, totalDuration: 0, estimatedTokens: 0 }\n    },"
  newString: "      gemini: { calls: 0, errors: 0, totalDuration: 0, estimatedTokens: 0 },\n      kimi: { calls: 0, errors: 0, totalDuration: 0, estimatedTokens: 0 }\n    },"
  ```

  **Edit 1c** — `tokenSavings.byProvider` (line 30): add kimi:
  ```
  oldString: "      byProvider: { openai: 0, gemini: 0 }"
  newString: "      byProvider: { openai: 0, gemini: 0, kimi: 0 }"
  ```

  **Edit 1d** — `errors.byProvider` (line 36): add kimi:
  ```
  oldString: "      byProvider: { claude: 0, openai: 0, gemini: 0 },"
  newString: "      byProvider: { claude: 0, openai: 0, gemini: 0, kimi: 0 },"
  ```

  **Edit 1e** — `normalizeProvider()` (lines 59-63): add kimi rule after gemini, before fallback:
  ```
  oldString: "  if (lower === 'google' || lower === 'gemini') return 'gemini';\n  \n  return 'claude';"
  newString: "  if (lower === 'google' || lower === 'gemini') return 'gemini';\n  if (lower === 'kimi' || lower === 'moonshot') return 'kimi';\n  \n  return 'claude';"
  ```

  **Edit 1f** — `recordRouting` JSDoc (line 98): add kimi:
  ```
  oldString: "   * @param {string} provider - Provider name (claude, openai, gemini)"
  newString: "   * @param {string} provider - Provider name (claude, openai, gemini, kimi)"
  ```

  **Edit 1g** — agent metrics `providers` init (line 129): add kimi:
  ```
  oldString: "          providers: { claude: 0, openai: 0, gemini: 0 }"
  newString: "          providers: { claude: 0, openai: 0, gemini: 0, kimi: 0 }"
  ```

  **Edit 1h** — `getSummary().byProvider` (lines 272-274): add kimi:
  ```
  oldString: "        gemini: metrics.providers.gemini.calls"
  newString: "        gemini: metrics.providers.gemini.calls,\n        kimi: metrics.providers.kimi.calls"
  ```

  ### File: `src/tracking/realtime-tracker.mjs`

  **Edit 1i** — `TimeBucket.routing.byProvider` (line 83): add kimi:
  ```
  oldString: "      byProvider: { claude: 0, openai: 0, gemini: 0 },"
  newString: "      byProvider: { claude: 0, openai: 0, gemini: 0, kimi: 0 },"
  ```

  **Edit 1j** — `_normalizeProvider()` (lines 195-199): add kimi rule after gemini, before fallback:
  ```
  oldString: "    if (lower === 'google' || lower === 'gemini') return 'gemini';\n    \n    return lower;"
  newString: "    if (lower === 'google' || lower === 'gemini') return 'gemini';\n    if (lower === 'kimi' || lower === 'moonshot') return 'kimi';\n    \n    return lower;"
  ```

  **Edit 1k** — `trackRouting` JSDoc (line 381): add kimi:
  ```
  oldString: "   * @param {string} event.provider - Provider name (claude, openai, gemini)"
  newString: "   * @param {string} event.provider - Provider name (claude, openai, gemini, kimi)"
  ```

  ### File: `src/tracking/call-logger.mjs`

  **Edit 1l** — `logOpenCodeCall` JSDoc (line 17): add kimi:
  ```
  oldString: " * @param {string} callData.provider - 프로바이더 (openai, gemini)"
  newString: " * @param {string} callData.provider - 프로바이더 (openai, gemini, kimi)"
  ```

  **Edit 1m** — `getSessionCalls` return JSDoc (line 79): add kimi:
  ```
  oldString: " * @returns {object} - { openai: number, gemini: number, anthropic: number, total: number, calls: Array }"
  newString: " * @returns {object} - { openai: number, gemini: number, anthropic: number, kimi: number, total: number, calls: Array }"
  ```

  **Edit 1n** — `getSessionCalls` result init (line 82): add kimi:
  ```
  oldString: "  const result = { openai: 0, gemini: 0, anthropic: 0, total: 0, calls: [] };"
  newString: "  const result = { openai: 0, gemini: 0, anthropic: 0, kimi: 0, total: 0, calls: [] };"
  ```

  **Edit 1o** — `getSessionCalls` provider counting (lines 110-112): add kimi branch after anthropic:
  ```
  oldString: "        } else if (provider === 'anthropic' || provider === 'claude') {\n          result.anthropic++;\n        }"
  newString: "        } else if (provider === 'anthropic' || provider === 'claude') {\n          result.anthropic++;\n        } else if (provider === 'kimi' || provider === 'moonshot') {\n          result.kimi++;\n        }"
  ```

  **Edit 1p** — `aggregateSessionTokens` JSDoc (line 127): add kimi:
  ```
  oldString: " * @returns {object} - { openai: { input, output, reasoning, cost, count }, gemini: { input, output, reasoning, cost, count } }"
  newString: " * @returns {object} - { openai: { input, output, reasoning, cost, count }, gemini: { input, output, reasoning, cost, count }, kimi: { input, output, reasoning, cost, count } }"
  ```

  **Edit 1q** — `aggregateSessionTokens` result init (lines 130-133): add kimi:
  ```
  oldString: "    openai: { input: 0, output: 0, reasoning: 0, cost: 0, count: 0 },\n    gemini: { input: 0, output: 0, reasoning: 0, cost: 0, count: 0 }\n  };"
  newString: "    openai: { input: 0, output: 0, reasoning: 0, cost: 0, count: 0 },\n    gemini: { input: 0, output: 0, reasoning: 0, cost: 0, count: 0 },\n    kimi: { input: 0, output: 0, reasoning: 0, cost: 0, count: 0 }\n  };"
  ```

  **Edit 1r** — `aggregateSessionTokens` token loop (lines 156-162): add kimi branch after gemini:
  ```
  oldString: "    } else if (provider === 'gemini' || provider === 'google') {\n      result.gemini.input += inputT;\n      result.gemini.output += outputT;\n      result.gemini.reasoning += reasoningT;\n      result.gemini.cost += costT;\n      result.gemini.count++;\n    }"
  newString: "    } else if (provider === 'gemini' || provider === 'google') {\n      result.gemini.input += inputT;\n      result.gemini.output += outputT;\n      result.gemini.reasoning += reasoningT;\n      result.gemini.cost += costT;\n      result.gemini.count++;\n    } else if (provider === 'kimi' || provider === 'moonshot') {\n      result.kimi.input += inputT;\n      result.kimi.output += outputT;\n      result.kimi.reasoning += reasoningT;\n      result.kimi.cost += costT;\n      result.kimi.count++;\n    }"
  ```

  **Must NOT do**:
  - Do NOT change normalizeProvider fallback returns (`'claude'` in metrics-collector, `lower` in realtime-tracker)
  - Do NOT restructure if/else chains
  - Do NOT touch `src/tracking/index.mjs` or `src/tracking/tool-tracker-logger.mjs`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 18 precise Edit-tool edits across 3 files, all following the same pattern
  - **Skills**: []
    - No skills needed — all edits are exact string replacements

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `src/tracking/metrics-collector.mjs:15-47` — `getDefaultMetrics()`: data structure template. Gemini is the pattern to follow.
  - `src/tracking/metrics-collector.mjs:54-64` — `normalizeProvider()`: canonical normalization. Insert kimi AFTER gemini line 61, BEFORE return line 63.
  - `src/tracking/metrics-collector.mjs:123-131` — agent `providers` init.
  - `src/tracking/metrics-collector.mjs:263-277` — `getSummary()`: byProvider output.
  - `src/tracking/realtime-tracker.mjs:79-96` — `TimeBucket` constructor: byProvider object.
  - `src/tracking/realtime-tracker.mjs:191-200` — `_normalizeProvider()`: second independent implementation.
  - `src/tracking/call-logger.mjs:81-122` — `getSessionCalls()`: inline provider if/else chain.
  - `src/tracking/call-logger.mjs:129-166` — `aggregateSessionTokens()`: per-provider token accumulation.

  **Acceptance Criteria**:
  ```bash
  # 1. Syntax check all 3 files
  node --check src/tracking/metrics-collector.mjs && \
  node --check src/tracking/realtime-tracker.mjs && \
  node --check src/tracking/call-logger.mjs
  # Assert: exit code 0, no output

  # 2. normalizeProvider recognizes kimi in metrics-collector
  grep -n "kimi.*moonshot\|moonshot.*kimi" src/tracking/metrics-collector.mjs
  # Assert: exactly 1 line matching the normalizeProvider rule

  # 3. normalizeProvider recognizes kimi in realtime-tracker
  grep -n "kimi.*moonshot\|moonshot.*kimi" src/tracking/realtime-tracker.mjs
  # Assert: exactly 1 line

  # 4. kimi in all data structures (metrics-collector)
  grep -c "kimi" src/tracking/metrics-collector.mjs
  # Assert: >= 7 (JSDoc, providers, tokenSavings, errors, normalizeProvider, agents.providers, summary)

  # 5. kimi in realtime-tracker
  grep -c "kimi" src/tracking/realtime-tracker.mjs
  # Assert: >= 3 (byProvider, normalizeProvider, JSDoc)

  # 6. kimi in call-logger
  grep -c "kimi" src/tracking/call-logger.mjs
  # Assert: >= 8 (JSDoc x3, result init, counting branch, aggregation init, aggregation branch x2)

  # 7. Existing tests still pass (regression only — no new tests)
  npm test
  # Assert: 0 failures (existing suite; kimi-specific paths untested by design)
  ```

  **Commit**: YES (group 1)
  - Message: `feat(tracking): add kimi/moonshot as 4th tracked provider`
  - Files: `src/tracking/metrics-collector.mjs`, `src/tracking/realtime-tracker.mjs`, `src/tracking/call-logger.mjs`
  - Pre-commit: `node --check` on all 3 files

---

- [ ] 2. Add kimi to omcm-hud.mjs (aggregation + both HUD code paths)

  **What to do — all edits via Edit tool**:

  ### File: `src/hud/omcm-hud.mjs`

  **Edit 2a** — `aggregateOpenCodeTokens()` result init (lines 443-447): add kimi entry after anthropic:
  ```
  oldString: "    anthropic: { input: 0, output: 0, count: 0 },\n  };"
  newString: "    anthropic: { input: 0, output: 0, count: 0 },\n    kimi: { input: 0, output: 0, count: 0 },\n  };"
  ```

  **Edit 2b** — Session-based aggregation: provider counting (lines 478-482): add kimi branch after anthropic:
  ```
  oldString: "          } else if (provider === 'anthropic' || provider === 'claude') {\n            result.anthropic.input += inputTokens;\n            result.anthropic.output += outputTokens;\n            result.anthropic.count++;\n          }"
  newString: "          } else if (provider === 'anthropic' || provider === 'claude') {\n            result.anthropic.input += inputTokens;\n            result.anthropic.output += outputTokens;\n            result.anthropic.count++;\n          } else if (provider === 'kimi' || provider === 'moonshot') {\n            result.kimi.input += inputTokens;\n            result.kimi.output += outputTokens;\n            result.kimi.count++;\n          }"
  ```

  **Edit 2c** — Legacy path: providerID normalization (lines 570-573): add kimi detection BEFORE the final openai fallback:
  ```
  oldString: "              normalizedProvider = 'anthropic';\n            } else {\n              normalizedProvider = 'openai';\n            }"
  newString: "              normalizedProvider = 'anthropic';\n            } else if (modelLower.includes('kimi') || modelLower.includes('moonshot')) {\n              normalizedProvider = 'kimi';\n            } else {\n              normalizedProvider = 'openai';\n            }"
  ```

  **Edit 2d** — Legacy path: token aggregation (lines 595-598): add kimi branch after anthropic:
  ```
  oldString: "            } else if (normalizedProvider === 'anthropic') {\n              result.anthropic.input += inputTokens;\n              result.anthropic.output += outputTokens;\n              result.anthropic.count++;\n            }"
  newString: "            } else if (normalizedProvider === 'anthropic') {\n              result.anthropic.input += inputTokens;\n              result.anthropic.output += outputTokens;\n              result.anthropic.count++;\n            } else if (normalizedProvider === 'kimi') {\n              result.kimi.input += inputTokens;\n              result.kimi.output += outputTokens;\n              result.kimi.count++;\n            }"
  ```

  **Edit 2e** — `buildIndependentHud()`: tokenData object (lines 769-773): add kimi:
  ```
  oldString: "    const tokenData = {\n      claude: claudeTokens,\n      openai: openCodeTokens.openai,\n      gemini: openCodeTokens.gemini,\n    };"
  newString: "    const tokenData = {\n      claude: claudeTokens,\n      openai: openCodeTokens.openai,\n      gemini: openCodeTokens.gemini,\n      kimi: openCodeTokens.kimi,\n    };"
  ```

  **Edit 2f** — `buildIndependentHud()`: sessionCounts.byProvider (lines 801-806): add kimi:
  ```
  oldString: "      byProvider: {\n        anthropic: claudeCount,\n        openai: openCodeTokens.openai.count,\n        gemini: openCodeTokens.gemini.count,\n      }"
  newString: "      byProvider: {\n        anthropic: claudeCount,\n        openai: openCodeTokens.openai.count,\n        gemini: openCodeTokens.gemini.count,\n        kimi: openCodeTokens.kimi.count,\n      }"
  ```

  **Edit 2g** — `main()` OMC-wrapped path: tokenData (lines 879-883): add kimi:
  ```
  oldString: "        const tokenData = {\n          claude: claudeTokens,\n          openai: openCodeTokens.openai,\n          gemini: openCodeTokens.gemini,\n        };"
  newString: "        const tokenData = {\n          claude: claudeTokens,\n          openai: openCodeTokens.openai,\n          gemini: openCodeTokens.gemini,\n          kimi: openCodeTokens.kimi,\n        };"
  ```

  **Edit 2h** — `main()` OMC-wrapped path: sessionCounts.byProvider (lines 890-895): add kimi:
  ```
  oldString: "          byProvider: {\n            anthropic: claudeCount,\n            openai: openCodeTokens.openai.count,\n            gemini: openCodeTokens.gemini.count,\n          }"
  newString: "          byProvider: {\n            anthropic: claudeCount,\n            openai: openCodeTokens.openai.count,\n            gemini: openCodeTokens.gemini.count,\n            kimi: openCodeTokens.kimi.count,\n          }"
  ```

  **Must NOT do**:
  - Do NOT change `updateSavingsFromTokens()` call signatures (fusion-tracker is out of scope)
  - Do NOT edit `fusion-renderer.mjs` (out of scope; kimi data will be passed but not rendered until that file is separately updated)
  - Do NOT change session-start detection, OMC HUD integration, or Claude API logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 8 precise Edit-tool edits in a single file, pattern-based
  - **Skills**: []
    - No skills needed — exact string replacements

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `src/hud/omcm-hud.mjs:437-614` — `aggregateOpenCodeTokens()`: dual-path aggregation (session + legacy). Both paths need kimi branch.
  - `src/hud/omcm-hud.mjs:556-574` — OpenCode providerID normalization via model name string. Insert kimi/moonshot BEFORE the catch-all `else { normalizedProvider = 'openai'; }`.
  - `src/hud/omcm-hud.mjs:737-843` — `buildIndependentHud()`: constructs tokenData and sessionCounts. Both need kimi field.
  - `src/hud/omcm-hud.mjs:848-937` — `main()` OMC-wrapped path: parallel construction of tokenData and sessionCounts.

  **Acceptance Criteria**:
  ```bash
  # 1. Syntax check
  node --check src/hud/omcm-hud.mjs
  # Assert: exit code 0

  # 2. kimi in aggregateOpenCodeTokens result init
  grep -n "kimi:.*input.*output.*count" src/hud/omcm-hud.mjs
  # Assert: >= 1 match (the result init object)

  # 3. kimi provider detection in session path
  grep -n "provider === 'kimi'" src/hud/omcm-hud.mjs
  # Assert: >= 1 match

  # 4. kimi model detection in legacy path
  grep -n "modelLower.includes('kimi')" src/hud/omcm-hud.mjs
  # Assert: >= 1 match

  # 5. kimi in tokenData (both code paths)
  grep -c "kimi: openCodeTokens.kimi" src/hud/omcm-hud.mjs
  # Assert: >= 2 (buildIndependentHud + main)

  # 6. kimi in sessionCounts (both code paths)
  grep -c "kimi: openCodeTokens.kimi.count" src/hud/omcm-hud.mjs
  # Assert: >= 2 (buildIndependentHud + main)

  # 7. Total kimi occurrences
  grep -c "kimi" src/hud/omcm-hud.mjs
  # Assert: >= 14

  # 8. Existing tests still pass
  npm test
  # Assert: 0 failures
  ```

  **Commit**: YES (group 2)
  - Message: `feat(hud): aggregate kimi provider tokens in omcm-hud`
  - Files: `src/hud/omcm-hud.mjs`
  - Pre-commit: `node --check src/hud/omcm-hud.mjs`

---

- [ ] 3. Update required documentation (FEATURES.md, CONFIGURATION.md x ko/en, CHANGELOG.md)

  **What to do — all edits via Edit tool**:

  Per CLAUDE.md rules:
  - `src/tracking/` changes require: `docs/ko/FEATURES.md` + `docs/en/FEATURES.md`
  - `src/hud/` changes require: `docs/ko/CONFIGURATION.md` + `docs/en/CONFIGURATION.md`
  - New feature requires: `docs/CHANGELOG.md` + relevant docs

  **`docs/ko/FEATURES.md`**: Add kimi to:
  - All `['claude', 'openai', 'gemini']` provider arrays in code examples
  - All `{ claude: ..., openai: ..., gemini: ... }` objects in code examples
  - Provider name mentions in prose (e.g., `'claude' | 'openai' | 'gemini'` enums)

  **`docs/en/FEATURES.md`**: Same changes as Korean version.

  **`docs/ko/CONFIGURATION.md`**: Add kimi to:
  - Provider enum references (`opencode, claude, openai, google, kimi`)
  - Provider-limits JSON examples (add kimi stub section)

  **`docs/en/CONFIGURATION.md`**: Same changes as Korean version.

  **`docs/CHANGELOG.md`**: Add entry at top of current version section:
  ```markdown
  ### Added
  - kimi/kimi-for-coding as 4th tracked provider in metrics-collector, realtime-tracker, call-logger, omcm-hud
  - Kimi normalization: `kimi` | `moonshot` -> `kimi`
  - omcm-hud: kimi token aggregation in both session-based and legacy code paths
  ```

  **Must NOT do**:
  - Do NOT rewrite documentation sections — only add kimi alongside existing providers
  - Do NOT update README.md
  - Do NOT update docs outside the required set

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation prose in dual languages (ko + en)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Tasks 1 and 2)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `docs/ko/FEATURES.md` — Korean feature docs, provider arrays at lines 411, 458-460, 498, 691, 708-711, 720-721, 730-731, 737-741, 748-752, 759-763
  - `docs/en/FEATURES.md` — English mirror of above
  - `docs/ko/CONFIGURATION.md` — Korean config docs, provider-limits at lines 43-77, provider enum at line 328
  - `docs/en/CONFIGURATION.md` — English mirror
  - `docs/CHANGELOG.md` — Changelog at top

  **Acceptance Criteria**:
  ```bash
  # All required docs mention kimi
  grep -c "kimi" docs/ko/FEATURES.md       # Assert: >= 5
  grep -c "kimi" docs/en/FEATURES.md       # Assert: >= 5
  grep -c "kimi" docs/ko/CONFIGURATION.md  # Assert: >= 2
  grep -c "kimi" docs/en/CONFIGURATION.md  # Assert: >= 2
  grep -c "kimi" docs/CHANGELOG.md         # Assert: >= 1
  ```

  **Commit**: YES (group 3)
  - Message: `docs: add kimi provider to FEATURES, CONFIGURATION, and CHANGELOG`
  - Files: `docs/ko/FEATURES.md`, `docs/en/FEATURES.md`, `docs/ko/CONFIGURATION.md`, `docs/en/CONFIGURATION.md`, `docs/CHANGELOG.md`
  - Pre-commit: none (markdown)

---

## Commit Strategy

| Order | Message | Files | Verification |
|-------|---------|-------|--------------|
| 1 | `feat(tracking): add kimi/moonshot as 4th tracked provider` | 3 tracking files | `node --check` x 3 |
| 2 | `feat(hud): aggregate kimi provider tokens in omcm-hud` | 1 HUD file | `node --check` x 1 |
| 3 | `docs: add kimi provider to FEATURES, CONFIGURATION, and CHANGELOG` | 5 doc files | grep checks |

---

## Success Criteria

### Verification Commands
```bash
# 1. All 4 source files parse cleanly
node --check src/tracking/metrics-collector.mjs && \
node --check src/tracking/realtime-tracker.mjs && \
node --check src/tracking/call-logger.mjs && \
node --check src/hud/omcm-hud.mjs
# Expected: exit code 0, no output

# 2. All existing tests pass (regression)
npm test
# Expected: 0 failures

# 3. normalizeProvider coverage (both implementations)
grep -n "kimi.*moonshot\|moonshot.*kimi" src/tracking/metrics-collector.mjs src/tracking/realtime-tracker.mjs
# Expected: exactly 2 lines (one per file)

# 4. kimi in call-logger provider counting
grep -n "provider === 'kimi'" src/tracking/call-logger.mjs
# Expected: >= 2 (getSessionCalls + aggregateSessionTokens)

# 5. kimi in omcm-hud (both code paths)
grep -c "kimi" src/hud/omcm-hud.mjs
# Expected: >= 14

# 6. All required docs updated
test $(grep -l "kimi" docs/ko/FEATURES.md docs/en/FEATURES.md docs/ko/CONFIGURATION.md docs/en/CONFIGURATION.md docs/CHANGELOG.md | wc -l) -eq 5
# Expected: exit code 0 (all 5 files contain kimi)
```

### Final Checklist
- [ ] All 4 source files edited via Edit tool only
- [ ] No files outside the 9-file scope were touched
- [ ] No new files created
- [ ] No function signatures changed
- [ ] normalizeProvider recognizes `'kimi'` and `'moonshot'` in both implementations
- [ ] All data structures include kimi fields
- [ ] omcm-hud aggregates kimi in session-based AND legacy code paths
- [ ] omcm-hud passes kimi in tokenData and sessionCounts in BOTH HUD modes
- [ ] `npm test` passes (existing tests, regression only)
- [ ] `node --check` passes on all 4 source files
- [ ] 5 documentation files updated per CLAUDE.md rules
