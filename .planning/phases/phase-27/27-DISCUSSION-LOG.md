# Phase 27: Align Mode Refinement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or
> execution agents. Decisions are captured in 27-CONTEXT.md — this log
> preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 27 — Align Mode Refinement
**Areas discussed:** B2 trapezoid mesh, B3+B4 dirty-flag UX,
B5 multi-device save-gate, B6 default migration, B7 right-click
menu, B9 squish handles
**Source feedback:** User multi-user testing session 2026-05-04 +
this discuss-phase Q&A.

---

## B2 — Trapezoid corners (outer-corner remesh behavior)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto bilinear remesh | Dragging an outer corner bilinearly redistributes all interior points so the whole grid follows the trapezoid | |
| Local-only deformation | Outer corner behaves identically to interior intersection — only adjacent grid segments deform; interior layout preserved | ✓ |

**User's choice:** Local-only deformation (same as interior points).
**Notes:** "äußerten Punkte sollen sich so verhalten wie die inneren auch, also nicht automatisch das ganze board verzerren, sondern nur den entsprechenden Bereich." Drives D-01, D-02. Aligns with B1 edge-uniformity.

---

## B3 + B4 — Profile awareness + Dirty-flag UX

| Sub-question | User's choice |
|--------------|---------------|
| Where is the profile name shown? | Claude's discretion (recommended: align-mode toolbar chip) |
| Visual style of dirty flag | Claude's discretion (recommended: orange `●` prefix + warning color) |
| Save options | Claude's discretion (recommended: "Save" overwrite + "Save as new" secondary) |
| Discard confirmation | **Direct discard, no modal** |

**User's choice:** "Entscheide du, was du für die User am sinnvollsten hältst. Bei Klick auf Discard direkt verwerfen."
**Notes:** Discard-without-modal is firm. Everything else delegated to Claude. Recommended approach captured in D-03.

---

## B5 — Multi-device save-gate

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly-name registry | Per-device naming UI + per-device dirty state | |
| IP / browser-fingerprint identity | Auto-derived identity, displayed to other clients | |
| **Single-/output/ assumption** | At most one /output/ client; dashboard sees "unsaved changes on /output/" | ✓ |

**User's choice:** Single-/output/ assumption.
**Notes:** "So komplex brauchst du das gar nicht. Es geht mir nur um den align mode. Also sowas wie 'unsaved changes in /output' oder ähnlich. Eigentlich sollte nur ein Device (das mit dem Beamer connected ist) den /output/-Pfad offen haben." Drives D-04, D-05, D-06. Disconnect-grace-timer (10s) is Claude's discretion within this scope.

---

## B6 — Default 80%-layout migration

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate existing fresh profiles | Profiles still on the old default get re-defaulted on first load after Phase 27 lands | |
| **No migration** | Existing profiles untouched; new default applies only to newly-created profiles | ✓ |

**User's choice:** No migration.
**Notes:** "Keine Migration bestehender Profile sofern die noch kompatibel sind." Drives D-07 + D-08 (compatibility check on load).

---

## B7 — Right-click menu rules + grid model clarification

| Sub-question | User's choice |
|--------------|---------------|
| Are points deletable as a UI concept? | **No — only lines are deletable. Points are derived intersections.** |
| Outer (boundary) lines deletable? | **No.** Therefore outer corners cannot disappear (their lines are immutable). |
| Right-click on a line | "Delete this line" (greyed for outer lines) |
| Right-click on a point/intersection | "Delete vertical line" + "Delete horizontal line" (each greyed if its line is outer) |
| Right-click on empty area | Only "Add line" options — no delete |

**User's choice (verbatim):** "Wichtig: Nicht Punkte sind löschbar sondern die Linien (vertikal und horizontal), die Punkte entstehen dann nur automatisch durch die Überkreuzungen. Die äußeren Linien sollen nicht löschbar sein und damit auch nicht die äußersten Punkte."
**Notes:** This is the most consequential clarification of the discussion. Reframes the data model from "points are primary" to "lines are primary, points are intersections." Existing code already maps cleanly (`srcXs[]`, `srcYs[]`, `points[row][col]`). Drives D-09, D-10, D-11.

---

## B9 — Squish handles

| Sub-question | User's choice |
|--------------|---------------|
| How many bars and where? | **Four — one per outer side** (top/bottom/left/right) |
| Anchor during squish | **Opposite side fixed** (board does not translate) |
| Visual style | Claude's discretion (recommended: rectangular bar to differ from rotate buttons) |
| Position offset | Claude's discretion (recommended: same as rotate handles) |
| Trapezoid (B2) interaction | Claude's discretion (recommended: bars at edge midpoints + perpendicular-to-edge axis) |

**User's choice:** "Pro Seite eine (4 Stück). Beim Stauchen soll sich nicht das Board selber verschieben, d.h. der Anchor soll dann die gegenüberliegende Seite sein. Alles andere überlasse ich dir — entscheide immer was aus User-Perspektive am intuitivsten wäre."
**Notes:** Drives D-12, D-13. Visual + position + trapezoid handling captured as recommendations in D-14.

---

## Mechanical items resolved without discussion (handled by planner)

- **B1** Edge uniformity — implementation-only; no decision needed.
- **B7 right-click hit-test thresholds** — pixel tolerance values
  picked by planner (~6 px for line, ~10 px for intersection).
- **B8** Line-deletion end-to-end verification — captured as a UAT
  item, no discussion needed.

## Claude's Discretion

Aggregated from sub-questions delegated by the user:

- Profile-chip placement, dirty-flag visual style, save-button labels.
- Squish-bar visual style, position offset, trapezoid interaction.
- Disconnect-grace-timer duration for B5 (recommended 10 s).
- Right-click menu hit-test thresholds.

## Deferred Ideas

- Friendly-name device identity (revisit if multi-beamer support comes
  later).
- Symmetric-from-center squish mode (potential future Cmd-modifier).
- Save-as-new-profile UX polish beyond a basic name-input modal.
- Rotate-handles redesign — explicitly out of scope.
