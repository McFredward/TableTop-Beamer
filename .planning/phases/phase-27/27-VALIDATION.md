---
phase: 27
slug: align-mode-refinement
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-04
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 27 is pure UX refinement on an existing browser-only runtime
> with no test framework. Validation is manual acceptance testing.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — manual browser acceptance tests |
| **Config file** | N/A |
| **Quick run command** | Open browser → `/output/` and dashboard → toggle align mode → execute relevant B-item check |
| **Full suite command** | Walk the full B1..B9 acceptance checklist below in one session |
| **Estimated runtime** | ~10–15 minutes for full B1..B9 walkthrough |

---

## Sampling Rate

- **After every task commit:** Spot-check the specific B-item that the task addresses (≤ 1 minute).
- **After every plan wave:** Walk all B-items in that wave's scope.
- **Before phase verification:** Full B1..B9 walkthrough on dashboard + Pi /output/.
- **Max feedback latency:** Manual — bounded by tester click rate, not automation.

---

## Per-Task Verification Map

The planner will populate concrete task IDs in the `Task ID` column when
plans are written. Until then, this is the requirement→behavior map
that the planner uses to wire each task's `<acceptance_criteria>`.

| Backlog | Behavior | Test Type | Manual Acceptance Step | Status |
|---------|----------|-----------|------------------------|--------|
| B1 | Outer lines visually identical to inner lines | Visual | After align mode ON: all grid lines (incl. outer rectangle) render as `rgba(0,220,180,0.45)` teal — no red lines visible. | ⬜ pending |
| B1 | Outer line drag behaves as inner line drag | Interaction | Drag the top outer edge → ns-resize cursor; line moves; interior horizontal lines scale proportionally; behavior identical to inner-edge drag. | ⬜ pending |
| B2 | Outer corner draggable with local-only deformation | Interaction | Drag top-left corner → only that corner intersection moves; interior intersections do NOT auto-redistribute. | ⬜ pending |
| B3 | Profile name visible in align-mode toolbar | Visual | Load a profile → toolbar chip shows profile name. No profile loaded → toolbar chip shows "Unsaved". | ⬜ pending |
| B4 | Dirty flag triggers on any geometry mutation | Visual | Drag any handle → dirty dot `●` appears in profile chip; name color shifts to `--c-warn` amber; Save/Discard buttons activate. | ⬜ pending |
| B4 | Save overwrites loaded profile (clean state restored) | Function | In dirty state with profile loaded, click "Save profile" → profile JSON updates on disk; toolbar returns to clean state (no dot, no amber). | ⬜ pending |
| B4 | Save profile (no current profile) prompts for name | Function | In dirty state with no profile loaded, click "Save profile" → name-input modal opens with "Save profile" + "Keep editing". | ⬜ pending |
| B4 | "Save as new..." opens name-input modal | Function | Click secondary "Save as new..." → modal opens; on submit, new profile created. | ⬜ pending |
| B4 | Discard reverts immediately, no confirm modal | Function | In dirty state, click "Discard" → no confirm modal appears; grid reverts to last-saved profile geometry (or default if no profile loaded). | ⬜ pending |
| B5 | Dashboard align-mode toggle disabled when /output/ dirty | Function | Make /output/ dirty → on dashboard: align-mode toggle has `disabled` attribute; hint reads "Unsaved changes on /output/ — save or discard there first." | ⬜ pending |
| B5 | Dashboard toggle re-enables on /output/ save/discard | Function | /output/ saves or discards → within ~500 ms (live-sync fanout) dashboard toggle re-enables and hint disappears. | ⬜ pending |
| B5 | Grace timer clears dirty flag after /output/ disconnect | Function | /output/ is dirty → close /output/ tab/disconnect → wait 10 s → dashboard toggle re-enables. | ⬜ pending |
| B6 | New default layout is 80% rect + 1 H + 1 V mid-line | Visual | Reset grid (or create fresh profile) → grid is 3×3 at normalized positions `[0.10, 0.50, 0.90]` for both srcXs and srcYs. | ⬜ pending |
| B6 | Existing profiles NOT migrated | Function | Load a pre-Phase-27 profile → its geometry loads verbatim, NOT replaced by new default. | ⬜ pending |
| B7 | Right-click on empty canvas shows only Add options | Menu | Right-click in empty grid area (not near line/intersection) → menu shows "Add horizontal line here" + "Add vertical line here" only — NO delete options. | ⬜ pending |
| B7 | Right-click on inner line shows Delete + Add | Menu | Right-click ≤ 6 px from an inner line → menu shows "Delete this line" + "Add line through this point". | ⬜ pending |
| B7 | Right-click on inner intersection shows two delete options | Menu | Right-click ≤ 10 px from an inner intersection → menu shows "Delete vertical line" + "Delete horizontal line" + "Add line through this point". | ⬜ pending |
| B7 | Right-click on outer intersection greys out outer-line deletes | Menu | Right-click on top-left outer-corner intersection → menu shows NO "Delete horizontal line" or "Delete vertical line" entries (outer lines not deletable). | ⬜ pending |
| B8 | Line deletion end-to-end (canvas + persistence + undo) | Function | Right-click inner line → "Delete this line" → line disappears from canvas; press Ctrl+Z → line restores; reload page after explicit Save → deletion persisted. | ⬜ pending |
| B9 | Four squish bars visible outside outer rectangle | Visual | Align mode ON → four teal rectangular bars (60×10 px) visible outside the grid, one per outer side, at the same offset distance as rotate handles. | ⬜ pending |
| B9 | Top bar squish: opposite-side anchored | Interaction | Drag top bar downward by Δy → top edge moves down by Δy; bottom edge stays fixed (board does not translate); all interior horizontal lines compress proportionally. | ⬜ pending |
| B9 | Squish is undoable via existing undo stack | Function | Squish → Ctrl+Z → grid geometry restores to pre-squish positions. | ⬜ pending |
| B9 | Squish bars track trapezoid edges (post-B2) | Interaction | After dragging an outer corner so the outer is a trapezoid → the squish bar for that side sits at the midpoint of the (now non-axis-aligned) outer edge. | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] No test framework introduced — Phase 27 explicitly uses manual
  acceptance testing per Validation Architecture in 27-RESEARCH.md.
- [x] Existing browser-only runtime is the test environment.
- [x] Acceptance checklist (Per-Task Verification Map above) replaces
  automated test stubs.

*Wave 0 is trivially complete: no test infrastructure to install, no
fixtures to write. The phase gate is the manual checklist above.*

---

## Manual-Only Verifications

All B1..B9 verifications are manual. Documented above in the
Per-Task Verification Map. No additional manual verifications are
needed beyond that table.

---

## Validation Sign-Off

- [ ] All tasks reference one or more rows in the Per-Task
  Verification Map (planner enforces in PLAN.md
  `<acceptance_criteria>` blocks).
- [ ] Sampling continuity: every wave's plans collectively cover at
  least one row from the map.
- [ ] No automated test infrastructure required (manual-only phase
  by design).
- [ ] Feedback latency: human-bounded.
- [ ] `nyquist_compliant: false` is intentional — Phase 27 is a
  manual-test phase. Setting `nyquist_compliant: true` would be
  inaccurate.

**Approval:** pending — sign off after full B1..B9 walkthrough on
both dashboard and Pi /output/ at phase verification time.
