#!/bin/bash
# Sync local oh-my-opencode build to OpenCode
# Run this after any code changes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_FILE="$SCRIPT_DIR/dist/index.js"
DEST_DIR="$HOME/.config/opencode/plugins"
DEST_FILE="$DEST_DIR/oh-my-opencode.js"

echo "Building oh-my-opencode..."
bun run clean && bun run build

echo "Copying to OpenCode plugins..."
cp "$PLUGIN_FILE" "$DEST_FILE"

echo "✓ Synced! Restart OpenCode to test changes."
