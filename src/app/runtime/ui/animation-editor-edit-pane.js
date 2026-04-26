// Animation editor edit-pane — owns the Identity / Source / Coded /
// Defaults / Sound cards plus the patchAnimation / createAnimation /
// deleteAnimation / findDefinition profile-mutation helpers.
// Cross-module callbacks (renderList / render / renderPreview /
// updatePreviewDynamicBits / collectAnimations / syncDirtyBar /
// getEditorBoardId / getSelection) are wired at init time so call
// sites stay byte-identical with the pre-W3.3 IIFE.
//
// Phase 24 W3.3-C3: extracted from animation-editor-view.js. The
// module-private `currentPaneKey` cache moves with renderPane —
// shell.bindDom / shell.open clear it via the new `clearPaneCache`
// export. The two private helpers `fetchAnimationResources` and
// `fetchSoundResources` (only called from buildAssetPickerRow /
// buildSoundPickerRow respectively) move with their callers.
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
    pane.append(buildSoundCard(sel.scope, def, boardId));
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
      const name = String(def.name || "").trim() || "this animation";
      if (!window.confirm(`Delete ${name}? The change stays local until you hit Apply.`)) return;
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
      fields.push({
        kind: "slider", key: "opacity", label: "Opacity",
        min: 0.1, max: 1, step: 0.05,
        format: (v) => `${Math.round(v * 100)}%`,
      });
      fields.push({
        kind: "slider", key: "intensity", label: "Intensity",
        min: 0.2, max: 1.5, step: 0.05,
        format: (v) => v.toFixed(2),
      });
      fields.push({
        kind: "slider", key: "speed", label: "Speed",
        min: 0.1, max: 2.5, step: 0.05,
        format: (v) => `${v.toFixed(2)}x`,
      });
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
  // swatch; hull-flicker exposes breaksSolidColor. Non-matching
  // variants don't need this card.
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
    if (!isSolidColor && !isHullFlicker) return null;

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
      const label = document.createElement("label");
      label.className = "anim-editor-field-label";
      const cap = document.createElement("span");
      cap.textContent = "Effect key";
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 256;
      input.placeholder = "e.g. hull-flicker";
      input.value = def.assetRef ?? "";
      input.addEventListener("input", () => {
        patchAnimation(scope, boardId, def.id, { assetRef: input.value.trim() });
      });
      label.append(cap, input);
      card.append(label);
    }
    return card;
  }

  // GIF/MP4 pickers — dropdown of resources/animations/*
  // plus Upload + Delete buttons. Replaces the previous free-text path input.
  function buildAssetPickerRow(scope, def, boardId) {
    const ext = def.assetType === "mp4" ? "mp4" : "gif";
    const wrap = document.createElement("div");
    wrap.className = "anim-editor-asset-picker";

    const label = document.createElement("label");
    label.className = "anim-editor-field-label";
    const cap = document.createElement("span");
    cap.textContent = ext === "mp4" ? "Video file" : "GIF file";
    const select = document.createElement("select");
    select.className = "anim-editor-asset-select";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = `Select ${ext.toUpperCase()}…`;
    select.append(placeholder);
    label.append(cap, select);

    const actions = document.createElement("div");
    actions.className = "anim-editor-asset-actions";

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "rd-btn rd-btn-ghost";
    uploadBtn.textContent = "Upload";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "rd-btn rd-btn-ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = true;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ext === "mp4" ? "video/mp4,.mp4" : "image/gif,.gif";
    fileInput.style.display = "none";

    const status = document.createElement("p");
    status.className = "rd-caption anim-editor-asset-status";

    actions.append(uploadBtn, deleteBtn, fileInput);
    wrap.append(label, actions, status);

    async function refreshList(selectedPath) {
      const files = await fetchAnimationResources(ext);
      select.replaceChildren();
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = files.length
        ? `Select ${ext.toUpperCase()}…`
        : `No ${ext.toUpperCase()} files uploaded`;
      select.append(ph);
      for (const file of files) {
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = file.replace(/^\/resources\/animations\//, "");
        select.append(opt);
      }
      const current = selectedPath ?? String(def.assetRef || "").trim();
      if (current && files.includes(current)) {
        select.value = current;
        deleteBtn.disabled = false;
      } else {
        select.value = "";
        deleteBtn.disabled = true;
      }
    }

    select.addEventListener("change", () => {
      patchAnimation(scope, boardId, def.id, { assetRef: select.value });
      deleteBtn.disabled = !select.value;
    });

    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      status.textContent = `Uploading ${file.name}…`;
      uploadBtn.disabled = true;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const response = await fetch(
          `/api/resources/animations?filename=${encodeURIComponent(file.name)}`,
          { method: "POST", body: arrayBuffer },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          status.textContent = payload?.error || "Upload failed";
          return;
        }
        status.textContent = `Uploaded ${payload.filename}`;
        patchAnimation(scope, boardId, def.id, { assetRef: payload.path });
        await refreshList(payload.path);
      } catch (error) {
        status.textContent = "Upload failed";
        console.error("anim upload failed", error);
      } finally {
        uploadBtn.disabled = false;
      }
    });

    deleteBtn.addEventListener("click", async () => {
      const current = select.value;
      if (!current) return;
      const name = current.replace(/^\/resources\/animations\//, "");
      if (!window.confirm(`Delete ${name}? This removes it from disk.`)) return;
      status.textContent = `Deleting ${name}…`;
      deleteBtn.disabled = true;
      try {
        const response = await fetch(
          `/api/resources/animations?path=${encodeURIComponent(current)}`,
          { method: "DELETE" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          status.textContent = payload?.error || "Delete failed";
          deleteBtn.disabled = false;
          return;
        }
        status.textContent = `Deleted ${name}`;
        if (String(def.assetRef || "").trim() === current) {
          patchAnimation(scope, boardId, def.id, { assetRef: "" });
        }
        await refreshList("");
      } catch (error) {
        status.textContent = "Delete failed";
        console.error("anim delete failed", error);
        deleteBtn.disabled = false;
      }
    });

    refreshList();

    return wrap;
  }

  async function fetchAnimationResources(ext) {
    try {
      const response = await fetch("/api/resources");
      if (!response.ok) return [];
      const payload = await response.json();
      const files = Array.isArray(payload?.files) ? payload.files : [];
      const pattern = new RegExp(`\\.${ext}$`, "i");
      return files
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry.startsWith("/resources/animations/") && pattern.test(entry))
        .sort();
    } catch {
      return [];
    }
  }

  function buildSoundCard(scope, def, boardId) {
    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Sound";
    card.append(eyebrow);
    card.append(buildSoundPickerRow(scope, def, boardId));
    return card;
  }

  // Sound picker — mirrors the GIF/MP4 asset picker but
  // targets /resources/sounds/ with audio extensions, and includes a
  // "No sound" entry mapped to SOUND_MAPPING_NONE.
  function buildSoundPickerRow(scope, def, boardId) {
    const config = window.TT_BEAMER_CONFIG || {};
    const noneValue = config.SOUND_MAPPING_NONE ?? "none";
    const extensions = ["mp3", "wav", "ogg", "m4a"];

    const wrap = document.createElement("div");
    wrap.className = "anim-editor-asset-picker";

    const label = document.createElement("label");
    label.className = "anim-editor-field-label";
    const cap = document.createElement("span");
    cap.textContent = "Sound file";
    const select = document.createElement("select");
    select.className = "anim-editor-asset-select";
    label.append(cap, select);

    const actions = document.createElement("div");
    actions.className = "anim-editor-asset-actions";

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "rd-btn rd-btn-ghost";
    uploadBtn.textContent = "Upload";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "rd-btn rd-btn-ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = true;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*,.mp3,.wav,.ogg,.m4a";
    fileInput.style.display = "none";

    const status = document.createElement("p");
    status.className = "rd-caption anim-editor-asset-status";

    actions.append(uploadBtn, deleteBtn, fileInput);
    wrap.append(label, actions, status);

    async function refreshList(selectedPath) {
      const files = await fetchSoundResources(extensions);
      const builtIn = Array.isArray(config.ALL_SOUND_ASSET_PATHS)
        ? config.ALL_SOUND_ASSET_PATHS
        : [];
      // Built-in paths + uploaded /resources/sounds/ entries. Merge
      // and dedupe so uploads land alongside the seeded map files.
      const merged = Array.from(new Set([...builtIn, ...files])).sort();
      select.replaceChildren();
      const noneOpt = document.createElement("option");
      noneOpt.value = noneValue;
      noneOpt.textContent = "No sound";
      select.append(noneOpt);
      for (const file of merged) {
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = String(file).split("/").pop() || file;
        select.append(opt);
      }
      const current = selectedPath ?? String(def.soundAssetRef || noneValue);
      select.value = merged.includes(current) ? current : (current === noneValue ? noneValue : noneValue);
      // Delete is only enabled for user-uploaded files (not built-ins).
      const isUploaded = typeof select.value === "string"
        && select.value.startsWith("/resources/sounds/")
        && !builtIn.includes(select.value);
      deleteBtn.disabled = !isUploaded;
    }

    select.addEventListener("change", () => {
      patchAnimation(scope, boardId, def.id, { soundAssetRef: select.value });
      const builtIn = Array.isArray(config.ALL_SOUND_ASSET_PATHS) ? config.ALL_SOUND_ASSET_PATHS : [];
      const isUploaded = select.value.startsWith("/resources/sounds/") && !builtIn.includes(select.value);
      deleteBtn.disabled = !isUploaded;
    });

    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      status.textContent = `Uploading ${file.name}…`;
      uploadBtn.disabled = true;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const response = await fetch(
          `/api/resources/sounds?filename=${encodeURIComponent(file.name)}`,
          { method: "POST", body: arrayBuffer },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          status.textContent = payload?.error || "Upload failed";
          return;
        }
        status.textContent = `Uploaded ${payload.filename}`;
        patchAnimation(scope, boardId, def.id, { soundAssetRef: payload.path });
        await refreshList(payload.path);
      } catch (error) {
        status.textContent = "Upload failed";
        console.error("sound upload failed", error);
      } finally {
        uploadBtn.disabled = false;
      }
    });

    deleteBtn.addEventListener("click", async () => {
      const current = select.value;
      if (!current || current === noneValue) return;
      const name = current.replace(/^\/resources\/sounds\//, "");
      if (!window.confirm(`Delete ${name}? This removes it from disk.`)) return;
      status.textContent = `Deleting ${name}…`;
      deleteBtn.disabled = true;
      try {
        const response = await fetch(
          `/api/resources/sounds?path=${encodeURIComponent(current)}`,
          { method: "DELETE" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          status.textContent = payload?.error || "Delete failed";
          deleteBtn.disabled = false;
          return;
        }
        status.textContent = `Deleted ${name}`;
        if (String(def.soundAssetRef || "").trim() === current) {
          patchAnimation(scope, boardId, def.id, { soundAssetRef: noneValue });
        }
        await refreshList(noneValue);
      } catch (error) {
        status.textContent = "Delete failed";
        console.error("sound delete failed", error);
        deleteBtn.disabled = false;
      }
    });

    refreshList();
    return wrap;
  }

  async function fetchSoundResources(extensions) {
    try {
      const response = await fetch("/api/resources");
      if (!response.ok) return [];
      const payload = await response.json();
      const files = Array.isArray(payload?.files) ? payload.files : [];
      const extRegex = new RegExp(`\\.(${extensions.join("|")})$`, "i");
      return files
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry.startsWith("/resources/sounds/") && extRegex.test(entry))
        .sort();
    } catch {
      return [];
    }
  }

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
    buildAssetPickerRow,
    buildSoundCard,
    buildSoundPickerRow,
    buildSelectRow,
    createAnimation,
    deleteAnimation,
    sanitizeName,
    findDefinition,
    patchAnimation,
    updatePaneDynamicBits,
  };
})();
