import { loadOpenCV, readBitmap, readImage } from "../calibration/calibration-images.js";
import { registerBoard } from "../calibration/calibration-math.js";
import { createFireTracker, detectFireTokens, makeFireGeometry } from "../vision/fire-observer.js";

const states = { visible: "Visible", occluded: "Possibly covered", uncertain: "Uncertain", removed: "Removed" };

export function createFireReview() {
  const panel = document.getElementById("fire-review");
  const status = document.getElementById("fire-review-state");
  const save = document.getElementById("fire-review-save");
  let selection;
  let geometry;
  let tracker;
  let current;

  function reset(enabled) {
    panel.hidden = !enabled;
    save.disabled = true;
    status.textContent = enabled ? "Locating Nemesis Board A…" : "";
    selection = null;
    geometry = null;
    tracker = null;
    current = null;
  }

  async function register(frame, generation, signal) {
    const init = { signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]), cache: "no-store" };
    const [snapshot, catalog] = await Promise.all(["/api/live/snapshot", "/api/boards"]
      .map(path => fetch(path, init).then(response => response.json())));
    signal.throwIfAborted();
    const id = snapshot.session?.snapshot?.selectedBoard;
    if (id !== "nemesis-board-a") throw new Error("The fire observer currently supports Nemesis Board A.");
    const board = catalog.boards.find(entry => entry.boardId === id);
    const url = new URL(board?.metadata?.imageSrc ?? "", location.origin);
    if (!board?.metadata?.imageSrc || url.origin !== location.origin) throw new Error("The board reference artwork is unavailable.");
    const [reference, { cv }] = await Promise.all([
      fetch(url, init).then(response => {
        if (!response.ok) throw new Error("The board reference artwork is unavailable.");
        return response.blob();
      }).then(readImage),
      loadOpenCV(),
    ]);
    signal.throwIfAborted();
    geometry = makeFireGeometry(registerBoard(cv, reference, frame), board.roomCatalog, frame.width, frame.height);
    tracker = createFireTracker();
    selection = { id, generation, width: frame.width, height: frame.height, cv };
  }

  async function observe(bitmap, blob, id, context, signal) {
    const expectedBoard = window.TT_BEAMER_RUNTIME_PROJECTION_PROFILE_PERSISTENCE?.getCurrentBoardId();
    const [time, generation] = id.split("-");
    const frame = readBitmap(bitmap, true);
    if (!geometry || generation !== selection.generation || frame.width !== selection.width ||
        frame.height !== selection.height || (expectedBoard && expectedBoard !== selection.id)) {
      status.textContent = "Finding the printed board…";
      await register(frame, generation, signal);
    }
    signal.throwIfAborted();
    const hits = detectFireTokens(selection.cv, frame, geometry);
    const records = tracker.observe(frame, hits, id, Number(time));
    current = { blob, id, records, geometry, selection };
    save.disabled = false;
    const summary = records.length
      ? records.map(({ room, state, proposal }) => `Room ${room.name} · ${states[state]} · ${proposal}`).join(" / ")
      : "Watching the rooms for fire tokens.";
    if (status.textContent !== summary) status.textContent = summary;
    const sx = context.canvas.width / frame.width;
    const sy = context.canvas.height / frame.height;
    context.save();
    context.scale(sx, sy);
    context.font = "bold 14px system-ui";
    context.lineWidth = 2;
    for (const { room, box, state } of records) {
      if (state === "removed") continue;
      const color = state === "visible" ? "#ffc359" : "#8be2ff";
      const label = `${room.name} · ${states[state]}`;
      const labelY = Math.max(18, box.y - 4);
      context.strokeStyle = color;
      context.strokeRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
      context.fillStyle = "#10161e";
      context.fillRect(box.x - 3, labelY - 15, context.measureText(label).width + 9, 18);
      context.fillStyle = color;
      context.fillText(label, box.x + 1, labelY - 2);
    }
    context.restore();
  }

  function unavailable(message) {
    save.disabled = true;
    status.textContent = message;
    current = null;
  }

  save.addEventListener("click", async () => {
    const sample = current;
    if (!sample || save.disabled) return;
    save.disabled = true;
    try {
      const bitmap = await createImageBitmap(sample.blob);
      try {
        const sx = bitmap.width / sample.selection.width, sy = bitmap.height / sample.selection.height;
        const outline = sample.geometry.outline.map(({ x, y }) => ({ x: x * sx, y: y * sy }));
        const xs = outline.map(point => point.x), ys = outline.map(point => point.y);
        const x = Math.max(0, Math.floor(Math.min(...xs))), y = Math.max(0, Math.floor(Math.min(...ys)));
        const width = Math.min(bitmap.width, Math.ceil(Math.max(...xs))) - x;
        const height = Math.min(bitmap.height, Math.ceil(Math.max(...ys))) - y;
        const output = document.createElement("canvas");
        output.width = width;
        output.height = height;
        const ctx = output.getContext("2d", { alpha: false });
        ctx.beginPath();
        outline.forEach((point, i) => ctx[i ? "lineTo" : "moveTo"](point.x - x, point.y - y));
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(bitmap, -x, -y);
        const observations = sample.records.map(({ room, state, box }) => ({
          roomId: room.id, roomName: room.name, state,
          box: [box.x * sx - x, box.y * sy - y, box.w * sx, box.h * sy],
        }));
        const data = { boardId: sample.selection.id, frameId: sample.id, width, height,
          image: output.toDataURL("image/jpeg", 0.94), observations };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `tt-beamer-fire-${sample.id}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } finally { bitmap.close(); }
    } catch {
      if (current) status.textContent = "Could not save this board sample.";
    } finally {
      save.disabled = !current;
    }
  });

  return { reset, observe, unavailable };
}
