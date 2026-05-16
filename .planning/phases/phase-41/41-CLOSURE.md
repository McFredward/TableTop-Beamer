---
phase: 41
slug: post-phase-40-hotfixes
status: CLOSED
closed: 2026-05-16
predecessor: phase-40-closed (commit b0c6f97)
tag: phase-41-closed
---

# Phase 41 — Post-Phase-40 Operator-UAT Hotfixes

## TL;DR

Three operator-reported issues surfaced during the first UAT after Phase 40's
big cleanup. All three are now fixed and verified.

| # | Issue | Commit | Fix |
|---|---|---|---|
| 1 | Diagnostic overlay on /output/ ignored the dashboard toggle | `662f1e5` (live-sync envelope wiring) + `380841d` (CSS visibility fix) | Wire output-live-sync to handle `global-config-update` envelope + remove unconditional `display: block` from the `[data-overlay-extended="true"]` rule that defeated the body-level gate |
| 2 | Server pre-loaded animations for every board on disk (47) instead of the active board | `380841d` | Read `runtime-active-animations.json#boardId` (or first board on cold-start) and only build defaults for that one board |
| 3 | SSR-tab boot noise (`navigation-visibility-violation` x2, `navigation-regression-violation` x2, `/resources/sounds/monsters/048.wav net::ERR_ABORTED` x4, `[align-mode-log]` debug) | `380841d` | Gate `validateViewNavigationVisibility` on `data-ssr-tab`/`data-output-role="final-output"`; skip `<audio>` `src=` assignment on the SSR tab; remove the Phase-31 align-mode diagnostic log |

## Bug 1 — diagnostic overlay propagation

### Root cause

Two-part defect:

1. **Missing envelope handler.** `output-live-sync.js` parsed `live-hello`
   and `live-session-update` envelopes but ignored the
   `global-config-update` envelope the server broadcasts on
   `POST /api/global-defaults`. So even though the persisted
   `diagnosticOverlay: false` was written to disk on dashboard toggle,
   `/output/` never refreshed its `body[data-diagnostic-overlay]` attr.
2. **CSS visibility override.** Even after fixing (1), the chip stayed
   visible because the rule
   `.output-status-chip[data-overlay-extended="true"] { display: block; }`
   fires unconditionally as soon as
   `receiver-status-ui.updateMetrics` sets the extended attribute
   (~250 ms after boot). The body-gated rule
   `body[data-diagnostic-overlay="true"] .output-status-chip[data-overlay-extended="true"] { display: block; }`
   is the same `display: block` value, so it adds nothing.

### Fix

1. `output-live-sync.js` (commit `662f1e5`): added
   `_refreshDiagnosticOverlayFromGlobalDefaults()` helper that fetches
   `/api/global-defaults` and writes `body.dataset.diagnosticOverlay`.
   Called on `live-hello` (initial sync) and on every
   `global-config-update` envelope (excluding asset-manifest broadcasts).
2. `styles.css` (commit `380841d`): stripped `display: block` from the
   base `.output-status-chip[data-overlay-extended="true"]` rule. The
   body-gated rule remains and now actually controls visibility.

### Verification

- `curl POST /api/global-defaults {"diagnosticOverlay":false}` → next
  `/api/global-defaults` GET returns `false`. WS broadcast carries the
  `global-config-update` envelope to `/output/`. Helper fetches +
  writes body data-attr. CSS hides the chip.
- `curl /src/styles.css | grep -A1 data-overlay-extended` confirms the
  unconditional `display: block` is gone.

## Bug 2 — board-scoped default-animation pre-load

### Root cause

`server.mjs:4784-4823` iterated every `*.json` in `config/boards/` and
concatenated their `defaultAnimations` into
`liveSessionState.snapshot.runtime.runningAnimations`. With ~4 boards
each carrying 10-15 defaults, this produced 40-50 entries that were
broadcast to every WS client (including the SSR Chromium tab and the
operator's dashboard) only to be overwritten by the `ssr-restore` path
moments later — wasted asset cache slots, wasted broadcast bandwidth,
and the SSR tab pre-warming GIFs for boards it never renders.

### Fix

`server.mjs`: read `runtime-active-animations.json#boardId` to pick the
active board. If the file is missing (cold install) fall back to the
first board file alphabetically. Only build defaults for that single
board. Also set `liveSessionState.snapshot.selectedBoard = activeBoardId`
so the initial snapshot lines up with the runningAnimations.

### Verification

Server log:
```
[default-animations] Pre-loaded 13 default animation(s) for board nemesis-board-a
```
(was: `Pre-loaded 47 default animation(s) into live session`)

`curl /api/live/snapshot` confirms `selectedBoard: nemesis-board-a`,
`runningAnimations.length: 13`.

## Bug 3 — SSR-tab boot log noise

### Three sub-fixes

**a. `navigation-visibility-violation` / `navigation-regression-violation`**

`runtime-mobile-layout.js:validateViewNavigationVisibility` asserts the
dashboard/settings nav buttons are reachable. On `/ssr` the SSR
Chromium tab loads the full app but the nav is intentionally hidden
(it renders the projection only). The validator fired four errors on
every SSR-tab boot. Fix: gate the validator on
`document.body.dataset.outputRole === "final-output"` or
`dataset.ssrTab === "true"` and return `true` (passing) for those roles.

**b. `/resources/sounds/monsters/048.wav net::ERR_ABORTED` x4**

`runtime-audio.js` builds a pool of 5 `<audio>` voices per asset path,
each with `preload="auto"`. When 5 concurrent fetches for the same
file fire from the SSR Chromium tab, Chromium dedupes and aborts 4 of
them. Fix: on the SSR tab (`data-ssr-tab="true"`) skip the `src=`
assignment — audio is Pi-local per D-D2 reversal, the SSR tab never
plays sound, so the fetch is pure waste.

**c. `[align-mode-log] onAlignModeChange enabled=false outputRole=control ssrTab=false`**

`runtime-projection-handle-ui.js:onAlignModeChange` opened with a
diagnostic log (`_piDiag("align-mode", ...)`) from Phase 31 h45 that
was used to verify the handler fires. The handler has been stable for
several phases now; the log is just noise. Removed.

### Verification

Server log on next SSR-tab boot is clean — no `navigation-*-violation`,
no `[ssr-tab:reqfailed] monsters/048.wav`, no `[align-mode-log]`.

## Tests

- Full `node --test` sweep: 408 tests, 388 pass, 1 fail (pre-existing
  `04-T3 receiver-bootstrap setReconnectDetail` baseline, unrelated),
  19 skipped. No new regressions from Phase 41.
- Smoke test of all touched files: `node --check` clean.
- Server boot + curl `/api/live/snapshot` + flip `/api/global-defaults`
  diagnosticOverlay — round-trip confirmed.

## What was NOT changed

- Phase 40 cleanups (alignModeBoost removal, GL-backend selector
  retirement, log restructuring) — preserved.
- Phase 39 D-01/D-02/D-03 fixes — preserved.
- WS-fragmentation reassembly + connection stability — preserved.
- Audio pool sizing on dashboard / `/output/` — unchanged. Only the
  SSR-tab path skips the fetch.

## Tag

`phase-41-closed` at commit `380841d`.
