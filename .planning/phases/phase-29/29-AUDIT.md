# Phase 29 Audit: Persistence Field Classification

**Date:** 2026-05-05
**Plan:** 29-01 (Wave 1 — audit-only; no production code modified)
**Authority:** This document is the gate that authorizes the deletions executed by
plans 29-02, 29-03, 29-04 (Wave 2 source-cleanup), 29-05 (Wave 3 disk-purge), and
29-06 (Wave 4 schema-bump). Per CONTEXT D-02 the source-tree cleanup MUST NOT
proceed until §6 below is signed off.

## D-01 Definition (verbatim from CONTEXT)

> Ein Feld ist DEAD wenn ALLE folgenden gelten:
> 1. Keine Funktion in der Draw-Loop oder den Render-Modulen
>    (`runtime-draw-loop.js`, `runtime-effect-visuals.js`,
>    `runtime-outside-mp4.js`, `runtime-gif-playback.js`,
>    `runtime-polygon-editor`, `runtime-room-management.js`)
>    liest den Wert für sichtbares Rendering.
> 2. Keine UI-Komponente (Animation Editor, FX-Panels, Room-Editor,
>    Settings-Tab) bindet den Wert an einen Input-Element oder Display.
>
> Read-Pfade die nur in Normalizers / Default-Buildern / get-Accessoren
> existieren OHNE weiteren Konsum zählen NICHT als LIVE — sie sind
> Plumbing ohne Effekt.

REDUNDANT = a duplicate persistence path whose value is already authoritatively
held by another LIVE field. Migration may be required before drop (D-03).

## §1 Verdict Summary

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

## §2 Per-DEAD-Field Detailed Traces

### F1: `hiddenRoomNames` — DEAD

**Verdict:** DEAD. Neither read nor written anywhere outside the `BOARD_PROFILE_FIELDS`
iteration list itself.

**Live grep run 2026-05-05 (re-confirmation of RESEARCH §F1):**

```
$ grep -rn "hiddenRoomNames" src/
(0 hits)

$ grep -n "hiddenRoomNames" server.mjs
53:  "hiddenRoomNames",
```

| Site type | Location | Verdict |
|-----------|----------|---------|
| Read site | (none) | — |
| Write site | (none) | — |
| Render-loop consumer | (none) | — |
| UI binding | (none) | — |

**On-disk presence:** `config/boards/nemesis-board-a.json` carries
`"hiddenRoomNames": {}` (empty dict). Pure ballast.

**Wave 2 plan (29-02) action:**
- Drop `"hiddenRoomNames"` from `BOARD_PROFILE_FIELDS` (server.mjs:53).
- Update `test/board-profile-fields.test.mjs` LIVE-only assertion (already
  skip-gated as Phase-29 W2 in 29-W0-SUMMARY).
- Wave 3 plan (29-05) strips `"hiddenRoomNames"` key from each
  `config/boards/<id>.json` via `purgeDeadFieldsOnBoot`.

**Risk:** None. Zero call sites means zero risk of breakage.

### F2: `roomStateProfiles` — DEAD

**Verdict:** DEAD. Plumbing exists (state slice + accessors + normalizers + ctx
re-exports + bootstrap defaults + apply path) but **no render-loop consumer
and no UI binding** exists for the `broken`/`burning`/`alienCount`/`corpse`
sub-fields.

**Live grep run 2026-05-05 (re-confirmation of RESEARCH §F2):**

```
$ grep -rn "roomStateProfiles\|getRoomStateProfile\|setRoomStateProfile" src/
src/app/runtime/state/runtime-board-profiles.js:38: roomStateProfiles: ctx.createDefaultRoomStateProfileMap(board.id)
src/app/runtime/state/runtime-board-profiles.js:60: roomStateProfiles: ctx.normalizeRoomStateProfileMap(state.roomStateProfilesByBoard[board.id], board.id)
src/app/runtime/state/runtime-board-profiles.js:188: state.roomStateProfilesByBoard = Object.fromEntries(...)
src/app/runtime/state/runtime-board-profiles.js:191: ctx.normalizeRoomStateProfileMap(profiles?.[board.id]?.roomStateProfiles, board.id)
src/app/runtime/state/runtime-board-state-accessors.js:192-201: getRoomStateProfile / setRoomStateProfile (definitions)
src/app/runtime/state/runtime-board-state-accessors.js:300-301: exports
src/app/runtime/animation/runtime-room-management.js:609-610: delete on room-delete (write-only, not read)
src/app/runtime/core/runtime-bootstrap.js:122: state.roomStateProfilesByBoard = ctx.createDefaultRoomStateProfilesByBoard()
src/app/runtime/core/runtime-board-switch.js:155-166: stateMap hydration (read-into-state, no consumer)
src/app/lib/state/runtime-state.js:73: roomStateProfilesByBoard: {}
src/app/runtime/runtime-orchestration.js:896-897: ctx-builder re-exports
src/app/lib/persistence/board-profiles.js:22,33,54,118-119: legacy migration

$ grep -rn "broken\|burning\|alienCount\|corpse" src/app/runtime/render/ src/app/runtime/animation/ src/app/runtime/wire/
(0 hits — no render or UI consumer of the sub-field names)
```

| Site type | Location | Verdict |
|-----------|----------|---------|
| Read site (plumbing) | `runtime-board-state-accessors.js:192-201` | Plumbing only — no downstream consumer |
| Read site (apply) | `runtime-board-profiles.js:191` | Hydrates state slice — no consumer reads slice |
| Read site (board-switch) | `runtime-board-switch.js:155-166` | Hydration into state — no consumer |
| Write site | `runtime-board-state-accessors.js:196-201`, `runtime-room-management.js:609-610` (delete) | Setters and delete-on-delete only |
| Render-loop consumer | (none) | — |
| UI binding | (none) | — |

**On-disk presence:** `config/boards/nemesis-board-a.json` carries
`roomStateProfiles` with 66 entries (one per room; default-shaped). Pure ballast.

**Wave 2 plan (29-03) action:**
- Remove `getRoomStateProfile`, `setRoomStateProfile`, `roomStateProfilesByBoard`
  state slice + default builder + bootstrap init + apply path + ctx-builder
  re-exports.
- Remove `normalizeRoomStateProfile`, `createDefaultRoomStateProfileMap`,
  `normalizeRoomStateProfileMap` helpers.
- Remove the delete call at `runtime-room-management.js:609-610`.
- Drop `"roomStateProfiles"` from `BOARD_PROFILE_FIELDS` (server.mjs:43).
- Remove the `roomStateProfiles` reads in
  `lib/persistence/board-profiles.js:22,33,54,118-119`.
- Wave 3 plan (29-05) strips `"roomStateProfiles"` key from disk.

**Risk:** Pitfall 1 (CONTEXT) — undo system snapshot. Verified absent: undo
captures `roomStates` (polygon snapshots) only, not the `roomStateProfilesByBoard`
slice. See `runtime-polygon-undo.js:19-35`.

### F3: `animationSoundMap` — REDUNDANT

**Verdict:** REDUNDANT (lossless migration first, then drop). Per-animation
`soundAssetRef` is the authoritative source; map is a fallback for an audio-mapping
UI panel that no longer exists in `index.html`.

**Live grep run 2026-05-05 (re-confirmation of RESEARCH §F3):**

```
$ grep -rn "animationSoundMap" src/
src/app/lib/state/runtime-state.js:51: animationSoundMap: {}
src/app/runtime/core/runtime-bootstrap.js:139: state.animationSoundMap = ctx.normalizeAnimationSoundMap(ctx.createDefaultAnimationSoundMap())
src/app/runtime/core/runtime-animation-factory.js:54: comment: "the path without reaching back through state.animationSoundMap."
src/app/runtime/core/runtime-polygon-metrics.js:23: ctx.normalizeAnimationSoundPath(animationType, ctx.state.animationSoundMap[animationType])
src/app/runtime/render/runtime-audio.js:256: comment: "// animationSoundMap lookup so existing persisted state still"
src/app/runtime/render/runtime-audio.js:330: ctx.normalizeAnimationSoundPath(animationType, ctx.state.animationSoundMap[animationType])
src/app/runtime/render/runtime-audio.js:383,385,386: state.animationSoundMap[selectedAnimationType] reads/writes (audio-mapping panel sync)
src/app/runtime/state/runtime-board-profiles.js:93: animationSoundMap: ctx.normalizeAnimationSoundMap(state.animationSoundMap)
src/app/runtime/state/runtime-board-profiles.js:141-142: payload apply
src/app/runtime/live-sync/runtime-global-defaults.js:421-422: snapshot apply
src/app/runtime/wire/runtime-wire-room-audio-binders.js:451: state.animationSoundMap[animationType] = normalizeAnimationSoundPath(...)

$ grep -n "audio-mapping" index.html
(0 hits)
```

| Site type | Location | Verdict |
|-----------|----------|---------|
| Read site (fallback) | `runtime-audio.js:256,330` | Falls back to map only when per-animation `soundAssetRef` is empty — but per-anim is always populated post-Phase-26 |
| Read site (panel sync) | `runtime-audio.js:383,385` | Reads for `audio-mapping` panel — panel DOM elements do not exist in `index.html` (0 hits) |
| Read site (metrics) | `runtime-polygon-metrics.js:23` | RESOLVED in RESEARCH Open Question 2: dead — consumed only by orphaned panel |
| Write site (panel) | `runtime-audio.js:386`, `runtime-wire-room-audio-binders.js:451` | Writes back from non-existent select element |
| Render-loop consumer | (none — `playSoundForAnimation` is the only audio surface, and it prefers per-anim ref) | — |
| UI binding | (none — `#audio-mapping-animation`, `#audio-mapping-sound`, `#audio-mapping-status` absent from DOM) | — |

**On-disk presence:** `config/global-defaults.json` carries `animationSoundMap`
with 10 entries (verified 2026-05-05). 7/10 entries are `"none"`; 3 entries
(`intruder-alert`, `power-outage`, `fire`) carry actual sound paths and MUST be
migrated lossless to per-animation `soundAssetRef` before drop.

**Wave 3 plan (29-05) migration recipe (D-03):** for each `(type, soundPath)` in
the map with non-empty soundPath, locate matching `def.type` across every board's
`outsideFx.animations`, `roomFx.animations`, `insideFx.animations`. If
`def.soundAssetRef` is empty/`"none"`, set it to `soundPath`. Otherwise skip
(don't clobber). Orphans (no matching def) are silently dropped.

**Wave 2 plan (29-03) action:** strip the runtime plumbing AFTER Wave 3 disk
migration runs. Per CONTEXT D-03 the order is migration-first → drop-second.
Specifically:
- Strip dead audio-mapping panel code (`syncAudioMappingStatus`,
  `syncAudioMappingPanel`, the unreachable event listeners in
  `runtime-wire-room-audio-binders.js:438-462`).
- Strip the `runtime-audio.js:330,383-386` map-fallback chain.
- Strip `state.animationSoundMap` slice + `normalizeAnimationSoundMap`.
- Strip the `runtime-polygon-metrics.js:23` read.

**Risk:** Pitfall 2 (CONTEXT) — order-of-operations. Mitigated by single
ordering point in `purgeDeadFieldsOnBoot` (29-05).

### F4: `playAreaPolygon` — REDUNDANT

**Verdict:** REDUNDANT. `playAreas[]` array (with per-area `.polygon`) is the
authoritative source post-Phase-26. `playAreaPolygon` is a single-polygon legacy
field still synthesized into board profiles on every save (pure duplication on
disk).

**Live grep run 2026-05-05 (re-confirmation of RESEARCH §F4):**

```
$ grep -rn "playAreaPolygon" src/app/runtime/render/
(0 direct render-side reads)

$ grep -rn "playAreaPolygon" src/
runtime-play-area-geometry.js:166,168,198,217,223,225,226,232,234,245 — fallback chain in mergePolygonPrecedence and resolveProfilePolygonContract
runtime-board-profiles.js:42,68,238 — synthesis writes playAreaPolygon to profile output
polygon-contract.js:261,267,269,270,276,278,344 — fallback chain
lib/persistence/board-profiles.js:51,88,95,97,126 — legacy migration
```

| Site type | Location | Verdict |
|-----------|----------|---------|
| Read site (render) | (none — `runtime-canvas-clip.js` uses `getPlayAreaClipPolygons` → `getPlayAreas(boardId)` only) | — |
| Read site (fallback) | `runtime-play-area-geometry.js:166-245`, `polygon-contract.js:261-344` | Pre-Phase-26 fallback chain; never resolves to it because `playAreas[]` is always populated |
| Read site (legacy migration) | `lib/persistence/board-profiles.js:51,88,95,97,126` | Pre-release legacy migration — straight-line per D-06 |
| Write site (synthesis) | `runtime-board-profiles.js:42,68,238` | Pure duplication — same value as `playAreas[selectedPlayAreaId].polygon` |
| Render-loop consumer | (none — `getShipPolygonPoints()` uses `getSelectedPlayArea()?.polygon`) | — |
| UI binding | (none) | — |

**On-disk presence:** All 4 board files have `playAreaPolygon` populated (132
points each) AND `playAreas[]` populated (1 entry, identical polygon). Pure
duplication.

**Wave 2 plan (29-04) action:**
- Strip `playAreaPolygon` from synthesis (`runtime-board-profiles.js:42,68,238`).
- Strip the fallback chain in `polygon-contract.js:261-344` and
  `runtime-play-area-geometry.js:166-245`.
- Strip the `lib/persistence/board-profiles.js:51,88,95,97,126` legacy reads.
- Drop `"playAreaPolygon"` from `BOARD_PROFILE_FIELDS` (server.mjs:45).
- Wave 3 plan (29-05) strips the key from each `config/boards/<id>.json`.

**Risk:** None. Authoritative source (`playAreas[]`) is unaffected.

### F5: `deletedRoomIds` / `roomTombstones` — REDUNDANT (per §3 trace)

See §3 below for the dedicated undo-flow trace that drives this verdict.

## §3 deletedRoomIds Undo Trace (RESEARCH Open Question A2 — RESOLVED)

**Question:** Does `runtime-polygon-undo.js` read `state.roomTombstonesByBoard`
to know which rooms to "un-tombstone" on redo, or does it operate by ID only?

**Live grep run 2026-05-05:**

```
$ grep -n "roomTombstonesByBoard\|deletedRoomIds" src/app/runtime/polygon-editor/runtime-polygon-undo.js
(0 hits — no array reads inside the undo module)

$ grep -n "markRoomTombstone\|clearRoomTombstone" src/app/runtime/polygon-editor/runtime-polygon-undo.js
66:        ctx.clearRoomTombstone(state.boardId, snap.id);
77:        ctx.markRoomTombstone(state.boardId, id);
```

**Trace of `restoreState(snapshot)` (lines 37-99):**

1. Line 41-42: snapshot decomposes to `roomStates` and `playAreaStates` (no
   tombstone array).
2. Line 50-67: per restored room snapshot, if not currently in `board.rooms`,
   the room is appended back AND `ctx.clearRoomTombstone(state.boardId, snap.id)`
   is called (line 66) — call site, **not a read**.
3. Line 75-79: per current room not in `restoredIds`, the room is removed AND
   `ctx.markRoomTombstone(state.boardId, id)` is called (line 77) — call site,
   **not a read**.
4. Line 81-91: play-area polygons restored.
5. Line 93-98: persistence + DOM-sync calls.

**`captureCurrentState()` (lines 19-35):**
- Captures `roomStates` (id/name/polygon) and `playAreaStates` (id/name/polygon).
- **Does NOT capture `state.roomTombstonesByBoard`.**
- Consequence: snapshots taken before/after a tombstone change do NOT carry
  tombstone state. Undo replay reconstructs tombstones by **diff** (current
  rooms vs snapshot rooms) at lines 50-79.

**Verdict:** REDUNDANT — drop

**Reasoning:** The undo system uses tombstones as a side-effect signal
(mark/clear by ID), never as a primary read. Removing the persisted
`deletedRoomIds` array and the in-memory `roomTombstonesByBoard` slice does NOT
break undo because:
1. Undo never reads the array.
2. The mark/clear functions can become no-ops or be deleted entirely.
3. Phase 26's `runtime-room-management` already removes the room from
   `roomCatalog` directly; the tombstone is purely vestigial bookkeeping.

**Wave 2 plan (29-04) action:**
- Drop the `markRoomTombstone` call at `runtime-polygon-undo.js:77` and the
  `clearRoomTombstone` call at line 66 (no replacement needed — undo replay
  re-adds the room to `board.rooms` directly, which is sufficient).
- Drop `markRoomTombstone`/`clearRoomTombstone` definitions from
  `runtime-play-area-geometry.js:95-120` AND their ctx re-exports
  (`runtime-orchestration.js:684-685,1888-1889,1938,2028-2029`) AND the call
  sites in `runtime-room-management.js:396,552,618` and
  `runtime-polygon-context-menu.js:235`.
- Drop `state.roomTombstonesByBoard` slice (`runtime-state.js:71`,
  `runtime-bootstrap.js:121`, `runtime-board-switch.js:156-170`,
  `runtime-board-profiles.js:58,162,176`).
- Drop `filterRoomCatalogByDeletedIds` at
  `runtime-play-area-geometry.js:139-143` and the
  `mergeRoomCatalog(board, roomCatalog, deletedRoomIds)` signature
  (`lib/domain/rooms.js:112-114`).
- Drop `"deletedRoomIds"` from `BOARD_PROFILE_FIELDS` (server.mjs:40).
- Drop the `lib/persistence/board-profiles.js:110` legacy read.
- Wave 3 plan (29-05) strips the key from each `config/boards/<id>.json`.

**Risk:** Pitfall 1 (CONTEXT) — already discharged: undo snapshot does not
carry tombstone state, so no snapshot invalidation occurs.

## §4 LIVE-but-redundant disk fields (RESEARCH Open Question A3)

### `roomGeometry`

**Status:** State slice `state.roomGeometryByBoard` IS LIVE — read by
`runtime-room-management.js:363,398,504,554` (`getRoomGeometry`/`setRoomGeometry`).

**Disk-form question:** The comment at `runtime-board-profiles.js:185` claims
"no longer read from profiles", suggesting the on-disk persistence MAY be
redundant while the runtime slice is alive.

**Verdict:** LIVE in source, AUDIT INCONCLUSIVE for disk-form classification.

**Action:** **DO NOT add to Wave 3 strip list.** Phase 29 keeps `roomGeometry`
in `BOARD_PROFILE_FIELDS`. If a future audit confirms the on-disk form is
redundant, defer that drop to a dedicated future phase to avoid mid-flight
re-architecture of the room-management read path.

## §5 Wave 2..4 Owner Mapping

Mirrors the verdicts above; each entry tells the executing plan what to remove.

```
29-02 (Wave 2): drop hiddenRoomNames
                  - remove "hiddenRoomNames" from BOARD_PROFILE_FIELDS (server.mjs:53)
                  - flip skip-gate in test/phase-29-dead-grep.test.mjs (W2 hiddenRoomNames)
                  - flip the LIVE-only union-gate in test/board-profile-fields.test.mjs

29-03 (Wave 2): drop roomStateProfiles + animationSoundMap plumbing
                  - remove getRoomStateProfile/setRoomStateProfile + state slice
                  - remove animationSoundMap state slice + audio-mapping panel code
                  - flip skip-gates in test/phase-29-dead-grep.test.mjs (W2 roomStateProfiles, W2 animationSoundMap)

29-04 (Wave 2): drop playAreaPolygon + deletedRoomIds (per §3 verdict)
                  - strip playAreaPolygon synthesis + fallback chain
                  - strip tombstone mark/clear calls + state slice
                  - flip skip-gates in test/phase-29-dead-grep.test.mjs (W2 playAreaPolygon, W2 deletedRoomIds)

29-05 (Wave 3): purgeDeadFieldsOnBoot
                  - migrateAnimationSoundMapOnBoot (D-03, lossless copy → drop)
                  - stripDeadFieldsFromGlobalDefaults(["animationSoundMap"])
                  - stripDeadFieldsFromBoardFiles(["hiddenRoomNames", "roomStateProfiles",
                    "playAreaPolygon", "deletedRoomIds"])
                  - flip skip-gates in test/phase-29-purge.test.mjs and
                    test/phase-29-sound-migration.test.mjs

29-06 (Wave 4): BOARD_PACKAGE_SCHEMA v3 → v4 (D-04 / D-07 / D-08)
                  - bump constant at server.mjs:30
                  - SCHEMA_OUTDATED rejection in import handler
                  - filterBoardToLiveFields helper for export handler
                  - flip skip-gates in test/bundle-schema.test.mjs
```

## §6 Sign-Off

**Approved:** "approved — proceed to Wave 2" — auto-approved per phase 29 auto-mode policy at 2026-05-05T12:42:00Z (locked answer per orchestrator instruction; user pre-authorized the verdict for the auto-mode run).

---

*Authority for Wave 2..4 source-tree and disk-tree deletions.*
*Phase: 29-persistence-audit-legacy-cleanup, Wave 1.*
