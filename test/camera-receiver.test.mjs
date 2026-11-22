import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout as wait } from "node:timers/promises";
import { test } from "node:test";
import { createCameraReceiver } from "../src/server/camera-receiver.mjs";

const jpeg = Buffer.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);

function writeFrame(response, { online = true, grab = 1 } = {}) {
  const part = Buffer.concat([
    Buffer.from([
      "--camera",
      "Content-Type: image/jpeg",
      "Content-Length: " + jpeg.length,
      "X-UStreamer-Online: " + online,
      "X-UStreamer-Width: 3840",
      "X-UStreamer-Height: 2160",
      "X-UStreamer-Grab-Begin-Time: " + grab,
    ].join("\r\n") + "\r\n\r\n"),
    jpeg,
    Buffer.from("\r\n"),
  ]);
  for (let offset = 0; offset < part.length; offset += 9) {
    response.write(part.subarray(offset, offset + 9));
  }
}

async function eventually(predicate) {
  const deadline = performance.now() + 2500;
  while (performance.now() < deadline) {
    if (predicate()) return;
    await wait(10);
  }
  assert.fail("Camera receiver did not reach the expected state");
}

async function withCamera(t, { timeoutMs = 300 } = {}) {
  let response;
  let requests = 0;
  let requestedUrl;
  const server = createServer((request, stream) => {
    requests++;
    requestedUrl = request.url;
    response = stream;
    stream.writeHead(200, { "Content-Type": 'multipart/x-mixed-replace; boundary="camera"' });
    stream.flushHeaders();
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const receiver = createCameraReceiver({
    sourceUrl: "http://127.0.0.1:" + server.address().port + "/stream",
    timeoutMs,
    retryMs: 25,
  });
  t.after(async () => {
    await receiver.stop();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  receiver.start();
  await eventually(() => requests > 0);
  return { receiver, response: () => response, requests: () => requests, url: () => requestedUrl };
}

test("retains the newest complete JPEG and rejects placeholders and repeated captures", async t => {
  const camera = await withCamera(t);
  const { receiver } = camera;
  assert.equal(camera.url(), "/stream?extra_headers=1");

  writeFrame(camera.response(), { grab: 10 });
  writeFrame(camera.response(), { grab: 11 });
  await eventually(() => receiver.snapshot().framesReceived === 2);
  assert.deepEqual(receiver.latestFrame().jpeg, jpeg);
  assert.equal(receiver.snapshot().frame.width, 3840);
  assert.equal(receiver.snapshot().frame.height, 2160);
  assert.equal(receiver.snapshot().frame.sequence, 2);

  // The transport keeps working while the camera capture timestamp is frozen.
  const timer = setInterval(() => writeFrame(camera.response(), { grab: 11 }), 35);
  try {
    await eventually(() => receiver.snapshot().status === "stale");
  } finally {
    clearInterval(timer);
  }
  assert.equal(receiver.snapshot().framesReceived, 2);
  assert.equal(receiver.latestFrame(), null);

  writeFrame(camera.response(), { online: false });
  await eventually(() => receiver.snapshot().status === "source-offline");
  assert.equal(receiver.latestFrame(), null);
  writeFrame(camera.response(), { grab: 12 });
  await eventually(() => receiver.snapshot().status === "streaming");
  assert.equal(receiver.snapshot().framesReceived, 3);
});

test("rejects a frame that never completes and reconnects to the source", async t => {
  const camera = await withCamera(t, { timeoutMs: 150 });
  const { receiver } = camera;
  writeFrame(camera.response(), { online: false });
  await eventually(() => receiver.snapshot().status === "source-offline");
  camera.response().write(
    "--camera\r\nContent-Type: image/jpeg\r\nContent-Length: 8000\r\n" +
    "X-UStreamer-Online: true\r\nX-UStreamer-Width: 3840\r\nX-UStreamer-Height: 2160\r\n\r\n",
  );
  await eventually(() => camera.requests() >= 2);
  assert.equal(receiver.snapshot().framesReceived, 0);
  assert.equal(receiver.latestFrame(), null);
  writeFrame(camera.response(), { grab: 1 });
  await eventually(() => receiver.snapshot().framesReceived === 1);
});

test("a receiver without a camera URL stays disabled", () => {
  const receiver = createCameraReceiver();
  receiver.start();
  assert.equal(receiver.snapshot().status, "disabled");
  assert.equal(receiver.latestFrame(), null);
});
