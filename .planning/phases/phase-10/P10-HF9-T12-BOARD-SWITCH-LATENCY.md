# P10-HF9-T12 Board-Switch Latency + Stale-Residue Cleanup

- `switchBoard` now records latency, clears previous-board outside playback/timeline state, prewarms next-board outside mp4 asset, and clears canvas before overlay redraw.
- Diagnostic: `node debug/p10-hf9-t12-board-switch-latency-pass.mjs`
- Output: `debug/p10-hf9-t12-board-switch-latency-pass-output.json` (**PASS**)
