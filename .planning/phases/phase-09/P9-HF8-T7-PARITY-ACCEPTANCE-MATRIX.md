# P9-HF8-T7 Parity + Acceptance Matrix

## Goal

Execute strict HF8 acceptance checks for server-video authority, receiver-only `/output/final`, always-on compositor behavior, mutation visibility, and HF5/HF6 parity preservation.

## Verification Run

- Script: `node debug/p9-hf8-t7-parity-matrix.mjs`
- Output: `debug/p9-hf8-t7-parity-matrix-output.json`
- Test base URL: `http://127.0.0.1:4211`

## Covered Gates

- True server-composed video endpoint is advertised and serving multipart stream (`/api/final-stream/video`).
- `/output/final` is stream-player-only HTML (`<img src="/api/final-stream/video">`) with no `<script>` tags.
- Compositor remains running with frame-id progression while subscriber count is zero.
- Mutation-to-stream visibility for `start`, `board-switch`, `align-on`, `stop`, `align-off` is immediate.
- Stream payload remains visual-only (no diagnostics overlays like `SERVER STREAM ACTIVE`).
- Health latency gate remains PASS (`maxObservedMs <= hardLimitMs`).

## Result

- PASS (`pass: true`)
- Ack max latency: `7ms`
- Stream visibility max latency: `1ms`
- Health latency gate: `pass: true` (`hardLimitMs: 1200`, `maxObservedMs: 1`)
