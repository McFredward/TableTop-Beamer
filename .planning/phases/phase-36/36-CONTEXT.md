---
phase: 36
phase_id: 36
title: Comprehensive Align-Mode-on-Thin-/output/ — Context
status: Ready for research + planning
gathered: 2026-05-10
---

# Phase 36: Comprehensive Align-Mode-on-Thin-/output/ — Context

**Gathered:** 2026-05-10
**Status:** Ready for research + planning
**Source:** Phase 35 closure addendum (`35-CLOSURE-ITER2-ADDENDUM.md`) + ROADMAP.md Phase 36 entry + 2026-05-10 discuss-phase session

<domain>
## Phase Boundary

Phase 35-iter2 h9 partial-reverted /output/ to Phase 34's 4-corner approximation
because the Phase 35-A "pure-extract" of `bootAlignMode` surfaced more missing
ctx wirings than per-bug hotfix iterations could plug (sizing alignment,
dirty-flag, contextmenu, undo, vertex/midpoint distortion, ghost-circle).
The dashboard still owns full handle-ui; /output/ has only basic corner-pull.

**Phase 36 closes that gap.** The full handle-ui (vertex / midpoint / rotation
drag, image-pan, right-click context menu, CTRL+Z undo, dirty-flag, sizing
alignment with stream content) must work on the thin /output/ — WITHOUT
loading the full dashboard app.

The Phase 35 closure addendum identified the failure mode: handle-ui's ctx
contract has ~45 distinct fields and Phase 35-A's grep-based audit
underestimated which were exercised on /output/'s read path. Phase 36 must
not repeat that audit failure.

**Test hardware:**
- Server: Lenovo IdeaCentre Mini, Intel Core 7 240H, Raptor Lake-P iGPU, Mesa
  llvmpipe under Xvfb, Linux
- Client browsers: gaming-PC desktop browser (primary visual + functional
  smoketest), Pi 4 (deferred Pi-hardware UAT — Phase-33/34 pattern continues)
- Network: gigabit ethernet LAN

**Trigger:** 2026-05-10 operator UAT after Phase 35-iter2 h8 — six open
align-mode interaction bugs persisting after multiple hotfix rounds. h9
partial-reverted /output/ to 4-corner approximation; full handle-ui is
explicit Phase 36 scope.

**Carrying forward from prior phases (LOCKED, do not re-open):**
- VAAPI default-disabled (Phase 33 commit `3cd6748`)
- Phase 34 hotfix h1 (`/ssr` → `OUTPUT_ROLE_FINAL` classification)
- Phase 34 hotfix h2 (`hasVaapiEnabled`-gated GL flags)
- Phase 35-iter2 h1 lazy-load infrastructure pattern (script-tag-budget reasoning)
- Phase 35-iter2 h2 polygon-data wiring (real `runtimeBoards`-backed boardAccess)
- Phase 35-iter2 h3 banding fix (Bayer dither + drawImage clip)
- Phase 35-B `output-live-sync.js` thin subscription (proven, used)
- Phase 33 frame-stale 30s + keyframe-on-resume + heartbeat-reset + RPC 20s
  + watchdog 150s tolerance
- Phase 31 architecture comment in handle-ui.js line 1617-1622: SSR Chromium
  tab encodes warped board only (zero overlays in stream), Pi /output/ owns
  full align-mode UX

**Explicit OUT of scope:**
- Loading full dashboard app on /output/ (violates thin goal — Phase 35
  user-stated invariant)
- /align as separate URL (operator works on /output/ directly)
- Audio pipeline changes
- H264 codec change
- Animation engine refactor
- Phase-37 transformation banding (separate phase)
- VAAPI re-enable as default (stays opt-in via SSR_ENABLE_VAAPI=1)

</domain>

<decisions>
## Implementation Decisions

### D-01: Refactor strategy — Option H first-class thin-export pattern (LOCKED)

`runtime-projection-handle-ui.js` (1756 LOC), `runtime-projection-handle-drag.js`
(941 LOC), and `runtime-polygon-editor.js` (575 LOC) get a NEW `bootHandleUi({...})`
exported entry point. Every internal module-global reference becomes an
explicit named arg of that boot function — `ctx`, `gridState`, `applyTransform`,
`profileSaveFlow`, `profileLoadFlow`, `markDirty`, `renderRoomOverlay`,
`boardAccess`, `liveSync`, `domRoots`, etc.

The Phase 35-A bootAlignMode attempt was Option D (D-extended in roadmap
notation) — extract by audit-and-stub. The user-locked choice for Phase 36
is **Option H** in roadmap notation — handle-ui itself becomes a first-class
thin-exportable building block.

**Constraints:**
- Dashboard's existing align-mode UX MUST stay functional — refactor is
  additive. `runtime-orchestration.js` calls the new `bootHandleUi(...)`
  with the same wirings it implicitly had before.
- /output/ calls `bootHandleUi(...)` with explicit args derived from
  `liveSync` + `boardAccess` (preserved from Phase 35-iter2 h2) + a thin
  ctx that delegates only to /output/-relevant methods.
- The single source of truth for handle-ui logic stays in
  `src/app/runtime/viewport/`. No duplicate code paths between
  dashboard and /output/.

**Why Option H over D-extended (Hybrid):** D-extended was tried in iter2
and revealed each bug-fix uncovered another missing wiring. Option H
eliminates the audit gap entirely by making the contract EXPLICIT in
function signature. Larger initial diff, but every future align-mode
work benefits.

**Why not "load full dashboard with feature-flag":** User-locked from
Phase 35: "die ganze Idee dieser Phase ist die Trennung der vollen APP
und /output/, daran will ich weiterhin festhalten — /output/ soll so
thin wie möglich bleiben". A flag approach defeats this.

### D-02: Event-handling architecture — (a) Overlay pointer-events:none when align-mode active (LOCKED)

When `align-mode` is active on /output/, `#ssr-input-overlay` (z:4) gets
`pointer-events: none`. Handle DOM elements (z:9999) capture clicks
directly. Phase 34's `receiver-input-forwarder` does NOT participate
in align-mode — it sleeps until align-mode toggles off.

**Implications:**
- handle-ui's INTERNAL pointer-handlers run unchanged on /output/ —
  same code path as dashboard. This is the entire point of Option H.
- Right-click reaches the handle's own contextmenu handler naturally.
- Image-pan area (between handles) hits `#stage` directly — bootHandleUi
  must place a click-target at that level, not delegate to overlay.
- The current Phase 35-A CSS rule `body[data-output-role="final-output"]
  .align-mode-active .projection-corner-handle { pointer-events: none
  !important }` is REMOVED by Phase 36 — that rule was the (c)-bubbling
  workaround.
- When align-mode toggles OFF: overlay re-activates, receiver-input-forwarder
  resumes for the Wave-4-minimum path (corner-pull only, but only
  meaningful if align-mode is on, so effectively dormant).

**Why not (b) z-index swap:** Same outcome as (a) for handles, but
image-pan area would still fall through to overlay → two separate
event paths. (a) gives a single event-routing rule.

**Why not (c) bubble via hitTestVertex:** Defeats Option H — handle-ui's
internal handlers would never run. Phase 35-A iter2 proved hitTestVertex-
extension is brittle (vertex/midpoint/rotation bbox lookup is layout-
sensitive).

### D-03: RED-test form — Pure Live-E2E via Playwright + system Chrome (LOCKED, BLOCKING)

All 10 RED tests (T1-T10 from ROADMAP) implemented as Playwright tests
under `test/live-e2e/` using `scripts/with_server.py` for server lifecycle
and `executable_path=/opt/google/chrome/chrome` (H264-capable system
Chrome) under Xvfb DISPLAY=:98.

**Per-test mechanism:**

| Test | What it asserts | Mechanism |
|---|---|---|
| T1 sizing | Handle frame visually aligned with stream content | Screenshot diff vs known-good baseline + computed-style assertion on `.projection-handle-frame` bbox |
| T2 corner pulls | All 4 corner handles change stream | `page.mouse.down(handle.bbox.center) → move(delta) → up()` then assert `align-grid-snapshot` mutation in server log AND visual change in next frame |
| T3 vertex drag | Vertex grabs the right vertex (no false corner-id) | Drag vertex 0, assert grid `points[0]` changed (mutation log), other vertices unchanged |
| T4 midpoint drag | Midpoint handles clickable + functional | Click midpoint between 2 vertices, assert subdivide mutation OR squish behavior depending on handle type |
| T5 rotation | Rotation handle grabbable, rotation reflected | Drag rotation handle, assert grid rotation matrix updated in mutation |
| T6 image-pan | Drag in free area pans stream content | `page.mouse.down(emptyArea) → move(delta) → up()`, assert pan-offset in mutation |
| T7 right-click menu | Context menu appears on right-click | `page.mouse.down(button="right")` over a line, assert menu DOM element visible + items present |
| T8 CTRL+Z undo | Undo reverts last gesture in stream | Drag → undo via `page.keyboard.press("Control+z")`, assert grid snapshot reverted |
| T9 dirty-flag | Reacts to gesture, propagates to dashboard | After any gesture, assert dashboard-side dirty indicator visible (via second Playwright tab on /, watch via live-sync) |
| T10 conflict-free | receiver-input-forwarder + bootHandleUi don't both fire | Smoke: trigger gesture, assert exactly ONE mutation in server log (no duplicate from both paths) |

**Setup reuses Phase 35 W0 infrastructure:**
- `scripts/with_server.py` server lifecycle wrapper
- `test/live-e2e/conftest.py` Playwright fixtures + `@flaky_3x` decorator
- `test/live-e2e/_flake_retry.py` retry helper
- `WAVE0_FLAKE_TOLERANCE` opt-in skip pattern

**Phase 36 W0 BLOCKING gate:** No Phase 36 production code lands until
all 10 tests exist as RED rails. Same hard rule as Phase 35 D-05.

**Why pure E2E over Hybrid or Unit:**
- jsdom has no layout engine → bbox / sizing / handle-position assertions
  unreliable. Phase 35 unit-tests passed while real bugs slipped through.
- Phase 35-iter2 h9 root-cause: "no test EVER live-loaded /output/ with
  full handle-ui interactions" — pure E2E IS the missing layer.
- Slowdown (~10s per test) acceptable for BLOCKING-rail. Test suite
  parallelism via pytest-xdist if needed.

### D-04: Undo state — Client-local on /output/ (LOCKED)

handle-ui's existing local history-stack runs on /output/ via
`bootHandleUi(...)`. Every gesture pushes to stack; CTRL+Z pops.
The RESULT (post-undo grid snapshot) broadcasts via existing
`align-grid-snapshot` mutation — server-side state stays consistent.

No new server mutation type. No undo-mutation log. Dashboard's existing
local history-stack is independent (own /index.html session, own stack).

If both pages are open simultaneously: each has its own undo stack.
The grid-snapshot broadcasts keep the grid synced; undo on /output/
undoes /output/'s view of grid; dashboard's stack tracks dashboard's
view. This is the same pattern in use today between dashboard tabs.

### D-05: Right-click context menu — Fully rendered in /output/ DOM (LOCKED)

handle-ui's existing context-menu code runs locally on /output/ via
`bootHandleUi(...)`. Right-click → menu DOM appears at click coordinates
on /output/. Menu items (add line, remove line) trigger existing
add/remove mutation types — no new mutations.

**Why not forward to dashboard:** Phase 31 architecture explicitly says
"Pi /output/ owns the entire align-mode UX". Operator uses /output/
directly without needing dashboard tab visible. Forwarding context-menu
events to dashboard would require operator to keep both tabs visible,
defeating the operator-on-/output/ ergonomic goal.

### D-06: Dirty-flag — Local + broadcast via existing endpoint (LOCKED)

handle-ui's `markDirty()` runs locally on /output/ via `bootHandleUi(...)`.
On every gesture: local state updated AND broadcast — dashboard's
dirty-indicator reflects via live-sync subscription. Both pages stay
consistent if both open.

**Reconciliation [2026-05-10, plan-phase iteration]:** The original
literal text of D-06 said "broadcast piggybacks on `align-grid-snapshot`
(same mutation that already syncs grid state)". Phase 36 RESEARCH §1
discovered the existing implementation actually uses a separate
`POST /api/align-mode-dirty` endpoint (server.mjs:4114-4120 +
profile-persistence.js:598). The user-intended behavior — dirty-flag
propagates from /output/ to dashboard with no new mutation type —
is preserved by reusing this existing endpoint. The literal mechanism
("piggyback on align-grid-snapshot") is REVISED to "use the existing
`/api/align-mode-dirty` endpoint" because:

- Lower risk (existing endpoint, server validator, dashboard subscriber
  already plumbed)
- Same observable outcome (operator sees dirty-indicator update)
- No "new mutation type" introduced (D-06 invariant honored)
- Piggyback would have required modifying align-grid-snapshot payload
  shape + server validator + dashboard reader — net higher diff with
  no user-visible benefit

This reconciliation is locked. RESEARCH §"Open Questions for the
planner" Q1 documents the resolution. No further user sign-off needed
because the user-locked intent (D-06 goal) is preserved verbatim.

### D-07: ctx-inventur methodology — Runtime-trace + AST union (LOCKED)

To prevent repeating Phase 35-A iter2's audit failure, RESEARCH must
enumerate handle-ui's ctx-field surface using:

1. **Runtime trace via Proxy:** Wrap dashboard's existing `ctx` in a
   `Proxy` that logs every `get` access. Drive the dashboard through
   each align-mode interaction (corner pull, vertex drag, midpoint
   drag, rotation, image-pan, right-click add line, right-click remove
   line, CTRL+Z undo, save, discard, ESC). Collect the union of
   accessed fields.

2. **AST scan:** Parse `runtime-projection-handle-ui.js`,
   `runtime-projection-handle-drag.js`, `runtime-projection-mapping.js`,
   `runtime-polygon-editor.js` to extract every `ctx.X` MemberExpression.
   Cross-check against runtime-trace results.

3. **Union as authoritative inventory:** Every field that appears in
   either set MUST be wired in `bootHandleUi`'s arg list — either
   as a real value, an explicit no-op stub (with rationale comment),
   or a runtime error if accessed (for clearly-dashboard-only fields).

This is the single most important methodological change from Phase 35-A.
The grep-based audit underestimated read-path usage; the runtime trace
catches everything actually touched.

### D-08: Connection-stability hard gate (LOCKED, NON-NEGOTIABLE)

`test/connection-stability/**` must stay `fail=0` throughout Phase 36.
Every commit that touches `ssr-render-host.mjs`, `ssr-stream-publisher.mjs`,
`ssr-webrtc-signaling.mjs`, `receiver-bootstrap.js`, `runtime-env.js`,
or any of the handle-ui / handle-drag / polygon-editor refactor targets
runs the full connection-stability suite as a regression-check task.

VAAPI default-disabled UNCHANGED. The `hasVaapiEnabled` gate from Phase
34 hotfix h2 UNCHANGED.

### D-09: Lazy-load script-tag budget (LOCKED, BLOCKING grep-assertion)

Phase 35 lesson #1: "executor took the easy path with `<script defer>`
for every IIFE → 17 src-based scripts blocking ICE negotiation".

Phase 36 must keep /output/ at **≤8 src-based script tags initial**.
Align-mode bundle continues to lazy-load via the Phase 35-iter2 h1
pattern (`output-align-mode-loader.js` infrastructure preserved as
Phase 36 starting point).

**BLOCKING task in plan:** A grep-verifiable assertion runs in CI:
```
COUNT=$(grep -cE '<script[^>]*src=' output.html)
[ "$COUNT" -le 8 ] || exit 1
```

### D-10: Pi-hardware UAT deferred until hardware accessible (CARRY-FORWARD pattern)

Same pattern as Phase 33 + 34 + 35: gaming-PC desktop browser smoketest
is the Phase-close gate. Pi-hardware visual + CPU UAT items are
explicitly deferred to operator hardware testing.
`36-HUMAN-UAT.md` documents Pi items separately as `status: deferred`.

### Claude's Discretion (planner / researcher decide)

- Exact API shape of `bootHandleUi({...})` — researcher proposes,
  planner formalizes. Constraint: must accept everything that emerges
  from D-07 inventory; must follow the `bootReceiver`/`bootOutputAudioBinder`
  pattern (single object arg with named fields, returns `{ stop }`
  for teardown).
- Whether handle-ui / handle-drag / polygon-editor are split into
  smaller files during refactor — planner judges based on file size
  and refactor risk.
- Exact ctx-trace harness implementation — researcher chooses (Proxy
  wrapper at dashboard `runtime-orchestration.js:50-122` is one
  candidate; instrumentation via the live-sync subscription is another).
- Wave parallelization within M3-M5 (sizing+corner / vertex+midpoint+
  rotation / pan+context+undo+dirty) — planner judges. M1 (research)
  and M2 (RED tests) MUST sequentially precede any implementation wave.
- Dashboard regression coverage form: existing dashboard align-mode
  E2E test (Phase 35 W0 deferred-items.md) needs to be wired or
  rewritten — planner picks form.

</decisions>

<assumptions>
## Working Assumptions (verify or invalidate during research)

- **A1: bootHandleUi as Option H is achievable without breaking dashboard.**
  The refactor is additive — dashboard wires the same modules through the
  new API. Verifying: every dashboard align-mode interaction
  (corner pull, vertex drag, midpoint, rotation, pan, right-click add
  line, remove line, CTRL+Z, save, discard, ESC) must stay green
  through D-08 regression check.

- **A2: 45 ctx-fields union is approximately the full inventory.** Initial
  grep counted 45 distinct `ctx.X` references across handle-ui +
  handle-drag + polygon-editor. Runtime-trace (D-07) may reveal more
  (string-keyed accesses, dynamic property names). Researcher must
  report final count and risk if substantially higher.

- **A3: Pure-E2E test suite stable in CI.** Phase 35 W0 already
  established the rail with 4 tests passing in ~58s total. Phase 36
  adds ~10 more with multi-mouse-gesture per test → ~3-5min suite.
  Under 5% flake rate with `@flaky_3x` retry. If higher flake, opt-in
  skip per Phase 35 D-05 fallback.

- **A4: Event-handling D-02(a) doesn't break Wave-4-minimum corner-pull
  fallback.** When align-mode toggles OFF, overlay re-activates for
  receiver-input-forwarder. State transition must be explicitly tested
  (T10 conflict-free).

- **A5: handle-ui's interior code does NOT directly touch dashboard-
  specific DOM (settings panel, animation editor, etc.).** D-07
  runtime-trace must verify. If found, those code paths are split out
  to dashboard-only callers; bootHandleUi rejects them via no-op stub
  with rationale.

- **A6: `align-grid-snapshot` mutation type already supports broadcasting
  enough state for the dashboard's dirty-indicator to reflect.** If not,
  D-06 broadcast piggyback fails — researcher must check existing
  mutation payload shape and report.

- **A7: Profile persistence (save / discard / load) on /output/ uses
  existing dashboard-backed mutation types.** Operator clicks Save on
  /output/ → mutation → server persists → dashboard reflects via
  live-sync. Researcher confirms mutation type exists.

</assumptions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 35 closure (mandatory)
- `.planning/phases/phase-35/35-CLOSURE-ITER2-ADDENDUM.md` — h9 root-cause
  analysis, two competing event-handling models, Option-G partial-revert
  rationale. Authoritative source for Phase 36's "what NOT to repeat".
- `.planning/phases/phase-35/35-CLOSURE.md` — original (premature) closure;
  superseded by addendum but documents the Phase 35-A approach.
- `.planning/phases/phase-35/35-CONTEXT.md` — Phase 35 D-01..D-08 locked
  decisions. Phase 36 INHERITS D-02 (live-sync extract), D-06 (connection-
  stability hard gate), D-07 (track parallelization). D-01 (pure-extract)
  is SUPERSEDED by Phase 36 D-01 (Option H).
- `.planning/phases/phase-35/35-A-SUMMARY.md` — Phase 35-A's bootAlignMode
  attempt's task accounting; documents the audit gap.
- `.planning/phases/phase-35/35-RESEARCH.md` §A — "~40 of 60 ctx fields
  can be safe no-op stubs" claim that turned out incorrect.

### Phase 34 (carry-forward)
- `.planning/phases/phase-34/34-CLOSURE-ADDENDUM.md` — defines original
  three Phase 35 tracks; Track A's pure-extract framing.
- `.planning/phases/phase-34/34-CONTEXT.md` — D-01..D-07 locks (carry-forward).

### Phase 33 (carry-forward)
- `.planning/phases/phase-33/33-CLOSURE.md` — VAAPI default-disabled rule;
  do not re-enable without operator opt-in.
- `.planning/phases/phase-33/33-SUMMARY.md` — defensive layers (frame-stale
  30s, RPC 20s, watchdog 150s).

### Roadmap
- `.planning/ROADMAP.md` §"Phase 36" — comprehensive align-mode scope, 10 RED
  tests (T1-T10), milestones M1-M6, exit criteria, Pflicht-Inputs.

### Source — Refactor targets (Option H)
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` (1756 LOC) —
  DOM lifecycle for handles, line canvas, context menu. Primary refactor target.
- `src/app/runtime/viewport/runtime-projection-handle-drag.js` (941 LOC) —
  drag handlers split out from handle-ui. Refactor target.
- `src/app/runtime/viewport/runtime-projection-mapping.js` (431 LOC) —
  projection math, applyTransform. Refactor target.
- `src/app/runtime/polygon-editor/runtime-polygon-editor.js` (575 LOC) —
  polygon vertex management. Refactor target.
- `src/app/runtime/runtime-orchestration.js` lines 50-122 + the polygon-
  editor init section — current implicit-injection wiring. Becomes the
  reference for what bootHandleUi(...) needs.
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` lines 1610-
  1660 — Phase 31 h32 architecture comment + `_isSsrChromiumTab` gate.
  Critical: explains why SSR tab DOES NOT render handles (only Pi /output/).

### Source — Phase 35 leftovers (preserved as Phase 36 starting points)
- `src/app/runtime/output-receiver/output-align-mode.js` (359 LOC) —
  Phase 35-A bootAlignMode attempt. NOT loaded today; reference for
  what worked + what didn't in Option D approach.
- `src/app/runtime/output-receiver/output-align-mode-loader.js` (381 LOC) —
  Phase 35-iter2 h1 lazy-loader. The lazy-load infrastructure pattern
  carries forward; the integration with bootHandleUi (instead of
  bootAlignMode) is Phase 36 work.
- `src/app/runtime/output-receiver/output-live-sync.js` (211 LOC) —
  Phase 35-B thin live-sync subscription. Used as-is.
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — current
  Phase-34 4-corner approximation hitTestVertex. Phase 36 modifies the
  align-mode path: when align-mode is on, overlay → pointer-events:none,
  receiver-input-forwarder dormant. When OFF, current Phase-34
  approximation stays as Wave-4 fallback (effectively dormant in
  operator usage but kept for test infra).
- `src/styles.css` lines 195-213 — pointer-event flow comment + Phase
  35-A `pointer-events: none !important` rule. Phase 36 D-02
  REMOVES this rule (replaced by JS-toggled `pointer-events:none` on
  `#ssr-input-overlay` when align-mode active).

### Source — Live-sync mutation types (D-04 / D-05 / D-06)
- `server.mjs` mutation handlers — verify existing `align-grid-snapshot`,
  `align-add-line`, `align-remove-line`, dirty-flag broadcast (or
  equivalent) types support the broadcast loads from /output/.

### Live-E2E test infrastructure (D-03)
- `scripts/with_server.py` — server lifecycle wrapper.
- `test/live-e2e/conftest.py` — Playwright fixtures + @flaky_3x decorator.
- `test/live-e2e/_flake_retry.py` — retry helper.
- `test/live-e2e/test_phase35_alignmode_smoke.py` — Phase 35 W0 reference
  smoke (DCL, video-ready, bg-color, server-log-clean).
- `test/live-e2e/test_phase35_dashboard_alignmode.py` — Phase 35 W0
  dashboard regression test (deferred-items.md notes pre-existing endpoint
  mismatch — Phase 36 must fix or replace this rail to lock dashboard
  regression coverage).

### Connection-stability regression gate (D-08)
- `test/connection-stability/**` — must stay `fail=0` throughout Phase 36.

### Live-sync subscription contract (D-04 / D-05 / D-06)
- `src/app/runtime/output-receiver/output-live-sync.js` — Phase 35-B
  contract. 7 callback registrars + 3 getters + stop. Phase 36 may
  ADD callbacks (e.g., `onDirtyFlagChange`) if dashboard doesn't already
  broadcast — researcher checks current broadcast surface.

### CSS gating
- `src/styles.css` line 119 — `.align-mode-active #room-overlay` rule.
  Stays correct: the toggle on `body.align-mode-active` happens via
  liveSync.onAlignModeChange in /output/'s align-mode loader.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`output-live-sync.js`** (Phase 35-B) — proven thin live-sync. Reuse as-is
  for liveSync arg in `bootHandleUi`.
- **`output-align-mode-loader.js`** (Phase 35-iter2 h1) — lazy-load
  infrastructure. Phase 36 swaps the bundle target from `bootAlignMode`
  to `bootHandleUi` + replaces the bundled IIFE list to match Option H
  refactor.
- **`buildBoardAccess` in loader (h2)** — real `runtimeBoards`-backed
  polygon access. Reuse as-is for boardAccess arg in `bootHandleUi`.
- **`receiver-input-forwarder.js`** — Phase 34 4-corner approximation.
  Stays in codebase for the align-mode-OFF path. Phase 36 ensures it is
  DORMANT during align-mode-ON (D-02 (a) achieves this via overlay
  pointer-events).
- **`scripts/with_server.py`** — Wave-0 RED-test infrastructure.
- **`test/live-e2e/conftest.py`** — Playwright fixtures + flake retry.

### Established Patterns
- **Lazy-load IIFE bundle via dynamic script-tag injection** — Phase 35-iter2
  h1 proven pattern. Phase 36 keeps this for the align-mode bundle.
- **`window.TT_BEAMER_*` global registration** — IIFE modules register
  on window after script-tag load. Phase 36 keeps this; bootHandleUi
  reads from these globals (which are guaranteed present by
  output-align-mode-loader's bundle).
- **`bootX({...})` API pattern** — `bootReceiver`, `bootOutputAudioBinder`,
  `bootOutputLiveSync`, `bootAlignMode`. New `bootHandleUi` follows:
  single object arg, named fields, returns `{ stop }`.
- **2-second post-load prefetch** — Phase 35-iter2 h1 pattern. After
  page-DCL, 2s timer prefetches the bundle so first toggle is cache-hit-fast.

### Integration Points
- **`output.html` script-tag list** — currently 5 src-based scripts (≤8
  budget per D-09). Phase 36 keeps this; bundle stays lazy-loaded.
- **`runtime-orchestration.js`** — dashboard's main init. Refactor moves
  polygon-editor + handle-ui init to `bootHandleUi(...)` call. Existing
  args become explicit named fields.
- **`#ssr-input-overlay` div in output.html** — present today (line 51).
  Phase 36 toggles its `pointer-events` style via JS when align-mode
  changes (D-02).
- **`#stage` + `#room-overlay`** divs — REMOVED from /output/ today
  (h9 cleanup). Phase 36 RE-ADDS them (in lazy-loaded bundle DOM, not
  output.html, to preserve thin initial load).

### Anti-patterns to avoid (Phase 35 lessons)
- **Grep-based ctx audit** — Phase 35-A's "~40 of 60 fields are no-op"
  was wrong. Phase 36 D-07 mandates runtime-trace + AST union.
- **`<script defer>` for every IIFE** — Phase 35-iter2 h1 fixed this.
  D-09 BLOCKING grep-assertion prevents regression.
- **Two competing event-handling models layered** — Phase 35-A iter2
  layered hitTestVertex (model A) + handle DOM (model B) → corner clicks
  hit overlay first. D-02 (a) eliminates by making one path active
  per align-mode state.
- **Stub-by-grep for dashboard-only ctx fields** — replaced by D-07
  inventory + explicit no-op-with-rationale stubs.
- **Pure unit-tests as the regression layer** — Phase 35 lesson.
  D-03 mandates pure E2E.

</code_context>

<specifics>
## Specific Ideas

- The runtime-trace harness for D-07 should be a one-shot debug entry
  in `runtime-orchestration.js` gated by a query-string flag (e.g.,
  `?ctx-trace=1`). Operator opens dashboard with the flag, exercises
  every align-mode interaction, dumps the access-log to console.
  Researcher captures the dump, dedupes, produces the canonical
  inventory.
- `bootHandleUi`'s API should NOT accept a "ctx" arg as a black-box.
  Every field that was `ctx.X` in current code becomes an explicit
  named arg of `bootHandleUi`. This is Option H's whole point.
- The CSS rule `body[data-output-role="final-output"].align-mode-active
  .projection-corner-handle { pointer-events: none !important }` is
  REMOVED in Phase 36 D-02. The replacement is JS-toggled `style.pointerEvents`
  on `#ssr-input-overlay` driven by `liveSync.onAlignModeChange`.
- Phase 36 plan should include a BLOCKING task: "verify dashboard
  align-mode E2E is GREEN" before declaring closure. Phase 35 W0
  deferred-items.md noted the existing dashboard rail had endpoint
  mismatch (`/api/live/mutate` vs `/api/live/command`); Phase 36
  resolves this.
- `bootHandleUi` returns `{ stop }` for teardown. When align-mode
  toggles OFF: stop() runs → handles unmount → DOM cleanup → overlay
  pointer-events restored.

</specifics>

<deferred>
## Deferred Ideas

- **Pi-hardware visual UAT** — full multi-cycle visual verification on
  actual Pi 4. Pattern: same as Phase 33/34/35 — deferred until Pi accessible.
- **handle-ui internal modularization** — splitting handle-ui (1756 LOC)
  into smaller files is internal cleanup, NOT scope of Phase 36's
  Option-H refactor. Planner can include if it reduces refactor risk
  but it's optional.
- **Pixel-diff visual regression suite** — discussed in Phase 34, rejected.
  Could revisit if banding-class regressions become recurring.
- **Phase 37 transformation banding** — separate phase, the projection-
  transform path's 8-bit precision issue. NOT Phase 36 scope.
- **Animation-engine refactor** — many animations have gradient
  artifacts even dithered. Multi-phase effort.
- **Server-side undo log** — D-04 lock is client-local. If dashboard
  starts wanting cross-tab undo coordination, that's a future phase.
- **Right-click forwarding to dashboard** — D-05 lock is local rendering.
  If operator workflow ever needs the dashboard's view of context-menu
  (e.g., for keyboard-only operation), revisit.

</deferred>

---

*Phase: 36-comprehensive-alignmode-thin-output · Context · 2026-05-10 · derived from Phase 35 closure ITER2 addendum + ROADMAP.md Phase 36 entry + 2026-05-10 discuss-phase session*
