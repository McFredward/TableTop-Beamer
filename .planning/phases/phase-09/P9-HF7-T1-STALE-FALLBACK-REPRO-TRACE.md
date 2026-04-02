# P9-HF7-T1 Stale/Fallback Repro Trace

## Goal

Capture deterministic pre-fix evidence that `/output/final` still contained fallback-capable runtime branches.

## Method

- Baseline ref: `afceb3e` (HF6 closure commit)
- Script: `node debug/p9-hf7-t1-stale-fallback-repro-trace.mjs`
- Output: `debug/p9-hf7-t1-stale-fallback-repro-output.json`

## Result

- `prefxFallbackPathPresent: true`
- Baseline runtime contained explicit client-path assignments and auto/client mode branches.
- Baseline server accepted `auto/client/stream` mode values and applied incoming `finalOutputMode` in context updates.

## Verdict

Pre-fix fallback-capable `/output/final` behavior is reproducibly evidenced and ready for closure in HF7.
