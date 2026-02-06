#!/bin/bash
# ============================================================================
# fusion-setup.sh - OMCM 퓨전 모드 자동 셋업 스크립트 v2
# ============================================================================
#
# 사용자 피로도를 줄이기 위해 최소한의 설정만 진행합니다.
# 모든 설정은 기본값을 사용하며, 필요시 스킵 가능합니다.
#
# 필수 단계:
#   1. OpenCode 서버 실행 (필수 - 스킵 불가)
#   2. fusionDefault 설정 (기본: true, 스킵 가능)
#   3. CLAUDE.md 퓨전 지시사항 (자동, 스킵 가능)
#   4. OpenCode 프로바이더 인증 확인 (안내만)
#
# 사용법:
#   ./scripts/fusion-setup.sh           # 인터랙티브 모드
#   ./scripts/fusion-setup.sh --quick   # 모든 기본값 사용
#   ./scripts/fusion-setup.sh --help    # 도움말
#
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# 기본값
QUICK_MODE=false
FUSION_DEFAULT=true
THRESHOLD=90
SERVER_PORT=4096
TIMEOUT=300000

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "\n${BOLD}${MAGENTA}▶ $1${NC}"; }

# 도움말
show_help() {
    echo "OMCM 퓨전 셋업 스크립트"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --quick, -q     모든 기본값 사용 (인터랙티브 없음)"
    echo "  --help, -h      이 도움말 표시"
    echo ""
    echo "기본값:"
    echo "  fusionDefault: true"
    echo "  threshold: 90%"
    echo "  serverPort: 4096"
    echo "  timeout: 5분"
    exit 0
}

# 사용자 입력 받기 (Y/n)
ask_yes_no() {
    local prompt="$1"
    local default="$2"

    if [[ "$QUICK_MODE" == "true" ]]; then
        echo "$default"
        return
    fi

    local yn
    if [[ "$default" == "y" ]]; then
        read -p "$prompt [Y/n]: " yn
        yn=${yn:-y}
    else
        read -p "$prompt [y/N]: " yn
        yn=${yn:-n}
    fi

    echo "$yn"
}

# ============================================================================
# 1. OpenCode 서버 실행 (필수 - 스킵 불가!)
# ============================================================================
start_opencode_server() {
    log_step "1. OpenCode 서버 실행 (필수)"

    if ! command -v opencode &> /dev/null; then
        log_error "OpenCode가 설치되지 않았습니다"
        log_info "설치: npm install -g @anthropics/opencode"
        exit 1
    fi

    # 이미 실행 중인지 확인
    if curl -s "http://localhost:$SERVER_PORT/health" >/dev/null 2>&1; then
        log_success "OpenCode 서버 이미 실행 중 (포트: $SERVER_PORT)"
        return 0
    fi

    log_info "OpenCode 서버 시작 중... (포트: $SERVER_PORT)"

    # 백그라운드에서 서버 시작
    nohup opencode serve --port "$SERVER_PORT" > "$HOME/.omcm/opencode-server.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$HOME/.omcm/opencode-server.pid"

    # 서버 준비 대기 (최대 30초)
    local count=0
    while [[ $count -lt 30 ]]; do
        if curl -s "http://localhost:$SERVER_PORT/health" >/dev/null 2>&1; then
            log_success "OpenCode 서버 시작됨 (PID: $pid, 포트: $SERVER_PORT)"
            return 0
        fi
        sleep 1
        ((count++))
        printf "."
    done
    echo ""

    log_error "OpenCode 서버 시작 실패 (타임아웃)"
    log_info "수동 시작: opencode serve --port $SERVER_PORT"
    return 1
}

# ============================================================================
# 2. fusionDefault 설정 (스킵 가능)
# ============================================================================
setup_config() {
    log_step "2. 퓨전 기본 설정"

    local config_dir="$HOME/.claude/plugins/omcm"
    local config_file="$config_dir/config.json"

    mkdir -p "$config_dir"
    mkdir -p "$HOME/.omcm"

    # 기존 설정 확인
    if [[ -f "$config_file" ]]; then
        log_info "기존 설정 파일 발견"
        local answer=$(ask_yes_no "기존 설정을 유지할까요?" "y")
        if [[ "$answer" =~ ^[Yy] ]]; then
            log_success "기존 설정 유지"
            return 0
        fi
    fi

    # 기본값 사용 여부
    local answer=$(ask_yes_no "기본 설정을 사용할까요? (fusionDefault: true, threshold: 90%)" "y")

    if [[ "$answer" =~ ^[Yy] ]]; then
        # 기본값 사용
        cat > "$config_file" << EOF
{
  "fusionDefault": true,
  "threshold": 90,
  "autoHandoff": false,
  "serverPort": $SERVER_PORT,
  "timeout": $TIMEOUT
}
EOF
        log_success "기본 설정 적용됨"
    else
        # 커스텀 설정
        log_info "커스텀 설정 모드"

        local fusion_answer=$(ask_yes_no "fusionDefault 활성화?" "y")
        local fusion_val="true"
        [[ "$fusion_answer" =~ ^[Nn] ]] && fusion_val="false"

        read -p "임계값 (기본: 90): " threshold_input
        local threshold_val=${threshold_input:-90}

        cat > "$config_file" << EOF
{
  "fusionDefault": $fusion_val,
  "threshold": $threshold_val,
  "autoHandoff": false,
  "serverPort": $SERVER_PORT,
  "timeout": $TIMEOUT
}
EOF
        log_success "커스텀 설정 적용됨"
    fi
}

# ============================================================================
# 3. CLAUDE.md 퓨전 지시사항 (스킵 가능)
# ============================================================================
setup_claude_md() {
    log_step "3. CLAUDE.md 퓨전 지시사항"

    local claude_md="$HOME/.claude/CLAUDE.md"
    local fusion_marker="# oh-my-claude-money - 퓨전 오케스트레이터"

    # 이미 추가되어 있는지 확인
    if [[ -f "$claude_md" ]] && grep -q "$fusion_marker" "$claude_md" 2>/dev/null; then
        log_success "퓨전 지시사항 이미 존재함"
        return 0
    fi

    local answer=$(ask_yes_no "CLAUDE.md에 퓨전 지시사항을 추가할까요?" "y")

    if [[ ! "$answer" =~ ^[Yy] ]]; then
        log_info "CLAUDE.md 설정 스킵"
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
| explore, explore-medium | explore | Gemini Flash |
| writer | document-writer | Gemini Flash |

## 퓨전 모드 키워드

- `hulw: <작업>` - 하이브리드 울트라워크 (항상 퓨전)
- `fusion: <작업>` - 명시적 퓨전 모드

## 자동 전환 조건

- 5시간 사용량 90% 이상
- 주간 사용량 90% 이상
'

    if [[ -f "$claude_md" ]]; then
        echo "$fusion_instructions" >> "$claude_md"
    else
        echo "$fusion_instructions" > "$claude_md"
    fi

    log_success "CLAUDE.md에 퓨전 지시사항 추가됨"
}

# ============================================================================
# 4. OpenCode 프로바이더 인증 확인 (안내만)
# ============================================================================
check_opencode_auth() {
    log_step "4. OpenCode 프로바이더 인증 확인"

    local auth_output
    auth_output=$(opencode auth list 2>&1) || true

    local missing_providers=()

    if ! echo "$auth_output" | grep -qi "openai"; then
        missing_providers+=("OpenAI")
    else
        log_success "OpenAI 인증됨"
    fi

    if ! echo "$auth_output" | grep -qi "google"; then
        missing_providers+=("Google")
    else
        log_success "Google 인증됨"
    fi

    if ! echo "$auth_output" | grep -qi "anthropic"; then
        missing_providers+=("Anthropic")
    else
        log_success "Anthropic 인증됨"
    fi

    if [[ ${#missing_providers[@]} -gt 0 ]]; then
        echo ""
        log_warn "다음 프로바이더 인증이 필요합니다:"
        for provider in "${missing_providers[@]}"; do
            echo -e "  ${CYAN}opencode auth login${NC}  # $provider 선택"
        done
        echo ""
        log_info "인증은 브라우저에서 OAuth로 진행됩니다."

        if [[ "$QUICK_MODE" != "true" ]]; then
            local answer=$(ask_yes_no "지금 프로바이더 인증을 진행할까요?" "n")
            if [[ "$answer" =~ ^[Yy] ]]; then
                for provider in "${missing_providers[@]}"; do
                    log_info "$provider 인증 시작..."
                    opencode auth login || true
                done
            fi
        fi
    else
        log_success "모든 프로바이더 인증 완료"
    fi
}

# ============================================================================
# 메인
# ============================================================================
main() {
    # 인자 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick|-q)
                QUICK_MODE=true
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                log_error "알 수 없는 옵션: $1"
                show_help
                ;;
        esac
    done

    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║   ${BOLD}OMCM 퓨전 모드 셋업${NC}${MAGENTA}                              ║${NC}"
    echo -e "${MAGENTA}║   Claude Code ↔ OpenCode 퓨전 오케스트레이터       ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [[ "$QUICK_MODE" == "true" ]]; then
        log_info "Quick 모드: 모든 기본값 사용"
    fi

    local errors=0

    # 1. OpenCode 서버 실행 (필수!)
    start_opencode_server || ((errors++))

    # 2. fusionDefault 설정
    setup_config || ((errors++))

    # 3. CLAUDE.md 설정
    setup_claude_md || ((errors++))

    # 4. 프로바이더 인증 확인
    check_opencode_auth || true  # 인증 실패해도 계속 진행

    # 결과 출력
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"

    if [[ $errors -eq 0 ]]; then
        log_success "퓨전 셋업 완료!"
        echo ""
        echo -e "  ${GREEN}테스트:${NC} hulw: 간단한 테스트"
        echo -e "  ${GREEN}끄기:${NC}   /omcm:fusion-default-off"
        echo -e "  ${GREEN}켜기:${NC}   /omcm:fusion-default-on"
    else
        log_warn "일부 항목에서 오류 발생 ($errors개)"
    fi

    echo ""
    echo -e "${CYAN}설정 파일:${NC}"
    echo "  ~/.claude/plugins/omcm/config.json"
    echo "  ~/.omcm/opencode-server.pid"
    echo "  ~/.omcm/opencode-server.log"
    echo ""
}

main "$@"
