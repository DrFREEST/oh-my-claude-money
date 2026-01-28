# OMCM Skills Reference Guide

This document provides detailed documentation for all skills in oh-my-claude-money (OMCM). Learn about triggers, usage, and behaviors at a glance.

---

## Table of Contents

1. [autopilot (Hybrid Autopilot)](#1-autopilot-hybrid-autopilot)
2. [ulw (Ultrawork with Auto Fusion)](#2-ulw-ultrawork-with-auto-fusion)
3. [hulw (Hybrid Ultrawork)](#3-hulw-hybrid-ultrawork)
4. [ecomode (Token Efficiency Mode)](#4-ecomode-token-efficiency-mode)
5. [ralph (Persist Until Complete)](#5-ralph-persist-until-complete)
6. [opencode (OpenCode Transition)](#6-opencode-opencode-transition)
7. [cancel (Unified Cancel)](#7-cancel-unified-cancel)
8. [Skill Combinations and Best Practices](#skill-combinations-and-best-practices)

---

## 1. autopilot (Hybrid Autopilot)

### Description

**Fully autonomous execution** from idea to completion. Supports Claude + OpenCode fusion for both token savings and performance.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| \`autopilot\` | "autopilot: create a REST API" |
| \`/autopilot\` | "/autopilot implement React dashboard" |
| \`build me\` | "build me a todo app" |
| \`I want a\` | "I want a CLI tool" |

### Usage Examples

\`\`\`
autopilot: implement user authentication
\`\`\`

### Workflow

\`\`\`
1. Notification output
   ↓
2. Delegate to agents via Task tool (planner or analyst)
   ↓
3. Automatic workflow execution
   - Requirements analysis (architect/analyst)
   - Planning (planner)
   - Code exploration (explore)
   - Implementation (executor)
   - Final verification (architect)
   ↓
4. Completion report
\`\`\`

### Agent Routing (Automatic)

| Stage | OMC Agent | → | OMO Agent | Model |
|-------|-----------|---|-----------|-------|
| Requirements Analysis | analyst | → | Oracle | GPT 5.2 |
| Code Exploration | explore | → | explore | Gemini Flash |
| UI Implementation | designer | → | frontend-ui-ux-engineer | Gemini Pro |
| Research | researcher | → | Oracle | GPT 5.2 |
| Execution | executor | → | Codex | GPT 5.2 Codex |
| Final Verification | architect | → | Oracle | GPT 5.2 |

---

## 2. ulw (Ultrawork with Auto Fusion)

### Description

**Automatically determines mode based on usage**. Routes to Claude agents at low usage, automatically switches to OpenCode at high usage.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| \`ulw\` | "ulw: refactor this project" |
| \`/ulw\` | "/ulw fix all errors" |
| \`ultrawork\` | "ultrawork for fast processing" |

### Behavior

| Usage | Mode | Action |
|-------|------|--------|
| < 70% | Normal Ultrawork | Parallel execution with Claude agents |
| 70-90% | Hybrid | Offload some work to OpenCode |
| > 90% | OpenCode-centric | Delegate most to OpenCode |

---

## 3. hulw (Hybrid Ultrawork)

### Description

Utilizes both Claude and OpenCode to **optimize token usage** while performing parallel processing. Always operates in fusion mode.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| \`hulw\` | "hulw: refactor this project" |
| \`/hulw\` | "/hulw fix all errors" |
| \`hybrid ultrawork\` | "start with hybrid ultrawork" |

### Agent Routing Map

| Task Type | Routing | Model | Savings |
|-----------|---------|-------|---------|
| Architecture analysis | OpenCode Oracle | GPT | ✅ |
| Code exploration | OpenCode Librarian | - | ✅ |
| UI work | OpenCode Frontend | Gemini | ✅ |
| Complex implementation | Claude executor | Opus | - |
| Strategic planning | Claude planner | Opus | - |

---

## 4. ecomode (Token Efficiency Mode)

### Description

Performs tasks while **maximizing Claude token savings**. Expects 30-50% token savings with **Haiku/Flash priority routing**.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| \`eco\` | "eco: refactor this component" |
| \`ecomode\` | "start with ecomode" |
| \`efficient\` | "work efficiently" |
| \`budget\` | "activate budget mode" |
| \`save-tokens\` | "save-tokens: run all tests" |

### Expected Savings

| Task Type | Default Mode | Ecomode | Savings |
|-----------|--------------|---------|---------|
| Exploration/Search | Sonnet | Flash | ~70% |
| Standard Implementation | Sonnet | Codex | ~40% |
| Documentation | Sonnet | Flash | ~70% |
| Code Review | Opus | Codex | ~50% |

**Average Savings**: 30-50%

---

## 5. ralph (Persist Until Complete)

### Description

Like Sisyphus, **never stops until the task is completely finished and verified**. Repeats self-referential loops until verification passes.

### Core Philosophy

> "HUMAN IN THE LOOP = BOTTLENECK"
> Autonomous execution to completion without user intervention

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| \`ralph\` | "ralph: implement this feature perfectly" |
| \`don't stop\` | "don't stop until it works" |
| \`must complete\` | "must complete this task" |

### Verification Criteria (5 Required)

1. **BUILD**: Build success (0 errors)
2. **TEST**: All tests pass
3. **LINT**: No lint errors
4. **FUNCTIONALITY**: Requested functionality works
5. **TODO**: All tasks complete

---

## 6. opencode (OpenCode Transition)

### Description

Saves current task context and **smoothly transitions to OpenCode**.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| \`opencode\` | "switch to opencode" |
| \`handoff\` | "handoff to opencode" |

### Transition Process

\`\`\`
1. Context collection
   - Current task state
   - TODO list
   - Recently modified files
   ↓
2. Context save
   - Save to ~/.omcm/handoff/context.md
   ↓
3. Process replacement
   - Smooth transition via exec
\`\`\`

---

## 7. cancel (Unified Cancel)

### Description

Automatically detects and cancels all activated OMCM modes.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| \`cancel\` | "cancel" |
| \`stop\` | "stop" |
| \`abort\` | "abort" |

### Cancellable Modes

| Mode | State File |
|------|------------|
| autopilot | \`~/.omcm/state/autopilot.json\` |
| ralph | \`~/.omcm/state/ralph.json\` |
| ultrawork | \`~/.omcm/state/ultrawork.json\` |
| ecomode | \`~/.omcm/state/ecomode.json\` |
| hulw | \`~/.omcm/state/hulw.json\` |
| swarm | \`~/.omcm/state/swarm.json\` |
| pipeline | \`~/.omcm/state/pipeline.json\` |

---

## Skill Combinations and Best Practices

### Recommended Skills by Usage

| Usage | Recommended Mode | Reason |
|-------|------------------|--------|
| 0-50% | ulw, autopilot | Claude sufficient, prioritize speed |
| 50-70% | hulw, eco | Start token savings |
| 70-90% | eco, ralph eco | Maximum token savings |
| 90%+ | eco, opencode switch | OpenCode-centric |

### Combination Examples

#### Token Savings + Guaranteed Completion
\`\`\`
ralph eco: write all tests and guarantee they pass
\`\`\`

#### Parallel + Fusion
\`\`\`
hulw ulw: quickly refactor
\`\`\`

#### Maximum Performance
\`\`\`
ralph hulw: implement core feature perfectly
\`\`\`

---

## References

- [OMCM Main Documentation](/opt/oh-my-claude-money/README.md)
- [OMCM Configuration Guide](/opt/oh-my-claude-money/docs/en/CONFIGURATION.md)
- [OMCM Architecture](/opt/oh-my-claude-money/docs/en/ARCHITECTURE.md)
