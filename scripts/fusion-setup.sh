#!/bin/bash
# ============================================================================
# fusion-setup.sh - OMCM 퓨전 모드 자동 셋업 스크립트
# ============================================================================
#
# 이 스크립트는 다음을 자동으로 설정합니다:
#   1. fusionDefault 설정 (config.json)
#   2. CLAUDE.md 퓨전 지시사항 추가
#   3. OpenCode 프로바이더 인증 상태 확인
#   4. OpenCode 서버 모드 시작 (선택적)
#
# 사용법:
#   ./scripts/fusion-setup.sh
#   또는
#   /omcm:fusion-setup (Claude Code 내에서)
#
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "\n${CYAN}▶ $1${NC}"; }

# ============================================================================
# 1. config.json 설정
# ============================================================================
setup_config() {
    log_step "1. fusionDefault 설정"

    local config_dir="$HOME/.claude/plugins/omcm"
    local config_file="$config_dir/config.json"

    mkdir -p "$config_dir"

    if [[ -f "$config_file" ]]; then
        log_info "기존 설정 파일 발견: $config_file"
        # fusionDefault가 이미 true인지 확인
        if grep -q '"fusionDefault": true' "$config_file" 2>/dev/null; then
            log_success "fusionDefault 이미 활성화됨"
            return 0
        fi
    fi

    cat > "$config_file" << 'EOF'
{
  "fusionDefault": true,
  "threshold": 90,
  "autoHandoff": false,
  "serverPort": 4096
}
EOF

    log_success "config.json 생성 완료 (fusionDefault: true)"
}

# ============================================================================
# 2. CLAUDE.md 퓨전 지시사항 추가
# ============================================================================
setup_claude_md() {
    log_step "2. CLAUDE.md 퓨전 지시사항"

    local claude_md="$HOME/.claude/CLAUDE.md"
    local fusion_marker="# oh-my-claude-money - 퓨전 오케스트레이터"

    # 이미 추가되어 있는지 확인
    if [[ -f "$claude_md" ]] && grep -q "$fusion_marker" "$claude_md" 2>/dev/null; then
        log_success "퓨전 지시사항 이미 존재함"
        return 0
    fi

    # 추가할 내용
    local fusion_instructions='

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
'

    # CLAUDE.md에 추가
    if [[ -f "$claude_md" ]]; then
        echo "$fusion_instructions" >> "$claude_md"
    else
        echo "$fusion_instructions" > "$claude_md"
    fi

    log_success "CLAUDE.md에 퓨전 지시사항 추가 완료"
}

# ============================================================================
# 3. OpenCode 프로바이더 인증 확인
# ============================================================================
check_opencode_auth() {
    log_step "3. OpenCode 프로바이더 인증 확인"

    if ! command -v opencode &> /dev/null; then
        log_warn "OpenCode가 설치되지 않았습니다"
        log_info "설치: npm install -g @anthropics/opencode"
        return 1
    fi

    # 인증 상태 확인
    local auth_output
    auth_output=$(opencode auth list 2>&1) || true

    local has_openai=false
    local has_google=false
    local has_anthropic=false

    if echo "$auth_output" | grep -qi "openai"; then
        has_openai=true
        log_success "OpenAI 인증됨"
    else
        log_warn "OpenAI 미인증 - 'opencode auth login openai' 실행 필요"
    fi

    if echo "$auth_output" | grep -qi "google"; then
        has_google=true
        log_success "Google 인증됨"
    else
        log_warn "Google 미인증 - 'opencode auth login google' 실행 필요"
    fi

    if echo "$auth_output" | grep -qi "anthropic"; then
        has_anthropic=true
        log_success "Anthropic 인증됨"
    fi

    if [[ "$has_openai" == "true" ]] && [[ "$has_google" == "true" ]]; then
        log_success "모든 필수 프로바이더 인증 완료"
        return 0
    else
        log_warn "일부 프로바이더 인증 필요"
        return 1
    fi
}

# ============================================================================
# 4. OpenCode 서버 상태 확인
# ============================================================================
check_opencode_server() {
    log_step "4. OpenCode 서버 상태 확인"

    local port=${OPENCODE_PORT:-4096}

    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
        log_success "OpenCode 서버 실행 중 (포트: $port)"
        return 0
    else
        log_warn "OpenCode 서버 미실행"
        log_info "서버 시작: opencode serve --port $port &"
        log_info "또는: ./scripts/opencode-server.sh start"
        return 1
    fi
}

# ============================================================================
# 메인
# ============================================================================
main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   OMCM 퓨전 모드 자동 셋업             ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""

    local errors=0

    # 1. config.json 설정
    setup_config || ((errors++))

    # 2. CLAUDE.md 설정
    setup_claude_md || ((errors++))

    # 3. OpenCode 인증 확인
    check_opencode_auth || ((errors++))

    # 4. OpenCode 서버 확인
    check_opencode_server || ((errors++))

    echo ""
    echo -e "${CYAN}════════════════════════════════════════${NC}"

    if [[ $errors -eq 0 ]]; then
        log_success "퓨전 셋업 완료!"
        echo ""
        echo -e "테스트: ${GREEN}hulw: 간단한 테스트${NC}"
    else
        log_warn "일부 항목 수동 설정 필요 ($errors개)"
        echo ""
        echo "다음 명령어로 수동 설정:"
        echo -e "  ${CYAN}opencode auth login openai${NC}"
        echo -e "  ${CYAN}opencode auth login google${NC}"
        echo -e "  ${CYAN}./scripts/opencode-server.sh start${NC}"
    fi
    echo ""
}

main "$@"
