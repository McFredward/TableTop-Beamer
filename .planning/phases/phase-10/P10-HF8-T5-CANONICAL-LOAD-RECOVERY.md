# P10-HF8-T5 — Canonical-load recovery fix

- Script: `node debug/p10-hf8-t5-canonical-load-recovery.mjs`
- Output: `debug/p10-hf8-t5-canonical-load-recovery-output.json`
- Result: **PASS**

## Fix summary

- `applyGlobalDefaultsPayloadToState` no longer applies polygon precedence with local fallback ownership.
- Loaded defaults are applied as canonical board-owned play-area source, restoring deterministic board-specific selections and area-id sets.

## Evidence

Single-area, multi-area, and imported multi-area boards all keep canonical selected area + canonical area-id set.
