#!/usr/bin/env bash
# Renders the PWA icons from public/favicon.svg with headless Chrome.
#
# Chrome's install criteria require real 192px and 512px raster icons, and
# Android crops maskable icons into a circle or squircle. So we render the
# normal icons on a transparent canvas with the logo at 70% width, and the
# maskable icons on the app background with the logo inside the 80% safe zone.
#
# Usage: ./scripts/generate-icons.sh
# Requires google-chrome or chromium on PATH, or set CHROME_BIN.

set -euo pipefail

cd "$(dirname "$0")/.."

CHROME_BIN="${CHROME_BIN:-}"
if [ -z "$CHROME_BIN" ]; then
  for candidate in google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$candidate" >/dev/null 2>&1; then
      CHROME_BIN="$candidate"
      break
    fi
  done
fi
if [ -z "$CHROME_BIN" ]; then
  echo "No Chrome or Chromium found. Set CHROME_BIN to a browser binary." >&2
  exit 1
fi

ROOT="$(pwd)"
OUT="public/icons"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cp public/favicon.svg "$TMP/logo.svg"

render() {
  local name="$1" size="$2" scale="$3" background="$4"
  local page="$TMP/page.html"
  local background_css="transparent"
  local background_flag="--default-background-color=00000000"

  if [ "$background" != "transparent" ]; then
    background_css="$background"
    background_flag=""
  fi

  cat > "$page" <<HTML
<!doctype html>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: $background_css; }
  body {
    width: ${size}px;
    height: ${size}px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  img { width: ${scale}%; height: auto; display: block; }
</style>
<img src="logo.svg" alt="">
HTML

  # shellcheck disable=SC2086
  "$CHROME_BIN" \
    --headless \
    --disable-gpu \
    --no-sandbox \
    --hide-scrollbars \
    --force-device-scale-factor=1 \
    --user-data-dir="$TMP/profile" \
    --window-size="${size},${size}" \
    $background_flag \
    --screenshot="$ROOT/$OUT/$name" \
    "file://$page" >/dev/null 2>&1

  echo "Wrote $OUT/$name"
}

render icon-192.png 192 70 transparent
render icon-512.png 512 70 transparent
render icon-maskable-192.png 192 58 "#0d1117"
render icon-maskable-512.png 512 58 "#0d1117"
render apple-touch-icon.png 180 66 "#0d1117"
