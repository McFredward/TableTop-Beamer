# P10-HF7-T3 Unknown-board-key migration-drop RED repro

## Command

```bash
node debug/p10-hf7-t3-unknown-key-migration-drop-repro.mjs
```

## Result (RED expected)

- Migration iterates only loaded board IDs and omits unknown/imported key `imported-lockdown-multi`.
- Observed migrated key set excludes unknown key and its `bunker` play area.
- `debug/p10-hf7-t3-unknown-key-migration-drop-repro-output.json` reports `result: FAIL`.

## Interpretation

The legacy migration path deterministically drops unknown board keys, causing multi-play-area retention drift after startup/default-apply/reload.
