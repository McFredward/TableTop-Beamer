# P9-HF6-T7 - HF5 visual-only stream purity non-regression

## Scope

Validate that HF6 command transport/apply/ack fixes do not reintroduce recurring overlays or diagnostic payload leaks in `/output/final` stream frames.

## Evidence

- Wrapper script: `debug/p9-hf6-t7-stream-purity-non-regression.mjs`
- Matrix script executed: `debug/p9-hf5-t6-stream-purity-matrix.mjs`
- Output: `debug/p9-hf6-t7-stream-purity-non-regression-output.json`

## Result (PASS)

- Boards covered: `nemesis-board-a`, `nemesis-board-b`, `nemesis-lockdown-a`.
- All cases keep `frame.visual` contract valid and overlay-free.
- No forbidden top-level keys, no legacy `mode`/label fields, no `SERVER STREAM ACTIVE` text leak.

HF5 stream visual-only contract remains intact while HF6 control reliability fixes are active.
