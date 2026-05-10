# Phase 34: SSR Render-Quality + /output/ Thin-Consumer Refactor — Research

**Researched:** 2026-05-10
**Domain:** WebGL forcing under Xvfb + Mesa llvmpipe; server-side route split; thin HTML entry point
**Confidence:** HIGH (all critical findings verified by direct codebase inspection; no external search needed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Probe + Force in parallel — BOTH a diagnostic renderer-detection probe AND explicit GL-forcing land in the same plan. Probe is non-negotiable.
- **D-02:** SSR-tab forbids 2D-Canvas fallback on `/ssr` route ONLY. Phase 30 B2 h10 stays for dashboard + Pi `/output/`.
- **D-03:** Maximum strip — separate HTML entry point for `/output/`, no shared code with `index.html`.
- **D-04:** Server-side path split: `/output/` = thin consumer (new `output.html`), NEW `/ssr` = full app SSR-tab. The `?ssr=1` query param is REMOVED as a runtime discriminator.
- **D-05:** Verification = `__ttBeamerEffectiveRenderMode()` returns `"webgl"` or `"webgl2"` inside SSR-tab + manual visual smoketest. Pixel-diff REJECTED.
- **D-06:** Connection-stability regression hard gate. `test/connection-stability/**` must stay green. VAAPI default-disabled UNCHANGED.
- **D-07:** Plans 34-A and 34-B can run parallel or sequential — planner judges.

### Claude's Discretion
- Chrome GPU-init flag set for GL-forcing (must work under Xvfb + Mesa llvmpipe + Raptor Lake-P iGPU, VAAPI default-disabled)
- Renderer-detection probe implementation (CDP from Node? in-page script? both?)
- Exact name/path of new thin HTML file (`output.html` at repo root)
- Whether to keep `?ssr=1` as deprecation-redirect for one phase or hard-cut
- Live-sync WebSocket "minimal subset" for audio-binders in thin `/output/` HTML

### Deferred Ideas (OUT OF SCOPE)
- Pi-hardware visual UAT
- VAAPI re-enable investigation
- Pixel-diff visual regression suite
- Pi `/output/` render-mode policy review
- Live-sync WebSocket protocol slim-down as separate phase
</user_constraints>

---

## Summary

Phase 34 has two tracks with distinct but adjacent surface areas. Both tracks are understood at high confidence from direct codebase inspection; no external documentation lookup was needed.

**Track A (GL Fix):** The SSR-tab's 2D fallback is governed by `runtime-projection-gl-renderer.js` which reads `getRuntimeEnvironment()` to decide whether to permanently-disable GL after 3 context losses. `getRuntimeEnvironment()` currently identifies the SSR tab by `?ssr=1` in the URL. After D-04 migrates the SSR tab to `/ssr` (no query param), this detection chain breaks — the SSR tab will be classified as `"desktop"` instead of `"server-ssr"`. This is the single most important cascading consequence of Track B in Track A's territory.

The root cause of the GL→2D fallback is likely a combination of: (1) `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` are currently gated behind `hasIgpu`, which is tied to `SSR_ENABLE_VAAPI === "1"`. With VAAPI default-disabled (Phase 33), these flags are NEVER added to Chrome args. (2) `getRuntimeEnvironment()` will misclassify the SSR tab after the URL change unless `runtime-env.js` is updated to detect `/ssr` pathname.

**Track B (Thin Consumer):** The server already has a `resolveStaticPath()` function that maps both `/output/final` and `/output` to `index.html`. Adding `/ssr` and making `/output` return `output.html` is a single-function edit. The receiver stack (`receiver-bootstrap.js` + its three imports) uses NO `window.TT_BEAMER_*` globals from `runtime-orchestration.js`. The minimum script set for `output.html` is deterministic. The audio binder dependency on the live-sync WebSocket is deep (audio triggers flow through `applyLiveRuntimeSnapshot` inside the full live-sync-core pipeline), but the CONTEXT.md D-03 note says to include a "minimal subset" — the practical answer is to wire a lightweight `/api/live/ws` subscriber inside the thin path that calls `playSoundForAnimation` directly.

**Primary recommendation:** Deliver Track B first (path split + thin HTML) because it resolves the URL-detection issue that Track A depends on. Track A then forces GL on the correctly-identified `/ssr` route.

---

## Standard Stack

No new libraries needed. All tooling is Node.js built-in + existing project dependencies.

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js `node:http` (plain, no Express) | v24.13.1 (confirmed) | Server routing — `server.mjs` uses raw `createServer()` |
| Chromium (snap) | 147.0.7727.116 (confirmed on machine) | SSR-tab browser. NOT the bundled puppeteer binary |
| Xvfb + ANGLE/Mesa llvmpipe | system | GL rendering path under headful Chrome |
| Playwright / puppeteer-stream | existing | CDP probe delivery mechanism |

---

## Architecture Patterns

### Track B: Server Route Split (resolveStaticPath)

The server uses a plain Node.js `createServer()` with a manual request handler. Routes are matched in-order in a single `async (req, res) => {}` handler. Static file serving goes through `resolveStaticPath(urlValue, routePath)` at `server.mjs:3444`.

**Current logic:**
```javascript
// server.mjs:3444-3449
function resolveStaticPath(urlValue, routePath) {
  if (routePath === "/output/final" || routePath === "/output") {
    return path.join(ROOT_DIR, "index.html");
  }
  return toSafePath(urlValue || "/");
}
```

**Phase 34 target:**
```javascript
function resolveStaticPath(urlValue, routePath) {
  if (routePath === "/ssr") {
    return path.join(ROOT_DIR, "index.html");  // full app for SSR tab
  }
  if (routePath === "/output/final" || routePath === "/output") {
    return path.join(ROOT_DIR, "output.html"); // thin consumer
  }
  return toSafePath(urlValue || "/");
}
```

`normalizeRoutePath()` strips query strings (`?ssr=1` etc.) and trailing slashes, so this works for both `/output` and `/output/` [VERIFIED: server.mjs:2243-2251].

### Track A: GL-Force Flag Architecture

Chrome is launched at `ssr-render-host.mjs:launchBrowser()`. The flag list is built at `src/server/ssr-render-host.mjs:505-594`. Critically:

1. `--use-gl=angle --use-angle=default` is ALWAYS present (h9 fix, Phase 32). This is correct.
2. `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` are ONLY added when `hasIgpu === true`.
3. `hasIgpu` is computed as `process.env.SSR_ENABLE_VAAPI === "1" && existsSync("/dev/dri/renderD128")`.
4. **With VAAPI default-disabled (Phase 33), `hasIgpu` is always `false`. These two critical flags are never added to Chrome args.** [VERIFIED: ssr-render-host.mjs:492-494, 590]

The fix: decouple `hasIgpu` (used for VAAPI features) from the unconditional iGPU GL flags. On the `/ssr` path, `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` should be added whenever an iGPU DRI device is present, regardless of VAAPI opt-in.

### Track A: Runtime-Env Detection Migration (Critical Cascade)

`getRuntimeEnvironment()` in `src/app/lib/shared/runtime-env.js:50-69` currently detects the SSR tab by checking for `?ssr=1` in the URL. It returns `"server-ssr"` if found. This return value is read by:

- `runtime-projection-gl-renderer.js:155-156` — decides whether to permanently disable GL after 3 context losses. If `"server-ssr"`, GL is never permanently disabled (infinite retry). If `"desktop"` or `"pi"`, the 3-loss threshold kills GL forever.
- `runtime-gif-playback.js:155` — GIF render path gating.

After D-04 migrates the SSR tab to `/ssr`, `getRuntimeEnvironment()` will return `"desktop"` for the SSR tab (it's on localhost, no ARM UA, no `?ssr=1`). The GL renderer will then permanently disable GL after 3 context losses — the exact fallback D-02 forbids.

**Migration required in `runtime-env.js`:**
```javascript
// Before:
const isSsr = /[?&]ssr=1(\b|&)/.test(search);

// After:
const isSsr = /[?&]ssr=1(\b|&)/.test(search) || pathname === "/ssr" || pathname.startsWith("/ssr/");
```

Simultaneously, `runtime-orchestration.js:67-69` sets `document.body.dataset.ssrTab = "true"` based on the old `?ssr=1` detection. This must be updated to also detect `/ssr` pathname. [VERIFIED: runtime-orchestration.js:65-69]

**Full audit of all `?ssr=1` detection sites requiring migration:**

| File | Line | What | Migration needed |
|------|------|------|-----------------|
| `src/app/lib/shared/runtime-env.js` | 62 | `getRuntimeEnvironment()` — classifies tab as `"server-ssr"` | Add `/ssr` pathname check |
| `src/app/runtime/runtime-orchestration.js` | 67 | Sets `document.body.dataset.ssrTab = "true"` | Add `/ssr` pathname check |
| `src/app/runtime/output-receiver/receiver-bootstrap.js` | 185 | `isReceiverPath()` — refuses to boot receiver if `?ssr=1` | After Track B, receiver-bootstrap.js is NOT loaded on `/ssr` (separate HTML), so this is moot — but code should be updated to also exclude `/ssr` for correctness |
| `src/server/ssr-render-host.mjs` | 450, 824 | `ssrUrl` constant — navigates Chrome to `/output?ssr=1` | Change to `/ssr` |

**`?ssr-preview=1` stays unchanged** — only the SSR tab URL changes. [VERIFIED: runtime-orchestration.js:78]

### Track B: Minimum Script Set for output.html

The receiver stack imports are clean — zero `window.TT_BEAMER_*` globals from the render pipeline:

- `receiver-bootstrap.js` — uses `window.sessionStorage`, `window.fetch`, `window.location`, `window.performance`. No `TT_BEAMER_*` globals.
- `receiver-webrtc-client.js` — uses `window.mediasoupClient` (dynamically loaded from `/vendor/mediasoup-client.min.js`). No `TT_BEAMER_*` globals.
- `receiver-status-ui.js` — pure DOM + localStorage. No `TT_BEAMER_*` globals.
- `receiver-input-forwarder.js` — opens its own `WebSocket` to `/api/live/ws?role=final-output-input`. No `TT_BEAMER_*` globals.
[VERIFIED: grep of all TT_BEAMER_ references in output-receiver/ found zero]

**output.html minimum script set:**
```html
<!-- Required: runtime-env for role detection -->
<script src="/src/app/lib/shared/runtime-env.js" defer></script>

<!-- Required: receiver stack -->
<script src="/src/app/runtime/output-receiver/receiver-bootstrap.js" type="module"></script>

<!-- Required for audio: a thin live-sync subscriber -->
<!-- See "Audio Binder Coupling" section below -->

<!-- Optional: diagnostic chip inline script (from index.html:1011-1086) -->
```

**What NOT to include in output.html (the strip):**
- All `TT_BEAMER_CONFIG`, `TT_BEAMER_ROOMS`, `TT_BEAMER_LOGGER`, etc. script tags
- All render pipeline: `runtime-gif-decoder.js`, `runtime-gif-playback.js`, `runtime-outside-mp4.js`, `runtime-draw-loop*.js`, `runtime-animation-lifecycle.js`
- All viewport/projection: `runtime-projection-gl-renderer.js`, `runtime-projection-mapping.js`, `runtime-stage-viewport.js`
- `runtime-orchestration.js` and its ctx-builder — the entire 200+ script chain
- All dashboard UI: animation editor, room management, fx panels, etc.

The DOM structure for `output.html` needs: `#ssr-splash`, `#ssr-video`, `#ssr-reconnect-banner`, `#ssr-error-overlay`, `#output-status-chip`, and the align-mode overlay div (for `receiver-input-forwarder.js`). These are all in `index.html:56-73` and `index.html:209` [VERIFIED].

### Track B: Audio Binder Coupling (Assumption A3 Verification)

**Finding: A3 is FALSE in its strong form.** The Pi-local audio does NOT flow through a standalone "thin" WebSocket. Audio triggers arrive via the full `applyLiveRuntimeSnapshot()` pipeline inside `runtime-live-sync-core.js`. At `runtime-live-sync-core.js:747`, `ctx.playSoundForAnimation(animation)` is called for each `state.runningAnimations` entry after every snapshot apply. `ctx.playSoundForAnimation` is from `TT_BEAMER_RUNTIME_AUDIO` which requires the full audio subsystem.

**Practical resolution for D-03:** The thin `/output/` HTML needs its own minimal live-sync subscriber. The planner must scope this as: a new `output-audio-binder.js` (or inline in `output.html`) that:
1. Opens `WebSocket` to `/api/live/ws?role=final-output`
2. On `live-mutation` messages where `mutationType` is `start-animation` or `stop-animation`/`clear-all`, calls `window.Audio` or a simpler audio API directly
3. Does NOT need the full state machine, polygon hydration, or snapshot diffing

This is a new module, not an extract from existing live-sync-core. The complexity is low — audio triggers are a small subset of live-sync traffic. The `sound` field on animations drives `EVENT_SOUND_ASSETS` lookup which is in `TT_BEAMER_CONFIG`. For the thin path, the operator can also choose to include only `config.js` (the config globals) + a minimal audio player.

**Planner decision required:** D-03 says "Pi-local audio binders" must be present. The scope note says "minimal subset". Given the tight coupling, options are:
1. Include `config.js` + `runtime-audio.js` + a thin 50-line WS listener that calls `playSoundForAnimation()`. Adds ~3 script tags.
2. Defer audio to the next phase if it requires the full live-sync core (which contradicts D-03's intent).
3. Hard-code audio element pool with direct WS message routing (new code, clean).

Option 3 is the most consistent with D-03's "maximum strip" philosophy. The planner should scope output-audio-binder.js as a new small module (~80 lines).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Chrome GPU debugging | Separate debug tool | CDP `Runtime.evaluate` from existing `page` object in `ssr-render-host.mjs` |
| Render mode probe | New probe mechanism | Extend existing `ssr-stats` envelope (`ssr-stream-publisher.mjs:404-418`) — it already calls `__ttBeamerEffectiveRenderMode()` |
| WebSocket reconnect in thin audio binder | Custom reconnect logic | Copy pattern from `receiver-input-forwarder.js:55-90` (same role, same endpoint shape) |
| Route matching in server.mjs | Express-style router | Keep the existing `resolveStaticPath()` function pattern — one additional `if` |

---

## Common Pitfalls

### Pitfall 1: `hasIgpu` is VAAPI-gated — GL flags silently absent
**What goes wrong:** With `SSR_ENABLE_VAAPI` unset (the default), `hasIgpu = false`. Neither `--ignore-gpu-blocklist` nor `--enable-gpu-rasterization` is added to Chrome args. Chrome falls back to 2D canvas for mesh-warp.
**Root cause:** The variable name `hasIgpu` was overloaded to mean "VAAPI available" in Phase 33 iter-4c. But the iGPU DRI device presence is relevant for GL too, independent of VAAPI.
**Prevention:** Introduce `hasIgpuDev` (checks `/dev/dri/renderD128` only, not env var) separately from `hasVaapiEnabled` (existing `hasIgpu`). Add `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` unconditionally when `hasIgpuDev` is true.
[VERIFIED: ssr-render-host.mjs:492-494]

### Pitfall 2: `getRuntimeEnvironment()` misclassifies SSR tab after URL migration
**What goes wrong:** After D-04 changes the SSR tab URL from `/output?ssr=1` to `/ssr`, `getRuntimeEnvironment()` returns `"desktop"` instead of `"server-ssr"`. The GL renderer then permanently disables GL after 3 context losses (the exact behavior D-02 forbids).
**Root cause:** SSR-tab detection in `runtime-env.js` is query-param-based, not path-based.
**Prevention:** Update `getRuntimeEnvironment()` to return `"server-ssr"` for `pathname === "/ssr"`. Update `runtime-orchestration.js:67` to also set `data-ssr-tab="true"` for `/ssr`.
[VERIFIED: runtime-env.js:62-67; runtime-projection-gl-renderer.js:155-156]

### Pitfall 3: `page.goto()` URL also at line 824 — two migration sites in ssr-render-host.mjs
**What goes wrong:** Line 450 (`ssrUrl` constant) and line 824 (`page.goto(...)`) both hardcode `/output?ssr=1`. Changing only one leaves the other as a bug.
**Prevention:** Both must be updated to `/ssr` in the same commit. The comment at line 5 in the file header is documentation-only.
[VERIFIED: ssr-render-host.mjs:450, 824]

### Pitfall 4: `isReceiverPath()` in receiver-bootstrap.js excludes `/ssr` only via `?ssr=1`
**What goes wrong:** `isReceiverPath()` currently returns `false` if `?ssr=1` is in the search string. After the migration, the function is no longer called on `/ssr` (it's a separate HTML entry point), so this is actually a non-issue for the runtime. But the function and its test (`test/ssr-receiver-disconnect-detection.test.mjs:145`) will have stale logic. Leave a documented note; don't need to change the test since it tests old behavior for regression coverage.
[VERIFIED: receiver-bootstrap.js:185; test file at line 145-146]

### Pitfall 5: `ssr-webrtc-signaling.mjs` localhost restriction is role-based, not URL-based
**Good news:** This was already verified. The signaling layer restricts `role=ssr-tab` to localhost connections regardless of what URL the browser loaded [VERIFIED: ssr-webrtc-signaling.mjs:266-272]. The `/ssr` URL change does NOT require changes to signaling.

### Pitfall 6: `output.html` output-status-chip needs its own rAF/metrics scripts
**What goes wrong:** The diagnostic chip code (fps, render-mode, canvas size) is an inline `<script>` in `index.html:1011-1086`. It references `window.__ttBeamerEffectiveRenderMode` and `window.__ttBeamerStateProbe`, which come from `runtime-orchestration.js`. In the thin `output.html`, those globals won't exist.
**Prevention:** For `output.html`, the chip only needs fps + video dimensions (no render-mode). Replace the chip script with a thin version that only tracks rAF fps and reports `<video>` dimensions. The `output-status-chip` DOM structure itself is reusable.

### Pitfall 7: `/output/final` must also serve `output.html` (or redirect)
**What goes wrong:** `resolveStaticPath()` maps both `/output/final` and `/output` to `index.html`. `runtime-env.js:11-15` treats `/output/final` as `OUTPUT_ROLE_FINAL`. If `/output/final` is forgotten in the Track B update, it returns `index.html` instead of `output.html`.
**Prevention:** Update `resolveStaticPath()` to cover both `/output/final` and `/output`.
[VERIFIED: server.mjs:3445; runtime-env.js:11-15]

---

## Code Examples

### Render Mode Probe (D-01 implementation basis)
```javascript
// Source: ssr-stream-publisher.mjs:404-418 (existing ssr-stats envelope)
// The probe already runs every 1s inside the SSR tab. Extend it:
try {
  const m = window.__ttBeamerEffectiveRenderMode;
  if (typeof m === "function") {
    const v = m();
    if (typeof v === "string") out.renderMode = v.slice(0, 60);
  }
} catch {}
// The ssr-stats message is sent via WebSocket to the server,
// which already logs it: [ssr-signal] msg.type === "ssr-stats" handler.
// For D-01 probe: add periodic logging of out.renderMode to server stdout.
```

### `__ttBeamerEffectiveRenderMode` API (D-05 assertion target)
```javascript
// Source: runtime-orchestration.js:447-461
window.__ttBeamerEffectiveRenderMode = () => {
  const configured = state?.renderMode ?? "auto";
  if (configured === "2d") return "2d";
  const glRenderer = window.TT_BEAMER_RUNTIME_PROJECTION_GL_RENDERER;
  const glDisabled = glRenderer?.isGlPermanentlyDisabled?.() === true;
  const lossCount = Number(glRenderer?.getGlContextLossCount?.() || 0);
  if (glDisabled) {
    return configured === "gl" ? "gl→2d (gl-disabled)" : "auto→2d (gl-disabled)";
  }
  if (lossCount > 0) {
    const suffix = `2d (loss x${lossCount})`;
    return configured === "gl" ? `gl→${suffix}` : `auto→${suffix}`;
  }
  return configured;
};
// Returns: "webgl"/"webgl2"/"auto"/"gl"/"2d"/"auto→2d (gl-disabled)"/"gl→2d (loss x3)"
// D-05 gate: returns "webgl" or "webgl2" (not a string containing "2d")
// Note: "auto" means configured mode auto, which may still be webgl — 
// the GL renderer's "configured" value comes from state.renderMode (user's setting).
// If configured = "auto" and GL is working: returns "auto" (not "webgl"/"webgl2").
// D-05 planner note: the probe itself may need `state.renderMode = "gl"` forced 
// on /ssr to ensure the return value clearly indicates WebGL is active.
```

### Chrome Flag Fix (decouple hasIgpu from VAAPI)
```javascript
// Current (ssr-render-host.mjs:492-494) — VAAPI-gated:
const hasIgpu =
  process.env.SSR_ENABLE_VAAPI === "1" &&
  (existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129"));

// Phase 34 target — separate concerns:
const hasIgpuDev =
  existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129");
const hasVaapiEnabled =
  process.env.SSR_ENABLE_VAAPI === "1" && hasIgpuDev;

// enabledFeatures uses hasVaapiEnabled:
const enabledFeatures = [
  ...(hasVaapiEnabled ? ["VaapiVideoEncoder","VaapiVideoDecoder","VaapiIgnoreDriverChecks"] : []),
  // ... rest unchanged
];

// Chrome args use hasIgpuDev for GL flags:
...(hasIgpuDev ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
```

### Server Route Update (Track B)
```javascript
// server.mjs:3444 — resolveStaticPath
function resolveStaticPath(urlValue, routePath) {
  if (routePath === "/ssr") {
    // SSR Chromium tab — full app
    return path.join(ROOT_DIR, "index.html");
  }
  if (routePath === "/output/final" || routePath === "/output") {
    // Pi thin consumer — new output.html
    return path.join(ROOT_DIR, "output.html");
  }
  return toSafePath(urlValue || "/");
}
```

### runtime-env.js SSR Detection Update (Track B cascade)
```javascript
// src/app/lib/shared/runtime-env.js:62
// Before:
const isSsr = /[?&]ssr=1(\b|&)/.test(search);
// After:
const isSsr = /[?&]ssr=1(\b|&)/.test(search)
  || pathname === "/ssr"
  || pathname.startsWith("/ssr/");
```

### SSR URL Migration (ssr-render-host.mjs — TWO sites)
```javascript
// Site 1: ssr-render-host.mjs:450
const ssrUrl = `http://127.0.0.1:${port}/ssr`;  // was: /output?ssr=1

// Site 2: ssr-render-host.mjs:824
await page.goto(`http://127.0.0.1:${port}/ssr`, {  // was: /output?ssr=1
  waitUntil: "domcontentloaded",
  timeout: 30_000,
});
```

### Deprecation Redirect (Claude's Discretion — low-cost option)
```javascript
// In server.mjs request handler, before static file serving:
// Handles the ?ssr=1 legacy URL for one phase
if (req.method === "GET" && routePath === "/output" &&
    (new URL(req.url || "/", "http://localhost")).searchParams.get("ssr") === "1") {
  res.writeHead(302, { Location: "/ssr" });
  res.end();
  return;
}
```

---

## Open Questions

1. **Does `__ttBeamerEffectiveRenderMode()` return `"webgl"` or `"auto"` when GL is working?**
   - What we know: returns `configured` (from `state.renderMode`) when GL is working. Default `state.renderMode` is `"auto"`, not explicitly `"webgl"`.
   - What's unclear: if the user hasn't set `renderMode = "gl"` in settings, the probe returns `"auto"` even when WebGL2 is active. This would fail D-05's assertion of `"webgl"` or `"webgl2"`.
   - Recommendation: The D-05 probe for the `/ssr` route should force `state.renderMode = "webgl2"` on the SSR-tab path (gated on `data-ssr-tab="true"`), OR the acceptance gate should be changed to "does NOT contain '2d'" rather than "equals webgl/webgl2".

2. **Does the `webglRenderer` probe (ssr-stream-publisher.mjs:376-395) reliably return a non-empty string under Mesa llvmpipe?**
   - What we know: it calls `c.getContext("webgl2") || c.getContext("webgl")` on a new canvas and reads `UNMASKED_RENDERER_WEBGL`. Mesa llvmpipe should report something like `"llvmpipe (LLVM 14.0.0, 256 bits)"`.
   - What's unclear: whether `WEBGL_debug_renderer_info` is available in the Chrome ANGLE/Mesa path without `--enable-webgl-draft-extensions`.
   - Recommendation: planner adds `--enable-webgl-draft-extensions` to Chrome flags as a test flag; log the webglRenderer string in the probe output to verify.

3. **Is there a deprecation redirect needed for `?ssr=1`?**
   - What we know: the only consumer of `/output?ssr=1` is `ssr-render-host.mjs` (server-controlled). No Pi browser navigates to `?ssr=1`.
   - Recommendation: Hard-cut is safe. No redirect needed. Update both sites in `ssr-render-host.mjs` and remove the `?ssr=1` discriminator from `runtime-orchestration.js`. The `isReceiverPath()` function in `receiver-bootstrap.js` is only called when the full app boots — after Track B, it's only called from `index.html` which doesn't have `/ssr` in its URL, so the old logic is safe-by-non-execution.

4. **Can `--enable-webgl` flag help on this hardware?**
   - What we know: `--use-gl=angle --use-angle=default` is already present. `--enable-webgl` is a Chrome feature flag that enables the WebGL API — but it's enabled by default in Chrome. Adding it would be redundant but harmless.
   - Recommendation: Do not add `--enable-webgl` as a standalone flag. The actual gap is `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` being absent (see Pitfall 1).

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` |
| Config file | none — invoked directly |
| Quick run command | `node --test "test/**/*.test.mjs"` |
| Full suite command | `node --test "test/**/*.test.mjs"` |
| Live tests | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` |

### Phase 34 Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| A-01 | `resolveStaticPath("/ssr")` returns `index.html` path | unit | `node --test "test/phase-34-route-split.test.mjs"` (Wave 0 gap) |
| A-02 | `resolveStaticPath("/output")` returns `output.html` path | unit | same file |
| A-03 | `normalizeRoutePath("/output?ssr=1")` strips query to `/output` | unit | existing test (no change needed — behavior unchanged) |
| A-04 | `getRuntimeEnvironment({pathname: "/ssr"})` returns `"server-ssr"` | unit | `node --test "test/phase-34-runtime-env.test.mjs"` (Wave 0 gap) |
| A-05 | `getRuntimeEnvironment({pathname: "/output", search: ""})` returns `"pi"` | unit | same file (regression — must still pass) |
| A-06 | Chrome args include `--ignore-gpu-blocklist` when `/dev/dri/renderD128` exists, regardless of `SSR_ENABLE_VAAPI` | unit | `node --test "test/phase-34-chrome-flags.test.mjs"` (Wave 0 gap) |
| A-07 | `__ttBeamerEffectiveRenderMode()` returns value not containing `"2d"` on `/ssr` tab after GL force | manual-only | Captured in `34-HUMAN-UAT.md` — requires live SSR tab |
| B-01 | D-06 gate: connection-stability suite stays green | live integration | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` |
| B-02 | `isReceiverPath({pathname: "/output", search: ""})` returns `true` | regression (existing test, line 142) | `node --test "test/ssr-receiver-disconnect-detection.test.mjs"` |

### Regression Tests That Must Stay Green (D-06)

These test files must not be modified and must pass after every commit:
- `test/connection-stability/*.test.mjs` (10 files, 80 tests)
- `test/ssr-receiver-disconnect-detection.test.mjs` (existing tests for `isReceiverPath` — behavior unchanged since output.html means receiver-bootstrap.js never runs on `/ssr`)
- `test/phase-32-hotfix-regression.test.mjs` (h9 GPU fix regression — Chrome flag h9 is unchanged)
- `test/phase-32-xvfb-fakescreenfps.test.mjs` (`getXvfbArgs` unchanged)

### Wave 0 Gaps

- [ ] `test/phase-34-route-split.test.mjs` — unit tests for `resolveStaticPath` with `/ssr`, `/output`, `/output/final` routing (REQ A-01, A-02)
- [ ] `test/phase-34-runtime-env.test.mjs` — unit tests for `getRuntimeEnvironment` with `/ssr` pathname (REQ A-04)
- [ ] `test/phase-34-chrome-flags.test.mjs` — unit test: when `SSR_ENABLE_VAAPI=0` but iGPU DRI exists, Chrome args include `--ignore-gpu-blocklist` (REQ A-06). Uses `getXvfbArgs`-style exported helper or `launchBrowser` arg inspection.

### Sampling Rate

- **Per task commit:** `node --test "test/**/*.test.mjs"`
- **Per wave merge (Track A or B individually):** `node --test "test/**/*.test.mjs"` + `RUN_LIVE_TESTS=1 node --test test/connection-stability/`
- **Phase gate:** Full suite green + D-05 manual probe passes before `/gsd-verify-work`

---

## Security Domain

Track B (thin HTML) does not introduce new authentication surfaces. The thin `/output/` page has no forms, no credential handling, and no server mutations. The existing `receiver-input-forwarder.js` WS-based align-mode drag forwarding is already validated server-side (`server.mjs:validateAlignCornerDragPayload`).

| ASVS Category | Applies | Control |
|---------------|---------|---------|
| V5 Input Validation | Yes — `resolveStaticPath` path traversal guard | Existing `toSafePath()` + `startsWith(ROOT_DIR)` check. The `/ssr` → `index.html` mapping bypasses `toSafePath` by direct `path.join`, which is safe (no user input). |
| V4 Access Control | Partial — `/ssr` route should be localhost-only | `ssr-webrtc-signaling.mjs` already restricts the `ssr-tab` WebSocket role to localhost [VERIFIED: line 269]. The HTTP route for `/ssr` currently has no restriction. Planner may want to add localhost-only check for the `/ssr` HTML response (defense-in-depth). |
| V3 Session | No | n/a |
| V2 Auth | No | n/a |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server code | Yes | v24.13.1 | — |
| Chromium | SSR tab | Yes | 147.0.7727.116 (snap) | — |
| `/dev/dri/renderD128` | `hasIgpuDev` flag detection | Unknown — not verified on target server | — | Flag not added (software ANGLE path still works, GL may or may not init) |
| Xvfb | SSR tab headful browser | Yes (assumed from Phase 33) | system | — |

The presence of `/dev/dri/renderD128` was not verified in this research session. The GL flag fix still helps even if the device is absent (Chrome will skip `--ignore-gpu-blocklist` in that case), but the primary assumption A1 (GL is recoverable with explicit forcing) depends on whether ANGLE can reach the iGPU or falls through to llvmpipe.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `/dev/dri/renderD128` exists on the Lenovo IdeaCentre Mini server | Environment Availability | If absent, `hasIgpuDev` = false and the GL flags are still not added — Chrome uses software ANGLE (llvmpipe). GL may still work via software but banding might persist for different reasons. |
| A2 | The "banding in solid-color animations" is caused by 2D-canvas rendering, not by the stream encoding | Track A summary | If banding is an H264 encoder artifact (not a render mode issue), forcing GL won't fix it. The D-01 probe is the safeguard — render mode will be logged. |
| A3 | Chromium 147 (snap) behaves the same as Chrome 131 regarding `--use-gl=angle` behavior | Track A flags | The project uses the system snap Chromium (147), not the puppeteer bundled binary (131). The h9 fix was developed for Chrome 131. Under Chrome 147, the `--use-angle=default` behavior should be the same but is not verified for this build. |

---

## Sources

### Primary (HIGH confidence — all verified by direct file inspection)
- `src/server/ssr-render-host.mjs` — full Chrome arg list, `hasIgpu` gating, URL constants (lines 450, 492-494, 590, 824)
- `src/app/lib/shared/runtime-env.js` — `getRuntimeEnvironment()` detection chain (lines 62-67)
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js` — `_glPermanentlyDisabled` threshold and SSR-tab exemption (lines 153-183)
- `src/app/runtime/runtime-orchestration.js` — `data-ssr-tab` setter (lines 67-69), `__ttBeamerEffectiveRenderMode` API (lines 447-461)
- `server.mjs` — `resolveStaticPath()` routing (lines 3444-3449), `normalizeRoutePath()` (lines 2243-2251)
- `src/server/ssr-webrtc-signaling.mjs` — localhost restriction is role-based not URL-based (lines 266-272)
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — zero `TT_BEAMER_*` globals confirmed (full file scan)
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — audio triggers at line 747 via full `applyLiveRuntimeSnapshot` pipeline
- `index.html:56-73, 209, 991-1191` — receiver DOM elements, output-status-chip, full script load list
- `test/connection-stability/_harness.mjs` — test suite structure; no hardcoded `/output?ssr=1` URL in harness

### Metadata

**Confidence breakdown:**
- Track A GL flags: HIGH — code read directly, logic chain verified
- Track A runtime-env migration: HIGH — detection code is explicit, migration sites enumerated
- Track B route split: HIGH — `resolveStaticPath` is a simple 5-line function
- Track B script minimum set: HIGH — zero `TT_BEAMER_*` globals in receiver stack confirmed by grep
- Track B audio coupling: HIGH — pipeline verified to go through full `applyLiveRuntimeSnapshot`
- Assumptions A1-A3: LOW — runtime environment facts not verified in this session

**Research date:** 2026-05-10
**Valid until:** Stable — this is all first-party code analysis
