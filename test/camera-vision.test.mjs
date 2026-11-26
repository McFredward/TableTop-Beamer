import test from "node:test";
import assert from "node:assert/strict";
import { cameraFrameId, createCameraVision, isLocalCameraRequest } from "../src/server/camera-vision.mjs";

const jpeg = Buffer.from("ffd8ffc0000b0808700f0001011100ffd9", "hex");
const receivedAt = new Date().toISOString();

function cameraFrame(sequence, generation = 1) {
  return { sequence, generation, receivedAt, jpeg };
}

function prediction(frame, headers = {}) {
  return {
    socket: { remoteAddress: "127.0.0.1" },
    headers: {
      host: "127.0.0.1:4173",
      "content-type": "image/jpeg",
      "content-length": String(jpeg.length),
      "x-camera-frame-id": cameraFrameId(frame),
      "x-vision-model": "seg-2xlarge",
      "x-vision-weights": "pretrained",
      "x-vision-device": "cuda",
      "x-vision-count": "1",
      "x-vision-masks": "1",
      "x-vision-ms": "30.4",
      ...headers,
    },
  };
}

test("vision results retain their exact camera frame and expire across a camera reconnect", async () => {
  let source = cameraFrame(3);
  const vision = createCameraVision({ latestFrame: () => source });
  const parsedFrame = cameraFrame(2);
  const read = async () => jpeg;
  assert.equal(await vision.publish(prediction(parsedFrame), read), 204);
  assert.equal(vision.latestFrame().id, cameraFrameId(parsedFrame));
  assert.equal(vision.latestFrame().headers["X-Vision-Masks"], 1);
  assert.equal(await vision.publish(prediction(parsedFrame), read), 409);
  assert.equal(await vision.publish(prediction(cameraFrame(4)), read), 409);
  source = null;
  assert.equal(vision.latestFrame(), null);
  source = cameraFrame(4, 2);
  assert.equal(vision.latestFrame(), null);
  assert.equal(await vision.publish(prediction(cameraFrame(3)), read), 409);
  assert.equal(await vision.publish(prediction(source), read), 204);
});

test("only direct loopback clients can view the preview and a browser cannot publish it", async () => {
  const frame = cameraFrame(1);
  const req = prediction(frame);
  assert.equal(isLocalCameraRequest(req), true);
  assert.equal(isLocalCameraRequest({ ...req, socket: { remoteAddress: "192.0.2.3" } }), false);
  assert.equal(isLocalCameraRequest(prediction(frame, { host: "192.0.2.3:4173" })), false);
  assert.equal(isLocalCameraRequest(prediction(frame, { "x-forwarded-for": "192.0.2.3" })), false);
  const vision = createCameraVision({ latestFrame: () => frame });
  const withOrigin = prediction(frame, { origin: "http://127.0.0.1:4173" });
  assert.equal(await vision.publish(withOrigin, () => assert.fail()), 403);
});
