import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

const outsideMp4PlaybackStateByBoard = new Map();
const outsideTimelineStateByBoard = new Map();

function clearOutsideMp4PlaybackState(boardId) {
  outsideMp4PlaybackStateByBoard.delete(boardId);
}

function clearOutsideTimelineState(boardId) {
  outsideTimelineStateByBoard.delete(boardId);
}

function buildOutsideLifecycleKey(boardId, definition) {
  return [
    String(boardId || "global").trim() || "global",
    String(definition.id || "outside").trim() || "outside",
    String(definition.assetType || "coded").trim() || "coded",
    String(definition.assetRef || "outside-space").trim() || "outside-space",
    String(definition.mode || "standard").trim() || "standard",
    String(definition.direction || "forward").trim() || "forward",
    Number(definition.speed || 1).toFixed(3),
    Number(definition.intensity || 1).toFixed(3),
  ].join("|");
}

function resolveOutsideElapsedSeconds(now, { boardId, lifecycleKey }) {
  const normalizedLifecycleKey = String(lifecycleKey || "").trim() || `${boardId}:outside:default`;
  const existing = outsideTimelineStateByBoard.get(boardId) ?? null;
  if (!existing || existing.lifecycleKey !== normalizedLifecycleKey) {
    outsideTimelineStateByBoard.set(boardId, {
      lifecycleKey: normalizedLifecycleKey,
      startedAt: Number(now) || 0,
    });
    return 0;
  }
  return Math.max(0, (Number(now) || 0) - Number(existing.startedAt || 0)) / 1000;
}

function getOutsideMp4LoopStartTime(durationSec) {
  const duration = Number(durationSec);
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.min(Math.max(0.01, 0.05), Math.max(0, duration - 0.02));
}

function ensureOutsideMp4Playback(video, { boardId, lifecycleKey = "", assetRef = "", targetRate = 1 } = {}) {
  const normalizedLifecycleKey = String(lifecycleKey || "").trim();
  const normalizedAssetRef = String(assetRef || "").trim();
  const previous = outsideMp4PlaybackStateByBoard.get(boardId) ?? null;
  const didLifecycleChange =
    !previous
    || previous.lifecycleKey !== normalizedLifecycleKey
    || previous.assetRef !== normalizedAssetRef;

  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.defaultPlaybackRate = targetRate;
  video.playbackRate = targetRate;

  if (didLifecycleChange) {
    video.currentTime = getOutsideMp4LoopStartTime(video.duration);
  }

  if (video.paused || didLifecycleChange) {
    video.play();
  }

  outsideMp4PlaybackStateByBoard.set(boardId, {
    lifecycleKey: normalizedLifecycleKey,
    assetRef: normalizedAssetRef,
  });

  return {
    didLifecycleChange,
  };
}

const mockVideo = {
  duration: 12,
  paused: true,
  loop: false,
  muted: false,
  playsInline: false,
  playbackRate: 1,
  defaultPlaybackRate: 1,
  _currentTime: 0,
  seekCount: 0,
  playCount: 0,
  set currentTime(value) {
    this._currentTime = value;
    this.seekCount += 1;
  },
  get currentTime() {
    return this._currentTime;
  },
  play() {
    this.paused = false;
    this.playCount += 1;
    return Promise.resolve();
  },
};

const boardId = "nemesis";
const definition = {
  id: "outside-sandstorm",
  assetType: "mp4",
  assetRef: "resources/nemesis/animations/sandstorm.mp4",
  mode: "standard",
  direction: "forward",
  speed: 1,
  intensity: 1,
};
const lifecycleKey = buildOutsideLifecycleKey(boardId, definition);

const checks = [];

const firstElapsed = resolveOutsideElapsedSeconds(1000, { boardId, lifecycleKey });
assert.equal(firstElapsed, 0);
const firstPlayback = ensureOutsideMp4Playback(mockVideo, {
  boardId,
  lifecycleKey,
  assetRef: definition.assetRef,
  targetRate: 1,
});
assert.equal(firstPlayback.didLifecycleChange, true);
assert.equal(mockVideo.seekCount, 1);
checks.push({ check: "initial-outside-start-seeks-once", status: "PASS" });

let previousElapsed = firstElapsed;
for (let i = 1; i <= 6; i += 1) {
  const elapsed = resolveOutsideElapsedSeconds(1000 + i * 1500, { boardId, lifecycleKey });
  assert.ok(elapsed >= previousElapsed, "outside elapsed timeline must stay monotonic");
  previousElapsed = elapsed;

  const roomStartRunId = `room-start-${i}`;
  const playback = ensureOutsideMp4Playback(mockVideo, {
    boardId,
    lifecycleKey,
    assetRef: definition.assetRef,
    targetRate: 1,
    roomStartRunId,
  });
  assert.equal(playback.didLifecycleChange, false, "room starts must not change outside lifecycle");
}

assert.equal(mockVideo.seekCount, 1, "outside mp4 must not seek/restart during repeated room starts");
checks.push({ check: "repeated-room-starts-do-not-restart-outside", status: "PASS", repeats: 6 });

clearOutsideMp4PlaybackState(boardId);
clearOutsideTimelineState(boardId);
mockVideo.paused = true;
const afterStopPlayback = ensureOutsideMp4Playback(mockVideo, {
  boardId,
  lifecycleKey,
  assetRef: definition.assetRef,
  targetRate: 1,
});
assert.equal(afterStopPlayback.didLifecycleChange, true, "explicit outside stop must reset lifecycle state");
assert.equal(mockVideo.seekCount, 2, "outside stop must permit deterministic restart");
checks.push({ check: "outside-stop-still-resets-lifecycle", status: "PASS" });

clearOutsideMp4PlaybackState(boardId);
clearOutsideTimelineState(boardId);
mockVideo.paused = true;
const afterClearAllPlayback = ensureOutsideMp4Playback(mockVideo, {
  boardId,
  lifecycleKey,
  assetRef: definition.assetRef,
  targetRate: 1,
});
assert.equal(afterClearAllPlayback.didLifecycleChange, true, "clear-all must reset outside lifecycle state");
assert.equal(mockVideo.seekCount, 3, "clear-all must permit deterministic restart");
checks.push({ check: "clear-all-still-resets-lifecycle", status: "PASS" });

const output = {
  suite: "p9-hf4-repeated-room-start-regression",
  executedAt: new Date().toISOString(),
  result: "PASS",
  checks,
};

writeFileSync(new URL("./p9-hf4-repeated-room-start-regression-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
