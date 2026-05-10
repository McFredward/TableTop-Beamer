// Phase 34 Wave 0 — Contract tests for Chrome GPU-init flags in ssr-render-host.mjs (Track A rails).
//
// The root cause of the GL→2D fallback (banding symptom) is that
// --ignore-gpu-blocklist and --enable-gpu-rasterization are currently gated
// behind hasIgpu which is VAAPI-gated. With VAAPI default-disabled (Phase 33),
// these flags are never added. Phase 34 Track A decouples them: hasIgpuDev
// (DRI device presence only, no VAAPI check) gates the GL flags, while
// hasVaapiEnabled (VAAPI opt-in AND DRI device) gates the VAAPI features.
//
// Strategy: read ssr-render-host.mjs as a string and assert the target logic
// via regex (same pattern as test/ssr-chromium-flags-merge.test.mjs).
// Tests marked RED will fail on master and must flip GREEN after Track A.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync("./src/server/ssr-render-host.mjs", "utf8");

// Extract the launchBrowser function body (same approach as ssr-chromium-flags-merge.test.mjs).
function extractLaunchBrowserBody() {
  const startMarker = "async function launchBrowser(";
  const startIdx = SRC.indexOf(startMarker);
  assert.ok(startIdx >= 0, "ssr-render-host.mjs must contain `async function launchBrowser(`");
  const closingPattern = /\n  \}\n/;
  const tail = SRC.slice(startIdx);
  const m = closingPattern.exec(tail);
  assert.ok(m, "ssr-render-host.mjs: closing `  }` for launchBrowser not found");
  return tail.slice(0, m.index + m[0].length);
}

const launchBody = extractLaunchBrowserBody();

// Strip line comments so that comment blocks mentioning these tokens don't
// produce false positives on the regex assertions.
function stripLineComments(src) {
  return src
    .split("\n")
    .map((line) => line.replace(/\s*\/\/.*$/, ""))
    .join("\n");
}

const launchBodyNoComments = stripLineComments(launchBody);

// EXPECTED: RED on master, GREEN after 34-A
test("ssr-render-host declares hasIgpuDev separately from hasVaapiEnabled (post-34-A)", () => {
  // Post-34-A target: hasIgpuDev only checks /dev/dri/renderD128|D129 —
  // NO reference to SSR_ENABLE_VAAPI on its right-hand side.
  // Current master: const hasIgpu = process.env.SSR_ENABLE_VAAPI === "1" && ...
  // (no hasIgpuDev binding at all).
  const hasIgpuDevDeclared = /const\s+hasIgpuDev\s*=/.test(launchBodyNoComments);
  assert.ok(
    hasIgpuDevDeclared,
    "launchBrowser must declare `const hasIgpuDev = ...` (post-34-A). " +
    "Current master only has `const hasIgpu` which is VAAPI-gated. " +
    "Track A must add hasIgpuDev that checks /dev/dri/renderD128 WITHOUT SSR_ENABLE_VAAPI.",
  );

  // Additionally verify hasIgpuDev binding does NOT include SSR_ENABLE_VAAPI.
  const igpuDevLineMatch = launchBodyNoComments.match(/const\s+hasIgpuDev\s*=[^\n;]+/);
  if (igpuDevLineMatch) {
    assert.ok(
      !igpuDevLineMatch[0].includes("SSR_ENABLE_VAAPI"),
      "hasIgpuDev must NOT reference SSR_ENABLE_VAAPI — it gates on DRI device presence only. " +
      "Track A separates: hasIgpuDev = DRI present; hasVaapiEnabled = VAAPI + DRI.",
    );
  }
});

// Phase 34 hotfix h2 (2026-05-10): the GL-helpful flags
// --ignore-gpu-blocklist and --enable-gpu-rasterization were originally
// REQUESTED to be decoupled from VAAPI in Track A T1, but UAT showed they
// reproduce the Phase 33 main-thread-hang under Mesa-llvmpipe + Xvfb on
// the operator's hardware (consumer connects forever, no video). They are
// reverted to VAAPI-gated to restore Phase 33 connection-stability baseline.
// The 2D-fallback / banding visual issue is preserved as a known-deferred
// item (cannot fix without re-introducing the hang). Re-enable both flags
// AND VAAPI together via SSR_ENABLE_VAAPI=1 for hardware that handles
// hardware GPU paint paths cleanly.
test("ssr-render-host gates --ignore-gpu-blocklist on hasVaapiEnabled (h2 revert)", () => {
  const pattern = /\.\.\.\(\s*hasVaapiEnabled\s*\?\s*\[.*?--ignore-gpu-blocklist/s;
  assert.ok(
    pattern.test(launchBodyNoComments),
    "After hotfix h2 the --ignore-gpu-blocklist flag must be gated on hasVaapiEnabled (Phase 33 baseline). " +
    "Decoupling to hasIgpuDev triggered the same main-thread-hang as VAAPI did. " +
    "Visual 2D-fallback / banding is the accepted trade-off for connection stability.",
  );
});

test("ssr-render-host gates --enable-gpu-rasterization on hasVaapiEnabled (h2 revert)", () => {
  const pattern = /\.\.\.\(\s*hasVaapiEnabled\s*\?[^)]*--enable-gpu-rasterization/s;
  assert.ok(
    pattern.test(launchBodyNoComments),
    "After hotfix h2 the --enable-gpu-rasterization flag must be gated on hasVaapiEnabled (Phase 33 baseline).",
  );
});

// EXPECTED: GREEN on master (regression)
test("ssr-render-host VAAPI features still gated on hasVaapiEnabled or hasIgpu (regression)", () => {
  // The VAAPI encoder features (VaapiVideoEncoder etc.) must remain gated on
  // a VAAPI-aware binding. Accept either hasVaapiEnabled (post-34-A name) or
  // hasIgpu (current master name) to be tolerant during the rename.
  const vaapiFeatureGate = /\b(hasVaapiEnabled|hasIgpu)\b[^;]{0,200}VaapiVideoEncoder/s;
  assert.ok(
    vaapiFeatureGate.test(launchBodyNoComments),
    "VAAPI features (VaapiVideoEncoder etc.) must remain gated on hasVaapiEnabled or hasIgpu. " +
    "This is a regression check — VAAPI default-disabled (D-06 Phase 33) must stay intact.",
  );
});

// EXPECTED: GREEN on master (regression — h9 fix)
test("ssr-render-host --use-gl=angle still present (regression — h9 fix)", () => {
  // Phase 32 h9 fix: --use-gl=angle must always be present in Chrome args.
  // The Phase 32 regression test already covers this via ssr-chromium-flags-merge.test.mjs
  // but we add a Wave-0 redundant check to ensure Track A doesn't accidentally
  // remove it while refactoring the flag-build logic.
  assert.ok(
    /--use-gl=angle/.test(launchBodyNoComments),
    "--use-gl=angle must remain in Chrome args (Phase 32 h9 regression — must not be removed by Track A).",
  );
});
