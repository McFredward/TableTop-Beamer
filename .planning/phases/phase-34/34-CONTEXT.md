---
phase: 34
phase_id: 34
title: SSR Render-Quality + /output/ Thin-Consumer Refactor — Context
status: Ready for research + planning
gathered: 2026-05-10
---

# Phase 34: SSR Render-Quality + /output/ Thin-Consumer Refactor — Context

**Gathered:** 2026-05-10
**Status:** Ready for research + planning

<domain>
## Phase Boundary

Two adjacent tracks delivered together. Both surfaced in Phase 33 closure (`.planning/phases/phase-33/33-CLOSURE.md` "Outstanding") after the WebRTC connection itself was restored. Both are render-quality / topology problems, NOT connection-layer work. Connection stability from Phase 33 must NOT regress.

**Track A — SSR-Tab GL → 2D Fallback Fix.**
On current hardware (Lenovo Mini Raptor Lake-P iGPU + Mesa llvmpipe under Xvfb) the SSR-tab Chromium runtime falls back to 2D-Canvas instead of WebGL. Visible symptom: banding in solid-color animations (operator-confirmed on gaming-PC desktop browser; expected to repeat on Pi). Phase 30 B2 h10 documented an intentional auto-fallback to 2D after repeated GL context-loss events — that fallback is what's tripping in the SSR-tab. Both a diagnostic probe AND an explicit force are needed (see D-01).

**Track B — `/output/` Thin-Consumer Refactor.**
`/output/` currently double-dips: it boots `receiver-bootstrap.js` (thin WebRTC receiver) AND continues running the full `runtime-orchestration.js` render pipeline (GIF/MP4 decoders, animation engine, draw loop). The Phase 31 Plan 03 comment at `src/app/runtime/runtime-orchestration.js:110-120` explicitly notes this was intentional-with-deferred-cleanup ("Plan 05 audits whether the rest of the pipeline can be slimmed down further"). Phase 34 does that audit and ships the cleanup.

**The split (D-04):**
- `/output/` (no query param, default Pi browser URL) → **thin consumer only**: `<video>` + receiver-bootstrap + align-pointer-forwarder + Pi-local audio binders. NO render pipeline, NO decoders, NO animation engine.
- `/ssr` (NEW path) → SSR-render mode that `ssr-render-host.mjs` launches a Chromium tab against. Serves the full app HTML (today's `index.html`).
- The legacy `?ssr=1` query discriminator is REMOVED — paths are unambiguous.

**Test hardware (carries forward from Phase 33):**
- Server: Lenovo IdeaCentre Mini, Intel Core 7 240H, Raptor Lake-P iGPU, Mesa llvmpipe, Linux + Xvfb
- Client browsers: gaming-PC desktop (primary visual smoketest) + Raspberry Pi 4 kiosk (deferred to Pi-hardware UAT when available)
- Test board: Nemesis Lockdown Board A
- Network: gigabit ethernet LAN

**Trigger:** User reports after Phase 33 connection fix:
1. *"Ich sehe wieder die Streifen in den solid color animation was für mich heißt das SSR nicht mit GL sondern 2D läuft"* — Track A
2. */output/* doppelt-dekodiert lokal GIFs trotz fertigem H264-Stream — Track B

</domain>

<decisions>
## Implementation Decisions

### D-01: Track A — Probe + Force in parallel
Both a diagnostic renderer-detection probe AND explicit GL-forcing land in the same plan. Phase 33 hard-lesson: when a symptom appears (Chrome SSR-tab freezes), look at telemetry first. We will NOT skip the probe just because we have a suspect fix.

- **Probe** — instrument the SSR-tab with a renderer-detection script that captures: WebGL/WebGL2 context availability, `chrome://gpu` content via CDP, GPU-process state, `webglcontextlost` / `webglcontextrestored` event log, and the value of `__ttBeamerEffectiveRenderMode()` at boot + every 30s. Telemetry surfaces in server log so we have ongoing evidence (defends against "it works now, but why?").
- **Force** — explicit GL forcing in the SSR-tab bootstrap (force `webgl2` mode, refuse the 2D-fallback path) AND hardened Chrome GPU-init flags in `ssr-render-host.mjs` (`--ignore-gpu-blocklist`, `--enable-webgl`, `--use-gl=angle --use-angle=default` reaffirmed, plus whatever research surfaces).

Both tasks are mandatory in the plan. The probe is not optional telemetry — it IS the reason we know whether the force worked.

### D-02: Track A — SSR-tab forbids 2D-Canvas fallback (LOCKED)
On the SSR path (new `/ssr` route — see D-04) we DISABLE the auto-fallback to 2D-Canvas that Phase 30 B2 h10 introduced. If WebGL/WebGL2 cannot be obtained, the SSR-tab refuses to render and the watchdog (Phase 33 hardening) restarts the tab. Banding is unacceptable for a stream-source — better to fail loud than render-wrong.

**Phase 30 B2 h10 stays unchanged** for the dashboard runtime AND for the new `/output/` thin-consumer path (where the canvas chrome is hidden anyway). The 2D ban is `/ssr`-route-specific.

**Implementation note:** the gate likely lives in `runtime-orchestration.js` (or wherever `__ttBeamerEffectiveRenderMode` is computed) — branch on body dataset / pathname.

### D-03: Track B — Maximum strip; separate HTML entry point (LOCKED)
The user picked the most aggressive option in the gray-area discussion. `/output/` (no query) becomes a SEPARATE HTML entry point — own file, no shared scripts with `index.html`. Just `<video>`, receiver-bootstrap stack (`receiver-bootstrap.js`, `receiver-webrtc-client.js`, `receiver-status-ui.js`, `receiver-input-forwarder.js`), Pi-local audio binders (`runtime-wire-room-audio-binders.js`), and the minimal logger/runtime-env/config glue those need.

**Rejected:** the lighter alternative ("early-return in runtime-orchestration on /output/, keep audio binders wired to live-sync WS") — too entangled, leaves CPU on the table.

**Audio binders** — the existing `runtime-wire-room-audio-binders.js` is loaded via `index.html` script tags and triggered by the live-sync WebSocket. For the new `/output/` HTML, the live-sync WebSocket subscription must be present in the thin path so audio still triggers. Implementation: include the live-sync minimal subset in the new HTML (plan must scope what "minimal subset" means — no orchestration, no UI handlers, just the WS subscription that the audio binders consume).

### D-04: Server-side path split (LOCKED)
- **`/output/`** — default thin-consumer route (Pi kiosk navigates here unchanged). Server returns the new thin `output.html`.
- **`/ssr`** — NEW route for the SSR Chromium tab. Server returns `index.html` (full app). Localhost-restriction (already enforced for `role=ssr-tab` WS connections) extends to this HTTP route.
- **`/`** — dashboard, unchanged. Returns `index.html`.
- **The `?ssr=1` query param is REMOVED** as a runtime discriminator. `runtime-orchestration.js` lines 50-122 will no longer branch on it — the SSR-tab is identified by its URL (`/ssr`) at server-route level. Keep a backwards-compat redirect for one phase if low-cost; otherwise hard-cut.

**Critical migration: `ssr-render-host.mjs:450`** — `const ssrUrl = http://127.0.0.1:${port}/output?ssr=1` → `http://127.0.0.1:${port}/ssr`.

### D-05: Verification — render-mode probe + manual visual smoketest
Acceptance gate is two-part:

1. **Probe assertion** — `window.__ttBeamerEffectiveRenderMode()` (or its successor) returns `"webgl"` or `"webgl2"` inside the SSR-tab. Captured automatically (instrumented by D-01 probe). Logged on every boot.
2. **Manual visual smoketest** — a known solid-color banding animation is played on the gaming-PC desktop browser (which consumes the SSR stream). User confirms: no banding. Operator-driven, written into `34-HUMAN-UAT.md`.

Pi-hardware visual UAT is **deferred** to when Pi hardware is available — not a Phase 34 gate.

**Pixel-diff against reference image** — explicitly REJECTED. Maintenance cost of reference frames outweighs benefit at this scale.

### D-06: No connection-stability regression (HARD GATE)
Phase 33's Connection-Stability test suite (`test/connection-stability/**`) must remain green. Any change to `ssr-render-host.mjs`, the receiver bootstrap path, or the WebRTC signaling URL is checked against:
- 10× cold-boot manual repro still PASS
- Frame-stale 30s, keyframe-on-resume, heartbeat-reset, RPC 20s, watchdog 150s tolerance — all carry forward unchanged
- VAAPI default-disabled (Phase 33 commit `3cd6748`) — UNCHANGED. Phase 34 does NOT re-enable VAAPI. `SSR_ENABLE_VAAPI=1` opt-in stays the only way.

### D-07: Track ordering — A and B can land in either order, but ship together
Both tracks touch `/output/`-adjacent code (receiver-bootstrap, ssr-render-host, runtime-orchestration). Plan structure: split into two plans (`34-A`, `34-B`) so they can execute in parallel waves OR sequentially based on planner judgment. Phase exits when BOTH PASS.

### Claude's Discretion
- Specific Chrome GPU-init flag set (D-01 force) — research proposes, planner decides. Constraints: must work under Xvfb + Mesa llvmpipe + Raptor Lake-P iGPU, must keep VAAPI default-disabled.
- Renderer-detection probe implementation language (CDP from Node? In-page script? Both?) — research/planner decide. Goal: telemetry surfaces in server log.
- Exact name/path of the new thin HTML file (`output.html` at repo root? `src/output.html`? `public/output.html`?) — planner decides based on existing static-asset patterns. Server route handler in `server.mjs` is the integration point.
- Whether to keep the `?ssr=1` query param as a deprecation-redirect for one phase or hard-cut — planner judgment.
- Live-sync WebSocket "minimal subset" for audio-binders in thin `/output/` HTML — planner scopes.

</decisions>

<assumptions>
## Working Assumptions (verify or invalidate during research)

- **A1: GL-context-loss in SSR-tab is recoverable with explicit forcing.** Phase 30 B2 h10 added 2D-fallback because GL kept dying. We assume the underlying cause was missing/wrong Chrome flags + browser-bundled-Chromium codec gaps (Phase 33 lesson — system Chrome works where bundled Chromium fails). Verify via the diagnostic probe.

- **A2: The receiver-bootstrap stack is already self-sufficient.** `receiver-bootstrap.js` header explicitly says it "Replaces the full render pipeline". Verify by static analysis: list every `window.TT_BEAMER_*` global it touches and confirm those globals are loadable independently of `runtime-orchestration.js`.

- **A3: Live-sync WebSocket is decomposable.** The Pi-local audio path needs the live-sync WS for trigger messages but doesn't need the full live-sync orchestration (state-sync, polygon hydration, etc.). Verify there's a minimal subscription path that just delivers audio-trigger envelopes.

- **A4: Server-route split is straightforward in `server.mjs`.** Adding `/ssr` route handler that returns `index.html` and `/output/` route handler that returns the new `output.html` is plumbing. No middleware conflicts expected. Verify Phase 33 watchdog logic doesn't bind to URL string.

- **A5: VAAPI default-disabled stays sufficient.** Software encoder path is not re-tested in Phase 34. If GL-forcing somehow re-introduces hardware acceleration that conflicts with the Phase 33 fix, that's a regression to catch in D-06 gate.

</assumptions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 33 closure inputs (mandatory)
- `.planning/phases/phase-33/33-CLOSURE.md` — Defines both Phase 34 tracks in the "Outstanding (deferred to Phase 34)" section. The authoritative scope source.
- `.planning/phases/phase-33/33-SUMMARY.md` — Carry-forward defensive layers, VAAPI fix details.
- `.planning/phases/phase-33/33-CONTEXT.md` — D-A1, D-A3 locked decisions; carry-forward locks.

### Roadmap entry
- `.planning/ROADMAP.md` §"Phase 34" — Milestones, exit criteria, locked carry-forward.

### Phase 30 B2 h10 (origin of the 2D fallback policy that D-02 partially overrides)
- `.planning/phases/phase-30/SUMMARY.md` — context for why 2D-fallback exists; do NOT remove globally, only on `/ssr`.

### Source — Track A (GL forcing + probe)
- `src/server/ssr-render-host.mjs` — Chrome launch args, GPU init flags, watchdog. Line ~450 has the `ssrUrl` migration target.
- `src/app/runtime/runtime-orchestration.js` lines 50-122 — current `?ssr=1` discriminator + `__ttBeamerEffectiveRenderMode` probe call site at line ~1059.
- `index.html` lines 1011-1086 — diagnostic chip with render-mode display (probe surface).

### Source — Track B (thin-consumer refactor)
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — already-thin receiver (header §1-13).
- `src/app/runtime/output-receiver/receiver-webrtc-client.js`, `receiver-status-ui.js`, `receiver-input-forwarder.js` — receiver stack co-loaded by bootstrap.
- `src/app/runtime/wire/runtime-wire-room-audio-binders.js` — Pi-local audio binders (D-D2 reversal carryover).
- `index.html` lines 991-1191 — full-app script load list (the diff between this and the new `output.html` IS the refactor).
- `server.mjs` (root) — server-route handler (find route registration site for `/output`, add `/ssr`).

### Connection-stability regression gate (D-06)
- `test/connection-stability/**` — must stay green throughout Phase 34.

### Optional / advisory
- `.planning/phases/phase-31/31-SUMMARY.md` Plan 05 — original "audit and slim" deferred work that Phase 34 Track B closes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Track B — thin consumer)
- **`receiver-bootstrap.js`** — already designed as a thin entry. Imports `receiver-webrtc-client.js`, `receiver-status-ui.js`, `receiver-input-forwarder.js`. Boot fn: `bootReceiver({ logger })`.
- **`__ttBeamerEffectiveRenderMode()`** — global render-mode probe (referenced at `index.html:1059`). Reusable for D-05 verification probe.
- **`output-status-chip`** (`index.html:1022-1085`) — the diagnostic chip that shows `version | fps | render-mode | canvas | frame-cost`. Lives outside `.app-shell`. The thin `/output/` HTML can include only the parts needed for the Pi diagnostic surface.

### Established Patterns
- **Body-dataset markers** for path detection — `document.body.dataset.ssrTab = "true"` pattern (`runtime-orchestration.js:69`). Phase 34 may continue this style or replace with route-level branching.
- **Dynamic import for receiver-bootstrap** (`runtime-orchestration.js:90`) — works today. With Track B's HTML split, the dynamic import becomes a static script tag in `output.html`.
- **`?ssr-preview=1`** flag (`runtime-orchestration.js:78`) — dashboard preview using the receiver. Orthogonal to Phase 34 — keep as-is in the dashboard `index.html`.

### Integration Points
- **`server.mjs` route registration** — needs `/ssr` route + `/output/` route serving new HTML. Static-asset middleware unchanged.
- **`ssr-render-host.mjs:450`** — `ssrUrl` constant. Single-line edit, but the navigated URL change cascades to `webrtc-signaling` localhost-check (already role-based, not URL-based, so safe).
- **`webrtc-signaling.mjs:269`** — localhost-restriction for `role=ssr-tab` WS. Unchanged by Phase 34 (role-based, not URL-based).
- **Index.html script load list** (lines 991-1191) — source for "what does the dashboard load that the thin /output/ does NOT need". Compare this list against `receiver-bootstrap.js` import graph during planning.

### Track A — GL-forcing surface area
- **`ssr-render-host.mjs` Chrome args** — `--use-gl=angle --use-angle=default` from Phase 32 h9 stays. Phase 34 adds `--ignore-gpu-blocklist`, `--enable-webgl`, plus whatever research surfaces for Mesa-llvmpipe under Xvfb.
- **Phase 33 commit `3cd6748`** — `hasIgpu` gate disables VAAPI unless `SSR_ENABLE_VAAPI=1`. UNCHANGED by Phase 34 (D-06).
- **Render-mode gate** — wherever `__ttBeamerEffectiveRenderMode` decides 2D-vs-WebGL needs an SSR-route override (`if route === '/ssr' → throw, do not fall back`).

</code_context>

<specifics>
## Specific Ideas

- User example animation for visual smoketest: a known solid-color animation that previously showed banding on gaming-PC. Operator picks one or planner pulls one from the existing animation catalog (no need to create a new test asset).
- Phase 33 hard-lesson reapplied: telemetry FIRST, suspect fix second. Probe is non-negotiable in D-01.
- Connection-stability regression is the loudest possible gate (D-06). Any commit that breaks `test/connection-stability/**` reverts before merge.

</specifics>

<deferred>
## Deferred Ideas

- **Pi-hardware visual UAT** — full multi-cycle visual verification on the actual Pi 4. Deferred to when Pi hardware is available (carries the Phase 33 PASS-AUTOMATED-PENDING-PI-HARDWARE pattern forward).
- **VAAPI re-enable investigation** — once GL is forced and stable, retrying VAAPI with full instrumentation MIGHT be possible. Deferred to a future phase. Phase 34 keeps `SSR_ENABLE_VAAPI=1` as opt-in only.
- **Pixel-diff visual regression suite** — discussed and rejected for Phase 34 (D-05). Could revisit if banding-class regressions become recurring.
- **Pi /output/ render-mode policy review** — currently inherits the Phase 30 B2 h10 2D-fallback. Track A's D-02 only bans 2D on `/ssr`. If the Pi browser also shows banding on its own decoded video, that's a separate investigation (likely Pi-side h264 decoder + downstream display, not GL).
- **Live-sync WebSocket protocol slim-down** — A3 assumes a "minimal subset" works. If research finds it's tightly coupled, factoring out a thin subscription is its own phase.

</deferred>

---

*Phase: 34-render-quality-thin-consumer · Context · 2026-05-10 · derived from 33-CLOSURE.md outstanding items*
