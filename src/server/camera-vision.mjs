import { jpegDimensions } from "./output-camera-upload.mjs";

const MAX_PREVIEW_BYTES = 3 * 1024 * 1024;
const MAX_ANNOTATION_AGE_MS = 6000;
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const MAX_MODELS = 16;
const DEFAULT_MODEL_ID = "default";
const MODEL_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const MODEL_HEARTBEAT_MS = 12_000;
const MODEL_ERROR_MS = 300_000;
const modelPhases = new Set(["starting", "loading", "preparing", "waiting-camera", "inference", "running", "reconnecting", "error", "stopped"]);
const modelErrors = new Set(["checkpoint", "dependencies", "device", "frame-size", "server", "worker"]);

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

export function createCameraVision(cameraInput, now = Date.now) {
  let preview;
  let pending = false;
  const objectFrames = new Map();
  const sourceFrames = new Map();
  const inferenceFrames = new Map();
  const modelActivity = new Map();

  function freshFrame(id) {
    const parts = /^([0-9]{13})-([0-9]+)-([0-9]+)$/.exec(id ?? "");
    if (!parts) return null;
    const [sourceTime, generation, sequence] = parts.slice(1).map(Number);
    const source = cameraInput.latestFrame();
    if (!source || source.generation !== generation || now() - sourceTime > MAX_ANNOTATION_AGE_MS ||
        sourceTime > Date.parse(source.receivedAt) || sequence < 1 || sequence > source.sequence) return null;
    return { generation, sequence };
  }

  function rect(value) {
    return Array.isArray(value) && value.length === 4 && value.every(x => Number.isFinite(x) && x >= 0 && x <= 1)
      && value[2] > 0 && value[3] > 0 && value[0] + value[2] <= 1.000001 && value[1] + value[3] <= 1.000001;
  }

  return {
    rememberSource(frame, { inference = false } = {}) {
      // The dashboard polls independently while the worker processes a frame.
      const frames = inference ? inferenceFrames : sourceFrames;
      frames.set(cameraFrameId(frame), frame);
      if (frames.size > 4) frames.delete(frames.keys().next().value);
    },

    sourceFor(id) {
      if (!freshFrame(id)) return null;
      const latest = cameraInput.latestFrame();
      return inferenceFrames.get(id) ?? sourceFrames.get(id) ?? (latest && cameraFrameId(latest) === id ? latest : null);
    },

    objectsFor(id, modelId) {
      if (id && !freshFrame(id)) return null;
      const feeds = modelId ? [objectFrames.get(modelId)] : [...objectFrames.values()].reverse();
      for (const feed of feeds) {
        const reading = id ? feed?.get(id) : [...(feed?.values() ?? [])].reverse().find(item => freshFrame(item.frameId));
        if (reading) return reading;
      }
      return null;
    },

    models() {
      return [...objectFrames.keys()].flatMap(id => {
        const latest = this.objectsFor(undefined, id);
        return latest ? [{ id, name: latest.modelName ?? id, classes: latest.classes }] : [];
      });
    },

    reportModelStatus({ modelId, phase, error } = {}) {
      if (typeof modelId !== "string" || !MODEL_ID.test(modelId) || !modelPhases.has(phase) ||
          (error !== undefined && (phase !== "error" || !modelErrors.has(error)))) return 400;
      modelActivity.delete(modelId);
      modelActivity.set(modelId, { phase, ...(error && { error }), at: now() });
      if (modelActivity.size > MAX_MODELS) modelActivity.delete(modelActivity.keys().next().value);
      return 204;
    },

    modelStatus(id) {
      const reading = this.objectsFor(undefined, id);
      if (reading) return { phase: "ready", ...(reading.modelName && { name: reading.modelName }) };
      const activity = modelActivity.get(id);
      if (!activity) {
        const previous = [...(objectFrames.get(id)?.values() ?? [])].at(-1);
        if (!previous) return { phase: "not-connected" };
        return { phase: now() - Number(previous.frameId.split("-")[0]) > MODEL_HEARTBEAT_MS ? "disconnected" : "stalled" };
      }
      const age = now() - activity.at;
      if (activity.phase === "error" && age < MODEL_ERROR_MS) return { phase: "error", error: activity.error };
      if (age > MODEL_HEARTBEAT_MS || activity.phase === "stopped") return { phase: "disconnected" };
      return { phase: activity.phase === "running" ? "stalled" : activity.phase };
    },

    publishObjects(payload) {
      const { frameId, classes, objects, coverage, modelId = DEFAULT_MODEL_ID, modelName } = payload ?? {};
      if (typeof frameId !== "string" || typeof modelId !== "string" || !MODEL_ID.test(modelId) ||
          (modelName !== undefined && (typeof modelName !== "string" || modelName.length > 120)) ||
          !Array.isArray(classes) || !classes.length || classes.length > 128 ||
          new Set(classes).size !== classes.length || !classes.every(kind => typeof kind === "string" && kind.trim() === kind &&
            kind.length > 0 && kind.length <= 80 && !/[\u0000-\u001f]/.test(kind)) ||
          !rect(coverage) || !Array.isArray(objects) || objects.length > 256 || objects.some(item =>
            !item || !classes.includes(item.kind) || !Number.isFinite(item.confidence) ||
            item.confidence < 0 || item.confidence > 1 || !rect(item.box) || !Array.isArray(item.anchor) ||
            item.anchor.length !== 2 || !item.anchor.every((v, i) => Number.isFinite(v) &&
              v >= item.box[i] - 1e-6 && v <= item.box[i] + item.box[i + 2] + 1e-6) ||
            (item.reclassifiedFrom !== undefined && (!classes.includes(item.reclassifiedFrom?.kind) ||
              item.reclassifiedFrom.kind === item.kind || !rect(item.reclassifiedFrom.box))))) return 400;
      const feed = objectFrames.get(modelId) ?? new Map();
      if (!freshFrame(frameId) || feed.has(frameId)) return 409;
      feed.set(frameId, { frameId, classes, coverage, ...(payload.modelId ? { modelId, modelName } : {}),
        objects: objects.map(({ kind, confidence, box, anchor, reclassifiedFrom }) => ({ kind, confidence, box, anchor,
          ...(reclassifiedFrom && { reclassifiedFrom: { kind: reclassifiedFrom.kind, box: reclassifiedFrom.box } }) })) });
      if (feed.size > 4) feed.delete(feed.keys().next().value);
      objectFrames.delete(modelId);
      objectFrames.set(modelId, feed);
      if (objectFrames.size > MAX_MODELS) objectFrames.delete(objectFrames.keys().next().value);
      return 204;
    },

    latestFrame() {
      const source = cameraInput.latestFrame();
      if (!preview || !source || source.generation !== preview.generation ||
          now() - preview.sourceTime > MAX_ANNOTATION_AGE_MS) {
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
