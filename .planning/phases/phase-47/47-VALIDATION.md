---
phase: 47
slug: windows-parity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (vanilla Node.js test runner, used by existing test/**.test.mjs) |
| **Config file** | none — entry via `npm test` (package.json scripts) |
| **Quick run command** | `npm test -- --test-name-pattern="phase-47"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~45s full suite (404 tests baseline) |

---

## Sampling Rate

- **After every task commit:** Run quick command + targeted file syntax probe (`node --check <changed-file>` for .mjs/.js, `pwsh -Command "Get-Content <file> | Out-Null"` for .ps1 — but PS files are operator-side, builder-side syntax check uses PowerShell parser via `Test-PSScriptAnalyzer` if available, else skip).
- **After every plan wave:** `npm test` (full 404-test baseline must stay green, allowing 1 pre-existing fail).
- **Before `/gsd-verify-work`:** Full suite green + `./start.sh --dry-run` exits 0 (Linux non-regression rail).
- **Max feedback latency:** 60 seconds (test suite is fast).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 47-01-01 | 01 | 1 | D-01 to D-03 | — | New `buildChromiumLaunchArgs()` produces correct args per platform | unit | `node --test test/phase-47-launch-args.test.mjs` | ❌ W0 | ⬜ pending |
| 47-01-02 | 01 | 1 | D-02 | — | Linux arg list byte-identical to iter15 baseline | unit (pinned snapshot) | `node --test test/phase-47-linux-non-regression.test.mjs` | ❌ W0 | ⬜ pending |
| 47-01-03 | 01 | 1 | D-03 | — | Windows arg list contains headless:"new", no --app=, no --window-position | unit | `node --test test/phase-47-launch-args.test.mjs` | ❌ W0 | ⬜ pending |
| 47-02-01 | 02 | 2 | D-01, D-03 | — | bootSsrRenderHost on win32 path: headless launches without ERR_ABORTED | integration | OPERATOR UAT (no headless win on CI) | manual | ⬜ pending |
| 47-02-02 | 02 | 2 | D-04, D-05 | — | Job Object kill: child chrome.exe + node.exe gone within 5s of cmd Ctrl+C | manual | OPERATOR UAT — tasklist diff | manual | ⬜ pending |
| 47-03-01 | 03 | 3 | D-07 | — | `./start.sh --dry-run` exits 0 on Linux | smoke | `bash start.sh --dry-run` | ✅ | ⬜ pending |
| 47-03-02 | 03 | 3 | D-07 | — | Full test suite remains 384 pass / 1 pre-existing fail | regression | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/phase-47-launch-args.test.mjs` — unit tests for `buildChromiumLaunchArgs(platform, options)` covering both win32 and linux paths
- [ ] `test/phase-47-linux-non-regression.test.mjs` — pinned-snapshot comparison: Linux arg list MUST equal iter15 baseline byte-for-byte

*Existing infrastructure: node:test + 404 existing tests. No framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No visible Chrome window on Win11 | D-03 | UI/desktop-state — cannot assert from process | Operator runs `start.bat`, observes desktop, takes screenshot of `tasklist | findstr chrome.exe` showing only puppeteer-child, NOT a visible window |
| Dashboard loads from phone over LAN | Phase exit criterion | LAN topology — cannot reproduce in CI | Operator opens `http://<lan-ip>:4173/` on phone, verifies board geometry renders |
| /output/ Pi receives stream within 10s | Phase exit criterion | Physical hardware — Pi not in CI | Operator opens `http://<lan-ip>:4173/output/` on Pi, verifies WebRTC stream connects, animation plays |
| Ctrl+C in cmd kills all child processes within 5s | D-05 | Process-supervision — needs real terminal | Operator runs start.bat, after stable boot presses Ctrl+C in cmd, runs `tasklist | findstr "node.exe chrome.exe mediasoup"` 5s later — output must be EMPTY |
| Cmd-window-X click kills all child processes within 5s | D-05 | Window-close behavior — needs real GUI | Same as above but operator clicks X on cmd window instead of Ctrl+C |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (manual UAT clustered at end)
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter after Wave-0 tests written

**Approval:** pending
