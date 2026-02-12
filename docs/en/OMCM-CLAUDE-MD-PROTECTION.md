# OMCM CLAUDE.md Protection Guide

## Problem

When OMC (oh-my-claudecode) is updated, the `~/.claude/CLAUDE.md` file may be overwritten.
Important OMCM customizations like the MCP-First protocol could be lost.

## Solution: Protection Marker System

### 1. Marker Structure

The following markers are applied to `~/.claude/CLAUDE.md`:

```markdown
<!-- OMC:START -->
... OMC base content ...
<!-- OMC:END -->

---

<!-- OMCM:MCP-DIRECT:START — DO NOT MODIFY: OMCM v3.0 MCP-First Protocol -->
## MCP-Direct Rules (MANDATORY — OMCM MCP-First v3.0)
... OMCM MCP-First protocol ...
<!-- OMCM:MCP-DIRECT:END -->

---

<!-- OMCM:START — DO NOT MODIFY: User customizations for oh-my-claude-money -->
# oh-my-claude-money - Fusion Orchestrator
... OMCM fusion settings ...
<!-- OMCM:END -->
```

### 2. Marker Meanings

| Marker | Description | Managed By |
|--------|-------------|------------|
| `<!-- OMC:START/END -->` | OMC core content | Managed by OMC updates |
| `<!-- OMCM:MCP-DIRECT:START/END -->` | MCP-First protocol | Managed by OMCM, needs manual protection |
| `<!-- OMCM:START/END -->` | OMCM fusion settings | Managed by OMCM, needs manual protection |

### 3. Protection Process During OMC Updates

#### Method A: Backup and Restore (Recommended)

```bash
# 1. Backup before update
cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.backup

# 2. Run OMC update
# (Execute OMC update command)

# 3. Restore OMCM sections
sed -n '/<!-- OMCM:MCP-DIRECT:START/,/<!-- OMCM:END -->/p' \
  ~/.claude/CLAUDE.md.backup >> ~/.claude/CLAUDE.md
```

#### Method B: Automatic Protection Script

Create `/opt/oh-my-claude-money/scripts/protect-claude-md.sh`:

```bash
#!/bin/bash
# OMCM CLAUDE.md Protection Script

CLAUDE_MD="$HOME/.claude/CLAUDE.md"
BACKUP="$CLAUDE_MD.omcm-backup"

# Backup
cp "$CLAUDE_MD" "$BACKUP"

# Extract OMCM sections
OMCM_CONTENT=$(sed -n '/<!-- OMCM:MCP-DIRECT:START/,/<!-- OMCM:END -->/p' "$BACKUP")

# Function to be called from post-update hook
restore_omcm_sections() {
  # Add OMCM sections if missing
  if ! grep -q "<!-- OMCM:MCP-DIRECT:START" "$CLAUDE_MD"; then
    echo "" >> "$CLAUDE_MD"
    echo "---" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "$OMCM_CONTENT" >> "$CLAUDE_MD"
  fi
}

restore_omcm_sections
```

### 4. Manual Verification Checklist

After OMC update, verify the following:

- [ ] `~/.claude/CLAUDE.md` contains `<!-- OMCM:MCP-DIRECT:START -->` marker
- [ ] MCP-Direct Rules section contains ask_codex/ask_gemini tables
- [ ] Fusion Orchestrator section exists after `<!-- OMCM:START -->` marker
- [ ] `<!-- OMCM:END -->` marker exists at the end

### 5. Restoration Commands (If Sections Lost)

```bash
# Regenerate OMCM sections
cat >> ~/.claude/CLAUDE.md << 'EOF'

---

<!-- OMCM:MCP-DIRECT:START — DO NOT MODIFY: OMCM v3.0 MCP-First Protocol -->
## MCP-Direct Rules (MANDATORY — OMCM MCP-First v3.0)

**CRITICAL**: Do not spawn the following agents as Task(subagent_type). Call the corresponding MCP tools directly.
OMCM hook automatically blocks Task calls for these agents.

| MCP Tool | Agent Roles (agent_role) |
|----------|--------------------------|
| `ask_codex` | architect, debugger, verifier, code-reviewer, style-reviewer, quality-reviewer, api-reviewer, performance-reviewer, security-reviewer, test-engineer, planner, critic, analyst |
| `ask_gemini` | designer, writer, vision, ux-researcher |

**Agents to spawn as Task(subagent_type)** (require tool access):
`executor`, `deep-executor`, `explore`, `build-fixer`, `qa-tester`, `git-master`, `scientist`, `dependency-expert`, `product-manager`

**Pattern**: "Think with O/G, Execute with Claude"
1. Analysis/Planning → `ask_codex` (architect/planner role)
2. Review/Verification → `ask_codex` (code-reviewer/verifier role)
3. Design/Documentation → `ask_gemini` (designer/writer role)
4. Code Modification → Task(executor) — Claude agent

Fallback to equivalent Claude agent if MCP unavailable/fails.
Full MCP routing table: see `~/.claude/docs/omc-ref.md`.
<!-- OMCM:MCP-DIRECT:END -->

---

<!-- OMCM:START — DO NOT MODIFY: User customizations for oh-my-claude-money -->
# oh-my-claude-money - Fusion Orchestrator

## Fusion Agent Mapping

| OMC Agent | OpenCode Agent | Model |
|-----------|---------------|-------|
| architect, debugger | Oracle | GPT |
| designer, vision | Frontend Engineer | Gemini |
| analyst, scientist, code-reviewer, security-reviewer | Oracle | GPT |
| writer, style-reviewer | General | Gemini Flash |

## Fusion Activation

- `hulw: <task>` - Hybrid ultrawork (auto fusion)
- `fusion: <task>` - Explicit fusion mode

## Auto-switch Conditions

- 5hr usage 90%+, weekly usage 90%+, or "opencode"/"handoff" keyword detected

<!-- OMCM:END -->
EOF
```

## Long-term Solution: Submit Patch to OMC

Consider proposing OMCM marker preservation logic for OMC update scripts:

```bash
# Example logic to add to OMC install.sh
if grep -q "<!-- OMCM:START" "$HOME/.claude/CLAUDE.md"; then
  # Backup OMCM sections
  sed -n '/<!-- OMCM:MCP-DIRECT:START/,/<!-- OMCM:END -->/p' \
    "$HOME/.claude/CLAUDE.md" > /tmp/omcm-backup.md

  # OMC update
  # ...

  # Restore OMCM sections
  cat /tmp/omcm-backup.md >> "$HOME/.claude/CLAUDE.md"
fi
```

## Reference

- OMCM Version: v3.0 (MCP-First)
- Marker Added: 2026-01-27
- Related Issue: Phase 2 - Conductor Protocol Enhancement
