// lib/migrations/phase-29-purge.mjs — Phase 29 boot-time disk migration.
//
// Per CONTEXT D-02: source-cleanup happens in Wave 2 (29-02 / 29-03 / 29-04);
// this module runs at boot to bring on-disk JSON files in line with the
// post-Wave-2 source code.
//
// Per CONTEXT D-03: the lossless `animationSoundMap` → per-animation
// `soundAssetRef` migration MUST run BEFORE the field is stripped from
// `config/global-defaults.json`; otherwise the map's values are lost.
//
// Per CONTEXT D-06: hard delete; pre-release; idempotent re-runs leave the
// disk untouched (boots 2..N find nothing to do, no mtime change).
//
// Module shape: four pure helpers + one orchestrator. All read/write JSON via
// node:fs/promises; malformed JSON is treated as "no-op, no throw" so a corrupt
// file never blocks boot.
//
// Tested by:
//   - test/phase-29-purge.test.mjs              (purgeBoardFile semantics)
//   - test/phase-29-sound-migration.test.mjs    (migrateAnimationSoundMap semantics)

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const DEAD_BOARD_FIELDS = Object.freeze([
  "hiddenRoomNames",
  "roomStateProfiles",
  "playAreaPolygon",
  "deletedRoomIds",
  // Phase 29 h1: per-room polygons collapsed to roomCatalog[*].polygon
  // (single source of truth) — the top-level shadow entry is dropped.
  "specialPolygons",
  // Phase 29 h1: roomGeometry is runtime-only now — disk field was
  // always {} on every board file, contributing nothing.
  "roomGeometry",
]);

const DEAD_GLOBAL_FIELDS = Object.freeze([
  "animationSoundMap",
]);

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJsonOrNull(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Strip DEAD board fields from one board JSON file. Idempotent — when no
 * field is present, returns `{ changed: false }` and the file is NOT touched.
 *
 * Handles both shapes seen on disk:
 *   - flat:    { schema: ..., boardId: ..., hiddenRoomNames: ..., ... }
 *   - wrapped: { schema: "tt-beamer.board-import.v1", board: { ... DEAD ... } }
 *
 * Malformed JSON → no-op, no throw (so corrupt files don't block boot).
 */
export async function purgeBoardFile(filePath, deadFields = DEAD_BOARD_FIELDS) {
  const outer = await readJsonOrNull(filePath);
  if (!outer || typeof outer !== "object") return { changed: false };

  const inner = outer.board && typeof outer.board === "object" ? outer.board : outer;

  let changed = false;
  for (const field of deadFields) {
    if (Object.prototype.hasOwnProperty.call(inner, field)) {
      delete inner[field];
      changed = true;
    }
  }
  if (!changed) return { changed: false };

  // Re-attach if we mutated outer.board reference (no-op when outer === inner).
  if (outer.board && outer.board !== inner) outer.board = inner;
  await writeFile(filePath, serializeJson(outer), "utf8");
  return { changed: true };
}

/**
 * Strip DEAD global-defaults fields from `config/global-defaults.json`.
 * Idempotent — same write-only-on-change semantics as purgeBoardFile.
 */
export async function purgeGlobalDefaultsFields(filePath, deadFields = DEAD_GLOBAL_FIELDS) {
  const obj = await readJsonOrNull(filePath);
  if (!obj || typeof obj !== "object") return { changed: false };
  let changed = false;
  for (const field of deadFields) {
    if (Object.prototype.hasOwnProperty.call(obj, field)) {
      delete obj[field];
      changed = true;
    }
  }
  if (!changed) return { changed: false };
  await writeFile(filePath, serializeJson(obj), "utf8");
  return { changed: true };
}

/**
 * D-03: Lossless migration of (animationType → soundAssetRef) entries from
 * the global `animationSoundMap` into per-animation `soundAssetRef` slots,
 * across every board JSON.
 *
 * Semantics:
 *   - Skip entries with empty / "none" map values (nothing to migrate).
 *   - Skip animations whose `soundAssetRef` is already non-empty / non-"none"
 *     (skip-on-conflict — never clobber user-edited per-animation refs).
 *   - Drop orphan map entries whose `animationType` matches NO animation
 *     anywhere across all boards (returned as `orphanCount`).
 *
 * Returns `{ boardFilesModified, copiedCount, orphanCount }`. Does NOT mutate
 * `globalDefaults` — the strip step that follows handles dropping the field.
 */
export async function migrateAnimationSoundMap(globalDefaults, boardFilePaths) {
  const map = globalDefaults?.animationSoundMap;
  const entries = (map && typeof map === "object")
    ? Object.entries(map).filter(([, v]) => v && v !== "none")
    : [];
  if (entries.length === 0) {
    return { boardFilesModified: 0, copiedCount: 0, orphanCount: 0 };
  }

  const usedTypes = new Set();
  let boardFilesModified = 0;
  let copiedCount = 0;

  for (const filePath of boardFilePaths) {
    const outer = await readJsonOrNull(filePath);
    if (!outer || typeof outer !== "object") continue;
    const inner = outer.board && typeof outer.board === "object" ? outer.board : outer;

    let modified = false;
    const slots = [
      inner.outsideFx?.animations,
      inner.roomFx?.animations,
      inner.insideFx?.animations,
    ];
    for (const list of slots) {
      if (!Array.isArray(list)) continue;
      for (const def of list) {
        if (!def || typeof def !== "object") continue;
        for (const [animationType, soundPath] of entries) {
          if (def.type !== animationType) continue;
          usedTypes.add(animationType);
          const current = String(def.soundAssetRef ?? "").trim();
          if (current && current !== "none") continue; // skip-on-conflict
          def.soundAssetRef = soundPath;
          copiedCount += 1;
          modified = true;
        }
      }
    }

    if (modified) {
      if (outer.board && outer.board !== inner) outer.board = inner;
      await writeFile(filePath, serializeJson(outer), "utf8");
      boardFilesModified += 1;
    }
  }

  const orphanCount = entries.filter(([t]) => !usedTypes.has(t)).length;
  return { boardFilesModified, copiedCount, orphanCount };
}

/**
 * Enumerate `*.json` files in a board-storage directory (sorted, hidden files
 * skipped). Missing directory → empty list (no throw).
 */
export async function listBoardJsonFiles(boardStorageDir) {
  let entries;
  try {
    entries = await readdir(boardStorageDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json") && !e.name.startsWith("."))
    .map((e) => path.join(boardStorageDir, e.name))
    .sort();
}

/**
 * Top-level boot-time orchestrator. Order:
 *
 *   1. Load global-defaults BEFORE strip so `animationSoundMap` is still present.
 *   2. MIGRATION FIRST — DO NOT REORDER (Pitfall 2): copy non-empty map values
 *      into per-animation `soundAssetRef` slots across every board JSON.
 *   3. Strip DEAD fields from global-defaults.json.
 *   4. Strip DEAD fields from each `config/boards/<id>.json`.
 *
 * Returns `{ migration, globalStripped, boardsStripped }`.
 */
export async function purgeDeadFieldsOnBoot({ globalDefaultsPath, boardStorageDir }) {
  // 1. Read global-defaults BEFORE strip so animationSoundMap is still present.
  const globalDefaults = await readJsonOrNull(globalDefaultsPath);
  const boardFilePaths = await listBoardJsonFiles(boardStorageDir);

  // 2. MIGRATION FIRST — DO NOT REORDER (Pitfall 2).
  const migration = await migrateAnimationSoundMap(globalDefaults || {}, boardFilePaths);

  // 3. Strip global-defaults DEAD fields.
  const globalStripped = await purgeGlobalDefaultsFields(globalDefaultsPath, DEAD_GLOBAL_FIELDS);

  // 4. Strip per-board DEAD fields.
  let boardsStripped = 0;
  for (const filePath of boardFilePaths) {
    const result = await purgeBoardFile(filePath, DEAD_BOARD_FIELDS);
    if (result.changed) boardsStripped += 1;
  }

  return { migration, globalStripped, boardsStripped };
}

export const PHASE_29_DEAD_BOARD_FIELDS = DEAD_BOARD_FIELDS;
export const PHASE_29_DEAD_GLOBAL_FIELDS = DEAD_GLOBAL_FIELDS;
