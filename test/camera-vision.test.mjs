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

test("structured game detections stay attached to a recent camera frame and reject invalid anchors", () => {
  let source = cameraFrame(10);
  const vision = createCameraVision({ latestFrame: () => source });
  const shape = { frameId: cameraFrameId(source), classes: ["fire", "character", "alien", "dice"], coverage: [0, 0, 1, 1],
    objects: [{ kind: "alien", confidence: 0.8, box: [0.1, 0.2, 0.3, 0.3], anchor: [0.2, 0.42] },
      { kind: "dice", confidence: 0.9, box: [0.6, 0.3, 0.03, 0.04], anchor: [0.615, 0.32] }] };
  assert.equal(vision.publishObjects(shape), 204);
  assert.deepEqual(vision.objectsFor(shape.frameId), shape);
  assert.deepEqual(vision.objectsFor(), shape);
  assert.equal(vision.publishObjects(shape), 409);
  assert.equal(vision.publishObjects({ ...shape, objects: [{ ...shape.objects[0], anchor: [1, 1] }] }), 400);
  source = cameraFrame(12, 2);
  assert.equal(vision.objectsFor(shape.frameId), null);
});

test("original frames can be recovered by id for exact preview overlays", () => {
  let source = cameraFrame(1);
  const vision = createCameraVision({ latestFrame: () => source });
  const original = source;
  vision.rememberSource(original);
  source = cameraFrame(2);
  assert.equal(vision.sourceFor(cameraFrameId(original)), original);
  assert.equal(vision.sourceFor(cameraFrameId(source)), source);
  source = cameraFrame(3, 2);
  assert.equal(vision.sourceFor(cameraFrameId(original)), null);
});

test("camera previews do not evict a frame still needed by inference", () => {
  let source = cameraFrame(1);
  const vision = createCameraVision({ latestFrame: () => source });
  const original = source;
  vision.rememberSource(original, { inference: true });
  for (let sequence = 2; sequence <= 10; sequence++) {
    source = cameraFrame(sequence);
    vision.rememberSource(source);
  }
  assert.equal(vision.sourceFor(cameraFrameId(cameraFrame(2))), null);
  assert.equal(vision.publishObjects({ frameId: cameraFrameId(original), classes: ["fire"],
    coverage: [0, 0, 1, 1], objects: [] }), 204);
  assert.equal(vision.sourceFor(cameraFrameId(original)), original);
  source = cameraFrame(1, 2);
  assert.equal(vision.sourceFor(cameraFrameId(original)), null);
});
