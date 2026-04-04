# P10-HF5-T10 FAIL -> PASS proof (same HF5 diagnostics set)

## Command

```bash
node debug/p10-hf5-t1-multi-vs-single-repro.mjs && \
node debug/p10-hf5-t2-lockdown-fallback-repro.mjs && \
node debug/p10-hf5-t3-firefox-parity-diagnostics.mjs && \
node debug/p10-hf5-t4-canonical-source-diagnostics.mjs && \
node debug/p10-hf5-t6-shared-resolver-contract.mjs && \
node debug/p10-hf5-t7-lifecycle-parity.mjs && \
node debug/p10-hf5-t8-browser-parity.mjs && \
node debug/p10-hf5-t9-imported-multiarea-regression.mjs && \
node debug/p10-hf5-t10-fail-pass-proof.mjs
```

## Result

- `debug/p10-hf5-t10-fail-pass-proof-output.json` -> `result: PASS`
- RED evidence files for T1/T2/T4 contain explicit fail traces.
- Post-fix diagnostics for T1/T2/T3/T4/T6/T7/T8/T9 are PASS.

## Artifacts

- `.planning/phases/phase-10/P10-HF5-T1-REPRO-MULTI-VS-SINGLE.md`
- `.planning/phases/phase-10/P10-HF5-T2-LOCKDOWN-FALLBACK-REPRO.md`
- `.planning/phases/phase-10/P10-HF5-T4-CANONICAL-SOURCE-DIAGNOSTICS.md`
- `debug/p10-hf5-t1-multi-vs-single-repro-output.json`
- `debug/p10-hf5-t2-lockdown-fallback-repro-output.json`
- `debug/p10-hf5-t3-firefox-parity-diagnostics-output.json`
- `debug/p10-hf5-t4-canonical-source-diagnostics-output.json`
- `debug/p10-hf5-t6-shared-resolver-contract-output.json`
- `debug/p10-hf5-t7-lifecycle-parity-output.json`
- `debug/p10-hf5-t8-browser-parity-output.json`
- `debug/p10-hf5-t9-imported-multiarea-regression-output.json`
- `debug/p10-hf5-t10-fail-pass-proof-output.json`
