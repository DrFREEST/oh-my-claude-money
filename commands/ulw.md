---
description: 자동 퓨전 울트라워크 - 사용량 기반 자동 전환
aliases: [ultrawork, 울트라워크]
---

# Auto-Fusion Ultrawork (ulw)

[ULW - AUTO-FUSION ULTRAWORK ACTIVATED]

사용량 기반으로 자동 퓨전 전환되는 울트라워크입니다.

## 사용자 요청

{{ARGUMENTS}}

## 자동 전환 조건

다음 조건에서 자동으로 퓨전 모드(hulw)로 전환됩니다:

| 조건 | 임계값 | 동작 |
|------|--------|------|
| 5시간 사용량 | 90% 이상 | 퓨전 모드로 전환 |
| 주간 사용량 | 90% 이상 | 퓨전 모드로 전환 |
| fusionDefault 설정 | true | 항상 퓨전 모드 |

## 설정 확인

```
~/.claude/plugins/omcm/config.json
```

```json
{
  "fusionDefault": false,
  "threshold": 90
}
```

## 실행 전략

1. **사용량 확인**: Claude 5시간/주간 사용량 체크
2. **모드 결정**: 임계값 기반으로 일반/퓨전 모드 결정
3. **작업 분해**: 요청을 병렬 가능한 작업으로 분해
4. **병렬 실행**: 선택된 모드로 병렬 실행

## 시작

사용량을 확인하고 최적의 모드로 울트라워크를 시작합니다.
