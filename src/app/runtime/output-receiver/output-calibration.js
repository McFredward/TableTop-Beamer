export function bootOutputCalibration(liveSync) {
  const root = document.documentElement;
  const idle = "output-cursor-idle";
  const calibrating = "output-calibrating";
  let canvas;
  let current;
  let expiry;
  let cursorTimer;
  let calibrationTimer;

  function hideCursor() {
    root.classList.add(idle);
  }

  hideCursor();
  window.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" || root.classList.contains(calibrating)) return;
    root.classList.remove(idle);
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(hideCursor, 1800);
  }, { passive: true });

  function clearPattern() {
    clearTimeout(expiry);
    canvas?.remove();
    canvas = null;
    current = null;
  }

  function finish() {
    clearPattern();
    clearTimeout(calibrationTimer);
    calibrationTimer = null;
    root.classList.remove(calibrating);
  }

  liveSync.onDisconnect(finish);
  window.addEventListener("resize", finish);
  window.addEventListener("pagehide", finish);

  liveSync.onCalibrationPattern(async (pattern) => {
    if (!pattern || document.visibilityState !== "visible") return finish();
    clearPattern();
    if (!calibrationTimer || pattern.starting) {
      clearTimeout(calibrationTimer);
      calibrationTimer = setTimeout(finish, 120_000);
    }
    root.classList.add(calibrating);
    hideCursor();
    if (pattern.starting) return;
    current = pattern;
    canvas = document.createElement("canvas");
    canvas.id = "auto-calibration-pattern";
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100vw", height: "100vh",
      zIndex: "2147483647", background: "#000",
    });
    const context = canvas.getContext("2d");
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#fff";
    for (const point of pattern.points ?? []) {
      context.beginPath();
      const radius = Math.max(4, height * (pattern.points.length > 100 ? 6 : 8) / 1080);
      context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
      context.fill();
    }
    if (pattern.paths) {
      context.strokeStyle = "#fff";
      context.lineWidth = Math.max(2, height * 4 / 1080);
      context.lineJoin = "round";
      for (const path of pattern.paths) {
        context.beginPath();
        path.forEach((point, index) => context[index ? "lineTo" : "moveTo"](point.x * width, point.y * height));
        context.closePath();
        context.stroke();
      }
    }
    document.body.append(canvas);
    expiry = setTimeout(clearPattern, 11_000);
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
      if (!response.ok && current === pattern) clearPattern();
    } catch {
      if (current === pattern) clearPattern();
    }
  });
}
