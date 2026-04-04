# P10-HF4-T10 FAIL -> PASS proof (same HF4 diagnostics set)

## Command

```bash
node debug/p10-hf4-t1-runtime-panels-repro.mjs && \
node debug/p10-hf4-t2-runtime-panels-diagnostics.mjs && \
node debug/p10-hf4-t4-settings-ownership-repro.mjs && \
node debug/p10-hf4-t6-ship-clip-repro.mjs && \
node debug/p10-hf4-t8-browser-parity.mjs && \
node debug/p10-hf4-t9-final-output-canonical.mjs && \
node debug/p10-hf4-t10-fail-pass-proof.mjs
```

## Result

- `debug/p10-hf4-t10-fail-pass-proof-output.json` -> `result: PASS`
- RED evidence files for T1/T2/T4/T6 contain explicit fail traces.
- Post-fix diagnostics for T1/T2/T4/T6/T8/T9 are PASS.

## Artifacts

- `.planning/phases/phase-10/P10-HF4-T1-REPRO-TRACE.md`
- `.planning/phases/phase-10/P10-HF4-T2-RUNTIME-PANEL-DIAGNOSTICS.md`
- `.planning/phases/phase-10/P10-HF4-T4-OWNERSHIP-REPRO.md`
- `.planning/phases/phase-10/P10-HF4-T6-SHIP-CLIP-REPRO.md`
- `debug/p10-hf4-t1-runtime-panels-repro-output.json`
- `debug/p10-hf4-t2-runtime-panels-diagnostics-output.json`
- `debug/p10-hf4-t4-settings-ownership-repro-output.json`
- `debug/p10-hf4-t6-ship-clip-repro-output.json`
- `debug/p10-hf4-t8-browser-parity-output.json`
- `debug/p10-hf4-t9-final-output-canonical-output.json`
- `debug/p10-hf4-t10-fail-pass-proof-output.json`
