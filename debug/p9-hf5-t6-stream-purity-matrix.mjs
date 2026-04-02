import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF5_T6_OUTPUT ?? "debug/p9-hf5-t6-stream-purity-matrix-output.json";

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
      clientId: "p9-hf5-t6-stream-purity-matrix",
      mutationId,
      mutationType,
      payload,
    }),
  });
  if (response.status !== 202) {
    throw new Error(`command ${mutationType} rejected (${response.status})`);
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
    response,
    reader: response.body.getReader(),
    decoder: new TextDecoder(),
    buffer: "",
  };
}

async function waitForFrame(stream, timeoutMs = 4000) {
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
      return JSON.parse(data || "{}");
    }
  }
  throw new Error("no frame event received");
}

function hasOverlayPayloadLeak(frame) {
  const frameText = JSON.stringify(frame || {});
  const topLevelKeys = Object.keys(frame || {});
  const visualKeys = Object.keys(frame?.visual || {});
  const allowedTopLevel = new Set(["schema", "frameId", "generatedAt", "sourceVersion", "alignMode", "visual"]);
  const allowedVisualKeys = new Set(["schema", "alignMode", "board", "runningAnimations"]);

  return {
    hasForbiddenTopLevelKey: topLevelKeys.some((key) => !allowedTopLevel.has(key)),
    hasForbiddenVisualKey: visualKeys.some((key) => !allowedVisualKeys.has(key)),
    hasLegacyModeField: Object.prototype.hasOwnProperty.call(frame || {}, "mode"),
    hasLegacyBoardLabel: Boolean(frame?.board?.label),
    hasLegacyRoomLabel: Array.isArray(frame?.runningAnimations)
      ? frame.runningAnimations.some((entry) => Boolean(entry?.roomLabel))
      : false,
    hasServerStreamOverlayText: frameText.includes("SERVER STREAM ACTIVE"),
  };
}

async function runBoardCase(boardId, stream, index) {
  const boardCommand = await sendCommand({
    mutationType: "context-update",
    mutationId: `hf5-t6-board-${boardId}-${index}-${Date.now().toString(36)}`,
    payload: {
      reason: "hf5-t6-board-select",
      selectedBoard: boardId,
      runtime: {
        selectedBoard: boardId,
        finalOutputMode: "stream",
      },
    },
  });

  await sendCommand({
    mutationType: "trigger-global",
    mutationId: `hf5-t6-run-${boardId}-${index}-${Date.now().toString(36)}`,
    payload: {
      action: "start",
      animationType: "outside-space",
      outsideHint: true,
      boardId,
      animation: {
        id: `hf5-t6-outside-${boardId}-${index}`,
        scope: "global",
        type: "outside-space",
        boardId,
        assetType: "mp4",
        assetRef: "/resources/nemesis/animations/sandstorm.mp4",
        startedAtEpochMs: Date.now(),
      },
    },
  });

  const frame = await waitForFrame(stream);
  const leakChecks = hasOverlayPayloadLeak(frame);

  await sendCommand({
    mutationType: "trigger-global",
    mutationId: `hf5-t6-stop-${boardId}-${index}-${Date.now().toString(36)}`,
    payload: {
      action: "stop",
      animationType: "outside-space",
      outsideHint: true,
      boardId,
    },
  });

  return {
    boardId,
    version: Number(frame?.sourceVersion ?? 0),
    alignMode: Boolean(frame?.alignMode),
    frameHasVisualBlock: Boolean(frame?.visual && typeof frame.visual === "object"),
    commandLatencyMs: boardCommand.latencyMs,
    ...leakChecks,
  };
}

async function main() {
  const boardsResponse = await requestJson("/api/boards");
  const boards = Array.isArray(boardsResponse.payload?.boards)
    ? boardsResponse.payload.boards.map((entry) => entry?.boardId).filter(Boolean)
    : [];
  if (boards.length === 0) {
    throw new Error("board catalog is empty");
  }

  const primaryStream = await openSse();
  const churnA = await openSse();
  const churnB = await openSse();

  const matrix = [];
  try {
    for (let index = 0; index < boards.length; index += 1) {
      const boardId = boards[index];
      matrix.push(await runBoardCase(boardId, primaryStream, index));
      if (index === 0) {
        await churnA.reader.cancel("hf5-t6-churn-close-a").catch(() => {});
      }
      if (index === 1) {
        await churnB.reader.cancel("hf5-t6-churn-close-b").catch(() => {});
      }
    }
  } finally {
    await primaryStream.reader.cancel("hf5-t6-primary-close").catch(() => {});
    await churnA.reader.cancel("hf5-t6-churn-a-close").catch(() => {});
    await churnB.reader.cancel("hf5-t6-churn-b-close").catch(() => {});
  }

  const health = await requestJson("/api/final-stream/health");
  const result = {
    schema: "tt-beamer.p9-hf5-t6-stream-purity-matrix.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    boardCount: boards.length,
    matrix,
    streamHealth: health.payload?.health ?? null,
  };

  result.pass = matrix.every((entry) => (
    entry.frameHasVisualBlock
    && !entry.hasForbiddenTopLevelKey
    && !entry.hasForbiddenVisualKey
    && !entry.hasLegacyModeField
    && !entry.hasLegacyBoardLabel
    && !entry.hasLegacyRoomLabel
    && !entry.hasServerStreamOverlayText
    && entry.commandLatencyMs <= 200
  ));

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("stream purity matrix failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf5-t6-stream-purity-matrix] ${error.message}`);
  process.exitCode = 1;
});
