import { randomUUID } from "node:crypto";

const LEASE_MS = 15_000;
const phases = new Set(["board", "bindings", "camera", "model", "registering", "active", "paused", "error"]);
const CAMERA_STOP_HISTORY = 64;

export function createCameraAutomation(now = Date.now) {
  let enabled = false;
  let since = 0;
  let lease;

  function reset() {
    if (enabled) since = now();
    lease = null;
  }

  return {
    setEnabled(next) {
      if (next === enabled) return false;
      enabled = next;
      reset();
      return true;
    },
    reset,
    status() {
      if (!enabled) return { enabled, phase: "off" };
      return { enabled, phase: lease?.expiresAt > now() ? lease.phase : "host" };
    },
    heartbeat(owner, phase, targets) {
      const time = now();
      if (!enabled || (lease?.expiresAt > time && lease.owner !== owner)) return null;
      if (!(lease?.expiresAt > time)) lease = { owner, token: randomUUID(), phase: "board" };
      lease.expiresAt = time + LEASE_MS;
      if (phases.has(phase)) lease.phase = phase;
      if (targets) lease.targets = targets;
      return { token: lease.token, since };
    },
    modelIds(boardId) {
      return lease?.expiresAt > now() && lease.targets?.boardId === boardId ? lease.targets.modelIds : [];
    },
    accepts(token, observedAt) {
      return enabled && Boolean(lease && lease.token === token && lease.expiresAt > now() && observedAt >= since);
    },
  };
}

export function rememberCameraStops(runtime, ids) {
  const recent = Array.isArray(runtime.stoppedCameraAnimationIds) ? runtime.stoppedCameraAnimationIds : [];
  return { ...runtime, stoppedCameraAnimationIds: [...recent, ...ids].slice(-CAMERA_STOP_HISTORY) };
}

export function removeCameraAnimations(runtime, outsideFxByBoard, fading = new Set()) {
  const running = runtime.runningAnimations ?? [];
  const isOwned = animation => typeof animation.cameraTriggerOwner === "string" && animation.cameraTriggerOwner.length > 0;
  const owned = running.filter(animation => isOwned(animation) && !fading.has(animation.id));
  if (!owned.length) return { runtime };

  for (const animation of owned) {
    const profile = outsideFxByBoard[animation.boardId];
    if (animation.cameraTriggerOwner.startsWith('["outside",') && profile?.selectedAnimationId === animation.type) {
      outsideFxByBoard[animation.boardId] = { ...profile, enabled: false };
    }
  }
  return {
    runtime: rememberCameraStops({ ...runtime, runningAnimations: running.filter(animation => !isOwned(animation) || fading.has(animation.id)), outsideFxByBoard },
      owned.map(animation => animation.id)),
    outsideFxByBoard,
  };
}
