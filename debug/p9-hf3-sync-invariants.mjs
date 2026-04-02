import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_SYNC_OUTPUT ?? "debug/p9-hf3-sync-invariants-output.json";

async function requestJson(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendCommand({ mutationId, mutationType, payload }) {
  const { response, payload: body } = await requestJson("/api/live/command", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      role: "control",
      clientId: "p9-hf3-sync-check",
      mutationId,
      mutationType,
      payload,
    }),
  });
  if (!response.ok && response.status !== 202) {
    throw new Error(`command ${mutationType} failed (${response.status})`);
  }
  return body;
}

async function main() {
  const startedAt = new Date().toISOString();
  const checks = [];

  const health = await requestJson("/api/health");
  if (!health.response.ok) {
    throw new Error(`health failed (${health.response.status})`);
  }

  const modeMutationId = `hf3-mode-${Date.now().toString(36)}`;
  const modeAck = await sendCommand({
    mutationId: modeMutationId,
    mutationType: "context-update",
    payload: {
      reason: "hf3-sync-test-mode",
      runtime: {
        finalOutputMode: "stream",
      },
    },
  });

  const duplicateAck = await sendCommand({
    mutationId: modeMutationId,
    mutationType: "context-update",
    payload: {
      reason: "hf3-sync-test-mode-duplicate",
      runtime: {
        finalOutputMode: "stream",
      },
    },
  });

  const alignOnAck = await sendCommand({
    mutationId: `hf3-align-on-${Date.now().toString(36)}`,
    mutationType: "context-update",
    payload: {
      reason: "hf3-sync-align-on",
      alignMode: true,
      runtime: {
        alignMode: true,
      },
    },
  });

  const alignOffAck = await sendCommand({
    mutationId: `hf3-align-off-${Date.now().toString(36)}`,
    mutationType: "context-update",
    payload: {
      reason: "hf3-sync-align-off",
      alignMode: false,
      runtime: {
        alignMode: false,
      },
    },
  });

  const snapshot = await requestJson(`/api/live/snapshot?sinceVersion=${Math.max(0, Number(modeAck?.version || 0) - 1)}`);
  const session = snapshot.payload?.session ?? {};

  checks.push({
    name: "monotonic-version",
    pass:
      Number(modeAck?.version || 0) > 0
      && Number(alignOnAck?.version || 0) > Number(modeAck?.version || 0)
      && Number(alignOffAck?.version || 0) > Number(alignOnAck?.version || 0),
  });
  checks.push({
    name: "idempotent-duplicate-mutation-id",
    pass: duplicateAck?.duplicate === true && duplicateAck?.applied === false,
  });
  checks.push({
    name: "snapshot-version-not-older-than-last-ack",
    pass: Number(session?.version || 0) >= Number(alignOffAck?.version || 0),
  });
  checks.push({
    name: "stream-mode-state-present",
    pass: String(session?.snapshot?.runtime?.finalOutputMode || "") === "stream",
  });

  const result = {
    schema: "tt-beamer.p9-hf3-sync-invariants.v1",
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks,
    pass: checks.every((entry) => entry.pass === true),
    versions: {
      mode: modeAck?.version ?? null,
      alignOn: alignOnAck?.version ?? null,
      alignOff: alignOffAck?.version ?? null,
      snapshot: session?.version ?? null,
    },
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("sync invariant checks failed");
  }
}

main().catch((error) => {
  console.error(`[p9-hf3-sync-invariants] ${error.message}`);
  process.exitCode = 1;
});
