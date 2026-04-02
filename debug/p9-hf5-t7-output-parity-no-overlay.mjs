import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF5_T7_OUTPUT ?? "debug/p9-hf5-t7-output-parity-no-overlay-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendCommand({ mutationType, payload, mutationId }) {
  const { response, payload: ack } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "p9-hf5-t7-output-parity",
      mutationId,
      mutationType,
      payload,
    }),
  });
  if (response.status !== 202) {
    throw new Error(`command ${mutationType} rejected (${response.status})`);
  }
  return ack;
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

async function waitForFrame(stream, timeoutMs = 4000, predicate = null) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
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
      const parsed = JSON.parse(data || "{}");
      if (typeof predicate === "function" && !predicate(parsed)) {
        continue;
      }
      return parsed;
    }
  }
  throw new Error("no frame received");
}

function getRunningCountFromFrame(frame) {
  const visualRunning = Array.isArray(frame?.visual?.runningAnimations) ? frame.visual.runningAnimations : [];
  return visualRunning.length;
}

function hasOverlayLeak(frame) {
  const text = JSON.stringify(frame || {});
  return text.includes("SERVER STREAM ACTIVE") || text.includes("final-stream-meta") || text.includes("roomLabel");
}

async function main() {
  const stream = await openSse();
  try {
    const boardAck = await sendCommand({
      mutationType: "context-update",
      mutationId: `hf5-t7-context-${Date.now().toString(36)}`,
      payload: {
        reason: "hf5-t7-output-parity",
        selectedBoard: "nemesis-board-a",
        runtime: {
          selectedBoard: "nemesis-board-a",
          finalOutputMode: "stream",
        },
      },
    });

    const triggerAck = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf5-t7-trigger-${Date.now().toString(36)}`,
      payload: {
        action: "start",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
        animation: {
          id: `hf5-t7-run-${Date.now().toString(36)}`,
          scope: "global",
          type: "outside-space",
          boardId: "nemesis-board-a",
          assetType: "mp4",
          assetRef: "/resources/nemesis/animations/sandstorm.mp4",
          startedAtEpochMs: Date.now(),
        },
      },
    });

    const expectedVersion = Math.max(Number(boardAck?.version ?? 0), Number(triggerAck?.version ?? 0));
    const frame = await waitForFrame(stream, 5000, (incoming) => Number(incoming?.sourceVersion ?? 0) >= expectedVersion);
    const state = await requestJson("/api/live/state");
    const runtime = state.payload?.session?.snapshot?.runtime ?? {};
    const running = Array.isArray(runtime?.runningAnimations) ? runtime.runningAnimations : [];
    const selectedBoard = state.payload?.session?.snapshot?.selectedBoard ?? runtime?.selectedBoard ?? runtime?.boardId;
    const liveBoardRunning = running.filter((entry) => entry?.boardId === selectedBoard);

    await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf5-t7-stop-${Date.now().toString(36)}`,
      payload: {
        action: "stop",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
      },
    });

    const result = {
      schema: "tt-beamer.p9-hf5-t7-output-parity-no-overlay.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      commandVersion: expectedVersion,
      frameSourceVersion: Number(frame?.sourceVersion ?? 0),
      liveBoardRunningCount: liveBoardRunning.length,
      streamVisualRunningCount: getRunningCountFromFrame(frame),
      streamHasVisualBoard: Boolean(frame?.visual?.board?.id),
      streamAlignMode: Boolean(frame?.alignMode),
      overlayLeak: hasOverlayLeak(frame),
    };
    result.pass =
      result.frameSourceVersion >= result.commandVersion
      && result.streamVisualRunningCount === result.liveBoardRunningCount
      && result.streamHasVisualBoard
      && !result.overlayLeak;

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("output parity without overlay failed");
    }
  } finally {
    await stream.reader.cancel("hf5-t7-parity-complete").catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[p9-hf5-t7-output-parity-no-overlay] ${error.message}`);
  process.exitCode = 1;
});
