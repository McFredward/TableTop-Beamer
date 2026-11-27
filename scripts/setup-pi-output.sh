#!/usr/bin/env bash
# Set up or open the dedicated TT-Beamer browser on Raspberry Pi OS.
set -euo pipefail

data_dir="${XDG_DATA_HOME:-$HOME/.local/share}/tt-beamer-output"
profile_dir="${XDG_CONFIG_HOME:-$HOME/.config}/chromium-tt-beamer-output"
saved_origin_file="$data_dir/server"
launcher="$data_dir/setup-pi-output.sh"

fail() {
  printf 'TT-Beamer: %s\n' "$*" >&2
  exit 1
}

use_pi_desktop() {
  local session type
  while read -r session; do
    type=$(loginctl show-session "$session" -p Type --value)
    [[ $(loginctl show-session "$session" -p Active --value) == yes ]] || continue
    case $type in
      x11)
        DISPLAY=$(loginctl show-session "$session" -p Display --value)
        [[ -n $DISPLAY ]] || continue
        export DISPLAY XAUTHORITY="$HOME/.Xauthority"
        unset WAYLAND_DISPLAY
        return
        ;;
      wayland)
        local socket
        for socket in "$XDG_RUNTIME_DIR"/wayland-*; do
          [[ -S $socket ]] || continue
          export WAYLAND_DISPLAY=${socket##*/}
          unset DISPLAY
          return
        done
        ;;
    esac
  done < <(loginctl list-sessions --no-legend | awk -v uid="$(id -u)" '$2 == uid && $4 != "" {print $1}')
  fail "Sign in to the Pi desktop with the same user name and try again."
}

enable_hdmi() {
  local display info
  if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
    info=$(wlr-randr) || fail "Could not read the Pi’s Wayland display settings."
    display=$(awk '/^HDMI-[A0-9-]+ / && !found {print $1; found=1}' <<<"$info")
    if [[ -n $display ]]; then
      wlr-randr --output "$display" --on --preferred || fail "Could not enable HDMI on the Pi."
    fi
  else
    info=$(xrandr --query) || fail "Could not read the Pi’s X11 display settings."
    display=$(awk '$1 ~ /^HDMI-[0-9]+$/ && $2 == "connected" {
      if (!first) first = $1
      if ($0 ~ /[0-9]+x[0-9]+\+[0-9]+\+[0-9]+/ && !active) active = $1
    } END {print (active ? active : first)}' <<<"$info")
    if [[ -n $display ]]; then
      xrandr --output "$display" --auto --primary || fail "Could not enable HDMI on the Pi."
      xset s reset 2>/dev/null || true
    fi
  fi
  printf 'Display: %s\n' "${display:-none}"
}

camera_permission() {
  python3 - "$profile_dir/Default/Preferences" "$origin" "$1" <<'PY'
import json
import os
from pathlib import Path
import sys
from tempfile import NamedTemporaryFile

path = Path(sys.argv[1])
preferences = json.loads(path.read_text()) if path.exists() else {}
settings = preferences.setdefault("profile", {}).setdefault("content_settings", {}).setdefault("exceptions", {})
camera = settings.setdefault("media_stream_camera", {})
key = sys.argv[2] + ",*"
if sys.argv[3] == "check":
    sys.exit(0 if camera.get(key, {}).get("setting") == 1 else 1)
camera[key] = {"setting": 1}
path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
with NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as output:
    json.dump(preferences, output)
os.replace(output.name, path)
PY
}

if [[ ${1:-} == --start && $# -eq 1 ]]; then
  [[ -r $saved_origin_file ]] || fail "Set up this Pi from Pi output in the TT-Beamer dashboard first."
  origin=$(<"$saved_origin_file")
  mode=kiosk
elif [[ ${1:-} == --remote && ( $# -eq 2 || $# -eq 3 ) ]]; then
  origin=${2%/}
  token=${3:-}
  [[ -z $token || $token =~ ^[0-9a-f]{32}$ ]] || fail "The camera pairing code is invalid."
  mode=remote
elif [[ $# -eq 2 ]]; then
  origin=${1%/}
  token=$2
  [[ $token =~ ^[0-9a-f]{32}$ ]] || fail "Use a fresh setup command from the TT-Beamer dashboard."
  mode=setup
else
  fail "Open Pi output on the TT-Beamer PC and copy the manual setup command."
fi

[[ $origin =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]] || fail "Use the TT-Beamer server address from the dashboard."
if [[ $mode == remote ]]; then
  [[ -r /proc/device-tree/model && $(tr -d '\000' </proc/device-tree/model) == Raspberry\ Pi* ]] ||
    fail "This SSH connection does not point to a Raspberry Pi."
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
  use_pi_desktop
  curl -fsS --connect-timeout 3 --max-time 5 "$origin/api/camera/status" >/dev/null ||
    fail "The Pi could not reach TT-Beamer on the PC. Check the network and Windows firewall."
fi
[[ -n ${DISPLAY:-}${WAYLAND_DISPLAY:-} ]] || fail "Run this command in a terminal on the Raspberry Pi desktop."
browser=$(command -v chromium || command -v chromium-browser) || fail "Install Chromium on Raspberry Pi OS and run this command again."

# Only the dedicated projector profile is used. Leave other browser windows alone.
profile_pid=
profile_command=
if [[ -L $profile_dir/SingletonLock ]]; then
  lock=$(readlink "$profile_dir/SingletonLock")
  pid=${lock##*-}
  if [[ $pid =~ ^[0-9]+$ ]]; then
    profile_command=$(ps -p "$pid" -o args= || true)
    if [[ $profile_command == *"--user-data-dir=$profile_dir"* ]]; then
      profile_pid=$pid
    fi
  fi
fi

browser_args=(
  "--user-data-dir=$profile_dir"
  --password-store=basic
  --no-first-run
  --no-default-browser-check
  --disable-features=WebRtcPipeWireCamera
  --autoplay-policy=no-user-gesture-required
  --test-type
)
if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
  browser_args+=(--ozone-platform=wayland)
else
  browser_args+=(--ozone-platform=x11)
fi
if [[ $origin == http://* ]]; then
  browser_args+=("--unsafely-treat-insecure-origin-as-secure=$origin")
fi

pair_camera() {
  if ! curl -fsS --connect-timeout 4 --max-time 10 -H 'Content-Type: application/json' \
      --data "{\"token\":\"$token\"}" "$origin/api/camera/pair"; then
    fail "Pairing failed. Check that both devices are on the same network and get a new setup command."
  fi
}

if [[ $mode == remote ]]; then
  enable_hdmi
  printf 'Host: %s\n' "$(hostname -s)"
  if [[ -n $token ]]; then pair_camera; fi
  if [[ -z $token && -n $profile_pid && $profile_command == *"--kiosk "*"$origin/output/"* &&
    $profile_command == *"--password-store=basic"* && $profile_command == *"--autoplay-policy=no-user-gesture-required"* ]] &&
    camera_permission check; then
    exit 0
  fi
  if [[ -n $profile_pid ]]; then
    kill -TERM "$profile_pid" || fail "Could not close the previous TT-Beamer output window."
    for attempt in {1..25}; do
      [[ ! -L $profile_dir/SingletonLock ]] && break
      sleep 0.2
    done
    [[ ! -L $profile_dir/SingletonLock ]] || fail "Close the previous TT-Beamer output window and retry."
  fi
  camera_permission allow || fail "Could not grant the TT-Beamer site camera access in its Chromium profile."
  mkdir -p "$data_dir"
  nohup "$browser" "${browser_args[@]}" \
    --kiosk "$origin/output/" </dev/null >"$data_dir/browser.log" 2>&1 &
  browser_pid=$!
  sleep 1
  kill -0 "$browser_pid" 2>/dev/null || fail "Chromium did not stay open on the Pi desktop."
  exit 0
fi

[[ -z $profile_pid ]] || fail "TT-Beamer Output is already open. Close its window to run setup again."
if [[ $mode == kiosk ]]; then
  exec "$browser" "${browser_args[@]}" --kiosk "$origin/output/"
fi

command -v curl >/dev/null || fail "Install curl on Raspberry Pi OS and run this command again."
pair_camera

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
