---
name: fusion-setup
description: oh-my-claude-money 퓨전 플러그인 셋업
---

# oh-my-claude-money 퓨전 셋업

Claude Code ↔ OpenCode 퓨전 오케스트레이터를 설정합니다.

## 셋업 단계

### 1. 글로벌 CLAUDE.md에 퓨전 지시사항 추가

`~/.claude/CLAUDE.md` 파일에 다음 내용을 **추가**하세요 (기존 내용 유지):

```markdown
# oh-my-claude-money - 퓨전 오케스트레이터

## 퓨전 에이전트 매핑

Claude 토큰 절약을 위해 다음 에이전트들은 OpenCode로 라우팅됩니다:

| OMC 에이전트 | OpenCode 에이전트 | 모델 |
|-------------|------------------|------|
| architect, architect-medium, architect-low | Oracle | GPT |
| designer, designer-high, designer-low | Frontend Engineer | Gemini |
| researcher, researcher-low | Oracle | GPT |
| vision | Multimodal Looker | Gemini |
| analyst | Oracle | GPT |
| scientist, scientist-low, scientist-high | Oracle | GPT |
| code-reviewer, code-reviewer-low | Oracle | GPT |
| security-reviewer, security-reviewer-low | Oracle | GPT |

## 퓨전 모드 활성화

사용량이 높거나 토큰 절약이 필요할 때:
- `hulw: <작업>` - 하이브리드 울트라워크 (자동 퓨전)
- `fusion: <작업>` - 명시적 퓨전 모드

## 자동 전환 조건

다음 조건에서 OpenCode로 자동 전환 제안:
- 5시간 사용량 90% 이상
- 주간 사용량 90% 이상
- "opencode", "전환", "handoff" 키워드 감지
```

### 2. 설정 확인

퓨전 설정이 완료되면 다음 명령어로 확인:
- `hulw: 테스트` - 하이브리드 울트라워크 테스트
- OpenCode 프로바이더 상태: `opencode auth status`

### 3. 사용 방법

```
# 일반 작업 (Claude 사용)
ulw: 기능 구현해줘

# 토큰 절약 모드 (OpenCode 퓨전)
hulw: 이 프로젝트 리팩토링해줘

# 명시적 OpenCode 전환
opencode로 전환해줘
```

## 완료

위 내용을 `~/.claude/CLAUDE.md`에 추가했다면 셋업 완료입니다!

**참고:** 이미 omc-setup을 완료한 상태에서 이 명령을 실행해야 합니다.
기존 OMC 지시사항을 유지하면서 퓨전 기능이 추가됩니다.
