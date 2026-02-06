#!/usr/bin/env bash
# auto-update-all.sh - 세션 시작 시 omc, omcm, omo, 플러그인 마켓플레이스 자동 최신화
#
# 24시간 쿨다운: 하루 1회만 실행
# 백그라운드 실행용 (세션 시작 블로킹 방지)
#
# @since v1.3.0

set -euo pipefail

HOME_DIR="${HOME:-/root}"
OMCM_DIR="$HOME_DIR/.omcm"
LOCK_FILE="$OMCM_DIR/last-update.lock"
LOG_FILE="$OMCM_DIR/update.log"
MARKETPLACE_DIR="$HOME_DIR/.claude/plugins/marketplaces"
KNOWN_MARKETPLACES="$HOME_DIR/.claude/plugins/known_marketplaces.json"
COOLDOWN_HOURS=24

# 로그 디렉토리 보장
mkdir -p "$OMCM_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# =============================================================================
# 쿨다운 체크
# =============================================================================

check_cooldown() {
  if [ -f "$LOCK_FILE" ]; then
    local last_update
    last_update=$(cat "$LOCK_FILE" 2>/dev/null || echo "0")
    local now
    now=$(date +%s)
    local diff=$(( now - last_update ))
    local threshold=$(( COOLDOWN_HOURS * 3600 ))

    if [ "$diff" -lt "$threshold" ]; then
      local remaining_hours=$(( (threshold - diff) / 3600 ))
      log "쿨다운 활성: ${remaining_hours}시간 후 재실행 가능"
      exit 0
    fi
  fi
}

# =============================================================================
# 마켓플레이스 Git 업데이트
# =============================================================================

update_marketplace_repo() {
  local name="$1"
  local dir="$MARKETPLACE_DIR/$name"

  if [ ! -d "$dir/.git" ]; then
    log "[$name] git 저장소 아님, 건너뜀"
    return 0
  fi

  cd "$dir"
  local before
  before=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

  if git pull --ff-only --quiet 2>/dev/null; then
    local after
    after=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    if [ "$before" != "$after" ]; then
      log "[$name] 업데이트 완료: ${before:0:7} → ${after:0:7}"
      return 1  # 업데이트됨
    else
      log "[$name] 이미 최신"
    fi
  else
    log "[$name] git pull 실패 (로컬 변경 또는 네트워크 문제)"
  fi
  return 0
}

# =============================================================================
# known_marketplaces.json 타임스탬프 갱신
# =============================================================================

update_marketplace_timestamp() {
  local name="$1"

  if [ ! -f "$KNOWN_MARKETPLACES" ]; then
    return
  fi

  if command -v jq >/dev/null 2>&1; then
    local now_iso
    now_iso=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    local tmp
    tmp=$(mktemp)
    jq --arg name "$name" --arg ts "$now_iso" \
      'if .[$name] then .[$name].lastUpdated = $ts else . end' \
      "$KNOWN_MARKETPLACES" > "$tmp" 2>/dev/null && mv "$tmp" "$KNOWN_MARKETPLACES"
  fi
}

# =============================================================================
# OpenCode + OMO 업데이트
# =============================================================================

update_opencode() {
  if command -v opencode >/dev/null 2>&1; then
    log "[opencode] 업그레이드 시도"
    if opencode upgrade 2>/dev/null; then
      log "[opencode+omo] 업그레이드 완료"
    else
      log "[opencode] 업그레이드 실패 또는 이미 최신"
    fi
  else
    log "[opencode] 미설치, 건너뜀"
  fi
}

# =============================================================================
# 메인
# =============================================================================

main() {
  log "=== 자동 최신화 시작 ==="

  # 쿨다운 확인
  check_cooldown

  local updated_count=0

  # 1. 마켓플레이스 업데이트 (autoUpdate: true인 것만)
  if [ -f "$KNOWN_MARKETPLACES" ] && command -v jq >/dev/null 2>&1; then
    local repos
    repos=$(jq -r 'to_entries[] | select(.value.autoUpdate == true) | .key' "$KNOWN_MARKETPLACES" 2>/dev/null)

    for name in $repos; do
      if update_marketplace_repo "$name"; then
        : # 변경 없음
      else
        updated_count=$((updated_count + 1))
        update_marketplace_timestamp "$name"
      fi
    done
  else
    # jq 없으면 알려진 repos 직접 업데이트
    for name in omc omcm; do
      if update_marketplace_repo "$name"; then
        :
      else
        updated_count=$((updated_count + 1))
      fi
    done
  fi

  # 2. OpenCode + OMO 업데이트
  update_opencode

  # 3. 락파일 갱신
  date +%s > "$LOCK_FILE"

  log "=== 자동 최신화 완료 (업데이트: ${updated_count}개) ==="
}

main "$@"
