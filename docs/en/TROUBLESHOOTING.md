# Troubleshooting

> **Version Baseline (OMC 4.2.15):** This document uses `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, and `gemini-3-pro` as defaults. Legacy aliases such as `researcher`, `tdd-guide`, and `*-low`/`*-medium` appear only for backward compatibility.

Comprehensive guide providing all common issues and solutions for **oh-my-claude-money (OMCM)**.

---

## Table of Contents

1. [Installation Issues](#1-installation-issues)
2. [MCP CLI Connection Issues](#2-mcp-cli-connection-issues)
3. [Fusion Routing Issues](#3-fusion-routing-issues)
4. [HUD Display Issues](#4-hud-display-issues)
5. [CLI Execution Issues](#5-cli-execution-issues)
6. [Configuration & Hooks Issues](#6-configuration--hooks-issues)
7. [Performance Optimization](#7-performance-optimization)
8. [Diagnostic Tools](#8-diagnostic-tools)
9. [FAQ](#9-faq)
10. [Error Messages Reference](#10-error-messages-reference)

---

## 1. Installation Issues

### 1.1 Claude Code Not Found

**Symptoms**: `claude: command not found` or `Claude Code not found`

**Solution Steps**:

```bash
# Step 1: Refresh PATH
hash -r

# Step 2: Verify installation
claude --version

# If not installed, reinstall
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code

# Step 3: Open a new terminal (important!)
# Try again in new terminal
claude --version
```

**Alternative Installation Method**:
```bash
# Use official install script
curl -fsSL https://claude.ai/install.sh | bash
```

---

### 1.2 Codex/Gemini CLI Not Found

**Symptoms**: `codex: command not found` or `gemini: command not found`

**Solution Steps**:

```bash
# Step 1: Refresh PATH
hash -r

# Step 2: Verify installation
codex --version
gemini --version

# If not installed, reinstall
npm install -g @openai/codex
npm install -g @google/gemini-cli

# Step 3: Open new terminal and verify
codex --version
gemini --version
```

**Authenticate via environment variables**:
```bash
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="AIza..."
```

---

### 1.3 oh-my-claudecode Plugin Not Recognized

**Symptoms**: Claude Code cannot find `/oh-my-claudecode:` commands

**Cause**: Plugin not installed or not activated

**Solution**:

```bash
# Step 1: Create plugin directory
mkdir -p ~/.claude/plugins/local

# Step 2: Clone plugin
git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git \
  ~/.claude/plugins/local/oh-my-claudecode

# Step 3: Launch Claude Code and setup
claude

# In Claude Code prompt:
/oh-my-claudecode:omc-setup
```

**Verify Plugin Activation**:
```bash
# Check settings.json
cat ~/.claude/settings.json | grep -A5 "plugins"

# Check plugin cache
ls -la ~/.claude/plugins/cache/omc/
```

---

### 1.4 oh-my-claude-money Plugin Not Recognized

**Symptoms**: Cannot find `/omcm:` commands

**Solution Steps**:

```bash
# Step 1: Check installation path
ls -la ~/.claude/plugins/local/oh-my-claude-money
# or
ls -la ~/.claude/plugins/marketplaces/omcm/

# If not installed:
git clone https://github.com/DrFREEST/oh-my-claude-money.git \
  ~/.claude/plugins/local/oh-my-claude-money

# Step 2: Check configuration file
cat ~/.claude/settings.json | jq '.enabledPlugins'

# Step 3: Restart Claude Code
# Exit current session
# Open new terminal:
claude
```

---

### 1.5 Installation Script Failed

**Symptoms**: `install.sh` exits with error

**Debugging**:

```bash
# Run script in verbose mode
bash -x /opt/oh-my-claude-money/install.sh

# Or execute each step manually
cd /opt/oh-my-claude-money
chmod +x install.sh
./install.sh

# Check installation log
cat ~/.omcm/install.log  # if exists
```

**Common Causes**:
- Permission denied: `sudo` required
- Disk full: Check with `df -h`
- Network issue: Retry
- npm install failed: Run `npm install -g npm` first

---

## 2. MCP CLI Connection Issues

### 2.1 MCP CLI Provider Authentication Failed

**Symptoms**: `Authentication failed` or `Invalid credentials`

**Solution Steps**:

```bash
# Step 1: Check authentication status
codex auth status
gemini auth status

# Step 2: Re-authenticate providers
codex auth login    # OpenAI
gemini auth login   # Google

# Step 3: Set environment variables (alternative)
export OPENAI_API_KEY="sk-proj-..."
export GOOGLE_API_KEY="AIza..."
```

**Auth Status Interpretation**:
```
✅ OpenAI (gpt-5.3, gpt-5.3-codex)      # OK
❌ Google (not configured)               # Not configured
⚠️ Anthropic (expired)                   # Expired
```

---

### 2.2 API Key Error

**Symptoms**: `Invalid API key` or `API key not found`

**Check Environment Variables**:

```bash
# Check currently set keys
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
echo $GOOGLE_API_KEY

# Set keys if empty
export OPENAI_API_KEY="sk-proj-..."
export GOOGLE_API_KEY="AIza..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Persistent Setup** (~/.bashrc or ~/.zshrc):

```bash
# Edit file
nano ~/.bashrc

# Add these lines
export OPENAI_API_KEY="sk-proj-..."
export GOOGLE_API_KEY="AIza..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Apply
source ~/.bashrc
```

---

### 2.3 Model Not Available

**Symptoms**: `Model gpt-5.3 not available for your API key` or similar

**Cause**: API key lacks access to the model

**Solution**:

1. **OpenAI**: Check permissions at [API Keys page](https://platform.openai.com/api-keys)
2. **Google**: Verify model activation at [AI Studio](https://aistudio.google.com/apikey)
3. **Anthropic**: Check subscription at [Console](https://console.anthropic.com/settings/keys)

**Alternative Model Configuration**:

```bash
# Change model in config.json
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "preferMcp": ["explore", "designer"],
    "models": {
      "openai": "gpt-4o",          # Use instead of gpt-5.3
      "google": "gemini-2.0-flash"  # Use instead of gemini-pro
    }
  }
}
EOF
```

---

### 2.4 CLI Authentication Failed

**Symptoms**: `Authentication failed` during CLI execution

**Solution Steps**:

```bash
# Step 1: Check CLI installation
which codex
which gemini

# Step 2: Re-authenticate
codex auth login
# or
codex auth login
gemini auth login

# Step 3: Verify authentication
codex auth status
gemini auth status

# Step 4: Test CLI execution
codex exec "test prompt" --json --full-auto
gemini -p=. "test prompt"
```

---

## 3. Fusion Routing Issues

### 3.1 hulw Not Routing to MCP CLI

**Symptoms**: Using `hulw` keyword but only Claude is used

**Diagnosis**:

```bash
# Step 1: Check configuration
cat ~/.claude/plugins/omcm/config.json | jq '.routing.enabled'

# Step 2: Check fusion default
cat ~/.claude/plugins/omcm/config.json | jq '.fusionDefault'

# Step 3: Check hooks
cat ~/.claude/settings.json | jq '.hooks.PreToolUse'
```

**Solution**:

```bash
# Method 1: Edit config file
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "enabled": true,
    "autoDelegate": true
  }
}
EOF

# Method 2: Reconfigure in Claude Code
claude
/omcm:fusion-setup

# Method 3: Enable fusion default
/omcm:fusion-default-on
```

---

### 3.2 Auto-Handoff Not Working

**Symptoms**: Usage is 90%+ but auto-handoff not working

**Cause**:
- `autoHandoff` is set to `false`
- HUD cache not updating
- Cannot read usage information

**Check**:

```bash
# Check current usage
cat ~/.cache/omc/hud-cache.json | jq '.usage'

# Check autoHandoff setting
cat ~/.claude/plugins/omcm/config.json | jq '.autoHandoff'

# Check threshold
cat ~/.claude/plugins/omcm/config.json | jq '.threshold'
```

**Enable**:

```bash
# In Claude Code
claude
/omcm:fusion-setup

# Or manual configuration
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "autoHandoff": true,
  "threshold": 90,
  "fusionDefault": false
}
EOF
```

---

### 3.3 MCP CLI Timeout

**Symptoms**: `MCP CLI request timeout after 300000ms`

**Cause**: Task too large or slow network

**Solution**:

```bash
# Step 1: Increase timeout
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "mcp": {
    "timeout": 600000  # Increase to 10 minutes (default 5 minutes)
  }
}
EOF

# Step 2: Check network
ping -c 3 8.8.8.8

# Step 3: Reduce task size (if needed)
# Try distributing into multiple smaller tasks
```

---

## 4. HUD Display Issues

### 4.1 HUD Not Showing

**Symptoms**: Token information not showing in Claude Code status line

**Check**:

```bash
# Check HUD file exists (automatically configured during plugin installation)
ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

# If plugin is installed, HUD is automatically configured.
# If manual setup is needed, run /omcm:fusion-setup
```

**Check settings.json**:

```bash
# Check statusLine setting
cat ~/.claude/settings.json | jq '.statusLine'

# Add if missing
cat >> ~/.claude/settings.json << 'EOF'
{
  "statusLine": {
    "enabled": true,
    "command": "node ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs"
  }
}
EOF
```

---

### 4.2 Token Usage Not Updating

**Symptoms**: HUD token information stuck or shows "Loading..."

**Cause**:
- OMC HUD cache not updating
- OMCM HUD cannot read cache

**Solution**:

```bash
# Step 1: Check cache
cat ~/.cache/omc/hud-cache.json

# Step 2: Clear cache
rm -f ~/.cache/omc/hud-cache.json
# Auto-generated after Claude Code restart

# Step 3: Check OMC plugin build
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ | sort -V | tail -1)
ls -la ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION/dist/hud/

# Manual build if not built
cd ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION
npm install --silent
npm run build --silent
```

---

### 4.3 HUD Display Format Error

**Symptoms**: HUD shows `[object Object]` or garbled characters

**Solution**:

```bash
# Step 1: Reinstall plugin to restore HUD file
claude
/omcm:fusion-setup

# Step 2: Verify HUD file
ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

# Step 3: Restart Claude Code
# Exit current session
# New terminal: claude
```

---

## 5. CLI Execution Issues

### 5.1 CLI Installation Check

**Check if CLIs are installed:**

```bash
# Check Codex CLI
which codex
codex --version

# Check Gemini CLI
which gemini
gemini --version

# Install if missing
npm install -g @openai/codex-cli
npm install -g @google/gemini-cli
```

### 5.2 CLI Not Found

**Symptoms**: `codex: command not found` or `gemini: command not found`

**Check Installation**:

```bash
# Check if CLIs are installed
which codex
which gemini

# Check versions
codex --version
gemini --version
```

**Install Missing CLI**:

```bash
# Install Codex CLI
npm install -g @openai/codex-cli

# Install Gemini CLI
npm install -g @google/gemini-cli

# Or install both at once
npm install -g @openai/codex @google/gemini-cli
```

**PATH Issues**:

```bash
# Refresh PATH
hash -r

# Add to PATH if needed
export PATH="$PATH:$HOME/.npm/bin"

# Or use full path in config
{
  "opencode": {
    "command": "/full/path/to/codex"
  }
}
```

---

### 5.3 CLI Execution Timeout

**Symptoms**: `CLI execution timeout after 300000ms`

**Increase Timeout**:

```bash
# Edit config file
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "timeout": 600000  # Increase to 10 minutes
  }
}
EOF
```

**Check CLI Logs**:

```bash
# Check execution logs
tail -f ~/.omcm/logs/cli-executor.log

# Test CLI directly
codex exec "test prompt" --json --full-auto
gemini -p=. "test prompt"
```

---

### 5.4 High Memory Usage with Parallel Calls

**Symptoms**: Memory usage spikes during parallel CLI executions

**Check**:

```bash
# Monitor active CLI processes
ps aux | grep -E "codex|gemini" | grep -v grep

# Check memory usage
top -o MEM
```

**Optimization**:

```bash
# Reduce parallel limit
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "maxMcpWorkers": 2  # Limit concurrent CLI calls
  }
}
EOF

# Note: CLI execution is stateless
# Memory is freed after each call completes
```

---

## 6. Configuration & Hooks Issues

### 6.1 Config File Not Found

**Check Path**:

```bash
# Config file location
~/.claude/plugins/omcm/config.json

# Create if doesn't exist
mkdir -p ~/.claude/plugins/omcm
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "fusionDefault": false,
  "threshold": 90,
  "routing": {
    "enabled": true
  }
}
EOF
```

---

### 6.2 Config Changes Not Applied

**Cause**: Config cache or Claude Code restart needed

**Solution**:

```bash
# Step 1: Edit config file
nano ~/.claude/plugins/omcm/config.json

# Step 2: Exit Claude Code session
# Step 3: Restart in new terminal
claude
```

**Clear Cache** (if needed):

```bash
rm -rf ~/.claude/plugins/cache/
rm -rf ~/.cache/omc/
# Then restart Claude Code
```

---

### 6.3 Hooks Not Running

**Cause**: Hook file missing or path error

**Check**:

```bash
# Check hook files exist
ls -la ~/.claude/plugins/omcm/hooks/
ls -la ~/.claude/plugins/omcm/src/hooks/

# Check hook configuration
cat ~/.claude/settings.json | jq '.hooks'
```

**Manual Hook Setup**:

```bash
# Check and copy hooks.json
cp /opt/oh-my-claude-money/hooks/hooks.json \
   ~/.claude/plugins/omcm/hooks/

# Set file permissions
chmod +x ~/.claude/plugins/omcm/hooks/*.mjs
chmod +x ~/.claude/plugins/omcm/src/hooks/*.mjs
```

---

## 7. Performance Optimization

### 7.1 Improve Response Speed

**Problem**: CLI execution is slow

**Optimization**:

```bash
# Step 1: Ensure CLIs are installed
codex --version
gemini --version

# Step 2: Adjust max parallel calls
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "maxMcpWorkers": 5  # Increase parallel CLI calls
  }
}
EOF

# Step 3: Check network latency
# CLI calls require API access
ping -c 3 api.openai.com
ping -c 3 generativelanguage.googleapis.com

# Step 4: Use appropriate timeout
# Default 300000ms (5 minutes) is recommended
```

---

### 7.2 Large Parallel Operations Setup

**Scenario**: Processing many files simultaneously

```bash
# Configuration
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "maxMcpWorkers": 10,           # Max 10 concurrent operations
    "usageThreshold": 60           # Start distributing early
  },
  "context": {
    "maxContextLength": 100000     # Increase context
  },
  "mcp": {
    "timeout": 600000             # 10 minute timeout
  }
}
EOF

# CLI-based execution (no server pool needed)
```

---

## 8. Diagnostic Tools

### 8.1 Config Validation

```bash
# Check JSON syntax
cat ~/.claude/plugins/omcm/config.json | jq '.'

# Check specific value
cat ~/.claude/plugins/omcm/config.json | jq '.routing.enabled'
cat ~/.claude/plugins/omcm/config.json | jq '.threshold'
```

### 8.2 Check Logs

```bash
# CLI execution logs
cat ~/.omcm/logs/cli-executor.log

# Routing logs
cat ~/.omcm/routing-log.jsonl | tail -20

# Fusion state
cat ~/.omcm/fusion-state.json

# Provider limits
cat ~/.omcm/provider-limits.json
```

### 8.3 Check Dependencies

```bash
# Node.js version
node --version  # v18+ required

# Claude Code
claude --version

# oh-my-claudecode
claude
/oh-my-claudecode:version

# MCP CLI (Codex/Gemini)
codex --version
gemini --version

# MCP CLI auth status
codex auth status
gemini auth status
```

---

## 9. FAQ

### Q1: What is MCP CLI (ask_codex/ask_gemini)?

**A**: MCP (Model Context Protocol) tools that directly invoke Codex CLI (OpenAI) and Gemini CLI (Google) from within Claude Code.

OMCM uses MCP tools to:
- Process **search, exploration, and analysis tasks** with **ask_codex/ask_gemini (GPT/Gemini)**
- Handle **complex reasoning and implementation** with **Claude Code**
- Result: **62% Claude token savings**

---

### Q2: Does It Really Save Claude Tokens?

**A**: Yes, based on real data.

**Savings Structure**:
- **18 agents** (62%) offloaded to GPT/Gemini
- Simple tasks use low-cost models
- Critical reasoning uses Claude Opus

**Example**:
```
100 hours of work
├─ 62 hours: MCP CLI (GPT/Gemini) → Low cost
└─ 38 hours: Claude Opus → High quality

Result: 62% reduction in Claude usage!
```

---

### Q3: When to Use Fusion Mode (hulw)?

**A**: Effective in these situations:

**Recommended for hulw**:
- Large refactoring (multiple files)
- Extensive code exploration
- Parallel processing needed
- Token savings priority

**Claude Priority**:
- Complex architecture decisions
- Security/auth related work
- Precise single-file edits
- Highest quality required

---

### Q4: How Are Agents Routed?

**A**: In OMC 4.2.15 baseline, routing depends on fusion mode and usage. Common defaults:

**Claude-first (execution/decision critical)**:
- `planner`, `critic`, `product-manager`
- `executor`, `deep-executor`, `verifier`
- `qa-tester`, `test-engineer`, `build-fixer`, `git-master`

**MCP CLI-preferred (analysis/review/documentation heavy)**:
- `architect`, `debugger`, `explore`
- `code-reviewer`, `security-reviewer`, `api-reviewer`, `performance-reviewer`
- `dependency-expert`, `designer`, `writer`, `document-specialist`, `vision`
- `analyst`, `ux-researcher`, `information-architect`, `product-analyst`

Custom configuration: `~/.omcm/agent-mapping.json`

---

### Q5: Multiple Provider Auth Required?

**A**: Each provider needs to be authenticated only once:

```bash
codex auth login    # OpenAI - One-time only
gemini auth login   # Google - One-time only

# Reusable after
codex auth status   # Check status
gemini auth status  # Check status
```

**Re-auth Required When**:
- API key changed
- Token expired
- Auth error

---

### Q6: Fusion vs Ultrawork Difference?

**A**:
| Feature | ulw (Ultrawork) | fusion |
|---------|-----------------|--------|
| **Purpose** | Parallelization within Claude | OMC + MCP CLI hybrid |
| **When** | Fast processing needed | Token savings needed |
| **Models** | Claude only | Claude + GPT/Gemini |
| **Cost** | High | Low |
| **Activation** | `/ulw` or `ulw` | `/hulw` or `hulw` |

---

### Q7: Auto-Handoff Not Working at 90%?

**A**: Check autoHandoff config:

```bash
# Check
cat ~/.claude/plugins/omcm/config.json | jq '.autoHandoff'

# Enable
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "autoHandoff": true,
  "threshold": 90,
  "fusionDefault": false
}
EOF

# Restart Claude Code
claude
```

---

### Q8: How to Check Usage?

**A**: Multiple methods available:

```bash
# Method 1: HUD (Claude Code status line)
# Format: "C:45.2k↓ 2.3k↑|O:180k↓ 3.2k↑|G:0↓ 0↑"

# Method 2: Check file
cat ~/.cache/omc/hud-cache.json | jq '.usage'

# Method 3: In Claude Code
claude
# Check usage message: "Current usage: 45%"

# Method 4: Provider details
cat ~/.omcm/provider-limits.json | jq '.providers'
```

---

### Q9: When CLI Execution Not Responding?

**A**: Step-by-step check:

```bash
# Step 1: Check CLI installation
which codex
which gemini

# Step 2: Check logs
tail -50 ~/.omcm/logs/cli-executor.log

# Step 3: Test CLI directly
codex exec "test" --json --full-auto
gemini -p=. "test"

# Step 4: Check internet connection
ping -c 3 8.8.8.8

# Step 5: Check provider authentication
codex auth status
# or
opencode auth status
```

---

### Q10: How to Completely Uninstall OMCM?

**A**:

```bash
# Remove plugin
rm -rf ~/.claude/plugins/local/oh-my-claude-money
rm -rf ~/.claude/plugins/marketplaces/omcm

# Remove config
rm -rf ~/.claude/plugins/omcm
rm -rf ~/.omcm

# Remove HUD (automatically removed with plugin uninstall)

# Remove OMCM entries from settings.json
# Manual edit ~/.claude/settings.json
```

---

## 10. Error Messages Reference

### Installation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `OpenCode not found` | OpenCode CLI not installed | `npm i -g opencode-ai@latest` |
| `claude: command not found` | Claude Code not installed | `npm i -g @anthropic-ai/claude-code` |
| `Plugin not found: omcm` | OMCM plugin not installed | `git clone` or re-run install script |

### Authentication Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Authentication failed` | Provider not authenticated | `opencode auth login` |
| `Invalid API key` | API key error | Check with `opencode auth status` then re-auth |
| `Model not available` | No model permission | Check API key model access |

### Routing Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Routing failed` | Routing config error | Check `config.json` syntax |
| `Task timeout` | Task time exceeded | Increase `opencode.timeout` |
| `Context too long` | Context exceeded | Decrease `maxContextLength` |

### CLI Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `CLI not found` | CLI not installed | Install via npm or OpenCode |
| `Execution timeout` | Task too complex or network slow | Increase timeout in config |
| `Authentication failed` | Invalid API key | Re-authenticate with `codex auth login` |

### HUD Errors

| Error | Cause | Solution |
|-------|-------|----------|
| HUD not showing | HUD file missing | Run `/omcm:fusion-setup` |
| `[object Object]` | HUD format error | Reinstall plugin |
| Token not updating | Cache error | Clear cache and restart |

---

## Need More Help?

If issues persist:

1. **GitHub Issues**: [DrFREEST/oh-my-claude-money/issues](https://github.com/DrFREEST/oh-my-claude-money/issues)
2. **Collect logs**: Collect and attach log files mentioned above to issue
3. **Environment info**: Include output of these commands:
   ```bash
   node --version
   claude --version
   opencode --version
   cat ~/.claude/plugins/omcm/config.json
   ```

---

## OMC 4.2.15 Compatibility Drift Check

If behavior changes after OMC updates, run:

```bash
# Strict compatibility check
node scripts/check-omc-compat.mjs --source /tmp/omc_429_clone --strict

# Auto-sync missing wrappers (agents/skills/commands)
node scripts/sync-omc-compat.mjs --source /tmp/omc_429_clone
```

CI shortcut:

```bash
npm run check:compat
```

**Last Updated**: 2026-02-15 | **OMCM v2.1.5**
