---
name: cancel
description: 모든 활성 OMCM 모드 취소 (autopilot, ralph, ultrawork, ecomode, hulw 등)
triggers:
  - cancel
  - stop
  - abort
  - 취소
  - 중지
  - /cancel
---

# OMCM Cancel - 통합 취소 스킬

모든 활성화된 OMCM 모드를 감지하고 취소합니다.

## 취소 대상 모드

| 모드 | 상태 파일 | 취소 동작 |
|------|----------|----------|
| autopilot | `.omc/state/autopilot-state.json` | 세션 종료, 상태 초기화 |
| ralph | `.omc/state/ralph-state.json` | 루프 중단, 상태 초기화 |
| ultrawork | `.omc/state/ultrawork-state.json` | 병렬 작업 중단 |
| ecomode | `.omc/state/ecomode-state.json` | 토큰 절약 모드 해제 |
| hulw | `.omc/state/hulw-state.json` | 하이브리드 모드 해제 |
| team | `.omc/state/team-state.json` | 팀 협업 모드 해제 (v4.1.7+) |
| swarm | `.omc/state/swarm-state.json` | 에이전트 풀 해제 (레거시) |
| ultrapilot | `.omc/state/ultrapilot-state.json` | 병렬 자동조종 해제 (레거시) |
| pipeline | `.omc/state/pipeline-state.json` | 파이프라인 중단 |

> **참고**: OMC v4.1.7부터 `ultrapilot`과 `swarm`은 `team` 모드로 통합되었습니다. 레거시 호환을 위해 기존 상태 파일도 함께 취소합니다.

## 취소 프로세스

1. **활성 모드 감지**
   ```javascript
   const activeStates = await detectActiveStates();
    // .omc/state/ 디렉토리의 모든 상태 파일 확인
   ```

2. **모드별 취소 실행**
   ```javascript
   for (const mode of activeStates) {
     await cancelMode(mode);
     log(`[OMCM] ${mode} 모드 취소됨`);
   }
   ```

3. **상태 파일 정리**
   ```javascript
   await cleanupStateFiles();
   ```

## 사용 방법

### 기본 취소
```
cancel
```
또는
```
stop
```

### 강제 전체 취소
```
cancel --force
```
또는
```
cancel --all
```

## 취소 후 동작

- 모든 백그라운드 에이전트 종료
- 상태 파일 초기화 (`active: false`)
- 사용자에게 취소 완료 메시지 출력
- TodoList 상태는 유지 (작업 기록 보존)

## 주의사항

- 진행 중인 파일 수정은 완료 후 취소됨
- 커밋되지 않은 변경사항은 유지됨
- 취소 후 동일 모드 재시작 가능
