import { jpegDimensions } from "./output-camera-upload.mjs";

const MAX_PREVIEW_BYTES = 3 * 1024 * 1024;
const MAX_ANNOTATION_AGE_MS = 6000;
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const BOARD_CLASSES = new Set(["noise", "fire", "malfunction", "alien", "character", "hand", "track-marker"]);

export function isLocalCameraRequest(req) {
  const { host, forwarded, "x-forwarded-for": forwardedFor, "x-forwarded-host": forwardedHost } = req.headers;
  return LOOPBACK.has(req.socket.remoteAddress) && !forwarded && !forwardedFor && !forwardedHost &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host ?? "");
}

export function cameraFrameId(frame) {
  return `${Date.parse(frame.receivedAt)}-${frame.generation}-${frame.sequence}`;
}

export function sendCameraFrame(res, frame, after) {
  const frameId = frame.id ?? cameraFrameId(frame);
  if (frameId === after) {
    res.writeHead(204).end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "image/jpeg",
    "Content-Length": frame.jpeg.length,
    "X-Camera-Sequence": frame.sequence,
    "X-Camera-Frame-Id": frameId,
    ...frame.headers,
  }).end(frame.jpeg);
}

export function createCameraVision(cameraInput) {
  let preview;
  let pending = false;
  const objectFrames = new Map();
  const sourceFrames = new Map();

  function freshFrame(id) {
    const parts = /^([0-9]{13})-([0-9]+)-([0-9]+)$/.exec(id ?? "");
    if (!parts) return null;
    const [sourceTime, generation, sequence] = parts.slice(1).map(Number);
    const source = cameraInput.latestFrame();
    if (!source || source.generation !== generation || Date.now() - sourceTime > MAX_ANNOTATION_AGE_MS ||
        sourceTime > Date.parse(source.receivedAt) || sequence < 1 || sequence > source.sequence) return null;
    return { generation, sequence };
  }

  function rect(value) {
    return Array.isArray(value) && value.length === 4 && value.every(x => Number.isFinite(x) && x >= 0 && x <= 1)
      && value[2] > 0 && value[3] > 0 && value[0] + value[2] <= 1.000001 && value[1] + value[3] <= 1.000001;
  }

  return {
    rememberSource(frame) {
      sourceFrames.set(cameraFrameId(frame), frame);
      if (sourceFrames.size > 4) sourceFrames.delete(sourceFrames.keys().next().value);
    },

    sourceFor(id) {
      if (!freshFrame(id)) return null;
      const latest = cameraInput.latestFrame();
      return sourceFrames.get(id) ?? (latest && cameraFrameId(latest) === id ? latest : null);
    },

    objectsFor(id) {
      id ??= [...objectFrames.keys()].reverse().find(key => freshFrame(key));
      return freshFrame(id) ? objectFrames.get(id) ?? null : null;
    },

    publishObjects(payload) {
      const { frameId, classes, objects, coverage } = payload ?? {};
      if (typeof frameId !== "string" || !Array.isArray(classes) || !classes.length || classes.length > BOARD_CLASSES.size ||
          new Set(classes).size !== classes.length || !classes.every(kind => BOARD_CLASSES.has(kind)) ||
          !rect(coverage) || !Array.isArray(objects) || objects.length > 256 || objects.some(item =>
            !item || !classes.includes(item.kind) || !Number.isFinite(item.confidence) ||
            item.confidence < 0 || item.confidence > 1 || !rect(item.box) || !Array.isArray(item.anchor) ||
            item.anchor.length !== 2 || !item.anchor.every((v, i) => Number.isFinite(v) &&
              v >= item.box[i] - 1e-6 && v <= item.box[i] + item.box[i + 2] + 1e-6))) return 400;
      if (!freshFrame(frameId) || objectFrames.has(frameId)) return 409;
      objectFrames.set(frameId, { frameId, classes, coverage, objects: objects.map(({ kind, confidence, box, anchor }) =>
        ({ kind, confidence, box, anchor })) });
      if (objectFrames.size > 4) objectFrames.delete(objectFrames.keys().next().value);
      return 204;
    },

    latestFrame() {
      const source = cameraInput.latestFrame();
      if (!preview || !source || source.generation !== preview.generation ||
          Date.now() - preview.sourceTime > MAX_ANNOTATION_AGE_MS) {
        return null;
      }
      return preview;
    },

    async publish(req, readRawBody) {
      if (req.headers.origin !== undefined) return 403;
      if (req.headers["content-type"] !== "image/jpeg") return 415;
      const size = Number(req.headers["content-length"]);
      if (!Number.isSafeInteger(size) || size < 16 || size > MAX_PREVIEW_BYTES) return 413;
      const id = req.headers["x-camera-frame-id"];
      const parts = /^(\d{13})-(\d+)-(\d+)$/.exec(id ?? "");
      const sourceTime = Number(parts?.[1]);
      const generation = Number(parts?.[2]);
      const sequence = Number(parts?.[3]);
      const model = req.headers["x-vision-model"];
      const weights = req.headers["x-vision-weights"];
      const device = req.headers["x-vision-device"];
      const count = Number(req.headers["x-vision-count"]);
      const masks = Number(req.headers["x-vision-masks"]);
      const elapsed = Number(req.headers["x-vision-ms"]);
      const coverage = req.headers["x-vision-coverage"]?.split(",").map(Number);
      if (!parts || !Number.isSafeInteger(sequence) || sequence < 1 ||
          !/^(seg-nano|seg-large|seg-2xlarge|large)$/.test(model ?? "") ||
          !/^(pretrained|checkpoint)$/.test(weights ?? "") || !/^(cpu|cuda)$/.test(device ?? "") ||
          !Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(masks) || masks < 0 || masks > count ||
          !Number.isFinite(elapsed) || elapsed < 0 || (coverage && !rect(coverage))) return 400;
      if (pending) return 429;

      pending = true;
      const timeout = setTimeout(() => req.destroy(), 3000);
      timeout.unref();
      try {
        const jpeg = await readRawBody(req, { maxBytes: MAX_PREVIEW_BYTES });
        if (jpeg.length !== size || !jpegDimensions(jpeg)) return 400;
        const source = cameraInput.latestFrame();
        if (!source || source.generation !== generation || Date.now() - sourceTime > MAX_ANNOTATION_AGE_MS ||
            sourceTime > Date.parse(source.receivedAt) || sequence > source.sequence ||
            (preview && sequence <= preview.sequence)) return 409;
        preview = {
          id, sequence, sourceTime, generation, jpeg,
          headers: {
            "X-Vision-Count": count, "X-Vision-Masks": masks, "X-Vision-MS": elapsed,
            "X-Vision-Model": model, "X-Vision-Weights": weights, "X-Vision-Device": device,
            ...(coverage && { "X-Vision-Coverage": coverage.join(",") }),
          },
        };
        return 204;
      } catch {
        return 400;
      } finally {
        clearTimeout(timeout);
        pending = false;
      }
    },
  };
}
