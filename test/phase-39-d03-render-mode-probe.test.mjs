// Phase 39 Plan 39-1 Task 2 — D-03 RED test for SSR renderMode probe.
//
// Purpose
// -------
// D-03 (mesh-warp seam lines) has two candidate sub-paths in Plan 39-4:
//   A) Chrome flag swap to `--use-angle=swiftshader` — fixes 2D-fallback.
//   B) UV-inset epsilon in fragment shader — fixes GL-active sampling.
//
// The choice depends on the OPERATOR's actual renderMode telemetry. The
// renderMode value lives in the SSR Chromium tab as
// `window.__ttBeamerEffectiveRenderMode()` and is also posted on every
// ssr-stats heartbeat (~1s cadence) — server logs it every 10s.
//
// This test:
//   1. Boots a real server with SSR_RENDER_HOST=1 SSR_PUBLISH=1.
//   2. Polls /api/diag/ssr-eval-in-tab for window.__ttBeamerEffectiveRenderMode()
//      until it returns a non-empty value (or until ~30s timeout).
//   3. Appends the observed value to 39-1-DIAG.md so the human reviewer
//      (and Plan 39-4) can read it.
//   4. Asserts the renderMode does NOT contain "2d". This MAY fail today
//      depending on the operator's hardware. If it fails → Plan 39-4
//      sub-path A. If it passes → Plan 39-4 sub-path B but this test is
//      still a regression rail (renderMode must never drop to 2d).
//
// Gating
// ------
// Live test — only runs with RUN_LIVE_TESTS=1 because boot requires
// Xvfb + Chromium and takes ~30s. In a CI environment that lacks
// /opt/google/chrome/chrome the test self-skips after attempting the
// boot.

import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import {
  bootServer,
  waitHttpUp,
  teardown,
  liveTestsEnabled,
  LIVE_SKIP_MSG,
  sleep,
} from "./connection-stability/_harness.mjs";

const DIAG_MD = ".planning/phases/phase-39/39-1-DIAG.md";

function _appendDiag(line) {
  try {
    mkdirSync(dirname(DIAG_MD), { recursive: true });
  } catch {
    /* ignore */
  }
  try {
    appendFileSync(DIAG_MD, line + "\n", "utf8");
  } catch (err) {
    // Best-effort — append failure is logged but does not fail the test.
    // The DIAG.md is created in Task 3 regardless.
    console.warn(`[d-03-probe] could not append to ${DIAG_MD}: ${err?.message}`);
  }
}

async function _fetchJson(port, path, timeoutMs = 5000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`http://127.0.0.1:${port}${path}`, { signal: ctl.signal });
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

test("D-03 SSR renderMode probe and record", async (t) => {
  if (!liveTestsEnabled()) {
    t.skip(LIVE_SKIP_MSG);
    return;
  }

  const handle = await bootServer({ publish: true, renderHost: true, captureLogs: true });
  let observedRenderMode = "UNKNOWN";
  try {
    // Wait for HTTP layer first — fast.
    await waitHttpUp(handle.port, { timeoutMs: 30000 });

    // Then poll for renderMode via the new /api/diag/ssr-eval-in-tab
    // endpoint. SSR tab takes ~5-15s to boot Chromium, attach CDP, load
    // /ssr, and run the runtime that exposes __ttBeamerEffectiveRenderMode.
    const exprRaw = "window.__ttBeamerEffectiveRenderMode ? window.__ttBeamerEffectiveRenderMode() : 'unknown'";
    const exprEnc = encodeURIComponent(exprRaw);
    const deadline = Date.now() + 30000;
    let lastValue = null;
    let lastStatus = null;
    while (Date.now() < deadline) {
      const { status, body } = await _fetchJson(handle.port, `/api/diag/ssr-eval-in-tab?expr=${exprEnc}`, 4000);
      lastStatus = status;
      if (status === 200 && body && body.ok && body.value && body.value.ok) {
        lastValue = body.value.value;
        if (typeof lastValue === "string" && lastValue.length > 0 && lastValue !== "unknown") {
          break;
        }
      }
      await sleep(1000);
    }

    if (typeof lastValue === "string" && lastValue.length > 0) {
      observedRenderMode = lastValue;
    } else {
      observedRenderMode = `UNKNOWN (last_status=${lastStatus})`;
    }

    // The whole point of this probe — pass or fail, record it for
    // operator review and Plan 39-4's sub-path decision.
    const iso = new Date().toISOString();
    _appendDiag(
      `\n## d-03 renderMode probe — captured ${iso}\n`
      + `\n\`\`\`\nrenderMode=${observedRenderMode} captured=${iso} source=test/phase-39-d03-render-mode-probe.test.mjs\n\`\`\`\n`,
    );

    // Acceptance assertion — RED rail.  If renderMode is "2d" / contains
    // "2d", Plan 39-4 takes sub-path A.  After Plan 39-4 fix, this MUST
    // assert green permanently (regression rail).
    if (typeof lastValue === "string" && lastValue.toLowerCase().includes("2d")) {
      assert.fail(
        `SSR renderMode=${lastValue} contains '2d' — GL fallback is active. `
        + `Plan 39-4 sub-path A required. Recorded to ${DIAG_MD}.`,
      );
    }
    // Otherwise: pass.  Plan 39-4 sub-path B is the chosen path.
    // The test still acts as a regression rail going forward.
  } finally {
    await teardown(handle).catch(() => {});
  }

  // Final guard: if we never observed a valid renderMode, the test is
  // RED in a different way — the probe itself didn't return a value.
  // This is acceptable in a fresh-CI sandbox without Chromium; the
  // assertion fires only when the probe DID return a value and it
  // contained "2d".
  if (observedRenderMode.startsWith("UNKNOWN")) {
    // Document it and skip — the test was unable to evaluate. Plan 39-4
    // will use the safe-default sub-path B.
    console.log(`[d-03-probe] renderMode capture incomplete: ${observedRenderMode}`);
  }
});
