# Phase 9 Plan (Replanned after mandatory video-performance P0 feedback)

## Acceptance Correction
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed as foundation (monolith reduction + modular seams).
- Plan 9-HF2 remains completed (lifecycle no-replay + low-end hardening baseline).
- New mandatory execution wave is Plan 9-HF3 and supersedes 9-2 as immediate next step.

## Mandatory P0 Feedback (binding)
1. Video-based animations currently cause severe stalls on mobile and Raspberry Pi (`/output/final` beamer path included).
2. Smooth animation continuity must hold while videos are active.
3. `/output/final` fluidity is top priority and must be protected under load.
4. Control views (mobile/PC) must remain responsive without lifecycle/sync regressions.

## Target State
Phase 9 now closes only when video-heavy workloads run smoothly and deterministically across Raspberry Pi beamer and controller devices. The runtime must optimize decode/render scheduling, buffering warmup, and draw strategy while prioritizing `/output/final`, applying adaptive quality/load shedding on weak hardware, and preserving sync/lifecycle/stop determinism.

## Binding Architecture Decisions
- Preserve HF1 module boundaries; performance fixes land in runtime/media/sync modules, not in `src/app.js`.
- Preserve HF2 lifecycle correctness and no-replay semantics as non-negotiable invariants.
- Introduce explicit video pipeline ownership: preload/warmup -> decode cadence -> draw arbitration -> teardown.
- Prioritize `/output/final` render budget over non-critical control-view visuals when pressure is detected.
- Adaptive degradation must be deterministic, bounded, and limited to visual quality knobs (never sync/lifecycle semantics).
- Hard performance gates are measured with reproducible video-heavy scenarios and fixed thresholds.

## Scope (9-HF3)
- Optimize video render path (decode/render scheduling, buffering/warmup, draw strategy) for mobile + Raspberry Pi.
- Add load-priority arbitration that protects `/output/final` frame continuity under contention.
- Add adaptive quality/load-shedding ladder for weak devices (resolution/effect caps/update cadence controls).
- Keep control views responsive while final-output priority is enforced.
- Add strict video-heavy performance regression suite with measurable limits.
- Verify no regression for sync ordering/version/idempotency, lifecycle semantics, and stop determinism.

## Out of Scope
- New operator-facing features or UI redesign.
- Protocol redesign beyond what is required for deterministic priority signaling.
- Non-measurable cosmetic tuning without performance impact.
- Relaxing deterministic guarantees to gain temporary FPS.

## Prioritized Next Execution Wave (Plan 9-HF3, execute-ready, hard-gated)
1. Instrument and profile current video-heavy bottlenecks on Raspberry/mobile and isolate decode/render contention hotspots.
2. Implement video pipeline optimization (decode scheduling, warmup buffering, draw cadence arbitration).
3. Implement final-output-first load prioritization and protect `/output/final` against controller-side spikes.
4. Add adaptive quality/load-shedding policy for weak devices with deterministic pressure levels + recovery hysteresis.
5. Validate control-view responsiveness parity under active video playback.
6. Run hard regression matrix (video-heavy stress/soak) with explicit thresholds and PASS evidence.
7. Confirm no regression in HF2 lifecycle/no-replay, sync determinism, and stop semantics.
8. Close only after full artifact synchronization and explicit gate PASS.

## Milestones
1. M1 Video Hotspot Baseline: deterministic profiling identifies bottlenecks for decode/render path.
2. M2 Video Render Path Hardening: scheduling, warmup, and draw strategy reduce stall frequency and magnitude.
3. M3 Final-Output Priority: `/output/final` remains fluid under mixed device load.
4. M4 Adaptive Weak-Device Stability: Raspberry/mobile quality ladder prevents collapse and recovers cleanly.
5. M5 Control-View Responsiveness: mobile/PC controls remain fluid during video-heavy playback.
6. M6 Determinism Preservation: sync/lifecycle/stop invariants remain PASS under all hardening paths.
7. M7 Evidence Closure: video-heavy regression matrix is PASS with reproducible artifacts.

## Regression/Evidence Matrix Policy
- Video-heavy final soak: sustained mixed triggers with multiple active video animations on Raspberry Pi beamer path.
- Mobile control stress: concurrent control interactions while final output runs video-heavy scenes.
- Render contention matrix: decode spikes, seek/restart cycles, and simultaneous start/stop bursts.
- Load-shedding ladder matrix: pressure-level escalation + recovery behavior is deterministic and bounded.
- HF2 non-regression matrix: expired one-shot no-replay and terminal lifecycle semantics remain PASS.
- Sync/stop matrix: ordering/version/idempotent apply and explicit stop determinism remain PASS.

## Definition of Done
- Video-based animation playback is smooth and stable on target weak devices (mobile + Raspberry Pi).
- `/output/final` remains continuously fluid under video-heavy stress and has strict priority under contention.
- Control views remain responsive during active video playback.
- Adaptive load-shedding engages/recoveries deterministically without visible lifecycle/sync drift.
- HF2 lifecycle/no-replay behavior remains intact with no regressions.
- Deterministic sync and stop semantics remain intact.
- Regression/evidence matrix is PASS and phase/global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 remains completed foundation (`src/app.js`: 12163 -> 28 lines).
- Plan 9-HF2 remains completed baseline for lifecycle no-replay and low-end hardening.
- Plan 9-HF3 is completed with explicit PASS evidence (T1..T9 artifacts); Plan 9-2 is unblocked as next execution wave.
