// test/connection-stability/operator-telemetry.test.mjs
//
// Phase 33 Plan 04-T4 — operator telemetry surface tests.
//
// Suspects addressed: 10 (no telemetry surface for failure-mode), 13
// (stable-overlay poll cleanup on host-down).
//
// Coverage:
//   04-T1: status-detail line under countdown — content rendering + DOM insert
//   04-T2: GivenUp overlay — render + retry click handler
//   04-T3: receiver-bootstrap source clears overlayHidePoller on host-down

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  formatReconnectDetail,
  formatTimeSinceLastSuccess,
  setReconnectDetail,
  showGivenUpOverlay,
  hideGivenUpOverlay,
} from "../../src/app/runtime/output-receiver/receiver-status-ui.js";

// ─── Tiny DOM mock — sufficient for setReconnectDetail / showGivenUpOverlay ─

function makeMockElement(tag) {
  const el = {
    nodeName: tag.toUpperCase(),
    tagName: tag.toUpperCase(),
    children: [],
    parentNode: null,
    nextSibling: null,
    attributes: new Map(),
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    textContent: "",
    hidden: false,
    type: "",
    id: "",
    className: "",
    listeners: new Map(),
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    insertBefore(child, ref) {
      child.parentNode = this;
      const idx = ref ? this.children.indexOf(ref) : this.children.length;
      this.children.splice(idx >= 0 ? idx : this.children.length, 0, child);
      return child;
    },
    replaceChild(newChild, oldChild) {
      const idx = this.children.indexOf(oldChild);
      if (idx >= 0) {
        this.children[idx] = newChild;
        newChild.parentNode = this;
        oldChild.parentNode = null;
      }
      return oldChild;
    },
    setAttribute(k, v) { this.attributes.set(k, String(v)); },
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; },
    addEventListener(ev, cb) {
      if (!this.listeners.has(ev)) this.listeners.set(ev, []);
      this.listeners.get(ev).push(cb);
    },
    removeEventListener(ev, cb) {
      const arr = this.listeners.get(ev) || [];
      const i = arr.indexOf(cb);
      if (i >= 0) arr.splice(i, 1);
    },
    dispatchEvent(ev) {
      const arr = this.listeners.get(ev.type) || [];
      for (const cb of arr) cb(ev);
    },
    cloneNode(_deep) {
      const c = makeMockElement(tag);
      c.id = this.id;
      c.className = this.className;
      c.textContent = this.textContent;
      c.type = this.type;
      // listeners are NOT cloned (matches DOM Element.cloneNode)
      return c;
    },
  };
  el.style = new Proxy({}, {
    get: (t, k) => t[k] ?? "",
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return el;
}

function makeMockDoc() {
  const byId = new Map();
  const allElements = [];
  function recordById(el) {
    if (el.id) byId.set(el.id, el);
    for (const c of el.children) recordById(c);
  }
  const doc = {
    body: makeMockElement("body"),
    documentElement: makeMockElement("html"),
    getElementById(id) {
      // Search the live tree each call so newly-appended nodes are found.
      byId.clear();
      recordById(doc.body);
      recordById(doc.documentElement);
      return byId.get(id) ?? null;
    },
    createElement(tag) {
      const el = makeMockElement(tag);
      // Override appendChild on parents to keep id-index fresh.
      allElements.push(el);
      return el;
    },
  };
  return doc;
}

// ─── 04-T1: status-detail line content ────────────────────────────────

test("04-T1: formatTimeSinceLastSuccess — null/invalid", () => {
  assert.equal(formatTimeSinceLastSuccess(null), "—");
  assert.equal(formatTimeSinceLastSuccess(undefined), "—");
  assert.equal(formatTimeSinceLastSuccess(NaN), "—");
});

test("04-T1: formatTimeSinceLastSuccess — sub-minute", () => {
  assert.equal(formatTimeSinceLastSuccess(0, 5000), "5s");
  assert.equal(formatTimeSinceLastSuccess(0, 59999), "59s");
});

test("04-T1: formatTimeSinceLastSuccess — minutes", () => {
  // 2m 17s = 137s = 137000ms
  assert.equal(formatTimeSinceLastSuccess(0, 137000), "2m 17s");
  assert.equal(formatTimeSinceLastSuccess(0, 60000), "1m 0s");
  assert.equal(formatTimeSinceLastSuccess(0, 3599_000), "59m 59s");
});

test("04-T1: formatTimeSinceLastSuccess — hours", () => {
  assert.equal(formatTimeSinceLastSuccess(0, 3_600_000), "1h 0m");
  assert.equal(formatTimeSinceLastSuccess(0, 5_400_000), "1h 30m");
});

test("04-T1: formatReconnectDetail — empty when no inputs", () => {
  assert.equal(formatReconnectDetail(), "");
  assert.equal(formatReconnectDetail({ lastError: "", lastSuccessAtMs: null }), "");
});

test("04-T1: formatReconnectDetail — error only", () => {
  const out = formatReconnectDetail({ lastError: "no-producer-yet", lastSuccessAtMs: null });
  assert.match(out, /no-producer-yet/);
  assert.match(out, /letzte Verbindung: —/);
});

test("04-T1: formatReconnectDetail — error + last success", () => {
  const out = formatReconnectDetail({
    lastError: "ws open timeout (10s)",
    lastSuccessAtMs: 0,
    nowMs: 137_000,
  });
  assert.match(out, /ws open timeout \(10s\)/);
  assert.match(out, /letzte Verbindung: 2m 17s/);
});

test("04-T1: formatReconnectDetail — error truncated to 80 chars + ellipsis", () => {
  const long = "a".repeat(120);
  const out = formatReconnectDetail({ lastError: long, lastSuccessAtMs: null });
  // Error component is truncated to 77 chars + "…" (78 chars). The full
  // string also contains the " · letzte Verbindung: —" suffix, so we
  // assert the error part is bounded — not the entire formatted string.
  assert.match(out, /a{77}…/);
  // The error fragment alone (before the " · " separator) must be ≤ 80 chars.
  const [errPart] = out.split(" · ");
  assert.ok(errPart.length <= 80, `expected ≤80 char error fragment, got ${errPart.length}`);
});

test("04-T1: setReconnectDetail creates #ssr-status-detail sibling under #ssr-reconnect-banner", () => {
  const doc = makeMockDoc();
  // Seed the banner DOM
  const banner = doc.createElement("div");
  banner.id = "ssr-reconnect-banner";
  banner.hidden = false;
  doc.body.appendChild(banner);

  setReconnectDetail({
    doc,
    lastError: "ws open timeout (10s)",
    lastSuccessAtMs: 0,
  });

  const detail = doc.getElementById("ssr-status-detail");
  assert.ok(detail, "ssr-status-detail node not created");
  assert.match(detail.textContent, /ws open timeout/);
  assert.equal(detail.hidden, false, "detail should be visible when banner visible");
});

test("04-T1: setReconnectDetail hides detail when banner is hidden", () => {
  const doc = makeMockDoc();
  const banner = doc.createElement("div");
  banner.id = "ssr-reconnect-banner";
  banner.hidden = true;
  doc.body.appendChild(banner);

  setReconnectDetail({ doc, lastError: "x", lastSuccessAtMs: 0 });
  const detail = doc.getElementById("ssr-status-detail");
  assert.equal(detail.hidden, true);
});

test("04-T1: setReconnectDetail is idempotent — second call updates same node", () => {
  const doc = makeMockDoc();
  const banner = doc.createElement("div");
  banner.id = "ssr-reconnect-banner";
  doc.body.appendChild(banner);

  setReconnectDetail({ doc, lastError: "first", lastSuccessAtMs: 0 });
  const a = doc.getElementById("ssr-status-detail");
  setReconnectDetail({ doc, lastError: "second", lastSuccessAtMs: 0 });
  const b = doc.getElementById("ssr-status-detail");

  assert.strictEqual(a, b, "should re-use the same node");
  assert.match(b.textContent, /second/);
});

test("04-T1: setReconnectDetail no-op when banner element is missing", () => {
  const doc = makeMockDoc();
  // No banner created — should silently return without throwing.
  setReconnectDetail({ doc, lastError: "x", lastSuccessAtMs: 0 });
  assert.equal(doc.getElementById("ssr-status-detail"), null);
});

// ─── 04-T2: GivenUp overlay ────────────────────────────────────────────

test("04-T2: showGivenUpOverlay creates #ssr-given-up-overlay with title + button", () => {
  const doc = makeMockDoc();
  showGivenUpOverlay({
    doc,
    lastError: "wat",
    attempts: 10,
    lastSuccessAtMs: 0,
    onRetry: () => {},
  });
  const overlay = doc.getElementById("ssr-given-up-overlay");
  assert.ok(overlay, "overlay not created");
  assert.equal(overlay.hidden, false);
  const title = doc.getElementById("ssr-given-up-title");
  assert.match(title?.textContent || "", /Verbindung verloren/);
  const errEl = doc.getElementById("ssr-given-up-error");
  assert.match(errEl?.textContent || "", /wat/);
  const detailEl = doc.getElementById("ssr-given-up-detail");
  assert.match(detailEl?.textContent || "", /Versuche: 10/);
  const retryBtn = doc.getElementById("ssr-given-up-retry");
  assert.ok(retryBtn);
  assert.match(retryBtn.textContent, /Erneut verbinden/);
});

test("04-T2: showGivenUpOverlay handles missing lastError gracefully", () => {
  const doc = makeMockDoc();
  showGivenUpOverlay({ doc, lastError: null, attempts: 10, lastSuccessAtMs: null, onRetry: null });
  const errEl = doc.getElementById("ssr-given-up-error");
  assert.match(errEl.textContent, /\(unbekannt\)/);
  const detail = doc.getElementById("ssr-given-up-detail");
  assert.match(detail.textContent, /—/);
});

test("04-T2: GivenUp Retry button click triggers onRetry callback", () => {
  const doc = makeMockDoc();
  let called = 0;
  showGivenUpOverlay({
    doc,
    lastError: "x",
    attempts: 10,
    lastSuccessAtMs: 0,
    onRetry: () => { called += 1; },
  });
  const btn = doc.getElementById("ssr-given-up-retry");
  // Synthesize a click event
  btn.dispatchEvent({ type: "click" });
  assert.equal(called, 1, "onRetry callback should fire on click");
});

test("04-T2: showGivenUpOverlay re-bind replaces prior listeners (no double-fire)", () => {
  const doc = makeMockDoc();
  let firstCalled = 0;
  let secondCalled = 0;
  showGivenUpOverlay({ doc, attempts: 1, onRetry: () => { firstCalled += 1; } });
  // Second call replaces the handler.
  showGivenUpOverlay({ doc, attempts: 2, onRetry: () => { secondCalled += 1; } });
  const btn = doc.getElementById("ssr-given-up-retry");
  btn.dispatchEvent({ type: "click" });
  assert.equal(firstCalled, 0, "first listener must NOT fire after re-bind");
  assert.equal(secondCalled, 1, "second listener must fire");
});

test("04-T2: hideGivenUpOverlay hides the overlay (idempotent)", () => {
  const doc = makeMockDoc();
  // Hide before show — must not throw
  hideGivenUpOverlay({ doc });
  showGivenUpOverlay({ doc, attempts: 5, onRetry: () => {} });
  const overlay = doc.getElementById("ssr-given-up-overlay");
  assert.equal(overlay.hidden, false);
  hideGivenUpOverlay({ doc });
  assert.equal(overlay.hidden, true);
  // Hiding again is a no-op
  hideGivenUpOverlay({ doc });
  assert.equal(overlay.hidden, true);
});

test("04-T2: showGivenUpOverlay no-op when doc is null/undefined (kiosk safety)", () => {
  // Just must not throw.
  showGivenUpOverlay({ doc: null });
  showGivenUpOverlay({});
  hideGivenUpOverlay({ doc: null });
});

// ─── 04-T3: poller cleared on host-down ────────────────────────────────

test("04-T3: receiver-bootstrap clears overlayHidePoller on host-down (Suspect 13)", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // The host-down branch in the message handler must clear overlayHidePoller.
  // Locate the host-down block and assert the clearInterval is inside it.
  const match = src.match(/if \(s === "host-down"\)\s*\{([\s\S]*?)\}\s*if \(s ===/);
  assert.ok(match, "could not locate host-down branch");
  assert.match(match[1], /overlayHidePoller/, "host-down branch must reference overlayHidePoller");
  assert.match(match[1], /clearInterval\(overlayHidePoller\)/,
    "host-down branch must clearInterval the overlayHidePoller (S13 fix)");
});

test("04-T3: receiver-bootstrap.js wires setReconnectDetail in catch + monitor + tick", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // setReconnectDetail must be called from at least 3 places:
  //   1. tryConnect catch (after countdownStop = ...)
  //   2. monitor disconnect-trigger branch
  //   3. monitor tick (per-second refresh while in RECONNECTING)
  const calls = src.match(/setReconnectDetail\(/g) ?? [];
  assert.ok(calls.length >= 3,
    `expected setReconnectDetail called ≥3 times in bootstrap (got ${calls.length})`);
});

test("04-T3: bootstrap imports the new telemetry helpers from receiver-status-ui", async () => {
  const url = new URL("../../src/app/runtime/output-receiver/receiver-bootstrap.js", import.meta.url);
  const src = await readFile(url, "utf8");
  // The named imports must be present.
  assert.match(src, /setReconnectDetail/, "setReconnectDetail import missing");
  assert.match(src, /showGivenUpOverlay/, "showGivenUpOverlay import missing");
  assert.match(src, /hideGivenUpOverlay/, "hideGivenUpOverlay import missing");
});
