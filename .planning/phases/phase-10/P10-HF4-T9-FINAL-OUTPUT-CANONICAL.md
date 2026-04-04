# P10-HF4-T9 Final-output canonical clip-source enforcement

## Command

`node debug/p10-hf4-t9-final-output-canonical.mjs`

## Result

- `debug/p10-hf4-t9-final-output-canonical-output.json` -> `result: PASS`
- Valid canonical polygons remain primary clip source.
- Invalid provided polygons no longer trigger invalid-default fallback.
- Default fallback remains available only when polygon source is truly missing.
