---
phase: 35
plan: C
type: execute
wave: 2
depends_on:
  - 35-W0-PLAN
files_modified:
  - src/app/runtime/render/runtime-effect-dither.js
  - src/app/runtime/render/runtime-effect-visuals.js
  - src/server/ssr-render-host.mjs
autonomous: false
requirements:
  - D-03
  - D-04
  - D-06
must_haves:
  truths:
    - "src/app/runtime/render/runtime-effect-dither.js exists, exports getDitheredSolidColorImageData({hex, alpha, width, height}) returning ImageData with the EXACT Bayer 4×4 matrix from RESEARCH §C.3"
    - "test/phase-35-bayer-dither.test.mjs goes RED → GREEN — node --test exits 0"
    - "runtime-effect-visuals.js solid-color path (lines 282-284 fillRect call) replaced with putImageData(getDitheredSolidColorImageData(...)) in the non-skipClear branch (skipClear branch unchanged — additive composite doesn't show banding)"
    - "test/live-e2e/test_phase35_fps_benchmark.py reports effective_fps within 5 fps of the Wave-0 baseline (D-04 ≤5 fps cap)"
    - "If C2 escalation triggers (FPS < 25 or visual still bands), ssr-render-host.mjs `--use-angle=default` swapped to `--use-angle=swiftshader` — `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` UNCHANGED (Phase 34 h2 LOCK)"
    - "D-06 hard gate: test/connection-stability/** stays 72/0/13 — relevant ONLY if C2 escalation triggers (touches ssr-render-host.mjs); C1 alone touches no critical files"
  artifacts:
    - path: "src/app/runtime/render/runtime-effect-dither.js"
      provides: "Bayer 4×4 dither helper. ~80 LOC. Exports getDitheredSolidColorImageData({hex, alpha, width, height}) → ImageData with cached results keyed on `hex-alphaQ-w-h`."
      min_lines: 60
      contains: "BAYER_4X4"
    - path: "src/app/runtime/render/runtime-effect-visuals.js"
      provides: "solid-color path (line ~284 fillRect) replaced with putImageData of dithered ImageData. The skipClear (lighter composite) path unchanged."
    - path: "src/server/ssr-render-host.mjs"
      provides: "(C2 ESCALATION ONLY — gated by FPS measurement) `--use-angle=default` → `--use-angle=swiftshader` swap at line 564. NO OTHER FLAG CHANGES."
  key_links:
    - from: "src/app/runtime/render/runtime-effect-visuals.js"
      to: "src/app/runtime/render/runtime-effect-dither.js"
      via: "import { getDitheredSolidColorImageData }"
      pattern: "getDitheredSolidColorImageData|runtime-effect-dither"
    - from: "src/app/runtime/render/runtime-effect-dither.js"
      to: "BAYER_4X4 16-element constant"
      via: "module-scope const array [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5]"
      pattern: "BAYER_4X4|0,\\s*8,\\s*2,\\s*10"
---

<objective>
Track C per D-03 + D-04 (LOCKED): apply source-side Bayer 4×4 dithering to the solid-color overlay rendering in `runtime-effect-visuals.js` so that 8-bit-per-channel canvas blending no longer produces visible Mach-band step artifacts.

Two-phase strategy:
- **C1 (primary, default per D-03):** Bayer 4×4 dither in the 2D-canvas color-overlay rendering. Implementation per RESEARCH §C.3 — new `runtime-effect-dither.js` helper module + putImageData replacement at `runtime-effect-visuals.js:284`.
- **C2 (fallback, per D-03):** ONLY if FPS measurement after C1 shows < 25fps (D-04 floor), swap `--use-angle=default` → `--use-angle=swiftshader` at `ssr-render-host.mjs:564`. NO OTHER GL FLAG CHANGES (Pitfall 1, Phase 34 h2 LOCK).
- **C3 (deferred per D-03):** VAAPI opt-in test — out of scope for this plan.

Track C is INDEPENDENT of Tracks A and B — touches `runtime-effect-visuals.js` (render layer) and optionally `ssr-render-host.mjs`. Can run parallel to Track A wave.

The CORRECT C2 swift-shader flag form is `--use-gl=angle --use-angle=swiftshader` per RESEARCH §C.5 (Pitfall 8). The CONTEXT.md hint "use --use-gl=swiftshader" is wrong — Chromium docs explicitly mark it broken.

Output: 1 new dither helper + modified runtime-effect-visuals.js (solid-color path) + (conditional) ssr-render-host.mjs C2 swap. test/phase-35-bayer-dither.test.mjs RED → GREEN. FPS benchmark within 5 fps of baseline.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-35/35-CONTEXT.md
@.planning/phases/phase-35/35-RESEARCH.md
@.planning/phases/phase-35/35-W0-SUMMARY.md

# Files being modified
@src/app/runtime/render/runtime-effect-visuals.js
@src/server/ssr-render-host.mjs

# RED test that must transition to GREEN
@test/phase-35-bayer-dither.test.mjs

# FPS benchmark rail
@test/live-e2e/test_phase35_fps_benchmark.py

# D-06 hard gate (only matters if C2 triggers)
@test/connection-stability/

# Phase 34 hotfix h2 — DO NOT touch this gate logic
# (--ignore-gpu-blocklist + --enable-gpu-rasterization gated on hasVaapiEnabled)
</context>

<interfaces>
<!-- Bayer 4×4 matrix — paste verbatim into runtime-effect-dither.js -->

```javascript
// THE Bayer 4×4 matrix per RESEARCH §C.3 — public-domain, canonical since 1973.
const BAYER_4X4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];
```

<!-- Full helper module body — paste from RESEARCH §"Code Examples / Bayer 4×4 dither for solid-color overlay" -->

```javascript
// New: src/app/runtime/render/runtime-effect-dither.js
const BAYER_4X4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];
const _ditherCache = new Map(); // key: "hex-alpha100-w-h" → ImageData

export function getDitheredSolidColorImageData({ hex, alpha, width, height }) {
  const alphaQ = Math.round(alpha * 100); // quantize to ~1% steps (cache hit-rate optimization per Pitfall 7)
  const key = `${hex}-${alphaQ}-${width}-${height}`;
  let cached = _ditherCache.get(key);
  if (cached) return cached;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a8 = Math.round(alpha * 255);

  const img = new ImageData(width, height);
  const data = img.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = BAYER_4X4[((y & 3) << 2) | (x & 3)];
      const d = (t / 16) - (7.5 / 16); // ∈ [-0.47, 0.47] LSB
      const i = (y * width + x) * 4;
      data[i]     = Math.max(0, Math.min(255, Math.round(r + d)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g + d)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b + d)));
      data[i + 3] = a8;
    }
  }
  _ditherCache.set(key, img);
  // Cap cache size — simple FIFO eviction at ~256 entries
  if (_ditherCache.size > 256) {
    const firstKey = _ditherCache.keys().next().value;
    _ditherCache.delete(firstKey);
  }
  return img;
}

export { BAYER_4X4 }; // exposed for testing only
```

<!-- The fillRect site to replace at runtime-effect-visuals.js — exact line context: -->

CURRENT (line 284 in master, inside the solid-color block at lines 238-285):
```javascript
// runtime-effect-visuals.js:280-284
c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
c.clearRect(roomMinX, roomMinY, roomWidth, roomHeight);  // line 282
c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);   // line 284
```

AFTER C1 (per RESEARCH §"Refactored runtime-effect-visuals.js solid-color path"):
```javascript
const skipClear = c.globalCompositeOperation === "lighter";
if (skipClear) {
  // additive composite — banding doesn't show; keep fillRect
  c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);
} else {
  // Phase 35 C1: dithered fill replaces fillRect's banded blend
  c.clearRect(roomMinX, roomMinY, roomWidth, roomHeight);
  const dithered = getDitheredSolidColorImageData({
    hex,
    alpha,
    width: Math.max(1, Math.round(roomWidth)),
    height: Math.max(1, Math.round(roomHeight)),
  });
  c.putImageData(dithered, Math.round(roomMinX), Math.round(roomMinY));
}
return;
```

<!-- C2 escalation flag swap (CONDITIONAL on FPS measurement) — exact site at ssr-render-host.mjs:564 -->

CURRENT (line 563-564):
```javascript
"--use-gl=angle",
"--use-angle=default",
```

AFTER C2 ESCALATION (only triggers if FPS < 25 after C1):
```javascript
"--use-gl=angle",
"--use-angle=swiftshader",
```

DO NOT TOUCH the surrounding lines — `--ignore-gpu-blocklist` + `--enable-gpu-rasterization` STAY gated on `hasVaapiEnabled` (Phase 34 h2 LOCK, Pitfall 1).
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/app/runtime/render/runtime-effect-dither.js — turn RED test GREEN</name>
  <read_first>
    - .planning/phases/phase-35/35-RESEARCH.md §"Code Examples / Bayer 4×4 dither for solid-color overlay" (paste-ready code)
    - .planning/phases/phase-35/35-RESEARCH.md §C.3 (Bayer 4×4 matrix + design rationale)
    - .planning/phases/phase-35/35-RESEARCH.md §"Pitfall 7" (cache miss storm — quantize alpha to 1% for cache hit rate)
    - test/phase-35-bayer-dither.test.mjs (the contract — 4 sub-tests covering exports, ImageData shape, non-uniform pixel values, BAYER_4X4 sanity)
  </read_first>
  <behavior>
    - Test: getDitheredSolidColorImageData is exported as a function.
    - Test: returns an ImageData of the requested {width, height}.
    - Test: pixel values for #7f7f7f at alpha=1 vary by at least 2 distinct R values across the 16x16 tile (proof Bayer matrix took effect).
    - Test: BAYER_4X4 (if exported) has length 16 with values 0-15 each appearing once.
  </behavior>
  <files>src/app/runtime/render/runtime-effect-dither.js</files>
  <action>
Create `src/app/runtime/render/runtime-effect-dither.js` per D-03 C1.

Paste the FULL helper code from RESEARCH §"Code Examples / Bayer 4×4 dither for solid-color overlay" verbatim. Key requirements:

1. **Use the EXACT Bayer 4×4 matrix** from RESEARCH §C.3:
```javascript
const BAYER_4X4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];
```

2. **Export `getDitheredSolidColorImageData({ hex, alpha, width, height })`** — returns ImageData of size width×height with each pixel's RGB modulated by Bayer-pattern threshold ±0.47 LSB.

3. **Cache results** in a Map keyed on `${hex}-${alphaQ}-${width}-${height}` where `alphaQ = Math.round(alpha * 100)` — quantization per Pitfall 7 (cache miss storm prevention).

4. **FIFO eviction** when cache exceeds 256 entries — simple `keys().next().value` eviction (no LRU complexity needed).

5. **Optionally export `BAYER_4X4`** for the test's sanity check (Task assertion 4 in test file).

6. Add a top-level module comment explaining:
   - Why Bayer over blue-noise (RESEARCH §C.2 — moving content + H264 compression)
   - Why dither at all (RESEARCH §C.1 — 8-bit-per-channel rgba(r,g,b,a) blending produces step bands at sub-1.0 alpha)
   - Cache key rationale (Pitfall 7 quantization)

Total target: ~60-100 LOC.

After creating, run `node --test test/phase-35-bayer-dither.test.mjs` — must transition RED → GREEN.
  </action>
  <verify>
    <automated>node --test test/phase-35-bayer-dither.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - File exists at src/app/runtime/render/runtime-effect-dither.js
    - File contains `export function getDitheredSolidColorImageData` (grep)
    - File contains the EXACT 16-element Bayer matrix `0,  8,  2, 10` (grep verbatim)
    - File contains `_ditherCache` Map and FIFO eviction (grep `_ditherCache.delete`)
    - File contains alpha quantization `Math.round(alpha * 100)` (grep)
    - `node --test test/phase-35-bayer-dither.test.mjs` exits 0 (RED → GREEN, all 4 sub-tests pass)
    - File LOC: 60-150
  </acceptance_criteria>
  <done>runtime-effect-dither.js shipped; D-03-C1 unit test GREEN; helper ready for runtime-effect-visuals.js consumption.</done>
</task>

<task type="auto">
  <name>Task 2: Wire dither into runtime-effect-visuals.js solid-color path</name>
  <read_first>
    - src/app/runtime/render/runtime-effect-visuals.js lines 238-285 (the solid-color block)
    - src/app/runtime/render/runtime-effect-dither.js (just created — getDitheredSolidColorImageData signature)
    - .planning/phases/phase-35/35-RESEARCH.md §"Refactored runtime-effect-visuals.js solid-color path" (paste-ready code for the replacement)
    - .planning/phases/phase-35/35-RESEARCH.md §C.1 (only the non-skipClear branch needs dithering — additive composite doesn't band)
  </read_first>
  <files>src/app/runtime/render/runtime-effect-visuals.js</files>
  <action>
Modify `src/app/runtime/render/runtime-effect-visuals.js`:

1. **Add import at top** (after existing imports — preserve all other code):
```javascript
import { getDitheredSolidColorImageData } from "./runtime-effect-dither.js";
```

NOTE: if existing file uses script-style not module-style, add at top of the IIFE OR convert to a module-scope import — match the surrounding file's style. If file is already an ES module, use the import. If it's a script with IIFE, use a `<script src="runtime-effect-dither.js" defer>` style + window-global lookup (mirroring existing pattern). **Read the file first to confirm style.**

2. **Modify the solid-color block** (lines 238-285) — specifically the fillRect at line 284. Per RESEARCH §"Refactored runtime-effect-visuals.js solid-color path":

```javascript
// Existing variables r, g, b, alpha, hex, roomMinX, roomMinY, roomWidth, roomHeight, c are already in scope
const skipClear = c.globalCompositeOperation === "lighter";
if (skipClear) {
  // Additive composite — banding doesn't show in this path; keep existing fillRect
  c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);
} else {
  // Phase 35 C1: dithered fill replaces banded fillRect
  c.clearRect(roomMinX, roomMinY, roomWidth, roomHeight);
  const dithered = getDitheredSolidColorImageData({
    hex,
    alpha,
    width: Math.max(1, Math.round(roomWidth)),
    height: Math.max(1, Math.round(roomHeight)),
  });
  c.putImageData(dithered, Math.round(roomMinX), Math.round(roomMinY));
}
return;
```

3. **DO NOT MODIFY** the OTHER fillRect sites in the file (lines 89, 137, 166, 172, 181, 188, 200, 201) — RESEARCH §C.1 confirms those are minor lights/dim overlays and not the user-visible banding source. Out of scope for Phase 35.

4. **DO NOT modify the line-by-line existing code outside lines 280-284 of the solid-color block** — preserve all surrounding context including the variable definitions for r/g/b/alpha/hex/roomMinX/etc.

5. **Re-run JS suite + run live FPS benchmark:**
- `node --test test/**/*.test.mjs` — all GREEN (no regression)
- `python -m pytest test/live-e2e/test_phase35_fps_benchmark.py -v` — print effective_fps; compare to Wave-0 baseline.

If FPS dropped > 5: this triggers Task 3 (C2 escalation). If FPS within 5: Track C1 is sufficient; Task 3 SKIPPED.

Note: skipClear branch is for "lighter" composite operations (additive blending — the canvas accumulates light values). Banding doesn't appear in additive blending because the destination buffer is mostly black; small alpha increments add discrete brightness levels but the human eye doesn't perceive them as bands. Only the "source-over" composite (skipClear=false, the default) shows the bands — that's where dither is applied.
  </action>
  <verify>
    <automated>node --test test/**/*.test.mjs 2>&1 | tail -5; python -m pytest test/live-e2e/test_phase35_fps_benchmark.py -v 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - runtime-effect-visuals.js contains `import { getDitheredSolidColorImageData }` OR equivalent module/IIFE access (grep)
    - runtime-effect-visuals.js contains `c.putImageData(dithered` in the solid-color block (grep)
    - runtime-effect-visuals.js still has the OTHER fillRect calls at lines 89, 137, 166, 172, 181, 188, 200, 201 (grep `fillRect` returns >= 8 occurrences after change — minus 1 for the replaced site = 7+; verify by counting)
    - The `skipClear` branch keeps the original fillRect (grep within the block)
    - JS suite still passes; phase-35-bayer-dither GREEN; phase-35-output-live-sync GREEN; phase-35-bootalignmode-shape GREEN if Track A landed
    - FPS benchmark prints a number; compare to Wave-0 baseline; record delta
    - If delta ≤ 5 fps: ACCEPTABLE (D-04 met); proceed to Task 4 (C1 sufficient)
    - If delta > 5 fps OR effective_fps < 25: ESCALATE to Task 3 (C2)
  </acceptance_criteria>
  <done>Solid-color path now dithered. FPS measured. Decision point: C1 sufficient → skip Task 3; C1 insufficient → run Task 3.</done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 3: C2 ESCALATION DECISION POINT — SwiftShader flag swap (conditional)</name>
  <read_first>
    - Output of Task 2: FPS benchmark numbers
    - .planning/phases/phase-35/35-RESEARCH.md §C.5 (SwiftShader flag-form correction; risk assessment)
    - .planning/phases/phase-35/35-RESEARCH.md §"Pitfall 1" (GL-flag decoupling causes Phase-33-class hang — DO NOT touch other flags)
    - .planning/phases/phase-35/35-RESEARCH.md §"Pitfall 8" (the correct flag form)
    - src/server/ssr-render-host.mjs lines 549-570 (the GL flag site — read context)
  </read_first>
  <decision>
Should we apply C2 SwiftShader escalation?

Decision criteria from D-04 (LOCKED):
- Delta vs Wave-0 baseline > 5 fps → C2 likely needed
- effective_fps < 25 → C2 REQUIRED
- Visual UAT (operator on gaming-PC, before/after screenshots): bands still visible after C1 → C2 should be tried

If C1 is sufficient (delta ≤ 5 fps AND no visual bands AND fps ≥ 25), this task is a no-op — log decision and skip Task 3 implementation.

If C2 is required, implement: swap `--use-angle=default` → `--use-angle=swiftshader` at ssr-render-host.mjs line 564 ONLY. Do NOT touch any other GL flag.
  </decision>
  <context>
The C2 swap touches `ssr-render-host.mjs` which IS in the D-06 5-critical-files list. Any commit to this file MUST run `RUN_LIVE_TESTS=1 node --test test/connection-stability/` before merge.

Phase 33 hang root cause was VAAPI's synchronous-flush calls. Phase 34 h2 reproduced a similar Mesa-llvmpipe synchronous-flush hang when GL flags were decoupled. SwiftShader is Google's pure-CPU implementation (per RESEARCH §C.5) — DOES NOT route through DRI/Mesa, so its threading model is independent of the Mesa hang root cause. **Likely safe** but unverified on Lenovo Mini.

Wave-0 D-05 test_server_log_clean is the safety net: if SwiftShader DOES hang, server stderr accumulates `health ping failed` and the test fails. Roll back the flag immediately.
  </context>
  <options>
    <option id="c1-sufficient">
      <name>C1 is sufficient — skip C2</name>
      <pros>No risk to D-06; smaller diff; less to revert</pros>
      <cons>None if C1 truly meets the FPS budget AND visual quality</cons>
      <when>Delta ≤ 5 fps, effective_fps ≥ 25, visual UAT shows no bands</when>
    </option>
    <option id="c2-escalate">
      <name>C2 escalation — SwiftShader flag swap</name>
      <pros>Internal 16-bit-fp render precision (per RESEARCH §C.5); no source-side dither needed; full color depth</pros>
      <cons>D-06 hard gate must be re-run; possible Phase-33-class hang on Lenovo Mini (low risk, but unverified hardware-specifically); harder to revert</cons>
      <when>FPS < 25 OR delta > 5 fps OR visual bands persist</when>
    </option>
    <option id="c1-degraded-and-defer">
      <name>Ship C1 even if marginal; defer C2 to operator</name>
      <pros>No further risk this phase; D-06 untouched</pros>
      <cons>Operator may still see bands; D-04 gate marginal</cons>
      <when>Borderline — operator can decide post-Phase-35</when>
    </option>
  </options>
  <resume-signal>Select: c1-sufficient | c2-escalate | c1-degraded-and-defer</resume-signal>
  <files>(none — pure decision)</files>
  <action>Operator/Claude reviews Task 2 FPS numbers + visual UAT result. Decision flows: if c1-sufficient → skip Task 4; if c2-escalate → run Task 4; if c1-degraded-and-defer → skip Task 4 + log deferral. The decision is recorded for 35-C-SUMMARY.md.</action>
  <verify>
    <automated>echo "decision recorded — see 35-C-SUMMARY.md"</automated>
  </verify>
  <acceptance_criteria>
    - Decision recorded as one of: c1-sufficient | c2-escalate | c1-degraded-and-defer
    - Decision rationale (FPS numbers + visual outcome) noted for the SUMMARY doc
  </acceptance_criteria>
  <done>Decision logged. Task 4 either runs (c2-escalate) or is skipped (other two options).</done>
</task>

<task type="auto">
  <name>Task 4: (CONDITIONAL — only runs if Task 3 selected c2-escalate) Apply C2 SwiftShader flag swap</name>
  <read_first>
    - Task 3 decision output
    - src/server/ssr-render-host.mjs lines 549-570 (read full GL flag block context)
    - .planning/phases/phase-35/35-RESEARCH.md §"Track C2 — SwiftShader flag swap (if escalation needed)" (paste-ready 1-line change)
    - .planning/phases/phase-35/35-RESEARCH.md §"Pitfall 1" + §"Pitfall 8"
  </read_first>
  <files>src/server/ssr-render-host.mjs</files>
  <action>
**ONLY EXECUTE IF Task 3's resume-signal was `c2-escalate`. Otherwise SKIP THIS TASK.**

In `src/server/ssr-render-host.mjs`, find line 564:
```javascript
"--use-angle=default",
```

Change to:
```javascript
"--use-angle=swiftshader",
```

DO NOT MODIFY ANY OTHER LINE. Specifically:
- Line 563 stays `"--use-gl=angle",` (Pitfall 8 — `--use-gl=swiftshader` ALONE is broken; must use `--use-gl=angle --use-angle=swiftshader`)
- The `hasVaapiEnabled` gate around `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` stays UNCHANGED (Phase 34 h2 LOCK, Pitfall 1)
- Headless mode flags stay unchanged
- Codec flags stay unchanged

After change:
1. Run `RUN_LIVE_TESTS=1 node --test test/connection-stability/` — D-06 hard gate. MUST report 72/0/13. If ANY connection-stability regression appears (especially `health ping failed`-class failures), REVERT IMMEDIATELY and select `c1-degraded-and-defer` instead.
2. Run `python -m pytest test/live-e2e/test_phase35_fps_benchmark.py -v` — measure FPS again. Should be ≥ 25.
3. Run `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_server_log_clean -v` — must STILL be GREEN (zero `health ping failed`).
4. Run full live-E2E suite — `python -m pytest test/live-e2e/ -v` — all GREEN.

If anything fails, REVERT the swiftshader change with `git checkout -- src/server/ssr-render-host.mjs` and report failure to operator. Do NOT attempt further GL-flag changes (Pitfall 1).
  </action>
  <verify>
    <automated>RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -5; python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_server_log_clean -v 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - (IF c2-escalate selected:) ssr-render-host.mjs contains `"--use-angle=swiftshader"` (grep)
    - (IF c2-escalate selected:) ssr-render-host.mjs does NOT contain `"--use-angle=default"` (grep returns 0)
    - (IF c2-escalate selected:) ssr-render-host.mjs `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` STILL gated on `hasVaapiEnabled` (grep both stay inside their existing conditional)
    - (IF c2-escalate selected:) D-06 hard gate: 72/0/13
    - (IF c2-escalate selected:) test_server_log_clean GREEN (zero health ping failed)
    - (IF c2-escalate selected:) FPS benchmark ≥ 25 fps
    - (IF c1-sufficient or c1-degraded-and-defer:) ssr-render-host.mjs UNCHANGED — git diff shows no changes to this file
  </acceptance_criteria>
  <done>(IF c2 ran:) C2 SwiftShader live; D-06 + log-clean tests GREEN. (IF skipped:) decision logged; ssr-render-host.mjs untouched. Either way Track C complete.</done>
</task>

<task type="auto">
  <name>Task 5: Track C wave-merge verification — D-04 FPS gate, D-03 dither GREEN, D-06 (if c2 ran)</name>
  <read_first>
    - test/live-e2e/test_phase35_fps_benchmark.py
    - test/phase-35-bayer-dither.test.mjs
    - test/connection-stability/ (only if Task 3 chose c2-escalate)
  </read_first>
  <files></files>
  <action>
Verification-only task.

Commands:
1. `node --test test/phase-35-bayer-dither.test.mjs` — D-03-C1 unit test GREEN
2. `python -m pytest test/live-e2e/test_phase35_fps_benchmark.py -v` — record final FPS; assert delta ≤ 5 fps vs Wave-0 baseline AND effective_fps ≥ 25
3. `python -m pytest test/live-e2e/test_phase35_alignmode_smoke.py -v` — all 6 D-05 a-f tests GREEN (Track A from 35-A-PLAN must already be merged)
4. `python -m pytest test/live-e2e/test_phase35_dashboard_alignmode.py -v` — dashboard regression STAYS GREEN
5. `RUN_LIVE_TESTS=1 node --test test/connection-stability/` — D-06 72/0/13 (REQUIRED if Task 3 chose c2-escalate; ALWAYS verify even if c1-sufficient as a sanity check)
6. `node --test test/**/*.test.mjs` — full JS suite GREEN; all 3 phase-35-* tests GREEN now

Manual visual UAT step (defers to V-PLAN, captured here as a note for operator):
- Operator on gaming-PC desktop browser, navigate to /output/, trigger known solid-color fade animation, take screenshot. Compare to pre-Phase-35 master screenshot. Bands should be GONE.

This is the D-03-C1-V verification — strictly a manual check, captured in 35-HUMAN-UAT.md by 35-V-PLAN. This task only confirms automated tests are GREEN.
  </action>
  <verify>
    <automated>node --test test/phase-35-bayer-dither.test.mjs && python -m pytest test/live-e2e/test_phase35_fps_benchmark.py -v 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - phase-35-bayer-dither GREEN
    - phase-35-output-live-sync GREEN (from Track B)
    - phase-35-bootalignmode-shape GREEN (from Track A — assuming 35-A-PLAN merged)
    - FPS benchmark: effective_fps ≥ 25 AND delta vs Wave-0 baseline ≤ 5 fps
    - All 6 D-05 a-f tests GREEN
    - Dashboard regression GREEN
    - D-06 hard gate: 72/0/13 (always verify, especially if Task 3 ran c2)
    - Full JS suite GREEN
  </acceptance_criteria>
  <done>Track C complete. All 8 D-* requirements have automated GREEN; visual UAT pending in V-plan.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser canvas → ImageData via putImageData | new code path; mostly trusted (same-origin, no user input) |
| ssr-render-host.mjs Chrome flags (C2) | same trust profile as Phase 33+34 — local subprocess, controlled args |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-35-C-01 | DoS | Bayer dither cache miss storm at high alpha-pulse rates | mitigate | Alpha quantization to 1% steps (Pitfall 7); FIFO cache eviction at 256 entries |
| T-35-C-02 | DoS | putImageData blocks rendering thread for large rooms | mitigate | FPS benchmark in Task 2 catches; C2 escalation path defined |
| T-35-C-03 | Tampering | malformed hex string crashes parseInt | accept | Existing pattern — runtime-effect-visuals.js already trusts upstream hex format from /api/live; no new exposure |
| T-35-C-04 | DoS (HARD) | C2 SwiftShader hang reproduces Phase-33-class issue | mitigate | D-06 hard gate is the safety net; revert immediately on health-ping-failed |
| T-35-C-05 | Tampering | Engineer accidentally re-enables `--ignore-gpu-blocklist` decoupled from VAAPI gate during C2 work | mitigate | Plan task explicitly forbids touching those flags; Pitfall 1 flagged inline; D-06 catches |
</threat_model>

<verification>
1. **D-03 unit test transition:** `node --test test/phase-35-bayer-dither.test.mjs` RED → GREEN.
2. **D-04 FPS gate:** test_phase35_fps_benchmark.py reports effective_fps ≥ 25 AND delta vs Wave-0 baseline ≤ 5 fps.
3. **D-06 hard gate (if c2 ran):** connection-stability 72/0/13 unchanged.
4. **D-03-C1-V visual:** deferred to V-PLAN's manual UAT step.
5. **No regression:** full JS suite + D-05 tests + dashboard regression all GREEN.
</verification>

<success_criteria>
- [ ] runtime-effect-dither.js exists with EXACT Bayer 4×4 matrix
- [ ] runtime-effect-visuals.js solid-color path uses putImageData of dithered ImageData (non-skipClear branch only)
- [ ] phase-35-bayer-dither unit test GREEN (RED→GREEN transition)
- [ ] FPS benchmark: ≥ 25 fps AND ≤ 5 fps delta vs baseline
- [ ] (Conditional) C2 swiftshader applied IF FPS gate not met
- [ ] D-06 hard gate STILL 72/0/13 (always verified)
- [ ] All other Phase 35 rails (D-01, D-02, D-05 a-f, dashboard regression) GREEN
- [ ] Visual UAT note captured for V-PLAN
</success_criteria>

<output>
After completion, create `.planning/phases/phase-35/35-C-SUMMARY.md` with:
- runtime-effect-dither.js LOC count
- Wave-0 baseline FPS vs post-C1 FPS (the delta number)
- Decision: c1-sufficient | c2-escalate | c1-degraded-and-defer
- (If c2 ran:) ssr-render-host.mjs swiftshader swap LOC count + D-06 result
- D-03-C1 + D-04 GREEN result lines
- D-06 hard gate result line
- Visual UAT note for V-PLAN handoff
- Confirmation: 35-V-PLAN may proceed
</output>
