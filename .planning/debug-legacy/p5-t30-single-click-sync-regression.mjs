import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const appJs = await readFile(path.join(ROOT, "src/app.js"), "utf8");
  const serverJs = await readFile(path.join(ROOT, "server.mjs"), "utf8");

  // Outside mode/direction single-click sync guardrails
  expect(appJs.includes('emitLiveMutation("outside-update"'), "outside update mutation emitter missing");
  expect(appJs.includes("outsideFx:"), "outside update payload must include focused outsideFx patch");

  // Room action payload completeness for authoritative apply
  expect(appJs.includes('emitLiveMutation("trigger-room"'), "trigger-room mutation emitter missing");
  expect(appJs.includes('emitLiveMutation("edit-room"'), "edit-room mutation emitter missing");
  expect(appJs.includes("buildAnimationSnapshotForLiveSync"), "room mutation snapshot builder missing");

  // Server-authoritative idempotent apply
  expect(serverJs.includes("applyOutsideUpdatePatch"), "server outside authoritative apply helper missing");
  expect(serverJs.includes("applyRoomMutationPatch"), "server room authoritative apply helper missing");
  expect(serverJs.includes("processedMutations"), "server mutation dedup cache missing");

  // Ack + broadcast metadata contract
  expect(serverJs.includes('buildLiveSessionEnvelope("live-ack"'), "live ack envelope missing");
  expect(serverJs.includes("mutationId"), "ack/broadcast mutationId metadata missing");
  expect(serverJs.includes("version:"), "ack/broadcast version metadata missing");
  expect(serverJs.includes("applied:"), "ack applied flag missing");

  // Ordering/versioning for burst toggles
  expect(serverJs.includes("lastClientSequenceById"), "server per-client sequence tracking missing");
  expect(serverJs.includes("stale: true"), "server stale-drop result missing");

  // Join/reconnect + inflight drift guards
  expect(appJs.includes("lastSessionVersion"), "client last session version guard missing");
  expect(appJs.includes("replayPendingLiveMutations"), "client inflight replay helper missing");
  expect(appJs.includes("baseVersion"), "client mutation baseVersion metadata missing");

  console.log("P5_T30_SINGLE_CLICK_SYNC_GUARDS=PASS");
}

main().catch((error) => {
  console.error(`P5_T30_SINGLE_CLICK_SYNC_GUARDS=FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
