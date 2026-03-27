# P7-HF10 Verify Evidence (FAIL -> PASS)

## FAIL (pre-fix reproduction)

- Root-cause notes: `.planning/phases/phase-07/P7-HF10-T1-ROOT-CAUSE.md`
- Raw artifact: `debug/p7-hf10-t1-fail-output.json`

Observed failure:

- `trigger-room` / `trigger-global` / `trigger-cluster` commands return `commandAccepted=true`, `applied=true`.
- Snapshot afterwards has `selectedBoard = null` and `runtime.runningAnimations = []`.
- Outside profile may still show active (`outsideFxByBoard.enabled=true`), explaining "only global-outside appears to start" in real operation.

## PASS (post-fix verification)

- Root-cause parity pass: `debug/p7-hf10-t1-pass-output.json`
- Hard smoke: `debug/p7-hf10-t6-smoke-output.json`
- Guard/invariant verify: `debug/p7-hf10-t12-output.json`
- Behavior matrix verify: `debug/p7-hf10-t13-output.json`
- Telemetry snapshot: `debug/p7-hf10-t14-output.json`

Verified PASS conditions:

1. `room`, `global-inside`, `cluster` start deterministically and become visible in running state.
2. All remain active through persistence sampling window (no instant neutralization).
3. Explicit `stop-animation` works without cross-neutralizing other active runs.
4. `clear-all` deterministically empties running state.
5. Context/status messages are non-masking; lifecycle/pending start feedback is preserved.

## Execution environment

- Isolated verification server: `PORT=4399 node server.mjs`
- Runner base URL: `TT_BEAMER_BASE_URL=http://127.0.0.1:4399`
