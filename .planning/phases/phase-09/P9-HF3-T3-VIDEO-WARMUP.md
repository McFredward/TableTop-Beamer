# P9-HF3-T3 Deterministic Video Warmup/Buffering

- Date: 2026-04-02T20:29:27Z
- Scope: Reduce startup/seek hitching by adding deterministic warmup readiness and lifecycle seek cooldown.

## Runtime Changes

- Video cache entries now track warmup lifecycle (`requestedAtMs`, `stableSinceMs`, `primedAtMs`).
- Added readiness guard: mp4 draw only starts after a stable can-play window.
- Added lifecycle seek cooldown to avoid immediate repeated start/seek thrash during run transitions.
- Applied warmup gate to room, inside-global, and outside mp4 paths.

## Harness

- Script: `debug/p9-hf3-video-warmup.mjs`
- Command: `node debug/p9-hf3-video-warmup.mjs`

## Result

`PASS`

- First warm-ready frame is only allowed after stable-readiness window (`firstWarmReady=142ms`).
- Lifecycle seek cooldown (`180ms`) blocks immediate repeat seek but re-allows after guard window.

## Conclusion

Warmup and lifecycle seek behavior is now deterministic and bounded, reducing decoder churn and startup hitch spikes in video-heavy paths.
