import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF4_T3_OUTPUT ?? "debug/p9-hf4-t3-starvation-guard-output.json";
const STREAM_CLIENTS = Math.max(1, Number(process.env.TT_BEAMER_HF4_T3_STREAM_CLIENTS ?? 16));
const COMMAND_COUNT = Math.max(16, Number(process.env.TT_BEAMER_HF4_T3_COMMANDS ?? 160));

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function main() {
  const controllers = [];
  try {
    for (let i = 0; i < STREAM_CLIENTS; i += 1) {
      const controller = new AbortController();
      const response = await fetch(`${BASE_URL}/api/final-stream/events`, {
        signal: controller.signal,
        headers: {
          accept: "text/event-stream",
        },
      });
      if (!response.ok) {
        throw new Error(`stream attach failed (${response.status})`);
      }
      controllers.push(controller);
    }

    const queueDepths = [];
    const durations = [];
    for (let i = 0; i < COMMAND_COUNT; i += 1) {
      const startedAt = Date.now();
      const { response, payload } = await requestJson("/api/live/command", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          role: "control",
          clientId: "p9-hf4-t3-starvation",
          mutationId: `hf4-t3-${i}-${Date.now().toString(36)}`,
          mutationType: "context-update",
          payload: {
            reason: "hf4-t3-starvation-guard",
            alignMode: i % 2 === 0,
            runtime: {
              finalOutputMode: "stream",
            },
          },
        }),
      });
      if (response.status !== 202) {
        throw new Error(`command rejected (${response.status})`);
      }
      durations.push(Date.now() - startedAt);
      queueDepths.push(Number(payload?.queueDepth ?? 0));
    }

    const telemetry = await requestJson("/api/live/telemetry");
    const health = await requestJson("/api/final-stream/health");

    const maxAckQueueDepth = Math.max(0, ...queueDepths);
    const maxObservedQueueDepth = Number(telemetry.payload?.telemetry?.queue?.maxDepthObserved ?? 0);
    const maxDurationMs = Math.max(0, ...durations);

    const result = {
      schema: "tt-beamer.p9-hf4-t3-starvation-guard.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      streamClients: STREAM_CLIENTS,
      commandCount: COMMAND_COUNT,
      commandDurationMs: {
        max: maxDurationMs,
        avg: Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
      },
      queue: {
        maxAckDepth: maxAckQueueDepth,
        maxObservedDepth: maxObservedQueueDepth,
      },
      streamProducer: health.payload?.health?.producer ?? null,
      pass: maxAckQueueDepth <= 8 && maxObservedQueueDepth <= 16 && maxDurationMs <= 120,
    };

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error(`starvation guard failed (ackDepth=${maxAckQueueDepth}, observed=${maxObservedQueueDepth}, max=${maxDurationMs}ms)`);
    }
  } finally {
    for (const controller of controllers) {
      controller.abort();
    }
  }
}

main().catch((error) => {
  console.error(`[p9-hf4-t3-starvation-guard] ${error.message}`);
  process.exitCode = 1;
});
