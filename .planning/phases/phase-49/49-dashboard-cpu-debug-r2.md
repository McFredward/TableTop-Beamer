# Phase 49 — Dashboard CPU spike during align-corner-drag, round 2

**Status:** root cause found (different from round 1), fix NOT applied.
**Owner of next action:** operator review + apply fix.
**Predecessor:** `.planning/phases/phase-49/49-dashboard-cpu-debug.md` (round 1).

## Operator symptom (round 2 UAT, 2026-05-18)

> "Gerade den heavy load im dashboaed vertestet, leider immer noch hier
> das selbe Ergebnis, wenn ich etwas trasnformiere oder das board hin
> und her verschiebe ist auf dem gerät auf dem nur das dashboard läuft
> (nicht der server mit SSR) deutlich höhere CPU last und die ANimationen
> hängen. Da hier nicht der SSR server lädt, kann ich mir das nicht
> erklären, das sollte nicht sein!"

Even after gap-closure-27 + gap-closure-29, the dashboard tab on the
operator's *separate, no-server* machine still spikes CPU and visibly
stutters its own rAF animations during a remote /output/ align-drag burst.

## Round 1 fixes and what they did/didn't change

| commit | scope | effect on dashboard during align burst |
|---|---|---|
| `c868c75` gap-closure-27 | gate `live-session-update` heavy-apply + immediate poll re-arm for `align-*` on non-FINAL roles | eliminated immediate-apply through the WS broadcast path |
| `10eac9a` gap-closure-29 | gate `state-dirty` → `scheduleNextLiveSnapshotPoll(0)` for `align-*` on non-FINAL roles | eliminated the immediate 0ms re-arm back-door |

Both patches are confirmed present in `src/app/runtime/live-sync/runtime-live-sync-core.js` (lines 987–1028 and 1213–1237). Empirical re-measurement (below) shows the gates work as designed — zero `setTimeout(0)` are armed by the `state-dirty` handler under a 30-mutation burst. **The bug is somewhere else.**

## Empirical measurement (round 2)

Tooling: `/tmp/dashboard-cpu-instrument-r2.py` — headless Playwright dashboard tab against the live server on `:4173`, wraps `window.fetch` + `window.setTimeout` + `PerformanceObserver(longtask)` + `requestAnimationFrame`, then bursts 30 `align-corner-drag` mutations over 1 s via `POST /api/live/command` (role=output). 4 s observation window.

### Test A: 30-mutation align-drag burst (with gap-closure-29 deployed)

```
WS frames recv during burst+observe: 60
  live-session-update/align-corner-drag              30
  state-dirty/align-corner-drag                      30
fetch() calls:                  30
  /api/live/snapshot                                 30
setTimeout(<=400ms) calls:      30
  delay=   120ms                                30
                                                # delay=0 calls: 0 (gates working)
requestAnimationFrame ticks:    725
longtask entries:               0
Observation window: 1.0s burst + 3.0s after = 4.00s
```

vs. round 1 result (pre-gap-closure-29) for the same test:

```
fetch() calls:                  53     # 53 polls -> 53 applies
setTimeout calls:               83     # 30 at delay=0 + 53 at delay=120
```

So gap-closure-29 cut the **incremental** poll re-arms (the 30 at delay=0), reducing total polls from 53 → 30 in 4 s. The drop is real (~13 Hz → ~7.5 Hz of `/api/live/snapshot` polls during burst+observe).

**But the dashboard is still polling at 7.5 Hz on every test**, and every poll returns `changed: true` because the server's version has advanced (line 213-227 of `pollLiveSnapshotOnce`), so every poll runs the full `applyLiveRuntimeSnapshot`.

### Test B: completely idle dashboard, NO mutations at all

To isolate the source of the polling cadence, I ran a baseline probe — `/tmp/dashboard-baseline-probe.py` — that opens the dashboard, installs a fetch wrapper, then sits idle for 4 s with no burst, no mutations, no state-dirty broadcasts.

```
[probe] document.visibilityState = visible
[probe] observing 4s of idle...
[result] total fetches in 4s = 32
  /api/live/snapshot: 32
  sample (32 consecutive timestamps, ms):
    1768, 1902, 2033, 2166, 2302, 2435, 2563, 2698, 2829, 2951,
    3081, 3207, 3329, 3451, 3595, 3717, 3848, 3973, 4100, 4227,
    4349, 4473, 4599, 4730, 4862, 4984, 5113, 5239, 5369, 5512,
    5634, 5764
```

**32 fetches in 4 s = ~8 Hz, with ~125–130 ms between consecutive polls.** Exactly `LIVE_POLL_FAST_MS = 120 ms`. **No mutations were happening.** No state-dirty. No live-session-update. The dashboard is polling at fast-mode cadence purely because of a steady-state condition, not because anything woke it.

## Root cause

`src/app/runtime/state/runtime-snapshot-helpers.js:44-54`:

```js
function getAdaptivePollingIntervalMs() {
  const liveSync = ctx.liveSync;
  const now = Date.now();
  const documentVisible = document.visibilityState === "visible";
  const fastMode =
    liveSync.pendingMutations.size > 0 ||
    liveSync.dirtyHintUntil > now ||
    liveSync.preferFastPollingUntil > now ||
    documentVisible;                   // <-- this clause
  return fastMode ? ctx.LIVE_POLL_FAST_MS : ctx.LIVE_POLL_IDLE_MS;
}
```

`documentVisible` alone forces `fastMode === true`. While the dashboard tab is in the foreground (always, in the operator's scenario), the adaptive interval is **always** `LIVE_POLL_FAST_MS = 120 ms` regardless of whether anything has happened — `dirtyHintUntil`, `preferFastPollingUntil`, and `pendingMutations.size` are completely redundant for a foreground tab.

And `pollLiveSnapshotOnce` is self-perpetuating at that cadence: after every successful poll, line 224 calls `ctx.scheduleNextLiveSnapshotPoll()` with no override, which re-evaluates `getAdaptivePollingIntervalMs()` and arms another timer at 120 ms. So even with `state-dirty` immediate-re-arm gated (gap-closure-29), and even with WS broadcasts entirely silent, the dashboard is **continuously polling /api/live/snapshot at ~8 Hz**.

During an align-drag burst:
- Server version advances 30 times in 1 s (verified: `version: 603 → 632` across the 30 mutations).
- Every 120 ms poll arrives with a `sinceVersion` lower than the current version → `changed:true` → `shouldApplySnapshotVersion(incomingVersion)` returns true → full `applyLiveRuntimeSnapshot` runs.
- For role=CONTROL the apply path runs `syncRuntimePanelsFromState` + `renderRunningAnimationsList` + `refreshGlobalButtons` + `renderRoomOverlay` (lines 779-784 of runtime-live-sync-core.js), plus all the upstream polygon hydration / FX normalizers / animations reconciliation — **at ~8 Hz**.

This is the dashboard's CPU spike: not the WS broadcasts themselves and not the `state-dirty` immediate-re-arm (gap-closure-29 killed that), but the **always-on 120 ms fast-poll loop** that runs `applyLiveRuntimeSnapshot` end-to-end on every poll where the server's version has changed. The architecture **assumes the foreground polling tab needs to keep up at near-realtime cadence**, which is reasonable for the SSR Chromium tab (role=output) and a non-active dashboard, but is wrong for a dashboard whose only role is operator UI — it doesn't need to mirror server state at 8 Hz.

## Why round 1 missed it

The round 1 investigation correctly identified the `state-dirty` immediate-re-arm path as ONE source of dashboard polls during the burst, and gap-closure-29 correctly closed that hole. But round 1 measured under the assumption that **`state-dirty` was the only driver of the 120 ms fast cadence**. It isn't. The fast-mode → 120 ms cadence is the steady-state baseline whenever the tab is visible. `state-dirty` would *add* extra polls on top via setTimeout(0), but its absence does not slow the baseline.

The round-1 instrumentation captured 53 polls and assumed all 53 stemmed from the burst-driven setTimeout(0) chain. In fact, 30 of those polls were the steady-state 120 ms cadence and 23 were extra immediate-re-arms. Round 1 fixed the 23; the 30 remain.

## Recommended fix

The right structural fix is **role-aware fast-mode**: the `documentVisible → fastMode` shortcut should only apply when there is a real reason to be in fast mode (role=output is the renderer, or there are pending mutations the local user is waiting on). For role=CONTROL, foreground visibility alone should fall back to idle cadence (`LIVE_POLL_IDLE_MS = 250 ms` = 4 Hz) and *only* go fast when there's a recent dirty hint or pending mutation.

**File:** `src/app/runtime/state/runtime-snapshot-helpers.js`
**Lines:** 44-54

Replace:

```js
function getAdaptivePollingIntervalMs() {
  const liveSync = ctx.liveSync;
  const now = Date.now();
  const documentVisible = document.visibilityState === "visible";
  const fastMode =
    liveSync.pendingMutations.size > 0 ||
    liveSync.dirtyHintUntil > now ||
    liveSync.preferFastPollingUntil > now ||
    documentVisible;
  return fastMode ? ctx.LIVE_POLL_FAST_MS : ctx.LIVE_POLL_IDLE_MS;
}
```

With (illustrative):

```js
function getAdaptivePollingIntervalMs() {
  const liveSync = ctx.liveSync;
  const now = Date.now();
  const documentVisible = document.visibilityState === "visible";
  // Phase 49 round-2: foreground visibility alone is NOT enough reason
  // to enter fast-poll. role=control dashboards have no real-time-render
  // requirement, and a 120ms cadence on every visible tab causes
  // ~8 Hz of full applyLiveRuntimeSnapshot during remote bursts.
  // Restrict the visibility-driven fast-mode shortcut to FINAL (SSR/Pi
  // renderer) where snapshot freshness IS load-bearing.
  const role = typeof ctx.getOutputRole === "function" ? ctx.getOutputRole() : null;
  const isFinalRole = role === ctx.OUTPUT_ROLE_FINAL;
  const fastMode =
    liveSync.pendingMutations.size > 0
    || liveSync.dirtyHintUntil > now
    || liveSync.preferFastPollingUntil > now
    || (documentVisible && isFinalRole);
  return fastMode ? ctx.LIVE_POLL_FAST_MS : ctx.LIVE_POLL_IDLE_MS;
}
```

**Predicted post-fix behavior:**

- role=output (SSR Chromium tab on Pi, role=output): unchanged. Still fast-polls at 120 ms when foreground — same as today.
- role=control (dashboard): idle baseline = 250 ms (4 Hz). During a remote 30-mutation burst, `liveSync.dirtyHintUntil` is bumped to `now + 1500ms` by each incoming `state-dirty` (line 1214, unchanged from gap-closure-29 — that line is preserved on purpose). The dashboard then ENTERS fast-mode (120 ms) for the duration of the burst + 1.5 s. So instead of 32 polls in 4 s idle, baseline is ~16 polls; during burst, ~25-30 polls in 4 s — comparable to today's "burst" number, but the idle baseline drops 50 %.

That's still too many during a burst. If the operator wants to fully cut burst-driven polls on the dashboard, the additional change is to **not** bump `dirtyHintUntil` for `align-*` mutations either (Option B below).

### Option A — minimal: role-gate the visibility fast-mode shortcut (above)

Pros: One-line clause change, low risk.
Cons: During a burst, the dashboard is still pushed to 120 ms by `dirtyHintUntil` (set every state-dirty). Reduces burst polls from ~30 to ~13 in 4 s (rough estimate based on 1.5 s dirty window per state-dirty arriving every ~33 ms); cuts idle polls 50 %.

### Option B — comprehensive: also skip dirtyHint bump for align mutations on non-FINAL roles

**File:** `src/app/runtime/live-sync/runtime-live-sync-core.js`
**Lines:** 1213-1237

Change the `state-dirty` handler so that for align mutations on non-FINAL roles, **neither** the `dirtyHintUntil` bump **nor** the immediate re-arm runs:

```js
if (payload?.type === "state-dirty" || payload?.wake === true) {
  const dirtyMutationType =
    typeof payload?.mutationType === "string" ? payload.mutationType : null;
  const dirtyIsAlignMutation =
    dirtyMutationType === "align-corner-drag"
    || dirtyMutationType === "align-grid-snapshot";
  const dirtyIsFinalRole = ctx.getOutputRole?.() === ctx.OUTPUT_ROLE_FINAL;
  // gap-closure-32 (2026-05-18): for align-* on non-FINAL roles, neither
  // the dirty-hint nor the immediate re-arm should fire — the dashboard
  // has no business pegging its poll loop on remote align drags.
  if (!dirtyIsAlignMutation || dirtyIsFinalRole) {
    liveSync.dirtyHintUntil = Date.now() + 1500;
    ctx.scheduleNextLiveSnapshotPoll(0);
  }
}
```

Combine with Option A: during a remote align burst the dashboard stays at idle (250 ms) cadence. Predicted polls in 4 s: ~16 (idle baseline). `applyLiveRuntimeSnapshot` runs ~16 times instead of ~30 — and only ~4 of those will see a version advance (during the 1 s burst). Outside the burst window, the dashboard's polls return `changed:false` and the apply path short-circuits at line 107.

### Why I lean A + B together

Option A alone leaves dashboard burst polls high (still ~13 polls/4 s with full applies for each version advance). Option B alone is the same as gap-closure-29 minus the dirtyHintUntil bump — fine, but leaves the idle baseline at 8 Hz.

Together, Option A + B brings the dashboard to a coherent profile: **idle = 4 Hz** (250 ms), **never accelerates from remote align mutations**, **does still accelerate when the local dashboard user has pending mutations** (e.g. they click a button, that bumps `pendingMutations.size`). All of those are the right behaviors.

If you must pick one: **Option A alone gets the bigger CPU saving on this specific symptom** (cuts the idle 8 Hz → 4 Hz floor, which is the baseline drain the operator's animations are starving against). Option B is a smaller incremental cleanup on top.

## Caveats / risks

1. **`OUTPUT_ROLE_FINAL` constant must be available on `ctx`**: `runtime-snapshot-helpers.js` already receives `ctx` with `OUTPUT_ROLE_FINAL` available (used by `applyLiveRuntimeSnapshot` and others in the same module surface). Verified by grep — the constant is exported from `runtime-orchestration.js:627` into ctx. The proposed clause `role === ctx.OUTPUT_ROLE_FINAL` is safe; if it ever returned undefined the comparison evaluates to false → idle cadence, which is the conservative direction.

2. **Latency tradeoff for the dashboard**: idle cadence is 250 ms. A non-align mutation by another client (e.g. the operator on a second device flicks an animation on) would take up to 250 ms to appear on this dashboard via polling. WS broadcasts are still instant for non-align mutations (the eager-apply paths at lines 960-1028 are gated only for align-*), so this delay only matters in the WS-broken fallback case. Acceptable.

3. **Pending mutations override**: `liveSync.pendingMutations.size > 0` still forces fast-mode regardless of role. Means: when the dashboard's own user clicks something, the dashboard fast-polls for its own ack — unchanged. Good.

4. **`preferFastPollingUntil > now` override** survives: visibility-change (line 571 of `runtime-wire-overlay-window-binders.js`) bumps this to `now + 2000` whenever the dashboard regains visibility. So when the operator tabs back in, the dashboard fast-polls for 2 s to catch up to any state that mutated while hidden. Good.

5. **Idle CPU on the SERVER**: idle dashboards used to send 8 GET/s; with the fix they send 4 GET/s. Halves the dashboard-driven request load on `server.mjs` `getLiveSnapshotEnvelope`. No regression.

6. **`isHeavyInteractionActive()` gate**: line 61 of `scheduleNextLiveSnapshotPoll` already pauses polling entirely during local heavy interaction (e.g. user dragging on the dashboard). Unrelated to this fix, but worth noting that the dashboard ALREADY has a mechanism to pause polling — it just doesn't engage for remote drags. The fix correctly leaves heavy-interaction gating alone.

## How to reproduce / verify

```bash
# pre-fix (already done):
python3 /tmp/dashboard-cpu-instrument-r2.py --port 4173 --burst-count 30 --burst-window-s 1.0 --observe-after-s 3.0
python3 /tmp/dashboard-baseline-probe.py

# post-fix expectations:
# - baseline idle probe: ~16 polls in 4 s (4 Hz), not 32
# - 30-mutation burst (Option A only): ~13-16 polls in 4 s
# - 30-mutation burst (Option A + B): ~16 polls in 4 s, of which only ~4 see version advance and run full applyLiveRuntimeSnapshot
```

## Summary

| Round | Suspected mechanism | Verified by | Fix | Result |
|---|---|---|---|---|
| 1 | `live-session-update` ungated apply for align mutations on non-FINAL | round-1 measurement (53 fetches, 30 setTimeout(0)) | gap-closure-27 + gap-closure-29 | Eliminated setTimeout(0) immediate-re-arm only; cut fetches 53→30 |
| 2 | `documentVisible` alone forces `LIVE_POLL_FAST_MS = 120 ms` baseline on ALL roles | round-2 idle baseline probe (32 fetches/4 s = 8 Hz with **no** mutations or broadcasts) | Option A: gate visibility fast-mode shortcut to FINAL role (+ optional Option B: skip dirtyHint bump for align on non-FINAL) | Predicted: idle 8 Hz → 4 Hz; burst stays at 4 Hz or 8 Hz depending on Option B |

The actual culprit: **`src/app/runtime/state/runtime-snapshot-helpers.js:47-52`** — the dashboard runs a self-perpetuating 8 Hz poll-and-apply loop for the entire time the operator has the tab in focus, completely independent of whether any mutation is in flight or any state has changed. Every align-corner-drag burst from the Pi advances the server's version 30 times in 1 s, so every one of those 8 Hz polls runs the heavy `applyLiveRuntimeSnapshot` on role=control (full polygon hydration, FX normalizers, panel rebuilds, running-animations reconcile, room overlay redraw).
