# P10-HF8-T3 — Canonical lineage and defaults-reapply diagnostics

- Script: `node debug/p10-hf8-t3-canonical-lineage-diagnostics.mjs`
- Output: `debug/p10-hf8-t3-canonical-lineage-diagnostics-output.json`
- Result: **PASS (diagnostics emitted)**

## Diagnostic contract

For each lifecycle (`startup`, `reload`, `apply-defaults`, `board-switch`) and each board lane (single-area, multi-area, imported multi-area), the diagnostics compare:

- canonical selected area + area-id set
- legacy decision selected area + area-id set
- fixed decision selected area + area-id set

## Key finding

Legacy precedence overrides canonical selection in every lane (`legacyOverrideCount: 12`), confirming deterministic root-cause lineage for all-board fallback collapse and defaults-reapply drift.
