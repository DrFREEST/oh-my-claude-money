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
| `autopilot` | "autopilot: create a REST API" |
| `/autopilot` | "/autopilot implement React dashboard" |
| `build me` | "build me a todo app" |
| `I want a` | "I want a CLI tool" |

### Usage Examples

```
autopilot: implement user authentication
```

or

```
build me a payment processing system
```

### Workflow

```
1. Notification output
   |
2. Delegate to agents via Task tool (planner or analyst)
   |
3. Automatic workflow execution
   - Requirements analysis (architect/analyst)
   - Planning (planner)
   - Code exploration (explore)
   - Implementation (executor)
   - Final verification (architect)
   |
4. Completion report
```

### Agent Routing (Automatic)

OMCM automatically routes agents as follows:

| Stage | OMC Agent | Tier | Fusion Routing | Model |
|-------|-----------|------|----------------|-------|
| Requirements Analysis | analyst | HIGH | Claude (retained) | Opus |
| Planning | planner | HIGH | Claude (retained) | Opus |
| Code Exploration | explore | LOW | OpenCode explore | Gemini Flash |
| UI Implementation | designer | MEDIUM | OpenCode build | GPT-5.2-Codex |
| Research | researcher | MEDIUM | OpenCode build | GPT-5.2-Codex |
| Implementation | executor | MEDIUM | OpenCode build | GPT-5.2-Codex |
| Final Verification | architect | HIGH | Claude (retained) | Opus |

### Important: Parallel Processing Rules

**When autopilot is activated, you must call Task tools in parallel!**

```xml
BAD (sequential calls)
Task(...) // Wait for completion
Task(...) // Wait for completion

GOOD (parallel calls)
<function_calls>
<invoke name="Task">...</invoke>
<invoke name="Task">...</invoke>
</function_calls>
```

### Activation Conditions

- **Automatic hybrid switching**: `fusionDefault: true` setting or usage above 70%
- **Explicit request**: "autopilot hulw", "hybrid autopilot"

### Cancellation Methods

- `stop`, `cancel`, `abort` keywords
- `/omcm:cancel-autopilot` command

---

## 2. ulw (Ultrawork with Auto Fusion)

### Description

**Automatically determines mode based on usage**. Routes to Claude agents at low usage, automatically switches to OpenCode at high usage.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| `ulw` | "ulw: refactor this project" |
| `/ulw` | "/ulw fix all errors" |
| `ultrawork` | "ultrawork for fast processing" |

### Usage Examples

```
ulw: fix this bug quickly
```

```
ulw refactor the entire test suite
```

### Behavior

| Usage | Mode | Action |
|-------|------|--------|
| < 70% | Normal Ultrawork | Parallel execution with Claude agents |
| 70-90% | Hybrid | Offload some work to OpenCode |
| > 90% | OpenCode-centric | Delegate most to OpenCode |

### Agent Routing Map

OMCM automatically routes based on usage and settings:

| OMC Agent | Fusion Target | Model |
|-----------|---------------|-------|
| explore, explore-medium | OpenCode explore | Gemini Flash / GPT-5.2 |
| architect-medium | OpenCode build | GPT-5.2-Codex |
| researcher | OpenCode build | GPT-5.2-Codex |
| researcher-low | OpenCode explore | Gemini Flash |
| designer, designer-low | OpenCode build | GPT-5.2-Codex / Gemini Flash |
| writer | OpenCode general | Gemini Flash |
| vision | OpenCode build | GPT-5.2-Codex |
| executor, executor-low | OpenCode build | GPT-5.2-Codex / Gemini Flash |

### Notification Messages

Different notifications appear based on usage:

- **Low** -> "**ulw mode** - Parallel execution with Claude agents"
- **Medium** -> "**ulw -> hulw auto-switch** - Switching to fusion mode for token savings"
- **High** -> "**ulw -> OpenCode-centric** - High usage, proceeding primarily with OpenCode"

### ulw vs hulw Differences

| Feature | ulw | hulw |
|---------|-----|------|
| Default behavior | Usage-based auto decision | Always OpenCode fusion |
| Token savings | Conditional | Always |
| Best for | General work | When token savings are always needed |

---

## 3. hulw (Hybrid Ultrawork)

### Description

Utilizes both Claude and OpenCode to **optimize token usage** while performing parallel processing. Always operates in fusion mode.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| `hulw` | "hulw: refactor this project" |
| `/hulw` | "/hulw fix all errors" |
| `hybrid ultrawork` | "start with hybrid ultrawork" |

### Usage Examples

```
hulw: implement database schema migration
```

```
completely refactor this project hulw
```

### Workflow

```
1. Task analysis
   |
2. Routing decision
   - Analysis/exploration tasks -> OpenCode (GPT/Gemini)
   - UI/frontend -> OpenCode (Gemini)
   - Complex implementation -> Claude (Opus)
   |
3. Parallel execution
   |
4. Result integration
```

### Agent Routing Map

| Task Type | Routing | Model | Savings |
|-----------|---------|-------|---------|
| Architecture analysis (architect-medium) | OpenCode build | GPT-5.2-Codex | Yes |
| Code exploration (explore) | OpenCode explore | Gemini Flash | Yes |
| UI work (designer) | OpenCode build | GPT-5.2-Codex | Yes |
| Research (researcher) | OpenCode build | GPT-5.2-Codex | Yes |
| Complex implementation (executor-high) | Claude | Opus | - |
| Strategic planning (planner) | Claude | Opus | - |
| Plan critique (critic) | Claude | Opus | - |
| Security review (security-reviewer) | Claude | Opus | - |

### Configuration

`~/.claude/plugins/omcm/config.json`:

```json
{
  "fusionDefault": true,
  "threshold": 90,
  "autoHandoff": false
}
```

### Notes

- OpenCode provider authentication is required (OPENAI_API_KEY, GOOGLE_API_KEY)
- Unauthenticated providers will fall back to Claude

---

## 4. ecomode (Token Efficiency Mode)

### Description

Performs tasks while **maximizing Claude token savings**. Expects 30-50% token savings with **Haiku/Flash priority routing**.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| `eco` | "eco: refactor this component" |
| `ecomode` | "start with ecomode" |
| `efficient` | "work efficiently" |
| `budget` | "activate budget mode" |
| `save-tokens` | "save-tokens: run all tests" |
| `/eco` | "/eco" |
| `/ecomode` | "/ecomode" |

### Usage Examples

```
eco: refactor all components in this project
```

```
budget mode: implement the entire test suite
```

### Routing Strategy

#### Forced LOW Tier (Gemini Flash)

- explore, explore-medium -> explore (Flash)
- researcher, researcher-low -> general (Flash)
- writer -> general (Flash)
- designer-low -> build (Flash)
- executor-low -> build (Flash)

#### Forced MEDIUM Tier (GPT Codex)

- architect-medium -> build (Codex)
- executor -> build (Codex)
- designer -> build (Codex)

#### Opus Retained (Quality Required)

- planner, critic, analyst -> Original tier maintained
- security-reviewer -> Security cannot be compromised
- executor-high -> Complex implementation is quality-first

### Expected Savings

| Task Type | Default Mode | Ecomode | Savings |
|-----------|--------------|---------|---------|
| Exploration/Search | Sonnet | Flash | ~70% |
| Standard Implementation | Sonnet | Codex | ~40% |
| Documentation | Sonnet | Flash | ~70% |
| Code Review | Opus | Codex | ~50% |
| Complex Analysis | Opus | Opus | 0% |

**Average Savings**: 30-50%

### State Management

```json
// ~/.omcm/state/ecomode.json
{
  "active": true,
  "startedAt": "2026-01-27T10:00:00Z",
  "tokensSaved": 15000,
  "tasksCompleted": 12,
  "escalations": 2
}
```

### Quality Monitoring

Escalation conditions:
- Same task fails 2 times
- Explicit quality requests ("precisely", "carefully")
- Security/authentication related tasks

### Ecomode + Ultrawork Combination

Use `eco ulw:` or `ecomode ultrawork:` to achieve optimal cost-performance:
- Speed from parallel processing
- Economy from low-cost models

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
| `ralph` | "ralph: implement this feature perfectly" |
| `don't stop` | "don't stop until it works" |
| `must complete` | "must complete this task" |
| `/ralph` | "/ralph" |

### Usage Examples

```
ralph: implement this complex feature perfectly
```

```
don't stop until all tests pass
```

### Ralph Loop Structure

```
Start
  |
Execute work
  |
Verify (Architect)
  |
Pass? --No--> Fix --> Execute work (repeat)
  |
  Yes
  |
Declare completion
```

### Verification Criteria (5 Required)

1. **BUILD**: Build success (0 errors)
2. **TEST**: All tests pass
3. **LINT**: No lint errors
4. **FUNCTIONALITY**: Requested functionality works
5. **TODO**: All tasks complete

### State Management

```json
// ~/.omcm/state/ralph.json
{
  "active": true,
  "startedAt": "2026-01-27T10:00:00Z",
  "iterations": 3,
  "lastVerification": {
    "build": true,
    "test": false,
    "lint": true,
    "functionality": "pending",
    "todo": false
  },
  "blockers": ["test failure in auth.test.ts"]
}
```

### Fusion Mode Integration

Ralph can be combined with fusion modes:

```
ralph hulw: hybrid ultrawork until completion
```

```
ralph eco: token-efficient completion guarantee
```

### Safety Mechanisms

#### Maximum Iterations
- Default: 10 times
- Setting: `ralph --max-iterations 20`

#### Timeout
- Default: 30 minutes
- Setting: `ralph --timeout 60`

#### Escalation
- 3 consecutive identical errors -> Request user help
- 5 consecutive failures -> Auto-stop + status report

### Completion Conditions

ALL of the following must be met:
- [ ] All TODO tasks complete
- [ ] Build success
- [ ] Tests pass
- [ ] Architect verification approved
- [ ] Functionality confirmed

### Cancellation Methods

- `cancel` - Stop after current iteration completes
- `cancel --force` - Stop immediately
- `stop` - Same as cancel

---

## 6. opencode (OpenCode Transition)

### Description

Saves current task context and **smoothly transitions to OpenCode**.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| `opencode` | "switch to opencode" |
| `handoff` | "handoff to opencode" |

### Usage Examples

```
switch to opencode for the remaining implementation
```

```
opencode transition: finish the rest
```

### Transition Process

```
1. Context collection
   - Current task state
   - TODO list
   - Recently modified files
   - Decisions
   |
2. Context save
   - Save to ~/.omcm/handoff/context.md in markdown format
   |
3. Process replacement
   - Smooth transition via exec from Claude Code to OpenCode
```

### Scripts

Automatic execution:
```bash
/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh "$(pwd)"
```

Manual execution (terminal):
```bash
/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh
```

Context save only (no transition):
```bash
/opt/oh-my-claude-money/scripts/export-context.sh "$(pwd)"
```

### Notes

- After transition, the Claude Code process terminates (exec method)
- To return to Claude Code, run `claude` command in terminal
- Context is saved to `~/.omcm/handoff/context.md`

---

## 7. cancel (Unified Cancel)

### Description

Automatically detects and cancels all activated OMCM modes.

### Trigger Keywords

| Keyword | Example |
|---------|---------|
| `cancel` | "cancel" |
| `stop` | "stop" |
| `abort` | "abort" |
| `/cancel` | "/cancel" |

### Cancellable Modes

| Mode | State File | Cancel Action |
|------|------------|---------------|
| autopilot | `~/.omcm/state/autopilot.json` | End session, reset state |
| ralph | `~/.omcm/state/ralph.json` | Stop loop, reset state |
| ultrawork | `~/.omcm/state/ultrawork.json` | Stop parallel tasks |
| ecomode | `~/.omcm/state/ecomode.json` | Disable token savings mode |
| hulw | `~/.omcm/state/hulw.json` | Disable hybrid mode |
| swarm | `~/.omcm/state/swarm.json` | Release agent pool |
| pipeline | `~/.omcm/state/pipeline.json` | Stop pipeline |

### Usage

#### Basic Cancel

```
cancel
```

or

```
stop
```

#### Force Cancel All

```
cancel --force
```

or

```
cancel --all
```

### Post-Cancel Behavior

- All background agents terminated
- State files reset (`active: false`)
- Cancel completion message displayed to user
- TodoList state preserved (work records retained)

### Notes

- In-progress file modifications complete before cancellation
- Uncommitted changes are preserved
- The same mode can be restarted after cancellation

---

## Skill Combinations and Best Practices

### Skill Combination Guide

#### 1. Fast Implementation (Speed Priority)

```
ulw: implement React component quickly
```

**Best for**: Fast development when usage is low or moderate

#### 2. Token Savings (Efficiency Priority)

```
eco: fix all TypeScript type errors
```

**Best for**: When token usage is high

#### 3. Guaranteed Completion (Reliability Priority)

```
ralph: fix this bug completely
```

**Best for**: Critical feature implementation or bug fixes

#### 4. Hybrid Fusion (Balance)

```
hulw: database schema migration
```

**Best for**: Large-scale project refactoring

#### 5. Fully Autonomous (Idea to Completion)

```
autopilot: build a REST API server and deploy
```

**Best for**: New project initial implementation

### Combination Examples

#### Token Savings + Guaranteed Completion

```
ralph eco: write all tests and guarantee they pass
```

Behavior:
- Ecomode uses low-cost models
- Ralph loop persists until completion

#### Parallel + Fusion

```
hulw ulw: quickly refactor
```

Behavior:
- Ultrawork parallel processing
- Usage-based auto routing

#### Maximum Performance

```
ralph hulw: implement core feature perfectly
```

Behavior:
- Claude + OpenCode fusion
- Guaranteed completion with persistence

### Recommended Skills by Usage

| Usage | Recommended Mode | Reason |
|-------|------------------|--------|
| 0-50% | ulw, autopilot | Claude sufficient, prioritize speed |
| 50-70% | hulw, eco | Start token savings |
| 70-90% | eco, ralph eco | Maximum token savings |
| 90%+ | eco, opencode switch | OpenCode-centric |

### Best Skill by Situation

#### New Project Implementation

```
autopilot: describe requirements in detail and
get full implementation through testing automatically
```

#### Urgent Bug Fix

```
ralph: describe the bug and it will be found, fixed,
and verified automatically until completion
```

#### Token Shortage

```
eco: handle efficiently, or
eco + specific agent name for quality-critical work
```

#### Large-Scale Refactoring

```
hulw: leverage strengths of both Claude and OpenCode
for efficient processing
```

#### Simple Questions/Investigation

```
Regular mode (no skill activation needed)
```

---

## Auto-Activation Rules

### Automatic Mode Switching

OMCM suggests mode changes automatically under these conditions:

| Usage | Auto Suggestion |
|-------|-----------------|
| 70%+ | Recommend hulw or eco |
| 90%+ | Recommend switching to OpenCode-centric mode |

### Config-Based Auto-Activation

`~/.claude/plugins/omcm/config.json`:

```json
{
  "defaultExecutionMode": "ultrawork",
  "fusionDefault": false,
  "ecoDefaultThreshold": 70,
  "autoHandoff": false
}
```

---

## Troubleshooting

### Problem: Skill Not Activating

**Check**:
1. Is the keyword exactly included?
2. Is OMCM installed and activated?
3. Does the `~/.claude/plugins/omcm/` directory exist?

**Solution**:
```bash
# Verify OMCM installation
ls ~/.claude/plugins/omcm/

# Reconfigure plugin
/oh-my-claudecode:omc-setup
```

### Problem: Routing Error on Task Call

**Cause**: Missing OpenCode authentication

**Solution**:
```bash
# Check environment variables
echo $OPENAI_API_KEY
echo $GOOGLE_API_KEY

# Check config file
cat ~/.claude/plugins/omcm/config.json
```

### Problem: Ralph Loop Runs Indefinitely

**Cause**: Structural problem that cannot be fixed

**Solution**:
```
cancel --force
```

Then analyze the problem and start fresh.

### Problem: Token Savings Lower Than Expected

**Cause**: Complex tasks requiring Opus model

**Solutions**:
1. Provide more specific instructions
2. Break tasks into smaller units
3. Use `eco` skill for explicit savings request

---

## References

- [OMCM Main Documentation](/opt/oh-my-claude-money/README.md)
- [OMCM Configuration Guide](/opt/oh-my-claude-money/docs/en/CONFIGURATION.md)
- [OMCM Architecture](/opt/oh-my-claude-money/docs/en/ARCHITECTURE.md)
