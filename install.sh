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

    local omc_installed=false

    # 설치 여부 확인
    if [[ -d "$HOME/.claude/plugins/cache/omc" ]] || [[ -d "$HOME/.claude/plugins/local/oh-my-claudecode" ]]; then
        log_success "oh-my-claudecode 이미 설치됨"
        omc_installed=true
    else
        log_info "oh-my-claudecode 설치 중..."

        # GitHub에서 직접 클론 (권장)
        local omc_dir="$HOME/.claude/plugins/local/oh-my-claudecode"
        mkdir -p "$(dirname "$omc_dir")"

        if git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git "$omc_dir" 2>/dev/null; then
            log_success "oh-my-claudecode 설치 완료 (GitHub)"
            omc_installed=true
        else
            # 대체: claude plugins install
            claude plugins install oh-my-claudecode 2>/dev/null && omc_installed=true || {
                log_warn "oh-my-claudecode 설치 실패"
                log_info "수동 설치: git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git ~/.claude/plugins/local/oh-my-claudecode"
            }
        fi
    fi

    # OMC 설정 여부 저장 (나중에 setup에서 사용)
    OMC_INSTALLED=$omc_installed
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
    local installed=false

    # npm이 있으면 npm으로 먼저 시도 (가장 안정적)
    if command -v npm &> /dev/null; then
        log_info "npm으로 설치 시도 중..."
        if npm i -g opencode-ai@latest 2>/dev/null; then
            installed=true
        fi
    fi

    # npm 실패 시 OS별 방법 시도
    if [[ "$installed" == "false" ]]; then
        case $os in
            macos)
                if command -v brew &> /dev/null; then
                    log_info "Homebrew로 설치 시도 중..."
                    brew install opencode && installed=true
                fi
                ;;
            linux)
                log_info "curl 스크립트로 설치 시도 중..."
                curl -fsSL https://opencode.ai/install | bash 2>/dev/null && installed=true
                ;;
            windows)
                # Windows: choco 시도 (scoop은 git 설정 문제 발생 가능)
                if command -v choco &> /dev/null; then
                    log_info "Chocolatey로 설치 시도 중..."
                    choco install opencode -y && installed=true
                fi
                ;;
        esac
    fi

    # 여전히 실패 시 Go로 시도
    if [[ "$installed" == "false" ]] && command -v go &> /dev/null; then
        log_info "Go로 설치 시도 중..."
        go install github.com/sst/opencode@latest && installed=true
    fi

    # PATH 새로고침 후 재확인
    hash -r 2>/dev/null || true

    if command -v opencode &> /dev/null; then
        log_success "OpenCode 설치 완료"
    else
        log_warn "OpenCode 자동 설치 실패"
        log_info "수동 설치 후 새 터미널에서 다시 시도하세요:"
        log_info "  npm i -g opencode-ai@latest"
        log_info ""
        log_info "참고: https://github.com/sst/opencode"
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

    # Claude Code 설정에 플러그인 등록
    register_plugin_to_claude "$source_dir"

    log_success "oh-my-claude-money 설치 완료"
    log_info "  소스: $source_dir"
    log_info "  플러그인: $plugin_dir"
}

# Claude Code Hooks 설정
setup_claude_hooks() {
    local source_dir="$1"
    local settings_file="$HOME/.claude/settings.json"

    log_step "Claude Code Hooks 설정"

    # settings.json 백업
    if [[ -f "$settings_file" ]]; then
        cp "$settings_file" "$settings_file.backup.$(date +%s)"
    fi

    # jq 확인
    if ! command -v jq &> /dev/null; then
        log_warn "jq가 설치되지 않아 hooks 설정을 건너뜁니다"
        log_info "수동 설정: ~/.claude/settings.json에 hooks 추가 필요"
        return 0
    fi

    # 기존 settings 읽기
    local existing_settings="{}"
    if [[ -f "$settings_file" ]]; then
        existing_settings=$(cat "$settings_file")
    fi

    # PreToolUse hook 추가 (Task 라우팅용)
    # 안정적인 경로 사용: 마켓플레이스 설치 위치
    local hook_command="node ~/.claude/plugins/marketplaces/omcm/hooks/fusion-router.mjs"

    # hooks.PreToolUse 배열에 추가
    local updated_settings
    updated_settings=$(echo "$existing_settings" | jq --arg cmd "$hook_command" '
      .hooks = (.hooks // {}) |
      .hooks.PreToolUse = ((.hooks.PreToolUse // []) + [{
        "matcher": "Task",
        "hooks": [{
          "type": "command",
          "command": $cmd,
          "timeout": 120,
          "statusMessage": "퓨전 라우팅 확인 중..."
        }]
      }] | unique_by(.matcher))
    ')

    echo "$updated_settings" > "$settings_file"
    log_success "PreToolUse hook 설정 완료"
}

# Handoff 디렉토리 설정
setup_handoff_directory() {
    log_step "Handoff 디렉토리 설정"

    # 글로벌 handoff 디렉토리
    mkdir -p "$HOME/.omcm/handoff"

    # 기본 상태 파일 생성
    if [[ ! -f "$HOME/.omcm/fusion-state.json" ]]; then
        cat > "$HOME/.omcm/fusion-state.json" << 'FUSION_EOF'
{
  "enabled": true,
  "mode": "balanced",
  "totalTasks": 0,
  "routedToOpenCode": 0,
  "routingRate": 0,
  "estimatedSavedTokens": 0,
  "byProvider": {
    "gemini": 0,
    "openai": 0,
    "anthropic": 0
  },
  "lastUpdated": null
}
FUSION_EOF
        log_success "fusion-state.json 생성"
    fi

    if [[ ! -f "$HOME/.omcm/fallback-state.json" ]]; then
        cat > "$HOME/.omcm/fallback-state.json" << 'FALLBACK_EOF'
{
  "currentModel": {
    "id": "claude-opus-4-5",
    "name": "Claude Opus 4.5",
    "provider": "anthropic",
    "type": "primary"
  },
  "fallbackActive": false,
  "fallbackReason": null,
  "fallbackStartedAt": null,
  "history": []
}
FALLBACK_EOF
        log_success "fallback-state.json 생성"
    fi

    if [[ ! -f "$HOME/.omcm/provider-limits.json" ]]; then
        cat > "$HOME/.omcm/provider-limits.json" << 'LIMITS_EOF'
{
  "claude": {
    "fiveHour": { "used": 0, "limit": 100, "percent": 0 },
    "weekly": { "used": 0, "limit": 100, "percent": 0 },
    "lastUpdated": null
  },
  "openai": {
    "requests": { "remaining": null, "limit": null, "reset": null, "percent": 0 },
    "tokens": { "remaining": null, "limit": null, "reset": null, "percent": 0 },
    "lastUpdated": null
  },
  "gemini": {
    "tier": "free",
    "rpm": { "used": 0, "limit": 15 },
    "tpm": { "used": 0, "limit": 32000 },
    "rpd": { "used": 0, "limit": 1000 },
    "lastUpdated": null
  },
  "lastUpdated": null
}
LIMITS_EOF
        log_success "provider-limits.json 생성"
    fi

    log_success "Handoff 디렉토리 설정 완료"
}

# CodeSyncer 설치 확인 및 안내
check_codesyncer() {
    log_step "CodeSyncer 확인"

    if command -v codesyncer &> /dev/null; then
        log_success "CodeSyncer 설치됨: $(codesyncer --version 2>/dev/null || echo 'installed')"
    else
        log_info "CodeSyncer는 선택적 의존성입니다"
        log_info "태그 기반 코드 동기화가 필요하면 설치하세요:"
        log_info "  npm install -g codesyncer"
    fi
}

# Claude Code에 플러그인 등록
register_plugin_to_claude() {
    local source_dir="$1"
    local settings_file="$HOME/.claude/settings.json"
    local installed_file="$HOME/.claude/plugins/installed_plugins.json"

    log_info "Claude Code에 플러그인 등록 중..."

    # 디렉토리 생성
    mkdir -p "$HOME/.claude/plugins"
    mkdir -p "$HOME/.claude/hud"

    # ==========================================
    # 1. settings.json에 enabledPlugins 추가
    # ==========================================
    if [[ -f "$settings_file" ]]; then
        # 이미 등록되어 있는지 확인
        if grep -q '"oh-my-claude-money@local"' "$settings_file" 2>/dev/null; then
            log_info "settings.json에 이미 등록됨"
        else
            # jq가 있으면 사용, 없으면 sed 사용
            if command -v jq &> /dev/null; then
                local tmp_file=$(mktemp)
                jq '.enabledPlugins["oh-my-claude-money@local"] = true' "$settings_file" > "$tmp_file" && mv "$tmp_file" "$settings_file"
                log_success "settings.json에 플러그인 활성화 추가"
            else
                # sed로 enabledPlugins에 추가
                if grep -q '"enabledPlugins"' "$settings_file"; then
                    sed -i 's/"enabledPlugins": {/"enabledPlugins": {\n    "oh-my-claude-money@local": true,/' "$settings_file"
                    log_success "settings.json에 플러그인 활성화 추가"
                else
                    log_warn "settings.json에 enabledPlugins 섹션이 없습니다"
                fi
            fi
        fi
    else
        # settings.json이 없으면 생성
        cat > "$settings_file" << 'EOF'
{
  "enabledPlugins": {
    "oh-my-claude-money@local": true
  }
}
EOF
        log_success "settings.json 생성 및 플러그인 활성화"
    fi

    # ==========================================
    # 2. installed_plugins.json에 플러그인 등록
    # ==========================================
    local current_date=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

    if [[ -f "$installed_file" ]]; then
        # 이미 등록되어 있는지 확인
        if grep -q '"oh-my-claude-money@local"' "$installed_file" 2>/dev/null; then
            log_info "installed_plugins.json에 이미 등록됨"
        else
            if command -v jq &> /dev/null; then
                local tmp_file=$(mktemp)
                jq --arg path "$source_dir" --arg date "$current_date" \
                   '.plugins["oh-my-claude-money@local"] = [{"scope": "user", "installPath": $path, "version": "0.2.0", "installedAt": $date, "lastUpdated": $date}]' \
                   "$installed_file" > "$tmp_file" && mv "$tmp_file" "$installed_file"
                log_success "installed_plugins.json에 플러그인 등록"
            else
                # sed로 plugins 섹션에 추가
                local plugin_entry='    "oh-my-claude-money@local": [{"scope": "user", "installPath": "'"$source_dir"'", "version": "0.2.0", "installedAt": "'"$current_date"'", "lastUpdated": "'"$current_date"'"}],'
                sed -i 's/"plugins": {/"plugins": {\n'"$plugin_entry"'/' "$installed_file"
                log_success "installed_plugins.json에 플러그인 등록"
            fi
        fi
    else
        # installed_plugins.json이 없으면 생성
        cat > "$installed_file" << EOF
{
  "version": 2,
  "plugins": {
    "oh-my-claude-money@local": [
      {
        "scope": "user",
        "installPath": "$source_dir",
        "version": "0.2.0",
        "installedAt": "$current_date",
        "lastUpdated": "$current_date"
      }
    ]
  }
}
EOF
        log_success "installed_plugins.json 생성"
    fi
}

# HUD 파일 복사
install_hud_files() {
    local source_dir="$1"
    local hud_dir="$HOME/.claude/hud"

    log_step "HUD 파일 복사"

    mkdir -p "$hud_dir"

    # HUD 파일들 복사
    if [[ -f "$source_dir/src/hud/omcm-hud.mjs" ]]; then
        cp "$source_dir/src/hud/omcm-hud.mjs" "$hud_dir/omcm-hud.mjs"
        chmod +x "$hud_dir/omcm-hud.mjs"
        log_success "omcm-hud.mjs 복사 완료"
    fi

    if [[ -f "$source_dir/src/hud/fusion-renderer.mjs" ]]; then
        cp "$source_dir/src/hud/fusion-renderer.mjs" "$hud_dir/fusion-renderer.mjs"
        log_success "fusion-renderer.mjs 복사 완료"
    fi
}

# MCP 서버 설치 (선택사항)
install_mcp_server() {
    log_step "MCP 서버 설치 확인"

    # opencode-mcp 패키지 존재 여부 확인
    if npm list -g opencode-mcp &> /dev/null; then
        log_success "opencode-mcp 이미 설치됨"
        return 0
    fi

    # 사용자에게 선택권 제공 (자동 모드가 아닐 때만)
    if [[ "$AUTO_YES" != "true" ]]; then
        echo ""
        log_info "MCP 서버를 설치하면 Claude Code에서 OpenCode를 도구로 호출할 수 있습니다."
        log_info "설치하지 않아도 OMCM의 기본 기능은 모두 사용 가능합니다."
        echo ""

        prompt_user "opencode-mcp를 설치하시겠습니까? [y/N] " install_mcp

        if [[ ! "$install_mcp" =~ ^[Yy] ]]; then
            log_info "MCP 서버 설치 건너뜀"
            return 0
        fi
    fi

    # opencode-mcp 설치 (현재는 패키지가 없으므로 안내만)
    log_info "opencode-mcp는 현재 개발 중입니다"
    log_info "수동 설치가 필요하면 다음 문서를 참고하세요:"
    log_info "  https://github.com/DrFREEST/oh-my-claude-money#mcp-setup"
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

    if [[ -d "$HOME/.claude/plugins/local/oh-my-claudecode" ]]; then
        echo -e "  ${GREEN}✓${NC} oh-my-claudecode 플러그인"
    else
        echo -e "  ${YELLOW}?${NC} oh-my-claudecode 플러그인"
    fi

    if command -v opencode &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} OpenCode CLI"
    else
        echo -e "  ${YELLOW}?${NC} OpenCode CLI (새 터미널에서 확인)"
    fi

    if [[ -d "$HOME/.config/opencode" ]]; then
        echo -e "  ${GREEN}✓${NC} oh-my-opencode 설정"
    fi

    if [[ -d "$HOME/.claude/plugins/local/oh-my-claude-money" ]]; then
        echo -e "  ${GREEN}✓${NC} oh-my-claude-money 퓨전 플러그인"
    fi

    if [[ -f "$HOME/.claude/hud/omcm-hud.mjs" ]]; then
        echo -e "  ${GREEN}✓${NC} OMCM HUD (토큰 추적)"
    fi

    echo ""
    echo -e "${BOLD}v0.4.0 새 기능:${NC}"
    echo -e "  • 프로바이더별 토큰 사용량 실시간 표시"
    echo -e "  • OpenCode 세션 토큰 자동 집계"
    echo -e "  • HUD에서 Claude/OpenAI/Gemini 토큰 분리 표시"
    echo ""
}

# 다음 단계 안내
print_next_steps() {
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}                    다음 단계 (필수!)                            ${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
    echo ""

    echo -e "${BOLD}${CYAN}Step 1: 새 터미널 열기${NC}"
    echo -e "  설치된 CLI가 PATH에 반영되도록 새 터미널을 여세요."
    echo ""

    echo -e "${BOLD}${CYAN}Step 2: oh-my-claudecode 셋업${NC}"
    echo -e "  ${GREEN}claude${NC} 실행 후 다음 명령어 입력:"
    echo -e "  ${MAGENTA}/oh-my-claudecode:omc-setup${NC}"
    echo ""

    echo -e "${BOLD}${CYAN}Step 3: OpenCode 프로바이더 인증${NC}"
    echo -e "  GPT/Gemini 사용을 위해 프로바이더 인증:"
    echo ""
    echo -e "  ${BOLD}방법 A: 대화형 로그인 (권장)${NC}"
    echo -e "    ${GREEN}opencode auth login${NC}"
    echo -e "    (대화형 메뉴에서 프로바이더 선택 후 로그인)"
    echo ""
    echo -e "  ${BOLD}여러 프로바이더 사용 시:${NC}"
    echo -e "    opencode auth login  ${CYAN}# 메뉴에서 OpenAI 선택${NC}"
    echo -e "    opencode auth login  ${CYAN}# 메뉴에서 Google 선택${NC}"
    echo ""
    echo -e "  ${BOLD}방법 B: 환경 변수${NC}"
    echo -e "    export ANTHROPIC_API_KEY=\"sk-ant-...\"  ${CYAN}# https://console.anthropic.com/settings/keys${NC}"
    echo -e "    export OPENAI_API_KEY=\"sk-...\"         ${CYAN}# https://platform.openai.com/api-keys${NC}"
    echo -e "    export GOOGLE_API_KEY=\"...\"            ${CYAN}# https://aistudio.google.com/apikey${NC}"
    echo ""
    echo -e "  ${BOLD}인증 상태 확인:${NC}"
    echo -e "    opencode auth status"
    echo ""

    echo -e "${BOLD}${CYAN}Step 4: 퓨전 플러그인 셋업${NC}"
    echo -e "  ${GREEN}claude${NC} 실행 후 다음 명령어 입력:"
    echo -e "  ${MAGENTA}/omcm:fusion-setup${NC}"
    echo ""

    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    셋업 완료 후 사용법                          ${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}claude${NC}                          # Claude Code 시작"
    echo ""
    echo -e "${BOLD}키워드 (프롬프트 어디에든 포함):${NC}"
    echo -e "  ${CYAN}hulw${NC}, ${CYAN}/hulw${NC}                    # 항상 퓨전 모드"
    echo -e "  ${CYAN}ulw${NC}, ${CYAN}/ulw${NC}                      # 사용량 기반 자동 전환"
    echo -e "  ${CYAN}autopilot${NC}, ${CYAN}만들어줘${NC}            # 자율 실행 (퓨전 지원)"
    echo -e "  ${CYAN}autopilot hulw${NC}                  # 퓨전 오토파일럿"
    echo -e "  ${CYAN}stop${NC}, ${CYAN}cancel${NC}, ${CYAN}중단${NC}, ${CYAN}취소${NC}      # 진행 중인 작업 중단"
    echo ""
    echo -e "${BOLD}퓨전 기본값 설정:${NC}"
    echo -e "  ${MAGENTA}/omcm:fusion-default-on${NC}   # 항상 퓨전 모드"
    echo -e "  ${MAGENTA}/omcm:fusion-default-off${NC}  # 사용량 기반 (기본)"
    echo ""
    echo -e "${BOLD}토큰 절약 효과:${NC}"
    echo -e "  • 12개 에이전트 (39%)가 GPT/Gemini로 대체"
    echo -e "  • 예상 절약률: 39-67%"
    echo ""
    echo -e "${BOLD}v0.4.0 주요 기능:${NC}"
    echo -e "  • ${CYAN}HUD 토큰 표시${NC}: C:1.2k↓0.5k↑|O:3.4k↓1.2k↑|G:0.8k↓0.3k↑"
    echo -e "  • ${CYAN}자동 토큰 집계${NC}: OpenCode 세션 파일에서 자동 수집"
    echo -e "  • ${CYAN}프로바이더 분리${NC}: Claude/OpenAI/Gemini 사용량 개별 추적"
    echo ""
    echo -e "자세한 내용: ${CYAN}https://github.com/DrFREEST/oh-my-claude-money${NC}"
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

    prompt_user "계속하시겠습니까? [Y/n] " confirm
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
    setup_handoff_directory
    check_codesyncer

    # Hooks 설정 (OMCM_SOURCE_DIR는 install_omcm에서 설정됨)
    if [[ -n "$OMCM_SOURCE_DIR" ]]; then
        setup_claude_hooks "$OMCM_SOURCE_DIR"
        install_hud_files "$OMCM_SOURCE_DIR"
    fi

    # MCP 서버 설치 (선택사항)
    install_mcp_server

    print_summary
    print_next_steps
}

# 인자 파싱
AUTO_YES=false
for arg in "$@"; do
    case $arg in
        -y|--yes|--auto)
            AUTO_YES=true
            ;;
    esac
done

# 사용자 입력 헬퍼 함수
prompt_user() {
    local prompt="$1"
    local var_name="$2"

    if [[ "$AUTO_YES" == "true" ]]; then
        eval "$var_name='y'"
        return 0
    fi

    # 다양한 환경에서 입력 받기 시도
    if [[ -t 0 ]]; then
        read -p "$prompt" "$var_name"
    elif [[ -e /dev/tty ]]; then
        read -p "$prompt" "$var_name" < /dev/tty
    else
        # 입력 불가능하면 기본값 yes
        eval "$var_name='y'"
    fi
}

# 스크립트 실행
main "$@"
