import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF7_T5_OUTPUT ?? "debug/p9-hf7-t5-immediate-mutation-visibility-output.json";
const FRAME_TIMEOUT_MS = Math.max(1200, Number(process.env.TT_BEAMER_HF7_T5_FRAME_TIMEOUT_MS ?? 2500));

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
      clientId: "hf7-t5",
      mutationType,
      mutationId,
      payload,
    }),
  });
  if (response.status !== 202 || ack?.applied !== true) {
    throw new Error(`command ${mutationType} rejected`);
  }
  return {
    ack,
    ackLatencyMs: Date.now() - startedAt,
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

async function waitForFrame(stream, predicate, timeoutMs = FRAME_TIMEOUT_MS) {
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
      if (!predicate || predicate(frame)) {
        return {
          frame,
          waitMs: Date.now() - startedAt,
        };
      }
    }
  }
  throw new Error("expected frame update not observed in time");
}

function hasAnimation(frame, animationId) {
  const running = Array.isArray(frame?.visual?.runningAnimations) ? frame.visual.runningAnimations : [];
  return running.some((entry) => entry?.id === animationId);
}

async function main() {
  const stream = await openSse();
  try {
    const animationId = `hf7-t5-${Date.now().toString(36)}`;
    const samples = [];

    const start = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf7-t5-start-${Date.now().toString(36)}`,
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
    const startFrame = await waitForFrame(stream, (frame) => Number(frame?.sourceVersion ?? 0) >= startVersion && hasAnimation(frame, animationId));
    samples.push({
      mutation: "start",
      ackMs: start.ackLatencyMs,
      streamMs: startFrame.waitMs,
      version: startVersion,
    });

    const alignOn = await sendCommand({
      mutationType: "context-update",
      mutationId: `hf7-t5-align-on-${Date.now().toString(36)}`,
      payload: {
        reason: "hf7-t5-align-on",
        alignMode: true,
        runtime: { alignMode: true },
      },
    });
    const alignOnVersion = Number(alignOn.ack?.version ?? 0);
    const alignOnFrame = await waitForFrame(stream, (frame) => Number(frame?.sourceVersion ?? 0) >= alignOnVersion && frame?.alignMode === true);
    samples.push({ mutation: "align-on", ackMs: alignOn.ackLatencyMs, streamMs: alignOnFrame.waitMs, version: alignOnVersion });

    const boardSwitch = await sendCommand({
      mutationType: "context-update",
      mutationId: `hf7-t5-board-switch-${Date.now().toString(36)}`,
      payload: {
        reason: "hf7-t5-board-switch",
        runtime: {
          selectedBoard: "nemesis-board-b",
          boardId: "nemesis-board-b",
          selectedLayout: "nemesis-board-b",
          layoutId: "nemesis-board-b",
        },
        selectedBoard: "nemesis-board-b",
        selectedLayout: "nemesis-board-b",
      },
    });
    const boardVersion = Number(boardSwitch.ack?.version ?? 0);
    const boardFrame = await waitForFrame(stream, (frame) => Number(frame?.sourceVersion ?? 0) >= boardVersion && frame?.visual?.board?.id === "nemesis-board-b");
    samples.push({ mutation: "board-switch", ackMs: boardSwitch.ackLatencyMs, streamMs: boardFrame.waitMs, version: boardVersion });

    const stop = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf7-t5-stop-${Date.now().toString(36)}`,
      payload: {
        action: "stop",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
      },
    });
    const stopVersion = Number(stop.ack?.version ?? 0);
    const stopFrame = await waitForFrame(stream, (frame) => Number(frame?.sourceVersion ?? 0) >= stopVersion && !hasAnimation(frame, animationId));
    samples.push({ mutation: "stop", ackMs: stop.ackLatencyMs, streamMs: stopFrame.waitMs, version: stopVersion });

    const alignOff = await sendCommand({
      mutationType: "context-update",
      mutationId: `hf7-t5-align-off-${Date.now().toString(36)}`,
      payload: {
        reason: "hf7-t5-align-off",
        alignMode: false,
        runtime: { alignMode: false },
      },
    });
    const alignOffVersion = Number(alignOff.ack?.version ?? 0);
    const alignOffFrame = await waitForFrame(stream, (frame) => Number(frame?.sourceVersion ?? 0) >= alignOffVersion && frame?.alignMode === false);
    samples.push({ mutation: "align-off", ackMs: alignOff.ackLatencyMs, streamMs: alignOffFrame.waitMs, version: alignOffVersion });

    const summary = {
      ackMaxMs: Math.max(...samples.map((entry) => entry.ackMs)),
      streamMaxMs: Math.max(...samples.map((entry) => entry.streamMs)),
    };

    const result = {
      schema: "tt-beamer.p9-hf7-t5-immediate-mutation-visibility.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      frameTimeoutMs: FRAME_TIMEOUT_MS,
      samples,
      summary,
    };

    result.pass = summary.ackMaxMs <= 700 && summary.streamMaxMs <= 1500;
    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("mutation-to-output immediacy thresholds exceeded");
    }
  } finally {
    await stream.reader.cancel("hf7-t5-close").catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[p9-hf7-t5-immediate-mutation-visibility] ${error.message}`);
  process.exitCode = 1;
});
