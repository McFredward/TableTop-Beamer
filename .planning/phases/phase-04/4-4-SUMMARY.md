---
phase: phase-04
plan: 4-4
subsystem: ui
tags: [polygon-editor, zoom, flicker, room-drag, clipping]
requires:
  - phase: phase-04
    provides: Preview-Decommission + Desktop-Running-Containment als stabile Baseline aus Plan 4-3
provides:
  - Einstellbare Polygon-Handle-Groesse im Settings-Zoombereich
  - Unregelmaessiges Random-Flicker fuer `lichtflackern` ohne Puls-Muster
  - Room-Flaechen-Drag per LMB mit Guards gegen Vertex-/Pan-Kollisionen
  - Hotfix-Regression-Nachweis fuer Handle/Flicker/Drag/Clipping
affects: [phase-04, settings-editor, room-animation-runtime]
tech-stack:
  added: []
  patterns:
    - Runtime-UI-Control -> State-Scale -> unmittelbares Overlay-Re-Render fuer Editorpraezision
    - Pointer-Session-Guards fuer area-drag/vertex-drag/pan als gegenseitig exklusive Modi
key-files:
  created:
    - .planning/phases/phase-04/P4-T32-HOTFIX-REGRESSION.md
  modified:
    - index.html
    - src/app.js
    - src/app/state/runtime-state.js
    - src/styles.css
    - .planning/phases/phase-04/TASKS.md
key-decisions:
  - "Handle-Groesse wird als prozentuale Scale (70..220%) nahe Board-Zoom angeboten und sofort im Overlay wirksam gemacht."
  - "Room-Flaechen-Drag nutzt eigene Pointer-Session (`dragArea*`) und wird strikt gegen Pan/Vertex-Edit kollisionsfrei guardiert."
  - "`lichtflackern` bleibt auf `hull-flicker` gemappt, aber der Effektkern wurde auf unregelmaessiges Noise/Burst/Dip-Flicker umgestellt."
patterns-established:
  - "Editor-Interaktionen bleiben mode-exklusiv (pan vs vertex drag vs area drag) mit zentralem Cancel auf Escape/Blur/Pointercancel."
  - "Room-Clip bleibt unveraendert als harter Guard vor room-scope draw calls."
requirements-completed: []
duration: 5m 41s
completed: 2026-03-25
---

# Phase 4 Plan 4: Editor/Immersion-Polish Hotfix Summary

**Polygon-Editor erhielt zoomnahe Handle-Skalierung plus kollisionsfreien Room-Flaechen-Drag, waehrend `lichtflackern` auf ein unregelmaessiges Random-Flicker umgestellt und raumstrenges Clipping beibehalten wurde.**

## Performance

- **Duration:** 5m 41s
- **Started:** 2026-03-25T16:34:26Z
- **Completed:** 2026-03-25T16:40:07Z
- **Tasks:** 5/5
- **Files modified:** 6

## Accomplishments
- Neue Settings-Steuerung `Polygon-Handle-Groesse` nahe Board-Zoom eingebaut (70%..220%, sofortiger Effekt).
- Polygon-Editor-Render/Input auf variable Handle-Skalierung umgestellt (sichtbare Radiuswerte + Hit-Targets + Statusanzeige).
- `hull-flicker` von sinusbasiertem Puls auf kaputtes Random-Flicker mit Burst/Dip/Glitch-Lines reworked.
- Room-Polygon kann jetzt im Settings-Mode per LMB-Flaechen-Drag als Ganzes verschoben werden, ohne Vertex-Edit zu brechen.
- P4-T32-Nachweis fuer Syntax, Feature-Presence, Acceptance-Mapping und manuelle Operator-Checks dokumentiert.

## Task Commits

1. **Task P4-T28: Handle-Size-Control nahe Zoom** - `8cc1841` (feat)
2. **Task P4-T29: Render/Input-Skalierung fuer Handles** - `fec3884` (feat)
3. **Task P4-T30: Random-Flicker-Rework fuer `lichtflackern`** - `5182609` (feat)
4. **Task P4-T31: Room-Flaechen-Drag mit Guards** - `6c1d025` (feat)
5. **Task P4-T32: Hotfix-Regression dokumentiert** - `1efbf52` (test)

## Files Created/Modified
- `index.html` - Handle-Size-Slider im Board-Zoom-Panel ergaenzt.
- `src/app/state/runtime-state.js` - Polygon-Editor-Handle-Scale + Area-Drag-Sessionstate hinzugefuegt.
- `src/app.js` - Handle-Scale-Sync, variable Handle/Hit-Radii, Random-Flicker-Logik, Room-Area-Drag-Flow.
- `src/styles.css` - Cursor-/Draggable-Styles fuer Room-Flaechen-Drag.
- `.planning/phases/phase-04/TASKS.md` - P4-T28..P4-T32 auf DONE gesetzt.
- `.planning/phases/phase-04/P4-T32-HOTFIX-REGRESSION.md` - Regression-/Acceptance-Nachweis.

## Decisions Made
- Handle-Skalierung bleibt bewusst im Runtime-State (kein neues Persistenzschema), um Hotfix-Risiko klein zu halten.
- Area-Drag wird nur im Settings-Mode ueber `room-zone` aktiviert; Handle-/Edge-Pointerpfade behalten Vorrang.
- Nach erfolgreichem Area-Drag wird Room-Click kurz suppressiert, um unbeabsichtigte Click-Nachtrigger nach Drag-Ende zu vermeiden.

## Deviations from Plan

None - plan executed exactly as written.

## Auth Gates

None.

## Issues Encountered

- `rg` war in der Shell nicht verfuegbar; statische Feature-Nachweise wurden stattdessen ueber das `grep`-Tool ausgefuehrt.

## Known Stubs

None.

## Next Phase Readiness

- Plan 4-4 ist mit atomaren Task-Commits und Nachweisdokument abgeschlossen.
- Plan 4-5 kann auf stabiler Hotfix-Baseline (Handle-Scale + Random-Flicker + Area-Drag) fuer weitere Render/GIF/UI-Isolation fortsetzen.

## Self-Check

PASSED

- FOUND: `.planning/phases/phase-04/4-4-SUMMARY.md`
- FOUND: `.planning/phases/phase-04/P4-T32-HOTFIX-REGRESSION.md`
- FOUND commits: `8cc1841`, `fec3884`, `5182609`, `6c1d025`, `1efbf52`
