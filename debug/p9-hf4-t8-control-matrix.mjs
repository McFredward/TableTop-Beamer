import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF4_T8_OUTPUT ?? "debug/p9-hf4-t8-control-matrix-output.json";

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

async function sendCommand(mode, index) {
  const startedAt = Date.now();
  const { response, payload } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: `p9-hf4-t8-${mode}`,
      mutationId: `hf4-t8-${mode}-${index}-${Date.now().toString(36)}`,
      mutationType: "context-update",
      payload: {
        reason: "hf4-t8-control-matrix",
        selectedBoard: index % 2 === 0 ? "nemesis-board-a" : "nemesis-board-b",
        alignMode: index % 3 === 0,
        runtime: {
          finalOutputMode: mode,
          alignMode: index % 3 === 0,
        },
      },
    }),
  });
  if (response.status !== 202) {
    throw new Error(`command rejected (${response.status})`);
  }
  return {
    latencyMs: Date.now() - startedAt,
    queueDepth: Number(payload?.queueDepth ?? 0),
  };
}

async function runMode(mode) {
  const controllers = [];
  try {
    if (mode === "stream") {
      for (let i = 0; i < 6; i += 1) {
        const controller = new AbortController();
        const response = await fetch(`${BASE_URL}/api/final-stream/events`, {
          signal: controller.signal,
          headers: { accept: "text/event-stream" },
        });
        if (!response.ok) {
          throw new Error(`stream subscribe failed (${response.status})`);
        }
        controllers.push(controller);
      }
    }

    const samples = [];
    const queueDepths = [];
    for (let index = 0; index < 40; index += 1) {
      const sample = await sendCommand(mode, index);
      samples.push(sample.latencyMs);
      queueDepths.push(sample.queueDepth);
      if (mode === "stream" && index === 20 && controllers.length > 2) {
        controllers.pop()?.abort();
        controllers.pop()?.abort();
      }
    }

    return {
      mode,
      samples: samples.length,
      p50Ms: percentile(samples, 0.5),
      p95Ms: percentile(samples, 0.95),
      maxMs: Math.max(...samples),
      maxAckQueueDepth: Math.max(0, ...queueDepths),
    };
  } finally {
    for (const controller of controllers) {
      controller.abort();
    }
  }
}

async function main() {
  const streamResult = await runMode("stream");
  const clientResult = await runMode("client");
  const telemetry = await requestJson("/api/live/telemetry");
  const health = await requestJson("/api/final-stream/health");

  const result = {
    schema: "tt-beamer.p9-hf4-t8-control-matrix.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    stream: streamResult,
    client: clientResult,
    queue: telemetry.payload?.telemetry?.queue ?? null,
    streamHealth: health.payload?.health ?? null,
  };
  result.pass =
    streamResult.p95Ms <= 120
    && clientResult.p95Ms <= 120
    && Number(result.queue?.maxDepthObserved ?? 0) <= 16;

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("control matrix gate failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf4-t8-control-matrix] ${error.message}`);
  process.exitCode = 1;
});
