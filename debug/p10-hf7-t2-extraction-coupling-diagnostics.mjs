import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createBoardsLoadedSubset,
  createUnknownOnlyCandidate,
  legacyExtractBoardProfilesCandidate,
} from "./p10-hf7-persistence-harness.mjs";

const boards = createBoardsLoadedSubset();
const candidate = createUnknownOnlyCandidate();

const extractedWithLoadedBoards = legacyExtractBoardProfilesCandidate(candidate, boards);
const extractedWithUnknownIncluded = legacyExtractBoardProfilesCandidate(candidate, [
  ...boards,
  { id: "imported-lockdown-multi" },
]);

const diagnostics = {
  suite: "p10-hf7-t2-extraction-coupling-diagnostics",
  phase: "RED",
  loadedBoardIds: boards.map((entry) => entry.id),
  unknownBoardId: "imported-lockdown-multi",
  extractionOutcome: {
    withLoadedBoardsOnly: extractedWithLoadedBoards === null ? "dropped" : "retained",
    withUnknownBoardInLoadedList: extractedWithUnknownIncluded === null ? "dropped" : "retained",
  },
};

diagnostics.result = diagnostics.extractionOutcome.withLoadedBoardsOnly === "dropped"
  && diagnostics.extractionOutcome.withUnknownBoardInLoadedList === "retained"
  ? "FAIL"
  : "PASS";

writeFileSync(new URL("./p10-hf7-t2-extraction-coupling-diagnostics-output.json", import.meta.url), `${JSON.stringify(diagnostics, null, 2)}\n`);

assert.equal(diagnostics.result, "FAIL", "Legacy extraction must show loaded-board-list coupling for unknown keys");
console.log(JSON.stringify(diagnostics, null, 2));
