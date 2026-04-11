import { readFileSync, writeFileSync } from "node:fs";

const projectRoot = new URL("../", import.meta.url).pathname;

const runtimeSrc = readFileSync(
  projectRoot + "src/app/runtime/runtime-orchestration.js",
  "utf8",
);

// G13-HF8-1: polygonDragActive flag + isHeavyInteractionActive helper
const g13_hf8_1 =
  runtimeSrc.includes("let polygonDragActive = false;")
  && runtimeSrc.includes("function isHeavyInteractionActive()")
  && runtimeSrc.includes("return touchGestureActive || polygonDragActive;");

// G13-HF8-2: scheduleRoomOverlayRender + flush helper
const g13_hf8_2 =
  runtimeSrc.includes("function scheduleRoomOverlayRender()")
  && runtimeSrc.includes("pendingRoomOverlayRenderHandle = window.requestAnimationFrame")
  && runtimeSrc.includes("function flushPendingRoomOverlayRender()");

// G13-HF8-3: beginPolygonDragInteraction + endPolygonDragInteraction
const g13_hf8_3 =
  runtimeSrc.includes("function beginPolygonDragInteraction()")
  && runtimeSrc.includes("function endPolygonDragInteraction()")
  && /endPolygonDragInteraction\(\) \{[\s\S]*?state\.shipPolygonEditor\.dragVertexIndex !== null[\s\S]*?state\.polygonEditor\.dragVertexIndex !== null[\s\S]*?state\.polygonEditor\.dragAreaPointerId !== null[\s\S]*?state\.polygonEditor\.pendingAreaPointerId !== null/s.test(runtimeSrc);

// G13-HF8-4: all begin* helpers call beginPolygonDragInteraction
const beginShipCalls =
  /function beginShipPolygonVertexDrag[\s\S]*?beginPolygonDragInteraction\(\)/s.test(runtimeSrc);
const beginVertexCalls =
  /function beginPolygonVertexDrag[\s\S]*?beginPolygonDragInteraction\(\)/s.test(runtimeSrc);
const beginAreaCalls =
  /function beginPolygonAreaDrag[\s\S]*?beginPolygonDragInteraction\(\)/s.test(runtimeSrc);
const beginPendingAreaCalls =
  /function beginPendingPolygonAreaDrag[\s\S]*?beginPolygonDragInteraction\(\)/s.test(runtimeSrc);
const g13_hf8_4 = beginShipCalls && beginVertexCalls && beginAreaCalls && beginPendingAreaCalls;

// G13-HF8-5: all clear*/clearPending* helpers call endPolygonDragInteraction
const clearShipCalls =
  /function clearShipPolygonDragSession[\s\S]*?endPolygonDragInteraction\(\)/s.test(runtimeSrc);
const clearVertexCalls =
  /function clearPolygonDragSession[\s\S]*?endPolygonDragInteraction\(\)/s.test(runtimeSrc);
const clearAreaCalls =
  /function clearPolygonAreaDragSession[\s\S]*?endPolygonDragInteraction\(\)/s.test(runtimeSrc);
const clearPendingCalls =
  /function clearPendingPolygonAreaDragSession[\s\S]*?endPolygonDragInteraction\(\)/s.test(runtimeSrc);
const g13_hf8_5 = clearShipCalls && clearVertexCalls && clearAreaCalls && clearPendingCalls;

// G13-HF8-6: draw() and scheduleNextLiveSnapshotPoll gate on isHeavyInteractionActive
const g13_hf8_6 =
  /function draw\(now\)[\s\S]*?if \(isHeavyInteractionActive\(\)\) \{[\s\S]*?return;\s*\}/.test(runtimeSrc)
  && /function scheduleNextLiveSnapshotPoll[\s\S]*?if \(isHeavyInteractionActive\(\)\) \{[\s\S]*?return;\s*\}/.test(runtimeSrc);

// G13-HF8-7: drag pointermove branches use scheduleRoomOverlayRender
const scheduleRenderInsideShipDrag = /state\.shipPolygonEditor\.dragMoved = true;\s*\/\/ Phase 13-HF8[^\n]*\s*scheduleRoomOverlayRender\(\);/s.test(runtimeSrc);
const scheduleRenderInsideAreaDrag = /state\.polygonEditor\.dragAreaMoved = state\.polygonEditor\.dragAreaMoved \|\| moved;\s*\/\/ Phase 13-HF8[^\n]*\s*scheduleRoomOverlayRender\(\);/s.test(runtimeSrc);
const scheduleRenderInsideVertexDrag = /state\.polygonEditor\.dragMoved = true;\s*\/\/ Phase 13-HF8[^\n]*\s*scheduleRoomOverlayRender\(\);/s.test(runtimeSrc);
const g13_hf8_7 = scheduleRenderInsideShipDrag && scheduleRenderInsideAreaDrag && scheduleRenderInsideVertexDrag;

// G13-HF8-8: HF7 non-regression — touchGestureActive gate still present
const g13_hf8_8 =
  runtimeSrc.includes("let touchGestureActive = false;")
  && runtimeSrc.includes("refreshStageGeometryCache();")
  && runtimeSrc.includes("stage.classList.add(\"is-touch-gesture\");");

// Phase 11 HF6 + Phase 12 + Phase 13-1 non-regression
const phase11 = runtimeSrc.includes("activeSeenOneShotRunByTriggerRevision");
const phase12 =
  runtimeSrc.includes("const roomConcurrencyByKey = new Map();")
  && runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";');
const phase13_1 = runtimeSrc.includes("scheduleGlobalConfigWrite")
  || runtimeSrc.includes("markLocalConfigDirty(");

const hardGates = {
  "G13-HF8-1-polygonDragActive-flag-and-isHeavyInteractionActive": g13_hf8_1,
  "G13-HF8-2-scheduleRoomOverlayRender-helper": g13_hf8_2,
  "G13-HF8-3-begin-end-polygon-drag-interaction-helpers": g13_hf8_3,
  "G13-HF8-4-all-begin-helpers-enter-interaction": g13_hf8_4,
  "G13-HF8-5-all-clear-helpers-exit-interaction": g13_hf8_5,
  "G13-HF8-6-draw-and-poll-gate-on-isHeavyInteractionActive": g13_hf8_6,
  "G13-HF8-7-drag-pointermove-uses-scheduleRoomOverlayRender": g13_hf8_7,
  "G13-HF8-8-HF7-NonRegression-touchGestureActive-intact": g13_hf8_8,
  "G13-HF8-non-regression-Phase-11-HF6": phase11,
  "G13-HF8-non-regression-Phase-12": phase12,
  "G13-HF8-non-regression-Phase-13-1": phase13_1,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-HF8-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-hf8-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-HF8 drag lag fix gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
