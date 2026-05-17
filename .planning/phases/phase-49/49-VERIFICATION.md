---
phase: 49
status: human_needed
verified_date: 2026-05-17
must_haves_total: 10
must_haves_verified: 10
gaps: []
human_verification:
  - test: "Scenario A — Existing-shell Ctrl+C (49-A core fix)"
    steps: |
      1. Open a fresh PowerShell (or cmd) — your normal working shell.
      2. cd into the tt-beamer repo.
      3. Run ./start.bat
      4. Confirm boot log shows: '[start]    Invocation context: existing-shell (ancestor cmds: N)'.
      5. Wait for the 'TT-Beamer is running' success banner.
      6. Press Ctrl+C.
    expected: |
      Within 5 seconds:
      - '[start] Shutting down ...' appears.
      - The PowerShell prompt returns; typing Get-Date works (your working shell SURVIVED).
      - Get-Process node,chrome -ErrorAction SilentlyContinue | Where-Object {$_.Path -like '*ttb-ssr*' -or $_.Path -like '*tt-beamer*'} returns NOTHING.
    why_human: "Requires running PowerShell on actual Windows, observing live process tree behavior, and verifying the operator's working shell session is not killed — cannot be programmatically tested from Linux."

  - test: "Scenario B — Double-click Ctrl+C (Phase 47 non-regression)"
    steps: |
      1. From Explorer, double-click start.bat.
      2. The wegwerf cmd window opens.
      3. Confirm boot log shows: '[start]    Invocation context: fresh-cmd (ancestor cmds: N)'.
      4. Wait for the success banner.
      5. Press Ctrl+C in the wegwerf cmd window.
    expected: |
      Within 5 seconds:
      - '[start] Shutting down ...' appears briefly.
      - The wegwerf cmd window CLOSES with NO 'Terminate batch job (Y/N)?' prompt.
      - Get-Process node,chrome -ErrorAction SilentlyContinue (filtered to tt-beamer paths) returns NOTHING.
    why_human: "Requires Explorer double-click invocation on actual Windows and observation of the no-batch-prompt close behavior. Phase 47 regression check — must still pass post Phase 49 gating."

  - test: "Scenario C — X-button window close (49-B core fix)"
    steps: |
      1. Start via EITHER method (Phase 47 double-click OR existing-shell ./start.bat — try both for full coverage).
      2. Wait for success banner.
      3. Click the cmd window's X-button (top-right close).
    expected: |
      Within 5 seconds:
      - The cmd window closes.
      - Get-Process node,chrome -ErrorAction SilentlyContinue | Where-Object {$_.Path -like '*ttb-ssr*'} returns NOTHING.
      - No orphan node.exe / chrome.exe / mediasoup-worker.exe processes remain in Task Manager from this session.
      - (Belt-and-suspenders working: SetConsoleCtrlHandler CTRL_CLOSE_EVENT handler runs $cleanup BEFORE the kernel KILL_ON_JOB_CLOSE fires.)
    why_human: "Requires Win32 console subsystem to deliver an actual CTRL_CLOSE_EVENT via the close-window button — cannot be simulated by automated greps or by running PowerShell on Linux."

  - test: "Scenario D — Linux start.sh + Ctrl+C non-regression"
    steps: |
      1. On the Linux gold-rail box: git pull && ./start.sh
      2. Confirm boot completes normally (no behavior change vs prior phases).
      3. Press Ctrl+C.
    expected: |
      - Server stops cleanly within ~5s.
      - Shell prompt returns.
      - pgrep -fa node && pgrep -fa Xvfb returns empty (no orphan node / chromium / Xvfb).
      - Behavior IDENTICAL to pre-Phase-49 runs (start.sh is byte-identical to git HEAD — verified automated).
    why_human: "Linux gold-rail confirmation. start.sh is automatically verified as byte-identical to git HEAD (git diff returns 0), but runtime behavior parity should be operator-confirmed once."

  - test: "Banner verification (cross-scenario)"
    steps: |
      Run any of Scenarios A/B/C above; observe the boot-log banner line.
    expected: |
      - Scenario A invocation (existing-shell ./start.bat): '[start]    Invocation context: existing-shell (ancestor cmds: N)' where N is usually 1 or 2.
      - Scenario B/C double-click invocation: '[start]    Invocation context: fresh-cmd (ancestor cmds: N)'.
      - The banner line confirms the InvocationContext detection algorithm correctly classified the invocation mode BEFORE any Ctrl+C / X-close decision is taken.
    why_human: "Operator-facing diagnostic that proves the detection heuristic works in practice. The explorer-grandparent heuristic could misfire on unusual host configurations (WindowsTerminal-hosted cmd from pinned taskbar, run-as-administrator double-click with active UAC consent.exe, etc.) — must be confirmed on the real operator rig."
---

# Phase 49: Release-Prep Small-Fixes (Win32 Process Supervision Hardening) — Verification Report

**Phase Goal (from ROADMAP Phase 49 + plan must_haves):**
- 49-A: existing-shell `./start.bat` + Ctrl+C cleanly terminates children within 5s; operator shell survives
- 49-B: window-close X-button leaves no orphan node/chrome processes within 5s
- Phase 47 non-regression: double-click `start.bat` + Ctrl+C still works cleanly (no batch-job prompt)
- Linux non-regression: `start.sh` + Ctrl+C unchanged (byte-identical to git HEAD)

**Verified:** 2026-05-17
**Status:** human_needed
**Re-verification:** No — initial verification
**Mode:** Initial (no previous VERIFICATION.md found)

## Goal Achievement — Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Existing-shell Ctrl+C: server children die within 5s, operator shell survives | ? UNCERTAIN (human-gated) | Code wiring complete: detection routine (line 393-409) defaults to `existing-shell`, CancelKeyPress gate (line 699) skips ancestor-cmd-kill when context != fresh-cmd, `$cleanup` still runs (line 705), then `[System.Environment]::Exit(0)` (line 706). Stop-ServerProcess + Job Object KILL_ON_JOB_CLOSE handle node+chrome reap without touching parent shell. Runtime behavior requires Win operator UAT. |
| 2 | Double-click Ctrl+C: wegwerf cmd closes cleanly, no batch-job prompt (Phase 47 preserved) | ? UNCERTAIN (human-gated) | Code wiring complete: detection routine (line 401) sets `fresh-cmd` when topmost-cmd-parent is explorer.exe, both gating sites (lines 699 + 787) allow ancestor-cmd-kill in that mode, preserving Phase 47 gap-closure-13 behavior exactly. Runtime behavior requires Win operator UAT. |
| 3 | X-button window close: no orphan node/chrome/mediasoup-worker within 5s; `$cleanup` runs before kernel hard-kill | ? UNCERTAIN (human-gated) | Code wiring complete: SetConsoleCtrlHandler P/Invoke declared (TtbJob+ConsoleCtrlDelegate), delegate INSTANCE stored in $script:CtrlHandlerDelegate (GC anchor — line 661), registered via SetConsoleCtrlHandler($delegate, $true) at line 670, handler invokes `$cleanup` for ctrlType ∈ {2,5,6} (line 665-666), returns $false so kernel KILL_ON_JOB_CLOSE (0x2000 on line 629) fires as the belt. Win32 CTRL_CLOSE_EVENT delivery requires actual Windows runtime. |
| 4 | Linux start.sh unchanged (byte-identical to git HEAD) | ✓ VERIFIED | `git diff --stat HEAD -- start.sh \| wc -l` → 0. Byte-identical, no Linux-path code touched. |
| 5 | No new admin / no new external dependencies installed | ✓ VERIFIED | Only files modified: start.ps1. SetConsoleCtrlHandler is a documented Win32 API requiring no admin. No new package.json entries, no new binaries downloaded. |

**Score:** 10/10 automated must-haves verified · 5 truths total: 2 fully verified (#4, #5), 3 require human UAT (#1, #2, #3).

## Required Artifacts — Three-Level Verification

| Artifact | Expected | Status | Evidence |
|----------|----------|--------|----------|
| `start.ps1` (SetConsoleCtrlHandler hook) | P/Invoke decl + delegate + registration call | ✓ VERIFIED (L1+L2+L3) | L1: file exists. L2: `SetConsoleCtrlHandler` count=6 (≥2); `ConsoleCtrlDelegate` count=4; `CtrlHandlerDelegate` count=3 (decl + assignment + line in `$script:` scope). L3: registered at line 670 inside try-block. |
| `start.ps1` (InvocationContext gating) | Detection routine + 2 identical gates | ✓ VERIFIED (L1+L2+L3) | L1: file exists. L2: `InvocationContext` count=6 (≥4 required: declaration + comment + 2 gates + banner + detection-set). L3: `if ($script:InvocationContext -eq 'fresh-cmd')` lines 699 + 787 — both gating sites use IDENTICAL guard expression. |

L4 (data-flow trace) is N/A — start.ps1 is a launcher script (no dynamic-data rendering surface).

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Job Object Add-Type block | Win32 console subsystem | SetConsoleCtrlHandler P/Invoke + $script:CtrlHandlerDelegate (GC anchor) | ✓ WIRED | Delegate declared as nested type of TtbJob; instance stored in $script:CtrlHandlerDelegate; registration `[void][TtbJob]::SetConsoleCtrlHandler($script:CtrlHandlerDelegate, $true)` at line 670 inside a `try` block matching existing graceful-degrade pattern. |
| CTRL_CLOSE_EVENT delegate | Stop-ServerProcess cleanup | `& $cleanup` call inside ctrlType==2/5/6 branch | ✓ WIRED | Line 665-666: `if ($ctrlType -eq 2 -or $ctrlType -eq 5 -or $ctrlType -eq 6) { try { & $cleanup } catch {} }`. `$cleanup` block relocated above Add-Type block so delegate closure captures it. |
| Boot section (after AncestorCmdPids walk) | CancelKeyPress handler @699 + preemptive ancestor-kill @787 | $script:InvocationContext gate | ✓ WIRED | Detection at lines 393-409 runs immediately after AncestorCmdPids walk completes (line 348-368). Both consumer sites use the variable identically. |
| CTRL_CLOSE_EVENT handler return value | Kernel KILL_ON_JOB_CLOSE belt | `return $false` → Windows default handler chain continues | ✓ WIRED | Line 668: `return $false`. Comment at line 655-659 documents the intent. Job Object LimitFlags = 0x2000 preserved on line 629. |

## Anti-Patterns Scan

No blockers found. Scanned start.ps1 for:
- `TODO|FIXME|XXX|HACK|PLACEHOLDER` — only legacy markers from earlier phases, none in Phase 49-touched regions.
- `return null/empty/=> {}` stubs — none in new code.
- `console.log` only / no-op handlers — none.
- Hardcoded empty data flowing to render — N/A (launcher script).

## Requirements Coverage

Phase has no formal requirement IDs (release-prep polish — REQUIREMENTS.md does not exist). Plan tracks two operator-reported issue IDs:

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| 49-A | 49-01-PLAN | Existing-shell Ctrl+C does not kill operator working shell | ✓ Code complete, ? Runtime requires UAT | InvocationContext detection + gated ancestor-kill at 2 sites; defaults safe to `existing-shell`. |
| 49-B | 49-01-PLAN | X-button window close reaps all children, no orphans | ✓ Code complete, ? Runtime requires UAT | SetConsoleCtrlHandler + delegate alive in $script: scope + KILL_ON_JOB_CLOSE preserved. |

## Automated Check Results (All 10 Must-Haves)

| # | Must-have | Threshold | Actual | Status |
|---|-----------|-----------|--------|--------|
| 1 | `SetConsoleCtrlHandler` count in start.ps1 | ≥ 1 | 6 | ✓ |
| 2 | `CTRL_CLOSE_EVENT` (=2) handled (literal `CTRL_CLOSE_EVENT` + `$ctrlType -eq 2`) | ≥ 1 | `CTRL_CLOSE_EVENT` ×7 + handler `if ($ctrlType -eq 2 -or ... )` at line 665 | ✓ |
| 3 | `CtrlHandlerDelegate` (script-scope, GC anchor) | ≥ 1 | 3 | ✓ |
| 4 | `InvocationContext` count | ≥ 3 | 6 | ✓ |
| 5 | `InvocationContext -eq 'fresh-cmd'` gate lines | exactly 2 | 2 (lines 699, 787) | ✓ |
| 6 | `0x2000` (Phase 47 KILL_ON_JOB_CLOSE preserved) | ≥ 1 | 3 (incl. preserved `LimitFlags = 0x2000` at line 629) | ✓ |
| 7 | `git diff --stat HEAD -- start.sh` (Linux untouched) | 0 lines | 0 | ✓ |
| 8 | `git diff --stat HEAD -- start.bat` (wrapper untouched) | 0 lines | 0 | ✓ |
| 9 | Phase 47 anchors preserved: Stop-ServerProcess (~295) + Get-ParentProcessId (~328) + AncestorCmdPids walk | present | line 295, line 328, line 348+359 | ✓ |
| 10 | Banner-line `Invocation context` (operator-facing diagnostic) | ≥ 1 | 1 (line 409) | ✓ |

**Bonus structural checks:**
- `foreach ($cmdPid in $script:AncestorCmdPids)` blocks: exactly 2 (lines 700, 788) — both inside `if ($script:InvocationContext -eq 'fresh-cmd')` gates.
- `fresh-cmd` literal occurrences: 5 (default-value, detection-set, both gate sites, comments).
- `existing-shell` literal occurrences: 6.
- `Phase 49` markers in code comments: 6 (≥ 3 required) — future archeology trail intact.
- `ConsoleCtrlDelegate` count: 4 (delegate type decl + instance assignment + references).

## Human Verification Required

All 4 UAT scenarios require manual operator testing on actual Windows 10/11 + Linux hardware. See `human_verification` block in frontmatter (renders into HUMAN-UAT.md by orchestrator). Summary:

1. **Scenario A** — Existing-shell Ctrl+C (49-A core fix): operator shell SURVIVES, children die within 5s.
2. **Scenario B** — Double-click Ctrl+C (Phase 47 non-regression): wegwerf cmd closes cleanly, no batch-job prompt.
3. **Scenario C** — X-button window-close (49-B core fix): no orphans within 5s; `$cleanup` log line appears.
4. **Scenario D** — Linux start.sh + Ctrl+C non-regression: identical to pre-Phase-49 behavior.

Plus banner-line cross-check: operator should see correct InvocationContext label for each invocation method.

## Gaps Summary

**No gaps found.** All 10 automated must-haves pass. All 4 wiring links verified. All Phase 47 anchors preserved. Linux gold rail byte-identical. The phase code is complete and structurally correct — what remains is runtime confirmation on actual Win32 console subsystem hardware, which cannot be performed from Linux planner-box automation.

The verification is gated on operator UAT (status: human_needed), NOT on missing code.

## Verdict

**HUMAN VERIFICATION NEEDED** — code is complete and wiring is verified; runtime behavior must be confirmed by operator UAT on Win10/11 + Linux gold rail.

---

_Verified: 2026-05-17_
_Verifier: Claude (gsd-verifier)_
