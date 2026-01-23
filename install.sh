#!/bin/bash
# ============================================================================
# oh-my-claude-money 원클릭 설치 스크립트
# ============================================================================
#
# 이 스크립트는 다음을 자동으로 설치/설정합니다:
#   1. Claude Code CLI + oh-my-claudecode 플러그인
#   2. OpenCode CLI + oh-my-opencode 플러그인
#   3. oh-my-claude-money 퓨전 플러그인
#   4. 멀티 프로바이더 로그인 (Anthropic, OpenAI, Google)
#
# 사용법:
#   curl -fsSL https://raw.githubusercontent.com/user/oh-my-claude-money/main/install.sh | bash
#   또는
#   ./install.sh
#
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# 로고
print_logo() {
    echo -e "${MAGENTA}"
    cat << 'EOF'
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║    ██████╗ ██╗  ██╗    ███╗   ███╗██╗   ██╗                   ║
  ║   ██╔═══██╗██║  ██║    ████╗ ████║╚██╗ ██╔╝                   ║
  ║   ██║   ██║███████║    ██╔████╔██║ ╚████╔╝                    ║
  ║   ██║   ██║██╔══██║    ██║╚██╔╝██║  ╚██╔╝                     ║
  ║   ╚██████╔╝██║  ██║    ██║ ╚═╝ ██║   ██║                      ║
  ║    ╚═════╝ ╚═╝  ╚═╝    ╚═╝     ╚═╝   ╚═╝                      ║
  ║                                                               ║
  ║    ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗           ║
  ║   ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝           ║
  ║   ██║     ██║     ███████║██║   ██║██║  ██║█████╗             ║
  ║   ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝             ║
  ║   ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗           ║
  ║    ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝           ║
  ║                                                               ║
  ║   ███╗   ███╗ ██████╗ ███╗   ██╗███████╗██╗   ██╗             ║
  ║   ████╗ ████║██╔═══██╗████╗  ██║██╔════╝╚██╗ ██╔╝             ║
  ║   ██╔████╔██║██║   ██║██╔██╗ ██║█████╗   ╚████╔╝              ║
  ║   ██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══╝    ╚██╔╝               ║
  ║   ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║███████╗   ██║                ║
  ║   ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝                ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo -e "${CYAN}  Claude Code ↔ OpenCode 퓨전 오케스트레이터${NC}"
    echo -e "${CYAN}  토큰 절약 & 멀티 프로바이더 통합${NC}"
    echo ""
}

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "\n${BOLD}${MAGENTA}▶ $1${NC}"; }

# 진행률 표시
progress_bar() {
    local current=$1
    local total=$2
    local width=40
    local percent=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))

    printf "\r${CYAN}["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] %3d%%${NC}" $percent
}

# OS 감지
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# 패키지 매니저 감지
detect_package_manager() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v pacman &> /dev/null; then
        echo "pacman"
    elif command -v brew &> /dev/null; then
        echo "brew"
    else
        echo "unknown"
    fi
}

# Node.js 설치 확인 및 설치
ensure_nodejs() {
    log_step "Node.js 확인"

    if command -v node &> /dev/null; then
        local version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $version -ge 18 ]]; then
            log_success "Node.js $(node -v) 설치됨"
            return 0
        else
            log_warn "Node.js 버전이 낮습니다 (필요: 18+, 현재: $(node -v))"
        fi
    fi

    log_info "Node.js 18+ 설치 중..."

    local os=$(detect_os)
    local pm=$(detect_package_manager)

    case $pm in
        apt)
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        yum|dnf)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo $pm install -y nodejs
            ;;
        pacman)
            sudo pacman -S nodejs npm --noconfirm
            ;;
        brew)
            brew install node@20
            ;;
        *)
            log_error "패키지 매니저를 감지할 수 없습니다. Node.js 18+를 수동으로 설치해주세요."
            exit 1
            ;;
    esac

    log_success "Node.js $(node -v) 설치 완료"
}

# Claude Code 설치
install_claude_code() {
    log_step "Claude Code CLI 설치"

    if command -v claude &> /dev/null; then
        log_success "Claude Code 이미 설치됨: $(claude --version 2>/dev/null || echo 'installed')"
        return 0
    fi

    log_info "Claude Code 설치 중..."
    npm install -g @anthropic-ai/claude-code

    if command -v claude &> /dev/null; then
        log_success "Claude Code 설치 완료"
    else
        log_error "Claude Code 설치 실패"
        exit 1
    fi
}

# oh-my-claudecode 설치
install_omc() {
    log_step "oh-my-claudecode 플러그인 설치"

    local omc_check=$(claude mcp list 2>/dev/null | grep -i "oh-my-claudecode" || true)

    if [[ -n "$omc_check" ]] || [[ -d "$HOME/.claude/plugins/cache/omc" ]]; then
        log_success "oh-my-claudecode 이미 설치됨"
        return 0
    fi

    log_info "oh-my-claudecode 설치 중..."

    # OMC 설치 (공식 방법)
    claude plugins install oh-my-claudecode 2>/dev/null || {
        # 대체 방법: npm으로 직접 설치
        npm install -g oh-my-claudecode 2>/dev/null || true
    }

    log_success "oh-my-claudecode 설치 완료"
}

# OpenCode 설치
install_opencode() {
    log_step "OpenCode CLI 설치"

    if command -v opencode &> /dev/null; then
        log_success "OpenCode 이미 설치됨: $(opencode --version 2>/dev/null || echo 'installed')"
        return 0
    fi

    log_info "OpenCode 설치 중..."

    local os=$(detect_os)

    # OpenCode 공식 설치 스크립트
    curl -fsSL https://opencode.ai/install.sh | bash 2>/dev/null || {
        # 대체: Go로 직접 설치
        if command -v go &> /dev/null; then
            go install github.com/opencode-ai/opencode@latest
        else
            log_warn "OpenCode 자동 설치 실패. 수동 설치가 필요할 수 있습니다."
            log_info "https://github.com/opencode-ai/opencode 참조"
            return 1
        fi
    }

    if command -v opencode &> /dev/null; then
        log_success "OpenCode 설치 완료"
    else
        log_warn "OpenCode 설치 확인 필요 (PATH에 없을 수 있음)"
    fi
}

# oh-my-opencode 설치
install_omo() {
    log_step "oh-my-opencode 플러그인 설치"

    local config_dir="$HOME/.config/opencode"
    local omo_config="$config_dir/oh-my-opencode.json"

    if [[ -f "$omo_config" ]]; then
        log_success "oh-my-opencode 이미 설정됨"
        return 0
    fi

    log_info "oh-my-opencode 설치 중..."

    # 설정 디렉토리 생성
    mkdir -p "$config_dir"

    # oh-my-opencode 설정 파일 생성
    cat > "$omo_config" << 'EOF'
{
  // oh-my-opencode 기본 설정
  "agents": {
    "Sisyphus": {
      "model": "claude-opus-4-5-20251101",
      "provider": "anthropic"
    },
    "Oracle": {
      "model": "gpt-5.2",
      "provider": "openai"
    },
    "Frontend Engineer": {
      "model": "gemini-3-pro",
      "provider": "google"
    },
    "Librarian": {
      "model": "claude-sonnet-4-5-20251101",
      "provider": "anthropic"
    }
  },
  "ultrawork": {
    "enabled": true,
    "parallelAgents": 3
  }
}
EOF

    log_success "oh-my-opencode 설정 완료"
}

# oh-my-claude-money 설치
install_omcm() {
    log_step "oh-my-claude-money 퓨전 플러그인 설치"

    local plugin_dir="$HOME/.claude/plugins/local/oh-my-claude-money"

    # 소스 디렉토리 결정 (우선순위)
    # 1. 현재 스크립트가 있는 디렉토리 (이미 클론된 경우)
    # 2. 사용자 홈 디렉토리에 설치
    # 3. /opt에 설치 (sudo 필요)
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local source_dir=""

    # 스크립트가 oh-my-claude-money 디렉토리 내에서 실행된 경우
    if [[ -f "$script_dir/src/orchestrator/fusion-orchestrator.mjs" ]]; then
        source_dir="$script_dir"
        log_info "로컬 소스 사용: $source_dir"
    else
        # 사용자 홈에 설치
        source_dir="$HOME/.local/share/oh-my-claude-money"

        if [[ ! -d "$source_dir" ]]; then
            log_info "oh-my-claude-money 다운로드 중..."
            mkdir -p "$(dirname "$source_dir")"

            # GitHub에서 클론
            git clone https://github.com/DrFREEST/oh-my-claude-money.git "$source_dir" 2>/dev/null || {
                # 대체: 릴리스 tarball 다운로드
                local release_url="https://github.com/DrFREEST/oh-my-claude-money/archive/refs/heads/main.tar.gz"
                mkdir -p "$source_dir"
                curl -fsSL "$release_url" | tar -xz -C "$source_dir" --strip-components=1 || {
                    log_error "oh-my-claude-money 다운로드 실패"
                    log_info "수동 설치: git clone https://github.com/DrFREEST/oh-my-claude-money.git"
                    return 1
                }
            }
        fi
    fi

    # 플러그인 디렉토리 생성
    mkdir -p "$(dirname "$plugin_dir")"

    # 심볼릭 링크 생성
    if [[ -L "$plugin_dir" ]] || [[ -d "$plugin_dir" ]]; then
        rm -rf "$plugin_dir"
    fi

    ln -sf "$source_dir" "$plugin_dir"

    # 전역 변수로 저장 (나중에 참조용)
    OMCM_SOURCE_DIR="$source_dir"

    log_success "oh-my-claude-money 설치 완료"
    log_info "  소스: $source_dir"
    log_info "  플러그인: $plugin_dir"
}

# Claude Code 로그인 (Anthropic OAuth)
setup_claude_auth() {
    log_step "Claude Code 인증"

    # 기존 인증 확인
    if claude auth status &>/dev/null; then
        log_success "Claude Code 이미 인증됨"
        return 0
    fi

    echo ""
    echo -e "${CYAN}Claude Code 로그인이 필요합니다.${NC}"
    echo -e "브라우저가 열리면 Anthropic 계정으로 로그인하세요."
    echo ""

    if [[ -t 0 ]]; then
        read -p "지금 로그인하시겠습니까? [Y/n] " confirm
    else
        read -p "지금 로그인하시겠습니까? [Y/n] " confirm < /dev/tty
    fi
    if [[ ! "$confirm" =~ ^[Nn] ]]; then
        claude login || {
            log_warn "Claude 로그인 건너뜀 (나중에 'claude login' 실행)"
        }
    else
        log_warn "Claude 로그인 건너뜀 (나중에 'claude login' 실행)"
    fi
}

# OpenCode 멀티 프로바이더 로그인
setup_opencode_auth() {
    log_step "OpenCode 멀티 프로바이더 인증"

    if ! command -v opencode &>/dev/null; then
        log_warn "OpenCode가 설치되지 않아 인증을 건너뜁니다"
        return 0
    fi

    echo ""
    echo -e "${CYAN}OpenCode는 여러 AI 프로바이더를 지원합니다:${NC}"
    echo -e "  • ${GREEN}Anthropic${NC} (Claude) - 메인 모델"
    echo -e "  • ${GREEN}OpenAI${NC} (GPT) - Oracle 에이전트"
    echo -e "  • ${GREEN}Google${NC} (Gemini) - Frontend Engineer 에이전트"
    echo ""
    echo -e "각 프로바이더에 로그인하면 해당 에이전트를 사용할 수 있습니다."
    echo ""

    # Anthropic 로그인
    echo -e "${BOLD}1/3: Anthropic (Claude)${NC}"
    if opencode auth status anthropic &>/dev/null 2>&1; then
        log_success "Anthropic 이미 인증됨"
    else
        if [[ -t 0 ]]; then
            read -p "Anthropic에 로그인하시겠습니까? [Y/n] " confirm
        else
            read -p "Anthropic에 로그인하시겠습니까? [Y/n] " confirm < /dev/tty
        fi
        if [[ ! "$confirm" =~ ^[Nn] ]]; then
            opencode auth login anthropic || log_warn "Anthropic 로그인 실패/건너뜀"
        fi
    fi
    echo ""

    # OpenAI 로그인
    echo -e "${BOLD}2/3: OpenAI (GPT)${NC}"
    if opencode auth status openai &>/dev/null 2>&1; then
        log_success "OpenAI 이미 인증됨"
    else
        if [[ -t 0 ]]; then
            read -p "OpenAI에 로그인하시겠습니까? (Oracle 에이전트용) [Y/n] " confirm
        else
            read -p "OpenAI에 로그인하시겠습니까? (Oracle 에이전트용) [Y/n] " confirm < /dev/tty
        fi
        if [[ ! "$confirm" =~ ^[Nn] ]]; then
            opencode auth login openai || log_warn "OpenAI 로그인 실패/건너뜀"
        fi
    fi
    echo ""

    # Google 로그인
    echo -e "${BOLD}3/3: Google AI (Gemini)${NC}"
    if opencode auth status google &>/dev/null 2>&1; then
        log_success "Google AI 이미 인증됨"
    else
        if [[ -t 0 ]]; then
            read -p "Google AI에 로그인하시겠습니까? (Frontend Engineer용) [Y/n] " confirm
        else
            read -p "Google AI에 로그인하시겠습니까? (Frontend Engineer용) [Y/n] " confirm < /dev/tty
        fi
        if [[ ! "$confirm" =~ ^[Nn] ]]; then
            opencode auth login google || log_warn "Google 로그인 실패/건너뜀"
        fi
    fi
    echo ""

    log_info "프로바이더 인증 상태 확인: opencode auth status"
}

# OMC 초기 설정
setup_omc() {
    log_step "oh-my-claudecode 초기 설정"

    # OMC 설정 파일 확인
    local omc_config="$HOME/.claude/plugins/oh-my-claudecode/config.json"

    if [[ -f "$omc_config" ]]; then
        log_success "oh-my-claudecode 이미 설정됨"
        return 0
    fi

    log_info "oh-my-claudecode 기본 설정 생성 중..."

    mkdir -p "$(dirname "$omc_config")"

    cat > "$omc_config" << 'EOF'
{
  "hud": {
    "enabled": true,
    "position": "top-right"
  },
  "ultrawork": {
    "maxParallelAgents": 5,
    "autoActivate": true
  },
  "delegation": {
    "enforceOnSourceFiles": true,
    "auditLog": true
  }
}
EOF

    log_success "oh-my-claudecode 설정 완료"
}

# 설치 완료 요약
print_summary() {
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    설치 완료!                                  ${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # 설치된 컴포넌트 확인
    echo -e "${BOLD}설치된 컴포넌트:${NC}"

    if command -v claude &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} Claude Code CLI"
    else
        echo -e "  ${RED}✗${NC} Claude Code CLI"
    fi

    if command -v opencode &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} OpenCode CLI"
    else
        echo -e "  ${YELLOW}?${NC} OpenCode CLI (PATH 확인 필요)"
    fi

    if [[ -d "$HOME/.claude/plugins/local/oh-my-claude-money" ]]; then
        echo -e "  ${GREEN}✓${NC} oh-my-claude-money 퓨전 플러그인"
    fi

    echo ""
    echo -e "${BOLD}인증 상태:${NC}"
    if claude auth status &>/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Claude Code (Anthropic)"
    else
        echo -e "  ${YELLOW}?${NC} Claude Code - 'claude login' 필요"
    fi

    if command -v opencode &>/dev/null; then
        echo -e "  ${CYAN}→${NC} OpenCode 프로바이더: 'opencode auth status'로 확인"
    fi

    echo ""
    echo -e "${BOLD}사용 방법:${NC}"
    echo -e "  ${CYAN}claude${NC}              # Claude Code 시작"
    echo -e "  ${CYAN}opencode${NC}            # OpenCode 시작"
    echo ""
    echo -e "${BOLD}퓨전 울트라워크 사용:${NC}"
    echo -e "  ${CYAN}hulw: <작업>${NC}        # 하이브리드 울트라워크"
    echo -e "  ${CYAN}ulw: <작업>${NC}         # 자동 퓨전 (사용량 높을 때)"
    echo ""
    echo -e "${BOLD}토큰 절약 효과:${NC}"
    echo -e "  • 12개 에이전트 (39%)가 GPT/Gemini로 대체"
    echo -e "  • 예상 절약률: 39-67%"
    echo ""

    echo ""
    echo -e "${BOLD}추가 프로바이더 로그인:${NC}"
    echo -e "  ${CYAN}opencode auth login openai${NC}   # GPT (Oracle 에이전트)"
    echo -e "  ${CYAN}opencode auth login google${NC}   # Gemini (Frontend 에이전트)"
    echo ""

    echo -e "새 터미널을 열거나 ${CYAN}source ~/.bashrc${NC} 실행 후 사용하세요."
    echo ""
}

# 메인 함수
main() {
    print_logo

    echo -e "${BOLD}이 스크립트는 다음을 설치합니다:${NC}"
    echo "  1. Claude Code CLI + oh-my-claudecode"
    echo "  2. OpenCode CLI + oh-my-opencode"
    echo "  3. oh-my-claude-money 퓨전 플러그인"
    echo "  4. 멀티 프로바이더 API 설정"
    echo ""

    # curl | bash로 실행 시 /dev/tty에서 입력 받기
    if [[ -t 0 ]]; then
        read -p "계속하시겠습니까? [Y/n] " confirm
    else
        read -p "계속하시겠습니까? [Y/n] " confirm < /dev/tty
    fi
    if [[ "$confirm" =~ ^[Nn] ]]; then
        echo "설치 취소됨"
        exit 0
    fi

    echo ""

    # 설치 단계
    ensure_nodejs
    install_claude_code
    install_omc
    install_opencode
    install_omo
    install_omcm
    setup_omc

    echo ""
    echo -e "${BOLD}${MAGENTA}▶ 인증 설정${NC}"
    echo ""

    setup_claude_auth
    setup_opencode_auth

    print_summary
}

# 스크립트 실행
main "$@"
