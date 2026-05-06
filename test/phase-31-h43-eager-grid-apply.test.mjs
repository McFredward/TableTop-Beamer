// Phase-31 h43 — eager grid apply in live-hello + poll handlers.
//
// Regression pin for the boot-time SSR-tab desync. The bug: live-hello
// arrives with the seeded lastAlignGridSnapshot but applyLiveRuntimeSnapshot
// throws somewhere in its 200+ lines of pre-grid-apply code (polygon
// hydration, FX normalization, animations reconciliation) before reaching
// the grid apply at line ~490. The outer message-handler try/catch silently
// swallows the throw ("ignore malformed live-sync payloads"). Result:
// the SSR-tab's mesh-warp keeps using its default 10/90 grid even though
// Pi sees the profile-correct lines, until any drag triggers the align-
// grid-snapshot fast-path which DOESN'T go through the broken applyLive
// path.
//
// h43 fix: apply runtime.lastAlignGridSnapshot EAGERLY in the live-hello
// and poll handlers BEFORE applyLiveRuntimeSnapshot, with its own
// try/catch. Idempotent (gated by _lastAppliedAlignGridSnapshotKey).
//
// This test source-greps the live-sync core to verify the eager apply
// path exists in BOTH locations (live-hello + poll). A future refactor
// that drops the eager apply in favor of "fixing the throw" alone would
// risk regressing — so this test pins the redundant safety net.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(
  "./src/app/runtime/live-sync/runtime-live-sync-core.js",
  "utf8",
);

test("h43: live-hello handler eager-applies lastAlignGridSnapshot BEFORE applyLiveRuntimeSnapshot", () => {
  // The eager apply must be inside the `payload?.type === "live-hello"`
  // block AND before the applyLiveRuntimeSnapshot call.
  const helloBlockStart = SRC.indexOf('payload?.type === "live-hello"');
  assert.ok(helloBlockStart > 0, "live-hello block must exist");

  // Find the applyLiveRuntimeSnapshot call inside the live-hello block.
  const helloBlockEnd = SRC.indexOf('payload?.type === "live-session-update"', helloBlockStart);
  const helloBlock = SRC.slice(helloBlockStart, helloBlockEnd);
  const eagerApplyIdx = helloBlock.indexOf("live-hello eager-apply");
  const applyLiveRuntimeSnapshotIdx = helloBlock.indexOf("applyLiveRuntimeSnapshot(helloSnapshot");
  assert.ok(eagerApplyIdx > 0, "h43 eager apply must exist in live-hello block");
  assert.ok(applyLiveRuntimeSnapshotIdx > 0, "applyLiveRuntimeSnapshot call must exist in live-hello block");
  assert.ok(
    eagerApplyIdx < applyLiveRuntimeSnapshotIdx,
    "h43 eager apply must come BEFORE applyLiveRuntimeSnapshot — otherwise a throw in applyLive shrouds the grid apply",
  );
});

test("h43: poll handler eager-applies lastAlignGridSnapshot BEFORE applyLiveRuntimeSnapshot", () => {
  const pollFnStart = SRC.indexOf("async function pollLiveSnapshotOnce");
  assert.ok(pollFnStart > 0, "pollLiveSnapshotOnce must exist");

  // Find the end of pollLiveSnapshotOnce.
  const pollFnEnd = SRC.indexOf("async function emitLiveMutation", pollFnStart);
  const pollFnBody = SRC.slice(pollFnStart, pollFnEnd);
  const eagerApplyIdx = pollFnBody.indexOf("poll eager-apply");
  const applyLiveRuntimeSnapshotIdx = pollFnBody.indexOf("applyLiveRuntimeSnapshot(envelope.snapshot");
  assert.ok(eagerApplyIdx > 0, "h43 eager apply must exist in poll handler");
  assert.ok(applyLiveRuntimeSnapshotIdx > 0, "applyLiveRuntimeSnapshot call must exist in poll handler");
  assert.ok(
    eagerApplyIdx < applyLiveRuntimeSnapshotIdx,
    "h43 eager apply must come BEFORE applyLiveRuntimeSnapshot in poll handler",
  );
});

test("h43: eager apply is wrapped in its own try/catch (decoupled from applyLive throw)", () => {
  // Find both eager-apply log strings and verify a downstream catch logs
  // their failure. The catch must NOT be a sibling of applyLiveRuntimeSnapshot.
  const heloIdx = SRC.indexOf("live-hello eager-apply");
  const pollIdx = SRC.indexOf("poll eager-apply");
  assert.ok(heloIdx > 0 && pollIdx > 0, "both eager-apply log markers must exist");

  const heloSuffix = SRC.slice(heloIdx, heloIdx + 2500);
  assert.match(
    heloSuffix,
    /\}\s*catch\s*\(err\)\s*\{[\s\S]*?live-hello eager-apply failed/,
    "live-hello eager-apply must have a catch block that logs failure",
  );
  const pollSuffix = SRC.slice(pollIdx, pollIdx + 2500);
  assert.match(
    pollSuffix,
    /\}\s*catch\s*\(err\)\s*\{[\s\S]*?poll eager-apply failed/,
    "poll eager-apply must have a catch block that logs failure",
  );
});

test("h43: eager apply uses the same dedup key as the slow-path lastAlignGridSnapshot block", () => {
  // The dedup key shape is `${at}:${profileId}:${points.length}` — must be
  // identical between fast-eager and slow-applyLive paths so a successful
  // eager apply prevents a duplicate slow apply (and vice versa).
  const matches = SRC.match(/snapKey\s*=[\s\S]+?points\?\.length\s*\|\|\s*0/g);
  assert.ok(
    matches && matches.length >= 3,
    `expected at least 3 snapKey constructions (live-hello eager + poll eager + slow); got ${matches?.length}`,
  );
});

test("h43: eager apply gates on OUTPUT_ROLE_FINAL (only SSR-tab + Pi /output/ paths apply)", () => {
  // The dashboard (CONTROL role) must NOT apply the seeded grid — it
  // doesn't have the GL renderer in the visible path.
  // Search the live-hello block (defined by the type check + first
  // applyLiveRuntimeSnapshot call boundary) for the OUTPUT_ROLE_FINAL gate.
  const helloBlockStart = SRC.indexOf('payload?.type === "live-hello"');
  const helloBlockEnd = SRC.indexOf('payload?.type === "live-session-update"', helloBlockStart);
  const helloBlock = SRC.slice(helloBlockStart, helloBlockEnd);
  assert.match(helloBlock, /OUTPUT_ROLE_FINAL/, "live-hello block must gate eager apply on OUTPUT_ROLE_FINAL");

  const pollFnStart = SRC.indexOf("async function pollLiveSnapshotOnce");
  const pollFnEnd = SRC.indexOf("async function emitLiveMutation", pollFnStart);
  const pollBody = SRC.slice(pollFnStart, pollFnEnd);
  assert.match(pollBody, /OUTPUT_ROLE_FINAL/, "poll body must gate eager apply on OUTPUT_ROLE_FINAL");
});

test("h43: eager apply skips when local client is the originator (avoid self-clobber)", () => {
  // The originator gate prevents the SSR tab from applying its own
  // broadcast back to itself if the SSR tab ever broadcasts (h31 path).
  const helloBlockStart = SRC.indexOf('payload?.type === "live-hello"');
  const helloBlockEnd = SRC.indexOf('payload?.type === "live-session-update"', helloBlockStart);
  const helloBlock = SRC.slice(helloBlockStart, helloBlockEnd);
  // Two `isOriginator =` constructions in the live-hello block: only one
  // belongs to the eager apply (the other is in the slow path nested via
  // applyLiveRuntimeSnapshot). The eager one must come BEFORE applyLive.
  const eagerIdx = helloBlock.indexOf("live-hello eager-apply");
  const eagerRegion = helloBlock.slice(Math.max(0, eagerIdx - 2000), eagerIdx);
  assert.match(eagerRegion, /isOriginator\s*=/, "live-hello eager-apply region must check originator");

  const pollFnStart = SRC.indexOf("async function pollLiveSnapshotOnce");
  const pollFnEnd = SRC.indexOf("async function emitLiveMutation", pollFnStart);
  const pollBody = SRC.slice(pollFnStart, pollFnEnd);
  const pollEagerIdx = pollBody.indexOf("poll eager-apply");
  const pollEagerRegion = pollBody.slice(Math.max(0, pollEagerIdx - 2000), pollEagerIdx);
  assert.match(pollEagerRegion, /isOriginator\s*=/, "poll eager-apply region must check originator");
});
