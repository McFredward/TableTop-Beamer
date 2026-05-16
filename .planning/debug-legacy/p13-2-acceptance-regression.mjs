import { readFileSync, writeFileSync } from "node:fs";

const projectRoot = new URL("../", import.meta.url).pathname;

const indexHtml = readFileSync(projectRoot + "index.html", "utf8");
const runtimeSrc = readFileSync(
  projectRoot + "src/app/runtime/runtime-orchestration.js",
  "utf8",
);

// G13-2-1: Slider-Removed-Gate
const g13_2_1 =
  !indexHtml.includes('id="board-zoom-range"')
  && !indexHtml.includes('id="board-zoom-value"')
  && !runtimeSrc.match(/boardZoomRangeInput\.addEventListener\(/)
  && !runtimeSrc.includes('document.querySelector("#board-zoom-range")');

// G13-2-2: Zoom-Range-25-400-Gate
const g13_2_2 =
  runtimeSrc.includes("const BOARD_ZOOM_SCALE_MIN = 0.25;")
  && runtimeSrc.includes("const BOARD_ZOOM_SCALE_MAX = 4.0;")
  && /function clampBoardZoomScale[\s\S]*?Math\.max\(BOARD_ZOOM_SCALE_MIN, Math\.min\(BOARD_ZOOM_SCALE_MAX, numeric\)\)/.test(
    runtimeSrc,
  );

// G13-2-3: Wheel-Handler-Gate
const g13_2_3 =
  runtimeSrc.includes('stage.addEventListener(\n    "wheel"')
  && runtimeSrc.includes("event.preventDefault();")
  && runtimeSrc.includes("const focus = computeZoomFocusFromClientPoint(event.clientX, event.clientY);")
  && runtimeSrc.includes("applyZoomScaleFromGesture(");

// G13-2-4: Pinch-Handler-Gate
const g13_2_4 =
  runtimeSrc.includes("const pinchState = {")
  && runtimeSrc.includes("function pinchDistance(a, b) {")
  && runtimeSrc.includes("function pinchMidpoint(a, b) {")
  && runtimeSrc.includes("if (pinchState.pointers.size !== 2) return;")
  && runtimeSrc.includes('stage.addEventListener("pointerdown"')
  && runtimeSrc.includes('stage.addEventListener("pointermove"')
  && runtimeSrc.includes('stage.addEventListener("pointerup"');

// G13-2-5: Pan-NonRegression-Gate — pan state machine code still present
const g13_2_5 =
  runtimeSrc.includes("state.panMode")
  && runtimeSrc.includes("endPanMode(")
  && runtimeSrc.includes("canStartPanModeFromEvent")
  && runtimeSrc.includes("setPanCursorState();");

// G13-2-6: Fit-Reset-Preserved-Gate
const g13_2_6 =
  runtimeSrc.includes('boardZoomFitButton.addEventListener("click"')
  && runtimeSrc.includes('boardZoomResetButton.addEventListener("click"')
  && indexHtml.includes('id="board-zoom-fit"')
  && indexHtml.includes('id="board-zoom-reset"');

// G13-2-extra: Phase 13-1 guard still intact (non-regression)
const g13_2_extra_phase13_1 =
  runtimeSrc.includes("scheduleGlobalConfigWrite(")
  && runtimeSrc.includes("renderServerUnreachableOverlay(error);");

// G13-2-extra: Phase 12 additive layering intact
const g13_2_extra_phase12 =
  runtimeSrc.includes("const roomConcurrencyByKey = new Map();")
  && runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";');

const hardGates = {
  "G13-2-1-Slider-Removed": g13_2_1,
  "G13-2-2-Zoom-Range-25-400": g13_2_2,
  "G13-2-3-Wheel-Handler": g13_2_3,
  "G13-2-4-Pinch-Handler": g13_2_4,
  "G13-2-5-Pan-NonRegression": g13_2_5,
  "G13-2-6-Fit-Reset-Preserved": g13_2_6,
  "G13-2-extra-Phase-13-1-NonRegression": g13_2_extra_phase13_1,
  "G13-2-extra-Phase-12-NonRegression": g13_2_extra_phase12,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-2-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-2-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-2 gesture zoom gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
