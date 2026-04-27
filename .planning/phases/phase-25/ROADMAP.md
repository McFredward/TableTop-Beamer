# Phase 25 — Bug & Polish ROADMAP

Source: `.planning/phases/phase-25/BACKLOG.md` (12 user-reported
items captured at end of Phase 24).

Phase 24 left the codebase byte-stable with a clean module map
(`docs/ARCHITECTURE.md`). Phase 25 addresses real behaviour
issues. **Behaviour CAN change here** — that is the point — but
the wire-protocol and storage-key invariants documented in
`.planning/phases/phase-24/SUMMARY.md` remain LOCKED.

## Hard rules

1. **Wire protocol locked:** the live-sync command literals
   listed in Phase 24 SUMMARY may not be renamed, reordered, or
   removed. Internal cluster overlay logic can change as long as
   the over-the-wire payload shape stays compatible.
2. **Storage keys locked:** the 13 `localStorage` keys + JSON
   schema literals from Phase 24 SUMMARY may not change. Adding
   new optional fields is fine; renaming or repurposing is not.
3. **Smoke test after every wave.** Each wave ends with a
   manual checklist run (boards, animations, cluster, /output/,
   live-sync, themes).
4. **One bug per commit.** Each backlog item lands as a single
   atomic commit (or a tiny series if mechanically necessary)
   so any item can be reverted in isolation.

## Wave plan

### Wave 1 — UX polish (low-risk surface fixes)
Items: 1, 2, 5, 6, 7, 11

- **1** Cluster fake-room legibility in white theme — theme CSS
  override so the cluster fake-room visual is theme-independent.
- **2** Version display — add a `VERSION` constant + small
  unobtrusive corner display + versioning policy comment.
- **5** Cluster fake-rooms only on Dashboard view — gate
  `renderClusterPads` (and any cluster fake-room visibility
  hook) on the active view being Dashboard.
- **6** Room Editor: hide-name toggle — add `nameVisible: bool`
  to room model (default true → no behaviour change for
  existing rooms), wire toggle in Room Editor, honour at render.
- **7** Drop secondary delete-confirm in Animation Editor —
  remove the redundant `confirm()` call; dirty-flag prompt
  remains for dirty state.
- **11** Outside Sandstorm icon picker registry — audit all
  default-animation icons; add any missing ones to the picker
  so every animation's icon is selectable from a fresh state.

**Acceptance:** all 6 items individually verified; no regressions
in light/dark/white themes; live-sync unchanged.

### Wave 2 — State propagation (toggle refresh)
Item: 3

- **3** Toggle-mode tile refresh after board switch / animation
  edit — find the tap-action toggle list builder, identify the
  trigger events it currently listens to, ensure board-switch
  and animation-save fire that refresh.

**Acceptance:** edit an animation while in Toggle mode → tile
state reflects the edit immediately. Switch boards while in
Toggle mode → tiles repopulate immediately.

### Wave 3 — Animation engine parity
Items: 4, 8, 10

- **4** Cluster fake-room overlay parity — bring cluster
  composite path to the same `globalCompositeOperation =
  "lighter"` (or whatever Phase 12-1 established) used for
  normal rooms when concurrency ≥ 2.
- **8** Space animation speed parity Dashboard / `/output/` /
  preview — find the Space animation tick driver. Likely
  candidates: preview uses a different `dt` source, or the main
  draw loop multiplies by something the preview path doesn't.
- **10** Power Outage speed parameter — locate the Power Outage
  animation handler; ensure it consumes the `speed` parameter
  (likely a hardcoded interval).

**Acceptance:** Items 4 and 8 verified visually side-by-side
across views. Item 10 verified by changing speed slider and
observing visible cadence change.

### Wave 4 — Render fidelity (overlap intensity)
Item: 12

- **12** Solid-colour intensity at room overlap — investigate
  current composite mode for solid-colour rooms. Likely the
  default `source-over` accumulates alpha at overlap. Switch
  to a mode (e.g. drawing all solid-colour regions to an offscreen
  canvas first with `lighter` capped, or pre-unioning room masks)
  that yields a smooth blend.

**Acceptance:** two overlapping rooms with same solid colour
show no intensity bump at overlap. Two overlapping rooms with
different solid colours blend smoothly. Verified on Dashboard
and `/output/`.

### Wave 5 — Performance (animation-start stutter)
Item: 9

- **9** Brief stutter on animation start — profile the start
  pipeline on mobile (Chrome remote DevTools or perf.now()
  instrumentation). Identify the synchronous stall (asset
  decode, JSON parse, layout thrash, or localStorage write are
  all candidates per BACKLOG triage). Decouple via async/idle
  callback / pre-warm cache / move off main thread as
  appropriate.

**Acceptance:** no measurable main-thread stall on animation
start (≤ one frame of pause), verified on mobile.

### Wave 6 — Closure
- Phase 25 SUMMARY.md
- Bump `VERSION` (whatever scheme is chosen in W1.2)
- Tag `phase-25-end`

## Workflow

For each wave:
1. **Investigate** the affected files with `Explore` /
   `grep` — confirm the BACKLOG's "Surface area" hints are correct.
2. **Plan** the fix (in conversation, not always a written PLAN.md
   for tiny items — only for non-trivial waves).
3. **Implement** with one atomic commit per item.
4. **Test** — start `node server.mjs`, exercise the affected
   flow in the browser, check console for new errors.
5. **Record** the deltas in a per-wave INVENTORY.md (commit
   hashes + acceptance evidence).

## Tags

- `phase-25-w1-start` — pre-W1 marker
- (per-wave start tags optional, keep if needed for revert)
- `phase-25-end` — phase closure
