# P11-HF5-T2 Root-Cause Isolation

## Scope
- Compare the failing non-loop one-shot path across:
  1. command emission,
  2. server apply,
  3. snapshot/event fanout.

## Isolation Result
- **Primary failing branch:** command emission / local runtime start path.
- **Why:** non-control global start performs a local optimistic `state.runningAnimations.push(animation)` before distributed confirmation.
- **Observed risk:** initiator can appear correct while peers and `/output/final` still miss the one-shot event.

## Branch-by-Branch Findings

### 1) Command emission (failing branch)
- Source: `src/app/runtime/runtime-orchestration.js` in `upsertGlobalAnimation(...)` non-control branch.
- Behavior: one-shot starts locally first, then `emitLiveMutation("trigger-global", ...)` is fired.
- Consequence: local-only visual success can mask missing distributed synchronization.

### 2) Server apply (present, but must become stricter authoritative source)
- Source: `server.mjs` `applyGlobalMutationPatch(payload)`.
- Behavior: trigger-global mutations are applied into authoritative runtime snapshot.
- Gap identified for HF5 fix: server should own final fanout payload identity/timing for one-shot starts, not depend on client-optimistic success perception.

### 3) Snapshot/event fanout (present)
- Source: `server.mjs` mutation pipeline via `mutateLiveSession(...)`.
- Behavior: applied patches are persisted and broadcast to connected clients.
- Conclusion: fanout path exists; root-cause is upstream branch allowing local-only optimistic masking.

## HF5 Fix Target
1. Remove/guard local optimistic one-shot start path.
2. Enforce server-authored one-shot start payload for fanout.
3. Verify exactly-once parity across initiator + peer + `/output/final`.
