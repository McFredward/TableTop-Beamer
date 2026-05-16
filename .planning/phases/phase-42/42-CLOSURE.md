---
phase: 42
slug: post-phase-41-followups
status: CLOSED
closed: 2026-05-16
predecessor: phase-41-closed (commit e6cfe58)
tag: phase-42-closed
---

# Phase 42 — Post-Phase-41 Operator Follow-Ups

## TL;DR

Operator confirmed Phase 41 fixes worked and asked for five follow-ups.
All five landed in commit `e46fbff`; one prior fact about board-switch
already-working is documented here without further code change.

| # | Issue | Resolution |
|---|---|---|
| 1 | "Does board-switch unload old assets + pre-load new?" | Already implemented — no code change. Verified existing `applyBoardContextMutation` in server.mjs rebuilds `runningAnimations` to the new board's defaults + `sanitizeLiveSnapshotForBoardContext` filters out cross-board entries. On the dashboard, `switchBoard()` clears outside MP4 state for the previous board, then `warmRoomGifAssets` + `prewarmBoardOutsideMp4Asset` for the new board. |
| 2 | SSR settings radios not pre-selected | Two-part fix: `saveGlobalDefaults` now preserves the existing `serverRendering` block; GET `/api/global-defaults` always layers `SERVER_RENDERING_DEFAULTS` on top of disk values |
| 3 | Add 16 & 20 Mbit/s quality presets | New `extra-high` (16 Mbit, x264 fast) and `ultra-high` (20 Mbit, x264 medium) entries in `QUALITY_PRESETS` + `QUALITY_PRESET_VALUES` + HTML radio group |
| 4 | Retire "Mobile Performance-Checks" section | Removed across HTML + 8 JS modules + state field plumbing |
| 5 | Diagnostic overlay polish (GPU "?", `anims · off` ambiguity) | webglRenderer falls back to `gl.getParameter(gl.RENDERER)` then "unavailable"; alignMode label now reads `alignMode=ON/off/?` instead of bare `ALIGN/off/?` |

## Recommendation: ≥16 Mbit/s

Recorded for operator reference:

- **16 Mbit/s (`extra-high`)** — Reasonable on x264-software when host
  CPU has headroom. Gives the encoder more bits for dense textures
  (dark gradients, particle systems, dense star fields) where 12 Mbit
  can still show quantization rauschen. Recommended starting point if
  you want noticeably cleaner output and your operator PC is mid-range
  or better.
- **20 Mbit/s (`ultra-high`)** — Sinnvoll nur mit Hardware-Encoder
  (NVENC/VAAPI/VideoToolbox). x264-software at 20 Mbit can saturate
  4-6 CPU cores on dense scenes, which collapses back into encode-lag
  and the SSR-tab can't sustain its rAF rate. WebRTC's adaptive
  congestion control may also throttle past 20 Mbit on LAN even though
  raw bandwidth permits — diminishing returns.

## Bug 1 — board-switch lifecycle (already implemented)

No code change required. Verified the existing flow handles the
operator's "unload old / pre-load new" expectation:

**Server side** (`server.mjs`):
- `applyBoardContextMutation` (line ~890) sets
  `nextRuntime.runningAnimations = buildDefaultAnimationsForBoard(selectedBoard)`
  on every board-context mutation. This drops the old board's
  animations and seeds the new board's defaults.
- `sanitizeLiveSnapshotForBoardContext` (line ~953) filters
  `runningAnimations` to entries matching the active board, so any
  stale cross-board entry that survived a race is purged.

**Dashboard side** (`runtime-board-switch.js`):
- `switchBoard(boardId)` calls `clearOutsideMp4PlaybackState(previousBoardId)`
  + `clearOutsideTimelineState(previousBoardId)` on actual switches
  (lines 180-183).
- Then `warmRoomGifAssets({ reason: "board-switch" })` and
  `prewarmBoardOutsideMp4Asset(board.id, ...)` (lines 184-185)
  pre-fetch the new board's assets so they're hot before the operator
  triggers an animation.

Browser HTTP cache + the asset-manifest sha256 hashing handle the
"old resources no longer in use" half — they stay in cache but don't
keep GPU textures alive once `<video>` and `<img>` elements are
released.

## Bug 2 — SSR settings panel state

### Root cause

Two-bug interaction:

1. `saveGlobalDefaults()` in `server.mjs` built `next` with only
   `audio`, `animationSpeed`, `diagnosticOverlay`, `projectionMapping`
   — it dropped any `serverRendering` block on every write. So once
   the operator toggled `diagnosticOverlay` (or audio volume, etc.)
   the previously-persisted `serverRendering` was wiped from disk.
2. GET `/api/global-defaults` returned the file as-is. With no
   `serverRendering` on disk, the dashboard panel's `reflectConfig`
   got `undefined` and the radios stayed unchecked.

### Fix

```js
// saveGlobalDefaults handler
const next = {
  ...
  ...(existing?.serverRendering && typeof existing.serverRendering === "object"
    ? { serverRendering: existing.serverRendering }
    : {}),
};
```

```js
// GET /api/global-defaults handler
const srDefaults = SERVER_RENDERING_DEFAULTS({
  available: Array.isArray(detected) ? detected : [],
});
response.serverRendering = {
  ...srDefaults,
  ...sr,
  ...(Array.isArray(detected) && detected.length > 0
    ? { availableEncoders: detected }
    : {}),
};
```

Net effect: even on a fresh install with no `serverRendering` block
on disk, the GET endpoint surfaces hardware-aware defaults; once the
operator picks a value via `serverRendering-update` mutation, the
disk value wins and is preserved across all subsequent
`saveGlobalDefaults` writes.

### Verification

Server log + curl: `curl /api/global-defaults` now returns
```json
"serverRendering": {
  "encoder": "auto",
  "qualityPreset": "low-latency",
  "resolutionPreference": "720p",
  "fpsTarget": 30,
  "streamFpsCap": 60
}
```
On dashboard load, each radio group has its current value pre-selected.

## Bug 3 — 16 & 20 Mbit/s presets

### Changes

`src/server/ssr-render-host.mjs`:
```js
const QUALITY_PRESETS = {
  "low-latency":  { bitrate:  4_000_000, ..., x264Preset: "ultrafast" },
  "balanced":     { bitrate:  8_000_000, ..., x264Preset: "veryfast"  },
  "high-quality": { bitrate: 12_000_000, ..., x264Preset: "fast"      },
  "extra-high":   { bitrate: 16_000_000, ..., x264Preset: "fast"      },
  "ultra-high":   { bitrate: 20_000_000, ..., x264Preset: "medium"    },
};
```

`src/server/ssr-server-rendering-config.mjs`:
```js
export const QUALITY_PRESET_VALUES = [
  "low-latency", "balanced", "high-quality", "extra-high", "ultra-high",
];
```

`index.html`: added two `<label><input type="radio" value="extra-high"/>`
+ `<label><input type="radio" value="ultra-high"/>` entries with
descriptive text + HW-encoder hint for ultra-high.

`test/ssr-server-rendering-config.test.mjs`: enum assertion updated.

## Bug 4 — Mobile Performance-Checks removal

Retired section + all its plumbing:

| Location | Removed |
|---|---|
| `index.html` | `<section>Mobile Performance-Checks</section>` |
| `runtime-dom-refs.js` | `runMobilePerformanceCheckButton`, `mobilePerformanceStatus` |
| `runtime-perf.js` | `syncMobilePerformanceStatus`, namespace export |
| `runtime-orchestration.js` | destructure, ctx threading (3 spots) |
| `runtime-orchestration-ctx-builder.js` | bootstrap ctx slots |
| `runtime-bootstrap.js` | sync-panels-from-state branch |
| `runtime-panels-controller.js` | declare + call |
| `runtime-stage-viewport.js` | ctx threading |
| `viewport-lifecycle.js` | destructure + call |
| `runtime-wire-room-audio-binders.js` | destructure + click handler |

## Bug 5 — Diagnostic overlay polish

### GPU "?" → fall back to masked RENDERER

`src/server/ssr-stream-publisher.mjs:325-345`:

Before: `webglRenderer` was emitted only when the WEBGL_debug_renderer_info
extension's UNMASKED_RENDERER_WEBGL returned a non-empty string. On
Chromium 131 with default `--enable-webgl-debug-renderer-info` policy
the unmasked value is often null/empty → field never set → server
sees `undefined` → chip renders "?".

After: chained fallback. If UNMASKED is empty, read `gl.getParameter(gl.RENDERER)`
(the masked value — always populated, typically "WebKit WebGL" /
"ANGLE (Mesa, llvmpipe)"). If even that fails, cache the literal
`"unavailable"` so the field always surfaces something.

### BOARD "anims=X · off" → labeled alignMode field

`src/app/runtime/output-receiver/receiver-status-ui.js`:
```js
const alignMode = ssrStats?.alignMode === true
  ? "alignMode=ON"
  : (ssrStats?.alignMode === false ? "alignMode=off" : "alignMode=?");
```

`test/receiver-status-ui-overlay-format.test.mjs`: assertion changed
from `/ALIGN/` to `/alignMode=ON/` to match new label.

### RTC `avail` and `dec` still "?" — non-bug

These come from WebRTC `RTCIceCandidatePairStats.availableIncomingBitrate`
and `RTCInboundRtpStreamStats.decoderImplementation` respectively.
Chromium populates them only after a few stats-poll cycles + first
frame decoded. Early-paint "?" is expected; if they persist `?` after
the stream is stable, that's a Chromium reporting quirk specific to
the codec/configuration, not a defect in our stats collector — the
collector already correctly reads both fields when available. No
code change.

## Tests

- Full `node --test` sweep: 408 tests, 388 pass, 1 fail (pre-existing
  `04-T3 receiver-bootstrap setReconnectDetail` baseline, unrelated),
  19 skipped. No new regressions.
- Smoke test: server boots clean, GET `/api/global-defaults` returns
  full `serverRendering` block, default-animations pre-load logs
  `Pre-loaded 13 default animation(s) for board nemesis-board-a`.

## What was NOT changed

- Phase 41 fixes (diagnostic overlay propagation, board-scoped
  pre-load, SSR boot noise) — preserved.
- WebRTC stats collection pipeline — unchanged (root cause for
  intermittent `avail/dec="?"` is Chromium's stats cadence, not our
  code).
- All Phase 38/39/40 stability + cleanup work — preserved.

## Tag

`phase-42-closed` at commit `e46fbff` + the closure commit.
