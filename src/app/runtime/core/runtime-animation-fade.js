// Phase 58 Wave 3.9h — shared animation fade math.
//
// Single source of truth for the optional fade-in / fade-out opacity
// ramp. The multiplier is a PURE FUNCTION OF TIME (deterministic →
// dashboard == /output == SSR on the same wall clock), so it never
// branches on role or per-client render state.
//
//   fade-in   ramps 0 → 1 over fadeDurationMs measured from the
//             instance's startedAt (rebased to local performance.now()
//             per client via the epoch in live-sync-helpers), smoothstep.
//   fade-out  ramps 1 → 0 over fadeDurationMs measured from
//             fadeOutStartedAtEpochMs (Date.now wall clock, broadcast on
//             stop so /output ramps out too), smoothstep.
//
// Both terms compose multiplicatively, and the result is a GLOBAL
// multiplier applied ON TOP of the animation's own opacity at every
// draw path (mp4 / gif / coded, room / inside / outside). When
// fadeEnabled is false the multiplier is exactly 1 ⇒ byte-identical
// legacy (abrupt) behavior.
(() => {
  function smoothstep01(t) {
    const x = t < 0 ? 0 : t > 1 ? 1 : t;
    return x * x * (3 - 2 * x);
  }

  // Inverse of smoothstep (analytic): given a value v in [0,1], return
  // the t in [0,1] such that smoothstep01(t) === v. Used to resume a
  // fade-IN from the CURRENT opacity when a fade-out is cancelled by a
  // re-trigger, so the ramp continues smoothly with no abrupt jump.
  function inverseSmoothstep01(v) {
    const y = v < 0 ? 0 : v > 1 ? 1 : v;
    return 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3);
  }

  function clampFadeDurationMs(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 800;
    return Math.max(100, Math.min(5000, n));
  }

  // The effective fade opacity multiplier for an instance at time `now`
  // (a performance.now()-domain timestamp — the rAF tick). fade-out uses
  // the Date.now() wall clock via fadeOutStartedAtEpochMs so it stays
  // consistent across clients without per-client rebasing.
  function computeFadeMultiplier(animation, now) {
    if (!animation || animation.fadeEnabled !== true) return 1;
    const durationMs = clampFadeDurationMs(animation.fadeDurationMs);
    let mul = 1;

    const startedAt = Number(animation.startedAt);
    if (Number.isFinite(startedAt)) {
      const inElapsed = now - startedAt;
      if (inElapsed < durationMs) {
        mul *= smoothstep01(inElapsed / durationMs);
      }
    }

    // fadeOutStartedAtEpochMs > 0 means a fade-out is in progress. A
    // cancelled fade clears it to null (Number(null) === 0), so the > 0
    // guard treats null/0/absent as "not fading out".
    const fadeOutEpoch = Number(animation.fadeOutStartedAtEpochMs);
    if (Number.isFinite(fadeOutEpoch) && fadeOutEpoch > 0) {
      const outElapsed = Date.now() - fadeOutEpoch;
      mul *= 1 - smoothstep01(outElapsed / durationMs);
    }

    return mul < 0 ? 0 : mul > 1 ? 1 : mul;
  }

  // Current fade multiplier sampled against the live clocks — used by the
  // stop pipeline at the moment a fade-out is cancelled to compute the
  // value the fade-in must resume from.
  function currentFadeMultiplier(animation) {
    return computeFadeMultiplier(animation, performance.now());
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_FADE = {
    smoothstep01,
    inverseSmoothstep01,
    clampFadeDurationMs,
    computeFadeMultiplier,
    currentFadeMultiplier,
  };
})();
