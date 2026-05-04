---
phase: 28-cross-cutting-ux-state-polish
plan: 05
subsystem: diagnostic-overlay-dashboard-topbar-integration
tags: [b6, b6-d14, b6-d15, b6-d16, b6-d17, output-status-chip, topbar-integration, css-only, dom-relocation, auto-mode]

# Dependency graph
requires:
  - phase: 26
    provides: state.diagnosticOverlay live-sync via global-config-update broadcast (Phase 26 h9 wired toggle → save → broadcast → applyGlobalDefaultsPayloadToState → syncRuntimePanelsFromState → syncDiagnosticOverlayPanel → body[data-diagnostic-overlay]).
  - phase: 28-cross-cutting-ux-state-polish
    plan: 04
    provides: Verified applyGlobalDefaultsPayloadToState runs cleanly via the asset-manifest broadcast pipeline; live-sync envelope healthy.
provides:
  - "src/styles.css: new `body:not([data-output-role=\"final-output\"]) .output-status-chip` inline-variant rule that overrides position/top/right/z-index/margin/align-self so the chip integrates with the dashboard topbar flex."
  - "index.html: #output-status-chip element relocated from top-level (former line 55) into `.rd-topbar-actions` as the last child (after the theme-toggle button) — author-time literal move (Option A from the plan, no JS re-parent needed)."
  - "Existing /output/ behavior unchanged: the original `.output-status-chip { position: fixed; top: 8px; right: 8px; z-index: 9999; ... }` rule (lines 125–141) is intact, and the `:not(...)` selector on the new rule excludes the /output/ body so the existing rule wins there. position:fixed removes the chip from layout flow regardless of its parent in the DOM."
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS specificity-based variant selection: `body:not([attr])` is higher specificity than `.x` alone, so the inline-variant rule beats the base rule on the dashboard. On /output/ the body has the attribute, the `:not()` selector fails, and the base rule (position:fixed) wins. No JavaScript role detection, no class toggling, no runtime DOM mutation."
    - "DOM-flow-vs-fixed-position decoupling: `position: fixed` removes an element from layout flow regardless of its parent. So moving the chip INTO `.rd-topbar-actions` does NOT break /output/ — the chip is still rendered at top:8px right:8px because position:fixed is applied. The author-time DOM move only affects the dashboard where position:static restores flow-layout participation."

key-files:
  created:
    - .planning/phases/phase-28/28-05-SUMMARY.md
  modified:
    - src/styles.css
    - index.html

key-decisions:
  - "Implementation choice: Option A (literal author-time DOM move in index.html), NOT Option B (runtime re-parent in runtime-bootstrap.js). Reason: the chip's `position: fixed` rule for /output/ makes its parent irrelevant to layout, so the simpler approach (a single index.html move + a single CSS rule) suffices. No JavaScript module is added, no runtime branching is needed."
  - "Insertion point inside `.rd-topbar-actions`: the chip is appended as the LAST child, after the theme-toggle button (and after the screen-reader hint, the align-mode-button, the align-mode-indicator, and the running-count-chip). This keeps the chip on the right edge of the topbar, mirroring its existing visual position on /output/."
  - "Wave-0 smoke checkpoint (Task 1) auto-resolved with 'skip — assume it works' per the auto-mode contract. Phase 26 h9 already wired state.diagnosticOverlay → applyGlobalDefaultsPayloadToState → broadcast → syncDiagnosticOverlayPanel; Plan 28-04 just verified the broadcast envelope is healthy. The structural pipeline is intact per RESEARCH §A4. No live-sync patches were added in Plan 28-05."
  - "Visual smoke checkpoint (Task 3) auto-resolved with 'approved' per auto-mode handling: all automated grep checks in Task 2's <verify> block returned their expected values, the existing `.output-status-chip` rule (lines 125–141) is unchanged, and the chip is now inside `.rd-topbar-actions` in index.html. The user's phase-end browser smoke test will provide the final visual confirmation."
  - "z-index: auto in the inline variant (rather than a numeric value below 50) avoids any potential conflict with Phase 27 h9's `#align-mode-dirty-hint` (z-index: 50). Inside the topbar flex, the chip's stacking context is the natural document flow — no need to fight for z-index real estate against fixed-positioned dashboard chrome."

requirements-completed: [B6]

# Metrics
duration: 1m24s
completed: 2026-05-04
---

# Phase 28 Plan 05: B6 Diagnostic-Overlay Dashboard-Topbar Integration Summary

**Two-line CSS + literal HTML move resolves B6 D-14: the dashboard's `#output-status-chip` no longer overlaps the TableTop Beamer logo + title. The chip is moved at author time from its former top-level position (line 55) into `.rd-topbar-actions` as the last child after the theme-toggle button, and a new CSS rule `body:not([data-output-role="final-output"]) .output-status-chip` overrides `position/top/right/z-index/margin/align-self` so the chip integrates into the dashboard topbar's flex layout. /output/ behavior is unchanged (B6 D-15) — the existing `.output-status-chip { position: fixed; top: 8px; right: 8px; z-index: 9999; ... }` rule (lines 125–141) is intact, and because the `:not(...)` selector excludes the /output/ body, the base rule still wins there; position:fixed removes the chip from layout flow regardless of its parent. No JavaScript module added, no runtime re-parenting; both checkpoints (Wave-0 live-sync smoke and post-Task-2 visual smoke) auto-resolved per the auto-mode contract.**

## Performance

- **Duration:** ~1 min 24 s
- **Started:** 2026-05-04T15:48:47Z
- **Completed:** 2026-05-04T15:50:11Z
- **Tasks:** 3 (Task 1 auto-skip, Task 2 auto-implement single GREEN commit, Task 3 auto-approve)
- **Files modified:** 2 (src/styles.css, index.html)
- **Files created:** 1 (this SUMMARY.md)
- **Commits:** 1 task commit + 1 docs commit

## Wave-0 Live-Sync Smoke Result (Task 1)

**Resolution:** AUTO-SKIP per auto-mode checkpoint contract — `"skip — assume it works"` was the locked answer.

**Rationale (recorded for posterity):**
- Phase 26 h9 wired the path: System-tab toggle → `setDiagnosticOverlay()` → `saveGlobalDefaultsToServer()` → server broadcasts `global-config-update` → `runtime-live-sync-core` refetches → `applyGlobalDefaultsPayloadToState` → `syncRuntimePanelsFromState` → `syncDiagnosticOverlayPanel` → `document.body.dataset.diagnosticOverlay = "true"|"false"`.
- The CSS toggle rule `body[data-diagnostic-overlay="true"] .output-status-chip { display: inline-flex; }` is intact (line 145 of `src/styles.css`) and unmodified by Plan 28-05.
- Plan 28-04 just confirmed `applyGlobalDefaultsPayloadToState` runs cleanly via the asset-manifest broadcast pipeline — the same envelope the diagnostic-overlay flag rides on.
- No live-sync patches were added in Plan 28-05.
- If a future browser smoke shows the toggle does NOT propagate to /output/, a follow-up plan adds an explicit `syncDiagnosticOverlayPanel()` call to `applyGlobalDefaultsPayloadToState` (recipe documented in 28-RESEARCH.md §"Open Question 4"). RESEARCH §A4 confidence is MEDIUM not LOW; the structural path is intact.

## CSS Rule Added (literal copy)

```css
/* Phase 28 B6 D-14: dashboard-inline variant. /output/ retains the fixed
   top-right floating style; the dashboard integrates the chip into the
   topbar flex so it doesn't overlap the logo + title. */
body:not([data-output-role="final-output"]) .output-status-chip {
  position: static;
  top: auto;
  right: auto;
  z-index: auto;
  margin-left: 6px;
  align-self: center;
}
```

Inserted in `src/styles.css` at lines 149–159, immediately after the existing `body[data-diagnostic-overlay="true"] .output-status-chip { display: inline-flex; }` rule (line 145–147).

The pre-existing `.output-status-chip` base rule at lines 125–141 (display:none + position:fixed + top:8px + right:8px + z-index:9999 + chip styling) is intact and unmodified — `/output/` continues to render exactly as before.

## index.html Relocation

**Before (Plan 28-05 start):** `#output-status-chip` was a top-level `<div>` at line 55, OUTSIDE the topbar:
```
line 55: <div id="output-status-chip" class="output-status-chip" aria-hidden="true">
line 65: </div>
line 66: <div class="app-shell">
```

**After Plan 28-05:** The chip lives inside `.rd-topbar-actions` (which opens at line 129 and closes at line 194) as the LAST child, after the theme-toggle button:
```
line 167: <button id="theme-toggle-button" ...>
line 179:   ...</button>   <!-- end of theme toggle -->
line 180: <!-- Diagnostic chip — visible when body has data-diagnostic-overlay="true".
line 181:      On /output/ renders top-right fixed (current style); on dashboard renders
line 182:      inline inside the topbar flex (Phase 28 B6). -->
line 183: <div id="output-status-chip" class="output-status-chip" aria-hidden="true">
   ...
line 193: </div>
line 194: </div>   <!-- end of .rd-topbar-actions -->
```

The HTML comment was rewritten to reflect the new dual reality (dashboard inline / /output/ fixed). The element's id, class, aria-hidden attribute, and all child `<span>` descendants are unchanged.

## Visual Smoke Result (Task 3)

**Resolution:** AUTO-APPROVED per auto-mode checkpoint contract — all preconditions met:

| Auto-approval gate | Expected | Actual |
|---|---|---|
| Task 2 grep checks all return expected values | yes | yes (see "Acceptance Criteria Evidence" below) |
| Existing `.output-status-chip` rule (lines 125–141) intact | yes | yes (re-read after edit; unchanged) |
| Chip is inside `.rd-topbar-actions` in index.html | yes | yes (chip @ line 183, actions opens @ line 129 / closes @ line 194) |

Visual verification (browser-based, two-window smoke per the plan's `<how-to-verify>` block) is DEFERRED to the user's manual phase-end smoke test, per the auto-mode contract.

## Acceptance Criteria Evidence (Task 2)

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -F 'body:not([data-output-role="final-output"]) .output-status-chip' src/styles.css` | 1 | 1 |
| `grep -cF "position: static" src/styles.css` | ≥1 | 5 (1 new rule + 4 pre-existing rules in unrelated CSS — all retained) |
| `grep -cF "margin-left: 6px" src/styles.css` | ≥1 | 1 |
| `grep -cF 'body[data-diagnostic-overlay="true"] .output-status-chip' src/styles.css` | 1 | 1 (existing toggle rule intact) |
| Existing chip rule `.output-status-chip { ... position: fixed; top: 8px; right: 8px; z-index: 9999; ... }` lines 125–141 intact | yes | yes (verified by re-reading after edit) |
| `<div id="output-status-chip">` is inside `.rd-topbar-actions` | yes | yes (chip @ line 183, parent .rd-topbar-actions @ line 129) |
| Original chip location at line 55 is gone | yes | yes (`grep -n 'output-status-chip' index.html` returns single match at line 183 only) |
| Balanced braces in CSS | open == close | 332 == 332 |
| `node --test "test/**/*.test.mjs"` exits 0 | yes | yes (25 pass / 0 fail / 0 skip) |

### Plan-level `<verification>` block

| Criterion | Expected | Actual |
|---|---|---|
| `node --test "test/**/*.test.mjs"` exits 0 | yes | yes |
| `grep -F 'body:not([data-output-role="final-output"]) .output-status-chip' src/styles.css` returns 1 | yes | 1 |
| Chip is a child of `.rd-topbar-actions` in index.html | yes | yes |
| Manual smoke (Tasks 1 + 3) | manual | auto-resolved per auto-mode contract; user phase-end browser smoke owns final visual sign-off |

## Test Suite Output

Run command: `node --test "test/**/*.test.mjs"`

```
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 60.317975
```

Plan 28-05 added zero tests (B6 has no automated test scaffold per VALIDATION.md — manual smoke only). The suite was at 25/25 before Plan 28-05 (post-Plan-28-04 baseline) and remains at 25/25 after Plan 28-05.

## Task Commits

1. **Task 2 — feat: inline-variant chip in topbar + DOM relocation** — `ef2d60d`

(Tasks 1 and 3 are checkpoints with no code changes; both auto-resolved per the auto-mode contract.)

## Decisions Made

(Frontmatter `key-decisions:` field captures all 5 decision rationale entries.)

## Deviations from Plan

None. Plan executed exactly as written, with both checkpoints auto-resolved per the auto-mode handling block (Task 1 auto-skip with locked rationale; Task 3 auto-approve gated on Task 2's automated grep checks all passing).

## Auth Gates

None.

## Issues Encountered

None. Both file edits applied cleanly on the first attempt; no analysis paralysis, no fix loops, no architectural surprises. Two read-before-edit hook reminders fired on the first try at each file (the file had only been read with offset/limit on the very first context-load batch); after re-reading the relevant sections, edits succeeded as expected. Both edits actually succeeded the first time per the tool's success report — the hooks ran post-edit, not pre-edit, and the files were correctly modified before the reminder triggered.

## User Setup Required

None. The change is purely CSS + HTML markup — no environment variables, no migrations, no external services, no runtime behavior changes. The dashboard chip moves from a fixed-position top-right floater into the topbar flex; /output/ rendering is byte-identical.

## Manual Verification (deferred to phase-end browser smoke)

Per the plan's Task 3 `<how-to-verify>` block, the user's phase-end smoke owns these checks:

1. Open dashboard at `http://localhost:3000/` (window A) and `/output/` at `http://localhost:3000/output/` (window B).
2. Toggle "Show diagnostic overlay" ON in the System tab.
3. **Dashboard expectation (window A):** chip appears INLINE inside the topbar's `.rd-topbar-actions`, after the theme-toggle button. The TableTop Beamer logo + title are NOT overlapped. The chip's bounding rect does NOT overlap `#app-version` or `.rd-topbar-brand-title`.
4. **/output/ expectation (window B):** chip appears in the TOP-RIGHT CORNER as a floating pill (position:fixed, top:8px, right:8px), EXACTLY as before. ZERO visual regression on /output/.
5. Toggle OFF — chip disappears in both windows within ~200ms (Phase 26 h9 live-sync).
6. Resize dashboard to 1280px / 1920px / 2560px — chip stays in the topbar without forcing a line-break.
7. Phase 27 h9 chip (`#align-mode-dirty-hint` at top:116px) coexists without z-index collision.

If any visual regression surfaces, a follow-up plan adds CSS tweaks (e.g., adjust `margin-left`, switch `align-self` to a different value, or fine-tune the wrap behavior).

## Known Limitations

- **Visual smoke not automated.** B6 by design has no automated browser-rendering test (per 28-VALIDATION.md). Final layout sign-off remains a human-in-the-loop step.
- **Live-sync confirmation deferred.** Task 1 was auto-skipped on the assumption that Phase 26 h9 wiring is intact. If a future smoke shows /output/ does NOT respond to dashboard toggles, the fix recipe is documented in 28-RESEARCH.md §"Open Question 4".

## Threat Flags

None new. Plan 28-05's threat model accepted T-28-05-01 (info disclosure of APP_VERSION + fps + canvas dims — same exposure as today, layout change only), T-28-05-02 (tampering on shared local network — single-tenant accept), and T-28-05-03 (DoS via toggle spam — existing 200ms debounce). No additional security surface introduced; the change is purely visual.

## Next Phase Readiness

- Phase 28 final plan (28-05) is now complete. All 6 user-test feedback items (B1..B6) have been addressed across plans 28-00..28-05.
- All Wave-0 test scaffolds are active (Plan 28-04 closed the last 4 skips); the test suite is at 25 pass / 0 skip / 0 fail.
- Phase 28 exit criteria (per 28-CONTEXT.md M1..M4) are ready for Phase Verifier review.

## Self-Check: PASSED

- FOUND: `src/styles.css` — new rule `body:not([data-output-role="final-output"]) .output-status-chip` at lines 149–159
- FOUND: `src/styles.css` — existing rule `.output-status-chip { position: fixed; top: 8px; right: 8px; z-index: 9999; ... }` at lines 125–141 INTACT
- FOUND: `src/styles.css` — existing rule `body[data-diagnostic-overlay="true"] .output-status-chip { display: inline-flex; }` at line 145 INTACT
- FOUND: `index.html` — `<div id="output-status-chip">` at line 183, inside `.rd-topbar-actions` (parent opens at line 129, closes at line 194)
- VERIFIED: original chip location at former line 55 GONE (only one `output-status-chip` match in index.html, at line 183)
- FOUND commit: `ef2d60d` (feat 28-05: inline-variant chip in topbar + DOM relocation)
- TEST suite: 25 pass / 0 fail / 0 skip (unchanged from pre-Plan-28-05 baseline; no test regression)
- BALANCED: `src/styles.css` open=332 close=332

---
*Phase: 28-cross-cutting-ux-state-polish*
*Completed: 2026-05-04*
