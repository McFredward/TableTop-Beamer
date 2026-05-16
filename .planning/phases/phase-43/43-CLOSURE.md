---
phase: 43
slug: ssr-defaults-and-no-restore
status: CLOSED
closed: 2026-05-16
predecessor: phase-42-closed (commit 01b0f50)
tag: phase-43-closed
---

# Phase 43 — New SSR Defaults + Cold-Boot Animation Restore Removed

## TL;DR

Two operator-requested behavior changes after Phase 42 UAT:

1. **New SSR default profile.** `extra-high` (16 Mbit) at `1080p`,
   `fpsTarget=30` (metadata only), `streamFpsCap=60` (the real cap).
   Same profile regardless of detected encoder list — operator dials
   down for weak hardware via the Settings UI.

2. **Cold-boot animation restore disabled.** Only the
   default-animations pre-load (board-scoped per Phase 41) seeds
   `runningAnimations` on server boot. Anything the operator triggered
   during the previous session is dropped.

## Q&A on `fpsTarget` (Stream FPS target)

Operator question: "Was für einen Einfluss hat 'Stream FPS target'?"

**Answer: none, functionally.** The field is metadata. It is:

- Stored in `serverRendering.fpsTarget` (config schema)
- Read by `resolveEncoderConfig` and threaded through to
  `encoderConfig.fpsTarget` and `serverInfo.fpsTarget`
- Surfaced in the boot log line
  `[ssr-host] qualityPreset=… fpsTarget=30 keyframeIntervalSec=2`
- Displayed in the diagnostic chip's `ENCODE` line as
  `... · target=Xbps · 30fps`

The publisher script (`src/server/ssr-stream-publisher.mjs`) **never
reads `fpsTarget`** — its only frame-rate constraint comes from
`effectiveStreamFpsCap`. The encoder (mediasoup-driven) similarly
gets the bitrate from `preset.bitrate` but not the framerate from
`fpsTarget`.

`fpsTarget=30 + streamFpsCap=60` therefore does not conflict — the
stream is capped at 60 fps; the 30 is purely a label. Kept at 30 in
the new defaults for metadata coherence with the historic radio
group (30/24/15).

## Bug 1 — new SSR defaults

### Change

`src/server/ssr-server-rendering-config.mjs:SERVER_RENDERING_DEFAULTS`
collapsed from a hardware-conditional branch (`balanced/1080p` vs
`low-latency/720p`) to a single unconditional profile:

```js
return {
  encoder: "auto",
  qualityPreset: "extra-high",
  resolutionPreference: "1080p",
  fpsTarget: 30,
  streamFpsCap: STREAM_FPS_CAP_DEFAULT, // = 60
};
```

`config/global-defaults.json#serverRendering` reset to the same
shape so a fresh server install matches the new operator default.

### Test update

`test/ssr-server-rendering-config.test.mjs`: the HW-aware default
factory test rewritten to iterate three `available` lists (HW
present / software-only / empty) and assert the same `extra-high /
1080p / 60` profile for all three.

## Bug 2 — cold-boot animation restore retired

### Change

`server.mjs` start() branch (gated on `SSR_RENDER_HOST=1`): removed
the `loadSsrInitialState({ rootDir })` invocation. Stale log lines
(`[ssr-restore] restored N animations for board X` / `[ssr-restore]
schema mismatch` / `[ssr-restore] load failed`) are gone on boot.

The `loadSsrInitialState` export from `ssr-state-restore.mjs` is no
longer imported here; the in-session persisters
(`persistRunningAnimations`, `flushRunningAnimations`) stay — they
write `runtime-active-animations.json` during the session for
SSR-tab in-session crash recovery, but no boot path reads it back.

The board-id field of `runtime-active-animations.json` is still read
by the synchronous default-animations pre-load block (Phase 41) to
pick the active board's defaults; only the `runningAnimations` array
is ignored.

### Verification

Smoke test:
1. Write a fake operator-triggered entry to
   `config/runtime-active-animations.json`:
   ```json
   {"schema":"...","boardId":"nemesis-board-a","runningAnimations":[{"id":"manual-test-1",...}]}
   ```
2. Start server → log shows
   `[default-animations] Pre-loaded 13 default animation(s) for board nemesis-board-a`
   and NO `[ssr-restore]` line.
3. `curl /api/live/snapshot` → 13 runningAnimations, none with
   `id === "manual-test-1"`.

## What stays unchanged

- `persistRunningAnimations` / `flushRunningAnimations` still write
  to `runtime-active-animations.json` during the session (so it
  reflects current state). Just nobody reads the array on cold boot.
- `loadActiveGrid` / `persistActiveGrid` (projection-grid persistence,
  Phase 31 h41) — still active. The align-mode grid IS restored across
  restarts; that's deliberate (operator-calibrated geometry, not a
  user-triggered effect).
- Phase 41/42 board-switch lifecycle, settings panel state, quality
  preset additions, mobile-perf retirement, diagnostic overlay polish.

## Tag

`phase-43-closed` at commit `e31e96a` + closure commit.
