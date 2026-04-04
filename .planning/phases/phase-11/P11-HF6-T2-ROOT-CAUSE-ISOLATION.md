# P11-HF6-T2 Root-Cause Isolation

## Scope
Isolate the cancellation branch under polling/hydration by partitioning:
1. command emission,
2. server authoritative apply,
3. client snapshot reconciliation.

## Isolation Result
- **Primary failing branch:** client polling/hydration snapshot reconciliation.
- **Why:** snapshot apply replaces local running state with snapshot-derived running entries without retaining already-started seen one-shot runs.
- **Impact:** a client can see trigger revision `r`, start local playback, then lose the run before full duration when a later snapshot omits that entry.

## Branch Findings

### 1) Command emission
- Status: not root-cause branch for HF6.
- Reason: HF5 removed local optimistic non-loop masking; control path waits for authoritative snapshot fanout.

### 2) Server apply
- Status: not root-cause branch for HF6.
- Reason: server still owns `triggerRevision` progression and `startedAtEpochMs` in authoritative payload.

### 3) Polling/hydration reconcile (failing branch)
- Status: root-cause branch.
- Reason: snapshot rehydrate path can overwrite active local one-shot state before local full-duration completion when no explicit stop/clear revision exists.

## HF6 Fix Target
1. Introduce seen-revision local one-shot retention contract (seen once -> local full duration exactly once).
2. Preserve active retained one-shot during snapshot apply unless explicit stop/clear revision supersedes.
3. Keep loop behavior unchanged and keep explicit stop/clear authority immediate.

## Evidence Artifact
- Script: `debug/p11-hf6-t2-root-cause-branch-isolation.mjs`
- Output: `debug/p11-hf6-t2-root-cause-branch-isolation-output.json`
