---
phase: 29
plan: 03
subsystem: persistence-cleanup
tags: [persistence, dead-fields, source-cleanup, wave-2, audio]
requires:
  - 29-W0-SUMMARY.md (test scaffolds with skip-gates)
  - 29-01-SUMMARY.md (29-AUDIT.md verdict authority §F3)
  - 29-02-SUMMARY.md (Wave 2 batch 1 — hiddenRoomNames + roomStateProfiles)
provides:
  - "playSoundForAnimation reads ONLY animation.soundAssetRef (no map fallback)"
  - "Dead audio-mapping panel JS surface fully removed (syncAudioMappingStatus + syncAudioMappingPanel + change-listener block + DOM refs + ctx wiring)"
  - "state.animationSoundMap slice removed from runtime-state + bootstrap + apply paths"
  - "Helper functions normalizeAnimationSoundMap + createDefaultAnimationSoundMap removed (no remaining consumers)"
  - "server.mjs no longer assigns animationSoundMap on global-defaults load (line 3035)"
  - "Third phase-29-dead-grep skip-gate (animationSoundMap) is now LIVE + passing"
affects:
  - server.mjs
  - src/app/lib/shared/normalizers.js
  - src/app/lib/state/runtime-state.js
  - src/app/lib/ui/runtime-panels-controller.js
  - src/app/runtime/core/runtime-animation-factory.js
  - src/app/runtime/core/runtime-bootstrap.js
  - src/app/runtime/core/runtime-dom-refs.js
  - src/app/runtime/core/runtime-polygon-metrics.js
  - src/app/runtime/live-sync/runtime-global-defaults.js
  - src/app/runtime/render/runtime-audio.js
  - src/app/runtime/runtime-orchestration-ctx-builder.js
  - src/app/runtime/runtime-orchestration.js
  - src/app/runtime/state/runtime-board-profiles.js
  - src/app/runtime/wire/runtime-wire-room-audio-binders.js
  - test/phase-29-dead-grep.test.mjs
tech-stack:
  added: []
  patterns:
    - "Atomic two-commit dead-field plumbing removal (Task 1: panel surface; Task 2: state slice + helpers + server)"
    - "Wider scope-limited cascade-cleanup of orphaned ctx destructures + injection-bag fields after primary removal"
key-files:
  created:
    - .planning/phases/phase-29/29-03-SUMMARY.md
  modified:
    - server.mjs
    - src/app/lib/shared/normalizers.js
    - src/app/lib/state/runtime-state.js
    - src/app/lib/ui/runtime-panels-controller.js
    - src/app/runtime/core/runtime-animation-factory.js
    - src/app/runtime/core/runtime-bootstrap.js
    - src/app/runtime/core/runtime-dom-refs.js
    - src/app/runtime/core/runtime-polygon-metrics.js
    - src/app/runtime/live-sync/runtime-global-defaults.js
    - src/app/runtime/render/runtime-audio.js
    - src/app/runtime/runtime-orchestration-ctx-builder.js
    - src/app/runtime/runtime-orchestration.js
    - src/app/runtime/state/runtime-board-profiles.js
    - src/app/runtime/wire/runtime-wire-room-audio-binders.js
    - test/phase-29-dead-grep.test.mjs
decisions:
  - "Removed the runtime-animation-factory.js doc-comment reference to state.animationSoundMap (3-line reword) so the source-wide grep for the legacy token returns 0 — the soundAssetRef write itself is byte-unchanged. Plan acceptance asked for 'byte-unchanged factory'; the must_haves truth asked for 0 grep hits. Resolved in favour of the truth gate by keeping the code byte-unchanged and only retouching the surrounding comment."
  - "Cascaded cleanup of getMappedSoundPathForAnimation in runtime-polygon-metrics.js (orphaned in Task 1 once the playback fallback was deleted) and pruned the now-unused normalizeAnimationSoundPath + SOUND_MAPPING_NONE polygon-metrics ctx pass-throughs. Kept normalizeAnimationSoundPath in normalizers.js — still used by other render-time call sites."
  - "Removed legacy helpers normalizeAnimationSoundMap + createDefaultAnimationSoundMap from src/app/lib/shared/normalizers.js — both had zero remaining consumers after Task 2 source-cleanup. Pruned from orchestration + ctx-builder destructures + injection bags."
  - "Disk-side config/global-defaults.json deliberately UNTOUCHED — Wave 3 (29-05) is the single ordering point that runs the lossless migration (D-03) BEFORE the cleaned source first reads global-defaults.json on boot."
metrics:
  duration: ~7 min (autonomous)
  completed: 2026-05-05
---

# Phase 29 Plan 03: Drop animationSoundMap source-side plumbing Summary

Wave 2 batch 2 — atomically removed the `animationSoundMap` global-state
slice and the dead audio-mapping UI panel JS surface per 29-AUDIT.md
§F3 verdict authority. Per-animation `animation.soundAssetRef` (set by
`runtime-animation-factory.js:54-55`) is now the sole source of audio
playback; the `state.animationSoundMap` map fallback chain is gone, and
the orphaned `syncAudioMappingStatus` / `syncAudioMappingPanel`
functions (whose DOM refs were absent from `index.html`) are deleted.
Suite green: 32 pass / 12 skip / 0 fail (was 31/13/0); the third
`phase-29-dead-grep.test.mjs` skip gate flipped to LIVE.

## Tasks Executed

### Task 1 — Strip dead audio-mapping panel surface (commit 3ff963a)

Per 29-AUDIT.md §F3: `index.html` does not contain `audio-mapping` DOM
elements (verified zero hits). The panel JS therefore consumed always-
null DOM refs; the change-listener block bound to a non-existent
`<select>` could never fire; and the playback fallback chain via
`state.animationSoundMap` was redundant to the per-animation
`soundAssetRef` written by the factory.

| Layer | File | Removed |
|-------|------|---------|
| Audio module | `src/app/runtime/render/runtime-audio.js` | `syncAudioMappingStatus` + `syncAudioMappingPanel` functions; `playSoundForAnimation` map-fallback branch (now per-animation ref only); ctx imports `audioMappingAnimationSelect/SoundSelect/Status`, `ALL_ANIMATION_TYPES`, `GLOBAL_ANIMATIONS`, `getMappedSoundPathForAnimation`, `getAnimationLabel`, `normalizeAnimationSoundPath`, `getGlobalAnimationCategory`; window.TT_BEAMER_RUNTIME_AUDIO exports for the two deleted functions |
| Wire bindings | `src/app/runtime/wire/runtime-wire-room-audio-binders.js` | The two `change`-event listener blocks (`audioMappingAnimationSelect` + `audioMappingSoundSelect`) that wrote back to `state.animationSoundMap`; destructured ctx refs `audioMappingAnimationSelect`, `audioMappingSoundSelect`, `syncAudioMappingPanel`, `normalizeAnimationSoundPath`, `getAnimationLabel` |
| DOM refs | `src/app/runtime/core/runtime-dom-refs.js` | `audioMappingAnimationSelect`, `audioMappingSoundSelect`, `audioMappingStatus` selectors |
| Orchestration | `src/app/runtime/runtime-orchestration.js` | DOM-ref destructures (lines 112-113); RUNTIME_AUDIO.init ctx pass-throughs (audio-mapping selectors + `ALL_ANIMATION_TYPES`/`GLOBAL_ANIMATIONS`/`getMappedSoundPathForAnimation`/`getAnimationLabel`/`normalizeAnimationSoundPath`/`getGlobalAnimationCategory`); module destructures of `syncAudioMappingStatus` + `syncAudioMappingPanel`; binders ctx fields `audioMappingAnimationSelect/SoundSelect`, `syncAudioMappingPanel: () => …`, `normalizeAnimationSoundPath: …`, `getAnimationLabel: …`; `getMappedSoundPathForAnimation` from polygon-metrics destructure |
| Ctx builder | `src/app/runtime/runtime-orchestration-ctx-builder.js` | `syncAudioMappingPanel` destructure + factory entry |
| Bootstrap | `src/app/runtime/core/runtime-bootstrap.js` | `syncAudioMappingPanel: ctx.syncAudioMappingPanel` runtime-panels invocation arg |
| Panels controller | `src/app/lib/ui/runtime-panels-controller.js` | `syncAudioMappingPanel` destructure + body call |

Net for Task 1: `7 files changed, 10 insertions(+), 156 deletions(-)`.

### Task 2 — Drop `state.animationSoundMap` slice + un-skip dead-grep test (commit 7409dab)

| Layer | File | Removed |
|-------|------|---------|
| Initial state | `src/app/lib/state/runtime-state.js` | `animationSoundMap: {}` slice |
| Bootstrap | `src/app/runtime/core/runtime-bootstrap.js` | `state.animationSoundMap = ctx.normalizeAnimationSoundMap(ctx.createDefaultAnimationSoundMap())` initializer |
| Snapshot apply (live-sync) | `src/app/runtime/live-sync/runtime-global-defaults.js` | `if (… "animationSoundMap")` block in `applyGlobalDefaultsPayloadToState` |
| Synth + apply (board-profiles) | `src/app/runtime/state/runtime-board-profiles.js` | `animationSoundMap: ctx.normalizeAnimationSoundMap(state.animationSoundMap)` synth entry; `if (…hasOwnProperty("animationSoundMap"))` apply block |
| Polygon-metrics | `src/app/runtime/core/runtime-polygon-metrics.js` | `getMappedSoundPathForAnimation` function + window export + module-header comment entry; cascade-clean of `SOUND_MAPPING_NONE` + `normalizeAnimationSoundPath` ctx pass-throughs from RUNTIME_POLYGON_METRICS.init |
| Helpers | `src/app/lib/shared/normalizers.js` | `createDefaultAnimationSoundMap` + `normalizeAnimationSoundMap` definitions + window exports + module-header doc comment |
| Orchestration | `src/app/runtime/runtime-orchestration.js` | 4 destructures of `normalizeAnimationSoundMap`/`createDefaultAnimationSoundMap` + cascade-clean of polygon-metrics init pass-throughs |
| Ctx builder | `src/app/runtime/runtime-orchestration-ctx-builder.js` | 2 destructures + 2 factory entries for both helpers |
| Server | `server.mjs` | `animationSoundMap: parsed.animationSoundMap ?? {}` from global-defaults assembly (line 3035); doc-comment update at line 38 |
| Animation factory | `src/app/runtime/core/runtime-animation-factory.js` | Doc-comment reworded to drop the literal `animationSoundMap` token (factory soundAssetRef write byte-unchanged) |
| Test | `test/phase-29-dead-grep.test.mjs` | `{ skip: "Wave 2 (29-03) not landed yet" }` gate on the `animationSoundMap` test (now LIVE + passing) |

Net for Task 2: `11 files changed, 10 insertions(+), 61 deletions(-)`.

## Combined Diff Summary (3ff963a + 7409dab)

```
 server.mjs                                         |   3 +-
 src/app/lib/shared/normalizers.js                  |  25 +----
 src/app/lib/state/runtime-state.js                 |   1 -
 src/app/lib/ui/runtime-panels-controller.js        |   2 -
 src/app/runtime/core/runtime-animation-factory.js  |   3 +-
 src/app/runtime/core/runtime-bootstrap.js          |   2 -
 src/app/runtime/core/runtime-dom-refs.js           |   3 -
 src/app/runtime/core/runtime-polygon-metrics.js    |  15 +--
 .../runtime/live-sync/runtime-global-defaults.js   |   4 -
 src/app/runtime/render/runtime-audio.js            | 107 ++-------------------
 .../runtime/runtime-orchestration-ctx-builder.js   |   6 --
 src/app/runtime/runtime-orchestration.js           |  29 +-----
 src/app/runtime/state/runtime-board-profiles.js    |   5 -
 .../wire/runtime-wire-room-audio-binders.js        |  30 ------
 test/phase-29-dead-grep.test.mjs                   |   2 +-
 15 files changed, 20 insertions(+), 217 deletions(-)
```

Net: **−197 lines** removed across 15 files. Pure dead-code purge with
zero behaviour change for animations carrying a per-animation
`soundAssetRef` (the factory has always populated this for every new
animation instance).

## Test Suite Counts

```
Before plan:  ℹ tests 44   pass 31   fail 0   skipped 13
After plan:   ℹ tests 44   pass 32   fail 0   skipped 12
```

Net: **+1 pass, −1 skipped, 0 fail** — the un-skipped W2
`animationSoundMap` dead-grep test flipped from skip → pass; no
regressions.

## Acceptance Criteria

- [x] `grep -rn '\banimationSoundMap\b' src/ server.mjs` (excluding test/) returns 0 hits
- [x] `runtime-audio.js` `playSoundForAnimation` reads ONLY `animation.soundAssetRef` (no `state.animationSoundMap` fallback)
- [x] `syncAudioMappingStatus`, `syncAudioMappingPanel`, the unreachable change-listener block in `runtime-wire-room-audio-binders.js`, and the audio-mapping DOM refs are deleted
- [x] `runtime-polygon-metrics.js:getMappedSoundPathForAnimation` map-fallback read removed
- [x] Snapshot apply path in `runtime-global-defaults.js` no longer hydrates `state.animationSoundMap`
- [x] `node --test test/` exits 0 with `fail 0` (32 pass / 12 skip / 0 fail)
- [x] `test/phase-29-dead-grep.test.mjs` `animationSoundMap` skip gate removed; assertion now LIVE + passing
- [x] `config/global-defaults.json` byte-unchanged on disk (`git diff` empty) — Wave 3 (29-05) handles the lossless migration + disk strip
- [x] Phase 28 B5 asset-manifest pathway untouched (manifest is `hashByPath`, not animation-sound)
- [x] `runtime-animation-factory.js` per-animation source path (the `soundAssetRef:` write at line ~55) is byte-unchanged — only a surrounding doc-comment was reworded to remove the legacy field-name reference

## Verification (post-plan)

```
$ grep -rn "\banimationSoundMap\b\|audio-mapping\|syncAudioMapping" \
        src/ server.mjs index.html | grep -v test/
(0 hits)

$ git diff config/global-defaults.json
(empty — disk untouched)

$ git diff src/app/runtime/core/runtime-animation-factory.js
(comment-only diff — soundAssetRef write byte-unchanged)

$ node --test 'test/**/*.test.mjs' 2>&1 | tail -8
ℹ tests 44
ℹ pass 32
ℹ fail 0
ℹ skipped 12
ℹ duration_ms 82.5
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] runtime-animation-factory.js comment carried the legacy field-name token**

- **Found during:** Task 2, Step 2.7 cleanup-verification grep
- **Issue:** The plan's must_haves truth `grep -rn '\banimationSoundMap\b' src/ server.mjs returns 0 hits` and the conflicting acceptance criterion `git diff src/app/runtime/core/runtime-animation-factory.js is empty` could not BOTH be satisfied because line 54 of the factory was a doc-comment that mentioned `state.animationSoundMap` literally.
- **Fix:** Reworded the doc-comment to remove the legacy field-name token while keeping the `soundAssetRef:` write (the authoritative per-animation source path) byte-unchanged. The plan itself anticipated this in Step 2.7's text: *"if `runtime-animation-factory.js:54-55` shows up, re-read its actual code — its hit was a COMMENT mentioning the field; remove the comment."*
- **Files modified:** `src/app/runtime/core/runtime-animation-factory.js` (3-line comment reword, 0 code change)
- **Commit:** 7409dab (folded into Task 2's atomic commit)

**2. [Plan-discretionary cleanup] Cascade-pruned orphaned ctx pass-throughs after primary removal**

- **Found during:** Task 1 (after deleting `syncAudioMappingPanel` body) and Task 2 (after deleting `getMappedSoundPathForAnimation`)
- **Issue:** Removing the panel sync functions left behind ~10 orphaned ctx destructures + ~5 orphaned `init({…})` bag fields across `runtime-orchestration.js`, `runtime-orchestration-ctx-builder.js`, `runtime-panels-controller.js`, and `runtime-bootstrap.js`. Leaving them would have left dead-plumbing that future audits would catch (mirrors the same Step 2.7-style cleanup pattern that was applied in 29-02).
- **Fix:** Pruned every orphaned destructure + factory entry + ctx pass-through in the same atomic commit as the primary removal. Verified by running the full suite after each commit.
- **Files affected:** all 7 files of Task 1 commit + 4 of the 11 files in Task 2 commit
- **Commits:** 3ff963a (Task 1), 7409dab (Task 2)

**3. [Rule 1 - Bug] Polygon-metrics ctx fields became orphaned after deleting `getMappedSoundPathForAnimation`**

- **Found during:** Task 2, Step 2.4 cleanup
- **Issue:** `runtime-polygon-metrics.js`'s `getMappedSoundPathForAnimation` was the sole consumer of `ctx.normalizeAnimationSoundPath` and `ctx.SOUND_MAPPING_NONE` inside that module. After deleting the function, both ctx pass-throughs in the `RUNTIME_POLYGON_METRICS.init({…})` invocation were dead.
- **Fix:** Removed both pass-throughs from `runtime-orchestration.js` (the polygon-metrics init invocation). `normalizeAnimationSoundPath` itself is preserved in `normalizers.js` because it's still used by other render-time call sites (line 1253, 1666, 2216 of `runtime-orchestration.js`).
- **Commit:** 7409dab

## Authentication Gates

None — fully autonomous execution.

## Threat Flags

None — pure dead-code removal at trust boundaries that were already
plumbing-only. The audio playback path's threat surface narrowed (one
fewer state-slice read) but no new network endpoints, file access
patterns, or schema surfaces were introduced.

## Wave 3 Ordering Reminder

**CRITICAL for the next plan (29-05 / Wave 3):** the cleaned source
in this plan no longer reads `state.animationSoundMap` *anywhere*.
The disk-side `config/global-defaults.json` still carries the
`animationSoundMap` key with 10 entries (3 of which carry actual
sound paths: `intruder-alert`, `power-outage`, `fire`). Per
CONTEXT D-03 + 29-AUDIT.md §F3 migration recipe, Wave 3 (29-05)
MUST run the lossless migration BEFORE the cleaned source first
reads `global-defaults.json` on server boot. The migration copies
each non-empty map entry's `soundPath` into the matching
animation definition's `soundAssetRef` slot (across every board's
`outsideFx.animations`, `roomFx.animations`, `insideFx.animations`)
where the `soundAssetRef` is currently empty/`"none"`. Then the
disk-side `animationSoundMap` field can be safely stripped.

This ordering is the single point that prevents lossy data: with
the source-side reads gone (this plan), Wave 3's boot migration is
the *only* surface that sees the on-disk map values.

## Self-Check: PASSED

- File `.planning/phases/phase-29/29-03-SUMMARY.md`: written by this Write call.
- Commit `3ff963a` (Task 1 — audio-mapping panel surface): present in `git log`.
- Commit `7409dab` (Task 2 — animationSoundMap state slice): present in `git log`.
- `grep -rn '\banimationSoundMap\b\|audio-mapping\|syncAudioMapping' src/ server.mjs index.html | grep -v test/`: 0 hits.
- Test suite: `fail 0`, `pass 32`, `skipped 12`.
- `config/global-defaults.json`: byte-unchanged (`git diff` empty).
- `runtime-animation-factory.js`: only doc-comment reword; `soundAssetRef:` write byte-unchanged.
- `phase-29-dead-grep.test.mjs` `animationSoundMap` skip gate: removed.

---

*Phase: 29-persistence-audit-legacy-cleanup, Wave 2 batch 2.*
