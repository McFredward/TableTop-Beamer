import { readFileSync } from "node:fs";
import vm from "node:vm";

const BOARD_PROFILES_PATH = new URL("../src/app/lib/persistence/board-profiles.js", import.meta.url);

export function loadPersistenceApi() {
  const source = readFileSync(BOARD_PROFILES_PATH, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "board-profiles.js" });
  return sandbox.window.TT_BEAMER_PERSISTENCE;
}

export function createMigratorDeps() {
  return {
    createDefaultBoardProfiles: () => ({
      "nemesis-lockdown-a": {
        playAreas: [{ id: "play-area-1", name: "Play Area 1", polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] }],
        selectedPlayAreaId: "play-area-1",
      },
      "nemesis-lockdown-b": {
        playAreas: [{ id: "play-area-1", name: "Play Area 1", polygon: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] }],
        selectedPlayAreaId: "play-area-1",
      },
    }),
    createDefaultRoomGeometryMap: () => ({}),
    createDefaultRoomStateProfileMap: () => ({}),
    createDefaultSpecialPolygonMap: () => ({}),
    createDefaultRoomAnimationDefinitions: () => [{ id: "kaputt" }],
    createDefaultInsideAnimationDefinitions: () => [{ id: "hull-flicker" }],
    HITAREA_CALIBRATION_DEFAULT: { offsetX: 0, offsetY: 0, scale: 1 },
    SHIP_POLYGON_DEFAULT: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
    OUTSIDE_FX_DEFAULT: { enabled: false },
  };
}

export function createBoardsLoadedSubset() {
  return [{ id: "nemesis-lockdown-a" }, { id: "nemesis-lockdown-b" }];
}

export function createCandidateWithUnknownMultiAreaKey() {
  return {
    "nemesis-lockdown-a": {
      playAreas: [{ id: "play-area-1", name: "Play Area 1", polygon: [[0.08, 0.08], [0.92, 0.08], [0.92, 0.92], [0.08, 0.92]] }],
      selectedPlayAreaId: "play-area-1",
    },
    "imported-lockdown-multi": {
      playAreas: [
        { id: "play-area-1", name: "Play Area 1", polygon: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]] },
        { id: "bunker", name: "Bunker", polygon: [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]] },
      ],
      selectedPlayAreaId: "bunker",
      roomCatalog: [{ id: "room-1" }],
    },
  };
}

export function createUnknownOnlyCandidate() {
  return {
    "imported-lockdown-multi": {
      playAreas: [
        { id: "play-area-1", name: "Play Area 1", polygon: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]] },
        { id: "bunker", name: "Bunker", polygon: [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]] },
      ],
      selectedPlayAreaId: "bunker",
      roomCatalog: [{ id: "room-1" }],
    },
  };
}

export function legacyExtractBoardProfilesCandidate(raw, boards) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  if (raw.boards && typeof raw.boards === "object") {
    return raw.boards;
  }
  if (raw.boardProfiles && typeof raw.boardProfiles === "object") {
    return raw.boardProfiles;
  }
  const hasBoardKeys = boards.some((board) => raw[board.id] && typeof raw[board.id] === "object");
  return hasBoardKeys ? raw : null;
}

export function legacyBuildMigratedBoardProfiles({ boards, candidate, createDefaultBoardProfiles }) {
  const migrated = createDefaultBoardProfiles();
  for (const board of boards) {
    const profile = candidate?.[board.id] ?? {};
    migrated[board.id] = {
      ...migrated[board.id],
      playAreas: Array.isArray(profile.playAreas) && profile.playAreas.length > 0
        ? profile.playAreas
        : migrated[board.id]?.playAreas,
      selectedPlayAreaId: profile.selectedPlayAreaId ?? migrated[board.id]?.selectedPlayAreaId ?? "play-area-1",
      roomCatalog: profile.roomCatalog ?? null,
    };
  }
  return migrated;
}
