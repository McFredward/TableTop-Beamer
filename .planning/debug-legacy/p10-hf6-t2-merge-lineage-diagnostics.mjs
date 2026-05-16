import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { applySnapshotPolygonState, resolveProfilePolygonContract } = require("../src/app/runtime/core/polygon-contract.js");

const BOARD_ID = "nemesis-lockdown-a";
const SHIP_FALLBACK = [[0.45, 0.45], [0.55, 0.45], [0.5, 0.55]];
const EXPECTED_SET = ["bunker", "play-area-1"];

function createState() {
  return {
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "play-area-1",
          name: "Play Area 1",
          polygon: SHIP_FALLBACK,
        },
      ],
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "play-area-1",
    },
  };
}

function createRuntime(browser) {
  const runtime = {
    selectedBoard: BOARD_ID,
    diagnosticBrowser: browser,
    boardProfiles: {
      [BOARD_ID]: {
        playAreas: [
          {
            id: "play-area-1",
            name: "Play Area 1",
            polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]],
          },
          {
            id: "bunker",
            name: "Bunker",
            polygon: [[0.21, 0.22], [0.81, 0.22], [0.81, 0.78], [0.21, 0.78]],
          },
        ],
        selectedPlayAreaId: "bunker",
      },
    },
    selectedPlayAreaIdByBoard: {
      [BOARD_ID]: "bunker",
    },
  };

  if (browser === "chrome") {
    return runtime;
  }

  return {
    ...runtime,
    playAreasByBoard: {
      [BOARD_ID]: [
        {
          id: "play-area-1",
          name: "Play Area 1",
          polygon: [[0.08, 0.08], [0.91, 0.08], [0.91, 0.91], [0.08, 0.91]],
        },
      ],
    },
  };
}

function areaIdSet(playAreas) {
  return [...(Array.isArray(playAreas) ? playAreas : []).map((entry) => String(entry?.id || "").trim()).filter(Boolean)].sort();
}

function runLane(browser) {
  const state = createState();
  const runtime = createRuntime(browser);
  const profile = runtime.boardProfiles?.[BOARD_ID] ?? {};
  const statePlayAreas = state.playAreasByBoard?.[BOARD_ID] ?? [];

  const contracted = resolveProfilePolygonContract(
    profile,
    {
      playAreas: statePlayAreas,
      selectedPlayAreaId: state.selectedPlayAreaIdByBoard?.[BOARD_ID],
    },
    SHIP_FALLBACK,
  );

  const applied = applySnapshotPolygonState({
    state,
    snapshot: { runtime },
    runtime,
    boardIds: [BOARD_ID],
    shipPolygonDefault: SHIP_FALLBACK,
  });

  const profileIds = areaIdSet(profile.playAreas);
  const runtimeIds = areaIdSet(runtime.playAreasByBoard?.[BOARD_ID]);
  const contractedIds = areaIdSet(contracted.playAreas);
  const mergedIds = areaIdSet(applied.playAreasByBoard?.[BOARD_ID]);
  const missingFromMerge = EXPECTED_SET.filter((id) => !mergedIds.includes(id));

  let firstDropPoint = null;
  if (missingFromMerge.length > 0) {
    if (runtimeIds.length > 0 && contractedIds.length > runtimeIds.length) {
      firstDropPoint = "snapshot-playAreasByBoard-precedence";
    } else if (contractedIds.length < profileIds.length) {
      firstDropPoint = "profile-contract-resolution";
    } else {
      firstDropPoint = "post-merge-normalization";
    }
  }

  return {
    browser,
    lineage: {
      savedProfileAreaIdSet: profileIds,
      defaultsAreaIdSet: areaIdSet(statePlayAreas),
      importedPayloadAreaIdSet: runtimeIds,
      contractedAreaIdSet: contractedIds,
      mergedAreaIdSet: mergedIds,
    },
    missingFromMerge,
    firstDropPoint,
  };
}

const lanes = ["chrome", "firefox", "mobile-chrome"].map((browser) => runLane(browser));
const pass = lanes.every((lane) => lane.missingFromMerge.length === 0 && lane.firstDropPoint === null);

const output = {
  suite: "p10-hf6-t2-merge-lineage-diagnostics",
  boardId: BOARD_ID,
  expectedAreaIdSet: EXPECTED_SET,
  lanes,
  result: pass ? "PASS" : "FAIL",
};

writeFileSync(new URL("./p10-hf6-t2-merge-lineage-diagnostics-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.equal(pass, true, "Canonical source merge must retain all valid play-areas and produce no first-drop point in any browser lane");
console.log(JSON.stringify(output, null, 2));
