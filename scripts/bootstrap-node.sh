#!/usr/bin/env bash
# Portable Node.js bootstrap for TT-Beamer click-and-run scripts (Phase 45).
#
# Sourceable. Exposes:
#   ensure_portable_node      — idempotent: install/verify .node-portable/
#   NODE_PORTABLE_BIN         — absolute path to .node-portable/bin (set on success)
#
# Strategy: download the latest Node 22.x LTS tarball from nodejs.org to
# .node-portable/, verified by SHA256 against the official SHASUMS256.txt.
# No sudo, no system pollution. Caller is responsible for cd'ing to the
# project root before sourcing this file.

PORTABLE_NODE_DIR=".node-portable"
PORTABLE_NODE_MAJOR="22"
PORTABLE_NODE_DIST_BASE="https://nodejs.org/dist/latest-v${PORTABLE_NODE_MAJOR}.x"

ensure_portable_node() {
  local existing="${PORTABLE_NODE_DIR}/bin/node"
  if [ -x "$existing" ]; then
    local current_major
    current_major=$("$existing" --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')
    if [ "$current_major" = "$PORTABLE_NODE_MAJOR" ]; then
      NODE_PORTABLE_BIN=$(cd "${PORTABLE_NODE_DIR}/bin" && pwd -P)
      export PATH="${NODE_PORTABLE_BIN}:${PATH}"
      echo "[bootstrap-node] Reusing portable Node $("$existing" --version) at ${NODE_PORTABLE_BIN}"
      return 0
    fi
    echo "[bootstrap-node] Existing portable Node v${current_major} doesn't match required v${PORTABLE_NODE_MAJOR}; refetching."
    rm -rf "$PORTABLE_NODE_DIR"
  fi

  local arch node_arch
  arch=$(uname -m)
  case "$arch" in
    x86_64)         node_arch="linux-x64" ;;
    aarch64|arm64)  node_arch="linux-arm64" ;;
    armv7l)         node_arch="linux-armv7l" ;;
    *)
      echo "[bootstrap-node] ERROR: unsupported architecture: $arch" >&2
      echo "[bootstrap-node] Supported: x86_64, aarch64, armv7l" >&2
      return 1
      ;;
  esac

  for cmd in curl tar sha256sum; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "[bootstrap-node] ERROR: required tool '$cmd' missing. Install it via your package manager (e.g. 'sudo apt install $cmd')." >&2
      return 1
    fi
  done

  echo "[bootstrap-node] Resolving latest Node v${PORTABLE_NODE_MAJOR}.x from nodejs.org …"
  local shasums
  if ! shasums=$(curl -fsSL "${PORTABLE_NODE_DIST_BASE}/SHASUMS256.txt"); then
    echo "[bootstrap-node] ERROR: couldn't reach nodejs.org/dist. Check your internet connection (or proxy)." >&2
    return 1
  fi

  local tarball_line expected_sha tarball_name
  tarball_line=$(printf '%s\n' "$shasums" | grep -E "node-v${PORTABLE_NODE_MAJOR}\.[0-9]+\.[0-9]+-${node_arch}\.tar\.xz\$" | head -1)
  if [ -z "$tarball_line" ]; then
    echo "[bootstrap-node] ERROR: couldn't find a tarball for ${node_arch} in SHASUMS256.txt" >&2
    return 1
  fi
  expected_sha=$(printf '%s' "$tarball_line" | awk '{print $1}')
  tarball_name=$(printf '%s' "$tarball_line" | awk '{print $2}')

  local dl_dir="${PORTABLE_NODE_DIR}.dl"
  local tarball_path="${dl_dir}/${tarball_name}"
  mkdir -p "$dl_dir"

  echo "[bootstrap-node] Downloading ${tarball_name} …"
  if ! curl -fL --progress-bar -o "$tarball_path" "${PORTABLE_NODE_DIST_BASE}/${tarball_name}"; then
    echo "[bootstrap-node] ERROR: download failed for ${tarball_name}" >&2
    rm -rf "$dl_dir"
    return 1
  fi

  echo "[bootstrap-node] Verifying SHA256 …"
  local actual_sha
  actual_sha=$(sha256sum "$tarball_path" | awk '{print $1}')
  if [ "$actual_sha" != "$expected_sha" ]; then
    echo "[bootstrap-node] ERROR: SHA256 mismatch for ${tarball_name}." >&2
    echo "[bootstrap-node]   Expected: $expected_sha" >&2
    echo "[bootstrap-node]   Actual:   $actual_sha" >&2
    rm -rf "$dl_dir"
    return 1
  fi

  echo "[bootstrap-node] Extracting …"
  local extract_dir="${dl_dir}/extract"
  rm -rf "$extract_dir"
  mkdir -p "$extract_dir"
  if ! tar -xJf "$tarball_path" -C "$extract_dir"; then
    echo "[bootstrap-node] ERROR: extraction failed" >&2
    rm -rf "$dl_dir"
    return 1
  fi

  local top
  top=$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d | head -1)
  if [ -z "$top" ] || [ ! -d "$top" ]; then
    echo "[bootstrap-node] ERROR: extracted archive layout unexpected" >&2
    rm -rf "$dl_dir"
    return 1
  fi

  rm -rf "$PORTABLE_NODE_DIR"
  mv "$top" "$PORTABLE_NODE_DIR"
  rm -rf "$dl_dir"

  NODE_PORTABLE_BIN=$(cd "${PORTABLE_NODE_DIR}/bin" && pwd -P)
  export PATH="${NODE_PORTABLE_BIN}:${PATH}"

  echo "[bootstrap-node] Node $("${NODE_PORTABLE_BIN}/node" --version) installed at ${NODE_PORTABLE_BIN}"
  return 0
}
