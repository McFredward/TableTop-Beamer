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
    // Phase 22: editor-scoped board id. null = "use whatever board the
    // dashboard currently targets". Populated when the user picks a
    // different board from the editor's own board dropdown; reset back
    // to null on every open() so the editor re-inherits the dashboard
    // selection each session.
    editorBoardId: null,
  };

  function getEditorBoardId() {
    return state.editorBoardId ?? ctx?.state?.boardId ?? null;
  }
  const listeners = new Set();

  function init(dependencies) {
    ctx = dependencies;
    bindDom();
    render();
  }

  function bindDom() {
    const back = ctx.animEditorBackButton;
    if (back && !back._ttBeamerBound) {
      back.addEventListener("click", handleBack);
      back._ttBeamerBound = true;
    }
    if (ctx.animEditorApplyButton && !ctx.animEditorApplyButton._ttBeamerBound) {
      ctx.animEditorApplyButton.addEventListener("click", () => {
        if (typeof ctx.applyLocalConfigToServer === "function") {
          Promise.resolve(ctx.applyLocalConfigToServer()).then(() => {
            syncDirtyBar();
          });
        }
      });
      ctx.animEditorApplyButton._ttBeamerBound = true;
    }
    if (ctx.animEditorDiscardButton && !ctx.animEditorDiscardButton._ttBeamerBound) {
      ctx.animEditorDiscardButton.addEventListener("click", () => {
        if (typeof ctx.discardLocalConfigAndReloadFromServer === "function") {
          ctx.discardLocalConfigAndReloadFromServer();
          // Wait a tick for the reload to flush through, then
          // re-render + refresh the dirty bar.
          setTimeout(() => {
            currentPaneKey = null;
            render();
          }, 50);
        }
      });
      ctx.animEditorDiscardButton._ttBeamerBound = true;
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
    // Phase 22 W3b-4: + button creates a new animation in the
    // currently-selected scope.
    if (ctx.animEditorAddButton && !ctx.animEditorAddButton._ttBeamerBound) {
      ctx.animEditorAddButton.addEventListener("click", () => {
        createAnimation(state.scope);
      });
      ctx.animEditorAddButton._ttBeamerBound = true;
    }
    // Phase 22: editor-scoped board picker. Change fires a re-render
    // targeting the new board id — does NOT call switchBoard(), so the
    // dashboard stage is untouched.
    if (ctx.animEditorBoardSelect && !ctx.animEditorBoardSelect._ttBeamerBound) {
      ctx.animEditorBoardSelect.addEventListener("change", () => {
        const next = String(ctx.animEditorBoardSelect.value || "").trim();
        state.editorBoardId = next || null;
        // Selection ids are per-board: wipe them when hopping boards so
        // the library default-selects the first animation of the new
        // board rather than sticking on an id that doesn't exist there.
        state.selectedIds = { inside: null, outside: null, room: null };
        currentPaneKey = null;
        render();
      });
      ctx.animEditorBoardSelect._ttBeamerBound = true;
    }
  }

  function populateBoardSelect() {
    const select = ctx?.animEditorBoardSelect;
    if (!select) return;
    const getBoards = typeof ctx.getBoards === "function" ? ctx.getBoards : null;
    const boards = Array.isArray(getBoards?.()) ? getBoards() : [];
    const activeId = getEditorBoardId();
    select.replaceChildren();
    for (const board of boards) {
      if (!board?.id) continue;
      const opt = document.createElement("option");
      opt.value = board.id;
      opt.textContent = board.name || board.id;
      select.append(opt);
    }
    if (activeId && boards.some((b) => b?.id === activeId)) {
      select.value = activeId;
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
    // Phase 22: every open() re-inherits the dashboard's board id. The
    // editor's board picker is a session-scoped override, not a sticky
    // preference — reopening the editor always starts from the active
    // dashboard selection.
    state.editorBoardId = null;
    if (ctx.animEditorPage) {
      ctx.animEditorPage.hidden = false;
    }
    document.body.setAttribute("data-animation-editor-open", "true");
    populateBoardSelect();
    render();
    if (ctx.animEditorSearchInput) {
      // Drop focus into the search box; it's the primary affordance.
      try { ctx.animEditorSearchInput.focus(); } catch {}
    }
  }

  function close() {
    state.open = false;
    // Phase 22 W3b-4 (revised): make sure the coded-preview rAF loop
    // stops when the editor closes, even if the canvas isn't
    // immediately garbage-collected.
    stopCodedPreview();
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

  // Phase 22 W3b-5 revisit: Back is fully blocked while there are
  // unsaved edits — the user must hit Apply or Discard explicitly.
  // Previously the Back click threw a window.confirm; the user now
  // wants a grayed-out, inert button instead.
  function handleBack() {
    if (ctx.state?.localConfigDirty) return;
    close();
  }

  function syncDirtyBar() {
    const bar = ctx.animEditorDirtyBar;
    const dirty = Boolean(ctx.state?.localConfigDirty);
    if (bar) bar.hidden = !dirty;
    if (ctx.animEditorBackButton) {
      ctx.animEditorBackButton.classList.toggle("anim-editor-back--dirty", dirty);
      ctx.animEditorBackButton.disabled = dirty;
      ctx.animEditorBackButton.setAttribute("aria-disabled", dirty ? "true" : "false");
    }
  }

  function collectAnimations(scope) {
    const boardId = getEditorBoardId();
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
    renderPreview();
    syncDirtyBar();
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
    // Phase 22 W3b-3 (revised): card order per user spec —
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
    // Phase 22 W3b-3 fix: reflect the EFFECTIVE icon (explicit
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
        // Phase 22 W3b-3 (revised): mode + direction used to live in
        // a separate Playback card; inlined into Defaults so the user
        // has one consolidated tuning area.
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

  // Phase 22 W3b-4d: GIF/MP4 pickers — dropdown of resources/animations/*
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

  // -------- Preview column (W3b-4) ---------------------------------

  function renderPreview() {
    const root = ctx.animEditorPreview;
    if (!root) return;
    // Phase 22 W3b-4 (revised): cancel any in-flight coded-effect
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
    const list = collectAnimations(sel.scope);
    if (list.length <= 1) {
      del.disabled = true;
      del.title = "Each scope needs at least one animation";
    } else {
      del.addEventListener("click", () => deleteAnimation(sel.scope, def.id));
    }
    footer.append(del);
    root.append(footer);
  }

  // Phase 22 W3b-4 (revised): live preview — GIF and MP4 render inline
  // so the user can see the animation's actual content. Coded effects
  // stay as the icon glyph (the canvas-driven preview would require a
  // dedicated render loop and drawEffectVisual access; coming later).
  function buildPreviewSwatch(scope, def) {
    const wrap = document.createElement("div");
    wrap.className = "anim-editor-preview-swatch";

    const type = String(def.assetType || "").toLowerCase();
    const ref = String(def.assetRef || "").trim();

    if (type === "gif" && ref) {
      const img = document.createElement("img");
      img.className = "anim-editor-preview-media";
      img.src = toResourceUrl(ref);
      img.alt = def.name;
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => {
        wrap.replaceChildren(buildPreviewMissingNotice(ref));
      });
      wrap.append(img);
    } else if (type === "mp4" && ref) {
      const video = document.createElement("video");
      video.className = "anim-editor-preview-media";
      video.src = toResourceUrl(ref);
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.addEventListener("error", () => {
        wrap.replaceChildren(buildPreviewMissingNotice(ref));
      });
      wrap.append(video);
    } else if (type === "coded" && ref && window.TT_BEAMER_RUNTIME_EFFECT_VISUALS?.withPreviewCanvas) {
      // Phase 22 W3b-4 (revised): coded effects get a live canvas
      // preview that replays drawEffectVisual on every rAF with the
      // definition's current defaults (opacity, intensity, speed,
      // colorHex, outside mode/direction). startCodedPreview sets up
      // a rAF loop; stopCodedPreview cancels it — re-called on every
      // renderPreview to switch targets or exit cleanly.
      const canvas = document.createElement("canvas");
      canvas.className = "anim-editor-preview-media anim-editor-preview-canvas";
      // Phase 22 W3b-4d fix: intrinsic canvas size should match the
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
      // Phase 22 W3b-4d fix: do NOT pre-scale age by speed. Coded
      // branches that honour speed (outside-space) multiply by
      // `speedFactor` derived from `options.outsideSpeed` themselves;
      // pre-scaling here double-applied the speed and left the
      // default-settings sliders looking unresponsive. Simpler coded
      // branches (intruder-alert, fire, …) don't honour speed; their
      // preview runs at 1 × which is acceptable for a thumbnail.
      const age = (performance.now() - startTime) / 1000;
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
          visuals.drawEffectVisual(current.assetRef, age, intensity, null, roomMetrics(), options);
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
    if (scope === "outside") {
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

  // -------- Create + Delete (W3b-4) --------------------------------

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
    if (existing.length <= 1) return;
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
    // Phase 22 W3b-4 (revised): every patch may flip localConfigDirty;
    // reflect it in the editor topbar immediately.
    syncDirtyBar();
    // Phase 22: keep the Live preview in lockstep with the pending
    // edits — even before the user hits Apply. Coded-effect previews
    // already read `findDefinition()` each rAF tick so slider +
    // colour changes animate live; but switching asset type, asset
    // ref, or coded-effect key needs a full rebuild since the preview
    // element swaps (img ↔ video ↔ canvas) or points at a different
    // media file. Patches that only nudge numeric params skip the
    // rebuild to avoid canvas flicker under rapid slider input.
    const selection = getSelection();
    const touchesPreview = patch && (
      Object.prototype.hasOwnProperty.call(patch, "assetType")
      || Object.prototype.hasOwnProperty.call(patch, "assetRef")
    );
    const affectsSelection = selection.scope === scope && selection.id === id;
    if (touchesPreview && affectsSelection) {
      renderPreview();
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
      sub.textContent = def.assetType ? String(def.assetType).toUpperCase() : "";
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
        // Phase 22 W3b-3 fix: the click handler used to only refresh
        // the list + notify listeners. The pane subscribes via
        // render() at init, not notifySelection, so the pane didn't
        // rebuild when the user picked another animation. Call
        // renderPane() / renderPreview() directly so both follow the
        // selection.
        renderPane();
        renderPreview();
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
