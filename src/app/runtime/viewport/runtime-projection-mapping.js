// Phase 19-4: Unified Grid Projection System.
//
// Replaces the dual 4-corner + grid-mesh approach with ONE unified grid.
// The grid IS the projection — corners, edges, and interior points are
// all part of the same grid.  Default 4x4 = 5x5 = 25 control points.
//
// - The 4 corner points control the CSS matrix3d perspective transform
//   on .stage (same homography math as Phase 19-2).
// - Edge points are constrained to their axis.
// - Interior points move freely for local canvas distortion.
// - Grid lines are draggable as whole rows/columns.
// - Right-click context menu to add/remove lines.
//
// Post-draw mesh warp: after the main draw() completes, if any interior
// points are displaced, a per-cell drawImage pass deforms the canvas
// content.  Zero overhead when no interior displacements exist.
//
// Persistence: localStorage key "tt-beamer.projection-mapping-v2".
// Falls back to old key "tt-beamer.projection-mapping.corners" for
// migration of the 4-corner positions.
(() => {
  let ctx = null;

  // ── State ───────────────────────────────────────────────────────────────────
  //
  // ONE unified grid system. Each intersection stores its own {x, y} position.
  // The grid deforms the canvas content via per-cell drawImage (mesh warp).
  // No separate CSS perspective — everything is canvas mesh warp.
  //
  // points[row][col] = { x, y } in normalized canvas coords (0-1).
  // Default: evenly spaced (srcXs[col], srcYs[row]).
  // Intersection handles: freely draggable in X+Y.
  // Line handles (between intersections): move entire row/column in one axis.

  const DEFAULT_COUNT = 5; // 5 lines = 4 columns/rows

  function makeEvenLines(n) {
    const lines = [];
    for (let i = 0; i < n; i++) lines.push(i / (n - 1));
    return lines;
  }

  const grid = {
    srcXs: makeEvenLines(DEFAULT_COUNT),
    srcYs: makeEvenLines(DEFAULT_COUNT),
    // points[row][col] = { x, y }. Built from srcXs/srcYs initially.
    points: null, // initialized in buildDefaultPoints()
  };

  function buildDefaultPoints() {
    const pts = [];
    for (let row = 0; row < grid.srcYs.length; row++) {
      pts[row] = [];
      for (let col = 0; col < grid.srcXs.length; col++) {
        pts[row][col] = { x: grid.srcXs[col], y: grid.srcYs[row] };
      }
    }
    grid.points = pts;
  }
  buildDefaultPoints();

  const CORNER_KEYS = ["topLeft", "topRight", "bottomRight", "bottomLeft"];

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getPoint(row, col) {
    return grid.points[row]?.[col] ?? { x: grid.srcXs[col] ?? 0, y: grid.srcYs[row] ?? 0 };
  }

  function setPoint(row, col, x, y) {
    if (grid.points[row]) grid.points[row][col] = { x, y };
  }

  /** Check whether any points differ from their default positions. */
  function hasGridDisplacements() {
    // Phase 22 W5 fix: tolerate sub-pixel float drift in saved grids
    // without triggering the full mesh-warp pass. The mesh-warp is
    // fundamentally seam-prone on MP4 content (per-triangle affine
    // transforms diverge in the clip-overlap region and sample
    // slightly different source colours), so only run it when the
    // user has a displacement big enough to matter. 0.001 normalized
    // ≈ 1 px on a 1000-px canvas — below that we stay identity.
    const THRESHOLD = 0.001;
    for (let row = 0; row < grid.srcYs.length; row++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const pt = getPoint(row, col);
        if (Math.abs(pt.x - grid.srcXs[col]) > THRESHOLD || Math.abs(pt.y - grid.srcYs[row]) > THRESHOLD) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Remap a normalized point (0-1) through the grid distortion.
   * Splits each cell into 2 triangles along the TL-BR diagonal and uses
   * barycentric coords within the triangle. This matches the canvas mesh
   * warp (which uses the same triangulation) so SVG contours and canvas
   * animations stay perfectly aligned. Returns { x, y } in 0-1 range.
   */
  function remapPoint(nx, ny) {
    if (!hasGridDisplacements()) return { x: nx, y: ny };
    let ci = 0, ri = 0;
    for (let i = 0; i < grid.srcXs.length - 1; i++) {
      if (nx <= grid.srcXs[i + 1] || i === grid.srcXs.length - 2) { ci = i; break; }
    }
    for (let i = 0; i < grid.srcYs.length - 1; i++) {
      if (ny <= grid.srcYs[i + 1] || i === grid.srcYs.length - 2) { ri = i; break; }
    }
    const sx = grid.srcXs[ci + 1] - grid.srcXs[ci];
    const sy = grid.srcYs[ri + 1] - grid.srcYs[ri];
    const tx = sx > 1e-10 ? (nx - grid.srcXs[ci]) / sx : 0;
    const ty = sy > 1e-10 ? (ny - grid.srcYs[ri]) / sy : 0;
    const tl = getPoint(ri, ci);
    const tr = getPoint(ri, ci + 1);
    const bl = getPoint(ri + 1, ci);
    const br = getPoint(ri + 1, ci + 1);
    // Split cell by TL-BR diagonal:
    //  tx >= ty → upper-right triangle (TL, TR, BR)
    //  tx <  ty → lower-left  triangle (TL, BR, BL)
    if (tx >= ty) {
      const aTL = 1 - tx;
      const aTR = tx - ty;
      const aBR = ty;
      return {
        x: aTL * tl.x + aTR * tr.x + aBR * br.x,
        y: aTL * tl.y + aTR * tr.y + aBR * br.y,
      };
    } else {
      const aTL = 1 - ty;
      const aBR = tx;
      const aBL = ty - tx;
      return {
        x: aTL * tl.x + aBR * br.x + aBL * bl.x,
        y: aTL * tl.y + aBR * br.y + aBL * bl.y,
      };
    }
  }

  // ── Apply transform (no-op — all warping is done via canvas mesh) ──────────

  function applyTransform() {
    // Phase 19 unified grid warps via canvas mesh (see postDrawMeshWarp) —
    // no CSS transform is applied from this module. We must NOT touch
    // stage.style.transform here, because the CONTROL client's .stage
    // carries the zoom/pan CSS rule `translate(var(--stage-pan-x), …)
    // scale(var(--stage-zoom-scale))` and writing `transform: none`
    // would make mouse-wheel/pinch zoom invisible.
  }

  // ── Post-draw mesh warp ────────────────────────────────────────────────────
  //
  // Called from the draw loop after all rendering completes.
  // If any non-corner grid points are displaced, takes a snapshot of the
  // canvas content and redraws it through the displaced grid mesh.

  let _warpTmpCanvas = null;
  let _warpTmpCtx = null;

  // Phase 22 W5 v3: WebGL mesh-warp state. The 2D-canvas per-triangle
  // clip+drawImage approach produced seams because per-triangle affine
  // transforms and clip-boundary AA disagree at shared edges. GL
  // samples a single texture with per-vertex UVs — no clipping, no
  // seam. Falls back to the 2D path when WebGL is unavailable.
  let _glCanvas = null;
  let _gl = null;
  let _glProgram = null;
  let _glTexture = null;
  let _glPosBuf = null;
  let _glUVBuf = null;
  let _glIdxBuf = null;
  let _glInitTried = false;
  let _glInitOk = false;
  let _glAttrPos = -1;
  let _glAttrUV = -1;
  let _glUniTex = null;
  // Cached typed arrays so we don't allocate fresh Float32Array /
  // Uint16Array every frame on RPi. Sized for the current grid; we
  // reallocate only when rows/cols change.
  let _glCachedRows = 0;
  let _glCachedCols = 0;
  let _glPositions = null;
  let _glUVs = null;
  let _glIndices = null;
  let _glIndexCount = 0;

  function _initMeshWarpGL() {
    if (_glInitTried) return _glInitOk;
    _glInitTried = true;
    try {
      _glCanvas = document.createElement("canvas");
      // Phase 22 W5 v3: RPi/Chromium lean WebGL options — no AA buffer
      // (we don't need multisampling since the mesh is artifact-free),
      // no premultiplied alpha (so texImage2D interprets the canvas
      // colour buffer directly), and lowPower hint so the RPi's
      // VideoCore can schedule the context on its integrated path
      // without spinning a discrete GPU (no-op on RPi but correct).
      const glOpts = {
        premultipliedAlpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
        desynchronized: true,
      };
      _gl = _glCanvas.getContext("webgl", glOpts)
         || _glCanvas.getContext("experimental-webgl", glOpts);
      if (!_gl) return false;
      // Drop the context cleanly on GPU reset (happens on RPi under
      // thermal throttle or external display resets). Next frame will
      // retry init; if that also fails we drop to the 2D fallback.
      _glCanvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        _glInitOk = false;
        _glInitTried = false;
        _gl = null;
        _glProgram = null;
        _glTexture = null;
      }, false);
      const compile = (src, type) => {
        const s = _gl.createShader(type);
        _gl.shaderSource(s, src);
        _gl.compileShader(s);
        if (!_gl.getShaderParameter(s, _gl.COMPILE_STATUS)) {
          console.error("mesh-warp shader error:", _gl.getShaderInfoLog(s));
          return null;
        }
        return s;
      };
      const vs = compile(
        "attribute vec2 aPos;\nattribute vec2 aUV;\nvarying vec2 vUV;\n"
        + "void main(){ gl_Position = vec4(aPos, 0.0, 1.0); vUV = aUV; }",
        _gl.VERTEX_SHADER,
      );
      const fs = compile(
        "precision mediump float;\nvarying vec2 vUV;\nuniform sampler2D uTex;\n"
        + "void main(){ gl_FragColor = texture2D(uTex, vUV); }",
        _gl.FRAGMENT_SHADER,
      );
      if (!vs || !fs) return false;
      _glProgram = _gl.createProgram();
      _gl.attachShader(_glProgram, vs);
      _gl.attachShader(_glProgram, fs);
      _gl.linkProgram(_glProgram);
      if (!_gl.getProgramParameter(_glProgram, _gl.LINK_STATUS)) {
        console.error("mesh-warp link error:", _gl.getProgramInfoLog(_glProgram));
        return false;
      }
      _gl.useProgram(_glProgram);
      _glAttrPos = _gl.getAttribLocation(_glProgram, "aPos");
      _glAttrUV = _gl.getAttribLocation(_glProgram, "aUV");
      _glUniTex = _gl.getUniformLocation(_glProgram, "uTex");
      _glTexture = _gl.createTexture();
      _gl.bindTexture(_gl.TEXTURE_2D, _glTexture);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
      _glPosBuf = _gl.createBuffer();
      _glUVBuf = _gl.createBuffer();
      _glIdxBuf = _gl.createBuffer();
      _glInitOk = true;
      return true;
    } catch (error) {
      console.error("mesh-warp GL init failed:", error);
      return false;
    }
  }

  function _postDrawMeshWarpGL(canvas, canvasCtx) {
    if (!_initMeshWarpGL()) return false;

    const w = canvas.width;
    const h = canvas.height;
    if (_glCanvas.width !== w || _glCanvas.height !== h) {
      _glCanvas.width = w;
      _glCanvas.height = h;
    }

    _gl.viewport(0, 0, w, h);
    _gl.useProgram(_glProgram);
    _gl.bindTexture(_gl.TEXTURE_2D, _glTexture);
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
    _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    try {
      // Phase 23 W3: upload the source canvas DIRECTLY. The previous
      // path bounced through a 2D temp canvas (`_warpTmpCanvas`) which
      // cost an extra full-canvas memcpy on the CPU side every frame
      // (~5 ms on a 1080p Pi 4). texImage2D accepts HTMLCanvasElement
      // per the WebGL spec, so the temp hop is pure overhead.
      _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, canvas);
    } catch (error) {
      console.error("mesh-warp texImage2D failed:", error);
      return false;
    }

    const cols = grid.srcXs.length;
    const rows = grid.srcYs.length;
    const vertexCount = rows * cols;
    const triCount = (rows - 1) * (cols - 1) * 2;

    // Reallocate the cached typed arrays only when grid resolution
    // changes (rare — happens when user inserts/removes grid lines).
    // Per-frame they're reused, so we don't trigger fresh GC churn
    // on the RPi.
    if (_glCachedRows !== rows || _glCachedCols !== cols
        || !_glPositions || !_glUVs || !_glIndices) {
      _glPositions = new Float32Array(vertexCount * 2);
      _glUVs = new Float32Array(vertexCount * 2);
      _glIndices = new Uint16Array(triCount * 3);
      _glIndexCount = _glIndices.length;
      _glCachedRows = rows;
      _glCachedCols = cols;
      // Build indices once for this grid resolution.
      let ii = 0;
      for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
          const tl = row * cols + col;
          const tr = tl + 1;
          const bl = tl + cols;
          const br = bl + 1;
          _glIndices[ii++] = tl; _glIndices[ii++] = tr; _glIndices[ii++] = br;
          _glIndices[ii++] = tl; _glIndices[ii++] = br; _glIndices[ii++] = bl;
        }
      }
      _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _glIdxBuf);
      _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, _glIndices, _gl.STATIC_DRAW);
    }

    // Positions + UVs are recomputed each frame so handle drags +
    // grid-line drags reflect immediately. Both arrays are tiny
    // (~50 floats for a 4×4 grid) so the cost is microscopic next
    // to the texImage2D upload.
    let vi = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const pt = getPoint(row, col);
        // NDC: x in [-1,1], y flipped via UNPACK_FLIP_Y_WEBGL.
        _glPositions[vi] = pt.x * 2 - 1;
        _glPositions[vi + 1] = 1 - pt.y * 2;
        _glUVs[vi] = grid.srcXs[col];
        // With UNPACK_FLIP_Y_WEBGL = true the texture's V axis is
        // flipped, so use (1 - grid.srcYs[row]) to keep source Y
        // aligned with destination Y.
        _glUVs[vi + 1] = 1 - grid.srcYs[row];
        vi += 2;
      }
    }

    _gl.bindBuffer(_gl.ARRAY_BUFFER, _glPosBuf);
    _gl.bufferData(_gl.ARRAY_BUFFER, _glPositions, _gl.DYNAMIC_DRAW);
    _gl.enableVertexAttribArray(_glAttrPos);
    _gl.vertexAttribPointer(_glAttrPos, 2, _gl.FLOAT, false, 0, 0);

    _gl.bindBuffer(_gl.ARRAY_BUFFER, _glUVBuf);
    _gl.bufferData(_gl.ARRAY_BUFFER, _glUVs, _gl.DYNAMIC_DRAW);
    _gl.enableVertexAttribArray(_glAttrUV);
    _gl.vertexAttribPointer(_glAttrUV, 2, _gl.FLOAT, false, 0, 0);

    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _glIdxBuf);
    _gl.activeTexture(_gl.TEXTURE0);
    _gl.bindTexture(_gl.TEXTURE_2D, _glTexture);
    _gl.uniform1i(_glUniTex, 0);

    _gl.clearColor(0, 0, 0, 0);
    _gl.clear(_gl.COLOR_BUFFER_BIT);
    _gl.drawElements(_gl.TRIANGLES, _glIndexCount, _gl.UNSIGNED_SHORT, 0);

    // Blit the GL warp result back onto fx-canvas (the visible 2D
    // surface). This readback is unfortunately needed because the rest
    // of the rendering pipeline composites against fx-canvas. A
    // direct-GL-overlay variant was tried but produced a black /output/
    // when the source canvas couldn't be sampled cleanly — needs more
    // investigation before re-enabling.
    canvasCtx.save();
    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
    canvasCtx.clearRect(0, 0, w, h);
    canvasCtx.drawImage(_glCanvas, 0, 0);
    canvasCtx.restore();
    return true;
  }

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

    // Phase 22 W5 v2: inflate each triangle's clip polygon outward
    // by 1.5 px along the centroid normal + stroke the same clip
    // path before drawImage so the edge pixels are filled from the
    // source image. The 0.5-px inflate from v1 was too subtle to
    // hide the AA seams on MP4 content; 1.5 px overlaps neighbours
    // enough that the seam is painted over by the overlap. The
    // explicit stroke step paints a 2-px thick line from the
    // *source* image along the clip edge, so the seam pixels carry
    // image content instead of falling back to the canvas
    // clear-colour.
    const CX = (dx0 + dx1 + dx2) / 3;
    const CY = (dy0 + dy1 + dy2) / 3;
    const INFLATE = 1.5;
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
    // Keep bilinear filtering on so the warp is smooth at the
    // seams instead of nearest-neighbor-aliased.
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = "high";
    cctx.transform(a, b, c, d, e, f);
    cctx.drawImage(img, 0, 0);
    cctx.restore();
  }

  function postDrawMeshWarp(canvas, canvasCtx) {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    if (!hasGridDisplacements()) return;

    // Phase 22 W5 v3: WebGL path eliminates the per-triangle clip
    // seams that were visible on MP4 content. Falls back to the 2D
    // path below only if GL init fails (ancient browser / no GPU).
    if (_postDrawMeshWarpGL(canvas, canvasCtx)) return;

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
        const dTLx = dTL.x * w, dTLy = dTL.y * h;
        const dTRx = dTR.x * w, dTRy = dTR.y * h;
        const dBLx = dBL.x * w, dBLy = dBL.y * h;
        const dBRx = dBR.x * w, dBRy = dBR.y * h;

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

  // ── Handle UI ──────────────────────────────────────────────────────────────

  let handleElements = [];    // All grid point handle divs
  let lineCanvas = null;      // Canvas overlay for grid lines
  let lineCtx = null;
  let handlesVisible = false;
  let dragState = null;       // { row, col, startX, startY, startPtX, startPtY }
  let activeHandleKey = null; // "row-col" of selected handle for arrow keys
  let contextMenu = null;     // Context menu DOM element

  // Grid line drag state
  let lineDragState = null;
  // Whole-grid pan state (click on empty area + drag)
  let panDragState = null;
  // Rotate state — corner handles can rotate the whole grid around its centroid
  let rotateDragState = null;
  let rotateHandleElements = [];
  const LINE_HIT_THRESHOLD = 15; // px

  // ── Undo stack (grid state snapshots) ──────────────────────────────────────
  const MAX_UNDO = 50;
  let undoStack = [];

  function snapshotGridState() {
    return {
      srcXs: grid.srcXs.slice(),
      srcYs: grid.srcYs.slice(),
      points: grid.points.map((row) => row.map((p) => ({ x: p.x, y: p.y }))),
    };
  }

  function restoreGridSnapshot(snap) {
    if (!snap) return;
    grid.srcXs = snap.srcXs.slice();
    grid.srcYs = snap.srcYs.slice();
    grid.points = snap.points.map((row) => row.map((p) => ({ x: p.x, y: p.y })));
  }

  function pushUndo() {
    undoStack.push(snapshotGridState());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function clearUndo() {
    undoStack = [];
  }

  function undo() {
    if (undoStack.length === 0) return;
    restoreGridSnapshot(undoStack.pop());
    saveToLocalStorage();
    if (handlesVisible) {
      rebuildHandleElements();
      positionRotateHandles();
      drawLines();
    }
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function createHandles() {
    if (handlesVisible) return;
    handlesVisible = true;

    // Grid line canvas overlay — pointer-events enabled for line dragging
    lineCanvas = document.createElement("canvas");
    lineCanvas.id = "projection-grid-line-canvas";
    lineCanvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:auto;z-index:9997;cursor:default;outline:none;";
    lineCanvas.tabIndex = 0; // Make focusable for keyboard events
    document.body.appendChild(lineCanvas);
    lineCtx = lineCanvas.getContext("2d");

    lineCanvas.addEventListener("pointerdown", onLinePointerDown);
    lineCanvas.addEventListener("pointermove", onLineHover);
    lineCanvas.addEventListener("contextmenu", onContextMenu);

    rebuildHandleElements();
    drawLines();
  }

  function removeHandles() {
    if (!handlesVisible) return;
    handlesVisible = false;

    for (const el of handleElements) {
      el.removeEventListener("pointerdown", onHandlePointerDown);
      el.remove();
    }
    handleElements = [];

    for (const el of rotateHandleElements) {
      el.removeEventListener("pointerdown", onRotateHandlePointerDown);
      el.remove();
    }
    rotateHandleElements = [];

    if (lineCanvas) {
      lineCanvas.removeEventListener("pointerdown", onLinePointerDown);
      lineCanvas.removeEventListener("pointermove", onLineHover);
      lineCanvas.removeEventListener("contextmenu", onContextMenu);
      lineCanvas.remove();
      lineCanvas = null;
      lineCtx = null;
    }

    dismissContextMenu();
  }

  function rebuildHandleElements() {
    // Remove old handles
    for (const el of handleElements) {
      el.removeEventListener("pointerdown", onHandlePointerDown);
      el.remove();
    }
    handleElements = [];

    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    // Create handles at ALL grid intersections — freely draggable
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const el = document.createElement("div");
        el.className = "projection-corner-handle";
        el.dataset.gridRow = String(row);
        el.dataset.gridCol = String(col);
        const size = 18;
        el.style.cssText = `
          position: fixed;
          width: ${size}px; height: ${size}px;
          border-radius: 50%;
          background: rgba(0, 220, 200, 0.85);
          border: 2px solid rgba(255, 255, 255, 0.9);
          cursor: grab;
          z-index: 9999;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          transform: translate(-50%, -50%);
        `;

        el.addEventListener("pointerdown", onHandlePointerDown);
        document.body.appendChild(el);
        handleElements.push(el);
      }
    }

    rebuildRotateHandles();
    positionHandles();
    positionRotateHandles();
  }

  // ── Rotate handles (one per corner — rotate whole grid around centroid) ────

  // corner keys: TL, TR, BR, BL
  const ROTATE_CORNERS = [
    { key: "TL", rowFn: () => 0,                          colFn: () => 0,                          offX: -30, offY: -30 },
    { key: "TR", rowFn: () => 0,                          colFn: () => grid.srcXs.length - 1,      offX:  30, offY: -30 },
    { key: "BR", rowFn: () => grid.srcYs.length - 1,      colFn: () => grid.srcXs.length - 1,      offX:  30, offY:  30 },
    { key: "BL", rowFn: () => grid.srcYs.length - 1,      colFn: () => 0,                          offX: -30, offY:  30 },
  ];

  function rebuildRotateHandles() {
    for (const el of rotateHandleElements) {
      el.removeEventListener("pointerdown", onRotateHandlePointerDown);
      el.remove();
    }
    rotateHandleElements = [];
    for (const corner of ROTATE_CORNERS) {
      const el = document.createElement("div");
      el.className = "projection-rotate-handle";
      el.dataset.rotateCorner = corner.key;
      el.textContent = "↻";
      const size = 22;
      el.style.cssText = `
        position: fixed;
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: rgba(255, 160, 30, 0.9);
        border: 2px solid rgba(255, 255, 255, 0.95);
        color: #fff;
        font-size: 14px;
        font-weight: bold;
        line-height: ${size - 4}px;
        text-align: center;
        cursor: crosshair;
        z-index: 10000;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        transform: translate(-50%, -50%);
      `;
      el.addEventListener("pointerdown", onRotateHandlePointerDown);
      document.body.appendChild(el);
      rotateHandleElements.push(el);
    }
  }

  function positionRotateHandles() {
    if (rotateHandleElements.length !== ROTATE_CORNERS.length) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < ROTATE_CORNERS.length; i++) {
      const c = ROTATE_CORNERS[i];
      const row = c.rowFn();
      const col = c.colFn();
      const pt = getPoint(row, col);
      rotateHandleElements[i].style.left = `${pt.x * vw + c.offX}px`;
      rotateHandleElements[i].style.top = `${pt.y * vh + c.offY}px`;
    }
  }

  function onRotateHandlePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    pushUndo();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Centroid of all grid points (in pixel coords)
    let cx = 0, cy = 0, n = 0;
    for (let r = 0; r < grid.srcYs.length; r++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const p = grid.points[r][col];
        cx += p.x; cy += p.y; n++;
      }
    }
    cx = (cx / n) * vw;
    cy = (cy / n) * vh;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const allStartPts = [];
    for (let r = 0; r < grid.srcYs.length; r++) {
      allStartPts[r] = [];
      for (let col = 0; col < grid.srcXs.length; col++) {
        allStartPts[r][col] = { ...grid.points[r][col] };
      }
    }
    rotateDragState = { cx, cy, startAngle, allStartPts };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.addEventListener("pointermove", onRotateDragMove);
    document.addEventListener("pointerup", onRotateDragEnd);
    document.addEventListener("pointercancel", onRotateDragEnd);
  }

  function onRotateDragMove(e) {
    if (!rotateDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { cx, cy, startAngle, allStartPts } = rotateDragState;
    const cur = Math.atan2(e.clientY - cy, e.clientX - cx);
    const delta = cur - startAngle;
    const cosD = Math.cos(delta);
    const sinD = Math.sin(delta);
    // Rotate each point around centroid (in pixel space to keep aspect)
    for (let r = 0; r < grid.srcYs.length; r++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const p = allStartPts[r][col];
        const pxAbs = p.x * vw - cx;
        const pyAbs = p.y * vh - cy;
        const rxAbs = pxAbs * cosD - pyAbs * sinD;
        const ryAbs = pxAbs * sinD + pyAbs * cosD;
        grid.points[r][col].x = (rxAbs + cx) / vw;
        grid.points[r][col].y = (ryAbs + cy) / vh;
      }
    }
    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onRotateDragEnd() {
    if (!rotateDragState) return;
    rotateDragState = null;
    document.removeEventListener("pointermove", onRotateDragMove);
    document.removeEventListener("pointerup", onRotateDragEnd);
    document.removeEventListener("pointercancel", onRotateDragEnd);
    saveToLocalStorage();
  }

  function positionHandles() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const el = handleElements[idx];
        if (el) {
          const pt = getPoint(row, col);
          el.style.left = `${pt.x * vw}px`;
          el.style.top = `${pt.y * vh}px`;
          const key = `${row}-${col}`;
          if (key === activeHandleKey) {
            el.style.background = "rgba(255, 200, 30, 0.95)";
          } else {
            el.style.background = "rgba(0, 220, 200, 0.85)";
          }
        }
        idx++;
      }
    }
  }

  function drawLines() {
    if (!lineCanvas || !lineCtx) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    lineCanvas.width = vw * dpr;
    lineCanvas.height = vh * dpr;
    lineCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lineCtx.clearRect(0, 0, vw, vh);

    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    // Draw horizontal grid lines
    for (let row = 0; row < rows; row++) {
      const isEdge = row === 0 || row === rows - 1;
      lineCtx.strokeStyle = isEdge ? "rgba(220, 30, 30, 0.7)" : "rgba(0, 220, 180, 0.45)";
      lineCtx.lineWidth = isEdge ? 2 : 1;
      lineCtx.beginPath();
      for (let col = 0; col < cols; col++) {
        const pt = getPoint(row, col);
        const px = pt.x * vw;
        const py = pt.y * vh;
        if (col === 0) lineCtx.moveTo(px, py);
        else lineCtx.lineTo(px, py);
      }
      lineCtx.stroke();
    }

    // Draw vertical grid lines
    for (let col = 0; col < cols; col++) {
      const isEdge = col === 0 || col === cols - 1;
      lineCtx.strokeStyle = isEdge ? "rgba(220, 30, 30, 0.7)" : "rgba(0, 220, 180, 0.45)";
      lineCtx.lineWidth = isEdge ? 2 : 1;
      lineCtx.beginPath();
      for (let row = 0; row < rows; row++) {
        const pt = getPoint(row, col);
        const px = pt.x * vw;
        const py = pt.y * vh;
        if (row === 0) lineCtx.moveTo(px, py);
        else lineCtx.lineTo(px, py);
      }
      lineCtx.stroke();
    }

    // Draw drag-handle indicators BETWEEN intersections on each line segment
    // Horizontal lines: ↕ badges between each pair of adjacent column intersections
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const p1 = getPoint(row, col);
        const p2 = getPoint(row, col + 1);
        const px = ((p1.x + p2.x) / 2) * vw;
        const py = ((p1.y + p2.y) / 2) * vh;
        lineCtx.fillStyle = "rgba(0, 220, 180, 0.7)";
        lineCtx.beginPath();
        lineCtx.roundRect(px - 16, py - 8, 32, 16, 4);
        lineCtx.fill();
        lineCtx.fillStyle = "#fff";
        lineCtx.font = "bold 11px sans-serif";
        lineCtx.textAlign = "center";
        lineCtx.textBaseline = "middle";
        lineCtx.fillText("↕", px, py);
      }
    }
    // Vertical lines: ↔ badges between each pair of adjacent row intersections
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows - 1; row++) {
        const p1 = getPoint(row, col);
        const p2 = getPoint(row + 1, col);
        const px = ((p1.x + p2.x) / 2) * vw;
        const py = ((p1.y + p2.y) / 2) * vh;
        lineCtx.fillStyle = "rgba(0, 220, 180, 0.7)";
        lineCtx.beginPath();
        lineCtx.roundRect(px - 8, py - 16, 16, 32, 4);
        lineCtx.fill();
        lineCtx.fillStyle = "#fff";
        lineCtx.font = "bold 11px sans-serif";
        lineCtx.textAlign = "center";
        lineCtx.textBaseline = "middle";
        lineCtx.fillText("↔", px, py);
      }
    }

    // Filled quad from corners (semi-transparent)
    lineCtx.fillStyle = "rgba(255, 50, 50, 0.06)";
    lineCtx.beginPath();
    const lastRow = rows - 1;
    const lastCol = cols - 1;
    const quadCorners = [
      getPoint(0, 0),
      getPoint(0, cols - 1),
      getPoint(rows - 1, cols - 1),
      getPoint(rows - 1, 0),
    ];
    for (let i = 0; i < 4; i++) {
      const px = quadCorners[i].x * vw;
      const py = quadCorners[i].y * vh;
      if (i === 0) lineCtx.moveTo(px, py);
      else lineCtx.lineTo(px, py);
    }
    lineCtx.closePath();
    lineCtx.fill();
  }

  // ── Handle drag ────────────────────────────────────────────────────────────

  function onHandlePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const row = Number(e.currentTarget.dataset.gridRow);
    const col = Number(e.currentTarget.dataset.gridCol);
    const pt = getPoint(row, col);

    activeHandleKey = `${row}-${col}`;
    pushUndo();

    // Snapshot ALL point positions at drag start for proportional edge scaling
    const allStartPts = [];
    for (let r = 0; r < grid.srcYs.length; r++) {
      allStartPts[r] = [];
      for (let c = 0; c < grid.srcXs.length; c++) {
        const p = getPoint(r, c);
        allStartPts[r][c] = { x: p.x, y: p.y };
      }
    }
    dragState = {
      row,
      col,
      startX: e.clientX,
      startY: e.clientY,
      startPtX: pt.x,
      startPtY: pt.y,
      allStartPts,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";

    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragEnd);

    positionHandles();
  }

  function onDragMove(e) {
    if (!dragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx = (e.clientX - dragState.startX) / vw;
    const dy = (e.clientY - dragState.startY) / vh;

    const newX = Math.max(0, Math.min(1, dragState.startPtX + dx));
    const newY = Math.max(0, Math.min(1, dragState.startPtY + dy));
    setPoint(dragState.row, dragState.col, newX, newY);

    // If this is an edge point, proportionally scale all inner points
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    const lastRow = rows - 1;
    const lastCol = cols - 1;
    const r = dragState.row;
    const c = dragState.col;
    const sp = dragState.allStartPts;

    const isEdge = r === 0 || r === lastRow || c === 0 || c === lastCol;
    if (isEdge) {
      // Compute new bounding box from all 4 edges (using their current positions)
      // For X: left edge = avg of col 0 points, right edge = avg of last col points
      // Simpler: use the actual moved point to determine the scale
      // Scale X: if col=0 or col=lastCol moved, remap all inner cols proportionally
      if (c === 0 || c === lastCol) {
        // Get old and new X for this edge column across all rows
        for (let ri = 0; ri < rows; ri++) {
          // Move all points on this edge row's column to match
          setPoint(ri, c, newX, getPoint(ri, c).y);
        }
        // Proportionally adjust inner columns
        for (let ci = 1; ci < lastCol; ci++) {
          for (let ri = 0; ri < rows; ri++) {
            const oldLeft = sp[ri][0].x;
            const oldRight = sp[ri][lastCol].x;
            const newLeft = getPoint(ri, 0).x;
            const newRight = getPoint(ri, lastCol).x;
            const oldRange = oldRight - oldLeft;
            const newRange = newRight - newLeft;
            if (Math.abs(oldRange) > 1e-6) {
              const t = (sp[ri][ci].x - oldLeft) / oldRange;
              setPoint(ri, ci, newLeft + t * newRange, getPoint(ri, ci).y);
            }
          }
        }
      }
      if (r === 0 || r === lastRow) {
        // Move all points on this edge row to match
        for (let ci = 0; ci < cols; ci++) {
          setPoint(r, ci, getPoint(r, ci).x, newY);
        }
        // Proportionally adjust inner rows
        for (let ri = 1; ri < lastRow; ri++) {
          for (let ci = 0; ci < cols; ci++) {
            const oldTop = sp[0][ci].y;
            const oldBottom = sp[lastRow][ci].y;
            const newTop = getPoint(0, ci).y;
            const newBottom = getPoint(lastRow, ci).y;
            const oldRange = oldBottom - oldTop;
            const newRange = newBottom - newTop;
            if (Math.abs(oldRange) > 1e-6) {
              const t = (sp[ri][ci].y - oldTop) / oldRange;
              setPoint(ri, ci, getPoint(ri, ci).x, newTop + t * newRange);
            }
          }
        }
      }
    }

    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    // Re-render room overlay so SVG contours match the grid warp
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onDragEnd() {
    if (!dragState) return;
    dragState = null;
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragEnd);
    positionHandles();
    saveToLocalStorage();
  }

  // ── Grid line drag (move entire row/column) ────────────────────────────────

  function onLineHover(e) {
    if (lineDragState || panDragState || !lineCanvas) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    // Check horizontal lines — use average Y of all points on that row
    for (let row = 0; row < rows; row++) {
      let avgY = 0;
      for (let col = 0; col < cols; col++) avgY += getPoint(row, col).y;
      avgY = (avgY / cols) * vh;
      if (Math.abs(e.clientY - avgY) < LINE_HIT_THRESHOLD) {
        lineCanvas.style.cursor = "ns-resize";
        return;
      }
    }
    // Check vertical lines — use average X of all points on that column
    for (let col = 0; col < cols; col++) {
      let avgX = 0;
      for (let row = 0; row < rows; row++) avgX += getPoint(row, col).x;
      avgX = (avgX / rows) * vw;
      if (Math.abs(e.clientX - avgX) < LINE_HIT_THRESHOLD) {
        lineCanvas.style.cursor = "ew-resize";
        return;
      }
    }
    // Empty area → show grab cursor (whole-grid pan)
    lineCanvas.style.cursor = "grab";
  }

  function onLinePointerDown(e) {
    if (e.button !== 0) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mx = e.clientX;
    const my = e.clientY;
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    // Check horizontal lines
    for (let row = 0; row < rows; row++) {
      let avgY = 0;
      for (let col = 0; col < cols; col++) avgY += getPoint(row, col).y;
      avgY = (avgY / cols) * vh;
      if (Math.abs(my - avgY) < LINE_HIT_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        pushUndo();
        // Capture start positions for all points on this row
        const startPts = [];
        for (let c = 0; c < cols; c++) startPts.push({ ...getPoint(row, c) });
        // Snapshot all points for proportional edge scaling
        const allStartPts = [];
        for (let r2 = 0; r2 < rows; r2++) {
          allStartPts[r2] = [];
          for (let c2 = 0; c2 < cols; c2++) allStartPts[r2][c2] = { ...getPoint(r2, c2) };
        }
        lineDragState = { axis: "horizontal", lineIndex: row, startY: my, startPts, allStartPts };
        lineCanvas.style.cursor = "ns-resize";
        lineCanvas.setPointerCapture(e.pointerId);
        document.addEventListener("pointermove", onLineDragMove);
        document.addEventListener("pointerup", onLineDragEnd);
        document.addEventListener("pointercancel", onLineDragEnd);
        return;
      }
    }

    // Check vertical lines
    for (let col = 0; col < cols; col++) {
      let avgX = 0;
      for (let row = 0; row < rows; row++) avgX += getPoint(row, col).x;
      avgX = (avgX / rows) * vw;
      if (Math.abs(mx - avgX) < LINE_HIT_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        pushUndo();
        const startPts = [];
        for (let r = 0; r < rows; r++) startPts.push({ ...getPoint(r, col) });
        const allStartPts = [];
        for (let r2 = 0; r2 < rows; r2++) {
          allStartPts[r2] = [];
          for (let c2 = 0; c2 < cols; c2++) allStartPts[r2][c2] = { ...getPoint(r2, c2) };
        }
        lineDragState = { axis: "vertical", lineIndex: col, startX: mx, startPts, allStartPts };
        lineCanvas.style.cursor = "ew-resize";
        lineCanvas.setPointerCapture(e.pointerId);
        document.addEventListener("pointermove", onLineDragMove);
        document.addEventListener("pointerup", onLineDragEnd);
        document.addEventListener("pointercancel", onLineDragEnd);
        return;
      }
    }

    // No line hit → start whole-grid pan
    e.preventDefault();
    e.stopPropagation();
    pushUndo();
    const allStartPts = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let r = 0; r < rows; r++) {
      allStartPts[r] = [];
      for (let c = 0; c < cols; c++) {
        const p = getPoint(r, c);
        allStartPts[r][c] = { x: p.x, y: p.y };
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    panDragState = {
      startX: mx,
      startY: my,
      allStartPts,
      minX, maxX, minY, maxY,
    };
    lineCanvas.style.cursor = "grabbing";
    lineCanvas.setPointerCapture(e.pointerId);
    document.addEventListener("pointermove", onPanDragMove);
    document.addEventListener("pointerup", onPanDragEnd);
    document.addEventListener("pointercancel", onPanDragEnd);
  }

  function onPanDragMove(e) {
    if (!panDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let dx = (e.clientX - panDragState.startX) / vw;
    let dy = (e.clientY - panDragState.startY) / vh;
    // Clamp translation so bounding box stays within [0, 1]
    dx = Math.max(-panDragState.minX, Math.min(1 - panDragState.maxX, dx));
    dy = Math.max(-panDragState.minY, Math.min(1 - panDragState.maxY, dy));

    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;
    const sp = panDragState.allStartPts;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        setPoint(r, c, sp[r][c].x + dx, sp[r][c].y + dy);
      }
    }

    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onPanDragEnd() {
    if (!panDragState) return;
    panDragState = null;
    if (lineCanvas) lineCanvas.style.cursor = "grab";
    document.removeEventListener("pointermove", onPanDragMove);
    document.removeEventListener("pointerup", onPanDragEnd);
    document.removeEventListener("pointercancel", onPanDragEnd);
    saveToLocalStorage();
  }

  function onLineDragMove(e) {
    if (!lineDragState) return;
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cols = grid.srcXs.length;
    const rows = grid.srcYs.length;

    const lastRow = rows - 1;
    const lastCol = cols - 1;
    const sp = lineDragState.allStartPts;

    if (lineDragState.axis === "horizontal") {
      const dy = (e.clientY - lineDragState.startY) / vh;
      const row = lineDragState.lineIndex;
      const isEdgeRow = row === 0 || row === lastRow;
      // Move all points on this row vertically
      for (let col = 0; col < cols; col++) {
        const start = lineDragState.startPts[col];
        setPoint(row, col, start.x, Math.max(0, Math.min(1, start.y + dy)));
      }
      // If edge row, proportionally adjust all inner rows
      if (isEdgeRow) {
        for (let ri = 1; ri < lastRow; ri++) {
          for (let ci = 0; ci < cols; ci++) {
            const oldTop = sp[0][ci].y;
            const oldBottom = sp[lastRow][ci].y;
            const newTop = getPoint(0, ci).y;
            const newBottom = getPoint(lastRow, ci).y;
            const oldRange = oldBottom - oldTop;
            const newRange = newBottom - newTop;
            if (Math.abs(oldRange) > 1e-6) {
              const t = (sp[ri][ci].y - oldTop) / oldRange;
              setPoint(ri, ci, getPoint(ri, ci).x, newTop + t * newRange);
            }
          }
        }
      }
    } else {
      const dx = (e.clientX - lineDragState.startX) / vw;
      const col = lineDragState.lineIndex;
      const isEdgeCol = col === 0 || col === lastCol;
      // Move all points on this column horizontally
      for (let row = 0; row < rows; row++) {
        const start = lineDragState.startPts[row];
        setPoint(row, col, Math.max(0, Math.min(1, start.x + dx)), start.y);
      }
      // If edge column, proportionally adjust all inner columns
      if (isEdgeCol) {
        for (let ci = 1; ci < lastCol; ci++) {
          for (let ri = 0; ri < rows; ri++) {
            const oldLeft = sp[ri][0].x;
            const oldRight = sp[ri][lastCol].x;
            const newLeft = getPoint(ri, 0).x;
            const newRight = getPoint(ri, lastCol).x;
            const oldRange = oldRight - oldLeft;
            const newRange = newRight - newLeft;
            if (Math.abs(oldRange) > 1e-6) {
              const t = (sp[ri][ci].x - oldLeft) / oldRange;
              setPoint(ri, ci, newLeft + t * newRange, getPoint(ri, ci).y);
            }
          }
        }
      }
    }

    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function onLineDragEnd() {
    if (!lineDragState) return;
    lineDragState = null;
    if (lineCanvas) lineCanvas.style.cursor = "default";
    document.removeEventListener("pointermove", onLineDragMove);
    document.removeEventListener("pointerup", onLineDragEnd);
    document.removeEventListener("pointercancel", onLineDragEnd);
    saveToLocalStorage();
  }

  // ── Arrow key fine-tuning ──────────────────────────────────────────────────

  function onKeyDown(e) {
    if (!handlesVisible) return;

    // Ctrl+Z / Cmd+Z → undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      undo();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      resetGrid();
      return;
    }

    if (!activeHandleKey) return;

    if (e.key === "Tab") {
      e.preventDefault();
      // Cycle through all handle keys
      const rows = grid.srcYs.length;
      const cols = grid.srcXs.length;
      const parts = activeHandleKey.split("-").map(Number);
      let row = parts[0];
      let col = parts[1];
      col++;
      if (col >= cols) { col = 0; row++; }
      if (row >= rows) { row = 0; }
      activeHandleKey = `${row}-${col}`;
      positionHandles();
      return;
    }

    const arrowMap = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const dir = arrowMap[e.key];
    if (!dir) return;

    e.preventDefault();
    pushUndo();
    const step = e.shiftKey ? 10 : 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const parts = activeHandleKey.split("-").map(Number);
    const row = parts[0];
    const col = parts[1];
    const pt = getPoint(row, col);

    pt.x += (dir[0] * step / vw);
    pt.y += (dir[1] * step / vh);
    pt.x = Math.max(0, Math.min(1, pt.x));
    pt.y = Math.max(0, Math.min(1, pt.y));

    setPoint(row, col, pt.x, pt.y);
    positionHandles();
    positionRotateHandles();
    drawLines();
    applyTransform();
    saveToLocalStorage();
  }

  // ── Context menu ───────────────────────────────────────────────────────────

  function onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const normX = e.clientX / vw;
    const normY = e.clientY / vh;

    const nearLineThreshold = 0.03;
    let nearHLine = -1;
    let nearVLine = -1;

    // Check interior horizontal lines (indices 1..length-2 in ys)
    for (let i = 1; i < grid.srcYs.length - 1; i++) {
      if (Math.abs(grid.srcYs[i] - normY) < nearLineThreshold) {
        nearHLine = i;
        break;
      }
    }
    // Check interior vertical lines
    for (let i = 1; i < grid.srcXs.length - 1; i++) {
      if (Math.abs(grid.srcXs[i] - normX) < nearLineThreshold) {
        nearVLine = i;
        break;
      }
    }

    const items = [];
    if (nearHLine >= 0 && grid.srcYs.length > 3) {
      // Can remove if more than edge lines + 1 interior line
      items.push({
        label: "Remove this horizontal line",
        action: () => removeHorizontalLine(nearHLine),
      });
    }
    if (nearVLine >= 0 && grid.srcXs.length > 3) {
      items.push({
        label: "Remove this vertical line",
        action: () => removeVerticalLine(nearVLine),
      });
    }
    items.push({
      label: "Add horizontal line here",
      action: () => addHorizontalLine(normY),
    });
    items.push({
      label: "Add vertical line here",
      action: () => addVerticalLine(normX),
    });
    items.push({
      label: "Save profile...",
      action: () => profileSaveFlow(),
    });
    items.push({
      label: "Load profile...",
      action: () => profileLoadFlow(),
    });
    items.push({
      label: "Delete profile...",
      action: () => profileDeleteFlow(),
    });
    items.push({
      label: "Reset all",
      action: () => resetGrid(),
    });

    showContextMenu(e.clientX, e.clientY, items);
  }

  // ── Server-side profile flows ──────────────────────────────────────────────

  function getCurrentBoardId() {
    try {
      return typeof ctx?.getBoardId === "function" ? ctx.getBoardId() : null;
    } catch { return null; }
  }

  function buildGridPayload() {
    const pointsArr = [];
    for (let row = 0; row < grid.srcYs.length; row++) {
      for (let col = 0; col < grid.srcXs.length; col++) {
        const pt = getPoint(row, col);
        pointsArr.push({ row, col, x: pt.x, y: pt.y });
      }
    }
    return { srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice(), points: pointsArr };
  }

  function applyGridPayload(data) {
    if (!data || typeof data !== "object") return;
    if (Array.isArray(data.srcXs) && data.srcXs.length >= 2) {
      grid.srcXs = data.srcXs.filter((v) => typeof v === "number").slice().sort((a, b) => a - b);
    }
    if (Array.isArray(data.srcYs) && data.srcYs.length >= 2) {
      grid.srcYs = data.srcYs.filter((v) => typeof v === "number").slice().sort((a, b) => a - b);
    }
    buildDefaultPoints();
    if (Array.isArray(data.points)) {
      for (const p of data.points) {
        if (typeof p.row === "number" && typeof p.col === "number"
          && typeof p.x === "number" && typeof p.y === "number") {
          setPoint(p.row, p.col, p.x, p.y);
        }
      }
    }
  }

  async function profileSaveFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    const name = window.prompt("Profile name:", "");
    if (!name || !name.trim()) return;
    try {
      const resp = await fetch("/api/projection-profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, name: name.trim(), data: buildGridPayload() }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      alert("Save failed: " + (err?.message || err));
    }
  }

  async function fetchProfileList(boardId) {
    const resp = await fetch(`/api/projection-profiles?boardId=${encodeURIComponent(boardId)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const body = await resp.json();
    return Array.isArray(body?.names) ? body.names : [];
  }

  async function profileLoadFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    let names;
    try {
      names = await fetchProfileList(boardId);
    } catch (err) {
      alert("Could not fetch profiles: " + (err?.message || err));
      return;
    }
    if (names.length === 0) { alert("No saved profiles for this board."); return; }
    showProfilePickerMenu(names, async (name) => {
      try {
        const resp = await fetch(`/api/projection-profiles/load?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(name)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const body = await resp.json();
        pushUndo();
        applyGridPayload(body?.data);
        saveToLocalStorage();
        if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
        applyTransform();
        if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
      } catch (err) {
        alert("Load failed: " + (err?.message || err));
      }
    });
  }

  async function profileDeleteFlow() {
    const boardId = getCurrentBoardId();
    if (!boardId) { alert("No board selected."); return; }
    let names;
    try {
      names = await fetchProfileList(boardId);
    } catch (err) {
      alert("Could not fetch profiles: " + (err?.message || err));
      return;
    }
    if (names.length === 0) { alert("No saved profiles to delete."); return; }
    showProfilePickerMenu(names, async (name) => {
      if (!confirm(`Delete profile "${name}"?`)) return;
      try {
        const resp = await fetch(`/api/projection-profiles?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(name)}`, { method: "DELETE" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (err) {
        alert("Delete failed: " + (err?.message || err));
      }
    });
  }

  function showProfilePickerMenu(names, onPick) {
    // Put the menu at the center of the viewport
    const items = names.map((name) => ({
      label: name,
      action: () => onPick(name),
    }));
    items.push({ label: "Cancel", action: () => {} });
    showContextMenu(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2), items);
  }

  function showContextMenu(x, y, items) {
    dismissContextMenu();
    const menu = document.createElement("div");
    menu.className = "board-context-menu";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    for (const item of items) {
      const btn = document.createElement("button");
      btn.className = "board-context-menu-item";
      btn.textContent = item.label;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        dismissContextMenu();
        item.action();
      });
      menu.appendChild(btn);
    }

    document.body.appendChild(menu);
    contextMenu = menu;

    // Ensure menu stays in viewport
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 4}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 4}px`;
      }
    });

    setTimeout(() => {
      document.addEventListener("pointerdown", dismissContextMenuOnOutside, true);
    }, 0);
  }

  function dismissContextMenuOnOutside(e) {
    if (contextMenu && !contextMenu.contains(e.target)) {
      dismissContextMenu();
    }
  }

  function dismissContextMenu() {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }
    document.removeEventListener("pointerdown", dismissContextMenuOnOutside, true);
  }

  // ── Grid line add/remove ───────────────────────────────────────────────────

  function addHorizontalLine(normY) {
    normY = Math.max(0.02, Math.min(0.98, normY));
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    // Compute each row's average screen-space Y (reflects current deformation)
    const avgYs = [];
    for (let r = 0; r < rows; r++) {
      let s = 0;
      for (let c = 0; c < cols; c++) s += grid.points[r][c].y;
      avgYs.push(s / cols);
    }

    // Find insertion index in screen space
    let insertIdx = rows;
    for (let i = 0; i < rows; i++) {
      if (normY < avgYs[i]) { insertIdx = i; break; }
    }
    if (insertIdx === 0) insertIdx = 1;
    if (insertIdx >= rows) insertIdx = rows - 1;
    const above = insertIdx - 1;
    const below = insertIdx;
    const yA = avgYs[above];
    const yB = avgYs[below];
    if (Math.abs(yB - yA) < 1e-6) return;
    const t = (normY - yA) / (yB - yA);
    if (t < 0.01 || t > 0.99) return; // too close to an existing line

    const newSrcY = grid.srcYs[above] + t * (grid.srcYs[below] - grid.srcYs[above]);
    for (const y of grid.srcYs) if (Math.abs(y - newSrcY) < 1e-6) return;
    pushUndo();

    // Interpolate new row's points between above and below at screen-space t
    const newRow = [];
    for (let c = 0; c < cols; c++) {
      const pA = grid.points[above][c];
      const pB = grid.points[below][c];
      newRow.push({
        x: pA.x + (pB.x - pA.x) * t,
        y: pA.y + (pB.y - pA.y) * t,
      });
    }
    grid.srcYs.splice(insertIdx, 0, newSrcY);
    grid.points.splice(insertIdx, 0, newRow);

    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function addVerticalLine(normX) {
    normX = Math.max(0.02, Math.min(0.98, normX));
    const rows = grid.srcYs.length;
    const cols = grid.srcXs.length;

    const avgXs = [];
    for (let c = 0; c < cols; c++) {
      let s = 0;
      for (let r = 0; r < rows; r++) s += grid.points[r][c].x;
      avgXs.push(s / rows);
    }

    let insertIdx = cols;
    for (let i = 0; i < cols; i++) {
      if (normX < avgXs[i]) { insertIdx = i; break; }
    }
    if (insertIdx === 0) insertIdx = 1;
    if (insertIdx >= cols) insertIdx = cols - 1;
    const left = insertIdx - 1;
    const right = insertIdx;
    const xA = avgXs[left];
    const xB = avgXs[right];
    if (Math.abs(xB - xA) < 1e-6) return;
    const t = (normX - xA) / (xB - xA);
    if (t < 0.01 || t > 0.99) return;

    const newSrcX = grid.srcXs[left] + t * (grid.srcXs[right] - grid.srcXs[left]);
    for (const x of grid.srcXs) if (Math.abs(x - newSrcX) < 1e-6) return;
    pushUndo();

    for (let r = 0; r < rows; r++) {
      const pL = grid.points[r][left];
      const pR = grid.points[r][right];
      const newPt = {
        x: pL.x + (pR.x - pL.x) * t,
        y: pL.y + (pR.y - pL.y) * t,
      };
      grid.points[r].splice(insertIdx, 0, newPt);
    }
    grid.srcXs.splice(insertIdx, 0, newSrcX);

    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function removeHorizontalLine(index) {
    if (grid.srcYs.length <= 3) return;
    if (index === 0 || index === grid.srcYs.length - 1) return;
    pushUndo();
    grid.srcYs.splice(index, 1);
    grid.points.splice(index, 1);
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function removeVerticalLine(index) {
    if (grid.srcXs.length <= 3) return;
    if (index === 0 || index === grid.srcXs.length - 1) return;
    pushUndo();
    grid.srcXs.splice(index, 1);
    for (const row of grid.points) row.splice(index, 1);
    saveToLocalStorage();
    if (handlesVisible) { rebuildHandleElements(); drawLines(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  function resetGrid() {
    pushUndo();
    grid.srcXs = makeEvenLines(DEFAULT_COUNT);
    grid.srcYs = makeEvenLines(DEFAULT_COUNT);
    buildDefaultPoints();
    applyTransform();
    try {
      localStorage.removeItem(LS_KEY_V2);
      localStorage.removeItem(LS_KEY_OLD);
    } catch { /* ignore */ }
    if (handlesVisible) { rebuildHandleElements(); drawLines(); positionRotateHandles(); }
    if (typeof ctx.renderRoomOverlay === "function") ctx.renderRoomOverlay();
  }

  // ── Show / Hide (unified — everything in one go) ───────────────────────────

  function showHandles() {
    if (handlesVisible) return;
    createHandles();
    // Bind keyboard globally so ESC works regardless of focus
    document.addEventListener("keydown", onKeyDown);
    activeHandleKey = "0-0";
  }

  function hideHandles() {
    if (!handlesVisible) return;
    document.removeEventListener("keydown", onKeyDown);
    removeHandles();
    clearUndo();
  }

  // ── Align mode integration ─────────────────────────────────────────────────

  function onAlignModeChange(enabled) {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    if (enabled) {
      applyTransform();
      showHandles();
    } else {
      hideHandles();
      // Keep transform applied — calibration persists
      saveToLocalStorage();
    }
  }

  // ── Resize handling ────────────────────────────────────────────────────────

  function onWindowResize() {
    if (!ctx || ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL) return;
    applyTransform();
    if (handlesVisible) {
      positionHandles();
      positionRotateHandles();
      drawLines();
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  const LS_KEY_V2 = "tt-beamer.projection-mapping-v2";
  const LS_KEY_OLD = "tt-beamer.projection-mapping.corners";

  function saveToLocalStorage() {
    try {
      // Serialize per-point grid state
      const pointsArr = [];
      for (let row = 0; row < grid.srcYs.length; row++) {
        for (let col = 0; col < grid.srcXs.length; col++) {
          const pt = getPoint(row, col);
          pointsArr.push({ row, col, x: pt.x, y: pt.y });
        }
      }
      localStorage.setItem(LS_KEY_V2, JSON.stringify({
        srcXs: grid.srcXs,
        srcYs: grid.srcYs,
        points: pointsArr,
      }));
    } catch {
      // ignore storage errors
    }
  }

  function loadFromLocalStorage() {
    try {
      const rawV2 = localStorage.getItem(LS_KEY_V2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.srcXs) && parsed.srcXs.length >= 2) {
            grid.srcXs = parsed.srcXs.filter((v) => typeof v === "number" && v >= 0 && v <= 1);
            grid.srcXs.sort((a, b) => a - b);
          }
          if (Array.isArray(parsed.srcYs) && parsed.srcYs.length >= 2) {
            grid.srcYs = parsed.srcYs.filter((v) => typeof v === "number" && v >= 0 && v <= 1);
            grid.srcYs.sort((a, b) => a - b);
          }
          buildDefaultPoints(); // initialize grid
          if (Array.isArray(parsed.points)) {
            for (const p of parsed.points) {
              if (typeof p.row === "number" && typeof p.col === "number"
                && typeof p.x === "number" && typeof p.y === "number") {
                setPoint(p.row, p.col, p.x, p.y);
              }
            }
          }
          return;
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }

  // ── Legacy compat ──────────────────────────────────────────────────────────

  function getCorners() {
    const lastRow = grid.srcYs.length - 1;
    const lastCol = grid.srcXs.length - 1;
    const tl = getPoint(0, 0);
    const tr = getPoint(0, lastCol);
    const br = getPoint(lastRow, lastCol);
    const bl = getPoint(lastRow, 0);
    return {
      topLeft:     { x: tl.x * 100, y: tl.y * 100 },
      topRight:    { x: tr.x * 100, y: tr.y * 100 },
      bottomRight: { x: br.x * 100, y: br.y * 100 },
      bottomLeft:  { x: bl.x * 100, y: bl.y * 100 },
    };
  }

  function getCornersForPersistence() {
    return getCorners();
  }

  function loadCornersFromConfig(_globalDefaults) {
    // Legacy no-op — persistence is now via localStorage only
  }

  function resetCorners() {
    resetGrid();
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init(dependencies) {
    ctx = dependencies;
    loadFromLocalStorage();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  window.TT_BEAMER_RUNTIME_PROJECTION_MAPPING = {
    init,
    applyTransform,
    showHandles,
    hideHandles,
    onAlignModeChange,
    onWindowResize,
    resetCorners,
    loadCornersFromConfig,
    getCornersForPersistence,
    postDrawMeshWarp,
    remapPoint,
    hasGridDisplacements,
    getCorners,
    CORNER_KEYS,
    // Legacy compat — grid warp is now post-draw, no begin/end needed.
    // These are kept so nothing crashes if called.
    beginGridWarpFrame: () => null,
    endGridWarpFrame: () => {},
    getGrid: () => ({ srcXs: grid.srcXs.slice(), srcYs: grid.srcYs.slice(), points: grid.points }),
    resetGrid,
  };
})();
