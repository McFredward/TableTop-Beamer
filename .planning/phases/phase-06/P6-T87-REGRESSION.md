# P6-T87 Regression - HF12 Cluster Deterministic Controller Matrix

Date: 2026-03-26  
Scope: P6-T83 .. P6-T87

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check server.mjs`
   - Result: PASS

2. Running single-entry determinism (`CLUSTER` only)
   - Running list now projects active runs via a canonical list view that hides linked member `ROOM` rows whenever a cluster controller run exists.
   - Cluster rows remain explicitly labeled as `CLUSTER` and keep deterministic tie-break ordering.
   - Result: PASS

3. Full-member runtime effect with deduped controller
   - Cluster controller draw path now renders member room effects directly from the cluster run context.
   - Runtime fallback uses persisted member room IDs/start delays so cluster effects remain visible even if member ROOM rows are temporarily absent in a sync snapshot.
   - Result: PASS

4. Cluster stop/edit propagation
   - Cluster member resolution now merges direct `memberAnimationIds` with linked `parentClusterRunId` entries.
   - Stop/Edit on `CLUSTER` therefore propagates deterministically across all active linked members in the same run context.
   - Result: PASS

5. Room-target non-regression
   - Evidence tracked separately in `P6-T86-ROOM-TARGET-REGRESSION.md`.
   - `targetType=room` remains unchanged for start/edit/stop semantics.
   - Result: PASS

## Combined HF12 Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Cluster start (`stagger off`) | Valid cluster target with N rooms | Start room animation on cluster target | Running list shows one `CLUSTER` row; all N rooms animate | PASS |
| Cluster start (`stagger on`) | Valid cluster target with N rooms + stagger enabled | Start room animation on cluster target | Running list still shows one `CLUSTER` row; staggered visual fanout hits all N rooms | PASS |
| Cluster edit in place | Existing active cluster run | Edit via `CLUSTER` row + apply | Same cluster `animation.id` updates in place and members reconcile deterministically | PASS |
| Cluster stop | Existing active cluster run with linked members | Stop from `CLUSTER` row | Cluster controller + all linked members stop together | PASS |
| Room target control | `targetType=room` selected | Start/edit/stop room run | Single-room flow remains unchanged; no forced cluster controller path | PASS |

## Final Result

HF12 regression matrix is PASS: running list deterministically exposes a single `CLUSTER` controller entry per cluster trigger while runtime fanout, cluster stop/edit propagation, and room-target behavior remain stable.
