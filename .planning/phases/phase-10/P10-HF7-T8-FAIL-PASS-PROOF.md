# P10-HF7-T8 FAIL -> PASS proof (same HF7 diagnostics set)

## Command

```bash
node debug/p10-hf7-t1-clean-start-profile-loss-repro.mjs && \
node debug/p10-hf7-t2-extraction-coupling-diagnostics.mjs && \
node debug/p10-hf7-t3-unknown-key-migration-drop-repro.mjs && \
node debug/p10-hf7-t4-catalog-independent-extraction.mjs && \
node debug/p10-hf7-t5-unknown-key-retention.mjs && \
node debug/p10-hf7-t6-lifecycle-multiarea-retention.mjs && \
node debug/p10-hf7-t7-browser-imported-cleanstart-regression.mjs && \
node debug/p10-hf7-t8-fail-pass-proof.mjs
```

## Result

- `debug/p10-hf7-t8-fail-pass-proof-output.json` -> `result: PASS`
- RED evidence for T1..T3 contains explicit fail markers (`RED expected` / `result: FAIL`).
- Post-fix diagnostics for T4..T7 are PASS.

## Artifacts

- `.planning/phases/phase-10/P10-HF7-T1-CLEAN-START-PROFILE-LOSS-REPRO.md`
- `.planning/phases/phase-10/P10-HF7-T2-EXTRACTION-COUPLING-DIAGNOSTICS.md`
- `.planning/phases/phase-10/P10-HF7-T3-UNKNOWN-KEY-MIGRATION-DROP-REPRO.md`
- `.planning/phases/phase-10/P10-HF7-T4-CATALOG-INDEPENDENT-EXTRACTION.md`
- `.planning/phases/phase-10/P10-HF7-T5-UNKNOWN-KEY-RETENTION.md`
- `.planning/phases/phase-10/P10-HF7-T6-LIFECYCLE-MULTIAREA-RETENTION.md`
- `.planning/phases/phase-10/P10-HF7-T7-BROWSER-IMPORTED-CLEANSTART-REGRESSION.md`
- `debug/p10-hf7-t1-clean-start-profile-loss-repro-output.json`
- `debug/p10-hf7-t2-extraction-coupling-diagnostics-output.json`
- `debug/p10-hf7-t3-unknown-key-migration-drop-repro-output.json`
- `debug/p10-hf7-t4-catalog-independent-extraction-output.json`
- `debug/p10-hf7-t5-unknown-key-retention-output.json`
- `debug/p10-hf7-t6-lifecycle-multiarea-retention-output.json`
- `debug/p10-hf7-t7-browser-imported-cleanstart-regression-output.json`
- `debug/p10-hf7-t8-fail-pass-proof-output.json`
