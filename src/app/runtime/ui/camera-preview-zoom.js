const MAX_ZOOM = 6;
const ZOOM_STEP = 1.25;

export function bindCameraZoom(dialog, canvas, onScale) {
  const frame = canvas.parentElement;
  const controls = dialog.querySelector("#camera-zoom-controls");
  const zoomOut = dialog.querySelector("#camera-zoom-out");
  const zoomIn = dialog.querySelector("#camera-zoom-in");
  const resetButton = dialog.querySelector("#camera-zoom-reset");
  let scale = 1;
  let x = 0;
  let y = 0;
  let drag;

  function paint() {
    const xLimit = Math.max(0, (canvas.offsetWidth * scale - frame.clientWidth) / 2);
    const yLimit = Math.max(0, (canvas.offsetHeight * scale - frame.clientHeight) / 2);
    x = Math.min(xLimit, Math.max(-xLimit, x));
    y = Math.min(yLimit, Math.max(-yLimit, y));
    frame.style.setProperty("--camera-transform", scale === 1 ? "none" : `translate(${x}px, ${y}px) scale(${scale})`);
    frame.toggleAttribute("data-zoomed", scale > 1);
    const percentage = `${Math.round(scale * 100)}%`;
    if (resetButton.textContent !== percentage || !resetButton.hasAttribute("aria-label")) {
      resetButton.textContent = percentage;
      resetButton.setAttribute("aria-label", `Reset zoom, currently ${percentage}`);
    }
    resetButton.disabled = zoomOut.disabled = scale === 1;
    zoomIn.disabled = scale === MAX_ZOOM;
    onScale(scale);
  }

  function zoomTo(target, cursorX = 0, cursorY = 0) {
    const next = Math.min(MAX_ZOOM, Math.max(1, target));
    const ratio = next / scale;
    x = cursorX - (cursorX - x) * ratio;
    y = cursorY - (cursorY - y) * ratio;
    scale = next;
    paint();
  }

  frame.addEventListener("wheel", event => {
    if (controls.hidden || !event.deltaY || (scale === 1 && event.deltaY > 0)) return;
    event.preventDefault();
    const rect = frame.getBoundingClientRect();
    const step = event.deltaMode ? Math.sign(event.deltaY) * 100 : event.deltaY;
    zoomTo(scale * Math.exp(-Math.max(-160, Math.min(160, step)) * 0.002),
      event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
  }, { passive: false });

  frame.addEventListener("pointerdown", event => {
    if (controls.hidden || scale === 1 || event.button !== 0 || drag) return;
    frame.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offsetX: x, offsetY: y };
    frame.setAttribute("data-panning", "");
  });
  frame.addEventListener("pointermove", event => {
    if (event.pointerId !== drag?.id) return;
    x = drag.offsetX + event.clientX - drag.x;
    y = drag.offsetY + event.clientY - drag.y;
    paint();
  });
  frame.addEventListener("lostpointercapture", event => {
    if (event.pointerId !== drag?.id) return;
    drag = undefined;
    frame.removeAttribute("data-panning");
  });
  const directions = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  frame.addEventListener("keydown", event => {
    const direction = directions[event.key];
    if (controls.hidden || scale === 1 || !Array.isArray(direction)) return;
    event.preventDefault();
    x += direction[0] * 40;
    y += direction[1] * 40;
    paint();
  });

  zoomIn.addEventListener("click", () => zoomTo(scale * ZOOM_STEP));
  zoomOut.addEventListener("click", () => zoomTo(scale / ZOOM_STEP));
  resetButton.addEventListener("click", () => zoomTo(1));
  const resize = new ResizeObserver(() => { if (!controls.hidden) paint(); });
  resize.observe(frame);
  resize.observe(canvas);
  return {
    setAvailable(available) {
      if (controls.hidden === !available) return;
      controls.hidden = !available;
      if (available) paint();
    },
    reset() { zoomTo(1); },
  };
}
