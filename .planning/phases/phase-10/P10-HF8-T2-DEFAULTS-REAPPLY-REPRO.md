# P10-HF8-T2 — `Load global defaults` board-specific reapply repro (RED)

- Script: `node debug/p10-hf8-t2-defaults-reapply-failure-repro.mjs`
- Output: `debug/p10-hf8-t2-defaults-reapply-failure-repro-output.json`
- Result: **FAIL (expected RED)**

## Observation

For `nemesis-lockdown-a`, loading defaults with legacy polygon precedence keeps local fallback geometry (`play-area-1`) instead of reapplying canonical board-specific defaults (`bunker` + `play-area-1`).

This reproduces the defaults-reapply failure gate.
