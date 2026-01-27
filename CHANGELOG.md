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

## [0.6.0] - 2026-01-27

### 추가 (Added)
- **fusion-setup 자동화 스크립트**: `scripts/fusion-setup.sh`
  - config.json 자동 생성 (fusionDefault: true)
  - CLAUDE.md 퓨전 지시사항 자동 추가
  - OpenCode 프로바이더 인증 상태 확인
  - OpenCode 서버 상태 확인
- **프로젝트 규칙 문서화**: CLAUDE.md에 버전 관리 및 동기화 규칙 추가
  - Semantic Versioning (a.b.c) 방법론
  - 릴리즈 체크리스트
  - 동기화 명령어

### 변경 (Changed)
- **Google 프로바이더 모델 변경**: Antigravity 모델로 업그레이드
  - `gemini-flash` → `google/antigravity-gemini-3-flash`
  - `gemini-pro` → `google/antigravity-gemini-3-pro-high`
- **fusion-router.mjs**: OpenCode 실행 시 `-m` 옵션으로 모델 명시

### 개선 (Improved)
- **퓨전 설정 글로벌 적용**: 한 번 설정하면 모든 프로젝트/세션에서 자동 적용
- **HUD O/G 카운트 정상화**: OpenCode 세션에서 프로바이더별 토큰 집계 수정

---

## [0.5.0] - 2026-01-27

### 추가 (Added)
- **에이전트 퓨전 매핑 v2.0**: OMC 29개 에이전트 → OMO 에이전트 티어별 매핑
  - HIGH (11개): Claude Opus 유지 (architect, planner, critic 등)
  - MEDIUM (10개): **gpt-5.2-codex** (thinking) - executor, researcher, designer 등
  - LOW (8개): **gemini-3.0-flash** (thinking) - explore, writer, *-low 에이전트들
- **Claude 토큰 절약률 62%**: 기존 39%에서 대폭 향상
- **Thinking 모드 기본 활성화**: 모든 외부 모델에서 thinking 모드 사용

### 변경 (Changed)
- **agent-mapping.json**: v2.0으로 전면 재작성
  - 티어별 모델 정의 (opus/sonnet/haiku)
  - 29개 에이전트별 OMO 에이전트 + 모델 매핑
- **agent-fusion-map.mjs**: 새 MODELS/FUSION_MAP 구조로 리팩토링
  - `buildOpenCodeCommand()` 함수 추가 (OpenCode 명령어 생성)
  - `shouldUseFusionMapping()` 함수 추가 (퓨전 모드 활성화 체크)

### 개선 (Improved)
- **기본 모드 분리**: 퓨전/폴백 모드에서만 외부 모델 사용, 기본 모드는 Claude만 사용
- **통계 함수 개선**: `getFusionStats()`, `getAgentsByTier()` 함수 추가

---

## [0.4.0] - 2026-01-27

### 추가 (Added)
- **HUD 토큰 표시**: 프로바이더별 input/output 토큰 실시간 표시
  - Claude: stdin JSON에서 파싱 (`context_window.current_usage`)
  - OpenAI/Gemini: OpenCode 세션 파일 집계 (`~/.local/share/opencode/storage/message/`)
  - 표시 형식: `C:1.2k↓ 567↑|O:25.8k↓ 9↑|G:165.3k↓ 1.4k↑`
- **MCP 서버 연동**: `nosolosoft/opencode-mcp` 통합
  - 6개 도구: `opencode_run`, `opencode_get_status` 등
  - Claude Code에서 OpenCode CLI 직접 호출 가능
- **fusion-router 테스트**: 63개 테스트 케이스 추가
  - shouldRouteToOpenCode(), mapAgentToOpenCode(), wrapWithUlwCommand() 등

### 개선 (Improved)
- **mtime 캐싱**: provider-limits.mjs에 이미 구현됨 확인 (성능 최적화)
- **HUD 가독성**: 토큰 표시 간격 개선 (`↓ ↑` 공백 추가)
- **토큰 계산 정확도**: OpenCode cache.read 토큰 포함

### 수정 (Fixed)
- **HUD 중복 제거**: renderFusionMetrics의 O:x|G:y 중복 출력 제거

---

## [0.3.8] - 2026-01-26

### 수정 (Fixed)
- **[P0] OpenCode CLI 호출 방식 수정**: 라우팅된 작업이 실제로 OpenCode에서 실행되지 않던 문제 해결
  - 이전: `opencode -a Codex` (잘못된 플래그)
  - 변경: `opencode run --agent Codex prompt` (올바른 서브커맨드 및 플래그)
- **프롬프트 전달 방식 개선**: stdin 대신 positional argument로 전달
- **Hook 파일 동기화**: 개발 버전과 설치된 버전 불일치 문제 해결
- **[P0] Gemini Flash 라우팅 수정**: Claude 90%+ 시에도 에이전트 매핑 존중
  - 이전: Claude 리밋 도달 시 모든 에이전트가 무조건 Codex로 라우팅
  - 변경: explore → Flash, architect → Oracle 등 에이전트별 매핑 유지
- **HUD 표시 개선**: API 사용량(%) 대신 라우팅 카운트 표시
  - 이전: `CL:100% OAI:0% GEM:~0%` (업데이트 안됨)
  - 변경: `CL:7 OAI:8 GEM:1` (실제 라우팅 카운트)

### 추가 (Added)
- **SQLite 마이그레이션 스키마**: `migrations/001-add-aggregation-tables.sql` (v1.1.0 준비)
- **README 영문 섹션**: 국제 사용자를 위한 영문 문서 추가
- **데이터 관리 설계서**: `docs/SQLITE-DATA-MANAGEMENT.md`

---

## [0.3.7] - 2026-01-26

### 수정 (Fixed)
- **[P0] fusionDefault 라우팅 버그 수정**: `fusionDefault: true` 설정 시 실제 라우팅이 발생하지 않던 문제 해결
  - 이전: `shouldRouteToOpenCode()`가 `~/.claude/plugins/omcm/config.json`의 `fusionDefault` 설정을 읽지 않음
  - 변경: `fusionDefault: true`일 때 자동으로 에이전트 기반 라우팅 수행
  - 영향: HUD의 퓨전 메트릭(⚡50% 3.0k↗ O:3)이 정상 업데이트됨
- **라우팅 대상 에이전트 확장**: 더 많은 에이전트 타입이 OpenCode로 라우팅됨
  - 추가: `architect-low`, `architect-medium`, `explore-medium`, `explore-high`, `designer-high`, `scientist-high`, `writer`, `vision`, `code-reviewer`, `code-reviewer-low`, `security-reviewer`, `security-reviewer-low`

### 변경 (Changed)
- **fusion-default-on.md**: `~/.omcm/fusion-state.json`도 함께 업데이트하도록 개선

---

## [0.3.6] - 2026-01-26

### 수정 (Fixed)
- **HUD 2중 출력 버그 수정**: wrapper에서 setTimeout/stdin 중복 실행 제거
- **사용량 동기화 버그 수정**: ANSI 색상 코드 제거 후 파싱하도록 개선
  - 이전: `5h:[33m6%[0m` 형태로 인해 regex 매칭 실패
  - 변경: `stripAnsi()` 함수로 색상 코드 제거 후 파싱
- **wrapper 단순화**: spawn 대신 동적 import 사용으로 안정성 향상
- **README 파일 구조 현행화**: 실제 프로젝트 구조와 동기화
- **README 설정 옵션 현행화**: keywords, routing 배열 실제 값과 동기화
- **설정 경로 통일**: fusion-default-on/off 명령어의 경로를 `~/.claude/plugins/omcm/`으로 통일

### 추가 (Added)
- **fusionDefault 설정**: config.mjs에 `fusionDefault: false` 기본값 추가
  - fusion-default-on/off 명령어와 연동
- **버전 동기화**: package.json, plugin.json, marketplace.json 버전 통일

---

## [0.3.5] - 2026-01-26

### 수정 (Fixed)
- **commands 디렉토리 누락 파일 추가**: `/omcm:hulw`, `/omcm:ulw`, `/omcm:autopilot`, `/omcm:opencode` 커맨드 파일 추가
  - 이전: skills 디렉토리에만 존재하여 슬래시 명령어로 인식 안됨
  - 변경: commands 디렉토리에도 추가하여 `/omcm:*` 형태로 호출 가능
- **HUD wrapper 경로 수정**: 플러그인 캐시 경로를 동적으로 찾도록 개선
  - 이전: 하드코딩된 `/opt/oh-my-claude-money` 경로 사용
  - 변경: `~/.claude/plugins/cache/omcm/omcm/{version}` 경로 자동 탐색
- **설정 파일 경로 통일**: 모든 파일에서 `~/.claude/plugins/omcm/config.json` 경로 사용

### 추가 (Added)
- **HUD wrapper 파일**: `src/hud/omcm-hud-wrapper.mjs` 추가 (설치 시 복사용)

### 참고 (Notes)
- 플러그인 재설치 필요: `claude plugins uninstall omcm && claude plugins install omcm`
- HUD wrapper 수동 복사: `cp ~/.claude/plugins/cache/omcm/omcm/0.3.5/src/hud/omcm-hud-wrapper.mjs ~/.claude/hud/omcm-hud.mjs`

---

## [0.3.4] - 2026-01-26

### 수정 (Fixed)
- **스킬 디렉토리 구조 수정**: Claude Code 플러그인 표준 형식으로 변환
  - 기존: `skills/autopilot.md` (단일 파일)
  - 변경: `skills/autopilot/SKILL.md` (폴더 구조)
  - 이로 인해 `/omcm:*` 커맨드가 정상 인식됨
- **커맨드 frontmatter 수정**: `name` 필드 제거 (파일명에서 자동 추론)

### 참고 (Notes)
- 플러그인 재설치 필요: `claude plugins uninstall omcm && claude plugins install omcm`

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
