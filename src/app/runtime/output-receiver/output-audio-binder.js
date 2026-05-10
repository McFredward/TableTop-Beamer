// Phase 34 D-03 — Pi-local audio for the thin /output/ HTML.
//
// The thin /output/ page does NOT load runtime-live-sync-core.js, so the
// standard pipeline (applyLiveRuntimeSnapshot → ctx.playSoundForAnimation)
// does not run here. Pi-local audio (D-D2 reversal) still must trigger
// when the server broadcasts an animation start.
//
// This module is a minimal subscriber:
//   1. Open WebSocket('/api/live/ws?role=final-output').
//   2. On message JSON.parse — if envelope.type === "live-mutation" AND
//      envelope.mutation.type is "start-animation" with a non-empty
//      animation.sound asset path, play it via a small Audio() voice
//      pool. On "stop-animation" or "clear-all", stop the matching pool
//      voices.
//   3. Auto-reconnect on close with exponential backoff capped at 30s.
//
// Deliberately accepts: event-name → asset-path resolution from
// EVENT_SOUND_ASSETS does NOT happen here. The server-side live-mutation
// payload already contains the resolved animation object with a `sound`
// field; if that field is empty we silently skip (no audio).
//
// Exports bootOutputAudioBinder({ logger }) which returns { stop }.

const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 5000, 10000, 30000];
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
 * Boot the output audio binder. Opens the live-sync WebSocket and listens
 * for animation start/stop events. Returns a stop() handle for tests.
 *
 * @param {{ logger?: Console }} [opts]
 */
export async function bootOutputAudioBinder({ logger = console } = {}) {
  const proto = (typeof window !== "undefined" && window.location?.protocol === "https:") ? "wss:" : "ws:";
  const host = (typeof window !== "undefined" && window.location?.host) ? window.location.host : "localhost";
  const url = `${proto}//${host}/api/live/ws?role=final-output`;

  let ws = null;
  let stopped = false;
  let attempt = 0;

  function delayMs() {
    return RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)];
  }

  function connect() {
    if (stopped) return;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      logger?.warn?.(`[output-audio] WS construct failed: ${e?.message}`);
      scheduleReconnect();
      return;
    }
    ws.addEventListener("open", () => {
      attempt = 0;
      logger?.log?.("[output-audio] WS open");
    });
    ws.addEventListener("message", (event) => {
      let envelope;
      try { envelope = JSON.parse(event.data); } catch { return; }
      if (!envelope || typeof envelope !== "object") return;
      // Live-sync uses an envelope shape: { type: "live-mutation", mutation: {...} }.
      // The actual mutation type lives at mutation.type. Defensive against
      // legacy shapes that put the type at envelope.type directly.
      const mutation = envelope.mutation ?? envelope;
      const type = mutation?.type;
      if (type === "start-animation") {
        handleStartAnimation(mutation.animation, logger);
      } else if (type === "stop-animation") {
        const id = mutation.animationId ?? mutation.animation?.id;
        if (id) handleStopAnimation(id);
      } else if (type === "clear-all") {
        handleClearAll();
      }
    });
    ws.addEventListener("close", () => {
      logger?.log?.(`[output-audio] WS close — reconnect in ${delayMs()}ms`);
      attempt += 1;
      scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      // close handler also fires; let it own the reconnect schedule.
    });
  }

  let reconnectTimer = null;
  function scheduleReconnect() {
    if (stopped) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delayMs());
  }

  connect();

  return {
    stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws?.close(); } catch {}
      handleClearAll();
    },
  };
}
