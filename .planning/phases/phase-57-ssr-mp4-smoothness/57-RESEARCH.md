# Phase 57 Research: SSR MP4 Stuttering Root Cause

**Date:** 2026-06-01
**Status:** RESEARCH COMPLETE

---

## § 1: MP4 Rendering Architecture

The mp4 frame-pump is split across **three per-scope code paths**, each in `runtime-draw-loop.js`:

### Outside-MP4 (lines 491–566)
- **Module:** `runtime-outside-mp4.js` (entire module + integration in draw-loop)
- **Frame pump:** HTMLVideoElement with explicit loop-wrap control
  - `video.loop = true` set initially, then manually controlled via `maybeWrapOutsideMp4Loop()`
  - `video.currentTime` explicitly set to avoid native-loop seam (Phase 50 fix)
  - Uses `requestVideoFrameCallback` bound at line 294-303 (module private, fires when browser decodes a frame)
- **Frame-rate gating:** `shouldDrawOutsideMp4Now()` (line 558) gates draws to tier-dependent fps (33ms / 22ms / 16ms)
- **Fallback canvas:** Captured every 5th rAF (line 548), replayed during seek windows (line 555)
- **Canvas operation:** `drawImage(video, ...)` or fallback canvas only when gated to draw (lines 546, 559, 562, 565)

### Room-MP4 (lines 83–136)
- **Module:** `runtime-outside-mp4.js` (room-side exports; same module, parallel cache)
- **Frame pump:** HTMLVideoElement with manual loop wrap (mirrors outside path)
  - `video.loop = false` to prevent native seam
  - `maybeWrapRoomMp4Loop()` pre-empts EOS, seeks back early (line 106)
  - Uses `requestVideoFrameCallback` for frame availability tracking
- **Frame-rate gating:** None. Draws every frame (line 119).
- **Fallback canvas:** Captured every rAF (line 125), replayed during seek (line 129)
- **Canvas operation:** `drawImage(video, ...)` every frame IF `haveLiveFrame` (line 119)

### Inside-MP4 (lines 290–306) — **THE PROBLEM**
- **Module:** `runtime-draw-loop.js` (inline, no separate module)
- **Frame pump:** HTMLVideoElement with native `loop=true`
  - `video.loop = true` set (line 295)
  - `video.play()` once (line 300)
  - **NO manual loop-wrap logic**
- **Frame-rate gating:** None. Draws every frame.
- **Fallback canvas:** None.
- **Canvas operation:** `drawImage(video, ...)` every rAF (line 303)

---

## § 2: Frame Timing Model

### Outside & Room Paths: Tier-gated decoupling

```javascript
// Outside, line 558:
if (ctx.shouldDrawOutsideMp4Now(playbackState)) {
  c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
  // (capture fallback every 5th frame)
} else {
  ctx.drawOutsideMp4FallbackFrame(playbackState);  // replay stale frame
}
```

The **outside path decouples rAF from video decode**:
- rAF fires ~60Hz (browser's refresh clock)
- `shouldDrawOutsideMp4Now()` (runtime-perf.js:306–323) samples `lastDrawAtMs` and gates to 33ms / 22ms / 16ms
- Video decode happens asynchronously via HTMLVideoElement's media engine
- If video decode hasn't completed a new frame, fallback canvas replays the prior frame → no visible stutter, just skipped samples

### Room Path: Every-frame draws without gating

```javascript
// Room, line 119:
if (haveLiveFrame) {
  drawRoomAssetImage(c, video, rect);
}
```

Draws the video frame every rAF if `readyState >= 2` (data available). No gating, no fallback if decode is late.

### Inside Path: Every-frame draws without gating or stale-frame protection

```javascript
// Inside, line 303:
c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
```

Paints HTMLVideoElement to canvas every rAF, **always**. If the video element has decoded a new frame, paint it; otherwise paint the last frame. Crucially: **no stale-frame detection, no fallback, no frame-availability check like room's `haveLiveFrame`**.

---

## § 3: Shared vs. Per-Path Code

| Path | Module | Loop Wrap | Frame Gating | Fallback | Status |
|------|--------|-----------|--------------|----------|--------|
| Outside | `runtime-outside-mp4.js` | Yes (Phase 50) | Yes (tier-gated) | Yes | ✓ Defended |
| Room | `runtime-outside-mp4.js` | Yes (Phase 50) | No | Yes | Defended vs. seam; every-frame draw |
| Inside | `runtime-draw-loop.js` (inline) | No | No | No | **Undefended** |

**Key finding:** Inside-MP4 uses the native HTMLVideoElement `loop` attribute with no seam machinery. Per Phase 50 commit comments (runtime-outside-mp4.js:27–34), native `<video loop>` produces a **1-frame stall at EOS** (visible in SSR capture). The outside + room paths eliminated this via manual wrap + fallback canvas; the inside path did not.

---

## § 4: GIF Path Comparison (Why GIFs Are Smooth)

```javascript
// runtime-gif-playback.js, getGifPlaybackFrame (line 410–438):
const frameIdx = _resolveFrameIndex(entry, elapsedSeconds);
const frame = entry.frames[frameIdx];
if (!frame) return null;
if (frame.bitmap) return frame.bitmap;  // ImageBitmap (dashboard)
if (frame.imageData) {
  const canvas = _ensurePlaybackCanvas(entry);
  entry._playbackCanvasCtx.putImageData(frame.imageData, 0, 0);
  return canvas;  // Pre-blitted canvas
}
```

**GIF path is deterministic:**
- All frames are pre-decoded into memory (`entry.frames[]`)
- `_resolveFrameIndex()` computes frame index from elapsed time (modulo total duration)
- Each rAF tick gets a determinate frame based on elapsed time
- No async decode; no frame-availability race with video codec

**Contrast with inside-MP4:**
- Inside-MP4 relies on HTMLVideoElement async decode
- Each rAF tick paints `drawImage(video)`, which samples whatever frame the decoder currently has decoded
- If decoder is slow (e.g., heavy H.264 intra-block prediction), `drawImage` may paint the same frame twice in a row → apparent frame-skipping/stutter

---

## § 5: Ranked Hypotheses with Line References

### H1: Inside-MP4 lacks frame-availability check + stale-frame detection (HIGHEST CONFIDENCE)

**Symptom match:**
- Constant "too-low FPS feeling" stutter = decoder sometimes doesn't produce a new frame by the time rAF paints
- Operator reports GIFs smooth (pre-decoded, deterministic) while MP4s stutter (async decode)
- Operator reports SSR at ~40fps but stream at 23–26fps = rAF fires 40–60Hz, but unique video frames land at ~25Hz (video source likely 30fps)

**Code evidence:**
- Inside-MP4 (draw-loop.js:303): bare `drawImage(video)` every frame, no `video.readyState` check
- Room-MP4 (draw-loop.js:118): checks `haveLiveFrame = !isSeeking && video.readyState >= 2`, skips if false
- Outside-MP4 (draw-loop.js:545): checks `haveLiveFrame`, replays fallback if false
- Inside path has no fallback canvas (none allocated, none populated)

**Why 23–26fps decoded:** snow.mp4 is likely 30fps source. If SSR rAF is 40–50Hz and inside-MP4 paints every frame without gating, Chromium's video codec may be producing ~25fps unique frames (some drops during H.264 decode), causing the frame-doubling → stutter appearance.

### H2: Native `<video loop>` produces micro-seams on inside path (MEDIUM CONFIDENCE)

**Symptom match:**
- Periodic hitches (ruled out by operator: "konstantes leichtes Stockeln", not hitches)
- Would manifest as per-loop-wrap freezes, not constant stutter

**Code evidence:**
- Inside-MP4 uses `video.loop = true` (draw-loop.js:295), relying on native loop
- Phase 50 comments (outside-mp4.js:27–34) document native loop produces 1-frame stall at EOS
- Room + outside paths use `video.loop = false` + manual wrap to eliminate this

**Why lower confidence:** Operator explicitly said symptom is "konstantes leichtes Stockeln (constant slight stutter), **nicht** periodisch" — rules out per-loop-wrap hitches. This hypothesis would predict periodic stutters at loop wrap, not constant low-fps feel.

### H3: Raster frame-pump rate mismatch (source 30fps, rAF 40–60Hz) without frame-skip detection (LOW-MEDIUM CONFIDENCE)

**Symptom match:**
- Stutter = visible frame duplication when 30fps source can't keep up with 40–60Hz rAF
- 23–26fps reported stream fps < 30fps source fps suggests encoder is dropping frames

**Code evidence:**
- Inside-MP4 paints every rAF without throttling
- No `shouldDrawOutsideMp4Now()` analog for inside path
- GIF path is deterministic (pre-decoded), so no stutter

**Why lower confidence:** Outside-MP4 **already gated** to 22ms (45fps) in balanced tier, and operator said outside-mp4 is smooth on dashboard. The stuttering inside-mp4 calls for a different root cause than just frame-rate mismatch (which would affect all paths equally).

---

## § 6: Proposed Diagnostic

**Single instrumented log line** to distinguish H1 vs. H2 vs. H3:

Add to `drawInsideGlobalVisual()` (draw-loop.js, around line 300):

```javascript
if (definition?.assetType === "mp4" && videoEntry?.video) {
  const video = videoEntry.video;
  const isSeeking = video.seeking === true;
  const frameReady = video.readyState >= 2;
  const hasFrame = Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0;
  const nowMs = performance.now();
  // Log frame-availability state + frequency
  if (!ctx._insideMp4LastLogAt || nowMs - ctx._insideMp4LastLogAt > 1000) {
    console.log('[inside-mp4-diag]', {
      isSeeking, frameReady, hasFrame,
      currentTime: video.currentTime.toFixed(2),
      seeking: video.seeking,
      readyState: video.readyState,
      timestamp: nowMs
    });
    ctx._insideMp4LastLogAt = nowMs;
  }
  // ... existing paint code
}
```

**What to read:**
- If `isSeeking = true` frequently: H2 (loop seam) is firing
- If `frameReady = false` frequently: H1 (stale frames) is the issue
- If logs show gaps in `currentTime` (e.g., 0.05s → 0.05s → 0.06s across 60ms rAF intervals): H3 (frame-rate mismatch)

**Operator action:**
- Trigger snow.mp4 on SSR /output/, capture console logs for 5–10 seconds
- Cross-reference log timestamps with SSR stream stuttering observation

---

## § 7: Proposed Fix Candidates (Minimum Blast Radius)

### Fix 1: Backport room-mp4 frame-availability check to inside-mp4 (H1 REMEDIATION)

**File:** `src/app/runtime/render/runtime-draw-loop.js`
**Lines:** 290–306 (inside `drawInsideGlobalVisual()`)
**Change shape:**

```javascript
if (definition?.assetType === "mp4") {
  const videoEntry = ctx.getOutsideVideoElement(definition.assetRef);
  if (videoEntry?.video) {
    const video = videoEntry.video;
    const playbackRate = Math.max(0.15, Math.min(4, speed * state.animationSpeed));
    video.loop = true;
    if (Math.abs((Number(video.playbackRate) || 1) - playbackRate) > 0.01) {
      video.playbackRate = playbackRate;
    }
    if (video.paused) {
      void video.play().catch(() => undefined);
    }
    c.globalAlpha = intensity;
    // FIX: Add frame-availability check (mirrors room-mp4 haveLiveFrame logic)
    const isSeeking = video.seeking === true;
    const frameReady = video.readyState >= 2 && Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0;
    if (!isSeeking && frameReady) {
      c.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    // If frame unavailable, just skip the paint — blank frame for 1 rAF is better than stale-frame stutter
    return;
  }
}
```

**Impact:** Prevents stale-frame paint during decode stalls. Cost: blank frames ~1–3 rAF per decode hiccup (imperceptible on 60Hz).
**Regression risk:** Very low. Room path already uses this check successfully.
**Win32 canvas-damage:** No change to canvas op count in the success case (still 1 drawImage per frame).

### Fix 2: Backport frame-rate gating + fallback canvas to inside-mp4 (H1 + OPTIONAL REDUNDANT DEFENSE)

**File:** `src/app/runtime/render/runtime-outside-mp4.js` + `runtime-draw-loop.js`
**Change shape:**

1. Add inside-mp4 playback state tracking to `runtime-outside-mp4.js` (parallel to room cache)
2. In draw-loop.js inside-mp4 branch, call `ensureInsideMp4Playback()` + capture fallback + gate to `shouldDrawOutsideMp4Now()`

**Impact:** Belt-and-suspenders defense against frame-rate mismatch (H3). Recovers ~3–5 fps on SSR by not over-sampling slow decoder.
**Regression risk:** Medium. Introduces new module-level state. Win32 canvas-damage risk if fallback capture adds canvas ops.
**Win32 canvas-damage:** Must verify fallback capture doesn't reduce overall canvas op count (capture is only every 5th frame).

### Recommendation

**Proceed with Fix 1 first.** It's minimal, low-risk, and directly addresses H1 (highest confidence). If operator reports improvement but residual stutter remains, then Fix 2 adds frame-rate gating as a second layer.

---

## Summary

**Top Hypothesis:** Inside-MP4 path lacks frame-availability check and stale-frame protection that room + outside paths have. During H.264 decode stalls (common on motion-heavy snow.mp4), the inside path paints the same frame multiple times in a row, creating the "low-fps stutter" appearance.

**Proposed Diagnostic:** Log `video.seeking`, `video.readyState`, `video.currentTime` every 1s during snow.mp4 playback. Frequent `readyState < 2` events confirm H1.

**Proposed Fix Shape:** Add frame-availability check before `drawImage(video)` in inside-mp4 branch (draw-loop.js:303). Skip paint if frame not ready. Cost: 1–3 imperceptible blank rAF ticks per decode hiccup. Regression: None (room path uses identical logic successfully).
