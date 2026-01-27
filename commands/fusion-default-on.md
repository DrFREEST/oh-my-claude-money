---
description: 항상 퓨전 모드 활성화 - 모든 작업에서 OpenCode 퓨전을 기본으로 사용
---

# Fusion Default ON

퓨전 모드를 기본값으로 활성화합니다.

## 동작

이 명령어를 실행하면:

1. **모든 작업이 자동으로 퓨전 모드로 실행**됩니다
2. `ulw` 명령어도 항상 `hulw`처럼 동작합니다
3. 사용량과 관계없이 OpenCode 에이전트를 우선 사용합니다

## 설정 저장 위치

```
~/.claude/plugins/omcm/config.json
```

```json
{
  "fusionDefault": true
}
```

## 실행

다음 내용을 사용자의 설정에 적용하세요:

```bash
# 설정 디렉토리 생성
mkdir -p ~/.claude/plugins/omcm
mkdir -p ~/.omcm

# fusionDefault 활성화 (config.json)
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "fusionDefault": true,
  "threshold": 90,
  "autoHandoff": false
}
EOF

# fusion-state.json도 활성화 (enabled: true)
if [ -f ~/.omcm/fusion-state.json ]; then
  # 기존 파일이 있으면 enabled만 업데이트
  node -e "
    const fs = require('fs');
    const path = require('path').join(process.env.HOME, '.omcm', 'fusion-state.json');
    let state = JSON.parse(fs.readFileSync(path, 'utf-8'));
    state.enabled = true;
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(path, JSON.stringify(state, null, 2));
  "
else
  # 새로 생성
  cat > ~/.omcm/fusion-state.json << 'EOF'
{
  "enabled": true,
  "mode": "balanced",
  "totalTasks": 0,
  "routedToOpenCode": 0,
  "routingRate": 0,
  "estimatedSavedTokens": 0,
  "byProvider": { "gemini": 0, "openai": 0, "anthropic": 0 },
  "lastUpdated": null
}
EOF
fi

# 서버 풀 시작 (Cold boot 최소화)
echo "서버 풀 시작 중..."
if [ -f ~/.claude/plugins/marketplaces/omcm/scripts/start-server-pool.sh ]; then
  ~/.claude/plugins/marketplaces/omcm/scripts/start-server-pool.sh start
elif [ -f ~/.local/share/omcm/scripts/start-server-pool.sh ]; then
  ~/.local/share/omcm/scripts/start-server-pool.sh start
else
  # 단일 서버 폴백
  if command -v opencode &> /dev/null; then
    mkdir -p ~/.omcm/server-pool ~/.omcm/logs
    if ! pgrep -f "opencode serve" > /dev/null; then
      nohup opencode serve --port 4096 > ~/.omcm/logs/server-4096.log 2>&1 &
      echo $! > ~/.omcm/server-pool/server-4096.pid
      echo "서버 시작됨 (포트 4096)"
    else
      echo "서버 이미 실행 중"
    fi
  fi
fi
```

## 확인 메시지

설정 완료 후 사용자에게 알림:

> **퓨전 모드 기본 활성화** - 이제 모든 작업이 Claude + OpenCode 퓨전으로 실행됩니다.
> **서버 풀 대기 중** - 첫 요청부터 빠른 응답이 가능합니다 (Cold boot 최소화).
> 비활성화하려면 `/omcm:fusion-default-off`를 실행하세요.

## 효과

| 명령어 | 이전 동작 | 변경 후 동작 |
|--------|----------|-------------|
| 일반 작업 | Claude만 사용 | 퓨전 라우팅 |
| `ulw` | 사용량 기반 전환 | 항상 퓨전 |
| `hulw` | 항상 퓨전 | 항상 퓨전 (동일) |
| `autopilot` | 사용량 기반 | 항상 하이브리드 |

## 권장 상황

- Claude 토큰을 최대한 절약하고 싶을 때
- OpenCode 프로바이더 인증이 완료된 상태
- 복잡한 분석보다 빠른 처리가 중요할 때
