import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState } = require("../src/app/runtime/core/polygon-contract.js");

const LOCKDOWN_ID = "nemesis-lockdown-a";

const preState = {
  playAreasByBoard: {
    [LOCKDOWN_ID]: [
      {
        id: "play-area-1",
        name: "Play Area 1",
        polygon: [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]],
      },
    ],
  },
  selectedPlayAreaIdByBoard: {
    [LOCKDOWN_ID]: "play-area-1",
  },
};

const lockdownPayload = {
  runtime: {
    selectedBoard: LOCKDOWN_ID,
    playAreasByBoard: {
      [LOCKDOWN_ID]: [
        {
          id: "lockdown-outside",
          name: "Lockdown Outside",
          polygon: [{ x: 0.08, y: 0.08 }, { x: 0.92, y: 0.1 }, { x: 0.9, y: 0.93 }, { x: 0.07, y: 0.9 }],
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [LOCKDOWN_ID]: "lockdown-outside",
    },
  },
};

const applied = applySnapshotPolygonState({
  state: preState,
  snapshot: lockdownPayload,
  runtime: lockdownPayload.runtime,
  boardIds: [LOCKDOWN_ID],
  shipPolygonDefault: [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]],
});

const selectedId = applied.selectedPlayAreaIdByBoard?.[LOCKDOWN_ID];

const output = {
  suite: "p10-hf3-t1-lockdown-firefox-mobile-repro",
  boardId: LOCKDOWN_ID,
  expectedSelectedPlayAreaId: "lockdown-outside",
  actualSelectedPlayAreaId: selectedId ?? null,
  appliedFromSnapshot: Boolean(applied.appliedFromSnapshot),
  result: selectedId === "lockdown-outside" ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf3-t1-lockdown-firefox-mobile-repro-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(
  selectedId,
  "lockdown-outside",
  "Lockdown A polygon ownership must hydrate from snapshot/runtime path for Firefox/mobile-class parity",
);

console.log(JSON.stringify(output, null, 2));
