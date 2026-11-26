import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { createOutputCameraUpload } from "../src/server/output-camera-upload.mjs";

// SOI, baseline SOF with 3840x2160 dimensions, EOI.
const jpeg = Buffer.from("ffd8ffc0000b0808700f0001011100ffd9", "hex");
const address = "192.0.2.29";

function request(remoteAddress = address, headers = {}) {
  return {
    socket: { remoteAddress },
    headers: {
      host: "192.0.2.80:4173",
      origin: "http://192.0.2.80:4173",
      "content-type": "image/jpeg",
      "content-length": String(jpeg.length),
      ...headers,
    },
  };
}

test("camera configuration and uploads are limited to the configured client and origin", async () => {
  const camera = createOutputCameraUpload({ address });
  const read = () => assert.fail("The body must not be read");
  assert.deepEqual(createOutputCameraUpload().config(request()), { enabled: false });
  assert.deepEqual(camera.config(request("192.0.2.21")), { enabled: false });
  assert.deepEqual(camera.config(request("::ffff:" + address)), { enabled: true, fps: 2 });
  assert.equal((await camera.upload(request("192.0.2.21"), read)).code, 403);
  assert.equal((await camera.upload(request(address, { origin: "http://example.com" }), read)).code, 403);
  assert.equal((await camera.upload(request(address, { "content-type": "text/plain" }), read)).code, 415);
  assert.equal((await camera.upload(request(address, { "content-length": String(9 * 1024 * 1024) }), read)).code, 413);
});

test("only complete, fresh camera frames become available to consumers", async () => {
  const camera = createOutputCameraUpload({ address, staleMs: 35 });
  assert.equal(camera.snapshot().status, "waiting");
  assert.equal((await camera.upload(request(), async () => Buffer.alloc(jpeg.length))).code, 400);

  let finish;
  const upload = camera.upload(request(), () => new Promise((resolve) => { finish = resolve; }));
  assert.equal((await camera.upload(request(), () => assert.fail())).code, 429);
  finish(jpeg);
  assert.equal((await upload).code, 204);
  assert.equal(camera.latestFrame().jpeg, jpeg);
  const { frame, status, framesReceived } = camera.snapshot();
  assert.equal(status, "streaming");
  assert.equal(framesReceived, 1);
  assert.equal(frame.width, 3840);
  assert.equal(frame.height, 2160);
  assert.equal(frame.sequence, 1);

  await sleep(45);
  assert.equal(camera.latestFrame(), null);
  assert.equal(camera.snapshot().status, "stale");
});
