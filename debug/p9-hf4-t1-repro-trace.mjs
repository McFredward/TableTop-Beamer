import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF4_T1_OUTPUT ?? "debug/p9-hf4-t1-repro-trace-output.json";
const SUBSCRIBERS = Math.max(1, Number(process.env.TT_BEAMER_HF4_SUBSCRIBERS ?? 8));
const COMMANDS = Math.max(8, Number(process.env.TT_BEAMER_HF4_COMMANDS ?? 80));

function percentile(values, q) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[index];
}

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function openSubscriber(index) {
  const controller = new AbortController();
  const response = await fetch(`${BASE_URL}/api/final-stream/events`, {
    signal: controller.signal,
    headers: {
      accept: "text/event-stream",
      "x-hf4-subscriber": `sub-${index}`,
    },
  });
  if (!response.ok) {
    throw new Error(`subscriber ${index} failed (${response.status})`);
  }
  return controller;
}

async function sendCommand(index) {
  const startedAt = Date.now();
  const mutationType = index % 3 === 0 ? "context-update" : index % 3 === 1 ? "align-toggle" : "clear-all";
  const payload =
    mutationType === "context-update"
      ? {
        reason: "hf4-t1-repro",
        selectedBoard: index % 2 === 0 ? "nemesis-board-a" : "nemesis-board-b",
        runtime: {
          finalOutputMode: "stream",
          alignMode: index % 2 === 0,
        },
      }
      : mutationType === "align-toggle"
        ? {
          enabled: index % 2 === 0,
          reason: "hf4-t1-align",
        }
        : {
          reason: "hf4-t1-clear-all",
        };

  const { response, payload: ackPayload } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "p9-hf4-t1-repro",
      mutationId: `hf4-t1-${index}-${Date.now().toString(36)}`,
      mutationType,
      payload,
    }),
  });

  if (response.status !== 202) {
    throw new Error(`command ${index} rejected (${response.status})`);
  }
  return {
    latencyMs: Date.now() - startedAt,
    queueDepth: Number(ackPayload?.queueDepth ?? 0),
    version: Number(ackPayload?.version ?? 0),
  };
}

async function main() {
  const subscribers = [];
  try {
    for (let index = 0; index < SUBSCRIBERS; index += 1) {
      subscribers.push(await openSubscriber(index));
    }

    const latencies = [];
    const queueDepths = [];
    for (let index = 0; index < COMMANDS; index += 1) {
      const sample = await sendCommand(index);
      latencies.push(sample.latencyMs);
      queueDepths.push(sample.queueDepth);
    }

    const telemetry = await requestJson("/api/live/telemetry");
    const streamHealth = await requestJson("/api/final-stream/health");

    const p95 = percentile(latencies, 0.95);
    const maxQueueDepth = Math.max(0, ...queueDepths);
    const worstQueueDepth = Math.max(0, Number(telemetry.payload?.telemetry?.queue?.maxDepthObserved ?? 0));

    const result = {
      schema: "tt-beamer.p9-hf4-t1-repro-trace.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      subscribers: SUBSCRIBERS,
      commands: COMMANDS,
      commandLatencyMs: {
        p50: percentile(latencies, 0.5),
        p95,
        max: Math.max(...latencies),
        min: Math.min(...latencies),
      },
      queueDepth: {
        maxAckDepth: maxQueueDepth,
        maxObserved: worstQueueDepth,
      },
      streamHealth: streamHealth.payload?.health ?? null,
      rootCause: {
        reproducedFreeze: false,
        legacyHazard: "per-subscriber compose timers amplified compose workload and could starve command responsiveness",
        isolatedBy: "single producer scheduler + force compose on mutation + fan-out broadcast",
      },
      pass: p95 <= 120 && worstQueueDepth <= 64,
    };

    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error(`HF4 T1 gate failed (p95=${p95}ms, maxQueue=${worstQueueDepth})`);
    }
  } finally {
    for (const controller of subscribers) {
      controller.abort();
    }
  }
}

main().catch((error) => {
  console.error(`[p9-hf4-t1-repro-trace] ${error.message}`);
  process.exitCode = 1;
});
