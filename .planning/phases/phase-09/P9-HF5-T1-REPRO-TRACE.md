# P9-HF5-T1 - Stream Overlay Repro/Trace and Contract Baseline

## Method

- Started isolated server on `http://127.0.0.1:4174`.
- Subscribed to `GET /api/final-stream/events` and captured first `frame` event.
- Traced payload keys for legacy diagnostic fields that previously drove overlay text (`mode`, `board.label`, `runningAnimations[*].roomLabel`).

## Evidence

- Script: `debug/p9-hf5-t1-overlay-repro-trace.mjs`
- Output: `debug/p9-hf5-t1-overlay-repro-trace-output.json`

## Trace Result

- Frame top-level keys: `schema`, `frameId`, `generatedAt`, `sourceVersion`, `alignMode`, `visual`.
- Visual keys: `schema`, `alignMode`, `board`, `runningAnimations`.
- Legacy overlay-driving fields are absent (`mode=false`, `board.label=false`, `roomLabel=false`).
- No stream payload text contains `SERVER STREAM ACTIVE`.

## Conclusion

Deterministic trace confirms the HF5 stream payload baseline is visual-contract-only and no legacy overlay diagnostics are present.
