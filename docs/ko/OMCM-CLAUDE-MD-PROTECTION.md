# OMCM CLAUDE.md 덮어쓰기 방지 가이드

> **버전 기준 (OMC 4.2.15):** 본 문서는 `gpt-5.3`, `gpt-5.3-codex`, `gemini-3-flash`, `gemini-3-pro`를 기본으로 설명합니다. `researcher`, `tdd-guide`, `*-low`/`*-medium` 표기는 하위호환(legacy) 맥락에서만 유지됩니다.

## 문제 상황

OMC (oh-my-claudecode)가 업데이트될 때 `~/.claude/CLAUDE.md` 파일이 덮어씌워질 수 있습니다.
OMCM의 MCP-First 프로토콜 등 중요한 커스터마이징이 손실될 위험이 있습니다.

## 해결 방안: 보호 마커 시스템

### 1. 마커 구조

`~/.claude/CLAUDE.md` 파일에 다음 마커들이 적용되어 있습니다:

```markdown
<!-- OMC:START -->
... OMC 기본 내용 ...
<!-- OMC:END -->

---

<!-- OMCM:MCP-DIRECT:START — DO NOT MODIFY: OMCM v3.0 MCP-First Protocol -->
## MCP-Direct Rules (MANDATORY — OMCM MCP-First v3.0)
... OMCM MCP-First 프로토콜 ...
<!-- OMCM:MCP-DIRECT:END -->

---

<!-- OMCM:START — DO NOT MODIFY: User customizations for oh-my-claude-money -->
# oh-my-claude-money - Fusion Orchestrator
... OMCM 퓨전 설정 ...
<!-- OMCM:END -->
```

### 2. 마커 의미

| 마커 | 설명 | 관리 주체 |
|------|------|----------|
| `<!-- OMC:START/END -->` | OMC 핵심 콘텐츠 | OMC 업데이트 시 관리 |
| `<!-- OMCM:MCP-DIRECT:START/END -->` | MCP-First 프로토콜 | OMCM이 관리, 수동 보호 필요 |
| `<!-- OMCM:START/END -->` | OMCM 퓨전 설정 | OMCM이 관리, 수동 보호 필요 |

### 3. OMC 업데이트 시 보호 절차

#### 방법 A: 백업 후 복원 (권장)

```bash
# 1. 업데이트 전 백업
cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.backup

# 2. OMC 업데이트 실행
# (OMC 업데이트 명령 실행)

# 3. OMCM 섹션 복원
sed -n '/<!-- OMCM:MCP-DIRECT:START/,/<!-- OMCM:END -->/p' \
  ~/.claude/CLAUDE.md.backup >> ~/.claude/CLAUDE.md
```

#### 방법 B: 자동 보호 스크립트

`/opt/oh-my-claude-money/scripts/protect-claude-md.sh` 생성:

```bash
#!/bin/bash
# OMCM CLAUDE.md 보호 스크립트

CLAUDE_MD="$HOME/.claude/CLAUDE.md"
BACKUP="$CLAUDE_MD.omcm-backup"

# 백업
cp "$CLAUDE_MD" "$BACKUP"

# OMCM 섹션 추출
OMCM_CONTENT=$(sed -n '/<!-- OMCM:MCP-DIRECT:START/,/<!-- OMCM:END -->/p' "$BACKUP")

# OMC 업데이트 후 훅에서 호출될 함수
restore_omcm_sections() {
  # OMCM 섹션이 없으면 추가
  if ! grep -q "<!-- OMCM:MCP-DIRECT:START" "$CLAUDE_MD"; then
    echo "" >> "$CLAUDE_MD"
    echo "---" >> "$CLAUDE_MD"
    echo "" >> "$CLAUDE_MD"
    echo "$OMCM_CONTENT" >> "$CLAUDE_MD"
  fi
}

restore_omcm_sections
```

### 4. 수동 검증 체크리스트

OMC 업데이트 후 다음을 확인하세요:

- [ ] `~/.claude/CLAUDE.md`에 `<!-- OMCM:MCP-DIRECT:START -->` 마커 존재
- [ ] MCP-Direct Rules 섹션에 ask_codex/ask_gemini 테이블 존재
- [ ] `<!-- OMCM:START -->` 마커 이후 Fusion Orchestrator 섹션 존재
- [ ] 마지막에 `<!-- OMCM:END -->` 마커 존재

### 5. 복원 명령 (섹션 손실 시)

```bash
# OMCM 섹션 재생성
cat >> ~/.claude/CLAUDE.md << 'EOF'

---

<!-- OMCM:MCP-DIRECT:START — DO NOT MODIFY: OMCM v3.0 MCP-First Protocol -->
## MCP-Direct Rules (MANDATORY — OMCM MCP-First v3.0)

**CRITICAL**: 아래 에이전트를 Task(subagent_type)로 스폰하지 마세요. 대신 해당 MCP 도구를 직접 호출하세요.
OMCM hook이 이 에이전트들의 Task 호출을 자동 차단합니다.

| MCP 도구 | 에이전트 역할 (agent_role) |
|----------|--------------------------|
| `ask_codex` | architect, debugger, verifier, code-reviewer, style-reviewer, quality-reviewer, api-reviewer, performance-reviewer, security-reviewer, test-engineer, planner, critic, analyst |
| `ask_gemini` | designer, writer, vision, ux-researcher |

**Task(subagent_type)로 스폰해야 하는 에이전트** (도구 접근 필요):
`executor`, `deep-executor`, `explore`, `build-fixer`, `qa-tester`, `git-master`, `scientist`, `dependency-expert`, `product-manager`

**패턴**: "생각은 O/G, 실행만 Claude"
1. 분석/계획 → `ask_codex` (architect/planner role)
2. 리뷰/검증 → `ask_codex` (code-reviewer/verifier role)
3. 디자인/문서 → `ask_gemini` (designer/writer role)
4. 코드 수정 → Task(executor) — Claude agent

MCP 미설치/실패 시: 동등한 Claude agent로 폴백.
전체 MCP 라우팅 테이블: `~/.claude/docs/omc-ref.md` 참조.
<!-- OMCM:MCP-DIRECT:END -->

---

<!-- OMCM:START — DO NOT MODIFY: User customizations for oh-my-claude-money -->
# oh-my-claude-money - Fusion Orchestrator

## Fusion Agent Mapping

| OMC Agent | OpenCode Agent | Model |
|-----------|---------------|-------|
| architect, debugger | Oracle | GPT |
| designer, vision | Frontend Engineer | Gemini |
| analyst, scientist, code-reviewer, security-reviewer | Oracle | GPT |
| writer, style-reviewer | General | Gemini 3 Flash |

## Fusion Activation

- `hulw: <task>` - Hybrid ultrawork (auto fusion)
- `fusion: <task>` - Explicit fusion mode

## Auto-switch Conditions

- 5hr usage 90%+, weekly usage 90%+, or "opencode"/"handoff" keyword detected

<!-- OMCM:END -->
EOF
```

## 장기 해결책: OMC에 패치 제출

OMC 업데이트 스크립트에 OMCM 마커 보존 로직 추가를 제안할 수 있습니다:

```bash
# OMC install.sh에 추가할 로직 예시
if grep -q "<!-- OMCM:START" "$HOME/.claude/CLAUDE.md"; then
  # OMCM 섹션 백업
  sed -n '/<!-- OMCM:MCP-DIRECT:START/,/<!-- OMCM:END -->/p' \
    "$HOME/.claude/CLAUDE.md" > /tmp/omcm-backup.md

  # OMC 업데이트
  # ...

  # OMCM 섹션 복원
  cat /tmp/omcm-backup.md >> "$HOME/.claude/CLAUDE.md"
fi
```

## 참고

- OMCM 버전: v3.0 (MCP-First)
- 마커 추가 날짜: 2026-01-27
- 관련 이슈: Phase 2 - Conductor 프로토콜 강화
