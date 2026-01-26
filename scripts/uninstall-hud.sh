#!/bin/bash
# Uninstall OMCM HUD wrapper and restore OMC HUD

set -e

CLAUDE_DIR="$HOME/.claude"
HUD_DIR="$CLAUDE_DIR/hud"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "Uninstalling OMCM HUD wrapper..."

# Restore original HUD command if backed up
if [[ -f "$HUD_DIR/.omc-hud-backup" ]]; then
  ORIGINAL_CMD=$(cat "$HUD_DIR/.omc-hud-backup")

  if [[ -f "$SETTINGS_FILE" ]]; then
    jq '.statusLine = {"type": "command", "command": "'"$ORIGINAL_CMD"'"}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    echo "✅ Restored original HUD: $ORIGINAL_CMD"
  fi

  rm "$HUD_DIR/.omc-hud-backup"
else
  # Default to OMC HUD
  if [[ -f "$SETTINGS_FILE" ]]; then
    jq '.statusLine = {"type": "command", "command": "node ~/.claude/hud/omc-hud.mjs"}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    echo "✅ Restored OMC HUD"
  fi
fi

# Remove OMCM HUD wrapper
if [[ -f "$HUD_DIR/omcm-hud.mjs" ]]; then
  rm "$HUD_DIR/omcm-hud.mjs"
  echo "✅ Removed OMCM HUD wrapper"
fi

echo "✅ OMCM HUD uninstalled"
