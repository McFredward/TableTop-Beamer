---
phase: 45
slug: click-and-run-installers
status: PLANNING
opened: 2026-05-16
predecessor: phase-44-closed (commit a114088)
---

# Phase 45 — Click-and-Run Installer Scripts (Linux + Windows)

## TL;DR

Provide laypeople-friendly start scripts for both Linux and Windows so a
non-technical user can download the repo, double-click one file, and have
TT-Beamer up and running with browser auto-opened to the dashboard.

The script handles: Node.js bootstrap (portable, no admin), all system
dependencies (with sudo/UAC prompts only where unavoidable), `npm ci`,
server boot, health probe, browser open.

**Target experience:** "Ich klick irgendwo drauf und alles wird übernommen."

## Decisions locked by operator (2026-05-16)

| Decision | Choice | Rationale |
|---|---|---|
| Node.js bootstrap | **Portable** — download Node tarball to `.node-portable/` in project dir on first run | No admin/sudo needed; per-project; works identical on Linux + Windows |
| Linux system deps (Xvfb, chromium, ffmpeg, build-essential, python3) | **Auto-install via `sudo apt`** (Debian/Ubuntu only first-class) | Maximum laypeople ease. Non-apt distros fall back to clear instruction print |
| Browser auto-open | **Yes** — after `/api/health` 200, open dashboard URL in default browser (`xdg-open` / `start`) | Closes the "now what?" gap for non-technical users |
| Stability bar | "Möglichst stabil gegenüber verschiedene Umgebungen" | Detect-then-act; defensive PATH handling; idempotent first-run vs every-run |

## Dependency matrix (what TT-Beamer needs at runtime)

From `scripts/wave0-environment-check.sh` + `src/server/ssr-render-host.mjs`:

| Dependency | Linux | Windows | Notes |
|---|---|---|---|
| Node.js >= 18 | portable | portable | Bootstrapped per-project, no admin |
| System Chromium | apt: `chromium-browser` or `chromium` | TBD | SSR uses `detectChromiumBinary()` — *system* chromium, NOT puppeteer-bundled |
| ffmpeg | apt: `ffmpeg` | portable .zip from gyan.dev or BtbN | Used by puppeteer-stream |
| Xvfb | apt: `xvfb` | **N/A** | Linux-only virtual X display |
| build-essential + python3 + make + gcc | apt | MSVC Build Tools + Python | Required to compile mediasoup native worker |
| mediasoup-worker binary | compiled at `npm install` time | **OPEN** — see below | The make-or-break for Windows |

## Windows mediasoup strategy (locked after research)

**LOCKED: Use upstream npm prebuilts. No VS Build Tools, no WSL2, no admin.**

Research (2026-05-16, see Bottom-Line in conversation log) confirmed:

- mediasoup 3.12+ ships **prebuilt `mediasoup-worker.exe`** binaries.
  Pulled automatically by `npm install mediasoup@^3.14` postinstall hook
  on `windows-2022` / `windows-2025` x86_64 hosts. **No compiler needed.**
- mediasoup 3.x requires **Node ≥ 22** at runtime → portable Node bootstrap
  must fetch Node 22 LTS (or current LTS) on both platforms.
- `puppeteer-stream` accepts an explicit `ffmpegPath`, so we bundle/portable
  `ffmpeg.exe` from `BtbN/FFmpeg-Builds` releases (no PATH mutation).
- System Chromium: detect `%ProgramFiles%\Google\Chrome\Application\chrome.exe`
  and `%LocalAppData%\Google\Chrome\Application\chrome.exe`; Edge
  (`%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe`) as fallback.
- Architecture gate: `%PROCESSOR_ARCHITECTURE%==AMD64` required (ARM64 has
  no upstream prebuilt). Fail fast with clear message on ARM64.

Defensive fallback in script: if `npm ci` fails because the prebuilt fetch
failed (corporate proxy, offline machine, etc.) → print one-liner with
`MEDIASOUP_WORKER_BIN` override + link to releases page. Do NOT auto-invoke
winget Build Tools install — that's the 8 GB UAC trap.

## Out of scope

- macOS (not a target operator platform per project history)
- ARM Linux (server is x64-only)
- Auto-update of TT-Beamer code (operator manages git pulls / re-downloads)
- GUI installer (`.msi` / `.deb`) — script-based only
- Daemonization / service install (operator double-clicks each session)

## Success criteria

1. On a fresh Ubuntu 24.04 VM with only `bash` + `curl` available, downloading
   the repo + running `./start.sh` results in browser opening to the
   dashboard within ~5 minutes (most time spent on apt + npm install).
2. Same outcome on a fresh Windows 11 box with PowerShell available
   (path depends on Windows-mediasoup strategy chosen in PLAN.md).
3. Subsequent re-runs of the script (everything already installed) reach
   browser-open in under 30 seconds.
4. Scripts emit clear progress messages — non-technical user can see
   what's happening + understand failures.
5. Scripts are idempotent — running twice in a row is safe.
