# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1, Plan 9-HF2, Plan 9-HF3, and Plan 9-HF4 are completed baselines.
- New mandatory closure target is Plan 9-HF5 with hard gates below.

## Regression and Verification Strategy
- Contract-first: deterministic sync invariants remain authoritative and unchanged.
- Isolation-first: stream subscriber lifecycle cannot block or starve command ingest/apply.
- Availability-first: control commands stay operational with stream on/off and under subscriber churn/faults.
- Output-integrity-first: black-stream failures are closed across board profiles/assets.
- Authority-first: stream producer remains server-authoritative and independent of client render health.
- Recovery-first: stream fault handling must be restart-free.
- Purity-first: `/output/final` stream frames must remain visual-only with no text/info/diagnostic overlays.
- Evidence-first: every P0 HF5 item requires reproducible evidence.

## Hard Gates (Plan 9-HF5, mandatory)
- G1 Freeze-Repro-and-Fix-Gate: stream-enabled control freeze is reproducibly demonstrated pre-fix and closed post-fix with traces.
- G2 Command-Path-Isolation-Gate: stream consumers cannot block, lock, or starve command ingest/apply.
- G3 Control-Availability-Gate: start/stop, board switch, align toggle, and command apply stay responsive with stream on/off.
- G4 Black-Stream-Closure-Gate: no black-stream output across board profiles/assets (including sandstorm).
- G5 Producer-Authority-Gate: stream producer remains server-authoritative and independent from client render health.
- G6 Restart-Free-Recovery-Gate: stream fault paths recover without mandatory server restart.
- G7 Deterministic-Contract-Gate: ordering/version/idempotent apply and align semantics remain unchanged.
- G8 Strict-Regression-Gate: full control availability + parity matrix below is PASS with evidence.
- G9 Stream-Purity-Gate: recurring overlays (`SERVER STREAM ACTIVE` + active animation list) are fully removed and cannot reappear.

## Strict Regression Matrix (Plan 9-HF5)
- Stream-Purity-Overlay-Absence-Test: `/output/final` stream output contains no text/info/diagnostic overlays across runtime lifecycle.
- Stream-On-Command-Availability-Test: full command suite remains operational under active stream subscribers.
- Stream-Off-Command-Parity-Test: command behavior matches baseline when stream is disabled.
- Subscriber-Churn-Isolation-Test: rapid subscriber join/leave/failure does not stall command ingest/apply.
- Lock-and-Queue-Starvation-Test: no global lock contention or queue starvation in command path under stream stress.
- Black-Stream-Board-Asset-Matrix-Test: stream output stays visible across all board profiles/assets, including sandstorm.
- Producer-Authority-Independence-Test: stream producer continues authoritative output despite client render degradation.
- Restart-Free-Recovery-Test: injected stream faults recover without server restart.
- Align-and-Sync-Parity-Test: align behavior and deterministic sync invariants remain unchanged.
- Output-Parity-Test: stream output remains semantically aligned with canonical final-output contract.
- Non-Regression-Full-Matrix-Test: operator workflows, persistence, and API flows remain equivalent.

## Incremental Mandatory Gates
- After P9-HF5-T1: recurring overlay reproduction and traces are complete.
- After P9-HF5-T2..T4: overlay source removal + visual-only stream purity guard are active.
- After P9-HF5-T5..T7: HF4 non-regression and stream-purity/output-parity matrices are PASS.
- After P9-HF5-T8: all phase/global planning artifacts are synchronized.

## Definition of Done
- Control commands remain fully operational independent of stream subscribers.
- `/output/final` stream output remains visual-only (no text/info/diagnostic overlays).
- Black-stream cases are closed across board profiles/assets.
- Stream producer remains server-authoritative independent of client render health.
- Recovery from stream faults is restart-free.
- Deterministic sync contracts remain unchanged and validated.
- Align-mode behavior remains parity-correct.
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
- 9-HF4 is completed PASS with evidence artifacts and closes the critical stream/control blocker baseline.
- 9-HF5 is completed PASS; stream-purity gates are closed and Plan 9-2 can proceed.
