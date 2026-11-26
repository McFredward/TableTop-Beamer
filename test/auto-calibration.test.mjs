import assert from "node:assert/strict";
import test from "node:test";
import cvModule from "@techstark/opencv-js";
import { createCalibrationSession } from "../src/server/calibration-session.mjs";
import {
  gridPoint, initialGrid, measureGrid, normalizeGrid, refineProjectionGrid,
} from "../src/app/runtime/calibration/calibration-math.js";
import { refinePrintedBoard } from "../src/app/runtime/calibration/printed-board-detail.js";

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
  } finally {
    for (const mat of [reference, scene, camera, mapX, mapY]) mat.delete();
  }
});
