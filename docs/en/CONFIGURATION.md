# OMCM v2.1.5 Configuration Guide

> **Version Baseline (OMC 4.2.15):** This document uses `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, and `gemini-3-pro` as defaults. Legacy aliases such as `researcher`, `tdd-guide`, and `*-low`/`*-medium` appear only for backward compatibility.

Complete configuration guide for OMCM (oh-my-claude-money). This document details configuration files, schemas, environment variables, and the hook system.

## Table of Contents

1. [Configuration Files](#configuration-files)
2. [Configuration Schema](#configuration-schema)
3. [Agent Mapping](#agent-mapping)
4. [Routing Rules](#routing-rules)
5. [Hook Configuration](#hook-configuration)
6. [Environment Variables](#environment-variables)
7. [Configuration Examples](#configuration-examples)
8. [Troubleshooting](#troubleshooting)

---

## Configuration Files

### 1. Main Configuration: `~/.claude/plugins/omcm/config.json`

The core configuration file for OMCM. Accessible by Claude Code and applied globally.

**Path**: `~/.claude/plugins/omcm/config.json`

**Loading Mechanism**:
```javascript
// Merge default config with user configuration (deep merge)
// 1. Load DEFAULT_CONFIG
// 2. Merge with user config if exists
// 3. Use defaults if not found
```

### 2. Provider Limits: `~/.omcm/provider-limits.json`

Tracks usage limits and current usage for each provider.

**Path**: `~/.omcm/provider-limits.json`

**Structure**:
```json
{
  "providers": {
    "claude": {
      "limits": {
        "5hours": 100000,
        "24hours": 500000,
        "weekly": 3000000
      },
      "usage": {
        "5hours": 45000,
        "24hours": 120000,
        "weekly": 500000
      },
      "lastUpdated": "2026-01-28T10:30:00Z"
    },
    "openai": {
      "limits": { ... },
      "usage": { ... }
    },
    "gemini": {
      "limits": { ... },
      "usage": { ... }
    }
  }
}
```

### 3. Fusion State: `~/.omcm/fusion-state.json`

Stores current fusion mode state and handoff information.

**Path**: `~/.omcm/fusion-state.json`

**Structure**:
```json
{
  "mode": "default",
  "fusionActive": false,
  "lastHandoff": {
    "from": "claude",
    "to": "opencode",
    "timestamp": "2026-01-28T10:30:00Z",
    "reason": "usage-threshold"
  },
  "handoffChain": [
    {
      "from": "claude",
      "to": "opencode",
      "timestamp": "2026-01-28T10:30:00Z"
    }
  ]
}
```

---

## Configuration Schema

### Main Configuration Schema

Complete structure of `~/.claude/plugins/omcm/config.json`.

```json
{
  "fusionDefault": boolean,
  "threshold": number (0-100),
  "autoHandoff": boolean,
  "keywords": string[],
  "routing": {
    "enabled": boolean,
    "usageThreshold": number,
    "maxOpencodeWorkers": number,
    "preferOpencode": string[],
    "preferClaude": string[],
    "autoDelegate": boolean
  },
  "context": {
    "includeRecentFiles": boolean,
    "recentFilesLimit": number,
    "includeTodos": boolean,
    "includeDecisions": boolean,
    "maxContextLength": number
  },
  "opencode": {
    "command": string,
    "args": string[],
    "ultraworkByDefault": boolean,
    "timeout": number
  },
  "notifications": {
    "showOnThreshold": boolean,
    "showOnKeyword": boolean,
    "quietMode": boolean
  }
}
```

### Option Details

#### Fusion Mode Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fusionDefault` | boolean | false | Whether to always use fusion mode. true: always fusion, false: automatic switching based on usage |
| `threshold` | number | 90 | Claude usage switch notification threshold (%) |
| `autoHandoff` | boolean | false | Whether to automatically switch when threshold is reached (true: automatic, false: notification only) |

**Example**:
```json
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false
}
```

#### Keyword Settings

Keywords to detect in Claude Code prompts.

| Option | Type | Default |
|--------|------|---------|
| `keywords` | string[] | ["opencode", "handoff", "전환", "switch to opencode", "opencode로", "오픈코드"] |

**Behavior**: When keywords are detected in user prompts, switch notifications or automatic switching occurs.

**Example**:
```json
{
  "keywords": [
    "opencode",
    "handoff",
    "switch",
    "switch to opencode",
    "use opencode",
    "gemini",
    "gpt"
  ]
}
```

#### Routing Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routing.enabled` | boolean | true | Enable hybrid routing |
| `routing.usageThreshold` | number | 70 | Above this usage, increase OpenCode distribution (%) |
| `routing.maxOpencodeWorkers` | number | 3 | Maximum parallel CLI calls (1~10 recommended) |
| `routing.preferOpencode` | string[] | ["explore", "explore-medium", "researcher", "researcher-low", "writer"] | Agent list that prefers OpenCode |
| `routing.preferClaude` | string[] | ["architect", "executor-high", "critic", "planner"] | Agent list that prefers Claude |
| `routing.autoDelegate` | boolean | true | Enable auto-delegation |

**Example**:
```json
{
  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 5,
    "preferOpencode": [
      "explore",
      "explore-medium",
      "researcher",
      "researcher-low",
      "writer",
      "designer"
    ],
    "preferClaude": [
      "architect",
      "executor-high",
      "critic",
      "planner"
    ],
    "autoDelegate": true
  }
}
```

#### Context Settings

Configure the scope of context to pass when switching to OpenCode.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `context.includeRecentFiles` | boolean | true | Include recently modified files |
| `context.recentFilesLimit` | number | 10 | Maximum number of recent files |
| `context.includeTodos` | boolean | true | Include TODO items |
| `context.includeDecisions` | boolean | true | Include decisions |
| `context.maxContextLength` | number | 50000 | Maximum context length (characters) |

**Example**:
```json
{
  "context": {
    "includeRecentFiles": true,
    "recentFilesLimit": 15,
    "includeTodos": true,
    "includeDecisions": true,
    "maxContextLength": 75000
  }
}
```

#### OpenCode Execution Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `opencode.command` | string | "opencode" | OpenCode command |
| `opencode.args` | string[] | [] | Additional OpenCode arguments |
| `opencode.ultraworkByDefault` | boolean | true | Automatically add ulw when calling OpenCode |
| `opencode.timeout` | number | 300000 | Timeout (milliseconds, default 5 minutes) |

**Example**:
```json
{
  "opencode": {
    "command": "opencode",
    "args": ["--verbose"],
    "ultraworkByDefault": true,
    "timeout": 600000
  }
}
```

#### Notification Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `notifications.showOnThreshold` | boolean | true | Show notification on threshold reach |
| `notifications.showOnKeyword` | boolean | true | Show notification on keyword detection |
| `notifications.quietMode` | boolean | false | Disable all notifications |

**Example**:
```json
{
  "notifications": {
    "showOnThreshold": true,
    "showOnKeyword": true,
    "quietMode": false
  }
}
```

#### HUD Usage Display (v2.1.3+)

OMCM reads usage information from OMC HUD for fusion routing decisions.

**Display Format (OMC v4.2.15+):**
- `5h:XX%(reset_time)` - 5-hour usage
- `wk:XX%(reset_time)` - Weekly usage
- `mo:XX%(reset_time)` - Monthly usage (v2.1.3+)

**Example:**
```
5h:67%(2h30m) wk:48%(3d5h) mo:32%(18d)
```

**Data Sources:**
- OMC HUD cache: `~/.claude/plugins/oh-my-claudecode/.usage-cache.json`
- z.ai provider: Usage retrieved via GLM API (v2.1.3+)

**Notes:**
- Monthly display requires OMC v4.2.15 or higher
- For z.ai provider, ANTHROPIC_BASE_URL must point to a z.ai host

---

## Agent Mapping

### Purpose

Maps OMC agents to OpenCode agents for routing to optimal LLMs.

### File Location

Example: `/opt/oh-my-claude-money/examples/agent-mapping.json`
Production: `~/.omcm/agent-mapping.json` for custom configuration

### Schema

```json
{
  "$schema": "https://omcm.dev/schemas/agent-mapping.json",
  "description": "Agent mapping configuration",
  "mappings": [
    {
      "source": ["agent1", "agent2"],
      "target": "opencode-agent",
      "provider": "opencode|claude|openai|google",
      "model": "model-name",
      "tier": "HIGH|MEDIUM|LOW",
      "reason": "description"
    }
  ],
  "fallback": {
    "provider": "claude",
    "model": "sonnet"
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string[] | ✓ | Array of OMC agent names (can map multiple agents to one) |
| `target` | string | ✓ | OpenCode agent name |
| `provider` | string | | Provider: opencode, claude, openai, google |
| `model` | string | | Specific model name |
| `tier` | string | | Tier level: HIGH, MEDIUM, LOW |
| `reason` | string | | Mapping reason (for documentation) |

### Default Mapping Rules

```json
{
  "mappings": [
    {
      "source": ["architect-medium"],
      "target": "build",
      "provider": "opencode",
      "model": "gpt-5.3-codex",
      "tier": "MEDIUM",
      "reason": "Delegate medium architecture analysis to Codex"
    },
    {
      "source": ["architect-low"],
      "target": "build",
      "provider": "opencode",
      "model": "gemini-3-flash",
      "tier": "LOW",
      "reason": "Delegate quick architecture checks to Flash"
    },
    {
      "source": ["designer"],
      "target": "build",
      "provider": "opencode",
      "model": "gpt-5.3-codex",
      "tier": "MEDIUM",
      "reason": "Delegate UI/UX work to Codex"
    },
    {
      "source": ["researcher", "researcher-low"],
      "target": "general",
      "provider": "opencode",
      "model": "gpt-5.3-codex",
      "tier": "MEDIUM",
      "reason": "Delegate research work to general agent"
    },
    {
      "source": ["explore"],
      "target": "explore",
      "provider": "opencode",
      "model": "gemini-3-flash",
      "tier": "LOW",
      "reason": "Delegate quick exploration to Flash"
    },
    {
      "source": ["writer"],
      "target": "general",
      "provider": "opencode",
      "model": "gemini-3-flash",
      "tier": "LOW",
      "reason": "Delegate documentation to Flash"
    }
  ],
  "fallback": {
    "provider": "claude",
    "model": "sonnet"
  }
}
```

### Fallback Configuration

Specifies the default provider and model to use when no agent mapping exists.

```json
{
  "fallback": {
    "provider": "claude",
    "model": "sonnet"
  }
}
```

### Custom Mapping Configuration

1. Create Mapping File:
```bash
mkdir -p ~/.omcm
cat > ~/.omcm/agent-mapping.json << 'EOF'
{
  "mappings": [
    {
      "source": ["custom-agent"],
      "target": "custom-opencode",
      "provider": "opencode",
      "model": "custom-model",
      "tier": "MEDIUM",
      "reason": "Custom agent mapping"
    }
  ],
  "fallback": {
    "provider": "claude",
    "model": "sonnet"
  }
}
EOF
```

2. Verify Configuration Loading:
```javascript
import { loadAgentMapping } from './src/router/mapping.mjs';
const mapping = loadAgentMapping('~/.omcm/agent-mapping.json');
console.log(mapping);
```

---

## Routing Rules

### Purpose

Condition-based routing to automatically select LLM based on specific situations.

### File Location

Example: `/opt/oh-my-claude-money/examples/routing-rules.json`
Production: `~/.omcm/routing-rules.json` for custom configuration

### Schema

```json
{
  "$schema": "https://omcm.dev/schemas/routing-rules.json",
  "description": "Routing rules configuration",
  "rules": [
    {
      "id": "rule-id",
      "condition": "condition-expression",
      "action": "prefer_opencode|force_opencode|prefer_claude|force_claude|block|default",
      "priority": 100,
      "description": "description"
    }
  ]
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✓ | Unique rule ID |
| `condition` | string | ✓ | Condition expression (JavaScript expression) |
| `action` | string | ✓ | Routing action |
| `priority` | number | | Priority (higher runs first) |
| `description` | string | | Rule description |

### Condition Expression Syntax

Available variables in condition expressions:

```javascript
// Usage information
usage.fiveHour        // 5-hour usage (%)
usage.24hour          // 24-hour usage (%)
usage.weekly          // Weekly usage (%)

// Mode information
mode.fusion           // Whether fusion mode is active

// Task information
task.complexity       // Task complexity ("low", "medium", "high")
task.type             // Task type
task.priority         // Task priority

// Agent information
agent.type            // Agent type
agent.tier            // Agent tier ("LOW", "MEDIUM", "HIGH")
agent.provider        // Current provider

// Time information
time.hour             // Current hour (0-23)
time.dayOfWeek        // Day of week (0-6, 0=Sunday)
```

### Routing Actions

| Action | Description |
|--------|-------------|
| `prefer_opencode` | Prefer OpenCode but Claude also possible |
| `force_opencode` | Must use OpenCode |
| `prefer_claude` | Prefer Claude but OpenCode also possible |
| `force_claude` | Must use Claude |
| `block` | Block this task execution |
| `default` | Use default routing rules |

### Default Routing Rules

```json
{
  "rules": [
    {
      "id": "high-usage-opencode",
      "condition": "usage.fiveHour > 90",
      "action": "prefer_opencode",
      "priority": 100,
      "description": "Prefer OpenCode when 5-hour usage exceeds 90%"
    },
    {
      "id": "weekly-limit-opencode",
      "condition": "usage.weekly > 85",
      "action": "prefer_opencode",
      "priority": 90,
      "description": "Prefer OpenCode when weekly usage exceeds 85%"
    },
    {
      "id": "complex-task-claude",
      "condition": "task.complexity == 'high'",
      "action": "prefer_claude",
      "priority": 80,
      "description": "Prefer Claude for complex tasks"
    },
    {
      "id": "security-review-claude",
      "condition": "agent.type == 'security-reviewer'",
      "action": "prefer_claude",
      "priority": 85,
      "description": "Prefer Claude for security review"
    },
    {
      "id": "planner-claude",
      "condition": "agent.type == 'planner'",
      "action": "force_claude",
      "priority": 88,
      "description": "Must use Claude for strategic planning"
    },
    {
      "id": "critic-claude",
      "condition": "agent.type == 'critic'",
      "action": "force_claude",
      "priority": 88,
      "description": "Must use Claude for plan critique"
    },
    {
      "id": "low-usage-claude",
      "condition": "usage.fiveHour < 50",
      "action": "prefer_claude",
      "priority": 30,
      "description": "Prefer Claude when usage is low"
    }
  ]
}
```

### Custom Routing Rules Configuration

1. Create Rules File:
```bash
cat > ~/.omcm/routing-rules.json << 'EOF'
{
  "rules": [
    {
      "id": "custom-rule-1",
      "condition": "usage.fiveHour > 80 && agent.tier == 'LOW'",
      "action": "force_opencode",
      "priority": 110,
      "description": "High usage + LOW tier agent = force OpenCode"
    },
    {
      "id": "custom-rule-2",
      "condition": "time.hour >= 9 && time.hour <= 17",
      "action": "prefer_claude",
      "priority": 50,
      "description": "Prefer Claude during business hours"
    }
  ]
}
EOF
```

2. Load and Test Rules:
```javascript
import { loadRoutingRules } from './src/router/rules.mjs';
const rules = loadRoutingRules('~/.omcm/routing-rules.json');
console.log(rules);
```

---

## Hook Configuration

### Overview

Uses Claude Code's hook system to execute OMCM logic at specific events.

### File Location

`/root/.claude/plugins/marketplaces/omcm/hooks/hooks.json`

### Hook Types and Behavior

#### 1. PreToolUse (Before Task Call)

**Purpose**: Fusion routing check before Task call

**Execution**: `node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs`

**Timeout**: 120 seconds

```json
{
  "PreToolUse": [
    {
      "matcher": "Task",
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs",
          "timeout": 120,
          "statusMessage": "Checking fusion routing..."
        }
      ]
    }
  ]
}
```

**Behavior**:
- Analyzes agent and task type during Task call
- Decides whether to switch to OpenCode based on routing rules
- Exports context if needed

#### 2. PreToolUse - Read Optimizer (Phase 1-5)

**Purpose**: Optimize Read tool calls to reduce token usage

**Execution**: `node ${CLAUDE_PLUGIN_ROOT}/hooks/read-optimizer.mjs`

**Timeout**: 5 seconds

**Behavior**:
- Detects duplicate Read calls for the same file
- Suggests using line ranges for large files
- Reduces unnecessary token consumption

#### 3. PreToolUse - Bash Optimizer (Phase 1-5)

**Purpose**: Optimize Bash tool calls to reduce token usage

**Execution**: `node ${CLAUDE_PLUGIN_ROOT}/hooks/bash-optimizer.mjs`

**Timeout**: 5 seconds

**Behavior**:
- Detects redundant bash commands
- Suggests more efficient alternatives
- Prevents wasteful command execution

#### 4. PostToolUse - Tool Tracker (Phase 1-5)

**Purpose**: Track tool usage for analytics and optimization

**Execution**: `node ${CLAUDE_PLUGIN_ROOT}/hooks/tool-tracker.mjs`

**Matcher**: `Read|Edit|Bash|Grep|Glob|Task`

**Timeout**: 5 seconds

**Behavior**:
- Records every tool call (type, timestamp, duration)
- Aggregates tool usage statistics
- Enables Phase 1-5 token savings calculations

#### 5. UserPromptSubmit (User Input Submission)

**Purpose**: Usage threshold and keyword detection

**Execution**: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/detect-handoff.mjs`

**Timeout**: 5 seconds

```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/detect-handoff.mjs",
          "timeout": 5,
          "statusMessage": "Checking usage..."
        }
      ]
    }
  ]
}
```

**Behavior**:
- Checks Claude usage (from HUD cache)
- Notification/automatic switch when threshold (default 90%) is reached
- Displays notification when keywords are detected

#### 3. SessionStart (Session Start)

**Purpose**: Load usage information at session start

**Execution**: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/session-start.mjs`

**Timeout**: 3 seconds

```json
{
  "SessionStart": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/session-start.mjs",
          "timeout": 3,
          "statusMessage": "Loading usage information..."
        }
      ]
    }
  ]
}
```

**Behavior**:
- Loads oh-my-claudecode HUD cache
- Checks current usage status
- Displays warnings if needed

#### 4. Stop (Task Interruption)

**Purpose**: Track active modes

**Execution**: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/persistent-mode.mjs`

**Timeout**: 5 seconds

```json
{
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/persistent-mode.mjs",
          "timeout": 5,
          "statusMessage": "Checking active modes..."
        }
      ]
    }
  ]
}
```

**Behavior**:
- Checks active modes before interruption
- Saves hulw/ulw state
- Records session metadata

### Complete Hook Configuration (7 hooks across 5 events)

```json
{
  "description": "oh-my-claude-money - Usage management and OpenCode bridge hooks",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs",
            "timeout": 120,
            "statusMessage": "Checking fusion routing..."
          }
        ]
      },
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/read-optimizer.mjs",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/bash-optimizer.mjs",
            "timeout": 5
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/detect-handoff.mjs",
            "timeout": 5,
            "statusMessage": "Checking usage..."
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/session-start.mjs",
            "timeout": 3,
            "statusMessage": "Loading usage information..."
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/persistent-mode.mjs",
            "timeout": 5,
            "statusMessage": "Checking active modes..."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read|Edit|Bash|Grep|Glob|Task",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/tool-tracker.mjs",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### Adding Custom Hooks

1. Write Hook Script:
```bash
cat > ~/.claude/plugins/omcm/hooks/custom-hook.mjs << 'EOF'
#!/usr/bin/env node
import { loadConfig } from '../src/utils/config.mjs';

const config = loadConfig();
console.log('Custom hook executed with config:', config.fusionDefault);
EOF

chmod +x ~/.claude/plugins/omcm/hooks/custom-hook.mjs
```

2. Add to hooks.json:
```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/custom-hook.mjs",
          "timeout": 5,
          "statusMessage": "Running custom hook..."
        }
      ]
    }
  ]
}
```

---

## Environment Variables

### OMCM Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OMCM_MAX_WORKERS` | Maximum parallel CLI calls | 3 | `export OMCM_MAX_WORKERS=5` |
| `OMCM_CLI_TIMEOUT` | CLI execution timeout (ms) | 300000 | `export OMCM_CLI_TIMEOUT=600000` |
| `OMCM_FUSION_MODE` | Force fusion mode | (none) | `export OMCM_FUSION_MODE=hulw` |
| `OMCM_DEBUG` | Debug logging | false | `export OMCM_DEBUG=true` |
| `OMCM_CONFIG_DIR` | Configuration directory | `~/.omcm` | `export OMCM_CONFIG_DIR=$HOME/.omcm` |

### Provider API Keys - Required

| Variable | Description | Source |
|----------|-------------|--------|
| `ANTHROPIC_API_KEY` | Claude API key | https://console.anthropic.com/settings/keys |
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys |
| `GOOGLE_API_KEY` | Google Gemini API key | https://aistudio.google.com/apikey |

### Setting Environment Variables

**Temporary Setting**:
```bash
export OMCM_MAX_WORKERS=5
export OMCM_CLI_TIMEOUT=600000
export ANTHROPIC_API_KEY="sk-ant-..."
codex auth login
```

**Permanent Setting** (~/.bashrc or ~/.zshrc):
```bash
# OMCM Configuration
export OMCM_MAX_WORKERS=3
export OMCM_CLI_TIMEOUT=300000
export OMCM_DEBUG=false

# Provider API Keys
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

Apply Permanent Settings:
```bash
source ~/.bashrc  # for bash
source ~/.zshrc   # for zsh
```

### CLI Execution Settings

OMCM uses direct CLI execution (stateless, no port management needed).

**CLI Configuration**:
```json
{
  "routing": {
    "maxOpencodeWorkers": 4,  // Max parallel CLI calls
    "timeout": 300000         // 5 minutes default
  }
}
```

**Performance Notes**:
- CLI execution is stateless (no persistent processes)
- No port conflicts (CLI is stateless)
- Memory efficient (~50MB per call vs ~250MB per server)

---

## Configuration Examples

### Example 1: Basic Configuration - Recommended

Using OMCM with minimal configuration:

```json
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false,
  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 3
  }
}
```

**Save Configuration**:
```bash
mkdir -p ~/.claude/plugins/omcm
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false,
  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 3
  }
}
EOF
```

### Example 2: Always Fusion Mode

Enable OpenCode fusion for all tasks:

```json
{
  "fusionDefault": true,
  "threshold": 100,
  "autoHandoff": true,
  "routing": {
    "enabled": true,
    "maxOpencodeWorkers": 5,
    "preferOpencode": [
      "explore", "explore-medium", "researcher",
      "designer", "writer", "vision"
    ]
  }
}
```

### Example 3: Auto Handoff Mode

Usage-based automatic switching:

```json
{
  "fusionDefault": false,
  "threshold": 85,
  "autoHandoff": true,
  "routing": {
    "enabled": true,
    "usageThreshold": 80,
    "maxOpencodeWorkers": 5,
    "autoDelegate": true
  },
  "notifications": {
    "showOnThreshold": true,
    "showOnKeyword": true,
    "quietMode": false
  }
}
```

### Example 4: Advanced Configuration - Large Parallel Workloads

Optimized for large parallel workloads:

```json
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false,
  "routing": {
    "enabled": true,
    "usageThreshold": 65,
    "maxOpencodeWorkers": 8,
    "preferOpencode": [
      "explore", "explore-medium", "explore-high",
      "researcher", "researcher-low",
      "designer", "designer-low",
      "writer", "vision"
    ],
    "preferClaude": [
      "architect",
      "executor-high", "critic", "planner"
    ],
    "autoDelegate": true
  },
  "context": {
    "includeRecentFiles": true,
    "recentFilesLimit": 20,
    "includeTodos": true,
    "includeDecisions": true,
    "maxContextLength": 100000
  },
  "opencode": {
    "command": "codex",
    "timeout": 600000
  }
}
```

### Example 5: Security-First Configuration

Always use Claude for security tasks:

```json
{
  "fusionDefault": false,
  "routing": {
    "enabled": true,
    "preferClaude": [
      "architect", "executor-high",
      "security-reviewer", "code-reviewer",
      "critic", "planner"
    ]
  }
}
```

---

## Troubleshooting

### Q1: Config File Not Found

**Error**: `Config file not found: ~/.claude/plugins/omcm/config.json`

**Solution**:
```bash
# Create directory
mkdir -p ~/.claude/plugins/omcm

# Create default config file
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "fusionDefault": false,
  "threshold": 90
}
EOF
```

### Q2: Configuration Changes Not Applied

**Cause**: Configuration cache

**Solution**:
1. Modify configuration file
2. Restart Claude Code Session:
```bash
# Exit current session
# Start again in new terminal
claude
```

### Q3: CLI Execution Timeout

**Error**: `CLI execution timeout after 300000ms`

**Solution**:
```bash
# Increase timeout
export OMCM_CLI_TIMEOUT=600000

# Or add to config
cat >> ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "timeout": 600000
  }
}
EOF
```

### Q4: Agent Mapping Not Working

**Checklist**:
1. Validate Mapping File:
```bash
node -e "
import { validateAgentMapping } from './src/config/schema.mjs';
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('~/.omcm/agent-mapping.json', 'utf-8'));
const result = validateAgentMapping(data);
console.log(result);
"
```

2. Check Mapping File Path:
```bash
ls -la ~/.omcm/agent-mapping.json
```

### Q5: Routing Rule Condition Expression Error

**Error**: `Invalid condition: usage.fiveHour > 90`

**Solution**: Check Condition Expression Syntax
- Use only valid variables: `usage.*`, `mode.*`, `task.*`, `agent.*`, `time.*`
- Use JavaScript expressions: `&&`, `||`, `>`, `<`, `==`, `!=`
- Use double quotes for strings: `"high"`, `"medium"`

```json
{
  "condition": "usage.fiveHour > 90 && task.complexity == 'high'"
}
```

### Q6: Context Too Long, Transmission Failed

**Solution**:
```json
{
  "context": {
    "maxContextLength": 50000,
    "recentFilesLimit": 5,
    "includeTodos": true,
    "includeDecisions": false
  }
}
```

### Q7: Fusion Mode Not Auto-Switching

**Check**:
1. Check threshold:
```bash
# Check current usage (oh-my-claudecode HUD)
# Check ~/.cache/omc/hud-cache.json
cat ~/.cache/omc/hud-cache.json | jq '.usage'
```

2. Check autoHandoff setting:
```bash
cat ~/.claude/plugins/omcm/config.json | jq '.autoHandoff'
```

3. Enable:
```bash
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "autoHandoff": true,
  "threshold": 90
}
EOF
```

### Q8: Hooks Not Executing

**Check**:
1. Verify hook files exist:
```bash
ls -la ~/.claude/plugins/omcm/hooks/
ls -la ~/.claude/plugins/omcm/src/hooks/
```

2. Check hook permissions:
```bash
chmod +x ~/.claude/plugins/omcm/hooks/*.mjs
chmod +x ~/.claude/plugins/omcm/src/hooks/*.mjs
```

3. Restart Claude Code:
```bash
# Exit current session and restart
claude
```

---

## References

- [CLAUDE.md](/CLAUDE.md) - OMCM project rules
- [README.md](/README.md) - Usage guide and quick start
- [CHANGELOG.md](/CHANGELOG.md) - Version changes
- [Example files](../examples/) - agent-mapping.json, routing-rules.json
