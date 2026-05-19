# Phase 49 — Dashboard CPU spike during Pi /output/ align-corner-drag

**Status:** root cause found, fix NOT applied (per request).
**Owner of next action:** operator review + apply fix.

## Operator symptom (German UAT, 2026-05-18)

> "Wenn ich im align mode in /output/ auf dem pi das board transformiere,
> hängt das dashboard bzw. die animationen dort und mein Rechner der
> aktuell nur das dashboard offen hat fängt mit dem Lüfter extrem an."

Dashboard (role=control) goes high CPU, animations stutter, while operator
drags align-mode handles on Pi /output/.

## Why gap-closure-27 (commit c868c75) did not fix it

The patch gated `shouldApplyImmediateStopSnapshot` and the follow-up
`scheduleNextLiveSnapshotPoll(0)` **inside the `live-session-update` WS
handler only**. The server emits **TWO** broadcasts per accepted
mutation (server.mjs:1718-1733):

1. `live-session-update` (carries snapshot)
2. `state-dirty` (with `wake: true`)

Gap-closure-27 covered the first one. The second one — `state-dirty` —
is handled in `runtime-live-sync-core.js:1213-1216` and is **ungated**:

```js
if (payload?.type === "state-dirty" || payload?.wake === true) {
  liveSync.dirtyHintUntil = Date.now() + 1500;
  ctx.scheduleNextLiveSnapshotPoll(0);
}
```

`scheduleNextLiveSnapshotPoll(0)` arms a `setTimeout(0)` to call
`pollLiveSnapshotOnce()`. `pollLiveSnapshotOnce` then fetches
`/api/live/snapshot` and unconditionally invokes
`applyLiveRuntimeSnapshot(envelope.snapshot, { mutationType: "snapshot-poll" })`
at line 206 — with **no role gate** and **no mutation-type filter**.

So my "live-session-update align-mutation gate" is correct but useless:
every align mutation still bumps the server's session version and emits
a `state-dirty`, which routes the dashboard straight through the polling
back-door into the same heavy `applyLiveRuntimeSnapshot`.

## Empirical evidence (Playwright instrumentation)

Test (`/tmp/dashboard-cpu-instrument.py`): launch a headless dashboard
tab against the live server on `:4173`, instrument `window.fetch`,
`window.setTimeout`, `requestAnimationFrame`, `PerformanceObserver`
(longtask), and WS framereceived. Then burst 30 valid `align-corner-drag`
mutations over 1 second via `POST /api/live/command` with `role="output"`
(simulating the Pi). Observation window: 1.0s burst + 3.0s afterwards.

### Result on master (with gap-closure-27 patch in place)

```
WS frames recv during burst+observe: 60
  live-session-update/align-corner-drag              30
  state-dirty/align-corner-drag                      30
fetch() calls:                  53
  /api/live/snapshot                                 53
setTimeout(<=400ms) calls:      83
  delay=   120ms                                     53
  delay=     0ms                                     30
requestAnimationFrame ticks:    713
longtask entries:               0
```

Interpretation:

- **30 `state-dirty` broadcasts** arrived during 1s drag = 30 Hz.
- **30 `setTimeout(0)` calls** queued — one per state-dirty (this is the
  smoking gun: line 1215 firing on every align broadcast on the dashboard).
- **53 `setTimeout(120ms)` calls** — the chained `LIVE_POLL_FAST_MS=120`
  cadence inside `pollLiveSnapshotOnce` keeps re-arming.
- **53 fetches to `/api/live/snapshot`** in 4s = ~13 Hz. Each fetch
  returns `changed: true` (version bumps 165→226 during the burst), so
  each one drives a full `applyLiveRuntimeSnapshot` apply.
- (`pollLiveSnapshotOnce calls: 0` in the result is an instrumentation
  artifact — the wrapper monkey-patched `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE.pollLiveSnapshotOnce`
  but `scheduleNextLiveSnapshotPoll` invokes the local closure-bound
  reference, not the exported one. The 53 `/api/live/snapshot` fetches
  prove polling is in fact running 53 times.)
- No `longtask` (>50ms) was observed in the headless test, but the
  operator's real machine has a busy dashboard rendering canvas
  animations; per-call work that costs ~3-8ms in isolation becomes 13
  Hz × multi-millisecond DOM rebuilds + GC pressure, easily enough to
  starve the main thread for the local `requestAnimationFrame` chain.

### What runs inside each applyLiveRuntimeSnapshot for role=CONTROL

`runtime-live-sync-core.js:342-800`. On every poll:

1. polygon hydration via `polygonContract.applySnapshotPolygonState`
   over all BOARDS (line 437-455).
2. `outsideFxByBoard` normalization across N boards (line 456-486).
3. `insideFxByBoard` normalization (line 487-497).
4. `roomFxByBoard` normalization (line 498-508).
5. running-animations reconciliation + prime-timestamps + retain-active
   (line 518-527).
6. `syncOutsideRuntimeMirror` (line 540-541).
7. `warmGifAssetPath` loop over running animations (line 547-552).
8. `enforceAudioLifecycleGuard` + `stopSoundsForInactiveAnimations` +
   `playSoundForAnimation` for every running animation (line 771-775).
9. **The dashboard-specific block (line 779-783):**
    - `ctx.syncRuntimePanelsFromState()` — full panel UI reconcile
    - `ctx.renderRunningAnimationsList()` — DOM rebuild of running list
    - `ctx.refreshGlobalButtons()`
10. `renderRoomOverlay()` (line 784) — DOM rebuild of room overlay.

At 13 Hz, every one of those calls runs even when nothing actionable
changed for the dashboard.

## Root cause (one sentence)

`state-dirty` broadcasts are emitted server-side for **every** mutation,
including high-rate `align-corner-drag` / `align-grid-snapshot`; the
dashboard's `state-dirty` handler unconditionally calls
`ctx.scheduleNextLiveSnapshotPoll(0)`, which back-doors the dashboard
into running the heavy `applyLiveRuntimeSnapshot` (with its dashboard-only
panel/list/overlay rebuilds) at ~13 Hz throughout the drag burst.

## Recommended fix

Two equally targeted options. **Recommend Option A** (single-line gate at
the consumer, mirrors gap-closure-27's strategy and is the cheapest to
review/test). Option B is the server-side complement that costs less
network/CPU but requires more careful reasoning about which clients
*actually need* state-dirty.

### Option A — gate `state-dirty` for align mutations on non-FINAL roles

**File:** `src/app/runtime/live-sync/runtime-live-sync-core.js`
**Lines:** 1213-1216

Replace:

```js
if (payload?.type === "state-dirty" || payload?.wake === true) {
  liveSync.dirtyHintUntil = Date.now() + 1500;
  ctx.scheduleNextLiveSnapshotPoll(0);
}
```

With:

```js
if (payload?.type === "state-dirty" || payload?.wake === true) {
  liveSync.dirtyHintUntil = Date.now() + 1500;
  // Phase 49 gap-closure-28 (2026-05-18): mirror gap-closure-27 here.
  // The align-corner-drag / align-grid-snapshot mutations fire 30-120 Hz
  // during operator drag. Per-mutation state-dirty broadcasts wake every
  // client's poll loop into pollLiveSnapshotOnce → applyLiveRuntimeSnapshot
  // (line 206) — which on role=control rebuilds runtime panels, the
  // running-animations list, global buttons, and the room overlay. With
  // gap-closure-27 the LIVE-SESSION-UPDATE path is gated to FINAL for
  // align mutations, but the STATE-DIRTY path back-doors right into the
  // same heavy apply via the polling fallback. Gate it here too:
  // non-FINAL roles SKIP the immediate re-poll for align mutations.
  // The dashboard's grid stays out of sync during the remote drag — fine,
  // because the dashboard is not the renderer; the next non-align mutation
  // or the next periodic idle poll (250 ms) will resync it.
  const mutationTypeForDirty =
    typeof payload?.mutationType === "string" ? payload.mutationType : null;
  const isAlignMutationForDirty =
    mutationTypeForDirty === "align-corner-drag"
    || mutationTypeForDirty === "align-grid-snapshot";
  const isFinalRoleForDirty = ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL;
  if (!isAlignMutationForDirty || isFinalRoleForDirty) {
    ctx.scheduleNextLiveSnapshotPoll(0);
  }
}
```

Rationale:

- **Surgical** — only the two known high-rate align mutations on non-FINAL
  roles are affected; every other mutation type continues to wake the
  poll loop normally on every client.
- **Symmetrical** with gap-closure-27 (lines 1022-1028) which uses the
  same `(!isAlignMutation || isFinalRole)` gate for its scheduleNextPoll.
- **Server-side state-dirty broadcast is unchanged** — other clients
  (control on other machines, e.g. mobile, future ops UI) still get the
  wake hint and decide locally whether to act. Pi /output/ (FINAL) still
  re-polls (which is what carries `lastAlignGridSnapshot` into its
  grid on the rare fallback paths).
- The fast-path eager-applies at lines 1045-1142 + 1150-1212 are already
  FINAL-only (`ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL`), so the
  dashboard genuinely needs nothing from these broadcasts.

### Option B — suppress `state-dirty` broadcast for align mutations server-side

**File:** `server.mjs`
**Lines:** 1726-1733

Wrap the `broadcastLiveSession("state-dirty", ...)` in a conditional that
excludes align mutations:

```js
if (next.mutationType !== "align-corner-drag"
    && next.mutationType !== "align-grid-snapshot") {
  broadcastLiveSession("state-dirty", {
    mutationType: next.mutationType,
    mutationId: next.mutationId,
    version: mutationResult.version,
    wake: true,
  }, {
    finalFirst: true,
  });
}
```

Saves network traffic (no `state-dirty` sent for the 30+ Hz mutations) AND
ensures NO consumer ever wakes the poll loop on these. Downsides:

- Server change — needs a server restart to deploy.
- Removes the wake hint *globally* — any future client that needs to
  poll-respond to align mutations would also have to re-add the wake.
  Currently no such consumer exists, so this is fine.
- Slightly harder to audit (the consumer-side gate at the same line as
  gap-closure-27 is more visible to future readers).

### Why I lean Option A

- One-file change, no server restart needed.
- Mirrors gap-closure-27 exactly — same file, same gate expression, same
  reviewer mental model.
- If a future mutation needs the same treatment, the pattern is now
  documented in two places (the `live-session-update` and `state-dirty`
  handlers) in the same idiom.

## Caveats / things to verify after applying

1. **`dirtyHintUntil` is still set**: even with the poll-skip, `liveSync.dirtyHintUntil`
   still bumps to `now+1500ms`. This keeps the dashboard in "fast-mode"
   polling for ~1.5s after the burst settles. That's correct — the *next*
   non-align mutation should be picked up promptly. The dashboard's idle
   poll at 250ms intervals also still runs.

2. **Dashboard align-mode UI when *dashboard* enters align mode**: the
   dashboard's own align mode handles `align-corner-drag` events locally
   via `runtime-projection-handle-ui.js`; broadcast back from Pi is not
   needed for the originator. Cross-client (dashboard A enters align
   mode while dashboard B is also open) is rare; if it ever matters the
   periodic idle poll (250ms) catches up within one tick.

3. **Re-verify with the same Playwright test after applying the fix.**
   Expected post-fix counters during the same 30-drag 1s burst:
   - `state-dirty/align-corner-drag` recv: still 30 (server still sends)
   - `setTimeout(0)` calls: 0 (gated)
   - `/api/live/snapshot` fetches: ≤ 5 (only the idle-cadence polls
     during the 4s window)

4. **Server log noise**: the server's `[align-grid-snapshot] server-recv`
   per-broadcast log line (server.mjs:1255-1262) still fires. Unchanged
   and unrelated.

5. **Other clients (mobile, future tablet)**: any client that depends on
   prompt grid sync without being role=output should reconsider when this
   becomes an issue. As of phase 49 there is only role=control (dashboard)
   and role=output (Pi /output/ + SSR Chromium tab).

## How to reproduce the test

```bash
# Server must be running on :4173 (already up via start.ps1 in operator's stack).
python3 /tmp/dashboard-cpu-instrument.py \
    --port 4173 --burst-count 30 --burst-window-s 1.0 --observe-after-s 3.0
```

The instrumentation script source: `/tmp/dashboard-cpu-instrument.py`
(committed nowhere; transient diagnostic artifact, can be deleted after
fix verifies).
