---
phase: 28-cross-cutting-ux-state-polish
plan: 01
subsystem: align-mode-projection-profile
tags: [board-profiles, projection-profiles, dirty-flag, server-authoritative, live-sync, tdd]

# Dependency graph
requires:
  - phase: 28-cross-cutting-ux-state-polish
    plan: 00
    provides: Wave-0 test scaffolds (board-profile-fields, board-json-roundtrip, auto-load-fallback) with locked decision-ID skip names this plan converts to live tests.
  - phase: 27-multi-device-align-mode
    provides: Phase 27 W5 dirty-flag broadcaster + _loadedProfileSnapshot dirty contract this plan must NOT spuriously trigger.
provides:
  - lastUsedProfileName field across BOARD_PROFILE_FIELDS round-trip (server.mjs).
  - state.lastUsedProfileNameByBoard hydration + emission with path-traversal validator.
  - applyAndCaptureSnapshot / applyDefaultAndCaptureSnapshot helpers (silent load with snapshot=loaded so isDirty()===false).
  - autoLoadRememberedProjectionProfile fire-and-forget call inside switchBoard.
affects: [28-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 26 server-authoritative live-synced field pattern: append to BOARD_PROFILE_FIELDS, no other server.mjs change needed (3 iterators already loop the list)."
    - "Phase 27 dirty-flag pattern: snapshot=loaded immediately after applyGridPayload so isDirty()===false on programmatic load."
    - "Trust-boundary normalizer: validateProfileName at both build and apply sites (V5 ASVS path-traversal hardening, T-28-01-01 mitigation)."
    - "Silent auto-load: separate helper(s) that explicitly do NOT touch lastUsedProfileNameByBoard, breaking the auto-load-write-broadcast recursion (RESEARCH §Pitfall 2)."

key-files:
  created:
    - .planning/phases/phase-28/28-01-SUMMARY.md
  modified:
    - server.mjs
    - src/app/lib/state/runtime-state.js
    - src/app/runtime/state/runtime-board-profiles.js
    - src/app/runtime/viewport/runtime-projection-profile-persistence.js
    - src/app/runtime/core/runtime-board-switch.js
    - test/board-profile-fields.test.mjs
    - test/board-json-roundtrip.test.mjs
    - test/auto-load-fallback.test.mjs

key-decisions:
  - "lastUsedProfileName field added as the LAST entry of BOARD_PROFILE_FIELDS (preserves stable order; existing 3 iterators round-trip the field automatically)."
  - "validateProfileName regex /^[a-zA-Z0-9 _.-]{1,80}$/ rejects path-traversal (../, /, \\\\), null bytes, overlength (>80), empty, and non-string values; trims whitespace on accept."
  - "applyAndCaptureSnapshot and applyDefaultAndCaptureSnapshot are intentionally silent — they do NOT update state.lastUsedProfileNameByBoard. Only the four user-explicit trigger sites do. This prevents the auto-load → write → broadcast → re-apply → switch recursion (D-01)."
  - "switchBoard remains synchronous; auto-load is fire-and-forget via `void autoLoadRememberedProjectionProfile(board.id)` AFTER refreshGlobalButtons() and BEFORE the announceStatus block."
  - "Tests are pure-Node source-pattern assertions (no jsdom, no browser shim) — they grep production source for the locked patterns and parse server.mjs's BOARD_PROFILE_FIELDS list to assert the field is present."

requirements-completed: [B1]

# Metrics
duration: 4min
completed: 2026-05-04
---

# Phase 28 Plan 01: Per-board last-used Align profile memory + auto-load on board-switch Summary

**B1 wired end-to-end: every Save/Load trigger persists `lastUsedProfileName` per board through the existing BOARD_PROFILE_FIELDS round-trip, and switchBoard now fires a silent fire-and-forget auto-load that restores the remembered profile (or default geometry) with snapshot=loaded — so isDirty()===false and the Phase 27 multi-device save-gate does NOT spuriously disable the dashboard's board-switch dropdown.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-04T15:12:10Z
- **Completed:** 2026-05-04
- **Tasks:** 2
- **Files modified:** 8 (5 source + 3 tests)
- **Files created:** 1 (this SUMMARY)

## Accomplishments

- B1-D01 implemented: Save (saveLoaded/saveAsNew/createNew) AND Load (profileLoadFlow.onPick) flows now persist `state.lastUsedProfileNameByBoard[boardId]` immediately before `ctx.persistBoardProfiles()` fires. Discard / Reset / Default fall-back paths intentionally do NOT touch the field.
- B1-D02 implemented: BOARD_PROFILE_FIELDS extended with `lastUsedProfileName` so the existing iterators at server.mjs lines 62 (extractProfileFromUnifiedBoard), 2002 (buildBoardProfileForFile), and 2166 (persistBoardProfileToBoardFile) round-trip the field automatically. No other server.mjs change required.
- B1-D03 implemented: `autoLoadRememberedProjectionProfile(boardId)` defined in runtime-board-switch.js and fired fire-and-forget from switchBoard. Silent on every path: null/missing → applyDefaultAndCaptureSnapshot; 4xx/network/parse error → same fallback; named profile loads cleanly → applyAndCaptureSnapshot(body.data, remembered). No popup, no toast, no confirm.
- T-28-01-01 mitigated: `validateProfileName` regex `/^[a-zA-Z0-9 _.-]{1,80}$/` clamps invalid values to null at both emit and hydrate sites — path-traversal characters (`../`, `/`, `\\`), null bytes, overlength names, and empty/whitespace-only strings can never round-trip onto disk.
- Three Wave-0 test scaffolds converted from `test.skip` to live tests:
  - `test/board-profile-fields.test.mjs` — B1-D01 path-traversal validator + save-flow trigger source-pattern assertions.
  - `test/board-json-roundtrip.test.mjs` — B1-D02 disk round-trip + BOARD_PROFILE_FIELDS structural assertion.
  - `test/auto-load-fallback.test.mjs` — B1-D03 silent-fallback source-pattern assertions (no popup/confirm/showProfilePickerMenu in helper body).

## Exact Insertion Sites (per <output> spec)

### Four-line "persist lastUsedProfileNameByBoard + persistBoardProfiles()" block — exactly 4 sites

All four sites use the locked block:
```javascript
if (ctx?.state) {
  (ctx.state.lastUsedProfileNameByBoard ??= {})[boardId] = _loadedProfileName;
}
if (typeof ctx?.persistBoardProfiles === "function") ctx.persistBoardProfiles();
```

| # | Function | File | Inserted between | Approx line (post-edit) |
|---|----------|------|------------------|-------------------------|
| 1 | `saveLoadedProfileFlow` | runtime-projection-profile-persistence.js | After `_loadedProfileSnapshot = _gridStateApi.snapshotGridState();` BEFORE `_persistLoadedProfileToLs();` | ~250–256 |
| 2 | `saveAsNewProfileFlow` | runtime-projection-profile-persistence.js | After `_loadedProfileSnapshot = _gridStateApi.snapshotGridState();` BEFORE `_persistLoadedProfileToLs();` | ~280–285 |
| 3 | `createNewProfileFlow` | runtime-projection-profile-persistence.js | After `_loadedProfileSnapshot = _gridStateApi.snapshotGridState();` BEFORE `_persistLoadedProfileToLs();` | ~329–335 |
| 4 | `profileLoadFlow.onPick` | runtime-projection-profile-persistence.js | After `_loadedProfileSnapshot = _gridStateApi.snapshotGridState();` BEFORE `_persistLoadedProfileToLs();` | ~478–484 |

`grep -c "state.lastUsedProfileNameByBoard ??= {})\[boardId\] = _loadedProfileName" src/app/runtime/viewport/runtime-projection-profile-persistence.js` → **4**.

### switchBoard auto-load injection

`void autoLoadRememberedProjectionProfile(board.id);` was inserted in `switchBoard` (runtime-board-switch.js) AFTER `ctx.refreshGlobalButtons();` and BEFORE the `if (announceStatus && !shouldPreserveLifecycleStatusFeedback())` block — see line ~133. The helper itself sits between `shouldPreserveLifecycleStatusFeedback` and `switchBoard` (lines ~36–67).

## D-01 Binding — Functions That MUST NOT Update lastUsedProfileNameByBoard

Confirmed via `awk` extraction + grep on each function body in runtime-projection-profile-persistence.js:

| Function | lastUsedProfileNameByBoard refs | D-01 status |
|----------|-------------------------------|-------------|
| `discardChanges` | 0 | OK |
| `applyAndCaptureSnapshot` (new helper) | 0 | OK |
| `applyDefaultAndCaptureSnapshot` (new helper) | 0 | OK |
| `profileLoadFlow` D-08 recovery branch (line ~437–457) | 0 | OK |

Only the four user-explicit save/load triggers write the field. The auto-load path is silent in BOTH directions (no popup AND no field-write), breaking the recursion pitfall described in RESEARCH §"Pitfall 2".

## Test Suite Output

Run command: `node --test "test/**/*.test.mjs"`

```
ℹ tests 23
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 11
ℹ todo 0
```

Wave-0 baseline was `# pass 8 / # skipped 15`. After Wave-1: `# pass 12 / # skipped 11` — exactly four newly-active tests as expected:

| Test name | File | Status |
|-----------|------|--------|
| `B1-D01: lastUsedProfileName rejects path-traversal characters` | board-profile-fields.test.mjs | ACTIVE PASS |
| `B1-D01: save flow updates lastUsedProfileName` | board-profile-fields.test.mjs | ACTIVE PASS |
| `B1-D02: lastUsedProfileName persists in config/boards/<id>.json round-trip` | board-json-roundtrip.test.mjs | ACTIVE PASS |
| `B1-D03 fallback: null lastUsedProfileName loads default geometry without popup` | auto-load-fallback.test.mjs | ACTIVE PASS |

## Task Commits

1. **Task 1: Add lastUsedProfileName to BOARD_PROFILE_FIELDS + state slot + path-traversal validator** — `9f06f32` (feat)
2. **Task 2: Wire save/load triggers + auto-load on board-switch helper** — `fb99b19` (feat)

## Acceptance Criteria Evidence (per Plan)

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `grep -F '"lastUsedProfileName",' server.mjs` | ≥1 in BOARD_PROFILE_FIELDS region | 1 (line 51, last entry of freeze list) |
| `grep -F "lastUsedProfileNameByBoard" src/app/lib/state/runtime-state.js` | ≥1 with `: {},` | 1 (`lastUsedProfileNameByBoard: {},`) |
| `grep -F "validateProfileName" src/app/runtime/state/runtime-board-profiles.js` | ≥3 lines | 4 (definition + buildBoardProfilesFromState call + applyBoardProfilesToState call + window export) |
| `grep -c ASSIGNMENT_BLOCK runtime-projection-profile-persistence.js` | exactly 4 | 4 |
| discardChanges body grep `lastUsedProfileNameByBoard` | 0 | 0 |
| `grep -F "function applyAndCaptureSnapshot"` | 1 | 1 |
| `grep -F "function applyDefaultAndCaptureSnapshot"` | 1 | 1 |
| `grep -F "applyAndCaptureSnapshot,"` (export) | 1 | 1 |
| `grep -F "function autoLoadRememberedProjectionProfile" runtime-board-switch.js` | 1 | 1 |
| `grep -F "void autoLoadRememberedProjectionProfile(board.id)"` | 1 | 1 |
| `grep -F "autoLoadRememberedProjectionProfile,"` (export) | 1 | 1 |
| `node --test "test/**/*.test.mjs"` exit code | 0 | 0 |
| Three formerly-skipped B1 tests pass | yes | yes |

## Decisions Made

- **Tests are source-pattern (textual) rather than DOM-bootstrap.** The plan permits this approach explicitly (`<action>` SUB-STEP C of Task 2: "textual-pattern test on the source"). The B1 contract is heavy on side-effect ordering and call-chain shape; grep-on-source is the cleanest cross-test assertion and avoids needing a jsdom/IIFE bootstrap. Behavior contracts (D-01, D-03, no-popup) are still verifiable as text patterns inside the helper body (extracted via regex).
- **`validateProfileName` exported on the module's window object.** Even though the test inlines its own copy of the regex (per plan SUB-STEP D.1), the production validator is also exported so future consumers (or defense-in-depth call sites) can re-validate at write time. The acceptance grep `grep -c "validateProfileName" runtime-board-profiles.js >= 3` is satisfied at 4.
- **Helper-internal `_gridStateApi` guard added.** The two new helpers `applyAndCaptureSnapshot` / `applyDefaultAndCaptureSnapshot` start with `if (!_gridStateApi) return;`. This is a Rule-2 defensive check (correctness): the helpers may be called from autoLoadRememberedProjectionProfile during board-switch ordering; if init() hasn't completed wiring yet (e.g. very early boot), we silently no-op rather than throw on `_gridStateApi.snapshotGridState()`. Mirrors the pattern in `isDirty()` line 178.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Defensive `if (!_gridStateApi) return;` guard in new helpers**

- **Found during:** Task 2 implementation
- **Issue:** Plan's interface block for `applyAndCaptureSnapshot` / `applyDefaultAndCaptureSnapshot` did not include a guard for the case where `_gridStateApi` is null. If autoLoadRememberedProjectionProfile fires during very-early boot (before init() completes wiring) the helper would NPE on `.snapshotGridState()` / `.buildNewProfileDefaultGrid()`.
- **Fix:** Added `if (!_gridStateApi) return;` as the first statement of both helpers. Mirrors the existing pattern in `isDirty()` at line 178 ("if no grid state API, return false").
- **Files modified:** src/app/runtime/viewport/runtime-projection-profile-persistence.js
- **Commit:** fb99b19 (Task 2)
- **Why this is correctness-critical:** Without the guard, board-switch during pre-init would crash the orchestration bootstrap path. Guard is identical to existing module convention.

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing defensive guard). All other interfaces are byte-equivalent to the plan's interface block.

## Issues Encountered

- None beyond the documented Rule-2 defensive guard above.

## User Setup Required

None — no external service configuration, no manual auth steps, no migrations. The change is purely server-authoritative on the existing config/boards/<id>.json round-trip; legacy boards without the field default to null and cleanly fall through to the default-geometry branch on first board-switch.

## Manual Verification (per 28-VALIDATION.md §Manual-Only Verifications)

The plan's `<verification>` block explicitly defers the visual smoke test (B1-D03 isDirty()===false post-load) to manual matrix in 28-VALIDATION.md. Steps for the Phase Verifier:

1. Open dashboard, switch to board A.
2. Save a projection profile "alpha".
3. Switch to board B (any other board with no remembered profile).
4. Switch back to board A. **Expected:** profile "alpha" auto-loads silently (no popup), the toolbar shows "alpha" as the active profile, the dashboard board-select dropdown stays enabled (dirty=false).
5. Open the dashboard's align-toggle button — it should NOT display the "Unsaved on /output/" hint chip after the auto-load.

## Next Phase Readiness

- Wave 2 (Plan 28-02 — B2 board-switch save-gate) can proceed. Plan 28-02's hint-copy test scaffold (`test/dashboard-hint-copy.test.mjs`) remains skipped per its own wave assignment; this plan does not touch it.
- The B1 contract is locked-in via the four assignment-site grep + discardChanges-zero-grep + auto-load-helper-source-pattern test triple, so future refactoring can detect regression instantly.

## Self-Check: PASSED

- FOUND: server.mjs (lastUsedProfileName in BOARD_PROFILE_FIELDS, line 51)
- FOUND: src/app/lib/state/runtime-state.js (lastUsedProfileNameByBoard: {})
- FOUND: src/app/runtime/state/runtime-board-profiles.js (validateProfileName + 2 call sites + window export)
- FOUND: src/app/runtime/viewport/runtime-projection-profile-persistence.js (4 assignment sites + 2 helpers + 2 exports)
- FOUND: src/app/runtime/core/runtime-board-switch.js (autoLoadRememberedProjectionProfile + void call + window export)
- FOUND: test/board-profile-fields.test.mjs (2 active tests, 0 skips)
- FOUND: test/board-json-roundtrip.test.mjs (1 active test, 0 skips)
- FOUND: test/auto-load-fallback.test.mjs (1 active test, 0 skips)
- FOUND commit: 9f06f32 (Task 1: feat lastUsedProfileName field + validator)
- FOUND commit: fb99b19 (Task 2: feat triggers + auto-load)
- TEST suite: 23 tests, 12 pass, 0 fail, 11 skipped (Wave-1 baseline-+4 active matches expected)

---
*Phase: 28-cross-cutting-ux-state-polish*
*Completed: 2026-05-04*
