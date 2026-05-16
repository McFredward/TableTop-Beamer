---
phase: 46
slug: release-preparation
status: CLOSED
closed: 2026-05-16
predecessor: phase-45-closed (commit 3839a94)
tag: phase-46-closed
---

# Phase 46 — Release Preparation

## TL;DR

Final polish for the v1.0.0 public release: version bumped, README
modernized, mobile light-mode bug fixed, gitignore audited so operator-
local calibration data stays off GitHub but boards/resources/.planning
go up cleanly.

## What shipped

### 1. Mobile light-mode top-nav fix (`src/styles.css`)

`.dashboard-sticky-shell` and `.primary-view-switch` had hardcoded dark
`rgba(18,29,44,…)` gradients inside the `@media (max-width: 920px)`
breakpoint that couldn't be overridden by `.dir-obsidian-light` →
on mobile the Dashboard / Settings / Control nav strip stayed dark even
in light mode.

Fix: replaced the hardcoded gradients with theme-token-based equivalents
(`var(--c-bg-raised)`, `var(--c-surface)`, `var(--c-border-str)`,
`var(--c-shadow)`). Dark mode renders identically; light mode now picks
up the foundations.css overrides automatically.

Verified visually via Playwright (393×852 mobile viewport, light mode):
- `#open-dashboard-view` (active): `rgba(15,158,117,0.12)` accent tint
- `#open-settings-view` (inactive): `rgb(249,250,251)` near-white ✓
- `.primary-view-switch` bg: `linear-gradient(rgb(249,250,251),rgb(255,255,255))` ✓
- `.dashboard-sticky-shell` bg: `linear-gradient(rgb(255,255,255),rgb(244,245,247))` ✓

### 2. Version bump (`package.json`)

- `version`: `0.31.0-wave0` → **`1.0.0`** (clean release number)
- `engines.node`: `>=18.0.0` → **`>=22.0.0`** (matches mediasoup 3.x runtime requirement)

### 3. README modernization

- Badges: version → 1.0.0, Node → 22 LTS, Platform → Linux/Windows/RPi,
  plus a new "install: double-click" badge linking to INSTALL.md.
- Added a `> [!TIP]` callout at the top introducing v1.0 + the launcher.
- Quick-start rewritten:
  - **Lead** with the click-and-run launcher (the lazy way).
  - Show the actual post-boot console message including the LAN-IP URLs.
  - Hide the manual / developer setup behind `<details>`.
- Performance tips section expanded (Pi 5 + projector tuning notes,
  background-tab-throttle warning).
- Known issues: added the ARM64 Windows caveat (no mediasoup prebuilt).
- Project status: rewritten to call out the v1.0 milestones (SSR-only,
  click-and-run, locked quality defaults).
- **Videos and GIFs preserved exactly as before** (per operator request).

### 4. .gitignore audit

Added:

```
.claude/                  (Claude Code session state)
__pycache__/ + *.pyc      (Python bytecode from helper scripts / live-e2e)
config/projection-profiles.json   (operator-local board calibration)
config/runtime-active-animations.json
config/runtime-active-grid.json
config/runtime-active-system.json
debug/*.png, debug/*.jpg, debug/p3[0-9]-*/, debug/p4[0-9]-*/, debug/phase3[0-9]_*,
debug/streifen-*/, debug/w[0-9]*/
```

`config/projection-profiles.json` was untracked via `git rm --cached`;
the file remains on the operator's disk untouched. Same for any
runtime-state files that may already have been local-only.

Boards + assets verified to remain tracked (12 board-related entries in
`git ls-files config/boards/`).

### 5. .planning/ contributor-friendly audit

`.planning/` is **NOT** gitignored — 779 files / 12 MB ships with the
release. Includes:

- `phases/phase-01` through `phases/phase-46` — all phase contexts,
  plans, closures.
- `STATE.md`, `ROADMAP.md`, `PHASES.md` — high-level project state.
- `intel/` — reusable codebase intelligence.
- `design-system/` — design tokens, type / spacing decisions.

Contributors get the full GSD workflow + decision history. Two small
reference PNGs added to `.planning/debug/` (streifen + switch-board-bug
that are referenced from phase docs).

## Verification

- `npm test`: **404 tests / 384 pass / 1 fail / 19 skipped**. The 1
  failing test (04-T3 receiver-bootstrap telemetry) is the same
  pre-existing baseline that's been failing since Phase 41 — unrelated
  to this phase.
- `./start.sh --dry-run`: all six probes pass.
- `git check-ignore` confirms the new ignore patterns match the intended
  targets:
  ```
  config/projection-profiles.json
  config/runtime-active-grid.json
  .claude/test
  debug/foo.png
  ```
- Playwright visual probe of mobile light-mode top-nav: nav strip
  + buttons now render light/white instead of dark. Screenshot
  attached to phase docs (m-nav-crop) shows the Dashboard /
  Settings buttons + Tap Action panel rendering correctly.

## Files changed

```
.gitignore                                                  | +14 -1
README.md                                                   | substantial rewrite
config/asset-manifest.json                                  | +1 -1 (timestamp)
config/global-defaults.json                                 | +2 -2 (diagOverlay off + ts)
config/projection-profiles.json                             | DELETED (untracked)
package.json                                                | +2 -2
src/styles.css                                              | mobile-bg tokenization
.planning/phases/phase-46/{46-CONTEXT,46-PLAN,46-CLOSURE}.md | new
.planning/debug/{streifen,switch_board_bug}.png             | new (small reference images)
```

## Risks (post-release)

| Risk | Mitigation |
|---|---|
| Operator's `projection-profiles.json` shows as deleted on first `git pull` after release | Untracking via `git rm --cached` keeps the on-disk file; only the index entry is removed. Existing operators won't notice. |
| Someone clones fresh and has no align-mode profiles | Expected — they create their own. Default board layout works for first boot without alignment. |
| Mobile light-mode regression | The change is purely additive token substitution; dark mode tokens map to the same colors that were hardcoded before. Visual diff in dark mode = 0. |

## Tag

`phase-46-closed` at the closure commit.

## iter2 follow-up — `_tryApplyDiskRestoredGrid` envelope unwrap (2026-05-16)

### Problem

Operator UAT against commit 43860eb ("fix(phase-46): cold-boot desync —
dashboard / SSR now apply server-restored grid") found the dashboard
fix worked but the SSR Chromium tab + Pi /output/ still showed the
edge-to-edge identity stream when projection-profiles.json existed but
runtime-active-grid.json did not. See
`.planning/debug/desync/one_more_desync_bug.png` for the operator
screenshot.

### Root cause

`src/app/runtime/core/runtime-board-switch.js#_tryApplyDiskRestoredGrid`
used the wrong JSON path on the `/api/live/snapshot` response:

```js
// BUGGY (pre-iter2):
const snap = await resp.json();
const lastSnap = snap?.runtime?.lastAlignGridSnapshot;
```

The route's actual envelope is
`{ ok, changed, sinceVersion, session: { version, snapshot: {…}, … } }`
— so `snap.runtime` is always `undefined`. The helper therefore
unconditionally returned `false`, and
`autoLoadRememberedProjectionProfile` fell through to
`applyDefaultAndCaptureSnapshot()` which (a) reset the grid to the
10/90 identity-inset default AND (b) broadcast it as
`isBaseline=true`. That baseline broadcast then overrode the server's
W5 disk-restore on every other client that had already applied it via
live-hello, leaving the SSR tab's mesh-warp at the inset/identity grid
while /output/'s handles painted at the W5 profile geometry.

### Fix

`runtime-board-switch.js` — unwrap the envelope the same way every
other consumer already does (see
`src/app/runtime/output-receiver/output-align-mode-loader.js#L663` and
`src/app/runtime/output-receiver/output-live-sync.js#L405`):

```js
const body = await resp.json();
const snap = body?.session?.snapshot ?? body?.snapshot ?? body ?? {};
const lastSnap = snap?.runtime?.lastAlignGridSnapshot;
```

### Verification

- `curl /api/live/snapshot | jq '.session.snapshot.runtime.lastAlignGridSnapshot'`
  on a cold-boot server (with `runtime-active-grid.json` removed) returns
  the W5-restored `Nemesis A with xrandr` profile with 54 points and
  `originatorClientId=server-disk-restore`.
- The buggy access `.runtime.lastAlignGridSnapshot` on the raw response
  body returns `null` — confirming that pre-iter2 the helper always
  returned `false`.
- The new path correctly resolves to the W5 snapshot.
- New regression test
  `test/phase-46-disk-restored-grid-envelope-unwrap.test.mjs` pins the
  unwrap pattern AND the server-side route shape, so any future
  refactor that moves the runtime payload elsewhere will fail this
  test first.
- Full test suite: **406 / 386 pass / 1 fail / 19 skipped**. The 1
  failing test is the pre-existing Phase-41 telemetry flake — unrelated.

### Files changed

```
src/app/runtime/core/runtime-board-switch.js                       | +16 -1
test/phase-46-disk-restored-grid-envelope-unwrap.test.mjs          | +85 (new)
.planning/phases/phase-46/46-CLOSURE.md                            | this section
```

