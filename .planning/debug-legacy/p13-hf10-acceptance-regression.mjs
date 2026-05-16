import { readFileSync, writeFileSync } from "node:fs";

const runtimeSrc = readFileSync(
  new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url),
  "utf8",
);

// G13-HF10-1: desktop room-vertex hit-target handler renders BEFORE begin
const g13_hf10_1 =
  /renderRoomOverlay\(\);[\s\S]{0,40}beginPolygonVertexDrag\(event, room\.id, index\);/.test(runtimeSrc);

// G13-HF10-2: desktop polygon.pointerdown renders BEFORE beginPending
const g13_hf10_2 =
  /renderRoomOverlay\(\);[\s\S]{0,40}beginPendingPolygonAreaDrag\(event, room\.id\);/.test(runtimeSrc);

// G13-HF10-3: commitTouchHoldDrag room-vertex sets selection + renders before begin
const g13_hf10_3 =
  /kind === "room-vertex"[\s\S]*?state\.selectedRoomId = roomId;[\s\S]*?renderRoomOverlay\(\);\s*beginPolygonVertexDrag\(syntheticEvent, roomId,/.test(runtimeSrc);

// G13-HF10-4: commitTouchHoldDrag room-area renders before beginPending
const g13_hf10_4 =
  /kind === "room-area"[\s\S]*?syncRoomPanelFromSelection\(\{ preserveDraftState: true \}\);\s*\/\/ Phase 13-HF10[^\n]*\s*renderRoomOverlay\(\);\s*beginPendingPolygonAreaDrag\(syntheticEvent,/.test(runtimeSrc);

// HF9 non-regression
const g13_hf10_5 =
  runtimeSrc.includes("function applyIncrementalRoomDrag(refs, points)")
  && runtimeSrc.includes("function cacheRoomPolygonDragDomRefs(roomId)")
  && runtimeSrc.includes("state.polygonEditor.dragVertexOffsetX");

// HF7/HF8 non-regression
const g13_hf10_6 =
  runtimeSrc.includes("function isHeavyInteractionActive()")
  && runtimeSrc.includes("let polygonDragActive = false;")
  && runtimeSrc.includes("let touchGestureActive = false;");

const hardGates = {
  "G13-HF10-1-desktop-room-vertex-render-before-begin": g13_hf10_1,
  "G13-HF10-2-desktop-polygon-area-render-before-begin": g13_hf10_2,
  "G13-HF10-3-mobile-room-vertex-selection-and-render-before-begin": g13_hf10_3,
  "G13-HF10-4-mobile-room-area-render-before-begin": g13_hf10_4,
  "G13-HF10-NR-HF9-incremental-drag": g13_hf10_5,
  "G13-HF10-NR-HF7-HF8-gates": g13_hf10_6,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-HF10-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-hf10-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-HF10 stale-refs fix gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
