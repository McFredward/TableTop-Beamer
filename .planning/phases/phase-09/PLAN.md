# Phase 9 Plan (HF4 reliability stabilization wave)

## Acceptance correction and reopen context
- Plan 9-1 remains executed but not accepted.
- Plan 9-HF1 remains valid as modular foundation.
- Plan 9-HF2 remains valid as lifecycle/no-replay baseline.
- Plan 9-HF3 execution exists, but closure is revoked due to critical regressions reported in real runtime.
- New mandatory execution wave is Plan 9-HF4 (P0 stabilization, reliability-first, simplification-first).

## Mandatory P0 feedback (binding)
1. Recover core functionality first: reliable start/stop, board switching, and `/output/final` loading.
2. Re-evaluate and remove destabilizing runtime complexity; keep only mechanisms required for low-end smoothness.
3. Enforce clean startup invariants: no phantom running entries and no duplicate outside runs.
4. Keep deterministic server-authoritative sync and mobile->pi reliability as primary goal.
5. Add fail-safe feature flags/profile levels so aggressive optimization can be disabled safely.
6. Provide explicit FAIL->PASS reproduction and runtime smoke evidence for core user journeys.

## Target state
Phase 9 closes only when runtime behavior is boringly reliable under normal and stressed operation: starts and stops are deterministic, board switch updates image plus polygons atomically on all clients, `/output/final` boots and renders reliably, startup is clean, and sync remains server-authoritative across mobile/PC/pi. Performance tuning remains subordinate to correctness and only uses simplified, testable paths.

## Binding architecture decisions (HF4)
- Establish one canonical runtime control path for start/stop/apply; remove or gate parallel scheduling paths.
- Keep scheduler complexity minimal: retain only low-end safeguards that demonstrate measurable benefit.
- Make startup idempotent with explicit invariant checks before first render and before first sync apply.
- Make board switch an atomic context transaction (board image, polygons, running-state cleanup, and final-output refresh in one deterministic sequence).
- Make `/output/final` load resilient: guarded bootstrap, retry-safe attach, deterministic fallback state.
- Preserve server-authoritative sync contract (ordering/version/idempotent apply) as non-negotiable.
- Introduce feature-flagged runtime profiles: `safe`, `balanced`, `aggressive`; default to `safe` on weak devices until aggressive path is proven.

## Scope (Plan 9-HF4)
- Restore deterministic start/stop lifecycle under repeated trigger/edit/stop cycles.
- Fix startup hydration to prevent phantom running entries and duplicate outside runs.
- Fix board switch parity so board image and polygons always switch together.
- Fix `/output/final` load reliability and reconnect behavior.
- Simplify runtime scheduling by removing destabilizing branches and preserving only necessary low-end guards.
- Add runtime profile flags and hard kill-switches for aggressive optimizations.
- Run explicit FAIL->PASS reproductions plus smoke matrix on mobile, PC controller, and Raspberry Pi output.

## Out of scope
- New user-facing feature additions.
- Further optimization experiments before core reliability gates are PASS.
- Protocol redesign beyond what is required for deterministic authoritative sync.

## Prioritized next execution wave (Plan 9-HF4, execute-ready, hard-gated)
1. Capture reproducible FAIL baselines for each critical regression (start/stop, startup duplicates, board switch, `/output/final` load).
2. Introduce runtime simplification patch set: disable/remove non-essential scheduler branches and unify start/stop path.
3. Enforce startup invariants and idempotent hydration guards.
4. Implement atomic board-context switch pipeline with mandatory image+polygon parity checks.
5. Harden `/output/final` bootstrap/load/reconnect path.
6. Add feature flags/profile levels with safe default and runtime override.
7. Validate deterministic sync invariants and mobile->pi propagation under the simplified runtime.
8. Execute FAIL->PASS verification set plus runtime smoke journeys; publish evidence artifacts.
9. Synchronize all planning artifacts (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Milestones
1. M1 Regression reproduction baseline captured (FAIL state is deterministic and documented).
2. M2 Core control recovery (start/stop and startup invariants pass).
3. M3 Context parity recovery (board switch image+polygon parity pass across clients).
4. M4 Final output reliability recovery (`/output/final` load/reconnect pass).
5. M5 Simplification and profile safety (`safe/balanced/aggressive` flags operational, safe default enforced).
6. M6 Determinism preservation (server-authoritative sync and stop semantics remain PASS).
7. M7 Evidence closure (FAIL->PASS and smoke matrix fully PASS, artifacts synchronized).

## Definition of done
- Start/stop is first-action deterministic across repeated cycles (no lost start, no missed stop).
- Startup has zero phantom running entries and zero duplicate outside runs.
- Board switch updates board image and polygons together, with no split-brain visuals.
- `/output/final` loads and resumes reliably after reload/reconnect.
- Simplified runtime path is the default stable path; aggressive path is optional and safely disableable.
- Server-authoritative sync determinism and mobile->pi reliability remain PASS.
- FAIL->PASS reproductions and runtime smoke evidence are documented and reproducible.

## Execution status
- Plan 9-HF4 implementation is completed with reliability-first runtime guards, profile toggles, and FAIL->PASS artifacts.
