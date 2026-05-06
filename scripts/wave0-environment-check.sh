#!/usr/bin/env bash
# Phase 31 Wave 0 environment-check smoke
# Prints presence/version of every binary the SSR pivot depends on.
# Exits 0 with `=== Result: PASS ===` if Xvfb, chromium, ffmpeg and node
# are all on PATH; exits 2 with `=== Result: FAIL ===` otherwise.

set -euo pipefail

echo "=== Phase 31 Wave 0 Environment Check ==="

# resolve_chromium tries common chromium binary names in order.
resolve_chromium() {
  for name in chromium chromium-browser google-chrome; do
    if command -v "$name" >/dev/null 2>&1; then
      command -v "$name"
      return 0
    fi
  done
  echo "MISSING"
}

print_bin() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    echo "BIN $name $(command -v "$name")"
  else
    echo "BIN $name MISSING"
  fi
}

# Mandatory binaries the SSR stack reaches for at runtime.
print_bin Xvfb
chromium_path=$(resolve_chromium)
echo "BIN chromium ${chromium_path}"
print_bin ffmpeg
print_bin node
print_bin npm
print_bin python3
print_bin gcc
print_bin make

# Versions
echo "NODE_VERSION $(node --version 2>/dev/null || echo missing)"
echo "NPM_VERSION $(npm --version 2>/dev/null || echo missing)"

# Hardware probes (best-effort; don't fail the gate on missing util)
echo "CPU $(lscpu 2>/dev/null | grep -E '^(Model name|Architecture):' | tr '\n' ' ' || echo 'lscpu-missing')"
echo "GPU $(lspci 2>/dev/null | grep -iE 'vga|3d|display' | tr '\n' ' ' || echo 'lspci-missing')"
echo "RAM $(free -h 2>/dev/null | awk 'NR==2{print $2}' || echo 'free-missing')"
echo "DRI_DEVICE $(ls /dev/dri/renderD128 2>/dev/null || echo 'no-vaapi-device')"
echo "AUDIO_SERVER $(pactl --version 2>/dev/null | head -1 || pipewire --version 2>/dev/null || echo 'no-audio-server')"

# Gate decision: Xvfb + chromium + ffmpeg + node MUST all be present.
fail=0
command -v Xvfb   >/dev/null 2>&1 || fail=1
[ "${chromium_path}" != "MISSING" ] || fail=1
command -v ffmpeg >/dev/null 2>&1 || fail=1
command -v node   >/dev/null 2>&1 || fail=1

if [ "$fail" -eq 0 ]; then
  echo "=== Result: PASS ==="
  exit 0
else
  echo "=== Result: FAIL ==="
  exit 2
fi
