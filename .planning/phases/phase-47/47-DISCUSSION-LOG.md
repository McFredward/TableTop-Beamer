# Phase 47: Windows Full-Functional Parity with Linux - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 47-windows-parity
**Areas discussed:** Chrome browser strategy, Test/verification approach, iter11-iter15 disposition

---

## Chrome browser strategy on Windows

| Option | Description | Selected |
|--------|-------------|----------|
| System-Chrome, isolated | Use installed Chrome/Edge with unique user-data-dir + headless=new. No extra download. Depends on headless=new + WebRTC stability (verified in M1 research). | ✓ |
| Chrome-for-Testing bundled | Download ~150 MB Chrome-for-Testing to .chrome-portable/ on first boot. Fully isolated, predictable version. Slower first-run. | |
| Hybrid: system-first, bundled fallback | Try system-Chrome with isolation; fall back to bundled Chrome-for-Testing if M1 finds instability. Resilient against version drift. | |

**User's choice:** System-Chrome, isolated (recommended option)
**Notes:** Operator prefers minimal install footprint. Bundling Chrome stays as a documented Phase-47 fallback if M1 research surfaces a hard blocker (WebRTC broken in headless-new, etc.).

---

## Test / verification strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Operator UAT on Win10 box | Operator runs start.bat, reports failures, builder iterates. Fast, focused. Regressions noticed by operator. | ✓ |
| Operator UAT + GitHub Actions windows-latest CI | Add Windows CI runner that runs npm test + smoke launcher. More upfront work, catches regressions immediately. | |
| Smoke test only, no CI | A test/windows/smoke-launcher.test.mjs stubs the launcher flow without spawning real Chrome. Middle ground. | |

**User's choice:** Operator UAT on Win10 (recommended option)
**Notes:** Operator validates on actual hardware. Future phase can revisit CI if regressions accumulate.

---

## iter11-iter15 disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Build on top of iter15, targeted patches | Keep ASCII-only .ps1, Job Object, unique user-data-dir, off-screen window. Patch only the SSR rendering path (headless=new + isolation). | ✓ |
| Mark iter11-iter15 as experimental, rebuild Windows stack | Treat Windows as never-worked, build fresh inside Phase 47. Cleaner but more work. | |
| Revert iter11-iter15 entirely | Roll back commits, restart Phase 47 clean. Risky — some iter fixes are necessary (ASCII PS, Job Object, etc.). | |

**User's choice:** Build on top of iter15 (recommended option)
**Notes:** The iter11-iter15 fixes address real bugs (WinPS 5.1 encoding, single-instance, orphan-process). Phase 47 targets the remaining gap: the visible Chrome window + restart loop.

---

## Claude's Discretion

- Implementation details of how to switch to `--headless=new`
- Whether to add new SSR_* env knobs
- Whether to extract Windows-specific code into helper modules vs keep inline
- Specific CDP commands for diagnostics
- Whether to use Win32 ShowWindow P/Invoke if headless-new turns out
  problematic in M1 research

## Deferred Ideas

- GitHub Actions windows-latest CI
- Chrome-for-Testing bundling (kept as M1 fallback only)
- macOS launcher
- WSL detection / WSL-specific paths
- Removing iter11-iter15 commits (operator explicitly rejected)
