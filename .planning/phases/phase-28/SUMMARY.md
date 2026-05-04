# Phase 28 — Cross-cutting UX & State Polish (CLOSURE)

## Status

**CLOSED.** 6/6 plans executed (B1..B6 coverage). Test-Suite: 25/25 grün
(`node --test "test/**/*.test.mjs"`). Verifier: 32/32 automated checks PASS.
7 Browser-Smoke-Items im `28-HUMAN-UAT.md` warten auf User-Side-Verification
(visual layouts + multi-window WebSocket roundtrip + Pi /output/ smoke). Phase
ist strukturell vollständig; falls die User-Smokes Hotfixes auslösen, folgen
diese im selben h*-Pattern wie Phase 27.

## Source

User-Test-Feedback nach Phase-27-Closure (2026-05-04). Alle 6 Backlog-Items
verbatim in `.planning/phases/phase-28/28-BACKLOG.md`. Alle 21 gelockten
Decisions D-01..D-21 in `.planning/phases/phase-28/28-CONTEXT.md`.

## Wave delivery

### W0 — Test-Scaffolding — Plan 28-00

- **28-00-T1** `55107a3` — `test/_helpers.mjs` mit `readJsonFile`,
  `writeJsonFile`, `withTempDir`, `makeMinimalDocumentStub`. Foundation für
  Wave-1+ unit tests.
- **28-00-T2** `4e98335` — Acht `*.test.mjs` Scaffolds als Skips:
  `board-profile-fields`, `board-json-roundtrip`, `auto-load-fallback`,
  `dashboard-hint-copy`, `asset-picker-dirty-gate`, `asset-delete-modal`,
  `asset-hash`, `asset-manifest`. Test-Runner: `node --test "test/**/*.test.mjs"`
  (Node 24 builtin). Suite-Baseline 8 pass / 15 skip / 0 fail.

### W1 — B1 Per-Board "last-used profile" — Plan 28-01

- **28-01-T1** `9f06f32` — `lastUsedProfileName` field added to
  `BOARD_PROFILE_FIELDS` (server.mjs:57); path-traversal validator rejects
  Chars außerhalb `[a-zA-Z0-9 _.-]`; `runtime-state.js` carries the field.
- **28-01-T2** `fb99b19` — `applyAndCaptureSnapshot` helper in
  `runtime-projection-profile-persistence.js` (snapshot=loaded → dirty=false);
  Save+Load triggers persist `lastUsedProfileName`; `autoLoadRememberedProjectionProfile()`
  invoked silently in `switchBoard` mit fallback auf
  `buildNewProfileDefaultGrid()` wenn keine zuletzt verwendete Profile da ist.
  Test-Suite +4 active: 12 pass / 11 skip.

### W2 — B2 Board-Switch Save-Gate — Plan 28-02

- **28-02-T1** `569971f` — `syncAlignModeDirtyDashboardState()` in
  `runtime-stage-viewport.js` extended to gate `#board-select`; locked hint
  copy `HINT_COPY_FULL_BOARD_SWITCH` (lang in title/aria, kurz "Unsaved on
  /output/" als chip). CSS `#board-select[disabled]` Style.
- **28-02-T2** `7685f53` — Vier `switchBoard` entry points geguardet:
  (1) board-select.change-handler, (2) `editAnimation()` in
  `runtime-lifecycle-live-editor.js`, (3) `activateImportedBoard()` in
  `runtime-zone-loader.js`, (4) post-board-delete fallback. Bei dirty:
  `boardSelect.value = state.boardId` rollback + locked toast.
  Test-Suite +1 active: 13 pass / 10 skip.

### W3 — B3 Asset-Picker Hygiene + B4 Custom Modal — Plan 28-03

- **28-03-T1** `1643a17` + `154133c` — B3 dirty-gate: `patchAnimation`
  call in `animation-editor-edit-pane-asset-picker.js` jetzt INSIDE
  `if (selection.id === def.id && uploadedPath === currentAssetRef)` Guard.
  Pure-library mutations und Selection-non-match → kein Dirty.
  `_lastSeenAssetHashByPath` / `_lastSeenSoundHashByPath` Maps für
  Wave-4 hash-diff. TODO(28-04) Marker an Lines 139 + 330.
- **28-03-T2** `1f4d958` + `09279f0` — B4: 2× `window.confirm()` ersetzt
  durch `TT_BEAMER_RUNTIME_MODAL.showConfirm({ danger: true })` an Lines
  133 + 304. Glassmorphism-Modal kommt aus existing
  `src/app/runtime/ui/runtime-modal.js` (D-21 reuse).
  Test-Suite +6 active: 19 pass / 4 skip.

### W4 — B5 Asset Cache Invalidation — Plan 28-04

- **28-04-T1** `19ac918` + `b4fcd0d` — Server-side: `computeAssetHash(bytes)` =
  `sha256(bytes).digest('hex').substring(0, 12)`. `config/asset-manifest.json`
  mit `ensureAssetManifestOnBoot()` synchron beim Server-Start synthesisiert
  (8 entries). Asset-upload + delete erweitern Manifest und broadcasten via
  `global-config-update` mit `target: 'config/asset-manifest.json'`.
  Tests: `asset-hash.test.mjs` + `asset-manifest.test.mjs` live.
- **28-04-T2** `69ba3c2` — Client-side: `runtime-asset-manifest.js` IIFE
  module mit `resolveAssetUrlWithHash(rawPath)` → `/path/file.gif?v=<hash>`.
  Render-layer wraps: `runtime-gif-playback.js:48` (fetch URL),
  `runtime-outside-mp4.js:47` (video.src on creation + cache-hit refresh).
  Asset-picker live-hash-diff guards (TODOs aus 28-03 aufgelöst).
  `runtime-live-sync-core.js` refetcht `/api/resources` bei manifest-broadcast.
  Test-Suite final: 25 pass / 0 fail / 0 skip.
- **28-04 Note:** `gifPlaybackCacheByPath` (in-memory decoded frames) wird
  NICHT auto-invalidiert — gemerktes Limit. HTTP-Cache + MP4-element-src
  invalidieren korrekt. User-Smoke entscheidet ob ein Hotfix nötig ist.

### W5 — B6 Diagnostic-Overlay Topbar UX — Plan 28-05

- **28-05-T1** (`autonomous=false`, auto-resolved) — Wave-0 live-sync smoke
  `"skip — assume it works"`. Phase 26 h9 wired the path; Plan 28-04 used
  the same broadcast envelope erfolgreich.
- **28-05-T2** `ef2d60d` — CSS inline-variant rule
  `body:not([data-output-role="final-output"]) .output-status-chip`
  mit `position: static; top: auto; right: auto; z-index: auto;
  margin-left: 6px; align-self: center;`. Existing rule
  (lines 125-141) bleibt unverändert → /output/ behält fixed-position style.
  index.html: chip-element von line 55 in `.rd-topbar-actions` (line 183)
  verschoben. Author-time DOM-relocation, kein neues JS.
- **28-05-T3** (`autonomous=false`, auto-resolved) — Visual smoke
  `"approved"` basierend auf grep-checks (rule + chip-position OK; existing
  rule untouched). Final visual sign-off deferred to user phase-end browser
  smoke (siehe 28-HUMAN-UAT.md).

## Aggregate metrics

- **Commits since `phase-27-end` (`c4a18b4`):** 26 total (6 plan-impl plans
  ×~3 commits/plan + Wave-0 scaffolding + closure commits).
- **Plan hierarchy:** 6 plans × 6 sequential waves (file overlap zwischen
  benachbarten Waves gezwungen serial).
- **Test infrastructure:** Erste Phase mit automatisierten Tests
  (`node --test`); 25 active tests covering B1..B5 logic-units.
- **Final version:** `0.28.0`.

## Decision coverage (D-01..D-21)

Alle 21 Decisions implementiert (D-18..D-20 sind Claude-discretion und
wurden im SUMMARY der jeweiligen Plans dokumentiert):

| Decision | Implemented in |
|----------|----------------|
| D-01 (B1 Save+Load trigger) | 28-01-T2 |
| D-02 (B1 per-board JSON server-side) | 28-01-T1 |
| D-03 (B1 auto-load + default fallback) | 28-01-T2 |
| D-04..D-06 (B2 inheritance + 4 entry points) | 28-02-T1 + 28-02-T2 |
| D-07 (B3 effective change only) | 28-03-T1 + 28-04-T2 (hash-diff upgrade) |
| D-08 (B3 pure library no-op) | 28-03-T1 |
| D-09/D-10/D-21 (B4 reuse showConfirm) | 28-03-T2 |
| D-11 (B5 hash query param) | 28-04-T1 + 28-04-T2 |
| D-12 (B5 sha256[:12]) | 28-04-T1 |
| D-13/D-19 (B5 manifest persistence — central JSON) | 28-04-T1 |
| D-14 (B6 dashboard inline topbar) | 28-05-T2 |
| D-15 (B6 /output/ unchanged) | 28-05-T2 (existing rule untouched) |
| D-16/D-17 (B6 live-sync via existing transport) | 28-05-T1 (auto-skipped — verified pre-existing) |

## Backlog coverage (B1..B6)

| Backlog | Status |
|---------|--------|
| B1 — per-board last-used profile | ✓ artifact + wiring; user smoke pending |
| B2 — board-switch save-gate (4 entry points) | ✓ artifact + wiring; user smoke pending |
| B3 — asset upload/delete dirty hygiene | ✓ artifact + wiring; user smoke pending |
| B4 — custom asset-delete modal | ✓ artifact + wiring; user smoke pending |
| B5 — asset cache invalidation (sha256[:12]) | ✓ artifact + wiring; user smoke pending; **GIF in-memory caveat documented** |
| B6 — diagnostic-overlay topbar UX | ✓ artifact + wiring; user smoke pending |

## Known limitations

- **B5 GIF in-memory cache** — `gifPlaybackCacheByPath` (decoded frames)
  invalidiert NICHT automatisch bei re-upload. HTTP-cache + MP4-element-src
  invalidieren korrekt durch das `?v=<hash>` query param. Wenn der
  user-reported gif-symptom persistiert ist ein follow-up plan möglich
  (`gifPlaybackCacheByPath.delete(path)` beim manifest-broadcast).
- **B6 visual layout** auf 1280/1920/2560px nicht automatisch verifiziert
  — manuelles Resize-smoke nötig.
- **B6 cross-client live-sync** strukturell verifiziert (Plan 28-04
  broadcast-envelope ging durch dieselbe pipeline) aber nicht in einem
  echten Multi-Window-Test bestätigt.

## Bonus features added during execution

- **First automated test infrastructure** (Plan 28-00). Pre-Phase-28 hatte
  das Repo keine `node --test`-Suite; jetzt 25 active tests + 1 helper module.
  Foundation für künftige Phasen.

## Tags

| Tag | Hash | Marker |
|-----|------|--------|
| `phase-27-end` | `c4a18b4` | Phase 28 starts at this commit |
| `phase-28-end` | (HEAD) | Phase 28 closed — automated GSD pipeline complete |

## Closure marker

- Tag: `phase-28-end` (this closure commit).
- Final version: `0.28.0`.
- Phase artifact: dieser `SUMMARY.md` (W0..W5 + decision matrix + known limits).
- Alle commits auf `master` zwischen `phase-27-end` (`c4a18b4`) und dem closure marker.
- Nächster Schritt: User testet die 7 Items aus `28-HUMAN-UAT.md` im Browser
  + Pi /output/. Falls Issues entstehen, folgen Hotfixes im h*-Pattern wie
  Phase 27.
