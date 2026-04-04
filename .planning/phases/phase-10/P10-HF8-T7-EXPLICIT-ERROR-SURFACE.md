# P10-HF8-T7 — Explicit error-surface contract for canonical load/apply failures

- Script: `node debug/p10-hf8-t7-explicit-error-surface-contract.mjs`
- Output: `debug/p10-hf8-t7-explicit-error-surface-contract-output.json`
- Result: **PASS**

## Contract

- Invalid canonical play-area payloads now surface explicit issues (`canonical-play-areas-invalid`, `canonical-fallback-applied`).
- Runtime consumes and surfaces these issues through status/toast context (board + source), preventing silent masking.
- Valid canonical payloads remain issue-free.
