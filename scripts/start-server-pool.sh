#!/bin/bash
#
# start-server-pool.sh - OpenCode 서버 풀 시작
#
# fusionDefault 활성화 시 서버 풀을 미리 대기 상태로 만들어
# 첫 요청부터 빠른 응답을 제공합니다.
#

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

    # 서버 준비 대기 (최대 30초)
    local max_wait=30
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            echo -e "${GREEN}서버 포트 $port 준비 완료${NC}"
            return 0
        fi
        sleep 1
        ((waited++))
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
            ((started++))
        else
            ((failed++))
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
                ((running++))
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
            ((running++))
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
            ((started++))
            continue
        fi

        nohup opencode serve --port "$port" > "$log_file" 2>&1 &
        echo "$!" > "$pid_file"
        ((started++))
    done

    echo "$started"
}

# 메인
case "${1:-start}" in
    start)
        start_pool
        ;;
    stop)
        stop_pool
        ;;
    status)
        status_pool
        ;;
    restart)
        stop_pool
        sleep 2
        start_pool
        ;;
    quiet)
        start_quiet
        ;;
    *)
        echo "사용법: $0 {start|stop|status|restart|quiet}"
        exit 1
        ;;
esac
