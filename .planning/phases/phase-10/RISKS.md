# Phase 10 Risks

## R0 Board-specific final-output blackout recurrence
- Risk: board/media-specific branch (`Nemesis Lockdown A` + outside mp4) short-circuits final render path to black.
- Impact: Critical.
- Mitigation: enforce single guarded composition lifecycle for all boards; outside readiness must fail-open and never abort full-frame render.

## R0b Room/outside co-render starvation on final output
- Risk: when outside mp4 path is active, room layer or outside layer starves and neither is presented in final composite.
- Impact: Critical.
- Mitigation: explicit co-render invariants and per-layer fallback guards with all-board regression matrix coverage.

## R0c Hotfix regresses sync/control semantics
- Risk: blackout fix changes stop/clear/global behavior or ordering/version/idempotent apply.
- Impact: Critical.
- Mitigation: hard non-regression gate for sync/control semantics as mandatory HF1 closure criteria.

## R1 Mode confusion under pressure
- Risk: operator does not notice active quick mode and performs unintended actions.
- Impact: Critical.
- Mitigation: persistent mode badge, color-coded tool state, one-tap cancel, and optional auto-timeout guard.

## R2 Activation/deactivation race on rapid taps
- Risk: burst room taps create duplicate apply/stop commands or stale action order.
- Impact: Critical.
- Mitigation: idempotent command keys per room+mode+animation and inflight dedup guards.

## R3 Clear mode causes unintended broad removals
- Risk: clear action leaks beyond clicked room.
- Impact: Critical.
- Mitigation: strict room-scoped command routing and explicit target assertions in tests.

## R4 Settings sub-tab migration breaks discoverability
- Risk: operators cannot quickly locate controls after re-grouping.
- Impact: High.
- Mitigation: domain-named tabs, clear labels, and preserved control ordering inside each tab.

## R5 Mobile one-hand ergonomics regress desktop clarity
- Risk: mobile optimizations introduce visual clutter or degraded desktop speed.
- Impact: High.
- Mitigation: responsive layout split with role-specific breakpoints and platform-focused interaction rules.

## R6 Mode-state drift between UI and runtime state
- Risk: UI shows one mode while runtime handles another due to async timing.
- Impact: Critical.
- Mitigation: single source of truth for mode state + snapshot-driven reconciliation and status echo.

## R7 Sync determinism regression under rapid sequential clicks
- Risk: cross-client divergence appears only in burst workflows.
- Impact: Critical.
- Mitigation: dedicated burst matrix with ordering/version/idempotent assertions across client roles.

## R8 Artifact drift while preparing multi-file planning wave
- Risk: phase files and global trackers are not aligned.
- Impact: High.
- Mitigation: hard closure task for full artifact sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Mitigation Status Update
- R0 mitigated in HF1: final compositor clip guards now fail-open on invalid/degenerate polygon inputs.
- R0b mitigated in HF1: room/outside layer clipping edge-cases no longer fail-close to black-frame collapse.
- R0c mitigated in HF1: sync/control semantics remained unchanged (see T4 non-regression artifact).
