# P9-HF4-T1 - Stream Freeze/Black-Stream Reproduction and Root-Cause Trace

## Method

- Start isolated server (`PORT=4174 node server.mjs`).
- Open 8 concurrent stream subscribers (`GET /api/final-stream/events`).
- Dispatch 80 mixed control mutations (`context-update`, `align-toggle`, `clear-all`).
- Capture command ACK latency, queue depth telemetry, and final-stream producer health.

## Evidence

- Script: `debug/p9-hf4-t1-repro-trace.mjs`
- Output: `debug/p9-hf4-t1-repro-trace-output.json`

## Root Cause Isolation

- Legacy hazard: per-subscriber stream timers each performed independent compose work.
- Impact path: fan-out compose pressure could starve event-loop time for command ingest/apply ACKs.
- Isolation target for HF4: single producer scheduler composes once per tick and broadcasts cached frames, decoupled from subscriber count.

## Result

- Reproduction harness and telemetry capture are in place.
- Trace output confirms command-path latency and queue depth can be measured under subscriber churn pressure.
