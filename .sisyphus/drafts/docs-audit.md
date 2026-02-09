# Draft: OMCM English Docs Audit Plan

## Requirements (confirmed)
- Cross-validate docs/en/*.md + README.md + docs/README.md against codebase
- ko/en sync comparison
- Problem taxonomy: OUTDATED, MISSING, PHANTOM, WRONG, SYNC_DIFF, OK
- Include link/path validity checks
- Include version consistency (package.json, plugin.json, marketplace.json)
- Include "Phase 1-5 신규 기능" mandatory verification items
- Output: doc-by-doc tables + final ko/en sync table
- NO code changes — audit plan only

## Codebase Inventory (gathered)
- src/: 49 .mjs files across context/, tracking/, router/, orchestrator/, executor/, hooks/, hud/, utils/, pool/, config/
- hooks/: 5 files (hooks.json, bash-optimizer.mjs, read-optimizer.mjs, tool-tracker.mjs, fusion-router.mjs)
- skills/: 8 dirs (ralph, ecomode, cancel, autopilot, ulw, hulw, hybrid-ultrawork, opencode)
- scripts/: 11 files
- commands/: 8 .md files
- agents/: 1 file (opencode-delegator.json)
- tests/: 16 test files
- Manifests: package.json (v1.0.0), plugin.json (v1.0.0), marketplace.json (v1.0.0)

## Target Docs
1. README.md (root, bilingual)
2. docs/README.md (index)
3. docs/en/INSTALLATION.md
4. docs/en/ARCHITECTURE.md
5. docs/en/FEATURES.md
6. docs/en/API-REFERENCE.md
7. docs/en/CONFIGURATION.md
8. docs/en/FUSION-GUIDE.md
9. docs/en/SKILLS-REFERENCE.md
10. docs/en/TROUBLESHOOTING.md

## Open Questions
- None — requirements fully specified by user
