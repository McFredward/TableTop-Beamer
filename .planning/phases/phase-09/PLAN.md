# Phase 9 Plan (Replanned after mandatory P0 stream-output purity refinement)

## Baseline and Correction Context
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed foundation (monolith reduction + modular seams).
- Plan 9-HF2 remains completed baseline (lifecycle no-replay + low-end hardening).
- Plan 9-HF3 remains completed baseline (server stream + fallback + parity evidence).
- Plan 9-HF4 is completed baseline.
- New mandatory execution wave is Plan 9-HF5 and supersedes 9-2 as immediate next step.

## New Critical P0 Refinement from Real Usage (binding)
1. `/output/final` stream currently shows recurring overlays (`SERVER STREAM ACTIVE` and active animation list).
2. Stream output must stay visual-only; text/info/diagnostic overlays are not allowed.
3. Overlay recurrence during stream sessions is a hard contract violation for final beamer output.

## Mandatory Objectives for 9-HF5 (hard requirements)
1. Remove recurring stream overlays from `/output/final` (including `SERVER STREAM ACTIVE` and animation diagnostics list).
2. Enforce visual-only stream contract for final output (no text/info/diagnostic overlays in stream frames).
3. Preserve HF4 guarantees: command-path isolation, producer authority, black-stream closure, restart-free recovery.
4. Add hard regression tests proving overlay-free output under stream on/off, reconnect/churn, and board/profile coverage.

## Target State
Phase 9 closes with HF1/HF2/HF3/HF4 guarantees preserved and HF5 enforcing final-output stream purity: `/output/final` remains overlay-free visual content only, while command-path isolation, black-stream closure, and restart-free recovery remain intact.

## Scope (9-HF5)
- Remove stream-overlay compose paths from server-composed final stream frames.
- Ensure `/output/final` stream renderer emits only visual effect content, without text/info/diagnostic layers.
- Keep align/sync and control-path contracts unchanged while removing overlays.
- Add deterministic regression matrix for overlay absence in stream on/off, reconnect/churn, and board/profile scenarios.

## Out of Scope
- New UX features unrelated to stream/control stability.
- Mutation protocol redesign beyond required isolation hardening.
- Changes to existing deterministic ordering/version/idempotency contracts.

## Prioritized Next Execution Wave (Plan 9-HF5, execute-ready, hard-gated)
1. Reproduce and trace recurring overlay injection in `/output/final` stream compose (`SERVER STREAM ACTIVE` + active animation list).
2. Remove overlay emission at source in stream compose path and disable diagnostics overlays for final stream output.
3. Add explicit stream-purity guard so no text/info/diagnostic overlay can re-enter final stream frames.
4. Validate no-regression for HF4 guarantees (control responsiveness, producer authority, black-stream closure, restart-free recovery).
5. Execute hard regression matrix (overlay absence, stream on/off parity, reconnect/churn parity, board/profile output parity).
6. Close wave only after full artifact synchronization + PASS.

## Milestones
1. M1 HF3 Baseline Lock: stream/fallback/sync/align contracts remain intact.
2. M2 Repro + Root Cause Closure: freeze and black-stream failures are deterministically reproduced and isolated.
3. M3 Command-Path Isolation: control command ingest/apply is independent from stream subscriber lifecycle.
4. M4 Producer Authority Hardening: stream producer remains authoritative and resilient to client render/subscriber health.
5. M5 Black-Stream Closure: board/profile/asset black output cases are resolved.
6. M6 Recovery Closure: no operational path requires server restart.
7. M7 Evidence Closure: hard regression matrix is PASS and artifacts are synchronized.
8. M8 HF5 Stream Purity Closure: `/output/final` stream frames are visual-only with no recurring diagnostic overlays.

## Regression/Evidence Matrix Policy (9-HF5)
- Stream-Purity-Overlay-Absence-Test: `/output/final` stream frames contain no text/info/diagnostic overlays.
- Stream-On Control Responsiveness Test: commands remain responsive under active stream subscribers.
- Stream-Off Control Responsiveness Test: parity baseline remains unchanged.
- Subscriber Churn Isolation Test: rapid join/leave/fail subscribers do not starve command path.
- Queue/Lock Starvation Guard Test: ingest/apply throughput remains bounded during stream stress.
- Black-Stream Board Matrix Test: all board profiles/assets (including sandstorm) render non-black output.
- Producer Authority Test: stream output remains driven by server authoritative state independent of client render health.
- Restart-Free Recovery Test: injected stream faults recover without server restart.
- Output Parity Test: stream output remains semantically aligned with canonical `/output/final` rendering contract.

## Definition of Done
- HF1/HF2/HF3 guarantees remain intact with no regression.
- HF4 guarantees remain intact with no regression.
- `/output/final` stream output is visual-only (no text/info/diagnostic overlays).
- Command ingest/apply stays fully operational with stream on, off, degraded, and subscriber churn.
- Black-stream cases are closed across board profiles/assets.
- Stream producer is server-authoritative and independent from client render health.
- Fault recovery is restart-free in tested failure paths.
- Hard regression matrix is PASS and phase/global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 remains completed foundation (`src/app.js`: 12163 -> 28 lines).
- Plan 9-HF2 remains completed with PASS evidence (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3 remains completed with PASS evidence (`P9-HF3-T1-STREAM-ADR.md`, `P9-HF3-T6-ALIGN-PARITY.md`, `P9-HF3-T7-SYNC-INVARIANTS.md`, `P9-HF3-T8-CONTROL-RESPONSIVENESS.md`, `P9-HF3-T9-WEAK-HARDWARE-MATRIX.md`).
- Plan 9-HF4 completed PASS: stream producer is decoupled from command ingest/apply lifecycle, black-stream paths are closed, restart-free recovery is verified, and hard control/output parity matrices are recorded.
- Plan 9-HF5 is completed PASS: recurring stream overlays are removed, visual-only payload contract is enforced, and HF4 stability/parity gates remain PASS.
