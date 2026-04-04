# P11-HF4-T5 Stop/Clear Non-Regression (Mixed One-Shot + Loop)

- Script: `debug/p11-hf4-t5-stop-clear-non-regression.mjs`
- Output: `debug/p11-hf4-t5-stop-clear-non-regression-output.json`

## Result

- **PASS**
  - explicit `stop` removes only the targeted animation in mixed global+room runtime sets,
  - `clear-all` removes all running animations,
  - server clear path keeps global stop-revision increment semantics intact.
