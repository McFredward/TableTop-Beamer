// Phase 31 Plan 02 — Wave 2: WebRTC stream bring-up.
// Tests run mediasoup natively (no Chromium needed). They cover the
// router lifecycle + WebRtcTransport shape + V5-validated signaling
// protocol contract. Per D-D2 reversal addendum, the Producer is
// video-only — the audio Producer is intentionally absent.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bootMediasoupRouter,
  shutdownMediasoupRouter,
  createWebRtcTransport,
  getRouter,
} from "../src/server/ssr-mediasoup-router.mjs";

test("Plan 02: mediasoup router boots with H264 codec (D-D2 reversal: video-only)", async (t) => {
  const { router } = await bootMediasoupRouter();
  t.after(() => shutdownMediasoupRouter());
  const codecs = router.rtpCapabilities.codecs;
  assert.ok(
    codecs.some((c) => c.mimeType === "video/H264"),
    "H264 codec missing from router rtpCapabilities",
  );
});

test("Plan 02: bootMediasoupRouter is idempotent — second call returns same router", async (t) => {
  const a = await bootMediasoupRouter();
  const b = await bootMediasoupRouter();
  t.after(() => shutdownMediasoupRouter());
  assert.equal(a.router, b.router, "router should be reused, not re-created");
});

test("Plan 02: getRouter returns the active router after boot", async (t) => {
  const { router } = await bootMediasoupRouter();
  t.after(() => shutdownMediasoupRouter());
  assert.equal(getRouter(), router);
});

test("Plan 02: createWebRtcTransport returns canonical transport shape", async (t) => {
  const { router } = await bootMediasoupRouter();
  t.after(() => shutdownMediasoupRouter());
  const tx = await createWebRtcTransport({ router });
  assert.equal(typeof tx.id, "string");
  assert.ok(tx.iceParameters, "iceParameters missing");
  assert.ok(Array.isArray(tx.iceCandidates), "iceCandidates must be array");
  assert.ok(tx.dtlsParameters, "dtlsParameters missing");
  assert.ok(Array.isArray(tx.dtlsParameters.fingerprints) && tx.dtlsParameters.fingerprints.length > 0,
    "dtlsParameters.fingerprints must be a non-empty array");
  tx.close();
});

test("Plan 02: shutdownMediasoupRouter closes worker + router cleanly", async (t) => {
  await bootMediasoupRouter();
  await shutdownMediasoupRouter();
  assert.equal(getRouter(), null, "router must be null after shutdown");
  // Should be safe to call again without throwing
  await shutdownMediasoupRouter();
});

// ----------------- signaling module unit tests (no live socket) -----------

test("Plan 02: ssr-webrtc-signaling exports attachWebRtcSignaling", async () => {
  const mod = await import("../src/server/ssr-webrtc-signaling.mjs");
  assert.equal(typeof mod.attachWebRtcSignaling, "function");
});

test("Plan 02: signaling validators — DTLS parameters", async () => {
  const mod = await import("../src/server/ssr-webrtc-signaling.mjs");
  const { __test_validateDtlsParameters: v } = mod;
  assert.equal(typeof v, "function", "validateDtlsParameters must be exported under __test_ prefix");
  // valid
  assert.equal(v({ role: "auto", fingerprints: [{ algorithm: "sha-256", value: "AA:BB" }] }), true);
  assert.equal(v({ fingerprints: [{ algorithm: "sha-256", value: "AA:BB" }] }), true);
  // invalid
  assert.equal(v(null), false);
  assert.equal(v({}), false);
  assert.equal(v({ role: "server", fingerprints: [] }), false);
  assert.equal(v({ role: "bogus", fingerprints: [{ algorithm: "sha-256", value: "AA" }] }), false);
  assert.equal(v({ fingerprints: [{ algorithm: 1, value: "AA" }] }), false);
});

test("Plan 02: signaling validators — RTP parameters", async () => {
  const mod = await import("../src/server/ssr-webrtc-signaling.mjs");
  const { __test_validateRtpParameters: v } = mod;
  assert.equal(typeof v, "function");
  // valid (must have non-empty codecs[] and encodings[])
  assert.equal(
    v({
      codecs: [{ mimeType: "video/H264", clockRate: 90000, payloadType: 96 }],
      encodings: [{ ssrc: 12345 }],
    }),
    true,
  );
  // invalid
  assert.equal(v(null), false);
  assert.equal(v({}), false);
  assert.equal(v({ codecs: [] }), false);
  assert.equal(v({ codecs: [{}] }), false);
  assert.equal(v({ codecs: [{ mimeType: "video/H264" }], encodings: "nope" }), false);
});

test("Plan 02: signaling protocol — KNOWN_ACTIONS does NOT include align-corner-drag (Plan 04 territory)", async () => {
  const mod = await import("../src/server/ssr-webrtc-signaling.mjs");
  const actions = mod.__test_KNOWN_ACTIONS;
  assert.ok(actions instanceof Set, "KNOWN_ACTIONS must be exported as Set");
  assert.ok(actions.has("get-router-rtp-capabilities"));
  assert.ok(actions.has("create-send-transport"));
  assert.ok(actions.has("create-recv-transport"));
  assert.ok(actions.has("connect-transport"));
  assert.ok(actions.has("produce"));
  assert.ok(actions.has("consume"));
  assert.ok(actions.has("resume-consumer"));
  assert.ok(!actions.has("align-corner-drag"), "align-corner-drag is Plan 04 territory, not a signaling action");
});

// D-D2 reversal — the in-page publisher uses video-only getDisplayMedia.
// This is asserted at the publisher-script level (Task 2) but we lock the
// contract here too: the Producer side must end up as exactly one video
// Producer (no audio).
test("Plan 02 (D-D2 reversal): publisher script requests video-only getDisplayMedia", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  if (!existsSync("./src/server/ssr-stream-publisher.mjs")) {
    // Task 2 has not run yet — skip will degrade to a clear failure if file is missing later.
    // Use t.skip-equivalent: assert true here and let the file-existence test below carry.
    return;
  }
  const src = readFileSync("./src/server/ssr-stream-publisher.mjs", "utf8");
  // The script body is a JS template string — we just grep the relevant tokens.
  assert.ok(
    /getDisplayMedia\s*\(\s*\{\s*video\s*:\s*true\s*,\s*audio\s*:\s*false\s*\}/.test(src),
    "publisher must call getDisplayMedia({ video: true, audio: false }) per D-D2 reversal",
  );
  // No audio Producer — script must NOT call sendTransport.produce({ track: audioTrack })
  assert.ok(
    !/audioTrack/.test(src),
    "publisher must not capture or produce an audio track (D-D2 reversal: video-only)",
  );
});

test("Plan 02: ssr-stream-publisher.mjs exists and exports injectInPagePublisher", async () => {
  const { existsSync } = await import("node:fs");
  if (!existsSync("./src/server/ssr-stream-publisher.mjs")) {
    // Task 2 has not run yet — fail loudly when run after both tasks complete.
    assert.fail("Task 2 must create src/server/ssr-stream-publisher.mjs");
  }
  const mod = await import("../src/server/ssr-stream-publisher.mjs");
  assert.equal(typeof mod.injectInPagePublisher, "function");
  assert.equal(typeof mod.buildInPagePublisherScript, "function");
});
