#!/usr/bin/env node
import { setTimeout as delay } from "node:timers/promises";
import { readFile } from "node:fs/promises";

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

function sliceBetween(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker);
  assert(startIndex >= 0, `missing start marker: ${startMarker}`);
  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
  assert(endIndex >= 0, `missing end marker: ${endMarker}`);
  return source.slice(startIndex, endIndex);
}

function assertNoDraftMutationInStartPath(source) {
  const startBody = sliceBetween(source, "function startRoomAnimationFromDraft()", "\nfunction stopAnimation(");
  const forbiddenAssignments = [
    /state\.roomDraft\.animationId\s*=(?!=)/,
    /state\.roomDraft\.targetType\s*=(?!=)/,
    /state\.roomDraft\.targetId\s*=(?!=)/,
    /state\.roomDraft\.opacity\s*=(?!=)/,
    /state\.roomDraft\.playbackSpeed\s*=(?!=)/,
    /state\.roomDraft\.intensity\s*=(?!=)/,
    /state\.roomDraft\.speed\s*=(?!=)/,
    /state\.roomDraft\.soundVolume\s*=(?!=)/,
  ];
  for (const assignmentPattern of forbiddenAssignments) {
    assert(!assignmentPattern.test(startBody), `draft mutation detected in start path: ${assignmentPattern}`);
  }
  assert(!startBody.includes("ROOM_ANIMATIONS[0]?.id ?? \"kaputt\""), "default-animation fallback reset detected in start path");
}

function assertSnapshotDraftApplyGuard(source) {
  assert(
    /if\s*\(outputRole\s*!==\s*OUTPUT_ROLE_CONTROL\s*&&\s*runtime\.roomDraft\s*&&\s*typeof runtime\.roomDraft === "object"\)/.test(source),
    "snapshot draft apply guard for control role missing",
  );
}

function assertAlignToggleUsesContextUpdate(source) {
  assert(
    /function setAlignMode\(enabled, \{ emit = true \} = \{\}\)\s*\{[\s\S]*emitLiveMutation\("context-update", \{[\s\S]*reason: "align-toggle"[\s\S]*alignMode: nextAlignMode/.test(source),
    "align toggle is not routed through context-update command payload",
  );
}

function assertAlignPanelSyncAppliedOnSnapshot(source) {
  assert(
    /function applyLiveRuntimeSnapshot\([\s\S]*syncAlignModePanel\(\);[\s\S]*if \(!isFastFinalApply && outputRole !== OUTPUT_ROLE_FINAL\)/.test(source),
    "snapshot apply does not synchronize align panel before role-specific fast path",
  );
}

function assertBoardSwitchRunningClearInContextPatch(source) {
  assert(
    /function applyContextUpdatePatch\(payload\)[\s\S]*const shouldAtomicClear = boardSwitched && !alreadyAppliedTransaction;[\s\S]*if \(shouldAtomicClear\) \{[\s\S]*nextRuntime\.runningAnimations = \[\];/.test(source),
    "context-update patch missing board-switch running-clear guard",
  );
}

function assertContextUpdateDoesNotMutateBoardForDraftOrAlign(appSource, serverSource) {
  assert(
    /function emitRoomDraftSyncMutation\([\s\S]*emitLiveMutation\("context-update", \{[\s\S]*draftBoardId:[\s\S]*runtime:[\s\S]*roomDraft:[\s\S]*\}\)\.catch\(\(\) => undefined\);/.test(appSource),
    "room-draft sync command payload missing draft-only context guard",
  );
  assert(
    /function setAlignMode\(enabled, \{ emit = true \} = \{\}\) \{[\s\S]*emitLiveMutation\("context-update", \{[\s\S]*reason: "align-toggle"[\s\S]*alignMode: nextAlignMode[\s\S]*runtime:[\s\S]*alignMode: nextAlignMode/.test(appSource),
    "align toggle context-update payload missing align-only guard",
  );
  assert(
    /const allowBoardContextMutation = Boolean\(atomicSwitchTransactionId\) \|\| !isBoardContextSuppressedReason\(reason\);/.test(serverSource),
    "server context-update reason arbitration guard missing",
  );
}

function assertBoardSwitchedStatusArbitration(appSource) {
  assert(
    /function switchBoard\(boardId, \{ emitLiveContext = false, reason = "board-switch", announceStatus = true \} = \{\}\)/.test(appSource),
    "switchBoard announceStatus arbitration guard missing",
  );
  assert(
    /if \(announceStatus\) \{[\s\S]*triggerFeedback\.textContent = "Status: board switched";[\s\S]*\}/.test(appSource),
    "board switched status is not gated by announceStatus",
  );
  assert(
    /function syncRuntimePanelsFromState\(\) \{[\s\S]*switchBoard\(state\.boardId, \{ announceStatus: false \}\);/.test(appSource),
    "runtime panel sync still emits board switched status",
  );
}


function assertServerSnapshotSanitizerGuard(source) {
  assert(
    /function sanitizeLiveSnapshotForBoardContext\(snapshot\)[\s\S]*runtime\.runningAnimations = sanitizedRunningAnimations;/.test(source),
    "server snapshot board-context sanitizer missing",
  );
  assert(
    /const mergedSnapshot = \{[\s\S]*liveSessionState\.snapshot = sanitizeLiveSnapshotForBoardContext\(mergedSnapshot\);/.test(source),
    "mutateLiveSession does not sanitize snapshot before persist/broadcast",
  );
}

function assertClientReconnectBoardFilter(source) {
  assert(
    /function filterRunningAnimationsForBoard\([\s\S]*if \(!normalizedBoardId \|\| !animationBoardId\) \{[\s\S]*return false;/.test(source),
    "client running board filter is not hard-enforced",
  );
}

function assertStrictStaleEqualVersionDrop(source) {
  assert(
    /function shouldApplySnapshotVersion\(incomingVersion\)\s*\{[\s\S]*normalizedIncomingVersion <= liveSync\.lastAppliedVersion[\s\S]*return false;[\s\S]*\}/.test(source),
    "strict stale/equal snapshot version drop guard is missing",
  );
  assert(
    /if \(shouldApplySnapshotVersion\(incomingVersion\) && envelope\.snapshot\)/.test(source),
    "polling path does not use strict stale/equal version guard",
  );
  assert(
    /if \(helloSnapshot && shouldApplySnapshotVersion\(helloVersion\)\)/.test(source),
    "live-hello replay path does not use strict stale/equal version guard",
  );
}

function assertStopRoutingIsStopOnly(appSource) {
  const stopBody = sliceBetween(appSource, "function stopAnimation(animationId)", "\nfunction editAnimation(");
  assert(/emitStopAnimationCommand\(/.test(stopBody), "stopAnimation does not use stop-only command helper");
  assert(!/emitLiveMutation\("trigger-room"/.test(stopBody), "stopAnimation routes through trigger-room side path");
  assert(!/emitLiveMutation\("trigger-global"/.test(stopBody), "stopAnimation routes through trigger-global side path");
}

function assertStopInflightUiGuard(appSource) {
  assert(
    /pendingStopAnimationIds:\s*new Set\(\)/.test(appSource),
    "pending stop animation set missing from liveSync state",
  );
  assert(
    /function reconcileStopPendingFromSnapshot\(\)/.test(appSource),
    "snapshot reconcile for pending stop IDs missing",
  );
  assert(
    /stopButton\.textContent = stopPending \? "Stopping\.\.\." : "Stop";/.test(appSource),
    "running-list stop button pending label guard missing",
  );
  assert(
    /stopButton\.disabled = stopPending;/.test(appSource),
    "running-list stop button disable guard missing",
  );
}

function assertImmediateStopSnapshotApply(appSource) {
  assert(
    /if \(payload\?\.type === "live-session-update"\) \{[\s\S]*mutationType === STOP_ANIMATION_MUTATION_TYPE \|\| mutationType === "clear-all"[\s\S]*applyLiveRuntimeSnapshot\(payload\.session\.snapshot/.test(appSource),
    "live-session-update immediate stop/clear snapshot apply missing",
  );
}

function assertServerStopNoopAndClusterGuard(serverSource) {
  assert(
    /if \(mutationType === "stop-animation"\) \{[\s\S]*if \(!stopAnimationId\) \{[\s\S]*return \{[\s\S]*runtime: nextRuntime/.test(serverSource),
    "server stop no-op ack guard for invalid IDs missing",
  );
  assert(
    /if \(stoppedEntry\?\.scope === "cluster"\) \{[\s\S]*stopIds\.add\(memberId\);/.test(serverSource),
    "server cluster stop reconciliation missing",
  );
}

function assertGlobalStopSemanticsUnified(appSource, serverSource) {
  assert(
    /function emitStopAnimationCommand\(animationId, \{ priorityHint = "high", targetAnimation = null \} = \{\}\)/.test(appSource),
    "stop command helper does not accept target metadata",
  );
  assert(
    /buildStopCommandTargetMeta\(animationForMeta\)/.test(appSource),
    "stop command helper does not include scope/type/board metadata",
  );
  assert(
    /if \(stopTargetScope !== "global" \|\| !stopTargetType\) \{[\s\S]*return \{[\s\S]*runtime: nextRuntime/.test(serverSource),
    "server stop no-op fallback for non-global missing",
  );
  assert(
    /const shouldFallbackGlobalTypeStop =[\s\S]*resolvedGlobalStopScope === "global"[\s\S]*\(!stopAnimationId \|\| !stoppedEntry\)/.test(serverSource),
    "server fallback global stop semantics missing",
  );
  assert(
    /resolvedGlobalStopType === "outside-space"[\s\S]*outsideFxByBoard\[outsideStopBoardId\][\s\S]*enabled: false/.test(serverSource),
    "server global-outside stop does not disable outside profile",
  );
}

function assertRunningListHoverStabilityGuard(appSource, stylesSource) {
  assert(
    /function isRunningListInteractionActive\(\)/.test(appSource),
    "running-list hover interaction helper missing",
  );
  assert(
    /outputRole !== OUTPUT_ROLE_FINAL[\s\S]*now - lastListRenderAt > 500[\s\S]*!isRunningListInteractionActive\(\)/.test(appSource),
    "periodic running-list refresh is not interaction-guarded",
  );
  assert(
    /\.running-actions button:hover,[\s\S]*\.running-actions button:focus-visible[\s\S]*transform: none;/.test(stylesSource),
    "running actions hover/focus transform stabilization missing",
  );
}

async function main() {
  const before = await readJson("/api/live/telemetry");
  const baselineSnapshot = await readJson("/api/live/snapshot?sinceVersion=0");
  assert(before?.ok === true, "telemetry endpoint unavailable");
  assert(typeof before?.telemetry?.queue?.depth === "number", "missing queue depth metric");
  assert(typeof baselineSnapshot?.session?.version === "number", "snapshot endpoint missing session.version");

  await delay(250);

  const after = await readJson("/api/live/telemetry");
  const state = await readJson("/api/live/state");
  const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
  const stylesSource = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert(after?.ok === true, "telemetry refresh failed");
  assert(state?.ok === true, "live state endpoint unavailable");

  const queue = after.telemetry.queue;
  const hopsMs = readHopSamples(after);
  assert(queue.depth >= 0, "queue depth invalid");
  assert(queue.maxDepthObserved >= queue.depth, "max depth invariant broken");
  assert(queue.droppedOverflow >= 0, "overflow metric invalid");
  assert(typeof after?.telemetry?.gates?.commandAccepted === "number", "missing telemetry.gates.commandAccepted");
  assert(typeof after?.telemetry?.gates?.snapshotVersionVisible === "number", "missing telemetry.gates.snapshotVersionVisible");
  const runtime = state?.session?.snapshot?.runtime ?? {};
  const triggerRevisions = runtime?.globalTriggerRevisions ?? {};
  const stopRevisions = runtime?.globalStopRevisions ?? {};
  assert(triggerRevisions && typeof triggerRevisions === "object", "missing runtime.globalTriggerRevisions");
  assert(stopRevisions && typeof stopRevisions === "object", "missing runtime.globalStopRevisions");
  assertMissingHopsMsFails(after);
  assertNoDraftMutationInStartPath(appSource);
  assertSnapshotDraftApplyGuard(appSource);
  assertAlignToggleUsesContextUpdate(appSource);
  assertAlignPanelSyncAppliedOnSnapshot(appSource);
  assertBoardSwitchRunningClearInContextPatch(serverSource);
  assertServerSnapshotSanitizerGuard(serverSource);
  assertClientReconnectBoardFilter(appSource);
  assertStrictStaleEqualVersionDrop(appSource);
  assertStopRoutingIsStopOnly(appSource);
  assertImmediateStopSnapshotApply(appSource);
  assertStopInflightUiGuard(appSource);
  assertServerStopNoopAndClusterGuard(serverSource);
  assertGlobalStopSemanticsUnified(appSource, serverSource);
  assertRunningListHoverStabilityGuard(appSource, stylesSource);
  assertContextUpdateDoesNotMutateBoardForDraftOrAlign(appSource, serverSource);
  assertBoardSwitchedStatusArbitration(appSource);

  console.log(JSON.stringify({
    pass: true,
    queue,
    sessionVersion: state.session?.version ?? null,
    hopSamples: {
      ingestToCommit: hopsMs.ingestToCommit.length,
      commitToClientAck: hopsMs.commitToClientAck.length,
      commitToApplyAck: hopsMs.commitToApplyAck.length,
    },
    gateSamples: {
      commandAccepted: after?.telemetry?.gates?.commandAccepted ?? 0,
      snapshotVersionVisible: after?.telemetry?.gates?.snapshotVersionVisible ?? 0,
      snapshotApplied: after?.telemetry?.gates?.snapshotApplied ?? 0,
    },
    lifecycleMaps: {
      globalTriggerKeys: Object.keys(triggerRevisions).length,
      globalStopKeys: Object.keys(stopRevisions).length,
    },
    schemaGuard: {
      usesHopsMsOnly: true,
      missingHopsMsRejected: true,
    },
    hf4DraftImmutabilityGuard: {
      startPathDraftMutationBlocked: true,
      snapshotControlDraftApplyBlocked: true,
    },
    hf5AlignBoardSwitchGuards: {
      alignToggleCommandUsesContextUpdate: true,
      alignSnapshotApplySynchronizesPanelsOnAllRoles: true,
      boardSwitchClearsRunningInContextPatch: true,
      staleEqualVersionRejectEnabledForPollAndReconnect: true,
    },
    hf6BoardResidueEliminationGuards: {
      boardSwitchAtomicClearTransactionGuard: true,
      serverSanitizeBeforePersistBroadcast: true,
      reconnectBoardContextFilterHardEnforced: true,
    },
    hf7StopDeterminismGuards: {
      stopRoutingUsesStopMutationOnly: true,
      immediateStopSnapshotApplyOnLiveSessionUpdate: true,
      pendingStopInflightUiGuardActive: true,
      serverStopNoopAndClusterReconciliation: true,
    },
    hf8GlobalStopHoverGuards: {
      stopCommandCarriesGlobalTargetMetadata: true,
      serverGlobalStopSemanticsUnifiedForInsideOutside: true,
      serverGlobalOutsideStopDisablesOutsideFx: true,
      runningListHoverInteractionGuardActive: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
