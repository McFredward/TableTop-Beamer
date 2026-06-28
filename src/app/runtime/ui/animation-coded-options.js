// Shared coded-effect option controls (Phase 58-w3.9g). Single source of
// truth for the per-coded-effect field set (heat / city-workers /
// solid-color / hull-flicker / power-outage), their labels, clamps,
// number formats and intra-card gating. BOTH the full animation editor
// (animation-editor-edit-pane.js → buildColorCard) and the LIVE editor
// for running instances (runtime-lifecycle-live-editor.js) build their
// coded controls from here so the two never drift.
//
// The caller injects a tiny IO bridge:
//   get(key)        → read the current value (full editor: def[key];
//                     live editor: runningInstance[key] ?? def[key]).
//   set(key, value) → write the change (full editor: patchAnimation to
//                     the DEFINITION; live editor: applyLiveEditorValue
//                     on the RUNNING instance + a live /output broadcast).
// The builder is agnostic to where values come from / go; it only owns
// WHICH controls exist for a resolved coded effect and how they gate.
//
// The row markup intentionally reuses the full editor's `anim-editor-*`
// classes (loaded globally via animation-editor.css) so the controls
// render identically in the full editor card AND the live editor panel.
// Sliders bind setPointerCapture on pointerdown (the v1.2.44 drag fix)
// so the first drag never releases when the dirty bar reflows.
(() => {
  function makeSliderRow(io, field) {
    const row = document.createElement("div");
    row.className = "anim-editor-slider-row";
    const head = document.createElement("div");
    head.className = "anim-editor-slider-row-head";
    const lab = document.createElement("span");
    lab.textContent = field.label;
    const val = document.createElement("span");
    val.className = "rd-num";
    const initial = Number(io.get(field.key));
    val.textContent = Number.isFinite(initial) ? field.format(initial) : "—";
    head.append(lab, val);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(Number.isFinite(initial) ? initial : field.min);
    // v1.2.44 drag fix — capture the pointer for the whole gesture so
    // the first input (which flips the dirty flag and may reflow the
    // layout / blur focus) doesn't detach the native range drag.
    input.addEventListener("pointerdown", (e) => {
      try { input.setPointerCapture(e.pointerId); } catch { /* unsupported — ignore */ }
    });
    input.addEventListener("input", () => {
      const v = Number(input.value);
      val.textContent = field.format(v);
      io.set(field.key, v);
    });
    row.append(head, input);
    return row;
  }

  function makeToggleRow(io, field, opts = {}) {
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
    const initial = Boolean(io.get(field.key));
    toggle.setAttribute("aria-checked", initial ? "true" : "false");
    toggle.addEventListener("click", () => {
      const next = toggle.getAttribute("aria-checked") !== "true";
      toggle.setAttribute("aria-checked", next ? "true" : "false");
      io.set(field.key, next);
      if (typeof opts.onChange === "function") {
        try { opts.onChange(next); } catch (err) { console.error(err); }
      }
    });
    row.append(text, toggle);
    return row;
  }

  function makeSelectRow(io, field) {
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
    select.value = String(io.get(field.key) ?? field.options[0]?.value ?? "");
    select.addEventListener("change", () => {
      io.set(field.key, select.value);
    });
    label.append(cap, select);
    return label;
  }

  function makeColorRow(io, field) {
    const label = document.createElement("label");
    label.className = "anim-editor-field-label";
    const cap = document.createElement("span");
    cap.textContent = field.label;
    const picker = document.createElement("input");
    picker.type = "color";
    const cur = String(io.get(field.key) ?? "");
    picker.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : field.fallbackHex;
    picker.addEventListener("input", () => {
      io.set(field.key, picker.value);
    });
    label.append(cap, picker);
    return label;
  }

  // Resolve the family flags for a coded effect key. `scope` gates the
  // room-only break-solid-color toggle (hull-flicker / power-outage).
  function classifyCodedType(codedType, scope) {
    const coded = String(codedType || "").trim().toLowerCase();
    return {
      coded,
      isSolidColor: coded === "solid-color",
      isHeat: coded === "heat",
      // resolveRoomCodedEffectType maps the legacy "city-workers-lit"
      // alias to "city-workers", but un-normalized callers can still
      // pass the lit key — treat both as city-workers.
      isCityWorkers: coded === "city-workers" || coded === "city-workers-lit",
      isHullFlicker: coded === "hull-flicker" && scope === "room",
      isPowerOutage: coded === "power-outage" && scope === "room",
      isSnow: coded === "snow",
    };
  }

  // True when the resolved coded effect exposes ANY option controls.
  // Callers use this to decide whether to render the card / panel.
  function hasCodedOptions(codedType, scope) {
    const c = classifyCodedType(codedType, scope);
    return c.isSolidColor || c.isHeat || c.isCityWorkers
      || c.isHullFlicker || c.isPowerOutage || c.isSnow;
  }

  // Build the ordered list of coded option rows for a resolved effect.
  // Returns [] when the effect has no options (caller renders nothing).
  function buildCodedOptionRows({ scope, codedType, get, set }) {
    const io = { get, set };
    const rows = [];
    const {
      isSolidColor, isHeat, isCityWorkers, isHullFlicker, isPowerOutage, isSnow,
    } = classifyCodedType(codedType, scope);
    if (!isSolidColor && !isHeat && !isCityWorkers && !isHullFlicker && !isPowerOutage && !isSnow) {
      return rows;
    }

    if (isSolidColor || isHeat || isCityWorkers) {
      rows.push(makeColorRow(io, {
        key: "colorHex",
        // city-workers: explicit German label (tints the carried
        // lanterns). heat: "Heat tint". solid-color: legacy "Color".
        label: isHeat ? "Heat tint" : isCityWorkers ? "Laternen-Farbe" : "Color",
        fallbackHex: isHeat ? "#ff7a1a" : isCityWorkers ? "#c98a4b" : "#ff0000",
      }));
    }

    if (isHeat) {
      // The sync toggle only matters while the source is hidden, so it
      // greys out (.is-disabled) while "Hitzequelle anzeigen" is ON
      // without losing its stored value.
      const syncRow = makeToggleRow(io, {
        key: "heatSyncNearestSource",
        label: "Mit nächster Hitzequelle synchronisieren",
        sub: "Pulsiert im Takt der nächstgelegenen laufenden Hitze-Animation mit sichtbarer Quelle (nur ohne sichtbare Quelle wirksam).",
      });
      const applyHeatSourceGate = (showSource) => {
        syncRow.classList.toggle("is-disabled", showSource);
        const toggle = syncRow.querySelector("button.rd-toggle");
        if (toggle) toggle.disabled = showSource;
      };
      rows.push(makeToggleRow(io, {
        key: "heatShowSource",
        label: "Hitzequelle anzeigen",
        sub: "AN: heller atmender Kern. AUS: nur rotes Pulsieren ohne sichtbaren Hotspot.",
      }, { onChange: (next) => applyHeatSourceGate(next) }));
      rows.push(syncRow);
      applyHeatSourceGate(io.get("heatShowSource") !== false);
      rows.push(makeToggleRow(io, {
        key: "heatIrregularPulse",
        label: "Unregelmäßiger Puls",
        sub: "AN: unregelmäßig langer Atem (zufällig wirkende, aber deterministische Periode). AUS: gleichmäßiges Pulsieren.",
      }));
    }

    if (isCityWorkers) {
      rows.push(makeSelectRow(io, {
        key: "workerStyle",
        label: "Darstellung",
        options: [
          { value: "dark", label: "Silhouette (Dashboard)" },
          { value: "lit", label: "Beleuchtet (Beamer)" },
        ],
      }));
      rows.push(makeSliderRow(io, {
        key: "workerCount",
        label: "Anzahl Bewohner",
        min: 1, max: 24, step: 1,
        format: (v) => `${Math.round(v)}`,
      }));
      rows.push(makeSliderRow(io, {
        key: "workerSize",
        label: "Größe der Bewohner",
        min: 0.5, max: 2, step: 0.1,
        format: (v) => `${Math.round(v * 100)}%`,
      }));
      // Phase 58-w3.9l: "Gehbewegung" — one knob scaling the whole walk
      // swing (lateral meander + body bob + heading wobble). 0 % ≈ straight
      // walk, 100 % = the original amplitude, 150 % = a bit more. Default 55
      // (calmer) — the operator found the prior walk "schwingt zu viel".
      rows.push(makeSliderRow(io, {
        key: "workerSwayAmount",
        label: "Gehbewegung",
        min: 0, max: 150, step: 5,
        format: (v) => `${Math.round(v)}%`,
      }));
      rows.push(makeSelectRow(io, {
        key: "workerGroups",
        label: "Gruppen",
        options: [
          { value: "off", label: "aus" },
          { value: "rare", label: "selten" },
          { value: "normal", label: "normal" },
          { value: "frequent", label: "häufig" },
        ],
      }));
      rows.push(makeSliderRow(io, {
        key: "workerLanternShare",
        label: "Laternen-Anteil",
        min: 0, max: 100, step: 5,
        format: (v) => `${Math.round(v)}%`,
      }));
      rows.push(makeSliderRow(io, {
        key: "workerClothingBrightness",
        label: "Helligkeit der Kleidung",
        min: 0.3, max: 2, step: 0.05,
        format: (v) => `${Math.round(v * 100)}%`,
      }));
      const trailIntensityRow = makeSliderRow(io, {
        key: "workerTrailIntensity",
        label: "Spuren-Intensität",
        min: 0, max: 300, step: 5,
        format: (v) => `${Math.round(v)}%`,
      });
      const applyTrailGate = (trailsOn) => {
        trailIntensityRow.classList.toggle("is-disabled", !trailsOn);
        const input = trailIntensityRow.querySelector("input[type=range]");
        if (input) input.disabled = !trailsOn;
      };
      rows.push(makeToggleRow(io, {
        key: "workerTrails",
        label: "Spuren im Schnee",
        sub: "Bewohner hinterlassen langsam verblassende Pfade im Schnee.",
      }, { onChange: (next) => applyTrailGate(next) }));
      rows.push(trailIntensityRow);
      applyTrailGate(io.get("workerTrails") !== false);
      const exclusionRadiusRow = makeSliderRow(io, {
        key: "workerCenterExclusionRadius",
        label: "Aussparungs-Radius",
        min: 0, max: 60, step: 5,
        format: (v) => `${Math.round(v)}%`,
      });
      const exclusionOffsetXRow = makeSliderRow(io, {
        key: "workerExclusionOffsetX",
        label: "Aussparung X",
        min: -50, max: 50, step: 5,
        format: (v) => `${Math.round(v)}%`,
      });
      const exclusionOffsetYRow = makeSliderRow(io, {
        key: "workerExclusionOffsetY",
        label: "Aussparung Y",
        min: -50, max: 50, step: 5,
        format: (v) => `${Math.round(v)}%`,
      });
      const exclusionRingRow = makeToggleRow(io, {
        key: "workerExclusionRingVisible",
        label: "Ring anzeigen",
        sub: "Zeigt den sichtbaren, festgetretenen Ring um die Aussparung. Aus = kein Ring, Bewohner meiden die Zone trotzdem.",
      });
      const gatedExclusionRows = [
        exclusionRadiusRow,
        exclusionOffsetXRow,
        exclusionOffsetYRow,
        exclusionRingRow,
      ];
      const applyExclusionGate = (on) => {
        for (const row of gatedExclusionRows) {
          row.classList.toggle("is-disabled", !on);
          const input = row.querySelector("input[type=range], .rd-toggle");
          if (input) input.disabled = !on;
        }
      };
      rows.push(makeToggleRow(io, {
        key: "workerCenterExclusion",
        label: "Mitte aussparen",
        sub: "Bewohner und Spuren meiden einen kreisförmigen Bereich um die Mitte (z. B. den Generator).",
      }, { onChange: (next) => applyExclusionGate(next) }));
      rows.push(exclusionRadiusRow, exclusionOffsetXRow, exclusionOffsetYRow, exclusionRingRow);
      applyExclusionGate(io.get("workerCenterExclusion") === true);
    }

    if (isSnow) {
      // Phase 58-w3.9m: coded snow (decode-free snow.mp4 replacement).
      // "Dichte" = flake count, "Geschwindigkeit" = fall speed, both as
      // dedicated 0–100 % knobs (the generic intensity/speed sliders are
      // left untouched so the operator's two requested controls map 1:1).
      // "Sturm" = wind-driven, denser, faster, diagonal streaks.
      rows.push(makeSliderRow(io, {
        key: "snowDensity",
        label: "Dichte",
        min: 0, max: 100, step: 5,
        format: (v) => `${Math.round(v)}%`,
      }));
      rows.push(makeSliderRow(io, {
        key: "snowSpeed",
        label: "Geschwindigkeit",
        min: 0, max: 100, step: 5,
        format: (v) => `${Math.round(v)}%`,
      }));
      // Phase 58-w3.9s: mean flake size. The per-flake size variance scales
      // with it, so this grows/shrinks the whole field around its mean.
      rows.push(makeSliderRow(io, {
        key: "snowFlakeSize",
        label: "Mittlere Größe",
        min: 0, max: 100, step: 5,
        format: (v) => `${Math.round(v)}%`,
      }));
      rows.push(makeToggleRow(io, {
        key: "snowStorm",
        label: "Sturm",
        sub: "AN: windgepeitschter, dichterer und schnellerer Schnee mit diagonalen Schlieren. AUS: ruhiges Schneerieseln.",
      }));
    }

    if (isHullFlicker) {
      rows.push(makeToggleRow(io, {
        key: "breaksSolidColor",
        label: "Break solid color",
        sub: "Cuts any solid-color animation in the same room during the flicker’s off-gate.",
      }));
    }
    if (isPowerOutage) {
      rows.push(makeToggleRow(io, {
        key: "breaksSolidColor",
        label: "Break solid color",
        sub: "Cuts any solid-color animation in the same room except during the brief blue-flash flickers.",
      }));
    }

    return rows;
  }

  // Phase 58-w3.9h: optional fade-in/fade-out controls. NOT coded-specific
  // — fade applies to every animation (mp4/gif/coded, all scopes) — but
  // lives here so the full editor AND the live editor build the toggle +
  // conditional slider from one place (same IO-bridge contract). The
  // "Fade-Dauer" slider is hidden until the "Ein-/Ausblenden" toggle is ON
  // (visibility dependency, mirroring the coded gating pattern above).
  function buildFadeOptionRows({ get, set }) {
    const io = { get, set };
    const rows = [];
    const durationRow = makeSliderRow(io, {
      key: "fadeDurationMs",
      label: "Fade-Dauer",
      min: 100, max: 5000, step: 50,
      format: (v) => `${(Math.round(v) / 1000).toFixed(2)} s`,
    });
    const applyFadeGate = (on) => {
      durationRow.hidden = !on;
    };
    rows.push(makeToggleRow(io, {
      key: "fadeEnabled",
      label: "Ein-/Ausblenden",
      sub: "Sanftes Ein- und Ausblenden beim Starten und Stoppen statt eines abrupten Schnitts.",
    }, { onChange: (next) => applyFadeGate(next) }));
    rows.push(durationRow);
    applyFadeGate(io.get("fadeEnabled") === true);
    return rows;
  }

  // The set of definition/instance keys this builder can read/write.
  // The live editor uses it to snapshot (for Discard) + persist
  // (Save as default) the full coded field set without hard-coding the
  // list in two places.
  const CODED_OPTION_KEYS = [
    "colorHex",
    "heatShowSource",
    "heatSyncNearestSource",
    "heatIrregularPulse",
    "workerStyle",
    "workerCount",
    "workerSize",
    "workerSwayAmount",
    "workerGroups",
    "workerLanternShare",
    "workerClothingBrightness",
    "workerTrails",
    "workerTrailIntensity",
    "workerCenterExclusion",
    "workerCenterExclusionRadius",
    "workerExclusionOffsetX",
    "workerExclusionOffsetY",
    "workerExclusionRingVisible",
    "snowDensity",
    "snowSpeed",
    "snowStorm",
    "snowFlakeSize",
    "breaksSolidColor",
  ];

  window.TT_BEAMER_RUNTIME_ANIMATION_CODED_OPTIONS = {
    buildCodedOptionRows,
    buildFadeOptionRows,
    classifyCodedType,
    hasCodedOptions,
    CODED_OPTION_KEYS,
  };
})();
