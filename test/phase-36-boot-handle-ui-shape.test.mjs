// Phase 36 W0 RED unit — bootHandleUi export shape contract.
// File `src/app/runtime/output-receiver/boot-handle-ui.js` does NOT exist yet
// (Wave A1 creates it). These tests are RED until A1 ships.
import { test } from "node:test";
import assert from "node:assert/strict";

const MODULE_PATH = "../src/app/runtime/output-receiver/boot-handle-ui.js";

async function _import() {
  // Use file:// so node resolves relative to this test file's location.
  const url = new URL(MODULE_PATH, import.meta.url).href;
  return await import(url);
}

test("Phase 36: bootHandleUi is exported as a function", async () => {
  const mod = await _import();
  assert.equal(typeof mod.bootHandleUi, "function",
    "expected bootHandleUi function export");
});

test("Phase 36: bootHandleUi returns object with stop() and hitTestVertex()", async () => {
  const mod = await _import();
  // Build a minimal stub-arg bag — every named arg from §2 signature with a no-op value.
  const noop = () => {};
  const fakeStage = { appendChild: noop, removeChild: noop, addEventListener: noop, removeEventListener: noop };
  const fakeOverlay = { ...fakeStage, replaceChildren: noop };
  const handle = mod.bootHandleUi({
    stage: fakeStage, roomOverlay: fakeOverlay, videoEl: null, feedbackEl: null,
    state: { boardId: "test", alignMode: false, uiView: "dashboard",
             polygonEditor: {}, shipPolygonEditor: {}, runtime: {} },
    outputRole: "final-output", OUTPUT_ROLE_FINAL: "final-output", OUTPUT_ROLE_CONTROL: "control",
    liveSync: { onAlignModeChange: noop, onProjectionProfileChange: noop,
                getAlignMode: () => false, getActiveProjectionProfileId: () => null,
                getCurrentClientId: () => "test", stop: noop, emitLiveMutation: noop },
    liveSyncCoreOverride: null,
    polygonContract: null, normalizers: {}, boardAccess: {}, polygonState: {},
    interactions: {}, persistence: {}, alignModeDirtyEndpoint: "/api/align-mode-dirty",
    sync: {}, dashboard: {},
    renderRoomOverlay: noop, showToast: noop, getRenderMode: () => "auto",
    getBoardId: () => "test",
    logger: { log: noop, warn: noop, error: noop },
  });
  assert.equal(typeof handle.stop, "function", "expected handle.stop function");
  assert.equal(typeof handle.hitTestVertex, "function", "expected handle.hitTestVertex function");
  handle.stop(); // teardown should not throw
});

test("Phase 36: bootHandleUi throws on missing required args", async () => {
  const mod = await _import();
  assert.throws(() => mod.bootHandleUi({}), /required|missing|undefined/i);
});
