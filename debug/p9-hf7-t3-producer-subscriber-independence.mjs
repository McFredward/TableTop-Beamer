import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF7_T3_OUTPUT ?? "debug/p9-hf7-t3-producer-subscriber-independence-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function openSse() {
  const response = await fetch(`${BASE_URL}/api/final-stream/events`, {
    headers: { accept: "text/event-stream" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`stream subscribe failed (${response.status})`);
  }
  return response.body.getReader();
}

async function main() {
  const before = await requestJson("/api/final-stream/health");
  const firstReader = await openSse();
  const withSubscriber = await requestJson("/api/final-stream/health");
  await firstReader.cancel("hf7-t3-first-close").catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 200));
  const afterDetach = await requestJson("/api/final-stream/health");
  const secondReader = await openSse();
  const afterReconnect = await requestJson("/api/final-stream/health");
  await secondReader.cancel("hf7-t3-second-close").catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 200));
  const afterAllClosed = await requestJson("/api/final-stream/health");

  const snapshots = {
    before: before.payload?.health ?? {},
    withSubscriber: withSubscriber.payload?.health ?? {},
    afterDetach: afterDetach.payload?.health ?? {},
    afterReconnect: afterReconnect.payload?.health ?? {},
    afterAllClosed: afterAllClosed.payload?.health ?? {},
  };

  const result = {
    schema: "tt-beamer.p9-hf7-t3-producer-subscriber-independence.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    snapshots,
  };

  result.pass =
    snapshots.before?.producer?.running === true
    && snapshots.withSubscriber?.producer?.running === true
    && snapshots.afterDetach?.producer?.running === true
    && snapshots.afterReconnect?.producer?.running === true
    && snapshots.afterAllClosed?.producer?.running === true
    && Number(snapshots.afterAllClosed?.connectedClients ?? Number.POSITIVE_INFINITY)
      <= Number(snapshots.before?.connectedClients ?? Number.NEGATIVE_INFINITY);

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("producer did not remain authoritative across 0/1/N subscriber states");
  }
}

main().catch((error) => {
  console.error(`[p9-hf7-t3-producer-subscriber-independence] ${error.message}`);
  process.exitCode = 1;
});
