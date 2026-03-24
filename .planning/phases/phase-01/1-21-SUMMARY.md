---
phase: phase-01
plan: 21
subsystem: ui
tags: [save-flow, api-preflight, diagnostics, wording, docs]
requires:
  - phase: phase-01
    provides: plan-update-18 static-only detection and save preflight flow
provides:
  - settings UI without dedicated API diagnose button
  - neutral download-fallback wording across UI and docs
  - verification artifact for plan-update-19 regression
affects: [operator-ux, save-feedback, phase-01-qa]
tech-stack:
  added: []
  patterns: [save-preflight-as-diagnose-source, neutral-secondary-fallback-copy]
key-files:
  created: [.planning/phases/phase-01/P1-T121-VERIFICATION.md]
  modified: [index.html, src/app.js, README.md, .planning/phases/phase-01/TASKS.md, .planning/phases/phase-01/P1-T101-VERIFICATION.md, .planning/phases/phase-01/P1-T106-VERIFICATION.md]
key-decisions:
  - "API-Diagnose bleibt ohne separaten Button ueber den Save-Preflight-Status sichtbar."
  - "Download-Export bleibt nur sekundaerer Fallback und wird neutral benannt."
patterns-established:
  - "Diagnose-Feedback wird im gleichen Save-Flow aktualisiert wie der eigentliche POST-Status."
  - "Fallback-Kommunikation nutzt konsequent neutrales Wording statt Alarmbegriffe."
requirements-completed: []
duration: 4min
completed: 2026-03-24
---

# Phase 1 Plan 21: Plan-Update-19 Summary

**Settings-Save-UX ohne separaten Diagnose-Button, mit integriertem Save-Preflight-Feedback und neutral benanntem sekundaeren Download-Fallback.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T18:36:33Z
- **Completed:** 2026-03-24T18:40:36Z
- **Tasks:** 5/5
- **Files modified:** 7

## Accomplishments
- Dedizierten `API Diagnose`-Button aus Settings entfernt und Diagnose-Status in den Save-Flow integriert.
- Download-/Export-Fallback in UI-Texten neutralisiert (kein `Notfall`-Wording).
- Phase-01 Doku/QA-Texte auf neutrales Fallback-Wording aktualisiert und Plan-Update-19 Nachweis dokumentiert.

## Task Commits

1. **Task P1-T117: Settings-UI bereinigen (Diagnose-Button entfernen)** - `96345d4` (feat)
2. **Task P1-T118: Download-Fallback neutral benennen** - `d5fb34a` (feat)
3. **Task P1-T119: Save-/Diagnose-Copy konsolidieren** - `9e50f94` (feat)
4. **Task P1-T120: Doku-/QA-Wording vereinheitlichen** - `ce8330b` (docs)
5. **Task P1-T121: Pflichtabnahme + Regression dokumentieren** - `2edff83` (test)

## Files Created/Modified
- `index.html` - Remove API diagnose button; adjust save/fallback UI wording.
- `src/app.js` - Remove button wiring, keep diagnose status updates in save preflight flow, neutralize fallback copy.
- `README.md` - Remove one-click diagnose reference; describe save-context diagnostics.
- `.planning/phases/phase-01/P1-T101-VERIFICATION.md` - Neutral fallback wording in QA text.
- `.planning/phases/phase-01/P1-T106-VERIFICATION.md` - Diagnose wording aligned to no-button save context.
- `.planning/phases/phase-01/P1-T121-VERIFICATION.md` - New mandatory acceptance/regression evidence for update 19.
- `.planning/phases/phase-01/TASKS.md` - Mark P1-T117..P1-T121 as DONE.

## Decisions Made
- Diagnose bleibt funktional als Save-Preflight-/Feedback-Kanal; kein separater Triggerbutton mehr.
- Download-Export bleibt verfügbar, wird aber konsistent als sekundaerer Fallback kommuniziert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `rg` im Environment nicht verfuegbar**
- **Found during:** Task P1-T121 (Regression-Nachweise)
- **Issue:** Shell-basierte Nachweis-Suche mit `rg` war nicht ausfuehrbar (`rg: command not found`).
- **Fix:** Nachweissuche auf das bereitgestellte `Grep`-Tool umgestellt.
- **Files modified:** none
- **Verification:** Trefferpruefungen fuer Button-/Wording-Patterns erfolgreich via `Grep`.
- **Committed in:** `2edff83` (part of task evidence workflow)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Keine Scope-Erweiterung; nur Tooling-Workaround fuer Nachweisfuehrung.

## Issues Encountered
- Kurzzeitig fehlte `rg` in der Umgebung; Nachweise wurden mit vorhandenem `Grep`-Tool reproduzierbar erbracht.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Save-/Diagnose-UX ist fuer den no-button Betrieb stabil und nachvollziehbar.
- Plan-Update-19 Akzeptanznachweis liegt in `P1-T121-VERIFICATION.md` vor.

---
*Phase: phase-01*
*Completed: 2026-03-24*

## Self-Check: PASSED

- FOUND: `.planning/phases/phase-01/1-21-SUMMARY.md`
- FOUND commits: `96345d4`, `d5fb34a`, `9e50f94`, `ce8330b`, `2edff83`
