import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createBoardsLoadedSubset,
  createCandidateWithUnknownMultiAreaKey,
  createMigratorDeps,
  legacyBuildMigratedBoardProfiles,
  legacyExtractBoardProfilesCandidate,
} from "./p10-hf7-persistence-harness.mjs";

const boards = createBoardsLoadedSubset();
const candidate = createCandidateWithUnknownMultiAreaKey();
const deps = createMigratorDeps();

const extracted = legacyExtractBoardProfilesCandidate(candidate, boards) ?? candidate;
const migrated = legacyBuildMigratedBoardProfiles({ boards, candidate: extracted, ...deps });

const output = {
  suite: "p10-hf7-t3-unknown-key-migration-drop-repro",
  phase: "RED",
  loadedBoardIds: boards.map((entry) => entry.id),
  unknownBoardId: "imported-lockdown-multi",
  observedKeysAfterMigration: Object.keys(migrated).sort(),
  unknownKeyRetained: Object.prototype.hasOwnProperty.call(migrated, "imported-lockdown-multi"),
  unknownAreaIdSet: (migrated["imported-lockdown-multi"]?.playAreas ?? []).map((entry) => entry.id).sort(),
};

output.result = output.unknownKeyRetained ? "PASS" : "FAIL";

writeFileSync(new URL("./p10-hf7-t3-unknown-key-migration-drop-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(output.result, "FAIL", "Legacy migration must reproduce unknown-board-key drop when board list is not loaded yet");
console.log(JSON.stringify(output, null, 2));
