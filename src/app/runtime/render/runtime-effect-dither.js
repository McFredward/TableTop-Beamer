// Bayer 4×4 ordered-dither helper for solid-color overlays.
//
// Phase 35 D-03-C1 (Track C). Returns a per-(hex, alpha, w, h) cached
// ImageData where each pixel's RGB is perturbed by a Bayer 4×4 threshold
// pattern in the range ±~0.47 LSB. The 8-bit-per-channel canvas alpha
// blender then samples the perturbed pixels via putImageData and the
// quantization step bands that used to appear at sub-1.0 alpha solid
// colors (operator-reported "Streifen") get masked into a ~16×16 ordered
// pattern. The pattern is structured (not noise), so it stays put on
// moving content — RESEARCH §C.2: blue-noise's spatial uniformity is
// nice for stills but produces visible moving patterns on animated
// overlays, while Bayer's structured weave is barely visible at 30 fps
// stream output and disappears entirely under H264 compression
// downstream of the canvas.
//
// Why dither at all: the underlying drawEffectVisual('solid-color')
// path was using `c.fillStyle = rgba(r,g,b,a); c.fillRect(...)`. The
// canvas backing buffer is 8-bit-per-channel; at sub-1.0 alpha the
// resulting blend produces step-quantized RGB values that are visible
// as Mach bands on smooth gradients, especially at low intensities.
// Sampling a per-pixel dithered ImageData via putImageData breaks
// each step into a 4×4 weave (effectively gaining ~2 bits of
// perceptual depth) without changing the average color.
//
// Cache key rationale (Pitfall 7): naively keying on the floating-point
// alpha would miss every frame for animations that pulse alpha (very
// common — solid-color rooms with intensity sliders animate smoothly).
// Quantizing to ~1% steps (Math.round(alpha * 100)) means the cache hit
// rate stays near 100% during a typical pulse, while the visual
// difference between 0.50 and 0.51 alpha is well below the 1-LSB
// dither amplitude.
//
// FIFO eviction at 256 entries caps worst-case memory at ~256 *
// (max-room-area * 4 bytes) ≈ 100 MB at 1080p (typical room ≪ this);
// keeps it bounded if some pathological caller drives unique keys.

// THE Bayer 4×4 matrix — public-domain since 1973 (Bayer's original
// "An Optimum Method for Two-Level Rendition of Continuous-Tone
// Pictures"). Reference: en.wikipedia.org/wiki/Ordered_dithering.
// Stored flat in row-major order — index = ((y & 3) << 2) | (x & 3).
const BAYER_4X4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];

const _ditherCache = new Map(); // key: "hex-alphaQ-w-h" → ImageData
const CACHE_MAX_ENTRIES = 256;

export function getDitheredSolidColorImageData({ hex, alpha, width, height }) {
  // Quantize alpha to ~1% steps (Pitfall 7 — cache hit-rate). 1% is
  // well below the 1-LSB dither amplitude, so visually identical to
  // the un-quantized version.
  const alphaQ = Math.round(alpha * 100);
  const key = `${hex}-${alphaQ}-${width}-${height}`;
  const cached = _ditherCache.get(key);
  if (cached) return cached;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a8 = Math.round(alpha * 255);

  const img = new ImageData(width, height);
  const data = img.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = BAYER_4X4[((y & 3) << 2) | (x & 3)];
      // Map Bayer 0..15 to a centered ±1-LSB perturbation. The Bayer
      // value is shifted to [-7.5, +7.5] then scaled to [-1, +1] by
      // dividing by 7.5. After Math.round() against the integer
      // source channel, this yields a 3-level pattern { r-1, r, r+1 }
      // distributed across the 16-pixel kernel — enough to break the
      // alpha-blend quantization step bands without shifting the
      // average color (the kernel sums to 0 by symmetry of 0..15).
      const d = (t - 7.5) / 7.5;
      const i = (y * width + x) * 4;
      data[i]     = Math.max(0, Math.min(255, Math.round(r + d)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g + d)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b + d)));
      data[i + 3] = a8;
    }
  }

  _ditherCache.set(key, img);

  // Simple FIFO eviction — Map iteration order is insertion order, so
  // keys().next().value is the oldest. No LRU complexity needed; the
  // cache hit pattern in practice is "small set of recent (hex, alpha,
  // size) tuples within a frame", and once the working set fits in
  // 256 entries the eviction path is never hit.
  if (_ditherCache.size > CACHE_MAX_ENTRIES) {
    const firstKey = _ditherCache.keys().next().value;
    _ditherCache.delete(firstKey);
  }

  return img;
}

// Exposed for testing and tooling inspection (test/phase-35-bayer-dither.test.mjs
// asserts the matrix shape if exported).
export { BAYER_4X4 };

// Phase 35-iter2 hotfix h3: clip-respecting variant.
//
// putImageData IGNORES the canvas clip path — it writes raw pixels straight
// to the destination buffer. The pre-Phase-35 `c.fillRect` respected the
// polygon-clip the caller had set up via `c.clip()`, so solid-color
// animations rendered ONLY inside the room polygon. Phase 35 Track C swapped
// fillRect → putImageData and broke the clip behaviour: solid-color
// animations now flood the bounding RECTANGLE of the room instead of the
// room polygon shape (operator-reported 2026-05-10).
//
// `c.drawImage(canvas, ...)` does respect the canvas clip path. So we
// expose a second helper that returns an OffscreenCanvas (or a regular
// HTMLCanvasElement when OffscreenCanvas is unavailable) with the dithered
// pixels already painted. The call site in runtime-effect-visuals.js
// switches from putImageData to drawImage.
//
// Cache strategy mirrors getDitheredSolidColorImageData: same key format,
// same FIFO eviction. A separate cache map because the two outputs are
// different types — the canvas takes more bytes per entry but creating
// it from cached ImageData is cheap (one putImageData on the offscreen).
const _ditherCanvasCache = new Map();

function makeOffscreenCanvas(width, height) {
  // Prefer OffscreenCanvas when the env supports it (Chrome ≥ 69, all
  // headful Chromium 131 builds we ship). Fall back to a detached
  // HTMLCanvasElement so the helper still works in older runtimes /
  // unit tests with the polyfill.
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
  }
  return null;
}

export function getDitheredSolidColorCanvas({ hex, alpha, width, height }) {
  const alphaQ = Math.round(alpha * 100);
  const key = `${hex}-${alphaQ}-${width}-${height}`;
  const cached = _ditherCanvasCache.get(key);
  if (cached) return cached;

  const canvas = makeOffscreenCanvas(width, height);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Reuse the ImageData helper so the dither math stays in one place.
  const img = getDitheredSolidColorImageData({ hex, alpha, width, height });
  ctx.putImageData(img, 0, 0);

  _ditherCanvasCache.set(key, canvas);
  if (_ditherCanvasCache.size > CACHE_MAX_ENTRIES) {
    const firstKey = _ditherCanvasCache.keys().next().value;
    _ditherCanvasCache.delete(firstKey);
  }
  return canvas;
}

// Side-effect: register on window for IIFE consumers (runtime-effect-visuals.js
// is a `<script defer>` IIFE on index.html and cannot use ES `import`. It looks
// up `window.TT_BEAMER_RUNTIME_EFFECT_DITHER.getDitheredSolidColorImageData(...)`
// lazily at draw time — module scripts execute before DOMContentLoaded so the
// global is set well before the first render-loop tick).
if (typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined") {
  globalThis.window.TT_BEAMER_RUNTIME_EFFECT_DITHER = {
    getDitheredSolidColorImageData,
    getDitheredSolidColorCanvas,
    BAYER_4X4,
  };
}
