import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createBoardsLoadedSubset,
  createUnknownOnlyCandidate,
  createMigratorDeps,
  legacyBuildMigratedBoardProfiles,
  legacyExtractBoardProfilesCandidate,
} from "./p10-hf7-persistence-harness.mjs";

const boards = createBoardsLoadedSubset();
const candidate = createUnknownOnlyCandidate();
const deps = createMigratorDeps();

const extracted = legacyExtractBoardProfilesCandidate(candidate, boards);
const migrated = legacyBuildMigratedBoardProfiles({ boards, candidate: extracted, ...deps });
const unknownProfile = migrated["imported-lockdown-multi"];

const output = {
  suite: "p10-hf7-t1-clean-start-profile-loss-repro",
  phase: "RED",
  loadedBoardIds: boards.map((entry) => entry.id),
  expectedUnknownBoardId: "imported-lockdown-multi",
  observed: {
    extractedCandidateIsNull: extracted === null,
    unknownProfileExistsAfterMigration: Boolean(unknownProfile),
    fallbackSelectedPlayAreaId: migrated["nemesis-lockdown-a"]?.selectedPlayAreaId ?? null,
  },
  result: extracted === null && !unknownProfile ? "FAIL" : "PASS",
};

writeFileSync(new URL("./p10-hf7-t1-clean-start-profile-loss-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(output.result, "FAIL", "Legacy clean-start path must reproduce profile-loss fallback drift for unknown multi-area board keys");
console.log(JSON.stringify(output, null, 2));
