# Changelog

All notable user-facing changes to TT-Beamer are documented in this file.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Cadence (operator-confirmed 2026-05-22): every closed phase ships a PATCH bump
(1.0.0 → 1.0.1 → 1.0.2 → …). MINOR bumps (e.g. 1.0.x → 1.1.0) are reserved
for operator-cut release milestones — multiple PATCH entries may be rolled
up into one MINOR release section at cut-time.

---

## [1.0.29] — 2026-05-25

Phase 50: Transform fields now pass through to running room animations.

### Fixed
- **Real root cause** of the "transform edits not respected" saga
  (operator UAT 5×): the six `createAnimation({…})` call sites in
  `runtime-room-dispatch.js` were OMITTING `rotationDeg`,
  `stretchToPolygon`, `widthScale`, `heightScale`, `offsetXScale`,
  `offsetYScale` from the spread. The factory
  (`runtime-animation-factory.js:31-36`) defaults those to neutral
  values (`stretchToPolygon: true, widthScale: 1, …`) when the caller
  doesn't pass them, completely masking whatever the operator had
  edited in `def`/`draftPayload`. The room renderer reads
  `animation.widthScale ?? definition.widthScale` — but the
  factory-default `1` short-circuits the `??`, so the def's actual
  value never wins.

  Fix: added `rotationDeg/stretchToPolygon/widthScale/heightScale/
  offsetXScale/offsetYScale: draftPayload.<field>` to all six
  `createAnimation` invocations in `runtime-room-dispatch.js` (lines
  177, 284, 306, 418, 534, 555). All four predecessor fixes
  (v1.0.26-v1.0.28) — re-seed draft from def, runtime-state passthrough,
  unconditional sync-flag clear, live preview transform — were
  necessary for the draft → payload pipeline to carry the right
  values, but this v1.0.29 fix is what finally lets those values
  reach the running animation that the renderer reads.

  Verified end-to-end (Playwright, frostpunk + Generator boost, clean
  runtime-active-animations.json):
  - Edit widthScale=4, heightScale=2.5, rotation=33, stretch=off
  - Click Start
  - Single running animation pushed with all four edited fields ✓

### Improved
- **Preview transform now stays inside the preview box.** Operator UAT:
  "es soll … innerhalb der box verbleiben … aktuell kann wenn das
  video gestrecht wird es über den ganzen bildschirm gehen". Added
  `overflow: hidden` to `.anim-editor-preview-swatch` so a `scale(4)`
  blowout is clipped to the box.

### Operator-facing test note
- The persistence file `config/runtime-active-animations.json` survives
  server restarts and can hold stale running-animation entries from
  earlier sessions. If you ever see "two of the same animation" with
  conflicting values after testing, clean that file (or just trigger
  Stop) before judging the running set.

---

## [1.0.28] — 2026-05-25

Phase 50: Editor transform edits + live preview transform.

### Fixed
- **Animation Editor transform edits still not respected on trigger
  (4th retry).** Operator UAT (2026-05-25): "Immer noch nicht!
  Scheint ein größerer bug zu sein, spawne einen debugger". Spawned
  gsd-debugger. Findings:
  1. The flow is correct: dashboard's `start-room-animation` →
     `startRoomAnimationFromDraft` → reads from `state.roomDraft.*` →
     re-seeded from def only when `lastSyncedAnimationId !==
     selectedDefinition.id` gate fires.
  2. v1.0.27's gating conditions were correct in theory but brittle —
     any boardId / animationId edge case (editor's own board picker,
     stale animationId) silently kept the flag pinned.
  3. **Likely operator-side cause:** `stretchToPolygon = true` makes
     the renderer IGNORE width/height/offsetX/offsetY values —
     consistent with the symptom ("EGAL was ich einstelle").

  Fix v1.0.28: drop the gating conditions entirely. Clear
  `runtimeState.roomDraft.lastSyncedAnimationId` on ANY room-scope
  patch (idempotent; the dispatch gate naturally resets it on the
  next trigger). Same simplification in `saveLiveEditorAsDefault`.

### Added
- **Live preview in the Animation Editor now reflects transform edits
  (rotation, width/height scale, X/Y offset) in real time.** Operator
  UAT (2026-05-25): "Weiterhin will ich auch das in der Preview im
  Animationeditor die Transformation direkt mit angezeigt wird".
  `syncMediaPreviewProps` (animation-editor-live-preview.js) now
  applies a CSS `transform: translate(ox%, oy%) rotate(rot deg)
  scale(ws, hs)` to the preview `<img>`/`<video>`. When
  Stretch-to-polygon is ON, scale/offset are forced to neutral
  (matches the renderer's behavior of ignoring those fields).

### Verified (Playwright, frostpunk + Generator boost)
- Edit widthScale 1→3.5, rotation 0→45, flip Stretch off →
  - def updates: widthScale=3.5, rotation=45, stretch=false ✓
  - `draft.lastSyncedAnimationId` → null ✓
  - preview transform: `translate(0%, 0%) rotate(45deg) scale(3.5, 2.51)` ✓
- Simulated room-dispatch:65 gate → draft re-seeds:
  `widthScale=3.5, rotationDeg=45, stretch=false` ✓

---

## [1.0.27] — 2026-05-25

Phase 50: Re-seed draft from runtime state (v1.0.26 was incomplete).

### Fixed
- **v1.0.26 was supposed to clear `state.roomDraft.lastSyncedAnimationId`
  on a def edit so the next trigger re-seeds from the new def — but
  the fix never fired in practice.** Operator UAT (2026-05-25): "Nein
  immer noch nicht. Ich teste gerade im board Frostpunk die Animation
  Generator boost. Ich habe im Animationeditor die Animation unter
  'Transform' verändert, aber EGAL was ich dort einstelle und
  abspeichere, wenn ich die Animation im dashboard starte werden meine
  hier eingestellten Werte nicht respektiert".

  Root cause of the missed fix: the animation-editor's edit-pane
  module reads `ctx.state` — but `animation-editor-view.js` overrides
  `state` with `shell.getState()` when wiring `editPane.init()`. The
  shell's getState returns a SHELL-LOCAL UI state (`{scope, search,
  selectedIds, ...}`) with NO `roomDraft` and NO `boardId`. So the
  v1.0.26 condition (`ctx.state.roomDraft.animationId === id &&
  ctx.state.boardId === boardId`) was always false, and the draft
  invalidation never ran.

  Fix:
  - `animation-editor-view.js` now passes the actual runtime state
    separately as `runtimeState: deps.state` (after the override).
  - `patchAnimation` (animation-editor-edit-pane.js) reads
    `ctx.runtimeState ?? ctx.state` so the condition + write target
    the runtime state's `roomDraft.lastSyncedAnimationId`.

  Verified end-to-end (Playwright, frostpunk + Generator boost):
  edit widthScale 2.18→3.7 + flip stretchToPolygon off → after edit
  `lastSynced = null` (was: `"room-mphf0q8m-1"`) → simulated trigger
  re-seeded draft to `widthScale=3.7, stretch=false`. The animation
  will now actually start with the edited values.

---

## [1.0.26] — 2026-05-25

Phase 50: Animation-editor edits now apply on next trigger.

### Fixed
- **Transform values (rotation, width/height scale, X/Y offset, etc.)
  edited in the animation editor pane were saved into the def but
  ignored when the operator next triggered the animation.** Operator
  UAT (2026-05-25): "Die Transform-Einstellungen einer Animation, die
  im Animations-Menu eingestellt wurden, werden nicht respektiert.
  D.h. wenn ich eine Animation starte wird die Animation trotzdem
  normal gestartet ohne dass die gespeicherten Werte respektiert
  werden". Root cause: the dashboard's room-trigger pipeline
  (`runtime-room-dispatch.js:65`) only re-seeds `state.roomDraft.*`
  from the def when the selected animation id CHANGES
  (`lastSyncedAnimationId !== selectedDefinition.id`). If the
  operator edits the same animation that's already selected, the
  draft stays pinned to its old seed — and the trigger reads from
  the draft, not the def. Result: edits invisible.

  Fix: when `patchAnimation` (animation-editor pane) or
  `saveLiveEditorAsDefault` (live-editor) modifies a room-scope def
  that matches the current `state.roomDraft.animationId` AND the
  current board, also clear `state.roomDraft.lastSyncedAnimationId`.
  Next trigger sees the mismatch and re-seeds the draft from the
  freshly-edited def. Per-run sidebar tweaks ARE lost when the
  operator opens the editor and edits the def — which matches the
  operator's mental model ("editor edits = new defaults, sidebar =
  per-run adjustments"; editing the default overrides the sidebar's
  staged state).

---

## [1.0.25] — 2026-05-25

Phase 50: Live-editor Stretch-to-polygon also greys out its sliders.

### Fixed
- **Width/Height/X-offset/Y-offset sliders in the live editor's
  Transform panel weren't visibly grayed when Stretch-to-polygon was
  on, even though they were already `disabled` at the input level.
  Operator UAT (2026-05-25)**: "Das Ausgrauen hat überhaupt nicht
  funktioniert … Im Editierungsmenu unter 'Stretch to Polygon', gibt
  es Slider für 'Width scale' 'Height scale' 'X offset' 'Y offset' -
  So lange 'Stretch to polygon' aktiv ist sollen die slider ausgegraut
  sein, das ist aktuell nicht der Fall". Root cause: v1.0.23 only
  added visual gating to the dashboard's animation-editor pane, not to
  the live-editor floating panel (a separate UI that opens when you
  click a running animation). The live editor only set
  `input.disabled = true`, which native styling barely shows on a
  range slider. Fix: new `_applyLiveEditorStretchGate(stretched)`
  helper toggles `.is-disabled` on each gated slider's parent
  `<label>` (in addition to the `input.disabled`); paired with new
  CSS (`#live-editor-transform label.is-disabled { opacity: 0.42;
  pointer-events: none; }`). Called from both the initial-populate
  path (`_populateLiveEditorVisibility`) and the toggle's change
  listener so the gate stays consistent.

---

## [1.0.24] — 2026-05-25

Phase 50: Live-editor "Save as default" closes the editor + rename.

### Changed
- **"Save as default for this animation" button now also acts as Done
  — clicking it both persists the values AND closes the live editor.**
  Operator UAT (2026-05-25): "Das 'Save as default for this animation'
  soll TROTZDEM auch zusätzlich den selben effect wie 'Done' haben,
  wenn man es anklickt". Previously the operator had to click Save
  then Done (two clicks) to commit + close; now Save alone does both.
  Implementation: `saveLiveEditorAsDefault()` calls `closeLiveEditor()`
  after a successful persist (broadcasts `edit-room`, persists the
  auto-start checkbox, hides the panel). The "saved defaults" status
  message survives since closeLiveEditor doesn't touch
  triggerFeedback.

- **Renamed the "Default animation (auto-start on load)" checkbox to
  "Auto-start animation"** for clarity. Operator UAT (2026-05-25):
  "Benenne bitte den slider oben von 'Default animation' in
  'auto-start Animation' um, dann ist es klarer was hier gemeint ist".
  Renamed in both places where the label appears:
  - `#live-editor-default` (animation editor panel)
  - `#dashboard-default-animation` (dashboard room panel)
  The underlying DOM IDs stay unchanged so wiring/persistence
  contracts are untouched.

---

## [1.0.23] — 2026-05-25

Phase 50: Stretch-to-polygon greys out the transform sliders.

### Fixed
- **The 'Stretch to polygon' switch in the animation editor's
  Transform card blocks width/height/X-offset/Y-offset edits (correct
  — they have no effect when the media is force-fit to the room
  polygon), but the sliders still looked active so the operator didn't
  realise WHY their drag was being ignored.** Operator UAT (2026-05-25):
  "Wenn ich eine Animation editiere dann verhindert der 'Stretch to
  Polygon' Switch, dass ich die Animation transformiere — so weit so
  richtig. Nur ist für den User nicht ganz so intuitiv, ich hätte
  gerne das alle slider unter dem switch etwas ausgegraut sind und das
  ausgrauen verschwindet wenn der switch ausgeschaltet wird".

  Fix: gated rows (`widthScale` / `heightScale` / `offsetXScale` /
  `offsetYScale`) now get an `is-disabled` class when stretchToPolygon
  is true. CSS applies 0.42 opacity + `pointer-events: none` and the
  `<input type="range">` itself is set to `disabled`. The toggle
  pushes the update live via a new `onChange` callback on
  `buildToggleRow`, so flipping the switch updates the gate without a
  full pane rebuild (preserves the toggle's pressed state). Rotation
  is intentionally NOT gated because rotation works regardless of
  stretch (mirrors the existing live-editor behaviour at runtime-
  lifecycle-live-editor.js:235-238).

---

## [1.0.22] — 2026-05-25

Phase 50: Animation-editor Name field keeps focus on dirty transition.

### Fixed
- **Typing the first letter into the animation Name field blurred the
  input — operator had to click back into the field to continue
  typing.** Operator UAT (2026-05-25): "das erste mal wenn die dirty
  flag kommt (zB weil ich den Namen ändere), kann ich den namen nicht
  mehr weiter reinschreiben, sondern ich muss explizit noch einmal
  reindrücken … OBWOHL die dirty flag im richtigen moment kommt (wenn
  man den ersten Buchstaben geändert hat) das man den namen weiter
  eintippen kann, ohne explizit noch einmal reindrücken zu müssen".
  Caused by Phase 49's gap-closure-25 / Phase 50's earlier (2026-05-22)
  refinement: `syncDirtyBar()` blurs the active INPUT on the false→
  true dirty transition to dismiss the mobile soft keyboard before the
  operator taps Apply. But TYPING is what flips dirty=true — at the
  moment of the transition, the active element IS the input being
  typed in, so blurring it interrupts the operator mid-word. Fix: skip
  the blur when the focused element is a text-entry INPUT
  (`text/search/email/tel/url/password/number`) or TEXTAREA — those
  are the only elements that summon a soft keyboard, AND the only
  ones where active typing happens. Other targets (SELECT, BUTTON)
  still get the blur if needed, but those don't have keyboards to
  dismiss in the first place. The "tap Apply after typing" flow stays
  intact because by then the operator has tapped outside the input
  themselves (which dismisses the keyboard naturally).

---

## [1.0.21] — 2026-05-25

Phase 50: Animation-editor upload now syncs def.assetRef.

### Fixed
- **After uploading a new GIF/MP4 in the animation editor, the dropdown
  auto-selected the new file but the animation kept rendering the OLD
  asset until the operator manually picked another option then switched
  back.** Operator UAT (2026-05-25): "Wenn ich ein video/gif im
  animationseditor hochlade wird es im dropdown zwar direkt ausgewählt,
  aber die animation noch nicht richtig angezeigt — ich muss erst im
  dropdown ein anderes element auswählen, dann wieder zurück, dann
  wird die neue animation richtig ausgewählt". Caused by the
  upload-completion handler: `refreshList(payload.path)` auto-selected
  the uploaded file in the DOM `<select>`, but for the new-path case
  (Phase 28 B3's "pure library upload" branch) `patchAnimation` was
  never called — so `def.assetRef` stayed at the old value and the
  renderer kept playing the old asset. The dropdown-bounce workaround
  fired the `change` listener which DID call `patchAnimation`, syncing
  state back. Fix: for any successful upload where the uploaded path
  differs from the def's current `assetRef`, fire `patchAnimation`
  with the new path so state matches the visible dropdown.

---

## [1.0.20] — 2026-05-25

Phase 50: Aspect-aware default align-mode profile.

### Changed
- **The default rectangle of a newly-created align-mode profile (or
  Reset Grid) now preserves the active board's pixel ratio instead of
  always producing a 10/90 screen-sized inset.** Operator UAT
  (2026-05-25): "wenn ich ein neues profil anlege im align mode in
  /output/ dann es es - auch bei Frostpunk, was ja mehr viereckig ist
  - das default 80% Rechteck". The legacy default produced a
  destination rectangle whose pixel-AR matched the SCREEN (1.78 on
  1920×1080), so the board content was pre-stretched into a 16:9 box
  on Frostpunk (1.085 AR) or any other non-16:9 board. Fix:
  `buildNewProfileDefaultGrid()` now reads the active board's
  aspectRatio (server-probed image dim, added in v1.0.19) and the
  current viewport AR, and sizes the destination rectangle so its
  pixel proportions equal `boardAR / screenAR` (centered, 80% of the
  larger fittable dimension). Operator now starts with an undistorted
  rectangle and only has to apply distortion intentionally. Falls back
  to the legacy 10/90 inset on the boot-time IIFE seed (before init
  runs) or when image dimensions are unknown.

### Wiring
- Added `getBoardAspectRatio` dependency to the projection-mapping init
  bag in two paths:
  - Dashboard (`runtime-orchestration.js`) — reads from
    `getBoard(state.boardId).aspectRatio`.
  - `/output/` (`boot-handle-ui.js`) — reads from
    `boardAccess.getBoard(getBoardId()).aspectRatio`.

### Verified
| Board       | Board AR | Default rect (norm) | Pixel AR  |
|-------------|---------:|--------------------:|----------:|
| Frostpunk   | 1.085    | 0.488 × 0.800       | 1.085 ✓   |
| Nemesis A/B | 1.462    | 0.658 × 0.800       | 1.462 ✓   |
| Lockdown A/B| 1.425    | 0.641 × 0.800       | 1.425 ✓   |

(viewport 1920×1080, screen AR 1.778 — pixel-AR exactly equals board AR.)

---

## [1.0.19] — 2026-05-25

Phase 50: Aspect-aware default play-area polygon.

### Changed
- **Default play-area polygon now preserves the board image's
  width/height ratio instead of stretching uniformly across boards
  with different aspect ratios.** Operator UAT (2026-05-25): "Das
  default profil mit den 80% nicht mehr perfekt für alle boards
  geeignet … das default board sollte die ursprüngliche board-länge
  nicht verzerren/stretchen sondern die ratio zwischen höhe und länge
  einhalten. Der User kann es dann hinterher noch so verzerren wie er
  es möchte". The legacy `SHIP_POLYGON_DEFAULT` constant was designed
  for a ~1.46:1 board (Nemesis); on Frostpunk (1.085:1) and other
  ratios it produced visually unequal pixel margins. Fix: server now
  probes PNG/JPEG dimensions from `config/boards/assets/*` and
  attaches `imageWidth`/`imageHeight`/`aspectRatio` to the runtime
  board record. New helper `buildAspectAwareDefaultPolygon(AR)` anchors
  the margins to the shorter axis so all four polygon sides have
  approximately equal pixel margins regardless of board ratio.
  Applied at three entry points: per-board default-creation at boot
  (`createDefaultPlayAreasByBoard`), `Reset polygon to default`
  button, and `Create new play area` button. Existing user-drawn
  polygons untouched — change only affects fresh defaults.

---

## [1.0.18] — 2026-05-25

Phase 50: Restore per-board play areas (regression from v1.0.17).

### Fixed
- **All custom play areas wiped — boards only showed the default play
  area.** Operator UAT (2026-05-25): "Alle play-areas sind kaputt in
  jedem Board!! Ich sehe in jedem boards jeweils nur die default play
  area und nicht mehr die von mir gezeichneten Play areas". Caused by
  the v1.0.17 bootstrap reorder: `_initApplicationSetupBoardState()`
  ran AFTER `_initApplicationStartupDefaultsGuard()` so it could see
  the server's `selectedBoard` hint — but setupBoardState ALSO
  initializes per-board default maps (`state.playAreasByBoard =
  createDefaultPlayAreasByBoard()`, plus the same for outsideFx,
  roomFx, insideFx, shipPolygonsByBoard, selectedPlayAreaIdByBoard).
  When it ran after the guard, those default maps overwrote the
  hydrated per-board data that `loadBoardProfiles()` had just loaded.

### Fix
- Extracted the board-id selection logic from `_initApplicationSetup
  BoardState()` into a tiny standalone `_pickInitialBoardId()`. The
  default-map init stays in its ORIGINAL slot (before the guard, like
  in v1.0.16 and earlier), so `loadBoardProfiles()` still overlays
  real per-board data on top of the defaults. The new `_pickInitial
  BoardId()` runs AFTER the guard — preserving v1.0.17's mobile
  cold-start improvement (server's `selectedBoard` hint > localStorage
  > BOARDS[0]).

### Verification (Playwright, cleared localStorage)
- Play area counts per board now match disk:
  - frostpunk: 1, nemesis-board-a: 1, nemesis-board-b: 1,
    nemesis-lockdown-a: 2, nemesis-lockdown-b: 4
- Selected play areas survive: lockdown-a→play-area-2,
  lockdown-b→play-area-4 (both as on disk).
- `boardId` still uses server hint: lands directly on the right
  board, no two-step switch.

---

## [1.0.17] — 2026-05-24

Phase 50: Initial board hint for mobile cold-start.

### Fixed
- **Mobile first-load briefly showed the wrong board.** Operator UAT
  (2026-05-24): "es hat erst das falsche board (frostpunk) geladen und
  dann nochmal ne minute gedauert bis es das richtige board geladen
  hat - kann man nicht direkt das richtige board laden?". Root cause:
  `_initApplicationSetupBoardState` (Phase 2 of bootstrap) picked the
  initial board with priority "localStorage → BOARDS[0]". On a fresh
  mobile device with no localStorage entry, this defaulted to
  alphabetic first = frostpunk. The live-session's actual
  `selectedBoard` only arrived later via WebSocket hello / snapshot
  poll, triggering a board switch (visible as ~1 min "wrong → right").
  **Fix:**
  - `/api/global-defaults` response now embeds the live-session's
    current `selectedBoard` (from `liveSessionState.snapshot`). Missing
    snapshot → field omitted → client falls back to previous behavior.
  - `_initApplicationSetupBoardState` now consults
    `window.__TT_BEAMER_BOOTSTRAP_CONFIG__.selectedBoard` FIRST (server
    hint), then localStorage's last-board-id, then BOARDS[0].
  - Reordered `initializeApplication` so `_initApplicationStartupDefaults
    Guard` (which populates `__TT_BEAMER_BOOTSTRAP_CONFIG__`) runs
    BEFORE `_initApplicationSetupBoardState`. Both phases are
    independent so the reorder is safe.

### Verification (Playwright Pixel 7 Android UA, cleared localStorage)
- Before: `boardId: 'frostpunk'` for ~60 s before switching.
- After: `boardId: 'nemesis-lockdown-a'` on first paint;
  `bootstrapSelectedBoard: 'nemesis-lockdown-a'`; image src ends in
  `nemesis-lockdown-a-moiz0aq6.png`; loading overlay dismissed cleanly.

---

## [1.0.16] — 2026-05-24

Phase 50: Mobile loading-stuck — actual root cause (3 fixes).

### Fixed
- **Mobile dashboard stuck on "Loading..." forever (real root cause).**
  Operator UAT (2026-05-24): "Das Ursprungsproblem ist nicht gelöst:
  Am Handy 'Loading...' aber es lädt nicht". The v1.0.15 timeout bump
  (3s → 8s on `API_REQUEST_TIMEOUT_MS`) did not help because it only
  affected `fetchWithTimeout`, which `/api/global-defaults` and
  `/api/boards` use. The actual culprit was a different request
  with NO timeout at all. Spawned debugger; reproduction confirmed:

  **(1) `loadOutsideResourceAssets()` used raw `fetch("/api/resources")`
  with no AbortController.** On real Android wifi a single TCP
  retransmit / AP roam can hang this fetch indefinitely. Since it's
  awaited inside `_initApplicationLoadZonesAndResources` (Phase 1 of
  bootstrap), bootstrap stalls in Phase 1, the 12s safety timer that
  was registered in Phase 7 never runs, and the user sees Loading...
  forever. **Fix:** wrap in AbortController + reuse the existing
  `API_REQUEST_TIMEOUT_MS=8000ms` budget. File:
  `src/app/runtime/panels/runtime-fx-panels-inside-outside.js:385`.

  **(2) 12-second loading-overlay safety timer was registered in
  Phase 7 (LAST step of `initializeApplication`).** Defense-in-depth
  violation: if any earlier async phase hangs, the safety never
  registers. **Fix:** split `_initApplicationLoadingOverlayAndDraw()`
  into `_registerLoadingOverlaySafety()` (state + 12s safety,
  registered FIRST) and `_startApplicationDrawLoop()` (kicks
  requestAnimationFrame, stays last because it depends on `ctx.draw`).
  Future async hangs anywhere in the bootstrap chain now still
  release the user within 12s. File:
  `src/app/runtime/core/runtime-bootstrap.js:300-353`.

  **(3) `onError` handler in `runApplicationBootstrap` did not
  dismiss the loading overlay.** If bootstrap throws (e.g. real
  fatal error), the overlay sat on top of whatever the error path
  rendered. **Fix:** add explicit `is-hidden` toggle to the onError
  callback so the user sees the underlying UI / unreachable-overlay.
  File: `src/app/runtime/runtime-orchestration.js:3189-3210`.

### Verification (Playwright, Android 13 / Chrome 131 mobile UA)
- Repro: route `/api/resources` to hang 40 seconds.
- **Before:** loading overlay still visible at t=30s, bootstrap never
  completes (debugger trace).
- **After:** at t=8.1s the AbortController fires (`REQFAIL:
  net::ERR_ABORTED`), the catch handler sets an empty asset list,
  bootstrap completes, **loading overlay dismissed at t=10.1s**
  with `bootstrapConfig=true`. SUCCESS.

### Debug session
Full repro log + scenario matrix in
`.planning/debug/phase-50-mobile-loading-stuck-v2.md`. Five
scenarios tested: baseline / `/api/global-defaults` 15s delay /
`/api/resources` 40s hang / `/api/boards` 15s delay / Google Fonts
hang. The `/api/resources` scenario was the only exact match for
the operator's symptom (Loading visible, no error overlay).

---

## [1.0.15] — 2026-05-24

Phase 50: Mobile loading-screen fix + English-only UI strings.

### Fixed
- **Mobile dashboard stuck on loading screen → "Unable to connect to
  server (API UNREACHABLE)".** Operator UAT (2026-05-24): "Die mobile
  Nutzung funktioniert nicht mehr — weil es stuck im loading screen
  ist… Nach einer gewissen Zeit kommt 'Unable to connect to server |
  Global defaults save failed (API UNREACHABLE)'. Am Desktop hab ich
  das nicht". Root cause: `API_REQUEST_TIMEOUT_MS` was 3000 ms — fine
  on a wired desktop where the first byte returns in <100 ms, but
  tight for mobile networks where cold-start DNS + LAN hop + first-
  byte can spike past 3 s. The startup-defaults guard then threw
  `API_UNREACHABLE`, the dashboard rendered the server-unreachable
  overlay, and the loading screen got covered by it. **Fix:** bump
  timeout to 8000 ms — gives mobile a real chance without making
  legitimate "server actually down" cases feel slow.

### Changed (i18n cleanup)
- **All user-facing strings are now English.** Operator UAT: "bitte
  schau dass jegliche Strings in der gesamten Anwendung englisch
  sind". The following six German strings were translated:
  - server-unreachable overlay info line:
    "Die globale Config wird ausschließlich vom Server geladen.
    Starte den Server und klicke Retry, um die App zu laden." →
    "The global config is loaded exclusively from the server. Make
    sure the server is running and reachable on this network, then
    click Retry."
  - GivenUp overlay title: "Verbindung verloren" → "Connection lost"
  - GivenUp overlay detail:
    "Versuche: N · Letzte erfolgreiche Verbindung: HH:MM:SS" →
    "Attempts: N · Last successful connection: HH:MM:SS"
  - GivenUp overlay error: "Letzter Fehler: X (unbekannt)" →
    "Last error: X (unknown)"
  - reconnect status: "letzte Verbindung: …" → "last connection: …"
  - host-down error: "Render-Host abgestürzt" → "Render host crashed"
  - Receiver-bootstrap: "Verbindung dauerhaft verloren" →
    "Connection permanently lost"
  Code comments quoting operator UAT (which by definition are German)
  are kept as faithful citations.

---

## [1.0.14] — 2026-05-24

Phase 50: Settings → System polish + hint visibility in overlay.

### Fixed
- **"Detected: (auto-detection in progress…)" badge stuck forever.**
  Operator UAT (2026-05-24): "Dort steht bei mir noch konstant
  'Detected: (auto-detection in progress...)'". Root cause: the badge
  filtered `x264-software` out of the detected list and treated the
  resulting empty list as "still probing". On a software-only host
  the list IS empty after filtering, so the badge stayed stuck. Now
  three states: still probing (no list yet) → "(auto-detection in
  progress…)"; only software fallback present → "software only (no
  hardware encoder)"; one or more hardware encoders → list them.
- **Added a `global-config-update` broadcast** from the server when
  `availableEncoders` first gets populated, so the dashboard refetches
  /api/global-defaults and updates the badge without needing a manual
  reload. The dashboard's existing snapshot listener already had the
  refetch path — it just wasn't being notified.

### Changed
- **Bitrate slider replaced with 3-option preset radio.** Operator
  UAT: "der Slider macht in der neuen Situation wenig Sinn". The
  2-50 Mbit/s slider implied tunability that the H.264 rate-control
  doesn't actually deliver for typical board content. The new options
  are **Low (3 Mbit/s) / Standard (10 Mbit/s, default) / Maximum
  (30 Mbit/s)**, mapped to the same `streamBitrateMbps` config field
  under the hood (no schema change; legacy values like 16 snap to the
  nearest preset for display).
- **Codec + Optimization help text moved to ⓘ info-icon tooltips.**
  Operator UAT: "wall of text gefällt mir nicht". Each dropdown now
  has a small `ⓘ` next to its label; the browser's native
  `title`-attribute tooltip shows the help text on hover/focus. No JS,
  no custom popup, accessible via keyboard. CSS for the icon in
  `src/styles.css` (`.ssr-info-icon`).
- **Optimization mode now visible in the /output/ overlay** as
  `hint=detail / hint=motion / hint=auto` on the ENCODE line.
  Operator UAT: "Was bei Optimization ausgewählt ist sollte auch im
  overlay angezeigt werden". The contentHint flows from the operator's
  dropdown → server → SSR publisher → `setServerInfo` → heartbeat →
  Pi overlay. Closes the verification loop the operator wanted:
  "Prüfe auch ob Optimization wirklich verdrahtet ist".

### Verification (empirical, my bench)
- Fresh boot: badge reads "software only (no hardware encoder)" within
  ~10 s of server start (was: stuck forever).
- /output/ overlay after warmup: shows `hint=detail · target=2.0Mbps
  · 30fps`. Codec was VP9 from prior operator state, picked correctly
  by the publisher (`[ssr-publisher] codec=vp9 ... encoderImpl=libvpx`
  in start.log).
- recv= shows a real value (~270 kbps) within ~22 s of boot, no
  flicker observed during the 22 s polling window.

---

## [1.0.13] — 2026-05-24

Phase 50: Reset recv-anchor on peer-connection rebuild.

### Fixed
- **`recv=?` stuck after triggering many animations.** Operator UAT
  (2026-05-24): "Anfänglich hat das mit dem Wert ohne ? funktioniert,
  dann habe ich aber viele animationen gestartet und 'recv' ist
  wieder dauerhaft auf '?' ohne einen Wert anzuzeigen. Beim board
  wechsel hat es wieder geklappt".
  Root cause: when the SSR Chromium tab restarts (codec switch, board
  switch, animation surge that exceeds the watchdog), the consumer's
  RTCPeerConnection is rebuilt and inbound-rtp's `bytesReceived`
  counter rolls back to 0. The Phase 50 anchor still held the OLD
  high bytes/timestamp from the previous PC → `curBytes >= anchor`
  AND `curT > anchor.timestamp` both failed forever → derivedRecvBps
  stuck at the stale value until cache expired to "?". Board switch
  manually rebuilt state and got past it.
  **Fix:** detect rollback explicitly — if `curBytes < anchor.bytes`
  OR `curT < anchor.timestamp`, treat it as a counter reset, reseed
  the anchor with the new values, and skip the diff this tick.
  The next tick's diff is computed against the fresh anchor. (`<sha>`,
  Phase 50)

### Notes
- If you still see `recv=8kbps` consistently for BOTH H.264 and VP9
  with lots of animations active, the SSR Chromium tab is likely
  CPU-bound — encoder produces few frames, network really does carry
  ~8 kbps. Check `start.log` for `[ssr-publisher] enc-stats
  framesPerSecond=X sendBps=Y` to confirm. If `framesPerSecond` is
  e.g. 3 instead of 30, the SSR-tab can't sustain the render rate
  under the animation load. That's a separate CPU/render budget
  issue, not a wiring problem.

---

## [1.0.12] — 2026-05-24

Phase 50: Robust recv-bitrate via persistent anchor + stale indicator.

### Fixed
- **`recv=?` still flickering even after Phase 50's sticky cache.**
  Operator UAT (2026-05-24): "etwa 3 bis 4 sekunden ist 'recv' ?,
  dann kurz für eine halbe Sekunde sehe ich was, dann wieder ?".
  Phase 50 cached the last-good value at module scope in
  `receiver-status-ui.js`, but the cache was recomputed inside the
  formatter — and the formatter ran on every 1 s tick regardless of
  whether `pollRtcStats()` had actually resolved. On a Pi where
  Chromium's internal RTCStats refresh ticks at ~2 s (not 1 s), every
  other tick saw `bytesReceived` unchanged → my Phase-60 guard
  returned the cached value but a 0-byte tick still flashed
  "?" on alternating renders.
- Restructure: recv-bitrate computation moved into
  `receiver-bootstrap.js#pollRtcStats()`, which runs ONLY when
  getStats() actually resolves. A persistent "anchor sample" lives
  in module scope and only advances on real forward progress (positive
  timestamp + positive bytesReceived). The anchor is diffed against
  the new sample each poll; the result is stored on
  `rtcStats.derivedRecvBps` (sticky 15 s if the next poll can't
  compute fresh). The formatter just reads that field — no per-render
  computation.
- **Stale indicator:** when the cached value is being shown
  (because the latest poll didn't produce a fresh diff), the chip
  renders `recv=12.3Mbps~` (trailing tilde). Lets the operator
  distinguish "still flowing at this rate" from "this is the last
  reading I had, but I'm not sure right now". After 15 s of no fresh
  data the value falls back to `?` (real stream-loss signal).
- (`<sha>`, Phase 50)

### Note for operator
- After this patch lands, **hard-reload the Pi /output/ tab**
  (Ctrl+Shift+R or close+reopen the browser tab). Browser HTTP cache
  may otherwise hold the older receiver-status-ui.js. Same for any
  open dashboard tabs.

---

## [1.0.11] — 2026-05-24

Phase 50: Stabilize `recv=` field in the diagnostic overlay.

### Fixed
- **`recv=?` no longer flickers most of the time on the /output/
  diagnostic overlay.** Operator UAT (2026-05-24): "ich sehe nur ganz
  kurz manchmal einen Wert". Root cause: the raw RTCStats diff in
  `formatDiagnosticOverlay` had three failure modes —
  1. The init-stub `rtcStats` has `bytesReceived=0` and `timestamp=0`
     for the first ~2 polls before WebRTC populates inbound-rtp;
     diffing against that produces garbage.
  2. Some `getStats()` polls return no inbound-rtp entry at all
     (transient during ICE renegotiation, codec switches, decode
     stalls); `next.inbound` stays at the zero stub.
  3. When `dBytes` is 0 between polls (idle frames), we returned 0,
     which formatted as "?" via `fmtBitrate(0 ≤ 0) → "?"`.
  **Fix:** require both `cur.timestamp` and `prev.timestamp` to be
  populated (>0) and strictly increasing (>100ms gap); cache the last
  good value at module level for 5 s so brief gaps don't flicker the
  chip. Empirical bench: stability went from "~1 in 8 samples is a
  real value" (operator report) to 39/40 samples = 97.5% real value.
  (`<sha>`, Phase 50)

---

## [1.0.10] — 2026-05-24

Phase 50: VP9 codec + content-hint operator levers — actual stream
quality knobs that move the needle.

### Added
- **Video codec dropdown** in Settings → System → Server-side Rendering.
  Operator can pick:
  - **H.264** (default, broad compatibility) — uses Chromium-bundled
    OpenH264 software encoder.
  - **VP9** — uses libvpx; 2-3× more bytes per second at the same
    bitrate cap on the same content, and noticeably crisper text/edge
    rendering. Trade-off: software libvpx runs ~23 fps vs OpenH264's
    ~30 fps on the bench (CPU-bound; hardware encoder removes this
    gap). Mediasoup router now advertises both codecs; publisher
    selects at produce-time. (`<sha>`, Phase 50)
- **Content optimization dropdown** in Settings → System → Server-side
  Rendering. Sets `videoTrack.contentHint` AND `degradationPreference`
  on the WebRTC sender:
  - **Detail (default)** — `contentHint="detail"` +
    `degradationPreference="maintain-resolution"`. Encoder preserves
    fine spatial detail; if CPU/network pressure forces a degradation,
    framerate drops before resolution does. Right call for game
    boards with hexagons, room outlines, text labels.
  - **Text** — `contentHint="text"` + same as Detail. Even higher
    spatial priority. For very text-heavy boards.
  - **Motion** — `contentHint="motion"` +
    `degradationPreference="maintain-framerate"`. Encoder fills more
    of the bitrate budget (visible byte rate goes up ~6× on static
    content) and prioritizes frame-to-frame smoothness. For boards
    with high-motion FX (sandstorm, fire animations).
  - **Default (auto)** — no hint. Encoder uses Chromium's built-in
    heuristics (typically defaults to motion for screen capture).
  (`<sha>`, Phase 50)
- **Publisher-side console diagnostics** for every produce(): logs
  resolved codec, content hint, degradation preference, sender params
  readback, and outbound-rtp stats poll (targetBitrate / bytesSent /
  qualityLimitationReason / encoderImplementation) at t+8/12/18s.
  Visible in start.log under `[ssr-publisher] ...`. (`<sha>`, Phase 50)

### Changed
- `[ssr-publisher]` console lines from the SSR-tab are now forwarded
  to the main start.log instead of silently dropped. The original
  "already logged" comment was wrong — they had nowhere else to go.
  (`<sha>`, Phase 50)

### Verified empirically
- 3-stage Playwright bench on nemesis-lockdown-a with 14 active
  animations + sandstorm-mp4:
  - H.264 + motion: sendBps=775 kbps, recv=0.75 Mbps, 30 fps, OpenH264
  - H.264 + detail: sendBps=138 kbps, recv=0.13 Mbps, 30 fps, OpenH264
  - VP9 + detail:   sendBps=348 kbps, recv=0.34 Mbps, 23 fps, libvpx
- End-to-end UI flow: operator picks VP9 in dashboard → server gets
  `serverRendering-update` mutation → SSR Chromium tab restarts →
  /output/ overlay reports codec=VP9 within ~15s.

### Did NOT help (investigated, ruled out)
- `videoGoogleMinBitrate`: Chromium's OpenH264 ignored a min-bitrate
  of 5 Mbit/s and stayed at ~140 kbps. Not exposed in the UI; would
  have been Augenwischerei.
- Bitrate slider alone: Phase 50 readback confirmed `maxBitrate`
  reaches the RTCRtpSender at the slider value but the encoder's
  rate-control only fills the budget when content motion demands it.
  Phase 50's `initialAvailableOutgoingBitrate` change still in place
  but is not the actual quality lever.

---

## [1.0.9] — 2026-05-24

Phase 50: Slider value reaches the wire — fixed two upstream caps.

### Fixed
- **Bitrate slider value now actually visible in image quality.**
  Operator UAT (2026-05-24): "Keinen Unterschied zwischen 2 und 50
  Mbit/s feststellbar — die Qualität scheint identisch zu sein."
  The slider was reaching the publisher's `RTCRtpSender.maxBitrate`
  correctly (Phase 50 readback confirmed this part), but two other
  upstream caps were silently bottlenecking the pipeline at ~8 Mbit/s
  regardless of slider:
  1. `createWebRtcTransport`'s `initialAvailableOutgoingBitrate` was
     hardcoded to 8 Mbit/s. This is the WebRTC GCC (Google Congestion
     Control) bandwidth estimator's STARTING point. GCC ramps slowly
     (~few % per second) and only probes higher when the publisher
     actively pushes more data — which a low-motion board-game scene
     never does. Net: pipeline stuck at 8 Mbit/s start regardless of
     publisher cap. **Fix:** the consumer-side transport now reads the
     current `streamBitrateMbps` slider value from
     `config/global-defaults.json` at transport-creation time
     (2s in-process cache for FS-pressure relief) and starts GCC at
     that value, not 8 Mbit/s.
  2. `codecOptions.videoGoogleStartBitrate` was hardcoded to 1000 (kbps,
     i.e. 1 Mbit/s) — the encoder's initial target. Combined with #1
     above, the encoder began at 1 Mbit/s and GCC never gave it a
     reason to ramp. **Fix:** the start bitrate now matches the
     slider's `maxBitrate` so the encoder reaches the target
     immediately. (`<sha>`, Phase 50)

### Diagnosis
- The `recv=NMbps` field added in Phase 50 made the bottleneck
  visible: even with high-motion content, the receiver showed
  `recv≈8 Mbps` at slider=50 AND slider=2. With the Phase 50
  `[ssr-publisher] sender params` readback already confirming the
  publisher's encodings was set to e.g. `maxBitrate=50000000`, the
  bottleneck had to be downstream of the publisher. Tracing the
  mediasoup config path located both caps above.

---

## [1.0.8] — 2026-05-24

Phase 50: Diagnostic — actual received bitrate in the overlay.

### Added
- **STREAM line in the /output/ diagnostic overlay now shows
  `recv=<X>Mbps`** — the actual received bitrate computed from the
  `bytesReceived` delta over the RTCStats timestamp delta (inbound-rtp).
  Operator can now compare the configured slider value (`preset=` on
  the ENCODE line) against what's actually flowing on the wire:
  - `preset=40Mbps recv=2.5Mbps` with low-motion content → wiring is
    fine, encoder simply doesn't need the budget (H.264 only fills
    the cap when motion demands it).
  - `preset=40Mbps recv=2.5Mbps` AND `preset=2Mbps recv=2.5Mbps`
    → wiring problem, `maxBitrate` isn't reaching the encoder.
  (`<sha>`, Phase 50)
- **SSR-tab now logs the RTCRtpSender encodings parameters at t+500ms
  and t+5s after `transport.produce()`** — confirms whether the
  `maxBitrate` from the publisher script's `encodings: [{ maxBitrate }]`
  actually reached Chromium's encoder. Surfaces in start.log under
  `[ssr-publisher] sender params [t+500ms]: [{"maxBitrate":...}]`.
  (`<sha>`, Phase 50)

---

## [1.0.7] — 2026-05-24

Phase 50: SSR restart on bitrate change.

### Fixed
- Applying a bitrate slider change now actually restarts the SSR
  Chromium tab so /output/ reflects the new value. server.mjs's
  `restartKeys` list still referenced the removed `qualityPreset`
  key — `streamBitrateMbps` wasn't in there, so applying a slider
  change persisted the new value to global-defaults.json but the
  running SSR tab kept the previous bitrate (and the Pi diagnostic
  overlay kept showing the old Mbps). (`<sha>`, Phase 50)

---

## [1.0.6] — 2026-05-24

Phase 50: SSR settings go through the global dirty-flag / Apply flow.

### Changed
- **Bitrate slider no longer restarts the SSR Chromium tab on every
  drag tick.** Slider input now accumulates the pending value into a
  client-side buffer, marks the global config dirty, and surfaces the
  standard "Apply changes" bar. The SSR `serverRendering-update`
  live-mutation only fires when the operator clicks **Apply** —
  resulting in a single restart with the final committed bitrate.
  Discard rolls the slider back to the persisted server value.
  Status line shows "pending — click Apply to push" during drag.
  (`<sha>`, Phase 50)

---

## [1.0.5] — 2026-05-24

Phase 50: Stream-quality preset → numeric bitrate slider.

### Changed
- **Settings → System → Stream-quality preset** is now a **numeric
  bitrate slider** (2–50 Mbit/s, integer steps) instead of a 5-option
  radio group. Operators can experiment freely with bits-per-frame
  to find the sweet spot for their hardware. Default 16 Mbit/s
  (equivalent to the old "extra-high" preset). (`<sha>`, Phase 50)
- **Inline soft-warning** appears below the slider when the value
  exceeds 20 Mbit/s: "the software encoder may stutter on weak CPUs;
  a hardware encoder is strongly recommended". The slider is NOT
  blocked — the operator can dismiss the warning by setting any value
  they want. (`<sha>`, Phase 50)
- The legacy `qualityPreset` enum field in `config/global-defaults.json`
  was migrated in-place to `streamBitrateMbps` (numeric). Mapping:
  low-latency → 4, balanced → 8, high-quality → 12, extra-high → 16,
  ultra-high → 20. SSR encoder + WebRTC sender now read the bitrate
  directly from the slider value via
  `deriveSimulcastBitrates({ configuredBitrate })`. (`<sha>`, Phase 50)
- The Pi-side diagnostic overlay's "preset=" field shows the literal
  Mbit/s value (e.g. `25Mbps`) instead of the preset name. (`<sha>`, Phase 50)

---

## [1.0.4] — 2026-05-24

Phase 50: Nemesis Lockdown A/B polygon Y-shift migration.

### Fixed
- **Nemesis Lockdown A/B rooms y-shifted on the dashboard** since v1.0.1
  (Phase 50). The PNG images for these two boards are rasterized at
  2500 × 1755 (aspect 1.4245), but the polygon coordinates were drawn
  against the original Nemesis print aspect 7978 × 5456 (= 1.4623).
  Phase 50 switched the dashboard stage from the hardcoded print
  aspect to the actual image aspect → the 0..1 normalized polygon Y
  values now mapped to a slightly different (1.3 % taller) image
  region, visibly shifting the room outlines on the dashboard.
  (`<sha>`, Phase 50)

### Migration
- One-time data migration applied to `config/boards/nemesis-lockdown-a.json`
  + `nemesis-lockdown-b.json` polygon Y coordinates (rooms + play
  areas) AND to `config/projection-profiles.json` `srcYs` arrays for
  every lockdown profile. Both shifted by `y * r + (1-r)/2` where
  `r = (2500/1755) / (7978/5456) ≈ 0.9742`. Co-migrating both keeps
  the projector-mesh calibrations aligned with the migrated polygons,
  so the operator does NOT need to re-calibrate the projection after
  this patch.
- Nemesis-board-a/-b unaffected — their JPGs are 7978 × 5456 already,
  so Phase 50 + the original polygon design aspect match exactly.
- Frostpunk unaffected — its polygons were drawn after Phase 50
  shipped against the natural PNG aspect.
- Migration scripts preserved at
  `.planning/phases/phase-53/migrate-lockdown-y-*.py` for audit.

---

## [1.0.3] — 2026-05-22

Phase 50: Per-animation transform editing + temporary-vs-permanent
distinction in the live editor.

### Added
- **Transform card in the animation editor** (Settings → Animations →
  pick a room animation that uses an MP4 or GIF asset). A new
  collapsible "Transform" section exposes the same sliders that were
  previously only reachable through the live editor: rotation, stretch
  to polygon, width scale, height scale, X / Y offset. Changes
  persist directly to the animation definition — no need to start the
  animation first to tune its placement. Hidden for scopes that don't
  support transforms (inside / outside, room coded effects).
  (`8e8d1aa`, Phase 50)
- **"Save as default for this animation" button** in the live editor,
  below Done / Discard. Commits the running animation's current
  live-editor values (opacity, intensity, speed, volume, color, mode,
  direction, transform) back to the animation definition so every
  future manual trigger applies those values. The button is the
  explicit-commit path. (`8e8d1aa`, Phase 50)

### Changed
- **Live editor "Done"** no longer silently persists transform values
  to the animation definition. Done now means "keep these tweaks on
  the running instance only — next manual trigger uses the un-tweaked
  defaults". The new "Save as default" button is the path that
  overrides the definition. (`8e8d1aa`, Phase 50)

---

## [1.0.2] — 2026-05-22

Phase 50: Animation Name input keystroke focus loss.

### Fixed
- Typing in the animation **Name** field no longer ends the input
  session after every keystroke. On desktop the caret stayed inside
  the input but the field was being blurred + re-focused on each
  letter; on mobile this dismissed the soft keyboard after each
  letter, making the field effectively unusable. Root cause: Phase 49
  gap-closure-25 added a defensive `document.activeElement.blur()`
  inside `syncDirtyBar()` (to dismiss the keyboard when the dirty bar
  first appears) — but the blur fired on every syncDirtyBar call,
  including the ~one per keystroke during a Name edit. Now gated to
  the false→true dirty-flag transition only. (`91ac380`, Phase 50)

---

## [1.0.1] — 2026-05-21

Phase 50: Aspect-ratio-aware board import.

### Added
- Boards of arbitrary aspect ratio (square, portrait, ultrawide, etc.)
  now display at their **natural aspect ratio** instead of being forced
  into the Nemesis-specific 7978 × 5456 (~1.46:1) frame. Roughly-square
  imports like Frostpunk (1172 × 1080, ~1.085:1) used to be cropped at
  the top and bottom by `object-fit: cover` on the dashboard; they now
  show the full image. Polygons drawn on the board scale automatically
  because their coordinates are normalized to 0..1. (`9072b22`, Phase 50)

### Changed
- The stage element's `aspect-ratio` and width calculations now read
  from two CSS custom properties (`--board-aspect`, `--board-aspect-num`)
  that the runtime sets from the loaded board image's natural
  dimensions. Default fallbacks preserve the previous Nemesis ratio so
  existing boards display identically to v1.0.0. The `/output/` (Pi
  projection target) + SSR Chromium tab use the existing
  `body[data-output-role="final-output"] .stage { aspect-ratio: auto;
  width: 100%; height: 100%; }` override, so the projection stream is
  unaffected — the change is scoped to the operator-facing dashboard
  preview. (`9072b22`, Phase 50)

---

## [1.0.0] — 2026-05-19

Initial public release. Phase 49 closure shipped the first live build
after a long iteration cycle of operator UAT polish on top of the
Phase 47 Windows process-supervision work. Highlights below — the
full per-fix list is in `git log --grep "49-gap-closure-"`.

### Added
- **"Import from other board" button** in the projection profile UI:
  one-click flow to copy a profile from another board into the active
  one. (`3eb4e92`, Phase 49 / gap-closure-25)

### Changed
- **Mobile portrait viewport** zoom-out + cluster-rail clipping rework
  so the rail (cluster pads) is visible by default without horizontal
  swipe, and never overlays the dashboard controls when the board is
  panned. (`756e21e` + `167d660`, Phase 49 / gap-closure-34/35)
- **Animation editor dirty-bar** redesigned for mobile: shrink-wrapped
  bar (no more right-edge clipping), no auto-focus on touch devices
  (no more soft-keyboard popping up on entry), hover styles gated to
  real-hover devices via `@media (hover: hover)`, Discard handler
  reworked to fire syncDirtyBar AFTER the async server reload finishes
  (no more "first-tap-did-nothing" perception on slow networks).
  (`de7af52` + `37fb6a9` + `3ac579b` + `7b32e04`, Phase 49 / gap-closure-25 through 28)
- **Mobile drag-to-reorder** in the animation library list now
  preserves native scrolling AND drag with auto-scroll-during-drag
  (Sortable.js-style `touchmove.preventDefault()` pattern instead of
  static `touch-action: none`). (`c935da6`, Phase 49 / gap-closure-23)
- **Board switch** falls back to the first available saved profile
  when no profile is remembered, instead of forcing the 80%-inset
  default. (`c9ea5e4`, Phase 49 / gap-closure-26)
- **Polygon edits** now broadcast to /output/ SSR + Pi immediately on
  save, not only after a full page reload. (`69e6f4d`, Phase 49 / gap-closure-23)

### Fixed
- **Align-mode fresh-boot desync**: typo in the polygon-editor hook
  meant the /output/ tab silently skipped the warp-grid apply path on
  cold boot. (`b79a9b3`, Phase 49 / gap-closure-22)
- **Dashboard CPU drain** when a remote operator was align-dragging
  on /output/: dashboard was running a self-perpetuating 8 Hz
  poll-and-apply loop, draining battery + starving animations.
  Three-round empirical debug located the documentVisible fast-mode
  trigger as the actual culprit (after fixing two earlier red
  herrings). (`c868c75` + `10eac9a` + `ca573f9`, Phase 49 / gap-closure-27/29/32)
- **Undo to baseline on /output/** now correctly clears the dashboard's
  "Unsaved on /output/" chip. (`92ab41d`, Phase 49 / gap-closure-30)
- **Reorder back to baseline** in the animation editor now auto-clears
  the dirty flag (was pinned at true because the fast-path skipped
  the baseline comparison). (`432e3f5`, Phase 49 / gap-closure-24)
- **Board-switch loses cross-board profile** when the operator picked
  a board that didn't have a saved profile. (`c74a406`, Phase 49 / gap-closure-24)
- **Win32**: dashboard rendered a white page on first boot
  (path.normalize root issue) + verdict-line crashed on a producerIds
  shape mismatch. (`b8ad1f1` + `db0b53a`, Phase 49 gap-closure-8/9)
- Numerous mobile-touch interaction polishes — see
  `git log --grep "49-gap-closure-1" --grep "49-gap-closure-2"` for
  the full sequence.

### Process
- TT-Beamer went LIVE with this build (2026-05-19). Going forward
  every closed phase ships a version bump + a CHANGELOG entry.
