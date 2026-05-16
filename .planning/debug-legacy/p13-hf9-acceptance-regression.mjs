import { readFileSync, writeFileSync } from "node:fs";

const projectRoot = new URL("../", import.meta.url).pathname;
const runtimeSrc = readFileSync(
  projectRoot + "src/app/runtime/runtime-orchestration.js",
  "utf8",
);

// G13-HF9-1: incremental renderer helpers defined
const g13_hf9_1 =
  runtimeSrc.includes("function cacheRoomPolygonDragDomRefs(roomId)")
  && runtimeSrc.includes("function cacheShipPolygonDragDomRefs()")
  && runtimeSrc.includes("function applyIncrementalRoomDrag(refs, points)")
  && runtimeSrc.includes("function applyIncrementalShipDrag(refs, points)")
  && runtimeSrc.includes("function applyIncrementalPolygonPointsToDom(polygonNode, points)")
  && runtimeSrc.includes("function applyIncrementalVertexHandlesToDom(refs, points)");

// G13-HF9-2: beginShipPolygonVertexDrag captures offset + caches refs
const g13_hf9_2 =
  /function beginShipPolygonVertexDrag[\s\S]*?state\.shipPolygonEditor\.dragVertexOffsetX = initialVertex\[0\] - pointerX;/.test(runtimeSrc)
  && /function beginShipPolygonVertexDrag[\s\S]*?state\.shipPolygonEditor\.dragDomRefs = cacheShipPolygonDragDomRefs\(\);/.test(runtimeSrc);

// G13-HF9-3: beginPolygonVertexDrag captures offset + caches refs
const g13_hf9_3 =
  /function beginPolygonVertexDrag[\s\S]*?state\.polygonEditor\.dragVertexOffsetX = initialVertex\[0\] - pointerX;/.test(runtimeSrc)
  && /function beginPolygonVertexDrag[\s\S]*?state\.polygonEditor\.dragDomRefs = cacheRoomPolygonDragDomRefs\(roomId\);/.test(runtimeSrc);

// G13-HF9-4: beginPolygonAreaDrag caches refs
const g13_hf9_4 =
  /function beginPolygonAreaDrag[\s\S]*?state\.polygonEditor\.dragAreaDomRefs = cacheRoomPolygonDragDomRefs\(roomId\);/.test(runtimeSrc);

// G13-HF9-5: ship drag pointermove applies offset + uses incremental
const g13_hf9_5 =
  runtimeSrc.includes("const nextX = pointerX + (state.shipPolygonEditor.dragVertexOffsetX || 0);")
  && runtimeSrc.includes("applyIncrementalShipDrag(state.shipPolygonEditor.dragDomRefs, getShipPolygonPoints(boardId));");

// G13-HF9-6: room area drag pointermove uses incremental
const g13_hf9_6 =
  runtimeSrc.includes("applyIncrementalRoomDrag(state.polygonEditor.dragAreaDomRefs, shifted);");

// G13-HF9-7: room vertex drag pointermove applies offset + uses incremental
const g13_hf9_7 =
  runtimeSrc.includes("const nextX = pointerX + (state.polygonEditor.dragVertexOffsetX || 0);")
  && runtimeSrc.includes("applyIncrementalRoomDrag(state.polygonEditor.dragDomRefs, getSpecialPolygonPoints(boardId, roomId));");

// G13-HF9-8: drag pointermove branches no longer call scheduleRoomOverlayRender
// We allow the helper to still exist for fallback, but the three drag branches
// must not reference it. Count occurrences in the pointermove handler block.
const pointermoveBlock = runtimeSrc.substring(
  runtimeSrc.indexOf("roomOverlay.addEventListener(\"pointermove\""),
  runtimeSrc.indexOf("roomOverlay.addEventListener(\"pointerup\""),
);
const g13_hf9_8 =
  !pointermoveBlock.includes("scheduleRoomOverlayRender()");

// G13-HF9-9: clear helpers reset offset + refs
const g13_hf9_9 =
  runtimeSrc.includes("state.shipPolygonEditor.dragVertexOffsetX = 0;")
  && runtimeSrc.includes("state.shipPolygonEditor.dragDomRefs = null;")
  && runtimeSrc.includes("state.polygonEditor.dragVertexOffsetX = 0;")
  && runtimeSrc.includes("state.polygonEditor.dragDomRefs = null;")
  && runtimeSrc.includes("state.polygonEditor.dragAreaDomRefs = null;");

// Non-regression
const phase11 = runtimeSrc.includes("activeSeenOneShotRunByTriggerRevision");
const phase12 =
  runtimeSrc.includes("const roomConcurrencyByKey = new Map();")
  && runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";');
const phase13_1 = runtimeSrc.includes("markLocalConfigDirty(");
const phase13_hf7 = runtimeSrc.includes("let touchGestureActive = false;")
  && runtimeSrc.includes("isHeavyInteractionActive");
const phase13_hf8 =
  runtimeSrc.includes("let polygonDragActive = false;")
  && runtimeSrc.includes("function beginPolygonDragInteraction()")
  && runtimeSrc.includes("function endPolygonDragInteraction()");

const hardGates = {
  "G13-HF9-1-incremental-renderer-helpers": g13_hf9_1,
  "G13-HF9-2-ship-vertex-begin-offset-and-refs": g13_hf9_2,
  "G13-HF9-3-room-vertex-begin-offset-and-refs": g13_hf9_3,
  "G13-HF9-4-room-area-begin-refs": g13_hf9_4,
  "G13-HF9-5-ship-vertex-drag-pointermove-incremental": g13_hf9_5,
  "G13-HF9-6-room-area-drag-pointermove-incremental": g13_hf9_6,
  "G13-HF9-7-room-vertex-drag-pointermove-incremental": g13_hf9_7,
  "G13-HF9-8-drag-pointermove-no-scheduleRoomOverlayRender": g13_hf9_8,
  "G13-HF9-9-clear-helpers-reset-refs-and-offset": g13_hf9_9,
  "G13-HF9-NR-Phase-11-HF6": phase11,
  "G13-HF9-NR-Phase-12": phase12,
  "G13-HF9-NR-Phase-13-1": phase13_1,
  "G13-HF9-NR-Phase-13-HF7": phase13_hf7,
  "G13-HF9-NR-Phase-13-HF8": phase13_hf8,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-HF9-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-hf9-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-HF9 incremental drag renderer + vertex offset gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
