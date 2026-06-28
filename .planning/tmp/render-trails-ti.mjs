import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const REPO = "/home/claw/tt-beamer";
const SCRIPT = fs.readFileSync(
  path.join(REPO, "src/app/runtime/render/runtime-effect-visuals.js"),
  "utf8",
);
const BOARD_B64 = fs.readFileSync(
  path.join(REPO, "config/boards/assets/frostpunk-mpfzrpgp.png"),
).toString("base64");

const OUTDIR = process.argv[2];
const TAG = process.argv[3]; // e.g. "new" | "old"
fs.mkdirSync(OUTDIR, { recursive: true });

const W = 900, H = 900;

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
await page.setContent(`<!doctype html><html><body style="margin:0">
<canvas id="cv" width="${W}" height="${H}"></canvas>
</body></html>`);
await page.addScriptTag({ content: SCRIPT });

const result = await page.evaluate(async (boardB64, w, h) => {
  const api = window.TT_BEAMER_RUNTIME_EFFECT_VISUALS;
  const canvas = document.getElementById("cv");
  const c = canvas.getContext("2d");
  api.init({
    canvas,
    canvasCtx: c,
    state: { boardId: "frostpunk" },
    getRoomLabelPosition: () => ({ x: 0.5, y: 0.5 }),
    getRuntimeVisualCaps: () => ({ nonCriticalDensityScale: 1 }),
    clampOutsideSpeed: (s) => s,
    flickerNoise: () => 0,
  });

  // Centered room with a strong center exclusion so all workers crowd a
  // thin annular corridor → maximal overlap (the worst case for compounding).
  const cx = w / 2, cy = h / 2;
  const rw = 760, rh = 760;
  const roomMetrics = {
    centerX: cx, centerY: cy, width: rw, height: rh,
    minX: cx - rw / 2, minY: cy - rh / 2, radius: rw / 2,
  };
  const room = { id: "frostpunk::overlap-test" };

  const board = new Image();
  await new Promise((res) => { board.onload = res; board.src = "data:image/png;base64," + boardB64; });

  // Stats over the room bbox, on a BLACK background (no board), so the
  // measured luminance is the effect's own light (figures + vignette + trails).
  function render({ style, workerCount, withBoard }) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, w, h);
    if (withBoard) {
      c.drawImage(board, 0, 0, w, h);
    } else {
      c.fillStyle = "#000";
      c.fillRect(0, 0, w, h);
    }
    // Room clip (square bbox is fine for the test)
    c.save();
    c.beginPath();
    c.rect(roomMetrics.minX, roomMetrics.minY, rw, rh);
    c.clip();
    api.drawEffectVisual("city-workers", 220, 1, room, roomMetrics, {
      workerStyle: style,
      workerCount,
      opacity: 1,
      workerTrails: true,
      workerTrailIntensity: Number(window.__TI || 100),
      workerSize: 1,
      workerCenterExclusion: true,
      workerCenterExclusionRadius: 0.62,
      workerExclusionRingVisible: false,
    });
    c.restore();
  }

  function stats() {
    const img = c.getImageData(roomMetrics.minX, roomMetrics.minY, rw, rh).data;
    let sum = 0, n = 0;
    const lums = [];
    for (let p = 0; p < img.length; p += 4) {
      const lum = 0.2126 * img[p] + 0.7152 * img[p + 1] + 0.0722 * img[p + 2];
      sum += lum; n += 1;
      if (lum > 1) lums.push(lum);
    }
    lums.sort((a, b) => a - b);
    const pct = (q) => lums.length ? lums[Math.min(lums.length - 1, Math.floor(q * lums.length))] : 0;
    return {
      mean: +(sum / n).toFixed(3),
      litFrac: +(lums.length / n).toFixed(4),
      p50: +pct(0.5).toFixed(1),
      p99: +pct(0.99).toFixed(1),
      max: +(lums.length ? lums[lums.length - 1] : 0).toFixed(1),
    };
  }

  const out = {};
  const shots = {};
  for (const style of ["dark", "lit"]) {
    for (const cnt of [1, 8]) {
      render({ style, workerCount: cnt, withBoard: false });
      out[`${style}_${cnt}_black`] = stats();
      shots[`${style}_${cnt}_black`] = canvas.toDataURL("image/png");
      render({ style, workerCount: cnt, withBoard: true });
      shots[`${style}_${cnt}_board`] = canvas.toDataURL("image/png");
    }
  }
  return { out, shots };
}, BOARD_B64, W, H);

console.log(JSON.stringify(result.out, null, 2));
for (const [k, dataUrl] of Object.entries(result.shots)) {
  const b64 = dataUrl.split(",")[1];
  fs.writeFileSync(path.join(OUTDIR, `${TAG}_${k}.png`), Buffer.from(b64, "base64"));
}
fs.writeFileSync(path.join(OUTDIR, `${TAG}_stats.json`), JSON.stringify(result.out, null, 2));
await browser.close();
console.log("WROTE", OUTDIR, TAG);
