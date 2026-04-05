# 11-HF6 Verification

## Matrix

| Gate | Artifact | Result |
| --- | --- | --- |
| Polling/hydration premature-cancel RED repro | `debug/p11-hf6-t1-polling-premature-cancel-red-output.json` + `P11-HF6-T1-POLLING-PREMATURE-CANCEL-RED.md` | FAIL baseline captured |
| Root-cause branch isolation | `debug/p11-hf6-t2-root-cause-branch-isolation-output.json` + `P11-HF6-T2-ROOT-CAUSE-ISOLATION.md` | PASS |
| Seen-revision full-duration exactly-once contract | `debug/p11-hf6-t3-seen-revision-full-duration-exactly-once-output.json` + `P11-HF6-T3-SEEN-REVISION-FULL-DURATION-EXACTLY-ONCE.md` | PASS |
| Snapshot no-premature-cancel guard | `debug/p11-hf6-t4-no-premature-snapshot-cancel-output.json` + `P11-HF6-T4-SNAPSHOT-CANCEL-GUARD.md` | PASS |
| Loop mode non-regression | `debug/p11-hf6-t5-loop-non-regression-output.json` + `P11-HF6-T5-LOOP-NON-REGRESSION.md` | PASS |
| Stop/Clear immediate-authority non-regression | `debug/p11-hf6-t6-stop-clear-non-regression-output.json` + `P11-HF6-T6-STOP-CLEAR-NON-REGRESSION.md` | PASS |
| Deterministic multi-client polling FAIL->PASS parity | `debug/p11-hf6-t7-multiclient-polling-fail-pass-proof-output.json` + `P11-HF6-T7-FAIL-PASS-PROOF.md` | PASS |
| Consolidated acceptance regression | `debug/p11-hf6-acceptance-regression-output.json` | PASS |

## Conclusion

All HF6 hard gates are satisfied:

- Seen non-loop trigger revisions enforce local exactly-once full-duration playback.
- Polling/hydration no longer cancels active one-shots without explicit stop/clear authority.
- Loop behavior remains non-regressed.
- Explicit stop/clear semantics remain immediate and authoritative.
- Initiator + peer + `/output/final` deterministic polling parity is closed with explicit FAIL->PASS evidence.
