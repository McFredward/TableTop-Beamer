# P8-T53 Root-Cause Analysis (`/output/final` Fullscreen Missfit)

Date: 2026-03-29  
Status: PASS

## Scope
- Plan 8-HF6 Task P8-T53
- Reproduce and isolate why `/output/final` shows top-left partial rendering in browser fullscreen

## Reproduction
1. Open `/output/final` on a device with non-1.0 DPR (or change DPR via browser zoom/display scale).
2. Toggle browser fullscreen and resize/orientation repeatedly.
3. Observe final output region over multiple transitions.

Observed in failing build:
- Final output occasionally keeps stale canvas backbuffer dimensions after fullscreen/viewport changes.
- Render can appear as top-left partial section (effective viewport mismatch between CSS size and backing pixels).

## Root Cause
- Stage/canvas sizing relied primarily on `ResizeObserver` with CSS-size-only backbuffer updates.
- Recompute triggers were incomplete for the fullscreen lifecycle (`fullscreenchange`) and DPR transitions.
- No deterministic coalesced reflow pipeline existed to recompute viewport metrics across resize/orientation/fullscreen/DPR as one consistent path.
- In final-output mode, stage fitting could still be influenced by generic stage transform/aspect defaults, increasing offset/crop risk under reflow.

## Fix Direction
- Introduce a single viewport recompute pipeline (CSS viewport + DPR -> canvas backbuffer).
- Trigger that pipeline via `ResizeObserver`, `resize`, `orientationchange`, `fullscreenchange`, and DPR watcher.
- Coalesce events with RAF scheduling to avoid reflow thrash.
- Enforce final-output fit contract in CSS (`projection-area` fixed inset, stage full fill, no stage transform drift).

## Evidence Linkage
- Implementation: P8-T54..P8-T56 (`src/app.js`, `src/styles.css`)
- Regression matrix: `P8-T57-FINAL-OUTPUT-REFLOW-REGRESSION.md`
- Plan verification: `8-HF6-VERIFICATION.md`
