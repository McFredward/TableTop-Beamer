# P9-HF3-T7 - Deterministic Sync Invariants Under Stream Mode

## Scope

Regression check for ordering/version/idempotent apply invariants while stream mode is enabled.

## Procedure

1. Start isolated server on port `4174`.
2. Run `node debug/p9-hf3-sync-invariants.mjs` with `TT_BEAMER_BASE_URL=http://127.0.0.1:4174`.
3. Inspect `debug/p9-hf3-sync-invariants-output.json`.

## Assertions

- Monotonic version progression across accepted commands.
- Duplicate `mutationId` is idempotent (`duplicate=true`, `applied=false`).
- Snapshot version is never older than the latest accepted command version.
- Stream mode state (`runtime.finalOutputMode=stream`) is present in authoritative snapshot.

## Result

PASS (all checks true).
