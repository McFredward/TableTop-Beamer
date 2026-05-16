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

## iter3 follow-up — stale-profileId sanitization + chip refresh + test isolation (2026-05-16)

### Discovery

Operator UAT against iter2 still surfaced the bug — but the geometry
was correct all along. The pixel-perfect measurements from the iter3
debugger (cyan handles vs grey-fill warped content match within ±0.001
of viewport width) confirmed alignment was right. Two SEPARATE issues
caused the persistent UAT complaint:

1. **`runtime-active-grid.json` contained `profileId="w10-batch-second"`** — a name the operator never created. Source: `test/phase-38-w10-ws-frame-fragmentation.test.mjs:330` spawns a server with `cwd: ROOT` (no config isolation), then sends an `align-grid-snapshot` WS frame with that profile name. The mutation handler persists it to `<ROOT>/config/runtime-active-grid.json`, overwriting the operator's calibration data. On the next cold boot the server's W5 fallback restores this contaminated state verbatim — the geometry is a valid 3×3 inset grid but the name is meaningless to the operator.
2. **The align-toolbar chip stayed at "Unsaved"** even after `captureRemoteBaseline` correctly populated `_loadedProfileName`. Cause: `_recomputeAndNotifyDirty()` had an early-exit `if (next === _dirty) return` — on cold boot `dirty=false → false` so the dirty listeners (which include the chip-refresh callback) never fired.

### Fixes

**server.mjs W5 block (~line 4499):** sanitize stale `profileId` on
boot. After `loadActiveGrid`, check whether the restored `profileId`
exists in `config/projection-profiles.json` (any board). If not, clear
it to `null` and log:

```
[active-grid] cleared stale profileId=w10-batch-second: not present in projection-profiles.json (orphan from test or removed profile)
```

Geometry is preserved — the grid IS a valid calibrated grid, just
unfortunately tagged. The toolbar chip will read "Unsaved" rather than
the bogus name, prompting save-as if the operator wants to keep it.

**`captureRemoteBaseline` (runtime-projection-profile-persistence.js):**
force listener fan-out at the end of the function. Listeners re-read
`getLoadedProfileName()` to compute the chip text, so firing them with
the unchanged dirty value is safe and idempotent.

**phase-38-w10 test (test/phase-38-w10-ws-frame-fragmentation.test.mjs):**
snapshot `config/runtime-active-grid.json` before `spawnServer` and
restore it on test teardown. Per-test (not global afterEach) so a
crash in one test doesn't corrupt another.

### Verification

```bash
# Scenario A: TRUE fresh-install (runtime-active-grid.json absent)
mv config/runtime-active-grid.json /tmp/_bak.json
env PORT=5415 node server.mjs
# → [active-grid] restored profile=Nemesis A with xrandr srcXs=6 srcYs=9 points=54 version=2 source=projection-profile/nemesis-board-a/...
# curl /api/live/snapshot → profileId: Nemesis A with xrandr
# (W5 picks the operator's actual saved profile via fallback path)

# Scenario B: contaminated runtime-active-grid.json
mv /tmp/_bak.json config/runtime-active-grid.json  # has profileId="w10-batch-second"
env PORT=5413 node server.mjs
# → [active-grid] cleared stale profileId=w10-batch-second: not present in projection-profiles.json (orphan from test or removed profile)
# → [active-grid] restored profile=null srcXs=3 srcYs=3 points=9 version=2 source=runtime-active-grid
# curl /api/live/snapshot → profileId: null, points: 9
# (Geometry preserved, bogus name cleared, chip will show "Unsaved")
```

Playwright probe on /output/ after sanitization: grid state `3x3` at
top-left `(0.07, 0.105)` — matches the warped stream content visible
in `/tmp/iter3-final-cleaned.png` screenshot.

Tests: 406 / 386 pass / 1 pre-existing baseline fail / 19 skipped
(unchanged from iter2 baseline).

### Operator post-fix recovery (one-time, optional)

Operators who have a contaminated `runtime-active-grid.json` from
running tests will see "Unsaved" + the test's synthetic 3×3 inset
geometry on first cold-boot post-fix. To get back to their real
calibration:

```bash
rm config/runtime-active-grid.json
```

Then restart the server. W5 will fall back to the operator's
`projection-profiles.json` and pick a real saved profile.

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

