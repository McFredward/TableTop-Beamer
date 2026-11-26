import assert from "node:assert/strict";
import test from "node:test";
import cvModule from "@techstark/opencv-js";
import { createCalibrationSession } from "../src/server/calibration-session.mjs";
import {
  gridPoint, initialGrid, measureGrid, normalizeGrid, refineProjectionGrid,
} from "../src/app/runtime/calibration/calibration-math.js";
import { refinePrintedBoard } from "../src/app/runtime/calibration/printed-board-detail.js";
import { refineRoomOutlines } from "../src/app/runtime/calibration/calibration-room-outlines.js";
import { edgeContacts, printedIndicators } from "../src/app/runtime/calibration/calibration-targets.js";

test("a pattern requires a matching projector acknowledgement and fresh frames from the same camera", () => {
  const state = createCalibrationSession();
  const output = { id: "pi", socket: { destroyed: false } };
  const { id } = state.start({ boardId: "nemesis", generation: 4, gridAt: null, output });
  assert.equal(state.start({ boardId: "nemesis", generation: 4, output }), null);
  const { step } = state.pattern(id, [{ x: 0.2, y: 0.5 }]);
  assert.equal(state.frame(id, step, { sequence: 201, generation: 4 }), null);
  assert.equal(state.shown(id, step, "other", 1920, 1080, { sequence: 201, generation: 4 }), false);
  assert.equal(state.shown(id, step, "pi", 1920, 1080, { sequence: 201, generation: 4 }), true);
  assert.equal(state.frame(id, step, { sequence: 202, generation: 4 }), null);
  assert.equal(state.frame(id, step, { sequence: 203, generation: 5 }), false);
  assert.deepEqual(state.frame(id, step, { sequence: 203, generation: 4 }).headers, {
    "X-Projector-Width": 1920, "X-Projector-Height": 1080,
  });
  const outline = [{ x: 0.2, y: 0.5 }, { x: 0.3, y: 0.6 }, { x: 0.2, y: 0.6 }];
  assert.equal(state.pattern(id, [], [outline]), null);
  assert.equal(state.pattern(id, undefined, [[...outline.slice(1), { x: 1.1, y: 0.6 }]]), null);
  assert.deepEqual(state.pattern(id, undefined, [outline]).paths, [outline]);
  assert.equal(state.frame(id, step, { sequence: 205, generation: 4 }), false);
  assert.equal(state.stop(id), output);
  assert.equal(state.frame(id, step, { sequence: 204, generation: 4 }), false);
});

test("feedback passes through coarse, intermediate and fine grids", async () => {
  const size = { width: 1920, height: 1080 };
  const board = { at: ({x,y}) => ({ x: 400 + 950*x, y: 210 + 690*y }) };
  const projector = {
    cameraToProjector: point => point,
    correction: (_, target, observed) => ({ x: target.x - observed.x, y: target.y - observed.y }),
  };
  const observedLevels = new Set();
  const result = await refineProjectionGrid({
    board, projector, size,
    async verify(probes, { level }) {
      observedLevels.add(level);
      const markers = probes.map(({ projector: point }) => ({ x: point.x + 8, y: point.y - 5 }));
      return measureGrid(probes, markers, projector);
    },
  });
  assert.deepEqual([...observedLevels], [5, 9, 13]);
  assert.ok(result.error < 3);
  assert.equal(normalizeGrid(result.grid, size).points.length, 169);
  const folded = initialGrid(board, projector);
  folded.points[0][0] = { x: 1000, y: 1000 };
  assert.throws(() => normalizeGrid(folded, size), /folded/);
});

test("cell centres use the same triangle diagonal as the projection renderer", () => {
  const grid = {
    srcXs: [0, 1], srcYs: [0, 1],
    points: [[{ x: 0, y: 0 }, { x: 12, y: 0 }], [{ x: 0, y: 8 }, { x: 10, y: 10 }]],
  };
  assert.deepEqual(gridPoint(grid, 0.5, 0.5), { x: 5, y: 5 });
});

test("printed detail and physical edges correct different parts of a coarse board fit", async () => {
  const { cv } = await new Promise(resolve => {
    if (cvModule.Mat) resolve({ cv: cvModule });
    else cvModule.onRuntimeInitialized = () => resolve({ cv: cvModule });
  });
  const width = 660;
  const height = 470;
  const border = 42;
  const reference = new cv.Mat(height, width, cv.CV_8UC1, new cv.Scalar(24));
  const scene = new cv.Mat(height + 2 * border, width + 2 * border, cv.CV_8UC1, new cv.Scalar(130));
  const camera = new cv.Mat();
  const cameraWidth = scene.cols;
  const cameraHeight = scene.rows;
  const mapX = new cv.Mat(cameraHeight, cameraWidth, cv.CV_32FC1);
  const mapY = new cv.Mat(cameraHeight, cameraWidth, cv.CV_32FC1);
  try {
    let random = 29738;
    const next = variation => {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      return random % variation;
    };
    for (let i = 0; i < 720; i++) {
      cv.circle(reference, new cv.Point(10 + next(width - 20), 10 + next(height - 20)),
        2 + next(7), new cv.Scalar(40 + next(90)), -1);
    }
    const inside = scene.roi(new cv.Rect(border, border, width, height));
    reference.copyTo(inside);
    inside.delete();
    const xs = mapX.data32F;
    const ys = mapY.data32F;
    for (let y = 0; y < cameraHeight; y++) {
      for (let x = 0; x < cameraWidth; x++) {
        const index = y * cameraWidth + x;
        xs[index] = x + 7 * Math.cos(x / cameraWidth * Math.PI);
        ys[index] = y - 9 * Math.sin(x / cameraWidth * Math.PI);
      }
    }
    cv.remap(scene, camera, mapX, mapY, cv.INTER_LINEAR);
    const detail = refinePrintedBoard(cv, reference, camera, [1, 0, -border, 0, 1, -border, 0, 0, 1]);
    assert.ok(detail.count > 100);
    assert.equal(detail.edges, 4);
    const left = detail.at({ x: 0, y: 215 });
    const right = detail.at({ x: width - 1, y: 215 });
    const middle = detail.at({ x: 336, y: 215 });
    assert.ok(left.x > -3 && left.x < 0 && right.x > width - 1 && right.x < width + 3);
    assert.ok(middle.y > 222 && middle.y < 226);
    const contacts = edgeContacts([{ polygon: [[0.90, 0.39], [1, 0.39], [1, 0.54], [0.9, 0.54]] }]);
    assert.deepEqual(contacts.right, [[0.39, 0.54]]);
    const engine = refinePrintedBoard(cv, reference, camera, [1, 0, -border, 0, 1, -border, 0, 0, 1], contacts);
    assert.ok(engine.at({ x: width - 1, y: 215 }).x > right.x + 4);
    assert.deepEqual(engine.at({ x: width - 1, y: 65 }), detail.at({ x: width - 1, y: 65 }));

    // The reference artwork can extend past the printed edge on one side.
    cv.rectangle(scene, new cv.Point(border, border), new cv.Point(border + 28, border + height - 1),
      new cv.Scalar(130), -1);
    cv.remap(scene, camera, mapX, mapY, cv.INTER_LINEAR);
    const trimmed = refinePrintedBoard(cv, reference, camera, [1, 0, -border, 0, 1, -border, 0, 0, 1]);
    assert.equal(trimmed.edges, 4);
    assert.ok(trimmed.at({ x: 0, y: 215 }).x > 24);
  } finally {
    for (const mat of [reference, scene, camera, mapX, mapY]) mat.delete();
  }
});

test("the room-outline pass verifies a mesh correction and preserves its outside edges", async () => {
  const { cv } = await new Promise(resolve => {
    if (cvModule.Mat) resolve({ cv: cvModule });
    else cvModule.onRuntimeInitialized = () => resolve({ cv: cvModule });
  });
  const size = { width: 480, height: 400 };
  const board = { at: ({ x, y }) => ({ x: 40 + 400 * x, y: 40 + 320 * y }) };
  const rectangle = (x, y) => [[x, y], [x + 0.20, y], [x + 0.20, y + 0.20], [x, y + 0.20]];
  const rooms = [[0.20, 0.20], [0.55, 0.25], [0.35, 0.60]].map(([x, y]) => ({ polygon: rectangle(x, y) }));
  function render(width, height, paths, value, translation = 0) {
    const image = new cv.Mat(height, width, cv.CV_8UC1, new cv.Scalar(0));
    const shapes = new cv.MatVector();
    try {
      for (const path of paths) {
        const line = cv.matFromArray(path.length, 1, cv.CV_32SC2,
          path.flatMap(({ x, y }) => [Math.round(x + translation), Math.round(y)]));
        shapes.push_back(line);
        line.delete();
      }
      cv.polylines(image, shapes, true, new cv.Scalar(value), 3, cv.LINE_AA);
      return Uint8Array.from(image.data);
    } finally { image.delete(); shapes.delete(); }
  }
  const printed = rooms.map(({ polygon }) => polygon.map(([x, y]) => ({ x, y })));
  const reference = { width: 401, height: 321, pixels: render(401, 321,
    printed.map(path => path.map(({ x, y }) => ({ x: x * 400, y: y * 320 }))), 105) };
  const dark = { ...size, pixels: render(size.width, size.height, printed.map(path => path.map(board.at)), 85) };
  const projector = {
    cameraToProjector: point => point,
    correction: (_, target, observed) => ({ x: target.x - observed.x, y: target.y - observed.y }),
  };
  const grid = initialGrid(board, projector);
  let first;
  async function refine(makeWorse) {
    return refineRoomOutlines({
      measured: { grid }, board, projector, reference, dark, rooms, size,
      capture(paths, pass) {
        first ??= paths;
        const overlaid = render(size.width, size.height,
          paths.map(path => path.map(({ x, y }) => ({ x: x * size.width, y: y * size.height }))),
          130, makeWorse && pass === 2 ? 7 : 4);
        return { ...size, pixels: Uint8Array.from(overlaid, (value, i) => Math.min(255, value + dark.pixels[i])) };
      },
    });
  }
  const improved = await refine(false);
  const rejected = await refine(true);
  assert.equal(first.length, rooms.length);
  assert.ok(improved.outline.count > 12);
  assert.ok(improved.outline.error < rejected.outline.error);
  assert.notEqual(improved.grid, grid);
  assert.equal(rejected.grid, grid);
  assert.deepEqual(improved.grid.points[0], grid.points[0]);
  assert.deepEqual(improved.grid.points.at(-1), grid.points.at(-1));
});

test("small coloured indicators can anchor a local mesh correction independently of room outlines", async () => {
  const size = { width: 480, height: 400 };
  const board = { at: ({ x, y }) => ({ x: 40 + 400 * x, y: 40 + 320 * y }) };
  const projector = {
    cameraToProjector: point => point,
    correction: (_, target, observed) => ({ x: target.x - observed.x, y: target.y - observed.y }),
  };
  const rooms = [{ id: "light", polygon: [[0.461, 0.052], [0.479, 0.052], [0.479, 0.068], [0.461, 0.068]] }];
  function frame(width, height, x, y) {
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let row = y - 2; row <= y + 2; row++) {
      for (let col = x - 2; col <= x + 2; col++) rgba[4 * (row * width + col)] = 160;
    }
    return { width, height, rgba };
  }
  const reference = frame(401, 321, 188, 19);
  const dark = frame(480, 400, 233, 58);
  const indicators = printedIndicators(rooms, board, reference, dark);
  assert.deepEqual(indicators[0]?.target, { x: 233, y: 58 });
  const grid = initialGrid(board, projector);
  const result = await refineRoomOutlines({
    measured: { grid }, board, projector, reference, dark, rooms, indicators, size,
    captureIndicators: points => points.map(point => ({ x: point.x * size.width, y: point.y * size.height })),
  });
  assert.ok(result.indicators.error < 0.9);
  assert.deepEqual(result.grid.points[0][0], grid.points[0][0]);
  assert.deepEqual(result.grid.points.at(-1).at(-1), grid.points.at(-1).at(-1));
});
