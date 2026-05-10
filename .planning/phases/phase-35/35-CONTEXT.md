---
phase: 35
phase_id: 35
title: Thin /output/ Refactor + Align-Mode Decoupling + Banding Fix — Context
status: Ready for research + planning
gathered: 2026-05-10
---

# Phase 35: Thin /output/ Refactor + Align-Mode Decoupling + Banding Fix — Context

**Gathered:** 2026-05-10
**Status:** Ready for research + planning
**Source:** Phase 34 closure addendum (`34-CLOSURE-ADDENDUM.md`) + post-UAT discussion

<domain>
## Phase Boundary

Phase 34 delivered the URL-split conceptually (`/output/` thin, `/ssr` full app) but with three deferred defects:

1. **Align-mode UI is missing on the thin `/output/`** — the polygon-editor + projection-handle-ui code that renders vertex handles + grid lines is tightly coupled to the dashboard's `runtime-orchestration` init chain (injected refs for `grid-state`, `applyTransform`, `profileSaveFlow`, `ctx`, etc.). When `output.html` was made thin, this coupling meant align-mode visuals are not present. Pointer-events ARE forwarded by `receiver-input-forwarder` (Wave-4 minimum), but the operator cannot SEE the handles to know what they're dragging.

2. **Live-sync minimal subset is undefined** — the audio-binder in `output.html` works because it opens its own thin WS connection. But the align-mode (Track A above) needs the same kind of WS subscription to receive the active-projection-profile + alignMode state. Today's `runtime-live-sync-core.js` (~800 LOC) does much more than the thin /output/ needs. A clean minimal-subset extraction is needed.

3. **Solid-color banding** — Phase 34 confirmed via Playwright side-by-side that encoder-bitrate is NOT the lever (2 Mbps and 32 Mbps screenshots are visually identical). Banding originates in the SSR-tab 2D-canvas software fallback (8-bit-per-channel precision on `colorHex` overlays with non-1.0 opacity). Track A T1's GL-flag attempt to enable hardware GL reproduced the Phase-33-class main-thread-hang and was reverted. A different fix path is required.

**Phase 35 closes all three.** Plus a non-negotiable Wave-0 mandate: a **live-end-to-end smoke-test** must exist BEFORE any code change. Phase 34's miss came from automated tests asserting code shape but never live-loading `/output/` with both Tracks landed.

**Test hardware:**
- Server: Lenovo IdeaCentre Mini, Intel Core 7 240H, Raptor Lake-P iGPU, Mesa llvmpipe under Xvfb, Linux
- Client browsers: gaming-PC desktop browser (primary visual + functional smoketest), Pi 4 (deferred Pi-hardware UAT — same pattern as Phase 33/34)
- Network: gigabit ethernet LAN

**Trigger:** Operator-reported defects after Phase 34 first /output/ UAT (2026-05-10):
- "Der align mode funktioniert nicht mehr"
- "Die Streifen sind immer noch da"

**Phase 34 outcomes carried forward (LOCKED, do not re-open):**
- D-A1: WebRTC + h264 + mediasoup architecture
- D-A3: Headful Chromium 131 + Xvfb + puppeteer-stream
- Pi-local audio (D-D2 reversal)
- Server-authoritative state
- VAAPI default-disabled (Phase 33 commit `3cd6748`)
- Phase 34 hotfix h1: `/ssr` → `OUTPUT_ROLE_FINAL` classification in `resolveOutputRoleFromLocation`
- Phase 34 hotfix h2: GL flags (`--ignore-gpu-blocklist`, `--enable-gpu-rasterization`) gated on `hasVaapiEnabled` (Phase 33 baseline restored)
- Track B URL split (`/output/` → `output.html` thin, `/ssr` → `index.html` full app, `?ssr=1` removed)
- Phase 33 frame-stale 30s + keyframe-on-resume + heartbeat-reset + RPC 20s + watchdog 150s tolerance
- `streamFpsCap` + `alignModeBoost` settings (Phase 32 Block A)

**Explicit OUT of scope:**
- Animation engine refactor (separate domain)
- Audio path changes (Pi-local stays per D-D2)
- Codec change away from H264
- WAN/TURN/Internet routing
- VAAPI re-enable as default (stays opt-in via `SSR_ENABLE_VAAPI=1`)
- New animation types or render features
- Phase-32-FPS-lift work beyond what's already landed

</domain>

<decisions>
## Implementation Decisions

### D-01: Track A — Pure-extract refactor for align-mode (LOCKED)

The `polygon-editor` + `projection-handle-ui` + `projection-handle-drag` + `projection-mapping` modules will be refactored to expose an explicit `bootAlignMode({ ... })` API. All currently-injected refs become explicit named arguments — `grid-state`, `applyTransform`, `profileSaveFlow`, `profileLoadFlow`, `profileDeleteFlow`, `gridState`, `ctx`, etc.

**Constraints:**
- Dashboard's existing wiring must continue to work — refactor is additive, not breaking. Dashboard re-uses the new `bootAlignMode()` instead of relying on dynamic init-side-effects.
- The new API is the SINGLE source of truth — no duplicated logic between dashboard and `output.html`.
- Approximate scope: ~3000 LOC across 4 files (`runtime-projection-handle-ui.js` 1756, `runtime-projection-handle-drag.js` 941, `runtime-projection-mapping.js` 431, `runtime-polygon-editor.js` 575 — totals 3703 lines but only the boundaries change, internal logic stays).

**Why pure-extract over hybrid (`thin-mode` flag):** A flag in `runtime-orchestration` would still load all dashboard modules in `output.html`, defeating the thin-consumer goal. Pure-extract is the bigger diff but the only path that actually delivers a thin `/output/`.

**Why not move-to-output-receiver:** That would imply the dashboard ALSO loads from `output-receiver/` which is structurally weird (the directory name implies thin-consumer-only). Pure-extract leaves the modules in their current `viewport/` + `polygon-editor/` directories with cleaner APIs.

### D-02: Track B — Minimal live-sync subscription extraction (LOCKED)

Extract a small subscription module (target: ≤200 LOC) from `runtime-live-sync-core.js` that does ONLY:
- Open WS to `/api/live/ws?role=final-output`
- Auto-reconnect with exponential backoff
- Parse `live-mutation` envelopes
- Expose subscription callbacks: `onAnimationStart`, `onAnimationStop`, `onClearAll`, `onAlignModeChange`, `onProjectionProfileChange`, `onConnect`, `onDisconnect`

This module is consumed by:
- `output-audio-binder.js` (already similar in spirit; will be refactored to consume the new shared module)
- The new `bootAlignMode()` API (D-01) for state-tracking

The full `runtime-live-sync-core.js` keeps existing dashboard-side semantics. Only the subscription primitive is extracted; the snapshot-merging / state-reconciliation logic stays in the dashboard path.

### D-03: Track C — Banding fix sequence: C1 dithering first, C2 SwiftShader fallback (LOCKED)

**C1 (primary, default):** Source-side pseudo-random dithering in the 2D-canvas color-overlay rendering. Apply low-amplitude noise (±1-2 8-bit values) when drawing solid-color room overlays. Bayer-matrix or blue-noise dithering — researcher chooses based on FPS/quality tradeoff.

**C2 (fallback, only if C1 visually insufficient):** Try `--use-gl=swiftshader` instead of `--use-gl=angle` in Chrome args. SwiftShader is Google's pure-software OpenGL ES implementation with 16-bit-fp internal precision. If C1 dither is visually sufficient, do NOT touch the GL backend — preserve Phase 33/34 connection-stability baseline.

**C3 (deferred):** `SSR_ENABLE_VAAPI=1` opt-in test on the operator's hardware. If user opts in after Phase 35 close and confirms no hang, the GL flags + VAAPI features re-enable. Not part of Phase 35 scope.

**Visual confirmation gate:** D-06 visual smoketest (operator on gaming-PC desktop browser, known solid-color animation, before/after comparison screenshots) must show no visible step-bands.

### D-04: Banding fix priority over FPS (LOCKED)

The dithering implementation may cost up to 5 FPS. **Acceptable down to ~25fps stream output.** Below 25fps, fallback path C2 must be tried. The trade-off: solid-color visual quality is more important than peak FPS for the operator's use case (they prioritize banding-free over silky-smooth).

Researcher MUST measure FPS impact of C1 dithering on the test hardware and report — both at 1080p@30fps target and 1080p@60fps target. If under 25fps, escalate to C2 in the same plan.

### D-05: Wave-0 live-end-to-end smoke-test mandate (LOCKED, BLOCKING)

Before any production code is changed in Phase 35, Wave-0 produces:
- A test that programmatically starts the server (via `scripts/with_server.py` or equivalent)
- Loads `/output/` in Playwright with `executable_path=/opt/google/chrome/chrome` (system Chrome, H264-capable)
- Verifies (a) `videoReadyState === 4` within 10s, (b) `videoCurrentTime > 5` after 8s of wait, (c) `getComputedStyle(body).backgroundColor === "rgb(0, 0, 0)"`, (d) zero `health ping failed` entries in server log

After Track A lands, Wave-0 is extended to verify (e) align-mode toggle activates handles in DOM (handle elements exist + are visible when alignMode=true), (f) pointer-drag-events on handles trigger `align-corner-drag` mutations (server-side WS message log).

This rail is in `test/connection-stability/` or a new `test/live-e2e/` and runs in CI. **Phase 35 cannot close without this rail GREEN at every wave.**

**Reasoning:** Phase 34's automated tests passed (16 Wave-0 rails GREEN, plan-checker 11/11, verifier all must_haves) but two real bugs slipped through. The miss was that no test EVER live-loaded `/output/` with both Tracks together. Live E2E is the missing layer.

### D-06: Connection-stability hard gate (LOCKED, NON-NEGOTIABLE)

`test/connection-stability/**` must stay 72 pass / 0 fail / 13 skip throughout Phase 35. Every commit that touches `ssr-render-host.mjs`, `ssr-stream-publisher.mjs`, `ssr-webrtc-signaling.mjs`, `receiver-bootstrap.js`, or `runtime-env.js` runs the full connection-stability suite as a regression-check task. **No exceptions.**

VAAPI default-disabled (Phase 33 commit `3cd6748`) UNCHANGED. The `hasVaapiEnabled` gate from Phase 34 hotfix h2 UNCHANGED.

### D-07: Plans 35-A, 35-B, 35-C can run sequential or parallel — planner judges (LOCKED)

Track A (refactor), Track B (live-sync extract), Track C (banding) are conceptually independent. Track A depends on B (align-mode wants the new live-sync sub). Track C is fully independent. Suggested ordering: W0 → B → A → C → V. Planner has discretion to parallelize A/B if dependency-graph allows.

### D-08: Pi-hardware UAT deferred until hardware accessible (CARRY-FORWARD pattern)

Same pattern as Phase 33 + 34: gaming-PC desktop browser smoketest is the Phase-close gate. Pi-hardware visual-and-CPU UAT items are explicitly deferred to operator hardware testing. `35-HUMAN-UAT.md` documents Pi items separately as `status: deferred`.

### Claude's Discretion
- Exact dithering algorithm (Bayer 4×4, blue-noise, white-noise) — researcher chooses based on FPS/visual measurement.
- Exact API shape for `bootAlignMode({ ... })` — researcher proposes, planner formalizes. Constraint: must be callable from `output.html` script-tag with explicit args.
- Whether `runtime-projection-handle-ui.js` etc. are split into smaller files — refactoring concern, planner judges.
- Live-sync minimal subset module file location — `src/app/runtime/live-sync/runtime-live-sync-thin.js` is one possibility; `src/app/runtime/output-receiver/output-live-sync.js` is another. Planner picks based on existing patterns.

</decisions>

<assumptions>
## Working Assumptions (verify or invalidate during research)

- **A1: `bootAlignMode()` is achievable as pure-extract.** The handle-ui's "injected refs" are reads from a few well-defined globals. Verifying: enumerate every `window.TT_BEAMER_*` and every closure-captured ref currently used; check none are mutated bidirectionally with the dashboard's other state.

- **A2: 2D-canvas dithering is FPS-affordable on Lenovo Mini.** ~5 FPS impact at 1080p@30fps is the working assumption. Researcher must measure on actual hardware before locking C1 as the path.

- **A3: SwiftShader doesn't have the synchronous-flush hang.** Research must verify — SwiftShader's threaded backend doesn't sync-flush per paint call (unlike Mesa-llvmpipe through ANGLE). If SwiftShader DOES hang too, C2 falls through and only C1 (dither) remains.

- **A4: Track A's pure-extract doesn't regress the dashboard's existing align-mode UX.** The refactor is additive — dashboard wires the same modules through the new API. Visual verification of dashboard align-mode is a Wave-V regression check.

- **A5: Live-E2E smoke-test is stable in CI.** Headless Xvfb + system Chrome + server-spawn might be flaky. If flake rate >5% across 20 CI runs, the test is allowed-to-skip with a logged warning, not a CI-fail. Researcher recommends concrete flake-handling strategy.

- **A6: 200 LOC is achievable for the minimal live-sync extract.** If actual minimum is >400 LOC, the refactor scope grows. Planner re-scopes.

</assumptions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 34 closure (mandatory)
- `.planning/phases/phase-34/34-CLOSURE-ADDENDUM.md` — Defines all three Phase 35 tracks. Authoritative scope source.
- `.planning/phases/phase-34/34-CLOSURE.md` — Original (premature) closure; superseded by addendum.
- `.planning/phases/phase-34/34-CONTEXT.md` — Locked decisions D-01..D-07 (carrying forward).
- `.planning/phases/phase-34/34-RESEARCH.md` — Hardware findings, three pitfalls, validation architecture pattern.

### Phase 33 (carry-forward)
- `.planning/phases/phase-33/33-CLOSURE.md` — VAAPI default-disabled root-cause + the hard rule against re-enabling without operator opt-in.
- `.planning/phases/phase-33/33-SUMMARY.md` — Defensive layers (frame-stale 30s, RPC 20s, watchdog 150s).

### Roadmap
- `.planning/ROADMAP.md` §"Phase 35" — Three tracks, milestones, exit criteria.

### Source — Track A (refactor targets)
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` (1756 LOC) — DOM lifecycle for handles, line canvas, context menu.
- `src/app/runtime/viewport/runtime-projection-handle-drag.js` (941 LOC) — drag handlers split out from handle-ui.
- `src/app/runtime/viewport/runtime-projection-mapping.js` (431 LOC) — projection math, applyTransform.
- `src/app/runtime/polygon-editor/runtime-polygon-editor.js` (575 LOC) — polygon vertex management.
- `src/app/runtime/runtime-orchestration.js` lines 50-122 + the polygon-editor init section — current implicit-injection wiring.
- `src/styles.css` line 119 — `.align-mode-active #room-overlay` CSS rule that gates handle visibility.
- `src/app/runtime/output-receiver/receiver-bootstrap.js` lines 945-1021 — current Wave-4-minimum 4-corner hit-test (gets superseded by full handle-ui).

### Source — Track B (live-sync extract target)
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — full live-sync (~800 LOC); subscription primitive to be extracted.
- `src/app/runtime/output-receiver/output-audio-binder.js` (~120 LOC) — already a thin subscriber, will be refactored to use the new shared module.

### Source — Track C (banding render)
- `src/app/runtime/render/` — search for solid-color overlay drawing functions (researcher enumerates).
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js` — referenced by Track A T3 (force-renderMode=gl) — verify whether it's relevant for dither path.
- `src/server/ssr-render-host.mjs` line ~617 — Chrome `--use-gl=angle` flag (Phase 32 h9), candidate for `--use-gl=swiftshader` swap if C2 needed.

### Connection-stability regression gate (D-06)
- `test/connection-stability/**` — must stay green throughout Phase 35.
- `test/phase-34-*.test.mjs` — Phase 34 rails (currently 24 GREEN), must stay green.

### Live E2E test infrastructure (D-05)
- `scripts/with_server.py` — Playwright skill helper for managing server lifecycle in tests.
- `scripts/manual/playwright-output-stream-verify.py` — Phase 33 reference smoketest (60s sustained verify).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`receiver-input-forwarder.js`** — `attachInputForwarder({ overlayEl, isAlignModeActive, getCurrentProfileId, getVideoEl, hitTestVertex })`. Accepts a `hitTestVertex` callback — this is exactly the integration point for the new `bootAlignMode()` to plug in real handle hit-testing instead of the Wave-4 4-corner approximation.
- **`output-audio-binder.js`** — proven thin live-sync subscriber pattern. Refactor to consume the new shared minimal subscription module from D-02.
- **`__ttBeamerEffectiveRenderMode()`** probe (referenced at `index.html:1059`) — for Track C verification: dithered 2D-canvas vs GL still distinguishable via this probe.
- **`scripts/with_server.py`** — webapp-testing skill helper; Wave-0 D-05 smoke-test should use this.

### Established Patterns
- **Dynamic-import-only-when-needed** — `runtime-orchestration.js:90` shows the pattern: `import("/src/app/runtime/output-receiver/receiver-bootstrap.js")`. New `bootAlignMode()` could use the same pattern from `output.html`.
- **`window.TT_BEAMER_*` global namespace** — script-tag-loaded modules register on `window`. New shared modules can follow this pattern OR be ES-modules; researcher recommends.
- **D-D2 audio-binder isolation** — Phase 31 already proved that thin-on-Pi audio works via separate WS subscription. Track B's minimal live-sync extract is the natural extension of this pattern.

### Integration Points
- **`output.html` script-tag list** — currently 4 scripts (`runtime-env.js`, inline diagnostic chip rAF, `receiver-bootstrap.js` ES module, `output-audio-binder.js` ES module). After Phase 35: + 1-2 new scripts for align-mode. Still thin (target: ≤8 scripts total).
- **`runtime-orchestration.js`** — dashboard's main init. Refactor moves polygon-editor init to `bootAlignMode()` call; runtime-orchestration just calls that with its existing args.
- **`#room-overlay` CSS gating (`src/styles.css:119`)** — already correct: `body[data-output-role="final-output"].align-mode-active #room-overlay { display: block !important; }`. The thin `output.html` needs to (a) include the `#room-overlay` div in DOM, (b) toggle `align-mode-active` class on body via the live-sync subscription.

### Anti-patterns to avoid
- Direct DOM mutation of dashboard-only elements from `output.html` — those elements may not exist (settings panels, animation editor). The `bootAlignMode()` API must accept a "DOM root" arg so it can mount handles inside the right container.
- Adding a global `__ttbThinConsumer` flag — the user explicitly chose pure-extract over hybrid (D-01). Don't slip back to flag-based branching in `runtime-orchestration`.

</code_context>

<specifics>
## Specific Ideas

- The Wave-0 live-E2E-smoke-test SHOULD reproduce the exact bug-class that Phase 34 missed: e.g., a test that asserts `body.dataset.outputRole === "final-output"` AND `body.dataset.ssrTab === "true"` on `/ssr` (would have caught hotfix h1's missed classifier). Add such "regression-rooted" assertions, not just functional ones.
- The dithering algorithm should be documented inline with reference to the chosen technique (Bayer matrix vs blue-noise vs white-noise) so future engineers understand the trade-off.
- `bootAlignMode()` API design should follow the pattern of `bootReceiver()` and `bootOutputAudioBinder()` — explicit single object arg with named fields, returns `{ stop }` for teardown.
- Phase 34 hotfix h2's reverted GL flags MUST stay reverted in Phase 35. Even when investigating C2 SwiftShader, do NOT re-enable `--ignore-gpu-blocklist` or `--enable-gpu-rasterization` outside the VAAPI gate.

</specifics>

<deferred>
## Deferred Ideas

- **C3 VAAPI opt-in test** — re-enable `SSR_ENABLE_VAAPI=1` and verify hardware GL works on operator's exact hardware. Risk: hang regression. Defer to a separate phase or operator-driven manual test.
- **Pi-hardware visual UAT** — full multi-cycle visual verification on the actual Pi 4. Pattern: same as Phase 33/34 — deferred until Pi accessible.
- **GL-renderer SwiftShader-only path** — even if C2 SwiftShader works, refactoring the renderer to be SwiftShader-aware end-to-end is its own scope.
- **Animation-engine refactor** — many animations have their own gradient artifacts that even dithering can't fully fix. Refactoring the render pipeline to higher color depth is a multi-phase effort.
- **Pixel-diff visual regression suite** — discussed in Phase 34, rejected. Could revisit if banding-class regressions become recurring.

</deferred>

---

*Phase: 35-thin-output-refactor-align-banding · Context · 2026-05-10 · derived from Phase 34 closure addendum + post-UAT operator feedback*
