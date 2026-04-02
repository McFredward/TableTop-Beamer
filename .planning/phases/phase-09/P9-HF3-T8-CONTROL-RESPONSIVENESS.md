# P9-HF3-T8 - Control Responsiveness While Stream Is Active

## Method

- Start isolated server (`PORT=4174 node server.mjs`).
- Open stream consumer (`GET /api/final-stream/events`).
- Dispatch 24 `context-update` commands from control role.
- Measure command ACK latency (`POST /api/live/command`).

## Evidence

- Script: `debug/p9-hf3-control-responsiveness.mjs`
- Output: `debug/p9-hf3-control-responsiveness-output.json`

## Result

- p50: **1ms**
- p95: **3ms**
- Max: **7ms**
- Threshold: **<= 120ms**
- Stream health during run: **healthy=true**, `connectedClients=1`

PASS - control interactions remain responsive with active stream pipeline.
