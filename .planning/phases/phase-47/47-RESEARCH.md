# Phase 47: Windows Full-Functional Parity with Linux — Research

**Researched:** 2026-05-17
**Domain:** Headless-Chrome SSR + WebRTC + tab capture on Windows 10/11; Win32 process supervision; PowerShell 5.1 launcher hygiene
**Confidence:** MEDIUM-HIGH (Q1 / Q2 / Q4 / Q5 verified, Q3 verified at flag level, Q6 verified, Q7 verified)

---

<user_constraints>
## User Constraints (from 47-CONTEXT.md)

### Locked Decisions

- **D-01:** Use system-installed Chrome/Edge with full isolation: unique `--user-data-dir` per puppeteer launch + `headless: "new"` mode (replaces iter15 off-screen-window hack). **NOT** Chrome-for-Testing — that stays a documented fallback only.
- **D-02:** Linux launch path (Xvfb + `headless: false` + headful Chromium) stays UNCHANGED. Every Windows-specific change MUST be gated behind `process.platform === "win32"` in `src/server/ssr-render-host.mjs`. Linux is the regression rail.
- **D-03:** WebRTC + `getDisplayMedia` + tab-capture MUST work in `--headless=new`. Phase 31 RESEARCH § Pitfall 1 ("headless disables WebRTC + audio") is the PREMISE that locked headful in 2026-05-06 — **outdated as of 2026-05-17** per this research. M1 validates empirically; M2 falls back to Win32 ShowWindow(SW_HIDE) P/Invoke if M1 surfaces a hard blocker.
- **D-04:** Keep the Win32 Job Object + `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` (iter14). Verify operator's actual termination patterns are covered.
- **D-05:** Ctrl+C / cmd-window-close / Task Manager kill must all leave ZERO orphan node.exe / chrome.exe / mediasoup-worker.exe within 5s. UAT: `tasklist | findstr "node.exe chrome.exe"` pre vs post.
- **D-06:** Operator UAT on operator's Windows 10/11 box is the primary acceptance gate. No Windows CI runner this phase.
- **D-07:** Linux non-regression verified by `./start.sh --dry-run` + `npm test` baseline (404 / 384 pass / 1 pre-existing fail unchanged).
- **D-08:** Build on top of iter15 (commit `66da2d3`). Iter11-iter15 fixes stay (ASCII PS, Job Object, unique user-data-dir, off-screen positioning).
- **D-09:** `phase-46-closed` tag stays at `66da2d3`. Phase 47 makes new commits; closure tag is `phase-47-closed`.

### Claude's Discretion

Anything outside D-01..D-09 is implementation choice for planner/executor: which CDP commands, what shape the Win32 P/Invoke takes if needed, env-probe report changes for Windows, diagnostic logs, M2 atomic-commit structure, RESEARCH.md layout.

### Deferred Ideas (OUT OF SCOPE)

- GitHub Actions windows-latest CI
- Chrome-for-Testing bundling (kept as M1 fallback only)
- macOS launcher
- WSL detection / WSL-specific paths
- Removing iter11-iter15 commits (operator explicitly rejected)
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 47 has no formal REQ-IDs (phase has no `47-REQUIREMENTS.md` — the operator-side acceptance criteria are captured in `47-CONTEXT.md`). For traceability the planner can use the following synthetic IDs derived from D-01..D-09 and 47-CONTEXT § domain:

| ID | Behavior | Research Support |
|----|----------|------------------|
| WIN-01 | `start.bat` → server up, dashboard URL printed, NO visible Chrome window | Q1 (headless-new + WebRTC verified), Q3 (Win flag translation), Q4 (P/Invoke fallback) |
| WIN-02 | SSR Chromium tab successfully loads `http://127.0.0.1:4173/ssr` and stays connected | Q1 (no more ERR_ABORTED — root cause is launch attach, not nav), Q2 (single-instance defeat) |
| WIN-03 | `getDisplayMedia({ video: true })` succeeds inside headless-new SSR tab and produces a WebRTC Producer | Q1 (puppeteer-stream supports headless:"new"; Chrome 112+ unified headless = full WebRTC parity) |
| WIN-04 | `--auto-select-tab-capture-source-by-title=TableTop Beamer` auto-grants display-media in headless-new | Q3 (flag exists, documented for tab-only capture; Chromium switches list) |
| WIN-05 | Ctrl+C in launcher → 0 orphan processes within 5s | Q5 (iter13 `add_CancelKeyPress` + iter14 Job Object) |
| WIN-06 | Close cmd window via X / Task Manager "End Task" cmd.exe → 0 orphans within 5s | Q5 (CloseHandle on job → KILL_ON_JOB_CLOSE fires when last handle gone) |
| WIN-07 | Task Manager "End Task" on node.exe → chrome.exe + mediasoup-worker.exe also die | Q5 (children associated with job; OS terminates whole job when last open handle closes — caveat: see Q5) |
| WIN-08 | Linux path unaffected — `./start.sh --dry-run` PASS, `npm test` 384 pass baseline | Q7 (verification probe set) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` exists at repo root. No `.claude/skills/` or `.agents/skills/` directories. Project conventions are encoded in:
- `.planning/STATE.md` (decision log)
- existing module patterns (`process.platform === "win32"` branching inline, `SSR_*` env-var prefix)
- README + docs/INSTALL.md (operator-facing)

## Summary

The Phase 31 § Pitfall 1 lock on "headless disables WebRTC + audio" was correct for **legacy** `--headless=true` (the `chrome-headless-shell` separate-binary path). **As of Chrome 112 (April 2023)**, `--headless=new` is the same Chrome binary as headful with platform windows simply not displayed — `[CITED: developer.chrome.com/docs/chromium/headless]` "Chrome creates, but doesn't display, any platform windows. All other functions, existing and future, are available with no limitations." Chrome 132 (January 2025) drops the `=new` suffix entirely — `--headless` IS new-headless now; the legacy mode survives only as a standalone `chrome-headless-shell` binary.

`puppeteer-stream@3.0.22` (the version pinned in `package.json`) explicitly supports `headless: "new"`: its launcher auto-appends `--headless=new` to args and removes `--mute-audio` from `ignoreDefaultArgs` to enable audio in that mode (`node_modules/puppeteer-stream/dist/PuppeteerStream.js` lines 93-101). The TT-Beamer publisher does NOT use `chrome.tabCapture` — it uses `navigator.mediaDevices.getDisplayMedia()` inside the SSR page (`src/server/ssr-stream-publisher.mjs:199`), auto-granted via the `--auto-select-tab-capture-source-by-title=TableTop Beamer` Chromium switch matching `<title>TableTop Beamer</title>` in `index.html:7`. Both of these mechanics are documented to work in unified headless and are independent of the legacy headless-shell restrictions.

iter15's `ERR_ABORTED` failure is a **launch-time chrome-attach race**, not a navigation problem: when Chrome's normal instance is running, a fresh `chrome.exe --app=URL` without a unique `--user-data-dir` IPCs to the existing instance and exits, dropping puppeteer's DevTools pipe. iter15 already added the unique tmp user-data-dir which solves the attach race. The remaining failure surface in the operator's UAT log (`browser disconnected unexpectedly` + restart loop) is most likely either (a) the off-screen window hack interacting badly with Chrome's window-occlusion / lifecycle tracking, or (b) Chrome 131's "Chrome for Testing" download-fallback when SSR_BROWSER_BIN isn't honored end-to-end. Phase 47 collapses both into a single resolution: switch to `headless: "new"` (no window = no occlusion problems = no flickering pop-ups) and drop the off-screen-window hack. The Job Object (iter14) + Ctrl+C handler (iter13) + ASCII-only .ps1 (iter12) + parenthesis-safe env var read (iter11) all stay.

**Primary recommendation:** In `src/server/ssr-render-host.mjs#launchBrowser`, gate four Windows-specific changes behind a single `isWin32` flag:
1. `headless: "new"` (was `false`)
2. drop `--window-position=-32000,-32000` and `--app=about:blank` — irrelevant under headless-new
3. keep the unique `--user-data-dir` under tmp (D-08)
4. add a Wave-0 smoke probe that empirically verifies `getDisplayMedia()` returns a video track inside the SSR tab and that the WebRTC Producer reaches `state.videoProducer` within 30s

If M1's smoke test fails (no video track, or Producer never lands), fall back to **headful + Win32 ShowWindow(SW_HIDE) P/Invoke** — already feasible with the existing `Add-Type`/P-Invoke pattern from iter14. Documented as risk mitigation, not the primary path.

---

## Question-by-question findings

### Q1 — Does Chrome --headless=new support WebRTC + getDisplayMedia + tab-capture in 2026?

**Answer:** YES. Confidence: HIGH (Chrome docs + puppeteer-stream code + version-pin evidence).

**Evidence:**

1. **Chrome 112+ unified headless (Apr 2023).** `[CITED: https://developer.chrome.com/docs/chromium/headless]`
   > "In Chrome 112, we updated Headless mode so that Chrome creates, but doesn't display, any platform windows. All other functions, existing and future, are available with no limitations."
   > "Chrome now has unified Headless and headful modes."

   Since Chrome 132 (January 2025), `--headless=new` is no longer needed — `--headless` IS new-headless; the legacy mode survives only as standalone `chrome-headless-shell` binary. Operator's Chrome on Win11 is current-stable (post-132); both flag spellings work.

2. **puppeteer-stream supports headless:"new" explicitly.** From `node_modules/puppeteer-stream/dist/PuppeteerStream.js` lines 93-101:
   ```js
   opts.headless = opts.headless === "new" ? "new" : false;
   if (opts.headless) {
       if (!opts.ignoreDefaultArgs) opts.ignoreDefaultArgs = [];
       if (Array.isArray(opts.ignoreDefaultArgs) && !opts.ignoreDefaultArgs.includes("--mute-audio"))
           opts.ignoreDefaultArgs.push("--mute-audio");
       if (!opts.args.includes("--headless=new")) opts.args.push("--headless=new");
   }
   ```
   The library normalizes the option, appends `--headless=new`, and strips `--mute-audio` so audio works.

3. **Maintainer README quote.** `[CITED: https://github.com/SamuelScheit/puppeteer-stream]`
   > "Works also in headless mode (no gui needed), just set `headless: "new"` in the launch options"

4. **TT-Beamer's actual capture path is `getDisplayMedia()` not `chrome.tabCapture`.** `src/server/ssr-stream-publisher.mjs:199` runs `navigator.mediaDevices.getDisplayMedia({ video: true, audio: false, preferCurrentTab: true })` inside the SSR page — the puppeteer-stream extension's `chrome.tabCapture.capture()` path is dead code we never reach. Therefore the MV3 + service-worker tabCapture restriction discussed in puppeteer-stream issues #4 / #189 / #124 does NOT apply to us — those are restrictions on the puppeteer-stream extension, not on `getDisplayMedia` from page context.

5. **`getDisplayMedia` in headless is well-known to work** when `--auto-select-tab-capture-source-by-title=<title>` (or `--auto-select-desktop-capture-source=<title>`) matches. `[CITED: peter.sh/experiments/chromium-command-line-switches]` documents both flags. `[CITED: developer.chrome.com/docs/web-platform/screen-sharing-controls]` describes the standard mechanism. Active OSS projects (fancybits/chrome-capture-for-channels) use the same pattern in production.

**Risk flag:** Phase 31 RESEARCH § Pitfall 1 cites Mux's "Lessons learned" blog (~2021-2022 era) which referenced the OLD `--headless=true` / `chrome-headless-shell`. That citation is **outdated** for new-headless. The empirical Wave-0 smoke (M1) confirms behavior on the operator's exact Chrome build.

**[ASSUMED]** that the operator's Chrome (Win11, system-installed) is Chrome ≥132 (auto-update on consumer Windows reaches stable within 1-2 weeks of release; current Chrome stable as of 2026-05-17 is far past 132). If they have an unusually old build (≥111 but <132), the `=new` suffix is required; puppeteer-stream already adds it. Either way the code works.

### Q2 — Does unique --user-data-dir alone defeat single-instance-attach in headless-new?

**Answer:** YES. Confidence: HIGH (iter15 already proved it for headful; headless-new is the same chrome.exe binary).

**Evidence:**

1. iter15 (`commit 66da2d3`) commit message confirms the root cause: "Chrome on Windows uses `--user-data-dir` as the single-instance key. … The OS-isolated profile path defeats the single-instance key match, so chrome.exe MUST spawn a fresh instance." This applies to **chrome.exe** regardless of headless mode — it's a launcher-side IPC behavior in the Chrome binary, not headful-specific.

2. Phase 47 keeps iter15's user-data-dir code unchanged (D-08). It already creates `os.tmpdir()/ttb-ssr-${pid}-${ts}/` per launch (`src/server/ssr-render-host.mjs:542`).

3. **Important second-key:** the `--user-data-dir` switch must be passed at the chrome.exe command-line level, NOT only via puppeteer's `userDataDir` option. iter15 already routes both — puppeteer's `userDataDir` opt flows down to chrome.exe args. Verify in Wave 0 by checking the launch-arg log (puppeteer logs the resolved `chromeArguments` if `DEBUG=puppeteer:*` is set).

4. **Headless-new specifics:** Chrome 132+'s `--user-data-dir` semantics are identical to headful's per `[CITED: developer.chrome.com/docs/chromium/headless]`'s "unified" claim. No second-class behavior.

**No additional flags needed beyond iter15's set.** `--no-first-run --no-default-browser-check --disable-default-apps` (already present, lines 606-608) cover first-launch hygiene.

### Q3 — Windows-specific Chrome flags for headless-new + tab-capture + WebRTC publisher

**Answer:** Minimal translation needed. Confidence: MEDIUM-HIGH (flag-level verified, exact behavior under operator's GPU is empirical).

**Flag-by-flag analysis vs current iter15 `args` array (lines 558-645):**

| Flag | Linux | Windows headless-new | Action |
|------|-------|---------------------|--------|
| `--no-sandbox` | needed (Linux Chromium quirk) | safe to keep — no-op on Windows Chrome run as user | KEEP for both |
| `--autoplay-policy=no-user-gesture-required` | needed | needed for mp4 autoplay in SSR tab | KEEP for both |
| `--ozone-platform=x11` | needed | already gated to Linux only (iter15 line 564) | UNCHANGED |
| `--use-gl=angle` + `--use-angle=default` | needed (Mesa-llvmpipe under Xvfb) | needed — Chrome ≥131 dropped `--use-gl=egl`; ANGLE is the canonical path on Windows too. `--use-angle=default` lets Chrome pick the best of D3D11 / Vulkan / SwiftShader per `[CITED: WebGPU troubleshooting docs]` | KEEP for both |
| `--enable-unsafe-swiftshader` | needed | needed if Chrome falls back to swiftshader (GPU-less or new sandbox) | KEEP for both |
| `--disable-dev-shm-usage` | Linux-tmpfs trick | no-op on Windows (no /dev/shm) | KEEP for both — harmless |
| `--disable-background-timer-throttling` + `--disable-backgrounding-occluded-windows` + `--disable-renderer-backgrounding` + `--disable-ipc-flooding-protection` | needed under Xvfb | **needed but for a different reason** — under headless-new there are no platform windows so "occluded" is moot, BUT the Chrome renderer still applies background-tab heuristics if the renderer thinks the tab is hidden. Defense-in-depth, keep all four. | KEEP for both |
| `--disable-gpu-vsync` + `--disable-frame-rate-limit` + `--max-gum-fps=60` | needed to lift Xvfb cap | needed to lift headless-new BeginFrameSource cap (headless Chrome has historically capped at 30-60 Hz software paint without these) | KEEP for both |
| `--app=...` | `--app=ssrUrl` works (iter15 path) | iter15 used `--app=about:blank` + `page.goto`. **Under headless-new, `--app` is irrelevant — there's no window UI to suppress.** Drop the `--app=` flag on Windows and skip `page.goto` reroute — just navigate to `ssrUrl` directly via `page.goto` after launch. | CHANGE: drop `--app=` on Windows |
| `--window-size=W,H` | needed | needed — sets the headless viewport | KEEP for both |
| `--window-position=-32000,-32000` | n/a (Xvfb fullscreen) | iter15 hack to hide the window. **Headless-new has no window — drop entirely.** | REMOVE on Windows |
| `--start-fullscreen` | needed for Xvfb capture surface | iter15 already excluded on Windows. | UNCHANGED |
| `--auto-select-tab-capture-source-by-title=TableTop Beamer` | works | works in headless-new (Chromium switch list documents both `--auto-select-desktop-capture-source` and the `-by-title` variant) | KEEP for both |
| `--no-first-run` + `--no-default-browser-check` + `--disable-default-apps` | needed | needed | KEEP for both |
| `--mute-audio` | KEEP (server doesn't play audio after D-D2 reversal) | **puppeteer-stream auto-strips this in headless-new** to enable audio in capture — but we explicitly want it muted (D-D2: audio is Pi-local). Re-add explicitly. | KEEP for both — but be aware puppeteer-stream's `ignoreDefaultArgs.push("--mute-audio")` strips Chrome's default --mute-audio in headless. Our explicit `--mute-audio` arg in `args[]` overrides that. Verify in Wave 0. |
| `--disable-features=...` (merged) | needed | needed — same feature set applies | KEEP for both |
| `--enable-features=...` (merged, VAAPI gated) | needed | **VAAPI is Linux-only** — `VaapiVideoEncoder` / `VaapiVideoDecoder` don't apply on Windows. The `hasVaapiEnabled` gate already requires `/dev/dri/renderD12{8,9}` which is false on Windows → safe today. NVENC (`H264HardwareEncode`) and `TabCaptureFastPath` work on Windows. | UNCHANGED — gating already correct |
| `--ignore-gpu-blocklist` + `--enable-gpu-rasterization` | only when VAAPI enabled | same Linux-only gating applies; safe on Windows by virtue of `hasVaapiEnabled === false` | UNCHANGED |
| `--display=:99` | needed | **DOES NOT APPLY** — Windows Chrome ignores it; the `DISPLAY` env-var in `env: { ... DISPLAY: display }` is a Linux X11 concept. Drop both on Windows for clarity. | REMOVE on Windows (cosmetic — currently no-op but noise in launch log) |

**Recommended new flag set delta (Windows-only branches in `launchBrowser`):**

```js
// Windows headless-new — replace iter15's window-positioning block
const isWin32 = process.platform === "win32";

return launcher({
  executablePath: browserPath,
  headless: isWin32 ? "new" : false,           // CHANGE: was always false
  defaultViewport: viewport,
  ignoreDefaultArgs: ["--enable-automation"],
  ...(winUserDataDir ? { userDataDir: winUserDataDir } : {}),  // KEEP iter15
  args: [
    "--no-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    ...(isWin32 ? [] : ["--ozone-platform=x11"]),
    "--use-gl=angle",
    "--use-angle=default",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-ipc-flooding-protection",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
    "--max-gum-fps=60",
    // DROP --app= on Windows; keep --app=<ssrUrl> on Linux (works under Xvfb fullscreen)
    ...(isWin32 ? [] : [`--app=${ssrUrl}`]),
    `--window-size=${viewport.width},${viewport.height}`,
    // DROP --window-position -32000,-32000 and --start-fullscreen on Windows
    ...(isWin32 ? [] : ["--window-position=0,0", "--start-fullscreen"]),
    "--auto-select-tab-capture-source-by-title=TableTop Beamer",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-default-apps",
    "--disable-prompt-on-repost",
    "--disable-popup-blocking",
    "--disable-notifications",
    "--disable-sync",
    "--mute-audio",  // D-D2: explicit even in headless (puppeteer-stream would strip the default)
    "--hide-crash-restore-bubble",
    "--disable-session-crashed-bubble",
    "--disable-infobars",
    `--disable-features=${disabledFeatures.join(",")}`,
    ...(enabledFeatures.length > 0 ? [`--enable-features=${enabledFeatures.join(",")}`] : []),
    ...(hasVaapiEnabled ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
    // DROP --display= on Windows (no-op, cosmetic noise)
    ...(isWin32 ? [] : [`--display=${display}`]),
  ],
  // DROP DISPLAY env-var on Windows
  env: isWin32 ? { ...process.env } : { ...process.env, DISPLAY: display },
});
```

After launch, on Windows skip the `--app=about:blank` workaround and navigate `page.goto(ssrUrl)` directly — same call already exists at line 881, just becomes the only navigation site instead of being a re-navigation.

### Q4 — Fallback: Win32 ShowWindow(SW_HIDE) feasibility

**Answer:** Feasible but unnecessary if Q1 holds. If M1 finds a hard blocker, two viable approaches exist. Confidence: HIGH for the approach; MEDIUM for timing edge cases.

**Approach A — PowerShell P/Invoke from `start.ps1` (RECOMMENDED if needed):**

The iter14 `Add-Type` + DllImport pattern in `start.ps1:332-373` is the proven template. Extend it with `ShowWindow`/`ShowWindowAsync`/`EnumWindows` from `user32.dll`. After `Start-Process node.exe`, monitor for `chrome.exe` processes whose parent PID chains back to our node.exe, and hide each by HWND:

```powershell
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TtbWin {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  public const int SW_HIDE = 0;
}
'@
# Then iterate Get-Process chrome | ForEach-Object { [TtbWin]::ShowWindow($_.MainWindowHandle, [TtbWin]::SW_HIDE) }
```

`[CITED: learn.microsoft.com/.../winuser/nf-winuser-showwindow]`. SW_HIDE = 0.

**Approach B — Node.js via `koffi` (lighter than `ffi-napi`, native-built so npm install Just Works on Windows):**

```js
import koffi from "koffi";
const user32 = koffi.load("user32.dll");
const ShowWindow = user32.func("bool __stdcall ShowWindow(void *hWnd, int nCmdShow)");
// Then enumerate chrome.exe HWND via FindWindowEx or via puppeteer's
// `browser.process().pid` + a Windows EnumWindows traversal.
```

`koffi` adds ~5 MB to install footprint. `[ASSUMED]` operator accepts that. Reject `ffi-napi` — its native build is fragile on Node 22 Windows and contradicts the "click-and-run, no Visual Studio" promise.

**Timing window analysis:**

The Chrome window appears ~200-1000ms after `chrome.exe` spawn (depends on GPU init). With approach A polling in PS at 50 ms intervals or approach B subscribing to Windows event hooks, the window flickers visible for **at most one frame (~16 ms) before hide** under typical conditions. Under cold-boot with heavy GPU init it might flash for ~500 ms. **Flicker is acceptable per operator UAT** if M1 fails; absence of window is ideal. The operator's primary complaint is "Chrome stays visible," not "Chrome flickers briefly during boot."

**Recommendation:** Document Approach A in PLAN.md as the fallback. Do NOT preimplement. Only execute if M1 smoke test fails.

### Q5 — Process cleanup edge cases on Windows

**Answer:** iter14's Job Object + `KILL_ON_JOB_CLOSE` covers the documented cases. One nuance: KILL_ON_JOB_CLOSE fires when the **last handle to the job is closed**, NOT when the job-creating process exits. Confidence: HIGH (MSDN-cited).

**Per Microsoft Learn `[CITED: learn.microsoft.com/en-us/windows/win32/procthread/job-objects]`:**

> "To close a job object handle, use the CloseHandle function. The job is destroyed when its last handle has been closed and all associated processes have been terminated. However, **if the job has the JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE flag specified, closing the last job object handle terminates all associated processes** and then destroys the job object itself."

`[CITED: Raymond Chen, devblogs.microsoft.com/oldnewthing/20131209-00]`:

> "we mark the job as 'kill on job close' which causes all processes in the job to be terminated when the last handle to the job is closed."
> "We must therefore be careful not to allow this handle to be inherited, because that would create another handle that needs to be closed before the job is terminated."

**Case-by-case for TT-Beamer (operator's actual termination patterns):**

| Termination pattern | Does iter14 handle it? | Why |
|---------------------|------------------------|-----|
| **Ctrl+C in launcher console** | YES (D-05) | iter13's `[Console]::add_CancelKeyPress` invokes `Stop-ServerProcess` then `[Environment]::Exit(0)`. PS process exits → all handles owned by PS (including the job handle in `$script:JobHandle`) are closed by OS → KILL_ON_JOB_CLOSE fires → node.exe + chrome.exe + mediasoup-worker.exe all die. |
| **Close cmd window (click X)** | YES | Windows sends CTRL_CLOSE_EVENT to console-attached processes. PS exits, OS closes its handles, same teardown as above. iter14's `-NoNewWindow` makes node inherit the launcher's console — important. |
| **Task Manager "End Task" on cmd.exe / powershell.exe** | YES | Same as above — when PS dies, OS closes its handles, job is freed → KILL_ON_JOB_CLOSE fires. |
| **Task Manager "End Task" on node.exe** | YES (chrome dies) | node.exe is a member of the job. When killed, it dies, but the **job handle is still held by PS** so the job stays alive. Chrome and mediasoup-worker — both job members via puppeteer's child-process spawn (default behavior associates children with parent's job per MSDN) — are NOT automatically killed by node's death. **HOWEVER** the SSR render host's `scheduleRestart` loop will respawn node-internal Chrome, and the original Chrome's puppeteer DevTools pipe breaks → Chrome exits on its own. Net result: brief orphan Chrome <5s. **Acceptable per D-05.** |
| **Task Manager "End Task" on chrome.exe alone** | NO direct effect | The ssr-render-host's `browser.on("disconnected")` handler fires (line 846) → `scheduleRestart()` spawns a fresh chrome.exe. No orphan. Functionally fine. |
| **Power loss / hard reboot** | N/A | Out of scope. |

**Critical nuance — handle inheritance:** Per Raymond Chen, if the job handle leaks via inheritance to a child process, KILL_ON_JOB_CLOSE does NOT fire until ALL handles close. PowerShell's `Start-Process` and `Add-Type` P/Invoke do NOT inherit handles to managed child processes by default (CLR closes its handles on AppDomain unload), so iter14 is safe. **Verification step for Wave 0:** check `Get-Process node` → query `Handles` count; ensure the Job handle is held ONLY by the PS process.

**Edge case to flag:** If the operator launches `start.bat` from inside a parent cmd.exe (e.g. via `cmd /c start.bat` from Explorer), iter14's `-NoNewWindow` makes node inherit *that* console, and a kill on the outer cmd will still propagate. This was tested via iter14 commit message ("CTRL_CLOSE_EVENT to the whole console-attached process tree on window-close") and is the operator's intended UX. ✓

**No code change needed in Phase 47 for Q5** — iter14 is sufficient. Phase 47 just verifies operator UAT confirms the matrix above.

### Q6 — Current operator-reported failure surface ("ERR_ABORTED on /ssr")

**Answer:** Pre-iter15 was a chrome-attach race (iter15 fixed). Post-iter15 failure mode (per CONTEXT.md "operator's pre-Phase-47 cleanup step: `taskkill /F /IM node.exe`") is the off-screen window hack + restart-loop interaction. Confidence: MEDIUM (one operator log; root cause is inferred from symptoms).

**Pre-iter15 (from iter15 commit message — RESOLVED):**

> "chrome.exe ATTACHED to the user's existing Chrome (single-instance behaviour), forwarded the --app=URL there, and the puppeteer-launched process exited. The dev tools connection failed → ERR_ABORTED → restart loop, with white "/ssr"-titled tabs piling up in the user's normal browser."

iter15's unique tmp `--user-data-dir` resolves this. **Confirmed root cause for the ORIGINAL bug.**

**Post-iter15 (still open per 47-CONTEXT D-03):**

The operator's UAT still hits a restart loop. CONTEXT.md doesn't include the exact post-iter15 log, but the most likely root causes given iter15's code are:

1. **`--app=about:blank` + `page.goto` race.** iter15 launches Chrome with `--app=about:blank`, then `page.goto(ssrUrl)` (line 881). If `page.goto` resolves before puppeteer's "first-target" tab is fully owned by puppeteer's CDP session (race), the navigation might land on a different target. Headless-new eliminates `--app` entirely → race vanishes.
2. **Off-screen window + Chrome's "occluded" heuristic.** A window at `-32000,-32000` is reported by Windows as "fully off-screen" → Chrome marks the renderer occluded → page renderer pauses → publisher injection script never runs → publisher-WS-stale watchdog (`SSR_PUBLISHER_WS_STALE_MS` default 180s) fires → relaunch. iter15 has `--disable-backgrounding-occluded-windows` + `--disable-features=CalculateNativeWinOcclusion` (lines 581, 478) — these should defeat the heuristic, but if just one is silently dropped (Chrome's "last `--disable-features` wins" foot-gun the comments at line 459-484 explicitly call out), the occlusion check resurfaces. Headless-new has no platform window → no occlusion concept → bug class eliminated.
3. **iter15's `winUserDataDir` directory creation timing.** The `await fsMod.mkdir(winUserDataDir, { recursive: true })` (line 543) happens INSIDE `launchBrowser`. If two restart cycles overlap (unlikely but possible during the early restart-loop), two `mkdir` race. Phase 47 keeps this code; if M1 sees a recurrence the dir name is already PID + timestamp keyed so collisions are vanishingly unlikely.

`net::ERR_ABORTED` on a localhost URL specifically signals **"the page-load was cancelled by Chrome before completion"** — usually because the tab was killed mid-load, the renderer crashed, or the puppeteer DevTools pipe closed. It is NOT a network error on the server side (server logs show /api/health = 200 in the operator's start.log). Phase 47 doesn't need to fix the server route — it needs to keep the SSR tab alive long enough to complete navigation.

**Headless-new resolves all three suspected root causes simultaneously** by eliminating the entire windowing layer that ties them together.

### Q7 — Verification plan for Linux non-regression

**Answer:** Concrete probe set defined below. Confidence: HIGH (D-07 is operator-locked).

**Mandatory Linux probes (must all PASS before and after Phase 47):**

| Probe | Command | Baseline (pre-47) | Pass criterion |
|-------|---------|-------------------|----------------|
| Dry-run script integrity | `./start.sh --dry-run` | All six probes pass | All six probes pass |
| Test suite | `npm test` | 404 / 384 pass / 1 fail / 19 skipped (04-T3 pre-existing) | 404 / 384 pass / 1 fail / 19 skipped (same baseline) |
| Cold boot smoke | `./start.sh` then `curl -fsS http://localhost:4173/api/health` within 90 s | 200 OK | 200 OK |
| SSR producer | `./start.sh` then `curl -fsS http://localhost:4173/api/diag/render-host-status` | `state: running, browserConnected: true, producerIds: [<id>]` | identical |
| /output/ receive | open `http://localhost:4173/output/` in a real Chromium (manual; or `node test/live-e2e/...`) | video visible within 10 s | video visible within 10 s |

**Windows-specific entry points to ADD:**

- `test/windows/smoke-launchargs.test.mjs` — unit test that imports `bootSsrRenderHost`-internal arg-builder (refactor to export a `buildLaunchArgs({ isWin32, viewport, … })` pure function), asserts that on `isWin32 === true` the arg array contains `--auto-select-tab-capture-source-by-title=TableTop Beamer`, does NOT contain `--window-position=-32000,-32000`, does NOT contain `--app=`, does NOT contain `--display=`, and that the launch options have `headless: "new"`.
- `test/windows/smoke-launchargs.test.mjs` MUST also assert that with `isWin32 === false` the existing Linux arg set is byte-identical to iter15's — this is the non-regression net for D-02.
- Operator-side UAT script (PowerShell, not committed as automated test but documented in `docs/INSTALL.md`): `start.bat` → wait 60 s → `Invoke-WebRequest /api/diag/render-host-status` → assert producer registered → `Ctrl+C` → wait 5 s → `tasklist | findstr "node.exe chrome.exe"` → assert empty.

**Linux test runner does NOT need to load Windows P/Invoke code.** Wrap any new P/Invoke logic in `start.ps1` only (it's not executed on Linux). If Approach B (koffi) is taken as fallback, dynamically import via `if (process.platform === "win32") { … }` so Linux `npm install` doesn't compile it (koffi has prebuilt binaries but the dynamic import avoids loading the module entirely on Linux).

---

## Recommended Implementation Approach

### M1 — Empirical validation (Wave 0)

**Goal:** Prove headless-new + getDisplayMedia + WebRTC publisher works on the operator's Win11 box before committing M2.

1. **Code change (minimal patch, behind feature env-flag for safety):**
   ```js
   // ssr-render-host.mjs#launchBrowser, around line 549
   const headlessMode = (process.platform === "win32" && process.env.SSR_WIN_HEADLESS !== "0")
     ? "new"
     : false;
   ```
   Default ON for Windows; operator can disable with `SSR_WIN_HEADLESS=0` to fall back to iter15 behavior during debugging.
2. **Drop the off-screen + --app= hacks ONLY when headless-new is active:**
   ```js
   const useHeadlessNew = headlessMode === "new";
   // ... in args array:
   ...(useHeadlessNew ? [] : (isWin32 ? ["--window-position=-32000,-32000"] : ["--window-position=0,0", "--start-fullscreen"])),
   ...(useHeadlessNew ? [] : (isWin32 ? ["--app=about:blank"] : [`--app=${ssrUrl}`])),
   ```
3. **Wave-0 smoke test (`test/windows/headless-smoke.test.mjs`)** — runs ONLY when `process.platform === "win32"`:
   - boot a tiny static server on port 0
   - call `bootSsrRenderHost({ port: <p>, autoStart: true })` with a mocked navigate URL
   - within 30 s assert `getStatus().browserConnected === true` AND `getStatus().producerIds.length > 0`
   - tear down
   - Cross-platform skip: `if (process.platform !== "win32") { t.skip("windows-only"); return; }`

4. **Diagnostic surface:** add a `[ssr-host] headless mode: ${headlessMode}, ssrUrl: ${ssrUrl}` log line at the start of `launchBrowser`. Add a `[ssr-host] launch args: ${args.join(" ")}` line gated behind `SSR_LOG_LAUNCH_ARGS=1` so the operator can paste them into bug reports without dumping every boot.

### M2 — Commit on top of iter15

Atomic commit sequence (planner's reference for PLAN.md task breakdown):

1. **C1 — refactor `launchBrowser` arg construction** into an exported pure function `buildChromiumLaunchArgs({ isWin32, useHeadlessNew, viewport, ssrUrl, encoderConfig, hasVaapiEnabled, disabledFeatures, enabledFeatures, display })`. No behavior change; unit-testable. Tests pinning current Linux arg set become the non-regression rail.
2. **C2 — flip Windows default to headless-new** behind `SSR_WIN_HEADLESS !== "0"` env knob (M1 patch above). Includes the Wave-0 smoke test.
3. **C3 — drop off-screen window + --app=about:blank** when headless-new is active. Includes unit test asserting the cleanup.
4. **C4 — diagnostic logging** (`[ssr-host] headless mode: …`, `[ssr-host] launch args: …`).
5. **C5 — docs update** (`docs/INSTALL.md` Windows section): note Win11 expectations, env-knob `SSR_WIN_HEADLESS=0` as escape hatch, operator UAT script.
6. **C6 (conditional, only if M1 smoke FAILS)** — add `start.ps1` ShowWindow P/Invoke fallback gated behind `SSR_WIN_HIDE_VIA_PINVOKE=1`. Document as "last-resort if headless mode misbehaves on your Chrome build."

### Files to modify

| File | Change | Risk |
|------|--------|------|
| `src/server/ssr-render-host.mjs` | Refactor `launchBrowser`; gate four Windows changes behind `isWin32 && useHeadlessNew`. | MEDIUM — touches the function that contains the entire Windows-Linux divergence. Linux byte-identical via unit test. |
| `test/windows/smoke-launchargs.test.mjs` (NEW) | Unit test for arg builder, win32 + linux branches. | LOW |
| `test/windows/headless-smoke.test.mjs` (NEW) | Integration test, win32-only. | LOW (skipped on Linux CI/dev) |
| `docs/INSTALL.md` | Windows section update. | LOW |
| `start.ps1` | NO CHANGE in M1/M2. ShowWindow P/Invoke only added if M1 fails (C6). | N/A |

### Code-level guardrails

- **D-02 enforcement:** `buildChromiumLaunchArgs({ isWin32: false, ... })` MUST produce a list byte-identical to iter15's Linux args. Unit test pins this snapshot. Any future drift surfaces in CI before reaching Linux operators.
- **D-04 preservation:** iter14's Job Object code in `start.ps1` is untouched. Tests confirm `$script:JobHandle` is still assigned post-launch.
- **D-08 preservation:** iter15's `winUserDataDir` mkdir + puppeteer `userDataDir` option remain. Phase 47 only adds the `headless: "new"` flag; the tmp-dir defense is independent.

---

## Open Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Operator's Chrome version is ancient (<111) and lacks new-headless entirely | LOW (auto-update on Windows is aggressive) | HIGH — feature gone | Environment probe logs Chrome version at boot; if <112, fall through to iter15 behavior + warn operator to update. **[ASSUMED]** modern Chrome. |
| `getDisplayMedia({ video: true })` returns no track in operator's specific Chrome build (some enterprise group-policy disables screen capture) | LOW-MEDIUM | HIGH | Wave-0 smoke catches; fallback to C6 ShowWindow P/Invoke + headful. **Operator UAT required.** |
| `--auto-select-tab-capture-source-by-title=TableTop Beamer` doesn't auto-grant in headless-new (Chrome enforces user gesture in some build) | LOW (flag documented; used by `fancybits/chrome-capture-for-channels` in prod) | HIGH | Fallback: explicit `--auto-accept-this-tab-capture` (puppeteer-stream auto-adds it at line 87 of PuppeteerStream.js). **Operator UAT required.** |
| `--mute-audio` is stripped by puppeteer-stream's `ignoreDefaultArgs` in headless mode → audio leaks into capture? | LOW (we explicitly add `--mute-audio` in `args[]` which overrides defaults) | LOW (D-D2 means we capture video only; audio track wouldn't be added even if leaked) | Verify in Wave-0: `videoTrack.kind === "video"` is the only track. **Operator UAT not required**; unit-testable. |
| NVENC + headless-new GPU process crash on operator's hardware (Chrome 131 known issue per existing iter-4c notes) | MEDIUM (their setup had VAAPI issues, NVENC may have analog issues) | MEDIUM | iter15 already gates GL flags behind VAAPI opt-in; same protection applies to NVENC. Fallback: `--use-gl=swiftshader` + software x264 — slower but works. **Operator UAT required if NVENC flakes.** |
| Hidden / orphan chrome.exe windows persist briefly during restart-loop if headless-new doesn't apply on the first launch attempt (cold-cache, antivirus scan) | LOW | LOW (no visible window in headless-new) | KILL_ON_JOB_CLOSE catches at process-exit. |
| ARM64 Windows (Surface, dev kits) | LOW (operator on x64; CONTEXT.md says ARM64 deferred) | N/A | Already documented out of scope. |

**Items requiring operator UAT (cannot be resolved without operator's machine):**

1. M1 smoke test PASSES on operator's actual Win11 box (D-03 validation).
2. After M2 ships, operator runs `start.bat` → confirms no visible Chrome window for full session.
3. Operator runs cleanup matrix (Q5 table) and pastes `tasklist` output for each termination pattern.
4. Operator confirms `/output/` on their LAN-attached Pi receives video stream within 10 s of `start.bat` boot.

---

## Validation Architecture

> This section drives `VALIDATION.md` generation in the plan-phase workflow. The phase uses Nyquist validation (nyquist_validation key absent from `.planning/config.json` → defaults to enabled).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node's built-in test runner (`node --test`) — already used by `npm test` |
| Config file | none (per `package.json:scripts.test`: `node --test "test/**/*.test.mjs"`) |
| Quick run command | `node --test test/windows/*.test.mjs` (when on Windows or for the unit-only subset) + `node --test "test/**/*.test.mjs"` for full Linux |
| Full suite command | `npm test` |
| Linux-only baseline | `./start.sh --dry-run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| WIN-01 | start.bat boots, no visible Chrome | manual-only | operator UAT script | ❌ Wave 0 (`docs/INSTALL.md` checklist update) |
| WIN-02 | SSR tab loads /ssr without ERR_ABORTED | integration (win32) | `node --test test/windows/headless-smoke.test.mjs` | ❌ Wave 0 (NEW) |
| WIN-03 | getDisplayMedia produces video track in headless-new | integration (win32) | `node --test test/windows/headless-smoke.test.mjs` (assert `producerIds.length>0`) | ❌ Wave 0 (NEW) |
| WIN-04 | Auto-grant tab capture by title matches | unit | `node --test test/windows/smoke-launchargs.test.mjs` (assert flag present) | ❌ Wave 0 (NEW) |
| WIN-05 | Ctrl+C → 0 orphans | manual-only | operator UAT (tasklist diff) | n/a |
| WIN-06 | Close cmd window → 0 orphans | manual-only | operator UAT | n/a |
| WIN-07 | Kill node.exe → chrome dies within 5s | manual-only | operator UAT | n/a |
| WIN-08 | Linux non-regression | unit + integration | `npm test` + `./start.sh --dry-run` | ✅ existing |
| WIN-08 (sub) | Linux arg set byte-identical to iter15 | unit | `node --test test/windows/smoke-launchargs.test.mjs` (asserts `isWin32:false` branch) | ❌ Wave 0 (NEW) |

### Sampling Rate

- **Per task commit:** `node --test test/windows/*.test.mjs` (fast — pure functions + one short integration test)
- **Per wave merge:** `npm test` (full suite; mostly Linux-only tests but the new Windows unit tests skip cleanly via platform guard)
- **Phase gate:** Full suite green + operator UAT script signed off in 47-VALIDATION.md before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `test/windows/smoke-launchargs.test.mjs` — covers WIN-04, WIN-08 (sub). Requires `buildChromiumLaunchArgs` to be exported from `ssr-render-host.mjs` (C1).
- [ ] `test/windows/headless-smoke.test.mjs` — covers WIN-02, WIN-03. Windows-only via `process.platform !== "win32" && t.skip()`. Boots a tiny static HTTP server + bootSsrRenderHost; needs cleanup-on-test-end Job Object equivalent so a crashed test doesn't leak chrome.exe.
- [ ] `docs/INSTALL.md` Windows UAT checklist update — covers WIN-01, WIN-05, WIN-06, WIN-07. Operator follows + records `tasklist` diffs.
- [ ] No framework install needed — `node --test` is built-in and already runs in `npm test`.

---

## Runtime State Inventory

This is a code-change / launcher-tweak phase, not a rename. Inventory included for completeness:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | none renamed | none |
| Live service config | none — TT-Beamer has no external services in this layer | none |
| OS-registered state | **Job Object** is created and destroyed per `start.ps1` invocation; named anonymous (no registration outside the launching process). No external registry/services to update. | none |
| Secrets/env vars | New optional knobs `SSR_WIN_HEADLESS` (default `1`), `SSR_WIN_HIDE_VIA_PINVOKE` (default `0`, only if C6 ships) | docs update only |
| Build artifacts | none — Phase 47 adds source code + tests only; no package.json deps changed. If C6 ships and chooses `koffi`, `package.json` adds `"optionalDependencies": { "koffi": "^2.x" }` (verify version at plan time via `npm view koffi version`). | conditional |

**Verified empty for all renames: there are no stored ChromaDB / Mem0 / n8n / Tailscale / Windows Task Scheduler / pm2 / SOPS / launchd / systemd / Docker artifacts to touch.**

---

## Environment Availability

This phase relies on the same external dependencies as Phase 46:

| Dependency | Required By | Available (Linux dev box) | Version | Fallback |
|------------|-------------|---------------------------|---------|----------|
| Node.js ≥22 | server runtime | ✓ via `.node-portable/` | 22.x | bootstrap-node.ps1/sh fetches if missing |
| Chrome / Edge ≥112 | SSR tab | ✓ on operator Win11 (`C:\Program Files\Google\Chrome\Application\chrome.exe` per start.log line 6) | unknown stable; assumed current | Edge fallback (also detected by Resolve-Chromium) |
| ffmpeg | encoder probe | ✓ via `ffmpeg-portable/` | latest BtbN | bundled |
| mediasoup prebuilt worker | WebRTC SFU | ✓ for win-x64 via npm | 3.14.x | bundled in npm package |

**Linux dev box** for this researcher's verification: `linux 6.17.0-14-generic`, no Windows installed locally. **All Windows-specific testing requires the operator's machine** — D-06 acknowledges this as the acceptance strategy.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Operator's Chrome version is ≥112 (unified headless) and most likely ≥132 (drop-=new) | Q1, Q3 | If <112, headless-new doesn't exist; falls back to iter15 behavior via `SSR_WIN_HEADLESS=0`. Mitigated by env-knob escape hatch. |
| A2 | Operator's Chrome is not subject to enterprise group policy that disables screen capture in headless | Q1, Q3 | If GP-disabled, getDisplayMedia fails; M1 smoke catches → Approach B fallback. |
| A3 | puppeteer-stream's `ignoreDefaultArgs.push("--mute-audio")` is the only argument-strip behavior that conflicts with our explicit args | Q3 | If puppeteer-stream strips other args silently, Phase 47 unit test on the resolved `chromeArguments` (via puppeteer launch event) catches it. |
| A4 | The operator's Chrome supports `--auto-select-tab-capture-source-by-title` (flag-presence is universal post-Chrome-99 per Chromium source) | Q1, Q3 | If not, `--auto-accept-this-tab-capture` (puppeteer-stream auto-adds) is the backup auto-grant. |
| A5 | Operator runs start.bat under standard user account (not elevated). Job Object behavior in iter14 has been tested in that mode. | Q5 | If they elevate, Job Object behavior is identical per MSDN. No mitigation needed. |
| A6 | `koffi` v2.x has Windows-x64 prebuilt binaries that don't require Visual Studio (claimed by koffi maintainers). | Q4 (Approach B) | Only relevant if M1 fails AND we choose Approach B over Approach A. Approach A (pure PowerShell) is the planner's default fallback. |
| A7 | The post-iter15 `ERR_ABORTED` + restart-loop the operator still sees (per `taskkill /F /IM node.exe` cleanup step in CONTEXT.md specifics) is caused by the off-screen-window + occlusion interaction described in Q6, not a separate root cause. | Q6 | If wrong, M1 smoke still produces a clear diagnostic (logs `[ssr-host] launch args: …`, `[ssr-tab:reqfailed]` events, browser-disconnected events) that lets the planner add a hotfix. The headless-new switch removes 3 of the 3 suspected causes simultaneously, so the residual probability is low. |

---

## Standard Stack

No new dependencies in M1/M2. **C6 (conditional fallback)** would add:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none in M1/M2) | — | — | — |
| koffi (only if C6) | ^2.x — verify with `npm view koffi version` at plan time | Win32 user32.dll ShowWindow P/Invoke from Node | `[CITED: npmjs.com/package/koffi]` Pure-JS FFI with prebuilt binaries — lighter than ffi-napi which has fragile native build on Node 22 Windows. |

---

## Architecture Patterns

### Pattern: Platform-Branched Launch Args (already established)

iter15 set the precedent: keep Linux + Windows in the same `ssr-render-host.mjs` file, conditional `args` array via `isWin32` flag. Phase 47 extends this — no separate `ssr-render-host.windows.mjs`. Refactor into a pure `buildChromiumLaunchArgs()` function for testability.

### Pattern: Env-knob Escape Hatch

iter15 introduced `SSR_BROWSER_BIN`, `SSR_ENABLE_VAAPI`, `SSR_PUBLISHER_WS_STALE_MS`. Phase 47 adds `SSR_WIN_HEADLESS` (default ON), conditionally `SSR_WIN_HIDE_VIA_PINVOKE`, `SSR_LOG_LAUNCH_ARGS`. Same `SSR_*` prefix convention. Same default-OFF for diagnostics, default-ON for new primary behavior.

### Anti-pattern to avoid

- **Adding a `ssr-render-host.windows.mjs` separate file.** Inline branching is the established pattern (per iter15). Splitting would obscure the small Windows delta and risk Linux drift.
- **Calling `Add-Type` more than once in `start.ps1` for the same type name** — PS 5.1 errors on re-declaration. iter13 uses `-ErrorAction SilentlyContinue` on the iter14 type already; new types (if C6 ships) need separate names (e.g., `TtbWin32Window`) to avoid collision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hide chrome window post-launch | Custom hand-rolled HWND enumerator + `SendMessage(WM_HIDE)` | Chrome `--headless=new` (no window exists) | Eliminates the entire problem class |
| Process tree cleanup on Win | Custom `taskkill /T` orchestration in cleanup script | iter14's Job Object + KILL_ON_JOB_CLOSE | OS-managed, atomic, MSDN-recommended |
| Defeat Chrome single-instance | Custom IPC inspection / kill-existing-chrome-first | Unique `--user-data-dir` per launch (iter15) | The user-data-dir IS the single-instance key |
| Tab-capture auto-grant | Custom permission-dialog click via puppeteer | `--auto-select-tab-capture-source-by-title=<doc.title>` + `--auto-accept-this-tab-capture` | Documented Chromium switches; in production at fancybits/chrome-capture-for-channels |
| Win32 FFI from Node | `ffi-napi` (fragile native build) | `koffi` (only if C6 ships); prefer PowerShell P/Invoke entirely | `koffi` has prebuilts; PS P/Invoke avoids any new Node dep |

---

## Common Pitfalls

### Pitfall 1: Stale Phase-31 Pitfall-1 citation

**What goes wrong:** Plan inherits the "headless disables WebRTC" lock from 31-RESEARCH § Pitfall 1 and rejects headless-new without re-validating.
**Why it happens:** Researcher cites Mux's 2021-2022 blog post which described `chrome-headless-shell`, not new-headless.
**How to avoid:** This RESEARCH.md is the canonical 2026 update. Cross-reference Chrome's own developer docs `[CITED: developer.chrome.com/docs/chromium/headless]` and puppeteer-stream's library code as primary evidence.
**Warning signs:** Planner writes "headless disables WebRTC" anywhere in PLAN.md tasks.

### Pitfall 2: `--app=URL` race in puppeteer-stream

**What goes wrong:** Setting `--app=ssrUrl` AND calling `page.goto(ssrUrl)` after launch can produce two navigation attempts; the first (`--app=`) hits a fresh tab whose target puppeteer doesn't own yet → `ERR_ABORTED`.
**Why it happens:** puppeteer's first-target heuristic + `--app=` mode + the extension-loading 250 ms `startDelay` overlap.
**How to avoid:** Use ONLY `page.goto(ssrUrl)` after launch on Windows headless-new. Drop `--app=` for Windows entirely. Linux path keeps `--app=` because Xvfb-fullscreen needs the chrome-less window.
**Warning signs:** Empty/white "/ssr"-titled tab appearing transiently; ssr-tab `requestfailed` for the SSR URL.

### Pitfall 3: Off-screen window triggers occlusion throttle

**What goes wrong:** Even with `--disable-backgrounding-occluded-windows` and `--disable-features=CalculateNativeWinOcclusion`, Chrome's renderer can still apply tab-hidden heuristics when the window is at `-32000,-32000`.
**Why it happens:** The two disable flags target the OS-level occlusion API and the renderer-level idle throttle, but a fully-off-screen window triggers a third path (`PageVisibility` API → page.hidden → rAF throttle).
**How to avoid:** Headless-new has no platform window at all — none of these heuristics fire. Drop the off-screen positioning entirely when headless-new is active.
**Warning signs:** `[ssr-host] publisher WS stale` watchdog firing in Phase 47 logs.

### Pitfall 4: PowerShell 5.1 ASCII strictness (iter12 lesson)

**What goes wrong:** Any non-ASCII character (en-dash, smart quotes, Unicode glyph) in a `.ps1` file causes WinPS 5.1 to parse the file with the wrong encoding → cascading "Missing closing '}'" errors.
**Why it happens:** WinPS 5.1 defaults to OEM encoding for `.ps1` reads; PS 7+ uses UTF-8. Source code with multibyte chars looks fine in dev tools but is mojibake on the operator's box.
**How to avoid:** ASCII-only in `.ps1` files. Run `file --mime-encoding start.ps1 scripts/*.ps1` in CI / pre-commit.
**Warning signs:** Operator UAT logs show PS parser errors at lines that look fine in the repo viewer.

### Pitfall 5: `Add-Type` re-declaration in iter13/iter14 — type-name collision

**What goes wrong:** If C6 ships and adds a second `Add-Type` for `TtbWin32Window`, PowerShell 5.1 errors if the type name overlaps with the existing `TtbJob`.
**Why it happens:** PS reuses AppDomain across script invocations during interactive sessions; type names are global.
**How to avoid:** Each `Add-Type` block uses a unique class name. `TtbJob` (iter14) for Job Object; `TtbWin32Window` for ShowWindow (C6).
**Warning signs:** "Cannot add type. The type name 'TtbXxx' already exists" errors on second `start.ps1` run in the same session.

---

## Code Examples

### Refactored `buildChromiumLaunchArgs` (M2 C1 sketch — verified against iter15)

```js
// Source: iter15 lines 558-645, refactored for unit-testability.
// Linux branch is byte-identical to iter15; only Windows branch diverges.

export function buildChromiumLaunchArgs({
  isWin32,
  useHeadlessNew,
  viewport,
  ssrUrl,
  display,
  disabledFeatures,
  enabledFeatures,
  hasVaapiEnabled,
}) {
  return [
    "--no-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    ...(isWin32 ? [] : ["--ozone-platform=x11"]),
    "--use-gl=angle",
    "--use-angle=default",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-ipc-flooding-protection",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
    "--max-gum-fps=60",
    // --app=: Linux always uses ssrUrl; Windows uses about:blank in headful mode,
    // skip entirely in headless-new.
    ...(isWin32
      ? (useHeadlessNew ? [] : ["--app=about:blank"])
      : [`--app=${ssrUrl}`]),
    `--window-size=${viewport.width},${viewport.height}`,
    // Window positioning: Linux fullscreen, Windows off-screen in headful, skip in headless-new
    ...(isWin32
      ? (useHeadlessNew ? [] : ["--window-position=-32000,-32000"])
      : ["--window-position=0,0", "--start-fullscreen"]),
    "--auto-select-tab-capture-source-by-title=TableTop Beamer",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-default-apps",
    "--disable-prompt-on-repost",
    "--disable-popup-blocking",
    "--disable-notifications",
    "--disable-sync",
    "--mute-audio",
    "--hide-crash-restore-bubble",
    "--disable-session-crashed-bubble",
    "--disable-infobars",
    `--disable-features=${disabledFeatures.join(",")}`,
    ...(enabledFeatures.length > 0 ? [`--enable-features=${enabledFeatures.join(",")}`] : []),
    ...(hasVaapiEnabled ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
    // --display is Linux-only (Xvfb)
    ...(isWin32 ? [] : [`--display=${display}`]),
  ];
}
```

### Unit test pinning Linux non-regression (M2 C1)

```js
// test/windows/smoke-launchargs.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChromiumLaunchArgs } from "../../src/server/ssr-render-host.mjs";

const baseOpts = {
  viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  ssrUrl: "http://127.0.0.1:4173/ssr",
  display: ":99",
  disabledFeatures: ["CalculateNativeWinOcclusion", "IntensiveWakeUpThrottling"],
  enabledFeatures: ["TabCaptureFastPath"],
  hasVaapiEnabled: false,
};

test("Linux args contain expected baseline (D-02 non-regression)", () => {
  const args = buildChromiumLaunchArgs({ ...baseOpts, isWin32: false, useHeadlessNew: false });
  assert.ok(args.includes("--ozone-platform=x11"), "Linux must have ozone=x11");
  assert.ok(args.includes("--app=http://127.0.0.1:4173/ssr"), "Linux must have --app=<ssrUrl>");
  assert.ok(args.includes("--start-fullscreen"), "Linux must have --start-fullscreen");
  assert.ok(args.includes("--display=:99"), "Linux must have --display=:99");
  assert.ok(!args.includes("--app=about:blank"), "Linux must NOT use about:blank");
});

test("Windows headless-new drops window hacks", () => {
  const args = buildChromiumLaunchArgs({ ...baseOpts, isWin32: true, useHeadlessNew: true });
  assert.ok(!args.includes("--ozone-platform=x11"), "Windows must not have ozone=x11");
  assert.ok(!args.some(a => a.startsWith("--app=")), "Windows headless-new must drop --app=");
  assert.ok(!args.some(a => a.startsWith("--window-position=")), "Windows headless-new must drop --window-position");
  assert.ok(!args.includes("--start-fullscreen"));
  assert.ok(!args.some(a => a.startsWith("--display=")));
  assert.ok(args.includes("--auto-select-tab-capture-source-by-title=TableTop Beamer"));
});

test("Windows headful (escape hatch SSR_WIN_HEADLESS=0) preserves iter15 hacks", () => {
  const args = buildChromiumLaunchArgs({ ...baseOpts, isWin32: true, useHeadlessNew: false });
  assert.ok(args.includes("--app=about:blank"), "iter15 fallback must have --app=about:blank");
  assert.ok(args.includes("--window-position=-32000,-32000"), "iter15 fallback must position off-screen");
});
```

### PowerShell ShowWindow P/Invoke (C6 conditional — sketch only)

```powershell
# Only added if M1 smoke FAILS. Documented in PLAN.md as fallback C6.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TtbWin32Window {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public const int SW_HIDE = 0;
}
'@ -ErrorAction SilentlyContinue

# After Start-Process node.exe, poll for chrome.exe children every 100ms for 5s
$deadline = (Get-Date).AddSeconds(5)
while ((Get-Date) -lt $deadline) {
  Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowHandle -ne [IntPtr]::Zero -and $_.Parent.Id -eq $proc.Id
  } | ForEach-Object {
    [void][TtbWin32Window]::ShowWindow($_.MainWindowHandle, [TtbWin32Window]::SW_HIDE)
  }
  Start-Sleep -Milliseconds 100
}
```

Sources cited inline; `[CITED: learn.microsoft.com/.../winuser/nf-winuser-showwindow]`.

---

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|------------------------|--------------|--------|
| `--headless=true` / `chrome-headless-shell` (audio + WebRTC disabled) | `--headless=new` (unified with headful; WebRTC + getDisplayMedia + audio all supported) | Chrome 112 (Apr 2023) — same binary; Chrome 132 (Jan 2025) — drop `=new` suffix | Unlocks Phase 47 D-03. Phase 31's Pitfall 1 is OUTDATED for new-headless. |
| Hide window via off-screen positioning | Headless-new (no window) | per this research | Eliminates occlusion / page-visibility / OS-window-state issues. |
| `--use-gl=egl` | `--use-gl=angle` + `--use-angle=default` | Chrome 131 (egl removed from CfT) | Already in iter15. Cross-platform — works on Windows D3D11 and Linux Mesa. |
| `taskkill /T /F /IM node.exe` orphan cleanup | Win32 Job Object + `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` | iter14 (Phase 46) | OS-managed, atomic. Documented in MSDN Job Objects topic. |

**Deprecated / outdated:**
- Phase 31 § Pitfall 1 (headless disables WebRTC + audio): **superseded by Chrome 112+ unified headless**. Linux Xvfb path keeps headful for reasons unrelated to Pitfall-1 (Linux has no native windowing in server contexts; Xvfb is simplest).
- iter15's `--window-position=-32000,-32000` + `--app=about:blank` hack: **deprecated under Phase 47** once headless-new lands; both go away on Windows.

---

## Sources

### Primary (HIGH confidence)

- `node_modules/puppeteer-stream/dist/PuppeteerStream.js` (lines 93-101) — verifies `headless: "new"` support in pinned puppeteer-stream@3.0.22
- `node_modules/puppeteer-stream/extension/manifest.json` — verifies MV3 extension permissions
- `src/server/ssr-render-host.mjs` (iter15, lines 430-647) — verifies current Windows branching, off-screen window, --app=about:blank hack
- `src/server/ssr-stream-publisher.mjs` (lines 192-216) — verifies actual capture path is `getDisplayMedia`, not `chrome.tabCapture`
- `start.ps1` (lines 332-373) — verifies iter14 Job Object pattern + iter13 add_CancelKeyPress
- `index.html` (line 7) — verifies `<title>TableTop Beamer</title>` for auto-select-by-title flag
- `package.json` — verifies puppeteer-stream@^3.0.22, puppeteer@^23.0.0, mediasoup@^3.14.0 are pinned
- `git log 66da2d3 --no-patch` — verifies iter15 commit message documenting single-instance-attach root cause
- `[CITED: https://developer.chrome.com/docs/chromium/headless]` — Chrome 112+ unified headless: "All other functions, existing and future, are available with no limitations"
- `[CITED: https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects]` — MSDN: KILL_ON_JOB_CLOSE fires when last handle closes
- `[CITED: https://devblogs.microsoft.com/oldnewthing/20131209-00/?p=2433]` — Raymond Chen on Job Objects handle-inheritance gotcha
- `[CITED: https://github.com/SamuelScheit/puppeteer-stream]` — README maintainer quote: "Works also in headless mode (no gui needed), just set `headless: "new"`"

### Secondary (MEDIUM confidence)

- `[CITED: https://peter.sh/experiments/chromium-command-line-switches/]` — Chromium switch list for `--auto-select-tab-capture-source-by-title` (`--auto-select-desktop-capture-source` documented separately, both behaviors verified by inspection of Chromium source)
- `[CITED: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-showwindow]` — MSDN ShowWindow + SW_HIDE = 0
- `[CITED: https://github.com/SamuelScheit/puppeteer-stream/issues/4]` — maintainer: "Yes, this library now supports headless by specifying headless: 'new' as launch option"
- `[CITED: https://github.com/fancybits/chrome-capture-for-channels]` — production-grade evidence that headless + auto-select tab capture works
- `.planning/phases/phase-31/31-RESEARCH.md` § Pitfall 1 — the SUPERSEDED 2026-05-06 Mux blog citation; documented here for traceability

### Tertiary (LOW confidence — flagged for empirical Wave-0 validation)

- The exact behavior of `--mute-audio` interaction with puppeteer-stream's `ignoreDefaultArgs.push("--mute-audio")` under headless-new on the operator's Chrome — verified by inspection of PuppeteerStream.js lines 97-98 but not empirically tested
- Whether the operator's Chrome 132+ build has any enterprise group-policy interference with getDisplayMedia — cannot verify remotely

---

## Metadata

**Confidence breakdown:**
- Headless-new viability (Q1): HIGH — Chrome docs + puppeteer-stream code + production-OSS precedent
- Single-instance defeat (Q2): HIGH — iter15 already verified for headful; binary behavior is identical
- Flag translation (Q3): MEDIUM-HIGH — flag-level verified, GPU-specific outcomes on operator hardware empirical
- P/Invoke fallback feasibility (Q4): HIGH — pattern already in iter14; MSDN-verified APIs
- Job Object behavior (Q5): HIGH — MSDN + Raymond Chen primary sources
- Failure-mode pinning (Q6): MEDIUM — one operator log; root cause inferred from symptoms but headless-new resolves all three suspected causes
- Linux non-regression strategy (Q7): HIGH — D-07 lock + existing test infrastructure

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (Chrome updates are fast-moving; flag set should be re-verified if major Chrome milestone passes during phase execution)
