---
phase: 47
plan: 02
subsystem: infra
tags: [chromium, puppeteer-stream, ssr, windows-parity, headless-new, env-knob, unit-tests]

# Dependency graph
requires:
  - phase: 47
    plan: 01
    provides: "Pure exported `buildChromiumLaunchArgs({ platform, opts })`; LINUX_ITER15_BASELINE + WIN32_ITER15_BASELINE snapshot rails."
provides:
  - "Windows SSR launch default flip: `headless: \"new\"` (Chromium unified-headless 112+)"
  - "Operator env knob `SSR_WIN_HEADLESS=0` reverts Win32 to iter15 headful behavior (modulo --display= no-op cleanup)"
  - "Drop iter15 off-screen-window hack flags (`--app=about:blank`, `--window-position=-32000,-32000`) on the Win32 default path"
  - "Unconditional Win32 gate on `--display=${display}` (cosmetic cleanup — Windows Chrome has no X server)"
  - "test/phase-47-windows-headless-new.test.mjs — 6 new tests (J-O) pinning headless-new behavior + escape-hatch baseline"
  - "Updated WIN32_ITER15_BASELINE in both test files (drops --display=:99) — committed in same atomic change as the source gate, no retro-patch contradiction"
affects: [phase-47-03, phase-47-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Env-knob escape hatch: new platform-specific behavior defaults ON via `SSR_*` env var sentinel (`!== \"0\"`) so operator can revert in seconds without code changes — orthogonal to the Wave-1 byte-identity rails"
    - "Orthogonal cosmetic cleanup committed with the behavior flip: `--display=` Win32 gate is independent of useHeadlessNew but ships in the same commit + same baseline edit, eliminating retro-patch contradictions across waves"
    - "Per-task RED→GREEN TDD across both new + updated tests + baselines: RED commit asserts post-Wave-2 contract against still-Wave-1 source (failures map 1:1 to plan predictions); GREEN commit flips source"

key-files:
  created:
    - "test/phase-47-windows-headless-new.test.mjs"
  modified:
    - "src/server/ssr-render-host.mjs (buildChromiumLaunchArgs gains useHeadlessNew param; --display= gated to !isWin32 unconditionally; launchBrowser computes useHeadlessNew from env + sets headless: headlessMode + drops DISPLAY env on Win32 + adds INFO log; iter15 comment block replaced with Wave-2 block)"
    - "test/phase-47-launch-args.test.mjs (Test C inverted — now asserts post-Wave-2 win32 default-path behavior)"
    - "test/phase-47-linux-non-regression.test.mjs (WIN32_ITER15_BASELINE drops `--display=:99` with Wave-2 comment; Test I re-labeled; LINUX_ITER15_BASELINE BYTE-IDENTICAL to Wave 1)"

key-decisions:
  - "`--display=` Win32 gate is unconditional, NOT inside the dropOnHeadlessNew ternary — it is a cosmetic cleanup orthogonal to the headless flip (Windows Chrome has no X server; iter15 emitted `--display=` on Win32 as a no-op). Same source line for both Win32 paths."
  - "Env knob `SSR_WIN_HEADLESS=0` is the documented operator escape hatch (default ON because headless-new is the desired UX per D-01/D-03 and operator UAT will validate it in Wave 4). Forced inert on non-Win32 by the `isWin32 &&` guard."
  - "Both WIN32_ITER15_BASELINE constants (in test/phase-47-linux-non-regression.test.mjs Test I + test/phase-47-windows-headless-new.test.mjs Test O) updated in the SAME commit as the source --display= gate, with matching Wave-2 comments. Eliminates the retro-patch contradiction the plan called out explicitly."
  - "puppeteer-stream's `ignoreDefaultArgs.push('--mute-audio')` is overridden by our explicit `--mute-audio` in args[]. Verified via Test N (the flag is present on the headless-new path)."

patterns-established:
  - "Pure-function gate orthogonality: when a refactor adds two semantically distinct gates to the same function (here: useHeadlessNew = behavioral; isWin32 on --display= = cosmetic cleanup), the gates remain syntactically separate ternaries so a future deviation can flip one without touching the other."
  - "Two-step Wave-N rail update: when a Wave-1 baseline needs editing in Wave 2, the edit ships in the SAME commit as the source change that drives the edit, AND the same baseline edit appears in every test file that pins that baseline, with identical commit-anchored comments documenting the rationale. No invisible drift."

requirements-completed: [D-01, D-03, D-04, D-05]

# Metrics
duration: 6min
completed: 2026-05-17
---

# Phase 47 Plan 02: Windows headless-new flip + SSR_WIN_HEADLESS env knob + unconditional Win32 --display= gate Summary

**Windows SSR Chromium now launches in `headless: "new"` mode by default (Chromium unified-headless), with operator env knob `SSR_WIN_HEADLESS=0` reverting to iter15 headful behavior (modulo a one-line --display= no-op cleanup); Linux iter15 path BYTE-IDENTICAL.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-17T08:00:12Z
- **Completed:** 2026-05-17T08:06:03Z (approx)
- **Tasks:** 2 (RED + GREEN TDD pair, atomic commits)
- **Files modified:** 3 (1 source + 2 pre-existing tests) + 1 created

## Accomplishments

- `buildChromiumLaunchArgs` accepts new boolean `useHeadlessNew` parameter (only meaningful on Win32). When `useHeadlessNew === true` it drops the iter15 off-screen-window hack flags `--app=about:blank` + `--window-position=-32000,-32000` (no window UI to hide under headless-new). `--start-fullscreen` was already iter15-Linux-only — unchanged.
- `--display=${display}` is now Win32-gated UNCONDITIONALLY (`...(isWin32 ? [] : [\`--display=\${display}\`])` — orthogonal to useHeadlessNew). Both default-headless-new AND escape-hatch (`SSR_WIN_HEADLESS=0`) Win32 paths share this gate. Windows Chrome has no X server, so the arg was always inert on iter15 too — pure cosmetic cleanup.
- `launchBrowser()` computes `useHeadlessNew = process.platform === "win32" && process.env.SSR_WIN_HEADLESS !== "0"` and passes it through. Hard-coded `headless: false` replaced with `headless: headlessMode` where `headlessMode = useHeadlessNew ? "new" : false`. DISPLAY env var dropped on Win32. One new INFO log line on Win32 launch: `[ssr-host] win32 launch: headless=<mode>, userDataDir=<path>`.
- iter15 comment block replaced with a Wave-2 explanatory block (Q1 + Q3 + escape-hatch rationale; iter15 unique-tmp-user-data-dir trick retained on both paths because chrome.exe's single-instance-attach is a user-data-dir property, independent of headless mode per 47-RESEARCH § Q2).
- `test/phase-47-windows-headless-new.test.mjs` created with 6 tests (J-O): J/K/L assert flag-dropping on headless-new path; M asserts `--display=` Win32 gate; N asserts retained flags (tab-capture title selector + --mute-audio, D-D2 carry-over); O asserts the post-Wave-2 escape-hatch baseline (iter15 modulo --display= cleanup) byte-identically.
- `test/phase-47-launch-args.test.mjs` Test C INVERTED — now asserts the post-Wave-2 Win32 default-path behavior (useHeadlessNew=true drops --app=, --window-position=, --display=).
- `test/phase-47-linux-non-regression.test.mjs` WIN32_ITER15_BASELINE drops the trailing `"--display=:99"` entry with a Wave-2 comment above the constant + matching inline comment in Test I. LINUX_ITER15_BASELINE BYTE-IDENTICAL to Wave 1 (verified via `git diff fee23d3~1 test/phase-47-linux-non-regression.test.mjs | grep '^[+-]\s*\"--'` — the ONLY array-line change is the single removed `--display=:99` entry).
- npm test went 415/395/1/19 → 421/401/1/19 (+6 tests / +6 pass; same 1 pre-existing fail on 04-T3; same 19 skipped). `bash start.sh --dry-run` exits 0 with and without `SSR_WIN_HEADLESS=0` (env knob forced inert on non-Win32).

## Task Commits

Each task was committed atomically (TDD: RED → GREEN, baseline edits committed alongside the source change that drives them):

1. **Task 1: RED — assert headless-new behavior + drop --display=:99 from Win32 baselines** — `fee23d3` (test)
2. **Task 2: GREEN — flip Windows to headless:new + SSR_WIN_HEADLESS=0 escape hatch + drop --display= on Win32** — `7c0fa03` (feat)

## Files Created/Modified

### Created

- `test/phase-47-windows-headless-new.test.mjs` — 6 tests (J-O) covering Wave-2 win32 default-path drops + retained flags + escape-hatch baseline.

### Modified

- `src/server/ssr-render-host.mjs`:
  - `buildChromiumLaunchArgs` — added `useHeadlessNew` param + `dropOnHeadlessNew` derived constant; gated `--app=` and `--window-position=` on `!dropOnHeadlessNew`; gated `--display=${display}` on `!isWin32` UNCONDITIONALLY; updated JSDoc to reflect Wave-2 contract + parameter.
  - `launchBrowser()` — replaced iter15 comment block with Wave-2 block (~15 lines); computed `useHeadlessNew` + `headlessMode` from env knob + isWin32; replaced `headless: false` with `headless: headlessMode`; pass `useHeadlessNew` to `buildChromiumLaunchArgs`; replaced `env: { ...process.env, DISPLAY: display }` with conditional `env: isWin32 ? { ...process.env } : { ...process.env, DISPLAY: display }`; added single INFO log on Win32.
- `test/phase-47-launch-args.test.mjs` — Test C inverted (now asserts post-Wave-2 win32 default-path: useHeadlessNew=true, drops --app=, --window-position=, --display=). Top-of-file header comment updated to reflect Wave-2 update. Tests A, B, D, E, F unchanged.
- `test/phase-47-linux-non-regression.test.mjs` — WIN32_ITER15_BASELINE drops the trailing `"--display=:99"` entry; Wave-2 comment added above the constant; Test I re-labeled with inline Wave-2 comment. LINUX_ITER15_BASELINE, LINUX_ITER15_BASELINE_VAAPI, Test G, Test H all BYTE-IDENTICAL to Wave 1.

## Decisions Made

- **`--display=` Win32 gate is unconditional, NOT inside the dropOnHeadlessNew ternary.** Both Win32 paths emit the same arg-list shape minus `--display=`. This was a deliberate orthogonality call per the plan's `<critical_invariants>` section — keeps the escape-hatch baseline aligned with the default-path baseline minus the headful-only flags, and lets the cosmetic cleanup ship in the same atomic commit without entangling it with the headless-flip semantics.
- **Env knob default ON.** `useHeadlessNew = isWin32 && process.env.SSR_WIN_HEADLESS !== "0"` — the new default is headless-new (the desired UX per D-01/D-03). Operator escape hatch is the explicit `=0` opt-out. Forced inert on non-Win32 by the `isWin32 &&` guard so Linux is completely unaffected by the env var.
- **Both WIN32_ITER15_BASELINE constants updated in the same commit as the source gate**, with matching comments — eliminates the retro-patch contradiction the plan explicitly called out (Wave-1's WIN32 baseline retained `--display=:99` with a "Wave 2 will gate this" comment; Wave-2 honors that promise atomically).
- **Single INFO log on Win32 launch** (`[ssr-host] win32 launch: headless=<mode>, userDataDir=<path>`) is the minimum operator diagnostic to disambiguate the active path at boot. Detailed args logging is deferred to Wave 3.

## Deviations from Plan

None — plan executed exactly as written. RED tests failed exactly as the plan predicted (Tests C/I/J/K/M/O fail; G/H/L/N pass), GREEN source change made all 15 Phase-47 tests pass, full npm test +6/+6 relative to Wave 1, dry-run still exit 0 with and without `SSR_WIN_HEADLESS=0`.

## Issues Encountered

None — clean RED → GREEN TDD cycle. All Phase 47 tests green on first GREEN compile after Task 2's source edits. No analysis paralysis, no fix-attempt loops. The plan's `<interfaces>` block was precise enough to translate directly to the edit (ternary forms, parameter shapes, isWin32 vs dropOnHeadlessNew gating decisions were all pre-specified).

## User Setup Required

None — no external service configuration required. `SSR_WIN_HEADLESS` env knob is documented inline in the source comment block and will be operator-visible in Wave 4 UAT docs (`docs/INSTALL.md` Windows section, per 47-RESEARCH § M2 C5).

## Next Phase Readiness

- **Wave 3 (Plan 47-03) ready to start.** The source-level windows parity is in place; Wave 3 owns the diagnostics + docs layer (operator-visible `[ssr-host] launch args: …` line, `docs/INSTALL.md` Windows section update).
- **Wave 4 (Plan 47-04) is operator UAT.** D-03 empirical proof (headless-new + getDisplayMedia + WebRTC producer on operator's actual Win11 box) is the only remaining acceptance gate. The escape hatch (`SSR_WIN_HEADLESS=0`) is the operator's documented fallback for the UAT if headless-new misbehaves.
- **No blockers.** The Win32 `--display=` cleanup is the ONLY documented Wave-2 edit to the Wave-1 WIN32_ITER15_BASELINE; LINUX_ITER15_BASELINE remains untouched. The Linux non-regression rail (Test G + H) is still green. The Win32 escape-hatch path (Test O) is byte-identical to the post-Wave-2 baseline. All success criteria met.

## Threat Flags

None — Wave 2 narrows the Win32 default launch attack surface (one fewer visible Chrome window; no Win32 desktop interaction). No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The single new INFO log line on Win32 does not log sensitive data (only the headless mode literal + a tmpdir path that's already in operator logs from iter15).

---

## Self-Check: PASSED

- **`test/phase-47-windows-headless-new.test.mjs`** — created and 6/6 tests green (`node --test` confirmed).
- **`src/server/ssr-render-host.mjs`** — modified; contains `SSR_WIN_HEADLESS`, `headless: headlessMode`, `dropOnHeadlessNew`, `win32 launch:` (all grep-verified). No executable `headless: false` remaining (the 2 occurrences are inside comment blocks).
- **`test/phase-47-launch-args.test.mjs`** — Test C inverted; "Wave 2" present in file (grep-verified).
- **`test/phase-47-linux-non-regression.test.mjs`** — WIN32_ITER15_BASELINE array body does NOT contain `"--display=:99"` line (awk-bound verification); LINUX_ITER15_BASELINE byte-identical to Wave 1 (`git diff fee23d3~1` shows ONLY the single `"--display=:99"` removal in the WIN32 constant + comment + label changes; zero LINUX-array changes).
- **Commit `fee23d3`** — `test(47-02): RED — assert win32 headless-new drops --app/--window-position; drop --display= from Win32 baselines` — present in `git log`.
- **Commit `7c0fa03`** — `feat(47-02): GREEN — flip Windows to headless:new, SSR_WIN_HEADLESS=0 escape hatch, drop --display= on Win32` — present in `git log`.
- **`node --test test/phase-47-*.test.mjs`** — 15/15 pass (Wave 1's 9 + Wave 2's 6).
- **`npm test`** — 421/401/1/19 (Wave 1's 415/395/1/19 + 6 new tests / +6 pass; only fail = pre-existing 04-T3).
- **`bash start.sh --dry-run`** — exit 0.
- **`SSR_WIN_HEADLESS=0 bash start.sh --dry-run`** — exit 0 (env knob forced inert on non-Win32; Linux unaffected).
- **`node --check src/server/ssr-render-host.mjs`** — exit 0.

---

*Phase: 47-windows-parity*
*Plan: 02 — Windows headless-new flip + env knob + Win32 --display= cleanup (Wave 2)*
*Completed: 2026-05-17*
