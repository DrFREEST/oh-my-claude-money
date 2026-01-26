---
description: OpenCode로 명시적 전환 - 현재 컨텍스트를 OpenCode에 전달
aliases: [handoff, 전환, switch]
---

# OpenCode Handoff

[OPENCODE HANDOFF - EXPLICIT CONTEXT TRANSFER]

현재 대화 컨텍스트를 OpenCode로 명시적으로 전환합니다.

## 전환 방법

### 1. 자동 컨텍스트 내보내기

다음 정보가 OpenCode로 전달됩니다:
- 현재 작업 디렉토리
- 최근 수정된 파일 목록
- 진행 중인 TODO 항목
- 대화 요약

### 2. OpenCode 실행

```bash
# 컨텍스트 파일 생성
~/.omcm/handoff-context.md

# OpenCode에서 열기
opencode --context ~/.omcm/handoff-context.md
```

## 전환 후 사용 가능한 OpenCode 에이전트

| 에이전트 | 모델 | 용도 |
|---------|------|------|
| Oracle | GPT | 분석, 리뷰, 문서화 |
| Frontend Engineer | Gemini | UI/UX, 프론트엔드 |
| Multimodal Looker | Gemini | 이미지/다이어그램 분석 |
| Coder | Claude | 코드 작성 (Claude 사용) |

## 복귀 방법

OpenCode에서 작업 완료 후:
1. 결과를 커밋
2. Claude Code로 돌아와서 계속 작업

## 실행

컨텍스트를 내보내고 OpenCode 전환 안내를 제공합니다.
