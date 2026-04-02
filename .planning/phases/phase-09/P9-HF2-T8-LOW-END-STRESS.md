# P9-HF2-T8 Low-End Mobile Stress Matrix

- Date: 2026-04-02T20:03:07Z
- Scope: Validate frame-budget hardening ladder, pressure escalation, and graceful recovery behavior.

## Harness

- Script: `debug/p9-hf2-low-end-stress.mjs`
- Command: `node debug/p9-hf2-low-end-stress.mjs`
- Simulated frames: 620

## Result

`PASS`

Observed metrics:

- `reachedPressure2`: `true` (hard overload path activated)
- `recoveredTo0`: `true` (degradation relaxed when frame cost normalized)
- Final caps after recovery:
  - `nonCriticalCoalesceStride`: `1`
  - `maxRenderAnimationsPerFrame`: `96`
  - `maxAshParticles`: `240`
  - `maxOutsideStarsPerLayer`: `110`

## Matrix Focus

1. Baseline frame budget period
2. Sustained overload period (> 33ms frame cost)
3. Bounded degradation response (`pressureLevel` 2 + strict caps)
4. Recovery period with cap relaxation back to normal profile

## Conclusion

The low-end hardening path sheds non-critical work under stress and recovers automatically, preserving runtime continuity without changing sync semantics.
