# P10-HF4-T2 Diagnostics - runtime panel binding lifecycle + load-order exposure

## Command

`node debug/p10-hf4-t2-runtime-panels-diagnostics.mjs`

## Observed RED result

- Assertion failed: `Runtime panel API must remain exposed + bind-callable across load-order scenarios`
- `debug/p10-hf4-t2-runtime-panels-diagnostics-output.json` reports `result: FAIL`
- At least one scenario lacks `TT_BEAMER_RUNTIME_PANELS` and/or bind-callable `syncRuntimePanelsFromState`

## Diagnostic coverage

- Scenario A: runtime-panels script before app-shell
- Scenario B: app-shell before runtime-panels script
- Contract: exposure + binding must be deterministic in both orders
