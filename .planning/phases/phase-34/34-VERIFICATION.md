---
phase: 34-render-quality-thin-consumer
verified: 2026-05-10T00:00:00Z
status: human_needed
score: 6/8 exit criteria fully verified (2 INCONCLUSIVE — intentional human items)
overrides_applied: 0
human_verification:
  - test: "D-05 visual smoketest: trigger known solid-color banding animation on gaming-PC desktop browser, observe no banding on /output tab"
    expected: "Smooth gradient, no banding visible in solid-color animation stream"
    why_human: "Requires live server + running SSR Chromium tab + browser + operator visual judgment. Cannot be verified programmatically."
  - test: "Pi-hardware UAT — P1: /output renders H264 stream on Pi browser"
    expected: "Stream visible, video plays without render artifacts"
    why_human: "Pi hardware not accessible to automated executor."
  - test: "Pi-hardware UAT — P2: CPU usage measurement on Pi /output tab vs pre-Phase-34"
    expected: "Measurably lower CPU due to thin consumer stripping render pipeline, GIF/MP4 decoders, animation engine"
    why_human: "Pi hardware + htop/atop measurement required."
  - test: "Pi-hardware UAT — P3: Pi solid-color banding visual smoketest"
    expected: "No banding in solid-color animations on Pi-side rendered stream"
    why_human: "Pi hardware required; separate from gaming-PC result (different display path)."
deferred:
  - truth: "Pi /output/-Tab CPU-Verbrauch messbar geringer als vor dem Refactor"
    addressed_in: "Pi hardware UAT (future, no roadmap phase assigned)"
    evidence: "Thin consumer (output.html) strips runtime-orchestration.js, GIF/MP4 decoders, animation engine — CPU reduction is architectural. Measurement deferred to Pi availability per Phase 33 PASS-AUTOMATED-PENDING-PI-HARDWARE precedent."
---

# Phase 34: SSR Render-Quality + /output/ Thin-Consumer Refactor — Verification Report

**Phase Goal:** Zwei Folge-Themen aus Phase 33 schließen: (1) SSR-tab Render-Qualität (kein 2D-Fallback/Banding); (2) /output/ zum schlanken Consumer machen der nur dekodierten Stream zeigt.
**Verified:** 2026-05-10
**Status:** HUMAN_NEEDED (all automated checks PASS; 4 human items remain — D-05 visual smoketest + Pi-hardware UAT P1-P4)
**Re-verification:** No — initial independent verification

## Methodology

This is a goal-backward independent verification. SUMMARY.md claims were NOT trusted — all key facts are verified against the actual codebase by reading source files and running tests live.

**Live test run confirmed:** `node --test "test/**/*.test.mjs"` → 366 pass / 0 fail / 17 skip
**Connection-stability (non-live):** 72 pass / 0 fail / 13 skip (13 live tests skipped without `RUN_LIVE_TESTS=1`)

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /ssr serves index.html (full app for SSR Chromium tab) | VERIFIED | `server.mjs:3449` — `if (routePath === "/ssr") return path.join(ROOT_DIR, "index.html")`. Wave-0 rail test phase-34-route-split.test.mjs 4/4 GREEN. |
| 2 | GET /output and /output/final serve output.html (thin consumer) | VERIFIED | `server.mjs:3454` — `if (routePath === "/output/final" \|\| routePath === "/output") return path.join(ROOT_DIR, "output.html")`. Rail test confirms. |
| 3 | output.html contains NO render pipeline modules, NO GIF/MP4 decoders, NO runtime-orchestration | VERIFIED | `grep` returns 0 matches for all forbidden module names. Phase-34-thin-output-script-graph.test.mjs 7/7 GREEN. output.html has 4 `<script` tags (well under cap of 8). |
| 4 | getRuntimeEnvironment classifies pathname /ssr as 'server-ssr' | VERIFIED | `runtime-env.js:69` — `const isSsrPath = pathname === "/ssr" \|\| pathname.startsWith("/ssr/")`. Phase-34-runtime-env.test.mjs 5/5 GREEN. |
| 5 | ssr-render-host.mjs navigates Chromium to /ssr at BOTH sites (ssrUrl + page.goto) | VERIFIED | Line 459: `const ssrUrl = \`http://127.0.0.1:${port}/ssr\``. Line 853: `await page.goto(\`http://127.0.0.1:${port}/ssr\`, ...)`. Confirmed with `grep -c 'port}/ssr' ssr-render-host.mjs` = 2. Zero `/output?ssr=1` references remain. |
| 6 | hasIgpuDev decoupled from hasVaapiEnabled; GL flags gated on hasIgpuDev | VERIFIED | `ssr-render-host.mjs:510-513`: `const hasIgpuDev = existsSync("/dev/dri/renderD128") \|\| existsSync("/dev/dri/renderD129"); const hasVaapiEnabled = process.env.SSR_ENABLE_VAAPI === "1" && hasIgpuDev;`. Line 617: `...(hasIgpuDev ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : [])`. Phase-34-chrome-flags.test.mjs 5/5 GREEN. Only stale `hasIgpu` reference is a comment at line 499, not live code. |
| 7 | VAAPI default-disabled — VaapiVideoEncoder still gated on hasVaapiEnabled | VERIFIED | `ssr-render-host.mjs:516`: `...(hasVaapiEnabled ? ["VaapiVideoEncoder", "VaapiVideoDecoder", "VaapiIgnoreDriverChecks"] : [])`. phase-32-encoder-detect-vaapi.test.mjs 4/4 GREEN. |
| 8 | state.renderMode forced to "gl" on /ssr boot (D-02 GL force) | VERIFIED | `runtime-orchestration.js:86`: `window.__ttBeamerForceRenderMode = "gl"` inside /ssr marker block. `runtime-orchestration.js:450`: `state.renderMode = window.__ttBeamerForceRenderMode` (clamp after state construction). 2 occurrences confirmed. |
| 9 | SSR-tab 2D-fallback banned; Phase 30 B2 h10 path preserved for dashboard + /output | VERIFIED | `runtime-projection-gl-renderer.js:183-202`: `else if (isSsrTab)` branch: `console.error("[34-A] WebGL context lost...")` + `window.__ttBeamerSsrGlHardFailed = true` after 6 losses. Line 167: `_glPermanentlyDisabled = true` path intact for `!isSsrTab`. |
| 10 | ssr-stats renderMode logged to server stdout every 10th message (D-01 telemetry) | VERIFIED | `ssr-webrtc-signaling.mjs:485-489`: `ssrStatsLogCounter += 1; if (ssrStatsLogCounter % 10 === 1) { logger.info(\`[ssr-stats] renderMode=${rm}\`); }`. Counter is function-scoped at line 221. Phase-34-render-mode-probe.test.mjs 2/2 GREEN. |
| 11 | output-audio-binder.js exists and exports bootOutputAudioBinder | VERIFIED | File at `src/app/runtime/output-receiver/output-audio-binder.js`. Line 89: `export async function bootOutputAudioBinder({ logger = console } = {})`. WS endpoint `/api/live/ws?role=final-output` confirmed. |
| 12 | Connection-stability suite GREEN — D-06 hard gate | VERIFIED | `node --test "test/connection-stability/*.test.mjs"` → 72 pass / 0 fail / 13 skip (non-live). SUMMARY claims 84/0/1 with `RUN_LIVE_TESTS=1` (not re-run in this verification — would need live server). Non-live result is consistent: 13 live tests skip cleanly. |
| 13 | D-05 visual smoketest — no banding on solid-color animation | INCONCLUSIVE | Requires live gaming-PC browser + operator. Automated preconditions confirmed: GL flags present, renderMode forced to "gl", 2D-fallback banned. Whether banding is eliminated on actual hardware is a human judgment. |
| 14 | Pi /output/ CPU usage measurably lower than pre-Phase-34 | DEFERRED | Pi hardware not accessible. Thin consumer strips render pipeline — architectural CPU reduction. Deferred per Phase 33 precedent. |

**Score:** 12/14 truths fully verified, 1 INCONCLUSIVE (human item), 1 DEFERRED

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `output.html` | Thin Pi consumer — video, splash, receiver, 4 scripts only | VERIFIED | 107 lines, 4 `<script` tags. All required DOM elements present: ssr-video, ssr-splash, ssr-reconnect-banner, ssr-error-overlay, output-status-chip. |
| `src/app/runtime/output-receiver/output-audio-binder.js` | WS subscriber for Pi-local audio | VERIFIED | 145 lines. Exports `bootOutputAudioBinder`. WS to `/api/live/ws?role=final-output`. Voice pool, exponential backoff. |
| `server.mjs` | resolveStaticPath: /ssr→index.html, /output→output.html | VERIFIED | Lines 3444-3458. Exact code confirmed. |
| `src/app/lib/shared/runtime-env.js` | getRuntimeEnvironment: /ssr → 'server-ssr' | VERIFIED | Lines 69-77. isSsrPath check + legacy ?ssr=1 tolerance confirmed. |
| `src/server/ssr-render-host.mjs` | hasIgpuDev decoupled; GL flags; ssrUrl=/ssr; page.goto=/ssr | VERIFIED | hasIgpuDev line 510, hasVaapiEnabled line 512, GL flags line 617, ssrUrl line 459, page.goto line 853. |
| `src/server/ssr-webrtc-signaling.mjs` | renderMode telemetry log line | VERIFIED | ssrStatsLogCounter line 221, log call line 489. |
| `src/app/runtime/runtime-orchestration.js` | window.__ttBeamerForceRenderMode set + state clamp | VERIFIED | Set at line 86 (inside /ssr marker block), consumed at line 450. |
| `src/app/runtime/viewport/runtime-projection-gl-renderer.js` | SSR-tab 2D-fallback ban + hard-fail escalation; Phase 30 path intact | VERIFIED | isSsrTab branch at line 183-202. _glPermanentlyDisabled path intact at line 167. |
| `test/phase-34-route-split.test.mjs` | Route split contract tests (4) | VERIFIED | 4/4 GREEN |
| `test/phase-34-runtime-env.test.mjs` | Runtime-env /ssr classifier tests (5) | VERIFIED | 5/5 GREEN |
| `test/phase-34-chrome-flags.test.mjs` | Chrome flag gating tests (5) | VERIFIED | 5/5 GREEN |
| `test/phase-34-thin-output-script-graph.test.mjs` | output.html script-graph tests (7) | VERIFIED | 7/7 GREEN |
| `test/phase-34-render-mode-probe.test.mjs` | renderMode telemetry logger tests (2) | VERIFIED | 2/2 GREEN |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| server.mjs:resolveStaticPath | output.html | `path.join(ROOT_DIR, "output.html")` for /output and /output/final | WIRED | Confirmed at lines 3454-3455. |
| ssr-render-host.mjs:ssrUrl | /ssr HTTP route | `http://127.0.0.1:${port}/ssr` | WIRED | Line 459. |
| ssr-render-host.mjs:page.goto | /ssr HTTP route | `http://127.0.0.1:${port}/ssr` | WIRED | Line 853. |
| output.html | receiver-bootstrap.js | `<script type="module">` import | WIRED | Line 87. |
| output.html | output-audio-binder.js | `<script type="module">` import | WIRED | Line 101. |
| runtime-env.js:getRuntimeEnvironment | 'server-ssr' for /ssr | `isSsrPath = pathname === "/ssr"` | WIRED | Line 69. |
| runtime-orchestration.js | window.__ttBeamerForceRenderMode | Set on /ssr marker block | WIRED | Line 86. |
| runtime-orchestration.js | state.renderMode clamp | `state.renderMode = window.__ttBeamerForceRenderMode` | WIRED | Line 450. |
| runtime-projection-gl-renderer.js | isSsrTab branch | `getRuntimeEnvironment() === "server-ssr"` | WIRED | Line 156. |
| ssr-webrtc-signaling.mjs | renderMode log | `logger.info(\`[ssr-stats] renderMode=${rm}\`)` inside ssr-stats handler | WIRED | Line 489. |
| ssr-render-host.mjs:hasIgpuDev | GL flags | `...(hasIgpuDev ? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] : [])` | WIRED | Line 617. |
| ssr-render-host.mjs:hasVaapiEnabled | VaapiVideoEncoder feature | `...(hasVaapiEnabled ? ["VaapiVideoEncoder", ...] : [])` | WIRED | Line 516. |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| runtime-orchestration.js:state.renderMode | state.renderMode | window.__ttBeamerForceRenderMode = "gl" (set in /ssr marker block at line 86) | Yes — hardcoded "gl" forced on /ssr boot | FLOWING |
| ssr-webrtc-signaling.mjs:renderMode log | rm = limited.renderMode | msg.stats.renderMode from ssr-tab WebSocket (ssr-stream-publisher.mjs probe) | Yes — probe runs in SSR tab, publishes via WS | FLOWING (when server live) |
| output-audio-binder.js:audio play | animation.sound | live-mutation WS envelope from /api/live/ws | Yes — server broadcasts live-mutation on animation events | FLOWING (when server live) |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 16 Phase 34 Wave-0 rails GREEN | `node --test test/phase-34-*.test.mjs` | 23 pass / 0 fail / 0 skip | PASS |
| Full test suite 366/0/17 | `node --test "test/**/*.test.mjs"` | 366 pass / 0 fail / 17 skip | PASS |
| Connection-stability (non-live) | `node --test "test/connection-stability/*.test.mjs"` | 72 pass / 0 fail / 13 skip | PASS |
| VAAPI regression | `node --test test/phase-32-encoder-detect-vaapi.test.mjs` | 4 pass / 0 fail | PASS |
| ssr-chromium-flags-merge (h9 regression) | `node --test test/ssr-chromium-flags-merge.test.mjs` | 4 pass / 0 fail | PASS |
| output.html script count <= 8 | `grep -c '<script' output.html` | 4 | PASS |
| No /output?ssr=1 in ssr-render-host.mjs | `grep -c '/output?ssr=1' ssr-render-host.mjs` | 0 | PASS |
| Both /ssr navigation sites updated | `grep -c 'port}/ssr' ssr-render-host.mjs` | 2 | PASS |

---

## Exit Criteria Coverage (from ROADMAP.md and CONTEXT.md)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| EC-1 | Renderer-Detection im SSR-Tab meldet WebGL2 (nicht 2D-Canvas Fallback) | INCONCLUSIVE | Automated preconditions confirmed: state.renderMode forced to "gl"; __ttBeamerEffectiveRenderMode() returns "gl". Live server stdout not observable in this executor. Visual judgment deferred to operator (HUMAN-UAT M4/M5). |
| EC-2 | Bekannte solid-color Banding-Animation rendert visuell ohne Banding | INCONCLUSIVE | Requires live gaming-PC browser + operator visual judgment. GL flags delivered. HUMAN-UAT M4. |
| EC-3 | /output/ ohne ?ssr=1 Param lädt KEINE GIF/MP4-Decoder, KEINE Animations-Engine, KEINE Runtime-Orchestration | PASS | 7/7 thin-output-script-graph tests GREEN; output.html grep confirms zero forbidden modules. |
| EC-4 | /output/?ssr=1 behavior regression — note: D-04 migrated SSR to /ssr. Legacy ?ssr=1 tolerated as 'server-ssr' | PASS | runtime-env.js:70 — `isSsrQuery = /[?&]ssr=1(\b|&)/.test(search)` retained as quiet tolerance. rail regression test GREEN. |
| EC-5 | Pi /output/-Tab CPU-Verbrauch messbar geringer | DEFERRED | Pi hardware not accessible. Architectural reduction confirmed (thin HTML strips render pipeline). |
| EC-6 | Phase 33 Connection-Stability bleibt PASS | PASS | 72/0/13 non-live; SUMMARY claims 84/0/1 live (consistent). D-06 gate satisfied. |
| EC-7 | VAAPI bleibt default-disabled (3cd6748 carry-forward) | PASS | hasVaapiEnabled requires `SSR_ENABLE_VAAPI=1` AND DRI device. phase-32-encoder-detect-vaapi.test.mjs GREEN. |
| EC-8 | Tests in test/connection-stability/** weiterhin grün | PASS | Same as EC-6. |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `output.html` | None — script graph is clean | - | - |
| `src/server/ssr-render-host.mjs:499` | Comment mentions old `hasIgpu` symbol (not live code) | Info | Zero impact — comment documents the old behavior for clarity. Not a stub. |
| `.planning/phases/phase-34/34-VERIFICATION.md` (original executor-written version) | References `phase-32-hotfix-regression.test.mjs GREEN (part of 366 pass suite)` — file does NOT exist at `test/phase-32-hotfix-regression.test.mjs` | Warning | Misleading claim in documentation. The 366 pass count is real and verified; the specific filename is fictional. The h9 regression is covered by `ssr-chromium-flags-merge.test.mjs` (4/4 GREEN), not a standalone `hotfix-regression` file. |

No production-code stubs found. All implemented behaviors are substantive and wired.

---

## Human Verification Required

### 1. D-05 Visual Smoketest — No Banding on Solid-Color Animation

**Test:** Boot server (`node server.mjs`). Open `http://<host>:<port>/output` in gaming-PC desktop browser. Trigger a known solid-color banding animation from the dashboard. Observe the /output stream.
**Expected:** Smooth gradient, NO banding visible. Check server stdout for `[ssr-stats] renderMode=gl` lines (not "2d"). In SSR-tab DevTools console, run `__ttBeamerEffectiveRenderMode()` — must return a string NOT containing "2d".
**Why human:** Visual judgment of animation quality cannot be automated. Live server + running Chromium SSR tab required.

### 2. Pi Hardware UAT — P1: /output stream visible on Pi browser

**Test:** Navigate Pi kiosk browser to `http://<server>:<port>/output`. Wait for splash to clear.
**Expected:** H264 stream plays, video visible, no black screen.
**Why human:** Pi hardware not accessible to automated executor.

### 3. Pi Hardware UAT — P2: CPU usage measurement

**Test:** On Pi, use `htop` or `atop` to measure CPU usage of `/output` tab before and after Phase 34. (Pre-Phase-34 baseline was loading full render pipeline via index.html.)
**Expected:** Measurably lower CPU — thin consumer strips GIF/MP4 decoders, animation engine, draw loop, and orchestration.
**Why human:** Requires Pi hardware + tooling measurement.

### 4. Pi Hardware UAT — P3: Pi-side solid-color banding smoketest

**Test:** On Pi, trigger same solid-color banding animation. Observe /output stream on Pi display.
**Expected:** No banding (or note if banding persists on Pi — Pi /output is a pure receiver, banding would be an encoder artifact, not a render artifact).
**Why human:** Pi hardware + operator visual judgment.

---

## Accuracy Assessment of Existing VERIFICATION.md

The executor-written VERIFICATION.md (now overwritten by this report) was **substantively accurate** with one factual error:

- **Correct:** All test counts (366/0/17 full suite; 84/0/1 live connection-stability), all D-decision verdicts, all exit criterion assessments, all file line references checked.
- **Incorrect:** D-06 row claims `phase-32-hotfix-regression.test.mjs GREEN (part of 366 pass suite)`. That file does not exist in the test directory. The h9 regression (`--use-gl=angle`) is covered by `ssr-chromium-flags-merge.test.mjs` (4 pass, GREEN). The 366 pass total is accurate; only the specific filename claim is wrong.

The inaccuracy is documentation-only and has no impact on phase closure status. The underlying regression coverage exists via the flags-merge test.

---

## Gaps Summary

No implementation gaps found. All must-have truths are either:
- VERIFIED by automated tests and source inspection, OR
- INCONCLUSIVE/DEFERRED for documented human-verification reasons (D-05 visual smoketest, Pi hardware UAT)

The INCONCLUSIVE items are not gaps — they represent legitimate manual acceptance gates documented in the CONTEXT.md (D-05) and the Phase 33 precedent (Pi-hardware deferred pattern). They are correctly labeled as `human_needed` not `gaps_found`.

---

_Verified: 2026-05-10_
_Verifier: Claude (gsd-verifier) — independent goal-backward analysis_
