import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF9_T1_OUTPUT ?? "debug/p9-hf9-t1-compositor-gate-repro-output.json";
const SHORT_SAMPLE_MS = Math.max(60, Number(process.env.TT_BEAMER_HF9_T1_SHORT_SAMPLE_MS ?? 120));
const NORMAL_SAMPLE_MS = Math.max(900, Number(process.env.TT_BEAMER_HF9_T1_NORMAL_SAMPLE_MS ?? 900));
const FINAL_STREAM_PUSH_INTERVAL_MS = 250;

async function requestHealth() {
  const response = await fetch(`${BASE_URL}/api/final-stream/health`);
  const payload = await response.json().catch(() => ({}));
  if (response.status !== 200) {
    throw new Error(`health endpoint unavailable (${response.status})`);
  }
  return payload?.health ?? {};
}

function evaluateStrictGate(before, after) {
  return Boolean(after?.producer?.running) && Number(after?.frameId ?? 0) > Number(before?.frameId ?? 0);
}

async function sampleWindow(sampleMs) {
  const before = await requestHealth();
  await new Promise((resolve) => setTimeout(resolve, sampleMs));
  const after = await requestHealth();
  return {
    sampleMs,
    before,
    after,
    strictGate: evaluateStrictGate(before, after),
  };
}

async function sampleStrictGateMismatchWindow() {
  let before = await requestHealth();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const msSinceLastFrame = Number(before?.msSinceLastFrame ?? Number.POSITIVE_INFINITY);
    if (Number.isFinite(msSinceLastFrame) && msSinceLastFrame <= Math.floor(FINAL_STREAM_PUSH_INTERVAL_MS * 0.45)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 35));
    before = await requestHealth();
  }
  await new Promise((resolve) => setTimeout(resolve, SHORT_SAMPLE_MS));
  const after = await requestHealth();
  return {
    sampleMs: SHORT_SAMPLE_MS,
    before,
    after,
    strictGate: evaluateStrictGate(before, after),
  };
}

async function main() {
  const shortWindow = await sampleStrictGateMismatchWindow();
  const normalWindow = await sampleWindow(NORMAL_SAMPLE_MS);

  const result = {
    schema: "tt-beamer.p9-hf9-t1-compositor-gate-repro.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    shortWindow,
    normalWindow,
    observations: {
      producerRunningDuringShortWindow: shortWindow.after?.producer?.running === true,
      healthHealthyDuringShortWindow: shortWindow.after?.healthy === true,
      strictGateFalseDuringShortWindow: shortWindow.strictGate === false,
      strictGateTrueDuringNormalWindow: normalWindow.strictGate === true,
    },
  };

  result.pass =
    result.observations.producerRunningDuringShortWindow
    && result.observations.healthHealthyDuringShortWindow
    && result.observations.strictGateFalseDuringShortWindow
    && result.observations.strictGateTrueDuringNormalWindow;

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("failed to deterministically reproduce strict gate mismatch");
  }
}

main().catch((error) => {
  console.error(`[p9-hf9-t1-compositor-gate-repro] ${error.message}`);
  process.exitCode = 1;
});
