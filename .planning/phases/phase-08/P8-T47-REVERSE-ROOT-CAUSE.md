# P8-T47 Reverse Lifecycle Root-Cause Analysis (Outside Sandstorm)

Date: 2026-03-27  
Status: PASS

## Scope
- Plan 8-HF5 Task P8-T47
- Reproduce and isolate reverse-flicker cause for mp4 boomerang (`Outside Sandstorm`)

## Reproduction Sequence
1. Open `Settings -> Outside Animations`.
2. Select `Outside Sandstorm` (`assetType=mp4`, `assetRef=sandstorm.mp4`).
3. Enable `Boomerang`, click `Apply changes`.
4. Enable outside effect and observe multiple cycles.

Observed: forward phase is stable; reverse phase shows heavy visual flicker.

## Root Cause (isolated)
- The boomerang reverse path in `drawOutsideFxLayer` uses frame-by-frame `video.currentTime` seeking while paused.
- Reverse seeks are currently scheduled on nearly every render tick without seek arbitration (`video.seeking` / seek cadence guard).
- On mp4/h264 this causes overlapping pending seeks and decoder thrash in reverse mode, producing visible frame instability/flicker.
- Forward playback is stable because it uses native continuous playback (`video.play()` + `playbackRate`) and does not spam reverse seeks.

## Fix Direction
- Keep full-cycle boomerang state machine (`forward -> reverse -> repeat`) intact.
- Add reverse seek lifecycle hardening:
  - explicit reverse phase cursor/time anchor,
  - seek cadence throttling,
  - no new seek while `video.seeking`.
- Preserve non-boomerang mp4 paths unchanged (`forward` native loop + `reverse` deterministic scrub).

## Evidence Linkage
- Code fix task: P8-T48
- Playback non-regression task: P8-T49
- Apply/persistence non-regression task: P8-T50
- Consolidated matrix: P8-T51
