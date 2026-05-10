# Phase 34 Track A — D-06 Hard Gate + D-05 Verification

**Date:** 2026-05-10
**Verified by:** 34-A executor (auto-chain mode; checkpoint:human-verify auto-approved)
**Status:** PASS (automated gate) / INCONCLUSIVE (D-05 visual smoketest — server not running)

---

## Step 1: Full Automated Suite

**Command:** `node --test "test/**/*.test.mjs"`

| Metric | Result |
|--------|--------|
| tests  | 383    |
| pass   | 366    |
| fail   | 0      |
| skip   | 17     |

**Verdict: PASS**

All 4 Track-A Wave-0 rails flipped RED → GREEN:
- `phase-34-chrome-flags.test.mjs`: 5 pass (was 3 fail / 2 pass at W0)
- `phase-34-render-mode-probe.test.mjs`: 2 pass (was 1 fail / 1 pass at W0)

Track-B rails remain GREEN (12 tests from W0 transition, all still pass).

Phase 34 total rails: all 16 RED rails now GREEN (4 Track-A + 12 Track-B).

**Suite delta from W0 baseline:**

| Metric | W0 Baseline | After Track B | After Track A | Net delta from W0 |
|--------|-------------|---------------|---------------|-------------------|
| pass   | 350         | 362           | 366           | +16               |
| fail   | 16          | 4             | 0             | -16               |
| skip   | 17          | 17            | 17            | 0                 |

---

## Step 2: D-06 Hard Gate — Connection-Stability Suite

**Command:** `node --test "test/connection-stability/*.test.mjs"` (non-live run; live tests require running server + Chromium)

| Metric | W0 Baseline (non-live) | After Track A | Delta |
|--------|------------------------|---------------|-------|
| tests  | 85                     | 85            | 0     |
| pass   | 72                     | 72            | 0     |
| fail   | 0                      | 0             | 0     |
| skip   | 13                     | 13            | 0     |

**Verdict: PASS**

Zero failures. Connection-stability suite unaffected by Track A changes. The changes to ssr-render-host.mjs (constant rename), ssr-webrtc-signaling.mjs (counter + log), runtime-orchestration.js (window hint + state clamp), and runtime-projection-gl-renderer.js (SSR context-loss branch) introduce no regression in the connection-stability harness.

Note: W0 baseline with `RUN_LIVE_TESTS=1` was 84 pass / 0 fail / 1 skip. The 13-skip non-live count (vs 1 skip in live mode) reflects 12 live tests that require a running server + Chromium tab — same pattern as Track B baseline.

---

## Step 3: Cold-Boot Repro Script

**Command:** `node test/manual/repro-cold-boot-loop.mjs`

**Status: SKIPPED — requires running server + Chromium (not available in CI executor context)**

Phase 33 baseline: 10/10 OK, 0 failures, min=3435 avg=8097 max=12076 ms.

Track A changes do not affect the cold-boot path (no changes to watchdog lifecycle, health-ping timing, or teardown logic). The only ssr-render-host.mjs change is constant rename (hasIgpu → hasIgpuDev/hasVaapiEnabled) which does not affect runtime behavior for cold-boot.

**Verdict: INCONCLUSIVE (infra not available) — expected PASS by code analysis**

---

## Step 4: D-05 Manual Visual Smoketest

**Status: INCONCLUSIVE — requires live gaming-PC desktop browser + server running + operator**

The automated gate (steps 1-2) confirms Track A code is correctly in place. The visual smoketest requires:
- A running `node server.mjs` instance
- A gaming-PC desktop browser open to `/output`
- The SSR Chromium tab navigated to `/ssr`
- The operator triggering a known solid-color banding animation

**What Track A delivers for the visual smoketest:**
1. `--ignore-gpu-blocklist` + `--enable-gpu-rasterization` now added whenever `/dev/dri/renderD128` or `/dev/dri/renderD129` exists (was: never added with VAAPI default-disabled). If the iGPU DRI device is present on the server, ANGLE will be able to use it rather than falling back to SwiftShader software rendering.
2. `state.renderMode = "gl"` forced on `/ssr` boot so `__ttBeamerEffectiveRenderMode()` returns `"gl"` (not containing `"2d"`) when WebGL is working.
3. `[ssr-stats] renderMode=gl` lines will appear in server stdout every ~10 seconds once the SSR tab is running.

**Expected server stdout evidence (per D-01 telemetry):**
```
[ssr-stats] renderMode=gl
```
(appears every 10th ssr-stats message, ~10s cadence)

**Expected DevTools console result (per D-05):**
```javascript
> __ttBeamerEffectiveRenderMode()
"gl"
```

**Verdict: INCONCLUSIVE — automated prerequisites confirmed; visual smoketest deferred to operator**

If banding persists after the GL-flag fix, escalation path per RESEARCH §Pitfall 1 / §A2:
- Check if `/dev/dri/renderD128` exists on the actual server: `ls /dev/dri/`
- Check `webglRenderer` string in ssr-stats — if shows "llvmpipe" ANGLE reached software path despite flags
- If banding is encoder artifact (not render-mode issue): escalate to encoder investigation in a future phase

---

## Summary

| Item | Status |
|------|--------|
| Full suite 366 pass / 0 fail | PASS |
| All 16 Phase-34 Wave-0 rails GREEN | PASS |
| D-06 connection-stability 72 pass / 0 fail (non-live) | PASS |
| Cold-boot 10× repro | INCONCLUSIVE (infra) |
| D-05 visual smoketest (no banding) | INCONCLUSIVE (operator required) |
| `[ssr-stats] renderMode=gl` in server stdout | INCONCLUSIVE (server not running) |
| `__ttBeamerEffectiveRenderMode()` returns non-2d | INCONCLUSIVE (live tab required) |

**D-06 gate: PASS. Track A ships.**

Track A ships the GL-flag decoupling, /ssr 2D-fallback ban, and renderMode telemetry. If banding
persists in spite of renderMode=gl, escalate to encoder investigation (RESEARCH §A2) — but the
GL-flag fix is net-positive regardless.
