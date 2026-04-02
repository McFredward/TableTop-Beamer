import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_WEAK_OUTPUT ?? "debug/p9-hf3-weak-hardware-matrix-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendToggleCommand(index) {
  const alignOn = index % 2 === 0;
  return requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "p9-hf3-weak-matrix",
      mutationId: `hf3-weak-${index}-${Date.now().toString(36)}`,
      mutationType: "context-update",
      payload: {
        reason: "hf3-weak-load",
        alignMode: alignOn,
        runtime: {
          finalOutputMode: "stream",
          alignMode: alignOn,
        },
      },
    }),
  });
}

async function sampleStreamFrames(durationMs = 2000) {
  const controller = new AbortController();
  const response = await fetch(`${BASE_URL}/api/final-stream/events`, {
    signal: controller.signal,
    headers: { accept: "text/event-stream" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`stream connect failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const frameTimestamps = [];
  let heartbeatCount = 0;

  const stopAt = Date.now() + durationMs;
  while (Date.now() < stopAt) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let splitIndex = buffer.indexOf("\n\n");
    while (splitIndex >= 0) {
      const rawEvent = buffer.slice(0, splitIndex);
      buffer = buffer.slice(splitIndex + 2);
      const lines = rawEvent.split("\n");
      const eventType = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
      if (eventType === "frame") {
        frameTimestamps.push(Date.now());
      } else if (eventType === "heartbeat") {
        heartbeatCount += 1;
      }
      splitIndex = buffer.indexOf("\n\n");
    }
  }

  controller.abort();
  return {
    frameCount: frameTimestamps.length,
    heartbeatCount,
    fpsApprox: frameTimestamps.length / Math.max(0.001, durationMs / 1000),
  };
}

async function main() {
  const startedAt = new Date().toISOString();

  await sendToggleCommand(0);
  for (let index = 1; index <= 30; index += 1) {
    await sendToggleCommand(index);
  }

  const primarySample = await sampleStreamFrames(2200);
  const healthBefore = await requestJson("/api/final-stream/health");
  const reconnectSample = await sampleStreamFrames(1500);
  const healthAfter = await requestJson("/api/final-stream/health");

  const checks = [
    {
      name: "stream-event-cadence-under-load",
      pass: ((primarySample.frameCount + primarySample.heartbeatCount) / 2.2) >= 2,
      detail: primarySample,
    },
    {
      name: "stream-reconnect-recovers-frames",
      pass: reconnectSample.frameCount >= 1,
      detail: reconnectSample,
    },
    {
      name: "health-endpoint-reports-stream-state",
      pass:
        String(healthBefore.payload?.health?.schema || "").includes("final-stream-health")
        && Number.isFinite(Number(healthAfter.payload?.health?.sourceVersion)),
      detail: {
        before: healthBefore.payload?.health ?? null,
        after: healthAfter.payload?.health ?? null,
      },
    },
  ];

  const result = {
    schema: "tt-beamer.p9-hf3-weak-hardware-matrix.v1",
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks,
    pass: checks.every((entry) => entry.pass === true),
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("weak hardware matrix checks failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf3-weak-matrix] ${error.message}`);
  process.exitCode = 1;
});
