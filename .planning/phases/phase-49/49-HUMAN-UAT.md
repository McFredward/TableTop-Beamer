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

### 1. Scenario A — Existing-shell ./start.bat + Ctrl+C (49-A core fix)
expected: From an existing PowerShell session, run `./start.bat`. Wait for the LAN-URL banner. Press Ctrl+C. Within 5 seconds: all node.exe + chrome.exe descendants from this session are gone, AND the operator's PowerShell prompt is alive and ready for the next command (not closed, not frozen, not silently exited).
verify: `Get-Process node,chrome -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*ttb-ssr*"}` → empty result.
result: [pending]

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
