#!/bin/bash
# fusion-bridge.sh - OMC 에이전트 호출을 OpenCode로 라우팅
#
# 사용법:
#   fusion-bridge.sh <omc-agent> "<prompt>" [project-dir]
#
# 예시:
#   fusion-bridge.sh architect "이 코드의 구조를 분석해줘" /opt/myproject

set -e

# =============================================================================
# 설정
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAPPING_FILE="${SCRIPT_DIR}/agent-mapping.json"
OMC_AGENT="${1:-}"
PROMPT="${2:-}"
PROJECT_DIR="${3:-$(pwd)}"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# =============================================================================
# 유틸리티 함수
# =============================================================================

log_info() {
    echo -e "${BLUE}[FUSION]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[FUSION]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[FUSION]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[FUSION]${NC} $1" >&2
}

log_route() {
    echo -e "${MAGENTA}[ROUTE]${NC} $1" >&2
}

# =============================================================================
# 사용법
# =============================================================================

usage() {
    cat << EOF
사용법: fusion-bridge.sh <omc-agent> "<prompt>" [project-dir]

OMC 에이전트 호출을 OpenCode로 라우팅합니다.

인자:
  omc-agent    OMC 에이전트 이름 (예: architect, designer, researcher)
  prompt       작업 프롬프트
  project-dir  프로젝트 디렉토리 (기본값: 현재 디렉토리)

지원 에이전트:
  architect, architect-medium, architect-low
  researcher, researcher-low
  designer, designer-high, designer-low
  vision
  analyst
  scientist, scientist-low, scientist-high
  code-reviewer, code-reviewer-low
  security-reviewer, security-reviewer-low
  explore, explore-medium

예시:
  fusion-bridge.sh architect "이 코드의 구조를 분석해줘"
  fusion-bridge.sh designer "로그인 폼을 만들어줘" /opt/myproject
EOF
    exit 1
}

# =============================================================================
# OpenCode 확인
# =============================================================================

check_opencode() {
    if ! command -v opencode &> /dev/null; then
        log_error "OpenCode가 설치되어 있지 않습니다."
        echo ""
        echo "설치: curl -fsSL https://opencode.ai/install | bash"
        exit 1
    fi
}

# =============================================================================
# 에이전트 매핑 조회
# =============================================================================

get_mapping() {
    local agent="$1"

    if [[ ! -f "$MAPPING_FILE" ]]; then
        log_error "매핑 파일을 찾을 수 없습니다: $MAPPING_FILE"
        exit 1
    fi

    # jq가 있으면 사용, 없으면 python 사용
    if command -v jq &> /dev/null; then
        local mapping=$(jq -r ".mappings[\"$agent\"] // .fallback" "$MAPPING_FILE")
        echo "$mapping"
    elif command -v python3 &> /dev/null; then
        python3 << EOF
import json
import sys

with open("$MAPPING_FILE") as f:
    data = json.load(f)

mapping = data.get("mappings", {}).get("$agent", data.get("fallback", {}))
print(json.dumps(mapping))
EOF
    else
        log_error "jq 또는 python3이 필요합니다."
        exit 1
    fi
}

# =============================================================================
# OpenCode 실행
# =============================================================================

run_opencode() {
    local opencode_agent="$1"
    local model="$2"
    local prompt="$3"

    log_route "${OMC_AGENT} → OpenCode:${opencode_agent} (${model})"

    # 결과 파일 생성
    local result_file=$(mktemp /tmp/fusion-result.XXXXXX)

    # OpenCode 실행
    log_info "OpenCode 실행 중..."

    # opencode run 명령어로 실행
    # --agent: 에이전트 지정
    # --model: 모델 지정
    # 결과를 파일로 저장
    if opencode run \
        --agent "$opencode_agent" \
        --model "$model" \
        "$prompt" \
        2>&1 | tee "$result_file"; then

        log_success "OpenCode 완료"

        # 결과 반환
        cat "$result_file"
        rm -f "$result_file"
        return 0
    else
        log_error "OpenCode 실행 실패"
        rm -f "$result_file"
        return 1
    fi
}

# =============================================================================
# 메인
# =============================================================================

main() {
    # 인자 확인
    if [[ -z "$OMC_AGENT" ]] || [[ -z "$PROMPT" ]]; then
        usage
    fi

    # OpenCode 확인
    check_opencode

    # 에이전트 매핑 조회
    local mapping=$(get_mapping "$OMC_AGENT")

    if [[ -z "$mapping" ]] || [[ "$mapping" == "null" ]]; then
        log_warn "매핑되지 않은 에이전트: $OMC_AGENT (fallback 사용)"
        mapping=$(jq -r ".fallback" "$MAPPING_FILE" 2>/dev/null || echo '{"opencode_agent":"general","model":"openai/gpt-4o-mini"}')
    fi

    # 매핑 파싱
    local opencode_agent
    local model

    if command -v jq &> /dev/null; then
        opencode_agent=$(echo "$mapping" | jq -r '.opencode_agent')
        model=$(echo "$mapping" | jq -r '.model')
    else
        opencode_agent=$(python3 -c "import json; print(json.loads('$mapping')['opencode_agent'])")
        model=$(python3 -c "import json; print(json.loads('$mapping')['model'])")
    fi

    # 프로젝트 디렉토리로 이동
    cd "$PROJECT_DIR"

    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  🔀 FUSION BRIDGE - Claude → OpenCode 라우팅                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "OMC 에이전트: ${OMC_AGENT}"
    log_info "OpenCode 에이전트: ${opencode_agent}"
    log_info "모델: ${model}"
    log_info "프로젝트: ${PROJECT_DIR}"
    echo ""

    # OpenCode 실행
    run_opencode "$opencode_agent" "$model" "$PROMPT"
}

main "$@"
