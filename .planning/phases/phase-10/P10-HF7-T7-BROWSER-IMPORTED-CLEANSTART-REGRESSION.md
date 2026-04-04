# P10-HF7-T7 Browser + imported/multi-area clean-start regression PASS

## Command

```bash
node debug/p10-hf7-t7-browser-imported-cleanstart-regression.mjs
```

## Result

- Chrome, Firefox, and mobile-class Chrome lanes all retain area-count parity (`2`) and area-id-set parity (`['play-area-1', 'bunker']`) for unknown/imported board key `imported-lockdown-multi`.
- Selected play area remains `bunker` in all lanes.
- Control/final set parity checks are PASS in every lane.
- `debug/p10-hf7-t7-browser-imported-cleanstart-regression-output.json` reports `result: PASS`.

## Interpretation

The strict browser/imported matrix with clean-start coverage is deterministic and no longer falls back to default single-area behavior.
