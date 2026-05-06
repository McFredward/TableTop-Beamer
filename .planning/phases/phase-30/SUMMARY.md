---
phase: 30
title: Render-Stability Regressions Closure
status: CLOSED PARTIAL
closed_at: 2026-05-06
final_version: 0.30.0-30-04-T14T15T16-raf-yield
tag: phase-30-end-partial
---

# Phase 30 — Render-Stability Regressions Closure (CLOSED PARTIAL)

## Outcome

**Three of four objectives delivered. The fourth — Pi /output/ fps target — was
NOT met despite extensive iteration.** Phase 30 closes as PARTIAL with the
fps gap explicitly forwarded to Phase 31, which adopts a fundamentally
different architecture (server-side rendering) rather than continuing
client-side optimization.

| Objective | Status | Evidence |
|---|---|---|
| B3 — Diagnostic overlay live-sync to `/output/` | **PASS** | Plan 30-01 closed (D + E + h1 + h2). |
| B1 — Solid-color seam lines | **PASS** | Plan 30-02 + h1..h12 hotfix wave closed mesh-warp seams in both GL and 2D fallback. |
| B2 — Pi GIF reliability without reload | **PASS** | Plan 30-03 (Candidates A + B + C) — non-terminal fallback retry, serialized warm decodes, manifest-hash cache invalidation. |
| **Plan 30-04 — Pi /output/ fps to 24-30** | **NOT MET** | Final measurement on Pi: ~12 fps with all hotfixes applied (T14+T15+T16). Target was ≥20 fps. |

## What Plan 30-04 actually delivered

Plan 30-04 was originally scoped as a fps-only intervention. Across 16 tasks
(T1-T16, with T6/T8 cancelled and forwarded to Phase 31) the wave produced:

**Stability (delivered, validated)**

- Pi VC4 GL context-loss during GIF decode eliminated (T14: parser yields via
  `requestAnimationFrame` instead of `setTimeout(0)`, keeps GL submitFrame
  alive between yield ticks → watchdog no longer reaps the context).
- Boot mode-flicker (GL ↔ 2D fallback during slime decode) eliminated by
  the same mechanism.
- mp4 outside-loop seamlessness restored after the T4 final-output bypass
  introduced a regression (T13 + T16: capture every 5 frames + 1500 ms
  fallback freshness window).
- WARM_DECODE_TIMEOUT_MS lifted 5000 → 30000 ms so slime no longer
  spuriously fails warm-decode on slow Pi cold boots (T12).

**Performance (partial)**

- GIF frames pre-downsampled at decode time, max-dim cap 256 px (T7 + T15).
  Reduces GPU upload + putImageData cost ~16× for slime (originally
  1024×576). Net: roughly +2 fps on /output/.
- Sandstorm mp4 re-encoded 1920×1080 → 1280×720 (kept original as
  `sandstorm-1080p-backup.mp4`). Net: minor.
- `runtime-draw-loop` final-output bypass for outside-mp4: skips fx-canvas
  routing on /output/, draws video directly. Net: +2.6 fps.
- Diagnostic flag scaffold (T1) + 10-point fps matrix (T2) located the
  actual bottleneck — per-room rendering, NOT the originally-hypothesised
  capture cost. Plan was pivoted accordingly.

**Net fps delta over Phase-30 entry baseline:** ~10 fps → ~12 fps. The 20+
fps goal would require a deeper architectural change — moving non-trivial
render work off the Pi entirely. That is the explicit scope of Phase 31.

## Why client-side optimization plateaued at ~12 fps

The Pi 4 VC4 GPU + Mesa V3D driver budget is exhausted by the per-frame
work the kiosk currently does at 1920×1080:

1. fx-canvas allocation + clear at full resolution every frame.
2. N rooms (typical: 12-20) each clipped + masked + drawn, often with
   `lighter` blend mode.
3. Mesh-warp pipeline (per-triangle clip + affine, or GL with pre-baked
   ImageBitmap) for projection mapping.
4. GIF playback canvas writes via `putImageData` (slime: 22 MB / 60+ frames).
5. mp4 video → canvas drawImage at 30 fps.

T2 fps matrix isolated rooms as the dominant cost: `?skip_rooms=1` jumped
from 10 → 24 fps; `?skip_capture=1` only +0.3 fps; `?skip_outside=1` +4.5
fps. Reducing per-room work further (Path2D cache, smaller fx-canvas, etc.)
was inventoried but never enough to close the gap to 20 fps without
sacrificing the mesh-warp + multi-area + projection-mapping contracts that
Phases 8, 13, 19, 27 established as binding.

## Architectural consequence: Phase 31 pivots to server-side rendering

Decision (user, 2026-05-06): the Pi will become a **thin display client**.
The server (significantly stronger hardware) takes over the render pipeline;
/output/ on the Pi only consumes a final-pixel stream. User-facing
contracts (Align Mode, Projection Mapping, multi-area, transformations,
timeline of animations) stay identical — only the render *location* moves.

This decision sets Phase 31 scope. Phase 30 closes here.

## Hotfix wave inventory (h1..h15 across plans 30-01..30-04)

All commits between `phase-29-end` and `phase-30-end-partial` HEAD belong
to Phase 30:

- 30-01 (3 commits + h1/h2 + close): diagnostic overlay live-sync.
- 30-02 (1 plan + h1..h9 + T4): solid-color seam closure across GL and 2D
  fallback; CSS matrix3d fast-path; mesh-warp shared-edge fill.
- 30-03 (T1..T3 + h1/h2): Pi GIF reliability — non-terminal fallback,
  serialized warm decodes, manifest-hash cache invalidation.
- 30-h10..h12 (cross-plan stability hotfixes): GIF frames as ImageData;
  effective render-mode visibility; async GIF parser yields; 2D streifen
  fix; boot context-loss elimination.
- 30-04 (T1..T16, T6/T8 forwarded): Pi perf + Pi GL stability — see
  `30-04-PI-PERF-PLAN.md` for full task ledger.

## Test suite

40/40 green at closure. No skipped tests. Phase 26 h9, Phase 28 B6, Phase
29 v4 contracts non-regressed.

## Forwarded to Phase 31

- Pi /output/ fps target (≥20 fps, ideally 30) — re-scoped as a consequence
  of server-side rendering rather than a client-side optimization target.
- T6 (final fps acceptance UAT) — cancelled; supplanted by Phase 31 UAT.
- T8 (Path2D room-clip cache) — cancelled; obsolete under SSR.

## Artifacts

- `30-CONTEXT.md` — original gray-area decisions.
- `30-RESEARCH.md` — initial three-regression research.
- `30-RESEARCH-DEBUG-h3.md` — h3 hotfix research.
- `30-RESEARCH-PI-PERF.md` — perf deep-dive (capture-hypothesis later
  refuted by T2 UAT; rooms identified as actual bottleneck).
- `30-01-PLAN.md` + `30-01-SUMMARY.md` — overlay live-sync.
- `30-02-PLAN.md` + `30-02-GL-ESCALATION.md` — seam closure + GL escalation
  log.
- `30-03-PLAN.md` — Pi GIF reliability.
- `30-04-PI-PERF-PLAN.md` — perf task ledger.
- `30-VALIDATION.md` — UAT-only validation strategy.
- `30-DISCUSSION-LOG.md` — context-collection trail.

## Tag

`phase-30-end-partial` at HEAD.
