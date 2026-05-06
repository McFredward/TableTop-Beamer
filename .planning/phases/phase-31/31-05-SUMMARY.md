---
phase: 31
plan: 05
plan_id: 31-05
subsystem: ssr-pivot-wave5
tags: [ssr, hotfix-audit, runtime-env, server-vs-pi-gating, settings-ui, publishability, d-d2-reversal, dashboard-preview]

# Dependency graph
requires:
  - phase: 31-00
    provides:
      - "test/ssr-audio-capture-smoke.test.mjs (D-D2 reversal scaffold; t.skip()'d)"
  - phase: 31-01
    provides:
      - "src/server/ssr-render-host.mjs (resolveEncoderConfig + bootSsrRenderHost / shutdownSsrRenderHost / setActiveSsrRenderHost — used for encoder-change restart)"
      - "src/server/server-encoder-detect.mjs (auto-detection list feeds the badge)"
  - phase: 31-02
    provides:
      - "/api/live/ws live-sync channel (LIVE_MUTATION_TYPES already extended for serverRendering-update in Plan 04)"
  - phase: 31-03
    provides:
      - "src/app/runtime/output-receiver/receiver-bootstrap.js (also reused by ?ssr-preview=1 dashboard preview path)"
      - "data-ssr-tab + data-output-role CSS hide selectors (extended to data-ssr-preview)"
  - phase: 31-04
    provides:
      - "src/server/ssr-server-rendering-config.mjs (5 enum exports + validateServerRenderingPatch + applyServerRenderingPatch + scheduleServerRenderingWrite)"
      - "config/global-defaults.json#serverRendering with conservative-but-capable defaults (D-D2 reversal applied: audioRoute='pi-local')"
      - "server.mjs serverRendering-update mutation handler (validate→apply→persist→broadcast)"
provides:
  - ".planning/phases/phase-31/31-HOTFIX-AUDIT.md — complete inventory of Phase-30 hotfixes T4..T16 with classification (server-keep / pi-only / dashboard-only / regression-risk)"
  - "src/app/lib/shared/runtime-env.js — extended with `getRuntimeEnvironment()` returning 'pi'/'server-ssr'/'desktop' + ARM-UA defense-in-depth"
  - "src/app/runtime/render/runtime-gif-decoder.js — T7+T15 GIF max-dim cap (256 px) gated behind `getRuntimeEnvironment() === 'pi'` (server keeps native resolution)"
  - "src/app/runtime/render/runtime-gif-playback.js — T12 WARM_DECODE_TIMEOUT_MS = pi ? 30000 : 5000 (server returns to original 5 s budget)"
  - "test/runtime-env-environment.test.mjs — 11 unit tests (8 helper behaviors + 3 gate-presence guards)"
  - "src/app/lib/ui/settings/server-rendering-panel.js — initServerRenderingPanel(deps) IIFE module wires the 5 form controls + Detected-encoders badge against /api/global-defaults + emitLiveMutation('serverRendering-update', patch)"
  - "index.html — new <section id='settings-server-rendering'> with all 5 controls (encoder dropdown, qualityPreset/resolutionPreference/fpsTarget radios, audioRoute toggle) + #ssr-detected-encoders-badge"
  - "src/styles.css — Phase-22-themed styles for the new section (.ssr-radio-group + .ssr-detected-encoders-badge); preview-mode hide-rule extension (data-ssr-preview)"
  - "src/app/runtime/core/runtime-dom-refs.js — 7 new ssr* refs (encoder/preset/resolution/fps/audio/badge/status)"
  - "src/app/runtime/runtime-orchestration.js — destructures + forwards refs into wireRoomAudioBinders ctx; adds emitLiveMutation forward; adds ?ssr-preview=1 dashboard preview hook"
  - "src/app/runtime/wire/runtime-wire-room-audio-binders.js — invokes initServerRenderingPanel(ctx) alongside other System-tab control wiring"
  - "server.mjs — encoder-change restart (shutdownSsrRenderHost → bootSsrRenderHost when payload.encoder is patched, gated behind SSR_RENDER_HOST=1); /api/global-defaults enriched with serverRendering.availableEncoders for the badge"
affects:
  - "31-06 (Wave 6): UAT scenarios for Pi-class GIF quality (regression-risk hotfix gate verification), System-UI roundtrip (5 controls + badge), encoder change → reconnect banner, dashboard preview ?ssr-preview=1 path"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "runtime-environment classification helper (`getRuntimeEnvironment()`) with ARM-UA defense-in-depth — Pi can never accidentally hit the no-cap branch even if URL is tampered with (RESEARCH § Pitfall 3 + § Risk 3 mitigation)"
    - "Hotfix gate idiom: `const __ttbEnv = (typeof window !== 'undefined' && window.TT_BEAMER_RUNTIME_ENV?.getRuntimeEnvironment?.()) ?? 'pi'; if (__ttbEnv === 'pi') { /* defensive code */ }` — fallback to 'pi' preserves Phase-30 behavior when helper is unavailable"
    - "Settings-panel IIFE module on `window.TT_BEAMER_SETTINGS_*` mirroring existing src/app/lib/ui/settings/* convention; init invoked from the wire-binder so the dependency graph stays linear (no new bootstrap stage)"
    - "Live-sync emit forwarding through ctx — pre-existing emitLiveMutation function reused (NO new server endpoint, NO new mutation type — Plan 04 already added serverRendering-update)"
    - "Encoder-change side-effect: server-side shutdownSsrRenderHost + bootSsrRenderHost picks up the patched encoder on next launch via resolveEncoderConfig re-reading config/global-defaults.json — Pi's reconnect banner from Plan 03 D-C2 fires automatically"
    - "Dashboard preview opt-in via ?ssr-preview=1 query flag — query-flag pattern consistent with ?ssr=1 (Plan 03); default dashboard keeps existing render pipeline as Hybrid fallback per RESEARCH § Q3"
    - "D-D2 reversal preserved at all layers: HTML disabled attribute on the in-stream toggle + tooltip + JS-side WAVE0_AUDIO_CAPTURE_VERIFIED feature flag refusing the patch; future flip requires only flipping the const"

key-files:
  created:
    - ".planning/phases/phase-31/31-HOTFIX-AUDIT.md"
    - "src/app/lib/ui/settings/server-rendering-panel.js"
    - "test/runtime-env-environment.test.mjs"
    - ".planning/phases/phase-31/31-05-SUMMARY.md"
  modified:
    - "src/app/lib/shared/runtime-env.js (added getRuntimeEnvironment + exposed on TT_BEAMER_RUNTIME_ENV)"
    - "src/app/runtime/render/runtime-gif-decoder.js (T7+T15 cap gate)"
    - "src/app/runtime/render/runtime-gif-playback.js (T12 timeout gate)"
    - "index.html (new <section id='settings-server-rendering'> + script tag for the panel module)"
    - "src/styles.css (settings-server-rendering theme + data-ssr-preview hide-rule extension)"
    - "src/app/runtime/core/runtime-dom-refs.js (7 ssr* refs)"
    - "src/app/runtime/runtime-orchestration.js (refs destructure + ctx forward + emitLiveMutation forward + ?ssr-preview=1 hook)"
    - "src/app/runtime/wire/runtime-wire-room-audio-binders.js (initServerRenderingPanel invocation)"
    - "server.mjs (encoder-change restart + /api/global-defaults availableEncoders enrichment)"

key-decisions:
  - "Audit document is the source-of-truth blueprint for Task 2's gating. Each row references the file:line range, the hotfix's Phase-30 rationale, the SSR-tab vs Pi behavior implication, and the gate decision. T4 / T13 / T14 / T16 = server-keep (environment-agnostic or beneficial in both); T7+T15 = regression-risk (256 px GIF cap reduces SSR quality before the Pi-side <video> upscale → visible quality loss); T12 = pi-only (30 s warm timeout is needed for Pi VC4 12-15 s slime parse but masks server-side stalls). T11 already dashboard-only-gated (kept untouched). Outside-mp4 + draw-loop NOT modified."
  - "ARM-UA defense-in-depth in `getRuntimeEnvironment` clamps to 'pi' regardless of URL when the UA matches /armv7l|armv8|aarch64/i. The intuition: a Pi can never legitimately produce ?ssr=1 because the SSR Chromium tab spawns on the server x86_64 hardware (RESEARCH § Q1). The worst case is a misclassified ARM machine running Pi-class code that doesn't need it (no quality regression beyond Phase-30 baseline). The opposite misclassification (server thinking it's Pi) is the failure mode we explicitly want to prevent — and it can't happen via UA inspection."
  - "Helper-fallback idiom: `(window.TT_BEAMER_RUNTIME_ENV?.getRuntimeEnvironment?.()) ?? 'pi'`. If the helper is somehow unavailable (script load order regression, browser quirk), the gate defaults to 'pi' — Phase-30 behavior preserved. Failure mode is conservative."
  - "TDD for the helper + gates: failing test committed first (RED), then helper + gates added (GREEN). The test extracts the function source via brace-walking with parameter-list-aware paren depth (handles destructuring-default `{ ... } = {}` correctly) and evals it with stub inputs in a Node sandbox — no jsdom dependency added."
  - "D-D2 reversal compliance: the audioRoute checkbox in the System UI defaults to UNCHECKED (= pi-local). The 'in-stream' option is rendered DISABLED via HTML `disabled` attribute + tooltip ('Currently deferred — requires cross-platform audio capture support'). The JS panel ALSO refuses to send `audioRoute='in-stream'` while the WAVE0_AUDIO_CAPTURE_VERIFIED feature flag is false (defense-in-depth). When the future audio-capture path stabilises, flipping the const + removing the `disabled` attribute is a one-line change."
  - "System UI panel uses /api/global-defaults for the initial config snapshot (existing endpoint, no new mutation needed). The Plan-04 server validator + 200 ms debounced writer already plumb the round-trip — the UI just emits `serverRendering-update` partial-patch mutations and re-fetches /api/global-defaults to confirm. availableEncoders is a passive snapshot field enriched server-side at the GET response, NOT validated by the patch validator (which silently drops unknown keys per Plan-04 design)."
  - "Encoder-change restart is gated behind `SSR_RENDER_HOST === '1'`. Standard `node server.mjs` runs (used by 124+ unit tests + non-SSR development) DO NOT trigger the SSR-tab restart even when the encoder field is patched — keeps the existing test suite + dev-loop fully unchanged."
  - "Dashboard preview ?ssr-preview=1 is opt-in only. Default dashboard URL keeps the existing local render pipeline (Hybrid fallback per RESEARCH § Q3). The CSS extension (data-ssr-preview hide selectors) reuses the same DOM-hide list as Pi /output/. Plan 06 UAT decides whether to flip the default."

patterns-established:
  - "Pure-function browser-IIFE testing pattern: extract function source by walking braces (with paren-aware param-list skip), eval into a callable via `new Function(fnSrc + 'return name;')`, exercise with stubbed `window`/`navigator` argument objects. Lets us unit-test browser-only code without jsdom."
  - "Settings-panel auto-discovery pattern: `window.TT_BEAMER_SETTINGS_*` exposes init function; the wire-binder defensively checks for the global at runtime and no-ops if missing. Keeps cross-cut wiring loosely coupled."
  - "Snapshot enrichment pattern: liveSessionState.snapshot.serverRendering.availableEncoders is set ONCE at SSR boot (read-only side-channel) and merged into /api/global-defaults responses on each GET. Avoids inventing a new endpoint for what is conceptually a config-adjacent diagnostic field."

# Test summary
test_count_before: 126
test_count_after: 137
test_pass_after: 135
test_skip_after: 2
test_fail_after: 0
new_tests:
  - "11 runtime-env-environment tests (1 source-presence guard + 7 getRuntimeEnvironment behaviors + 2 gate-presence guards in gif-decoder/playback + 1 server-keep guard for outside-mp4/draw-loop unchanged)"

# Risk register coverage (from PLAN <threat_model>)
threats_mitigated:
  - "T-31-05-01 (Tampering — Pi spoofs ?ssr=1 to disable hotfixes): ARM-UA defense in getRuntimeEnvironment clamps to 'pi' regardless of URL claim — Pi cannot accidentally hit the no-cap branch"
  - "T-31-05-03 (DoS — misconfigured gate causes loop in decode path): gates are simple boolean branches; 11 tests cover all 4 env classifications including ARM-UA edge cases"
threats_not_addressed:
  - "T-31-05-02 (Information disclosure — runtime env classification leaked via window global): accepted per plan threat model — LAN kiosk; runtime env is operational metadata, no PII"

# Metrics
duration: ~11 min
completed: 2026-05-06
---

# Phase 31 Plan 05: Wave 5 — Phase-30 Hotfix Audit + System & Performance UI Summary

Wave 5 closes the Phase-30 hotfix audit gap (Pitfall 3 + Risk 3 in
`31-RESEARCH.md`) by introducing a runtime-environment classification helper,
gating Pi-only and regression-risk hotfixes behind it, and surfacing the
publishability `serverRendering` config schema to operators via a new System &
Performance subtab section with all 5 controls plus a read-only Detected-encoders
badge. Dashboard-preview shared-stream is added as an opt-in (`?ssr-preview=1`).

## What was built

### Task 1 — Hotfix audit document (`.planning/phases/phase-31/31-HOTFIX-AUDIT.md`)

Classification table for every Phase-30 hotfix marker in
`src/app/runtime/render/`:

| Hotfix | File | Class | Gate Required |
|--------|------|-------|---------------|
| T4 | runtime-draw-loop.js:480-526 | server-keep | NO |
| T7 | runtime-gif-decoder.js:425-462 | regression-risk | YES |
| T11 | runtime-gif-playback.js:138-149 | dashboard-only | NO (already gated) |
| T12 | runtime-gif-playback.js:316-325 | pi-only | YES |
| T13 | runtime-draw-loop.js:498-526 | server-keep | NO |
| T14 | runtime-gif-decoder.js:254-280 | server-keep | NO |
| T15 | runtime-gif-decoder.js:25-34 | regression-risk | YES (same site as T7) |
| T16 | runtime-outside-mp4.js:31-40 | server-keep | NO |

Plus the verification plan + Phase-12/13/26/28/29/30 non-regression contract
table — the source-of-truth Task 2 uses to scope the gates.

### Task 2 — `getRuntimeEnvironment` helper + Pi-only gates

`src/app/lib/shared/runtime-env.js` extended with `getRuntimeEnvironment()`:

- Returns `'pi' | 'server-ssr' | 'desktop'`.
- ARM-UA defense-in-depth (`/armv7l|armv8|aarch64/i`) clamps to `'pi'`
  regardless of URL — Pi cannot legitimately produce `?ssr=1` because the
  SSR Chromium tab is server-spawned on x86_64 (RESEARCH § Q1).
- Pure function — accepts `{location, userAgent}` injection for
  testability; defaults read `window.location` / `navigator.userAgent`.

Hotfix gates (per audit):

- **runtime-gif-decoder.js T7+T15:** wraps the `dsScale = Math.min(1, GIF_MAX_PIXEL_DIM/...)`
  cap-application code. When env === 'pi' the existing cap fires; otherwise
  `dsScale = 1` (no downscale). Server-side SSR tab now decodes GIFs at native
  resolution → Pi `<video>` displays full-quality stream.
- **runtime-gif-playback.js T12:** `WARM_DECODE_TIMEOUT_MS = env === 'pi' ? 30000 : 5000`.
  Server returns to the original 5 s budget; Pi keeps the 30 s budget.

NOT modified (server-keep classification):
- `runtime-outside-mp4.js` (T16 freshness window — environment-agnostic)
- `runtime-draw-loop.js` (T4 final-output bypass + T13 capture-every-5-frames — beneficial in both)

11 new unit tests in `test/runtime-env-environment.test.mjs`:
- Source-presence guards (helper defined + exported, ARM-UA regex present, `server-ssr` literal).
- Behavior tests via brace-walking source-extract → eval-into-callable: `?ssr=1` → 'server-ssr'; `/output/` no-ssr → 'pi'; `/output` (no slash) → 'pi'; `/` → 'desktop'; `/dashboard` → 'desktop'; ARM-UA + `?ssr=1` → 'pi'; aarch64 UA → 'pi'.
- Gate-presence guards in gif-decoder + gif-playback.
- Server-keep guard: outside-mp4 + draw-loop have NO `getRuntimeEnvironment` reference.

### Task 2b — System & Performance subtab `Server-side Rendering` section

New `<section id="settings-server-rendering">` in `index.html` with the same
`.panel.settings-only view-hidden` wrapper as the neighbouring Render-mode +
MP4-performance sections. Five controls + read-only badge:

1. **Encoder dropdown** (`auto / nvenc / vaapi / videotoolbox / x264-software`).
2. **Stream-quality preset radios** (`low-latency / balanced / high-quality`).
3. **Resolution preference radios** (`auto / 1080p / 720p`).
4. **Stream FPS target radios** (`30 / 24 / 15`).
5. **Audio-route toggle** — D-D2 REVERSAL COMPLIANT: defaults UNCHECKED
   (= pi-local); rendered DISABLED with tooltip ("Currently deferred —
   requires cross-platform audio capture support"). The JS panel also
   refuses to flip to in-stream while `WAVE0_AUDIO_CAPTURE_VERIFIED === false`
   (defense-in-depth).
6. **Detected encoders badge** (read-only, comma-separated list from
   server-side auto-detection).

Wiring: `src/app/lib/ui/settings/server-rendering-panel.js` exposes
`initServerRenderingPanel(deps)` on `window.TT_BEAMER_SETTINGS_SERVER_RENDERING_PANEL`.
Invoked from `runtime-wire-room-audio-binders.js` alongside the other
System-tab controls; emits Plan-04's existing `serverRendering-update`
mutation; reads initial state from `/api/global-defaults`.

Server-side encoder-change side-effect (server.mjs): when the patched key
includes `encoder` AND `SSR_RENDER_HOST === '1'`, calls
`shutdownSsrRenderHost()` followed by `bootSsrRenderHost()` — the
lifecycle module re-reads config at boot via `resolveEncoderConfig` so the
new encoder takes effect on the next launch. Pi reconnect banner from
Plan 03 D-C2 fires automatically. Server boot also captures
`encoderConfig.available` into `liveSessionState.snapshot.serverRendering.availableEncoders`,
which is then merged into the GET `/api/global-defaults` response so the
badge displays the auto-detection list.

Manual UAT note (deferred to Plan 06): open dashboard System & Performance,
change each of the 5 controls, observe `[ssr-signal] action=serverRendering-update`
log on server, reload dashboard, confirm UI reflects the new value; change
encoder, observe SSR-tab restart + Pi reconnect banner.

### Task 3 — Dashboard preview shared-stream hook

`?ssr-preview=1` query flag opt-in. When present:
- `document.body.dataset.ssrPreview = "true"`.
- `document.body.dataset.outputRole = "final-output"`.
- Receiver-bootstrap dynamic-imports + boots (same path as Pi /output/).

CSS extension: hide-selectors that previously matched
`body[data-output-role="final-output"]:not([data-ssr-tab="true"])` now also
match `body[data-ssr-preview="true"]` — the dashboard's render canvas chrome
is hidden in preview mode while D-D3/D-B4 status overlays remain visible.

Default dashboard (no flag) keeps existing render pipeline — Hybrid fallback
per RESEARCH § Q3 ("dashboard renders locally; Pi receives stream"). Plan 06
UAT decides whether to flip the default.

## Deviations from Plan

None — plan executed as written. The plan's runtime-env testing strategy
suggested a grep-based pattern check; I implemented a more thorough
brace-walking source-extract → eval-into-callable test harness so the
helper's behavior is unit-tested with real inputs rather than just
spot-checked via regex. No additional dependencies (no jsdom).

The plan's `<verify>` block referenced `# fail 0$` regex; node test runner
output uses `ℹ fail 0` — same semantic check, the grep would not match
verbatim. I verified test status by inspecting full output (`135 pass, 2
skipped, 0 fail`) which exceeds the plan's bar.

## Authentication gates

None encountered.

## Manual UAT (deferred to Plan 06)

| Scenario | Expected |
|----------|----------|
| Open dashboard `/` System & Performance subtab | Server-side Rendering section visible with all 5 controls + Detected badge |
| Change encoder dropdown (with SSR_RENDER_HOST=1) | Status line "Restarting render server (encoder change)…"; Pi sees reconnect banner ~5 s; stream resumes with new encoder |
| Change qualityPreset/resolution/fps radio | Status line "Server-side rendering: applying…"; persists to `config/global-defaults.json#serverRendering`; reload page → UI reflects |
| Click in-stream toggle | Disabled; cannot toggle; tooltip shows deferral message |
| Open `/?ssr-preview=1` on dashboard | Render canvas hidden; receiver-bootstrap visible; consumes same WebRTC stream as Pi |
| Open `/?ssr=1` on dashboard | SSR tab marker set; existing canvas visible; render pipeline runs (publisher path) |
| Pi /output/ on ARM hardware (server-side render OFF) | T7+T15 256 px cap fires (ARM-UA defense); GIF quality matches Phase-30 baseline |
| Pi /output/ on ARM hardware (SSR ON) | Stream-only path; T7+T15+T12 inactive in the rendering tab on server (which is x86_64, env='server-ssr'); full-quality GIFs in stream |

## Self-Check: PASSED

Commits (in order):
- `176503a` docs(31-05-T1): add Phase-30 hotfix audit + classification
- `2cb7fe8` test(31-05-T2): add failing tests for getRuntimeEnvironment + Pi gates
- `af8083d` feat(31-05-T2): runtime-env helper + Pi-only Phase-30 hotfix gates
- `9aff33e` feat(31-05-T2b): System & Performance — Server-side Rendering UI section
- `eb5dd79` feat(31-05-T3): dashboard preview shared-stream hook (?ssr-preview=1)

Files verified:
- `.planning/phases/phase-31/31-HOTFIX-AUDIT.md` — present, 8 hotfix rows, all 4 classifications, 6 phase contracts
- `src/app/lib/shared/runtime-env.js` — `function getRuntimeEnvironment` + `getRuntimeEnvironment,` in exports + ARM regex
- `src/app/runtime/render/runtime-gif-decoder.js` — `getRuntimeEnvironment` + `=== 'pi'` branch present
- `src/app/runtime/render/runtime-gif-playback.js` — `=== 'pi' ? 30000 : 5000` ternary present
- `src/app/runtime/render/runtime-outside-mp4.js` — UNCHANGED (server-keep — verified by test)
- `src/app/runtime/render/runtime-draw-loop.js` — UNCHANGED (server-keep — verified by test)
- `index.html` — `<section id="settings-server-rendering">` + 5 controls + badge + script tag
- `src/app/lib/ui/settings/server-rendering-panel.js` — created, exports `initServerRenderingPanel`
- `src/styles.css` — settings-server-rendering theme + data-ssr-preview hide-rule
- `src/app/runtime/core/runtime-dom-refs.js` — 7 ssr* refs registered
- `src/app/runtime/runtime-orchestration.js` — refs forwarded + emitLiveMutation forwarded + ?ssr-preview=1 hook
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — initServerRenderingPanel invocation
- `server.mjs` — encoder-change restart + /api/global-defaults availableEncoders enrichment
- `test/runtime-env-environment.test.mjs` — 11 new tests, all green
- Full test suite: 137 tests, 135 pass, 2 skipped, 0 fail

*Phase: 31-server-side-rendering-pivot · Plan 05 · Wave 5 complete · 2026-05-06*
