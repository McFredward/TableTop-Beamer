// Phase 38 W10 — WS frame fragmentation reproducer.
//
// Hypothesis: server.mjs's hand-rolled decodeWebSocketTextFrame() (line 1485)
// cannot handle WebSocket frames that arrive split across MULTIPLE TCP chunks.
// It assumes each `socket.on("data", chunk)` event delivers a complete frame.
//
// Real-world impact:
//   - test2 broadcast (3×3 grid, ~1KB) fits in one TCP segment on real LAN
//     (MTU 1500 → ~1380-byte payload). Server receives one chunk, decodes OK.
//   - xrandrv2 broadcast (9×9 grid, ~5KB) MUST split across ~4 TCP segments
//     on real LAN. Server's first chunk has the WS frame header claiming
//     payloadLength=5000 but only ~1300 bytes follow. decodeWebSocketTextFrame
//     line 1522 (`chunk.length < cursor + 4 + payloadLength`) returns null.
//     Subsequent chunks have no WS frame header → also return null.
//     The frame is silently dropped → no server-recv log.
//
// On localhost (MTU 65536), even 5KB frames fit in a single chunk, so the
// bug doesn't reproduce in the live-e2e Playwright tests. This test bypasses
// the kernel MTU by simulating fragmented delivery: open a raw TCP socket
// to the WS endpoint, complete the upgrade handshake, then send a single
// WS frame as TWO `socket.write()` calls separated by a tiny sleep — that
// forces the server's `socket.on("data")` to receive two chunks.
//
// Test contract:
//   - SMALL frame (test2-size) sent atomically → server-recv appears. (sanity)
//   - LARGE frame (xrandrv2-size) sent fragmented → server-recv DOES NOT
//     appear within 2s. (proves the bug)
//
// This test must FAIL on master 0283ee8 if the hypothesis is correct.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SERVER_MJS = path.join(ROOT, "server.mjs");

// ---------- helpers ----------

function encodeClientWebSocketTextFrame(text) {
  // RFC 6455 client → server text frame (must be masked).
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + opcode text
    header[1] = 0x80 | len; // masked + length
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([header, mask, masked]);
}

function buildAlignGridSnapshotFrame(profile, dim) {
  // Match server.mjs validateAlignGridSnapshotPayload shape.
  const srcXs = [];
  const srcYs = [];
  for (let i = 0; i < dim; i++) {
    srcXs.push(i / (dim - 1));
    srcYs.push(i / (dim - 1));
  }
  const points = [];
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      points.push({ row: r, col: c, x: srcXs[c], y: srcYs[r] });
    }
  }
  const mutationId = `align-grid-snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const json = JSON.stringify({
    type: "live-mutation",
    mutationId,
    mutationType: "align-grid-snapshot",
    payload: { srcXs, srcYs, points, profileId: profile },
    clientSentAt: new Date().toISOString(),
  });
  return { frame: encodeClientWebSocketTextFrame(json), json, mutationId };
}

function findFreePort(startAt = 4801) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const srv = net.createServer();
      srv.unref();
      srv.once("error", () => {
        if (port < startAt + 200) tryPort(port + 1);
        else reject(new Error("no port"));
      });
      srv.listen(port, "127.0.0.1", () => {
        const p = srv.address().port;
        srv.close(() => resolve(p));
      });
    };
    tryPort(startAt);
  });
}

async function spawnServer(port) {
  const stdoutChunks = [];
  const stderrChunks = [];
  const proc = spawn(process.execPath, [SERVER_MJS], {
    env: { ...process.env, PORT: String(port) },
    cwd: ROOT,
  });
  proc.stdout.on("data", (b) => stdoutChunks.push(b));
  proc.stderr.on("data", (b) => stderrChunks.push(b));
  for (let i = 0; i < 60; i++) {
    await delay(250);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/live/snapshot`);
      if (r.ok) break;
    } catch { /* keep trying */ }
  }
  return {
    proc,
    stdout: () => Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: () => Buffer.concat(stderrChunks).toString("utf8"),
    async stop() {
      proc.kill("SIGTERM");
      for (let i = 0; i < 20; i++) {
        if (proc.exitCode != null) break;
        await delay(100);
      }
      if (proc.exitCode == null) proc.kill("SIGKILL");
    },
  };
}

async function openWsAsFinalOutput(port) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(port, "127.0.0.1");
    const key = crypto.randomBytes(16).toString("base64");
    const req = [
      "GET /api/live/ws?role=final-output HTTP/1.1",
      `Host: 127.0.0.1:${port}`,
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Key: ${key}`,
      "Sec-WebSocket-Version: 13",
      "",
      "",
    ].join("\r\n");
    let buf = Buffer.alloc(0);
    let handshakeDone = false;
    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!handshakeDone) {
        const idx = buf.indexOf("\r\n\r\n");
        if (idx >= 0) {
          handshakeDone = true;
          const header = buf.slice(0, idx).toString("utf8");
          buf = buf.slice(idx + 4);
          if (!header.includes("101 ")) {
            reject(new Error("WS handshake failed: " + header));
            return;
          }
          sock.off("data", onData);
          resolve(sock);
        }
      }
    };
    sock.on("data", onData);
    sock.on("error", reject);
    sock.write(req);
  });
}

// ---------- tests ----------

test("phase-38-w10: SMALL ws frame sent atomically reaches server-recv", async (t) => {
  const port = await findFreePort();
  const srv = await spawnServer(port);
  t.after(() => srv.stop());
  const sock = await openWsAsFinalOutput(port);
  t.after(() => sock.destroy());

  // Wait for live-hello envelope from server (drain — we don't need to parse it)
  await delay(200);

  const { frame, mutationId } = buildAlignGridSnapshotFrame("w10-small", 3);
  console.log(`[w10-test] sending SMALL frame: ${frame.length} bytes mutationId=${mutationId}`);
  sock.write(frame); // atomic single write

  // Wait up to 2s for server-recv log
  const deadline = Date.now() + 2000;
  let found = false;
  while (Date.now() < deadline) {
    await delay(100);
    if (srv.stdout().includes(`profile=w10-small`)) {
      found = true;
      break;
    }
  }
  assert.equal(found, true,
    `SMALL frame should produce server-recv profile=w10-small.\n` +
    `stdout:\n${srv.stdout().split("\n").filter((l) => l.includes("align-grid-snapshot") || l.includes("w10-")).slice(-10).join("\n")}`,
  );
});

test("phase-38-w10: LARGE ws frame sent FRAGMENTED across two TCP writes is reassembled", async (t) => {
  const port = await findFreePort();
  const srv = await spawnServer(port);
  t.after(() => srv.stop());
  const sock = await openWsAsFinalOutput(port);
  t.after(() => sock.destroy());

  await delay(200);

  // Build a 9×9 frame (xrandrv2-size).
  const { frame, mutationId } = buildAlignGridSnapshotFrame("w10-large-frag", 9);
  console.log(`[w10-test] LARGE frame is ${frame.length} bytes mutationId=${mutationId}`);
  assert.ok(frame.length > 2000, "expected LARGE frame > 2KB to mimic xrandrv2");

  // Split the frame at the midpoint and write each half separately with a
  // tiny pause. This forces the server's `socket.on("data")` to fire TWICE
  // for the same WS frame (mimics MTU-1500 fragmentation on real Ethernet).
  const mid = Math.floor(frame.length / 2);
  const half1 = frame.subarray(0, mid);
  const half2 = frame.subarray(mid);
  console.log(`[w10-test] writing half1=${half1.length} bytes`);
  sock.write(half1);
  await delay(5); // tiny pause to force the OS to deliver as separate chunks
  console.log(`[w10-test] writing half2=${half2.length} bytes`);
  sock.write(half2);

  // Wait up to 2s for server-recv log
  const deadline = Date.now() + 2000;
  let found = false;
  while (Date.now() < deadline) {
    await delay(100);
    if (srv.stdout().includes(`profile=w10-large-frag`)) {
      found = true;
      break;
    }
  }
  console.log(
    `[w10-test] post-frag stdout (filtered):\n` +
    srv.stdout().split("\n").filter((l) =>
      l.includes("align-grid-snapshot") || l.includes("w10-") || l.includes("invalid-ws-frame") || l.includes("malformed")
    ).slice(-15).join("\n"),
  );

  // Post-fix expectation: the server's reassembly buffer accumulates bytes
  // across socket.on("data") events and the LARGE frame is decoded once
  // both halves have arrived. server-recv MUST appear.
  //
  // This assertion FAILED on master 0283ee8 — proving the bug. Now passes
  // with the streaming-decoder fix (server.mjs:1485 tryDecodeWebSocketFrame +
  // per-socket recvBuf drain loop).
  assert.equal(found, true,
    `Post-fix expectation: fragmented WS frame should be reassembled and ` +
    `server-recv profile=w10-large-frag should appear within 2s. ` +
    `If this fails, the W10 streaming WS decoder regressed.\n` +
    srv.stdout().split("\n").filter((l) =>
      l.includes("align-grid-snapshot") || l.includes("w10-") ||
      l.includes("invalid-ws-frame") || l.includes("malformed")
    ).slice(-15).join("\n"),
  );
});


// Phase 38 W10 — additional fragmentation patterns that should ALL succeed
// with the streaming decoder. These exercise the worst-case TCP delivery
// patterns the operator's Pi → server LAN would create.

test("phase-38-w10: LARGE ws frame sent byte-by-byte still reassembles", async (t) => {
  const port = await findFreePort();
  const srv = await spawnServer(port);
  t.after(() => srv.stop());
  const sock = await openWsAsFinalOutput(port);
  t.after(() => sock.destroy());
  await delay(200);

  const { frame } = buildAlignGridSnapshotFrame("w10-bytebyte", 9);
  // Write the frame one byte at a time — the most aggressive fragmentation
  // pattern. Forces the decoder to handle 'need-more' for every byte until
  // the full frame is buffered.
  for (let i = 0; i < frame.length; i++) {
    sock.write(frame.subarray(i, i + 1));
    if (i % 256 === 0) await delay(1); // periodic yield to drain
  }

  const deadline = Date.now() + 3000;
  let found = false;
  while (Date.now() < deadline) {
    await delay(100);
    if (srv.stdout().includes(`profile=w10-bytebyte`)) { found = true; break; }
  }
  assert.equal(found, true,
    `byte-by-byte fragmentation should reassemble.\n` +
    srv.stdout().split("\n").filter((l) =>
      l.includes("align-grid-snapshot") || l.includes("w10-")
    ).slice(-10).join("\n"),
  );
});


test("phase-38-w10: TWO frames concatenated in one TCP write are both decoded", async (t) => {
  const port = await findFreePort();
  const srv = await spawnServer(port);
  t.after(() => srv.stop());
  const sock = await openWsAsFinalOutput(port);
  t.after(() => sock.destroy());
  await delay(200);

  // Build two frames: one align-grid-snapshot, one with distinct content.
  // Use DIFFERENT dimensions so server-recv logs distinguishable corners.
  // (align-grid-snapshot mutations from the same client coalesce on the
  // server queue — last writer wins — so we can only observe the LATEST
  // applied mutation. We assert the SECOND one is applied; the absence of
  // an `invalid-ws-frame` log proves BOTH were decoded.)
  const f1 = buildAlignGridSnapshotFrame("w10-batch-first", 3);
  const f2 = buildAlignGridSnapshotFrame("w10-batch-second", 4);
  // Atomic single write of both frames concatenated. Without buffer drain
  // logic, the pre-W10 decoder consumed only one frame per chunk and the
  // remaining bytes were silently dropped on the next `data` event (no
  // accumulator). With the streaming decoder, the loop yields both frames.
  sock.write(Buffer.concat([f1.frame, f2.frame]));

  const deadline = Date.now() + 3000;
  let foundSecond = false;
  while (Date.now() < deadline) {
    await delay(80);
    if (srv.stdout().includes("profile=w10-batch-second")) {
      foundSecond = true;
      break;
    }
  }
  const stdout = srv.stdout();
  // Server should not have logged any frame decode errors.
  assert.equal(
    stdout.includes("frame-decode-failed"), false,
    `no frame-decode-failed should occur with valid concatenated frames`,
  );
  assert.ok(
    foundSecond,
    `second concatenated frame should be applied (last-writer-wins coalesce). ` +
    `If this fails, the streaming decoder did not advance past frame #1 correctly.\n` +
    stdout.split("\n").filter((l) =>
      l.includes("align-grid-snapshot") || l.includes("w10-")
    ).slice(-10).join("\n"),
  );
});
