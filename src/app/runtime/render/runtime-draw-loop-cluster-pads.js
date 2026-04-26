// draw loop cluster-pads sub-module.
//
// Owns the cluster-pad canvas blit pass — runs once per draw frame on
// dashboard (control role); /output (FINAL) doesn't render the rail at
// all so this module is dormant there. Extracted from runtime-draw-loop.js
// in Wave 3.6-C10 to bring the parent file under the 800-line acceptance
// bar while keeping `drawClusterPadCanvases` body byte-identical.
//
// Dependencies injected via init({ ctx, drawRoomComposition }) — needs
// the draw-loop's ctx (state, canvas swap, helper getters) plus the
// sibling `drawRoomComposition` function which still lives in the parent
// file (called once per cluster animation per frame inside the
// withPreviewCanvas wrap).
(() => {
  let ctx = null;
  let drawRoomComposition = null;

  function init(dependencies) {
    ctx = dependencies.ctx;
    drawRoomComposition = dependencies.drawRoomComposition;
  }

  // Minimal pad renderer — covers solid-color
  // (the user's primary smoke test) explicitly, falls back to a
  // soft accent-tinted indicator for other animation types. The
  // ctx-swap + drawRoomComposition approach (v9) leaked geometry
  // lookups via ctx.getRoomLabelPosition for the synthetic room
  // and painted the animation at the wrong on-screen location.
  // Direct fillRect-based painting is decoupled from any board
  // polygon math and produces a fully-filled pad rect every time.
  function drawClusterPadCanvases(now) {
    const state = ctx.state;
    const padContainer = document.getElementById("cluster-pads");
    if (!padContainer) return;
    const dpr = window.devicePixelRatio || 1;
    const origCanvas = ctx.canvas;
    const origCanvasCtx = ctx.canvasCtx;
    const visualsModule = window.TT_BEAMER_RUNTIME_EFFECT_VISUALS;

    // Clear EVERY pad canvas at the start so a
    // pad whose cluster animation just stopped doesn't keep showing
    // the last painted frame. Sized to the pad's css rect × dpr each
    // frame in case the layout shifted.
    const allPadCanvases = padContainer.querySelectorAll(".cluster-pad-canvas");
    for (const padCanvas of allPadCanvases) {
      const cssRect = padCanvas.getBoundingClientRect();
      if (cssRect.width <= 0 || cssRect.height <= 0) continue;
      const targetW = Math.max(1, Math.round(cssRect.width * dpr));
      const targetH = Math.max(1, Math.round(cssRect.height * dpr));
      if (padCanvas.width !== targetW) padCanvas.width = targetW;
      if (padCanvas.height !== targetH) padCanvas.height = targetH;
      padCanvas.getContext("2d").clearRect(0, 0, padCanvas.width, padCanvas.height);
    }

    // Group cluster-scope running animations by clusterId so multiple
    // animations on the same cluster all paint into the same pad.
    const byCluster = new Map();
    for (const anim of state.runningAnimations) {
      if (anim?.scope !== "cluster") continue;
      if (anim.boardId !== state.boardId) continue;
      const clusterId = String(anim.clusterId || "").trim();
      if (!clusterId) continue;
      if (!byCluster.has(clusterId)) byCluster.set(clusterId, []);
      byCluster.get(clusterId).push(anim);
    }
    for (const [clusterId, anims] of byCluster) {
      const pad = padContainer.querySelector(`.cluster-pad[data-cluster-id="${clusterId.replace(/"/g, '\\"')}"]`);
      if (!pad) continue;
      const padCanvas = pad.querySelector(".cluster-pad-canvas");
      if (!padCanvas) continue;
      const cssRect = padCanvas.getBoundingClientRect();
      if (cssRect.width <= 0 || cssRect.height <= 0) continue;
      const targetW = Math.max(1, Math.round(cssRect.width * dpr));
      const targetH = Math.max(1, Math.round(cssRect.height * dpr));
      if (padCanvas.width !== targetW) padCanvas.width = targetW;
      if (padCanvas.height !== targetH) padCanvas.height = targetH;
      const padCtx = padCanvas.getContext("2d");
      padCtx.clearRect(0, 0, padCanvas.width, padCanvas.height);

      // Synthetic full-rect "room" + complete metrics so any effect's
      // fallback to ctx.getRoomLabelPosition is never reached (the
      // metrics have everything drawEffectVisual reads). Polygon as
      // unit square so any clip-to-room test passes for the full canvas.
      const fakeRoom = {
        id: `__cluster_pad_${clusterId}`,
        polygon: [[0, 0], [1, 0], [1, 1], [0, 1]],
        center: { x: 0.5, y: 0.5 },
        radius: 0.5,
      };
      const fakeRoomMetrics = {
        centerX: padCanvas.width / 2,
        centerY: padCanvas.height / 2,
        width: padCanvas.width,
        height: padCanvas.height,
        radius: Math.min(padCanvas.width, padCanvas.height) / 2,
        minX: 0,
        minY: 0,
      };

      // Hijack draw-loop's ctx for drawRoomComposition's local `c`.
      ctx.canvas = padCanvas;
      ctx.canvasCtx = padCtx;
      try {
        // Stack every cluster animation that's running on this
        // cluster — same multi-animation behavior as a real room.
        for (const anim of anims) {
          let memberViews = [];
          try { memberViews = ctx.buildClusterMemberRuntimeViews(anim) || []; } catch { /* defensive */ }
          const memberAnim = memberViews[0]?.animation || anim;
          if (!memberAnim) continue;
          const speed = ctx.clampRoomSpeed
            ? ctx.clampRoomSpeed(memberAnim.speed ?? 1)
            : Math.max(0.1, Number(memberAnim.speed) || 1);
          const age = ((now - Number(memberAnim.startedAt || 0)) / 1000)
            * Number(state.animationSpeed || 1)
            * speed;
          // Wrap drawRoomComposition in withPreviewCanvas so the
          // effect-visuals module's OWN ctx (separate object from
          // draw-loop's ctx) also sees padCanvas during the call.
          // Without this, coded effects like solid-color and hull-
          // flicker call fillRect(0,0,w,h) on the main fx-canvas —
          // visible as a small rect at the board's top-left
          // (solid-color) or as the whole board flickering
          // (hull-flicker fills the entire main canvas).
          const renderOnce = () => {
            try {
              drawRoomComposition(memberAnim, age, fakeRoom, fakeRoomMetrics);
            } catch (error) {
              if (typeof console !== "undefined") {
                console.warn("[cluster-pad] drawRoomComposition error", error);
              }
            }
          };
          if (visualsModule && typeof visualsModule.withPreviewCanvas === "function") {
            visualsModule.withPreviewCanvas(padCanvas, renderOnce);
          } else {
            renderOnce();
          }
        }
      } finally {
        ctx.canvas = origCanvas;
        ctx.canvasCtx = origCanvasCtx;
      }
    }
  }

  window.TT_BEAMER_RUNTIME_DRAW_LOOP_CLUSTER_PADS = {
    init,
    drawClusterPadCanvases,
  };
})();
