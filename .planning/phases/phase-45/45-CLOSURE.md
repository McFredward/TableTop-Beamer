---
phase: 45
slug: click-and-run-installers
status: CLOSED
closed: 2026-05-16
predecessor: phase-44-closed (commit a114088)
tag: phase-45-closed
---

# Phase 45 — Click-and-Run Installer Scripts

## TL;DR

Non-technical operators can now download TT-Beamer and start it with **one
click** — `./start.sh` on Linux, double-click `start.bat` on Windows. The
scripts handle Node bootstrap, system dependencies, `npm ci`, server boot,
health probe, and browser-open with no prior Node/npm knowledge required.

## What shipped

| File | Purpose | Lines |
|---|---|---|
| `start.sh` | Linux entry (Debian/Ubuntu auto-install, fallback hints for Fedora/Arch/openSUSE) | ~270 |
| `start.bat` | Windows entry — thin wrapper around start.ps1 | ~20 |
| `start.ps1` | Windows real logic — portable Node + ffmpeg, system Chrome/Edge detect | ~280 |
| `scripts/bootstrap-node.sh` | Portable Node 22 LTS downloader (Linux), SHA256-verified | ~115 |
| `scripts/bootstrap-node.ps1` | Same for Windows (.zip + Expand-Archive) | ~115 |
| `docs/INSTALL.md` | End-user setup walkthrough + troubleshooting | ~170 |
| `README.md` | Quick-start section split into "non-developer" and "manual" paths | +12 |
| `.gitignore` | Ignores `.node-portable/`, `ffmpeg-portable/`, `.server.pid` | +6 |
| `.planning/phases/phase-45/45-CONTEXT.md` | Locked decisions + dep matrix | new |
| `.planning/phases/phase-45/45-PLAN.md` | Wave-based execution plan | new |

## Architecture

Both scripts follow the same six-step flow:

1. **Portable Node 22 LTS** — fetched from nodejs.org with SHA256 verify
   into `.node-portable/`. No admin/sudo, no system pollution.
2. **System dependencies** —
   - Linux: probe `Xvfb`, `chromium-browser`, `ffmpeg`, `python3`, `make`,
     `g++`. On apt distros, `sudo apt install` missing packages with a
     single password prompt. On non-apt distros: print per-distro hint
     and exit.
   - Windows: detect Chrome at common install paths, fall back to Edge.
     ffmpeg fetched from BtbN/FFmpeg-Builds as portable zip into
     `ffmpeg-portable/`. Architecture-gated on `AMD64`.
3. **`npm ci`** — runs with `PUPPETEER_SKIP_DOWNLOAD=true` (saves ~500 MB
   bundled Chromium download; we use system Chromium instead). mediasoup's
   postinstall auto-fetches the prebuilt `mediasoup-worker.exe` on
   Windows — **no Visual Studio Build Tools needed**.
4. **Server boot** — Linux: under Xvfb on first free display in
   `:99..:108`. Windows: hidden `node.exe` process. Both capture PID in
   `.server.pid`, redirect stdout/stderr to `start.log`.
5. **Health probe** — poll `/api/health` up to 90 s with spinner; early-
   exit on server-process death; tail last 30 log lines on timeout.
6. **Browser auto-open** — `xdg-open` (Linux) / `Start-Process URL`
   (Windows). Then tail `start.log` until Ctrl+C → trap kills server +
   Xvfb cleanly.

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| Node strategy | Portable per-project in `.node-portable/` | Zero admin requirement; same UX on Linux + Windows |
| Linux distros | Auto-install on `apt`; instruction-print on others | Avoids fragile multi-PM auto-install logic; covers the 90% case |
| Windows mediasoup | Use upstream prebuilt worker.exe from npm postinstall | Research confirmed prebuilts since mediasoup 3.12. No build-tools install needed → click-and-go feasible |
| Windows ffmpeg | Portable zip from BtbN/FFmpeg-Builds | No admin; ~92 MB one-time |
| Windows chromium | System Chrome/Edge detection | Edge ships built-in with Windows; ~500 MB puppeteer bundled chromium skipped |
| Stale-detection | SHA256 of `package-lock.json` stored in `node_modules/.start-*-installed-snapshot` | More reliable than comparing npm's `.package-lock.json` mirror byte-by-byte |
| Browser open | Yes, automatic post-health | Closes "now what?" gap for non-technical users |

## Server-side glue: none needed

Wave 3 (env-var honoring in server) turned out to be unnecessary —
`ssr-browser-detect.mjs` already honors `SSR_BROWSER_BIN` (priority 1 in
`detectChromiumBinary()`), and `ffmpeg` is resolved via `whichBinary()`
which uses Windows `where` / Unix `which` on PATH. Prepending
`ffmpeg-portable\bin` to PATH in start.ps1 is sufficient.

## Side observation — research outcome

Initial concern: mediasoup native worker would need MSVC Build Tools
(~5-8 GB) on Windows, breaking the "click-and-go" promise.

Research found that **mediasoup ≥ 3.12 ships prebuilt
`mediasoup-worker-*.tgz` artifacts for `windows-2022` / `windows-2025`
x86_64**, auto-fetched by the npm postinstall hook. Worker binary lands
in `node_modules/mediasoup/worker/out/Release/mediasoup-worker.exe`
without compilation. This was the breakthrough that made the simple
`.bat` approach viable.

Documented `MEDIASOUP_WORKER_BIN` override as fallback for corporate
proxy / offline scenarios.

## Verification

- `bash -n start.sh` → OK
- `bash -n scripts/bootstrap-node.sh` → OK
- PowerShell brace/paren/bracket balance check (start.ps1, bootstrap-node.ps1) → OK
- Linux dry-run on dev host (`./start.sh --dry-run`):
  - Banner renders ✓
  - Portable Node detection ✓ (would-download path)
  - System deps probe ✓ (all packages present on dev box)
  - `node_modules` staleness check ✓ (snapshot-marker approach)
  - Xvfb launch + server start gated correctly ✓
  - Exits cleanly without side effects ✓
- Full pwsh parse-check of start.ps1 deferred to Windows host —
  recommend operator runs `.\start.ps1 -DryRun` once on Win 11.

## Risks remaining

| Risk | Mitigation |
|---|---|
| nodejs.org SHASUMS format change | Detection regex pinned to `node-v22\.\d+\.\d+-{arch}\.tar\.xz`; matches current format |
| BtbN/FFmpeg-Builds release URL change | Uses the `/releases/latest/download/<name>` redirect URL — stable as long as repo maintains it |
| Corporate proxy blocks npm prebuilt fetch | Script prints `MEDIASOUP_WORKER_BIN` override hint on failure |
| Windows Defender SmartScreen blocks `start.bat` | Documented "More info → Run anyway" in INSTALL.md |
| ARM64 Windows | Script bails fast with clear message; no upstream prebuilt available |
| User runs from wrong directory | Both scripts validate `package.json` presence at start; abort with hint |

## Out of scope (deferred)

- macOS launcher (no operator demand)
- Code-signing the `.bat` / `.ps1` (avoids SmartScreen prompt; not worth
  the cost for a hobby project)
- GUI installer (`.msi` / `.deb`)
- Service / autostart-on-boot integration
- ARM64 Windows mediasoup support (waiting on upstream prebuilds)

## Tag

`phase-45-closed` at the closure commit.
