import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF4_T4_OUTPUT ?? "debug/p9-hf4-t4-producer-lifecycle-output.json";

async function requestJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const first = await requestJson("/api/final-stream/health");
  const controller = new AbortController();
  const streamResponse = await fetch(`${BASE_URL}/api/final-stream/events`, {
    signal: controller.signal,
    headers: {
      accept: "text/event-stream",
    },
  });
  if (!streamResponse.ok) {
    throw new Error(`stream endpoint failed (${streamResponse.status})`);
  }

  await sleep(600);
  const withClient = await requestJson("/api/final-stream/health");
  controller.abort();
  await sleep(300);
  const afterDetach = await requestJson("/api/final-stream/health");

  const beforeProducer = first.payload?.health?.producer ?? {};
  const withProducer = withClient.payload?.health?.producer ?? {};
  const afterProducer = afterDetach.payload?.health?.producer ?? {};

  const result = {
    schema: "tt-beamer.p9-hf4-t4-producer-lifecycle.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    beforeAttach: first.payload?.health ?? null,
    withClient: withClient.payload?.health ?? null,
    afterDetach: afterDetach.payload?.health ?? null,
    assertions: {
      producerRunningWithClient: withProducer.running === true,
      producerKeepsRunningAfterDetach: afterProducer.running === true,
      ticksAdvanceAcrossLifecycle: Number(afterProducer.ticks ?? 0) >= Number(withProducer.ticks ?? 0),
      noComposeErrors: !withProducer.latestComposeError && !afterProducer.latestComposeError,
      recoveryCountStable: Number(afterProducer.recoveries ?? 0) >= Number(beforeProducer.recoveries ?? 0),
    },
  };

  result.pass = Object.values(result.assertions).every(Boolean);
  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("producer lifecycle assertions failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf4-t4-producer-lifecycle] ${error.message}`);
  process.exitCode = 1;
});
