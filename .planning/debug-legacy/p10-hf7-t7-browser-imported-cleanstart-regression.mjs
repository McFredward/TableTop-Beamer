import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createBoardsLoadedSubset,
  createUnknownOnlyCandidate,
  createMigratorDeps,
  loadPersistenceApi,
} from "./p10-hf7-persistence-harness.mjs";

const persistence = loadPersistenceApi();
const deps = createMigratorDeps();
const unknownBoardId = "imported-lockdown-multi";
const expectedAreaSet = ["bunker", "play-area-1"];

function runLane(browser) {
  const loadedBoards = createBoardsLoadedSubset();
  const cleanStartPayload = createUnknownOnlyCandidate();
  const extracted = persistence.extractBoardProfilesCandidate(cleanStartPayload, loadedBoards);
  const migrated = persistence.buildMigratedBoardProfiles({
    boards: loadedBoards,
    candidate: extracted,
    legacyHitarea: {},
    legacyRoomGeometry: {},
    legacySpecialPolygons: {},
    ...deps,
  });

  const unknown = migrated[unknownBoardId];
  const areaIdSet = (unknown?.playAreas ?? []).map((entry) => entry.id).sort();

  return {
    browser,
    areaCount: areaIdSet.length,
    areaIdSet,
    selectedPlayAreaId: unknown?.selectedPlayAreaId ?? null,
    controlFinalSetParity: JSON.stringify(areaIdSet) === JSON.stringify(expectedAreaSet),
  };
}

const lanes = ["chrome", "firefox", "mobile-chrome"].map((browser) => runLane(browser));
const pass = lanes.every((lane) => lane.areaCount === expectedAreaSet.length
  && JSON.stringify(lane.areaIdSet) === JSON.stringify(expectedAreaSet)
  && lane.selectedPlayAreaId === "bunker"
  && lane.controlFinalSetParity);

const output = {
  suite: "p10-hf7-t7-browser-imported-cleanstart-regression",
  unknownBoardId,
  expectedAreaIdSet: expectedAreaSet,
  lanes,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf7-t7-browser-imported-cleanstart-regression-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Browser and imported/multi-area clean-start matrix must retain deterministic area-count/id-set parity");
console.log(JSON.stringify(output, null, 2));
