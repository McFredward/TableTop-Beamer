import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate as flush } from "node:timers/promises";
import { bootOutputAudioBinder } from "../src/app/runtime/output-receiver/output-audio-binder.js";

test("projector audio starts at the beginning after HDMI wake, loops, and respects cancellation", async (t) => {
  const originalContext = globalThis.AudioContext;
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.AudioContext = originalContext;
    globalThis.fetch = originalFetch;
  });
  const sources = [];
  const pcm = { kind: "decoded clip" };
  let currentOutput;
  globalThis.AudioContext = class extends EventTarget {
    state = "suspended";
    currentTime = 0;
    sampleRate = 48000;
    destination = {};
    constructor(options) { super(); currentOutput = this; assert.equal(options.latencyHint, "playback"); }
    async resume() { this.state = "running"; }
    async close() { this.state = "closed"; }
    createBuffer(_channels, size) {
      const samples = new Float32Array(size);
      return { getChannelData: () => samples };
    }
    async decodeAudioData() { return pcm; }
    createBufferSource() {
      return {
        connect() {},
        disconnect() { this.disconnected = true; },
        start(...args) { this.startArgs = args; sources.push(this); },
        stop() { this.stopped = true; },
      };
    }
  };
  let requests = 0;
  let release;
  globalThis.fetch = async (path) => {
    requests++;
    if (path.endsWith("slow.wav")) await new Promise(resolve => { release = resolve; });
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  };
  const callbacks = {};
  const subscribe = event => fn => { callbacks[event] = fn; };
  const binder = await bootOutputAudioBinder({ liveSync: {
    onAnimationStart: subscribe("start"), onAnimationStop: subscribe("stop"), onClearAll: subscribe("clear"),
  } });
  t.after(() => {
    if (currentOutput.state !== "closed") binder.stop();
  });
  const alarm = { id: "alarm", soundAssetRef: "/resources/sounds/alarm.mp3" };
  callbacks.start(alarm);
  callbacks.start(alarm);
  await flush();
  assert.equal(sources.length, 2);
  const keepAlive = sources[0].buffer.getChannelData(0);
  assert(keepAlive.every(sample => sample !== 0 && Math.abs(sample) < 1 / 32768));
  assert.equal(keepAlive.reduce((sum, value) => sum + value, 0), 0);
  assert.equal(sources[1].buffer, pcm);
  assert.equal(sources[1].loop, true);
  assert.deepEqual(sources[1].startArgs, [0.55, 0]);

  callbacks.stop("alarm");
  assert.equal(sources[1].stopped, true);
  assert.equal(sources[0].stopped, undefined);

  currentOutput.currentTime = 8;
  callbacks.start({ ...alarm, id: "warm" });
  await flush();
  assert.equal(requests, 1);
  assert.deepEqual(sources[2].startArgs, [8.025, 0]);

  callbacks.start({ id: "canceled", soundAssetRef: "slow.wav" });
  callbacks.clear();
  release();
  await flush();
  assert.equal(sources[2].stopped, true);
  assert.equal(sources.length, 3);
  currentOutput.currentTime = 9;
  currentOutput.dispatchEvent(new Event("sinkchange"));
  callbacks.start({ ...alarm, id: "changed-device" });
  await flush();
  assert.deepEqual(sources[3].startArgs, [9.55, 0]);
  binder.stop();
  assert.equal(sources[0].stopped, true);
});
