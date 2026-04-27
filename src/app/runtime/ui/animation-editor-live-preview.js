// Animation editor live-preview — owns the right-column preview
// swatch (GIF / MP4 / coded canvas / icon glyph), the rAF loops that
// drive coded and GIF playback (one loop at a time, re-keyed per
// scope:id), the preview meta dl, and the in-place dynamic bits
// updater for opacity / intensity / mp4 playbackRate.
//
// Phase 24 W3.3-C4: extracted from animation-editor-view.js. The
// module-private `previewLoopId` and `previewLoopKey` (the rAF state)
// move with the loop functions. Cross-module callbacks
// (getEditorBoardId / getSelection / findDefinition / scopeLabel /
// deleteAnimation) are wired at init time so call sites stay
// byte-identical with the pre-W3.3 IIFE.
(() => {
  let ctx = null;

  // Cross-sub-module callbacks injected at init time. Local shadow
  // declarations let renderPreview / startCodedPreview / startGifPreview
  // / buildPreviewSwatch / buildPreviewMeta keep their bare-identifier
  // call sites byte-identical with the pre-W3.3 IIFE.
  let getEditorBoardId = null;
  let getSelection = null;
  let findDefinition = null;
  let scopeLabel = null;
  let deleteAnimation = null;

  function init(deps) {
    ctx = deps;
    if (deps.shell) {
      getEditorBoardId = deps.shell.getEditorBoardId;
      getSelection = deps.shell.getSelection;
    }
    if (typeof deps.getEditorBoardId === "function") getEditorBoardId = deps.getEditorBoardId;
    if (typeof deps.getSelection === "function") getSelection = deps.getSelection;
    if (typeof deps.findDefinition === "function") findDefinition = deps.findDefinition;
    if (typeof deps.scopeLabel === "function") scopeLabel = deps.scopeLabel;
    if (typeof deps.deleteAnimation === "function") deleteAnimation = deps.deleteAnimation;
  }

  function renderPreview() {
    const root = ctx.animEditorPreview;
    if (!root) return;
    // Cancel any in-flight coded-effect
    // preview loop before rebuilding — otherwise replaceChildren()
    // detaches the old canvas but the rAF keeps trying to draw on
    // the orphaned node until the containment check fires.
    stopCodedPreview();
    const boardId = getEditorBoardId();
    const sel = getSelection();
    const def = findDefinition(sel.scope, sel.id, boardId);
    root.replaceChildren();

    const eyebrow = document.createElement("p");
    eyebrow.className = "rd-eyebrow";
    eyebrow.textContent = "Live preview";
    root.append(eyebrow);

    if (!def) {
      const empty = document.createElement("div");
      empty.className = "anim-editor-preview-placeholder";
      const hint = document.createElement("p");
      hint.className = "rd-caption";
      hint.textContent = "Select an animation to see its defaults.";
      empty.append(hint);
      root.append(empty);
      return;
    }

    root.append(buildPreviewSwatch(sel.scope, def));
    root.append(buildPreviewMeta(sel.scope, def));

    const footer = document.createElement("div");
    footer.className = "anim-editor-preview-footer";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "rd-btn rd-btn-danger anim-editor-delete";
    const trashIcon = window.TT_BEAMER_UI_ICONS?.createIcon("trash", { size: 14 });
    if (trashIcon) del.append(trashIcon);
    const delLabel = document.createElement("span");
    delLabel.textContent = "Delete animation";
    del.append(delLabel);
    del.addEventListener("click", () => {
      deleteAnimation(sel.scope, def.id);
    });
    footer.append(del);
    root.append(footer);
  }

  // Live preview — GIF and MP4 render inline
  // so the user can see the animation's actual content. Coded effects
  // stay as the icon glyph (the canvas-driven preview would require a
  // dedicated render loop and drawEffectVisual access; coming later).
  function buildPreviewSwatch(scope, def) {
    const wrap = document.createElement("div");
    wrap.className = "anim-editor-preview-swatch";

    const type = String(def.assetType || "").toLowerCase();
    const ref = String(def.assetRef || "").trim();

    if (type === "gif" && ref) {
      // GIF preview renders through the shared
      // gif-playback cache so the speed slider actually changes the
      // frame cadence — native <img> playback ignores any external
      // timing. Same math the board's draw loop uses:
      //   getGifPlaybackFrame(path, age × speed)
      //   globalAlpha = opacity × intensity
      const canvas = document.createElement("canvas");
      canvas.className = "anim-editor-preview-media anim-editor-preview-canvas";
      canvas.dataset.animEditorPreviewMedia = "gif";
      const boardCanvas = document.querySelector("#fx-canvas");
      canvas.width = Number(boardCanvas?.width) || 1280;
      canvas.height = Number(boardCanvas?.height) || 960;
      wrap.append(canvas);
      const started = startGifPreview(canvas, scope, def, wrap, ref);
      if (!started) {
        // gif-playback module missing (unlikely) — last-resort <img>.
        wrap.replaceChildren();
        const img = document.createElement("img");
        img.className = "anim-editor-preview-media";
        img.dataset.animEditorPreviewMedia = "gif";
        img.src = toResourceUrl(ref);
        img.alt = def.name;
        img.addEventListener("error", () => {
          wrap.replaceChildren(buildPreviewMissingNotice(ref));
        });
        syncMediaPreviewProps(img, def);
        wrap.append(img);
      }
    } else if (type === "mp4" && ref) {
      const video = document.createElement("video");
      video.className = "anim-editor-preview-media";
      video.dataset.animEditorPreviewMedia = "mp4";
      video.src = toResourceUrl(ref);
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.addEventListener("error", () => {
        wrap.replaceChildren(buildPreviewMissingNotice(ref));
      });
      video.addEventListener("loadedmetadata", () => {
        syncMediaPreviewProps(video, def);
      });
      syncMediaPreviewProps(video, def);
      wrap.append(video);
    } else if (type === "coded" && ref && window.TT_BEAMER_RUNTIME_EFFECT_VISUALS?.withPreviewCanvas) {
      // Coded effects get a live canvas
      // preview that replays drawEffectVisual on every rAF with the
      // definition's current defaults (opacity, intensity, speed,
      // colorHex, outside mode/direction). startCodedPreview sets up
      // a rAF loop; stopCodedPreview cancels it — re-called on every
      // renderPreview to switch targets or exit cleanly.
      const canvas = document.createElement("canvas");
      canvas.className = "anim-editor-preview-media anim-editor-preview-canvas";
      // Intrinsic canvas size should match the
      // live board's pixel dimensions so position/speed-based
      // coded effects (outside-space star field, sweeping scans,
      // …) render at the same apparent speed in the preview as on
      // the projection. CSS scales the canvas down to fit the
      // 280-px preview column; the intrinsic coordinate space
      // stays 1:1 with the board.
      const boardCanvas = document.querySelector("#fx-canvas");
      const refW = Number(boardCanvas?.width) || 1280;
      const refH = Number(boardCanvas?.height) || 960;
      canvas.width = refW;
      canvas.height = refH;
      wrap.append(canvas);
      startCodedPreview(canvas, scope, def);
    } else {
      const icons = window.TT_BEAMER_UI_ICONS;
      if (icons?.createIcon) {
        const name = def.icon
          ?? (icons.resolveAnimationIcon ? icons.resolveAnimationIcon(def) : "sparkles");
        const iconEl = icons.createIcon(name, { size: 48, strokeWidth: 1.25 });
        wrap.append(iconEl);
      }
    }

    const label = document.createElement("p");
    label.className = "anim-editor-preview-swatch-label";
    label.textContent = def.name;
    wrap.append(label);
    return wrap;
  }

  // Coded-effect preview loop — see note above. One loop at a time,
  // re-keyed per (scope,id) so changing selection cancels the old
  // loop before spinning up the new one.
  let previewLoopId = null;
  let previewLoopKey = null;
  function startCodedPreview(canvas, scope, def) {
    const visuals = window.TT_BEAMER_RUNTIME_EFFECT_VISUALS;
    if (!visuals?.withPreviewCanvas || !visuals.drawEffectVisual) return;
    stopCodedPreview();
    const key = `${scope}:${def.id}`;
    previewLoopKey = key;
    const startTime = performance.now();
    const c2d = canvas.getContext("2d");
    const roomMetrics = () => {
      const w = canvas.width;
      const h = canvas.height;
      const pad = 8;
      return {
        centerX: w / 2,
        centerY: h / 2,
        minX: pad,
        minY: pad,
        width: w - pad * 2,
        height: h - pad * 2,
        radius: Math.min(w, h) * 0.42,
      };
    };
    function tick() {
      if (previewLoopKey !== key) return;
      if (!document.body.contains(canvas)) {
        stopCodedPreview();
        return;
      }
      const current = findDefinition(scope, def.id, getEditorBoardId()) ?? def;
      c2d.save();
      c2d.fillStyle = "#000";
      c2d.fillRect(0, 0, canvas.width, canvas.height);
      c2d.restore();
      const speed = Number(current.speed) > 0 ? Number(current.speed) : 1;
      // Mirror what runtime-draw-loop.js does for
      // every scope before calling drawEffectVisual — inside uses
      // `age * speed`, room uses `age * playbackSpeed`, outside's
      // resolveOutsideTimeline returns `elapsed * speed`. Pre-scaling
      // here is what makes effects like scanning, fire, intruder-alert
      // actually honour the speed slider in the preview. outside-space
      // additionally consumes `options.outsideSpeed` to scale layer
      // motion; this still double-applies, but that matches board
      // behavior 1:1 so the preview and board agree on speed.
      //
      // Also apply state.animationSpeed (the global runtime multiplier)
      // so the preview matches Dashboard / /output exactly when the
      // user has changed that slider away from 1×. (Phase 25 BACKLOG #8)
      const globalSpeed = Number(ctx?.state?.animationSpeed);
      const globalSpeedSafe = Number.isFinite(globalSpeed) && globalSpeed > 0 ? globalSpeed : 1;
      const age = (performance.now() - startTime) / 1000;
      const scaledAge = age * speed * globalSpeedSafe;
      const intensity = Number.isFinite(Number(current.intensity)) ? Number(current.intensity) : 1;
      const options = {
        opacity: Number.isFinite(Number(current.opacity)) ? Number(current.opacity) : 1,
        colorHex: current.colorHex,
        outsideMode: current.mode,
        outsideDirection: current.direction,
        outsideSpeed: speed,
        densityFactor: 1,
      };
      try {
        visuals.withPreviewCanvas(canvas, () => {
          visuals.drawEffectVisual(current.assetRef, scaledAge, intensity, null, roomMetrics(), options);
        });
      } catch (error) {
        console.error("anim editor preview error", error);
        stopCodedPreview();
        return;
      }
      previewLoopId = requestAnimationFrame(tick);
    }
    previewLoopId = requestAnimationFrame(tick);
  }

  function stopCodedPreview() {
    if (previewLoopId != null) {
      cancelAnimationFrame(previewLoopId);
      previewLoopId = null;
    }
    previewLoopKey = null;
  }

  // Canvas-backed GIF preview so the speed
  // slider actually changes the frame cadence. Uses the same
  // decoded-frame cache the board's draw loop uses.
  function startGifPreview(canvas, scope, def, wrap, ref) {
    const gifApi = window.TT_BEAMER_RUNTIME_GIF_PLAYBACK;
    if (!gifApi?.ensureGifPlaybackReady || !gifApi.getGifPlaybackFrame) {
      return false;
    }
    stopCodedPreview();
    const path = toResourceUrl(ref);
    const entry = gifApi.ensureGifPlaybackReady(path);
    const cacheEntry = gifApi.getGifPlaybackCacheEntry
      ? gifApi.getGifPlaybackCacheEntry(path)
      : entry;
    const key = `gif:${scope}:${def.id}`;
    previewLoopKey = key;
    const startTime = performance.now();
    const c2d = canvas.getContext("2d");
    function tick() {
      if (previewLoopKey !== key) return;
      if (!document.body.contains(canvas)) {
        stopCodedPreview();
        return;
      }
      if (cacheEntry?.status === "fallback" || cacheEntry?.error) {
        stopCodedPreview();
        if (wrap) wrap.replaceChildren(buildPreviewMissingNotice(ref));
        return;
      }
      const current = findDefinition(scope, def.id, getEditorBoardId()) ?? def;
      const speed = Number(current.speed) > 0 ? Number(current.speed) : 1;
      // Apply state.animationSpeed so the GIF preview matches Dashboard
      // and /output (Phase 25 BACKLOG #8). Same factoring as the coded
      // preview tick above.
      const globalSpeed = Number(ctx?.state?.animationSpeed);
      const globalSpeedSafe = Number.isFinite(globalSpeed) && globalSpeed > 0 ? globalSpeed : 1;
      const age = (performance.now() - startTime) / 1000;
      const opacity = Number.isFinite(Number(current.opacity)) ? Number(current.opacity) : 1;
      const intensity = Number.isFinite(Number(current.intensity)) ? Number(current.intensity) : 1;
      const effective = window.TT_BEAMER_RUNTIME_UTILS.clamp01(opacity * intensity);
      c2d.save();
      c2d.fillStyle = "#000";
      c2d.fillRect(0, 0, canvas.width, canvas.height);
      const frame = gifApi.getGifPlaybackFrame(path, age * speed * globalSpeedSafe);
      if (frame) {
        c2d.globalAlpha = effective;
        const fw = frame.width;
        const fh = frame.height;
        const cw = canvas.width;
        const ch = canvas.height;
        const fit = Math.min(cw / fw, ch / fh);
        const dw = fw * fit;
        const dh = fh * fit;
        c2d.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      }
      c2d.restore();
      previewLoopId = requestAnimationFrame(tick);
    }
    previewLoopId = requestAnimationFrame(tick);
    return true;
  }

  // Turn a stored asset ref into a URL the browser can load. The
  // runtime stores refs as "resources/foo.gif" or "/resources/foo.gif";
  // both forms should resolve to /resources/foo.gif.
  function toResourceUrl(ref) {
    const trimmed = String(ref || "").trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("/") || /^https?:/i.test(trimmed)) return trimmed;
    return `/${trimmed.replace(/^\/+/, "")}`;
  }

  function buildPreviewMeta(scope, def) {
    const box = document.createElement("dl");
    box.className = "anim-editor-preview-meta";
    const rows = [
      ["Scope",     scopeLabel(scope)],
      ["Type",      formatAssetType(def.assetType)],
      ["Source",    def.assetRef || "—"],
    ];
    if (scope === "outside" && def.assetType === "coded") {
      rows.push(["Mode",      def.mode ?? "standard"]);
      rows.push(["Direction", def.direction ?? "forward"]);
    }
    const noneValue = window.TT_BEAMER_CONFIG?.SOUND_MAPPING_NONE ?? "none";
    const soundRef = def.soundAssetRef ?? noneValue;
    rows.push(["Sound",
      soundRef === noneValue ? "—" : (String(soundRef).split("/").pop() || soundRef),
    ]);
    for (const [k, v] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      box.append(dt, dd);
    }
    return box;
  }

  function formatAssetType(t) {
    if (t === "coded") return "Effect (coded)";
    if (t === "mp4") return "Video";
    if (t === "gif") return "GIF";
    return t || "—";
  }

  // Reflect current slider/toggle state on the
  // GIF img or MP4 video element. Matches the board's draw math:
  //   - effective alpha = opacity × intensity
  //   - mp4 playbackRate = speed
  // (GIF speed can't be modified natively — frame timing is baked
  // into the file.)
  function syncMediaPreviewProps(el, def) {
    if (!el || !def) return;
    const opacity = Number.isFinite(Number(def.opacity)) ? Number(def.opacity) : 1;
    const intensity = Number.isFinite(Number(def.intensity)) ? Number(def.intensity) : 1;
    const effective = window.TT_BEAMER_RUNTIME_UTILS.clamp01(opacity * intensity);
    el.style.opacity = String(effective);
    if (el.tagName === "VIDEO") {
      const speed = Number.isFinite(Number(def.speed)) ? Number(def.speed) : 1;
      // Multiply by state.animationSpeed so the MP4 preview matches the
      // Dashboard / /output rate (which uses speed × state.animationSpeed
      // — see runtime-draw-loop.js drawInsideGlobalVisual). Phase 25
      // BACKLOG #8.
      const globalSpeed = Number(ctx?.state?.animationSpeed);
      const globalSpeedSafe = Number.isFinite(globalSpeed) && globalSpeed > 0 ? globalSpeed : 1;
      const clamped = Math.max(0.15, Math.min(4, speed * globalSpeedSafe));
      try {
        if (Math.abs((Number(el.playbackRate) || 1) - clamped) > 0.01) {
          el.playbackRate = clamped;
        }
      } catch { /* some browsers throw before loadedmetadata — handler retries */ }
    }
  }

  function updatePreviewDynamicBits(def) {
    if (!def) return;
    const root = ctx?.animEditorPreview;
    if (!root) return;
    const el = root.querySelector("[data-anim-editor-preview-media]");
    if (el) syncMediaPreviewProps(el, def);
  }

  function buildPreviewMissingNotice(ref) {
    const box = document.createElement("div");
    box.className = "anim-editor-preview-missing";
    const title = document.createElement("p");
    title.className = "rd-caption anim-editor-preview-missing-title";
    title.textContent = "File not found";
    const path = document.createElement("p");
    path.className = "rd-caption anim-editor-preview-missing-path";
    path.textContent = ref;
    box.append(title, path);
    return box;
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIVE_PREVIEW = {
    init,
    renderPreview,
    buildPreviewSwatch,
    startCodedPreview,
    stopCodedPreview,
    startGifPreview,
    toResourceUrl,
    buildPreviewMeta,
    formatAssetType,
    applyMediaPreviewProps: syncMediaPreviewProps,
    updatePreviewDynamicBits,
    buildPreviewMissingNotice,
  };
})();
