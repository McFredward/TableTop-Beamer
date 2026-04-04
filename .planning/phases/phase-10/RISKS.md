# Phase 10 Risks

## R0d Cross-browser polygon hydration drift
- Risk: `inside`/`outside`/`playAreas` payload resolves differently across Chrome/Firefox and mobile-class runtimes.
- Impact: Critical.
- Mitigation: canonical schema normalization before apply/hydration and shared validation contract for all browsers.

## R0e Silent default override of persisted board polygons
- Risk: startup/reload or `apply global defaults` replaces valid board polygons with defaults without explicit operator intent.
- Impact: Critical.
- Mitigation: explicit precedence rules (persisted board polygons first), explicit fallback diagnostics, and regression guards.

## R0f Final-output clips against fallback rectangle
- Risk: `/output/final` hydration consumes non-canonical polygon fallback and effects render against default rectangle.
- Impact: Critical.
- Mitigation: final-output clip source must be canonical board polygons only, with fail-open guards for invalid-only cases.

## R0g Non-Chrome black screen despite valid polygons
- Risk: browser-specific hydration/render order causes black final frame outside Chrome when polygon data is valid.
- Impact: Critical.
- Mitigation: browser-neutral hydration sequencing and no-black guard when canonical polygon validity is true.

## R0h Imported-board regression from schema hardening
- Risk: canonicalization breaks existing/imported board payloads or future imports.
- Impact: Critical.
- Mitigation: legacy alias normalization, fixture-based import matrix, strict non-regression over save/reload/default-apply/final-output.

## R0i False-pass closure caused by non-executable diagnostics
- Risk: static checks or shallow smoke tests pass while lifecycle/browser-path regressions still fail in real usage.
- Impact: Critical.
- Mitigation: enforce executable assertions with deterministic pre-fix FAIL and post-fix PASS evidence for startup/load/apply-defaults/reload + final-output contract paths.

## R0j Canonical source drift between control and final-output
- Risk: control path and `/output/final` choose different polygon sources after board switch/defaults apply.
- Impact: Critical.
- Mitigation: shared canonical source resolver contract with executable source-selection assertions across control and final-output.

## R0k Runtime panel module not exposed deterministically
- Risk: `TT_BEAMER_RUNTIME_PANELS` is absent due to browser-dependent load-order/global exposure drift.
- Impact: Critical.
- Mitigation: explicit runtime module exposure contract with executable load-order diagnostics and deterministic binding guards.

## R0l Ownership checker false-positive on conditional unmount
- Risk: settings ownership validation flags missing controls that are intentionally unmounted (`#outside-mode`, `#outside-direction`).
- Impact: Critical.
- Mitigation: applicability-aware ownership checks (mounted+required only) plus transition diagnostics for conditional UI mount/unmount.

## R0m Ship-clip regression checker semantic drift
- Risk: checker accepts invalid ship polygons or rejects valid canonical/multi-play-area/legacy states.
- Impact: Critical.
- Mitigation: canonical+legacy validation contract with deterministic fixtures and Firefox/Chrome parity diagnostics.

## R0n Firefox/Chrome diagnostic parity gap
- Risk: same runtime scenario yields divergent verdicts across Firefox and Chrome.
- Impact: Critical.
- Mitigation: executable parity matrix with shared scenario harness and enforced cross-browser equal-result gate.

## R0o Final-output invalid-default fallback despite canonical polygons
- Risk: `/output/final` drops to invalid-default clip/render fallback while valid canonical polygon data exists.
- Impact: Critical.
- Mitigation: canonical-data-first resolver and explicit guard that blocks fallback when canonical validity is true.

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
- R0d/R0e/R0f/R0g/R0h mitigated in HF3 via canonical snapshot polygon hydration and executable diagnostics.
- R0i/R0j mitigated in HF3 via deterministic FAIL->PASS diagnostics and control/final canonical-source parity checks.
- R0k/R0l/R0m/R0n/R0o are mitigated in HF4 via executable diagnostics + root-cause fixes (`P10-HF4-T1..T10`).
