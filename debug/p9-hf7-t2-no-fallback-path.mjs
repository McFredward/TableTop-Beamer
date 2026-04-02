import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF7_T2_OUTPUT ?? "debug/p9-hf7-t2-no-fallback-path-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendModeAttempt(mode) {
  const mutationId = `hf7-t2-mode-${mode}-${Date.now().toString(36)}`;
  const { response, payload } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "hf7-t2",
      mutationId,
      mutationType: "context-update",
      payload: {
        reason: `hf7-t2-mode-${mode}`,
        runtime: {
          finalOutputMode: mode,
        },
      },
    }),
  });
  if (response.status !== 202 || payload?.applied !== true) {
    throw new Error(`mode command ${mode} rejected`);
  }
  const snapshot = await requestJson("/api/live/snapshot");
  const runtimeMode = String(snapshot.payload?.session?.snapshot?.runtime?.finalOutputMode || "");
  return {
    attempted: mode,
    applied: payload.applied === true,
    version: Number(payload.version ?? 0),
    runtimeMode,
    persistedAsStream: runtimeMode === "stream",
  };
}

async function main() {
  const [autoAttempt, clientAttempt, streamAttempt] = await Promise.all([
    sendModeAttempt("auto"),
    sendModeAttempt("client"),
    sendModeAttempt("stream"),
  ]);
  const htmlResponse = await fetch(`${BASE_URL}/output/final`);
  const html = await htmlResponse.text();
  const modeSelectMatch = html.match(/<select id="final-output-mode-select"[\s\S]*?<\/select>/i);
  const modeSelectHtml = modeSelectMatch?.[0] ?? "";
  const optionCount = (modeSelectHtml.match(/<option value=/g) || []).length;
  const hasClientOption = html.includes('value="client"');
  const hasAutoOption = html.includes('value="auto"');

  const result = {
    schema: "tt-beamer.p9-hf7-t2-no-fallback-path.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    attempts: [autoAttempt, clientAttempt, streamAttempt],
    ui: {
      finalOutputModeOptionCount: optionCount,
      hasClientOption,
      hasAutoOption,
    },
  };

  result.pass =
    result.attempts.every((entry) => entry.persistedAsStream)
    && result.ui.finalOutputModeOptionCount === 1
    && !result.ui.hasClientOption
    && !result.ui.hasAutoOption;

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("fallback path still detectable");
  }
}

main().catch((error) => {
  console.error(`[p9-hf7-t2-no-fallback-path] ${error.message}`);
  process.exitCode = 1;
});
