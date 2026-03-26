#!/usr/bin/env node
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";

async function readJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status})`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readHopSamples(payload) {
  const hopsMs = payload?.telemetry?.hopsMs;
  assert(hopsMs && typeof hopsMs === "object", "missing telemetry.hopsMs");
  const requiredHops = ["ingestToCommit", "commitToClientAck", "commitToApplyAck"];
  for (const hop of requiredHops) {
    assert(Array.isArray(hopsMs[hop]), `missing telemetry.hopsMs.${hop}`);
  }
  return hopsMs;
}

function assertMissingHopsMsFails(payload) {
  const withoutHopsMs = {
    ...payload,
    telemetry: {
      ...(payload?.telemetry ?? {}),
      hopsMs: undefined,
    },
  };
  let failed = false;
  try {
    readHopSamples(withoutHopsMs);
  } catch {
    failed = true;
  }
  assert(failed, "negative-path failed: missing hopsMs was accepted");
}

async function main() {
  const before = await readJson("/api/live/telemetry");
  assert(before?.ok === true, "telemetry endpoint unavailable");
  assert(typeof before?.telemetry?.queue?.depth === "number", "missing queue depth metric");

  await delay(250);

  const after = await readJson("/api/live/telemetry");
  const state = await readJson("/api/live/state");
  assert(after?.ok === true, "telemetry refresh failed");
  assert(state?.ok === true, "live state endpoint unavailable");

  const queue = after.telemetry.queue;
  const hopsMs = readHopSamples(after);
  assert(queue.depth >= 0, "queue depth invalid");
  assert(queue.maxDepthObserved >= queue.depth, "max depth invariant broken");
  assert(queue.droppedOverflow >= 0, "overflow metric invalid");
  assertMissingHopsMsFails(after);

  console.log(JSON.stringify({
    pass: true,
    queue,
    sessionVersion: state.session?.version ?? null,
    hopSamples: {
      ingestToCommit: hopsMs.ingestToCommit.length,
      commitToClientAck: hopsMs.commitToClientAck.length,
      commitToApplyAck: hopsMs.commitToApplyAck.length,
    },
    schemaGuard: {
      usesHopsMsOnly: true,
      missingHopsMsRejected: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
