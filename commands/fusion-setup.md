---
description: oh-my-claude-money 퓨전 플러그인 완전 셋업
---

# oh-my-claude-money 퓨전 셋업

Claude Code ↔ OpenCode 퓨전 오케스트레이터를 설정합니다.

## 전제 조건 확인

다음을 먼저 설치해야 합니다:

1. **Claude Code CLI** - `claude --version`으로 확인
2. **oh-my-claudecode** - Claude Code 플러그인
3. **OpenCode CLI** - `opencode --version`으로 확인
4. **API 키 설정** - OpenAI, Google API 키

## 셋업 단계

### 1. OpenCode 프로바이더 인증

```bash
# OpenAI 인증
opencode auth login openai

# Google (Gemini) 인증
opencode auth login google

# 인증 상태 확인
opencode auth status
```

### 2. OpenCode 서버 모드 시작 (중요!)

퓨전 라우팅 성능을 위해 OpenCode 서버를 백그라운드에서 실행합니다:

```bash
# 서버 시작 (포트 4096)
opencode serve --port 4096 &

# 또는 systemd 서비스로 등록 (Linux)
cat > ~/.config/systemd/user/opencode-server.service << 'EOF'
[Unit]
Description=OpenCode Server for OMCM Fusion
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/opencode serve --port 4096
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now opencode-server
```

서버가 실행 중이면 퓨전 라우팅이 **10배 빨라집니다** (cold boot 제거).

### 3. 퓨전 기본값 활성화

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
```

### 4. 글로벌 CLAUDE.md에 퓨전 지시사항 추가

`~/.claude/CLAUDE.md` 파일에 다음 내용을 **추가**하세요 (기존 내용 유지):

```markdown
# oh-my-claude-money - 퓨전 오케스트레이터

## 퓨전 에이전트 매핑 (OMC 3.6.0 → OMO 3.1.0)

Claude 토큰 절약을 위해 다음 에이전트들은 OpenCode로 라우팅됩니다:

| OMC 에이전트 | OpenCode 에이전트 | 모델 |
|-------------|------------------|------|
| architect, architect-medium | Oracle | GPT 5.2 |
| architect-low | explore | Gemini Flash |
| designer, designer-high, designer-low | frontend-ui-ux-engineer | Gemini Pro |
| researcher | Oracle | GPT 5.2 |
| researcher-low | librarian | GLM |
| vision | multimodal-looker | Gemini Flash |
| writer | document-writer | Gemini Flash |
| executor, executor-high, executor-low | Codex | GPT 5.2 Codex |

## 퓨전 모드 키워드

- `hulw` - 하이브리드 울트라워크 (항상 퓨전)
- `ulw` - 사용량 기반 자동 퓨전
- `autopilot` - 자율 실행 + 퓨전 지원
```

### 5. 설정 확인

```bash
# OpenCode 서버 상태 확인
curl -s http://localhost:4096/health || echo "서버 미실행"

# 퓨전 테스트
hulw: 테스트

# 프로바이더 상태 확인
opencode auth status
```

## 트러블슈팅

### OpenCode 서버가 실행 안됨
```bash
# 포트 확인
lsof -i :4096

# 수동 시작
opencode serve --port 4096
```

### 퓨전 라우팅이 느림
- OpenCode 서버 모드가 실행 중인지 확인
- 서버 미실행 시 매번 cold boot 발생 (10-15초)

### API 인증 오류
```bash
# 키 재설정
export OPENAI_API_KEY="your-key"
export GOOGLE_API_KEY="your-key"
opencode auth login openai
opencode auth login google
```

## 완료

위 단계를 완료하면 셋업 완료입니다!

**다음 명령어로 테스트:**
- `hulw: 간단한 테스트` - 퓨전 모드 테스트
- `/omcm:fusion-default-on` - 퓨전 기본값 활성화
- `/omcm:fusion-default-off` - 퓨전 기본값 비활성화
