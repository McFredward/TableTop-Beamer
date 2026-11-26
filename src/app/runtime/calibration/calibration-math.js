import { refinePrintedBoard } from "./printed-board-detail.js";

const DOT_COLUMNS = 9;
const DOT_ROWS = 7;
const DOT_THRESHOLD = 38;
const GRID_LEVELS = [{ size: 5, target: 4.5 }, { size: 9, target: 3 }, { size: 13, target: 2.2 }];

export const projectorDots = Array.from({ length: DOT_COLUMNS * DOT_ROWS }, (_, index) => ({
  id: index + 1,
  x: (index % DOT_COLUMNS + 0.5) / DOT_COLUMNS,
  y: (Math.floor(index / DOT_COLUMNS) + 0.5) / DOT_ROWS,
}));
export const DOT_BITS = Math.ceil(Math.log2(projectorDots.length + 1));

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function percentile(values, p) {
  return values.toSorted((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)];
}

export function projectPoint(matrix, point) {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const z = g * point.x + h * point.y + i;
  return { x: (a * point.x + b * point.y + c) / z, y: (d * point.x + e * point.y + f) / z };
}

function invert([a, b, c, d, e, f, g, h, i]) {
  const complement = [e*i-f*h, c*h-b*i, b*f-c*e, f*g-d*i, a*i-c*g, c*d-a*f, d*h-e*g, b*g-a*h, a*e-b*d];
  const det = a*complement[0] + b*complement[3] + c*complement[6];
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) throw new Error("The measured geometry is singular.");
  return complement.map(value => value / det);
}

function span(points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return { x: Math.max(...xs) - Math.min(...xs), y: Math.max(...ys) - Math.min(...ys) };
}

function fitMap(cv, pairs, tolerance, minimum, radius) {
  if (pairs.length < minimum) throw new Error("Too few matching points were visible.");
  const points = side => cv.matFromArray(pairs.length, 1, cv.CV_32FC2, pairs.flatMap(pair => [pair[side].x, pair[side].y]));
  const src = points("src");
  const dst = points("dst");
  const mask = new cv.Mat();
  let transform;
  try {
    transform = cv.findHomography(src, dst, cv.USAC_MAGSAC, tolerance, mask, 3000, 0.995);
    const inliers = pairs.filter((_, index) => mask.data[index]);
    if (transform.empty() || inliers.length < minimum) throw new Error("The visible points do not agree on a flat surface.");
    const matrix = Array.from(transform.data64F);
    const residuals = inliers.map(({ src, dst }) => {
      const estimate = projectPoint(matrix, src);
      return { src, x: dst.x - estimate.x, y: dst.y - estimate.y };
    });
    function at(point) {
      const position = projectPoint(matrix, point);
      let weight = 0;
      let dx = 0;
      let dy = 0;
      for (const residual of residuals) {
        const ratio = distance(point, residual.src) / radius;
        if (ratio >= 2) continue;
        const w = Math.exp(-2 * ratio ** 2);
        weight += w;
        dx += w * residual.x;
        dy += w * residual.y;
      }
      return { x: position.x + dx / Math.max(1, weight), y: position.y + dy / Math.max(1, weight) };
    }
    return { at, matrix, inverse: invert(matrix), inliers };
  } finally {
    src.delete();
    dst.delete();
    mask.delete();
    transform?.delete();
  }
}

export function boardRegion(at) {
  const steps = Array.from({ length: 12 }, (_, i) => i / 12);
  const outline = [
    ...steps.map(t => ({ x: t, y: 0 })), ...steps.map(t => ({ x: 1, y: t })),
    ...steps.map(t => ({ x: 1 - t, y: 1 })), ...steps.map(t => ({ x: 0, y: 1 - t })),
  ].map(at);
  return ({ x, y }, margin = 0) => {
    let inside = false;
    for (const [i, a] of outline.entries()) {
      const b = outline[(i + 1) % outline.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if ((a.y > y) !== (b.y > y) && x < a.x + (y - a.y) * dx / dy) inside = !inside;
      if (margin <= 0) continue;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
      if (Math.hypot(x - a.x - t * dx, y - a.y - t * dy) <= margin) return true;
    }
    return inside;
  };
}

export function registerBoard(cv, reference, camera, contacts) {
  const a = cv.matFromArray(reference.height, reference.width, cv.CV_8UC1, reference.pixels);
  const b = cv.matFromArray(camera.height, camera.width, cv.CV_8UC1, camera.pixels);
  const orb = new cv.ORB(8000, 1.2, 8, 31, 0, 2, cv.ORB_HARRIS_SCORE, 31, 10);
  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
  const aKeys = new cv.KeyPointVector();
  const bKeys = new cv.KeyPointVector();
  const aDesc = new cv.Mat();
  const bDesc = new cv.Mat();
  const mask = new cv.Mat();
  const matches = new cv.DMatchVectorVector();
  try {
    orb.detectAndCompute(a, mask, aKeys, aDesc);
    orb.detectAndCompute(b, mask, bKeys, bDesc);
    if (aDesc.empty() || bDesc.empty()) throw new Error("The printed board is too dark or out of focus.");
    matcher.knnMatch(aDesc, bDesc, matches, 2);
    const pairs = [];
    for (let i = 0; i < matches.size(); i++) {
      const pair = matches.get(i);
      try {
        if (pair.size() < 2) continue;
        const closest = pair.get(0);
        if (closest.distance >= 0.75 * pair.get(1).distance) continue;
        pairs.push({ src: aKeys.get(closest.queryIdx).pt, dst: bKeys.get(closest.trainIdx).pt });
      } finally {
        pair.delete();
      }
    }
    const fit = fitMap(cv, pairs, 4, 20, Math.min(reference.width, reference.height) * 0.16);
    const spread = span(fit.inliers.map(pair => pair.src));
    const occupied = new Set(fit.inliers.map(({ src }) =>
      Math.floor(4 * src.x / reference.width) + 4 * Math.floor(4 * src.y / reference.height)));
    if (spread.x < reference.width * 0.35 || spread.y < reference.height * 0.35 || occupied.size < 5) {
      throw new Error("Too little of the printed board could be matched.");
    }
    const detail = refinePrintedBoard(cv, a, b, fit.inverse, contacts);
    const at = point => {
      const pixel = { x: point.x * (reference.width - 1), y: point.y * (reference.height - 1) };
      return detail.count || detail.edges ? projectPoint(fit.matrix, detail.at(pixel)) : fit.at(pixel);
    };
    for (const point of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]) {
      const position = at(point);
      if (!(position.x >= 0 && position.x < camera.width && position.y >= 0 && position.y < camera.height)) {
        throw new Error("The camera must see all four corners of the board.");
      }
    }
    return {
      at,
      contains: boardRegion(at),
      count: fit.inliers.length,
      detailCount: detail.count,
      edges: detail.edges,
    };
  } finally {
    for (const item of [a, b, orb, matcher, aKeys, bKeys, aDesc, bDesc, mask, matches]) item.delete();
  }
}

export function localContrast(cv, frame) {
  const gray = cv.matFromArray(frame.height, frame.width, cv.CV_32FC1, frame.pixels);
  const background = new cv.Mat();
  try {
    cv.GaussianBlur(gray, background, new cv.Size(0, 0), 8);
    const blurred = background.data32F;
    return { ...frame, pixels: Float32Array.from(gray.data32F, (value, index) => value - blurred[index]) };
  } finally {
    gray.delete();
    background.delete();
  }
}

function patchMean(frame, point) {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  let sum = 0;
  let count = 0;
  for (let row = Math.max(y - 2, 0); row < Math.min(y + 3, frame.height); row++) {
    for (let col = Math.max(x - 2, 0); col < Math.min(x + 3, frame.width); col++) {
      sum += frame.pixels[row * frame.width + col];
      count++;
    }
  }
  return sum / count;
}

export function detectDots(cv, dark, lit, contains) {
  if (dark.width !== lit.width || dark.height !== lit.height) throw new Error("Camera size changed during calibration.");
  const mask = new cv.Mat(lit.height, lit.width, cv.CV_8UC1);
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centers = new cv.Mat();
  try {
    const data = mask.data;
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.min(lit.pixels[i], lit.pixels[i] - dark.pixels[i]) > DOT_THRESHOLD ? 255 : 0;
    }
    const components = cv.connectedComponentsWithStats(mask, labels, stats, centers, 8, cv.CV_32S);
    const result = [];
    for (let i = 1; i < components; i++) {
      const [left, top, w, h, area] = stats.intPtr(i);
      if (area < 5 || area > 1000 || Math.min(w, h) < 2 || Math.max(w, h) > 35) continue;
      let x = 0;
      let y = 0;
      let weight = 0;
      const componentsByPixel = labels.data32S;
      for (let row = top; row < top + h; row++) {
        for (let col = left; col < left + w; col++) {
          const pixel = row * lit.width + col;
          if (componentsByPixel[pixel] !== i) continue;
          const value = Math.min(lit.pixels[pixel], lit.pixels[pixel] - dark.pixels[pixel]) - DOT_THRESHOLD;
          x += col * value;
          y += row * value;
          weight += value;
        }
      }
      const point = { x: x / weight, y: y / weight };
      if (contains && !contains(point)) continue;
      const off = patchMean(dark, point);
      const contrast = patchMean(lit, point) - off;
      if (contrast >= DOT_THRESHOLD) result.push({ ...point, off, contrast });
    }
    return result;
  } finally {
    mask.delete();
    labels.delete();
    stats.delete();
    centers.delete();
  }
}

function interpolateProjector(fit, camera) {
  const result = projectPoint(fit.inverse, camera);
  for (let i = 0; i < 4; i++) {
    const delta = toProjectorDelta(fit, result, camera, fit.at(result));
    result.x += delta.x;
    result.y += delta.y;
    if (Math.hypot(delta.x, delta.y) < 0.05) break;
  }
  return result;
}

function toProjectorDelta(fit, position, target, observed) {
  const a = fit.at(position);
  const b = fit.at({ x: position.x + 1, y: position.y });
  const c = fit.at({ x: position.x, y: position.y + 1 });
  const m00 = b.x - a.x;
  const m01 = c.x - a.x;
  const m10 = b.y - a.y;
  const m11 = c.y - a.y;
  const determinant = m00*m11 - m01*m10;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-8) return { x: 0, y: 0 };
  const dx = target.x - observed.x;
  const dy = target.y - observed.y;
  return { x: (dx*m11 - dy*m01) / determinant, y: (dy*m00 - dx*m10) / determinant };
}

export function registerProjector(cv, board, dark, lit, bitFrames, size) {
  if (bitFrames.length !== DOT_BITS || bitFrames.some(frame => frame.width !== dark.width || frame.height !== dark.height)) {
    throw new Error("Camera size changed during calibration.");
  }
  const decoded = new Map();
  for (const dot of detectDots(cv, dark, lit, board.contains)) {
    const scores = bitFrames.map(frame => (patchMean(frame, dot) - dot.off) / dot.contrast);
    if (scores.some(score => Math.abs(score - 0.5) < 0.1)) continue;
    const id = scores.reduce((sum, value, bit) => sum + (value > 0.5 ? 2 ** bit : 0), 0);
    const pattern = projectorDots[id - 1];
    if (!pattern || decoded.get(id)?.dst.contrast >= dot.contrast) continue;
    decoded.set(id, { src: { x: pattern.x * size.width, y: pattern.y * size.height }, dst: dot });
  }
  const fit = fitMap(cv, [...decoded.values()], 16, 8, Math.min(size.width, size.height) * 0.18);
  const spread = span(fit.inliers.map(pair => pair.src));
  if (spread.x < size.width * 0.22 || spread.y < size.height * 0.22) {
    throw new Error("Too few projected points were seen across the board.");
  }
  return {
    count: fit.inliers.length,
    cameraToProjector: position => interpolateProjector(fit, position),
    correction: (projector, target, observed) => toProjectorDelta(fit, projector, target, observed),
  };
}

const START_LINES = [0, 0.25, 0.5, 0.75, 1];

export function initialGrid(board, projector) {
  return {
    srcXs: START_LINES.slice(),
    srcYs: START_LINES.slice(),
    points: START_LINES.map(y => START_LINES.map(x => projector.cameraToProjector(board.at({ x, y })))),
  };
}

// The renderer splits each grid cell into TL/TR/BR and TL/BR/BL triangles.
export function gridPoint(grid, x, y) {
  const col = Math.max(0, grid.srcXs.findLastIndex(value => value <= x) - Number(x === 1));
  const row = Math.max(0, grid.srcYs.findLastIndex(value => value <= y) - Number(y === 1));
  const u = (x - grid.srcXs[col]) / (grid.srcXs[col+1] - grid.srcXs[col]);
  const v = (y - grid.srcYs[row]) / (grid.srcYs[row+1] - grid.srcYs[row]);
  const [tl, tr] = grid.points[row].slice(col, col+2);
  const [bl, br] = grid.points[row+1].slice(col, col+2);
  const weights = u >= v ? [1-u, u-v, 0, v] : [1-v, 0, v-u, u];
  return Object.fromEntries(["x", "y"].map(axis => [axis,
    [tl, tr, bl, br].reduce((sum, point, i) => sum + point[axis] * weights[i], 0)
  ]));
}

export function gridProbes(grid, board) {
  const vertices = grid.srcYs.flatMap(y => grid.srcXs.map(x => ({ x, y, cell: false })));
  const cells = grid.srcYs.slice(1).flatMap((bottom, row) => grid.srcXs.slice(1).map((right, col) => ({
    x: (right + grid.srcXs[col]) / 2,
    y: (bottom + grid.srcYs[row]) / 2,
    cell: true,
  })));
  return [...vertices, ...cells].map(source => ({
    source, projector: gridPoint(grid, source.x, source.y), target: board.at(source),
  }));
}

export function measureGrid(probes, detected, projector) {
  const remaining = new Set(detected);
  const matches = [];
  for (const probe of probes) {
    let observed;
    let error = 36;
    for (const dot of remaining) {
      const delta = distance(dot, probe.target);
      if (delta < error) {
        error = delta;
        observed = dot;
      }
    }
    if (!observed) continue;
    remaining.delete(observed);
    matches.push({ ...probe, error, delta: projector.correction(probe.projector, probe.target, observed) });
  }
  const quadrants = new Set(matches.map(({ source }) => (source.x > 0.5 ? 1 : 0) + (source.y > 0.5 ? 2 : 0)));
  if (matches.length < Math.max(12, probes.length * 0.65) || quadrants.size < 4) {
    throw new Error("The projector could not verify enough points in all four parts of the board.");
  }
  return { matches, error: percentile(matches.map(match => match.error), 0.90) };
}

export function updateGrid(grid, measured, { lockEdges = false } = {}) {
  const { srcXs, srcYs } = grid;
  const radius = 1 / (Math.max(srcXs.length, srcYs.length) - 1);
  const points = srcYs.map(y => srcXs.map(x => {
    const point = gridPoint(grid, x, y);
    if (lockEdges && (x === 0 || x === 1 || y === 0 || y === 1)) return point;
    let weight = 0;
    let dx = 0;
    let dy = 0;
    for (const match of measured.matches) {
      const ratio = distance({ x, y }, match.source) / (match.radius ?? radius);
      if (ratio > 1.5) continue;
      const w = Math.exp(-4 * ratio ** 2) * (match.weight ?? 1);
      weight += w;
      dx += w * match.delta.x;
      dy += w * match.delta.y;
    }
    return {
      x: point.x + 0.85 * dx / Math.max(1, weight),
      y: point.y + 0.85 * dy / Math.max(1, weight),
    };
  }));
  return { srcXs, srcYs, points };
}

function resizeGrid(grid, size) {
  const lines = Array.from({ length: size }, (_, index) => index / (size - 1));
  return { srcXs: lines, srcYs: lines, points: lines.map(y => lines.map(x => gridPoint(grid, x, y))) };
}

function roomProbes(rooms, grid, board) {
  const samples = [];
  const areas = rooms.flatMap(room => {
    if (!Array.isArray(room.polygon)) return [];
    const polygon = room.polygon.filter(point => Array.isArray(point) && point.length >= 2 &&
      point.slice(0, 2).every(value => Number.isFinite(value) && value >= 0 && value <= 1))
      .map(([x, y]) => ({ x, y }));
    if (polygon.length < 3) return [];
    const xs = polygon.toSorted((a, b) => a.x - b.x);
    const ys = polygon.toSorted((a, b) => a.y - b.y);
    const width = xs.at(-1).x - xs[0].x;
    const height = ys.at(-1).y - ys[0].y;
    const center = { x: xs[0].x + width / 2, y: ys[0].y + height / 2 };
    return [{ area: width * height, center, edges: [xs[0], xs.at(-1), ys[0], ys.at(-1)] }];
  }).toSorted((a, b) => a.area - b.area);
  // Small targets such as indicator lights get their own observation
  // before nearby room and corridor outlines can fill that part of the image.
  const sources = [...areas.map(area => area.center), ...areas.flatMap(area => area.edges)];
  for (const source of sources) {
    if (samples.length === 120) break;
    if (!samples.some(sample => distance(sample.source, source) < 0.027)) {
      samples.push({ source, projector: gridPoint(grid, source.x, source.y), target: board.at(source) });
    }
  }
  const quadrants = new Set(samples.map(({ source }) => (source.x > 0.5 ? 1 : 0) + (source.y > 0.5 ? 2 : 0)));
  return samples.length >= 12 && quadrants.size === 4 ? samples : [];
}

export async function refineProjectionGrid({ board, projector, size, rooms = [], verify }) {
  let grid = initialGrid(board, projector);
  let result;
  for (const level of GRID_LEVELS) {
    if (grid.srcXs.length !== level.size) grid = resizeGrid(grid, level.size);
    let best;
    for (let pass = 1; pass <= 3; pass++) {
      normalizeGrid(grid, size);
      const probes = gridProbes(grid, board);
      const groups = probes.length <= 100 ? [probes] : [
        probes.filter(probe => !probe.source.cell), probes.filter(probe => probe.source.cell),
      ];
      if (level === GRID_LEVELS.at(-1)) {
        const roomsToVerify = roomProbes(rooms, grid, board);
        if (roomsToVerify.length) groups.push(roomsToVerify);
      }
      const observations = [];
      for (const [index, group] of groups.entries()) {
        observations.push(await verify(group, { level: level.size, pass, index, groups: groups.length }));
      }
      const matches = observations.flatMap(observation => observation.matches);
      const error = percentile(matches.map(match => match.error), 0.90);
      if (best && error >= best.error - 0.12) break;
      best = { grid, matches, error, expected: groups.reduce((sum, group) => sum + group.length, 0) };
      if (error <= level.target) break;
      grid = updateGrid(grid, best);
    }
    grid = best.grid;
    result = best;
  }
  const worstLocations = percentile(result.matches.map(match => match.error), 0.97);
  if (result.error > 5 || worstLocations > 10 || result.matches.length < result.expected * 0.80) {
    throw new Error("Fine alignment could not be verified across the board. Keep it still and fully within the projected area.");
  }
  return result;
}

export function normalizeGrid(grid, size) {
  const points = grid.points.flatMap((items, row) => items.map((point, col) => ({
    row, col, x: point.x / size.width, y: point.y / size.height,
  })));
  if (points.some(point => !(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1))) {
    throw new Error("Part of the board is outside the projector's usable picture.");
  }
  const cross = (a, b, c) => (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x);
  for (let r = 1; r < grid.points.length; r++) {
    for (let c = 1; c < grid.points[r].length; c++) {
      const [tl, tr, bl, br] = [grid.points[r-1][c-1], grid.points[r-1][c], grid.points[r][c-1], grid.points[r][c]];
      if (cross(tl, tr, br) <= 0 || cross(tl, br, bl) <= 0) throw new Error("The proposed grid contains a folded cell.");
    }
  }
  return { srcXs: grid.srcXs, srcYs: grid.srcYs, points };
}
