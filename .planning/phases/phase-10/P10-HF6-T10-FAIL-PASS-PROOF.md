# P10-HF6-T10 FAIL -> PASS proof (same HF6 diagnostics set)

## Command

```bash
node debug/p10-hf6-t1-lockdown-a-area-drop-repro.mjs && \
node debug/p10-hf6-t2-merge-lineage-diagnostics.mjs && \
node debug/p10-hf6-t3-fallback-subset-replacement-repro.mjs && \
node debug/p10-hf6-t4-area-count-parity.mjs && \
node debug/p10-hf6-t5-area-id-set-parity.mjs && \
node debug/p10-hf6-t6-control-final-set-parity.mjs && \
node debug/p10-hf6-t8-fallback-guard.mjs && \
node debug/p10-hf6-t9-browser-imported-multiarea-regression.mjs && \
node debug/p10-hf6-t10-fail-pass-proof.mjs
```

## Result

- `debug/p10-hf6-t10-fail-pass-proof-output.json` -> `result: PASS`
- RED evidence files for T1..T6 contain explicit fail traces.
- Post-fix diagnostics for T1..T6/T8/T9 are PASS.

## Artifacts

- `.planning/phases/phase-10/P10-HF6-T1-LOCKDOWNA-AREA-DROP-REPRO.md`
- `.planning/phases/phase-10/P10-HF6-T2-MERGE-LINEAGE-DIAGNOSTICS.md`
- `.planning/phases/phase-10/P10-HF6-T3-FALLBACK-SUBSET-REPLACEMENT-REPRO.md`
- `.planning/phases/phase-10/P10-HF6-T4-AREA-COUNT-PARITY.md`
- `.planning/phases/phase-10/P10-HF6-T5-AREA-ID-SET-PARITY.md`
- `.planning/phases/phase-10/P10-HF6-T6-CONTROL-FINAL-SET-PARITY.md`
- `debug/p10-hf6-t1-lockdown-a-area-drop-repro-output.json`
- `debug/p10-hf6-t2-merge-lineage-diagnostics-output.json`
- `debug/p10-hf6-t3-fallback-subset-replacement-repro-output.json`
- `debug/p10-hf6-t4-area-count-parity-output.json`
- `debug/p10-hf6-t5-area-id-set-parity-output.json`
- `debug/p10-hf6-t6-control-final-set-parity-output.json`
- `debug/p10-hf6-t8-fallback-guard-output.json`
- `debug/p10-hf6-t9-browser-imported-multiarea-regression-output.json`
- `debug/p10-hf6-t10-fail-pass-proof-output.json`
