# Phase 31 Hotfix Audit — Phase-30 h6-h15 Server-vs-Pi Classification

**Audited:** 2026-05-06
**Plan:** 31-05 (Wave 5)
**Goal:** Per RESEARCH.md § Pitfall 3 + § Risk 3, ensure Phase-30 hotfixes that
assume Pi-VC4 limits do NOT silently degrade server-side rendering quality.

The Phase-30 stability wave (T1..T16) was implemented exclusively against Pi-
VC4 hardware budget. Phase-31 introduces a server-side render host (headful
Chromium under Xvfb on x86_64 with Intel iGPU + 32 GiB RAM) where several of
those defensive measures are at best wasteful and at worst actively reduce
output quality. This document is the source-of-truth for Task 2's
implementation — every gate added in `runtime-gif-decoder.js`,
`runtime-gif-playback.js`, etc. references a row in the table below.

---

## Classification Schema

| Class | Meaning | Action |
|-------|---------|--------|
| `server-keep` | Hotfix is environment-agnostic OR beneficial in both | KEEP unchanged |
| `pi-only` | Hotfix targets Pi-VC4 budget; harmful or wasteful on server | GATE behind `runtimeEnvironment === 'pi'` |
| `dashboard-only` | Already gated to dashboard role | KEEP unchanged |
| `regression-risk` | Would actively reduce SSR quality if not gated | GATE + UAT (Plan 06) |

---

## Audit Table

| Hotfix ID | File | Line(s) | Description | Class | Gate Required |
|-----------|------|---------|-------------|-------|---------------|
| T4 | `src/app/runtime/render/runtime-draw-loop.js` | 480-526 | Final-output bypass for outside-mp4 — on `outputRole === final-output` always paint live frame, skip the tier-gated fallback canvas (`captureOutsideMp4FallbackFrame`) | `server-keep` | NO — SSR Chromium tab IS final-output; the bypass is exactly what we want |
| T7 | `src/app/runtime/render/runtime-gif-decoder.js` | 20-35, 425-462 | Pre-downsample large GIF source frames to `GIF_MAX_PIXEL_DIM` (512 px max-dim, aspect preserved) at decode time — moves the costly resample from per-frame draw to a one-shot decode-time op | `regression-risk` | YES — server should keep native resolution for streamed-out 1080p/720p output |
| T11 | `src/app/runtime/render/runtime-gif-playback.js` | 138-149 | `bakeImageBitmap=false` on `/output/` only — keeps GIF playback on the canvas + putImageData path to avoid per-frame `createImageBitmap` GPU allocation | `dashboard-only` | NO — already gated by `isFinalOutput`. SSR tab is `/output/` so it inherits the safer path; acceptable cost on server |
| T12 | `src/app/runtime/render/runtime-gif-playback.js` | 316-325 | `WARM_DECODE_TIMEOUT_MS = 30000` — bumped from 5000 to 30000 because Pi VC4 parser path takes 12-15s for slime.gif. On server the decode completes in <500ms; a 30s timeout just delays error surfacing | `pi-only` | YES — server uses `5000` ms; Pi keeps `30000` ms |
| T13 | `src/app/runtime/render/runtime-draw-loop.js` | 498-526 | Capture `outsideMp4FallbackFrame` every 5th rAF tick (~300 ms staleness at 16 fps); also short-circuits during `video.seeking` | `server-keep` | NO — applies inside the `isFinalOutput` branch; small overhead, harmless on server |
| T14 | `src/app/runtime/render/runtime-gif-decoder.js` | 254-280, 502-519 | `requestAnimationFrame`-based yield in GIF parser between every 8 frames (`YIELD_EVERY_N_FRAMES`), keeping GL submitFrame alive | `server-keep` | NO — beneficial on any platform; Chromium on Xvfb has the same WebGL watchdog logic |
| T15 | `src/app/runtime/render/runtime-gif-decoder.js` | 25-34, 425-462 | Cap `GIF_MAX_PIXEL_DIM` reduced 512→256 px (further-stricter incarnation of T7 same site) | `regression-risk` | YES — same gate as T7 (the cap value lives in one constant; the gate wraps the cap-application) |
| T16 | `src/app/runtime/render/runtime-outside-mp4.js` | 31-40 | `OUTSIDE_MP4_FALLBACK_FRAME_MAX_AGE_MS = 1500` — bumped from 350 ms to 1500 ms for fresh-frame fallback window so Pi-rate capture doesn't slip past the freshness gate | `server-keep` | NO — at server fps the gate rarely fires; constant value is harmless on a fast platform |

---

## Decision Rationale

### regression-risk: T7 + T15 (GIF downsampling cap = 256 px max-dim)

**Why gated:** Server has Intel iGPU + 32 GiB RAM (RESEARCH.md § Q1). The
256 px max-dim cap reduces e.g. slime.gif from 1024×576 to 256×144 — a 16×
pixel reduction. On Pi VC4 this saved upload + putImageData cost. On the
server SSR tab the decoded frame ultimately leaves Chromium as a 1080p
encoded h264 stream to the Pi; the Pi `<video>` then upscales 256 px input
to 1080p — visible quality loss on the projection.

**Gate logic (single check covers T7 + T15 because they live at the same
site):**

```js
const __ttbEnv = (typeof window !== "undefined"
  && window.TT_BEAMER_RUNTIME_ENV?.getRuntimeEnvironment?.()) ?? "pi";
if (__ttbEnv === "pi") {
  // existing T7/T15 cap code: dsScale = min(1, 256 / max(W, H))
} else {
  // server-ssr or desktop: keep native resolution
  // dsScale = 1 (no downscale)
}
```

The single `if` wraps the cap-application code; the upstream and downstream
paths (canvasPixels build, frame storage in entry.frames) are unchanged.

### pi-only: T12 (30 s warm-decode timeout)

**Why gated:** the timeout was raised to 30 s because Pi cold-boot decode of
slime.gif via the synchronous JS GIF parser takes 12-15 s (150 frames at
512×288 each, with the rAF yield every 8 frames). On server, Chromium decodes
the same GIF in <500 ms; a 30 s timeout just delays error surfacing if a
truly stuck decode happens.

**Gate (inline):**

```js
const WARM_DECODE_TIMEOUT_MS = __ttbEnv === "pi" ? 30000 : 5000;
```

Server returns to the original 5 s budget; Pi keeps the 30 s budget.

### server-keep: T4 / T13 / T14 / T16

**Why kept unchanged:**

- **T4 final-output bypass.** The SSR Chromium tab IS final-output (the
  receiver-bootstrap doesn't run on the SSR tab; rendering proceeds via the
  draw loop). Skipping the fallback canvas saves a `drawImage(video,...)` per
  frame; that's purely positive on server.
- **T13 capture-every-5-frames.** Inside the same `isFinalOutput` branch.
  Capturing the fallback every 5 rAF ticks is cheap (≤ 300 ms staleness gap
  at 16 fps; on server fps is higher so staleness is even smaller). The
  `video.seeking` short-circuit prevents stale paints during loop wraps —
  beneficial in both environments.
- **T14 rAF-yield in parser.** Chromium on Xvfb has the same GL watchdog
  semantics as on Pi VC4 (long synchronous JS blocks the rAF loop, the
  driver sees no submitFrame and may reset the context). The yield costs
  ~16.7 ms per yield × ~19 yields for slime ≈ 313 ms; absorbed easily by
  server overcapacity.
- **T16 1500 ms freshness window.** Constant value; doesn't actively cap
  quality. On server the freshness gate barely ever fires (capture cadence
  is well within 1500 ms even at 30 fps). Harmless to keep.

### dashboard-only: T11 (ImageBitmap pre-bake skip on /output/)

**Why kept:** the existing gate (`bakeImageBitmap: !isFinalOutput` at line
148 of `runtime-gif-playback.js`) skips the per-frame `createImageBitmap`
allocation on /output/. The SSR Chromium tab IS /output/, so it falls
through to the playback-canvas + putImageData path — slightly less GPU-
efficient than the bitmap path, but stable. The bitmap path on dashboard is
unaffected by the Plan-31 pivot. Plan 05 leaves this gate untouched —
re-evaluating it for SSR (where GPU pressure is no concern) is deferred to
Plan 06 UAT or a future tuning pass.

---

## Verification Plan

For each `regression-risk` and `pi-only` gate, the post-Plan-05 manual UAT
(Plan 31-06) must verify:

1. **Pi defense-in-depth still works:** when SSR is OFF (Pi runs local
   render against the existing receiver-bootstrap fallback path, OR a future
   toggle disables SSR), T7 / T12 / T15 STILL fire (`getRuntimeEnvironment()`
   returns `'pi'` due to ARM-UA fallback). Visual quality matches Phase-30
   baseline (≈12 fps, downsampled GIFs).
2. **SSR mode runs at full quality:** when SSR is ON (SSR Chromium tab on
   server has `?ssr=1`), the server-side render renders GIFs at native
   resolution. Pi `<video>` displays the full-quality stream.

The runtime-environment helper extends `runtime-env.js` with
`getRuntimeEnvironment()`; the test
`test/runtime-env-environment.test.mjs` adds Node-side coverage of the four
classification paths (`?ssr=1` → `'server-ssr'`, `/output/` no-ssr → `'pi'`,
ARM UA → `'pi'`, default → `'desktop'`).

---

## Phase-Contract Non-Regression Checks

The hotfix gates MUST preserve every existing phase contract. Plan-06 UAT
covers each:

| Phase Contract | Source | Test |
|---------------|--------|------|
| Phase-12 layering (A→B == B→A, additive) | `12-1-VERIFICATION.md` | Manual smoke: trigger 2 room animations same room, both ordering — both visible additively |
| Phase-13 server-authoritative config | `phase-13/CLOSURE.md` | No browser-storage references regress; `/api/global-defaults` round-trip stays canonical |
| Phase-26 h9 GL-triangle seam fix | `phase-26/SUMMARY.md` | Solid-color seam absence verified visually on aligned mesh-warp output |
| Phase-28 B6 diagnostic-overlay sync | `phase-28/28-05-SUMMARY.md` | Toggle on dashboard → /output/ updates; chip stays visible on Pi |
| Phase-29 40/40 test suite | `phase-29/29-AUDIT.md` | `node --test "test/**/*.test.mjs"` 124+ pass remains |
| Phase-30 B1/B2/B3 contracts | `phase-30/SUMMARY.md` | Wave-6 UAT scenarios 1-11 still green |

---

## Files Touched by Plan 05 Gating (Task 2)

- `src/app/lib/shared/runtime-env.js` — adds `getRuntimeEnvironment()` with
  ARM-UA defense-in-depth.
- `src/app/runtime/render/runtime-gif-decoder.js` — gates T7+T15 cap on
  `runtimeEnvironment === 'pi'`.
- `src/app/runtime/render/runtime-gif-playback.js` — gates T12 timeout on
  `runtimeEnvironment === 'pi'` (`5000` else `30000`).
- `test/runtime-env-environment.test.mjs` — new unit-test file for the
  helper + grep-based gate verification.

## Files NOT Touched by Plan 05 Gating

- `src/app/runtime/render/runtime-outside-mp4.js` — T16 stays as-is
  (server-keep).
- `src/app/runtime/render/runtime-draw-loop.js` — T4 + T13 stay as-is
  (server-keep).

---

*Phase: 31-server-side-rendering-pivot · Plan 05 · Audit produced 2026-05-06*
