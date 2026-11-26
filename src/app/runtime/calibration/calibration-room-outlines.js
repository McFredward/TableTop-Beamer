import { distance, gridPoint, normalizeGrid, percentile, updateGrid } from "./calibration-math.js";

function pointOn(a, b, t) {
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

function sample(frame, { x, y }) {
  const col = Math.floor(x);
  const row = Math.floor(y);
  if (col < 0 || row < 0 || col + 1 >= frame.width || row + 1 >= frame.height) return NaN;
  const index = row * frame.width + col;
  const u = x - col;
  const v = y - row;
  const { pixels, width } = frame;
  return (1 - v) * (pixels[index] * (1 - u) + pixels[index + 1] * u) +
    v * (pixels[index + width] * (1 - u) + pixels[index + width + 1] * u);
}

function shifted(point, normal, amount, tangent, along = 0) {
  return { x: point.x + normal.x * amount + tangent.x * along, y: point.y + normal.y * amount + tangent.y * along };
}

function stripe(read, offset) {
  return (read(offset, -3) + read(offset, 0) + read(offset, 3)) / 3;
}

function signature(read, offset) {
  const values = Array.from({ length: 11 }, (_, i) => stripe(read, offset + i - 5));
  return values.slice(1).map((value, i) => value - values[i]);
}

function correlation(a, b) {
  const a2 = a.reduce((sum, value) => sum + value * value, 0);
  const b2 = b.reduce((sum, value) => sum + value * value, 0);
  return a.reduce((sum, value, i) => sum + value * b[i], 0) / Math.sqrt(a2 * b2);
}

function peakOffset(values, index) {
  const divisor = values[index - 1] - 2 * values[index] + values[index + 1];
  if (!(divisor < -1e-6)) return 0;
  return Math.max(-0.5, Math.min(0.5, (values[index - 1] - values[index + 1]) / (2 * divisor)));
}

function printedTarget(board, reference, dark, source, start, end) {
  const origin = board.at(source);
  const a = board.at(start);
  const b = board.at(end);
  const length = distance(a, b);
  const tangent = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
  const normal = { x: -tangent.y, y: tangent.x };
  const nextX = board.at({ x: source.x + 1 / (reference.width - 1), y: source.y });
  const nextY = board.at({ x: source.x, y: source.y + 1 / (reference.height - 1) });
  const dx = { x: nextX.x - origin.x, y: nextX.y - origin.y };
  const dy = { x: nextY.x - origin.x, y: nextY.y - origin.y };
  const determinant = dx.x * dy.y - dx.y * dy.x;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-6) return null;
  const print = { x: source.x * (reference.width - 1), y: source.y * (reference.height - 1) };
  const referenceAt = (across, along) => {
    const offset = shifted({ x: 0, y: 0 }, normal, across, tangent, along);
    return sample(reference, {
      x: print.x + (offset.x * dy.y - dy.x * offset.y) / determinant,
      y: print.y + (dx.x * offset.y - offset.x * dx.y) / determinant,
    });
  };
  const template = signature(referenceAt, 0);
  const strongest = Math.max(...template.map(Math.abs));
  const atContour = Math.max(...template.slice(2, 8).map(Math.abs));
  if (!(atContour >= Math.max(4, strongest * 0.48))) return null;

  const cameraAt = (across, along) => sample(dark, shifted(origin, normal, across, tangent, along));
  const reach = 5;
  const correlationByOffset = Array.from({ length: reach * 2 + 1 }, (_, index) => {
    const offset = index - reach;
    return correlation(template, signature(cameraAt, offset)) - 0.012 * Math.abs(offset);
  });
  const best = correlationByOffset.reduce((previous, score, index) =>
    score > (correlationByOffset[previous] ?? 0.64) ? index : previous, -1);
  if (best < 1 || best >= reach * 2) return null;
  const alternative = Math.max(...correlationByOffset.filter((_, index) => Math.abs(index - best) >= 2));
  if (correlationByOffset[best] - alternative < 0.045) return null;
  const offset = best - reach + peakOffset(correlationByOffset, best);
  return { source, origin, tangent, normal, offset };
}

function roomPolygons(rooms, board, reference, dark) {
  let remaining = 4000;
  return rooms.slice(0, 100).flatMap(room => {
    if (!Array.isArray(room.polygon) || room.polygon.length < 3 || room.polygon.some(point => !Array.isArray(point) ||
      !point.slice(0, 2).every(value => Number.isFinite(value) && value >= 0 && value <= 1) || point.length < 2)) return [];
    const polygon = room.polygon.map(([x, y]) => ({ x, y }));
    const path = [];
    const anchors = [];
    for (const [i, start] of polygon.entries()) {
      const end = polygon[(i + 1) % polygon.length];
      const length = distance(board.at(start), board.at(end));
      const segments = Math.max(1, Math.ceil(length / 9));
      for (let k = 0; k < segments; k++) path.push(pointOn(start, end, k / segments));
      const count = Math.floor(length / 14);
      for (let k = 0; k < count; k++) {
        const source = pointOn(start, end, (k + 0.5) / count);
        if (Math.min(source.x, source.y, 1 - source.x, 1 - source.y) < 0.035) continue;
        const anchor = printedTarget(board, reference, dark, source, start, end);
        if (anchor) anchors.push(anchor);
      }
    }
    if (anchors.length < 3 || path.length > remaining) return [];
    remaining -= path.length;
    return [{ path, anchors }];
  });
}

function observeOutline(frame, dark, anchor, grid, projector) {
  const { origin, normal, tangent, offset, source } = anchor;
  const reach = 10;
  const profile = Array.from({ length: reach * 2 + 1 }, (_, index) => stripe((across, along) => {
    const position = shifted(origin, normal, across, tangent, along);
    return sample(frame, position) - sample(dark, position);
  }, index - reach));
  const peak = profile.indexOf(Math.max(...profile));
  if (peak < 1 || peak >= reach * 2 || profile[peak] - percentile(profile, 0.50) < 18) return null;
  const observedOffset = peak - reach + peakOffset(profile, peak);
  const error = Math.abs(offset - observedOffset);
  if (error > 10) return null;
  const at = gridPoint(grid, source.x, source.y);
  const target = shifted(origin, normal, offset, tangent);
  const observed = shifted(origin, normal, observedOffset, tangent);
  const correction = projector.correction(at, target, observed);
  const step = Math.max(1, Math.hypot(correction.x, correction.y) / 6);
  return { anchor, source, error, delta: { x: correction.x / step, y: correction.y / step } };
}

export async function refineRoomOutlines({ measured, board, projector, reference, dark, rooms, size, capture }) {
  const polygons = roomPolygons(rooms, board, reference, dark);
  if (!polygons.length) return { ...measured, outline: null };
  const anchors = polygons.flatMap((polygon, room) => polygon.anchors.map(anchor => ({ ...anchor, room })));
  async function measure(grid, pass) {
    const paths = polygons.map(({ path }) => path.map(({ x, y }) => {
      const point = gridPoint(grid, x, y);
      return { x: point.x / size.width, y: point.y / size.height };
    }));
    const frame = await capture(paths, pass);
    return anchors.map(anchor => observeOutline(frame, dark, anchor, grid, projector)).filter(Boolean);
  }

  const initial = await measure(measured.grid, 1);
  if (initial.length < 12 || new Set(initial.map(({ anchor }) => anchor.room)).size < 3) {
    return { ...measured, outline: null };
  }
  const initialError = percentile(initial.map(match => match.error), 0.90);
  const verified = { ...measured, outline: { count: initial.length, error: initialError } };
  if (initialError < 0.9) return verified;
  const candidate = updateGrid(measured.grid, { matches: initial }, { lockEdges: true });
  try {
    normalizeGrid(candidate, size);
  } catch {
    return verified;
  }
  const expected = new Map(initial.map(match => [match.anchor, match.error]));
  const next = (await measure(candidate, 2)).filter(match => expected.has(match.anchor));
  if (next.length < initial.length * 0.85) return verified;
  const improved = percentile(next.map(match => match.error), 0.90);
  const before = percentile(next.map(match => expected.get(match.anchor)), 0.90);
  const gain = next.reduce((total, match) => total + expected.get(match.anchor) - match.error, 0) / next.length;
  if (improved > before - 0.15 || gain < 0.06) return verified;
  return { ...verified, grid: candidate, outline: { count: next.length, error: improved } };
}
