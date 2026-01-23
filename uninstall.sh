#!/bin/bash
# ============================================================================
# oh-my-claude-money 제거 스크립트
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}oh-my-claude-money 제거${NC}"
echo ""

# 플러그인 제거
if [[ -L "$HOME/.claude/plugins/local/oh-my-claude-money" ]]; then
    rm "$HOME/.claude/plugins/local/oh-my-claude-money"
    echo -e "${GREEN}✓${NC} 플러그인 심볼릭 링크 제거됨"
fi

# 설정 제거 (선택)
read -p "설정 파일도 제거하시겠습니까? [y/N] " confirm
if [[ "$confirm" =~ ^[Yy] ]]; then
    rm -rf "$HOME/.claude/plugins/oh-my-claude-money" 2>/dev/null || true
    echo -e "${GREEN}✓${NC} 설정 파일 제거됨"
fi

# 소스 제거 (선택)
read -p "/opt/oh-my-claude-money 소스도 제거하시겠습니까? [y/N] " confirm
if [[ "$confirm" =~ ^[Yy] ]]; then
    sudo rm -rf /opt/oh-my-claude-money 2>/dev/null || true
    echo -e "${GREEN}✓${NC} 소스 파일 제거됨"
fi

echo ""
echo -e "${GREEN}제거 완료${NC}"
echo ""
echo "참고: Claude Code, OpenCode, oh-my-claudecode, oh-my-opencode는"
echo "별도로 제거해야 합니다."
