---
phase: 36
slug: comprehensive-alignmode-thin-output
status: CLOSED-PARTIAL-ITER2-HANDOFF-TO-PHASE-38
closed: 2026-05-11
supersedes: 36-CLOSURE-ITER2-ADDENDUM.md
---

# Phase 36 — Final Iter2 Closure (Handoff to Phase 38)

## TL;DR

Phase 36-iter2 produced 7 hotfixes (h1-h7) attempting to fix two operator-reported
bugs after the auto-advanced Phase 36 close:

| # | Bug | Status |
|---|---|---|
| 1 | Real-time stream updates during drag | ✅ FIXED (h1) |
| 2 | Profile load doesn't update stream until small drag | ❌ NOT FIXED — handed off to Phase 38 |
| 3 | Connection failures at server start | ✅ Mostly resolved (h5 + acceptable warmup) |
| 4 | Stream sync requires 2x ESC instead of 1x | ❌ NOT FIXED — handed off to Phase 38 |

Bug 2 and Bug 4 are SAME root-cause class: single-shot grid-state mutations
(profile-load, single ESC, etc.) sometimes don't reach the SSR Chromium tab's
mesh-warp render. Drag operations (rapid stream of broadcasts) always reach.

## Iter2 Hotfix Stack

| h | Commit | Intent | Outcome |
|---|---|---|---|
| h1 | `48888af` | Real-time drag (remove fromMove gate) | ✅ Fixed Bug 1 |
| h2 | `7e9aa3a` | Defensive grid-resync broadcast on activate | ✅ Helps some cases |
| h3 | `0c58142` | h2 waits for WS OPEN | ✅ Helps initial connect |
| h4 | `f14cfa2` | profileLoadFlow + applyDefault now broadcast | ✅ Closed one gap |
| h5 | `c047cca` | SSR tab autoLoad uses disk-restored grid fallback | ✅ Fixed boot stream |
| h6 | `259d76b` | Permanent onConnect broadcast (broadcast storm) | ❌ Reverted in h7 |
| h7 | `c48f84c` | Queue-and-flush in output-live-sync | ✅ Survives WS close-handshake |

## Root Cause Analysis (where iter2 stops)

Server log evidence (2026-05-11 operator UAT, profile load attempt):

```
[align-grid-snapshot] server-recv from=final-output/... corners=TL(...)..BR(...) profile=xrandrv2
[align-grid-snapshot] server-recv from=final-output/... profile=xrandrv2 (×2)
                          ↑ SERVER receives the xrandrv2 broadcast
... no [ssr-tab:log] [align-grid-snapshot] RECV for xrandrv2 ...
```

When a profile is loaded:
- /output/ broadcasts grid → server receives ✓
- Server stores → fans out to all subscribers via WS ✓
- SSR Chromium tab's WS should receive → fast-path apply should fire
- Operator observation: stream stays at old profile until manual drag forces another broadcast

**Where Phase 38 must dig:**
1. Is the SSR tab's WS actually receiving the live-mutation envelope?
2. Is the fast-path matcher rejecting the envelope (payload.type mismatch, role gate, etc.)?
3. Is restoreGridSnapshot being called but the canvas mesh-warp not re-rendering?
4. Why do drag broadcasts (many) eventually reach SSR tab apply but single profile-load
   broadcast doesn't?

Additional observation from this session: after WebRTC consumer disconnect/reconnect
cycles, the `[ssr-tab:log]` CDP relay entries STOP appearing in server stdout, even
though the SSR tab process is presumably still running and the WebRTC stream still
encodes. This suggests SSR tab's CDP console forwarding may be unstable — making
log-based diagnosis unreliable.

## What stays from Phase 36-iter2

All h1, h2, h3, h4, h5, h7 fixes stay. They each closed a real defect even if
they didn't fully fix Bug 2.

## Handoff to Phase 38

Phase 38 scope: definitively fix Bug 2 (profile-load stream sync) and Bug 4
(2x ESC required for reset) via:
1. Playwright-based reproducer that diagnoses precisely WHERE in the propagation
   chain broadcasts get dropped.
2. SSR tab introspection (via CDP, direct grid.points read, or new diagnostic
   endpoint).
3. Definitive fix at the actual breakage point.

Phase 36 status: CLOSED-PARTIAL. Tag `phase-36-iter2-final`. Phase 38 owns the
remaining work.

## Tag

Recommendation: tag `phase-36-iter2-final` at commit `c48f84c`.
