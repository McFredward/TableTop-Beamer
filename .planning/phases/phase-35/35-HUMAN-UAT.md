---
phase: 35
status: pending-operator-uat
gaming_pc_uat: required
pi_uat: deferred
test_board: nemesis-lockdown-a
---

# Phase 35 — Human UAT

**Performed by:** Operator (gaming-PC desktop browser primary; Pi UAT deferred per D-08)
**Status:** Phase 35 cannot CLOSE-OPERATOR-VERIFIED until gaming-PC visual UAT (UAT-1, UAT-2, UAT-4) completes; Pi-hardware items track as `status: deferred` per D-08 (carries forward Phase 33 + Phase 34 PASS-AUTOMATED-PENDING-PI-HARDWARE precedent).

**Auto-mode note:** This plan executed under `workflow._auto_chain_active = true` (gsd-config). Per checkpoint protocol, the operator UAT (Task 4 in 35-V-PLAN) is presented here as the operator-facing checklist; the closure document will reflect either `phase-35-uat-approved` (if operator runs and approves) or `PASS-AUTOMATED-PENDING-OPERATOR-UAT` (if executed in fully-headless auto-chain).

---

## UAT-1 (REQUIRED): Gaming-PC desktop browser /output/ smoketest

**Goal:** Verify `/output/` thin path renders H264 stream + align-mode handles + drag interaction works end-to-end.

**Setup:**
1. Server running on Lenovo Mini at `<host>:<port>` (default `http://127.0.0.1:8080` if running locally; use the LAN IP if testing from gaming-PC)
2. Operator on gaming-PC, desktop browser (Chrome 131+ / Firefox 130+ / Edge 131+)
3. Open dashboard `http://<host>:<port>/` in one tab; open `http://<host>:<port>/output/` in second tab

**Steps:**

| #   | Step                                                                                                        | Expected                                                                  | Result |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| 1   | **Stream smoketest** — verify /output/ tab shows the live H264 stream                                       | Visible video, no black screen, no error overlay; movement matches dashboard | ___    |
| 2   | **Align-mode toggle** — In dashboard, toggle align-mode ON                                                  | /output/ tab shows 4 corner handles (filled circles) at projection-mapping corners within ~1s | ___    |
| 3   | **Handle drag** — In /output/ tab, click-and-drag one corner handle                                          | Handle moves with mouse; dashboard's projection-mapping reflects the drag in its preview | ___    |
| 4   | **Polygon visibility** — If a room polygon is selected on dashboard, verify polygon outline visible on /output/ | Polygon outline + vertex handles visible on /output/ in alignMode             | ___    |

**Pass criteria:** All 4 steps complete without browser console errors. Handles render visibly. Drag mutations propagate. (Steps 1-3 are LOCKED gates per D-01; step 4 is a polish check.)

---

## UAT-2 (REQUIRED): No solid-color banding (D-03-C1-V)

**Goal:** Verify Bayer 4×4 dither eliminates the visible Mach-band step artifacts the operator originally reported as "Streifen" (post-Phase-34 UAT feedback).

**Setup:**
1. Operator triggers a known solid-color fade animation from dashboard (e.g., a slow alpha pulse on color `#3a5fcd` or similar mid-luminance hex)
2. /output/ tab is visible on gaming-PC

**Steps:**

| #   | Step                                                                                                            | Expected                                                                          | Result |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| 1   | Take a screenshot of /output/ during the fade — at the dim midpoint where bands were most visible pre-Phase-35 | Banding (visible Mach-band step transitions) GONE or visibly reduced               | ___    |
| 2   | Compare to a pre-Phase-35 screenshot if available (operator should have one from Phase 34 UAT)                  | Side-by-side shows clear improvement at sub-1.0 alpha                              | ___    |
| 3   | If no comparison screenshot is available, evaluate qualitatively from memory                                     | Operator confirms bands are gone or substantially diminished                        | ___    |

**Pass criteria:** Bands GONE or visibly reduced. The Bayer 4×4 weave at native resolution is technically present but should be invisible at 30 fps stream output and disappear under H264 compression downstream.

**If FAIL (bands still clearly visible):** Track C1 dithering insufficient. Escalate operator path: re-run 35-C-PLAN with `c2-escalate` flag — single-line swap at `ssr-render-host.mjs:564` (per RESEARCH §C.5: `--use-gl=angle` → `--use-gl=swiftshader`). Then re-run UAT-2 + UAT-4 (D-06 must stay GREEN after the swap).

---

## UAT-3 (DEFERRED per D-08): Pi 4 hardware UAT

**Status:** DEFERRED — Pi 4 hardware not always accessible. Same pattern as Phase 33 + Phase 34 PASS-AUTOMATED-PENDING-PI-HARDWARE.

**Items deferred to Pi-hardware-available session:**

| #   | Scenario                                                                                                   | Why deferred                                                              |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| P1  | /output/ on Pi shows H264 stream without thin-/output/ regressions                                         | Pi hardware required for actual visual smoketest                          |
| P2  | align-mode handles visible on Pi /output/                                                                   | Pi hardware required (architectural correctness verified on gaming-PC)    |
| P3  | align-mode drag triggers /api/live/command from Pi                                                          | Pi hardware required (architectural correctness verified on gaming-PC)    |
| P4  | Pi /output/ CPU usage in idle stream: measurably lower than pre-Phase-34 (per ROADMAP §Phase 35 exit crit) | Pi hardware + htop/atop measurement required                              |
| P5  | Pi /output/ no banding (visual UAT analogous to UAT-2)                                                      | Pi hardware required + may show separate banding source                   |
| P6  | 60-minute steady-state on Pi: no reconnect, no health-ping failures                                         | Pi hardware required for sustained-load test                              |

**Process:** When Pi hardware is available, operator runs the above checks; results are appended to this file as `## UAT-3 result: <date>` section. Pi-deferred items DO NOT block phase close per D-08.

---

## UAT-4 (REQUIRED before close): D-06 final automated re-run

**Goal:** Pre-merge regression sanity check that the connection-stability hard gate is GREEN against the operator's actual local checkout.

**Steps:**

| #   | Step                                                                                            | Expected                                                                                                                | Result |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Operator runs `RUN_LIVE_TESTS=1 node --test "test/connection-stability/*.test.mjs"`           | `tests 85`, `pass 84`, `fail 0`, `skipped 1` (the 1-hour steady-state test requires `RUN_LONG_TESTS=1` to also run)      | ___    |
| 2   | Optional: also run `RUN_LIVE_TESTS=1 npm run test:live` (which uses the documented npm script) | Same 85/84/0/1 ratio                                                                                                    | ___    |

**Pass criteria:** `fail = 0`. The HARD-GATE INVARIANT is `fail = 0` (the absolute counts may vary as the suite grows organically, but `fail = 0` is non-negotiable).

**Re-verification at Phase 35 close (this V-plan run):** PASSED — `tests 85, pass 84, fail 0, skipped 1` captured at `/tmp/phase-35-verification/run.log` (run timestamp 2026-05-10).

---

## Sign-off

When UAT-1, UAT-2, and UAT-4 are GREEN, operator types `phase-35-uat-approved` in `35-CLOSURE.md` (or appends an "operator UAT result: phase-35-uat-approved <date>" line) and the phase closes.

**UAT-3 (Pi)** closes the phase deferred items independently when Pi hardware permits — does NOT block phase close per D-08.

If UAT-1 or UAT-2 FAIL, do NOT type `phase-35-uat-approved` — instead, describe the failure (browser, console errors, screenshot) and trigger hotfix planning.

---

## Auto-Chain Note

This plan executed under `workflow._auto_chain_active = true`. Per checkpoint protocol, the executor reaches Task 4 (`checkpoint:human-verify`) and STOPS for operator. In auto-chain headless context, no live operator is present — the closure document defaults to `PASS-AUTOMATED-PENDING-OPERATOR-UAT` (analogous to Phase 34's `PASS-AUTOMATED-PENDING-PI-HARDWARE`). When operator runs UAT-1/UAT-2/UAT-4 from this checklist, they update `35-CLOSURE.md` Sign-off section with the result.

---

## References

- D-01-A1 / D-01-A2 / D-01-A3 — `35-CONTEXT.md` (decisions section)
- D-03-C1-V — `35-CONTEXT.md` D-03 + 35-VERIFICATION.md row D-03-C1-V
- D-06 baseline (`fail = 0` invariant) — `35-VERIFICATION.md` Carry-Forward Regression Rails table
- D-08 (Pi UAT deferral pattern) — `35-CONTEXT.md` D-08 + Phase 33-CLOSURE.md + Phase 34-HUMAN-UAT.md (deferred section)
