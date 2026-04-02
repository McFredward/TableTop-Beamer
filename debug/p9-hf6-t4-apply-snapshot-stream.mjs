import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF6_T4_OUTPUT ?? "debug/p9-hf6-t4-apply-snapshot-stream-output.json";

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
      clientId: "p9-hf6-t4-apply-snapshot-stream",
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
          frame,
          waitMs: Date.now() - startedAt,
        };
      }
    }
  }
  throw new Error(`no frame version >= ${minVersion} received`);
}

async function waitForSnapshotVersion(minVersion, predicate, timeoutMs = 2500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { payload } = await requestJson(`/api/live/snapshot?sinceVersion=${Math.max(0, minVersion - 1)}`);
    const version = Number(payload?.session?.version ?? 0);
    const snapshot = payload?.session?.snapshot ?? null;
    if (version >= minVersion && (!predicate || predicate(snapshot))) {
      return {
        version,
        snapshot,
        waitMs: Date.now() - startedAt,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error(`snapshot version >= ${minVersion} not observed`);
}

function hasAnimationId(snapshot, animationId) {
  const running = Array.isArray(snapshot?.runtime?.runningAnimations) ? snapshot.runtime.runningAnimations : [];
  return running.some((entry) => entry?.id === animationId);
}

async function main() {
  const stream = await openSse();
  const animationId = `hf6-t4-${Date.now().toString(36)}`;
  try {
    await sendCommand({
      mutationType: "context-update",
      mutationId: `hf6-t4-mode-${Date.now().toString(36)}`,
      payload: {
        reason: "hf6-t4-stream-mode",
        runtime: { finalOutputMode: "stream" },
      },
    });

    const startResult = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf6-t4-start-${Date.now().toString(36)}`,
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
    const startVersion = Number(startResult.ack?.version ?? 0);
    const startSnapshot = await waitForSnapshotVersion(startVersion, (snapshot) => hasAnimationId(snapshot, animationId));
    const startFrame = await waitForFrameVersion(stream, startVersion);

    const stopResult = await sendCommand({
      mutationType: "trigger-global",
      mutationId: `hf6-t4-stop-${Date.now().toString(36)}`,
      payload: {
        action: "stop",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
      },
    });
    const stopVersion = Number(stopResult.ack?.version ?? 0);
    const stopSnapshot = await waitForSnapshotVersion(stopVersion, (snapshot) => !hasAnimationId(snapshot, animationId));
    const stopFrame = await waitForFrameVersion(stream, stopVersion);

    const result = {
      schema: "tt-beamer.p9-hf6-t4-apply-snapshot-stream.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      start: {
        ackLatencyMs: startResult.latencyMs,
        ackVersion: startVersion,
        snapshotWaitMs: startSnapshot.waitMs,
        snapshotVersion: startSnapshot.version,
        streamWaitMs: startFrame.waitMs,
        streamVersion: Number(startFrame.frame?.sourceVersion ?? 0),
      },
      stop: {
        ackLatencyMs: stopResult.latencyMs,
        ackVersion: stopVersion,
        snapshotWaitMs: stopSnapshot.waitMs,
        snapshotVersion: stopSnapshot.version,
        streamWaitMs: stopFrame.waitMs,
        streamVersion: Number(stopFrame.frame?.sourceVersion ?? 0),
      },
    };

    result.pass =
      result.start.ackLatencyMs <= 500
      && result.stop.ackLatencyMs <= 500
      && result.start.snapshotVersion >= result.start.ackVersion
      && result.stop.snapshotVersion >= result.stop.ackVersion
      && result.start.streamVersion >= result.start.ackVersion
      && result.stop.streamVersion >= result.stop.ackVersion
      && result.start.snapshotWaitMs <= 1200
      && result.stop.snapshotWaitMs <= 1200
      && result.start.streamWaitMs <= 1200
      && result.stop.streamWaitMs <= 1200;

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("apply/snapshot/stream gate failed");
    }
  } finally {
    await stream.reader.cancel("hf6-t4-close").catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[p9-hf6-t4-apply-snapshot-stream] ${error.message}`);
  process.exitCode = 1;
});
