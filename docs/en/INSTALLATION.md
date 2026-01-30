# OMCM v1.0.0 Installation Guide

> **oh-my-claude-money** - Claude Code ↔ OpenCode Fusion Orchestrator

<div align="center">

**Save 62% Claude Tokens | Multi-Provider Auto Routing | Real-time Tracking**

</div>

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Install - 30 Seconds](#quick-install---30-seconds)
- [Step-by-Step Installation](#step-by-step-installation)
- [Installation Verification](#installation-verification)
- [Troubleshooting](#troubleshooting)
- [Uninstall](#uninstall)

---

## Prerequisites

Before installing OMCM, please ensure the following requirements are met.

### 1. Node.js 18+ Required

```bash
node --version
# v18.0.0 or higher required
```

If Node.js is not installed, download it from the [official website](https://nodejs.org).

### 2. Claude Code CLI

Claude Code CLI must be installed.

```bash
claude --version
```

If not installed, use one of the following methods:

```bash
npm install -g @anthropic-ai/claude-code
```

Or use the official install script:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### 3. oh-my-claudecode (OMC) Plugin

OMCM runs on top of oh-my-claudecode.

```bash
# Run this command in Claude Code
claude
/oh-my-claudecode:omc-setup
```

Or install directly from GitHub:

```bash
git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git \
  ~/.claude/plugins/local/oh-my-claudecode
```

### 4. OpenCode CLI

OpenCode must be installed.

```bash
opencode --version
```

If not installed, use one of the following methods:

```bash
# Install via npm (recommended)
npm install -g opencode-ai@latest

# Or use official install script
curl -fsSL https://opencode.ai/install | bash
```

**macOS (Homebrew):**

```bash
brew install opencode
```

### 5. Provider API Keys

OMCM supports the following providers.

**Required (choose one or more):**
- **OpenAI** (for GPT-5.2) or
- **Google** (for Gemini) or
- Both (recommended)

Get API keys from each provider:

| Provider | API Key Page | Variable Name |
|----------|--------------|---------------|
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` |
| **Google** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `GOOGLE_API_KEY` |
| **Anthropic** | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | `ANTHROPIC_API_KEY` |

---

## Quick Install - 30 Seconds

### Method 1: One-Click Install Script (Recommended)

```bash
# Auto-confirm mode (yes to all prompts)
curl -fsSL https://raw.githubusercontent.com/DrFREEST/oh-my-claude-money/main/install.sh | bash -s -- --yes

# Or manual confirm mode (confirm each step)
curl -fsSL https://raw.githubusercontent.com/DrFREEST/oh-my-claude-money/main/install.sh | bash
```

### Method 2: Install from Local Repository

```bash
git clone https://github.com/DrFREEST/oh-my-claude-money.git
cd oh-my-claude-money
./install.sh
```

### What the Install Script Does

- ✅ Install/verify Claude Code CLI
- ✅ Install/verify oh-my-claudecode plugin
- ✅ Install/verify OpenCode CLI
- ✅ Configure oh-my-opencode
- ✅ Install oh-my-claude-money plugin
- ✅ Set up Claude Code Hooks
- ✅ Copy HUD files
- ✅ Initialize global state files

---

## Step-by-Step Installation

Follow these steps to manually install without the install script.

### Step 1: Verify Claude Code CLI

```bash
claude --version
# If not installed:
npm install -g @anthropic-ai/claude-code
```

Open a new terminal to ensure PATH is updated.

```bash
hash -r
claude --version
```

### Step 2: Set Up oh-my-claudecode Plugin

Launch Claude Code in a new terminal:

```bash
claude
```

In the Claude Code prompt, run:

```
/oh-my-claudecode:omc-setup
```

This process will:
- Add OMC instructions to `~/.claude/CLAUDE.md`
- Set up OMC HUD
- Build the plugin (automatic)

Wait for completion before continuing.

### Step 3: Install OpenCode CLI

In a new terminal:

```bash
# Install via npm
npm install -g opencode-ai@latest

# Or use official script
curl -fsSL https://opencode.ai/install | bash

# Verify installation
opencode --version
```

Open a new terminal to verify PATH is updated.

```bash
hash -r
opencode --version
```

### Step 4: Authenticate OpenCode Providers

OpenCode requires provider authentication to use GPT/Gemini.

#### Method A: Interactive Login (Recommended)

```bash
opencode auth login
```

Follow the prompts to:
1. Select a provider (OpenAI, Google, Anthropic)
2. Log in or enter API key for that provider

**For multiple providers, run separately:**

```bash
opencode auth login  # Select OpenAI from menu
opencode auth login  # Select Google from menu
```

#### Method B: Environment Variables

Set API keys as environment variables:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

**Persist permanently (optional):**

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.bashrc
echo 'export GOOGLE_API_KEY="..."' >> ~/.bashrc
source ~/.bashrc
```

#### Check Authentication Status

```bash
opencode auth status
```

Example output:

```
✅ OpenAI (gpt-5.2, gpt-5.2-codex)
✅ Google (gemini-3.0-pro, gemini-3.0-flash)
❌ Anthropic (not configured)
```

### Step 5: Install oh-my-claude-money Plugin

#### Method A: Direct Install from GitHub (Recommended)

```bash
# Create plugin directory
mkdir -p ~/.claude/plugins/local

# Clone oh-my-claude-money
git clone https://github.com/DrFREEST/oh-my-claude-money.git \
  ~/.claude/plugins/local/oh-my-claude-money

# Or if already in marketplace:
# ~/.claude/plugins/marketplaces/omcm/
```

#### Method B: Install to Home Directory

```bash
# Download repository
mkdir -p ~/.local/share
git clone https://github.com/DrFREEST/oh-my-claude-money.git \
  ~/.local/share/oh-my-claude-money

# Create symbolic link
ln -sf ~/.local/share/oh-my-claude-money \
  ~/.claude/plugins/local/oh-my-claude-money
```

### Step 6: Register Plugin with Claude Code

#### 6-1. Configure settings.json

```bash
Edit ~/.claude/settings.json:

{
  "enabledPlugins": {
    "oh-my-claude-money@local": true
  }
}
```

#### 6-2. Register in installed_plugins.json

```bash
Edit ~/.claude/plugins/installed_plugins.json:

{
  "version": 2,
  "plugins": {
    "oh-my-claude-money@local": [
      {
        "scope": "user",
        "installPath": "/path/to/oh-my-claude-money",
        "version": "1.0.0",
        "installedAt": "2026-01-28T00:00:00Z",
        "lastUpdated": "2026-01-28T00:00:00Z"
      }
    ]
  }
}
```

#### 6-3. Set Up Hooks

```bash
Add hooks to ~/.claude/settings.json:

{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/plugins/local/oh-my-claude-money/hooks/fusion-router.mjs",
            "timeout": 120,
            "statusMessage": "Checking fusion routing..."
          }
        ]
      }
    ]
  }
}
```

### Step 7: OMCM Fusion Setup

In Claude Code:

```bash
claude
```

In the Claude Code prompt:

```
/omcm:fusion-setup
```

This command will automatically:

- ✅ Verify all dependencies
- ✅ Create OMC HUD wrapper
- ✅ Configure OMCM HUD
- ✅ Initialize HUD cache
- ✅ Create fusion config files
- ✅ Add fusion instructions to CLAUDE.md
- ✅ Start OpenCode server pool (optional)

### Step 8: Initialize Global State Files (Manual Install)

Create the following files in `~/.omcm/` directory:

#### fusion-state.json

```bash
mkdir -p ~/.omcm

cat > ~/.omcm/fusion-state.json << 'EOF'
{
  "enabled": true,
  "mode": "balanced",
  "totalTasks": 0,
  "routedToOpenCode": 0,
  "routingRate": 0,
  "estimatedSavedTokens": 0,
  "byProvider": {
    "gemini": 0,
    "openai": 0,
    "anthropic": 0
  },
  "lastUpdated": null
}
EOF
```

#### provider-limits.json

```bash
cat > ~/.omcm/provider-limits.json << 'EOF'
{
  "claude": {
    "fiveHour": { "used": 0, "limit": 100, "percent": 0 },
    "weekly": { "used": 0, "limit": 100, "percent": 0 },
    "lastUpdated": null
  },
  "openai": {
    "requests": { "remaining": null, "limit": null, "reset": null, "percent": 0 },
    "tokens": { "remaining": null, "limit": null, "reset": null, "percent": 0 },
    "lastUpdated": null
  },
  "gemini": {
    "tier": "free",
    "rpm": { "used": 0, "limit": 15 },
    "tpm": { "used": 0, "limit": 32000 },
    "rpd": { "used": 0, "limit": 1000 },
    "lastUpdated": null
  },
  "lastUpdated": null
}
EOF
```

---

## Installation Verification

### 1. Check All Component Versions

```bash
# Claude Code
claude --version

# oh-my-claudecode (inside Claude Code)
claude
/oh-my-claudecode:version

# OpenCode
opencode --version

# OpenCode providers
opencode auth status
```

### 2. Check File Structure

```bash
# Plugin install path
ls -la ~/.claude/plugins/local/oh-my-claude-money/

# Or marketplace path
ls -la ~/.claude/plugins/marketplaces/omcm/

# Config files
ls -la ~/.claude/plugins/omcm/config.json
ls -la ~/.omcm/fusion-state.json

# HUD files
ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs
```

### 3. Test Fusion Feature

In Claude Code:

```bash
claude
```

Test with the following command:

```
/omcm:fusion-setup
```

Once setup is complete, use it like this:

```
hulw: perform a simple test task
```

**Expected Output:**
- Fusion routing is activated
- OpenCode agents perform some tasks
- Token saving metrics are displayed

### 4. Check HUD Token Tracking

The Claude Code status line shows token usage by provider:

```
C:1.2k↓ 567↑|O:25.8k↓ 9↑|G:165.3k↓ 1.4k↑
```

| Symbol | Meaning |
|--------|---------|
| `C:` | Claude (Cyan) |
| `O:` | OpenAI (Green) |
| `G:` | Gemini (Yellow) |
| `↓` | Input tokens |
| `↑` | Output tokens |

---

## Troubleshooting

### Installation Issues

#### "Claude Code not found"

```bash
# Refresh PATH
hash -r

# Reinstall Claude Code
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code

# Verify in new terminal
claude --version
```

#### "oh-my-claudecode plugin not found"

```bash
# Manually install plugin
git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git \
  ~/.claude/plugins/local/oh-my-claudecode

# Run setup in Claude Code
claude
/oh-my-claudecode:omc-setup
```

#### "OpenCode not found"

```bash
# Refresh PATH
hash -r

# Reinstall OpenCode
npm uninstall -g opencode-ai
npm install -g opencode-ai@latest

# Verify in new terminal
opencode --version
```

### Authentication Issues

#### "OpenCode provider authentication failed"

```bash
# Check authentication status
opencode auth status

# Re-authenticate provider
opencode auth login

# Authenticate specific provider only
opencode auth login openai
opencode auth login google
```

#### "API key error"

Check environment variables:

```bash
echo $OPENAI_API_KEY
echo $GOOGLE_API_KEY
echo $ANTHROPIC_API_KEY
```

If API keys are empty, set them:

```bash
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

### HUD/Plugin Issues

#### "HUD not displayed"

```bash
# Check HUD file (automatically configured during plugin installation)
ls -la ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

# HUD is a plugin file, no need to modify directly

# Check settings.json
grep "statusLine" ~/.claude/settings.json

# Check OMC plugin build
ls ~/.claude/plugins/cache/omc/oh-my-claudecode/*/dist/hud/index.js
```

If HUD file is missing, reconfigure plugin:

```bash
# Re-run fusion setup in Claude Code
claude
/omcm:fusion-setup

# HUD is automatically configured during plugin installation
```

#### "OMC plugin not built"

```bash
# Find latest plugin version
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ | sort -V | tail -1)

# Navigate to plugin directory
cd ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION

# Run build
npm install --silent
npm run build --silent

# Verify
ls dist/hud/index.js
```

### Fusion Feature Issues

#### "Fusion routing not working"

```bash
# Check fusion config
cat ~/.claude/plugins/omcm/config.json

# Check hooks config
grep -A 5 "PreToolUse" ~/.claude/settings.json

# Manually reconfigure
claude
/omcm:fusion-setup
```

#### "OpenCode server connection failed"

```bash
# Check server port
lsof -i :4096

# Check server status
ps aux | grep opencode

# Manually start server
opencode serve --port 4096

# Or start OMCM server pool
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh start
```

### Performance Optimization

#### OpenCode Server Pool Setup

```bash
# Start server pool
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh start

# Check status
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh status

# View logs
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh logs

# Stop server
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh stop
```

#### Adjust Max Workers

Edit `~/.claude/plugins/omcm/config.json`:

```json
{
  "routing": {
    "maxOpencodeWorkers": 4
  }
}
```

Value range: 1~25 (considering memory, ~250MB/server)

---

## Uninstall

### Complete Removal

```bash
# Remove plugin
rm -rf ~/.claude/plugins/local/oh-my-claude-money
rm -rf ~/.claude/plugins/marketplaces/omcm

# Remove config
rm -rf ~/.claude/plugins/omcm
rm -rf ~/.omcm

# HUD is automatically removed when plugin is deleted
# No additional action needed

# Clean settings.json (optional)
# Remove OMCM-related settings from ~/.claude/settings.json
```

### Partial Removal (Keep Settings)

```bash
# Remove plugin only (keep settings/data)
rm -rf ~/.claude/plugins/local/oh-my-claude-money
```

### Uninstall Script

Use the uninstall script included in the repository (optional):

```bash
/opt/oh-my-claude-money/uninstall.sh
# Or
~/.claude/plugins/local/oh-my-claude-money/uninstall.sh
```

---

## Next Steps

After installation:

### 1. Learn Basic Usage

```bash
claude

# Run the following command:
/omcm:hulw perform a simple test task
```

### 2. Configure Fusion Mode

```
# Always enable fusion mode
/omcm:fusion-default-on

# Or usage-based auto-switch (default)
/omcm:fusion-default-off
```

### 3. Read Additional Documentation

- [README.md](../../README.md) - Overall overview and features
- [CONFIGURATION.md](./CONFIGURATION.md) - Detailed configuration options
- [FEATURES.md](./FEATURES.md) - Feature guide and usage examples
- [SKILLS-REFERENCE.md](./SKILLS-REFERENCE.md) - Skills reference

---

## Support

If you encounter issues:

1. **Check Documentation**: Refer to the troubleshooting section above
2. **GitHub Issues**: [DrFREEST/oh-my-claude-money/issues](https://github.com/DrFREEST/oh-my-claude-money/issues)
3. **Discussion Forum**: [GitHub Discussions](https://github.com/DrFREEST/oh-my-claude-money/discussions)

---

## License

MIT License - see [LICENSE](../LICENSE) file for details

---

## Version

- **OMCM**: v1.0.0
- **Minimum Node.js**: 18+
- **Minimum Claude Code**: latest
- **Minimum OpenCode**: latest

---

**Installation complete! You can now use fusion mode with the `hulw` keyword.**

```bash
claude
hulw: test fusion mode now!
```
