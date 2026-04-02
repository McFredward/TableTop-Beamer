# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1 is completed baseline, but not final closure.
- Plan 9-HF2 is completed baseline, but not final closure.
- New mandatory closure target is Plan 9-HF3 with hard gates below.

## Regression and Verification Strategy
- Video-performance-first: video-heavy workloads must remain smooth on Raspberry Pi and mobile.
- Final-output-first: `/output/final` fluidity has strict priority under load contention.
- Control-responsiveness-first: mobile/PC control views remain responsive while videos run.
- Determinism-first: sync ordering/version/idempotent apply and lifecycle/stop semantics remain unchanged.
- Evidence-first: every P0 HF3 item requires reproducible measurements and threshold-based PASS.

## Hard Gates (Plan 9-HF3, mandatory)
- G1 Video-RenderPath-Optimization-Gate: decode/render scheduling, warmup buffering, and draw strategy are optimized and validated in video-heavy scenarios.
- G2 Final-Output-Priority-Gate: `/output/final` preserves continuous fluid playback under mixed workload pressure.
- G3 Control-View-Responsiveness-Gate: control views remain operationally smooth while final-output priority is enforced.
- G4 Adaptive-WeakDevice-Gate: deterministic quality/load-shedding ladder stabilizes Raspberry/mobile under sustained pressure and recovers when pressure drops.
- G5 Deterministic-NonRegression-Gate: HF2 lifecycle no-replay semantics, sync determinism, and stop determinism remain PASS.
- G6 Strict-Performance-Matrix-Gate: full video-heavy matrix below is PASS with measured thresholds and evidence artifacts.

## Strict Performance Thresholds (HF3)
- Final Output Frame Stability (Raspberry + low-end mobile profile):
  - p95 frame time <= 33.3 ms in video-heavy soak.
  - no frame stall > 150 ms.
  - no sustained collapse below 24 FPS for > 3 seconds.
- Control View Responsiveness (mobile + PC controllers while videos active):
  - p95 input-to-visible-feedback <= 120 ms.
  - no interaction freeze window > 250 ms.
- Recovery behavior:
  - after pressure drop, quality ladder returns at least one level within 5 seconds.

## Strict Regression Matrix (Plan 9-HF3)
- Video-Heavy-Final-Soak-Test: sustained concurrent video animations on `/output/final` with frame pacing capture.
- Video-Decode-Contention-Test: simultaneous starts/seeks/restarts validate scheduling and warmup stability.
- Final-vs-Control-Priority-Test: control interaction bursts cannot destabilize final output pacing.
- Weak-Device-Adaptive-Ladder-Test: escalation/recovery of load-shedding levels is deterministic and bounded.
- Control-Responsiveness-Under-Video-Test: trigger/edit/stop controls stay responsive during active video playback.
- HF2-NoReplay-Regression-Test: expired one-shot events remain terminal on reload/reconnect (no replay).
- Deterministic-Sync-Under-Video-Load-Test: ordering/version/idempotent apply remains stable during video stress.
- Stop-Determinism-Regression-Test: explicit stop/clear pathways remain first-click deterministic.
- Persistence-Parity-Test: save/reload/restart/defaults preserve updated video-performance behavior and lifecycle invariants.
- Final-Output-Non-Regression-Test: `/output/final` keeps FX-only contract and no lifecycle replay artifacts.

## Incremental Mandatory Gates
- After P9-HF3-T1: profiling baseline and hotspot evidence are captured and reproducible.
- After P9-HF3-T2..T4: render-path optimization is validated against video-heavy contention tests.
- After P9-HF3-T5..T6: final-output priority and control responsiveness are validated concurrently.
- After P9-HF3-T7: adaptive ladder escalation/recovery is PASS on weak-device stress.
- After P9-HF3-T8: strict threshold matrix is PASS with artifacted metrics.
- After P9-HF3-T9: deterministic non-regression suite is PASS.
- After P9-HF3-T10: all phase/global planning artifacts are synchronized.

## Definition of Done
- Video-based animation playback is smooth across Raspberry Pi beamer and mobile/PC control devices.
- `/output/final` remains the most stable/fluessige output path under contention.
- Control views remain fluid and responsive while videos are active.
- Adaptive load-shedding for weak devices works deterministically with bounded quality degradation.
- HF2 no-replay lifecycle correctness remains intact.
- Sync ordering/version/idempotent apply and stop determinism remain intact.
- Video-heavy regression matrix and thresholds are PASS and documented.
- Phase-09 artifacts and global tracking files are synchronized.

## Plan 9-HF1/HF2 Closure Notes

- 9-1 evidence remains documented in `9-1-VERIFICATION.md` but stays NOT ACCEPTED.
- HF1 hard reduction gate remains PASS (`src/app.js`: 12163 -> 28).
- HF2 lifecycle no-replay + low-end hardening evidence remains PASS (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).

## Plan 9-HF3 Closure Result

- PASS: closure evidence is documented in `P9-HF3-T1-VIDEO-PROFILING-BASELINE.md`, `P9-HF3-T2-VIDEO-SCHEDULER.md`, `P9-HF3-T3-VIDEO-WARMUP.md`, `P9-HF3-T4-VIDEO-DRAW-STRATEGY.md`, `P9-HF3-T5-FINAL-OUTPUT-PRIORITY.md`, `P9-HF3-T6-CONTROL-RESPONSIVENESS.md`, `P9-HF3-T7-ADAPTIVE-LADDER.md`, `P9-HF3-T8-VIDEO-PERFORMANCE-SUITE.md`, and `P9-HF3-T9-DETERMINISM-REGRESSION.md`.
