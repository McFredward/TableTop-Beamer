import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF6_T6_OUTPUT ?? "debug/p9-hf6-t6-start-stop-parity-matrix-output.json";
const ITERATIONS_PER_MODE = Math.max(4, Number(process.env.TT_BEAMER_HF6_T6_ITERATIONS ?? 12));

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
      mutationId,
      mutationType,
      payload,
    }),
  });
  if (response.status !== 202) {
    throw new Error(`command ${mutationType} rejected (${response.status})`);
  }
  if (ack?.applied !== true || ack?.overflow === true || ack?.timeout === true) {
    throw new Error(`command ${mutationType} not applied`);
  }
  return {
    ack,
    latencyMs: Date.now() - startedAt,
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
          version,
          waitMs: Date.now() - startedAt,
        };
      }
    }
  }
  throw new Error(`no frame version >= ${minVersion}`);
}

function hasAnimation(snapshot, animationId) {
  const running = Array.isArray(snapshot?.runtime?.runningAnimations) ? snapshot.runtime.runningAnimations : [];
  return running.some((entry) => entry?.id === animationId);
}

async function waitForSnapshot(minVersion, predicate, timeoutMs = 2500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { payload } = await requestJson(`/api/live/snapshot?sinceVersion=${Math.max(0, minVersion - 1)}`);
    const version = Number(payload?.session?.version ?? 0);
    const snapshot = payload?.session?.snapshot ?? null;
    if (version >= minVersion && (!predicate || predicate(snapshot))) {
      return {
        version,
        waitMs: Date.now() - startedAt,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error(`no snapshot version >= ${minVersion}`);
}

async function runMode(mode, stream) {
  await sendCommand({
    clientId: `p9-hf6-t6-mode-${mode}`,
    mutationType: "context-update",
    mutationId: `hf6-t6-mode-${mode}-${Date.now().toString(36)}`,
    payload: {
      reason: `hf6-t6-mode-${mode}`,
      runtime: {
        finalOutputMode: mode,
      },
    },
  });

  const samples = [];
  for (let index = 0; index < ITERATIONS_PER_MODE; index += 1) {
    const actor = index % 2 === 0 ? "control-a" : "control-b";
    const animationId = `hf6-t6-${mode}-${index}-${Date.now().toString(36)}`;
    const startCommand = await sendCommand({
      clientId: actor,
      mutationType: "trigger-global",
      mutationId: `hf6-t6-start-${mode}-${index}-${Date.now().toString(36)}`,
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
    const startVersion = Number(startCommand.ack?.version ?? 0);
    const startSnapshot = await waitForSnapshot(startVersion, (snapshot) => hasAnimation(snapshot, animationId));
    const startFrame = await waitForFrameVersion(stream, startVersion);

    const stopCommand = await sendCommand({
      clientId: actor === "control-a" ? "control-b" : "control-a",
      mutationType: "trigger-global",
      mutationId: `hf6-t6-stop-${mode}-${index}-${Date.now().toString(36)}`,
      payload: {
        action: "stop",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
      },
    });
    const stopVersion = Number(stopCommand.ack?.version ?? 0);
    const stopSnapshot = await waitForSnapshot(stopVersion, (snapshot) => !hasAnimation(snapshot, animationId));
    const stopFrame = await waitForFrameVersion(stream, stopVersion);

    samples.push({
      actor,
      startAckMs: startCommand.latencyMs,
      startSnapshotMs: startSnapshot.waitMs,
      startStreamMs: startFrame.waitMs,
      stopAckMs: stopCommand.latencyMs,
      stopSnapshotMs: stopSnapshot.waitMs,
      stopStreamMs: stopFrame.waitMs,
      startVersion,
      stopVersion,
    });
  }

  return {
    mode,
    iterations: ITERATIONS_PER_MODE,
    samples,
  };
}

function summarizeMode(modeResult) {
  const readMetric = (key) => modeResult.samples.map((entry) => Number(entry[key]) || 0);
  const max = (values) => Math.max(0, ...values);
  return {
    mode: modeResult.mode,
    iterations: modeResult.iterations,
    startAckMaxMs: max(readMetric("startAckMs")),
    startSnapshotMaxMs: max(readMetric("startSnapshotMs")),
    startStreamMaxMs: max(readMetric("startStreamMs")),
    stopAckMaxMs: max(readMetric("stopAckMs")),
    stopSnapshotMaxMs: max(readMetric("stopSnapshotMs")),
    stopStreamMaxMs: max(readMetric("stopStreamMs")),
  };
}

async function main() {
  const stream = await openSse();
  try {
    const streamMode = await runMode("stream", stream);
    const clientMode = await runMode("client", stream);

    const streamSummary = summarizeMode(streamMode);
    const clientSummary = summarizeMode(clientMode);

    const result = {
      schema: "tt-beamer.p9-hf6-t6-start-stop-parity-matrix.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      iterationsPerMode: ITERATIONS_PER_MODE,
      streamMode,
      clientMode,
      summary: {
        stream: streamSummary,
        client: clientSummary,
      },
    };

    result.pass =
      streamSummary.startAckMaxMs <= 500
      && streamSummary.stopAckMaxMs <= 500
      && clientSummary.startAckMaxMs <= 500
      && clientSummary.stopAckMaxMs <= 500
      && streamSummary.startSnapshotMaxMs <= 1500
      && streamSummary.stopSnapshotMaxMs <= 1500
      && clientSummary.startSnapshotMaxMs <= 1500
      && clientSummary.stopSnapshotMaxMs <= 1500
      && streamSummary.startStreamMaxMs <= 1500
      && streamSummary.stopStreamMaxMs <= 1500
      && clientSummary.startStreamMaxMs <= 1500
      && clientSummary.stopStreamMaxMs <= 1500;

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("start/stop parity matrix failed");
    }
  } finally {
    await stream.reader.cancel("hf6-t6-close").catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[p9-hf6-t6-start-stop-parity-matrix] ${error.message}`);
  process.exitCode = 1;
});
