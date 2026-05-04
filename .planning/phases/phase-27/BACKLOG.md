# Phase 27 — Align Mode Refinement

Source: User feedback after a multi-user testing session
(2026-05-04). All items below are direct user requirements from that
session. Phase scope is bounded to the align-mode editor; no other
runtime surfaces are in scope.

## Backlog items

### B1 — Outer edge lines must behave identically to inner lines

The outermost rectangle edges of the align grid currently behave
differently from the interior horizontal/vertical lines (different
drag affordances, different snapping rules, different visual
feedback). Users reported this as confusing. Make the behavior
identical for outer and inner lines — same handles, same drag, same
deletion menu, same selection visuals.

### B2 — Outer points must be deformable into a trapezoid

Currently the four outer corner points are constrained such that the
outermost grid stays a rectangle. Remove this constraint so users can
drag the outer corners independently, producing a trapezoid (or any
quadrilateral) for keystone correction. The interior grid mesh should
adapt to the new outer shape.

### B3 — Show currently loaded profile during align mode editing

Display, somewhere prominent in the align-mode UI, which profile is
currently loaded. When unsaved changes exist or no profile is loaded,
display "unsaved" (or equivalent indicator) instead of a profile name.

### B4 — Dirty-flag indicator + save / discard prompt

Whenever the loaded profile has been modified (any line moved, any
point dragged, any line added or deleted) the UI must clearly mark
the profile as dirty (visual flag + textual hint). The user must have
the option to **save** the changes (overwrites the loaded profile) or
**discard** them (reverts to the loaded profile's persisted state).

### B5 — Multi-device align-mode safety: dirty profile blocks remote
disable

When the dirty flag is set on one device, no other device may turn
align mode off until the dirty state is resolved (saved or discarded).
The other device's UI shows a hint that there are unsaved changes on
[device X] which must first be saved or discarded.

Open question for planning: how is "device X" identified to the
operator? (session id, IP, friendly name?) — needs decision in the
discuss-phase.

### B6 — New default layout: 80% rectangle + single mid lines

Currently the default align grid fills the entire screen and contains
many interior lines. Change the default to:
- Outer rectangle: ~80% of screen (centered, equal margins on all
  sides).
- Interior lines: exactly **one** horizontal line through the middle
  + **one** vertical line through the middle (no other interior
  subdivisions).

This is the new default applied to fresh profiles. Existing profiles
keep their stored geometry.

### B7 — Right-click menu rules (correctness audit + fixes)

The right-click context menu in align mode must show options
according to where the click landed:

| Right-click target | Menu options |
|--------------------|--------------|
| On a line          | "Delete line" + "Add line through this point" (or similar create options) |
| On a point         | "Delete line" (the line containing this point) **plus** "Delete point" |
| On empty area      | Only "Add new line" options — **no** delete options |

Also verify line deletion actually works (audit reported as part of
the user request — implies a current bug). Specifically:
- Right-click on a line → menu appears → "Delete line" → line is
  removed from the grid AND the persisted profile.
- The same flow on a point should expose both options without
  ambiguity (label them clearly so the user knows which acts on the
  whole line vs only the single point).
- Right-click on truly-empty canvas (not on a line, not on a point)
  must NOT show any "Delete X" options.

### B8 — Verify line deletion correctness end-to-end (covered by B7)

Already implied by B7's "verify line deletion works" — kept as a
separate UAT item so the verification harness has its own checkbox.

## Discuss-phase open questions

- Device identification for B5 ("unsaved changes on device X").
- Visual style of the dirty flag (badge? color change? text label?).
- Profile naming UX when saving from a dirty state — overwrite-only,
  or offer "save as new profile"?
- Trapezoid (B2) interaction with the existing GL mesh-warp grid: do
  we recompute the interior grid bilinearly from the new corners, or
  does the interior grid stay independent and the outer becomes
  visually trapezoidal-only?
- Should the new default layout (B6) replace existing default-fresh
  profiles in the running config, or only apply to profiles created
  after Phase 27 lands?

## Out of scope

- Any non-align-mode UI changes.
- Server-side schema changes beyond what's required for B5
  (multi-device dirty state).
- New projection-mapping features beyond the trapezoid corner
  release.
