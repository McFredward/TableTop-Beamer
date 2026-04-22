// Phase 22 Wave 1 — inline-SVG icon primitives.
//
// Vanilla-JS port of .planning/design-system/redesign/Icons.jsx. Every
// icon is a single path in a 24×24 viewBox with 1.75 stroke, rounded
// caps/joins, `currentColor`. No dependencies, no sprite. Callers get
// the color through the usual CSS `color` inheritance chain and can
// apply `.rd-ico`, `.rd-ico-sm`, or `.rd-ico-lg` classes for sizing.
//
// Public API:
//   TT_BEAMER_UI_ICONS.createIcon(name, options?)
//     -> SVGElement
//   TT_BEAMER_UI_ICONS.ICON_DEFS
//     -> { [name]: pathD }
//
// Options:
//   size:         number  (pixels, default 20)
//   strokeWidth:  number  (default 1.75)
//   filled:       boolean (default false — stroke only; true = currentColor fill)
//   className:    string  (extra CSS classes; appended to default "rd-ico")
//   title:        string  (optional <title> for a11y / native tooltip)
//
// Unknown names render a dashed placeholder rather than throwing, so a
// missing-icon condition doesn't crash the UI.
(() => {
  const NS = "http://www.w3.org/2000/svg";

  const ICON_DEFS = {
    play:        "M8 5.5v13l11-6.5z",
    pause:       "M8 5h3v14H8zM13 5h3v14h-3z",
    stop:        "M6 6h12v12H6z",
    power:       "M12 3v9 M6.4 6.4a8 8 0 1 0 11.2 0",
    settings:    "M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    grid:        "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    list:        "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
    x:           "M6 6l12 12M18 6L6 18",
    check:       "M5 13l4 4L19 7",
    chev_down:   "M6 9l6 6 6-6",
    chev_right:  "M9 6l6 6-6 6",
    chevron_up:  "M6 15l6-6 6 6",
    plus:        "M12 5v14M5 12h14",
    minus:       "M5 12h14",
    flame:       "M8.5 14.5c0-2.5 2-3 2-5.5a3.5 3.5 0 0 1 3.5-3.5s-1 2 .5 4 2.5 2.5 2.5 5a6 6 0 1 1-12 0c0-1.5.5-2.5 1.5-3 .5 1.5 2 3 2 3z",
    sparkles:    "M12 3l1.5 4L18 8.5 13.5 10 12 14 10.5 10 6 8.5 10.5 7zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8zM5 16l.6 1.6L7 18l-1.4.4L5 20l-.6-1.6L3 18l1.4-.4z",
    bolt:        "M13 2L4 14h7l-1 8 9-12h-7z",
    sound_on:    "M11 5 6 9H3v6h3l5 4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12",
    sound_off:   "M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6",
    eye:         "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
    eye_off:     "M17.94 17.94A10.94 10.94 0 0 1 12 19c-6 0-10-7-10-7a19 19 0 0 1 4.06-5.06M9.9 4.24A10.94 10.94 0 0 1 12 4c6 0 10 7 10 7a19 19 0 0 1-2.16 3.19M14.12 14.12A3 3 0 1 1 9.88 9.88M2 2l20 20",
    target:      "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 12h.01",
    frame:       "M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4",
    map:         "M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13",
    room:        "M4 21V10l8-6 8 6v11M9 21v-6h6v6",
    layers:      "M12 3l10 5-10 5L2 8zM2 13l10 5 10-5M2 18l10 5 10-5",
    clock:       "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM12 8v4l3 2",
    bell:        "M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16zM10 21a2 2 0 0 0 4 0",
    shield:      "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    search:      "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3",
    trash:       "M4 7h16M10 11v6M14 11v6M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M9 7V4h6v3",
    drop:        "M12 3s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z",
    ghost:       "M5 11a7 7 0 0 1 14 0v10l-3-2-3 2-2-2-3 2-3-2zM9 11h.01M15 11h.01",
    scan:        "M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7 12h10",
    rocket:      "M5 15l-2 6 6-2M13.5 6.5a4.5 4.5 0 0 1 6 0l-1 7-7 7-5-5 7-7zM14 9h.01",
    sliders:     "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    lock:        "M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4",
    wifi:        "M5 12a12 12 0 0 1 14 0M8 15a8 8 0 0 1 8 0M11 18h2",
    edit:        "M4 20h4L20 8l-4-4L4 16z",
    resize:      "M20 4L14 4M20 4L20 10M20 4L14 10M4 20L10 20M4 20L4 14M4 20L10 14",
    arrows:      "M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4",
    menu:        "M4 6h16M4 12h16M4 18h16",
    more:        "M5 12h.01M12 12h.01M19 12h.01",
    close:       "M6 6l12 12M18 6L6 18",
    info:        "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM12 11v5M12 8h.01",
    picker:      "M12 4v2M12 18v2M4 12H2M22 12h-2M6 6 4.5 4.5M19.5 19.5 18 18M6 18l-1.5 1.5M19.5 4.5 18 6M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  };

  function createIcon(name, options) {
    const {
      size = 20,
      strokeWidth = 1.75,
      filled = false,
      className = "",
      title = null,
    } = options || {};

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", filled ? "currentColor" : "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", String(strokeWidth));
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", title ? "false" : "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("data-icon", name);
    const cls = ("rd-ico " + (className || "")).trim();
    svg.setAttribute("class", cls);

    if (title) {
      const t = document.createElementNS(NS, "title");
      t.textContent = title;
      svg.appendChild(t);
    }

    const d = ICON_DEFS[name];
    if (d) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    } else {
      // Unknown glyph — dashed placeholder so a typo doesn't silently hide UI.
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", "3");
      rect.setAttribute("y", "3");
      rect.setAttribute("width", "18");
      rect.setAttribute("height", "18");
      rect.setAttribute("stroke-dasharray", "2 2");
      svg.appendChild(rect);
    }
    return svg;
  }

  // Phase 22 W2c: heuristic icon resolver used until Wave 3 ships
  // per-animation user-assigned icons via the animation editor.
  // Takes a room/outside animation definition and returns a best-guess
  // icon name from ICON_DEFS. Library tiles + running-list rows both
  // consume this so we don't show blank squares before Wave 3.
  //
  // Resolution order: explicit `definition.icon` (set once Wave 3 lands)
  // → coded-effect type → asset type → name keyword → fallback.
  function resolveAnimationIcon(definition) {
    if (!definition || typeof definition !== "object") return "sparkles";
    if (typeof definition.icon === "string" && ICON_DEFS[definition.icon]) {
      return definition.icon;
    }
    const type = String(definition.type || "").toLowerCase();
    const codedKey = String(
      definition.codedEffectType || definition.codedKey || "",
    ).toLowerCase();
    const assetType = String(definition.assetType || "").toLowerCase();
    const name = String(definition.name || definition.id || "").toLowerCase();
    const hay = `${codedKey} ${name}`;

    const BY_CODED = {
      "hull-flicker":    "bolt",
      "malfunction":     "bolt",
      "intruder-alert":  "bell",
      "alarm":           "bell",
      "solid-color":     "picker",
      "scanning":        "scan",
      "burst":           "sparkles",
      "fire":            "flame",
      "slime":           "drop",
      "power-out":       "power",
      "power":           "power",
    };
    if (BY_CODED[codedKey]) return BY_CODED[codedKey];
    if (type === "coded" && BY_CODED[codedKey]) return BY_CODED[codedKey];

    const KEYWORDS = [
      ["fire",      "flame"],
      ["flame",     "flame"],
      ["intruder",  "bell"],
      ["alarm",     "bell"],
      ["alert",     "bell"],
      ["malfunc",   "bolt"],
      ["flicker",   "bolt"],
      ["bolt",      "bolt"],
      ["lightning", "bolt"],
      ["scan",      "scan"],
      ["burst",     "sparkles"],
      ["spark",     "sparkles"],
      ["explosion", "sparkles"],
      ["slime",     "drop"],
      ["ooze",      "drop"],
      ["water",     "drop"],
      ["power",     "power"],
      ["color",     "picker"],
      ["light",     "picker"],
      ["ghost",     "ghost"],
      ["rocket",    "rocket"],
      ["shield",    "shield"],
      ["lock",      "lock"],
      ["clock",     "clock"],
      ["map",       "map"],
      ["room",      "room"],
    ];
    for (const [keyword, icon] of KEYWORDS) {
      if (hay.includes(keyword)) return icon;
    }

    // Asset-type fallback — GIFs and videos don't imply a specific
    // glyph, but "play" reads well for videos; GIFs land on the
    // sparkles bucket (generic FX feel).
    if (assetType === "video" || assetType === "mp4") return "play";
    return "sparkles";
  }

  window.TT_BEAMER_UI_ICONS = {
    ICON_DEFS,
    createIcon,
    resolveAnimationIcon,
  };
})();
