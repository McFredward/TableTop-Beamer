import { readFileSync, writeFileSync, readdirSync } from "node:fs";

// Phase 14-2: runtime modules now split across src/app/runtime/*.js.
// Concat all .js files so location-pinned greps still resolve moved
// symbols.
const runtimeDir = new URL("../src/app/runtime/", import.meta.url);
const runtimeSource = readdirSync(runtimeDir, { recursive: true, withFileTypes: false })
  .filter((name) => name.endsWith(".js"))
  .sort()
  .map((name) => readFileSync(new URL(name, runtimeDir), "utf8"))
  .join("\n");

// --- Static code checks ---------------------------------------------------

// 1. Render loop iterates state.runningAnimations in insertion order with no
//    per-room additive-layering guard.
const rendersInsertionOrder =
  runtimeSource.includes("for (const anim of state.runningAnimations) {")
  && runtimeSource.includes("const ok = drawAnimationSafely(anim, now);");

// 2. Coded room effects draw full-canvas fills with near-opaque alpha that
//    will obscure anything beneath them inside the same clip region.
const powerOutageOpaqueFill =
  runtimeSource.includes('if (type === "power-outage") {')
  && runtimeSource.includes("const alpha = 0.76 + pulse * 0.2;")
  && runtimeSource.includes("ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;");

const intruderAlertFullFill =
  runtimeSource.includes('if (type === "intruder-alert") {')
  && runtimeSource.includes("ctx.fillStyle = `rgba(255, 45, 45, ${(0.1 + pulse * 0.24) * intensity})`;")
  && runtimeSource.includes("ctx.fillRect(0, 0, w, h);");

// 3. No per-room concurrency detection / no additive composite switch in the
//    main draw loop yet.
//
// Phase 14-2: fix-detection relaxed — the draw loop now lives in
// runtime-draw-loop.js where the 2D canvas context is named `c`, and
// the P12-T4 fix ships as `roomConcurrencyByKey`. Recognise both the
// legacy and extracted forms.
const hasRoomConcurrencyMap =
  runtimeSource.includes("roomConcurrencyMap")
  || runtimeSource.includes("roomAnimationConcurrencyByRoom")
  || runtimeSource.includes("roomConcurrencyByKey");

const hasAdditiveLayeringGuard =
  runtimeSource.includes('ctx.globalCompositeOperation = "lighter"')
  || runtimeSource.includes("ctx.globalCompositeOperation = 'lighter'")
  || runtimeSource.includes('c.globalCompositeOperation = "lighter"');

// --- Simulation of order-dependent alpha blending -------------------------
// Models the `drawRoomComposition` path for two stacked room animations.
// Each animation supplies a full-clip rectangle with its own color/alpha.
// The render loop draws in insertion order without resetting compositing,
// so the result is classic `source-over` alpha blending.

const srcOver = (dst, src) => {
  const outA = src.a + dst.a * (1 - src.a);
  if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (src.r * src.a + dst.r * dst.a * (1 - src.a)) / outA,
    g: (src.g * src.a + dst.g * dst.a * (1 - src.a)) / outA,
    b: (src.b * src.a + dst.b * dst.a * (1 - src.a)) / outA,
    a: outA,
  };
};

const alarmPulse = { r: 255, g: 45, b: 45, a: 0.34 }; // intruder-alert peak alpha (0.1 + 1*0.24)
const malfunctionDark = { r: 0, g: 0, b: 0, a: 0.96 }; // power-outage peak alpha (0.76 + 1*0.2)
const roomBackground = { r: 20, g: 22, b: 30, a: 1 }; // approx. cleared ship background

const compose = (layers) => layers.reduce((acc, layer) => srcOver(acc, layer), roomBackground);

// Order A: alarm first, then malfunction (user-reported FAIL path).
const composedAlarmThenMalfunction = compose([alarmPulse, malfunctionDark]);
// Order B: malfunction first, then alarm (user-reported visible path).
const composedMalfunctionThenAlarm = compose([malfunctionDark, alarmPulse]);

// "Alarm visible" = red channel clearly elevated over the dark ship
// background (r=20). Threshold 50 separates the two regimes cleanly:
// alarm-then-malfunction collapses to r≈4 (hidden), malfunction-then-alarm
// lifts to r≈87 (visible red tint).
const alarmVisibleInFailOrder = composedAlarmThenMalfunction.r > 50;
const alarmVisibleInPassOrder = composedMalfunctionThenAlarm.r > 50;

const orderInvariant =
  Math.abs(composedAlarmThenMalfunction.r - composedMalfunctionThenAlarm.r) < 5
  && Math.abs(composedAlarmThenMalfunction.g - composedMalfunctionThenAlarm.g) < 5
  && Math.abs(composedAlarmThenMalfunction.b - composedMalfunctionThenAlarm.b) < 5;

const output = {
  suite: "P12-T1-room-animation-order-dependent-occlusion-red",
  phase: "RED",
  expected: "FAIL",
  observed: "FAIL",
  checks: [
    {
      id: "render-loop-iterates-insertion-order-without-layering-guard",
      expected: true,
      pass: rendersInsertionOrder,
    },
    {
      id: "coded-power-outage-uses-near-opaque-full-clip-fill",
      expected: true,
      pass: powerOutageOpaqueFill,
    },
    {
      id: "coded-intruder-alert-uses-full-clip-red-fill",
      expected: true,
      pass: intruderAlertFullFill,
    },
    {
      id: "no-room-concurrency-map-in-draw-loop",
      expected: true,
      pass: !hasRoomConcurrencyMap,
    },
    {
      id: "no-additive-layering-guard-in-draw-path",
      expected: true,
      pass: !hasAdditiveLayeringGuard,
    },
    {
      id: "alarm-suppressed-in-alarm-then-malfunction-order",
      expected: true,
      pass: !alarmVisibleInFailOrder,
      meta: { composed: composedAlarmThenMalfunction },
    },
    {
      id: "alarm-visible-in-malfunction-then-alarm-order",
      expected: true,
      pass: alarmVisibleInPassOrder,
      meta: { composed: composedMalfunctionThenAlarm },
    },
    {
      id: "order-invariance-violated-without-fix",
      expected: true,
      pass: !orderInvariant,
      meta: {
        alarmThenMalfunction: composedAlarmThenMalfunction,
        malfunctionThenAlarm: composedMalfunctionThenAlarm,
      },
    },
  ],
};

const fixAlreadyApplied = hasRoomConcurrencyMap || hasAdditiveLayeringGuard;
if (fixAlreadyApplied) {
  // RED baseline is frozen in the committed output file. The fix is now
  // present in runtime-orchestration.js, so re-running this harness would
  // produce a post-fix snapshot — do not overwrite the baseline.
  console.log(
    "FROZEN - P12-T4 fix detected in runtime; RED baseline preserved. "
      + "Use debug/p12-t7-order-invariance-fail-pass-proof.mjs for post-fix evidence.",
  );
} else {
  const allChecksPass = output.checks.every((c) => c.pass === true);
  output.observed = allChecksPass ? "FAIL" : "INCONCLUSIVE";

  writeFileSync(
    new URL("./p12-t1-order-occlusion-red-output.json", import.meta.url),
    `${JSON.stringify(output, null, 2)}\n`,
  );

  console.log(
    allChecksPass
      ? "FAIL - RED baseline captured: order-dependent room animation occlusion reproduced"
      : "INCONCLUSIVE - RED baseline incomplete, review checks",
  );
}
