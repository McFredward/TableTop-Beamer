# Installation — Quick Start for Non-Developers

This guide is for **operators** (not developers) who just want to run
TT-Beamer on their game-night machine without learning Node.js or npm.

> **TL;DR**
> - **Linux:** Open a terminal in the project folder → run `./start.sh`.
> - **Windows:** Double-click `start.bat`.
>
> First run takes ~2-5 minutes (downloads Node + dependencies).
> After that, every subsequent start is under 30 seconds.

---

## What the start scripts do

When you run `start.sh` or `start.bat`, the script:

1. **Downloads a portable Node.js 22** into `.node-portable/` *inside the
   project folder*. No admin / sudo needed for this step — the Node binary
   lives only here, never in your system.
2. **Checks that system tools are installed** (Chrome/Edge browser,
   ffmpeg, on Linux also Xvfb).
   - On **Debian/Ubuntu Linux**, missing tools are installed via
     `sudo apt install` — you'll be prompted once for your password.
   - On **Windows**, Chrome or Edge must already be present (Edge ships
     with Windows by default). ffmpeg is fetched as a portable zip into
     `ffmpeg-portable/` — no admin needed.
3. **Installs the project dependencies** by running `npm ci`. This pulls
   the `mediasoup-worker` binary automatically — no Visual Studio Build
   Tools needed.
4. **Starts the server** in the background.
5. **Opens the dashboard** at http://localhost:4173/ in your default
   browser. The console also prints the **LAN URL** (e.g.
   `http://192.168.0.80:4173/`) — open that on your phone/tablet, and
   the `/output/` URL on your projector Pi.

Press **Ctrl+C** in the terminal/console window to stop the server cleanly.

---

## Linux (Debian / Ubuntu / Mint / Pop!_OS)

### Prerequisites

- A 64-bit Intel/AMD Linux box (`x86_64`) — ARM64 also works.
- `bash`, `curl`, `tar` already installed (default on every modern Linux).
- A user account that can `sudo apt install` (i.e. an admin/sudo user).

### First run

1. Download or `git clone` the TT-Beamer repository.
2. Open a terminal in the project folder.
3. Run:
   ```bash
   ./start.sh
   ```
4. When prompted, type your password (this is needed once to install
   `xvfb chromium-browser ffmpeg build-essential python3`).
5. Wait ~2-3 minutes while Node, system packages, and npm modules install.
6. Your default browser will open the dashboard automatically.

### Subsequent runs

```bash
./start.sh
```

No password prompt, no downloads — should reach the dashboard in under
30 seconds.

### Other Linux distros (Fedora / Arch / openSUSE)

The script can't auto-install on non-`apt` distros, but it will print
the exact install command for your distro and exit. Just run that
command once, then re-run `./start.sh`.

---

## Windows 10 / 11

### Prerequisites

- A 64-bit Windows box (`AMD64`). ARM64 Windows is **not supported**
  because mediasoup doesn't ship ARM64 Windows prebuilts.
- Google Chrome **or** Microsoft Edge installed. (Edge is built-in on
  Windows 10/11; if you've uninstalled it, reinstall it from the
  Microsoft Store, or grab Chrome from https://www.google.com/chrome/ .)

### First run

1. Download or unzip the TT-Beamer repository to a folder on your PC.
2. Open the folder in **File Explorer**.
3. Double-click `start.bat`.
4. A console window opens. Wait ~2-5 minutes while it downloads:
   - Node.js 22 (~30 MB)
   - ffmpeg portable build (~92 MB)
   - npm dependencies including the mediasoup worker (~150 MB)
5. Your default browser opens the dashboard automatically.

### Subsequent runs

Just double-click `start.bat` again. Skips all downloads — dashboard
opens in under 30 seconds.

### Expected behavior

After `start.bat` boots successfully, you should see the LAN URL banner
in the cmd window — the same banner Linux operators see with
`./start.sh`. You will **NOT** see a separate Chrome window pop up on
your desktop: TT-Beamer runs the SSR Chromium tab in headless mode on
Windows, which is the same parity behavior Linux gets via Xvfb. The
dashboard auto-opens in your default browser. To stop, press **Ctrl+C**
in the cmd window — all `node.exe`, `chrome.exe`, and
`mediasoup-worker.exe` children exit within 5 seconds (the Job Object
cleanup introduced in Phase 46 iter14 guarantees this on Ctrl+C, on
cmd-window close, and on Task Manager kill).

### Troubleshooting Windows: full launch-args dump (bug reports)

Set `SSR_LOG_LAUNCH_ARGS=1` before launching to dump the full resolved
Chromium command line into `start.log`. Useful when filing a bug — copy
the `[ssr-host] launch args (win32): ...` line and paste it into your
bug report. The line appears once at boot, immediately before Chrome is
spawned.

### "Windows protected your PC" / SmartScreen popup

Windows Defender SmartScreen may warn that `start.bat` is "unrecognized."
This is normal for unsigned scripts. Click:

1. **"More info"**
2. **"Run anyway"**

(If you'd rather not see this prompt, right-click `start.bat` →
Properties → check **Unblock** → OK.)

---

## Troubleshooting

### Linux: "permission denied" when running `./start.sh`

The script lost its executable bit (can happen after a manual copy).
Restore it:
```bash
chmod +x start.sh
```

### Linux: `sudo apt install` fails with "Unable to locate package"

Update the package cache first:
```bash
sudo apt update
```
Then re-run `./start.sh`.

### Linux: "No free X display in :99..:108"

Another Xvfb instance is running. Either reboot, or find + kill it:
```bash
pgrep Xvfb | xargs -r kill
```

### Windows: "no Chrome or Edge browser found"

Install Microsoft Edge (Microsoft Store) or Google Chrome
(https://www.google.com/chrome/), then re-run `start.bat`.

### Windows: `npm ci` fails with "mediasoup-worker prebuilt fetch failed"

Usually means your corporate / school network blocks the download.
Workaround:

1. From an unrestricted network (home, mobile hotspot), manually download
   the matching `mediasoup-worker-*-win-x64.tgz` from
   https://github.com/versatica/mediasoup/releases
2. Extract `mediasoup-worker.exe` to a known path.
3. Set the env var:
   ```cmd
   set MEDIASOUP_WORKER_BIN=C:\path\to\mediasoup-worker.exe
   ```
4. Re-run `start.bat`.

### Port 4173 already in use

Set a different port:

**Linux:**
```bash
PORT=9000 ./start.sh
```

**Windows (cmd):**
```cmd
set PORT=9000
start.bat
```

**Windows (PowerShell):**
```powershell
$env:PORT="9000"; .\start.bat
```

### "Dashboard didn't open automatically"

The server is still running — open the URL manually:
- http://localhost:4173/

### Health probe timed out

Check `start.log` in the project folder. The last 30 lines are also
printed to the console when this happens.

---
---

## Advanced: skip the script

If you already have Node 22+, system Chromium, ffmpeg, and (on Linux)
Xvfb installed, you can boot directly with:

```bash
npm ci
node server.mjs
```

The start scripts are a convenience layer, not a requirement.
