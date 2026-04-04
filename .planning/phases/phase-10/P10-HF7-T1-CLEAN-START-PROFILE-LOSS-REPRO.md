# P10-HF7-T1 Clean-start profile-loss RED repro

## Command

```bash
node debug/p10-hf7-t1-clean-start-profile-loss-repro.mjs
```

## Result (RED expected)

- Legacy extraction returns `null` when unknown board key is not present in currently loaded board IDs.
- Unknown imported multi-area key `imported-lockdown-multi` is absent after migration.
- Startup lane falls back to default selected play area (`play-area-1`) instead of retained multi-area board profile.
- `debug/p10-hf7-t1-clean-start-profile-loss-repro-output.json` reports `result: FAIL`.

## Interpretation

This deterministic RED repro captures the clean-local-storage startup failure mode: valid multi-area profile data is dropped before migration and default play area fallback is applied.
