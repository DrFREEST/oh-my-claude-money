#!/bin/bash
# Install OMCM HUD wrapper

set -e

OMCM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"
HUD_DIR="$CLAUDE_DIR/hud"

echo "Installing OMCM HUD wrapper..."

# Create HUD directory
mkdir -p "$HUD_DIR"

# Create wrapper script
cat > "$HUD_DIR/omcm-hud.mjs" << 'EOF'
#!/usr/bin/env node
// OMCM HUD wrapper - delegates to plugin
import("OMCM_DIR_PLACEHOLDER/src/hud/omcm-hud.mjs").catch(() => {
  console.log("[OMCM] not found");
});
EOF

# Replace placeholder with actual path
sed -i "s|OMCM_DIR_PLACEHOLDER|$OMCM_DIR|g" "$HUD_DIR/omcm-hud.mjs"

# Make executable
chmod +x "$HUD_DIR/omcm-hud.mjs"

# Backup existing settings
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
if [[ -f "$SETTINGS_FILE" ]]; then
  cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup"
fi

# Update settings.json to use OMCM HUD
if [[ -f "$SETTINGS_FILE" ]]; then
  # Check if statusLine already exists
  if grep -q '"statusLine"' "$SETTINGS_FILE"; then
    # Backup original statusLine command
    ORIGINAL_CMD=$(jq -r '.statusLine.command // empty' "$SETTINGS_FILE")
    if [[ -n "$ORIGINAL_CMD" ]]; then
      echo "$ORIGINAL_CMD" > "$HUD_DIR/.omc-hud-backup"
    fi
  fi

  # Update statusLine to OMCM HUD
  jq '.statusLine = {"type": "command", "command": "node '"$HUD_DIR/omcm-hud.mjs"'"}' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"
  mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
else
  # Create settings.json
  echo '{"statusLine": {"type": "command", "command": "node '"$HUD_DIR/omcm-hud.mjs"'"}}' > "$SETTINGS_FILE"
fi

echo "✅ OMCM HUD installed"
echo "   Wrapper: $HUD_DIR/omcm-hud.mjs"
