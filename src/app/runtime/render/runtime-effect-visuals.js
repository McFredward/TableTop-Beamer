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

  function init(dependencies) {
    ctx = dependencies;
  }

  // ---- heat static tables (Phase 58-w3.7w, renamed w3.7x) ----------
  // Deterministic per-streak seeds, computed ONCE at module load.
  // NO Math.random anywhere in the draw path: dashboard, /output and
  // the SSR tab must render pixel-identical frames for a given `age`
  // (they each run their own copy of this module). heatHash01 is the
  // classic sin-fract hash — stable for the small integer inputs used
  // here, so every client derives the same tables.
  // (Phase 58-w3.7x: the rising-ember particle table was removed
  // together with the ember layer — operator: embers break immersion.)
  function heatHash01(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }
  const HEAT_STREAK_MAX = 7;
  const HEAT_STREAKS = Array.from({ length: HEAT_STREAK_MAX }, (_, i) => ({
    lane: (i + 0.5) / HEAT_STREAK_MAX,           // even spread across room width
    laneJitter: (heatHash01(i + 601) - 0.5) * 0.12,
    wavePhase: heatHash01(i + 701) * Math.PI * 2,
    waveFreq: 1.2 + heatHash01(i + 801) * 1.2,   // wave cycles over room height
    parallax: 0.55 + heatHash01(i + 901) * 0.9,  // per-streak rise-speed multiplier
  }));

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
  const WORKER_MAX = 12;
  const WORKER_SCENE_CACHE = new Map();
  const WORKER_SCENE_CACHE_MAX = 96;

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
  function buildWorkerAnchors(rh, base, count) {
    return Array.from({ length: count }, (_, k) => {
      const seed = base + k * 7;
      const ang = rh(seed + 2003) * Math.PI * 2;
      const rad = 0.16 + rh(seed + 3001) * 0.6; // 0.16..0.76
      return [Math.cos(ang) * rad, Math.sin(ang) * rad];
    });
  }

  function getWorkerScene(roomKey) {
    const cached = WORKER_SCENE_CACHE.get(roomKey);
    if (cached) return cached;
    const seedBase = workerRoomSeed(roomKey) * 0.6180339887; // golden-ratio spread
    const rh = (n) => heatHash01(n + seedBase);

    // Group event (w3.7z): roughly half the rooms get one — 2-4
    // figures sharing a leader route. Figure 0 is always a single, so
    // even the smallest population mixes singles and group members.
    const hasGroup = rh(13007) < 0.55;
    const groupSize = hasGroup ? 2 + Math.floor(rh(13013) * 3) : 0; // 2..4
    const GROUP_START = 1;
    let groupAnchors = null;
    let groupCycle = null;
    if (hasGroup) {
      groupAnchors = buildWorkerAnchors(rh, 901, 2 + Math.floor(rh(15101) * 2)); // 2..3 stops
      groupCycle = {
        cycleDur: 44 + rh(15203) * 30,            // shared so the group moves together
        phase: rh(15307),
        hiddenFrac: 0.52 + rh(15401) * 0.18,      // group events stay occasional
        walkShare: 0.36 + rh(15501) * 0.14,
      };
    }

    const figures = Array.from({ length: WORKER_MAX }, (_, i) => {
      const inGroup = hasGroup && i >= GROUP_START && i < GROUP_START + groupSize;
      let anchors;
      let cycleDur;
      let phase;
      let hiddenFrac;
      let walkShare;
      if (inGroup) {
        const member = i - GROUP_START;
        // Member route = leader route + small per-anchor scatter, so
        // the walk legs run loosely parallel (no formation lockstep)
        // and the group naturally disperses around each work spot.
        anchors = groupAnchors.map((a, k) => {
          const sa = rh(i * 311 + k * 41 + 16001) * Math.PI * 2;
          const sr = 0.035 + rh(i * 311 + k * 41 + 16007) * 0.075;
          return [a[0] + Math.cos(sa) * sr, a[1] + Math.sin(sa) * sr];
        });
        cycleDur = groupCycle.cycleDur;
        // Tiny per-member phase lag — they arrive within a couple of
        // seconds of each other instead of marching in sync.
        phase = (groupCycle.phase + member * 0.006 + rh(i + 16101) * 0.010) % 1;
        hiddenFrac = groupCycle.hiddenFrac;
        walkShare = groupCycle.walkShare;
      } else {
        anchors = buildWorkerAnchors(rh, 101 + i * 97, 2 + Math.floor(rh(i + 1009) * 3));
        cycleDur = 38 + rh(i + 4001) * 34;        // 38-72 s full cycle @ speed 1
        phase = rh(i + 5003);                     // cycle offset 0..1
        hiddenFrac = 0.40 + rh(i + 6007) * 0.24;  // 40-64% of cycle off-stage
        walkShare = 0.32 + rh(i + 7001) * 0.16;   // active time spent walking
      }
      return {
        anchors,
        cycleDur,
        phase,
        hiddenFrac,
        walkShare,
        inGroup,
        stepFreq: 5.0 + rh(i + 8009) * 2.6,       // step oscillation rate
        workFreq: 1.0 + rh(i + 9001) * 0.8,       // tool-motion rhythm Hz-ish
        sizeJitter: 0.85 + rh(i + 10007) * 0.3,
        // Group members: only the leader may carry the lantern, so a
        // group doesn't read as a lantern parade.
        hasLantern: inGroup ? false : rh(i + 11003) < 0.28,
        lanternSide: rh(i + 12007) < 0.5 ? -1 : 1,
        // Humanized gait seeds (w3.7z) — see workerWalkPoint.
        meanderScale: 0.07 + rh(i + 17001) * 0.10,   // lateral drift, × leg length
        meanderFreq: 1.2 + rh(i + 17011) * 1.6,      // drift waves per leg
        meanderPhase: rh(i + 17021) * Math.PI * 2,
        paceAmp: 0.09 + rh(i + 17031) * 0.10,        // stride accel/decel depth
        paceFreq: 2 + rh(i + 17041) * 2.5,           // pace cycles per leg
        pacePhase: rh(i + 17051) * Math.PI * 2,
        hesitate: rh(i + 17061) < 0.45 ? 0.5 + rh(i + 17071) * 0.5 : 0,
        hesitateAt: 0.30 + rh(i + 17081) * 0.40,     // where mid-path stall sits
        gaitSeed: rh(i + 17091) * Math.PI * 2,       // bob/wobble phase offset
      };
    });

    const scene = {
      figures,
      // Per-room population variance: ×0.75..1.3 on top of intensity.
      countScale: 0.75 + rh(14009) * 0.55,
    };
    if (WORKER_SCENE_CACHE.size >= WORKER_SCENE_CACHE_MAX) WORKER_SCENE_CACHE.clear();
    WORKER_SCENE_CACHE.set(roomKey, scene);
    return scene;
  }

  // Warped walk progress along a leg (w3.7z "walking, not driving"):
  // smoothstep easing into/out of the stops, a subtle seeded
  // accelerate/decelerate stride cycle (pinned to 0 at both
  // endpoints), and for some figures a brief gaussian mid-path
  // hesitation — the figure stalls, shifts weight, then carries on.
  function workerWalkProgress(fig, p) {
    let e = p * p * (3 - 2 * p);
    e += Math.sin(p * Math.PI * 2 * fig.paceFreq + fig.pacePhase) * fig.paceAmp * p * (1 - p);
    if (fig.hesitate > 0) {
      const d = (p - fig.hesitateAt) / 0.09;
      e -= fig.hesitate * 0.05 * Math.exp(-d * d) * Math.sin(Math.PI * p);
    }
    return Math.max(0, Math.min(1, e));
  }

  // Walk-leg position with meander: two incommensurate sinusoids give
  // a noise-like lateral drift around the straight line; the sin(πp)
  // envelope pins the path to the anchors at both ends. Returns
  // unit-disc coords.
  function workerWalkPoint(fig, a, b, p) {
    const e = workerWalkProgress(fig, p);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-4;
    const nx = -dy / len;
    const ny = dx / len;
    const lat = (Math.sin(p * Math.PI * 2 * fig.meanderFreq + fig.meanderPhase) * 0.7
      + Math.sin(p * Math.PI * 2 * fig.meanderFreq * 2.33 + fig.meanderPhase * 1.7 + 1.1) * 0.3)
      * Math.sin(p * Math.PI) * fig.meanderScale * len;
    return [a[0] + dx * e + nx * lat, a[1] + dy * e + ny * lat];
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
  const WORKER_TRAIL_SAMPLE_SEC = 0.6; // path-time spacing between samples
  const WORKER_TRAIL_MAX_SAMPLES = 200;
  const WORKER_TRAIL_BANDS = 7;        // alpha quantization → batched strokes
  const WORKER_TRAIL_ALPHA = 0.085;    // peak alpha of a fresh segment
  const WORKER_TRAIL_RGB = "22, 30, 44"; // trampled wet snow: cool dark grey-blue

  function getWorkerTrailSamples(fig, figIndex) {
    if (fig.trailSamples) return fig.trailSamples;
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
      const pose = workerPoseAt(fig, t, 0, figIndex);
      samples[j] = pose
        ? { t, px: pose.px, py: pose.py, fade: pose.fade }
        : { t, px: 0, py: 0, fade: 0 };
    }
    fig.trailSamples = samples;
    return samples;
  }

  // Resolve a figure's pose for normalized cycle time t (0..1).
  // Returns null while the figure is off-stage; otherwise
  // { px, py, heading, fade, walking, workPulse } in unit-disc
  // coordinates (caller scales by room half-extents).
  function workerPoseAt(fig, t, safeAge, figIndex) {
    if (t < fig.hiddenFrac) return null;
    const u = (t - fig.hiddenFrac) / (1 - fig.hiddenFrac); // active progress 0..1
    // Smooth fade in/out at the cycle boundaries (no popping).
    const FADE = 0.08;
    const fade = u < FADE ? u / FADE : u > 1 - FADE ? (1 - u) / FADE : 1;
    const anchors = fig.anchors;
    const legs = anchors.length - 1;
    // Segment layout across active time: work0,walk0,work1,walk1,…workN.
    const walkSeg = fig.walkShare / legs;
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
      if (rem < walkSeg) {
        const p = rem / walkSeg;
        const a = anchors[k];
        const b = anchors[k + 1];
        const pt = workerWalkPoint(fig, a, b, p);
        const EPS = 0.015;
        const ahead = workerWalkPoint(fig, a, b, Math.min(1, p + EPS));
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
      // Frostpunk generator warmth. Two layers, BOTH deterministic in
      // `age` (caller pre-scales age by the animation's speed, so the
      // speed slider drives pulse cadence automatically):
      //   1. breathing radial glow from the room centroid (ALWAYS
      //      paints — SSR trap: a frame that paints nothing strobes
      //      black in the encoded stream),
      //   2. wavy heat-shimmer strips rising slowly ('lighter').
      // (Phase 58-w3.7x: layer 3 — rising ember particles — removed
      // on operator feedback: the "bubbles" broke immersion.)
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
      const pulse = Math.sin(safeAge * Math.PI * 2 * 0.24) * 0.72
        + Math.sin(safeAge * Math.PI * 2 * 0.113 + 1.7) * 0.28; // -1..1
      const baseRadius = Math.max(12, Math.hypot(roomWidth, roomHeight) * 0.52);
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

      // Layer 2 is additive so it composes order-independently
      // with the glow and with sibling animations; restore the
      // caller's composite afterwards (it may already be 'lighter'
      // via the room concurrency lift — never downgrade it).
      const prevComposite = c.globalCompositeOperation;
      c.globalCompositeOperation = "lighter";

      // Layer 2 — heat shimmer: soft wavy vertical strips, very
      // subtle, slowly rising (wave pattern translates upward at
      // per-streak parallax speeds).
      const streakCount = Math.max(3, Math.min(
        HEAT_STREAK_MAX,
        Math.round(5 * visualCaps.nonCriticalDensityScale),
      ));
      const shimmerAmp = roomWidth * 0.03;
      const shimmerSegments = 8;
      for (let i = 0; i < streakCount; i += 1) {
        const s = HEAT_STREAKS[i];
        const x0 = roomMinX + (s.lane + s.laneJitter) * roomWidth;
        const risePhase = safeAge * (0.55 + s.parallax * 0.5);
        const streakAlpha = Math.min(0.10, (0.022 + 0.022 * (Math.sin(safeAge * 0.7 + s.wavePhase) + 1) / 2)
          * intensitySafe) * overall;
        if (streakAlpha <= 0.002) continue; // glow already painted this tick
        c.strokeStyle = `rgba(${coreR}, ${coreG}, ${coreB}, ${streakAlpha})`;
        c.lineWidth = Math.max(4, roomWidth * 0.055);
        c.lineCap = "round";
        c.beginPath();
        for (let seg = 0; seg <= shimmerSegments; seg += 1) {
          const t = seg / shimmerSegments;
          const y = roomMinY + roomHeight * (1.05 - t * 1.1);
          const wobble = Math.sin(t * Math.PI * 2 * s.waveFreq + s.wavePhase + risePhase) * shimmerAmp;
          const x = x0 + wobble;
          if (seg === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }

      c.globalCompositeOperation = prevComposite;
      return;
    }

    if (type === "city-workers") {
      // Phase 58-w3.7y — sparse top-down inhabitants animating the
      // Frostpunk crater city. Dark, slow, occasional: tiny near-black
      // silhouettes (shoulders ellipse + head dot + soft shadow) that
      // trudge between seeded anchor points, pause to "work", and fade
      // out again. Knobs: intensity = inhabitant count, speed = pace
      // (caller pre-scales age), opacity standard, colorHex = lantern
      // tint. Caller has clipped to the room polygon already.
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
      // default — both still deterministic).
      const scene = getWorkerScene(String(room?.id ?? options.roomId ?? "preview"));
      // Inhabitant count — sparse by design: ~4 figures at the 0.8
      // default intensity, scaled per room (countScale ×0.75..1.3) and
      // capped by the runtime quality scale. Only a fraction of them
      // are on-stage at any moment (hiddenFrac).
      const figureCount = Math.max(1, Math.min(
        WORKER_MAX,
        Math.round(4.5 * intensitySafe * scene.countScale * visualCaps.nonCriticalDensityScale),
      ));
      // Figure length relative to the polygon with absolute clamps —
      // workers must stay SMALL against the building art on the tiles.
      const baseFigLen = Math.max(2, Math.min(7, roomWidth * 0.025));
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
      // opacity knob only (sqrt) — no new schema fields.
      if (overall > 0.02) {
        const trailProminence = Math.sqrt(overall);
        const prevCap = c.lineCap;
        const prevJoin = c.lineJoin;
        // Butt caps on purpose: round caps double-stamp at every band
        // boundary (path flushes) and beaded the trail with dark dots;
        // round JOINS still keep the in-path corners soft.
        c.lineCap = "butt";
        c.lineJoin = "round";
        for (let i = 0; i < figureCount; i += 1) {
          const fig = scene.figures[i];
          const samples = getWorkerTrailSamples(fig, i);
          const segCount = samples.length - 1;
          const cd = fig.cycleDur;
          // ≈ shoulder span of this figure (slightly wider) so the
          // track reads as stamped by exactly this silhouette. Group
          // members' per-anchor scatter keeps their tracks offset —
          // a loosely braided band along shared group legs.
          const trailW = Math.max(1.6, baseFigLen * fig.sizeJitter * 1.45);
          const strokeBand = (bandIdx) => {
            if (bandIdx < 0) return;
            // Single low-alpha stroke per band: at these alphas the
            // AA edge already reads soft; a second "halo" stroke
            // doubled the rasterization cost and beaded the path.
            const a = WORKER_TRAIL_ALPHA * ((bandIdx + 0.5) / WORKER_TRAIL_BANDS) * trailProminence;
            c.lineWidth = trailW;
            c.strokeStyle = `rgba(${WORKER_TRAIL_RGB}, ${a.toFixed(4)})`;
            c.stroke();
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
                c.beginPath();
                c.moveTo(roomX + s0.px * halfW, roomY + s0.py * halfH);
              }
              c.lineTo(roomX + s1.px * halfW, roomY + s1.py * halfH);
            }
            strokeBand(band);
          }
        }
        c.lineCap = prevCap;
        c.lineJoin = prevJoin;
      }

      for (let i = 0; i < figureCount; i += 1) {
        const fig = scene.figures[i];
        const t = (safeAge / fig.cycleDur + fig.phase) % 1;
        const pose = workerPoseAt(fig, t, safeAge, i);
        if (!pose) continue; // off-stage — vignette above already painted
        const figLen = baseFigLen * fig.sizeJitter;
        const alpha = 0.82 * pose.fade * overall;
        if (alpha <= 0.01) continue;

        let x = roomX + pose.px * halfW;
        let y = roomY + pose.py * halfH;
        let heading = pose.heading;
        if (pose.walking) {
          // Walk shuffle (humanized, w3.7z): along-axis stride pulse +
          // perpendicular body bob at half the step rate, both scaled
          // by the CURRENT pace from the warped progress — the bob
          // swells mid-stride and settles as the figure eases into a
          // stop or hesitates, so starts/stops read as weight shifts
          // instead of a vehicle braking. Constant step frequency
          // (amplitude carries the pace cue) keeps the oscillators
          // free of phase drift — fully deterministic in `age`.
          const pace = Math.max(0, Math.min(1.8, Number.isFinite(pose.pace) ? pose.pace : 1));
          const stepPhase = safeAge * fig.stepFreq + i * 2.3;
          const along = Math.sin(stepPhase) * figLen * (0.04 + 0.07 * pace);
          x += Math.cos(heading) * along;
          y += Math.sin(heading) * along;
          const bob = Math.sin(stepPhase * 0.5 + fig.gaitSeed) * figLen * (0.025 + 0.05 * pace);
          x += -Math.sin(heading) * bob;
          y += Math.cos(heading) * bob;
          // Slight heading wobble synced to the step cycle.
          heading += Math.sin(stepPhase * 0.5 + fig.gaitSeed + 0.8) * 0.10 * (0.4 + 0.6 * pace);
        } else {
          // Working: lean rhythmically along the facing axis (strike /
          // shovel motion) — subtle, the figure stays put.
          x += Math.cos(heading) * pose.workPulse * figLen * 0.14;
          y += Math.sin(heading) * pose.workPulse * figLen * 0.14;
          heading += Math.sin(safeAge * 0.23 + i * 0.9) * 0.18; // slow stance sway
        }

        c.save();
        c.translate(x, y);
        c.rotate(heading);
        // Faint soft shadow, slightly offset — sells "seen from above".
        c.fillStyle = `rgba(0, 0, 0, ${(alpha * 0.35).toFixed(3)})`;
        c.beginPath();
        c.ellipse(figLen * 0.06, figLen * 0.22, figLen * 0.62, figLen * 0.40, 0, 0, Math.PI * 2);
        c.fill();
        // Shoulders — near-black with a cold blue-grey tint, wider
        // across the walking axis than along it (top-down torso).
        c.fillStyle = `rgba(15, 19, 27, ${alpha.toFixed(3)})`;
        c.beginPath();
        c.ellipse(0, 0, figLen * 0.34, figLen * 0.52, 0, 0, Math.PI * 2);
        c.fill();
        // Head dot, offset toward the walking direction.
        c.fillStyle = `rgba(9, 12, 18, ${Math.min(1, alpha * 1.1).toFixed(3)})`;
        c.beginPath();
        c.arc(figLen * 0.22, 0, figLen * 0.24, 0, Math.PI * 2);
        c.fill();
        // Sparse warm accent: a faint hand lantern on a few figures.
        // Additive so the glow lifts instead of muddying; restore the
        // caller's composite afterwards (it may already be 'lighter'
        // via the room concurrency lift — never downgrade it).
        if (fig.hasLantern) {
          c.globalCompositeOperation = "lighter";
          const lanternX = figLen * 0.10;
          const lanternY = fig.lanternSide * figLen * 0.5;
          const flicker = 0.8 + 0.2 * Math.sin(safeAge * 6.3 + i * 3.1);
          const glowR = figLen * 1.15;
          const glow = c.createRadialGradient(lanternX, lanternY, 0.2, lanternX, lanternY, glowR);
          glow.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, ${(alpha * 0.30 * flicker).toFixed(3)})`);
          glow.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);
          c.fillStyle = glow;
          c.beginPath();
          c.arc(lanternX, lanternY, glowR, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = `rgba(${lr}, ${lg}, ${lb}, ${(alpha * 0.55 * flicker).toFixed(3)})`;
          c.beginPath();
          c.arc(lanternX, lanternY, Math.max(0.5, figLen * 0.13), 0, Math.PI * 2);
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
    // evidence). Render path never reads this.
    __cityWorkersDiag: { getWorkerScene, workerPoseAt, getWorkerTrailSamples },
  };
})();
