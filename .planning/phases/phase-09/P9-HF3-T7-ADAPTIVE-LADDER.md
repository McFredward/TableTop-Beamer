# P9-HF3-T7 Adaptive Weak-Device Quality Ladder

- Date: 2026-04-02T20:33:12Z
- Scope: Add deterministic pressure escalation + hysteresis recovery for weak-device video load shedding.

## Runtime Changes

- Introduced explicit pressure candidate resolution (`resolvePressureCandidate`).
- Added deterministic hysteresis state machine:
  - escalation requires consecutive over-threshold frames,
  - recovery requires sustained under-threshold frames,
  - recovery steps down one level at a time.
- Added runtime ladder telemetry fields (`pressureEscalationFrames`, `pressureRecoveryFrames`, `lastPressureChangeAtMs`).

## Harness

- Script: `debug/p9-hf3-adaptive-ladder.mjs`
- Command: `node debug/p9-hf3-adaptive-ladder.mjs`

## Result

`PASS`

- Escalation to level 2 occurs deterministically (`firstLevel2Frame=205`).
- Recovery starts after pressure drop with bounded hysteresis (`recoveryStepFrame=709`, `289` frames after drop).
- Recovery meets gate: at least one level restored within 5 seconds (`<=300` frames @60fps).

## Conclusion

The adaptive ladder now behaves deterministically under sustained pressure and recovers predictably without oscillation.
