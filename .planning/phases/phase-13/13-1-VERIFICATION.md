# Plan 13-1 Verification — Server-Authoritative Config

## Outcome
**PASS** — 13 hard gates closed.

## Problem Recap
All persistent config was stored in the browser via `localStorage`. Mutations on one device did not reach others. The user wanted a single global server-stored config, every mutation auto-synced to every connected client, export-to-file preserved, import-from-file added, and "Save to global"/"Load and apply" buttons removed. Server unreachable at startup = hard block with error + Retry.

## Changes

### Server (`server.mjs`)
- `handleGlobalDefaultsSave` now broadcasts a `global-config-update` message via `broadcastLiveSession` after the atomic file write. The broadcast carries the save target + timestamp + source so all connected clients know to refetch. Broadcast failures are isolated from the response path.

### Client runtime (`src/app/runtime/runtime-orchestration.js`)
- `persistBoardProfiles()` body replaced: no longer writes to `localStorage`. It calls `scheduleGlobalConfigWrite("board-profiles-mutated")`.
- `scheduleGlobalConfigWrite(reason)` helper added: 200ms-debounced `flushGlobalConfigWrite` that POSTs via `saveGlobalDefaultsToServer()`. Surfaces sync status on `globalDefaultsStatus`.
- `flushGlobalConfigWrite(reason)` catches and surfaces errors without breaking the runtime.
- `loadBoardProfiles()` body replaced: reads from `window.__TT_BEAMER_BOOTSTRAP_CONFIG__` (populated by blocking startup hydration) instead of `localStorage.getItem(BOARD_PROFILE_STORAGE_KEY)`.
- Legacy localStorage readers (`loadLegacyRoomGeometryByBoard`, `loadLegacySpecialPolygonsByBoard`, `loadHitareaCalibrationMap`) replaced with default-returning stubs. Their data now comes exclusively from the server-backed `boardProfiles` payload.
- `hasStoredBoardProfilesInLocalStorage()` hard-coded to return `false` (kept as ABI stub for legacy call sites).
- `buildGlobalDefaultsPayload()` no longer merges with a localStorage read; state is the sole source.
- `readConfiguredApiBase()` drops the `localStorage` fallback. Override now requires `window.__TT_BEAMER_API_BASE__` or a URL query param.
- Settings subtab memory (`persistSettingsSubtab`, `restoreSettingsSubtabPreference`) switches from `window.localStorage` to `window.sessionStorage` — ephemeral per browser tab.
- Startup hydration path (`bootstrap` block around line 13310) replaced with a blocking `fetchGlobalDefaultsPayload()` call. On failure, `renderServerUnreachableOverlay(error)` paints a full-screen error dialog with a Retry button.
- `renderServerUnreachableOverlay(error)` creates a new DOM overlay (`#tt-beamer-server-unreachable-overlay`) with title "Server nicht erreichbar", error detail, info text, and a Retry button that re-attempts `fetchGlobalDefaultsPayload()`.
- Live-sync WebSocket `onmessage` handler gains a `global-config-update` branch: on receipt, refetches `/api/global-defaults`, calls `applyGlobalDefaultsPayloadToState`, syncs panels, surfaces status. This is how mutations from other clients propagate in real time.
- Save-to-global and Load-and-apply button handlers removed entirely. Their constant declarations (`saveGlobalDefaultsButton`, `loadApplyGlobalDefaultsButton`) removed.
- Import button wired via new `wireImportGlobalDefaultsButton()` function: creates a hidden `<input type="file">`, reads the chosen JSON, POSTs it through `saveGlobalDefaults`. Server overwrites + broadcasts, every client refetches.
- `SETTINGS_EXCLUSIVE_CONTROL_IDS` updated to drop the removed button IDs and add `"import-global-defaults"`.

### Client API facade (`src/app/lib/api/global-defaults-api.js`)
- `createGlobalDefaultsApiFacade` no longer accepts a `localStorage` argument.
- `apiBaseStorageKey` argument removed (unused after localStorage fallback is gone).
- `readConfiguredApiBase()` returns `null` when no window global or URL query param is present (no localStorage fallback).

### Logger (`src/app/lib/shared/logger.js`)
- `resolveMinLevel()` moves log-level override from `localStorage.getItem("tt-beamer.log-level")` to `?logLevel=...` URL query parameter.

### DOM (`index.html`)
- `#save-global-defaults` button removed.
- `#load-apply-global-defaults` button removed.
- `#export-global-defaults` button label updated to "Export config (download JSON backup)".
- `#import-global-defaults` button added: "Import config (upload JSON, overwrites server)".

## Gate Matrix

| Gate | Verdict | Evidence |
|---|---|---|
| G13-1-1 NoLocalStorage-Static | PASS | Zero functional `localStorage` / `indexedDB` references in `src/app/**` or `src/live/**`. All 11 remaining `localStorage` mentions are single-line comments documenting the removal. |
| G13-1-2 Server-Write-Path-With-Broadcast | PASS | `POST /api/global-defaults` in `server.mjs` atomically writes then calls `broadcastLiveSession("global-config-update", ...)`. |
| G13-1-3 Debounced-Client-Write | PASS | `scheduleGlobalConfigWrite`, `GLOBAL_CONFIG_WRITE_DEBOUNCE_MS = 200`, `pendingGlobalConfigWriteTimerId`, and `persistBoardProfiles()` routing through the scheduler all present. |
| G13-1-4 Blocking-Startup-Error-Banner | PASS | `renderServerUnreachableOverlay` creates a full-screen error dialog with "Server nicht erreichbar" title, detail paragraph, and Retry button; `window.__TT_BEAMER_BOOTSTRAP_CONFIG__` is the server-fetched payload source. |
| G13-1-5 Save-Load-Buttons-Removed | PASS | `#save-global-defaults` and `#load-apply-global-defaults` no longer exist in `index.html`; their constants and handlers removed from runtime. |
| G13-1-6 Import-Button-Wired | PASS | `#import-global-defaults` present in `index.html`; `wireImportGlobalDefaultsButton()` creates file input, reads JSON, POSTs to server. |
| G13-1-7 Settings-Subtab-SessionStorage | PASS | Both persist and restore functions use `window.sessionStorage`; zero `localStorage` references for `SETTINGS_SUBTAB_STORAGE_KEY`. |
| G13-1-8 API-Base-URL-Param-Only | PASS | `readApiBaseFromQuery()` is used; zero `localStorage` references for `API_BASE_STORAGE_KEY`. |
| G13-1-9 Phase-11-HF6-NonRegression | PASS | `activeSeenOneShotRunByTriggerRevision`, `observeGlobalStopRevisions`, `observeGlobalClearRevision` all remain wired. |
| G13-1-10 Phase-12-AdditiveLayering-NonRegression | PASS | `roomConcurrencyByKey` Map build in `draw()`, `ctx.globalCompositeOperation = "lighter"` switch, and `state.runtimePerf.roomConcurrencyByKey` exposure all intact. |
| G13-1-extra Logger-URL-Param | PASS | `params.get("logLevel")` present in `logger.js`; no `localStorage` calls. |
| G13-1-extra Facade-No-LocalStorage-Arg | PASS | `createGlobalDefaultsApiFacade` no longer destructures `localStorage` argument; no `localStorage` calls anywhere in the facade body. |
| G13-1-extra Broadcast-Receive-Handler | PASS | WebSocket `onmessage` handles `payload?.type === "global-config-update"` with async refetch + apply + status surface. |

Aggregate: `debug/p13-1-acceptance-regression-output.json`.

## Non-Regression Notes
- 44 `persistBoardProfiles()` call sites scattered across the runtime are untouched — they now route through the new scheduler without code churn.
- `buildGlobalDefaultsPayload()` still produces the same schema (`tt-beamer.global-defaults.v1`); export/import round-trip uses the same code path.
- Live-sync fan-out for animation mutations (`live-session-update` with `live-ack` envelope) is unchanged.
- Phase 11 HF6 seen-once retention and Phase 12 additive layering guards remain in place.
- `startupDefaultsGuard` state is preserved and repurposed: `attempted=true`, `applied=true`, `outcome="applied"` on success, `outcome="failed-explicit"` on failure.

## Known Limitations (user verification required)
- In-browser verification is required before merging. Specifically:
  1. **Startup with server running**: app loads normally, status line says "Global config: synced" after any mutation.
  2. **Startup with server stopped**: full-screen "Server nicht erreichbar" overlay appears with a Retry button. Clicking Retry after starting the server recovers without a page reload.
  3. **Two-device sync**: mutating a setting on device A (e.g. dragging the animation speed slider) reflects on device B within ~200ms + network.
  4. **Export**: downloads a JSON file.
  5. **Import**: uploading a JSON file overwrites the server config and all connected clients refetch.
  6. **Settings subtab**: persists across reloads within the same browser tab; gone on tab close.

## Status
Plan 13-1 closed PASS (static guards). User browser verification requested before starting Plan 13-2.
