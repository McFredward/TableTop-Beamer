#!/usr/bin/env node
/**
 * p15-migrate-bake-transforms.mjs
 *
 * Bakes hitareaCalibration + roomGeometry transforms INTO specialPolygons
 * coordinates, then resets both to identity defaults.
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, '..', 'config', 'global-defaults.json');
const backupPath = configPath + '.pre-migration-bak';

// --- Read config ---
const raw = readFileSync(configPath, 'utf8');
const config = JSON.parse(raw);

// --- Backup ---
copyFileSync(configPath, backupPath);
console.log(`Backup created at ${backupPath}`);

const IDENTITY_CALIBRATION = { offsetX: 0, offsetY: 0, scale: 1 };
const IDENTITY_GEOMETRY = { mode: 'relative', offsetX: 0, offsetY: 0, stretchX: 1, stretchY: 1, absoluteX: 0.5, absoluteY: 0.5 };

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

let totalBoards = 0;
let totalRooms = 0;
let totalPointsChanged = 0;

for (const [boardId, profile] of Object.entries(config.boardProfiles)) {
  totalBoards++;
  const calibration = profile.hitareaCalibration ?? { offsetX: 0, offsetY: 0, scale: 1 };
  const roomGeometryMap = profile.roomGeometry ?? {};
  const specialPolygons = profile.specialPolygons ?? {};

  let boardRooms = 0;

  for (const [roomId, polygon] of Object.entries(specialPolygons)) {
    if (!Array.isArray(polygon) || polygon.length === 0) continue;
    boardRooms++;

    const geometry = roomGeometryMap[roomId] ?? IDENTITY_GEOMETRY;

    // Compute polygon centroid (base center)
    const baseCenterX = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
    const baseCenterY = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;

    // Determine transform center based on geometry mode
    const centerX = geometry.mode === 'absolute'
      ? (geometry.absoluteX ?? 0.5)
      : baseCenterX + (geometry.offsetX || 0);
    const centerY = geometry.mode === 'absolute'
      ? (geometry.absoluteY ?? 0.5)
      : baseCenterY + (geometry.offsetY || 0);

    const stretchX = geometry.stretchX || 1;
    const stretchY = geometry.stretchY || 1;

    const newPolygon = polygon.map(([x, y]) => {
      // Step 1: Room geometry — stretch around centroid + offset
      const transformedX = centerX + (x - baseCenterX) * stretchX;
      const transformedY = centerY + (y - baseCenterY) * stretchY;

      // Step 2: Hitarea calibration
      const finalX = (transformedX - 0.5) * calibration.scale + 0.5 + calibration.offsetX;
      const finalY = (transformedY - 0.5) * calibration.scale + 0.5 + calibration.offsetY;

      // Clamp to [-0.2, 1.2]
      return [clamp(finalX, -0.2, 1.2), clamp(finalY, -0.2, 1.2)];
    });

    // Count points that actually moved
    for (let i = 0; i < polygon.length; i++) {
      const dx = Math.abs(newPolygon[i][0] - polygon[i][0]);
      const dy = Math.abs(newPolygon[i][1] - polygon[i][1]);
      if (dx > 0.0001 || dy > 0.0001) {
        totalPointsChanged++;
      }
    }

    specialPolygons[roomId] = newPolygon;
  }

  totalRooms += boardRooms;

  // Reset to identity
  profile.specialPolygons = specialPolygons;
  profile.hitareaCalibration = { ...IDENTITY_CALIBRATION };
  profile.roomGeometry = {};
}

// --- Write result ---
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

console.log(`Migration complete.`);
console.log(`  Boards migrated: ${totalBoards}`);
console.log(`  Rooms migrated:  ${totalRooms}`);
console.log(`  Points changed:  ${totalPointsChanged}`);
