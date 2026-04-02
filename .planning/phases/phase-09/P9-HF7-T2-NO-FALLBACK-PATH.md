# P9-HF7-T2 No-Fallback Path Closure

## Goal

Remove active `/output/final` client fallback runtime paths (`auto`/`client`) and enforce stream-only mode.

## Changes

- Server final-output mode normalization is now stream-only.
- Runtime final-output mode normalization is stream-only.
- `/output/final` mode selector is locked to a single disabled `stream` option.
- Client error/fault handlers no longer downgrade `data-final-output-path` to `client`.

## Verification

- Script: `node debug/p9-hf7-t2-no-fallback-path.mjs`
- Output: `debug/p9-hf7-t2-no-fallback-path-output.json`
- PASS checks:
  - Attempts to set `auto`/`client` are persisted as `stream`.
  - Final-output mode selector has exactly one option.
  - No `auto`/`client` mode options remain in output HTML.

## Verdict

No active fallback mode path remains for `/output/final`; stream-only enforcement is active.
