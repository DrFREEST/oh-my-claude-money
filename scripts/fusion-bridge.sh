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
# 서버풀 설정
# =============================================================================

POOL_BASE_PORT=${OMCM_BASE_PORT:-4096}
POOL_MAX_PORT=${OMCM_MAX_PORT:-4100}
POOL_STATE_DIR="$HOME/.omcm/server-pool"
POOL_STATE_FILE="$POOL_STATE_DIR/pool-state.json"

# =============================================================================
# 서버풀 연동 함수
# =============================================================================

# 서버 헬스체크 (REST API 기반)
# /global/health 엔드포인트에서 JSON 응답을 받아 "healthy":true 확인
check_server_health() {
    local port="$1"
    local body
    body=$(curl -s --max-time 2 "http://localhost:${port}/global/health" 2>/dev/null) || return 1

    if echo "$body" | grep -q '"healthy":true'; then
        return 0
    fi
    return 1
}

# 서버풀에서 사용 가능한 서버 포트 찾기 (least-connections 방식)
find_available_server() {
    local best_port=""
    local best_requests=999999

    # pool-state.json이 있으면 least-connections 기준으로 선택
    if [[ -f "$POOL_STATE_FILE" ]] && command -v jq &> /dev/null; then
        local server_count
        server_count=$(jq '.servers | length' "$POOL_STATE_FILE" 2>/dev/null)

        if [[ -n "$server_count" ]] && [[ "$server_count" -gt 0 ]]; then
            local idx=0
            while [[ $idx -lt $server_count ]]; do
                local port
                local requests
                port=$(jq -r ".servers[$idx].port" "$POOL_STATE_FILE" 2>/dev/null)
                requests=$(jq -r ".servers[$idx].requests // 0" "$POOL_STATE_FILE" 2>/dev/null)

                if [[ -n "$port" ]] && [[ "$port" != "null" ]]; then
                    if check_server_health "$port"; then
                        if [[ "$requests" -lt "$best_requests" ]]; then
                            best_requests="$requests"
                            best_port="$port"
                        fi
                    fi
                fi
                ((++idx))
            done
        fi
    fi

    # pool-state.json이 없거나 결과가 없으면 포트 범위 스캔
    if [[ -z "$best_port" ]]; then
        local port=$POOL_BASE_PORT
        while [[ $port -le $POOL_MAX_PORT ]]; do
            if check_server_health "$port"; then
                best_port="$port"
                break
            fi
            ((++port))
        done
    fi

    if [[ -n "$best_port" ]]; then
        echo "$best_port"
        return 0
    fi

    return 1
}

# 서버풀 상태 파일에 요청 카운트 증가
update_pool_state_request() {
    local port="$1"

    if [[ ! -f "$POOL_STATE_FILE" ]] || ! command -v jq &> /dev/null; then
        return 0
    fi

    local now
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # 해당 포트의 requests 증가, last_used 갱신
    local updated
    updated=$(jq --arg port "$port" --arg now "$now" \
        '(.servers[] | select(.port == ($port | tonumber))) |= (.requests += 1 | .last_used = $now)' \
        "$POOL_STATE_FILE" 2>/dev/null)

    if [[ -n "$updated" ]]; then
        echo "$updated" > "$POOL_STATE_FILE"
    fi
}

# =============================================================================
# 모델 파싱 유틸리티
# =============================================================================

# provider/model 형식에서 providerID와 modelID를 분리
# 예: "openai/gpt-5.2-codex" → providerID=openai, modelID=gpt-5.2-codex
# 예: "claude-opus-4-5-20251101" → providerID=anthropic, modelID=claude-opus-4-5-20251101
parse_provider_model() {
    local full_model="$1"

    if [[ "$full_model" == *"/"* ]]; then
        # provider/model 형식
        PARSED_PROVIDER_ID="${full_model%%/*}"
        PARSED_MODEL_ID="${full_model#*/}"
    else
        # provider 없는 경우 (예: claude-opus-4-5-20251101)
        # claude 계열은 anthropic, 그 외는 openai 기본값
        if [[ "$full_model" == claude-* ]]; then
            PARSED_PROVIDER_ID="anthropic"
        else
            PARSED_PROVIDER_ID="openai"
        fi
        PARSED_MODEL_ID="$full_model"
    fi
}

# =============================================================================
# REST API 응답 대기 (폴링)
# =============================================================================

# 세션의 assistant 응답이 나타날 때까지 폴링
# $1: base_url (예: http://localhost:4096)
# $2: session_id
# $3: max_wait (초, 기본값 60)
wait_for_response() {
    local base_url="$1"
    local session_id="$2"
    local max_wait="${3:-60}"
    local elapsed=0
    local poll_interval=2

    while [[ $elapsed -lt $max_wait ]]; do
        # 메시지 목록 조회
        local messages_response
        messages_response=$(curl -s --max-time 10 \
            "${base_url}/session/${session_id}/message" 2>/dev/null) || true

        if [[ -z "$messages_response" ]]; then
            sleep "$poll_interval"
            elapsed=$((elapsed + poll_interval))
            continue
        fi

        # assistant 역할의 완료된 메시지가 있는지 확인
        # time.completed가 존재하고 parts에 text가 있어야 완료
        local completed_count
        completed_count=$(echo "$messages_response" | jq '
            [.[] | select(.info.role == "assistant" and .info.time.completed != null)
                 | select(.parts | length > 0)
                 | select([.parts[] | select(.type == "text" and .text != null and .text != "")] | length > 0)
            ] | length
        ' 2>/dev/null) || true

        if [[ -n "$completed_count" ]] && [[ "$completed_count" -gt 0 ]]; then
            echo "$messages_response"
            return 0
        fi

        sleep "$poll_interval"
        elapsed=$((elapsed + poll_interval))
    done

    log_error "응답 대기 시간 초과 (${max_wait}초)"
    return 1
}

# =============================================================================
# OpenCode 실행 (REST API 기반)
# =============================================================================

run_opencode() {
    local opencode_agent="$1"
    local model="$2"
    local prompt="$3"

    log_route "${OMC_AGENT} → OpenCode:${opencode_agent} (${model})"

    # 서버풀에서 사용 가능한 서버 검색
    local server_port
    server_port=$(find_available_server 2>/dev/null) || true

    if [[ -z "$server_port" ]]; then
        log_error "서버풀에 사용 가능한 서버가 없습니다."
        log_error "opencode serve --port ${POOL_BASE_PORT} 로 서버를 먼저 시작하세요."
        return 1
    fi

    local base_url="http://localhost:${server_port}"
    log_info "서버풀 연결: ${base_url} (REST API)"
    update_pool_state_request "$server_port"

    # 1. 모델 파싱 (providerID / modelID 분리)
    parse_provider_model "$model"
    log_info "프로바이더: ${PARSED_PROVIDER_ID}, 모델: ${PARSED_MODEL_ID}"

    # 2. 세션 생성
    local session_response
    session_response=$(curl -s --max-time 10 \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{}' \
        "${base_url}/session" 2>/dev/null) || true

    if [[ -z "$session_response" ]]; then
        log_error "세션 생성 실패: 서버 응답 없음"
        return 1
    fi

    local session_id
    session_id=$(echo "$session_response" | jq -r '.id // empty' 2>/dev/null)

    if [[ -z "$session_id" ]]; then
        log_error "세션 생성 실패: 유효한 세션 ID를 받지 못했습니다."
        log_error "응답: ${session_response}"
        return 1
    fi

    log_info "세션 생성 완료: ${session_id}"

    # 3. 프롬프트 전송 (비동기)
    local prompt_body
    prompt_body=$(jq -n \
        --arg provider "$PARSED_PROVIDER_ID" \
        --arg modelId "$PARSED_MODEL_ID" \
        --arg text "$prompt" \
        '{
            "model": {
                "providerID": $provider,
                "modelID": $modelId
            },
            "parts": [
                {
                    "type": "text",
                    "text": $text
                }
            ]
        }')

    local prompt_http_code
    prompt_http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$prompt_body" \
        "${base_url}/session/${session_id}/prompt_async" 2>/dev/null) || true

    if [[ "$prompt_http_code" != "200" ]] && [[ "$prompt_http_code" != "204" ]]; then
        log_error "프롬프트 전송 실패: HTTP ${prompt_http_code}"
        return 1
    fi

    log_info "프롬프트 전송 완료, 응답 대기 중..."

    # 4. 결과 폴링 (최대 60초)
    local messages
    messages=$(wait_for_response "$base_url" "$session_id" 60) || {
        log_error "응답 수신 실패"
        return 1
    }

    # 5. assistant 응답 텍스트 추출 및 출력
    local assistant_text
    assistant_text=$(echo "$messages" | jq -r '
        [.[] | select(.info.role == "assistant") | .parts[]? | select(.type == "text") | .text] | join("\n")
    ' 2>/dev/null)

    if [[ -n "$assistant_text" ]] && [[ "$assistant_text" != "null" ]]; then
        echo "$assistant_text"
    else
        log_warn "assistant 응답에 텍스트가 없습니다."
    fi

    # 6. 토큰 사용량 추출 및 pool-state.json 기록
    local usage_info
    usage_info=$(echo "$messages" | jq '
        [.[] | select(.info.role == "assistant" and .info.tokens != null) | .info.tokens] | last // empty
    ' 2>/dev/null) || true

    if [[ -n "$usage_info" ]] && [[ "$usage_info" != "null" ]] && [[ "$usage_info" != "" ]]; then
        local input_tokens output_tokens
        input_tokens=$(echo "$usage_info" | jq '.input // 0' 2>/dev/null)
        output_tokens=$(echo "$usage_info" | jq '.output // 0' 2>/dev/null)

        log_info "토큰 사용량 - 입력: ${input_tokens}, 출력: ${output_tokens}"

        # pool-state.json에 토큰 정보 기록
        if [[ -f "$POOL_STATE_FILE" ]] && command -v jq &> /dev/null; then
            local now
            now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

            local updated
            updated=$(jq \
                --arg port "$server_port" \
                --arg now "$now" \
                --argjson input "${input_tokens:-0}" \
                --argjson output "${output_tokens:-0}" \
                '(.servers[] | select(.port == ($port | tonumber))) |= (
                    .last_used = $now |
                    .total_input_tokens = ((.total_input_tokens // 0) + $input) |
                    .total_output_tokens = ((.total_output_tokens // 0) + $output)
                )' "$POOL_STATE_FILE" 2>/dev/null) || true

            if [[ -n "$updated" ]]; then
                echo "$updated" > "$POOL_STATE_FILE"
            fi
        fi
    fi

    log_success "OpenCode 완료 (REST API, 포트 ${server_port}, 세션 ${session_id})"
    return 0
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
        opencode_agent=$(echo "$mapping" | jq -r '.omo_agent // .opencode_agent')
        model=$(echo "$mapping" | jq -r '.model')
    else
        opencode_agent=$(python3 -c "import json; m=json.loads('$mapping'); print(m.get('omo_agent', m.get('opencode_agent','general')))")
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
