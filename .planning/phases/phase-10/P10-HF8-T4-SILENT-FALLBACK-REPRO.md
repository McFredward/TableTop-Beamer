# P10-HF8-T4 — Silent canonical load/apply failure masking repro (RED)

- Script: `node debug/p10-hf8-t4-silent-fallback-repro.mjs`
- Output: `debug/p10-hf8-t4-silent-fallback-repro-output.json`
- Result: **FAIL (expected RED)**

## Observation

When canonical play-area payload is invalid for a board, polygon apply silently falls back to default `play-area-1` with no explicit issue surface (`hasIssueSurface=false`).

This reproduces the no-silent-fallback blocker.
