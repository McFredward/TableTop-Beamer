---
phase: phase-09
plan: 9-HF6
subsystem: api
tags: [stream-mode, live-sync, command-transport, acknowledgement, regression]
requires:
  - phase: phase-09
    provides: HF5 visual-only stream contract and HF4 stream/control decoupling baseline
provides:
  - Deterministic repro + root-cause closure for stream-mode command drop/no-op
  - Control-critical start/stop transport prioritization
  - Strict ack enforcement with retry on non-applied acknowledgements
  - Stream on/off multi-client start-stop parity evidence
  - HF5 visual-only stream purity non-regression evidence
affects: [phase-09-9-2, live-command-path, output-final-stream]
tech-stack:
  added: []
  patterns: [control-critical-queue-priority, strict-ack-validation, evidence-first-regression-matrix]
key-files:
  created:
    - debug/p9-hf6-t1-command-drop-repro.mjs
    - debug/p9-hf6-t3-transport-reliability.mjs
    - debug/p9-hf6-t4-apply-snapshot-stream.mjs
    - debug/p9-hf6-t5-immediate-ack-matrix.mjs
    - debug/p9-hf6-t6-start-stop-parity-matrix.mjs
    - .planning/phases/phase-09/9-HF6-VERIFICATION.md
  modified:
    - server.mjs
    - src/app/runtime/runtime-orchestration.js
    - .planning/phases/phase-09/TASKS.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
key-decisions:
  - "Treat start/stop families as control-critical queue traffic to prevent stream-mode drop/overflow no-op behavior."
  - "Reject non-applied command acknowledgements in client transport and retry control mutations immediately."
patterns-established:
  - "Transport reliability evidence always includes explicit pre-fix repro plus post-fix parity matrix."
  - "Ack acceptance is not enough; applied/overflow/timeout flags are part of command success contract."
requirements-completed: []
duration: 9min
completed: 2026-04-02
---

# Phase 9 Plan HF6: Control Transport + Immediate Apply/Ack Recovery Summary

**Closed stream-mode start/stop no-op drops by prioritizing control transport, enforcing strict applied-ack semantics, and proving snapshot/stream propagation parity with HF5 purity preserved.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-02T22:54:32Z
- **Completed:** 2026-04-02T23:05:32Z
- **Tasks:** 8
- **Files modified:** 20+

## Accomplishments
- Built deterministic pre-fix command-drop repro and isolated the transport root cause under active stream mode.
- Fixed control command routing/ack handling so start/stop flows no longer silently no-op under stream pressure.
- Verified immediate apply + snapshot + stream version propagation and strict stream on/off multi-client parity.
- Re-ran HF5 visual-only stream purity matrix to prove no overlay regression.

## Task Commits

1. **Task 1: Pre-fix repro harness + traces** - `37eece7` (test)
2. **Task 2: Root-cause isolation** - `d0fd8ce` (test)
3. **Task 3: Transport priority fix** - `3134ede` (fix)
4. **Task 4: Apply/snapshot/stream immediacy verification** - `8eacca3` (test)
5. **Task 5: Immediate ack semantics enforcement** - `2da018e` (fix)
6. **Task 6: Strict stream on/off parity matrix** - `1836e40` (test)
7. **Task 7: HF5 purity non-regression matrix** - `d829d94` (test)
8. **Task 8: Artifact synchronization** - `9db7b0b` (docs)

## Files Created/Modified
- `server.mjs` - control-critical queue classification + extended HTTP command ack timeout window.
- `src/app/runtime/runtime-orchestration.js` - strict applied-ack validation and control-mutation retry path.
- `debug/p9-hf6-t*-*.mjs` - deterministic repro/fix regression harnesses for HF6 tasks.
- `.planning/phases/phase-09/P9-HF6-T*.md` - per-task verification evidence.
- `.planning/phases/phase-09/{PLAN,BACKLOG,TASKS,ACCEPTANCE,RISKS,EXECUTE}.md` - HF6 closure synchronization.

## Decisions Made
- Prioritized `trigger-room`/`trigger-global` command family as control-critical to remove overflow-drop path for start/stop transport.
- Elevated client command success criteria from HTTP-status-only to applied-ack contract (`applied=true`, no overflow/timeout/stale/duplicate).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed silent transport success on non-applied acknowledgements**
- **Found during:** Task 5
- **Issue:** Client treated `202` as success even when ack payload indicated non-applied command.
- **Fix:** Added strict ack validation + immediate retry for control mutations.
- **Files modified:** `src/app/runtime/runtime-orchestration.js`
- **Verification:** `debug/p9-hf6-t5-immediate-ack-matrix-output.json`
- **Committed in:** `2da018e`

**2. [Rule 2 - Missing Critical] Extended HTTP command ack timeout for high-pressure control batches**
- **Found during:** Task 5
- **Issue:** Short ack timeout produced false no-op perception under heavy accepted queues.
- **Fix:** Increased timeout window to keep accepted command acks deterministic.
- **Files modified:** `server.mjs`
- **Verification:** `debug/p9-hf6-t3-transport-reliability-output.json`
- **Committed in:** `2da018e`

---

**Total deviations:** 2 auto-fixed (1 Rule 1, 1 Rule 2)
**Impact on plan:** Both fixes were required to meet HF6 correctness requirements for transport and acknowledgement behavior.

## Issues Encountered
- Extremely high synthetic stress could trigger timeout artifacts before ack-timeout adjustment; resolved by aligning timeout with control reliability contract.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 9-HF6 hard gates are closed with evidence.
- Plan 9-2 is unblocked and ready as next hardening wave.

## Self-Check: PASSED

- FOUND: `.planning/phases/phase-09/9-HF6-SUMMARY.md`
- FOUND commits: `37eece7`, `d0fd8ce`, `3134ede`, `8eacca3`, `2da018e`, `1836e40`, `d829d94`, `9db7b0b`
