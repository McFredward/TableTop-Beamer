# P10-HF7-T4 Catalog-independent extraction PASS evidence

## Command

```bash
node debug/p10-hf7-t4-catalog-independent-extraction.mjs
```

## Result

- Unknown board-profile key `imported-lockdown-multi` is extracted even when the loaded board list only contains catalog boards.
- `debug/p10-hf7-t4-catalog-independent-extraction-output.json` reports `result: PASS`.

## Interpretation

Board-profile candidate extraction is now independent from loaded board IDs and no longer drops valid unknown/imported keys.
