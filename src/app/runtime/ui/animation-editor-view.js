// Phase 22 W3b — full-page animation editor controller.
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
  let ctx = null;
  const state = {
    scope: "inside",
    search: "",
    selectedIds: { inside: null, outside: null, room: null },
    open: false,
  };
  const listeners = new Set();

  function init(dependencies) {
    ctx = dependencies;
    bindDom();
    render();
  }

  function bindDom() {
    const back = ctx.animEditorBackButton;
    if (back && !back._ttBeamerBound) {
      back.addEventListener("click", close);
      back._ttBeamerBound = true;
    }
    if (ctx.animEditorSearchInput && !ctx.animEditorSearchInput._ttBeamerBound) {
      ctx.animEditorSearchInput.addEventListener("input", () => {
        state.search = String(ctx.animEditorSearchInput.value || "").trim().toLowerCase();
        renderList();
      });
      ctx.animEditorSearchInput._ttBeamerBound = true;
    }
    if (ctx.animEditorScopeTabs && !ctx.animEditorScopeTabs._ttBeamerBound) {
      for (const btn of ctx.animEditorScopeTabs.querySelectorAll("button[data-anim-scope]")) {
        btn.addEventListener("click", () => {
          const nextScope = btn.dataset.animScope;
          if (nextScope && nextScope !== state.scope) {
            state.scope = nextScope;
            if (ctx.animEditorSearchInput) {
              // Search is scope-local; clearing on switch keeps the
              // list predictable when hopping between scopes.
              ctx.animEditorSearchInput.value = "";
              state.search = "";
            }
            render();
          }
        });
      }
      ctx.animEditorScopeTabs._ttBeamerBound = true;
    }
    // W3b-4 will wire the add button; for now render a short-circuit.
    if (ctx.animEditorAddButton && !ctx.animEditorAddButton._ttBeamerBound) {
      ctx.animEditorAddButton.addEventListener("click", () => {
        if (ctx.triggerFeedback) {
          ctx.triggerFeedback.textContent =
            "Status: Add coming in the next sub-commit — use Dashboard → Settings’ legacy Create flow until then";
        }
      });
      ctx.animEditorAddButton._ttBeamerBound = true;
    }
  }

  function isOpen() {
    return Boolean(state.open);
  }

  function open(scope) {
    state.open = true;
    if (scope && (scope === "inside" || scope === "outside" || scope === "room")) {
      state.scope = scope;
    }
    if (ctx.animEditorPage) {
      ctx.animEditorPage.hidden = false;
    }
    document.body.setAttribute("data-animation-editor-open", "true");
    render();
    if (ctx.animEditorSearchInput) {
      // Drop focus into the search box; it's the primary affordance.
      try { ctx.animEditorSearchInput.focus(); } catch {}
    }
  }

  function close() {
    state.open = false;
    if (ctx.animEditorPage) {
      ctx.animEditorPage.hidden = true;
    }
    document.body.removeAttribute("data-animation-editor-open");
    // Return to Settings → Board subtab so the user lands somewhere
    // meaningful (Animations subtab would just re-open the editor).
    if (typeof ctx.setSettingsSubtab === "function") {
      ctx.setSettingsSubtab("board");
    }
  }

  function collectAnimations(scope) {
    const boardId = ctx.state?.boardId;
    if (!boardId) return [];
    if (scope === "inside" && typeof ctx.getInsideFxProfile === "function") {
      return ctx.getInsideFxProfile(boardId)?.animations ?? [];
    }
    if (scope === "outside" && typeof ctx.getOutsideFxProfile === "function") {
      return ctx.getOutsideFxProfile(boardId)?.animations ?? [];
    }
    if (scope === "room" && typeof ctx.getRoomFxProfile === "function") {
      return ctx.getRoomFxProfile(boardId)?.animations ?? [];
    }
    return [];
  }

  function render() {
    renderScopeTabs();
    renderList();
    renderPane();
  }

  // =============================================================
  // W3b-2 — editor pane: Identity + Defaults cards.
  // =============================================================
  //
  // Rebuilds the editor pane on selection / scope change. Input events
  // patch the definition and persist via the existing profile setter
  // (scope-keyed) — never re-render from inside an input handler so
  // focus isn't yanked mid-type.

  let currentPaneKey = null;

  function renderPane() {
    const pane = ctx.animEditorPane;
    const placeholder = ctx.animEditorPanePlaceholder;
    if (!pane) return;

    const boardId = ctx.state?.boardId;
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
    pane.append(buildIdentityCard(sel.scope, def, boardId));
    pane.append(buildDefaultsCard(sel.scope, def, boardId));
    const playback = buildPlaybackCard(sel.scope, def, boardId);
    if (playback) pane.append(playback);
    const colorCard = buildColorCard(sel.scope, def, boardId);
    if (colorCard) pane.append(colorCard);
    pane.append(buildSourceCard(sel.scope, def, boardId));
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
    pickerApi?.setValue(def.icon ?? null);
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

  // -------- Scope-specific cards (W3b-3) --------------------------

  // Outside animations add Mode + Direction. Inside / Room don't
  // have those concepts on the runtime side, so we return null and
  // the card is omitted.
  function buildPlaybackCard(scope, def, boardId) {
    if (scope !== "outside") return null;
    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Playback";
    card.append(eyebrow);

    card.append(buildSelectRow(scope, def, boardId, {
      key: "mode",
      label: "Mode",
      options: [
        { value: "standard", label: "Standard" },
        { value: "immersive", label: "Immersive" },
      ],
    }));
    card.append(buildSelectRow(scope, def, boardId, {
      key: "direction",
      label: "Direction",
      options: [
        { value: "forward", label: "Forward" },
        { value: "reverse", label: "Reverse" },
      ],
    }));
    return card;
  }

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

    const label = document.createElement("label");
    label.className = "anim-editor-field-label";
    const cap = document.createElement("span");
    cap.textContent = def.assetType === "coded"
      ? "Effect key"
      : def.assetType === "mp4"
      ? "Video path"
      : "GIF path";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 256;
    input.placeholder = def.assetType === "coded"
      ? "e.g. hull-flicker"
      : "/resources/…";
    input.value = def.assetRef ?? "";
    input.addEventListener("input", () => {
      const next = input.value.trim();
      patchAnimation(scope, boardId, def.id, { assetRef: next });
    });
    label.append(cap, input);
    card.append(label);
    return card;
  }

  function buildSoundCard(scope, def, boardId) {
    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Sound";
    card.append(eyebrow);

    const config = window.TT_BEAMER_CONFIG || {};
    const noneValue = config.SOUND_MAPPING_NONE ?? "none";
    const paths = Array.isArray(config.ALL_SOUND_ASSET_PATHS)
      ? config.ALL_SOUND_ASSET_PATHS
      : [];
    const options = [
      { value: noneValue, label: "No sound" },
      ...paths.map((p) => ({
        value: p,
        label: String(p).split("/").pop() || p,
      })),
    ];
    card.append(buildSelectRow(scope, def, boardId, {
      key: "soundAssetRef",
      label: "Sound file",
      options,
    }));
    return card;
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

  function renderScopeTabs() {
    const nav = ctx.animEditorScopeTabs;
    if (!nav) return;
    for (const btn of nav.querySelectorAll("button[data-anim-scope]")) {
      const isActive = btn.dataset.animScope === state.scope;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    }
  }

  function renderList() {
    const list = ctx.animEditorList;
    const empty = ctx.animEditorEmpty;
    const count = ctx.animEditorCount;
    if (!list) return;

    const all = collectAnimations(state.scope);
    const filtered = state.search
      ? all.filter((def) =>
          String(def.name || "").toLowerCase().includes(state.search)
          || String(def.id || "").toLowerCase().includes(state.search))
      : all;

    if (count) {
      count.textContent = `${all.length} configured`;
    }
    list.replaceChildren();
    if (filtered.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    // If no selection for this scope yet, seed from the first visible
    // entry so the editor pane (W3b-2) has something to render.
    if (!state.selectedIds[state.scope]) {
      state.selectedIds[state.scope] = filtered[0].id;
    }

    const icons = window.TT_BEAMER_UI_ICONS;
    for (const def of filtered) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "anim-editor-row";
      row.setAttribute("role", "option");
      row.dataset.animationId = def.id;
      if (state.selectedIds[state.scope] === def.id) {
        row.classList.add("is-selected");
        row.setAttribute("aria-selected", "true");
      } else {
        row.setAttribute("aria-selected", "false");
      }

      const iconWrap = document.createElement("span");
      iconWrap.className = "anim-editor-row-icon";
      iconWrap.setAttribute("aria-hidden", "true");
      if (icons?.createIcon) {
        const name = icons.resolveAnimationIcon
          ? icons.resolveAnimationIcon({
            ...def,
            codedEffectType: def.codedEffectType,
            codedKey: def.codedKey,
          })
          : "sparkles";
        iconWrap.append(icons.createIcon(name, { size: 16 }));
      }
      row.append(iconWrap);

      const body = document.createElement("span");
      body.className = "anim-editor-row-body";
      const nm = document.createElement("span");
      nm.className = "anim-editor-row-name";
      nm.textContent = def.name;
      body.append(nm);
      const sub = document.createElement("span");
      sub.className = "anim-editor-row-sub";
      const loopText = def.loopUntilStopped ? "Loop" : "One-shot";
      const assetText = def.assetType
        ? String(def.assetType).toUpperCase()
        : "";
      sub.textContent = assetText ? `${loopText} · ${assetText}` : loopText;
      body.append(sub);
      row.append(body);

      const dot = document.createElement("span");
      dot.className = "anim-editor-row-loop";
      dot.title = def.loopUntilStopped ? "Loops until stopped" : "Plays once";
      dot.setAttribute("aria-hidden", "true");
      row.append(dot);

      row.addEventListener("click", () => {
        state.selectedIds[state.scope] = def.id;
        renderList();
        notifySelection();
      });
      list.append(row);
    }
    notifySelection();
  }

  function getSelection() {
    return {
      scope: state.scope,
      id: state.selectedIds[state.scope],
    };
  }

  function onSelectionChange(handler) {
    if (typeof handler === "function") listeners.add(handler);
    return () => listeners.delete(handler);
  }

  function notifySelection() {
    const sel = getSelection();
    for (const handler of listeners) {
      try { handler(sel); } catch (err) { console.error(err); }
    }
  }

  window.TT_BEAMER_ANIMATION_EDITOR_VIEW = {
    init,
    open,
    close,
    isOpen,
    getSelection,
    onSelectionChange,
    render,
  };
})();
