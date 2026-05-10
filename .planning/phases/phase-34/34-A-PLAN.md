---
phase: 34
plan: A
type: execute
wave: 3
depends_on: [W0, B]
files_modified:
  - src/server/ssr-render-host.mjs
  - src/server/ssr-webrtc-signaling.mjs
  - src/app/runtime/runtime-orchestration.js
  - src/app/runtime/viewport/runtime-projection-gl-renderer.js
autonomous: false
requirements: []
must_haves:
  truths:
    - "Chrome args from ssr-render-host.mjs include --ignore-gpu-blocklist and --enable-gpu-rasterization whenever /dev/dri/renderD128 (or renderD129) exists, regardless of SSR_ENABLE_VAAPI value."
    - "VAAPI feature gating in --enable-features=VaapiVideoEncoder,... is unchanged: still requires SSR_ENABLE_VAAPI=1 (D-06: VAAPI default-disabled is locked)."
    - "On the /ssr route, the GL renderer's permanent-disable threshold (3 context losses) is REPLACED with a refuse-to-fall-back-to-2D policy: if WebGL/WebGL2 cannot be obtained the SSR tab logs loud + the watchdog escalates (Phase 33 layer). On dashboard and /output (the unchanged paths), the existing Phase 30 B2 h10 2D-fallback stays intact."
    - "On the /ssr route, state.renderMode is FORCED to 'gl' (or 'webgl2') at boot so __ttBeamerEffectiveRenderMode() returns a string that does NOT contain '2d'."
    - "Server log emits a recognizable line for each ssr-stats message carrying renderMode (D-01 telemetry — surfaces in server stdout, persistent across restarts)."
    - "Connection-stability suite stays GREEN (80/0) — D-06 hard gate."
    - "All four 34-A Wave-0 rail tests transition RED → GREEN: chrome-flags (3) + render-mode-probe (1)."
  artifacts:
    - path: "src/server/ssr-render-host.mjs"
      provides: "hasIgpuDev decoupled from hasVaapiEnabled. GL-helpful flags --ignore-gpu-blocklist and --enable-gpu-rasterization are added on hasIgpuDev (independent of VAAPI). VAAPI features still gated on hasVaapiEnabled (env-var required)."
      contains: "hasIgpuDev"
    - path: "src/server/ssr-webrtc-signaling.mjs"
      provides: "ssr-stats handler logs renderMode periodically (D-01 telemetry sink — every Nth message, not every message, to avoid log flooding)."
      contains: "renderMode"
    - path: "src/app/runtime/runtime-orchestration.js"
      provides: "On /ssr boot, sets state.renderMode = 'gl' (or the runtime's GL-mode constant) before the GL renderer initializes; D-02 2D-fallback ban applies only when route is /ssr."
      contains: "/ssr"
    - path: "src/app/runtime/viewport/runtime-projection-gl-renderer.js"
      provides: "On /ssr (getRuntimeEnvironment === 'server-ssr'), the permanent-disable branch is replaced with a console.error + tab-watchdog escalation hook. Phase 30 B2 h10 behavior preserved on dashboard + /output."
      contains: "server-ssr"
  key_links:
    - from: "ssr-render-host.mjs:hasIgpuDev"
      to: "Chrome args spread for --ignore-gpu-blocklist + --enable-gpu-rasterization"
      via: "ternary spread `...(hasIgpuDev ? [...] : [])`"
      pattern: "hasIgpuDev\\s*\\?\\s*\\[\\s*\"--ignore-gpu-blocklist\""
    - from: "ssr-webrtc-signaling.mjs:onMessage handler for ssr-stats"
      to: "logger.info / logger.log call"
      via: "`if (msg.type === 'ssr-stats') ... if (counter % N === 0) logger.info('[ssr-stats] renderMode=...')`"
      pattern: "renderMode"
    - from: "runtime-projection-gl-renderer.js context-lost handler"
      to: "isSsrTab branch"
      via: "getRuntimeEnvironment() === 'server-ssr'"
      pattern: "server-ssr"
---

<objective>
**Track A — GL-flag fix + 2D-fallback ban on /ssr + render-mode telemetry sink.** The actual root cause of the SSR tab's 2D-fallback (per RESEARCH §Pitfall 1) is that `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` are gated behind `hasIgpu = SSR_ENABLE_VAAPI === '1' && existsSync('/dev/dri/renderD128')`. With VAAPI default-disabled by Phase 33 (commit `3cd6748` — D-06 carry-forward, NOT to be reverted), `hasIgpu` is always `false` and these two GL-helpful flags are NEVER added to Chrome.

This plan:
1. Decouples the GL flags from the VAAPI gate by introducing `hasIgpuDev` (DRI device presence only) separately from `hasVaapiEnabled` (DRI device presence AND env-var opt-in).
2. Adds the unconditional GL flags (gated on `hasIgpuDev`) so a real iGPU is reachable by ANGLE/Mesa even with VAAPI disabled.
3. Bans the 2D-fallback on the `/ssr` route only (D-02 LOCKED). Dashboard and Pi `/output` keep the Phase 30 B2 h10 fallback.
4. Forces `state.renderMode = 'gl'` on `/ssr` so `__ttBeamerEffectiveRenderMode()` returns a string that explicitly does NOT contain `2d` — the D-05 acceptance condition.
5. Adds a server-log sink for the existing `ssr-stats` envelope's `renderMode` field (D-01 telemetry: every 10th ssr-stats message logs `[ssr-stats] renderMode=<value>` so the operator's server stdout shows the live GL state).

Track A does NOT migrate URLs (Track B did that). Track A does NOT touch route handling, output.html, or the audio binder. Track A does NOT re-enable VAAPI — `SSR_ENABLE_VAAPI=1` opt-in remains the only re-enable path (D-06 lock).

Output: 4 modified files, 4 Wave-0 rails turn GREEN, end-to-end the SSR-tab logs `[ssr-stats] renderMode=webgl2` (or `gl`) periodically and the operator's gaming-PC desktop browser sees no banding on the known solid-color animation.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-34/34-CONTEXT.md
@.planning/phases/phase-34/34-RESEARCH.md
@.planning/phases/phase-34/34-W0-SUMMARY.md
@.planning/phases/phase-34/34-B-SUMMARY.md
@.planning/phases/phase-33/33-CLOSURE.md
@.planning/phases/phase-30/SUMMARY.md

# Source files to modify or read for current behavior:
@src/server/ssr-render-host.mjs
@src/server/ssr-webrtc-signaling.mjs
@src/server/ssr-stream-publisher.mjs
@src/app/runtime/runtime-orchestration.js
@src/app/runtime/viewport/runtime-projection-gl-renderer.js
@src/app/lib/shared/runtime-env.js

# Wave-0 contract tests that must transition RED → GREEN:
@test/phase-34-chrome-flags.test.mjs
@test/phase-34-render-mode-probe.test.mjs

<interfaces>
<!-- Critical contract surfaces. -->

From src/server/ssr-render-host.mjs:487-503 (current VAAPI-coupled hasIgpu — patch target #1):
```javascript
// Phase 33 iter-4c (2026-05-09): VAAPI hardware encoder can starve the SSR-tab's
// main thread on some hardware — default-disable VAAPI by env flag.
const hasIgpu =
  process.env.SSR_ENABLE_VAAPI === "1" &&
  (existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129"));
const enabledFeatures = [
  ...(hasIgpu ? ["VaapiVideoEncoder", "VaapiVideoDecoder", "VaapiIgnoreDriverChecks"] : []),
  // ...
];
```

From src/server/ssr-render-host.mjs:589-590 (current GL flags — patch target #2):
```javascript
...(hasIgpu ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
```

From src/server/ssr-webrtc-signaling.mjs:445-455 (current ssr-stats handler — patch target for telemetry sink):
```javascript
if (msg.type === "ssr-stats" && conn.role === "ssr-tab") {
  // (currently stores stats but does NOT periodically log renderMode)
  state.lastSsrStats = msg.stats;
  state.lastSsrStatsAtMs = Date.now();
}
```

From src/app/runtime/runtime-orchestration.js:447-461 (__ttBeamerEffectiveRenderMode — read this, don't modify):
```javascript
window.__ttBeamerEffectiveRenderMode = () => {
  const configured = state?.renderMode ?? "auto";
  if (configured === "2d") return "2d";
  // ... returns "webgl"/"webgl2"/"auto"/"gl"/"2d"/"auto→2d (gl-disabled)"/...
};
```

From src/app/runtime/viewport/runtime-projection-gl-renderer.js:153-191 (current SSR-tab carve-out — already exists for h18):
```javascript
const __envForGl =
  (typeof window !== "undefined"
    && window.TT_BEAMER_RUNTIME_ENV?.getRuntimeEnvironment?.()) || "pi";
const isSsrTab = __envForGl === "server-ssr";
// ...
if (!isSsrTab && _glContextLossCount >= _GL_MAX_CONTEXT_LOSSES) {
  _glPermanentlyDisabled = true;
  // ... shows toast, marks 2D-fallback
}
```

From src/app/lib/shared/runtime-env.js (after Track B Task 1, getRuntimeEnvironment classifies /ssr → "server-ssr"). The h18 carve-out above ALREADY covers /ssr correctly — the only thing left to do here is verify it (Task 3) and add the renderMode-force at the boot of /ssr (Task 4).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Decouple hasIgpuDev from hasVaapiEnabled — add unconditional GL flags</name>
  <files>src/server/ssr-render-host.mjs</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-01 force; D-06 VAAPI default-disabled lock)
    - .planning/phases/phase-34/34-RESEARCH.md (Pitfall 1 — exact root-cause; Code Examples §Chrome Flag Fix — exact target code)
    - .planning/phases/phase-33/33-CLOSURE.md (commit 3cd6748 — VAAPI default-disabled; this is the carry-forward we MUST NOT revert)
    - src/server/ssr-render-host.mjs lines 487-503 (current hasIgpu binding + enabledFeatures construction)
    - src/server/ssr-render-host.mjs lines 585-595 (current GL-flag spread)
    - test/phase-34-chrome-flags.test.mjs (Wave-0 rail — its assertions ARE the contract)
    - test/ssr-chromium-flags-merge.test.mjs (existing regression — must stay green)
    - test/phase-32-encoder-detect-vaapi.test.mjs (VAAPI gating regression — must stay green)
  </read_first>
  <behavior>
    - Test 1 (chrome-flags rail #1): source contains a binding `const hasIgpuDev =` whose RHS does NOT include `process.env.SSR_ENABLE_VAAPI`.
    - Test 2 (chrome-flags rail #2): the line containing `--ignore-gpu-blocklist` is gated by `hasIgpuDev` token (not by `hasVaapiEnabled` or `hasIgpu`).
    - Test 3 (chrome-flags rail #3): same for `--enable-gpu-rasterization`.
    - Test 4 (chrome-flags regression): `enabledFeatures` array's `VaapiVideoEncoder` entry is still gated on a VAAPI-aware identifier (named `hasVaapiEnabled` in this plan).
    - Test 5 (chrome-flags regression): `--use-gl=angle` is still present.
    - Behavior 6: with `SSR_ENABLE_VAAPI` unset and `/dev/dri/renderD128` present, Chrome args contain BOTH `--ignore-gpu-blocklist` AND `--use-gl=angle` AND DO NOT contain `VaapiVideoEncoder`.
    - Behavior 7: with `SSR_ENABLE_VAAPI=1` and `/dev/dri/renderD128` present, Chrome args contain `--ignore-gpu-blocklist` AND `--use-gl=angle` AND `VaapiVideoEncoder`.
    - Behavior 8: with no DRI device, Chrome args do NOT contain `--ignore-gpu-blocklist` AND do NOT contain `VaapiVideoEncoder` (graceful degradation).
  </behavior>
  <action>
    Single surgical edit in `src/server/ssr-render-host.mjs`.

    Replace lines 487-503 (the `// Phase 33 iter-4c ...` comment block + the `hasIgpu` binding + the `enabledFeatures` array) with:

    ```javascript
    // Phase 34 D-01 (Track A): decouple iGPU-device presence (relevant for
    // GL-helpful Chrome flags) from VAAPI opt-in (relevant for
    // VaapiVideoEncoder feature). Pre-Phase-34 the two were gated by a
    // single `hasIgpu` constant that required SSR_ENABLE_VAAPI=1 — which
    // meant the GL-helpful flags --ignore-gpu-blocklist and
    // --enable-gpu-rasterization were NEVER added in the default
    // (VAAPI-disabled) configuration, even when an iGPU was physically
    // present. Result: ANGLE fell through to llvmpipe/SwiftShader, the
    // mesh-warp WebGL context was unstable, the runtime fell back to 2D
    // canvas, and the user saw banding in solid-color animations.
    //
    // Phase 33 iter-4c (commit 3cd6748) carry-forward: VAAPI is still
    // default-DISABLED (D-06 hard lock). VAAPI re-enable is opt-in via
    // SSR_ENABLE_VAAPI=1 — UNCHANGED.
    const hasIgpuDev =
      existsSync("/dev/dri/renderD128") || existsSync("/dev/dri/renderD129");
    const hasVaapiEnabled =
      process.env.SSR_ENABLE_VAAPI === "1" && hasIgpuDev;
    const enabledFeatures = [
      // VAAPI features ONLY when explicitly enabled (D-06 lock).
      ...(hasVaapiEnabled ? ["VaapiVideoEncoder", "VaapiVideoDecoder", "VaapiIgnoreDriverChecks"] : []),
      ...(status.encoderConfig?.encoder === "nvenc" ? ["H264HardwareEncode"] : []),
      ...(status.encoderConfig?.encoder === "videotoolbox" ? ["PlatformHEVCEncoderSupport"] : []),
      // h18: tab-capture fast-path lifts the implicit 30 fps cap on
      // getDisplayMedia tab capture. Pairs with --max-gum-fps=60 below
      // and the publisher's frameRate: { ideal: 60 } constraint.
      "TabCaptureFastPath",
    ];
    ```

    Then replace line 590 (`...(hasIgpu ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),`) with:

    ```javascript
            // Phase 34 D-01: GL-helpful flags gated on hasIgpuDev (not on
            // hasVaapiEnabled). These are needed for ANGLE to reach the
            // iGPU even when VAAPI is default-disabled — they let
            // Chrome's GPU process trust the Mesa driver under Xvfb.
            // Without them, Chrome's blocklist excludes Mesa-llvmpipe
            // hardware paths and ANGLE falls back to SwiftShader software
            // rendering, which is what triggers WebGL context losses
            // and the Phase 30 B2 h10 2D-fallback.
            ...(hasIgpuDev ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : []),
    ```

    Search the rest of `ssr-render-host.mjs` for any OTHER reference to the `hasIgpu` symbol. If found (e.g. encoder selection logic), replace with `hasVaapiEnabled` because the original `hasIgpu` semantics required BOTH the env-var AND the device. Verify with `grep -n 'hasIgpu\b' src/server/ssr-render-host.mjs` after the edit — it should return ZERO lines (the symbol is fully renamed; only `hasIgpuDev` and `hasVaapiEnabled` remain).
  </action>
  <verify>
    <automated>node --test test/phase-34-chrome-flags.test.mjs test/ssr-chromium-flags-merge.test.mjs test/phase-32-encoder-detect-vaapi.test.mjs 2>&1 | tail -10; grep -nE 'hasIgpu\b' src/server/ssr-render-host.mjs | grep -v 'hasIgpuDev' | wc -l | xargs -I{} test {} -eq 0 && echo "no stale hasIgpu"</automated>
  </verify>
  <acceptance_criteria>
    - `node --test test/phase-34-chrome-flags.test.mjs` reports `# fail 0` and `# pass 5` (was: 3 fail / 2 pass at end of Wave 0).
    - `node --test test/ssr-chromium-flags-merge.test.mjs` still passes.
    - `node --test test/phase-32-encoder-detect-vaapi.test.mjs` still passes.
    - `grep -cE 'const\s+hasIgpuDev\s*=' src/server/ssr-render-host.mjs` returns 1.
    - `grep -cE 'const\s+hasVaapiEnabled\s*=' src/server/ssr-render-host.mjs` returns 1.
    - `grep -nE 'hasIgpu\b' src/server/ssr-render-host.mjs | grep -v 'hasIgpuDev'` returns ZERO lines (the legacy `hasIgpu` symbol is fully replaced).
    - `grep -nE 'hasVaapiEnabled.*VaapiVideoEncoder|VaapiVideoEncoder.*hasVaapiEnabled' src/server/ssr-render-host.mjs` returns at least one line (proving the gate is correct).
    - `grep -nE 'hasIgpuDev.*--ignore-gpu-blocklist' src/server/ssr-render-host.mjs` returns at least one line.
  </acceptance_criteria>
  <done>
    `hasIgpuDev` (device-only) is decoupled from `hasVaapiEnabled` (device + env-var); GL flags gated on `hasIgpuDev`; VAAPI features gated on `hasVaapiEnabled`. All 5 chrome-flag rails GREEN; all VAAPI regression tests still GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: ssr-stats renderMode telemetry sink — periodic server log line</name>
  <files>src/server/ssr-webrtc-signaling.mjs</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-01 probe is mandatory — telemetry surfaces in server log)
    - .planning/phases/phase-34/34-RESEARCH.md (Code Examples §Render Mode Probe; Don't Hand-Roll: extend existing ssr-stats envelope)
    - src/server/ssr-stream-publisher.mjs lines 380-440 (the in-page probe that emits renderMode in the ssr-stats envelope every 1s — already wired)
    - src/server/ssr-webrtc-signaling.mjs lines 440-460 (the existing ssr-stats handler — current sink)
    - test/phase-34-render-mode-probe.test.mjs (Wave-0 rail)
  </read_first>
  <behavior>
    - Test 1 (render-mode-probe rail): combined source of `ssr-webrtc-signaling.mjs` and `ssr-render-host.mjs` contains a logger call (`logger.info|log|warn`) inside or referenced from the `msg.type === "ssr-stats"` handler that includes `renderMode` in its argument string.
    - Behavior 2 (functional): when the SSR tab is running and emitting ssr-stats every 1s, the server stdout shows a line like `[ssr-stats] renderMode=webgl2` (or whatever the probe returns) at most once every 10 seconds (anti-flood — the probe fires every 1s, we throttle to every 10th message).
    - Behavior 3 (regression): existing ssr-stats handler behavior — storing `state.lastSsrStats` and `state.lastSsrStatsAtMs` — is unchanged.
  </behavior>
  <action>
    Locate the `ssr-stats` message branch in `src/server/ssr-webrtc-signaling.mjs` (around line 447 per RESEARCH.md). The current code looks roughly like:

    ```javascript
    if (msg.type === "ssr-stats" && conn.role === "ssr-tab") {
      state.lastSsrStats = msg.stats;
      state.lastSsrStatsAtMs = Date.now();
    }
    ```

    (Read the file first to confirm the exact lines — the branch may be embedded in a larger handler.)

    Add a module-scope counter at the top of the file (with the other module-scope state — search for `let state =` or similar) named `let ssrStatsLogCounter = 0;`.

    Replace the ssr-stats branch body with:

    ```javascript
    if (msg.type === "ssr-stats" && conn.role === "ssr-tab") {
      state.lastSsrStats = msg.stats;
      state.lastSsrStatsAtMs = Date.now();
      // Phase 34 D-01: telemetry — surface the SSR tab's effective render
      // mode in the server log every 10 messages (~10s at the probe's 1s
      // cadence). The renderMode value comes from
      // __ttBeamerEffectiveRenderMode() inside the SSR tab; values are
      // "webgl" / "webgl2" / "gl" / "auto" (OK) or
      // "2d" / "gl→2d (gl-disabled)" / "auto→2d (loss xN)" (FAIL).
      // Acceptance gate D-05: the value MUST NOT contain "2d" on /ssr.
      ssrStatsLogCounter += 1;
      if (ssrStatsLogCounter % 10 === 1) {
        const rm = msg?.stats?.renderMode;
        if (typeof rm === "string" && rm.length > 0) {
          logger.info(`[ssr-stats] renderMode=${rm}`);
        }
      }
    }
    ```

    The `logger` symbol is in scope inside the WS handler (the file uses `logger` throughout — confirm by grep).

    If the file does not currently import a `logger` at top level, the existing handler-scope `logger` parameter is used (most signaling layers thread logger through). Confirm by reading line 1-50 of the file before editing.
  </action>
  <verify>
    <automated>node --test test/phase-34-render-mode-probe.test.mjs 2>&1 | tail -5; grep -nE 'renderMode=' src/server/ssr-webrtc-signaling.mjs | wc -l | xargs -I{} test {} -ge 1 && echo "log line present"</automated>
  </verify>
  <acceptance_criteria>
    - `node --test test/phase-34-render-mode-probe.test.mjs` reports `# fail 0` and `# pass 2` (was: 1 fail / 1 pass at end of Wave 0).
    - `grep -nE 'renderMode=\$\{rm\}|renderMode=\$\{stats\.renderMode\}' src/server/ssr-webrtc-signaling.mjs` returns at least one line.
    - `grep -nE 'ssrStatsLogCounter' src/server/ssr-webrtc-signaling.mjs` returns at least 2 lines (declaration + increment).
    - `grep -nE 'msg\.type\s*===\s*"ssr-stats"' src/server/ssr-webrtc-signaling.mjs` still returns the original branch (regression).
    - `node --test test/ssr-webrtc-signaling.test.mjs` still passes.
  </acceptance_criteria>
  <done>
    Telemetry sink active: every 10th ssr-stats message logs `[ssr-stats] renderMode=<value>` to server stdout. Render-mode-probe rail GREEN; existing signaling tests still GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Force renderMode='gl' on /ssr + ban 2D-fallback on /ssr only (preserve dashboard + /output behavior)</name>
  <files>src/app/runtime/runtime-orchestration.js, src/app/runtime/viewport/runtime-projection-gl-renderer.js</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-02 LOCKED — 2D-fallback ban applies ONLY to /ssr; D-05 — probe must return "webgl"/"webgl2" or at minimum NOT contain "2d")
    - .planning/phases/phase-34/34-RESEARCH.md (Open Q1 — `__ttBeamerEffectiveRenderMode()` returns `state.renderMode` directly when GL is working; if `state.renderMode = "auto"` the probe returns "auto" not "webgl"; recommendation: force `state.renderMode = "gl"` on /ssr)
    - src/app/runtime/runtime-orchestration.js lines 60-80 (data-ssr-tab marker — Track B already updated; we hook into the SAME block)
    - src/app/runtime/runtime-orchestration.js lines 440-465 (__ttBeamerEffectiveRenderMode definition — read, do not modify)
    - src/app/runtime/viewport/runtime-projection-gl-renderer.js lines 140-200 (current SSR-tab carve-out via h18 — already exists; we tighten the failure path)
    - src/app/lib/shared/runtime-env.js (Track B updated getRuntimeEnvironment — /ssr now classifies as 'server-ssr')
    - src/app/runtime/runtime-orchestration.js (find where state.renderMode is initialized — search for `renderMode` near state initialization, typically in a runtime-state module or in the orchestration boot block)
  </read_first>
  <behavior>
    - Behavior 1 (force GL on /ssr): when the SSR Chromium tab boots /ssr, `state.renderMode` is set to `"gl"` (or the runtime's GL-mode constant — read the existing values: typically one of `"auto"`, `"gl"`, `"2d"`) before the GL renderer initializes. This means `__ttBeamerEffectiveRenderMode()` returns `"gl"` (when GL is working) — explicitly NOT containing `"2d"`.
    - Behavior 2 (ban 2D-fallback on /ssr): in `runtime-projection-gl-renderer.js`, the existing `isSsrTab` carve-out (which currently keeps retrying GL forever on context loss) is TIGHTENED so that on the SSR tab, if a context loss happens AND the renderer cannot recover within N tries, the renderer logs a LOUD console.error AND sets a flag readable by the watchdog (so the Phase 33 watchdog can see "GL is broken on SSR — restart tab"). Concretely: instead of the current "log + retry forever" path on /ssr, we add a `_glHardFailedOnSsr` flag that the watchdog (in ssr-render-host.mjs) inspects — if true for 30s, restart the tab.
    - Behavior 3 (preserve dashboard + /output): on dashboard (`getRuntimeEnvironment === 'desktop'`) and on Pi `/output` (`getRuntimeEnvironment === 'pi'`), the existing Phase 30 B2 h10 path (3 context losses → permanent disable + 2D fallback toast) is UNCHANGED.
    - Behavior 4 (probe acceptance): when the SSR tab is healthy on /ssr, `__ttBeamerEffectiveRenderMode()` returns one of: `"gl"`, `"webgl"`, `"webgl2"`, `"auto"` (if for some reason force-renderMode-on-/ssr is bypassed). The string MUST NOT contain `"2d"`. This is the D-05 acceptance gate.
  </behavior>
  <action>
    Two file edits.

    **Edit 1 — `src/app/runtime/runtime-orchestration.js`:**

    Find the SSR-tab marker block (now at lines ~65-80, updated by 34-B Task 3). It currently reads:

    ```javascript
    {
      const __ttbSearch = window.location.search || "";
      const __ttbPath = window.location.pathname || "/";
      const __ttbIsSsrTab =
        __ttbPath === "/ssr" ||
        __ttbPath.startsWith("/ssr/") ||
        /[?&]ssr=1(\b|&)/.test(__ttbSearch);
      if (__ttbIsSsrTab) {
        document.body.dataset.ssrTab = "true";
      }
      // ...
    }
    ```

    Append (inside the same block, after the `data-ssr-tab` set) — note that `state` is not yet in scope at this point in the file because state is constructed later. The actual force needs to happen AT state initialization, not at marker time. So we instead set a window-level flag here that the state initializer reads.

    Add right after `document.body.dataset.ssrTab = "true";`:

    ```javascript
        // Phase 34 D-02: SSR tab is rendering INTO a stream. 2D-canvas
        // fallback produces banding in solid-color animations (operator
        // observed). Force renderMode = "gl" via a window-level hint that
        // runtime-state's renderMode initializer reads. Setting the hint
        // here (before any state initializer runs) is the simplest cross-
        // module wiring; runtime-state checks for window.__ttBeamerForceRenderMode
        // and overrides the persisted/default mode if present.
        window.__ttBeamerForceRenderMode = "gl";
    ```

    Then find where `state.renderMode` is initialized. Grep `grep -nE 'renderMode\s*[:=]' src/app/runtime/state/runtime-state.js src/app/runtime/runtime-orchestration.js src/app/runtime/runtime-orchestration-ctx-builder.js` to locate the initializer. The simplest patch is at the orchestration consume site — wherever `state.renderMode` first becomes meaningful, immediately after the block that constructs `state`, add:

    ```javascript
    // Phase 34 D-02: enforce the SSR-tab GL force (set above by the
    // /ssr-marker block). This overrides any persisted renderMode.
    if (typeof window.__ttBeamerForceRenderMode === "string"
        && window.__ttBeamerForceRenderMode.length > 0
        && state) {
      state.renderMode = window.__ttBeamerForceRenderMode;
    }
    ```

    The exact insertion point: search the file for the FIRST reference to `state.renderMode` after `state` is constructed. Insert this clamp BEFORE that line. If `state.renderMode` is set inside a sub-module's init that runs after orchestration boots, the clamp goes inside the orchestration boot block right after the bootstrap `init()` call that produces `state` — typically near `BOOTSTRAP.init(...)`.

    **Important:** if reading the file reveals that `state.renderMode` is initialized inside a sub-module's bootstrap (e.g. `runtime-state.js`'s defaults), the clamp at the orchestration level still works because state is shared across modules — but the clamp must run BEFORE any GL-renderer init. The GL renderer is loaded via the `<script src="...projection-gl-renderer.js">` tag in `index.html` line 1173 with `defer`, so it runs after orchestration if orchestration is also `defer`. The orchestration script is at line 1190 — LAST. So orchestration runs LAST among the defer scripts. The renderer's `_initMeshWarpGL()` is called inside the draw loop, which orchestration starts. Thus the clamp at orchestration boot, right after BOOTSTRAP.init, runs BEFORE the first draw frame. Safe.

    **Edit 2 — `src/app/runtime/viewport/runtime-projection-gl-renderer.js`:**

    Find the existing isSsrTab carve-out (lines 153-191 in current code). It looks like:

    ```javascript
        const __envForGl =
          (typeof window !== "undefined"
            && window.TT_BEAMER_RUNTIME_ENV?.getRuntimeEnvironment?.()) || "pi";
        const isSsrTab = __envForGl === "server-ssr";
        // ...
        if (!isSsrTab && _glContextLossCount >= _GL_MAX_CONTEXT_LOSSES) {
          _glPermanentlyDisabled = true;
          // ... shows toast
        } else if (isSsrTab && typeof console !== "undefined" && console.warn) {
          // h18: log on SSR — no permanent-disable, just retry next frame.
          console.warn(
            "[h18] WebGL context lost on SSR-tab (count=",
            _glContextLossCount,
            ") — keeping GL, will re-init next frame",
          );
        }
    ```

    Tighten the SSR-tab branch with a hard-fail flag and an escalation log. Replace the `else if (isSsrTab ...)` branch with:

    ```javascript
        } else if (isSsrTab) {
          // Phase 34 D-02: SSR tab BANS the 2D-fallback (D-02 LOCKED).
          // We keep retrying GL (h18 carry-forward) but ALSO surface a
          // hard-fail flag if losses pile up — the Phase 33 watchdog
          // (ssr-render-host.mjs:health-ping path) reads this via the
          // ssr-stats envelope and can escalate to a tab restart.
          if (typeof console !== "undefined" && console.error) {
            console.error(
              `[34-A] WebGL context lost on SSR-tab (count=${_glContextLossCount}) — D-02 forbids 2D-fallback, keeping GL, will re-init next frame`,
            );
          }
          // Surface the loss-count to the publisher's ssr-stats so the
          // server can correlate render-mode probe values with loss
          // events. The publisher reads window.__ttBeamerGlLossCount.
          window.__ttBeamerGlLossCount = _glContextLossCount;
          if (_glContextLossCount >= _GL_MAX_CONTEXT_LOSSES * 2) {
            // 6 consecutive losses on /ssr — escalate hard.
            window.__ttBeamerSsrGlHardFailed = true;
            console.error(
              "[34-A] SSR-tab GL hard-failed (>=6 losses) — operator should investigate; D-02 says fail loud, do NOT 2D-fallback",
            );
          }
        }
    ```

    The inner `if (!isSsrTab && _glContextLossCount >= _GL_MAX_CONTEXT_LOSSES)` branch (the actual 2D-fallback for dashboard + /output) STAYS UNTOUCHED — Phase 30 B2 h10 carries forward as-is for non-/ssr paths.

    **Verify the read path:** `getRuntimeEnvironment` after Track B Task 1 returns `"server-ssr"` for pathname `/ssr`. Confirmed.
  </action>
  <verify>
    <automated>grep -nE '__ttBeamerForceRenderMode' src/app/runtime/runtime-orchestration.js | wc -l | xargs -I{} test {} -ge 2 && grep -nE '__ttBeamerSsrGlHardFailed|D-02 forbids 2D-fallback' src/app/runtime/viewport/runtime-projection-gl-renderer.js | wc -l | xargs -I{} test {} -ge 1 && node --test "test/**/*.test.mjs" 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep -nE '__ttBeamerForceRenderMode' src/app/runtime/runtime-orchestration.js` returns ≥ 2 lines (set + consume).
    - `grep -nE 'state\.renderMode\s*=\s*window\.__ttBeamerForceRenderMode' src/app/runtime/runtime-orchestration.js` returns 1 line.
    - `grep -nE 'D-02 forbids 2D-fallback|__ttBeamerSsrGlHardFailed' src/app/runtime/viewport/runtime-projection-gl-renderer.js` returns ≥ 1 line.
    - The pre-existing Phase 30 B2 h10 fallback (`_glPermanentlyDisabled = true`) is STILL present in the same file (regression — `grep -nE '_glPermanentlyDisabled\s*=\s*true' src/app/runtime/viewport/runtime-projection-gl-renderer.js` returns ≥ 1 line).
    - The `else if (isSsrTab)` branch contains the hard-fail escalation (search for `_GL_MAX_CONTEXT_LOSSES \* 2`).
    - All existing tests still pass: `node --test "test/**/*.test.mjs" 2>&1 | tail -3` reports the same FAIL count as end of Track B (i.e. only the Wave-0 chrome-flags-3 + render-mode-probe-1 tests are still RED before this plan; Tasks 1+2 of THIS plan flipped them; Task 3 produces 0 additional RED tests).
  </acceptance_criteria>
  <done>
    On /ssr boot, `state.renderMode = "gl"` is forced and `__ttBeamerEffectiveRenderMode()` will return `"gl"` not containing `"2d"`. On context loss on /ssr the renderer keeps trying GL (no 2D-fallback) AND emits a loud `console.error` AND surfaces a hard-fail flag for the watchdog. On dashboard and /output the existing Phase 30 B2 h10 path is intact.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: D-06 hard-gate + D-05 manual visual smoketest after Track A</name>
  <files>.planning/phases/phase-34/34-A-D06-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-06 hard gate; D-05 — manual visual smoketest is part of acceptance)
    - .planning/phases/phase-34/34-W0-PRECHECK.md (baseline)
    - .planning/phases/phase-34/34-B-D06-VERIFICATION.md (Track B baseline — must still hold)
    - test/connection-stability/_harness.mjs
  </read_first>
  <what-built>
    Track A is feature-complete. Combined with Track B, the SSR Chromium tab now navigates to /ssr, runtime-env classifies it as 'server-ssr', the GL-helpful Chrome flags `--ignore-gpu-blocklist` + `--enable-gpu-rasterization` are present even with VAAPI default-disabled, `state.renderMode` is forced to `"gl"` on /ssr, and the 2D-fallback is banned on /ssr only.

    The full Phase 34 effect should now be visible: `__ttBeamerEffectiveRenderMode()` returns `"gl"` (not `"2d"`), `[ssr-stats] renderMode=gl` lines appear in server stdout, and the operator-confirmed solid-color banding animation renders with smooth gradients.
  </what-built>
  <how-to-verify>
    Run automated suite, run live suite, then perform the D-05 manual visual smoketest.

    1. `node --test "test/**/*.test.mjs" 2>&1 | tail -10`. Confirm fail count is 0 above the W0-PRECHECK baseline (i.e. all Phase 34 Wave-0 rail tests have flipped GREEN: 16 of 16 — 3 route-split + 2 runtime-env-pathname + 7 thin-output-script-graph + 3 chrome-flags + 1 render-mode-probe).
    2. `RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tee /tmp/34-A-d06.out | tail -15`. Confirm `# pass 80, # fail 0`. If any FAIL, identify whether it's in producer-lifecycle (Track B suspect: URL migration broke the harness somehow), receiver-state-machine (Track B suspect: receiver-bootstrap path detection), or phase-32-hotfix-regression (Track A suspect: Chrome flag set drift).
    3. `node test/manual/repro-cold-boot-loop.mjs` — 10× cold-boot reproduction. Phase 33 baseline: 10/10 OK, 0 failures, min=3435 avg=8097 max=12076. New result must be within ±20% of those numbers.
    4. **D-05 manual visual smoketest (gaming-PC desktop browser only — Pi UAT deferred):**
       - Boot the server: `node server.mjs` (or whatever the project boot command is).
       - Open `http://<host>:<port>/output` in the gaming-PC desktop browser.
       - Wait for the splash to disappear and the video stream to become visible.
       - Open the dashboard at `http://<host>:<port>/` in another tab.
       - Trigger a known solid-color banding animation (operator picks one — RESEARCH §Open Q1 said the user has one in mind).
       - Visually confirm: NO banding in the gradient. Smooth solid-color rendering.
       - In server stdout, confirm presence of `[ssr-stats] renderMode=gl` (or `webgl` / `webgl2` / `auto`) lines roughly every 10 seconds. The string MUST NOT contain `"2d"`.
       - In the SSR tab's DevTools (visible via `chrome://inspect` from a separate Chrome connecting to the SSR-tab debugging port if exposed): in the console, run `__ttBeamerEffectiveRenderMode()`. The return value MUST be a string that does NOT contain `"2d"`.
    5. Write findings to `.planning/phases/phase-34/34-A-D06-VERIFICATION.md` with PASS/FAIL/UNVERIFIED markers per item.

    If item 4 (visual smoketest) FAILs (banding still visible), the GL-helpful flags did not solve the problem on this hardware. Possible causes:
    - `/dev/dri/renderD128` does not exist on the server (RESEARCH §Assumption A1) → `hasIgpuDev` is false → flags not added. Mitigation: verify `existsSync('/dev/dri/renderD128')` on the actual server.
    - ANGLE under Mesa-llvmpipe still cannot reach the iGPU (RESEARCH §Assumption A1 risk). Mitigation: check server-log renderMode value AND the publisher-emitted webglRenderer string in ssr-stats — if `webglRenderer` shows "llvmpipe" we are still on software despite the flags. Escalate to a follow-up phase that adds `--enable-features=Vulkan` or `--use-gl=desktop` exploration.
    - The animation actually renders fine and the banding is a stream-encoding artifact (RESEARCH §A2). Mitigation: probe still passes (D-05 §1) and the manual smoketest §2 fails — record as "render-mode probe PASS but visual smoketest INCONCLUSIVE; requires encoder investigation in a future phase." Phase 34 still ships the GL-flag fix as net-positive.
  </how-to-verify>
  <resume-signal>Type "approved — connection-stability green, render-mode probe = gl/webgl/webgl2, manual visual smoketest no banding" OR describe specific failures with file:line references and probe values observed.</resume-signal>
  <action>Execute the verification steps in <how-to-verify> above. Run automated tests; run cold-boot repro; perform the D-05 visual smoketest in the gaming-PC desktop browser (open /output, trigger known solid-color banding animation, visually confirm no banding); confirm server stdout shows '[ssr-stats] renderMode=<value>' lines without '2d' in the value; in the SSR-tab DevTools console run __ttBeamerEffectiveRenderMode() and confirm return value does not contain '2d'. Write findings to .planning/phases/phase-34/34-A-D06-VERIFICATION.md with PASS/FAIL/INCONCLUSIVE markers per item. If D-05 visual smoketest FAILs (banding still visible), follow the troubleshooting branch in <how-to-verify> step 5 (verify /dev/dri/renderD128 exists, check webglRenderer string in ssr-stats — escalate to encoder follow-up phase if banding is stream-encoding artifact, not GL).</action>
  <verify>
    <automated>test -s .planning/phases/phase-34/34-A-D06-VERIFICATION.md && RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -3 | grep -E 'fail 0|0 fail'</automated>
  </verify>
  <done>34-A-D06-VERIFICATION.md exists with concrete observed renderMode value + visual-smoketest result + cold-boot repro counts; connection-stability suite GREEN (80/0); operator has approved with the resume signal.</done>
</task>

</tasks>

<threat_model>
**Track A surface area is server-side Chrome args and client-side runtime state — no new HTTP routes, no new network surfaces, no new user input handling.**

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-34-A-01 | Tampering / privilege escalation | Chrome `--ignore-gpu-blocklist` flag added unconditionally on hasIgpuDev | accept | The blocklist exists to protect against driver bugs that crash the GPU process. We are running under Xvfb on a known Mesa version on a known Lenovo IdeaCentre Mini — the operator's machine. The flag is a calculated risk for the visual-quality benefit; failure mode is GPU-process crash → Phase 33 watchdog respawns the SSR tab. Documented in code comment. |
| T-34-A-02 | Information Disclosure | server stdout logs renderMode value every 10s | accept | renderMode is one of `"webgl"`, `"webgl2"`, `"gl"`, `"auto"`, `"2d"`, `"gl→2d (loss xN)"` — no PII, no session tokens, no URLs. The value is operator-only diagnostic info. Server stdout is already operator-visible (run via terminal). |
| T-34-A-03 | DoS via log flood | the new `[ssr-stats] renderMode=...` log line | mitigate | Throttled to every 10th ssr-stats message (~1 line per 10 seconds at the probe's 1s cadence). Even at extreme reconnect-loop scenarios (Phase 33 baseline) the rate stays under 1 line per second. |
| T-34-A-04 | Tampering | window.__ttBeamerForceRenderMode and window.__ttBeamerSsrGlHardFailed globals | accept | These are SAME-ORIGIN window globals — only code running in the same origin can read or write them. The SSR Chromium tab is a localhost-only render context (the `/ssr` HTTP route is local-only because the operator is the only one running this codebase). No cross-origin script can reach these globals. |
| T-34-A-05 | Privilege escalation via VAAPI re-enable | hasVaapiEnabled rename — unchanged semantically | accept | VAAPI is still gated on `process.env.SSR_ENABLE_VAAPI === "1"`. The Phase 33 carry-forward (D-06 lock) is preserved. Test `phase-32-encoder-detect-vaapi.test.mjs` regression-covers this. |

`security_enforcement` enabled. All threats classified.
</threat_model>

<verification>
- All 4 Track-A Wave-0 rail tests pass: chrome-flags 3 (was-RED) + render-mode-probe 1 (was-RED).
- Existing regression tests pass: ssr-chromium-flags-merge, phase-32-encoder-detect-vaapi, phase-32-hotfix-regression, ssr-webrtc-signaling.
- Connection-stability suite is GREEN (80/0).
- Cold-boot repro script: 10/10 OK, within ±20% of Phase 33 baseline.
- Manual D-05 visual smoketest: no banding on the known solid-color animation.
- Server stdout shows `[ssr-stats] renderMode=<value>` lines, value does NOT contain `"2d"`.
</verification>

<success_criteria>
Plan 34-A is complete when:
- `hasIgpuDev` and `hasVaapiEnabled` are decoupled in ssr-render-host.mjs.
- GL-helpful Chrome flags (`--ignore-gpu-blocklist`, `--enable-gpu-rasterization`) are present in args under default (VAAPI-disabled) configuration.
- ssr-webrtc-signaling.mjs emits `[ssr-stats] renderMode=<value>` to logger every 10th ssr-stats message.
- runtime-orchestration.js forces `state.renderMode = "gl"` on /ssr boot via the window-level hint.
- runtime-projection-gl-renderer.js logs `[34-A] WebGL context lost on SSR-tab` on context loss AND surfaces `__ttBeamerSsrGlHardFailed` after 6 losses; the Phase 30 B2 h10 fallback path on dashboard + /output is unchanged.
- All 4 remaining Wave-0 rail tests are GREEN.
- Connection-stability suite is GREEN (80/0).
- D-05 manual visual smoketest passes (no banding) OR documented as INCONCLUSIVE with operator sign-off.
</success_criteria>

<output>
After completion, create `.planning/phases/phase-34/34-A-SUMMARY.md` with:
- Files modified (ssr-render-host.mjs, ssr-webrtc-signaling.mjs, runtime-orchestration.js, runtime-projection-gl-renderer.js)
- Wave-0 rail-test transition (RED → GREEN: 4 tests; total Phase 34 rails GREEN: 16 of 16)
- D-06 hard-gate status (PASS / FAIL with explicit numbers)
- D-05 manual smoketest status (PASS / INCONCLUSIVE — the latter is acceptable per CONTEXT D-05 if explicitly recorded)
- Server-log evidence of `[ssr-stats] renderMode=...` (one example line)
- Hand-off note to verification phase: "Track A shipped GL-flag decoupling, /ssr 2D-fallback ban, and renderMode telemetry. If banding persists in spite of renderMode=gl, escalate to encoder investigation (RESEARCH §A2) — but the GL-flag fix is net-positive regardless."
</output>
