// Unified Grid Projection — 2D-canvas mesh-warp fallback renderer.
//
// Sub-module of runtime-projection-mapping. Used when the GL renderer
// is unavailable (no WebGL context, ancient browser). Owns:
//  - Tmp-canvas state (`_warpTmpCanvas`, `_warpTmpCtx`).
//  - `drawAffineTriangle` (per-triangle clip + affine drawImage).
//  - `postDrawMeshWarp2D` (the 2D path that snapshots the source
//    canvas and redraws through the displaced grid).
//
// Reads grid via injected refs (getPoint + the grid object).
(() => {
  // Grid bindings injected at init time.
  let grid = null;
  let getPoint = () => ({ x: 0, y: 0 });

  let _warpTmpCanvas = null;
  let _warpTmpCtx = null;

  /**
   * Draw an affine-mapped source triangle into a dest triangle on `cctx`.
   * Uses clip() + setTransform() to perform the correct affine warp for
   * the one triangle, honoring all 3 corners (unlike drawImage rect mapping
   * which would lose 2 of the 4 cell corners).
   */
  function drawAffineTriangle(cctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
    const det = sx0 * (sy1 - sy2) - sy0 * (sx1 - sx2) + (sx1 * sy2 - sx2 * sy1);
    if (Math.abs(det) < 1e-10) return;
    const inv = 1 / det;

    const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) * inv;
    const c = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) * inv;
    const e = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) * inv;

    const b = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) * inv;
    const d = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) * inv;
    const f = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) * inv;

    // Inflate each triangle's clip polygon outward
    // by 4.0 px along the centroid normal + stroke the same clip
    // path before drawImage so the edge pixels are filled from the
    // source image. The 0.5-px inflate from v1 was too subtle to
    // hide the AA seams on MP4 content; 1.5 px overlaps neighbours
    // enough that the seam is painted over by the overlap. The
    // explicit stroke step paints a 2-px thick line from the
    // *source* image along the clip edge, so the seam pixels carry
    // image content instead of falling back to the canvas
    // clear-colour.
    //
    // Phase 30 B1 h7: bumped from 1.5 → 4.0. The 1.5px overlap is the
    // theoretical minimum to cover Canvas2D clip-AA halos (~1-1.5px),
    // but on Pi VC4 + projector scaling the effective halo width can be
    // 2-3px after browser CSS upscaling. 4.0px provides a comfortable
    // safety margin: adjacent triangles overlap by ~8px, fully covering
    // any AA halo without producing visible content discrepancies (the
    // overlap region samples the same source-edge content from both
    // triangles by construction). Only kicks in if GL falls back to 2D
    // (which the h7 GL stability changes are intended to prevent).
    const CX = (dx0 + dx1 + dx2) / 3;
    const CY = (dy0 + dy1 + dy2) / 3;
    const INFLATE = 4.0;
    const pushOut = (x, y) => {
      const vx = x - CX;
      const vy = y - CY;
      const len = Math.hypot(vx, vy);
      if (len < 1e-6) return [x, y];
      const scale = 1 + INFLATE / len;
      return [CX + vx * scale, CY + vy * scale];
    };
    const [px0, py0] = pushOut(dx0, dy0);
    const [px1, py1] = pushOut(dx1, dy1);
    const [px2, py2] = pushOut(dx2, dy2);

    cctx.save();
    cctx.beginPath();
    cctx.moveTo(px0, py0);
    cctx.lineTo(px1, py1);
    cctx.lineTo(px2, py2);
    cctx.closePath();
    cctx.clip();
    // Phase 30 B1 h12: LINEAR sampling (imageSmoothingEnabled=true).
    // The earlier h4-comment claimed symmetry with the GL fix at
    // gl-renderer:223-237 ("NEAREST → LINEAR"), but applied the
    // OPPOSITE direction here (LINEAR → NEAREST). That created a
    // mirror of the GL streifen problem in the 2D path: under
    // non-identity warp every triangle's affine transform discretises
    // fractional source coords differently per fragment; on shared
    // edges adjacent triangles round to different texels → 1-pixel
    // diagonal seams. INFLATE=4 already overlaps clip footprints by
    // ~8 px, so any clip-AA halo created by LINEAR sampling lives
    // inside an overlap region where the neighbouring triangle paints
    // identical source bytes (LINEAR is deterministic for identical
    // inputs). Net: LINEAR + INFLATE=4 is seam-free, NEAREST +
    // INFLATE=4 isn't.
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = "low"; // bilinear, fastest tier on Pi VC4
    cctx.transform(a, b, c, d, e, f);
    cctx.drawImage(img, 0, 0);
    cctx.restore();
  }

  // 2D-only mesh-warp path. The body below is the lines that used to
  // live at the tail of `postDrawMeshWarp` (after the GL fallback
  // branch) — extracted verbatim as the fallback module's entry
  // point. Source-text byte-identical pre/post move.
  function postDrawMeshWarp2D(canvas, canvasCtx) {
    const w = canvas.width;
    const h = canvas.height;

    if (!_warpTmpCanvas) {
      _warpTmpCanvas = document.createElement("canvas");
      _warpTmpCtx = _warpTmpCanvas.getContext("2d");
    }
    if (_warpTmpCanvas.width !== w || _warpTmpCanvas.height !== h) {
      _warpTmpCanvas.width = w;
      _warpTmpCanvas.height = h;
    }

    // Snapshot current content
    _warpTmpCtx.setTransform(1, 0, 0, 1, 0, 0);
    _warpTmpCtx.clearRect(0, 0, w, h);
    _warpTmpCtx.drawImage(canvas, 0, 0);

    // Clear and redraw through grid using triangulated affine warps.
    // Each cell is split into 2 triangles along the TL-BR diagonal so all
    // 4 corner displacements are honored (a plain rect drawImage would
    // ignore TR and BL).  Matches the triangulation used in remapPoint.
    canvasCtx.save();
    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
    canvasCtx.clearRect(0, 0, w, h);

    for (let row = 0; row < grid.srcYs.length - 1; row++) {
      for (let col = 0; col < grid.srcXs.length - 1; col++) {
        const sTLx = grid.srcXs[col] * w;
        const sTLy = grid.srcYs[row] * h;
        const sTRx = grid.srcXs[col + 1] * w;
        const sTRy = grid.srcYs[row] * h;
        const sBLx = grid.srcXs[col] * w;
        const sBLy = grid.srcYs[row + 1] * h;
        const sBRx = grid.srcXs[col + 1] * w;
        const sBRy = grid.srcYs[row + 1] * h;

        const dTL = getPoint(row, col);
        const dTR = getPoint(row, col + 1);
        const dBL = getPoint(row + 1, col);
        const dBR = getPoint(row + 1, col + 1);
        // Phase 30 B1 h12: pixel-snap destination vertices, mirroring
        // the GL path (runtime-projection-gl-renderer.js:413-415).
        // Without this, fractional dst coords mean the rasterizer's
        // diamond-exit rule evaluates coverage from each triangle's
        // own direction → adjacent triangles can leave a 1-pixel gap
        // OR overlap by 1 pixel at the shared edge. Snapping to
        // integer pixels makes shared-edge coverage unambiguous and
        // closes the second precision-source for 2D streifen
        // (alongside the LINEAR-sampling fix in drawAffineTriangle).
        const dTLx = Math.round(dTL.x * w), dTLy = Math.round(dTL.y * h);
        const dTRx = Math.round(dTR.x * w), dTRy = Math.round(dTR.y * h);
        const dBLx = Math.round(dBL.x * w), dBLy = Math.round(dBL.y * h);
        const dBRx = Math.round(dBR.x * w), dBRy = Math.round(dBR.y * h);

        // Triangle 1: TL, TR, BR
        drawAffineTriangle(
          canvasCtx, _warpTmpCanvas,
          sTLx, sTLy, sTRx, sTRy, sBRx, sBRy,
          dTLx, dTLy, dTRx, dTRy, dBRx, dBRy,
        );
        // Triangle 2: TL, BR, BL
        drawAffineTriangle(
          canvasCtx, _warpTmpCanvas,
          sTLx, sTLy, sBRx, sBRy, sBLx, sBLy,
          dTLx, dTLy, dBRx, dBRy, dBLx, dBLy,
        );
      }
    }

    canvasCtx.restore();
  }

  function init(dependencies) {
    if (dependencies?.grid) grid = dependencies.grid;
    if (typeof dependencies?.getPoint === "function") getPoint = dependencies.getPoint;
  }

  window.TT_BEAMER_RUNTIME_PROJECTION_2D_FALLBACK_RENDERER = {
    init,
    postDrawMeshWarp2D,
  };
})();
