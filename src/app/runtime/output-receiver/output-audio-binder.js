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

// Phase 49 gap-closure-4: resolve sound path from the animation payload.
// Historical contract (pre-Phase 49) expected the server to pre-resolve
// `animation.sound` to a URL — but that resolution code was never built,
// so this binder was effectively dead (no logs, no playback). The real
// source-of-truth is `animation.soundAssetRef`, which the dashboard's
// runtime-audio.js (line 267+) reads directly. We mirror that logic here:
//   - "none" / empty / undefined → no sound (silently skip)
//   - "/resources/sounds/<file>.{mp3,wav,ogg,m4a}" → direct path
//   - else → unknown, skip with a warning so operators can diagnose
function resolveSoundPath(animation) {
  const ref = typeof animation?.soundAssetRef === "string"
    ? animation.soundAssetRef.trim()
    : "";
  if (!ref || ref === "none") return null;
  if (/^\/resources\/sounds\/.+\.(mp3|wav|ogg|m4a)$/i.test(ref)) return ref;
  // Some legacy entries may store a bare filename — try prefixing.
  if (/^[^/]+\.(mp3|wav|ogg|m4a)$/i.test(ref)) return `/resources/sounds/${ref}`;
  return null;
}

function handleStartAnimation(animation, logger) {
  if (!animation || typeof animation !== "object") return;
  // Phase 49 gap-closure-4: unconditional diagnostic log so operators can
  // see WHAT the live-sync delivered. Without this, "no audio" had no
  // observability — empty sound refs silently no-op'd before. Remove
  // after audio path is operator-validated on Win11 + Pi.
  const ref = (typeof animation?.soundAssetRef === "string") ? animation.soundAssetRef : "(no soundAssetRef)";
  logger?.info?.(`[output-audio] start animation id=${animation.id ?? "?"} soundAssetRef=${JSON.stringify(ref)}`);
  const sound = resolveSoundPath(animation);
  if (!sound) {
    logger?.info?.(`[output-audio] skip: no resolved sound path for soundAssetRef=${JSON.stringify(ref)} (set a sound via the FX panel)`);
    return;
  }
  try {
    const audio = pickOrCreateAudio(sound);
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((e) => {
        logger?.warn?.(`[output-audio] play() rejected for ${sound}: ${e?.message} (autoplay policy: click anywhere on /output/ once)`);
      });
    }
    if (animation.id) activeAudioByAnimationId.set(animation.id, audio);
    logger?.info?.(`[output-audio] play() invoked for ${sound}`);
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
