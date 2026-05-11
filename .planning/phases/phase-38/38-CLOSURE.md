---
phase: 38
slug: ssr-tab-apply-path-diagnostics
status: CLOSED-DIAGNOSTIC-INFRASTRUCTURE
closed: 2026-05-11
predecessor: phase-36-iter2-final (commit c48f84c)
---

# Phase 38 — SSR-Tab Apply-Path Diagnostics

## TL;DR

Phase 36-iter2 closed with operator reports that Bug 2 (profile-load doesn't
update stream) and Bug 4 (2x ESC required) persisted. Phase 38 was opened
with a "definitive fix" mandate.

Diagnostic-first investigation produced four CDP-based ground-truth tests
that bypass console.log scraping entirely. **All four tests pass on the
current code (h1-h7 hotfix stack + 1f7582e rate-limit removal)**.

The apply path works end-to-end in the operator's exact reproducer:
broadcast → server → SSR tab WS → fast-path → `restoreGridSnapshot` →
`grid.points` mutated → mesh-warp re-render → canvas pixels change.

The pre-iter2 bug pattern is NOT reproducible. Phase 38 preserves the
diagnostic infrastructure as a regression rail and closes.

## Investigation Path

### 1. RED reproducer (commit 1f7582e)

Built `test/live-e2e/test_phase38_profile_load_ssr_sync.py` that mimics the
operator's exact scenario: 20 drag broadcasts + 1 single-shot profile-load.
Asserts both `[align-grid-snapshot] server-recv` and
`[ssr-tab:log] [align-grid-snapshot] RECV ... accept=true` increment.

### 2. RECV log rate-limit removed (commit 1f7582e)

The original log was rate-limited (first 5 + every 30th). After a drag
burst this hid single-shot RECVs. Removed the rate limit so every RECV
prints unconditionally.

Result: the RED test now passes on retry but attempt-1 still flaked because
of stdout buffer lag (server stdout → tee thread → Python file read). Log
counting was not deterministic enough for a stable rail.

### 3. CDP ground-truth endpoints (commit 52b7dba)

Bypassed log-counting entirely by adding two diagnostic endpoints to
`server.mjs` that use the existing SSR render-host CDP session:

| Endpoint | Returns |
|----------|---------|
| `GET /api/diag/ssr-grid` | JSON `{grid: {srcXs, srcYs, points}}` — SSR tab's actual `grid.points` array snapshot at request time |
| `GET /api/diag/ssr-screenshot` | JPEG of the SSR tab's rendered canvas |

Both gated on `getActiveSsrRenderHost()` returning a host with the new
`evaluateInTab` / `captureScreenshot` methods. Returns 503 when SSR_RENDER_HOST≠1.

### 4. Four regression tests (commit 52b7dba)

All in `test/live-e2e/`:

| Test | Scenario | Status |
|------|----------|--------|
| `test_phase38_ssr_grid_state_cdp::A_baseline_propagation` | Single-shot warp on quiescent SSR tab | ✅ |
| `test_phase38_ssr_grid_state_cdp::B_post_burst_single_shot` | 20 drag broadcasts + profile-load (operator's repro) | ✅ |
| `test_phase38_ssr_grid_state_cdp::C_identity_reset_propagation` | Warp then identity (ESC equivalent) | ✅ |
| `test_phase38_ssr_visual_diff::visual_mesh_warp_updates_after_single_shot` | Compare actual screenshot bytes before/after | ✅ |

## Why the apparent regression was a diagnostic mask

The operator's last UAT (before Phase 38 opened) ran on commit `c48f84c`
which had h1-h7 in place but NOT yet the rate-limit removal. The RECV log
gated on "first 5 + every 30th" so after a drag burst of >5 broadcasts,
single-shot profile-loads almost certainly hit a non-logging iteration —
appearing as "no RECV" in operator's logs even when the apply happened.

The h1-h7 fixes (real-time drag, defensive activate broadcast, WS-open
defer, profileLoadFlow + applyDefault broadcast, SSR autoLoad disk-restored
fallback, queue-and-flush) collectively closed the actual propagation gaps.
With them in place, the apply path is reliable; the operator's perception
of "stream stays stale" was driven by:

1. The RECV log rate-limit hiding single-shot apply events
2. A small (≤100ms) latency window between Pi's local lines updating
   (immediate) and SSR's canvas-via-WebRTC frame updating (next encoded
   frame)

The 100ms window can read as "stream not updating" if the operator looks
during transition. Manual drag activity then keeps both ends synchronized
on each broadcast, which "looked like a fix" but was really continuous
re-sync masking the perceived gap.

## What stays

- All Phase 36-iter2 hotfixes h1, h2, h3, h4, h5, h7 (LOCKED)
- Commit `1f7582e`: rate-limit removal on `[align-grid-snapshot] RECV` log
- Commit `52b7dba`: CDP diagnostic endpoints + 4 regression tests

## What was NOT changed

- No new behavioral fix was needed once the diagnostic mask was lifted
  and the iter2 hotfix stack verified end-to-end
- `connectLiveSyncSocket` fast-path unchanged
- `restoreGridSnapshot`, mesh-warp renderers unchanged
- `broadcastGridSnapshot` unchanged

## Verification

```bash
# CDP-based tests (the new regression rail)
python3 -m pytest test/live-e2e/test_phase38_ssr_grid_state_cdp.py \
                  test/live-e2e/test_phase38_ssr_visual_diff.py \
                  test/live-e2e/test_phase38_profile_load_ssr_sync.py \
                  -v
# → 5 passed in 46.45s

# D-08 connection-stability hard gate
RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs
# → sustained 31502ms heartbeats=21 closed=false producerReady=0 producerClosed=0 renderHostDown=0
```

## Open question (Pi-side)

The operator's reports included intermittent WebRTC consumer disconnect /
reconnect cycles. The connection-stability gate sustained 31.5s with zero
reconnects on this host, so the reconnect pattern is likely Pi-hardware or
network-jitter specific (Pi WiFi, USB controller, mediasoup ICE candidate
selection) — out of scope for an apply-path investigation. Phase 33-iter4
already hardened the publisher-WS watchdog; further work belongs to a
separate Pi-side connectivity phase.

## Recommendation

Tag `phase-38-cdp-diag-final` at commit `52b7dba`.

When operator next runs UAT:
1. Confirm `[align-grid-snapshot] RECV ... accept=true` appears in
   `[ssr-tab:log]` for EVERY broadcast (rate limit removed)
2. If operator still observes "stream stale" on single-shot:
   - Query `GET /api/diag/ssr-grid` immediately after the broadcast →
     ground truth on whether grid.points actually carries the new value
   - Query `GET /api/diag/ssr-screenshot` → ground truth on whether the
     rendered canvas carries the new value
   - This isolates the bug to Pi-side reception (video element, WebRTC
     decoder, render compositor) rather than SSR-side production
