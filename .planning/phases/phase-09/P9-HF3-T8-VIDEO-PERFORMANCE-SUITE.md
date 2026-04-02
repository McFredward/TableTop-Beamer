# P9-HF3-T8 Video-Heavy Performance Regression Suite

- Date: 2026-04-02T20:33:41Z
- Scope: Execute strict threshold-based performance suite for Raspberry/mobile video-heavy scenarios.

## Harness

- Script: `debug/p9-hf3-video-performance-suite.mjs`
- Command: `node debug/p9-hf3-video-performance-suite.mjs`

## Result

`PASS`

Threshold matrix:

- Final output frame stability:
  - `p95 frame time`: `31ms` (threshold `<=33.3ms`)
  - `max stall`: `37ms` (threshold `<=150ms`)
  - `sustained <24fps window`: `0ms` (threshold `<=3000ms`)
- Control responsiveness under active video:
  - `p95 input latency`: `90ms` (threshold `<=120ms`)
  - `max freeze`: `124ms` (threshold `<=250ms`)
- Recovery behavior:
  - first ladder recovery step: `4200ms` after pressure drop (threshold `<=5000ms`)

## Conclusion

The HF3 performance gate is satisfied for video-heavy stress with explicit threshold PASS evidence.
