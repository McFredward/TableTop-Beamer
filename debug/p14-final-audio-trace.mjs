// Phase 14-2 follow-up: trace the audio playback path in /output/final.
//
// Loads all runtime scripts in a vm sandbox simulating pathname=/output/final,
// then invokes playSoundForAnimation with a synthetic animation to see if
// the audio pipeline actually reaches `audio.play()`. Tracks every Audio
// voice instantiation and play() call.

import { readFileSync } from "node:fs";
import { createContext, Script } from "node:vm";

const repoRoot = new URL("../", import.meta.url);
const indexHtml = readFileSync(new URL("index.html", repoRoot), "utf8");

const scripts = [];
const re = /<script\s+src="([^"]+)"\s+defer[^>]*><\/script>/g;
let m;
while ((m = re.exec(indexHtml))) {
  const src = m[1];
  if (!src.startsWith("/src/app/")) continue;
  scripts.push(src.replace(/^\//, ""));
}

// --- trace counters ---
const trace = {
  audioConstructed: 0,
  audioPlayCalled: 0,
  audioLoadCalled: 0,
  audioPaths: new Set(),
};

// --- fake Audio class ---
class FakeAudio {
  constructor(path) {
    trace.audioConstructed++;
    trace.audioPaths.add(path);
    this.src = path;
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
    this.readyState = 4;
    this._listeners = {};
  }
  play() {
    trace.audioPlayCalled++;
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  load() { trace.audioLoadCalled++; }
  addEventListener(name, fn) { this._listeners[name] = fn; }
  removeEventListener(name) { delete this._listeners[name]; }
}

// Proxy auto-stub for everything else.
function makeStub(name = "stub") {
  const target = function () { return makeStub(`${name}()`); };
  target.__stubName = name;
  return new Proxy(target, {
    get(t, prop) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === "then") return undefined;
      if (prop in t) return t[prop];
      const child = makeStub(`${name}.${String(prop)}`);
      t[prop] = child;
      return child;
    },
    set(t, prop, value) { t[prop] = value; return true; },
    apply(t, thisArg, args) {
      if (name.endsWith(".play()") || name.endsWith(".play")) {
        return Promise.resolve();
      }
      return makeStub(`${name}()`);
    },
    construct() { return makeStub(`new ${name}()`); },
    has() { return true; },
  });
}

const sandbox = {};
const windowStub = sandbox;

windowStub.Audio = FakeAudio;
windowStub.location = { href: "http://localhost:4173/output/final", hostname: "localhost", protocol: "http:", port: "4173", search: "", pathname: "/output/final", host: "localhost:4173", origin: "http://localhost:4173" };
windowStub.navigator = { userAgent: "node-smoke-test", language: "en" };
windowStub.innerWidth = 1920;
windowStub.innerHeight = 1080;
windowStub.devicePixelRatio = 1;
windowStub.requestAnimationFrame = () => 0;
windowStub.cancelAnimationFrame = () => {};
windowStub.setTimeout = (cb, ms) => { if (ms === 0) cb(); return 0; };
windowStub.clearTimeout = () => {};
windowStub.setInterval = () => 0;
windowStub.clearInterval = () => {};
windowStub.performance = { now: () => 0 };
windowStub.URL = URL;
windowStub.URLSearchParams = URLSearchParams;
windowStub.Map = Map;
windowStub.Set = Set;
windowStub.WeakMap = WeakMap;
windowStub.WeakSet = WeakSet;
windowStub.Proxy = Proxy;
windowStub.Symbol = Symbol;
windowStub.Promise = Promise;
windowStub.Error = Error;
windowStub.TypeError = TypeError;
windowStub.RangeError = RangeError;
windowStub.SyntaxError = SyntaxError;
windowStub.ReferenceError = ReferenceError;
windowStub.Object = Object;
windowStub.Array = Array;
windowStub.JSON = JSON;
windowStub.Math = Math;
windowStub.Number = Number;
windowStub.String = String;
windowStub.Boolean = Boolean;
windowStub.Date = Date;
windowStub.RegExp = RegExp;
windowStub.parseInt = parseInt;
windowStub.parseFloat = parseFloat;
windowStub.isNaN = isNaN;
windowStub.isFinite = isFinite;
windowStub.console = console;
windowStub.addEventListener = () => {};
windowStub.removeEventListener = () => {};
windowStub.dispatchEvent = () => true;
windowStub.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} });
windowStub.getComputedStyle = () => ({ getPropertyValue: () => "", overflowY: "auto", position: "sticky" });
windowStub.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
windowStub.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
windowStub.MutationObserver = class { observe() {} disconnect() {} takeRecords() { return []; } };

const documentStub = makeStub("document");
documentStub.readyState = "loading";
documentStub.body = makeStub("document.body");
documentStub.body.dataset = {};
documentStub.documentElement = makeStub("document.documentElement");
documentStub.addEventListener = () => {};
documentStub.removeEventListener = () => {};
documentStub.createElementNS = () => makeStub("svgElement");
documentStub.createElement = () => makeStub("element");
documentStub.createTextNode = () => makeStub("textNode");

windowStub.document = documentStub;
windowStub.window = windowStub;
windowStub.self = windowStub;
windowStub.globalThis = windowStub;
windowStub.Node = { DOCUMENT_POSITION_FOLLOWING: 4 };
windowStub.HTMLCanvasElement = class {};

const proxiedSandbox = new Proxy(sandbox, {
  get(t, prop) {
    if (prop in t) return t[prop];
    const child = makeStub(String(prop));
    t[prop] = child;
    return child;
  },
  has() { return true; },
});

const context = createContext(proxiedSandbox);

for (const src of scripts) {
  const absPath = new URL(src, repoRoot);
  const code = readFileSync(absPath, "utf8");
  try {
    const script = new Script(code, { filename: src });
    script.runInContext(context, { displayErrors: true });
  } catch (err) {
    console.error(`FAIL loading ${src}: ${err.message}`);
    process.exit(1);
  }
}

// Now probe the state of the runtime.
console.log("\n--- audio module state ---");
console.log("TT_BEAMER_RUNTIME_AUDIO present:", Boolean(sandbox.TT_BEAMER_RUNTIME_AUDIO));
console.log("playSoundForAnimation is function:",
  typeof sandbox.TT_BEAMER_RUNTIME_AUDIO?.playSoundForAnimation);
console.log("isAudioPlaybackAllowed is function:",
  typeof sandbox.TT_BEAMER_RUNTIME_AUDIO?.isAudioPlaybackAllowed);

// Check isAudioPlaybackAllowed — this is the critical gate.
let allowed;
try {
  allowed = sandbox.TT_BEAMER_RUNTIME_AUDIO.isAudioPlaybackAllowed();
  console.log("isAudioPlaybackAllowed():", allowed);
} catch (err) {
  console.log("isAudioPlaybackAllowed() threw:", err.message);
}

// Try to invoke playSoundForAnimation with a plausible animation.
console.log("\n--- synthetic playSoundForAnimation trial ---");
console.log("BEFORE: audioConstructed:", trace.audioConstructed, "audioPlayCalled:", trace.audioPlayCalled, "audioLoadCalled:", trace.audioLoadCalled);
try {
  sandbox.TT_BEAMER_RUNTIME_AUDIO.playSoundForAnimation({
    id: "test-animation",
    type: "intruder-alert",
    scope: "room",
    startedAt: 0,
    startedAtEpochMs: 0,
    soundVolume: 1,
  });
  console.log("playSoundForAnimation returned without throwing");
} catch (err) {
  console.log("playSoundForAnimation threw:", err.message);
  console.log(err.stack?.split("\n").slice(0, 6).join("\n"));
}
console.log("AFTER:  audioConstructed:", trace.audioConstructed, "audioPlayCalled:", trace.audioPlayCalled, "audioLoadCalled:", trace.audioLoadCalled);
console.log("audio paths seen:", Array.from(trace.audioPaths).slice(0, 5));
