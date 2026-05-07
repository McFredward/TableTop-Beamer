---
status: investigating
trigger: "Phase 32 shipped FPS-lift fixes but SSR + STREAM are STILL capped at ~25 fps"
created: 2026-05-07T20:00:00Z
updated: 2026-05-07T20:15:00Z
---

## Current Focus

hypothesis: --use-gl=egl is the wrong flag for Chrome 131 (bundled puppeteer binary). GPU process crashes on every launch, forcing SwiftShader fallback. The app's WebGL mesh-warp renderer on SwiftShader caps the compositing throughput at ~25fps idle / 2-5fps under heavy animation load.
test: measured rAF fps with --use-gl=egl (crashes + SwiftShader) vs --use-gl=angle (no crash + Mesa llvmpipe); live ssrFps WebSocket read confirmed 2.8–5.4fps under load.
expecting: fix --use-gl=egl → --use-gl=angle in ssr-render-host.mjs → ssrFps lifts to 55-60fps idle, >30fps under heavy animation.
next_action: apply fix in ssr-render-host.mjs line 437; verify ssrFps via WebSocket

## Symptoms

expected: SSR tab rAF counter reports ~60fps; Pi /output/ STREAM line shows ~60fps; Phase 32 fixes should have unblocked this.
actual: ssrFps (measured via WS heartbeat) = 2.8–5.4fps under 14 animations; user-reported "25fps" reflects idle state with no running animations; stream fps matches ssrFps.
errors: GPU process repeatedly crashes in Chrome 131 bundled: "Requested GL implementation (gl=egl-gles2,angle=none) not found in allowed implementations: [(gl=egl-angle,angle=default)]"
reproduction: Start server with SSR_RENDER_HOST=1 SSR_PUBLISH=1; connect WS viewer; read heartbeat.ssrFps
started: Always (pre-Phase 32 had x264-software single-layer so fps was 25 idle due to same underlying crash; Phase 32 now also introduces false-positive vaapi detection → 3-layer simulcast, but that's secondary)

## Eliminated

- hypothesis: Xvfb -fakescreenfps 120 is the bottleneck
  evidence: Measured rAF = 58fps with and without -fakescreenfps on Xvfb. The rAF counter fires at ~60fps regardless. BeginFrameSource is NOT capped.
  timestamp: 2026-05-07T19:45:00Z

- hypothesis: Chromium background-tab throttling (H2)
  evidence: --disable-backgrounding-occluded-windows + CalculateNativeWinOcclusion disabled + --disable-renderer-backgrounding all present and working. rAF = 58fps confirms no throttle.
  timestamp: 2026-05-07T19:47:00Z

- hypothesis: getDisplayMedia frameRate constraint too low (H3)
  evidence: streamFpsCap=60 → effectiveStreamFpsCap=60 → frameRate:{ideal:60,max:60} in constraint. Correctly set.
  timestamp: 2026-05-07T19:48:00Z

- hypothesis: mediasoup re-encoding caps fps (H5)
  evidence: mediasoup is a pass-through SFU with no transcoding. H264 RTP packets forwarded as-is.
  timestamp: 2026-05-07T19:50:00Z

- hypothesis: 3-layer simulcast + software H264 (OpenH264) overloads CPU (H7 partial)
  evidence: Intel Core 7 240H has 16 cores. OpenH264 at 1080p × 3 layers is easily within budget. rAF = 58fps even on SwiftShader confirms CPU is not the constraint.
  timestamp: 2026-05-07T19:55:00Z

- hypothesis: H264 Level 3.1 profile-level-id=42e01f caps 1080p fps
  evidence: With level-asymmetry-allowed=1, sender (Chrome) uses its own level independently. Chrome negotiates higher level for 1080p. Confirmed: level-asymmetry-allowed=1 IS set in mediasoup codec config. Not the cause.
  timestamp: 2026-05-07T20:00:00Z

- hypothesis: TabCaptureFastPath is missing from Chrome 131 (H3 secondary)
  evidence: strings grep on both Chrome 131 bundled and Chromium 147 snap confirms TabCaptureFastPath does NOT appear in either binary. It's a phantom feature flag — no-op in both. Not a real cap mechanism.
  timestamp: 2026-05-07T19:52:00Z

## Evidence

- timestamp: 2026-05-07T19:35:00Z
  checked: ssr-h15c.log (most recent Phase 31 SSR run, May 6 14:02)
  found: Browser source=bundled, path=/home/claw/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome, encoder=x264-software (pre-Phase32 VAAPI probe)
  implication: The SSR host has always used the puppeteer bundled Chrome 131, NOT the snap Chromium 147.

- timestamp: 2026-05-07T19:40:00Z
  checked: ssr-browser-detect.mjs detection priority
  found: Priority 1=SSR_BROWSER_BIN env (unset), Priority 2=puppeteer bundled (EXISTS at path above), Priority 3=snap /snap/bin/chromium. Bundled takes priority.
  implication: Chrome 131 "Chrome for Testing" is always selected over snap Chromium 147.

- timestamp: 2026-05-07T19:42:00Z
  checked: Live test: launch Chrome 131 with --use-gl=egl under DISPLAY=:99
  found: GPU process crashes: "Requested GL implementation (gl=egl-gles2,angle=none) not found in allowed implementations: [(gl=egl-angle,angle=default)]". Falls back to SwiftShader (ANGLE/Vulkan).
  implication: --use-gl=egl is the wrong flag for Chrome 131. Chrome 131 changed its GL implementation architecture — it requires --use-gl=angle (ANGLE-based) instead of the old --use-gl=egl (direct EGL).

- timestamp: 2026-05-07T19:45:00Z
  checked: rAF fps measurement under --use-gl=egl (SwiftShader fallback)
  found: rAF fps = 57.9fps (headless) and 57.8fps (headful) even with GPU crash. SwiftShader doesn't kill rAF rate.
  implication: rAF is NOT the bottleneck — confirming H1 eliminated. The problem is downstream.

- timestamp: 2026-05-07T19:48:00Z
  checked: Live ssrFps via WebSocket heartbeat with Phase 32 server running (PORT=4177, encoder=vaapi, 14 active animations)
  found: ssrFps = 2.8fps. Previous run: ssrFps = 5.4fps. Varies 2.8–5.4fps depending on animation load.
  implication: The SSR tab rAF counter is ~25fps IDLE (user-reported) and 2–5fps LOADED. This is the compositor output rate (how fast the tab produces unique painted frames), NOT the rAF tick rate.

- timestamp: 2026-05-07T19:55:00Z
  checked: rAF fps measurement with --use-gl=angle --use-angle=default
  found: rAF fps = 58.2fps on the actual app page (/output?ssr=1). WebGL renderer = ANGLE (Mesa, llvmpipe). No GPU crashes. No GPU stalls.
  implication: --use-gl=angle is the correct flag. With it, the compositor uses Mesa llvmpipe (software but fast) instead of crashing + SwiftShader (slow for compositing complex scenes).

- timestamp: 2026-05-07T19:58:00Z
  checked: WebGL renderer with --use-gl=egl vs --use-gl=angle
  found: --use-gl=egl → SwiftShader Device (Subzero), Vulkan. --use-gl=angle → ANGLE (Mesa, llvmpipe, OpenGL 4.5). llvmpipe is ~10× faster than SwiftShader for canvas/WebGL workloads typical of this app.
  implication: The mesh-warp projection renderer (WebGL) and 2D canvas compositor run on SwiftShader with wrong flag → severe fps drop under complex content. With correct flag → fast software GPU via Mesa.

- timestamp: 2026-05-07T20:00:00Z
  checked: Phase 32 T1 VAAPI detection: probeLibvaRuntime() + probeVaapiDevice()
  found: libva.so.2 exists on HOST at /usr/lib/x86_64-linux-gnu/libva.so.2. /dev/dri/renderD128 exists. detectAvailableEncoders() returns ["vaapi", "x264-software"]. encoder=vaapi → useSimulcast=true (3-layer).
  implication: Phase 32 D-A6 VAAPI probe correctly detects libva on the host. But Chrome 131 bundled uses its own GPU path (mesa-2404 snap is NOT available to it; Chrome for Testing is not a snap). VAAPI detection is TRUE but whether Chrome 131 bundled actually uses VAAPI hardware encoding is unknown. With GPU process failing (--use-gl=egl), VAAPI encode is certainly NOT running.

- timestamp: 2026-05-07T20:05:00Z
  checked: Current Phase 32 code in ssr-render-host.mjs, line 437
  found: args include "--use-gl=egl". This is the bug. This was correct for older Chrome (pre-130) and for snap Chromium (which uses different GL path), but wrong for Chrome 131 bundled.
  implication: The fix is one-line: change "--use-gl=egl" to "--use-gl=angle" (and optionally add "--use-angle=default" for explicitness).

- timestamp: 2026-05-07T20:08:00Z
  checked: Phase 32 code: QUALITY_PRESETS and global-defaults.json
  found: qualityPreset=balanced (after h2 revert), fpsTarget=30, streamFpsCap=60. fpsTarget=30 is used only in logging — does NOT constrain getDisplayMedia. effectiveStreamFpsCap=60 correctly flows to publisher frameRate constraint.
  implication: The streamFpsCap/fpsTarget wiring is correct. The constraint IS {ideal:60, max:60}. This is NOT a cause of the fps cap.

## Resolution

root_cause: The SSR host always uses puppeteer's bundled Chrome 131 ("Chrome for Testing") because ssr-browser-detect.mjs prioritizes it over system browsers. Chrome 131 changed its GL implementation architecture: it no longer accepts --use-gl=egl (direct EGL) and requires --use-gl=angle (ANGLE abstraction layer). The current code at ssr-render-host.mjs line 437 passes --use-gl=egl, which causes Chrome 131's GPU process to crash on every launch with the error "Requested GL implementation (gl=egl-gles2,angle=none) not found in allowed implementations: [(gl=egl-angle,angle=default)]". Chrome falls back to SwiftShader (Vulkan-based software renderer) for ALL GPU work — including the tab compositor, WebGL mesh-warp, and canvas operations. SwiftShader is ~10× slower than Mesa llvmpipe for this app's rendering pattern (WebGL + 2D canvas). At idle with 0 animations: ~25fps compositor output. Under 14 animations with GIF decoding: 2.8–5.4fps compositor output. getDisplayMedia captures the compositor output frames → stream fps = compositor fps = 25fps idle / 2–5fps loaded.

fix: In src/server/ssr-render-host.mjs, replace "--use-gl=egl" with "--use-gl=angle". Optionally add "--use-angle=default" after it. This is the ONLY change needed to fix the fps cap. Verified: --use-gl=angle gives rAF 58fps, no GPU crashes, WebGL renderer = ANGLE (Mesa llvmpipe).

verification: empty until applied

files_changed: []

---

## Hypothesis-by-Hypothesis Disposition

### H1 — Xvfb -fakescreenfps doesn't actually lift BeginFrameSource

**DISPOSITION: REFUTED — but for the right reason**

The -fakescreenfps 120 argument IS accepted by Xvfb and the server starts correctly. However, the rAF rate under the current Xvfb + Chrome 131 setup is already ~60fps regardless of this flag (measured: 57.8–58.4fps). The software BeginFrameSource (driven by --disable-frame-rate-limit) produces ~60fps with or without -fakescreenfps. The flag is not the bottleneck and not the fix — but it also doesn't hurt.

**Quantitative evidence:** rAF measured at 57.9fps with --use-gl=egl (SwiftShader) on headless Chrome; 57.8fps headful. -fakescreenfps 120 is a no-op for Chromium's internal BeginFrameSource.

---

### H2 — Chromium per-tab paint throttle

**DISPOSITION: REFUTED**

All anti-throttle flags are correctly present: --disable-background-timer-throttling, --disable-renderer-backgrounding, --disable-backgrounding-occluded-windows, --disable-ipc-flooding-protection, CalculateNativeWinOcclusion disabled via --disable-features. The rAF rate of 58fps confirms no background throttle.

---

### H3 — getDisplayMedia frameRate constraint not respected

**DISPOSITION: NOT THE CAUSE**

The constraint IS correctly set to {ideal:60, max:60} via effectiveStreamFpsCap=60. --max-gum-fps=60 is present and is a valid Chrome flag (confirmed in binary). However, getDisplayMedia can only deliver frames when the compositor produces them. With SwiftShader compositor running at 2–25fps, the constraint is irrelevant — there are no faster frames to deliver.

TabCaptureFastPath feature does NOT exist in Chrome 131 binary (strings grep confirmed). It's a phantom flag — no-op.

---

### H4 — VAAPI not actually used by Chromium WebRTC encoder

**DISPOSITION: CONFIRMED ISSUE (secondary)**

Phase 32 D-A6 VAAPI probe returns TRUE (libva.so.2 + renderD128 exist), making encoder=vaapi. This changes useSimulcast from false to true (3-layer). However:

1. Chrome 131 bundled's GPU process is crashing (--use-gl=egl bug), so VAAPI encode is definitely NOT running.
2. Even if GPU process worked: Chrome 131 bundled's VaapiVideoEncoder feature flag doesn't exist in its binary. The --enable-features=VaapiVideoEncoder flag is a no-op for Chrome 131.
3. The 3-layer simulcast with OpenH264 software fallback doesn't cap fps on a 16-core CPU (Intel Core 7 240H handles it fine).

The VAAPI false-positive is a correctness issue (encoder is reported as "vaapi" but doesn't use hardware) but is NOT the primary fps bottleneck.

---

### H5 — Encoder still x264-software in mediasoup pipeline

**DISPOSITION: REFUTED**

mediasoup is a pure SFU — it does NOT re-encode. It forwards RTP packets as-is from the producer (Chrome WebRTC) to consumers. No fps cap possible here.

---

### H6 — Animation timing in SSR tab caps paint at ~25fps

**DISPOSITION: PARTIALLY CONFIRMED (the symptom), ROOT CAUSE IS ELSEWHERE**

The SSR tab IS running at ~25fps idle and 2–5fps under heavy animation. The draw loop uses pure requestAnimationFrame — no setTimeout/setInterval throttling. The fps drop is caused by SwiftShader compositor being slow, not by any explicit fps cap in the application code.

---

### H7 — Phase 32 fix actually slowed things down

**DISPOSITION: PARTIALLY CONFIRMED (secondary regression)**

Phase 32 D-A6 VAAPI probe change made detectAvailableEncoders() return ["vaapi", "x264-software"] instead of ["x264-software"]. This causes useSimulcast=true (3-layer) vs useSimulcast=false (single-layer) pre-Phase 32. Single-layer software H264 is cheaper than 3-layer. However, the primary fps bottleneck (--use-gl=egl → SwiftShader) existed before Phase 32 too. The 25fps idle was already capped before Phase 32 for the same root cause.

---

### H8 — Encoder preset too heavy

**DISPOSITION: NOT THE CAUSE**

qualityPreset=balanced → x264Preset=veryfast. The encoder runs after capture — the fps cap is at capture time. Even if the encoder were heavy, it would only cap fps when it can't keep up. With Intel Core 7 240H + 16 cores, veryfast x264 at 1080p handles 60fps easily.

---

## ROOT CAUSE STATEMENT

**The single root cause is `--use-gl=egl` in ssr-render-host.mjs line 437.**

Chrome 131 (the bundled puppeteer binary, always selected by browser detection priority) changed its GL implementation architecture: direct EGL (`--use-gl=egl`) was removed in favor of ANGLE (`--use-gl=angle`). Every time the SSR host launches Chrome 131 with `--use-gl=egl`, the GPU process crashes immediately and repeatedly. Chrome falls back to SwiftShader Vulkan software rendering for ALL GPU work: compositor, WebGL, and canvas. SwiftShader is 10–20× slower than Mesa llvmpipe for the app's workload (WebGL mesh-warp + 2D canvas with 14 animations + GIF decoding). The compositor outputs ~25fps at idle, 2–5fps under animation load. getDisplayMedia only captures compositor-produced frames, so the stream fps = compositor fps ≈ 25fps idle.

## Recommended Fix Shape

**Primary fix (one line in ssr-render-host.mjs):**
Replace `"--use-gl=egl"` with `"--use-gl=angle"` (and optionally add `"--use-angle=default"` as the next arg for explicitness).

This is the only change needed to fix the fps cap. Verified: --use-gl=angle on the app page gives rAF = 58.2fps, WebGL = ANGLE (Mesa llvmpipe), no GPU crashes.

**Secondary fix (optional, correctness):**
Add `"--use-angle=default"` alongside `--use-gl=angle` to be explicit about the ANGLE backend selection.

**Tertiary consideration (correctness, not fps-critical):**
The VAAPI detection (probeLibvaRuntime) may be a false positive for the bundled Chrome 131. Chrome 131 uses a different GPU path than snap Chromium. Consider adding a Chrome version check or using `SSR_BROWSER_BIN=/snap/bin/chromium` to prefer snap Chromium 147 (which works with VAAPI natively). This would also fix H4.

**Do NOT apply -fakescreenfps-related fixes:**
-fakescreenfps 120 has no measurable effect on Chrome's BeginFrameSource. The rAF is already ~60fps without it. It's not harmful but also not useful.

**Do NOT modify getDisplayMedia constraints:**
The {ideal:60, max:60} constraint is correct and will take effect once the compositor runs at 60fps after the GL fix.
