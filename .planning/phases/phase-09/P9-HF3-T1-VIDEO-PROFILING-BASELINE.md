# P9-HF3-T1 Video-Heavy Profiling Baseline

- Date: 2026-04-02T20:27:10Z
- Scope: Build a reproducible bottleneck baseline for video-heavy workloads on `/output/final` and control views.

## Harness

- Script: `debug/p9-hf3-video-baseline.mjs`
- Command: `node debug/p9-hf3-video-baseline.mjs`
- Scenarios: `raspberry-final-heavy-video`, `mobile-control-concurrent-video`

## Result

`PASS`

Baseline hotspot snapshot:

1. **Decode contention:** seek/restart bursts produce repeated decode spikes under concurrent video load.
2. **Draw overdraw contention:** layered mp4 composition yields bursty draw cost windows.
3. **Control feedback spikes:** control interactions show temporary freeze windows while video bursts are active.

Measured baseline metrics:

- Raspberry `/output/final` video-heavy:
  - `frame p95`: `39.0ms`
  - `frame max`: `52.6ms`
  - `draw p95`: `22.4ms`
- Mobile control concurrent video:
  - `frame p95`: `37.1ms`
  - `frame max`: `47.8ms`
  - `control freeze windows (>40ms)`: `6`

## Conclusion

The baseline reproduces frame-budget pressure from decode+draw contention and confirms the need for scheduler hardening, warmup buffering, and final-output-first arbitration in the next HF3 tasks.
