# Draft: Korean Docs Update (Code Correction)

## Requirements (confirmed)
- Update 8 docs/ko/*.md files to match source code truth
- Scope: mappings, ports, hooks, phase features ONLY
- No version bump (v1.0.0 stays)
- No docs/en/ updates
- No optional chaining (?.) in code examples
- Preserve existing Korean doc style

## Source Code Truth (gathered)
- FUSION_MAP: 32 agents (11 HIGH + 10 MEDIUM + 11 LOW)
  - v0.7.0 additions: qa-tester-low, researcher-high, build-fixer-high
  - Docs say 29 agents — need to update to 32
- basePort: 4096 (confirmed in both server-pool files)
  - Some docs reference 8000 — incorrect
- Hooks: 4 files in src/hooks/ (detect-handoff, fusion-router-logic, persistent-mode, session-start)
- State files: 11 types in state-manager.mjs
- Config schema: 3 schemas in schema.mjs
- Routing levels: L1-L4 progressive routing (NEW, undocumented)
- Delegation pattern detection (NEW, undocumented)

## Scope Boundaries
- INCLUDE: Fix agent count 29→32, fix port 8000→4096, update hook references, add v1.0.0 phase features
- EXCLUDE: docs/en/, README.md, CHANGELOG.md, any code changes, routing levels, delegation patterns

## Open Questions
- None — scope is strictly bounded by user instruction
