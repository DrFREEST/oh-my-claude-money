---
name: hybrid-ultrawork
description: Claude Code + OpenCode 하이브리드 울트라워크 모드 활성화
aliases:
  - hulw
  - hybrid
triggers:
  - "hybrid ultrawork"
  - "hybrid ulw"
  - "hulw"
  - "claude opencode 같이"
  - "토큰 최적화"
---

# 하이브리드 울트라워크 모드

Claude Code와 OpenCode를 함께 활용하여 **토큰 사용량을 최적화**하면서 병렬 처리를 수행합니다.

## 작동 방식

1. **작업 분석**: 각 작업의 유형과 복잡도 분석
2. **라우팅 결정**: 현재 Claude 사용량과 작업 특성에 따라 분배
3. **병렬 실행**: Claude Code와 OpenCode 에이전트가 동시에 작업
4. **결과 통합**: 양쪽 결과를 통합하여 최종 결과 생성

## 라우팅 규칙

### Claude Code 선호 작업 (높은 정확도 필요)
- 아키텍처 분석, 복잡한 디버깅
- 복잡한 리팩토링
- 전략적 계획, 플랜 검토

### OpenCode 선호 작업 (비용 효율적)
- 코드베이스 탐색, 파일 검색
- 문서 조사, API 리서치
- 문서 작성, 간단한 UI 수정

### 사용량 기반 동적 라우팅
- **90%+**: 80% OpenCode 분배
- **70-90%**: 50% OpenCode 분배
- **50-70%**: 30% OpenCode 분배
- **50% 미만**: 10% OpenCode 분배

## 사용 예시

```
"hybrid ultrawork: 이 기능을 구현해줘"
"hulw 전체 코드베이스 리팩토링"
"토큰 최적화하면서 테스트 작성해줘"
```

## OpenCode 에이전트 매핑

| OMC 에이전트 | OpenCode 에이전트 |
|-------------|------------------|
| explore | Librarian |
| researcher | Oracle (GPT 5.2) |
| designer | Frontend Engineer (Gemini 3) |
| executor | Sisyphus (Opus) |
| writer | Librarian |

## 활성화 조건

- OpenCode 설치 필요 (`which opencode`)
- oh-my-opencode 확장 권장

## 설정

`~/.claude/plugins/omcm/config.json`:

```json
{
  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 3,
    "preferOpencode": ["explore", "researcher", "writer"]
  }
}
```

## 실시간 상태

현재 세션에서 hybrid-ultrawork 활성화 시:
- Claude 사용량 표시
- 라우팅 결정 로그
- 토큰 절감량 추정
