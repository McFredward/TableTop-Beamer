// Reusable animation-icon picker.
//
// Populates a `.rd-icon-picker` grid with every glyph from
// TT_BEAMER_UI_ICONS.ICON_DEFS, highlights the currently-selected
// entry, and calls back when the user picks a new icon. One instance
// per animation editor (Inside / Outside / Room).
//
// Public API:
//   TT_BEAMER_UI_ICON_PICKER.mount(root, { onChange })
//     -> { setValue(name), getValue() }
//
// The mount function is idempotent per root: calling it twice reuses
// the existing tile set and just rebinds the callback + selection.
(() => {
  const MOUNT_KEY = "__ttBeamerIconPicker";

  function buildTiles(root) {
    const icons = window.TT_BEAMER_UI_ICONS;
    if (!icons || !icons.ICON_DEFS) return [];
    // The picker only exposes the curated
    // animation-flavour subset. Full ICON_DEFS keeps non-animation
    // glyphs (trash, search, settings…) around for UI chrome.
    const curated = Array.isArray(icons.ANIMATION_ICON_KEYS)
      ? icons.ANIMATION_ICON_KEYS.filter((n) => icons.ICON_DEFS[n])
      : null;
    const names = curated && curated.length
      ? curated
      : Object.keys(icons.ICON_DEFS).sort();
    root.replaceChildren();
    const tiles = [];
    for (const name of names) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rd-icon-picker-tile";
      btn.dataset.iconName = name;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", "false");
      btn.setAttribute("aria-label", name);
      btn.setAttribute("title", name);
      btn.append(icons.createIcon(name, { size: 18 }));
      root.append(btn);
      tiles.push(btn);
    }
    return tiles;
  }

  function mount(root, options) {
    if (!root) return null;
    const opts = options || {};
    let state = root[MOUNT_KEY];
    if (!state) {
      const tiles = buildTiles(root);
      state = { tiles, value: null, onChange: opts.onChange || null };
      root[MOUNT_KEY] = state;
      root.addEventListener("click", (event) => {
        const tile = event.target.closest?.(".rd-icon-picker-tile");
        if (!tile || !root.contains(tile)) return;
        const name = tile.dataset.iconName;
        if (!name || name === state.value) return;
        setValue(name);
        if (typeof state.onChange === "function") state.onChange(name);
      });
    } else if (Object.prototype.hasOwnProperty.call(opts, "onChange")) {
      // Only overwrite onChange when the caller explicitly passed one —
      // syncFxPanel calls use mount() to just refresh state and must
      // not clobber the binder's persistence callback.
      state.onChange = opts.onChange || null;
    }

    function setValue(name) {
      state.value = name || null;
      for (const tile of state.tiles) {
        const isSel = tile.dataset.iconName === state.value;
        tile.classList.toggle("is-selected", isSel);
        tile.setAttribute("aria-checked", isSel ? "true" : "false");
      }
    }

    function getValue() {
      return state.value;
    }

    return { setValue, getValue };
  }

  window.TT_BEAMER_UI_ICON_PICKER = { mount };
})();
