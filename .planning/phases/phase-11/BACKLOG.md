# Phase 11 Backlog (Operator UX Acceleration)

## Epics
- Settings IA Sub-Tabs and Logical Grouping [P0]
- Rapid Activation Mode (Sequential Room Taps/Clicks) [P0]
- Rapid Deactivation Mode (Sequential Room Taps/Clicks) [P0]
- General Clear Mode (Sequential Room Taps/Clicks) [P0]
- Mobile-First One-Hand Fast Operation [P0]
- Determinism/Safety Non-Regression [P0]

## Story Mapping
- P11-S1 Define settings grouping model and sub-tab IA map.
- P11-S2 Implement settings sub-tab shell with stable tab memory and draft retention.
- P11-S3 Implement shared quick-mode domain state (`off`/`activate`/`deactivate`/`clear`).
- P11-S4 Implement rapid activation flow for sequential room taps/clicks.
- P11-S5 Implement rapid deactivation flow for sequential room taps/clicks.
- P11-S6 Implement rapid clear flow removing all animations from tapped rooms.
- P11-S7 Add mode-switch conflict guards and inflight overlap arbitration.
- P11-S8 Add explicit operator feedback surface for quick-mode action success/failure/timeout.
- P11-S9 Implement mobile-first sticky action rail and thumb-zone layout.
- P11-S10 Add board-overview safeguards during burst operations (no accidental visual loss/occlusion).
- P11-S11 Execute desktop/mobile rapid-operation regression and non-regression matrix.
- P11-S12 Synchronize phase and global planning trackers.

## Settings IA map (Plan 11-1 binding)
- `Board & Geometry`: board catalog/output, zoom, hitarea, room/cluster management, polygon/play-area editors.
- `Animations`: room/inside/outside animation definition editors.
- `System & Performance`: global speed, audio + sound mapping, mobile performance snapshots, MP4 performance controls.
- Contract: one active settings sub-tab at a time, explicit tab highlight, and stable tab memory across view toggles/reload.

## Prioritized Execution Wave (P0) - Plan 11-1 (execute-ready now)
- Story P11-S1 + P11-S2.
  - Goal: settings become faster to navigate via logical sub-tabs without state loss.
- Story P11-S3 + P11-S4 + P11-S5 + P11-S6.
  - Goal: deterministic quick-mode engine with rapid sequential activate/deactivate/clear room flows.
- Story P11-S7 + P11-S8.
  - Goal: safe mode transitions and explicit action feedback (no silent no-op).
- Story P11-S9 + P11-S10.
  - Goal: mobile one-handed speed path that keeps board context stable while operating.
- Story P11-S11 + P11-S12.
  - Goal: matrix PASS evidence and full artifact sync closure.

## Follow-up Waves
- Plan 11-2: ergonomics polish after field validation (tap target tuning, haptic/audio cue options, minor IA refinements).
- Plan 11-3: optional operator presets/macros if still needed after rapid-mode adoption.
