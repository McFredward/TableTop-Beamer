# RISKS — Phase 14

## R1 — Hidden coupling via module-scope state
The current runtime file declares `state`, `liveSync`, stage geometry caches, drag session state, touch gesture machine state, stretch-anchor cache, and many rAF handles as top-level `let`/`const`. Functions that live in different logical domains reach into these without ceremony. Extracting any function may discover a surprise read/write path.

**Mitigation.** P14-2-T2 introduces a single shared-state module early, before any extraction. Every extracted module imports from that file only. Any reference to a module-scope binding that cannot be cleanly shared gets surfaced in the state seam as an explicit accessor or setter. No module reaches into another module's internals.

## R2 — Declaration-order hoisting
The file is loaded as a single `<script>`. It relies on function hoisting for forward references and on declaration order for `const` initialisation. Splitting into ES modules (or script modules) may expose cycles that hoisting used to hide.

**Mitigation.** Extract in dependency order, lowest-coupling first (`viewport-zoom` before `touch-gesture` before `polygon-editor` before `room-overlay` before `draw-loop`). Any detected cycle blocks the extraction until the seam is widened.

## R3 — DOM-query-at-import-time
Many bindings resolve `document.querySelector(...)` inline at file load. If an extracted module runs before the DOM exists, bindings become null and silent bugs surface only at first interaction.

**Mitigation.** Each extracted module exports an `init(root)` or `mount(refs)` function that the runtime entry point calls after DOM content loaded. No extracted module runs DOM queries at import time.

## R4 — Harness blind spots
Harnesses grep the runtime file for string signatures (e.g. `function applyIncrementalRoomDrag(refs, overlayPoints)`). Moving a function to a new file breaks the grep even though behavior is unchanged, producing a FALSE FAIL that blocks legitimate refactor progress.

**Mitigation.** First extraction task produces an audit of which harness strings are location-pinned. Location-pinned checks are relaxed to file-agnostic `grep` across `src/app/runtime/**` or the harness is updated in the same commit that moves the symbol. No silent relocations.

## R5 — User-triggered HF13 cache assumptions
HF13's stable stretch-anchor cache is a `Map` on `state.roomStretchAnchorCache`. The extracted `polygon-editor.js` module must not create a local copy, must not reinit on import, and must not clear it on DOM events unrelated to hydration. A refactor regression here would re-introduce the drift the user just fixed.

**Mitigation.** The HF13 harness (`debug/p13-hf13-acceptance-regression.mjs`) includes explicit gates for the cache being on `state` and being cleared in the hydrate path. Those gates remain GREEN through every extraction; any extraction that breaks them is reverted.

## R6 — Live-sync glue entanglement
`emitLiveMutation`, `scheduleNextLiveSnapshotPoll`, and the many apply callbacks have deep call chains into UI panels (success toast, dirty-flag handling). Extracting this boundary may require an event bus.

**Mitigation.** Do `live-sync-glue.js` LAST, after all pure-rendering and pure-state modules are out. At that point the dependencies are explicit and a minimal event-emitter (< 50 LOC) is acceptable.
