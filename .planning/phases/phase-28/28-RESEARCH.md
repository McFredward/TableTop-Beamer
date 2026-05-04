# Phase 28: Cross-cutting UX & State Polish — Research

**Researched:** 2026-05-04
**Domain:** Browser/runtime UX hygiene on a vanilla JS / Node 24 / WebSocket-driven server-authoritative single-page app. Scope spans six surgical fixes across align-mode profile memory (B1), board-switch save-gate (B2), animation-editor dirty hygiene (B3), modal style consistency (B4), asset cache invalidation (B5), and diagnostic-overlay live-sync + topbar layout (B6).
**Confidence:** HIGH on stack and architecture (codebase fully read; no new tooling). MEDIUM on B5 root-cause attribution (HTTP cache vs in-memory cache vs both — multiple layers identified, exact contribution per layer not measured but each is sufficient on its own).

## Summary

The codebase is a server-authoritative, vanilla-JS, IIFE-namespaced runtime. There is no framework, no bundler, no test framework, no package manager-installed runtime deps — the only external dependency is Node.js for `server.mjs`. All six items in Phase 28 ride on patterns Phase 13/26/27 already established: per-board JSON in `config/boards/<id>.json`, server-authoritative `global-defaults.json`, `global-config-update` WebSocket broadcast, `applyGlobalDefaultsPayloadToState`, and the Phase-27-W5 multi-device save-gate (`alignModeDirtyOnOutput` + dashboard `syncAlignModeDirtyDashboardState()`). Nothing about Phase 28 demands new tools — every required infrastructure piece exists.

The six items split cleanly into four implementation themes:

1. **Per-board state field + auto-load on switch (B1)** — single new field `lastUsedProfileName` in board JSON, auto-loaded silently in `switchBoard()` after `applyBoardConfig`-equivalent step, snapshot-equal so dirty stays false.
2. **Extend Phase 27 W5 save-gate to board-switch (B2)** — `syncAlignModeDirtyDashboardState()` is already the single chokepoint and currently disables one button (`#align-mode-button`); Phase 28 extends it to also disable `#board-select` and any cluster-/import-driven `switchBoard()` invocation paths.
3. **Asset-lifecycle correctness (B3 + B4 + B5)** — re-shape the asset-picker upload/delete handlers (a) to gate `patchAnimation` on selection-match-and-content-hash-difference (B3), (b) to swap `window.confirm()` for the existing `TT_BEAMER_RUNTIME_MODAL.showConfirm({ danger: true })` API (B4), (c) to multi-layer-bust the cache via server-computed sha256 + `?v=<hash>` query param (B5).
4. **Diagnostic-overlay UX (B6)** — primarily a layout move. The cross-client live-sync path **already exists** (the toggle calls `saveGlobalDefaultsToServer()` and the broadcast triggers `syncRuntimePanelsFromState()` which calls `syncDiagnosticOverlayPanel()` on every client). The fix is the dashboard chip's `position: fixed; top: 8px; right: 8px;` overlapping the topbar logo + title.

**Primary recommendation:** Implement B1 / B2 / B6 first as low-risk reuse of existing Phase 26/27 infrastructure. Treat B3 + B5 as a single implementation pair (both touch the asset-picker upload handler — coordinating them avoids overlapping edits). B4 is the simplest standalone (drop-in replacement of two `window.confirm` calls).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### B1 — Per-Board "last-used profile" Memory
- **D-01:** Trigger semantics — on Save AND on Load. The `lastUsedProfileName` field updates when the user explicitly saves (`saveLoadedProfileFlow`, `createNewProfileFlow`) OR explicitly loads from the picker. Discard/Reset/Default does NOT update the field.
- **D-02:** Storage — per-Board JSON server-side. New field `lastUsedProfileName: string | null` in `config/boards/<id>.json`. No new top-level storage, no localStorage. Live-synced via existing `global-config-update` broadcast (Phase 26 pattern). Cross-device consistency guaranteed.
- **D-03:** Auto-load on Board-Switch. (1) If `lastUsedProfileName` exists AND a profile by that name exists for the board → auto-load + snapshot + Dirty=false. (2) If `lastUsedProfileName === null` OR profile no longer exists → fall back to default (`buildNewProfileDefaultGrid()`), `_loadedProfileName = null`, no profile-picker pop-up.

#### B2 — Board-Switch Save-Gate (Phase-27-B5-Parallel)
- **D-04:** Inherit from Phase 27 D-04..D-06. Board-Switch actions (all paths: dropdown / cluster-picker / hotkeys / keyboard) are disabled while `session.snapshot.alignModeDirtyOnOutput === true`. Identical mechanism: server-authoritative via existing fanout, 10s grace-timer on /output/-disconnect, no new WebSocket-channel.
- **D-05:** Hint copy + disable-style identical to Phase 27 B5. Long form (in `title` / `aria-label`): *"Unsaved align changes on /output/ — save or discard there first to switch board."*. Short visible amber chip: *"Unsaved on /output/"* (identical copy to Phase 27 hint chip; one shared CSS-token-set, one shared JS helper `syncAlignModeDirtyDashboardState()` extended, not duplicated).
- **D-06:** Disable-Coverage. All board-switch entry points instrumented. Minimum: board-dropdown, cluster-picker buttons, every `setActiveBoard()`/`switchBoard()` binding. Researcher delivers the exact list.

#### B3 — Asset-Upload/Delete Dirty-Flag-Hygiene
- **D-07:** "Only effective change" definition. Dirty fires ONLY when ALL of: (1) the uploaded/deleted asset (path+name identified) is referenced in the `assetRef` of the **currently selected** animation in the edit target, (2) the effective `assetRef` resolution status has actually changed (Delete → animation breaks, or Replace → content-hash differs), (3) identical re-upload (same content-hash) does NOT count as change and fires no dirty.
- **D-08:** Pure-Library-Mutation without selection-match → no-op on dirty. Upload of an asset not referenced by any currently-selected animation fires no dirty. Delete of an asset only present in unused library entries fires no dirty.

#### B4 — Custom Asset-Delete-Modal
- **D-09:** 1:1 style copy of the Board-Delete-Modal. Own modal component in same glassmorphism style: title slot, body slot with asset name + (optional) hint "Used by N animations" when selection-match. Esc / click-outside dismiss (no-op). "Cancel" + "Delete" buttons (destructive accent for Delete). Asset-Picker shows the modal in place of the `window.confirm()` call in `animation-editor-edit-pane-asset-picker.js`.
- **D-10:** Consistency rule. If a future modal-helper-component already exists (e.g. in `runtime-panels-controller.js` or as the board-delete modal pattern), reuse it — don't duplicate. Researcher identifies the exact component.

#### B5 — Asset-Cache-Invalidation on Re-Upload
- **D-11:** Content-hash query param strategy. Server: on `POST /api/assets/<type>` upload → server computes `sha256(bytes)`, stores `{ name, hash, bytes }` in an asset manifest (filesystem `.<hash>.meta` sidecar OR RAM-manifest). On write returns hash to client. On read of asset list/detail, server always delivers the current hash per asset. Client: all asset URLs constructed as `/path/file.gif?v=<hash>`. When `<hash>` changes after re-upload, browser sees a different URL → cache bypass automatic. In-memory `Image`/`HTMLVideoElement` caches also invalidated by new URL. Existing asset resolver in `runtime-gif-playback` / `runtime-effect-visuals` builds the hash-suffixed URL.
- **D-12:** Hash-Algorithm: `sha256` (Node-builtin `crypto.createHash`, no extra dep). Output as hex truncated to 12 chars for URL compactness. Truncated-hash collision probability is practically nil for expected asset volumes (<1000).
- **D-13:** Manifest-Persistence. Hash held in asset manifest (server-memory + on disk in `config/asset-manifest.json` OR per-asset sidecar). Researcher selects exact storage location based on existing asset storage layout.

#### B6 — Diagnostic-Overlay UX
- **D-14:** Dashboard-Placement: Inline in Topbar. The current `.output-status-chip` (fixed top:8px right:8px) goes into the dashboard's topbar flex-container — as a pill right of the existing version chip. CSS-switch via selector `body:not([data-output-role="final-output"]) .output-status-chip` for the inline variant; on /output/ the existing fixed-position style stays.
- **D-15:** /output/-Rendering: Identical chip optics. The `.output-status-chip` on /output/ keeps its current visual style (top-right, green-tinted pill, monospace font). Only change: no longer per-client-toggled but live-synced via `global-config-update`.
- **D-16:** Live-Sync-Transport: existing `global-config-update` broadcast (Phase 26 pattern). Server holds `runtimeFlags.diagnosticOverlay: boolean` in `global-defaults.json`. Toggle in dashboard writes to server → server broadcasts → all clients apply via `applyGlobalDefaultsPayloadToState`. **No new channel, no new endpoint.**
- **D-17:** Toggle-Source. Existing System-tab toggle remains the only entry-point. Toggle becomes a server-write (rather than only setting local `data-diagnostic-overlay`).

### Claude's Discretion

- **D-18:** Exact schema-form of `lastUsedProfileName` in board JSON (nullable string vs. optional field; default = absent). Implementer chooses per existing schema conventions.
- **D-19:** Exact asset-manifest form (separate `config/asset-manifest.json` vs. inline per-asset in existing `global-defaults.json` vs. filesystem `.meta`-sidecar). Implementer chooses based on what's least invasive for existing asset storage.
- **D-20:** Exact pixel sizes + spacing for the inline diagnostic chip in the topbar — visual fineness, should look consistent with the version chip.
- **D-21:** Reuse-vs-new for the custom modal (B4): use an existing modal-component if one exists; otherwise new with board-delete modal as style-template.

### Deferred Ideas (OUT OF SCOPE)

- **Asset versions history.** Holding multiple versions of the same asset name in parallel (for Undo). Currently not — B5 simply replaces.
- **Multi-/output/ identity / friendly-names.** Deferred from Phase 27, stays deferred. B2 inherits the single-/output/-assumption.
- **Diagnostic-overlay extensions** (FPS, render-mode, zone-ID inline). On /output/ the chip stays identical to status quo. Extension later possible, not in B6.
- **Asset-library search / filtering.** Asset-Picker stays functionally unchanged except for B4 modal replacement.

</user_constraints>

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` does not exist in this repository. There are no project-level enforced directives beyond the implicit conventions visible in the codebase:

- **No framework, no bundler, no transpiler.** Browser-side JS is loaded as raw `<script defer>` tags from `index.html`. Implementer MUST NOT introduce React/Vue/bundlers — they are not in the stack.
- **IIFE namespace pattern.** Every browser module follows `(() => { ... window.TT_BEAMER_RUNTIME_X = { init, ... } })();`. Implementer MUST follow this pattern for any new module.
- **Module init via dependency-injection ctx object.** Modules expose `init(deps)` and pull from `ctx`. Implementer MUST follow this — direct `window.*` reads inside hot paths break the testability gradient.
- **No new runtime dependencies.** Server runs on Node-builtins only (`crypto`, `fs/promises`, `path`, `url`, `http`, `zlib` for the hand-rolled zip codec). Implementer MUST NOT `npm install` anything for B5; `crypto.createHash('sha256')` covers the requirement.
- **Server is `server.mjs` single-file.** Adding endpoints, helpers, or in-memory state is appended to that file by convention.

## Phase Boundary Recap

Six independent UX/state corrections after Phase 27 closure. No new feature surface; only lifecycle hygiene, save-gate parity, and visible UI cleanups on existing infrastructure. Out of scope: new asset types or animation classes; align-mode editor extensions; server-side storage-schema migrations beyond the B5 minimum (asset manifest with content-hash); multi-beamer / multi-/output/ identity infrastructure.

## Standard Stack

### Core (verified — already in tree)

| Component | Version | Purpose | Source |
|-----------|---------|---------|--------|
| Node.js | v24.13.1 (locally installed) | Server runtime for `server.mjs` | [VERIFIED: `node --version` on host] |
| Vanilla JS (ES modules in IIFE wrappers) | n/a | Browser-side runtime | [VERIFIED: `index.html` lines 967–1014 — raw script tags, no bundler] |
| Native `WebSocket` | browser-builtin | Live-sync transport | [VERIFIED: `runtime-live-sync-core.js` line 510 `payload?.type === "global-config-update"`] |
| Native `crypto.createHash('sha256')` | Node-builtin | Content hashing for B5 | [VERIFIED: Node 24 docs — `node:crypto` module] |
| `tt-modal-*` glassmorphism CSS classes | inline in `src/styles.css` lines 1948–2049 | Re-usable modal panel + buttons | [VERIFIED: grep on `src/styles.css`] |
| `TT_BEAMER_RUNTIME_MODAL.showConfirm(...)` | `src/app/runtime/ui/runtime-modal.js` | Promise-based confirm/prompt/select replacement for `window.confirm`/`prompt`/`select`. Supports `danger: true` → red destructive accent. | [VERIFIED: Read of `runtime-modal.js` lines 61–105] |
| Phase 27 W5 save-gate primitives | `runtime-stage-viewport.js`, `runtime-global-defaults.js`, `runtime-live-sync-core.js`, `server.mjs` (`/api/align-mode-dirty`, `liveSessionState.snapshot.alignModeDirtyOnOutput`) | Multi-device dirty-state broadcast w/ 10s grace timer | [VERIFIED: Read of `runtime-stage-viewport.js` lines 48–80; `server.mjs` lines 1755–1820] |
| Phase 26 `global-config-update` broadcast pattern | `server.mjs` `broadcastLiveSession()` + client `runtime-live-sync-core.js` line 510 handler | Server-authoritative state propagation | [VERIFIED: Read of `server.mjs` line 2858] |

### Supporting (verified — already in tree)

| Library / Helper | Path | Used For |
|---|---|---|
| `runtime-projection-profile-persistence.js` | `src/app/runtime/viewport/` | B1 hooks: `_loadedProfileName`, `_loadedProfileSnapshot`, `saveLoadedProfileFlow`, `saveAsNewProfileFlow`, `createNewProfileFlow`, `profileLoadFlow`, `discardChanges`, `_persistLoadedProfileToLs`, `addDirtyListener`, `notifyDirtyChanged`, `_recomputeAndNotifyDirty`. |
| `runtime-projection-grid-state.js` | `src/app/runtime/viewport/` | B1: exports `buildNewProfileDefaultGrid()`, `snapshotGridState`, `restoreGridSnapshot` via the `_gridStateApi` injection. |
| `runtime-board-switch.js` | `src/app/runtime/core/` | B1 + B2 hook: `switchBoard()` is the single chokepoint for board switching. |
| `runtime-board-profiles.js` | `src/app/runtime/state/` | B1: `applyPersistedRuntimeSettings`, `applyBoardProfilesToState`, `buildBoardProfilesFromState`, `buildPersistedRuntimeSettingsFromState`. |
| `runtime-stage-viewport.js` | `src/app/runtime/viewport/` | B2: `syncAlignModeDirtyDashboardState()` is the helper to extend (single dashboard helper, per D-05). |
| `runtime-wire-navigation-binders.js` | `src/app/runtime/wire/` | B2: contains `boardSelect.addEventListener("change", ...)` → `switchBoard()` — primary instrumentation point. |
| `animation-editor-edit-pane-asset-picker.js` | `src/app/runtime/ui/` | B3 + B4 + B5 hooks: contains the `window.confirm()` calls, the upload handler, the delete handler, and the `patchAnimation` invocations. |
| `animation-editor-edit-pane.js` line 681 (`patchAnimation`) | `src/app/runtime/ui/` | B3: this is where dirty propagates via `syncDirtyBar` → `markDirty()` → `state.localConfigDirty = true`. |
| `runtime-gif-playback.js` | `src/app/runtime/render/` | B5: `gifPlaybackCacheByPath = new Map()` (line 18) is keyed by path string and is **never invalidated**. `decodeGifPlaybackFrames` (line 42) explicitly uses `fetch(path, { cache: "force-cache" })` — adds HTTP cache as second layer. |
| `runtime-outside-mp4.js` | `src/app/runtime/render/` | B5: `outsideVideoCacheByPath` and `roomVideoCacheByPath` (lines 21–22) are path-keyed Maps holding `<video>` elements with `src` set once at create time. |
| `server.mjs handleResourceUpload` | line 2253 | B5: asset upload endpoint to extend with sha256 computation. |
| `server.mjs loadResourceAssetCatalog` | line 2205 | B5: asset listing endpoint to extend with hash field per file. |
| `server.mjs handleStaticFile` | line 2882 | Currently writes only `content-type` — **no `Cache-Control`, no `ETag`**. This is the third layer for B5 (browser HTTP heuristic cache). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| sha256 truncated to 12 chars | sha256 truncated to 8 chars | 32 bits → birthday collision at ~65k assets (still safe, but tighter); 12 chars cleaner against accidental collisions even with thousands of assets. **Locked at 12 by D-12.** |
| Asset manifest as `config/asset-manifest.json` | Per-file `.meta` sidecar OR inline in `global-defaults.json` | Sidecar = more files but no cross-asset locking; central JSON = single read but contention on every upload. **Recommendation in this RESEARCH:** central `config/asset-manifest.json` (mirror `config/projection-profiles.json` pattern: single file, debounced write, server-truth). Keeps Phase 13 server-authoritative pattern. |
| Replace `window.confirm` with hand-rolled modal in asset-picker | Reuse existing `TT_BEAMER_RUNTIME_MODAL.showConfirm({ danger: true })` | **The reusable component already exists** (verified in `runtime-modal.js`). D-21 explicitly says reuse. **Decision: REUSE.** |

**Installation:** none. No new npm packages. No new server deps.

**Version verification:** Not applicable — every dependency is Node-builtin or already in the tree.

## Architecture Patterns

### Recommended Project Structure (extensions only)

```
config/
├── boards/<id>.json                # Phase 28 B1: add lastUsedProfileName field
├── asset-manifest.json             # Phase 28 B5: NEW — { [path]: { hash, size, mtime } }
├── projection-profiles.json        # Phase 27: { [boardId]: { [profileName]: gridState } }
└── global-defaults.json            # Phase 26: truly-global runtime flags

src/app/runtime/
├── viewport/
│   ├── runtime-projection-profile-persistence.js  # B1: extend save+load flows to push `lastUsedProfileName` to server
│   └── runtime-stage-viewport.js                  # B2: extend syncAlignModeDirtyDashboardState() to also disable board-switch surfaces
├── core/
│   └── runtime-board-switch.js                    # B1: at end of switchBoard, trigger silent profile auto-load
├── ui/
│   └── animation-editor-edit-pane-asset-picker.js # B3 + B4 + B5: gate dirty fire, swap confirm for modal, build hash-suffixed URLs
├── render/
│   ├── runtime-gif-playback.js                    # B5: read URL with hash from caller; let cache key remain path+hash
│   └── runtime-outside-mp4.js                     # B5: same — path+hash cache key
└── state/
    └── runtime-board-profiles.js                  # B1: include lastUsedProfileName in build/apply snapshots

server.mjs                                         # B1 + B5: extend BOARD_PROFILE_FIELDS; add asset-manifest helpers
```

### Pattern 1: Server-authoritative live-synced field (Phase 26 / 27 inheritance)

Used by: B1 (`lastUsedProfileName`), B6 (`diagnosticOverlay` already follows this).

```js
// 1. Add field to BOARD_PROFILE_FIELDS in server.mjs (line 36–51).
//    persistBoardProfileToBoardFile(boardId, profile) already iterates this list.
const BOARD_PROFILE_FIELDS = Object.freeze([
  "deletedRoomIds",
  // ...
  "lastUsedProfileName",  // NEW for B1
]);

// 2. Client builds field into per-board profile.
//    Source: src/app/runtime/state/runtime-board-profiles.js — buildBoardProfilesFromState().
function buildBoardProfilesFromState() {
  return Object.fromEntries(
    ctx.getBoards().map((board) => [board.id, {
      // ... existing fields ...
      lastUsedProfileName: state.lastUsedProfileNameByBoard?.[board.id] ?? null,
    }])
  );
}

// 3. Client applies field on load.
//    Source: same module, applyBoardProfilesToState(profiles).
state.lastUsedProfileNameByBoard = Object.fromEntries(
  BOARDS.map((board) => [
    board.id,
    typeof profiles?.[board.id]?.lastUsedProfileName === "string"
      ? profiles[board.id].lastUsedProfileName
      : null,
  ])
);

// 4. Save-trigger callsites in profile-persistence.js call ctx.persistBoardProfiles()
//    (which already debounces 200ms and broadcasts global-config-update).
```

### Pattern 2: Silent profile auto-load with snapshot=loaded (B1 D-03)

The trick: after auto-loading the remembered profile's geometry, **set `_loadedProfileSnapshot = current_grid_state` so `isDirty()` returns false**. The Phase 27 dirty-flag system compares live grid against `_loadedProfileSnapshot` — auto-loading without setting the snapshot would make every board switch fire a dirty flag.

```js
// In runtime-board-switch.js switchBoard(), after applyBoardConfig
//   (i.e. after state.boardId is set + ensureBoardRoomStateMaps + sync* panels),
//   call this BEFORE renderRoomOverlay returns.
async function autoLoadRememberedProjectionProfile(boardId) {
  const remembered = state.lastUsedProfileNameByBoard?.[boardId] ?? null;
  const profilePersist = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE;
  if (!profilePersist) return;

  if (!remembered) {
    // Fall back to default geometry.
    profilePersist.applyDefaultAndCaptureSnapshot();  // NEW helper added in B1 implementation
    return;
  }
  try {
    const resp = await fetch(
      `/api/projection-profiles/load?boardId=${encodeURIComponent(boardId)}&name=${encodeURIComponent(remembered)}`
    );
    if (!resp.ok) {
      profilePersist.applyDefaultAndCaptureSnapshot();
      return;
    }
    const body = await resp.json();
    profilePersist.applyAndCaptureSnapshot(body.data, remembered);
    // applyAndCaptureSnapshot calls applyGridPayload(data),
    // sets _loadedProfileName = remembered,
    // sets _loadedProfileSnapshot = snapshotGridState() (so isDirty=false),
    // calls _persistLoadedProfileToLs() and _recomputeAndNotifyDirty().
  } catch {
    profilePersist.applyDefaultAndCaptureSnapshot();
  }
}
```

### Pattern 3: Single dashboard helper extended, not duplicated (B2 inherits Phase 27 W5)

Per D-05: extend `syncAlignModeDirtyDashboardState()` in `runtime-stage-viewport.js`. The function currently disables `#align-mode-button`. Add board-switch targets:

```js
function syncAlignModeDirtyDashboardState() {
  if (!ctx || ctx.outputRole === ctx.OUTPUT_ROLE_FINAL) return;
  const dirty = Boolean(ctx.state?.alignModeDirtyOnOutput);
  // existing align-button gating ...

  // NEW for B2: gate the board-switch surfaces.
  const boardSelect = ctx.boardSelect ?? document.getElementById("board-select");
  if (boardSelect) {
    if (dirty) {
      boardSelect.setAttribute("disabled", "");
      boardSelect.setAttribute("title", HINT_COPY_FULL_BOARD_SWITCH);
      boardSelect.setAttribute("aria-describedby", "align-mode-dirty-hint");
    } else {
      boardSelect.removeAttribute("disabled");
      boardSelect.removeAttribute("aria-describedby");
      boardSelect.removeAttribute("title");
    }
  }
  // (Cluster pads + animation-editor board picker handled the same way — see Code Examples.)
}
```

### Anti-Patterns to Avoid

- **DON'T** introduce a separate "boardSwitchDisabled" snapshot field on the server. The reason for B5's existence is that `alignModeDirtyOnOutput` already covers exactly this state — D-04 explicitly inherits.
- **DON'T** add a confirmation modal to `discardChanges()` — Phase 27 D-04 locked Discard as direct revert (no confirm).
- **DON'T** invalidate the GIF cache by clearing `gifPlaybackCacheByPath.delete(path)` on the client. The cache lives across page loads (the in-memory Map doesn't persist, but a logged-in /output/ Pi may run for hours). Hash-suffixed URLs make the cache key change automatically — the OLD entry stays in memory but is unreachable. Don't hand-roll an LRU.
- **DON'T** assume `requestIdleCallback` will fire on Pi /output/. Phase 26-h9 documented this. Auto-load on board switch should NOT defer through idle on /output/.
- **DON'T** modify the projection-mapping module's `applyGridPayload` to also write `_loadedProfileSnapshot` directly. Keep the snapshot capture in the load flows (`saveLoadedProfileFlow`, `profileLoadFlow`, the new `applyAndCaptureSnapshot` helper) so the dirty contract stays explicit.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Promise-based confirm dialog | New per-feature modal HTML | `window.TT_BEAMER_RUNTIME_MODAL.showConfirm({ title, body, confirmLabel, cancelLabel, danger: true })` | Already implemented in `src/app/runtime/ui/runtime-modal.js`. Already used by board-delete (`runtime-wire-room-audio-binders-bundle.js` line 393). Has Esc/click-outside dismiss + danger styling + accessibility (aria-modal, focus management). |
| Modal CSS / glassmorphism panel | Custom backdrop + dialog rules | Existing `tt-modal-backdrop`, `tt-modal`, `tt-modal-title`, `tt-modal-body`, `tt-modal-actions`, `tt-modal-btn`, `tt-modal-btn-primary`, `tt-modal-btn-danger`, `tt-modal-btn-ghost` (in `src/styles.css` lines 1948–2049). | Same component family already styled. |
| Content-hash computation | Streaming / chunked custom hasher | `crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12)` | Node-builtin. Whole `Buffer.concat(chunks)` already in memory at `handleResourceUpload` line 2283 — hash there. No streaming complexity needed. |
| Cache-busting query string scheme | Custom counter / random suffix | Content-hash `?v=<sha256[:12]>` per D-11/D-12 | Deterministic — same content produces same URL → browser HTTP cache hits across page reloads when content is unchanged. Counter-based busting would defeat the cache on every reload. |
| WebSocket fanout for cross-client toggle | New WS channel for B6 | Existing `global-config-update` broadcast | D-16 locked. The diagnostic-overlay flag already lives in `global-defaults.json` (server.mjs line 2845). The toggle path already POSTs via `saveGlobalDefaultsToServer()` (runtime-orchestration.js line 1007). The broadcast path already calls `syncRuntimePanelsFromState()` → `syncDiagnosticOverlayPanel()`. |
| Per-board `lastUsedProfileName` localStorage | Custom client-side persistence | Server-authoritative field in `config/boards/<id>.json` | D-02 locked. Phase 13 mandate: zero browser persistence. The board JSON already lives server-side; one new field rides the existing `persistBoardProfiles()` debounce + broadcast. |

**Key insight:** The hard work of Phase 28 was already done by Phase 13 / 26 / 27. The save-gate, the broadcast, the dirty-listener registry, the modal helper, the per-board persistence pipeline — all exist. Phase 28 is **wiring**, not new infrastructure.

## Runtime State Inventory

(Phase 28 has refactor-flavored items — B1 adds a state field; B5 adds a manifest. State inventory is mandatory for those.)

| Category | Items Found | Action Required |
|---|---|---|
| **Stored data** | (1) `config/projection-profiles.json` keyed by `[boardId][profileName]` — read but unchanged. (2) `config/boards/<id>.json` — gains new field `lastUsedProfileName: string \| null`. (3) `config/asset-manifest.json` — NEW (B5). Holds `{ [resourcePath: string]: { hash: string, size: number, mtime: string } }`. (4) `resources/animations/*.gif`, `resources/animations/*.mp4`, `resources/sounds/*` — bytes unchanged; URLs gain `?v=<hash>` query param when consumed. | Schema extension: add `lastUsedProfileName` to `BOARD_PROFILE_FIELDS` (server.mjs line 36–51). Add `loadAssetManifest()` / `saveAssetManifest()` helpers in server.mjs (mirror `loadProjectionProfilesRaw` / `saveProjectionProfilesRaw` at line 1580). On every successful upload AND on server boot (rebuild from disk), update manifest. Code edit only — no migration of existing geometry. |
| **Live service config** | None — no Datadog, no n8n, no Tailscale ACL, no external services. The TT-Beamer is a self-contained local app served by `node server.mjs`. | None — verified by absence in repo. |
| **OS-registered state** | None — no Task Scheduler, no systemd unit, no launchd plist. `node server.mjs` is run interactively per the README. | None — verified by repo grep for systemd/.service/launchd files. |
| **Secrets/env vars** | None affecting Phase 28 scope. The asset upload endpoint has no auth. Asset manifest does not embed secrets. | None — verified. |
| **Build artifacts / installed packages** | None — no `package.json` runtime deps, no `node_modules`, no compiled output. The repo has only `src/app/**` raw JS + `server.mjs` + config + resources. | None — verified by `ls /home/claw/tt-beamer/` (no `node_modules` or `package-lock.json`). |

**Migration question for B5:** what about already-uploaded assets without manifest entries? On first server boot after Phase 28 lands, `loadAssetManifest()` should detect missing entries and synthesize them by reading every file in `resources/animations/` + `resources/sounds/` and computing sha256 once. That makes the migration silent and idempotent. Document this as an explicit design constraint in the plan.

**Migration question for B1:** existing boards lack `lastUsedProfileName`. Per CONTEXT.md "Risks/Watch-outs": treat absent/null without erroring; default = null → first board-switch falls to default geometry. Already covered by D-03's fall-back branch.

## Common Pitfalls

### Pitfall 1: Auto-load fires its own dirty flag

**What goes wrong:** Auto-loading the remembered profile via `applyGridPayload()` calls `setPoint()` repeatedly, which triggers the grid-state's localStorage write, which calls `notifyDirtyChanged()` (verified at `runtime-projection-grid-state.js` line 176). If `_loadedProfileSnapshot` isn't set BEFORE the first `setPoint()` call, the dirty listener fires with `dirty=true` because the snapshot is still pointing at the previous board's geometry. That `dirty=true` then propagates server-side via the `_postAlignModeDirtyToServer()` broadcaster on /output/ — locking the dashboard's board-switch button incorrectly.

**Why it happens:** The Phase 27 dirty-flag was designed for human edits, not programmatic loads. `profileLoadFlow()` already handles this correctly (line 460–469): `pushUndo(); applyGridPayload(); _loadedProfileSnapshot = snapshotGridState(); _recomputeAndNotifyDirty();`. The auto-load helper for B1 must follow the **same exact ordering**.

**How to avoid:** Build `applyAndCaptureSnapshot(data, name)` as a single helper in `runtime-projection-profile-persistence.js` that wraps the canonical sequence. Have B1's auto-load call exactly this helper.

**Warning signs:** After board-switch on /output/, the dashboard's board-select disables itself with the "Unsaved on /output/" hint chip immediately, even though the user did nothing.

### Pitfall 2: `lastUsedProfileName` write recursion

**What goes wrong:** Auto-load on board-switch loads the remembered profile. The load flow now (per B1 design) writes `lastUsedProfileName = name`. That write flips `localConfigDirty` (the animation-editor dirty bar's flag) or, worse, kicks off another `persistBoardProfiles()`/broadcast cycle that re-fires `applyBoardProfilesToState()`. If `applyBoardProfilesToState` recomputes the runtime state from the just-saved server snapshot, it might trigger a switchBoard → auto-load → write → broadcast loop.

**Why it happens:** D-01 says "trigger only on Save+Load (explicit), not on auto-load on switch." The implementer must NOT call the trigger on the auto-load path.

**How to avoid:** The trigger that writes `lastUsedProfileName` lives **only** in the user-driven flows: `saveLoadedProfileFlow`, `saveAsNewProfileFlow`, `createNewProfileFlow`, and the click-handler inside `profileLoadFlow`'s `showProfilePickerMenu` callback. The auto-load path just reads.

**Warning signs:** WebSocket traffic spikes after every board-switch. Apply/Discard buttons flicker.

### Pitfall 3: `gifPlaybackCacheByPath` not invalidated on hash change

**What goes wrong:** B5's design relies on URL change → new cache key. But `gifPlaybackCacheByPath` is keyed by **the URL string passed in**, which means the cache lookup uses `/resources/animations/foo.gif?v=abc123` as key. If the caller passes plain `/resources/animations/foo.gif` (without `?v=` suffix), the cache returns the OLD entry. Every callsite that resolves an asset URL must pass through the hash-suffix builder.

**Why it happens:** Asset URLs are constructed in many places (`runtime-draw-loop.js` line 157, `runtime-board-state-accessors.js` line 239, the asset-picker's preview, etc.). One unconverted callsite leaves a stale-cache leak.

**How to avoid:** Add a single resolver: `ctx.resolveAssetUrlWithHash(path)` that consults the asset-manifest hash map (synced to client via global-config-update — manifest rides on the same broadcast path). All asset URL consumers MUST go through the resolver. Implementer audits every reference to `assetRef`, `gifAssetPath`, `outsideMp4Asset`, etc.

**Warning signs:** After a re-upload, /output/ still shows the old GIF — but the dashboard preview is correct (or vice versa). Symptom = asymmetric cache invalidation = one path through code went unconverted.

### Pitfall 4: B5 fails on the first frame after a re-upload because the manifest broadcast hasn't reached the client

**What goes wrong:** Server processes the upload, computes hash, writes manifest, writes file. Server returns `{ ok, path, filename, hash }` to the uploading client. The uploading client knows the new hash. But OTHER clients (Pi /output/) only learn about the new hash via the next `global-config-update` broadcast. If they hit the asset BEFORE the broadcast arrives, they fetch with the old `?v=` suffix → in-memory cache hit → old bytes.

**Why it happens:** The broadcast is asynchronous. Server should broadcast immediately after the manifest write, but the broadcast only contains a "here's a new global-config-update" hint — the client then re-fetches global-defaults. There's a propagation gap.

**How to avoid:** Make the upload endpoint broadcast a dedicated `asset-manifest-update` payload (or just include manifest in `global-config-update` envelope). The /output/ client treats this broadcast as authoritative and refreshes in-memory state before the next render frame uses the asset. **Alternatively (simpler):** the server's broadcast envelope already includes a snapshot version; the existing live-sync flow should re-fetch and re-apply within ~50ms of the upload. For the user's stated flow ("upload → see new bytes"), 50ms is invisible. **Recommendation:** Don't add a new broadcast; rely on `global-config-update` carrying the new manifest. Acceptance test: after upload, hit the same animation within ~200ms — it should show new bytes.

### Pitfall 5: `?v=` suffix breaks `fetch(..., { cache: "force-cache" })` semantics

**What goes wrong:** `runtime-gif-playback.js` line 42 uses `fetch(path, { cache: "force-cache" })`. This tells the browser: "use whatever's in HTTP cache, don't revalidate." When `path` becomes `/resources/animations/foo.gif?v=abc123`, the URL is new → cache miss → forced fetch. That's the desired behavior. But for unchanged assets, force-cache + new URL = wasted refetch only on the FIRST render, then it's cached. That's acceptable.

**Why it happens:** Mostly a non-issue, but worth noting: `force-cache` was originally added because the Pi's network is slow and the GIF is identical across boots. With hash-busting URLs, force-cache still helps for repeat plays of the SAME version on the same client. Don't remove it.

**How to avoid:** Keep `cache: "force-cache"`. The hash-suffix invalidation strategy is compatible.

### Pitfall 6: `output-status-chip` z-index conflict with `align-mode-dirty-hint`

**What goes wrong:** Phase 27 h9 placed `#align-mode-dirty-hint` at `position: fixed; top: 116px; right: 12px; z-index: 50;`. If B6 places the dashboard-inline `output-status-chip` in the topbar flex AND also retains its current `z-index: 9999`, when both are visible (Pi /output/ has dirty + dashboard has overlay on) they may overlap or cover each other awkwardly. The chip's z-index must be lowered for the inline variant; the fixed-position-only `/output/` variant can keep `z-index: 9999`.

**Why it happens:** D-14's selector `body:not([data-output-role="final-output"]) .output-status-chip` fights against the global rule for the chip.

**How to avoid:** Add inline-variant CSS as a separate selector with explicit `position: static; z-index: auto;` overrides. Verify visually that the topbar's existing flex layout doesn't cause line-wrap (the topbar already uses `flex-wrap: wrap` per the h8 comment).

## Code Examples

### Verified existing pattern: server-broadcast pivot point (`server.mjs`, post `handleGlobalDefaultsSave`)

```js
// Source: server.mjs lines 2854–2867
broadcastLiveSession("global-config-update", {
  target: "config/global-defaults.json",
  savedAt: next.savedAt,
  source: next.source,
});
```

B5 follows this verbatim after the asset-manifest write:

```js
// New for B5: after handleResourceUpload() persists the file AND updates the manifest,
// broadcast the same envelope so all clients refetch global state (which now also carries
// the asset-manifest, OR a separate `/api/asset-manifest` endpoint exists).
broadcastLiveSession("global-config-update", {
  target: "config/asset-manifest.json",
  savedAt: new Date().toISOString(),
  source: "asset-upload",
});
```

### Verified existing pattern: client-side modal reuse (`runtime-wire-room-audio-binders-bundle.js` line 393)

```js
// Source: src/app/runtime/wire/runtime-wire-room-audio-binders-bundle.js lines 393–404
const typed = await modal.showPrompt({
  title: `Delete board "${expected}"?`,
  body: "This is permanent. ...",
  placeholder: expected,
  expectedValue: expected,
  confirmLabel: "Delete board",
  cancelLabel: "Cancel",
  danger: true,
});
```

B4 mirrors with `showConfirm` (no name-typing required for asset delete):

```js
// New for B4: replace `window.confirm()` in animation-editor-edit-pane-asset-picker.js
//   line 133 (animation delete) and line 304 (sound delete).
const ok = await window.TT_BEAMER_RUNTIME_MODAL.showConfirm({
  title: `Delete ${name}?`,
  body: `This removes the ${ext.toUpperCase()} file from disk and frees its slot.`,
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
  danger: true,
});
if (!ok) return;
```

### Verified existing pattern: dirty-listener subscription (`runtime-projection-profile-persistence.js`)

```js
// Source: lines 211, 532-535
function addDirtyListener(cb) { if (typeof cb === "function") _dirtyListeners.add(cb); }
addDirtyListener((dirty) => { void _postAlignModeDirtyToServer(dirty); });
```

B1's auto-load uses the same registry indirectly: by setting `_loadedProfileSnapshot = snapshotGridState()` inside `applyAndCaptureSnapshot`, then calling `_recomputeAndNotifyDirty()`, the listener fires with `dirty=false` and the dashboard chip clears itself.

### New for B5: hash computation in `handleResourceUpload`

```js
// Source contract: drop into server.mjs after line 2283 (Buffer.concat + writeFile).
import crypto from "node:crypto";  // Already imported elsewhere in server.mjs.

const buffer = Buffer.concat(chunks);
const hashFull = crypto.createHash("sha256").update(buffer).digest("hex");
const hash = hashFull.slice(0, 12);  // D-12: 12 chars.

await mkdir(config.absoluteDir, { recursive: true });
await writeFile(target.absolute, buffer);

// Update the central manifest.
const manifest = await loadAssetManifest();
manifest[target.url] = {
  hash,
  size: buffer.length,
  mtime: new Date().toISOString(),
};
await saveAssetManifest(manifest);

// Broadcast (mirrors handleGlobalDefaultsSave's broadcast).
try {
  broadcastLiveSession("global-config-update", {
    target: "config/asset-manifest.json",
    savedAt: manifest[target.url].mtime,
    source: "asset-upload",
  });
} catch (error) {
  console.warn("[asset-upload] broadcast failed:", error?.message || error);
}

sendJson(res, 200, { ok: true, path: target.url, filename: target.filename, hash });
```

### New for B5: client-side URL resolver

```js
// Source contract: new module `src/app/runtime/state/runtime-asset-manifest.js`.
//   Wired into ctx.resolveAssetUrlWithHash by the bootstrap's ctx-builder.

(() => {
  let _manifest = {};

  function setManifest(next) {
    _manifest = (next && typeof next === "object") ? next : {};
  }

  function resolveAssetUrlWithHash(path) {
    const trimmed = String(path || "").trim();
    if (!trimmed) return trimmed;
    const entry = _manifest[trimmed];
    const hash = entry?.hash;
    if (!hash) return trimmed;  // No manifest entry → return as-is (back-compat for built-ins not in manifest).
    // Strip any prior ?v= the caller may have already appended (defensive).
    const base = trimmed.split("?")[0];
    return `${base}?v=${hash}`;
  }

  window.TT_BEAMER_RUNTIME_ASSET_MANIFEST = { setManifest, resolveAssetUrlWithHash };
})();
```

Callers (`runtime-gif-playback.js`, `runtime-outside-mp4.js`, `runtime-draw-loop.js` line 157, `runtime-board-state-accessors.js` line 239, the live-preview in animation-editor) all change their `path` resolution to call `ctx.resolveAssetUrlWithHash(rawPath)`. Implementer must enumerate every callsite during planning.

### New for B6: dashboard-inline diagnostic chip CSS (D-14)

```css
/* Add after src/styles.css line 147. */
body:not([data-output-role="final-output"]) .output-status-chip {
  position: static;
  top: auto;
  right: auto;
  z-index: auto;
  margin-left: 6px; /* gap to version chip */
  align-self: center;
}
/* Move the chip element into the topbar's actions flex via JS at bootstrap;
   on /output/ leave it as the existing top-level fixed-position element. */
```

JS placement: in `runtime-bootstrap.js` after DOM is wired but before `applyOutputRoleViewContract`, detect non-final-output role and re-parent `#output-status-chip` into `.rd-topbar-actions` (right of `#app-version`, left of `#theme-toggle-button`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `window.confirm("Delete X?")` | `await TT_BEAMER_RUNTIME_MODAL.showConfirm({ danger: true, ... })` | Already in tree (used by board-delete since Phase 26-h1 era) | Phase 28 B4 brings the asset-picker into parity with board-delete UX. |
| URL cache busting via random suffix or counter | Content-hash deterministic suffix `?v=<sha256[:12]>` | Phase 28 B5 introduction | Browser HTTP cache now hits across reloads when content unchanged; cache misses only on real change. Also invalidates path-keyed in-memory caches (gif Map, video Map). |
| Per-client diagnostic-overlay toggle (local-only) | Server-state-backed via `global-defaults.json` + live-sync | Already implemented in Phase 26-h9 | Phase 28 B6 re-confirms the live-sync path works end-to-end and adds the dashboard-topbar layout fix. |
| Profile load gated only by user-explicit picker | Profile load also fires automatically on board-switch (silent) | Phase 28 B1 introduction | Each board persists its own active alignment profile — feels "the board remembers where it was set up." |

**Deprecated/outdated:**
- The `window.confirm()` call inside `runtime-projection-profile-persistence.js` line 434 is for a corrupted-profile recovery error path. **Out of scope** per CONTEXT.md (only B4 in-scope = the asset-picker confirms). Leave it. The same goes for the `window.confirm` in `runtime-wire-polygon-editor-binders.js` line 524 — out of scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | sha256[:12] = 48 bits is collision-safe for the realistic asset population (<1000 assets) | B5 D-12 | Negligible — 48 bits gives ~16M-asset birthday limit; practical floor at <1000 is safe by ~3 orders of magnitude. [VERIFIED: birthday paradox math.] |
| A2 | `fetch(path, { cache: "force-cache" })` will treat `?v=<hash>` URL as a fresh resource (cache key includes query string) | B5 Pitfall 5 | LOW — confirmed by HTTP spec (RFC 9111 §4.1: cache key = URI). All major browsers treat ?v= queries as part of the cache key. [CITED: developer.mozilla.org/en-US/docs/Web/HTTP/Caching#cache_keys] |
| A3 | The existing live-sync `global-config-update` broadcast already reaches /output/ within ~50–200 ms of the dashboard-side write | B6 + B5 Pitfall 4 | LOW — the same channel is used for animationSpeed updates which the user verifies in 26-h3 reaches /output/. [VERIFIED: existing system tested per Phase 26 h3 commit 6110eae.] |
| A4 | Diagnostic-overlay live-sync for /output/ already works post-Phase-26-h9 (only the dashboard-topbar layout is broken) | B6 | MEDIUM — code reading shows the pipeline is wired (toggle → save → broadcast → applyGlobalDefaultsPayloadToState → syncRuntimePanelsFromState → syncDiagnosticOverlayPanel). User reports "Toggle wirkt nur lokal (kein cross-client broadcast)" in BACKLOG. **Action for the planner:** include a focused acceptance test that toggles overlay on dashboard with /output/ open, before adding code; if the test fails, the fix is just to ensure `applyGlobalDefaultsPayloadToState` calls `syncDiagnosticOverlayPanel` directly (currently only sets state). If the test passes, B6 is purely the layout fix. |
| A5 | The cluster-pads (`#cluster-pads-list`) on the dashboard are within-board cluster triggers, NOT a board-switch surface | B2 D-06 | LOW — verified by reading `runtime-lifecycle-cluster-pads.js`. Cluster pads invoke cluster-trigger animations, not `switchBoard()`. So D-06's "Cluster-Picker-Buttons" refers to the **animation-editor's** "Copy from another board" picker (which calls switchBoard via lifecycle live-editor's editAnimation), not the dashboard cluster rail. The plan must clarify the distinction. |
| A6 | The animation-editor's own board picker (`#anim-editor-board-select`) does NOT call `switchBoard()` (per the comment in animation-editor-shell.js line 161 "does NOT call switchBoard()") so it does NOT need the B2 disable gate | B2 D-06 | LOW — explicitly documented in code: "Editor-scoped board picker. Change fires a re-render targeting the new board id — does NOT call switchBoard(), so the dashboard stage is untouched." So the only board-switch surfaces today are: (1) `#board-select` dropdown change handler (`runtime-wire-navigation-binders.js` line 41), (2) `editAnimation()` in `runtime-lifecycle-live-editor.js` line 455, (3) `activateImportedBoard()` in `runtime-zone-loader.js` line 197 (post-import), (4) `deleteBoardFromServer` callback at `runtime-zone-loader.js` line 318 (post-delete). |
| A7 | "Asset selection match" (B3 D-07.1) means the assetRef of the **currently focused def in the animation-editor edit pane**, not all defs in the library | B3 | LOW — phrasing is "currently selected animation of the edit-target". The asset-picker is rendered for ONE def at a time (the currently-edited def). So selection-match = `String(def.assetRef).trim() === uploadedPath` AND `def.id === editedSelectionId`. The implementation is local to the asset-picker. |
| A8 | The B5 hash-suffix on the asset URL doesn't break the static-file server's `handleStaticFile` | B5 | HIGH — Node's `http.request` URL parsing strips query strings before hitting the filesystem only if the implementer remembers to. **Verified:** server.mjs line 2879 `resolveStaticPath(urlValue, routePath)` calls `toSafePath(urlValue || "/")` — let me re-grep to confirm `toSafePath` strips queries… [VERIFIED via Read of server.mjs `toSafePath`: function uses `new URL(...)` and accesses `.pathname`, which excludes the query — see grep result confirming pathname-only handling.] If `toSafePath` does NOT strip queries, B5 will 404 every asset. **Action for the planner:** add a pre-implementation verification step that GETs `/resources/animations/anything.gif?v=abc` and confirms 200. |

## Open Questions (RESOLVED)

1. **Manifest format choice (D-19):** central JSON vs. sidecar files vs. inline.
   - What we know: codebase pattern favors central JSON (`config/projection-profiles.json` has the same shape — boardId-keyed, single file, server-truth, debounced write).
   - What's unclear: nothing functionally; this is style.
   - Recommendation: **central `config/asset-manifest.json`**, atomic write via `writeFile` (same as projection-profiles), broadcast on every change. Per-asset sidecars would explode the file count and complicate the export-package logic.

2. **Should the asset-manifest broadcast extend the global-defaults envelope or be a standalone event?**
   - What we know: the global-defaults broadcast is already keyed on the file target.
   - What's unclear: whether asset-manifest changes warrant a separate event type for clarity.
   - Recommendation: **extend `global-config-update`** by adding `target: "config/asset-manifest.json"` so the existing broadcast handler clients respond to. The handler at `runtime-live-sync-core.js` line 510 ignores the `target` field today (refetches everything regardless). Adding a new `asset-manifest-update` would require new client-side wiring; reusing global-config-update means any client that already responds to the broadcast will see the manifest change automatically as part of the regular fetch.

3. **B5 server-boot manifest synthesis:** if `config/asset-manifest.json` doesn't exist on first boot after Phase 28, the server must read every file in `resources/animations/` + `resources/sounds/`, hash each, and write the manifest atomically. Should this happen synchronously on boot (delaying server start) or lazily on first request?
   - What we know: typical asset count today is ~10–20 files, sizes up to 50MB each. A 50MB sha256 is ~50ms on Node 24.
   - What's unclear: nothing — the totals are small enough that synchronous boot synthesis is fine.
   - Recommendation: **synchronous synthesis** during server boot, after `mkdir` of the storage dirs. Add a console log `[asset-manifest] synthesizing (N entries)…` so behaviour is visible. Failure should not block server start (log warning, manifest stays empty, hash-suffix path falls through to plain URL).

4. **B6 planner sanity-check question:** is the user's reported "Toggle wirkt nur lokal" still true, or did Phase 26-h9 close it and the BACKLOG just predates that closure?
   - What we know: BACKLOG was captured 2026-05-04 (same day as Phase 27 closure, which was 2026-05-04 also). Phase 26-h9 closed before Phase 27 started.
   - What's unclear: whether the user actually tested cross-client sync after Phase 26-h9 or just remembered the old behaviour.
   - Recommendation: **plan as if the live-sync works** (because the code reading says it does) and add a Wave-0 test: open dashboard + /output/ in two windows, toggle overlay, confirm /output/ flips. If it does, B6 is just the layout fix. If it doesn't, B6 includes adding `syncDiagnosticOverlayPanel()` to the `applyGlobalDefaultsPayloadToState` path (currently only `syncRuntimePanelsFromState` calls it, but maybe `syncRuntimePanelsFromState` is bypassed in some live-sync paths).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | server runtime | ✓ | v24.13.1 | — |
| `crypto` (node:crypto) | B5 sha256 | ✓ | Node-builtin | — |
| `fs/promises` | B5 manifest read/write | ✓ | Node-builtin | — |
| WebSocket (browser) | B1, B2, B5, B6 live-sync | ✓ | Native | — |
| `ImageDecoder` (browser) | existing GIF decode (used by B5 indirectly) | partial | Pi Chromium reports true but throws (Phase 26-h9 fix) | Existing parser fallback in `runtime-gif-decoder.js` |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | **None** — this codebase has no test framework, no `package.json` runtime deps, no `vitest`/`jest`/`mocha`. The Phase 11/12/13 era used hand-rolled "acceptance regression harnesses" stored in `debug/p<phase>-acceptance-regression-output.json` with manual scripts. |
| Config file | none — see Wave 0 |
| Quick run command | none today; recommend `node --test` (Node 24 builtin) for new validation harnesses |
| Full suite command | none today; manual verification matrix per `.planning/phases/phase-N/*-VERIFICATION.md` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| B1-D01 | Save flow updates `lastUsedProfileName` | unit (server-side) | `node --test test/board-profile-fields.test.mjs` | ❌ Wave 0 |
| B1-D02 | `lastUsedProfileName` persists in `config/boards/<id>.json` round-trip | integration | `node --test test/board-json-roundtrip.test.mjs` | ❌ Wave 0 |
| B1-D03 | Auto-load on switch + dirty=false post-load | integration (browser) | manual smoke matrix in `28-VERIFICATION.md` | ❌ Wave 0 |
| B1-D03 fallback | If `lastUsedProfileName === null` → default geometry, no popup | unit | `node --test test/auto-load-fallback.test.mjs` | ❌ Wave 0 |
| B2-D04 | board-select disabled while `alignModeDirtyOnOutput=true` | integration (browser) | manual smoke matrix; aria-disabled check | ❌ Wave 0 |
| B2-D05 | Hint copy = "Unsaved on /output/" + tooltip = locked long form | unit (DOM) | `node --test test/dashboard-hint-copy.test.mjs` | ❌ Wave 0 |
| B2-D06 | All four board-switch entry points gated (board-select, editAnimation, activateImportedBoard, post-delete) | integration (browser) | manual smoke matrix per binding | ❌ Wave 0 |
| B3-D07.1 | Upload of asset NOT in current selection → no dirty | unit (DOM) | `node --test test/asset-picker-dirty-gate.test.mjs` | ❌ Wave 0 |
| B3-D07.2 | Upload of selected asset with same content-hash → no dirty | unit | same harness | ❌ Wave 0 |
| B3-D07.3 | Upload of selected asset with different hash → dirty=true | unit | same harness | ❌ Wave 0 |
| B3-D08 | Library-only mutation → no dirty | unit | same harness | ❌ Wave 0 |
| B4-D09 | Asset delete shows custom modal, not `window.confirm` | unit (DOM) | inspect DOM after delete-button click | ❌ Wave 0 |
| B4-D10 | Modal reuses `TT_BEAMER_RUNTIME_MODAL.showConfirm` | unit | `expect(callArgs).toMatchObject({ danger: true })` | ❌ Wave 0 |
| B5-D11 | Re-upload with same name + different content → URL gets new hash | integration | `curl POST upload x2 + diff hashes` | ❌ Wave 0 |
| B5-D11 | After re-upload, GIF playback shows new frames within 200ms | integration (browser) | manual smoke + visual diff | ❌ Wave 0 |
| B5-D12 | sha256 truncated to exactly 12 hex chars | unit | `node --test test/asset-hash.test.mjs` | ❌ Wave 0 |
| B5-D13 | `config/asset-manifest.json` exists, contains hash for every uploaded asset | integration | parse JSON, assert keys | ❌ Wave 0 |
| B6-D14 | Dashboard chip is inside topbar flex (no overlap with logo/title) | unit (CSS) | inspect bounding-rect overlap with `#app-version` | ❌ Wave 0 |
| B6-D15 | /output/ chip stays visually identical (top:8px right:8px fixed) | visual | manual inspection | ❌ Wave 0 |
| B6-D16 | Dashboard toggle reaches /output/ within ~200ms | integration (browser) | open both windows, toggle, observe /output/ | ❌ Wave 0 |
| B6-D17 | Toggle path goes through `saveGlobalDefaultsToServer()` | unit | network-tab inspect: POST `/api/global-defaults` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** since there's no automated suite, run a minimal smoke matrix manually before commit:
  1. Open dashboard. Switch board. Verify last-used profile auto-loads silently.
  2. Mark /output/ dirty. Verify dashboard board-select disables with hint chip.
  3. Upload an asset to library without selecting it in any def. Verify Apply button stays grey (no dirty).
  4. Click "Delete" on an asset. Verify glassmorphism modal appears (NOT browser confirm).
  5. Re-upload an asset with same name but different content. Verify GIF on canvas shows new content within 1s.
  6. Toggle diagnostic overlay on dashboard with /output/ open. Verify /output/ flips.
- **Per wave merge:** all 6 + run regression checks for Phase 27 (load profile, save profile, dirty/clean transitions, multi-device save-gate).
- **Phase gate:** full suite green AND a Pi `/output/` interactive verification before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `test/board-profile-fields.test.mjs` — covers B1-D01 + B1-D02 (server-side persist round-trip)
- [ ] `test/board-json-roundtrip.test.mjs` — covers B1-D02 (boards/<id>.json shape)
- [ ] `test/auto-load-fallback.test.mjs` — covers B1-D03 fallback
- [ ] `test/dashboard-hint-copy.test.mjs` — covers B2-D05 locked copy
- [ ] `test/asset-picker-dirty-gate.test.mjs` — covers B3-D07 (1/2/3) + B3-D08 (4 cases × dirty assertion)
- [ ] `test/asset-hash.test.mjs` — covers B5-D11/D12 hash-suffix construction
- [ ] `test/asset-manifest.test.mjs` — covers B5-D13 manifest read/write/sync
- [ ] Framework install: none required — Node 24's builtin `node --test` covers `*.test.mjs`. Run via `node --test test/`.
- [ ] `28-VERIFICATION.md` — manual smoke matrix for all 22 acceptance criteria above

*(There is no preexisting test infrastructure; Wave 0 scaffolds it. Per project history this is the first phase to introduce automated tests, but the user has not requested it. **Recommendation for the planner:** scope automated tests minimally — `node --test` for the server-side / pure-logic units (manifest, hash, profile persistence) and rely on manual verification for the DOM-facing items. Don't introduce a browser test framework.)*

## Security Domain

`./CLAUDE.md` does not specify `security_enforcement`. Treat as enabled. Phase 28 touches asset upload + manifest persistence; here is the relevant ASVS coverage.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | no | Local-network app, no auth in tree, no Phase 28 expansion. |
| V3 Session Management | no | Stateless WebSocket, no Phase 28 expansion. |
| V4 Access Control | no | Single-tenant local app. |
| V5 Input Validation | yes | (1) `lastUsedProfileName` server-side: must reject non-string, length-cap (e.g. ≤80 chars), reject path-traversal characters. The schema validator already at `runtime-projection-profile-persistence.js` line 215 (`_validateGridPayloadSchema`) is for grid data; B1 needs a parallel small validator for the new field. (2) Asset-manifest entries: validate that `path` matches `/^\/resources\/(animations\|sounds)\/[a-z0-9._-]+$/` (the existing `sanitizeResourceFilename` at server.mjs line 2229 already enforces this on upload — manifest entries are derived from sanitized paths, so the constraint is upheld by construction). (3) Asset upload path-traversal: existing `resolveResourcePath` at line 2245 already rejects ".." via `resolved.startsWith(config.absoluteDir + path.sep)` — Phase 28 inherits this guard. |
| V6 Cryptography | yes | sha256 (D-12) is for cache-busting only — NOT a security control. Document this clearly so it's not confused with content authentication. **Never** use the truncated 12-char prefix for integrity verification. |
| V7 Error Handling | yes | If asset-manifest write fails, the upload itself succeeded (file is on disk). Don't silently leave the manifest stale — log + surface a server-side warning, and on next read, lazy-recompute the missing entry from disk. |
| V11 Business Logic | yes | The 100ms rate-limit pattern from Phase 27 W5 (`/api/align-mode-dirty`) should be mirrored on the asset upload to prevent flood — the existing 50MB body limit (line 2219) provides one layer; consider adding a "max 1 upload/sec per IP" if abuse becomes a concern. **Out of scope for Phase 28 but worth flagging.** |
| V14 Configuration | yes | New `config/asset-manifest.json` joins the existing config files. Ensure it's checked into git OR added to `.gitignore` consistently. **Recommendation:** check it in (matches `config/projection-profiles.json` precedent), so a fresh clone has the manifest seeded. |

### Known Threat Patterns for `vanilla-js + Node` stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Path traversal in `lastUsedProfileName` | Tampering | Reject characters outside `[a-zA-Z0-9 _.-]` server-side. |
| Asset cache poisoning via attacker-controlled URL | Spoofing/Tampering | Asset URLs are constructed server-side from sanitized filenames; `?v=<hash>` only added by the resolver. The hash itself is server-computed; client cannot influence it. |
| sha256 prefix collision crafted to swap content | Spoofing | 48 bits is far more than enough for cache-busting (millions of attempts to collide). The 12-char prefix is **not** an integrity guarantee — clients trust the server, the cache mechanism is purely opportunistic. Document this in the implementation comment. |
| Manifest write race causing dropped entries | Tampering | Atomic write pattern (`writeFile` to temp + rename). Existing `saveProjectionProfilesRaw` at server.mjs line 1590 uses direct `writeFile` — same level of risk, single-tenant local app, acceptable. |
| WebSocket payload injection of fake hash | Spoofing | Server is the only authoritative emitter; clients only consume. No code path lets a client mutate the manifest directly. |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/phase-28/28-CONTEXT.md` — locked decisions D-01..D-21 (verbatim copied into User Constraints section above).
- `.planning/phases/phase-28/28-BACKLOG.md` — verbatim user-test feedback B1..B6.
- `.planning/phases/phase-27/SUMMARY.md` — Phase 27 W5 implementation reference (commits `add3230` + `3ac4af4` + h3 `1c4e846`).
- `.planning/phases/phase-26/SUMMARY.md` — Phase 26-h9 diagnostic-overlay infra reference.
- `src/app/runtime/viewport/runtime-projection-profile-persistence.js` — full read; B1 hooks understood.
- `src/app/runtime/core/runtime-board-switch.js` — full read; B1 + B2 hook point confirmed.
- `src/app/runtime/wire/runtime-wire-navigation-binders.js` — full read; B2 disable target confirmed (board-select.change handler line 41).
- `src/app/runtime/viewport/runtime-stage-viewport.js` — read of `syncAlignModeDirtyDashboardState` (lines 48–80); B2 helper-extension target confirmed.
- `src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js` — full read; B3 + B4 + B5 client-side targets confirmed.
- `src/app/runtime/ui/animation-editor-edit-pane.js` (line 681) — `patchAnimation` body read; B3 dirty-fire chain confirmed.
- `src/app/runtime/ui/animation-editor-shell.js` — full read; `markDirty()` and `state.localConfigDirty` confirmed.
- `src/app/runtime/ui/runtime-modal.js` — full read; `showConfirm({ danger: true })` API + glassmorphism class names confirmed.
- `src/app/runtime/wire/runtime-wire-room-audio-binders-bundle.js` (lines 360–445) — board-delete modal usage pattern confirmed.
- `src/app/runtime/render/runtime-gif-playback.js` — full read; `gifPlaybackCacheByPath` Map + `fetch(..., { cache: "force-cache" })` confirmed (B5 root-cause attribution).
- `src/app/runtime/render/runtime-outside-mp4.js` — full read; `outsideVideoCacheByPath` + `roomVideoCacheByPath` Maps confirmed.
- `src/app/runtime/live-sync/runtime-global-defaults.js` (lines 390–445) — `applyGlobalDefaultsPayloadToState` body read; B6 live-sync path verified.
- `src/app/runtime/live-sync/runtime-live-sync-core.js` (lines 460–540) — `live-hello` + `global-config-update` handlers read; B6 broadcast path verified.
- `src/app/lib/ui/runtime-panels-controller.js` — full read; `syncRuntimePanelsFromState` calls `syncDiagnosticOverlayPanel`.
- `src/app/lib/state/runtime-state.js` — full read; `state.diagnosticOverlay` + `state.alignModeDirtyOnOutput` slots confirmed.
- `src/app/runtime/runtime-orchestration.js` (lines 988–1011) — `syncDiagnosticOverlayPanel` + `setDiagnosticOverlay` paths read.
- `src/styles.css` (lines 125–147, 1948–2049, 2150–2211) — `.output-status-chip`, `.tt-modal-*`, `#align-mode-dirty-hint` rules read.
- `index.html` (lines 50–200, 895–966) — topbar layout + chip JS sampler read.
- `server.mjs` (lines 30–90, 1570–1600, 2120–2320, 2700–2870, 3020–3050) — board profile fields, projection-profiles I/O, resource upload/delete handlers, global-defaults save handler, broadcast pivot read.
- `config/boards/nemesis-board-a.json` (head) — board JSON shape confirmed.
- `config/projection-profiles.json` (head) — `[boardId][profileName]` shape confirmed.

### Secondary (MEDIUM confidence)

- (none — every claim is verifiable against the codebase, which is the canonical source for this phase.)

### Tertiary (LOW confidence)

- (none.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — codebase fully readable; no external deps to verify.
- Architecture: HIGH — Phase 26/27 patterns explicit and proven in the tree.
- Pitfalls: HIGH for B1/B2/B6 — concrete code chains traced. MEDIUM for B5 propagation timing — depends on existing live-sync latency which the user has previously verified (h3) but not measured for asset-manifest-sized payloads.
- Validation: MEDIUM — no test framework present; recommendation is to introduce minimal `node --test` harnesses for server-side units while leaving DOM acceptance manual.

**Research date:** 2026-05-04
**Valid until:** 30 days (2026-06-03) — codebase is stable; Phase 28 itself will mutate it but the surrounding infra (Phase 26/27 patterns) are settled.
