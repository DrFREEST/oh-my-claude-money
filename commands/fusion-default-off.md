---
description: 퓨전 모드 기본값 비활성화 - 사용량 기반 자동 전환으로 복귀
---

# Fusion Default OFF

퓨전 모드 기본값을 비활성화하고 원래 동작으로 복귀합니다.

## 동작

이 명령어를 실행하면:

1. **사용량 기반 자동 전환**으로 복귀합니다
2. `ulw`는 사용량에 따라 퓨전 여부를 결정합니다
3. `hulw`만 명시적으로 퓨전 모드를 사용합니다

## 설정 저장 위치

```
~/.claude/plugins/omcm/config.json
```

```json
{
  "fusionDefault": false
}
```

## 실행

다음 내용을 사용자의 설정에 적용하세요:

```bash
# 설정 디렉토리 생성
mkdir -p ~/.claude/plugins/omcm

# fusionDefault 비활성화
cat > ~/.claude/plugins/omcm/config.json << 'EOF'
{
  "fusionDefault": false,
  "threshold": 90,
  "autoHandoff": false
}
EOF
```

## 확인 메시지

설정 완료 후 사용자에게 알림:

> **퓨전 모드 기본값 비활성화** - 이제 사용량 기반으로 자동 전환됩니다.
> - 사용량 < 70%: Claude 에이전트 사용
> - 사용량 70-90%: 하이브리드 모드
> - 사용량 > 90%: OpenCode 중심 모드
>
> 다시 활성화하려면 `/oh-my-claude-money:fusion-default-on`을 실행하세요.

## 효과

| 명령어 | 변경 전 (ON) | 변경 후 (OFF) |
|--------|-------------|--------------|
| 일반 작업 | 퓨전 라우팅 | Claude만 사용 |
| `ulw` | 항상 퓨전 | 사용량 기반 전환 |
| `hulw` | 항상 퓨전 | 항상 퓨전 (동일) |
| `autopilot` | 항상 하이브리드 | 사용량 기반 |

## 권장 상황

- 최고 품질의 결과가 필요할 때
- Claude 토큰 여유가 충분할 때
- 복잡한 분석/추론 작업이 많을 때
