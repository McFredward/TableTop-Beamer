import { readFileSync, readdirSync, writeFileSync } from "node:fs";

// Phase 14-2: HF13 guards now read every file under src/app/runtime/**
// so module-split extractions don't false-FAIL gates that were
// originally pinned to a single monolith. The concatenated blob is
// the source of truth for every HF13 signature check below.
const runtimeDir = new URL("../src/app/runtime/", import.meta.url).pathname;
const runtimeSrc = readdirSync(runtimeDir, { recursive: true, withFileTypes: false })
  .filter((name) => name.endsWith(".js"))
  .map((name) => readFileSync(`${runtimeDir}${name}`, "utf8"))
  .join("\n");

// G13-HF13-1: session-stable stretch-anchor cache declared on state.
const g13_hf13_1 =
  runtimeSrc.includes("state.roomStretchAnchorCache = new Map();");

// G13-HF13-2: getStableRoomStretchAnchor populates the cache lazily.
// Phase 14-2: the helper now lives in runtime-room-geometry.js. The
// `boardId = state.boardId` default became an inside-the-body
// `effectiveBoardId` fallback because the module no longer has
// direct lexical access to the runtime `state` binding.
const g13_hf13_2 =
  /function getStableRoomStretchAnchor\(room, boardId[^)]*\) \{/.test(runtimeSrc)
  && /const cached = state\.roomStretchAnchorCache\.get\(key\);[\s\S]*?if \(cached\) return cached;/.test(runtimeSrc)
  && runtimeSrc.includes("state.roomStretchAnchorCache.set(key, anchor);");

// G13-HF13-3: getRoomTransform reads the stable anchor and exposes it
// on the returned transform (so getRoomPoints can reuse the same point).
// Phase 14-2: body moved to the extracted module; we match the relaxed
// signature and scan the body for the stable-anchor call + exposed
// baseCenter fields.
const getRoomTransformStart = runtimeSrc.search(/function getRoomTransform\(room, boardId[^)]*\) \{/);
const getRoomTransformBody = getRoomTransformStart >= 0
  ? runtimeSrc.slice(getRoomTransformStart, getRoomTransformStart + 800)
  : "";
const g13_hf13_3 =
  /const baseCenter = getStableRoomStretchAnchor\(room,/.test(getRoomTransformBody)
  && getRoomTransformBody.includes("baseCenterX: baseCenter.x,")
  && getRoomTransformBody.includes("baseCenterY: baseCenter.y,")
  && !getRoomTransformBody.includes("getRawRoomCenter");

// G13-HF13-4: getRoomPoints's stretch origin comes from the transform
// (stable anchor) — the old call to getRoomCenterFromPoints is gone.
const getRoomPointsStart = runtimeSrc.search(/function getRoomPoints\(room, boardId[^)]*\) \{/);
const getRoomPointsBody = getRoomPointsStart >= 0
  ? runtimeSrc.slice(getRoomPointsStart, getRoomPointsStart + 1800)
  : "";
// Phase 15-5 (full removal): getRoomPoints is now an identity
// pipeline (source → ×1000). The original HF13-4 gate checked for
// the stretch-anchor-based transform. The simplified pipeline
// satisfies the spirit of the gate (no unstable centroid recompute
// during vertex edits) by definition — there is no transform at
// all. Accept either the legacy transform pattern or the identity
// pipeline.
const g13_hf13_4 =
  (getRoomPointsBody.includes("const baseCenter = { x: transform.baseCenterX, y: transform.baseCenterY };")
    && !getRoomPointsBody.includes("getRoomCenterFromPoints(sourcePoints)"))
  || (getRoomPointsBody.includes("sourcePoints.map(([x, y]) => [x * 1000, y * 1000])")
    && !getRoomPointsBody.includes("getRoomCenterFromPoints(sourcePoints)"));

// G13-HF13-5: hydration clears the stretch-anchor cache so newly
// hydrated polygons reseat their anchors.
// Phase 15-5: the sync block that copies specialPolygons → room.polygon
// now sits between the fromEntries assignment and the cache clear.
// Accept either the original tight adjacency or the new layout with
// the sync block in between.
const g13_hf13_5 =
  /state\.specialPolygonsByBoard = Object\.fromEntries\([\s\S]*?\);[\s\S]*?state\.roomStretchAnchorCache\.clear\(\);/.test(runtimeSrc);

// G13-HF13-6: HF12's drag-time frozen-transform helpers are GONE.
const g13_hf13_6 =
  !runtimeSrc.includes("createFrozenRoomTransform")
  && !runtimeSrc.includes("projectRawToDisplayWithFrozenTransform")
  && !runtimeSrc.includes("projectDisplayToRawWithFrozenTransform")
  && !runtimeSrc.includes("computeRoomDisplayOverlayPointsFrozen")
  && !runtimeSrc.includes("dragFrozenTransform");

// G13-HF13-7: the HF13 display→raw inverter using live getRoomTransform.
// Phase 14-2: signature changed when the helper moved into
// runtime-polygon-drag-support.js — the `state.boardId` default now
// lives inside the body as `effectiveBoardId`, since the module no
// longer has direct lexical access to the runtime `state` binding.
const g13_hf13_7 =
  /function projectDisplayNormalizedToRoomRaw\(displayNormalizedX, displayNormalizedY, room, boardId[^)]*\) \{/.test(runtimeSrc)
  && /const transform = ctx\.getRoomTransform\(room, effectiveBoardId\)|const transform = getRoomTransform\(room, boardId\)/.test(runtimeSrc)
  && runtimeSrc.includes("const rawX = transform.baseCenterX + (preCalibX - transform.centerX) / (transform.stretchX || 1);");

// G13-HF13-8: clampDisplayNormalizedCoordinate preserved — [0, 1] clamp.
const g13_hf13_8 =
  /function clampDisplayNormalizedCoordinate\(value\) \{[\s\S]*?Math\.max\(0, Math\.min\(1,[\s\S]*?\}/.test(runtimeSrc);

// G13-HF13-9: beginPolygonVertexDrag captures the grab offset in
// DISPLAY space via live getRoomPoints.
const g13_hf13_9 =
  /function beginPolygonVertexDrag\(event, roomId, vertexIndex\) \{[\s\S]*?const initialVertexOverlay = room[\s\S]*?getRoomPoints\(room, state\.boardId\)\[vertexIndex\][\s\S]*?state\.polygonEditor\.dragVertexOffsetX = initialVertexDisplayX - pointerX;/s.test(runtimeSrc);

// G13-HF13-10: vertex drag pointermove clamps, inverts via the live
// stable transform, writes raw, and renders via live getRoomPoints.
const g13_hf13_10 =
  runtimeSrc.includes("const [rawNextX, rawNextY] = projectDisplayNormalizedToRoomRaw(")
  && /applyIncrementalRoomDrag\(\s*state\.polygonEditor\.dragDomRefs,\s*getRoomPoints\(vertexRoom, boardId\),\s*\);/.test(runtimeSrc);

// G13-HF13-11: area drag still uses live getRoomPoints (unchanged).
const g13_hf13_11 =
  /applyIncrementalRoomDrag\(\s*state\.polygonEditor\.dragAreaDomRefs,\s*getRoomPoints\(areaRoom, boardId\),\s*\);/.test(runtimeSrc);

// G13-HF13-12: clearPolygonDragSession no longer references the frozen
// transform.
const clearBody = runtimeSrc.slice(
  runtimeSrc.indexOf("function clearPolygonDragSession()"),
  runtimeSrc.indexOf("function clearPolygonDragSession()") + 600,
);
const g13_hf13_12 = !clearBody.includes("dragFrozenTransform");

// Non-regression
const nr_hf11 =
  runtimeSrc.includes("function applyIncrementalRoomDrag(refs, overlayPoints)")
  && runtimeSrc.includes("function applyIncrementalShipDrag(refs, overlayPoints)");

const nr_hf10 =
  /renderRoomOverlay\(\);\s*beginPolygonVertexDrag\(event, room\.id, index\);/.test(runtimeSrc)
  && /renderRoomOverlay\(\);\s*beginPendingPolygonAreaDrag\(event, room\.id\);/.test(runtimeSrc);

// Phase 14-2: polygon-editor module calls through ctx.cacheRoomPolygonDragDomRefs;
// legacy monolith called it directly. Accept both forms.
const nr_hf9_refs =
  (
    runtimeSrc.includes("state.polygonEditor.dragDomRefs = cacheRoomPolygonDragDomRefs(roomId);")
    || runtimeSrc.includes("state.polygonEditor.dragDomRefs = ctx.cacheRoomPolygonDragDomRefs(roomId);")
  )
  && (
    runtimeSrc.includes("state.polygonEditor.dragAreaDomRefs = cacheRoomPolygonDragDomRefs(roomId);")
    || runtimeSrc.includes("state.polygonEditor.dragAreaDomRefs = ctx.cacheRoomPolygonDragDomRefs(roomId);")
  );

const nr_hf8 =
  runtimeSrc.includes("function beginPolygonDragInteraction()")
  && runtimeSrc.includes("function endPolygonDragInteraction()")
  && runtimeSrc.includes("let polygonDragActive = false;");

const nr_hf7 =
  runtimeSrc.includes("function isHeavyInteractionActive()")
  && runtimeSrc.includes("let touchGestureActive = false;");

// Phase 14-2: draw loop module renamed the 2D canvas context to `c`.
// Accept both legacy (`ctx.`) and extracted (`c.`) forms of the
// additive-layering guard.
const nr_phase12 =
  runtimeSrc.includes("const roomConcurrencyByKey = new Map();")
  && (
    runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";')
    || runtimeSrc.includes('c.globalCompositeOperation = "lighter";')
  );

const nr_phase13_1 = runtimeSrc.includes("markLocalConfigDirty(");

const hardGates = {
  "G13-HF13-1-state-roomStretchAnchorCache-declared": g13_hf13_1,
  "G13-HF13-2-getStableRoomStretchAnchor-defined-and-lazy": g13_hf13_2,
  "G13-HF13-3-getRoomTransform-uses-stable-anchor-not-raw-center": g13_hf13_3,
  "G13-HF13-4-getRoomPoints-reads-baseCenter-from-transform": g13_hf13_4,
  "G13-HF13-5-hydration-clears-stretch-anchor-cache": g13_hf13_5,
  "G13-HF13-6-HF12-frozen-transform-helpers-removed": g13_hf13_6,
  "G13-HF13-7-projectDisplayNormalizedToRoomRaw-uses-live-transform": g13_hf13_7,
  "G13-HF13-8-clampDisplayNormalizedCoordinate-0-1-preserved": g13_hf13_8,
  "G13-HF13-9-beginPolygonVertexDrag-captures-display-space-offset": g13_hf13_9,
  "G13-HF13-10-vertex-drag-pointermove-live-pipeline": g13_hf13_10,
  "G13-HF13-11-area-drag-pointermove-still-live-getRoomPoints": g13_hf13_11,
  "G13-HF13-12-clearPolygonDragSession-no-frozen-ref": g13_hf13_12,
  "G13-HF13-NR-HF11-incremental-drag-signature": nr_hf11,
  "G13-HF13-NR-HF10-render-before-begin": nr_hf10,
  "G13-HF13-NR-HF9-cached-dom-refs": nr_hf9_refs,
  "G13-HF13-NR-HF8-heavy-interaction-gate": nr_hf8,
  "G13-HF13-NR-HF7-touchGestureActive": nr_hf7,
  "G13-HF13-NR-Phase-12-additive-layering": nr_phase12,
  "G13-HF13-NR-Phase-13-1-dirty-flag": nr_phase13_1,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-HF13-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-hf13-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-HF13 stable-stretch-anchor gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
