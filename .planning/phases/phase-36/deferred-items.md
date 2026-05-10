# Phase 36 — Deferred Items

This file tracks scope explicitly carved out of Phase 36 implementation waves
for follow-up work. The V wave records these in ROADMAP.md as Phase-37+
candidates.

---

## D1 — M3-LATE: Dashboard `runtime-orchestration.js` migration to `bootHandleUi`

**Wave:** M3 (path-(b) escape per `36-M3-PLAN.md` Task 3)

**Status:** Deferred to a future phase (Phase 37+ candidate; V wave records as
ROADMAP follow-up).

**What was planned:** Replace dashboard's `MAPPING.init(...)` (line 472) +
`POLYGON_EDITOR.init(...)` (line ~1953) pair with a single `bootHandleUi(...)`
call (Option H per CONTEXT.md D-01) so dashboard and `/output/` share a single
boot path.

**Why deferred:**

1. **Architectural complexity at the call sites:** `MAPPING.init` runs
   *before* `state = window.TT_BEAMER_STATE.createInitialState({...})` at
   line 512. `POLYGON_EDITOR.init` runs at line ~1953 *after* extensive state
   setup, profile loading, and dep-bag construction. A single `bootHandleUi`
   call requires either:
   - Moving the entire state construction + half the dep-bag construction
     (~1500 LOC of orchestration) ahead of `bootHandleUi`, or
   - Splitting `bootHandleUi` so it can be invoked piecewise to mirror the
     existing two-phase init.

   Both paths represent significant refactor with high regression risk to a
   battle-tested dashboard flow.

2. **`/output/` thin path is already covered:** A1+A2 wired `bootHandleUi`
   into `output-align-mode-loader.js`. M3 (this wave) flipped T1+T2+T10 GREEN
   on `/output/`. The dashboard's existing two-call init delivers byte-
   identical functionality on the dashboard — no functional regression for
   operators using the dashboard.

3. **Phase 35 dashboard regression test (`test_phase35_dashboard_alignmode.py`)
   was RED before A1/A2:** Per `36-W0-SUMMARY.md` ("Dashboard parity rail
   remains RED today by design"), this test was authored as a forward-looking
   guard, not a current passing rail. M3-LATE was the locked path-a target;
   path-(b) explicitly leaves the test RED with documented deferral.

**Acceptance per plan (M3 Task 3 acceptance criterion (b)):**
- `grep -c "TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init" src/app/runtime/runtime-orchestration.js`
  returns ≥ 1 (legacy retained) — verified.
- This `deferred-items.md` entry exists — created in this commit.
- Phase 36 `/output/` tests T1, T2, T10 stay GREEN — verified (3 passed).
- Connection-stability fail=0 preserved — verified.

**Re-opening criteria (when to do this work):**

- Operator reports a dashboard-vs-`/output/` divergence that traces back to
  the dual init path, OR
- A future Phase 36 follow-up wave needs to extend handle-ui ctx and the
  one-call-site requirement of Option H becomes a hard prerequisite.

**Estimated effort:** ~3-5 days (refactor + dashboard E2E gauntlet + Pi-
hardware UAT pass).

---

## D2 — Phase 35 W0 dashboard E2E rail (`test_phase35_dashboard_alignmode.py`)

**Status:** Deferred — directly tied to D1 above. Test flips GREEN when
dashboard migration completes.

**Current state:** RED (timeout waiting for `.projection-corner-handle` in
the dashboard 5s window). Pre-existing condition from Phase 35 W0 (per
`36-W0-SUMMARY.md`); not introduced by Phase 36 waves.

**Acceptance:** GREEN once D1 is resolved.

---
