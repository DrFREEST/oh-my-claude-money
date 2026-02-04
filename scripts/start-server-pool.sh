#!/bin/bash
#
# start-server-pool.sh - OpenCode 서버 풀 시작
#
# fusionDefault 활성화 시 서버 풀을 미리 대기 상태로 만들어
# 첫 요청부터 빠른 응답을 제공합니다.
#

set -e

# 설정
BASE_PORT=${OMCM_BASE_PORT:-4096}
MIN_SERVERS=${OMCM_MIN_SERVERS:-1}
MAX_SERVERS=${OMCM_MAX_SERVERS:-5}
PID_DIR="$HOME/.omcm/server-pool"
LOG_DIR="$HOME/.omcm/logs"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 디렉토리 생성
mkdir -p "$PID_DIR" "$LOG_DIR"

# OpenCode 확인
check_opencode() {
    if ! command -v opencode &> /dev/null; then
        echo -e "${RED}Error: OpenCode가 설치되지 않았습니다${NC}"
        exit 1
    fi
}

# 서버가 이미 실행 중인지 확인
is_server_running() {
    local port=$1
    local pid_file="$PID_DIR/server-$port.pid"

    # 1. PID 파일로 확인
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0  # 실행 중
        fi
    fi

    # 2. 포트 사용 여부로 확인 (다른 방식으로 시작된 서버)
    if lsof -i :"$port" -sTCP:LISTEN &>/dev/null; then
        return 0  # 실행 중
    fi

    if ss -tlnp 2>/dev/null | grep -q ":$port "; then
        return 0  # 실행 중
    fi

    return 1  # 실행 안 됨
}

# 단일 서버 시작
start_server() {
    local port=$1
    local pid_file="$PID_DIR/server-$port.pid"
    local log_file="$LOG_DIR/server-$port.log"

    if is_server_running "$port"; then
        echo -e "${YELLOW}서버 포트 $port 이미 실행 중${NC}"
        return 0
    fi

    echo -e "${CYAN}서버 시작 중... 포트 $port${NC}"

    # 백그라운드로 서버 시작
    nohup opencode serve --port "$port" > "$log_file" 2>&1 &
    local pid=$!

    echo "$pid" > "$pid_file"

    # 서버 준비 대기 (최대 30초, HTML 응답 기반 헬스체크)
    local max_wait=30
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        if check_server_health_http "$port"; then
            echo -e "${GREEN}서버 포트 $port 준비 완료${NC}"
            return 0
        fi
        sleep 1
        ((++waited))
    done

    echo -e "${RED}서버 포트 $port 시작 타임아웃${NC}"
    return 1
}

# 서버 풀 시작
start_pool() {
    check_opencode

    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}    OpenCode 서버 풀 시작              ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""

    local started=0
    local failed=0

    for ((i=0; i<MIN_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        if start_server "$port"; then
            ((++started))
        else
            ((++failed))
        fi
    done

    echo ""
    echo -e "${GREEN}시작됨: $started${NC}, ${RED}실패: $failed${NC}"

    if [[ $started -gt 0 ]]; then
        echo -e "${GREEN}서버 풀 대기 중 - 첫 요청부터 빠른 응답 가능${NC}"
        return 0
    else
        return 1
    fi
}

# 서버 풀 상태
status_pool() {
    echo -e "${CYAN}서버 풀 상태:${NC}"

    local running=0

    # PID 파일 기반 확인
    for pid_file in "$PID_DIR"/server-*.pid; do
        if [[ -f "$pid_file" ]]; then
            local port=$(basename "$pid_file" | sed 's/server-\([0-9]*\)\.pid/\1/')
            if is_server_running "$port"; then
                echo -e "  ${GREEN}포트 $port: 실행 중 (관리됨)${NC}"
                ((++running))
            else
                echo -e "  ${RED}포트 $port: 중지됨${NC}"
                rm -f "$pid_file"
            fi
        fi
    done

    # 포트 범위 스캔 (PID 파일 없이 실행 중인 서버)
    for ((i=0; i<MAX_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        local pid_file="$PID_DIR/server-$port.pid"

        # 이미 PID 파일로 확인한 경우 스킵
        if [[ -f "$pid_file" ]]; then
            continue
        fi

        if lsof -i :"$port" -sTCP:LISTEN &>/dev/null 2>&1; then
            echo -e "  ${GREEN}포트 $port: 실행 중 (외부)${NC}"
            ((++running))
        fi
    done

    if [[ $running -eq 0 ]]; then
        echo -e "  ${YELLOW}실행 중인 서버 없음${NC}"
    fi

    echo ""
    echo "총 $running 서버 실행 중"
}

# 서버 풀 중지
stop_pool() {
    echo -e "${CYAN}서버 풀 중지 중...${NC}"

    for pid_file in "$PID_DIR"/server-*.pid; do
        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file")
            local port=$(basename "$pid_file" | sed 's/server-\([0-9]*\)\.pid/\1/')

            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null
                echo -e "  ${GREEN}포트 $port 중지됨${NC}"
            fi
            rm -f "$pid_file"
        fi
    done

    echo -e "${GREEN}서버 풀 중지 완료${NC}"
}

# 조용한 시작 (출력 최소화)
start_quiet() {
    check_opencode

    local started=0
    for ((i=0; i<MIN_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        local pid_file="$PID_DIR/server-$port.pid"
        local log_file="$LOG_DIR/server-$port.log"

        if is_server_running "$port"; then
            ((++started))
            continue
        fi

        nohup opencode serve --port "$port" > "$log_file" 2>&1 &
        echo "$!" > "$pid_file"
        ((++started))
    done

    echo "$started"
}

# =============================================================================
# pool-state.json 관리
# =============================================================================

POOL_STATE_FILE="$PID_DIR/pool-state.json"

# pool-state.json 초기화 또는 갱신
init_pool_state() {
    local servers_json="[]"
    local now
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    for ((i=0; i<MAX_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        local pid_file="$PID_DIR/server-$port.pid"
        local pid=0
        local status="stopped"

        if [[ -f "$pid_file" ]]; then
            pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                # 헬스체크로 상태 판단
                if check_server_health_http "$port"; then
                    status="healthy"
                else
                    status="unhealthy"
                fi
            else
                pid=0
                status="stopped"
            fi
        elif check_server_health_http "$port"; then
            # PID 파일 없지만 포트에서 응답하는 외부 서버
            status="healthy"
        fi

        # 기존 상태 파일에서 requests, last_used 보존
        local existing_requests=0
        local existing_last_used="null"

        if [[ -f "$POOL_STATE_FILE" ]] && command -v jq &> /dev/null; then
            existing_requests=$(jq -r --arg p "$port" \
                '(.servers[] | select(.port == ($p | tonumber)) | .requests) // 0' \
                "$POOL_STATE_FILE" 2>/dev/null)
            existing_last_used=$(jq -r --arg p "$port" \
                '(.servers[] | select(.port == ($p | tonumber)) | .last_used) // null' \
                "$POOL_STATE_FILE" 2>/dev/null)
            if [[ "$existing_requests" == "null" ]] || [[ -z "$existing_requests" ]]; then
                existing_requests=0
            fi
        fi

        # 중지된 서버는 JSON에 포함하지 않음 (활성 서버만)
        if [[ "$status" != "stopped" ]]; then
            local last_used_val
            if [[ "$existing_last_used" == "null" ]] || [[ -z "$existing_last_used" ]]; then
                last_used_val="null"
            else
                last_used_val="\"$existing_last_used\""
            fi

            servers_json=$(echo "$servers_json" | jq \
                --argjson port "$port" \
                --argjson pid "$pid" \
                --arg status "$status" \
                --argjson requests "$existing_requests" \
                --argjson last_used "$last_used_val" \
                '. + [{"port": $port, "pid": $pid, "status": $status, "requests": $requests, "last_used": $last_used}]')
        fi
    done

    # 전체 상태 파일 작성
    jq -n \
        --argjson servers "$servers_json" \
        --argjson min "$MIN_SERVERS" \
        --argjson max "$MAX_SERVERS" \
        --argjson base "$BASE_PORT" \
        '{
            "servers": $servers,
            "config": {
                "min_servers": $min,
                "max_servers": $max,
                "base_port": $base,
                "health_interval": 30
            }
        }' > "$POOL_STATE_FILE"
}

# HTTP 헬스체크 (REST API 기반)
# /global/health 엔드포인트에서 JSON 응답을 받아 "healthy":true 확인
check_server_health_http() {
    local port="$1"
    local body
    body=$(curl -s --max-time 2 "http://localhost:$port/global/health" 2>/dev/null)
    if [[ -z "$body" ]]; then
        return 1
    fi
    # JSON 응답에서 "healthy":true 확인
    if echo "$body" | grep -q '"healthy":true'; then
        return 0
    fi
    return 1
}

# 현재 실행 중인 서버 수 카운트
count_running_servers() {
    local count=0
    for ((i=0; i<MAX_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        if is_server_running "$port"; then
            ((++count))
        fi
    done
    echo "$count"
}

# 건강한 서버 수 카운트
count_healthy_servers() {
    local count=0
    for ((i=0; i<MAX_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        if is_server_running "$port" && check_server_health_http "$port"; then
            ((++count))
        fi
    done
    echo "$count"
}

# 유휴 서버 수 카운트 (최근 5분간 사용 안 됨)
count_idle_servers() {
    local count=0
    local now_epoch
    now_epoch=$(date +%s)

    if [[ ! -f "$POOL_STATE_FILE" ]] || ! command -v jq &> /dev/null; then
        echo "0"
        return
    fi

    local server_count
    server_count=$(jq '.servers | length' "$POOL_STATE_FILE" 2>/dev/null)
    if [[ -z "$server_count" ]] || [[ "$server_count" -eq 0 ]]; then
        echo "0"
        return
    fi

    local idx=0
    while [[ $idx -lt $server_count ]]; do
        local last_used
        last_used=$(jq -r ".servers[$idx].last_used" "$POOL_STATE_FILE" 2>/dev/null)

        if [[ "$last_used" == "null" ]] || [[ -z "$last_used" ]]; then
            # 한 번도 사용 안 된 서버는 유휴로 판단
            ((++count))
        else
            # 마지막 사용 시간과 비교 (5분 = 300초)
            local last_epoch
            last_epoch=$(date -d "$last_used" +%s 2>/dev/null || echo "0")
            local diff=$((now_epoch - last_epoch))
            if [[ $diff -gt 300 ]]; then
                ((++count))
            fi
        fi
        ((++idx))
    done

    echo "$count"
}

# 다음 사용 가능한 포트 찾기 (비어있는 포트)
find_next_free_port() {
    for ((i=0; i<MAX_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        if ! is_server_running "$port"; then
            echo "$port"
            return 0
        fi
    done
    return 1
}

# 가장 유휴 상태인 서버 포트 찾기 (축소 대상)
find_most_idle_port() {
    local oldest_port=""
    local oldest_epoch=999999999999

    if [[ ! -f "$POOL_STATE_FILE" ]] || ! command -v jq &> /dev/null; then
        return 1
    fi

    local server_count
    server_count=$(jq '.servers | length' "$POOL_STATE_FILE" 2>/dev/null)
    if [[ -z "$server_count" ]] || [[ "$server_count" -eq 0 ]]; then
        return 1
    fi

    local idx=0
    while [[ $idx -lt $server_count ]]; do
        local port
        local last_used
        port=$(jq -r ".servers[$idx].port" "$POOL_STATE_FILE" 2>/dev/null)
        last_used=$(jq -r ".servers[$idx].last_used" "$POOL_STATE_FILE" 2>/dev/null)

        local epoch=0
        if [[ "$last_used" != "null" ]] && [[ -n "$last_used" ]]; then
            epoch=$(date -d "$last_used" +%s 2>/dev/null || echo "0")
        fi

        if [[ $epoch -lt $oldest_epoch ]]; then
            oldest_epoch=$epoch
            oldest_port=$port
        fi
        ((++idx))
    done

    if [[ -n "$oldest_port" ]]; then
        echo "$oldest_port"
        return 0
    fi
    return 1
}

# Least-connections 정책: 요청 수가 가장 적은 건강한 서버 포트 반환
find_least_connections_port() {
    if [[ ! -f "$POOL_STATE_FILE" ]] || ! command -v jq &> /dev/null; then
        return 1
    fi

    local best_port=""
    local min_requests=999999999

    local server_count
    server_count=$(jq '.servers | length' "$POOL_STATE_FILE" 2>/dev/null)
    if [[ -z "$server_count" ]] || [[ "$server_count" -eq 0 ]]; then
        return 1
    fi

    local idx=0
    while [[ $idx -lt $server_count ]]; do
        local port status requests
        port=$(jq -r ".servers[$idx].port" "$POOL_STATE_FILE" 2>/dev/null)
        status=$(jq -r ".servers[$idx].status" "$POOL_STATE_FILE" 2>/dev/null)
        requests=$(jq -r ".servers[$idx].requests" "$POOL_STATE_FILE" 2>/dev/null)

        if [[ "$status" == "healthy" ]] && [[ "$requests" -lt "$min_requests" ]]; then
            min_requests=$requests
            best_port=$port
        fi
        ((++idx))
    done

    if [[ -n "$best_port" ]]; then
        echo "$best_port"
        return 0
    fi
    return 1
}

# 단일 서버 중지
stop_server() {
    local port=$1
    local pid_file="$PID_DIR/server-$port.pid"

    if [[ -f "$pid_file" ]]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            echo -e "  ${GREEN}포트 $port 중지됨${NC}"
        fi
        rm -f "$pid_file"
    fi
}

# =============================================================================
# autoscale - 부하 기반 서버 수 자동 조절
# =============================================================================

autoscale_pool() {
    check_opencode

    # jq 필수 — 상태 파일 관리에 필요
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}오류: jq가 설치되지 않아 오토스케일을 실행할 수 없습니다${NC}"
        return 1
    fi

    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}    서버풀 오토스케일링                  ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""

    local running
    running=$(count_running_servers)
    local healthy
    healthy=$(count_healthy_servers)
    local idle
    idle=$(count_idle_servers)

    echo -e "  실행 중: ${GREEN}$running${NC}"
    echo -e "  건강함:  ${GREEN}$healthy${NC}"
    echo -e "  유휴:    ${YELLOW}$idle${NC}"
    echo ""

    # 비정상 서버 재시작 (실행 중이지만 헬스체크 실패)
    local restarted=0
    for ((i=0; i<MAX_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        local pid_file="$PID_DIR/server-$port.pid"
        if [[ -f "$pid_file" ]]; then
            local pid
            pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null && ! check_server_health_http "$port"; then
                echo -e "  ${RED}포트 $port 비정상 - 재시작${NC}"
                kill "$pid" 2>/dev/null || true
                sleep 1
                rm -f "$pid_file"
                start_server "$port"
                ((++restarted))
            elif ! kill -0 "$pid" 2>/dev/null; then
                echo -e "  ${RED}포트 $port 프로세스 죽음 - 재시작${NC}"
                rm -f "$pid_file"
                start_server "$port"
                ((++restarted))
            fi
        fi
    done
    if [[ $restarted -gt 0 ]]; then
        echo -e "${GREEN}$restarted 개 비정상 서버 재시작됨${NC}"
        running=$(count_running_servers)
        healthy=$(count_healthy_servers)
        idle=$(count_idle_servers)
    fi

    # 스케일 업: 모든 서버가 busy (유휴 서버 없음) → 새 서버 추가
    if [[ $idle -eq 0 ]] && [[ $running -gt 0 ]] && [[ $running -lt $MAX_SERVERS ]]; then
        local new_port
        new_port=$(find_next_free_port 2>/dev/null) || true
        if [[ -n "$new_port" ]]; then
            echo -e "${CYAN}스케일 업: 포트 $new_port 추가${NC}"
            start_server "$new_port"
            init_pool_state
            echo -e "${GREEN}스케일 업 완료${NC}"
            return 0
        fi
    fi

    # 스케일 다운: 유휴 서버가 MIN 초과 → 축소
    if [[ $idle -gt 0 ]] && [[ $running -gt $MIN_SERVERS ]]; then
        local remove_port
        remove_port=$(find_most_idle_port 2>/dev/null) || true
        if [[ -n "$remove_port" ]]; then
            echo -e "${YELLOW}스케일 다운: 포트 $remove_port 제거${NC}"
            stop_server "$remove_port"
            init_pool_state
            echo -e "${GREEN}스케일 다운 완료${NC}"
            return 0
        fi
    fi

    # 최소 서버 수 미달 → 보충
    if [[ $running -lt $MIN_SERVERS ]]; then
        local deficit=$((MIN_SERVERS - running))
        echo -e "${CYAN}최소 서버 수 미달, $deficit 개 보충${NC}"
        local added=0
        while [[ $added -lt $deficit ]]; do
            local new_port
            new_port=$(find_next_free_port 2>/dev/null) || true
            if [[ -n "$new_port" ]]; then
                start_server "$new_port"
                ((++added))
            else
                break
            fi
        done
        init_pool_state
        return 0
    fi

    echo -e "${GREEN}현재 상태 적정 - 조정 불필요${NC}"
    init_pool_state
}

# =============================================================================
# rebalance - 비정상 서버 재시작
# =============================================================================

rebalance_pool() {
    check_opencode

    # jq 필수 — 상태 파일 정규화에 필요
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}오류: jq가 설치되지 않아 리밸런싱을 실행할 수 없습니다${NC}"
        return 1
    fi

    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}    서버풀 리밸런싱                      ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""

    local restarted=0

    for ((i=0; i<MAX_SERVERS; i++)); do
        local port=$((BASE_PORT + i))
        local pid_file="$PID_DIR/server-$port.pid"

        # PID 파일이 있지만 프로세스가 죽었거나 헬스체크 실패
        if [[ -f "$pid_file" ]]; then
            local pid
            pid=$(cat "$pid_file")

            local needs_restart=false

            # 프로세스 자체가 죽은 경우
            if ! kill -0 "$pid" 2>/dev/null; then
                needs_restart=true
                echo -e "  ${RED}포트 $port: 프로세스 죽음 (PID $pid)${NC}"
            # 프로세스는 있지만 헬스체크 실패
            elif ! check_server_health_http "$port"; then
                needs_restart=true
                echo -e "  ${RED}포트 $port: 헬스체크 실패${NC}"
                # 기존 프로세스 종료
                kill "$pid" 2>/dev/null || true
                sleep 1
            fi

            if [[ "$needs_restart" == "true" ]]; then
                rm -f "$pid_file"
                echo -e "  ${CYAN}포트 $port 재시작 중...${NC}"
                if start_server "$port"; then
                    ((++restarted))
                    echo -e "  ${GREEN}포트 $port 재시작 완료${NC}"
                else
                    echo -e "  ${RED}포트 $port 재시작 실패${NC}"
                fi
            else
                echo -e "  ${GREEN}포트 $port: 정상${NC}"
            fi
        fi
    done

    echo ""
    if [[ $restarted -gt 0 ]]; then
        echo -e "${GREEN}$restarted 개 서버 재시작됨${NC}"
    else
        echo -e "${GREEN}모든 서버 정상 - 재시작 불필요${NC}"
    fi

    # 상태 파일 갱신
    init_pool_state
}

# =============================================================================
# health - 전체 서버 헬스 상태 JSON 출력
# =============================================================================

health_pool() {
    # jq 없으면 상태 파일 생성 불가 — JSON 오류 반환
    if ! command -v jq &> /dev/null; then
        echo '{"error": "jq가 설치되지 않아 상태 파일을 생성할 수 없습니다"}'
        return 1
    fi

    init_pool_state

    if [[ -f "$POOL_STATE_FILE" ]]; then
        jq '.' "$POOL_STATE_FILE"
    else
        echo '{"error": "pool-state.json 생성 실패"}'
        return 1
    fi
}

# =============================================================================
# 메인
# =============================================================================

case "${1:-start}" in
    start)
        start_pool
        # 시작 후 상태 파일 초기화
        if command -v jq &> /dev/null; then
            init_pool_state
        fi
        ;;
    stop)
        stop_pool
        # 중지 후 상태 파일 갱신
        if command -v jq &> /dev/null; then
            init_pool_state
        fi
        ;;
    status)
        status_pool
        ;;
    restart)
        stop_pool
        sleep 2
        start_pool
        if command -v jq &> /dev/null; then
            init_pool_state
        fi
        ;;
    quiet)
        start_quiet
        ;;
    autoscale)
        autoscale_pool
        ;;
    rebalance)
        rebalance_pool
        ;;
    health)
        health_pool
        ;;
    *)
        echo "사용법: $0 {start|stop|status|restart|quiet|autoscale|rebalance|health}"
        exit 1
        ;;
esac
