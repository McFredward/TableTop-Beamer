# Phase 47 — Operator UAT Runbook (Windows 11)

**Audience:** TT-Beamer operator running first-time UAT on Windows 11 hardware.
**Purpose:** This runbook is for Phase 47 operator UAT on the operator's
Win11 hardware. It validates Decision D-06 (operator UAT is the acceptance
gate) by walking through Section A (boot smoke), Section B (start.log
signal grep), Section C (4-row cleanup matrix), and Section D (sign-off).
**Companion form:** Fill in `.planning/phases/phase-47/47-UAT-RESULTS.md`
as you go.

---

## 1. Purpose

This runbook is for Phase 47 operator UAT on the operator's Win11 hardware.
It validates Decision D-06 (operator UAT is the acceptance gate) by walking
through Section A (boot smoke), Section B (start.log signal grep), Section
C (4-row cleanup matrix), and Section D (sign-off). The goal is a
filled-in, signed-off `47-UAT-RESULTS.md` returned to the agent so Phase
47 can close.

No code reading is required. You only need: the Phase-47 closure-candidate
git checkout, a Win11 cmd window, a phone on the LAN, and the projector
Pi. Total runtime is roughly 15 minutes if every check passes first time.

---

## 2. Prerequisites

Run each item ONCE before starting Section 3:

- Clean Win11 box, or restart prior to test, so no leftover state from
  prior iter15 attempts is in play.
- Confirm no orphan processes: run
  `tasklist | findstr /i "node.exe chrome.exe mediasoup"` in a cmd
  window. Expected: empty. If non-empty, run
  `taskkill /F /IM node.exe` and `taskkill /F /IM chrome.exe` once,
  then wait 60 seconds.
- Git checkout at the Phase-47 closure-candidate commit (the commit the
  agent identified as the UAT target — usually the tip of master after
  Wave 3).
- Chrome installed at the default location
  `C:\Program Files\Google\Chrome\Application\chrome.exe` (this is the
  operator's existing setup per the Phase-47 context).
- No relevant environment variables set in the cmd window you will use:
  `set SSR_WIN_HEADLESS=` and `set SSR_LOG_LAUNCH_ARGS=` (these clear
  any prior values so the default headless-new path is exercised).
- Phone on the same LAN as the Win11 box.
- Projector Pi reachable on the LAN at its usual `/output/` URL.

---

## 3. Step-by-step procedure

Perform Steps 1 through 9 in order. Each step has a paste target in
`47-UAT-RESULTS.md`.

### Step 1 — Launch start.bat

Open a fresh cmd window in the project directory. Start a stopwatch.
Run:

```cmd
start.bat
```

The cmd window stays open for the duration of the session. Do not close
it yet.

### Step 2 — Wait for the LAN URL banner (Section A1, A3)

Watch the cmd output. Within about 5 minutes on a cold first install
(~30 seconds on a subsequent run), the launcher prints a banner with the
LAN URL, e.g. `Open this on your phone: http://192.168.0.16:4173/`.
Stop the stopwatch when the banner appears. Record the elapsed time in
Section A1. Open the printed LAN URL on your phone — the dashboard
should load. Check Section A3 once it renders.

### Step 3 — Visually scan the desktop (Section A2)

Look at your Win11 desktop. There must be NO visible Chrome window
opened by TT-Beamer. The cmd window for `start.bat` is OK; what must
NOT appear is a new Chrome window labelled "about:blank" or the SSR
URL. Check Section A2 if no extra Chrome window appeared.

### Step 4 — Verify /output/ stream on the projector Pi (Section A4)

On the projector Pi, open
`http://<lan-ip>:4173/output/` in its browser, where `<lan-ip>` is the
LAN URL printed in Step 2. Wait up to 10 seconds — the WebRTC stream
should appear and an animation should play. Record the elapsed time in
Section A4.

### Step 5 — Grep start.log for the launch banner + verdict (Section B1, B2)

Open a SECOND cmd window in the project directory. Run:

```cmd
more start.log | findstr /C:"[ssr-host] launching headless=" /C:"[ssr-host] win32 verdict:"
```

Expected output: TWO matching lines.

The first line should look like:

```
[ssr-host] launching headless=new on Win32 (userDataDir=C:\Users\...\Temp\ttb-ssr-NNNN-TTTTTTTT)
```

The second line should look like:

```
[ssr-host] win32 verdict: OK browserConnected=true producerIds=[<one-or-more-csv-ids>]
```

Copy each line into `47-UAT-RESULTS.md` Section B1 and B2 respectively.
Note: Section B2 must contain `verdict: OK`, NOT `verdict: FAILED`. If
you see `verdict: FAILED <reason>`, go to Section 5 (FAIL diagnostics).

### Step 6 — Cleanup matrix C1 — BEFORE Ctrl+C (Section C1-BEFORE)

In the SECOND cmd window run:

```cmd
tasklist | findstr /i "node.exe chrome.exe mediasoup"
```

Expected: a non-empty list with at least one `node.exe` line, one or
more `chrome.exe` lines, and one or more `mediasoup-worker.exe` lines.
Paste the full output into Section C1-BEFORE.

### Step 7 — Ctrl+C in the FIRST cmd

Return to the FIRST cmd window (the one running `start.bat`). Press
`Ctrl+C`. Wait 5 seconds.

### Step 8 — Cleanup matrix C1 — AFTER Ctrl+C (Section C1-AFTER)

In the SECOND cmd window re-run:

```cmd
tasklist | findstr /i "node.exe chrome.exe mediasoup"
```

Expected: empty output (no lines printed). Paste the output (which
should be empty) into Section C1-AFTER. Check Section C1 if the output
is empty after 5 seconds.

### Step 9 — Repeat for C2, C3, C4 with alternate termination patterns

Repeat the boot procedure (Step 1 through Step 5) for each of the
remaining cleanup-matrix rows. After each successful boot, run the
BEFORE `tasklist` probe (same as Step 6), terminate using the alternate
pattern, wait 5 seconds, and run the AFTER `tasklist` probe (same as
Step 8). Paste both into the matching section in `47-UAT-RESULTS.md`.

- **C2** — Close the FIRST cmd window via the X button instead of
  Ctrl+C. Expected: AFTER `tasklist` is empty within 5 seconds.
- **C3** — Open Task Manager, find `cmd.exe` for the FIRST cmd window,
  right-click and select "End Task". Expected: AFTER `tasklist` is empty
  within 5 seconds.
- **C4** — Open Task Manager, find the `node.exe` process spawned by
  start.bat, right-click and select "End Task". Expected: AFTER
  `tasklist` may show `chrome.exe` lingering briefly — wait up to 5
  seconds — by 5 seconds AFTER should be empty. This row is acceptable
  per D-05 even if chrome.exe lingers transiently because puppeteer's
  DevTools pipe breaks when node dies and Chrome exits on its own.

When all four rows are filled in, proceed to Section 4.

---

## 4. PASS criteria

Sign-off requires ALL of the following:

- All 4 Section A items checked (A1, A2, A3, A4)
- Both Section B items checked (B1 with `headless=new`, B2 with
  `verdict: OK`)
- All 4 Section C items checked (C1 Ctrl+C, C2 X-button, C3 Task Manager
  on cmd.exe, C4 Task Manager on node.exe)
- All 4 Section D rollup items checked
- `Result: PASSED` set on the Section D Result line (delete the
  `/ FAILED` half)

Once all 14 checkboxes are filled in:

1. Save the file `.planning/phases/phase-47/47-UAT-RESULTS.md`.
2. Commit it:
   ```cmd
   git add .planning/phases/phase-47/47-UAT-RESULTS.md
   git commit -m "test(47-04): operator UAT signed off"
   ```
3. Respond `signed-off` to the agent so Phase 47 can resume to closure.

---

## 5. FAIL diagnostics

If any item in Section A, B, or C fails, do NOT mark Section D as
PASSED. Instead:

### a) Try the SSR_WIN_HEADLESS=0 escape hatch

In a fresh cmd window run:

```cmd
set SSR_WIN_HEADLESS=0
start.bat
```

Wait for boot and re-check Sections A and B. Look for the launch
banner in start.log:

```cmd
more start.log | findstr /C:"[ssr-host] launching headless="
```

If you see `[ssr-host] launching headless=false on Win32 (...,
SSR_WIN_HEADLESS=0)`, the escape hatch is active. Record under Section
E whether the headful path PASSED or still FAILED. This isolates the
failure to headless-new specifically vs a broader Windows regression.

### b) Capture the full Chromium command line via SSR_LOG_LAUNCH_ARGS=1

In a fresh cmd window run:

```cmd
set SSR_LOG_LAUNCH_ARGS=1
start.bat
```

After boot, in a SECOND cmd window run:

```cmd
more start.log | findstr /C:"[ssr-host] launch args"
```

Copy the single matching line `[ssr-host] launch args (win32): ...`
into Section E of `47-UAT-RESULTS.md`. This is the exact set of
Chromium flags the launcher used — invaluable for gap-closure.

### c) Capture the last 100 lines of start.log

```cmd
more +0 start.log | more
```

Scroll to the bottom and copy the last 100 lines into Section E.

### d) Capture the Chrome version

```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --version
```

Paste the output into Section E. This pins down which Chrome milestone
the failure was on.

### e) Record FAILED and request gap-closure

In Section D of `47-UAT-RESULTS.md` set `Result: FAILED` (delete the
`PASSED` half). Commit the filled-in form:

```cmd
git add .planning/phases/phase-47/47-UAT-RESULTS.md
git commit -m "test(47-04): operator UAT FAILED — see Section E"
```

Respond to the agent with `failed: <one-paragraph summary>` describing
which Section item failed, the start.log verdict line, and whether the
escape hatch helped. Phase 47 will then enter gap-closure mode via
`/gsd-plan-phase 47 --gaps`.

---

## 6. References

- `docs/INSTALL.md` § "Operator UAT checklist (sign-off)" — the canonical
  6-item operator-facing checklist this runbook expands.
- `docs/INSTALL.md` § "Troubleshooting Windows: SSR_WIN_HEADLESS escape
  hatch" — documents the env knob used in Section 5.a.
- `docs/INSTALL.md` § "Troubleshooting Windows: full launch-args dump" —
  documents `SSR_LOG_LAUNCH_ARGS=1`.
- `.planning/phases/phase-47/47-VALIDATION.md` § "Manual-Only
  Verifications" — the source table for Section A items.
- `.planning/phases/phase-47/47-RESEARCH.md` § "Q5 — Process cleanup
  edge cases on Windows" — the source table for the C1-C4 cleanup
  matrix.
- `.planning/phases/phase-47/47-UAT-RESULTS.md` — the companion form
  you fill in while executing this runbook.

---

When all PASS criteria are met, fill in 47-UAT-RESULTS.md and respond `signed-off` to the agent. If any FAIL criteria triggered, follow Section 5 and respond with the failure summary instead.
