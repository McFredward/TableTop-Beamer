// Encoder dead-zone reproduction + fix A/B.
//
// Renders the REAL city-workers figures (positions/tones from the
// __cityWorkersDiag pure math) at the real output scale (1920x1080),
// encodes the frame sequence through the SAME class of block encoder
// the SSR→/output pipeline uses (VP9 @ 16 Mbps, 30 fps, the operator's
// configured codec/bitrate), decodes, and measures each figure's
// luminance-weighted centroid per frame.
//
// SOURCE centroid (pre-encode) is the ground truth (smooth, sub-pixel).
// ENCODED centroid reveals the per-figure stutter: multi-frame plateaus
// then jumps when a dim/slow figure's per-frame residual falls in the
// quantization dead-zone.
//
// variant "hard" = current render (crisp ellipse fills).
// variant "soft" = candidate fix (figures carry a feathered sub-pixel
//                  penumbra → low-freq gradient that survives quantization).

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const SRC = path.resolve(__dirname, "../../src/app/runtime/render/runtime-effect-visuals.js");
global.window = {};
global.performance = { now: () => Date.now() };
(0, eval)(fs.readFileSync(SRC, "utf8"));
const diag = global.window.TT_BEAMER_RUNTIME_EFFECT_VISUALS.__cityWorkersDiag;

const W = 1920, H = 1080, FPS = 30;
const SECONDS = Number(process.argv[3] || 5);
const N = FPS * SECONDS;
const startAge = 40;
const VARIANT = process.argv[2] || "hard"; // hard | soft
// lever knobs (sweep)
const CLOTH = Number(process.env.CLOTH || 0.4);   // dim coat
const SOFT_W = Number(process.env.SOFT_W || 0.9); // feather width frac
const BREATHE = Number(process.env.BREATHE || 0); // per-frame luma breathing amplitude
const BREATHE_HZ = Number(process.env.BREATHE_HZ || 0.8);
const BOBSCALE = Number(process.env.BOBSCALE || 1); // multiply bob/along amplitude
const ORBIT_R = Number(process.env.ORBIT_R || 0);   // micro-orbit radius (px)
const ORBIT_HZ = Number(process.env.ORBIT_HZ || 1.1);
const TMP = path.resolve(__dirname, "enc-" + VARIANT);
fs.mkdirSync(TMP, { recursive: true });

// room tile geometry on the full board
const roomWidth = 133, roomHeight = 133;
const halfW = roomWidth * 0.5, halfH = roomHeight * 0.5;
const roomX = 960, roomY = 540;
const baseFigLen = Math.max(2, Math.min(7, roomWidth * 0.025));

const scene = diag.getWorkerScene("room-3", { groups: "normal", lanternShare: 30 });
const figures = scene.figures;
const figureCount = Math.min(figures.length, Math.max(1, Math.round(8 * scene.countScale)));

// per-figure dim factor: emulate the clothing-brightness slider — make
// the non-lantern figures DIM (the operator's "dim survivors"); lantern
// carriers stay bright. This is the brightness axis of the symptom.
function clothingMulFor(fig, i) { return fig.hasLantern ? 1.0 : CLOTH; }

// lit coat tone for figure (faithful to WORKER_COAT_PALETTE_LIT)
const LIT = [
  [130,144,170],[146,151,160],[162,146,124],[122,142,170],
  [174,136,126],[132,151,136],[151,143,160],
];

function drawnPose(fig, i, safeAge) {
  const t = (safeAge / fig.cycleDur + fig.phase) % 1;
  const pose = diag.workerPoseAt(fig, t, safeAge, i);
  if (!pose) return null;
  let x = roomX + pose.px * halfW, y = roomY + pose.py * halfH;
  let heading = pose.heading;
  const figLen = baseFigLen * fig.sizeJitter;
  if (pose.walking) {
    const pace = Math.max(0, Math.min(1.8, Number.isFinite(pose.pace) ? pose.pace : 1));
    const stepPhase = safeAge * fig.stepFreq + i * 2.3;
    const along = Math.sin(stepPhase) * figLen * (0.03 + 0.05 * pace) * BOBSCALE;
    x += Math.cos(heading) * along; y += Math.sin(heading) * along;
    const bob = Math.sin(stepPhase + fig.gaitSeed) * figLen * (0.02 + 0.035 * pace) * BOBSCALE;
    x += -Math.sin(heading) * bob; y += Math.cos(heading) * bob;
    // constant-speed micro-orbit (candidate fix): keeps per-frame motion
    // above the grid-quantization dead-zone while averaging to zero (net
    // trudge intact). Phase-locked to the figure's OWN step cadence
    // (stepPhase) so it adds no new tempo — reads as the body rocking with
    // each heavy step — and radius scales with figLen so the lift is
    // proportional. A CIRCLE (cos/sin) has no velocity zero-crossing, so
    // instantaneous speed never dips back into the dead-zone.
    if (ORBIT_R > 0) {
      const ramp = Math.min(1, pace * 1.5); // ease in/out with stride
      const aq = figLen * ORBIT_R * ramp;
      const ph = safeAge * 2 * Math.PI * ORBIT_HZ + (fig.gaitSeed || 0); // fixed rate
      x += Math.cos(ph) * aq;
      y += Math.sin(ph) * aq;
    }
  }
  return { x, y, heading, figLen, walking: pose.walking, fade: pose.fade };
}

// ---- tiny AA rasterizer (3x supersample) onto an RGB buffer --------
function makeFrame() { return new Float32Array(W * H * 3); }
function addEllipse(buf, cx, cy, rx, ry, rgb, alpha, soft) {
  // soft>0 → feathered radial falloff extending soft*max(rx,ry) beyond edge
  const SS = 3;
  const ext = soft > 0 ? soft : 0;
  const RX = rx * (1 + ext), RY = ry * (1 + ext);
  const x0 = Math.max(0, Math.floor(cx - RX - 1)), x1 = Math.min(W - 1, Math.ceil(cx + RX + 1));
  const y0 = Math.max(0, Math.floor(cy - RY - 1)), y1 = Math.min(H - 1, Math.ceil(cy + RY + 1));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      let cov = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const fx = px + (sx + 0.5) / SS, fy = py + (sy + 0.5) / SS;
        const nx = (fx - cx) / rx, ny = (fy - cy) / ry;
        const r = Math.hypot(nx, ny);
        if (soft > 0) {
          // 1.0 inside core, smooth falloff to 0 at r = 1+soft
          if (r <= 1) cov += 1;
          else if (r < 1 + soft) { const u = (r - 1) / soft; cov += (1 - u) * (1 - u) * (3 - 2 * (1 - u)); }
        } else {
          if (r <= 1) cov += 1;
        }
      }
      cov /= SS * SS;
      if (cov <= 0) continue;
      const a = alpha * cov;
      const o = (py * W + px) * 3;
      buf[o] = buf[o] + (rgb[0] - buf[o]) * a;
      buf[o+1] = buf[o+1] + (rgb[1] - buf[o+1]) * a;
      buf[o+2] = buf[o+2] + (rgb[2] - buf[o+2]) * a;
    }
  }
}
function addGlow(buf, cx, cy, R, rgb, peak) { // additive radial (lantern)
  const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
  const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const d = Math.hypot(px - cx, py - cy) / R; if (d >= 1) continue;
    const a = peak * (1 - d) * (1 - d);
    const o = (py * W + px) * 3;
    buf[o] = Math.min(255, buf[o] + rgb[0] * a);
    buf[o+1] = Math.min(255, buf[o+1] + rgb[1] * a);
    buf[o+2] = Math.min(255, buf[o+2] + rgb[2] * a);
  }
}

function renderFrame(safeAge) {
  const buf = makeFrame();
  for (let i = 0; i < figureCount; i++) {
    const fig = figures[i];
    const dp = drawnPose(fig, i, safeAge);
    if (!dp) continue;
    const figLen = dp.figLen;
    const mul = clothingMulFor(fig, i);
    const base = LIT[fig.coatIdx ?? 0] ?? LIT[0];
    const coat = base.map((v) => v * mul);
    const under = base.map((v) => v * 0.42 * mul);
    const breathe = BREATHE > 0 ? (1 + BREATHE * Math.sin(safeAge * 2 * Math.PI * BREATHE_HZ + (fig.gaitSeed || 0))) : 1;
    const alpha = 0.82 * dp.fade * (fig.hasLantern ? 1 : breathe);
    const bodyA = Math.min(1, alpha * 1.15);
    const soft = VARIANT === "soft" ? SOFT_W : 0; // feather width as frac of radius
    // under/shadow base — THIS is the shape converted to a soft penumbra in the fix
    addEllipse(buf, dp.x + figLen*0.06, dp.y + figLen*0.22, figLen*0.62, figLen*0.40, under, bodyA*0.5, soft);
    // coat
    addEllipse(buf, dp.x, dp.y, figLen*0.34, figLen*0.52, coat, bodyA, soft > 0 ? 0.5 : 0);
    // head
    addEllipse(buf, dp.x + figLen*0.2, dp.y, figLen*0.19, figLen*0.19, coat.map(v=>Math.min(255,v*1.08)), bodyA, soft>0?0.5:0);
    if (fig.hasLantern) {
      addGlow(buf, dp.x, dp.y + figLen*0.5, figLen*2.4, [255,180,90], alpha*0.46);
      addGlow(buf, dp.x, dp.y + figLen*0.5, Math.max(1,figLen*0.2), [255,210,140], alpha*0.95);
    }
  }
  return buf;
}

// write raw rgb24 frames
const rawPath = path.join(TMP, "src.rgb");
const fd = fs.openSync(rawPath, "w");
const u8 = Buffer.alloc(W * H * 3);
const srcCentroids = []; // per frame, per figure
for (let f = 0; f < N; f++) {
  const age = startAge + f / FPS;
  const buf = renderFrame(age);
  for (let k = 0; k < buf.length; k++) u8[k] = Math.max(0, Math.min(255, buf[k] | 0));
  fs.writeSync(fd, u8);
  // source centroids per figure (luminance-weighted in a box)
  const row = [];
  for (let i = 0; i < figureCount; i++) {
    const dp = drawnPose(figures[i], i, age);
    row.push(dp ? { x: dp.x, y: dp.y, walking: dp.walking, lantern: figures[i].hasLantern } : null);
  }
  srcCentroids.push(row);
}
fs.closeSync(fd);

// encode through VP9 @ 16Mbps 30fps -g 60 (operator config), then decode to raw
const encPath = path.join(TMP, "out.webm");
execFileSync("ffmpeg", ["-y","-f","rawvideo","-pix_fmt","rgb24","-s",`${W}x${H}`,"-r",`${FPS}`,
  "-i",rawPath,"-c:v","libvpx-vp9","-b:v","16M","-deadline","realtime","-cpu-used","4",
  "-g","60","-r",`${FPS}`,encPath], { stdio: "ignore" });
const decPath = path.join(TMP, "dec.rgb");
execFileSync("ffmpeg", ["-y","-i",encPath,"-f","rawvideo","-pix_fmt","rgb24",decPath], { stdio: "ignore" });

// measure encoded centroid per figure within a 24px window around source pos
const frameBytes = W * H * 3;
// Stream frames: read each frame on demand into a reusable buffer.
const srcFd = fs.openSync(rawPath, "r");
const decFd = fs.openSync(decPath, "r");
const srcBuf = Buffer.alloc(frameBytes);
const decBuf = Buffer.alloc(frameBytes);
function readFrame(fd, f, buf) { fs.readSync(fd, buf, 0, frameBytes, f * frameBytes); }
function lumCentroidIn(buf, cx, cy, win) {
  let sw = 0, sx = 0, sy = 0;
  const x0 = Math.max(0, Math.round(cx - win)), x1 = Math.min(W - 1, Math.round(cx + win));
  const y0 = Math.max(0, Math.round(cy - win)), y1 = Math.min(H - 1, Math.round(cy + win));
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const o = (py * W + px) * 3;
    const l = 0.299*buf[o] + 0.587*buf[o+1] + 0.114*buf[o+2];
    if (l < 6) continue;
    sw += l; sx += l * px; sy += l * py;
  }
  return sw > 0 ? { x: sx / sw, y: sy / sw, mass: sw } : null;
}

// analyze a chosen figure index
function analyze(idx) {
  let prevEnc = null, prevSrc = null, prevSrcMeas = null;
  let encZeroRuns = 0, curRun = 0, maxRun = 0, encMoves = 0, encJumpMax = 0;
  let srcMeasMaxRun = 0, srcMeasCurRun = 0;
  const encDeltas = [], srcDeltas = [], srcMeasDeltas = [];
  for (let f = 0; f < N; f++) {
    const s = srcCentroids[f][idx];
    if (!s || !s.walking) { prevEnc = null; prevSrc = null; prevSrcMeas = null; curRun = 0; srcMeasCurRun = 0; continue; }
    readFrame(decFd, f, decBuf); readFrame(srcFd, f, srcBuf);
    const e = lumCentroidIn(decBuf, s.x, s.y, 14);
    const sm = lumCentroidIn(srcBuf, s.x, s.y, 14); // measured source centroid
    if (prevSrc) { const d = Math.hypot(s.x - prevSrc.x, s.y - prevSrc.y); srcDeltas.push(d); }
    if (sm && prevSrcMeas) {
      const d = Math.hypot(sm.x - prevSrcMeas.x, sm.y - prevSrcMeas.y); srcMeasDeltas.push(d);
      if (d < 0.04) { srcMeasCurRun++; if (srcMeasCurRun > srcMeasMaxRun) srcMeasMaxRun = srcMeasCurRun; } else srcMeasCurRun = 0;
    }
    if (e && prevEnc) {
      const d = Math.hypot(e.x - prevEnc.x, e.y - prevEnc.y);
      encDeltas.push(d);
      if (d < 0.04) { curRun++; if (curRun > maxRun) maxRun = curRun; }
      else { if (curRun >= 2) encZeroRuns++; if (d > encJumpMax) encJumpMax = d; encMoves++; curRun = 0; }
    }
    prevSrc = s; prevSrcMeas = sm || prevSrcMeas; prevEnc = e || prevEnc;
  }
  const mean = (a) => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
  return {
    idx, lantern: figures[idx].hasLantern, walkFrames: srcDeltas.length,
    srcMeanDelta: +mean(srcDeltas).toFixed(4),
    srcMeasMaxFrozenRun: srcMeasMaxRun,  // frozen runs in MEASURED source (rasterizer check)
    encMeanDelta: +mean(encDeltas).toFixed(4),
    encMaxFrozenRun: maxRun,             // longest run of frozen (encoded) frames
    encPlateauThenJump: encZeroRuns,     // # of plateau→jump stutter events
    encJumpMax_px: +encJumpMax.toFixed(3),
  };
}

// optional per-frame encoded-centroid trace for one figure (TRACE=idx)
if (process.env.TRACE) {
  const idx = Number(process.env.TRACE);
  let prev = null;
  console.log(`# frame\tencX\tencY\tdeltaPx   (figure ${idx}, ${VARIANT}, ORBIT_R=${ORBIT_R})`);
  for (let f = 0; f < N; f++) {
    const s = srcCentroids[f][idx];
    if (!s || !s.walking) { prev = null; continue; }
    readFrame(decFd, f, decBuf);
    const e = lumCentroidIn(decBuf, s.x, s.y, 14);
    if (!e) continue;
    const d = prev ? Math.hypot(e.x - prev.x, e.y - prev.y) : 0;
    console.log(`${f}\t${e.x.toFixed(3)}\t${e.y.toFixed(3)}\t${d.toFixed(3)}${prev && d < 0.04 ? "  <FROZEN>" : ""}`);
    prev = e;
  }
  process.exit(0);
}

const out = [];
for (let i = 0; i < figureCount; i++) {
  const anyWalk = srcCentroids.some((r) => r[i] && r[i].walking);
  if (anyWalk) out.push(analyze(i));
}
console.log("VARIANT:", VARIANT, "figureCount:", figureCount);
console.log(JSON.stringify(out, null, 2));
