---
phase: 47
plan: 03
subsystem: infra
tags: [chromium, puppeteer-stream, ssr, windows-parity, diagnostics, observability, docs, operator-uat]

# Dependency graph
requires:
  - phase: 47
    plan: 02
    provides: "Wave-2 Win32 launch divergence: headless: \"new\" default + SSR_WIN_HEADLESS=0 escape hatch + unconditional Win32 --display= gate; Wave-2 transient log line `[ssr-host] win32 launch:`."
provides:
  - "Three operator-greppable diagnostic log strings emitted on Win32 boot from src/server/ssr-render-host.mjs"
  - "Launch banner: `[ssr-host] launching headless={new|false} on Win32 (userDataDir=<tmp>[, SSR_WIN_HEADLESS=0])` — INFO, gated on isWin32, fires once per launchBrowser invocation"
  - "Win32 verdict: `[ssr-host] win32 verdict: OK browserConnected=true producerIds=[...]` OR `[ssr-host] win32 verdict: FAILED <reason>` — INFO, gated on process.platform === \"win32\", fires once per boot after publisher try/catch"
  - "Args dump: `[ssr-host] launch args (<platform>): <joined chromium args>` — INFO, env-gated by SSR_LOG_LAUNCH_ARGS=1, platform-agnostic"
  - "test/phase-47-diagnostics.test.mjs — 3 source-grep tests (P, Q, R) pinning the literal substrings of all three log lines so the Wave-4 UAT runbook can rely on them"
  - "docs/INSTALL.md — 4 new subsections under \"## Windows 10 / 11\" (Expected behavior, Operator UAT checklist, SSR_WIN_HEADLESS escape hatch, SSR_LOG_LAUNCH_ARGS bug-report dump)"
  - "docs/USAGE.md — new top-level \"## Cross-platform behavior\" section + Contents-list entry: explicit Win+Linux parity statement (no visible Chrome window on either, Ctrl+C cleanup within 5s on both)"
affects: [phase-47-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-grep contract tests for operator-facing log strings (readFileSync + String#includes / regex) — same shape as test/phase-34-render-mode-probe.test.mjs; cheap, host-spawn-free, platform-agnostic; pins exact substrings so Wave-4 UAT runbook can grep start.log against stable contracts"
    - "Env-knob diagnostic gate orthogonal to platform gate: SSR_LOG_LAUNCH_ARGS=1 works on any platform (Linux operators can dump too), but is documented only for Windows in INSTALL.md — keeps the knob surface universal while focusing the docs on the audience that needs it"
    - "Named-binding refactor before observability: `args:` inline expression refactored to `const chromiumArgs = buildChromiumLaunchArgs(...)` so the dump-line can log the SAME array that's passed to launcher() without re-evaluation — single source of truth for the args dump"

key-files:
  created:
    - "test/phase-47-diagnostics.test.mjs"
    - ".planning/phases/phase-47/47-03-SUMMARY.md"
  modified:
    - "src/server/ssr-render-host.mjs (Wave-2 transient `[ssr-host] win32 launch:` log replaced with Wave-3 launch banner; new Win32-gated verdict line emitted after publisher try/catch in start(); args composition bound to `const chromiumArgs` + SSR_LOG_LAUNCH_ARGS=1 dump wired immediately before launcher() call)"
    - "docs/INSTALL.md (+4 subsections under \"## Windows 10 / 11\": Expected behavior, Operator UAT checklist, SSR_WIN_HEADLESS escape hatch, SSR_LOG_LAUNCH_ARGS bug-report dump)"
    - "docs/USAGE.md (+1 top-level section \"## Cross-platform behavior\" + Contents-list entry)"

key-decisions:
  - "Launch banner REPLACES the Wave-2 transient `[ssr-host] win32 launch:` line entirely — not appends — so post-Wave-3 source contains zero occurrences of `win32 launch:` (the Wave-3 acceptance criterion enforces this). Single INFO line per boot, format pinned by Test P."
  - "Verdict line placed AFTER the publisher try/catch and BEFORE `onHostDownLatched = false;` — captures the result of the publisher injection in `status.lastError` (set inside the catch) so the OK branch fires only when the publisher succeeded AND browser is connected; the FAILED branch surfaces lastError verbatim."
  - "Args dump is env-gated WITHOUT a platform gate (works on Linux too). The plan's `<interfaces>` block calls this out explicitly; the operator's docs only mention it for Windows because that's the audience without CI. Linux boot-log surface stays clean when the env var is unset."
  - "Named-binding `const chromiumArgs = buildChromiumLaunchArgs(...)` is the single source of truth for both the dump and the launcher() call — no risk of the dumped line diverging from the actual passed args. Pure refactor, no behavior change to argv."
  - "INSTALL.md comment about win32 launch transient log was reworded mid-task to satisfy the acceptance criterion `grep -c \"win32 launch:\" src/server/ssr-render-host.mjs = 0` — the criterion forbids ANY occurrence of the literal substring, including comments. Reworded to `the shorter Wave-2 transient log line` without the literal string. Done before commit; no separate fixup."

patterns-established:
  - "Operator-greppable log-string contract pattern: when a downstream phase (here: Wave 4 UAT) will grep production logs for diagnostic substrings, ship source-grep unit tests in the same wave that introduces the strings. The tests pin the EXACT substring at file level, so any later refactor that accidentally reformats the log line is caught by `node --test` before deployment. Cost: 3 tests / ~60 lines / sub-millisecond execution. Benefit: Wave-4 runbook can be written against a stable contract instead of a snapshot."
  - "Diagnostic-only wave between behavior-flip wave and UAT wave: Wave 2 flipped Win32 to headless-new (behavior change); Wave 3 added observability without touching the launch path (banner + verdict + dump are all inside Win32 or env-knob gates); Wave 4 is operator UAT. Splitting observability into its own wave means the UAT runbook can reference docs/INSTALL.md (Wave 3 output) and grep start.log for Wave-3 log strings — both stable contracts shipped together."

requirements-completed: [D-04, D-05]

# Metrics
duration: ~5min
completed: 2026-05-17
---

# Phase 47 Plan 03: Windows operator-facing diagnostics + INSTALL/USAGE docs polish Summary

**Three stable operator-greppable diagnostic log strings added on the Win32 SSR launch path (`launching headless=`, `win32 verdict:`, `launch args` env-gated) + INSTALL.md Windows operator UAT checklist + USAGE.md cross-platform parity statement; Linux boot-log surface byte-identical when SSR_LOG_LAUNCH_ARGS is unset.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-17T08:11:21Z
- **Completed:** 2026-05-17T08:16:02Z
- **Tasks:** 3 (RED + GREEN TDD pair + docs)
- **Files modified:** 3 (1 source + 2 docs) + 2 created (1 test + 1 SUMMARY)

## Accomplishments

- `src/server/ssr-render-host.mjs` launchBrowser() — Wave-2 transient `[ssr-host] win32 launch: headless=<mode>, userDataDir=<path>` log line REPLACED with Wave-3 launch banner: `[ssr-host] launching headless={new|false} on Win32 (userDataDir=<tmp>[, SSR_WIN_HEADLESS=0])`. Banner still inside the existing `if (isWin32)` block, still INFO level, still emitted exactly once per launchBrowser invocation. Format pinned by `test/phase-47-diagnostics.test.mjs` Test P (`includes("[ssr-host] launching headless=")`).
- `src/server/ssr-render-host.mjs` start() — new Win32-gated INFO verdict line emitted after the in-page publisher try/catch and BEFORE `onHostDownLatched = false;`. Two forms: `[ssr-host] win32 verdict: OK browserConnected=true producerIds=[<csv>]` when publisher succeeded, or `[ssr-host] win32 verdict: FAILED <reason>` when status.lastError is non-null. Gated on `process.platform === "win32"`. Format pinned by Test Q.
- `src/server/ssr-render-host.mjs` launchBrowser() — args composition refactored: the inline `args: buildChromiumLaunchArgs({...})` expression at the launcher() call site is now bound to `const chromiumArgs = buildChromiumLaunchArgs({...})` BEFORE the launcher() call, so the same array can be both logged AND passed to launcher() without re-evaluation. New env-gated INFO dump: `if (process.env.SSR_LOG_LAUNCH_ARGS === "1") logger.info(`[ssr-host] launch args (${process.platform}): ${chromiumArgs.join(" ")}`);` — platform-agnostic, fires once at boot. Format pinned by Test R (both `SSR_LOG_LAUNCH_ARGS` and `launch args` substrings present).
- `test/phase-47-diagnostics.test.mjs` (NEW) — 3 source-grep tests (P, Q, R) following the test/phase-34-render-mode-probe.test.mjs pattern: readFileSync + String#includes / regex. No host spawn, no Puppeteer, no Win32 simulation. RED on post-Wave-2 master, GREEN after Task-2 source edits.
- `docs/INSTALL.md` — 4 new subsections under "## Windows 10 / 11" between "### Subsequent runs" and "### \"Windows protected your PC\"":
  - "### Expected behavior" — 4-5 sentences: LAN URL banner like Linux, NO visible Chrome window (headless-new = Xvfb-equivalent on Linux), Ctrl+C cleanup within 5s (Job Object guarantees node.exe/chrome.exe/mediasoup-worker.exe all exit).
  - "### Operator UAT checklist (sign-off)" — 6 markdown checkboxes sourced from 47-VALIDATION.md § Manual-Only Verifications (LAN banner, no Chrome window, dashboard over LAN, /output/ stream within 10s, Ctrl+C clean tasklist, X-button-close clean tasklist).
  - "### Troubleshooting Windows: SSR_WIN_HEADLESS escape hatch" — documents the Wave-2 env knob with `set SSR_WIN_HEADLESS=0` + start.bat usage; points to the Wave-3 `[ssr-host] launching headless=` log line as the active-mode confirmation grep.
  - "### Troubleshooting Windows: full launch-args dump (bug reports)" — documents the Wave-3 `SSR_LOG_LAUNCH_ARGS=1` env knob, format of the dumped line, and bug-report copy-paste usage.
- `docs/USAGE.md` — new top-level `## Cross-platform behavior` section inserted immediately BEFORE `## Aligning the projection` (so it appears at top of doc), with matching Contents-list entry `- [Cross-platform behavior](#cross-platform-behavior)`. Section content: explicit Linux + Windows parity statement (both produce zero visible Chrome windows — Xvfb on Linux, headless: "new" on Windows; Ctrl+C cleanup reliable within 5s on both).
- npm test went Wave-2 baseline 421/401/1/19 → Wave-3 baseline **424/404/1/19** (+3 tests / +3 pass; same 1 pre-existing fail on 04-T3 baseline; same 19 skipped). Phase-47 test suite total 18/18 green (Wave-1's 9 + Wave-2's 6 + Wave-3's 3).
- `bash start.sh --dry-run` exits 0 (both with and without SSR_LOG_LAUNCH_ARGS=1 / SSR_WIN_HEADLESS=0 — the new env knobs are inert on non-Win32 / on Linux dry-run as expected).
- `node --check src/server/ssr-render-host.mjs` exits 0.
- `logger.info` call count: pre-Wave-3 13 → post-Wave-3 **16** (+3 matches plan prediction exactly — launch banner replaces Wave-2 transient at SAME call site, NOT +1; verdict line is +1; args dump is +1; total source-net +3 at three distinct sites: line 740 banner / line 772 dump / line 1063+1066 verdict-OK + verdict-FAILED. The verdict-OK and verdict-FAILED are in alternative branches of one `if`, counted as 2 logger.info invocations but only one fires per boot — so the count is 16 in source / at-most-3 at runtime).

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — pin diagnostic log strings** — `485d336` (test)
2. **Task 2: GREEN — launch banner + win32 verdict + SSR_LOG_LAUNCH_ARGS** — `60dc5e5` (feat)
3. **Task 3: Windows operator UAT checklist + cross-platform parity statement** — `ac2afb2` (docs)

## Files Created/Modified

### Created

- `test/phase-47-diagnostics.test.mjs` — 3 source-grep tests (P, Q, R) pinning the literal substrings `[ssr-host] launching headless=`, `[ssr-host] win32 verdict:`, and `SSR_LOG_LAUNCH_ARGS`+`launch args`. RED on Wave-2 master, GREEN after Task 2.
- `.planning/phases/phase-47/47-03-SUMMARY.md` — this file.

### Modified

- `src/server/ssr-render-host.mjs`:
  - `launchBrowser()` — Wave-2 transient `[ssr-host] win32 launch:` log line REPLACED with Wave-3 banner format `[ssr-host] launching headless={new|false} on Win32 (userDataDir=<tmp>[, SSR_WIN_HEADLESS=0])`. Still inside the existing `if (isWin32)` block. The comment block above was reworded so the literal substring `win32 launch:` does not appear anywhere in the file (acceptance criterion: `grep -c "win32 launch:" src/server/ssr-render-host.mjs = 0`).
  - `launchBrowser()` — args composition extracted to `const chromiumArgs = buildChromiumLaunchArgs({...})` BEFORE the launcher() call; SSR_LOG_LAUNCH_ARGS=1 env-gated INFO dump (`[ssr-host] launch args (<platform>): <joined args>`) added immediately before launcher(). `args: chromiumArgs` passes the bound value into launcher(). Platform-agnostic — works on Linux too.
  - `start()` — Win32-gated INFO verdict line emitted after the in-page publisher try/catch block and BEFORE `onHostDownLatched = false;`. Two branches on status.lastError: `verdict: OK browserConnected=<bool> producerIds=[<csv>]` or `verdict: FAILED <reason>`. Linux path emits nothing here (gated on `process.platform === "win32"`).
- `docs/INSTALL.md` — 4 new subsections (Expected behavior, Operator UAT checklist, SSR_WIN_HEADLESS escape hatch, SSR_LOG_LAUNCH_ARGS dump) inserted under "## Windows 10 / 11" between "### Subsequent runs" and "### \"Windows protected your PC\"". File size 7041B → 8694B (+1653B); header count 23 → 27 (+4 new `### ` headers). No emojis introduced (file is 0-emoji throughout).
- `docs/USAGE.md` — new top-level `## Cross-platform behavior` section inserted before `## Aligning the projection`; new Contents-list bullet `- [Cross-platform behavior](#cross-platform-behavior)`. File size 12454B → 13093B (+639B); header count 19 → 20 (+1 new `## ` header). Pre-existing emojis (🟠 in profile toolbar table, 📋 in animation editor section — both already present on Wave-2 HEAD) untouched.

## Decisions Made

- **Launch banner REPLACES Wave-2 transient, not appends.** Acceptance criterion requires `grep -c "win32 launch:" src/server/ssr-render-host.mjs = 0` — i.e. the Wave-2 string must be gone from the file entirely, including comments. Reworded the explanatory comment above the banner mid-task ("the shorter Wave-2 transient log line" without the literal substring) to satisfy the criterion. Banner is a complete supersede.
- **Verdict line placed after publisher try/catch, before onHostDownLatched reset.** The verdict line must reflect the result of the publisher injection. The catch block above sets `status.lastError = err.message;` when injectInPagePublisher throws. Placing the verdict AFTER that catch (still inside `start()`) means the FAILED branch can surface the lastError verbatim, and the OK branch is reached only when both `status.browserConnected === true` (set on line 1012) AND `status.lastError === null` (untouched by the publisher path). Placed BEFORE the `onHostDownLatched = false;` line (around line 1075) so it's the last per-boot diagnostic before health-pings start.
- **Args dump is env-gated WITHOUT a platform gate.** The plan's `<interfaces>` block explicitly specifies no Win32 gate on this knob — operator docs mention it only for Windows because that's the audience that lacks CI, but the knob works on Linux too (useful for the developer side debugging arg-list issues). Linux boot-log surface is unaffected when SSR_LOG_LAUNCH_ARGS is unset (the default).
- **Named-binding `const chromiumArgs` is a pure refactor.** No change to argv passed to puppeteer-stream's launcher(). The dump line gets the SAME array that launcher() receives — no risk of drift between what we log and what we run. This is single-source-of-truth observability: if the dumped arg list ever differs from the actual passed args, it's a bug in the buildChromiumLaunchArgs helper, not in the dump line.
- **USAGE.md cross-platform section placed BEFORE "Aligning the projection".** Per plan instructions — "appears in the table-of-contents at the top". Operator-facing audience benefits from the parity statement being the first thing they see in USAGE.md after the intro. Contents list updated to match.

## Deviations from Plan

None — plan executed exactly as written. The three RED tests in Task 1 failed exactly as predicted (all 3 RED on Wave-2 master). Task-2 GREEN source edits made all 3 GREEN on first compile after the edit. Task-3 docs grep checks all passed first time. Only minor in-flight adjustment was rewording the comment above the Wave-3 banner to ensure `grep -c "win32 launch:" = 0` (the comment originally referenced the Wave-2 string verbatim, which violated the acceptance criterion — reworded to `the shorter Wave-2 transient log line` mid-task before commit).

## Issues Encountered

None — clean RED → GREEN TDD cycle on Tasks 1+2, clean docs insert on Task 3. All Phase 47 tests green at every checkpoint. No analysis paralysis, no fix-attempt loops. npm test count delta exactly matches plan prediction (+3 tests / +3 pass). `bash start.sh --dry-run` exits 0 throughout.

## User Setup Required

None — no external service configuration required. Two new env knobs (`SSR_WIN_HEADLESS=0`, `SSR_LOG_LAUNCH_ARGS=1`) are both opt-in, both documented in docs/INSTALL.md Windows section, both surface in start.log via the new banner / verdict / dump lines.

## Next Phase Readiness

- **Wave 4 (Plan 47-04) ready to start.** All three operator-facing diagnostic surfaces are live in source (banner + verdict + dump); operator docs (INSTALL.md Windows section, USAGE.md cross-platform statement) provide the Wave-4 UAT runbook target.
- **D-03 empirical proof on operator's Win11 box is the only remaining gate.** The escape hatch (`SSR_WIN_HEADLESS=0`) is documented as the operator's fallback if headless-new misbehaves; the args dump (`SSR_LOG_LAUNCH_ARGS=1`) is the documented bug-report capture mechanism.
- **No blockers.** Linux non-regression rail (LINUX_ITER15_BASELINE in test/phase-47-linux-non-regression.test.mjs Test G + H) still green — Wave 3 added no logger.info calls outside Win32 or env-knob gates, so Linux boot-log surface is untouched when SSR_LOG_LAUNCH_ARGS is unset. The Wave-2 escape-hatch path (Test O) is byte-identical to the Wave-2 baseline (no buildChromiumLaunchArgs change in Wave 3).

## Threat Flags

None — Wave 3 is purely observability + docs. The three new log lines emit only:
- The literal headless mode (`"new"` or `"false"`) and the userDataDir path (already in operator logs from iter15).
- The literal browserConnected boolean and the producer IDs (already part of the WebRTC signaling surface — not new at trust boundaries).
- The full Chromium command-line arg array (only when SSR_LOG_LAUNCH_ARGS=1 is explicitly set — operator opt-in; args contain no secrets, only Chromium feature flags, viewport dimensions, and the local SSR URL).
- No new network endpoints, auth paths, file access patterns, or schema changes.

---

## Self-Check: PASSED

- **`test/phase-47-diagnostics.test.mjs`** — created; 3/3 tests green (`node --test` confirmed: P, Q, R all pass). Imports node:test + node:assert/strict + readFileSync. Contains `launching headless`, `win32 verdict`, `SSR_LOG_LAUNCH_ARGS`, `readFileSync`, `from "node:test"`.
- **`src/server/ssr-render-host.mjs`** — modified; contains `[ssr-host] launching headless=`, `[ssr-host] win32 verdict:`, `SSR_LOG_LAUNCH_ARGS`, `const chromiumArgs = buildChromiumLaunchArgs`, `verdict: OK`, `verdict: FAILED` (all grep-verified). `win32 launch:` substring count = 0 (Wave-2 transient gone, including from comments). logger.info count 13 → 16 (+3 at lines 740 / 772 / 1063+1066). `node --check` exits 0.
- **`docs/INSTALL.md`** — modified; contains `### Expected behavior`, `### Operator UAT checklist`, `SSR_WIN_HEADLESS`, `SSR_LOG_LAUNCH_ARGS`, `tasklist | findstr`, and the literal phrase `NOT see a separate Chrome window` (all grep-verified). 0 emojis. Header count 23 → 27 (+4 new `### ` headers).
- **`docs/USAGE.md`** — modified; contains `## Cross-platform behavior` and a Contents-list entry linking to `#cross-platform-behavior` (both grep-verified). Pre-existing 2 emojis (🟠, 📋) unchanged from Wave-2 HEAD — Wave 3 introduced no new emojis. Header count 19 → 20 (+1 new `## ` header).
- **Commit `485d336`** — `test(47-03): RED — pin diagnostic log strings` — present in `git log`.
- **Commit `60dc5e5`** — `feat(47-03): GREEN — launch banner + win32 verdict + SSR_LOG_LAUNCH_ARGS` — present in `git log`.
- **Commit `ac2afb2`** — `docs(47-03): Windows operator UAT checklist + cross-platform parity statement` — present in `git log`.
- **`node --test test/phase-47-*.test.mjs`** — 18/18 pass (Wave 1's 9 + Wave 2's 6 + Wave 3's 3).
- **`npm test`** — 424/404/1/19 (Wave-2's 421/401/1/19 + 3 new diagnostic tests / +3 pass; only fail = pre-existing 04-T3; same 19 skipped).
- **`bash start.sh --dry-run`** — exit 0.
- **`node --check src/server/ssr-render-host.mjs`** — exit 0.

---

*Phase: 47-windows-parity*
*Plan: 03 — Windows operator-facing diagnostics + INSTALL/USAGE docs polish (Wave 3)*
*Completed: 2026-05-17*
