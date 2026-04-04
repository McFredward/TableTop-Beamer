# P10-HF9-T9 Queue Fairness + No-Drop Hardening

- Server queue dequeue now uses weighted fair scheduling (`control/control/control/state/state/noisy`).
- Overflow behavior switched to explicit backpressure logging (`no-drop`) instead of dropping accepted commands.
- Diagnostic: `node debug/p10-hf9-t9-fairness-no-drop-pass.mjs`
- Output: `debug/p10-hf9-t9-fairness-no-drop-pass-output.json` (**PASS**)
