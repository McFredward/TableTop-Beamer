# P9-HF5-T7 - Output Parity Verification (No Overlay)

## Method

- Forced stream mode and selected `nemesis-board-a`.
- Triggered `outside-space` animation.
- Waited for stream frame with `sourceVersion >= commandVersion`.
- Compared stream visual running count with authoritative live-state running count.
- Asserted no overlay leak text in stream payload.

## Evidence

- Script: `debug/p9-hf5-t7-output-parity-no-overlay.mjs`
- Output: `debug/p9-hf5-t7-output-parity-no-overlay-output.json`

## Result

- Version parity: PASS (`commandVersion=11`, `frameSourceVersion=11`).
- Running parity: PASS (`streamVisualRunningCount=1`, `liveBoardRunningCount=1`).
- Visual board payload present: PASS.
- Overlay leak absent: PASS.

## Conclusion

Output parity remains intact while stream payloads stay overlay-free.
