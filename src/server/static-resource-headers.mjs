// Phase-31 h15 — hardware-agnostic GIF/MP4 fetch reliability.
// See server.mjs handleStaticFile() and runtime-gif-playback.js for the
// full root-cause story. This module's surface is intentionally tiny so
// it can be unit-tested without booting the full HTTP server.

export const RESOURCE_CONNECTION_CLOSE_PREFIXES = [
  "/resources/animations/",
  "/resources/sounds/",
  "/resources/rooms/",
  "/resources/board-images/",
];

export function isResourcePathRequiringConnectionClose(routePath) {
  if (typeof routePath !== "string") return false;
  for (const prefix of RESOURCE_CONNECTION_CLOSE_PREFIXES) {
    if (routePath.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Returns the response headers a static-file handler should set for the
 * given route path. Centralizes Connection: close + cache-control so the
 * tests can assert exact header shape independent of the HTTP server.
 *
 * @param {string} routePath
 * @param {string} contentType
 * @returns {Record<string, string>}
 */
export function buildStaticResourceHeaders(routePath, contentType) {
  const headers = { "content-type": contentType };
  if (isResourcePathRequiringConnectionClose(routePath)) {
    headers["connection"] = "close";
    headers["cache-control"] = "no-cache";
  }
  return headers;
}
