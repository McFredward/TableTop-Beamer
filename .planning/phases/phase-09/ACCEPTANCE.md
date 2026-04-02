# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1 and Plan 9-HF2 are completed baselines.
- New mandatory closure target is Plan 9-HF3 with hard gates below.

## Regression and Verification Strategy
- Contract-first: deterministic sync invariants remain authoritative and unchanged.
- Final-output-first: `/output/final` prioritizes smooth playback on weak hardware via server-composed stream path.
- Fallback-first: stream degradation must fail over deterministically to existing client render path.
- Parity-first: align-mode and lifecycle semantics are identical in stream and fallback modes.
- Interaction-first: control views stay interactive and low-latency.
- Evidence-first: every P0 HF3 item requires reproducible weak-hardware evidence.

## Hard Gates (Plan 9-HF3, mandatory)
- G1 Stream-Feasibility-Gate: architecture decision with measured latency/quality/capacity tradeoffs is documented and approved as viable.
- G2 Server-Stream-Delivery-Gate: `/output/final` receives server-composed stream in normal operation.
- G3 Fallback-Reliability-Gate: health-triggered auto-fallback and explicit manual override both work deterministically.
- G4 Align-Mode-Parity-Gate: align ON/OFF behavior is identical across stream and fallback outputs.
- G5 Deterministic-Sync-Integrity-Gate: ordering/version/idempotent apply invariants are unchanged.
- G6 Control-Interactivity-Gate: control views remain responsive while stream mode is active.
- G7 Strict-Regression-Gate: full weak-hardware + parity matrix below is PASS with evidence.

## Strict Regression Matrix (Plan 9-HF3)
- Stream-Latency-Baseline-Test: capture glass-to-glass latency and jitter envelope for stream mode.
- Stream-Quality-Stability-Test: verify visual quality floor and frame pacing stability under sustained playback.
- Weak-Hardware-Smoothness-Test: Raspberry Pi class final client remains smooth without sustained frame collapse.
- Stream-Failure-AutoFallback-Test: simulate stream outage and assert deterministic switch to client render.
- Manual-Override-Fallback-Test: operator can force fallback/stream mode without unstable intermediate states.
- Align-Mode-Parity-Test: align overlay transitions match exactly in stream and fallback outputs.
- Lifecycle-Parity-Test: expired one-shot events remain no-replay in both output modes.
- Deterministic-Sync-Under-Stream-Test: multi-client ordering/version/apply invariants remain stable with stream enabled.
- Control-View-Responsiveness-Test: control actions keep expected responsiveness while stream pipeline is active.
- Non-Regression-Full-Matrix-Test: core operator workflows and persistence/API flows remain functionally equivalent.

## Incremental Mandatory Gates
- After P9-HF3-T1: feasibility ADR is complete and explicitly marks go/no-go criteria.
- After P9-HF3-T2..T3: server stream delivery works end-to-end for `/output/final`.
- After P9-HF3-T4..T5: fallback and manual override are deterministic and operator-safe.
- After P9-HF3-T6..T7: align-mode parity and deterministic sync invariants are PASS.
- After P9-HF3-T8..T9: control responsiveness and weak-hardware matrix are PASS.
- After P9-HF3-T10: all phase/global planning artifacts are synchronized.

## Definition of Done
- `/output/final` stream mode is available and optimized for weak hardware playback.
- Deterministic fallback keeps final output available under stream degradation.
- Deterministic sync contracts remain unchanged and validated.
- Align-mode behavior is parity-correct across stream and fallback outputs.
- Control views remain interactive during stream operation.
- Evidence matrix is PASS and phase/global tracking files are synchronized.

## Plan 9 Baseline Notes

- 9-1 evidence remains documented in `9-1-VERIFICATION.md` but stays not accepted.
- 9-HF1 hard reduction gate is PASS (`src/app.js`: 12163 -> 28).
- 9-HF2 gates are PASS with artifacts:
  - `.planning/phases/phase-09/P9-HF2-T6-SYNC-INVARIANTS.md`
  - `.planning/phases/phase-09/P9-HF2-T7-LONG-RUN-SOAK.md`
  - `.planning/phases/phase-09/P9-HF2-T8-LOW-END-STRESS.md`
- 9-HF3 gates are PASS with artifacts:
  - `.planning/phases/phase-09/P9-HF3-T1-STREAM-ADR.md`
  - `.planning/phases/phase-09/P9-HF3-T6-ALIGN-PARITY.md`
  - `.planning/phases/phase-09/P9-HF3-T7-SYNC-INVARIANTS.md`
  - `.planning/phases/phase-09/P9-HF3-T8-CONTROL-RESPONSIVENESS.md`
  - `.planning/phases/phase-09/P9-HF3-T9-WEAK-HARDWARE-MATRIX.md`
