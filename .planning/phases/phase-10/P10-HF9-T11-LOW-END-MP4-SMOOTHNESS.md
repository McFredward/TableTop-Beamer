# P10-HF9-T11 Low-End `sandstorm.mp4` Smoothness Package

- Runtime hardening includes frame-ready callback binding (`requestVideoFrameCallback`), adaptive draw cadence by performance tier, and startup/board-switch prewarm for outside mp4 assets.
- Library/framework decision: **native HTMLVideoElement + requestVideoFrameCallback** (chosen over `hls.js`/`video.js` for local mp4 + zero bundle overhead).
- Diagnostic: `node debug/p10-hf9-t11-low-end-mp4-smoothness-pass.mjs`
- Output: `debug/p10-hf9-t11-low-end-mp4-smoothness-pass-output.json` (**PASS**)
