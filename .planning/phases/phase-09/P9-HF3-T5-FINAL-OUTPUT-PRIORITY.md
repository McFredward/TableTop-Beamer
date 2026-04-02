# P9-HF3-T5 Final-Output-First Priority Policy

- Date: 2026-04-02T20:31:45Z
- Scope: Enforce `/output/final` render/decode budget priority under mixed workload contention.

## Runtime Changes

- Added role-aware pressure cap application (`applyRuntimePressureCaps`).
- Final-output keeps higher render/particle/star budgets under pressure; control path is aggressively shed first.
- Added decode-stride throttling for non-final paths (`videoDecodeStride=2` at pressure level 2).
- Tracked `finalOutputPriorityActive` in runtime performance state.

## Harness

- Script: `debug/p9-hf3-final-output-priority.mjs`
- Command: `node debug/p9-hf3-final-output-priority.mjs`

## Result

`PASS`

Pressure level 2 budget snapshot:

- Final output:
  - `maxRenderAnimationsPerFrame=48`
  - `maxAshParticles=120`
  - `videoDecodeStride=1`
- Control:
  - `maxRenderAnimationsPerFrame=18`
  - `maxAshParticles=56`
  - `videoDecodeStride=2`

## Conclusion

Under contention, budget arbitration now explicitly protects `/output/final` continuity while shedding non-final workload first.
