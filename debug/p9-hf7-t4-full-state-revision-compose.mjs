import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF7_T4_OUTPUT ?? "debug/p9-hf7-t4-full-state-revision-compose-output.json";

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
      clientId: "hf7-t4",
      mutationType,
      mutationId,
      payload,
    }),
  });
  if (response.status !== 202 || ack?.applied !== true) {
    throw new Error(`command ${mutationType} rejected`);
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

async function waitForFrame(stream, predicate, timeoutMs = 3000) {
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
  throw new Error("expected frame not observed within timeout");
}

function frameHasAnimation(frame, animationId) {
  const running = Array.isArray(frame?.visual?.runningAnimations) ? frame.visual.runningAnimations : [];
  return running.some((entry) => entry?.id === animationId);
}

async function main() {
  const stream = await openSse();
  try {
    const animationId = `hf7-t4-${Date.now().toString(36)}`;
    const startAck = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf7-t4-start-${Date.now().toString(36)}`,
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
    const startVersion = Number(startAck?.version ?? 0);
    const startFrame = await waitForFrame(
      stream,
      (frame) => Number(frame?.sourceVersion ?? 0) >= startVersion && frameHasAnimation(frame, animationId),
    );

    const stopAck = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf7-t4-stop-${Date.now().toString(36)}`,
      payload: {
        action: "stop",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
      },
    });
    const stopVersion = Number(stopAck?.version ?? 0);
    const stopFrame = await waitForFrame(
      stream,
      (frame) => Number(frame?.sourceVersion ?? 0) >= stopVersion && !frameHasAnimation(frame, animationId),
    );

    const latest = await requestJson("/api/live/snapshot");
    const latestVersion = Number(latest.payload?.session?.version ?? 0);
    const lateSubscriber = await openSse();
    const lateFrame = await waitForFrame(
      lateSubscriber,
      (frame) => Number(frame?.sourceVersion ?? 0) >= latestVersion,
    );
    await lateSubscriber.reader.cancel("hf7-t4-late-close").catch(() => {});

    const result = {
      schema: "tt-beamer.p9-hf7-t4-full-state-revision-compose.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      versions: {
        startAck: startVersion,
        startFrame: Number(startFrame.frame?.sourceVersion ?? 0),
        stopAck: stopVersion,
        stopFrame: Number(stopFrame.frame?.sourceVersion ?? 0),
        latestSnapshot: latestVersion,
        lateSubscriberFrame: Number(lateFrame.frame?.sourceVersion ?? 0),
      },
      timingsMs: {
        startFrame: startFrame.waitMs,
        stopFrame: stopFrame.waitMs,
        lateSubscriberFrame: lateFrame.waitMs,
      },
      staleChecks: {
        startFrameIncludesAnimation: frameHasAnimation(startFrame.frame, animationId),
        stopFrameExcludesAnimation: !frameHasAnimation(stopFrame.frame, animationId),
        lateSubscriberNotStale: Number(lateFrame.frame?.sourceVersion ?? 0) >= latestVersion,
      },
    };

    result.pass =
      result.versions.startFrame >= startVersion
      && result.versions.stopFrame >= stopVersion
      && result.staleChecks.startFrameIncludesAnimation
      && result.staleChecks.stopFrameExcludesAnimation
      && result.staleChecks.lateSubscriberNotStale;

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("full-state revision compose stale-closure check failed");
    }
  } finally {
    await stream.reader.cancel("hf7-t4-close").catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[p9-hf7-t4-full-state-revision-compose] ${error.message}`);
  process.exitCode = 1;
});
