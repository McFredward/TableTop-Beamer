# P9-HF4-T8 Sync Invariants (server-authoritative)

## Assertion set
- ordered version apply remains monotonic
- duplicate mutation ids remain non-applied
- stop/clear snapshots remain high-priority apply paths
- board-context snapshots remain authoritative from server payload

## Verification
- Existing deterministic sync path retained in runtime + server mutation envelope flow.
- No protocol redesign was introduced in HF4.
- Startup/runtime invariants run client-side before render but do not override server ordering/version semantics.

## Evidence
- `debug/p9-hf4-fail-pass-output.json` (startup+board context correctness guards)
- `debug/p9-hf4-runtime-smoke-output.json` (bootstrap idempotence + profile override gates)
