import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  createBoardsLoadedSubset,
  createUnknownOnlyCandidate,
  loadPersistenceApi,
} from "./p10-hf7-persistence-harness.mjs";

const persistence = loadPersistenceApi();
const boards = createBoardsLoadedSubset();
const candidate = createUnknownOnlyCandidate();

const extracted = persistence.extractBoardProfilesCandidate(candidate, boards);
const extractedKeys = Object.keys(extracted ?? {}).sort();

const output = {
  suite: "p10-hf7-t4-catalog-independent-extraction",
  loadedBoardIds: boards.map((entry) => entry.id),
  extractedKeys,
  result: extracted && extractedKeys.includes("imported-lockdown-multi") ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf7-t4-catalog-independent-extraction-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(output.result, "PASS", "Extraction must retain board-profile candidates independent of currently loaded board IDs");
console.log(JSON.stringify(output, null, 2));
