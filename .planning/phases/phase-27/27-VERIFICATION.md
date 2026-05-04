---
phase: 27-align-mode-refinement
verified: 2026-05-04T00:00:00Z
status: human_needed
score: 9/9 must-haves verified at code level
overrides_applied: 0
human_verification:
  - test: "B1 visual: alle Grid-Linien erscheinen als einheitliches Teal"
    expected: "Open /output/, toggle align mode — all grid lines (including outer rectangle) render in rgba(0,220,180,0.45); no red lines visible anywhere"
    why_human: "Canvas rendering requires a live browser to confirm visual output"
  - test: "B1 interaction: outer line drag scales interior"
    expected: "Drag top outer edge — ns-resize cursor, line moves, interior horizontal lines scale proportionally"
    why_human: "Pointer-event behaviour requires manual interaction on /output/"
  - test: "B2 interaction: corner drag is local-only"
    expected: "Drag top-left corner — only that intersection moves; interior intersections do NOT auto-redistribute"
    why_human: "Must observe actual DOM mutation behaviour at runtime"
  - test: "B3 visual: profile chip shows name or 'Unsaved'"
    expected: "Load a profile via profileLoadFlow() in DevTools — chip shows name; no profile loaded — chip shows 'Unsaved'"
    why_human: "Chip content and styling require a live browser to confirm"
  - test: "B4 dirty flag triggers on mutation"
    expected: "Drag any handle — dirty dot appears in chip, name colour shifts to --c-warn amber, Save/Discard activate"
    why_human: "CSS computed-style and DOM state after drag require live browser + DevTools confirmation"
  - test: "B4 Save overwrites loaded profile"
    expected: "Click 'Save profile' with a profile loaded — POST succeeds, dirty clears, chip returns to clean state"
    why_human: "Network request + DOM visual state change requires live browser test"
  - test: "B4 Save with no profile opens name modal"
    expected: "Click 'Save profile' with no profile loaded — modal appears with exact UI-SPEC copy; confirm disabled until input non-empty"
    why_human: "Modal open/close flow requires live interaction"
  - test: "B4 Discard reverts immediately, no confirm"
    expected: "Click 'Discard' in dirty state — grid reverts immediately, no window.confirm fires"
    why_human: "Synchronous visual revert and absence of confirm dialog requires live observation"
  - test: "B5 dashboard toggle disabled when /output/ dirty"
    expected: "Make /output/ dirty — within ~500ms dashboard align-mode button has disabled attribute and shows exact hint 'Unsaved changes on /output/ — save or discard there first.'"
    why_human: "Multi-device WebSocket round-trip requires two live browser windows + Pi /output/"
  - test: "B5 toggle re-enables on save/discard"
    expected: "/output/ saves or discards — within ~500ms dashboard button re-enables, hint disappears"
    why_human: "Multi-device live-sync state requires live test"
  - test: "B5 grace timer clears dirty after 10s disconnect"
    expected: "/output/ dirty then tab closed — wait 10s — dashboard button re-enables"
    why_human: "Requires live session with timing, not grep-verifiable"
  - test: "B6 visual: reset produces 3x3 at 10%/50%/90%"
    expected: "Reset grid or fresh profile — grid shows exactly 3 lines per axis at 10%/50%/90% layout (80% centred rectangle)"
    why_human: "Visual layout requires canvas rendering"
  - test: "B6 existing profiles load verbatim (no migration)"
    expected: "Load a pre-Phase-27 5-line profile — geometry loads unchanged, NOT replaced by new default"
    why_human: "Requires a saved profile on disk and live browser to confirm applyGridPayload semantics"
  - test: "B7 empty canvas: only Add options"
    expected: "Right-click in empty area — menu shows ONLY 'Add horizontal line here' + 'Add vertical line here', no delete options"
    why_human: "Context menu appearance requires live browser"
  - test: "B7 inner line: Delete + Add"
    expected: "Right-click <=6px from inner line, away from intersection — 'Delete this line' + 'Add line through this point'"
    why_human: "Hit-test distance requires live interaction on actual rendered canvas"
  - test: "B7 inner intersection: two delete options + single Add"
    expected: "Pre-condition 4x4 grid; right-click <=10px from inner intersection — 'Delete vertical line' + 'Delete horizontal line' (danger-styled) + SINGLE 'Add line through this point'; clicking Add adds BOTH perpendicular lines"
    why_human: "Requires pre-condition setup, live menu, and observation of dual-line add"
  - test: "B7 outer intersection: no delete options"
    expected: "Right-click top-left corner — ONLY 'Add line through this point' visible; no delete entries"
    why_human: "Requires live browser menu observation"
  - test: "B7/B8 hit-test on B2 trapezoid"
    expected: "Drag top-left corner inward 50px — right-click near now-slanted top edge — still classified as outer line (no delete); confirms hit-test uses displaced positions"
    why_human: "Requires live deformed grid and live context-menu test"
  - test: "B8 end-to-end: delete persists + Ctrl+Z restores"
    expected: "Delete inner line — disappears; Ctrl+Z — restores; Save profile — reload confirms deletion persisted"
    why_human: "Requires live browser, undo interaction, and server-side persistence check"
  - test: "B9 four squish bars visible at outer edge midpoints"
    expected: "Align mode ON — four 60x10/10x60 teal bars appear at midpoints of outer edges, 30px outward (matching rotate-handle offset)"
    why_human: "DOM layout and visual positioning requires live browser"
  - test: "B9 top bar squish: opposite-side anchored"
    expected: "Drag top bar down 50px — top edge moves down 50px; bottom edge unchanged; interior lines compress proportionally"
    why_human: "Pixel-level geometry change requires live interaction and DevTools measurement"
  - test: "B9 squish undoable via Ctrl+Z"
    expected: "After squish — Ctrl+Z restores pre-squish geometry; dirty dot disappears after successful undo+save"
    why_human: "Undo stack interaction requires live browser"
  - test: "B9 squish bar tracks trapezoid edge"
    expected: "Drag top-left corner to deform outer to trapezoid — top squish bar relocates to midpoint of actual slanted top edge"
    why_human: "Trapezoid positioning requires live visual confirmation"
  - test: "server.mjs requires restart before B5 is active"
    expected: "Restart server.mjs — POST /api/align-mode-dirty responds 200; curl with dirty='yes' returns 400; two rapid POSTs second returns 429"
    why_human: "Server must be manually restarted; curl tests are quick but require live server"
---

# Phase 27: Align Mode Refinement — Verification Report

**Phase Goal:** Align Mode Refinement — execute B1..B9 backlog items based on user-test feedback (2026-05-04). All 9 items locked in 27-CONTEXT.md decisions D-01..D-14 and 27-UI-SPEC.md.
**Verified:** 2026-05-04
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

All 9 backlog items (B1..B9) are implemented at code level. Every must-have from all 5 plan frontmatter blocks passes grep verification and file-read inspection. Status is `human_needed` because 27-VALIDATION.md is intentionally `nyquist_compliant: false` — the phase acceptance gate is a manual walkthrough on Pi /output/.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All grid lines render with uniform teal `rgba(0,220,180,0.45)` at lineWidth 1; no red outer lines | ✓ VERIFIED | `rgba(220, 30, 30` count in handle-ui.js = 0; teal strokeStyle assignments in drawLines() = 2; isEdge ternaries in drawLines() = 0 |
| 2 | Outer corner drag is local-only (no isEdge proportional remesh in onDragMove) | ✓ VERIFIED | `isEdge = r === 0` count in onDragMove = 0; isEdgeRow count in onLineDragMove = 4 (preserved) |
| 3 | `onLineDragMove` isEdgeRow/isEdgeCol proportional-scale blocks preserved (B1 line drag + D-01) | ✓ VERIFIED | isEdgeRow/isEdgeCol grep in handle-drag.js = 4 hits; SUMMARY confirms byte-identical |
| 4 | resetGrid() and module init produce 3x3 at [0.10, 0.50, 0.90] | ✓ VERIFIED | `buildNewProfileDefaultGrid` count in grid-state.js = 5 (definition + module init + resetGrid + 2 export refs); literal `[0.10, 0.50, 0.90]` found at line 55 |
| 5 | Profile chip visible in align mode with name or "Unsaved"; dirty dot on mutation | ✓ VERIFIED | `rebuildAlignToolbar`, `_refreshAlignToolbarVisual`, `removeAlignToolbar` all defined; `rebuildAlignToolbar()` called from showHandles inside `outputRole === OUTPUT_ROLE_FINAL` gate (line 1180-1181); `.projection-align-toolbar` CSS rule present in styles.css |
| 6 | Save/Save-as-new/Discard buttons with exact UI-SPEC copy strings | ✓ VERIFIED | "Save profile" at handle-ui.js:461 and persistence.js:258; "Save as new…" at handle-ui.js:481; "Discard" at handle-ui.js:488; "Keep editing" at persistence.js:255; modal title "Save as new profile" at persistence.js:242; modal body at persistence.js:245 |
| 7 | Right-click menu: three-shape hit-test priority (intersection > line > empty) with exact locked copy strings | ✓ VERIFIED | `_hitTestAlignContext` defined at line 802; `onContextMenu` at line 889; all 6 locked copy strings present; no legacy "Save profile..." / "Load profile..." / "Remove this horizontal line" items; role="menu" + role="menuitem" + var(--c-danger) on destructive items confirmed |
| 8 | Four squish bars (B9) with lifecycle, visual spec, and drag math | ✓ VERIFIED | `SQUISH_SIDES` has 4 entries (TOP/BOTTOM/LEFT/RIGHT); rebuildSquishBars/positionSquishBars/removeSquishBars wired from rebuildHandleElements/positionRotateHandles/removeHandles; `.projection-squish-bar` CSS rule present; pushUndo at onSquishBarPointerDown:483; saveToLocalStorage + notifyDirtyChanged at onSquishDragEnd |
| 9 | Server-authoritative dirty flag (B5): POST endpoint + grace timer + dashboard hint | ✓ VERIFIED | `alignModeDirtyOnOutput` in liveSessionState.snapshot; POST `/api/align-mode-dirty` handler at server.mjs:3419; strict boolean validation at line 3430; rate limit at line 3422 (100ms); _startAlignModeDirtyGraceTimer wired into socket.on("close") and socket.on("error") for role==="final-output"; _resetAlignModeDirtyGraceTimer on reconnect; exact hint copy "Unsaved changes on /output/ — save or discard there first." (em-dash U+2014) in runtime-stage-viewport.js:56; `<p id="align-mode-dirty-hint" aria-live="polite" hidden>` in index.html:177 |

**Score:** 9/9 truths verified at code level

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/runtime/viewport/runtime-projection-grid-state.js` | buildNewProfileDefaultGrid + new default init + resetGrid | ✓ VERIFIED | Function defined at line 50; module init uses it at line 58; resetGrid at line 153; exported at line 292 |
| `src/app/runtime/viewport/runtime-projection-handle-drag.js` | onDragMove without isEdge block; onLineDragMove unchanged; onSquishBarPointerDown/Move/End | ✓ VERIFIED | isEdge block removed; isEdgeRow/isEdgeCol preserved; squish handlers at lines 476/543/655 |
| `src/app/runtime/viewport/runtime-projection-handle-ui.js` | drawLines() uniform teal; rebuildAlignToolbar; _hitTestAlignContext; onContextMenu; rebuildSquishBars | ✓ VERIFIED | All 9 functions present and wired |
| `src/app/runtime/viewport/runtime-projection-profile-persistence.js` | _loadedProfileSnapshot state; isDirty; saveLoadedProfileFlow; saveAsNewProfileFlow; discardChanges; _validateGridPayloadSchema; addDirtyListener; notifyDirtyChanged; /api/align-mode-dirty broadcaster | ✓ VERIFIED | All functions at expected lines; public export object confirmed at lines 433-453; profileSaveFlow not exported; window.prompt not in persistence code |
| `src/styles.css` | .projection-align-toolbar; .projection-squish-bar | ✓ VERIFIED | Toolbar rules at line 2121; squish-bar rule at line 2145 |
| `server.mjs` | alignModeDirtyOnOutput in snapshot; POST /api/align-mode-dirty; grace timer | ✓ VERIFIED | All 8 grep hits; POST handler at line 3419; grace timer functions confirmed |
| `src/app/runtime/live-sync/runtime-global-defaults.js` | reads alignModeDirtyOnOutput from runtimeSessionExtras | ✓ VERIFIED | runtimeSessionExtras param at line 390; field applied at line 436 |
| `src/app/runtime/live-sync/runtime-live-sync-core.js` | passes session.snapshot as runtimeExtras to applyGlobalDefaultsPayloadToState | ✓ VERIFIED | runtimeExtras at line 523; live-hello seeding at line 473 |
| `src/app/runtime/viewport/runtime-stage-viewport.js` | syncAlignModeDirtyDashboardState with locked hint copy | ✓ VERIFIED | Function at line 48; exact copy confirmed by Python byte-check |
| `src/app/runtime/runtime-orchestration.js` | ctx.syncAlignModeDirtyDashboardState wired | ✓ VERIFIED | Three binding sites at lines 269, 502, 2991 |
| `src/app/lib/state/runtime-state.js` | alignModeDirtyOnOutput: false in initial state | ✓ VERIFIED | Line 24 |
| `index.html` | `<p id="align-mode-dirty-hint" aria-live="polite" hidden>` | ✓ VERIFIED | Lines 177-178 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| drawLines() horizontal + vertical loops | uniform teal rgba(0,220,180,0.45) | direct strokeStyle assignment (no isEdge ternary) | ✓ WIRED | 2 teal assignments, 0 red assignments |
| onDragMove → setPoint | local-only corner move | isEdge block deleted | ✓ WIRED | isEdge=r===0 count = 0 in onDragMove |
| resetGrid() + module init | buildNewProfileDefaultGrid() | direct call | ✓ WIRED | 5 occurrences in grid-state.js |
| showHandles() → rebuildAlignToolbar | toolbar visible on /output/ in align mode | OUTPUT_ROLE_FINAL gate | ✓ WIRED | Lines 1180-1181 |
| removeHandles() → removeAlignToolbar | toolbar cleaned up | direct call at line 135 | ✓ WIRED | Confirmed |
| drag-end × 3 + undo + add/remove × 4 | notifyDirtyChanged | direct calls | ✓ WIRED | 4 in handle-drag + 1 in grid-state + 4 in handle-ui = 9 sites |
| saveLoadedProfileFlow → POST /api/projection-profiles | save overwrites | fetch with {boardId, name, data} | ✓ WIRED | Pattern confirmed in persistence.js |
| saveAsNewProfileFlow → _promptProfileNameModal | modal opens | direct call when _loadedProfileName null | ✓ WIRED | Confirmed |
| discardChanges → restoreGridSnapshot | geometry reverts | via _gridStateApi | ✓ WIRED | gridStateApi injection confirmed in mapping.js:274 |
| lineCanvas contextmenu → _hitTestAlignContext → onContextMenu | right-click menu | existing DOM listener (unchanged wiring) | ✓ WIRED | Functions present; existing event listener unchanged |
| onContextMenu intersection branch | single "Add line through this point" adding BOTH lines | addHorizontalLine(normY) + addVerticalLine(normX) in one action | ✓ WIRED | Lines 933-938 |
| rebuildHandleElements → rebuildSquishBars | squish bars created | direct call at line 180 | ✓ WIRED | Confirmed |
| positionRotateHandles → positionSquishBars | bars reposition on every drag update | call at end of positionRotateHandles (line 245) | ✓ WIRED | Confirmed |
| removeHandles → removeSquishBars | bars cleaned up | call at line 136 | ✓ WIRED | Confirmed |
| onSquishBarPointerDown → pushUndo + drag flow | squish is undoable | pushUndo at line 483 | ✓ WIRED | Confirmed |
| onSquishDragEnd → saveToLocalStorage + notifyDirtyChanged | dirty flag updates after squish | lines 667-668 | ✓ WIRED | Confirmed |
| addDirtyListener(cb) in profile-persistence | POST /api/align-mode-dirty | _maybeStartOutputDirtyBroadcaster; gated on OUTPUT_ROLE_FINAL | ✓ WIRED | Lines 398-405 |
| POST /api/align-mode-dirty → broadcastLiveSession | alignModeDirtyOnOutput broadcast | _setAlignModeDirty → _broadcastAlignModeDirty | ✓ WIRED | server.mjs lines 1749-1770 |
| socket close/error for role=final-output | _startAlignModeDirtyGraceTimer | lines 1502-1515 | ✓ WIRED | Both close and error handlers confirmed |
| final-output reconnect | _resetAlignModeDirtyGraceTimer | line 1398 | ✓ WIRED | Confirmed |
| global-config-update receive | ctx.applyGlobalDefaultsPayloadToState(payload, session.snapshot) | live-sync-core line 523 | ✓ WIRED | Confirmed |
| live-hello receive | seed alignModeDirtyOnOutput immediately | live-sync-core lines 473-476 | ✓ WIRED | Confirmed |
| syncAlignModeDirtyDashboardState | #align-mode-button disabled + hint paragraph | ctx.syncAlignModeDirtyDashboardState wired in runtime-orchestration.js | ✓ WIRED | 3 binding sites confirmed |

---

## Data-Flow Trace (Level 4)

Skipped for this phase. All modified artifacts are interaction handlers and DOM mutators (no server-side data-rendering components). Data flow is event-driven and synchronous within the browser IIFE scope; the dirty-flag broadcast is fire-and-forget over HTTP and is verified structurally via grep rather than data-flow trace.

---

## Behavioral Spot-Checks

Skipped for interactive browser code. All handlers are client-side DOM/canvas code that cannot be exercised without a running browser. Manual B1..B9 walkthrough in 27-VALIDATION.md covers equivalent behavioral coverage.

---

## Requirements Coverage

Phase 27 uses B-IDs instead of REQ-IDs. All B-items are accounted for:

| B-Item | Plan | Description | Status |
|--------|------|-------------|--------|
| B1 | 27-01 | Outer lines visually identical to inner lines | ✓ SATISFIED |
| B2 | 27-01 | Outer corner drag local-only (no auto remesh) | ✓ SATISFIED |
| B3 | 27-02 | Profile name chip in align-mode toolbar | ✓ SATISFIED |
| B4 | 27-02 | Dirty-flag UX: Save/Save-as-new/Discard with modal | ✓ SATISFIED |
| B5 | 27-05 | Multi-device save gate: server-authoritative dirty flag + dashboard disable | ✓ SATISFIED |
| B6 | 27-01 | 80% centred 3x3 default layout for fresh profiles | ✓ SATISFIED |
| B7 | 27-03 | Right-click menu: three-shape hit-test priority (intersection/line/empty) | ✓ SATISFIED |
| B8 | 27-03 | Line deletion end-to-end (canvas + undo + persistence) | ✓ SATISFIED |
| B9 | 27-04 | Four squish bars at outer edge midpoints | ✓ SATISFIED |

---

## Anti-Patterns Found

None. Scan of all modified files:

- `rgba(220, 30, 30` in handle-ui.js: 0 occurrences (red lines fully removed)
- `window.prompt` in profile-persistence.js: 0 occurrences
- `profileSaveFlow` in profile-persistence.js export: 0 occurrences
- `TODO|FIXME|PLACEHOLDER` in modified files: 0 relevant matches (existing unrelated TODOs elsewhere in the codebase are not part of this phase)
- Hardcoded empty `return []` / `return {}`: none in the new code paths
- "v1" / "static for now" / "placeholder": none found

The two unrelated working-tree changes (`config/global-defaults.json`, content of slime.gif) are confirmed outside phase scope and ignored per the important_context instruction.

---

## Human Verification Required

All 23 items listed in the YAML frontmatter above. The full manual walkthrough of B1..B9 on dashboard + Pi /output/ is the final acceptance gate per 27-VALIDATION.md. Key items:

### 1. B1 Visual — Uniform Teal Lines

**Test:** Open `/output/`, toggle align mode
**Expected:** All grid lines (including outer rectangle) render as `rgba(0,220,180,0.45)` teal — no red lines visible
**Why human:** Canvas rendering requires a live browser

### 2. B2 Interaction — Local-Only Corner Drag

**Test:** Drag top-left corner intersection
**Expected:** Only that corner moves; interior intersections do NOT auto-redistribute
**Why human:** Requires live pointer event observation

### 3. B4 Dirty Dot on Mutation

**Test:** In align mode, drag any intersection handle
**Expected:** Dirty dot `●` appears in profile chip; name colour shifts to amber; Save/Discard activate
**Why human:** Requires live CSS computed-style check after drag

### 4. B5 Multi-Device Gate

**Test:** Two browser windows — /output/ and dashboard; make /output/ dirty
**Expected:** Dashboard `#align-mode-button` gets `disabled` attribute with exact hint copy within ~500ms
**Why human:** Requires two live clients + server

### 5. B5 Grace Timer

**Test:** Make /output/ dirty, close /output/ tab, wait 10 seconds
**Expected:** Dashboard button re-enables after 10s (server grace timer fires)
**Why human:** Time-dependent behaviour requires live observation

### 6. B7 Hit-Test on Trapezoid Grid

**Test:** Drag outer corner to make trapezoid; right-click near slanted outer edge
**Expected:** Menu classifies as outer line (no delete options) — proves displaced hit-test
**Why human:** Requires deformed grid and live context-menu test

### 7. B9 Squish Bars Visible

**Test:** Align mode ON on Pi /output/
**Expected:** Four teal 60x10/10x60 bars at outer edge midpoints, 30px outward; hover scale to 1.08
**Why human:** DOM layout and visual positioning requires live browser

### 8. Server Restart Required for B5

**Note:** `server.mjs` was modified. The running server process must be restarted before B5 tests are valid. Quick smoke test after restart:

```
curl -X POST -H 'content-type: application/json' \
  -d '{"dirty":true}' http://localhost:PORT/api/align-mode-dirty
# Expected: 200 { ok: true, alignModeDirtyOnOutput: true }

curl -X POST -H 'content-type: application/json' \
  -d '{"dirty":"yes"}' http://localhost:PORT/api/align-mode-dirty
# Expected: 400 { ok: false, error: "dirty must be a boolean" }
```

---

## Gaps Summary

No gaps found at code level. All 9 B-items are implemented with substantive, wired code. All 11 modified JS files pass `node --check`. All 15 commits (f49c0fe through 3fab116) exist in the git log. Status is `human_needed` solely because 27-VALIDATION.md designates this as a manual-test phase (`nyquist_compliant: false`) and all browser-visual and interaction behaviours require live walkthrough on Pi /output/.

---

_Verified: 2026-05-04_
_Verifier: Claude (gsd-verifier)_
