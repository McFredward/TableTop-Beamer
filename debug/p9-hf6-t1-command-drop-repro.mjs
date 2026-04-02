import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF6_T1_OUTPUT ?? "debug/p9-hf6-t1-command-drop-repro-output.json";
const STRESS_COUNT = Math.max(200, Number(process.env.TT_BEAMER_HF6_T1_STRESS_COUNT ?? 1400));

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
      clientId: "p9-hf6-t1-repro",
      mutationId: `hf6-t1-stream-mode-${Date.now().toString(36)}`,
      mutationType: "context-update",
      payload: {
        reason: "hf6-t1-enable-stream",
        runtime: {
          finalOutputMode: "stream",
        },
      },
    });

    const commands = Array.from({ length: STRESS_COUNT }, (_, index) => sendCommand({
      role: "control",
      clientId: `p9-hf6-t1-client-${index % 4}`,
      mutationId: `hf6-t1-start-${index}-${Date.now().toString(36)}`,
      mutationType: "trigger-room",
      payload: {
        boardId: "nemesis-board-a",
        animation: {
          id: `hf6-t1-room-${index}`,
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
    const appliedAcks = acknowledgements.filter((entry) => entry?.applied === true);
    const notAppliedAcks = acknowledgements.filter((entry) => entry?.applied !== true);

    const result = {
      schema: "tt-beamer.p9-hf6-t1-command-drop-repro.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      streamMode: "stream",
      subscriberCount: streamSubscribers.length,
      stressCount: STRESS_COUNT,
      commandTypeUnderTest: "trigger-room:start",
      acknowledgements: {
        total: acknowledgements.length,
        applied: appliedAcks.length,
        notApplied: notAppliedAcks.length,
        overflow: overflowAcks.length,
      },
      queue: telemetry.payload?.telemetry?.queue ?? null,
      samples: {
        firstOverflowAck: overflowAcks[0] ?? null,
        firstNotAppliedAck: notAppliedAcks[0] ?? null,
      },
      pass: notAppliedAcks.length > 0,
      interpretation: notAppliedAcks.length > 0
        ? "PRE-FIX REPRO: start commands can be accepted by transport endpoint but not applied (drop/no-op via overflow path)."
        : "No drop observed in this run.",
    };

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("expected at least one not-applied acknowledgement for pre-fix repro");
    }
  } finally {
    await Promise.all(streamSubscribers.map((response) => response.body?.cancel?.("hf6-t1-close") ?? Promise.resolve()));
  }
}

main().catch((error) => {
  console.error(`[p9-hf6-t1-command-drop-repro] ${error.message}`);
  process.exitCode = 1;
});
