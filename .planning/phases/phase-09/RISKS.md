# Phase 9 Risks

## Acceptance Correction Context
- 9-1 is not accepted; 9-HF1 and 9-HF2 are completed baselines.
- 9-HF3 is the binding performance wave for server-composed `/output/final` stream delivery with fallback.

## R1 Server encoder overload under concurrent sessions
- Risk: compose/encode pipeline saturates server CPU and increases latency.
- Impact: Critical.
- Mitigation: define capacity envelope, cap stream profiles, and keep deterministic fallback path always available.

## R2 Stream transport jitter causes visible stutter on weak clients
- Risk: network jitter or buffering instability reduces playback smoothness despite offload.
- Impact: Critical.
- Mitigation: low-latency buffering policy, jitter tolerance tuning, and weak-hardware playback matrix.

## R3 Compression profile degrades visual readability
- Risk: aggressive bitrate/codec settings produce artifacts that hurt operator visibility.
- Impact: High.
- Mitigation: quality floor thresholds and profile presets validated in evidence matrix.

## R4 Fallback transition is non-deterministic
- Risk: stream failure causes blank output, duplicate output, or delayed failover.
- Impact: Critical.
- Mitigation: health probes with explicit state machine and tested auto/manual fallback transitions.

## R5 Align-mode parity regression in stream path
- Risk: align overlay differs between stream and fallback outputs.
- Impact: Critical.
- Mitigation: shared align visibility contract with parity tests for ON/OFF transitions.

## R6 Stream path leaks into sync/mutation semantics
- Risk: implementation accidentally changes ordering/version/idempotent apply behavior.
- Impact: Critical.
- Mitigation: enforce presentation-only boundary and run deterministic sync regression with stream enabled.

## R7 Control-view responsiveness degrades due to stream workload
- Risk: control clients lose interactivity because resources are coupled with final output path.
- Impact: Critical.
- Mitigation: isolate stream workload from control-view loops and validate interaction latency gates.

## R8 Deployment complexity blocks reproducible rollout
- Risk: codec/ffmpeg/runtime dependencies differ across environments.
- Impact: High.
- Mitigation: explicit deployment prerequisites, startup checks, and fallback-safe boot behavior.

## R9 Weak-hardware decoder incompatibility
- Risk: Raspberry Pi class devices cannot decode chosen stream profile reliably.
- Impact: Critical.
- Mitigation: hardware-compatible codec/profile matrix and tested profile fallback.

## R10 Lifecycle/no-replay regression reintroduced indirectly
- Risk: stream integration bypasses HF2 lifecycle guards and shows stale replay artifacts.
- Impact: Critical.
- Mitigation: keep stream fed from authoritative post-reconcile state and re-run no-replay regression.

## R11 Artifact drift across phase/global trackers
- Risk: phase files and global tracking files become inconsistent.
- Impact: High.
- Mitigation: mandatory full artifact sync in P9-HF3-T10.

## Execution Notes

- 9-HF1 and 9-HF2 baselines remain valid and are treated as non-regression gates.
- 9-HF3 risk focus shifts to stream delivery viability, fallback reliability, and contract preservation.
- 9-HF3 closure: fallback and parity gates are validated; residual risk is operational tuning (capacity + profile calibration) for production rollout.
