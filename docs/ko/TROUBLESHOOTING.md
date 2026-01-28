# 문제 해결 가이드

**oh-my-claude-money (OMCM)** 사용 중 발생할 수 있는 모든 일반적인 문제와 해결책을 제공하는 종합 가이드입니다.

---

## 목차

1. [설치 관련 문제](#1-설치-관련-문제)
2. [OpenCode 연결 문제](#2-opencode-연결-문제)
3. [퓨전 라우팅 문제](#3-퓨전-라우팅-문제)
4. [HUD 및 표시 문제](#4-hud-및-표시-문제)
5. [서버 풀 문제](#5-서버-풀-문제)
6. [설정 및 훅 문제](#6-설정-및-훅-문제)
7. [성능 최적화](#7-성능-최적화)
8. [진단 도구 사용법](#8-진단-도구-사용법)
9. [자주 묻는 질문](#9-자주-묻는-질문)
10. [에러 메시지 사전](#10-에러-메시지-사전)

---

## 1. 설치 관련 문제

### 1.1 Claude Code를 찾을 수 없음

**증상**: `claude: command not found` 또는 `Claude Code not found`

**해결 단계**:

```bash
# 1단계: PATH 갱신
hash -r

# 2단계: 설치 확인
claude --version

# 설치되지 않았으면 재설치
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code

# 3단계: 새 터미널 열기 (중요!)
# 새 터미널에서 다시 시도
claude --version
```

**다른 설치 방법**:
```bash
# 공식 설치 스크립트 사용
curl -fsSL https://claude.ai/install.sh | bash
```

---

### 1.2 OpenCode를 찾을 수 없음

**증상**: `opencode: command not found`

**해결 단계**:

```bash
# 1단계: PATH 갱신
hash -r

# 2단계: 설치 확인
opencode --version

# 설치되지 않았으면 재설치
npm uninstall -g opencode-ai
npm install -g opencode-ai@latest

# 3단계: 새 터미널 열기 후 확인
opencode --version
```

**macOS Homebrew 사용자**:
```bash
brew install opencode
opencode --version
```

---

### 1.3 oh-my-claudecode 플러그인 미인식

**증상**: Claude Code에서 `/oh-my-claudecode:` 명령어를 찾을 수 없음

**원인**: 플러그인이 설치되지 않았거나 활성화되지 않음

**해결 방법**:

```bash
# 1단계: 플러그인 디렉토리 생성
mkdir -p ~/.claude/plugins/local

# 2단계: 플러그인 클론
git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git \
  ~/.claude/plugins/local/oh-my-claudecode

# 3단계: Claude Code 실행 및 설정
claude

# Claude Code 프롬프트에서:
/oh-my-claudecode:omc-setup
```

**플러그인 활성화 확인**:
```bash
# settings.json 확인
cat ~/.claude/settings.json | grep -A5 "plugins"

# 플러그인 캐시 확인
ls -la ~/.claude/plugins/cache/omc/
```

---

### 1.4 oh-my-claude-money 플러그인 인식 안됨

**증상**: `/omcm:` 명령어를 찾을 수 없음

**해결 단계**:

```bash
# 1단계: 설치 경로 확인
ls -la ~/.claude/plugins/local/oh-my-claude-money
# 또는
ls -la ~/.claude/plugins/marketplaces/omcm/

# 설치되지 않았으면:
git clone https://github.com/DrFREEST/oh-my-claude-money.git \
  ~/.claude/plugins/local/oh-my-claude-money

# 2단계: 설정 파일 확인
cat ~/.claude/settings.json | jq '.enabledPlugins'

# 3단계: Claude Code 재시작
# 현재 세션 종료
# 새 터미널 열기:
claude
```

---

### 1.5 설치 스크립트 실패

**증상**: `install.sh`가 오류로 종료됨

**디버깅**:

```bash
# 스크립트를 verbose 모드로 실행
bash -x /opt/oh-my-claude-money/install.sh

# 또는 각 단계를 수동으로 실행
cd /opt/oh-my-claude-money
chmod +x install.sh
./install.sh

# 설치 로그 확인
cat ~/.omcm/install.log  # 있다면
```

**일반적인 설치 실패 원인**:
- 권한 부족: `sudo` 사용 필요
- 디스크 공간 부족: `df -h` 확인
- 인터넷 연결 끊김: 다시 시도
- npm 설치 실패: `npm install -g npm` 먼저 실행

---

## 2. OpenCode 연결 문제

### 2.1 OpenCode 프로바이더 인증 실패

**증상**: `Authentication failed` 또는 `Invalid credentials`

**해결 단계**:

```bash
# 1단계: 인증 상태 확인
opencode auth status

# 2단계: 프로바이더 재인증
opencode auth login

# 3단계: 특정 프로바이더만 인증 필요 시
opencode auth login openai   # OpenAI
opencode auth login google   # Google
opencode auth login anthropic # Anthropic
```

**인증 상태 해석**:
```
✅ OpenAI (gpt-5.2, gpt-5.2-codex)      # 정상
❌ Google (not configured)               # 미설정
⚠️ Anthropic (expired)                   # 만료됨
```

---

### 2.2 API 키 오류

**증상**: `Invalid API key` 또는 `API key not found`

**환경 변수 확인**:

```bash
# 현재 설정된 키 확인
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
echo $GOOGLE_API_KEY

# 키가 비어있으면 설정
export OPENAI_API_KEY="sk-proj-..."
export GOOGLE_API_KEY="AIza..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

**영구 설정** (~/.bashrc 또는 ~/.zshrc):

```bash
# 파일 편집
nano ~/.bashrc

# 다음 추가
export OPENAI_API_KEY="sk-proj-..."
export GOOGLE_API_KEY="AIza..."
export ANTHROPIC_API_KEY="sk-ant-..."

# 적용
source ~/.bashrc
```

---

### 2.3 특정 모델 사용 불가능

**증상**: `Model gpt-5.2 not available for your API key` 또는 비슷한 메시지

**원인**: API 키에 해당 모델 접근 권한이 없음

**해결**:

1. **OpenAI**: [API 키 페이지](https://platform.openai.com/api-keys)에서 권한 확인
2. **Google**: [AI Studio](https://aistudio.google.com/apikey)에서 모델 활성화 확인
3. **Anthropic**: [콘솔](https://console.anthropic.com/settings/keys)에서 가입 상태 확인

**대체 모델 설정**:

```bash
# config.json에서 모델 변경
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "preferOpencode": ["explore", "designer"],
    "models": {
      "openai": "gpt-4o",          # gpt-5.2 대신 사용
      "google": "gemini-2.0-flash"  # gemini-pro 대신 사용
    }
  }
}
EOF
```

---

### 2.4 OpenCode 서버 연결 실패

**증상**: `Failed to connect to OpenCode server` 또는 타임아웃

**해결 단계**:

```bash
# 1단계: OpenCode 서버 상태 확인
ps aux | grep opencode

# 2단계: 포트 확인
lsof -i :8000  # 또는 설정된 포트

# 3단계: 서버 수동 시작
opencode serve --port 8000

# 4단계: OMCM 서버 풀 시작
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh start

# 5단계: 상태 확인
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh status
```

---

## 3. 퓨전 라우팅 문제

### 3.1 hulw 사용해도 OpenCode로 라우팅 안됨

**증상**: `hulw` 키워드 사용하는데도 Claude만 사용됨

**진단**:

```bash
# 1단계: 설정 확인
cat ~/.claude/plugins/omcm/config.json | jq '.routing.enabled'

# 2단계: 퓨전 기본값 확인
cat ~/.claude/plugins/omcm/config.json | jq '.fusionDefault'

# 3단계: 훅 확인
cat ~/.claude/settings.json | jq '.hooks.PreToolUse'
```

**해결 방법**:

```bash
# 방법 1: 설정 파일 수정
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "enabled": true,
    "autoDelegate": true
  }
}
EOF

# 방법 2: Claude Code에서 재설정
claude
/omcm:fusion-setup

# 방법 3: 퓨전 기본값 활성화
/omcm:fusion-default-on
```

---

### 3.2 사용량 기반 자동 전환이 작동 안함

**증상**: 사용량 90% 이상인데 자동 전환이 안됨

**원인**:
- `autoHandoff`가 `false`로 설정됨
- HUD 캐시가 업데이트 안됨
- 사용량 정보를 읽지 못함

**확인**:

```bash
# 현재 사용량 확인
cat ~/.cache/omc/hud-cache.json | jq '.usage'

# autoHandoff 설정 확인
cat ~/.claude/plugins/omcm/config.json | jq '.autoHandoff'

# 임계값 확인
cat ~/.claude/plugins/omcm/config.json | jq '.threshold'
```

**활성화**:

```bash
# Claude Code에서
claude
/omcm:fusion-setup

# 또는 수동 설정
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "autoHandoff": true,
  "threshold": 90,
  "fusionDefault": false
}
EOF
```

---

### 3.3 OpenCode 타임아웃

**증상**: `OpenCode request timeout after 300000ms`

**원인**: 작업이 너무 크거나 네트워크 느림

**해결**:

```bash
# 1단계: 타임아웃 시간 증가
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "opencode": {
    "timeout": 600000,  # 10분으로 증가 (기본 5분)
    "command": "opencode"
  }
}
EOF

# 2단계: 네트워크 확인
ping -c 3 8.8.8.8

# 3단계: 작업 크기 줄이기 (필요 시)
# 여러 작은 작업으로 분산 시도
```

---

## 4. HUD 및 표시 문제

### 4.1 HUD가 표시되지 않음

**증상**: Claude Code 상태 라인에 토큰 정보가 안 보임

**확인**:

```bash
# HUD 파일 존재 여부
ls -la ~/.claude/hud/omcm-hud.mjs

# 파일이 없으면 생성
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

**settings.json 확인**:

```bash
# statusLine 설정 확인
cat ~/.claude/settings.json | jq '.statusLine'

# 설정이 없으면 추가
cat >> ~/.claude/settings.json << 'EOF'
{
  "statusLine": {
    "enabled": true,
    "command": "node ~/.claude/hud/omcm-hud.mjs"
  }
}
EOF
```

---

### 4.2 토큰 사용량이 업데이트 안됨

**증상**: HUD에 토큰 정보가 고정됨 또는 "Loading..."

**원인**:
- OMC HUD 캐시가 업데이트 안됨
- OMCM HUD가 캐시를 읽지 못함

**해결**:

```bash
# 1단계: 캐시 확인
cat ~/.cache/omc/hud-cache.json

# 2단계: 캐시 삭제 및 갱신
rm -f ~/.cache/omc/hud-cache.json
# Claude Code 재시작 후 자동 생성됨

# 3단계: OMC 플러그인 빌드 확인
PLUGIN_VERSION=$(ls ~/.claude/plugins/cache/omc/oh-my-claudecode/ | sort -V | tail -1)
ls -la ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION/dist/hud/

# 빌드되지 않았으면 수동 빌드
cd ~/.claude/plugins/cache/omc/oh-my-claudecode/$PLUGIN_VERSION
npm install --silent
npm run build --silent
```

---

### 4.3 HUD에 이상한 문자나 형식 오류

**증상**: HUD에 `[object Object]` 또는 깨진 문자 표시

**해결**:

```bash
# 1단계: HUD 파일 권한 확인
chmod +x ~/.claude/hud/omcm-hud.mjs

# 2단계: 파일 재생성
rm ~/.claude/hud/omcm-hud.mjs
bash /opt/oh-my-claude-money/scripts/install-hud.sh

# 3단계: Claude Code 재시작
# 현재 세션 종료
# 새 터미널: claude
```

---

## 5. 서버 풀 문제

### 5.1 서버 풀 시작 실패

**증상**: `Failed to start server pool` 또는 포트 충돌 오류

**포트 확인**:

```bash
# 사용 중인 포트 확인
lsof -i :8000
lsof -i :8001
netstat -tuln | grep LISTEN

# 충돌하는 프로세스 종료
kill -9 <PID>
```

**포트 변경**:

```bash
# 환경 변수로 포트 변경
export OMCM_BASE_PORT=9000
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh start

# 또는 설정 파일에서
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "maxOpencodeWorkers": 5,
    "basePort": 9000
  }
}
EOF
```

**권한 부족**:

```bash
# 1024 이하 포트 사용 시 sudo 필요
sudo ~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh start

# 또는 1024 이상 포트 사용
export OMCM_BASE_PORT=8000
```

---

### 5.2 서버 풀 상태 확인

**명령어**:

```bash
# 상태 확인
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh status

# 로그 확인
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh logs

# 실시간 로그
tail -f ~/.omcm/logs/opencode-server.log

# 모든 서버 프로세스 확인
ps aux | grep opencode
```

---

### 5.3 서버 메모리 사용량 많음

**증상**: 서버 풀이 많은 메모리 사용 (서버당 ~300MB)

**확인**:

```bash
# 메모리 사용량 확인
ps aux | grep opencode | grep -v grep

# 또는
top -p <PID>
```

**최적화**:

```bash
# 최대 서버 수 줄이기
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "maxOpencodeWorkers": 2  # 기본값 3 → 2로 감소
  }
}
EOF

# 또는 서버 완전 중지
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh stop
```

---

## 6. 설정 및 훅 문제

### 6.1 설정 파일을 찾을 수 없음

**경로 확인**:

```bash
# 설정 파일 위치
~/.claude/plugins/omcm/config.json

# 파일 없으면 생성
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

### 6.2 설정 변경이 적용 안됨

**원인**: 설정 캐시 또는 Claude Code 재시작 필요

**해결**:

```bash
# 1단계: 설정 파일 수정
nano ~/.claude/plugins/omcm/config.json

# 2단계: Claude Code 세션 종료
# 3단계: 새 터미널에서 재시작
claude
```

**캐시 제거** (필요 시):

```bash
rm -rf ~/.claude/plugins/cache/
rm -rf ~/.cache/omc/
# 그 후 Claude Code 재시작
```

---

### 6.3 훅이 실행되지 않음

**원인**: 훅 파일 없음 또는 경로 오류

**확인**:

```bash
# 훅 파일 존재 확인
ls -la ~/.claude/plugins/omcm/hooks/
ls -la ~/.claude/plugins/omcm/src/hooks/

# 훅 설정 확인
cat ~/.claude/settings.json | jq '.hooks'
```

**훅 수동 설정**:

```bash
# hooks.json 확인 및 복사
cp /opt/oh-my-claude-money/hooks/hooks.json \
   ~/.claude/plugins/omcm/hooks/

# 파일 권한 설정
chmod +x ~/.claude/plugins/omcm/hooks/*.mjs
chmod +x ~/.claude/plugins/omcm/src/hooks/*.mjs
```

---

## 7. 성능 최적화

### 7.1 응답 속도 개선

**문제**: OpenCode 호출이 느림

**최적화**:

```bash
# 1단계: 서버 풀 사용 (추천)
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh start

# 2단계: 최대 워커 수 조정
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "maxOpencodeWorkers": 5  # 병렬 처리 증가
  }
}
EOF

# 3단계: 타임아웃 확인 (너무 짧으면 안됨)
# 기본값 300000ms(5분) 유지 권장
```

---

### 7.2 대규모 병렬 작업 설정

**시나리오**: 많은 파일을 동시에 처리

```bash
# 설정
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "routing": {
    "maxOpencodeWorkers": 10,      # 최대 10개 동시 작업
    "usageThreshold": 60           # 빨리 분산 시작
  },
  "context": {
    "maxContextLength": 100000     # 컨텍스트 증가
  },
  "opencode": {
    "timeout": 600000             # 10분 타임아웃
  }
}
EOF

# 환경 변수도 설정
export OMCM_MAX_SERVERS=10
export OMCM_BASE_PORT=8000
```

---

## 8. 진단 도구 사용법

### 8.1 설정 검증

```bash
# JSON 문법 확인
cat ~/.claude/plugins/omcm/config.json | jq '.'

# 특정 값 확인
cat ~/.claude/plugins/omcm/config.json | jq '.routing.enabled'
cat ~/.claude/plugins/omcm/config.json | jq '.threshold'
```

### 8.2 로그 확인

```bash
# 서버 풀 로그
cat ~/.omcm/logs/opencode-server.log

# 라우팅 로그
cat ~/.omcm/routing-log.jsonl | tail -20

# 퓨전 상태
cat ~/.omcm/fusion-state.json

# 프로바이더 제한
cat ~/.omcm/provider-limits.json
```

### 8.3 의존성 확인

```bash
# Node.js 버전
node --version  # v18+ 필요

# Claude Code
claude --version

# oh-my-claudecode
claude
/oh-my-claudecode:version

# OpenCode
opencode --version

# OpenCode 프로바이더
opencode auth status
```

---

## 9. 자주 묻는 질문

### Q1: OpenCode가 정확히 무엇인가요?

**A**: OpenCode는 여러 LLM 프로바이더(OpenAI, Google, Anthropic 등)를 하나의 인터페이스로 사용할 수 있게 해주는 오픈소스 AI 코딩 에이전트입니다.

OMCM은 OpenCode를 Claude Code와 연결하여:
- 검색, 탐색, 분석 작업은 **OpenCode(GPT/Gemini)**로 처리
- 복잡한 추론과 구현은 **Claude Code**가 담당
- 결과적으로 **Claude 토큰 62% 절약**

---

### Q2: Claude 토큰 절약이 정말되나요?

**A**: 네, 실제 데이터 기반입니다.

**절약 구조**:
- **18개 에이전트** (62%)가 GPT/Gemini로 오프로드됨
- 단순 작업은 저비용 모델 사용
- 핵심 추론은 Claude Opus 사용

**예시**:
```
100시간 작업
├─ 62시간: OpenCode(GPT/Gemini) 사용 → 저비용
└─ 38시간: Claude Opus 사용 → 고품질

결과: Claude 사용량 62% 감소!
```

---

### Q3: 퓨전 모드(hulw)는 언제 사용하나요?

**A**: 다음 상황에서 효과적입니다:

**hulw 추천**:
- 대규모 리팩토링 (여러 파일)
- 광범위한 코드 탐색
- 병렬 작업 처리 필요
- 토큰 절약 우선

**Claude 우선**:
- 복잡한 아키텍처 결정
- 보안/인증 관련 작업
- 단일 파일 정교한 수정
- 최고 품질 필요

---

### Q4: 어떤 에이전트가 어디로 라우팅되나요?

**A**: 기본 라우팅 규칙:

**Claude (고품질)**:
- `architect`, `executor-high`
- `critic`, `planner`
- `security-reviewer`

**OpenCode (빠름, 저비용)**:
- `explore`, `explore-medium`
- `researcher`, `designer`
- `writer`, `vision`

커스텀 설정: `~/.omcm/agent-mapping.json`

---

### Q5: 프로바이더 인증을 여러 번 해야 하나요?

**A**: 각 프로바이더는 한 번만 인증하면 됩니다:

```bash
opencode auth login openai   # 한 번만 실행
opencode auth login google   # 한 번만 실행

# 이후 반복 사용 가능
opencode auth status        # 확인용
```

**재인증이 필요한 경우**:
- API 키 변경
- 토큰 만료
- 인증 정보 오류

---

### Q6: 퓨전과 울트라워크의 차이는?

**A**:
| 기능 | ulw (울트라워크) | fusion (퓨전) |
|------|-------------------|---------------|
| **목적** | Claude 내 병렬화 | OMC + OpenCode 혼합 |
| **사용 시기** | 빠른 처리 필요 | 토큰 절약 필요 |
| **모델** | Claude만 사용 | Claude + GPT/Gemini |
| **비용** | 높음 | 낮음 |
| **활성화** | `/ulw` 또는 `ulw` | `/hulw` 또는 `hulw` |

---

### Q7: 사용량이 90%에 도달했는데 자동 전환이 안됨?

**A**: `autoHandoff` 설정 확인:

```bash
# 확인
cat ~/.claude/plugins/omcm/config.json | jq '.autoHandoff'

# 활성화
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "autoHandoff": true,
  "threshold": 90,
  "fusionDefault": false
}
EOF

# Claude Code 재시작
claude
```

---

### Q8: 사용량은 어디서 확인하나요?

**A**: 여러 방법으로 확인 가능:

```bash
# 방법 1: HUD (Claude Code 상태 라인)
# "C:45.2k↓ 2.3k↑|O:180k↓ 3.2k↑|G:0↓ 0↑" 형식

# 방법 2: 파일 확인
cat ~/.cache/omc/hud-cache.json | jq '.usage'

# 방법 3: Claude Code에서
claude
# "현재 사용량: 45%" 등의 메시지 확인

# 방법 4: 프로바이더별 상세
cat ~/.omcm/provider-limits.json | jq '.providers'
```

---

### Q9: OpenCode가 응답을 안 줄 때는?

**A**: 단계별 확인:

```bash
# 1단계: 서버 상태 확인
ps aux | grep opencode

# 2단계: 로그 확인
tail -50 ~/.omcm/logs/opencode-server.log

# 3단계: 서버 재시작
~/.claude/plugins/local/oh-my-claude-money/scripts/opencode-server.sh restart

# 4단계: 인터넷 연결 확인
ping -c 3 8.8.8.8

# 5단계: 프로바이더 상태 확인
opencode auth status
```

---

### Q10: OMCM을 완전히 제거하려면?

**A**:

```bash
# 플러그인 제거
rm -rf ~/.claude/plugins/local/oh-my-claude-money
rm -rf ~/.claude/plugins/marketplaces/omcm

# 설정 제거
rm -rf ~/.claude/plugins/omcm
rm -rf ~/.omcm

# HUD 제거
rm ~/.claude/hud/omcm-hud.mjs

# settings.json에서 OMCM 관련 항목 제거
# ~/.claude/settings.json 수동 편집
```

---

## 10. 에러 메시지 사전

### 설치 관련

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `OpenCode not found` | OpenCode CLI 미설치 | `npm i -g opencode-ai@latest` |
| `claude: command not found` | Claude Code 미설치 | `npm i -g @anthropic-ai/claude-code` |
| `Plugin not found: omcm` | OMCM 플러그인 미설치 | `git clone` 또는 설치 스크립트 재실행 |

### 인증 관련

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `Authentication failed` | 프로바이더 인증 안됨 | `opencode auth login` |
| `Invalid API key` | API 키 오류 | `opencode auth status` 확인 후 재인증 |
| `Model not available` | 모델 권한 없음 | API 키의 모델 접근 권한 확인 |

### 라우팅 관련

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `Routing failed` | 라우팅 설정 오류 | `config.json` 문법 확인 |
| `Task timeout` | 작업 시간 초과 | `opencode.timeout` 증가 |
| `Context too long` | 컨텍스트 초과 | `maxContextLength` 감소 |

### 서버 관련

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `Failed to start server` | 포트 충돌/권한 부족 | 포트 변경 또는 `sudo` 사용 |
| `Connection refused` | 서버 미시작 | `opencode-server.sh start` |
| `Address already in use` | 포트 사용 중 | `export OMCM_BASE_PORT=9000` |

### HUD 관련

| 에러 | 원인 | 해결책 |
|------|------|--------|
| HUD 미표시 | HUD 파일 없음 | `install-hud.sh` 재실행 |
| `[object Object]` | HUD 형식 오류 | HUD 파일 재생성 |
| 토큰 안 업데이트 | 캐시 오류 | 캐시 삭제 후 재시작 |

---

## 더 필요한 도움

여전히 문제가 해결되지 않으면:

1. **GitHub Issues**: [DrFREEST/oh-my-claude-money/issues](https://github.com/DrFREEST/oh-my-claude-money/issues)
2. **로그 수집**: 위의 로그 파일들을 수집하여 이슈에 첨부
3. **환경 정보**: 다음 명령어 출력 포함
   ```bash
   node --version
   claude --version
   opencode --version
   cat ~/.claude/plugins/omcm/config.json
   ```

---

**마지막 업데이트**: 2026-01-28 | **OMCM v1.0.0**
