---
phase: 36
slug: comprehensive-alignmode-thin-output
status: deferred
audience: operator
deferred_reason: "Pi 4 hardware not in CI — D-10 carry-forward pattern from Phase 33/34/35"
created: 2026-05-10
gaming_pc_uat: optional-already-covered-by-automated-T1-T10
pi_uat: deferred
test_board: nemesis-lockdown-a
---

# Phase 36 — Human UAT (Pi-hardware deferred)

Per CONTEXT.md `D-10` + carry-forward from Phase 33/34/35, the Pi-hardware
visual and functional UAT for Phase 36 is **deferred** until operator Pi 4
hardware is accessible. Operator runs each item below on actual Pi 4 hardware
when available and records `OK` or a regression note (with date + initials)
in the "Operator note" line.

All 10 T1-T10 interactions plus the 6 dashboard parity variants (3 `/output/`
+ 3 `/`) are already verified GREEN/RED-as-expected in the gaming-PC desktop
automation (see `36-VERIFICATION.md`). The items below are the Pi-specific
visual + browser-quirk verifications that automation cannot cover.

---

## Setup (one-time, when Pi hardware available)

1. Boot Pi 4 with the latest Phase 36 build deployed.
2. Open `/output/` in the Pi's default browser (Chromium).
3. Have a second device (e.g., gaming-PC) open `/` (dashboard) for the
   dirty-flag cross-tab verification (Item 9) and the dashboard regression
   check (Item 13).
4. Verify server logs are tailing (so operator can capture
   `[align-mode-dirty] received dirty=` markers — T9 hardware confirm).
5. Trigger align-mode ON via dashboard or
   `POST /api/live/command {"mutationType":"context-update","payload":{"alignMode":true}}`.

Pre-flight: `runtime-active-grid.json` should be at identity (`[0.0, 0.5, 1.0]`
default — M3 change) for the sizing check (Item 1). Saved profiles persist
their own dst grid and are unaffected by the default change.

---

## Pi-hardware Smoketest (D-10)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 0 | `/output/` DOMContentLoaded | < 2s | deferred |
| 0 | `video.ssr-video` readyState | === 4 within 10s of DCL | deferred |
| 1 | T1 sizing | Handle frame visually aligned with stream content (no ESC realign needed) | deferred |
| 2 | T2 corner pulls | All 4 corner handles distort the stream toward the dragged corner | deferred |
| 3 | T3 vertex drag | Only the dragged vertex moves; neighbors anchored; stream reflects | deferred |
| 4 | T4 midpoint drag | Squish bars `.projection-grid-handle` move the corresponding row/col; stream reflects | deferred |
| 5 | T5 rotation | Rotation handle drags grid rotation around centroid; stream reflects | deferred |
| 6 | T6 image-pan | Free-area drag pans grid translation; stream reflects | deferred |
| 7 | T7 right-click menu | Context menu visible with `Add line / Delete line` items; "Add line" updates stream immediately (Q3 LOCK) | deferred |
| 8 | T8 CTRL+Z undo | Drag → CTRL+Z reverts handle to pre-drag position; stream reverts | deferred |
| 9 | T9 dirty-flag propagation | Dashboard `#align-mode-dirty-hint` becomes visible within 1-2s of /output/ gesture | deferred |
| 10 | Pi browser overlay-pointer-events quirk | No accidental finger fall-through to Pi OS during sustained drag (~30s) — no Pi-side scroll/zoom/menu | deferred |
| 11 | Connection stability under sustained drag (D-08 hardware confirm) | WebRTC stable over 60s drag; no reconnect; no frame-stale warning | deferred |
| 12 | VAAPI default-disabled preserved (carry-forward) | Boot without `SSR_ENABLE_VAAPI=1` → server logs "VAAPI disabled"; no GL-flag hangs | deferred |
| 13 | Dashboard regression check | On separate device's dashboard tab: align-mode toggle/drag/save/discard still all work normally | deferred |

---

## Operator workflow on /output/

For each item below the operator drives the interaction directly on `/output/`
in the Pi's browser. The handles are owned by `bootHandleUi(...)` (Option H
per CONTEXT.md D-01); right-click events reach the menu via DOM at z:9999
(overlay `#ssr-input-overlay` is permanently `pointer-events:none` per
D-02 (a)).

### Item 1 — Sizing (T1 hardware verification)

- **Behavior:** Toggle align-mode ON. Observe that the 4 corner handles +
  interior vertices visually align with the visible stream content (video
  bounding box).
- **Expected:** No "ESC then re-toggle" workaround required. Handles snap
  to viewport edges (identity grid default per M3) or to the saved profile's
  calibrated dst grid (if a calibrated profile is loaded). Within ±4 px on
  each edge.
- status: deferred
- **Operator note:** ___________________

### Item 2 — Corner pulls (T2 hardware verification)

- **Behavior:** Drag each of the 4 outer corner handles ~50 px in any direction.
- **Expected:** Streamed video content visibly distorts toward the dragged
  corner. Server stdout shows one `[align-grid-snapshot] server-recv` per
  drag (T10 invariant).
- status: deferred
- **Operator note:** ___________________

### Item 3 — Vertex drag (T3 hardware verification)

- **Behavior:** Drag an interior vertex (e.g. `.projection-corner-handle[data-row="0"][data-col="1"]`).
- **Expected:** Only that vertex moves in the stream; neighboring vertices
  remain anchored. Stream reflects the new mesh shape.
- status: deferred
- **Operator note:** ___________________

### Item 4 — Midpoint drag (T4 hardware verification)

- **Behavior:** Drag a `.projection-grid-handle` (squish-bar / midpoint).
- **Expected:** The corresponding row or column shifts (squish behavior).
  Stream reflects. Squish bars should be visible *inside* the viewport
  even with identity grid corners (M4 inward-flip placement).
- status: deferred
- **Operator note:** ___________________

### Item 5 — Rotation (T5 hardware verification)

- **Behavior:** Drag the rotation handle (`[data-handle-role="rotate"]`) in
  a small arc.
- **Expected:** Whole grid rotates around its centroid. Stream reflects.
  Points stay clamped to [0,1] (M4 validator-clamp).
- status: deferred
- **Operator note:** ___________________

### Item 6 — Image-pan (T6 hardware verification)

- **Behavior:** Click in a free area between handles and drag.
- **Expected:** Whole grid translates. Stream reflects.
- status: deferred
- **Operator note:** ___________________

### Item 7 — Right-click menu (T7 hardware verification)

- **Behavior:** Right-click on a line (or near an intersection vertex).
  Menu `.board-context-menu` appears with at least 2 items.
- **Expected:** Menu visible at Pi click coordinates. Click "Add line
  through this point" → stream updates immediately (Q3 LOCK; no need for
  follow-up drag to trigger broadcast). Same for "Delete line".
- status: deferred
- **Operator note:** ___________________

### Item 8 — CTRL+Z undo (T8 hardware verification)

- **Behavior:** Drag a handle. Press CTRL+Z.
- **Expected:** Handle returns to pre-drag position. Stream reverts. Q5
  LOCK ensures up to 1000 undo entries retained (FIFO eviction at higher
  counts).
- status: deferred
- **Operator note:** ___________________

### Item 9 — Dirty-flag propagation (T9 hardware verification)

- **Behavior:** With dashboard `/` open on a second device: drag any
  handle on Pi `/output/`.
- **Expected:** Dashboard's `#align-mode-dirty-hint` becomes visible
  (hidden=false) within ~1-2 seconds. Server stdout shows
  `[align-mode-dirty] received dirty=true from=http-post`.
- status: deferred
- **Operator note:** ___________________

### Item 10 — Pi browser overlay-pointer-events quirk (RESEARCH §8 threat T-DOS-1)

- **Behavior:** With align-mode ON, drag handles for ~30 seconds continuously.
- **Expected:** No accidental finger fall-through to the Pi OS. No
  Pi-side scroll, no zoom gesture, no Chromium chrome menu. The overlay
  `#ssr-input-overlay` is permanently `pointer-events:none` (D-02 (a) JS-
  toggled in receiver-bootstrap.js — NOT the Phase 35-A CSS `!important`
  workaround, which was removed).
- status: deferred
- **Operator note:** ___________________

### Item 11 — Connection stability under sustained drag (D-08 hardware confirm)

- **Behavior:** Drag handles for 60 seconds continuously.
- **Expected:** WebRTC connection stays stable; no reconnect; no
  frame-stale warning in dashboard. Server logs show no
  `[render-host-down]` or `[reconnect]` events.
- status: deferred
- **Operator note:** ___________________

### Item 12 — VAAPI default-disabled preserved (carry-forward)

- **Behavior:** Boot Pi `/output/` without `SSR_ENABLE_VAAPI=1` env var.
- **Expected:** Server logs show "VAAPI disabled" or equivalent.
  No GL-flag-related hangs. Phase 34 hotfix h2 (`hasVaapiEnabled`-gated
  GL flags) intact.
- status: deferred
- **Operator note:** ___________________

---

## Dashboard Regression Check

### Item 13 — Dashboard align-mode UX (separate browser tab on `/`)

Phase 36 M3 explicitly deferred (path-(b)) the dashboard `runtime-orchestration.js`
migration to `bootHandleUi`. This means the dashboard still uses the implicit
two-call init pattern (`MAPPING.init` at line 472 + `POLYGON_EDITOR.init` at
line ~1953). The dashboard align-mode E2E parity rail is RED in automation
(`test_phase36_dashboard_parity.py /` variants and `test_phase35_dashboard_alignmode.py`),
but this is the deferred work, NOT a Phase 36 regression. The dashboard's
operator-facing UX should remain byte-identical to Phase 35.

- **Behavior:** On a separate device, open the dashboard `/`. Toggle
  align-mode ON. Drag corner handles. Right-click → Add line. CTRL+Z. Save
  profile. Discard. ESC.
- **Expected:** All dashboard align-mode interactions work exactly as
  pre-Phase 36 (no regression). Dashboard's existing two-call init delivers
  byte-identical functionality.
- **Pi-relevant cross-tab interactions:**
  - Drag on Pi `/output/` → dashboard `#align-mode-dirty-hint` flips visible
    (Item 9 re-verification).
  - Drag on dashboard → Pi `/output/` stream updates (existing pre-Phase-36
    behavior).
- status: deferred
- **Operator note:** ___________________

---

## M3-LATE Path-b Deferral

The dashboard's `runtime-orchestration.js` still uses the implicit two-call
`MAPPING.init` + `POLYGON_EDITOR.init` pattern (lines 472 and ~1953). The
`bootHandleUi` entry point exists and is wired into `/output/` via
`output-align-mode-loader.js` (A2), but the dashboard has NOT yet been
migrated to call `bootHandleUi`. This was explicitly authorized by the M3
plan's path-(b) escape because:

1. The two init call sites are separated by ~1500 LOC of state construction,
   profile loading, and dep-bag building.
2. A single `bootHandleUi` call would require either re-ordering ~1500 LOC
   ahead of `bootHandleUi`, or splitting `bootHandleUi` so it can be invoked
   piecewise — both significant refactor with high regression risk.
3. The `/output/` thin path is fully functional (T1-T10 all GREEN); the
   dashboard's existing two-call init delivers byte-identical functionality.

Status: **deferred to Phase 36.1 follow-up.** Tracked in
`.planning/phases/phase-36/deferred-items.md` (D1 + D2) and recorded in
ROADMAP.md as `Phase 36.1 — Dashboard runtime-orchestration migration to
bootHandleUi` (PLANNING status, trigger 2026-05-10).

When Phase 36.1 closes:
- Dashboard's `runtime-orchestration.js` uses `bootHandleUi(...)` at a
  single call site.
- `test_phase35_dashboard_alignmode.py` flips GREEN.
- `test_phase36_dashboard_parity.py` `/` variants (T2/T7/T8) flip GREEN.
- Dashboard align-mode UX remains visually + functionally identical to
  pre-migration.

---

## Sign-off

When all 13 items above are operator-verified OK on Pi hardware:

```bash
# 1. Update each item's "Operator note" with date + OK or regression note
# 2. Update frontmatter: status: deferred → status: confirmed
# 3. Tag the repo: git tag phase-36-end (or phase-36-end-pi-confirmed if
#    keeping the carry-forward tag distinct)
# 4. Update ROADMAP.md Phase 36 status: PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT
#    → CLOSED-OPERATOR-VERIFIED
```

---

## Deferred Items (post-Phase-36 candidates)

Per CONTEXT.md `## Deferred Ideas` and `.planning/phases/phase-36/deferred-items.md`:

- **Phase 36.1 — Dashboard `runtime-orchestration.js` migration to `bootHandleUi`** (path-(b) deferral; M3-LATE; closes the 3 RED `/` dashboard parity variants + the Phase 35 W0 dashboard regression test).
- **handle-ui internal modularization** — Q4 LOCKED: NOT split in Phase 36; future cleanup phase candidate.
- **Server-side undo log** — D-04 lock is client-local; future phase if dashboard wants cross-tab undo coordination.
- **Right-click forwarding to dashboard** — D-05 lock is local rendering; future phase if operator workflow needs keyboard-only or dashboard-only menu visibility.
- **Phase 37 transformation banding fix** — separate phase (Phase 37 already on ROADMAP, DEFERRED).
- **Animation-engine refactor** — multi-phase effort.
- **Pixel-diff visual regression suite** — rejected in Phase 34; could revisit if banding-class regressions become recurring.

---

*Phase: 36-comprehensive-alignmode-thin-output · Human/Pi UAT · created 2026-05-10 · D-10 carry-forward pattern from Phase 33/34/35*
