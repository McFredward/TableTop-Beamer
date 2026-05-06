// Phase-31 h15 — server-side resource header behavior.
// Verifies the hardware-agnostic Connection: close fix on
// /resources/animations/* and friends. The helper module is pure so we
// don't need to boot the HTTP server to assert behavior.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RESOURCE_CONNECTION_CLOSE_PREFIXES,
  isResourcePathRequiringConnectionClose,
  buildStaticResourceHeaders,
} from "../src/server/static-resource-headers.mjs";

test("RESOURCE_CONNECTION_CLOSE_PREFIXES covers the four resource folders we serve", () => {
  // The four prefixes are the only large-binary content paths the SPA
  // fetches via runtime fetch() / <video src> / <img src>. If a new
  // resource folder is added under /resources/, this test forces the
  // dev to also add it here so the keep-alive bug can't re-introduce.
  assert.deepEqual(
    RESOURCE_CONNECTION_CLOSE_PREFIXES.sort(),
    [
      "/resources/animations/",
      "/resources/board-images/",
      "/resources/rooms/",
      "/resources/sounds/",
    ],
  );
});

test("isResourcePathRequiringConnectionClose: returns true for animation paths", () => {
  assert.equal(isResourcePathRequiringConnectionClose("/resources/animations/burst.gif"), true);
  assert.equal(isResourcePathRequiringConnectionClose("/resources/animations/fire.gif"), true);
  assert.equal(isResourcePathRequiringConnectionClose("/resources/animations/slime.gif"), true);
  assert.equal(isResourcePathRequiringConnectionClose("/resources/animations/malfunction.gif"), true);
});

test("isResourcePathRequiringConnectionClose: returns true for sounds/rooms/board-images", () => {
  assert.equal(isResourcePathRequiringConnectionClose("/resources/sounds/click.mp3"), true);
  assert.equal(isResourcePathRequiringConnectionClose("/resources/rooms/cabin-overlay.png"), true);
  assert.equal(isResourcePathRequiringConnectionClose("/resources/board-images/nemesis-a.png"), true);
});

test("isResourcePathRequiringConnectionClose: returns false for app/source/api paths", () => {
  // Hot path: app code & API responses MUST keep keep-alive on so the
  // websocket-heavy live session doesn't pay TCP setup per call.
  assert.equal(isResourcePathRequiringConnectionClose("/index.html"), false);
  assert.equal(isResourcePathRequiringConnectionClose("/src/app/runtime/runtime-orchestration.js"), false);
  assert.equal(isResourcePathRequiringConnectionClose("/api/health"), false);
  assert.equal(isResourcePathRequiringConnectionClose("/api/live/ws"), false);
  assert.equal(isResourcePathRequiringConnectionClose("/config/global-defaults.json"), false);
});

test("isResourcePathRequiringConnectionClose: rejects non-string inputs", () => {
  assert.equal(isResourcePathRequiringConnectionClose(undefined), false);
  assert.equal(isResourcePathRequiringConnectionClose(null), false);
  assert.equal(isResourcePathRequiringConnectionClose(42), false);
  assert.equal(isResourcePathRequiringConnectionClose({}), false);
});

test("buildStaticResourceHeaders: animations get Connection: close + cache-control", () => {
  const headers = buildStaticResourceHeaders("/resources/animations/fire.gif", "image/gif");
  assert.equal(headers["content-type"], "image/gif");
  assert.equal(headers["connection"], "close");
  assert.equal(headers["cache-control"], "no-cache");
});

test("buildStaticResourceHeaders: app code paths do NOT get Connection: close", () => {
  const headers = buildStaticResourceHeaders("/src/app/runtime/runtime-orchestration.js", "application/javascript");
  assert.equal(headers["content-type"], "application/javascript");
  assert.equal(headers["connection"], undefined, "must not force close on hot-path JS");
  assert.equal(headers["cache-control"], undefined);
});

test("buildStaticResourceHeaders: identical for sounds/rooms/board-images", () => {
  for (const url of [
    "/resources/sounds/click.mp3",
    "/resources/rooms/cabin.png",
    "/resources/board-images/nemesis-a.png",
  ]) {
    const headers = buildStaticResourceHeaders(url, "application/octet-stream");
    assert.equal(headers["connection"], "close", `expected close for ${url}`);
    assert.equal(headers["cache-control"], "no-cache", `expected no-cache for ${url}`);
  }
});
