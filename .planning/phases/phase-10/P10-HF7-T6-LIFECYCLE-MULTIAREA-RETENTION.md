# P10-HF7-T6 Lifecycle multi-play-area retention PASS evidence

## Command

```bash
node debug/p10-hf7-t6-lifecycle-multiarea-retention.mjs
```

## Result

- Startup, default-apply, and reload lanes retain unknown/imported board key `imported-lockdown-multi`.
- All lifecycle lanes keep identical area set `['play-area-1', 'bunker']` and selected area `bunker`.
- `debug/p10-hf7-t6-lifecycle-multiarea-retention-output.json` reports `result: PASS`.

## Interpretation

Multi-play-area retention is deterministic across startup/default-apply/reload and does not collapse to default play-area fallback.
