# P6-T81 Regression - HF11 Cluster Lifecycle + Board Context Determinism Matrix

Date: 2026-03-26
Scope: P6-T77 .. P6-T81

## Checks Executed

1. Syntax checks
   - `node --check src/app.js`
   - `node --check server.mjs`
   - Result: PASS

2. Cluster lifecycle hold-by-default parity
   - Cluster controllers and member room animations keep hold semantics without implicit prune cleanup.
   - Runtime prune no longer removes room members only because a transient cluster parent snapshot is not yet present.
   - Result: PASS

3. Cluster cleanup/edit/stop context isolation
   - Cluster edit now updates the existing cluster run context in place and reconciles members by `animation.id` / `parentClusterRunId`.
   - Member removals during cluster edit emit targeted stop mutations only for removed member IDs.
   - Room-stop updates parent cluster membership by member IDs (not broad room-id deletes).
   - Result: PASS

4. Board context sync determinism (ack/version/order/reconnect)
   - Live mutation deduplication is keyed by `mutationId` globally, so reconnect replay cannot re-apply already-processed context mutations under a new `clientId`.
   - Pending `context-update` queue is compacted to latest intent; replay drops stale context payloads older than current session version.
   - WebSocket socket-generation guards prevent stale close/error/message handlers from older sockets mutating live sync state after reconnect.
   - Result: PASS

## Combined HF11 Regression Matrix

| Scenario | Preconditions | Action | Expected | Result |
| --- | --- | --- | --- | --- |
| Cluster start lifecycle stability | Cluster target selected, hold defaults active | Start cluster run (`stagger off` and `stagger on`) | Cluster controller + members remain active (no instant disappear/overwrite) until explicit stop/clear-all | PASS |
| Cluster cleanup isolation | Active cluster run with concurrent room/global entries | Edit cluster parameters and room composition | Only same cluster run context mutates; foreign room/global instances remain intact | PASS |
| Cluster stop semantics | Active cluster run with N members | Stop from `CLUSTER` running row | Cluster entry + linked member IDs stop together deterministically | PASS |
| Board switch first-toggle propagation | >=2 control clients + `/output/final` connected | Toggle board once in Settings | Selected board/layout propagates on first toggle across all clients | PASS |
| Reconnect in-flight replay ordering | One client disconnects/reconnects with pending mutations | Reconnect and replay pending queue | Stale context replay is dropped, latest context intent remains authoritative, no double-apply drift | PASS |
| Ack/version/order guard | Rapid context toggles and mixed mutation bursts | Observe live ack/session update flow | Monotone versioning + mutation-id dedup keep deterministic last-write state | PASS |

## Final Result

HF11 regression matrix is PASS: cluster lifecycle and cleanup/edit/stop semantics are now run-context isolated and hold-stable, while board context sync is deterministic under first-toggle propagation, reconnect replay, mutation ack/version ordering, and multi-client `/output/final` parity.
