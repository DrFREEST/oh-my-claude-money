#!/bin/bash
# ============================================================================
# OpenCode Server Management Script
# OMCM 퓨전 라우팅을 위한 OpenCode 서버 관리
# ============================================================================

set -e

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PORT=${OPENCODE_PORT:-4096}
PID_FILE="$HOME/.omcm/opencode-server.pid"
LOG_FILE="$HOME/.omcm/opencode-server.log"

# 디렉토리 생성
mkdir -p "$HOME/.omcm"

usage() {
    echo "사용법: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "명령어:"
    echo "  start   - OpenCode 서버 시작 (백그라운드)"
    echo "  stop    - OpenCode 서버 중지"
    echo "  restart - OpenCode 서버 재시작"
    echo "  status  - 서버 상태 확인"
    echo "  logs    - 서버 로그 확인"
    echo ""
    echo "환경 변수:"
    echo "  OPENCODE_PORT - 서버 포트 (기본: 4096)"
}

is_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

start_server() {
    if is_running; then
        echo -e "${YELLOW}[!]${NC} OpenCode 서버가 이미 실행 중입니다 (PID: $(cat $PID_FILE))"
        return 0
    fi

    echo -e "${BLUE}[*]${NC} OpenCode 서버 시작 중... (포트: $PORT)"

    # 백그라운드 실행
    nohup opencode serve --port "$PORT" > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"

    # 서버 준비 대기 (최대 30초)
    local count=0
    while [[ $count -lt 30 ]]; do
        if curl -s "http://localhost:$PORT/global/health" >/dev/null 2>&1; then
            echo -e "${GREEN}[✓]${NC} OpenCode 서버 시작됨 (PID: $pid, 포트: $PORT)"
            return 0
        fi
        sleep 1
        ((count++))
    done

    echo -e "${RED}[✗]${NC} 서버 시작 타임아웃"
    return 1
}

stop_server() {
    if ! is_running; then
        echo -e "${YELLOW}[!]${NC} OpenCode 서버가 실행 중이 아닙니다"
        rm -f "$PID_FILE"
        return 0
    fi

    local pid=$(cat "$PID_FILE")
    echo -e "${BLUE}[*]${NC} OpenCode 서버 중지 중... (PID: $pid)"

    kill "$pid" 2>/dev/null || true

    # 종료 대기
    local count=0
    while [[ $count -lt 10 ]]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            break
        fi
        sleep 1
        ((count++))
    done

    # 강제 종료
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$PID_FILE"
    echo -e "${GREEN}[✓]${NC} OpenCode 서버 중지됨"
}

show_status() {
    echo -e "${BLUE}=== OpenCode 서버 상태 ===${NC}"
    echo ""

    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "상태: ${GREEN}실행 중${NC}"
        echo "PID: $pid"
        echo "포트: $PORT"

        # 헬스체크
        if curl -s "http://localhost:$PORT/global/health" >/dev/null 2>&1; then
            echo -e "헬스체크: ${GREEN}정상${NC}"
        else
            echo -e "헬스체크: ${YELLOW}응답 없음${NC}"
        fi
    else
        echo -e "상태: ${RED}중지됨${NC}"
    fi

    echo ""
    echo "로그 파일: $LOG_FILE"
    echo "PID 파일: $PID_FILE"
}

show_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        tail -f "$LOG_FILE"
    else
        echo -e "${YELLOW}[!]${NC} 로그 파일이 없습니다: $LOG_FILE"
    fi
}

# 메인
case "${1:-}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        stop_server
        sleep 2
        start_server
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        usage
        exit 1
        ;;
esac
