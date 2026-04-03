# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1 and 9-HF2 are completed baselines, but not final closure.
- New mandatory closure target is Plan 9-HF3 with hard gates below.

## Regression and Verification Strategy
- Mapping-first: polygon overlay coordinate mapping must remain deterministic across browser/DPR/fullscreen transitions.
- Mixed-media-first: `/output/final` must preserve room GIF rendering even after room `mp4` start (`malfunction`).
- Stability-first: weak-hardware `mp4` concurrency must stay stable through configurable performance controls.
- Feedback-first: command/API failure and timeout paths must produce explicit operator-visible errors.
- Determinism-first: sync ordering/version/idempotent apply invariants remain unchanged.
- Evidence-first: every P0 hotfix item requires reproducible browser/final-output/weak-hardware evidence.

## Hard Gates (Plan 9-HF3, mandatory)
- G1 Cross-Browser-Coordinate-Determinism-Gate: polygon overlay alignment remains correct and stable across browser/DPR/fullscreen/resize/orientation states.
- G2 Final-Output-Mixed-Media-Lifecycle-Gate: starting room `malfunction` (`mp4`) does not stop room GIF rendering on `/output/final`.
- G3 Weak-Hardware-MP4-Stability-Gate: configurable quality/performance controls keep playback stable under high concurrent `mp4` load.
- G4 Explicit-Error-Feedback-Gate: command/API failure and timeout paths surface clear user-facing error feedback; silent no-op paths are eliminated.
- G5 Deterministic-Sync-Integrity-Gate: ordering/version/idempotent apply behavior remains intact under HF3 hotfix paths.
- G6 Strict-Regression-Gate: full browser + mixed-media final-output + weak-hardware + feedback matrix below must be PASS with evidence.

## Strict Regression Matrix (Plan 9-HF3)
- Polygon-Alignment-Browser-Matrix-Test: verify overlay parity in Chromium/Gecko/WebKit paths at multiple viewport sizes.
- Fullscreen-DPR-Transition-Test: verify deterministic mapping through fullscreen enter/exit, orientation changes, and DPR changes.
- Malfunction-MP4-Then-GIF-Final-Test: start room `malfunction` (`mp4`), then start room GIF animations; `/output/final` must continue rendering GIFs.
- Mixed-Media-Lifecycle-Repeat-Test: repeated start/stop/restart loops for room `mp4` + room GIF combinations keep final-output parity with control view.
- Concurrent-MP4-Weak-Hardware-Test: high concurrent `mp4` streams remain stable with configurable quality/performance profile controls.
- Degrade-Recover-Hysteresis-Test: degradation escalates under pressure and recovers cleanly when pressure drops without oscillation/crash.
- Command-Failure-Feedback-Test: forced command dispatch failures produce explicit toast/error feedback.
- API-Timeout-Feedback-Test: forced API timeouts produce explicit toast/error feedback with actionable copy.
- Deterministic-Sync-Under-HF3-Test: multi-client ordering/version/apply invariants remain stable under HF3 code paths.
- Non-Regression-Full-Matrix-Test: core operator workflows and `/output/final` remain functionally equivalent.

## Incremental Mandatory Gates
- After P9-HF3-T1..T2: coordinate mapping parity is validated across browser/DPR/fullscreen transitions.
- After P9-HF3-T3..T4: mixed-media final-output lifecycle bug is reproduced then verified fixed.
- After P9-HF3-T5..T6: weak-hardware concurrent `mp4` stability controls are validated under stress.
- After P9-HF3-T7: explicit error feedback is validated for command/API failure and timeout paths.
- After P9-HF3-T8: deterministic sync invariants are PASS under HF3 conditions.
- After P9-HF3-T9: full matrix is PASS with evidence and all phase/global planning artifacts are synchronized.

## Definition of Done
- Polygon overlay alignment is deterministic across supported browsers and viewport/DPR/fullscreen transitions.
- `/output/final` mixed-media lifecycle is stable: room `mp4` start does not suppress room GIF rendering.
- Runtime remains stable under sustained high concurrent `mp4` load on weak hardware via configurable controls.
- Command/API failures and timeouts always produce explicit user-facing feedback.
- Deterministic sync remains intact under load and HF3 fix paths.
- Browser/final-output/weak-hardware/feedback evidence matrix is PASS and documented.
- Phase-09 artifacts and global tracking files are synchronized.

## Plan 9-1 Closure Note

- 9-1 evidence remains documented in `9-1-VERIFICATION.md`.
- Acceptance status is corrected to NOT ACCEPTED; closure now depends on Plan 9-HF3 hard gates.

## Plan 9-HF1 Closure Note

- Hard reduction gate achieved: `src/app.js` reduced from 12163 to 28 lines.
- Mandatory extraction artifacts are documented in `9-HF1-BOUNDARY-MAP.md` and `9-HF1-VERIFICATION.md`.

## Plan 9-HF2 Closure Note

- 9-HF2 closure is PASS and remains valid baseline for lifecycle no-replay + low-end hardening.

## Plan 9-HF3 Closure Target

- Closure requires explicit PASS evidence for cross-browser coordinate determinism, final-output mixed-media lifecycle integrity, weak-hardware concurrent `mp4` stability controls, and explicit error feedback coverage.
- Gate status: PASS (evidence in `9-HF3-SUMMARY.md` and `P9-HF3-REGRESSION-EVIDENCE.md`).
