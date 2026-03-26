# P6-T66 Regression - HF8 Draft Persistence + Cluster UX Matrix

Date: 2026-03-26
Scope: P6-T61 .. P6-T66

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check src/app/state/runtime-state.js`
   - Result: PASS

2. Draft persistence hardening
   - Room/vertex/edge pointer selection no longer rewrites `roomDraft.targetType/targetId`.
   - Room panel sync now rebinds all draft parameters (`animation`, `opacity`, `playbackSpeed`, `intensity`, `speed`, `soundVolume`, `duration`) from state without implicit resets.
   - Result: PASS

3. Cluster UX + target flow
   - Cluster management supports create/update/delete with board-scoped persistence (`roomClusters` via board profiles).
   - Target dropdown refreshes after CRUD and supports room/cluster routing with stable fanout.
   - Result: PASS

4. Cluster stagger-start mode
   - New `roomDraft.staggerStart` toggle controls cluster fanout mode.
   - `off` starts cluster rooms synchronously (`startDelayMs = 0`); `on` applies short randomized per-room delay (`40..319ms`) while preserving single-room behavior.
   - Result: PASS

## Combined HF8 Regression Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Draft animation survives room switch | Room A selected, non-default room animation selected | Click Room B polygon | Animation dropdown keeps last selected draft animation | PASS |
| Draft parameters survive room switch | Room A selected with custom sliders | Click Room B polygon | Opacity/playback/intensity/speed/sound values stay unchanged | PASS |
| Target dropdown no default-jump | Target set to a cluster | Select another room via board overlay | Target remains on the chosen cluster | PASS |
| Draft survives post-start | Custom draft configured | Start room animation, then inspect panel | Draft values remain as next-start preset | PASS |
| Cluster CRUD create/update/delete | Settings view, room catalog available | Create cluster, edit name/room assignment, delete cluster | All operations succeed and persist through profile save path | PASS |
| Cluster target fanout | Cluster selected as target | Start room animation | One room animation instance starts per cluster room | PASS |
| Stagger off is synchronous | Cluster target, stagger unchecked | Start room animation | All cluster room instances start without offset | PASS |
| Stagger on is randomized short offset | Cluster target, stagger checked | Start room animation | All cluster room instances start with short randomized delays | PASS |
| Stagger guard for single-room start | Single room target selected | Toggle stagger and start | Single-room start remains immediate (no fanout delay logic) | PASS |
| Single-room click parity | Any board with clusters configured | Click room polygon | Click still selects only that room (no implicit cluster selection) | PASS |

## Final Result

HF8 regression matrix is PASS: room-animation draft state stays persistent across room/target navigation, cluster CRUD is complete and board-persistent, and cluster start semantics now support deterministic `sync`/`stagger` operation without regressing single-room selection behavior.
