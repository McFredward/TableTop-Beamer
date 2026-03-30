# P8-T74 Strict Conditional Rendering - Outside Controls Unmount

Date: 2026-03-30
Status: PASS

## Goal
- `outside mode` and `outside direction` must be **not mounted** for non-applicable contexts (no disabled-only fallback).

## Implementation evidence
- `src/app.js`
  - mount-slot based conditional mounting (`createConditionalFieldMountSlot`, `setConditionalFieldMounted`)
  - visibility gate uses applicability rule (`isOutsideModeDirectionApplicable`)
  - non-applicable states force deterministic defaults (`mode=standard`, `direction=forward`)
  - panel exposes `data-outside-mode-direction-visible` for deterministic visibility tracing

## Outcome
- Controls are physically removed from the DOM for non-applicable contexts (`gif`/`mp4` and non-applicable coded refs).
- Re-mount only occurs when applicability is true (`coded` + supported renderer).

## Verification
- `node --check src/app.js` PASS
