# P10-HF7-T5 Unknown-key migration retention PASS evidence

## Command

```bash
node debug/p10-hf7-t5-unknown-key-retention.mjs
```

## Result

- Migrated profile map retains unknown/imported key `imported-lockdown-multi`.
- Unknown key keeps deterministic multi-play-area set `['play-area-1', 'bunker']` and selected area `bunker`.
- `debug/p10-hf7-t5-unknown-key-retention-output.json` reports `result: PASS`.

## Interpretation

Migration no longer drops unknown board keys and no longer forces fallback-loss side effects for imported multi-area boards.
