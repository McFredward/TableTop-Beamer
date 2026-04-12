// Phase 14-2 follow-up smoke test — runtime loader.
//
// Executes every `<script defer src="/src/app/...">` from index.html
// in order inside a Node `vm` context, with an auto-stubbing Proxy
// for `window` / `document` / friends. Catches ReferenceError,
// TDZ errors, syntax errors, and any undefined-is-not-a-function
// failures at module-load time — which the regex harnesses cannot.
//
// The goal is reproducing the browser's "uncaught at script load"
// error surface: any script that throws at top level aborts this
// smoke test and names the file + original error, so we can fix it
// before reloading the browser.

import { readFileSync } from "node:fs";
import { createContext, Script } from "node:vm";

const repoRoot = new URL("../", import.meta.url);
const indexHtml = readFileSync(new URL("index.html", repoRoot), "utf8");

// Collect scripts in source order.
const scripts = [];
const re = /<script\s+src="([^"]+)"\s+defer[^>]*><\/script>/g;
let m;
while ((m = re.exec(indexHtml))) {
  const src = m[1];
  if (!src.startsWith("/src/app/")) continue;
  scripts.push(src.replace(/^\//, ""));
}

// Proxy-based auto stub: every property access returns another proxy.
// Calling a proxy returns another proxy. Assignment succeeds silently.
function makeStub(name = "stub") {
  const target = function () {
    return makeStub(`${name}()`);
  };
  target.__stubName = name;
  return new Proxy(target, {
    get(t, prop, recv) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) {
        return function* () {};
      }
      if (prop === "then") return undefined; // avoid accidental promise resolution
      if (prop in t) return t[prop];
      const child = makeStub(`${name}.${String(prop)}`);
      t[prop] = child;
      return child;
    },
    set(t, prop, value) {
      t[prop] = value;
      return true;
    },
    apply(t, thisArg, args) {
      // Heuristic: if the stub looks like it was called as `video.play()`,
      // return a resolved Promise so the `prewarmBoardOutsideMp4Asset`
      // pipeline can await it. For everything else return a proxy.
      if (name.endsWith(".play()") || name.endsWith(".play")) {
        return Promise.resolve();
      }
      return makeStub(`${name}()`);
    },
    construct(t, args) {
      return makeStub(`new ${name}()`);
    },
    has() {
      return true;
    },
  });
}

// vm sandbox must be a plain object — we'll attach `window`, `document`,
// and the globals onto it directly so bare-name lookups resolve.
const sandbox = {};
const windowStub = sandbox;
// Populate a handful of real constants that code checks against:
windowStub.location = { href: "http://localhost:8787/output/final", hostname: "localhost", protocol: "http:", port: "8787", search: "", pathname: "/output/final" };
windowStub.navigator = { userAgent: "node-smoke-test", language: "en" };
windowStub.innerWidth = 1920;
windowStub.innerHeight = 1080;
windowStub.devicePixelRatio = 1;
windowStub.requestAnimationFrame = (cb) => 0;
windowStub.cancelAnimationFrame = () => {};
windowStub.setTimeout = (cb, ms) => 0;
windowStub.clearTimeout = () => {};
windowStub.setInterval = (cb, ms) => 0;
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
windowStub.getComputedStyle = () => ({ getPropertyValue: () => "" });
windowStub.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
windowStub.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
windowStub.MutationObserver = class { observe() {} disconnect() {} takeRecords() { return []; } };

const documentStub = makeStub("document");
documentStub.readyState = "loading";
documentStub.body = makeStub("document.body");
documentStub.documentElement = makeStub("document.documentElement");
documentStub.addEventListener = () => {};
documentStub.removeEventListener = () => {};

windowStub.document = documentStub;
windowStub.window = windowStub;
windowStub.self = windowStub;
windowStub.globalThis = windowStub;

// Any top-level bare identifier that scripts reference (e.g., `AudioContext`,
// `HTMLCanvasElement`, `Image`, `fetch`, etc.) should auto-stub instead of
// throwing ReferenceError. We wrap the sandbox in a Proxy that falls back
// to makeStub for unknown property reads.
const proxiedSandbox = new Proxy(sandbox, {
  get(t, prop, recv) {
    if (prop in t) return t[prop];
    const child = makeStub(String(prop));
    t[prop] = child;
    return child;
  },
  has() {
    return true;
  },
});

const context = createContext(proxiedSandbox);

let failures = 0;
for (const src of scripts) {
  const absPath = new URL(src, repoRoot);
  let code;
  try {
    code = readFileSync(absPath, "utf8");
  } catch (err) {
    console.error(`MISSING FILE: ${src} — ${err.message}`);
    failures++;
    continue;
  }
  try {
    const script = new Script(code, { filename: src });
    script.runInContext(context, { displayErrors: true });
  } catch (err) {
    console.error(`\nFAIL @ ${src}`);
    console.error(`  ${err.constructor.name}: ${err.message}`);
    if (err.stack) {
      const stackLines = err.stack.split("\n").slice(0, 6).join("\n    ");
      console.error(`    ${stackLines}`);
    }
    failures++;
    break;
  }
}

if (failures === 0) {
  console.log(`PASS - all ${scripts.length} scripts loaded without top-level errors`);
} else {
  console.log(`\nFAIL - ${failures} script(s) threw at load time`);
  process.exit(1);
}
