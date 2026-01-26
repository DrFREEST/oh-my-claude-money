#!/bin/bash
# fusion.sh - 간단한 퓨전 브릿지 호출 래퍼
#
# 사용법:
#   fusion.sh "<prompt>"                    # 기본 에이전트(explore) 사용
#   fusion.sh -a <agent> "<prompt>"         # 특정 에이전트 지정
#   fusion.sh --status                      # 퓨전 상태 확인
#
# 예시:
#   fusion.sh "이 프로젝트의 구조를 분석해줘"
#   fusion.sh -a architect "아키텍처 리뷰해줘"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_SCRIPT="${SCRIPT_DIR}/fusion-bridge.sh"
CONFIG_FILE="${HOME}/.claude/plugins/omcm/config.json"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# 상태 확인
# =============================================================================

show_status() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║  🔀 FUSION MODE 상태                     ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    # 설정 파일 확인
    if [[ -f "$CONFIG_FILE" ]]; then
        echo -e "${GREEN}✓${NC} 설정 파일: ${CONFIG_FILE}"

        if command -v jq &> /dev/null; then
            local fusion_default=$(jq -r '.fusionDefault // false' "$CONFIG_FILE")
            local threshold=$(jq -r '.threshold // 90' "$CONFIG_FILE")
            local auto_handoff=$(jq -r '.autoHandoff // false' "$CONFIG_FILE")

            echo ""
            echo "  퓨전 기본값: ${fusion_default}"
            echo "  임계값: ${threshold}%"
            echo "  자동 핸드오프: ${auto_handoff}"
        else
            cat "$CONFIG_FILE"
        fi
    else
        echo -e "${YELLOW}!${NC} 설정 파일 없음 (기본값 사용)"
    fi

    echo ""

    # OpenCode 확인
    if command -v opencode &> /dev/null; then
        echo -e "${GREEN}✓${NC} OpenCode: $(opencode --version 2>/dev/null || echo '설치됨')"
    else
        echo -e "${YELLOW}!${NC} OpenCode: 미설치"
    fi

    # 브릿지 확인
    if [[ -x "$BRIDGE_SCRIPT" ]]; then
        echo -e "${GREEN}✓${NC} 퓨전 브릿지: 준비됨"
    else
        echo -e "${YELLOW}!${NC} 퓨전 브릿지: 없음"
    fi

    echo ""
    echo "사용법:"
    echo "  fusion.sh \"<prompt>\"              # 기본 탐색"
    echo "  fusion.sh -a architect \"<prompt>\" # 아키텍트 분석"
    echo "  fusion.sh -a designer \"<prompt>\"  # 디자인 작업"
    echo ""
}

# =============================================================================
# 사용법
# =============================================================================

usage() {
    cat << EOF
사용법: fusion.sh [옵션] "<prompt>"

옵션:
  -a, --agent <name>   사용할 에이전트 (기본: explore)
  -d, --dir <path>     프로젝트 디렉토리 (기본: 현재 디렉토리)
  -s, --status         퓨전 상태 확인
  -h, --help           도움말 표시

에이전트 목록:
  explore        코드베이스 탐색 (기본)
  architect      아키텍처 분석
  researcher     문서 리서치
  designer       UI/UX 디자인
  scientist      데이터 분석
  code-reviewer  코드 리뷰

예시:
  fusion.sh "이 프로젝트의 구조를 분석해줘"
  fusion.sh -a architect "아키텍처 리뷰해줘"
  fusion.sh -a designer -d /opt/myproject "로그인 페이지 만들어줘"
EOF
    exit 0
}

# =============================================================================
# 메인
# =============================================================================

main() {
    local agent="explore"
    local project_dir="$(pwd)"
    local prompt=""

    # 인자 파싱
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -a|--agent)
                agent="$2"
                shift 2
                ;;
            -d|--dir)
                project_dir="$2"
                shift 2
                ;;
            -s|--status)
                show_status
                exit 0
                ;;
            -h|--help)
                usage
                ;;
            *)
                prompt="$1"
                shift
                ;;
        esac
    done

    # 프롬프트 확인
    if [[ -z "$prompt" ]]; then
        echo "오류: 프롬프트를 입력하세요."
        echo ""
        usage
    fi

    # 브릿지 실행
    if [[ ! -x "$BRIDGE_SCRIPT" ]]; then
        echo "오류: 퓨전 브릿지를 찾을 수 없습니다: $BRIDGE_SCRIPT"
        exit 1
    fi

    "$BRIDGE_SCRIPT" "$agent" "$prompt" "$project_dir"
}

main "$@"
