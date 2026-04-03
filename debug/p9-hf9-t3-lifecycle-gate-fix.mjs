import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF9_T3_OUTPUT ?? "debug/p9-hf9-t3-lifecycle-gate-fix-output.json";

async function requestHealth() {
  const response = await fetch(`${BASE_URL}/api/final-stream/health`);
  const payload = await response.json().catch(() => ({}));
  if (response.status !== 200) {
    throw new Error(`health endpoint unavailable (${response.status})`);
  }
  return payload?.health ?? {};
}

async function openVideoReader() {
  const response = await fetch(`${BASE_URL}/api/final-stream/video`, {
    headers: { accept: "multipart/x-mixed-replace" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`video subscribe failed (${response.status})`);
  }
  return response.body.getReader();
}

function snapshot(name, health) {
  return {
    name,
    compositorAlwaysOn: health?.compositorAlwaysOn === true,
    running: health?.producer?.running === true,
    watchdogActive: health?.producer?.watchdogActive === true,
    timerActive: health?.producer?.timerActive === true,
    ticks: Number(health?.producer?.ticks ?? 0),
    msSinceLastTick: Number(health?.producer?.msSinceLastTick ?? -1),
    frameId: Number(health?.frameId ?? 0),
    msSinceLastFrame: Number(health?.msSinceLastFrame ?? -1),
  };
}

async function main() {
  const points = [];

  const boot = await requestHealth();
  points.push(snapshot("boot", boot));

  await new Promise((resolve) => setTimeout(resolve, 700));
  const idle = await requestHealth();
  points.push(snapshot("idle-0-subscriber", idle));

  const readerA = await openVideoReader();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const attach = await requestHealth();
  points.push(snapshot("first-attach", attach));

  await readerA.cancel("hf9-t3-close-a").catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 300));
  const detach = await requestHealth();
  points.push(snapshot("post-detach", detach));

  const readerB = await openVideoReader();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const reconnect = await requestHealth();
  points.push(snapshot("reconnect", reconnect));
  await readerB.cancel("hf9-t3-close-b").catch(() => {});

  const result = {
    schema: "tt-beamer.p9-hf9-t3-lifecycle-gate-fix.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    points,
  };

  result.pass =
    points.length === 5
    && points.every((entry) => entry.running && entry.watchdogActive && entry.timerActive && entry.compositorAlwaysOn)
    && points[points.length - 1].ticks >= points[0].ticks;

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("compositor always-on lifecycle gate did not hold across sequences");
  }
}

main().catch((error) => {
  console.error(`[p9-hf9-t3-lifecycle-gate-fix] ${error.message}`);
  process.exitCode = 1;
});
