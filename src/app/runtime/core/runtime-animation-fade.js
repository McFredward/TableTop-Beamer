// Phase 58 Wave 3.9h — shared animation fade math.
//
// Single source of truth for the optional fade-in / fade-out opacity
// ramp. The multiplier is a PURE FUNCTION OF TIME (deterministic →
// dashboard == /output == SSR on the same wall clock), so it never
// branches on role or per-client render state.
//
//   fade-in   ramps 0 → 1 over fadeDurationMs measured from the first
//             frame THIS client renders the instance (a client-local
//             RENDER ANCHOR, see below), smoothstep.
//   fade-out  ramps 1 → 0 over fadeDurationMs measured from
//             fadeOutStartedAtEpochMs (Date.now wall clock, broadcast on
//             stop so /output ramps out too), smoothstep.
//
// Both terms compose multiplicatively, and the result is a GLOBAL
// multiplier applied ON TOP of the animation's own opacity at every
// draw path (mp4 / gif / coded, room / inside / outside). When
// fadeEnabled is false the multiplier is exactly 1 ⇒ byte-identical
// legacy (abrupt) behavior.
//
// Phase 58 Wave 3.9j (2026-06-08) — fade-IN render anchor. The fade-in
// ramp USED to be measured from the instance's startedAt, which every
// client reconstructs from the SHARED wall-clock trigger epoch
// (startedAtEpochMs; server-stamped, rebased via perf.now() - (Date.now()
// - epoch)). That made fade-in elapsed equal the wall-clock AGE OF THE
// TRIGGER, not the time this client has been rendering the instance — so
// every ms between the server stamping the trigger and a client's first
// steady frame (snapshot-roundtrip latency, the SSR/projector tab being
// scheduled under encode load, live-sync absence-grace churn, OR plain
// client/server clock skew) was SUBTRACTED from the visible fade-in
// window. When that delay reached fadeDurationMs (trivial at the 800 ms
// default under modest skew/jitter), frame 1 already had
// now - startedAt >= durationMs, the fade-in factor was skipped, and the
// multiplier stayed 1: the animation popped to full opacity (operator bug
// 2026-06-08 "fade-IN abrupt while fade-OUT works"). Fade-OUT never had
// this problem because its epoch is stamped at STOP time, when the
// instance is already live, and the instance is held alive for the full
// ramp. The fix anchors fade-in to the FIRST time this client samples the
// instance with fade enabled — a per-client perf timestamp kept in a
// module-local Map keyed by animation id. It is NEVER written to the
// animation object, so it cannot serialize into a snapshot and leak a
// foreign perf clock to another client. This mirrors the inside-gif
// leg-local timeline fix (Wave 3.8q), which abandoned the cross-client
// epoch for exactly this "epoch unreliable on the projector" reason; the
// cost is that each surface ramps from its own first render (identical
// ramp SHAPE, sub-200 ms phase offset from render latency) instead of
// strict wall-clock lockstep.
(() => {
  // Client-local fade-in render anchors: animation.id → performance.now()
  // of the first frame this client rendered the instance while fading in.
  // Pruned every frame to the live running set (pruneFadeInAnchors) so it
  // stays bounded to currently-running instances and never re-fades a
  // finished one.
  const fadeInAnchorPerfMsById = new Map();

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

  // Resolve (and on first observation, stamp) this client's fade-in render
  // anchor for an instance at time `now` (performance.now() domain). The
  // anchor is the perf timestamp of the first frame this client sampled the
  // instance while fading in, so fade-in always ramps from 0 here regardless
  // of how stale the broadcast trigger epoch is. Anonymous instances (no id,
  // e.g. editor previews) ramp from the current sample.
  function resolveFadeInAnchor(animation, now) {
    const id = typeof animation.id === "string" ? animation.id : null;
    if (id === null) return now;
    const existing = fadeInAnchorPerfMsById.get(id);
    if (existing !== undefined) return existing;
    fadeInAnchorPerfMsById.set(id, now);
    return now;
  }

  // The effective fade opacity multiplier for an instance at time `now`
  // (a performance.now()-domain timestamp — the rAF tick). fade-in ramps
  // from this client's render anchor (see module header); fade-out uses
  // the Date.now() wall clock via fadeOutStartedAtEpochMs.
  function computeFadeMultiplier(animation, now) {
    if (!animation || animation.fadeEnabled !== true) return 1;
    const durationMs = clampFadeDurationMs(animation.fadeDurationMs);
    let mul = 1;

    // fadeOutStartedAtEpochMs > 0 means a fade-out is in progress. A
    // cancelled fade clears it to null (Number(null) === 0), so the > 0
    // guard treats null/0/absent as "not fading out".
    const fadeOutEpoch = Number(animation.fadeOutStartedAtEpochMs);
    const isFadingOut = Number.isFinite(fadeOutEpoch) && fadeOutEpoch > 0;

    // Fade-IN — measured from this client's render anchor, NOT the trigger
    // epoch. Skipped while a fade-out is in progress (the anchor is left
    // untouched so a fade-out cancel can seed it via seedFadeInAnchor).
    if (!isFadingOut) {
      const anchor = resolveFadeInAnchor(animation, now);
      const inElapsed = now - anchor;
      if (inElapsed < durationMs) {
        mul *= smoothstep01(inElapsed / durationMs);
      }
    }

    if (isFadingOut) {
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

  // Seed (or overwrite) the fade-in render anchor for an id so a resumed
  // fade-in continues smoothly from a known elapsed. Used by the stop
  // pipeline when a fade-out is cancelled by a re-trigger: it passes
  // performance.now() - tIn * durationMs so the ramp picks up at the
  // current (mid-fade) opacity instead of restarting from 0.
  function seedFadeInAnchor(animationId, anchorPerfMs) {
    if (typeof animationId !== "string" || !animationId) return;
    if (!Number.isFinite(Number(anchorPerfMs))) return;
    fadeInAnchorPerfMsById.set(animationId, Number(anchorPerfMs));
  }

  // Drop the fade-in render anchor for an id (e.g. on an explicit re-trigger
  // that should restart the ramp from 0).
  function resetFadeInAnchor(animationId) {
    if (typeof animationId === "string") fadeInAnchorPerfMsById.delete(animationId);
  }

  // Prune anchors down to the live running set — called once per frame by
  // the draw loop. Keeps the Map bounded to currently-running instances and
  // guarantees a finished/removed instance can never re-fade from a stale
  // anchor. Accepts the runningAnimations array (or any iterable of objects
  // with an `id`).
  function pruneFadeInAnchors(runningAnimations) {
    if (fadeInAnchorPerfMsById.size === 0) return;
    const liveIds = new Set();
    if (Array.isArray(runningAnimations)) {
      for (const anim of runningAnimations) {
        if (anim && typeof anim.id === "string") liveIds.add(anim.id);
      }
    }
    for (const id of fadeInAnchorPerfMsById.keys()) {
      if (!liveIds.has(id)) fadeInAnchorPerfMsById.delete(id);
    }
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_FADE = {
    smoothstep01,
    inverseSmoothstep01,
    clampFadeDurationMs,
    computeFadeMultiplier,
    currentFadeMultiplier,
    seedFadeInAnchor,
    resetFadeInAnchor,
    pruneFadeInAnchors,
  };
})();
