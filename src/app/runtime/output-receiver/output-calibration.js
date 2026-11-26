export function bootOutputCalibration(liveSync) {
  let canvas;
  let current;
  let expiry;

  function clear() {
    clearTimeout(expiry);
    canvas?.remove();
    canvas = null;
    current = null;
  }

  liveSync.onDisconnect(clear);
  window.addEventListener("resize", clear);
  window.addEventListener("pagehide", clear);

  liveSync.onCalibrationPattern(async (pattern) => {
    clear();
    if (!pattern || document.visibilityState !== "visible") return;
    current = pattern;
    canvas = document.createElement("canvas");
    canvas.id = "auto-calibration-pattern";
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100vw", height: "100vh",
      zIndex: "2147483647", background: "#000", pointerEvents: "none",
    });
    const context = canvas.getContext("2d");
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#fff";
    for (const point of pattern.points) {
      context.beginPath();
      const radius = Math.max(4, height * (pattern.points.length > 100 ? 6 : 8) / 1080);
      context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
      context.fill();
    }
    document.body.append(canvas);
    expiry = setTimeout(clear, 11_000);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (current !== pattern) return;
    try {
      const response = await fetch("/api/calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shown", id: pattern.id, step: pattern.step, width, height,
          clientId: liveSync.getCurrentClientId(),
        }),
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok && current === pattern) clear();
    } catch {
      if (current === pattern) clear();
    }
  });
}
