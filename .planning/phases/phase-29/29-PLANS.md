# Phase 29 — Plan Index

**Created:** 2026-05-05
**Mode:** standard planning (post `/gsd-research-phase 29` + `/gsd-validation-phase 29`)
**Plans:** 7 across 5 waves
**Wave structure:** strictly serial (each wave depends on the previous)

## Wave Structure

| Wave | Plan | Type | Autonomous | Files Touched |
|------|------|------|------------|---------------|
| 0 | 29-W0-PLAN.md | execute | yes | 4 new test scaffolds + 1 extended test |
| 1 | 29-01-PLAN.md | execute | no (1 user-verify checkpoint) | 1 audit doc + 0 code |
| 2 | 29-02-PLAN.md | execute | yes | server.mjs + 6 src files (drop hiddenRoomNames + roomStateProfiles) |
| 2 | 29-03-PLAN.md | execute | yes | 7 src files (drop animationSoundMap + dead audio-mapping panel) |
| 2 | 29-04-PLAN.md | execute | yes | 12 src files (drop playAreaPolygon + deletedRoomIds + tombstone plumbing) |
| 3 | 29-05-PLAN.md | execute | yes | new lib/migrations/phase-29-purge.mjs + server.mjs boot wiring + 6 test bodies |
| 4 | 29-06-PLAN.md | execute | yes | server.mjs schema bump + filter helper + 3 test un-skips |

## Dependency Graph

```
W0 (test scaffolds)
   ↓
01 (audit doc + user verify)  ← gates Wave 2
   ↓
02 (hiddenRoomNames + roomStateProfiles)
   ↓
03 (animationSoundMap source-side)
   ↓
04 (playAreaPolygon + deletedRoomIds → BOARD_PROFILE_FIELDS at final 11 entries)
   ↓
05 (boot-time disk migration → cleans config/*.json on next boot)
   ↓
06 (BOARD_PACKAGE_SCHEMA v3 → v4 + filter helper)
```

All plans are **strictly serial**. Same-wave file overlap forced the Wave 2
plans (29-02, 29-03, 29-04) to run sequentially: each touches an overlapping
set of state/profile files (`runtime-state.js`, `runtime-bootstrap.js`,
`runtime-board-profiles.js`, etc.) so concurrent execution would create merge
conflicts.

## Decision Coverage

| Decision | Plan | Task |
|----------|------|------|
| D-01 (DEAD definition) | 29-01 | T1 (verbatim quote in audit doc) |
| D-02 (source-first then disk) | enforced by wave ordering W2 → W3 | — |
| D-03 (animationSoundMap lossless migration) | 29-05 | T1 (`migrateAnimationSoundMap`) + T3 (test) |
| D-04 (BOARD_PACKAGE_SCHEMA v3 → v4) | 29-06 | T1 (constant + error) + T2 (filter) |
| D-05 (verdicts to verify) | 29-01 | T1 (audit doc + per-DEAD-field traces) |
| D-06 (hard delete + git as backup) | 29-05 | implicit (no `_legacy.json` quarantine) |
| D-07 (export emits LIVE only) | 29-06 | T2 (filterBoardToLiveFields) |
| D-08 (import normalizer trims) | satisfied automatically by Wave 2's BOARD_PROFILE_FIELDS shrink | — |
| D-09 (wave granularity discretion) | embedded in this 7-plan structure | — |
| D-10 (script form discretion) | 29-05 | T1 (extracted ES module `lib/migrations/phase-29-purge.mjs`) |
| D-11 (test coverage discretion) | 29-02..29-04 task `read_first` blocks; W0 scaffolds | — |

Every D-XX has at least one plan + task carrying it; none are deferred to "v1
static" or other reduction.

## Risk Matrix Coverage (per RESEARCH §"Risk Matrix")

| Risk | Mitigation in plans |
|------|---------------------|
| Phase 27 align-mode dirty broadcast | 29-05 boot-time call runs BEFORE attachLiveWebSocket (verified by ordering acceptance criterion) |
| Phase 28 B1 lastUsedProfileName | 29-02..29-04 acceptance criteria assert `"lastUsedProfileName"` still in BOARD_PROFILE_FIELDS |
| Phase 28 B5 asset manifest | 29-02..29-04 + 29-05 acceptance: `config/asset-manifest.json` byte-unchanged |
| Phase 28 h3 outside-fx mirror | No plan touches `runtime-live-sync-core.js` (confirmed by `files_modified` audit) |
| Phase 26 roomCatalog mutation | 29-04 explicitly handles `mergeRoomCatalog` signature change |
| Multi-board switching B2 | 29-02 / 29-04 strip lockstep with `runtime-board-switch.js` |
| Pitfall 1 (undo regression) | 29-04 Task 2 strips tombstone calls FIRST, runs suite, then proceeds |
| Pitfall 2 (migration after strip) | 29-05 Task 1 has explicit `// MIGRATION FIRST — DO NOT REORDER` comment |
| Pitfall 6 (broadcast piggy-back) | 29-05 Task 2 verifies boot-call ordering (after manifest, before listen) |

## Per-Wave Verification Gate

| Wave | Gate (must be GREEN before next wave) |
|------|---------------------------------------|
| 0 | `node --test test/` exits 0; no production code changed |
| 1 | `29-AUDIT.md` exists + user explicitly approved (Task 2 checkpoint resolved) |
| 2 | `node --test test/` GREEN after each plan; BOARD_PROFILE_FIELDS shrinks 15 → 13 → 13 → 11 across 29-02 / 29-03 / 29-04 |
| 3 | `node --check server.mjs` + `node --test test/` GREEN; new tests un-skipped pass; partial server boot logs `[phase-29-purge] complete` |
| 4 | `node --test test/` GREEN; `BOARD_PACKAGE_SCHEMA` is v4; bundle-schema tests all pass; 0 skipped |

## Phase-Closure Action (D-06 sicherheitsnetz)

After Wave 4 lands and the user has executed `node server.mjs` ONCE
(triggers the 29-05 disk migration), the closure SUMMARY captures:

```bash
git status config/global-defaults.json config/boards/*.json
git diff config/global-defaults.json config/boards/*.json | head -200
```

That diff is the human-readable record of what the boot migration removed
from disk.
