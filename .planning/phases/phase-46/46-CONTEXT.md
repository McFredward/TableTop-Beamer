---
phase: 46
slug: release-preparation
status: PLANNING
opened: 2026-05-16
predecessor: phase-45-closed (commit 3839a94)
---

# Phase 46 — Release Preparation

## TL;DR

Final polish before the public-facing GitHub release. Bumps version, modernizes
README, locks down what does and doesn't get pushed (no operator-specific
calibration data, but everything contributors need), fixes one stray
mobile-UI bug (light-mode top-nav buttons), and tidies `.planning/` so
contributors can see how the project is run.

## Goals (locked by operator 2026-05-16)

1. **Version audit + bump.** Current `0.31.0-wave0` (with internal wave
   suffix) and README badge `0.28.0` (outdated). Pick a clean release
   number — **1.0.0** to reflect Phase 40-45's production-readiness work
   (SSR-only path, click-and-run installers, env-var cleanup).
2. **README modernization.** Cleaner layout, more skimmable; reflect
   Phase 40-45 changes (SSR is now the only render path; click-and-run
   installers exist); **keep all videos + GIFs intact** (operator
   prefers).
3. **Push-list audit:**
   - **MUST NOT** push: `config/projection-profiles.json` (operator's
     per-board align-mode calibration data). Each operator needs their
     own.
   - **MUST** push: `config/boards/` (board definitions) + `config/boards/assets/`
     (board PNGs, the visual reference for projection mapping).
   - **MUST** push: `.planning/` (decisions, phases, intel — useful for
     anyone wanting to contribute).
   - **MUST NOT** push: `config/runtime-active-*.json` (runtime state,
     gets recreated on first run).
4. **Fix mobile light-mode button bug.** Top-nav buttons (Dashboard /
   Settings / Control) don't pick up the white/light-mode color **only
   on mobile** — desktop is fine. Likely a mobile-media-query CSS
   specificity issue.
5. **`.planning/` cleanup.** Ensure structure is contributor-friendly.
   Remove stale debug PNGs that don't belong in version control.

## Constraints

- Test suite must still pass (408/388 pre-existing baseline).
- start.sh / start.bat must still work end-to-end.
- No breaking changes to existing operator-facing config (we add the
  ignore line for projection-profiles, but the file is operator-local
  so this is moot for them).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Version number | **1.0.0** | Phase 40-45 brought TT-Beamer to a state where laypeople can install + run it. SSR-only path retired the experimental render modes. The click-and-run installers make this distribution-ready. v1.0 signals that. |
| README style | Modernize but keep videos/gifs | Operator preference; videos are key for showcasing the visual nature of the project |
| `.planning/` push | Track everything except debug PNG dumps | Helps contributors understand the GSD workflow + project history |
| Projection profiles | Gitignore + add to `.gitignore`; manually `git rm --cached` to untrack | Operator-local calibration data; useless for other operators since each setup is unique |

## Out of scope

- Code-signing the start scripts (separate cost-benefit decision)
- Publishing to npm / Docker Hub
- Auto-updates from a release server
- Translations / i18n
- Mac support
