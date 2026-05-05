// Unified Grid Projection — WebGL mesh-warp renderer.
//
// Sub-module of runtime-projection-mapping. Owns:
//  - All `_gl*` private state (canvas, context, program, buffers, cached
//    typed arrays).
//  - `_initMeshWarpGL` (lazy GL bring-up + shaders + buffers).
//  - `_postDrawMeshWarpGL` (per-frame mesh-warp draw).
//
// Reads grid via injected refs (getPoint + the grid object). Reads
// ctx.outputRole / ctx.OUTPUT_ROLE_FINAL via the dependencies bag.
(() => {
  let ctx = null;

  // Grid bindings injected at init time. Declared as IIFE-local lets so
  // the moved bodies (`_initMeshWarpGL`, `_postDrawMeshWarpGL`) can
  // reference `grid` and `getPoint` as bare identifiers exactly as they
  // did pre-split.
  let grid = null;
  let getPoint = () => ({ x: 0, y: 0 });

  // WebGL mesh-warp state. The 2D-canvas per-triangle
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
      // Prefer the in-DOM #fx-gl-canvas element so
      // the WebGL drawing buffer is composited as a child of #stage
      // from the very first frame. The previous attempt (commit
      // 13ab558) appended the canvas mid-frame and produced a black
      // /output/ — likely a CSS/timing edge case on Chromium.
      _glCanvas = document.getElementById("fx-gl-canvas")
                || document.createElement("canvas");
      // RPi/Chromium lean WebGL options — no AA buffer
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
      // highp UV precision in BOTH shaders so adjacent triangles agree
      // on the texel sampled at their shared edge. With mediump (fp16)
      // the interpolated vUV diverged by ~1 texel at boundaries,
      // showing as visible triangle seams on uniform regions
      // (solid-color, dark backgrounds). highp (fp32) eliminates the
      // sampling discrepancy and is supported on Pi 4/5 + virtually all
      // modern Chromium WebGL contexts. The GLSL ES 1.0 spec requires
      // highp in vertex shaders; in fragment shaders it's supported but
      // not guaranteed — we declare a default highp and the
      // GL_FRAGMENT_PRECISION_HIGH guard falls back to mediump if the
      // GPU genuinely doesn't support highp (very old VC4 only).
      const vs = compile(
        "precision highp float;\n"
        + "attribute vec2 aPos;\nattribute vec2 aUV;\nvarying highp vec2 vUV;\n"
        + "void main(){ gl_Position = vec4(aPos, 0.0, 1.0); vUV = aUV; }",
        _gl.VERTEX_SHADER,
      );
      const fs = compile(
        "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n"
        + "#else\nprecision mediump float;\n#endif\n"
        + "varying highp vec2 vUV;\nuniform sampler2D uTex;\n"
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
      // NEAREST instead of LINEAR. With LINEAR magnification, the
      // texture lookup at triangle boundaries averages 4 texels —
      // even at identity warp the sub-texel position chosen by each
      // triangle's barycentric interpolation can land on a slightly
      // different pixel boundary than its neighbour, leaving a
      // 1-pixel ridge along every shared mesh edge. On uniform
      // surfaces (especially solid-color rooms) those ridges read as
      // visible "triangulation lines". NEAREST forces one texel per
      // fragment with no interpolation — the warp output is byte-
      // identical to the source on identity warp, and on actual
      // deformation the warp mesh produces straightforward pixel-
      // sampling without filter cross-talk between triangles. On a
      // projector at typical viewing distance, NEAREST vs LINEAR is
      // imperceptible for warp-target content; the trade-off is
      // entirely on the side of fewer artifacts.
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST);
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
      // Upload the source canvas DIRECTLY. The previous
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
    //
    // Phase 30 B1 Task 4 (GL ESCALATION): pixel-snap each destination
    // vertex to an integer pixel coordinate before mapping to NDC.
    // Phase-26-h9 closed the texture-sampling seams (highp UV +
    // NEAREST). What remained on /output/ at projector viewing
    // distance was rasterizer-side: Phase-27-W4 trapezoid corners +
    // 80% squish bars produce shared-edge vertices at fractional
    // pixel coordinates (e.g. dst.x = 0.10 * 1920 = 192.0 vs.
    // 0.10000001 * 1920 = 192.0...02 after grid math). Two adjacent
    // triangles sharing such a vertex still pass the NDC
    // floating-point equality test, but the rasterizer's diamond-
    // exit rule evaluates coverage from each triangle's own
    // direction → a 1-pixel column at the shared edge can be
    // covered by both triangles or neither. (Phase 30 B1 h1: the
    // clearColor below is now TRANSPARENT on /output/ as a
    // belt-and-braces gap-fill — fx-canvas content shows through
    // any rasterizer holes — but pixel-snapping still helps
    // reduce the gaps at the source.)
    // Snapping vertex positions to whole pixels makes shared edges
    // land on exact pixel boundaries, where coverage is unambiguous
    // for both triangles. Source UVs stay fractional (NEAREST
    // sampling already discretizes them at the texel level —
    // Phase-26-h9). This preserves trapezoid + squish geometry to
    // within 0.5 px on a 1080p projector — visually indistinguishable
    // — while eliminating shared-edge seams.
    let vi = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const pt = getPoint(row, col);
        // Pixel-snap destination vertex: round to nearest integer
        // pixel in framebuffer-coords, then map back to NDC. The
        // round happens in pixel-space (pt.x * w) so the snap
        // granularity is exactly 1 pixel regardless of canvas size.
        const pxX = Math.round(pt.x * w);
        const pxY = Math.round(pt.y * h);
        // NDC: x in [-1,1], y flipped via UNPACK_FLIP_Y_WEBGL.
        _glPositions[vi] = (pxX / w) * 2 - 1;
        _glPositions[vi + 1] = 1 - (pxY / h) * 2;
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

    // Phase 30 B1 h1: clearColor TRANSPARENT on /output/ (was opaque
    // black). Rationale: the WebGL rasterizer can leave 1-pixel gaps
    // at triangle shared edges (top-left fill rule mismatch on
    // non-integer-snapped vertices; VC4 sub-pixel jitter on Pi). With
    // opaque-black clearColor, those gaps render as visible BLACK
    // LINES on uniform-colour content (cf. user UAT photo
    // debug/lines_bug.jpg showing the 3x3 grid pattern through orange
    // solid-color). Transparent clearColor lets fx-canvas content
    // underneath show through any gaps. With the small Phase-27-W4
    // default deformation (10% inset), the visual offset between
    // warped (GL) and un-warped (fx-canvas) content at a 1-pixel gap
    // is ≤0.1 px — imperceptible on a 1080p projector at table
    // distance, far better than visible dark grid lines. Both
    // /output/ and dashboard now use transparent clearColor — the
    // dashboard path already used transparent.
    const isOutput = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
    _gl.clearColor(0, 0, 0, 0);
    _gl.clear(_gl.COLOR_BUFFER_BIT);
    _gl.drawElements(_gl.TRIANGLES, _glIndexCount, _gl.UNSIGNED_SHORT, 0);

    if (isOutput) {
      // Phase 30 B1 h1: do NOT clear fx-canvas on /output/. The
      // un-warped fx-canvas content underneath fx-gl-canvas serves as
      // gap-fill for rasterization holes in the GL output (see
      // clearColor comment above). Original logic cleared fx-canvas
      // to avoid "double-image" colour bleeding outside room
      // polygons; with Phase-27-W4 default 10% inset the warp
      // deformation is small enough that warped-vs-un-warped at a
      // 1-pixel gap is imperceptible. The trade-off is verified
      // visually by the user UAT for solid-color animations.
    } else {
      // Dashboard path — read GL result back onto fx-canvas so the
      // existing editor compositing path keeps working unchanged.
      canvasCtx.save();
      canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
      canvasCtx.clearRect(0, 0, w, h);
      canvasCtx.drawImage(_glCanvas, 0, 0);
      canvasCtx.restore();
    }
    return true;
  }

  function init(dependencies) {
    ctx = dependencies;
    if (dependencies?.grid) grid = dependencies.grid;
    if (typeof dependencies?.getPoint === "function") getPoint = dependencies.getPoint;
  }

  window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER = {
    init,
    postDrawMeshWarpGL: _postDrawMeshWarpGL,
    tryInitGL: _initMeshWarpGL,
  };
})();
