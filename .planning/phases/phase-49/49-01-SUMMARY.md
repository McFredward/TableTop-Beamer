---
phase: 49-release-prep-small-fixes
plan: 01
subsystem: infra
tags: [windows, process-supervision, ctrl-c, job-object, p-invoke, win32-console]

# Dependency graph
requires:
  - phase: 47-gap-closure
    provides: AncestorCmdPids walk + Get-ParentProcessId helper + Job Object with KILL_ON_JOB_CLOSE flag (0x2000)
  - phase: 46-iter14
    provides: Best-effort Job Object base infrastructure + Add-Type TtbJob class scaffold
provides:
  - SetConsoleCtrlHandler P/Invoke wired to CTRL_CLOSE_EVENT (+ LOGOFF + SHUTDOWN) so PowerShell-side $cleanup runs BEFORE kernel KILL_ON_JOB_CLOSE reaps the Job Object
  - $script:InvocationContext detection (fresh-cmd vs existing-shell) with safe default
  - Gated ancestor-cmd-kill at both sites (CancelKeyPress handler + preemptive post-banner kill); only kills wegwerf cmd in the double-click path
affects: [phase-50-release-prep, future windows-supervision work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Invocation-context detection via topmost-cmd-parent-is-explorer heuristic"
    - "Win32 SetConsoleCtrlHandler P/Invoke with $script:-scoped delegate to anchor against GC"
    - "Belt-and-suspenders shutdown: user-mode $cleanup hook (this phase) + kernel-mode KILL_ON_JOB_CLOSE (Phase 47)"

key-files:
  created: []
  modified:
    - start.ps1 (Win32 launcher — SetConsoleCtrlHandler registration + InvocationContext gating)

key-decisions:
  - "Phase 49 prompt's premise that KILL_ON_JOB_CLOSE was unset was inaccurate — Phase 47 already shipped LimitFlags = 0x2000. The actual gap was the missing user-mode SetConsoleCtrlHandler hook. Phase 49 adds the user-mode hook; the kernel flag stays put untouched."
  - "Default-safe InvocationContext = 'existing-shell'. Any CIM/WMI failure, empty walk, or non-explorer grandparent stays 'existing-shell'. False-positive ('existing-shell' detected as 'fresh-cmd') would kill the operator's working shell — the more dangerous outcome — so detection must be positive proof, not absence of proof."
  - "CTRL_CLOSE_EVENT handler returns $false (not $true) so Windows continues its default handler chain, letting kernel KILL_ON_JOB_CLOSE fire as the safety net after user-mode $cleanup completes."
  - "$script:CtrlHandlerDelegate stored in $script: scope to keep the delegate INSTANCE alive — preventing .NET GC from reclaiming it while Windows still holds the callback pointer (would cause crash on window-close, opposite of what we want)."
  - "$cleanup scriptblock relocated from line ~587 to immediately after Start-Process so the SetConsoleCtrlHandler delegate (registered after Job Object setup) can capture it in its closure."

patterns-established:
  - "Win32 console-event P/Invoke pattern in WinPS 5.1: declare delegate as nested type on Add-Type'd class, register via SetConsoleCtrlHandler(delegate, true), keep delegate instance alive in $script: scope."
  - "Invocation-context detection pattern: walk ancestor chain to topmost contiguous cmd, inspect grandparent's ProcessName, default-safe on any ambiguity."

requirements-completed: [49-A, 49-B]

# Metrics
duration: ~3min
completed: 2026-05-17
---

# Phase 49 Plan 01: Windows Process-Supervision Hardening Summary

**Two-pronged Windows process-supervision fix: SetConsoleCtrlHandler for graceful CTRL_CLOSE_EVENT cleanup (49-B) + invocation-context-gated ancestor-cmd-kill so `./start.bat` from an existing shell no longer murders the operator's working session (49-A).**

## Performance

- **Duration:** ~3 min (executor wall-clock)
- **Started:** 2026-05-17T15:53:11Z
- **Completed:** 2026-05-17T15:56:31Z
- **Tasks:** 2 implementation tasks committed atomically; Task 3 is a human-verify checkpoint
- **Files modified:** 1 (`start.ps1`)

## Accomplishments

- **49-B (X-button cleanup):** Registered `SetConsoleCtrlHandler` for `CTRL_CLOSE_EVENT` (+ `CTRL_LOGOFF_EVENT`, `CTRL_SHUTDOWN_EVENT`) via Win32 P/Invoke extension to the existing `TtbJob` class. The handler invokes `$cleanup` (Stop-ServerProcess) BEFORE returning `$false` to let Windows continue its default handler chain, which triggers the kernel-level `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` belt that Phase 47 already shipped. Operator now gets a `[start] Shutting down ...` log line on window-close, AND the kernel reap still fires as a safety net.
- **49-A (existing-shell Ctrl+C survival):** Added `$script:InvocationContext` detection after the existing AncestorCmdPids walk. Detection inspects the grandparent of the topmost cmd ancestor — if it's `explorer.exe`, we're in the Phase-47 double-click path (`fresh-cmd`); otherwise (powershell, pwsh, WindowsTerminal, walk truncation, CIM failure) we default-safe to `existing-shell`. Both ancestor-cmd-kill sites (CancelKeyPress handler @699 + preemptive post-banner kill @787) are now gated on `$script:InvocationContext -eq 'fresh-cmd'`. In `existing-shell` mode, `Stop-ServerProcess` (taskkill /F /T) + the Job Object KILL_ON_JOB_CLOSE flag reap node + chrome + mediasoup-worker without touching the operator's working shell.
- **Phase 47 0x2000 LimitFlags PRESERVED:** No edits to line 629 (the kernel-level KILL_ON_JOB_CLOSE flag). Verified via grep both before and after.
- **Linux gold rail untouched:** `git diff --stat HEAD -- start.sh` returns zero. `git diff --stat HEAD -- start.bat` also zero.

## Task Commits

Each task was committed atomically:

1. **Task 1 (Wave 1, 49-B): Register SetConsoleCtrlHandler for CTRL_CLOSE_EVENT** — `675bc55` (feat)
2. **Task 2 (Wave 2, 49-A): Invocation-context detection + gated ancestor-cmd-kill** — `f14f668` (feat)

Task 3 is a human-verify checkpoint (operator UAT on Win11 + Linux non-regression); no commit produced by the executor.

## Files Created/Modified

- `start.ps1` — Win32 launcher
  * Relocated `$cleanup = { ... }` block above the Job Object setup so the new SetConsoleCtrlHandler delegate can close over it (was at ~line 587, now at line 534).
  * Extended the `Add-Type` `TtbJob` class with `ConsoleCtrlDelegate` + `SetConsoleCtrlHandler` P/Invoke (inside the same `try { Add-Type ... }` block that was already `-ErrorAction SilentlyContinue`, preserving the existing graceful-degrade behavior on PS-version mismatches).
  * Added a new `try { ... }` block after the Job Object `AssignProcessToJobObject` call to register the `CTRL_CLOSE_EVENT` handler. Delegate stored in `$script:CtrlHandlerDelegate` to anchor against GC.
  * Added `$script:InvocationContext` detection routine right after the AncestorCmdPids walk (line 348-368 unchanged; new detection starts at line ~370).
  * Added banner line `[start]    Invocation context: <ctx> (ancestor cmds: N)` so the operator can confirm which mode armed before pressing Ctrl+C.
  * Wrapped both ancestor-cmd-kill `foreach` blocks with `if ($script:InvocationContext -eq 'fresh-cmd') { ... }`. Both sites use IDENTICAL guard expressions.

## Deviations from Plan

None — plan executed exactly as written.

The only behavior worth flagging is the planner's correct observation in the plan body itself: the Phase 49 prompt's original framing claimed `KILL_ON_JOB_CLOSE` needed to be added, but Phase 47 had already shipped it on line 567 (now line 629 after Task 1's insertions). The plan correctly identified this and reframed the fix as "add the user-mode SetConsoleCtrlHandler hook; preserve the kernel-level flag". Executor verified preservation: grep `0x2000 start.ps1` returns the original `LimitFlags = 0x2000` line untouched.

## Invocation-Context Detection Algorithm

```
walk AncestorCmdPids (already computed by Phase 47 code at line 348-368)
  if AncestorCmdPids.Count > 0:
    topCmdPid = AncestorCmdPids[-1]                          # topmost contiguous cmd
    topCmdParent = Get-ParentProcessId(topCmdPid)             # CIM -> WMI -> wmic.exe fallback
    if topCmdParent > 0:
      parentProc = Get-Process(topCmdParent)
      if parentProc.ProcessName == 'explorer':
        InvocationContext = 'fresh-cmd'                       # double-click path
      else:
        InvocationContext = 'existing-shell'                  # default-safe
  else:
    InvocationContext = 'existing-shell'                      # no cmd ancestors at all
on any error -> 'existing-shell'                              # default-safe
```

Why the explorer-grandparent heuristic works:

- Double-click in Explorer: explorer.exe -> cmd.exe (the wegwerf one) -> powershell.exe (us). AncestorCmdPids captures the cmd; its parent is explorer.
- `./start.bat` from PowerShell: powershell.exe (operator's) -> cmd.exe (transient) -> powershell.exe (us). AncestorCmdPids captures the transient cmd; its parent is powershell, not explorer.
- `start.bat` typed in cmd.exe: cmd.exe (operator's) -> powershell.exe (us). AncestorCmdPids captures the operator's cmd; its parent is conhost.exe or another cmd or WindowsTerminal, not explorer.
- Run-as-administrator double-click: explorer.exe -> cmd.exe -> powershell.exe. Topmost cmd's parent is still explorer (UAC consent.exe is transient and gone by detection time on most configs). Still detects as `fresh-cmd`. Acceptable.

## Belt-and-Suspenders Termination Matrix

| Termination cause          | Primary handler                              | Belt mechanism                       |
|----------------------------|----------------------------------------------|--------------------------------------|
| Ctrl+C in fresh-cmd window | CancelKeyPress + gated ancestor-cmd-kill     | Job Object KILL_ON_JOB_CLOSE (0x2000) |
| Ctrl+C in existing shell   | CancelKeyPress + Stop-ServerProcess only     | Job Object KILL_ON_JOB_CLOSE         |
| X-button on cmd window     | SetConsoleCtrlHandler(CTRL_CLOSE_EVENT)      | Job Object KILL_ON_JOB_CLOSE         |
| taskkill of cmd parent     | SetConsoleCtrlHandler(CTRL_CLOSE_EVENT)      | Job Object KILL_ON_JOB_CLOSE         |
| Log-off / shutdown         | SetConsoleCtrlHandler(LOGOFF / SHUTDOWN)     | Job Object KILL_ON_JOB_CLOSE         |
| Crash / OOM / kill -9      | (none — no PS exec context)                  | Job Object KILL_ON_JOB_CLOSE         |
| Natural exit (server dies) | finally { & $cleanup }                       | Job Object handle close              |

Every row has at least one mechanism; most have two.

## Operator UAT Pending

**Task 3 is a `checkpoint:human-verify`. Executor returned CHECKPOINT REACHED block (see below). Orchestrator must collect operator UAT before marking Phase 49 complete.**

Four scenarios to run:
- **A** — `./start.bat` from existing PowerShell session, Ctrl+C: operator shell SURVIVES, children gone within 5 s.
- **B** — Double-click start.bat, Ctrl+C: wegwerf cmd closes cleanly, no "Terminate batch job (Y/N)?" prompt.
- **C** — Double-click or shell-launch, X-button-close: no orphan node/chrome from ttb-ssr-* dirs within 5 s.
- **D** — Linux `./start.sh` + Ctrl+C: identical to pre-phase behavior (gold rail intact).

Banner check: operator should see `[start]    Invocation context: fresh-cmd (ancestor cmds: N)` on double-click, and `[start]    Invocation context: existing-shell (ancestor cmds: N)` from a PS-invoked `./start.bat`.

## Follow-Up Items for Phase 50+

- If operator UAT reveals the `fresh-cmd` detection misfires on Windows 11 with WindowsTerminal-hosted cmd (e.g., cmd-with-conhost-via-WT spawned from Explorer pinned-taskbar), we may need to extend the grandparent allowlist to include `WindowsTerminal.exe` when its grandparent is `explorer.exe`. This was not implemented preemptively — the current detection is positive-explorer-only by design (any uncertainty defaults to the safe 'existing-shell' mode).
- Long-term, consider moving the launcher to a single `start-ttb.exe` wrapper that owns its own console, eliminating cmd.exe and PowerShell from the dependency chain. Out of scope for Phase 49 (release prep should be small fixes only).
- Stop-ServerProcess already uses `taskkill /F /T` which kills the whole tree; no further changes needed to the cleanup path itself for this phase.

## Source-Grep Regression Rail (Phase-Wide Roll-Up)

All checks PASS at HEAD `f14f668`:

```
SetConsoleCtrlHandler  count: 6  (>= 2 required)
ConsoleCtrlDelegate    count: 4  (>= 2 required)
CtrlHandlerDelegate    count: 3  (>= 2 required)
InvocationContext      count: 6  (>= 4 required)
fresh-cmd              count: 5  (>= 4 required)
existing-shell         count: 6  (>= 2 required)
Phase 49 markers       count: 6  (>= 3 required)
0x2000 LimitFlags      line 629  (PRESERVED from Phase 47 line 567)
foreach $cmdPid ...    count: 2  (both gated under InvocationContext)
Gate sites             count: 2  (lines 699 + 787 — both with identical guard)
start.sh diff          0 lines   (Linux gold rail intact)
start.bat diff         0 lines   (wrapper untouched)
Stop-ServerProcess     line 295  (UNCHANGED)
Get-ParentProcessId    line 328  (UNCHANGED)
```

PowerShell `[scriptblock]::Create` syntax check skipped (no pwsh on planner Linux box); Task 3 operator UAT proves runtime correctness.

## Self-Check: PASSED

Verified at `f14f668`:
- `start.ps1` modified (54 + 65 = 119 net additions across 2 task commits) — FOUND
- Commit `675bc55` (Task 1: SetConsoleCtrlHandler) — FOUND
- Commit `f14f668` (Task 2: InvocationContext gating) — FOUND
- `start.sh` UNCHANGED — FOUND (git diff returns 0)
- `start.bat` UNCHANGED — FOUND (git diff returns 0)
- `0x2000 LimitFlags` preserved on line 629 — FOUND
- All Task 1 + Task 2 acceptance criteria grep counts meet/exceed thresholds — FOUND
