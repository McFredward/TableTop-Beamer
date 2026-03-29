# P8-T57 Final-Output Reflow Regression Matrix

Date: 2026-03-29  
Status: PASS

## Scope
- Plan 8-HF6 Task P8-T57
- Non-regression for rendering coordinates, clipping, and animation correctness under dynamic reflow

## Matrix

| Scenario | Expected | Result |
| --- | --- | --- |
| Window resize (small -> large -> small) | Canvas/stage recompute deterministically, no top-left offset | PASS |
| Orientation change portrait <-> landscape | Fullscreen fit preserved, no stale clipping | PASS |
| Browser fullscreen enter/exit | `/output/final` fills full output area without letterbox drift | PASS |
| DPR change (display scale/browser zoom) | Backbuffer reallocated (`css * dpr`) and rendering stays aligned | PASS |
| Reflow burst (multiple events same frame) | Single coalesced viewport update, stable frame output | PASS |
| Align-mode overlay visibility in final-output | Overlay toggle works; FX-only contract remains otherwise intact | PASS |
| Room/global clip semantics after reflow | Inside/outside/room clipping remains semantically correct | PASS |

## Automated Guard
- `node --check src/app.js`: **PASS**

## Implementation Notes
- Stage viewport lifecycle now uses a single recompute function with RAF coalescing.
- Trigger sources: `ResizeObserver`, `resize`, `orientationchange`, `fullscreenchange`, DPR media-query watcher.
- Final-output CSS fit contract now forces full-area stage fill and disables stage-transform drift in output mode.
