# OMCM v1.0.0 설정 가이드

OMCM(oh-my-claude-money)의 완전한 설정 가이드입니다. 설정 파일, 스키마, 환경 변수, 훅 시스템을 상세히 설명합니다.

## 목차

1. [설정 파일](#설정-파일)
2. [설정 스키마](#설정-스키마)
3. [에이전트 매핑](#에이전트-매핑)
4. [라우팅 규칙](#라우팅-규칙)
5. [훅 설정](#훅-설정)
6. [환경 변수](#환경-변수)
7. [설정 예제](#설정-예제)
8. [문제 해결](#문제-해결)

---

## 설정 파일

### 1. 메인 설정: `~/.claude/plugins/omcm/config.json`

OMCM의 핵심 설정 파일입니다. Claude Code에서 액세스할 수 있으며 글로벌 범위에 적용됩니다.

**경로**: `~/.claude/plugins/omcm/config.json`

**설정 로드 메커니즘**:
```javascript
// 기본값과 사용자 설정 병합 (깊은 병합)
// 1. DEFAULT_CONFIG 로드
// 2. 사용자 설정이 있으면 병합
// 3. 없으면 기본값 사용
```

### 2. 프로바이더 제한: `~/.omcm/provider-limits.json`

각 프로바이더의 사용량 제한 및 현재 사용량을 추적합니다.

**경로**: `~/.omcm/provider-limits.json`

**구조**:
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

### 3. 퓨전 상태: `~/.omcm/fusion-state.json`

현재 퓨전 모드 상태 및 핸드오프 정보를 저장합니다.

**경로**: `~/.omcm/fusion-state.json`

**구조**:
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

## 설정 스키마

### 메인 설정 스키마

`~/.claude/plugins/omcm/config.json`의 전체 구조입니다.

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

### 옵션 상세 설명

#### 퓨전 모드 설정

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `fusionDefault` | boolean | false | 항상 퓨전 모드 사용 여부. true: 항상 퓨전, false: 사용량 기반 자동 전환 |
| `threshold` | number | 90 | Claude 사용량 전환 알림 임계치 (%) |
| `autoHandoff` | boolean | false | 임계치 도달 시 자동 전환 여부 (true면 자동, false면 알림만) |

**예제**:
```json
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false
}
```

#### 키워드 설정

Claude Code 프롬프트에서 감지할 키워드 목록입니다.

| 옵션 | 타입 | 기본값 |
|------|------|--------|
| `keywords` | string[] | ["opencode", "handoff", "전환", "switch to opencode", "opencode로", "오픈코드"] |

**동작**: 사용자 프롬프트에 키워드가 포함되면 전환 알림 또는 자동 전환이 발생합니다.

**예제**:
```json
{
  "keywords": [
    "opencode",
    "handoff",
    "전환",
    "switch to opencode",
    "opencode로",
    "오픈코드",
    "gemini",
    "gpt"
  ]
}
```

#### 라우팅 설정

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `routing.enabled` | boolean | true | 하이브리드 라우팅 활성화 |
| `routing.usageThreshold` | number | 70 | 이 사용량 이상이면 OpenCode 분배 증가 (%) |
| `routing.maxOpencodeWorkers` | number | 3 | 동시 OpenCode 서버 풀 최대 수 (1~25, 메모리 고려) |
| `routing.preferOpencode` | string[] | ["explore", "explore-medium", "researcher", "researcher-low", "writer"] | OpenCode 선호 에이전트 목록 |
| `routing.preferClaude` | string[] | ["architect", "executor-high", "critic", "planner"] | Claude 선호 에이전트 목록 |
| `routing.autoDelegate` | boolean | true | 자동 위임 활성화 |

**예제**:
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

#### 컨텍스트 설정

OpenCode로 전환할 때 전달할 컨텍스트 범위를 설정합니다.

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `context.includeRecentFiles` | boolean | true | 최근 수정 파일 포함 |
| `context.recentFilesLimit` | number | 10 | 최근 파일 최대 개수 |
| `context.includeTodos` | boolean | true | TODO 항목 포함 |
| `context.includeDecisions` | boolean | true | 결정 사항 포함 |
| `context.maxContextLength` | number | 50000 | 최대 컨텍스트 길이 (문자) |

**예제**:
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

#### OpenCode 실행 설정

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `opencode.command` | string | "opencode" | OpenCode 명령어 |
| `opencode.args` | string[] | [] | OpenCode 추가 인자 |
| `opencode.ultraworkByDefault` | boolean | true | OpenCode 호출 시 ulw 자동 추가 |
| `opencode.timeout` | number | 300000 | 타임아웃 (밀리초, 기본 5분) |

**예제**:
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

#### 알림 설정

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `notifications.showOnThreshold` | boolean | true | 임계치 도달 시 알림 표시 |
| `notifications.showOnKeyword` | boolean | true | 키워드 감지 시 알림 표시 |
| `notifications.quietMode` | boolean | false | 모든 알림 비활성화 |

**예제**:
```json
{
  "notifications": {
    "showOnThreshold": true,
    "showOnKeyword": true,
    "quietMode": false
  }
}
```

---

## 에이전트 매핑

### 목적

OMC 에이전트를 OpenCode 에이전트로 매핑하여 최적의 LLM으로 라우팅합니다.

### 파일 위치

- **예제**: `/opt/oh-my-claude-money/examples/agent-mapping.json`
- **실제 사용**: 커스텀 설정 시 `~/.omcm/agent-mapping.json`

### 스키마

```json
{
  "$schema": "https://omcm.dev/schemas/agent-mapping.json",
  "description": "에이전트 매핑 설정",
  "mappings": [
    {
      "source": ["agent1", "agent2"],
      "target": "opencode-agent",
      "provider": "opencode|claude|openai|google",
      "model": "model-name",
      "tier": "HIGH|MEDIUM|LOW",
      "reason": "설명"
    }
  ],
  "fallback": {
    "provider": "claude",
    "model": "sonnet"
  }
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `source` | string[] | ✓ | OMC 에이전트 이름 배열 (여러 에이전트를 하나로 매핑 가능) |
| `target` | string | ✓ | OpenCode 에이전트 이름 |
| `provider` | string | | 프로바이더: opencode, claude, openai, google |
| `model` | string | | 구체적인 모델 이름 |
| `tier` | string | | 티어 레벨: HIGH, MEDIUM, LOW |
| `reason` | string | | 매핑 이유 (문서화용) |

### 기본 매핑 규칙

```json
{
  "mappings": [
    {
      "source": ["architect", "architect-medium", "architect-low"],
      "target": "Oracle",
      "provider": "opencode",
      "model": "gpt-4",
      "tier": "HIGH",
      "reason": "아키텍처 분석은 GPT-4 Oracle에게 위임"
    },
    {
      "source": ["designer", "designer-high", "designer-low"],
      "target": "frontend-engineer",
      "provider": "opencode",
      "model": "gemini-pro",
      "tier": "MEDIUM",
      "reason": "UI/UX 작업은 Gemini Pro에게 위임"
    },
    {
      "source": ["researcher", "researcher-low"],
      "target": "Oracle",
      "provider": "opencode",
      "model": "gpt-4",
      "tier": "MEDIUM",
      "reason": "리서치 작업은 GPT-4 Oracle에게 위임"
    },
    {
      "source": ["explore", "explore-medium"],
      "target": "explore",
      "provider": "opencode",
      "model": "gemini-flash",
      "tier": "LOW",
      "reason": "빠른 탐색은 Gemini Flash에게 위임"
    },
    {
      "source": ["writer"],
      "target": "document-writer",
      "provider": "opencode",
      "model": "gemini-flash",
      "tier": "LOW",
      "reason": "문서 작성은 Gemini Flash에게 위임"
    }
  ],
  "fallback": {
    "provider": "claude",
    "model": "sonnet"
  }
}
```

### Fallback 설정

에이전트 매핑이 없는 경우 사용할 기본 프로바이더와 모델을 지정합니다.

```json
{
  "fallback": {
    "provider": "claude",
    "model": "sonnet"
  }
}
```

### 커스텀 매핑 설정

1. 매핑 파일 생성:
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
      "reason": "커스텀 에이전트 매핑"
    }
  ],
  "fallback": {
    "provider": "claude",
    "model": "sonnet"
  }
}
EOF
```

2. 설정 로드 확인:
```javascript
import { loadAgentMapping } from './src/router/mapping.mjs';
const mapping = loadAgentMapping('~/.omcm/agent-mapping.json');
console.log(mapping);
```

---

## 라우팅 규칙

### 목적

조건 기반 라우팅으로 특정 상황에서 자동으로 LLM을 선택합니다.

### 파일 위치

- **예제**: `/opt/oh-my-claude-money/examples/routing-rules.json`
- **실제 사용**: 커스텀 설정 시 `~/.omcm/routing-rules.json`

### 스키마

```json
{
  "$schema": "https://omcm.dev/schemas/routing-rules.json",
  "description": "라우팅 규칙 설정",
  "rules": [
    {
      "id": "rule-id",
      "condition": "조건식",
      "action": "prefer_opencode|force_opencode|prefer_claude|force_claude|block|default",
      "priority": 100,
      "description": "설명"
    }
  ]
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | ✓ | 규칙 고유 ID |
| `condition` | string | ✓ | 조건식 (JavaScript 표현식) |
| `action` | string | ✓ | 라우팅 동작 |
| `priority` | number | | 우선순위 (높을수록 먼저 실행) |
| `description` | string | | 규칙 설명 |

### 조건식 문법

조건식에서 사용 가능한 변수:

```javascript
// 사용량 정보
usage.fiveHour        // 5시간 사용량 (%)
usage.24hour          // 24시간 사용량 (%)
usage.weekly          // 주간 사용량 (%)

// 모드 정보
mode.ecomode          // Ecomode 활성화 여부
mode.fusion           // 퓨전 모드 활성화 여부

// 작업 정보
task.complexity       // 작업 복잡도 ("low", "medium", "high")
task.type             // 작업 타입
task.priority         // 작업 우선순위

// 에이전트 정보
agent.type            // 에이전트 타입
agent.tier            // 에이전트 티어 ("LOW", "MEDIUM", "HIGH")
agent.provider        // 현재 프로바이더

// 시간 정보
time.hour             // 현재 시간 (0-23)
time.dayOfWeek        // 요일 (0-6, 0=일요일)
```

### 라우팅 동작

| 동작 | 설명 |
|------|------|
| `prefer_opencode` | OpenCode를 우선하되 Claude도 가능 |
| `force_opencode` | 반드시 OpenCode 사용 |
| `prefer_claude` | Claude를 우선하되 OpenCode도 가능 |
| `force_claude` | 반드시 Claude 사용 |
| `block` | 이 작업 실행 차단 |
| `default` | 기본 라우팅 규칙 사용 |

### 기본 라우팅 규칙

```json
{
  "rules": [
    {
      "id": "high-usage-opencode",
      "condition": "usage.fiveHour > 90",
      "action": "prefer_opencode",
      "priority": 100,
      "description": "5시간 사용량 90% 초과 시 OpenCode 우선"
    },
    {
      "id": "weekly-limit-opencode",
      "condition": "usage.weekly > 85",
      "action": "prefer_opencode",
      "priority": 90,
      "description": "주간 사용량 85% 초과 시 OpenCode 우선"
    },
    {
      "id": "ecomode-active",
      "condition": "mode.ecomode == true",
      "action": "prefer_opencode",
      "priority": 95,
      "description": "Ecomode 활성화 시 OpenCode 우선"
    },
    {
      "id": "complex-task-claude",
      "condition": "task.complexity == 'high'",
      "action": "prefer_claude",
      "priority": 80,
      "description": "복잡한 작업은 Claude 우선"
    },
    {
      "id": "security-review-claude",
      "condition": "agent.type == 'security-reviewer'",
      "action": "prefer_claude",
      "priority": 85,
      "description": "보안 검토는 Claude 우선"
    },
    {
      "id": "planner-claude",
      "condition": "agent.type == 'planner'",
      "action": "force_claude",
      "priority": 88,
      "description": "전략적 계획은 반드시 Claude"
    },
    {
      "id": "critic-claude",
      "condition": "agent.type == 'critic'",
      "action": "force_claude",
      "priority": 88,
      "description": "플랜 비평은 반드시 Claude"
    },
    {
      "id": "low-usage-claude",
      "condition": "usage.fiveHour < 50",
      "action": "prefer_claude",
      "priority": 30,
      "description": "사용량 낮을 때 Claude 우선"
    }
  ]
}
```

### 커스텀 라우팅 규칙 설정

1. 규칙 파일 생성:
```bash
cat > ~/.omcm/routing-rules.json << 'EOF'
{
  "rules": [
    {
      "id": "custom-rule-1",
      "condition": "usage.fiveHour > 80 && agent.tier == 'LOW'",
      "action": "force_opencode",
      "priority": 110,
      "description": "높은 사용량 + LOW 티어 에이전트 = OpenCode 강제"
    },
    {
      "id": "custom-rule-2",
      "condition": "time.hour >= 9 && time.hour <= 17",
      "action": "prefer_claude",
      "priority": 50,
      "description": "업무 시간에는 Claude 우선"
    }
  ]
}
EOF
```

2. 규칙 로드 및 테스트:
```javascript
import { loadRoutingRules } from './src/router/rules.mjs';
const rules = loadRoutingRules('~/.omcm/routing-rules.json');
console.log(rules);
```

---

## 훅 설정

### 개요

Claude Code의 훅 시스템을 사용하여 특정 이벤트에서 OMCM 로직을 실행합니다.

### 파일 위치

`/root/.claude/plugins/marketplaces/omcm/hooks/hooks.json`

### 훅 타입 및 동작

#### 1. PreToolUse (Task 호출 전)

**목적**: Task 호출 전 퓨전 라우팅 검사

**실행**: `node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs`

**타임아웃**: 120초

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
          "statusMessage": "퓨전 라우팅 확인 중..."
        }
      ]
    }
  ]
}
```

**동작**:
- Task 호출 시 에이전트와 작업 타입 분석
- 라우팅 규칙에 따라 OpenCode 전환 여부 결정
- 필요 시 컨텍스트 내보내기

#### 2. UserPromptSubmit (사용자 입력 제출)

**목적**: 사용량 임계치 및 키워드 감지

**실행**: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/detect-handoff.mjs`

**타임아웃**: 5초

```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/detect-handoff.mjs",
          "timeout": 5,
          "statusMessage": "사용량 확인 중..."
        }
      ]
    }
  ]
}
```

**동작**:
- Claude 사용량 확인 (HUD 캐시에서)
- 임계치(기본 90%) 도달 시 알림/자동 전환
- 키워드 감지 시 알림 표시

#### 3. SessionStart (세션 시작)

**목적**: 세션 시작 시 사용량 정보 로드

**실행**: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/session-start.mjs`

**타임아웃**: 3초

```json
{
  "SessionStart": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/session-start.mjs",
          "timeout": 3,
          "statusMessage": "사용량 정보 로드 중..."
        }
      ]
    }
  ]
}
```

**동작**:
- oh-my-claudecode HUD 캐시 로드
- 현재 사용량 상태 확인
- 필요 시 경고 표시

#### 4. Stop (작업 중단)

**목적**: 활성 모드 추적

**실행**: `node ${CLAUDE_PLUGIN_ROOT}/src/hooks/persistent-mode.mjs`

**타임아웃**: 5초

```json
{
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/src/hooks/persistent-mode.mjs",
          "timeout": 5,
          "statusMessage": "활성 모드 확인 중..."
        }
      ]
    }
  ]
}
```

**동작**:
- 중단 전 활성 모드 확인
- hulw/ulw 상태 저장
- 세션 메타데이터 기록

### 전체 훅 설정

```json
{
  "description": "oh-my-claude-money - 사용량 관리 및 OpenCode 브릿지 훅",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/fusion-router.mjs",
            "timeout": 120,
            "statusMessage": "퓨전 라우팅 확인 중..."
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
            "statusMessage": "사용량 확인 중..."
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
            "statusMessage": "사용량 정보 로드 중..."
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
            "statusMessage": "활성 모드 확인 중..."
          }
        ]
      }
    ]
  }
}
```

### 커스텀 훅 추가

1. 훅 스크립트 작성:
```bash
cat > ~/.claude/plugins/omcm/hooks/custom-hook.mjs << 'EOF'
#!/usr/bin/env node
import { loadConfig } from '../src/utils/config.mjs';

const config = loadConfig();
console.log('Custom hook executed with config:', config.fusionDefault);
EOF

chmod +x ~/.claude/plugins/omcm/hooks/custom-hook.mjs
```

2. hooks.json에 추가:
```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/custom-hook.mjs",
          "timeout": 5,
          "statusMessage": "커스텀 훅 실행 중..."
        }
      ]
    }
  ]
}
```

---

## 환경 변수

### OMCM 관련 환경 변수

| 변수 | 설명 | 기본값 | 예제 |
|------|------|--------|------|
| `OMCM_BASE_PORT` | OpenCode 서버 풀 기본 포트 | 8000 | `export OMCM_BASE_PORT=8000` |
| `OMCM_MIN_SERVERS` | 최소 서버 인스턴스 수 | 1 | `export OMCM_MIN_SERVERS=1` |
| `OMCM_MAX_SERVERS` | 최대 서버 인스턴스 수 | 5 | `export OMCM_MAX_SERVERS=5` |
| `OMCM_FUSION_MODE` | 강제 퓨전 모드 | (없음) | `export OMCM_FUSION_MODE=hulw` |
| `OMCM_DEBUG` | 디버그 로깅 | false | `export OMCM_DEBUG=true` |
| `OMCM_CONFIG_DIR` | 설정 디렉토리 | `~/.omcm` | `export OMCM_CONFIG_DIR=$HOME/.omcm` |

### 프로바이더 API 키 (필수)

| 변수 | 설명 | 발급처 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Claude API 키 | https://console.anthropic.com/settings/keys |
| `OPENAI_API_KEY` | OpenAI API 키 | https://platform.openai.com/api-keys |
| `GOOGLE_API_KEY` | Google Gemini API 키 | https://aistudio.google.com/apikey |

### 환경 변수 설정

**임시 설정**:
```bash
export OMCM_BASE_PORT=9000
export OMCM_MAX_SERVERS=10
export ANTHROPIC_API_KEY="sk-ant-..."
opencode
```

**영구 설정** (~/.bashrc 또는 ~/.zshrc):
```bash
# OMCM 설정
export OMCM_BASE_PORT=8000
export OMCM_MIN_SERVERS=1
export OMCM_MAX_SERVERS=5
export OMCM_DEBUG=false

# 프로바이더 API 키
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

영구 설정 후 반영:
```bash
source ~/.bashrc  # bash 사용 시
source ~/.zshrc   # zsh 사용 시
```

### 서버 풀 포트 관리

OMCM은 OpenCode 서버 풀을 위해 연속적인 포트를 사용합니다.

**포트 할당**:
```
OMCM_BASE_PORT=8000, OMCM_MAX_SERVERS=5
└─ 8000, 8001, 8002, 8003, 8004
```

**충돌 방지**:
1. 사용 중인 포트 확인:
```bash
netstat -tuln | grep LISTEN
```

2. 포트 범위 변경:
```bash
export OMCM_BASE_PORT=9000  # 9000-9004 사용
```

---

## 설정 예제

### 예제 1: 기본 설정 (권장)

최소 설정으로 OMCM 사용:

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

**설정 저장**:
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

### 예제 2: 항상 퓨전 모드

모든 작업에서 OpenCode 퓨전 활성화:

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

### 예제 3: 자동 전환 모드

사용량 기반 자동 전환:

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

### 예제 4: 고급 설정 (대규모 병렬 작업)

대규모 병렬 작업 최적화:

```json
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false,
  "routing": {
    "enabled": true,
    "usageThreshold": 65,
    "maxOpencodeWorkers": 10,
    "preferOpencode": [
      "explore", "explore-medium", "explore-high",
      "researcher", "researcher-low",
      "designer", "designer-low",
      "writer", "vision"
    ],
    "preferClaude": [
      "architect", "architect-high",
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
    "command": "opencode",
    "args": ["--parallel"],
    "ultraworkByDefault": true,
    "timeout": 600000
  }
}
```

### 예제 5: 보안 우선 설정

보안 작업은 항상 Claude 사용:

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

## 문제 해결

### Q1: 설정 파일을 찾을 수 없음

**에러**: `Config file not found: ~/.claude/plugins/omcm/config.json`

**해결**:
```bash
# 디렉토리 생성
mkdir -p ~/.claude/plugins/omcm

# 기본 설정 파일 생성
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "fusionDefault": false,
  "threshold": 90
}
EOF
```

### Q2: 설정 변경이 적용되지 않음

**원인**: 설정 캐시

**해결**:
1. 설정 파일 수정
2. Claude Code 세션 재시작:
```bash
# 현재 세션 종료
# 새 터미널에서 다시 시작
claude
```

### Q3: OpenCode 서버 포트 충돌

**에러**: `Address already in use 0.0.0.0:8000`

**해결**:
```bash
# 포트 변경
export OMCM_BASE_PORT=9000

# 또는 설정에 추가
cat >> ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "opencode": {
    "basePort": 9000
  }
}
EOF
```

### Q4: 에이전트 매핑이 작동하지 않음

**확인 사항**:
1. 매핑 파일 유효성:
```bash
node -e "
import { validateAgentMapping } from './src/config/schema.mjs';
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('~/.omcm/agent-mapping.json', 'utf-8'));
const result = validateAgentMapping(data);
console.log(result);
"
```

2. 매핑 파일 경로 확인:
```bash
ls -la ~/.omcm/agent-mapping.json
```

### Q5: 라우팅 규칙 조건식 오류

**에러**: `Invalid condition: usage.fiveHour > 90`

**해결**: 조건식 문법 확인
- 유효한 변수만 사용: `usage.*`, `mode.*`, `task.*`, `agent.*`, `time.*`
- JavaScript 표현식 사용: `&&`, `||`, `>`, `<`, `==`, `!=`
- 문자열은 큰따옴표: `"high"`, `"medium"`

```json
{
  "condition": "usage.fiveHour > 90 && task.complexity == 'high'"
}
```

### Q6: 컨텍스트가 너무 길어서 전송 실패

**해결**:
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

### Q7: 퓨전 모드가 자동 전환되지 않음

**확인**:
1. 임계치 확인:
```bash
# 현재 사용량 확인 (oh-my-claudecode HUD)
# ~/.cache/omc/hud-cache.json 확인
cat ~/.cache/omc/hud-cache.json | jq '.usage'
```

2. autoHandoff 설정 확인:
```bash
cat ~/.claude/plugins/omcm/config.json | jq '.autoHandoff'
```

3. 활성화:
```bash
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "autoHandoff": true,
  "threshold": 90
}
EOF
```

### Q8: 훅이 실행되지 않음

**확인**:
1. 훅 파일 존재 확인:
```bash
ls -la ~/.claude/plugins/omcm/hooks/
ls -la ~/.claude/plugins/omcm/src/hooks/
```

2. 훅 권한 확인:
```bash
chmod +x ~/.claude/plugins/omcm/hooks/*.mjs
chmod +x ~/.claude/plugins/omcm/src/hooks/*.mjs
```

3. Claude Code 재시작:
```bash
# 현재 세션 종료 후 재시작
claude
```

---

## 참고

- [CLAUDE.md](/CLAUDE.md) - OMCM 프로젝트 규칙
- [README.md](/README.md) - 사용 가이드 및 빠른 시작
- [CHANGELOG.md](/CHANGELOG.md) - 버전별 변경사항
- [예제 파일](../examples/) - agent-mapping.json, routing-rules.json
