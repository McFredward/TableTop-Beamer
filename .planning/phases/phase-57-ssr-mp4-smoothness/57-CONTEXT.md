# Phase 57 — SSR mp4 playback quality / smoothness

**Status:** DISCUSS complete (2026-06-01)
**Operator:** Frederik (frederik@lissek.info)
**Predecessor:** Phase 56 (closed 2026-05-24 → v1.0.7) + post-v1.1.0 hotfixes (v1.1.1 Win32 1fps, v1.1.3 align handles)

---

## Domain

Restore smooth mp4 playback in the SSR-rendered stream that lands on
`/output/`. Symptom: 720p `snow.mp4` (Frostpunk board, inside-animation
full-area) shows constant low-FPS-feeling stutter on `/output/` while
the dashboard plays the same mp4 smoothly. Other animations (e.g.
`fire.gif`) on the same setup show no stutter.

This phase clarifies HOW to fix the SSR mp4 path. New mp4 features or
import flows belong in their own phases.

---

## Specifics (operator-locked)

### Symptom (operator-confirmed 2026-06-01)
- **Constant slight stuttering**, like too-low FPS. NOT periodic
  hitches. NOT loop-seam. NOT bitrate-backpressure spikes.
- Reproducible on `snow.mp4` (720p) regardless of which animation path
  the mp4 is spawned via — room, inside, or outside.
- Dashboard renders the same mp4 smoothly → bug is in the SSR encode
  + stream pipeline, not in the source mp4 or in the dashboard
  rendering.
- SSR overlay reports ~40fps, stream reports 23-26fps. Earlier
  baselines (other animations) show smaller SSR↔stream gaps.

### Counter-examples (must not regress)
- `fire.gif` and other animations remain smooth on `/output/`.
- Outside-mp4 loop seam fix (Phase 50, v1.0.30 `2559e77`
  `runtime-outside-mp4.js`) must stay intact — that fix is for a
  DIFFERENT symptom (end-of-stream seam frozen-frame) and works
  correctly.
- Win32 SSR capture must not regress (avoid changes that reduce canvas
  state changes per frame — see project memory:
  `project_win32_ssr_canvas_damage.md`).

---

## Decisions

### D-01 — Fix in the shared mp4 path, NOT per-spawn wrapper
Operator confirmed the bug shows on snow.mp4 regardless of room/
inside/outside spawn site. Per CONTEXT scoping (broader mp4 surface),
the fix must live in the shared mp4 rendering/decoding path. Wrappers
(room-mp4, inside-mp4 via outside path, outside-mp4) inherit the fix
automatically. Defense-in-depth + code consolidation.

### D-02 — Symptom is frame-rate mismatch / decoder-stall, NOT loop seam
Operator's "konstantes leichtes Stockeln, wie zu niedrige FPS" rules
out the loop-seam hypothesis (which Phase 50 already fixed for the
outside path). The hypothesis space is now:
- (a) mp4 source-fps (likely 30) vs SSR rAF rate (likely 40-60)
  produces frame-doubling/skipping aliasing.
- (b) HTMLVideoElement.currentTime control loop in the renderer
  doesn't trigger immediate decode → canvas.drawImage paints stale
  frames.
- (c) Encoder rate-control on motion-heavy mp4 content interacts
  poorly with the canvas-capture pipeline timing.

Research must distinguish (a)/(b)/(c) — proposed via instrumented
metric capture (decoded frame count vs drawn frame count vs encoded
frame count per second).

### D-03 — Win32 baseline preserved
The recent Win32 capture-pipeline lesson (project memory
`project_win32_ssr_canvas_damage.md`): reducing canvas state changes
per frame can starve Win32 tab-capture to 1fps. Any mp4 path change
must keep the per-frame canvas op count high enough that Win32
keeps capturing. Verified via the existing diagnostic env
`SSR_PUBLISHER_DEBUG=1` (v1.1.1).

### D-04 — Out of scope
- New mp4 import features.
- Audio-video sync changes.
- Dashboard rendering (operator confirmed already smooth).
- Loop-seam machinery (Phase 50 v1.0.30 already fixed).

### D-05 — Bisect-first if research is inconclusive
Per memory: `feedback_bisect_before_speculation.md`. If research +
code analysis can't pin the root cause confidently, fall back to
git-bisect against operator's last known smooth-mp4 state. Operator
can identify approximate version where it last worked.

---

## Code Context (initial hypotheses, validate in research)

Likely-relevant files:
- `src/app/runtime/render/runtime-outside-mp4.js` — outside-mp4 seam
  machinery (Phase 50 fix). Investigate whether the inside path uses
  the same module or a different one.
- `src/app/runtime/render/runtime-draw-loop.js` — main rAF render
  loop driver.
- `src/app/runtime/render/runtime-effect-visuals.js` — animation
  effect rendering switchboard (where `type === "outside-space"`
  branch lives). The mp4 case branch lives in this or a sibling.
- `src/app/runtime/render/runtime-room-dispatch.js` — room animation
  dispatch.

Likely-irrelevant (verify):
- mediasoup encoding pipeline — Phase 50 already tuned this.
- SSR launch / Chromium flags — unchanged since v1.1.0.

---

## Canonical refs

- `CHANGELOG.md` § `[1.1.0]` Fixed — "outside-space starfield
  smoothness in SSR" and "MP4 loop seam in SSR stream eliminated"
  (the prior fixes; their machinery is the prior art for this bug).
- `CHANGELOG.md` § `[1.1.1]` — Win32 1fps regression history (cost
  of touching canvas-state-change frequency on the SSR render path).
- Project memory: `project_win32_ssr_canvas_damage.md` — DO NOT
  reduce canvas state changes per frame.
- Project memory: `feedback_bisect_before_speculation.md` — fall back
  to bisect if research stalls.

---

## Open Questions for Research

1. Which module(s) own the mp4 → canvas frame-pump? Is it the same
   `runtime-outside-mp4.js` as the outside path, or a separate path?
2. How is HTMLVideoElement timing driven? `video.play()` + passive
   draw? Or explicit `video.currentTime = ...` per rAF?
3. What is the mp4 source fps (snow.mp4 metadata)? Is there a
   target/output fps in the renderer that might mismatch?
4. Does the path already use `requestVideoFrameCallback` (modern
   sync-with-decoded-frame API) or rely solely on rAF?
5. What does the operator's `start.log` show for stream/SSR fps
   metrics during snow.mp4 playback specifically?

---

## Next Steps

1. **Research** — Explore agent maps mp4 rendering code path; reads
   relevant files; produces RESEARCH.md with concrete hypothesis
   ranking + diagnostic plan.
2. **Plan** — Single plan (or 2 if research uncovers orthogonal
   fixes). Estimated 1 wave, ~3-5 tasks.
3. **Execute** — Targeted code change(s) + verification screenshot
   loop via Playwright on `/output/`.
4. **Verify** — Operator UAT on Frostpunk board with snow.mp4 active.
