# P7-HF10-T1 Root-Cause Reproduction (`start command ignored/overwritten`)

## Reproduction scope

- Path: `dispatch -> server apply -> snapshot apply`
- Targets: `room`, `global-inside`, `cluster`
- Symptom: command ACK is `applied=true`, but running entry is not present in snapshot runtime.

## FAIL timeline (before fix)

Source artifact: `debug/p7-hf10-t1-fail-output.json`

1. `trigger-room` accepted (`version=40`, `applied=true`)
2. `trigger-global` (`intruder-alert`) accepted (`version=41`, `applied=true`)
3. `trigger-room` (`scope=cluster`) accepted (`version=42`, `applied=true`)
4. Snapshot after accepted commands:
   - `snapshot.selectedBoard = null`
   - `snapshot.runtime.runningAnimations = []`
   - `snapshot.runtime.globalTriggerRevisions` increments are visible
   - `outsideFxByBoard.nemesis-board-a.enabled = true` (outside survives)

## Root cause

The server snapshot sanitizer hard-filters `runtime.runningAnimations` by board context.

When `selectedBoard` is `null`, sanitizer currently resolves no board context and drops all running entries.

So starts are accepted and committed, but immediately sanitized away in persisted/broadcast snapshot state.

This explains the real symptom:

- `room`/`global-inside`/`cluster` appear to start briefly (ACK + revision drift) but are not stable in running snapshot.
- `global-outside` appears to still work because `outsideFxByBoard` is independent of `runningAnimations` list membership.

## Fix strategy for HF10

1. Dispatch hardening: start commands always carry deterministic board context metadata.
2. Server apply hardening: start mutations project authoritative board context into snapshot patch.
3. Snapshot sanitization hardening: infer board context from runtime patch if top-level board fields are missing.
4. Client snapshot apply hardening: only apply board switch from valid incoming board context (no null/drift overwrite).
5. Status arbitration: context status (`board switched`) must not neutralize active/pending lifecycle feedback.

## PASS confirmation (same reproduction after fix)

Source artifact: `debug/p7-hf10-t1-pass-output.json`

- Same start commands are accepted.
- Snapshot now carries authoritative board context (`selectedBoard = nemesis-board-a`).
- `runtime.runningAnimations` contains the started `room` + `global-inside` + `cluster` entries.
