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
    // Phase-31 h15 (2026-05-06): inject <link rel="preload"> tags for
    // every animation in the manifest. The browser's preload pipeline
    // runs OUTSIDE the JS fetch queue and outside the renderer's main
    // thread — it is scheduled by the resource loader directly. This
    // sidesteps the "second fetch hangs" pathology observed in the SSR
    // Chromium tab under Xvfb (where, after the first JS fetch
    // completes, all subsequent JS fetches stall at request-headers
    // forever even with Connection: close, abort+retry, no-store
    // bypassed, anti-throttling flags applied). Preloaded resources
    // are held in the browser's preload cache; when our JS fetch later
    // requests the same URL with `cache: "default"`, it hits the
    // preload cache instead of issuing a new HTTP request.
    //
    // Hardware-agnostic: works on any browser that supports `<link
    // rel="preload">` (universal in 2024+). Works the same in
    // dashboard, Pi-direct /output/, and the SSR Chromium tab. No
    // environment branching.
    try {
      _refreshAnimationPreloadLinks();
    } catch (err) {
      // never let preload injection break manifest setup
      // eslint-disable-next-line no-console
      console.warn("[asset-manifest] preload-link refresh failed:", err?.message || err);
    }
  }

  // Phase-31 h15: track injected <link rel="preload"> elements so we can
  // refresh them when the manifest changes (asset re-upload, board
  // switch). Keyed by raw path; value is the <link> element.
  const _preloadLinkByPath = new Map();

  function _refreshAnimationPreloadLinks() {
    if (typeof document === "undefined") return; // node tests
    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;

    // Walk the manifest and emit a preload link ONLY for .gif files
    // under /resources/animations/. MP4s under the same folder are
    // loaded via <video src> which has its own preload mechanism — if
    // we add link-preload tags for them, the browser warns "preloaded
    // but not used within a few seconds" because the <video> element
    // requests the URL with `as=video` semantics, not `as=fetch`.
    const desiredPaths = new Set();
    for (const rawPath of Object.keys(_hashByPath)) {
      if (typeof rawPath !== "string") continue;
      if (!rawPath.startsWith("/resources/animations/")) continue;
      if (!rawPath.toLowerCase().endsWith(".gif")) continue;
      desiredPaths.add(rawPath);
    }

    // Remove links that are no longer in the manifest.
    for (const [path, el] of _preloadLinkByPath.entries()) {
      if (!desiredPaths.has(path)) {
        try { el.remove(); } catch (_) {}
        _preloadLinkByPath.delete(path);
      }
    }

    // Add or update links for each manifest path.
    for (const rawPath of desiredPaths) {
      const resolvedUrl = resolveAssetUrlWithHash(rawPath);
      const existing = _preloadLinkByPath.get(rawPath);
      if (existing) {
        // Hash may have changed — update href so the browser preloads
        // the new bytes. The old preloaded entry is GC'd by the resource
        // loader once the new one resolves.
        if (existing.href.endsWith(resolvedUrl) || existing.getAttribute("href") === resolvedUrl) {
          continue; // no change
        }
        try { existing.setAttribute("href", resolvedUrl); } catch (_) {}
        continue;
      }
      const link = document.createElement("link");
      link.setAttribute("rel", "preload");
      link.setAttribute("as", "fetch");
      // Same-origin, no auth — the cross-origin attribute matches what
      // our JS fetch will send (default `omit` credentials), so the
      // preload cache hit path engages correctly.
      link.setAttribute("crossorigin", "anonymous");
      link.setAttribute("href", resolvedUrl);
      try {
        head.appendChild(link);
        _preloadLinkByPath.set(rawPath, link);
      } catch (_) { /* DOM not ready yet — will retry on next setManifest */ }
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
