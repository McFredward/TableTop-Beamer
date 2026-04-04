# Phase 1 - Plan 1-3 (Feedback Rework)

## Goal
Bring the current implementation in line with manual verification feedback for room-accurate interaction and controllable animation operations.

## Constraints
- No invented room semantics in UI labels or behavior.
- Room interactions must use board-shaped hex hit areas.
- Room effects must stay clipped to the selected room area.
- Keep global effects and room effects clearly separated.

## Executable Tasks

### Task 1 - Room Interaction Geometry Hardening
- Align board-specific room polygons and labels to actual board hex positions.
- Ensure room hover uses highlight only (no movement/scale animations).
- Ensure selected room state is stable across board switch.
- Files: `src/app.js`, `src/styles.css`
- Verify: hover each hex on both boards, confirm no position shift and accurate clickable area.

### Task 2 - Room Control Submenu Reliability
- Keep room submenu fully contextual to selected room click.
- Ensure room animation config supports intensity + duration + hold.
- Start action must always target currently selected room.
- Files: `index.html`, `src/app.js`
- Verify: click room -> choose animation -> start -> effect appears in that room only.

### Task 3 - Animation Scope Model + Runtime List
- Keep explicit separation: `global` vs `room` scope in runtime state.
- Keep running animation list complete, with per-item stop and room-item edit.
- Ensure edit action loads that animation back into room submenu.
- Files: `src/app.js`, `index.html`
- Verify: start multiple animations, stop individual entries, edit one room entry and re-apply.

### Task 4 - Power Outage Visibility + Output Route
- Ensure `power-outage` is clearly visible in all board states.
- Keep output route behavior explicit (`auto`, `beamer-fullscreen`, `windowed-preview`) with fallback.
- Files: `src/app.js`, `index.html`
- Verify: trigger power outage and check visible darkness/flicker; test fullscreen fallback.

### Task 5 - Regression Checks + Docs Sync
- Run syntax checks and basic smoke checks after rework.
- Sync phase docs if implementation deviates from acceptance wording.
- Files: `.planning/phases/phase-01/ACCEPTANCE.md`, `.planning/phases/phase-01/TASKS.md`, `.planning/phases/phase-01/1-3-SUMMARY.md`
- Verify: `node --check src/app.js` passes and summary records test evidence.

## Completion Criteria
- All 5 tasks completed with verification notes.
- Updated summary file created as `.planning/phases/phase-01/1-3-SUMMARY.md`.
- Work ready for `/gsd:verify-work 1`.
