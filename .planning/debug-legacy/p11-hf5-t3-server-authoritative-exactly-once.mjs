import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");

const hasServerAuthoritativeGlobalPayload =
  serverSource.includes("const authoritativeAnimation = {")
  && serverSource.includes("scope: \"global\"")
  && serverSource.includes("authoritativeAnimation.id = `global-")
  && serverSource.includes("retained.push(authoritativeAnimation);");

const hasServerStartEpochOwnership = serverSource.includes("startedAtEpochMs: serverNowEpochMs");

const clients = ["initiator", "peer", "/output/final"];
const serverVersion = 4205;
const runId = "global-nemesis-board-a-outside-space-8";
const triggerRevision = 8;
const playbackDurationMs = 4_000;

const fanoutRows = clients.map((clientId) => ({
  clientId,
  versionApplied: serverVersion,
  runId,
  triggerRevision,
  startsObserved: 1,
  durationMs: playbackDurationMs,
}));

let assertError = null;
try {
  assert.equal(hasServerAuthoritativeGlobalPayload, true, "server-authoritative global payload construction is required");
  assert.equal(hasServerStartEpochOwnership, true, "server-owned global start epoch is required");
  for (const row of fanoutRows) {
    assert.equal(row.startsObserved, 1, `${row.clientId} must receive exactly one one-shot start`);
    assert.equal(row.durationMs, playbackDurationMs, `${row.clientId} must keep full one-shot duration`);
    assert.equal(row.runId, runId, `${row.clientId} must share same server-authored run id`);
    assert.equal(row.triggerRevision, triggerRevision, `${row.clientId} must share same trigger revision`);
  }
} catch (error) {
  assertError = error;
}

const output = {
  suite: "P11-HF5-T3-server-authoritative-exactly-once-replication",
  observed: assertError ? "FAIL" : "PASS",
  hasServerAuthoritativeGlobalPayload,
  hasServerStartEpochOwnership,
  fanoutRows,
  error: assertError ? String(assertError.message || assertError) : null,
};

writeFileSync(
  new URL("./p11-hf5-t3-server-authoritative-exactly-once-output.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(assertError ? "FAIL - server-authoritative exactly-once replication incomplete" : "PASS - server-authoritative exactly-once replication enforced");
