import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF6_T3_OUTPUT ?? "debug/p9-hf6-t3-transport-reliability-output.json";
const STRESS_COUNT = Math.max(200, Number(process.env.TT_BEAMER_HF6_T3_STRESS_COUNT ?? 500));

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendCommand(body) {
  const startedAt = Date.now();
  const { response, payload } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (response.status !== 202) {
    throw new Error(`command rejected (${response.status})`);
  }
  return {
    ...payload,
    latencyMs: Date.now() - startedAt,
  };
}

async function openStreamSubscriber(index) {
  const response = await fetch(`${BASE_URL}/api/final-stream/events`, {
    headers: { accept: "text/event-stream" },
  });
  if (!response.ok) {
    throw new Error(`stream subscribe ${index} failed (${response.status})`);
  }
  return response;
}

function percentile(values, q) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[index];
}

async function main() {
  const streamSubscribers = await Promise.all([
    openStreamSubscriber(0),
    openStreamSubscriber(1),
    openStreamSubscriber(2),
    openStreamSubscriber(3),
    openStreamSubscriber(4),
    openStreamSubscriber(5),
  ]);

  try {
    await sendCommand({
      role: "control",
      clientId: "p9-hf6-t3-reliability",
      mutationId: `hf6-t3-stream-mode-${Date.now().toString(36)}`,
      mutationType: "context-update",
      payload: {
        reason: "hf6-t3-enable-stream",
        runtime: {
          finalOutputMode: "stream",
        },
      },
    });

    const commands = Array.from({ length: STRESS_COUNT }, (_, index) => sendCommand({
      role: "control",
      clientId: `p9-hf6-t3-client-${index % 4}`,
      mutationId: `hf6-t3-start-${index}-${Date.now().toString(36)}`,
      mutationType: "trigger-room",
      payload: {
        boardId: "nemesis-board-a",
        animation: {
          id: `hf6-t3-room-${index}`,
          scope: "room",
          type: "fire",
          boardId: "nemesis-board-a",
          roomId: `room-${(index % 30) + 1}`,
          startedAtEpochMs: Date.now(),
        },
      },
    }));

    const acknowledgements = await Promise.all(commands);
    const telemetry = await requestJson("/api/live/telemetry");

    const overflowAcks = acknowledgements.filter((entry) => Boolean(entry?.overflow));
    const timeoutAcks = acknowledgements.filter((entry) => Boolean(entry?.timeout));
    const notAppliedAcks = acknowledgements.filter((entry) => entry?.applied !== true);
    const latencySamples = acknowledgements.map((entry) => Number(entry?.latencyMs) || 0);

    const result = {
      schema: "tt-beamer.p9-hf6-t3-transport-reliability.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      streamMode: "stream",
      subscriberCount: streamSubscribers.length,
      stressCount: STRESS_COUNT,
      commandTypeUnderTest: "trigger-room:start",
      acknowledgements: {
        total: acknowledgements.length,
        applied: acknowledgements.length - notAppliedAcks.length,
        notApplied: notAppliedAcks.length,
        overflow: overflowAcks.length,
        timeout: timeoutAcks.length,
      },
      latency: {
        p50Ms: percentile(latencySamples, 0.5),
        p95Ms: percentile(latencySamples, 0.95),
        maxMs: Math.max(0, ...latencySamples),
      },
      queue: telemetry.payload?.telemetry?.queue ?? null,
    };

    result.pass =
      result.acknowledgements.notApplied === 0
      && result.acknowledgements.overflow === 0
      && result.acknowledgements.timeout === 0;

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("transport reliability gate failed");
    }
  } finally {
    await Promise.all(streamSubscribers.map((response) => response.body?.cancel?.("hf6-t3-close") ?? Promise.resolve()));
  }
}

main().catch((error) => {
  console.error(`[p9-hf6-t3-transport-reliability] ${error.message}`);
  process.exitCode = 1;
});
