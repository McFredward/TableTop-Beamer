import { randomUUID } from "node:crypto";

const MAX_RUN_MS = 120_000;

export function createCalibrationSession() {
  let run;

  function current(id) {
    return run && run.id === id && performance.now() < run.deadline ? run : null;
  }

  return {
    current,
    start({ boardId, generation, gridAt, output }) {
      if (run && performance.now() < run.deadline) return null;
      run = { id: randomUUID(), deadline: performance.now() + MAX_RUN_MS, boardId, generation, gridAt, output, step: null, size: null };
      return { id: run.id, boardId, gridAt };
    },
    pattern(id, points) {
      const session = current(id);
      if (!session || session.output.socket.destroyed || !Array.isArray(points) || points.length > 128 ||
          points.some(point => !(point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1 &&
            Number.isFinite(point.x) && Number.isFinite(point.y)))) return null;
      session.step = { number: (session.step?.number ?? 0) + 1, shownAfter: null };
      return { id, step: session.step.number, points: points.map(({ x, y }) => ({ x, y })) };
    },
    shown(id, step, clientId, width, height, frame) {
      const session = current(id);
      if (!session || session.output.id !== clientId || session.step?.number !== step || session.step.shownAfter !== null ||
          frame?.generation !== session.generation || !Number.isInteger(width) || !Number.isInteger(height) ||
          width < 320 || width > 8192 || height < 240 || height > 8192) return false;
      if (session.size && (session.size.width !== width || session.size.height !== height)) return false;
      session.size = { width, height };
      session.step.shownAfter = frame.sequence;
      return true;
    },
    frame(id, step, frame) {
      const session = current(id);
      if (!session || session.step?.number !== step || (frame && frame.generation !== session.generation)) return false;
      return frame && session.step.shownAfter !== null && frame.sequence >= session.step.shownAfter + 2
        ? { ...frame, headers: { "X-Projector-Width": session.size.width, "X-Projector-Height": session.size.height } }
        : null;
    },
    stop(id) {
      if (run?.id !== id) return null;
      const ended = run;
      run = null;
      return ended.output;
    },
  };
}
