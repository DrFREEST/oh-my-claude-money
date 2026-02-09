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

## Step 2: oh-my-claudecode (OMC) 설정 확인 및 자동 설정

**OMCM은 OMC 위에서 동작합니다.** OMC가 설정되어 있어야 HUD, 에이전트 등이 작동합니다.

**⚠️ 중요: 이 단계에서 OMC 의존성을 직접 해결합니다. 별도로 `/omc-setup` 실행이 필요하지 않습니다.**

### 2-1. OMC 상태 확인

```bash
# OMC 설정 상태 종합 체크
OMC_OK=true
NEEDS_BUILD=false

# 1. CLAUDE.md에 OMC 섹션 확인
if grep -q "oh-my-claudecode" ~/.claude/CLAUDE.md 2>/dev/null; then
  echo "✅ CLAUDE.md OK"
else
  echo "⚠️ CLAUDE.md 미설정 (자동 설정 예정)"
  OMC_OK=false
fi

# 2. HUD 스크립트 확인
if [ -f ~/.claude/hud/omc-hud.mjs ]; then
  echo "✅ HUD wrapper OK"
else
  echo "⚠️ HUD wrapper 미설정 (자동 설정 예정)"
  OMC_OK=false
fi

# 3. settings.json statusLine 확인
if grep -q "statusLine" ~/.claude/settings.json 2>/dev/null; then
  echo "✅ statusLine OK"
else
  echo "⚠️ statusLine 미설정 (자동 설정 예정)"
  OMC_OK=false
fi

# 4. 플러그인 빌드 확인 (핵심!)
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ 2>/dev/null | sort -V | tail -1)
if [ -n "$PLUGIN_VERSION" ] && [ -f ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION/dist/hud/index.js ]; then
  echo "✅ Plugin Build OK"
else
  echo "⚠️ Plugin 미빌드 (자동 빌드 예정)"
  NEEDS_BUILD=true
  OMC_OK=false
fi

echo ""
if [ "$OMC_OK" = true ]; then
  echo "✅ OMC 설정 완료됨 - Step 3로 진행"
else
  echo "🔧 OMC 자동 설정을 시작합니다..."
fi
```

### 2-2. OMC 자동 설정 (미설정 시 자동 실행)

**OMC가 미설정인 경우, 다음을 순차적으로 자동 실행합니다:**

#### A. OMC HUD Wrapper 생성 (없는 경우)

```bash
# HUD 디렉토리 생성
mkdir -p ~/.claude/hud

# omc-hud.mjs wrapper 생성 (없는 경우에만)
if [ ! -f ~/.claude/hud/omc-hud.mjs ]; then
  cat > ~/.claude/hud/omc-hud.mjs << 'HUDEOF'
#!/usr/bin/env node
/**
 * OMC HUD - Statusline Script
 * Wrapper that imports from plugin cache or development paths
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

async function main() {
  const home = homedir();

  // 1. Try plugin cache first (marketplace: omc, plugin: oh-my-claudecode)
  const pluginCacheBase = join(home, ".claude/plugins/cache/omc/oh-my-claudecode");
  if (existsSync(pluginCacheBase)) {
    try {
      const versions = readdirSync(pluginCacheBase);
      if (versions.length > 0) {
        const latestVersion = versions.sort().reverse()[0];
        const pluginPath = join(pluginCacheBase, latestVersion, "dist/hud/index.js");
        if (existsSync(pluginPath)) {
          await import(pluginPath);
          return;
        }
      }
    } catch { /* continue */ }
  }

  // 2. Development paths
  const devPaths = [
    join(home, "Workspace/oh-my-claude-sisyphus/dist/hud/index.js"),
    join(home, "workspace/oh-my-claude-sisyphus/dist/hud/index.js"),
    join(home, "Workspace/oh-my-claudecode/dist/hud/index.js"),
    join(home, "workspace/oh-my-claudecode/dist/hud/index.js"),
  ];

  for (const devPath of devPaths) {
    if (existsSync(devPath)) {
      try {
        await import(devPath);
        return;
      } catch { /* continue */ }
    }
  }

  // 3. Fallback - OMCM이 처리하므로 빈 출력
  console.log("[OMC]");
}

main();
HUDEOF
  chmod +x ~/.claude/hud/omc-hud.mjs
  echo "✅ OMC HUD wrapper 생성 완료"
fi
```

#### B. OMC 플러그인 빌드 (미빌드 시 자동 실행)

```bash
# 플러그인 버전 확인
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ 2>/dev/null | sort -V | tail -1)
PLUGIN_DIR="$HOME/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION"

if [ -n "$PLUGIN_VERSION" ] && [ -d "$PLUGIN_DIR" ]; then
  # dist/hud/index.js 존재 여부 확인
  if [ ! -f "$PLUGIN_DIR/dist/hud/index.js" ]; then
    echo "🔧 OMC 플러그인 빌드 시작..."

    cd "$PLUGIN_DIR"

    # package.json 존재 확인
    if [ -f "package.json" ]; then
      # npm install (node_modules 없는 경우)
      if [ ! -d "node_modules" ]; then
        echo "   📦 의존성 설치 중..."
        npm install --silent 2>/dev/null || npm install
      fi

      # 빌드 실행
      echo "   🔨 빌드 중..."
      npm run build --silent 2>/dev/null || npm run build

      # 빌드 결과 확인
      if [ -f "dist/hud/index.js" ]; then
        echo "✅ OMC 플러그인 빌드 완료"
      else
        echo "⚠️ 빌드 완료했으나 dist/hud/index.js 생성되지 않음"
        echo "   트러블슈팅: cd $PLUGIN_DIR && npm run build"
      fi
    else
      echo "❌ package.json 없음 - 플러그인 재설치 필요"
    fi

    cd - > /dev/null
  else
    echo "✅ OMC 플러그인 이미 빌드됨"
  fi
else
  echo "⚠️ OMC 플러그인 미설치 - 먼저 OMC 마켓플레이스 플러그인을 설치하세요"
  echo "   Claude Code에서: /install-plugin omc oh-my-claudecode"
fi
```

#### C. settings.json statusLine 설정 (미설정 시)

```bash
SETTINGS_FILE="$HOME/.claude/settings.json"

# settings.json 없으면 생성
if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{}' > "$SETTINGS_FILE"
fi

# statusLine 설정 확인 및 추가
if ! grep -q "statusLine" "$SETTINGS_FILE" 2>/dev/null; then
  # jq로 statusLine 추가
  if command -v jq &> /dev/null; then
    jq '.statusLine = {"type": "command", "command": "node ~/.claude/hud/omc-hud.mjs"}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
  else
    # jq 없으면 수동 안내
    echo "⚠️ settings.json에 statusLine 추가 필요:"
    echo '  "statusLine": {"type": "command", "command": "node ~/.claude/hud/omc-hud.mjs"}'
  fi
  echo "✅ statusLine 설정 완료"
fi
```

### 2-3. 설정 완료 확인

```bash
# 최종 확인
echo ""
echo "=== OMC 설정 최종 확인 ==="

FINAL_OK=true

# HUD wrapper 확인
[ -f ~/.claude/hud/omc-hud.mjs ] && echo "✅ HUD wrapper" || { echo "❌ HUD wrapper"; FINAL_OK=false; }

# 플러그인 빌드 확인
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ 2>/dev/null | sort -V | tail -1)
[ -n "$PLUGIN_VERSION" ] && [ -f ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION/dist/hud/index.js ] && echo "✅ Plugin Build" || { echo "❌ Plugin Build"; FINAL_OK=false; }

# statusLine 확인
grep -q "statusLine" ~/.claude/settings.json 2>/dev/null && echo "✅ statusLine" || { echo "❌ statusLine"; FINAL_OK=false; }

echo ""
if [ "$FINAL_OK" = true ]; then
  echo "✅ OMC 설정 완료 - Step 3로 진행"
else
  echo "⚠️ 일부 설정 실패 - 트러블슈팅 섹션 참조"
fi
```

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

**settings.json 업데이트 (플러그인 직접 참조):**

`~/.claude/settings.json`의 `statusLine`을 플러그인 경로로 직접 설정하세요:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/plugins/omcm/src/hud/omcm-hud.mjs"
  }
}
```

Edit 도구를 사용하여 statusLine command를 플러그인 경로로 변경하세요.

**참고:** 더 이상 ~/.claude/hud/ 디렉토리에 HUD 파일을 복사하지 않습니다. statusLine이 플러그인 디렉토리의 소스를 직접 참조합니다.

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
| architect, debugger | Oracle | GPT |
| designer, vision | Frontend Engineer | Gemini |
| dependency-expert | Oracle | GPT |
| analyst, product-analyst | Oracle | GPT |
| scientist, verifier | Oracle | GPT |
| code-reviewer, quality-reviewer, api-reviewer | Oracle | GPT |
| security-reviewer | Oracle | GPT |
| writer, style-reviewer, ux-researcher | General | Gemini Flash |

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
