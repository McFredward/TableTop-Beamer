# P10-HF3-T8 FAIL -> PASS proof (same diagnostics set)

## Command

```bash
node debug/p10-hf3-t1-lockdown-firefox-mobile-repro.mjs && \
node debug/p10-hf3-t2-defaults-override-repro.mjs && \
node debug/p10-hf3-t3-final-black-rectangle-repro.mjs && \
node debug/p10-hf3-t4-lifecycle-diagnostics.mjs && \
node debug/p10-hf3-t5-board-switch-final-contract.mjs && \
node debug/p10-hf3-t6-canonical-source-selection.mjs && \
node debug/p10-hf3-t8-fail-pass-proof.mjs
```

## PASS Output (excerpt)

```text
{"suite":"p10-hf3-t1-lockdown-firefox-mobile-repro","result":"PASS"}
{"suite":"p10-hf3-t2-defaults-override-repro","result":"PASS"}
{"suite":"p10-hf3-t3-final-black-rectangle-repro","result":"PASS"}
{"suite":"p10-hf3-t4-lifecycle-diagnostics","result":"PASS"}
{"suite":"p10-hf3-t5-board-switch-final-contract","result":"PASS"}
{"suite":"p10-hf3-t6-canonical-source-selection","result":"PASS"}
{"suite":"p10-hf3-t8-fail-pass-proof","result":"PASS"}
```

## FAIL baseline references (same suites)

- `.planning/phases/phase-10/P10-HF3-T1-REPRO-TRACE.md`
- `.planning/phases/phase-10/P10-HF3-T2-DEFAULTS-OVERRIDE-REPRO.md`
- `.planning/phases/phase-10/P10-HF3-T3-FINAL-BLACK-REPRO.md`
- `.planning/phases/phase-10/P10-HF3-T4-LIFECYCLE-DIAGNOSTICS.md`
- `.planning/phases/phase-10/P10-HF3-T5-BOARD-SWITCH-FINAL-CONTRACT.md`
- `.planning/phases/phase-10/P10-HF3-T6-CANONICAL-SOURCE-SELECTION.md`

## Artifacts

- `debug/p10-hf3-t1-lockdown-firefox-mobile-repro-output.json`
- `debug/p10-hf3-t2-defaults-override-repro-output.json`
- `debug/p10-hf3-t3-final-black-rectangle-repro-output.json`
- `debug/p10-hf3-t4-lifecycle-diagnostics-output.json`
- `debug/p10-hf3-t5-board-switch-final-contract-output.json`
- `debug/p10-hf3-t6-canonical-source-selection-output.json`
- `debug/p10-hf3-t8-fail-pass-proof-output.json`
