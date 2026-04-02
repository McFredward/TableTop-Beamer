# P9-HF2-T6 Deterministic Sync Invariants

- Date: 2026-04-02T20:01:59Z
- Scope: Validate that the HF2 runtime hardening path does not alter sync ordering/version/idempotent apply semantics.

## Harness

- Script: `debug/p9-hf2-sync-invariants.mjs`
- Command: `node debug/p9-hf2-sync-invariants.mjs`

## Result

`PASS` (5/5 cases)

Validated cases:

1. Accept monotonic server version (`version=121` > `lastApplied=120`)
2. Reject stale server version (`version=119` <= `lastApplied=120`)
3. Reject duplicate mutation id (`mutationId` already applied)
4. Use envelope version as authoritative gate (`serverVersion=120` rejects despite payload `version=140`)
5. Reject missing/zero envelope version against monotonic gate (`serverVersion=null -> 0`)

## Conclusion

HF2 visual hardening changes remain render-path-only. Mutation accept/apply gates keep monotonic versioning and idempotent mutation semantics intact.
