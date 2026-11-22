import { setTimeout as wait } from "node:timers/promises";

const MAX_HEADER_BYTES = 8 * 1024;
const MAX_JPEG_BYTES = 8 * 1024 * 1024;
const HEADER_END = Buffer.from("\r\n\r\n");
const JPEG_END = Buffer.from([0xff, 0xd9]);

function getBoundary(contentType) {
  const value = contentType ?? "";
  const match = /;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(value);
  const boundary = match?.[1] ?? match?.[2];
  if (!/^multipart\/x-mixed-replace(?:\s*;|$)/i.test(value) ||
      !boundary || boundary.length > 70 || /[\r\n]/.test(boundary)) {
    throw new Error("Expected a multipart MJPEG response");
  }
  return "--" + boundary;
}

function parseFrameHeader(text, boundary) {
  const [delimiter, ...lines] = text.trimStart().split("\r\n");
  if (delimiter !== boundary) throw new Error("Unexpected MJPEG boundary");

  const headers = new Map();
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      headers.set(line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim());
    }
  }
  const size = Number(headers.get("content-length"));
  if (headers.get("content-type")?.toLowerCase() !== "image/jpeg" ||
      !Number.isSafeInteger(size) || size < 4 || size > MAX_JPEG_BYTES) {
    throw new Error("Invalid JPEG part or size");
  }
  const online = headers.get("x-ustreamer-online");
  if (online !== "true" && online !== "false") {
    throw new Error("Missing or invalid uStreamer source status");
  }
  const width = Number(headers.get("x-ustreamer-width"));
  const height = Number(headers.get("x-ustreamer-height"));
  if (online === "true" && ![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n <= 16384)) {
    throw new Error("Invalid uStreamer frame dimensions");
  }
  const grabTime = Number(headers.get("x-ustreamer-grab-begin-time"));
  return {
    size, width, height, online: online === "true",
    grabTime: Number.isFinite(grabTime) && grabTime > 0 ? grabTime : null,
  };
}

// uStreamer sends Content-Length for every part. Copy each JPEG once even
// when a single image spans many TCP chunks. Offline placeholders are skipped.
async function* readFrames(reader, boundary) {
  let header = Buffer.alloc(0);
  let part = null;
  for (;;) {
    const { done, value: bytes } = await reader.read();
    if (done) return;
    const chunk = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;
    while (offset < chunk.length) {
      if (part) {
        const length = Math.min(part.size - part.read, chunk.length - offset);
        part.jpeg?.set(chunk.subarray(offset, offset + length), part.read);
        part.read += length;
        offset += length;
        if (part.read === part.size) {
          yield part;
          part = null;
        }
        continue;
      }

      const end = Math.min(offset + MAX_HEADER_BYTES - header.length, chunk.length);
      const prefix = chunk.subarray(offset, end);
      const data = header.length === 0 ? prefix : Buffer.concat([header, prefix]);
      const separator = data.indexOf(HEADER_END);
      if (separator < 0) {
        if (data.length >= MAX_HEADER_BYTES) throw new Error("MJPEG header exceeds size limit");
        header = Buffer.from(data);
        offset = end;
        continue;
      }

      offset += separator + HEADER_END.length - header.length;
      part = parseFrameHeader(data.toString("ascii", 0, separator), boundary);
      part.read = 0;
      part.jpeg = part.online ? Buffer.allocUnsafe(part.size) : null;
      header = Buffer.alloc(0);
    }
  }
}

function normalizeCameraUrl(value) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    url.searchParams.set("extra_headers", "1");
    url.searchParams.delete("advance_headers");
    url.searchParams.delete("zero_data");
    return url;
  } catch {
    return null;
  }
}

export function createCameraReceiver({
  sourceUrl,
  timeoutMs = 3000,
  retryMs = 750,
} = {}) {
  const url = normalizeCameraUrl(sourceUrl);
  let status = url ? "connecting" : sourceUrl ? "invalid-config" : "disabled";
  let detail = status === "invalid-config" ? "Set an HTTP(S) uStreamer stream URL without credentials" : null;
  let framesReceived = 0;
  let frame = null;
  let controller = null;
  let task = null;
  let rate = null;

  function latestFrame() {
    return frame && performance.now() - frame.arrival < timeoutMs ? frame : null;
  }

  async function receive(signal) {
    while (!signal.aborted) {
      status = "connecting";
      const connection = new AbortController();
      const requestSignal = AbortSignal.any([signal, connection.signal]);
      let reader;
      let timer;
      const cancelRead = () => { void reader?.cancel().catch(() => {}); };
      function refreshTimeout() {
        clearTimeout(timer);
        timer = setTimeout(() => connection.abort(new Error("Camera stream timed out")), timeoutMs);
        timer.unref();
      }
      refreshTimeout();
      let previousGrab = null;
      let intervalStart = performance.now();
      let intervalFrames = 0;
      let intervalBytes = 0;
      try {
        const response = await fetch(url, {
          redirect: "error",
          signal: requestSignal,
        }).catch(() => {
          throw connection.signal.reason ?? new Error("Could not connect to the camera stream");
        });
        if (!response.ok || !response.body) throw new Error("Camera HTTP status " + response.status);
        const boundary = getBoundary(response.headers.get("content-type"));
        reader = response.body.getReader();
        requestSignal.addEventListener("abort", cancelRead, { once: true });
        for await (const part of readFrames(reader, boundary)) {
          refreshTimeout();
          if (!part.online) {
            frame = null;
            rate = null;
            previousGrab = null;
            intervalStart = performance.now();
            intervalFrames = 0;
            intervalBytes = 0;
            status = "source-offline";
            detail = null;
            continue;
          }
          if (part.grabTime !== null && previousGrab !== null && part.grabTime <= previousGrab) continue;
          if (part.jpeg[0] !== 0xff || part.jpeg[1] !== 0xd8 || !part.jpeg.includes(JPEG_END, 2)) {
            throw new Error("Invalid JPEG data");
          }
          previousGrab = part.grabTime;
          if (!frame) intervalStart = performance.now();
          const arrival = performance.now();
          frame = {
            jpeg: part.jpeg, width: part.width, height: part.height,
            sequence: ++framesReceived, arrival, receivedAt: new Date().toISOString(),
          };
          status = "streaming";
          detail = null;
          intervalFrames++;
          intervalBytes += part.size;
          const elapsedMs = arrival - intervalStart;
          if (elapsedMs >= 1000) {
            rate = {
              fps: Math.round(intervalFrames * 10000 / elapsedMs) / 10,
              megabitsPerSecond: Math.round(intervalBytes * 8 / elapsedMs) / 1000,
            };
            intervalStart = arrival;
            intervalFrames = 0;
            intervalBytes = 0;
          }
        }
        throw new Error("Camera stream ended");
      } catch (error) {
        frame = null;
        rate = null;
        if (signal.aborted) break;
        status = "retrying";
        detail = connection.signal.reason?.message ?? error.message;
      } finally {
        clearTimeout(timer);
        connection.abort();
        requestSignal.removeEventListener("abort", cancelRead);
        reader?.releaseLock();
      }
      if (!signal.aborted) await wait(retryMs, null, { signal, ref: false }).catch(() => {});
    }
  }

  return {
    start() {
      if (!url || task) return;
      controller = new AbortController();
      task = receive(controller.signal);
    },
    async stop() {
      if (!task) return;
      controller.abort();
      await task;
      task = null;
      status = "stopped";
      frame = null;
      rate = null;
      detail = null;
    },
    latestFrame,
    snapshot() {
      const freshFrame = latestFrame();
      return {
        status: status === "streaming" && !freshFrame ? "stale" : status,
        detail,
        framesReceived,
        frame: freshFrame ? {
          sequence: freshFrame.sequence, width: freshFrame.width, height: freshFrame.height,
          receivedAt: freshFrame.receivedAt, ageMs: Math.round(performance.now() - freshFrame.arrival),
        } : null,
        rate: freshFrame ? rate : null,
      };
    },
  };
}
