// First-pass detector for the translucent orange Nemesis fire token. The
// room and frame-state logic can also consume a trained detector's boxes.
export function makeFireGeometry(board, roomCatalog, width, height, reference) {
  const outline = [
    ...Array.from({ length: 16 }, (_, i) => board.at({ x: i / 16, y: 0 })),
    ...Array.from({ length: 16 }, (_, i) => board.at({ x: 1, y: i / 16 })),
    ...Array.from({ length: 16 }, (_, i) => board.at({ x: 1 - i / 16, y: 1 })),
    ...Array.from({ length: 16 }, (_, i) => board.at({ x: 0, y: 1 - i / 16 })),
  ];
  const boardWidth = (Math.hypot(outline[0].x - outline[16].x, outline[0].y - outline[16].y)
    + Math.hypot(outline[32].x - outline[48].x, outline[32].y - outline[48].y)) / 2;
  const scale = boardWidth / 1060;
  const rooms = roomCatalog.filter(room => /^\d{3}$/.test(room.name) && room.polygon?.length >= 3)
    .map(room => ({
      id: room.id,
      name: room.name,
      polygon: room.polygon.map(([x, y]) => board.at({ x, y })),
    }));
  const mask = new Uint8Array(width * height);
  for (const [i, { polygon }] of rooms.entries()) {
    const ys = polygon.map(point => point.y);
    for (let y = Math.max(0, Math.ceil(Math.min(...ys))); y < Math.min(height, Math.max(...ys)); y++) {
      const crossings = [];
      for (const [index, a] of polygon.entries()) {
        const b = polygon[(index + 1) % polygon.length];
        if ((a.y > y) === (b.y > y)) continue;
        crossings.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
      }
      crossings.sort((a, b) => a - b);
      for (let j = 0; j + 1 < crossings.length; j += 2) {
        const left = Math.max(0, Math.min(width, Math.ceil(crossings[j])));
        const right = Math.max(left, Math.min(width, Math.ceil(crossings[j + 1])));
        mask.fill(i + 1, y * width + left, y * width + right);
      }
    }
  }
  return { outline, rooms, mask, scale, reference, referenceAt: board.referenceAt };
}

function correlation(count, a, b, aa, bb, ab) {
  const variance = (aa - a ** 2 / count) * (bb - b ** 2 / count);
  return (ab - a * b / count) / Math.sqrt(variance);
}

function printedLuminance(pixels, offset) {
  return (77 * pixels[offset] + 150 * pixels[offset + 1] + 29 * pixels[offset + 2]) / 256;
}

function matchesLitPrint(reference, patch) {
  // A strong wash can shift the locally registered artwork by a few pixels.
  const radius = Math.max(2, Math.round(reference.width * 0.004));
  const half = Math.round(radius / 2);
  const shifts = [0, -half, half, -radius, radius];
  for (const dy of shifts) {
    for (const dx of shifts) {
      let count = 0, a = 0, b = 0, aa = 0, bb = 0, ab = 0;
      for (const [x, y, red] of patch) {
        const rx = x + dx, ry = y + dy;
        if (rx < 0 || rx >= reference.width || ry < 0 || ry >= reference.height) continue;
        const ink = printedLuminance(reference.rgba, (ry * reference.width + rx) * 4);
        count++;
        a += red;
        b += ink;
        aa += red ** 2;
        bb += ink ** 2;
        ab += red * ink;
      }
      const threshold = dx || dy ? 0.72 : 0.67;
      if (count >= patch.length * 0.9 && correlation(count, a, b, aa, bb, ab) >= threshold) return true;
    }
  }
  return false;
}

function matchesPrintedColor(frame, geometry, box, labels, componentId, redLight) {
  const { reference, referenceAt, scale } = geometry;
  if (!reference?.rgba || !referenceAt) return false;
  const margin = Math.max(3, Math.round(5 * scale));
  const left = Math.max(0, box.x - margin), top = Math.max(0, box.y - margin);
  const right = Math.min(frame.width - 1, box.x + box.w + margin);
  const bottom = Math.min(frame.height - 1, box.y + box.h + margin);
  const origin = referenceAt({ x: left, y: top });
  const across = referenceAt({ x: right, y: top });
  const down = referenceAt({ x: left, y: bottom });
  const step = Math.max(1, Math.round(2 * scale));
  let samples = 0, foreground = 0, printedForeground = 0;
  let cameraSum = 0, artworkSum = 0, cameraSquares = 0, artworkSquares = 0, products = 0;
  const litPatch = [];
  for (let y = top; y <= bottom; y += step) {
    const v = (y - top) / (bottom - top);
    for (let x = left; x <= right; x += step) {
      const u = (x - left) / (right - left);
      const rx = Math.round((origin.x + (across.x - origin.x) * u + (down.x - origin.x) * v) * (reference.width - 1));
      const ry = Math.round((origin.y + (across.y - origin.y) * u + (down.y - origin.y) * v) * (reference.height - 1));
      if (rx < 0 || rx >= reference.width || ry < 0 || ry >= reference.height) continue;
      const pixel = y * frame.width + x;
      const offset = (ry * reference.width + rx) * 4;
      const red = frame.rgba[pixel * 4], ink = reference.rgba[offset];
      const cameraRed = red - frame.rgba[pixel * 4 + 1];
      const artworkRed = ink - reference.rgba[offset + 1];
      if (labels[pixel] === componentId) {
        foreground++;
        if (ink >= 39 && artworkRed >= 9 && ink - reference.rgba[offset + 2] >= 14) {
          printedForeground++;
        }
      }
      samples++;
      cameraSum += cameraRed;
      artworkSum += artworkRed;
      cameraSquares += cameraRed ** 2;
      artworkSquares += artworkRed ** 2;
      products += cameraRed * artworkRed;
      if (redLight) litPatch.push([rx, ry, red]);
    }
  }
  if (foreground < 12) return false;
  // Printed orange artwork keeps its spatial contrast pattern as lighting changes.
  if (printedForeground >= foreground * (redLight ? 0.55 : 0.65) &&
      correlation(samples, cameraSum, artworkSum, cameraSquares, artworkSquares, products) >= 0.5) return true;
  // Broad red light can also make a neutral printed detail look like a fire marker.
  return redLight && matchesLitPrint(reference, litPatch);
}

function boardUnderRedLight(mask, pixels) {
  let samples = 0, redSamples = 0;
  for (let i = 0; i < mask.length; i += 31) {
    if (!mask[i]) continue;
    samples++;
    if (pixels[i * 4] - pixels[i * 4 + 1] >= 18) redSamples++;
  }
  return samples > 0 && redSamples / samples >= 0.16;
}

export function detectFireTokens(cv, frame, geometry) {
  const { rooms, mask, scale } = geometry;
  const image = new cv.Mat(frame.height, frame.width, cv.CV_8UC1);
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centers = new cv.Mat();
  try {
    const output = image.data;
    const input = frame.rgba;
    const redLight = boardUnderRedLight(mask, input);
    for (let i = 0; i < output.length; i++) {
      if (!mask[i]) {
        output[i] = 0;
        continue;
      }
      const r = input[i * 4], g = input[i * 4 + 1], b = input[i * 4 + 2];
      const orange = r - g >= 12 && g - b >= 4 && r - b >= 24;
      const blueLitOrange = r - g >= 19 && r - b >= 14 && g - b >= -22;
      // A red ship alarm colors the floor. Its red cast would connect a small
      // marker to nearby artwork, so read the more saturated core instead.
      const saturatedOrange = r - g >= 64 && r - b >= 54;
      output[i] = r >= 52 && (redLight ? saturatedOrange : orange || blueLitOrange) ? 255 : 0;
    }
    const count = cv.connectedComponentsWithStats(image, labels, stats, centers, 8, cv.CV_32S);
    const components = labels.data32S;
    const found = new Map();
    for (let i = 1; i < count; i++) {
      const [x, y, w, h, area] = stats.intPtr(i);
      if (area < 138 * scale ** 2 || area > 920 * scale ** 2 ||
          Math.min(w, h) < 12 * scale || Math.max(w, h) > 41 * scale ||
          w / h < 0.52 || w / h > 1.55 || area < w * h * 0.38) continue;
      const [cx, cy] = centers.doublePtr(i);
      const room = rooms[mask[Math.round(cy) * frame.width + Math.round(cx)] - 1];
      if (!room || found.get(room.id)?.area > area) continue;
      const box = { x, y, w, h };
      if (matchesPrintedColor(frame, geometry, box, components, i, redLight)) continue;
      found.set(room.id, { room, box, area });
    }
    return found;
  } finally {
    for (const mat of [image, labels, stats, centers]) mat.delete();
  }
}

function surroundings(frame, { x, y, w, h }) {
  const samples = [];
  const radius = Math.max(w, h);
  const margin = Math.ceil(radius * 0.65);
  const step = Math.max(2, Math.round(radius / 7));
  for (let row = Math.max(0, y - margin); row < Math.min(frame.height, y + h + margin); row += step) {
    for (let col = Math.max(0, x - margin); col < Math.min(frame.width, x + w + margin); col += step) {
      if (row >= y - 2 && row <= y + h + 2 && col >= x - 2 && col <= x + w + 2) continue;
      const offset = (row * frame.width + col) * 4;
      samples.push([offset, frame.rgba[offset], frame.rgba[offset + 1], frame.rgba[offset + 2]]);
    }
  }
  return samples;
}

function surroundingsChanged(frame, baseline) {
  let changed = 0;
  for (const [offset, r, g, b] of baseline) {
    const delta = Math.abs(frame.rgba[offset] - r) + Math.abs(frame.rgba[offset + 1] - g)
      + Math.abs(frame.rgba[offset + 2] - b);
    if (delta >= 77) changed++;
  }
  return changed > baseline.length * 0.17;
}

function sameMarkerPosition(a, b) {
  return Math.abs(a.x + a.w / 2 - b.x - b.w / 2) <= Math.min(a.w, b.w) * 0.45 + 1 &&
    Math.abs(a.y + a.h / 2 - b.y - b.h / 2) <= Math.min(a.h, b.h) * 0.45 + 1;
}

export function createFireTracker() {
  const tracks = new Map();
  let lastFrame = null;
  let lastTime = 0;
  let frameNumber = 0;
  let snapshot = [];

  function observe(frame, detections, id, time) {
    if (id === lastFrame) return snapshot;
    if (time - lastTime > 3000) {
      for (const track of tracks.values()) {
        track.sightings = [];
        track.clear = 0;
        track.relocation = null;
      }
    }
    lastFrame = id;
    lastTime = time;
    frameNumber++;
    const observed = new Set();
    for (const [roomId, hit] of detections) {
      let record = tracks.get(roomId);
      if (!record) {
        record = { room: hit.room, sightings: [], clear: 0, active: false, state: "uncertain" };
        tracks.set(roomId, record);
      }
      const samePosition = record.box && sameMarkerPosition(record.box, hit.box);
      if (!samePosition) {
        record.sightings = [];
        if (record.active) {
          const previous = record.relocation;
          record.relocation = hit.box;
          if (!previous || !sameMarkerPosition(previous, hit.box)) continue;
        }
      }
      observed.add(roomId);
      record.relocation = null;
      if (record.active && samePosition && hit.area < record.area * 0.76 && surroundingsChanged(frame, record.baseline)) {
        record.clear = 0;
        record.state = "occluded";
        record.proposal = "Keep fire";
        continue;
      }
      record.box = hit.box;
      record.area = hit.area;
      record.baseline = surroundings(frame, hit.box);
      record.clear = 0;
      record.lastSeenFrame = frameNumber;
      if (!record.active) {
        record.sightings = record.sightings.filter(sighting => sighting >= frameNumber - 3);
        record.sightings.push(frameNumber);
        if (record.sightings.length >= 3) record.active = true;
      }
      record.state = record.active ? "visible" : "uncertain";
      record.proposal = record.active ? "Fire on" : "Checking";
    }
    for (const [roomId, record] of tracks) {
      if (observed.has(roomId)) continue;
      if (!detections.has(roomId)) record.relocation = null;
      if (record.state === "removed") continue;
      if (!record.active) {
        if (!record.sightings.length || frameNumber - record.lastSeenFrame >= 2) tracks.delete(roomId);
        continue;
      }
      const occluded = surroundingsChanged(frame, record.baseline);
      record.clear = occluded ? 0 : record.clear + 1;
      record.state = occluded ? "occluded" : "uncertain";
      record.proposal = "Keep fire";
      if (record.clear >= 3) {
        record.state = "removed";
        record.proposal = "Fire off";
        record.active = false;
      }
    }
    snapshot = [...tracks.values()].map(({ room, box, state, proposal, active }) => ({ room, box, state, proposal, active }));
    return snapshot;
  }

  return { observe };
}
