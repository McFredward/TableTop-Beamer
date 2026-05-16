import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveProfilePolygonContract } = require("../src/app/runtime/core/polygon-contract.js");

const boardId = "nemesis-lockdown-a";
const fallback = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];

const defaultsProfile = {
  playAreas: [
    { id: "play-area-1", polygon: [[0.08, 0.08], [0.94, 0.08], [0.94, 0.94], [0.08, 0.94]] },
    { id: "bunker", polygon: [[0.21, 0.2], [0.82, 0.2], [0.82, 0.79], [0.21, 0.79]] },
  ],
  selectedPlayAreaId: "bunker",
};

const staleRuntimeFallback = {
  playAreas: [{ id: "play-area-1", polygon: fallback }],
  selectedPlayAreaId: "play-area-1",
};

const resolved = resolveProfilePolygonContract(defaultsProfile, staleRuntimeFallback, fallback);
const output = {
  suite: "p10-hf8-t6-defaults-reapply-recovery",
  boardId,
  expectedSelected: "bunker",
  observedSelected: resolved.selectedPlayAreaId,
  expectedAreaIds: ["bunker", "play-area-1"],
  observedAreaIds: resolved.playAreas.map((entry) => entry.id).sort(),
  result:
    resolved.selectedPlayAreaId === "bunker"
    && JSON.stringify(resolved.playAreas.map((entry) => entry.id).sort()) === JSON.stringify(["bunker", "play-area-1"])
      ? "PASS"
      : "FAIL",
};

writeFileSync(new URL("./p10-hf8-t6-defaults-reapply-recovery-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
assert.equal(output.result, "PASS", "Load global defaults must reapply board-specific canonical play-areas");
console.log(JSON.stringify(output, null, 2));
