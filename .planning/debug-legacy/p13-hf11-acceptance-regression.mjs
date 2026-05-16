import { readFileSync, writeFileSync } from "node:fs";

const runtimeSrc = readFileSync(
  new URL("../src/app/runtime/runtime-orchestration.js", import.meta.url),
  "utf8",
);

// G13-HF11-1: applyIncrementalRoomDrag now takes (refs, roomId, boardId)
// and reads display-space overlay points from getRoomPoints — so the
// transform (roomGeometry offset/stretch + hitareaCalibration) is
// preserved on every drag frame.
const g13_hf11_1 =
  /function applyIncrementalRoomDrag\(refs, roomId, boardId = state\.boardId\) \{[\s\S]*?const overlayPoints = getRoomPoints\(room, boardId\);[\s\S]*?applyIncrementalPolygonPointsToDom\(refs\.polygon, overlayPoints\);[\s\S]*?applyIncrementalVertexHandlesToDom\(refs, overlayPoints\);[\s\S]*?\}/.test(runtimeSrc);

// G13-HF11-2: applyIncrementalShipDrag now takes (refs, boardId) and
// reads its overlay points from getShipPolygonPoints.
const g13_hf11_2 =
  /function applyIncrementalShipDrag\(refs, boardId = state\.boardId\) \{[\s\S]*?const rawPoints = getShipPolygonPoints\(boardId\);[\s\S]*?const overlayPoints = rawPoints\.map\(\(\[x, y\]\) => \[x \* 1000, y \* 1000\]\);[\s\S]*?applyIncrementalPolygonPointsToDom\(refs\.mask, overlayPoints\);[\s\S]*?applyIncrementalVertexHandlesToDom\(refs, overlayPoints\);[\s\S]*?\}/.test(runtimeSrc);

// G13-HF11-3: applyIncrementalPolygonPointsToDom no longer multiplies by
// 1000 — its input is already in overlay units. We assert the new body
// uses `${x.toFixed(1)},${y.toFixed(1)}` (no `* 1000`).
const applyIncrementalPolygonBody = runtimeSrc.slice(
  runtimeSrc.indexOf("function applyIncrementalPolygonPointsToDom("),
  runtimeSrc.indexOf("function applyIncrementalVertexHandlesToDom("),
);
const g13_hf11_3 =
  applyIncrementalPolygonBody.includes("`${x.toFixed(1)},${y.toFixed(1)}`")
  && !applyIncrementalPolygonBody.includes("* 1000");

// G13-HF11-4: applyIncrementalVertexHandlesToDom no longer uses the old
// toOverlayUnits helper and its body does not multiply by 1000.
const applyIncrementalHandlesBody = runtimeSrc.slice(
  runtimeSrc.indexOf("function applyIncrementalVertexHandlesToDom("),
  runtimeSrc.indexOf("function applyIncrementalRoomDrag("),
);
const g13_hf11_4 =
  !applyIncrementalHandlesBody.includes("toOverlayUnits")
  && !applyIncrementalHandlesBody.includes("* 1000");

// G13-HF11-5: room-vertex drag pointermove passes (refs, roomId, boardId).
const g13_hf11_5 =
  runtimeSrc.includes(
    "applyIncrementalRoomDrag(state.polygonEditor.dragDomRefs, roomId, boardId);",
  );

// G13-HF11-6: room-area drag pointermove passes (refs, roomId, boardId).
const g13_hf11_6 =
  runtimeSrc.includes(
    "applyIncrementalRoomDrag(state.polygonEditor.dragAreaDomRefs, roomId, boardId);",
  );

// G13-HF11-7: ship-vertex drag pointermove passes (refs, boardId).
const g13_hf11_7 =
  runtimeSrc.includes(
    "applyIncrementalShipDrag(state.shipPolygonEditor.dragDomRefs, boardId);",
  );

// G13-HF11-8: The old (raw-point) call signatures must be gone — otherwise
// the fix was only partial.
const g13_hf11_8 =
  !runtimeSrc.includes(
    "applyIncrementalRoomDrag(state.polygonEditor.dragDomRefs, getSpecialPolygonPoints(boardId, roomId));",
  )
  && !runtimeSrc.includes(
    "applyIncrementalRoomDrag(state.polygonEditor.dragAreaDomRefs, shifted);",
  )
  && !runtimeSrc.includes(
    "applyIncrementalShipDrag(state.shipPolygonEditor.dragDomRefs, getShipPolygonPoints(boardId));",
  );

// Non-regression
const g13_hf11_nr_hf10 =
  // HF10 reorder — render before begin — still in place in all four sites.
  /renderRoomOverlay\(\);\s*beginPolygonVertexDrag\(event, room\.id, index\);/.test(runtimeSrc)
  && /renderRoomOverlay\(\);\s*beginPendingPolygonAreaDrag\(event, room\.id\);/.test(runtimeSrc)
  && /kind === "room-vertex"[\s\S]*?state\.selectedRoomId = roomId;[\s\S]*?renderRoomOverlay\(\);\s*beginPolygonVertexDrag\(syntheticEvent, roomId,/.test(runtimeSrc)
  && /kind === "room-area"[\s\S]*?renderRoomOverlay\(\);\s*beginPendingPolygonAreaDrag\(syntheticEvent,/.test(runtimeSrc);

const g13_hf11_nr_hf9_offset =
  runtimeSrc.includes("state.polygonEditor.dragVertexOffsetX = initialVertex[0] - pointerX;")
  && runtimeSrc.includes("state.shipPolygonEditor.dragVertexOffsetX = initialVertex[0] - pointerX;")
  && runtimeSrc.includes("state.polygonEditor.dragDomRefs = cacheRoomPolygonDragDomRefs(roomId);")
  && runtimeSrc.includes("state.polygonEditor.dragAreaDomRefs = cacheRoomPolygonDragDomRefs(roomId);")
  && runtimeSrc.includes("state.shipPolygonEditor.dragDomRefs = cacheShipPolygonDragDomRefs();");

const g13_hf11_nr_hf8 =
  runtimeSrc.includes("let polygonDragActive = false;")
  && runtimeSrc.includes("function beginPolygonDragInteraction()")
  && runtimeSrc.includes("function endPolygonDragInteraction()")
  && runtimeSrc.includes("function scheduleRoomOverlayRender()")
  && runtimeSrc.includes("function flushPendingRoomOverlayRender()");

const g13_hf11_nr_hf7 =
  runtimeSrc.includes("function isHeavyInteractionActive()")
  && runtimeSrc.includes("return touchGestureActive || polygonDragActive;")
  && runtimeSrc.includes("let touchGestureActive = false;");

const g13_hf11_nr_phase12 =
  runtimeSrc.includes("const roomConcurrencyByKey = new Map();")
  && runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";');

const g13_hf11_nr_phase13_1 = runtimeSrc.includes("markLocalConfigDirty(");

const hardGates = {
  "G13-HF11-1-applyIncrementalRoomDrag-uses-getRoomPoints": g13_hf11_1,
  "G13-HF11-2-applyIncrementalShipDrag-uses-getShipPolygonPoints": g13_hf11_2,
  "G13-HF11-3-polygon-writer-no-1000-multiply": g13_hf11_3,
  "G13-HF11-4-handles-writer-no-1000-multiply": g13_hf11_4,
  "G13-HF11-5-vertex-drag-caller-new-signature": g13_hf11_5,
  "G13-HF11-6-area-drag-caller-new-signature": g13_hf11_6,
  "G13-HF11-7-ship-drag-caller-new-signature": g13_hf11_7,
  "G13-HF11-8-old-raw-signatures-removed": g13_hf11_8,
  "G13-HF11-NR-HF10-render-before-begin": g13_hf11_nr_hf10,
  "G13-HF11-NR-HF9-offset-and-refs": g13_hf11_nr_hf9_offset,
  "G13-HF11-NR-HF8-drag-interaction-gate": g13_hf11_nr_hf8,
  "G13-HF11-NR-HF7-heavy-interaction-gate": g13_hf11_nr_hf7,
  "G13-HF11-NR-Phase-12-additive-layering": g13_hf11_nr_phase12,
  "G13-HF11-NR-Phase-13-1-dirty-flag": g13_hf11_nr_phase13_1,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-HF11-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-hf11-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-HF11 room-transform preservation gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
