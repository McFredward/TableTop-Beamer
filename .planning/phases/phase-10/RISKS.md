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

## R0p Multi-play-area resolver drift vs single-area path
- Risk: canonical resolver behaves differently for multi-play-area boards (disconnected areas) than for single-area boards and can show default play area/fallback hex.
- Impact: Critical.
- Mitigation: explicit multi-vs-single RED repros, shared resolver path, and deterministic fixture coverage for both board classes.

## R0q Firefox/mobile-class canonical apply mismatch
- Risk: Firefox or mobile-class Chrome applies persisted canonical play-areas differently than Chrome desktop during startup/reload/default-apply.
- Impact: Critical.
- Mitigation: Firefox headless automation diagnostics plus Chrome/mobile parity traces with equal-verdict gate.

## R0r Control-view and final-output source divergence
- Risk: control-view and `/output/final` resolve different play-area sources under the same board state.
- Impact: Critical.
- Mitigation: single shared canonical source resolver contract with executable parity assertions across both surfaces.

## R0s Imported/multi-area regression spillover
- Risk: fix for Lockdown A accidentally regresses imported boards or existing multi-area boards.
- Impact: Critical.
- Mitigation: mandatory imported + multi-area regression matrix (save/reload/default-apply/board-switch/final-output) before closure.

## R0t Browser-path area entry drop (subset retention failure)
- Risk: Firefox/mobile-class path drops one valid play-area entry from canonical set (e.g. `Bunker`) while Chrome retains full set.
- Impact: Critical.
- Mitigation: deterministic RED repro + merge-lineage diagnostics and explicit area-count/id-set parity assertions across browsers.

## R0u Non-deterministic canonical source merge precedence
- Risk: merge between `saved profile`, `defaults`, and `imported payload` is order- or shape-sensitive and loses valid multi-area entries.
- Impact: Critical.
- Mitigation: single deterministic merge contract with per-source lineage tracing and fixture coverage for partial/subset payloads.

## R0v Fallback replacement over valid multi-area subset
- Risk: default/fallback area replaces valid subset multi-area data instead of only filling truly missing/invalid geometry.
- Impact: Critical.
- Mitigation: explicit fallback guard rule plus failing tests for subset-preservation semantics.

## R0w Control/final play-area set divergence under same board state
- Risk: control-view and `/output/final` consume different canonical play-area sets even when board/context is identical.
- Impact: Critical.
- Mitigation: shared canonical set resolver plus executable control-vs-final set parity assertions.

## R0x Board-profile extraction/migration coupled to loaded board IDs
- Risk: board-profile candidate extraction and migration depend on currently loaded board catalog IDs; unknown keys are dropped before their board is loaded.
- Impact: Critical.
- Mitigation: extract candidates independent of loaded catalog IDs, retain unknown keys in migration, and enforce clean-start lifecycle retention tests for startup/default-apply/reload.

## R0y All-board canonical play-area load collapse to fallback polygon
- Risk: canonical saved board play-areas are ignored and all boards resolve to default fallback polygon.
- Impact: Critical.
- Mitigation: canonical-first resolver assertions for every board plus deterministic RED->GREEN recovery tests across startup/reload/default-apply.

## R0z `Load global defaults` fails board-specific play-area reapply
- Risk: applying global defaults restores generic fallback/default geometry instead of board-specific canonical play-areas.
- Impact: Critical.
- Mitigation: explicit defaults-reapply contract tests with per-board area-id-set assertions and regression matrix coverage.

## R0aa Silent fallback masks canonical load/apply failures
- Risk: canonical polygon load/apply failures are hidden by silent fallback behavior, leaving operator without actionable error context.
- Impact: Critical.
- Mitigation: mandatory user-visible toast/status error surface with board/source context and dedicated no-silent-fallback regression gates.

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
- R0p/R0q/R0r/R0s were provisionally mitigated in HF5 but are reopened by concrete field repro; closure is reassigned to HF6.
- R0t/R0u/R0v/R0w are mitigated in HF6 via deterministic RED->GREEN evidence (area-drop repro, merge-lineage diagnostics, fallback-guard fix, browser/surface parity matrix).
- R0x was mitigated in HF7 evidence, but HF8 follow-up is now mandatory because new all-board canonical-load/defaults-reapply regression reopened fallback behavior risk at runtime.
- R0y/R0z/R0aa are mitigated in HF8 via canonical-load/defaults-reapply recovery, explicit error surfacing, and all-board lifecycle/browser matrix PASS (`P10-HF8-T1..T10`).
