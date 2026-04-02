# P9-HF3-T9 - Weak Hardware Matrix (Stream Smoothness + Fallback Resilience)

## Matrix Focus

- stream event cadence under command load
- reconnect recovery for stream consumers
- stream-state observability via health endpoint

## Procedure

1. Start isolated server (`PORT=4174 node server.mjs`).
2. Run `TT_BEAMER_BASE_URL=http://127.0.0.1:4174 node debug/p9-hf3-weak-hardware-matrix.mjs`.
3. Inspect `debug/p9-hf3-weak-hardware-matrix-output.json`.

## Result

PASS

- stream event cadence under load: PASS
- reconnect recovers frames: PASS
- health endpoint exposes stream state: PASS

## Notes

The matrix validates resilience of the stream path and deterministic recovery surfaces. Client-render fallback remains available through auto timeout/error path and explicit operator mode override.
