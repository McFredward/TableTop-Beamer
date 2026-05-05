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
  // Phase 30 B2 h9: bounded GL recovery. Pi VC4 in a broken-context
  // state returns null infoLog from getShaderInfoLog after a few
  // context losses, causing _initMeshWarpGL → compile() to fail and
  // the draw loop to spam "mesh-warp shader error: null" indefinitely.
  // We count consecutive context losses; on the threshold we set
  // _glPermanentlyDisabled = true and short-circuit both
  // _initMeshWarpGL and _postDrawMeshWarpGL so the renderer falls
  // through to the 2D fallback path (with h7's INFLATE = 4.0 still
  // hiding seams). The counter resets on a successful
  // gl.drawElements call, so a transient single loss + recovery does
  // NOT permanently disable GL.
  let _glContextLossCount = 0;
  const _GL_MAX_CONTEXT_LOSSES = 3;
  let _glPermanentlyDisabled = false;
  // Phase 30 B2 h10: ensure each lifecycle-transition toast is fired
  // exactly once. Without dedup the contextlost handler would fire a
  // toast every frame for as long as the broken-context state
  // persists.
  let _toastFiredFirstLoss = false;
  let _toastFiredPermanentDisable = false;
  function _showLifecycleToast(message, kind = "warning") {
    try {
      if (typeof ctx?.showToast === "function") {
        ctx.showToast(message, { kind, dedupeKey: `gl-lifecycle:${message}` });
      }
    } catch (_) { /* never let toast break render path */ }
  }
  function _initMeshWarpGL() {
    // Phase 30 B2 h9: refuse all init attempts once GL has been
    // permanently disabled. Without this short-circuit, every draw
    // tick re-enters _initMeshWarpGL → fails compile on the broken
    // context → logs the spammy null-infoLog error.
    if (_glPermanentlyDisabled) return false;
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
      // Phase 30 B1 h7: antialias: false retained from h6 (revert h3).
      // The h3 attempt to enable MSAA caused WebGL CONTEXT_LOST_WEBGL
      // on Pi VC4 immediately after the first successful warp frame —
      // confirmed by user console log showing CONTEXT_LOST + post-loss
      // shader recompile failures. The Pi VC4 GPU's framebuffer memory
      // budget (shared with system RAM) cannot afford the 4× MSAA
      // expansion of a 1365×1080 buffer. Returning to no-AA preserves
      // a Pi-friendly memory profile.
      //
      // Phase 30 B1 h7: tighten GL context options for Pi VC4 stability.
      // The user's console log showed CONTEXT_LOST_WEBGL after the first
      // successful warp frame. Likely contributing factors:
      //   - desynchronized:true allows the compositor to present the GL
      //     canvas out-of-band; on Pi VC4 this can race with framebuffer
      //     allocation and produce momentary white frames AND increase
      //     context-loss likelihood under memory pressure.
      //   - preserveDrawingBuffer:true holds the framebuffer in memory
      //     between frames, doubling effective VRAM commitment on the Pi
      //     (which only has shared system+GPU memory).
      // Tightening to desynchronized:false + preserveDrawingBuffer:false
      // trades a tiny per-frame upload cost (we redraw every frame anyway)
      // for a much smaller memory footprint and synchronized presentation.
      // User-facing effect: GL stays alive across boot, h4's LINEAR
      // sampling becomes the actual rendering path (not the 2D-fallback
      // clip-AA path that produces streifen), and the boot-time white
      // flash from desynchronized GL canvas presentation disappears.
      const glOpts = {
        premultipliedAlpha: false,
        antialias: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
        desynchronized: false,
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
        // Phase 30 B2 h9: count consecutive context losses. If we hit
        // the threshold (3 losses), give up on GL entirely and fall
        // through to the 2D-fallback path permanently. Without this,
        // Pi VC4's broken-context state (shader compile returns null
        // infoLog) causes the draw loop to spam "mesh-warp shader
        // error: null" indefinitely, AND every subsequent re-init
        // attempt allocates a fresh framebuffer, deepening the GPU
        // memory pressure that triggered the loss in the first place.
        _glContextLossCount += 1;
        // Phase 30 B2 h10: surface fallback transitions to the user
        // via toast so they can see WHY the visible mode no longer
        // matches the configured value. Fire two distinct toasts:
        //   - first loss → "GL context lost — auto-recovering"
        //   - permanent disable → "GL permanently off; using 2D"
        // Each fires at most once per page load (dedup flags).
        if (!_toastFiredFirstLoss) {
          _toastFiredFirstLoss = true;
          _showLifecycleToast(
            `WebGL context lost (${_glContextLossCount}/${_GL_MAX_CONTEXT_LOSSES}) — recovering`,
            "warning",
          );
        }
        if (_glContextLossCount >= _GL_MAX_CONTEXT_LOSSES) {
          _glPermanentlyDisabled = true;
          if (!_toastFiredPermanentDisable) {
            _toastFiredPermanentDisable = true;
            _showLifecycleToast(
              "GL disabled after 3 context losses — using 2D fallback",
              "error",
            );
          }
          if (typeof console !== "undefined" && console.warn) {
            // eslint-disable-next-line no-console
            console.warn(
              "[h9] GL permanently disabled after",
              _glContextLossCount,
              "context losses; using 2D fallback",
            );
          }
        }
      }, false);
      // Phase 30 B1 h7: webglcontextrestored handler. Without this, when
      // Pi VC4 loses + restores the WebGL context, the next
      // _initMeshWarpGL call would try to compile shaders on a context
      // that's still transitioning, hitting the "mesh-warp shader error:
      // null" failure the user observed. With this handler, we
      // explicitly reset all init state so the next draw cycle runs a
      // clean compile + buffer setup on the freshly-restored context.
      _glCanvas.addEventListener("webglcontextrestored", (event) => {
        event.preventDefault?.();
        // Clear all init + cached state so the next _initMeshWarpGL
        // fully reinitializes shaders, buffers, and textures on the
        // restored context.
        _glInitOk = false;
        _glInitTried = false;
        _gl = null;
        _glProgram = null;
        _glTexture = null;
        _glPosBuf = null;
        _glUVBuf = null;
        _glIdxBuf = null;
        _glAttrPos = -1;
        _glAttrUV = -1;
        _glUniTex = null;
        _glPositions = null;
        _glUVs = null;
        _glIndices = null;
        _glIndexCount = 0;
        _glCachedRows = 0;
        _glCachedCols = 0;
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
      // Phase 30 B1 h4: NEAREST → LINEAR. Phase-26-h9 chose NEAREST
      // assuming IDENTITY warp (where it produces byte-identical
      // source-to-dest output and avoids LINEAR's 4-texel-averaging
      // sub-texel ridge). Phase-27-W4-h1 introduced a non-identity
      // 80%-squish default grid; under non-identity warp every cell's
      // per-fragment UV barycentric interpolation lands at slightly
      // different sub-texel positions than its neighbour cell, and
      // NEAREST's hard discrete texel pick at the cell boundary
      // produces a 1-pixel content discontinuity → visible streifen
      // matching the 3×3 mesh boundaries (cf. debug/lines_bug.jpg).
      // LINEAR averages adjacent texels instead, dissolving the
      // 1-pixel step into imperceptible sub-pixel softening at
      // projector viewing distance. Phase-26-h9's identity-warp
      // concern doesn't apply: at non-identity warp the smoothing
      // is exactly what's needed.
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
      _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
      // Phase 30 B2 h12: pre-allocate the texture with a 1×1 black
      // pixel at init time. Without this, the first
      // `texImage2D(..., canvas)` call in _postDrawMeshWarpGL is BOTH
      // an allocation (1920×1080×4 = 8.3 MB) AND an upload — typically
      // landing in the same boot frame as the first sandstorm.mp4
      // `drawImage(video, …)` on the Pi (which itself triggers a
      // ~3 MB GPU video texture allocation). The contemporaneous
      // ~11 MB allocation burst is the most likely trigger of the
      // boot-time CONTEXT_LOST_WEBGL the user observed at t≈2200 ms
      // (BEFORE any GIF decode finished). Pre-allocating here turns
      // the first real frame into a re-upload (no fresh allocation),
      // staggering the GPU pressure across two paint cycles.
      const _bootPixel = new Uint8Array([0, 0, 0, 255]);
      _gl.texImage2D(
        _gl.TEXTURE_2D, 0, _gl.RGBA, 1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, _bootPixel,
      );
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
    // Phase 30 B2 h9: if GL was permanently disabled by repeated
    // context losses, return false immediately so postDrawMeshWarp
    // falls through to postDrawMeshWarp2D (h7's INFLATE = 4.0 keeps
    // seams hidden). Avoids the per-frame _initMeshWarpGL re-entry
    // and the resulting "mesh-warp shader error: null" spam.
    if (_glPermanentlyDisabled) return false;
    if (!_initMeshWarpGL()) return false;

    const w = canvas.width;
    const h = canvas.height;
    // Phase 30 B1 h5: size the GL backing-store to the actual displayed
    // CSS pixel rect × devicePixelRatio (Phase 26 SUMMARY explicitly
    // flagged this — "canvas 1920×891 vs projector 1920×1080 mismatch
    // causing browser bilinear upscale artifacts" — as the pending
    // follow-up that h9's NEAREST/highp didn't address). With the
    // backing-store dims = displayed dims × DPR, the browser does NO
    // CSS upscaling on /output/ — what GL renders is what the projector
    // shows, 1:1 at the pixel grid. This eliminates the bilinear-vs-
    // pixelated dependency and any downstream amplification of in-canvas
    // affine boundaries into visible streifen. Fallback to canvas
    // pixel dims preserves dashboard behavior if getBoundingClientRect
    // is unavailable (very old browsers).
    let bufW = w;
    let bufH = h;
    try {
      const cssRect = _glCanvas.getBoundingClientRect?.();
      if (cssRect && cssRect.width > 0 && cssRect.height > 0) {
        const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
        bufW = Math.max(1, Math.round(cssRect.width * dpr));
        bufH = Math.max(1, Math.round(cssRect.height * dpr));
      }
    } catch (_) { /* fall through to canvas dims */ }
    if (_glCanvas.width !== bufW) _glCanvas.width = bufW;
    if (_glCanvas.height !== bufH) _glCanvas.height = bufH;

    // Viewport must match the framebuffer dim (= bufW/bufH after the
    // backing-store sync above), not the source canvas dim. If we
    // viewport at canvas (w,h) but the framebuffer is (bufW,bufH),
    // GL will clip/letterbox the rendered mesh against a smaller-
    // than-buffer rect and the projector sees the artifact-creating
    // scale.
    _gl.viewport(0, 0, bufW, bufH);
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
    // covered by both triangles or neither, and on /output/ the
    // opaque-black clearColor (line 267) bleeds through any gaps.
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
        // round happens in framebuffer pixel-space (pt.x * bufW) so
        // the snap granularity is exactly 1 framebuffer pixel — which
        // is also exactly 1 projector pixel after Phase 30 B1 h5's
        // CSS-rect × DPR backing-store sync.
        const pxX = Math.round(pt.x * bufW);
        const pxY = Math.round(pt.y * bufH);
        // NDC: x in [-1,1], y flipped via UNPACK_FLIP_Y_WEBGL.
        _glPositions[vi] = (pxX / bufW) * 2 - 1;
        _glPositions[vi + 1] = 1 - (pxY / bufH) * 2;
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

    // In /output/ the GL canvas itself is the visible
    // surface, so clear it OPAQUE black (the projector's "no light"
    // colour) and skip the GPU→CPU drawImage readback. In dashboard
    // we still need the readback because the projection-mapping
    // editor composites handles on top of fx-canvas.
    const isOutput = ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
    if (isOutput) {
      _gl.clearColor(0, 0, 0, 1);
    } else {
      _gl.clearColor(0, 0, 0, 0);
    }
    _gl.clear(_gl.COLOR_BUFFER_BIT);
    _gl.drawElements(_gl.TRIANGLES, _glIndexCount, _gl.UNSIGNED_SHORT, 0);
    // Phase 30 B2 h9: reset context-loss counter on a successful
    // frame. A transient single loss + recovery should NOT permanently
    // disable GL; only repeated losses without a healthy frame in
    // between cross the threshold.
    _glContextLossCount = 0;

    if (isOutput) {
      // Clear fx-canvas after texture upload so its
      // (now-stale) UNWARPED content can't leak through the alpha=0
      // areas of the GL framebuffer. Without this, transparent areas
      // of the warped triangles let fx-canvas show through and you
      // see both the warped animation AND the original unwarped
      // animation simultaneously — which looks like colours bleeding
      // outside the room polygons.
      canvasCtx.save();
      canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
      canvasCtx.clearRect(0, 0, w, h);
      canvasCtx.restore();
    } else {
      // Dashboard path — read GL result back onto fx-canvas so the
      // existing editor compositing path keeps working unchanged.
      // Phase 30 B1 h5: explicitly scale the GL backing-store
      // (bufW × bufH after CSS-rect × DPR sync) into fx-canvas
      // (w × h). drawImage with full source rect + dest (w,h) does
      // a one-pass bilinear resample; in dashboard the editor
      // overlays handles + indicators on top so a tiny resample is
      // imperceptible. /output/ does NOT take this path — it shows
      // _glCanvas directly at native bufW × bufH.
      canvasCtx.save();
      canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
      canvasCtx.clearRect(0, 0, w, h);
      canvasCtx.drawImage(_glCanvas, 0, 0, bufW, bufH, 0, 0, w, h);
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
    // Phase 30 B2 h10: expose lifecycle state so the orchestrator can
    // show "effective mode" in the diagnostic chip when auto-fallback
    // forces 2D. Reading these is cheap (closure scalars).
    isGlPermanentlyDisabled: () => _glPermanentlyDisabled,
    getGlContextLossCount: () => _glContextLossCount,
  };
})();
