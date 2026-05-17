# Phase 47 — Operator UAT Results

> **Template** — fill in during Phase 47 UAT. Run the procedure in
> `.planning/phases/phase-47/47-UAT-RUNBOOK.md`, then return this file
> completed. PASS sign-off requires all 14 checkboxes ticked and
> `Result: PASSED` set in Section D.

---

## Header

- **Operator:** <name>
- **Hardware:** Win11, Chrome version <output of `chrome --version` or about:version>, NVENC / iGPU / etc.
- **Date:** YYYY-MM-DD
- **Phase 47 commit SHA tested:** <output of `git rev-parse HEAD`>

---

## Section A — Boot smoke (docs/INSTALL.md § Operator UAT checklist)

- [ ] A1. `start.bat` reaches LAN URL banner within 5 minutes
      (record actual: ____ s)
- [ ] A2. No visible Chrome window appears on desktop during session
- [ ] A3. Dashboard loads from phone over LAN at printed URL
- [ ] A4. `/output/` on Pi receives WebRTC stream within 10 seconds
      (record actual: ____ s)

---

## Section B — Log signals (Wave-3 diagnostics)

Paste the matching lines from `start.log`:

- [ ] B1. `[ssr-host] launching headless=...` present:

  ```
  <paste>
  ```

- [ ] B2. `[ssr-host] win32 verdict: OK` present (NOT `FAILED`):

  ```
  <paste>
  ```

---

## Section C — Cleanup matrix (47-RESEARCH § Q5)

For each row, paste the BEFORE and AFTER
`tasklist | findstr /i "node.exe chrome.exe mediasoup"` outputs:

- [ ] C1. Ctrl+C in cmd → all children exit within 5 s
  - BEFORE:

    ```
    <paste>
    ```

  - AFTER (5 s later):

    ```
    <paste — must be empty>
    ```

- [ ] C2. Close cmd window via X button → all children exit within 5 s
  - BEFORE:

    ```
    <paste>
    ```

  - AFTER (5 s later):

    ```
    <paste — must be empty>
    ```

- [ ] C3. Task Manager → End Task on cmd.exe → all children exit within 5 s
  - BEFORE:

    ```
    <paste>
    ```

  - AFTER (5 s later):

    ```
    <paste — must be empty>
    ```

- [ ] C4. Task Manager → End Task on node.exe → chrome.exe dies within 5 s
      (acceptable transient orphan)
  - BEFORE:

    ```
    <paste>
    ```

  - AFTER (5 s later):

    ```
    <paste — chrome.exe may linger briefly, must be empty by 5 s>
    ```

---

## Section D — Sign-off

- [ ] All Section A items checked
- [ ] All Section B items checked
- [ ] All Section C items checked
- [ ] No remaining issues observed

Result: __PASSED / __FAILED (delete one)

If FAILED: complete Section E with diagnostics per
`47-UAT-RUNBOOK.md` § 5 (escape hatch result, args dump, last 100 lines
of start.log, Chrome version), then commit and respond
`failed: <one-paragraph summary>` to the agent.

---

## Section E — Gap notes (only if FAILED)

<free-form — paste the SSR_WIN_HEADLESS=0 retry result, the
[ssr-host] launch args (win32): ... line from SSR_LOG_LAUNCH_ARGS=1,
the last 100 lines of start.log, and the chrome --version output>
