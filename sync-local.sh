#!/bin/bash
# Sync local oh-my-opencode build to OpenCode cache
# Run this after any code changes

echo "Building oh-my-opencode..."
bun run clean && bun run build

echo "Syncing to OpenCode cache..."
rm -rf ~/.cache/opencode/node_modules/oh-my-opencode/dist
cp -r dist ~/.cache/opencode/node_modules/oh-my-opencode/

echo "✓ Synced! Restart OpenCode to test changes."
