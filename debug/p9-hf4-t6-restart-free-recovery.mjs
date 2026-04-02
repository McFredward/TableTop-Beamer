import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF4_T6_OUTPUT ?? "debug/p9-hf4-t6-restart-free-recovery-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMutation(index) {
  const { response } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "p9-hf4-t6-recovery",
      mutationId: `hf4-t6-${index}-${Date.now().toString(36)}`,
      mutationType: "context-update",
      payload: {
        reason: "hf4-t6-recovery",
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
}

async function main() {
  const firstController = new AbortController();
  const secondController = new AbortController();
  try {
    const firstResponse = await fetch(`${BASE_URL}/api/final-stream/events`, {
      signal: firstController.signal,
      headers: { accept: "text/event-stream" },
    });
    if (!firstResponse.ok) {
      throw new Error(`initial stream connect failed (${firstResponse.status})`);
    }

    for (let i = 0; i < 20; i += 1) {
      await sendMutation(i);
    }
    await sleep(350);
    const beforeDrop = await requestJson("/api/final-stream/health");

    firstController.abort();
    await sleep(350);

    const secondResponse = await fetch(`${BASE_URL}/api/final-stream/events`, {
      signal: secondController.signal,
      headers: { accept: "text/event-stream" },
    });
    if (!secondResponse.ok) {
      throw new Error(`reconnect stream failed (${secondResponse.status})`);
    }

    for (let i = 20; i < 40; i += 1) {
      await sendMutation(i);
    }
    await sleep(450);

    const afterReconnect = await requestJson("/api/final-stream/health");
    const telemetry = await requestJson("/api/live/telemetry");

    const beforeHealth = beforeDrop.payload?.health ?? {};
    const afterHealth = afterReconnect.payload?.health ?? {};
    const queue = telemetry.payload?.telemetry?.queue ?? {};
    const result = {
      schema: "tt-beamer.p9-hf4-t6-restart-free-recovery.v1",
      measuredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      beforeDrop: beforeHealth,
      afterReconnect: afterHealth,
      queue,
      assertions: {
        producerRunningAfterReconnect: afterHealth?.producer?.running === true,
        streamHealthyAfterReconnect: afterHealth?.healthy === true,
        sourceVersionAdvanced: Number(afterHealth?.sourceVersion ?? 0) >= Number(beforeHealth?.sourceVersion ?? 0),
        queueBounded: Number(queue?.maxDepthObserved ?? 0) <= 16,
      },
    };

    result.pass = Object.values(result.assertions).every(Boolean);
    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    if (!result.pass) {
      throw new Error("restart-free recovery assertions failed");
    }
  } finally {
    firstController.abort();
    secondController.abort();
  }
}

main().catch((error) => {
  console.error(`[p9-hf4-t6-restart-free-recovery] ${error.message}`);
  process.exitCode = 1;
});
