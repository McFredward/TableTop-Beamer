import { isIP } from "node:net";

const MAX_BYTES = 8 * 1024 * 1024;
const FRAMES_PER_SECOND = 2;
const JPEG_SIZE_MARKERS = new Set([0xc0, 0xc1, 0xc2]);

export function jpegDimensions(jpeg) {
  if (jpeg.length < 16 || jpeg.readUInt16BE(0) !== 0xffd8 ||
      jpeg.readUInt16BE(jpeg.length - 2) !== 0xffd9) return null;

  // The browser encodes ordinary baseline JPEG. Read its size before the scan.
  for (let offset = 2; offset + 4 <= jpeg.length;) {
    if (jpeg[offset++] !== 0xff) return null;
    while (jpeg[offset] === 0xff) offset++;
    const marker = jpeg[offset++];
    if (marker === 0xda || offset + 2 > jpeg.length) return null;
    const length = jpeg.readUInt16BE(offset);
    if (length < 2 || offset + length > jpeg.length) return null;
    if (JPEG_SIZE_MARKERS.has(marker)) {
      if (length < 8) return null;
      const height = jpeg.readUInt16BE(offset + 3);
      const width = jpeg.readUInt16BE(offset + 5);
      return width && height && width <= 4096 && height <= 4096 &&
        width * height <= 3840 * 2160 ? { width, height } : null;
    }
    offset += length;
  }
  return null;
}

export function createOutputCameraUpload({ address, staleMs = 3000 } = {}) {
  const ipv4 = address?.trim();
  const enabled = isIP(ipv4) === 4;
  let frame = null;
  let framesReceived = 0;
  let generation = 0;
  let pending = false;
  let rate = null;
  let intervalStart = 0;
  let intervalFrames = 0;
  let intervalBytes = 0;

  function isAllowed(req) {
    const peer = req.socket.remoteAddress?.replace(/^::ffff:/i, "");
    return enabled && ipv4 === peer;
  }

  function latestFrame() {
    return frame && performance.now() - frame.arrival < staleMs ? frame : null;
  }

  async function upload(req, readRawBody) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (!isAllowed(req) || !host || (origin !== "http://" + host && origin !== "https://" + host)) {
      return { code: 403, error: "Camera upload is not allowed for this client" };
    }
    if (req.headers["content-type"] !== "image/jpeg") {
      return { code: 415, error: "Expected image/jpeg" };
    }
    const length = Number(req.headers["content-length"]);
    if (!Number.isSafeInteger(length) || length < 16 || length > MAX_BYTES) {
      return { code: 413, error: "Invalid camera frame size" };
    }
    if (pending) return { code: 429, error: "A camera frame is being received" };

    pending = true;
    const timeout = setTimeout(() => req.destroy(), staleMs);
    timeout.unref();
    try {
      const jpeg = await readRawBody(req, { maxBytes: MAX_BYTES });
      const dimensions = jpegDimensions(jpeg);
      if (jpeg.length !== length || !dimensions) return { code: 400, error: "Invalid camera JPEG" };
      const arrival = performance.now();
      if (!latestFrame()) {
        generation++;
        intervalStart = arrival;
        intervalFrames = 0;
        intervalBytes = 0;
        rate = null;
      } else {
        intervalFrames++;
        intervalBytes += jpeg.length;
      }
      frame = { jpeg, ...dimensions, arrival, generation, sequence: ++framesReceived, receivedAt: new Date().toISOString() };
      const elapsed = arrival - intervalStart;
      if (elapsed >= 1000) {
        rate = {
          fps: Math.round(intervalFrames * 10000 / elapsed) / 10,
          megabitsPerSecond: Math.round(intervalBytes * 8 / elapsed) / 1000,
        };
        intervalStart = arrival;
        intervalFrames = 0;
        intervalBytes = 0;
      }
      return { code: 204 };
    } catch {
      return { code: 400, error: "Incomplete camera frame" };
    } finally {
      clearTimeout(timeout);
      pending = false;
    }
  }

  return {
    enabled,
    config(req) {
      return isAllowed(req) ? { enabled: true, fps: FRAMES_PER_SECOND } : { enabled: false };
    },
    upload,
    latestFrame,
    snapshot() {
      const fresh = latestFrame();
      return {
        source: "output-browser",
        status: fresh ? "streaming" : frame ? "stale" : "waiting",
        detail: null,
        framesReceived,
        frame: fresh && {
          sequence: fresh.sequence, width: fresh.width, height: fresh.height,
          receivedAt: fresh.receivedAt, ageMs: Math.round(performance.now() - fresh.arrival),
        },
        rate: fresh ? rate : null,
      };
    },
  };
}
