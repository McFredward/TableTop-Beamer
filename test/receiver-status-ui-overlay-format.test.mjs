// Phase-31 h17 — formatDiagnosticOverlay regression test.
//
// The receiver chip is the operator's lens onto the SSR pipeline. This
// test pins the line layout and field visibility so a future refactor
// can't silently drop fields the operator depends on (e.g. encoder
// name, decoder method, GIF cache state).

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDiagnosticOverlay } from "../src/app/runtime/output-receiver/receiver-status-ui.js";

function fixture() {
  return {
    receivedFps: 30,
    pcConnectionState: "connected",
    lastFrameAgeMs: 33,
    heartbeatAgeMs: 320,
    ssrFps: 30,
    ssrStats: {
      fps: 30,
      outputW: 1920,
      outputH: 1080,
      boardId: "nemesis-board-a",
      activeAnimations: 2,
      alignMode: false,
      gifsReady: 4,
      gifsLoading: 0,
      gifsFallback: 0,
      gifsTotal: 4,
      webglRenderer: "Mesa Intel(R) UHD Graphics",
      lastDecodeVia: "parser",
      renderMode: "gl",
    },
    serverInfo: {
      encoder: "x264-software",
      encoderSource: "auto",
      qualityPreset: "low-latency",
      bitrateBps: 4_000_000,
      fpsTarget: 30,
    },
    rtcStats: {
      codec: "video/H264",
      inbound: {
        framesDecoded: 600,
        framesDropped: 0,
        framesPerSecond: 30,
        jitter: 0.002,
        packetsLost: 0,
        packetsReceived: 5400,
        bytesReceived: 7_500_000,
        totalDecodeTime: 12.5,
        frameWidth: 1920,
        frameHeight: 1080,
      },
      candidatePair: { rtt: 0.004, availableIncomingBitrate: 12_000_000 },
      decoderImplementation: "FFmpeg",
    },
    rtcStatsPrev: null,
    videoW: 1920,
    videoH: 1080,
    videoDropped: 0,
    videoTotal: 600,
    reconnectAttempts: 0,
  };
}

test("formatter: emits 7-line panel covering STREAM/RTC/SSR/GPU/ENCODE/PIPE/BOARD", () => {
  const out = formatDiagnosticOverlay(fixture());
  const lines = out.split("\n");
  assert.equal(lines.length, 7, "expected exactly 7 lines");
  assert.match(lines[0], /^STREAM\s/);
  assert.match(lines[1], /^RTC\s/);
  assert.match(lines[2], /^SSR\s/);
  assert.match(lines[3], /^GPU\s/);
  assert.match(lines[4], /^ENCODE\s/);
  assert.match(lines[5], /^PIPE\s/);
  assert.match(lines[6], /^BOARD\s/);
});

test("formatter: STREAM line shows fps, resolution, codec, drops, loss", () => {
  const out = formatDiagnosticOverlay(fixture());
  const lines = out.split("\n");
  assert.match(lines[0], /30fps/, "fps");
  assert.match(lines[0], /1920x1080/, "resolution");
  assert.match(lines[0], /H264/, "codec (without `video/` prefix)");
  assert.match(lines[0], /drops=0\/600/, "drops/total");
  assert.match(lines[0], /loss=0\.0%/, "packet loss");
});

test("formatter: RTC line shows rtt, jitter, available bandwidth, decoder impl", () => {
  const out = formatDiagnosticOverlay(fixture());
  const lines = out.split("\n");
  assert.match(lines[1], /rtt=4ms/);
  assert.match(lines[1], /jitter=2ms/);
  assert.match(lines[1], /avail=12\.0Mbps/);
  assert.match(lines[1], /dec=FFmpeg/);
});

test("formatter: SSR line shows fps, output res, render mode, decoder method", () => {
  const out = formatDiagnosticOverlay(fixture());
  const lines = out.split("\n");
  assert.match(lines[2], /30fps/);
  assert.match(lines[2], /1920x1080/);
  assert.match(lines[2], /mode=/, "render mode must be in SSR line");
  assert.match(lines[2], /via=parser/);
});

test("formatter: GPU line shows the WebGL renderer", () => {
  const out = formatDiagnosticOverlay(fixture());
  const lines = out.split("\n");
  assert.match(lines[3], /Mesa Intel/, "WebGL renderer text must be on the GPU line");
});

test("formatter: ENCODE line shows encoder, preset, target bitrate, fps target", () => {
  const out = formatDiagnosticOverlay(fixture());
  const lines = out.split("\n");
  assert.match(lines[4], /x264-software\/auto/);
  assert.match(lines[4], /low-latency/);
  assert.match(lines[4], /target=4\.0Mbps/);
  assert.match(lines[4], /30fps/);
});

test("formatter: PIPE line shows pc state, gif counts, reconnect attempts", () => {
  const out = formatDiagnosticOverlay(fixture());
  const lines = out.split("\n");
  assert.match(lines[5], /pc=connected/);
  assert.match(lines[5], /gifs=4\/4/);
  assert.match(lines[5], /attempts=0/);
});

test("formatter: BOARD line shows board id, animation count, align mode, frame/heartbeat ages", () => {
  const out = formatDiagnosticOverlay(fixture());
  const lines = out.split("\n");
  assert.match(lines[6], /nemesis-board-a/);
  assert.match(lines[6], /anims=2/);
  assert.match(lines[6], /off/, "align mode must show `off` when ssrStats.alignMode === false");
  assert.match(lines[6], /frame=33ms/);
  assert.match(lines[6], /hb=320ms/);
});

test("formatter: render mode shows configured value", () => {
  const fx = fixture();
  fx.ssrStats.renderMode = "gl";
  const out = formatDiagnosticOverlay(fx);
  assert.match(out.split("\n")[2], /mode=gl/);
});

test("formatter: render mode reflects gl→2d fallback", () => {
  const fx = fixture();
  fx.ssrStats.renderMode = "gl→2d (loss x1)";
  const out = formatDiagnosticOverlay(fx);
  const ssrLine = out.split("\n")[2];
  assert.match(ssrLine, /mode=gl→2d/, "render-mode fallback string must surface verbatim");
  assert.match(ssrLine, /loss x1/, "loss count must be visible to the operator");
});

test("formatter: missing ssrStats shows `?` placeholders without throwing", () => {
  const out = formatDiagnosticOverlay({
    receivedFps: 0,
    pcConnectionState: "new",
    ssrFps: null,
    ssrStats: null,
    serverInfo: null,
    rtcStats: null,
  });
  // No assertion on exact text — just that the function returns a string
  // with 7 lines. Operators see the chip even before the heartbeat lands.
  const lines = out.split("\n");
  assert.equal(lines.length, 7);
  // Common pattern: question marks for missing data.
  assert.match(out, /\?/);
});

test("formatter: ALIGN flag shown when alignMode is true", () => {
  const fx = fixture();
  fx.ssrStats.alignMode = true;
  const out = formatDiagnosticOverlay(fx);
  const lines = out.split("\n");
  assert.match(lines[6], /ALIGN/);
});

test("formatter: gif cache loading + fallback counts surface separately", () => {
  const fx = fixture();
  fx.ssrStats.gifsReady = 2;
  fx.ssrStats.gifsLoading = 1;
  fx.ssrStats.gifsFallback = 1;
  fx.ssrStats.gifsTotal = 4;
  const out = formatDiagnosticOverlay(fx);
  const lines = out.split("\n");
  assert.match(lines[5], /gifs=2\/4/);
  assert.match(lines[5], /ld1/, "loading count must surface");
  assert.match(lines[5], /fb1/, "fallback count must surface");
});

test("formatter: large bitrate values use Mbps; small use kbps", () => {
  const fx = fixture();
  fx.serverInfo.bitrateBps = 250_000; // small enough for kbps display
  const out1 = formatDiagnosticOverlay(fx);
  assert.match(out1.split("\n")[4], /target=250kbps/);

  fx.serverInfo.bitrateBps = 8_000_000;
  const out2 = formatDiagnosticOverlay(fx);
  assert.match(out2.split("\n")[4], /target=8\.0Mbps/);
});

test("formatter: packet loss ratio reflects packetsLost / (received + lost)", () => {
  const fx = fixture();
  fx.rtcStats.inbound.packetsLost = 50;
  fx.rtcStats.inbound.packetsReceived = 950;
  const out = formatDiagnosticOverlay(fx);
  // 50 / 1000 = 5.0%
  assert.match(out.split("\n")[0], /loss=5\.0%/);
});
