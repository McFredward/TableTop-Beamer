// Phase-31 h15 — preload-link injection regression test.
//
// THE BUG: GIF fetch in the SSR Chromium tab under Xvfb deadlocked
// after the FIRST successful fetch. Diagnosis-and-fix iterations h14-h15
// proved the issue was in Chromium's JS-fetch path specifically — the
// browser's preload pipeline is fine. h15 fixes this by injecting
// `<link rel="preload" as="fetch" crossorigin>` for every GIF in the
// asset manifest. The browser's resource scheduler handles preloads
// outside the JS event loop; when our JS fetch later requests the same
// URL it hits the preload cache and returns instantly.
//
// THIS TEST: feeds a manifest into setManifest() with a stubbed DOM
// and asserts the expected <link> elements appear in document.head.
// Hardware-agnostic — no Pi / SSR / desktop branching.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(
  "./src/app/runtime/state/runtime-asset-manifest.js",
  "utf8",
);

// Build a minimal DOM stub that satisfies the manifest module's needs.
// We only use createElement, head.appendChild, link.setAttribute, and
// element.remove(). The stub uses a simple object graph so test code
// can introspect inserted elements.
function makeFakeDocument() {
  const head = {
    children: [],
    appendChild(el) {
      this.children.push(el);
      el._parent = this;
      return el;
    },
  };
  const fakeDocument = {
    head,
    getElementsByTagName: (tag) => (tag === "head" ? [head] : []),
    createElement: (tag) => {
      const el = {
        _tag: tag,
        _attrs: {},
        get href() { return this._attrs.href || ""; },
        set href(v) { this._attrs.href = v; },
        setAttribute(name, value) { this._attrs[name] = value; },
        getAttribute(name) { return this._attrs[name]; },
        remove() {
          if (this._parent) {
            const i = this._parent.children.indexOf(this);
            if (i >= 0) this._parent.children.splice(i, 1);
            this._parent = null;
          }
        },
      };
      return el;
    },
  };
  return fakeDocument;
}

// Load the IIFE source with a fake `window` + `document` so the module
// installs on our stubbed window and the preload-injection side effect
// can be exercised without a real browser.
function loadModuleWithFakeDom() {
  const fakeDocument = makeFakeDocument();
  const fakeWindow = {};
  const factory = new Function(
    "window",
    "document",
    "console",
    `${SRC}\nreturn window.TT_BEAMER_RUNTIME_ASSET_MANIFEST;`,
  );
  const exported = factory(fakeWindow, fakeDocument, { warn: () => {}, error: () => {} });
  return { exported, fakeDocument };
}

test("setManifest: injects <link rel=preload as=fetch> for every GIF", () => {
  const { exported, fakeDocument } = loadModuleWithFakeDom();
  exported.setManifest({
    "/resources/animations/burst.gif": { hash: "AAAAAAAAAAAA", size: 100 },
    "/resources/animations/fire.gif": { hash: "BBBBBBBBBBBB", size: 100 },
    "/resources/animations/malfunction.gif": "CCCCCCCCCCCC",
    "/resources/animations/sandstorm.mp4": { hash: "MP4HASHMP4HA", size: 100 },
    "/resources/sounds/click.mp3": { hash: "DDDDDDDDDDDD", size: 100 },
  });

  const links = fakeDocument.head.children.filter((c) => c._tag === "link");
  // Preload is GIF-only. MP4s are loaded by <video src=…> (which has
  // its own preload semantics — adding `as=fetch` would make the
  // browser warn "preloaded but not used within a few seconds"
  // because <video> uses `as=video`). Sounds use <audio> similarly.
  assert.equal(links.length, 3, "expected one <link> per GIF (3 GIFs); MP4 + sound excluded");

  const hrefs = links.map((l) => l._attrs.href).sort();
  assert.deepEqual(
    hrefs,
    [
      "/resources/animations/burst.gif?v=AAAAAAAAAAAA",
      "/resources/animations/fire.gif?v=BBBBBBBBBBBB",
      "/resources/animations/malfunction.gif?v=CCCCCCCCCCCC",
    ],
    "every preload link href must include the manifest hash; mp4 must NOT appear",
  );

  for (const link of links) {
    assert.equal(link._attrs.rel, "preload");
    assert.equal(link._attrs.as, "fetch");
    assert.equal(
      link._attrs.crossorigin,
      "anonymous",
      "crossorigin attribute must match what fetch() will send so the preload-cache hit path engages",
    );
  }
});

test("setManifest: removes preload links for paths no longer in manifest", () => {
  const { exported, fakeDocument } = loadModuleWithFakeDom();
  exported.setManifest({
    "/resources/animations/burst.gif": { hash: "AAAAAAAAAAAA" },
    "/resources/animations/fire.gif": { hash: "BBBBBBBBBBBB" },
  });
  let links = fakeDocument.head.children.filter((c) => c._tag === "link");
  assert.equal(links.length, 2);

  // Now drop fire.gif and add slime.gif — common scenario when an asset
  // is renamed or replaced.
  exported.setManifest({
    "/resources/animations/burst.gif": { hash: "AAAAAAAAAAAA" },
    "/resources/animations/slime.gif": { hash: "EEEEEEEEEEEE" },
  });
  links = fakeDocument.head.children.filter((c) => c._tag === "link");
  const hrefs = links.map((l) => l._attrs.href).sort();
  assert.deepEqual(
    hrefs,
    [
      "/resources/animations/burst.gif?v=AAAAAAAAAAAA",
      "/resources/animations/slime.gif?v=EEEEEEEEEEEE",
    ],
    "fire.gif preload must be removed; slime.gif preload must be added",
  );
});

test("setManifest: updates href when an existing asset's hash changes", () => {
  const { exported, fakeDocument } = loadModuleWithFakeDom();
  exported.setManifest({
    "/resources/animations/burst.gif": { hash: "OLDHASHOLDHA" },
  });
  let links = fakeDocument.head.children.filter((c) => c._tag === "link");
  assert.equal(links.length, 1);
  const initialHref = links[0]._attrs.href;
  assert.equal(initialHref, "/resources/animations/burst.gif?v=OLDHASHOLDHA");

  // Re-upload: same path, new hash. The link element should be reused
  // with an updated href so the browser preloads the fresh bytes.
  exported.setManifest({
    "/resources/animations/burst.gif": { hash: "NEWHASHNEWHA" },
  });
  links = fakeDocument.head.children.filter((c) => c._tag === "link");
  assert.equal(links.length, 1, "still one link; element was reused, not duplicated");
  assert.equal(
    links[0]._attrs.href,
    "/resources/animations/burst.gif?v=NEWHASHNEWHA",
    "link href must reflect the new manifest hash",
  );
});

test("setManifest: empty manifest removes all preload links", () => {
  const { exported, fakeDocument } = loadModuleWithFakeDom();
  exported.setManifest({
    "/resources/animations/burst.gif": { hash: "AAAAAAAAAAAA" },
  });
  assert.equal(fakeDocument.head.children.filter((c) => c._tag === "link").length, 1);

  exported.setManifest({});
  assert.equal(
    fakeDocument.head.children.filter((c) => c._tag === "link").length,
    0,
    "all preload links must be removed when manifest empties",
  );
});

test("regression h15: gif-playback no longer uses cache:no-store (lets preload cache engage)", () => {
  const playback = readFileSync(
    "./src/app/runtime/render/runtime-gif-playback.js",
    "utf8",
  );
  // The h14 attempt set cache:"no-store" hoping to bust a phantom
  // keep-alive bug. It actually bypasses the browser's preload cache,
  // defeating the whole h15 strategy. cache:"default" is the right
  // hardware-agnostic value — the `?v=<hash>` URL already busts cache
  // when the bytes change.
  assert.equal(
    playback.includes('cache: "no-store"'),
    false,
    "runtime-gif-playback.js must not use cache:no-store — it bypasses the preload cache and was the underlying GIF-hang amplifier",
  );
});
