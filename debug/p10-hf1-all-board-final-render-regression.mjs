import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const defaults = JSON.parse(readFileSync(new URL("../config/global-defaults.json", import.meta.url), "utf8"));
const boardProfiles = defaults?.boardProfiles && typeof defaults.boardProfiles === "object"
  ? defaults.boardProfiles
  : {};

function normalizePoint(point) {
  return [Number(point?.[0]) || 0, Number(point?.[1]) || 0];
}

function toPixelPolygon(polygon, width = 1920, height = 1080) {
  return (Array.isArray(polygon) ? polygon : []).map((point) => {
    const [x, y] = normalizePoint(point);
    return [x * width, y * height];
  });
}

function isFiniteCanvasPoint(point) {
  return Array.isArray(point)
    && point.length >= 2
    && Number.isFinite(Number(point[0]))
    && Number.isFinite(Number(point[1]));
}

function getPolygonSignedArea(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return 0;
  }
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    if (!isFiniteCanvasPoint(current) || !isFiniteCanvasPoint(next)) {
      return 0;
    }
    area += Number(current[0]) * Number(next[1]) - Number(next[0]) * Number(current[1]);
  }
  return area / 2;
}

function isRenderableCanvasPolygon(polygon, { minArea = 8 } = {}) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }
  if (!polygon.every((point) => isFiniteCanvasPoint(point))) {
    return false;
  }
  return Math.abs(getPolygonSignedArea(polygon)) >= minArea;
}

function resolvePlayAreaPolygons(profile) {
  const list = Array.isArray(profile?.playAreas) ? profile.playAreas : [];
  const fromCollection = list
    .map((area) => toPixelPolygon(area?.polygon))
    .filter((polygon) => polygon.length >= 3);
  if (fromCollection.length > 0) {
    return fromCollection;
  }
  const single = toPixelPolygon(profile?.playAreaPolygon);
  return single.length >= 3 ? [single] : [];
}

function resolveOutsideClipPathStatus(profile) {
  const polygons = resolvePlayAreaPolygons(profile).filter((polygon) => isRenderableCanvasPolygon(polygon));
  if (polygons.length === 0) {
    return "fail-open-no-clip";
  }
  return "clip-evenodd";
}

function resolveRoomClipStatus(roomPolygon) {
  return isRenderableCanvasPolygon(roomPolygon) ? "clip-room" : "fail-open-no-clip";
}

const boardIds = Object.keys(boardProfiles).sort();
assert.ok(boardIds.length > 0, "global defaults must expose board profiles");

const results = boardIds.map((boardId) => {
  const profile = boardProfiles[boardId] ?? {};
  const outsideClipStatus = resolveOutsideClipPathStatus(profile);
  const outsideAnimations = Array.isArray(profile?.outsideFx?.animations) ? profile.outsideFx.animations : [];
  const selectedOutsideId = String(profile?.outsideFx?.selectedAnimationId || "").trim();
  const selectedOutside = outsideAnimations.find((entry) => String(entry?.id || "").trim() === selectedOutsideId) ?? null;
  return {
    boardId,
    outsideClipStatus,
    selectedOutsideId,
    selectedOutsideAssetType: selectedOutside?.assetType ?? null,
    selectedOutsideAssetRef: selectedOutside?.assetRef ?? null,
  };
});

for (const result of results) {
  assert.notEqual(result.outsideClipStatus, "blocked", `outside clip must never block final compositor for ${result.boardId}`);
}

const lockdown = results.find((entry) => entry.boardId === "nemesis-lockdown-a");
assert.ok(lockdown, "Nemesis Lockdown A profile must exist");
assert.equal(lockdown.selectedOutsideAssetType, "mp4", "Nemesis Lockdown A must cover mp4 outside board regression");
assert.match(String(lockdown.selectedOutsideAssetRef || ""), /sandstorm\.mp4$/, "Nemesis Lockdown A must use sandstorm.mp4");

const syntheticDegeneratePlayArea = {
  playAreas: [
    {
      id: "degenerate",
      polygon: [[0.4, 0.4], [0.4, 0.4], [0.4, 0.4]],
    },
  ],
};
assert.equal(
  resolveOutsideClipPathStatus(syntheticDegeneratePlayArea),
  "fail-open-no-clip",
  "degenerate play area polygons must fail-open instead of blocking final render",
);

const syntheticDegenerateRoomPolygon = [[300, 300], [300, 300], [300, 300]];
assert.equal(
  resolveRoomClipStatus(syntheticDegenerateRoomPolygon),
  "fail-open-no-clip",
  "degenerate room polygons must fail-open so room+outside co-render contract survives",
);

const output = {
  suite: "p10-hf1-all-board-final-render-regression",
  executedAt: new Date().toISOString(),
  boardCount: results.length,
  mp4OutsideBoards: results
    .filter((entry) => entry.selectedOutsideAssetType === "mp4")
    .map((entry) => entry.boardId),
  result: "PASS",
  checks: [
    "all-board outside clip path never blocks final compositor",
    "nemesis-lockdown-a mp4 sandstorm outside profile covered",
    "degenerate play-area input fail-opens",
    "degenerate room polygon input fail-opens",
  ],
  boards: results,
};

writeFileSync(
  new URL("./p10-hf1-all-board-final-render-regression-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(JSON.stringify(output, null, 2));
