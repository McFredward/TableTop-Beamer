import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF7_T7_OUTPUT ?? "debug/p9-hf7-t7-hf5-hf6-non-regression-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendCommand({ mutationType, payload, mutationId }) {
  const startedAt = Date.now();
  const { response, payload: ack } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "hf7-t7",
      mutationType,
      mutationId,
      payload,
    }),
  });
  if (response.status !== 202 || ack?.applied !== true || ack?.overflow === true || ack?.timeout === true) {
    throw new Error(`command ${mutationType} failed HF6 parity checks`);
  }
  return {
    ack,
    ackMs: Date.now() - startedAt,
  };
}

async function openSse() {
  const response = await fetch(`${BASE_URL}/api/final-stream/events`, {
    headers: { accept: "text/event-stream" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`stream subscribe failed (${response.status})`);
  }
  return {
    reader: response.body.getReader(),
    decoder: new TextDecoder(),
    buffer: "",
  };
}

async function readFrames(stream, count = 4, timeoutMs = 3000) {
  const startedAt = Date.now();
  const frames = [];
  while (Date.now() - startedAt < timeoutMs && frames.length < count) {
    const { done, value } = await stream.reader.read();
    if (done) {
      break;
    }
    stream.buffer += stream.decoder.decode(value, { stream: true });
    const chunks = stream.buffer.split("\n\n");
    stream.buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const lines = chunk.split("\n").map((line) => line.trimEnd());
      const eventLine = lines.find((line) => line.startsWith("event:"));
      if (!eventLine || eventLine.slice(6).trim() !== "frame") {
        continue;
      }
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      frames.push(JSON.parse(data || "{}"));
      if (frames.length >= count) {
        break;
      }
    }
  }
  return frames;
}

async function waitForVersion(stream, minVersion, timeoutMs = 2500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const frames = await readFrames(stream, 1, timeoutMs);
    const frame = frames[0];
    const version = Number(frame?.sourceVersion ?? 0);
    if (version >= minVersion) {
      return {
        waitMs: Date.now() - startedAt,
        version,
      };
    }
  }
  throw new Error(`no frame >= ${minVersion}`);
}

function frameContainsPurityViolation(frame) {
  const serialized = JSON.stringify(frame || {});
  if (serialized.includes("SERVER STREAM ACTIVE") || serialized.includes("roomLabel") || serialized.includes("final-stream-meta")) {
    return true;
  }
  const visual = frame?.visual;
  return visual && (Object.prototype.hasOwnProperty.call(visual, "mode") || Object.prototype.hasOwnProperty.call(visual, "roomLabel"));
}

async function main() {
  const stream = await openSse();
  try {
    const baselineFrames = await readFrames(stream, 4);
    const purityViolations = baselineFrames.filter(frameContainsPurityViolation).length;

    const animationId = `hf7-t7-${Date.now().toString(36)}`;
    const start = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf7-t7-start-${Date.now().toString(36)}`,
      payload: {
        action: "start",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
        animation: {
          id: animationId,
          scope: "global",
          type: "outside-space",
          boardId: "nemesis-board-a",
          assetType: "mp4",
          assetRef: "/resources/nemesis/animations/sandstorm.mp4",
          startedAtEpochMs: Date.now(),
        },
      },
    });
    const startVersion = Number(start.ack?.version ?? 0);
    const startFrame = await waitForVersion(stream, startVersion);

    const stop = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf7-t7-stop-${Date.now().toString(36)}`,
      payload: {
        action: "stop",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
      },
    });
    const stopVersion = Number(stop.ack?.version ?? 0);
    const stopFrame = await waitForVersion(stream, stopVersion);

    const result = {
      schema: "tt-beamer.p9-hf7-t7-hf5-hf6-non-regression.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      hf5: {
        inspectedFrames: baselineFrames.length,
        purityViolations,
      },
      hf6: {
        startAckMs: start.ackMs,
        stopAckMs: stop.ackMs,
        startStreamMs: startFrame.waitMs,
        stopStreamMs: stopFrame.waitMs,
        startVersion,
        stopVersion,
      },
    };

    result.pass =
      result.hf5.purityViolations === 0
      && result.hf6.startAckMs <= 700
      && result.hf6.stopAckMs <= 700
      && result.hf6.startStreamMs <= 1500
      && result.hf6.stopStreamMs <= 1500;

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("HF5/HF6 non-regression checks failed");
    }
  } finally {
    await stream.reader.cancel("hf7-t7-close").catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[p9-hf7-t7-hf5-hf6-non-regression] ${error.message}`);
  process.exitCode = 1;
});
