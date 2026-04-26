// Full-page animation editor controller.
//
// Owns visibility + library/search/scope state. The middle editor
// pane and the preview column are populated by follow-up sub-commits
// (W3b-2 / W3b-4); this scaffold lives on its own so the entry/exit
// flow and the library interactions can land first, exercised end-to-
// end, and iterated on.
//
// State shape (kept module-local, not in ctx.state):
//   scope:        "inside" | "outside" | "room"
//   search:       string
//   selectedIds:  { inside, outside, room } — id per scope so
//                 switching tabs remembers the last selection.
//
// Public API (set on window.TT_BEAMER_ANIMATION_EDITOR_VIEW):
//   init(ctx)
//   open(scope?)    — open with an optional scope; defaults to last
//   close()         — close and return to Settings → Board subtab
//   isOpen()        — boolean
//   getSelection()  — { scope, id }  (future W3b-2 uses this)
//   onSelectionChange(handler)
//                   — register a listener (future W3b-2)
//   render()        — re-render library + pane (external callers
//                     can re-render after a profile change)
(() => {
  // Phase 24 W3.3-C1: shell functions (init / bindDom / populateBoardSelect /
  // isOpen / open / close / handleBack / flashDirtyBar / syncDirtyBar /
  // getEditorBoardId / getSelection / onSelectionChange / notifySelection)
  // moved to runtime/ui/animation-editor-shell.js. This file is being
  // progressively shrunk into a re-export shim across W3.3-C1..C5; until
  // C5 lands, it continues to host the library-list / edit-pane /
  // live-preview clusters and exposes the legacy aggregate namespace.
  let ctx = null;
  const shell = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_SHELL;
  const libraryList = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIBRARY_LIST;
  const editPane = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE;
  // Shared reference to the shell's module-private state object so the
  // still-in-shim functions keep their bare `state.x` mutations working
  // byte-identically until they too move out in C4.
  const state = shell.getState();
  const getEditorBoardId = shell.getEditorBoardId;
  const getSelection = shell.getSelection;
  const notifySelection = shell.notifySelection;
  const syncDirtyBar = shell.syncDirtyBar;
  // Phase 24 W3.3-C2: collectAnimations / render / renderScopeTabs /
  // renderList moved to runtime/ui/animation-editor-library-list.js.
  const render = libraryList.render;
  const renderList = libraryList.renderList;
  const collectAnimations = libraryList.collectAnimations;
  // Phase 24 W3.3-C3: renderPane / buildHeader / scopeLabel / buildIdentityCard /
  // buildDefaultsCard / getDefaultFields / buildSliderRow / buildToggleRow /
  // buildColorCard / buildSourceCard / buildAssetPickerRow / buildSoundCard /
  // buildSoundPickerRow / buildSelectRow / createAnimation / deleteAnimation /
  // sanitizeName / findDefinition / patchAnimation / updatePaneDynamicBits
  // (plus private helpers fetchAnimationResources / fetchSoundResources and
  // the module-private `currentPaneKey` cache) moved to
  // runtime/ui/animation-editor-edit-pane.js. Aliased into shim scope so
  // the still-in-shim live-preview functions (renderPreview /
  // buildPreviewSwatch / buildPreviewMeta / startCodedPreview /
  // startGifPreview) keep their bare-identifier call sites
  // byte-identical.
  const renderPane = editPane.renderPane;
  const findDefinition = editPane.findDefinition;
  const scopeLabel = editPane.scopeLabel;
  const deleteAnimation = editPane.deleteAnimation;


  // -------- Preview column ---------------------------------

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
      const name = String(def.name || "").trim() || "this animation";
      if (!window.confirm(`Delete ${name}? The change stays local until you hit Apply.`)) return;
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
        applyMediaPreviewProps(img, def);
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
        applyMediaPreviewProps(video, def);
      });
      applyMediaPreviewProps(video, def);
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
      const age = (performance.now() - startTime) / 1000;
      const scaledAge = age * speed;
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
      const age = (performance.now() - startTime) / 1000;
      const opacity = Number.isFinite(Number(current.opacity)) ? Number(current.opacity) : 1;
      const intensity = Number.isFinite(Number(current.intensity)) ? Number(current.intensity) : 1;
      const effective = window.TT_BEAMER_RUNTIME_UTILS.clamp01(opacity * intensity);
      c2d.save();
      c2d.fillStyle = "#000";
      c2d.fillRect(0, 0, canvas.width, canvas.height);
      const frame = gifApi.getGifPlaybackFrame(path, age * speed);
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
  function applyMediaPreviewProps(el, def) {
    if (!el || !def) return;
    const opacity = Number.isFinite(Number(def.opacity)) ? Number(def.opacity) : 1;
    const intensity = Number.isFinite(Number(def.intensity)) ? Number(def.intensity) : 1;
    const effective = window.TT_BEAMER_RUNTIME_UTILS.clamp01(opacity * intensity);
    el.style.opacity = String(effective);
    if (el.tagName === "VIDEO") {
      const speed = Number.isFinite(Number(def.speed)) ? Number(def.speed) : 1;
      const clamped = Math.max(0.15, Math.min(4, speed));
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
    if (el) applyMediaPreviewProps(el, def);
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

  // Aggregate the legacy public namespace by aliasing shell exports
  // for every key except `init` and `render` — `render` aliases
  // library-list.render (W3.3-C2); `init` is wrapped here so we can
  // (a) initialise the edit-pane and library-list sub-modules with
  // the cross-callbacks they need now that their bodies are extracted,
  // and (b) pass the still-in-shim live-preview callbacks
  // (renderPreview / updatePreviewDynamicBits / stopCodedPreview)
  // through to whichever sub-module needs them. C5 will retire the
  // wrapper once live-preview moves out and the shim becomes a pure
  // re-export shell.
  window.TT_BEAMER_ANIMATION_EDITOR_VIEW = {
    init: (deps) => {
      ctx = deps;
      // Edit-pane needs: shell, state, render/renderList/collectAnimations
      // (library-list), renderPreview/updatePreviewDynamicBits
      // (still-in-shim live-preview), syncDirtyBar/getEditorBoardId/
      // getSelection (shell).
      editPane.init({
        ...deps,
        shell,
        state,
        render,
        renderList,
        collectAnimations,
        renderPreview,
        updatePreviewDynamicBits,
        syncDirtyBar,
        getEditorBoardId,
        getSelection,
      });
      // Library-list needs: shell, state, renderPane (edit-pane),
      // renderPreview (still-in-shim live-preview), notifySelection /
      // syncDirtyBar / getEditorBoardId (shell).
      libraryList.init({
        ...deps,
        shell,
        state,
        renderPane: editPane.renderPane,
        renderPreview,
        notifySelection,
        syncDirtyBar,
        getEditorBoardId,
      });
      // Shell needs the cross-module callbacks resolved now: render
      // (library-list), renderList (library-list), createAnimation
      // (edit-pane), clearPaneCache (edit-pane), stopCodedPreview
      // (still-in-shim live-preview).
      shell.init({
        ...deps,
        render,
        renderList,
        createAnimation: editPane.createAnimation,
        clearPaneCache: editPane.clearPaneCache,
        stopCodedPreview,
      });
    },
    open: shell.open,
    close: shell.close,
    isOpen: shell.isOpen,
    getSelection: shell.getSelection,
    onSelectionChange: shell.onSelectionChange,
    render,
  };
})();
