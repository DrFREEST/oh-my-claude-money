# Draft: Slim CLAUDE.md

## Requirements (confirmed)
- Slim CLAUDE.md from 115 lines to ≤57 lines (50%)
- Preserve `<claude-mem-context>` block (lines 1-11) byte-identical
- Remove version examples (lines 35-40) and "판단 기준 흐름" (lines 30-33)
- Reduce SemVer to table-only
- Condense sync commands to single rsync line
- Remove docs tree structure (lines 94-107)
- Keep fusion settings section
- No optional chaining in code
- Do not remove release checklists
- Full file replacement approach

## Technical Decisions
- Single atomic file write (not incremental edits)
- Condense doc sync table from 8 rows to 6 simplified rows
- Condense release checklist by merging sub-sections
- Remove blank line between closing </claude-mem-context> and first heading to save 1 line
- Combine git config items into single line

## Scope Boundaries
- INCLUDE: All current sections (condensed)
- EXCLUDE: Version examples, 판단 기준 흐름, docs tree, alternative sync commands, detailed explanations

## Metis Findings
- Blank lines count toward 57 budget
- Need safety valve: one droppable line if at 58
- Verify markdown rendering after condensing
- Ensure LF line endings preserved
