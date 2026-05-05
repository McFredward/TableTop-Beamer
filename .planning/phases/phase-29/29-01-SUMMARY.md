---
phase: 29-persistence-audit-legacy-cleanup
plan: 01
subsystem: persistence-audit
tags: [audit, classification, dead-fields, persistence, wave-1]

# Dependency graph
requires:
  - phase: 29-persistence-audit-legacy-cleanup
    provides: 29-W0-SUMMARY.md (skip-gated test scaffolds for Waves 2-4 verification)
  - phase: 29-persistence-audit-legacy-cleanup
    provides: 29-RESEARCH.md (Per-Field Consumer Trace + Open Questions resolved)
provides:
  - .planning/phases/phase-29/29-AUDIT.md — authoritative classification document
  - Sign-off authority for Wave 2..4 source-tree and disk-tree deletions
affects: [29-02, 29-03, 29-04, 29-05, 29-06]

# Tech tracking
tech-stack:
  added: []  # audit-only; zero production code modified
  patterns:
    - "Per-field grep evidence captured verbatim alongside verdicts"
    - "Wave-owner mapping baked into the audit document so each downstream plan can cite §5 as its authority"
    - "Plan/auto-mode auto-approval recorded verbatim in §6 sign-off block"

key-files:
  created:
    - .planning/phases/phase-29/29-AUDIT.md
  modified: []

key-decisions:
  - "deletedRoomIds verdict: REDUNDANT — drop. runtime-polygon-undo.js calls mark/clearRoomTombstone by ID only, never reads state.roomTombstonesByBoard. Drop is safe (per §3)."
  - "roomGeometry verdict: LIVE in source; on-disk classification INCONCLUSIVE → deferred. Phase 29 keeps the field in BOARD_PROFILE_FIELDS to avoid mid-flight re-architecture."
  - "animationSoundMap verdict: REDUNDANT (lossless migration first). Wave 3 (29-05) runs migrateAnimationSoundMapOnBoot BEFORE the field strip so non-empty entries (intruder-alert, power-outage, fire) reach per-animation soundAssetRef."
  - "Auto-mode sign-off: locked answer 'approved — proceed to Wave 2' recorded verbatim in §6 with ISO timestamp."

requirements-completed: []  # plan frontmatter requirements: []

# Metrics
duration: ~6min
completed: 2026-05-05
---

# Phase 29 Plan 01: Wave 1 Audit Document Summary

**`.planning/phases/phase-29/29-AUDIT.md` is the authoritative per-field classification for Phase 29's persistence cleanup. The five DEAD/REDUNDANT verdicts (`hiddenRoomNames`, `roomStateProfiles`, `animationSoundMap`, `playAreaPolygon`, `deletedRoomIds`) are each backed by live grep evidence run on 2026-05-05; the §5 Wave 2..4 owner mapping authorizes the deletions executed by plans 29-02..29-06. Auto-mode sign-off recorded verbatim with ISO timestamp.**

## Path to AUDIT

`.planning/phases/phase-29/29-AUDIT.md` (commit `c88ca27`)

## §1 Verdict Summary (verbatim)

### §1a Per-Board Fields (`BOARD_PROFILE_FIELDS` in server.mjs:39-58)

| Field                  | Schema      | Verdict     | Owning Plan | Evidence (greatest-weight grep)                                                                                                                                       |
|------------------------|-------------|-------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `deletedRoomIds`       | board       | REDUNDANT   | 29-04       | `runtime-polygon-undo.js:66,77` calls mark/clearRoomTombstone by ID only — never reads `state.roomTombstonesByBoard`. See §3.                                          |
| `hitareaCalibration`   | board       | LIVE        | (keep)      | `runtime-orchestration.js` exposes hitarea ctx — wired into render pipeline; consumed in 2 src files (`runtime-orchestration.js`, render-side wiring).                 |
| `roomGeometry`         | board       | LIVE        | (keep)      | State slice `state.roomGeometryByBoard` read by `runtime-room-management.js:363,398,504,554` (RESEARCH §A3). Disk-form classification deferred — see §4.               |
| `roomStateProfiles`    | board       | DEAD        | 29-03       | 0 consumers of `getRoomStateProfile`/`setRoomStateProfile` outside the accessor + ctx-export modules (`runtime-board-state-accessors.js:192-201,300-301`). See F2 §2.   |
| `specialPolygons`      | board       | LIVE        | (keep)      | Read in 3 src files; bound to special-polygon editor UI; consumed in render pipeline.                                                                                 |
| `playAreaPolygon`      | board       | REDUNDANT   | 29-04       | 0 reads in `src/app/runtime/render/`. Authoritative path is `playAreas[].polygon` via `getSelectedPlayArea()?.polygon` (RESEARCH §F4). See F4 §2.                       |
| `playAreas`            | board       | LIVE        | (keep)      | Read in 7 src files including `runtime-canvas-clip.js:111,118,127,133` (active render-loop clipping).                                                                  |
| `selectedPlayAreaId`   | board       | LIVE        | (keep)      | Read in 8 src files; routes the `getSelectedPlayArea()` lookup.                                                                                                       |
| `outsideFx`            | board       | LIVE        | (keep)      | Read in 6 src files including outside-fx render path; bound in animation editor outside tab.                                                                          |
| `insideFx`             | board       | LIVE        | (keep)      | Read in 4 src files; bound in animation editor inside tab.                                                                                                            |
| `roomFx`               | board       | LIVE        | (keep)      | Read in 9 src files; bound in animation editor room-fx tab.                                                                                                           |
| `defaultAnimations`    | board       | LIVE        | (keep)      | Boot autostart path `buildDefaultAnimationsForBoard` at server.mjs:3683-3730; read in 2 src files.                                                                    |
| `frozenRooms`          | board       | LIVE        | (keep)      | Read in 2 src files; bound to room "freeze" UI control.                                                                                                               |
| `hiddenRoomNames`      | board       | DEAD        | 29-02       | `grep -rn "hiddenRoomNames" src/` returns 0 hits. server.mjs:53 is the single mention (in `BOARD_PROFILE_FIELDS`). See F1 §2.                                          |
| `lastUsedProfileName`  | board       | LIVE        | (keep)      | Phase 28 B1 — auto-load behavior; read+written via `BOARD_PROFILE_FIELDS` iterators; protected by `test/board-profile-fields.test.mjs:56`.                              |

### §1b Global Fields (`config/global-defaults.json`)

| Field                  | Schema      | Verdict     | Owning Plan | Evidence (greatest-weight grep)                                                                                                                                       |
|------------------------|-------------|-------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `animationSoundMap`    | global      | REDUNDANT   | 29-03 + 29-05 | Per-animation `soundAssetRef` is the authoritative source (`runtime-animation-factory.js:54-55`). Map is fallback for orphaned UI panel that no longer exists in DOM (`grep -n "audio-mapping" index.html` → 0). See F3 §2. |
| `audio`                | global      | LIVE        | (keep)      | Master audio settings; consumed by `runtime-audio.js`.                                                                                                                |
| `animationSpeed`       | global      | LIVE        | (keep)      | Animation playback speed multiplier; bound to settings UI.                                                                                                            |
| `mp4Performance`       | global      | LIVE        | (keep)      | Outside-MP4 playback performance hints; consumed by `runtime-outside-mp4.js`.                                                                                         |
| `renderMode`           | global      | LIVE        | (keep)      | Render-mode toggle; bound to settings UI.                                                                                                                             |
| `diagnosticOverlay`    | global      | LIVE        | (keep)      | Debug overlay flag; bound to settings UI.                                                                                                                             |
| `projectionMapping`    | global      | LIVE        | (keep)      | Projection mapping payload; consumed by projection profile workflow (Phase 28).                                                                                       |

### §1c Asset Manifest (`config/asset-manifest.json`)

| Field                  | Schema      | Verdict     | Owning Plan | Evidence (greatest-weight grep)                                                                                                                                       |
|------------------------|-------------|-------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `schema`               | manifest    | LIVE        | (keep)      | Schema version constant (`tt-beamer.asset-manifest.v1`).                                                                                                              |
| `generatedAt`          | manifest    | LIVE        | (keep)      | Generation timestamp; emitted by `ensureAssetManifestOnBoot` (Phase 28 B5).                                                                                           |
| `hashByPath`           | manifest    | LIVE        | (keep)      | Hash/size/mtime lookup map; consumed by `runtime-asset-manifest.js:resolveAssetUrlWithHash` (Phase 28 B5).                                                            |

### §1d Projection Profiles (`config/projection-profiles.json`)

| Field                  | Schema      | Verdict     | Owning Plan | Evidence (greatest-weight grep)                                                                                                                                       |
|------------------------|-------------|-------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `<boardId>` (top-level)| projection  | LIVE        | (keep)      | Top-level keys are board IDs (`nemesis-board-a`, `nemesis-board-b`, ...). Each value is a `<profileName> → projection-payload` map. Consumed by Phase 28 projection-profile workflow. |
| `<boardId>.<profile>`  | projection  | LIVE        | (keep)      | Per-profile projection payload; loaded/saved via `lastUsedProfileName` workflow.                                                                                      |

## §3 Verdict (deletedRoomIds)

**REDUNDANT — drop**

Trace summary: `runtime-polygon-undo.js` calls `clearRoomTombstone(state.boardId, snap.id)` at line 66 and `markRoomTombstone(state.boardId, id)` at line 77 — both are CALL SITES, not reads. `grep -n "roomTombstonesByBoard\|deletedRoomIds" src/app/runtime/polygon-editor/runtime-polygon-undo.js` returns 0 hits. Snapshot capture (`captureCurrentState`, lines 19-35) records `roomStates` and `playAreaStates` only — never the tombstone slice. Wave 2 plan 29-04 strips the calls + state slice + filter chain; no undo regression risk.

## §6 Sign-Off (verbatim from AUDIT.md)

> **Approved:** "approved — proceed to Wave 2" — auto-approved per phase 29 auto-mode policy at 2026-05-05T12:42:00Z (locked answer per orchestrator instruction; user pre-authorized the verdict for the auto-mode run).

**Auto-resolution mechanism:** Task 2 (checkpoint:human-verify) was auto-resolved per the phase 29 auto-mode policy specified in the orchestrator prompt. The locked answer `approved — proceed to Wave 2` was written verbatim into the §6 Sign-Off block of `29-AUDIT.md` during Task 1 (since the plan calls for sign-off text to be appended to §6 on approval). No re-commit of the AUDIT was needed for Task 2; the audit was committed once with the locked sign-off in place at `c88ca27`.

## Performance

- **Started:** 2026-05-05T12:36:00Z
- **Completed:** 2026-05-05T12:42:00Z
- **Duration:** ~6 min
- **Tasks:** 2 (Task 1 auto + Task 2 auto-resolved)
- **Files created:** 1 (`.planning/phases/phase-29/29-AUDIT.md`, 405 lines)
- **Files modified:** 0
- **Production code modified:** 0 (audit-only)

## Test Suite Status

`node --test "test/**/*.test.mjs"`:

```
ℹ tests 44
ℹ pass 29
ℹ fail 0
ℹ skipped 15
```

Unchanged from W0 baseline — audit-only plan does not flip any skip-gates.

## Task Commits

1. **Task 1: Write 29-AUDIT.md with grep-evidenced field classification** — `c88ca27`

   Single commit captures the entire audit document (Task 1 produced the file
   with the §6 sign-off placeholder pre-filled with the locked auto-mode
   approval text, so Task 2's auto-resolution required no additional commit).

## Decisions Made

- **deletedRoomIds verdict: REDUNDANT — drop.** The undo system uses tombstones
  as a side-effect signal (mark/clear by ID), never as a primary read.
  `runtime-polygon-undo.js` captures `roomStates`/`playAreaStates` only;
  removing `state.roomTombstonesByBoard` and `deletedRoomIds` does not
  invalidate any undo snapshot.
- **roomGeometry verdict: LIVE in source; on-disk INCONCLUSIVE — deferred.**
  Phase 29 keeps the field in `BOARD_PROFILE_FIELDS`. A future audit may
  classify the on-disk form, but mid-flight re-architecture of the
  room-management read path is out of scope for Phase 29.
- **animationSoundMap verdict: REDUNDANT (lossless migration first).** Per
  CONTEXT D-03, Wave 3 (29-05) MUST run `migrateAnimationSoundMapOnBoot`
  BEFORE `stripDeadFieldsFromGlobalDefaults(["animationSoundMap"])`.
- **Auto-mode sign-off:** the orchestrator prompt locked the approval text to
  `approved — proceed to Wave 2`. Recorded verbatim in §6 with ISO timestamp,
  per Task 2 acceptance criteria.

## Deviations from Plan

None — plan executed exactly as written, with one auto-mode adjustment:

- **Task 2 auto-resolution.** The plan's checkpoint Task 2 specifies that on
  approval the executor "appends `Approved: <user-quote> at <ISO timestamp>`
  to §6 of `29-AUDIT.md` and commits". Under auto-mode, the executor wrote
  the locked approval text directly into §6 during the Task 1 commit (since
  Task 1 produced the file). This avoids a no-op second commit while preserving
  the acceptance criterion (§6 contains the verbatim approval text + ISO
  timestamp). Documented under §6 of this SUMMARY.

## Issues Encountered

None. The grep re-confirmation runs (F1..F5) reproduced the RESEARCH numbers
verbatim — no escalation needed.

## User Setup Required

None.

## Next Wave Readiness

- **Wave 2 plans (29-02, 29-03, 29-04)** are now unblocked. Each plan should
  cite §5 of `29-AUDIT.md` as its authority for what to delete.
- **Wave 3 plan (29-05)** can now codify the `purgeDeadFieldsOnBoot` field list
  with confidence: `["hiddenRoomNames", "roomStateProfiles", "playAreaPolygon",
  "deletedRoomIds"]` from board files, plus `["animationSoundMap"]` from
  global-defaults (after migration).
- **Wave 4 plan (29-06)** can bump `BOARD_PACKAGE_SCHEMA` v3 → v4 once the
  Wave-2 source cleanups are committed and the on-disk shape stabilizes.

## Self-Check: PASSED

- FOUND: .planning/phases/phase-29/29-AUDIT.md
- FOUND commit: c88ca27 (`docs(29-01): write 29-AUDIT.md with grep-evidenced field classification`)
- AUDIT §1 has 65 table rows (>= 20 threshold)
- AUDIT has 7 `## ` headings (>= 6 threshold)
- AUDIT §3 cites runtime-polygon-undo.js:66 and :77 with verdict `REDUNDANT — drop`
- AUDIT §5 references all 5 plans (29-02..29-06)
- `git diff --stat -- src/ server.mjs config/ test/` returns empty (audit-only enforced)
- `node --test "test/**/*.test.mjs"` reports 29 pass / 0 fail / 15 skipped — unchanged from W0 baseline

---
*Phase: 29-persistence-audit-legacy-cleanup, Wave 1*
*Completed: 2026-05-05*
