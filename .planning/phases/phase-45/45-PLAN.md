---
phase: 45
slug: click-and-run-installers
status: READY-FOR-EXECUTION
created: 2026-05-16
predecessor: phase-44-closed (commit a114088)
context: .planning/phases/phase-45/45-CONTEXT.md
---

# Phase 45 — Plan: Click-and-Run Installer Scripts

## Goal

Non-technical user downloads the repo → double-clicks one file
(`start.sh` on Linux, `start.bat` on Windows) → browser opens to dashboard.
First run handles all bootstrap; subsequent runs reach browser in <30 s.

## Architecture overview

Both scripts follow the same flow:

```
[1] Banner / version
[2] Probe portable Node      → if missing: download + extract to .node-portable/
[3] Probe system deps        → Linux: apt install via sudo if missing
                              Windows: detect Chrome/Edge, fail fast if missing;
                              ffmpeg → portable fetch if missing
[4] Probe node_modules       → if stale (no .package-lock.json mirror or
                              outdated): run portable npm ci
[5] Boot server in background → node server.mjs (Linux: under Xvfb)
[6] Health probe loop        → curl http://localhost:PORT/api/health until 200
                              or timeout (90 s)
[7] Open browser             → xdg-open / start http://localhost:PORT/
[8] Stay attached            → tail server log, Ctrl+C cleanly shuts down
```

## File targets

| File | Platform | Purpose |
|---|---|---|
| `start.sh` | Linux (Debian/Ubuntu) | Main entry — bash, executable |
| `start.bat` | Windows | Main entry — thin wrapper that calls start.ps1 |
| `start.ps1` | Windows | PowerShell implementation — all real logic |
| `scripts/bootstrap-node.sh` | Linux helper | Portable-Node fetch/extract logic, sourceable |
| `scripts/bootstrap-node.ps1` | Windows helper | Same logic for Windows |
| `docs/INSTALL.md` | Both | End-user setup doc — "Download → double-click → done" |
| `.gitignore` | Repo | Append `.node-portable/`, `ffmpeg-portable/`, `start.log` |

Note: `start.bat` exists only because Windows users double-click .bat from
Explorer reliably; .ps1 can be blocked by ExecutionPolicy. The .bat does
`powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*`.

## Versions to pin

| Component | Version | Source URL |
|---|---|---|
| Node.js | **22.x LTS** (Jod) — latest patch at script run-time | https://nodejs.org/dist/latest-v22.x/ (parse listing) |
| ffmpeg (Windows portable) | latest from BtbN release | https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl-shared.zip |
| mediasoup | `^3.14.0` (already in package.json) | npm postinstall pulls prebuilt worker |

Rationale for Node 22 LTS: mediasoup 3.x runtime minimum is Node 22. We use
24 locally but 22 LTS is the safest "user box" default and gets bugfixes
until April 2027.

## Task breakdown (waves)

### Wave 1 — Foundations (parallel-safe)

**T1.1 — Write `scripts/bootstrap-node.sh`**
- Function `ensure_portable_node()`: checks `.node-portable/bin/node --version` works and starts with `v22.`; if not, downloads `node-v22.x.x-linux-x64.tar.xz` from nodejs.org, verifies SHA256 against the published `SHASUMS256.txt`, extracts to `.node-portable/`.
- Resolves the latest 22.x patch version by curling the directory listing.
- Exposes `NODE_PORTABLE_BIN` env var pointing at `.node-portable/bin`.
- Idempotent: re-run is no-op if version already correct.

**T1.2 — Write `scripts/bootstrap-node.ps1`**
- Same contract, Windows-flavored: downloads `node-v22.x.x-win-x64.zip`, verifies SHA256, expands with `Expand-Archive` into `.node-portable\`.
- Note: nodejs.org's Windows .zip is also at `latest-v22.x/`.

**T1.3 — Append `.node-portable/`, `ffmpeg-portable/`, `start.log`, `.node-bootstrap.lock` to `.gitignore`.**

### Wave 2 — Main entry scripts (depend on Wave 1)

**T2.1 — Write `start.sh`** (Linux)
- Banner with version + dependency status.
- Source `scripts/bootstrap-node.sh`; call `ensure_portable_node`.
- `ensure_linux_system_deps()`: probe `xvfb`, `chromium-browser` or `chromium`, `ffmpeg`, `python3`, `make`, `g++` via `command -v`. If any missing AND distro is Debian/Ubuntu (detect via `/etc/os-release` ID/ID_LIKE), prompt user via `read -p` and run `sudo apt update && sudo apt install -y <missing>`. If non-apt distro and missing deps → print missing-list + per-distro hint (Fedora `dnf`, Arch `pacman`) and exit non-zero.
- `ensure_node_modules()`: if `node_modules/` missing OR `node_modules/.package-lock.json` differs from `package-lock.json` → run `"$NODE_PORTABLE_BIN/npm" ci`.
- `start_server()`: launch under Xvfb. Use a free display number (probe `:99` then `:100` etc.). Background the server, capture PID in `.server.pid`, stream stdout/stderr to `start.log`.
- `health_probe()`: loop `curl -fsS http://localhost:${PORT:-8080}/api/health` for up to 90 s; print spinner.
- `open_browser()`: `xdg-open "http://localhost:${PORT}/"` (fallback: print URL).
- Trap `SIGINT`/`EXIT` to kill server + Xvfb cleanly.

**T2.2 — Write `start.ps1`** (Windows)
- Banner.
- Architecture gate: bail if `$env:PROCESSOR_ARCHITECTURE -ne 'AMD64'`.
- Source `scripts/bootstrap-node.ps1`; call `Ensure-PortableNode`.
- `Ensure-WindowsChromium`: probe Chrome at `$env:ProgramFiles\Google\Chrome\Application\chrome.exe`, `$env:LocalAppData\Google\Chrome\Application\chrome.exe`; fall back to Edge at `${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe`. If none → print install link (https://www.google.com/chrome/) + exit.
- `Ensure-PortableFfmpeg`: if `ffmpeg-portable\bin\ffmpeg.exe` missing → download BtbN zip, extract.
- Export `TTB_CHROMIUM_EXECUTABLE` (consumed by `ssr-render-host.mjs` `detectChromiumBinary()`) + `FFMPEG_PATH` (consumed by puppeteer-stream config).
- `Ensure-NodeModules`: equivalent of T2.1's `ensure_node_modules`. On `npm ci` failure, detect "mediasoup-worker prebuilt fetch failed" in log, print `MEDIASOUP_WORKER_BIN` override hint.
- `Start-Server`: `Start-Process node server.mjs -NoNewWindow -RedirectStandardOutput start.log -PassThru`, save PID.
- `Health-Probe`: `Invoke-WebRequest http://localhost:$PORT/api/health` loop.
- `Open-Browser`: `Start-Process "http://localhost:$PORT/"`.
- Register `[Console]::CancelKeyPress` for clean shutdown.

**T2.3 — Write `start.bat`** (Windows entry)
- Single line: `@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*`
- Plus `pause` at end on error so double-click users see the message.

### Wave 3 — Server-side glue (depends on Wave 2 only for naming)

**T3.1 — Honor `TTB_CHROMIUM_EXECUTABLE` env var in `ssr-render-host.mjs`'s `detectChromiumBinary()`.**
- Currently `detectChromiumBinary()` walks a Linux-only candidate list. Add: at top, if `process.env.TTB_CHROMIUM_EXECUTABLE` is set and the path exists, return it. This is how the Windows path injects Chrome/Edge.
- Linux path unaffected.

**T3.2 — Honor `FFMPEG_PATH` env var where puppeteer-stream is configured.**
- Search for the `getStream(...)` or `ffmpegPath` config site in the SSR pipeline. If absent (relying on PATH), add `ffmpegPath: process.env.FFMPEG_PATH || undefined`.
- Linux path uses system ffmpeg → env unset → unchanged.

### Wave 4 — Docs + cleanup

**T4.1 — Write `docs/INSTALL.md`** (~150-line end-user guide):
- "Linux: open terminal → cd to repo → `./start.sh`."
- "Windows: double-click `start.bat`." (Defender SmartScreen note: "More info → Run anyway" if needed.)
- Screenshots of expected console output / browser landing.
- Troubleshooting table: "sudo password prompt", "Chrome missing", "port 8080 in use", "behind corporate proxy".

**T4.2 — README.md hook**
- Insert a "Quick start (non-developers)" section pointing at `start.sh` / `start.bat` and `docs/INSTALL.md` near the top.

### Wave 5 — Validation

**T5.1 — Dry-run + syntax check `start.sh`**
- `bash -n start.sh` (syntax)
- Run with `DRY_RUN=1` mode that probes everything but skips downloads/installs.
- Mock the Node-already-present path → ensure no download attempted.

**T5.2 — Dry-run + syntax check `start.ps1`**
- `pwsh -NoProfile -File start.ps1 -DryRun` (mirror DRY_RUN flag).
- Run via `pwsh -Command "Get-Command -Syntax start.ps1"` if available.
- Note: we can syntax-check from a Linux box if `pwsh` (PowerShell 7) is installed locally; otherwise note as "manual verification required on Windows host."

**T5.3 — End-to-end smoke on current dev host**
- Run `./start.sh` from the dev host (Linux). All deps already present → should reach browser-open in <30 s, no apt prompts, no Node download.
- Verify `xdg-open` triggers (or fall back gracefully if dev is headless).
- `Ctrl+C` → clean shutdown of server + Xvfb.

### Wave 6 — Closure

**T6.1 — Write `45-CLOSURE.md`**
**T6.2 — Update `.planning/STATE.md` lifecycle block**
**T6.3 — Commit + tag `phase-45-closed`**

## Wave dependency graph

```
Wave 1 (T1.1, T1.2, T1.3)
   ↓
Wave 2 (T2.1, T2.2, T2.3) — T2.1 || T2.2 are independent, can be parallel
   ↓
Wave 3 (T3.1, T3.2) — Wave 3 can actually start as soon as we know env var names; not strictly blocked on Wave 2 completion
   ↓
Wave 4 (T4.1, T4.2) — after Wave 2 stabilized (need to know final command names)
   ↓
Wave 5 (T5.1, T5.2, T5.3) — validation
   ↓
Wave 6 (T6.1, T6.2, T6.3) — closure
```

## Verification criteria (goal-backward)

1. **Cold-start success on Linux:** Fresh Ubuntu 24.04 VM → `git clone` + `./start.sh` → browser open within 5 minutes. **Cannot test in this phase** (need fresh VM); instead validate that:
   - Each apt package detection is correct
   - Node download URL parsing matches current nodejs.org listing format
   - SHA256 verification logic is correct
2. **Warm-restart success on Linux:** `./start.sh` on the current dev host (all deps present) → browser-open in <30 s.
3. **Idempotency:** Run `./start.sh` twice in a row → second run no-ops the bootstrap.
4. **Clean shutdown:** `Ctrl+C` from running start.sh → server + Xvfb both killed, `.server.pid` cleared.
5. **`start.ps1` static analysis passes** (no syntax errors when parsed by PowerShell, via `pwsh -NoProfile -Command "& { $null = [scriptblock]::Create((Get-Content -Raw start.ps1)) }"`).
6. **No regressions:** Existing `node server.mjs` boot path still works unchanged. The new scripts are an *additional* entry, not a replacement.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| nodejs.org SHASUMS format changes | Pin to a known-good Node 22.x version as fallback; document version-bump procedure |
| BtbN FFmpeg-Builds URL changes | Hardcode the "latest" redirect URL; on failure print manual-fetch hint |
| Corporate proxy blocks npm prebuilt fetch on Windows | Print `MEDIASOUP_WORKER_BIN` override hint as defensive fallback (see CONTEXT.md) |
| User runs script from a non-repo directory | Probe `package.json` presence at script start; bail with clear error |
| Port already in use | Detect via `lsof -i:$PORT` (Linux) / `netstat -ano` (Windows); print which PID has it |
| Defender SmartScreen blocks start.bat on Windows | Document "More info → Run anyway" in INSTALL.md; long-term: code-sign (out of scope) |
| Concurrent invocations | `flock` on Linux / mutex file on Windows around the bootstrap section |

## Non-goals (out of scope)

- Mac support (no operator demand)
- ARM64 Windows (no mediasoup prebuilt)
- Auto-update of the TT-Beamer source
- GUI installer
- Service / autostart-on-boot
- Bundling Node in the repo itself (we download on first run)
- Building our own mediasoup-worker from source on Windows
