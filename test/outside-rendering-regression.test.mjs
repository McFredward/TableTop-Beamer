import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadRuntime(sandbox, file) {
  const path = new URL(`../src/app/runtime/render/${file}.js`, import.meta.url);
  vm.runInNewContext(readFileSync(path, "utf8"), sandbox);
}

function createVideo() {
  return {
    paused: true,
    readyState: 4,
    videoWidth: 1280,
    videoHeight: 720,
    duration: 15,
    currentTime: 0,
    activeCallbacks: new Map(),
    nextCallbackId: 0,
    addEventListener() {},
    async play() { this.paused = false; },
    pause() { this.paused = true; },
    requestVideoFrameCallback(callback) {
      const id = ++this.nextCallbackId;
      this.activeCallbacks.set(id, callback);
      return id;
    },
    cancelVideoFrameCallback(id) {
      this.activeCallbacks.delete(id);
    },
    presentFrame(now) {
      const [id, callback] = this.activeCallbacks.entries().next().value;
      this.activeCallbacks.delete(id);
      callback(now, { mediaTime: this.currentTime, presentedFrames: id });
    },
  };
}

test("outside MP4 copies each new frame once and keeps the last frame during seeks", () => {
  const copies = [];
  const paints = [];
  const video = createVideo();
  let failCapture = false;
  const frameCanvas = { getContext: () => ({
    drawImage(source) {
      if (failCapture) throw new Error("frame unavailable");
      copies.push(source);
    },
  }) };
  let now = 1000;
  const definition = { id: "sandstorm", assetType: "mp4", assetRef: "/sandstorm.mp4", intensity: 0.9, speed: 1 };
  const outside = { enabled: true };
  const canvasCtx = { save() {}, restore() {}, drawImage: (...args) => paints.push(args) };
  const sandbox = {
    window: { TT_BEAMER_RUNTIME_ANIMATION_FADE: { computeFadeMultiplier: () => 1 } },
    document: { createElement: tag => tag === "video" ? video : frameCanvas },
    performance: { now: () => now },
  };
  loadRuntime(sandbox, "runtime-outside-mp4");
  loadRuntime(sandbox, "runtime-draw-loop");
  const { window } = sandbox;
  window.TT_BEAMER_RUNTIME_DRAW_LOOP_CLUSTER_PADS = { init() {} };
  const mp4 = window.TT_BEAMER_RUNTIME_OUTSIDE_MP4;
  const drawLoop = window.TT_BEAMER_RUNTIME_DRAW_LOOP;
  const dependencies = {
    state: { boardId: "lockdown", runningAnimations: [], animationSpeed: 1 },
    canvas: { width: 1920, height: 1080 },
    canvasCtx,
    getSelectedOutsideAnimationDefinition: () => definition,
    getMp4PerformanceControls: () => ({ tier: "balanced" }),
  };
  mp4.init(dependencies);
  drawLoop.init({
    ...dependencies,
    ...mp4,
    getOutsideFxProfile: () => outside,
    resolveOutsideTimeline: () => ({}),
    clipToOutsideShip: () => true,
    clampOutsideSpeed: x => x,
    clampOutsideIntensity: x => x,
  });

  mp4.prewarmBoardOutsideMp4Asset("lockdown");
  assert.equal(video.paused, true);
  drawLoop.drawOutsideFxLayer(now);
  assert.equal(video.paused, false);
  assert.equal(video.activeCallbacks.size, 1);
  assert.deepEqual(copies, [video]);
  assert.deepEqual(paints[0], [frameCanvas, 0, 0, 1920, 1080]);
  assert.equal(frameCanvas.width, 1280);
  assert.equal(frameCanvas.height, 720);

  video.presentFrame(now += 34);
  assert.equal(copies.length, 1);
  drawLoop.drawOutsideFxLayer(now);
  drawLoop.drawOutsideFxLayer(now += 16);
  assert.equal(copies.length, 2);
  assert.equal(paints.length, 3);

  video.seeking = true;
  video.presentFrame(now += 34);
  drawLoop.drawOutsideFxLayer(now);
  assert.equal(copies.length, 2);
  assert.equal(paints.length, 4);
  video.seeking = false;
  drawLoop.drawOutsideFxLayer(now += 16);
  assert.equal(copies.length, 3);

  video.presentFrame(now += 16);
  failCapture = true;
  drawLoop.drawOutsideFxLayer(now);
  assert.equal(copies.length, 3);
  assert.equal(paints.length, 6);
  failCapture = false;
  drawLoop.drawOutsideFxLayer(now += 16);
  assert.equal(copies.length, 4);

  for (let i = 0; i < 5; i++) {
    const staleCallback = video.activeCallbacks.values().next().value;
    outside.enabled = false;
    drawLoop.drawOutsideFxLayer(now += 16);
    assert.equal(video.paused, true);
    assert.equal(video.activeCallbacks.size, 0);

    outside.enabled = true;
    drawLoop.drawOutsideFxLayer(now += 16);
    assert.equal(video.paused, false);
    assert.equal(video.activeCallbacks.size, 1);
    staleCallback(now);
    assert.equal(video.activeCallbacks.size, 1);
  }

  Object.assign(dependencies.canvas, { width: 640, height: 360 });
  video.presentFrame(now += 34);
  drawLoop.drawOutsideFxLayer(now);
  assert.equal(frameCanvas.width, 640);
  assert.equal(frameCanvas.height, 360);
});

test("an outside MP4 stops independently of inside and room playback of the same asset", () => {
  const sandbox = { window: {}, document: { createElement: createVideo } };
  loadRuntime(sandbox, "runtime-outside-mp4");
  const mp4 = sandbox.window.TT_BEAMER_RUNTIME_OUTSIDE_MP4;
  mp4.init({ state: { boardId: "lockdown" } });
  const assetRef = "/sandstorm.mp4";
  const outside = mp4.getOutsideVideoElement(assetRef).video;
  const inside = mp4.getRoomVideoElement(assetRef, { scope: "inside" }).video;
  const room = mp4.getRoomVideoElement(assetRef).video;
  assert.equal(new Set([outside, inside, room]).size, 3);

  mp4.ensureOutsideMp4Playback(outside, { assetRef });
  mp4.ensureRoomMp4Playback(inside, { assetRef, scope: "inside", targetRate: 0.5 });
  mp4.ensureRoomMp4Playback(room, { assetRef, targetRate: 2 });
  mp4.clearOutsideMp4PlaybackState();

  assert.equal(outside.paused, true);
  assert.equal(inside.paused, false);
  assert.equal(room.paused, false);
  assert.equal(inside.playbackRate, 0.5);
  assert.equal(room.playbackRate, 2);
});

test("SSR draw cap bounds rendering on a 240 Hz browser and keeps native timing below the cap", () => {
  let nextFrame;
  const window = { TT_BEAMER_RUNTIME_DRAW_LOOP_CLUSTER_PADS: { init() {} } };
  loadRuntime({
    window,
    requestAnimationFrame: callback => { nextFrame = callback; },
    performance: { now: () => 0 },
  }, "runtime-draw-loop");
  const drawLoop = window.TT_BEAMER_RUNTIME_DRAW_LOOP;
  const state = {
    runningAnimations: [],
    runtimePerf: { frameIndex: 0 },
    mobilePerf: { lastFrameAt: null, frameDeltaSamples: [], pendingTriggerAt: null },
    roomDraft: {},
  };
  drawLoop.init({
    state,
    canvas: {},
    canvasCtx: { clearRect() {} },
    isHeavyInteractionActive: () => true,
    recordRuntimeFrameCost() {},
  });
  drawLoop.setFrameRateCap(60);
  drawLoop.startDrawLoop();
  for (let i = 0; i < 240; i++) nextFrame(i * 1000 / 240);
  assert.equal(state.runtimePerf.frameIndex, 60);
  for (let i = 0; i < 24; i++) nextFrame(1000 + i * 1000 / 24);
  assert.equal(state.runtimePerf.frameIndex, 84);
});
