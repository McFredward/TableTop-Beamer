---
phase: 47
plan: 01
subsystem: infra
tags: [chromium, puppeteer-stream, ssr, refactor, unit-tests, windows-parity]

# Dependency graph
requires:
  - phase: 46
    provides: iter15 baseline (commit 66da2d3) — Windows isWin32 branch in launchBrowser, unique tmp user-data-dir, --app=about:blank + --window-position=-32000,-32000 hacks
provides:
  - "Pure, exported `buildChromiumLaunchArgs({ platform, opts })` function for unit-testable launch-arg composition"
  - "test/phase-47-launch-args.test.mjs — 6 fingerprint tests pinning Linux + Windows iter15 marker flags"
  - "test/phase-47-linux-non-regression.test.mjs — 3 byte-identity snapshot tests pinning LINUX_ITER15_BASELINE (default + VAAPI) and WIN32_ITER15_BASELINE against iter15 source lines 558-645"
  - "Unit-test rail that Wave 2 (47-02) leans on to safely flip win32 to headless-new without touching Linux"
affects: [phase-47-02, phase-47-03, phase-47-04, future SSR launch-args work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function extraction for testability — pull arg-array composition out of impure launcher; pass impure values (platform, ssrUrl, viewport, display, feature sets, hasVaapiEnabled) as explicit parameters"
    - "Byte-identity snapshot tests as non-regression rails — hand-pinned LINUX_ITER15_BASELINE / WIN32_ITER15_BASELINE constants in test files (not imported) so any source drift trips assert.deepStrictEqual with a clean per-flag diff"
    - "Concatenated-body extraction in regex-based source tests — phase-34-chrome-flags + ssr-chromium-flags-merge now extract BOTH launchBrowser AND buildChromiumLaunchArgs bodies and concatenate them so flag-token greps remain accurate regardless of refactor moves"

key-files:
  created:
    - "test/phase-47-launch-args.test.mjs"
    - "test/phase-47-linux-non-regression.test.mjs"
  modified:
    - "src/server/ssr-render-host.mjs (extract args block to buildChromiumLaunchArgs; launchBrowser delegates via args: buildChromiumLaunchArgs({...}))"
    - "test/phase-34-chrome-flags.test.mjs (extract surface widened to include buildChromiumLaunchArgs body — Rule 3 fix)"
    - "test/ssr-chromium-flags-merge.test.mjs (extract surface widened — Rule 3 fix)"

key-decisions:
  - "WIN32_ITER15_BASELINE includes --display=:99 — iter15 source line 644 emits the arg unconditionally (no isWin32 gate); Wave 1 must be byte-identical to iter15, Wave 2 (47-02) introduces the gate"
  - "buildChromiumLaunchArgs accepts `platform` as a string parameter (not derived from process.platform inside the function) — keeps the function pure and trivially testable on either platform from any host"
  - "Linux + Windows baselines are hand-pinned inline (not imported) in test/phase-47-linux-non-regression.test.mjs — any source drift produces a clean per-element deepStrictEqual diff"
  - "Pre-existing regex-extract tests (phase-34, ssr-chromium-flags-merge) widened to extract both launchBrowser AND buildChromiumLaunchArgs bodies — preserves test intent without touching assertions"

patterns-established:
  - "Pure-function seam pattern: when a launcher mixes IO/env with arg composition, pull the latter out as `build*Args(opts)` and pass `process.platform` (and other impure values) in by name. Unblocks unit testing without process.env / fs / module-scope cleanup."
  - "Iter-baseline snapshot pattern: when refactoring across an iter boundary that may diverge later, pin the PRE-refactor arg list byte-for-byte in a dedicated *-non-regression.test.mjs. Future-divergence commits update source + baseline in the same commit."

requirements-completed: [D-02, D-07, D-08, D-09]

# Metrics
duration: 8min
completed: 2026-05-17
---

# Phase 47 Plan 01: Refactor launchBrowser arg composition for unit-testability Summary

**Extracted `buildChromiumLaunchArgs({ platform, opts })` as a pure exported function from `launchBrowser()` and pinned iter15 Linux + Windows arg lists byte-for-byte in unit tests — zero behavior change, +9 tests, Linux byte-identity rail now installed for Wave 2.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-17T07:46:57Z
- **Completed:** 2026-05-17T07:54:37Z
- **Tasks:** 2
- **Files modified:** 3 (1 source + 2 pre-existing tests widened) + 2 created

## Accomplishments

- `buildChromiumLaunchArgs({ platform, ssrUrl, viewport, display, disabledFeatures, enabledFeatures, hasVaapiEnabled })` is now exported from `src/server/ssr-render-host.mjs` — a pure function with zero IO/env/fs side effects.
- `launchBrowser()` delegates `args:` composition to the new function via spread; every other line of `launchBrowser` is unchanged (headless: false, winUserDataDir logic, env: { DISPLAY }, etc. all preserved).
- Linux iter15 arg list is now pinned byte-for-byte in `test/phase-47-linux-non-regression.test.mjs` against `LINUX_ITER15_BASELINE` (33 flags) and `LINUX_ITER15_BASELINE_VAAPI` (35 flags, including --ignore-gpu-blocklist + --enable-gpu-rasterization in iter15 position).
- Windows iter15 arg list is pinned in the same file against `WIN32_ITER15_BASELINE` (31 flags) — INCLUDING `--display=:99` at the tail (iter15 source line 644 has no isWin32 gate; Wave 2 will add it).
- 6 fingerprint tests in `test/phase-47-launch-args.test.mjs` cover platform-branch marker flags (--ozone-platform=x11 Linux-only, --window-position=-32000,-32000 Windows-only, --app=about:blank Windows-only, etc.) and VAAPI-gating semantics.
- Total: +9 tests, +9 pass; npm test went from 406/386/1/19 → 415/395/1/19 (only fail is pre-existing 04-T3 telemetry baseline; no regressions).

## Task Commits

Each task was committed atomically (TDD: RED → GREEN):

1. **Task 1: Write the pinned-snapshot unit test for Linux + Windows iter15 baseline** — `1c69bc6` (test)
2. **Task 2: Refactor launchBrowser to delegate args construction to buildChromiumLaunchArgs** — `547308c` (refactor)

## Files Created/Modified

### Created

- `test/phase-47-launch-args.test.mjs` — 6 fingerprint tests; imports `buildChromiumLaunchArgs` from `../src/server/ssr-render-host.mjs`; covers Linux/Windows platform-branch markers and VAAPI gating.
- `test/phase-47-linux-non-regression.test.mjs` — 3 byte-identity snapshot tests with hand-pinned constants `LINUX_ITER15_BASELINE`, `LINUX_ITER15_BASELINE_VAAPI`, `WIN32_ITER15_BASELINE`.

### Modified

- `src/server/ssr-render-host.mjs` — added `export function buildChromiumLaunchArgs(...)` near top (after `getXvfbArgs`); replaced inline 90-line `args: [ ... ]` block in `launchBrowser` with `args: buildChromiumLaunchArgs({ platform: process.platform, ssrUrl, viewport, display, disabledFeatures, enabledFeatures, hasVaapiEnabled })`. All inline comments (h4, h15, h19, iter15 archaeology, Phase 34 h2 revert rationale) migrated into the new function verbatim. Net: +255 / -108 lines (most of the delta is JSDoc + comment migration, not code).
- `test/phase-34-chrome-flags.test.mjs` — `extractLaunchBrowserBody()` now also extracts `buildChromiumLaunchArgs` body and concatenates; otherwise tests that grep for tokens like `--ignore-gpu-blocklist` / `--use-gl=angle` in `launchBody` would find 0 matches after the refactor (Rule 3 fix).
- `test/ssr-chromium-flags-merge.test.mjs` — same fix as above; the `--disable-features=` / `--enable-features=` count assertions now run against the concatenated body.

## Decisions Made

- **Function signature: `{ platform, ssrUrl, viewport, display, disabledFeatures, enabledFeatures, hasVaapiEnabled }`** — exact match to the locals `launchBrowser` already had. `platform` is a string parameter (caller passes `process.platform`) so the function is testable from either OS without env hacks.
- **`--display=${display}` is emitted unconditionally in Wave 1.** Iter15 source line 644 has no `isWin32` gate (verified by direct read), so byte-identity to iter15 requires emitting it on Windows too. This is documented in three places: (1) plan must_haves bullet 3, (2) inline source comment near the emit, (3) WIN32_ITER15_BASELINE comment. Wave 2 owns the gate.
- **Baselines are hand-pinned inline in the test file, not imported from the source.** This is intentional: if the source drifts, `assert.deepStrictEqual` produces a clean per-element diff showing exactly which flag is out of place. If the baseline were imported, drift would be invisible.
- **Pre-existing flag-grep tests (phase-34, ssr-chromium-flags-merge) widened, not assertions changed.** The test intent (flag merge correctness, VAAPI gating) is preserved; only the source-extraction surface needed updating to follow the refactor. Backward-compatible: if `buildChromiumLaunchArgs` is absent (pre-Phase-47 master) the extractor returns "" and tests fall back to launchBrowser-only behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Pre-existing regex-extract tests broke after args-block migration**

- **Found during:** Task 2 (refactor) — after extracting the args block into `buildChromiumLaunchArgs`, running `npm test` showed 4 regressions:
  - `regression h15: at most ONE literal --disable-features= in launch args` (found 0, expected 1)
  - `ssr-render-host gates --ignore-gpu-blocklist on hasVaapiEnabled (h2 revert)` (regex no longer matched)
  - `ssr-render-host gates --enable-gpu-rasterization on hasVaapiEnabled (h2 revert)` (regex no longer matched)
  - `ssr-render-host --use-gl=angle still present (regression — h9 fix)` (regex no longer matched)
- **Issue:** Both `test/phase-34-chrome-flags.test.mjs` and `test/ssr-chromium-flags-merge.test.mjs` extract `launchBrowser`'s body as a string and grep for flag tokens. After the refactor, those tokens live in `buildChromiumLaunchArgs` instead — the greps found 0 matches.
- **Fix:** Widened the extract surface in both test files. Added `extractBuildChromiumLaunchArgsBody()` and concatenated its return with `extractLaunchBrowserBody()` into the `launchBody` const. Test assertions unchanged.
- **Files modified:** `test/phase-34-chrome-flags.test.mjs`, `test/ssr-chromium-flags-merge.test.mjs`
- **Verification:** `node --test` on both files green; full `npm test` returned to baseline +9 (415/395/1/19, only fail is pre-existing 04-T3).
- **Committed in:** `547308c` (part of Task 2 commit — the test fix is the same logical change as the source refactor)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking)
**Impact on plan:** Necessary correctness fix for tests directly affected by the refactor's file-layout change. No behavior change; no scope creep. The 4 regressed tests now assert against the SAME tokens, just sourced from the union of two function bodies.

## Issues Encountered

None — clean RED → GREEN TDD cycle once the test extract surface was widened.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 2 (Plan 47-02) is now safe to start.** The Linux byte-identity rail (`test/phase-47-linux-non-regression.test.mjs` Test G + H) will trip the moment any Wave-2 commit accidentally changes a Linux flag. Wave 2 can flip `headless: "new"`, drop `--app=about:blank`, drop `--window-position=-32000,-32000`, drop `--display=:99`, and drop `DISPLAY` env on Windows — all guarded.
- **WIN32_ITER15_BASELINE will change in Wave 2** alongside the source. Wave 2 should update `WIN32_ITER15_BASELINE` in the same commit that introduces the win32-side divergence — and Wave 2's PLAN should explicitly note `--display=:99` is removed from both source and baseline together.
- **No blockers.** All success criteria met; pure-refactor Wave 1 closed.

---

## Self-Check: PASSED

- **`test/phase-47-launch-args.test.mjs`** — exists (verified via Edit hooks + `node --test` pass).
- **`test/phase-47-linux-non-regression.test.mjs`** — exists.
- **`src/server/ssr-render-host.mjs`** — modified; `export function buildChromiumLaunchArgs` present (verified via grep); `args: buildChromiumLaunchArgs(` delegation present in `launchBrowser`.
- **Commit `1c69bc6`** — `test(47-01): RED — pin Linux+Windows iter15 arg lists` — present in `git log`.
- **Commit `547308c`** — `refactor(47-01): GREEN — extract buildChromiumLaunchArgs, pin iter15 baseline` — present in `git log`.
- **`node --test test/phase-47-*.test.mjs`** — 9/9 pass.
- **`npm test`** — 415/395/1/19 (baseline +9 tests / +9 pass; only fail = pre-existing 04-T3).
- **`bash start.sh --dry-run`** — exit 0.
- **Purity contract on `buildChromiumLaunchArgs`** — body has 0 functional refs to `process.env`, `existsSync(`, `status.encoderConfig`, or `winUserDataDir` (the only `winUserDataDir` match is in a documentary comment that points readers back to `launchBrowser`).
- **`--display=${display}`** — bare unconditional emit, not inside an `isWin32 ?` ternary (Wave 1 iter15-byte-identity preserved).

---

*Phase: 47-windows-parity*
*Plan: 01 — Refactor + baseline rail (Wave 1)*
*Completed: 2026-05-17*
