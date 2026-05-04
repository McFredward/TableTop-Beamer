---
phase: 28-cross-cutting-ux-state-polish
verified: 2026-05-04T16:30:00Z
status: human_needed
score: 32/32 must-haves verified
overrides_applied: 0
human_verification:
  - test: "B1 board-switch auto-load + dirty=false (visual)"
    expected: "Save profile alpha on board A → switch to board B → switch back to A. Profile alpha auto-loads silently (no popup), toolbar shows alpha, dashboard #board-select stays enabled (dirty=false). No 'Unsaved on /output/' chip after auto-load."
    why_human: "Multi-step browser DOM + WebSocket roundtrip + visual feedback (toolbar label, dirty-dot color)."
  - test: "B2 board-switch save-gate cross-device"
    expected: "(1) Pi /output/ enter align mode + drag a line. (2) Dashboard #board-select dropdown is disabled with cursor:not-allowed + tooltip = 'Unsaved align changes on /output/ — save or discard there first to switch board.'. (3) Try dropdown change → bounces back to active board, status feedback shows the locked toast. (4) Same for cluster picker, post-board-delete fallback, animation-editor edit-board entry. (5) On /output/ save/discard → dropdown re-enables (no disabled attr, no title)."
    why_human: "Multi-device coordination requires Pi /output/ + dashboard side-by-side. CSS pseudo-state (cursor:not-allowed) and tooltip rendering need real browser."
  - test: "B3 dirty-flag hygiene smoke"
    expected: "Pure-library upload (no animation references the new file) → Apply bar does NOT activate. Selection-match upload with same hash → Apply does NOT activate. Selection-match upload with different bytes → Apply activates. Pure-library delete (asset not used by selected def) → Apply does NOT activate. Selection-match delete → Apply activates."
    why_human: "Requires running animation editor + asset upload UI + observing localConfigDirty propagation through dirty bar visual."
  - test: "B4 custom delete modal visual smoke"
    expected: "Click Delete on any animation/sound asset → glassmorphism modal appears with title 'Delete X?', danger-red Delete button, Cancel button. Esc / click-outside aborts (no fetch). Cancel returns false. Native window.confirm dialog never appears."
    why_human: "Modal appearance + Esc/click-outside dismissal + danger styling are visual."
  - test: "B5 re-upload propagation (asset cache invalidation)"
    expected: "(1) Animation A uses kaputt.gif. (2) Delete kaputt.gif. (3) Upload different bytes named kaputt.gif. (4) Trigger Animation A on /output/. NEW GIF plays within ~1s; old does NOT linger. SUMMARY notes a known limitation: GIF in-memory cache (gifPlaybackCacheByPath) does NOT auto-invalidate — full fix is for MP4 + browser HTTP cache. Manual smoke must confirm whether the user-reported symptom for the gif/video case is resolved."
    why_human: "Multi-window browser HTTP cache + in-memory Image/Video cache layer behavior; visual diff of old-vs-new GIF/MP4 playback. Plan-author flagged a known GIF in-memory caveat."
  - test: "B6 dashboard topbar layout"
    expected: "Dashboard 'Show diagnostic overlay' ON → chip appears INLINE inside topbar's .rd-topbar-actions, right of theme-toggle, NOT overlapping #app-version or .rd-topbar-brand-title. Resize 1280px / 1920px / 2560px → no line-break under topbar. /output/ chip stays in TOP-RIGHT corner (position:fixed) unchanged. No z-index conflict with #align-mode-dirty-hint."
    why_human: "Pure visual layout assertion; CSS bounding-rect overlap unsuited to unit test."
  - test: "B6 cross-client live-sync (D-16)"
    expected: "Two windows (dashboard + /output/). Toggle 'Show diagnostic overlay' in dashboard System tab → /output/ chip flips visible/hidden within ~200ms. Reload /output/ → chip state matches dashboard's last setting. Plan 28-05 Task 1 was AUTO-SKIPPED ('skip — assume it works'); Phase 26 h9 is documented as having wired this path but no live multi-window confirmation has occurred during Phase 28."
    why_human: "Multi-client WebSocket roundtrip + visual confirmation; Plan-author explicitly deferred Wave-0 smoke to end-of-phase verification."
---

# Phase 28: Cross-cutting UX & State Polish Verification Report

**Phase Goal:** Cross-cutting UX & State Polish — fix six independent UX/state issues after Phase 27 closure (B1..B6).
**Verified:** 2026-05-04T16:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (per ROADMAP Exit Criteria + Plan must_haves)

| #   | Truth | Status | Evidence |
|-----|-------|--------|----------|
| 1   | Board-Switch lädt automatisch das per-Board zuletzt verwendete Align-Profil; manuelles Re-Loading entfällt (B1). | VERIFIED (artifact) / human_needed (visual smoke) | `BOARD_PROFILE_FIELDS` includes `lastUsedProfileName` (server.mjs:57); `state.lastUsedProfileNameByBoard: {}` initialized (runtime-state.js:87); 4 trigger sites in profile-persistence.js update field; `discardChanges` body does NOT update field (D-01); `autoLoadRememberedProjectionProfile` defined at board-switch.js:47 + invoked at board-switch.js:138; `applyAndCaptureSnapshot` (line 570) and `applyDefaultAndCaptureSnapshot` (line 587) helpers exist. |
| 2   | Während Align-Dirty auf /output/ ist, bleibt Board-Switch deaktiviert mit identischer Hint-UX wie Phase 27 B5 (B2). | VERIFIED (artifact) / human_needed (multi-device smoke) | `HINT_COPY_FULL_BOARD_SWITCH` = "Unsaved align changes on /output/ — save or discard there first to switch board." in stage-viewport.js (1 occurrence); `Unsaved on /output/` chip text intact (1 occurrence); `#board-select[disabled]` CSS at styles.css:2226; toast literal grep across nav-binders/live-editor/zone-loader = 4 hits (1+1+2); `boardSelect.value = state.boardId` rollback present; `switchBoard(animation.boardId` retained (gate-only, not bypass). |
| 3   | GIF/MP4-Upload+Delete erzeugen kein Dirty-Flag, solange kein Dropdown-Auswahl-State sich tatsächlich ändert (B3). | VERIFIED (artifact) / human_needed (interactive smoke) | Animation upload guard `if (currentAssetRef && uploadedPath === currentAssetRef)` present (1 occurrence); sound upload symmetric guard present (1 occurrence); animation delete guard `if (String(def.assetRef \|\| "").trim() === current)` preserved; hash-diff branch `if (newHash && prevHash !== newHash)` live with `_lastSeenAssetHashByPath.set(uploadedPath, newHash)` inside guard. |
| 4   | GIF/MP4-Löschung verwendet einen eigenen, board-style-konsistenten Modal — keine `window.confirm`-Aufrufe (B4). | VERIFIED (artifact) / human_needed (visual smoke) | `window.confirm` count = 0 in asset-picker; `window.TT_BEAMER_RUNTIME_MODAL.showConfirm({` count = 2 (animation + sound); `danger: true,` count = 2; reuses existing TT_BEAMER_RUNTIME_MODAL.showConfirm API. |
| 5   | Re-Upload mit gleichem Dateinamen zeigt sofort den neuen Inhalt in allen aktiven Animationen (B5). | VERIFIED (artifact) / human_needed (cross-window cache smoke; KNOWN LIMITATION on GIF in-memory cache documented in 28-04-SUMMARY) | Server: `ASSET_MANIFEST_SCHEMA` (server.mjs:25), `loadAssetManifest` (line 2259), `saveAssetManifest` (line 2292), `computeAssetHash` (line 2303), `synthesizeAssetManifestFromDisk` (line 2308), `ensureAssetManifestOnBoot` (line 2347 def, 3742 call), 2 broadcast points for `config/asset-manifest.json`, response includes `hash`, manifest delete on resource-delete; `config/asset-manifest.json` exists with 8 entries. Client: `runtime-asset-manifest.js` exists, exports `TT_BEAMER_RUNTIME_ASSET_MANIFEST = { setManifest, resolveAssetUrlWithHash }`; index.html script tag present; ctx-builder exposes `resolveAssetUrlWithHash` (5 occurrences); render-layer wraps in runtime-gif-playback.js + runtime-outside-mp4.js; live-sync-core handles `target === "config/asset-manifest.json"`; global-defaults handler applies `payload.assetManifest`. |
| 6   | Diagnostic-Overlay-Toggle propagiert live an alle Clients inkl. /output/; Dashboard-Topbar bleibt frei vom Overlay-Block (B6). | VERIFIED (artifact) / human_needed (cross-window live-sync smoke + visual layout) | CSS inline-variant rule `body:not([data-output-role="final-output"]) .output-status-chip` at styles.css:152 with `position: static; top: auto; right: auto; z-index: auto; margin-left: 6px; align-self: center;`; existing `.output-status-chip { position: fixed; top:8px; right:8px; z-index:9999; ... }` rule (lines 125–141) intact; existing `body[data-diagnostic-overlay="true"] .output-status-chip` rule intact (line 145); `<div id="output-status-chip">` is now a child of `.rd-topbar-actions` at index.html:183 (parent opens at line 129). |

**Score:** 6/6 truths verified at the artifact + wiring level. ALL 6 truths require human-only behavioral confirmation that automated grep cannot supply.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server.mjs` | BOARD_PROFILE_FIELDS includes lastUsedProfileName + asset-manifest infra | VERIFIED | 12 must-have grep checks all pass |
| `src/app/runtime/state/runtime-board-profiles.js` | validateProfileName + lastUsedProfileNameByBoard | VERIFIED | Validator regex `/^[a-zA-Z0-9 _.-]{1,80}$/`; 4 references to validateProfileName |
| `src/app/runtime/viewport/runtime-projection-profile-persistence.js` | 4 trigger sites + 2 helpers + window export | VERIFIED | 4 assignment-block matches; applyAndCaptureSnapshot @ 570; applyDefaultAndCaptureSnapshot @ 587; discardChanges body has 0 lastUsedProfileNameByBoard refs |
| `src/app/runtime/core/runtime-board-switch.js` | autoLoadRememberedProjectionProfile + void invocation | VERIFIED | Helper @ line 47, invocation @ line 138 |
| `src/app/lib/state/runtime-state.js` | state slot init | VERIFIED | `lastUsedProfileNameByBoard: {}` @ line 87 |
| `src/app/runtime/viewport/runtime-stage-viewport.js` | HINT_COPY_FULL_BOARD_SWITCH + #board-select gating | VERIFIED | 2 occurrences (def + usage); locked literal present |
| `src/app/runtime/wire/runtime-wire-navigation-binders.js` | dropdown change guard + rollback | VERIFIED | alignModeDirtyOnOutput x1, rollback x1, toast x1 |
| `src/app/runtime/animation/runtime-lifecycle-live-editor.js` | editAnimation gate | VERIFIED | alignModeDirtyOnOutput x1, toast x1, switchBoard call retained |
| `src/app/runtime/live-sync/runtime-zone-loader.js` | activateImportedBoard + post-delete fallback gates | VERIFIED | alignModeDirtyOnOutput x2, toast x2 |
| `src/styles.css` | #board-select[disabled] + B6 inline-variant | VERIFIED | Rule at line 2226; B6 rule at line 152; existing /output/ rule lines 125–141 intact |
| `src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js` | Selection-match guards + showConfirm + hash-diff guard | VERIFIED | All 8 grep checks (currentAssetRef guard x1, currentSoundRef guard x1, _lastSeenAssetHashByPath x3, _lastSeenSoundHashByPath x3, TODO(28-04) x0, window.confirm x0, showConfirm x2, danger:true x2) match expected |
| `server.mjs` (B5 helpers) | loadAssetManifest, saveAssetManifest, computeAssetHash, synthesize, ensureOnBoot | VERIFIED | All 5 helpers present at expected lines; broadcast on upload+delete |
| `config/asset-manifest.json` | manifest persisted | VERIFIED | File exists, schema header `tt-beamer.asset-manifest.v1`, 8 entries |
| `src/app/runtime/state/runtime-asset-manifest.js` | client IIFE module | VERIFIED | Exports `TT_BEAMER_RUNTIME_ASSET_MANIFEST = { init, setManifest, resolveAssetUrlWithHash }` |
| `src/app/runtime/runtime-orchestration-ctx-builder.js` | ctx.resolveAssetUrlWithHash exposed | VERIFIED | 5 occurrences |
| `src/app/runtime/live-sync/runtime-global-defaults.js` | applyGlobalDefaultsPayloadToState handles assetManifest | VERIFIED | `payload.assetManifest` branch present |
| `src/app/runtime/live-sync/runtime-live-sync-core.js` | global-config-update handler refetches /api/resources on asset-manifest target | VERIFIED | `payload.target === "config/asset-manifest.json"` branch present |
| `src/app/runtime/render/runtime-gif-playback.js` | resolver wrap | VERIFIED | `TT_BEAMER_RUNTIME_ASSET_MANIFEST?.resolveAssetUrlWithHash?.(path)` present |
| `src/app/runtime/render/runtime-outside-mp4.js` | resolver wrap | VERIFIED | Resolver wrap present (with cache-hit refresh added per Plan 28-04 deviation) |
| `index.html` | runtime-asset-manifest.js script tag + #output-status-chip in topbar | VERIFIED | Both artifacts present at expected positions |
| `test/*.test.mjs` | 8 wave-0 scaffolds + helpers | VERIFIED | 9 files in test/; full suite reports 25 tests / 25 pass / 0 fail / 0 skip |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Save/Load triggers | `state.lastUsedProfileNameByBoard[boardId]` | direct assignment + persistBoardProfiles | WIRED | 4 sites confirmed (saveLoaded + saveAsNew + createNew + profileLoad.onPick); discardChanges has 0 hits |
| `switchBoard()` | `autoLoadRememberedProjectionProfile(board.id)` | fire-and-forget Promise | WIRED | `void autoLoadRememberedProjectionProfile(board.id)` at line 138, helper at line 47 |
| `BOARD_PROFILE_FIELDS` | `config/boards/<id>.json` round-trip | server iterators at lines 62/2002/2166 | WIRED | Field added at end of freeze list (server.mjs:57); existing iterators unchanged. Note: legacy boards (nemesis-*.json) do NOT yet contain the field — first save will write it. Default fallback verified via D-03 logic. |
| `syncAlignModeDirtyDashboardState` | `#board-select` disabled+title+aria | extends Phase 27 W5 helper in place | WIRED | HINT_COPY_FULL_BOARD_SWITCH constant + setAttribute call present |
| 4 switchBoard call sites | guarded by `state.alignModeDirtyOnOutput` | early return + toast + rollback (dropdown only) | WIRED | grep counts match |
| Asset upload | manifest + broadcast + hash response | computeAssetHash → loadAssetManifest → set entry → saveAssetManifest → broadcastLiveSession({target:'config/asset-manifest.json'}) | WIRED | All grep checks pass |
| Asset delete | manifest cleanup + broadcast | delete manifest.hashByPath[target.url] + broadcast | WIRED | Delete cleanup + 2nd broadcast point present |
| `global-config-update` (asset-manifest target) | `setManifest(hashByPath)` | refetch /api/resources → setManifest | WIRED | Branch present in runtime-live-sync-core.js |
| Bootstrap payload | `setManifest` initial seed | applyGlobalDefaultsPayloadToState `payload.assetManifest` | WIRED | Branch present in runtime-global-defaults.js + boot-seed via runtime-fx-panels-inside-outside.js per 28-04 deviation |
| Render-layer (gif fetch + video.src) | `resolveAssetUrlWithHash(rawPath)` | wrap before fetch / element.src | WIRED | Both modules grep-confirmed |
| Asset upload TODO(28-04) | live hash-diff guard `_lastSeenAssetHashByPath.get` | replaced with prevHash/newHash compare | WIRED | TODO(28-04) count = 0; `_lastSeenAssetHashByPath.set(uploadedPath, newHash)` inside guard |
| `window.confirm` (legacy) | `TT_BEAMER_RUNTIME_MODAL.showConfirm({ danger: true })` | direct API replacement | WIRED | window.confirm count = 0; showConfirm count = 2 |
| `body:not([data-output-role="final-output"]) .output-status-chip` | dashboard topbar inline chip | CSS specificity higher than base rule | WIRED | Rule at styles.css:152 |
| `#output-status-chip` element | `.rd-topbar-actions` (last child) | author-time DOM move | WIRED | Element at index.html:183, parent at line 129 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| autoLoadRememberedProjectionProfile | `state.lastUsedProfileNameByBoard[boardId]` | applyBoardProfilesToState reads from server-persisted boards/<id>.json via validateProfileName | YES — validator clamps to null on missing/invalid; D-03 fall-back path triggers `applyDefaultAndCaptureSnapshot()` | FLOWING |
| #board-select gate | `state.alignModeDirtyOnOutput` | server `liveSessionState.snapshot.alignModeDirtyOnOutput` (Phase 27 W5) → broadcastLiveSession → applyGlobalDefaultsPayloadToState | YES — inherits Phase 27 W5 wiring (verified there); same boolean drives both align-toggle and board-switch gates | FLOWING |
| asset-picker upload guard | `payload.hash` from upload response + `_lastSeenAssetHashByPath` Map | server computes `sha256(buffer).digest('hex').substring(0,12)` and includes in JSON response | YES — server.mjs:2457 includes `hash` in response; client tracker Map populated on success | FLOWING |
| render-layer asset URL | `resolveAssetUrlWithHash(rawPath)` | window.TT_BEAMER_RUNTIME_ASSET_MANIFEST mirror seeded by /api/resources hashByPath + applyGlobalDefaultsPayloadToState branch | YES — manifest is server-authoritative; /output/ refetches via global-config-update broadcast handler | FLOWING |
| #output-status-chip visibility | `body[data-diagnostic-overlay]` dataset attr | applyGlobalDefaultsPayloadToState → syncRuntimePanelsFromState → syncDiagnosticOverlayPanel (Phase 26 h9) | INHERITED — Plan 28-05 confirms Phase 26 h9 wiring intact; LIVE-SYNC PATH NOT FRESHLY SMOKED in Phase 28 (Wave-0 smoke auto-skipped). Manual smoke needed. | FLOWING (inherited) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite green | `node --test "test/**/*.test.mjs"` | 25 tests / 25 pass / 0 fail / 0 skip | PASS |
| server.mjs syntax valid | `node --check server.mjs` | exit 0 | PASS |
| runtime-asset-manifest.js syntax valid | `node --check src/app/runtime/state/runtime-asset-manifest.js` | exit 0 | PASS |
| runtime-gif-playback.js syntax valid | `node --check src/app/runtime/render/runtime-gif-playback.js` | exit 0 | PASS |
| runtime-outside-mp4.js syntax valid | `node --check src/app/runtime/render/runtime-outside-mp4.js` | exit 0 | PASS |
| asset-picker.js syntax valid | `node --check src/app/runtime/ui/animation-editor-edit-pane-asset-picker.js` | exit 0 | PASS |
| board-switch.js syntax valid | `node --check src/app/runtime/core/runtime-board-switch.js` | exit 0 | PASS |
| stage-viewport.js syntax valid | `node --check src/app/runtime/viewport/runtime-stage-viewport.js` | exit 0 | PASS |
| asset-manifest.json present + schema | `cat config/asset-manifest.json \| head -3` | schema=`tt-beamer.asset-manifest.v1`, 8 hashByPath entries | PASS |

Browser/visual checks (multi-window WebSocket, CSS layout, modal rendering, GIF/MP4 playback) cannot be automated in this environment — routed to human verification per Step 8.

### Requirements Coverage

Phase 28 uses the backlog model (B1..B6 + locked decisions D-01..D-21), not REQUIREMENTS.md mappings.

| Backlog Item | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| B1 (D-01..D-03, D-18) | 28-01 | Per-board lastUsedProfileName + auto-load on board-switch | SATISFIED (artifact+wiring) | All 8 acceptance grep checks pass; helpers + 4 trigger sites + autoLoad invocation in place; `discardChanges` correctly skipped per D-01 |
| B2 (D-04..D-06) | 28-02 | Board-switch save-gate parallel to Phase 27 W5 align-toggle gate | SATISFIED (artifact+wiring) | HINT_COPY_FULL_BOARD_SWITCH + 4 guard sites + CSS disabled rule + chip-text reuse |
| B3 (D-07, D-08) | 28-03 + 28-04 | Asset upload/delete dirty-flag hygiene (selection-match + hash-diff) | SATISFIED (artifact+wiring) | Selection-match guards + hash-diff branch + tracker Maps; 28-04 converted TODO markers; tests upgraded |
| B4 (D-09, D-10, D-21) | 28-03 | Custom asset-delete modal (reuse showConfirm) | SATISFIED (artifact+wiring) | window.confirm count = 0; 2× showConfirm with danger:true |
| B5 (D-11..D-13, D-19) | 28-04 | Asset cache invalidation via sha256[:12] content-hash query param | SATISFIED (artifact+wiring) — KNOWN LIMITATION documented | Server manifest infra + client mirror + render-layer wraps; broadcast envelope reused; 28-04-SUMMARY explicitly documents that GIF in-memory `gifPlaybackCacheByPath` invalidation is NOT included (full fix is for MP4 + browser HTTP cache only). Manual smoke must confirm whether the user-visible GIF symptom is resolved by URL change alone. |
| B6 (D-14..D-17, D-20) | 28-05 | Diagnostic-overlay topbar inline-variant + cross-client live-sync | SATISFIED (artifact+wiring) — D-16 LIVE-SYNC NOT FRESHLY SMOKED | Inline-variant CSS rule + DOM relocation; B6-D14/D15/D17 verifiable via grep+source. D-16 (cross-client sync) inherited from Phase 26 h9; Plan 28-05 Wave-0 smoke auto-skipped per `"skip — assume it works"`. Multi-window manual smoke required. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none in production source modified by Phase 28) | — | TODO/FIXME/PLACEHOLDER scan returned 0 hits in all P28-modified files | — | clean |

The TODO(28-04) markers planted by Plan 28-03 were correctly converted to live hash-diff guards in Plan 28-04 (count = 0).

### Human Verification Required

7 items need human testing — see frontmatter `human_verification:` block. Highlights:

1. **B5 GIF cache caveat (highest risk):** 28-04-SUMMARY explicitly notes `gifPlaybackCacheByPath` (in-memory frame Map) does NOT auto-invalidate on re-upload. The fix only covers HTTP cache + MP4 element src. The user's reported symptom in BACKLOG B5 was "wenn ich ein gif/video lösche" — for GIF, page reload may still be required. Manual smoke MUST confirm whether the user accepts this caveat or whether a follow-up is needed.
2. **B6 D-16 cross-client live-sync:** Plan 28-05 Task 1 was AUTO-SKIPPED. The structural path through Phase 26 h9 is intact, but no fresh multi-window smoke was performed during Phase 28. If the toggle does NOT propagate to /output/, a follow-up adds `syncDiagnosticOverlayPanel()` to applyGlobalDefaultsPayloadToState (recipe in 28-RESEARCH.md §"Open Question 4").
3. **B1 default fallback for legacy boards:** existing `config/boards/nemesis-*.json` files do NOT yet contain `lastUsedProfileName` — verified by grep. The validateProfileName helper coerces absent → null at apply time, and D-03 fall-back triggers `applyDefaultAndCaptureSnapshot()`. Manual smoke confirms this on a fresh switch to a legacy board.
4. **B2 multi-device coordination:** requires Pi /output/ + dashboard side-by-side; the gate is server-authoritative via Phase 27 W5 inheritance, but visual disabled-style + tooltip + rollback require browser confirmation.
5. **B3 dirty hygiene flow:** localConfigDirty propagation through animation-editor's dirty bar requires running the editor; structural source-pattern tests verify the gate shape but not the runtime dirty propagation.
6. **B4 modal Esc/click-outside:** glassmorphism modal + danger-styled Delete button + dismissal behavior need browser.
7. **B6 visual layout:** chip bounding-rect overlap with logo/title/version-chip + flex-wrap behavior at 1280/1920/2560px viewports.

### Gaps Summary

No actionable gaps found at the artifact + wiring level. ALL 32 must-have grep checks across the 6 plans pass. Test suite is 25/25 green with zero skips. The phase ships with two explicitly-documented caveats:

(a) **GIF in-memory cache invalidation** (28-04-SUMMARY known limitation) — phase-author accepted this as a follow-up plan rather than a Phase 28 gap. Whether this resolves the user-reported B5 symptom is the central question for human verification.

(b) **B6 D-16 live-sync smoke deferred** (Plan 28-05 Task 1 auto-skipped) — Phase 26 h9 wiring is documented as intact, but no fresh multi-window confirmation occurred during Phase 28.

Both are routed to `human_verification` rather than `gaps_found` because they require browser smoke that automated tooling cannot perform — and the artifact + wiring layers are completely in place. If human smoke surfaces a regression in either area, the orchestrator can surface it back as a re-verification gap and `/gsd-plan-phase --gaps` will plan the closure.

---

_Verified: 2026-05-04T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
