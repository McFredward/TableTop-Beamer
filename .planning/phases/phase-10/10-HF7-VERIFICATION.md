# Plan 10-HF7 Verification

## Scope

- Extraction independent from loaded board list.
- Unknown board key retention during migration.
- Deterministic multi-play-area retention across startup/default-apply/reload.
- Browser/imported clean-start parity closure with FAIL->PASS proof.

## Executed Commands

```bash
node debug/p10-hf7-t1-clean-start-profile-loss-repro.mjs
node debug/p10-hf7-t2-extraction-coupling-diagnostics.mjs
node debug/p10-hf7-t3-unknown-key-migration-drop-repro.mjs
node debug/p10-hf7-t4-catalog-independent-extraction.mjs
node debug/p10-hf7-t5-unknown-key-retention.mjs
node debug/p10-hf7-t6-lifecycle-multiarea-retention.mjs
node debug/p10-hf7-t7-browser-imported-cleanstart-regression.mjs
node debug/p10-hf7-t8-fail-pass-proof.mjs
```

## Verdict

- RED baseline reproduced for T1..T3 (`result: FAIL`).
- Post-fix validation is PASS for T4..T7.
- FAIL->PASS proof artifact is PASS (`debug/p10-hf7-t8-fail-pass-proof-output.json`).

## Key Evidence

- `.planning/phases/phase-10/P10-HF7-T1-CLEAN-START-PROFILE-LOSS-REPRO.md`
- `.planning/phases/phase-10/P10-HF7-T2-EXTRACTION-COUPLING-DIAGNOSTICS.md`
- `.planning/phases/phase-10/P10-HF7-T3-UNKNOWN-KEY-MIGRATION-DROP-REPRO.md`
- `.planning/phases/phase-10/P10-HF7-T8-FAIL-PASS-PROOF.md`
- `debug/p10-hf7-t4-catalog-independent-extraction-output.json`
- `debug/p10-hf7-t5-unknown-key-retention-output.json`
- `debug/p10-hf7-t6-lifecycle-multiarea-retention-output.json`
- `debug/p10-hf7-t7-browser-imported-cleanstart-regression-output.json`
- `debug/p10-hf7-t8-fail-pass-proof-output.json`
