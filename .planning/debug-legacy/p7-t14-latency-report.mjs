#!/usr/bin/env node

const baseUrl = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";

function quantile(values, q) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[index];
}

async function main() {
  const response = await fetch(`${baseUrl}/api/live/telemetry`);
  if (!response.ok) {
    throw new Error(`telemetry endpoint failed (${response.status})`);
  }
  const payload = await response.json();
  const hops = payload?.telemetry?.hopsMs ?? {};
  const report = {
    generatedAt: new Date().toISOString(),
    source: `${baseUrl}/api/live/telemetry`,
    hops: Object.fromEntries(Object.entries(hops).map(([hop, values]) => [hop, {
      samples: Array.isArray(values) ? values.length : 0,
      p50: quantile(values, 0.5),
      p95: quantile(values, 0.95),
      p99: quantile(values, 0.99),
    }])),
    gates: payload?.telemetry?.gates ?? null,
    queue: payload?.telemetry?.queue ?? null,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
