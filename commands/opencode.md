---
name: opencode
description: OpenCode로 작업 전환 (컨텍스트 포함)
arguments:
  - name: task
    description: 전달할 추가 작업 지시 (선택사항)
    required: false
---

# OpenCode 전환

현재 작업 컨텍스트를 저장하고 OpenCode로 전환합니다.

## 전환 프로세스

1. **컨텍스트 수집**: 현재 작업 상태, TODO, 최근 수정 파일, 결정 사항 수집
2. **컨텍스트 저장**: `.omc/handoff/context.md`에 마크다운 형식으로 저장
3. **OpenCode 실행**: 수집된 컨텍스트와 함께 OpenCode 시작

## 실행

터미널에서 다음 명령어를 실행하세요:

```bash
cd {{directory}} && /opt/oh-my-claude-money/scripts/handoff-to-opencode.sh
```

## 컨텍스트만 저장 (OpenCode 실행 없이)

```bash
/opt/oh-my-claude-money/scripts/export-context.sh {{directory}}
```

## 저장되는 컨텍스트 내용

| 섹션 | 설명 |
|------|------|
| 세션 정보 | 프로젝트 경로, 시간, 현재 사용량 |
| 현재 작업 | boulder.json에서 활성 플랜 |
| 미완료 TODO | 플랜 또는 TODO.md의 미완료 항목 |
| 최근 수정 파일 | git diff 통계 및 변경 중인 파일 |
| 이전 결정 사항 | notepad wisdom에서 결정 사항 |
| 다음 단계 지시 | OpenCode에 전달할 작업 지시 |

## 추가 작업 지시

`task` 인자를 사용하여 추가 작업 지시를 전달할 수 있습니다:

```
/opencode "로그인 기능 완성해줘"
```

이 경우 컨텍스트 마지막에 추가 지시가 포함됩니다.

## 자동 전환 조건

다음 조건에서 자동으로 전환 알림이 표시됩니다:

1. **키워드 감지**: "opencode", "전환", "handoff" 등 키워드 입력 시
2. **사용량 임계치**: 5시간 또는 주간 사용량 90% 도달 시

자동 전환 설정은 `~/.claude/plugins/oh-my-claude-money/config.json`에서 변경할 수 있습니다.
