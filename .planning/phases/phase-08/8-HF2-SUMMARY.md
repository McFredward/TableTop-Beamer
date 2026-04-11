---
phase: phase-08
plan: 8-HF2
subsystem: ui
tags: [outside-animations, boomerang, mp4, gif, persistence, resources-api]
requires:
  - phase: phase-08
    provides: multi-play-area core, image import flow, outside mask pipeline
provides:
  - Outside animation definitions with per-animation asset mapping and boomerang playback
  - Dedicated Settings section "Outside Animations" with dropdown editor and create flow
  - Resource asset picker backed by `/api/resources` and persistent profile/default migration guards
affects: [phase-08, settings-ui, outside-renderer, server-api, defaults]
tech-stack:
  added: [none]
  patterns: [definition-driven outside rendering, per-animation outside settings, legacy alias normalization]
key-files:
  created:
    - .planning/phases/phase-08/8-HF2-VERIFICATION.md
    - debug/p8-hf2-api-resources.json
    - debug/p8-hf2-api-health.json
  modified:
    - src/app.js
    - src/app/lib/shared/config.js
    - src/app/lib/persistence/board-profiles.js
    - index.html
    - server.mjs
    - .planning/phases/phase-08/{PLAN,BACKLOG,TASKS,ACCEPTANCE,RISKS,EXECUTE}.md
key-decisions:
  - "Outside animation settings are definition-driven inside outsideFx (selectedAnimationId + animations[])."
  - "Outside audio is hard-muted for outside-space lifecycle to enforce Sandstorm no-audio contract."
  - "Resource picker sources are served by server-side `/api/resources` instead of hardcoded client manifests."
patterns-established:
  - "Outside renderer resolves selected definition first, then dispatches coded/gif/mp4 pipelines with shared boomerang timeline."
  - "Legacy outside fields (`outside`, `outsideAnimations`, `selectedOutsideAnimationId`) are normalized into canonical outsideFx schema."
requirements-completed: []
duration: 8m
completed: 2026-03-27
---

# Phase 8 Plan HF2: Outside Animations Mars Feature Pack Summary

**Outside effects now run from persistent per-animation definitions (including Sandstorm mp4 + boomerang) with a dedicated settings editor and resource-backed asset mapping.**

## Performance

- **Duration:** 8m
- **Started:** 2026-03-27T17:03:58Z
- **Completed:** 2026-03-27T17:12:13Z
- **Tasks:** 10/10 (P8-T25..P8-T34)
- **Files modified:** 14

## Accomplishments
- Introduced canonical outside animation definitions with per-animation fields (`assetType`, `assetRef`, `boomerang`, intensity/speed/mode/direction) and selected animation ownership.
- Added `Outside Sandstorm` default on `sandstorm.mp4` and ensured outside runtime remains muted.
- Delivered new `Outside Animations` settings section with dropdown editor, create flow, asset-type mapping, assetRef editing, and resource picker from `/api/resources`.
- Extended persistence/default export-import to keep outside definitions stable across Save/Reload/Restart and legacy payload aliases.

## Task Commits

1. **P8-T25** – `e56b651` feat: outside animation profile schema
2. **P8-T26** – `dc7c0fb` feat: Outside Sandstorm default + mute guard
3. **P8-T27** – `edcce29` feat: boomerang outside playback lifecycle
4. **P8-T28** – `83f7dd4` feat: move outside controls to dedicated section
5. **P8-T29** – `00e9753` feat: dropdown + boomerang editor controls
6. **P8-T30** – `f4ba19d` feat: per-animation asset mapping controls
7. **P8-T31** – `6d96c90` feat: create flow for outside definitions
8. **P8-T32** – `d9dc46d` feat: resources picker + `/api/resources`
9. **P8-T33** – `31b3b07` fix: persistence normalization + legacy guards
10. **P8-T34** – `0327094` test: verification evidence + artifact sync

## Files Created/Modified
- `src/app.js` - outside definition model, boomerang timeline, mp4/gif/coded rendering, settings handlers, resource picker integration.
- `src/app/lib/shared/config.js` - default outside definitions incl. Sandstorm entry and default selection.
- `src/app/lib/persistence/board-profiles.js` - legacy alias migration for outside definitions.
- `index.html` - new `Outside Animations` section and controls.
- `server.mjs` - `/api/resources` endpoint with recursive resource catalog.
- `.planning/phases/phase-08/8-HF2-VERIFICATION.md` - HF2 acceptance evidence.

## Decisions Made
- Kept global outside trigger semantic (`outside-space`) but resolved visual behavior from selected definition to keep runtime compatibility.
- Implemented boomerang as timeline transform (forward->reverse) shared by coded/gif/mp4 renderers.
- Used server-side resource discovery for picker reliability and to avoid stale hardcoded asset lists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added resource catalog API for picker correctness**
- **Found during:** P8-T32
- **Issue:** UI picker needed deterministic list of real files under `resources`; static lists would drift and violate acceptance.
- **Fix:** Added recursive `/api/resources` endpoint and wired client fetch + picker sync.
- **Files modified:** `server.mjs`, `src/app.js`, `index.html`
- **Committed in:** `d9dc46d`

**2. [Rule 1 - Bug] Enforced no-audio guard on outside runtime**
- **Found during:** P8-T26
- **Issue:** Outside runtime could still inherit mapped audio lifecycle.
- **Fix:** Added hard stop guard in `playSoundForAnimation` for global `outside-space` entries.
- **Files modified:** `src/app.js`
- **Committed in:** `dc7c0fb`

---

**Total deviations:** 2 auto-fixed (1 Rule 1, 1 Rule 2)
**Impact on plan:** Both changes were required to satisfy acceptance deterministically; no scope creep beyond HF2 objectives.

## Auth Gates

None.

## Known Stubs

None.

## Next Phase Readiness
- Plan 8-HF2 is closed with PASS evidence and synchronized phase artifacts.
- Plan 8-2 hardening can proceed with outside feature pack as baseline.

## Self-Check: PASSED

- FOUND: `.planning/phases/phase-08/8-HF2-SUMMARY.md`
- FOUND commits: `e56b651`, `dc7c0fb`, `edcce29`, `83f7dd4`, `00e9753`, `f4ba19d`, `6d96c90`, `d9dc46d`, `31b3b07`, `0327094`
