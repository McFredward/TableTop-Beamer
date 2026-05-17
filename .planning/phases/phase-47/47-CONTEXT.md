# Phase 47: Windows Full-Functional Parity with Linux - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Make TT-Beamer fully functional on Windows 10/11 (AMD64) with the same operator
UX as Linux: double-click start.bat → ~30s-5min later, server is up, dashboard
opens, LAN-URLs are visible, NO Chrome window appears on the operator's
desktop, NO orphan processes after Ctrl+C. Linux path (start.sh + Xvfb +
puppeteer-stream) must NOT regress — every Windows fix is conditional on
`process.platform === "win32"` or lives in `start.ps1` / `start.bat` /
`scripts/*.ps1`.

The phase delivers:
- A WORKING Windows click-and-run launcher (operator-validated)
- An invisible SSR Chromium tab on Windows (no desktop pop-ups, no flickering windows)
- Robust orphan-process cleanup (Job Object + handlers all paths)
- Verified Linux non-regression (start.sh probe + npm test baseline)

The phase does NOT deliver:
- Any change to Linux behavior or code paths
- macOS support
- WSL detection or WSL-specific handling
- ARM64 Windows (mediasoup upstream prebuilt absent — already documented)

</domain>

<decisions>
## Implementation Decisions

### Chrome Browser Strategy on Windows

- **D-01:** Use system-installed Chrome/Edge (already detected by
  `start.ps1#Resolve-Chromium`), but launch with full isolation:
  - **Unique --user-data-dir** under `os.tmpdir()` per puppeteer launch
    (carried forward from iter15)
  - **`headless: "new"` mode** instead of headful + window-positioning
    (replaces the current `--app=about:blank` + off-screen window hack)
  - This combination defeats Chrome's single-instance-attach behavior AND
    eliminates the visible-window problem in one move.

- **D-02:** The Linux launch path (Xvfb + `headless: false` + headful
  Chromium) stays UNCHANGED. Linux is gated behind
  `process.platform !== "win32"` in `src/server/ssr-render-host.mjs`.
  Linux is operator-validated through Phase 31-46 and is the regression rail.

- **D-03:** WebRTC + getDisplayMedia + screen-capture must work in
  `--headless=new` mode. This was the Phase 31 RESEARCH § Pitfall 1
  premise that locked headful — **outdated as of 2026-05-17**: modern Chrome
  (≥111) headless-new supports WebRTC, getDisplayMedia, tab capture, and
  hardware encoding. **M1 research validates this empirically** before M2
  commits to the approach. If WebRTC + tab-capture stability gaps surface,
  M1 documents the gap and M2 falls back to **Win32 ShowWindow(SW_HIDE)
  P/Invoke** as the secondary approach (still headful, but window
  truly hidden via Win32 API, not just off-screen).

### Process Supervision

- **D-04:** Keep the Win32 Job Object + `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`
  approach introduced in iter14. Add an additional cleanup-path for the
  "operator clicks the X on cmd window" case (WM_CLOSE) — the Job Object
  catches that, but verify it does so with the operator's actual termination
  patterns.

- **D-05:** Ctrl+C / cmd-window-close / Task Manager kill must all leave
  ZERO orphan node.exe / chrome.exe / mediasoup-worker.exe within 5s.
  Verification: operator's pre-Ctrl+C and post-Ctrl+C `tasklist | findstr
  "node.exe chrome.exe"` outputs are compared in UAT.

### Test Strategy

- **D-06:** Operator UAT on operator's Windows 10 box is the primary
  acceptance gate. No Windows CI runner this phase — defer to a future phase
  if Windows-side regressions start happening.

- **D-07:** Linux non-regression is verified by running:
  - `./start.sh --dry-run` on the dev Linux box
  - `npm test` baseline (404 / 384 pass / 1 pre-existing fail unchanged)
  Both MUST stay green throughout the phase.

### iter11-iter15 Disposition

- **D-08:** Build on top of iter15 (commit `66da2d3`). The iter11-iter15
  fixes are real (ASCII-only .ps1 for WinPS 5.1, `[Console]::add_CancelKeyPress`,
  Job Object cleanup, unique user-data-dir, off-screen positioning). They
  reduce the bug surface; they just don't FULLY solve the SSR rendering
  problem. Phase 47 targets the rendering layer specifically, leaves the
  rest of iter15 alone.

- **D-09:** The `phase-46-closed` tag stays at `66da2d3`. Phase 47 makes new
  commits on top, tagged `phase-47-closed` at the new closure point.

### Claude's Discretion

Anything outside D-01..D-09 is implementation choice for the planner and
executor: which CDP commands to use, what shape the Win32 ShowWindow
P/Invoke takes if needed as fallback, how the env-probe report changes for
Windows, what diagnostic logs to add, how to structure RESEARCH.md, how to
break M2 into atomic commits, etc.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 46 closure docs
- `.planning/phases/phase-46/46-CLOSURE.md` — full iter1-iter15 history + the
  diagnoses that motivated iter11-iter15
- `.planning/phases/phase-46/46-CONTEXT.md` — original release-prep scope

### Phase 31 SSR research (LOCKED — Linux still applies)
- `.planning/phases/phase-31/31-RESEARCH.md` — § Pitfall 1 (headless disables
  WebRTC). **Re-validate empirically** for Windows + `--headless=new` in M1.
  Linux assumptions remain locked.

### Linux baseline (LOCKED, do not regress)
- `start.sh` — Linux launcher
- `src/server/ssr-render-host.mjs` — Xvfb spawn + Linux Chromium launch path
- `src/server/ssr-environment-bootstrap.mjs` — probe code reporting
  needsVirtualDisplay etc.

### Windows touch points
- `start.ps1` — Windows launcher (iter11-iter15 latest)
- `start.bat` — thin wrapper
- `scripts/bootstrap-node.ps1` — portable Node 22.x bootstrap (working)
- `src/server/ssr-render-host.mjs#launchBrowser` (lines ~430-647) — the
  one function that contains the entire Windows-specific divergence today
  (iter15 block lines ~515-547). Phase 47 modifies this function only.
- `src/server/ssr-browser-detect.mjs` — finds Chrome.exe / msedge.exe
- `src/server/ssr-environment-bootstrap.mjs` — `probeEnvironment()` reports
  on Windows

### Chrome headless-new + WebRTC (M1 research targets)
- https://developer.chrome.com/docs/chromium/new-headless — official intro
- Chrome bug tracker for WebRTC in headless-new (M1 search)
- puppeteer + headless-new compatibility (M1 verify w/ puppeteer-stream)

### Operator-shared evidence
- `start.log` snippet (in 47-CONTEXT.md / discussion): server boots OK on
  Win11, ssr-host enters infinite restart loop after `net::ERR_ABORTED` on
  `http://127.0.0.1:4173/ssr`. This is the EXACT failure Phase 47 fixes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/server/ssr-render-host.mjs` — already has `process.platform === "win32"`
  branching (iter15). The pattern is established; Phase 47 extends it.
- `start.ps1#Resolve-Chromium` — finds the operator's Chrome/Edge correctly
  on operator UAT (per start.log line 6: source=env, path
  `C:\Program Files\Google\Chrome\Application\chrome.exe`).
- `scripts/bootstrap-node.ps1#Ensure-PortableNode` — portable installer
  pattern is solid; if M1 picks Chrome-for-Testing fallback, can mirror this
  pattern (download + SHA verify + extract).
- `Add-Type` + P/Invoke pattern from iter14 Job Object — reusable for
  ShowWindow fallback if needed.

### Established Patterns

- **Platform branching at the launch-args level, not at module level** —
  iter15 keeps Linux + Windows in the same file, with `isWin32` flags
  conditional. Phase 47 follows this — no separate
  `ssr-render-host.windows.mjs`.
- **Defensive try/catch on optional Windows features** — iter15 logs and
  falls through when Job Object creation fails. Phase 47 keeps this style.
- **Environment-variable overrides for testing** — `SSR_BROWSER_BIN`,
  `SSR_ENABLE_VAAPI`, `SSR_PUBLISHER_WS_STALE_MS`. New env knobs added by
  Phase 47 (if any) follow the same `SSR_*` prefix convention.

### Integration Points

- `bootSsrRenderHost()` is the single entry point for SSR. server.mjs calls
  it once at startup. All Phase 47 changes flow through this function and
  the `launchBrowser()` inside it.
- The publisher injection (`injectInPagePublisher`) runs AFTER `page.goto`
  succeeds. If `--headless=new` breaks the publisher, M1 catches it there.
- The CDP session is the diagnostic surface — `evaluateInTab` and
  `captureScreenshot` work identically headful vs headless.

</code_context>

<specifics>
## Specific Ideas

- Operator's UAT criteria (paraphrased from conversation):
  - "der server mit allem soll einfach nur hochfahren und dem user
    angezeigt werden auf welcher IP es aufrufbar ist — genauso wie bei der
    linux .sh variante"
  - "warum überhaupt ein browser fenster immer in Windows geöffnet wird,
    und nicht im background" — the Chrome window MUST be invisible.
  - "Es soll sich so wie in Linux verhalten — ohne außnahme."

- Operator's environment (from UAT logs):
  - Win11
  - System Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`
  - Has NVENC hardware encoder (encoder=nvenc selected by auto-pick)
  - LAN: 192.168.0.16, Ethernet interface

- Operator's pre-Phase-47 cleanup step: `taskkill /F /IM node.exe` to clear
  runaway processes from prior iter15 attempts before re-testing.

</specifics>

<deferred>
## Deferred Ideas

- **GitHub Actions windows-latest CI** — operator deferred; revisit in a
  future phase if Windows regressions accumulate.
- **Chrome-for-Testing bundling** — kept as fallback for M1 if system-Chrome
  + headless-new doesn't pan out. Operator preferred system-Chrome for the
  smaller install footprint.
- **macOS launcher** — separate future phase. Phase 47 stays Windows-only.
- **WSL detection / WSL-specific paths** — out of scope.
- **Removing iter11-iter15 commits** — operator rejected the "wipe and
  rebuild" option. Build on top.

</deferred>

---

*Phase: 47-windows-parity*
*Context gathered: 2026-05-17*
