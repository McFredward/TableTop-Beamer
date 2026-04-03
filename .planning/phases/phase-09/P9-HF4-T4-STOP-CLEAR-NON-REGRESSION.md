# P9-HF4-T4 Stop/Clear Semantics Non-Regression

## Requirement
Existing outside semantics must stay unchanged:
- `stop outside` stops outside deterministically.
- `clear all` stops outside deterministically.

## Verification
Regression script `debug/p9-hf4-repeated-room-start-regression.mjs` includes explicit lifecycle reset checks after:
1. outside-stop equivalent reset
2. clear-all equivalent reset

Both checks PASS and confirm outside restart remains deterministic **only** after explicit stop/clear.
