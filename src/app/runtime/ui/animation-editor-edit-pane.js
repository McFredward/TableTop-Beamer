// Animation editor edit-pane — owns the Identity / Source / Coded /
// Defaults cards plus the patchAnimation / createAnimation /
// deleteAnimation / findDefinition profile-mutation helpers.
// Cross-module callbacks (renderList / render / renderPreview /
// updatePreviewDynamicBits / collectAnimations / syncDirtyBar /
// getEditorBoardId / getSelection) are wired at init time so call
// sites stay byte-identical with the pre-W3.3 IIFE.
//
// Phase 24 W3.3-C3: extracted from animation-editor-view.js. The
// module-private `currentPaneKey` cache moves with renderPane —
// shell.bindDom / shell.open clear it via the new `clearPaneCache`
// export.
//
// Phase 24 W3.6-Cextra-edit-pane: the GIF/MP4/sound asset-picker
// cluster (`buildAssetPickerRow` + `fetchAnimationResources` +
// `buildSoundCard` + `buildSoundPickerRow` + `fetchSoundResources`)
// moved out into runtime/ui/animation-editor-edit-pane-asset-picker.js
// (Option B minimal split — shell drops 1006 → ~684 to clear ≤800).
// Bare-identifier call sites in buildSourceCard (buildAssetPickerRow)
// and renderPane (buildSoundCard) stay byte-identical via parse-time
// `let` bindings populated at init from the asset-picker namespace.
(() => {
  let ctx = null;
  let state = null;

  // Cross-sub-module callbacks injected at init time. Local shadow
  // declarations let renderPane / patchAnimation / createAnimation /
  // deleteAnimation / findDefinition / buildSelectRow / buildIdentityCard
  // keep their bare-identifier call sites byte-identical with the
  // pre-W3.3 IIFE.
  let getEditorBoardId = null;
  let getSelection = null;
  let syncDirtyBar = null;
  let collectAnimations = null;
  let render = null;
  let renderList = null;
  let renderPreview = null;
  let updatePreviewDynamicBits = null;

  // W3.6-Cextra-edit-pane: asset-picker-cluster bridge bindings.
  // Populated at init from
  // window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE_ASSET_PICKER so
  // bare-identifier call sites stay byte-identical.
  let buildAssetPickerRow = null;
  let buildSoundCard = null;
  let buildSoundPickerRow = null;

  let currentPaneKey = null;

  function init(deps) {
    ctx = deps;
    state = deps.state ?? deps.shell?.getState?.() ?? null;
    if (deps.shell) {
      getEditorBoardId = deps.shell.getEditorBoardId;
      getSelection = deps.shell.getSelection;
      syncDirtyBar = deps.shell.syncDirtyBar;
    }
    if (typeof deps.getEditorBoardId === "function") getEditorBoardId = deps.getEditorBoardId;
    if (typeof deps.getSelection === "function") getSelection = deps.getSelection;
    if (typeof deps.syncDirtyBar === "function") syncDirtyBar = deps.syncDirtyBar;
    if (typeof deps.collectAnimations === "function") collectAnimations = deps.collectAnimations;
    if (typeof deps.render === "function") render = deps.render;
    if (typeof deps.renderList === "function") renderList = deps.renderList;
    if (typeof deps.renderPreview === "function") renderPreview = deps.renderPreview;
    if (typeof deps.updatePreviewDynamicBits === "function") updatePreviewDynamicBits = deps.updatePreviewDynamicBits;
    // W3.6-Cextra-edit-pane: pull asset-picker cluster refs and
    // forward `patchAnimation` so the sub-module's button handlers
    // can mutate animation state through the same path.
    const assetPicker = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE_ASSET_PICKER;
    if (assetPicker) {
      buildAssetPickerRow = assetPicker.buildAssetPickerRow;
      buildSoundCard = assetPicker.buildSoundCard;
      buildSoundPickerRow = assetPicker.buildSoundPickerRow;
      assetPicker.init({ patchAnimation });
    }
  }

  function clearPaneCache() {
    currentPaneKey = null;
  }

  function renderPane() {
    const pane = ctx.animEditorPane;
    const placeholder = ctx.animEditorPanePlaceholder;
    if (!pane) return;

    const boardId = getEditorBoardId();
    const sel = getSelection();
    const def = findDefinition(sel.scope, sel.id, boardId);
    const paneKey = def ? `${sel.scope}:${def.id}` : null;
    if (paneKey === currentPaneKey) {
      updatePaneDynamicBits(def);
      return;
    }
    currentPaneKey = paneKey;

    pane.replaceChildren();
    if (!def) {
      if (placeholder) {
        pane.append(placeholder);
        placeholder.hidden = false;
      } else {
        const empty = document.createElement("div");
        empty.className = "anim-editor-placeholder";
        empty.textContent = "Select an animation to edit.";
        pane.append(empty);
      }
      return;
    }
    if (placeholder) placeholder.hidden = true;

    pane.append(buildHeader(sel.scope, def));
    // Card order per user spec —
    //   Identity (Name + Icon)
    //   Source (asset type + path)
    //   Coded effect card (only for Room solid-color / hull-flicker)
    //   Defaults (opacity / intensity / speed / volume / loop;
    //             Outside: + mode + direction inline)
    //   Sound
    pane.append(buildIdentityCard(sel.scope, def, boardId));
    pane.append(buildSourceCard(sel.scope, def, boardId));
    const colorCard = buildColorCard(sel.scope, def, boardId);
    if (colorCard) pane.append(colorCard);
    pane.append(buildDefaultsCard(sel.scope, def, boardId));
    // Phase 50 (2026-05-22): collapsible Transform card per animation
    // (rotation / stretch / scale / offset). Mirrors the live-editor's
    // transform sliders, but persists to the definition directly so
    // operators can configure transforms WITHOUT having to start the
    // animation first. Returns null for scopes / asset types that
    // don't support transforms (inside, outside, room non-media).
    const transformCard = buildTransformCard(sel.scope, def, boardId);
    if (transformCard) pane.append(transformCard);
    pane.append(buildSoundCard(sel.scope, def, boardId));
  }

  // Phase 50: per-animation Transform card. Same fields/clamps as the
  // live-editor transform fieldset (HTML #live-editor-transform). Wraps
  // in a <details> element so the card is collapsed by default —
  // transforms are an "advanced" tweak and shouldn't clutter the pane
  // when not in use ("Ausklappmenu" per operator UAT 2026-05-22).
  function buildTransformCard(scope, def, boardId) {
    // Transform applies to mp4/gif animations. Phase 58 Wave 3.8n:
    // extended from room-only to ALSO cover inside animations (operator
    // request: inside transform 1:1 with rooms — default-editable here,
    // live-editable while running, savable). Outside stays excluded.
    if (scope !== "room" && scope !== "inside") return null;
    const assetType = String(def.assetType ?? "").toLowerCase();
    if (assetType !== "mp4" && assetType !== "gif") return null;
    const stretchSub = scope === "inside"
      ? "Fit the media to the inside Play Area."
      : "Fit the media to the room polygon shape.";

    const card = document.createElement("details");
    card.className = "anim-editor-card anim-editor-card-collapsible";
    const summary = document.createElement("summary");
    summary.className = "anim-editor-card-summary";
    summary.textContent = "Transform";
    card.append(summary);

    const fields = [
      { kind: "slider", key: "rotationDeg", label: "Rotation",
        min: -180, max: 180, step: 1,
        format: (v) => `${Math.round(v)}°` },
      { kind: "toggle", key: "stretchToPolygon", label: "Stretch to polygon",
        sub: stretchSub },
      { kind: "slider", key: "widthScale", label: "Width scale",
        min: 0.1, max: 10, step: 0.01,
        format: (v) => v.toFixed(2),
        gatedByStretch: true },
      { kind: "slider", key: "heightScale", label: "Height scale",
        min: 0.1, max: 10, step: 0.01,
        format: (v) => v.toFixed(2),
        gatedByStretch: true },
      { kind: "slider", key: "offsetXScale", label: "X offset",
        min: -1, max: 1, step: 0.01,
        format: (v) => v.toFixed(2),
        gatedByStretch: true },
      { kind: "slider", key: "offsetYScale", label: "Y offset",
        min: -1, max: 1, step: 0.01,
        format: (v) => v.toFixed(2),
        gatedByStretch: true },
    ];
    // Phase 50 (2026-05-25): operator UAT — "der 'Stretch to Polygon'
    // switch verhindert, dass ich die Animation transformiere — so weit
    // so richtig. Nur ist für den User nicht ganz so intuitiv, ich hätte
    // gerne das alle slider unter dem switch etwas ausgegraut sind und
    // das ausgrauen verschwindet wenn der switch ausgeschaltet wird".
    // The slider's `disabled` attribute on its own doesn't read as
    // intentional — the rows look identical until you try to drag the
    // thumb. Apply `.is-disabled` to the gated rows for visible opacity
    // + pointer-events: none on top of `<input disabled>` so the gate
    // is read-only AND looks read-only.
    const gatedRows = [];
    const _applyStretchGate = (stretched) => {
      for (const row of gatedRows) {
        row.classList.toggle("is-disabled", stretched);
        const input = row.querySelector("input[type='range']");
        if (input) input.disabled = stretched;
      }
    };
    for (const f of fields) {
      if (f.kind === "slider") {
        const row = buildSliderRow(scope, def, boardId, f);
        if (f.gatedByStretch) gatedRows.push(row);
        card.append(row);
      } else if (f.kind === "toggle") {
        card.append(buildToggleRow(scope, def, boardId, f, {
          onChange: (next) => {
            if (f.key === "stretchToPolygon") _applyStretchGate(next);
          },
        }));
      }
    }
    _applyStretchGate(Boolean(def.stretchToPolygon));
    return card;
  }

  function buildHeader(scope, def) {
    const header = document.createElement("header");
    header.className = "anim-editor-pane-header";
    const tile = document.createElement("span");
    tile.className = "anim-editor-pane-icon";
    const icons = window.TT_BEAMER_UI_ICONS;
    if (icons?.createIcon) {
      const name = icons.resolveAnimationIcon
        ? icons.resolveAnimationIcon(def)
        : "sparkles";
      tile.append(icons.createIcon(name, { size: 26, strokeWidth: 1.5 }));
    }
    header.append(tile);
    const wrap = document.createElement("div");
    wrap.className = "anim-editor-pane-name";
    const eyebrow = document.createElement("p");
    eyebrow.className = "rd-eyebrow";
    eyebrow.textContent = `Edit ${scopeLabel(scope)} animation`;
    const title = document.createElement("h2");
    title.className = "rd-h1";
    title.textContent = def.name;
    title.dataset.animEditorField = "title";
    wrap.append(eyebrow, title);
    header.append(wrap);
    // Prominent Delete button in the pane header
    // so the option is visible without scrolling the preview column.
    // Delete still routes through persistBoardProfiles() → dirty flag;
    // the row only actually disappears from the server after Apply.
    const del = document.createElement("button");
    del.type = "button";
    del.className = "rd-btn rd-btn-danger anim-editor-pane-delete";
    if (icons?.createIcon) del.append(icons.createIcon("trash", { size: 14 }));
    const delLabel = document.createElement("span");
    delLabel.textContent = "Delete";
    del.append(delLabel);
    del.addEventListener("click", () => {
      deleteAnimation(scope, def.id);
    });
    header.append(del);
    return header;
  }

  function scopeLabel(scope) {
    if (scope === "inside") return "Inside";
    if (scope === "outside") return "Outside";
    if (scope === "room") return "Room";
    return scope;
  }

  // Curated label overrides — keys whose auto-title-case would read
  // wrong in the Effect dropdown. Phase 58-w3.8i: the w3.8e
  // "city-workers-lit" A/B key merged into the configurable
  // city-workers effect (the registry no longer lists it; legacy
  // definitions are alias-normalized to "city-workers" with
  // workerStyle "lit"), so its picker label override is gone —
  // "city-workers" auto-formats to "City Workers".
  const CODED_EFFECT_LABEL_OVERRIDES = {};

  // Pretty-print a coded effect key for the dropdown
  // (e.g. "hull-flicker" → "Hull Flicker").
  function formatCodedEffectLabel(key) {
    const raw = String(key || "").trim();
    if (!raw) return "(none)";
    const override = CODED_EFFECT_LABEL_OVERRIDES[raw.toLowerCase()];
    if (override) return override;
    return raw
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  // -------- Identity card ------------------------------------------
  function buildIdentityCard(scope, def, boardId) {
    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Identity";
    card.append(eyebrow);

    const nameLabel = document.createElement("label");
    nameLabel.className = "anim-editor-field-label";
    const nameCaption = document.createElement("span");
    nameCaption.textContent = "Name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 64;
    nameInput.value = def.name ?? "";
    nameInput.addEventListener("input", () => {
      const next = sanitizeName(nameInput.value, def.name);
      if (next === def.name) return;
      patchAnimation(scope, boardId, def.id, { name: next });
      // Reflect the new name in the library row + pane header without
      // a full rebuild (preserves caret inside the input).
      const headerTitle = ctx.animEditorPane.querySelector("[data-anim-editor-field='title']");
      if (headerTitle) headerTitle.textContent = next;
      const selectedRow = ctx.animEditorList?.querySelector(
        `.anim-editor-row.is-selected .anim-editor-row-name`,
      );
      if (selectedRow) selectedRow.textContent = next;
    });
    nameLabel.append(nameCaption, nameInput);
    card.append(nameLabel);

    const iconField = document.createElement("div");
    iconField.className = "anim-editor-field-label";
    const iconCap = document.createElement("span");
    iconCap.textContent = "Icon";
    const iconRoot = document.createElement("div");
    iconRoot.className = "rd-icon-picker";
    iconRoot.setAttribute("role", "radiogroup");
    iconRoot.setAttribute("aria-label", "Animation icon");
    iconField.append(iconCap, iconRoot);
    card.append(iconField);

    const pickerApi = window.TT_BEAMER_UI_ICON_PICKER?.mount(iconRoot, {
      onChange: (name) => {
        patchAnimation(scope, boardId, def.id, { icon: name });
        // Refresh the library row icon + header icon.
        renderList();
        const tile = ctx.animEditorPane.querySelector(".anim-editor-pane-icon");
        if (tile) {
          tile.replaceChildren();
          const icons = window.TT_BEAMER_UI_ICONS;
          tile.append(icons.createIcon(name, { size: 26, strokeWidth: 1.5 }));
        }
      },
    });
    // Reflect the EFFECTIVE icon (explicit
    // definition.icon if set, else the heuristic fallback) so the
    // user always sees which glyph is rendering in the Dashboard
    // library + Active Animations list. Picking the same tile is a
    // no-op in the icon-picker module, so no accidental writes.
    const icons = window.TT_BEAMER_UI_ICONS;
    const resolved = def.icon
      ?? (icons?.resolveAnimationIcon ? icons.resolveAnimationIcon(def) : null);
    pickerApi?.setValue(resolved ?? null);
    return card;
  }

  // -------- Defaults card ------------------------------------------
  function buildDefaultsCard(scope, def, boardId) {
    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Defaults";
    card.append(eyebrow);

    const fields = getDefaultFields(scope, def);
    for (const f of fields) {
      if (f.kind === "slider") {
        card.append(buildSliderRow(scope, def, boardId, f));
      } else if (f.kind === "toggle") {
        card.append(buildToggleRow(scope, def, boardId, f));
      } else if (f.kind === "select") {
        card.append(buildSelectRow(scope, def, boardId, f));
      }
    }
    return card;
  }

  function getDefaultFields(scope, def) {
    const fields = [];
    if (scope === "room") {
      // Resolve coded-effect type so we can hide sliders that the
      // chosen renderer ignores. Audit (Phase 25 user feedback):
      //  - room coded "solid-color" never uses age/speed (static
      //    fill) → hide Speed.
      //  - room "gif" passes opacity-from-animation.opacity to the
      //    gif render config and ignores animation.intensity in
      //    that path → hide Intensity.
      //  - room "mp4" sets canvas globalAlpha from animation.opacity
      //    only; intensity is unused in the mp4 branch → hide
      //    Intensity.
      const resolveCoded = ctx.resolveRoomCodedEffectType;
      const codedType = def.assetType === "coded"
        ? (typeof resolveCoded === "function" ? resolveCoded(def.assetRef) || def.assetRef : def.assetRef)
        : null;
      const isSolidColor = codedType === "solid-color";
      const isMedia = def.assetType === "gif" || def.assetType === "mp4";
      // Phase 58-w3.8i: city-workers population is configured via the
      // explicit "Anzahl Bewohner" option (Coded effect card); the
      // intensity knob is decoupled and otherwise unused by that
      // renderer — hide it so it isn't dead UI.
      const isCityWorkers = codedType === "city-workers" || codedType === "city-workers-lit";

      fields.push({
        kind: "slider", key: "opacity", label: "Opacity",
        min: 0.1, max: 1, step: 0.05,
        format: (v) => `${Math.round(v * 100)}%`,
      });
      if (!isMedia && !isCityWorkers) {
        fields.push({
          kind: "slider", key: "intensity", label: "Intensity",
          min: 0.2, max: 1.5, step: 0.05,
          format: (v) => v.toFixed(2),
        });
      }
      if (!isSolidColor) {
        fields.push({
          kind: "slider", key: "speed", label: "Speed",
          min: 0.1, max: 2.5, step: 0.05,
          format: (v) => `${v.toFixed(2)}x`,
        });
      }
      fields.push({
        kind: "slider", key: "soundVolume", label: "Sound volume",
        min: 0, max: 1, step: 0.01,
        format: (v) => `${Math.round(v * 100)}%`,
      });
    } else {
      fields.push({
        kind: "slider", key: "intensity", label: "Intensity",
        min: 0.2, max: 1.5, step: 0.05,
        format: (v) => v.toFixed(2),
      });
      fields.push({
        kind: "slider", key: "speed", label: "Speed",
        min: 0.3, max: 2.5, step: 0.05,
        format: (v) => `${v.toFixed(2)}x`,
      });
      if (scope === "outside") {
        // Mode + direction used to live in
        // a separate Playback card; inlined into Defaults so the user
        // has one consolidated tuning area. Polish update: mode
        // + direction only render for coded outside effects — GIF and
        // MP4 ignore both at runtime, so the controls were dead UI.
        if (def.assetType === "coded") {
          fields.push({
            kind: "select", key: "mode", label: "Mode",
            options: [
              { value: "standard", label: "Standard" },
              { value: "immersive", label: "Immersive" },
            ],
          });
          fields.push({
            kind: "select", key: "direction", label: "Direction",
            options: [
              { value: "forward", label: "Forward" },
              { value: "reverse", label: "Reverse" },
            ],
          });
        }
      }
    }
    // Phase 58: per-animation playback mode for gif/mp4 in all three
    // scopes. Replaces the legacy inside-only `loopUntilStopped` toggle.
    // Stufenweise picker: Mode dropdown, then On-retrigger sub-dropdown
    // appears conditionally when Mode = "play-then-freeze".
    const isMedia = def.assetType === "gif" || def.assetType === "mp4";
    if (isMedia) {
      // Phase 58 Wave 3.3: initial direction is a separate per-animation
      // control. Forward (default) plays start→end; Reverse plays
      // end→start. The "When ended" dropdown defines what happens AFTER
      // that initial playthrough (forward OR reverse).
      fields.push({
        kind: "select", key: "playbackDirection", label: "Initial direction",
        options: [
          { value: "forward", label: "Forward (start to end)" },
          { value: "reverse", label: "Reverse (end to start)" },
        ],
      });
      // Phase 58 Wave 3.3: the previous 4-mode + 3-sub-option layout
      // was confusing because "Play once, then freeze" combined with
      // "reverse-then-disappear" said freeze on the surface but
      // actually disappeared after re-trigger (operator UAT
      // 2026-06-04). Restructured into 5 self-explanatory uiMode
      // entries; the sub-dropdown only appears when the uiMode
      // explicitly mentions reverse-on-re-trigger.
      const uiMode = computeUiPlaybackMode(def);
      fields.push({
        kind: "select", key: "_uiPlaybackMode", label: "When ended",
        options: [
          { value: "loop",                       label: "Loop forever" },
          { value: "play-once-disappear",        label: "Disappear" },
          { value: "play-once-freeze",           label: "Freeze (re-trigger removes)" },
          { value: "play-once-freeze-reversible", label: "Freeze, reverse on re-trigger" },
          { value: "boomerang",                  label: "Boomerang (auto forward & reverse)" },
        ],
        // Synthetic field: read/write derives playbackMode + onRetrigger.
        _uiMode: true,
        _currentUiValue: uiMode,
      });
      if (uiMode === "play-once-freeze-reversible") {
        fields.push({
          kind: "select", key: "onRetrigger", label: "After reverse on re-trigger",
          options: [
            { value: "reverse-then-freeze-first", label: "Freeze at first frame (manual ping-pong)" },
            { value: "reverse-then-disappear",    label: "Disappear" },
          ],
        });
      }
    }
    return fields;
  }

  // Phase 58 Wave 3.3: derive the UI-level playback mode from the
  // stored (playbackMode, onRetrigger) pair. See getDefaultFields for
  // the mapping rationale.
  function computeUiPlaybackMode(def) {
    const mode = String(def?.playbackMode || "loop");
    const onRetrigger = String(def?.onRetrigger || "instant-disappear");
    if (mode === "loop") return "loop";
    if (mode === "play-once-disappear") return "play-once-disappear";
    if (mode === "boomerang") return "boomerang";
    if (mode === "play-then-freeze") {
      if (onRetrigger === "instant-disappear") return "play-once-freeze";
      return "play-once-freeze-reversible";
    }
    return "loop";
  }

  // Phase 58 Wave 3.3: inverse mapping. Given a uiMode value picked in
  // the dropdown, return the (playbackMode, onRetrigger) patch the
  // patchAnimation call must apply.
  function uiPlaybackModeToPatch(uiMode, prevOnRetrigger) {
    switch (uiMode) {
      case "loop":
        return { playbackMode: "loop", onRetrigger: "instant-disappear" };
      case "play-once-disappear":
        return { playbackMode: "play-once-disappear", onRetrigger: "instant-disappear" };
      case "play-once-freeze":
        return { playbackMode: "play-then-freeze", onRetrigger: "instant-disappear" };
      case "play-once-freeze-reversible":
        // Default to freeze-first if the previous onRetrigger wasn't a
        // reverse-then-X choice; otherwise preserve the operator's
        // previous selection so toggling in/out of the uiMode doesn't
        // lose state.
        return {
          playbackMode: "play-then-freeze",
          onRetrigger: (prevOnRetrigger === "reverse-then-disappear"
            ? "reverse-then-disappear"
            : "reverse-then-freeze-first"),
        };
      case "boomerang":
        return { playbackMode: "boomerang", onRetrigger: "instant-disappear" };
      default:
        return { playbackMode: "loop", onRetrigger: "instant-disappear" };
    }
  }

  function buildSliderRow(scope, def, boardId, field) {
    const row = document.createElement("div");
    row.className = "anim-editor-slider-row";
    const head = document.createElement("div");
    head.className = "anim-editor-slider-row-head";
    const lab = document.createElement("span");
    lab.textContent = field.label;
    const val = document.createElement("span");
    val.className = "rd-num";
    const initial = Number(def[field.key]);
    val.textContent = Number.isFinite(initial) ? field.format(initial) : "—";
    head.append(lab, val);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(Number.isFinite(initial) ? initial : field.min);
    // Phase 58-w3.8t: capture the pointer for the whole drag. The FIRST
    // input on a slider flips localConfigDirty false→true, which reveals
    // the topbar dirty bar (reflowing the layout, nudging the slider out
    // from under the held pointer) and blurs focus — either of which
    // detaches a native <input type=range> drag mid-gesture in real
    // browsers, so the operator could only move ONE tick on the first
    // drag and had to press again (operator UAT: "kann man zu Beginn
    // immer nur einen Tick verschieben"). Binding the pointer to this
    // element until pointerup keeps the slide alive across the dirty-flag
    // activation regardless of focus or layout shift. (Belt-and-braces
    // with the range-input blur exclusion in shell.js syncDirtyBar.)
    input.addEventListener("pointerdown", (e) => {
      try { input.setPointerCapture(e.pointerId); } catch { /* unsupported — ignore */ }
    });
    input.addEventListener("input", () => {
      const v = Number(input.value);
      val.textContent = field.format(v);
      patchAnimation(scope, boardId, def.id, { [field.key]: v });
    });
    row.append(head, input);
    return row;
  }

  function buildToggleRow(scope, def, boardId, field, opts = {}) {
    const row = document.createElement("div");
    row.className = "anim-editor-toggle-row";
    const text = document.createElement("div");
    text.className = "anim-editor-toggle-row-text";
    const title = document.createElement("span");
    title.className = "anim-editor-toggle-row-title";
    title.textContent = field.label;
    text.append(title);
    if (field.sub) {
      const sub = document.createElement("span");
      sub.className = "anim-editor-toggle-row-sub";
      sub.textContent = field.sub;
      text.append(sub);
    }
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "rd-toggle";
    toggle.setAttribute("role", "switch");
    const initial = Boolean(def[field.key]);
    toggle.setAttribute("aria-checked", initial ? "true" : "false");
    toggle.addEventListener("click", () => {
      const next = toggle.getAttribute("aria-checked") !== "true";
      toggle.setAttribute("aria-checked", next ? "true" : "false");
      patchAnimation(scope, boardId, def.id, { [field.key]: next });
      // Phase 50 (2026-05-25): notify callers (buildTransformCard) so
      // dependent rows can re-apply visual gating without a full pane
      // rebuild — preserves the toggle's own focus / pressed state.
      if (typeof opts?.onChange === "function") {
        try { opts.onChange(next); } catch (err) { console.error(err); }
      }
    });
    row.append(text, toggle);
    return row;
  }

  // -------- Scope-specific cards --------------------------

  // Room animations of the `solid-color` coded variant expose a color
  // swatch; hull-flicker and power-outage expose breaksSolidColor.
  // Non-matching variants don't need this card.
  function buildColorCard(scope, def, boardId) {
    // Phase 58-w3.8p — the coded catalog is unified across scopes, so
    // the Coded-effect card (tint / heat source / city-workers) now
    // surfaces for inside + outside too, not only room. The
    // breaksSolidColor toggle stays ROOM-ONLY: solid-color coupling
    // resolves per room polygon (findActiveBreakingGate keys on
    // room.id), so it is a no-op in the inside/outside scopes.
    const resolveCodedType = scope === "inside" ? ctx.resolveInsideCodedEffectType
      : scope === "outside" ? ctx.resolveOutsideCodedEffectType
      : ctx.resolveRoomCodedEffectType;
    const coded = def.assetType === "coded"
      ? (typeof resolveCodedType === "function"
        ? resolveCodedType(def.assetRef) || def.assetRef
        : def.assetRef)
      : null;
    const isSolidColor = coded === "solid-color";
    const isHullFlicker = coded === "hull-flicker" && scope === "room";
    const isPowerOutage = coded === "power-outage" && scope === "room";
    // resolveRoomCodedEffectType maps the legacy "generator-heat"
    // alias to "heat" (Phase 58-w3.7x rename), so pre-rename
    // definitions get the same tint card.
    const isHeat = coded === "heat";
    const isCityWorkers = coded === "city-workers" || coded === "city-workers-lit";
    if (!isSolidColor && !isHullFlicker && !isPowerOutage && !isHeat && !isCityWorkers) return null;

    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Coded effect";
    card.append(eyebrow);

    if (isSolidColor || isHeat || isCityWorkers) {
      const label = document.createElement("label");
      label.className = "anim-editor-field-label";
      const cap = document.createElement("span");
      // Phase 58-w3.8s: city-workers gets an explicit German label
      // ("Laternen-Farbe") so it's clear the colour tints the workers'
      // carried lanterns (operator UAT: "nicht klar, was die Farbe
      // ist"). The .anim-editor-field-label grid stacks this caption
      // ABOVE the swatch. Heat keeps its own "Heat tint" label.
      cap.textContent = isHeat ? "Heat tint" : isCityWorkers ? "Laternen-Farbe" : "Color";
      const picker = document.createElement("input");
      picker.type = "color";
      // heat defaults to its ember-orange core; city-workers to the
      // muted lantern ember; solid-color keeps the legacy red default.
      const fallbackHex = isHeat ? "#ff7a1a" : isCityWorkers ? "#c98a4b" : "#ff0000";
      picker.value = /^#[0-9a-f]{6}$/i.test(def.colorHex) ? def.colorHex : fallbackHex;
      picker.addEventListener("input", () => {
        patchAnimation(scope, boardId, def.id, { colorHex: picker.value });
      });
      label.append(cap, picker);
      card.append(label);
    }

    if (isHeat) {
      // Phase 58-w3.8g — heat-source visibility + nearest-source pulse
      // sync. The sync toggle only means anything while the source is
      // hidden, so it is greyed out (same .is-disabled pattern as the
      // stretch-gated transform sliders) while "Hitzequelle anzeigen"
      // is ON — without losing its stored value.
      const syncRow = buildToggleRow(scope, def, boardId, {
        key: "heatSyncNearestSource",
        label: "Mit nächster Hitzequelle synchronisieren",
        sub: "Pulsiert im Takt der nächstgelegenen laufenden Hitze-Animation mit sichtbarer Quelle (nur ohne sichtbare Quelle wirksam).",
      });
      const applyHeatSourceGate = (showSource) => {
        syncRow.classList.toggle("is-disabled", showSource);
        const toggle = syncRow.querySelector("button.rd-toggle");
        if (toggle) toggle.disabled = showSource;
      };
      card.append(buildToggleRow(scope, def, boardId, {
        key: "heatShowSource",
        label: "Hitzequelle anzeigen",
        sub: "AN: heller atmender Kern. AUS: nur rotes Pulsieren ohne sichtbaren Hotspot.",
      }, {
        onChange: (next) => applyHeatSourceGate(next),
      }));
      card.append(syncRow);
      applyHeatSourceGate(def.heatShowSource !== false);
    }

    if (isCityWorkers) {
      // Phase 58-w3.8i — merged city-workers options (German labels,
      // same per-definition plumbing as the w3.8g heat checkboxes).
      // "Darstellung" replaces the former separate "city-workers-lit"
      // registry entry; the other knobs parametrize population, group
      // events, lantern share and snow trails. Defaults render the
      // historical dark variant exactly.
      card.append(buildSelectRow(scope, def, boardId, {
        key: "workerStyle",
        label: "Darstellung",
        options: [
          { value: "dark", label: "Silhouette (Dashboard)" },
          { value: "lit", label: "Beleuchtet (Beamer)" },
        ],
      }));
      card.append(buildSliderRow(scope, def, boardId, {
        key: "workerCount",
        label: "Anzahl Bewohner",
        // Phase 58-w3.8s: max doubled 12 → 24 (min 1, default unchanged).
        min: 1, max: 24, step: 1,
        format: (v) => `${Math.round(v)}`,
      }));
      card.append(buildSliderRow(scope, def, boardId, {
        key: "workerSize",
        label: "Größe der Bewohner",
        // Phase 58-w3.8s: figure-size multiplier (default 1.0).
        min: 0.5, max: 2, step: 0.1,
        format: (v) => `${Math.round(v * 100)}%`,
      }));
      card.append(buildSelectRow(scope, def, boardId, {
        key: "workerGroups",
        label: "Gruppen",
        options: [
          { value: "off", label: "aus" },
          { value: "rare", label: "selten" },
          { value: "normal", label: "normal" },
          { value: "frequent", label: "häufig" },
        ],
      }));
      card.append(buildSliderRow(scope, def, boardId, {
        key: "workerLanternShare",
        label: "Laternen-Anteil",
        min: 0, max: 100, step: 5,
        format: (v) => `${Math.round(v)}%`,
      }));
      card.append(buildSliderRow(scope, def, boardId, {
        key: "workerClothingBrightness",
        label: "Helligkeit der Kleidung",
        // Phase 58-w3.8w: scales the coat luminance in both styles
        // (most visible in "Beleuchtet"); 100% = historical look.
        min: 0.3, max: 2, step: 0.05,
        format: (v) => `${Math.round(v * 100)}%`,
      }));
      // Phase 58-w3.8w — snow-trail block: on/off toggle plus a
      // prominence slider that scales the peak alpha before the trails
      // fade. The slider only matters while trails are ON, so it is
      // greyed (same .is-disabled pattern as the heat sync row) without
      // losing its stored value.
      const trailIntensityRow = buildSliderRow(scope, def, boardId, {
        key: "workerTrailIntensity",
        label: "Spuren-Intensität",
        min: 0, max: 100, step: 5,
        format: (v) => `${Math.round(v)}%`,
      });
      const applyTrailGate = (trailsOn) => {
        trailIntensityRow.classList.toggle("is-disabled", !trailsOn);
        const input = trailIntensityRow.querySelector("input[type=range]");
        if (input) input.disabled = !trailsOn;
      };
      card.append(buildToggleRow(scope, def, boardId, {
        key: "workerTrails",
        label: "Spuren im Schnee",
        sub: "Bewohner hinterlassen langsam verblassende Pfade im Schnee.",
      }, {
        onChange: (next) => applyTrailGate(next),
      }));
      card.append(trailIntensityRow);
      applyTrailGate(def.workerTrails !== false);
      // Phase 58-w3.8w — center-exclusion block: toggle + radius. The
      // radius only applies while the toggle is on, so it is greyed
      // while OFF without losing its stored value.
      const exclusionRadiusRow = buildSliderRow(scope, def, boardId, {
        key: "workerCenterExclusionRadius",
        label: "Aussparungs-Radius",
        min: 0, max: 60, step: 5,
        format: (v) => `${Math.round(v)}%`,
      });
      const applyExclusionGate = (on) => {
        exclusionRadiusRow.classList.toggle("is-disabled", !on);
        const input = exclusionRadiusRow.querySelector("input[type=range]");
        if (input) input.disabled = !on;
      };
      card.append(buildToggleRow(scope, def, boardId, {
        key: "workerCenterExclusion",
        label: "Mitte aussparen",
        sub: "Bewohner und Spuren meiden einen kreisförmigen Bereich um die Mitte (z. B. den Generator).",
      }, {
        onChange: (next) => applyExclusionGate(next),
      }));
      card.append(exclusionRadiusRow);
      applyExclusionGate(def.workerCenterExclusion === true);
    }

    if (isHullFlicker) {
      card.append(buildToggleRow(scope, def, boardId, {
        key: "breaksSolidColor",
        label: "Break solid color",
        sub: "Cuts any solid-color animation in the same room during the flicker’s off-gate.",
      }));
    }
    if (isPowerOutage) {
      card.append(buildToggleRow(scope, def, boardId, {
        key: "breaksSolidColor",
        label: "Break solid color",
        sub: "Cuts any solid-color animation in the same room except during the brief blue-flash flickers.",
      }));
    }
    return card;
  }

  // -------- Source + Sound cards ----------------------------------

  function buildSourceCard(scope, def, boardId) {
    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Source";
    card.append(eyebrow);

    card.append(buildSelectRow(scope, def, boardId, {
      key: "assetType",
      label: "Type",
      options: [
        { value: "coded", label: "Effect (coded)" },
        { value: "gif",   label: "GIF" },
        { value: "mp4",   label: "Video" },
      ],
    }));

    if (def.assetType === "gif" || def.assetType === "mp4") {
      card.append(buildAssetPickerRow(scope, def, boardId));
    } else {
      // Coded effect dropdown — use the scope-specific registry of
      // valid keys so the user can pick an effect from the list
      // instead of typing one and hoping it matches a renderer.
      // (Phase 25 user feedback: "key" text input was unguessable.)
      const label = document.createElement("label");
      label.className = "anim-editor-field-label";
      const cap = document.createElement("span");
      cap.textContent = "Effect";
      const select = document.createElement("select");
      const getKeys = scope === "room" ? ctx.getRoomCodedAssetKeys
        : scope === "inside" ? ctx.getInsideCodedAssetKeys
        : scope === "outside" ? ctx.getOutsideCodedAssetKeys
        : null;
      const codedKeys = (typeof getKeys === "function" ? getKeys() : []) || [];
      const currentRef = String(def.assetRef ?? "").trim().toLowerCase();
      // Make sure the current value is in the list even if the
      // registry doesn't recognise it (legacy / hand-typed values).
      const optionKeys = currentRef && !codedKeys.includes(currentRef)
        ? [currentRef, ...codedKeys]
        : codedKeys;
      for (const key of optionKeys) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = formatCodedEffectLabel(key);
        if (key === currentRef) option.selected = true;
        select.append(option);
      }
      select.addEventListener("change", () => {
        const patch = { assetRef: select.value };
        // heat (Phase 58-w3.7w, renamed from "generator-heat" in
        // w3.7x — the alias can still appear as a legacy option) and
        // city-workers (w3.7y) seed their muted default tints when the
        // definition still carries the legacy solid-color red default
        // (every fresh definition does) or no color at all — the
        // operator picked "heat"/"workers", not "alarm". An explicitly
        // chosen non-default color is preserved.
        const tintSeedByEffect = {
          "heat": "#ff7a1a",
          "generator-heat": "#ff7a1a",
          "city-workers": "#c98a4b",
          "city-workers-lit": "#c98a4b",
        };
        const tintSeed = tintSeedByEffect[select.value];
        if (tintSeed) {
          const currentHex = String(def.colorHex ?? "").trim().toLowerCase();
          if (!/^#[0-9a-f]{6}$/.test(currentHex) || currentHex === "#ff0000") {
            patch.colorHex = tintSeed;
          }
        }
        patchAnimation(scope, boardId, def.id, patch);
        // Phase 46 iter6 (2026-05-17): coded-effect change can change the
        // fields shown in the pane — e.g. picking "solid-color" should
        // immediately surface the colour picker; switching FROM solid-color
        // should remove it. Mirror the assetType-change behaviour
        // (line ~570) and force a pane rebuild so the operator doesn't
        // have to round-trip through a different animation to see the
        // new fields. Operator UAT: "der Coded Effect erscheint erst
        // nachdem ich zu einer anderen Animation gewechselt bin und
        // wieder zurück."
        currentPaneKey = null;
        renderPane();
      });
      label.append(cap, select);
      card.append(label);
    }
    return card;
  }

  // GIF/MP4 pickers (`buildAssetPickerRow` + private
  // `fetchAnimationResources`) and the Sound card + sound picker
  // (`buildSoundCard` + `buildSoundPickerRow` + private
  // `fetchSoundResources`) moved to
  // animation-editor-edit-pane-asset-picker.js in W3.6-Cextra-edit-pane.
  // Bare-identifier call sites in `buildSourceCard` (line ~440) and
  // `renderPane` (line ~100) resolve through the parse-time `let`
  // bindings populated at init from the asset-picker namespace, so
  // those call sites stay byte-identical with the pre-W3.6 IIFE.

  function buildSelectRow(scope, def, boardId, field) {
    const label = document.createElement("label");
    label.className = "anim-editor-field-label";
    const cap = document.createElement("span");
    cap.textContent = field.label;
    const select = document.createElement("select");
    for (const opt of field.options) {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      select.append(option);
    }
    // Phase 58 Wave 3.3: the synthetic uiPlaybackMode field reads its
    // current value from the field metadata (since it doesn't exist on
    // the definition) and writes back as a translated patch.
    if (field._uiMode) {
      select.value = String(field._currentUiValue ?? field.options[0]?.value ?? "");
    } else {
      select.value = String(def[field.key] ?? field.options[0]?.value ?? "");
    }
    select.addEventListener("change", () => {
      if (field._uiMode) {
        const patch = uiPlaybackModeToPatch(select.value, def.onRetrigger);
        patchAnimation(scope, boardId, def.id, patch);
        currentPaneKey = null;
        renderPane();
        return;
      }
      patchAnimation(scope, boardId, def.id, { [field.key]: select.value });
      // Changing assetType in the Source card should rebuild the
      // asset-ref caption ("GIF path" vs "Effect key"); easiest way
      // is a full pane rebuild, losing any in-flight caret — but
      // changing assetType is an infrequent, deliberate action.
      // Phase 58: same treatment for playbackMode + direction — these
      // change the live-preview semantics and the visible subfields.
      if (
        field.key === "assetType"
        || field.key === "playbackMode"
        || field.key === "playbackDirection"
        || field.key === "onRetrigger"
      ) {
        currentPaneKey = null;
        renderPane();
      }
      // Phase 58 W3.7v (2026-06-06): the library row's subtitle shows
      // the animation's assetType (and the row icon is derived from
      // it) — refresh the list so both update immediately instead of
      // only after the editor is closed and reopened. renderList()
      // preserves selection (state.selectedIds) and scrollTop
      // (gap-closure-21), so this is a safe in-place refresh. Name
      // staleness doesn't exist: the Name input patches the selected
      // row's textContent directly (buildIdentityCard).
      if (field.key === "assetType") {
        renderList();
      }
    });
    label.append(cap, select);
    return label;
  }

  // -------- Create + Delete --------------------------------

  function createAnimation(scope) {
    const boardId = getEditorBoardId();
    if (!boardId) return;
    const getter = scope === "inside" ? ctx.getInsideFxProfile
      : scope === "outside" ? ctx.getOutsideFxProfile
      : scope === "room" ? ctx.getRoomFxProfile
      : null;
    const setter = scope === "inside" ? ctx.setInsideFxProfile
      : scope === "outside" ? ctx.setOutsideFxProfile
      : scope === "room" ? ctx.setRoomFxProfile
      : null;
    if (!getter || !setter) return;
    const profile = getter(boardId);
    const existing = profile?.animations ?? [];
    const seeds = {
      inside:  { prefix: "inside",  assetRef: "hull-flicker" },
      outside: { prefix: "outside", assetRef: "outside-space" },
      room:    { prefix: "room",    assetRef: "intruder-alert" },
    };
    const s = seeds[scope] ?? seeds.inside;
    let n = existing.length + 1;
    let id;
    do {
      id = `${s.prefix}-${Date.now().toString(36)}-${n}`;
      n += 1;
    } while (existing.some((d) => d.id === id));
    const label = `${scopeLabel(scope)} animation ${existing.length + 1}`;
    const newDef = {
      id,
      name: label,
      assetType: "coded",
      assetRef: s.assetRef,
    };
    const next = {
      ...profile,
      animations: [...existing, newDef],
    };
    setter(boardId, next);
    if (typeof ctx.persistBoardProfiles === "function") ctx.persistBoardProfiles();
    if (typeof ctx.refreshGlobalButtons === "function") ctx.refreshGlobalButtons();
    state.selectedIds[scope] = id;
    currentPaneKey = null;
    render();
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent = `Status: Created ${label}`;
    }
  }

  function deleteAnimation(scope, id) {
    const boardId = getEditorBoardId();
    if (!boardId || !id) return;
    const getter = scope === "inside" ? ctx.getInsideFxProfile
      : scope === "outside" ? ctx.getOutsideFxProfile
      : scope === "room" ? ctx.getRoomFxProfile
      : null;
    const setter = scope === "inside" ? ctx.setInsideFxProfile
      : scope === "outside" ? ctx.setOutsideFxProfile
      : scope === "room" ? ctx.setRoomFxProfile
      : null;
    if (!getter || !setter) return;
    const profile = getter(boardId);
    const existing = profile?.animations ?? [];
    if (existing.length === 0) return;
    const nextAnimations = existing.filter((d) => d.id !== id);
    const nextSelectedId = nextAnimations[0]?.id ?? null;
    const next = {
      ...profile,
      animations: nextAnimations,
      selectedAnimationId: nextSelectedId ?? profile.selectedAnimationId,
    };
    setter(boardId, next);
    if (typeof ctx.persistBoardProfiles === "function") ctx.persistBoardProfiles();
    if (typeof ctx.refreshGlobalButtons === "function") ctx.refreshGlobalButtons();
    state.selectedIds[scope] = nextSelectedId;
    currentPaneKey = null;
    render();
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent = "Status: Animation deleted";
    }
  }

  // -------- Shared helpers -----------------------------------------

  function sanitizeName(value, fallback) {
    const trimmed = String(value ?? "").trim();
    return trimmed || String(fallback ?? "").trim() || "Unnamed animation";
  }

  function findDefinition(scope, id, boardId) {
    if (!scope || !id || !boardId) return null;
    const list = collectAnimations(scope);
    return list.find((def) => def.id === id) ?? null;
  }

  // Patch a single animation in-place by id across any scope and
  // persist via the registered profile setter. Mirrors the legacy
  // Rename / slider handlers in runtime-wire-fx-panel-binders.js
  // without requiring the patched animation to match
  // profile.selectedAnimationId (which belongs to the old sidebar
  // workflow).
  function patchAnimation(scope, boardId, id, patch) {
    if (!ctx || !boardId || !id) return;
    const setter = scope === "inside" ? ctx.setInsideFxProfile
      : scope === "outside" ? ctx.setOutsideFxProfile
      : scope === "room" ? ctx.setRoomFxProfile
      : null;
    const getter = scope === "inside" ? ctx.getInsideFxProfile
      : scope === "outside" ? ctx.getOutsideFxProfile
      : scope === "room" ? ctx.getRoomFxProfile
      : null;
    if (!setter || !getter) return;
    const profile = getter(boardId);
    if (!profile?.animations) return;
    const next = {
      ...profile,
      animations: profile.animations.map((def) =>
        def.id === id ? { ...def, ...patch } : def,
      ),
    };
    setter(boardId, next);
    if (typeof ctx.persistBoardProfiles === "function") {
      ctx.persistBoardProfiles();
    }
    if (typeof ctx.refreshGlobalButtons === "function") {
      ctx.refreshGlobalButtons();
    }
    // Phase 50 (2026-05-25): operator UAT — "Die Transform-Einstellungen
    // einer Animation, die im Animations-Menu eingestellt wurden, werden
    // nicht respektiert. D.h. wenn ich eine Animation starte wird die
    // Animation trotzdem normal gestartet ohne dass die gespeicherten
    // Werte respektiert werden". Root cause: the dashboard trigger reads
    // `state.roomDraft.*` (rotationDeg/widthScale/etc.) — and the draft
    // is only re-seeded from the def when the user switches to a
    // DIFFERENT animation id (room-dispatch.js:65 gate). Editing the
    // same animation in the editor pane leaves the draft pinned to its
    // old seed. Fix: when a room-scope def matching the current draft
    // animation gets patched, clear `lastSyncedAnimationId` so the next
    // trigger re-seeds the draft from the freshly-edited def.
    //
    // NOTE: ctx.state here is the SHELL's local UI state (overridden in
    // animation-editor-view.js so the edit-pane's existing `state.scope
    // /search/selectedIds` refs keep working). The RUNTIME state — which
    // holds roomDraft + boardId — is passed in separately as
    // ctx.runtimeState. v1.0.26 incorrectly read ctx.state and the
    // condition was always false; this is the v1.0.27 retry.
    //
    // Phase 50 (2026-05-25) v1.0.28 retry: drop the gating conditions
    // (animationId / boardId match) — they were correct in theory but
    // brittle in practice. After three failed retries the operator
    // still reported "die gespeicherten Werte werden nicht
    // respektiert". Clearing lastSyncedAnimationId unconditionally on
    // any room-scope patch is safe: the room-dispatch.js:65 gate
    // resets the flag back to selectedDefinition.id at the next
    // trigger; worst case we re-seed an extra time. Idempotent +
    // resilient against stale-board edge cases.
    const runtimeState = ctx.runtimeState ?? ctx.state;
    if (scope === "room" && runtimeState?.roomDraft) {
      runtimeState.roomDraft.lastSyncedAnimationId = null;
    }
    // Every patch may flip localConfigDirty;
    // reflect it in the editor topbar immediately.
    syncDirtyBar();
    // Keep the Live preview in lockstep with the pending
    // edits — even before the user hits Apply. Coded-effect previews
    // already read `findDefinition()` each rAF tick so slider +
    // colour changes animate live; but switching asset type, asset
    // ref, or coded-effect key needs a full rebuild since the preview
    // element swaps (img ↔ video ↔ canvas) or points at a different
    // media file. Patches that only nudge numeric params skip the
    // rebuild to avoid canvas flicker under rapid slider input.
    const selection = getSelection();
    const affectsSelection = selection.scope === scope && selection.id === id;
    if (!affectsSelection) return;
    const touchesPreviewSource = patch && (
      Object.prototype.hasOwnProperty.call(patch, "assetType")
      || Object.prototype.hasOwnProperty.call(patch, "assetRef")
      // Phase 58 Wave 3.1: mode + direction change the preview
      // element's playback semantics (loop attr, initial src for
      // reverse, ended-handler behavior). Force a full rebuild so the
      // <video> element gets the new flags applied.
      || Object.prototype.hasOwnProperty.call(patch, "playbackMode")
      || Object.prototype.hasOwnProperty.call(patch, "playbackDirection")
      || Object.prototype.hasOwnProperty.call(patch, "onRetrigger")
    );
    if (touchesPreviewSource) {
      renderPreview();
      return;
    }
    // Phase 58 Wave 3.3: for non-loop modes, the preview is supposed
    // to fully demo each playthrough — but our numeric-patch fast path
    // would otherwise leave a frozen / disappeared preview untouched
    // when the operator nudges sliders. Force a full rebuild so the
    // operator sees the freshly-tuned playthrough every time. Loop
    // mode keeps the fast path (no visible benefit from rebuilding
    // mid-loop and it would interrupt the continuous animation).
    const freshDef = findDefinition(scope, id, boardId);
    const isNonLoop = freshDef
      && freshDef.playbackMode
      && freshDef.playbackMode !== "loop";
    if (isNonLoop && (freshDef.assetType === "mp4" || freshDef.assetType === "gif")) {
      renderPreview();
      return;
    }
    // Numeric / toggle patches — update opacity / intensity /
    // playbackRate in-place on the existing img or video element.
    // Coded effects already react live via the rAF loop reading
    // findDefinition() each tick; no rebuild needed there.
    const fresh = findDefinition(scope, id, boardId);
    updatePreviewDynamicBits(fresh);
  }

  // Update values without rebuilding — preserves input focus.
  function updatePaneDynamicBits(def) {
    if (!def) return;
    const pane = ctx.animEditorPane;
    if (!pane) return;
    const headerTitle = pane.querySelector("[data-anim-editor-field='title']");
    if (headerTitle && headerTitle.textContent !== def.name) {
      headerTitle.textContent = def.name;
    }
  }

  // W3.6-Cextra-edit-pane: re-export the 3 asset-picker keys from the
  // sub-module so the 22-key namespace contract stays intact for any
  // downstream caller. The asset-picker `<script>` is loaded BEFORE
  // this file in index.html, so its namespace is already populated at
  // parse-time of this IIFE.
  const _assetPickerNs = window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE_ASSET_PICKER || {};
  window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE = {
    init,
    clearPaneCache,
    renderPane,
    buildHeader,
    scopeLabel,
    buildIdentityCard,
    buildDefaultsCard,
    getDefaultFields,
    buildSliderRow,
    buildToggleRow,
    buildColorCard,
    buildSourceCard,
    buildAssetPickerRow: _assetPickerNs.buildAssetPickerRow,
    buildSoundCard: _assetPickerNs.buildSoundCard,
    buildSoundPickerRow: _assetPickerNs.buildSoundPickerRow,
    buildSelectRow,
    createAnimation,
    deleteAnimation,
    sanitizeName,
    findDefinition,
    patchAnimation,
    updatePaneDynamicBits,
  };
})();
