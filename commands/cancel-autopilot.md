---
name: cancel-autopilot
description: 활성화된 하이브리드 오토파일럿 세션 취소
---

# Cancel Hybrid Autopilot

현재 실행 중인 하이브리드 오토파일럿 세션을 중단합니다.

## 동작

1. 진행 중인 모든 퓨전 작업 중단
2. OpenCode 워커 종료
3. 현재까지의 진행 상황 저장
4. 사용자에게 중단 보고

## 트리거 키워드

다음 키워드도 autopilot 중단으로 인식됩니다:
- "stop"
- "cancel"
- "abort"
- "중단"
- "취소"

## 중단 후 상태

- 이미 완료된 작업은 유지됩니다
- 진행 중이던 파일 변경은 저장됩니다
- 미완료 TODO 항목은 리스트에 남습니다
