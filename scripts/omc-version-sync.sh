#!/bin/bash
# omc-version-sync.sh — OMC 버전 업데이트 시 자동 동기화
# 사용법: bash ~/.claude/plugins/omcm/scripts/omc-version-sync.sh
#
# 기능:
# - OMC 마켓플레이스의 package.json에서 현재 버전 읽기
# - 캐시 디렉토리에 해당 버전 디렉토리 없으면 생성
# - 마켓플레이스 소스를 해당 버전 디렉토리로 복사
# - 누락된 중간 버전도 최신으로 채움 (gap 방지)
# - OMCM agent-mapping.json의 omc_version도 자동 업데이트
# - OMCM plugin.json description의 버전 번호도 자동 업데이트

set -e

OMC_MARKETPLACE="$HOME/.claude/plugins/marketplaces/omc"
OMC_CACHE="$HOME/.claude/plugins/cache/omc/oh-my-claudecode"
OMCM_DIR="$HOME/.claude/plugins/omcm"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[OMC Version Sync] 시작...${NC}"

# 1. OMC 현재 버전 확인
if [ ! -f "$OMC_MARKETPLACE/package.json" ]; then
  echo -e "${YELLOW}[OMC Version Sync] 경고: $OMC_MARKETPLACE/package.json 없음${NC}"
  exit 1
fi

CURRENT_VERSION=$(node -e "console.log(require('$OMC_MARKETPLACE/package.json').version)")
echo -e "${GREEN}[OMC Version Sync] 현재 OMC 버전: $CURRENT_VERSION${NC}"

# 2. 캐시 디렉토리가 없으면 생성
mkdir -p "$OMC_CACHE"

# 3. 캐시에 해당 버전 없으면 복사
if [ ! -d "$OMC_CACHE/$CURRENT_VERSION" ]; then
  echo -e "${YELLOW}[OMC Version Sync] 캐시에 $CURRENT_VERSION 없음 → 복사 중...${NC}"

  # 기존 최신 버전을 기반으로 복사
  LATEST=$(find "$OMC_CACHE" -maxdepth 1 -type d -name '[0-9]*' 2>/dev/null | sort -V | tail -1)

  if [ -n "$LATEST" ]; then
    echo -e "${BLUE}[OMC Version Sync] 기존 버전 $LATEST 기반으로 복사${NC}"
    cp -r "$LATEST" "$OMC_CACHE/$CURRENT_VERSION"
  else
    echo -e "${BLUE}[OMC Version Sync] 새 버전 디렉토리 생성${NC}"
    mkdir -p "$OMC_CACHE/$CURRENT_VERSION"
  fi
fi

# 4. 마켓플레이스에서 최신 파일 동기화
echo -e "${BLUE}[OMC Version Sync] 마켓플레이스 → 캐시 동기화 중...${NC}"
rsync -a --exclude='.git' --exclude='node_modules' --exclude='.omc' --exclude='.omcm' "$OMC_MARKETPLACE/" "$OMC_CACHE/$CURRENT_VERSION/"
echo -e "${GREEN}[OMC Version Sync] 동기화 완료${NC}"

# 5. gap 방지: 누락 버전 채우기
echo -e "${BLUE}[OMC Version Sync] 버전 gap 확인 중...${NC}"
MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)

FILLED_COUNT=0
for p in $(seq 0 "$PATCH"); do
  VER="$MAJOR.$MINOR.$p"
  if [ ! -d "$OMC_CACHE/$VER" ]; then
    echo -e "${YELLOW}[OMC Version Sync] 누락 버전 $VER → 최신으로 채움${NC}"
    cp -r "$OMC_CACHE/$CURRENT_VERSION" "$OMC_CACHE/$VER"
    FILLED_COUNT=$((FILLED_COUNT + 1))
  fi
done

if [ $FILLED_COUNT -eq 0 ]; then
  echo -e "${GREEN}[OMC Version Sync] 버전 gap 없음${NC}"
else
  echo -e "${GREEN}[OMC Version Sync] $FILLED_COUNT 개 버전 gap 채움${NC}"
fi

# 6. OMCM agent-mapping.json 버전 업데이트
if [ -f "$OMCM_DIR/scripts/agent-mapping.json" ]; then
  echo -e "${BLUE}[OMC Version Sync] agent-mapping.json 업데이트 중...${NC}"

  node -e "
    var fs = require('fs');
    var path = '$OMCM_DIR/scripts/agent-mapping.json';
    var data = JSON.parse(fs.readFileSync(path, 'utf8'));

    // metadata.omc_version 업데이트
    if (data.metadata) {
      data.metadata.omc_version = '$CURRENT_VERSION';
    }

    // note 필드의 버전 번호 업데이트
    if (data.note) {
      data.note = data.note.replace(/OMC v[0-9.]+/, 'OMC v$CURRENT_VERSION');
    }

    fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  "

  echo -e "${GREEN}[OMC Version Sync] agent-mapping.json 업데이트 완료${NC}"
else
  echo -e "${YELLOW}[OMC Version Sync] 경고: agent-mapping.json 없음${NC}"
fi

# 7. OMCM plugin.json description 업데이트
if [ -f "$OMCM_DIR/.claude-plugin/plugin.json" ]; then
  echo -e "${BLUE}[OMC Version Sync] plugin.json 업데이트 중...${NC}"

  node -e "
    var fs = require('fs');
    var path = '$OMCM_DIR/.claude-plugin/plugin.json';
    var data = JSON.parse(fs.readFileSync(path, 'utf8'));

    // description의 버전 번호 업데이트
    data.description = data.description.replace(/OMC v[0-9.]+/, 'OMC v$CURRENT_VERSION');

    fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  "

  echo -e "${GREEN}[OMC Version Sync] plugin.json 업데이트 완료${NC}"
else
  echo -e "${YELLOW}[OMC Version Sync] 경고: plugin.json 없음${NC}"
fi

# 8. 완료 요약
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}[OMC Version Sync] ✅ 동기화 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  📦 OMC 버전: ${BLUE}$CURRENT_VERSION${NC}"
echo -e "  📂 캐시 경로: ${BLUE}$OMC_CACHE/$CURRENT_VERSION${NC}"
echo -e "  🔧 OMCM 업데이트: ${GREEN}완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
