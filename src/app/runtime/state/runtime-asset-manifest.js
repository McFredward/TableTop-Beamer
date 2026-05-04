// Phase 28 B5 — client-side asset manifest mirror.
//
// Owns the hash-by-path map synced from the server's
// config/asset-manifest.json, and the `resolveAssetUrlWithHash` resolver
// that EVERY asset URL consumer goes through. The hash-suffixed URL
// (`/resources/animations/foo.gif?v=<sha256[:12]>`) invalidates THREE
// cache layers in one stroke:
//   (1) the browser HTTP cache (`fetch(url, { cache: "force-cache" })`),
//   (2) the in-memory `gifPlaybackCacheByPath` Map (path-keyed),
//   (3) the in-memory `outsideVideoCacheByPath`/`roomVideoCacheByPath`
//       Maps (path-keyed) — because a re-upload changes the resolved URL
//       string handed to <video>.src, even though the Map key stays raw.
//
// The hash itself is sha256(bytes).digest("hex").substring(0, 12) — a
// CACHE-BUSTING token, NOT a security/integrity control. Truncated to
// 12 chars (48 bits) for URL compactness; collision-safe for realistic
// asset volumes (<1000 assets ≪ 10^-9 collision probability).
//
// Synced via:
//   - Bootstrap: applyGlobalDefaultsPayloadToState applies payload.assetManifest.
//   - Live: runtime-live-sync-core's global-config-update handler refetches
//     /api/resources when payload.target === "config/asset-manifest.json"
//     and calls setManifest(body.hashByPath).
(() => {
  let _hashByPath = {};

  function init() {
    // No-op; setManifest is called by the bootstrap / live-sync handlers.
  }

  function setManifest(next) {
    if (next && typeof next === "object") {
      _hashByPath = next;
    } else {
      _hashByPath = {};
    }
  }

  function resolveAssetUrlWithHash(rawPath) {
    const trimmed = String(rawPath || "").trim();
    if (!trimmed) return trimmed;
    // Strip any prior `?v=...` the caller may have already appended (defensive).
    const base = trimmed.split("?")[0];
    const entry = _hashByPath[base];
    // Entry may be a string (from /api/resources flat hashByPath) or an
    // object { hash, size, mtime } (from the bootstrap manifest blob).
    const hash = typeof entry === "string" ? entry : entry?.hash;
    if (!hash) return trimmed; // No manifest entry → return path unchanged.
    return `${base}?v=${hash}`;
  }

  window.TT_BEAMER_RUNTIME_ASSET_MANIFEST = {
    init,
    setManifest,
    resolveAssetUrlWithHash,
  };
})();
