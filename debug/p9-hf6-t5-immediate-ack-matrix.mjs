import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF6_T5_OUTPUT ?? "debug/p9-hf6-t5-immediate-ack-matrix-output.json";
const SAMPLE_COUNT = Math.max(10, Number(process.env.TT_BEAMER_HF6_T5_SAMPLE_COUNT ?? 30));

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

async function runMode(mode) {
  const setModeAck = await sendCommand({
    role: "control",
    clientId: `p9-hf6-t5-mode-${mode}`,
    mutationId: `hf6-t5-mode-${mode}-${Date.now().toString(36)}`,
    mutationType: "context-update",
    payload: {
      reason: `hf6-t5-mode-${mode}`,
      runtime: {
        finalOutputMode: mode,
      },
    },
  });
  if (setModeAck.applied !== true) {
    throw new Error(`mode switch to ${mode} was not applied`);
  }

  const startLatencies = [];
  const stopLatencies = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const animationId = `hf6-t5-${mode}-${index}-${Date.now().toString(36)}`;
    const startAck = await sendCommand({
      role: "control",
      clientId: `p9-hf6-t5-${mode}`,
      mutationId: `hf6-t5-start-${mode}-${index}-${Date.now().toString(36)}`,
      mutationType: "trigger-global",
      payload: {
        action: "start",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
        animation: {
          id: animationId,
          scope: "global",
          type: "outside-space",
          boardId: "nemesis-board-a",
          assetType: "mp4",
          assetRef: "/resources/nemesis/animations/sandstorm.mp4",
          startedAtEpochMs: Date.now(),
        },
      },
    });
    if (startAck.applied !== true || startAck.overflow === true || startAck.timeout === true) {
      throw new Error(`start ack failed in mode ${mode}`);
    }
    startLatencies.push(startAck.latencyMs);

    const stopAck = await sendCommand({
      role: "control",
      clientId: `p9-hf6-t5-${mode}`,
      mutationId: `hf6-t5-stop-${mode}-${index}-${Date.now().toString(36)}`,
      mutationType: "trigger-global",
      payload: {
        action: "stop",
        animationType: "outside-space",
        outsideHint: true,
        boardId: "nemesis-board-a",
      },
    });
    if (stopAck.applied !== true || stopAck.overflow === true || stopAck.timeout === true) {
      throw new Error(`stop ack failed in mode ${mode}`);
    }
    stopLatencies.push(stopAck.latencyMs);
  }

  return {
    mode,
    samples: SAMPLE_COUNT,
    start: {
      p50Ms: percentile(startLatencies, 0.5),
      p95Ms: percentile(startLatencies, 0.95),
      maxMs: Math.max(0, ...startLatencies),
    },
    stop: {
      p50Ms: percentile(stopLatencies, 0.5),
      p95Ms: percentile(stopLatencies, 0.95),
      maxMs: Math.max(0, ...stopLatencies),
    },
  };
}

async function main() {
  const streamResult = await runMode("stream");
  const clientResult = await runMode("client");

  const result = {
    schema: "tt-beamer.p9-hf6-t5-immediate-ack-matrix.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    sampleCount: SAMPLE_COUNT,
    stream: streamResult,
    client: clientResult,
  };

  result.pass =
    streamResult.start.p95Ms <= 200
    && streamResult.stop.p95Ms <= 200
    && clientResult.start.p95Ms <= 200
    && clientResult.stop.p95Ms <= 200;

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("immediate ack matrix failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf6-t5-immediate-ack-matrix] ${error.message}`);
  process.exitCode = 1;
});
