#!/usr/bin/env bash
# Render cheatsheet.html to kitty-cheatsheet.png with headless Chrome.
# The page is a fixed 1920x1080 canvas; the PNG is drawn at 2x for sharp text.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1920,1080 \
  --screenshot="$DIR/kitty-cheatsheet.png" \
  "file://$DIR/cheatsheet.html" 2>/dev/null

echo "wrote $DIR/kitty-cheatsheet.png"
