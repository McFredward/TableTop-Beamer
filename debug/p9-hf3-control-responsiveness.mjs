import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_CONTROL_OUTPUT ?? "debug/p9-hf3-control-responsiveness-output.json";

function percentile(values, q) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[idx];
}

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendCommand(index) {
  const now = Date.now();
  const { response, payload } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "p9-hf3-control-responsiveness",
      mutationId: `hf3-control-${index}-${Date.now().toString(36)}`,
      mutationType: "context-update",
      payload: {
        reason: "hf3-control-latency",
        alignMode: index % 2 === 0,
        runtime: {
          finalOutputMode: "stream",
          alignMode: index % 2 === 0,
        },
      },
    }),
  });
  if (response.status !== 202) {
    throw new Error(`command rejected (${response.status})`);
  }
  return {
    latencyMs: Date.now() - now,
    version: Number(payload?.version || 0),
  };
}

async function main() {
  const streamController = new AbortController();
  const streamPromise = fetch(`${BASE_URL}/api/final-stream/events`, {
    signal: streamController.signal,
    headers: {
      accept: "text/event-stream",
    },
  });

  const streamResponse = await streamPromise;
  if (!streamResponse.ok) {
    throw new Error(`stream endpoint failed (${streamResponse.status})`);
  }

  const samples = [];
  for (let index = 0; index < 24; index += 1) {
    const sample = await sendCommand(index);
    samples.push(sample.latencyMs);
  }

  const health = await requestJson("/api/final-stream/health");
  streamController.abort();

  const p95 = percentile(samples, 0.95);
  const p50 = percentile(samples, 0.5);
  const result = {
    schema: "tt-beamer.p9-hf3-control-responsiveness.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    sampleCount: samples.length,
    p50Ms: p50,
    p95Ms: p95,
    maxMs: Math.max(...samples),
    minMs: Math.min(...samples),
    streamHealth: health.payload?.health ?? null,
    thresholdMs: 120,
    pass: p95 <= 120,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error(`p95 ${p95}ms exceeds threshold`);
  }
}

main().catch((error) => {
  console.error(`[p9-hf3-control-responsiveness] ${error.message}`);
  process.exitCode = 1;
});
