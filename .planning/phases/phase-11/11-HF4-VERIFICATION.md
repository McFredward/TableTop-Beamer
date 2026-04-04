# 11-HF4 Verification

## Matrix

| Gate | Artifact | Result |
| --- | --- | --- |
| Non-loop suppression RED repro | `debug/p11-hf4-t1-non-loop-suppression-red-output.json` | PASS after fix (RED removed) |
| Root-cause isolation | `P11-HF4-T2-ROOT-CAUSE-ISOLATION.md` | PASS |
| One-shot final full-duration exactly-once | `debug/p11-hf4-t3-oneshot-final-full-duration-pass-output.json` | PASS |
| Loop non-regression | `debug/p11-hf4-t4-loop-non-regression-output.json` | PASS |
| Stop/Clear non-regression | `debug/p11-hf4-t5-stop-clear-non-regression-output.json` | PASS |
| Control vs final one-shot duration parity FAIL->PASS | `debug/p11-hf4-t6-control-final-parity-fail-pass-output.json` | PASS |

## Conclusion

All HF4 hard gates are satisfied:

- Non-loop globals render on `/output/final`.
- One-shot globals run full duration exactly once.
- Loop behavior remains intact.
- Stop/clear semantics remain intact.
- Control vs `/output/final` duration parity is closed with explicit FAIL->PASS evidence.
