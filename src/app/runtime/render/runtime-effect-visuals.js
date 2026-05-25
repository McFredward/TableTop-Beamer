// coded effect visuals module.
//
// Owns drawEffectVisual — the dispatcher for coded (non-gif/mp4)
// room and outside effects: outside-space parallax star field,
// hull-flicker, intruder-alert pulse, power-outage, special-slime,
// special-scanning.
//
// Dependencies injected via ctx:
//   state                   — for default boardId
//   canvas                  — HTMLCanvasElement
//   canvasCtx               — CanvasRenderingContext2D
//   getRoomLabelPosition    — returns {x, y} for room center
//   getRuntimeVisualCaps    — returns runtime density caps
//   clampOutsideSpeed       — clamp helper
//   flickerNoise            — noise function for flicker effects
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  // Shared gate function for the hull-flicker coded effect.
  // Deterministic in (age, speed, intensity); matches the exact timeline
  // math that used to live inline in the hull-flicker draw branch.
  // Consumers read `isOnPeriod` to know whether the lamp is currently lit.
  function computeHullFlickerGate(age, speed = 1, intensity = 1) {
    const effectiveAge = Number.isFinite(age) ? age * (Number.isFinite(speed) && speed > 0 ? speed : 1) : 0;
    const safeIntensity = Number.isFinite(intensity) ? intensity : 1;
    const timeline = effectiveAge * (1.6 + safeIntensity * 0.5);
    const step = Math.floor(timeline * 6);
    const gate = ctx.flickerNoise(step * 0.08 + 3.9);
    const isOnPeriod = gate > 0.72;
    let flickerIntensity = 0;
    if (isOnPeriod) {
      const baseFlicker = (ctx.flickerNoise(step * 0.22 + 7.4) * 0.55 +
        ctx.flickerNoise(step * 0.55 + 15.2) * 0.35 +
        ctx.flickerNoise(step * 1.1 + 28.6) * 0.1);
      flickerIntensity = (0.4 + baseFlicker * 0.6) * safeIntensity;
    }
    return { isOnPeriod, flickerIntensity, step, gate };
  }

  function isHullFlickerLampOff(age, speed = 1, intensity = 1) {
    return !computeHullFlickerGate(age, speed, intensity).isOnPeriod;
  }

  // Shared gate for the power-outage coded effect. Mirrors the
  // flashNoise threshold used inside the power-outage draw branch
  // (Math.abs(sin*sin) > 0.78 == "brief blue flash"). For
  // breaksSolidColor coupling we treat those flash moments as the
  // ON period — solid-color renders briefly when the flash fires
  // and is gated dark the rest of the time, so a solid-color room
  // visibly behaves like the power is mostly out with intermittent
  // recoveries.
  function computePowerOutageGate(age, speed = 1, intensity = 1) {
    const effectiveAge = Number.isFinite(age) ? age * (Number.isFinite(speed) && speed > 0 ? speed : 1) : 0;
    const flashNoise = Math.abs(Math.sin(effectiveAge * 53.7) * Math.sin(effectiveAge * 71.3));
    const isOnPeriod = flashNoise > 0.78;
    return { isOnPeriod, flashNoise };
  }

  function isPowerOutageLampOff(age, speed = 1, intensity = 1) {
    return !computePowerOutageGate(age, speed, intensity).isOnPeriod;
  }

  function drawEffectVisual(type, age, intensity, room, roomMetrics = null, options = {}) {
    const canvas = ctx.canvas;
    const c = ctx.canvasCtx;
    const w = canvas.width;
    const h = canvas.height;
    const roomCenter = room ? ctx.getRoomLabelPosition(room, ctx.state.boardId) : { x: 0.5, y: 0.5 };
    const roomX = roomMetrics?.centerX ?? roomCenter.x * w;
    const roomY = roomMetrics?.centerY ?? roomCenter.y * h;
    const roomRadius = roomMetrics?.radius ?? room?.radius * Math.min(w, h) ?? Math.min(w, h) * 0.08;
    const roomWidth = roomMetrics?.width ?? roomRadius * 2;
    const roomHeight = roomMetrics?.height ?? roomRadius * 2;
    const roomMinX = roomMetrics?.minX ?? roomX - roomWidth / 2;
    const roomMinY = roomMetrics?.minY ?? roomY - roomHeight / 2;
    const visualCaps = ctx.getRuntimeVisualCaps();

    if (type === "outside-space") {
      const immersive = options.outsideMode === "immersive";
      const speedInfluence = ctx.clampOutsideSpeed(options.outsideSpeed ?? 1);
      const speedFactor = (immersive ? 1.45 : 1) * (0.75 + speedInfluence * 0.45);
      const directionMultiplier = options.outsideDirection === "reverse" ? -1 : 1;

      c.fillStyle = "rgba(0, 0, 0, 1)";
      c.fillRect(0, 0, w, h);

      const parallaxLayers = immersive
        ? [
          { density: 46, speed: 190, size: 0.9, alpha: 0.16, wave: 0.008 },
          { density: 66, speed: 310, size: 1.2, alpha: 0.26, wave: 0.011 },
          { density: 82, speed: 470, size: 1.6, alpha: 0.38, wave: 0.014 },
          { density: 98, speed: 660, size: 2, alpha: 0.52, wave: 0.017 },
        ]
        : [
          { density: 32, speed: 130, size: 0.85, alpha: 0.14, wave: 0.006 },
          { density: 50, speed: 230, size: 1.1, alpha: 0.22, wave: 0.009 },
          { density: 68, speed: 360, size: 1.45, alpha: 0.32, wave: 0.012 },
        ];

      for (let layerIndex = 0; layerIndex < parallaxLayers.length; layerIndex += 1) {
        const layer = parallaxLayers[layerIndex];
        const starCount = Math.max(
          16,
          Math.min(
            visualCaps.outsideStarsPerLayer,
            Math.round(layer.density * intensity * visualCaps.nonCriticalDensityScale),
          ),
        );
        const layerSpeed = layer.speed * (0.8 + intensity * 0.75) * speedFactor;
        const layerWave = h * layer.wave;

        for (let i = 0; i < starCount; i += 1) {
          const seedX = ((i * 97.173 + layerIndex * 31.7) % 1000) / 1000;
          const seedY = ((i * 57.913 + layerIndex * 79.1) % 1000) / 1000;
          const progressRaw = (seedX * (w + 8) - age * layerSpeed * directionMultiplier) % (w + 8);
          const x = progressRaw < 0 ? progressRaw + w + 8 : progressRaw;
          const y = seedY * h + Math.sin(age * 0.35 + i * 0.07 + layerIndex) * layerWave;
          const twinkle = (Math.sin(age * (2 + layerIndex * 0.7) + i * 0.9) + 1) / 2;
          const alpha = Math.min(0.95, layer.alpha * (0.8 + intensity * 0.7) * (0.75 + twinkle * 0.45));
          const size = layer.size * (0.8 + (((i * 19.9) % 100) / 100) * 0.7);
          const streakLength =
            (3.5 + layerIndex * 3.2 + speedInfluence * 4.2 + intensity * 2.8) * (immersive ? 1.25 : 1);
          const streakWidth = Math.max(0.8, size * (0.65 + layerIndex * 0.08));

          c.strokeStyle = `rgba(232, 238, 255, ${Math.min(0.9, alpha * 0.72)})`;
          c.lineWidth = streakWidth;
          c.beginPath();
          c.moveTo(x + streakLength * directionMultiplier, y);
          c.lineTo(x, y);
          c.stroke();

          c.fillStyle = `rgba(245, 248, 255, ${alpha})`;
          c.fillRect(x, y, size, size);
        }
      }

      const expressLanes = Math.max(
        4,
        Math.min(22, Math.round((immersive ? 14 : 9) * intensity * visualCaps.nonCriticalDensityScale)),
      );
      for (let i = 0; i < expressLanes; i += 1) {
        const laneY = (((i * 63.17) % 1000) / 1000) * h;
        const pulse = ((age * (0.82 + i * 0.045)) % 1) * (w + 210);
        const laneLength = 140 + speedInfluence * 55 + intensity * 70;
        const laneAlpha = (0.04 + ((Math.sin(age * 4.6 + i) + 1) / 2) * 0.15) * (immersive ? 1.2 : 0.92);
        c.strokeStyle = `rgba(224, 233, 255, ${Math.min(0.48, laneAlpha)})`;
        c.lineWidth = 0.8 + ((i % 3) + 1) * 0.38;
        c.beginPath();
        const laneHeadX = directionMultiplier > 0 ? w - pulse : pulse;
        c.moveTo(laneHeadX + laneLength * directionMultiplier, laneY);
        c.lineTo(laneHeadX, laneY);
        c.stroke();
      }
      return;
    }

    if (type === "hull-flicker") {
      const { isOnPeriod, flickerIntensity } = computeHullFlickerGate(age, 1, intensity);

      const dipAlpha = isOnPeriod && flickerIntensity < 0.35 ? (0.35 - flickerIntensity) * 0.5 * intensity : 0;
      c.fillStyle = `rgba(0, 0, 0, ${Math.min(0.3, dipAlpha)})`;
      c.fillRect(0, 0, w, h);

      const tubeColor = "240, 235, 190";
      const overlayAlpha = Math.min(0.4, flickerIntensity);
      if (overlayAlpha > 0.015 && isOnPeriod) {
        c.fillStyle = `rgba(${tubeColor}, ${overlayAlpha})`;
        c.fillRect(0, 0, w, h);
      }

      return;
    }

    if (type === "intruder-alert") {
      const pulse = (Math.sin(age * 9) + 1) / 2;
      c.fillStyle = `rgba(255, 45, 45, ${(0.1 + pulse * 0.24) * intensity})`;
      c.fillRect(0, 0, w, h);
      return;
    }

    if (type === "power-outage") {
      const pulse = (Math.sin(age * 20) + 1) / 2;
      const alpha = 0.76 + pulse * 0.2;
      c.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      c.fillRect(0, 0, w, h);

      // Blue flash used to be `Math.random() > 0.88`, which fires at
      // a fixed ~12% per frame regardless of `age` — so the speed
      // slider had no visible effect (BACKLOG #10). Replace with a
      // deterministic age-driven noise: two incommensurate sine waves
      // multiplied to mimic randomness. Because `age` is already scaled
      // by the animation's speed (see drawInsideGlobalVisual /
      // drawRoomCodedVisual), the flash cadence now scales with speed.
      const flashNoise = Math.abs(Math.sin(age * 53.7) * Math.sin(age * 71.3));
      if (flashNoise > 0.78) {
        c.fillStyle = `rgba(122, 182, 255, ${0.15 * intensity})`;
        c.fillRect(0, 0, w, h);
      }
      return;
    }

    if (type === "special-slime") {
      const densityFactor = Number(options.densityFactor) || 1;
      const bands = Math.max(3, Math.round(9 * intensity * densityFactor * visualCaps.nonCriticalDensityScale));
      for (let i = 0; i < bands; i += 1) {
        const wave = Math.sin(age * 1.8 + i * 0.9);
        const y = roomMinY + roomHeight * (0.14 + (i / Math.max(1, bands - 1)) * 0.72);
        const thickness = Math.max(4, roomHeight * 0.06);
        const startX = roomMinX - roomWidth * 0.15;
        const endX = roomMinX + roomWidth * 1.15;
        const gradient = c.createLinearGradient(startX, y, endX, y + thickness);
        gradient.addColorStop(0, `rgba(58, 255, 162, ${(0.08 + i * 0.01) * intensity})`);
        gradient.addColorStop(0.5, `rgba(132, 255, 196, ${(0.2 + wave * 0.06) * intensity})`);
        gradient.addColorStop(1, `rgba(41, 149, 92, ${(0.12 + i * 0.015) * intensity})`);
        c.fillStyle = gradient;
        c.beginPath();
        c.moveTo(startX, y + Math.sin(age + i) * 6);
        c.bezierCurveTo(
          roomX - roomWidth * 0.35,
          y + wave * 14,
          roomX + roomWidth * 0.3,
          y - wave * 12,
          endX,
          y + Math.cos(age * 1.2 + i) * 6,
        );
        c.lineTo(endX, y + thickness);
        c.lineTo(startX, y + thickness);
        c.closePath();
        c.fill();
      }
      return;
    }

    if (type === "solid-color") {
      const hex = typeof options.colorHex === "string" && /^#[0-9a-f]{6}$/i.test(options.colorHex)
        ? options.colorHex
        : "#ff0000";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      // Solid-color used to ignore `opacity` entirely and
      // squeezed brightness into `intensity * 0.8`, so the Live Editor's
      // opacity slider did nothing and intensity only shifted alpha by a
      // narrow fixed factor. Now both sliders modulate the fill alpha
      // directly (opacity × intensity, clamped to [0,1]) — same mental
      // model the user has for gif/mp4 rooms.
      const opacityOption = Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1;
      const intensitySafe = Number.isFinite(intensity) ? intensity : 1;
      const alpha = Math.max(0, Math.min(1, opacityOption * intensitySafe));
      // clearRect-then-fillRect achieves the same "destination is
      // replaced, not blended" behaviour as `globalCompositeOperation
      // = "copy"` (Phase 25-h3) without paying the per-call backing-
      // store snapshot that made "copy" cost ~5-30 ms/room on Pi
      // /output/ and collapsed perf to single-digit fps when many
      // rooms ran solid-color simultaneously.
      //
      // Why it works:
      // - clearRect respects the clip: only pixels inside this room's
      //   polygon are wiped to transparent. Whatever a previously-
      //   drawn solid-color room wrote into the same pixels (overlap
      //   area, sub-pixel polygon overlap, etc.) is removed before we
      //   paint our own colour, so two adjacent rooms with the same
      //   semi-transparent colour no longer alpha-stack to a brighter
      //   tone at their shared edge.
      // - fillRect with default source-over composite then paints the
      //   solid colour onto a freshly-cleared region. Equivalent to
      //   `copy` for the in-clip pixels, with a small AA-edge dimming
      //   instead of an AA-edge halo (perceptually milder than the
      //   brightness bump).
      // - Both ops are GPU primitives — no composite-mode change
      //   means no canvas-state-machine round trip on each call.
      // - Skip the clearRect when the outer composite is "lighter"
      //   (same-room ≥2-anims path, Phase 12-1) — that path is
      //   *intentionally* additive and the clear would defeat it.
      const skipClear = c.globalCompositeOperation === "lighter";
      if (skipClear) {
        // Phase 12-1 additive composite — banding doesn't show in this
        // path (the destination buffer is mostly black; small alpha
        // increments add discrete brightness levels but the human eye
        // doesn't perceive them as bands). Keep the existing fillRect.
        c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);
      } else {
        // Phase 35 D-03-C1 (Track C, iter2 hotfix h3): replace the
        // 8-bit-per-channel alpha-blend that produced operator-visible
        // Mach-band steps ("Streifen") with per-pixel Bayer-4×4-dithered
        // pixels — but composited via `c.drawImage(canvas, ...)` instead
        // of `c.putImageData(imageData, ...)`. Reason for the iter2
        // change: putImageData IGNORES the canvas clip path (it writes
        // raw pixels to the destination buffer, bypassing the polygon
        // clip the caller sets up via c.clip()). Phase 35 close shipped
        // putImageData and the operator reported solid-color animations
        // flooding the bounding RECTANGLE of the room instead of the
        // room polygon shape. drawImage respects the clip, so the
        // dithered pixels are clipped to the polygon as before.
        //
        // Helper is the IIFE-published window.TT_BEAMER_RUNTIME_EFFECT_DITHER
        // (loaded as ES module before this script in index.html); accessed
        // lazily so the IIFE parse doesn't depend on module load order.
        c.clearRect(roomMinX, roomMinY, roomWidth, roomHeight);
        const dither = window.TT_BEAMER_RUNTIME_EFFECT_DITHER;
        const ditherWidth = Math.max(1, Math.round(roomWidth));
        const ditherHeight = Math.max(1, Math.round(roomHeight));
        const ditherCanvas = (dither && typeof dither.getDitheredSolidColorCanvas === "function")
          ? dither.getDitheredSolidColorCanvas({ hex, alpha, width: ditherWidth, height: ditherHeight })
          : null;
        if (ditherCanvas) {
          c.drawImage(
            ditherCanvas,
            Math.round(roomMinX),
            Math.round(roomMinY),
            ditherWidth,
            ditherHeight,
          );
        } else {
          // Defensive fallback to the pre-Phase-35 fillRect path so a
          // missing dither module never blanks the room. Logged once
          // so misconfiguration surfaces in the console without
          // spamming the render loop.
          if (!window.__ttbDitherWarned) {
            window.__ttbDitherWarned = true;
            console.warn(
              "[runtime-effect-visuals] Bayer dither canvas helper unavailable — falling back to fillRect (banding may return)",
            );
          }
          c.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          c.fillRect(roomMinX, roomMinY, roomWidth, roomHeight);
        }
      }
      return;
    }

    if (type === "special-scanning") {
      const densityFactor = Number(options.densityFactor) || 1;
      const rings = Math.max(3, Math.round(7 * intensity * densityFactor * visualCaps.nonCriticalDensityScale));
      const maxRadius = Math.max(roomWidth, roomHeight) * 0.72;
      for (let i = 0; i < rings; i += 1) {
        const progress = ((age * 0.9 + i / rings) % 1);
        const radius = Math.max(6, progress * maxRadius);
        const alpha = (1 - progress) * 0.38 * intensity;
        c.strokeStyle = `rgba(178, 230, 255, ${alpha})`;
        c.lineWidth = Math.max(1.5, roomWidth * 0.01);
        c.beginPath();
        c.arc(roomX, roomY, radius, 0, Math.PI * 2);
        c.stroke();
      }
      const streaks = Math.max(6, Math.round(14 * visualCaps.nonCriticalDensityScale));
      for (let i = 0; i < streaks; i += 1) {
        const angle = (Math.PI * 2 * i) / streaks + age * 1.2;
        const inner = Math.max(10, Math.min(roomWidth, roomHeight) * 0.1);
        const outer = maxRadius * (0.8 + Math.sin(age * 2 + i) * 0.1);
        c.strokeStyle = `rgba(212, 245, 255, ${(0.12 + ((i % 3) * 0.04)) * intensity})`;
        c.lineWidth = Math.max(1, roomWidth * 0.006);
        c.beginPath();
        c.moveTo(roomX + Math.cos(angle) * inner, roomY + Math.sin(angle) * inner);
        c.lineTo(roomX + Math.cos(angle) * outer, roomY + Math.sin(angle) * outer);
        c.stroke();
      }
      return;
    }
  }

  // Run `fn` with this module's
  // canvas + canvas-context temporarily redirected to the caller's
  // preview canvas. drawEffectVisual renders to `ctx.canvas`, so
  // swapping here lets the animation editor's preview column reuse
  // the exact same coded-effect draw code as the main stage without
  // duplicating logic. Runs synchronously; restores in a finally
  // block so a thrown draw won't leak the preview canvas into the
  // main stage's render loop.
  function withPreviewCanvas(previewCanvas, fn) {
    if (!ctx || !previewCanvas || typeof fn !== "function") return;
    const origCanvas = ctx.canvas;
    const origCanvasCtx = ctx.canvasCtx;
    const previewCtx = previewCanvas.getContext("2d");
    ctx.canvas = previewCanvas;
    ctx.canvasCtx = previewCtx;
    try {
      fn();
    } finally {
      ctx.canvas = origCanvas;
      ctx.canvasCtx = origCanvasCtx;
    }
  }

  window.TT_BEAMER_RUNTIME_EFFECT_VISUALS = {
    init,
    drawEffectVisual,
    computeHullFlickerGate,
    isHullFlickerLampOff,
    computePowerOutageGate,
    isPowerOutageLampOff,
    withPreviewCanvas,
  };
})();
