import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF7_T6_OUTPUT ?? "debug/p9-hf7-t6-control-determinism-matrix-output.json";
const ITERATIONS = Math.max(4, Number(process.env.TT_BEAMER_HF7_T6_ITERATIONS ?? 10));

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendCommand({ clientId, mutationType, payload, mutationId }) {
  const startedAt = Date.now();
  const { response, payload: ack } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId,
      mutationType,
      mutationId,
      payload,
    }),
  });
  if (response.status !== 202 || ack?.applied !== true || ack?.overflow === true || ack?.timeout === true) {
    throw new Error(`command ${mutationType} from ${clientId} not deterministically applied`);
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

async function waitForFrameVersion(stream, minVersion, timeoutMs = 2500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
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
      const frame = JSON.parse(data || "{}");
      const version = Number(frame?.sourceVersion ?? 0);
      if (version >= minVersion) {
        return {
          waitMs: Date.now() - startedAt,
          version,
        };
      }
    }
  }
  throw new Error(`frame >= ${minVersion} not observed`);
}

function max(values) {
  return Math.max(0, ...values.map((entry) => Number(entry) || 0));
}

async function main() {
  const stream = await openSse();
  try {
    await sendCommand({
      clientId: "hf7-t6-setup",
      mutationType: "context-update",
      mutationId: `hf7-t6-setup-${Date.now().toString(36)}`,
      payload: {
        reason: "hf7-t6-setup",
        runtime: { finalOutputMode: "stream" },
      },
    });

    const samples = [];
    for (let index = 0; index < ITERATIONS; index += 1) {
      const actor = index % 2 === 0 ? "control-a" : "control-b";
      const alignTarget = index % 2 === 0;
      const alignCommand = await sendCommand({
        clientId: actor,
        mutationType: "context-update",
        mutationId: `hf7-t6-align-${index}-${Date.now().toString(36)}`,
        payload: {
          reason: `hf7-t6-align-${index}`,
          alignMode: alignTarget,
          runtime: { alignMode: alignTarget },
        },
      });
      const alignVersion = Number(alignCommand.ack?.version ?? 0);
      const alignFrame = await waitForFrameVersion(stream, alignVersion);

      const startAnimationId = `hf7-t6-${index}-${Date.now().toString(36)}`;
      const startCommand = await sendCommand({
        clientId: actor === "control-a" ? "control-b" : "control-a",
        mutationType: "trigger-global",
        mutationId: `hf7-t6-start-${index}-${Date.now().toString(36)}`,
        payload: {
          action: "start",
          animationType: "outside-space",
          outsideHint: true,
          boardId: "nemesis-board-a",
          animation: {
            id: startAnimationId,
            scope: "global",
            type: "outside-space",
            boardId: "nemesis-board-a",
            assetType: "mp4",
            assetRef: "/resources/nemesis/animations/sandstorm.mp4",
            startedAtEpochMs: Date.now(),
          },
        },
      });
      const startVersion = Number(startCommand.ack?.version ?? 0);
      const startFrame = await waitForFrameVersion(stream, startVersion);

      const stopCommand = await sendCommand({
        clientId: actor,
        mutationType: "trigger-global",
        mutationId: `hf7-t6-stop-${index}-${Date.now().toString(36)}`,
        payload: {
          action: "stop",
          animationType: "outside-space",
          outsideHint: true,
          boardId: "nemesis-board-a",
        },
      });
      const stopVersion = Number(stopCommand.ack?.version ?? 0);
      const stopFrame = await waitForFrameVersion(stream, stopVersion);

      samples.push({
        actor,
        alignAckMs: alignCommand.ackMs,
        alignStreamMs: alignFrame.waitMs,
        startAckMs: startCommand.ackMs,
        startStreamMs: startFrame.waitMs,
        stopAckMs: stopCommand.ackMs,
        stopStreamMs: stopFrame.waitMs,
      });
    }

    const summary = {
      iterations: ITERATIONS,
      alignAckMaxMs: max(samples.map((entry) => entry.alignAckMs)),
      alignStreamMaxMs: max(samples.map((entry) => entry.alignStreamMs)),
      startAckMaxMs: max(samples.map((entry) => entry.startAckMs)),
      startStreamMaxMs: max(samples.map((entry) => entry.startStreamMs)),
      stopAckMaxMs: max(samples.map((entry) => entry.stopAckMs)),
      stopStreamMaxMs: max(samples.map((entry) => entry.stopStreamMs)),
    };

    const result = {
      schema: "tt-beamer.p9-hf7-t6-control-determinism-matrix.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      samples,
      summary,
    };

    result.pass =
      summary.alignAckMaxMs <= 700
      && summary.startAckMaxMs <= 700
      && summary.stopAckMaxMs <= 700
      && summary.alignStreamMaxMs <= 1500
      && summary.startStreamMaxMs <= 1500
      && summary.stopStreamMaxMs <= 1500;

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("control determinism matrix failed");
    }
  } finally {
    await stream.reader.cancel("hf7-t6-close").catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[p9-hf7-t6-control-determinism-matrix] ${error.message}`);
  process.exitCode = 1;
});
