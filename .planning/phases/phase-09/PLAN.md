# Phase 9 Plan (Replanned after mandatory final-output performance direction)

## Acceptance Correction
- User correction remains binding: Plan 9-1 is executed but not accepted.
- Plan 9-HF1 remains completed as foundation (monolith reduction + modular seams).
- Plan 9-HF2 remains completed (lifecycle no-replay + low-end hardening baseline).
- New mandatory execution wave is Plan 9-HF3 and supersedes 9-2 as immediate next step.

## Mandatory Performance Direction (binding)
1. `/output/final` on weak hardware (for example Raspberry Pi class devices) must prioritize smooth playback.
2. Evaluate and, if viable, move `/output/final` from client-side polling/render to server-side composed video stream delivery.
3. Control views stay interactive and continue to use canonical sync behavior.
4. Deterministic sync contracts and align-mode behavior remain unchanged.

## Target State
Phase 9 closes with deterministic lifecycle/sync correctness already established by HF2 and a new final-output delivery path optimized for weak playback devices. `/output/final` can consume a server-composed stream for smooth decode on constrained clients, while control clients remain responsive and authoritative mutation flow stays unchanged.

## Architecture Decision (HF3 ADR)
### Feasibility and Tradeoffs
- Latency: server-composed stream is viable when kept low-latency (target sub-second glass-to-glass); it can be slightly slower than direct local render but acceptable for display-only final output.
- Quality: encoded stream introduces compression artifacts risk, but stable frame pacing on weak hardware is expected to improve perceived quality.
- CPU load shift: final client CPU/GPU cost drops significantly; compose/encode load shifts to server and must be capacity planned.
- Complexity: introduces renderer service + encoder + stream transport + health/fallback orchestration.
- Deployment: requires ffmpeg/media pipeline support, codec availability, and network bandwidth budgeting.

### Decision
- Adopt server-composed stream for `/output/final` as primary path when stream health is PASS.
- Keep existing client render path as mandatory fallback and operator override.
- Keep deterministic state/sync as source-of-truth; stream path is a presentation layer only.
- Keep align-mode semantics identical: align overlay visibility in stream follows the same global authoritative flag.

## Scope (9-HF3)
- Add server-side final-output compositor that renders from authoritative state snapshots.
- Add streaming endpoint(s) and `/output/final` player path with health monitoring.
- Add automatic and manual fallback to existing client render when stream is unavailable/degraded.
- Preserve deterministic sync contract and align-mode parity across stream and fallback paths.
- Keep control views polling/render behavior optimized for interaction latency.
- Produce weak-hardware evidence matrix comparing stream vs fallback behavior.

## Out of Scope
- Replacing control-view rendering with server stream.
- Redesigning mutation protocol or changing version/idempotency rules.
- Non-deterministic per-client behavior changes.
- New operator UX unrelated to final-output performance.

## Prioritized Next Execution Wave (Plan 9-HF3, execute-ready, hard-gated)
1. Implement ADR-backed spike for server compositor + transport and capture latency/CPU/quality baseline.
2. Build production path: server-composed stream endpoint and `/output/final` stream player integration.
3. Implement stream health checks with deterministic auto-fallback to current client render.
4. Enforce align-mode and lifecycle parity between stream output and fallback output.
5. Verify deterministic sync invariants remain unchanged because stream is presentation-only.
6. Execute Raspberry-Pi/weak-hardware matrix and close only after artifact synchronization + PASS.

## Milestones
1. M1 HF2 Baseline Lock: lifecycle no-replay and low-end hardening remain intact.
2. M2 Stream Feasibility Closure: latency/quality/capacity tradeoffs are measured and decision is confirmed viable.
3. M3 Server Stream Delivery: `/output/final` receives server-composed video stream with stable playback.
4. M4 Fallback Reliability: stream health degradation switches to deterministic fallback without operator disruption.
5. M5 Contract Preservation: deterministic sync + align-mode parity hold across stream and fallback modes.
6. M6 Evidence Closure: weak-hardware matrix and regression evidence are PASS.

## Regression/Evidence Matrix Policy
- Stream feasibility: measure end-to-end latency, encoded quality stability, and server resource envelope.
- Weak hardware playback: verify smooth frame pacing on Raspberry Pi class final client.
- Fallback safety: force stream failure and assert seamless switch to existing render path.
- Deterministic sync: ordering/version/idempotent apply parity between control views and final output modes.
- Align-mode parity: ON/OFF transitions are identical in stream and fallback outputs.
- Lifecycle parity: no expired one-shot replay artifacts in either output mode.

## Definition of Done
- HF2 lifecycle/no-replay guarantees remain intact with no regression.
- `/output/final` stream mode is operational and default-ready for weak hardware.
- Automatic/manual fallback to client render is reliable and deterministic.
- Control views remain interactive and unaffected by final-output stream workload.
- Deterministic sync and align-mode contracts remain unchanged.
- Evidence matrix is PASS and phase/global planning artifacts are synchronized.

## Execution Update

- Plan 9-1 remains documented but not accepted.
- Plan 9-HF1 remains completed foundation (`src/app.js`: 12163 -> 28 lines).
- Plan 9-HF2 remains completed with PASS evidence (`P9-HF2-T6-SYNC-INVARIANTS.md`, `P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Plan 9-HF3 is completed with PASS evidence and synchronized artifacts; Plan 9-2 becomes the next wave.
