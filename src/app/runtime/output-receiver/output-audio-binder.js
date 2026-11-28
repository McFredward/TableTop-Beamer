// The thin /output/ page plays locally on the projector host.
// Live sync owns animation lifetimes, including the stop for one-shot effects.
import { bootOutputLiveSync } from "./output-live-sync.js";

const OUTPUT_WAKE_SECONDS = 0.55;
const SOUND_START_LEAD_SECONDS = 0.025;
const KEEP_ALIVE_AMPLITUDE = 1 / 65536;
const MAX_CACHED_SOUNDS = 16;

function resolveSoundPath(animation) {
  const ref = typeof animation?.soundAssetRef === "string" ? animation.soundAssetRef.trim() : "";
  if (!ref || ref === "none") return null;
  if (/^\/resources\/sounds\/.+\.(mp3|wav|ogg|m4a)$/i.test(ref)) return ref;
  if (/^[^/]+\.(mp3|wav|ogg|m4a)$/i.test(ref)) return `/resources/sounds/${ref}`;
  return null;
}

export async function bootOutputAudioBinder({ logger = console, liveSync = null } = {}) {
  const sub = liveSync ?? bootOutputLiveSync({ logger, role: "final-output" });
  const active = new Map();
  const buffers = new Map();
  let context;
  let keepAlive;
  let readyAt = 0;
  let resume;
  let soundCatalogRequest;

  function getAudioOutput() {
    if (!context) {
      const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioContext) throw new Error("Web Audio is unavailable");
      context = new AudioContext({ latencyHint: "playback" });
      const holdForDevice = () => {
        if (context.state === "running") readyAt = context.currentTime + OUTPUT_WAKE_SECONDS;
      };
      context.addEventListener("statechange", holdForDevice);
      context.addEventListener("sinkchange", holdForDevice);
    }
    return context;
  }

  function wakeOutput(output) {
    if (!resume && (!keepAlive || output.state !== "running")) {
      resume = (async () => {
        if (output.state !== "running") await output.resume();
        if (output.state === "closed") return;
        if (!keepAlive) {
          // Chromium can pause the real sink when it receives all-zero PCM.
          // Keep the stream active with a DC-free signal below a 16-bit step.
          keepAlive = output.createBufferSource();
          keepAlive.buffer = output.createBuffer(1, 128, output.sampleRate);
          const samples = keepAlive.buffer.getChannelData(0);
          for (let i = 0; i < samples.length; i += 2) {
            samples[i] = KEEP_ALIVE_AMPLITUDE;
            samples[i + 1] = -KEEP_ALIVE_AMPLITUDE;
          }
          keepAlive.loop = true;
          keepAlive.connect(output.destination);
          keepAlive.start();
        }
        readyAt = output.currentTime + OUTPUT_WAKE_SECONDS;
      })().finally(() => { resume = null; });
    }
    return resume;
  }

  function readSound(path, output) {
    const cached = buffers.get(path);
    if (cached) {
      buffers.delete(path);
      buffers.set(path, cached);
      return cached;
    }
    const pending = fetch(path).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    }).then(bytes => output.decodeAudioData(bytes)).catch(error => {
      if (buffers.get(path) === pending) buffers.delete(path);
      throw error;
    });
    buffers.set(path, pending);
    if (buffers.size > MAX_CACHED_SOUNDS) buffers.delete(buffers.keys().next().value);
    return pending;
  }

  function preloadBoardSounds(boardId) {
    if (!boardId) return;
    soundCatalogRequest ??= fetch("/api/boards")
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .finally(() => { soundCatalogRequest = null; });
    const request = soundCatalogRequest;
    void request.then(({ boards }) => {
      if (sub.getSelectedBoardId?.() !== boardId) return;
      const board = boards?.find(entry => entry.boardId === boardId);
      if (!board) return;
      const paths = new Set();
      for (const scope of [board.insideFx, board.outsideFx, board.roomFx]) {
        for (const animation of scope?.animations ?? []) {
          const path = resolveSoundPath(animation);
          if (path) paths.add(path);
        }
      }
      for (const path of [...paths].slice(0, MAX_CACHED_SOUNDS)) {
        if (context?.state === "closed") return;
        void readSound(path, getAudioOutput()).catch(() => {});
      }
    }).catch(() => {});
  }

  function stop(id) {
    const playback = active.get(id);
    active.delete(id);
    playback?.stop?.();
  }

  function clear() {
    for (const id of active.keys()) stop(id);
  }

  async function play(animation) {
    const id = animation?.id;
    const path = resolveSoundPath(animation);
    if (!id || !path || animation.soundVolume === 0 || active.has(id)) return;
    const loop = animation.soundLoop !== false;
    const playback = {};
    active.set(id, playback);
    try {
      const output = getAudioOutput();
      const [buffer] = await Promise.all([readSound(path, output), wakeOutput(output)]);
      if (active.get(id) !== playback) return;
      const source = output.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.connect(output.destination);
      source.start(Math.max(output.currentTime + SOUND_START_LEAD_SECONDS, readyAt), 0);
      playback.stop = () => { source.stop(); };
      source.onended = () => {
        source.disconnect();
        delete playback.stop;
      };
    } catch {
      if (active.get(id) !== playback) return;
      try {
        const audio = new Audio(path);
        audio.loop = loop;
        audio.currentTime = 0;
        playback.stop = () => { audio.pause(); };
        await audio.play();
      } catch (error) {
        if (active.get(id) === playback) active.delete(id);
        logger?.warn?.(`[output-audio] Could not play ${path}: ${error.message}`);
      }
    }
  }

  const offStart = sub.onAnimationStart(animation => { void play(animation); });
  const offStop = sub.onAnimationStop(stop);
  const offClear = sub.onClearAll(clear);
  const offBoardChange = sub.onSelectedBoardChange?.(preloadBoardSounds);
  const offConfigUpdate = sub.onBoardConfigChange?.(() => preloadBoardSounds(sub.getSelectedBoardId()));
  // Kiosk Chromium can open the audio device while the output connects.
  try { void wakeOutput(getAudioOutput())?.catch(() => {}); } catch {}
  preloadBoardSounds(sub.getSelectedBoardId?.());

  return {
    stop() {
      offStart?.();
      offStop?.();
      offClear?.();
      offBoardChange?.();
      offConfigUpdate?.();
      clear();
      buffers.clear();
      if (keepAlive) {
        keepAlive.stop();
        keepAlive.disconnect();
        keepAlive = null;
      }
      if (context) void context.close().catch(() => {});
      if (!liveSync) sub.stop?.();
    },
  };
}
