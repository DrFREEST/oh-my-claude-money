#!/bin/bash
# ============================================================================
# migrate-to-omcm.sh - ~/.omc에서 ~/.omcm으로 마이그레이션
# ============================================================================

OLD_DIR="$HOME/.omc"
NEW_DIR="$HOME/.omcm"

echo "OMCM 데이터 마이그레이션"
echo "From: $OLD_DIR"
echo "To:   $NEW_DIR"
echo ""

# 새 디렉토리 생성
mkdir -p "$NEW_DIR"
mkdir -p "$NEW_DIR/handoff"

# 마이그레이션 실행
if [[ -d "$OLD_DIR" ]]; then
    echo "기존 데이터 마이그레이션 중..."

    # fusion-state.json
    if [[ -f "$OLD_DIR/fusion-state.json" ]]; then
        cp "$OLD_DIR/fusion-state.json" "$NEW_DIR/"
        echo "  fusion-state.json"
    fi

    # fallback-state.json
    if [[ -f "$OLD_DIR/fallback-state.json" ]]; then
        cp "$OLD_DIR/fallback-state.json" "$NEW_DIR/"
        echo "  fallback-state.json"
    fi

    # provider-limits.json
    if [[ -f "$OLD_DIR/provider-limits.json" ]]; then
        cp "$OLD_DIR/provider-limits.json" "$NEW_DIR/"
        echo "  provider-limits.json"
    fi

    # handoff 디렉토리
    if [[ -d "$OLD_DIR/handoff" ]]; then
        cp -r "$OLD_DIR/handoff/"* "$NEW_DIR/handoff/" 2>/dev/null
        echo "  handoff/"
    fi

    echo ""
    echo "마이그레이션 완료!"
    echo ""
    echo "기존 디렉토리 유지됨: $OLD_DIR"
    echo "새 디렉토리: $NEW_DIR"
    echo ""
    echo "기존 디렉토리를 삭제하려면:"
    echo "  rm -rf $OLD_DIR"
else
    echo "마이그레이션할 기존 데이터가 없습니다."
    echo "새 디렉토리 생성: $NEW_DIR"
fi
