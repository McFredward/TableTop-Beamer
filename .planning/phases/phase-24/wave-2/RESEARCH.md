# Phase 24 Wave 2 — Comment Hygiene Research

**Researched:** 2026-04-25
**Domain:** JavaScript codebase comment cleanup (no behaviour change)
**Confidence:** HIGH

---

## Summary

Wave 2 is a pure comment-hygiene pass. The acceptance bar is mechanical:
delete the historical phase markers, delete comments that paraphrase the
code beneath them, shorten long narrative blocks to keep just the WHY.
No executable line changes.

`src/` JS today carries **30 659 lines, 2 342 comment lines (7.63 %), 332
comment blocks ≥ 3 lines, 66 long blocks ≥ 8 lines, and 434 phase-marker
hits across 62 of 77 JS files**. The phase markers are heavily concentrated
— ~60 % of them sit in the seven largest modules — so a small number of
files drives the bulk of the wave.

**Primary recommendation:** Slice the wave into 5 atomic commits anchored on
file boundaries (highest-marker files first, then long-tail, then redundant
comments + section dividers). Treat the runtime-orchestration `// Phase
14-2: X moved to Y` comments as the easy bulk win — they are pure
archaeology and the `window.TT_BEAMER_RUNTIME_*.init({...})` line below each
one is self-documenting. CSS phase markers are out of scope per ROADMAP
(acceptance is `src/`-wide but flagged as "JS only" in this plan because
the design-system files were authored in Phase 22 and have a different
provenance/owner mental model — flag for user confirmation).

---

## 1. Baseline metrics

All counts run on `master` at HEAD (post-Wave-1, commit `d22be46`).

### Total volume

| Metric | Value | Command |
|--------|-------|---------|
| `.js` files in `src/` | 77 | `find src -type f -name "*.js" \| wc -l` |
| Total `.js` lines in `src/` | **30 659** | `find src -type f -name "*.js" -exec wc -l {} + \| tail -1` |
| Comment lines in `src/` (lines starting with `//`, `*`, or `/*` after optional whitespace) | **2 342** | `find src -type f -name "*.js" \| xargs grep -E '^\s*(//\|\*\|/\*)' \| wc -l` |
| **Comment density** = comments / total | **7.6300 %** | `echo "scale=4; 2342 / 30659 * 100" \| bc` |

### Block + marker counts

| Metric | Value | How measured |
|--------|-------|--------------|
| Comment blocks ≥ 3 consecutive comment lines | **332** | python scan: `//`-runs + `/* … */` blocks |
| Long blocks ≥ 8 consecutive comment lines | **66** | same scan |
| Phase-marker hits in `.js` | **434** | `grep -rn -E "Phase\s*[0-9]+\|Wave\s*[0-9]+\|HF[0-9]+\|W[0-9]+\s*v[0-9]+\|P[0-9]+-[0-9]+\|^\s*//\s*v[0-9]+:" src/ --include="*.js" \| wc -l` |
| Phase-marker hits in `.css` (out of scope per ROADMAP, recorded for §6 risk) | **73** | same regex, `--include="*.css"` |
| Files in `src/` with at least one phase marker (JS only) | **62 of 77** | `awk -F: '{print $1}' \| sort -u \| wc -l` |
| Section dividers `// ── …` style | **20** | all in one file, see §5 |
| Section dividers `// === / // --- ` style | **12** | spread across 2 files |
| JSDoc `/** … */` blocks in `src/` | **3** | one in `runtime-projection-mapping.js` |
| TODO / FIXME / XXX in `src/` | **0** | (Wave 1 did not need to touch any) |
| `console.info(` outside logger.js | **0** | Wave 1 acceptance, holds |

### CSS volume (for §6 scope decision only — NOT in this wave's bar)

| Metric | Value |
|--------|-------|
| `.css` lines in `src/` | 5 168 |
| `.css` comment lines | 429 |
| `.css` comment density | 8.30 % |
| `.css` phase markers | 73 |

These are the **Wave 6 baseline numbers** the closure summary will compare
against.

---

## 2. Phase-marker inventory

### Per-file counts (JS only, sorted)

| File | Markers | Notes |
|------|--------:|-------|
| `src/app/runtime/runtime-orchestration.js` | **93** | dominated by `// Phase 14-2: X moved to Y` ctx-init headers (~38 of these) — easy bulk win |
| `src/app/runtime/panels/runtime-fx-panels.js` | 27 | mostly Phase 15-3/15-9/18-2/20/21-1/22 W3*; mix of paraphrase + real WHY |
| `src/app/runtime/animation/runtime-animation-lifecycle.js` | 27 | concentrated in cluster-pads block (Phase 23 W2) and W2d list rendering |
| `src/app/runtime/ui/animation-editor-view.js` | 25 | almost all "Phase 22 W3b-*" — module is Phase 22 work; the marker prefix should go but most of the body is real WHY |
| `src/app/runtime/wire/runtime-wire-fx-panel-binders.js` | 19 | Phase 15-3/15-9/18-2/20/21-1/22 W3a |
| `src/app/runtime/render/runtime-draw-loop.js` | 18 | mix; several hold real WHY (HF7, HF8, P12-1) |
| `src/app/runtime/state/runtime-fx-normalizers.js` | 16 | Phase 15-8/15-9/20/21-1/22 W3a + 3 dividers (`========= INSIDE/OUTSIDE/ROOM =========`) |
| `src/app/runtime/viewport/runtime-viewport-zoom.js` | 13 | HF4/HF5/HF6 perf rationale — load-bearing WHY behind every marker |
| `src/app/runtime/viewport/runtime-projection-mapping.js` | 13 | Phase 19/22 W5/23 W3 + 20 section dividers (`// ── State ──`) |
| `src/app/runtime/polygon-editor/runtime-polygon-editor.js` | 13 | |
| `src/app/runtime/animation/runtime-runtime-controls.js` | 10 | |
| `src/app/runtime/animation/runtime-quick-mode.js` | 10 | |
| `src/app/runtime/wire/runtime-wire-room-audio-binders.js` | 9 | |
| `src/app/runtime/viewport/runtime-polygon-drag-support.js` | 7 | HF8/HF9/HF11/HF13 — all WHY, just strip prefix |
| `src/app/runtime/core/runtime-dom-refs.js` | 7 | |
| 22 more JS files | 2–6 each | tail |
| 25 JS files | 1 | mostly the file-header `// Phase 14-2: X module.` line |
| 15 JS files | 0 | nothing to touch |

Totals: **434 marker hits across 62 files**. (Full list in `/tmp/all_js_markers.txt` while the working tree is hot; planner can regenerate with the grep above.)

### Spot check: high-volume marker bands

Sampled with surrounding context to give the planner a feel for which
markers wrap real WHY vs. pure history.

#### "Phase 14-2: X moved to Y" — pure archaeology, **DELETE WHOLE BLOCK**

Pattern: orchestration's per-module init block. The `init({ ... })` call
beneath each one is self-documenting (the module name is in the symbol).

| File:Line | Marker text | Block size | Verdict |
|-----------|-------------|-----------:|---------|
| `runtime-orchestration.js:54-61` | `// Phase 14-2 reorg fix: polygon normalizers …` | 8 | **DELETE WHOLE** — historical reorg note |
| `runtime-orchestration.js:249-255` | `// Phase 14-2: stage viewport cluster (…) moved to …` | 7 | **DELETE WHOLE** |
| `runtime-orchestration.js:423-424` | `// Phase 14-2: global trigger revision + one-shot replay tracking moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:443-445` | `// Phase 14-2: snapshot builder + polling scheduler … moved to …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:482-485` | `// Phase 14-2: live-sync core (…, connectLiveSyncSocket — ~510 LOC) moved to …` | 4 | **DELETE WHOLE** |
| `runtime-orchestration.js:560-563` | `// Phase 14-2: audio pools + timers moved to runtime-audio.js / GIF playback cache moved to … / constants moved to runtime-outside-mp4.js.` | 4 | **DELETE WHOLE** |
| `runtime-orchestration.js:605-606` | `// Phase 14-2: polygon metrics + global animation helpers moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:628-629` | `// Phase 14-2: animation factory + flickerNoise + hitarea/geometry update helpers moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:656-657` | `// Phase 14-2: zone loader + board import (~295 LOC) moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:691-692` | `// Phase 14-2: viewport zoom functions now live in runtime-viewport-zoom.js.` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:700-702` | `// Phase 14-2: polygon contract + play areas + ship polygon + room geometry + tombstones moved to …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:756-757` | `// Phase 14-2: board profile hydration moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:807-808` | `// Phase 14-2: config-sync (persist/apply/discard, dirty flag lifecycle, server-unreachable overlay ~180 LOC) moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:836-837` | `// Phase 14-2: global defaults API facade + error/hint formatters + load/save/apply glue moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:902-904` | `// Phase 14-2: per-board state accessors (…) moved to …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:960-969` | `// Phase 14-2 reorg fix: three runtime modules (AUDIO, ROOM_GEOMETRY, LIVE_SYNC_HELPERS) lost their init() … Restore all three blocks here. They are placed after BOARD_STATE_ACCESSORS destructure because ROOM_GEOMETRY needs its direct refs (getHitareaCalibration, getRoomGeometry).` | 10 | **SHORTEN** to 1-line: `// Init order: must follow BOARD_STATE_ACCESSORS — ROOM_GEOMETRY destructures getHitareaCalibration / getRoomGeometry from it.` (the ordering constraint is real WHY) |
| `runtime-orchestration.js:1080` | `// Phase 14-2: GIF decoder moved to runtime-gif-decoder.js.` | 1 | **DELETE** |
| `runtime-orchestration.js:1086-1088` | `// Phase 14-2: GIF playback cache + frame getter live in runtime-gif-playback.js. Init + destructure …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:1106-1108` | `// Phase 14-2: outside MP4 playback + caches live in …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:1136-1137` | `// Phase 14-2: clamp helpers + hitarea/room-geometry panel syncs moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:1186-1188` | `// Phase 14-2: mobile layout + view visibility + setDashboardZone (~250 LOC) moved to …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:1233-1234` | `// Phase 14-2: runtime performance (mp4 quality loop, mobile status, mp4 controls panel ~265 LOC) moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:1271-1273` | `// Phase 14-2: runtime controls (~200 LOC: recordTriggerIntent, subtab state machine, upsertGlobalAnimation) moved to …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:1323` | `// Phase 14-2: quick-mode state machine lives in …` | 1 | **DELETE** |
| `runtime-orchestration.js:1367` | `// Phase 14-2: view visibility + exclusivity + setActiveView moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:1405` | `// Phase 14-2: 9 run*Regression runtime self-tests moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:1469` | `// Phase 14-2: polygon editor panel syncs moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:1519` | `// Phase 14-2: asset-ref normalizers moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:1552` | `// Phase 14-2: inside/outside/room FX profile normalizers moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:1640` | `// Phase 14-2: FX panel syncs (~560 LOC) moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:1791` | `// Phase 14-2: polygon editor drag/render + renderRoomOverlay moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:1884` | `// Phase 14-2: board switch cluster moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:1929` | `// Phase 14-2: room + cluster management (~615 LOC) moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:2136-2137` | `// Phase 14-2: room draft UI state + cluster runtime helpers (~330 LOC) moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:2200` | `// Phase 14-2: drawRoomComposition now lives in runtime-draw-loop.js` | 1 | **DELETE** |
| `runtime-orchestration.js:2206` | `// Phase 14-2: startRoomAnimationFromDraft moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:2245-2246` | `// Phase 14-2: animation lifecycle (stop/edit/list + stop-pending liveSync helpers) moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:2378` | `// Phase 14-2: canvas clip helpers live in …` | 1 | **DELETE** |
| `runtime-orchestration.js:2403` | `// Phase 14-2: drawEffectVisual lives in …` | 1 | **DELETE** |
| `runtime-orchestration.js:2417-2419` | `// Phase 14-2: draw loop (draw, pruneFinishedAnimations, drawOutsideFxLayer, …) moved to …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:2498` | `// Phase 14-2: navigation + board import + quick mode binders moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:2535` | `// Phase 13-2: zoom slider removed. Wheel + pinch gestures below replace it.` | 1 | **DELETE** (the wheel/pinch handlers immediately below are self-evident) |
| `runtime-orchestration.js:2539-2543` | `// Phase 13-HF6: global "touch gesture in progress" flag. When true, …` | 5 | **SHORTEN** — keep the WHY ("blocks rAF zoom-pan writes during a touch gesture so the writer doesn't fight the gesture handler") |
| `runtime-orchestration.js:2544` | `// Phase 14-2: polygon-drag support module (polygon drag flag, rAF wrappers, …) moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:2594-2596` | `// Phase 14-2: viewport zoom + pan (~300 LOC scattered across 4 regions) moved to …` | 3 | **DELETE WHOLE** |
| `runtime-orchestration.js:2643` | `// Phase 14-2: stage wheel + touch gesture state machine moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:2712` | `// Phase 14-2: polygon editor + play area event binders moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:2785` | `// Phase 14-2: room/inside/outside FX panel event binders moved to …` | 1 | **DELETE** |
| `runtime-orchestration.js:2901-2902` | `// Phase 14-2: roomOverlay pointer + document keyboard + window-level event binders moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:2967-2968` | `// Phase 14-2: room panel + audio + global config + mp4 perf binders moved to …` | 2 | **DELETE WHOLE** |
| `runtime-orchestration.js:3108` | `// Phase 14-2: syncRuntimePanelsFromState + initializeApplication …` | 1 | **DELETE** |

That's ~38 trivial deletions in one file, ~70 marker hits eliminated. C1 alone closes a big chunk of the marker count.

#### "Phase 14-2: X module." — file-header tag, **STRIP PREFIX**

Every runtime/panels/state/render/wire/animation/etc. module starts with
`// Phase 14-2: X module.` followed by a short module description. The
description IS load-bearing (tells reader what the module does) but the
"Phase 14-2:" prefix is dead history. Pattern across 25 files:

```js
// Phase 14-2: X module.
//
// Owns ...
```

becomes

```js
// X module.
//
// Owns ...
```

Files:
`runtime-mobile-layout.js:1`, `runtime-zone-loader.js:1`,
`runtime-live-sync-helpers.js:1`, `runtime-config-sync.js:1`,
`runtime-global-defaults.js:1`, `runtime-wire-navigation-binders.js:1`,
`runtime-viewport-zoom.js:1`, `runtime-view-visibility.js:1`,
`runtime-polygon-drag-support.js:1`, `runtime-snapshot-helpers.js:1`,
`runtime-canvas-clip.js:1`, `runtime-animation-lifecycle.js:1`,
`runtime-quick-mode.js:1`, `runtime-room-dispatch.js:1`,
`runtime-room-draft.js:1`, `runtime-room-management.js:1`,
`runtime-runtime-controls.js:1`, `runtime-board-switch.js:1`,
`runtime-bootstrap.js:1`, `runtime-fx-panels.js:1`,
`runtime-regression-tests.js:1`, `runtime-polygon-editor.js:1`,
`runtime-audio.js:1`, `runtime-draw-loop.js:1`,
`runtime-effect-visuals.js:1`, `runtime-gif-decoder.js:1`,
`runtime-gif-playback.js:1`, `runtime-outside-mp4.js:1`,
`runtime-perf.js:1`, `runtime-board-profiles.js:1`,
`runtime-fx-normalizers.js:1`, `runtime-play-area-geometry.js:1`,
`runtime-polygon-normalizers.js:1`, `runtime-room-geometry.js:1`,
`runtime-stage-viewport.js:1`, `runtime-wire-room-audio-binders.js:1`,
`runtime-live-sync-core.js:1`, `runtime-polygon-context-menu.js:1`,
`runtime-polygon-editor.js:1` (Phase 14-2),
`runtime-polygon-rotation.js:1` (Phase 21-1),
`runtime-polygon-undo.js:1` (Phase 18-3).

That's another ~40 markers killed by deleting the leading prefix on the
header line.

#### Real WHY behind a marker — **STRIP PREFIX, KEEP BODY**

These are the ones that look like history at first glance but the body
documents a non-obvious constraint. Always keep the body; just strip the
`// Phase X W Y v Z:` prefix.

| File:Line | Marker | What the body actually says | Verdict |
|-----------|--------|-----------------------------|---------|
| `runtime-projection-mapping.js:159-163` | `Phase 22 W5 v3:` | "WebGL mesh-warp state. The 2D-canvas per-triangle clip+drawImage approach produced seams because per-triangle affine transforms and clip-boundary AA disagree at shared edges. GL samples a single texture with per-vertex UVs — no clipping, no seam. Falls back to the 2D path when WebGL is unavailable." | **STRIP PREFIX** — body is the actual WHY |
| `runtime-projection-mapping.js:197-202` | `Phase 22 W5 v3:` | "RPi/Chromium lean WebGL options — no AA buffer (we don't need multisampling since the mesh is artifact-free), no premultiplied alpha (so texImage2D interprets the canvas colour buffer directly), and lowPower hint so the RPi's VideoCore can schedule the context on its integrated path …" | **STRIP PREFIX** |
| `runtime-projection-mapping.js:480-482` | `Phase 22 W5 v3:` | "WebGL path eliminates the per-triangle clip seams that were visible on MP4 content. Falls back to the 2D path below only if GL init fails (ancient browser / no GPU)." | **STRIP PREFIX** |
| `runtime-projection-mapping.js:74-77` | `Phase 22 W5 fix:` | "tolerate sub-pixel float drift in saved grids" | **STRIP PREFIX** |
| `runtime-projection-mapping.js:426-435` | `Phase 22 W5 v2:` | "inflate each triangle's clip polygon outward by ~1 px so the AA pixels at shared edges still get covered by both triangles." | **STRIP PREFIX** |
| `runtime-projection-mapping.js:484-487` | `Phase 23 W3 v2:` | "in /output/ the GL canvas is the visible surface, so show it now that we know it has fresh content." | **STRIP PREFIX** |
| `runtime-projection-mapping.js:290-293` | `Phase 23 W3:` | "upload the source canvas DIRECTLY. The previous approach wrote the canvas through a temp 2D buffer first; redundant copy now that GL accepts the canvas as the texImage2D source." | **STRIP PREFIX** |
| `runtime-projection-mapping.js:384-386` | `Phase 23 W3 v3:` | "clear fx-canvas after texture upload so its content doesn't show through the GL canvas in /output/" | **STRIP PREFIX** |
| `runtime-viewport-zoom.js:36-39` | `Phase 18:` | "always allow panning at any zoom level. The base overshoot calculation depended on the zoom > 1 invariant; users on mobile need to pan even at zoom 1.0 to access the corners after the topbar shrunk the available stage area." | **STRIP PREFIX** |
| `runtime-viewport-zoom.js:108-111` | `Phase 15-2:` | "zoom/pan state now persists across both dashboard and align-mode views — they share the underlying #stage transform." | **STRIP PREFIX** |
| `runtime-viewport-zoom.js:116-119` | `Phase 23 W2:` | "cluster rail position:fixed mirror needs to be notified on every zoom commit because it sits OUTSIDE the #stage subtree (avoiding the dashboard's overflow:hidden chain)." | **STRIP PREFIX** |
| `runtime-viewport-zoom.js:136-139` | `Phase 13-HF6:` | "skip this expensive status line update during an active touch gesture; the gesture handler will refresh it on commit." | **STRIP PREFIX** |
| `runtime-viewport-zoom.js:160-162` | `Phase 13-2:` | "zoom slider removed. This function is kept for ABI stability of the ~20 call sites that use it — it still refreshes the status line and the stage transform, it just no longer writes to a slider/label." | **SHORTEN** — drop "Phase 13-2: zoom slider removed" history; keep "Kept for ABI stability of ~20 call sites; refreshes status line + stage transform without writing to a slider." |
| `runtime-viewport-zoom.js:192-196` | `Phase 13-HF5:` | "rAF-coalesced zoom/pan writer. Called from high-frequency pan/zoom pointermove paths (touch pan, mouse wheel, pinch). Collapses many same-frame calls into a single updateCurrentBoardZoom() + DOM write per animation frame, which eliminates the mobile lag seen in HF4 touch pan." | **SHORTEN** — keep "rAF-coalesced zoom/pan writer; collapses many same-frame calls into one update + DOM write per frame, fixing mobile pan lag." Drop the "HF4" reference. |
| `runtime-viewport-zoom.js:259-262` | `Phase 13-HF6:` | "skip during an active touch gesture. The class flag was previously checked AFTER the work; moving it before the work avoids the wasted compute that caused dropped frames." | **STRIP PREFIX** |
| `runtime-viewport-zoom.js:310-322` | `Phase 13-HF4:` | full math derivation: `transform-origin: 50% 50%` zoom-around-anchor formula. **Load-bearing.** | **STRIP PREFIX** — `// Phase 13-HF4:` line goes; the derivation stays verbatim. (The matching block in `runtime-orchestration.js:2574-2596` is a duplicate — the math derivation is also there as imported documentation. Either keep both or move to a shared comment near the function definition; planner choice — recommend keep both, low risk.) |
| `runtime-polygon-drag-support.js:49-51` | `Phase 13-HF8:` | "rAF-coalesced wrapper around renderRoomOverlay()." | **STRIP PREFIX** |
| `runtime-polygon-drag-support.js:67-72` | `Phase 13-HF9:` | "incremental SVG drag renderer. On drag start we capture the static room poly + handle DOM, and on each frame we move only the dragged vertex node + its 2 adjacent edges, instead of rerendering the whole overlay. ~10x cheaper on long polygons." | **STRIP PREFIX** |
| `runtime-polygon-drag-support.js:129-132` | `Phase 13-HF11:` | "incremental drag renderer consumes points already converted to canonical coords (the wire layer applied the room's inverse transform), avoiding a redundant transform per frame." | **STRIP PREFIX** |
| `runtime-polygon-drag-support.js:198-201` | `Phase 13-HF13:` | "invert the live, session-stable room transform so the dragged vertex's stored canonical position matches the cursor screen position regardless of stretch / rotation." | **STRIP PREFIX** |
| `runtime-polygon-drag-support.js:219-225` | `Phase 13-HF8:` | "heavy-interaction lifecycle shared by all polygon edit gestures. The flag tells the draw loop to pause its render pipeline (see runtime-draw-loop.js HF7/HF8 guards) so the gesture stays smooth." | **SHORTEN** — keep "heavy-interaction flag: pauses the draw loop's render pipeline so the gesture stays smooth (see runtime-draw-loop.js's heavy-interaction guard)." |
| `runtime-polygon-drag-support.js:250-253` | `Phase 13-HF6:` | "cached stage geometry to avoid forced reflows during drag — calling getBoundingClientRect on every pointermove read causes layout thrash on long-running drags." | **STRIP PREFIX** |
| `runtime-draw-loop.js:114-118` | `Phase 21-1:` | "opt-in hull-flicker ⇒ solid-color coupling. When any running animation in this exact room resolves to hull-flicker AND its definition has breaksSolidColor=true, the flicker's off-gate overrides the solid-color fill so the lamp actually goes dark instead of just blinking on top of a lit surface." | **STRIP PREFIX** — load-bearing user-visible behaviour rule |
| `runtime-draw-loop.js:125-132` | `Phase 21-1:` | "when hull-flicker in this exact room has the breaksSolidColor flag on AND a sibling solid-color animation is running in the same room, the FLICKER is delivered purely by gating the solid-color fill on/off — the hull-flicker's own yellow-tube + black-dim overlay would double up …" | **STRIP PREFIX** |
| `runtime-draw-loop.js:711-719` | `Phase 13-HF7:` + `Phase 13-HF8:` | "pause the heavy animation render pipeline while a touch gesture is in flight. … recovers 20–40 ms of main-thread time per frame on mobile. … Phase 13-HF8: also pause during polygon drag. Same rationale …" | **SHORTEN** to one block: "Pause the render pipeline while a touch gesture or polygon drag is active. Recovers 20–40 ms / frame on mobile and removes drag lag." |
| `runtime-draw-loop.js:705-707` | `Phase 18:` | "tick loading overlay BEFORE any rendering so it always runs, even during heavy interaction early returns." | **STRIP PREFIX** |
| `runtime-draw-loop.js:794-798` | `Phase 18:` | loading-overlay dismiss commentary | **STRIP PREFIX** |
| `runtime-draw-loop.js:346-349` | `P12-1` | "order-invariant layering: when this room has ≥ 2 concurrent running animations, draw with additive composite so no effect can occlude another regardless of trigger order." | **STRIP PREFIX** — keep the rule |
| `runtime-draw-loop.js:726-729` | `P12-1` | duplicate of the above, generalized | **STRIP PREFIX** |
| `runtime-draw-loop.js:552-559` | `Phase 23 W2 v10:` | "minimal pad renderer — covers solid-color, fire, scanning. GIF/MP4 routed through a separate pad path that just blits the room's already-rendered frame from the main canvas (avoids re-decoding inside the pad)." | **STRIP PREFIX** |
| `runtime-draw-loop.js:569-571` | `Phase 23 W2 v11 fix:` | "clear EVERY pad canvas at the start so a stopped cluster doesn't keep its last frame on the rail." | **STRIP PREFIX** |
| `runtime-draw-loop.js:768-770` | `Phase 19-4:` | "post-draw mesh warp — deform canvas through grid if needed" | **DELETE** (this is paraphrasing `ctx.postDrawMeshWarp?.(canvas, c);` immediately below; the function name itself says everything) |
| `runtime-draw-loop.js:771-775` | `Phase 23 W2 v7:` | "blit each cluster animation's first member room region into its pad canvas. Pads are off-stage DOM elements that mirror the cluster's rendered animation as a miniature room. Runs only on dashboard (control role); /output/ doesn't render the rail at all." | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:23-30` | `Phase 23 W2 v6:` | "continuous rAF tracking of the cluster rail position. CSS transitions on .stage's transform mean the bounding rect interpolates over ~120 ms after every pan/zoom commit; one-shot rAF after the commit catches the START of the transition but the rail then drifts until the next render tick. A continuous rAF with diff-skip (only writes CSS variables when the rect actually changed) is cheap and keeps the rail perfectly glued." | **STRIP PREFIX** — load-bearing perf/UX rationale |
| `runtime-animation-lifecycle.js:994-1001` | `Phase 22 W2d:` | "compact single-line sub-meta. For non-stacked rooms/clusters we prefix the target name … stacked rows omit it because the subgroup header already shows it. Outside / Inside sections are board-wide so no target prefix. The 'hold' state … omitted because showing 'hold' on every row just adds noise." | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:1143-1156` | `Phase 23 W2:` + `Phase 23 W2 v6:` | "cluster pads — artificial mini-rooms next to the board. … sync the position:fixed cluster rail to the stage's current screen rect. … rail sits outside #stage in the DOM (avoiding the overflow:hidden chain inside the dashboard tree) but visually behaves as if attached to the stage's left edge." | **SHORTEN** to one merged block — split rationale collapses naturally; current text has two near-redundant Phase prefixes (Phase 23 W2 + Phase 23 W2 v6). |
| `runtime-runtime-controls.js:23-33` | `Phase 15-6:` | "graceful audio for global inside non-loop animations. When a non-loop inside global is stopped …, we previously called stopAnimationSound which hard-cut the voice mid-sample. … Now we pass `graceful: true` so the active iteration plays to its natural `ended` event …" | **SHORTEN** — drop "we previously called X" historical narrative; keep "Inside non-loop globals stop with `graceful: true` so the active sample plays to its natural `ended` event; outside / loop animations still hard-cut so ambient audio doesn't drift." |
| `runtime-runtime-controls.js:275-284` | `Phase 21-1:` | "align outside/inside global animations with the room model — copy the definition's tunable fields onto the running instance at trigger time so Settings only edits the DEFAULT and the running animation's values live on the instance (Live Editor target). Without this snapshot, the draw path reaches back into the definition every frame, which (a) prevents per-instance Live Editor edits from being visible, and (b) makes toggle-off+on 'revert' to the last committed-to-server definition since the live-sync snapshot roundtrip overwrites the local pending changes." | **STRIP PREFIX** — load-bearing |
| `runtime-fx-normalizers.js:40-47` | `Phase 22 W3a:` | "accept a design-system icon key if it exists in ICON_DEFS … null is the 'no user override' sentinel — resolveAnimationIcon falls back to its heuristic … If icons.js hasn't loaded yet (server-side snapshot parse, boot ordering quirks) we just round-trip whatever string came in, so we never lose the field …" | **STRIP PREFIX** — load-bearing fallback rationale |
| `runtime-icons.js:163-170` | `Phase 22 W2c:` | "heuristic icon resolver used until Wave 3 ships per-animation user-assigned icons via the animation editor. … Resolution order: explicit `definition.icon` (set once Wave 3 lands) → coded-effect type → asset type → name keyword → fallback." | **SHORTEN** — Wave 3 has shipped (Phase 22 wave 3 = Phase 22 W3 = the editor work); the "until Wave 3" framing is now misleading. Keep just the resolution-order spec. |
| `runtime-fx-panels.js:16-21` | `Phase 20:` | "separate 'which outside animation am I editing' from 'which outside animation is currently playing'. The dropdown in the Outside editor updates this UI-only map, not the persisted selectedAnimationId — switching the dropdown must not swap the live animation." | **STRIP PREFIX** — load-bearing UI invariant |

#### Pure paraphrase / dead history — **DELETE**

| File:Line | Marker | Code beneath | Verdict |
|-----------|--------|--------------|---------|
| `runtime-fx-panels.js:238` | `Phase 18-2: update mode indicator badge` | `if (ctx.insideModeIndicator) { … insideModeIndicator.textContent = "Editing: …"; … }` | **DELETE** (code is self-evident) |
| `runtime-fx-panels.js:462` | `Phase 18-2: update mode indicator badge and delete button visibility` | `if (ctx.roomModeIndicator) { … }` + delete-button visibility | **DELETE** |
| `runtime-fx-panels.js:840` | `Phase 18-2: update mode indicator badge` | same pattern, outside | **DELETE** |
| `runtime-fx-panels.js:227-230` | `Phase 21-1: keep the rename input in sync with the selected def.` | `if (ctx.insideAnimationRenameInput) ctx.insideAnimationRenameInput.value = …` | **DELETE** (variable name + value assignment ARE the comment) |
| `runtime-fx-panels.js:475` | `Phase 21-1: keep the rename input in sync with the selected def.` | `if (ctx.roomAnimationRenameInput) …` | **DELETE** |
| `runtime-fx-panels.js:830` | `Phase 21-1: keep the rename input in sync with the currently-edited def.` | outside variant | **DELETE** |
| `runtime-fx-panels.js:231` | `Phase 22 W3a: reflect selected definition's icon in the picker.` | `iconPickerApi.mount(...)?.setValue(selectedDefinition?.icon ?? null)` | **DELETE** |
| `runtime-fx-panels.js:479` | `Phase 22 W3a: reflect selected room definition's icon in the picker.` | room variant | **DELETE** |
| `runtime-fx-panels.js:834` | `Phase 22 W3a: reflect selected outside definition's icon in the picker.` | outside variant | **DELETE** |
| `runtime-orchestration.js:79-80` | `Phase 22 W3a: animation icon picker roots (Inside / Outside / Room).` | `insideIconPicker, outsideIconPicker, roomIconPicker,` (in destructure list) | **DELETE** — the names tell the same story |
| `runtime-orchestration.js:81-86` | `Phase 22 W3b: full-page animation editor DOM refs.` | `animEditorPage, animEditorBackButton, animEditorSearchInput, …` | **DELETE** — `animEditor*` prefix is self-documenting |
| `runtime-orchestration.js:100-102` | `Phase 22 W2b: topbar elements — brand sub-line label + running-count chip.` | `topbarBoardLabel, runningCountChip, runningCountChipLabel, …` | **DELETE** — names self-evident |
| `runtime-orchestration.js:1696-1697` | `Phase 22 W3a: icon picker roots threaded into the fx-panel ctx.` | `insideIconPicker, outsideIconPicker, roomIconPicker,` (in init args) | **DELETE** |
| `runtime-orchestration.js:2073-2079` | `Phase 22 W3b-2: setters + persist for the editor's patch flow. Phase 22 W3b-4d fix: use the raw setOutsideFxProfile, not updateOutsideFxProfile — the latter re-derives intensity / speed / mode / direction from the profile ROOT (the selection mirrors) and throws away whatever we patched on the animation definition itself, so sliders appeared stuck and never tripped the dirty comparison.` | (3 setter wrappers) | **SHORTEN** — keep "Use raw setters (not the update* wrappers): the wrappers re-derive intensity/speed/mode/direction from the profile root and clobber per-definition patches, leaving sliders stuck." |
| `runtime-orchestration.js:2065-2068` | `Phase 22: list of available boards + dashboard's active board id, used by the editor-scoped board picker. It intentionally does NOT expose switchBoard() — switching the editor's board must never move the dashboard's stage.` | `getBoards: () => BOARDS,` (one line) | **STRIP PREFIX** — the "no switchBoard" rule is load-bearing |
| `runtime-orchestration.js:2085-2087` | `Phase 22 W3b-3: needed by the Room color card to detect solid-color / hull-flicker coded effects.` | `resolveRoomCodedEffectType: (assetRef) => …` | **DELETE** — function name says it; the consumer (Room color card) is one short hop away |
| `runtime-orchestration.js:2089-2092` | `Phase 22 W3b-4 (revised): editor-scoped Apply / Discard + Back guard. Back uses window.confirm to block the exit when the user has unsaved edits.` | `applyLocalConfigToServer: () => …, discardLocalConfigAndReloadFromServer: () => …` | **SHORTEN** — drop the marker; keep "Back uses `window.confirm` to block exit when there are unsaved edits." or move to where the Back handler lives. |
| `runtime-orchestration.js:1737-1740` | `Phase 21-1: needed to detect "hull-flicker" backbone for the order-invariant rule.` | `resolveRoomCodedEffectType: (assetRef) => …,` | **DELETE** — already covered by the function name |
| `runtime-orchestration.js:1895-1896` | `Phase 22 W2b: topbar brand sub-line mirrors the board label.` | `if (topbarBoardLabel) topbarBoardLabel.textContent = label;` | **DELETE** — code is self-evident |
| `runtime-orchestration.js:2254-2256` | `Phase 22 W2b: topbar running-count chip refs, consumed by …` | `runningCountChip, runningCountChipLabel, …` (in init) | **DELETE** |
| `runtime-orchestration.js:2315-2316` | `Phase 21-1: Live Editor needs this to detect the solid-color coded effect.` | `resolveRoomCodedEffectType: …` | **DELETE** — name self-evident |
| `runtime-orchestration.js:2326-2328` | `Phase 21-1: needed by the Live Editor to resolve outside definition fields. Live-sync snapshot replay uses these fields too. Old snapshots may not have those fields yet (legacy pre-Phase 21 snapshots).` | (getter wires) | **SHORTEN** — keep "Pre-Phase-21 snapshots may lack mode/direction/etc.; the getters tolerate missing fields." (the back-compat is real WHY) |
| `runtime-orchestration.js:2348-2349` | `Phase 21-1: needed by the Active Animations list to bucket room vs cluster animations.` | `resolveRoomFxProfile: …, getRoomAnimationDefinitionById: …` | **DELETE** — names self-evident |
| `runtime-orchestration.js:2351-2353` | `Phase 23 W2: cluster pads need access to the cluster catalog + tap-action mode + draft mutators.` | (cluster ctx) | **STRIP PREFIX** if planner wants — actually mostly paraphrasing the wires below; recommend **DELETE** |
| `runtime-orchestration.js:2480-2481` | `Phase 19-4: post-draw mesh warp (unified grid projection)` | `postDrawMeshWarp: () => …,` (one ctx wire) | **DELETE** — redundant with function name |
| `runtime-orchestration.js:2482-2483` | `Phase 23 W2 v7: cluster pads need the room polygon pixels of cluster member rooms to blit into pad canvases.` | `getRoomPoints: …,` (one ctx wire) | **DELETE** — redundant; this is a paraphrase of "yes, we wire this so consumers can use it" |
| `runtime-orchestration.js:2795-2796` | `Phase 22 W3a: icon-picker roots consumed by the mount() calls in fx-panel binders.` | (ctx wires) | **DELETE** |
| `runtime-orchestration.js:2890-2891` | `Phase 21-1: called by commitRoomDraftToDefinition to refresh the Active Animations list after a definition rename.` | (ctx wire entry) | **DELETE** — caller name is right there |
| `runtime-orchestration.js:3092-3093` | `Phase 19-2: recompute projection mapping on resize` | `if (typeof recomputeProjectionMapping === "function") recomputeProjectionMapping();` | **DELETE** |
| `runtime-orchestration.js:3103-3104` | `Phase 18: initialize slider touch guard for mobile scroll protection` | `window.TT_BEAMER_RUNTIME_SLIDER_TOUCH_GUARD?.init();` | **DELETE** |
| `runtime-orchestration.js:309` | `Phase 19-2: projection mapping — 4-corner warp for /output.` | `window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init({ … })` | **DELETE** — module name says it (but the surrounding ~30 lines have other notes worth keeping) |
| `runtime-orchestration.js:319-321` | `Phase 19-2: persist projection corners via the existing global-defaults pipeline.` | (ctx wire) | **DELETE** |
| `runtime-orchestration.js:336-338` | `Phase 19-4: post-draw mesh warp (replaces begin/end grid warp)` | (ctx wire) | **DELETE** — "replaces X" is dead history |
| `runtime-orchestration.js:351-353` | `Phase 13-HF3: opt-in save. Local config edits stay local (dirty) until the user explicitly applies (our changes win) or discards (peer's changes win).` | `state.localConfigDirty = false; state.remoteConfigUpdateAwaiting = false;` | **STRIP PREFIX** — the "until applies/discards" rule is load-bearing |
| `runtime-orchestration.js:359-366` | `Phase 13-HF13:` | "stable stretch-anchor cache. Keyed as `${boardId}::${roomId}` → { x, y }. The anchor is the polygon centroid captured on first access and held for the life of the session (cleared on rehydration). Using a stable anchor makes `getRoomTransform` and `getRoomPoints` independent of the live polygon centroid, so vertex edits no longer shift the displayed position of non-dragged vertices when stretch != 1." + planning doc reference | **STRIP PREFIX** — full WHY is here. The `.planning/phases/phase-13/...` reference: borderline; can keep one URL or drop with the marker. Recommend keep — it's a one-line citation, not narrative. |
| `runtime-orchestration.js:385-387` | `Phase 22 W2e: "toggle" replaces the split activate/deactivate modes in the UI. The legacy names stay in the valid set so snapshots that still carry them load without tripping the normalize fallback.` | `const QUICK_MODE_VALUES = new Set(["off", "activate", "deactivate", "toggle", …])` | **STRIP PREFIX** — the back-compat rationale is exactly the WHY behind the seemingly-extra entries in the Set |
| `runtime-orchestration.js:173-177` | `Phase 21-1: purge stale entries. The board-import-* and export/import-global-defaults controls were replaced by the unified "Share a Board" zip bundle in Phase 20 — their IDs no longer exist in index.html, so validateSettingsControlOwnership was logging a noisy "missing control" leak on every resize / view switch.` | `const SETTINGS_EXCLUSIVE_CONTROL_IDS = [...]` | **SHORTEN** — keep "These IDs no longer exist in index.html (replaced by the 'Share a Board' bundle); listing them here suppressed the noisy 'missing control' log." Drop "Phase 21-1" / "Phase 20" framing. |
| `runtime-config-sync.js:80-83` | `Phase 15-1: dirty flag only fires when state actually differs from server (not on every snapshot replay).` | `if (deepEquals(state.x, serverX)) return;` | **STRIP PREFIX** |
| `runtime-config-sync.js:38-47` | `Phase 21-1: normalizeInsideFxProfile / normalizeOutsideFxProfile … (10-line paragraph)` | (normalizer wires) | Inspect during execution — likely **STRIP PREFIX** |

#### Inline marker line, no surrounding context — **STRIP PREFIX** (replace with empty if marker is the whole comment)

Lots of one-liners like:

| File:Line | Marker | Verdict |
|-----------|--------|---------|
| `runtime-orchestration.js:277` | `// Phase 19-2: projection mapping align mode integration` | **DELETE** — sub-block label, not a real WHY |
| `runtime-fx-panels.js:38-43` | `Phase 15-9: shared sound-selector dropdown populator. …` (multi-line description of `populateSoundSelector`) | **STRIP PREFIX** — useful module-internal docstring |
| `runtime-fx-panels.js:407` | `Phase 15-3: carry transform options through the draft.` | **STRIP PREFIX** (single line — the "carry through draft" reminder is real) |
| `runtime-fx-panels.js:208-211` | `Phase 22 W3b-5 fix: the Dashboard's Inside-Play-Area global animation runner ignores edits from the editor unless we re-emit the start trigger after the patch.` | **STRIP PREFIX** — load-bearing |
| `runtime-fx-panels.js:442-444` | `Phase 22 W3b-5 fix: the Dashboard's "Room animation" picker ignores edits from the editor unless …` | **STRIP PREFIX** — same pattern, load-bearing |
| `runtime-fx-panels.js:802-806` | `Phase 22 W3b-5 fix: Dashboard's Outside-Play-Area buttons …` | **STRIP PREFIX** — same |
| `runtime-fx-panels.js:893` | `Phase 20: "is this running animation the outside animation for this …` | **STRIP PREFIX** |
| `runtime-wire-fx-panel-binders.js:486` | `Phase 21-1: optimistic local apply + persist so the dirty flag fires on the same input event.` | **STRIP PREFIX** — same line repeated 4 times in the file, all load-bearing |
| `runtime-wire-fx-panel-binders.js:533` | (same) | **STRIP PREFIX** |
| `runtime-wire-fx-panel-binders.js:613` | (same) | **STRIP PREFIX** |
| `runtime-wire-fx-panel-binders.js:716` | (same) | **STRIP PREFIX** |
| `runtime-wire-fx-panel-binders.js:863` | `Phase 22 W3a: one-time icon-picker mounts. Each picker's …` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:113-114` | `Phase 21-1: outside-specific knobs. Populated + shown in …` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:124-125` | `Phase 21-1: coded-specific Color picker — only surfaced when the …` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:740-744` | `Phase 22 W2b / W5: topbar running-count chip — split into Default and Custom labels …` | **STRIP PREFIX** — the chip-label split is real WHY |
| `runtime-animation-lifecycle.js:757-760` | `Phase 22 W5 fix: outside animations persist via the outside profile, not the runningAnimations array — count from the profile when computing the chip total.` | **STRIP PREFIX** — important rule for future readers |
| `runtime-animation-lifecycle.js:790-794` | `Phase 21-1: categorize into Outside / Inside / Cluster / Room / Frozen sections.` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:833-837` | `Phase 22 W2d: within Room / Cluster / Frozen sections, animations are further grouped by the room or cluster they target so the user can …` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:952-956` | `Phase 22 W2d: icon tile prepended to each row. Tint driven by …` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:1063-1066` | `Phase 21-1: also allow Live Editor on scope="global" so outside animations can be tuned at runtime.` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:1135-1137` | `Phase 23 W2: cluster pads share the same state-driven update pipeline as the running list.` | **STRIP PREFIX** or **DELETE** (one line, marginal) |
| `runtime-animation-lifecycle.js:1185-1188` | `Phase 23 W2 v8: pads now live in the inner scrollable list, not a fixed bar — touch-momentum scrolling + the rail rect tracking work together so the pads pan/zoom with the stage.` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:1224-1227` | `Phase 23 W2 v7: per-pad canvas. Animation pixels for the cluster's first member room get blit into this canvas every draw frame.` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:1238-1241` | `Phase 23 W2 v6: pad behaves exactly like a room — tap dispatches via the active Tap-Action.` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:1278-1281` | `Phase 23 W2 v6: pad tap routes through the active Tap-Action (toggle / clear / off).` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:1151-1156` | `Phase 23 W2 v6: sync the position:fixed cluster rail to the stage's current screen rect. Called on every renderClusterPads tick + on window resize so the rail tracks pan/zoom in real time. The rail sits outside #stage in the DOM (avoiding the overflow:hidden chain inside the dashboard tree) but visually behaves as if attached to the stage's left edge.` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:304-305` | `mode/direction yet (e.g. legacy running animation pre-Phase 21).` | inline back-compat reference; **STRIP** the "pre-Phase 21" framing — say "(legacy running animation that doesn't carry mode/direction yet)." |
| `runtime-animation-lifecycle.js:419-421` | `Phase 21-1: for cluster-scope edits, also broadcast each cluster member as a room-scope edit so the live preview tracks every member room's running animation.` | **STRIP PREFIX** |
| `runtime-animation-lifecycle.js:448-450` | `Phase 21-1: for cluster-scope edits, propagate the field to every cluster member's running room animation.` | **STRIP PREFIX** |

(The full set lives in `/tmp/all_js_markers.txt` — 434 entries. The above
is the categorized sampler the planner needs to write atomic commits.)

### Marker bands by phase (rough buckets)

This helps the planner think about scope:

| Bucket | Approx. count | Typical disposition |
|--------|--------------:|---------------------|
| Phase 14-2 (T51 reorg headers) | ~110 | DELETE WHOLE / STRIP PREFIX from `// Phase 14-2: X module.` lines |
| Phase 13 / 13-HF1..HF13 (perf + projection) | ~35 | STRIP PREFIX, keep WHY (most are perf rationales) |
| Phase 15-* (audio + transform) | ~25 | mostly STRIP PREFIX |
| Phase 18 / 18-2 / 18-3 (mobile, mode badge, polygon undo) | ~20 | mix — most paraphrase code, **DELETE** is common |
| Phase 19-2 / 19-4 (projection) | ~15 | STRIP PREFIX, keep math/derivation |
| Phase 20 (animation refactor) | ~15 | STRIP PREFIX |
| Phase 21-1 (room-model alignment + Live Editor) | ~70 | mix — many real WHY (back-compat rules), several paraphrase |
| Phase 22 W2 / W2b / W2c / W2d / W2e (UI polish + topbar) | ~30 | mix — UI rationale stays, paraphrase goes |
| Phase 22 W3a / W3b / W3b-2..W3b-5 (icons + editor) | ~85 | most STRIP PREFIX (the editor was a big arc, lots of constraints documented) |
| Phase 22 W4 / W5 / W5 v2 / W5 v3 (theme + WebGL warp) | ~10 | STRIP PREFIX, all load-bearing rendering rationale |
| Phase 23 W2 / W2 v6..v11 (cluster rail + pads) | ~35 | STRIP PREFIX, all load-bearing |
| Phase 23 W3 / W3 v2..v3 (GL canvas in /output/) | ~5 | STRIP PREFIX, load-bearing |
| P12-1 + Order-invariant layering | 2 | STRIP PREFIX, keep rule |
| HF / HF1..HF13 standalone | ~10 | STRIP PREFIX, all perf |

---

## 3. Redundant-comment heuristic pass

Sample of comments whose text just paraphrases the code immediately
beneath. Drawn from the largest files. ~30 examples.

| File:Line | Comment | Code beneath | Verdict |
|-----------|---------|--------------|---------|
| `runtime-fx-panels.js:238` | `// Phase 18-2: update mode indicator badge` | mode-indicator if/else block | **DELETE** |
| `runtime-fx-panels.js:462` | `// Phase 18-2: update mode indicator badge and delete button visibility` | same | **DELETE** |
| `runtime-fx-panels.js:840` | `// Phase 18-2: update mode indicator badge` | same (outside) | **DELETE** |
| `runtime-fx-panels.js:227-228` | `// Phase 21-1: keep the rename input in sync with the selected def.` | `if (ctx.insideAnimationRenameInput) ctx.insideAnimationRenameInput.value = …;` | **DELETE** |
| `runtime-fx-panels.js:475` | `// Phase 21-1: keep the rename input in sync with the selected def.` | room variant | **DELETE** |
| `runtime-fx-panels.js:830` | `// Phase 21-1: keep the rename input in sync with the currently-edited def.` | outside variant | **DELETE** |
| `runtime-fx-panels.js:231` | `// Phase 22 W3a: reflect selected definition's icon in the picker.` | `iconPickerApi.mount(...)?.setValue(selectedDefinition?.icon ?? null);` | **DELETE** |
| `runtime-fx-panels.js:479` | `// Phase 22 W3a: reflect selected room definition's icon in the picker.` | room variant | **DELETE** |
| `runtime-fx-panels.js:834` | `// Phase 22 W3a: reflect selected outside definition's icon in the picker.` | outside variant | **DELETE** |
| `runtime-orchestration.js:2480-2481` | `// Phase 19-4: post-draw mesh warp (unified grid projection)` | `postDrawMeshWarp: (canvas, c) => recomputeProjectionMapping?.postDrawMeshWarp?.(canvas, c),` | **DELETE** |
| `runtime-orchestration.js:79-80` | `// Phase 22 W3a: animation icon picker roots (Inside / Outside / Room).` | `insideIconPicker, outsideIconPicker, roomIconPicker,` | **DELETE** |
| `runtime-orchestration.js:81-83` | `// Phase 22 W3b: full-page animation editor DOM refs.` | `animEditorPage, animEditorBackButton, animEditorSearchInput, …` | **DELETE** |
| `runtime-orchestration.js:100-102` | `// Phase 22 W2b: topbar elements — brand sub-line label + running-count chip.` | `topbarBoardLabel, runningCountChip, …` | **DELETE** |
| `runtime-orchestration.js:1696-1697` | `// Phase 22 W3a: icon picker roots threaded into the fx-panel ctx.` | (ctx wires) | **DELETE** |
| `runtime-orchestration.js:1737-1738` | `// Phase 21-1: needed to detect "hull-flicker" backbone …` | `resolveRoomCodedEffectType: (assetRef) => …` | **DELETE** — function name says it |
| `runtime-orchestration.js:2085-2087` | `// Phase 22 W3b-3: needed by the Room color card to detect solid-color / hull-flicker coded effects.` | `resolveRoomCodedEffectType: …,` | **DELETE** |
| `runtime-orchestration.js:2315-2316` | `// Phase 21-1: Live Editor needs this to detect the solid-color coded effect.` | (same identifier) | **DELETE** |
| `runtime-orchestration.js:2348-2349` | `// Phase 21-1: needed by the Active Animations list to bucket room vs cluster animations.` | (ctx wires) | **DELETE** |
| `runtime-orchestration.js:2482-2483` | `// Phase 23 W2 v7: cluster pads need the room polygon pixels of cluster member rooms to blit into pad canvases.` | `getRoomPoints: …,` | **DELETE** |
| `runtime-orchestration.js:2795-2796` | `// Phase 22 W3a: icon-picker roots consumed by the mount() calls in fx-panel binders.` | (ctx wires) | **DELETE** |
| `runtime-orchestration.js:2890-2891` | `// Phase 21-1: called by commitRoomDraftToDefinition to refresh the Active Animations list after a definition rename.` | (ctx wire) | **DELETE** |
| `runtime-orchestration.js:3092-3093` | `// Phase 19-2: recompute projection mapping on resize` | `if (typeof recomputeProjectionMapping === "function") recomputeProjectionMapping();` | **DELETE** |
| `runtime-orchestration.js:3103-3104` | `// Phase 18: initialize slider touch guard for mobile scroll protection` | `window.TT_BEAMER_RUNTIME_SLIDER_TOUCH_GUARD?.init();` | **DELETE** |
| `runtime-orchestration.js:1895-1896` | `// Phase 22 W2b: topbar brand sub-line mirrors the board label.` | `if (topbarBoardLabel) topbarBoardLabel.textContent = label;` | **DELETE** |
| `runtime-orchestration.js:2254-2256` | `// Phase 22 W2b: topbar running-count chip refs, consumed by the running list.` | (init args) | **DELETE** |
| `runtime-draw-loop.js:768-770` | `// Phase 19-4: post-draw mesh warp — deform canvas through grid if needed` | `ctx.postDrawMeshWarp?.(canvas, c);` | **DELETE** |
| `runtime-fx-panels.js:299` | `// Phase 20: one dashboard button per outside animation definition.` | dashboard button rendering loop | **DELETE** (loop is self-evident) |
| `runtime-fx-panels.js:744` | `// Phase 20: wire the two-tab switcher in every animation section.` | tab-switcher wires | **DELETE** |
| `runtime-fx-normalizers.js:340-342` | `// Phase 20: "is this animation type an outside animation?" — driven by the legacy hard-coded list.` | `function isOutsideAnimationType(...) { return OUTSIDE_ANIMATION_TYPES.includes(...); }` | **STRIP PREFIX** — the "legacy hard-coded list" hint may be useful; planner judges |
| `runtime-orchestration.js:309-310` | `// Phase 19-2: projection mapping — 4-corner warp for /output.` | `window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING.init({ … })` | **DELETE** |
| `runtime-animation-lifecycle.js:1135-1137` | `// Phase 23 W2: cluster pads share the same state-driven update pipeline as the running list.` | `try { renderClusterPads(); } catch { … }` | **DELETE** — the `try { renderClusterPads(); }` line is self-evident |

The 30-sample is dense in `runtime-orchestration.js` because the
"// Phase X: needed by Y" → `Y: (...) => Y(...)` pattern is the dominant
form of paraphrase comment in this codebase. `runtime-fx-panels.js` has
a parallel pattern around UI mode badges and rename inputs.

`runtime-projection-mapping.js`, `animation-editor-view.js`, and
`runtime-draw-loop.js` had **almost no** redundant comments by this
heuristic — most of their comments do real explanatory work. Good news
for the planner: redundant-comment removal is concentrated in two files
(orchestration + fx-panels).

**Conservatism rule** (executor must follow): when the comment carries any
information the code symbol doesn't (`back-compat reason`, `live-sync
edge case`, `ordering constraint`, etc.), KEEP IT — only drop comments
that genuinely paraphrase the immediately-following identifier. When in
doubt, KEEP.

---

## 4. Long comment block inventory (≥ 8 lines)

66 blocks total. Grouped by tentative disposition.

### A. Module-header docstrings — **KEEP**, strip the `Phase 14-2:` prefix on line 1

These are the file-level "what is this module" headers that exist on most
runtime-side modules. They are load-bearing for new readers; the marker
prefix is the only thing to remove.

| File:Line range | Lines | First sentence (post-strip) | Action |
|-----------------|------:|------------------------------|--------|
| `runtime-animation-lifecycle.js:1-14` | 14 | "animation lifecycle module." | **STRIP PREFIX** |
| `runtime-quick-mode.js:1-14` | 14 | "quick-mode module." | **STRIP PREFIX** |
| `runtime-room-dispatch.js:1-9` | 9 | "room dispatch module." | **STRIP PREFIX** |
| `runtime-room-draft.js:1-13` | 13 | "room draft + cluster runtime helpers module." | **STRIP PREFIX** |
| `runtime-room-management.js:1-8` | 8 | "room + cluster management module." | **STRIP PREFIX** |
| `runtime-runtime-controls.js:1-11` | 11 | "runtime controls module." | **STRIP PREFIX** |
| `runtime-board-switch.js:1-8` | 8 | "board switch module." | **STRIP PREFIX** |
| `runtime-bootstrap.js:1-8` | 8 | "application bootstrap module." | **STRIP PREFIX** |
| `runtime-config-sync.js:1-8` | 8 | "config-sync module." | **STRIP PREFIX** |
| `runtime-global-defaults.js:1-9` | 9 | "global defaults API + error/hint formatting module." | **STRIP PREFIX** |
| `runtime-live-sync-core.js:1-11` | 11 | "live-sync core module." | **STRIP PREFIX** |
| `runtime-live-sync-helpers.js:1-10` | 10 | "live-sync helpers module." | **STRIP PREFIX** |
| `runtime-zone-loader.js:1-9` | 9 | "zone loader + board import module." | **STRIP PREFIX** |
| `runtime-fx-panels.js:1-12` | 12 | "FX panel syncs module." | **STRIP PREFIX** |
| `runtime-regression-tests.js:1-9` | 9 | "runtime regression self-tests module." | **STRIP PREFIX** |
| `runtime-polygon-context-menu.js:1-8` | 8 | "board context menu for direct room creation." | **STRIP PREFIX** |
| `runtime-polygon-editor.js:1-8` | 8 | "polygon editor drag/render + room overlay module." | **STRIP PREFIX** |
| `runtime-polygon-rotation.js:1-12` | 12 | "optional polygon rotation mode." | **STRIP PREFIX** |
| `runtime-polygon-undo.js:1-8` | 8 | "undo/redo system for polygon editing operations." | **STRIP PREFIX** |
| `runtime-audio.js:1-21` | 21 | "audio pipeline module." | **STRIP PREFIX** |
| `runtime-canvas-clip.js:1-13` | 13 | "canvas clipping helpers module." | **STRIP PREFIX** |
| `runtime-draw-loop.js:1-14` | 14 | "draw loop module." | **STRIP PREFIX** |
| `runtime-effect-visuals.js:1-15` | 15 | "coded effect visuals module." | **STRIP PREFIX** |
| `runtime-gif-decoder.js:1-12` | 12 | "pure GIF decoder module." | **STRIP PREFIX** |
| `runtime-gif-playback.js:1-14` | 14 | "GIF playback cache + frame getter module." | **STRIP PREFIX** |
| `runtime-outside-mp4.js:1-15` | 15 | "outside MP4 playback module." | **STRIP PREFIX** |
| `runtime-perf.js:1-9` | 9 | "runtime performance module." | **STRIP PREFIX** |
| `runtime-board-profiles.js:1-8` | 8 | "board profile hydration module." | **STRIP PREFIX** |
| `runtime-play-area-geometry.js:1-8` | 8 | "play area + room geometry + polygon contract module." | **STRIP PREFIX** |
| `runtime-polygon-normalizers.js:1-14` | 14 | "runtime-side polygon normalizers." | **STRIP PREFIX** |
| `runtime-room-geometry.js:1-15` | 15 | "room-geometry helpers module." | **STRIP PREFIX** |
| `runtime-mobile-layout.js:1-9` | 9 | "mobile layout + view visibility module." | **STRIP PREFIX** |
| `runtime-polygon-drag-support.js:1-21` | 21 | "polygon-drag support module." | **STRIP PREFIX** |
| `runtime-projection-mapping.js:1-20` | 20 | (Phase 19-4 marker) "Unified Grid Projection System." | **STRIP PREFIX** |
| `runtime-slider-touch-guard.js:1-12` | 12 | "prevent accidental slider activation while scrolling on mobile." | **STRIP PREFIX** |
| `runtime-stage-viewport.js:1-8` | 8 | "stage viewport + align mode + mapping helpers." | **STRIP PREFIX** |
| `runtime-wire-room-audio-binders.js:1-8` | 8 | "room panel + audio + global config + mp4 perf binders." | **STRIP PREFIX** |
| `animation-editor-view.js:1-24` | 24 | "full-page animation editor controller." | **STRIP PREFIX** |
| `icon-picker.js:1-13` | 13 | "reusable animation-icon picker." | **STRIP PREFIX** |
| `icons.js:1-23` | 23 | "inline-SVG icon primitives." (public API doc) | **STRIP PREFIX** |

That's 40 blocks. Bulk action: regex-strip the leading `// Phase X[-Y]:`
or `// Phase X W Y:` token from line 1 of each header, leaving the
description.

### B. In-function long blocks with real WHY — **STRIP PREFIX, KEEP BODY**

The marker is the leading 1-2 words; everything else is load-bearing. ~22
blocks fall into this bucket.

| File:Line range | Lines | Topic | Action |
|-----------------|------:|-------|--------|
| `runtime-runtime-controls.js:23-33` | 11 | graceful-stop audio rationale | STRIP PREFIX, slight shorten (drop "we previously called X" history) |
| `runtime-runtime-controls.js:275-284` | 10 | snapshot tunable fields onto running instance — Live Editor edit target | STRIP PREFIX |
| `runtime-config-sync.js:38-47` | 10 | normalize{Inside,Outside}FxProfile — what they do | STRIP PREFIX |
| `runtime-animation-lifecycle.js:23-30` | 8 | cluster-rail rAF tracking — perf rationale | STRIP PREFIX |
| `runtime-animation-lifecycle.js:994-1001` | 8 | running-list compact sub-meta — why prefix is conditional | STRIP PREFIX |
| `runtime-animation-lifecycle.js:1143-1156` | 14 | cluster pads design + rail rect tracking | SHORTEN (merge two adjacent Phase 23 W2 prefixes; current text has redundant framing) |
| `runtime-draw-loop.js:125-132` | 8 | hull-flicker × solid-color render coupling rule | STRIP PREFIX |
| `runtime-draw-loop.js:552-559` | 8 | minimal pad renderer scope | STRIP PREFIX |
| `runtime-draw-loop.js:646-653` | 8 | drawRoomComposition / withPreviewCanvas wrap | (no Phase prefix) — KEEP AS-IS |
| `runtime-draw-loop.js:711-719` | 9 | render pipeline pause during touch / drag | SHORTEN to one block (current text has both `Phase 13-HF7:` and `Phase 13-HF8:` prefixes for adjacent rationales) |
| `runtime-effect-visuals.js:273-280` | 8 | live-preview ctx swap rationale | STRIP PREFIX |
| `runtime-perf.js:102-109` | 8 | loop-until-stopped globals — hold semantics | STRIP PREFIX |
| `runtime-orchestration.js:54-61` | 8 | polygon normalizers init order constraint | STRIP PREFIX (the "T51 reorg fix" framing can go; the ordering constraint is real) |
| `runtime-orchestration.js:359-366` | 8 | stable stretch-anchor cache | STRIP PREFIX (keep planning doc URL on line 366) |
| `runtime-orchestration.js:960-969` | 10 | three-module init order rationale | SHORTEN — collapse "Phase 14-2 reorg fix: …" history into a 1-2 line ordering constraint |
| `runtime-orchestration.js:2574-2596` | 23 | zoom-around-anchor math derivation | STRIP PREFIX (math stays; this is the most load-bearing comment in orchestration) |
| `runtime-projection-mapping.js:24-33` | 10 | unified grid system explanation (under `// ── State ──` divider) | KEEP AS-IS or STRIP PREFIX (no Phase prefix on this one) |
| `runtime-projection-mapping.js:426-435` | 10 | clip polygon inflation for AA | STRIP PREFIX |
| `runtime-fx-normalizers.js:40-47` | 8 | icon-key normalize fallback | STRIP PREFIX |
| `runtime-regression-tests.js:463-471` | 9 | drop "invalid polygon must be rejected" subtest — why | SHORTEN (history-heavy) — flag for **test-file carve-out**: this IS a runtime self-test panel; the ROADMAP says "except in test files that document a fix." Either keep the marker (per carve-out) or shorten to "the play-area fallback to SHIP_POLYGON_DEFAULT makes the old subtest false-positive". Planner decision. |
| `runtime-wire-overlay-window-binders.js:97-104` | 8 | clamp pinned `pointer` issue rationale | STRIP PREFIX |
| `runtime-wire-polygon-editor-binders.js:251-258` | 8 | selection is viewing/edit filter, not deletion | STRIP PREFIX |
| `runtime-fx-panels.js: …` (multiple) | various | mostly the "mode indicator badge" / "rename input sync" patterns | DELETE (covered in §3) |
| `animation-editor-view.js:253-260` | 8 | section divider with explainer ("W3b-2 — editor pane: Identity + Defaults cards") | STRIP MARKER (drop "W3b-2 —"); keep the explanation |
| `animation-editor-view.js:1210-1218` | 9 | speed handling parity with draw loop | STRIP PREFIX |
| `animation-editor-view.js:1528-1535` | 8 | preview rebuild on asset/coded changes | STRIP PREFIX |
| `icons.js:163-170` | 8 | icon resolution heuristic | SHORTEN — drop "until Wave 3" framing (Wave 3 has shipped); keep the resolution-order spec |

### C. Long blocks that are pure history — **CANDIDATE FOR DELETE**

After Wave 1 there shouldn't be many of these, but worth listing as a
final pass for the planner:

| File:Line range | Action |
|-----------------|--------|
| `runtime-orchestration.js:54-61` (revisited) | the "Phase 14-2 reorg fix" framing IS history — but the underlying init-order constraint is real. **SHORTEN** rather than DELETE. |

(No other long blocks fall purely into "delete history" without losing
a real WHY. The codebase has been edited carefully enough that the long
blocks all carry signal.)

---

## 5. Section-divider audit

### `// ── Section ──` dividers in `runtime-projection-mapping.js`

20 dividers total, all in this one 1945-line file.

| Line | Divider | Verdict |
|-----:|---------|---------|
| 24 | `// ── State ───────────────────────────────` | **KEEP** — followed by 7-line system explainer, useful navigation in 1945-line file |
| 62 | `// ── Helpers ────────────────────────────` | **KEEP for now** — Wave 3 will split this file by section anyway; keeping the dividers serves as the implicit split contract |
| 139 | `// ── Apply transform (no-op — all warping is done via canvas mesh) ──` | **KEEP** — the parenthetical IS the WHY for the no-op |
| 150 | `// ── Post-draw mesh warp ──` | **KEEP** |
| 560 | `// ── Handle UI ──` | **KEEP** |
| 579 | `// ── Undo stack (grid state snapshots) ──` | **KEEP** |
| 713 | `// ── Rotate handles (one per corner — rotate whole grid around centroid) ──` | **KEEP** — parenthetical is real |
| 972 | `// ── Handle drag ──` | **KEEP** |
| 1103 | `// ── Grid line drag (move entire row/column) ──` | **KEEP** |
| 1348 | `// ── Arrow key fine-tuning ──` | **KEEP** |
| 1411 | `// ── Context menu ──` | **KEEP** |
| 1483 | `// ── Server-side profile flows ──` | **KEEP** |
| 1657 | `// ── Grid line add/remove ──` | **KEEP** |
| 1791 | `// ── Show / Hide (unified — everything in one go) ──` | **KEEP** |
| 1808 | `// ── Align mode integration ──` | **KEEP** |
| 1822 | `// ── Resize handling ──` | **KEEP** |
| 1834 | `// ── Persistence ──` | **KEEP** |
| 1890 | `// ── Legacy compat ──` | **KEEP** |
| 1919 | `// ── Init ──` | **KEEP** |
| 1926 | `// ── Public API ──` | **KEEP** |

**Recommendation:** keep all 20 in Wave 2 as table-of-contents nav for the
giant file. Wave 3 will lift each section into its own module, at which
point the divider becomes the new module's purpose statement (or
disappears because the filename carries the same info).

### `// ========= INSIDE/OUTSIDE/ROOM =========` dividers in `runtime-fx-normalizers.js`

3 dividers. Each partitions the 574-line file into the three FX-profile
type sections. **KEEP** — the file is a single-concept normalizer module
and the divider names the concept being normalized in each section.

### `// -------- Card ------------------` dividers in `animation-editor-view.js`

7 dividers (lines 361, 430, 577, 626, 1020, 1397, 1480). Each labels a UI
card the editor renders. Several have `(W3b-3)` / `(W3b-4)` suffixes that
must come off. **KEEP DIVIDERS, STRIP WAVE-MARKER SUFFIXES.**

| Line | Current | Becomes |
|-----:|---------|---------|
| 361 | `// -------- Identity card ------------------------------------------` | unchanged |
| 430 | `// -------- Defaults card ------------------------------------------` | unchanged |
| 577 | `// -------- Scope-specific cards (W3b-3) --------------------------` | `// -------- Scope-specific cards --------------------------` |
| 626 | `// -------- Source + Sound cards ----------------------------------` | unchanged |
| 1020 | `// -------- Preview column (W3b-4) ---------------------------------` | `// -------- Preview column ---------------------------------` |
| 1397 | `// -------- Create + Delete (W3b-4) --------------------------------` | `// -------- Create + Delete --------------------------------` |
| 1480 | `// -------- Shared helpers -----------------------------------------` | unchanged |

### `// =====` blocks in `animation-editor-view.js`

| Line | Current | Action |
|-----:|---------|--------|
| 253-256 | `// =====\n// W3b-2 — editor pane: Identity + Defaults cards.\n// =====` | strip "W3b-2 —" prefix; keep "editor pane: Identity + Defaults cards." |

---

## 6. Risk areas the planner must be careful about

### 6a. Markers that ARE the constraint

Several markers don't just label the date of a change — they label
the constraint behind code that looks like overengineering. Be careful
not to drop the rationale with the marker.

Concrete examples (executor must read these whole and keep the body):

- `runtime-orchestration.js:385-390` (`Phase 22 W2e:` `QUICK_MODE_VALUES`): the legacy
  `"activate"` and `"deactivate"` strings are still in the valid set
  **on purpose** — old snapshots replay them. Strip the prefix; keep the
  back-compat note.
- `runtime-projection-mapping.js:159-163` (`Phase 22 W5 v3:` GL state): the entire
  WebGL fallback path exists because the 2D-canvas path produces seams.
  Strip prefix; keep the body.
- `runtime-projection-mapping.js:197-202` (`Phase 22 W5 v3:` GL options):
  the lean GL options are tuned for the RPi target. Don't drop with the
  marker.
- `runtime-viewport-zoom.js:160-162` (`Phase 13-2:` ABI-stable shim): the
  function looks vestigial but is called from ~20 sites. Marker can go;
  the "kept for ABI stability" sentence must stay.
- `runtime-orchestration.js:54-61, 700-702, 960-969`: init-order
  constraints. The "Phase 14-2 reorg fix" framing is history; the
  ordering rules are not.
- `runtime-runtime-controls.js:275-284` (`Phase 21-1:` snapshot definition
  fields onto running instance): without this snapshot, Live Editor
  edits don't persist. This is one of the few places where the
  dependency on a non-obvious behaviour rule is documented in code.
- `runtime-fx-normalizers.js:40-47` (`Phase 22 W3a:` icon key normalizer
  + boot-order tolerance): the comment explains why the function
  doesn't strictly validate when icons.js hasn't loaded yet.

**Rule for the executor:** never delete a long block in one shot.
Strip the marker, then re-read the block and only delete sentences that
are clearly historical narrative ("we used to X", "this was originally
Y"). When in doubt, KEEP.

### 6b. Comments inside debug branches that Wave 1 might have left

Wave 1 deleted the `__TT_CLUSTER_DEBUG__` branch and 9 cluster-pad info
logs. Verified: zero `console.info(` in `src/` outside logger.js and zero
`__TT_*_DEBUG__` flags. **No leftover debug-branch comments expected.**
Spot check: `grep -rn "__TT_" src/` returns nothing in JS source.

### 6c. License headers / file-level disclaimers

There is no license header anywhere in `src/*.js`. The file-header
comments are all `// Phase 14-2: X module.\n// Owns ...` style — those
get stripped of prefix per §4A. No license text to preserve.

### 6d. JSDoc-style `/** … */` blocks

Only **3** in `src/`, all in `runtime-projection-mapping.js`:
- Line 72: `/** Check whether any points differ from their default positions. */` — KEEP
- Line 93-99: `remapPoint` API doc with barycentric algorithm note — KEEP
- Line 407-412: `drawAffineTriangle` API doc explaining why it's used over `drawImage` rect mapping — KEEP

All three are pure API contracts on internal helpers. Even though they
are sparsely used in the codebase, dropping them costs more than keeping
them. **Wave 2 leaves all three intact.**

### 6e. CSS files: phase markers in `src/styles*.css`

The acceptance reads "No comment block in `src/` references 'Phase X' /
'Wave Y' / 'v2'/'v3' markers (except in test files that document a fix)."
This is `src/`-wide, but the brief from the orchestrator says the default
scope is JS only; CSS is a flag for user confirmation.

CSS markers found:

| File | Markers | Notes |
|------|--------:|-------|
| `src/styles.css` | 37 | mostly Phase 13-HF{4,5,6,7}, 18, 19, 19-2, 19-4, 23 W3 v2 — perf/touch/projection rationales mostly load-bearing |
| `src/styles/design-system/theme-obsidian.css` | 24 | Phase 22 Wave 2a / W3b polish / W4 / W5 — design-system theming history |
| `src/styles/design-system/animation-editor.css` | 6 | Phase 22 W3b polish |
| `src/styles/design-system/foundations.css` | 4 | mixed |
| `src/styles/design-system/components.css` | 0 | clean |
| **Total** | **73** | — |

**Recommendation:** ASK USER. Offer two slicings:
1. **Strict acceptance** (matches ROADMAP literal text) — include CSS in
   Wave 2. ~73 marker hits, ~1-2 commits.
2. **JS-only** (orchestrator's default reading) — defer CSS to a later
   wave (or skip entirely; CSS markers are less navigationally
   distracting since `.css` is read top-down and rarely greppable for
   identifier names).

If unanswered: default to JS-only. CSS phase markers can live as a
**conditional C5** at the end of Wave 2 the user can opt in / out of.

### 6f. `runtime-regression-tests.js` test-file carve-out

This is the runtime self-test panel — not a Jest/Vitest external test
file (those don't exist in this codebase yet, per ROADMAP "Out of scope:
test framework introduction"). Two of its phase-marker comments
(`Phase 18:`, `Phase 21-1:`) document "this subtest was changed because
of a feature change."

The ROADMAP acceptance reads: "(except in test files that document a
fix)." Whether this file qualifies is a judgement call:

- It's a self-test runner for production runtime invariants.
- It runs at boot via `panels/runtime-regression-tests.js`.
- It's not in a `tests/` or `test/` directory.

**Recommendation:** treat `runtime-regression-tests.js` as a test file
for the carve-out. Strip `// Phase X:` prefixes for consistency, but
KEEP the explanatory bodies. Specifically `Phase 21-1:` block at lines
463-471 documents why a regression subtest was dropped — that's exactly
what the carve-out exists for. Rewrite the prefix without the phase
marker (e.g., `// (subtest dropped — extractRenderablePlayAreaPolygons …)`).

### 6g. The duplicate zoom-around-anchor math derivation

Same 23-line math derivation appears in two places:
- `runtime-viewport-zoom.js:310-322`
- `runtime-orchestration.js:2574-2596`

Both have `Phase 13-HF4:` prefixes. The orchestration copy was emitted
when the function was lifted out of orchestration into `runtime-viewport-
zoom.js`; the original kept the comment as documentation for callers.

**Recommendation:** keep both. The derivation is load-bearing in both
files (one is the function, the other is the call site explaining the
math constraint to readers). Strip prefixes in both places.

### 6h. Comment-only edits "drift"

The Wave 1 plan-checker flagged that comment-only edits in Wave 1 were
soft drift toward Wave 2. Wave 2 does the actual hygiene pass; expect
zero "borrow from Wave 1" overlap. **There is no overlap to worry about**:
Wave 1's commits already landed (`d22be46` is HEAD). Wave 2 starts from
a clean post-Wave-1 base.

### 6i. Multi-file synchronized comments

A handful of comments appear in multiple files describing the same
architectural rule:

- "P12-1 order-invariant layering" — `runtime-draw-loop.js:346, 726`
- "Phase 13-HF4: zoom-around-anchor math" — `runtime-viewport-zoom.js:310, runtime-orchestration.js:2574`
- "Phase 13-HF7/HF8: heavy-interaction pause" — `runtime-draw-loop.js:711, runtime-polygon-drag-support.js:219`

Strip the markers consistently across all sites (don't strip in one and
forget the other — that creates an asymmetric audit trail).

---

## 7. Recommended commit slicing for Wave 2

Five atomic commits, each independently revertable. Each commit's grep
post-check verifies the expected count drops.

### C1 — Strip `// Phase 14-2: X module.` headers and `// Phase 14-2: X moved to Y` orchestration headers

**Files:** ~40 module-header files (top-of-file `// Phase 14-2:` strips) + `runtime-orchestration.js` (~38 "moved to" deletions, mostly whole-line/whole-block deletes).

**Mechanical:** for each of ~40 module-header lines, delete the
`Phase 14-2:` prefix on line 1, leaving the description. For each
"moved to" block in orchestration, **delete the whole block** — the
adjacent `window.TT_BEAMER_RUNTIME_X.init({...})` line is self-documenting.

**Pre-grep:**
```bash
grep -rn "Phase 14-2" src/ --include="*.js" | wc -l   # expect ~110
```

**Post-grep:**
```bash
grep -rn "Phase 14-2" src/ --include="*.js" | wc -l   # expect 0
```

**Estimated diff:** ~40 line edits + ~70 line deletions = **~110 line changes**. All in a single revertable commit.

**Risk:** zero — these are all pure history.

### C2 — Strip phase-marker prefixes from in-function comments (real-WHY band)

**Scope:** every `// Phase X[-Y]:` or `// Phase X W Y[-Z]:` or `// HF\d+:` or `// Pxx-yy:` prefix that's followed by a real WHY (per §2's "STRIP PREFIX, KEEP BODY" classification).

**Files:** runtime-orchestration.js (remaining ~30), runtime-fx-panels.js (~25 of 27), runtime-animation-lifecycle.js (~20 of 27), runtime-wire-fx-panel-binders.js (~15 of 19), animation-editor-view.js (all 25), runtime-draw-loop.js (~12 of 18), runtime-fx-normalizers.js (~12 of 16), runtime-projection-mapping.js (~11 of 13), runtime-viewport-zoom.js (~10 of 13), runtime-polygon-editor.js (~10 of 13), runtime-quick-mode.js (~10 of 10), runtime-runtime-controls.js (~10 of 10), runtime-polygon-drag-support.js (all 7), runtime-fx-panels.js polish (~6), runtime-bootstrap.js (~5), runtime-live-sync-core.js (~5), runtime-stage-viewport.js (~5), the long-tail files at 1-3 markers each.

**Pattern:** for each match, identify the prefix token (`Phase 14-2:` etc.)
and delete it; if the line becomes empty (e.g. `// Phase 22 W3a:` was the
whole comment), delete the line entirely.

**Pre-grep:**
```bash
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|HF[0-9]+|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" | wc -l   # post-C1: ~324
```

**Post-grep:**
```bash
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|HF[0-9]+|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" | wc -l   # expect ~30 (only the redundant-comment band that C3 will delete)
```

**Risk:** medium — this is the bulk-edit commit. Recommend:
- Process file-by-file (one file = one staging step).
- For each file, run a localized regex strip with an inspector pass: print every line that gets edited so the executor confirms before save.
- Re-run the regression checklist sub-set tied to that file after each major file (`runtime-orchestration.js`, `runtime-projection-mapping.js`, `animation-editor-view.js`).

**Estimated diff:** ~250-300 line edits, mostly tiny (drop a token, sometimes delete a one-line comment).

### C3 — Delete redundant comments

**Scope:** the ~30 paraphrase-of-code-beneath comments in §3.

**Files:** `runtime-orchestration.js` (~15 deletions), `runtime-fx-panels.js` (~10 deletions), `runtime-draw-loop.js` (1), a few stragglers.

**Mechanical:** each deletion is a single-line drop (sometimes 2 lines for
multi-line comments). Always whole-comment, never partial-edit.

**Pre-grep & post-grep:** none — this is judgement-based, not pattern-based.
The proxy is: total comment-line count drops by ~35.

**Pre-state metric:** `find src -name "*.js" | xargs grep -E '^\s*(//|\*|/\*)' | wc -l` after C2.

**Post-state metric:** ~35 lines fewer.

**Risk:** low — every deletion is verified against "is the symbol below self-documenting?"

### C4 — Cleanup section dividers (strip wave-marker suffixes)

**Files:** `animation-editor-view.js` (3 dividers with `(W3b-3)` / `(W3b-4)` suffixes), runtime-projection-mapping.js (no changes), runtime-fx-normalizers.js (no changes).

**Mechanical:** edit 3 lines.

**Pre-grep:**
```bash
grep -n "(W3b" src/app/runtime/ui/animation-editor-view.js   # expect 3
```

**Post-grep:** 0.

**Risk:** zero.

### C5 — Long-block shortening (the SHORTEN bucket)

**Scope:** the ~10 long blocks marked `SHORTEN` in §2/§4. These are
multi-paragraph comments that have a kernel of WHY plus historical
narrative; the executor rewrites each to keep just the WHY.

**Files:** `runtime-orchestration.js` (3 blocks), `runtime-runtime-controls.js` (1), `runtime-animation-lifecycle.js` (1), `runtime-draw-loop.js` (1), `runtime-viewport-zoom.js` (2), `runtime-orchestration.js:2073-2079` (1), `runtime-orchestration.js:173-177` (1), `runtime-fx-panels.js` long blocks if any remain after C2.

**Mechanical:** per-block manual rewrite. **This commit must be reviewed
line-by-line before landing** — the executor must show the diff and the
planner confirms each shortening preserved the load-bearing constraint.

**Pre/post:** comment-line count drops by another ~30 lines.

**Risk:** medium — the shortening must not strip a constraint. Reviewer
should mentally ask "if I'm reading this code in 6 months and I haven't
seen the prior commit history, what would I want to know?"

### C6 — CSS phase markers (CONDITIONAL — opt-in)

**Scope:** if user says yes, strip phase markers in `src/styles*.css`
and `src/styles/design-system/*.css` using the same rules: STRIP PREFIX
on real WHY, DELETE pure history, never touch the underlying CSS rule.

**Files:** 5 CSS files, 73 markers.

**Pre-grep:**
```bash
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|HF[0-9]+|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+" src/ --include="*.css" | wc -l   # 73
```

**Post-grep:** 0.

**Risk:** low — CSS comments don't affect runtime; the only failure mode
is accidentally deleting a CSS rule.

**Default if user not asked:** SKIP. Document in INVENTORY.md as
"deferred to future wave" rather than as a true Wave 2 deliverable.

---

### Summary of expected metric movement

| Metric | Pre-Wave-2 | Post-Wave-2 (JS only, no CSS) | Delta |
|--------|-----------:|------------------------------:|------:|
| Phase-marker hits in `src/*.js` | 434 | 0 (target) | −434 |
| Phase-marker hits in `src/*.css` | 73 | 73 (unchanged) or 0 (if C6) | 0 / −73 |
| Comment-line count in `src/*.js` | 2 342 | ~2 100 (rough) | −240 |
| Total `.js` line count | 30 659 | ~30 600 | −60 (most strip-prefix is in-place edit, not delete) |
| Comment density `.js` | 7.63 % | ~6.86 % | −0.77 pp |
| Comment blocks ≥ 3 lines | 332 | ~310 | −22 |
| Long blocks ≥ 8 lines | 66 | ~50 | −16 (some shortened to <8, some fully kept, some merged) |

These numbers are the targets the planner can put in PLAN.md acceptance.
Wave 6 closure will compare against the Pre-Wave-2 baseline.

---

## 8. Test plan for the wave

The ROADMAP regression checklist (lines 203-275 of `phase-24/ROADMAP.md`)
applies to Wave 2 as it does to every Phase-24 wave.

**However:** comment-only commits should mathematically never affect
behaviour. The high-risk surface for this wave is **executor accidents** —
i.e. an editor regex deleting a code line by mistake.

### Sensitivity ranking per area

Comment-only edits are equally inert across all areas; the regression
checklist is therefore mostly a sanity check. Specific areas to spot-check
after each commit:

| Area | Why this area | Spot-check |
|------|---------------|-----------|
| Boards & rooms | runtime-orchestration touches `BOARDS` + room geometry; many comment edits in C1/C2 land here | switch boards once; create a room |
| Animations + dispatch | runtime-animation-lifecycle has 27 markers + heavy in-function comments | trigger one room animation; trigger one cluster pad; clear |
| `/output` | runtime-projection-mapping has 13 markers; the WebGL fallback path comments are touched | open `/output`, drag a corner, verify mesh warp visible without seams |
| Live Editor | runtime-fx-panels has 27 markers, all in mode-badge / rename-input / icon-picker territory | open Live Editor on a running animation; toggle opacity; close |
| Cluster pads | Phase 23 W2 markers are concentrated in runtime-animation-lifecycle.js and runtime-draw-loop.js | trigger a cluster pad; verify pad canvas renders; clear |

### Per-commit regression sampling

| Commit | Run after | Time |
|--------|-----------|------|
| C1 (orchestration headers) | full smoke pass on dashboard (board switch, trigger one of each animation type, open Live Editor, open `/output`) | ~5 min |
| C2 (in-function strip) | per-file smoke check after each top-5 file, full smoke at end | ~10 min |
| C3 (redundant deletes) | full smoke pass | ~5 min |
| C4 (divider cleanup) | smoke check on animation editor only (Open Editor, scope-switch, Apply, Discard) | ~2 min |
| C5 (long-block shortenings) | full smoke pass | ~5 min |
| C6 (CSS — conditional) | visual smoke pass: theme toggle, settings tabs, animation editor layout, `/output` styles | ~5 min |

### Hard rule

**If any regression checklist item fails after a Wave 2 commit, the
commit is automatically suspect for an accidental code-line deletion.**
Use `git diff HEAD~1 -- '*.js' | grep -v '^[+-]\s*//' | grep -v '^[+-]\s*\*' | grep -v '^[+-]\s*$'` to reveal any non-comment, non-blank changes — the result should be empty for a clean comment-only commit. If it isn't, that's the bug.

---

## 9. Open questions for the planner / user

1. **CSS scope.** Acceptance says `src/`. Recommend asking user: "Wave 2
   targets `src/*.js` only by default; should the 73 CSS markers be
   included as C6, deferred to a later wave, or left alone?"
2. **`runtime-regression-tests.js` carve-out.** The file is the runtime
   self-test panel. Treat as test-file carve-out (keep marker bodies,
   strip prefixes only)?
3. **Math derivation duplication.** `runtime-viewport-zoom.js:310-322`
   and `runtime-orchestration.js:2574-2596` have the same 23-line math
   block. Keep both (recommended) or move to a shared docs file?
4. **JSDoc `/** … */` blocks.** All 3 are in projection-mapping. Are
   they expected to grow (Wave 3 split → public API per module needs
   more JSDoc) or stay sparse?
5. **Long-block shortening review process.** C5 is judgement-heavy. Should
   the planner pre-write the target text for each block, or let the
   executor draft and the planner review the diff?

---

## 10. Sources & references

### Primary inputs
- `.planning/phases/phase-24/ROADMAP.md` (Phase 24 plan, esp. Wave 2 spec lines 102-121)
- `.planning/phases/phase-24/wave-1/INVENTORY.md` (post-Wave-1 baseline, current commit `d22be46`)
- `.planning/phases/phase-24/wave-1/PLAN.md` (slicing-style template, esp. §4 commit plan and §3 pre-flight checklist)
- `.planning/phases/phase-24/wave-1/RESEARCH.md` (precedent for inventory format)

### Measurement commands (re-runnable)

All commands below were run from `/home/claw/tt-beamer/` against `master`
at HEAD `d22be46`.

```bash
# Total JS lines
find src -type f -name "*.js" -exec wc -l {} + | tail -1

# Total comment lines (lines starting with //, *, or /*)
find src -type f -name "*.js" | xargs grep -E '^\s*(//|\*|/\*)' | wc -l

# Comment density
echo "scale=4; 2342 / 30659 * 100" | bc

# Phase-marker count, JS only
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|HF[0-9]+|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" | wc -l

# Phase-marker count, CSS only
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|HF[0-9]+|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.css" | wc -l

# Phase markers per file (JS)
grep -rn -E "Phase\s*[0-9]+|Wave\s*[0-9]+|HF[0-9]+|W[0-9]+\s*v[0-9]+|P[0-9]+-[0-9]+|^\s*//\s*v[0-9]+:" src/ --include="*.js" | awk -F: '{print $1}' | sort | uniq -c | sort -rn

# Section-divider counts
grep -rn -E "^\s*//\s*─" src/ --include="*.js" | wc -l   # 20 (all in projection-mapping)
grep -rn -E "^\s*//\s*(={3,}|-{5,})" src/ --include="*.js" | wc -l   # 12 (fx-normalizers + animation-editor-view)

# JSDoc count
grep -rn "^\s*/\*\*" src/ --include="*.js" | wc -l   # 3

# TODO/FIXME/XXX
grep -rn "TODO\|FIXME\|XXX" src/ --include="*.js" | wc -l   # 0

# Comment blocks ≥ 3 / ≥ 8 (Python script in /tmp/count_blocks.py during research)
```

---

## 11. Confidence breakdown

| Section | Level | Reason |
|---------|-------|--------|
| Baseline metrics (§1) | HIGH | Direct grep / wc output; reproducible |
| Phase-marker inventory (§2) | HIGH | Full grep dump with line numbers |
| Redundant-comment sample (§3) | MEDIUM | 30-sample is representative but executor judgement still needed at edit time |
| Long-block inventory (§4) | HIGH | Programmatic detection; first-line preview captured |
| Section-divider audit (§5) | HIGH | Only 32 dividers total; all inspected |
| Risk areas (§6) | HIGH | Each risk grounded in a concrete file:line |
| Commit slicing (§7) | MEDIUM | Slicing is a recommendation; planner may merge C3+C4 or split C2 by file |
| Test plan (§8) | HIGH | Reuses ROADMAP regression checklist |

**Research valid until:** 30 days (codebase is post-Wave-1 stable; only
new feature work would invalidate counts).
