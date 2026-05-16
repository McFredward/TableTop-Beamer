import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ZONE_FILES = [
  path.resolve("config/zones/nemesis-board-a.json"),
  path.resolve("config/zones/nemesis-board-b.json"),
];

function isFiniteUnitValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1;
}

function validateZonePayload(payload, expectedBoardId, requiredRoomIds = []) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, code: "ZONE_INVALID_PAYLOAD" };
  }
  const boardMeta = payload.board;
  if (!boardMeta || String(boardMeta.id || "") !== expectedBoardId) {
    return { ok: false, code: "ZONE_INVALID_PAYLOAD" };
  }
  if (!Array.isArray(payload.rooms) || payload.rooms.length === 0) {
    return { ok: false, code: "ZONE_INVALID_PAYLOAD" };
  }
  const loadedIds = new Set();
  for (const room of payload.rooms) {
    if (!room?.id || loadedIds.has(room.id)) {
      return { ok: false, code: "ZONE_VALIDATION_FAILED" };
    }
    loadedIds.add(room.id);
    if (!Number.isFinite(Number(room.radius))) {
      return { ok: false, code: "ZONE_VALIDATION_FAILED" };
    }
    if (Array.isArray(room.points)) {
      if (room.points.length < 3) {
        return { ok: false, code: "ZONE_VALIDATION_FAILED" };
      }
      if (!room.points.every((point) => isFiniteUnitValue(point?.[0]) && isFiniteUnitValue(point?.[1]))) {
        return { ok: false, code: "ZONE_VALIDATION_FAILED" };
      }
    } else if (!isFiniteUnitValue(room.x) || !isFiniteUnitValue(room.y)) {
      return { ok: false, code: "ZONE_VALIDATION_FAILED" };
    }
  }
  const missingRequired = requiredRoomIds.filter((roomId) => !loadedIds.has(roomId));
  if (missingRequired.length > 0) {
    return { ok: false, code: "ZONE_PARTIAL_DATA" };
  }
  return { ok: true, code: "OK" };
}

async function main() {
  const sample = JSON.parse(await readFile(ZONE_FILES[0], "utf8"));
  const requiredRoomIds = sample.rooms.map((room) => room.id);

  let missingCode = "OK";
  try {
    await readFile(path.resolve("config/zones/does-not-exist.json"), "utf8");
  } catch {
    missingCode = "ZONE_FILE_MISSING";
  }

  const malformedDir = await mkdtemp(path.join(tmpdir(), "tt-beamer-zone-"));
  const malformedFile = path.join(malformedDir, "malformed.json");
  await writeFile(malformedFile, "{\n  \"board\": ", "utf8");
  let malformedCode = "OK";
  try {
    JSON.parse(await readFile(malformedFile, "utf8"));
  } catch {
    malformedCode = "ZONE_MALFORMED_JSON";
  }

  const partial = {
    ...sample,
    rooms: sample.rooms.slice(1),
  };
  const partialResult = validateZonePayload(partial, sample.board.id, requiredRoomIds);

  console.log(`MISSING=${missingCode}`);
  console.log(`MALFORMED=${malformedCode}`);
  console.log(`PARTIAL=${partialResult.code}`);
}

void main();
