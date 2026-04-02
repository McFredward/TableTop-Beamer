# Phase 9 Acceptance

## Acceptance Correction
- Binding correction: Plan 9-1 is not accepted.
- Plan 9-HF1 is completed baseline, but not final closure.
- New mandatory closure target is Plan 9-HF2 with hard gates below.

## Regression and Verification Strategy
- Lifecycle-first: event terminal/expiry semantics must survive reload/reconnect deterministically.
- No-replay-first: expired one-shot events are never replayed after rehydrate/rejoin.
- Stability-first: low-end device load hardening must reduce runtime collapse under sustained pressure.
- Determinism-first: sync ordering/version/idempotent apply invariants remain unchanged.
- Evidence-first: every P0 hotfix item requires reproducible long-run and mobile evidence.

## Hard Gates (Plan 9-HF2, mandatory)
- G1 Rehydrate-Lifecycle-Correctness-Gate: elapsed events (especially one-shot) rehydrate as terminal/completed and are not treated as pending.
- G2 No-Replay-Expired-OneShot-Gate: expired one-shot events never replay on browser reload or reconnect.
- G3 Frame-Budget-Hardening-Gate: runtime engages deterministic load shedding/caps/coalescing on low-end pressure without crash/freeze escalation.
- G4 Deterministic-Sync-Integrity-Gate: ordering/version/idempotent apply behavior remains intact under HF2 hardening paths.
- G5 Strict-Regression-Gate: full long-run + mobile matrix below must be PASS with evidence.

## Strict Regression Matrix (Plan 9-HF2)
- Expired-OneShot-Reload-Test: trigger one-shot, wait past expiry, reload, assert no replay and terminal state restored.
- Expired-OneShot-Reconnect-Test: disconnect/reconnect after expiry, assert no replay and deterministic terminal lifecycle.
- Rehydrate-Age-Boundary-Test: verify behavior at pre-expiry, exact-expiry, and post-expiry checkpoints.
- Long-Run-Soak-Lifecycle-Test: sustained trigger/start/stop/clear/reload loops keep lifecycle stable with no replay drift.
- Low-End-Mobile-Frame-Budget-Test: constrained profile stays responsive via hardening ladder (no runaway frame collapse).
- Particle-Cap-Coalescing-Test: caps/coalescing activate under pressure and recover correctly when pressure drops.
- Deterministic-Sync-Under-Load-Test: multi-client ordering/version/apply invariants remain stable under stress.
- Persistence-Parity-Test: save/reload/restart/defaults preserve corrected terminal lifecycle semantics.
- Final-Output-Non-Regression-Test: `/output/final` shows no replay artifacts for expired one-shot events.
- Non-Regression-Full-Matrix-Test: core operator workflows remain functionally equivalent.

## Incremental Mandatory Gates
- After P9-HF2-T1..T2: lifecycle reconciliation and no-replay guards are validated on reload/reconnect.
- After P9-HF2-T3: deterministic lifecycle parity is validated across local and synced paths.
- After P9-HF2-T4..T5: low-end hardening ladder and caps/coalescing are validated under stress.
- After P9-HF2-T6: deterministic sync invariants are PASS under hardening conditions.
- After P9-HF2-T7..T8: long-run and mobile stress matrices are PASS with evidence.
- After P9-HF2-T9: all phase/global planning artifacts are synchronized.

## Definition of Done
- Expired one-shot events are never replayed after reload/reconnect.
- Rehydrate/rejoin treat elapsed events as terminal/completed deterministically.
- Runtime remains stable under sustained load on weak mobile devices via controlled hardening.
- Deterministic sync remains intact under load and hardening paths.
- Long-run + mobile evidence matrix is PASS and documented.
- Phase-09 artifacts and global tracking files are synchronized.

## Plan 9-1 Closure Note

- 9-1 evidence remains documented in `9-1-VERIFICATION.md`.
- Acceptance status is corrected to NOT ACCEPTED; closure now depends on Plan 9-HF2 hard gates.

## Plan 9-HF1 Closure Note

- Hard reduction gate achieved: `src/app.js` reduced from 12163 to 28 lines.
- Mandatory extraction artifacts are documented in `9-HF1-BOUNDARY-MAP.md` and `9-HF1-VERIFICATION.md`.

## Plan 9-HF2 Closure Target

- Closure requires explicit PASS evidence for no-replay expired one-shot behavior and low-end stability hardening.

## Plan 9-HF2 Gate Result

- G1..G5 are PASS.
- Evidence artifacts:
  - `.planning/phases/phase-09/P9-HF2-T6-SYNC-INVARIANTS.md`
  - `.planning/phases/phase-09/P9-HF2-T7-LONG-RUN-SOAK.md`
  - `.planning/phases/phase-09/P9-HF2-T8-LOW-END-STRESS.md`
