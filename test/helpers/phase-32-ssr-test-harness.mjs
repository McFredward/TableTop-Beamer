// test/helpers/phase-32-ssr-test-harness.mjs
//
// Phase 32 Wave 0 — shared test helpers for SSR performance + connection
// stability test scaffolding. Provides dynamic ESM loaders and lightweight
// mock factories for use in phase-32-*.test.mjs files.
//
// All exports are pure (no browser globals, no process.exit side effects).

// ── Dynamic ESM loaders ────────────────────────────────────────────────────

/**
 * Load the server-rendering config module.
 * @returns {Promise<import('../../src/server/ssr-server-rendering-config.mjs')>}
 */
export async function loadServerRenderingConfig() {
  return import("../../src/server/ssr-server-rendering-config.mjs");
}

/**
 * Load the encoder detection module.
 * @returns {Promise<import('../../src/server/server-encoder-detect.mjs')>}
 */
export async function loadEncoderDetect() {
  return import("../../src/server/server-encoder-detect.mjs");
}

/**
 * Load the SSR render host module.
 * @returns {Promise<import('../../src/server/ssr-render-host.mjs')>}
 */
export async function loadRenderHost() {
  return import("../../src/server/ssr-render-host.mjs");
}

/**
 * Load the receiver status UI module.
 * @returns {Promise<import('../../src/app/runtime/output-receiver/receiver-status-ui.js')>}
 */
export async function loadStatusUi() {
  return import("../../src/app/runtime/output-receiver/receiver-status-ui.js");
}

/**
 * Load the receiver bootstrap module.
 * @returns {Promise<import('../../src/app/runtime/output-receiver/receiver-bootstrap.js')>}
 */
export async function loadReceiverBootstrap() {
  return import("../../src/app/runtime/output-receiver/receiver-bootstrap.js");
}

// ── Mock factories ─────────────────────────────────────────────────────────

/**
 * Create a mock sessionStorage backed by a Map.
 * Matches the Web Storage API surface needed by backoff state tests.
 *
 * @returns {{ getItem(key:string):string|null, setItem(key:string, value:string):void, removeItem(key:string):void, clear():void }}
 */
export function mockSessionStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

/**
 * Create a mock document with getElementById backed by a Map of stub elements.
 * Each stub element has { textContent, hidden } properties to support
 * status-overlay tests without a real DOM.
 *
 * @returns {{ getElementById(id:string): { textContent: string, hidden: boolean } | null }}
 */
export function mockDocument() {
  const elements = new Map();

  function getOrCreate(id) {
    if (!elements.has(id)) {
      elements.set(id, { textContent: "", hidden: true, id });
    }
    return elements.get(id);
  }

  return {
    getElementById(id) {
      return getOrCreate(id);
    },
    _getElement(id) {
      return elements.get(id) ?? null;
    },
  };
}

/**
 * Create a mock existsSync implementation backed by a plain object map.
 * Pass an object like { "/dev/dri/renderD128": true } to control which
 * paths appear to "exist". All other paths return false.
 *
 * @param {{ [path: string]: boolean }} pathMap
 * @returns {(path: string) => boolean}
 */
export function mockExistsSync(pathMap) {
  return (p) => pathMap[p] === true;
}
