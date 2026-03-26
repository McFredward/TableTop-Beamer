# P6-T76 Regression - HF10 Cluster Fanout + Running Scope Matrix

Date: 2026-03-26
Scope: P6-T72 .. P6-T76

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check src/app/state/runtime-state.js`
   - Result: PASS

2. Cluster fanout completeness
   - Cluster start no longer stays in room-edit path; cluster launches always execute full member dispatch.
   - Dispatch is member-complete for every valid `roomId` in the cluster target.
   - Result: PASS

3. Sync/stagger parity
   - Cluster launch dispatch uses a unified per-member plan.
   - `stagger start = off` sets `startDelayMs = 0` for every member.
   - `stagger start = on` applies short randomized per-member delays for every member.
   - Result: PASS

4. Running model/list CLUSTER scope
   - Cluster starts now create a dedicated runtime entry with `scope = "cluster"` plus member links (`memberAnimationIds`, `parentClusterRunId`).
   - Running list renders `CLUSTER` badge and dedicated scope color class `.running-scope-badge-cluster`.
   - Result: PASS

5. Cluster stop/edit semantics
   - Stop on `CLUSTER` entry stops linked member animations consistently.
   - Edit on `CLUSTER` entry loads cluster context into the draft editor and preserves cluster target semantics.
   - Result: PASS

## Combined HF10 Regression Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Cluster fanout all-members (sync) | Cluster target selected, `stagger start = off` | Start room animation | One member runtime instance per cluster room, all started without delay | PASS |
| Cluster fanout all-members (stagger) | Cluster target selected, `stagger start = on` | Start room animation | One member runtime instance per cluster room, each with short randomized delay | PASS |
| Dedicated CLUSTER running scope | Cluster start executed | Open Running list | Dedicated `CLUSTER` scope row present with distinct badge color | PASS |
| Cluster stop consistency | Active cluster run with linked members | Click Stop on CLUSTER row | Cluster controller and linked member instances stop together | PASS |
| Cluster edit consistency | Active cluster run | Click Edit on CLUSTER row, then update | Cluster context reloads into draft editor and updates remain cluster-scoped | PASS |
| Guard non-regression | Existing room/global actions active | Run cluster start/stop/edit flows | Room/global controls continue to behave unchanged | PASS |

## Final Result

HF10 regression matrix is PASS: cluster launches now fan out to all members for sync and stagger modes, running model/rendering includes dedicated `CLUSTER` scope entries with distinct color, and cluster stop/edit behavior is consistent across linked runtime members.
