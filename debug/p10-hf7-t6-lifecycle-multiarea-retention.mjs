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
const unknownKey = "imported-lockdown-multi";

function runLifecycleLane(step, incomingPayload, loadedBoards) {
  const extracted = persistence.extractBoardProfilesCandidate(incomingPayload, loadedBoards);
  const migrated = persistence.buildMigratedBoardProfiles({
    boards: loadedBoards,
    candidate: extracted,
    legacyHitarea: {},
    legacyRoomGeometry: {},
    legacySpecialPolygons: {},
    ...deps,
  });

  const unknown = migrated[unknownKey];
  return {
    step,
    loadedBoardIds: loadedBoards.map((entry) => entry.id),
    extractedKeys: Object.keys(extracted ?? {}).sort(),
    migratedKeys: Object.keys(migrated).sort(),
    unknownAreaIdSet: (unknown?.playAreas ?? []).map((entry) => entry.id).sort(),
    selectedPlayAreaId: unknown?.selectedPlayAreaId ?? null,
  };
}

const startupPayload = createUnknownOnlyCandidate();
const startup = runLifecycleLane("startup", startupPayload, createBoardsLoadedSubset());

const defaultsAppliedPayload = {
  ...startupPayload,
  "nemesis-lockdown-a": {
    playAreas: [{ id: "play-area-1", name: "Play Area 1", polygon: [[0.12, 0.12], [0.88, 0.12], [0.88, 0.88], [0.12, 0.88]] }],
    selectedPlayAreaId: "play-area-1",
  },
};
const defaultsApply = runLifecycleLane("default-apply", defaultsAppliedPayload, createBoardsLoadedSubset());

const reloadPayload = {
  boards: {
    ...defaultsAppliedPayload,
  },
};
const reload = runLifecycleLane("reload", reloadPayload, createBoardsLoadedSubset());

const expectedSet = JSON.stringify(["bunker", "play-area-1"]);
const lanes = [startup, defaultsApply, reload];
const pass = lanes.every((lane) => JSON.stringify(lane.unknownAreaIdSet) === expectedSet && lane.selectedPlayAreaId === "bunker");

const output = {
  suite: "p10-hf7-t6-lifecycle-multiarea-retention",
  unknownBoardId: unknownKey,
  lanes,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf7-t6-lifecycle-multiarea-retention-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Unknown multi-area board must retain deterministic area set and selection across startup/default-apply/reload");
console.log(JSON.stringify(output, null, 2));
