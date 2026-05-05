---
status: partial
phase: 29-persistence-audit-legacy-cleanup
source: [29-VERIFICATION.md]
started: 2026-05-05T13:00:00Z
updated: 2026-05-05T13:00:00Z
---

## Current Test

[awaiting human testing — 3 items]

## Tests

### 1. Visual smoke: animations play correctly post-cleanup
expected: After server boot (which triggers the one-shot purge migration), open /output/ and trigger room animations + outside FX + default animations. All sounds play correctly via the per-animation `soundAssetRef` paths (the `animationSoundMap` fallback is gone). No silent animations, no errors.
result: [pending]

### 2. Bundle import/export HTTP roundtrip with v4 schema
expected: (1) Export Nemesis Board B → re-import as "Nemesis Test 29" → succeeds, lands as new independent board, all data 1:1 (rooms, play areas, FX libraries, default animations). (2) Try importing an OLD v3 zip → server returns HTTP 400 with code `SCHEMA_OUTDATED` and message "Package format outdated (schema=...). Re-export from a v0.29+ server.". UI surfaces this error visibly.
result: [pending]

### 3. Undo/redo room-delete gesture
expected: Delete a room via right-click → undo (Ctrl+Z) → room reappears with all its geometry/state. Redo (Ctrl+Y) → room is deleted again. The flow now uses board.rooms snapshot directly (no tombstone array). Confirms Pitfall 1 mitigation at operator level.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
