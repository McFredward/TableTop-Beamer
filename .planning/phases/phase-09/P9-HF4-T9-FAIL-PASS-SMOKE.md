# P9-HF4-T9 FAIL->PASS + Runtime Smoke

## Commands
```bash
node debug/p9-hf4-fail-pass.mjs
node debug/p9-hf4-runtime-smoke.mjs
```

## FAIL->PASS coverage
- startup duplicate outside run: FAIL reproduced, PASS guarded
- startup phantom entry: FAIL reproduced, PASS guarded
- board switch parity race: FAIL reproduced, PASS guarded by overlay hold

## Runtime smoke coverage
- bootstrap idempotency (duplicate init call does not double-run)
- runtime profile defaulting (weak device -> safe)
- runtime profile overrides (URL + persisted selector)

## Artifacts
- `debug/p9-hf4-fail-pass-output.json`
- `debug/p9-hf4-runtime-smoke-output.json`
