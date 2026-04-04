# Phase 11 Backlog (Mandatory HF2 Recovery Package)

## Epics
- Global Animation Runtime Recovery (rollback/fix) [P0]
- Dashboard Per-Trigger Global Loop Toggle [P0]
- Stop/Clear Lifecycle Non-Regression [P0]
- Cross-Client Global Start/Stop Evidence Closure [P0]
- Planning Artifact Synchronization [P0]

## Story Mapping
- P11-HF2-S1 Reproduce critical regression: global animations no longer start/run reliably after HF1.
- P11-HF2-S2 Apply rollback-first recovery patch to restore global animation runtime behavior immediately.
- P11-HF2-S3 Add quick checkbox in Dashboard global controls: `Loop until stopped` per trigger action.
- P11-HF2-S4 Ensure trigger-time loop selection controls runtime lifecycle without editing animation definitions.
- P11-HF2-S5 Preserve existing explicit `stop` and `clear` semantics for all global modes (one-shot + looping).
- P11-HF2-S6 Execute strict regression matrix for global start/stop/clear parity across control + `/output/final` + peers.
- P11-HF2-S7 Capture FAIL->PASS evidence proving global animations start/stop correctly again.
- P11-HF2-S8 Synchronize phase and global planning trackers.

## Prioritized Execution Wave (P0) - Plan 11-HF2 (execute-ready now)
- Story P11-HF2-S1 + P11-HF2-S2.
  - Goal: immediate rollback/recovery closes broken global runtime behavior.
- Story P11-HF2-S3 + P11-HF2-S4.
  - Goal: dashboard global controls support per-trigger loop choice without touching definitions.
- Story P11-HF2-S5.
  - Goal: stop/clear behavior remains deterministic and unchanged.
- Story P11-HF2-S6 + P11-HF2-S7.
  - Goal: FAIL->PASS evidence confirms restored global start/stop behavior across clients/final.
- Story P11-HF2-S8.
  - Goal: full planning artifact sync closure.

## Follow-up Waves
- Plan 11-2: post-HF2 UX polish and optional operator ergonomics refinements.
- Plan 11-3: optional presets/macros after HF2 stability confirmation.
