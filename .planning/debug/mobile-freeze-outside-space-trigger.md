---
status: investigating
trigger: "~1 second mobile freeze when starting any animation while outside-space is running on Nemesis Board A/B"
created: 2026-05-16T00:00:00Z
updated: 2026-05-16T00:00:00Z
---

## Current Focus

hypothesis: Per-frame heavy work in drawEffectVisual outside-space case (allocates parallaxLayers array, iterates ~290 stars × 4 layers with 8 canvas ops each) causes long task on first frame after rAF wake-up post animation trigger
test: Use Playwright with mobile viewport + 4x CPU throttling, install PerformanceObserver longtask, instrument drawOutsideFxLayer/drawEffectVisual/clipToOutsideShip/refreshGlobalButtons via performance.mark, trigger animation, record longest task and per-function timing
expecting: drawEffectVisual outside-space or drawOutsideFxLayer dominates the long task; switching to Lockdown A removes the delta
next_action: read suspect code areas in full, then write Playwright probe

## Symptoms

expected: Tapping a trigger on mobile dashboard with Nemesis A/B + outside-space active should start the animation without UI freeze
actual: ~1 second UI freeze on real iPhone/Android after tap on dashboard before UI becomes responsive
errors: (none — pure performance)
reproduction: |
  1. Open dashboard on mobile (or mobile-emulated viewport with CPU throttling)
  2. Activate Nemesis Board A or B (outside-space immersive is default outside-fx)
  3. Tap any animation trigger (room or global)
  4. UI freezes ~1s, then animation starts
  Disabling outside-space → no freeze
  Switching to Lockdown A/B (sandstorm MP4) → no freeze
started: Persistent in current master; blocker for v1.0.0 release. Phase-46-closed at 30c4c41.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-05-16T00:01:00Z
  checked: src/app/runtime/render/runtime-effect-visuals.js outside-space case (lines 82-158)
  found: |
    - parallaxLayers array literal allocated every frame (immutable values: density/speed/size/alpha/wave)
    - 4 layers × up to 98 stars each = 392 stars/frame at full density
    - Per-star: strokeStyle string template, lineWidth set, beginPath, moveTo, lineTo, stroke, fillStyle string template, fillRect → 8 canvas ops + 2 string allocations
    - Plus 14 "express lanes" with similar per-iter canvas state changes
    - Star positions are computed from (i, layerIndex) seeds — fully deterministic, never change → could be cached
  implication: |
    Total: ~392 stars × 8 ops = 3,136 canvas ops + ~784 garbage-collected strings/frame. On a mid-range Android with 4× CPU throttling this could plausibly exceed 100ms/frame. Heavy state changes (strokeStyle/fillStyle/lineWidth) force GPU shader rebinds.
    Also: this layer renders on EVERY frame regardless of role — including the dashboard preview canvas where it's purely aesthetic.

- timestamp: 2026-05-16T00:02:00Z
  checked: src/app/runtime/render/runtime-draw-loop.js drawOutsideFxLayer (405-558) + draw (614-723)
  found: |
    - drawOutsideFxLayer is the FIRST work after clearRect+pruneFinishedAnimations
    - clipToOutsideShip is called every frame, building a fresh evenodd path of the play-area polygons
    - For coded outside (outside-space): ctx.drawEffectVisual(codedEffectType, ...) is called inside save/clip/restore
    - The draw loop has a "heavy interaction" guard but no "trigger latency" guard — full render happens immediately
  implication: The drawOutsideFxLayer pass + drawEffectVisual is the dominant per-frame cost on Nemesis A/B with outside-space active.

- timestamp: 2026-05-16T00:03:00Z
  checked: src/app/runtime/render/runtime-draw-loop-cluster-pads.js (drawClusterPadCanvases)
  found: |
    - Loops over ALL .cluster-pad-canvas elements every frame, calling getBoundingClientRect() per pad (line 46) — forces layout flush
    - Sets width/height per frame if cssRect changed — invalidates canvas backing store
    - drawRoomComposition is called inside withPreviewCanvas hijack — for a NEW cluster animation this is a brand-new code path
    - Only runs on control role (dashboard)
  implication: |
    On trigger, refreshGlobalButtons → renderClusterPads (DOM mutation) → then the next frame, drawClusterPadCanvases runs over the new pad layout. getBoundingClientRect repeatedly per pad creates layout thrash. Cluster pads exist regardless of outside-fx mode, so not the differential cause vs Lockdown — but adds to overall main-thread cost.

- timestamp: 2026-05-16T00:04:00Z
  checked: src/app/runtime/animation/runtime-room-dispatch.js (trigger path)
  found: |
    - startRoomAnimationFromDraft pushes to state.runningAnimations
    - playSoundForAnimation is called for each created animation (line 598). For outside-space soundAssetRef is "none" → should short-circuit, but room animations have their own sounds.
    - deferRenderRunningList() is used to push the heavy list rebuild off this stack to the next rAF
    - emitLiveMutation broadcasts WS to /output/
  implication: Trigger itself looks lean. The freeze is most likely on the NEXT rAF tick — the first frame that renders the new animation.

- timestamp: 2026-05-16T00:05:00Z
  checked: config/boards/nemesis-board-a.json outsideFx
  found: |
    outsideFx.enabled is false in disk, but selectedAnimationId is "outside-space", mode "immersive". Runtime activation toggles enabled via live-sync.
    runtime-active-animations.json shows boardId nemesis-board-a is active.
  implication: To reproduce, the test must explicitly enable outsideFx via context-update mutation OR toggle via the runtime-active state file before launching.

## Hypothesis ranking (initial)

H1 (PRIMARY): drawEffectVisual outside-space hot loop dominates per-frame cost. 
  - Allocation: parallaxLayers array literal allocated every frame.
  - Stars: ~390 per frame × 8 canvas ops + 2 string concats each.
  - On mobile CPU-throttled, individual frames can exceed 250ms.
  - The freeze is felt as "1s" because multiple consecutive heavy frames + scroll/touch event starvation.

H2: cluster-pad render after trigger (renderClusterPads via refreshGlobalButtons → drawClusterPadCanvases on next frame) causes a layout thrash. But this is identical between Nemesis-A and Lockdown-A → can be ruled out as the DIFFERENTIAL cause.

H3: clipToOutsideShip path rebuild — small cost compared to the star loop, but also runs in Lockdown (mp4 path) → not differential.

H4: The first frame after trigger is heavy because GC kicks in on the per-frame parallaxLayers literal — combined with H1.

Primary test plan: confirm H1 via Playwright + longtask probe and per-function performance.mark wrapping.

## Resolution

root_cause:
fix:
verification:
files_changed: []
