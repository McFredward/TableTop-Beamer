# P10-HF7-T2 Extraction coupling diagnostics RED evidence

## Command

```bash
node debug/p10-hf7-t2-extraction-coupling-diagnostics.mjs
```

## Result (RED expected)

- With loaded boards limited to catalog IDs (`nemesis-lockdown-a`, `nemesis-lockdown-b`), extraction drops candidate map containing unknown imported key.
- Adding unknown key to loaded list flips extraction from `dropped` to `retained`.
- `debug/p10-hf7-t2-extraction-coupling-diagnostics-output.json` reports `result: FAIL`.

## Interpretation

Extraction behavior is directly coupled to loaded board catalog IDs, confirming the HF7 root cause.
