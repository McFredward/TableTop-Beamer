# P9-HF3-T4 Video Draw Strategy Hardening

- Date: 2026-04-02T20:30:57Z
- Scope: Improve frame pacing with deterministic video draw cadence + cached-frame continuity under contention.

## Runtime Changes

- Added pressure-aware video draw stride policy (`final-output` full cadence, control adaptive cadence).
- Added deterministic per-video cadence staggering to avoid synchronized draw bursts.
- Added cached-frame continuity layer for room/inside/outside mp4 paths when cadence skipping is active.

## Harness

- Script: `debug/p9-hf3-video-draw-cadence.mjs`
- Command: `node debug/p9-hf3-video-draw-cadence.mjs`

## Result

`PASS`

- Control path at pressure level 2:
  - normal priority draw stride `3` (120 continuity cache frames in 180 frame window)
  - critical priority draw stride `2`
- Final-output path at pressure level 2:
  - critical draw stride `1` (no dropped cadence frames)

## Conclusion

The draw path now avoids bursty overdraw on control devices while keeping final-output continuity at full cadence.
