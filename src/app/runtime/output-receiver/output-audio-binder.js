// Phase 34 D-03 — Pi-local audio for the thin /output/ HTML.
// Phase 35 D-02 (Track B) — REFACTORED to consume bootOutputLiveSync.
//
// The thin /output/ page does NOT load runtime-live-sync-core.js, so the
// standard pipeline (applyLiveRuntimeSnapshot → ctx.playSoundForAnimation)
// does not run here. Pi-local audio (D-D2 reversal) still must trigger
// when the server broadcasts an animation start.
//
// This module is now a pure consumer of the shared bootOutputLiveSync
// subscription (output-live-sync.js): it subscribes to onAnimationStart /
// onAnimationStop / onClearAll and plays/stops Audio() voices accordingly.
// The WS plumbing + reconnect logic that previously lived here has been
// extracted to output-live-sync.js per D-02 (Track B). Net effect: ~70
// LOC removed; audio behaviour unchanged.
//
// Exports bootOutputAudioBinder({ logger, liveSync }) which returns { stop }.
// If liveSync is omitted, a private bootOutputLiveSync is created
// (transitional fallback; output.html should always pass the shared one
// so we don't open two WS connections per page).
//
// Sound resolution: the server-side live-mutation payload already
// contains the resolved animation object with a `sound` field; if that
// field is empty we silently skip (no audio). EVENT_SOUND_ASSETS lookup
// is the dashboard's job, not ours.

import { bootOutputLiveSync } from "./output-live-sync.js";

const MAX_VOICE_POOL_PER_ASSET = 4;

/** @internal */
const voicePoolByAsset = new Map(); // asset path → Audio[] (round-robin)
/** @internal */
const activeAudioByAnimationId = new Map(); // animationId → Audio

function pickOrCreateAudio(assetPath) {
  let pool = voicePoolByAsset.get(assetPath);
  if (!pool) { pool = []; voicePoolByAsset.set(assetPath, pool); }
  // Find a free voice (paused / ended); else add up to cap.
  for (const a of pool) {
    if (a.paused || a.ended) { a.currentTime = 0; return a; }
  }
  if (pool.length < MAX_VOICE_POOL_PER_ASSET) {
    const a = new Audio(assetPath);
    a.preload = "auto";
    pool.push(a);
    return a;
  }
  // All voices busy — reuse the oldest.
  const reused = pool[0];
  reused.currentTime = 0;
  return reused;
}

function handleStartAnimation(animation, logger) {
  if (!animation || typeof animation !== "object") return;
  const sound = (typeof animation.sound === "string") ? animation.sound : null;
  if (!sound) return; // no sound mapped — skip silently
  try {
    const audio = pickOrCreateAudio(sound);
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((e) => {
        logger?.warn?.(`[output-audio] play() rejected: ${e?.message}`);
      });
    }
    if (animation.id) activeAudioByAnimationId.set(animation.id, audio);
  } catch (e) {
    logger?.warn?.(`[output-audio] start failed: ${e?.message}`);
  }
}

function handleStopAnimation(animationId) {
  const audio = activeAudioByAnimationId.get(animationId);
  if (!audio) return;
  try { audio.pause(); audio.currentTime = 0; } catch {}
  activeAudioByAnimationId.delete(animationId);
}

function handleClearAll() {
  for (const audio of activeAudioByAnimationId.values()) {
    try { audio.pause(); audio.currentTime = 0; } catch {}
  }
  activeAudioByAnimationId.clear();
}

/**
 * Boot the output audio binder. Subscribes to the shared live-sync
 * subscription for animation start/stop/clear-all events and plays/stops
 * Audio() voices accordingly. Returns a stop() handle for tests.
 *
 * @param {{ logger?: Console, liveSync?: import('./output-live-sync.js').LiveSyncSubscription | null }} [opts]
 */
export async function bootOutputAudioBinder({ logger = console, liveSync = null } = {}) {
  const sub = liveSync ?? bootOutputLiveSync({ logger, role: "final-output" });
  const ownsLiveSync = !liveSync;

  const offStart = sub.onAnimationStart((animation) => {
    handleStartAnimation(animation, logger);
  });
  const offStop = sub.onAnimationStop((animationId) => {
    if (animationId) handleStopAnimation(animationId);
  });
  const offClear = sub.onClearAll(() => {
    handleClearAll();
  });

  return {
    stop() {
      try { offStart?.(); } catch {}
      try { offStop?.(); } catch {}
      try { offClear?.(); } catch {}
      handleClearAll();
      if (ownsLiveSync) {
        try { sub.stop?.(); } catch {}
      }
    },
  };
}
