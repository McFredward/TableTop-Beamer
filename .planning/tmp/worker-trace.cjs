// Authoritative per-figure position trace for city-workers.
// Loads the runtime-effect-visuals IIFE with a window shim and drives
// the exposed __cityWorkersDiag hook (the SAME pure math the SSR canvas
// renders), then reconstructs the FULL drawn x,y (base pose + walk
// along/bob) exactly as the figure draw branch does. No rounding is
// applied anywhere — this is the ground-truth source motion.

const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "../../src/app/runtime/render/runtime-effect-visuals.js");
const code = fs.readFileSync(SRC, "utf8");

// minimal browser shims
global.window = {};
global.performance = { now: () => Date.now() };
// eslint-disable-next-line no-eval
(0, eval)(code);

const VIS = global.window.TT_BEAMER_RUNTIME_EFFECT_VISUALS;
const diag = VIS.__cityWorkersDiag;

// ---- scene + geometry (mimics the draw branch defaults) -------------
const roomKey = process.argv[2] || "room-3";
const roomWidth = 133;            // operator's tile width (px)
const roomHeight = 133;
const halfW = roomWidth * 0.5;
const halfH = roomHeight * 0.5;
const roomX = 1000;               // arbitrary canvas offset (pure translate)
const roomY = 600;
const workerSizeMul = 1;
const baseFigLen = Math.max(2, Math.min(7, roomWidth * 0.025)) * workerSizeMul; // = 3.325

const scene = diag.getWorkerScene(roomKey, { groups: "normal", lanternShare: 30 });
const figures = scene.figures;
const baseCount = 8;
const figureCount = Math.min(figures.length, Math.max(1, Math.round(baseCount * scene.countScale)));

// Reconstruct the exact drawn (x,y) for a figure at wall-time safeAge.
function drawnPose(fig, i, safeAge) {
  const t = (safeAge / fig.cycleDur + fig.phase) % 1;
  const pose = diag.workerPoseAt(fig, t, safeAge, i);
  if (!pose) return null;
  let x = roomX + pose.px * halfW;
  let y = roomY + pose.py * halfH;
  let heading = pose.heading;
  const figLen = baseFigLen * fig.sizeJitter;
  if (pose.walking) {
    const pace = Math.max(0, Math.min(1.8, Number.isFinite(pose.pace) ? pose.pace : 1));
    const stepPhase = safeAge * fig.stepFreq + i * 2.3;
    const along = Math.sin(stepPhase) * figLen * (0.03 + 0.05 * pace);
    x += Math.cos(heading) * along;
    y += Math.sin(heading) * along;
    const bob = Math.sin(stepPhase + fig.gaitSeed) * figLen * (0.02 + 0.035 * pace);
    x += -Math.sin(heading) * bob;
    y += Math.cos(heading) * bob;
  } else {
    x += Math.cos(heading) * pose.workPulse * figLen * 0.14;
    y += Math.sin(heading) * pose.workPulse * figLen * 0.14;
  }
  return { x, y, walking: pose.walking, fade: pose.fade, figLen };
}

const FPS = 30;
const SECONDS = Number(process.argv[3] || 12);
const startAge = Number(process.argv[4] || 40); // skip fade-in

// For each figure, trace per-frame displacement magnitude.
const N = FPS * SECONDS;
const stats = [];
for (let i = 0; i < figureCount; i++) {
  const fig = figures[i];
  let prev = null;
  let walkFrames = 0;
  let plateauRuns = 0;     // consecutive walking frames with |delta| < 0.01px
  let curPlateau = 0;
  let maxPlateau = 0;
  const deltas = [];
  let sumDelta = 0;
  for (let f = 0; f < N; f++) {
    const age = startAge + f / FPS;
    const dp = drawnPose(fig, i, age);
    if (!dp || !dp.walking) { prev = dp ? { x: dp.x, y: dp.y } : null; curPlateau = 0; continue; }
    walkFrames++;
    if (prev) {
      const d = Math.hypot(dp.x - prev.x, dp.y - prev.y);
      deltas.push(d);
      sumDelta += d;
      if (d < 0.01) { curPlateau++; if (curPlateau > maxPlateau) maxPlateau = curPlateau; }
      else { if (curPlateau >= 2) plateauRuns++; curPlateau = 0; }
    }
    prev = { x: dp.x, y: dp.y };
  }
  deltas.sort((a, b) => a - b);
  const meanDelta = walkFrames ? sumDelta / deltas.length : 0;
  const minDelta = deltas.length ? deltas[0] : 0;
  const medDelta = deltas.length ? deltas[Math.floor(deltas.length / 2)] : 0;
  // brightness proxy: lit coats differ; lantern carriers far brighter.
  stats.push({
    i,
    hasLantern: fig.hasLantern,
    sizeJitter: +fig.sizeJitter.toFixed(2),
    figLen: +(baseFigLen * fig.sizeJitter).toFixed(2),
    trudge: +(fig.trudgeSpeed ?? 0).toFixed(4),
    walkFrames,
    minDelta_px: +minDelta.toFixed(4),
    medDelta_px: +medDelta.toFixed(4),
    meanDelta_px: +meanDelta.toFixed(4),
    maxIntegerPlateauFrames: maxPlateau,
    subPixelPlateauRuns: plateauRuns,
  });
}

console.log("figureCount:", figureCount, "baseFigLen:", baseFigLen.toFixed(3));
console.log(JSON.stringify(stats, null, 2));

// Summary: is ANY computed per-frame delta exactly zero across multiple frames (rounding/stall signature)?
const anyHardPlateau = stats.some((s) => s.maxIntegerPlateauFrames >= 2 && s.medDelta_px < 0.001);
console.log("\nANY multi-frame ZERO-motion plateau (rounding/stall signature)?", anyHardPlateau);
console.log("Slowest median per-frame delta across figures:", Math.min(...stats.map((s) => s.medDelta_px)), "px");
console.log("Fastest median per-frame delta across figures:", Math.max(...stats.map((s) => s.medDelta_px)), "px");
