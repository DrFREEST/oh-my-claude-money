---
name: opencode
description: OpenCode로 작업 전환 (컨텍스트 포함)
arguments:
  - name: task
    description: 전환 후 수행할 추가 작업 지시 (선택사항)
    required: false
triggers:
  - "opencode"
  - "전환"
  - "handoff"
  - "오픈코드"
---

# OpenCode 전환

현재 작업 컨텍스트를 저장하고 OpenCode로 전환합니다.

## 자동 실행

컨텍스트를 수집하고 OpenCode로 전환합니다:

```bash
/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh "$(pwd)"
```

## 전환 프로세스

1. **컨텍스트 수집**: 현재 작업 상태, TODO, 최근 수정 파일, 결정 사항
2. **컨텍스트 저장**: `~/.omcm/handoff/context.md`에 마크다운 형식으로 저장
3. **프로세스 교체**: `exec`로 Claude Code → OpenCode 자연스럽게 전환

## 수동 실행 (터미널)

```bash
/opt/oh-my-claude-money/scripts/handoff-to-opencode.sh
```

## 컨텍스트만 저장 (전환 없이)

```bash
/opt/oh-my-claude-money/scripts/export-context.sh "$(pwd)"
```

## 참고

- 전환 후 Claude Code 프로세스는 종료됩니다 (exec 방식)
- 다시 Claude Code로 돌아가려면 터미널에서 `claude` 명령 실행
- 컨텍스트는 `~/.omcm/handoff/context.md`에 저장됨
