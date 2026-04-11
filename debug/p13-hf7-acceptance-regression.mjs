import { readFileSync, writeFileSync } from "node:fs";

const projectRoot = new URL("../", import.meta.url).pathname;

const runtimeSrc = readFileSync(
  projectRoot + "src/app/runtime/runtime-orchestration.js",
  "utf8",
);
const stylesSrc = readFileSync(projectRoot + "src/styles.css", "utf8");

// G13-HF7-1: GPU layer promotion on .stage
const g13_hf7_1 =
  /\.stage\s*\{[^}]*will-change:\s*transform/s.test(stylesSrc)
  && /\.stage\s*\{[^}]*contain:\s*paint/s.test(stylesSrc)
  && /\.stage\s*\{[^}]*backface-visibility:\s*hidden/s.test(stylesSrc);

// G13-HF7-2: draw() loop pauses heavy work during touch gesture
const drawPauseGate =
  runtimeSrc.includes("if (touchGestureActive) {")
  && /if \(touchGestureActive\) \{[^}]*recordRuntimeFrameCost\(performance\.now\(\) - frameStart\);[^}]*return;[^}]*\}[^}]*drawOutsideFxLayer/s.test(runtimeSrc);
const g13_hf7_2 = drawPauseGate;

// G13-HF7-3: scheduleNextLiveSnapshotPoll is gated on touchGestureActive
const g13_hf7_3 =
  /function scheduleNextLiveSnapshotPoll[\s\S]*?if \(touchGestureActive\) \{[\s\S]*?return;\s*\}/.test(runtimeSrc);

// G13-HF7-4: gesture-start aborts in-flight poll timer
const g13_hf7_4 =
  runtimeSrc.includes("liveSync?.pollTimerId !== null")
  && runtimeSrc.includes("window.clearTimeout(liveSync.pollTimerId)");

// G13-HF7-5: gesture-end resumes polling
const g13_hf7_5 = /touchGestureActive = false;[\s\S]*?scheduleNextLiveSnapshotPoll\(0\)/.test(runtimeSrc);

// G13-HF7-6: HF6 cached stage geometry + .is-touch-gesture transition guard
// still in place (non-regression)
const g13_hf7_6 =
  runtimeSrc.includes("const stageGeometryCache = {")
  && runtimeSrc.includes("refreshStageGeometryCache();")
  && /\.stage\.is-panning,\s*\.stage\.is-touch-gesture\s*\{[\s\S]*?transition:\s*none/.test(stylesSrc);

// Phase 11 HF6 + Phase 12 + Phase 13-1 non-regression
const phase11_hf6 = runtimeSrc.includes("activeSeenOneShotRunByTriggerRevision");
const phase12 =
  runtimeSrc.includes("const roomConcurrencyByKey = new Map();")
  && runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";');
const phase13_1 = runtimeSrc.includes("scheduleGlobalConfigWrite")
  || runtimeSrc.includes("markLocalConfigDirty(");

const hardGates = {
  "G13-HF7-1-GPU-Layer-Promotion": g13_hf7_1,
  "G13-HF7-2-Draw-Loop-Paused-During-Gesture": g13_hf7_2,
  "G13-HF7-3-Poll-Gated-On-TouchGestureActive": g13_hf7_3,
  "G13-HF7-4-Gesture-Start-Aborts-In-Flight-Poll": g13_hf7_4,
  "G13-HF7-5-Gesture-End-Resumes-Poll": g13_hf7_5,
  "G13-HF7-6-HF6-Guards-NonRegression": g13_hf7_6,
  "G13-HF7-non-regression-Phase-11-HF6": phase11_hf6,
  "G13-HF7-non-regression-Phase-12": phase12,
  "G13-HF7-non-regression-Phase-13-1": phase13_1,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-HF7-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-hf7-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-HF7 mobile lag fix gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
