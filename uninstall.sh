#!/bin/bash
# ============================================================================
# oh-my-claude-money v1.0.0 제거 스크립트
#
# 제거 항목:
# - 플러그인 심볼릭 링크
# - Hooks (PreToolUse) 설정
# - HUD 파일 및 설정
# - 상태 파일 (fusion-state, fallback-state, provider-limits)
# - OMCM 데이터 디렉토리 (~/.omcm/)
# - 프로젝트 상태 디렉토리 (.omc/state/)
# - 마켓플레이스 캐시
# - v1.0.0 추적/컨텍스트 모듈 캐시
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SETTINGS_FILE="$HOME/.claude/settings.json"
OMCM_DATA_DIR="$HOME/.omcm"
OMCM_STATE_DIR="$HOME/.omc/state"
OMCM_HUD_FILE="$HOME/.claude/hud/omcm-hud.mjs"
OMCM_PLUGIN_LINK="$HOME/.claude/plugins/local/oh-my-claude-money"
OMCM_MARKETPLACE_DIR="$HOME/.claude/plugins/marketplaces/omcm"
OMCM_CACHE_DIR="$HOME/.claude/plugins/omcm"

echo -e "${YELLOW}oh-my-claude-money 제거 스크립트${NC}"
echo "========================================"
echo ""

# ============================================================================
# 1. 플러그인 심볼릭 링크 제거
# ============================================================================
echo -e "${BLUE}[1/6]${NC} 플러그인 링크 제거..."
if [[ -L "$OMCM_PLUGIN_LINK" ]]; then
    rm "$OMCM_PLUGIN_LINK"
    echo -e "  ${GREEN}✓${NC} 플러그인 심볼릭 링크 제거됨"
else
    echo -e "  ${YELLOW}-${NC} 플러그인 링크 없음 (이미 제거됨)"
fi

# ============================================================================
# 2. Hooks 설정 제거 (settings.json에서 OMCM 관련 hook 제거)
# ============================================================================
echo -e "${BLUE}[2/6]${NC} Hooks 설정 제거..."
if [[ -f "$SETTINGS_FILE" ]]; then
    # fusion-router 관련 hook 제거
    if grep -qE "fusion-router|omcm|read-optimizer|bash-optimizer|tool-tracker|session-start|detect-handoff|persistent-mode" "$SETTINGS_FILE" 2>/dev/null; then
        node -e "
            const fs = require('fs');
            const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf-8'));
            const h = settings.hooks || {};
            let removed = 0;
            const isOmcm = (entry) => JSON.stringify(entry).includes('omcm');

            for (const event of ['PreToolUse', 'PostToolUse', 'SessionStart', 'UserPromptSubmit', 'Stop']) {
                if (h[event]) {
                    const orig = h[event].length;
                    h[event] = h[event].filter(e => !isOmcm(e));
                    removed += orig - h[event].length;
                    if (h[event].length === 0) delete h[event];
                }
            }

            // enabledPlugins에서 제거
            const ep = settings.enabledPlugins || {};
            for (const key of Object.keys(ep)) {
                if (key.includes('omcm') || key.includes('oh-my-claude-money')) {
                    delete ep[key];
                }
            }
            if (Object.keys(ep).length === 0) delete settings.enabledPlugins;
            else settings.enabledPlugins = ep;

            if (Object.keys(h).length === 0) delete settings.hooks;
            else settings.hooks = h;

            fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));
            console.log('removed:' + removed);
        " 2>/dev/null && echo -e "  ${GREEN}✓${NC} 모든 hooks에서 OMCM 항목 제거됨" || \
            echo -e "  ${YELLOW}!${NC} hooks 설정 수정 실패 (수동 확인 필요)"
    else
        echo -e "  ${YELLOW}-${NC} OMCM hooks 없음"
    fi
else
    echo -e "  ${YELLOW}-${NC} settings.json 없음"
fi

# installed_plugins.json 정리
local installed_file="$HOME/.claude/plugins/installed_plugins.json"
if [[ -f "$installed_file" ]] && command -v jq &>/dev/null; then
    local cleaned
    cleaned=$(jq 'del(.plugins["oh-my-claude-money@local"])' "$installed_file" 2>/dev/null)
    if [[ -n "$cleaned" ]]; then
        echo "$cleaned" > "$installed_file"
        echo -e "  ${GREEN}✓${NC} installed_plugins.json 정리됨"
    fi
fi

# ============================================================================
# 3. HUD 파일 제거
# ============================================================================
echo -e "${BLUE}[3/6]${NC} HUD 파일 제거..."
if [[ -f "$OMCM_HUD_FILE" ]]; then
    rm "$OMCM_HUD_FILE"
    echo -e "  ${GREEN}✓${NC} OMCM HUD 파일 제거됨"

    # HUD 백업 복원 시도
    OMS_HUD_BACKUP="$HOME/.claude/hud/.omc-hud-backup"
    OMC_HUD_DEFAULT="$HOME/.claude/hud/omc-hud.mjs"

    if [[ -f "$OMS_HUD_BACKUP" ]]; then
        if [[ -f "$HOME/.claude/plugins/cache/omc/oh-my-claudecode/src/hud/omc-hud.mjs" ]]; then
            cp "$HOME/.claude/plugins/cache/omc/oh-my-claudecode/src/hud/omc-hud.mjs" "$OMC_HUD_DEFAULT"
            echo -e "  ${GREEN}✓${NC} OMC HUD 복원됨"
        fi
    fi

    # statusLine 설정 복원 (OMC HUD로)
    if [[ -f "$SETTINGS_FILE" ]] && [[ -f "$OMC_HUD_DEFAULT" ]]; then
        node -e "
            const fs = require('fs');
            const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf-8'));

            if (settings.statusLine && settings.statusLine.includes('omcm-hud')) {
                settings.statusLine = 'node ~/.claude/hud/omc-hud.mjs';
                fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));
                console.log('restored');
            }
        " 2>/dev/null && echo -e "  ${GREEN}✓${NC} statusLine을 OMC HUD로 복원됨"
    fi
else
    echo -e "  ${YELLOW}-${NC} OMCM HUD 파일 없음"
fi

# ============================================================================
# 4. 상태/데이터 파일 제거
# ============================================================================
echo -e "${BLUE}[4/6]${NC} 상태 및 데이터 파일 제거..."
REMOVED_FILES=0

# ~/.omcm/ 디렉토리 전체
if [[ -d "$OMCM_DATA_DIR" ]]; then
    rm -rf "$OMCM_DATA_DIR"
    echo -e "  ${GREEN}✓${NC} $OMCM_DATA_DIR 디렉토리 제거됨"
    ((REMOVED_FILES++))
fi

# 개별 상태 파일들 (다른 위치에 있을 수 있음)
for state_file in \
    "$HOME/.claude/fusion-state.json" \
    "$HOME/.claude/fallback-state.json" \
    "$HOME/.claude/provider-limits.json"
do
    if [[ -f "$state_file" ]]; then
        rm "$state_file"
        echo -e "  ${GREEN}✓${NC} $(basename $state_file) 제거됨"
        ((REMOVED_FILES++))
    fi
done

# oh-my-opencode 설정
local omo_config="$HOME/.config/opencode/oh-my-opencode.json"
if [[ -f "$omo_config" ]]; then
    rm "$omo_config"
    echo -e "  ${GREEN}✓${NC} oh-my-opencode.json 제거됨"
    ((REMOVED_FILES++))
fi

if [[ $REMOVED_FILES -eq 0 ]]; then
    echo -e "  ${YELLOW}-${NC} 상태 파일 없음"
fi

# v1.0.0 프로젝트 상태 디렉토리 (.omc/state/)
if [[ -d ".omc/state" ]]; then
    echo -e "  ${YELLOW}!${NC} 프로젝트 .omc/state/ 디렉토리는 수동 제거가 필요합니다"
fi

# ============================================================================
# 5. 마켓플레이스/캐시 디렉토리 제거
# ============================================================================
echo -e "${BLUE}[5/6]${NC} 캐시 및 마켓플레이스 디렉토리 제거..."
CACHE_REMOVED=0

if [[ -d "$OMCM_MARKETPLACE_DIR" ]]; then
    rm -rf "$OMCM_MARKETPLACE_DIR"
    echo -e "  ${GREEN}✓${NC} 마켓플레이스 캐시 제거됨"
    ((CACHE_REMOVED++))
fi

if [[ -d "$OMCM_CACHE_DIR" ]]; then
    rm -rf "$OMCM_CACHE_DIR"
    echo -e "  ${GREEN}✓${NC} 플러그인 캐시 제거됨"
    ((CACHE_REMOVED++))
fi

if [[ $CACHE_REMOVED -eq 0 ]]; then
    echo -e "  ${YELLOW}-${NC} 캐시 디렉토리 없음"
fi

# ============================================================================
# 6. 소스 코드 제거 (선택)
# ============================================================================
echo ""
echo -e "${BLUE}[6/6]${NC} 소스 코드 제거 (선택사항)..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -d "$SCRIPT_DIR" ]] && [[ "$SCRIPT_DIR" != "/" ]]; then
    read -p "소스 코드도 제거하시겠습니까? ($SCRIPT_DIR) [y/N] " confirm
    if [[ "$confirm" =~ ^[Yy] ]]; then
        if [[ "$SCRIPT_DIR" == "/opt/oh-my-claude-money" ]]; then
            sudo rm -rf "$SCRIPT_DIR"
        else
            rm -rf "$SCRIPT_DIR"
        fi
        echo -e "  ${GREEN}✓${NC} 소스 코드 제거됨"
    else
        echo -e "  ${YELLOW}-${NC} 소스 코드 유지됨"
    fi
else
    echo -e "  ${YELLOW}-${NC} 소스 디렉토리 확인 불가"
fi

# ============================================================================
# 완료
# ============================================================================
echo ""
echo "========================================"
echo -e "${GREEN}oh-my-claude-money v1.0.0 제거 완료${NC}"
echo ""
echo -e "${YELLOW}참고:${NC}"
echo "  - Claude Code, OpenCode는 별도로 제거해야 합니다."
echo "  - oh-my-claudecode, oh-my-opencode는 별도 플러그인입니다."
echo "  - 프로젝트별 .omc/ 디렉토리는 수동으로 제거하세요."
echo ""
echo "관련 명령어:"
echo "  claude plugins uninstall omc      # oh-my-claudecode 제거"
echo "  npm uninstall -g opencode-ai      # OpenCode 제거"
echo ""
