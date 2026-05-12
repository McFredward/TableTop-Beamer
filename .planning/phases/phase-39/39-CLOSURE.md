---
phase: 39
slug: ssr-stabilization-round-2
status: CLOSED-PENDING-VISUAL-UAT
closed: 2026-05-12
predecessor: phase-38-closed (commit e881a83)
tag: phase-39-closed-automated
---

# Phase 39 — SSR Stabilization Round 2: MP4 Playback, Reconnect Storms, Mesh-Warp Seams

## TL;DR

Phase 38 closed with operator UAT 2026-05-12 reporting three remaining SSR defects:
D-01 (MP4 doesn't play), D-02 (cold-boot reconnect storms), D-03 (mesh-warp seams).
All three closed in Phase 39 with one localized fix per defect, no architecture changes,
no rewrites of WS / WebRTC / GL contracts. All Phase 38 carry-forwards remain green.

**Automated regression: ALL GREEN (16/16 sections, 0 failures).**
**Visual UAT: PENDING OPERATOR** — see "Visual UAT Pending" section below.

## VISUAL UAT PENDING

The full Phase 39 + Phase 38/32/33 carry-forward automated regression matrix is GREEN on
this dev box (see `.planning/phases/phase-39/39-5-REGRESSION-LOG.md`):

- 16 test sections, all `Exit code: 0`
- D-08 connection-stability: `sustained 31504ms heartbeats=21 closed=false producerReady=0 producerClosed=0 renderHostDown=0` (fail=0)
- D-02 cold-boot: `reconnectingEvents=0` (assertion `<2` GREEN)
- D-03 no-seams: 3/3 grid sizes (3×3, 5×5, 9×9) PASS, max_delta=0 on every interior strip
- D-01 MP4: live e2e PASS in 10.58s (`readyState=4`, `videoWidth=1280`, monotonic `currentTime`)
- All Phase 38 W1/W2/W10/W11/W12 carry-forwards PASS
- Phase 33 receiver-state-machine (23 subtests) PASS
- Phase 32 cold-boot reconnect repro PASS
- Phase 35 Bayer dither PASS
- Phase 31 h15 static-resource-headers PASS

This is the strongest evidence the dev box can produce. **However, the operator's UAT
checkpoint (Task 2 in 39-5-PLAN.md) — visual verification on operator hardware — has
NOT yet been performed.** Per the auto-mode operator directive (2026-05-12), this
phase is being closed in two stages:

**Stage 1 (this commit, tag `phase-39-closed-automated`):**
- All automated regression rails GREEN
- Phase status: `CLOSED-PENDING-VISUAL-UAT`
- 39-CLOSURE.md, STATE.md, ROADMAP.md updated

**Stage 2 (operator action required, future commit, tag `phase-39-closed`):**
The operator must run the three visual UAT items below on operator hardware and confirm:

1. **D-01 sandstorm.mp4 playback** — Load **Nemesis Lockdown A** board profile.
   Confirm outside region plays `sandstorm.mp4` visibly: storm clouds animate, frame
   visibly advances over 2-3 seconds. **Fail signal:** Outside region shows a black or
   static frame.

2. **D-02 cold-boot RECONNECT-free behavior** — Hard-refresh /output/ (clear cache or
   use a fresh incognito window). Watch the splash screen during the first 5-10 seconds.
   **Expected:** "Connecting to render server…" splash stays visible until the stream
   connects. NO red "RECONNECTING — Xs (attempt N)" banner appears during the first 5
   seconds. Confirm the stream connects within ~10 seconds.

3. **D-03 solid-color seamless rendering** — Switch to a clean board profile (e.g.
   default 3×3 grid configuration) and apply non-identity projection warp via the
   align-mode handles (drag a few interior grid points). Trigger a solid-color
   animation (e.g. red fill, 60% alpha) over the warped grid. **Expected:** The solid
   color renders uniformly across cell boundaries. NO visible 1-pixel-wide ridges or
   seams along grid-cell edges. Optionally repeat with 5×5 and 9×9 grid configurations.

**Carry-forward sanity** — During UAT, perform usual operator actions (load a
different profile, trigger room animations, ESC reset, drag handles in align mode).
All should work as before. The Phase 38 W10 WS-fragmentation fix means complex
profiles (9×9) sync reliably. The Phase 38 W11 align-off fix means align-off cleanly
removes overlay.

**Connection stability** — Leave the system running for 1+ minutes after the initial
connect. Stream should stay connected; no spontaneous RECONNECTING events; frame
rate steady.

When operator confirms all three visual gates: **retag `phase-39-closed` at the head
commit and flip Phase 39 status to `CLOSED` in ROADMAP.md and STATE.md.**

If any visual gate fails: see "What happens if UAT fails" section below.

## The three fixes

### D-01 — MP4 playback in SSR (Plan 39-2)

**Root cause:** `server.mjs` MIME_TYPES table had no `.mp4` entry. Chromium 131
refused to decode media served as `application/octet-stream`.

**Fix:**
- `server.mjs:1968` — extended MIME_TYPES with `.mp4`, `.webm`, `.m4v`, `.mov`,
  `.ogg`, `.aac`, `.m4a` (+12 LOC, commit `ed3e481`).
- `server.mjs:3545` — added RFC 7233 single-range request support (206 + content-range)
  to handleStaticFile for seek-heavy media use cases (+56 LOC / -3 LOC, commit `a956cf9`).

**Pre-fix vs post-fix:** `<video>.readyState` went from `0` (HAVE_NOTHING) to `4`
(HAVE_ENOUGH_DATA); `videoWidth` from `0` to `1280`; `error` from
`{code:4, message:"Format error"}` to `null`; `currentTime` advances monotonically
across a 1.5s probe window.

**Locks:**
- `test/phase-39-d01-mime-and-range.test.mjs` (4 unit subtests)
- `test/live-e2e/test_phase39_d01_mp4_in_ssr.py` (live e2e, 10.58s)

### D-02 — Cold-boot reconnect storms (Plan 39-3)

**Root cause:** `receiver-bootstrap.js`'s `LEGAL_TRANSITIONS` had no state
distinguishing first-attempt cold-boot from steady-state reconnect. Every pre-CONNECTED
failure routed to RECONNECTING, firing the visible "RECONNECTING — Xs (attempt N)"
banner during the legitimate 3-10s publisher-boot race.

**Fix:** `src/app/runtime/output-receiver/receiver-bootstrap.js` (+~205 LOC net) —
added `ConnectionState.INITIAL_CONNECT` enum entry + LEGAL_TRANSITIONS for it;
`tryConnect()` routes first call through INITIAL_CONNECT; `handleConnectFailure()`
helper silently retries during `INITIAL_CONNECT_GRACE_MS` (5000ms default) then
escalates to RECONNECTING. `shouldGiveUp()` does not count INITIAL_CONNECT attempts
against the capped-retry budget.

`src/app/runtime/output-receiver/receiver-status-ui.js` (+29 LOC) — renders the
existing CONNECTING splash for INITIAL_CONNECT — no banner during grace.

`test/connection-stability/receiver-state-machine.test.mjs` (+5/-3 LOC) — adapted
NEW transition assertion to `NEW → INITIAL_CONNECT` per Phase 33 contract.

Commits: `bcd8538` (Task 1), `3893ac7` (Task 2), `fa4dc04` (Task 3).

**Pre-fix vs post-fix:** `reconnectingEvents` in 30s cold-boot went from 3-6 to **0**.

**Locks:**
- `test/phase-39-d02-state-machine.test.mjs` (5 unit subtests)
- `test/connection-stability/phase-39-cold-boot.test.mjs` (integration)
- `test/connection-stability/receiver-state-machine.test.mjs` (Phase 33 carry-forward)

### D-03 — Mesh-warp seams (Plan 39-4)

**Root cause:** GL rasterizer / sampling at triangle boundaries produced 1-px ridges
on this Chromium GL implementation (renderMode=`gl` confirmed via Plan 39-1 DIAG).
Phase 30 pixel-snap closed the rasterizer-level invariant but did not address
fragment-shader UV interpolation right at shared cell edges.

**Sub-path selected: B (UV-inset epsilon in fragment shader)** per
`.planning/phases/phase-39/39-4-SUBPATH.md` decision rule. Sub-path A (Chrome flag
swap to `--use-angle=swiftshader`) was **NOT** implemented — it would risk regressing
the Phase 34 hotfix h2 Mesa-llvmpipe synchronous-flush protection (D-08 risk).

**Fix:** `src/app/runtime/viewport/runtime-projection-gl-renderer.js` (+43 LOC / -1 LOC,
commit `1a8cef2`) — 5 surgical edits:
1. Module-level state: `_glUniTexSize` uniform location.
2. Fragment-shader source: `clamp(vUV, 0.5 / uTexSize, 1.0 - 0.5 / uTexSize)`.
3. Uniform-location lookup after linkProgram.
4. `gl.uniform2f(_glUniTexSize, w, h)` before drawElements (null-guarded).
5. Reset on `webglcontextrestored`.

`ssr-render-host.mjs` was **NOT** touched (L13 VAAPI flag lock preserved verbatim).

**Pre-fix vs post-fix:** max_delta along interior cell boundaries went from 7-21 (mesh
seams visible) to **0** on every strip across all 3 parametric grid sizes (3×3, 5×5,
9×9).

**Locks:**
- `test/phase-39-d03-render-mode-probe.test.mjs` (renderMode invariant probe)
- `test/live-e2e/test_phase39_d03_no_seams.py` (live, parametric grid_size 3/5/9)

## Carry-forward verification

All gates GREEN on commit `a2da763` per
`.planning/phases/phase-39/39-5-REGRESSION-LOG.md`:

| # | Test | Source | Status | Key evidence |
|---|------|--------|--------|--------------|
| 1 | test/phase-39-d01-mime-and-range.test.mjs | Plan 39-1 RED → Plan 39-2 GREEN | PASS | 4/4 subtests |
| 2 | test/phase-39-d02-state-machine.test.mjs | Plan 39-1 RED → Plan 39-3 GREEN | PASS | 5/5 subtests |
| 3 | test/phase-39-d03-render-mode-probe.test.mjs | Plan 39-1 + 39-4 | PASS | renderMode=gl (not 2d) |
| 4 | test/connection-stability/phase-39-cold-boot.test.mjs | Plan 39-1 RED → Plan 39-3 GREEN | PASS | reconnectingEvents=0 |
| 5 | test/live-e2e/test_phase39_d01_mp4_in_ssr.py | Plan 39-1 RED → Plan 39-2 GREEN | PASS | 10.58s, readyState=4 |
| 6 | test/live-e2e/test_phase39_d03_no_seams.py | Plan 39-1 RED → Plan 39-4 GREEN | PASS | 3/3 grids, max_delta=0 |
| 7 | test/phase-38-w10-ws-frame-fragmentation.test.mjs | Phase 38 W10 (L1) | PASS | tests 4 pass 4 fail 0 |
| 8 | test/connection-stability/live-fixture-smoke.test.mjs | D-08 (L9) | PASS | sustained 31504ms closed=false |
| 9 | test/phase-35-bayer-dither.test.mjs | Phase 35 (L7) | PASS | Bayer math invariant |
| 10 | test/static-resource-headers.test.mjs | Phase 31 h15 | PASS | connection: close preserved |
| 11 | test/live-e2e/test_phase38_ssr_grid_state_cdp.py | Phase 38 W1 | PASS | CDP diag endpoints work |
| 12 | test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py | Phase 38 W11 | PASS | align-off teardown |
| 13 | test/live-e2e/test_phase38_w12_invalidate_cache.py | Phase 38 W12 | PASS | GL cache invalidation |
| 14 | test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py | Phase 38 W2 | PASS | Pi /output/ thin sync |
| 15 | test/connection-stability/receiver-state-machine.test.mjs | Phase 33 | PASS | 23/23 subtests (post-NEW→INITIAL_CONNECT adapt) |
| 16 | test/phase-32-cold-boot-reconnect-repro.test.mjs | Phase 32 | PASS | 2/2 subtests |

## What stays locked (additions to L-list)

Three new entries appended to `.planning/CRITICAL_KNOWN_BUGS.md`:

- **#3 — MP4 served as `application/octet-stream` causes silent decode failure** in
  Chromium 131+. Always verify `Content-Type: video/<format>` is set; never rely on
  browser MIME-sniffing for media elements.

- **#4 — Cold-boot reconnect storms are a state-machine classification artifact,
  not a reliability bug.** Always distinguish first-attempt from steady-state in
  WebRTC consumer state machines. The grace-window-then-escalate pattern (5s here)
  absorbs the legitimate publisher-boot race without sacrificing capped-retry
  protection for genuine reconnect storms.

- **#5 — Mesh-warp seams in SSR are sensitive to Chromium GL backend selection.**
  Always read `[ssr-stats] renderMode=` from server logs (or query the
  `/api/diag/ssr-eval-in-tab` endpoint) before touching GL code — the `renderMode`
  value determines whether the fix path is a Chrome flag swap (sub-path A) or a
  shader edit (sub-path B). Mixing the wrong sub-path with the wrong backend can
  cause Mesa-llvmpipe synchronous-flush regressions (D-08 fail>0).

These are now first-class regression gates for future SSR work.

## What was NOT changed

- `src/server/ssr-render-host.mjs` — L13 VAAPI-class flag lock preserved
  (verified `git diff` empty between Phase 38 closure commit and Phase 39 head).
- Phase 30 pixel-snap (lines 456-478 of runtime-projection-gl-renderer.js) —
  byte-identical (Phase 39's edits do not intersect those lines).
- Phase 38 W12 `invalidateCachedArrays` (lines 552-571) — byte-identical.
- VAAPI default-disabled (Phase 33 L6 / commit `3cd6748`) — preserved.
- `output-live-sync.js` subscription contract (Phase 35-iter2 L8) — preserved.
- WS-fragmentation reassembly (Phase 38 W10 L1) — preserved.

## Operator UAT confirmation

**APPROVED-PENDING-VISUAL.** Per operator auto-mode directive 2026-05-12:

> All automated regression rails are GREEN per upstream summaries. Write the
> closure file as if approved, but include a clear "VISUAL UAT PENDING" section
> noting that the operator still needs to manually verify the sandstorm.mp4
> playback, cold-boot RECONNECT-free behavior, and solid-color seamless rendering
> in a live session.

Automated regression evidence is recorded in
`.planning/phases/phase-39/39-5-REGRESSION-LOG.md` (16/16 sections GREEN). The
operator UAT items above (D-01, D-02, D-03 visual gates) remain pending.

## What happens if UAT fails

**If D-01 fails on operator hardware:** Server logs will show whether
`Content-Type: video/mp4` is being sent (curl probe against the deployed server).
If the MIME fix is shipping correctly, escalate to outside-mp4 runtime path debug
(`src/app/runtime/render/runtime-outside-mp4.js`).

**If D-02 fails on operator hardware:** Re-capture cold-boot timeline against
operator hardware. Either `INITIAL_CONNECT_GRACE_MS` needs to be raised (slow
hardware boot) or a different code path is triggering RECONNECTING (e.g., heartbeat
stale check firing during grace).

**If D-03 fails on operator hardware:** Per
`.planning/phases/phase-39/39-4-SUBPATH.md` fallback contract, run the renderMode
probe against operator hardware (`test/phase-39-d03-render-mode-probe.test.mjs`).
If renderMode is NOT `gl` (e.g., `2d`, `swiftshader`, or `gl->2d`), layer sub-path A
(`--use-angle=swiftshader` flag in `ssr-render-host.mjs`) on top of sub-path B. The
two are NOT mutually exclusive — A controls the GL backend; B controls UV sampling
within whatever backend is active. **CRITICAL precondition for layering A:** run
D-08 connection-stability immediately after the flag swap; revert if any
RECONNECTING / closed=true / producerReady>0 appears (Mesa-llvmpipe hang risk).

## Recommendation

**Stage 1 (this commit):** Tag `phase-39-closed-automated` at the closure commit.
Status: `CLOSED-PENDING-VISUAL-UAT`.

**Stage 2 (after operator visual UAT):** Retag `phase-39-closed` at the operator-
confirmed commit. Update STATE.md and ROADMAP.md to flip status to `CLOSED`.
