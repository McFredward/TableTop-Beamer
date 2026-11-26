// First-pass detector for the translucent orange Nemesis fire token. The
// room and frame-state logic can also consume a trained detector's boxes.
export function makeFireGeometry(board, roomCatalog, width, height) {
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
  return { outline, rooms, mask, scale };
}

export function detectFireTokens(cv, frame, { rooms, mask, scale }) {
  const image = new cv.Mat(frame.height, frame.width, cv.CV_8UC1);
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centers = new cv.Mat();
  try {
    const output = image.data;
    const input = frame.rgba;
    for (let i = 0; i < output.length; i++) {
      if (!mask[i]) {
        output[i] = 0;
        continue;
      }
      const r = input[i * 4], g = input[i * 4 + 1], b = input[i * 4 + 2];
      const orange = r - g >= 12 && g - b >= 4 && r - b >= 24;
      const blueLitOrange = r - g >= 19 && r - b >= 14 && g - b >= -22;
      output[i] = r >= 52 && (orange || blueLitOrange) ? 255 : 0;
    }
    const count = cv.connectedComponentsWithStats(image, labels, stats, centers, 8, cv.CV_32S);
    const found = new Map();
    for (let i = 1; i < count; i++) {
      const [x, y, w, h, area] = stats.intPtr(i);
      if (area < 138 * scale ** 2 || area > 920 * scale ** 2 ||
          Math.min(w, h) < 12 * scale || Math.max(w, h) > 41 * scale ||
          w / h < 0.52 || w / h > 1.55 || area < w * h * 0.38) continue;
      const [cx, cy] = centers.doublePtr(i);
      const room = rooms[mask[Math.round(cy) * frame.width + Math.round(cx)] - 1];
      if (!room || found.get(room.id)?.area > area) continue;
      found.set(room.id, { room, box: { x, y, w, h }, area });
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

export function createFireTracker() {
  const tracks = new Map();
  let lastFrame = null;
  let lastTime = 0;
  let snapshot = [];

  function observe(frame, detections, id, time) {
    if (id === lastFrame) return snapshot;
    if (time - lastTime > 3000) {
      for (const track of tracks.values()) track.seen = track.clear = 0;
    }
    lastFrame = id;
    lastTime = time;
    for (const [roomId, hit] of detections) {
      let record = tracks.get(roomId);
      if (!record) {
        record = { room: hit.room, seen: 0, clear: 0, active: false, state: "uncertain" };
        tracks.set(roomId, record);
      }
      if (record.active && hit.area < record.area * 0.76 && surroundingsChanged(frame, record.baseline)) {
        record.seen = record.clear = 0;
        record.state = "occluded";
        record.proposal = "Keep fire";
        continue;
      }
      record.box = hit.box;
      record.area = hit.area;
      record.baseline = surroundings(frame, hit.box);
      record.clear = 0;
      record.seen++;
      if (record.seen >= 2) record.active = true;
      record.state = record.active ? "visible" : "uncertain";
      record.proposal = record.active ? "Fire on" : "Checking";
    }
    for (const [roomId, record] of tracks) {
      if (detections.has(roomId)) continue;
      record.seen = 0;
      if (record.state === "removed") continue;
      if (!record.active) {
        tracks.delete(roomId);
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
    snapshot = [...tracks.values()].map(({ room, box, state, proposal }) => ({ room, box, state, proposal }));
    return snapshot;
  }

  return { observe };
}
