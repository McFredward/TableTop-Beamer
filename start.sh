#!/usr/bin/env bash
# start.sh — TT-Beamer click-and-run entry point (Linux / Debian/Ubuntu).
#
# Phase 45.
#
# Usage:
#   ./start.sh              # normal boot
#   ./start.sh --dry-run    # probe + report, do not download/install/start
#   PORT=9000 ./start.sh    # override default port (8080)
#
# This script:
#   1. Resolves a portable Node.js into .node-portable/ (no admin needed).
#   2. On Debian/Ubuntu, installs missing apt packages with a sudo prompt.
#      On other distros, prints a clear instruction list and exits.
#   3. Runs `npm ci` if node_modules is stale.
#   4. Boots the server under Xvfb with a free display number.
#   5. Waits for /api/health → 200 (up to 90 s).
#   6. Opens the dashboard URL in the user's default browser.
#   7. Streams the server log; Ctrl+C cleanly shuts everything down.
#
# Stability principles:
#   - Idempotent: re-running is safe; all bootstrap steps are no-ops if
#     already done.
#   - Defensive: every external dep is probed before use; failures emit
#     an actionable message.
#   - No global state mutation: Node lives in .node-portable/, never in
#     /usr/local; PATH changes are scoped to this script's process.

set -euo pipefail

# -----------------------------------------------------------------------------
# Pre-flight: resolve project root, parse flags
# -----------------------------------------------------------------------------
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
cd "$SCRIPT_DIR"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    --help|-h)
      sed -nE '/^# Usage:/,/^$/ s/^# ?//p' "$0"
      exit 0
      ;;
  esac
done

PORT="${PORT:-8080}"
HEALTH_URL="http://localhost:${PORT}/api/health"
DASHBOARD_URL="http://localhost:${PORT}/"

LOG_FILE="${SCRIPT_DIR}/start.log"
PID_FILE="${SCRIPT_DIR}/.server.pid"
XVFB_PID_FILE="${SCRIPT_DIR}/.xvfb.pid"

# -----------------------------------------------------------------------------
# Banner
# -----------------------------------------------------------------------------
print_banner() {
  cat <<'BANNER'

  ███████████ █████████████
       ███    ███    █████
       ███    ███
       ███    ███████  ████ ████  ███████   ██  ████████   ███████  █████
       ███    ██████   ████ ████  ██████    ██  ████████   █████    ██
       ███    ███   ██ ████ ████  ██   ██  ██   ██████     ██████   ███

  TT-Beamer — Click-and-run launcher (Linux)
  Phase 45

BANNER
}
print_banner

if [ ! -f "${SCRIPT_DIR}/package.json" ]; then
  echo "[start] ERROR: not in project root (no package.json found at ${SCRIPT_DIR})" >&2
  echo "[start]   Run start.sh from the directory you cloned the repo into." >&2
  exit 1
fi

# -----------------------------------------------------------------------------
# Step 1 — portable Node.js
# -----------------------------------------------------------------------------
echo "[start] (1/6) Portable Node.js …"
# shellcheck source=scripts/bootstrap-node.sh
source "${SCRIPT_DIR}/scripts/bootstrap-node.sh"

if [ "$DRY_RUN" = "1" ]; then
  if [ -x "${SCRIPT_DIR}/.node-portable/bin/node" ]; then
    echo "[start]    [dry-run] Portable Node already present: $(${SCRIPT_DIR}/.node-portable/bin/node --version)"
  else
    echo "[start]    [dry-run] Portable Node would be downloaded from nodejs.org"
  fi
else
  ensure_portable_node || {
    echo "[start] ERROR: failed to bootstrap portable Node.js." >&2
    exit 1
  }
fi

# -----------------------------------------------------------------------------
# Step 2 — system dependencies (Linux)
# -----------------------------------------------------------------------------
echo "[start] (2/6) System dependencies …"

# Detect distro family.
distro_id=""
distro_id_like=""
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  distro_id="${ID:-}"
  distro_id_like="${ID_LIKE:-}"
fi

is_apt_distro() {
  case "$distro_id" in
    debian|ubuntu|linuxmint|pop|elementary|kali) return 0 ;;
  esac
  case "$distro_id_like" in
    *debian*|*ubuntu*) return 0 ;;
  esac
  return 1
}

# Probe required binaries; record missing apt package names.
declare -a missing_pkgs=()

probe_binary() {
  local bin="$1" pkg="$2" alt_bins="${3:-}"
  if command -v "$bin" >/dev/null 2>&1; then return 0; fi
  if [ -n "$alt_bins" ]; then
    local alt
    for alt in $alt_bins; do
      if command -v "$alt" >/dev/null 2>&1; then return 0; fi
    done
  fi
  missing_pkgs+=("$pkg")
}

probe_binary Xvfb        xvfb
probe_binary chromium    chromium-browser  "chromium-browser google-chrome"
probe_binary ffmpeg      ffmpeg
probe_binary curl        curl
# Build tools: only required if mediasoup prebuilt fetch fails. Prebuilts
# exist for linux-x64 / linux-arm64 since mediasoup 3.12, so on common
# hardware we rarely need these. We still probe + offer to install on apt
# distros so the npm ci fallback path is bulletproof.
probe_binary python3     python3
probe_binary make        make
probe_binary g++         build-essential   "g++"

if [ "${#missing_pkgs[@]}" -gt 0 ]; then
  echo "[start]    Missing system packages: ${missing_pkgs[*]}"
  if is_apt_distro; then
    if [ "$DRY_RUN" = "1" ]; then
      echo "[start]    [dry-run] Would run: sudo apt update && sudo apt install -y ${missing_pkgs[*]}"
    else
      echo "[start]    These will be installed via 'sudo apt install -y ${missing_pkgs[*]}'."
      echo "[start]    You may be prompted for your password."
      printf "[start]    Continue? [Y/n] "
      read -r confirm
      case "${confirm:-y}" in
        n|N|no|NO|No) echo "[start] Aborted by user."; exit 1 ;;
      esac
      sudo apt update
      # shellcheck disable=SC2068
      sudo apt install -y ${missing_pkgs[@]}
    fi
  else
    echo "[start] ERROR: your distro ('${distro_id:-unknown}') is not auto-installable." >&2
    echo "[start]   Install these packages manually, then re-run start.sh:" >&2
    echo "[start]     Fedora/RHEL:  sudo dnf install xorg-x11-server-Xvfb chromium ffmpeg python3 make gcc-c++" >&2
    echo "[start]     Arch:         sudo pacman -S xorg-server-xvfb chromium ffmpeg python make gcc" >&2
    echo "[start]     openSUSE:     sudo zypper install xvfb-run chromium ffmpeg python3 make gcc-c++" >&2
    exit 1
  fi
else
  echo "[start]    All required system packages already installed."
fi

# -----------------------------------------------------------------------------
# Step 3 — node_modules / npm ci
# -----------------------------------------------------------------------------
echo "[start] (3/6) node_modules …"

INSTALL_MARKER="${SCRIPT_DIR}/node_modules/.start-sh-installed-snapshot"

needs_install() {
  # Need install if node_modules missing OR if package-lock.json's hash has
  # changed since the last successful install. The marker file stores the
  # SHA256 of the lockfile that was last installed, written by us after a
  # successful npm ci.
  if [ ! -d "${SCRIPT_DIR}/node_modules" ]; then return 0; fi
  if [ ! -f "$INSTALL_MARKER" ]; then return 0; fi
  if [ ! -f "${SCRIPT_DIR}/package-lock.json" ]; then return 1; fi
  local expected actual
  expected=$(cat "$INSTALL_MARKER" 2>/dev/null || true)
  actual=$(sha256sum "${SCRIPT_DIR}/package-lock.json" | awk '{print $1}')
  [ "$expected" != "$actual" ]
}

if needs_install; then
  if [ "$DRY_RUN" = "1" ]; then
    echo "[start]    [dry-run] Would run: npm ci (PUPPETEER_SKIP_DOWNLOAD=true)"
  else
    echo "[start]    Running 'npm ci' (this may take 1-2 minutes on first run) …"
    # Skip puppeteer's ~500 MB Chromium download — we use system chromium.
    PUPPETEER_SKIP_DOWNLOAD=true "${NODE_PORTABLE_BIN}/npm" ci
    # Record which package-lock.json hash this node_modules was built from.
    sha256sum "${SCRIPT_DIR}/package-lock.json" | awk '{print $1}' > "$INSTALL_MARKER"
  fi
else
  echo "[start]    node_modules up-to-date."
fi

# -----------------------------------------------------------------------------
# Step 4 — boot server under Xvfb
# -----------------------------------------------------------------------------
echo "[start] (4/6) Boot server …"

# Pick a free X display in range :99..:108
pick_free_display() {
  local d
  for d in 99 100 101 102 103 104 105 106 107 108; do
    if [ ! -e "/tmp/.X${d}-lock" ]; then
      echo ":$d"
      return 0
    fi
  done
  return 1
}

stop_children() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "[start] Stopping server (PID $pid) …"
      kill "$pid" 2>/dev/null || true
      # Give it 3 seconds to shut down cleanly, then SIGKILL.
      local i=0
      while [ "$i" -lt 30 ] && kill -0 "$pid" 2>/dev/null; do
        sleep 0.1; i=$((i+1))
      done
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi
  if [ -f "$XVFB_PID_FILE" ]; then
    local xpid
    xpid=$(cat "$XVFB_PID_FILE" 2>/dev/null || true)
    if [ -n "$xpid" ] && kill -0 "$xpid" 2>/dev/null; then
      kill "$xpid" 2>/dev/null || true
    fi
    rm -f "$XVFB_PID_FILE"
  fi
}

trap stop_children INT TERM EXIT

if [ "$DRY_RUN" = "1" ]; then
  echo "[start]    [dry-run] Would launch: Xvfb \$display & ; DISPLAY=\$display node server.mjs"
  echo "[start]    [dry-run] All probes passed. Re-run without --dry-run to start."
  trap - INT TERM EXIT
  exit 0
fi

# Stop any prior orphan from a previous run.
stop_children

DISPLAY_NUM=$(pick_free_display) || {
  echo "[start] ERROR: no free X display in :99..:108. Is another X server running?" >&2
  exit 1
}

# Truncate log so the user sees only this session's output.
: > "$LOG_FILE"

# Start Xvfb in the background.
echo "[start]    Starting Xvfb on ${DISPLAY_NUM} …"
Xvfb "$DISPLAY_NUM" -screen 0 1920x1080x24 -nolisten tcp >> "$LOG_FILE" 2>&1 &
echo $! > "$XVFB_PID_FILE"
sleep 0.5

if ! kill -0 "$(cat "$XVFB_PID_FILE")" 2>/dev/null; then
  echo "[start] ERROR: Xvfb failed to start. See ${LOG_FILE}." >&2
  exit 1
fi

# Start the Node server.
echo "[start]    Starting Node server (port ${PORT}) …"
(
  export DISPLAY="$DISPLAY_NUM"
  export PORT
  cd "$SCRIPT_DIR"
  exec "${NODE_PORTABLE_BIN}/node" server.mjs >> "$LOG_FILE" 2>&1
) &
echo $! > "$PID_FILE"

# -----------------------------------------------------------------------------
# Step 5 — health probe
# -----------------------------------------------------------------------------
echo "[start] (5/6) Waiting for server to come up …"

probe_health() {
  local timeout_sec="${1:-90}"
  local elapsed=0
  local spinner_chars='|/-\'
  local i=0
  while [ "$elapsed" -lt "$timeout_sec" ]; do
    if curl -fsS -o /dev/null "$HEALTH_URL" 2>/dev/null; then
      printf "\r[start]    Server is up (took %ds).                       \n" "$elapsed"
      return 0
    fi
    # Detect early exit
    if [ -f "$PID_FILE" ]; then
      local pid
      pid=$(cat "$PID_FILE" 2>/dev/null || true)
      if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
        printf "\r[start] ERROR: server process died during startup.            \n"
        echo "[start]    Last 30 lines of ${LOG_FILE}:" >&2
        tail -n 30 "$LOG_FILE" >&2 || true
        return 1
      fi
    fi
    i=$(( (i + 1) % 4 ))
    printf "\r[start]    %s waiting … %ds" "${spinner_chars:$i:1}" "$elapsed"
    sleep 1
    elapsed=$((elapsed + 1))
  done
  printf "\r[start] ERROR: health probe timed out after %ds.\n" "$timeout_sec"
  return 1
}

if ! probe_health 90; then
  exit 1
fi

# -----------------------------------------------------------------------------
# Step 6 — open browser
# -----------------------------------------------------------------------------
echo "[start] (6/6) Opening dashboard …"

if command -v xdg-open >/dev/null 2>&1; then
  (xdg-open "$DASHBOARD_URL" >/dev/null 2>&1 || true) &
elif command -v gnome-open >/dev/null 2>&1; then
  (gnome-open "$DASHBOARD_URL" >/dev/null 2>&1 || true) &
else
  echo "[start]    (no xdg-open available — open manually)"
fi

cat <<EOF

  ─────────────────────────────────────────────────────
  TT-Beamer is running.
    Dashboard:    ${DASHBOARD_URL}
    Output view:  http://localhost:${PORT}/output/
    Log:          ${LOG_FILE}
  ─────────────────────────────────────────────────────
  Press Ctrl+C to stop.

EOF

# -----------------------------------------------------------------------------
# Tail the log until the user hits Ctrl+C (trap stops everything cleanly).
# -----------------------------------------------------------------------------
tail -f "$LOG_FILE" &
TAIL_PID=$!

# Wait on the server PID; when it exits (or Ctrl+C triggers the trap), we
# tear everything down via stop_children.
SERVER_PID=$(cat "$PID_FILE")
wait "$SERVER_PID" 2>/dev/null || true

kill "$TAIL_PID" 2>/dev/null || true
