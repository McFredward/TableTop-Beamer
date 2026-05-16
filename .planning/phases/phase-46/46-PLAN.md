---
phase: 46
slug: release-preparation
status: READY-FOR-EXECUTION
created: 2026-05-16
predecessor: phase-45-closed (commit 3839a94)
context: .planning/phases/phase-46/46-CONTEXT.md
---

# Phase 46 — Plan: Release Preparation

## Wave 1 — Fixes (parallel-safe)

### T1.1 — Fix mobile light-mode top-nav buttons
- Hunt the CSS rule that styles Dashboard/Settings/Control buttons.
- Find why the mobile media query doesn't pick up `body.light-mode` color.
- Add the missing rule(s); verify across breakpoints.

### T1.2 — Bump version
- `package.json` → `1.0.0` (strip `-wave0` suffix).
- `README.md` version badge → `1.0.0`.
- Grep for other hard-coded version strings.

## Wave 2 — Gitignore / push-list audit

### T2.1 — Add ignores
- `config/projection-profiles.json` → ignore + `git rm --cached`.
- `config/runtime-active-*.json` → ignore + `git rm --cached` if tracked.
- `debug/` (top-level) → ignore.

### T2.2 — Verify boards + assets stay tracked
- `config/boards/` + `config/boards/assets/` must remain in repo.
- Spot-check that `git ls-files config/boards/` returns the expected set.

### T2.3 — `.planning/` audit
- Confirm `.planning/` is not in .gitignore.
- Decide on `.planning/debug/` (~150 KB images): keep for context.
- Snapshot a clean `tree` listing into the closure for review.

## Wave 3 — README modernization

### T3.1 — Restructure README
- Move click-and-run quick-start to the **top** (post-banner).
- Tighten Highlights / Requirements sections.
- Add visible "What's new in v1.0" callout pointing at SSR + installers.
- Keep all videos / GIFs in place.
- Update Quick-Start with the new `./start.sh` / `start.bat` instructions.
- Update badges (version, Node version → 22, license).

## Wave 4 — Validation

### T4.1 — Tests
- `npm test` — full suite. Expect 408 tests, ≥ 387 passing (1 pre-existing baseline fail).

### T4.2 — `./start.sh` smoke
- One more end-to-end via start.sh on dev host to confirm nothing broke.

### T4.3 — Final `git status` audit
- Ensure no accidental commits of operator-runtime files.
- Ensure all the intended new files are staged.

## Wave 5 — Closure

### T5.1 — 46-CLOSURE.md
### T5.2 — STATE.md lifecycle update
### T5.3 — Single commit per wave (or one combined release-prep commit), tag `phase-46-closed`

## Risks

| Risk | Mitigation |
|---|---|
| Untracking `projection-profiles.json` deletes operator's calibration on next pull | We `git rm --cached` (not `git rm`); local file remains on operator's disk |
| README rewrite breaks markdown links | Quick spot-check after rewrite |
| Mobile fix may need multiple selectors | Iterate; verify on actual viewport via dev-tools mobile emulation |
