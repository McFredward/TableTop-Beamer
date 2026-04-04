# Phase 10 Backlog (Generic Polygon Hydration Hardening + Operator Speed UI/UX)

## Planning Mode Note
- Plan 10-HF1 execution is PASS with evidence artifacts committed.
- Plan 10-HF2 closure is reopened: field runtime confirms the real-world symptom set is still active.
- Plan 10-HF3 is completed PASS (test-driven repro -> root-cause fix -> FAIL/PASS closure).
- Plan 10-HF4 is completed PASS with deterministic RED->GREEN evidence.
- Plan 10-HF5 is field-invalidated by concrete browser repro and remains historical context only.
- Plan 10-HF6 is historical PASS but field-invalidated by clean-local-storage profile-loss repro.
- Plan 10-HF7 is completed PASS with synchronized FAIL->PASS evidence.
- Plan 10-1 remains queued as next execute-ready wave.

## Epics
- Generic Polygon Hydration/Apply Reliability (Cross-Browser P0)
- Final Output Hydration/Render Browser Neutrality (P0)
- Imported Board Non-Regression Hardening (P0)
- HF3 Root-Cause Recovery via Failing Tests + Executable Diagnostics (P0)
- HF4 Runtime Module/Ownership/Ship-Clip Parity Hardening (P0)
- HF5 Multi-Play-Area Canonical Fallback Hardening (P0, field-invalidated)
- HF6 Multi-Area Retention + Browser/Surface Parity Hardening (P0)
- HF7 Clean-Start Board-Profile Retention Hardening (P0)
- Settings Information Architecture Sub-Tabs
- Quick Room Action Modes (Activate / Deactivate / Clear)
- Mobile One-Handed Speed Operations
- Deterministic Rapid-Action Safety + Evidence

## Story Mapping
- P10-HF1-S1 Reproduce and isolate root cause for board-specific `/output/final` blackout on `Nemesis Lockdown A` (outside `sandstorm.mp4`).
- P10-HF1-S2 Fix final-output render lifecycle so board/media-specific outside state cannot short-circuit composition to black.
- P10-HF1-S3 Enforce room+outside co-render contract on `/output/final` for all boards and outside asset types.
- P10-HF1-S4 Validate non-regression for sync invariants and existing controls (`stop`, `clear-all`, global toggles).
- P10-HF1-S5 Execute cross-board regression matrix with explicit mp4 outside-background board coverage.
- P10-HF1-S6 Synchronize all phase/global planning artifacts after HF1 PASS.
- P10-HF2-S1 Reproduce polygon-load/apply failures cross-browser for startup/reload/default-apply (`inside`/`outside` + `playAreas`).
- P10-HF2-S2 Implement canonical polygon schema normalization pipeline with legacy alias support and deterministic validation.
- P10-HF2-S3 Enforce explicit precedence: persisted board polygons win over defaults unless polygon data is missing/invalid.
- P10-HF2-S4 Remove silent default rectangle fallback from final-output hydration/render when valid board polygons exist.
- P10-HF2-S5 Harden `/output/final` to consume canonical polygon payload browser-neutrally (Chrome/Firefox desktop + mobile-class).
- P10-HF2-S6 Prove strict non-regression for imported boards (existing + newly imported sample boards).
- P10-HF2-S7 Execute all-browser regression matrix and capture PASS evidence.
- P10-HF2-S8 Synchronize all phase/global planning artifacts after HF2 PASS.
- P10-HF3-S1 Build reproducible failing tests for symptom A: Lockdown A polygons not applied in Firefox/mobile-class path.
- P10-HF3-S2 Build reproducible failing tests for symptom B: `apply global defaults` unexpectedly shows default polygons.
- P10-HF3-S3 Build reproducible failing tests for symptom C: `/output/final` black/fallback rectangle despite valid polygons.
- P10-HF3-S4 Add executable lifecycle diagnostics for startup/load/apply-defaults/reload assertions.
- P10-HF3-S5 Add board-switch + final-output render contract assertions.
- P10-HF3-S6 Add canonical polygon source-selection assertions.
- P10-HF3-S7 Implement generic root-cause fix driven by failing tests and diagnostics.
- P10-HF3-S8 Re-run full suite and capture explicit FAIL->PASS evidence.
- P10-HF3-S9 Validate imported-board and browser-matrix non-regression remains PASS after fix.
- P10-HF3-S10 Synchronize all phase/global planning artifacts after HF3 PASS.
- P10-HF4-S1 Reproduce `domain-modules-missing` as deterministic failing tests for `TT_BEAMER_RUNTIME_PANELS` global exposure/load-order.
- P10-HF4-S2 Add executable diagnostics for runtime panel module binding lifecycle and global exposure contract.
- P10-HF4-S3 Root-cause and fix runtime panel exposure/load-order path generically (browser-neutral, no board-specific branch).
- P10-HF4-S4 Reproduce `settings-ownership-violation` when controls `#outside-mode`/`#outside-direction` are conditionally unmounted.
- P10-HF4-S5 Harden settings ownership checks to be applicability-aware (mounted+required only) while preserving strict enforcement.
- P10-HF4-S6 Reproduce `ship-clip-regression-violation` cases (invalid polygons accepted + valid multi-play-area/legacy states rejected).
- P10-HF4-S7 Correct ship-clip regression checker for canonical+legacy browser-neutral validation parity.
- P10-HF4-S8 Add Firefox/Chrome executable diagnostics and parity matrix for HF4 scenarios.
- P10-HF4-S9 Enforce canonical-data-first final-output path: no invalid-default fallback when valid canonical polygons exist.
- P10-HF4-S10 Capture explicit FAIL->PASS evidence and synchronize all phase/global planning artifacts after HF4 PASS.
- P10-HF6-S1 Build deterministic RED repro for `Nemesis Lockdown Board A`: Chrome renders `Play Area 1` + `Bunker`; Firefox/mobile-class renders only `Play Area 1`.
- P10-HF6-S2 Add executable diagnostics to trace canonical source merge lineage (`saved profile` vs `defaults` vs `imported board payload`) and isolate first entry drop.
- P10-HF6-S3 Build deterministic RED repro where fallback/default area replaces valid multi-area subset payloads.
- P10-HF6-S4 Add explicit browser assertions for per-board `areaCount` parity (Chrome/Firefox/mobile-class Chrome).
- P10-HF6-S5 Add explicit browser assertions for per-board canonical `areaIdSet` parity (Chrome/Firefox/mobile-class Chrome).
- P10-HF6-S6 Enforce shared canonical play-area set contract between control-view and `/output/final`.
- P10-HF6-S7 Implement generic root-cause fix in merge/resolver path to retain deterministic multi-area entries and block invalid fallback replacement.
- P10-HF6-S8 Execute browser parity matrix for Firefox + Chrome desktop + mobile-class Chrome on single/multi-area boards.
- P10-HF6-S9 Execute imported-board + multi-area strict non-regression matrix across startup/reload/default-apply/board-switch/final-output.
- P10-HF6-S10 Capture explicit FAIL->PASS evidence and synchronize all phase/global planning artifacts after HF6 PASS.
- P10-HF7-S1 Build deterministic RED repro for clean-local-storage startup showing missing play-area entries and default-play-area fallback.
- P10-HF7-S2 Add executable diagnostics that prove board-profile candidate extraction path is coupled to loaded board catalog IDs.
- P10-HF7-S3 Build deterministic RED repro for migration drop of unknown board keys (imported/multi-area keys absent from current loaded list).
- P10-HF7-S4 Implement extraction fix so board-profile candidates are collected independently of loaded board IDs.
- P10-HF7-S5 Implement migration fix to retain unknown board keys and their play-area profiles.
- P10-HF7-S6 Add lifecycle assertions for deterministic multi-play-area retention across startup/default-apply/reload.
- P10-HF7-S7 Execute browser parity + imported/multi-area strict regression matrix including clean-start lanes.
- P10-HF7-S8 Capture explicit FAIL->PASS evidence and synchronize all phase/global planning artifacts after HF7 PASS.
- P10-S1 Define Settings sub-tab taxonomy and group existing controls by operator intent.
- P10-S2 Implement Settings sub-tab navigation with stable state retention across tab switches.
- P10-S3 Add shared quick-mode state machine with explicit status, cancel path, and conflict guards.
- P10-S4 Implement quick activation mode with selected animation lock and sequential room apply.
- P10-S5 Implement quick deactivation mode with selected animation lock and sequential room removal.
- P10-S6 Implement quick clear mode to remove all animations from tapped/clicked rooms.
- P10-S7 Add mobile sticky action rail and large one-hand controls for rapid reaction.
- P10-S8 Improve mobile overview so operator can keep board context while acting quickly.
- P10-S9 Add telemetry/log traces for rapid sequential operations and mode transitions.
- P10-S10 Validate sync determinism and idempotency under burst interaction on desktop/mobile.
- P10-S11 Run full non-regression for stop/clear-all/global behavior and `/output/final` stability.
- P10-S12 Synchronize all phase/global planning artifacts after verification PASS.

## Prioritized Execution Wave (P0) - Plan 10-HF7 execute-ready
- Story P10-HF7-S1 + P10-HF7-S2 + P10-HF7-S3.
  - Goal: deterministic RED repro + diagnostics for clean-start profile-loss and migration key-drop root cause.
- Story P10-HF7-S4 + P10-HF7-S5 + P10-HF7-S6.
  - Goal: extraction/migration hardening with deterministic multi-area lifecycle retention.
- Story P10-HF7-S7.
  - Goal: all-browser parity and imported/multi-area strict non-regression PASS with clean-start coverage.
- Story P10-HF7-S8.
  - Goal: explicit FAIL->PASS proof and synchronized phase/global trackers.

## Field-Invalidated Wave (P0) - Plan 10-HF5
- Story P10-HF5-S1..P10-HF5-S9.
  - Outcome: historical PASS evidence exists, but new concrete repro reopens blocker (Firefox/mobile-class drops `Bunker` while Chrome keeps both areas).

## Previously Closed Wave (P0) - Plan 10-HF4
- Story P10-HF4-S1..P10-HF4-S10.
  - Outcome: PASS; remains baseline-valid but does not close new multi-play-area blocker.

## Previously Closed Wave (P0) - Plan 10-HF1
- Story P10-HF1-S1.
  - Goal: reproducible, bounded root-cause map for board-specific final blackout.
- Story P10-HF1-S2 + P10-HF1-S3.
  - Goal: final composition path stays active and renders room+outside on all boards.
- Story P10-HF1-S4 + P10-HF1-S5.
  - Goal: sync/control non-regression and all-board PASS evidence.
- Story P10-HF1-S6.
  - Goal: phase/global trackers are synchronized at wave closure.

## Reopened Wave (P0) - Plan 10-HF2 (field-invalidated)
- Story P10-HF2-S1..P10-HF2-S8.
  - Outcome: provisional PASS evidence exists, but real-world runtime disproves closure and mandates HF3.

## Prioritized Execution Wave (P0) - Plan 10-1
- Story P10-S1 + P10-S2.
  - Goal: Settings sub-tabs are logically grouped and fast to navigate.
- Story P10-S3.
  - Goal: one deterministic quick-mode state machine for all speed operations.
- Story P10-S4 + P10-S5 + P10-S6.
  - Goal: activation/deactivation/clear sequential room tap flows are usable and safe.
- Story P10-S7 + P10-S8.
  - Goal: mobile one-handed operation and overview are materially faster.
- Story P10-S9 + P10-S10 + P10-S11.
  - Goal: deterministic rapid-operation behavior is proven with non-regression evidence.
- Story P10-S12.
  - Goal: phase and global trackers are synchronized at closure.

## Follow-up Waves
- Plan 10-1: speed-first operator UX baseline (sub-tabs + quick activation/deactivation/clear + mobile one-hand flow) after HF7 PASS.
- Plan 10-2: UX polish and performance micro-optimizations from field feedback.
- Plan 10-3: optional operator presets for quick-mode templates if needed after live validation.
