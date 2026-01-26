#!/bin/bash
# handoff-to-opencode.sh - OpenCode로 작업 전환
#
# 컨텍스트를 내보내고 OpenCode를 실행하여 작업 연속성 유지

set -e

# =============================================================================
# 설정
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="${1:-$(pwd)}"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# 유틸리티 함수
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# OpenCode 확인
# =============================================================================

check_opencode() {
    if ! command -v opencode &> /dev/null; then
        log_error "OpenCode가 설치되어 있지 않습니다."
        echo ""
        echo "설치 방법:"
        echo "  curl -fsSL https://opencode.ai/install | bash"
        echo ""
        echo "또는 GitHub에서 다운로드:"
        echo "  https://github.com/opencode-ai/opencode"
        exit 1
    fi

    log_success "OpenCode 확인됨: $(which opencode)"
}

# =============================================================================
# 컨텍스트 내보내기
# =============================================================================

export_context() {
    log_info "컨텍스트 내보내기 중..."

    # export-context.sh 실행
    local export_script="${SCRIPT_DIR}/export-context.sh"

    if [[ -x "$export_script" ]]; then
        bash "$export_script" "$PROJECT_DIR"
    else
        log_warn "export-context.sh를 찾을 수 없습니다. 직접 실행합니다."
        # 직접 컨텍스트 생성
        local handoff_dir="${PROJECT_DIR}/.omcm/handoff"
        mkdir -p "$handoff_dir"

        local context_file="${handoff_dir}/context.md"
        local timestamp=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S%z)

        cat > "$context_file" << EOF
# 작업 핸드오프

> 시간: ${timestamp}
> 프로젝트: ${PROJECT_DIR}

## 지시사항

이전 Claude Code 세션에서 작업을 이어받습니다.
프로젝트 구조를 파악하고 작업을 계속해주세요.
EOF

        echo "컨텍스트 저장됨: ${context_file}"
    fi
}

# =============================================================================
# 컨텍스트 로드
# =============================================================================

load_context() {
    local context_file="${PROJECT_DIR}/.omcm/handoff/context.md"

    if [[ ! -f "$context_file" ]]; then
        log_error "컨텍스트 파일이 없습니다: ${context_file}"
        log_info "먼저 export-context.sh를 실행하세요."
        exit 1
    fi

    # 컨텍스트 내용 읽기
    local context=$(cat "$context_file")

    # 컨텍스트 길이 제한 (약 50KB)
    local max_length=50000
    if [[ ${#context} -gt $max_length ]]; then
        log_warn "컨텍스트가 너무 깁니다. 일부만 전달합니다."
        context="${context:0:$max_length}

...(truncated - 전체 컨텍스트는 ${context_file} 참조)"
    fi

    echo "$context"
}

# =============================================================================
# OpenCode 실행
# =============================================================================

run_opencode() {
    local context="$1"

    log_info "OpenCode 실행 중..."
    echo ""
    echo "=========================================="
    echo "  OpenCode로 작업을 전환합니다"
    echo "=========================================="
    echo ""

    # OpenCode 실행
    # -c: 작업 디렉토리
    # -p: 초기 프롬프트
    opencode -c "$PROJECT_DIR" -p "$context"
}

# =============================================================================
# 메인
# =============================================================================

main() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║   Claude Code → OpenCode 전환            ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    log_info "프로젝트: ${PROJECT_DIR}"
    echo ""

    # 1. OpenCode 확인
    check_opencode

    # 2. 컨텍스트 내보내기
    export_context

    # 3. 컨텍스트 로드
    local context=$(load_context)

    # 4. OpenCode 실행
    run_opencode "$context"
}

main "$@"
