---
description: oh-my-claude-money 퓨전 플러그인 완전 셋업
---

# oh-my-claude-money 퓨전 셋업

Claude Code ↔ OpenCode 퓨전 오케스트레이터를 설정합니다.

**이 스킬은 모든 의존성을 자동으로 체크하고 순차적으로 설정합니다.**

---

## 의존성 체크 플로우

다음 순서로 의존성을 확인하고 설정합니다:

```
[1] Claude Code CLI → [2] OMC Setup → [3] OpenCode CLI → [4] OpenCode 인증 → [5] Fusion 설정
```

---

## Step 1: Claude Code CLI 확인

```bash
claude --version 2>/dev/null && echo "✅ Claude Code 설치됨" || echo "❌ Claude Code 미설치"
```

### ❌ 미설치 시

Claude Code CLI를 먼저 설치하세요:

```bash
# npm으로 설치
npm install -g @anthropic-ai/claude-code

# 또는 공식 설치 스크립트
curl -fsSL https://claude.ai/install.sh | bash
```

설치 후 다시 `/omcm:fusion-setup` 실행하세요.

### ✅ 설치됨 → Step 2로 진행

---

## Step 2: oh-my-claudecode (OMC) 설정 확인

**OMCM은 OMC 위에서 동작합니다.** OMC가 설정되어 있어야 HUD, 에이전트 등이 작동합니다.

```bash
# OMC 설정 상태 종합 체크
OMC_OK=true

# 1. CLAUDE.md에 OMC 섹션 확인
if grep -q "oh-my-claudecode" ~/.claude/CLAUDE.md 2>/dev/null; then
  echo "✅ CLAUDE.md OK"
else
  echo "❌ CLAUDE.md 미설정"
  OMC_OK=false
fi

# 2. HUD 스크립트 확인
if [ -f ~/.claude/hud/omc-hud.mjs ]; then
  echo "✅ HUD OK"
else
  echo "❌ HUD 미설정"
  OMC_OK=false
fi

# 3. settings.json statusLine 확인
if grep -q "statusLine" ~/.claude/settings.json 2>/dev/null; then
  echo "✅ statusLine OK"
else
  echo "❌ statusLine 미설정"
  OMC_OK=false
fi

# 4. 플러그인 빌드 확인
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ 2>/dev/null | sort -V | tail -1)
if [ -n "$PLUGIN_VERSION" ] && [ -f ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION/dist/hud/index.js ]; then
  echo "✅ Plugin Build OK"
else
  echo "❌ Plugin 미빌드"
  OMC_OK=false
fi

echo ""
if [ "$OMC_OK" = true ]; then
  echo "✅ OMC 설정 완료됨 - Step 3로 진행"
else
  echo "❌ OMC 설정 필요"
fi
```

### ❌ OMC 미설정 시

**AskUserQuestion으로 사용자에게 물어보세요:**

> OMC(oh-my-claudecode) 설정이 필요합니다. 지금 설정하시겠습니까?
> - **예, 설정하기** → `/oh-my-claudecode:omc-setup` 스킬 호출
> - **아니오, 나중에** → fusion-setup 중단

"예" 선택 시:
1. `/oh-my-claudecode:omc-setup` 스킬을 호출하세요
2. omc-setup 완료 후 자동으로 Step 3로 계속 진행

### ✅ OMC 설정됨 → Step 3로 진행

---

## Step 3: OpenCode CLI 확인

```bash
command -v opencode && opencode --version 2>/dev/null && echo "✅ OpenCode 설치됨" || echo "❌ OpenCode 미설치"
```

### ❌ 미설치 시

OpenCode CLI를 설치하세요:

```bash
# npm으로 설치
npm install -g @anthropic-ai/opencode

# 또는 공식 설치 스크립트
curl -fsSL https://opencode.ai/install.sh | bash
```

설치 후 자동으로 Step 4로 진행합니다.

### ✅ 설치됨 → Step 4로 진행

---

## Step 4: OpenCode 프로바이더 인증 확인

```bash
# 인증된 프로바이더 목록 확인
opencode auth list 2>/dev/null

# 필수 프로바이더 체크
AUTH_OK=true

if opencode auth list 2>/dev/null | grep -q "OpenAI"; then
  echo "✅ OpenAI 인증됨"
else
  echo "❌ OpenAI 미인증"
  AUTH_OK=false
fi

if opencode auth list 2>/dev/null | grep -q "Google"; then
  echo "✅ Google 인증됨"
else
  echo "❌ Google 미인증"
  AUTH_OK=false
fi

echo ""
if [ "$AUTH_OK" = true ]; then
  echo "✅ 프로바이더 인증 완료 - Step 5로 진행"
else
  echo "❌ 프로바이더 인증 필요"
fi
```

### ❌ 미인증 시

**AskUserQuestion으로 사용자에게 물어보세요:**

> OpenCode 프로바이더 인증이 필요합니다. 어떤 프로바이더를 설정하시겠습니까?
> - **OpenAI** → `opencode auth login openai` 실행 안내
> - **Google (Gemini)** → `opencode auth login google` 실행 안내
> - **둘 다** → 순차적으로 둘 다 설정
> - **건너뛰기** → 경고와 함께 Step 5로 진행

인증 명령어:
```bash
# OpenAI 인증 (OAuth 또는 API 키)
opencode auth login openai

# Google 인증 (OAuth)
opencode auth login google
```

### ✅ 인증됨 → Step 5로 진행

---

## Step 5: Fusion 설정 완료

모든 의존성이 충족되었습니다. 퓨전 설정을 완료합니다.

### 5-1. HUD 캐시 초기화 및 OMCM-HUD 전환

HUD 캐시를 초기화하고 OMC-HUD에서 OMCM-HUD로 전환합니다:

```bash
# HUD 캐시 디렉토리 초기화
rm -rf ~/.claude/.omc/hud-cache 2>/dev/null
rm -f ~/.claude/.omc/hud-config.json 2>/dev/null
rm -f ~/.claude/.omc/hud-state.json 2>/dev/null

# OMCM HUD 캐시 초기화
rm -rf ~/.omcm/hud-cache 2>/dev/null
rm -f ~/.omcm/hud-state.json 2>/dev/null

# 캐시 디렉토리 재생성
mkdir -p ~/.claude/.omc
mkdir -p ~/.omcm

echo "✅ HUD 캐시 초기화 완료"
```

**OMCM-HUD Wrapper 설치:**

OMCM-HUD는 OMC-HUD를 래핑하고 퓨전 메트릭을 추가합니다:

```bash
# OMCM HUD wrapper 생성
cat > ~/.claude/hud/omcm-hud.mjs << 'EOF'
#!/usr/bin/env node
// OMCM HUD Wrapper - 원본 소스를 직접 실행
import { spawn } from 'child_process';

// OMCM HUD 경로 (마켓플레이스 또는 개발 경로)
const HUD_PATHS = [
  process.env.HOME + '/.claude/plugins/marketplaces/omcm/src/hud/omcm-hud.mjs',
  '/opt/oh-my-claude-money/src/hud/omcm-hud.mjs'
];

let hudPath = null;
for (const p of HUD_PATHS) {
  try { if (require('fs').existsSync(p)) { hudPath = p; break; } } catch {}
}

if (!hudPath) {
  // Fallback: OMC HUD 실행
  const omcHud = process.env.HOME + '/.claude/hud/omc-hud.mjs';
  const child = spawn('node', [omcHud], { stdio: 'inherit' });
  process.exit(0);
}

// stdin을 원본 HUD로 파이프
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
echo "✅ OMCM HUD wrapper 설치 완료"
```

**settings.json 업데이트 (omc-hud → omcm-hud):**

`~/.claude/settings.json`의 `statusLine`을 OMCM-HUD로 변경하세요:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/hud/omcm-hud.mjs"
  }
}
```

Edit 도구를 사용하여 `omc-hud.mjs`를 `omcm-hud.mjs`로 변경하세요.

### 5-2. 퓨전 설정 파일 생성

```bash
# 설정 디렉토리 생성
mkdir -p ~/.claude/plugins/omcm

# fusionDefault 활성화
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "fusionDefault": true,
  "threshold": 90,
  "autoHandoff": false,
  "serverPort": 4096
}
EOF

echo "✅ 퓨전 설정 파일 생성 완료"
```

### 5-3. CLAUDE.md에 퓨전 지시사항 추가

`~/.claude/CLAUDE.md` 파일 끝에 다음 내용을 **추가**하세요:

```markdown
---

# oh-my-claude-money - 퓨전 오케스트레이터

## 퓨전 에이전트 매핑

Claude 토큰 절약을 위해 다음 에이전트들은 OpenCode로 라우팅됩니다:

| OMC 에이전트 | OpenCode 에이전트 | 모델 |
|-------------|------------------|------|
| architect, architect-medium, architect-low | Oracle | GPT |
| designer, designer-high, designer-low | Frontend Engineer | Gemini |
| researcher, researcher-low | Oracle | GPT |
| vision | Multimodal Looker | Gemini |
| analyst | Oracle | GPT |
| scientist, scientist-low, scientist-high | Oracle | GPT |
| code-reviewer, code-reviewer-low | Oracle | GPT |
| security-reviewer, security-reviewer-low | Oracle | GPT |

## 퓨전 모드 활성화

사용량이 높거나 토큰 절약이 필요할 때:
- `hulw: <작업>` - 하이브리드 울트라워크 (자동 퓨전)
- `fusion: <작업>` - 명시적 퓨전 모드

## 자동 전환 조건

다음 조건에서 OpenCode로 자동 전환 제안:
- 5시간 사용량 90% 이상
- 주간 사용량 90% 이상
- "opencode", "전환", "handoff" 키워드 감지
```

### 5-4. 서버 풀 시작 (선택)

**AskUserQuestion으로 사용자에게 물어보세요:**

> 서버 풀을 지금 시작하시겠습니까? (Cold boot 최소화)
> - **예, 시작하기** → 서버 풀 시작
> - **아니오, 나중에** → 건너뛰기

"예" 선택 시:
```bash
# 서버 풀 시작 스크립트 실행
if [ -f ~/.claude/plugins/marketplaces/omcm/scripts/start-server-pool.sh ]; then
  ~/.claude/plugins/marketplaces/omcm/scripts/start-server-pool.sh start
elif [ -f /opt/oh-my-claude-money/scripts/start-server-pool.sh ]; then
  /opt/oh-my-claude-money/scripts/start-server-pool.sh start
else
  echo "서버 풀 스크립트를 찾을 수 없습니다"
fi
```

---

## 설정 완료!

모든 의존성 설정이 완료되었습니다.

### 확인 메시지

> **oh-my-claude-money 퓨전 셋업 완료!**
>
> | 항목 | 상태 |
> |------|------|
> | Claude Code CLI | ✅ |
> | oh-my-claudecode | ✅ |
> | OpenCode CLI | ✅ |
> | 프로바이더 인증 | ✅ |
> | 퓨전 설정 | ✅ |
>
> **사용 방법:**
> - `hulw: <작업>` - 하이브리드 울트라워크
> - `ulw: <작업>` - 사용량 기반 자동 퓨전
> - `/omcm:fusion-default-on` - 퓨전 기본값 활성화
> - `/omcm:fusion-default-off` - 퓨전 기본값 비활성화

---

## 트러블슈팅

### OMC 플러그인 빌드 오류
```bash
# 플러그인 디렉토리로 이동 후 빌드
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ | sort -V | tail -1)
cd ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION
npm install
```

### OpenCode 서버 연결 실패
```bash
# 포트 확인
lsof -i :4096

# 수동 시작
opencode serve --port 4096
```

### 퓨전 라우팅이 느림
- 서버 풀이 실행 중인지 확인: `~/.claude/plugins/marketplaces/omcm/scripts/start-server-pool.sh status`
- 서버 미실행 시 cold boot 발생 (10-15초)
