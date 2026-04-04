# P10-HF5-T3 Diagnostics - Firefox headless/parity traces

## Command

`node debug/p10-hf5-t3-firefox-parity-diagnostics.mjs`

## Result

- `debug/p10-hf5-t3-firefox-parity-diagnostics-output.json` -> `result: PASS`
- Browser lanes captured: `firefox`, `chrome`, `mobile-chrome`
- Lifecycle probes captured: `startup`, `reload`, `apply-defaults`
- Trace parity is deterministic across lanes (`parity.firefox/chrome/mobile-chrome = true`).

## Observed blocker signal in traces

- All lanes currently select `invalid-alpha` and report `fellBackToDefaultHex: true` while valid canonical areas exist.
- This confirms the fallback-selection drift is executable and traceable before applying the root-cause fix.
