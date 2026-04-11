import { readFileSync, writeFileSync } from "node:fs";

const projectRoot = new URL("../", import.meta.url).pathname;

const runtimeSrc = readFileSync(
  projectRoot + "src/app/runtime/runtime-orchestration.js",
  "utf8",
);
const stylesSrc = readFileSync(projectRoot + "src/styles.css", "utf8");

// G13-3-1: Pointer-Button-Guard-Relaxed
const g13_3_1 =
  runtimeSrc.includes("function isAcceptablePolygonPointerEvent(event)")
  && runtimeSrc.includes('if (pointerType === "touch" || pointerType === "pen") return true;')
  && !/event\.button\s*!==\s*0\s*\|\|\s*!(arePlayAreaVerticesEditable|areRoomVerticesEditable)/.test(runtimeSrc);

// G13-3-2: Coarse-Pointer-Hit-Radius (vertex radius scaled by coarse multiplier)
const g13_3_2 =
  runtimeSrc.includes("function getCoarsePointerHitMultiplier()")
  && runtimeSrc.includes('window.matchMedia("(pointer: coarse)")')
  && /vertexHitRadius:\s*Math\.max\(10,\s*16\s*\*\s*inverseZoom\)\s*\*\s*normalizedHandleScale\s*\*\s*coarse/.test(runtimeSrc)
  && /edgeHitRadius:\s*Math\.max\(8,\s*12\s*\*\s*inverseZoom\)\s*\*\s*normalizedHandleScale\s*\*\s*coarse/.test(runtimeSrc);

// G13-3-3: Touch-Action-None-Gate
const g13_3_3 =
  /#room-overlay\s*\{[^}]*touch-action:\s*none/s.test(stylesSrc);

// G13-3-4: Pinch-Vertex-Arbitration-Gate — pinch capture bails on active drags
const g13_3_4 =
  runtimeSrc.includes("Phase 13-3 arbitration")
  && runtimeSrc.includes("state?.polygonEditor?.dragPointerId !== null")
  && runtimeSrc.includes("state?.polygonEditor?.dragAreaPointerId !== null")
  && runtimeSrc.includes("state?.shipPolygonEditor?.dragPointerId !== null");

// G13-3-5: Area-Drag-Symmetric-Gate — same acceptable-pointer guard on all sites
const g13_3_5 =
  [...runtimeSrc.matchAll(/isAcceptablePolygonPointerEvent\(event\)/g)].length >= 5;

// G13-3-extra: Phase 13-1 + 13-2 + Phase 12 non-regression
const g13_3_extra =
  runtimeSrc.includes("scheduleGlobalConfigWrite(")
  && runtimeSrc.includes("const BOARD_ZOOM_SCALE_MIN = 0.25;")
  && runtimeSrc.includes('ctx.globalCompositeOperation = "lighter";')
  && runtimeSrc.includes("renderServerUnreachableOverlay(error);");

const hardGates = {
  "G13-3-1-Pointer-Button-Guard-Relaxed": g13_3_1,
  "G13-3-2-Coarse-Pointer-Hit-Radius": g13_3_2,
  "G13-3-3-Touch-Action-None": g13_3_3,
  "G13-3-4-Pinch-Vertex-Arbitration": g13_3_4,
  "G13-3-5-Area-Drag-Symmetric": g13_3_5,
  "G13-3-extra-Phase-12-13-1-13-2-NonRegression": g13_3_extra,
};

const allPass = Object.values(hardGates).every((v) => v === true);
const output = {
  suite: "P13-3-acceptance-regression",
  phase: "GREEN",
  observed: allPass ? "PASS" : "FAIL",
  hardGates,
};

writeFileSync(
  new URL("./p13-3-acceptance-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(
  allPass
    ? "PASS - Plan 13-3 touch polygon editing gates closed"
    : `FAIL - ${Object.entries(hardGates).filter(([, v]) => !v).map(([k]) => k).join(", ")}`,
);
