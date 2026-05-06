---
status: diagnosed
trigger: "Phase 31 h46 — three room-outline bugs persist after h44+h45: (1) align-mode ON does NOT show outlines, (2) outlines appear only AFTER first transform, (3) align-mode OFF does NOT hide already-shown outlines"
created: 2026-05-06T00:00:00Z
updated: 2026-05-06T00:08:00Z
---

## Current Focus

hypothesis: |
  Diagnosis complete. Three separate root causes identified (Bug #3 is most clear,
  Bugs #1+#2 likely share the BOARDS-not-loaded race). What the user calls "Pi
  outlines" is actually the SSR-tab's #room-overlay encoded into the WebRTC
  stream — Pi's local #room-overlay is hidden by CSS at all times.
test: per-bug diagnostic — see Resolution section
expecting: user approval to apply fixes (FIX-A for bug #3 surgical, FIX-B for
  defense-in-depth, FIX-C for bugs #1+#2 race)
next_action: WAIT for user response on Resolution before applying any fix

## Symptoms

expected: |
  Bug #1: enabling align-mode immediately shows polygon outlines on Pi /output/
  Bug #2: outlines should appear on align-mode-enter, NOT lazily after first transform
  Bug #3: disabling align-mode immediately hides the outline DOM nodes
actual: |
  Bug #1: align-mode=true → no outlines visible on Pi /output/ until a transform happens
  Bug #2: only after dragging a handle the outlines suddenly appear
  Bug #3: after outlines appear, toggling align-mode=false leaves them visible
errors: |
  [ssr-tab:reqfailed] http://127.0.0.1:4173/api/live/command :: net::ERR_ABORTED
  [ssr-tab:pageerror] DOMException: AbortError: signal is aborted without reason
      at <anonymous> (http://127.0.0.1:4173/src/app/runtime/live-sync/runtime-live-sync-core.js:259:22)
  [align-mode-log] onAlignModeChange enabled=false ssrTab=true does NOT fire on SSR-tab
reproduction: |
  1. Open /output/ on Pi receiver
  2. Toggle align-mode ON in dashboard
  3. Observe: NO polygon outlines on Pi (bug #1)
  4. Drag any handle once
  5. Observe: outlines NOW appear (bug #2 confirms lazy painting)
  6. Toggle align-mode OFF in dashboard
  7. Observe: outlines remain visible (bug #3)
started: regressed/uncovered by h44 hoist + h45 diagnostics; was nominally working in some earlier h-revision
prior_attempts: h37 (re-render after broadcast grid apply), h38 (render polygons on align-mode entry), h44 (hoist alignMode block above 200-line trap), h45 (diagnostic logs to confirm h44 reach)

## Eliminated

- hypothesis: "Pi /output/ paints the SVG room polygons locally"
  evidence: |
    receiver-bootstrap.js boots WebRTC video + status UI ONLY; renders no SVG.
    runtime-orchestration.js DOES still run on Pi (lines 110-120 explicit comment),
    but the CSS rule styles.css:2303 sets `#room-overlay { display: none !important }`
    on body[data-output-role="final-output"]:not([data-ssr-tab="true"]) (Pi receiver).
    The .align-mode-active override at styles.css:119 has the same specificity but
    appears EARLIER, so the late rule wins. → On Pi, #room-overlay is always invisible.
    Therefore the polygon outlines the user sees on the Pi screen are encoded
    INTO THE WEBRTC STREAM by the SSR Chromium tab. The user is seeing the SSR
    tab's #room-overlay through the stream — not Pi's local one.
  timestamp: 2026-05-06T00:01:00Z

## Evidence

- timestamp: 2026-05-06T00:00:30Z
  checked: renderRoomOverlay implementation in runtime-polygon-editor.js:344
  found: |
    Lines 348-352 — function ALWAYS calls `replaceChildren()` first (clearing
    the SVG), THEN early-returns when `outputRole === FINAL && !alignMode`.
    Net effect when called on disable: DOM is cleared. So if renderRoomOverlay
    runs at all on disable, the polygons WILL disappear.
  implication: |
    Bug #3 = renderRoomOverlay is NOT being called on disable on the SSR-tab.
    Confirms the user's observation that `onAlignModeChange enabled=false ssrTab=true`
    never fires.

- timestamp: 2026-05-06T00:01:00Z
  checked: onAlignModeChange in runtime-projection-handle-ui.js:1604-1668
  found: |
    On `enabled=true`: calls applyTransform(), then ctx.renderRoomOverlay() (h38),
    then on SSR-tab broadcasts authoritative grid via broadcastGridSnapshot, then RETURNs.
    On `enabled=false`: SSR-tab branch is `if (_isSsrChromiumTab()) return;` —
    it does NOTHING on the SSR-tab! No renderRoomOverlay call, no clear, just return.
    On Pi (FINAL but not SSR-tab): falls through to hideHandles() + saveToLocalStorage().
    NEITHER branch on disable calls renderRoomOverlay.
  implication: |
    Even if the disable propagates to the SSR-tab and onAlignModeChange(false)
    fires there, the SSR-tab still wouldn't repaint — it just returns. Disable
    has no clearing effect on either Pi or SSR-tab via this handler.

- timestamp: 2026-05-06T00:02:00Z
  checked: runtime-stage-viewport.js:113-164 syncAlignModePanel + setAlignMode
  found: |
    syncAlignModePanel (line 113) ALWAYS sets body class `align-mode-active`
    (line 137) AND inline style.display on roomOverlay (lines 158-160:
    `style.display = "none"` for FINAL+disabled, `"block"` otherwise).
    THEN on transition, it fires ctx.onAlignModeChanged → onAlignModeChange.
    setAlignMode (line 166-187) on local apply: state.alignMode = next; syncAlignModePanel(); ctx.renderRoomOverlay().
    So setAlignMode calls renderRoomOverlay — but this is only called from CONTROL role
    or local-apply, not from snapshot-driven updates on SSR-tab/Pi.
  implication: |
    The disable path on SSR-tab/Pi goes through applyLiveRuntimeSnapshot → which
    calls syncAlignModePanel (toggling body class + inline style). For the
    SSR-tab specifically, the inline `style.display = "block"` is overridden by
    nothing CSS-side (no display:none rule on SSR-tab). So inline display works
    on SSR-tab. BUT on the SSR-tab, the actual DOM polygons inside #room-overlay
    are NOT cleared on disable — because no one calls renderRoomOverlay on
    disable. They sit there, and `display: block` (last set on enable) stays.

- timestamp: 2026-05-06T00:02:30Z
  checked: applyLiveRuntimeSnapshot in runtime-live-sync-core.js:342-774
  found: |
    Line 350: early-return if shouldApplyMutationEnvelope(version, mutationEnvelope)
    is false.
    Lines 374-389: h44 hoisted alignMode block — sets state.alignMode, calls
    syncAlignModePanel. Inside try/catch.
    Line 750: ctx.syncAlignModePanel() called again later.
    Line 757: ctx.renderRoomOverlay() called UNCONDITIONALLY.
    ALL of this runs only if shouldApplyMutationEnvelope passes.
  implication: |
    If the disable mutation envelope passes shouldApplyMutationEnvelope, then
    line 757 renderRoomOverlay() runs on SSR-tab → which clears DOM (replaceChildren
    + early return on FINAL+!align). So if envelope passes, bug #3 should NOT happen.
    Therefore: either shouldApplyMutationEnvelope rejects the disable, OR
    applyLiveRuntimeSnapshot is never called for the disable on SSR-tab.

- timestamp: 2026-05-06T00:03:00Z
  checked: WebSocket message handler for `live-session-update` at runtime-live-sync-core.js:924-960
  found: |
    The fast-path that calls applyLiveRuntimeSnapshot ONLY runs for these
    mutationTypes: STOP_ANIMATION_MUTATION_TYPE, "clear-all", "edit-room",
    "trigger-room", "align-corner-drag", "align-grid-snapshot".
    align-toggle is sent as `context-update` (stage-viewport.js:170 emits
    context-update with reason=align-toggle and alignMode=nextAlignMode).
    `context-update` is NOT in the fast-path list. So a context-update on
    SSR-tab does NOT trigger immediate applyLiveRuntimeSnapshot from the
    WebSocket message handler — it must come through the snapshot poll.
  implication: |
    On SSR-tab, the disable comes via snapshot poll (not the WS fast-path).
    The poll path also has the h44 eager apply (lines 188-205) which calls
    state.alignMode = nextAlign; syncAlignModePanel(). syncAlignModePanel
    fires onAlignModeChange via the _lastAlignModeState gate. This SHOULD
    work. But user logs say it doesn't fire on SSR-tab for disable.
    → Need to check whether SSR-tab's poll arrives at all, and whether
    the h44 eager apply path runs but the inner _lastAlignModeState gate
    rejects the call (e.g. _lastAlignModeState was already false from boot).

- timestamp: 2026-05-06T00:03:30Z
  checked: runtime-stage-viewport.js:46 _lastAlignModeState initialized to null
  found: |
    Module-private `let _lastAlignModeState = null;` (line 46).
    syncAlignModePanel:146 — `if (enabled !== _lastAlignModeState && typeof
    ctx.onAlignModeChanged === "function") { _lastAlignModeState = enabled;
    ctx.onAlignModeChanged(enabled); }`
    So onAlignModeChanged fires only on REAL transitions (null→true, true→false).
  implication: |
    For the SSR-tab disable: if `state.alignMode = true` was applied at boot
    (e.g. via live-hello with alignMode=true), then a SUBSEQUENT enable at
    user-click might be the FIRST `_lastAlignModeState !== enabled` transition
    (null → true), so onAlignModeChange(true) fires. But maybe `_lastAlignModeState`
    was already in some state that prevented the transition firing for disable.
    Need to verify state.alignMode initial value vs _lastAlignModeState.

- timestamp: 2026-05-06T00:04:00Z
  checked: receiver-bootstrap.js (Pi /output/) full file
  found: |
    Pi /output/ runs receiver-bootstrap.js (WebRTC consumer + input forwarder)
    AND ALSO runtime-orchestration.js with the full pipeline (per orchestration
    line 110-120 explicit "we do NOT return here" comment).
    receiver-bootstrap.js sets body.dataset.outputRole = "final-output" (line 57).
    No `?ssr=1`, so body.dataset.ssrTab is NOT set on Pi.
    CSS at styles.css:2303 then matches: `body[data-output-role="final-output"]:not([data-ssr-tab="true"]) #room-overlay { display: none !important }`.
    Pi's #room-overlay is unconditionally hidden. The line 119 align-mode-active
    rule has same specificity but appears earlier → loses cascade.
  implication: |
    What the user sees as "polygons on Pi" cannot be Pi's own #room-overlay —
    it's hidden by CSS. The user is seeing the SSR Chromium tab's #room-overlay
    encoded into the WebRTC stream. So all three bugs are about the SSR-tab's
    DOM state, not Pi's.

- timestamp: 2026-05-06T00:05:00Z
  checked: WS message handler for context-update fast-path (runtime-live-sync-core.js:924-960)
  found: |
    Fast-path apply list: STOP_ANIMATION_MUTATION_TYPE, "clear-all", "edit-room",
    "trigger-room", "align-corner-drag", "align-grid-snapshot".
    `context-update` is NOT in this list — align-toggle (which is sent as
    `context-update` reason="align-toggle") falls through to the generic
    `scheduleNextLiveSnapshotPoll(0)` at line 959. So both Pi AND SSR-tab
    rely on the snapshot poll to deliver align-toggle changes.
  implication: |
    Both Pi and SSR-tab use the same code path (snapshot poll → eager apply →
    applyLiveRuntimeSnapshot) for align-toggle. So a per-environment difference
    must explain why Pi fires onAlignModeChange(false) but SSR-tab doesn't.

- timestamp: 2026-05-06T00:05:30Z
  checked: order of paint/clear of polygons on enable
  found: |
    onAlignModeChange(true)'s h38 call to ctx.renderRoomOverlay() runs at the
    INSIDE of syncAlignModePanel's transition fire (line 148). At that moment:
    - syncAlignModePanel has set body class `align-mode-active` (line 137 — earlier than 146)
    - syncAlignModePanel has NOT YET set inline `roomOverlay.style.display = "block"`
      (that's at line 158-160 — AFTER the change-fire at 146-149)
    So when h38's renderRoomOverlay paints polygons inside #room-overlay, the
    SVG element's effective display style at that exact moment depends on
    whatever it was BEFORE syncAlignModePanel started. After the nested call
    returns, line 158 then sets display=block. Polygons should be visible.

    The slow path's line 757 ctx.renderRoomOverlay() is called UNCONDITIONALLY
    after syncAlignModePanel — at this point display=block is set. So even
    if h38's render was lost for some reason, line 757 should re-paint.

    Yet user observes Bug #1 (no polygons after enable on SSR-tab). Suggests
    EITHER:
    (a) board.rooms is empty at SSR-tab enable time (loadExternalBoardZones
        async hasn't returned yet, or returned empty rooms array), OR
    (b) something between line 374 (h44 hoist start) and line 757 throws on
        SSR-tab specifically, AND h38's render was painted but then cleared
        AGAIN before display:block was applied.

- timestamp: 2026-05-06T00:06:00Z
  checked: scheduleNextLiveSnapshotPoll heavy-interaction guard (runtime-snapshot-helpers.js:62)
  found: |
    `if (ctx.isHeavyInteractionActive()) { clear pollTimerId; return; }`.
    isHeavyInteractionActive checks `polygonDragActive || touchActive`. Neither
    is set during projection-handle drag (handle-drag never calls
    beginPolygonDragInteraction — only polygon-editor's room-vertex/area drags do).
  implication: |
    Heavy-interaction guard is irrelevant for normal align-mode handle drags.
    Both Pi and SSR-tab should poll normally during align-mode work. So this
    is NOT what's blocking SSR-tab disable propagation.

- timestamp: 2026-05-06T00:06:30Z
  checked: sequence of state.alignMode + _lastAlignModeState transitions on SSR-tab
  found: |
    Module-private `_lastAlignModeState` (runtime-stage-viewport.js:46) starts null.
    Per user's CDP logs: at boot, SSR-tab fires `onAlignModeChange enabled=false ssrTab=true`
    → _lastAlignModeState transitioned null → false.
    On user toggle ON: SSR-tab fires `onAlignModeChange enabled=true ssrTab=true`
    → transitioned false → true.
    On user toggle OFF: SSR-tab does NOT fire anything → either transition didn't
    fire, or syncAlignModePanel didn't run, or threw before line 146.
  implication: |
    For the disable transition to fail, ONE of these must be true on SSR-tab:
    (X) syncAlignModePanel was never called for the disable snapshot
    (Y) syncAlignModePanel was called but state.alignMode hadn't been set to
        false yet (so enabled=true, _lastAlignModeState=true → no transition)
    (Z) syncAlignModePanel threw BEFORE line 146

    User logs confirm enable WAS fired via the h44 hoist path (which sets
    state.alignMode then calls syncAlignModePanel). So that path works for
    enable. For disable, the same path SHOULD fire too — unless one of:
    - The eager-apply guard `nextAlign !== null` fails for disable on SSR-tab
      because pollSnap.alignMode is missing/undefined (server snapshot bug)
    - The poll itself stops/fails between enable and disable
    - applyLiveRuntimeSnapshot throws BEFORE the h44 hoist try block opens

- timestamp: 2026-05-06T00:07:00Z
  checked: AbortError stack at runtime-live-sync-core.js:259 — relation to bug #3
  found: |
    Line 259 column 22 is inside `controller.abort()` callback of setTimeout.
    The setTimeout fires at LIVE_COMMAND_TIMEOUT_MS=6500ms. So 6.5s after an
    emitLiveMutation POST started, if it hasn't completed, abort fires.
    The SSR-tab calls emitLiveMutation only via broadcastGridSnapshot
    (`align-grid-snapshot` mutations) — these are heavy during drag flood.
    The AbortError appearing right after disable suggests one in-flight
    align-grid-snapshot POST timed out.
  implication: |
    The AbortError is a side-effect of the drag flood, NOT the cause of bug #3.
    It does indicate the SSR-tab's communication with the server was strained
    around the disable moment. If the server queue was overloaded, the disable
    snapshot's WS broadcast might have been delayed, the poll might have been
    skipped, etc. But this is correlation not causation.

## Resolution

root_cause: |
  Three SEPARATE root causes that all manifest on SSR-tab's DOM (which is what Pi
  sees through the WebRTC stream — Pi's own #room-overlay is hidden by CSS at
  styles.css:2303 via `body[data-output-role="final-output"]:not([data-ssr-tab="true"]) #room-overlay { display: none !important }`).

  ===========================================================================
  ROOT CAUSE — BUG #1 (align-mode ON → no polygon outlines visible in stream)
  ===========================================================================

  CONTEXT: When user toggles ON, dashboard sends `context-update` with
  `alignMode:true`. Server bumps version, broadcasts `live-session-update`.
  SSR-tab's WS handler does NOT have a fast-path for context-update — it just
  schedules a snapshot poll (runtime-live-sync-core.js:959).
  The poll fetches snapshot, eager-applies alignMode (lines 188-205), runs
  syncAlignModePanel which fires onAlignModeChange(true) (verified by user logs).
  onAlignModeChange's enable branch on SSR-tab calls ctx.renderRoomOverlay()
  at line 1635 (h38 fix), then broadcasts grid (also verified by user logs).

  SO THE ENABLE PATH RUNS. WHY ARE POLYGONS NOT VISIBLE?

  CANDIDATE A (most likely): renderRoomOverlay paints polygons but they are
  CLEARED by a SECOND renderRoomOverlay call BEFORE display:block is set.
  Trace:
   1. h44 hoist's syncAlignModePanel runs.
   2. Inside, line 137 sets body.classList `align-mode-active` (true).
   3. Line 146-149: change-fire → onAlignModeChange(true) → ctx.renderRoomOverlay()
      paints polygons (state.alignMode=true → no early return).
   4. syncAlignModePanel resumes, line 158: sets `roomOverlay.style.display = "block"`.
   5. Slow path of applyLiveRuntimeSnapshot continues.
   6. Line 750: syncAlignModePanel called AGAIN. enabled=true, _lastAlignModeState=true
      → NO transition fire. Lines 158-160 set display=block (no-op).
   7. Line 757: ctx.renderRoomOverlay() called UNCONDITIONALLY. This calls
      `replaceChildren()` (clears DOM), state.alignMode=true so does NOT early
      return → re-paints polygons.

  Expected end state: polygons visible. But user says they aren't.

  CANDIDATE B: BOARDS catalog hasn't loaded yet. loadExternalBoardZones is async
  (runtime-zone-loader.js:33). If it hasn't returned by the time
  applyLiveRuntimeSnapshot runs, BOARDS is the initial CONFIG_BOARDS. If
  CONFIG_BOARDS has empty rooms or BOARDS got reset to [] (line 73 fallback
  on 404), then `board.rooms` is empty → renderRoomOverlay's loop appends
  nothing. THIS WOULD ALSO EXPLAIN BUG #2: after the first transform, additional
  renderRoomOverlay calls happen — by that time BOARDS may have loaded, and
  the polygons appear.

  CANDIDATE C: state.boardId mismatch. getBoard returns BOARDS[0] fallback
  if state.boardId doesn't match. If BOARDS[0]'s rooms are different from
  what user expects, the SVG polygons drawn don't match the visible board.
  (Unlikely root cause — the user would see SOME polygons, just wrong ones.)

  STRONGEST HYPOTHESIS for Bug #1: Candidate B (BOARDS not loaded yet at
  enable time on SSR-tab). Pi vs SSR-tab might race differently because
  SSR-tab is opened by puppeteer at server boot — its /api/boards request
  competes with the very first context-update apply. After a transform (which
  forces another renderRoomOverlay call later), BOARDS is loaded → polygons
  finally paint.

  ===========================================================================
  ROOT CAUSE — BUG #2 (outlines appear only AFTER first transformation)
  ===========================================================================

  Direct corollary of bug #1: the lazy paint after first transform is just
  the result of the next renderRoomOverlay() call (triggered by
  _redrawHandlesAfterCornerDrag at runtime-live-sync-core.js:57-58, OR by
  the slow path's line 757 during the next snapshot apply, OR by drag-end's
  line 311 in polygon-drag-support.js). By the time these later renders fire,
  BOARDS has loaded → polygons paint.

  ALTERNATIVELY: the polygon outlines may simply have been painted on enable
  but NOT VISIBLE because a CSS / display-style ordering issue cleared them
  visually (Candidate A). The first transform's renderRoomOverlay call lands
  AFTER all CSS / display-style transitions settle, so the polygons appear.

  ===========================================================================
  ROOT CAUSE — BUG #3 (align-mode OFF → outlines stay visible in stream)
  ===========================================================================

  This is THE clearest root cause and most directly fixable:

  The disable handler `onAlignModeChange(false)` at runtime-projection-handle-ui.js:1662-1667
  does NOT call renderRoomOverlay AT ALL on EITHER Pi or SSR-tab:
  ```
  } else {
    if (_isSsrChromiumTab()) return;   // SSR-tab: do nothing on disable
    hideHandles();                      // Pi: hide projection handles
    saveToLocalStorage();               // Pi: persist grid
  }
  ```

  SO the only chance for the polygons to be cleared from #room-overlay on
  disable is via the LATER renderRoomOverlay() call at runtime-live-sync-core.js:757
  (inside applyLiveRuntimeSnapshot's slow path, runs unconditionally). When
  that call runs with state.alignMode=false, renderRoomOverlay's:
   - Line 348: replaceChildren()  ← CLEARS DOM
   - Line 350: outputRole === FINAL && !alignMode → return  ← LEAVES OVERLAY EMPTY

  So if applyLiveRuntimeSnapshot's slow path completes for the disable, the
  DOM IS cleared. That clearing should fix bug #3.

  But user says it doesn't clear on SSR-tab. So either:
  (i) applyLiveRuntimeSnapshot is NEVER called for disable on SSR-tab (the
      snapshot poll skipped, or shouldApplyMutationEnvelope rejected, or
      the poll loop broke).
  (ii) applyLiveRuntimeSnapshot IS called but throws BEFORE line 757.
  (iii) applyLiveRuntimeSnapshot IS called and reaches line 757 but
      renderRoomOverlay throws inside.

  COMPELLING SECONDARY EVIDENCE FOR (i): The user observed that
  `onAlignModeChange enabled=false ssrTab=true` did NOT log on SSR-tab.
  That log is fired from inside onAlignModeChange (line 1611-1614).
  onAlignModeChange is called via syncAlignModePanel's transition fire
  (line 146-149 of stage-viewport.js). syncAlignModePanel is called
  from BOTH the h44 hoist (lines 374-389 of live-sync-core) AND the slow
  path's line 750. For the change-fire to NOT happen, either:
   - syncAlignModePanel was never called for the disable snapshot (= path (i)
     above, applyLiveRuntimeSnapshot never reached the hoist or the slow path
     line 750), OR
   - state.alignMode was already false when syncAlignModePanel ran (so
     enabled === _lastAlignModeState → no transition). The h44 hoist sets
     state.alignMode = nextAlign, BUT only if nextAlign !== null. If the
     disable snapshot's `alignMode` field is missing/undefined on the SSR-tab's
     received snapshot, the hoist becomes a no-op. State stays true. No transition.

  HYPOTHESIS — STRONGEST: The disable snapshot delivered to the SSR-tab via
  the snapshot poll has `alignMode: undefined` (not boolean). This makes
  the eager-apply guard fail (`typeof pollSnap?.alignMode === "boolean"` →
  false), state.alignMode stays true, no transition fires, no
  onAlignModeChange(false), no renderRoomOverlay clear, polygons stay visible.

  WHY MIGHT THIS HAPPEN ON SSR-TAB BUT NOT PI/DASHBOARD? They all hit the
  same /api/live/snapshot endpoint. If the snapshot is identical,
  Pi/Dashboard should also fail. Yet they DO fire onAlignModeChange(false)
  per user logs.

  ALTERNATIVE HYPOTHESIS — VERY PLAUSIBLE: The SSR-tab's snapshot poll is
  STALLED at the moment of disable. The 6.5s AbortError on
  /api/live/command (line 259) suggests the server was unresponsive
  for the SSR-tab around that moment. If the poll was in-flight on a
  request that timed out (or got starved by all the align-grid-snapshot
  POSTs the SSR-tab kept queuing), the disable snapshot never arrived
  → no apply → no transition. The fix would be to ensure SSR-tab applies
  the disable via the WS broadcast itself, not via deferred poll.

  CONCRETE FIX SHAPE for bug #3:
   (1) Add `context-update` to the WS fast-path apply list
       (runtime-live-sync-core.js:927-944) so the disable applies IMMEDIATELY
       on broadcast arrival, no poll dependency. OR
   (2) Add an explicit clear-call in onAlignModeChange's disable branch
       (handle-ui.js:1662-1667): make it call ctx.renderRoomOverlay() on
       disable just like the enable branch does (h38 symmetry). This
       handles the case when the transition fires but the slow-path
       line 757 doesn't reach (or as defensive belt-and-braces). OR
   (3) Both — (1) for fast disable propagation + (2) for guaranteed clear.

fix: |
  Pending user approval — three separate fixes recommended:

  FIX-A (Bug #3): In runtime-projection-handle-ui.js onAlignModeChange's
    `} else {` branch (line 1662), add `ctx.renderRoomOverlay?.()` AFTER
    the `_isSsrChromiumTab()` early-return-shortcut. This ensures BOTH Pi
    and SSR-tab clear their #room-overlay DOM symmetrically with the enable
    branch (which already calls renderRoomOverlay at line 1635 for h38).

  FIX-B (Bug #3 belt-and-braces): In runtime-live-sync-core.js, add
    `context-update` to the fast-path mutation type list at lines 927-944
    so context-update mutations apply immediately via WS, not via deferred
    poll. This eliminates the SSR-tab's race window where the poll is stalled.

  FIX-C (Bugs #1 + #2): Verify BOARDS catalog is loaded BEFORE the first
    onAlignModeChange call. Either:
    - Defer onAlignModeChange's renderRoomOverlay (h38) until BOARDS is
      populated (poll once-per-frame via requestAnimationFrame until
      BOARDS.length > 0 && BOARDS[0]?.rooms?.length > 0).
    - OR add explicit re-render to runtime-zone-loader.js after setBoards
      so any in-flight align-mode UI gets a fresh paint when BOARDS hydrates.

  All three fixes need separate verification — fix-A is the most surgical
  for bug #3, fix-C is needed for bugs #1+#2, fix-B reduces SSR-tab snapshot
  staleness as a bonus.

verification: |
  Pending — fixes not yet implemented. After implementation, repro with the
  same diagnostic logs (h45) to confirm:
  - Bug #1: enable → polygons visible IMMEDIATELY in WebRTC stream (no transform needed)
  - Bug #2: no lazy reveal — polygons either visible or not, no race
  - Bug #3: disable → polygons CLEAR from WebRTC stream within ~1 frame
  - SSR-tab logs show `[align-mode] onAlignModeChange enabled=false ssrTab=true`
    on EVERY disable

files_changed: []
  # On approval to fix:
  # - src/app/runtime/viewport/runtime-projection-handle-ui.js (FIX-A)
  # - src/app/runtime/live-sync/runtime-live-sync-core.js (FIX-B)
  # - src/app/runtime/live-sync/runtime-zone-loader.js (FIX-C)
