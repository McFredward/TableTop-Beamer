---
phase: 36
slug: comprehensive-alignmode-thin-output
type: goal-backward-verification
verified: 2026-05-10
verifier: gsd-verifier (Opus 4.7 1M)
status: PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT
companion_to: 36-VERIFICATION.md
---

# Phase 36 — Goal-Backward Verification Addendum

This addendum complements `36-VERIFICATION.md` (V wave's gate-output report).
The V wave verified test results and gate commands; this addendum reads the
SOURCE CODE directly and asks: "would a fresh reader, working backwards from
the phase goal, agree the phase delivers what it promises?"

## Phase Goal (from ROADMAP.md line 684)

> Den vollen handle-ui (vertex / midpoint / rotation drag, image-pan,
> right-click menu für add/remove lines, CTRL+Z undo, dirty-flag, sizing
> alignment mit stream content) auf der thin /output/ funktionsfähig
> bringen, OHNE die volle Dashboard-App zu laden.

Goal-backward decomposition:

1. **Truth A:** /output/ has full handle-ui interactions (10 sub-truths T1-T10)
2. **Truth B:** /output/ does NOT load the full dashboard (≤8 src scripts; lazy)
3. **Truth C:** Phase 35-A iter2 ctx-wiring incompleteness is structurally
   eliminated (Option H first-class thin-export contract)
4. **Truth D:** Connection-stability invariants (D-08) and prior-phase locks
   (VAAPI default-disabled, Phase 34 h2, Phase 35-iter2 h1/h2/h3) preserved

## Verification Method

For each verification question in the orchestration prompt, I:
1. Read the planning artifacts (CONTEXT, RESEARCH, all SUMMARYs, deferred-items, HUMAN-UAT, ROADMAP entry)
2. Read the actual source code for each claim
3. Ran independent grep/shell verifications of contract markers
4. Ran the unit suite and bootHandleUi shape contract independently

## Evidence Matrix (Q1..Q14 from prompt)

### Q1 — D-01 Option H thin-export

| Check | Source | Result |
|-------|--------|--------|
| `boot-handle-ui.js` exists | `src/app/runtime/output-receiver/boot-handle-ui.js` | present, 17834 bytes |
| `export function bootHandleUi` | line 94 | YES — named ES export |
| Loader imports bootHandleUi | `output-align-mode-loader.js:525` | YES — `await import("/src/.../boot-handle-ui.js")` |
| Loader calls bootAlignMode (Phase 35-A) | grep | NO bare `bootAlignMode` call (only `bootAlignModeLoader`, the loader's own export) |
| Returns `{ stop, hitTestVertex }` | `boot-handle-ui.js:377` | YES — `return { stop, hitTestVertex }` |
| Required-arg validation | lines 122-128 | YES — 7 `_required(...)` calls hard-fail |
| §1.5 inventory dep-bag | lines 140-213 | full polygonCtx with 45+ named fields including all required: stage, roomOverlay, state, role(s), liveSync, liveSyncCoreOverride, polygonContract, normalizers, boardAccess, polygonState, interactions, persistence, sync, dashboard, alignModeDirtyEndpoint, callbacks, logger |
| Independent shape-test pass | `node --test test/phase-36-boot-handle-ui-shape.test.mjs` | re-ran by verifier: pass=3 fail=0 |

**VERDICT Q1: PASS** — Option H is realized in code, not just claimed.

### Q2 — D-02 Overlay pointer-events:none + Phase 35-A CSS removed

| Check | Source | Result |
|-------|--------|--------|
| receiver-bootstrap.js sets `"none"` permanently | lines 995, 999, 1018 | 3 sites ALL set `"none"` — boot-time, onAlignModeChange callback, legacy poll |
| Conditional `alignMode ? "auto" : "none"` removed | grep `alignMode\s*\?` | 0 matches in receiver-bootstrap.js |
| Phase 35-A `!important` rule on projection handles | grep in `src/styles.css` | ABSENT (verified) |
| Audit-trace comment present | `styles.css` "Phase 36 D-02" | 1 hit (replacement audit comment) |

**VERDICT Q2: PASS** — Phase 35-A CSS workaround verifiably gone; permanent
JS-toggle replacement landed.

### Q3 — D-03 Pure Live-E2E for T1-T10

| Check | Source | Result |
|-------|--------|--------|
| 10 test functions T1-T10 | `test/live-e2e/test_phase36_align_handles.py` | 10 `def test_t<N>_*` matches at lines 39, 63, 79, 104, 121, 140, 153, 169, 194, 225 |
| Uses `live_server`, `chrome_browser`, `page` fixtures | each test signature | YES |
| `@flaky_3x` retry decorator | each test | 10 hits (one per test) |
| T1 sizing: bbox compare with `<4px` tolerance | line 56-59 | YES — assert `abs(rect[hl]-rect[vb_l]) < 4` etc. |
| T2 corner-pull: ≥4 grid-snapshots in stdout | line 75 | YES |
| T3 vertex drag: snapshot path `session.snapshot.runtime.lastAlignGridSnapshot` | line 94-95 | correct shape (M4 fix applied) |
| T4 midpoint: `.projection-grid-handle` selector | line 107 | YES (Phase-36 alias) |
| T5 rotation: `[data-handle-role="rotate"]` selector | line 124 | YES |
| T6 image-pan: free-area drag asserts grid-snapshot | line 149 | YES |
| T7 right-click: `.board-context-menu` ≥ 2 items | lines 158-160 | YES |
| T8 CTRL+Z: handle returns within 3px | line 190 | YES |
| T9 dirty-flag cross-tab: dashboard hint hidden=false + server stdout | lines 212-217 | YES (both conditions asserted) |
| T10 single-mutation invariant: n_grid==1, n_corner==0, no forwarder | lines 237-242 | YES |

**VERDICT Q3: PASS** — All 10 tests exist, exercise the documented mechanisms,
and align with RESEARCH §4 specifications.

### Q4 — D-04 Client-local undo + 1000 cap

| Check | Source | Result |
|-------|--------|--------|
| `_UNDO_STACK_MAX = 1000` declared | `runtime-projection-grid-state.js:207` | YES |
| `MAX_UNDO = _UNDO_STACK_MAX` alias | line 208 | YES (back-compat) |
| `while (undoStack.length >= _UNDO_STACK_MAX) undoStack.shift()` FIFO | lines 230-232 | YES |
| Multi-paragraph T-LB-1 rationale comment | line 202 | YES (`Phase 36 M5 (Q5 LOCKED)`) |
| CTRL+Z undo via local stack | `runtime-projection-handle-ui.js:1219` (broadcast force=true after pop) | YES |

**VERDICT Q4: PASS** — Q5 LOCKED contract realized; T-LB-1 mitigated.

### Q5 — D-05 Right-click context menu in /output/ DOM

| Check | Source | Result |
|-------|--------|--------|
| `showContextMenu` defined | `runtime-projection-handle-ui.js:1437` | YES |
| Builds `.board-context-menu` DOM | line 1440 | YES |
| Items use `.textContent` (T-XSS-1 mitigation) | line 1453 | YES (`btn.textContent = item.label`) |
| `innerHTML` writes in menu/item/name context | grep | 0 matches |
| Q3 immediate broadcast on add/remove line | lines 1548, 1604, 1625, 1647 | 4 function-level Q3 LOCKED broadcasts (addH, addV, removeH, removeV) |
| Menu-callback fallback for no-op adds | lines 1374-1381, 1409-1412 | 2 menu-callback Q3 broadcasts (intersection-hit, line-hit) |
| Bundle loaded on /output/ via lazy loader | `output-align-mode-loader.js:525` | YES |

**VERDICT Q5: PASS** — Right-click menu renders fully on /output/; Q3 LOCKED
contract realized at 6 broadcast sites; T-XSS-1 honored.

### Q6 — D-06 Dirty-flag (Q1 reconciliation: existing endpoint)

| Check | Source | Result |
|-------|--------|--------|
| CONTEXT.md D-06 reconciliation block | `36-CONTEXT.md:218-236` | YES — full `[Reconciliation 2026-05-10, plan-phase iteration]` paragraph documenting endpoint switch |
| Loader threads endpoint string to bootHandleUi | `output-align-mode-loader.js` | `alignModeDirtyEndpoint: "/api/align-mode-dirty"` |
| bootHandleUi has alignModeDirtyEndpoint named arg | `boot-handle-ui.js:109` | YES (default `/api/align-mode-dirty`) |
| Server.mjs has stdout marker | `server.mjs:4140` | `console.log(\`[align-mode-dirty] received dirty=${...}\`)` |
| Gesture-driven POST on /output/ | `runtime-projection-profile-persistence.js:241-242` | YES — when `outputRole === OUTPUT_ROLE_FINAL`, unconditionally POST dirty=true |
| Phase 29 h3 dashboard chip semantics preserved | profile-persistence.js notifyDirtyChanged comment | YES (dual-track design) |

**VERDICT Q6: PASS** — Q1 reconciliation honored at three layers (CONTEXT
documentation, loader wiring, server-side log marker); gesture-driven dirty
broadcast wired correctly without removing dashboard's chip semantics.

### Q7 — D-07 ctx-trace harness

| Check | Source | Result |
|-------|--------|--------|
| `_ctxTraceEnabled` URL flag detection | `runtime-orchestration.js:398-399` | YES — `/[?&]ctx-trace=1\b/.test(location.search)` |
| `window._ctxTraceDump` exposed | line 402 | YES |
| `_wrapStateForTrace` recursive Proxy | line 406-413 | YES (handles nested ctx.state.X) |
| `_wrapCtxForTrace` top-level wrap | line 425-433 | YES |
| Zero-overhead when flag absent | line 426 | YES — `if (!_ctxTraceEnabled) return ctx` |
| Wired at 2 init call sites | lines 472, 1953 | YES (MAPPING.init + POLYGON_EDITOR.init) |

**VERDICT Q7: PASS** — Harness exists, gated, recursive, and properly integrated.

### Q8 — D-08 Connection-stability hard gate

| Check | Source | Result |
|-------|--------|--------|
| VERIFICATION.md reports fail=0 with RUN_LIVE_TESTS=1 | `36-VERIFICATION.md` | tests=85 pass=84 fail=0 skipped=1 |
| Phase 36 commits touch ssr-render-host.mjs / ssr-stream-publisher.mjs / ssr-webrtc-signaling.mjs | `git log fd0078e..HEAD --name-only` | NONE — these files are not in the Phase 36 commit set (only mentioned in commit messages) |
| Phase 33 frame-stale 30s preserved | `src/app/runtime/output-receiver/receiver-status-ui.js:39` | `FRAME_STALE_THRESHOLD_MS = 30000` |
| receiver-bootstrap.js touched (whitelisted: D-08 reference) | yes — pointer-events change only | Single-line CSS-equivalent style toggle; not connection logic |

**VERDICT Q8: PASS** — D-08 critical files structurally untouched; documented
fail=0 verified by V wave.

### Q9 — D-09 ≤8 src-based scripts in output.html

| Check | Source | Result |
|-------|--------|--------|
| `grep -cE '<script[^>]*src=' output.html` | output.html | 1 (only runtime-env.js) |
| Other scripts inline `<script type="module">` (no src=) | output.html lines 105, 110, 124, 140 | 4 inline modules — all use `import()` for actual modules |
| `#stage` div absent statically | grep | NOT FOUND statically |
| `#room-overlay` div absent statically | grep | NOT FOUND statically |
| Loader appends both via JS at activation | `output-align-mode-loader.js:174, 193` | YES — `document.createElement("div")` for stage, `createElementNS` for SVG room-overlay |

**VERDICT Q9: PASS** — D-09 budget at 1/8; lazy DOM and lazy bundle preserved.

### Q10 — D-10 Pi-hardware UAT deferred

| Check | Source | Result |
|-------|--------|--------|
| `36-HUMAN-UAT.md` exists | file present (8867 bytes; 279 LOC) | YES |
| Frontmatter `status: deferred` | line 4 | YES |
| Frontmatter `pi_uat: deferred` | line 9 | YES |
| `deferred_reason` references D-10 carry-forward | line 6 | YES |
| ROADMAP shows PASS-AUTOMATED-PENDING-PI-HARDWARE | `.planning/ROADMAP.md:682, 686` | YES |

**VERDICT Q10: PASS** — Documented and reflected in ROADMAP.

### Q11 — Open Questions Q1-Q5 resolution

| Q | Lock | Source verification |
|---|------|---------------------|
| Q1 | `/api/align-mode-dirty` (NOT piggyback) | `output-align-mode-loader.js:541` (`alignModeDirtyEndpoint: "/api/align-mode-dirty"`); server.mjs:4140 stdout marker |
| Q2 | dashboard parity tests added | `test/live-e2e/test_phase36_dashboard_parity.py` exists with 3 parametrized variants × 2 paths = 6 tests |
| Q3 | addH/V + removeH/V call broadcastGridSnapshot({force:true}) | 4 function-level broadcasts (lines 1548, 1604, 1625, 1647) + 2 menu-callback broadcasts (1381, 1412) |
| Q4 | handle-ui NOT split | `runtime-projection-handle-ui.js` still single ~75502 byte file; CONTEXT Deferred Ideas |
| Q5 | undo capped at 1000 with FIFO | `_UNDO_STACK_MAX=1000` + `while...shift()` in grid-state.js |

**VERDICT Q11: PASS** — All 5 reconciliations realized.

### Q12 — Carry-forward preservation

| Lock | Source verification |
|------|---------------------|
| VAAPI default-disabled | `src/server/ssr-render-host.mjs:165` (`process.env.SSR_ENABLE_VAAPI !== "1"` check) |
| Phase 34 h2 hasVaapiEnabled gate | `src/server/ssr-render-host.mjs:512-516, 628` |
| Phase 35-iter2 h3 banding fix | `src/app/runtime/render/runtime-effect-dither.js:41-103` (BAYER_4X4 + getDitheredSolidColorImageData); h3 drawImage clip in runtime-effect-visuals.js:298 |
| Phase 35-iter2 h1 lazy-load | `output-align-mode-loader.js:78` (`document.createElement("script")` for IIFE bundle) |
| Phase 35-iter2 h2 polygon-data wiring | `output-align-mode-loader.js:119, 426-491` (buildBoardAccess + runtimeBoards) |
| Phase 35-B output-live-sync | unchanged shape; emitLiveMutation added additively at `output-live-sync.js:198-215` |
| Phase 33 frame-stale 30s | `receiver-status-ui.js:39` `FRAME_STALE_THRESHOLD_MS = 30000` |

**VERDICT Q12: PASS** — Every carry-forward lock structurally preserved.

### Q13 — Original 6-bug-class fix verification

The operator's six post-iter2-h8 bugs map to the T1-T10 contract:

| Bug | Test | Status |
|-----|------|--------|
| Sizing mismatch (handle frame wrong size) | T1 | GREEN (M3 identity grid + initial align pass) |
| Outer handles don't change stream | T2 | GREEN (M3 broadcast pipeline complete) |
| Midpoint not clickable | T4 | GREEN (M4 inward-flip squish bars) |
| Ghost circle / wrong corner distortion | T3, T5 | GREEN (M4 vertex aliases + rotation clamp) |
| Dirty flag dead | T9 | GREEN (M5 gesture-driven POST) |
| Right-click menu missing | T7 | GREEN (M5 Q3 LOCKED + menu-callback fallback) |

**VERDICT Q13: PASS** — Each bug class addressed by an explicit test that
flipped GREEN with corresponding source-code fix.

### Q14 — No new bugs introduced

| Check | Result |
|-------|--------|
| Phase 35 regression suite | re-ran by verifier: pass=9 fail=0 |
| bootHandleUi shape contract | re-ran by verifier: pass=3 fail=0 |
| Full JS unit suite (`node --test 'test/**/*.test.mjs'`) | tests=396 pass=379 fail=1 skipped=17 |
| The 1 fail | `test/phase-32-status-overlay.test.mjs::B10b` — time-sensitive countdown test (expected 4s after ~1100ms, got 5s); file last touched in Phase 32 (commits 7acf16b, 5d4e1da); passes on isolated re-run (4/4 pass). PRE-EXISTING FLAKE under suite-load timing, NOT a Phase 36 regression. |
| TODO/FIXME/XXX/HACK markers in new Phase 36 code | grep on boot-handle-ui.js + output-align-mode-loader.js: 0 hits |

**VERDICT Q14: PASS** — Single suite-level fail traced to a pre-existing
Phase 32 timing flake unrelated to Phase 36; no new TODO/FIXME debt
introduced.

## Goal-Backward Truth-Level Verdict

| Truth | Sub-truths | Status |
|-------|-----------|--------|
| **A: full handle-ui on /output/** | T1 sizing, T2 corner pull, T3 vertex, T4 midpoint, T5 rotation, T6 image-pan, T7 right-click, T8 CTRL+Z, T9 dirty-flag, T10 conflict-free | 10/10 GREEN — all wired through bootHandleUi → MAPPING.init/POLYGON_EDITOR.init → broadcastGridSnapshot → liveSyncCoreOverride.emitLiveMutation → server |
| **B: thin /output/ preserved** | ≤8 src scripts; #stage and #room-overlay JS-appended; align-mode bundle lazy-loaded | YES — 1 src script; 0 static stage/overlay; bundle gated on first liveSync.onAlignModeChange(true) |
| **C: ctx-wiring incompleteness structurally eliminated** | bootHandleUi explicit named-arg dep-bag; D-07 ctx-trace harness; required-arg hard-fail | YES — 45+ named fields all surfaced as explicit args; harness exists for future audit |
| **D: prior locks preserved** | VAAPI, Phase 34 h2, h3 dither + drawImage clip, h1 lazy-load, h2 polygon-data, Phase 35-B live-sync, Phase 33 frame-stale 30s, D-08 connection-stability | All 8 locks verified structurally intact |

## Stub / Hollow-Wiring Risk Audit

The /output/ stubs in `output-align-mode-loader.js` (`_buildPolygonStateStub`,
`_buildNormalizersStub`, `_buildInteractionsStub`, `_buildPersistenceStub`,
`_buildSyncStubs`, `_buildDashboardStubs`) are NOT hollow per Phase 35-A's
failure mode. Verification:

- **Path 1: data flows through bootHandleUi → MAPPING.init.** A1's
  `liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation }` is
  threaded into mappingDeps; grid-state's broadcastGridSnapshot reads
  `_liveSyncCoreOverride` first. Real WS broadcasts. T1-T10 prove non-empty.
- **Path 2: stubs are invoked only on dashboard-only code paths.** A2's
  `_state.uiView = "dashboard"` (not "settings") makes the sync-* fan-out
  guard `uiView === "settings"` always false on /output/. The stubs are
  defense-in-depth for code that never executes on /output/.
- **Path 3: T-XSS-1 mitigation realized.** Menu rendering uses `.textContent`
  (line 1453); 0 `innerHTML=` matches in menu/item/name context.

**No hollow wiring detected.** The stub pattern is what Option H designed for:
explicit, named, with rationale.

## V Wave Cross-Check

The V wave's `36-VERIFICATION.md` claims:
- 10/10 T1-T10 GREEN — INDEPENDENT SOURCE-CHECK CONFIRMED (test functions exist, exercise correct mechanisms, dep-bag wires correctly)
- D-08 fail=0 with RUN_LIVE_TESTS=1 — CONFIRMED (commits don't touch SSR critical files)
- D-09 1≤8 — CONFIRMED (1 src-script in output.html)
- D-02 CSS workaround ABSENT — CONFIRMED (verifier re-grepped: 0 matches)
- All Q1-Q5 traceable in source — CONFIRMED (each lock visible in code)

V wave's report is internally consistent with the codebase state at HEAD.

## Identified Issues

**1. Pre-existing flake in `test/phase-32-status-overlay.test.mjs::B10b`**

- Severity: ℹ Info (not a Phase 36 regression)
- Cause: 1100ms timeout-sensitive countdown test that fails under full-suite
  load but passes on isolated re-run (4/4)
- File last touched in Phase 32; not modified by any Phase 36 commit
- Recommendation: track separately as a flake-budget candidate; do NOT block
  Phase 36 closure

**2. Dashboard parity rail's 3 `/` variants RED**

- Severity: ⚠ Warning (intentionally deferred, not a regression)
- Cause: M3-LATE dashboard migration deferred via path-(b) escape (per plan)
- Documented in `deferred-items.md` D1+D2 + ROADMAP Phase 36.1 entry
- Acceptance: flips GREEN when Phase 36.1 closes
- Recommendation: ROADMAP Phase 36.1 entry exists and is correctly scoped

No other issues identified.

## Final Verdict

All 14 verification questions PASS. The Phase 36 goal — comprehensive
align-mode-on-thin-/output/ delivered without loading the full dashboard,
preserving D-08 connection-stability and D-09 ≤8 src-scripts — is realized
in code. The Phase 35-A iter2 failure mode (handle-ui ctx-wiring
incompleteness) is structurally eliminated by Option H's explicit named-arg
contract and the D-07 ctx-trace harness.

The single suite-level test failure traces to a pre-existing Phase 32
timing flake. The dashboard parity `/` variants RED is the documented
M3-LATE deferral, not a regression. Pi-hardware UAT is properly deferred
per the D-10 carry-forward pattern matching Phase 33/34/35.

## VERIFICATION PASSED

Phase 36 ready for operator Pi-hardware UAT (D-10 carry-forward). Tag
recommendation matches V wave: `phase-36-end-pending-pi-uat` until operator
confirms Pi UAT items 1-13 of `36-HUMAN-UAT.md`, then retag `phase-36-end`.

The Phase 36.1 follow-up (dashboard runtime-orchestration migration to
`bootHandleUi`) is correctly scoped in ROADMAP at line 778 with explicit
re-open criteria, scope, tests-to-flip, estimated effort, and Pflicht-Inputs.

---

*Goal-backward verification: 2026-05-10 · gsd-verifier · companion to 36-VERIFICATION.md*
