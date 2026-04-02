import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF4_T7_OUTPUT ?? "debug/p9-hf4-t7-sync-align-parity-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendAlign(enabled, index) {
  const { response, payload } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "p9-hf4-t7-sync-align",
      mutationId: `hf4-t7-${index}-${Date.now().toString(36)}`,
      mutationType: "context-update",
      payload: {
        reason: "hf4-t7-align-parity",
        alignMode: enabled,
        runtime: {
          alignMode: enabled,
          finalOutputMode: "stream",
        },
      },
    }),
  });
  if (response.status !== 202) {
    throw new Error(`align command rejected (${response.status})`);
  }
  return Number(payload?.version ?? 0);
}

async function main() {
  const versions = [];
  versions.push(await sendAlign(true, 1));
  versions.push(await sendAlign(false, 2));
  versions.push(await sendAlign(true, 3));

  const state = await requestJson("/api/live/state");
  const telemetry = await requestJson("/api/live/telemetry");
  const health = await requestJson("/api/final-stream/health");

  const snapshot = state.payload?.session?.snapshot ?? {};
  const monotonic = versions.every((version, index) => index === 0 || version >= versions[index - 1]);
  const result = {
    schema: "tt-beamer.p9-hf4-t7-sync-align-parity.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    versions,
    finalAlignMode: Boolean(snapshot?.alignMode),
    telemetryQueue: telemetry.payload?.telemetry?.queue ?? null,
    streamHealth: health.payload?.health ?? null,
    assertions: {
      versionMonotonic: monotonic,
      alignPersisted: Boolean(snapshot?.alignMode) === true,
      queueBounded: Number(telemetry.payload?.telemetry?.queue?.maxDepthObserved ?? 0) <= 8,
      producerHealthy: Boolean(health.payload?.health?.healthy),
    },
  };
  result.pass = Object.values(result.assertions).every(Boolean);

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("sync/align parity assertions failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf4-t7-sync-align-parity] ${error.message}`);
  process.exitCode = 1;
});
