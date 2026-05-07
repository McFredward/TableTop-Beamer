// Phase-31 h18 — encoder-conditional simulcast layer count.
//
// THE BUG: the publisher unconditionally emitted 3 simulcast layers,
// which on x264-software triples encode CPU and caps the stream around
// 20 fps on a workstation. With the user's diagnostic plan we expect
// hardware encoders (vaapi/nvenc/videotoolbox) to keep simulcast for
// adaptive-bitrate, but software encoders to use a single layer.
//
// THIS TEST: imports buildInPagePublisherScript and verifies the
// encoder-conditional behavior. The script body is a string template,
// so we grep it for the encoding-array shape.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInPagePublisherScript } from "../src/server/ssr-stream-publisher.mjs";

test("h18: x264-software encoder gets single-layer encoding (CPU saver)", () => {
  const script = buildInPagePublisherScript({
    encoderConfig: { encoder: "x264-software" },
  });
  // Single-layer marker: NO `rid:` keys in the encodings array.
  assert.equal(
    /rid:\s*"low"/.test(script),
    false,
    "x264-software must NOT emit a 3-layer simulcast encoding (rid:'low' markers)",
  );
  assert.match(script, /maxBitrate:\s*\d+/, "single-layer must still set maxBitrate");
  // Marker we add for the boot log so an operator can confirm in real time.
  assert.match(script, /simulcast=single-layer/);
});

// Phase 32 hotfix h8 (2026-05-07): force single-layer for ALL encoders until
// hardware encoding is verified working in production. The Phase 31 h18 tests
// below were rewritten to assert single-layer for previously-3-layer encoders
// (vaapi, nvenc). When hardware encoding is verified, restore conditional
// simulcast and re-introduce the 3-layer assertions.
test("h8: vaapi encoder uses single-layer (h18 3-layer disabled until hardware encode verified)", () => {
  const script = buildInPagePublisherScript({
    encoderConfig: { encoder: "vaapi" },
  });
  assert.equal(
    /rid:\s*"low"/.test(script),
    false,
    "vaapi must use single-layer until Chrome 131 VaapiVideoEncoder is confirmed (h8)",
  );
  assert.match(script, /simulcast=single-layer/);
});

test("h8: nvenc encoder uses single-layer (h18 3-layer disabled until hardware encode verified)", () => {
  const script = buildInPagePublisherScript({
    encoderConfig: { encoder: "nvenc" },
  });
  assert.equal(
    /rid:\s*"low"/.test(script),
    false,
    "nvenc must use single-layer until hardware encode is confirmed (h8)",
  );
});

test("h18: missing encoderConfig defaults to single-layer (safer for unknown hosts)", () => {
  // When the host hasn't resolved encoderConfig yet (e.g. during a
  // restart), default to single-layer. Conservative: better to under-
  // utilize a hardware encoder briefly than to overload an x264 encoder.
  const script = buildInPagePublisherScript({});
  assert.equal(
    /rid:\s*"low"/.test(script),
    false,
    "no encoderConfig → fall back to single-layer (treat as software)",
  );
});

test("h8: publisher logs single-layer for ALL encoders (h18 3-layer disabled)", () => {
  // The operator reads server logs to verify the publisher took the
  // right path on this host. The log line is grep-friendly.
  const sw = buildInPagePublisherScript({ encoderConfig: { encoder: "x264-software" } });
  const hw = buildInPagePublisherScript({ encoderConfig: { encoder: "vaapi" } });
  assert.match(sw, /encoder=x264-software simulcast=single-layer/);
  assert.match(hw, /encoder=vaapi simulcast=single-layer/);
});
