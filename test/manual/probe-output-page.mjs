#!/usr/bin/env node
// Phase 33 / Iteration N — REAL CHROMIUM PROBE
//
// Opens http://localhost:<PORT>/output/ in a real Chromium tab via puppeteer
// and observes ACTUAL connection stability — what the Pi sees.
//
// This is the test the synthetic harness in test/connection-stability/_harness.mjs
// did NOT do. The synthetic harness only opens a WebSocket and parses heartbeats;
// it never exercises the full consume → mediasoup-client → RTCPeerConnection →
// video-element pipeline that a real Pi receiver runs.
//
// Usage:  node test/manual/probe-output-page.mjs [--port=4173] [--duration=30000]
//
// Captures:
//   - All page console messages (log/info/warn/error)
//   - All page errors (uncaught exceptions)
//   - WebSocket frame-level events (via CDP Network domain) — open/close/error
//   - Page request failures
//   - Final state of the connection (heartbeats, frames, status)

// Bail when discovered by `node --test`. This is an interactive probe
// script, not a unit test — node:test would try to "run" it and fail
// because we always boot Puppeteer + connect to a server.
if (process.execArgv.some((a) => a.includes("--test"))
    || process.argv.some((a) => a.includes("--test"))) {
  process.exit(0);
}

const puppeteerCore = await import("puppeteer").then((m) => m.default);

const args = process.argv.slice(2).reduce((acc, x) => {
  const m = x.match(/^--([^=]+)=(.+)$/);
  if (m) acc[m[1]] = m[2];
  return acc;
}, {});
const PORT = Number(args.port || 4173);
const DURATION_MS = Number(args.duration || 30000);
const URL = `http://127.0.0.1:${PORT}/output/`;

console.log(`[probe] target=${URL} duration=${DURATION_MS}ms`);

const browser = await puppeteerCore.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const page = await browser.newPage();

// Observability
const events = [];
const wsEvents = [];
const stamp = () => new Date().toISOString().slice(11, 23);

page.on("console", (msg) => {
  events.push({ t: stamp(), kind: "console", level: msg.type(), text: msg.text() });
});
page.on("pageerror", (err) => {
  events.push({ t: stamp(), kind: "pageerror", text: String(err?.stack || err?.message || err) });
});
page.on("requestfailed", (req) => {
  events.push({ t: stamp(), kind: "requestfailed", url: req.url(), reason: req.failure()?.errorText });
});

// WebSocket lifecycle via CDP
const cdp = await page.target().createCDPSession();
await cdp.send("Network.enable");
cdp.on("Network.webSocketCreated", (ev) => {
  wsEvents.push({ t: stamp(), kind: "ws-created", url: ev.url, requestId: ev.requestId });
});
cdp.on("Network.webSocketClosed", (ev) => {
  wsEvents.push({ t: stamp(), kind: "ws-closed", requestId: ev.requestId });
});
cdp.on("Network.webSocketHandshakeResponseReceived", (ev) => {
  wsEvents.push({ t: stamp(), kind: "ws-handshake", requestId: ev.requestId, status: ev.response?.status });
});
cdp.on("Network.webSocketFrameSent", (ev) => {
  wsEvents.push({ t: stamp(), kind: "ws-sent", requestId: ev.requestId, payload: (ev.response?.payloadData || "").slice(0, 200) });
});
cdp.on("Network.webSocketFrameReceived", (ev) => {
  wsEvents.push({ t: stamp(), kind: "ws-recv", requestId: ev.requestId, payload: (ev.response?.payloadData || "").slice(0, 200) });
});
cdp.on("Network.webSocketFrameError", (ev) => {
  wsEvents.push({ t: stamp(), kind: "ws-frame-error", requestId: ev.requestId, errorMessage: ev.errorMessage });
});

// Navigate
console.log(`[probe] navigating...`);
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 15000 });
console.log(`[probe] navigated, observing ${DURATION_MS}ms...`);

await new Promise((r) => setTimeout(r, DURATION_MS));

// Final state probe
const finalState = await page.evaluate(() => {
  const v = document.querySelector("video.ssr-video, video");
  const banner = document.querySelector('[id*="reconnect"], [class*="reconnect"]');
  return {
    videoReadyState: v?.readyState ?? null,
    videoCurrentTime: v?.currentTime ?? null,
    videoPaused: v?.paused ?? null,
    videoSrc: !!v?.srcObject || !!v?.src,
    bannerText: banner?.textContent ?? null,
    bannerVisible: banner ? !banner.hidden && getComputedStyle(banner).display !== "none" : null,
    bodyClassList: [...document.body.classList],
    documentReadyState: document.readyState,
  };
}).catch((e) => ({ probe_error: String(e) }));

console.log(`[probe] FINAL STATE:`, JSON.stringify(finalState, null, 2));

// Summarize WS lifecycle
const wsCreates = wsEvents.filter((e) => e.kind === "ws-created");
const wsCloses = wsEvents.filter((e) => e.kind === "ws-closed");
console.log(`\n[probe] WS LIFECYCLE: ${wsCreates.length} creates, ${wsCloses.length} closes`);

console.log(`\n[probe] WS EVENTS (last 30):`);
for (const ev of wsEvents.slice(-30)) {
  console.log(`  ${ev.t} ${ev.kind} ${ev.payload ? ev.payload.slice(0, 100) : (ev.url || ev.errorMessage || "")}`);
}

console.log(`\n[probe] CONSOLE EVENTS (last 40):`);
for (const ev of events.slice(-40)) {
  console.log(`  ${ev.t} ${ev.kind}/${ev.level || ""} ${ev.text || ev.url || ""}`);
}

const errorCount = events.filter((e) => e.kind === "pageerror" || e.level === "error").length;
console.log(`\n[probe] error count: ${errorCount}`);

await browser.close();
process.exit(errorCount > 0 || wsCloses.length > wsCreates.length / 2 ? 1 : 0);
