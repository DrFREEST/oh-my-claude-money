# Draft: INSTALLATION.md Documentation

## Requirements (confirmed)
- **Target file**: `/opt/oh-my-claude-money/docs/INSTALLATION.md`
- **Version**: v1.0.0
- **Prerequisites**: Node.js 18+, Claude Code CLI, oh-my-claudecode (OMC), OpenCode CLI, oh-my-opencode (OMO)

## Technical Decisions
- **Language**: English only (README already bilingual, installation docs keep simple)
- **Structure**: User specified 5 sections with step-by-step subsections
- **Commands**: Copy-pasteable with verification steps

## Research Findings
- **install.sh**: Comprehensive one-click script with auto-detection of OS/package manager
- **README.md**: Contains detailed Korean setup instructions lines 324-468
- **fusion-setup.md**: Contains dependency check flow and troubleshooting
- **uninstall.sh**: Shows cleanup targets for uninstallation section

## Section Structure (User Specified)
1. Prerequisites
2. Quick Install
3. Step-by-Step Installation
   - Step 1: Claude Code
   - Step 2: OMC
   - Step 3: OpenCode
   - Step 4: OMO
   - Step 5: OMCM
4. Verification
5. Uninstallation

## Content Sources
- Prerequisites: README lines 64-68, 815-818
- Quick Install: README lines 49-57, install.sh
- Step-by-Step: README lines 328-468
- Verification: Commands from install.sh print_summary()
- Uninstallation: uninstall.sh script reference

## Open Questions
- None - user provided clear structure

## Scope Boundaries
- INCLUDE: Installation, verification, uninstallation
- EXCLUDE: Usage documentation (already in README), Configuration details (separate doc)
