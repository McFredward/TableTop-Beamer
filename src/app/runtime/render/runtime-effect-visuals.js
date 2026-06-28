// coded effect visuals module.
//
// Owns drawEffectVisual — the dispatcher for coded (non-gif/mp4)
// room and outside effects: outside-space parallax star field,
// hull-flicker, intruder-alert pulse, power-outage, special-slime,
// special-scanning, heat (alias: generator-heat), city-workers.
//
// Dependencies injected via ctx:
//   state                   — for default boardId
//   canvas                  — HTMLCanvasElement
//   canvasCtx               — CanvasRenderingContext2D
//   getRoomLabelPosition    — returns {x, y} for room center
//   getRuntimeVisualCaps    — returns runtime density caps
//   clampOutsideSpeed       — clamp helper
//   flickerNoise            — noise function for flicker effects
(() => {
  let ctx = null;
  // Phase 58-w3.9s: cached soft-blob sprite for the snow bokeh flakes.
  // Built once (lazily) and blitted via drawImage — far cheaper than a
  // per-flake createRadialGradient + fill, which measurably dropped fps on
  // the projector (operator 2026-06-28: snow felt laggy). Static → keeps the
  // effect deterministic (same blit every client).
  let snowBlobSprite = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  // ---- shared deterministic hash (Phase 58-w3.7w) ------------------
  // NO Math.random anywhere in the draw path: dashboard, /output and
  // the SSR tab must render pixel-identical frames for a given `age`
  // (they each run their own copy of this module). heatHash01 is the
  // classic sin-fract hash — stable for the small integer inputs used
  // here, so every client derives the same tables.
  // (Phase 58-w3.7x: the rising-ember particle table was removed
  // together with the ember layer — operator: embers break immersion.
  // Phase 58-w3.8f: the heat-shimmer streak table was removed together
  // with the shimmer layer — operator: the rising strips break the
  // look. heatHash01 stays — the city-workers tables below seed from
  // it.)
  function heatHash01(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  // ---- city-workers tables (Phase 58-w3.7y, per-room w3.7z) --------
  // Tiny top-down inhabitants for the Frostpunk crater city. Same
  // determinism contract as the heat tables above: every per-figure
  // parameter is derived from PURE seeded hashes (heatHash01), so all
  // clients (dashboard, /output, SSR tab) derive identical figures and
  // identical positions for a given `age`. NO Math.random in the draw
  // path.
  //
  // Phase 58-w3.7z (operator feedback): figures used to be seeded by
  // FIGURE INDEX only, so a cluster start rendered the SAME scene in
  // every room. Scenes are now seeded by (room id × figure index):
  // each room gets its own anchor layout, population scale, cycle
  // offsets and group event — different rooms look different, while
  // the same room still renders identically on dashboard, /output and
  // SSR (room ids come from the shared board catalog). Scenes are
  // memoized per room id; the cache is bounded and rebuilt cheaply.
  //
  // Behaviour model: each figure lives on a slow repeating cycle —
  // a long off-stage ("indoors") stretch, then fade in at the first
  // anchor, alternate WORK (stationary, rhythmic tool jitter) and
  // WALK (slow trudge to the next anchor) segments through 2-4
  // seeded anchor points, then fade out. Hidden fractions + phase
  // offsets are staggered so usually only a couple of figures are
  // visible and 0-2 are actually moving — "hin und wieder", not an
  // ant farm. Some rooms additionally get a GROUP event (w3.7z):
  // 2-4 figures sharing one route with per-member anchor scatter and
  // slightly lagged phases, so they trudge loosely together and
  // disperse around the work spots.
  // Phase 58-w3.8s: raised 12 → 24 so the "Anzahl Bewohner" control's
  // doubled max can actually render. Slots 12-23 are generated
  // deterministically by index (rh() keys on index, not array length),
  // so indices 0-11 stay byte-identical and default scenes are
  // unchanged; idle slots above figureCount skip rendering (envelope
  // loop `continue`).
  const WORKER_MAX = 24;
  const WORKER_SCENE_CACHE = new Map();
  const WORKER_SCENE_CACHE_MAX = 96;

  // ---- per-figure appearance variants (Phase 58-w3.8c) -------------
  // Operator: "Varianz in den verschiedenen Figuren … Lampen, unter-
  // schiedliche Klamotten". Every variant axis is seeded ONCE per
  // (room × figure) in getWorkerScene — a figure keeps its coat,
  // build, head shape, lantern and load for its whole life, across
  // cycles and across clients (same determinism contract as above).
  //
  // Coat palette: Frostpunk survivors — ALL entries dark and heavily
  // desaturated (cold greys, brown-greys, blue-greys, near-black
  // faded reds/greens). The crowd must stay grim; variance reads as
  // "different worn coats", never as colour.
  // Phase 58-w3.8j — dark-style on-black luminance lift. Operator: the
  // normal (dark) variant is choppy ("abgehackt") in /output while the
  // lit variant runs smooth. A/B evidence (same rooms, identical
  // deterministic figure trajectories replayed via startedAtEpochMs):
  // the SSR-tab canvas animates continuously in both styles, but the
  // historical near-black palette (channels 7-36, body alpha ≤0.82)
  // produced frame-to-frame deltas of only ~2-10 luma — below the
  // x264 dead-zone in dark flat regions, so the encoder SKIPPED the
  // motion until the accumulated delta forced an update (stall→pop =
  // choppy; consumer stall fraction 0.56 vs 0.16 lit in the same
  // window). Content-side fix: every dark-style paint constant is
  // lifted ×WORKER_DARK_LIFT at module load — the motion that reaches
  // the consumer now carries 25-80 luma instead of 2-10 and the
  // measured consumer stall fraction drops in every room (lantern
  // rooms 0.22 → 0.08; pure-silhouette rooms improve less — the
  // sub-pixel trudge of a 3-px near-black figure is inherently hard
  // on any encoder). 2.0 was tried first and only registered
  // canvas-side; 3.0 is the measured knee — beyond it the figures
  // stop reading as silhouettes (peak lifted channel is already
  // 108/255 on the brightest coat) for little further gain. The dark
  // style stays clearly dark against the bright board art on the
  // dashboard; the "Beleuchtet (Beamer)" style remains the
  // projector-RECOMMENDED setting (the style labels name the target
  // device for exactly this reason).
  const WORKER_DARK_LIFT = 3.0;
  function liftDarkRGB(rgbStr) {
    return rgbStr
      .split(",")
      .map((ch) => Math.min(255, Math.round(Number(ch.trim()) * WORKER_DARK_LIFT)))
      .join(", ");
  }
  // Phase 58-w3.8w "Helligkeit der Kleidung": scale an "r, g, b" string
  // by a luminance multiplier, clamped to [0,255]. mul === 1 returns the
  // SAME string (the seed strings are already integers, so a ×1 round-
  // trip is byte-identical) — the default clothing-brightness keeps every
  // coat render unchanged. The 7-tint variance is preserved: each channel
  // scales proportionally, so the palette only shifts in overall lightness.
  function scaleRGBString(rgbStr, mul) {
    if (mul === 1) return rgbStr;
    return rgbStr
      .split(",")
      .map((ch) => String(Math.max(0, Math.min(255, Math.round(Number(ch.trim()) * mul)))))
      .join(", ");
  }
  // Historical (pre-w3.8j) seed palette — kept verbatim so the lift is
  // a single documented factor on top of the operator-approved tints.
  const WORKER_COAT_PALETTE_DARK_BASE = [
    "15, 19, 27",  // cold near-black blue (the original silhouette)
    "24, 26, 31",  // ash grey
    "28, 23, 17",  // brown-grey, worn leather
    "14, 21, 31",  // deep blue-grey
    "36, 20, 18",  // desaturated dark red (faded signal coat)
    "20, 27, 21",  // desaturated dark green (old uniform)
    "23, 20, 26",  // dusty violet-grey
  ];
  const WORKER_COAT_PALETTE = WORKER_COAT_PALETTE_DARK_BASE.map(liftDarkRGB);
  // Lit coat palette (Phase 58-w3.8e, "city-workers-lit"): the SAME
  // seven survivor tints index-for-index, lifted ~4-5× in luminance
  // for the physical projector. The beamer maps pure black to zero
  // light, so the near-black palette above is invisible on the board
  // — these mid-dark desaturated greys/blue-greys/brown-greys stay
  // grim but clearly read above black. Stored as [r,g,b] arrays so
  // the lit draw path can derive head/underside/highlight shades
  // numerically; figures pick by the SAME seeded coatIdx, so a
  // figure wears the "same" coat in both render styles.
  const WORKER_COAT_PALETTE_LIT = [
    [130, 144, 170], // cold blue-grey
    [146, 151, 160], // ash grey
    [162, 146, 124], // brown-grey, worn leather
    [122, 142, 170], // deep blue-grey
    [174, 136, 126], // desaturated red (faded signal coat)
    [132, 151, 136], // desaturated green (old uniform)
    [151, 143, 160], // dusty violet-grey
  ];
  // Derived per-coat shades for the lit style, computed ONCE at module
  // load (pure math — same determinism contract as the seed tables):
  //   coat        — the body fill,
  //   under       — darker-than-coat underside shading (replaces the
  //                 pure-black drop shadow, which adds nothing on the
  //                 beamer's black background),
  //   highlight   — cold top-light on the shoulders, biased blue,
  //   hood        — hood blob a touch lighter than the coat,
  //   hoodOpening — hood-opening crescent, darker than the hood but
  //                 well above black so the head still reads,
  //   cap         — bare-head dot. Phase 58-w3.8w rebalance: on the
  //                 beamer the old near-white cap (≈0.42 toward 212) made
  //                 every figure read as "a roaming white dot" and out-
  //                 shone the lantern. The cap now sits only SLIGHTLY
  //                 above the coat (×1.08, capped) — in coat-range, never
  //                 a hotspot — so the brightest element on a carrier is
  //                 the warm lantern, and a non-carrier reads as a dim
  //                 figure rather than a white dot.
  const WORKER_LIT_COATS = WORKER_COAT_PALETTE_LIT.map(([r, g, b]) => ({
    coat: `${r}, ${g}, ${b}`,
    under: `${Math.round(r * 0.42)}, ${Math.round(g * 0.42)}, ${Math.round(b * 0.42)}`,
    highlight: `${Math.round(r + (200 - r) * 0.40)}, ${Math.round(g + (214 - g) * 0.40)}, ${Math.round(b + (236 - b) * 0.40)}`,
    hood: `${Math.min(255, Math.round(r * 1.16 + 6))}, ${Math.min(255, Math.round(g * 1.16 + 6))}, ${Math.min(255, Math.round(b * 1.16 + 6))}`,
    hoodOpening: `${Math.round(r * 0.48)}, ${Math.round(g * 0.48)}, ${Math.round(b * 0.48)}`,
    cap: `${Math.min(255, Math.round(r * 1.08))}, ${Math.min(255, Math.round(g * 1.08))}, ${Math.min(255, Math.round(b * 1.08))}`,
  }));
  // Loads are size-gated AT DRAW TIME: below these silhouette lengths
  // a sled / bundle is sub-3-px mush that muddies the figure, so the
  // load geometry (and the sled's wider trail) simply isn't rendered
  // on small tiles — the figure stays a plain walker there. The
  // slower loaded pace is seeded into the cycle timing and therefore
  // applies at every size (harmless: it just reads as a tired
  // walker), keeping scene timing independent of canvas metrics.
  // Tuned against the live Frostpunk catalog: its 133 px ring tiles
  // give baseFigLen 3.325 — a 3.4 gate silenced every sled-seeded
  // figure on the whole board, 3.2 lets average-build carriers
  // through while still dropping the smallest tiles/builds.
  const WORKER_SLED_MIN_PX = 3.2;
  const WORKER_BUNDLE_MIN_PX = 2.8;

  // FNV-1a over the room-id string → 32-bit uint, folded into the
  // sin-hash domain. Pure string math — stable across clients.
  function workerRoomSeed(roomKey) {
    let h = 2166136261;
    const s = String(roomKey);
    for (let idx = 0; idx < s.length; idx += 1) {
      h ^= s.charCodeAt(idx);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % 100000;
  }

  // Polar anchor offsets around the room centroid in unit-disc coords
  // (scaled by the half-extents at draw time). Radius biased to
  // centroid-plus-ring: workers cluster around the generator /
  // building footprint, not the polygon rim.
  // Phase 58-w3.8w "Mitte aussparen": when an exclusion radius is set
  // (>0, unit-disc fraction of the half-extent), every anchor radius is
  // clamped to sit OUTSIDE the zone (+ a small margin) so figures never
  // anchor on the central generator. Paths route around the zone via a
  // radial push in workerWalkPoint. excludeR=0 (default/off) leaves the
  // historical 0.16..0.76 band untouched — byte-identical.
  function buildWorkerAnchors(rh, base, count, excludeR = 0, offX = 0, offY = 0, anchorMargin = 0.05) {
    const minRad = excludeR > 0 ? excludeR + anchorMargin : 0;
    return Array.from({ length: count }, (_, k) => {
      const seed = base + k * 7;
      const ang = rh(seed + 2003) * Math.PI * 2;
      const rad = Math.max(minRad, 0.16 + rh(seed + 3001) * 0.6); // 0.16..0.76
      let x = Math.cos(ang) * rad;
      let y = Math.sin(ang) * rad;
      // Phase 58-w3.9b: the exclusion zone can be shifted off the
      // centroid (offX/offY, unit-disc). Push any anchor that landed
      // inside the shifted zone back out to its boundary (radially from
      // the shifted centre). offX=offY=0 skips this → byte-identical.
      if (excludeR > 0 && (offX !== 0 || offY !== 0)) {
        const dx = x - offX;
        const dy = y - offY;
        const d = Math.hypot(dx, dy);
        if (d > 1e-4 && d < excludeR + anchorMargin) {
          const s = (excludeR + anchorMargin) / d;
          x = offX + dx * s;
          y = offY + dy * s;
        }
      }
      return [x, y];
    });
  }

  // Phase 58-w3.9b "constant pace along the ring": the trudge time
  // budget (v1.2.32) was computed from straight anchor-to-anchor chord
  // lengths, but workerWalkPoint radially re-routes any sample that
  // would cut through the exclusion zone onto the circle boundary — so
  // the ACTUAL traversed arc is longer than the budgeted chord and the
  // figure raced along the ring ("sausen"). This integrates the real
  // re-routed path length (same geometric push as workerWalkPoint, sans
  // the sub-1% meander) so the budget matches what the figure walks and
  // the wading speed stays constant on the ring. excludeR=0 returns the
  // plain chord → byte-identical to the historical timing.
  function workerLegLength(a, b, excludeR = 0, offX = 0, offY = 0) {
    const straight = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-4;
    if (!(excludeR > 0)) return straight;
    const N = 32;
    let px0 = a[0];
    let py0 = a[1];
    let total = 0;
    for (let s = 1; s <= N; s += 1) {
      const p = s / N;
      let px = a[0] + (b[0] - a[0]) * p;
      let py = a[1] + (b[1] - a[1]) * p;
      const dx = px - offX;
      const dy = py - offY;
      const d = Math.hypot(dx, dy);
      if (d > 1e-4 && d < excludeR) {
        const sc = excludeR / d;
        px = offX + dx * sc;
        py = offY + dy * sc;
      }
      total += Math.hypot(px - px0, py - py0);
      px0 = px;
      py0 = py;
    }
    return total || 1e-4;
  }

  // ---- trudging pace parametrization (Phase 58-w3.8b) --------------
  // Operator feedback: figures moved "like a fly / at double speed".
  // Walk timing is now derived from PATH LENGTH at a constant per-
  // figure trudge speed (unit-disc units per second; 1 unit = the
  // room half-extent), so every leg moves at the same slow wading
  // pace regardless of leg length and px/s scales with polygon size.
  // On a ~133 px tile (halfW ≈ 66.5 px) the easing peak is
  // ≈ 1.3 × trudgeSpeed × halfW ≈ 3.5-4.0 px/s — an anchor-to-anchor
  // leg of ~0.7 units takes ~15-18 s, long legs up to ~30 s. The
  // speed knob scales `age` exactly ONCE (runtime-draw-loop.js
  // w3.8b fix), so speed=2 → all durations halve, linearly.
  //
  // w3.8d (operator: "die 'ganz schnellen' sind immer noch etwas zu
  // unrealistisch schnell"): the TOP of the band is capped — span
  // 0.014 → 0.006 — so the fastest figures peak ≈ 4.0-4.5 px/s on the
  // 133 px hex while the slowest stay where they were. The easing
  // peak factor is also softened (see workerWalkProgress).
  const WORKER_TRUDGE_SPEED_MIN = 0.040; // unit-disc units / second
  const WORKER_TRUDGE_SPEED_SPAN = 0.005;

  // Per-leg length fractions of the total route — workerPoseAt
  // distributes the walk time budget by these so the trudge speed is
  // uniform across legs (the old equal-split made short legs crawl
  // and long legs sprint).
  function workerLegShares(anchors, excludeR = 0, offX = 0, offY = 0) {
    const shares = [];
    let total = 0;
    for (let k = 0; k < anchors.length - 1; k += 1) {
      // w3.9b: ACTUAL re-routed arc length (incl. the detour around the
      // exclusion ring), not the straight chord — keeps the wading pace
      // constant along the ring. excludeR=0 → plain chord (unchanged).
      const len = workerLegLength(anchors[k], anchors[k + 1], excludeR, offX, offY);
      shares.push(len);
      total += len;
    }
    for (let k = 0; k < shares.length; k += 1) shares[k] /= total;
    return { shares, totalLen: total };
  }

  // Derive the cycle layout from REAL durations instead of seeding an
  // arbitrary cycleDur: walking time = route length / trudge speed,
  // plus seconds-denominated work stops and an off-stage stretch.
  function workerCycleTiming(anchors, { trudgeSpeed, workDurPerStop, hiddenDur, excludeR = 0, offX = 0, offY = 0 }) {
    const { shares, totalLen } = workerLegShares(anchors, excludeR, offX, offY);
    const walkDur = totalLen / trudgeSpeed;
    const workDur = workDurPerStop * anchors.length;
    const activeDur = walkDur + workDur;
    const cycleDur = activeDur + hiddenDur;
    return {
      cycleDur,
      hiddenFrac: hiddenDur / cycleDur,
      walkShare: walkDur / activeDur,
      legShares: shares,
    };
  }

  // Group-frequency presets (Phase 58-w3.8i "Gruppen"): prob is the
  // per-room chance of a group event existing at all, hiddenBase/Span
  // the seconds the group stays off-stage between appearances. The
  // "normal" row carries the EXACT historical constants (0.55 / 70+70)
  // so default definitions keep rendering identically.
  const WORKER_GROUP_TUNING = {
    off: { prob: 0, hiddenBase: 70, hiddenSpan: 70 },
    rare: { prob: 0.30, hiddenBase: 110, hiddenSpan: 90 },
    normal: { prob: 0.55, hiddenBase: 70, hiddenSpan: 70 },
    frequent: { prob: 0.85, hiddenBase: 35, hiddenSpan: 40 },
  };

  function normalizeWorkerGroupsOption(value) {
    return Object.prototype.hasOwnProperty.call(WORKER_GROUP_TUNING, value) ? value : "normal";
  }

  // Phase 58-w3.8i: the scene is now parametrized by the merged
  // effect's per-definition options that affect SEEDING (group
  // frequency, lantern share). They join the cache key — the cache
  // stays bounded and deterministic; same options ⇒ same scene on
  // every client. Defaults reproduce the historical constants
  // byte-for-byte (groups "normal", lanternShare 30 ⇒ bias
  // 0.22 + rh·0.16 exactly).
  function getWorkerScene(roomKey, sceneOpts = null) {
    const groupsOpt = normalizeWorkerGroupsOption(sceneOpts?.groups);
    const lanternShareRaw = Number(sceneOpts?.lanternShare);
    const lanternShare = Number.isFinite(lanternShareRaw)
      ? Math.max(0, Math.min(100, lanternShareRaw))
      : 30;
    // Phase 58-w3.8w center exclusion — affects SEEDING (anchor radii),
    // so it joins the cache key. excludeR is a unit-disc fraction
    // (0..0.60); 0 = off = historical anchors. The cache stays bounded
    // and deterministic; default "::0" reproduces the historical scene
    // byte-for-byte.
    const excludeR = sceneOpts?.centerExclusion === true
      ? Math.max(0, Math.min(0.6, Number(sceneOpts?.centerExclusionRadius) / 100 || 0))
      : 0;
    // Phase 58-w3.9b: exclusion-zone centre offset (unit-disc fraction of
    // the half-extent; ±0.50 from ±50%). Joins the cache key — it changes
    // anchor seeding / path detours. Defaults (0/0) reproduce the w3.8w
    // scene byte-for-byte.
    // w3.9c: the "Ring anzeigen" toggle no longer influences SEEDING at
    // all — avoidance is now ALWAYS natural (per-figure varied clearance,
    // anchors well clear of the zone). The toggle only gates a drawn ring
    // primitive at draw time, so it is NOT part of the scene cache key.
    const offX = excludeR > 0
      ? Math.max(-0.5, Math.min(0.5, Number(sceneOpts?.exclusionOffsetX) / 100 || 0))
      : 0;
    const offY = excludeR > 0
      ? Math.max(-0.5, Math.min(0.5, Number(sceneOpts?.exclusionOffsetY) / 100 || 0))
      : 0;
    const cacheKey = `${roomKey}::${groupsOpt}::${lanternShare}::${excludeR}::${offX}::${offY}`;
    const cached = WORKER_SCENE_CACHE.get(cacheKey);
    if (cached) return cached;
    const seedBase = workerRoomSeed(roomKey) * 0.6180339887; // golden-ratio spread
    const rh = (n) => heatHash01(n + seedBase);

    // Per-room lantern density (w3.8c, parametrized in w3.8i): the
    // "Laternen-Anteil" option shifts the whole band; the seeded ±8%
    // per-room jitter stays — some rooms read as a lit work detail,
    // others as a dark shift. At the 30% default this is the exact
    // historical 0.22 + rh·0.16 band.
    // Integer arithmetic before the division so the 30% default yields
    // EXACTLY the historical 0.22 + rh·0.16 (30/100 - 0.08 differs in
    // the last float bit and would break the byte-identity contract).
    const lanternBias = Math.max(0, Math.min(1, (lanternShare - 8) / 100 + rh(14021) * 0.16));

    // Group event (w3.7z, frequency option w3.8i): "normal" gives
    // roughly half the rooms one — 2-4 figures sharing a leader
    // route. Figure 0 is always a single, so even the smallest
    // population mixes singles and group members.
    const groupTuning = WORKER_GROUP_TUNING[groupsOpt];
    const hasGroup = groupTuning.prob > 0 && rh(13007) < groupTuning.prob;
    const groupSize = hasGroup ? 2 + Math.floor(rh(13013) * 3) : 0; // 2..4
    const GROUP_START = 1;
    // w3.9c "natural avoidance, no rim-hugging": anchors are ALWAYS pushed
    // onto a band well clear of the zone (proportional margin) so figures
    // spread away from the centre and most legs never come near it — this
    // no longer depends on whether a ring is drawn. The margin scales with
    // the zone (excludeR·0.40 + 0.06) so it always sits OUTSIDE every
    // figure's varied detour radius (max excludeR·1.34, see figSnapR below)
    // — anchors are never re-pushed by a detour. excludeR=0 keeps the
    // historical 0.05 (unused: minRad=0) → byte-identical when off.
    const anchorMargin = excludeR > 0 ? excludeR * 0.40 + 0.06 : 0.05;
    // w3.9c: the whole group detours the zone at ONE seeded clearance
    // radius (1.06–1.34× the true radius) so members stay loosely together
    // yet never trace the exact rim. Singles each get their own (below).
    const groupSnapR = excludeR > 0 ? excludeR * (1.06 + rh(15601) * 0.28) : 0;
    let groupAnchors = null;
    let groupCycle = null;
    if (hasGroup) {
      groupAnchors = buildWorkerAnchors(rh, 901, 2 + Math.floor(rh(15101) * 2), excludeR, offX, offY, anchorMargin); // 2..3 stops
      // Shared timing derived from the LEADER route length (w3.8b) so
      // the whole group trudges at the same slow pace and stays loosely
      // together; see the trudge-speed parametrization below. The arc
      // budget uses groupSnapR so the pace stays constant on the detour.
      groupCycle = workerCycleTiming(groupAnchors, {
        trudgeSpeed: WORKER_TRUDGE_SPEED_MIN + rh(15203) * WORKER_TRUDGE_SPEED_SPAN,
        workDurPerStop: 9 + rh(15211) * 7,
        // Off-stage stretch from the frequency preset — "normal"
        // keeps the historical 70-140 s ("group events stay
        // occasional"), "rare"/"frequent" stretch/compress it.
        hiddenDur: groupTuning.hiddenBase + rh(15401) * groupTuning.hiddenSpan,
        excludeR: groupSnapR, offX, offY,
      });
      groupCycle.phase = rh(15307);
    }

    const figures = Array.from({ length: WORKER_MAX }, (_, i) => {
      const inGroup = hasGroup && i >= GROUP_START && i < GROUP_START + groupSize;
      // Appearance variants (w3.8c) — decided up-front because the
      // sled load feeds the cycle timing below (loaded = slow end of
      // the trudge band). The SLED rolls first: it is much rarer than
      // the lantern (which would otherwise eat most low-index singles
      // and leave whole boards sled-free — observed on the live
      // Frostpunk catalog). Lanterns: singles roll against the room's
      // lanternBias; in a group only the LEADER may carry (reduced
      // odds) so a group never reads as a lantern parade. Loads stay
      // on singles (group timing is shared) and never combine with a
      // lantern — both hands occupied reads wrong at this scale.
      const hasSled = !inGroup && rh(i + 18061) < 0.14;
      const hasLantern = !hasSled && (inGroup
        ? (i === GROUP_START && rh(i + 11003) < lanternBias * 0.7)
        : rh(i + 11003) < lanternBias);
      // w3.8d: bundles gated to singles too (the comment above always
      // promised this) — group timing ignores the loaded slow-down, so
      // a loaded group member would walk faster than loaded singles.
      const hasBundle = !inGroup && !hasSled && !hasLantern && rh(i + 18071) < 0.18;
      // Coat pick (w3.8c, factored out in w3.8e): the seeded index is
      // kept on the figure so the "city-workers-lit" render style can
      // map the SAME pick into its lifted palette — one engine, two
      // palettes.
      const coatIdx = Math.floor(rh(i + 18001) * WORKER_COAT_PALETTE.length)
        % WORKER_COAT_PALETTE.length;
      // w3.9c: per-figure detour radius — the heart of the "no rim-hugging"
      // fix. EVERY single routes around the zone at its OWN seeded clearance
      // (1.06–1.34× the true radius), so no two figures trace the same
      // circle and nobody walks the precise rim; the old code snapped every
      // crossing path onto the EXACT boundary (excludeR), which made the
      // workers conspicuously circle the centre. The band stays ≥ the true
      // zone (centre always clear) and < anchorMargin (anchors untouched).
      // Group members share groupSnapR so they detour together. This is now
      // independent of whether a ring is drawn.
      const figSnapR = excludeR > 0
        ? (inGroup ? groupSnapR : excludeR * (1.06 + rh(i + 21001) * 0.28))
        : 0;
      let anchors;
      let cycleDur;
      let phase;
      let hiddenFrac;
      let walkShare;
      let legShares;
      if (inGroup) {
        const member = i - GROUP_START;
        // Member route = leader route + small per-anchor scatter, so
        // the walk legs run loosely parallel (no formation lockstep)
        // and the group naturally disperses around each work spot.
        anchors = groupAnchors.map((a, k) => {
          const sa = rh(i * 311 + k * 41 + 16001) * Math.PI * 2;
          const sr = 0.035 + rh(i * 311 + k * 41 + 16007) * 0.075;
          let ax = a[0] + Math.cos(sa) * sr;
          let ay = a[1] + Math.sin(sa) * sr;
          // Scatter must not push a member anchor back into the (possibly
          // offset) zone — clamp radially from the shifted centre.
          if (excludeR > 0) {
            const dx = ax - offX;
            const dy = ay - offY;
            const d = Math.hypot(dx, dy);
            if (d > 1e-4 && d < excludeR + anchorMargin) {
              const s = (excludeR + anchorMargin) / d;
              ax = offX + dx * s;
              ay = offY + dy * s;
            }
          }
          return [ax, ay];
        });
        cycleDur = groupCycle.cycleDur;
        // Tiny per-member phase lag — they arrive within a couple of
        // seconds of each other instead of marching in sync.
        phase = (groupCycle.phase + member * 0.006 + rh(i + 16101) * 0.010) % 1;
        hiddenFrac = groupCycle.hiddenFrac;
        // w3.8d: the member's walk budget is scaled by its OWN route
        // length over the leader's, so every member moves at exactly
        // the shared group trudge speed. The old shared walkShare let
        // a scatter-stretched member route run up to ~2× the leader
        // pace (the v1.2.31 speed outliers were ALL group members).
        // Work stops absorb the few-% difference; segment boundaries
        // shift slightly per member — welcome, no formation lockstep.
        const memberRoute = workerLegShares(anchors, groupSnapR, offX, offY);
        const leaderRoute = workerLegShares(groupAnchors, groupSnapR, offX, offY);
        walkShare = Math.min(
          0.9,
          groupCycle.walkShare * (memberRoute.totalLen / leaderRoute.totalLen),
        );
        legShares = memberRoute.shares;
      } else {
        anchors = buildWorkerAnchors(rh, 101 + i * 97, 2 + Math.floor(rh(i + 1009) * 3), excludeR, offX, offY, anchorMargin);
        // w3.8b: cycle derived from durations — slow wading pace,
        // long heavy work stops, long off-stage stretches. Typical
        // cycle lands at ~110-220 s @ speed 1 (was 38-72 s).
        // w3.8c: sled-pullers walk at the slow end of the trudge band
        // (hauling through snow) — span compressed to the bottom 30%.
        // w3.8d: bundle-carriers compressed too (bottom 55%) — loaded
        // figures must never be among the fastest on the board.
        const timing = workerCycleTiming(anchors, {
          trudgeSpeed: WORKER_TRUDGE_SPEED_MIN
            + rh(i + 4003) * WORKER_TRUDGE_SPEED_SPAN * (hasSled ? 0.3 : hasBundle ? 0.55 : 1),
          workDurPerStop: 8 + rh(i + 4007) * 8,   // 8-16 s leaning into the work
          hiddenDur: 55 + rh(i + 6007) * 65,      // 55-120 s off-stage
          excludeR: figSnapR, offX, offY,
        });
        cycleDur = timing.cycleDur;
        phase = rh(i + 5003);                     // cycle offset 0..1
        hiddenFrac = timing.hiddenFrac;
        walkShare = timing.walkShare;
        legShares = timing.legShares;
      }
      return {
        anchors,
        cycleDur,
        phase,
        hiddenFrac,
        walkShare,
        legShares,
        // Phase 58-w3.8w: walk legs route around this central exclusion
        // radius (unit-disc; 0 = off). Read by workerWalkPoint. w3.9b:
        // this is the per-figure snap radius (= the true zone radius when
        // the ring is visible; a seeded band above it when hidden, so the
        // sharp ring dissolves while the centre stays avoided).
        excludeR: figSnapR,
        // Phase 58-w3.9b: shifted exclusion-zone centre (unit-disc).
        exclusionOffX: offX,
        exclusionOffY: offY,
        inGroup,
        // Heavy-step cadence (w3.8b): ~1.2-1.6 steps/s at speed 1
        // (rad/s here; Hz = stepFreq / 2π). Was 0.8-1.2 — combined
        // with the old 5 s legs it read as scurrying.
        stepFreq: 7.5 + rh(i + 8009) * 2.6,
        // Exhausted tool rhythm: one slow strike every ~1.5-2.5 s
        // (was 1.0-1.8 Hz — frantic).
        workFreq: 0.40 + rh(i + 9001) * 0.30,
        sizeJitter: 0.85 + rh(i + 10007) * 0.3,
        // ---- appearance variants (w3.8c) — fixed for life ----------
        // Coat: muted dark palette pick (see WORKER_COAT_PALETTE).
        coatIdx,
        coatRGB: WORKER_COAT_PALETTE[coatIdx],
        // Build: along-axis length ±20%, shoulder width ±25% —
        // broad stocky figures next to slim ones.
        buildLen: 0.80 + rh(i + 18011) * 0.40,
        buildWidth: 0.75 + rh(i + 18021) * 0.50,
        // Head: hood (larger coat-coloured blob merged into the
        // shoulders) vs cap (smaller darker dot, sits further
        // forward); some figures additionally stoop — head pulled
        // back toward the torso, hunched against the cold.
        hood: rh(i + 18031) < 0.45,
        stoop: rh(i + 18041) < 0.35 ? 0.5 + rh(i + 18051) * 0.5 : 0,
        hasLantern,
        hasSled,
        hasBundle,
        lanternSide: rh(i + 12007) < 0.5 ? -1 : 1,
        lanternSwingPhase: rh(i + 18081) * Math.PI * 2,
        flickerPhase: rh(i + 18091) * Math.PI * 2,
        glowScale: 2.2 + rh(i + 18101) * 0.6,     // halo radius, × figure length
        // Humanized gait seeds (w3.7z, calmed in w3.8b, calmed AGAIN
        // in w3.8d — operator: "Das Hin&her-Schwenken ist auch etwas
        // zu stark"): the walk is now nearly straight with only a
        // hint of drift (max lateral ≈ 1-3 % of leg length, was up to
        // ~11 %), and the pace warp is shallower/slower so it can no
        // longer spike the instantaneous speed above the band cap.
        meanderScale: 0.012 + rh(i + 17001) * 0.018, // lateral drift, × leg length
        meanderFreq: 0.5 + rh(i + 17011) * 0.6,      // drift waves per leg
        meanderPhase: rh(i + 17021) * Math.PI * 2,
        paceAmp: 0.035 + rh(i + 17031) * 0.035,      // deep-snow slow-down depth
        paceFreq: 0.8 + rh(i + 17041) * 0.6,         // pace cycles per leg
        pacePhase: rh(i + 17051) * Math.PI * 2,
        // More figures hesitate, and the stall is wider/longer — it
        // should read as catching breath in deep snow, not twitching.
        hesitate: rh(i + 17061) < 0.6 ? 0.5 + rh(i + 17071) * 0.5 : 0,
        hesitateAt: 0.30 + rh(i + 17081) * 0.40,     // where mid-path stall sits
        gaitSeed: rh(i + 17091) * Math.PI * 2,       // bob/wobble phase offset
      };
    });

    const scene = {
      figures,
      // Per-room population variance: ×0.75..1.3 on top of the
      // configured count (w3.8i) — rooms keep individual densities.
      countScale: 0.75 + rh(14009) * 0.55,
      lanternBias, // exposed for diag — per-room lantern density
      hasGroup,    // exposed for diag — group-frequency option evidence
      groupSize,
      // Phase 58-w3.9c: the TRUE exclusion zone (unit-disc) — the drawn
      // ring renders at this exact radius/centre at draw time (0 = off).
      excludeR,
      exclusionOffX: offX,
      exclusionOffY: offY,
    };
    if (WORKER_SCENE_CACHE.size >= WORKER_SCENE_CACHE_MAX) WORKER_SCENE_CACHE.clear();
    WORKER_SCENE_CACHE.set(cacheKey, scene);
    return scene;
  }

  // Warped walk progress along a leg (w3.7z "walking, not driving"):
  // smoothstep easing into/out of the stops, a subtle seeded
  // accelerate/decelerate stride cycle (pinned to 0 at both
  // endpoints), and for some figures a brief gaussian mid-path
  // hesitation — the figure stalls, shifts weight, then carries on.
  function workerWalkProgress(fig, p) {
    // w3.8d: smoothstep blended 55% toward linear — the pure
    // smoothstep's 1.5× mid-leg peak made even band-bottom figures
    // overshoot the pace cap; the blend keeps a soft ease into/out of
    // the stops at a 1.275× peak.
    const ss = p * p * (3 - 2 * p);
    let e = p + (ss - p) * 0.55;
    e += Math.sin(p * Math.PI * 2 * fig.paceFreq + fig.pacePhase) * fig.paceAmp * p * (1 - p);
    if (fig.hesitate > 0) {
      // w3.8b widened the gaussian 0.09 → 0.15; w3.8d widens again to
      // 0.20 and halves the depth — the catch-up slope after a stall
      // was the single biggest speed spike (≈ +0.35× on the leg pace).
      const d = (p - fig.hesitateAt) / 0.20;
      e -= fig.hesitate * 0.03 * Math.exp(-d * d) * Math.sin(Math.PI * p);
    }
    return Math.max(0, Math.min(1, e));
  }

  // Radial push: any point inside the (possibly offset) exclusion circle
  // is projected out to its boundary. Shared by the walk path, the
  // arc-length budget and the within-leg reparametrization so all three
  // agree on the same geometry.
  function workerSnapOutside(px, py, eR, ox, oy) {
    if (!(eR > 0)) return [px, py];
    const dx = px - ox;
    const dy = py - oy;
    const d = Math.hypot(dx, dy);
    if (d > 1e-4 && d < eR) {
      const s = eR / d;
      return [ox + dx * s, oy + dy * s];
    }
    return [px, py];
  }

  // Phase 58-w3.9b: the geometric chord parameter g∈[0,1] whose
  // re-routed (snapped) arc-length fraction equals `e`. When a leg's
  // chord is re-routed around the exclusion circle, equal steps in the
  // chord parameter are NOT equal steps in distance — near the circle's
  // tangent the snapped point swings far per unit chord, which raced the
  // figure ("sausen") even after the per-leg time budget was fixed.
  // Inverting arc-length here makes the figure cover equal DISTANCE per
  // unit time along the ring, so the wading speed is constant on the
  // ring exactly as on a straight leg. excludeR=0 returns e unchanged.
  function workerArcParam(a, b, e, eR, ox, oy) {
    if (!(eR > 0) || e <= 0) return Math.max(0, e);
    if (e >= 1) return 1;
    const N = 48;
    let prev = workerSnapOutside(a[0], a[1], eR, ox, oy);
    let total = 0;
    const segLen = new Array(N);
    for (let k = 1; k <= N; k += 1) {
      const u = k / N;
      const cur = workerSnapOutside(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, eR, ox, oy);
      const l = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
      segLen[k - 1] = l;
      total += l;
      prev = cur;
    }
    if (total < 1e-9) return e;
    const target = e * total;
    let acc = 0;
    for (let k = 0; k < N; k += 1) {
      if (acc + segLen[k] >= target) {
        const frac = segLen[k] > 1e-9 ? (target - acc) / segLen[k] : 0;
        return (k + frac) / N;
      }
      acc += segLen[k];
    }
    return 1;
  }

  // Walk-leg position with meander: two incommensurate sinusoids give
  // a noise-like lateral drift around the straight line; the sin(πp)
  // envelope pins the path to the anchors at both ends. Returns
  // unit-disc coords.
  // Phase 58-w3.9l: `swayMul` (default 1 = original amplitude) scales the
  // lateral meander — one component of the configurable "Gehbewegung"
  // (walk-sway) knob. Same multiplier feeds the body bob + heading wobble
  // in the draw branch so a single slider calms (or amplifies) the whole
  // gait swing. swayMul=0 → straight leg (meander vanishes); the live
  // default is 0.55 (see the draw block), so existing definitions render
  // calmer per the operator's "schwingt zu viel" report.
  function workerWalkPoint(fig, a, b, p, swayMul = 1) {
    const e = workerWalkProgress(fig, p);
    const eR = fig.excludeR ?? 0;
    const ox = fig.exclusionOffX ?? 0;
    const oy = fig.exclusionOffY ?? 0;
    // w3.9b: map the eased time-fraction `e` onto an EQUAL-DISTANCE
    // position along the (re-routed) leg. eR=0 → g === e (byte-identical
    // straight-leg behaviour); eR>0 removes the tangent speed spike.
    const g = workerArcParam(a, b, e, eR, ox, oy);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-4;
    const nx = -dy / len;
    const ny = dx / len;
    const lat = (Math.sin(p * Math.PI * 2 * fig.meanderFreq + fig.meanderPhase) * 0.7
      + Math.sin(p * Math.PI * 2 * fig.meanderFreq * 2.33 + fig.meanderPhase * 1.7 + 1.1) * 0.3)
      * Math.sin(p * Math.PI) * fig.meanderScale * len * swayMul;
    let px = a[0] + dx * g + nx * lat;
    let py = a[1] + dy * g + ny * lat;
    // Phase 58-w3.8w "Mitte aussparen": a straight leg between two anchors
    // that already sit outside the zone can still cut a chord THROUGH it
    // (or the meander can nudge a sample inside). Push any in-zone sample
    // radially out to the (possibly offset) boundary so the path hugs the
    // exclusion circle — pure + deterministic, so the trail samples
    // (which call this same function) respect the zone too.
    [px, py] = workerSnapOutside(px, py, eR, ox, oy);
    return [px, py];
  }

  // ---- trampled-snow trails (Phase 58-w3.8a) -----------------------
  // Workers leave fading paths in the snow ("im Schnee gestampft").
  // NO accumulation canvas: because px/py from workerPoseAt are a PURE
  // function of normalized cycle time t (safeAge only feeds the
  // workPulse lean), every client can re-evaluate where a figure WAS
  // at any past moment. Each frame we walk the trailing
  // WORKER_TRAIL_FADE_SEC window, map it onto the figure's repeating
  // cycle, and stroke soft segments between consecutive path samples
  // with alpha falling off (smoothstep) by time-since-traversal.
  // Dashboard, /output and SSR therefore render pixel-identical
  // trails for a given age, and trails survive reloads for free.
  //
  // The sampled path is IDENTICAL every cycle (anchors + meander are
  // fixed per figure), so the samples are memoized ONCE per figure on
  // the scene object — bounded by WORKER_SCENE_CACHE. Per frame only
  // cheap segment strokes remain (~60 per visible figure), batched
  // into a handful of stroke() calls via alpha-band quantization.
  const WORKER_TRAIL_FADE_SEC = 75;    // trail lifetime before fully faded
  // w3.8b: 0.6 → 1.0 s — at the trudging pace (~0.04-0.054 units/s) a
  // 1 s sample still spans only ~3 px on a 133 px tile, and the longer
  // active stretch (~110-190 s) stays inside WORKER_TRAIL_MAX_SAMPLES.
  const WORKER_TRAIL_SAMPLE_SEC = 1.0; // path-time spacing between samples
  const WORKER_TRAIL_MAX_SAMPLES = 200;
  const WORKER_TRAIL_BANDS = 7;        // alpha quantization → batched strokes
  const WORKER_TRAIL_ALPHA = 0.085;    // peak alpha of a fresh segment
  // w3.9b: with "Spuren-Intensität" raised to 300% a fresh brightest-band
  // stroke peaks ≈ 0.24; this ceiling caps any pathological stack/lit
  // spike so the trail stays trampled-snow, never a white band.
  const WORKER_TRAIL_ALPHA_CEIL = 0.30;
  // Trampled wet snow: cool dark grey-blue ("22, 30, 44" historical),
  // lifted with the rest of the dark style (w3.8j) so established
  // paths survive stream encoding too.
  const WORKER_TRAIL_RGB = liftDarkRGB("22, 30, 44");
  // Remaining dark-style draw-time inks (historical values in the
  // liftDarkRGB calls — w3.8j lift applies uniformly). The pure-black
  // drop shadow stays pure black: it is invisible on the black
  // /output background by definition and only shades the dashboard.
  const WORKER_DARK_INK = {
    coatFallback: liftDarkRGB("15, 19, 27"),
    sledRope: liftDarkRGB("8, 10, 14"),
    sledBox: liftDarkRGB("13, 15, 20"),
    hoodOpening: liftDarkRGB("7, 9, 14"),
    cap: liftDarkRGB("9, 12, 18"),
    bundle: liftDarkRGB("31, 25, 18"),
  };

  // ---- non-compounding trail buffer (Phase 58-w3.9e) ---------------
  // Operator: "Die Schneespuren sollten sich nicht potenzieren wenn
  // mehrere Worker auf denselben Pfaden wandeln." Trails used to be
  // stroked straight onto the main canvas with per-segment alpha, so
  // where multiple figures (or a single figure's repeated cycles)
  // walked the SAME pixels the source-over alpha STACKED — a shared
  // corridor blew out N× brighter/darker than a single pass.
  //
  // Fix: render every trail stroke for this frame onto a dedicated
  // offscreen buffer with a NON-ADDITIVE merge that takes the MAX, not
  // the sum. Standard Porter-Duff 'over' (source- or destination-) all
  // accumulate alpha at low alpha, so we cannot carry the alpha in the
  // alpha channel and still get max. Instead each stroke is drawn
  // OPAQUE GREYSCALE with its per-segment trail alpha encoded in
  // luminance, composited with 'lighten' → each pixel ends up holding
  // the MAX (= freshest) pass's alpha, never the sum. A single CPU
  // pass then converts luminance→alpha and re-tints to style.trailRGB,
  // and the layer is blitted ONCE onto the main canvas with the
  // inherited composite (preserving the w3.43 between-animation
  // 'lighter' lift AND each style's source-over blend + room clip).
  // Result: 1 worker and 10 workers on one corridor read the SAME worn
  // path; distinct paths still render distinct; the 75 s fade survives
  // (per-stroke alpha unchanged); the intensity slider still scales the
  // single-pass prominence (and the alpha ceiling still caps it).
  //
  // willReadFrequently → CPU raster: deterministic across GPUs
  // (dashboard == SSR, no GPU readback variance) and no per-frame
  // GPU→CPU stall. Buffer is grow-only and reused across frames/rooms
  // (NO per-frame allocation); only the room bbox is cleared/read each
  // use. Cost: CPU stroke of the (already cheap) segments + one
  // getImageData/putImageData over the room bbox per worker room/frame.
  function makeWorkerOffscreen(width, height) {
    if (typeof OffscreenCanvas !== "undefined") {
      return new OffscreenCanvas(width, height);
    }
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      const cv = document.createElement("canvas");
      cv.width = width;
      cv.height = height;
      return cv;
    }
    return null;
  }
  let _workerTrailBuf = null;
  let _workerTrailCtx = null;
  function getWorkerTrailBuffer(minW, minH) {
    const needW = Math.max(1, Math.ceil(minW));
    const needH = Math.max(1, Math.ceil(minH));
    if (!_workerTrailBuf) {
      _workerTrailBuf = makeWorkerOffscreen(needW, needH);
      if (!_workerTrailBuf) return null;
      _workerTrailCtx = _workerTrailBuf.getContext("2d", { willReadFrequently: true });
      if (!_workerTrailCtx) { _workerTrailBuf = null; return null; }
    } else if (_workerTrailBuf.width < needW || _workerTrailBuf.height < needH) {
      // Grow only — resizing also clears (we clear the used rect anyway).
      _workerTrailBuf.width = Math.max(_workerTrailBuf.width, needW);
      _workerTrailBuf.height = Math.max(_workerTrailBuf.height, needH);
    }
    return _workerTrailCtx;
  }

  // ---- render styles (Phase 58-w3.8e) ------------------------------
  // "city-workers" vs "city-workers-lit" share the ENTIRE behaviour
  // engine (seeding, anchors, groups, gait, trails geometry, variance
  // traits) — ONLY the painting differs, parametrized by one of these
  // style objects. Rationale: the physical projector maps pure black
  // to zero light and dark tones to faint light, so the near-black
  // silhouettes of the normal variant vanish on the board. The lit
  // style paints the SAME figures in mid-dark desaturated tones with
  // internal contrast (cold top-light, underside shading, lighter
  // head) so they read as humans on the beamer; trails invert from
  // darker-than-snow strokes to faintly LIT trampled paths (clearly
  // dimmer than the additive Snow flakes). The dark style carries the
  // exact historical constants — the normal variant must keep
  // rendering pixel-identical (operator A/B comparison contract).
  const WORKER_STYLE_DARK = {
    lit: false,
    trailRGB: WORKER_TRAIL_RGB,
    trailAlpha: WORKER_TRAIL_ALPHA,
  };
  const WORKER_STYLE_LIT = {
    lit: true,
    // Faint cool grey-white trampled paths: visible on black, well
    // below the Snow inside-animation's flake brightness (flakes run
    // small + high-alpha; this is wide + very low alpha).
    trailRGB: "168, 182, 200",
    trailAlpha: 0.045,
    coats: WORKER_LIT_COATS,
    sledRopeRGB: "70, 76, 88",
    sledBoxRGB: "84, 90, 102",
    bundleRGB: "116, 102, 84",
  };

  // ---- smooth presence envelope (Phase 58-w3.8h) -------------------
  // Operator (top immersion-killer): "Die laufenden Worker
  // verschwinden manchmal plötzlich und tauchen wieder auf". An
  // alpha-trace harness over 3+ full cycles × 4 rooms proved the pure
  // cycle math is jump-free (0 frame-to-frame alpha deltas > 0.1 in
  // ~78k frames); every observed pop came from DISCONTINUOUS INPUTS:
  //   (a) figureCount quantization — nonCriticalDensityScale flips
  //       1↔0.74↔0.54 with the per-frame pressureLevel, and
  //       round(4.5·intensity·countScale·scale) steps by ±1: the
  //       highest-index figure pops in/out at FULL alpha (the
  //       "derselbe Worker" symptom — it is always the same index),
  //   (b) age resets (snapshot/live-sync restarts) teleporting every
  //       figure to a different cycle position.
  // Root fix for (a): figureCount no longer reads the adaptive
  // density scale (see the draw branch) — ≤12 tiny ellipse fills are
  // negligible next to the trail strokes, and a deterministic count
  // also restores cross-client pixel identity under load.
  // Belt-and-suspenders for everything else: this envelope clamps the
  // RENDERED alpha slew of every figure as a final stage — a full
  // fade can never take less than WORKER_PRESENCE_FADE_SEC of WALL
  // time, whatever the cycle math, the count target or the age input
  // do. While a figure's target alpha is 0 but its envelope is still
  // draining, the figure is drawn as a fading ghost at its LAST KNOWN
  // pose (stored on the envelope), so even a hard discontinuity reads
  // as a calm fade-out in place.
  //
  // Determinism note: the envelope is client-local wall-clock
  // smoothing. Natural cycle fades move at ≤ ~0.31 alpha/s (FADE=0.08
  // of an active stretch ≥ ~30 s), well under the slew cap, so in
  // steady state rendered === target on every client and the
  // dashboard/SSR/output pixel-identity contract holds; clients only
  // diverge transiently in the exact windows that previously popped.
  const WORKER_PRESENCE_FADE_SEC = 1.75;            // full 0→1 fade, wall time
  const WORKER_PRESENCE_RATE = 1 / WORKER_PRESENCE_FADE_SEC;
  const WORKER_PRESENCE_ENVELOPES = new Map();      // `${roomKey}::${figIdx}` → env
  const WORKER_PRESENCE_ENVELOPES_MAX = 4096;

  // ---- sub-pixel anti-quantization micro-orbit (Phase 58-w3.8y) ----
  // Operator: SOME walking workers visibly stutter on /output while
  // others trudge smoothly, intermittently, per-figure. Root cause
  // (encoder-A/B + analytic trace, see .planning/debug/phase-58-worker-
  // perfigure-stutter.md): the figure draw path already renders at full
  // sub-pixel float precision — there is NO Math.round on any x/y — but
  // the trudge pace is only ~0.06-0.13 px/frame (≈1 pixel per 10-16
  // frames). A small, low-contrast figure translating that slowly cannot
  // be represented smoothly on the discrete pixel pipeline (8-bit raster
  // → VP9/WebRTC encode → projector grid): its centroid holds a pixel for
  // several frames then snaps a pixel — the per-figure plateau-then-jump
  // stutter. Faster/diagonal figures cross pixel boundaries every frame
  // (smooth); brighter/larger figures (lantern carriers) resolve a finer
  // centroid so their snaps are sub-perceptual (smooth) — that is the
  // brightness correlation. Encoder-A/B proved brightness/edge-feather/
  // luma-breathing do NOT help; only per-frame MOTION MAGNITUDE does.
  //
  // Fix: add a tiny CONSTANT-SPEED circular micro-orbit to each WALKING
  // figure's rendered position. A circle (cos/sin, fixed rate) has no
  // velocity zero-crossing, so the instantaneous per-frame motion stays
  // above the grid-quantization threshold (~0.2 px/frame) on EVERY frame.
  // The orbit AVERAGES TO ZERO over a cycle, so the slow net trudge, the
  // dark/sparse mood, the per-figure variance and — because it is a pure
  // function of (age, seed) — the dashboard==SSR==/output determinism
  // contract are all preserved. Pace-scaled so it eases in/out with the
  // stride (no pop at work→walk) and vanishes while a figure stands/works.
  const WORKER_ANTIQ_RADIUS = 0.16;  // orbit radius as a fraction of figLen
  const WORKER_ANTIQ_HZ = 1.8;       // orbit rate (Hz) — fixed, cadence-independent
  const WORKER_ANTIQ_OMEGA = WORKER_ANTIQ_HZ * Math.PI * 2;
  // Phase 58-w3.9l: the walk-sway knob also scales this anti-quantization
  // micro-orbit DOWN (it is a tiny circular motion the operator may read as
  // part of the swinging), but never below this pixel floor — so the
  // v1.2.48 per-frame motion stays above the /output pixel-grid threshold
  // and slow trudgers don't stutter again. For figures whose base orbit is
  // already sub-pixel (small figLen) the floor caps at the base radius, so
  // the smallest figures — which need the fix most — keep their full orbit.
  const WORKER_ANTIQ_MIN_PX = 0.5;

  function getWorkerPresenceEnvelope(key, nowMs) {
    let env = WORKER_PRESENCE_ENVELOPES.get(key);
    if (!env) {
      if (WORKER_PRESENCE_ENVELOPES.size >= WORKER_PRESENCE_ENVELOPES_MAX) {
        // Bounded safety valve — never hit in practice (rooms × 12).
        WORKER_PRESENCE_ENVELOPES.clear();
      }
      // New envelopes start at 0: a freshly seen figure ALWAYS fades
      // in (covers client load mid-cycle too — strictly smoother).
      env = { alpha: 0, px: 0, py: 0, heading: 0, atMs: nowMs };
      WORKER_PRESENCE_ENVELOPES.set(key, env);
    }
    return env;
  }

  function getWorkerTrailSamples(fig, figIndex, swayMul = 1) {
    // Phase 58-w3.9l: the trampled path follows the (sway-scaled) meander,
    // so the memo is keyed on the sway multiplier (rounded → no float
    // thrash). A live "Gehbewegung" drag re-samples; once committed the
    // value is stable and the cached samples are reused.
    const swayKey = Math.round(swayMul * 100);
    if (fig.trailSamples && fig.trailSamplesSway === swayKey) return fig.trailSamples;
    const activeDur = (1 - fig.hiddenFrac) * fig.cycleDur;
    const count = Math.max(12, Math.min(
      WORKER_TRAIL_MAX_SAMPLES,
      Math.round(activeDur / WORKER_TRAIL_SAMPLE_SEC),
    ));
    const samples = new Array(count + 1);
    for (let j = 0; j <= count; j += 1) {
      const t = fig.hiddenFrac + (j / count) * (1 - fig.hiddenFrac);
      // safeAge=0 is fine: position + fade are pure in t (the safeAge
      // param only shapes workPulse, which trails don't read).
      const pose = workerPoseAt(fig, t, 0, figIndex, swayMul);
      samples[j] = pose
        ? { t, px: pose.px, py: pose.py, fade: pose.fade }
        : { t, px: 0, py: 0, fade: 0 };
    }
    fig.trailSamples = samples;
    fig.trailSamplesSway = swayKey;
    return samples;
  }

  // Resolve a figure's pose for normalized cycle time t (0..1).
  // Returns null while the figure is off-stage; otherwise
  // { px, py, heading, fade, walking, workPulse } in unit-disc
  // coordinates (caller scales by room half-extents).
  function workerPoseAt(fig, t, safeAge, figIndex, swayMul = 1) {
    if (t < fig.hiddenFrac) return null;
    const u = (t - fig.hiddenFrac) / (1 - fig.hiddenFrac); // active progress 0..1
    // Smooth fade in/out at the cycle boundaries (no popping).
    const FADE = 0.08;
    const fade = u < FADE ? u / FADE : u > 1 - FADE ? (1 - u) / FADE : 1;
    const anchors = fig.anchors;
    const legs = anchors.length - 1;
    // Segment layout across active time: work0,walk0,work1,walk1,…workN.
    // w3.8b: the walk-time budget is split by LEG LENGTH (legShares),
    // not equally — uniform trudge speed across short and long legs.
    const workSeg = (1 - fig.walkShare) / anchors.length;
    let rem = u;
    for (let k = 0; k < anchors.length; k += 1) {
      // WORK at anchor k
      if (rem < workSeg) {
        const a = anchors[k];
        const toward = anchors[Math.min(k + 1, anchors.length - 1)];
        const from = anchors[Math.max(k - 1, 0)];
        const dirX = k < anchors.length - 1 ? toward[0] - a[0] : a[0] - from[0];
        const dirY = k < anchors.length - 1 ? toward[1] - a[1] : a[1] - from[1];
        const heading = Math.atan2(dirY, dirX);
        // Rhythmic tool motion: biased half-sine so it reads as a
        // repeated "strike/shovel" lean rather than a symmetric wiggle.
        const strike = Math.sin(safeAge * Math.PI * 2 * fig.workFreq + figIndex * 1.7);
        const workPulse = Math.max(0, strike) * Math.max(0, strike);
        return { px: a[0], py: a[1], heading, fade, walking: false, workPulse };
      }
      rem -= workSeg;
      if (k >= legs) break;
      // WALK leg k -> k+1 — curved, pace-varied path (w3.7z). Heading
      // follows the meander tangent (sampled numerically) so the body
      // gently corrects course along the curve instead of pointing
      // rigidly at the destination; `pace` (normalized stride speed,
      // ~1 = average leg speed) feeds the step-bob amplitude in the
      // draw branch so the figure settles when easing into a stop.
      const walkSeg = fig.walkShare * (fig.legShares?.[k] ?? 1 / legs);
      if (rem < walkSeg) {
        const p = rem / walkSeg;
        const a = anchors[k];
        const b = anchors[k + 1];
        const pt = workerWalkPoint(fig, a, b, p, swayMul);
        const EPS = 0.015;
        const ahead = workerWalkPoint(fig, a, b, Math.min(1, p + EPS), swayMul);
        const ddx = ahead[0] - pt[0];
        const ddy = ahead[1] - pt[1];
        const stepLen = Math.hypot(ddx, ddy);
        const legLen = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-4;
        // During a hesitation stall the tangent degenerates — fall
        // back to the leg direction instead of atan2(0,0) snapping.
        const heading = stepLen > legLen * EPS * 0.2
          ? Math.atan2(ddy, ddx)
          : Math.atan2(b[1] - a[1], b[0] - a[0]);
        const pace = Math.min(1.8, stepLen / (legLen * EPS));
        return { px: pt[0], py: pt[1], heading, fade, walking: true, workPulse: 0, pace };
      }
      rem -= walkSeg;
    }
    // Numeric edge (u === 1): hold the last anchor.
    const last = anchors[anchors.length - 1];
    return { px: last[0], py: last[1], heading: 0, fade, walking: false, workPulse: 0 };
  }

  // Shared gate function for the hull-flicker coded effect.
  // Deterministic in (age, speed, intensity); matches the exact timeline
  // math that used to live inline in the hull-flicker draw branch.
  // Consumers read `isOnPeriod` to know whether the lamp is currently lit.
  function computeHullFlickerGate(age, speed = 1, intensity = 1) {
    const effectiveAge = Number.isFinite(age) ? age * (Number.isFinite(speed) && speed > 0 ? speed : 1) : 0;
    const safeIntensity = Number.isFinite(intensity) ? intensity : 1;
    const timeline = effectiveAge * (1.6 + safeIntensity * 0.5);
    const step = Math.floor(timeline * 6);
    const gate = ctx.flickerNoise(step * 0.08 + 3.9);
    const isOnPeriod = gate > 0.72;
    let flickerIntensity = 0;
    if (isOnPeriod) {
      const baseFlicker = (ctx.flickerNoise(step * 0.22 + 7.4) * 0.55 +
        ctx.flickerNoise(step * 0.55 + 15.2) * 0.35 +
        ctx.flickerNoise(step * 1.1 + 28.6) * 0.1);
      flickerIntensity = (0.4 + baseFlicker * 0.6) * safeIntensity;
    }
    return { isOnPeriod, flickerIntensity, step, gate };
  }

  function isHullFlickerLampOff(age, speed = 1, intensity = 1) {
    return !computeHullFlickerGate(age, speed, intensity).isOnPeriod;
  }

  // Shared gate for the power-outage coded effect. Mirrors the
  // flashNoise threshold used inside the power-outage draw branch
  // (Math.abs(sin*sin) > 0.78 == "brief blue flash"). For
  // breaksSolidColor coupling we treat those flash moments as the
  // ON period — solid-color renders briefly when the flash fires
  // and is gated dark the rest of the time, so a solid-color room
  // visibly behaves like the power is mostly out with intermittent
  // recoveries.
  function computePowerOutageGate(age, speed = 1, intensity = 1) {
    const effectiveAge = Number.isFinite(age) ? age * (Number.isFinite(speed) && speed > 0 ? speed : 1) : 0;
    const flashNoise = Math.abs(Math.sin(effectiveAge * 53.7) * Math.sin(effectiveAge * 71.3));
    const isOnPeriod = flashNoise > 0.78;
    return { isOnPeriod, flashNoise };
  }

  function isPowerOutageLampOff(age, speed = 1, intensity = 1) {
    return !computePowerOutageGate(age, speed, intensity).isOnPeriod;
  }

  function drawEffectVisual(type, age, intensity, room, roomMetrics = null, options = {}) {
    const canvas = ctx.canvas;
    const c = ctx.canvasCtx;
    const w = canvas.width;
    const h = canvas.height;
    const roomCenter = room ? ctx.getRoomLabelPosition(room, ctx.state.boardId) : { x: 0.5, y: 0.5 };
    const roomX = roomMetrics?.centerX ?? roomCenter.x * w;
    const roomY = roomMetrics?.centerY ?? roomCenter.y * h;
    const roomRadius = roomMetrics?.radius ?? room?.radius * Math.min(w, h) ?? Math.min(w, h) * 0.08;
    const roomWidth = roomMetrics?.width ?? roomRadius * 2;
    const roomHeight = roomMetrics?.height ?? roomRadius * 2;
    const roomMinX = roomMetrics?.minX ?? roomX - roomWidth / 2;
    const roomMinY = roomMetrics?.minY ?? roomY - roomHeight / 2;
    const visualCaps = ctx.getRuntimeVisualCaps();

    if (type === "outside-space") {
      const immersive = options.outsideMode === "immersive";
      const speedInfluence = ctx.clampOutsideSpeed(options.outsideSpeed ?? 1);
      const speedFactor = (immersive ? 1.45 : 1) * (0.75 + speedInfluence * 0.45);
      const directionMultiplier = options.outsideDirection === "reverse" ? -1 : 1;

      c.fillStyle = "rgba(0, 0, 0, 1)";
      c.fillRect(0, 0, w, h);

      const parallaxLayers = immersive
        ? [
          { density: 46, speed: 190, size: 0.9, alpha: 0.16, wave: 0.008 },
          { density: 66, speed: 310, size: 1.2, alpha: 0.26, wave: 0.011 },
          { density: 82, speed: 470, size: 1.6, alpha: 0.38, wave: 0.014 },
          { density: 98, speed: 660, size: 2, alpha: 0.52, wave: 0.017 },
        ]
        : [
          { density: 32, speed: 130, size: 0.85, alpha: 0.14, wave: 0.006 },
          { density: 50, speed: 230, size: 1.1, alpha: 0.22, wave: 0.009 },
          { density: 68, speed: 360, size: 1.45, alpha: 0.32, wave: 0.012 },
        ];

      for (let layerIndex = 0; layerIndex < parallaxLayers.length; layerIndex += 1) {
        const layer = parallaxLayers[layerIndex];
        const starCount = Math.max(
          16,
          Math.min(
            visualCaps.outsideStarsPerLayer,
            Math.round(layer.density * intensity * visualCaps.nonCriticalDensityScale),
          ),
        );
        const layerSpeed = layer.speed * (0.8 + intensity * 0.75) * speedFactor;
        const layerWave = h * layer.wave;

        for (let i = 0; i < starCount; i += 1) {
          const seedX = ((i * 97.173 + layerIndex * 31.7) % 1000) / 1000;
          const seedY = ((i * 57.913 + layerIndex * 79.1) % 1000) / 1000;
          const progressRaw = (seedX * (w + 8) - age * layerSpeed * directionMultiplier) % (w + 8);
          const x = progressRaw < 0 ? progressRaw + w + 8 : progressRaw;
          const y = seedY * h + Math.sin(age * 0.35 + i * 0.07 + layerIndex) * layerWave;
          const twinkle = (Math.sin(age * (2 + layerIndex * 0.7) + i * 0.9) + 1) / 2;
          const alpha = Math.min(0.95, layer.alpha * (0.8 + intensity * 0.7) * (0.75 + twinkle * 0.45));
          const size = layer.size * (0.8 + (((i * 19.9) % 100) / 100) * 0.7);
          const streakLength =
            (3.5 + layerIndex * 3.2 + speedInfluence * 4.2 + intensity * 2.8) * (immersive ? 1.25 : 1);
          const streakWidth = Math.max(0.8, size * (0.65 + layerIndex * 0.08));

          c.strokeStyle = `rgba(232, 238, 255, ${Math.min(0.9, alpha * 0.72)})`;
          c.lineWidth = streakWidth;
          c.beginPath();
          c.moveTo(x + streakLength * directionMultiplier, y);
          c.lineTo(x, y);
          c.stroke();

          c.fillStyle = `rgba(245, 248, 255, ${alpha})`;
          c.fillRect(x, y, size, size);
        }
      }

      const expressLanes = Math.max(
        4,
        Math.min(22, Math.round((immersive ? 14 : 9) * intensity * visualCaps.nonCriticalDensityScale)),
      );
      for (let i = 0; i < expressLanes; i += 1) {
        const laneY = (((i * 63.17) % 1000) / 1000) * h;
        const pulse = ((age * (0.82 + i * 0.045)) % 1) * (w + 210);
        const laneLength = 140 + speedInfluence * 55 + intensity * 70;
        const laneAlpha = (0.04 + ((Math.sin(age * 4.6 + i) + 1) / 2) * 0.15) * (immersive ? 1.2 : 0.92);
        c.strokeStyle = `rgba(224, 233, 255, ${Math.min(0.48, laneAlpha)})`;
        c.lineWidth = 0.8 + ((i % 3) + 1) * 0.38;
        c.beginPath();
        const laneHeadX = directionMultiplier > 0 ? w - pulse : pulse;
        c.moveTo(laneHeadX + laneLength * directionMultiplier, laneY);
        c.lineTo(laneHeadX, laneY);
        c.stroke();
      }
      return;
    }

    if (type === "hull-flicker") {
      const { isOnPeriod, flickerIntensity } = computeHullFlickerGate(age, 1, intensity);

      const dipAlpha = isOnPeriod && flickerIntensity < 0.35 ? (0.35 - flickerIntensity) * 0.5 * intensity : 0;
      c.fillStyle = `rgba(0, 0, 0, ${Math.min(0.3, dipAlpha)})`;
      c.fillRect(0, 0, w, h);

      const tubeColor = "240, 235, 190";
      const overlayAlpha = Math.min(0.4, flickerIntensity);
      if (overlayAlpha > 0.015 && isOnPeriod) {
        c.fillStyle = `rgba(${tubeColor}, ${overlayAlpha})`;
        c.fillRect(0, 0, w, h);
      }

      return;
    }

    if (type === "intruder-alert") {
      const pulse = (Math.sin(age * 9) + 1) / 2;
      c.fillStyle = `rgba(255, 45, 45, ${(0.1 + pulse * 0.24) * intensity})`;
      c.fillRect(0, 0, w, h);
      return;
    }

    if (type === "power-outage") {
      const pulse = (Math.sin(age * 20) + 1) / 2;
      const alpha = 0.76 + pulse * 0.2;
      c.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      c.fillRect(0, 0, w, h);

      // Blue flash used to be `Math.random() > 0.88`, which fires at
      // a fixed ~12% per frame regardless of `age` — so the speed
      // slider had no visible effect (BACKLOG #10). Replace with a
      // deterministic age-driven noise: two incommensurate sine waves
      // multiplied to mimic randomness. Because `age` is already scaled
      // by the animation's speed (see drawInsideGlobalVisual /
      // drawRoomCodedVisual), the flash cadence now scales with speed.
      const flashNoise = Math.abs(Math.sin(age * 53.7) * Math.sin(age * 71.3));
      if (flashNoise > 0.78) {
        c.fillStyle = `rgba(122, 182, 255, ${0.15 * intensity})`;
        c.fillRect(0, 0, w, h);
      }
      return;
    }

    if (type === "special-slime") {
      const densityFactor = Number(options.densityFactor) || 1;
      const bands = Math.max(3, Math.round(9 * intensity * densityFactor * visualCaps.nonCriticalDensityScale));
      for (let i = 0; i < bands; i += 1) {
        const wave = Math.sin(age * 1.8 + i * 0.9);
        const y = roomMinY + roomHeight * (0.14 + (i / Math.max(1, bands - 1)) * 0.72);
        const thickness = Math.max(4, roomHeight * 0.06);
        const startX = roomMinX - roomWidth * 0.15;
        const endX = roomMinX + roomWidth * 1.15;
        const gradient = c.createLinearGradient(startX, y, endX, y + thickness);
        gradient.addColorStop(0, `rgba(58, 255, 162, ${(0.08 + i * 0.01) * intensity})`);
        gradient.addColorStop(0.5, `rgba(132, 255, 196, ${(0.2 + wave * 0.06) * intensity})`);
        gradient.addColorStop(1, `rgba(41, 149, 92, ${(0.12 + i * 0.015) * intensity})`);
        c.fillStyle = gradient;
        c.beginPath();
        c.moveTo(startX, y + Math.sin(age + i) * 6);
        c.bezierCurveTo(
          roomX - roomWidth * 0.35,
          y + wave * 14,
          roomX + roomWidth * 0.3,
          y - wave * 12,
          endX,
          y + Math.cos(age * 1.2 + i) * 6,
        );
        c.lineTo(endX, y + thickness);
        c.lineTo(startX, y + thickness);
        c.closePath();
        c.fill();
      }
      return;
    }

    if (type === "solid-color") {
      const hex = typeof options.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(options.colorHex)
        ? options.colorHex
        : "#ff0000";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      // Solid-color used to ignore `opacity` entirely and
      // squeezed brightness into `intensity * 0.8`, so the Live Editor's
      // opacity slider did nothing and intensity only shifted alpha by a
      // narrow fixed factor. Now both sliders modulate the fill alpha
      // directly (opacity × intensity, clamped to [0,1]) — same mental
      // model the user has for gif/mp4 rooms.
      const opacityOption = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1;
      const intensitySafe = Number.isFinite(intensity) ? intensity : 1;
      const alpha = Math.max(0, Math.min(1, opacityOption * intensitySafe));
      // clearRect-then-fillRect achieves the same "destination is
      // replaced, not blended" behaviour as `globalCompositeOperation
      // = "copy"` (Phase 25-h3) without paying the per-call backing-
      // store snapshot that made "copy" cost ~5-30 ms/room on Pi
      // /output/ and collapsed perf to single-digit fps when many
      // rooms ran solid-color simultaneously.
      //
      // Why it works:
      // - clearRect respects the clip: only pixels inside this room's
      //   polygon are wiped to transparent. Whatever a previously-
      //   drawn solid-color room wrote into the same pixels (overlap
      //   area, sub-pixel polygon overlap, etc.) is removed before we
      //   paint our own colour, so two adjacent rooms with the same
      //   semi-transparent colour no longer alpha-stack to a brighter
      //   tone at their shared edge.
      // - fillRect with default source-over composite then paints the
      //   solid colour onto a freshly-cleared region. Equivalent to
      //   `copy` for the in-clip pixels, with a small AA-edge dimming
      //   instead of an AA-edge halo (perceptually milder than the
      //   brightness bump).
      // - Both ops are GPU primitives — no composite-mode change
      //   means no canvas-state-machine round trip on each call.
      // - Skip the clearRect when the outer composite is "lighter"
      //   (same-room ≥2-anims path, Phase 12-1) — that path is
      //   *intentionally* additive and the clear would defeat it.
      const skipClear = c.globalCompositeOperation === "lighter";
      if (skipClear) {
        // Phase 12-1 additive composite — banding doesn't show in this
        // path (the destination buffer is mostly black; small alpha
        // increments add discrete brightness levels but the human eye
        // doesn't perceive them as bands). Keep the existing fillRect.
        c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);
      } else {
        // Phase 35 D-03-C1 (Track C, iter2 hotfix h3): replace the
        // 8-bit-per-channel alpha-blend that produced operator-visible
        // Mach-band steps ("Streifen") with per-pixel Bayer-4×4-dithered
        // pixels — but composited via `c.drawImage(canvas, ...)` instead
        // of `c.putImageData(imageData, ...)`. Reason for the iter2
        // change: putImageData IGNORES the canvas clip path (it writes
        // raw pixels to the destination buffer, bypassing the polygon
        // clip the caller sets up via c.clip()). Phase 35 close shipped
        // putImageData and the operator reported solid-color animations
        // flooding the bounding RECTANGLE of the room instead of the
        // room polygon shape. drawImage respects the clip, so the
        // dithered pixels are clipped to the polygon as before.
        //
        // Helper is the IIFE-published window.TT_BEAMER_RUNTIME_EFFECT_DITHER
        // (loaded as ES module before this script in index.html); accessed
        // lazily so the IIFE parse doesn't depend on module load order.
        c.clearRect(roomMinX, roomMinY, roomWidth, roomHeight);
        const dither = window.TT_BEAMER_RUNTIME_EFFECT_DITHER;
        const ditherWidth = Math.max(1, Math.round(roomWidth));
        const ditherHeight = Math.max(1, Math.round(roomHeight));
        const ditherCanvas = (dither && typeof dither.getDitheredSolidColorCanvas === "function")
          ? dither.getDitheredSolidColorCanvas({ hex, alpha, width: ditherWidth, height: ditherHeight })
          : null;
        if (ditherCanvas) {
          c.drawImage(
            ditherCanvas,
            Math.round(roomMinX),
            Math.round(roomMinY),
            ditherWidth,
            ditherHeight,
          );
        } else {
          // Defensive fallback to the pre-Phase-35 fillRect path so a
          // missing dither module never blanks the room. Logged once
          // so misconfiguration surfaces in the console without
          // spamming the render loop.
          if (!window.__ttbDitherWarned) {
            window.__ttbDitherWarned = true;
            console.warn(
              "[runtime-effect-visuals] Bayer dither canvas helper unavailable — falling back to fillRect (banding may return)",
            );
          }
          c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);
        }
      }
      return;
    }

    if (type === "heat" || type === "generator-heat") {
      // Phase 58-w3.7w (as "generator-heat"), renamed to "heat" in
      // Phase 58-w3.7x. "generator-heat" is kept as a BACKWARD-COMPAT
      // ALIAS here AND in normalizeRoomCodedAssetRef (runtime-asset-
      // refs.js) so definitions saved before the rename keep
      // rendering — the live-preview path passes the raw assetRef
      // straight into this dispatcher, hence the double type check.
      //
      // Frostpunk generator warmth. One layer, deterministic in
      // `age` (caller pre-scales age by the animation's speed, so the
      // speed slider drives pulse cadence automatically):
      //   1. breathing radial glow from the room centroid (ALWAYS
      //      paints — SSR trap: a frame that paints nothing strobes
      //      black in the encoded stream).
      // (Phase 58-w3.7x: layer 3 — rising ember particles — removed
      // on operator feedback: the "bubbles" broke immersion.
      // Phase 58-w3.8f: layer 2 — wavy heat-shimmer strips — removed
      // on operator feedback: "Entferne diese Streifen die von oben
      // nach unten gehen, die mag ich nicht".)
      // The caller has already clipped the canvas to the room polygon
      // (clipToRoom) — everything below may overdraw the bounding box
      // freely; the clip cuts it to the polygon shape.
      const opacityOption = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1;
      const intensitySafe = Number.isFinite(intensity) ? intensity : 1;
      const overall = Math.max(0, Math.min(1, opacityOption));
      const safeAge = Number.isFinite(age) ? Math.max(0, age) : 0;
      const hex = typeof options.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(options.colorHex)
        ? options.colorHex
        : "#ff7a1a"; // default ember orange
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      // Hot core reads brighter than the tint.
      const coreR = Math.round(r + (255 - r) * 0.55);
      const coreG = Math.round(g + (255 - g) * 0.45);
      const coreB = Math.round(b + (255 - b) * 0.30);

      // Layer 1 — radial glow, breathing at ~0.24 Hz (speed-scaled via
      // age). Two incommensurate sines so the pulse breathes instead
      // of ticking like a metronome.
      //
      // Phase 58-w3.8x — optional irregular pulse. When ON, the carrier
      // phase is WARPED by a sum of slow incommensurate sines so the
      // instantaneous breathing period wanders (long, then short, then
      // long) — it reads as random but stays a PURE analytic function of
      // `safeAge`, so dashboard / /output / SSR render identically. The
      // warp constants are fixed (a "seed" shared by all clients), NOT
      // per-instance: two heat rooms look independent purely because
      // their ages differ (exactly like the regular pulse), while a
      // hidden-source room that borrows its SOURCE's age via
      // heatSyncNearestSource evaluates the identical curve and stays in
      // lockstep even when irregular. Default OFF = the regular pulse,
      // byte-identical to before.
      const pulse = options.heatIrregularPulse === true
        ? Math.sin(
            safeAge * Math.PI * 2 * 0.17
            + Math.sin(safeAge * 0.213 + 0.0) * 1.7
            + Math.sin(safeAge * 0.067 + 2.3) * 2.6
            + Math.sin(safeAge * 0.031 + 5.1) * 3.4,
          )
        : Math.sin(safeAge * Math.PI * 2 * 0.24) * 0.72
          + Math.sin(safeAge * Math.PI * 2 * 0.113 + 1.7) * 0.28; // -1..1
      const baseRadius = Math.max(12, Math.hypot(roomWidth, roomHeight) * 0.52);

      // Phase 58-w3.8g — heat-source visibility option. Default ON
      // (undefined → ON: instances saved before the field rode the
      // factory default true anyway).
      if (options.heatShowSource === false) {
        // Source OFF — ambient warm field only: no bright central
        // core, no hot spot. A near-flat fill whose ALPHA breathes
        // with the same pulse curve as the visible-source look, plus
        // a very shallow edge falloff (inner radius starts at 60% so
        // the centre is a uniform plateau — nothing reads as a
        // source). Alpha floor keeps this branch painting SOMETHING
        // every tick (SSR black-strobe trap).
        const ambientAlpha = Math.max(0.02, Math.min(0.6, (0.26 + pulse * 0.13) * intensitySafe * overall));
        const ambient = c.createRadialGradient(
          roomX, roomY, Math.max(2, baseRadius * 0.6),
          roomX, roomY, baseRadius * 1.25,
        );
        ambient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${ambientAlpha})`);
        ambient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${ambientAlpha * 0.55})`);
        c.fillStyle = ambient;
        c.fillRect(roomMinX - roomWidth * 0.25, roomMinY - roomHeight * 0.25, roomWidth * 1.5, roomHeight * 1.5);
        return;
      }

      const glowRadius = baseRadius * (1 + pulse * 0.15);
      // Alpha floor keeps this branch painting SOMETHING every tick
      // even at extreme knob values (SSR black-strobe trap).
      const glowAlpha = Math.max(0.02, Math.min(0.85, (0.36 + pulse * 0.12) * intensitySafe * overall));
      const gradient = c.createRadialGradient(
        roomX, roomY, Math.max(2, glowRadius * 0.05),
        roomX, roomY, glowRadius,
      );
      gradient.addColorStop(0, `rgba(${coreR}, ${coreG}, ${coreB}, ${Math.min(0.9, glowAlpha * 1.45)})`);
      gradient.addColorStop(0.14, `rgba(${coreR}, ${coreG}, ${coreB}, ${glowAlpha})`);
      gradient.addColorStop(0.32, `rgba(${r}, ${g}, ${b}, ${glowAlpha * 0.62})`);
      gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${glowAlpha * 0.22})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      c.fillStyle = gradient;
      c.fillRect(roomMinX - roomWidth * 0.25, roomMinY - roomHeight * 0.25, roomWidth * 1.5, roomHeight * 1.5);
      return;
    }

    if (type === "snow") {
      // Phase 58-w3.9m — coded snow: a decode-free replacement for the
      // snow.mp4 / snowstorm.mp4 clips (which hitch on the Pi because the
      // big mp4 stalls the decoder). A seeded particle field: every
      // flake's position is a PURE function of (safeAge, index, seeded
      // hash) — no per-frame Math.random — so dashboard, /output and the
      // SSR encoder render byte-identically (determinism trap) and the
      // branch ALWAYS paints something (SSR black-strobe trap).
      //
      // The caller has already clipped the canvas to the region polygon
      // (room polygon / inside-ship / outside), so we may overdraw the
      // bounding box freely; the clip cuts flakes to the region shape.
      //
      // Controls (operator spec 2026-06-08): "Dichte" (snowDensity, flake
      // count), "Geschwindigkeit" (snowSpeed, swirl/drift rate) and "Sturm"
      // (snowStorm, bool). Calm approximates snow.mp4: small white-ish dots
      // that drift mostly downward but WANDER/swirl (no rigid straight fall).
      // Storm matches snowstorm.mp4: denser, faster, multi-directional
      // turbulence — gusts whose direction rotates + motion-streaked flakes
      // pointing every which way (operator 2026-06-27: not one fall
      // direction, "wirbeln wild durch die Gegend"). See the swirl model
      // (w3.9n) below for how drift + gust + per-flake Lissajous combine.
      const opacityOption = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1;
      const overall = Math.max(0, Math.min(1, opacityOption));
      const intensitySafe = Number.isFinite(intensity) ? intensity : 1;
      const safeAge = Number.isFinite(age) ? Math.max(0, age) : 0;
      const densityFactor = Number(options.densityFactor) || 1;
      const storm = options.snowStorm === true;
      const densityKnob = Math.max(0, Math.min(1,
        (Number.isFinite(Number(options.snowDensity)) ? Number(options.snowDensity) : 55) / 100));
      const speedKnob = Math.max(0, Math.min(1,
        (Number.isFinite(Number(options.snowSpeed)) ? Number(options.snowSpeed) : 50) / 100));
      // Phase 58-w3.9s: mean flake size knob (0–100, default 50). Maps to a
      // size multiplier where 50 → 1.0; scales BOTH the mean and the per-
      // flake variance, so the whole field grows/shrinks around its mean.
      const sizeKnob = Math.max(0, Math.min(100,
        Number.isFinite(Number(options.snowFlakeSize)) ? Number(options.snowFlakeSize) : 50));
      const sizeMul = sizeKnob / 50;

      // Region bounds (bounding box of the clipped polygon).
      const regX = roomMinX;
      const regY = roomMinY;
      const regW = Math.max(1, roomWidth);
      const regH = Math.max(1, roomHeight);
      const unit = Math.min(regW, regH); // size reference, region-relative

      // Flake count. Calm default (~55 %) lands near the snow.mp4 density;
      // storm roughly doubles it. Capped by the non-critical density scale
      // (Pi / low-power throttle) so a dense storm never tanks fps.
      const stormCountMul = storm ? 1.9 : 1;
      // Calm default (~55 %) lands near snow.mp4's fine, dense flurry.
      const rawCount = 230 * (0.2 + densityKnob * 1.55) * stormCountMul
        * densityFactor * visualCaps.nonCriticalDensityScale;
      const count = Math.max(0, Math.min(1400, Math.round(rawCount)));

      // Snow motion model. All positions are PURE functions of (safeAge,
      // index, seed) — deterministic (dashboard == /output == SSR), always
      // painting (no black-strobe). The two modes differ fundamentally:
      //
      //   CALM  — gentle near-vertical drift + a slow graceful per-flake
      //           swirl + a soft whole-field sway. Flakes drift mostly down
      //           and wander a little (operator 2026-06-27: "wirbeln" but
      //           not wild). Drawn as a depth-of-field mix of dots + bokeh.
      //   STORM — layered COHERENT wind (w3.9r). Real wind-blown snow is
      //           advected: every flake in a depth layer shares one wind
      //           sheet, so the whole layer moves the SAME way; the wind
      //           surges and turns over time (gusts) but pushes its snow
      //           together. A few layers carry similar-but-different winds
      //           (shear/parallax). See the layerWind precompute below.
      const TAU = Math.PI * 2;
      const tw = safeAge;

      // Whole-field gust: a bounded offset (px) whose direction rotates.
      // The storm has a PREVAILING wind that shifts over time (wind-driven
      // turbulence — not omnidirectional confetti), so the swing is moderate.
      const gustMag = unit * (storm ? 0.18 : 0.05) * (0.5 + speedKnob);
      const gustAng = (Math.PI * 0.5)
        + Math.sin(tw * 0.19) * (storm ? 0.95 : 0.30)
        + Math.sin(tw * 0.43) * (storm ? 0.40 : 0.10);
      const gustPulse = 0.65 + 0.35 * Math.sin(tw * 0.31);
      const gustDirX = Math.cos(gustAng);
      const gustDirY = Math.sin(gustAng);
      const gustX = gustDirX * gustMag * gustPulse;
      const gustY = gustDirY * gustMag * gustPulse;

      const prevComposite = c.globalCompositeOperation;
      // White-ish flakes read best additively on black AND survive the
      // v1.2.43 concurrency lift: set "lighter", restore prevComposite
      // after — if an outer concurrent scope already set "lighter", the
      // restore keeps it lifted (never downgrades a concurrent composite).
      c.globalCompositeOperation = "lighter";
      const prevCap = c.lineCap;
      c.lineCap = "round"; // soft streak ends (motion blur, not hard sticks)

      // Phase 58-w3.9q — soft bokeh blob for OUT-OF-FOCUS flakes. The
      // reference clips (snow_1080 / snowstorm) are full of big, soft, dim
      // foreground flakes thrown out of focus by the camera's depth of
      // field — that size+softness spread is what reads as real snow rather
      // than a flat field of identical dots (operator 2026-06-27: calm "zu
      // sehr nach Punkten"). A radial gradient gives the soft falloff; only
      // the ~15 % OOF flakes use it, so the per-frame gradient count stays
      // modest (Pi budget).
      if (!snowBlobSprite) {
        // Build the soft radial blob ONCE into a 64px offscreen canvas.
        const S = 64;
        const off = (typeof document !== "undefined" && document.createElement)
          ? document.createElement("canvas")
          : null;
        if (off) {
          off.width = S;
          off.height = S;
          const oc = off.getContext("2d");
          const g = oc.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
          g.addColorStop(0, "rgba(238, 244, 255, 1)");
          g.addColorStop(0.45, "rgba(236, 243, 255, 0.4)");
          g.addColorStop(1, "rgba(236, 243, 255, 0)");
          oc.fillStyle = g;
          oc.beginPath();
          oc.arc(S / 2, S / 2, S / 2, 0, TAU);
          oc.fill();
          snowBlobSprite = off;
        }
      }
      // Phase 58-w3.9t — ALLOCATION-FREE drawing. Per-flake `rgba(…,${a})`
      // template strings (built for every flake every frame — hundreds to
      // ~1400 at density 100) churned the GC, which stalled /output: small
      // flakes froze ~0.5 s then jumped (operator 2026-06-28). All flake
      // opacity now rides c.globalAlpha (a number, no allocation); colours
      // are constant string literals (interned, not allocated). fillStyle is
      // set ONCE here (only streaks change strokeStyle); globalAlpha is reset
      // to 1 after the loop.
      const COL_TAIL = "rgb(228, 237, 255)";
      const COL_CORE = "rgb(240, 246, 255)";
      c.fillStyle = "rgb(237, 243, 255)";
      // Blit the cached blob sprite at the flake's size, modulating opacity
      // via globalAlpha (cheap GPU blit vs a per-flake gradient build).
      const softBlob = (x, y, r, a) => {
        if (!snowBlobSprite) return;
        c.globalAlpha = a < 0 ? 0 : (a > 1 ? 1 : a);
        c.drawImage(snowBlobSprite, x - r, y - r, r * 2, r * 2);
      };
      // Cheap soft-edged dot — a dim wide disc + a brighter core (additive
      // blend softens it). No string/style allocation: constant fillStyle +
      // globalAlpha for opacity.
      const softDot = (x, y, r, a) => {
        c.globalAlpha = a * 0.5;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
        c.globalAlpha = a;
        c.beginPath();
        c.arc(x, y, r * 0.5, 0, TAU);
        c.fill();
      };

      // Phase 58-w3.9r — layered COHERENT wind for the storm. Real wind-blown
      // snow is advected: every flake moves together with the wind, which
      // surges and can turn quickly but pushes the whole field the SAME way
      // (operator 2026-06-28: "windstöße die durch das schnee fährt … der
      // wind kann sich auch schnell drehen beeinflusst aber den schnee in die
      // selbe richtung"). A few depth LAYERS each carry a coherent wind sheet
      // with a similar-but-different mean direction (wind shear → parallax;
      // "verschiedene layer … von verschiedenen aber ähnlichen Richtungen").
      // Each layer's wind = a constant mean + summed oscillating gust
      // components (slow swells + a faster quick-turn term); because those
      // are integrable, the layer's shared DISPLACEMENT is the closed-form
      // integral, so the whole sheet drifts together at no per-flake cost.
      // Amplitudes are moderate so gusts feel natural, not extreme. Fully
      // deterministic (no per-frame random).
      const layerWind = [];
      if (storm) {
        const STORM_LAYERS = 3;
        const vBase = unit * (0.085 + speedKnob * 0.14);
        const prevAng = Math.PI * 0.52; // prevailing wind: just right-of-down
        // [amp, omega]: slow swell, mid, fast quick-turn.
        const COMPS = [[0.42, 0.16], [0.24, 0.39], [0.15, 0.83]];
        for (let L = 0; L < STORM_LAYERS; L += 1) {
          const meanAng = prevAng + (L - 1) * 0.23; // layers fan ±~13°
          const cm = Math.cos(meanAng);
          const sm = Math.sin(meanAng);
          let wx = cm;
          let wy = sm;
          let dx = cm * tw;
          let dy = sm * tw;
          for (let k = 0; k < COMPS.length; k += 1) {
            const a = COMPS[k][0];
            const w = COMPS[k][1];
            const phx = L * 2.1 + k * 0.9;
            const phy = phx + 1.4; // quadrature → the wind vector rotates/turns
            wx += a * Math.cos(w * tw + phx);
            wy += a * Math.cos(w * tw + phy);
            dx += (a / w) * Math.sin(w * tw + phx);
            dy += (a / w) * Math.sin(w * tw + phy);
          }
          const speed = Math.hypot(wx, wy) || 1;
          layerWind.push({
            ux: wx / speed,
            uy: wy / speed,
            dx: vBase * dx,
            dy: vBase * dy,
            speedFrac: Math.min(1.8, speed), // ~wind speed in units of the mean (≈1)
          });
        }
      }

      const fract = (n) => n - Math.floor(n);
      for (let i = 0; i < count; i += 1) {
        // Per-flake seeded hashes — fixed per index, so each flake keeps a
        // stable size / speed / lane / swirl across frames (deterministic).
        const h1 = fract(Math.sin((i + 1) * 12.9898) * 43758.5453); // x lane
        const h2 = fract(Math.sin((i + 1) * 78.2330) * 24634.6345); // y lane
        const h3 = fract(Math.sin((i + 1) * 39.4250) * 51294.1234); // size
        const h4 = fract(Math.sin((i + 1) * 93.9890) * 19349.7654); // speed var
        const h5 = fract(Math.sin((i + 1) * 27.1719) * 33285.9128); // swirl/dir A
        const h6 = fract(Math.sin((i + 1) * 57.7777) * 71234.5544); // swirl/dir B
        const h7 = fract(Math.sin((i + 1) * 15.1234) * 61237.2199); // focus (DOF)

        // Depth-of-field per flake (w3.9q). ~15 % are OUT-OF-FOCUS: big,
        // soft, dim foreground bokeh. The rest are sharp-ish, with a wide
        // size + brightness spread (square the size hash to bias small).
        const sizeHash = h3 * h3;
        const oof = h7 < (storm ? 0.13 : 0.16);
        let size;
        let alphaBase;
        if (oof) {
          // Base sizes reduced (operator 2026-06-28: flakes too big) then
          // scaled by the mean-size knob; the variance term scales too.
          size = unit * (0.0040 + h3 * (storm ? 0.0070 : 0.0100)) * sizeMul;
          alphaBase = 0.07 + h2 * 0.13;
        } else {
          size = Math.max(0.6, unit * (0.0009 + sizeHash * (storm ? 0.0034 : 0.0040)) * sizeMul);
          alphaBase = 0.26 + h2 * 0.56;
        }

        // ---- position ----
        let px;
        let py;
        let windUX = 0;
        let windUY = 0;
        let windSpeedFrac = 0;
        if (storm) {
          // Advect with the flake's depth LAYER wind sheet: the whole layer
          // shares one displacement (coherent — all its snow moves the same
          // way), plus small independent per-flake turbulence so the sheet
          // isn't a rigid grid. Layer chosen by the focus hash so depth,
          // softness and wind-layer correlate (nearer = own wind).
          const lw = layerWind[h7 < 0.34 ? 0 : (h7 < 0.67 ? 1 : 2)] || layerWind[0];
          // Single low-frequency oscillator per axis (was two) — cheaper and
          // smoother (slower wander reads less "steppy" at stream fps).
          const turbX = Math.sin(tw * 0.5 + i * 1.7) * unit * 0.032;
          const turbY = Math.cos(tw * 0.45 + i * 1.3) * unit * 0.032;
          let fx = (h1 * regW + lw.dx + turbX) % regW;
          if (fx < 0) fx += regW;
          let fy = (h2 * regH + lw.dy + turbY) % regH;
          if (fy < 0) fy += regH;
          px = regX + fx;
          py = regY + fy;
          windUX = lw.ux;
          windUY = lw.uy;
          windSpeedFrac = lw.speedFrac;
        } else {
          // Calm: gentle near-vertical drift + slow graceful swirl + a soft
          // whole-field sway (gustX/gustY). Unchanged from w3.9q.
          const baseAng = (Math.PI * 0.5) + (h5 - 0.5) * 0.8;
          const baseSpeed = unit * (0.05 + speedKnob * 0.11) * (0.6 + h4 * 0.85);
          const sp = 0.6 * (0.55 + speedKnob * 0.9);
          const fA = (0.40 + h5 * 0.85) * sp;
          const fB = (0.60 + h6 * 1.05) * sp;
          const ampX = regW * 0.10 * (0.5 + h3 * 0.9);
          const ampY = regH * 0.11 * (0.5 + h4 * 0.9);
          const swirlX = Math.sin(tw * fA + i * 1.7) * ampX
            + Math.sin(tw * fB * 0.6 + i * 0.7) * ampX * 0.5;
          const swirlY = Math.cos(tw * fB + i * 0.9) * ampY
            + Math.sin(tw * fA * 0.7 + i * 1.3) * ampY * 0.5;
          let fx = (h1 * regW + Math.cos(baseAng) * baseSpeed * safeAge + gustX + swirlX) % regW;
          if (fx < 0) fx += regW;
          let fy = (h2 * regH + Math.sin(baseAng) * baseSpeed * safeAge + gustY + swirlY) % regH;
          if (fy < 0) fy += regH;
          px = regX + fx;
          py = regY + fy;
        }

        // Wind gusts brighten the snow they carry → the field reads denser
        // when a stoß blows through (windSpeedFrac peaks across the layer).
        const alpha = Math.max(0.05, Math.min(0.96,
          alphaBase * overall * intensitySafe * (storm ? (0.78 + windSpeedFrac * 0.42) : 1)));

        if (oof) {
          // Out-of-focus bokeh — soft blob in BOTH modes; never streaks.
          softBlob(px, py, size, alpha * 0.95);
        } else if (storm) {
          // Streak length comes from the SHARED layer wind speed × a per-
          // flake size/speed factor. When the wind gusts the whole layer
          // streaks longer together; in a lull it shrinks to soft dots —
          // coherent, never extreme (length is bounded).
          const flakeSpeed = windSpeedFrac * (0.5 + h4 * 0.95);
          const len = unit * (0.010 + speedKnob * 0.012) * (0.5 + sizeHash)
            * Math.min(2.4, flakeSpeed * 2.2);
          if (len < size * 1.9) {
            // lull / slow flake → soft round flake (keeps the field snow-like)
            softDot(px, py, size * 1.4, alpha * 0.9);
          } else {
            // SYMMETRIC soft motion-blur streak CENTRED on the flake: a faint
            // full-length pass + a brighter inner pass, both centred, round
            // caps. No bright head dot → no comet/"sperm" shape (operator
            // 2026-06-28); it fades evenly at both ends like wind-blurred
            // snow and points along the shared layer wind (coherent).
            const hx = windUX * len * 0.5;
            const hy = windUY * len * 0.5;
            c.globalAlpha = alpha * 0.5;
            c.strokeStyle = COL_TAIL;
            c.lineWidth = Math.max(0.7, size * 1.1);
            c.beginPath();
            c.moveTo(px - hx, py - hy);
            c.lineTo(px + hx, py + hy);
            c.stroke();
            c.globalAlpha = alpha * 0.95;
            c.strokeStyle = COL_CORE;
            c.lineWidth = Math.max(0.6, size * 0.65);
            c.beginPath();
            c.moveTo(px - hx * 0.62, py - hy * 0.62);
            c.lineTo(px + hx * 0.62, py + hy * 0.62);
            c.stroke();
          }
        } else {
          // Calm in-focus flake. Medium ones get a soft edge; the tiniest
          // stay crisp pinpoints — the size/softness mix reads as snow.
          if (size > unit * 0.0030) {
            softDot(px, py, size * 1.4, alpha * 0.95);
          } else {
            c.globalAlpha = alpha;
            c.beginPath();
            c.arc(px, py, size, 0, TAU);
            c.fill();
          }
        }
      }

      c.globalAlpha = 1;
      c.lineCap = prevCap;
      c.globalCompositeOperation = prevComposite;
      return;
    }

    if (type === "city-workers" || type === "city-workers-lit") {
      // Phase 58-w3.7y — sparse top-down inhabitants animating the
      // Frostpunk crater city. Dark, slow, occasional: tiny near-black
      // silhouettes (shoulders ellipse + head dot + soft shadow) that
      // trudge between seeded anchor points, pause to "work", and fade
      // out again. w3.8c adds seeded per-figure appearance variants:
      // muted coat tints, stocky/slim builds, hood vs cap heads,
      // stoops, carried fire lanterns and sled/bundle loads — all
      // fixed per (room × figure), see getWorkerScene. Knobs:
      // intensity = inhabitant count, speed = pace (caller pre-scales
      // age), opacity standard, colorHex = lantern flame tint. Caller
      // has clipped to the room polygon already.
      //
      // w3.8e shipped "city-workers-lit" as a separate registry key;
      // w3.8i merges both variants into ONE configurable effect. The
      // render style now comes from options.workerStyle ("dark" |
      // "lit", per-definition "Darstellung" select). "city-workers-lit"
      // remains a BACKWARD-COMPAT ALIAS (runtime-asset-refs maps it to
      // city-workers; the normalizer derives workerStyle "lit" from
      // the raw ref) — the type check below stays as a last-resort for
      // un-normalized callers (e.g. the editor live preview passes the
      // raw assetRef straight in, old snapshot instances carry no
      // workerStyle field).
      const style = options.workerStyle === "lit"
        || (options.workerStyle !== "dark" && type === "city-workers-lit")
        ? WORKER_STYLE_LIT
        : WORKER_STYLE_DARK;
      const opacityOption = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1;
      const intensitySafe = Number.isFinite(intensity) ? intensity : 1;
      const overall = Math.max(0, Math.min(1, opacityOption));
      const safeAge = Number.isFinite(age) ? Math.max(0, age) : 0;
      const hex = typeof options.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(options.colorHex)
        ? options.colorHex
        : "#c98a4b"; // default muted lantern ember
      const lr = parseInt(hex.slice(1, 3), 16);
      const lg = parseInt(hex.slice(3, 5), 16);
      const lb = parseInt(hex.slice(5, 7), 16);

      // Guaranteed ambient base layer — SSR trap: with every figure
      // off-stage this branch would otherwise paint NOTHING for many
      // seconds and the encoded stream strobes black. An ultra-faint
      // cold vignette always paints; the slow breath keeps the canvas
      // state changing for Win32 tab-capture damage tracking too.
      const baseBreath = (Math.sin(safeAge * 0.31) + 1) / 2; // 0..1, ~20 s period
      const baseAlpha = Math.max(0.02, (0.030 + baseBreath * 0.012) * overall);
      const vignetteRadius = Math.max(12, Math.hypot(roomWidth, roomHeight) * 0.58);
      const vignette = c.createRadialGradient(
        roomX, roomY, Math.max(2, vignetteRadius * 0.25),
        roomX, roomY, vignetteRadius,
      );
      vignette.addColorStop(0, "rgba(10, 16, 28, 0)");
      vignette.addColorStop(1, `rgba(10, 16, 28, ${baseAlpha})`);
      c.fillStyle = vignette;
      c.fillRect(roomMinX - roomWidth * 0.25, roomMinY - roomHeight * 0.25, roomWidth * 1.5, roomHeight * 1.5);

      // Per-room scene (w3.7z): seeded from the room id shared by all
      // clients via the board catalog (room.id; cluster pads pass a
      // synthetic id, the editor live-preview falls back to a stable
      // default — both still deterministic). w3.8i: the seeding-
      // relevant options (group frequency, lantern share) parametrize
      // the scene; defaults reproduce the historical look exactly.
      const workerRoomKey = String(room?.id ?? options.roomId ?? "preview");
      const scene = getWorkerScene(workerRoomKey, {
        groups: options.workerGroups,
        lanternShare: options.workerLanternShare,
        // Phase 58-w3.8w "Mitte aussparen": part of the seed (anchor
        // radii), so it joins the scene cache key inside getWorkerScene.
        centerExclusion: options.workerCenterExclusion === true,
        centerExclusionRadius: options.workerCenterExclusionRadius,
        // Phase 58-w3.9b: zone centre offset + visible-ring toggle — also
        // seed inputs, so they join the scene cache key.
        exclusionOffsetX: options.workerExclusionOffsetX,
        exclusionOffsetY: options.workerExclusionOffsetY,
        exclusionRingVisible: options.workerExclusionRingVisible !== false,
      });
      // Inhabitant count — sparse by design. w3.8i semantics
      // ("Anzahl Bewohner" option, DECOUPLED from intensity):
      //   - options.workerCount set → that's the room's base
      //     population; the per-room countScale (×0.75..1.3) still
      //     applies so rooms keep individual densities.
      //   - unset (pre-merge instances restored from old snapshots) →
      //     legacy intensity-derived base 4.5 × intensity, identical
      //     to the historical look. The definition normalizer migrates
      //     stored definitions to an explicit workerCount, so this
      //     path only serves old in-flight instances.
      // Phase 58-w3.8h: the adaptive visualCaps.nonCriticalDensityScale
      // is deliberately NOT applied any more — it flips with the
      // per-frame pressureLevel and every flip popped the top-index
      // figure in/out at full alpha (operator's "verschwinden
      // plötzlich" report; see the presence-envelope block comment).
      // ≤ WORKER_MAX tiny ellipse fills are negligible render cost,
      // and a deterministic count keeps all clients pixel-identical
      // under load.
      const workerCountOpt = Number(options.workerCount);
      const baseCount = Number.isFinite(workerCountOpt) && workerCountOpt > 0
        ? workerCountOpt
        : 4.5 * intensitySafe;
      const figureCount = Math.max(1, Math.min(
        WORKER_MAX,
        Math.round(baseCount * scene.countScale),
      ));
      // Figure length relative to the polygon with absolute clamps —
      // workers must stay SMALL against the building art on the tiles.
      // Phase 58-w3.8s: the "Größe der Bewohner" multiplier (0.5–2.0,
      // default 1.0) scales the whole figure AND its derived trail/load
      // geometry (everything downstream reads baseFigLen). Applied AFTER
      // the historical art-fit clamp so the 1.0 default stays
      // byte-identical; values outside the 2–7px band are intentional
      // (the operator may want figures larger/smaller than the default).
      const workerSizeOpt = Number(options.workerSize);
      const workerSizeMul = Number.isFinite(workerSizeOpt) && workerSizeOpt > 0
        ? Math.max(0.5, Math.min(2, workerSizeOpt))
        : 1;
      const baseFigLen = Math.max(2, Math.min(7, roomWidth * 0.025)) * workerSizeMul;
      // Phase 58-w3.8w "Helligkeit der Kleidung": coat-luminance
      // multiplier (0.3–2.0, default 1.0 = unchanged). Scales the coat
      // fills in BOTH styles (most visible in "Beleuchtet"); the head dot
      // and lantern are NOT scaled (the head/lantern balance is owned by
      // the w3.8w rebalance + the lantern glow), so the figure keeps its
      // "person carrying a light" reading at any clothing brightness.
      const clothingMulOpt = Number(options.workerClothingBrightness);
      const clothingMul = Number.isFinite(clothingMulOpt) && clothingMulOpt > 0
        ? Math.max(0.3, Math.min(2, clothingMulOpt))
        : 1;
      // Phase 58-w3.9l "Gehbewegung" (walk-sway): ONE knob scaling the
      // whole gait swing — lateral meander + body bob + heading wobble —
      // expressed as a percentage of the original (v1.2.32-era) amplitude.
      // 0 % ⇒ near-straight walk, 100 % ⇒ today's amplitude, 150 % ⇒ a bit
      // more. The operator reported the walk "schwingt zu viel" → the
      // omitted/legacy default maps to 55 % (NOT byte-identical to the old
      // look): every existing definition renders calmer, and the value is
      // fully dialable. The micro-orbit (below) scales with the SAME knob
      // but floors at WORKER_ANTIQ_MIN_PX so the anti-stutter fix holds.
      const swayOpt = Number(options.workerSwayAmount);
      const swayMul = Number.isFinite(swayOpt)
        ? Math.max(0, Math.min(1.5, swayOpt / 100))
        : 0.55;
      const halfW = roomWidth * 0.5;
      const halfH = roomHeight * 0.5;
      const prevComposite = c.globalCompositeOperation;

      // Trampled-snow trails (w3.8a) — drawn BEFORE the figures so the
      // silhouettes walk ON the trail, never under it. Deterministic
      // re-evaluation of past positions; see the block comment at
      // getWorkerTrailSamples. Subtlety contract: low-alpha cool dark
      // strokes (round caps/joins blend samples into a worn path);
      // repeated traversals of the same anchor route stack naturally
      // into "established" paths. Prominence scales mildly with the
      // opacity knob only (sqrt). w3.8i: the "Spuren im Schnee"
      // checkbox (workerTrails, default ON — undefined rides the
      // historical look) skips the whole trail pass when OFF.
      if (overall > 0.02 && options.workerTrails !== false) {
        // Phase 58-w3.8w/w3.9b "Spuren-Intensität" (0..300, default 100 =
        // historical peak): scales the trail's pre-fade alpha. 100 ⇒
        // ×1.0 (byte-identical); 300 ⇒ ×3 (much more prominent). Composes
        // multiplicatively with the existing opacity-driven sqrt
        // prominence. "Spuren im Schnee" OFF still skips the whole pass
        // (guard above). The per-stroke alpha is clamped below
        // (WORKER_TRAIL_ALPHA_CEIL) so 300% reads as strongly trampled
        // snow, never a blown-out white band.
        const trailIntensityOpt = Number(options.workerTrailIntensity);
        const trailIntensityMul = Number.isFinite(trailIntensityOpt)
          ? Math.max(0, Math.min(300, trailIntensityOpt)) / 100
          : 1;
        const trailProminence = Math.sqrt(overall) * trailIntensityMul;

        // Offscreen max-merge buffer (w3.9e) — overlapping strokes from
        // different figures (or a single figure's repeated cycles) must
        // NOT compound. We size the buffer to the room bbox (+ a pad for
        // the widest track) and stroke OPAQUE GREYSCALE there with
        // 'lighten' so overlaps take the MAX per-segment alpha; one CPU
        // pass below converts luminance→alpha + re-tints. If the offscreen
        // env is unavailable (non-browser unit env) we fall back to the
        // historical direct source-over stroking onto the main canvas.
        const trailPad = Math.ceil(baseFigLen * 3) + 6;
        const bx0 = Math.floor(roomMinX - trailPad);
        const by0 = Math.floor(roomMinY - trailPad);
        const usedW = Math.max(1, Math.ceil(roomWidth + trailPad * 2));
        const usedH = Math.max(1, Math.ceil(roomHeight + trailPad * 2));
        const tc = getWorkerTrailBuffer(usedW, usedH);
        const useBuf = !!tc;
        const tg = useBuf ? tc : c;
        const prevCap = tg.lineCap;
        const prevJoin = tg.lineJoin;
        let bufPrevComposite = null;
        if (useBuf) {
          tc.setTransform(1, 0, 0, 1, 0, 0);
          tc.clearRect(0, 0, usedW, usedH);
          bufPrevComposite = tc.globalCompositeOperation;
          tc.globalCompositeOperation = "lighten"; // overlaps → MAX, not sum
          tc.setTransform(1, 0, 0, 1, -bx0, -by0); // draw in main-canvas coords
        }
        // Butt caps on purpose: round caps double-stamp at every band
        // boundary (path flushes) and beaded the trail with dark dots;
        // round JOINS still keep the in-path corners soft.
        tg.lineCap = "butt";
        tg.lineJoin = "round";
        for (let i = 0; i < figureCount; i += 1) {
          const fig = scene.figures[i];
          const samples = getWorkerTrailSamples(fig, i, swayMul);
          const segCount = samples.length - 1;
          const cd = fig.cycleDur;
          // ≈ shoulder span of this figure (slightly wider) so the
          // track reads as stamped by exactly this silhouette. Group
          // members' per-anchor scatter keeps their tracks offset —
          // a loosely braided band along shared group legs. w3.8c:
          // span follows the seeded build width, and sled-pullers
          // stamp a slightly wider drag track (same size gate as the
          // sled geometry so trail and visual stay consistent).
          const figLenT = baseFigLen * fig.sizeJitter;
          const sledTrack = fig.hasSled && figLenT >= WORKER_SLED_MIN_PX ? 1.3 : 1;
          const trailW = Math.max(1.6, figLenT * (fig.buildWidth ?? 1) * 1.45 * sledTrack);
          const strokeBand = (bandIdx) => {
            if (bandIdx < 0) return;
            // Single low-alpha stroke per band: at these alphas the
            // AA edge already reads soft; a second "halo" stroke
            // doubled the rasterization cost and beaded the path.
            const a = Math.min(
              WORKER_TRAIL_ALPHA_CEIL,
              style.trailAlpha * ((bandIdx + 0.5) / WORKER_TRAIL_BANDS) * trailProminence,
            );
            tg.lineWidth = trailW;
            if (useBuf) {
              // Carry the per-segment alpha in luminance; 'lighten' keeps
              // the MAX across overlaps. The single composite below turns
              // luminance back into alpha and applies style.trailRGB.
              const g = Math.max(0, Math.min(255, Math.round(a * 255)));
              tg.strokeStyle = `rgb(${g}, ${g}, ${g})`;
            } else {
              tg.strokeStyle = `rgba(${style.trailRGB}, ${a.toFixed(4)})`;
            }
            tg.stroke();
          };
          // Cycle indices whose active stretch can intersect the
          // trailing fade window [safeAge - FADE, safeAge].
          const nMax = Math.floor(safeAge / cd + fig.phase);
          const nMin = Math.max(0, Math.floor((safeAge - WORKER_TRAIL_FADE_SEC) / cd + fig.phase));
          for (let n = nMin; n <= nMax; n += 1) {
            const cycleStart = (n - fig.phase) * cd; // wall-time of t = 0
            let band = -1;
            for (let j = 0; j < segCount; j += 1) {
              const s0 = samples[j];
              const s1 = samples[j + 1];
              const doneAt = cycleStart + s1.t * cd; // figure finished this segment
              // Only fully-traversed segments (the figure itself caps
              // the live end), only segments that happened (≥ 0), only
              // within the fade window, only while visibly present
              // (fade ramps gate off-stage / fading figures).
              if (doneAt > safeAge || doneAt < 0) { strokeBand(band); band = -1; continue; }
              const elapsed = safeAge - (cycleStart + s0.t * cd);
              const fadeMul = Math.min(s0.fade, s1.fade);
              if (elapsed >= WORKER_TRAIL_FADE_SEC || fadeMul <= 0.05) {
                strokeBand(band);
                band = -1;
                continue;
              }
              const life = 1 - elapsed / WORKER_TRAIL_FADE_SEC;       // 1 fresh → 0 old
              const v = life * life * (3 - 2 * life) * fadeMul;       // smoothstep fade-out
              const b = Math.min(WORKER_TRAIL_BANDS - 1, Math.floor(v * WORKER_TRAIL_BANDS));
              if (b !== band) {
                strokeBand(band);
                band = b;
                tg.beginPath();
                tg.moveTo(roomX + s0.px * halfW, roomY + s0.py * halfH);
              }
              tg.lineTo(roomX + s1.px * halfW, roomY + s1.py * halfH);
            }
            strokeBand(band);
          }
        }
        tg.lineCap = prevCap;
        tg.lineJoin = prevJoin;
        if (useBuf) {
          // Convert the greyscale max-merge buffer (luminance = max
          // per-pixel trail alpha) into a tinted trail layer (RGB =
          // style.trailRGB, A = max alpha), then blit ONCE onto the main
          // canvas with the inherited composite (room clip + w3.43 lift
          // both honoured). Overlaps now read as a SINGLE worn pass.
          tc.setTransform(1, 0, 0, 1, 0, 0);
          tc.globalCompositeOperation = bufPrevComposite;
          const img = tc.getImageData(0, 0, usedW, usedH);
          const d = img.data;
          const parts = style.trailRGB.split(",");
          const tr = Math.max(0, Math.min(255, parseInt(parts[0], 10) || 0));
          const tgc = Math.max(0, Math.min(255, parseInt(parts[1], 10) || 0));
          const tb = Math.max(0, Math.min(255, parseInt(parts[2], 10) || 0));
          for (let p = 0; p < d.length; p += 4) {
            const lum = d[p];        // max(alpha*255) across overlapping strokes
            const cov = d[p + 3];    // rasterizer coverage (AA fringe softness)
            if (lum === 0 || cov === 0) { d[p + 3] = 0; continue; }
            // (lum/255) = max alpha; × (cov/255) preserves the soft AA edge.
            d[p] = tr;
            d[p + 1] = tgc;
            d[p + 2] = tb;
            d[p + 3] = Math.round((lum * cov) / 255);
          }
          tc.putImageData(img, 0, 0);
          c.drawImage(_workerTrailBuf, 0, 0, usedW, usedH, bx0, by0, usedW, usedH);
        }
      }

      // ---- drawn exclusion ring (Phase 58-w3.9c) ---------------------
      // Operator UAT: the "ring" used to be only an emergent trampled-trail
      // concentration on the boundary — invisible with trails off / on a
      // fresh trigger. This draws an ACTUAL ring primitive at the true
      // exclusion circle, visible IMMEDIATELY (no trail accumulation),
      // identically on dashboard / /output / SSR (pure age-independent
      // geometry; only the opacity envelope `overall` modulates it).
      //
      // Shows ONLY when the zone exists (workerCenterExclusion ON →
      // scene.excludeR > 0) AND "Ring anzeigen" is ON (default ON;
      // undefined rides the default). It follows the zone radius and the
      // X/Y offset exactly (same px mapping as the snap geometry: the
      // unit-disc circle maps to an ellipse on non-square tiles, so we draw
      // in a y-scaled space to stay faithful).
      //
      // Style (beamer-black rule — non-pure-black tones read on the black
      // /output background; light elements survive additive layering): a
      // soft-edged faint COOL worn-snow glow (frostpunk palette) under a
      // dim defining stroke, both via 'lighter' so they read on black AND
      // lift the board art without a hard garish edge. Composite restored
      // after. Drawn AFTER the trails / BEFORE the figures so the workers
      // walk over the boundary, never under it.
      if (scene.excludeR > 0 && options.workerExclusionRingVisible !== false && overall > 0.02) {
        const zoneR = scene.excludeR;
        const zx = roomX + (scene.exclusionOffX ?? 0) * halfW;
        const zy = roomY + (scene.exclusionOffY ?? 0) * halfH;
        const rx = zoneR * halfW;        // px radius along X (= the circle in scaled space)
        const ry = zoneR * halfH;        // px radius along Y
        if (rx > 0.5 && ry > 0.5) {
          c.save();
          c.globalCompositeOperation = "lighter";
          c.translate(zx, zy);
          c.scale(1, ry / rx);           // work in a circular space of radius rx
          // Soft worn-snow glow annulus centred ON the boundary radius.
          const maxGlow = rx * 1.22;
          const glowA = Math.min(0.32, 0.22 * overall);
          const grad = c.createRadialGradient(0, 0, 0, 0, 0, maxGlow);
          grad.addColorStop(0, "rgba(170, 192, 220, 0)");
          grad.addColorStop(0.66, "rgba(170, 192, 220, 0)");
          grad.addColorStop(rx / maxGlow, `rgba(176, 198, 224, ${glowA.toFixed(3)})`);
          grad.addColorStop(1, "rgba(176, 198, 224, 0)");
          c.fillStyle = grad;
          c.beginPath();
          c.arc(0, 0, maxGlow, 0, Math.PI * 2);
          c.fill();
          // Dim defining stroke right on the boundary — reads as an
          // intentional worn edge, not a halo. Kept low so it never garish.
          c.lineWidth = Math.max(0.8, rx * 0.035);
          c.strokeStyle = `rgba(198, 216, 238, ${Math.min(0.30, 0.20 * overall).toFixed(3)})`;
          c.beginPath();
          c.arc(0, 0, rx, 0, Math.PI * 2);
          c.stroke();
          c.restore();
          c.globalCompositeOperation = prevComposite;
        }
      }

      // Figure pass (w3.8h): iterate ALL slots, not just the active
      // count — a slot whose target dropped to 0 (count change, age
      // reset, off-stage) may still hold a draining presence envelope
      // and must keep rendering its fading ghost until it settles.
      const envNowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      // Envelope identity stays (room × slot) — deliberately WITHOUT
      // the option values, so an options change (count, style, …)
      // crossfades through the slew clamp instead of popping.
      const envRoomKey = workerRoomKey;
      for (let i = 0; i < WORKER_MAX; i += 1) {
        const fig = scene.figures[i];
        const t = (safeAge / fig.cycleDur + fig.phase) % 1;
        const pose = i < figureCount ? workerPoseAt(fig, t, safeAge, i, swayMul) : null;
        const target = pose ? 0.82 * pose.fade * overall : 0;
        // ---- presence envelope: final-stage alpha slew clamp -------
        const envKey = `${envRoomKey}::${i}`;
        let envAlpha = target;
        if (target <= 0.005 && !WORKER_PRESENCE_ENVELOPES.has(envKey)) {
          // Settled-invisible slot without state — nothing to do, and
          // no envelope is allocated for the (common) idle case.
          continue;
        }
        const env = getWorkerPresenceEnvelope(envKey, envNowMs);
        const dtSec = Math.min(0.5, Math.max(0, (envNowMs - env.atMs) / 1000));
        env.atMs = envNowMs;
        const maxStep = WORKER_PRESENCE_RATE * dtSec;
        env.alpha += Math.max(-maxStep, Math.min(maxStep, target - env.alpha));
        envAlpha = Math.max(0, Math.min(1, env.alpha));
        if (pose) {
          // Remember the live pose so a future discontinuity can fade
          // the ghost out exactly where the figure last stood.
          env.px = pose.px;
          env.py = pose.py;
          env.heading = pose.heading;
        }
        if (envAlpha <= 0.01) {
          if (target <= 0.005) WORKER_PRESENCE_ENVELOPES.delete(envKey); // settled
          continue;
        }
        // Ghost pose: target vanished but the envelope still drains —
        // a static stance at the last known position (no walk bob, no
        // work strike), alpha falling at the slew rate.
        const drawPose = pose ?? {
          px: env.px, py: env.py, heading: env.heading,
          fade: 0, walking: false, workPulse: 0,
        };
        const figLen = baseFigLen * fig.sizeJitter;
        const alpha = envAlpha;
        // w3.8e: the lit style raises BODY-paint coverage slightly so
        // the small figures stay solid against the additive Snow
        // inside-animation; the lantern keeps the shared alpha (it is
        // light-based and composes correctly already). For the dark
        // style bodyAlpha === alpha exactly — identical paint strings.
        const bodyAlpha = style.lit ? Math.min(1, alpha * 1.15) : alpha;

        let x = roomX + drawPose.px * halfW;
        let y = roomY + drawPose.py * halfH;
        let heading = drawPose.heading;
        let paceCur = 0; // current stride pace — lantern swing reads it below
        if (drawPose.walking) {
          // Walk shuffle (humanized, w3.7z): along-axis stride pulse +
          // perpendicular body bob at half the step rate, both scaled
          // by the CURRENT pace from the warped progress — the bob
          // swells mid-stride and settles as the figure eases into a
          // stop or hesitates, so starts/stops read as weight shifts
          // instead of a vehicle braking. Constant step frequency
          // (amplitude carries the pace cue) keeps the oscillators
          // free of phase drift — fully deterministic in `age`.
          const pace = Math.max(0, Math.min(1.8, Number.isFinite(drawPose.pace) ? drawPose.pace : 1));
          paceCur = pace;
          const stepPhase = safeAge * fig.stepFreq + i * 2.3;
          // w3.8b: smaller amplitudes — the heavy ~1.2-1.6 steps/s
          // cadence carries the effort cue, not big lurches.
          const along = Math.sin(stepPhase) * figLen * (0.03 + 0.05 * pace);
          x += Math.cos(heading) * along;
          y += Math.sin(heading) * along;
          // Body bob at the full step cadence (was half-rate): each
          // heavy step lifts the body once, small amplitude. w3.9l: scaled
          // by the "Gehbewegung" knob (swayMul) together with the meander
          // and the wobble so one slider calms the whole gait swing.
          const bob = Math.sin(stepPhase + fig.gaitSeed) * figLen * (0.02 + 0.035 * pace) * swayMul;
          x += -Math.sin(heading) * bob;
          y += Math.cos(heading) * bob;
          // Heading wobble halved in w3.8b (0.10 → 0.05) and again in
          // w3.8d (→ 0.025, ≈ 1.4°) — with the near-straight w3.8d
          // meander the body should barely visibly correct course. w3.9l:
          // also scaled by swayMul (→ 0 at sway 0, the body holds course).
          heading += Math.sin(stepPhase * 0.5 + fig.gaitSeed + 0.8) * 0.025 * (0.4 + 0.6 * pace) * swayMul;
          // Sub-pixel anti-quantization micro-orbit (w3.8y): a constant-
          // speed circle (no velocity zero-crossing) that keeps the
          // figure's per-frame motion above the pixel-grid quantization
          // floor so slow trudgers stop stuttering on /output. Averages
          // to zero → net trudge + dashboard/SSR determinism preserved.
          // Pace-scaled ramp eases it in/out with the stride.
          // w3.9l: the micro-orbit scales DOWN with the walk-sway knob
          // (it's a tiny circular motion the operator may perceive as part
          // of the swinging), but never below WORKER_ANTIQ_MIN_PX — or the
          // base radius if that is already sub-pixel — so the v1.2.48
          // per-frame anti-stutter motion survives at sway 0. Proportional
          // scale (× min(1, swayMul)) then floored: deterministic, pace-
          // independent floor.
          const antiQBase = figLen * WORKER_ANTIQ_RADIUS * Math.min(1, pace * 1.5);
          const antiQFloor = Math.min(antiQBase, WORKER_ANTIQ_MIN_PX);
          const antiQ = Math.max(antiQBase * Math.min(1, swayMul), antiQFloor);
          const antiQPhase = safeAge * WORKER_ANTIQ_OMEGA + fig.gaitSeed;
          x += Math.cos(antiQPhase) * antiQ;
          y += Math.sin(antiQPhase) * antiQ;
        } else {
          // Working: lean rhythmically along the facing axis (strike /
          // shovel motion) — subtle, the figure stays put.
          x += Math.cos(heading) * drawPose.workPulse * figLen * 0.14;
          y += Math.sin(heading) * drawPose.workPulse * figLen * 0.14;
          heading += Math.sin(safeAge * 0.23 + i * 0.9) * 0.18; // slow stance sway
        }

        // Per-figure build scales (w3.8c): bL stretches the silhouette
        // along the walking axis (local +x), bW the shoulder span.
        const bL = fig.buildLen ?? 1;
        const bW = fig.buildWidth ?? 1;
        // Per-style coat resolution (w3.8e): the dark style keeps the
        // seeded string verbatim (pixel-identity contract); the lit
        // style maps the SAME seeded index into its lifted palette
        // with precomputed internal-contrast shades.
        const coatBaseStr = fig.coatRGB ?? WORKER_DARK_INK.coatFallback;
        // Phase 58-w3.8w: clothing-brightness scales the coat-derived
        // fills (coat / hood / highlight / underside) — NOT the head dot
        // or lantern. mul===1 returns the seed strings verbatim, so the
        // default render is byte-identical.
        const coatStr = scaleRGBString(coatBaseStr, clothingMul);
        const litCoatBase = style.lit
          ? (style.coats[fig.coatIdx ?? 0] ?? style.coats[0])
          : null;
        const litCoat = style.lit
          ? {
            coat: scaleRGBString(litCoatBase.coat, clothingMul),
            under: scaleRGBString(litCoatBase.under, clothingMul),
            highlight: scaleRGBString(litCoatBase.highlight, clothingMul),
            hood: scaleRGBString(litCoatBase.hood, clothingMul),
            // Head-area inks are NOT clothing — keep them at the seed
            // value so the w3.8w head rebalance is independent of the
            // clothing slider.
            hoodOpening: litCoatBase.hoodOpening,
            cap: litCoatBase.cap,
          }
          : null;
        c.save();
        c.translate(x, y);
        c.rotate(heading);
        // Sled (w3.8c, size-gated): a small dark runner box dragged
        // behind on a short tow line; it lags into the curve with a
        // slow half-step sway. Drawn FIRST so the figure overlaps the
        // rope where they meet. (w3.8e lit: same geometry, lifted
        // tones — the box sits slightly darker than the coats.)
        if (fig.hasSled && figLen >= WORKER_SLED_MIN_PX) {
          const drag = Math.sin(safeAge * fig.stepFreq * 0.5 + fig.gaitSeed) * figLen * 0.05;
          c.strokeStyle = style.lit
            ? `rgba(${style.sledRopeRGB}, ${(bodyAlpha * 0.55).toFixed(3)})`
            : `rgba(${WORKER_DARK_INK.sledRope}, ${(bodyAlpha * 0.55).toFixed(3)})`;
          c.lineWidth = Math.max(0.4, figLen * 0.05);
          c.beginPath();
          c.moveTo(-figLen * 0.30 * bL, 0);
          c.lineTo(-figLen * 0.78, drag);
          c.stroke();
          c.fillStyle = style.lit
            ? `rgba(${style.sledBoxRGB}, ${(bodyAlpha * 0.92).toFixed(3)})`
            : `rgba(${WORKER_DARK_INK.sledBox}, ${(bodyAlpha * 0.92).toFixed(3)})`;
          c.fillRect(-figLen * 1.46, drag - figLen * 0.24, figLen * 0.68, figLen * 0.48);
        }
        // Faint soft shadow, slightly offset — sells "seen from above".
        // (w3.8e lit: pure black is zero light on the beamer, so the
        // shadow becomes a darker-than-coat underside on the same
        // ellipse — a soft penumbra that separates figure from trail.)
        c.fillStyle = style.lit
          ? `rgba(${litCoat.under}, ${(bodyAlpha * 0.5).toFixed(3)})`
          : `rgba(0, 0, 0, ${(bodyAlpha * 0.35).toFixed(3)})`;
        c.beginPath();
        c.ellipse(figLen * 0.06, figLen * 0.22, figLen * 0.62 * bL, figLen * 0.40 * bW, 0, 0, Math.PI * 2);
        c.fill();
        // Shoulders — the COAT: dark muted per-figure tint (w3.8c),
        // wider across the walking axis than along it (top-down
        // torso); build scales make stocky vs slim silhouettes.
        c.fillStyle = style.lit
          ? `rgba(${litCoat.coat}, ${bodyAlpha.toFixed(3)})`
          : `rgba(${coatStr}, ${bodyAlpha.toFixed(3)})`;
        c.beginPath();
        c.ellipse(0, 0, figLen * 0.34 * bL, figLen * 0.52 * bW, 0, 0, Math.PI * 2);
        c.fill();
        // Lit-only internal contrast: a cold top-light catching the
        // shoulders. The highlight ellipse is offset toward SCREEN-top
        // regardless of heading (counter-rotated into local coords),
        // so every figure reads lit from the same cold sky.
        if (style.lit) {
          const hlOff = figLen * 0.13;
          c.fillStyle = `rgba(${litCoat.highlight}, ${(bodyAlpha * 0.70).toFixed(3)})`;
          c.beginPath();
          c.ellipse(
            -Math.sin(heading) * hlOff,
            -Math.cos(heading) * hlOff,
            figLen * 0.24 * bL,
            figLen * 0.38 * bW,
            0, 0, Math.PI * 2,
          );
          c.fill();
        }
        // Head (w3.8c variants): hood = larger coat-coloured blob
        // merged back into the shoulders; cap = smaller darker dot
        // further forward. A seeded stoop pulls the head toward the
        // torso — hunched against the cold. (w3.8e lit: the head sits
        // a touch LIGHTER than the coat so the figure reads head-first
        // on black; the hood opening stays darker but above black.)
        const headFwd = figLen * ((fig.hood ? 0.17 : 0.23) - (fig.stoop ?? 0) * 0.10) * bL;
        if (fig.hood) {
          // Phase 58-w3.8w: lit hood head no longer painted ABOVE coat
          // alpha (was ×1.06) — the head must not be the brightest part.
          // Dark style keeps ×1.06 (byte-identical contract).
          c.fillStyle = style.lit
            ? `rgba(${litCoat.hood}, ${Math.min(1, bodyAlpha * 1.0).toFixed(3)})`
            : `rgba(${coatStr}, ${Math.min(1, bodyAlpha * 1.06).toFixed(3)})`;
          c.beginPath();
          c.arc(headFwd, 0, figLen * 0.29, 0, Math.PI * 2);
          c.fill();
          // dark hood-opening crescent keeps the blob readable as a head
          c.fillStyle = style.lit
            ? `rgba(${litCoat.hoodOpening}, ${Math.min(1, bodyAlpha * 0.9).toFixed(3)})`
            : `rgba(${WORKER_DARK_INK.hoodOpening}, ${Math.min(1, bodyAlpha * 0.9).toFixed(3)})`;
          c.beginPath();
          c.arc(headFwd + figLen * 0.10, 0, figLen * 0.13, 0, Math.PI * 2);
          c.fill();
        } else {
          // Phase 58-w3.8w: lit bare-head dot dimmed (×0.95, was ×1.1)
          // AND its colour brought to coat-range (see WORKER_LIT_COATS.cap)
          // so it no longer reads as a near-white hotspot. Dark style
          // keeps ×1.1 (byte-identical contract).
          c.fillStyle = style.lit
            ? `rgba(${litCoat.cap}, ${Math.min(1, bodyAlpha * 0.95).toFixed(3)})`
            : `rgba(${WORKER_DARK_INK.cap}, ${Math.min(1, bodyAlpha * 1.1).toFixed(3)})`;
          c.beginPath();
          c.arc(headFwd, 0, figLen * 0.19, 0, Math.PI * 2);
          c.fill();
        }
        // Bundle (w3.8c, size-gated): a small dark pack hugged on one
        // shoulder — barely more than a lump, as it should be.
        if (fig.hasBundle && figLen >= WORKER_BUNDLE_MIN_PX) {
          c.fillStyle = style.lit
            ? `rgba(${style.bundleRGB}, ${(bodyAlpha * 0.9).toFixed(3)})`
            : `rgba(${WORKER_DARK_INK.bundle}, ${(bodyAlpha * 0.9).toFixed(3)})`;
          c.beginPath();
          c.ellipse(-figLen * 0.10, fig.lanternSide * figLen * 0.26 * bW, figLen * 0.22, figLen * 0.18, 0, 0, Math.PI * 2);
          c.fill();
        }
        // Carried old fire lantern (w3.8c — was a static accent dot).
        // Held at arm's length on the seeded hand side, it swings
        // fore-aft with the stride (half the step cadence — one
        // pendulum per stride pair) and settles to a faint sway while
        // working. Warm halo 2.2-2.8× the figure on 'lighter' (restore
        // the caller's composite afterwards — it may already be
        // 'lighter' via the room concurrency lift, never downgrade),
        // plus a slow two-sine organic flicker (~1.9 + 3.3 s period
        // mix, range ≈0.48..1.0) — breathing firelight, never strobe.
        if (fig.hasLantern) {
          c.globalCompositeOperation = "lighter";
          const stepPhase = safeAge * fig.stepFreq + i * 2.3;
          const swingAmp = drawPose.walking ? (0.08 + 0.07 * paceCur) : 0.03;
          const swing = Math.sin(stepPhase * 0.5 + fig.lanternSwingPhase) * figLen * swingAmp;
          const lanternX = figLen * 0.05 * bL + swing;
          const lanternY = fig.lanternSide * figLen * (0.42 + 0.16 * bW)
            + Math.sin(stepPhase * 0.5 + fig.lanternSwingPhase + 1.2) * figLen * swingAmp * 0.4;
          const flicker = 0.74
            + 0.15 * Math.sin(safeAge * 1.9 + (fig.flickerPhase ?? 0))
            + 0.11 * Math.sin(safeAge * 3.3 + (fig.flickerPhase ?? 0) * 1.8 + 1.1);
          // Halo alphas tuned on the live Frostpunk board: additive
          // light saturates to invisible over bright snow, so the
          // halo mostly reads where it crosses the figure, trails and
          // dark board art — these values stay subtle there without
          // overpowering the scene.
          // Phase 58-w3.8w: in the LIT (beamer) style the lantern is
          // boosted so a carrier reads as "a person carrying a light" —
          // the warm glow + flame core are now the BRIGHTEST element on
          // the figure (the head was simultaneously dimmed). Additive
          // 'lighter' compositing means these higher alphas bloom on
          // black exactly where the projector needs them. The DARK style
          // keeps the historical alphas (0.30 / 0.13 / 0.78 and a
          // ×0.16 core) byte-for-byte — A/B contract.
          const glowCoreA = style.lit ? 0.46 : 0.30;
          const glowMidA = style.lit ? 0.22 : 0.13;
          const flameA = style.lit ? 0.95 : 0.78;
          const flameCoreR = style.lit ? 0.20 : 0.16;
          const glowR = figLen * (fig.glowScale ?? 2.4);
          const glow = c.createRadialGradient(lanternX, lanternY, 0.2, lanternX, lanternY, glowR);
          glow.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, ${(alpha * glowCoreA * flicker).toFixed(3)})`);
          glow.addColorStop(0.4, `rgba(${lr}, ${lg}, ${lb}, ${(alpha * glowMidA * flicker).toFixed(3)})`);
          glow.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);
          c.fillStyle = glow;
          c.beginPath();
          c.arc(lanternX, lanternY, glowR, 0, Math.PI * 2);
          c.fill();
          // flame core — tiny warm dot, lifted slightly toward white-hot
          c.fillStyle = `rgba(${Math.min(255, lr + 40)}, ${Math.min(255, lg + 24)}, ${lb}, ${(alpha * flameA * flicker).toFixed(3)})`;
          c.beginPath();
          c.arc(lanternX, lanternY, Math.max(0.5, figLen * flameCoreR), 0, Math.PI * 2);
          c.fill();
          c.globalCompositeOperation = prevComposite;
        }
        c.restore();
      }
      c.globalCompositeOperation = prevComposite;
      return;
    }

    if (type === "special-scanning") {
      const densityFactor = Number(options.densityFactor) || 1;
      const rings = Math.max(3, Math.round(7 * intensity * densityFactor * visualCaps.nonCriticalDensityScale));
      const maxRadius = Math.max(roomWidth, roomHeight) * 0.72;
      for (let i = 0; i < rings; i += 1) {
        const progress = ((age * 0.9 + i / rings) % 1);
        const radius = Math.max(6, progress * maxRadius);
        const alpha = (1 - progress) * 0.38 * intensity;
        c.strokeStyle = `rgba(178, 230, 255, ${alpha})`;
        c.lineWidth = Math.max(1.5, roomWidth * 0.01);
        c.beginPath();
        c.arc(roomX, roomY, radius, 0, Math.PI * 2);
        c.stroke();
      }
      const streaks = Math.max(6, Math.round(14 * visualCaps.nonCriticalDensityScale));
      for (let i = 0; i < streaks; i += 1) {
        const angle = (Math.PI * 2 * i) / streaks + age * 1.2;
        const inner = Math.max(10, Math.min(roomWidth, roomHeight) * 0.1);
        const outer = maxRadius * (0.8 + Math.sin(age * 2 + i) * 0.1);
        c.strokeStyle = `rgba(212, 245, 255, ${(0.12 + ((i % 3) * 0.04)) * intensity})`;
        c.lineWidth = Math.max(1, roomWidth * 0.006);
        c.beginPath();
        c.moveTo(roomX + Math.cos(angle) * inner, roomY + Math.sin(angle) * inner);
        c.lineTo(roomX + Math.cos(angle) * outer, roomY + Math.sin(angle) * outer);
        c.stroke();
      }
      return;
    }
  }

  // Run `fn` with this module's
  // canvas + canvas-context temporarily redirected to the caller's
  // preview canvas. drawEffectVisual renders to `ctx.canvas`, so
  // swapping here lets the animation editor's preview column reuse
  // the exact same coded-effect draw code as the main stage without
  // duplicating logic. Runs synchronously; restores in a finally
  // block so a thrown draw won't leak the preview canvas into the
  // main stage's render loop.
  function withPreviewCanvas(previewCanvas, fn) {
    if (!ctx || !previewCanvas || typeof fn !== "function") return;
    const origCanvas = ctx.canvas;
    const origCanvasCtx = ctx.canvasCtx;
    const previewCtx = previewCanvas.getContext("2d");
    ctx.canvas = previewCanvas;
    ctx.canvasCtx = previewCtx;
    try {
      fn();
    } finally {
      ctx.canvas = origCanvas;
      ctx.canvasCtx = origCanvasCtx;
    }
  }

  window.TT_BEAMER_RUNTIME_EFFECT_VISUALS = {
    init,
    drawEffectVisual,
    computeHullFlickerGate,
    isHullFlickerLampOff,
    computePowerOutageGate,
    isPowerOutageLampOff,
    withPreviewCanvas,
    // w3.7z verification hook: deterministic per-room scene + pose
    // sampling for diag scripts (per-room variety / trajectory
    // evidence). w3.8h adds the live presence-envelope map so the
    // alpha-slew guarantee is directly observable. Render path never
    // reads this.
    __cityWorkersDiag: {
      getWorkerScene,
      workerPoseAt,
      getWorkerTrailSamples,
      presenceEnvelopes: WORKER_PRESENCE_ENVELOPES,
    },
  };
})();
