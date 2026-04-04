# P10-HF5-T2 Repro Trace - Lockdown A default fallback hex despite valid canonical play-areas

## Command

`node debug/p10-hf5-t2-lockdown-fallback-repro.mjs`

## Observed RED result

- Assertion failed: `Lockdown A must not display default fallback hex when valid canonical multi-area payload exists`
- `debug/p10-hf5-t2-lockdown-fallback-repro-output.json` reports `result: FAIL`
- Firefox and mobile-chrome lanes both keep selecting `lockdown-fallback-id`, and selected polygon collapses to default fallback hex.

## Why this is the expected RED baseline

The deterministic Lockdown A repro confirms the exact field symptom: a valid canonical multi-area payload is present, but fallback geometry still wins selection and render source resolution.
