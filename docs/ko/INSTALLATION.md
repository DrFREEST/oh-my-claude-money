# OMCM v1.0.0 설치 가이드

> **oh-my-claude-money** - Claude Code ↔ OpenCode 퓨전 오케스트레이터

<div align="center">

**Claude 토큰 62% 절약 | 멀티 프로바이더 자동 라우팅 | 실시간 추적**

</div>

---

## 목차

- [사전 요구사항](#사전-요구사항)
- [빠른 설치 - 30초](#빠른-설치---30초)
- [단계별 설치](#단계별-설치)
- [설치 확인](#설치-확인)
- [트러블슈팅](#트러블슈팅)
- [제거](#제거)

---

## 사전 요구사항

OMCM을 설치하기 전에 다음을 확인하세요.

### 1. Node.js 18+ 필수

```bash
node --version
# v18.0.0 이상 필요
```

Node.js가 없으면 [공식 사이트](https://nodejs.org)에서 설치하세요.

### 2. Claude Code CLI

Claude Code CLI가 설치되어 있어야 합니다.

```bash
claude --version
```

없으면 다음으로 설치:

```bash
npm install -g @anthropic-ai/claude-code
```

또는 공식 설치 스크립트:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### 3. oh-my-claudecode (OMC) 플러그인

OMCM은 oh-my-claudecode 위에서 동작합니다.

```bash
# Claude Code에서 다음 명령어 실행
claude
/oh-my-claudecode:omc-setup
```

또는 GitHub에서 직접 설치:

```bash
git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git \
  ~/.claude/plugins/local/oh-my-claudecode
```

### 4. OpenCode CLI

OpenCode가 설치되어 있어야 합니다.

```bash
opencode --version
```

없으면 다음으로 설치:

```bash
# npm으로 설치 (권장)
npm install -g opencode-ai@latest

# 또는 공식 설치 스크립트
curl -fsSL https://opencode.ai/install | bash
```

**macOS (Homebrew):**

```bash
brew install opencode
```

### 5. 프로바이더 API 키

OMCM은 다음 프로바이더를 지원합니다.

**필수 선택:**
- **OpenAI** (GPT-5.2 사용) 또는
- **Google** (Gemini 사용) 또는
- 둘 다 설정하기 (권장)

각 프로바이더 API 키 발급:

| 프로바이더 | 키 발급 페이지 | 변수명 |
|-----------|---------------|--------|
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` |
| **Google** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `GOOGLE_API_KEY` |
| **Anthropic** | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | `ANTHROPIC_API_KEY` |

---

## 빠른 설치 - 30초

### 방법 1: 원클릭 설치 스크립트 (권장)

```bash
# 자동 확인 모드 (모든 프롬프트에 yes 응답)
curl -fsSL https://raw.githubusercontent.com/DrFREEST/oh-my-claude-money/main/install.sh | bash -s -- --yes

# 또는 수동 확인 모드 (각 단계마다 확인)
curl -fsSL https://raw.githubusercontent.com/DrFREEST/oh-my-claude-money/main/install.sh | bash
```

### 방법 2: 로컬 리포지토리에서 설치

```bash
git clone https://github.com/DrFREEST/oh-my-claude-money.git
cd oh-my-claude-money
./install.sh
```

### 설치 스크립트가 수행하는 작업

- ✅ Claude Code CLI 설치/확인
- ✅ oh-my-claudecode 플러그인 설치/확인
- ✅ OpenCode CLI 설치/확인
- ✅ oh-my-opencode 설정
- ✅ oh-my-claude-money 플러그인 설치
- ✅ Claude Code Hooks 설정
- ✅ HUD 파일 복사
- ✅ 글로벌 상태 파일 초기화

---

## 단계별 설치

설치 스크립트 없이 수동으로 설치하려면 이 과정을 따르세요.

### Step 1: Claude Code CLI 확인

```bash
claude --version
# 설치되지 않았으면:
npm install -g @anthropic-ai/claude-code
```

새 터미널을 열어 PATH 반영을 확인하세요.

```bash
hash -r
claude --version
```

### Step 2: oh-my-claudecode 플러그인 설정

새 터미널에서 Claude Code 실행:

```bash
claude
```

Claude Code 프롬프트에서 다음 명령어 입력:

```
/oh-my-claudecode:omc-setup
```

이 과정에서:
- `~/.claude/CLAUDE.md`에 OMC 지시사항 추가
- OMC HUD 설정
- 플러그인 빌드 (자동)

완료될 때까지 기다린 후 계속하세요.

### Step 3: OpenCode CLI 설치

새 터미널에서:

```bash
# npm으로 설치
npm install -g opencode-ai@latest

# 또는 공식 스크립트
curl -fsSL https://opencode.ai/install | bash

# 설치 확인
opencode --version
```

PATH 반영을 위해 새 터미널을 열어 확인하세요.

```bash
hash -r
opencode --version
```

### Step 4: OpenCode 프로바이더 인증

OpenCode에서 GPT/Gemini를 사용하려면 프로바이더 인증이 필요합니다.

#### 방법 A: 대화형 로그인 (권장)

```bash
opencode auth login
```

프롬프트에 따라:
1. 사용할 프로바이더 선택 (OpenAI, Google, Anthropic)
2. 해당 프로바이더의 로그인 또는 API 키 입력

**여러 프로바이더 사용 시 각각 개별 실행:**

```bash
opencode auth login  # 메뉴에서 OpenAI 선택
opencode auth login  # 메뉴에서 Google 선택
```

#### 방법 B: 환경 변수

API 키를 환경 변수로 설정:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

**영구 저장 (선택):**

```bash
# ~/.bashrc 또는 ~/.zshrc에 추가
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.bashrc
echo 'export GOOGLE_API_KEY="..."' >> ~/.bashrc
source ~/.bashrc
```

#### 인증 상태 확인

```bash
opencode auth status
```

출력 예:

```
✅ OpenAI (gpt-5.2, gpt-5.2-codex)
✅ Google (gemini-3.0-pro, gemini-3.0-flash)
❌ Anthropic (not configured)
```

### Step 5: oh-my-claude-money 플러그인 설치

#### 방법 A: GitHub에서 직접 설치 (권장)

```bash
# 플러그인 디렉토리 생성
mkdir -p ~/.claude/plugins/local

# oh-my-claude-money 클론
git clone https://github.com/DrFREEST/oh-my-claude-money.git \
  ~/.claude/plugins/local/oh-my-claude-money

# 또는 이미 마켓플레이스에 있으면:
# ~/.claude/plugins/marketplaces/omcm/
```

#### 방법 B: 홈 디렉토리에 설치

```bash
# 저장소 다운로드
mkdir -p ~/.local/share
git clone https://github.com/DrFREEST/oh-my-claude-money.git \
  ~/.local/share/oh-my-claude-money

# 심볼릭 링크 생성
ln -sf ~/.local/share/oh-my-claude-money \
  ~/.claude/plugins/local/oh-my-claude-money
```

### Step 6: Claude Code에 플러그인 등록

#### 6-1. settings.json 설정

```bash
~/.claude/settings.json 파일 편집:

{
  "enabledPlugins": {
    "oh-my-claude-money@local": true
  }
}
```

#### 6-2. installed_plugins.json 등록

```bash
~/.claude/plugins/installed_plugins.json 편집:

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

#### 6-3. Hooks 설정

```bash
~/.claude/settings.json에 hooks 추가:

{
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

### Step 7: OMCM 퓨전 셋업

Claude Code에서:

```bash
claude
```

Claude Code 프롬프트에서:

```
/omcm:fusion-setup
```

이 명령어가 다음을 자동으로 수행합니다:

- ✅ 모든 의존성 확인
- ✅ OMC HUD wrapper 생성
- ✅ OMCM HUD 설정
- ✅ HUD 캐시 초기화
- ✅ 퓨전 설정 파일 생성
- ✅ CLAUDE.md에 퓨전 지시사항 추가
- ✅ OpenCode 서버 풀 시작 (선택)

### Step 8: 글로벌 상태 파일 초기화 (수동 설치용)

다음 파일들을 `~/.omcm/` 디렉토리에 생성:

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

## 설치 확인

### 1. 모든 컴포넌트 버전 확인

```bash
# Claude Code
claude --version

# oh-my-claudecode (Claude Code 내에서)
claude
/oh-my-claudecode:version

# OpenCode
opencode --version

# OpenCode 프로바이더
opencode auth status
```

### 2. 파일 구조 확인

```bash
# 플러그인 설치 경로
ls -la ~/.claude/plugins/local/oh-my-claude-money/

# 또는 마켓플레이스 경로
ls -la ~/.claude/plugins/marketplaces/omcm/

# 설정 파일
ls -la ~/.claude/plugins/omcm/config.json
ls -la ~/.omcm/fusion-state.json

# HUD 파일
ls -la ~/.claude/hud/omcm-hud.mjs
```

### 3. 퓨전 기능 테스트

Claude Code에서:

```bash
claude
```

다음 명령어로 테스트:

```
/omcm:fusion-setup
```

설정이 완료되면 다음과 같이 사용:

```
hulw: 간단한 테스트 작업을 수행해줘
```

**예상 출력:**
- 퓨전 라우팅이 활성화됨
- OpenCode 에이전트가 일부 작업 수행
- 토큰 절약 메트릭 표시

### 4. HUD 토큰 추적 확인

Claude Code 상태 라인에서 프로바이더별 토큰 사용량 표시:

```
C:1.2k↓ 567↑|O:25.8k↓ 9↑|G:165.3k↓ 1.4k↑
```

| 기호 | 의미 |
|------|------|
| `C:` | Claude (Cyan) |
| `O:` | OpenAI (Green) |
| `G:` | Gemini (Yellow) |
| `↓` | Input tokens |
| `↑` | Output tokens |

---

## 트러블슈팅

### 설치 관련 문제

#### "Claude Code not found"

```bash
# PATH 갱신
hash -r

# Claude Code 재설치
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code

# 새 터미널에서 확인
claude --version
```

#### "oh-my-claudecode plugin not found"

```bash
# 플러그인 수동 설치
git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git \
  ~/.claude/plugins/local/oh-my-claudecode

# Claude Code에서 setup 실행
claude
/oh-my-claudecode:omc-setup
```

#### "OpenCode not found"

```bash
# PATH 갱신
hash -r

# OpenCode 재설치
npm uninstall -g opencode-ai
npm install -g opencode-ai@latest

# 새 터미널에서 확인
opencode --version
```

### 인증 관련 문제

#### "OpenCode 프로바이더 인증 실패"

```bash
# 인증 상태 확인
opencode auth status

# 프로바이더 재인증
opencode auth login

# 특정 프로바이더만 인증
opencode auth login openai
opencode auth login google
```

#### "API 키 오류"

환경 변수 확인:

```bash
echo $OPENAI_API_KEY
echo $GOOGLE_API_KEY
echo $ANTHROPIC_API_KEY
```

API 키가 비어있으면 설정:

```bash
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."
```

### HUD/플러그인 문제

#### "HUD가 표시되지 않음"

```bash
# HUD 파일 확인
ls -la ~/.claude/hud/omcm-hud.mjs

# 권한 확인
chmod +x ~/.claude/hud/omcm-hud.mjs

# settings.json 확인
grep "statusLine" ~/.claude/settings.json

# OMC 플러그인 빌드 확인
ls ~/.claude/plugins/cache/omc/oh-my-claudecode/*/dist/hud/index.js
```

HUD 파일이 없으면 수동 생성:

```bash
mkdir -p ~/.claude/hud

cat > ~/.claude/hud/omcm-hud.mjs << 'EOF'
#!/usr/bin/env node
import { spawn } from 'child_process';

const HUD_PATHS = [
  process.env.HOME + '/.claude/plugins/marketplaces/omcm/src/hud/omcm-hud.mjs',
  '/opt/oh-my-claude-money/src/hud/omcm-hud.mjs'
];

let hudPath = null;
for (const p of HUD_PATHS) {
  try { if (require('fs').existsSync(p)) { hudPath = p; break; } } catch {}
}

if (!hudPath) {
  const omcHud = process.env.HOME + '/.claude/hud/omc-hud.mjs';
  spawn('node', [omcHud], { stdio: 'inherit' });
  process.exit(0);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const child = spawn('node', [hudPath], {
    stdio: ['pipe', 'inherit', 'inherit']
  });
  child.stdin.write(input);
  child.stdin.end();
});
EOF

chmod +x ~/.claude/hud/omcm-hud.mjs
```

#### "OMC 플러그인 미빌드"

```bash
# 최신 플러그인 버전 찾기
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ | sort -V | tail -1)

# 플러그인 디렉토리 이동
cd ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION

# 빌드 실행
npm install --silent
npm run build --silent

# 확인
ls dist/hud/index.js
```

### 퓨전 기능 문제

#### "퓨전 라우팅이 작동하지 않음"

```bash
# 퓨전 설정 확인
cat ~/.claude/plugins/omcm/config.json

# hooks 설정 확인
grep -A 5 "PreToolUse" ~/.claude/settings.json

# 수동 재설정
claude
/omcm:fusion-setup
```

#### "OpenCode 서버 연결 실패"

```bash
# 서버 포트 확인
lsof -i :4096

# 서버 상태 확인
ps aux | grep opencode

# 서버 수동 시작
opencode serve --port 4096

# 또는 OMCM 서버 풀 시작
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh start
```

### 성능 최적화

#### OpenCode 서버 풀 설정

```bash
# 서버 풀 시작
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh start

# 상태 확인
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh status

# 로그 확인
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh logs

# 서버 중지
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh stop
```

#### 최대 워커 수 조정

`~/.claude/plugins/omcm/config.json` 편집:

```json
{
  "routing": {
    "maxOpencodeWorkers": 5
  }
}
```

값 범위: 1~25 (메모리 고려, ~250MB/서버)

---

## 제거

### 완전 제거

```bash
# 플러그인 제거
rm -rf ~/.claude/plugins/local/oh-my-claude-money
rm -rf ~/.claude/plugins/marketplaces/omcm

# 설정 제거
rm -rf ~/.claude/plugins/omcm
rm -rf ~/.omcm

# HUD 파일 제거
rm ~/.claude/hud/omcm-hud.mjs

# settings.json 정리 (선택)
# ~/.claude/settings.json에서 OMCM 관련 설정 제거
```

### 부분 제거 (설정 유지)

```bash
# 플러그인만 제거 (설정/데이터 유지)
rm -rf ~/.claude/plugins/local/oh-my-claude-money
```

### 제거 스크립트

저장소에 포함된 제거 스크립트 사용 (선택):

```bash
/opt/oh-my-claude-money/uninstall.sh
# 또는
~/.claude/plugins/local/oh-my-claude-money/uninstall.sh
```

---

## 다음 단계

설치 완료 후:

### 1. 기본 사용법 학습

```bash
claude

# 다음 명령어 실행:
/omcm:hulw 간단한 테스트 작업
```

### 2. 퓨전 모드 설정

```
# 항상 퓨전 모드 활성화
/omcm:fusion-default-on

# 또는 사용량 기반 자동 전환 (기본)
/omcm:fusion-default-off
```

### 3. 추가 문서 읽기

- [README.md](../README.md) - 전체 개요 및 기능
- [CONFIGURATION.md](./CONFIGURATION.md) - 상세 설정 옵션
- [USAGE.md](./USAGE.md) - 사용 예제 및 팁

---

## 지원

문제가 발생하면:

1. **문서 확인**: 위의 트러블슈팅 섹션 참조
2. **GitHub Issues**: [DrFREEST/oh-my-claude-money/issues](https://github.com/DrFREEST/oh-my-claude-money/issues)
3. **논의 포럼**: [GitHub Discussions](https://github.com/DrFREEST/oh-my-claude-money/discussions)

---

## 라이선스

MIT License - 자세한 내용은 [LICENSE](../LICENSE) 파일 참조

---

## 버전

- **OMCM**: v1.0.0
- **최소 Node.js**: 18+
- **최소 Claude Code**: latest
- **최소 OpenCode**: latest

---

**설치 완료! 이제 `hulw` 키워드로 퓨전 모드를 사용할 수 있습니다.**

```bash
claude
hulw: 이제 퓨전 모드 테스트!
```
