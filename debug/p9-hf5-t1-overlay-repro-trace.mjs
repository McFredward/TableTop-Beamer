import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF5_T1_OUTPUT ?? "debug/p9-hf5-t1-overlay-repro-trace-output.json";

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
  return response;
}

async function readFirstFrame(response, timeoutMs = 5000) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const started = Date.now();
  let buffer = "";

  try {
    while (Date.now() - started < timeoutMs) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const lines = chunk.split("\n").map((line) => line.trimEnd());
        const eventLine = lines.find((line) => line.startsWith("event:"));
        if (!eventLine || eventLine.slice(6).trim() !== "frame") {
          continue;
        }
        const data = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        return JSON.parse(data || "{}");
      }
    }
  } finally {
    await reader.cancel("hf5-t1-frame-captured").catch(() => {});
  }
  throw new Error("no frame received within timeout");
}

async function main() {
  const streamResponse = await openSse();
  const frame = await readFirstFrame(streamResponse);
  const frameText = JSON.stringify(frame);

  const result = {
    schema: "tt-beamer.p9-hf5-t1-overlay-repro-trace.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    streamContractKeys: Object.keys(frame).sort(),
    visualKeys: Object.keys(frame?.visual || {}).sort(),
    hasLegacyModeField: Object.prototype.hasOwnProperty.call(frame, "mode"),
    hasLegacyBoardLabel: Boolean(frame?.board?.label),
    hasLegacyRoomLabel: Array.isArray(frame?.runningAnimations)
      ? frame.runningAnimations.some((entry) => Boolean(entry?.roomLabel))
      : false,
    containsServerStreamActiveText: frameText.includes("SERVER STREAM ACTIVE"),
    containsRunningOverlayText: frameText.includes("running "),
  };

  const health = await requestJson("/api/final-stream/health");
  result.streamHealth = health.payload?.health ?? null;
  result.pass =
    !result.hasLegacyModeField
    && !result.hasLegacyBoardLabel
    && !result.hasLegacyRoomLabel
    && !result.containsServerStreamActiveText;

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("overlay repro trace indicates legacy overlay fields are still present");
  }
}

main().catch((error) => {
  console.error(`[p9-hf5-t1-overlay-repro-trace] ${error.message}`);
  process.exitCode = 1;
});
