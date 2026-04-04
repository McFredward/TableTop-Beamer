# P10-HF4-T3 Root Cause and Fix - runtime panel exposure/load-order

## Root cause

- `src/app.js` enforces global domain presence for `TT_BEAMER_RUNTIME_PANELS`.
- `src/app/ui/runtime-panels-controller.js` exposed only `TT_BEAMER_UI_RUNTIME_PANELS`, leaving the required canonical key unset.
- Runtime panel binding in orchestration also referenced only the legacy key, making exposure/load-order behavior brittle.

## Fix

- Runtime panel controller now exposes a single API instance under both keys:
  - `window.TT_BEAMER_RUNTIME_PANELS`
  - `window.TT_BEAMER_UI_RUNTIME_PANELS`
- Runtime orchestration now resolves either key, synchronizes missing alias keys, and guards missing API with explicit diagnostic logging instead of unsafe direct access.

## Verification

- `node debug/p10-hf4-t1-runtime-panels-repro.mjs` -> PASS
- `node debug/p10-hf4-t2-runtime-panels-diagnostics.mjs` -> PASS
