import { readFileSync, writeFileSync } from "node:fs";

const runtimeSrc = readFileSync(
  new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url),
  "utf8",
);

// G13-HF12-1: frozen-transform helpers exist.
const g13_hf12_1 =
  runtimeSrc.includes("function createFrozenRoomTransform(roomId, boardId = state.boardId)")
  && runtimeSrc.includes("function projectRawToDisplayWithFrozenTransform(x, y, frozen)")
  && runtimeSrc.includes("function projectDisplayToRawWithFrozenTransform(displayNormalizedX, displayNormalizedY, frozen)")
  && runtimeSrc.includes("function computeRoomDisplayOverlayPointsFrozen(rawPoints, frozen)")
  && runtimeSrc.includes("function clampDisplayNormalizedCoordinate(value)");

// G13-HF12-2: createFrozenRoomTransform captures baseCenter +
// centerX/Y + stretch + a calibration snapshot.
const createFrozenBody = runtimeSrc.slice(
  runtimeSrc.indexOf("function createFrozenRoomTransform("),
  runtimeSrc.indexOf("function projectRawToDisplayWithFrozenTransform("),
);
const g13_hf12_2 =
  createFrozenBody.includes("const baseCenter = getRawRoomCenter(room, boardId);")
  && createFrozenBody.includes("baseCenterX: baseCenter.x,")
  && createFrozenBody.includes("baseCenterY: baseCenter.y,")
  && createFrozenBody.includes("stretchX: geometry.stretchX || 1,")
  && createFrozenBody.includes("calibration: { ...getHitareaCalibration(boardId) },");

// G13-HF12-3: beginPolygonVertexDrag captures frozen transform + offset
// in DISPLAY space.
const g13_hf12_3 =
  /function beginPolygonVertexDrag\(event, roomId, vertexIndex\) \{[\s\S]*?state\.polygonEditor\.dragFrozenTransform = frozen;[\s\S]*?const initialVertexOverlay = frozen[\s\S]*?projectRawToDisplayWithFrozenTransform\([\s\S]*?const initialVertexDisplayX = initialVertexOverlay\[0\] \/ 1000;[\s\S]*?state\.polygonEditor\.dragVertexOffsetX = initialVertexDisplayX - pointerX;/s.test(runtimeSrc);

// G13-HF12-4: room vertex pointermove clamps display to [0,1] and
// inverts through the frozen transform to get raw.
const g13_hf12_4 =
  runtimeSrc.includes("const frozen = state.polygonEditor.dragFrozenTransform;")
  && runtimeSrc.includes("const nextDisplayX = clampDisplayNormalizedCoordinate(")
  && runtimeSrc.includes("? projectDisplayToRawWithFrozenTransform(nextDisplayX, nextDisplayY, frozen)");

// G13-HF12-5: the vertex drag render uses the FROZEN transform for
// display points — that's what freezes the non-dragged vertices.
const g13_hf12_5 =
  runtimeSrc.includes("? computeRoomDisplayOverlayPointsFrozen(currentRaw, frozen)")
  && runtimeSrc.includes("applyIncrementalRoomDrag(state.polygonEditor.dragDomRefs, overlayPoints);");

// G13-HF12-6: area drag keeps using getRoomPoints (shared delta makes
// the live centroid shift correctly, no drift).
const g13_hf12_6 =
  /setSpecialPolygonPoints\(boardId, roomId, shifted\);[\s\S]*?const areaRoom = areaBoard\?\.rooms\?\.find\(\(entry\) => entry\.id === roomId\);[\s\S]*?applyIncrementalRoomDrag\(\s*state\.polygonEditor\.dragAreaDomRefs,\s*getRoomPoints\(areaRoom, boardId\),\s*\);/s.test(runtimeSrc);

// G13-HF12-7: ship vertex drag clamps pointer-derived coordinates to
// [0, 1] so the ship vertex sticks to the board edge.
const g13_hf12_7 =
  /dragVertexIndex !== null && state\.uiView === "settings"[\s\S]*?clampDisplayNormalizedCoordinate\(\s*pointerX \+ \(state\.shipPolygonEditor\.dragVertexOffsetX \|\| 0\),\s*\);/s.test(runtimeSrc);

// G13-HF12-8: ship drag renders from locally-computed overlay points.
const g13_hf12_8 =
  runtimeSrc.includes("const shipOverlay = shipRaw.map(([x, y]) => [x * 1000, y * 1000]);")
  && runtimeSrc.includes("applyIncrementalShipDrag(state.shipPolygonEditor.dragDomRefs, shipOverlay);");

// G13-HF12-9: applyIncremental*Drag accepts overlayPoints, not roomId.
const g13_hf12_9 =
  runtimeSrc.includes("function applyIncrementalRoomDrag(refs, overlayPoints)")
  && runtimeSrc.includes("function applyIncrementalShipDrag(refs, overlayPoints)");

// G13-HF12-10: clearPolygonDragSession releases the frozen transform.
const g13_hf12_10 = runtimeSrc.includes("state.polygonEditor.dragFrozenTransform = null;");

// G13-HF12-11: the HF12 display-space [0,1] clamp helper is actually
// defined to clamp to [0, 1] — no lingering [-0.2, 1.2].
const clampBody = runtimeSrc.slice(
  runtimeSrc.indexOf("function clampDisplayNormalizedCoordinate("),
  runtimeSrc.indexOf("function clampDisplayNormalizedCoordinate(") + 200,
);
const g13_hf12_11 =
  clampBody.includes("Math.max(0, Math.min(1,")
  && !clampBody.includes("-0.2")
  && !clampBody.includes("1.2");

// Non-regression: HF7/HF8/HF9/HF10/HF11
const g13_hf12_nr_hf10 =
  /renderRoomOverlay\(\);\s*beginPolygonVertexDrag\(event, room\.id, index\);/.test(runtimeSrc)
  && /renderRoomOverlay\(\);\s*beginPendingPolygonAreaDrag\(event, room\.id\);/.test(runtimeSrc);

const g13_hf12_nr_hf9_refs =
  runtimeSrc.includes("state.polygonEditor.dragDomRefs = cacheRoomPolygonDragDomRefs(roomId);")
  && runtimeSrc.includes("state.polygonEditor.dragAreaDomRefs = cacheRoomPolygonDragDomRefs(roomId);")
  && runtimeSrc.includes("state.shipPolygonEditor.dragDomRefs = cacheShipPolygonDragDomRefs();");

const g13_hf12_nr_hf8 =
  runtimeSrc.includes("let polygonDragActive = false;")
  && runtimeSrc.includes("function beginPolygonDragInteraction()")
  && runtimeSrc.includes("function endPolygonDragInteraction()");

const g13_hf12_nr_hf7 =
  runtimeSrc.includes("function isHeavyInteractionActive()")
  && runtimeSrc.includes("let touchGestureActive = false;");

const g13_hf12_nr_phase12 =
  runtimeSrc.includes("const roomConcurrencyByKey = new Map();")
  && runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";');

const g13_hf12_nr_phase13_1 = runtimeSrc.includes("markLocalConfigDirty(");

const hardGates = {
  "G13-HF12-1-frozen-transform-helpers-defined": g13_hf12_1,
  "G13-HF12-2-createFrozenRoomTransform-captures-baseCenter-stretch-calibration": g13_hf12_2,
  "G13-HF12-3-beginPolygonVertexDrag-captures-frozen-transform-and-display-offset": g13_hf12_3,
  "G13-HF12-4-room-vertex-pointermove-clamps-and-inverts-through-frozen": g13_hf12_4,
  "G13-HF12-5-room-vertex-render-uses-frozen-transform": g13_hf12_5,
  "G13-HF12-6-area-drag-still-uses-live-getRoomPoints": g13_hf12_6,
  "G13-HF12-7-ship-vertex-pointermove-clamps-to-0-1": g13_hf12_7,
  "G13-HF12-8-ship-drag-renders-from-local-overlay-points": g13_hf12_8,
  "G13-HF12-9-applyIncremental-dragsigs-back-to-overlayPoints": g13_hf12_9,
  "G13-HF12-10-clearPolygonDragSession-nils-frozen-transform": g13_hf12_10,
  "G13-HF12-11-display-clamp-is-0-1-not-minus-0.2-1.2": g13_hf12_11,
  "G13-HF12-NR-HF10-render-before-begin": g13_hf12_nr_hf10,
  "G13-HF12-NR-HF9-cached-refs": g13_hf12_nr_hf9_refs,
  "G13-HF12-NR-HF8-drag-interaction-gate": g13_hf12_nr_hf8,
  "G13-HF12-NR-HF7-heavy-interaction-gate": g13_hf12_nr_hf7,
  "G13-HF12-NR-Phase-12": g13_hf12_nr_phase12,
  "G13-HF12-NR-Phase-13-1": g13_hf12_nr_phase13_1,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-HF12-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-hf12-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-HF12 frozen-transform + edge-clamp gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
