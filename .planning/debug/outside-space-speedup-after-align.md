---
status: diagnosed
trigger: "Outside-space coded animation runs faster after any align-mode geometry change (even just panning the board, no distortion). Speed should be identical across all clients per Animations-Editor setting and unchanged by transforms."
created: 2026-05-05T07:26:00Z
updated: 2026-05-05T11:30:00Z
---

## Current Focus

hypothesis: |
  REFINED ROOT CAUSE — h2 fix is a SILENT NO-OP due to a wiring gap.

  The diagnosis from the original investigation (mirror-missing on /output/
  after applyLiveRuntimeSnapshot wipe) remains correct. The h2 commit
  (af6db45) added the rebuild call:

      if (typeof ctx.syncOutsideRuntimeMirror === "function") {
        ctx.syncOutsideRuntimeMirror(state.boardId);
      }

  inside applyLiveRuntimeSnapshot at runtime-live-sync-core.js:359-361.
  HOWEVER the live-sync-core.init({...}) call at runtime-orchestration.js:455
  does NOT inject `syncOutsideRuntimeMirror` into ctx. So the typeof guard
  evaluates to false on every snapshot apply, and the fix never actually
  runs. The mirror is wiped at line 346 and never rebuilt — exactly the
  pre-h2 state.

  After the user's pan on /output/, dirty=false→true → POST
  /api/align-mode-dirty → server bumps liveSessionState.version + broadcasts
  global-config-update. /output/'s next poll sees the new version, runs
  applyLiveRuntimeSnapshot, wipes runningAnimations (server has no mirror),
  the broken h2 line is skipped, mirror stays missing. drawOutsideFxLayer's
  pickInstance("speed", def.speed) falls back from 1 to the user's slider
  value (e.g. 0.5) → /output/ runs slower than dashboard (the new
  symptom, opposite of the original "faster" because the user has the
  slider below 1x now).

  Why dashboard remains at speed=1: dashboard runs LOCAL_EDIT_FIELDS
  preservation (live-sync-core.js:377-389, gated to OUTPUT_ROLE_CONTROL)
  which copies the previous animation's `speed` field onto the freshly-
  replaced list. Even before h2, dashboard never lost speed=1 because the
  preservation block protected it. Additionally dashboard runs
  syncRuntimePanelsFromState at line 426-430 (gated to non-FINAL) which
  calls switchBoard → syncOutsideRuntimeMirror via switchBoard's
  unconditional call at runtime-board-switch.js:127. That path is wired
  through TT_BEAMER_RUNTIME_PANELS (insideOutside.syncOutsideRuntimeMirror
  at runtime-fx-panels.js:57), entirely separate from the live-sync-core
  ctx — so it works regardless of the wiring gap.

  ESC vs pan asymmetry on /output/: both fire global-config-update via
  /api/align-mode-dirty (dirty 1→0 vs 0→1). On /output/, the broadcast
  handler at line 525-577 takes the else branch (localConfigDirty=false
  on /output/, suppressBroadcastReapply=false), which schedules an async
  refetch of /api/global-defaults and on success calls
  applyGlobalDefaultsPayloadToState + syncRuntimePanelsFromState. The
  syncRuntimePanelsFromState path on /output/ DOES rebuild the mirror
  via switchBoard → syncOutsideRuntimeMirror (TT_BEAMER_RUNTIME_PANELS
  bus, unaffected by the live-sync-core ctx gap). So the broadcast path
  IS rebuilding the mirror — but only briefly. The next applyLiveRuntime
  Snapshot poll (triggered by the bumped version) wipes runningAnimations
  again, and h2 is skipped (silent no-op), so the mirror is gone again
  until the next global-config-update.

  The user's perceived asymmetry (ESC=sync, pan=desync) probably comes
  down to which event the user observes immediately after: ESC triggers
  the broadcast → mirror rebuilt → user looks → speeds match. Then a
  poll fires → mirror wiped → user pans → another broadcast → rebuild,
  but in between user's eye catches the wiped state and reads it as
  "desynced after pan". The asymmetry is observation timing, not a
  fundamental difference in the two flows. The actual defect is constant:
  /output/'s mirror oscillates between present (briefly, after each
  global-config-update) and absent (after every poll), because h2 doesn't
  cover the poll-driven rebuild.

  Until the ctx is wired, /output/'s mirror is unstable.

test: Confirmed by reading runtime-orchestration.js:455-515 init block (no
  syncOutsideRuntimeMirror entry).
expecting: N/A — diagnosed.
next_action: Apply Fix v3 (see Resolution.fix below).

## Symptoms

expected: |
  Outside-space coded animation parallax stars run at a constant velocity
  determined ONLY by the Animations-Editor speed setting, identical across
  all clients (dashboard preview, /output/), unchanged by any align-mode
  geometry transformation (panning, distorting projection grid).

actual: |
  After any align-mode geometry change on the board (even just panning, no
  distortion), the outside-space stars start moving FASTER on /output/.
  The speedup persists. Even just a single pan with no distortion is enough.
  Speed is wrong — should be invariant under transforms.

errors: No JS errors reported.

reproduction: |
  1. Open /output/?board=<id> with outside-space coded FX (parallax stars) running.
  2. Note baseline star velocity.
  3. From dashboard, enter align mode.
  4. Pan the projection grid (drag) — no distortion needed, just translate.
  5. Exit align mode / commit.
  6. Observe stars on /output/: they now move faster than baseline.

started: |
  Phase 28 (cross-cutting UX & state polish). Possibly related to commit
  9c9c232 (28-h1: gate per-board auto-load on actual board switches), but
  the bug may predate it. User reports: "Mir ist noch ein weiterer Bug...
  aufgefallen" — discovered now while testing 28-h1 fix.

## Eliminated

- hypothesis: A — state.animationSpeed gets stacked on snapshot apply
  evidence: |
    applyGlobalDefaultsPayloadToState (global-defaults.js:417-419) and
    applyLiveRuntimeSnapshot (live-sync-core.js:382) OVERWRITE state.animationSpeed
    with payload.animationSpeed, no multiplication. Buildling the payload uses
    buildPersistedRuntimeSettingsFromState which writes the current state.animationSpeed
    via clampAnimationSpeed. Round-trip is idempotent. No stacking.
  timestamp: 2026-05-05

- hypothesis: C — lifecycle key changes cause speedup
  evidence: |
    buildOutsideLifecycleKey (outside-mp4.js:147-164) only includes asset identity
    (boardId, definition.id, assetType, assetRef, mode, direction). Doesn't include
    speed/intensity. Lifecycle key only changes on asset/mode/direction edits.
    A pan does not change any of these. Even if it did, key change resets startedAt
    to NOW → elapsed=0 → JUMP BACK, not speedup. Symptom doesn't match.
  timestamp: 2026-05-05

- hypothesis: D — multiple rAF loops accumulating
  evidence: |
    Single draw loop kicked from runtime-bootstrap.js:299 (one-shot init).
    draw self-reschedules at draw-loop.js:668. startDrawLoop (line 706) is
    exported but never invoked. Other rAF chains are independent and don't
    call drawOutsideFxLayer. Confirmed one rAF chain.
  timestamp: 2026-05-05

- hypothesis: E — canvas dimension change post-transform
  evidence: |
    `w = canvas.width` only enters progressRaw as `seedX*(w+8)` initial offset
    and the `(w+8)` modulus wrap-around — neither controls velocity (= age*layerSpeed).
    A change in `w` produces a one-time discontinuity but unchanged pixels-per-second.
    Doesn't match "permanent speedup". applyStageViewportRecompute only fires on
    CSS dim/DPR/pixel change — not triggered by a projection grid pan.
  timestamp: 2026-05-05

- hypothesis: F (per-orchestrator wording) — syncOutsideRuntimeMirror has
  side-effects on running mirror's animation properties
  evidence: |
    syncOutsideRuntimeMirror's no-op return path (line 655) does NOT modify
    the existing running mirror. The function only creates/swaps/removes —
    never mutates an existing entry's intensity/speed/etc. Hypothesis as stated
    is refuted. HOWEVER the *related* observation that the mirror gets DROPPED
    on /output/ between snapshot applies (and never recreated due to gating) is
    the actual root cause — see Evidence below.
  timestamp: 2026-05-05

## Evidence

- timestamp: 2026-05-05
  checked: |
    Velocity formula in runtime-effect-visuals.js:82-138 (outside-space branch)
    + draw-loop.js:442-501 (drawOutsideFxLayer)
    + fx-normalizers.js:390-396 (resolveOutsideTimeline)
    + outside-mp4.js:166-179 (resolveOutsideElapsedSeconds)
  found: |
    Visible velocity (pixels/sec) for outside-space stars:
      v ∝ state.animationSpeed * effectiveSpeed * (0.75 + effectiveSpeed*0.45)
        * (immersive ? 1.45 : 1) * layer.speed * (0.8 + intensity*0.75)
    where effectiveSpeed appears TWICE (linearly in `age`, then again inside
    `speedFactor`), giving roughly quadratic dependence on effectiveSpeed.
    Going from effectiveSpeed=1 to effectiveSpeed=1.5 multiplies v by ~1.78x.
  implication: |
    A change in effectiveSpeed from 1 → definition's slider value (>1) is a
    massive visible speedup, exactly matching the user's "wird dann schneller"
    description. Identifying which factor moves is essential.

- timestamp: 2026-05-05
  checked: |
    drawOutsideFxLayer pickInstance (draw-loop.js:432-437) +
    syncOutsideRuntimeMirror's createAnimation call
    (runtime-fx-panels-inside-outside.js:620-627, 633-641)
  found: |
    `effectiveSpeed = Number(pickInstance("speed", selectedDefinition.speed))`
    `pickInstance(key, fallback) = runningInstance?.[key] ?? fallback` (with
    null/undefined/empty-string filter).
    syncOutsideRuntimeMirror creates the mirror with:
      ctx.createAnimation({
        boardId, type, scope: "global",
        intensity: 1,                         // HARDCODED to 1
        hold: true, durationSec: 0,
      })   // no `speed` passed → createAnimation default = 1, clamped to 1
    So when the running mirror exists: runningInstance.speed = 1
    (numeric, defined, valid) → pickInstance returns 1 →
    effectiveSpeed = 1, regardless of the editor's speed slider.

    When the running mirror is MISSING: runningInstance = null →
    pickInstance returns the fallback `selectedDefinition.speed` →
    effectiveSpeed = definition's slider value (e.g. 1.5).
  implication: |
    Whether the mirror exists or not toggles effectiveSpeed between 1 (mirror
    present) and definition.speed (mirror missing). If the user has set the
    Animations-Editor speed slider to anything ≠ 1, the visual velocity will
    differ between these two states. This is the only known mechanism that
    produces a permanent (not just position-jump) speedup with the symptoms
    the user reports.

- timestamp: 2026-05-05
  checked: |
    Server snapshot path:
      server.mjs:316-318 reconcileSnapshotRunningAnimations
      server.mjs:414-432 trigger-room/edit-room runningAnimations updates
    Outside mirror creation path:
      runtime-fx-panels-inside-outside.js:620-628 — pushes onto local
      state.runningAnimations only; NEVER calls emitLiveMutation
    Snapshot apply path on /output/:
      live-sync-core.js:346 — state.runningAnimations REPLACED with
      hydrated server-supplied list
      live-sync-core.js:362 — LOCAL_EDIT_FIELDS preservation gated to
      `OUTPUT_ROLE_CONTROL` only (NOT applied on /output/)
      live-sync-core.js:411 — syncRuntimePanelsFromState gated to
      !OUTPUT_ROLE_FINAL (NOT called on /output/)
  found: |
    1. The outside running mirror is created LOCALLY on each client by
       syncOutsideRuntimeMirror — it is never broadcast via emitLiveMutation.
    2. Server's runtime.runningAnimations does NOT include the mirror entry
       (server only learns of animations via trigger-room/edit-room/etc).
    3. When /output/ applies any snapshot (poll, live-session-update),
       state.runningAnimations is REPLACED with the server's mirror-less list.
    4. After replacement on /output/, syncRuntimePanelsFromState is NOT called
       (gated to non-FINAL roles), so syncOutsideRuntimeMirror is NOT invoked
       to recreate the mirror.
    5. ⇒ /output/'s mirror is GONE after every snapshot apply, until either:
       (a) a global-config-update arrives (which does call syncRuntimePanels…
           via the line-547 unconditional branch), or
       (b) the user toggles outside off/on from the dashboard, generating an
           outside-update mutation.
    6. While the mirror is missing on /output/: pickInstance("speed", def.speed)
       falls through to the DEFINITION's speed slider value.
  implication: |
    THIS IS THE ROOT CAUSE. /output/ runs without the mirror most of the time
    after the first snapshot apply. effectiveSpeed = definition.speed instead
    of 1. If user has set the editor speed slider to e.g. 1.5x, /output/'s
    stars run ~1.78× faster than dashboard's, persistently.

    The "manchmal" (sometimes) qualifier matches: this only manifests when
    the user has set definition.speed away from 1.0. The "after a transform"
    correlation is incidental — any mutation that bumps the snapshot version
    (or any periodic poll while the user has been making changes) drops the
    mirror on /output/. The pan itself doesn't directly trigger this; it's
    the next snapshot apply on /output/ that does.

    Note: dashboard is NOT affected the same way because applyLiveRuntimeSnapshot
    on CONTROL DOES call syncRuntimePanelsFromState (line 412), which calls
    switchBoard → syncOutsideRuntimeMirror → recreates the mirror within the
    same apply tick. So the dashboard's effectiveSpeed stays at 1 (instance value).

- timestamp: 2026-05-05
  checked: |
    Why "always faster, never slower"
  found: |
    Visible velocity v ∝ effectiveSpeed * (0.75 + effectiveSpeed * 0.45).
    For effectiveSpeed ∈ [0.3, 2.5] (clampOutsideSpeed range):
      v(0.3) ∝ 0.3 * 0.885 = 0.265   (slower than v(1)=1.2)
      v(1.0) ∝ 1.0 * 1.20  = 1.2
      v(1.5) ∝ 1.5 * 1.425 = 2.14    (1.78× faster than v(1))
      v(2.5) ∝ 2.5 * 1.875 = 4.69    (3.91× faster than v(1))
    The user reports faster — implies they've set definition.speed > 1.
    A user who set speed < 1 would see /output/ slower than dashboard,
    and they'd report a slowdown. The user just happened to test with a
    speed > 1.

- timestamp: 2026-05-05
  checked: |
    The other Live Editor path: applyLiveEditorValue mutates
    runningAnimations[i].field directly (runtime-lifecycle-state.js:75)
  found: |
    Live Editor only fires when liveEditorAnimationId is set (an animation is
    being edited). When the user is just panning the projection grid, no Live
    Editor is open. So this path is irrelevant to the bug.

    But this path IS why LOCAL_EDIT_FIELDS preservation exists on CONTROL
    (line 362) — so dashboard-side Live Editor edits aren't lost when a
    server snapshot replaces runningAnimations. The fact this preservation
    is gated to CONTROL is correct for the Live Editor case but creates the
    asymmetry that causes this outside-mirror bug.

- timestamp: 2026-05-05T11:30:00Z
  checked: |
    Re-verifying h2 fix (commit af6db45) post-deploy.
    runtime-live-sync-core.js:359-361 (the h2 added lines).
    runtime-orchestration.js:455-515 (live-sync-core init({...}) call site).
  found: |
    h2 added:
      if (typeof ctx.syncOutsideRuntimeMirror === "function") {
        ctx.syncOutsideRuntimeMirror(state.boardId);
      }
    in applyLiveRuntimeSnapshot. The init({...}) block at lines 455-515 of
    runtime-orchestration.js does NOT include `syncOutsideRuntimeMirror`
    among its 60+ injected ctx properties. Only `syncRuntimePanelsFromState`
    (line 503), `applyGlobalDefaultsPayloadToState` (line 512), etc.

    Verified by:
      awk '/window\.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE\.init\(\{/,/^\}\);/' \
        runtime-orchestration.js | grep -i "syncOutside"
    → empty output.
  implication: |
    h2 IS A SILENT NO-OP. The typeof guard returns false on every snapshot
    apply because ctx.syncOutsideRuntimeMirror is undefined. The h2 commit
    forgot to update the ctx-injection block — only the call site was
    edited. This is the wiring gap. The pre-h2 root cause stands;
    /output/'s mirror is still wiped at line 346 and never rebuilt by
    applyLiveRuntimeSnapshot.

- timestamp: 2026-05-05T11:30:00Z
  checked: |
    Why dashboard remains unaffected.
    runtime-board-switch.js:127 (switchBoard's unconditional
    syncOutsideRuntimeMirror call).
    runtime-fx-panels.js:57 (TT_BEAMER_RUNTIME_PANELS bus injection
    of insideOutside.syncOutsideRuntimeMirror into the panels controller).
    runtime-panels-controller.js:44 (syncRuntimePanelsFromState's
    switchBoard(state.boardId, ...) call).
  found: |
    Dashboard rebuilds the mirror via:
      applyLiveRuntimeSnapshot → (line 426-430, gated to non-FINAL)
      → syncRuntimePanelsFromState → switchBoard(sameId)
      → syncOutsideRuntimeMirror

    This path is wired via TT_BEAMER_RUNTIME_PANELS, NOT via the live-sync-
    core ctx. So it is unaffected by the live-sync-core ctx wiring gap.
    Dashboard's mirror is rebuilt within the same apply tick.

    /output/ is gated OUT of this path at line 426. h2 was supposed to
    cover the gap by calling syncOutsideRuntimeMirror inline, but its ctx
    is missing the injection.
  implication: |
    The fix needs to add `syncOutsideRuntimeMirror` to the live-sync-core
    init block. That single change is sufficient — h2's call site is
    correct, only the wiring is missing.

- timestamp: 2026-05-05T11:30:00Z
  checked: |
    The user-reported new symptoms: "/output/ slower than dashboard;
    pan→ESC syncs them; pan again desyncs."
    Cross-referenced against the global-config-update WS handler
    (runtime-live-sync-core.js:525-577) and the dirty-flag broadcast
    (server.mjs:1753-1779).
  found: |
    Pan and ESC both flip the alignModeDirtyOnOutput flag (0→1 and 1→0
    respectively) and produce identical broadcasts. On /output/, the
    handler at line 525-577 takes the else branch and runs
    applyGlobalDefaultsPayloadToState + syncRuntimePanelsFromState +
    renderRunningAnimationsList + refreshGlobalButtons. The
    syncRuntimePanelsFromState path on /output/ DOES call switchBoard →
    syncOutsideRuntimeMirror via the panels-controller bus, so the
    mirror IS rebuilt during this handler.

    BUT: the handler's effects are short-lived. Each broadcast also
    bumps liveSessionState.version, which triggers the next poll to
    apply the new snapshot via applyLiveRuntimeSnapshot. That poll
    wipes runningAnimations (line 346), and h2 is skipped (the wiring
    gap), so the mirror is gone again. The mirror oscillates: present
    immediately after global-config-update broadcast, absent after the
    next poll.

    The user's perception of pan=desync, ESC=sync is therefore
    observation-timing dependent — not a fundamental difference between
    pan and ESC code paths. Both events transit the same pipeline.
  implication: |
    Until the wiring is fixed, /output/ will visibly oscillate around
    every pan/ESC. After the fix, both paths converge correctly because
    h2 covers the poll-driven wipe.

## Resolution

root_cause: |
  The outside running mirror animation (the entry in state.runningAnimations
  that drives drawOutsideFxLayer) is created LOCALLY on each client by
  syncOutsideRuntimeMirror — it is NEVER broadcast to the server via
  emitLiveMutation. Therefore:

  - Server.runtime.runningAnimations never contains this mirror entry.
  - On /output/, every snapshot apply replaces state.runningAnimations with
    the server's mirror-less list (live-sync-core.js:346).
  - On /output/, syncRuntimePanelsFromState is gated off after snapshot apply
    (live-sync-core.js:411), so syncOutsideRuntimeMirror does NOT run to
    recreate the missing mirror.
  - Result: /output/ runs without the mirror for the duration between snapshot
    poll/apply cycles.

  The draw-time fallback in drawOutsideFxLayer is:
    pickInstance("speed", selectedDefinition.speed) ⇒ definition.speed
  when the running instance is null. The mirror, when present, is created
  with the default speed=1. So:
    - Mirror present  ⇒ effectiveSpeed = 1 (instance value)
    - Mirror missing  ⇒ effectiveSpeed = definition.speed (slider value)

  Since the visible star velocity scales roughly quadratically in effectiveSpeed,
  setting the Animations-Editor speed slider to e.g. 1.5x produces ~1.78× faster
  stars on /output/ than on dashboard, persistently after the first snapshot
  apply on /output/.

  Dashboard is not affected because applyLiveRuntimeSnapshot DOES call
  syncRuntimePanelsFromState on CONTROL (line 412), which recreates the
  mirror within the same apply tick.

  The "after align-mode transformation" correlation is incidental — the user
  notices the bug when /output/'s stars look mismatched with the dashboard's,
  and associates it with their last action (the pan). The actual trigger is
  the next snapshot poll/live-session-update arriving on /output/, which
  drops the mirror.

  This bug WILL also manifest without any align-mode transform — for
  example, after triggering and stopping any room animation (which sends a
  trigger-room mutation, server bumps version, /output/ polls, replaces
  runningAnimations, drops mirror). The user just hasn't noticed it in
  those flows because the room animation drew attention away from the
  outside-space stars.

fix: |
  Fix v3 (the actual fix — h2 was a silent no-op due to wiring gap):

  Add ONE line to runtime-orchestration.js inside the
  window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE.init({...}) call (between
  line 455 and line 515), injecting `syncOutsideRuntimeMirror` into
  the live-sync-core ctx so h2's `typeof ctx.syncOutsideRuntimeMirror
  === "function"` guard at runtime-live-sync-core.js:359-361 actually
  evaluates true:

      syncOutsideRuntimeMirror: (boardId) => syncOutsideRuntimeMirror(boardId),

  After this single addition, h2's call at line 360 of live-sync-core
  will execute on every applyLiveRuntimeSnapshot — including the
  poll-driven applies that triggered the bug. The mirror will be
  rebuilt within the same apply tick that wipes runningAnimations,
  closing the window where /output/ renders without it.

  This is a one-line fix to runtime-orchestration.js. No changes are
  needed to runtime-live-sync-core.js (h2's call site is already
  correct) or to runtime-fx-panels-inside-outside.js (the function
  is already exported and idempotent).

  Verification plan:
  1. Manual: open /output/ alongside dashboard with outside-fx enabled
     and slider != 1.0. Verify both show identical star velocity at
     baseline.
  2. Pan the projection grid on /output/ → observe /output/'s
     star velocity stays IDENTICAL to dashboard (no slowdown / speedup,
     no oscillation).
  3. ESC discard → repeat #2.
  4. Trigger and stop a room animation → outside-fx velocity should
     remain in sync (the older non-align-mode manifestation of the
     same bug).

  Why h2's design was correct but its wiring was missed: h2 added the
  call site but the developer (the previous gsd-debug session) didn't
  notice that runtime-live-sync-core.js's ctx is populated explicitly
  via init({...}) — not auto-injected. The 60+ properties listed
  there form an explicit injection contract; adding a new ctx.X call
  silently fails until X is added to the init block. Future ctx
  additions to live-sync-core need to update both files.

  Side note: the original h2 commit message claims "syncOutsideRuntime
  Mirror is idempotent (returns false when the mirror already matches)"
  — that's true, but irrelevant given the fn is never called.
verification: |
  Pending. Awaiting Fix v3 application + manual verification on user's
  setup. After fix is applied, the speeds should remain locked across
  all pan/ESC/profile-load/room-animation events.
files_changed: []
