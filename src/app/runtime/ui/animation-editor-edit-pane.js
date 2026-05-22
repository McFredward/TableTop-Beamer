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
    // Phase 52 (2026-05-22): collapsible Transform card per animation
    // (rotation / stretch / scale / offset). Mirrors the live-editor's
    // transform sliders, but persists to the definition directly so
    // operators can configure transforms WITHOUT having to start the
    // animation first. Returns null for scopes / asset types that
    // don't support transforms (inside, outside, room non-media).
    const transformCard = buildTransformCard(sel.scope, def, boardId);
    if (transformCard) pane.append(transformCard);
    pane.append(buildSoundCard(sel.scope, def, boardId));
  }

  // Phase 52: per-animation Transform card. Same fields/clamps as the
  // live-editor transform fieldset (HTML #live-editor-transform). Wraps
  // in a <details> element so the card is collapsed by default —
  // transforms are an "advanced" tweak and shouldn't clutter the pane
  // when not in use ("Ausklappmenu" per operator UAT 2026-05-22).
  function buildTransformCard(scope, def, boardId) {
    // Live editor only shows transform for room (incl. cluster) +
    // mp4/gif asset type. Mirror that gate here so the edit pane
    // matches.
    if (scope !== "room") return null;
    const assetType = String(def.assetType ?? "").toLowerCase();
    if (assetType !== "mp4" && assetType !== "gif") return null;

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
        sub: "Fit the media to the room polygon shape." },
      { kind: "slider", key: "widthScale", label: "Width scale",
        min: 0.1, max: 10, step: 0.01,
        format: (v) => v.toFixed(2) },
      { kind: "slider", key: "heightScale", label: "Height scale",
        min: 0.1, max: 10, step: 0.01,
        format: (v) => v.toFixed(2) },
      { kind: "slider", key: "offsetXScale", label: "X offset",
        min: -1, max: 1, step: 0.01,
        format: (v) => v.toFixed(2) },
      { kind: "slider", key: "offsetYScale", label: "Y offset",
        min: -1, max: 1, step: 0.01,
        format: (v) => v.toFixed(2) },
    ];
    for (const f of fields) {
      if (f.kind === "slider") {
        card.append(buildSliderRow(scope, def, boardId, f));
      } else if (f.kind === "toggle") {
        card.append(buildToggleRow(scope, def, boardId, f));
      }
    }
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

  // Pretty-print a coded effect key for the dropdown
  // (e.g. "hull-flicker" → "Hull Flicker").
  function formatCodedEffectLabel(key) {
    const raw = String(key || "").trim();
    if (!raw) return "(none)";
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

      fields.push({
        kind: "slider", key: "opacity", label: "Opacity",
        min: 0.1, max: 1, step: 0.05,
        format: (v) => `${Math.round(v * 100)}%`,
      });
      if (!isMedia) {
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
      if (scope === "inside") {
        fields.push({
          kind: "toggle", key: "loopUntilStopped",
          label: "Loop",
          sub: "Repeats until stopped.",
        });
      }
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
    return fields;
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
    input.addEventListener("input", () => {
      const v = Number(input.value);
      val.textContent = field.format(v);
      patchAnimation(scope, boardId, def.id, { [field.key]: v });
    });
    row.append(head, input);
    return row;
  }

  function buildToggleRow(scope, def, boardId, field) {
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
    });
    row.append(text, toggle);
    return row;
  }

  // -------- Scope-specific cards --------------------------

  // Room animations of the `solid-color` coded variant expose a color
  // swatch; hull-flicker and power-outage expose breaksSolidColor.
  // Non-matching variants don't need this card.
  function buildColorCard(scope, def, boardId) {
    if (scope !== "room") return null;
    const resolveCodedType = ctx.resolveRoomCodedEffectType;
    const coded = def.assetType === "coded"
      ? (typeof resolveCodedType === "function"
        ? resolveCodedType(def.assetRef) || def.assetRef
        : def.assetRef)
      : null;
    const isSolidColor = coded === "solid-color";
    const isHullFlicker = coded === "hull-flicker";
    const isPowerOutage = coded === "power-outage";
    if (!isSolidColor && !isHullFlicker && !isPowerOutage) return null;

    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Coded effect";
    card.append(eyebrow);

    if (isSolidColor) {
      const label = document.createElement("label");
      label.className = "anim-editor-field-label";
      const cap = document.createElement("span");
      cap.textContent = "Color";
      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = /^#[0-9a-f]{6}$/i.test(def.colorHex) ? def.colorHex : "#ff0000";
      picker.addEventListener("input", () => {
        patchAnimation(scope, boardId, def.id, { colorHex: picker.value });
      });
      label.append(cap, picker);
      card.append(label);
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
        patchAnimation(scope, boardId, def.id, { assetRef: select.value });
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
    select.value = String(def[field.key] ?? field.options[0]?.value ?? "");
    select.addEventListener("change", () => {
      patchAnimation(scope, boardId, def.id, { [field.key]: select.value });
      // Changing assetType in the Source card should rebuild the
      // asset-ref caption ("GIF path" vs "Effect key"); easiest way
      // is a full pane rebuild, losing any in-flight caret — but
      // changing assetType is an infrequent, deliberate action.
      if (field.key === "assetType") {
        currentPaneKey = null;
        renderPane();
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
    );
    if (touchesPreviewSource) {
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
