---
phase: phase-11
plan: 11-HF3
subsystem: runtime-sync
tags: [global-runtime, audio-toggle, duration-fix, dashboard]
requires:
  - phase: phase-11
    provides: plan 11-HF2 runtime recovery
provides:
  - full ~4s duration for global one-shot animations on /output/final
  - per-trigger audio toggle ("Play sound") in dashboard global controls
  - synchronous audio/loop selection in trigger payload
affects: [server-live-mutations, runtime-hydration, ui-dashboard]
tech-stack:
  added: []
  patterns: [per-trigger deterministic audio choice, epoch-preserving duration sync]
key-files:
  created:
    - debug/p11-hf3-t1-global-oneshot-duration-red.mjs
    - debug/p11-hf3-t4-sync-audio-loop-payload-pass.mjs
  modified:
    - index.html
    - src/app/runtime/runtime-orchestration.js
key-decisions:
  - "Global one-shot duration is strictly bounded to 4s (GLOBAL_ONE_SHOT_DURATION_SEC = 4)."
  - "Per-trigger audio choice is wired directly into createAnimation's soundVolume, ensuring immediate sync with loop choice across all clients including /output/final."
  - "Audio toggle UI is rendered alongside Loop Until Stopped in the dashboard global trigger section."
duration: 10min
completed: 2026-04-05
---

# Phase 11 Plan HF3: Global 1s-Cancellation Fix + Dashboard Audio Toggle Summary

**Global animations now correctly play for their full 4s duration on /output/final, and dashboard per-trigger audio ("Play sound") semantics are deterministically synced.**

## Task Commits
1. `pending` — Fix 1s-cancellation and ensure 4s playback, add Play sound toggle, wire payload sync.

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None.

## Self-Check: PASSED
