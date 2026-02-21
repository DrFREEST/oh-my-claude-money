# Fusion Mode Guide - OMCM v2.1.5

> **Version Baseline (OMC 4.2.15):** This document uses `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, and `gemini-3-pro` as defaults. Legacy aliases such as `researcher`, `tdd-guide`, and `*-low`/`*-medium` appear only for backward compatibility.

**Complete Guide to Intelligent Token Optimization: Claude Code ↔ OpenCode**

---

## Table of Contents

1. [What is Fusion Mode?](#what-is-fusion-mode)
2. [Fusion Commands](#fusion-commands)
3. [Agent Mapping](#agent-mapping)
4. [Usage Scenarios](#usage-scenarios)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## What is Fusion Mode?

### Overview

Fusion Mode integrates Claude Code's 32 OMC (oh-my-claudecode) agents with OpenCode's OMO (oh-my-opencode) agents to **save 62% of Claude tokens** while maintaining the highest work quality.

### Token Savings Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              User Request (Idea / Task)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌──────────────────────────────┐
         │  Fusion Router (Conductor)   │
         │  "Which LLM is optimal?"     │
         └──────────────────────────────┘
              ↓                    ↓
    ┌─────────────────┐  ┌────────────────────┐
    │ Claude Opus     │  │ OpenCode Agents    │
    │ (HIGH TIER)     │  │ (LOW/MEDIUM TIER)  │
    │                 │  │                    │
    │ • planner       │  │ • build (Codex)    │
    │ • critic        │  │ • explore (Flash)  │
    │ • architect     │  │ • general (GPT)    │
    └─────────────────┘  └────────────────────┘
         ✓ High Quality    ✓ Token Savings!
```

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Quality First** | Critical tasks (strategy/coordination) use Claude Opus |
| **Cost Optimization** | Analysis/exploration delegated to GPT/Gemini (62% savings) |
| **Automatic Routing** | Intelligent distribution based on task type and usage |
| **Seamless Context** | Automatic state transfer during provider switching |

### Token Savings Breakdown

**18 agents (62%) offloaded to OpenCode:**

| Tier | Original Model | Fusion Mode Model | Savings |
|------|----------------|-------------------|---------|
| **HIGH** | Claude Opus | Claude Opus | - |
| **MEDIUM** | Claude Sonnet | GPT-5.3-Codex | ✅ |
| **LOW** | Claude Haiku | Gemini 3 Flash | ✅ |

**Example Project**:
- Regular usage (Claude only): 100k tokens
- Fusion mode: 38k tokens (62% savings)

---

## Fusion Commands

### 1. `hulw` - Hybrid Ultrawork (Always Fusion)

**Features**: Always enables OpenCode fusion for maximum Claude token savings.

```bash
# Any of these are recognized:
/hulw refactor this project
refactor this project hulw
process quickly with hulw
hulw: implement login feature
```

**When to Use?**
- When Claude tokens are limited
- When you want maximum speed (parallel processing)
- When token savings are the top priority

**Workflow:**

```
hulw command detected
     ↓
Task analysis (Task call)
     ↓
OMCM automatically routes to OMO
     ↓
Execute in parallel via OpenCode ULW mode
     ↓
Integrate results & respond
```

**Example:**

```
User: hulw: create REST API project
      - Route design
      - Controller implementation
      - Test writing

OMCM Automatic Routing:
├─ Route design → explore (Gemini 3 Flash) ✅
├─ Controller implementation → executor (GPT-5.3-Codex) ✅
└─ Test writing → executor (GPT-5.3-Codex) ✅

Result: 62% token savings + parallel processing
```

### 2. `ulw` - Auto-Fusion Ultrawork (Usage-Based)

**Features**: Automatically decides fusion mode based on usage.

```bash
/ulw fix bugs
fix bugs ulw
proceed with ulw
work in ultrawork mode
```

**Behavior by Usage:**

| Usage | Mode | Action |
|-------|------|--------|
| **< 70%** | Regular ULW | Use Claude agents (best quality) |
| **70-90%** | Hybrid | Offload some tasks to OpenCode |
| **> 90%** | OpenCode-focused | Delegate most to OpenCode |

**When to Use?**
- General development tasks (default recommendation)
- When you want efficient usage management
- When you want automatic optimal mode selection

**Example:**

```
When usage is 65%:
/ulw code review
→ Regular ULW mode (use Claude) ✓ Best quality

When usage is 80%:
/ulw code review
→ Auto-switch to hybrid ✓ Partial OpenCode usage

When usage is 95%:
/ulw code review
→ OpenCode-focused mode ✓ Maximum token savings
```

### 3. `autopilot` - Hybrid Autopilot (Autonomous Execution + Fusion)

**Features**: Automatically handles everything from idea to completion with fusion support.

```bash
/autopilot create REST API
implement dashboard with autopilot
build me a todo app
autopilot create
I want a login system
```

**Autopilot Workflow:**

```
1. Requirements Analysis (analyst) → Claude Opus (HIGH tier)
2. Planning (planner) → Claude Opus (HIGH tier)
3. Code Exploration (explore) → OpenCode explore (Gemini 3 Flash)
4. Implementation (executor) → OpenCode build (GPT-5.3-Codex)
5. Verification (architect) → Claude Opus (HIGH tier)
6. Completion Report
```

**Explicit Hybrid Request:**

```bash
autopilot hulw create dashboard
proceed with hybrid autopilot
use fusion autopilot mode
```

**When to Use?**
- When full project implementation is needed
- When you want automatic handling from idea → execution
- When both token savings + speed are important

### 4. Configuration Commands

#### Enable Fusion by Default

```bash
/omcm:fusion-default-on
```

**Effect**: Apply fusion routing by default to all tasks

| Command | Regular | `ulw` | `hulw` | `autopilot` |
|---------|---------|-------|--------|-------------|
| Default OFF | Claude | Usage-based | Fusion | Usage-based |
| **Default ON** | **Fusion** | **Fusion** | **Fusion** | **Fusion** |

#### Disable Fusion by Default

```bash
/omcm:fusion-default-off
```

**Effect**: Restore usage-based automatic switching (default)

---

## Agent Mapping

### Complete Routing Table (29 Agents)

Automatic agent routing handled by OMCM. **HIGH tier agents always stay on Claude Opus** for quality:

#### HIGH Tier (Claude Opus -- Retained, 11 agents)

| OMC Agent | Fusion Mode Routing | Model | Savings |
|-----------|---------------------|-------|---------|
| **planner** | Claude | Opus | - |
| **critic** | Claude | Opus | - |
| **architect** | Claude | Opus | - |
| **analyst** | Claude | Opus | - |
| **executor-high** | Claude | Opus | - |
| **explore-high** | Claude | Opus | - |
| **designer-high** | Claude | Opus | - |
| **qa-tester-high** | Claude | Opus | - |
| **security-reviewer** | Claude | Opus | - |
| **code-reviewer** | Claude | Opus | - |
| **scientist-high** | Claude | Opus | - |

#### MEDIUM Tier (OpenCode CODEX model, 10 agents)

| OMC Agent | OpenCode Agent | Model | Savings |
|-----------|----------------|-------|---------|
| **architect-medium** | build | GPT-5.3-Codex | ✅ |
| **executor** | build | GPT-5.3-Codex | ✅ |
| **explore-medium** | explore | GPT-5.3-Codex | ✅ |
| **designer** | build | GPT-5.3-Codex | ✅ |
| **researcher** | general | GPT-5.3-Codex | ✅ |
| **vision** | general | GPT-5.3-Codex | ✅ |
| **qa-tester** | build | GPT-5.3-Codex | ✅ |
| **build-fixer** | build | GPT-5.3-Codex | ✅ |
| **tdd-guide** | build | GPT-5.3-Codex | ✅ |
| **scientist** | build | GPT-5.3-Codex | ✅ |

#### LOW Tier (OpenCode FLASH model, 8 agents)

| OMC Agent | OpenCode Agent | Model | Savings |
|-----------|----------------|-------|---------|
| **architect-low** | build | Gemini 3 Flash | ✅ |
| **executor-low** | build | Gemini 3 Flash | ✅ |
| **explore** | explore | Gemini 3 Flash | ✅ |
| **designer-low** | build | Gemini 3 Flash | ✅ |
| **researcher-low** | general | Gemini 3 Flash | ✅ |
| **writer** | general | Gemini 3 Flash | ✅ |
| **security-reviewer-low** | build | Gemini 3 Flash | ✅ |
| **build-fixer-low** | build | Gemini 3 Flash | ✅ |
| **tdd-guide-low** | build | Gemini 3 Flash | ✅ |
| **code-reviewer-low** | build | Gemini 3 Flash | ✅ |
| **scientist-low** | build | Gemini 3 Flash | ✅ |

### Routing Rules

**Automatic routing rules in fusion mode:**

```javascript
// 1. HIGH TIER (Opus) - Always retained on Claude (11 agents)
if (tier === 'HIGH') {
  return 'Claude Opus'; // Strategy/coordination/quality: always Claude
}

// 2. MEDIUM TIER (Sonnet → Codex) - Fusion applied (10 agents)
if (tier === 'MEDIUM') {
  return 'OpenCode build/explore/general (GPT-5.3-Codex)'; // Token savings!
}

// 3. LOW TIER (Haiku → Flash) - Fusion applied (8+ agents)
if (tier === 'LOW') {
  return 'OpenCode build/explore/general (Gemini 3 Flash)'; // Maximum savings
}
```

### Model Selection

Model selection criteria in fusion mode:

| Task Type | Selected Model | Reason |
|-----------|----------------|--------|
| Complex analysis | GPT-5.3 | Strong reasoning capabilities |
| Code implementation | GPT-5.3-Codex | Coding-specialized model |
| UI/Frontend | Gemini Pro | Enhanced visual work |
| Quick exploration | Gemini 3 Flash | Fast response, low cost |
| Data analysis | GPT-5.3 | Statistical analysis capabilities |
| Security review | GPT-5.3 | Security expertise |

---

## Usage Scenarios

### Scenario 1: Normal Development

**Situation**: General development work, sufficient Claude tokens

```bash
# Basic ULW (usage-based auto-switching)
/ulw fix bugs
/ulw write test code
/ulw code review
```

**Routing Result** (65% usage):
- All tasks → Use Claude (regular ULW mode)
- Token Savings: 0% (quality first)

### Scenario 2: High Usage

**Situation**: 5-hour usage at 85%, token savings needed

```bash
# ULW automatically switches to hybrid mode
/ulw refactor entire project
```

**Routing Result** (85% usage):
- Code exploration → OpenCode explore (Gemini 3 Flash) ✅
- Architecture analysis → Claude Opus (HIGH tier, retained) ✓
- UI work → OpenCode build (GPT-5.3-Codex) ✅
- Complex implementation → Claude Opus ✓ (quality needed)
- Token Savings: ~45%

### Scenario 3: Critical Token Limit

**Situation**: 5-hour usage at 95%, immediate token savings needed

```bash
# Explicit hulw for maximum savings
/hulw implement new feature
```

**Routing Result** (95% usage):
- All analysis/exploration → OpenCode
- All implementation → OpenCode Codex or Gemini
- Claude only for critical coordination
- Token Savings: ~62%

### Scenario 4: Full Project Development

**Situation**: Full new project implementation needed

```bash
# Hybrid autopilot
autopilot hulw create complete REST API server
```

**Workflow:**

```
1. Requirements Analysis
   → Task(analyst) → Claude Opus (HIGH tier)

2. Planning
   → Task(planner) → Claude Opus (HIGH tier)

3. Directory Structure Design
   → Task(explore) → OpenCode explore (Gemini 3 Flash)

4. Controller Implementation
   → Task(executor) → OpenCode build (GPT-5.3-Codex)

5. Middleware Implementation
   → Task(executor) → OpenCode build (GPT-5.3-Codex)

6. Test Writing
   → Task(qa-tester) → OpenCode build (GPT-5.3-Codex)

7. Final Verification
   → Task(architect) → Claude Opus (HIGH tier)

8. Completion Report
```

**Result:**
- Parallel Processing: 5 tasks running simultaneously
- Token Savings: ~58%
- Speed: ~60% faster than sequential processing

### Scenario 5: Search & Research Tasks

**Situation**: Codebase analysis, research needed

```bash
# Exploration-focused work (OpenCode optimal)
/ulw analyze this project's authentication system structure
```

**Routing Result:**
- Task(explore-high) → Claude Opus (HIGH tier, retained) ✓
- Task(researcher) → OpenCode general (GPT-5.3-Codex) ✅
- Task(architect) → Claude Opus (HIGH tier, retained) ✓
- Token Savings: ~40% (architect/explore-high stay on Claude)

---

## Best Practices

### 1. Mode Selection

**Selection Criteria:**

```
┌─────────────────────────────────────────────────┐
│              Mode Selection Chart               │
├─────────────────────────────────────────────────┤
│ Usage < 70%?                                    │
│ └─ YES → ulw (auto-switching)                   │
│ └─ NO → hulw (max savings) or autopilot         │
│                                                 │
│ Speed is top priority?                          │
│ └─ YES → hulw + parallel Task calls             │
│ └─ NO → ulw (usage-based)                       │
│                                                 │
│ Full project implementation?                    │
│ └─ YES → autopilot hulw                         │
│ └─ NO → ulw or hulw                             │
└─────────────────────────────────────────────────┘
```

### 2. Context Handoff

Automatically handled during provider switching, but also available manually:

```bash
# Save context + switch to OpenCode
~/.claude/plugins/local/oh-my-claude-money/scripts/handoff-to-opencode.sh

# Save context only
~/.claude/plugins/local/oh-my-claude-money/scripts/export-context.sh
```

**Generated Context** (`.omcm/handoff/context.md`):

```markdown
# Task Handoff Context

> Switched from Claude Code to OpenCode

## Session Information
| Item | Value |
|------|-------|
| Project Path | `/opt/my-project` |
| Time | 2026-01-23T21:00:00+09:00 |
| Usage | 5hr: 87%, Weekly: 45% |

## Current Task
Implementing login functionality

## Pending TODOs
- [ ] Add password validation logic
- [ ] Implement session management

## Recently Modified Files
[git diff --stat output]
```

### 3. CLI Direct Execution

Fusion mode uses direct CLI execution for optimal performance:

**Performance Comparison:**

| Mode | Execution Time | Memory Usage |
|------|----------------|--------------|
| **CLI Direct Execution** | **~2-5s** | **~50MB per call** |

**CLI Execution Details:**

```bash
# Codex CLI (OpenAI)
codex exec -m gpt-5.3-codex --json --full-auto

# Gemini CLI (Google)
gemini -p=. --yolo

# Auto-detection and fallback built-in
```

**Configuration Options** (`~/.claude/plugins/omcm/config.json`):

```json
{
  "routing": {
    "maxOpencodeWorkers": 4,        // Max parallel CLI calls
    "timeout": 300000               // CLI timeout (ms)
  }
}
```

**Resource Usage:**
- Per CLI call: ~50MB during execution
- Stateless: No persistent processes running

### 4. Parallel Task Execution

To maximize performance in fusion mode, **independent tasks must be called in parallel**:

**Correct Example:**

```javascript
// Call multiple Tasks in one message (parallel processing!)
Task(
  subagent_type="oh-my-claudecode:explore",
  prompt="Analyze module A"
)

Task(
  subagent_type="oh-my-claudecode:explore",
  prompt="Analyze module B"
)

Task(
  subagent_type="oh-my-claudecode:researcher",
  prompt="Research library"
)
```

**Incorrect Example:**

```javascript
// ❌ Sequential calls (slow!)
Task(...) // Wait for completion
Task(...) // Wait for completion
```

### 5. Configuration Best Practices

**Default Configuration** (`~/.claude/plugins/omcm/config.json`):

```json
{
  "fusionDefault": false,           // Usage-based (recommended)
  "threshold": 90,                  // Alert at 90%+
  "autoHandoff": false,             // Manual switching

  "routing": {
    "enabled": true,
    "usageThreshold": 70,           // Hybrid at 70%+
    "maxOpencodeWorkers": 3,        // Start with 3, increase if needed
    "autoDelegate": true
  },

  "context": {
    "includeRecentFiles": true,
    "recentFilesLimit": 10,
    "includeTodos": true,
    "maxContextLength": 50000
  },

  "notifications": {
    "showOnThreshold": true,        // Alert at 90%
    "showOnKeyword": true,          // Detect "opencode" keyword
    "quietMode": false
  }
}
```

### 6. Provider Authentication

OpenCode provider authentication is required for fusion mode to work properly:

```bash
# OpenAI authentication
opencode auth login openai

# Google (Gemini) authentication
opencode auth login google

# Anthropic authentication (optional)
opencode auth login anthropic

# Check authentication status
opencode auth status
```

**Or environment variables:**

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

---

## Troubleshooting

### Issue 1: Fusion Routing is Slow

**Symptom**: Fusion routing takes longer than expected

**Cause**: CLI not installed or network latency

**Solution:**

```bash
# 1. Check CLI availability
which codex
which gemini

# 2. Test CLI execution
codex --version
gemini --version

# 3. Check authentication
codex auth status
# or
opencode auth status

# 4. Increase timeout if needed (config.json)
{
  "routing": {
    "timeout": 600000  // 10 minutes
  }
}
```

**Prevention:**
- Ensure both Codex and Gemini CLIs are installed
- Adjust `maxOpencodeWorkers` for parallel call limits

### Issue 2: Provider Authentication Failed

**Symptom**: "OpenAI authentication failed" or "Google authentication failed"

**Cause**: Provider API key not set or expired

**Solution:**

```bash
# 1. Check authentication status
opencode auth status

# 2. Re-authenticate unauthenticated providers
opencode auth login openai      # Re-authenticate OpenAI
opencode auth login google      # Re-authenticate Google

# 3. Verify API key validity
# OpenAI: https://platform.openai.com/account/api-keys
# Google: https://aistudio.google.com/apikey

# 4. Set via environment variable (legacy method)
export OPENAI_API_KEY="new_key"
opencode auth status  # Verify
```

### Issue 3: CLI Execution Failure

**Symptom**: "CLI execution failed" or timeout errors

**Cause**: CLI not available or authentication issues

**Solution:**

```bash
# 1. Install missing CLI
npm install -g @openai/codex-cli
npm install -g @google/gemini-cli

# 2. Authenticate
codex auth login
# or
opencode auth login openai
opencode auth login google

# 3. Test execution
codex exec "test prompt" --json
gemini -p=. "test prompt"

# 4. Check error logs
tail -f ~/.omcm/logs/cli-executor.log
```

### Issue 4: Handoff Context Not Passed

**Symptom**: Switched to OpenCode but previous work context is missing

**Cause**: Context file creation failed or path error

**Solution:**

```bash
# 1. Manually create context
~/.claude/plugins/local/oh-my-claude-money/scripts/export-context.sh

# 2. Check context file
cat ~/.omcm/handoff/context.md

# 3. Check context path
echo $OMCM_CONTEXT_PATH

# 4. Manual switch
~/.claude/plugins/local/oh-my-claude-money/scripts/handoff-to-opencode.sh
```

### Issue 5: HUD Not Showing Fusion Metrics

**Symptom**: Status bar not showing fusion metrics

**Cause**: HUD renderer not loaded

**Solution:**

```bash
# 1. Check HUD file
cat ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs

# 2. Check settings.json
cat ~/.claude/settings.json | grep statusLine

# 3. Clear HUD cache
rm -rf ~/.claude/.omc/hud-cache
rm -rf ~/.omcm/hud-cache

# 4. Restart Claude Code
exit    # Exit Claude
claude  # Restart
```

### Issue 6: Task Routing to Wrong Provider

**Symptom**: Low-priority tasks routing to Claude

**Cause**: Routing rule conflict or `fusionDefault` setting error

**Solution:**

```bash
# 1. Check fusionDefault
cat ~/.claude/plugins/omcm/config.json | grep fusionDefault

# 2. Always enable fusion (for testing)
/omcm:fusion-default-on

# 3. Check routing rules
cat ~/.local/share/omcm/src/router/rules.mjs

# 4. Check usage
# Check "C:" (Claude usage) in HUD
# Auto-offload if usage > 90%

# 5. Check logs
tail -f ~/.omcm/logs/fusion-router.log
```

### Issue 7: High Memory Usage

**Symptom**: Memory usage increases with parallel CLI calls

**Cause**: Too many parallel executions

**Solution:**

```bash
# 1. Reduce parallel limit
# ~/.claude/plugins/omcm/config.json:
{
  "routing": {
    "maxOpencodeWorkers": 2  // Limit concurrent CLI calls
  }
}

# 2. CLI execution is stateless
# Memory is freed after each call completes

# 3. Monitor memory
watch -n 1 'ps aux | grep -E "codex|gemini"'

# 4. No persistent processes
# CLI calls are stateless and don't leave processes running
```

### Issue 8: Autopilot Cancellation Not Working

**Symptom**: Autopilot continues running even after "stop" command

**Cause**: Task tool running in background

**Solution:**

```bash
# 1. Use explicit stop command
/omcm:cancel-autopilot

# 2. Force kill all active Tasks
ps aux | grep "claude\|opencode" | grep -v grep | awk '{print $2}' | xargs kill -9

# 3. Restart Claude
exit
claude
```

### Quick Diagnostics Script

```bash
#!/bin/bash
# ~/diagnose-fusion.sh

echo "=== OMCM Fusion Mode Diagnostics ==="
echo ""

echo "1. Claude Code CLI"
claude --version && echo "✅" || echo "❌"

echo "2. OpenCode CLI"
opencode --version && echo "✅" || echo "❌"

echo "3. OMC Setup"
grep -q "oh-my-claudecode" ~/.claude/CLAUDE.md && echo "✅" || echo "❌"

echo "4. Fusion Setup"
[ -f ~/.claude/plugins/omcm/config.json ] && echo "✅" || echo "❌"

echo "5. HUD Setup"
grep -q "statusLine" ~/.claude/settings.json && echo "✅" || echo "❌"

echo "6. OpenCode Authentication"
opencode auth status | grep -q "authenticated" && echo "✅" || echo "❌"

echo "7. CLI Availability"
which codex && which gemini && echo "✅ Both CLIs installed" || echo "⚠️ Missing CLIs"

echo "8. Context Directory"
[ -d ~/.omcm ] && echo "✅" || echo "❌"

echo ""
echo "Check items with issues."
```

---

## Advanced Topics

### Custom Agent Routing

You can customize default routing:

**File**: `~/.claude/plugins/omcm/config.json`

```json
{
  "routing": {
    "preferOpencode": [
      "explore",
      "explore-medium",
      "researcher",
      "writer"
    ],
    "preferClaude": [
      "architect",
      "executor-high",
      "planner",
      "critic"
    ]
  }
}
```

### CLI Execution Tuning

**High-performance setup** (many parallel tasks):

```json
{
  "routing": {
    "maxOpencodeWorkers": 10,
    "timeout": 600000
  }
}
```

**Low-resource setup** (memory limited):

```json
{
  "routing": {
    "maxOpencodeWorkers": 2,
    "timeout": 300000
  }
}
```

### Token Usage Analytics

Track fusion mode usage:

```bash
# Real-time usage (HUD)
# "C: 1.2k↓ 567↑|O: 25.8k↓ 9↑|G: 165.3k↓ 1.4k↑"
#  ↑ Claude    ↑ OpenAI    ↑ Gemini

# Detailed logs
tail -f ~/.omcm/routing-log.jsonl
```

---

## Support & Resources

| Resource | URL |
|----------|-----|
| **GitHub Issues** | https://github.com/DrFREEST/oh-my-claude-money/issues |
| **Discussions** | https://github.com/DrFREEST/oh-my-claude-money/discussions |
| **OpenCode Docs** | https://opencode.ai/docs |
| **OMC Docs** | https://github.com/Yeachan-Heo/oh-my-claudecode |

---

**Last Updated**: 2026-02-15
**Version**: 1.0.0
**License**: MIT
