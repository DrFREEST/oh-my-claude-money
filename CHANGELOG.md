# Changelog / 변경 이력

모든 주요 변경 사항은 이 파일에 기록됩니다.
All notable changes to this project will be documented in this file.

버전 형식: `a.b.c`
- `a` (Major): 대규모 변경 (하위 호환성 최대한 유지, 불가피한 경우 마이그레이션 가이드 제공)
- `b` (Minor): 기능 추가/개선 (c는 0으로 초기화)
- `c` (Patch): 버그 수정

**하위 호환성 정책 / Backward Compatibility Policy:**
- 메이저 버전 업데이트 시에도 기존 설정 및 API와의 호환성을 최대한 유지합니다
- 호환성 파괴가 불가피한 경우, 마이그레이션 스크립트 또는 가이드를 제공합니다
- Deprecated 기능은 최소 1개 Minor 버전 동안 유지 후 제거됩니다
- Major version updates will maintain maximum backward compatibility
- When breaking changes are unavoidable, migration scripts or guides will be provided
- Deprecated features will be maintained for at least 1 minor version before removal

---

## [0.3.3] - 2026-01-26

### 수정 (Fixed)
- **README 명령어 통일**: 모든 `/oh-my-claude-money:*` → `/omcm:*`로 변경
- **HUD 싱크 버그 수정**: `updateClaudeLimits` null 체크 추가로 OMC HUD 값과 동기화 정확도 개선
- **설정 파일 경로**: `~/.claude/plugins/omcm/config.json`으로 통일
- **수동 설치 경로**: `~/.local/share/omcm`으로 통일

### 추가 (Added)
- **참고 소스 추가**: Claude Code Hooks 가이드, CodeSyncer 링크

---

## [0.3.2] - 2026-01-26

### 변경 (Changed)
- **플러그인 이름 단축**: `oh-my-claude-money` → `omcm`
  - 기존: `/oh-my-claude-money:autopilot`
  - 변경: `/omcm:autopilot`
  - 모든 스킬 커맨드가 더 짧고 편리하게 사용 가능

---

## [0.3.1] - 2026-01-26

### 수정 (Fixed)
- **HUD 사용량 동기화**: OMC HUD 출력에서 Claude 사용량(5h/wk)을 파싱하여 provider-limits.json 자동 동기화
  - 기존: 정적 파일만 참조하여 실제 사용량과 1~2% 오차 발생
  - 수정: HUD 렌더링 시마다 OMC 출력에서 실시간 값 추출하여 동기화
- **핸드오프 UX 개선**: `exec` 명령으로 프로세스 교체 방식 적용
  - 기존: 새 프로세스로 OpenCode 실행 (두 CLI 동시 존재)
  - 수정: 같은 터미널에서 Claude Code → OpenCode 자연스럽게 전환

---

## [0.3.0] - 2026-01-26

### 추가 (Added)
- **독립 HUD 래퍼**: OMC HUD를 수정하지 않고 퓨전 메트릭 표시
- **프로바이더 리밋 추적**: Claude(OAuth), OpenAI(헤더), Gemini(로컬 카운팅) 실시간 추적
- **자동 폴백 오케스트레이터**: Claude 90% 도달 시 GPT-5.2-Codex로 자동 전환
- **Handoff 컨텍스트**: 프로바이더 전환 시 `~/.omcm/handoff/context.md` 자동 생성
- **PreToolUse Hook**: Claude Code Task 호출 자동 라우팅
- **OpenCode 자동 실행**: 폴백 활성화 시 실제 OpenCode로 작업 실행
- **독립 디렉토리 구조**: `~/.omcm/` 폴더로 OMC와 완전 분리

### 변경 (Changed)
- 상태 파일 위치: `~/.omc/` → `~/.omcm/`로 이전
- 폴백 임계값: 100% → 90%로 변경
- 복구 임계값: 95% → 85%로 변경

### 수정 (Fixed)
- 퓨전 모드가 실제로 OpenCode로 Task를 라우팅하지 않던 문제
- 프로바이더 전환 시 handoff/context.md가 생성되지 않던 문제

---

## [0.3.0] - 2026-01-26 (English)

### Added
- **Independent HUD Wrapper**: Display fusion metrics without modifying OMC HUD
- **Provider Rate Limit Tracking**: Real-time tracking for Claude (OAuth), OpenAI (headers), Gemini (local counting)
- **Automatic Fallback Orchestrator**: Auto-switch to GPT-5.2-Codex when Claude reaches 90%
- **Handoff Context**: Auto-generate `~/.omcm/handoff/context.md` on provider switch
- **PreToolUse Hook**: Automatic routing of Claude Code Task calls
- **OpenCode Auto-Execution**: Execute tasks via OpenCode when fallback is active
- **Independent Directory Structure**: Fully separated from OMC using `~/.omcm/`

### Changed
- State file location: `~/.omc/` → `~/.omcm/`
- Fallback threshold: 100% → 90%
- Recovery threshold: 95% → 85%

### Fixed
- Fusion mode now actually routes tasks to OpenCode
- Handoff context.md creation on provider switch

---

## [0.2.0] - 2026-01-24

### 추가 (Added)
- 초기 퓨전 오케스트레이터 구현
- OpenCode 워커 풀
- 에이전트 퓨전 맵 (OMC → OpenCode 매핑)
- 기본 설치 스크립트

### Added (English)
- Initial fusion orchestrator implementation
- OpenCode worker pool
- Agent fusion map (OMC → OpenCode mapping)
- Basic installation script

---

## [0.1.0] - 2026-01-23

### 추가 (Added)
- 프로젝트 초기 설정
- 플러그인 기본 구조
- README 및 문서

### Added (English)
- Initial project setup
- Plugin basic structure
- README and documentation
