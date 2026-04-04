# P10-HF3-T4 Diagnostics - startup/load/apply-defaults/reload polygon ownership

## Command

`node debug/p10-hf3-t4-lifecycle-diagnostics.mjs`

## Result

- Status: **FAIL (expected RED baseline)**
- Failing lifecycle steps: `startup-load`, `apply-defaults`, `reload`
- Assertion: `Lifecycle ownership/apply order drift detected`

## Console Output (excerpt)

```text
AssertionError [ERR_ASSERTION]: Lifecycle ownership/apply order drift detected in steps: startup-load, apply-defaults, reload

3 !== 0
```

## Artifact

- `debug/p10-hf3-t4-lifecycle-diagnostics-output.json`
