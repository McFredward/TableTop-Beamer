import assert from "node:assert/strict";
import test from "node:test";
import { createCalibrationSession } from "../src/server/calibration-session.mjs";
import {
  gridPoint, gridProbes, initialGrid, measureGrid, normalizeGrid, updateGrid,
} from "../src/app/runtime/calibration/calibration-math.js";

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

test("feedback corrects a camera-space offset and adds lines where cells need refinement", () => {
  const size = { width: 1920, height: 1080 };
  const board = { at: ({x,y}) => ({ x: 400 + 950*x, y: 210 + 690*y }) };
  const projector = {
    cameraToProjector: point => point,
    correction: (_, target, observed) => ({ x: target.x - observed.x, y: target.y - observed.y }),
  };
  const observe = grid => gridProbes(grid, board).map(({ projector: point }) => ({ x: point.x + 8, y: point.y - 5 }));
  const initial = initialGrid(board, projector);
  const measured = measureGrid(gridProbes(initial, board), observe(initial), projector);
  const improved = updateGrid(initial, measured);
  const followup = measureGrid(gridProbes(improved, board), observe(improved), projector);
  assert.ok(followup.error < measured.error / 2);
  assert.equal(improved.srcXs.length, 6);
  assert.equal(improved.srcYs.length, 6);
  assert.equal(normalizeGrid(improved, size).points.length, 36);
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
