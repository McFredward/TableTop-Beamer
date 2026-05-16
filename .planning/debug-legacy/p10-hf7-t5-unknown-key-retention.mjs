import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createBoardsLoadedSubset,
  createCandidateWithUnknownMultiAreaKey,
  createMigratorDeps,
  loadPersistenceApi,
} from "./p10-hf7-persistence-harness.mjs";

const persistence = loadPersistenceApi();
const boards = createBoardsLoadedSubset();
const candidate = createCandidateWithUnknownMultiAreaKey();
const deps = createMigratorDeps();

const migrated = persistence.buildMigratedBoardProfiles({
  boards,
  candidate,
  legacyHitarea: {},
  legacyRoomGeometry: {},
  legacySpecialPolygons: {},
  ...deps,
});

const unknown = migrated["imported-lockdown-multi"];
const areaIdSet = (unknown?.playAreas ?? []).map((entry) => entry.id).sort();

const output = {
  suite: "p10-hf7-t5-unknown-key-retention",
  loadedBoardIds: boards.map((entry) => entry.id),
  migratedKeys: Object.keys(migrated).sort(),
  unknownKeyRetained: Boolean(unknown),
  unknownAreaIdSet: areaIdSet,
  selectedPlayAreaId: unknown?.selectedPlayAreaId ?? null,
  result: Boolean(unknown) && JSON.stringify(areaIdSet) === JSON.stringify(["bunker", "play-area-1"]) && unknown?.selectedPlayAreaId === "bunker"
    ? "PASS"
    : "FAIL",
};

writeFileSync(new URL("./p10-hf7-t5-unknown-key-retention-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(output.result, "PASS", "Migration must retain unknown board keys and preserve multi-play-area selection");
console.log(JSON.stringify(output, null, 2));
