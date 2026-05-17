---
status: partial
phase: 49-release-prep-small-fixes
source: [49-VERIFICATION.md]
started: 2026-05-17T15:50:00Z
updated: 2026-05-17T15:50:00Z
---

## Current Test

[awaiting human testing — 4 Windows scenarios + 1 Linux non-regression + banner cross-check]

## Tests

### 1. Scenario A — Existing-shell ./start.bat self-detach (49-A core fix, gap-closure-1)
expected: From an existing PowerShell session, run `./start.bat`. start.bat detects non-explorer parent → prints `[start.bat] Detected invocation from "powershell"... Relaunching in a new console window...` → spawns a NEW cmd window via `start "TT-Beamer" cmd /k`. Operator's PowerShell prompt returns IMMEDIATELY (no waiting for server boot). The NEW window then runs the server normally; Ctrl+C INSIDE the new window terminates cleanly (because new cmd is explorer-parented and behaves exactly like double-click).
verify (in operator's PS, after launch): operator's prompt should be free for next commands. The new cmd window should show the LAN-URL banner.
verify (in new cmd window, after Ctrl+C): node + chrome from this session gone, window closes cleanly.
result: [pending — re-test with gap-closure-1]
result_initial_phase_49: failed ("STRG+C funktioniert immer noch nicht UND ich hab wieder ein desync auf der y-achse" — operator UAT 2026-05-17). Root cause: PS swallows Ctrl+C before reaching child PS; DPI awareness inheritance from PS produces 1920x956 Chrome viewport. Fix: self-detach in start.bat (gap-closure-1).

### 2. Scenario B — Double-click start.bat + Ctrl+C (Phase 47 non-regression)
expected: Double-click start.bat from Explorer. Wait for banner. Press Ctrl+C in the cmd window. All node.exe + chrome.exe die. The wegwerf cmd window closes cleanly. There is NO "Terminate batch job (Y/N)?" prompt (Phase 47 gap-closure-13 behavior preserved).
result: [pending]

### 3. Scenario C — X-button window close (49-B core fix)
expected: Double-click start.bat. Wait for banner. Click the X (close) button on the cmd window. Within 5 seconds: no node.exe or chrome.exe from ttb-ssr-* userDataDirs remain.
verify: `Get-Process node,chrome -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*ttb-ssr*"}` → empty result.
result: [pending]

### 4. Scenario D — Linux ./start.sh + Ctrl+C (gold rail non-regression)
expected: On Linux, `./start.sh`. Wait for banner. Press Ctrl+C. Behavior identical to pre-Phase-49: all node + chrome descendants killed, terminal returns to prompt. No new errors, no new delays.
result: [pending]

### 5. Banner cross-check — Invocation context label
expected: The startup banner shows the correct invocation context for each launch method:
- Double-click: `[start]    Invocation context: fresh-cmd (ancestor cmds: N)`
- ./start.bat from PowerShell: `[start]    Invocation context: existing-shell (ancestor cmds: N)`

Verify the label matches the invocation method for each scenario above.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

(none yet — populate during UAT)
