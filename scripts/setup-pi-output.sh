#!/usr/bin/env bash
# Set up or open the dedicated TT-Beamer browser on Raspberry Pi OS.
set -euo pipefail

data_dir="${XDG_DATA_HOME:-$HOME/.local/share}/tt-beamer-output"
profile_dir="${XDG_CONFIG_HOME:-$HOME/.config}/chromium-tt-beamer-output"
saved_origin_file="$data_dir/server"
launcher="$data_dir/setup-pi-output.sh"

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

if [[ ${1:-} == --start && $# -eq 1 ]]; then
  [[ -r $saved_origin_file ]] || fail "Set up this Pi from Camera in the TT-Beamer dashboard first."
  origin=$(<"$saved_origin_file")
  mode=kiosk
elif [[ $# -eq 2 ]]; then
  origin=${1%/}
  token=$2
  [[ $token =~ ^[0-9a-f]{32}$ ]] || fail "Use a fresh setup command from the TT-Beamer dashboard."
  mode=setup
else
  fail "Open Camera → Set up Raspberry Pi on the TT-Beamer PC and copy the setup command."
fi

[[ $origin =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]] || fail "Use the TT-Beamer server address from the dashboard."
[[ -n ${DISPLAY:-}${WAYLAND_DISPLAY:-} ]] || fail "Run this command in a terminal on the Raspberry Pi desktop."
browser=$(command -v chromium || command -v chromium-browser) || fail "Install Chromium on Raspberry Pi OS and run this command again."

# Only the dedicated projector profile is used. Leave other browser windows alone.
if [[ -L $profile_dir/SingletonLock ]]; then
  lock=$(readlink "$profile_dir/SingletonLock")
  pid=${lock##*-}
  if [[ $pid =~ ^[0-9]+$ && $(ps -p "$pid" -o args=) == *"--user-data-dir=$profile_dir"* ]]; then
    fail "TT-Beamer Output is already open. Close its window to run setup again."
  fi
fi

browser_args=(
  "--user-data-dir=$profile_dir"
  --password-store=basic
  --no-first-run
  --no-default-browser-check
  --disable-features=WebRtcPipeWireCamera
)
if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
  browser_args+=(--ozone-platform=wayland)
else
  browser_args+=(--ozone-platform=x11)
fi
if [[ $origin == http://* ]]; then
  browser_args+=("--unsafely-treat-insecure-origin-as-secure=$origin")
fi

if [[ $mode == kiosk ]]; then
  exec "$browser" "${browser_args[@]}" --kiosk "$origin/output/"
fi

command -v curl >/dev/null || fail "Install curl on Raspberry Pi OS and run this command again."
if ! curl -fsS --connect-timeout 4 --max-time 10 -H 'Content-Type: application/json' \
    --data "{\"token\":\"$token\"}" "$origin/api/camera/pair"; then
  fail "Pairing failed. Check that both devices are on the same network and get a new setup command."
fi

mkdir -p "$data_dir" "${XDG_DATA_HOME:-$HOME/.local/share}/applications"
if [[ ! $0 -ef $launcher ]]; then
  install -m 700 -- "$0" "$launcher"
fi
printf '%s\n' "$origin" > "$saved_origin_file"

# Double quotes in Desktop Entry Exec keep a home directory with spaces intact.
desktop_launcher=${launcher//%/%%}
desktop_launcher=${desktop_launcher//\\/\\\\\\\\}
desktop_launcher=${desktop_launcher//\"/\\\\\"}
desktop_launcher=${desktop_launcher//\$/\\\\\$}
desktop_launcher=${desktop_launcher//\`/\\\\\`}
printf '%s\n' '[Desktop Entry]' 'Type=Application' 'Name=TT-Beamer Output' \
  "Exec=\"$desktop_launcher\" --start" 'Terminal=false' 'Categories=AudioVideo;' \
  > "${XDG_DATA_HOME:-$HOME/.local/share}/applications/tt-beamer-output.desktop"

printf '%s\n' 'In Chromium, choose “Allow while visiting the site” for the board camera.'
printf '%s\n' 'The browser will switch to fullscreen when TT-Beamer receives the first image.'
"$browser" "${browser_args[@]}" --new-window "$origin/output/" &
browser_pid=$!
stop_setup_browser() {
  kill -TERM "$browser_pid" 2>/dev/null || true
  wait "$browser_pid" 2>/dev/null || true
}
trap 'stop_setup_browser; exit 130' INT TERM

while kill -0 "$browser_pid" 2>/dev/null; do
  if curl -fsS --connect-timeout 2 --max-time 3 "$origin/api/camera/status" 2>/dev/null |
      grep -q '"status"[[:space:]]*:[[:space:]]*"streaming"'; then
    # Allow Chromium to save the permission in this profile before reopening it.
    sleep 2
    stop_setup_browser
    exec "$browser" "${browser_args[@]}" --kiosk "$origin/output/"
  fi
  sleep 2
done

wait "$browser_pid" || true
printf '%s\n' 'To run camera setup again, get a fresh setup command from the dashboard.'
