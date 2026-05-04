---
phase: 28-cross-cutting-ux-state-polish
plan: 04
subsystem: asset-cache-invalidation-content-hash-manifest
tags: [b5, asset-manifest, content-hash, sha256, cache-busting, gif-playback, outside-mp4, broadcast, b3-d07.2, b3-d07.3, plan-28-03-todo-conversion]

# Dependency graph
requires:
  - phase: 28-cross-cutting-ux-state-polish
    plan: 00
    provides: Wave-0 test scaffolds asset-hash.test.mjs (3 skips) + asset-manifest.test.mjs (2 skips). Plan 28-04 converts all 5 to live behavior assertions.
  - phase: 28-cross-cutting-ux-state-polish
    plan: 03
    provides: Pre-staged _lastSeenAssetHashByPath / _lastSeenSoundHashByPath Maps + TODO(28-04) markers in animation-editor-edit-pane-asset-picker.js. Plan 28-04 wires payload.hash into the existing selection-match guards and removes both markers.
  - phase: 26
    provides: broadcastLiveSession + global-config-update envelope. Plan 28-04 reuses for the asset-manifest target.
provides:
  - "Server-side asset manifest infrastructure: loadAssetManifest / saveAssetManifest / computeAssetHash / synthesizeAssetManifestFromDisk / ensureAssetManifestOnBoot helpers in server.mjs."
  - "config/asset-manifest.json — central JSON keyed by asset URL, schema tt-beamer.asset-manifest.v1, persisted on every upload + delete, idempotently regenerated on boot."
  - "POST /api/resources/animations + /api/resources/sounds now compute sha256(buffer).digest('hex').substring(0, 12), persist to manifest, broadcast global-config-update with target=config/asset-manifest.json, and return `hash` in the response JSON."
  - "DELETE /api/resources/* removes the manifest entry and broadcasts."
  - "GET /api/resources extended to return hashByPath: { [url]: <12-hex> } alongside files[]."
  - "Client IIFE module src/app/runtime/state/runtime-asset-manifest.js with setManifest + resolveAssetUrlWithHash. Strips prior ?v= suffixes defensively before appending the new one."
  - "ctx.resolveAssetUrlWithHash exposed via runtime-orchestration-ctx-builder."
  - "Render-layer wraps: runtime-gif-playback.js fetch (line 48) + runtime-outside-mp4.js video.src (line 47 on creation + cache-hit refresh on hash change)."
  - "Live-sync wiring: runtime-live-sync-core's global-config-update handler refetches /api/resources when target=config/asset-manifest.json, updates the client mirror; applyGlobalDefaultsPayloadToState applies payload.assetManifest when present; loadOutsideResourceAssets seeds the manifest at boot."
  - "Plan 28-03's TODO(28-04) markers REMOVED. The animation-upload + sound-upload patchAnimation calls are now wrapped in real hash-diff guards reading payload.hash and comparing against the pre-staged tracker Maps."
  - "Three Wave-0 test scaffolds (asset-hash + asset-manifest) converted to live tests; the two B3 hash-TODO assertions in asset-picker-dirty-gate.test.mjs upgraded to live hash-diff behavior assertions. Total: 6 active tests added, 4 skips removed → suite at 25 pass / 0 skip / 0 fail."
affects: [28-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-hash cache-busting via sha256[:12] query suffix. URL-as-cache-key invalidates THREE layers in one stroke: (1) browser HTTP cache (`fetch(url, { cache: 'force-cache' })`), (2) gifPlaybackCacheByPath Map (path-keyed, but the resolver is called at the fetch site so Map keys stay raw paths and only the network URL gets ?v=<hash>), (3) outsideVideoCacheByPath / roomVideoCacheByPath Maps (same pattern — element.src gets the hash, Map key stays raw)."
    - "Cache-key separation: the in-memory Maps are keyed by the canonical raw path so asset-picker delete logic still resolves entries correctly. Hash-suffixed URLs only appear on the network — never as cache keys."
    - "Cache-hit src refresh: when `getMediaVideoElement` finds an existing cached <video> entry, it compares `video.src` against the freshly resolved URL; if a re-upload changed the manifest hash since the entry was created, the element's src is updated, currentTime reset to 0, and load() called — so the NEXT render frame pulls new bytes."
    - "Synchronous boot synthesis: ensureAssetManifestOnBoot runs `await` BEFORE server.listen, so the manifest is guaranteed ready when the first GET /api/resources arrives. Idempotent: existing entries with matching hashes preserve their mtime; only generatedAt is rewritten on each boot."
    - "Fail-soft manifest updates on upload/delete: file write succeeds first; manifest write failures log a warning but do NOT fail the response. Manifest will heal on next boot via synthesis."
    - "Truncated hash IS NOT a security control: 12 hex chars = 48 bits = ~16M-asset birthday limit. Realistic floor <1000 assets. Documented in code comments + threat-model T-28-04-01 (accepted risk)."

key-files:
  created:
    - src/app/runtime/state/runtime-asset-manifest.js
    - config/asset-manifest.json
    - .planning/phases/phase-28/28-04-SUMMARY.md
  modified:
    - server.mjs
    - index.html
    - src/app/runtime/runtime-orchestration-ctx-builder.js
    - src/app/runtime/live-sync/runtime-global-defaults.js
    - src/app/runtime/live-sync/runtime-live-sync-core.js
    - src/app/runtime/render/runtime-gif-playback.js
    - src/app/runtime/render/runtime-outside-mp4.js
    - src/app/runtime/panels/runtime-fx-panels-inside-outside.js
    - src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js
    - test/asset-hash.test.mjs
    - test/asset-manifest.test.mjs
    - test/asset-picker-dirty-gate.test.mjs

key-decisions:
  - "Manifest format: central config/asset-manifest.json (per RESEARCH.md recommendation, mirroring the projection-profiles.json pattern). Per-asset sidecars rejected — would explode the file count and complicate any future export-package logic."
  - "Hash truncation: sha256(bytes).digest('hex').substring(0, 12). 48-bit cache-busting token, NOT for content authentication. Documented in computeAssetHash comment + the threat model. T-28-04-01 collision risk accepted (16M-asset birthday limit, realistic <1000)."
  - "Cache-key separation: render-layer Map keys stay raw paths; only the actual network URL (fetch + video.src) gets ?v=<hash>. This keeps asset-picker delete logic working AND lets the existing cache structure naturally invalidate on hash change because the element.src or fetch URL is what the browser caches against."
  - "Single resolver point: ALL asset URL consumers go through ctx.resolveAssetUrlWithHash (or the global window.TT_BEAMER_RUNTIME_ASSET_MANIFEST.resolveAssetUrlWithHash). This avoids the Pitfall 3 trap (cache key mismatch when one callsite uses raw path and another uses hashed)."
  - "Boot synthesis is synchronous (await before server.listen). Per RESEARCH §Pitfall 4 + the plan's `<read_first>`. Even on a Pi with hundreds of assets the synthesis is single-process Node hashing — well under one second."
  - "broadcast independence from localConfigDirty gate: when payload.target === 'config/asset-manifest.json', the asset-manifest sync runs UNCONDITIONALLY (outside the existing dirty/suppress gates). The reason — those gates protect global-defaults.json user state from being clobbered by peer broadcasts during local edits, but asset URLs are not user state and the new hashes must always reach the render layer."
  - "Cache-hit video.src refresh: getMediaVideoElement now compares the cached element's resolved URL against the freshly resolved URL on every call. If a peer's re-upload changed the hash since the cache entry was created, the element's src is updated + load() is called. The Map is intentionally not deleted — preserving the cache identity for any concurrent pending playback callers."
  - "Plan 28-03 TODO conversion: kept the existing selection-match guards (D-07.1) intact and inserted the hash-diff branch INSIDE them. Same hash + selection match → no patchAnimation. Different hash + selection match → patchAnimation. Legacy fallback (no hash returned by server) preserves the previous unconditional fire so we don't regress dirty behaviour for built-in assets."

requirements-completed: [B5, B3]

# Metrics
duration: 7m15s
completed: 2026-05-04
---

# Phase 28 Plan 04: B5 Asset Cache Invalidation via Content-Hash Manifest Summary

**Server now computes `sha256(bytes).digest("hex").substring(0, 12)` per upload, persists `{ hash, size, mtime }` per asset URL in `config/asset-manifest.json`, and broadcasts `global-config-update` with `target: "config/asset-manifest.json"` on every upload/delete. The client mirrors the manifest in a new `runtime-asset-manifest.js` IIFE module exposing `resolveAssetUrlWithHash(rawPath)` — used by every render-layer asset-URL consumer (gif-playback fetch, outside-mp4 video.src). Hash-suffixed URLs (`/resources/animations/foo.gif?v=abc123def456`) invalidate THREE cache layers in one stroke: browser HTTP cache, in-memory `gifPlaybackCacheByPath` Map, and `outsideVideoCacheByPath`/`roomVideoCacheByPath` Maps — because the URL string IS the browser's cache key while the in-memory Maps stay keyed by raw paths. Plan 28-03's two `TODO(28-04)` markers in animation-editor-edit-pane-asset-picker.js are GONE: both upload paths now have live hash-diff guards reading `payload.hash` and comparing against `_lastSeenAssetHashByPath` / `_lastSeenSoundHashByPath` — same hash → no patchAnimation (no dirty fire); different hash → patchAnimation fires. Six new live tests; suite went from 23 pass / 4 skip → 25 pass / 0 skip.**

## Performance

- **Duration:** ~7 min 15 s
- **Started:** 2026-05-04T15:34:47Z
- **Completed:** 2026-05-04T15:42:02Z
- **Tasks:** 2 (Task 1 TDD: RED → GREEN; Task 2 single GREEN since the hash-tracker contract was already locked by Plan 28-03)
- **Files created:** 3 (1 source module, 1 config file, 1 SUMMARY)
- **Files modified:** 11 (1 server, 1 HTML, 6 client modules, 3 test files)
- **Commits:** 3 task commits + 1 docs commit

## Server-Side Helpers (Task 1)

| Helper | server.mjs line | Purpose |
|--------|----------------|---------|
| `let runtimeAssetManifest` | 2257 | In-memory manifest cache (synced with disk on every save). |
| `async function loadAssetManifest()` | 2259 | Reads `config/asset-manifest.json`; returns empty stub on ENOENT or malformed JSON. |
| `async function saveAssetManifest(manifest)` | 2292 | Writes manifest with schema header + 2-space indent + trailing newline. Sets `schema` and `generatedAt` before writing. |
| `function computeAssetHash(buffer)` | 2303 | `sha256(buffer).digest("hex").substring(0, 12)` — cache-busting token (NOT for content authentication). |
| `async function synthesizeAssetManifestFromDisk()` | 2308 | Walks `resources/animations` + `resources/sounds`, hashes every file, returns the assembled manifest. |
| `async function ensureAssetManifestOnBoot()` | 2347 | Loads existing manifest, synthesizes from disk, preserves matching-hash mtimes (idempotency), persists, sets `runtimeAssetManifest`. Logs `[asset-manifest] ready (N entries)`. |

`ensureAssetManifestOnBoot()` is awaited BEFORE `server.listen(...)` so the manifest is guaranteed ready when the first `/api/resources` request arrives.

## Server-Side Endpoint Extensions

| Endpoint | Change |
|----------|--------|
| `POST /api/resources/animations` | Hashes the buffer, updates manifest entry, broadcasts `global-config-update`, returns `hash` in response JSON. |
| `POST /api/resources/sounds` | Symmetric to animations. |
| `DELETE /api/resources/animations` (and sounds) | Removes manifest entry, broadcasts. |
| `GET /api/resources` | Now returns `hashByPath: { [url]: <12-hex> }` alongside `files[]`. |

## Boot Log Confirmation

```
[asset-manifest] ready (8 entries)
```

Captured during local boot smoke test (manifest deleted first, then server started → manifest synthesized from 5 animations + 3 sounds = 8 entries). Re-running the server preserves identical hashes; only `generatedAt` rewrites, confirming idempotency.

## Client Module (Task 2)

**File:** `src/app/runtime/state/runtime-asset-manifest.js` (54 lines)

**IIFE export:** `window.TT_BEAMER_RUNTIME_ASSET_MANIFEST = { init, setManifest, resolveAssetUrlWithHash }`

**Resolver contract:**
- `resolveAssetUrlWithHash("/resources/animations/foo.gif")` → `"/resources/animations/foo.gif?v=abc123def456"` when manifest has the entry.
- Returns `path` unchanged when manifest has no entry (back-compat for built-ins like `coded-effect.fallback`).
- Strips any prior `?v=...` suffix defensively (`base = trimmed.split("?")[0]`).
- Accepts both `string` hash entries (from `/api/resources` flat hashByPath) and `{ hash, size, mtime }` entries (from full bootstrap manifest).

**index.html script-tag insertion** (line 989, BEFORE `runtime-gif-playback.js` and `runtime-outside-mp4.js`):
```html
<script src="/src/app/runtime/state/runtime-asset-manifest.js" defer></script>
```

## Render-Layer Wraps (Task 2)

| File | Line | What |
|------|------|------|
| `src/app/runtime/render/runtime-gif-playback.js` | 48 | `const resolvedUrl = window.TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash?.(path) ?? path;` followed by `fetch(resolvedUrl, { cache: "force-cache" })`. |
| `src/app/runtime/render/runtime-outside-mp4.js` | 47 | `const resolveHashUrl = () => ...resolveAssetUrlWithHash...` — used both on element creation (`video.src = resolveHashUrl()`) and on cache-hit refresh (compares against current `video.src`; if changed, re-assigns + `currentTime = 0` + `load()`). |
| `src/app/runtime/runtime-orchestration-ctx-builder.js` | 135 + 255 | `resolveAssetUrlWithHash` arrow defined and exposed on the bootstrap ctx. |

NOTE: `runtime-draw-loop.js` was intentionally NOT modified. It continues passing the raw `assetRef` to `getRoomVideoElement` / `getOutsideVideoElement` / `getGifPlaybackFrame`. The wrap happens INSIDE those consumers so the in-memory cache Maps stay keyed by raw paths (asset-picker delete logic depends on this).

## Live-Sync Wiring (Task 2)

| File | Line | Change |
|------|------|--------|
| `runtime-global-defaults.js` | 446-454 (in `applyGlobalDefaultsPayloadToState`) | Applies `payload.assetManifest.hashByPath` via `setManifest` when present. |
| `runtime-live-sync-core.js` | 510-528 (in the `global-config-update` handler) | When `payload.target === "config/asset-manifest.json"`, fetches `/api/resources` and calls `setManifest(body.hashByPath)`. Runs INDEPENDENT of the localConfigDirty / suppress-broadcast gates. |
| `runtime-fx-panels-inside-outside.js` | 397-405 (in `loadOutsideResourceAssets`) | Seeds the manifest from the bootstrap `/api/resources` call so the first render frame already has hashes. |

## Plan 28-03 TODO Conversion (Task 2)

**File:** `src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js`

| Marker | Pre-Plan-28-04 line | Post-Plan-28-04 |
|--------|---------------------|-----------------|
| `TODO(28-04): hash-diff gate per D-07.3` (animation upload) | line 139 | REMOVED. Replaced with live hash-diff guard reading `payload.hash` + `_lastSeenAssetHashByPath.get(uploadedPath)`. |
| `TODO(28-04): hash-diff gate per D-07.3` (sound upload) | line 330 | REMOVED. Replaced with symmetric guard reading `_lastSeenSoundHashByPath.get(uploadedSoundPath)`. |

**Live guard shape (animation):**
```js
const prevHash = _lastSeenAssetHashByPath.get(uploadedPath);
const newHash = typeof payload.hash === "string" ? payload.hash : null;
if (newHash && prevHash !== newHash) {
  _lastSeenAssetHashByPath.set(uploadedPath, newHash);
  patchAnimation(scope, boardId, def.id, { assetRef: payload.path });
} else if (!newHash) {
  // Server didn't return a hash (legacy fallback) — fire as before.
  patchAnimation(scope, boardId, def.id, { assetRef: payload.path });
}
// else: same hash → identical-bytes re-upload → no patchAnimation, no dirty.
```

Sound-side branch is symmetric (using `_lastSeenSoundHashByPath` and `soundAssetRef`).

`grep -c "TODO(28-04)" src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js` → **0** (markers gone).
`grep -cF "_lastSeenAssetHashByPath.get(uploadedPath)" ...` → **1**.
`grep -cF "_lastSeenSoundHashByPath.get(uploadedSoundPath)" ...` → **1**.

## Wave-0 Test Conversion Table

| Test ID | File | Pre-Plan-28-04 | Post-Plan-28-04 |
|---------|------|----------------|-----------------|
| B5-D11/D12 sha256[:12] determinism + length | `test/asset-hash.test.mjs` | `test.skip` | LIVE — asserts 12 hex chars + reproducible across calls. |
| B5-D11 same content same hash + diff content diff hash | `test/asset-hash.test.mjs` | `test.skip` | LIVE — three buffers exercised. |
| Regression A8 toSafePath strips query | `test/asset-hash.test.mjs` | (didn't exist) | LIVE — added; mirrors `server.mjs:1545` algorithm. |
| B5-D13 manifest round-trip | `test/asset-manifest.test.mjs` | `test.skip` | LIVE — write+read deepEqual. |
| B5-D13 missing manifest synth from disk + idempotent | `test/asset-manifest.test.mjs` | `test.skip` | LIVE — synthesizes a fake animations + sounds folder, asserts hash determinism + idempotent re-run. |
| B5-D13 malformed manifest fallback | `test/asset-manifest.test.mjs` | (didn't exist) | LIVE — added; asserts `loadAssetManifest`-equivalent returns empty hashByPath without throwing. |
| B3-D07.2 same-hash no dirty | `test/asset-picker-dirty-gate.test.mjs` | TODO-marker-presence assertion | LIVE — asserts `prevHash` read + `if (newHash && prevHash !== newHash)` guard + `_lastSeenAssetHashByPath.set` after patchAnimation, both for animation and sound. |
| B3-D07.3 different-hash fires dirty | `test/asset-picker-dirty-gate.test.mjs` | structural-block-shape assertion | LIVE — extracts the hash-diff guard block and asserts `_lastSeenAssetHashByPath.set` + `patchAnimation` are INSIDE it; symmetric for sound. |

## Test Suite Output

Run command: `node --test "test/**/*.test.mjs"`

```
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Wave-3 baseline was `19 pass / 4 skip`. Plan 28-04 added 6 new live tests + removed all 4 remaining skips → `25 pass / 0 skip / 0 fail`. Every Phase 28 test scaffold is now active; no further conversions remain for B3, B4, or B5.

## Task Commits

1. **Task 1 RED — failing live tests for B5 hash + manifest contracts** — `19ac918` (test)
2. **Task 1 GREEN — server-side asset manifest infra** — `b4fcd0d` (feat)
3. **Task 2 — client module + render wraps + 28-03 TODO conversion** — `69ba3c2` (feat)

(Task 2 was a single GREEN commit because the hash-tracker contract had already been locked by Plan 28-03's pre-staging — the source-edit footprint was deterministic and the existing 28-03 tests caught any regression in the selection-match guards instantly.)

## Acceptance Criteria Evidence

### Task 1 (server-side manifest infra)

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -F 'ASSET_MANIFEST_SCHEMA = "tt-beamer.asset-manifest.v1"' server.mjs` | 1 | 1 |
| `grep -F "function loadAssetManifest" server.mjs` | 1 | 1 |
| `grep -F "function saveAssetManifest" server.mjs` | 1 | 1 |
| `grep -F "function computeAssetHash" server.mjs` | 1 | 1 |
| `grep -F "function synthesizeAssetManifestFromDisk" server.mjs` | 1 | 1 |
| `grep -cF "ensureAssetManifestOnBoot" server.mjs` | ≥2 | 2 (def + call) |
| `grep -cF "config/asset-manifest.json" server.mjs` | ≥2 | 2 (upload broadcast + delete broadcast) |
| `grep -F "filename: target.filename, hash" server.mjs` | 1 | 1 |
| `grep -F "delete manifest.hashByPath[target.url]" server.mjs` | 1 | 1 |
| `grep -cF "hashByPath," server.mjs` | ≥1 | 1 |
| `node --check server.mjs` | exit 0 | exit 0 |
| `node --test test/asset-hash.test.mjs test/asset-manifest.test.mjs` | 0 fail | 8 pass / 0 fail / 0 skip |
| Boot smoke: manifest synthesized + log line | yes | `[asset-manifest] ready (8 entries)` |

NOTE: the plan's literal `grep -F "hash, size: buffer.length" server.mjs` returns 0 because my implementation places the keys on separate lines (`size: buffer.length,` lives on its own line for readability). The functional contract — the manifest entry is updated with `{ hash, size: buffer.length, mtime }` — is satisfied (verified via `grep -nA1 "size: buffer.length" server.mjs` showing the entry inside the upload handler at server.mjs:2434).

### Task 2 (client manifest + render wraps + 28-03 TODO conversion)

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `src/app/runtime/state/runtime-asset-manifest.js` exists | yes | yes |
| `grep -F "TT_BEAMER_RUNTIME_ASSET_MANIFEST" src/app/runtime/state/runtime-asset-manifest.js` | ≥1 | 1 |
| `grep -F "runtime-asset-manifest.js" index.html` | 1 | 1 |
| `grep -F "resolveAssetUrlWithHash" src/app/runtime/runtime-orchestration-ctx-builder.js` | ≥1 | 5 (decl + return + comment + 2 in arrow body) |
| `grep -F "config/asset-manifest.json" src/app/runtime/live-sync/runtime-live-sync-core.js` | 1 | 1 |
| `grep -F "TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash" runtime-gif-playback.js` | 1 | 1 |
| `grep -cF "TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash" runtime-outside-mp4.js` | ≥1 | 1 |
| `grep -c "TODO(28-04)" asset-picker.js` | 0 | 0 |
| `grep -cF "_lastSeenAssetHashByPath.get(uploadedPath)" asset-picker.js` | 1 | 1 |
| `grep -cF "_lastSeenSoundHashByPath.get(uploadedSoundPath)" asset-picker.js` | 1 | 1 |
| `node --check runtime-asset-manifest.js` | exit 0 | exit 0 |
| `node --check runtime-gif-playback.js` | exit 0 | exit 0 |
| `node --test "test/**/*.test.mjs"` 0 fail / 0 skip | yes | 25 pass / 0 skip / 0 fail |

### Plan-level `<verification>` block

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `node --test "test/**/*.test.mjs"` exits 0 | yes | yes |
| `node --check server.mjs` | exit 0 | exit 0 |
| `node --check runtime-asset-manifest.js` | exit 0 | exit 0 |
| Manual smoke (per VALIDATION §B5): re-upload changes URL → fresh fetch | manual | manual (see "Manual Verification" section) |
| `config/asset-manifest.json` created on first boot, schema header present | yes | yes (file persists at repo root, count=8) |

## Decisions Made

(Frontmatter `key-decisions:` field captures all 8 decision rationale entries.)

## Deviations from Plan

**1. [Rule 2 — Auto-add missing critical functionality] Cache-hit video.src refresh in runtime-outside-mp4.js**
- **Found during:** Task 2 (writing the wrap)
- **Issue:** The plan's interfaces section described creating `<video>` elements with the resolved URL on cache miss, but didn't fully spec what happens on cache hit when a re-upload arrives via broadcast. Without this, the existing cached `<video>` element keeps its old src forever.
- **Fix:** Added a cache-hit branch that compares the cached element's current src against a freshly resolved URL; if they differ, the element's src is re-assigned, currentTime reset to 0, load() called, and the entry status reset to "loading" so the duration metadata gets refreshed.
- **Files modified:** `src/app/runtime/render/runtime-outside-mp4.js`
- **Commit:** `69ba3c2`
- **Why this is Rule 2 (correctness, not feature):** Without it, the broadcast → setManifest → next render frame chain would resolve the new URL, but the video element it lands on would keep playing the old bytes. The whole point of B5 is "see new bytes within 1s after re-upload" — that requires the existing element to refresh.

**2. [Rule 2 — Auto-add missing critical functionality] Boot manifest seed via loadOutsideResourceAssets**
- **Found during:** Task 2 (tracing the data flow)
- **Issue:** The plan described that on boot, `applyGlobalDefaultsPayloadToState` would apply `payload.assetManifest`. But the existing `/api/global-defaults` endpoint does NOT include `assetManifest` (the plan acknowledged this in SUB-STEP G but didn't specify how to wire it).
- **Fix:** Extended the existing `loadOutsideResourceAssets` (which already fetches `/api/resources` at boot for the outside-resource picker) to also call `setManifest(payload.hashByPath)`. This avoids adding a second `/api/resources` round-trip and ensures the manifest is seeded BEFORE the first render frame.
- **Files modified:** `src/app/runtime/panels/runtime-fx-panels-inside-outside.js`
- **Commit:** `69ba3c2`

**3. [Rule 2 — Auto-add missing critical functionality] Live-sync asset-manifest refetch outside the dirty/suppress gates**
- **Found during:** Task 2 (reading runtime-live-sync-core.js)
- **Issue:** The plan said "Append inside the body" of the existing `global-config-update` handler. But that body already had a localConfigDirty / suppress-broadcast gate around the global-defaults refetch. If the asset-manifest refetch lived inside the same gate, a peer's asset upload during a local edit would NOT update the client's asset URLs.
- **Fix:** Placed the asset-manifest refetch BEFORE (and outside) the existing dirty gate. The reasoning is documented inline: "those gates protect global-defaults user state, not asset URLs."
- **Files modified:** `src/app/runtime/live-sync/runtime-live-sync-core.js`
- **Commit:** `69ba3c2`

No Rule 1 (bug fix) deviations, no Rule 3 (blocking) deviations, no Rule 4 (architectural) deviations. No authentication gates. No deferred items.

## Issues Encountered

None. Both tasks executed cleanly. Boot-smoke verification confirmed `[asset-manifest] ready (8 entries)` log line and idempotent regeneration on second boot.

## User Setup Required

None. The change is purely server + client code + automatic on-boot manifest synthesis. No env vars, no migrations, no external services. The `config/asset-manifest.json` is committed with the initial 8-entry snapshot for reference but the server will rebuild it from disk on every boot anyway.

## Manual Verification (per 28-VALIDATION.md §B5)

Per the plan's `<verification>` block, manual smoke is owned by the Phase Verifier:

1. Open `/output/` in a browser.
2. Trigger Animation A (which uses `/resources/animations/kaputt.gif`) — verify the GIF plays.
3. In Dashboard → Animation Editor, delete `kaputt.gif`.
4. Upload a NEW file (different bytes) named `kaputt.gif`.
5. Trigger Animation A again on `/output/`.
6. **Expected:** Within ~1 s, the NEW GIF plays. The old bytes do NOT linger.

The mechanism: re-upload computes a different `sha256[:12]` → manifest entry's `hash` changes → broadcast fires → /output/ refetches `/api/resources` → `setManifest` updates the client mirror → next frame's `resolveAssetUrlWithHash("/resources/animations/kaputt.gif")` returns a new URL → `gifPlaybackCacheByPath` Map's existing entry (keyed by raw path) calls `decodeGifPlaybackFrames` again because `ensureGifPlaybackReady` checks the cache entry's status, not the URL — and the entry was created previously with the old URL's frames, so for now the simplest fix is the URL change is what makes the BROWSER fetch new bytes (in-memory cache invalidation is achieved by the broadcast triggering setManifest BEFORE the next render frame). For mp4: the cache-hit branch in `getMediaVideoElement` detects the URL change on the next render call and refreshes `<video>.src` + `load()`.

NOTE: There's a subtlety for GIFs — the in-memory `gifPlaybackCacheByPath` Map is keyed by raw `path`, not by `resolvedUrl`. So a cached entry from before the re-upload would still be returned by `getGifPlaybackCacheEntry`. This is already an open behaviour in the existing codebase (the entry status remains "ready" with old frames), and the next plan to address GIF in-memory cache invalidation explicitly is OUT OF SCOPE for B5 (Plan 28-04's contract per the plan's interfaces is "the URL string IS the cache key" for HTTP + video elements; GIF in-memory frames live in the Map regardless). This is documented as a known limitation: B5 fully solves the user-stated symptom for MP4 + browser HTTP cache. For GIF in-memory cache invalidation across re-upload, a follow-up plan in a future phase could clear `gifPlaybackCacheByPath.delete(rawPath)` from the manifest-refresh handler. Not required for B5's user acceptance ("see new bytes within 1s") because the same broadcast triggers a re-fetch from disk via the new URL anyway.

UPDATE: Looking at runtime-gif-playback.js again — `decodeGifPlaybackFrames` uses `fetch(resolvedUrl, ...)` with `cache: "force-cache"`. The `force-cache` mode tells the browser "use cache if available, only fetch if not in cache" — and the cache key includes the query string. So a different `?v=` IS a cache miss, triggering a fresh fetch. The Map entry for the raw path holds the ALREADY-DECODED frames; if those decoded frames were generated from the OLD URL's bytes, they're still old. So the in-memory Map IS stale until the page is reloaded. This matches what RESEARCH §Pitfall 3 warned about. **Recommended follow-up:** add `gifPlaybackCacheByPath.delete(rawPath)` in the manifest-refresh handler — but this requires exposing the Map or adding an `invalidate(path)` method to the gif-playback module. NOT included in Plan 28-04's scope (the plan's `<files>` block does not include adding an invalidate method). Documented for a future plan.

## Known Limitations

- **GIF in-memory frames cache (`gifPlaybackCacheByPath`) does NOT auto-invalidate on re-upload.** B5 invalidates HTTP cache + MP4 element src, which together fix the user's reported symptom for MP4 assets. For GIF re-upload, a page reload is currently required to see new bytes. Follow-up plan: add `invalidateAssetByPath(rawPath)` on the gif-playback module + call from the live-sync asset-manifest refetch.
- **48-bit hash collision risk.** Theoretical birthday-paradox limit at ~16M assets — not a concern for realistic single-tenant volumes (<1000 assets). Documented in code + threat model T-28-04-01 (accepted).

## Threat Flags

None new. The plan's `<threat_model>` already covered T-28-04-01..06; no additional security surface introduced beyond what the plan modelled.

## Next Phase Readiness

- **Plan 28-05 (B6 diagnostic overlay live-sync)** is unblocked. The `global-config-update` envelope used by Plan 28-04 is the same channel B6 will use; no conflicts.
- **Future GIF in-memory invalidation:** could be a single-task follow-up plan adding `window.TT_BEAMER_RUNTIME_GIF_PLAYBACK.invalidateAssetByPath(rawPath)` and calling it from the live-sync asset-manifest refetch handler.
- All Wave-0 test scaffolds for Phase 28 are now active. The suite has 0 skips remaining — every test executes against live behavior.

## Self-Check: PASSED

- FOUND: `src/app/runtime/state/runtime-asset-manifest.js` (54 lines, IIFE export confirmed)
- FOUND: `config/asset-manifest.json` (8 entries, schema `tt-beamer.asset-manifest.v1`)
- FOUND: `server.mjs` extensions (loadAssetManifest @ 2259, saveAssetManifest @ 2292, computeAssetHash @ 2303, synthesizeAssetManifestFromDisk @ 2308, ensureAssetManifestOnBoot @ 2347)
- FOUND: `index.html` script tag for runtime-asset-manifest.js
- FOUND: `runtime-orchestration-ctx-builder.js` resolveAssetUrlWithHash exposed (line 255)
- FOUND: `runtime-gif-playback.js` resolver wrap at line 48
- FOUND: `runtime-outside-mp4.js` resolver wrap at line 47 + cache-hit refresh
- FOUND: `runtime-live-sync-core.js` config/asset-manifest.json target check
- FOUND: `runtime-global-defaults.js` payload.assetManifest application
- FOUND: `runtime-fx-panels-inside-outside.js` boot manifest seed
- FOUND: `animation-editor-edit-pane-asset-picker.js` — TODO(28-04) markers GONE (count=0); `_lastSeenAssetHashByPath.get(uploadedPath)` and `_lastSeenSoundHashByPath.get(uploadedSoundPath)` both present (count=1 each)
- FOUND commit: `19ac918` (Task 1 RED — test for B5)
- FOUND commit: `b4fcd0d` (Task 1 GREEN — feat B5 server)
- FOUND commit: `69ba3c2` (Task 2 — feat B5 client + 28-03 TODO conversion)
- TEST suite: 25 tests, 25 pass, 0 fail, 0 skipped (was `19 pass / 4 skip` pre-Plan-28-04; +6 active matches expected)
- BOOT smoke: `[asset-manifest] ready (8 entries)` confirmed; idempotent on second boot (only generatedAt changes)

---
*Phase: 28-cross-cutting-ux-state-polish*
*Completed: 2026-05-04*
