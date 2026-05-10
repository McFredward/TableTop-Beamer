---
phase: 34
plan: B
type: execute
wave: 2
depends_on: [W0]
files_modified:
  - server.mjs
  - src/app/lib/shared/runtime-env.js
  - src/app/runtime/runtime-orchestration.js
  - src/server/ssr-render-host.mjs
  - output.html
  - src/app/runtime/output-receiver/output-audio-binder.js
autonomous: false
requirements: []
must_haves:
  truths:
    - "GET /ssr returns the full app HTML (today's index.html); the SSR Chromium tab loads the full render pipeline at /ssr (no ?ssr=1 query)."
    - "GET /output and GET /output/final return the new thin output.html; this HTML contains <video> + receiver-bootstrap + output-audio-binder + diagnostic chip ONLY — zero render-pipeline modules, zero TT_BEAMER_CONFIG/STATE/draw-loop scripts."
    - "getRuntimeEnvironment({pathname:'/ssr'}) returns 'server-ssr' so the GL renderer never permanently disables GL on the SSR tab (D-02 prerequisite — research §Pitfall 2)."
    - "ssr-render-host.mjs navigates Chromium to http://127.0.0.1:${port}/ssr at BOTH the ssrUrl constant (line 450) and the page.goto call (line 824)."
    - "Pi-local audio still triggers from the live-sync WebSocket — audio binders execute when an animation start is broadcast, even though the thin path does NOT load runtime-live-sync-core.js."
    - "Phase 33 connection-stability suite remains 80/0 PASS after this plan (D-06 hard gate)."
    - "All Wave-0 Track-B rail tests transition RED → GREEN: route-split (3), runtime-env (2 of the new pathname tests), thin-output-script-graph (7)."
  artifacts:
    - path: "output.html"
      provides: "Thin /output/ entry point — <video>, splash, reconnect-banner, error-overlay, output-status-chip, ssr-input-overlay div, plus minimal script tags."
      min_lines: 80
      contains: "ssr-video"
    - path: "src/app/runtime/output-receiver/output-audio-binder.js"
      provides: "Lightweight live-sync subscriber for Pi-local audio. Opens WebSocket to /api/live/ws?role=final-output, listens for live-mutation messages with mutationType 'start-animation' / 'stop-animation' / 'clear-all', plays mapped sound via HTMLAudioElement pool. Auto-reconnects with backoff."
      min_lines: 100
      exports: ["bootOutputAudioBinder"]
    - path: "server.mjs"
      provides: "Updated resolveStaticPath: /ssr → index.html, /output|/output/final → output.html."
      contains: "/ssr"
    - path: "src/app/lib/shared/runtime-env.js"
      provides: "Updated getRuntimeEnvironment classifies pathname '/ssr' as 'server-ssr'."
      contains: "/ssr"
    - path: "src/server/ssr-render-host.mjs"
      provides: "ssrUrl constant + page.goto target migrated from /output?ssr=1 to /ssr (TWO sites)."
      contains: "/ssr"
    - path: "src/app/runtime/runtime-orchestration.js"
      provides: "data-ssr-tab marker uses pathname-based detection (matches new /ssr classifier)."
      contains: "/ssr"
  key_links:
    - from: "server.mjs:resolveStaticPath"
      to: "output.html"
      via: "path.join(ROOT_DIR, 'output.html') for routePath /output and /output/final"
      pattern: "routePath\\s*===\\s*[\"']/output[\"']"
    - from: "ssr-render-host.mjs:launchBrowser ssrUrl + page.goto"
      to: "/ssr HTTP route"
      via: "two string-literal sites updated atomically"
      pattern: "127\\.0\\.0\\.1:\\$\\{port\\}/ssr"
    - from: "output.html"
      to: "src/app/runtime/output-receiver/receiver-bootstrap.js"
      via: "<script type='module' src='/src/app/runtime/output-receiver/receiver-bootstrap.js'>"
      pattern: "receiver-bootstrap\\.js"
    - from: "output.html"
      to: "src/app/runtime/output-receiver/output-audio-binder.js"
      via: "<script type='module' src='/src/app/runtime/output-receiver/output-audio-binder.js'>"
      pattern: "output-audio-binder\\.js"
    - from: "src/app/lib/shared/runtime-env.js:getRuntimeEnvironment"
      to: "runtime-projection-gl-renderer.js:_glPermanentlyDisabled threshold"
      via: "return 'server-ssr' for /ssr pathname → GL renderer skips permanent-disable"
      pattern: "pathname\\s*===\\s*[\"']/ssr[\"']"
---

<objective>
**Track B — atomic URL migration + thin-consumer split.** Implement D-04 path split end-to-end in a single plan. The atomicity is non-negotiable: changing the SSR tab's URL from `/output?ssr=1` to `/ssr` cascades into `runtime-env.js` (RESEARCH §Pitfall 2 — without the runtime-env update the GL renderer would auto-disable GL on the SSR tab after 3 context losses, the exact behavior D-02 forbids), into `runtime-orchestration.js`'s `data-ssr-tab` marker, into both navigation sites in `ssr-render-host.mjs` (lines 450 + 824 — RESEARCH §Pitfall 3), and into the new `output.html` thin entry. ALL of those changes ship together or none do.

Purpose:
- Stop the Pi /output/ tab from double-decoding GIFs locally while the H264 stream already renders the same content.
- Move the SSR Chromium tab to a dedicated path so route-level identification replaces the fragile `?ssr=1` query discriminator.
- Set up the runtime-env classifier to correctly identify `/ssr` as `server-ssr` so Track A can layer GL forcing on top without re-introducing the 2D-fallback regression.

Output:
- `output.html` (NEW, repo root) — thin consumer: video, splash, banner, error overlay, diagnostic chip, ssr-input-overlay, plus 4 script tags (runtime-env, receiver-bootstrap, output-audio-binder, inline diagnostic-chip rAF).
- `src/app/runtime/output-receiver/output-audio-binder.js` (NEW) — ~120-line WS subscriber that plays mapped sounds for live-mutation events.
- `server.mjs` patch: `resolveStaticPath()` adds `/ssr → index.html` and switches `/output | /output/final → output.html`.
- `src/app/lib/shared/runtime-env.js` patch: `getRuntimeEnvironment` classifies `/ssr` (and `/ssr/*`) as `server-ssr`.
- `src/app/runtime/runtime-orchestration.js` patch: `data-ssr-tab` marker also fires on pathname `/ssr`.
- `src/server/ssr-render-host.mjs` patch: BOTH `ssrUrl` constant (line 450) AND `page.goto()` URL (line 824) → `http://127.0.0.1:${port}/ssr`.
- `?ssr=1` query support stays in `runtime-env.js` and `runtime-orchestration.js` as a deprecation-safety net (no redirect — RESEARCH §Open Q3 recommends hard-cut, but a quiet inert tolerance in the runtime-env classifier costs nothing and protects against any unknown stale link).

This plan does NOT touch the GL-flag gating or the 2D-fallback policy — that is 34-A's scope.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-34/34-CONTEXT.md
@.planning/phases/phase-34/34-RESEARCH.md
@.planning/phases/phase-34/34-W0-SUMMARY.md
@.planning/phases/phase-33/33-CLOSURE.md
@.planning/phases/phase-33/33-SUMMARY.md
@.planning/phases/phase-33/33-CONTEXT.md

# Source files to modify or read for current behavior:
@server.mjs
@src/app/lib/shared/runtime-env.js
@src/app/runtime/runtime-orchestration.js
@src/server/ssr-render-host.mjs
@src/app/runtime/output-receiver/receiver-bootstrap.js
@src/app/runtime/output-receiver/receiver-webrtc-client.js
@src/app/runtime/output-receiver/receiver-status-ui.js
@src/app/runtime/output-receiver/receiver-input-forwarder.js
@index.html

# Wave-0 contract tests that must transition RED → GREEN:
@test/phase-34-route-split.test.mjs
@test/phase-34-runtime-env.test.mjs
@test/phase-34-thin-output-script-graph.test.mjs

# Patterns to copy for the new audio binder:
@src/app/runtime/output-receiver/receiver-input-forwarder.js

<interfaces>
<!-- Contract surfaces this plan reshapes. Executor should use these directly — no codebase exploration needed. -->

From server.mjs:3444-3449 (current resolveStaticPath, will be patched):
```javascript
function resolveStaticPath(urlValue, routePath) {
  if (routePath === "/output/final" || routePath === "/output") {
    return path.join(ROOT_DIR, "index.html");
  }
  return toSafePath(urlValue || "/");
}
```

From src/app/lib/shared/runtime-env.js:50-69 (current getRuntimeEnvironment):
```javascript
function getRuntimeEnvironment({ location: loc, userAgent: ua } = {}) {
  // ARM-UA fast-path → "pi"
  // ?ssr=1 → "server-ssr"
  // /output → "pi"
  // else → "desktop"
  // Phase 34 adds: pathname /ssr or /ssr/* → "server-ssr"
}
```

From src/server/ssr-render-host.mjs:450 (ssrUrl constant — site 1 of 2):
```javascript
const ssrUrl = `http://127.0.0.1:${port}/output?ssr=1`;
```

From src/server/ssr-render-host.mjs:824 (page.goto — site 2 of 2):
```javascript
await page.goto(`http://127.0.0.1:${port}/output?ssr=1`, {
  waitUntil: "domcontentloaded",
  timeout: 30_000,
});
```

From src/app/runtime/runtime-orchestration.js:65-70 (data-ssr-tab marker):
```javascript
const __ttbSearch = window.location.search || "";
const __ttbIsSsrTab = /[?&]ssr=1(\b|&)/.test(__ttbSearch);
if (__ttbIsSsrTab) {
  document.body.dataset.ssrTab = "true";
}
```

From src/app/runtime/output-receiver/receiver-bootstrap.js (already-thin entry, exports):
```javascript
export async function bootReceiver({ logger = console } = {}): Promise<{stop, getStatus, getCurrentState, manualRetry}>;
export function isReceiverPath(locationLike = window.location): boolean; // unchanged
```

From src/app/runtime/output-receiver/receiver-input-forwarder.js (pattern for the new output-audio-binder.js — same role-based WS endpoint shape):
```javascript
// Opens WebSocket('/api/live/ws?role=final-output-input'), reconnects with backoff,
// sends align-corner-drag mutations. The output-audio-binder uses the SAME
// reconnect pattern but with role=final-output and listens for live-mutation
// messages instead of sending input.
```

From config.js (window.TT_BEAMER_CONFIG.EVENT_SOUND_ASSETS) — read by the thin audio binder:
```javascript
window.TT_BEAMER_CONFIG.EVENT_SOUND_ASSETS = {
  // event-name → array of sound asset paths
};
window.TT_BEAMER_CONFIG.ALL_SOUND_ASSET_PATHS = [...]; // flat list for preload
```

Note: D-03 says "maximum strip" — `output.html` MUST NOT load `config.js` if avoidable. RESEARCH §Audio Binder Coupling Option 3 picked: a self-contained ~120-line `output-audio-binder.js` that fetches the sound-mapping table at boot via `GET /api/asset-manifest` (which already exists — see config/asset-manifest.json) OR receives sound paths embedded in the live-mutation animation payload (preferred — the live-sync envelope already carries the animation object, which has a `sound` field that resolves to a sound-asset path on the server side). Planner picks the simpler option: the binder reads `animation.sound` from the mutation payload and plays it directly. If the field is empty, it skips audio. This deliberately accepts that some sound mappings (event-name → asset-path resolution) won't fire in the thin path; the user can opt back into the full path via `/output/?legacy=1` if needed (NOT scoped here).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Server route split (`/ssr` + `/output` → output.html) + runtime-env classifier update</name>
  <files>server.mjs, src/app/lib/shared/runtime-env.js</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-04 path split — exact target spelling: "/ssr", not "/ssr/", primary route name)
    - .planning/phases/phase-34/34-RESEARCH.md (Track B: Server Route Split + Runtime-Env Detection Migration; Pitfall 2 + Pitfall 7)
    - server.mjs (full handler — note `normalizeRoutePath` strips trailing slash so `/ssr/` and `/ssr` collapse)
    - src/app/lib/shared/runtime-env.js (full file, 79 lines)
    - test/phase-34-route-split.test.mjs (Wave-0 rail — its assertions ARE the contract)
    - test/phase-34-runtime-env.test.mjs (Wave-0 rail)
    - src/server/ssr-webrtc-signaling.mjs lines 260-280 (localhost-only guard for ssr-tab role — unchanged but referenced for the threat-model parity)
  </read_first>
  <behavior>
    - Test 1 (route-split rail #1): `resolveStaticPath` source contains an `if (routePath === "/ssr")` branch that resolves to `path.join(ROOT_DIR, "index.html")`.
    - Test 2 (route-split rail #2): same function source no longer maps `/output` to `index.html` — it maps `/output` and `/output/final` to `path.join(ROOT_DIR, "output.html")`.
    - Test 3 (route-split regression): `normalizeRoutePath("/output?ssr=1") === "/output"` still holds.
    - Test 4 (runtime-env rail #1): `getRuntimeEnvironment({location:{pathname:"/ssr",search:""}}) === "server-ssr"`.
    - Test 5 (runtime-env rail #2): `getRuntimeEnvironment({location:{pathname:"/ssr/some-future-subpath",search:""}}) === "server-ssr"`.
    - Test 6 (runtime-env regression): `getRuntimeEnvironment({location:{pathname:"/output",search:""}}) === "pi"` still holds.
    - Test 7 (runtime-env regression): `getRuntimeEnvironment({location:{pathname:"/output",search:"?ssr=1"}}) === "server-ssr"` (legacy quiet tolerance — see §interfaces).
    - Test 8 (ARM-UA regression): `getRuntimeEnvironment({location:{pathname:"/",search:""},userAgent:"Linux armv7l"}) === "pi"` still holds.
  </behavior>
  <action>
    Two file edits, both surgical.

    **Edit 1 — `server.mjs` (function `resolveStaticPath` at line ~3444):**

    Replace the body of `resolveStaticPath` so it reads exactly:

    ```javascript
    function resolveStaticPath(urlValue, routePath) {
      // Phase 34 D-04: SSR Chromium tab navigates here for the full app.
      // Localhost-only enforcement is layered at the ssr-tab WS role guard
      // (ssr-webrtc-signaling.mjs:269); the HTTP response itself is the same
      // index.html bytes the dashboard receives, so no fingerprinting risk.
      if (routePath === "/ssr") {
        return path.join(ROOT_DIR, "index.html");
      }
      // Phase 34 D-04: thin consumer page (Pi /output/, /output/final).
      // Replaces the previous "return index.html for /output" mapping.
      if (routePath === "/output/final" || routePath === "/output") {
        return path.join(ROOT_DIR, "output.html");
      }
      return toSafePath(urlValue || "/");
    }
    ```

    Do NOT touch any other code in server.mjs in this task. Do NOT add a redirect for `/output?ssr=1` (RESEARCH §Open Q3: hard-cut is safe, the only consumer of `?ssr=1` is `ssr-render-host.mjs` itself which Task 3 migrates).

    **Edit 2 — `src/app/lib/shared/runtime-env.js`:**

    Replace lines 60-69 (the `getRuntimeEnvironment` classifier body) with:

    ```javascript
        const search = safeLoc?.search ?? "";
        const pathname = safeLoc?.pathname ?? "/";
        // Phase 34 D-04: SSR tab is now identified by pathname /ssr (or
        // /ssr/<sub>) AT SERVER ROUTE LEVEL. The legacy ?ssr=1 query
        // discriminator is kept as a quiet tolerance — no consumer remains
        // that legitimately uses it (ssr-render-host.mjs:450 + 824 are
        // updated in 34-B Task 3 to navigate /ssr directly), but classifying
        // a stale ?ssr=1 URL as "server-ssr" rather than "pi" is the safe
        // direction (no quality regression beyond Phase-30 baseline).
        const isSsrPath = pathname === "/ssr" || pathname.startsWith("/ssr/");
        const isSsrQuery = /[?&]ssr=1(\b|&)/.test(search);
        const isSsr = isSsrPath || isSsrQuery;
        const isOutput =
          pathname === "/output" ||
          pathname === "/output/" ||
          pathname.startsWith("/output/");
        if (isSsr) return "server-ssr";
        if (isOutput) return "pi";
        return "desktop";
    ```

    The ARM-UA early-return at line 57 stays exactly as-is.
  </action>
  <verify>
    <automated>node --test test/phase-34-route-split.test.mjs test/phase-34-runtime-env.test.mjs 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `node --test test/phase-34-route-split.test.mjs` reports `# fail 0` and `# pass 4` (was: 3 fail / 1 pass at end of Wave 0).
    - `node --test test/phase-34-runtime-env.test.mjs` reports `# fail 0` and `# pass 5` (was: 2 fail / 3 pass at end of Wave 0).
    - `grep -nE 'routePath\s*===\s*"/ssr"' server.mjs` returns at least one line inside `resolveStaticPath`.
    - `grep -nE '"output\.html"' server.mjs` returns at least one line.
    - `grep -nE 'pathname\s*===\s*"/ssr"|pathname\.startsWith\("/ssr/"\)' src/app/lib/shared/runtime-env.js` returns at least one line.
    - `node --test "test/runtime-env-environment.test.mjs"` still passes (existing regression).
    - `wc -l server.mjs` value is within ±10 lines of the pre-task value (no large refactor crept in).
  </acceptance_criteria>
  <done>
    Two production files patched; 5 Wave-0 tests flipped RED→GREEN; existing `runtime-env-environment.test.mjs` regression still GREEN; the legacy `?ssr=1` query is still tolerated as `server-ssr` so a stale link or a partial-rollback never falls back to the GL-killing `pi` path.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Thin output.html + output-audio-binder.js (new files, no legacy entanglement)</name>
  <files>output.html, src/app/runtime/output-receiver/output-audio-binder.js</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-03 maximum strip; Audio binders note in §decisions)
    - .planning/phases/phase-34/34-RESEARCH.md (Track B: Minimum Script Set for output.html; Audio Binder Coupling — Option 3; Pitfall 6 — chip script needs its own thin version)
    - index.html lines 50-73 (DOM elements the receiver expects: ssr-splash, ssr-video, ssr-reconnect-banner, ssr-error-overlay, ssr-error-body, ssr-retry-button)
    - index.html lines 200-215 (ssr-input-overlay sentinel — created lazily by receiver-bootstrap if missing, but pre-declaring is safer)
    - index.html lines 1011-1086 (the diagnostic-chip inline rAF script — extract a thin version)
    - src/app/runtime/output-receiver/receiver-bootstrap.js (entry: `bootReceiver({logger})`; reads `document.getElementById("ssr-video")`, `output-status-chip`, etc.)
    - src/app/runtime/output-receiver/receiver-input-forwarder.js (pattern for WS endpoint + reconnect — same role-based shape)
    - test/phase-34-thin-output-script-graph.test.mjs (Wave-0 rail — defines exact required + forbidden script names)
    - src/app/runtime/render/runtime-audio.js lines 180-250 (playSoundForAnimation logic to model the thin binder on, but DO NOT IMPORT this — copy the minimal subset)
    - .planning/phases/phase-31/31-SUMMARY.md (D-D2 reversal: Pi-local audio is HTML5 <audio> via WebSocket triggers — confirms the binder is a thin pattern-match, not a deep extraction)
  </read_first>
  <behavior>
    - Test 1 (rail #1): `output.html` exists at repo root.
    - Test 2 (rail #2-7): output.html does NOT contain any of: `runtime-orchestration.js`, `runtime-gif-decoder.js`, `runtime-gif-playback.js`, `runtime-outside-mp4.js`, `runtime-draw-loop.js`, `runtime-projection-gl-renderer.js`, `runtime-projection-2d-fallback-renderer.js`, `runtime-animation-lifecycle.js`, `runtime-live-sync-core.js`, `runtime-orchestration-ctx-builder.js`.
    - Test 3 (rail): output.html DOES contain `receiver-bootstrap.js`.
    - Test 4 (rail): output.html DOES contain `runtime-env.js`.
    - Test 5 (rail): output.html DOES contain `output-audio-binder.js`.
    - Test 6 (rail): output.html `<script` tag count <= 8.
    - Test 7 (manual eyeball — covered by automated grep): output.html DOM contains `id="ssr-video"`, `id="ssr-splash"`, `id="ssr-reconnect-banner"`, `id="ssr-error-overlay"`, `id="output-status-chip"`.
    - Behavior 8 (manual): when GET /output is hit AFTER Task 1 lands, the response body is the new `output.html` (not `index.html`).
    - Behavior 9 (functional): `output-audio-binder.js` opens `WebSocket('/api/live/ws?role=final-output')`, listens for `live-mutation` envelopes whose `mutationType` is one of `start-animation` / `stop-animation` / `clear-all`, and calls `new Audio(animationPayload.sound).play()` (with a small voice-pool guard) when a non-empty `sound` field is present. Auto-reconnect with the same exponential backoff schedule as `receiver-input-forwarder.js`.
  </behavior>
  <action>
    Create TWO new files. No edits to existing files in this task.

    **File 1: `output.html` at repo root**

    Use this exact skeleton. The DOM mirrors the receiver-relevant subset of `index.html`. Comments inline reference the sourcing sections.

    ```html
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>TableTop Beamer — Output</title>
      <link rel="stylesheet" href="/styles.css" />
      <!-- Phase 34 D-03 thin consumer: NO render pipeline. Pi /output/ shows
           the H264 stream from /api/webrtc/signal + a Pi-local audio binder.
           SSR Chromium tab loads the FULL app at /ssr, not here.
           Anti-list (must NOT appear): runtime-orchestration.js,
           runtime-gif-*, runtime-outside-mp4.js, runtime-draw-loop.js,
           runtime-projection-*, runtime-animation-lifecycle.js,
           runtime-live-sync-core.js, runtime-orchestration-ctx-builder.js. -->
    </head>
    <body data-output-role="final-output">
      <!-- Phase 31 Plan 03 receiver DOM. Hidden flags match index.html. -->
      <div id="ssr-splash" class="ssr-splash" hidden>
        <div class="ssr-splash-content">
          <h1 class="ssr-splash-logo">TableTop Beamer</h1>
          <p class="ssr-splash-status" id="ssr-splash-status">Connecting to render server…</p>
          <div class="ssr-splash-spinner" aria-hidden="true"></div>
        </div>
      </div>
      <video id="ssr-video" class="ssr-video" autoplay muted playsinline hidden></video>
      <div id="ssr-reconnect-banner" class="ssr-reconnect-banner" role="status" aria-live="polite" hidden>
        Server reconnecting…
      </div>
      <div id="ssr-error-overlay" class="ssr-error-overlay" role="alertdialog" aria-modal="true" hidden>
        <div class="ssr-error-content">
          <h2 class="ssr-error-title">Render server unreachable</h2>
          <p class="ssr-error-body" id="ssr-error-body">The connection to the render server has been lost.</p>
          <button id="ssr-retry-button" class="ssr-error-retry" type="button">Retry</button>
        </div>
      </div>

      <!-- Diagnostic chip — fps + render-mode + canvas + frame-cost. The
           render-mode + frame-cost fields are only meaningful inside the
           SSR-tab (the full app on /ssr); on the thin /output/ they show
           "stream" (no local rendering). The full chip stays as DOM
           because user wanted it visible (h17). -->
      <div id="output-status-chip" class="output-status-chip" hidden>
        <span id="output-status-version"></span>
        <span id="output-status-fps">- fps</span>
        <span id="output-status-mode">stream</span>
        <span id="output-status-canvas">-</span>
        <span id="output-status-frame-cost">-</span>
      </div>

      <!-- ssr-input-overlay is created lazily by receiver-bootstrap if
           absent, but pre-declaring it here matches the index.html
           contract and avoids a layout-thrash on first align-mode tap. -->
      <div id="ssr-input-overlay" style="position:fixed;inset:0;z-index:4;touch-action:none;pointer-events:none"></div>

      <!-- Phase 34 D-03: minimal script set. Order matters:
           1. runtime-env.js  — exposes window.TT_BEAMER_RUNTIME_ENV
              consumed by receiver-bootstrap (output-role detection).
           2. receiver-bootstrap.js (module) — boots the WebRTC consumer.
           3. output-audio-binder.js (module) — Pi-local audio.
           4. inline diagnostic-chip rAF — fps sampling only (D-03 strip:
              no render-mode probe locally; render-mode lives on /ssr).
      -->
      <script src="/src/app/lib/shared/runtime-env.js" defer></script>
      <script type="module" src="/src/app/runtime/output-receiver/receiver-bootstrap.js"></script>
      <script type="module" src="/src/app/runtime/output-receiver/output-audio-binder.js"></script>
      <script>
        // Phase 34 D-03: thin diagnostic chip — fps from rAF only; no
        // render-mode (this page does not render), no frame-cost (no
        // draw loop). The chip is hidden by default; receiver-bootstrap
        // un-hides it once the body data-output-role is confirmed.
        document.addEventListener("DOMContentLoaded", () => {
          const chip = document.getElementById("output-status-chip");
          const fpsEl = document.getElementById("output-status-fps");
          const samples = [];
          let last = performance.now();
          (function tick(){
            const t = performance.now();
            const d = t - last; last = t;
            if (d > 0 && d < 2000) { samples.push(d); if (samples.length > 60) samples.shift(); }
            requestAnimationFrame(tick);
          })();
          setInterval(() => {
            if (!fpsEl || samples.length === 0) return;
            const avg = samples.reduce((a,b)=>a+b,0) / samples.length;
            fpsEl.textContent = `${(1000/avg).toFixed(1)} fps`;
          }, 500);
          if (chip) chip.hidden = false;
        });
      </script>
      <!-- Boot the receiver bootstrap (its module entry exports bootReceiver
           but does not auto-boot — index.html-style invocation pattern). -->
      <script type="module">
        import { bootReceiver } from "/src/app/runtime/output-receiver/receiver-bootstrap.js";
        bootReceiver({ logger: console }).catch((err) => {
          console.error("[output] receiver bootstrap failed", err);
          const splash = document.getElementById("ssr-splash");
          const errorOverlay = document.getElementById("ssr-error-overlay");
          const errorBody = document.getElementById("ssr-error-body");
          if (splash) splash.hidden = true;
          if (errorOverlay) errorOverlay.hidden = false;
          if (errorBody) errorBody.textContent =
            `Receiver bootstrap failed: ${err?.message ?? err}. Reload the page to retry.`;
        });
      </script>
      <!-- Boot the audio binder. Best-effort — failures don't block video. -->
      <script type="module">
        import { bootOutputAudioBinder } from "/src/app/runtime/output-receiver/output-audio-binder.js";
        bootOutputAudioBinder({ logger: console }).catch((err) => {
          console.warn("[output-audio] binder failed:", err?.message);
        });
      </script>
    </body>
    </html>
    ```

    **Important script-tag count audit:** the rail-test-7 caps `<script` count at 8. Above we have: 1 src=runtime-env.js, 1 src=receiver-bootstrap.js (the one in the `<head>`-area block), 1 src=output-audio-binder.js, 1 inline diagnostic-chip block, 1 inline `import { bootReceiver }` block, 1 inline `import { bootOutputAudioBinder }` block. Total = 6 `<script` tags. Pass.

    **Note:** the duplicated `<script type="module" src=".../receiver-bootstrap.js">` AND `<script type="module">import bootReceiver...</script>` is intentional only if `receiver-bootstrap.js` does NOT auto-boot on import. Read the module to confirm: it exports `bootReceiver` but does not call it at import time. So the bare `<script src=".../receiver-bootstrap.js">` line is REDUNDANT and should be REMOVED — keep only the `<script type="module">import { bootReceiver } from "..."; bootReceiver({logger})</script>` form. Same logic for output-audio-binder. After this cleanup the `<script` count is 4: runtime-env src tag, diagnostic-chip inline, bootReceiver inline-import, bootOutputAudioBinder inline-import.

    **File 2: `src/app/runtime/output-receiver/output-audio-binder.js`**

    Pattern: copy the WS lifecycle from `receiver-input-forwarder.js` (open WS to `/api/live/ws?role=final-output`, exponential backoff on reconnect, role string is the only delta). Listen for incoming `live-mutation` messages.

    Skeleton:

    ```javascript
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
    ```

    Save with the exact path `src/app/runtime/output-receiver/output-audio-binder.js`. Module is ES-module (`type="module"` in the script tag references it).

    **Self-check on the rail-test-7 cap:** count `<script` occurrences in the final output.html. After dropping the redundant src tags noted above, total is 4. Comfortably under 8.
  </action>
  <verify>
    <automated>node --test test/phase-34-thin-output-script-graph.test.mjs 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - File `output.html` exists at repo root.
    - File `src/app/runtime/output-receiver/output-audio-binder.js` exists and exports `bootOutputAudioBinder`.
    - `node --test test/phase-34-thin-output-script-graph.test.mjs` reports `# fail 0` and `# pass 7` (was: 7 fail at end of Wave 0).
    - `grep -c '<script' output.html` returns a number ≤ 8.
    - `grep -E 'runtime-(orchestration|gif-decoder|gif-playback|outside-mp4|draw-loop|projection-gl-renderer|projection-2d-fallback-renderer|animation-lifecycle|live-sync-core|orchestration-ctx-builder)' output.html` returns 0 lines (none of these may appear).
    - `grep -E 'receiver-bootstrap\.js|runtime-env\.js|output-audio-binder\.js' output.html` returns at least 3 lines (one for each).
    - `grep -E 'id="ssr-(video|splash|reconnect-banner|error-overlay)"' output.html` returns 4 lines.
    - `grep -nE 'export\s+async\s+function\s+bootOutputAudioBinder' src/app/runtime/output-receiver/output-audio-binder.js` returns one line.
    - `grep -nE 'role=final-output' src/app/runtime/output-receiver/output-audio-binder.js` returns at least one line (the WS endpoint).
  </acceptance_criteria>
  <done>
    `output.html` and `output-audio-binder.js` exist; all 7 thin-output-script-graph rail tests pass; the script-graph respects D-03 maximum strip; the audio binder follows the same WS lifecycle pattern as `receiver-input-forwarder.js`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: SSR navigation URL migration (`/output?ssr=1` → `/ssr`) — TWO sites in ssr-render-host.mjs + body-marker fix in runtime-orchestration.js</name>
  <files>src/server/ssr-render-host.mjs, src/app/runtime/runtime-orchestration.js</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-04 — `?ssr=1` removed as runtime discriminator; ssr-render-host.mjs:450 migration callout in §code_context)
    - .planning/phases/phase-34/34-RESEARCH.md (Pitfall 3 — TWO migration sites at line 450 and line 824; Code Examples §SSR URL Migration)
    - src/server/ssr-render-host.mjs lines 440-460 (ssrUrl constant) and lines 815-830 (page.goto call)
    - src/app/runtime/runtime-orchestration.js lines 50-122 (data-ssr-tab marker logic — must additionally check pathname /ssr)
    - src/app/runtime/output-receiver/receiver-bootstrap.js lines 170-190 (isReceiverPath — leave as-is per RESEARCH §Pitfall 4; receiver-bootstrap is never loaded on /ssr after Task 2)
    - test/connection-stability/_harness.mjs (the harness boots the full server and consumer — verify no hardcoded /output?ssr=1 there)
  </read_first>
  <behavior>
    - Behavior 1: `ssr-render-host.mjs:launchBrowser` constructs a Chrome `--app=` URL of the form `http://127.0.0.1:${port}/ssr` (no `?ssr=1` query, no `/output` prefix).
    - Behavior 2: `ssr-render-host.mjs` `page.goto(...)` (the second navigation site, post-launch) navigates to the same `/ssr` URL.
    - Behavior 3: When the SSR tab loads `/ssr`, `runtime-orchestration.js` sets `document.body.dataset.ssrTab = "true"` (the existing marker downstream code keys off, e.g. CSS rules that hide canvas chrome on `:not([data-ssr-tab="true"])`).
    - Behavior 4: The full app at `/` (dashboard) still has NO `data-ssr-tab` marker (regression — must remain unchanged).
    - Behavior 5: Connection-stability suite still passes (verified in Task 4 — D-06 hard gate).
  </behavior>
  <action>
    Two file edits.

    **Edit 1 — `src/server/ssr-render-host.mjs` lines 450 and 824:**

    Line 450 — replace:
    ```javascript
    const ssrUrl = `http://127.0.0.1:${port}/output?ssr=1`;
    ```
    with:
    ```javascript
    // Phase 34 D-04: SSR Chromium tab navigates to /ssr (full app HTML).
    // /output is now the thin consumer route (output.html). The legacy
    // `?ssr=1` query is no longer used as a runtime discriminator —
    // runtime-env.js classifies pathname /ssr as "server-ssr" (34-B Task 1).
    const ssrUrl = `http://127.0.0.1:${port}/ssr`;
    ```

    Line 824 — replace:
    ```javascript
    await page.goto(`http://127.0.0.1:${port}/output?ssr=1`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    ```
    with:
    ```javascript
    // Phase 34 D-04: same /ssr route as the launch URL above. Two sites kept
    // in lockstep — see Pitfall 3 in 34-RESEARCH.md.
    await page.goto(`http://127.0.0.1:${port}/ssr`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    ```

    Also: update the comment block at the top of `ssr-render-host.mjs` (line ~5) where it says `http://127.0.0.1:${PORT}/output?ssr=1` — change to `http://127.0.0.1:${PORT}/ssr` so the file-header doc is not stale.

    Also: line 23 has a comment referencing the `?ssr=1` query — reword to "the SSR tab is identified at server-route level by pathname /ssr; legacy `?ssr=1` query is tolerated by runtime-env.js but no longer emitted by this module."

    Do NOT touch the Chrome flag list (lines 475-590) — that is 34-A's scope.

    **Edit 2 — `src/app/runtime/runtime-orchestration.js` lines 65-70:**

    Replace:
    ```javascript
    {
      const __ttbSearch = window.location.search || "";
      const __ttbIsSsrTab = /[?&]ssr=1(\b|&)/.test(__ttbSearch);
      if (__ttbIsSsrTab) {
        document.body.dataset.ssrTab = "true";
      }
    ```

    with:
    ```javascript
    {
      const __ttbSearch = window.location.search || "";
      const __ttbPath = window.location.pathname || "/";
      // Phase 34 D-04: SSR Chromium tab is identified by pathname /ssr.
      // The legacy ?ssr=1 query is also accepted (defense-in-depth: a stale
      // bookmark, a manual dev nav, or a partial-rollback should not strip
      // the marker) — runtime-env.js applies the same rule.
      const __ttbIsSsrTab =
        __ttbPath === "/ssr" ||
        __ttbPath.startsWith("/ssr/") ||
        /[?&]ssr=1(\b|&)/.test(__ttbSearch);
      if (__ttbIsSsrTab) {
        document.body.dataset.ssrTab = "true";
      }
    ```

    The rest of that block (lines 71-122 — `?ssr-preview=1` detection and dynamic-import of receiver-bootstrap) STAYS EXACTLY AS-IS. Reason: the dashboard preview (`/?ssr-preview=1`) and the existing dynamic-import of receiver-bootstrap on Pi /output/ both still need to work. After Task 2's `output.html` lands, `runtime-orchestration.js` will not be loaded on /output/ anymore (the thin HTML doesn't include it), so the dynamic-import branch becomes dead code on /output/ — but it remains live on the dashboard preview path. Leave it.
  </action>
  <verify>
    <automated>grep -nE '127\.0\.0\.1:\$\{port\}/ssr' src/server/ssr-render-host.mjs | wc -l | xargs -I{} test {} -ge 2 && grep -nE '/output\?ssr=1' src/server/ssr-render-host.mjs | wc -l | xargs -I{} test {} -eq 0 && grep -nE '__ttbPath\s*===\s*"/ssr"' src/app/runtime/runtime-orchestration.js | wc -l | xargs -I{} test {} -ge 1 && echo PASS</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE '127\.0\.0\.1:\$\{port\}/ssr' src/server/ssr-render-host.mjs` returns ≥ 2 (both sites updated).
    - `grep -cE '/output\?ssr=1' src/server/ssr-render-host.mjs` returns 0 (no remaining references to the old URL in this file).
    - `grep -nE '__ttbPath\s*===\s*"/ssr"' src/app/runtime/runtime-orchestration.js` returns at least one line.
    - `grep -cE 'data\.ssrTab\s*=\s*"true"' src/app/runtime/runtime-orchestration.js` returns ≥ 1 (the assignment is unchanged).
    - `grep -cE 'ssr-preview' src/app/runtime/runtime-orchestration.js` returns ≥ 1 (preview path untouched).
    - `node --test test/ssr-chromium-flags-merge.test.mjs` still passes.
    - `node --test test/phase-32-hotfix-regression.test.mjs` still passes (h9 GPU fix regression — must be preserved).
    - `node --test "test/**/*.test.mjs" 2>&1 | tail -3` reports the same FAIL count as the end of Wave 0 minus 16 (= the 16 rail-tests Tracks B Tasks 1+2 turned green).
  </acceptance_criteria>
  <done>
    SSR Chromium tab now navigates to `/ssr` at both sites; the body-marker `data-ssr-tab="true"` fires correctly on /ssr (path-based) AND keeps firing on the legacy `?ssr=1` (query-based) tolerance; no `/output?ssr=1` reference remains in `ssr-render-host.mjs`; existing regression tests stay green.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: D-06 hard-gate verification — connection-stability + live smoketest after Track B</name>
  <files>.planning/phases/phase-34/34-B-D06-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-06 hard gate language)
    - .planning/phases/phase-34/34-W0-PRECHECK.md (the baseline this task compares against)
    - .planning/phases/phase-33/33-CLOSURE.md (the 80/0 connection-stability target)
    - test/connection-stability/_harness.mjs
  </read_first>
  <what-built>
    Track B is feature-complete: route split, runtime-env classifier update, SSR URL migration, thin output.html, output-audio-binder. NO Chrome-flag changes yet (that is 34-A). The connection-stability suite must remain GREEN at this exact commit — if it regresses HERE, the URL migration broke something we missed (e.g. the harness hardcoded `/output?ssr=1`, or the receiver-bootstrap path-detection broke).
  </what-built>
  <how-to-verify>
    Run the full automated suite and the connection-stability live suite, then perform a single manual smoketest on the gaming-PC desktop browser to confirm the SSR pipeline still produces a stream end-to-end (banding may still be present — Track A fixes that).

    1. Run `node --test "test/**/*.test.mjs" 2>&1 | tail -10`. Confirm the FAIL count equals the W0-PRECHECK "after Wave 0" FAIL count minus 16 (i.e. the 16 Track-B rail tests have flipped green: 3 route-split + 2 runtime-env + 7 thin-output-script-graph + 4 chrome-flag tests are NOT covered by Track B — they remain RED until 34-A. Wait — re-check: chrome-flags rails 1-3 are 34-A territory; route-split = 3, runtime-env-pathname = 2, thin-output-script-graph = 7. Total Track-B-flipped = 12. Adjust the expected delta accordingly to -12.)
    2. Run `RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tee /tmp/34-B-d06.out | tail -15`. Confirm `# pass 80, # fail 0`.
    3. Manually open the dashboard at `http://localhost:<port>/` in the gaming-PC desktop browser. Confirm the dashboard renders (this is the unchanged path — sanity check).
    4. Manually open `http://localhost:<port>/output` in another tab. Confirm:
       - Splash "Connecting to render server…" appears briefly.
       - Then `<video>` element shows the stream from the SSR tab.
       - The Pi-local audio binder's WebSocket connection to `/api/live/ws?role=final-output` is visible in DevTools Network panel (lifetime: until tab close, with "live-mutation" frames flowing).
       - View source of the `/output` page: confirm zero `runtime-orchestration.js` / `runtime-gif-*` script tags.
    5. Manually open `http://localhost:<port>/ssr` directly (the URL the Chromium SSR tab now uses) in the desktop browser. Confirm the FULL dashboard loads (this should look identical to `/`). This proves the route-split serves index.html for /ssr.
    6. Trigger an animation that has a sound mapping. Confirm audio plays in the /output tab.

    Write findings to `.planning/phases/phase-34/34-B-D06-VERIFICATION.md` with one section per checked item, with PASS/FAIL/UNVERIFIED markers. If any item FAILs, do NOT proceed to 34-A — return to Tasks 1-3 to root-cause.
  </how-to-verify>
  <resume-signal>Type "approved — connection-stability green, manual smoketest passed" or describe specific failures with file:line references.</resume-signal>
  <action>Execute the verification steps in <how-to-verify> above. Run the listed automated commands, walk through items 3-6 in the gaming-PC desktop browser, and write findings to .planning/phases/phase-34/34-B-D06-VERIFICATION.md with PASS/FAIL/UNVERIFIED markers per item. The doc must contain at minimum: (a) all-tests run pass/fail/skip counts; (b) connection-stability live run pass/fail counts (target 80/0); (c) one section per manual smoketest item (M1=/dashboard renders, M2=/output thin behavior, M3=/ssr direct nav, M4=audio plays). Do NOT proceed to 34-A if any item FAILs — return to Tasks 1-3 for root-cause.</action>
  <verify>
    <automated>test -s .planning/phases/phase-34/34-B-D06-VERIFICATION.md && grep -cE 'PASS|FAIL|UNVERIFIED' .planning/phases/phase-34/34-B-D06-VERIFICATION.md | xargs -I{} test {} -ge 4</automated>
  </verify>
  <done>34-B-D06-VERIFICATION.md exists and records concrete results for each verification item; connection-stability suite is GREEN (80/0); operator has approved with the resume signal.</done>
</task>

</tasks>

<threat_model>
**New attack surfaces introduced by this plan:**

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-34-B-01 | Information Disclosure | new HTTP route `/ssr` returning index.html | mitigate | The full dashboard HTML is already served at `/`. `/ssr` is the same bytes; no new disclosure. The role-based localhost-only restriction at `ssr-webrtc-signaling.mjs:269` (which gates `?role=ssr-tab` WS connections to `127.0.0.1`) is the real ACL — it is unchanged by this plan. The `/ssr` HTTP route itself does not need a localhost-only HTTP guard because the HTML is already public at `/`. Document this in the inline comment of resolveStaticPath (Task 1 action wording does so). |
| T-34-B-02 | Spoofing / DoS | new HTTP route `/output` returning output.html | accept | Same content category as the previous /output → index.html mapping. No new authentication surface. No user input handling on the page (receiver-bootstrap and output-audio-binder are passive consumers of WS data). The role-based ACL on the WebSocket signaling layer is unchanged. |
| T-34-B-03 | Tampering | output-audio-binder consumes live-mutation envelopes | mitigate | The binder ONLY plays audio (HTMLAudioElement) — no eval, no DOM injection, no fetch. The `animation.sound` field is fed directly to `new Audio(path)`, which is bounded to URL semantics. A malicious `sound` value of e.g. `javascript:alert(1)` is not exploitable via Audio(). Same trust model as the existing receiver-input-forwarder which trusts the same WS. |
| T-34-B-04 | XSS / path-traversal in resolveStaticPath | server.mjs:resolveStaticPath | accept | The new `/ssr` and `/output` branches return a hardcoded `path.join(ROOT_DIR, "index.html")` / `path.join(ROOT_DIR, "output.html")`. No user input flows into these paths. The `toSafePath` fallback for everything else is unchanged. |
| T-34-B-05 | Removed `?ssr=1` query — orphaned ACL | runtime-env.js, runtime-orchestration.js | mitigate | The legacy `?ssr=1` query is RETAINED as a quiet tolerance in both modules — no code path that previously gated on `?ssr=1` is broken. No ACL was attached to `?ssr=1` (the localhost-only restriction is role-based at the WS layer, not URL-based). Documented in code comments. |

`security_enforcement` is enabled (default). All threats classified; mitigations spelled out in code comments and acceptance criteria.
</threat_model>

<verification>
- All 12 Track-B Wave-0 rail tests pass: route-split (4 GREEN, of which 3 were RED at end of Wave 0), runtime-env (5 GREEN, of which 2 were RED), thin-output-script-graph (7 GREEN, all 7 were RED).
- `output.html` exists and contains 0 of the forbidden script names.
- `output-audio-binder.js` exists and exports `bootOutputAudioBinder`.
- Both URL migration sites in `ssr-render-host.mjs` use `/ssr` (no `?ssr=1` references remain in that file).
- `runtime-orchestration.js` sets `data-ssr-tab="true"` for path `/ssr` and the legacy `?ssr=1`.
- `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 80 PASS / 0 FAIL.
- Manual smoketest at Task 4 passes.
</verification>

<success_criteria>
Plan 34-B is complete when:
- Route split is live: GET /ssr returns index.html, GET /output and GET /output/final return output.html.
- runtime-env classifier returns "server-ssr" for path /ssr (and /ssr/sub).
- SSR Chromium tab navigates to /ssr at both ssr-render-host.mjs:450 and :824.
- output.html and output-audio-binder.js exist; output.html contains no render-pipeline scripts.
- 12 Wave-0 Track-B rail tests are GREEN.
- Connection-stability suite is GREEN (80/0).
- Manual smoketest of /output, /ssr, and /(dashboard) confirms each route serves the correct page.
- D-06 hard-gate verification doc is written.
</success_criteria>

<output>
After completion, create `.planning/phases/phase-34/34-B-SUMMARY.md` with:
- Files modified (server.mjs, runtime-env.js, runtime-orchestration.js, ssr-render-host.mjs)
- Files created (output.html, output-audio-binder.js)
- Wave-0 rail-test transition (RED → GREEN: 12 tests; remaining RED for 34-A: 4 tests)
- D-06 hard-gate status (PASS / FAIL with explicit numbers)
- Hand-off note to 34-A: "Track-A scope is now: GL-flag gating decoupling (3 chrome-flag rail tests), 2D-fallback ban on /ssr only, render-mode probe sink (1 render-mode-probe rail test), force renderMode='gl' on /ssr. The URL migration is done; runtime-env returns 'server-ssr' for /ssr; the gl-renderer's permanent-disable threshold is therefore correctly skipped on /ssr."
</output>
