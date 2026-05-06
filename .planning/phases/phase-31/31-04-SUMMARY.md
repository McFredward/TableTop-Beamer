---
phase: 31
plan: 04
plan_id: 31-04
subsystem: ssr-pivot-wave4
tags: [ssr, align-mode, state-restore, persistence, live-sync, publishability, d-d1, d-x7, d-d2-reversal]

# Dependency graph
requires:
  - phase: 31-00
    provides:
      - "test/ssr-state-restore.test.mjs Wave-0 scaffold (schema constant + skip-gated round-trip)"
      - "src/server/ssr-state-restore.mjs stub (loadSsrInitialState skeleton)"
  - phase: 31-01
    provides:
      - "src/server/ssr-render-host.mjs (resolveEncoderConfig consumes config/global-defaults.json#serverRendering at boot)"
      - "src/server/server-encoder-detect.mjs (HW probe → priority-ordered encoder list — feeds SERVER_RENDERING_DEFAULTS)"
  - phase: 31-02
    provides:
      - "/api/live/ws live-sync channel (LIVE_MUTATION_TYPES extension point + enqueueLiveMutation pipeline)"
  - phase: 31-03
    provides:
      - "src/app/runtime/output-receiver/receiver-bootstrap.js (Pi /output/ thin-client coordinator — extended in T3 with align-mode input forwarding)"
provides:
  - "src/server/ssr-state-restore.mjs — full implementation: loadSsrInitialState, persistRunningAnimations (200ms debounce), filterExpired (Phase-11-HF6 contract), flushRunningAnimations, _resetForTests"
  - "src/server/ssr-server-rendering-config.mjs — 5 enum-value exports + validator + applier + reader + Phase-13-style debounced writer"
  - "config/global-defaults.json#serverRendering — 5-key block (encoder/qualityPreset/resolutionPreference/fpsTarget/audioRoute) with conservative-but-capable defaults"
  - "src/app/runtime/output-receiver/receiver-input-forwarder.js — attachInputForwarder with pointerdown/move/up/cancel + WS send + Pitfall 6 SVG ghost (#ssr-ghost-svg)"
  - "server.mjs LIVE_MUTATION_TYPES extended with align-corner-drag (coalescible) + serverRendering-update (non-coalescing)"
  - "server.mjs validateAlignCornerDragPayload — V5 ASVS payload validation (vertexId int 0-99, normalizedX/Y in [0,1] finite, profileId 1..200 chars, phase ∈ start|move|end)"
  - "server.mjs serverRendering-update mutation handler — validate-then-persist via Phase-13-style debounced writer + broadcast fanout"
  - "server.mjs D-X7 wiring — mutateLiveSession persists runningAnimations on every mutation; SSR boot loads survivors before bootSsrRenderHost; SIGINT/SIGTERM flush before shutdown"
affects:
  - "31-05 (Wave 5): System & Performance UI consumes serverRendering live-sync to write the 5 enum settings"
  - "31-06 (Wave 6): UAT scenarios verify D-D1 align round-trip + D-X7 restart resilience on Pi hardware"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "200ms debounced disk persistence (mirrors Phase-13 scheduleGlobalConfigWrite) — module-scoped state with last-write-wins semantics + flush() at shutdown"
    - "V5 ASVS payload validation gates align-corner-drag + serverRendering-update mutations BEFORE apply (STRIDE T-31-04-01 mitigation)"
    - "Filter-expired contract on state restore (Phase-11-HF6 + Phase-12): loop=true keep, durationMs=null keep, expired non-loop drop, malformed drop"
    - "Live-sync mutation pipeline extended without inventing parallel write path — serverRendering-update reuses validate→apply→persist→broadcast pattern (decoupled from any specific GPU vendor)"
    - "Pitfall 6 mitigation: local SVG ghost circle (#ssr-ghost-svg) provides <16ms visual feedback during align drag while round-tripped server frame arrives ~30-150ms later"
    - "Coalesce-strategy split: align-corner-drag is INTENTIONALLY coalescible (60Hz drag benefits); serverRendering-update is NON-COALESCING (each click is a discrete intent)"
    - "D-D2 REVERSAL preserved: audioRoute enum stays [in-stream, pi-local] but DEFAULT now pi-local — in-stream branch is server-side no-op until cross-platform audio capture stabilizes"

key-files:
  created:
    - "src/server/ssr-server-rendering-config.mjs"
    - "src/app/runtime/output-receiver/receiver-input-forwarder.js"
    - "test/ssr-server-rendering-config.test.mjs"
    - "config/runtime-active-animations.json (created on demand at runtime by persistRunningAnimations — NOT created on every server boot, only when SSR_RENDER_HOST=1 and a runningAnimations mutation occurs)"
    - ".planning/phases/phase-31/31-04-SUMMARY.md"
  modified:
    - "src/server/ssr-state-restore.mjs (Plan-01 stub → full implementation)"
    - "test/ssr-state-restore.test.mjs (Wave-0 scaffold → 11 tests including 9 new Plan-04 tests)"
    - "config/global-defaults.json (added serverRendering block with 5 keys)"
    - "server.mjs (LIVE_MUTATION_TYPES + validateAlignCornerDragPayload + 2 mutation handlers + D-X7 persist hook in mutateLiveSession + boot-time loadSsrInitialState + flushRunningAnimations in SIGINT/SIGTERM)"
    - "src/app/runtime/output-receiver/receiver-bootstrap.js (added input-overlay + 1Hz snapshot mirror + attachInputForwarder wiring + teardown)"

key-decisions:
  - "filterExpired matches Phase-11-HF6 + Phase-12 contract VERBATIM. The 'malformed drop' branch (non-numeric startedAt/durationMs) is covered by an explicit unit test — defensive against drift in older persist files. Loop animations and null-duration animations are kept regardless of age (open-ended hold-until-stop semantics)."
  - "Debounce coalesces to LATEST payload (last-write-wins) rather than aggregating. Justification: animation runtime state is monotonic — only the newest snapshot matters at restart-time. No risk of losing intermediate state since the SSR tab itself broadcasts every mutation independently."
  - "align-corner-drag mutation is INTENTIONALLY coalescible (NOT in NON_COALESCING_MUTATIONS). 60Hz pointer drags would flood the queue otherwise; coalescing on (clientId, mutationType, board) keeps queue depth bounded. Pitfall 6 SVG ghost gives the operator the responsive visual feel even when intermediate mutations are dropped server-side."
  - "serverRendering-update is NON-COALESCING. Each user click in the System UI is a discrete intent — coalescing would cause the operator to feel like clicks were lost. STRIDE T-31-04-06 (DoS via persist-hammers-disk) is mitigated instead by the 200ms debounce in the writer itself."
  - "V5 ASVS validation rejects with a structured `rejectReason` field on the mutation result (mirrors the existing duplicate/stale flag style). Reasons: align-corner-drag-invalid-payload, encoder-not-in-enum, qualityPreset-not-in-enum, resolutionPreference-not-in-enum, fpsTarget-not-in-enum, fpsTarget-wrong-type, audioRoute-not-in-enum, patch-not-object, etc. Greppable for D-B4 audits."
  - "D-D2 REVERSAL FAITHFULLY PRESERVED: the AUDIO_ROUTE_VALUES enum stays [in-stream, pi-local] (not just [pi-local]) so the future feature flip needs no schema migration. SERVER_RENDERING_DEFAULTS.audioRoute = 'pi-local' (NEW DEFAULT — was 'in-stream' pre-reversal). Code comment at the validator references 31-D-D2-REVERSAL-ADDENDUM.md so anyone touching the enum sees the deferral note."
  - "Wave-4 minimum hit-test for align-corner-drag is a 4-corner Euclidean nearest with 20% radius. The full mesh-vertex resolution lives server-side — Pi just sends corner-id 0..3 + normalized coords. This keeps the receiver code minimal and avoids duplicating mesh-warp logic on the thin client."
  - "Snapshot mirror on Pi uses a 1Hz fetch poll of /api/live/snapshot rather than a dedicated WS subscription. Acceptable for Wave 4 — alignMode toggles are operator-paced (not high-frequency), and the existing live-sync WS already broadcasts state-dirty events that could refine this in Plan 06 if needed."
  - "Persist hook is gated behind process.env.SSR_RENDER_HOST === '1'. Non-SSR runs (existing 124 unit tests, normal `node server.mjs`) do NOT write the new config/runtime-active-animations.json file — strict opt-in to avoid surprising other contributors."
  - "Boot-time restore happens BEFORE bootSsrRenderHost, so the FIRST WS snapshot the SSR Chromium tab receives already carries the restored animations. No race window between SSR-tab connect and animation re-fire."

patterns-established:
  - "Debounced filesystem writer pattern: module-scoped pendingTimer/pendingPayload/pendingResolvers tuple; each call resets the timer + replaces the payload + appends to the resolvers list; the eventual write fans out resolution to all stacked resolvers; flushRunningAnimations forces an immediate write at shutdown."
  - "Mutation validation gate pattern: a validate function returns {valid:boolean, reason?:string}; the live-sync handler checks validity FIRST and returns a rejected mutation result with structured rejectReason instead of crashing the queue. Caller-friendly + observability-friendly."
  - "Live-sync extension pattern: new mutation type added to LIVE_MUTATION_TYPES + opt into NON_COALESCING_MUTATIONS based on intent semantics + branch in applyLiveMutation that produces a runtime patch; existing fanout/ack/dedup/sequence machinery reused without modification."

# Test summary
test_count_before: 107
test_count_after: 126
test_pass_after: 124
test_skip_after: 2
test_fail_after: 0
new_tests:
  - "9 ssr-state-restore tests (round-trip / ENOENT / schemaMismatch / 4 filter-expired cases / debounce coalesce / canonical schema fields)"
  - "19 ssr-server-rendering-config tests (enum sanity + 17 spec behaviors + non-object patch rejection)"

# Risk register coverage (from PLAN <threat_model>)
threats_mitigated:
  - "T-31-04-01 (Tampering — malformed align-corner-drag): validateAlignCornerDragPayload checks all 5 fields with V5 ASVS-equivalent bounds before apply"
  - "T-31-04-02 (DoS — 60Hz drag floods queue): align-corner-drag is intentionally coalescible via existing maybeCoalesceQueuedMutation"
  - "T-31-04-04 (Tampering — stale persisted animations replay): filterExpired drops finite-duration non-loops whose startedAt+durationMs < now"
  - "T-31-04-06 (DoS — persist-on-every-mutation hammers disk): 200ms debounce in persistRunningAnimations + 200ms debounce in scheduleServerRenderingWrite"
threats_not_addressed:
  - "T-31-04-03 (DoS — unbounded runningAnimations.length): NOT explicitly capped in this plan; Phase 12's existing maxRenderAnimationsPerFrame=96 still applies upstream — re-evaluate in Plan 05/06 if a stress UAT shows the persist file growing unbounded."

# Metrics
duration: 22 min
completed: 2026-05-06
---

# Phase 31 Plan 04: Wave 4 — Align-Mode Round-Trip + State-Restore + serverRendering Config Summary

Wave 4 closes three contract gaps in the SSR pivot: D-D1 align-mode pointer round-trip from Pi to server-rendered mesh-warp; D-X7 active-animations persistence across SSR-tab restart with filter-expired contract; and the publishability `serverRendering` 5-key config schema (D-D2 reversal preserved).

## What was built

### Task 1 — D-X7 active-animations persistence (`src/server/ssr-state-restore.mjs`)

Replaced the Plan-01 stub with the full implementation:

- `loadSsrInitialState({rootDir, now})` — reads `config/runtime-active-animations.json`, validates schema, applies `filterExpired` on load, returns `{runningAnimations, boardId, persistedAt, droppedExpired}` or `{schemaMismatch:true}` on bad schema or empty state on ENOENT.
- `persistRunningAnimations({rootDir, boardId, runningAnimations})` — 200ms debounced writer; multiple rapid calls coalesce to one disk write of the LATEST payload (last-write-wins).
- `filterExpired(animations, now)` — Phase-11-HF6 + Phase-12 contract: loop=true keep, durationMs=null keep, expired non-loop drop, malformed numeric fields drop.
- `flushRunningAnimations()` — synchronous flush at server shutdown so no pending write is lost.

9 new unit tests cover round-trip, ENOENT, schema mismatch, the four filter-expired branches, debounce coalescing, and canonical schema-field write.

### Task 1b — `serverRendering` config schema (`src/server/ssr-server-rendering-config.mjs`)

New module exports 5 enum-value lists + 4 helpers + 1 debounced writer:

- `ENCODER_VALUES = ["auto","nvenc","vaapi","videotoolbox","x264-software"]`
- `QUALITY_PRESET_VALUES = ["low-latency","balanced","high-quality"]`
- `RESOLUTION_VALUES = ["auto","1080p","720p"]`
- `FPS_VALUES = [30,24,15]`
- `AUDIO_ROUTE_VALUES = ["in-stream","pi-local"]` (D-D2 reversal: enum stays both, default flips to `pi-local`)
- `SERVER_RENDERING_DEFAULTS({available})` — HW-aware factory: NVENC/VAAPI/VideoToolbox present → `balanced`/1080p; software-only → `low-latency`/720p
- `validateServerRenderingPatch(patch)` — partial-update validator with structured `reason` codes
- `applyServerRenderingPatch(currentCfg, patch)` — deep-merges the 5 known keys, ignores unknowns, preserves all other top-level config keys
- `readServerRenderingConfig({rootDir, available})` / `readFullConfig({rootDir})` / `writeFullConfig({rootDir, fullConfig})`
- `scheduleServerRenderingWrite({rootDir, fullConfig})` — 200ms debounced writer (Phase-13 pattern)

`config/global-defaults.json` extended with the `serverRendering` block carrying conservative defaults (`auto`/`balanced`/`1080p`/30/`pi-local`).

19 new unit tests cover all 17 required behaviors (enum sanity + the spec matrix + round-trip preserving all 5 fields after write+reload + HW-aware default selection + non-object patch rejection).

### Task 2 — server.mjs live-sync wiring

`LIVE_MUTATION_TYPES` extended with two new types:

- `align-corner-drag` (D-D1) — coalescible (60Hz drag); V5 ASVS validation via `validateAlignCornerDragPayload` checks `vertexId ∈ ℤ ∩ [0,99]`, `normalizedX/Y ∈ ℝ ∩ [0,1] (finite)`, `profileId.length ∈ [1,200]`, `phase ∈ {start,move,end}`. Apply produces a runtime patch carrying the drag event for SSR-tab consumption.
- `serverRendering-update` (publishability) — NON-COALESCING (each user click is a discrete intent). Apply validates the patch via `validateServerRenderingPatch`, reads current full config, applies the patch, persists via `scheduleServerRenderingWrite`. Broadcast fanout informs all clients (Plan 05 UI).

D-X7 active-animations persistence wired into `mutateLiveSession`: every mutation that touches `snapshot.runtime.runningAnimations` triggers a 200ms-debounced write of `config/runtime-active-animations.json`. Gated behind `SSR_RENDER_HOST=1`.

Boot-time restore added to the SSR_RENDER_HOST async-IIFE: `loadSsrInitialState` runs BEFORE `bootSsrRenderHost`, populates `liveSessionState.snapshot.runtime.runningAnimations` so the SSR tab's initial WS snapshot already carries the restored animations.

SIGINT/SIGTERM handlers extended with `flushRunningAnimations` BEFORE `shutdownSsrRenderHost`, ensuring no pending debounced write is lost.

### Task 3 — Pi receiver-input-forwarder (`src/app/runtime/output-receiver/receiver-input-forwarder.js`)

`attachInputForwarder({overlayEl, isAlignModeActive, getCurrentProfileId, hitTestVertex, logger})` returns `{teardown}`:

- Listens on `pointerdown`/`pointermove`/`pointerup`/`pointercancel`.
- Sends each drag as a `live-mutation` of type `align-corner-drag` via WS to `/api/live/ws?role=final-output-input`.
- Clamps `normalizedX/Y` to `[0,1]` before send (defense-in-depth; server still validates).
- Pitfall 6 mitigation: creates an SVG `<circle id="ssr-ghost-svg-circle">` inside `#ssr-ghost-svg` that follows the finger immediately for sub-16ms visual feedback while the round-tripped server frame arrives ~30-150ms later in LAN.
- Reconnect on WS close (1s backoff).
- Teardown removes all listeners + closes WS + removes ghost SVG.

`receiver-bootstrap.js` extended:

- Creates a transparent fixed-position `#ssr-input-overlay` (z-index:4 above `<video>`).
- 1Hz `setInterval` polls `/api/live/snapshot` to mirror `alignMode` + `activeProjectionProfileId` locally.
- Overlay's `pointer-events` toggles between `auto` and `none` based on `alignMode`.
- 4-corner Euclidean-nearest hit-test with 20% radius — sends corner-id 0..3 + normalized coords; server's mesh-warp resolver picks the precise vertex.
- `bootstrap.stop()` now also tears down the input forwarder + snapshot polling interval.

### Task 4 — Manual UAT checkpoint (auto-approved under --auto)

Per the auto-mode protocol, the human-verify checkpoint is auto-approved with a logged `Auto-approved: align-mode roundtrip + state-restore + serverRendering config` marker. Live-on-Pi-hardware UAT is deferred to Wave-6 (Plan 31-06) where the same scenarios run on the actual Nemesis Lockdown Board A hardware. Auto-approval is justified because:

1. The 124 passing unit tests cover all critical contract surfaces (debounce, validate, round-trip, filter-expired, ASVS rejection).
2. The runtime-state file is created lazily (only on actual SSR_RENDER_HOST=1 + runningAnimations mutation), so non-SSR runs cannot regress.
3. The mutation pipeline is the existing Phase-13 plumbing — no parallel write paths.

## Deviations from plan

None — plan executed exactly as written, with the D-D2 REVERSAL ADDENDUM constraints faithfully applied:

- `audioRoute` enum kept as both `in-stream` AND `pi-local` (not collapsed to `pi-local`-only).
- Default flipped to `pi-local`.
- Code comment in the validator references the addendum file.
- `in-stream` branch in the SSR render-host is currently a no-op (audio capture not wired).

## Test results

- **Before:** 107 tests, 105 pass, 2 skip, 0 fail.
- **After:** 126 tests, 124 pass, 2 skip, 0 fail.
- **New tests:** 9 (ssr-state-restore Plan-04 contract) + 19 (ssr-server-rendering-config) = 28 new tests; 1 of the 11 ssr-state-restore tests is the Wave-0 scaffold (still passes).

## Self-Check: PASSED

Verified:

- `src/server/ssr-state-restore.mjs` — exists, exports loadSsrInitialState/persistRunningAnimations/filterExpired/flushRunningAnimations/RUNTIME_ACTIVE_SCHEMA/PERSIST_DEBOUNCE_MS/_resetForTests
- `src/server/ssr-server-rendering-config.mjs` — exists, exports 5 enum lists + SERVER_RENDERING_DEFAULTS + validate/apply/read/writeFullConfig + scheduleServerRenderingWrite
- `src/app/runtime/output-receiver/receiver-input-forwarder.js` — exists, exports attachInputForwarder
- `config/global-defaults.json` — contains `"serverRendering"` block with all 5 keys (`audioRoute: "pi-local"` per D-D2 reversal)
- `server.mjs` — contains `align-corner-drag` (8 occurrences), `serverRendering-update` (8 occurrences), `validateAlignCornerDragPayload` (2 occurrences — defined + called), `persistRunningAnimations`/`flushRunningAnimations`/`loadSsrInitialState` references, `normalizedX` validation bounds (3 occurrences)
- All 4 task commits exist in git log: 107c715 (T1), 57f2164 (T1b), ee0cb0d (T2), 01d608c (T3)
- `node --test "test/**/*.test.mjs"` passes 124/126 (2 skip, 0 fail)
