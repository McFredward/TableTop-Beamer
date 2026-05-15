// Settings UI round-trip tests for the Stream FPS Cap radio group.
//
// Phase 40 (2026-05-15): Align-Mode Boost controls retired (A3/A5
// removed); the panel no longer wires that toggle.
//
// Coverage:
//   A1: reflectConfig sets streamFpsCap radio (value=45)
//   A2: reflectConfig sets streamFpsCap=0 (Native) radio
//   A4: radio change emits serverRendering-update {streamFpsCap: 60}
//   A6: init is a no-op when ssrEncoderSelect ref is missing (stub-safe)

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const PANEL_SRC = readFileSync(
  resolve(__dir, "../src/app/lib/ui/settings/server-rendering-panel.js"),
  "utf8",
);

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRadio(value) {
  let _listener = null;
  let _checked = false;
  return {
    value: String(value),
    get checked() { return _checked; },
    set checked(v) { _checked = Boolean(v); },
    addEventListener(ev, fn) { if (ev === "change") _listener = fn; },
    /** Simulate user selecting this radio: mark checked, fire change handler. */
    triggerChange() {
      _checked = true;
      if (_listener) _listener({ target: { checked: _checked, value: String(value) } });
    },
  };
}

function makeCheckbox(initialChecked = false) {
  let _listener = null;
  let _checked = initialChecked;
  return {
    get checked() { return _checked; },
    set checked(v) { _checked = Boolean(v); },
    addEventListener(ev, fn) { if (ev === "change") _listener = fn; },
    /** Simulate user toggling the checkbox to `v`. */
    setChecked(v) {
      _checked = Boolean(v);
      if (_listener) _listener({ target: { checked: _checked } });
    },
  };
}

/**
 * Load a fresh copy of the panel module and return its exports object.
 * Uses vm.runInNewContext so every call gets an isolated IIFE scope.
 */
function loadPanel() {
  const panelHolder = {};
  const ctx = createContext({
    window: panelHolder,
    // The IIFE only uses `window` — no other globals needed.
  });
  runInContext(PANEL_SRC, ctx);
  const mod = panelHolder.TT_BEAMER_SETTINGS_SERVER_RENDERING_PANEL;
  if (!mod || typeof mod.initServerRenderingPanel !== "function") {
    throw new Error("panel module did not expose initServerRenderingPanel");
  }
  return mod;
}

/**
 * Build a minimal refs object suitable for testing the new controls.
 * The panel bails early if ssrEncoderSelect is missing, so we include
 * a stub encoder select by default.
 */
function makeRefs({ radios } = {}) {
  return {
    ssrEncoderSelect: { addEventListener() {}, value: "auto" },
    ssrStreamFpsCapRadios: radios ?? [makeRadio(30), makeRadio(45), makeRadio(60), makeRadio(0)],
    ssrServerRenderingStatus: { textContent: "" },
  };
}

/** Flush microtasks + one macrotask turn (for the fetchGlobalDefaults Promise). */
const flush = () => new Promise((r) => setTimeout(r, 50));

// ── Tests ──────────────────────────────────────────────────────────────────

test("A1: reflectConfig sets streamFpsCap=45 radio checked", async () => {
  const radios = [makeRadio(30), makeRadio(45), makeRadio(60), makeRadio(0)];
  const refs = makeRefs({ radios });
  const mod = loadPanel();

  mod.initServerRenderingPanel({
    refs,
    emitLiveMutation: () => {},
    fetchGlobalDefaults: async () => ({ serverRendering: { streamFpsCap: 45 } }),
  });
  await flush();

  assert.equal(radios[0].checked, false, "30 should not be checked");
  assert.equal(radios[1].checked, true,  "45 should be checked");
  assert.equal(radios[2].checked, false, "60 should not be checked");
  assert.equal(radios[3].checked, false, "0/native should not be checked");
});

test("A2: reflectConfig sets streamFpsCap=0 (Native) radio checked", async () => {
  const radios = [makeRadio(30), makeRadio(45), makeRadio(60), makeRadio(0)];
  const refs = makeRefs({ radios });
  const mod = loadPanel();

  mod.initServerRenderingPanel({
    refs,
    emitLiveMutation: () => {},
    fetchGlobalDefaults: async () => ({ serverRendering: { streamFpsCap: 0 } }),
  });
  await flush();

  assert.equal(radios[0].checked, false, "30 should not be checked");
  assert.equal(radios[1].checked, false, "45 should not be checked");
  assert.equal(radios[2].checked, false, "60 should not be checked");
  assert.equal(radios[3].checked, true,  "value=0 (Native) should be checked");
});

// A3 alignModeBoost reflectConfig test retired in Phase 40.

test("A4: change on streamFpsCap radio emits serverRendering-update {streamFpsCap: 60}", async () => {
  const radios = [makeRadio(30), makeRadio(45), makeRadio(60), makeRadio(0)];
  const refs = makeRefs({ radios });
  const emitted = [];
  const mod = loadPanel();

  mod.initServerRenderingPanel({
    refs,
    emitLiveMutation: (type, payload) => { emitted.push({ type, payload }); },
    fetchGlobalDefaults: async () => null,
  });
  await flush();

  // User picks 60 fps cap
  radios[2].triggerChange();

  const match = emitted.find(
    (e) => e.type === "serverRendering-update" && e.payload?.streamFpsCap === 60,
  );
  assert.ok(match, `expected emit with streamFpsCap=60, got: ${JSON.stringify(emitted)}`);
});

// A5 alignModeBoost toggle emit test retired in Phase 40.

test("A6: init is a no-op when ssrEncoderSelect ref is missing (stub-safe)", async () => {
  const mod = loadPanel();
  mod.initServerRenderingPanel({
    refs: {},
    emitLiveMutation: () => {},
    fetchGlobalDefaults: async () => null,
  });
  assert.ok(true, "no throw when refs is empty");

  const refs = {
    ssrStreamFpsCapRadios: [makeRadio(30), makeRadio(60)],
  };
  mod.initServerRenderingPanel({
    refs,
    emitLiveMutation: () => {},
    fetchGlobalDefaults: async () => null,
  });
  assert.ok(true, "no throw when ssrEncoderSelect absent but other refs present");
});
